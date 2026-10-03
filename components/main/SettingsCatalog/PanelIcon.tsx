import { tint } from "@/utils/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

/**
 * Section-header icon in a tone-tinted chip. Mirrors `EmptyState`'s accent chip so a
 * panel header and its own empty state read as the same family, and keeps every tint
 * derived from a `COLORS` token via `tint()` rather than a hard-coded rgba literal.
 */
export function PanelIcon({
  name,
  color,
}: {
  name: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  color: string;
}) {
  return (
    <View
      style={[
        styles.panelIcon,
        { backgroundColor: tint(color, 0.14), borderColor: tint(color, 0.32) },
      ]}
    >
      <MaterialCommunityIcons name={name} size={16} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  panelIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
