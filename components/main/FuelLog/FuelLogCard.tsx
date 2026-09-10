import { ImagePickerField, TPickedImageFile } from "@/components/main/shared";
import { confirmDelete } from "@/components/main/shared/ConfirmDelete";
import { useDelete, usePut } from "@/hooks/useApi";
import { TFuelLog } from "@/types/fuel-log.types";
import { COLORS } from "@/utils/colors";
import { formatApiDate } from "@/utils/formatApiDate";
import { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import Swipeable, {
  SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import Toast from "react-native-toast-message";
import { FuelLogFormModal } from "./FuelLogFormModal";

interface FuelLogCardProps {
  fuelLog: TFuelLog;
  bikeId: string;
  openSwipeableRef: React.MutableRefObject<SwipeableMethods | null>;
  isLast?: boolean;
}

export function FuelLogCard({
  fuelLog,
  bikeId,
  openSwipeableRef,
  isLast,
}: FuelLogCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const swipeableRef = useRef<SwipeableMethods>(null);

  const deleteMutation = useDelete([["fuelLogs", bikeId]]);
  const { mutateAsync: uploadImage, isPending: isUploading } = usePut([
    ["fuelLogs", bikeId],
  ]);
  const { mutateAsync: deleteImage, isPending: isDeletingImage } = useDelete([
    ["fuelLogs", bikeId],
  ]);

  const handleImageUpload = async (file: TPickedImageFile) => {
    try {
      const formData = new FormData();
      formData.append("image", file as any);
      await uploadImage({
        url: `/bikes/${bikeId}/fuel-logs/${fuelLog._id}/image`,
        payload: formData,
      });
      Toast.show({
        type: "success",
        text1: "Receipt image uploaded",
        position: "top",
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to upload receipt image",
        position: "top",
      });
    }
  };

  const handleImageDelete = async () => {
    try {
      await deleteImage({
        url: `/bikes/${bikeId}/fuel-logs/${fuelLog._id}/image`,
      });
      Toast.show({
        type: "success",
        text1: "Receipt image deleted",
        position: "top",
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to delete receipt image",
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
    confirmDelete("fuel log", async () => {
      await deleteMutation.mutateAsync({
        url: `/bikes/${bikeId}/fuel-logs/${fuelLog._id}`,
      });
    });
  };

  const handleEdit = () => {
    swipeableRef.current?.close();
    setEditOpen(true);
  };

  const totalCost = fuelLog.litersAdded * fuelLog.pricePerLiter;

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
          style={[styles.row, isLast && styles.rowLast]}
          activeOpacity={0.7}
        >
          <ImagePickerField
            label="Receipt"
            value={fuelLog.receiptImage}
            onUpload={handleImageUpload}
            onDelete={handleImageDelete}
            uploading={isUploading || isDeletingImage}
          />

          <View style={styles.left}>
            <Text style={styles.odometer}>
              {fuelLog.odometerReading.toLocaleString()} km
            </Text>
            <Text style={styles.details}>
              {fuelLog.litersAdded}L · ৳{fuelLog.pricePerLiter}/L
            </Text>
            {fuelLog.fuelStation && (
              <Text style={styles.station}>{fuelLog.fuelStation}</Text>
            )}
            {fuelLog.isFullTank && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Full Tank</Text>
              </View>
            )}
          </View>

          <View style={styles.right}>
            <Text style={styles.cost}>৳{totalCost.toFixed(0)}</Text>
            <Text style={styles.date}>{formatApiDate(fuelLog.date, "dd MMM")}</Text>
          </View>
        </TouchableOpacity>
      </Swipeable>

      <FuelLogFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        bikeId={bikeId}
        initialFuelLog={fuelLog}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    padding: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  left: {
    flex: 1,
  },
  right: {
    alignItems: "flex-end",
    flexShrink: 0,
  },
  odometer: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  details: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  station: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  badge: {
    alignSelf: "flex-start",
    marginTop: 5,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 20,
    backgroundColor: "rgba(145,132,217,0.15)",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.accent,
  },
  cost: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    fontFamily: "monospace",
  },
  date: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 3,
  },
  action: {
    justifyContent: "center",
    alignItems: "center",
    width: 80,
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
