// Custom entry point (replaces the default "expo-router/entry" main) so the
// quick-add fuel-log widget's headless task handler can be registered
// alongside expo-router's own root-component registration. Importing
// "expo-router/entry" for its side effect is expo-router's own documented
// pattern for a custom entry file — it still fully boots the app as before.
import { Platform } from "react-native";
import "expo-router/entry";

// react-native-android-widget's own module-scope code calls
// TurboModuleRegistry.getEnforcing() on Android, which throws synchronously
// if the native module isn't compiled into the running binary — true for
// Expo Go (and any pre-rebuild dev client) until a real dev-client/EAS build
// that includes this dependency exists. A plain top-level `import` would be
// hoisted and crash the *entire* app on launch in that case, not just the
// widget feature. Using `require()` here instead keeps it a normal,
// catchable call at this exact point in the file, so Expo Go on Android
// keeps working for every other screen; the widget itself is simply not
// registered until a real native build is available.
if (Platform.OS === "android") {
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const {
      registerWidgetTaskHandler,
    } = require("react-native-android-widget");
    const {
      quickAddFuelWidgetTaskHandler,
    } = require("./widgets/quickAddFuelWidgetTaskHandler");
    /* eslint-enable @typescript-eslint/no-require-imports */
    registerWidgetTaskHandler(quickAddFuelWidgetTaskHandler);
  } catch {
    // Native module not present in this binary (Expo Go / stale dev client)
    // — rest of the app still boots normally.
  }
}
