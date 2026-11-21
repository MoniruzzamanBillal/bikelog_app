import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  addMonths,
  format,
  isAfter,
  parse,
  startOfMonth,
  subMonths,
} from "date-fns";
import { useState } from "react";
import { Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
import { Modal, Portal, Text } from "react-native-paper";
import { COLORS, tint } from "@/utils/colors";

interface MonthStepperProps {
  targetMonth: string; // "yyyy-MM"
  onChange: (targetMonth: string) => void;
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * The web `PeriodStepper`, boxed variant: ‹ [Mon yyyy] › — the arrows step one month at a
 * time (unchanged). Spec 71: the label is now also a button that opens a month/year picker,
 * so a far-off month is one tap away instead of many. The picker enforces the same
 * "never past the current month" bound the arrows already enforce.
 */
export function MonthStepper({ targetMonth, onChange }: MonthStepperProps) {
  const current = parse(targetMonth, "yyyy-MM", new Date());
  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth(); // 0-11

  const nextDisabled = !isAfter(startOfMonth(now), startOfMonth(current));

  const [pickerOpen, setPickerOpen] = useState(false);
  // The year currently shown in the open picker — seeded from the active month each time it
  // opens, so the picker always lands on the month in view.
  const [pickerYear, setPickerYear] = useState(current.getFullYear());

  const openPicker = () => {
    setPickerYear(current.getFullYear());
    setPickerOpen(true);
  };

  const selectedYear = current.getFullYear();
  const selectedMonth = current.getMonth();
  const pickerNextYearDisabled = pickerYear >= nowYear;

  return (
    <View style={styles.row}>
      <TouchableOpacity
        onPress={() => onChange(format(subMonths(current, 1), "yyyy-MM"))}
        style={styles.button}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Previous month"
      >
        <MaterialCommunityIcons
          name="chevron-left"
          size={18}
          color={COLORS.text}
        />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={openPicker}
        style={styles.labelBox}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${format(
          current,
          "MMMM yyyy",
        )}. Tap to pick a month`}
      >
        <MaterialCommunityIcons
          name="calendar-blank-outline"
          size={15}
          color={COLORS.textLight}
        />
        <Text style={styles.label}>{format(current, "MMM yyyy")}</Text>
        <MaterialCommunityIcons
          name="chevron-down"
          size={16}
          color={COLORS.textLight}
        />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => onChange(format(addMonths(current, 1), "yyyy-MM"))}
        style={[styles.button, nextDisabled && styles.buttonDisabled]}
        disabled={nextDisabled}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Next month"
      >
        <MaterialCommunityIcons
          name="chevron-right"
          size={18}
          color={COLORS.text}
        />
      </TouchableOpacity>

      <Portal>
        <Modal
          visible={pickerOpen}
          onDismiss={() => setPickerOpen(false)}
          contentContainerStyle={styles.modal}
        >
          <Text style={styles.modalTitle}>Select month</Text>

          <View style={styles.yearRow}>
            <TouchableOpacity
              onPress={() => setPickerYear((y) => y - 1)}
              style={styles.yearButton}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Previous year"
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={20}
                color={COLORS.text}
              />
            </TouchableOpacity>

            <Text style={styles.yearLabel}>{pickerYear}</Text>

            <TouchableOpacity
              onPress={() => setPickerYear((y) => y + 1)}
              style={[
                styles.yearButton,
                pickerNextYearDisabled && styles.buttonDisabled,
              ]}
              disabled={pickerNextYearDisabled}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Next year"
            >
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={COLORS.text}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.grid}>
            {MONTH_LABELS.map((label, m) => {
              const isSelected =
                pickerYear === selectedYear && m === selectedMonth;
              // Mirror the arrows' bound: no month later than the current real month.
              const isFuture =
                pickerYear > nowYear ||
                (pickerYear === nowYear && m > nowMonth);

              return (
                <Pressable
                  key={label}
                  disabled={isFuture}
                  onPress={() => {
                    onChange(
                      `${pickerYear}-${String(m + 1).padStart(2, "0")}`,
                    );
                    setPickerOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.monthCell,
                    isSelected && styles.monthCellSelected,
                    isFuture && styles.monthCellDisabled,
                    pressed && !isFuture && !isSelected && styles.monthCellPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected, disabled: isFuture }}
                  accessibilityLabel={`${label} ${pickerYear}`}
                >
                  <Text
                    style={[
                      styles.monthCellText,
                      isSelected && styles.monthCellTextSelected,
                      isFuture && styles.monthCellTextDisabled,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  labelBox: {
    flex: 1,
    maxWidth: 240,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  label: {
    fontSize: 14,
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },
  modal: {
    marginHorizontal: 30,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  modalTitle: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.3,
    color: COLORS.textLight,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 10,
  },
  yearRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    marginBottom: 14,
  },
  yearButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  yearLabel: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
    minWidth: 72,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  monthCell: {
    // three per row, accounting for the two 8px gaps
    width: "31.5%",
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  monthCellSelected: {
    backgroundColor: tint(COLORS.primary, 0.22),
    borderColor: COLORS.primary,
  },
  monthCellPressed: {
    borderColor: COLORS.primary,
  },
  monthCellDisabled: {
    opacity: 0.35,
  },
  monthCellText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.text,
  },
  monthCellTextSelected: {
    color: COLORS.accentForeground,
    fontWeight: "600",
  },
  monthCellTextDisabled: {
    color: COLORS.textLight,
  },
});
