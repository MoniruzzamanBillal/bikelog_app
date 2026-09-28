import {
  EmptyState,
  ErrorState,
  PrimaryButton,
  ScreenHeader,
  SectionLoading,
} from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import {
  IBikeDocument,
  TBikeDocumentsApiResponse,
} from "@/types/bike-document.types";
import { TBike } from "@/types/bike.types";
import { COLORS } from "@/utils/colors";
import { parseApiDate } from "@/utils/formatApiDate";
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
import { BikeDocumentCard } from "./BikeDocumentCard";
import { BikeDocumentFormModal } from "./BikeDocumentFormModal";

const LIMIT = 10;

/** Soonest expiry first, documents with no expiry last — client-side, like the web. */
function byExpiry(a: IBikeDocument, b: IBikeDocument): number {
  if (!a.expiryDate && !b.expiryDate) return 0;
  if (!a.expiryDate) return 1;
  if (!b.expiryDate) return -1;
  return (
    parseApiDate(a.expiryDate).getTime() - parseApiDate(b.expiryDate).getTime()
  );
}

export function BikeDocument() {
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
    useFetchData<TBikeDocumentsApiResponse>(
      ["documents", bikeId, page.toString()],
      `/bikes/${bikeId}/documents?page=${page}&limit=${LIMIT}`,
      { enabled: !!bikeId },
    );

  const documents = [...(data?.data?.result ?? [])].sort(byExpiry);
  const totalCount = data?.data?.meta ?? 0;
  const totalPages = Math.ceil(totalCount / LIMIT) || 1;
  const firstOnPage = (page - 1) * LIMIT + 1;
  const lastOnPage = (page - 1) * LIMIT + documents.length;

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
        title="Documents"
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
            {isLoading
              ? ""
              : `${totalCount} document${totalCount === 1 ? "" : "s"}`}
          </Text>
          {addButton}
        </View>

        {isLoading ? (
          <SectionLoading count={4} />
        ) : isError ? (
          <ErrorState title="Couldn’t load documents" onRetry={refetch} />
        ) : documents.length === 0 ? (
          <EmptyState
            icon="file-document-outline"
            title="No documents yet"
            message="Keep registration, tax token, insurance and licence copies here with their expiry dates."
            action={
              <PrimaryButton
                onPress={() => setModalOpen(true)}
                icon="plus"
                compact
              >
                Add document
              </PrimaryButton>
            }
          />
        ) : (
          <>
            <View style={styles.list}>
              {documents.map((document) => (
                <BikeDocumentCard
                  key={document._id}
                  document={document}
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

      <BikeDocumentFormModal
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
