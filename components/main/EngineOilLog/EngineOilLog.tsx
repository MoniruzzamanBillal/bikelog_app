import {
  EmptyState,
  ErrorState,
  PrimaryButton,
  ScreenHeader,
  SectionLoading,
} from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { useEngineOilSeed } from "@/hooks/useEngineOilSeed";
import { TEngineOilType } from "@/types/catalog.types";
import {
  TEngineOilLogsApiResponse,
  TEngineOilStatus,
} from "@/types/engine-oil-log.types";
import { COLORS } from "@/utils/colors";
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
import { EngineOilLogCard } from "./EngineOilLogCard";
import { EngineOilLogFormModal } from "./EngineOilLogFormModal";
import { OilStatusCard } from "./OilStatusCard";

const LIMIT = 10;

export function EngineOilLog() {
  const { bikeId } = useLocalSearchParams<{ bikeId: string }>();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [quickFillOpen, setQuickFillOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { bike, seed, odometerSeed } = useEngineOilSeed(bikeId);

  const { data, isLoading, isError, refetch } =
    useFetchData<TEngineOilLogsApiResponse>(
      ["engineOilLogs", bikeId, page.toString()],
      `/bikes/${bikeId}/engine-oil-logs?page=${page}&limit=${LIMIT}&sort=-changeDate`,
      { enabled: !!bikeId },
    );

  const { data: statusData } = useFetchData<TEngineOilStatus>(
    ["engineOilStatus", bikeId],
    `/bikes/${bikeId}/engine-oil-logs/status`,
    { enabled: !!bikeId },
  );

  // ! H-D: the existing kebab-case key, shared with Settings and the maintenance form.
  const { data: oilData } = useFetchData<TEngineOilType[]>(
    ["engine-oil-types"],
    "/engine-oil-types",
  );
  const oilTypes = oilData?.data ?? [];

  const logs = data?.data?.result ?? [];
  const totalCount = data?.data?.meta ?? 0;
  const totalPages = Math.ceil(totalCount / LIMIT) || 1;
  const firstOnPage = (page - 1) * LIMIT + 1;
  const lastOnPage = (page - 1) * LIMIT + logs?.length;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Engine oil"
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
        {/* ! H-G: this card is the screen's alert surface. `RemindersBanner` is NOT
            ! rendered here — the same overdue oil would show twice, six lines apart, in
            ! two different visual languages. Reminders stay the hub's job. */}
        <OilStatusCard status={statusData?.data} />

        <View style={styles.topRow}>
          <Text style={styles.count}>
            {isLoading ? "" : `${totalCount} changes`}
          </Text>
          <View style={styles.topActions}>
            {/* ! §H: hidden when there is no previous change — a button that opens an
                ! empty form under this label is worse than no button. Shortened to "Same
                ! as last" because two buttons plus the count do not fit comfortably at
                ! 360dp; the count gives way first (the row is space-between). */}
            {seed && (
              <PrimaryButton
                onPress={() => setQuickFillOpen(true)}
                variant="secondary"
                icon="content-copy"
                compact
              >
                Same as last
              </PrimaryButton>
            )}
            <PrimaryButton
              onPress={() => setModalOpen(true)}
              icon="plus"
              compact
            >
              Add
            </PrimaryButton>
          </View>
        </View>

        {isLoading ? (
          <SectionLoading count={5} />
        ) : isError ? (
          <ErrorState
            title="Couldn’t load engine oil changes"
            onRetry={refetch}
          />
        ) : logs?.length === 0 ? (
          <EmptyState
            icon="oil"
            title="No oil changes yet"
            message="Log an oil change to see how far you’ve run on it and when the next one falls due."
            action={
              <PrimaryButton
                onPress={() => setModalOpen(true)}
                icon="plus"
                compact
              >
                Add oil change
              </PrimaryButton>
            }
          />
        ) : (
          <>
            <View style={styles.list}>
              {logs?.map((log) => (
                <EngineOilLogCard
                  key={log?._id}
                  log={log}
                  bikeId={bikeId}
                  oilTypes={oilTypes}
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

      <EngineOilLogFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        bikeId={bikeId}
        seedOdometer={odometerSeed}
      />

      {/* ! §H: the same component, same guards, same submit path — only a different
          ! initial state. Kept as a second instance rather than a flag on the first so the
          ! two mount with their own state and neither can leak the other's seed. */}
      <EngineOilLogFormModal
        open={quickFillOpen}
        onClose={() => setQuickFillOpen(false)}
        bikeId={bikeId}
        seed={seed}
        seedOdometer={odometerSeed}
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
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  count: {
    fontSize: 13,
    color: COLORS.textLight,
    flexShrink: 1,
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
