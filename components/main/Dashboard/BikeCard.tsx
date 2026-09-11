import { BikeFormModal } from "@/components/main/Bike/BikeFormModal";
import { confirmDelete } from "@/components/main/shared/ConfirmDelete";
import { useDelete } from "@/hooks/useApi";
import { TBike } from "@/types/bike.types";
import { COLORS } from "@/utils/colors";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import Swipeable, {
  SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
interface BikeCardProps {
  bike: TBike;
  openSwipeableRef: React.MutableRefObject<SwipeableMethods | null>;
}

export function BikeCard({ bike, openSwipeableRef }: BikeCardProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const swipeableRef = useRef<SwipeableMethods>(null);

  const deleteMutation = useDelete([["bikes"]]);

  const handleSwipeableWillOpen = () => {
    if (
      openSwipeableRef.current &&
      openSwipeableRef.current !== swipeableRef.current
    ) {
      openSwipeableRef.current.close();
    }
    openSwipeableRef.current = swipeableRef.current;
  };

  const handleDelete = () => {
    swipeableRef.current?.close();
    confirmDelete("bike", async () => {
      await deleteMutation.mutateAsync({ url: `/bikes/${bike._id}` });
    });
  };

  const handleEdit = () => {
    swipeableRef.current?.close();
    setEditOpen(true);
  };

  return (
    <>
      <Swipeable
        ref={swipeableRef}
        onSwipeableWillOpen={handleSwipeableWillOpen}
        renderLeftActions={() => (
          <TouchableOpacity
            onPress={handleEdit}
            style={[styles.action, styles.editAction]}
          >
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
        )}
        renderRightActions={() => (
          <TouchableOpacity
            onPress={handleDelete}
            style={[styles.action, styles.deleteAction]}
          >
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        )}
      >
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/bikes/[bikeId]",
              params: { bikeId: bike._id },
            })
          }
          style={styles.card}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[COLORS.surface, "rgba(46,49,80,0.5)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerText}>
              <Text style={styles.nickname}>{bike.nickname}</Text>
              <Text style={styles.details}>
                {bike.brand} {bike.model}
              </Text>
            </View>
          </LinearGradient>

          <View style={styles.statsRow}>
            <View>
              <Text style={styles.statLabel}>Reg No.</Text>
              <Text style={styles.statValueMono}>
                {bike.registrationNumber}
              </Text>
            </View>
            <View style={styles.statCenter}>
              <Text style={styles.statLabel}>Odometer</Text>
              <Text style={styles.statValueOdo}>
                {bike.currentOdometer.toLocaleString()} km
              </Text>
            </View>
            <View style={styles.statRight}>
              <Text style={styles.statLabel}>Tank</Text>
              <Text style={styles.statValue}>
                {bike.fuelTankCapacityLiters}L
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>

      <BikeFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initialBike={bike}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    marginBottom: 10,
    overflow: "hidden",
  },
  header: {
    height: 96,
    justifyContent: "flex-end",
    padding: 14,
  },
  headerText: {
    zIndex: 1,
  },
  nickname: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  details: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
  },
  statCenter: {
    alignItems: "center",
  },
  statRight: {
    alignItems: "flex-end",
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  statValueMono: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.text,
    marginTop: 1,
    fontFamily: "monospace",
  },
  statValueOdo: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 1,
    fontFamily: "monospace",
  },
  statValue: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.text,
    marginTop: 1,
  },
  action: {
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderRadius: 10,
    height: "90%",
  },
  editAction: {
    backgroundColor: COLORS.success,
  },
  deleteAction: {
    backgroundColor: COLORS.danger,
  },
  actionText: {
    color: COLORS.white,
    fontWeight: "600",
  },
});
