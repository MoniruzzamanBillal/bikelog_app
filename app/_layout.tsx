import UserProvider from "@/context/user.context";
import { paperTheme } from "@/utils/theme";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Slot, useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { Provider as PaperProvider } from "react-native-paper";
import "react-native-reanimated";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

export const unstable_settings = {
  anchor: "(tabs)",
};

const queryClient = new QueryClient();

// ! without this, a notification that arrives while the app is already open is silently
// ! swallowed instead of showing a banner (Expo's default foreground behavior)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const router = useRouter();

  // ! tap-to-open deep link for the weekly-summary push notification (bikelog_server's spec 21)
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as
          | { bikeId?: string; type?: string }
          | undefined;

        if (data?.type === "weekly-summary" && data.bikeId) {
          router.push({
            pathname: "/bikes/[bikeId]",
            params: { bikeId: data.bikeId },
          });
        }
      },
    );

    return () => subscription.remove();
  }, [router]);

  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      <KeyboardProvider>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <PaperProvider theme={paperTheme}>
              <UserProvider>
                <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
                  <Slot />
                </SafeAreaView>
                <Toast />
              </UserProvider>
            </PaperProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
