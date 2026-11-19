import {
  DatePickerField,
  FormActions,
  FormField,
  SelectPickerField,
  SwitchField,
} from "@/components/main/shared";
import { usePatch, usePost } from "@/hooks/useApi";
import { TServiceSeed } from "@/hooks/useServiceLogSeed";
import {
  TCreateServiceLogPayload,
  TServiceLog,
} from "@/types/service-log.types";
import { COLORS } from "@/utils/colors";
import { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Modal, Portal, Text } from "react-native-paper";
import Toast from "react-native-toast-message";
import {
  ItemsEditor,
  RecommendationsEditor,
  TItemRow,
  TRecommendationRow,
} from "./ServiceSubEditors";

// ! copied, not imported across folders — every modal in this app declares its own (§D).
const DECIMAL_REGEX = /^\d+(\.\d{0,2})?$/;

const KIND_OPTIONS = [
  { label: "Regular", value: "regular" },
  { label: "Warranty", value: "warranty" },
];
const CENTER_OPTIONS = [
  { label: "Official centre", value: "official" },
  { label: "Local centre", value: "local" },
];

// ! server date-only fields serialize as UTC-midnight ISO instants; the form edits them as
// ! "yyyy-MM-dd", so strip the time portion on prefill (same as the oil modal's changeDate).
const toDateInput = (s?: string | null): string => (s ? s.split("T")[0] : "");

interface ServiceLogFormModalProps {
  open: boolean;
  onClose: () => void;
  bikeId: string;
  log?: TServiceLog;
  /** D10 "Same as last visit" prefill. Create only — ignored when `log` is set. */
  seed?: TServiceSeed;
  /** The bike's `currentOdometer` — the floor of the server's accepted range. */
  seedOdometer?: number;
  /** Opens an upcoming row straight into complete-mode (the card's "Mark completed"). */
  startCompleted?: boolean;
}

