import {
  ActionMenu,
  ImagePickerField,
  TPickedImageFile,
} from "@/components/main/shared";
import { confirmDelete } from "@/components/main/shared/ConfirmDelete";
import { Panel } from "@/components/main/shared/Panel";
import { toneStyle } from "@/components/main/shared/StatusBadge";
import { useDelete, usePut } from "@/hooks/useApi";
import { TEngineOilType } from "@/types/catalog.types";
import { TEngineOilLog } from "@/types/engine-oil-log.types";
import { COLORS } from "@/utils/colors";
import { formatApiDate } from "@/utils/formatApiDate";
import { formatTaka } from "@/utils/formatTaka";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import Toast from "react-native-toast-message";
import { EngineOilLogFormModal } from "./EngineOilLogFormModal";

interface EngineOilLogCardProps {
  log: TEngineOilLog;
  bikeId: string;
  oilTypes: TEngineOilType[];
}

/**
 * ! The three oil-type shapes, read in the one place that knows about them: populated
 * ! object, bare id, or null. A direct port of `MaintenanceLogCard`'s `getOilTypeName` —
 * ! the catalog fallback stays for the reason spec 45a kept it, that a deployment
 * ! predating the populate still sends a bare id.
 */
function getOilName(
  log: TEngineOilLog,
  oilTypes: TEngineOilType[],
): string | undefined {
  if (typeof log?.oilType === "object" && log?.oilType?.name) {
    return log?.oilType?.name;
  }
  const oilId = typeof log?.oilType === "string" ? log?.oilType : undefined;
  return oilId ? oilTypes.find((o) => o?._id === oilId)?.name : undefined;
}

export function EngineOilLogCard({
  log,
  bikeId,
  oilTypes,
}: EngineOilLogCardProps) {
  const [editOpen, setEditOpen] = useState(false);

  const invalidate = [
    ["engineOilLogs", bikeId],
    ["engineOilStatus", bikeId],
    ["bikes", bikeId],
    ["spending", bikeId],
    ["reminders", bikeId],
  ];
  const deleteMutation = useDelete(invalidate);
  const { mutateAsync: uploadImage, isPending: isUploading } =
    usePut(invalidate);
  const { mutateAsync: deleteImage, isPending: isDeletingImage } =
    useDelete(invalidate);

  const handleImageUpload = async (file: TPickedImageFile) => {
    try {
      const formData = new FormData();
      formData.append("image", file as any);
      await uploadImage({
        url: `/bikes/${bikeId}/engine-oil-logs/${log?._id}/image`,
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
        url: `/bikes/${bikeId}/engine-oil-logs/${log?._id}/image`,
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
    confirmDelete("engine oil log", async () => {
      await deleteMutation.mutateAsync({
        url: `/bikes/${bikeId}/engine-oil-logs/${log?._id}`,
      });
    });
  };

  const oilName = getOilName(log, oilTypes);
  const oilTone = toneStyle("accent");
  const filterTone = toneStyle("neutral");

  return (
    <>
      <Panel style={styles.card}>
        <View style={styles.left}>
          <View style={styles.metaRow}>
            <Text style={styles.date}>
              {formatApiDate(log?.changeDate, "dd MMM yyyy")}
            </Text>
            {oilName ? (
              <View style={[styles.tag, { backgroundColor: oilTone.bg }]}>
                <Text style={[styles.tagText, { color: oilTone.text }]}>
                  {oilName}
                </Text>
              </View>
            ) : null}
            {/* ! only when the filter WAS changed — a tag for a thing that did not happen
                ! is noise. This is where the web's `Filter: No` table cell does not
                ! translate: a card has no column to keep filled. */}
            {log?.oilFilterChanged ? (
              <View style={[styles.tag, { backgroundColor: filterTone.bg }]}>
                <Text style={[styles.tagText, { color: filterTone.text }]}>
                  Filter
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.costRow}>
            <Text style={styles.cost}>{formatTaka(log?.cost ?? 0)}</Text>
            {log?.quantityLiters != null && (
              <Text style={styles.costDetail}>{log?.quantityLiters} L</Text>
            )}
          </View>

          <Text style={styles.odoLine} numberOfLines={1}>
            {log?.odometerReading?.toLocaleString()} km
            {log?.serviceCenter ? ` · ${log?.serviceCenter}` : ""}
          </Text>

          {/* ! D11: the interval shows on EVERY row, on a line of its own. Omitted only on
              ! one of server §H's imported rows, which genuinely has none — and omitted as
              ! a missing line, not a `—`. The web prints a dash because it has a table
              ! column to keep aligned; a card has nothing to align, so a dash is pure
              ! noise. */}
          {log?.intervalKmUsed != null && (
            <Text style={styles.subLine} numberOfLines={1}>
              Interval {log?.intervalKmUsed?.toLocaleString()} km
            </Text>
          )}

          {/* ! §G: both figures come FROM THE SERVER, per list row — never derived here.
              ! A row's period is closed by its newer neighbour, which sits on the previous
              ! page at every page boundary, so a client-side derivation would appear and
              ! vanish as the rider pages (V15). Guarded separately because `kmOnThisOil`
              ! can be non-null while `costPerKm` is null, when two changes share an
              ! odometer reading. The newest row has no closing neighbour and simply stops
              ! after the interval line — the status card above is already saying how far
              ! the current oil has run. */}
          {log?.kmOnThisOil != null && log?.costPerKm != null && (
            <Text style={styles.subLine} numberOfLines={1}>
              {log?.kmOnThisOil?.toLocaleString()} km on this oil · ৳
              {log?.costPerKm?.toFixed(2)}/km
            </Text>
          )}
        </View>

        <View style={styles.right}>
          {/* ! No lock rule, unlike `FuelLogCard`: nothing downstream closes a period over
              ! an oil change (that is `MileageRecord`'s job and it is untouched), so both
              ! actions are always enabled and there is no `lockedNote`. */}
          <ActionMenu
            size={16}
            style={styles.menuTrigger}
            actions={[
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

          <ImagePickerField
            label="Receipt"
            size={64}
            value={log?.receiptImage}
            onUpload={handleImageUpload}
            onDelete={handleImageDelete}
            uploading={isUploading || isDeletingImage}
          />
        </View>
      </Panel>

      <EngineOilLogFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        bikeId={bikeId}
        log={log}
      />
    </>
  );
}

// ! D14: one notch down from `FuelLogCard` throughout, floored at 10px. `cost` at 16 stays
// ! the largest thing on the row so the card keeps a focal point.
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
    fontSize: 11.5,
    color: COLORS.textLight,
  },
  tag: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
  },
  costRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
  },
  cost: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },
  costDetail: {
    fontSize: 12,
    color: COLORS.textLight,
    fontVariant: ["tabular-nums"],
  },
  odoLine: {
    fontSize: 11.5,
    color: COLORS.textLight,
    fontVariant: ["tabular-nums"],
  },
  subLine: {
    fontSize: 10.5,
    color: COLORS.textMuted,
    fontVariant: ["tabular-nums"],
  },
});
