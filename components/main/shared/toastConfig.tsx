import { COLORS, tint } from "@/utils/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import type { ToastConfig, ToastConfigParams } from "react-native-toast-message";

/**
 * Adds a `warning` toast type, which `react-native-toast-message` does not ship
 * (it provides only `success` / `error` / `info`).
 *
 * ! Deliberately defines ONLY `warning`. Types absent from a config keep the library's
 * ! default rendering, so every existing `success`/`error` toast across the app is
 * ! untouched by mounting this — see spec 45 §2.
 *
 * Used for a request the backend *refused* rather than one that broke: a 409. The axios
 * interceptor routes those here (spec 45 §3), e.g. trying to delete a maintenance type
 * that a maintenance log still uses.
 *
 * Styled on the spec-42 ConfirmDialog idiom so the two read as one family: `COLORS.card`
 * surface, hairline border, amber accent via `tint()` rather than a hard-coded rgba.
 */
function WarningToast({ text1, text2 }: ToastConfigParams<unknown>) {
  return (
    <View style={styles.toast}>
      <View style={styles.iconChip}>
        <MaterialCommunityIcons
          name="alert-outline"
          size={16}
          color={COLORS.warning}
        />
      </View>
      <View style={styles.textCol}>
        {text1 ? (
          <Text style={styles.title} numberOfLines={3}>
            {text1}
          </Text>
        ) : null}
        {text2 ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {text2}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export const toastConfig: ToastConfig = {
  warning: (params) => <WarningToast {...params} />,
};

const styles = StyleSheet.create({
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "92%",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    // ! Amber hairline rather than COLORS.edge: the border is what distinguishes this from
    // ! a neutral card at a glance, matching the "tone outline" pattern in ui-context.md.
    borderColor: tint(COLORS.warning, 0.4),
  },
  iconChip: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tint(COLORS.warning, 0.14),
    borderWidth: 1,
    borderColor: tint(COLORS.warning, 0.32),
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 11.5,
    lineHeight: 16,
    color: COLORS.textLight,
    marginTop: 1,
  },
});
