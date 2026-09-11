import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { format } from "date-fns";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Modal, Portal, Text } from "react-native-paper";
import Toast from "react-native-toast-message";
import { DatePickerField, FormField, PrimaryButton } from "@/components/main/shared";
import { usePatch, usePost } from "@/hooks/useApi";
import { COLORS } from "@/utils/colors";
import {
  TBikeIssue,
  TCreateBikeIssuePayload,
} from "@/types/bike-issue.types";

interface BikeIssueFormModalProps {
  open: boolean;
  onClose: () => void;
  bikeId: string;
  initialIssue?: TBikeIssue;
}

export function BikeIssueFormModal({
  open,
  onClose,
  bikeId,
  initialIssue,
}: BikeIssueFormModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dateReported, setDateReported] = useState("");

  const createMutation = usePost([["issues", bikeId]]);
  const updateMutation = usePatch([["issues", bikeId]]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!open) return;

    if (initialIssue) {
      setTitle(initialIssue.title || "");
      setDescription(initialIssue.description || "");
      setDateReported(initialIssue.dateReported.split("T")[0]);
    } else {
      setTitle("");
      setDescription("");
      setDateReported(format(new Date(), "yyyy-MM-dd"));
    }
  }, [initialIssue, open]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Toast.show({
        type: "error",
        text1: "Title is required",
        position: "top",
      });
      return;
    }

    const payload: TCreateBikeIssuePayload = {
      title: title.trim(),
      description: description.trim() || undefined,
      dateReported: dateReported || format(new Date(), "yyyy-MM-dd"),
    };

    try {
      if (initialIssue) {
        await updateMutation.mutateAsync({
          url: `/bikes/${bikeId}/issues/${initialIssue._id}`,
          payload,
        });
        Toast.show({ type: "success", text1: "Issue updated", position: "top" });
      } else {
        await createMutation.mutateAsync({
          url: `/bikes/${bikeId}/issues`,
          payload,
        });
        Toast.show({ type: "success", text1: "Issue reported", position: "top" });
      }
      onClose();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to save issue",
        position: "top",
      });
    }
  };

  return (
    <Portal>
      <Modal visible={open} onDismiss={onClose} contentContainerStyle={styles.modal}>
        <KeyboardAwareScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>
            {initialIssue ? "Edit Issue" : "Report Issue"}
          </Text>

          <FormField
            label="Issue Title"
            placeholder="Chain skipping at high gear"
            value={title}
            onChangeText={setTitle}
            editable={!isPending}
          />

          <FormField
            label="Description (optional)"
            placeholder="Noticed chain slipping when changing to 5th gear…"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            editable={!isPending}
          />

          <DatePickerField
            label="Date Reported"
            value={dateReported}
            onChange={setDateReported}
            maximumDate={new Date()}
            disabled={isPending}
          />

          <PrimaryButton onPress={handleSubmit} loading={isPending} style={styles.button}>
            {initialIssue ? "Save Changes" : "Report Issue"}
          </PrimaryButton>

          <PrimaryButton onPress={onClose} disabled={isPending} style={styles.cancelButton}>
            Cancel
          </PrimaryButton>
        </KeyboardAwareScrollView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    maxHeight: "85%",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 18,
  },
  button: {
    marginTop: 10,
  },
  cancelButton: {
    marginTop: 10,
    borderColor: COLORS.borderSubtle,
  },
});
