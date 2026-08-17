import { MultiFilePickerField } from "@/components/main/shared";
import { confirmDelete } from "@/components/main/shared/ConfirmDelete";
import { useDelete, usePost } from "@/hooks/useApi";
import { IBikeDocument } from "@/types/bike-document.types";
import { TPickedFile } from "@/types/document-file.types";
import { COLORS } from "@/utils/colors";
import { formatApiDate, parseApiDate } from "@/utils/formatApiDate";
import { differenceInCalendarDays } from "date-fns";
import { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import Swipeable, {
  SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import Toast from "react-native-toast-message";
import { BikeDocumentFormModal } from "./BikeDocumentFormModal";

interface BikeDocumentCardProps {
  document: IBikeDocument;
  bikeId: string;
  openSwipeableRef: React.MutableRefObject<SwipeableMethods | null>;
}

type TExpiryBadge = { label: string; bg: string; text: string } | null;

function getExpiryBadge(expiryDate?: string): TExpiryBadge {
  if (!expiryDate) return null;

  const daysUntil = differenceInCalendarDays(parseApiDate(expiryDate), new Date());

  if (daysUntil < 0) {
    return { label: "Expired", bg: COLORS.danger, text: COLORS.white };
  }
  if (daysUntil <= 30) {
    return {
      label: `Expires in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`,
      bg: COLORS.warning,
      text: COLORS.white,
    };
  }
  return {
    label: formatApiDate(expiryDate, "dd MMM yyyy"),
    bg: COLORS.border,
    text: COLORS.text,
  };
}

export function BikeDocumentCard({
  document,
  bikeId,
  openSwipeableRef,
}: BikeDocumentCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const swipeableRef = useRef<SwipeableMethods>(null);

  const deleteMutation = useDelete([["documents", bikeId]]);
  const { mutateAsync: addFiles, isPending: isAdding } = usePost([
    ["documents", bikeId],
  ]);
  const { mutateAsync: removeFile, isPending: isRemoving } = useDelete([
    ["documents", bikeId],
  ]);

  const expiryBadge = getExpiryBadge(document.expiryDate);

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
    confirmDelete("document", async () => {
      await deleteMutation.mutateAsync({
        url: `/bikes/${bikeId}/documents/${document._id}`,
      });
    });
  };

  const handleEdit = () => {
    swipeableRef.current?.close();
    setEditOpen(true);
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
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{document.title}</Text>
            {expiryBadge && (
              <View style={[styles.badge, { backgroundColor: expiryBadge.bg }]}>
                <Text style={[styles.badgeText, { color: expiryBadge.text }]}>
                  {expiryBadge.label}
                </Text>
              </View>
            )}
          </View>

          {document.description && (
            <Text style={styles.description}>{document.description}</Text>
          )}

          <View style={styles.filesRow}>
            <MultiFilePickerField
              files={document.files ?? []}
              onAdd={handleAddFiles}
              onRemove={handleRemoveFile}
              uploading={isAdding || isRemoving}
            />
          </View>
        </View>
      </Swipeable>

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
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 9999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  description: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 10,
    lineHeight: 20,
  },
  filesRow: {
    marginTop: 4,
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
