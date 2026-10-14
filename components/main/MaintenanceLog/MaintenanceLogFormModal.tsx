import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Modal, Portal, Text } from "react-native-paper";
import Toast from "react-native-toast-message";
import {
  DatePickerField,
  EmptyState,
  FormActions,
  FormField,
  SectionLoading,
  SelectPickerField,
} from "@/components/main/shared";
import { useFetchData, usePatch, usePost } from "@/hooks/useApi";
import { COLORS } from "@/utils/colors";
import { addDays, format } from "date-fns";
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
  const { data: mtData, isLoading: mtLoading } = useFetchData<TMaintenanceType[]>(
    ["maintenance-types"],
    "/maintenance-types",
    { enabled: open },
  );
  const { data: oilData, isLoading: oilLoading } = useFetchData<TEngineOilType[]>(
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

  // ! D1: what the catalog seed itself last wrote into each field. The field is safe to
  // ! re-seed only while it still holds that exact value — anything else is the rider's
  // ! own typing and must survive a type change (H-A). Same seeded-vs-typed distinction
  // ! spec 52 §G introduced on the fuel form.
  const seededInterval = useRef<string | null>(null);
  const seededNextDueDate = useRef<string | null>(null);

  const createMutation = usePost([["maintenanceLogs", bikeId], ["reminders", bikeId]]);
  const updateMutation = usePatch([["maintenanceLogs", bikeId], ["reminders", bikeId]]);
  const isPending = createMutation?.isPending || updateMutation?.isPending;

  // ! §C: shown only while the value is still the seed's own, so it disappears on the
  // ! rider's first keystroke. A prefilled value nobody noticed is its own hazard (spec 52 §G).
  const intervalIsSeeded =
    intervalKmUsed !== "" && intervalKmUsed === seededInterval.current;
  const nextDueDateIsSeeded =
    nextDueDate !== "" && nextDueDate === seededNextDueDate.current;

  const selectedMaintType = useMemo(
    () => maintenanceTypes.find((mt) => mt?._id === maintenanceType),
    [maintenanceTypes, maintenanceType],
  );
  // ! Driven by the owner-set flag, not a match on the type's name — a name match only worked
  // ! while a seeded global row existed; per-user catalogs start empty (spec 48 §B).
  const isEngineOil = !!selectedMaintType?.requiresOilType;

  useEffect(() => {
    if (!isEngineOil) {
      setOilType(null);
    }
  }, [isEngineOil]);

  const selectedOilType = useMemo(
    () => oilTypes.find((ot) => ot?._id === oilType),
    [oilTypes, oilType],
  );

  // ! Seeds the interval from the catalog. H-A: only ever replaces a value this effect
  // ! itself wrote (tracked in seededInterval), so a hand-typed number always survives a
  // ! type change. H-C: the oil type's suggestion is more specific than the maintenance
  // ! type's default, so it wins — but neither beats typed input.
  useEffect(() => {
    if (!open || log) return; // H-B: create only

    const suggested =
      selectedOilType?.suggestedIntervalKm ??
      selectedMaintType?.defaultIntervalKm;

    const isSeed =
      intervalKmUsed === "" || intervalKmUsed === seededInterval.current;
    if (!isSeed) return; // H-A

    // ! 54a: "" is a legitimate seed value, so a missing suggestion CLEARS the field
    // ! rather than returning early. Returning early left the previous selection's seed
    // ! on screen — the stuck oil suggestion V12 asserts against (H-D, H-E).
    const next = suggested == null ? "" : String(Math.round(suggested)); // H-G
    if (next === intervalKmUsed) return; // also what stops this effect looping on its own write

    seededInterval.current = next === "" ? null : next;
    setIntervalKmUsed(next);
  }, [open, log, selectedMaintType, selectedOilType, intervalKmUsed]);

  // ! H-F: serviceDate is the base and the rider can change it after the fact, so re-seed
  // ! whenever it moves — but only while the date is still a seed.
  useEffect(() => {
    if (!open || log) return;

    const days = selectedMaintType?.defaultIntervalDays;

    const isSeed =
      nextDueDate === "" || nextDueDate === seededNextDueDate.current;
    if (!isSeed) return;

    // ! 54a, with one asymmetry against the interval effect above: an unparseable
    // ! serviceDate means "can't recompute", which is a reason to leave a correct seed
    // ! alone — only a missing defaultIntervalDays clears it.
    let next = "";
    if (days != null) {
      if (!serviceDate) return;
      const base = new Date(`${serviceDate}T00:00:00`);
      if (Number.isNaN(base.getTime())) return;
      next = format(addDays(base, days), "yyyy-MM-dd");
    }
    if (next === nextDueDate) return;

    seededNextDueDate.current = next === "" ? null : next;
    setNextDueDate(next);
  }, [open, log, selectedMaintType, serviceDate, nextDueDate]);

  const mtOptions = useMemo(
    () => maintenanceTypes.map((mt) => ({ label: mt?.name, value: mt?._id })),
    [maintenanceTypes],
  );
  const oilOptions = useMemo(
    () => oilTypes.map((ot) => ({
      label: `${ot?.name} (${ot?.suggestedIntervalKm} km)`,
      value: ot?._id,
    })),
    [oilTypes],
  );

  useEffect(() => {
    if (!open) return;

    if (log) {
      // ! H-B: the edit path never seeds, so nothing on it is a seed.
      seededInterval.current = null;
      seededNextDueDate.current = null;

      const mtId = typeof log?.maintenanceType === "object"
        ? log?.maintenanceType?._id
        : log?.maintenanceType;
      setMaintenanceType(mtId);
      setOdometerReading(log?.odometerReading?.toString());
      const oilId = typeof log?.oilType === "object" && log?.oilType
        ? log?.oilType?._id
        : typeof log?.oilType === "string"
          ? log?.oilType
          : "";
      setOilType(oilId || null);
      setIntervalKmUsed(log?.intervalKmUsed?.toString() ?? "");
      setCost(log?.cost?.toString());
      setServiceDate(log?.serviceDate ? log?.serviceDate?.split("T")[0] : "");
      setNextDueDate(log?.nextDueDate ? log?.nextDueDate?.split("T")[0] : "");
      setServiceCenter(log?.serviceCenter || "");
      setPartsReplaced(log?.partsReplaced?.join(", ") || "");
      setNotes(log?.notes || "");
    } else {
      seededInterval.current = null;
      seededNextDueDate.current = null;

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
      partsReplaced: parts?.length > 0 ? parts : undefined,
      notes: notes.trim() || undefined,
    };

    try {
      if (log) {
        await updateMutation.mutateAsync({
          url: `/bikes/${bikeId}/maintenance-logs/${log?._id}`,
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

          {mtLoading ? (
            <SectionLoading count={1} />
          ) : mtOptions?.length === 0 ? (
            // ! A new user's catalog starts empty, so this is the first wall they hit —
            // ! without it the form looks broken (spec 48 §C).
            <EmptyState
              icon="wrench-outline"
              title="No maintenance types yet"
              message="Add one in Settings → Maintenance types, then come back to log this service."
              style={styles.emptyState}
            />
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
            oilLoading ? (
              <SectionLoading count={1} />
            ) : oilOptions?.length === 0 ? (
              <Text style={styles.hint}>
                No oil types yet — add one in Settings → Engine oil types.
              </Text>
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
            <View style={styles.rowField}>
              <FormField
                label="Interval km (opt)"
                placeholder="1200"
                value={intervalKmUsed}
                onChangeText={setIntervalKmUsed}
                keyboardType="decimal-pad"
                editable={!isPending}
                style={intervalIsSeeded ? styles.seededFieldTight : undefined}
              />
              {intervalIsSeeded && (
                <Text style={styles.seedHintText}>From your catalog default</Text>
              )}
            </View>
          </View>

          <DatePickerField
            label="Next Due Date (optional)"
            value={nextDueDate}
            onChange={setNextDueDate}
            disabled={isPending}
            style={nextDueDateIsSeeded ? styles.seededFieldTight : undefined}
          />
          {nextDueDateIsSeeded && (
            <Text style={styles.seedHintText}>From your catalog default</Text>
          )}

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

          <FormActions onSave={handleSubmit} onCancel={onClose} saving={isPending}>
            {log ? "Save Changes" : "Save Service"}
          </FormActions>
        </KeyboardAwareScrollView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.edge,
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 14,
    maxHeight: "85%",
  },
  title: {
    fontSize: 20,
    fontWeight: "500",
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
  emptyState: {
    marginBottom: 14,
  },
  hint: {
    fontSize: 12.5,
    color: COLORS.textLight,
    marginBottom: 14,
  },
  noMarginBottom: {
    marginBottom: 14,
  },
  // ! §C: the seeded-field marker reuses spec 52 §G's `seedHintText` typography and the
  // ! `accentForeground` token rather than introducing a second hint style — the modal's
  // ! own `hint` above is a muted empty-state note, which would not read as "seeded".
  seededFieldTight: {
    marginBottom: 4,
  },
  seedHintText: {
    fontSize: 11.5,
    lineHeight: 16,
    color: COLORS.accentForeground,
    marginBottom: 14,
  },
});
