import { ImagePickerField, TPickedImageFile } from "@/components/main/shared";
import { confirmDelete } from "@/components/main/shared/ConfirmDelete";
import { useDelete, usePut } from "@/hooks/useApi";
import { TEngineOilType, TMaintenanceType } from "@/types/catalog.types";
import { TMaintenanceLog } from "@/types/maintenance-log.types";
import { COLORS } from "@/utils/colors";
import { formatApiDate } from "@/utils/formatApiDate";
import { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import Swipeable, {
  SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import Toast from "react-native-toast-message";
import { MaintenanceLogFormModal } from "./MaintenanceLogFormModal";

interface MaintenanceLogCardProps {
  log: TMaintenanceLog;
  bikeId: string;
  maintenanceTypes: TMaintenanceType[];
  oilTypes: TEngineOilType[];
  openSwipeableRef: React.MutableRefObject<SwipeableMethods | null>;
  isLast?: boolean;
}

function getTypeName(
  log: TMaintenanceLog,
  maintenanceTypes: TMaintenanceType[],
): string {
  if (typeof log.maintenanceType === "object" && log.maintenanceType?.name) {
    return log.maintenanceType.name;
  }
  const typeId =
    typeof log.maintenanceType === "string" ? log.maintenanceType : undefined;
  return maintenanceTypes.find((t) => t._id === typeId)?.name ?? "Maintenance";
}

function getOilTypeName(
  log: TMaintenanceLog,
  oilTypes: TEngineOilType[],
): string | undefined {
  if (typeof log.oilType === "object" && log.oilType?.name) {
    return log.oilType.name;
  }
  const oilId = typeof log.oilType === "string" ? log.oilType : undefined;
  return oilId ? oilTypes.find((o) => o._id === oilId)?.name : undefined;
}

export function MaintenanceLogCard({
  log,
  bikeId,
  maintenanceTypes,
  oilTypes,
  openSwipeableRef,
  isLast,
}: MaintenanceLogCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const swipeableRef = useRef<SwipeableMethods>(null);

  const deleteMutation = useDelete([
    ["maintenanceLogs", bikeId],
    ["reminders", bikeId],
  ]);
  const { mutateAsync: uploadImage, isPending: isUploading } = usePut([
    ["maintenanceLogs", bikeId],
  ]);
  const { mutateAsync: deleteImage, isPending: isDeletingImage } = useDelete([
    ["maintenanceLogs", bikeId],
  ]);

  const handleImageUpload = async (file: TPickedImageFile) => {
    try {
      const formData = new FormData();
      formData.append("image", file as any);
      await uploadImage({
        url: `/bikes/${bikeId}/maintenance-logs/${log._id}/image`,
        payload: formData,
      });
      Toast.show({
        type: "success",
        text1: "Service image uploaded",
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
        url: `/bikes/${bikeId}/maintenance-logs/${log._id}/image`,
      });
      Toast.show({
        type: "success",
        text1: "Service image deleted",
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
    confirmDelete("maintenance log", async () => {
      await deleteMutation.mutateAsync({
        url: `/bikes/${bikeId}/maintenance-logs/${log._id}`,
      });
    });
  };

  const handleEdit = () => {
    swipeableRef.current?.close();
    setEditOpen(true);
  };

  const oilTypeName = getOilTypeName(log, oilTypes);
  const parts = log.partsReplaced?.filter(Boolean) ?? [];
  const primaryDetail = oilTypeName ?? (parts.length > 0 ? parts.join(", ") : null);

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
            label="Service"
            value={log.serviceImage}
            onUpload={handleImageUpload}
            onDelete={handleImageDelete}
            uploading={isUploading || isDeletingImage}
          />

          <View style={styles.left}>
            <Text style={styles.typeName}>{getTypeName(log, maintenanceTypes)}</Text>
            <Text style={styles.details}>
              {primaryDetail ? `${primaryDetail} · ` : ""}৳{log.cost.toLocaleString()}
            </Text>
            <Text style={styles.meta}>
              {log.serviceCenter ?? "—"} · {log.odometerReading.toLocaleString()} km
            </Text>
            {log.nextDueOdometer !== undefined && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  Next: {log.nextDueOdometer.toLocaleString()} km
                </Text>
              </View>
            )}
            {log.notes && <Text style={styles.notes}>{log.notes}</Text>}
          </View>

          <Text style={styles.date}>{formatApiDate(log.serviceDate, "dd MMM")}</Text>
        </TouchableOpacity>
      </Swipeable>

      <MaintenanceLogFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        bikeId={bikeId}
        log={log}
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
  typeName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  details: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  meta: {
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
    backgroundColor: "rgba(251,191,36,0.1)",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.warning,
  },
  notes: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: "italic",
    marginTop: 5,
  },
  date: {
    fontSize: 11,
    color: COLORS.textMuted,
    flexShrink: 0,
  },
  action: {
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: "100%",
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
