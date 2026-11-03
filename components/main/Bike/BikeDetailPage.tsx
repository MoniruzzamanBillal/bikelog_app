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
import { TEngineOilStatus } from "@/types/engine-oil-log.types";
import { TMileageHistoryResponse } from "@/types/mileage.types";
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
  // ! D6: beside fuel, not after Documents — those are the two the rider opens weekly.
  { label: "Engine Oil", icon: "oil", segment: "engine-oil" },
  { label: "Mileage", icon: "speedometer-medium", segment: "mileage" },
  { label: "Maintenance", icon: "wrench-outline", segment: "maintenance-logs" },
  { label: "Spending", icon: "cash-multiple", segment: "spending" },
  { label: "Issues", icon: "alert-circle-outline", segment: "issues" },
  { label: "Accessories", icon: "shopping-outline", segment: "accessories" },
  { label: "AI Assistant", icon: "robot-outline", segment: "assistant" },
  { label: "Documents", icon: "file-document-outline", segment: "documents" },
  {
    label: "Manual",
    icon: "book-open-page-variant-outline",
    segment: "manual",
  },
];

/**
 * Avg km/l for the hub's mini-stat row — the last ≤5 exact full-tank periods,
 * else the approximate estimate. Same logic as the web's `getAvgMileage`.
 * Returns the raw km/l number (or null when there is no data) so the caller can
 * both render it and reuse it for the half-tank range below — formatting happens
 * at the call site.
 */
function getAvgMileage(history?: TMileageHistoryResponse): number | null {
  const exact = history?.exactRecords ?? [];
  if (exact?.length > 0) {
    const recent = [...exact]
      .sort(
        (a, b) =>
          new Date(b?.periodEndDate).getTime() -
          new Date(a?.periodEndDate).getTime(),
      )
      .slice(0, 5);
    return (
      recent.reduce((sum, r) => sum + r?.mileageKmPerLiter, 0) / recent?.length
    );
  }
  if (history?.approximate) {
    return history?.approximate?.mileageKmPerLiter ?? null;
  }
  return null;
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
  const { data: spendingData } = useFetchData<TSpendingSummary>(
    ["spending", bikeId, "month", targetMonth],
    `/bikes/${bikeId}/spending-summary?period=month&targetMonth=${targetMonth}`,
    { enabled: !!bikeId },
  );
  // ! Lifetime spend for the "Total spent" mini-stat. Reuses the SAME key the Spending
  // ! screen owns, so react-query serves it from cache once either screen has loaded.
  const { data: lifetimeSpendData } = useFetchData<TSpendingSummary>(
    ["spending", bikeId, "lifetime"],
    `/bikes/${bikeId}/spending-summary?period=lifetime`,
    { enabled: !!bikeId },
  );
  // ! spec 57 §E item 5 — the SAME key the Engine oil screen uses, so react-query serves
  // ! it from cache and the hub makes no extra request once either screen has loaded.
  const { data: oilStatusData } = useFetchData<TEngineOilStatus>(
    ["engineOilStatus", bikeId],
    `/bikes/${bikeId}/engine-oil-logs/status`,
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
  const monthSpend = spendingData?.data?.totalSpending;
  const totalSpend = lifetimeSpendData?.data?.totalSpending;
  // ! Half-tank range: how far this bike can ride on half a tank, from its capacity and the
  // ! SAME avg km/l shown in the "Avg mileage" tile — so the two stay internally consistent
  // ! (6 L × 45 km/l = 270 km). Null (→ "—") when there's no mileage data or no tank capacity.
  const tankCapacity = bike?.fuelTankCapacityLiters;
  const halfTankRangeKm =
    avgMileage != null && tankCapacity
      ? (tankCapacity / 2) * avgMileage
      : null;
  // ! Hidden entirely when there is no oil change — a bike with none shows the strip
  // ! exactly as before rather than a tile reading "0 km".
  const oilStatus = oilStatusData?.data;
  const kmOnThisOil = oilStatus?.lastChange ? oilStatus?.kmSinceChange : null;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={bike?.nickname}
        subtitle={`${bike?.brand} ${bike?.model}`}
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
                  {bike?.currentOdometer?.toLocaleString()}
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
                {avgMileage == null ? "—" : `${avgMileage.toFixed(1)} km/l`}
              </Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={styles.miniLabel}>{format(now, "MMM")} spend</Text>
              <Text style={styles.miniValue}>
                {monthSpend == null ? "—" : formatTaka(monthSpend)}
              </Text>
            </View>

            {kmOnThisOil != null && (
              <View style={styles.miniStat}>
                <Text style={styles.miniLabel}>On this oil</Text>
                <Text style={styles.miniValue}>
                  {`${kmOnThisOil.toLocaleString()} km`}
                </Text>
              </View>
            )}

            <View style={styles.miniStat}>
              <Text style={styles.miniLabel}>½-tank range</Text>
              <Text style={styles.miniValue}>
                {halfTankRangeKm == null
                  ? "—"
                  : `~${Math.round(halfTankRangeKm).toLocaleString()} km`}
              </Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={styles.miniLabel}>Total spent</Text>
              <Text style={styles.miniValue}>
                {totalSpend == null ? "—" : formatTaka(totalSpend)}
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
                {tile?.label}
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
    paddingTop: 12,
    paddingBottom: 24,
    gap: 11,
  },
  odoPanel: {
    padding: 13,
    gap: 12,
  },
  odoTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  kicker: {
    fontSize: 10,
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
    fontSize: 24,
    fontWeight: "500",
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },
  odoUnit: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  // ! Fixed 3-column grid (Avg mileage, month spend, On this oil?, ½-tank range, Total spent).
  // ! Each tile takes a fixed width rather than `flex: 1`, so wrapped rows line up into real
  // ! columns and a partial last row (3+1 without oil, 3+2 with) packs left under column 1 —
  // ! `flex: 1` made last-row tiles grow to fill their row and break the alignment.
  miniStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: 6,
    rowGap: 8,
  },
  miniStat: {
    width: "31.5%",
  },
  miniLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: COLORS.textLight,
  },
  miniValue: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.text,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  tileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
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
    fontSize: 12,
    color: COLORS.text,
  },
});
