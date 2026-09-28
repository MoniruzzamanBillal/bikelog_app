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
  TAccessoryStatus,
  TAccessoryUrgency,
  TBikeAccessoriesApiResponse,
} from "@/types/bike-accessory.types";
import { TBike } from "@/types/bike.types";
import { COLORS, tint } from "@/utils/colors";
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
import { BikeAccessoryCard } from "./BikeAccessoryCard";
import { BikeAccessoryFormModal } from "./BikeAccessoryFormModal";

const LIMIT = 10;

const URGENCIES: { key: TAccessoryUrgency | null; label: string }[] = [
  { key: null, label: "All" },
  { key: "immediate", label: "Immediate" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
];

// Spec 32: Pending is the default and there is deliberately no "All" option.
const STATUSES: { value: TAccessoryStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "purchased", label: "Purchased" },
  { value: "cancelled", label: "Cancelled" },
];

export function BikeAccessory() {
  const { bikeId } = useLocalSearchParams<{ bikeId: string }>();
  const [page, setPage] = useState(1);
  const [urgencyFilter, setUrgencyFilter] = useState<TAccessoryUrgency | null>(
    null,
  );
  const [statusFilter, setStatusFilter] = useState<TAccessoryStatus>("pending");
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  const { data, isLoading, isError, refetch } =
    useFetchData<TBikeAccessoriesApiResponse>(
      [
        "accessories",
        bikeId,
        page.toString(),
        urgencyFilter ?? "all",
        statusFilter,
      ],
      `/bikes/${bikeId}/accessories?${queryString}`,
      { enabled: !!bikeId },
    );

  const accessories = data?.data?.result ?? [];
  const totalCount = data?.data?.meta ?? 0;
  const totalPages = Math.ceil(totalCount / LIMIT) || 1;
  const firstOnPage = (page - 1) * LIMIT + 1;
  const lastOnPage = (page - 1) * LIMIT + accessories.length;
  const statusLabel =
    STATUSES.find((s) => s.value === statusFilter)?.label ?? "";

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

  const addButton = (
    <PrimaryButton onPress={() => setModalOpen(true)} icon="plus" compact>
      Add
    </PrimaryButton>
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Accessories"
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
            onChange={handleStatusChange}
            options={STATUSES}
          />
          {addButton}
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
              <Text
                style={[
                  styles.chipText,
                  urgencyFilter === key && styles.chipTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {isLoading ? (
          <SectionLoading count={4} />
        ) : isError ? (
          <ErrorState title="Couldn’t load accessories" onRetry={refetch} />
        ) : accessories.length === 0 ? (
          <EmptyState
            icon="shopping-outline"
            title="Wishlist is empty"
            message="Track accessories you plan to buy. Marking one purchased adds its price to spending."
            action={
              <PrimaryButton
                onPress={() => setModalOpen(true)}
                icon="plus"
                compact
              >
                Add accessory
              </PrimaryButton>
            }
          />
        ) : (
          <>
            <Text style={styles.kicker}>
              {statusLabel.toUpperCase()} {totalCount}
            </Text>

            <View style={styles.list}>
              {accessories.map((acc) => (
                <BikeAccessoryCard
                  key={acc._id}
                  accessory={acc}
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
  urgencyRow: {
    flexDirection: "row",
    gap: 6,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "transparent",
  },
  chipActive: {
    backgroundColor: tint(COLORS.accent, 0.12),
    borderColor: COLORS.accent,
  },
  chipText: {
    fontSize: 12,
    color: "rgba(233,233,237,0.85)",
  },
  chipTextActive: {
    color: COLORS.accent,
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
