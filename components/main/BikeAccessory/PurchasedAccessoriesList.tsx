import {
  EmptyState,
  ErrorState,
  PrimaryButton,
  SectionLoading,
  StatTile,
} from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { TAccessorySpendingSummary } from "@/types/bike-accessory.types";
import { COLORS } from "@/utils/colors";
import { formatTaka } from "@/utils/formatTaka";
import { format, parse } from "date-fns";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { BikeAccessoryCard } from "./BikeAccessoryCard";

interface PurchasedAccessoriesListProps {
  bikeId: string;
  onAdd: () => void;
}

// "2026-11" -> "November 2026"
const monthLabel = (month: string) =>
  format(parse(month, "yyyy-MM", new Date()), "MMMM yyyy");

export function PurchasedAccessoriesList({
  bikeId,
  onAdd,
}: PurchasedAccessoriesListProps) {
  const { data, isLoading, isError, refetch } =
    useFetchData<TAccessorySpendingSummary>(
      ["accessories-spending", bikeId],
      `/bikes/${bikeId}/accessories/spending-summary`,
      { enabled: !!bikeId },
    );

  if (isLoading) {
    return <SectionLoading count={4} />;
  }

  if (isError) {
    return (
      <ErrorState title="Couldn’t load purchases" onRetry={refetch} />
    );
  }

  const summary = data?.data;
  const months = summary?.months ?? [];

  if (months.length === 0) {
    return (
      <EmptyState
        icon="shopping-outline"
        title="No purchases yet"
        message="Mark a wishlist accessory as purchased and its price shows up here, grouped by the month you bought it."
        action={
          <PrimaryButton onPress={onAdd} icon="plus" compact>
            Add accessory
          </PrimaryButton>
        }
      />
    );
  }

  return (
    <>
      <View style={styles.summaryRow}>
        <StatTile
          label="This month"
          value={formatTaka(summary?.currentMonthTotal ?? 0)}
          style={styles.summaryTile}
        />
        <StatTile
          label="All time"
          value={formatTaka(summary?.allTimeTotal ?? 0)}
          style={styles.summaryTile}
        />
      </View>

      {months.map((group) => (
        <View key={group.month} style={styles.monthBlock}>
          <View style={styles.monthHeader}>
            <Text style={styles.monthLabel}>
              {monthLabel(group.month).toUpperCase()}
            </Text>
            <Text style={styles.monthTotal}>{formatTaka(group.total)}</Text>
          </View>

          {group.accessories.length === 0 ? (
            <Text style={styles.emptyMonth}>No purchases this month</Text>
          ) : (
            <View style={styles.list}>
              {group.accessories.map((acc) => (
                <BikeAccessoryCard
                  key={acc._id}
                  accessory={acc}
                  bikeId={bikeId}
                />
              ))}
            </View>
          )}
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: "row",
    gap: 10,
  },
  summaryTile: {
    flex: 1,
  },
  monthBlock: {
    gap: 8,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 2,
  },
  monthLabel: {
    fontSize: 11,
    letterSpacing: 0.9,
    color: COLORS.text,
  },
  monthTotal: {
    fontSize: 13,
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },
  list: {
    gap: 10,
  },
  emptyMonth: {
    fontSize: 12.5,
    color: COLORS.textLight,
    fontStyle: "italic",
    paddingVertical: 2,
  },
});
