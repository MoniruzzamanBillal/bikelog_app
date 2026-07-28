import {
  accessoryStatusColors,
  accessoryUrgencyColors,
  ImagePickerField,
  StatusBadge,
  TPickedImageFile,
} from "@/components/main/shared";
import { confirmDelete } from "@/components/main/shared/ConfirmDelete";
import { useDelete, usePut } from "@/hooks/useApi";
import { TBikeAccessory } from "@/types/bike-accessory.types";
import { COLORS } from "@/utils/colors";
import { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import Swipeable, {
  SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import Toast from "react-native-toast-message";
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
  const { mutateAsync: uploadImage, isPending: isUploading } = usePut([
    ["accessories", bikeId],
  ]);
  const { mutateAsync: deleteImage, isPending: isDeletingImage } = useDelete([
    ["accessories", bikeId],
  ]);

  const handleImageUpload = async (file: TPickedImageFile) => {
    try {
      const formData = new FormData();
      formData.append("image", file as any);
      await uploadImage({
        url: `/bikes/${bikeId}/accessories/${accessory._id}/image`,
        payload: formData,
      });
      Toast.show({
        type: "success",
        text1: "Product image uploaded",
        position: "top",
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to upload image",
        position: "top",
      });
    }
  };

  const handleImageDelete = async () => {
    try {
      await deleteImage({
        url: `/bikes/${bikeId}/accessories/${accessory._id}/image`,
      });
      Toast.show({
        type: "success",
        text1: "Product image deleted",
        position: "top",
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to delete image",
        position: "top",
      });
    }
  };

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
          // onPress={handleEdit}
          style={styles.card}
          activeOpacity={0.7}
        >
          <View style={styles.cardBody}>
            <ImagePickerField
              label="Product"
              value={accessory.productImage}
              onUpload={handleImageUpload}
              onDelete={handleImageDelete}
              uploading={isUploading || isDeletingImage}
            />
            <View style={styles.cardContent}>
              <Text style={styles.name}>{accessory.name}</Text>
              {accessory.price !== undefined && (
                <Text style={styles.price}>
                  ৳{accessory.price.toFixed(2)}
                </Text>
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
            </View>
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
  cardBody: {
    flexDirection: "row",
    gap: 12,
  },
  cardContent: {
    flex: 1,
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
