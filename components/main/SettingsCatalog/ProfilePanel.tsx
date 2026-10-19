import {
  FormField,
  Panel,
  PrimaryButton,
  UserAvatar,
  confirm,
} from "@/components/main/shared";
import { useUserContext } from "@/context/user.context";
import { useDelete, useFetchData, usePatch, usePut } from "@/hooks/useApi";
import { IUser } from "@/types/global.types";
import { COLORS } from "@/utils/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import Toast from "react-native-toast-message";

/**
 * Who is signed in, and the only place the rider can change it (spec 56).
 *
 * ! This panel is the app's first and only `GET /auth/me` call, and that needs saying
 * ! because `CLAUDE.md` lists an /auth/me round-trip as a rejected pattern. That rule is
 * ! about the AUTH PATH — `ai-workflow-rules.md` scopes it to `user.context.tsx` and
 * ! `AuthGuard.tsx`: no blocking identity fetch between launch and first screen. This is an
 * ! ordinary screen query on an ordinary `authCheck` route; it gates nothing and neither
 * ! protected file is touched. It is also unavoidable — `LoginForm` builds the stored user
 * ! from the JWT's `{ userId, userEmail }` claims, so **the app has never known the rider's
 * ! name**, and `bikelog_server` spec 53 D9 deliberately kept `name`/`profilePicture` out of
 * ! the token (mutable display data has no business in a 15-minute credential).
 *
 * ! The editor expands INLINE rather than opening a bottom sheet, which is the one place
 * ! this diverges from the reference project's layout (spec 56 D3): this app has no `Sheet`
 * ! component, and both catalog panels on this very screen already use the
 * ! header-button-toggles-an-inline-block idiom. Its visual style — round avatar, camera
 * ! badge, inline Change/Remove text buttons, immediate upload — is kept in full.
 */
