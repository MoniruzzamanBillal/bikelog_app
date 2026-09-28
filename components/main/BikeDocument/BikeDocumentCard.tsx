import { MultiFilePickerField, Panel } from "@/components/main/shared";
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

function getExpiryPill(expiryDate?: string): TExpiryPill | null {
  if (!expiryDate) return null;

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
  return {
    label: `Expires ${formatApiDate(expiryDate, "dd MMM yyyy")}`,
    tone: "neutral",
  };
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
  const pillStyle = expiryPill ? toneStyle(expiryPill?.tone) : null;

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
        <View style={styles.titleRow}>
          <View style={styles.titleCol}>
            <View style={styles.titleLine}>
              <Text style={styles.title} numberOfLines={2}>
                {document.title}
              </Text>
              {expiryPill && pillStyle ? (
                <View style={[styles.pill, { backgroundColor: pillStyle.bg }]}>
                  <Text style={[styles.pillText, { color: pillStyle.text }]}>
                    {expiryPill?.label}
                  </Text>
                </View>
              ) : null}
            </View>
            {document.description ? (
              <Text style={styles.description}>{document.description}</Text>
            ) : null}
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
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
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
  title: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.text,
    flexShrink: 1,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pillText: {
    fontSize: 11,
  },
  description: {
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.textLight,
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
