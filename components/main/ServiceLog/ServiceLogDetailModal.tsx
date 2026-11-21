import { ImageViewerModal } from "@/components/main/shared";
import { toneStyle, TStatusTone } from "@/components/main/shared/StatusBadge";
import { TServiceLog } from "@/types/service-log.types";
import { COLORS } from "@/utils/colors";
import { formatApiDate } from "@/utils/formatApiDate";
import { formatTaka } from "@/utils/formatTaka";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { ReactNode, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { IconButton, Modal, Portal, Text } from "react-native-paper";

interface ServiceLogDetailModalProps {
  open: boolean;
  onClose: () => void;
  log: TServiceLog;
}

/** A labelled background pill — mirrors the card's tone tags. */
function Tag({ label, tone }: { label: string; tone: TStatusTone }) {
  const { bg, text } = toneStyle(tone);
  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      <Text style={[styles.tagText, { color: text }]}>{label}</Text>
    </View>
  );
}

/** A label/value line; hidden entirely when there's no value to show. */
function Row({ label, value }: { label: string; value?: ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function ServiceLogDetailModal({
  open,
  onClose,
  log,
}: ServiceLogDetailModalProps) {
  const [viewerOpen, setViewerOpen] = useState(false);

  const isCompleted = log?.serviceDate != null;

  const kindLabel =
    log?.serviceKind === "warranty"
      ? `Warranty #${log?.warrantyNumber ?? ""}`.trim()
      : "Regular";
  const centerLabel = log?.centerType === "official" ? "Official" : "Local";

  const items = (log?.items ?? []).filter((i) => i?.name);
  const itemsTotal = items.reduce(
    (sum, i) => sum + (i?.cost != null ? Number(i.cost) : 0),
    0,
  );
  const recommendations = (log?.recommendations ?? []).filter((r) => r?.text);
  const receiptUrl = log?.serviceImage?.url;

  return (
    <>
      <Portal>
        <Modal
          visible={open}
          onDismiss={onClose}
          contentContainerStyle={styles.modal}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Service details</Text>
            <IconButton
              icon={() => (
                <MaterialCommunityIcons
                  name="close"
                  size={22}
                  color={COLORS.textLight}
                />
              )}
              onPress={onClose}
              style={styles.closeBtn}
            />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scroll}
          >
            <View style={styles.tagRow}>
              <Tag
                label={isCompleted ? "Completed" : "Upcoming"}
                tone={isCompleted ? "success" : "warning"}
              />
              <Tag label={kindLabel} tone="accent" />
              {log?.centerType ? (
                <Tag
                  label={centerLabel}
                  tone={log?.centerType === "official" ? "success" : "warning"}
                />
              ) : null}
            </View>

            <View style={styles.section}>
              <Row
                label="Due date"
                value={
                  log?.dueDate ? formatApiDate(log.dueDate, "dd MMM yyyy") : null
                }
              />
              <Row
                label="Service date"
                value={
                  log?.serviceDate
                    ? formatApiDate(log.serviceDate, "dd MMM yyyy")
                    : null
                }
              />
              <Row
                label="Odometer"
                value={
                  log?.odometerReading != null
                    ? `${log.odometerReading.toLocaleString()} km`
                    : null
                }
              />
              <Row label="Service centre" value={log?.serviceCenter} />
            </View>

            {/* ---- Items ---- */}
            {items.length > 0 && (
              <View style={styles.block}>
                <Text style={styles.blockTitle}>Items</Text>
                {items.map((item, i) => (
                  <View key={item?.id ?? i} style={styles.lineRow}>
                    <Text style={styles.lineName}>• {item?.name}</Text>
                    {item?.cost != null ? (
                      <Text style={styles.lineCost}>
                        {formatTaka(Number(item.cost))}
                      </Text>
                    ) : null}
                  </View>
                ))}
                <View style={[styles.lineRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>{formatTaka(itemsTotal)}</Text>
                </View>
              </View>
            )}

            {/* ---- Recommendations ---- */}
            {recommendations.length > 0 && (
              <View style={styles.block}>
                <Text style={styles.blockTitle}>Recommendations</Text>
                {recommendations.map((rec, i) => (
                  <View key={rec?.id ?? i} style={styles.recRow}>
                    <MaterialCommunityIcons
                      name={
                        rec?.done
                          ? "checkbox-marked-outline"
                          : "checkbox-blank-outline"
                      }
                      size={15}
                      color={rec?.done ? COLORS.success : COLORS.textLight}
                    />
                    <Text
                      style={[styles.recText, rec?.done && styles.recDone]}
                    >
                      {rec?.text}
                      {rec?.targetDate
                        ? ` ~ ${formatApiDate(rec.targetDate, "d MMM yyyy")}`
                        : ""}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* ---- Notes ---- */}
            {log?.notes ? (
              <View style={styles.block}>
                <Text style={styles.blockTitle}>Notes</Text>
                <Text style={styles.notes}>{log.notes}</Text>
              </View>
            ) : null}

            {/* ---- Receipt ---- */}
            {receiptUrl ? (
              <View style={styles.block}>
                <Text style={styles.blockTitle}>Receipt</Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setViewerOpen(true)}
                >
                  <Image
                    source={{ uri: receiptUrl }}
                    style={styles.receipt}
                    contentFit="cover"
                  />
                </TouchableOpacity>
              </View>
            ) : null}

            <Text style={styles.stamp}>
              Logged {formatApiDate(log.createdAt, "d MMM yyyy")}
              {log?.updatedAt && log.updatedAt !== log.createdAt
                ? ` · updated ${formatApiDate(log.updatedAt, "d MMM yyyy")}`
                : ""}
            </Text>
          </ScrollView>
        </Modal>
      </Portal>

      {receiptUrl ? (
        <ImageViewerModal
          visible={viewerOpen}
          images={[{ url: receiptUrl, publicId: log?.serviceImage?.publicId }]}
          initialIndex={0}
          onDismiss={() => setViewerOpen(false)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginHorizontal: 18,
    padding: 18,
    borderRadius: 14,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "500",
    color: COLORS.text,
  },
  closeBtn: {
    margin: 0,
  },
  scroll: {
    flexGrow: 0,
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  tag: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "500",
  },
  section: {
    gap: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  rowLabel: {
    fontSize: 12.5,
    color: COLORS.textLight,
  },
  rowValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.text,
  },
  block: {
    marginTop: 16,
    gap: 6,
  },
  blockTitle: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: COLORS.textLight,
    marginBottom: 2,
  },
  lineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  lineName: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
  },
  lineCost: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },
  totalRow: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
  },
  totalLabel: {
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.textLight,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },
  recRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  recText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  recDone: {
    color: COLORS.textMuted,
    textDecorationLine: "line-through",
  },
  notes: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 19,
  },
  receipt: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.edge,
    backgroundColor: COLORS.surface2,
  },
  stamp: {
    marginTop: 18,
    fontSize: 11,
    color: COLORS.textMuted,
  },
});
