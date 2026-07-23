import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Button, Modal, Portal, Text, TextInput } from "react-native-paper";
import Toast from "react-native-toast-message";
import { SelectPickerField } from "@/components/main/shared";
import { useFetchData, usePatch, usePost } from "@/hooks/useApi";
import { COLORS } from "@/utils/colors";
import { TMaintenanceType, TEngineOilType } from "@/types/catalog.types";
import {
  TCreateMaintenanceLogPayload,
  TMaintenanceLog,
} from "@/types/maintenance-log.types";

const DECIMAL_REGEX = /^\d+(\.\d{0,2})?$/;
const INT_REGEX = /^\d+$/;

interface MaintenanceLogFormModalProps {
  open: boolean;
  onClose: () => void;
  bikeId: string;
  log?: TMaintenanceLog;
}

export function MaintenanceLogFormModal({
  open,
  onClose,
  bikeId,
  log,
}: MaintenanceLogFormModalProps) {
  const { data: mtData } = useFetchData<TMaintenanceType[]>(
    ["maintenance-types"],
    "/maintenance-types",
    { enabled: open },
  );
  const { data: oilData } = useFetchData<TEngineOilType[]>(
    ["engine-oil-types"],
    "/engine-oil-types",
    { enabled: open },
  );

  const maintenanceTypes = useMemo(() => mtData?.data ?? [], [mtData]);
  const oilTypes = useMemo(() => oilData?.data ?? [], [oilData]);

  const [maintenanceType, setMaintenanceType] = useState<string | null>(null);
  const [odometerReading, setOdometerReading] = useState("");
  const [oilType, setOilType] = useState<string | null>(null);
  const [intervalKmUsed, setIntervalKmUsed] = useState("");
  const [cost, setCost] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [nextDueDate, setNextDueDate] = useState("");
  const [serviceCenter, setServiceCenter] = useState("");
  const [partsReplaced, setPartsReplaced] = useState("");
  const [notes, setNotes] = useState("");

  const createMutation = usePost([["maintenanceLogs", bikeId], ["reminders", bikeId]]);
  const updateMutation = usePatch([["maintenanceLogs", bikeId], ["reminders", bikeId]]);
  const isPending = createMutation.isPending || updateMutation.isPending;

  const selectedMaintType = useMemo(
    () => maintenanceTypes.find((mt) => mt._id === maintenanceType),
    [maintenanceTypes, maintenanceType],
  );
  const isEngineOil = selectedMaintType?.name === "Engine Oil";

  useEffect(() => {
    if (!isEngineOil) {
      setOilType(null);
    }
  }, [isEngineOil]);

  const mtOptions = useMemo(
    () => maintenanceTypes.map((mt) => ({ label: mt.name, value: mt._id })),
    [maintenanceTypes],
  );
  const oilOptions = useMemo(
    () => oilTypes.map((ot) => ({
      label: `${ot.name} (${ot.suggestedIntervalKm} km)`,
      value: ot._id,
    })),
    [oilTypes],
  );

  useEffect(() => {
    if (!open) return;

    if (log) {
      const mtId = typeof log.maintenanceType === "object"
        ? log.maintenanceType._id
        : log.maintenanceType;
      setMaintenanceType(mtId);
      setOdometerReading(log.odometerReading.toString());
      const oilId = typeof log.oilType === "object" && log.oilType
        ? log.oilType._id
        : typeof log.oilType === "string"
          ? log.oilType
          : "";
      setOilType(oilId || null);
      setIntervalKmUsed(log.intervalKmUsed.toString());
      setCost(log.cost.toString());
      setServiceDate(log.serviceDate ? log.serviceDate.split("T")[0] : "");
      setNextDueDate(log.nextDueDate ? log.nextDueDate.split("T")[0] : "");
      setServiceCenter(log.serviceCenter || "");
      setPartsReplaced(log.partsReplaced?.join(", ") || "");
      setNotes(log.notes || "");
    } else {
      setMaintenanceType(null);
      setOdometerReading("");
      setOilType(null);
      setIntervalKmUsed("");
      setCost("");
      setServiceDate(new Date().toISOString().split("T")[0]);
      setNextDueDate("");
      setServiceCenter("");
      setPartsReplaced("");
      setNotes("");
    }
  }, [log, open]);

  const handleSubmit = async () => {
    if (!maintenanceType) {
      Toast.show({ type: "error", text1: "Maintenance type is required", position: "top" });
      return;
    }
    if (!odometerReading.trim() || !INT_REGEX.test(odometerReading.trim())) {
      Toast.show({ type: "error", text1: "Enter a valid odometer reading", position: "top" });
      return;
    }
    if (!intervalKmUsed.trim() || !INT_REGEX.test(intervalKmUsed.trim())) {
      Toast.show({ type: "error", text1: "Enter a valid service interval", position: "top" });
      return;
    }
    if (!cost.trim() || !DECIMAL_REGEX.test(cost.trim())) {
      Toast.show({ type: "error", text1: "Enter a valid cost", position: "top" });
      return;
    }

    const parts: string[] = partsReplaced
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: TCreateMaintenanceLogPayload = {
      maintenanceType,
      odometerReading: parseInt(odometerReading, 10),
      intervalKmUsed: parseInt(intervalKmUsed, 10),
      cost: parseFloat(cost),
      oilType: oilType || undefined,
      serviceDate: serviceDate || new Date().toISOString(),
      nextDueDate: nextDueDate || undefined,
      serviceCenter: serviceCenter.trim() || undefined,
      partsReplaced: parts.length > 0 ? parts : undefined,
      notes: notes.trim() || undefined,
    };

    try {
      if (log) {
        await updateMutation.mutateAsync({
          url: `/bikes/${bikeId}/maintenance-logs/${log._id}`,
          payload,
        });
        Toast.show({ type: "success", text1: "Maintenance log updated", position: "top" });
      } else {
        await createMutation.mutateAsync({
          url: `/bikes/${bikeId}/maintenance-logs`,
          payload,
        });
        Toast.show({ type: "success", text1: "Maintenance log added", position: "top" });
      }
      onClose();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to save maintenance log",
        position: "top",
      });
    }
  };

  return (
    <Portal>
      <Modal visible={open} onDismiss={onClose} contentContainerStyle={styles.modal}>
        <KeyboardAwareScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>
            {log ? "Edit Maintenance" : "Add Maintenance"}
          </Text>

          <SelectPickerField
            label="Maintenance Type"
            value={maintenanceType}
            onChange={setMaintenanceType}
            options={mtOptions}
            required
          />

          <View style={styles.field}>
            <TextInput
              placeholder="Odometer (km)"
              value={odometerReading}
              onChangeText={setOdometerReading}
              keyboardType="number-pad"
              editable={!isPending}
              textColor={COLORS.text}
              style={styles.input}
            />
          </View>

          {isEngineOil && (
            <SelectPickerField
              label="Engine Oil Type"
              value={oilType}
              onChange={setOilType}
              options={oilOptions}
            />
          )}

          <View style={styles.field}>
            <TextInput
              placeholder="Service Interval (km)"
              value={intervalKmUsed}
              onChangeText={setIntervalKmUsed}
              keyboardType="number-pad"
              editable={!isPending}
              textColor={COLORS.text}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <TextInput
              placeholder="Cost (৳)"
              value={cost}
              onChangeText={setCost}
              keyboardType="decimal-pad"
              editable={!isPending}
              textColor={COLORS.text}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <TextInput
              placeholder="Service Date (YYYY-MM-DD)"
              value={serviceDate}
              onChangeText={setServiceDate}
              editable={!isPending}
              textColor={COLORS.text}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <TextInput
              placeholder="Next Due Date (optional, YYYY-MM-DD)"
              value={nextDueDate}
              onChangeText={setNextDueDate}
              editable={!isPending}
              textColor={COLORS.text}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <TextInput
              placeholder="Service Center (optional)"
              value={serviceCenter}
              onChangeText={setServiceCenter}
              editable={!isPending}
              textColor={COLORS.text}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <TextInput
              placeholder="Parts Replaced (optional, comma-separated)"
              value={partsReplaced}
              onChangeText={setPartsReplaced}
              editable={!isPending}
              textColor={COLORS.text}
              style={styles.input}
            />
          </View>

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
            labelStyle={{ color: COLORS.white }}
          >
            {log ? "Update" : "Add"}
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
