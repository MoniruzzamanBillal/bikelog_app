import {
  ActionMenu,
  ImagePickerField,
  Panel,
  TPickedImageFile,
} from "@/components/main/shared";
import { confirmDelete } from "@/components/main/shared/ConfirmDelete";
import { toneStyle, TStatusTone } from "@/components/main/shared/StatusBadge";
import { useDelete, usePatch, usePut } from "@/hooks/useApi";
import { TBikeAccessory } from "@/types/bike-accessory.types";
import { COLORS } from "@/utils/colors";
import { formatTaka } from "@/utils/formatTaka";
import { format } from "date-fns";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import Toast from "react-native-toast-message";
import { BikeAccessoryFormModal } from "./BikeAccessoryFormModal";

interface BikeAccessoryCardProps {
  accessory: TBikeAccessory;
  bikeId: string;
}

const URGENCY: Record<string, { label: string; tone: TStatusTone }> = {
  immediate: { label: "Immediate", tone: "danger" },
  medium: { label: "Medium", tone: "warning" },
  low: { label: "Low", tone: "neutral" },
};

export function BikeAccessoryCard({
  accessory,
  bikeId,
}: BikeAccessoryCardProps) {
  const [editOpen, setEditOpen] = useState(false);

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

  const handleDelete = () => {
    confirmDelete("accessory", async () => {
      await deleteMutation.mutateAsync({
        url: `/bikes/${bikeId}/accessories/${accessory._id}`,
      });
    });
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
      Toast.show({
        type: "success",
        text1: "Marked as purchased",
        position: "top",
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to update",
        position: "top",
      });
    }
  };

  const urgency = URGENCY[accessory.urgency] ?? {
    label: accessory.urgency,
    tone: "neutral" as TStatusTone,
  };
  const urgencyTone = toneStyle(urgency.tone);
  const isCancelled = accessory.status === "cancelled";

  return (
    <>
      <Panel style={[styles.card, isCancelled && styles.cardCancelled]}>
        <ImagePickerField
          label="Product"
          size={56}
          value={accessory.productImage}
          onUpload={handleImageUpload}
          onDelete={handleImageDelete}
          uploading={isUploading || isDeletingImage}
        />

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={2}>
              {accessory.name}
            </Text>
            <ActionMenu
              size={16}
              style={styles.menuTrigger}
              actions={[
                ...(accessory.status === "pending"
                  ? [
                      {
                        label: "Mark purchased",
                        icon: "check" as const,
                        onPress: handleMarkPurchased,
                      },
                    ]
                  : []),
                {
                  label: "Edit",
                  icon: "pencil-outline",
                  onPress: () => setEditOpen(true),
                },
                {
                  label: "Delete",
                  icon: "trash-can-outline",
                  destructive: true,
                  onPress: handleDelete,
                },
              ]}
            />
          </View>

          <View style={styles.metaRow}>
            <View style={[styles.pill, { backgroundColor: urgencyTone.bg }]}>
              <Text style={[styles.pillText, { color: urgencyTone.text }]}>
                {urgency.label}
              </Text>
            </View>
            <Text
              style={
                accessory.price !== undefined ? styles.price : styles.noPrice
              }
            >
              {accessory.price !== undefined
                ? formatTaka(accessory.price)
                : "No price"}
            </Text>
          </View>

          {accessory.status === "purchased" && accessory.purchaseDate ? (
            <Text style={styles.purchased}>
              Purchased {format(new Date(accessory.purchaseDate), "dd MMM yyyy")}
            </Text>
          ) : null}
        </View>
      </Panel>

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
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  cardCancelled: {
    opacity: 0.6,
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "500",
    color: COLORS.text,
  },
  menuTrigger: {
    width: 32,
    height: 32,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pillText: {
    fontSize: 11,
  },
  price: {
    fontSize: 13.5,
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },
  noPrice: {
    fontSize: 13.5,
    color: COLORS.textLight,
  },
  purchased: {
    fontSize: 12,
    color: COLORS.textLight,
  },
});
