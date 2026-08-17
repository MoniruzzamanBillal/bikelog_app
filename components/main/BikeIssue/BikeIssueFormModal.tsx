import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { format } from "date-fns";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Button, Modal, Portal, Text, TextInput } from "react-native-paper";
import Toast from "react-native-toast-message";
import { DatePickerField } from "@/components/main/shared";
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

          <View style={styles.field}>
            <TextInput
              placeholder="Issue Title"
              value={title}
              onChangeText={setTitle}
              editable={!isPending}
              textColor={COLORS.text}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <TextInput
              placeholder="Description (optional)"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              editable={!isPending}
              textColor={COLORS.text}
              style={styles.input}
            />
          </View>

          <DatePickerField
            label="Date Reported"
            value={dateReported}
            onChange={setDateReported}
            maximumDate={new Date()}
            disabled={isPending}
          />

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={isPending}
            disabled={isPending}
            style={styles.button}
          >
            {initialIssue ? "Update" : "Report"}
          </Button>

          <Button onPress={onClose} disabled={isPending} style={styles.cancelButton}>
            Cancel
          </Button>
        </KeyboardAwareScrollView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: COLORS.background,
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 8,
    maxHeight: "85%",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 16,
  },
  field: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 16,
  },
  input: {
    borderWidth: 0,
    backgroundColor: "transparent",
    padding: 0,
  },
  button: {
    marginTop: 8,
  },
  cancelButton: {
    marginTop: 8,
  },
});
