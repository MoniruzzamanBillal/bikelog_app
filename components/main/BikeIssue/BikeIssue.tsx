import { EmptyState, SectionLoading } from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import {
  TBikeIssueStatus,
  TBikeIssuesApiResponse,
} from "@/types/bike-issue.types";
import { COLORS } from "@/utils/colors";
import { useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { Button, Text } from "react-native-paper";
import { BikeIssueCard } from "./BikeIssueCard";
import { BikeIssueFormModal } from "./BikeIssueFormModal";

const LIMIT = 10;

export function BikeIssue() {
  const { bikeId } = useLocalSearchParams<{ bikeId: string }>();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<TBikeIssueStatus | null>(
    null,
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const openSwipeableRef = useRef<SwipeableMethods | null>(null);

  const filterParam = statusFilter ? `&status=${statusFilter}` : "";

  const { data, isLoading, refetch } = useFetchData<TBikeIssuesApiResponse>(
    ["issues", bikeId, page.toString(), statusFilter ?? "all"],
    `/bikes/${bikeId}/issues?page=${page}&limit=${LIMIT}&sort=-dateReported${filterParam}`,
    { enabled: !!bikeId },
  );

  const issues = data?.data?.result ?? [];
  const totalPages = Math.ceil((data?.data?.meta ?? 0) / LIMIT) || 1;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleFilterChange = (filter: TBikeIssueStatus | null) => {
    setStatusFilter(filter);
    setPage(1);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Issues</Text>
        <Button mode="contained" onPress={() => setModalOpen(true)}>
          Report
        </Button>
      </View>

      <View style={styles.filterRow}>
        {([null, "open", "resolved"] as (TBikeIssueStatus | null)[]).map(
          (f) => (
            <TouchableOpacity
              key={f ?? "all"}
              style={[
                styles.filterBtn,
                statusFilter === f && styles.filterBtnActive,
              ]}
              onPress={() => handleFilterChange(f)}
            >
              <Text
                style={[
                  styles.filterBtnText,
                  statusFilter === f && styles.filterBtnTextActive,
                ]}
              >
                {f === null ? "All" : f === "open" ? "Open" : "Resolved"}
              </Text>
            </TouchableOpacity>
          ),
        )}
      </View>

      {isLoading ? (
        <SectionLoading count={5} />
      ) : issues.length === 0 ? (
        <EmptyState label="No issues reported yet." />
      ) : (
        <>
          <ScrollView
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
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
                <Button
                  mode="outlined"
                  disabled={page === 1}
                  onPress={() => setPage((p) => p - 1)}
                  textColor={COLORS.text}
                >
                  Previous
                </Button>
                <Button
                  mode="outlined"
                  disabled={page === totalPages}
                  onPress={() => setPage((p) => p + 1)}
                  textColor={COLORS.text}
                >
                  Next
                </Button>
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
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  filterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  filterBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
  filterBtnTextActive: {
    color: COLORS.white,
  },
  pagination: {
    marginTop: 16,
    alignItems: "center",
  },
  pageInfo: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  pageButtons: {
    flexDirection: "row",
    gap: 12,
  },
});
