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
   * Tile edge length. Defaults to the original 64. Below `COMPACT_BELOW` (64) the
   * floating pencil/close badges have no room, so view/replace/delete move into
   * one native action sheet instead — same actions, just not as badges.
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
    Alert.alert(
      "Delete?",
      `Are you sure you want to delete this ${label.toLowerCase()}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onDelete },
      ],
    );
  };

  const handlePress = () => {
    if (uploading || disabled) return;
    if (compact && value) {
      Alert.alert(label, undefined, [
        { text: "View", onPress: () => setViewerOpen(true) },
        { text: "Replace", onPress: openActionSheet },
        { text: "Delete", style: "destructive", onPress: handleDelete },
        { text: "Cancel", style: "cancel" },
      ]);
      return;
    }
    // With a value already set, tapping the tile views it full-screen —
    // "replace" moved to its own pencil badge. With no value, there's
    // nothing to view yet, so tapping still opens the action sheet.
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

      {!!value && !uploading && !disabled && !compact && (
        <TouchableOpacity
          onPress={handleReplace}
          style={styles.editBadge}
          hitSlop={8}
        >
          <MaterialCommunityIcons
            name="pencil"
            size={11}
            color={COLORS.white}
          />
        </TouchableOpacity>
      )}

      {!!value && !uploading && !compact && (
        <TouchableOpacity
          onPress={handleDelete}
          style={styles.deleteBadge}
          hitSlop={8}
        >
          <MaterialCommunityIcons name="close" size={12} color={COLORS.white} />
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
// ! Any non-default size uses the action sheet: the badges' fixed `top: -75` is
// ! tuned (and device-verified, spec 29) for the 64pt tile only. See spec 38a.
const COMPACT_BELOW = 64;

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
  deleteBadge: {
    position: "absolute",
    top: -75,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  editBadge: {
    position: "absolute",
    top: -75,
    right: 16,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
