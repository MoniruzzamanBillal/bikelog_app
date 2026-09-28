import { TDocumentFile, TPickedFile } from "@/types/document-file.types";
import { COLORS } from "@/utils/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
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
    uri: asset?.uri,
    name: asset?.fileName ?? "photo.jpg",
    type: asset?.mimeType ?? "image/jpeg",
  };
}

export function MultiFilePickerField({
  files,
  onAdd,
  onRemove,
  uploading,
}: MultiFilePickerFieldProps) {
  const remaining = Math.max(MAX_FILES_PER_REQUEST - files?.length, 0);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const imageFiles = files.filter((f) => f?.resourceType === "image");

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
      onAdd([imageAssetToFile(result?.assets[0])]);
    }
  };

  const pickImages = async () => {
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
      allowsMultipleSelection: true,
      selectionLimit: Math.max(1, remaining),
    });
    if (!result?.canceled && result?.assets?.length > 0) {
      notifyIfCapped(result?.assets?.length, remaining);
      onAdd(result?.assets?.slice(0, remaining).map(imageAssetToFile));
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf"],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (!result?.canceled && result?.assets?.length > 0) {
      notifyIfCapped(result?.assets?.length, remaining);
      const picked: TPickedFile[] = result?.assets
        ?.slice(0, remaining)
        .map((asset) => ({
          uri: asset?.uri,
          name: asset?.name,
          type: asset?.mimeType ?? "application/pdf",
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
    Linking.openURL(file?.url);
  };

  return (
    <View style={styles.row}>
      {files.map((file) => {
        const isImage = file?.resourceType === "image";
        return (
          <View key={file._id} style={styles.chip}>
            <TouchableOpacity
              style={styles.chipMain}
              activeOpacity={0.8}
              onPress={() =>
                isImage
                  ? setViewerIndex(
                      imageFiles.findIndex((f) => f._id === file._id),
                    )
                  : handleOpenRaw(file)
              }
            >
              <MaterialCommunityIcons
                name={isImage ? "image-outline" : "file-document-outline"}
                size={16}
                color={COLORS.accent}
              />
              <Text style={styles.chipLabel} numberOfLines={1}>
                {file?.originalName}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleRemove(file._id)}
              style={styles.chipRemove}
              hitSlop={6}
            >
              <MaterialCommunityIcons
                name="close"
                size={13}
                color={COLORS.textLight}
              />
            </TouchableOpacity>
          </View>
        );
      })}

      {remaining > 0 && (
        <TouchableOpacity
          onPress={handleAddPress}
          disabled={uploading}
          style={styles.addChip}
          activeOpacity={0.8}
        >
          {uploading ? (
            <ActivityIndicator color={COLORS.accent} size="small" />
          ) : (
            <>
              <MaterialCommunityIcons
                name="paperclip"
                size={15}
                color={COLORS.textLight}
              />
              <Text style={styles.addChipLabel}>Attach</Text>
            </>
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

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    height: 40,
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 10,
    paddingRight: 4,
    borderRadius: 8,
    backgroundColor: COLORS.surface2,
  },
  chipMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
    minWidth: 0,
    paddingVertical: 8,
  },
  chipLabel: {
    fontSize: 12,
    color: COLORS.text,
    maxWidth: 150,
  },
  chipRemove: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  addChip: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  addChipLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
});
