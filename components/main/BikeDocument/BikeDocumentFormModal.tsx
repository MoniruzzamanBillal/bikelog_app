import { DatePickerField, FormField, PrimaryButton } from "@/components/main/shared";
import { usePatch, usePost } from "@/hooks/useApi";
import {
  IBikeDocument,
  TCreateBikeDocumentPayload,
} from "@/types/bike-document.types";
import { COLORS } from "@/utils/colors";
import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Modal, Portal, Text } from "react-native-paper";
import Toast from "react-native-toast-message";

interface BikeDocumentFormModalProps {
  open: boolean;
  onClose: () => void;
  bikeId: string;
  initialDocument?: IBikeDocument;
}

export function BikeDocumentFormModal({
  open,
  onClose,
  bikeId,
  initialDocument,
}: BikeDocumentFormModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const createMutation = usePost([["documents", bikeId]]);
  const updateMutation = usePatch([["documents", bikeId]]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!open) return;

    if (initialDocument) {
      setTitle(initialDocument.title || "");
      setDescription(initialDocument.description || "");
      setExpiryDate(initialDocument.expiryDate?.slice(0, 10) || "");
    } else {
      setTitle("");
      setDescription("");
      setExpiryDate("");
    }
  }, [initialDocument, open]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Toast.show({
        type: "error",
        text1: "Title is required",
        position: "top",
      });
      return;
    }

    const payload: TCreateBikeDocumentPayload = {
      title: title.trim(),
      description: description.trim() || undefined,
      expiryDate: expiryDate || undefined,
    };

    try {
      if (initialDocument) {
        await updateMutation.mutateAsync({
          url: `/bikes/${bikeId}/documents/${initialDocument._id}`,
          payload,
        });
        Toast.show({
          type: "success",
          text1: "Document updated",
          position: "top",
        });
      } else {
        await createMutation.mutateAsync({
          url: `/bikes/${bikeId}/documents`,
          payload,
        });
        Toast.show({
          type: "success",
          text1: "Document added",
          position: "top",
        });
      }
      onClose();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to save document",
        position: "top",
      });
    }
  };

  return (
    <Portal>
      <Modal
        visible={open}
        onDismiss={onClose}
        contentContainerStyle={styles.modal}
      >
        <KeyboardAwareScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>
            {initialDocument ? "Edit Document" : "Add Document"}
          </Text>

          <FormField
            label="Title"
            placeholder="Bike Registration Paper"
            value={title}
            onChangeText={setTitle}
            editable={!isPending}
          />

          <FormField
            label="Description (optional)"
            placeholder="Front and back scans"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            editable={!isPending}
          />

          <DatePickerField
            label="Expiry Date (optional)"
            value={expiryDate}
            onChange={setExpiryDate}
            disabled={isPending}
          />

          <PrimaryButton onPress={handleSubmit} loading={isPending} style={styles.button}>
            {initialDocument ? "Save Changes" : "Add Document"}
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
