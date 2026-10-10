import AuthGuard from "@/utils/AuthGuard";
import { COLORS } from "@/utils/colors";
import { Slot } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AdminLayout() {
  // ! Outside (tabs), so the tabs layout's AuthGuard does not cover it — this stack needs its
  // ! own, exactly like app/bikes/_layout.tsx. Same bottom inset for edge-to-edge Android.
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
