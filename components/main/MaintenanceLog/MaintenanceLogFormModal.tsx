import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Modal, Portal, Text } from "react-native-paper";
import Toast from "react-native-toast-message";
import {
  DatePickerField,
  FormField,
  PrimaryButton,
  SectionLoading,
  SelectPickerField,
} from "@/components/main/shared";
import { useFetchData, usePatch, usePost } from "@/hooks/useApi";
import { COLORS } from "@/utils/colors";
import { format } from "date-fns";
import { TMaintenanceType, TEngineOilType } from "@/types/catalog.types";
import {
  TCreateMaintenanceLogPayload,
  TMaintenanceLog,
} from "@/types/maintenance-log.types";

const DECIMAL_REGEX = /^\d+(\.\d{0,2})?$/;

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
      setIntervalKmUsed(log.intervalKmUsed?.toString() ?? "");
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
      setServiceDate(format(new Date(), "yyyy-MM-dd"));
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
    if (!odometerReading.trim() || !DECIMAL_REGEX.test(odometerReading.trim())) {
      Toast.show({ type: "error", text1: "Enter a valid odometer reading", position: "top" });
      return;
    }
    if (intervalKmUsed.trim() && !DECIMAL_REGEX.test(intervalKmUsed.trim())) {
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
      odometerReading: parseFloat(odometerReading),
      intervalKmUsed: intervalKmUsed.trim() ? parseFloat(intervalKmUsed.trim()) : undefined,
      cost: parseFloat(cost),
      oilType: oilType || undefined,
      serviceDate: serviceDate || format(new Date(), "yyyy-MM-dd"),
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
          <Text style={styles.title}>{log ? "Edit Service" : "Add Service"}</Text>

          {maintenanceTypes.length === 0 ? (
            <SectionLoading count={1} />
          ) : (
            <SelectPickerField
              label="Maintenance Type"
              value={maintenanceType}
              onChange={setMaintenanceType}
              options={mtOptions}
              required
            />
          )}

          {isEngineOil && (
            oilTypes.length === 0 ? (
              <SectionLoading count={1} />
            ) : (
              <SelectPickerField
                label="Oil Type (optional)"
                value={oilType}
                onChange={setOilType}
                options={oilOptions}
              />
            )
          )}

          <View style={styles.row}>
            <FormField
              label="Odometer (km)"
              placeholder="1800"
              value={odometerReading}
              onChangeText={setOdometerReading}
              keyboardType="decimal-pad"
              editable={!isPending}
              style={styles.rowField}
            />
            <FormField
              label="Cost (৳)"
              placeholder="1500"
              value={cost}
              onChangeText={setCost}
              keyboardType="decimal-pad"
              editable={!isPending}
              style={styles.rowField}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowField}>
              <DatePickerField
                label="Service Date"
                value={serviceDate}
                onChange={setServiceDate}
                maximumDate={new Date()}
                disabled={isPending}
                style={styles.noMarginBottom}
              />
            </View>
            <FormField
              label="Interval km (opt)"
              placeholder="1200"
              value={intervalKmUsed}
              onChangeText={setIntervalKmUsed}
              keyboardType="decimal-pad"
              editable={!isPending}
              style={styles.rowField}
            />
          </View>

          <DatePickerField
            label="Next Due Date (optional)"
            value={nextDueDate}
            onChange={setNextDueDate}
            disabled={isPending}
          />

          <FormField
            label="Service Center"
            placeholder="City Bike Care"
            value={serviceCenter}
            onChangeText={setServiceCenter}
            editable={!isPending}
          />

          <FormField
            label="Parts Replaced (optional)"
            placeholder="Oil Filter, Spark Plug"
            value={partsReplaced}
            onChangeText={setPartsReplaced}
            editable={!isPending}
          />

          <FormField
            label="Notes"
            placeholder="Routine service"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            editable={!isPending}
          />

          <PrimaryButton onPress={handleSubmit} loading={isPending} style={styles.button}>
            {log ? "Save Changes" : "Save Service"}
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
  button: {
    marginTop: 10,
  },
  cancelButton: {
    marginTop: 10,
    borderColor: COLORS.borderSubtle,
  },
});
