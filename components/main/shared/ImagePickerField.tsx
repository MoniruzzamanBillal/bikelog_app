import { TCloudinaryImage } from "@/types/image.types";
import { COLORS } from "@/utils/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Alert, StyleSheet, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { ActivityIndicator } from "react-native-paper";
import Toast from "react-native-toast-message";

export type TPickedImageFile = { uri: string; name: string; type: string };

interface ImagePickerFieldProps {
  label: string;
  value?: TCloudinaryImage;
  onUpload: (file: TPickedImageFile) => void;
  onDelete: () => void;
  uploading: boolean;
  disabled?: boolean;
}

function assetToFile(asset: ImagePicker.ImagePickerAsset): TPickedImageFile {
  return {
    uri: asset.uri,
    name: asset.fileName ?? "photo.jpg",
    type: asset.mimeType ?? "image/jpeg",
  };
}

export function ImagePickerField({
  label,
  value,
  onUpload,
  onDelete,
  uploading,
  disabled,
}: ImagePickerFieldProps) {
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
      onUpload(assetToFile(result.assets[0]));
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
    });
    if (!result.canceled && result.assets[0]) {
      onUpload(assetToFile(result.assets[0]));
    }
  };

  const handlePress = () => {
    if (uploading || disabled) return;
    Alert.alert("Add Photo", undefined, [
      { text: "Take Photo", onPress: takePhoto },
      { text: "Choose from Library", onPress: pickFromLibrary },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleDelete = () => {
    Alert.alert("Delete?", `Are you sure you want to delete this ${label.toLowerCase()}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: onDelete },
    ]);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.tile}>
        <TouchableOpacity
          onPress={handlePress}
          disabled={uploading || disabled}
          style={styles.touchable}
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
                name="camera-plus-outline"
                size={20}
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

      {!!value && !uploading && (
        <TouchableOpacity
          onPress={handleDelete}
          style={styles.deleteBadge}
          hitSlop={8}
        >
          <MaterialCommunityIcons name="close" size={12} color={COLORS.white} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const SIZE = 64;

const styles = StyleSheet.create({
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
  touchable: {
    width: "100%",
    height: "100%",
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
