import AuthGuard from "@/utils/AuthGuard";
import { Slot } from "expo-router";

export default function BikesLayout() {
  return (
    <AuthGuard>
      <Slot />
    </AuthGuard>
  );
}
