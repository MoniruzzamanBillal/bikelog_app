import {
  EmptyState,
  ErrorState,
  PrimaryButton,
  ScreenHeader,
  SectionLoading,
  SegmentedTabs,
} from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import {
  TBikeIssueStatus,
  TBikeIssuesApiResponse,
} from "@/types/bike-issue.types";
import { TBike } from "@/types/bike.types";
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
import { BikeIssueCard } from "./BikeIssueCard";
import { BikeIssueFormModal } from "./BikeIssueFormModal";

const LIMIT = 10;

// Spec 32: Open is the default and there is deliberately no "All" option.
const TABS: { value: TBikeIssueStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
];

export function BikeIssue() {
  const { bikeId } = useLocalSearchParams<{ bikeId: string }>();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<TBikeIssueStatus>("open");
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: bikeData } = useFetchData<TBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
    { enabled: !!bikeId },
  );
  const bike = bikeData?.data;

  const { data, isLoading, isError, refetch } =
    useFetchData<TBikeIssuesApiResponse>(
      ["issues", bikeId, page.toString(), statusFilter],
      `/bikes/${bikeId}/issues?page=${page}&limit=${LIMIT}&sort=-dateReported&status=${statusFilter}`,
      { enabled: !!bikeId },
    );

  const issues = data?.data?.result ?? [];
  const totalCount = data?.data?.meta ?? 0;
  const totalPages = Math.ceil(totalCount / LIMIT) || 1;
  const firstOnPage = (page - 1) * LIMIT + 1;
  const lastOnPage = (page - 1) * LIMIT + issues.length;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleFilterChange = (filter: TBikeIssueStatus) => {
    setStatusFilter(filter);
    setPage(1);
  };

  const addButton = (
    <PrimaryButton onPress={() => setModalOpen(true)} icon="plus" compact>
      Add
    </PrimaryButton>
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Issues"
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
          <SegmentedTabs
            value={statusFilter}
            onChange={handleFilterChange}
            options={TABS}
          />
          {addButton}
        </View>

        {isLoading ? (
          <SectionLoading count={4} />
        ) : isError ? (
          <ErrorState title="Couldn’t load issues" onRetry={refetch} />
        ) : issues.length === 0 ? (
          <EmptyState
            icon="alert-circle-outline"
            title="No issues reported"
            message="Note down rattles, leaks or warning lights with photos so you can show the mechanic."
            action={
              <PrimaryButton
                onPress={() => setModalOpen(true)}
                icon="plus"
                compact
              >
                Report an issue
              </PrimaryButton>
            }
          />
        ) : (
          <>
            <Text style={styles.kicker}>
              {statusFilter === "open" ? "OPEN" : "RESOLVED"} {totalCount}
            </Text>

            <View style={styles.list}>
              {issues.map((issue) => (
                <BikeIssueCard
                  key={issue._id}
                  issue={issue}
                  bikeId={bikeId}
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

      <BikeIssueFormModal
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
    gap: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 0.9,
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
