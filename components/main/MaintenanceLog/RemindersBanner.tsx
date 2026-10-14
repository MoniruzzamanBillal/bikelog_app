import { Panel } from "@/components/main/shared/Panel";
import { toneStyle } from "@/components/main/shared/StatusBadge";
import { useFetchData } from "@/hooks/useApi";
import { TBike } from "@/types/bike.types";
import { TMaintenanceType } from "@/types/catalog.types";
import { TReminder } from "@/types/maintenance-log.types";
import { COLORS, tint } from "@/utils/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { format } from "date-fns";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Text } from "react-native-paper";

interface RemindersBannerProps {
  bikeId: string;
  maintenanceTypes: TMaintenanceType[];
  style?: StyleProp<ViewStyle>;
}

/**
 * The reminder's distance/days line. Mirrors the web's `getDistanceLine`:
 * ! the server clamps `kmRemaining` to 0 once overdue, so the real overshoot is
 * ! derived from the bike's own odometer instead.
 */
function getDistanceLine(r: TReminder, currentOdometer?: number): string {
  const isOverdue = r?.status === "overdue";

  if (r?.nextDueOdometer != null) {
    const km =
      isOverdue && currentOdometer != null
        ? currentOdometer - r?.nextDueOdometer
        : (r?.kmRemaining ?? 0);
    return isOverdue
      ? `${Math.abs(km).toLocaleString()} km past due`
      : `${km.toLocaleString()} km left`;
  }

  if (r?.daysRemaining != null) {
    const days = Math.abs(r?.daysRemaining);
    return isOverdue ? `${days} days past due` : `${days} days left`;
  }

  return isOverdue ? "Overdue" : "Upcoming";
}

/**
 * ! H-A: a server predating spec 52 omits these fields, and a malformed string must never
 * ! reach `format` and render "Invalid Date". One guard, shared by both branches below.
 */
function toDate(value?: string | null): Date | null {
  if (value == null) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * The due date of whichever clock comes first, or null when there is nothing honest to say.
 * ! Server spec 52 sends the projection only for `upcoming` distance-based reminders, and
 * ! only when the bike has enough fuel history. Absent is the normal case, not an error — H-A.
 * ! D6: a type can be due by odometer AND by date; the earlier one is printed. The calendar
 * ! date is a stored fact and is NOT hedged — the projected one is an estimate and is.
 */
function getProjectionLine(r: TReminder): string | null {
  if (r?.status === "overdue") return null; // H-C

  // ! D6: date-only reminders already say "18 days left" on line 2 — repeating it here adds
  // ! nothing. This line exists to surface the clock the distance line hides.
  if (r?.nextDueOdometer == null) return null;

  const projected = toDate(r?.projectedDueDate);
  const calendar = toDate(r?.nextDueDate);

  // ! D6: `<=` so an exact tie resolves to the calendar date — a fact beats an estimate.
  if (calendar && (!projected || calendar.getTime() <= projected.getTime())) {
    const days = r?.daysRemaining;
    if (days != null) {
      if (days <= 0) return "due today"; // defensive: the server calls this overdue
      if (days === 1) return "due tomorrow";
      if (days < 7) return `due in ${days} days`; // D3, unhedged per D6
    }
    return `due ${format(calendar, "d MMM")}`;
  }

  if (!projected || r?.projectedDaysRemaining == null) return null; // H-A: `!= null`

  const days = r?.projectedDaysRemaining;

  // ! H-F: the hedge is load-bearing. The server floors the day count because
  // ! currentOdometer lags reality, so this is an early estimate, not a date.
  if (days <= 0) return "due any day now";
  if (days === 1) return "around tomorrow";
  if (days < 7) return `in about ${days} days`; // D3
  return `around ${format(projected, "d MMM")}`;
}

export function RemindersBanner({
  bikeId,
  maintenanceTypes,
  style,
}: RemindersBannerProps) {
  const { data, isLoading } = useFetchData<{ reminders: TReminder[] }>(
    ["reminders", bikeId],
    `/bikes/${bikeId}/reminders`,
    { enabled: !!bikeId },
  );

  // Read-only reuse of the hub's own bike entry — needed for the real overshoot.
  const { data: bikeData } = useFetchData<TBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
    { enabled: !!bikeId },
  );

  const reminders = data?.data?.reminders ?? [];

  if (isLoading || reminders?.length === 0) return null;

  const currentOdometer = bikeData?.data?.currentOdometer;

  // ! Accepts either shape: backend spec 41 §C now populates `{ _id, name }`, but a
  // ! deployment predating it still sends a bare id, so the catalog lookup stays as the
  // ! fallback. Same pattern as MaintenanceLogCard's own getTypeName. See spec 45a.
  const getTypeName = (type: TReminder["maintenanceType"]) => {
    if (typeof type === "object" && type?.name) return type?.name;
    const typeId = typeof type === "string" ? type : undefined;
    return maintenanceTypes?.find((t) => t?._id === typeId)?.name ?? "Maintenance";
  };

  // ! Never template-stringify the field directly for the key — once populated it renders
  // ! as "[object Object]" for every row.
  const getTypeKey = (type: TReminder["maintenanceType"]) =>
    typeof type === "object" ? type?._id : type;

  const sorted = [...reminders].sort((a, b) =>
    a?.status === b?.status ? 0 : a?.status === "overdue" ? -1 : 1,
  );

  return (
    <View style={[styles.stack, style]}>
      {sorted.map((reminder, i) => {
        const isOverdue = reminder?.status === "overdue";
        const tone = isOverdue ? COLORS.danger : COLORS.warning;
        const pill = toneStyle(isOverdue ? "danger" : "warning");
        const projection = getProjectionLine(reminder);

        return (
          <Panel
            key={`${getTypeKey(reminder?.maintenanceType)}-${i}`}
            style={[styles.row, { borderColor: tint(tone, 0.4) }]}
          >
            <MaterialCommunityIcons
              name={isOverdue ? "alert-outline" : "clock-outline"}
              size={18}
              color={tone}
            />
            <View style={styles.textCol}>
              <Text style={styles.name} numberOfLines={1}>
                {getTypeName(reminder?.maintenanceType)}
              </Text>
              <Text style={styles.line} numberOfLines={1}>
                {getDistanceLine(reminder, currentOdometer)}
              </Text>
              {/* ! H-B: its own line, not appended — a combined line ellipsises the date away
                  ! on a narrow phone, losing the only part the rider acts on. */}
              {!!projection && (
                <Text style={styles.projection} numberOfLines={1}>
                  {projection}
                </Text>
              )}
            </View>
            <View style={[styles.pill, { backgroundColor: pill.bg }]}>
              <Text style={[styles.pillText, { color: pill.text }]}>
                {isOverdue ? "Overdue" : "Upcoming"}
              </Text>
            </View>
          </Panel>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 13.5,
    fontWeight: "500",
    color: COLORS.text,
  },
  line: {
    fontSize: 12,
    color: COLORS.textLight,
    fontVariant: ["tabular-nums"],
  },
  projection: {
    fontSize: 11.5,
    color: tint(COLORS.textLight, 0.85),
    fontVariant: ["tabular-nums"],
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pillText: {
    fontSize: 11,
  },
});
