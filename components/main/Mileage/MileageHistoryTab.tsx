import { StyleSheet, Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { EmptyState, ErrorState, SectionLoading } from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { COLORS } from "@/utils/colors";
import { formatApiDate } from "@/utils/formatApiDate";
import { TLifetimeMileage, TMileageHistoryResponse } from "@/types/mileage.types";

interface MileageHistoryTabProps {
  bikeId: string;
}

export function MileageHistoryTab({ bikeId }: MileageHistoryTabProps) {
  const { data, isLoading, isError, refetch } = useFetchData<TMileageHistoryResponse>(
    ["mileage", "history", bikeId],
    `/bikes/${bikeId}/mileage`,
    { enabled: !!bikeId },
  );
  const { data: lifetimeData } = useFetchData<TLifetimeMileage>(
    ["mileage", "lifetime", bikeId],
    `/bikes/${bikeId}/mileage/lifetime`,
    { enabled: !!bikeId },
  );

  const history = data?.data;
  const records = history?.exactRecords ?? [];
  const approx = history?.approximate;
  const avgMileage = approx?.mileageKmPerLiter;
  const lifetimeKm = lifetimeData?.data?.totalDistanceKm;

  if (isLoading) {
    return <SectionLoading count={5} />;
  }

  if (isError) {
    return <ErrorState onRetry={refetch} />;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {records.length === 0 && !approx ? (
        <EmptyState label="No mileage data yet. Log full tanks to track consumption." />
      ) : (
        <>
          {(avgMileage !== undefined || lifetimeKm !== undefined) && (
            <View style={styles.summaryCard}>
              {avgMileage !== undefined && (
                <View>
                  <Text style={styles.summaryLabel}>Rolling Average</Text>
                  <Text style={styles.summaryValue}>
                    {avgMileage.toFixed(1)} <Text style={styles.summaryUnit}>km/L</Text>
                  </Text>
                </View>
              )}
              {lifetimeKm !== undefined && (
                <View style={styles.summaryRight}>
                  <Text style={styles.summaryLabel}>Lifetime total</Text>
                  <Text style={styles.summaryValueSmall}>
                    {lifetimeKm.toLocaleString()} <Text style={styles.summaryUnit}>km</Text>
                  </Text>
                </View>
              )}
            </View>
          )}

          {records.length > 0 && (
            <>
              <Text style={styles.recordsTitle}>Mileage Records</Text>
              <View style={styles.listCard}>
                {records.map((record, i) => {
                  const mileage = record.mileageKmPerLiter;
                  const isGood = avgMileage !== undefined && mileage >= avgMileage;
                  return (
                    <View
                      key={record._id}
                      style={[styles.row, i === records.length - 1 && styles.rowLast]}
                    >
                      <View style={styles.rowLeft}>
                        <Text style={styles.recordMileage}>
                          {mileage?.toFixed(1) ?? "—"} km/L
                        </Text>
                        <Text style={styles.recordDetail}>
                          {record.distanceKm.toLocaleString()} km / {record.litersConsumed.toFixed(2)}L
                        </Text>
                        <Text style={styles.recordDate}>
                          {formatApiDate(record.periodEndDate, "dd MMM")} — Full tank closed
                        </Text>
                      </View>
                      {avgMileage !== undefined && (
                        <View
                          style={[styles.badge, isGood ? styles.badgeOk : styles.badgeWarn]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              isGood ? styles.badgeOkText : styles.badgeWarnText,
                            ]}
                          >
                            {isGood ? "Good" : "Avg"}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  summaryRight: {
    alignItems: "flex-end",
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  summaryValue: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: "monospace",
    marginTop: 4,
  },
  summaryValueSmall: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: "monospace",
    marginTop: 4,
  },
  summaryUnit: {
    fontSize: 13,
    fontWeight: "400",
    color: COLORS.textLight,
    fontFamily: "System",
  },
  recordsTitle: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  listCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLeft: {
    flex: 1,
  },
  recordMileage: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    fontFamily: "monospace",
  },
  recordDetail: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  recordDate: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 20,
    flexShrink: 0,
  },
  badgeOk: {
    backgroundColor: "rgba(74,222,128,0.1)",
  },
  badgeWarn: {
    backgroundColor: "rgba(251,191,36,0.1)",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  badgeOkText: {
    color: COLORS.success,
  },
  badgeWarnText: {
    color: COLORS.warning,
  },
});