export function ServiceLogFormModal({
  open,
  onClose,
  bikeId,
  log,
  seed,
  seedOdometer,
  startCompleted,
}: ServiceLogFormModalProps) {
  const [serviceKind, setServiceKind] = useState<"warranty" | "regular">(
    "regular",
  );
  const [warrantyNumber, setWarrantyNumber] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [completed, setCompleted] = useState(false);
  const [serviceDate, setServiceDate] = useState("");
  const [odometer, setOdometer] = useState("");
  const [serviceCenter, setServiceCenter] = useState("");
  const [centerType, setCenterType] = useState<string | null>(null);
  const [items, setItems] = useState<TItemRow[]>([]);
  const [recommendations, setRecommendations] = useState<TRecommendationRow[]>(
    [],
  );
  const [notes, setNotes] = useState("");
  // ! §F: the centre's estimate of the NEXT visit, entered while completing this one.
  const [nextServiceDue, setNextServiceDue] = useState("");

  const invalidate = [
    ["serviceLogs", bikeId],
    ["serviceStatus", bikeId],
    ["bikes", bikeId], // bumpOdometerIfHigher on a completed service (H-N)
    ["spending", bikeId],
    ["reminders", bikeId],
  ];
  const createMutation = usePost(invalidate);
  const updateMutation = usePatch(invalidate);
  const isPending = createMutation?.isPending || updateMutation?.isPending;

  useEffect(() => {
    if (!open) return;

    if (log) {
      setServiceKind(log?.serviceKind ?? "regular");
      setWarrantyNumber(log?.warrantyNumber != null ? String(log.warrantyNumber) : "");
      setShowAdvanced(log?.warrantyNumber != null);
      setDueDate(toDateInput(log?.dueDate));
      // ! H-D: "completed" is derived from serviceDate presence, both on read and write —
      // ! `startCompleted` forces it on so the card's "Mark completed" lands in complete-mode.
      setCompleted(!!log?.serviceDate || !!startCompleted);
      setServiceDate(toDateInput(log?.serviceDate));
      setOdometer(log?.odometerReading != null ? String(log.odometerReading) : "");
      setServiceCenter(log?.serviceCenter || "");
      setCenterType(log?.centerType ?? null);
      setItems(
        (log?.items ?? []).map((i) => ({
          id: i?.id,
          name: i?.name ?? "",
          cost: i?.cost != null ? String(i.cost) : "",
        })),
      );
      setRecommendations(
        (log?.recommendations ?? []).map((r) => ({
          id: r?.id,
          text: r?.text ?? "",
          targetDate: toDateInput(r?.targetDate),
          done: r?.done ?? false,
        })),
      );
      setNotes(log?.notes || "");
      setNextServiceDue("");
    } else {
      // create — carry only what repeats from the seed (H-J); never dates/odometer/items.
      setServiceKind(seed?.serviceKind ?? "regular");
      setWarrantyNumber("");
      setShowAdvanced(false);
      setDueDate("");
      setCompleted(false);
      setServiceDate("");
      setOdometer(seedOdometer != null ? String(seedOdometer) : "");
      setServiceCenter(seed?.serviceCenter || "");
      setCenterType(seed?.centerType ?? null);
      setItems([]);
      setRecommendations([]);
      setNotes("");
      setNextServiceDue("");
    }
  }, [log, open, seed, seedOdometer, startCompleted]);

  const buildPayload = (): TCreateServiceLogPayload => {
    const itemsPayload = items
      .filter((r) => r.name.trim())
      .map((r) => ({
        ...(r.id ? { id: r.id } : {}),
        name: r.name.trim(),
        cost: r.cost.trim() ? parseFloat(r.cost) : undefined,
      }));
    const recsPayload = recommendations
      .filter((r) => r.text.trim())
      .map((r) => ({
        ...(r.id ? { id: r.id } : {}),
        text: r.text.trim(),
        targetDate: r.targetDate ? r.targetDate : undefined,
        done: r.done,
      }));

    return {
      serviceKind,
      // ! H-L / D6: warrantyNumber only when kind is warranty and the rider typed one.
      ...(serviceKind === "warranty" && warrantyNumber.trim()
        ? { warrantyNumber: parseInt(warrantyNumber, 10) }
        : {}),
      ...(dueDate ? { dueDate } : {}),
      ...(completed && serviceDate ? { serviceDate } : {}),
      ...(completed && odometer.trim()
        ? { odometerReading: parseFloat(odometer) }
        : {}),
      ...(serviceCenter.trim() ? { serviceCenter: serviceCenter.trim() } : {}),
      ...(centerType ? { centerType: centerType as "official" | "local" } : {}),
      items: itemsPayload,
      recommendations: recsPayload, // full array, always (H-E)
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
  };

  const validate = (): boolean => {
    const toast = (text1: string) => {
      Toast.show({ type: "error", text1, position: "top" });
      return false;
    };

    if (!dueDate && !(completed && serviceDate))
      return toast("Enter a due date or a service date");
    if (completed && !serviceDate) return toast("Enter the service date");
    if (completed) {
      if (!odometer.trim() || !DECIMAL_REGEX.test(odometer.trim()))
        return toast("Enter a valid odometer reading");
      if (parseFloat(odometer) > 999999)
        return toast("Odometer reading can't exceed 999,999 km");
    }
    if (serviceKind === "warranty" && warrantyNumber.trim()) {
      const n = parseInt(warrantyNumber, 10);
      if (!Number.isInteger(n) || n < 1 || n > 5)
        return toast("Warranty number must be 1–5");
    }
    for (const r of items) {
      // a fully-empty row is dropped in buildPayload; a row carrying a cost but no name is a
      // real line item missing its label, so block it.
      if (!r.name.trim() && r.cost.trim())
        return toast("Every item needs a name");
      if (r.cost.trim()) {
        const c = parseFloat(r.cost);
        if (!DECIMAL_REGEX.test(r.cost.trim()) || c < 0 || c > 1000000)
          return toast("Enter a valid item cost");
      }
    }
    for (const r of recommendations) {
      if (!r.text.trim()) return toast("Every recommendation needs text");
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const payload = buildPayload();

    try {
      let savedKind: "warranty" | "regular" = serviceKind;
      let savedWarrantyNo: number | null = null;

      if (log) {
        const res = await updateMutation.mutateAsync({
          url: `/bikes/${bikeId}/service-logs/${log?._id}`,
          payload,
        });
        savedKind = res?.data?.serviceKind ?? serviceKind;
        savedWarrantyNo = res?.data?.warrantyNumber ?? null;
        Toast.show({
          type: "success",
          text1: "Service updated",
          position: "top",
        });
      } else {
        const res = await createMutation.mutateAsync({
          url: `/bikes/${bikeId}/service-logs`,
          payload,
        });
        savedKind = res?.data?.serviceKind ?? serviceKind;
        savedWarrantyNo = res?.data?.warrantyNumber ?? null;
        Toast.show({
          type: "success",
          text1: completed ? "Service saved" : "Service scheduled",
          position: "top",
        });
      }

      // ! §F — schedule the next service. Convenience, non-fatal: a failure here leaves the
      // ! completed service saved and the rider adds the next one manually (never roll back).
      if (completed && nextServiceDue) {
        const nextKind: "warranty" | "regular" =
          savedKind === "warranty" &&
          savedWarrantyNo != null &&
          savedWarrantyNo < 5
            ? "warranty"
            : "regular";
        try {
          await createMutation.mutateAsync({
            url: `/bikes/${bikeId}/service-logs`,
            payload: {
              serviceKind: nextKind,
              dueDate: nextServiceDue,
              ...(serviceCenter.trim()
                ? { serviceCenter: serviceCenter.trim() }
                : {}),
              ...(centerType
                ? { centerType: centerType as "official" | "local" }
                : {}),
            } as TCreateServiceLogPayload,
          });
        } catch {
          Toast.show({
            type: "error",
            text1: "Service saved, but couldn't schedule the next one",
            position: "top",
          });
        }
      }

      onClose();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to save service",
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
            {log ? "Edit service" : completed ? "Log service" : "Service"}
          </Text>

          <SelectPickerField
            label="Service kind"
            value={serviceKind}
            onChange={(v) => setServiceKind(v as "warranty" | "regular")}
            options={KIND_OPTIONS}
            disabled={isPending}
          />

          {serviceKind === "warranty" &&
            (showAdvanced ? (
              <FormField
                label="Warranty # (1–5)"
                placeholder="auto"
                value={warrantyNumber}
                onChangeText={setWarrantyNumber}
                keyboardType="number-pad"
                editable={!isPending}
              />
            ) : (
              <TouchableOpacity
                onPress={() => setShowAdvanced(true)}
                disabled={isPending}
              >
                <Text style={styles.advancedLink}>
                  Set warranty # manually (auto-assigned otherwise)
                </Text>
              </TouchableOpacity>
            ))}

          <DatePickerField
            label="Due date"
            value={dueDate}
            onChange={setDueDate}
            disabled={isPending}
          />

          <SwitchField
            label="Mark as completed"
            description="Turn on once the service has actually happened"
            value={completed}
            onChange={setCompleted}
            disabled={isPending}
          />

          {completed && (
            <>
              <View style={styles.row}>
                <View style={styles.rowField}>
                  <DatePickerField
                    label="Service date"
                    value={serviceDate}
                    onChange={setServiceDate}
                    maximumDate={new Date()}
                    disabled={isPending}
                    style={styles.noMargin}
                  />
                </View>
                <View style={styles.rowField}>
                  <FormField
                    label="Odometer (km)"
                    placeholder="14200"
                    value={odometer}
                    onChangeText={setOdometer}
                    keyboardType="decimal-pad"
                    editable={!isPending}
                    style={styles.noMargin}
                  />
                </View>
              </View>
            </>
          )}

          <FormField
            label="Service centre"
            placeholder="Honda official centre"
            value={serviceCenter}
            onChangeText={setServiceCenter}
            editable={!isPending}
          />

          <SelectPickerField
            label="Centre type"
            value={centerType}
            onChange={setCenterType}
            options={CENTER_OPTIONS}
            disabled={isPending}
          />

          {completed && (
            <ItemsEditor items={items} onChange={setItems} disabled={isPending} />
          )}

          <RecommendationsEditor
            recommendations={recommendations}
            onChange={setRecommendations}
            disabled={isPending}
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

          {/* ! §F: only in complete-mode — scheduling the next visit while closing this one. */}
          {completed && (
            <DatePickerField
              label="Next service due (optional)"
              value={nextServiceDue}
              onChange={setNextServiceDue}
              disabled={isPending}
            />
          )}

          <FormActions
            onSave={handleSubmit}
            onCancel={onClose}
            saving={isPending}
            cancelDanger
          >
            {log ? "Save changes" : completed ? "Save service" : "Schedule service"}
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
    marginHorizontal: 18,
    padding: 18,
    borderRadius: 14,
    maxHeight: "85%",
  },
  title: {
    fontSize: 20,
    fontWeight: "500",
    color: COLORS.text,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  rowField: {
    flex: 1,
  },
  noMargin: {
    marginBottom: 0,
  },
  advancedLink: {
    fontSize: 12,
    color: COLORS.accentForeground,
    marginBottom: 12,
  },
});
