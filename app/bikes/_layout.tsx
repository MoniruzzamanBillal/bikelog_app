import { Slot } from "expo-router";
import AuthGuard from "@/utils/AuthGuard";

export default function BikesLayout() {
  return (
    <AuthGuard>
      <Slot />
    </AuthGuard>
  );
}
