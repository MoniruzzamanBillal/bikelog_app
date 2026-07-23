import { Alert } from "react-native";
import Toast from "react-native-toast-message";

export function confirmDelete(
  label: string,
  onConfirm: () => Promise<void> | void,
) {
  Alert.alert(
    "Delete?",
    `Are you sure you want to delete this ${label}?`,
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await onConfirm();
            Toast.show({ type: "success", text1: "Deleted successfully" });
          } catch (error: any) {
            Toast.show({
              type: "error",
              text1: error?.message || "Failed to delete",
            });
          }
        },
      },
    ],
  );
}
