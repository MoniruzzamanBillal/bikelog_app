import {
  ActionMenu,
  ImagePickerField,
  TPickedImageFile,
} from "@/components/main/shared";
import { confirmDelete } from "@/components/main/shared/ConfirmDelete";
import { Panel } from "@/components/main/shared/Panel";
import { toneStyle } from "@/components/main/shared/StatusBadge";
import { useDelete, usePut } from "@/hooks/useApi";
import { TFuelLog } from "@/types/fuel-log.types";
import { COLORS } from "@/utils/colors";
import { formatApiDate } from "@/utils/formatApiDate";
import { formatTaka } from "@/utils/formatTaka";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import Toast from "react-native-toast-message";
import { FuelLogFormModal } from "./FuelLogFormModal";

interface FuelLogCardProps {
  fuelLog: TFuelLog;
  bikeId: string;
  mileageKmPerLiter?: number;
  /** Set when the log belongs to a closed mileage period — edits are rejected. */
  lockedNote?: string;
}

export function FuelLogCard({
  fuelLog,
  bikeId,
  mileageKmPerLiter,
  lockedNote,
}: FuelLogCardProps) {
  const [editOpen, setEditOpen] = useState(false);

  const deleteMutation = useDelete([
    ["fuelLogs", bikeId],
    ["mileage", "history", bikeId],
    ["mileage", "lifetime", bikeId],
  ]);
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
        url: `/bikes/${bikeId}/fuel-logs/${fuelLog?._id}/image`,
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
        url: `/bikes/${bikeId}/fuel-logs/${fuelLog?._id}/image`,
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

  const handleDelete = () => {
    confirmDelete("fuel log", async () => {
      await deleteMutation.mutateAsync({
        url: `/bikes/${bikeId}/fuel-logs/${fuelLog?._id}`,
      });
    });
  };

  const totalCost = fuelLog?.litersAdded * fuelLog?.pricePerLiter;
  const tankTone = toneStyle(fuelLog?.isFullTank ? "success" : "neutral");
  const mileageTone = toneStyle("accent");

  return (
    <>
      <Panel style={styles.card}>
        <View style={styles.left}>
          <View style={styles.metaRow}>
            <Text style={styles.date}>
              {formatApiDate(fuelLog?.date, "dd MMM yyyy")}
            </Text>
            <View style={[styles.tag, { backgroundColor: tankTone.bg }]}>
              <Text style={[styles.tagText, { color: tankTone.text }]}>
                {fuelLog?.isFullTank ? "Full" : "Partial"}
              </Text>
            </View>
            {mileageKmPerLiter != null && (
              <View style={[styles.tag, { backgroundColor: mileageTone.bg }]}>
                <Text style={[styles.tagText, { color: mileageTone.text }]}>
                  {mileageKmPerLiter.toFixed(1)} km/l
                </Text>
              </View>
            )}
          </View>

          <View style={styles.costRow}>
            <Text style={styles.cost}>{formatTaka(totalCost)}</Text>
            <Text style={styles.costDetail}>
              {fuelLog?.litersAdded} L · ৳{fuelLog?.pricePerLiter}/L
            </Text>
          </View>

          <Text style={styles.odoLine} numberOfLines={1}>
            {fuelLog?.odometerReading?.toLocaleString()} km
            {fuelLog?.fuelStation ? ` · ${fuelLog?.fuelStation}` : ""}
          </Text>

          {lockedNote ? (
            <Text style={styles.lockedNote} numberOfLines={2}>
              {lockedNote}
            </Text>
          ) : null}
        </View>

        <View style={styles.right}>
          <ActionMenu
            size={16}
            style={styles.menuTrigger}
            actions={[
              {
                label: "Edit",
                icon: "pencil-outline",
                disabled: !!lockedNote,
                onPress: () => setEditOpen(true),
              },
              {
                label: "Delete",
                icon: "trash-can-outline",
                destructive: true,
                disabled: !!lockedNote,
                onPress: handleDelete,
              },
            ]}
          />

          <ImagePickerField
            label="Receipt"
            size={32}
            value={fuelLog.receiptImage}
            onUpload={handleImageUpload}
            onDelete={handleImageDelete}
            uploading={isUploading || isDeletingImage}
          />
        </View>
      </Panel>

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
    flexDirection: "row",
    gap: 12,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 14,
    paddingRight: 12,
  },
  left: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  right: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 6,
  },
  menuTrigger: {
    width: 32,
    height: 32,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  date: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  tag: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10.5,
  },
  costRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
  },
  cost: {
    fontSize: 18,
    fontWeight: "500",
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },
  costDetail: {
    fontSize: 13,
    color: COLORS.textLight,
    fontVariant: ["tabular-nums"],
  },
  odoLine: {
    fontSize: 12,
    color: COLORS.textLight,
    fontVariant: ["tabular-nums"],
  },
  lockedNote: {
    fontSize: 11.5,
    color: COLORS.warning,
  },
});
