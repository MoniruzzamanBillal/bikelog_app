import {
  EmptyState,
  ErrorState,
  PrimaryButton,
  ScreenHeader,
  SectionLoading,
} from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { TBike } from "@/types/bike.types";
import {
  TBikeIssueStatus,
  TBikeIssuesApiResponse,
} from "@/types/bike-issue.types";
import { COLORS } from "@/utils/colors";
import { useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { Text } from "react-native-paper";
import { BikeIssueCard } from "./BikeIssueCard";
import { BikeIssueFormModal } from "./BikeIssueFormModal";

const LIMIT = 10;

const TABS: { key: TBikeIssueStatus; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "resolved", label: "Resolved" },
];

export function BikeIssue() {
  const { bikeId } = useLocalSearchParams<{ bikeId: string }>();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<TBikeIssueStatus>("open");
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const openSwipeableRef = useRef<SwipeableMethods | null>(null);

  const { data: bikeData } = useFetchData<TBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
    { enabled: !!bikeId },
  );
  const bike = bikeData?.data;

  const { data, isLoading, isError, refetch } = useFetchData<TBikeIssuesApiResponse>(
    ["issues", bikeId, page.toString(), statusFilter],
    `/bikes/${bikeId}/issues?page=${page}&limit=${LIMIT}&sort=-dateReported&status=${statusFilter}`,
    { enabled: !!bikeId },
  );

  const issues = data?.data?.result ?? [];
  const totalCount = data?.data?.meta ?? 0;
  const totalPages = Math.ceil(totalCount / LIMIT) || 1;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleFilterChange = (filter: TBikeIssueStatus) => {
    setStatusFilter(filter);
    setPage(1);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Issues"
        backLabel={bike?.nickname ?? "Back"}
        rightIcon="plus"
        onRightPress={() => setModalOpen(true)}
      />

      <View style={styles.tabRow}>
        {TABS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, statusFilter === key && styles.tabActive]}
            onPress={() => handleFilterChange(key)}
          >
            <Text
              style={[styles.tabText, statusFilter === key && styles.tabTextActive]}
            >
              {label}
              {key === statusFilter ? ` (${totalCount})` : ""}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.pad}>
          <SectionLoading count={5} />
        </View>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : issues.length === 0 ? (
        <EmptyState label="No issues reported yet." />
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
            {issues.map((issue) => (
              <BikeIssueCard
                key={issue._id}
                issue={issue}
                bikeId={bikeId}
                openSwipeableRef={openSwipeableRef}
              />
            ))}
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
  tabRow: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 14,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    backgroundColor: "rgba(145,132,217,0.12)",
    borderBottomColor: COLORS.accent,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textMuted,
  },
  tabTextActive: {
    fontWeight: "600",
    color: COLORS.accent,
  },
  pad: {
    padding: 14,
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
