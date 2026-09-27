import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text } from "react-native-paper";
import { useFetchData } from "@/hooks/useApi";
import { COLORS, tint } from "@/utils/colors";
import { TMaintenanceType } from "@/types/catalog.types";
import { TReminder } from "@/types/maintenance-log.types";

interface RemindersBannerProps {
  bikeId: string;
  maintenanceTypes: TMaintenanceType[];
  style?: object;
}

function summarizeReminder(reminder: TReminder, typeName: string): string {
  const isOverdue = reminder?.status === "overdue";
  if (reminder?.kmRemaining !== undefined) {
    return isOverdue
      ? `${typeName} ${Math.abs(reminder?.kmRemaining)?.toLocaleString()} km overdue`
      : `${typeName} in ${reminder?.kmRemaining?.toLocaleString()} km`;
  }
  if (reminder?.daysRemaining !== undefined) {
    return isOverdue
      ? `${typeName} ${Math.abs(reminder?.daysRemaining)} days overdue`
      : `${typeName} in ${reminder?.daysRemaining} days`;
  }
  return `${typeName} due`;
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

  const reminders = data?.data?.reminders ?? [];

  if (isLoading || reminders.length === 0) return null;

  const getTypeName = (typeId: string) =>
    maintenanceTypes?.find((t) => t._id === typeId)?.name ?? "Maintenance";

  const sorted = [...reminders].sort((a, b) =>
    a?.status === b?.status ? 0 : a.status === "overdue" ? -1 : 1,
  );
  const summary = sorted
    .slice(0, 2)
    .map((r) => summarizeReminder(r, getTypeName(r?.maintenanceType)))
    .join(" · ");

  return (
    <View style={[styles.reminder, style]}>
      <MaterialCommunityIcons
        name="alert-outline"
        size={16}
        color={COLORS.warning}
      />
      <Text style={styles.text}>
        <Text style={styles.bold}>
          {reminders.length} reminder{reminders.length === 1 ? "" : "s"} due
        </Text>
        {" — "}
        {summary}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  reminder: {
    backgroundColor: tint(COLORS.warning, 0.08),
    borderWidth: 1,
    borderColor: tint(COLORS.warning, 0.4),
    borderRadius: 10,
    padding: 10,
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  text: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.warning,
  },
  bold: {
    fontWeight: "700",
  },
});
