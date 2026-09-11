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

type TExpiryBadge = { label: string; bg: string; text: string };

function getExpiryBadge(expiryDate?: string): TExpiryBadge | null {
  if (!expiryDate) return null;

  const daysUntil = differenceInCalendarDays(parseApiDate(expiryDate), new Date());

  if (daysUntil < 0) {
    return { label: "Expired", bg: "rgba(248,113,113,0.1)", text: COLORS.danger };
  }
  if (daysUntil <= 30) {
    return {
      label: `Expires in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`,
      bg: "rgba(251,191,36,0.1)",
      text: COLORS.warning,
    };
  }
  return { label: "Valid", bg: "rgba(74,222,128,0.1)", text: COLORS.success };
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
  const fileCount = document.files?.length ?? 0;

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
            <View style={styles.titleCol}>
              <Text style={styles.title}>{document.title}</Text>
              <Text style={styles.meta}>
                {fileCount} file{fileCount === 1 ? "" : "s"}
                {document.expiryDate
                  ? ` · ${expiryBadge?.label === "Expired" ? "Expired" : "Expires"} ${formatApiDate(document.expiryDate, "dd MMM yyyy")}`
                  : ""}
              </Text>
            </View>
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
    gap: 8,
    marginBottom: 8,
  },
  titleCol: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  meta: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 20,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  description: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 10,
    lineHeight: 17,
  },
  filesRow: {
    marginTop: 2,
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
