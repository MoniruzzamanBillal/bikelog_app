import {
  EmptyState,
  PrimaryButton,
  ScreenHeader,
  SectionLoading,
  confirmDelete,
  panelStyle,
} from "@/components/main/shared";
import { useDelete, useFetchData, usePost } from "@/hooks/useApi";
import { TBike } from "@/types/bike.types";
import { TBikeManualStatus } from "@/types/bike-manual.types";
import { COLORS } from "@/utils/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router, useLocalSearchParams } from "expo-router";
import { format } from "date-fns";
import { Linking, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import Toast from "react-native-toast-message";

export function BikeManual() {
  const { bikeId } = useLocalSearchParams<{ bikeId: string }>();

  const { data: bikeData } = useFetchData<TBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
    { enabled: !!bikeId },
  );
  const bike = bikeData?.data;

  const { data: manualData, isLoading } = useFetchData<TBikeManualStatus>(
    ["bikeManual", bikeId],
    `/bikes/${bikeId}/manual`,
    { enabled: !!bikeId },
  );
  const status = manualData?.data;

  const uploadMutation = usePost([["bikeManual", bikeId]]);
  const deleteMutation = useDelete([["bikeManual", bikeId]]);

  const pickAndUploadManual = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf"],
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result?.canceled || !result?.assets?.[0]) return;

    const asset = result?.assets[0];
    const formData = new FormData();
    formData.append("manual", {
      uri: asset?.uri,
      name: asset?.name,
      type: asset?.mimeType ?? "application/pdf",
    } as any);

    try {
      await uploadMutation.mutateAsync({
        url: `/bikes/${bikeId}/manual`,
        payload: formData,
      });
      Toast.show({ type: "success", text1: "Manual uploaded" });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Upload failed",
      });
    }
  };

  const handleDelete = () => {
    confirmDelete("manual", async () => {
      await deleteMutation.mutateAsync({ url: `/bikes/${bikeId}/manual` });
    });
  };

  const isUploading = uploadMutation.isPending;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Manual"
        subtitle={bike?.nickname}
        backLabel={bike?.nickname ?? "Back"}
      />

      <View style={styles.page}>
        {isLoading ? (
          <SectionLoading count={2} />
        ) : !status?.hasManual || !status?.manual ? (
          <EmptyState
            icon="book-open-page-variant-outline"
            title="No manual uploaded yet"
            message="Upload a PDF to let the AI Assistant answer questions from it."
            action={
              <PrimaryButton
                onPress={pickAndUploadManual}
                icon="upload"
                loading={isUploading}
                compact
              >
                Upload Manual
              </PrimaryButton>
            }
          />
        ) : (
          <View style={[panelStyle, styles.card]}>
            <Text style={styles.filename} numberOfLines={1}>
              {status?.manual?.originalName}
            </Text>
            <Text style={styles.meta}>
              Uploaded{" "}
              {format(new Date(status?.manual?.uploadedAt), "d MMM yyyy")}
            </Text>
            <Text style={styles.meta}>
              {status?.manual?.chunkCount}{" "}
              {status?.manual?.chunkCount === 1 ? "section" : "sections"}{" "}
              indexed for AI chat
            </Text>

            <View style={styles.actions}>
              <PrimaryButton
                onPress={() => Linking.openURL(status?.manual?.url ?? "")}
                icon="eye-outline"
                variant="secondary"
                compact
              >
                View
              </PrimaryButton>
              <PrimaryButton
                onPress={pickAndUploadManual}
                icon="autorenew"
                variant="secondary"
                loading={isUploading}
                compact
              >
                Replace
              </PrimaryButton>
              <PrimaryButton
                onPress={handleDelete}
                icon="trash-can-outline"
                variant="destructive"
                loading={deleteMutation.isPending}
                compact
              >
                Delete
              </PrimaryButton>
            </View>

            <TouchableOpacity
              style={styles.assistantLink}
              onPress={() =>
                router.push(`/bikes/${bikeId}/assistant` as never)
              }
            >
              <MaterialCommunityIcons
                name="robot-outline"
                size={13}
                color={COLORS.accent}
              />
              <Text style={styles.assistantLinkText}>
                Ask the AI Assistant about this manual
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  page: {
    padding: 16,
  },
  card: {
    padding: 16,
    gap: 4,
  },
  filename: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
  },
  meta: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  assistantLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
  },
  assistantLinkText: {
    fontSize: 13,
    color: COLORS.accent,
  },
});
