import { useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { useLocalSearchParams } from "expo-router";
import { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { EmptyState, SectionLoading } from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { COLORS } from "@/utils/colors";
import { TFuelLogsApiResponse } from "@/types/fuel-log.types";
import { FuelLogCard } from "./FuelLogCard";
import { FuelLogFormModal } from "./FuelLogFormModal";

const LIMIT = 10;

export function FuelLog() {
  const { bikeId } = useLocalSearchParams<{ bikeId: string }>();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const openSwipeableRef = useRef<SwipeableMethods | null>(null);

  const { data, isLoading, refetch } = useFetchData<TFuelLogsApiResponse>(
    ["fuelLogs", bikeId, page.toString()],
    `/bikes/${bikeId}/fuel-logs?page=${page}&limit=${LIMIT}&sort=-date`,
    { enabled: !!bikeId },
  );

  const fuelLogs = data?.data?.result ?? [];
  const totalPages = Math.ceil((data?.data?.meta ?? 0) / LIMIT) || 1;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fuel Logs</Text>
        <Button
          mode="contained"
          onPress={() => setModalOpen(true)}
          labelStyle={{ color: COLORS.white }}
        >
          Add Log
        </Button>
      </View>

      {isLoading ? (
        <SectionLoading count={5} />
      ) : fuelLogs.length === 0 ? (
        <EmptyState label="No fuel logs yet. Track your fill-ups here." />
      ) : (
        <>
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            showsVerticalScrollIndicator={false}
          >
            {fuelLogs.map((log) => (
              <FuelLogCard
                key={log._id}
                fuelLog={log}
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

      <FuelLogFormModal
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
