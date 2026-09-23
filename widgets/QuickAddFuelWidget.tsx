import { FlexWidget, TextWidget } from "react-native-android-widget";

interface QuickAddFuelWidgetProps {
  /** Bike nickname to show, or undefined when no bike could be resolved. */
  bikeNickname?: string;
  /**
   * `client://...` deep link opened on tap — either the quick-create fuel-log
   * route for a resolved bike, or the Dashboard bike list as a safe fallback
   * (see `utils/lastUsedBike.ts`'s `resolveBikeId` for the resolution order).
   */
  deepLinkUri: string;
}

export function QuickAddFuelWidget({
  bikeNickname,
  deepLinkUri,
}: QuickAddFuelWidgetProps) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: deepLinkUri }}
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: "#1e2030",
        borderRadius: 16,
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: 12,
      }}
    >
      {bikeNickname ? (
        <TextWidget
          text={bikeNickname}
          style={{ fontSize: 12, color: "#a0a3b8", marginBottom: 4 }}
          maxLines={1}
          truncate="END"
        />
      ) : null}
      <TextWidget
        text="+ Add Fuel"
        style={{ fontSize: 16, fontWeight: "700", color: "#e9e9ed" }}
      />
    </FlexWidget>
  );
}
