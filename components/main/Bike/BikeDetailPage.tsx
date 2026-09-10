import { EmptyState, ErrorState, ScreenHeader, SectionLoading } from "@/components/main/shared";
import { confirmDelete } from "@/components/main/shared/ConfirmDelete";
import { RemindersBanner } from "@/components/main/MaintenanceLog/RemindersBanner";
import { useDelete, useFetchData } from "@/hooks/useApi";
import { TMaintenanceType } from "@/types/catalog.types";
import { TBike } from "@/types/bike.types";
import { COLORS } from "@/utils/colors";
import { formatApiDate } from "@/utils/formatApiDate";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Text } from "react-native-paper";
import { BikeFormModal } from "./BikeFormModal";

type TTile = {
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  segment: string;
};

const TILES: TTile[] = [
  { label: "Fuel Logs", icon: "gas-station", segment: "fuel-logs" },
  { label: "Mileage", icon: "speedometer-medium", segment: "mileage" },
  { label: "Maintenance", icon: "wrench-outline", segment: "maintenance-logs" },
  { label: "Spending", icon: "cash-multiple", segment: "spending" },
  { label: "Issues", icon: "alert-circle-outline", segment: "issues" },
  { label: "Accessories", icon: "shopping-outline", segment: "accessories" },
  { label: "AI Assistant", icon: "robot-outline", segment: "assistant" },
  { label: "Documents", icon: "file-document-outline", segment: "documents" },
];

export function BikeDetailPage() {
  const { bikeId } = useLocalSearchParams<{ bikeId: string }>();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useFetchData<TBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
    { enabled: !!bikeId },
  );
  const bike = data?.data;

  const { data: maintenanceTypesData } = useFetchData<TMaintenanceType[]>(
    ["maintenance-types"],
    "/maintenance-types",
  );
  const maintenanceTypes = maintenanceTypesData?.data ?? [];

  const deleteMutation = useDelete([["bikes"]]);

  const handleDelete = () => {
    confirmDelete("bike", async () => {
      await deleteMutation.mutateAsync({ url: `/bikes/${bikeId}` });
      router.replace("/");
    });
  };

  if (isLoading) {
    return <SectionLoading count={1} />;
  }

  if (isError) {
    return <ErrorState onRetry={refetch} />;
  }

  if (!bike) {
    return <EmptyState label="Bike not found." />;
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={bike.nickname}
        backLabel="Garage"
        rightIcon="pencil-outline"
        onRightPress={() => setEditOpen(true)}
      />

      <KeyboardAwareScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsStrip}>
          <View>
            <Text style={styles.statTiny}>
              {bike.brand} {bike.model}
            </Text>
            <Text style={styles.statMono}>{bike.registrationNumber}</Text>
          </View>
          <View style={styles.statCenter}>
            <Text style={styles.statTiny}>Odometer</Text>
            <Text style={styles.statOdo}>
              {bike.currentOdometer.toLocaleString()} km
            </Text>
          </View>
          <View style={styles.statRight}>
            <Text style={styles.statTiny}>Purchased</Text>
            <Text style={styles.statDate}>
              {formatApiDate(bike.purchaseDate, "dd MMM yyyy")}
            </Text>
          </View>
        </View>

        <RemindersBanner
          bikeId={bikeId}
          maintenanceTypes={maintenanceTypes}
          style={styles.reminder}
        />

        <View style={styles.tileGrid}>
          {TILES.map((tile) => (
            <TouchableOpacity
              key={tile.segment}
              style={styles.tile}
              activeOpacity={0.8}
              // These destination routes don't exist until specs 07–12 build them,
              // so typed-routes has no type for them yet.
              onPress={() =>
                router.push(`/bikes/${bikeId}/${tile.segment}` as never)
              }
            >
              <View style={styles.tileIcon}>
                <MaterialCommunityIcons
                  name={tile.icon}
                  size={18}
                  color={COLORS.accent}
                />
              </View>
              <Text style={styles.tileLabel}>{tile.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.bottomActions}>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
            <Text style={styles.deleteButtonText}>Delete Bike</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>

      <BikeFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initialBike={bike}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  statsStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "rgba(30,32,48,0.5)",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  statCenter: {
    alignItems: "center",
  },
  statRight: {
    alignItems: "flex-end",
  },
  statTiny: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  statMono: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textLight,
    marginTop: 1,
    fontFamily: "monospace",
  },
  statOdo: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 1,
    fontFamily: "monospace",
  },
  statDate: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 1,
  },
  reminder: {
    marginHorizontal: 16,
  },
  tileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    padding: 16,
  },
  tile: {
    width: "47%",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    padding: 14,
    gap: 10,
  },
  tileIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(145,132,217,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  tileLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
  bottomActions: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  deleteButton: {
    backgroundColor: "rgba(248,113,113,0.1)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.3)",
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: "center",
  },
  deleteButtonText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: "500",
  },
});
