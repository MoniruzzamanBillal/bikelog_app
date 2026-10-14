import { DatePickerField, FormActions, FormField, SwitchField } from "@/components/main/shared";
import { usePatch, usePost } from "@/hooks/useApi";
import { TFuelLogSeed } from "@/hooks/useFuelLogSeed";
import { TCreateFuelLogPayload, TFuelLog } from "@/types/fuel-log.types";
import { COLORS, tint } from "@/utils/colors";
import { setLastUsedBike } from "@/utils/lastUsedBike";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Modal, Portal, Text } from "react-native-paper";
import Toast from "react-native-toast-message";

const DECIMAL_REGEX = /^\d+(\.\d{0,2})?$/;

/** Which pre-filled fields are still untouched, so §G can mark them. */
type TSeededFields = {
  odometer: boolean;
  price: boolean;
  station: boolean;
  fullTank: boolean;
};

const NO_SEEDED_FIELDS: TSeededFields = {
  odometer: false,
  price: false,
  station: false,
  fullTank: false,
};

/** Money is always 2dp; liters is capped at 2dp by `DECIMAL_REGEX`. */
const formatMoney = (value: number) => value.toFixed(2);
const round2 = (value: number) => parseFloat(value.toFixed(2));

/** ["price", "station", "tank setting"] -> "Price, station and tank setting" */
const toSentence = (items: string[]) => {
  const joined =
    items?.length > 1
      ? `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`
      : items[0];
  return joined.charAt(0).toUpperCase() + joined.slice(1);
};

interface FuelLogFormModalProps {
  open: boolean;
  onClose: () => void;
  bikeId: string;
  initialFuelLog?: TFuelLog;
  seedFromLastLog?: TFuelLogSeed;
  /** The bike's `currentOdometer` — the floor of the server's accepted range. */
  seedOdometer?: number;
}

