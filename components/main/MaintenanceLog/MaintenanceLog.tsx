import { useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useLocalSearchParams } from "expo-router";
import { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { EmptyState, ErrorState, ScreenHeader, SectionLoading } from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { COLORS } from "@/utils/colors";
import { TBike } from "@/types/bike.types";
import { TEngineOilType, TMaintenanceType } from "@/types/catalog.types";
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

  const { data: bikeData } = useFetchData<TBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
    { enabled: !!bikeId },
  );
  const bike = bikeData?.data;

  const { data, isLoading, isError, refetch } = useFetchData<TMaintenanceLogsApiResponse>(
    ["maintenanceLogs", bikeId],
    `/bikes/${bikeId}/maintenance-logs?page=1&limit=${LIMIT}&sort=-serviceDate`,
    { enabled: !!bikeId },
  );
  const { data: mtData } = useFetchData<TMaintenanceType[]>(
    ["maintenance-types"],
    "/maintenance-types",
  );
  const { data: oilData } = useFetchData<TEngineOilType[]>(
    ["engine-oil-types"],
    "/engine-oil-types",
  );

  const logs = data?.data?.result ?? [];
  const maintenanceTypes = mtData?.data ?? [];
  const oilTypes = oilData?.data ?? [];

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Maintenance"
        backLabel={bike?.nickname ?? "Back"}
        rightIcon="plus"
        onRightPress={() => setModalOpen(true)}
      />

      <RemindersBanner
        bikeId={bikeId}
        maintenanceTypes={maintenanceTypes}
        style={styles.reminder}
      />

      {isLoading ? (
        <View style={styles.pad}>
          <SectionLoading count={5} />
        </View>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : logs.length === 0 ? (
        <EmptyState label="No maintenance logs yet." />
      ) : (
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
          <Text style={styles.sectionHeading}>Recent Services</Text>
          <View style={styles.listCard}>
            {logs.map((log, i) => (
              <MaintenanceLogCard
                key={log._id}
                log={log}
                bikeId={bikeId}
                maintenanceTypes={maintenanceTypes}
                oilTypes={oilTypes}
                openSwipeableRef={openSwipeableRef}
                isLast={i === logs.length - 1}
              />
            ))}
          </View>
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
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  reminder: {
    margin: 14,
    marginBottom: 0,
  },
  pad: {
    padding: 16,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  listCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
  },
});
