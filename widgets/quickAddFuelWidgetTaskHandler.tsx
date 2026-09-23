import type { WidgetTaskHandler } from "react-native-android-widget";
import { apiGet } from "@/utils/api";
import { resolveBikeId } from "@/utils/lastUsedBike";
import { TBike } from "@/types/bike.types";
import { QuickAddFuelWidget } from "./QuickAddFuelWidget";

const DASHBOARD_URI = "client://";

// The library's headless task is killed after 30s. A cold Vercel/Neon start can
// exceed that, which previously left the widget stuck on its blank initial
// layout — so cap the fetch well under the task timeout.
const BIKES_FETCH_TIMEOUT_MS = 10000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("widget fetch timeout")), ms),
    ),
  ]);
}

async function resolveWidgetFace(): Promise<{
  bikeNickname?: string;
  deepLinkUri: string;
}> {
  try {
    const response = await withTimeout(
      apiGet("/bikes"),
      BIKES_FETCH_TIMEOUT_MS,
    );
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
      // Render the fallback face immediately so the widget is never blank,
      // then re-render with the resolved bike once the fetch settles.
      props.renderWidget(<QuickAddFuelWidget deepLinkUri={DASHBOARD_URI} />);
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
