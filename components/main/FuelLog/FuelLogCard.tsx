import {
  ImagePickerField,
  StatusBadge,
  TPickedImageFile,
} from "@/components/main/shared";
import { confirmDelete } from "@/components/main/shared/ConfirmDelete";
import { useDelete, usePut } from "@/hooks/useApi";
import { TFuelLog } from "@/types/fuel-log.types";
import { COLORS } from "@/utils/colors";
import { format } from "date-fns";
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
}

const fullTankColors = {
  true: { bg: COLORS.primary, text: COLORS.white },
};

export function FuelLogCard({
  fuelLog,
  bikeId,
  openSwipeableRef,
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
          // onPress={handleEdit}
          style={styles.card}
          activeOpacity={0.7}
        >
          <View style={styles.cardBody}>
            <ImagePickerField
              label="Receipt"
              value={fuelLog.receiptImage}
              onUpload={handleImageUpload}
              onDelete={handleImageDelete}
              uploading={isUploading || isDeletingImage}
            />
            <View style={styles.cardContent}>
              <View style={styles.row}>
                <Text style={styles.odometer}>
                  Odometer: {fuelLog.odometerReading} km
                </Text>
                <Text style={styles.date}>
                  {format(new Date(fuelLog.date), "dd MMM")}
                </Text>
              </View>
              <Text style={styles.details}>
                {fuelLog.litersAdded}L @ ৳{fuelLog.pricePerLiter}/L
              </Text>
              <Text style={styles.totalCost}>
                Total: ৳{totalCost.toFixed(2)}
              </Text>
              {fuelLog.isFullTank && (
                <View style={styles.badgeContainer}>
                  <StatusBadge
                    label="Full Tank"
                    colorKey="true"
                    colors={fullTankColors}
                  />
                </View>
              )}
            </View>
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  odometer: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  date: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  details: {
    fontSize: 14,
    color: COLORS.text,
    marginTop: 6,
  },
  totalCost: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 4,
  },
  badgeContainer: {
    marginTop: 8,
    alignSelf: "flex-start",
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
