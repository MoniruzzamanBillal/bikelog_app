import { InsightCard } from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { TSpendingInsight } from "@/types/spending.types";

interface AiSpendingInsightCardProps {
  bikeId: string;
}

export function AiSpendingInsightCard({ bikeId }: AiSpendingInsightCardProps) {
  const { data, isLoading, isError } = useFetchData<TSpendingInsight>(
    ["ai", "spending-insight", bikeId],
    `/bikes/${bikeId}/ai/spending-insight`,
    { enabled: !!bikeId },
  );

  return (
    <InsightCard
      kicker="AI spending insight"
      text={data?.data?.insight}
      isLoading={isLoading}
      isError={isError}
    />
  );
}
