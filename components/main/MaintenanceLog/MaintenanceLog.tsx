import { useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { useLocalSearchParams } from "expo-router";
import { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { EmptyState, SectionLoading } from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { COLORS } from "@/utils/colors";
import { TMaintenanceType } from "@/types/catalog.types";
import { TMaintenanceLogsApiResponse } from "@/types/maintenance-log.types";
import { MaintenanceLogCard } from "./MaintenanceLogCard";
import { MaintenanceLogFormModal } from "./MaintenanceLogFormModal";
import { RemindersBanner } from "./RemindersBanner";

const LIMIT = 20;

export function MaintenanceLog() {
  const { bikeId } = useLocalSearchParams<{ bikeId: string }>();
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const openSwipeableRef = useRef<SwipeableMethods | null>(null);

  const { data, isLoading, refetch } = useFetchData<TMaintenanceLogsApiResponse>(
    ["maintenanceLogs", bikeId],
    `/bikes/${bikeId}/maintenance-logs?page=1&limit=${LIMIT}&sort=-serviceDate`,
    { enabled: !!bikeId },
  );
  const { data: mtData } = useFetchData<TMaintenanceType[]>(
    ["maintenance-types"],
    "/maintenance-types",
  );

  const logs = data?.data?.result ?? [];
  const maintenanceTypes = mtData?.data ?? [];

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <RemindersBanner bikeId={bikeId} maintenanceTypes={maintenanceTypes} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Maintenance Logs</Text>
        <Button
          mode="contained"
          onPress={() => setModalOpen(true)}
        >
          Add Log
        </Button>
      </View>

      {isLoading ? (
        <SectionLoading count={5} />
      ) : logs.length === 0 ? (
        <EmptyState label="No maintenance logs yet." />
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {logs.map((log) => (
            <MaintenanceLogCard
              key={log._id}
              log={log}
              bikeId={bikeId}
              maintenanceTypes={maintenanceTypes}
              openSwipeableRef={openSwipeableRef}
            />
          ))}
        </ScrollView>
      )}

      <MaintenanceLogFormModal
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
    marginVertical: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
  },
});
