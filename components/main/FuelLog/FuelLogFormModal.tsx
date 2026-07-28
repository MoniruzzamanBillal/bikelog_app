import { DatePickerField } from "@/components/main/shared";
import { usePatch, usePost } from "@/hooks/useApi";
import { TCreateFuelLogPayload, TFuelLog } from "@/types/fuel-log.types";
import { COLORS } from "@/utils/colors";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Button, Modal, Portal, Text, TextInput } from "react-native-paper";
import Toast from "react-native-toast-message";

const DECIMAL_REGEX = /^\d+(\.\d{0,2})?$/;
const INT_REGEX = /^\d+$/;

interface FuelLogFormModalProps {
  open: boolean;
  onClose: () => void;
  bikeId: string;
  initialFuelLog?: TFuelLog;
}

export function FuelLogFormModal({
  open,
  onClose,
  bikeId,
  initialFuelLog,
}: FuelLogFormModalProps) {
  const [odometer, setOdometer] = useState("");
  const [liters, setLiters] = useState("");
  const [isFullTank, setIsFullTank] = useState(false);
  const [pricePerLiter, setPricePerLiter] = useState("");
  const [station, setStation] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  const createMutation = usePost([["fuelLogs", bikeId]]);
  const updateMutation = usePatch([["fuelLogs", bikeId]]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!open) return;

    if (initialFuelLog) {
      setOdometer(initialFuelLog.odometerReading.toString());
      setLiters(initialFuelLog.litersAdded.toString());
      setIsFullTank(initialFuelLog.isFullTank || false);
      setPricePerLiter(initialFuelLog.pricePerLiter.toString());
      setStation(initialFuelLog.fuelStation || "");
      setDate(format(new Date(initialFuelLog.date), "yyyy-MM-dd"));
      setNotes(initialFuelLog.notes || "");
    } else {
      setOdometer("");
      setLiters("");
      setIsFullTank(false);
      setPricePerLiter("");
      setStation("");
      setDate(format(new Date(), "yyyy-MM-dd"));
      setNotes("");
    }
  }, [initialFuelLog, open]);

  const handleSubmit = async () => {
    if (!odometer.trim() || !liters.trim() || !pricePerLiter.trim()) {
      Toast.show({
        type: "error",
        text1: "Odometer, liters, and price are required",
        position: "top",
      });
      return;
    }
    if (!INT_REGEX.test(odometer.trim())) {
      Toast.show({
        type: "error",
        text1: "Odometer must be a whole number",
        position: "top",
      });
      return;
    }
    if (!DECIMAL_REGEX.test(liters.trim())) {
      Toast.show({
        type: "error",
        text1: "Enter a valid liter amount",
        position: "top",
      });
      return;
    }
    if (!DECIMAL_REGEX.test(pricePerLiter.trim())) {
      Toast.show({
        type: "error",
        text1: "Enter a valid price per liter",
        position: "top",
      });
      return;
    }

    const payload: TCreateFuelLogPayload = {
      odometerReading: parseInt(odometer, 10),
      litersAdded: parseFloat(liters),
      isFullTank,
      pricePerLiter: parseFloat(pricePerLiter),
      fuelStation: station.trim() || undefined,
      date: date || new Date().toISOString(),
      notes: notes.trim() || undefined,
    };

    try {
      if (initialFuelLog) {
        await updateMutation.mutateAsync({
          url: `/bikes/${bikeId}/fuel-logs/${initialFuelLog._id}`,
          payload,
        });
        Toast.show({
          type: "success",
          text1: "Fuel log updated",
          position: "top",
        });
      } else {
        const result = await createMutation.mutateAsync({
          url: `/bikes/${bikeId}/fuel-logs`,
          payload,
        });
        Toast.show({
          type: "success",
          text1: "Fuel log added",
          position: "top",
        });
        if (result?.data?.mileageRecordClosed) {
          Toast.show({
            type: "success",
            text1: `Mileage: ${result.data.mileageRecordClosed.mileageKmPerLiter.toFixed(2)} km/l for this tank`,
            position: "top",
          });
        }
      }
      onClose();
    } catch (error: any) {
      if (error?.statusCode === 409) {
        Toast.show({
          type: "error",
          text1: "Cannot edit: mileage record already closed for this period",
          position: "top",
        });
      } else {
        Toast.show({
          type: "error",
          text1: error?.message || "Failed to save fuel log",
          position: "top",
        });
      }
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
            {initialFuelLog ? "Edit Fuel Log" : "Add Fuel Log"}
          </Text>

          <View style={styles.field}>
            <TextInput
              placeholder="Odometer (km)"
              value={odometer}
              onChangeText={setOdometer}
              keyboardType="number-pad"
              editable={!isPending}
              textColor={COLORS.text}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <TextInput
              placeholder="Liters Added"
              value={liters}
              onChangeText={setLiters}
              keyboardType="decimal-pad"
              editable={!isPending}
              textColor={COLORS.text}
              style={styles.input}
            />
          </View>

          <Text style={styles.label}>Full Tank?</Text>
          <View style={styles.pillRow}>
            <TouchableOpacity
              style={[styles.pill, isFullTank && styles.pillActive]}
              onPress={() => setIsFullTank(true)}
              disabled={isPending}
            >
              <Text
                style={[styles.pillText, isFullTank && styles.pillTextActive]}
              >
                Yes
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pill, !isFullTank && styles.pillActive]}
              onPress={() => setIsFullTank(false)}
              disabled={isPending}
            >
              <Text
                style={[styles.pillText, !isFullTank && styles.pillTextActive]}
              >
                No
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <TextInput
              placeholder="Price per Liter"
              value={pricePerLiter}
              onChangeText={setPricePerLiter}
              keyboardType="decimal-pad"
              editable={!isPending}
              textColor={COLORS.text}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <TextInput
              placeholder="Fuel Station (optional)"
              value={station}
              onChangeText={setStation}
              editable={!isPending}
              textColor={COLORS.text}
              style={styles.input}
            />
          </View>

          <DatePickerField
            label="Date"
            value={date}
            onChange={setDate}
            maximumDate={new Date()}
            disabled={isPending}
          />

          <View style={styles.field}>
            <TextInput
              placeholder="Notes (optional)"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
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
            {initialFuelLog ? "Update" : "Add"}
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
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  pillRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pillText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  pillTextActive: {
    color: COLORS.white,
  },
  button: {
    marginTop: 8,
  },
  cancelButton: {
    marginTop: 8,
  },
});
