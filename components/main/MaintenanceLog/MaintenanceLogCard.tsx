import {
  ImagePickerField,
  Panel,
  TPickedImageFile,
} from "@/components/main/shared";
import { confirmDelete } from "@/components/main/shared/ConfirmDelete";
import { toneStyle } from "@/components/main/shared/StatusBadge";
import { useDelete, usePut } from "@/hooks/useApi";
import { TEngineOilType, TMaintenanceType } from "@/types/catalog.types";
import { TMaintenanceLog } from "@/types/maintenance-log.types";
import { COLORS } from "@/utils/colors";
import { formatApiDate } from "@/utils/formatApiDate";
import { formatTaka } from "@/utils/formatTaka";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import Toast from "react-native-toast-message";
import { MaintenanceLogFormModal } from "./MaintenanceLogFormModal";

interface MaintenanceLogCardProps {
  log: TMaintenanceLog;
  bikeId: string;
  maintenanceTypes: TMaintenanceType[];
  oilTypes: TEngineOilType[];
}

function getTypeName(
  log: TMaintenanceLog,
  maintenanceTypes: TMaintenanceType[],
): string {
  if (typeof log?.maintenanceType === "object" && log?.maintenanceType?.name) {
    return log?.maintenanceType?.name;
  }
  const typeId =
    typeof log?.maintenanceType === "string" ? log?.maintenanceType : undefined;
  return maintenanceTypes.find((t) => t?._id === typeId)?.name ?? "Maintenance";
}

function getOilTypeName(
  log: TMaintenanceLog,
  oilTypes: TEngineOilType[],
): string | undefined {
  if (typeof log?.oilType === "object" && log?.oilType?.name) {
    return log?.oilType?.name;
  }
  const oilId = typeof log?.oilType === "string" ? log?.oilType : undefined;
  return oilId ? oilTypes.find((o) => o?._id === oilId)?.name : undefined;
}

export function MaintenanceLogCard({
  log,
  bikeId,
  maintenanceTypes,
  oilTypes,
}: MaintenanceLogCardProps) {
  const [editOpen, setEditOpen] = useState(false);

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
        url: `/bikes/${bikeId}/maintenance-logs/${log?._id}/image`,
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
        url: `/bikes/${bikeId}/maintenance-logs/${log?._id}/image`,
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

  const handleDelete = () => {
    confirmDelete("maintenance log", async () => {
      await deleteMutation.mutateAsync({
        url: `/bikes/${bikeId}/maintenance-logs/${log?._id}`,
      });
    });
  };

  const oilTypeName = getOilTypeName(log, oilTypes);
  const parts = log?.partsReplaced?.filter(Boolean) ?? [];
  const oilTone = toneStyle("accent");
  const neutralTone = toneStyle("neutral");

  // ! `!= null`, not `!== undefined`: the backend sends an explicit `null` for an
  // ! unset optional number rather than omitting the key, so an `undefined`-only
  // ! guard lets `null` through and throws on `.toLocaleString()`.
  const nextDue =
    log?.nextDueOdometer != null
      ? `${log?.nextDueOdometer?.toLocaleString()} km`
      : log?.nextDueDate
        ? formatApiDate(log?.nextDueDate, "dd MMM yyyy")
        : "—";

  return (
    <>
      <Panel style={styles.card}>
        <View style={styles.topRow}>
          <ImagePickerField
            label="Service"
            size={64}
            value={log.serviceImage}
            onUpload={handleImageUpload}
            onDelete={handleImageDelete}
            uploading={isUploading || isDeletingImage}
          />

          <View style={styles.titleCol}>
            <View style={styles.titleLine}>
              <Text style={styles.typeName} numberOfLines={1}>
                {getTypeName(log, maintenanceTypes)}
              </Text>
              {oilTypeName ? (
                <View style={[styles.tag, { backgroundColor: oilTone.bg }]}>
                  <Text style={[styles.tagText, { color: oilTone.text }]}>
                    {oilTypeName}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.meta}>
              {formatApiDate(log?.serviceDate, "dd MMM yyyy")} ·{" "}
              {log?.odometerReading?.toLocaleString()} km
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => setEditOpen(true)}
              style={styles.iconButton}
              hitSlop={6}
            >
              <MaterialCommunityIcons
                name="pencil-outline"
                size={16}
                color={COLORS.textLight}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDelete}
              style={styles.iconButton}
              hitSlop={6}
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={16}
                color={COLORS.danger}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.grid}>
          <View style={styles.gridCell}>
            <Text style={styles.gridLabel}>Cost</Text>
            <Text style={styles.gridValue}>{formatTaka(log?.cost ?? 0)}</Text>
          </View>
          <View style={styles.gridCell}>
            <Text style={styles.gridLabel}>Interval</Text>
            <Text style={styles.gridValue}>
              {log?.intervalKmUsed != null
                ? `${log?.intervalKmUsed?.toLocaleString()} km`
                : "—"}
            </Text>
          </View>
          <View style={styles.gridCell}>
            <Text style={styles.gridLabel}>Next due</Text>
            <Text style={styles.gridValue}>{nextDue}</Text>
          </View>
        </View>

        {(log?.serviceCenter || parts?.length > 0) && (
          <View style={styles.tagRow}>
            {log?.serviceCenter ? (
              <View style={[styles.tag, { backgroundColor: neutralTone.bg }]}>
                <Text style={[styles.tagText, { color: neutralTone.text }]}>
                  {log?.serviceCenter}
                </Text>
              </View>
            ) : null}
            {parts.map((part) => (
              <View
                key={part}
                style={[styles.tag, { backgroundColor: neutralTone.bg }]}
              >
                <Text style={[styles.tagText, { color: neutralTone.text }]}>
                  {part}
                </Text>
              </View>
            ))}
          </View>
        )}

        {log?.notes ? <Text style={styles.notes}>{log?.notes}</Text> : null}
      </Panel>

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
  card: {
    padding: 14,
    gap: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  titleCol: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  titleLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  typeName: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.text,
  },
  meta: {
    fontSize: 12,
    color: COLORS.textLight,
    fontVariant: ["tabular-nums"],
  },
  actions: {
    flexDirection: "row",
    gap: 2,
  },
  iconButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  grid: {
    flexDirection: "row",
    gap: 8,
  },
  gridCell: {
    flex: 1,
    minWidth: 0,
  },
  gridLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  gridValue: {
    fontSize: 13.5,
    fontWeight: "500",
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
  },
  notes: {
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.textLight,
  },
});
