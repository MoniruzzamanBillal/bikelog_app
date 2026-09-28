import AuthGuard from "@/utils/AuthGuard";
import { COLORS } from "@/utils/colors";
import { Slot } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function BikesLayout() {
  // ! the root layout only pads top/left/right (the tab bar owns the bottom inset
  // ! on tab screens) — this stack sits outside (tabs), so with edge-to-edge on
  // ! Android it has to keep its own content clear of the system navigation bar
  return (
    <AuthGuard>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        edges={["bottom"]}
      >
        <Slot />
      </SafeAreaView>
    </AuthGuard>
  );
}