export function ProfilePanel() {
  const { user, handleSetUser } = useUserContext();

  const { data: profile } = useFetchData<IUser>(["profile"], "/auth/me");
  const updateName = usePatch([["profile"]]);
  const uploadPhoto = usePut([["profile"]]);
  const removePhotoMutation = useDelete([["profile"]]);

  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState("");

  const photoBusy = uploadPhoto?.isPending || removePhotoMutation?.isPending;

  const displayName = profile?.data?.name ?? user?.name ?? "";
  const displayEmail = profile?.data?.email ?? user?.email ?? "";
  // ! Prefer the query over the persisted context (spec 56 H-F): the mutations invalidate
  // ! ["profile"], so the query is the fresher of the two. The context copy is the offline
  // ! and cold-launch fallback, not the primary.
  const photo = profile?.data?.profilePicture ?? user?.profilePicture ?? null;

  // ! Re-seed each time the editor opens, so an abandoned edit never persists into the next
  // ! one. Same shape as the catalog panels' `startEdit*` prefill.
  useEffect(() => {
    if (expanded) setName(profile?.data?.name ?? user?.name ?? "");
  }, [expanded, profile, user]);

  // ! The single place that writes the context, so the persisted user and the ["profile"]
  // ! query cannot disagree. This is also what makes the panel show a name and photo on the
  // ! next cold launch *before* /auth/me resolves — the login token carries neither.
  const applyUser = async (patch: Partial<IUser>) => {
    await handleSetUser({ ...(user as IUser), ...patch });
  };

  const handleSaveName = async () => {
    const trimmed = name?.trim();
    if (!trimmed) {
      Toast.show({ type: "error", text1: "Name is required", position: "top" });
      return;
    }

    try {
      const result = await updateName?.mutateAsync({
        url: "/auth/update-profile",
        payload: { name: trimmed },
      });

      if (result?.success) {
        await applyUser({ name: trimmed });
        Toast.show({ type: "success", text1: "Name updated", position: "top" });
        setExpanded(false);
      }
    } catch {
      // ! utils/axiosInstance.ts's response interceptor already toasted the API error — a
      // ! Toast.show here would double it (the pre-existing bug several SettingsCatalog
      // ! handlers still have; OdometerPanel is the pattern to copy, not those).
    }
  };

  const pickPhoto = async (source: "camera" | "library") => {
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission?.granted) {
      Toast.show({
        type: "error",
        text1:
          source === "camera"
            ? "Camera permission denied"
            : "Photo library permission denied",
        position: "top",
      });
      return;
    }

    // ! allowsEditing + a 1:1 aspect is new for this app — every other picker passes
    // ! `allowsEditing: false` — and deliberate: the result is shown in a circle, so letting
    // ! the rider frame their own face beats the server's `gravity: "face"` guess, which is a
    // ! fallback rather than a crop UI. No client-side resize: that needs
    // ! `expo-image-manipulator`, a native module, and so a fresh EAS build (spec 56 D6).
    // ! `bikelog_server` spec 53 normalises to 512x512 at upload instead.
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    };

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

    const asset = result?.assets?.[0];
    if (result?.canceled || !asset) return;

    try {
      const formData = new FormData();
      // ! Field name "image", per bikelog_server spec 53 D2 — the house convention
      // ! (`upload.single("image")`), not the reference project's "file". A part named
      // ! anything else is refused by multer itself with a 400 "Unexpected field".
      formData.append("image", {
        uri: asset?.uri,
        name: asset?.fileName ?? "avatar.jpg",
        type: asset?.mimeType ?? "image/jpeg",
      } as any);

      const outcome = await uploadPhoto?.mutateAsync({
        url: "/auth/profile-picture",
        payload: formData,
      });

      if (outcome?.success) {
        await applyUser({ profilePicture: outcome?.data?.profilePicture ?? null });
        Toast.show({
          type: "success",
          text1: "Profile photo updated",
          position: "top",
        });
      }
    } catch {
      // ! See handleSaveName — the interceptor owns the error toast. A 400 here is most
      // ! likely the server's 4 MB cap on a large source photo (spec 56 V12).
    }
  };

  // ! Alert.alert, matching `ImagePickerField.openActionSheet` — this app's only
  // ! action-sheet idiom, used across five domains. The reference project avoided it because
  // ! it ships a web target where Alert.alert no-ops; this app's target is a real device, and
  // ! a web pass would be one change for ALL the pickers, not a special case here.
  const openSourceSheet = () => {
    Alert.alert("Profile photo", undefined, [
      { text: "Take Photo", onPress: () => pickPhoto("camera") },
      { text: "Choose from Library", onPress: () => pickPhoto("library") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleRemovePhoto = () => {
    confirm({
      title: "Remove profile photo?",
      message: "Your initials will be shown instead.",
      confirmLabel: "Remove",
      tone: "danger",
      icon: "image-off-outline",
      onConfirm: async () => {
        try {
          const result = await removePhotoMutation?.mutateAsync({
            url: "/auth/profile-picture",
          });

          if (result?.success) {
            await applyUser({ profilePicture: null });
            Toast.show({
              type: "success",
              text1: "Profile photo removed",
              position: "top",
            });
          }
        } catch {
          // ! See handleSaveName — the interceptor owns the error toast.
        }
      },
    });
  };

  const nameUnchanged = name?.trim() === (displayName ?? "");

  return (
    <Panel style={styles.panel}>
      <View style={styles.profileRow}>
        <View>
          <UserAvatar name={displayName} image={photo} size={56} />
          {/* ! Decorative affordance only — NOT its own touch target. The row's Edit button
              ! is the one control; nesting a second touchable under the avatar is what
              ! causes dead taps. */}
          <View style={styles.cameraBadge}>
            <MaterialCommunityIcons
              name="camera"
              size={11}
              color={COLORS.primary}
            />
          </View>
        </View>

        <View style={styles.profileTextCol}>
          <Text style={styles.profileName} numberOfLines={1}>
            {displayName || "Your profile"}
          </Text>
          <Text style={styles.profileEmail} numberOfLines={1}>
            {displayEmail}
          </Text>
        </View>

        <PrimaryButton
          onPress={() => setExpanded(!expanded)}
          icon={expanded ? "close" : "pencil-outline"}
          variant={expanded ? "secondary" : "primary"}
          compact
        >
          {expanded ? "Close" : "Edit"}
        </PrimaryButton>
      </View>

      {expanded && (
        <View style={styles.editor}>
          <View style={styles.photoBlock}>
            <View>
              <UserAvatar name={displayName} image={photo} size={88} />
              {photoBusy && (
                <View style={styles.photoOverlay}>
                  <ActivityIndicator color={COLORS.accent} size="small" />
                </View>
              )}
            </View>

            <View style={styles.photoActions}>
              <TouchableOpacity
                onPress={openSourceSheet}
                disabled={photoBusy}
                style={[styles.photoBtn, photoBusy && styles.photoBtnOff]}
                hitSlop={6}
              >
                <MaterialCommunityIcons
                  name="camera-outline"
                  size={16}
                  color={COLORS.primary}
                />
                <Text style={styles.photoBtnLabel}>
                  {photo ? "Change photo" : "Add photo"}
                </Text>
              </TouchableOpacity>

              {!!photo && (
                <TouchableOpacity
                  onPress={handleRemovePhoto}
                  disabled={photoBusy}
                  style={[styles.photoBtn, photoBusy && styles.photoBtnOff]}
                  hitSlop={6}
                >
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={16}
                    color={COLORS.danger}
                  />
                  <Text style={styles.photoBtnRemoveLabel}>Remove photo</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <FormField
            label="Name"
            required
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            editable={!updateName?.isPending}
          />
          {/* ! Spec 58: read-only, and deliberately so — the developer's requirement is that
              ! the rider CANNOT change their own email. `editable={false}` is the block, the
              ! padlock is what makes it legible before the rider taps (a field that simply
              ! does not respond reads as a bug), and the note says why. The server refuses a
              ! submitted `email` with a 400 as well (`bikelog_server` spec 55) — this is the
              ! polite half of a two-sided rule, not the enforcement.
              ! Rendered as a disabled FormField rather than dropped from the editor because
              ! "this is your address and it is fixed" is information the rider wants while
              ! editing their profile; the collapsed row above shows it too. */}
          <FormField
            label="Email"
            value={displayEmail}
            editable={false}
            style={styles.lockedField}
            rightElement={
              <MaterialCommunityIcons
                name="lock-outline"
                size={15}
                color={COLORS.textMuted}
                style={styles.lockIcon}
              />
            }
          />
          <Text style={styles.emailNote}>
            Your email is your sign-in ID and can&apos;t be changed.
          </Text>

          <PrimaryButton
            onPress={handleSaveName}
            loading={updateName?.isPending}
            disabled={!name?.trim() || nameUnchanged}
            icon="check"
          >
            Save name
          </PrimaryButton>
        </View>
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  panel: {
    padding: 16,
    gap: 10,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  profileTextCol: {
    // ! The house overflow fix (as in `panelTitleCol`): without minWidth 0 a long name
    // ! pushes the Edit button off a 360dp screen instead of ellipsising (spec 56 H-D).
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.text,
  },
  profileEmail: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  cameraBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
  },
  editor: {
    paddingTop: 4,
    gap: 10,
  },
  photoBlock: {
    alignItems: "center",
    gap: 10,
    paddingBottom: 4,
  },
  photoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 44,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  photoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  photoBtnOff: {
    opacity: 0.45,
  },
  photoBtnLabel: {
    fontSize: 13,
    color: COLORS.primary,
  },
  photoBtnRemoveLabel: {
    fontSize: 13,
    color: COLORS.danger,
  },
  emailNote: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    marginTop: -6,
  },
  // ! Spec 58: the disabled field reads a shade back from the editable one above it, so the
  // ! two are told apart at a glance rather than by tapping. Opacity, not a different colour
  // ! token — it dims the label, the box and the value together and cannot drift from
  // ! `fieldStyles` the way a hand-picked colour would.
  lockedField: {
    opacity: 0.72,
  },
  lockIcon: {
    marginRight: 10,
  },
});
