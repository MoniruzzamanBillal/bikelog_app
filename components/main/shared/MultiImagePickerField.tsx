import { TCloudinaryImage } from "@/types/image.types";
import { COLORS } from "@/utils/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Alert, StyleSheet, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { ActivityIndicator } from "react-native-paper";
import Toast from "react-native-toast-message";
import { TPickedImageFile } from "./ImagePickerField";

type TGalleryImage = TCloudinaryImage & { _id: string };

interface MultiImagePickerFieldProps {
  images: TGalleryImage[];
  onAdd: (files: TPickedImageFile[]) => void;
  onRemove: (imageId: string) => void;
  uploading: boolean;
  max?: number;
}

// server caps additions at 5 per POST request — mirrored here, not a stricter client invention
const MAX_IMAGES_PER_REQUEST = 5;

function assetToFile(asset: ImagePicker.ImagePickerAsset): TPickedImageFile {
  return {
    uri: asset.uri,
    name: asset.fileName ?? "photo.jpg",
    type: asset.mimeType ?? "image/jpeg",
  };
}

export function MultiImagePickerField({
  images,
  onAdd,
  onRemove,
  uploading,
  max = MAX_IMAGES_PER_REQUEST,
}: MultiImagePickerFieldProps) {
  const remaining = Math.max(max - images.length, 0);

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
      onAdd([assetToFile(result.assets[0])]);
    }
  };

  const pickFromLibrary = async () => {
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
      onAdd(result.assets.map(assetToFile));
    }
  };

  const handleAddPress = () => {
    if (uploading || remaining === 0) return;
    Alert.alert("Add Photo", undefined, [
      { text: "Take Photo", onPress: takePhoto },
      { text: "Choose from Library", onPress: pickFromLibrary },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleRemove = (imageId: string) => {
    Alert.alert("Delete?", "Are you sure you want to delete this image?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onRemove(imageId),
      },
    ]);
  };

  return (
    <View style={styles.row}>
      {images.map((image) => (
        <View key={image._id} style={styles.wrapper}>
          <View style={styles.tile}>
            <Image
              source={{ uri: image.url }}
              style={styles.image}
              contentFit="cover"
            />
          </View>
          <TouchableOpacity
            onPress={() => handleRemove(image._id)}
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
  wrapper: {
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
  addTile: {
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
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
