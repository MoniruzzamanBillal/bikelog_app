import { useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
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
import {
  TAccessoryStatus,
  TAccessoryUrgency,
  TBikeAccessoriesApiResponse,
} from "@/types/bike-accessory.types";
import { BikeAccessoryCard } from "./BikeAccessoryCard";
import { BikeAccessoryFormModal } from "./BikeAccessoryFormModal";

const LIMIT = 10;

const URGENCIES: { key: TAccessoryUrgency | null; label: string }[] = [
  { key: null, label: "All" },
  { key: "immediate", label: "Immediate" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
];

const STATUSES: { key: TAccessoryStatus; label: string; sectionLabel: string }[] = [
  { key: "pending", label: "Pending", sectionLabel: "Pending / Wishlist" },
  { key: "purchased", label: "Purchased", sectionLabel: "Purchased" },
  { key: "cancelled", label: "Cancelled", sectionLabel: "Cancelled" },
];

export function BikeAccessory() {
  const { bikeId } = useLocalSearchParams<{ bikeId: string }>();
  const [page, setPage] = useState(1);
  const [urgencyFilter, setUrgencyFilter] = useState<TAccessoryUrgency | null>(null);
  const [statusFilter, setStatusFilter] = useState<TAccessoryStatus>("pending");
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const openSwipeableRef = useRef<SwipeableMethods | null>(null);

  const { data: bikeData } = useFetchData<TBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
    { enabled: !!bikeId },
  );
  const bike = bikeData?.data;

  const filterParams = new URLSearchParams();
  filterParams.set("page", page.toString());
  filterParams.set("limit", LIMIT.toString());
  if (urgencyFilter) filterParams.set("urgency", urgencyFilter);
  filterParams.set("status", statusFilter);
  const queryString = filterParams.toString();

  const { data, isLoading, isError, refetch } = useFetchData<TBikeAccessoriesApiResponse>(
    ["accessories", bikeId, page.toString(), urgencyFilter ?? "all", statusFilter],
    `/bikes/${bikeId}/accessories?${queryString}`,
    { enabled: !!bikeId },
  );

  const accessories = data?.data?.result ?? [];
  const totalPages = Math.ceil((data?.data?.meta ?? 0) / LIMIT) || 1;
  const sectionLabel = STATUSES.find((s) => s.key === statusFilter)?.sectionLabel ?? "";

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleUrgencyChange = (u: TAccessoryUrgency | null) => {
    setUrgencyFilter(u);
    setPage(1);
  };

  const handleStatusChange = (s: TAccessoryStatus) => {
    setStatusFilter(s);
    setPage(1);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Accessories"
        backLabel={bike?.nickname ?? "Back"}
        rightIcon="plus"
        onRightPress={() => setModalOpen(true)}
      />

      <View style={styles.filtersWrap}>
        <View style={styles.tabRow}>
          {STATUSES.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.tab, statusFilter === key && styles.tabActive]}
              onPress={() => handleStatusChange(key)}
            >
              <Text
                style={[styles.tabText, statusFilter === key && styles.tabTextActive]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.urgencyRow}
        >
          {URGENCIES.map(({ key, label }) => (
            <TouchableOpacity
              key={label}
              style={[styles.chip, urgencyFilter === key && styles.chipActive]}
              onPress={() => handleUrgencyChange(key)}
            >
              <Text style={[styles.chipText, urgencyFilter === key && styles.chipTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.pad}>
          <SectionLoading count={5} />
        </View>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : accessories.length === 0 ? (
        <EmptyState label="No accessories on your wishlist yet." />
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
            <Text style={styles.sectionHeading}>{sectionLabel}</Text>
            {accessories.map((acc) => (
              <BikeAccessoryCard
                key={acc._id}
                accessory={acc}
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

      <BikeAccessoryFormModal
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
  filtersWrap: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
    paddingBottom: 8,
  },
  tabRow: {
    flexDirection: "row",
    gap: 6,
    padding: 12,
    paddingBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: COLORS.surface,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.white,
  },
  urgencyRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
  },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: "transparent",
  },
  chipActive: {
    backgroundColor: "rgba(145,132,217,0.15)",
    borderColor: COLORS.accent,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textMuted,
  },
  chipTextActive: {
    color: COLORS.accent,
  },
  pad: {
    padding: 14,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
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
