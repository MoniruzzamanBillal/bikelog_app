import {
  ActionMenu,
  ImagePickerField,
  PrimaryButton,
  TPickedImageFile,
} from "@/components/main/shared";
import { confirmDelete } from "@/components/main/shared/ConfirmDelete";
import { Panel } from "@/components/main/shared/Panel";
import { toneStyle } from "@/components/main/shared/StatusBadge";
import { useDelete, usePatch, usePut } from "@/hooks/useApi";
import { TServiceLog } from "@/types/service-log.types";
import { COLORS } from "@/utils/colors";
import { formatApiDate, parseApiDate } from "@/utils/formatApiDate";
import { formatTaka } from "@/utils/formatTaka";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { differenceInCalendarDays } from "date-fns";
import { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import Toast from "react-native-toast-message";
import { ServiceLogDetailModal } from "./ServiceLogDetailModal";
import { ServiceLogFormModal } from "./ServiceLogFormModal";

interface ServiceLogCardProps {
  log: TServiceLog;
  bikeId: string;
}

const daysUntil = (dateStr: string): number =>
  differenceInCalendarDays(parseApiDate(dateStr), new Date());

export function ServiceLogCard({ log, bikeId }: ServiceLogCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const invalidate = [
    ["serviceLogs", bikeId],
    ["serviceStatus", bikeId],
    ["bikes", bikeId],
    ["spending", bikeId],
    ["reminders", bikeId],
  ];
  const deleteMutation = useDelete(invalidate);
  const toggleMutation = usePatch(invalidate);
  const { mutateAsync: uploadImage, isPending: isUploading } = usePut(invalidate);
  const { mutateAsync: deleteImage, isPending: isDeletingImage } =
    useDelete(invalidate);

  const isCompleted = log?.serviceDate != null;
  const kindTone = toneStyle("accent");
  // ! Official vs local get their own tinted badge so the two read as distinct at a glance
  // ! (and apart from the purple kind tag), rather than the near-invisible neutral surface.
  const centerTone =
    log?.centerType === "official" ? toneStyle("success") : toneStyle("warning");
  const centerLabel = log?.centerType === "official" ? "Official" : "Local";

  const kindLabel =
    log?.serviceKind === "warranty"
      ? `Warranty #${log?.warrantyNumber ?? ""}`.trim()
      : "Regular";

  const items = (log?.items ?? []).filter((i) => i?.name);
  const itemsTotal = items.reduce(
    (sum, i) => sum + (i?.cost != null ? Number(i.cost) : 0),
    0,
  );
  const recommendations = log?.recommendations ?? [];

  const handleDelete = () => {
    confirmDelete("service log", async () => {
      await deleteMutation.mutateAsync({
        url: `/bikes/${bikeId}/service-logs/${log?._id}`,
      });
    });
  };

  const handleImageUpload = async (file: TPickedImageFile) => {
    try {
      const formData = new FormData();
      formData.append("image", file as any);
      await uploadImage({
        url: `/bikes/${bikeId}/service-logs/${log?._id}/image`,
        payload: formData,
      });
      Toast.show({ type: "success", text1: "Receipt uploaded", position: "top" });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to upload receipt",
        position: "top",
      });
    }
  };

  const handleImageDelete = async () => {
    try {
      await deleteImage({
        url: `/bikes/${bikeId}/service-logs/${log?._id}/image`,
      });
      Toast.show({ type: "success", text1: "Receipt deleted", position: "top" });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to delete receipt",
        position: "top",
      });
    }
  };

  // ! §G / H-E: re-submit the WHOLE recommendations array with the one entry's `done` flipped,
  // ! every other entry and every `id` preserved. Dropping an entry deletes it; dropping an id
  // ! makes the server mint a new one and the reminder it keyed on churns.
  const toggleRecommendation = async (recId?: string) => {
    if (!recId || togglingId) return; // a rapid double-tap must not send two arrays
    setTogglingId(recId);
    const next = recommendations.map((r) =>
      r?.id === recId ? { ...r, done: !r?.done } : r,
    );
    try {
      await toggleMutation.mutateAsync({
        url: `/bikes/${bikeId}/service-logs/${log?._id}`,
        payload: { recommendations: next },
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Couldn't update recommendation",
        position: "top",
      });
    } finally {
      setTogglingId(null);
    }
  };

  const menu = (
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
  );

  const kindTag = (
    <View style={[styles.tag, { backgroundColor: kindTone.bg }]}>
      <Text style={[styles.tagText, { color: kindTone.text }]}>{kindLabel}</Text>
    </View>
  );

  // ---------- Upcoming (scheduled) row ----------
  if (!isCompleted) {
    const days = log?.dueDate != null ? daysUntil(log.dueDate) : null;
    const overdue = days != null && days < 0;
    const whenText =
      days == null
        ? ""
        : overdue
          ? `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} past due`
          : days === 0
            ? "due today"
            : `in ${days} day${days === 1 ? "" : "s"}`;

    return (
      <>
        {/* ! Tap the card body to see every field in a read-only modal; the menu and the
            ! "Mark completed" button capture their own taps and don't open it. */}
        <TouchableOpacity activeOpacity={0.7} onPress={() => setDetailOpen(true)}>
          <Panel style={styles.card}>
            <View style={styles.metaRow}>
              <Text style={styles.date}>
                Scheduled{" "}
                {log?.dueDate ? `~ ${formatApiDate(log.dueDate, "d MMM")}` : ""}
              </Text>
              {kindTag}
              <View style={styles.menuSpacer}>{menu}</View>
            </View>

            {log?.serviceCenter ? (
              <Text style={styles.odoLine} numberOfLines={1}>
                {log.serviceCenter}
              </Text>
            ) : null}

            <Text
              style={[styles.statusLine, overdue && styles.danger]}
              numberOfLines={1}
            >
              {overdue ? "⚠ " : "⏳ "}
              {overdue ? "overdue" : "upcoming"}
              {whenText ? ` · ${whenText}` : ""}
            </Text>

            <View style={styles.markRow}>
              <PrimaryButton
                onPress={() => setCompleteOpen(true)}
                variant="secondary"
                icon="check"
                compact
              >
                Mark completed
              </PrimaryButton>
            </View>
          </Panel>
        </TouchableOpacity>

        <ServiceLogDetailModal
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          log={log}
        />
        <ServiceLogFormModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          bikeId={bikeId}
          log={log}
        />
        <ServiceLogFormModal
          open={completeOpen}
          onClose={() => setCompleteOpen(false)}
          bikeId={bikeId}
          log={log}
          startCompleted
        />
      </>
    );
  }

  // ---------- Completed (visited) row ----------
  return (
    <>
      {/* ! Only the info column opens the detail modal. The receipt picker (and its delete
          ! badge) are built on react-native-gesture-handler touchables, which do NOT negotiate
          ! with a react-native TouchableOpacity — so wrapping them would fire BOTH handlers,
          ! opening this modal on top of the image picker / delete confirm. Keeping the receipt
          ! and the menu OUTSIDE this touchable is what prevents that double-trigger.
          ! The recommendation checkboxes stay inside: they're RN touchables and negotiate
          ! normally (the tap toggles the row without opening the modal). */}
      <Panel style={styles.cardRow}>
        <TouchableOpacity
          style={styles.left}
          activeOpacity={0.7}
          onPress={() => setDetailOpen(true)}
        >
          <View style={styles.metaRow}>
            <Text style={styles.date}>
              {formatApiDate(log.serviceDate as string, "dd MMM yyyy")}
            </Text>
            {kindTag}
            {log?.centerType ? (
              <View style={[styles.tag, { backgroundColor: centerTone.bg }]}>
                <Text style={[styles.tagText, { color: centerTone.text }]}>
                  {centerLabel}
                </Text>
              </View>
            ) : null}
          </View>

          {items.length > 0 ? (
            <Text style={styles.cost}>{formatTaka(itemsTotal)}</Text>
          ) : (
            <Text style={styles.freeService}>Free service</Text>
          )}

          {log?.odometerReading != null ? (
            <Text style={styles.odoLine} numberOfLines={1}>
              {log.odometerReading.toLocaleString()} km
              {log?.serviceCenter ? ` · ${log.serviceCenter}` : ""}
            </Text>
          ) : log?.serviceCenter ? (
            <Text style={styles.odoLine} numberOfLines={1}>
              {log.serviceCenter}
            </Text>
          ) : null}

          {items.length > 0 && (
            <View style={styles.itemList}>
              {items.map((item, i) => (
                <View key={item?.id ?? i} style={styles.itemRow}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    • {item?.name}
                  </Text>
                  {item?.cost != null && (
                    <Text style={styles.itemCost}>
                      {formatTaka(Number(item.cost))}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {recommendations.length > 0 && (
            <View style={styles.recList}>
              {recommendations.map((rec, i) => (
                <TouchableOpacity
                  key={rec?.id ?? i}
                  style={styles.recRow}
                  activeOpacity={0.7}
                  disabled={togglingId != null}
                  onPress={() => toggleRecommendation(rec?.id)}
                >
                  <MaterialCommunityIcons
                    name={
                      rec?.done
                        ? "checkbox-marked-outline"
                        : "checkbox-blank-outline"
                    }
                    size={14}
                    color={rec?.done ? COLORS.success : COLORS.textLight}
                  />
                  <Text
                    style={[styles.recText, rec?.done && styles.recDone]}
                    numberOfLines={2}
                  >
                    {rec?.text}
                    {rec?.targetDate
                      ? ` ~ ${formatApiDate(rec.targetDate, "d MMM")}`
                      : ""}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.right}>
          {menu}
          <ImagePickerField
            label="Receipt"
            size={64}
            value={log?.serviceImage}
            onUpload={handleImageUpload}
            onDelete={handleImageDelete}
            uploading={isUploading || isDeletingImage}
          />
        </View>
      </Panel>

      <ServiceLogDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        log={log}
      />
      <ServiceLogFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        bikeId={bikeId}
        log={log}
      />
    </>
  );
}

// ! D12: one notch down from FuelLogCard, floored at 10px. The cost stays the row's focal
// ! point at 16px.
const styles = StyleSheet.create({
  card: {
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 12,
    gap: 6,
  },
  cardRow: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 12,
    paddingRight: 10,
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
  menuSpacer: {
    marginLeft: "auto",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  date: {
    fontSize: 11.5,
    fontWeight: "500",
    color: COLORS.white,
  },
  tag: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    fontWeight: "500",
  },
  cost: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },
  freeService: {
    fontSize: 12.5,
    fontWeight: "500",
    color: COLORS.textLight,
  },
  odoLine: {
    fontSize: 11.5,
    fontWeight: "500",
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },
  statusLine: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textLight,
    fontVariant: ["tabular-nums"],
  },
  danger: {
    color: COLORS.danger,
  },
  markRow: {
    flexDirection: "row",
    marginTop: 2,
  },
  itemList: {
    marginTop: 2,
    gap: 2,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  itemName: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: "500",
    color: COLORS.textLight,
  },
  itemCost: {
    fontSize: 10.5,
    fontWeight: "500",
    color: COLORS.textLight,
    fontVariant: ["tabular-nums"],
  },
  recList: {
    marginTop: 4,
    gap: 4,
  },
  recRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  recText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.text,
  },
  recDone: {
    color: COLORS.textMuted,
    textDecorationLine: "line-through",
  },
});
