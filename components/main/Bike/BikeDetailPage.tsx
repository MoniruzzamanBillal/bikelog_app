import { RemindersBanner } from "@/components/main/MaintenanceLog/RemindersBanner";
import { EfficiencyAlertBanner } from "@/components/main/Mileage/EfficiencyAlertBanner";
import {
  ActionMenu,
  EmptyState,
  ErrorState,
  Panel,
  RuleFade,
  ScreenHeader,
  SectionLoading,
} from "@/components/main/shared";
import { confirmDelete } from "@/components/main/shared/ConfirmDelete";
import { useDelete, useFetchData } from "@/hooks/useApi";
import { TBike } from "@/types/bike.types";
import { TMaintenanceType } from "@/types/catalog.types";
import { COLORS } from "@/utils/colors";
import { setLastUsedBike } from "@/utils/lastUsedBike";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { BikeFormModal } from "./BikeFormModal";
import { BikeStatStrip } from "./BikeStatStrip";

type TTile = {
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  segment: string;
};

const TILES: TTile[] = [
  { label: "Fuel Logs", icon: "gas-station", segment: "fuel-logs" },
  // ! D6: beside fuel, not after Documents — those are the two the rider opens weekly.
  { label: "Engine Oil", icon: "oil", segment: "engine-oil" },
  { label: "Mileage", icon: "speedometer-medium", segment: "mileage" },
  { label: "Maintenance", icon: "wrench-outline", segment: "maintenance-logs" },
  { label: "Spending", icon: "cash-multiple", segment: "spending" },
  { label: "Issues", icon: "alert-circle-outline", segment: "issues" },
  { label: "Accessories", icon: "shopping-outline", segment: "accessories" },
  { label: "AI Assistant", icon: "robot-outline", segment: "assistant" },
  { label: "Documents", icon: "file-document-outline", segment: "documents" },
  {
    label: "Manual",
    icon: "book-open-page-variant-outline",
    segment: "manual",
  },
];

export function BikeDetailPage() {
  const { bikeId } = useLocalSearchParams<{ bikeId: string }>();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useFetchData<TBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
    { enabled: !!bikeId },
  );
  const bike = data?.data;

  const { data: maintenanceTypesData } = useFetchData<TMaintenanceType[]>(
    ["maintenance-types"],
    "/maintenance-types",
  );
  const maintenanceTypes = maintenanceTypesData?.data ?? [];

  useEffect(() => {
    if (bikeId) setLastUsedBike(bikeId);
  }, [bikeId]);

  const deleteMutation = useDelete([["bikes"]]);

  const handleDelete = () => {
    confirmDelete("bike", async () => {
      await deleteMutation.mutateAsync({ url: `/bikes/${bikeId}` });
      router.replace("/");
    });
  };

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Loading…" backLabel="Garage" />
        <View style={styles.page}>
          <SectionLoading count={4} />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Bike" backLabel="Garage" />
        <View style={styles.page}>
          <ErrorState title="Couldn’t load this bike" onRetry={refetch} />
        </View>
      </View>
    );
  }

  if (!bike) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Bike" backLabel="Garage" />
        <View style={styles.page}>
          <EmptyState
            icon="alert-outline"
            title="Bike not found"
            message="It may have been deleted, or it belongs to another account."
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={bike?.nickname}
        subtitle={`${bike?.brand} ${bike?.model}`}
        backLabel="Garage"
      />

      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <Panel style={styles.odoPanel}>
          <View style={styles.odoTop}>
            <View>
              <Text style={styles.kicker}>ODOMETER</Text>
              <View style={styles.odoValueRow}>
                <Text style={styles.odoValue}>
                  {bike?.currentOdometer?.toLocaleString()}
                </Text>
                <Text style={styles.odoUnit}>km</Text>
              </View>
            </View>

            <ActionMenu
              outlined
              actions={[
                {
                  label: "Log fuel",
                  icon: "gas-station",
                  onPress: () =>
                    router.push(`/bikes/${bikeId}/fuel-logs/new` as never),
                },
                {
                  label: "Edit bike",
                  icon: "pencil-outline",
                  onPress: () => setEditOpen(true),
                },
                {
                  label: "Delete bike",
                  icon: "trash-can-outline",
                  destructive: true,
                  onPress: handleDelete,
                },
              ]}
            />
          </View>

          <RuleFade />

          <BikeStatStrip
            bikeId={bikeId}
            currentOdometer={bike?.currentOdometer}
            initialOdometer={bike?.initialOdometer}
          />
        </Panel>

        <RemindersBanner bikeId={bikeId} maintenanceTypes={maintenanceTypes} />
        <EfficiencyAlertBanner bikeId={bikeId} />

        <View style={styles.tileGrid}>
          {TILES.map((tile) => (
            <TouchableOpacity
              key={tile.segment}
              style={styles.tile}
              activeOpacity={0.8}
              onPress={() =>
                router.push(`/bikes/${bikeId}/${tile.segment}` as never)
              }
            >
              <MaterialCommunityIcons
                name={tile.icon}
                size={18}
                color={COLORS.accent}
              />
              <Text style={styles.tileLabel} numberOfLines={1}>
                {tile?.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <BikeFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initialBike={bike}
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
    paddingTop: 12,
    paddingBottom: 24,
    gap: 11,
  },
  odoPanel: {
    padding: 13,
    gap: 12,
  },
  odoTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  kicker: {
    fontSize: 10,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: COLORS.textLight,
  },
  odoValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  odoValue: {
    fontSize: 24,
    fontWeight: "500",
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },
  odoUnit: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  tileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  tile: {
    width: "31.7%",
    height: 76,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.edge,
    borderRadius: 10,
    padding: 12,
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  tileLabel: {
    fontSize: 12,
    color: COLORS.text,
  },
});
