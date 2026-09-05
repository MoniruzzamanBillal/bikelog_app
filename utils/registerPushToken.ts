import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { apiPost } from "@/utils/api";

// ! registers/updates this device's Expo push token with the backend, feeding the
// ! weekly-summary cron job (bikelog_server's spec 21). Best-effort and silent — a denied
// ! permission or a missing projectId just means no push for this device, not a hard failure
// ! anywhere else in the app.
export const registerPushToken = async (): Promise<void> => {
  console.log("[push] Device.isDevice:", Device.isDevice);

  if (!Device.isDevice) {
    // getExpoPushTokenAsync throws on a simulator/emulator — nothing to register there.
    return;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const existingPermission = await Notifications.getPermissionsAsync();
  let finalStatus = existingPermission.status;

  if (finalStatus !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== "granted") {
    // Denied — don't nag on every launch, and don't call the backend with nothing to send.
    console.log("[push] permission not granted, status:", finalStatus);
    return;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;

  if (!projectId) {
    console.log("[push] missing EAS projectId, aborting");
    return;
  }

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log("[push] obtained token:", tokenResponse.data);
    await apiPost("/auth/push-token", { expoPushToken: tokenResponse.data });
  } catch (error) {
    console.log("Failed to register push token", error);
  }
};
