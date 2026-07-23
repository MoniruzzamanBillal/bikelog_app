import { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import Swipeable, {
  SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import {
  accessoryStatusColors,
  accessoryUrgencyColors,
  StatusBadge,
} from "@/components/main/shared";
import { confirmDelete } from "@/components/main/shared/ConfirmDelete";
import { useDelete } from "@/hooks/useApi";
import { COLORS } from "@/utils/colors";
import { TBikeAccessory } from "@/types/bike-accessory.types";
import { BikeAccessoryFormModal } from "./BikeAccessoryFormModal";

interface BikeAccessoryCardProps {
  accessory: TBikeAccessory;
  bikeId: string;
  openSwipeableRef: React.MutableRefObject<SwipeableMethods | null>;
}

export function BikeAccessoryCard({
  accessory,
  bikeId,
  openSwipeableRef,
}: BikeAccessoryCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const swipeableRef = useRef<SwipeableMethods>(null);

  const deleteMutation = useDelete([["accessories", bikeId]]);

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
    confirmDelete("accessory", async () => {
      await deleteMutation.mutateAsync({
        url: `/bikes/${bikeId}/accessories/${accessory._id}`,
      });
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
          onPress={handleEdit}
          style={styles.card}
          activeOpacity={0.7}
        >
          <Text style={styles.name}>{accessory.name}</Text>
          {accessory.price !== undefined && (
            <Text style={styles.price}>৳{accessory.price.toFixed(2)}</Text>
          )}
          <View style={styles.badgesRow}>
            <StatusBadge
              label={accessory.urgency}
              colorKey={accessory.urgency}
              colors={accessoryUrgencyColors}
            />
            <StatusBadge
              label={accessory.status}
              colorKey={accessory.status}
              colors={accessoryStatusColors}
            />
          </View>
        </TouchableOpacity>
      </Swipeable>

      <BikeAccessoryFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        bikeId={bikeId}
        initialAccessory={accessory}
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
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  price: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  badgesRow: {
    flexDirection: "row",
    gap: 8,
  },
  action: {
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderRadius: 6,
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
