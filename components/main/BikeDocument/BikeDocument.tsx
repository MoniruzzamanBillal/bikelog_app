import { EmptyState, SectionLoading } from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { TBikeDocumentsApiResponse } from "@/types/bike-document.types";
import { COLORS } from "@/utils/colors";
import { useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { Button, Text } from "react-native-paper";
import { BikeDocumentCard } from "./BikeDocumentCard";
import { BikeDocumentFormModal } from "./BikeDocumentFormModal";

const LIMIT = 10;

export function BikeDocument() {
  const { bikeId } = useLocalSearchParams<{ bikeId: string }>();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const openSwipeableRef = useRef<SwipeableMethods | null>(null);

  const { data, isLoading, refetch } = useFetchData<TBikeDocumentsApiResponse>(
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Documents</Text>
        <Button mode="contained" onPress={() => setModalOpen(true)}>
          Add Document
        </Button>
      </View>

      {isLoading ? (
        <SectionLoading count={5} />
      ) : documents.length === 0 ? (
        <EmptyState label="No documents added yet." />
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

      <BikeDocumentFormModal
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
