import { ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFetchData } from "@/hooks/useApi";
import { COLORS } from "@/utils/colors";
import { TMaintenanceType } from "@/types/catalog.types";
import { TReminder } from "@/types/maintenance-log.types";

interface RemindersBannerProps {
  bikeId: string;
  maintenanceTypes: TMaintenanceType[];
}

export function RemindersBanner({ bikeId, maintenanceTypes }: RemindersBannerProps) {
  const { data, isLoading } = useFetchData<{ reminders: TReminder[] }>(
    ["reminders", bikeId],
    `/bikes/${bikeId}/reminders`,
    { enabled: !!bikeId },
  );

  const reminders = data?.data?.reminders ?? [];

  if (isLoading || reminders.length === 0) return null;

  const getTypeName = (typeId: string) =>
    maintenanceTypes.find((t) => t._id === typeId)?.name ?? "Maintenance";

  return (
    <View style={styles.banner}>
      <Text style={styles.bannerTitle}>Reminders</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.remindersRow}
      >
        {reminders.map((reminder, i) => {
          const isOverdue = reminder.status === "overdue";
          return (
            <View
              key={`${reminder.maintenanceType}-${i}`}
              style={[
                styles.reminderCard,
                isOverdue ? styles.overdueCard : styles.upcomingCard,
              ]}
            >
              <View style={styles.reminderHeader}>
                <MaterialCommunityIcons
                  name={isOverdue ? "alert-circle" : "clock-outline"}
                  size={18}
                  color={isOverdue ? COLORS.danger : COLORS.warning}
                />
                <Text
                  style={[
                    styles.reminderType,
                    { color: isOverdue ? COLORS.danger : COLORS.warning },
                  ]}
                >
                  {getTypeName(reminder.maintenanceType)}
                </Text>
              </View>
              <Text style={styles.reminderText}>
                {reminder.kmRemaining !== undefined
                  ? isOverdue
                    ? `Overdue by ${Math.abs(reminder.kmRemaining).toLocaleString()} km`
                    : `Due in ${reminder.kmRemaining.toLocaleString()} km`
                  : reminder.daysRemaining !== undefined
                    ? isOverdue
                      ? `Overdue by ${Math.abs(reminder.daysRemaining)} days`
                      : `Due in ${reminder.daysRemaining} days`
                    : isOverdue
                      ? "Overdue"
                      : "Upcoming"}
              </Text>
              {reminder.kmRemaining !== undefined &&
                reminder.daysRemaining !== undefined && (
                  <Text style={styles.reminderSubtext}>
                    {isOverdue
                      ? `${Math.abs(reminder.daysRemaining)} days overdue`
                      : `${reminder.daysRemaining} days remaining`}
                  </Text>
                )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginBottom: 4,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  remindersRow: {
    gap: 10,
    paddingBottom: 4,
  },
  reminderCard: {
    borderRadius: 6,
    padding: 12,
    minWidth: 180,
    maxWidth: 220,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  overdueCard: {
    backgroundColor: "#FEE2E2",
    borderLeftWidth: 3,
    borderLeftColor: COLORS.danger,
  },
  upcomingCard: {
    backgroundColor: "#FEF3C7",
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  reminderHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  reminderType: {
    fontSize: 14,
    fontWeight: "600",
  },
  reminderText: {
    fontSize: 13,
    color: COLORS.text,
  },
  reminderSubtext: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
});
