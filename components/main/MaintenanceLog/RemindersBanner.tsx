import { Panel } from "@/components/main/shared/Panel";
import { toneStyle } from "@/components/main/shared/StatusBadge";
import { useFetchData } from "@/hooks/useApi";
import { TBike } from "@/types/bike.types";
import { TMaintenanceType } from "@/types/catalog.types";
import { TReminder } from "@/types/maintenance-log.types";
import { COLORS, tint } from "@/utils/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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

  const getTypeName = (typeId: string) =>
    maintenanceTypes?.find((t) => t?._id === typeId)?.name ?? "Maintenance";

  const sorted = [...reminders].sort((a, b) =>
    a?.status === b?.status ? 0 : a?.status === "overdue" ? -1 : 1,
  );

  return (
    <View style={[styles.stack, style]}>
      {sorted.map((reminder, i) => {
        const isOverdue = reminder?.status === "overdue";
        const tone = isOverdue ? COLORS.danger : COLORS.warning;
        const pill = toneStyle(isOverdue ? "danger" : "warning");

        return (
          <Panel
            key={`${reminder.maintenanceType}-${i}`}
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
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pillText: {
    fontSize: 11,
  },
});