export function FuelLogFormModal({
  open,
  onClose,
  bikeId,
  initialFuelLog,
  seedFromLastLog,
  seedOdometer,
}: FuelLogFormModalProps) {
  const [odometer, setOdometer] = useState("");
  const [liters, setLiters] = useState("");
  const [total, setTotal] = useState("");
  const [isFullTank, setIsFullTank] = useState(false);
  const [pricePerLiter, setPricePerLiter] = useState("");
  const [station, setStation] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [seeded, setSeeded] = useState<TSeededFields>(NO_SEEDED_FIELDS);

  const createMutation = usePost([
    ["fuelLogs"],
    [bikeId],
    ["mileage"],
    ["history"],
    ["lifetime"],
  ]);

  const updateMutation = usePatch([
    ["fuelLogs"],
    [bikeId],
    ["mileage"],
    ["history"],
    ["lifetime"],
  ]);

  const isPending = createMutation?.isPending || updateMutation?.isPending;

  useEffect(() => {
    if (!open) return;

    // ! The edit path must never seed (spec 52 H-E) — this branch wins, and
    // ! every seed prop is read only inside the `else`.
    if (initialFuelLog) {
      setOdometer(initialFuelLog?.odometerReading?.toString());
      setLiters(initialFuelLog?.litersAdded?.toString());
      setIsFullTank(initialFuelLog?.isFullTank || false);
      setPricePerLiter(initialFuelLog?.pricePerLiter?.toString());
      setStation(initialFuelLog?.fuelStation || "");
      setDate(initialFuelLog?.date?.split("T")[0]);
      setNotes(initialFuelLog?.notes || "");
      const editTotal =
        initialFuelLog?.litersAdded * initialFuelLog?.pricePerLiter;
      setTotal(Number.isFinite(editTotal) ? formatMoney(editTotal) : "");
      setSeeded(NO_SEEDED_FIELDS);
    } else {
      const seededOdometer = seedOdometer?.toString() ?? "";
      setOdometer(seededOdometer);
      setLiters("");
      setTotal("");
      setIsFullTank(seedFromLastLog?.isFullTank ?? false);
      setPricePerLiter(seedFromLastLog?.pricePerLiter?.toString() ?? "");
      setStation(seedFromLastLog?.fuelStation ?? "");
      setDate(format(new Date(), "yyyy-MM-dd"));
      setNotes("");
      setSeeded({
        odometer: !!seededOdometer,
        price: seedFromLastLog?.pricePerLiter !== undefined,
        station: !!seedFromLastLog?.fuelStation,
        fullTank: seedFromLastLog?.isFullTank === true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFuelLog, open]);

  /** A field you've edited is no longer a suggestion, so drop its marker. */
  const clearSeeded = (field: keyof TSeededFields) =>
    setSeeded((prev) => (prev?.[field] ? { ...prev, [field]: false } : prev));

  const parsedLiters = parseFloat(liters);
  const parsedPrice = parseFloat(pricePerLiter);
  const computedTotal =
    Number.isFinite(parsedLiters) && Number.isFinite(parsedPrice)
      ? parsedLiters * parsedPrice
      : null;

  const handleOdometerChange = (value: string) => {
    setOdometer(value);
    clearSeeded("odometer");
  };

  const handleLitersChange = (value: string) => {
    setLiters(value);
    const nextLiters = parseFloat(value);
    if (Number.isFinite(nextLiters) && Number.isFinite(parsedPrice)) {
      setTotal(formatMoney(nextLiters * parsedPrice));
    } else if (!value.trim()) {
      setTotal("");
    }
  };

  // ! Price/L is the anchor and is never derived (spec 52 §F): a price computed
  // ! from two 2dp-rounded inputs lands on values like 124.6883, which would
  // ! then be stored *and* become the next fill-up's seed. Liters is the
  // ! measured quantity, so changing the price keeps it and recomputes total.
  const handlePriceChange = (value: string) => {
    setPricePerLiter(value);
    clearSeeded("price");
    const nextPrice = parseFloat(value);
    if (Number.isFinite(parsedLiters) && Number.isFinite(nextPrice)) {
      setTotal(formatMoney(parsedLiters * nextPrice));
    }
  };

  /**
   * Total is the number you actually know at the pump, so liters derives from
   * it — and derives *before* validation runs, or `handleSubmit` would reject a
   * form that looks complete.
   */
  const handleTotalChange = (value: string) => {
    setTotal(value);
    const nextTotal = parseFloat(value);
    if (
      Number.isFinite(nextTotal) &&
      Number.isFinite(parsedPrice) &&
      parsedPrice > 0
    ) {
      setLiters(round2(nextTotal / parsedPrice).toString());
    } else if (!value.trim()) {
      setLiters("");
    }
  };

  // ! H-G: `totalCost` is server-derived from the 2dp liters, so ৳500 at
  // ! ৳124.70/L really stores ৳500.05. Snap the field to the figure that will
  // ! actually be stored once you've finished typing — rewriting it on every
  // ! keystroke would fight the keyboard.
  const handleTotalBlur = () => {
    if (computedTotal !== null) setTotal(formatMoney(computedTotal));
  };

  const handleStationChange = (value: string) => {
    setStation(value);
    clearSeeded("station");
  };

  const handleFullTankChange = (value: boolean) => {
    setIsFullTank(value);
    clearSeeded("fullTank");
  };

  const carriedOver = [
    seeded?.price ? "price" : null,
    seeded?.station ? "station" : null,
    seeded?.fullTank ? "tank setting" : null,
  ].filter((item): item is string => !!item);

  const showSeedHint =
    !initialFuelLog && (seeded?.odometer || carriedOver?.length > 0);

  // The typed total and the stored total can differ by a few poisha (H-G) —
  // show the real figure rather than echoing back what was typed.
  const storedTotal = computedTotal !== null ? formatMoney(computedTotal) : null;
  const totalNote =
    storedTotal && total.trim() && formatMoney(parseFloat(total)) !== storedTotal
      ? `Stores ৳${storedTotal} — liters round to 2 decimals`
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
          url: `/bikes/${bikeId}/fuel-logs/${initialFuelLog?._id}`,
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
        setLastUsedBike(bikeId);
        Toast.show({
          type: "success",
          text1: "Fuel log added",
          position: "top",
        });
        if (result?.data?.mileageRecordClosed) {
          Toast.show({
            type: "success",
            text1: `Mileage: ${result?.data?.mileageRecordClosed?.mileageKmPerLiter?.toFixed(2)} km/l for this tank`,
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

          {/* ! §G — a prefilled value you didn't notice is a wrong value you
              ! didn't notice (H-F). Each line disappears once you edit the
              ! fields it describes. */}
          {showSeedHint && (
            <View style={styles.seedHint}>
              {seeded?.odometer && (
                <Text style={styles.seedHintText}>
                  Odometer starts at this bike’s current reading — change it if
                  you’re backdating.
                </Text>
              )}
              {carriedOver?.length > 0 && (
                <Text style={styles.seedHintText}>
                  {toSentence(carriedOver)} carried over from your last fill-up
                  — check before saving.
                </Text>
              )}
            </View>
          )}

          <View style={styles.row}>
            <FormField
              label="Odometer (km)"
              placeholder="1550"
              value={odometer}
              onChangeText={handleOdometerChange}
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
              onChangeText={handleLitersChange}
              keyboardType="decimal-pad"
              editable={!isPending}
              style={styles.rowField}
            />
            <FormField
              label="Price/L (৳)"
              placeholder="125.5"
              value={pricePerLiter}
              onChangeText={handlePriceChange}
              keyboardType="decimal-pad"
              editable={!isPending}
              style={styles.rowField}
            />
          </View>

          <FormField
            label="Total paid (৳)"
            placeholder="500"
            value={total}
            onChangeText={handleTotalChange}
            onBlur={handleTotalBlur}
            keyboardType="decimal-pad"
            editable={!isPending}
            style={totalNote ? styles.totalFieldTight : undefined}
          />
          {totalNote && <Text style={styles.totalNote}>{totalNote}</Text>}

          <FormField
            label="Fuel Station"
            placeholder="Padma Filling Station"
            value={station}
            onChangeText={handleStationChange}
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
            description={
              seeded?.fullTank
                ? "Carried over from your last fill-up · triggers mileage calculation"
                : "Triggers mileage calculation"
            }
            value={isFullTank}
            onChange={handleFullTankChange}
            disabled={isPending}
          />

          <FormActions onSave={handleSubmit} onCancel={onClose} saving={isPending}>
            {initialFuelLog ? "Save Changes" : "Save Fill-up"}
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
  noMarginBottom: {
    marginBottom: 14,
  },
  seedHint: {
    backgroundColor: tint(COLORS.accent, 0.1),
    borderWidth: 1,
    borderColor: tint(COLORS.accent, 0.28),
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 11,
    marginBottom: 16,
    gap: 4,
  },
  seedHintText: {
    fontSize: 11.5,
    lineHeight: 16,
    color: COLORS.accentForeground,
  },
  totalFieldTight: {
    marginBottom: 4,
  },
  totalNote: {
    fontSize: 11,
    color: COLORS.textLight,
    marginBottom: 14,
    fontVariant: ["tabular-nums"],
  },
});
