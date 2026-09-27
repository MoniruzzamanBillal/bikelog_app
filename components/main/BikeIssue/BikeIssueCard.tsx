import {
  MultiImagePickerField,
  Panel,
  TPickedImageFile,
} from "@/components/main/shared";
import { confirmDelete } from "@/components/main/shared/ConfirmDelete";
import { toneStyle } from "@/components/main/shared/StatusBadge";
import { useDelete, usePatch, usePost } from "@/hooks/useApi";
import { TBikeIssue } from "@/types/bike-issue.types";
import { COLORS } from "@/utils/colors";
import { formatApiDate } from "@/utils/formatApiDate";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import Toast from "react-native-toast-message";
import { BikeIssueFormModal } from "./BikeIssueFormModal";

interface BikeIssueCardProps {
  issue: TBikeIssue;
  bikeId: string;
}

export function BikeIssueCard({ issue, bikeId }: BikeIssueCardProps) {
  const [editOpen, setEditOpen] = useState(false);

  const deleteMutation = useDelete([["issues", bikeId]]);
  const toggleStatusMutation = usePatch([["issues", bikeId]]);
  const { mutateAsync: addImages, isPending: isAdding } = usePost([
    ["issues", bikeId],
  ]);
  const { mutateAsync: removeImage, isPending: isRemoving } = useDelete([
    ["issues", bikeId],
  ]);

  const handleAddImages = async (files: TPickedImageFile[]) => {
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("images", file as any));
      await addImages({
        url: `/bikes/${bikeId}/issues/${issue._id}/images`,
        payload: formData,
      });
      Toast.show({ type: "success", text1: "Images added", position: "top" });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to add images",
        position: "top",
      });
    }
  };

  const handleRemoveImage = async (imageId: string) => {
    try {
      await removeImage({
        url: `/bikes/${bikeId}/issues/${issue._id}/images/${imageId}`,
      });
      Toast.show({ type: "success", text1: "Image deleted", position: "top" });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to delete image",
        position: "top",
      });
    }
  };

  const handleDelete = () => {
    confirmDelete("issue", async () => {
      await deleteMutation.mutateAsync({
        url: `/bikes/${bikeId}/issues/${issue._id}`,
      });
    });
  };

  // ! status changes only ever go through the dedicated /status route
  const handleToggleStatus = async () => {
    const newStatus = issue.status === "open" ? "resolved" : "open";
    try {
      await toggleStatusMutation.mutateAsync({
        url: `/bikes/${bikeId}/issues/${issue._id}/status`,
        payload: { status: newStatus },
      });
      Toast.show({
        type: "success",
        text1: `Issue marked as ${newStatus}`,
        position: "top",
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to update status",
        position: "top",
      });
    }
  };

  const isOpen = issue.status === "open";
  const statusTone = toneStyle(isOpen ? "warning" : "success");

  return (
    <>
      <Panel style={styles.card}>
        <View style={styles.titleRow}>
          <View style={styles.titleCol}>
            <View style={styles.titleLine}>
              <Text style={styles.title} numberOfLines={2}>
                {issue.title}
              </Text>
              <View style={[styles.pill, { backgroundColor: statusTone.bg }]}>
                <Text style={[styles.pillText, { color: statusTone.text }]}>
                  {isOpen ? "Open" : "Resolved"}
                </Text>
              </View>
            </View>
            <Text style={styles.date}>
              Reported {formatApiDate(issue.dateReported, "dd MMM yyyy")}
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
              onPress={handleToggleStatus}
              style={styles.iconButton}
              hitSlop={6}
            >
              <MaterialCommunityIcons
                name={isOpen ? "check" : "undo"}
                size={16}
                color={isOpen ? COLORS.success : COLORS.textLight}
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

        {issue.description ? (
          <Text style={styles.description}>{issue.description}</Text>
        ) : null}

        <MultiImagePickerField
          images={issue.images ?? []}
          onAdd={handleAddImages}
          onRemove={handleRemoveImage}
          uploading={isAdding || isRemoving}
        />
      </Panel>

      <BikeIssueFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        bikeId={bikeId}
        initialIssue={issue}
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
  date: {
    fontSize: 12,
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
  description: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textLight,
  },
});
