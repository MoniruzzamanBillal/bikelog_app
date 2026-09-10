import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Modal, Portal, Text } from "react-native-paper";
import Toast from "react-native-toast-message";
import {
  DatePickerField,
  FormField,
  PrimaryButton,
} from "@/components/main/shared";
import { usePatch, usePost } from "@/hooks/useApi";
import { COLORS } from "@/utils/colors";
import { TBike, TCreateBikePayload, TUpdateBikePayload } from "@/types/bike.types";

const DECIMAL_REGEX = /^\d+(\.\d{0,2})?$/;

interface BikeFormModalProps {
  open: boolean;
  onClose: () => void;
  initialBike?: TBike;
}

export function BikeFormModal({ open, onClose, initialBike }: BikeFormModalProps) {
  const [nickname, setNickname] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [fuelTankCapacityLiters, setFuelTankCapacityLiters] = useState("");
  const [currentOdometer, setCurrentOdometer] = useState("");

  const createMutation = usePost([["bikes"]]);
  const updateMutation = usePatch([["bikes"], ["bikes", initialBike?._id ?? ""]]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!open) return;

    if (initialBike) {
      setNickname(initialBike.nickname);
      setBrand(initialBike.brand);
      setModel(initialBike.model);
      setRegistrationNumber(initialBike.registrationNumber);
      setPurchaseDate(initialBike.purchaseDate.split("T")[0]);
      setFuelTankCapacityLiters(initialBike.fuelTankCapacityLiters.toString());
      setCurrentOdometer("");
    } else {
      setNickname("");
      setBrand("");
      setModel("");
      setRegistrationNumber("");
      setPurchaseDate("");
      setFuelTankCapacityLiters("");
      setCurrentOdometer("");
    }
  }, [initialBike, open]);

  const handleSubmit = async () => {
    if (
      !nickname.trim() ||
      !brand.trim() ||
      !model.trim() ||
      !registrationNumber.trim() ||
      !purchaseDate.trim() ||
      !fuelTankCapacityLiters.trim()
    ) {
      Toast.show({ type: "error", text1: "All fields are required", position: "top" });
      return;
    }
    if (!DECIMAL_REGEX.test(fuelTankCapacityLiters.trim())) {
      Toast.show({
        type: "error",
        text1: "Enter a valid fuel tank capacity",
        position: "top",
      });
      return;
    }
    if (currentOdometer.trim() && !DECIMAL_REGEX.test(currentOdometer.trim())) {
      Toast.show({
        type: "error",
        text1: "Enter a valid odometer reading",
        position: "top",
      });
      return;
    }

    try {
      if (initialBike) {
        const payload: TUpdateBikePayload = {
          nickname: nickname.trim(),
          brand: brand.trim(),
          model: model.trim(),
          registrationNumber: registrationNumber.trim(),
          purchaseDate: purchaseDate.trim(),
          fuelTankCapacityLiters: parseFloat(fuelTankCapacityLiters),
        };
        await updateMutation.mutateAsync({
          url: `/bikes/${initialBike._id}`,
          payload,
        });
        Toast.show({ type: "success", text1: "Bike updated successfully", position: "top" });
      } else {
        const payload: TCreateBikePayload = {
          nickname: nickname.trim(),
          brand: brand.trim(),
          model: model.trim(),
          registrationNumber: registrationNumber.trim(),
          purchaseDate: purchaseDate.trim(),
          fuelTankCapacityLiters: parseFloat(fuelTankCapacityLiters),
          ...(currentOdometer.trim()
            ? { currentOdometer: parseFloat(currentOdometer) }
            : {}),
        };
        await createMutation.mutateAsync({ url: "/bikes", payload });
        Toast.show({ type: "success", text1: "Bike added successfully", position: "top" });
      }
      onClose();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to save bike",
        position: "top",
      });
    }
  };

  return (
    <Portal>
      <Modal visible={open} onDismiss={onClose} contentContainerStyle={styles.modal}>
        <KeyboardAwareScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{initialBike ? "Edit Bike" : "Add Bike"}</Text>

          <FormField
            label="Nickname"
            placeholder="Red Beast"
            value={nickname}
            onChangeText={setNickname}
            editable={!isPending}
          />

          <View style={styles.row}>
            <FormField
              label="Brand"
              placeholder="Yamaha"
              value={brand}
              onChangeText={setBrand}
              editable={!isPending}
              style={styles.rowField}
            />
            <FormField
              label="Model"
              placeholder="FZS V3"
              value={model}
              onChangeText={setModel}
              editable={!isPending}
              style={styles.rowField}
            />
          </View>

          <FormField
            label="Registration No."
            placeholder="DHAKA-METRO-GA-11-2233"
            value={registrationNumber}
            onChangeText={setRegistrationNumber}
            editable={!isPending}
          />

          <DatePickerField
            label="Purchase Date"
            value={purchaseDate}
            onChange={setPurchaseDate}
            maximumDate={new Date()}
            disabled={isPending}
          />

          {initialBike ? (
            <FormField
              label="Tank Capacity (L)"
              placeholder="12"
              value={fuelTankCapacityLiters}
              onChangeText={setFuelTankCapacityLiters}
              keyboardType="decimal-pad"
              editable={!isPending}
              style={styles.lastField}
            />
          ) : (
            <View style={styles.row}>
              <FormField
                label="Tank (L)"
                placeholder="12"
                value={fuelTankCapacityLiters}
                onChangeText={setFuelTankCapacityLiters}
                keyboardType="decimal-pad"
                editable={!isPending}
                style={styles.rowField}
              />
              <FormField
                label="Odometer (km)"
                placeholder="1500"
                value={currentOdometer}
                onChangeText={setCurrentOdometer}
                keyboardType="decimal-pad"
                editable={!isPending}
                style={[styles.rowField, styles.lastField]}
              />
            </View>
          )}

          <PrimaryButton onPress={handleSubmit} loading={isPending} style={styles.button}>
            {initialBike ? "Save Changes" : "Save Bike"}
          </PrimaryButton>

          <PrimaryButton
            onPress={onClose}
            disabled={isPending}
            style={styles.cancelButton}
          >
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
  row: {
    flexDirection: "row",
    gap: 10,
  },
  rowField: {
    flex: 1,
  },
  lastField: {
    marginBottom: 24,
  },
  button: {
    marginTop: 8,
  },
  cancelButton: {
    marginTop: 10,
    borderColor: COLORS.borderSubtle,
  },
});
