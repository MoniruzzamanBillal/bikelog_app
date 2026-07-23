import { StyleSheet, Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { format } from "date-fns";
import { EmptyState, SectionLoading } from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { COLORS } from "@/utils/colors";
import { TMileageHistoryResponse } from "@/types/mileage.types";

interface MileageHistoryTabProps {
  bikeId: string;
}

export function MileageHistoryTab({ bikeId }: MileageHistoryTabProps) {
  const { data, isLoading } = useFetchData<TMileageHistoryResponse>(
    ["mileage", "history", bikeId],
    `/bikes/${bikeId}/mileage`,
    { enabled: !!bikeId },
  );

  const history = data?.data;
  const records = history?.exactRecords ?? [];
  const approx = history?.approximate;
  const avgMileage = approx?.mileageKmPerLiter?.toFixed(2) ?? null;

  if (isLoading) {
    return <SectionLoading count={5} />;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {records.length === 0 && !approx ? (
        <EmptyState label="No mileage data yet. Log full tanks to track consumption." />
      ) : (
        <>
          {approx && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>
                Average Mileage (last 10 fills)
              </Text>
              <Text style={styles.summaryValue}>{avgMileage} km/L</Text>
              <Text style={styles.summaryNote}>
                {approx.isEstimate ? "Estimated" : "Calculated"} from{" "}
                {approx.basedOnFuelLogCount} logs
              </Text>
            </View>
          )}

          {records.length > 0 && (
            <>
              <Text style={styles.recordsTitle}>Full Tank Records</Text>
              {records.map((record) => (
                <View key={record._id} style={styles.record}>
                  <Text style={styles.recordDate}>
                    {format(new Date(record.periodEndDate), "dd MMM yyyy")}
                  </Text>
                  <Text style={styles.recordDetail}>
                    Odometer: {record.endOdometer} km
                  </Text>
                  <Text style={styles.recordDetail}>
                    Liters: {record.litersConsumed.toFixed(2)}
                  </Text>
                  <Text style={styles.recordDetail}>
                    Mileage: {record.mileageKmPerLiter?.toFixed(2) ?? "—"} km/L
                  </Text>
                </View>
              ))}
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
    backgroundColor: COLORS.card,
    borderRadius: 6,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.primary,
    marginTop: 4,
  },
  summaryNote: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  recordsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 12,
  },
  record: {
    backgroundColor: COLORS.card,
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  recordDate: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  recordDetail: {
    fontSize: 13,
    color: COLORS.text,
    marginTop: 2,
  },
});
