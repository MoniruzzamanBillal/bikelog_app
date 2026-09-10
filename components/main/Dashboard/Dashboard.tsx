import { BikeFormModal } from "@/components/main/Bike/BikeFormModal";
import { EmptyState, ErrorState, SectionLoading } from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { TBike } from "@/types/bike.types";
import { COLORS } from "@/utils/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { Text } from "react-native-paper";
import { BikeCard } from "./BikeCard";

export function Dashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const openSwipeableRef = useRef<SwipeableMethods | null>(null);

  const { data, isLoading, isError, refetch } = useFetchData<TBike[]>(
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
      <View style={styles.navBar}>
        <Text style={styles.navTitle}>My Bikes</Text>
        <TouchableOpacity
          onPress={() => setModalOpen(true)}
          style={styles.navBtn}
          hitSlop={8}
        >
          <MaterialCommunityIcons name="plus" size={22} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.pad}>
          <SectionLoading count={3} />
        </View>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : bikes.length === 0 ? (
        <EmptyState label="No bikes yet. Tap + to add one." />
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
  },
  navBar: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  navTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.text,
  },
  navBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  pad: {
    padding: 16,
  },
});
