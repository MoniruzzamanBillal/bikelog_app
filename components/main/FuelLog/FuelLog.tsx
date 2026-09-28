import {
  EmptyState,
  ErrorState,
  PrimaryButton,
  ScreenHeader,
  SectionLoading,
} from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { TBike } from "@/types/bike.types";
import { TFuelLog, TFuelLogsApiResponse } from "@/types/fuel-log.types";
import { TMileageHistoryResponse, TMileageRecord } from "@/types/mileage.types";
import { COLORS } from "@/utils/colors";
import { formatApiDate } from "@/utils/formatApiDate";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { FuelLogCard } from "./FuelLogCard";
import { FuelLogFormModal } from "./FuelLogFormModal";

const LIMIT = 10;

// ! only full-tank logs close a mileage period, so match on endOdometer (the log that
// ! closed the period) rather than trusting fuelLogIds array order/membership
function findMileageForLog(
  log: TFuelLog,
  records: TMileageRecord[],
): number | undefined {
  if (!log.isFullTank) return undefined;
  return records.find((r) => r.endOdometer === log.odometerReading)
    ?.mileageKmPerLiter;
}

/**
 * Logs belonging to a closed mileage period can't be edited or deleted — the
 * server rejects it ("part of a closed mileage record"), so the UI says so
 * up front instead of letting the request fail.
 */
function buildLockMap(records: TMileageRecord[]): Map<string, string> {
  const locks = new Map<string, string>();
  records.forEach((record) => {
    const period = `${formatApiDate(record.periodStartDate, "d MMM")} → ${formatApiDate(
      record.periodEndDate,
      "d MMM",
    )}`;
    record.fuelLogIds?.forEach((id) => {
      locks.set(id, `Locked — part of a closed mileage period (${period})`);
    });
  });
  return locks;
}

export function FuelLog() {
  const { bikeId } = useLocalSearchParams<{ bikeId: string }>();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: bikeData } = useFetchData<TBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
    { enabled: !!bikeId },
  );
  const bike = bikeData?.data;

  const { data, isLoading, isError, refetch } =
    useFetchData<TFuelLogsApiResponse>(
      ["fuelLogs", bikeId, page.toString()],
      `/bikes/${bikeId}/fuel-logs?page=${page}&limit=${LIMIT}&sort=-date`,
      { enabled: !!bikeId },
    );

  const { data: mileageHistoryData } = useFetchData<TMileageHistoryResponse>(
    ["mileage", "history", bikeId],
    `/bikes/${bikeId}/mileage`,
    { enabled: !!bikeId },
  );
  const mileageRecords = mileageHistoryData?.data?.exactRecords ?? [];
  const lockMap = buildLockMap(mileageRecords);

  const fuelLogs = data?.data?.result ?? [];
  const totalCount = data?.data?.meta ?? 0;
  const totalPages = Math.ceil(totalCount / LIMIT) || 1;
  const firstOnPage = (page - 1) * LIMIT + 1;
  const lastOnPage = (page - 1) * LIMIT + fuelLogs.length;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const addButton = (
    <PrimaryButton onPress={() => setModalOpen(true)} icon="plus" compact>
      Add
    </PrimaryButton>
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Fuel logs"
        subtitle={bike?.nickname}
        backLabel={bike?.nickname ?? "Back"}
      />

      <ScrollView
        contentContainerStyle={styles.page}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <Text style={styles.count}>
            {isLoading ? "" : `${totalCount} fill-ups`}
          </Text>
          {addButton}
        </View>

        {isLoading ? (
          <SectionLoading count={5} />
        ) : isError ? (
          <ErrorState title="Couldn’t load fuel logs" onRetry={refetch} />
        ) : fuelLogs.length === 0 ? (
          <EmptyState
            icon="gas-station"
            title="No fill-ups yet"
            message="Mark full-tank fills so Bike Log can work out exact km/l."
            action={
              <PrimaryButton
                onPress={() => setModalOpen(true)}
                icon="plus"
                compact
              >
                Add fuel log
              </PrimaryButton>
            }
          />
        ) : (
          <>
            <View style={styles.list}>
              {fuelLogs.map((log) => (
                <FuelLogCard
                  key={log._id}
                  fuelLog={log}
                  bikeId={bikeId}
                  mileageKmPerLiter={findMileageForLog(log, mileageRecords)}
                  lockedNote={lockMap.get(log._id)}
                />
              ))}
            </View>

            {totalPages > 1 && (
              <View style={styles.pager}>
                <Text style={styles.pagerRange}>
                  {firstOnPage}–{lastOnPage} of {totalCount}
                </Text>
                <View style={styles.pagerControls}>
                  <TouchableOpacity
                    disabled={page === 1}
                    onPress={() => setPage((p) => p - 1)}
                    style={[styles.pagerBtn, page === 1 && styles.pagerBtnOff]}
                  >
                    <MaterialCommunityIcons
                      name="chevron-left"
                      size={16}
                      color={COLORS.text}
                    />
                  </TouchableOpacity>
                  <Text style={styles.pagerPage}>
                    {page} / {totalPages}
                  </Text>
                  <TouchableOpacity
                    disabled={page === totalPages}
                    onPress={() => setPage((p) => p + 1)}
                    style={[
                      styles.pagerBtn,
                      page === totalPages && styles.pagerBtnOff,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={16}
                      color={COLORS.text}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

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
  page: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  count: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  list: {
    gap: 10,
  },
  pager: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  pagerRange: {
    fontSize: 12.5,
    color: COLORS.textLight,
    fontVariant: ["tabular-nums"],
  },
  pagerControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pagerBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  pagerBtnOff: {
    opacity: 0.45,
  },
  pagerPage: {
    fontSize: 12.5,
    color: COLORS.text,
    paddingHorizontal: 6,
    fontVariant: ["tabular-nums"],
  },
});
