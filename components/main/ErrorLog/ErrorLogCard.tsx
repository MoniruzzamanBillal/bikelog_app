import { toneStyle } from "@/components/main/shared";
import { panelStyle } from "@/components/main/shared/Panel";
import { TErrorLog } from "@/types/error-log.types";
import { COLORS } from "@/utils/colors";
import { format } from "date-fns";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { getStatusTone } from "./errorLogStatus";

/**
 * `createdAt` is a real instant (unlike the backend's date-only fields), so `new Date` is right
 * here and `formatApiDate` is not. An unparseable value renders "—" instead of throwing: this
 * screen exists to show failures and must not become one.
 */
export const formatLogTime = (value?: string, pattern = "d MMM, h:mm a") => {
  const date = new Date(value ?? "");
  return Number.isNaN(date.getTime()) ? "—" : format(date, pattern);
};

export function StatusPill({ status }: { status: number }) {
  const tone = toneStyle(getStatusTone(status));

  return (
    <View style={[styles.pill, { backgroundColor: tone?.bg }]}>
      <Text style={[styles.pillText, { color: tone?.text }]}>{status}</Text>
    </View>
  );
}

interface ErrorLogCardProps {
  log: TErrorLog;
  onPress: () => void;
}

export function ErrorLogCard({ log, onPress }: ErrorLogCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.card}>
      <View style={styles.topRow}>
        <StatusPill status={log?.status} />
        <Text style={styles.method}>{log?.method}</Text>
        {/* The tail of a long (bot-scan) URL is the useful part, so ellipsize the middle. */}
        <Text style={styles.path} numberOfLines={1} ellipsizeMode="middle">
          {log?.path}
        </Text>
      </View>

      {/* Zod validation errors are stored as a multi-line JSON string, so a 2-line clamp would
          show just "[" and "{…". Collapse whitespace for the summary; the detail view keeps the
          full original text. */}
      <Text style={styles.message} numberOfLines={2}>
        {(log?.message ?? "").replace(/\s+/g, " ").trim()}
      </Text>

      <Text style={styles.footer} numberOfLines={1}>
        {log?.errorName ? `${log?.errorName} · ` : ""}
        {formatLogTime(log?.createdAt)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    ...panelStyle,
    padding: 12,
    gap: 6,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pill: {
    paddingHorizontal: 8,
    height: 20,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  pillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  method: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
  },
  path: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textLight,
  },
  message: {
    fontSize: 13.5,
    color: COLORS.text,
  },
  footer: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
});
