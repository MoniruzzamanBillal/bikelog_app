import { ImagePickerField, TPickedImageFile } from "@/components/main/shared";
import { confirmDelete } from "@/components/main/shared/ConfirmDelete";
import { useDelete, usePatch, usePut } from "@/hooks/useApi";
import { TBikeAccessory } from "@/types/bike-accessory.types";
import { COLORS } from "@/utils/colors";
import { format } from "date-fns";
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

const URGENCY_LABEL: Record<string, string> = {
  immediate: "Immediate",
  medium: "Medium",
  low: "Low",
};

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "rgba(251,191,36,0.1)", text: COLORS.warning, label: "Pending" },
  purchased: { bg: "rgba(74,222,128,0.1)", text: COLORS.success, label: "Purchased" },
  cancelled: { bg: "rgba(255,255,255,0.07)", text: COLORS.textLight, label: "Cancelled" },
};

export function BikeAccessoryCard({
  accessory,
  bikeId,
  openSwipeableRef,
}: BikeAccessoryCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const swipeableRef = useRef<SwipeableMethods>(null);

  const deleteMutation = useDelete([["accessories", bikeId]]);
  const markPurchasedMutation = usePatch([["accessories", bikeId]]);
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
      Toast.show({ type: "success", text1: "Product image uploaded", position: "top" });
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
      Toast.show({ type: "success", text1: "Product image deleted", position: "top" });
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

  const handleMarkPurchased = async () => {
    // A price is required server-side to mark purchased — if none is set yet,
    // send the user to the form instead of firing a request that will 400.
    if (accessory.price === undefined) {
      setEditOpen(true);
      return;
    }
    try {
      await markPurchasedMutation.mutateAsync({
        url: `/bikes/${bikeId}/accessories/${accessory._id}`,
        payload: { status: "purchased" },
      });
      Toast.show({ type: "success", text1: "Marked as purchased", position: "top" });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to update",
        position: "top",
      });
    }
  };

  const statusBadge = STATUS_BADGE[accessory.status];

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
        <View style={styles.card}>
          <View style={styles.cardBody}>
            <ImagePickerField
              label="Product"
              value={accessory.productImage}
              onUpload={handleImageUpload}
              onDelete={handleImageDelete}
              uploading={isUploading || isDeletingImage}
            />
            <View style={styles.cardContent}>
              <View style={styles.titleRow}>
                <Text style={styles.name}>{accessory.name}</Text>
                <View style={[styles.badge, { backgroundColor: statusBadge.bg }]}>
                  <Text style={[styles.badgeText, { color: statusBadge.text }]}>
                    {statusBadge.label}
                  </Text>
                </View>
              </View>

              {accessory.status === "purchased" && accessory.purchaseDate ? (
                <Text style={styles.meta}>
                  Purchased {format(new Date(accessory.purchaseDate), "dd MMM yyyy")}
                </Text>
              ) : (
                <Text style={styles.meta}>
                  Urgency: {URGENCY_LABEL[accessory.urgency]}
                </Text>
              )}

              {accessory.price !== undefined && (
                <Text style={styles.price}>৳{accessory.price.toLocaleString()}</Text>
              )}

              {accessory.status === "pending" && (
                <TouchableOpacity onPress={handleMarkPurchased} style={styles.markButton}>
                  <Text style={styles.markButtonText}>Mark Purchased</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
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
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  cardBody: {
    flexDirection: "row",
    gap: 12,
  },
  cardContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 20,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  meta: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 3,
  },
  price: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: "monospace",
    marginTop: 8,
  },
  markButton: {
    alignSelf: "flex-start",
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  markButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.accent,
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
