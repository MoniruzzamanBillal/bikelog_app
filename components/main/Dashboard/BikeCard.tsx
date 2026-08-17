import { BikeFormModal } from "@/components/main/Bike/BikeFormModal";
import { confirmDelete } from "@/components/main/shared/ConfirmDelete";
import { useDelete } from "@/hooks/useApi";
import { TBike } from "@/types/bike.types";
import { COLORS } from "@/utils/colors";
import { formatApiDate } from "@/utils/formatApiDate";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { StyleSheet, Text } from "react-native";
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
          activeOpacity={0.7}
        >
          <Text style={styles.nickname}>{bike.nickname}</Text>
          <Text style={styles.details}>
            {bike.brand} {bike.model}
          </Text>
          <Text style={styles.reg}>Reg: {bike.registrationNumber}</Text>
          <Text style={styles.reg}>
            Purchased: {formatApiDate(bike.purchaseDate, "dd MMM yyyy")}
          </Text>
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
    backgroundColor: COLORS.card,
    borderRadius: 6,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  nickname: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  details: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  reg: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  action: {
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderRadius: 6,
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
