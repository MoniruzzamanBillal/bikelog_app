import {
  EmptyState,
  ErrorState,
  PrimaryButton,
  ScreenHeader,
  SectionLoading,
} from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { TBike } from "@/types/bike.types";
import { TEngineOilType, TMaintenanceType } from "@/types/catalog.types";
import { TMaintenanceLogsApiResponse } from "@/types/maintenance-log.types";
import { COLORS } from "@/utils/colors";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaintenanceLogCard } from "./MaintenanceLogCard";
import { MaintenanceLogFormModal } from "./MaintenanceLogFormModal";
import { RemindersBanner } from "./RemindersBanner";

const LIMIT = 20;

export function MaintenanceLog() {
  const { bikeId } = useLocalSearchParams<{ bikeId: string }>();
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: bikeData } = useFetchData<TBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
    { enabled: !!bikeId },
  );
  const bike = bikeData?.data;

  const { data, isLoading, isError, refetch } =
    useFetchData<TMaintenanceLogsApiResponse>(
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

  const addButton = (
    <PrimaryButton onPress={() => setModalOpen(true)} icon="plus" compact>
      Add
    </PrimaryButton>
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Maintenance"
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
            {isLoading ? "" : `${logs.length} services logged`}
          </Text>
          {addButton}
        </View>

        <RemindersBanner bikeId={bikeId} maintenanceTypes={maintenanceTypes} />

        {isLoading ? (
          <SectionLoading count={4} />
        ) : isError ? (
          <ErrorState title="Couldn’t load service history" onRetry={refetch} />
        ) : logs.length === 0 ? (
          <EmptyState
            icon="wrench-outline"
            title="No service history yet"
            message="Log a service with an interval (km) or a next due date and Bike Log will remind you when it's due."
            action={
              <PrimaryButton
                onPress={() => setModalOpen(true)}
                icon="plus"
                compact
              >
                Add service
              </PrimaryButton>
            }
          />
        ) : (
          <View style={styles.list}>
            {logs.map((log) => (
              <MaintenanceLogCard
                key={log._id}
                log={log}
                bikeId={bikeId}
                maintenanceTypes={maintenanceTypes}
                oilTypes={oilTypes}
              />
            ))}
          </View>
        )}
      </ScrollView>

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
});
