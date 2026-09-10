import { useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useLocalSearchParams } from "expo-router";
import { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import {
  EmptyState,
  ErrorState,
  PrimaryButton,
  ScreenHeader,
  SectionLoading,
} from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { COLORS } from "@/utils/colors";
import { TBike } from "@/types/bike.types";
import { TFuelLogsApiResponse } from "@/types/fuel-log.types";
import { TLifetimeMileage } from "@/types/mileage.types";
import { isSameMonth, parseISO } from "date-fns";
import { FuelLogCard } from "./FuelLogCard";
import { FuelLogFormModal } from "./FuelLogFormModal";

const LIMIT = 10;

export function FuelLog() {
  const { bikeId } = useLocalSearchParams<{ bikeId: string }>();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const openSwipeableRef = useRef<SwipeableMethods | null>(null);

  const { data: bikeData } = useFetchData<TBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
    { enabled: !!bikeId },
  );
  const bike = bikeData?.data;

  const { data, isLoading, isError, refetch } = useFetchData<TFuelLogsApiResponse>(
    ["fuelLogs", bikeId, page.toString()],
    `/bikes/${bikeId}/fuel-logs?page=${page}&limit=${LIMIT}&sort=-date`,
    { enabled: !!bikeId },
  );

  const { data: lifetimeData } = useFetchData<TLifetimeMileage>(
    ["mileage", "lifetime", bikeId],
    `/bikes/${bikeId}/mileage/lifetime`,
    { enabled: !!bikeId },
  );
  const lifetime = lifetimeData?.data;
  const avgMileage =
    lifetime && lifetime.totalLitersConsumed > 0
      ? (lifetime.totalDistanceKm / lifetime.totalLitersConsumed).toFixed(1)
      : "—";

  const fuelLogs = data?.data?.result ?? [];
  const totalCount = data?.data?.meta ?? 0;
  const totalPages = Math.ceil(totalCount / LIMIT) || 1;

  const now = new Date();
  const thisMonthTotal = fuelLogs
    .filter((log) => isSameMonth(parseISO(log.date), now))
    .reduce((sum, log) => sum + log.litersAdded * log.pricePerLiter, 0);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Fuel Logs"
        backLabel={bike?.nickname ?? "Back"}
        rightIcon="plus"
        onRightPress={() => setModalOpen(true)}
      />

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>৳{thisMonthTotal.toFixed(0)}</Text>
          <Text style={styles.statKey}>This month</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{avgMileage}</Text>
          <Text style={styles.statKey}>km/L avg</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{totalCount}</Text>
          <Text style={styles.statKey}>Fill-ups</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.pad}>
          <SectionLoading count={5} />
        </View>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : fuelLogs.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState label="No fill-ups yet. Log your first fuel fill-up to start tracking mileage and spending." />
          <PrimaryButton onPress={() => setModalOpen(true)} style={styles.emptyButton}>
            Add Fill-up
          </PrimaryButton>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.pad}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={COLORS.accent}
              />
            }
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.listCard}>
              {fuelLogs.map((log, i) => (
                <FuelLogCard
                  key={log._id}
                  fuelLog={log}
                  bikeId={bikeId}
                  openSwipeableRef={openSwipeableRef}
                  isLast={i === fuelLogs.length - 1}
                />
              ))}
            </View>
            <Text style={styles.resultsCaption}>
              — {fuelLogs.length} of {totalCount} results —
            </Text>
          </ScrollView>

          {totalPages > 1 && (
            <View style={styles.pagination}>
              <Text style={styles.pageInfo}>
                Page {page} of {totalPages}
              </Text>
              <View style={styles.pageButtons}>
                <PrimaryButton
                  disabled={page === 1}
                  onPress={() => setPage((p) => p - 1)}
                  style={styles.pageButton}
                >
                  Previous
                </PrimaryButton>
                <PrimaryButton
                  disabled={page === totalPages}
                  onPress={() => setPage((p) => p + 1)}
                  style={styles.pageButton}
                >
                  Next
                </PrimaryButton>
              </View>
            </View>
          )}
        </>
      )}

      <FuelLogFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        bikeId={bikeId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  statVal: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  statKey: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 3,
  },
  pad: {
    padding: 16,
  },
  listCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
  },
  resultsCaption: {
    textAlign: "center",
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 12,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyButton: {
    width: "auto",
    paddingHorizontal: 24,
    marginTop: 8,
  },
  pagination: {
    padding: 16,
    alignItems: "center",
  },
  pageInfo: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  pageButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  pageButton: {
    flex: 1,
  },
});
