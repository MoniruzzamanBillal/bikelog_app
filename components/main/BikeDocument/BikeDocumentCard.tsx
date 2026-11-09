import {
  MultiFilePickerField,
  Panel,
  RuleFade,
} from "@/components/main/shared";
import { confirmDelete } from "@/components/main/shared/ConfirmDelete";
import { toneStyle, TStatusTone } from "@/components/main/shared/StatusBadge";
import { useDelete, usePost } from "@/hooks/useApi";
import { IBikeDocument } from "@/types/bike-document.types";
import { TPickedFile } from "@/types/document-file.types";
import { COLORS } from "@/utils/colors";
import { formatApiDate, parseApiDate } from "@/utils/formatApiDate";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { differenceInCalendarDays } from "date-fns";
import { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import Toast from "react-native-toast-message";
import { BikeDocumentFormModal } from "./BikeDocumentFormModal";

interface BikeDocumentCardProps {
  document: IBikeDocument;
  bikeId: string;
}

type TExpiryPill = { label: string; tone: TStatusTone };

// The expiry status pill. A document with no expiry date gets a neutral
// "No expiry" pill so the card always carries a status, rather than a blank gap.
function getExpiryPill(expiryDate?: string): TExpiryPill {
  if (!expiryDate) {
    return { label: "No expiry", tone: "neutral" };
  }

  const daysUntil = differenceInCalendarDays(
    parseApiDate(expiryDate),
    new Date(),
  );

  if (daysUntil <= 0) {
    return { label: "Expired", tone: "danger" };
  }
  if (daysUntil <= 30) {
    return {
      label: `Expires in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`,
      tone: "warning",
    };
  }
  return { label: "Valid", tone: "success" };
}

export function BikeDocumentCard({ document, bikeId }: BikeDocumentCardProps) {
  const [editOpen, setEditOpen] = useState(false);

  const deleteMutation = useDelete([["documents", bikeId]]);
  const { mutateAsync: addFiles, isPending: isAdding } = usePost([
    ["documents", bikeId],
  ]);
  const { mutateAsync: removeFile, isPending: isRemoving } = useDelete([
    ["documents", bikeId],
  ]);

  const expiryPill = getExpiryPill(document.expiryDate);
  const pillStyle = toneStyle(expiryPill?.tone);
  const fileCount = document?.files?.length ?? 0;

  const handleAddFiles = async (pickedFiles: TPickedFile[]) => {
    try {
      const formData = new FormData();
      pickedFiles.forEach((file) => formData.append("files", file as any));
      await addFiles({
        url: `/bikes/${bikeId}/documents/${document._id}/files`,
        payload: formData,
      });
      Toast.show({ type: "success", text1: "Files added", position: "top" });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to add files",
        position: "top",
      });
    }
  };

  const handleRemoveFile = async (fileId: string) => {
    try {
      await removeFile({
        url: `/bikes/${bikeId}/documents/${document._id}/files/${fileId}`,
      });
      Toast.show({ type: "success", text1: "File deleted", position: "top" });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to delete file",
        position: "top",
      });
    }
  };

  const handleDelete = () => {
    confirmDelete("document", async () => {
      await deleteMutation.mutateAsync({
        url: `/bikes/${bikeId}/documents/${document._id}`,
      });
    });
  };

  return (
    <>
      <Panel style={styles.card}>
        <View style={styles.header}>
          <View style={styles.iconBadge}>
            <MaterialCommunityIcons
              name="file-document-outline"
              size={20}
              color={COLORS.accent}
            />
          </View>

          <View style={styles.headText}>
            <Text style={styles.title} numberOfLines={2}>
              {document.title}
            </Text>
            <View style={[styles.pill, { backgroundColor: pillStyle.bg }]}>
              <Text style={[styles.pillText, { color: pillStyle.text }]}>
                {expiryPill?.label}
              </Text>
            </View>
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

        {document.description ? (
          <Text style={styles.description}>{document.description}</Text>
        ) : null}

        {/* All the document's facts on one muted meta line — the actual expiry
            date (the pill above only names the status), how many files are
            attached, and when it was added. */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons
              name="calendar-outline"
              size={13}
              color={COLORS.textLight}
            />
            <Text style={styles.metaText}>
              {document.expiryDate
                ? `Expires ${formatApiDate(document.expiryDate, "dd MMM yyyy")}`
                : "No expiry date"}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons
              name="paperclip"
              size={13}
              color={COLORS.textLight}
            />
            <Text style={styles.metaText}>
              {fileCount} file{fileCount === 1 ? "" : "s"}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={13}
              color={COLORS.textLight}
            />
            <Text style={styles.metaText}>
              Added {formatApiDate(document.createdAt, "dd MMM yyyy")}
            </Text>
          </View>
        </View>

        <RuleFade />

        <MultiFilePickerField
          files={document.files ?? []}
          onAdd={handleAddFiles}
          onRemove={handleRemoveFile}
          uploading={isAdding || isRemoving}
        />
      </Panel>

      <BikeDocumentFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        bikeId={bikeId}
        initialDocument={document}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 9,
    backgroundColor: COLORS.surface3,
    alignItems: "center",
    justifyContent: "center",
  },
  headText: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  title: {
    fontSize: 14.5,
    fontWeight: "600",
    color: COLORS.text,
  },
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pillText: {
    fontSize: 11,
    fontWeight: "500",
  },
  description: {
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.textLight,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: 14,
    rowGap: 4,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 11.5,
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
});
