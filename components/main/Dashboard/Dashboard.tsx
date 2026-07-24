import { BikeFormModal } from "@/components/main/Bike/BikeFormModal";
import { EmptyState, SectionLoading } from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { TBike } from "@/types/bike.types";
import { COLORS } from "@/utils/colors";
import { useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { Button, Text } from "react-native-paper";
import { BikeCard } from "./BikeCard";

export function Dashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const openSwipeableRef = useRef<SwipeableMethods | null>(null);

  const { data, isLoading, refetch } = useFetchData<TBike[]>(
    ["bikes"],
    "/bikes",
  );
  const bikes = data?.data ?? [];

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bikes</Text>
        <Button mode="contained" onPress={() => setModalOpen(true)}>
          Add Bike
        </Button>
      </View>

      {isLoading ? (
        <SectionLoading count={3} />
      ) : bikes.length === 0 ? (
        <EmptyState label="No bikes yet. Add one to get started." />
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {bikes.map((bike) => (
            <BikeCard
              key={bike._id}
              bike={bike}
              openSwipeableRef={openSwipeableRef}
            />
          ))}
        </ScrollView>
      )}

      <BikeFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
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
});
