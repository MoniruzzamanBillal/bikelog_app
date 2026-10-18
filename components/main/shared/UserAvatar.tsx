import { TCloudinaryImage } from "@/types/image.types";
import { COLORS, tint } from "@/utils/colors";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Text } from "react-native-paper";

/**
 * First letters of the first two words, uppercased. `"?"` when there is no name —
 * which is a real state, not a defensive one: `LoginForm` builds the stored user from
 * the JWT's `{ userId, userEmail }` claims, so a fresh session genuinely has no name
 * until `GET /auth/me` resolves (spec 56 H-A).
 *
 * ! Exported so nothing grows a private copy. The reference project ended up with two
 * ! and had to delete both.
 */
export function initials(name?: string | null) {
  if (!name) return "?";
  const parts = name?.trim()?.split(/\s+/);
  return ((parts?.[0]?.[0] ?? "") + (parts?.[1]?.[0] ?? "")).toUpperCase();
}

interface UserAvatarProps {
  name?: string | null;
  image?: TCloudinaryImage | null;
  /** Diameter: 56 in the Settings profile row, 88 in its editor. */
  size: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * The rider's profile photo, or their initials when there is none (spec 56 D1).
 *
 * ! Deliberately NOT `ImagePickerField` (spec 56 D2). That is a 64pt square tile with
 * ! hand-tuned corner badges whose tap opens `ImageViewerModal`; an avatar is a circle
 * ! with an initials state and labelled text buttons. Bending one component into both
 * ! shapes would put a `variant` prop through something five domains depend on, and
 * ! `shared/*` is a library where a fix has to be generically correct.
 *
 * ! The empty circle reuses `PanelIcon`'s recipe — `tint(primary, 0.14)` fill,
 * ! `tint(primary, 0.32)` hairline — so a photo-less avatar reads as part of the
 * ! Nocturne family rather than as a new thing.
 */
export function UserAvatar({ name, image, size, style }: UserAvatarProps) {
  // ! Falls back to initials when the bitmap fails to load. This matters offline: the URL
  // ! is in the persisted user but the image may not be cached, and a blank circle is
  // ! worse than initials.
  const [failed, setFailed] = useState(false);

  // ! Reset on a new URL, or one broken image would poison every later one. Cloudinary
  // ! randomises `public_id` per upload, so a replacement is always a new URL.
  useEffect(() => {
    setFailed(false);
  }, [image?.url]);

  const showPhoto = !!image?.url && !failed;

  return (
    <View
      accessibilityLabel={name ?? undefined}
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: tint(COLORS.primary, 0.14),
          borderColor: tint(COLORS.primary, 0.32),
        },
        style,
      ]}
    >
      {showPhoto ? (
        <Image
          source={{ uri: image?.url }}
          // ! Explicit width/height, not "100%": RNGH/expo-image collapse a percentage in
          // ! some containers on the web target (spec 38a's finding on ImagePickerField).
          style={{ width: size, height: size }}
          contentFit="cover"
          cachePolicy="memory-disk"
          onError={() => setFailed(true)}
        />
      ) : (
        <Text style={[styles.initials, { fontSize: size >= 80 ? 28 : 18 }]}>
          {initials(name)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  initials: {
    // ! Headings in this app are 500, never bold (ui-context.md).
    fontWeight: "500",
    color: COLORS.accentForeground,
  },
});
