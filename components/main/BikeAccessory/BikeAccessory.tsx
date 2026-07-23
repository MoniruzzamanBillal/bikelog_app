import { useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { useLocalSearchParams } from "expo-router";
import { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { EmptyState, SectionLoading } from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { COLORS } from "@/utils/colors";
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

const STATUSES: { key: TAccessoryStatus | null; label: string }[] = [
  { key: null, label: "All" },
  { key: "pending", label: "Pending" },
  { key: "purchased", label: "Purchased" },
  { key: "cancelled", label: "Cancelled" },
];

export function BikeAccessory() {
  const { bikeId } = useLocalSearchParams<{ bikeId: string }>();
  const [page, setPage] = useState(1);
  const [urgencyFilter, setUrgencyFilter] = useState<TAccessoryUrgency | null>(null);
  const [statusFilter, setStatusFilter] = useState<TAccessoryStatus | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const openSwipeableRef = useRef<SwipeableMethods | null>(null);

  const filterParams = new URLSearchParams();
  filterParams.set("page", page.toString());
  filterParams.set("limit", LIMIT.toString());
  if (urgencyFilter) filterParams.set("urgency", urgencyFilter);
  if (statusFilter) filterParams.set("status", statusFilter);
  const queryString = filterParams.toString();

  const { data, isLoading, refetch } = useFetchData<TBikeAccessoriesApiResponse>(
    ["accessories", bikeId, page.toString(), urgencyFilter ?? "all", statusFilter ?? "all"],
    `/bikes/${bikeId}/accessories?${queryString}`,
    { enabled: !!bikeId },
  );

  const accessories = data?.data?.result ?? [];
  const totalPages = Math.ceil((data?.data?.meta ?? 0) / LIMIT) || 1;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleUrgencyChange = (u: TAccessoryUrgency | null) => {
    setUrgencyFilter(u);
    setPage(1);
  };

  const handleStatusChange = (s: TAccessoryStatus | null) => {
    setStatusFilter(s);
    setPage(1);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Accessories</Text>
        <Button
          mode="contained"
          onPress={() => setModalOpen(true)}
          labelStyle={{ color: COLORS.white }}
        >
          Add
        </Button>
      </View>

      <Text style={styles.filterLabel}>Urgency</Text>
      <View style={styles.filterRow}>
        {URGENCIES.map(({ key, label }) => (
          <TouchableOpacity
            key={label}
            style={[styles.filterBtn, urgencyFilter === key && styles.filterBtnActive]}
            onPress={() => handleUrgencyChange(key)}
          >
            <Text
              style={[styles.filterBtnText, urgencyFilter === key && styles.filterBtnTextActive]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.filterLabel}>Status</Text>
      <View style={styles.filterRow}>
        {STATUSES.map(({ key, label }) => (
          <TouchableOpacity
            key={label}
            style={[styles.filterBtn, statusFilter === key && styles.filterBtnActive]}
            onPress={() => handleStatusChange(key)}
          >
            <Text
              style={[styles.filterBtnText, statusFilter === key && styles.filterBtnTextActive]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <SectionLoading count={5} />
      ) : accessories.length === 0 ? (
        <EmptyState label="No accessories on your wishlist yet." />
      ) : (
        <>
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            showsVerticalScrollIndicator={false}
          >
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

      <BikeAccessoryFormModal
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
  filterLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textLight,
    marginBottom: 6,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  filterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
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
    fontSize: 12,
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
