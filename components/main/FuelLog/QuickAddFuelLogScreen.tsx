import { ScreenHeader, SectionLoading } from "@/components/main/shared";
import { useFuelLogSeed } from "@/hooks/useFuelLogSeed";
import { COLORS } from "@/utils/colors";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { FuelLogFormModal } from "./FuelLogFormModal";

/**
 * Prefilled quick-create route (`/bikes/[bikeId]/fuel-logs/new`) — reached via
 * deep link. Seeds station/price/tank setting from the bike's most recent fuel
 * log and the odometer from the bike itself; liters is always left blank.
 * The seed itself lives in `useFuelLogSeed`, shared with the Fuel logs list.
 */
export function QuickAddFuelLogScreen() {
  const { bikeId } = useLocalSearchParams<{ bikeId: string }>();
  const router = useRouter();

  const {
    bike,
    seed: seedFromLastLog,
    odometerSeed,
    isLoading,
  } = useFuelLogSeed(bikeId);

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace({ pathname: "/bikes/[bikeId]", params: { bikeId } });
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Quick add fuel"
        subtitle={bike?.nickname}
        backLabel={bike?.nickname ?? "Back"}
      />
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
        seedOdometer={odometerSeed}
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
    paddingHorizontal: 16,
    paddingTop: 14,
  },
});
