import { InsightCard } from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { TMileageInsight } from "@/types/mileage.types";

interface AiMileageInsightCardProps {
  bikeId: string;
}

export function AiMileageInsightCard({ bikeId }: AiMileageInsightCardProps) {
  const { data, isLoading, isError } = useFetchData<TMileageInsight>(
    ["ai", "mileage-insight", bikeId],
    `/bikes/${bikeId}/ai/mileage-insight`,
    { enabled: !!bikeId },
  );

  return (
    <InsightCard
      kicker="AI mileage insight"
      text={data?.data?.insight}
      isLoading={isLoading}
      isError={isError}
    />
  );
}
