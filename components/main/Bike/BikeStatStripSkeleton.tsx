import { Panel, RuleFade, SkeletonBar } from "@/components/main/shared";
import { StyleSheet, View } from "react-native";

/**
 * The pulsing mini-stat grid, shaped exactly like `BikeStatStrip`'s real grid
 * (same 3-column 31.5%-wide tiles). Used on its own inside `BikeStatStrip` while
 * its stat queries load, and as the lower half of `BikeStatStripSkeleton`.
 */
export function MiniStatsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.miniStats}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.miniStat}>
          <SkeletonBar width="70%" height={8} />
          <SkeletonBar width="92%" height={11} style={styles.miniValue} />
        </View>
      ))}
    </View>
  );
}

/**
 * Loading skeleton for the bike detail hub's stat panel — the odometer header
 * (kicker + value + the action button) over the mini-stat grid, matching
 * `BikeDetailPage`'s `odoPanel` + `BikeStatStrip` layout so the page keeps its
 * real shape while the bike loads, instead of a generic set of bars.
 */
export function BikeStatStripSkeleton() {
  return (
    <Panel style={styles.odoPanel}>
      <View style={styles.odoTop}>
        <View style={styles.odoLeft}>
          <SkeletonBar width={64} height={8} />
          <SkeletonBar width={118} height={22} style={styles.odoValue} />
        </View>
        <SkeletonBar width={32} height={32} style={styles.action} />
      </View>

      <RuleFade />

      <MiniStatsSkeleton count={6} />
    </Panel>
  );
}

const styles = StyleSheet.create({
  odoPanel: {
    padding: 13,
    gap: 12,
  },
  odoTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  odoLeft: {
    gap: 8,
  },
  odoValue: {
    borderRadius: 7,
  },
  action: {
    borderRadius: 8,
  },
  // Mirrors BikeStatStrip.styles.miniStats / miniStat exactly.
  miniStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: 6,
    rowGap: 8,
  },
  miniStat: {
    width: "31.5%",
  },
  miniValue: {
    marginTop: 4,
  },
});
