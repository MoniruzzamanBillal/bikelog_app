import {
  EmptyState,
  ErrorState,
  Panel,
  SectionLoading,
} from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { TMileageHistoryResponse } from "@/types/mileage.types";
import { CHART_COLORS, COLORS } from "@/utils/colors";
import { formatApiDate } from "@/utils/formatApiDate";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

interface MileageHistoryTabProps {
  bikeId: string;
}

export function MileageHistoryTab({ bikeId }: MileageHistoryTabProps) {
  const { data, isLoading, isError, refetch } =
    useFetchData<TMileageHistoryResponse>(
      ["mileage", "history", bikeId],
      `/bikes/${bikeId}/mileage`,
      { enabled: !!bikeId },
    );

  const history = data?.data;
  const records = history?.exactRecords ?? [];
  const approx = history?.approximate;

  if (isLoading) {
    return <SectionLoading count={5} />;
  }

  if (isError) {
    return <ErrorState title="Couldn’t load mileage" onRetry={refetch} />;
  }

  if (records.length === 0 && !approx) {
    return (
      <EmptyState
        icon="speedometer-medium"
        title="No mileage data yet"
        message="Mileage is calculated when a full-tank fill closes a period. Log two full-tank fills to see your first exact km/l."
      />
    );
  }

  const maxKmpl = Math.max(...records.map((r) => r.mileageKmPerLiter), 0);

  return (
    <View style={styles.stack}>
      {approx && (
        <Panel glow style={styles.rollingPanel}>
          <View>
            <Text style={styles.rollingLabel}>Rolling average</Text>
            <View style={styles.rollingValueRow}>
              <Text style={styles.rollingValue}>
                {approx.mileageKmPerLiter.toFixed(2)}
              </Text>
              <Text style={styles.rollingUnit}>km/l</Text>
            </View>
          </View>
          <View style={styles.rollingMeta}>
            <Text style={styles.rollingMetaText}>
              Based on last {approx.basedOnFuelLogCount} fills
            </Text>
            <Text
              style={[
                styles.rollingMetaText,
                { color: approx.isEstimate ? COLORS.warning : COLORS.success },
              ]}
            >
              {approx.isEstimate
                ? "Estimate · partial fills"
                : "Exact · full tanks"}
            </Text>
          </View>
        </Panel>
      )}

      <Text style={styles.kicker}>EXACT RECORDS</Text>

      {records.length === 0 ? (
        <Text style={styles.noRecords}>
          No exact records yet — log a full-tank fill to close a period.
        </Text>
      ) : (
        records.map((record) => (
          <Panel key={record._id} style={styles.record}>
            <View style={styles.recordRow}>
              <View style={styles.recordLeft}>
                <Text style={styles.recordPeriod}>
                  {formatApiDate(record.periodStartDate, "dd MMM")} →{" "}
                  {formatApiDate(record.periodEndDate, "dd MMM yyyy")}
                </Text>
                <Text style={styles.recordDetail}>
                  {record.distanceKm.toLocaleString()} km ·{" "}
                  {record.litersConsumed.toFixed(2)} L
                </Text>
              </View>
              <View style={styles.recordKmplRow}>
                <Text style={styles.recordKmpl}>
                  {record.mileageKmPerLiter.toFixed(1)}
                </Text>
                <Text style={styles.recordKmplUnit}>km/l</Text>
              </View>
            </View>

            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${
                      maxKmpl > 0
                        ? (record.mileageKmPerLiter / maxKmpl) * 100
                        : 0
                    }%`,
                  },
                ]}
              />
            </View>
          </Panel>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 10,
  },
  rollingPanel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  rollingLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  rollingValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  rollingValue: {
    fontSize: 30,
    fontWeight: "500",
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },
  rollingUnit: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  rollingMeta: {
    alignItems: "flex-end",
  },
  rollingMetaText: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: "right",
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: COLORS.textLight,
    marginTop: 4,
  },
  noRecords: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  record: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  recordLeft: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  recordPeriod: {
    fontSize: 12.5,
    color: COLORS.textLight,
    fontVariant: ["tabular-nums"],
  },
  recordDetail: {
    fontSize: 13,
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },
  recordKmplRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  recordKmpl: {
    fontSize: 17,
    fontWeight: "500",
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },
  recordKmplUnit: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  barTrack: {
    height: 3,
    borderRadius: 3,
    backgroundColor: COLORS.surface2,
    overflow: "hidden",
  },
  barFill: {
    height: 3,
    borderRadius: 3,
    backgroundColor: CHART_COLORS[0],
  },
});
