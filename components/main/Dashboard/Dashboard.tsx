import { BikeFormModal } from "@/components/main/Bike/BikeFormModal";
import {
  EmptyState,
  ErrorState,
  PrimaryButton,
  ScreenHeader,
  SectionLoading,
} from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { TBike } from "@/types/bike.types";
import { COLORS } from "@/utils/colors";
import { useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
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

  const addButton = (
    <PrimaryButton onPress={() => setModalOpen(true)} icon="plus" compact>
      Add bike
    </PrimaryButton>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="My bikes" />

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
            {isLoading
              ? ""
              : `${bikes?.length} bike${bikes?.length === 1 ? "" : "s"}`}
          </Text>
          {addButton}
        </View>

        {isLoading ? (
          <SectionLoading count={3} />
        ) : isError ? (
          <ErrorState title="Couldn’t load your bikes" onRetry={refetch} />
        ) : bikes?.length === 0 ? (
          <EmptyState
            icon="motorbike"
            title="No bikes yet"
            message="Add your first bike to start logging fuel, service and spending."
            action={addButton}
          />
        ) : (
          <View style={styles.list}>
            {bikes.map((bike, i) => (
              <BikeCard
                key={bike._id}
                bike={bike}
                highlight={i === 0}
                openSwipeableRef={openSwipeableRef}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <BikeFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
