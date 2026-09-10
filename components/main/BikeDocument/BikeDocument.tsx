import {
  EmptyState,
  ErrorState,
  PrimaryButton,
  ScreenHeader,
  SectionLoading,
} from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { TBike } from "@/types/bike.types";
import { TBikeDocumentsApiResponse } from "@/types/bike-document.types";
import { COLORS } from "@/utils/colors";
import { useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { Text } from "react-native-paper";
import { BikeDocumentCard } from "./BikeDocumentCard";
import { BikeDocumentFormModal } from "./BikeDocumentFormModal";

const LIMIT = 10;

export function BikeDocument() {
  const insets = useSafeAreaInsets();
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

  const { data, isLoading, isError, refetch } = useFetchData<TBikeDocumentsApiResponse>(
    ["documents", bikeId, page.toString()],
    `/bikes/${bikeId}/documents?page=${page}&limit=${LIMIT}`,
    { enabled: !!bikeId },
  );

  const documents = data?.data?.result ?? [];
  const totalPages = Math.ceil((data?.data?.meta ?? 0) / LIMIT) || 1;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Documents"
        backLabel={bike?.nickname ?? "Back"}
        rightIcon="plus"
        onRightPress={() => setModalOpen(true)}
      />

      {isLoading ? (
        <View style={styles.pad}>
          <SectionLoading count={5} />
        </View>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : documents.length === 0 ? (
        <EmptyState label="No documents added yet." />
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
            {documents.map((document) => (
              <BikeDocumentCard
                key={document._id}
                document={document}
                bikeId={bikeId}
                openSwipeableRef={openSwipeableRef}
              />
            ))}
          </ScrollView>

          {totalPages > 1 && (
            <View style={[styles.pagination, { paddingBottom: 16 + insets.bottom }]}>
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
