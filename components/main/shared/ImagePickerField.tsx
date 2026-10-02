import { TCloudinaryImage } from "@/types/image.types";
import { COLORS } from "@/utils/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { ActivityIndicator } from "react-native-paper";
import Toast from "react-native-toast-message";
import { confirm } from "./ConfirmDialog";
import { ImageViewerModal } from "./ImageViewerModal";

export type TPickedImageFile = { uri: string; name: string; type: string };

interface ImagePickerFieldProps {
  label: string;
  value?: TCloudinaryImage;
  onUpload: (file: TPickedImageFile) => void;
  onDelete: () => void;
  uploading: boolean;
  disabled?: boolean;
  /**
   * Tile edge length. Defaults to 64. The pencil/close badges scale with it and sit
   * on opposite corners, so every size keeps the same interaction: tap the image to
   * view it, pencil to replace, close to delete.
   */
  size?: number;
}

function assetToFile(asset: ImagePicker.ImagePickerAsset): TPickedImageFile {
  return {
    uri: asset?.uri,
    name: asset?.fileName ?? "photo.jpg",
    type: asset?.mimeType ?? "image/jpeg",
  };
}

export function ImagePickerField({
  label,
  value,
  onUpload,
  onDelete,
  uploading,
  disabled,
  size = SIZE,
}: ImagePickerFieldProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const compact = size < COMPACT_BELOW;
  // ! Badges must be positioned off the tile's own box, not a fixed offset: the old
  // ! `top: -75` was tuned for the pre-Nocturne card layout and is meaningless in the
  // ! current one (the tile now sits in a column under the ⋯ menu).
  // ! Opposite corners, not adjacent: at the current 64pt tile this leaves a clear gap
  // ! between the two, where sharing the top edge would leave them touching — which is
  // ! what made them read as one cluster on the old 32pt receipt thumb.
  // ! NOTE the two inline offsets below (`bottom`/`top`) are hand-tuned literals, NOT
  // ! derived from `size`. The delete badge is anchored to the top edge so it is unaffected
  // ! by a size change; the replace badge is anchored to the bottom, so growing the tile
  // ! moves it down relative to the top edge by the same amount. Re-check both by eye after
  // ! changing `size`.
  const badge = compact ? 15 : 17;
  const badgeOffset = -(badge / 3);
  const badgeBox = {
    width: badge,
    height: badge,
    borderRadius: badge / 2,
    right: badgeOffset,
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission?.granted) {
      Toast.show({
        type: "error",
        text1: "Camera permission denied",
        position: "top",
      });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result?.canceled && result?.assets[0]) {
      onUpload(assetToFile(result?.assets[0]));
    }
  };

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission?.granted) {
      Toast.show({
        type: "error",
        text1: "Photo library permission denied",
        position: "top",
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result?.canceled && result?.assets[0]) {
      onUpload(assetToFile(result?.assets[0]));
    }
  };

  const openActionSheet = () => {
    Alert.alert("Add Photo", undefined, [
      { text: "Take Photo", onPress: takePhoto },
      { text: "Choose from Library", onPress: pickFromLibrary },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleDelete = () => {
    confirm({
      title: `Delete ${label.toLowerCase()}?`,
      message: `This will permanently remove this ${label.toLowerCase()} photo. This can't be undone.`,
      confirmLabel: "Delete",
      tone: "danger",
      icon: "image-off-outline",
      onConfirm: onDelete,
    });
  };

  const handlePress = () => {
    if (uploading || disabled) return;
    // Tapping an existing image always opens it full-screen — replace/delete are the
    // two corner badges. With no value there's nothing to view, so tapping picks a file.
    if (value) {
      setViewerOpen(true);
    } else {
      openActionSheet();
    }
  };

  const handleReplace = () => {
    if (uploading || disabled) return;
    openActionSheet();
  };

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      <View
        style={[
          styles.tile,
          { width: size, height: size },
          !value && styles.tileEmpty,
        ]}
      >
        <TouchableOpacity
          onPress={handlePress}
          disabled={uploading || disabled}
          // Explicit size, not 100%: RNGH wraps the touchable in its own container,
          // so a percentage collapses on web and hides the image (spec 38a).
          style={[styles.touchable, { width: size, height: size }]}
        >
          {value ? (
            <Image
              source={{ uri: value.url }}
              style={styles.image}
              contentFit="cover"
            />
          ) : (
            <View style={styles.placeholder}>
              <MaterialCommunityIcons
                name={compact ? "plus" : "camera-plus-outline"}
                size={compact ? 14 : 20}
                color={COLORS.textLight}
              />
            </View>
          )}
        </TouchableOpacity>

        {uploading && (
          <View style={styles.overlay}>
            <ActivityIndicator color={COLORS.white} size="small" />
          </View>
        )}
      </View>

      {!!value && !uploading && !disabled && (
        <TouchableOpacity
          onPress={handleReplace}
          style={[styles.editBadge, badgeBox, { bottom: 58, right: 18 }]}
          hitSlop={10}
        >
          <MaterialCommunityIcons
            name="pencil"
            size={badge - 5}
            color={COLORS.white}
          />
        </TouchableOpacity>
      )}

      {!!value && !uploading && (
        <TouchableOpacity
          onPress={handleDelete}
          style={[styles.deleteBadge, badgeBox, { top: -74 }]}
          hitSlop={10}
        >
          <MaterialCommunityIcons
            name="close"
            size={badge - 6}
            color={COLORS.white}
          />
        </TouchableOpacity>
      )}

      {!!value && (
        <ImageViewerModal
          visible={viewerOpen}
          images={[value]}
          initialIndex={0}
          onDismiss={() => setViewerOpen(false)}
        />
      )}
    </View>
  );
}

const SIZE = 64;
// ! Only affects sizing (badge diameter, placeholder icon) — never behavior. Every tile
// ! size gets the same tap-to-view + pencil + close interaction.
// ! 48, not 64: every caller now passes 64 (spec 46; 56 before that), and at that size
// ! there is ample room for the full badges — shrinking them only made them harder to hit.
const COMPACT_BELOW = 48;

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  tile: {
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface3,
  },
  tileEmpty: {
    backgroundColor: "transparent",
  },
  touchable: {
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  // ! top/bottom/right/width/height/borderRadius all come from `badgeBox` at runtime,
  // ! since they scale with the tile — see the comment in the component body.
  deleteBadge: {
    position: "absolute",
    backgroundColor: COLORS.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  editBadge: {
    position: "absolute",
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
