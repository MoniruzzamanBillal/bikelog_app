import { TDocumentFile, TPickedFile } from "@/types/document-file.types";
import { COLORS } from "@/utils/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, Linking, StyleSheet, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { ActivityIndicator, Text } from "react-native-paper";
import Toast from "react-native-toast-message";
import { ImageViewerModal } from "./ImageViewerModal";

interface MultiFilePickerFieldProps {
  files: TDocumentFile[];
  onAdd: (files: TPickedFile[]) => void;
  onRemove: (fileId: string) => void;
  uploading: boolean;
}

// server caps additions at 10 per POST request — mirrored here, not a stricter client invention
const MAX_FILES_PER_REQUEST = 10;

function imageAssetToFile(asset: ImagePicker.ImagePickerAsset): TPickedFile {
  return {
    uri: asset.uri,
    name: asset.fileName ?? "photo.jpg",
    type: asset.mimeType ?? "image/jpeg",
  };
}

export function MultiFilePickerField({
  files,
  onAdd,
  onRemove,
  uploading,
}: MultiFilePickerFieldProps) {
  const remaining = Math.max(MAX_FILES_PER_REQUEST - files.length, 0);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const imageFiles = files.filter((f) => f.resourceType === "image");

  const notifyIfCapped = (pickedCount: number, allowed: number) => {
    if (pickedCount > allowed) {
      Toast.show({
        type: "info",
        text1: `Only the first ${allowed} file${allowed === 1 ? "" : "s"} were queued`,
        position: "top",
      });
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
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
    if (!result.canceled && result.assets[0]) {
      onAdd([imageAssetToFile(result.assets[0])]);
    }
  };

  const pickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
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
      allowsMultipleSelection: true,
      selectionLimit: Math.max(1, remaining),
    });
    if (!result.canceled && result.assets.length > 0) {
      notifyIfCapped(result.assets.length, remaining);
      onAdd(result.assets.slice(0, remaining).map(imageAssetToFile));
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf"],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      notifyIfCapped(result.assets.length, remaining);
      const picked: TPickedFile[] = result.assets
        .slice(0, remaining)
        .map((asset) => ({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType ?? "application/pdf",
        }));
      onAdd(picked);
    }
  };

  const handleAddPress = () => {
    if (uploading || remaining === 0) return;
    Alert.alert("Add File", undefined, [
      { text: "Take Photo", onPress: takePhoto },
      { text: "Choose Photo from Library", onPress: pickImages },
      { text: "Choose PDF", onPress: pickDocument },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleRemove = (fileId: string) => {
    Alert.alert("Delete?", "Are you sure you want to delete this file?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onRemove(fileId),
      },
    ]);
  };

  const handleOpenRaw = (file: TDocumentFile) => {
    Linking.openURL(file.url);
  };

  return (
    <View style={styles.row}>
      {files.map((file) => (
        <View key={file._id} style={styles.item}>
          <View style={styles.tileWrapper}>
            {file.resourceType === "image" ? (
              <TouchableOpacity
                style={styles.tile}
                onPress={() =>
                  setViewerIndex(imageFiles.findIndex((f) => f._id === file._id))
                }
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: file.url }}
                  style={styles.image}
                  contentFit="cover"
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.tile, styles.rawTile]}
                onPress={() => handleOpenRaw(file)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="file-document-outline"
                  size={26}
                  color={COLORS.primary}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => handleRemove(file._id)}
              style={styles.deleteBadge}
              hitSlop={8}
            >
              <MaterialCommunityIcons
                name="close"
                size={12}
                color={COLORS.white}
              />
            </TouchableOpacity>
          </View>
          {file.resourceType === "raw" && (
            <Text style={styles.label} numberOfLines={2} ellipsizeMode="tail">
              {file.originalName}
            </Text>
          )}
        </View>
      ))}

      {remaining > 0 && (
        <TouchableOpacity
          onPress={handleAddPress}
          disabled={uploading}
          style={[styles.tile, styles.addTile]}
        >
          {uploading ? (
            <ActivityIndicator color={COLORS.primary} size="small" />
          ) : (
            <MaterialCommunityIcons
              name="plus"
              size={22}
              color={COLORS.textLight}
            />
          )}
        </TouchableOpacity>
      )}

      <ImageViewerModal
        visible={viewerIndex !== null}
        images={imageFiles.map((f) => ({ url: f.url, publicId: f.publicId }))}
        initialIndex={viewerIndex ?? 0}
        onDismiss={() => setViewerIndex(null)}
      />
    </View>
  );
}

const SIZE = 64;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  item: {
    width: SIZE,
  },
  tileWrapper: {
    position: "relative",
    width: SIZE,
    height: SIZE,
  },
  tile: {
    width: SIZE,
    height: SIZE,
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  rawTile: {
    alignItems: "center",
    justifyContent: "center",
  },
  addTile: {
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  label: {
    marginTop: 2,
    fontSize: 9,
    color: COLORS.textLight,
    textAlign: "center",
  },
  deleteBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.danger,
    alignItems: "center",
    justifyContent: "center",
  },
});
