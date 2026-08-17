import {
  issueStatusColors,
  MultiImagePickerField,
  StatusBadge,
  TPickedImageFile,
} from "@/components/main/shared";
import { confirmDelete } from "@/components/main/shared/ConfirmDelete";
import { useDelete, usePatch, usePost } from "@/hooks/useApi";
import { TBikeIssue } from "@/types/bike-issue.types";
import { COLORS } from "@/utils/colors";
import { formatApiDate } from "@/utils/formatApiDate";
import { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import Swipeable, {
  SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { Button } from "react-native-paper";
import Toast from "react-native-toast-message";
import { BikeIssueFormModal } from "./BikeIssueFormModal";

interface BikeIssueCardProps {
  issue: TBikeIssue;
  bikeId: string;
  openSwipeableRef: React.MutableRefObject<SwipeableMethods | null>;
}

export function BikeIssueCard({
  issue,
  bikeId,
  openSwipeableRef,
}: BikeIssueCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const swipeableRef = useRef<SwipeableMethods>(null);

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
      Toast.show({
        type: "success",
        text1: "Images added",
        position: "top",
      });
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
      Toast.show({
        type: "success",
        text1: "Image deleted",
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
    confirmDelete("issue", async () => {
      await deleteMutation.mutateAsync({
        url: `/bikes/${bikeId}/issues/${issue._id}`,
      });
    });
  };

  const handleEdit = () => {
    swipeableRef.current?.close();
    setEditOpen(true);
  };

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
          <View style={styles.cardHeader}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{issue.title}</Text>
              <StatusBadge
                label={issue.status}
                colorKey={issue.status}
                colors={issueStatusColors}
              />
            </View>
          </View>

          {issue.description && (
            <Text style={styles.description}>{issue.description}</Text>
          )}

          <Text style={styles.date}>
            Reported: {formatApiDate(issue.dateReported, "dd MMM yyyy")}
          </Text>

          <View style={styles.imagesRow}>
            <MultiImagePickerField
              images={issue.images ?? []}
              onAdd={handleAddImages}
              onRemove={handleRemoveImage}
              uploading={isAdding || isRemoving}
            />
          </View>

          <Button
            mode="outlined"
            onPress={handleToggleStatus}
            style={styles.statusButton}
            textColor={
              issue.status === "open" ? COLORS.success : COLORS.warning
            }
          >
            {issue.status === "open" ? "Mark as Resolved" : "Reopen Issue"}
          </Button>
        </TouchableOpacity>
      </Swipeable>

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
  cardHeader: {
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  description: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 20,
  },
  date: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 10,
  },
  imagesRow: {
    marginBottom: 10,
  },
  statusButton: {
    alignSelf: "flex-start",
    borderColor: COLORS.border,
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
