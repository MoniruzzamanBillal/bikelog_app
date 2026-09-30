import Toast from "react-native-toast-message";
import { confirm } from "./ConfirmDialog";

/**
 * Ask for confirmation before a destructive action, then run it and report the
 * outcome via a Toast.
 *
 * ! The signature is unchanged from the `Alert.alert` version this replaced, so
 * ! every existing call site works as-is — only the presentation moved to the
 * ! Nocturne-styled `ConfirmDialogHost` (mounted once in `app/_layout.tsx`).
 */
export function confirmDelete(
  label: string,
  onConfirm: () => Promise<void> | void,
) {
  confirm({
    // ! "Delete fuel log?" reads better than the old generic "Delete?" now that
    // ! there's room for a real title — the label was already being passed in.
    title: `Delete ${label}?`,
    message: `This will permanently delete this ${label}. This can't be undone.`,
    confirmLabel: "Delete",
    tone: "danger",
    onConfirm: async () => {
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
  });
}
