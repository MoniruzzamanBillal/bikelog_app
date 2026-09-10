import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Modal, Portal, Text } from "react-native-paper";
import Toast from "react-native-toast-message";
import { FormField, PrimaryButton, SelectPickerField } from "@/components/main/shared";
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

          <FormField
            label="Item Name"
            placeholder="Tail Tidy"
            value={name}
            onChangeText={setName}
            editable={!isPending}
          />

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

          <FormField
            label={status === "purchased" ? "Price (required)" : "Price (optional)"}
            placeholder="1290"
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            editable={!isPending}
          />

          <PrimaryButton onPress={handleSubmit} loading={isPending} style={styles.button}>
            {initialAccessory ? "Save Changes" : "Add to Wishlist"}
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
  lockedHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: -8,
    marginBottom: 14,
  },
  button: {
    marginTop: 10,
  },
  cancelButton: {
    marginTop: 10,
    borderColor: COLORS.borderSubtle,
  },
});
