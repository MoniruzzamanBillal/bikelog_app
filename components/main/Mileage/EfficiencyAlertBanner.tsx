import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text } from "react-native-paper";
import { useFetchData } from "@/hooks/useApi";
import { COLORS } from "@/utils/colors";
import { TMileageHistoryResponse } from "@/types/mileage.types";

interface EfficiencyAlertBannerProps {
  bikeId: string;
  style?: object;
}

export function EfficiencyAlertBanner({
  bikeId,
  style,
}: EfficiencyAlertBannerProps) {
  const { data, isLoading } = useFetchData<TMileageHistoryResponse>(
    ["mileage", "history", bikeId],
    `/bikes/${bikeId}/mileage`,
    { enabled: !!bikeId },
  );

  const alert = data?.data?.efficiencyAlert;
  if (isLoading || !alert || !alert.isAnomaly) return null;

  const dropPct = Math.abs(alert.percentChange * 100).toFixed(0);

  return (
    <View style={[styles.alertBanner, style]}>
      <MaterialCommunityIcons
        name="trending-down"
        size={16}
        color={COLORS.danger}
      />
      <Text style={styles.text}>
        <Text style={styles.bold}>Efficiency drop detected</Text>
        {" — "}
        {alert.latestKmPerLiter.toFixed(1)} km/L, {dropPct}% below your{" "}
        {alert.periodsUsed}-period average (
        {alert.rollingAverageKmPerLiter.toFixed(1)} km/L)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  alertBanner: {
    backgroundColor: "rgba(248,113,113,0.07)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.2)",
    borderRadius: 10,
    padding: 10,
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  text: { flex: 1, fontSize: 12, lineHeight: 16, color: "#fca5a5" },
  bold: { fontWeight: "700" },
});
