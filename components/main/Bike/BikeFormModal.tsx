import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { format } from "date-fns";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Button, Modal, Portal, Text, TextInput } from "react-native-paper";
import Toast from "react-native-toast-message";
import { DatePickerField } from "@/components/main/shared";
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
      setPurchaseDate(format(new Date(initialBike.purchaseDate), "yyyy-MM-dd"));
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

          <View style={styles.field}>
            <TextInput
              placeholder="Nickname"
              value={nickname}
              onChangeText={setNickname}
              editable={!isPending}
              textColor={COLORS.text}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <TextInput
              placeholder="Brand"
              value={brand}
              onChangeText={setBrand}
              editable={!isPending}
              textColor={COLORS.text}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <TextInput
              placeholder="Model"
              value={model}
              onChangeText={setModel}
              editable={!isPending}
              textColor={COLORS.text}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <TextInput
              placeholder="Registration Number"
              value={registrationNumber}
              onChangeText={setRegistrationNumber}
              editable={!isPending}
              textColor={COLORS.text}
              style={styles.input}
            />
          </View>

          <DatePickerField
            label="Purchase Date"
            value={purchaseDate}
            onChange={setPurchaseDate}
            maximumDate={new Date()}
            disabled={isPending}
          />

          <View style={styles.field}>
            <TextInput
              placeholder="Fuel Tank Capacity (Liters)"
              value={fuelTankCapacityLiters}
              onChangeText={setFuelTankCapacityLiters}
              keyboardType="decimal-pad"
              editable={!isPending}
              textColor={COLORS.text}
              style={styles.input}
            />
          </View>

          {!initialBike && (
            <View style={styles.field}>
              <TextInput
                placeholder="Current Odometer (km)"
                value={currentOdometer}
                onChangeText={setCurrentOdometer}
                keyboardType="decimal-pad"
                editable={!isPending}
                textColor={COLORS.text}
                style={styles.input}
              />
            </View>
          )}

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={isPending}
            disabled={isPending}
            style={styles.button}
          >
            {initialBike ? "Update" : "Add"}
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
