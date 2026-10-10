import { TErrorLog } from "@/types/error-log.types";
import { COLORS } from "@/utils/colors";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { Modal, Portal, Text } from "react-native-paper";
import { formatLogTime, StatusPill } from "./ErrorLogCard";

interface ErrorLogDetailModalProps {
  log: TErrorLog | null;
  onDismiss: () => void;
}

function DetailRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

/**
 * Renders the row the list already fetched — it does NOT call `GET /admin/error-logs/:id`.
 * The list returns complete rows (stack included), so a second request would add a loading
 * state and a failure mode for no new information.
 */
export function ErrorLogDetailModal({ log, onDismiss }: ErrorLogDetailModalProps) {
  // `errorSources` is a JSON column — trust nothing about its shape at render time.
  const sources = Array.isArray(log?.errorSources) ? log?.errorSources : [];

  return (
    <Portal>
      <Modal
        visible={!!log}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        {log ? (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.head}>
              <StatusPill status={log?.status} />
              <Text style={styles.title} numberOfLines={2}>
                {log?.method} {log?.path}
              </Text>
            </View>

            <DetailRow label="Time" value={formatLogTime(log?.createdAt, "EEE d MMM yyyy, h:mm:ss a")} />
            <DetailRow label="Error" value={log?.errorName ?? "—"} />
            <DetailRow
              label="User"
              value={log?.userEmail ?? "Unauthenticated"}
              sub={log?.userId ?? undefined}
            />
            <DetailRow label="Message" value={log?.message} />

            {sources?.length ? (
              <View style={styles.row}>
                <Text style={styles.label}>Error sources</Text>
                {sources.map((source, i) => (
                  <Text key={i} style={styles.value}>
                    {/* 404 rows store an empty `path` — don't render a dangling arrow. */}
                    {source?.path !== "" && source?.path != null
                      ? `${source?.path} → `
                      : ""}
                    {source?.message}
                  </Text>
                ))}
              </View>
            ) : null}

            {/* 404 rows are synthetic and store no stack — absent is correct, not missing. */}
            {log?.stack ? (
              <View style={styles.row}>
                <Text style={styles.label}>Stack trace</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <Text style={styles.stack}>{log?.stack}</Text>
                </ScrollView>
              </View>
            ) : null}
          </ScrollView>
        ) : null}
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.edge,
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 14,
    maxHeight: "85%",
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.text,
  },
  row: {
    marginBottom: 12,
    gap: 2,
  },
  label: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  value: {
    fontSize: 13.5,
    color: COLORS.text,
  },
  sub: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  stack: {
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textLight,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    backgroundColor: COLORS.surface2,
    borderRadius: 8,
    padding: 10,
  },
});
