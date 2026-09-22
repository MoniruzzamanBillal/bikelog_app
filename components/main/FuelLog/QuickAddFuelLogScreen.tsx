import { ScreenHeader, SectionLoading } from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { TBike } from "@/types/bike.types";
import { TFuelLogsApiResponse } from "@/types/fuel-log.types";
import { COLORS } from "@/utils/colors";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { FuelLogFormModal } from "./FuelLogFormModal";

/**
 * Prefilled quick-create route (`/bikes/[bikeId]/fuel-logs/new`) — reached by
 * manual navigation for now, and eventually by the quick-add home-screen
 * widget's deep link. Seeds fuelStation/pricePerLiter from the bike's most
 * recent fuel log; odometer/liters are always left blank.
 */
export function QuickAddFuelLogScreen() {
  const { bikeId } = useLocalSearchParams<{ bikeId: string }>();
  const router = useRouter();

  const { data: bikeData, isLoading: isBikeLoading } = useFetchData<TBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
    { enabled: !!bikeId },
  );
  const bike = bikeData?.data;

  const { data: lastLogData, isLoading: isLastLogLoading } =
    useFetchData<TFuelLogsApiResponse>(
      ["fuelLogs", bikeId, "latest"],
      `/bikes/${bikeId}/fuel-logs?limit=1&sort=-date`,
      { enabled: !!bikeId },
    );
  const lastLog = lastLogData?.data?.result?.[0];

  const seedFromLastLog = useMemo(() => {
    if (!lastLog) return undefined;
    return {
      fuelStation: lastLog.fuelStation,
      pricePerLiter: lastLog.pricePerLiter,
    };
  }, [lastLog]);

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace({ pathname: "/bikes/[bikeId]", params: { bikeId } });
    }
  };

  const isLoading = isBikeLoading || isLastLogLoading;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Quick Add Fuel" backLabel={bike?.nickname ?? "Back"} />
      {isLoading ? (
        <View style={styles.pad}>
          <SectionLoading count={3} />
        </View>
      ) : null}
      {/* Modal only opens once seed data has resolved — FuelLogFormModal seeds
          its fields from `seedFromLastLog` the moment `open` flips true, and
          doesn't re-seed on a later prop change while already open. */}
      <FuelLogFormModal
        open={!isLoading && !!bikeId}
        onClose={handleClose}
        bikeId={bikeId}
        seedFromLastLog={seedFromLastLog}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  pad: {
    padding: 16,
  },
});
