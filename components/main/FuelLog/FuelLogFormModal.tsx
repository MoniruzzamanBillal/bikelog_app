import {
  DatePickerField,
  FormField,
  PrimaryButton,
  SwitchField,
} from "@/components/main/shared";
import { usePatch, usePost } from "@/hooks/useApi";
import { TCreateFuelLogPayload, TFuelLog } from "@/types/fuel-log.types";
import { COLORS } from "@/utils/colors";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Modal, Portal, Text } from "react-native-paper";
import Toast from "react-native-toast-message";

const DECIMAL_REGEX = /^\d+(\.\d{0,2})?$/;

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
      setDate(initialFuelLog.date.split("T")[0]);
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

  const parsedLiters = parseFloat(liters);
  const parsedPrice = parseFloat(pricePerLiter);
  const computedTotal =
    Number.isFinite(parsedLiters) && Number.isFinite(parsedPrice)
      ? parsedLiters * parsedPrice
      : null;

  const handleSubmit = async () => {
    if (!odometer.trim() || !liters.trim() || !pricePerLiter.trim()) {
      Toast.show({
        type: "error",
        text1: "Odometer, liters, and price are required",
        position: "top",
      });
      return;
    }
    if (!DECIMAL_REGEX.test(odometer.trim())) {
      Toast.show({
        type: "error",
        text1: "Enter a valid odometer reading",
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
      odometerReading: parseFloat(odometer),
      litersAdded: parseFloat(liters),
      isFullTank,
      pricePerLiter: parseFloat(pricePerLiter),
      fuelStation: station.trim() || undefined,
      date: date || format(new Date(), "yyyy-MM-dd"),
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
            {initialFuelLog ? "Edit Fuel Log" : "Add Fill-up"}
          </Text>

          <View style={styles.row}>
            <FormField
              label="Odometer (km)"
              placeholder="1550"
              value={odometer}
              onChangeText={setOdometer}
              keyboardType="decimal-pad"
              editable={!isPending}
              style={styles.rowField}
            />
            <View style={styles.rowField}>
              <DatePickerField
                label="Date"
                value={date}
                onChange={setDate}
                maximumDate={new Date()}
                disabled={isPending}
                style={styles.noMarginBottom}
              />
            </View>
          </View>

          <View style={styles.row}>
            <FormField
              label="Liters Added"
              placeholder="8.5"
              value={liters}
              onChangeText={setLiters}
              keyboardType="decimal-pad"
              editable={!isPending}
              style={styles.rowField}
            />
            <FormField
              label="Price/L (৳)"
              placeholder="125.5"
              value={pricePerLiter}
              onChangeText={setPricePerLiter}
              keyboardType="decimal-pad"
              editable={!isPending}
              style={styles.rowField}
            />
          </View>

          {computedTotal !== null && (
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Total cost</Text>
              <Text style={styles.totalValue}>৳{computedTotal.toFixed(2)}</Text>
            </View>
          )}

          <FormField
            label="Fuel Station"
            placeholder="Padma Filling Station"
            value={station}
            onChangeText={setStation}
            editable={!isPending}
          />

          <FormField
            label="Notes (optional)"
            placeholder="Full tank before highway trip"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            editable={!isPending}
          />

          <SwitchField
            label="Full Tank"
            description="Triggers mileage calculation"
            value={isFullTank}
            onChange={setIsFullTank}
            disabled={isPending}
          />

          <PrimaryButton onPress={handleSubmit} loading={isPending} style={styles.button}>
            {initialFuelLog ? "Save Changes" : "Save Fill-up"}
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
  row: {
    flexDirection: "row",
    gap: 10,
  },
  rowField: {
    flex: 1,
  },
  noMarginBottom: {
    marginBottom: 14,
  },
  totalBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textLight,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: "monospace",
  },
  button: {
    marginTop: 10,
  },
  cancelButton: {
    marginTop: 10,
    borderColor: COLORS.borderSubtle,
  },
});
