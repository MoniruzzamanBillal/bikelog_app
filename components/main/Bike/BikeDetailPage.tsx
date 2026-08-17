import { EmptyState, SectionLoading } from "@/components/main/shared";
import { confirmDelete } from "@/components/main/shared/ConfirmDelete";
import { useDelete, useFetchData } from "@/hooks/useApi";
import { TBike } from "@/types/bike.types";
import { COLORS } from "@/utils/colors";
import { formatApiDate } from "@/utils/formatApiDate";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Button, Text } from "react-native-paper";
import { BikeFormModal } from "./BikeFormModal";

type TTile = {
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  segment: string;
};

const TILES: TTile[] = [
  { label: "Fuel Logs", icon: "gas-station", segment: "fuel-logs" },
  { label: "Mileage", icon: "speedometer", segment: "mileage" },
  { label: "Maintenance", icon: "wrench", segment: "maintenance-logs" },
  { label: "Spending", icon: "cash-multiple", segment: "spending" },
  { label: "Issues", icon: "alert-circle-outline", segment: "issues" },
  { label: "Accessories", icon: "shopping-outline", segment: "accessories" },
  { label: "AI Assistant", icon: "robot-outline", segment: "assistant" },
  { label: "Documents", icon: "file-document-outline", segment: "documents" },
];

export function BikeDetailPage() {
  const { bikeId } = useLocalSearchParams<{ bikeId: string }>();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  const { data, isLoading } = useFetchData<TBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
    { enabled: !!bikeId },
  );
  const bike = data?.data;

  // console.log("bike = ", bike);

  const deleteMutation = useDelete([["bikes"]]);

  const handleDelete = () => {
    confirmDelete("bike", async () => {
      await deleteMutation.mutateAsync({ url: `/bikes/${bikeId}` });
      router.replace("/");
    });
  };

  if (isLoading) {
    return <SectionLoading count={1} />;
  }

  if (!bike) {
    return <EmptyState label="Bike not found." />;
  }

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.infoCard}>
        <Text style={styles.nickname}>{bike.nickname}</Text>
        <Text style={styles.details}>
          {bike.brand} {bike.model}
        </Text>
        <Text style={styles.detail}>Reg: {bike.registrationNumber}</Text>
        <Text style={styles.detail}>Tank: {bike.fuelTankCapacityLiters}L</Text>
        <Text style={styles.detail}>Odometer: {bike.currentOdometer} km</Text>
        <Text style={styles.detail}>
          Purchased: {formatApiDate(bike.purchaseDate, "dd MMM yyyy")}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button mode="contained" onPress={() => setEditOpen(true)}>
          Edit
        </Button>
        <Button
          mode="outlined"
          onPress={handleDelete}
          textColor={COLORS.danger}
          style={styles.deleteButton}
        >
          Delete
        </Button>
      </View>

      <View style={styles.tiles}>
        {TILES.map((tile) => (
          <TouchableOpacity
            key={tile.segment}
            style={styles.tile}
            // These destination routes don't exist until specs 07–12 build them,
            // so typed-routes has no type for them yet.
            onPress={() =>
              router.push(`/bikes/${bikeId}/${tile.segment}` as never)
            }
          >
            <MaterialCommunityIcons
              name={tile.icon}
              size={32}
              color={COLORS.primary}
            />
            <Text style={styles.tileLabel}>{tile.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <BikeFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initialBike={bike}
      />
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
  },
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 6,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  nickname: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
  },
  details: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 4,
  },
  detail: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  deleteButton: {
    borderColor: COLORS.danger,
  },
  tiles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 24,
  },
  tile: {
    width: "47%",
    backgroundColor: COLORS.card,
    borderRadius: 6,
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tileLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
});
