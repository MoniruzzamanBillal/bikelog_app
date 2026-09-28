import { RemindersBanner } from "@/components/main/MaintenanceLog/RemindersBanner";
import { EfficiencyAlertBanner } from "@/components/main/Mileage/EfficiencyAlertBanner";
import {
  ActionMenu,
  EmptyState,
  ErrorState,
  Panel,
  RuleFade,
  ScreenHeader,
  SectionLoading,
} from "@/components/main/shared";
import { confirmDelete } from "@/components/main/shared/ConfirmDelete";
import { useDelete, useFetchData } from "@/hooks/useApi";
import { TBike } from "@/types/bike.types";
import { TMaintenanceType } from "@/types/catalog.types";
import {
  TLifetimeMileage,
  TMileageHistoryResponse,
} from "@/types/mileage.types";
import { TSpendingSummary } from "@/types/spending.types";
import { COLORS } from "@/utils/colors";
import { formatTaka } from "@/utils/formatTaka";
import { setLastUsedBike } from "@/utils/lastUsedBike";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { format } from "date-fns";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
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

/**
 * Avg km/l for the hub's mini-stat row — the last ≤5 exact full-tank periods,
 * else the approximate estimate. Same logic as the web's `getAvgMileage`.
 */
function getAvgMileage(history?: TMileageHistoryResponse): string {
  const exact = history?.exactRecords ?? [];
  if (exact.length > 0) {
    const recent = [...exact]
      .sort(
        (a, b) =>
          new Date(b.periodEndDate).getTime() -
          new Date(a.periodEndDate).getTime(),
      )
      .slice(0, 5);
    const avg =
      recent.reduce((sum, r) => sum + r.mileageKmPerLiter, 0) / recent.length;
    return avg.toFixed(1);
  }
  if (history?.approximate) {
    return history.approximate.mileageKmPerLiter.toFixed(1);
  }
  return "—";
}

export function BikeDetailPage() {
  const { bikeId } = useLocalSearchParams<{ bikeId: string }>();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const now = new Date();
  const targetMonth = format(now, "yyyy-MM");

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

  // Read-only mini-stat reads. Each reuses a query key another screen already
  // owns, so the hub shares their cache entry rather than adding one.
  const { data: historyData } = useFetchData<TMileageHistoryResponse>(
    ["mileage", "history", bikeId],
    `/bikes/${bikeId}/mileage`,
    { enabled: !!bikeId },
  );
  const { data: lifetimeData } = useFetchData<TLifetimeMileage>(
    ["mileage", "lifetime", bikeId],
    `/bikes/${bikeId}/mileage/lifetime`,
    { enabled: !!bikeId },
  );
  const { data: spendingData } = useFetchData<TSpendingSummary>(
    ["spending", bikeId, "month", targetMonth],
    `/bikes/${bikeId}/spending-summary?period=month&targetMonth=${targetMonth}`,
    { enabled: !!bikeId },
  );

  useEffect(() => {
    if (bikeId) setLastUsedBike(bikeId);
  }, [bikeId]);

  const deleteMutation = useDelete([["bikes"]]);

  const handleDelete = () => {
    confirmDelete("bike", async () => {
      await deleteMutation.mutateAsync({ url: `/bikes/${bikeId}` });
      router.replace("/");
    });
  };

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Loading…" backLabel="Garage" />
        <View style={styles.page}>
          <SectionLoading count={4} />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Bike" backLabel="Garage" />
        <View style={styles.page}>
          <ErrorState title="Couldn’t load this bike" onRetry={refetch} />
        </View>
      </View>
    );
  }

  if (!bike) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Bike" backLabel="Garage" />
        <View style={styles.page}>
          <EmptyState
            icon="alert-outline"
            title="Bike not found"
            message="It may have been deleted, or it belongs to another account."
          />
        </View>
      </View>
    );
  }

  const avgMileage = getAvgMileage(historyData?.data);
  const lifetimeKm = lifetimeData?.data?.totalDistanceKm;
  const monthSpend = spendingData?.data?.totalSpending;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={bike.nickname}
        subtitle={`${bike.brand} ${bike.model}`}
        backLabel="Garage"
      />

      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <Panel style={styles.odoPanel}>
          <View style={styles.odoTop}>
            <View>
              <Text style={styles.kicker}>ODOMETER</Text>
              <View style={styles.odoValueRow}>
                <Text style={styles.odoValue}>
                  {bike.currentOdometer.toLocaleString()}
                </Text>
                <Text style={styles.odoUnit}>km</Text>
              </View>
            </View>

            <ActionMenu
              outlined
              actions={[
                {
                  label: "Log fuel",
                  icon: "gas-station",
                  onPress: () =>
                    router.push(`/bikes/${bikeId}/fuel-logs/new` as never),
                },
                {
                  label: "Edit bike",
                  icon: "pencil-outline",
                  onPress: () => setEditOpen(true),
                },
                {
                  label: "Delete bike",
                  icon: "trash-can-outline",
                  destructive: true,
                  onPress: handleDelete,
                },
              ]}
            />
          </View>

          <RuleFade />

          <View style={styles.miniStats}>
            <View style={styles.miniStat}>
              <Text style={styles.miniLabel}>Avg mileage</Text>
              <Text style={styles.miniValue}>
                {avgMileage === "—" ? "—" : `${avgMileage} km/l`}
              </Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={styles.miniLabel}>{format(now, "MMM")} spend</Text>
              <Text style={styles.miniValue}>
                {monthSpend == null ? "—" : formatTaka(monthSpend)}
              </Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={styles.miniLabel}>Lifetime</Text>
              <Text style={styles.miniValue}>
                {lifetimeKm == null
                  ? "—"
                  : `${lifetimeKm.toLocaleString()} km`}
              </Text>
            </View>
          </View>
        </Panel>

        <RemindersBanner bikeId={bikeId} maintenanceTypes={maintenanceTypes} />
        <EfficiencyAlertBanner bikeId={bikeId} />

        <View style={styles.tileGrid}>
          {TILES.map((tile) => (
            <TouchableOpacity
              key={tile.segment}
              style={styles.tile}
              activeOpacity={0.8}
              // The generated typed-routes file can lag behind the route tree,
              // so these drill-down pushes stay string-based (see CLAUDE.md).
              onPress={() =>
                router.push(`/bikes/${bikeId}/${tile.segment}` as never)
              }
            >
              <MaterialCommunityIcons
                name={tile.icon}
                size={18}
                color={COLORS.accent}
              />
              <Text style={styles.tileLabel} numberOfLines={1}>
                {tile.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

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
  page: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 12,
  },
  odoPanel: {
    padding: 16,
    gap: 12,
  },
  odoTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: COLORS.textLight,
  },
  odoValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  odoValue: {
    fontSize: 30,
    fontWeight: "500",
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },
  odoUnit: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  miniStats: {
    flexDirection: "row",
    gap: 8,
  },
  miniStat: {
    flex: 1,
    minWidth: 0,
  },
  miniLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  miniValue: {
    fontSize: 15,
    color: COLORS.text,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  tileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tile: {
    width: "31.7%",
    height: 76,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.edge,
    borderRadius: 10,
    padding: 12,
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  tileLabel: {
    fontSize: 12.5,
    color: COLORS.text,
  },
});
