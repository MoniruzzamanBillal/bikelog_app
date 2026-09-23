import type { WidgetTaskHandler } from "react-native-android-widget";
import { apiGet } from "@/utils/api";
import { resolveBikeId } from "@/utils/lastUsedBike";
import { TBike } from "@/types/bike.types";
import { QuickAddFuelWidget } from "./QuickAddFuelWidget";

const DASHBOARD_URI = "client://";

async function resolveWidgetFace(): Promise<{
  bikeNickname?: string;
  deepLinkUri: string;
}> {
  try {
    const response = await apiGet("/bikes");
    const bikes: TBike[] = response?.data ?? [];
    const bikeId = await resolveBikeId(bikes);

    if (!bikeId) {
      return { deepLinkUri: DASHBOARD_URI };
    }

    const bike = bikes.find((b) => b._id === bikeId);
    return {
      bikeNickname: bike?.nickname,
      deepLinkUri: `client://bikes/${bikeId}/fuel-logs/new`,
    };
  } catch {
    // Best-effort: no session, offline, or a backend error — fall back to
    // opening the Dashboard rather than showing a broken/blank widget face.
    return { deepLinkUri: DASHBOARD_URI };
  }
}

export const quickAddFuelWidgetTaskHandler: WidgetTaskHandler = async (
  props,
) => {
  switch (props.widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_UPDATE":
    case "WIDGET_RESIZED": {
      const { bikeNickname, deepLinkUri } = await resolveWidgetFace();
      props.renderWidget(
        <QuickAddFuelWidget
          bikeNickname={bikeNickname}
          deepLinkUri={deepLinkUri}
        />,
      );
      break;
    }
    case "WIDGET_DELETED":
    default:
      break;
  }
};
