import {
  DatePickerField,
  FormActions,
  FormField,
  SectionLoading,
  SelectPickerField,
  SwitchField,
} from "@/components/main/shared";
import { useFetchData, usePatch, usePost } from "@/hooks/useApi";
import { TEngineOilSeed } from "@/hooks/useEngineOilSeed";
import { TEngineOilType } from "@/types/catalog.types";
import {
  TCreateEngineOilLogPayload,
  TEngineOilLog,
} from "@/types/engine-oil-log.types";
import { COLORS } from "@/utils/colors";
import { format } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Modal, Portal, Text } from "react-native-paper";
import Toast from "react-native-toast-message";

// ! copied, not imported across folders — every modal in this app declares its own (§D).
const DECIMAL_REGEX = /^\d+(\.\d{0,2})?$/;

interface EngineOilLogFormModalProps {
  open: boolean;
  onClose: () => void;
  bikeId: string;
  log?: TEngineOilLog;
  /** §H's "Same as last change" prefill. Create only — ignored when `log` is set. */
  seed?: TEngineOilSeed;
  /** The bike's `currentOdometer` — the floor of the server's accepted range. */
  seedOdometer?: number;
}

export function EngineOilLogFormModal({
  open,
  onClose,
  bikeId,
  log,
  seed,
  seedOdometer,
}: EngineOilLogFormModalProps) {
  // ! H-D: `["engine-oil-types"]`, kebab-case — the key `SettingsCatalog` owns and
  // ! invalidates after a create/edit/delete. The web client's camelCase
  // ! `["engineOilTypes"]` would fetch the catalog a second time and never see a type the
  // ! rider just added in Settings.
  const { data: oilData, isLoading: oilLoading } = useFetchData<TEngineOilType[]>(
    ["engine-oil-types"],
    "/engine-oil-types",
    { enabled: open },
  );
  const oilTypes = useMemo(() => oilData?.data ?? [], [oilData]);

  const [oilType, setOilType] = useState<string | null>(null);
  const [odometerReading, setOdometerReading] = useState("");
  const [cost, setCost] = useState("");
  const [changeDate, setChangeDate] = useState("");
  const [intervalKmUsed, setIntervalKmUsed] = useState("");
  const [quantityLiters, setQuantityLiters] = useState("");
  const [oilFilterChanged, setOilFilterChanged] = useState(false);
  const [serviceCenter, setServiceCenter] = useState("");
  const [notes, setNotes] = useState("");

  // ! H-K rule 2: what the catalog seed itself last wrote. The field is safe to re-seed
  // ! only while it still holds that exact value — anything else is the rider's own typing
  // ! and must survive an oil-type change. Same seeded-vs-typed distinction spec 52 §G
  // ! introduced on the fuel form and spec 54 D1 on the maintenance form.
  const seededInterval = useRef<string | null>(null);

  const invalidate = [
    ["engineOilLogs", bikeId],
    ["engineOilStatus", bikeId],
    // ! creating an oil change runs `bumpOdometerIfHigher` server-side, so the hub's
    // ! odometer would otherwise lag; the reminder is now sourced from this table; and
    // ! ["spending", bikeId] is a prefix of the hub's monthly spending key.
    ["bikes", bikeId],
    ["spending", bikeId],
    ["reminders", bikeId],
  ];
  const createMutation = usePost(invalidate);
  const updateMutation = usePatch(invalidate);
  const isPending = createMutation?.isPending || updateMutation?.isPending;

  const intervalIsSeeded =
    intervalKmUsed !== "" && intervalKmUsed === seededInterval.current;

  const selectedOilType = useMemo(
    () => oilTypes.find((ot) => ot?._id === oilType),
    [oilTypes, oilType],
  );

  const oilOptions = useMemo(
    () =>
      oilTypes.map((ot) => ({
        label: `${ot?.name} (${ot?.suggestedIntervalKm} km)`,
        value: ot?._id,
      })),
    [oilTypes],
  );

  useEffect(() => {
    if (!open) return;

    if (log) {
      // ! H-K rule 3: edit seeds from the log's OWN stored `intervalKmUsed`, never from
      // ! today's catalog. The stored value is what this log's due point was computed
      // ! from (server H6) — re-seeding it would silently move that due point on save when
      // ! the rider only opened the modal to fix a typo in the cost. Nothing on the edit
      // ! path is a seed, so the ref is cleared.
      seededInterval.current = null;

      const oilId =
        typeof log?.oilType === "object" && log?.oilType
          ? log?.oilType?._id
          : typeof log?.oilType === "string"
            ? log?.oilType
            : "";
      setOilType(oilId || null);
      setOdometerReading(log?.odometerReading?.toString() ?? "");
      setCost(log?.cost?.toString() ?? "");
      setChangeDate(log?.changeDate ? log?.changeDate?.split("T")[0] : "");
      setIntervalKmUsed(log?.intervalKmUsed?.toString() ?? "");
      setQuantityLiters(log?.quantityLiters?.toString() ?? "");
      setOilFilterChanged(!!log?.oilFilterChanged);
      setServiceCenter(log?.serviceCenter || "");
      setNotes(log?.notes || "");
    } else if (seed) {
      // ! §H quick-fill. The seeded interval IS the seed's own value, so the ref points at
      // ! it — switching the oil type afterwards then legitimately re-seeds (rule 1).
      // ! H-J: the odometer and the date are never copied from the previous change. The
      // ! odometer prefills from `currentOdometer` as on the plain Add path; the date is
      // ! today.
      const seededIntervalValue = seed?.intervalKmUsed?.toString() ?? "";
      seededInterval.current = seededIntervalValue || null;

      setOilType(seed?.oilType ?? null);
      setOdometerReading(seedOdometer != null ? String(seedOdometer) : "");
      setCost(seed?.cost != null ? String(seed?.cost) : "");
      setChangeDate(format(new Date(), "yyyy-MM-dd"));
      setIntervalKmUsed(seededIntervalValue);
      setQuantityLiters(seed?.quantityLiters?.toString() ?? "");
      setOilFilterChanged(!!seed?.oilFilterChanged);
      setServiceCenter(seed?.serviceCenter || "");
      setNotes("");
    } else {
      seededInterval.current = null;

      setOilType(null);
      setOdometerReading(seedOdometer != null ? String(seedOdometer) : "");
      setCost("");
      setChangeDate(format(new Date(), "yyyy-MM-dd"));
      setIntervalKmUsed("");
      setQuantityLiters("");
      setOilFilterChanged(false);
      setServiceCenter("");
      setNotes("");
    }
  }, [log, open, seed, seedOdometer]);

  // ! H-K rule 1: the interval seeds from the picked oil type's `suggestedIntervalKm`, and
  // ! rule 2 keeps it there — this effect only ever replaces a value it wrote itself.
  useEffect(() => {
    if (!open || log) return; // rule 3: create only

    const suggested = selectedOilType?.suggestedIntervalKm;

    const isSeed =
      intervalKmUsed === "" || intervalKmUsed === seededInterval.current;
    if (!isSeed) return; // rule 2 — a hand-typed number survives a type change

    // ! 54a, folded in rather than reimplemented: "" is a legitimate seed value, so a
    // ! missing suggestion CLEARS the field instead of returning early. Returning early is
    // ! what left the previous selection's seed standing on the maintenance form.
    const next = suggested == null ? "" : String(Math.round(suggested));
    if (next === intervalKmUsed) return; // also what stops this effect looping on its own write

    seededInterval.current = next === "" ? null : next;
    setIntervalKmUsed(next);
  }, [open, log, selectedOilType, intervalKmUsed]);

  const handleSubmit = async () => {
    // ! bounds mirror `engineOilLog.validation.ts` so the two refuse the same things.
    if (!oilType) {
      Toast.show({
        type: "error",
        text1: "Engine oil type is required",
        position: "top",
      });
      return;
    }
    if (
      !odometerReading.trim() ||
      !DECIMAL_REGEX.test(odometerReading.trim())
    ) {
      Toast.show({
        type: "error",
        text1: "Enter a valid odometer reading",
        position: "top",
      });
      return;
    }
    if (parseFloat(odometerReading) > 999999) {
      Toast.show({
        type: "error",
        text1: "Odometer reading can't exceed 999,999 km",
        position: "top",
      });
      return;
    }
    // ! §D: blanking the interval BLOCKS submit rather than falling back to the catalog
    // ! silently — the rider can always see the number that will be stored.
    if (
      !intervalKmUsed.trim() ||
      !DECIMAL_REGEX.test(intervalKmUsed.trim()) ||
      parseFloat(intervalKmUsed) <= 0
    ) {
      Toast.show({
        type: "error",
        text1: intervalKmUsed.trim()
          ? "Enter a valid service interval"
          : "Service interval is required",
        position: "top",
      });
      return;
    }
    if (parseFloat(intervalKmUsed) > 100000) {
      Toast.show({
        type: "error",
        text1: "Service interval can't exceed 100,000 km",
        position: "top",
      });
      return;
    }
    if (quantityLiters.trim()) {
      const qty = parseFloat(quantityLiters);
      if (!DECIMAL_REGEX.test(quantityLiters.trim()) || qty <= 0 || qty > 20) {
        Toast.show({
          type: "error",
          text1: "Enter a valid oil quantity (max 20 L)",
          position: "top",
        });
        return;
      }
    }
    if (!cost.trim() || !DECIMAL_REGEX.test(cost.trim())) {
      Toast.show({ type: "error", text1: "Enter a valid cost", position: "top" });
      return;
    }

    // ! H-M: nothing server-derived. `nextDueOdometer`, `kmOnThisOil` and `costPerKm` are
    // ! absent from both server schemas and would be silently dropped, which is worse than
    // ! an error. `oilFilterChanged` is always sent — omitting it on update would be
    // ! indistinguishable from false.
    const payload: TCreateEngineOilLogPayload = {
      oilType,
      odometerReading: parseFloat(odometerReading),
      intervalKmUsed: parseFloat(intervalKmUsed),
      quantityLiters: quantityLiters.trim()
        ? parseFloat(quantityLiters)
        : undefined,
      oilFilterChanged,
      cost: parseFloat(cost),
      changeDate: changeDate || format(new Date(), "yyyy-MM-dd"),
      serviceCenter: serviceCenter.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    try {
      if (log) {
        await updateMutation.mutateAsync({
          url: `/bikes/${bikeId}/engine-oil-logs/${log?._id}`,
          payload,
        });
        Toast.show({
          type: "success",
          text1: "Engine oil log updated",
          position: "top",
        });
      } else {
        await createMutation.mutateAsync({
          url: `/bikes/${bikeId}/engine-oil-logs`,
          payload,
        });
        Toast.show({
          type: "success",
          text1: "Engine oil log added",
          position: "top",
        });
      }
      onClose();
    } catch (error: any) {
      // ! follows the maintenance modal, which toasts its own failures. The axios response
      // ! interceptor also toasts API errors — §D flags this as a thing to watch on a
      // ! device (V11): if it double-toasts, drop this local one, which is the precedent
      // ! spec 45 set in `SettingsCatalog`'s delete handler.
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to save engine oil log",
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
            {log ? "Edit Oil Change" : "Add Oil Change"}
          </Text>

          {oilLoading ? (
            <SectionLoading count={1} />
          ) : oilOptions?.length === 0 ? (
            // ! H-N: catalogs are per-user and nothing is seeded, so a new user's oil-type
            // ! list is empty. Unlike the maintenance form's optional oil select, `oilType`
            // ! is REQUIRED here — so an empty catalog is a hard block and the hint points
            // ! at Settings rather than letting the rider submit.
            <Text style={styles.hint}>
              No oil types yet — add one in Settings → Engine oil types, then come
              back to log this change.
            </Text>
          ) : (
            <SelectPickerField
              label="Engine Oil"
              value={oilType}
              onChange={setOilType}
              options={oilOptions}
              disabled={isPending}
              required
            />
          )}

          <View style={styles.row}>
            <FormField
              label="Odometer (km)"
              placeholder="18400"
              value={odometerReading}
              onChangeText={setOdometerReading}
              keyboardType="decimal-pad"
              editable={!isPending}
              style={styles.rowField}
            />
            <FormField
              label="Cost (৳)"
              placeholder="1250"
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
                label="Change Date"
                value={changeDate}
                onChange={setChangeDate}
                maximumDate={new Date()}
                disabled={isPending}
                style={styles.noMarginBottom}
              />
            </View>
            {/* ! wrapped in its own rowField View so the seed hint can sit beneath it
                ! without moving the row's geometry — spec 54's layout. */}
            <View style={styles.rowField}>
              <FormField
                label="Interval km"
                placeholder="2400"
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

          <FormField
            label="Oil Quantity (L)"
            placeholder="1.0"
            value={quantityLiters}
            onChangeText={setQuantityLiters}
            keyboardType="decimal-pad"
            editable={!isPending}
          />

          <SwitchField
            label="Oil filter changed"
            value={oilFilterChanged}
            onChange={setOilFilterChanged}
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
            label="Notes"
            placeholder="Routine oil change"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            editable={!isPending}
          />

          <FormActions onSave={handleSubmit} onCancel={onClose} saving={isPending}>
            {log ? "Save Changes" : "Save Oil Change"}
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
  hint: {
    fontSize: 12.5,
    color: COLORS.textLight,
    marginBottom: 14,
  },
  noMarginBottom: {
    marginBottom: 14,
  },
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
