import { Panel } from "@/components/main/shared/Panel";
import { useFetchData } from "@/hooks/useApi";
import { TMileageHistoryResponse } from "@/types/mileage.types";
import { COLORS, tint } from "@/utils/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Text } from "react-native-paper";

interface EfficiencyAlertBannerProps {
  bikeId: string;
  style?: StyleProp<ViewStyle>;
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
  if (isLoading || !alert || !alert?.isAnomaly) return null;

  const dropPct = Math.abs(alert?.percentChange * 100).toFixed(0);

  return (
    <Panel style={[styles.banner, style]}>
      <MaterialCommunityIcons
        name="alert-outline"
        size={18}
        color={COLORS.danger}
      />
      <View style={styles.textCol}>
        <Text style={styles.title}>Efficiency drop detected</Text>
        <Text style={styles.detail}>
          {alert?.latestKmPerLiter?.toFixed(1)} km/l, {dropPct}% below your{" "}
          {alert?.periodsUsed}-period average (
          {alert?.rollingAverageKmPerLiter?.toFixed(1)} km/l)
        </Text>
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderColor: tint(COLORS.danger, 0.4),
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 13.5,
    fontWeight: "500",
    color: COLORS.text,
  },
  detail: {
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textLight,
    fontVariant: ["tabular-nums"],
  },
});
