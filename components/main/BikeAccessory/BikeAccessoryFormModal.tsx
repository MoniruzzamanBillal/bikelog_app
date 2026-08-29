import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Button, Modal, Portal, Text, TextInput } from "react-native-paper";
import Toast from "react-native-toast-message";
import { SelectPickerField } from "@/components/main/shared";
import { usePatch, usePost } from "@/hooks/useApi";
import { COLORS } from "@/utils/colors";
import {
  TAccessoryStatus,
  TAccessoryUrgency,
  TBikeAccessory,
  TCreateBikeAccessoryPayload,
} from "@/types/bike-accessory.types";

const DECIMAL_REGEX = /^\d+(\.\d{0,2})?$/;

const URGENCY_OPTIONS = [
  { label: "Immediate", value: "immediate" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

const STATUS_OPTIONS = [
  { label: "Pending", value: "pending" },
  { label: "Purchased", value: "purchased" },
  { label: "Cancelled", value: "cancelled" },
];

interface BikeAccessoryFormModalProps {
  open: boolean;
  onClose: () => void;
  bikeId: string;
  initialAccessory?: TBikeAccessory;
}

export function BikeAccessoryFormModal({
  open,
  onClose,
  bikeId,
  initialAccessory,
}: BikeAccessoryFormModalProps) {
  const [name, setName] = useState("");
  const [urgency, setUrgency] = useState<TAccessoryUrgency>("medium");
  const [status, setStatus] = useState<TAccessoryStatus>("pending");
  const [price, setPrice] = useState("");

  const createMutation = usePost([["accessories", bikeId]]);
  const updateMutation = usePatch([["accessories", bikeId]]);

  const isPending = createMutation.isPending || updateMutation.isPending;
  // ! once purchased, status is a permanent, server-enforced lock (bikelog_server spec 25) —
  // ! disable it client-side too so the user isn't surprised by a rejected update
  const isStatusLocked = !!initialAccessory && initialAccessory.status === "purchased";

  useEffect(() => {
    if (!open) return;

    if (initialAccessory) {
      setName(initialAccessory.name || "");
      setUrgency(initialAccessory.urgency || "medium");
      setStatus(initialAccessory.status || "pending");
      setPrice(initialAccessory.price?.toString() ?? "");
    } else {
      setName("");
      setUrgency("medium");
      setStatus("pending");
      setPrice("");
    }
  }, [initialAccessory, open]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Toast.show({
        type: "error",
        text1: "Name is required",
        position: "top",
      });
      return;
    }
    if (
      price.trim() &&
      (!DECIMAL_REGEX.test(price.trim()) || parseFloat(price) <= 0)
    ) {
      Toast.show({
        type: "error",
        text1: "Enter a valid price greater than 0",
        position: "top",
      });
      return;
    }
    if (status === "purchased" && !price.trim()) {
      Toast.show({
        type: "error",
        text1: "Price is required when marking an accessory as purchased",
        position: "top",
      });
      return;
    }

    const payload: TCreateBikeAccessoryPayload = {
      name: name.trim(),
      urgency,
      status,
      ...(price.trim() ? { price: parseFloat(price) } : {}),
    };

    try {
      if (initialAccessory) {
        await updateMutation.mutateAsync({
          url: `/bikes/${bikeId}/accessories/${initialAccessory._id}`,
          payload,
        });
        Toast.show({ type: "success", text1: "Accessory updated", position: "top" });
      } else {
        await createMutation.mutateAsync({
          url: `/bikes/${bikeId}/accessories`,
          payload,
        });
        Toast.show({ type: "success", text1: "Accessory added", position: "top" });
      }
      onClose();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to save accessory",
        position: "top",
      });
    }
  };

  return (
    <Portal>
      <Modal visible={open} onDismiss={onClose} contentContainerStyle={styles.modal}>
        <KeyboardAwareScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>
            {initialAccessory ? "Edit Accessory" : "Add to Wishlist"}
          </Text>

          <View style={styles.field}>
            <TextInput
              placeholder="Item Name"
              value={name}
              onChangeText={setName}
              editable={!isPending}
              textColor={COLORS.text}
              style={styles.input}
            />
          </View>

          <SelectPickerField
            label="Urgency"
            value={urgency}
            onChange={(val) => setUrgency(val as TAccessoryUrgency)}
            options={URGENCY_OPTIONS}
            required
          />

          <SelectPickerField
            label="Status"
            value={status}
            onChange={(val) => setStatus(val as TAccessoryStatus)}
            options={STATUS_OPTIONS}
            required
            disabled={isStatusLocked}
          />
          {isStatusLocked && (
            <Text style={styles.lockedHint}>
              Status is locked once purchased.
            </Text>
          )}

          <View style={styles.field}>
            <TextInput
              placeholder={
                status === "purchased" ? "Price (required)" : "Price (optional)"
              }
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              editable={!isPending}
              textColor={COLORS.text}
              style={styles.input}
            />
          </View>

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={isPending}
            disabled={isPending}
            style={styles.button}
          >
            {initialAccessory ? "Update" : "Add"}
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
  lockedHint: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: -10,
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
