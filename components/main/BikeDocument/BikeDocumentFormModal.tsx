import { DatePickerField } from "@/components/main/shared";
import { usePatch, usePost } from "@/hooks/useApi";
import {
  IBikeDocument,
  TCreateBikeDocumentPayload,
} from "@/types/bike-document.types";
import { COLORS } from "@/utils/colors";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Button, Modal, Portal, Text, TextInput } from "react-native-paper";
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

          <View style={styles.field}>
            <TextInput
              placeholder="Title (e.g. Registration Paper)"
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
            label="Expiry Date (optional)"
            value={expiryDate}
            onChange={setExpiryDate}
            disabled={isPending}
          />

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={isPending}
            disabled={isPending}
            style={styles.button}
          >
            {initialDocument ? "Update" : "Add"}
          </Button>

          <Button
            onPress={onClose}
            disabled={isPending}
            style={styles.cancelButton}
          >
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
