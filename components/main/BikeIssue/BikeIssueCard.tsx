import { MultiImagePickerField, TPickedImageFile } from "@/components/main/shared";
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

  const isOpen = issue.status === "open";

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
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{issue.title}</Text>
            <View style={[styles.badge, isOpen ? styles.badgeErr : styles.badgeOk]}>
              <Text
                style={[styles.badgeText, isOpen ? styles.badgeErrText : styles.badgeOkText]}
              >
                {isOpen ? "Open" : "Resolved"}
              </Text>
            </View>
          </View>

          {issue.description && (
            <Text style={styles.description}>{issue.description}</Text>
          )}

          {(issue.images?.length ?? 0) > 0 && (
            <View style={styles.imagesRow}>
              <MultiImagePickerField
                images={issue.images ?? []}
                onAdd={handleAddImages}
                onRemove={handleRemoveImage}
                uploading={isAdding || isRemoving}
              />
            </View>
          )}

          <View style={styles.footerRow}>
            <Text style={styles.date}>
              Reported {formatApiDate(issue.dateReported, "dd MMM yyyy")}
            </Text>
            <TouchableOpacity onPress={handleToggleStatus} hitSlop={8}>
              <Text style={styles.updateLink}>
                {isOpen ? "Mark Resolved" : "Reopen"} →
              </Text>
            </TouchableOpacity>
          </View>

          {(issue.images?.length ?? 0) === 0 && (
            <View style={styles.addImageRow}>
              <MultiImagePickerField
                images={[]}
                onAdd={handleAddImages}
                onRemove={handleRemoveImage}
                uploading={isAdding || isRemoving}
              />
            </View>
          )}
        </View>
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
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 20,
    flexShrink: 0,
  },
  badgeErr: {
    backgroundColor: "rgba(248,113,113,0.1)",
  },
  badgeOk: {
    backgroundColor: "rgba(74,222,128,0.1)",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  badgeErrText: {
    color: COLORS.danger,
  },
  badgeOkText: {
    color: COLORS.success,
  },
  description: {
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  imagesRow: {
    marginBottom: 10,
  },
  addImageRow: {
    marginTop: 10,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  date: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  updateLink: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.accent,
  },
  action: {
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderRadius: 10,
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
