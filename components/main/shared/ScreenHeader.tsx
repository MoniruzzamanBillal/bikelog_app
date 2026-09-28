import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { COLORS } from "@/utils/colors";

interface ScreenHeaderProps {
  title: string;
  /**
   * Presence (not the text) is what matters now — the Nocturne header shows a
   * chevron-only back control. Kept as a prop for backward compatibility.
   */
  backLabel?: string;
  subtitle?: string;
  onBack?: () => void;
  rightIcon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  onRightPress?: () => void;
}

export function ScreenHeader({
  title,
  backLabel,
  subtitle,
  onBack,
  rightIcon,
  onRightPress,
}: ScreenHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.navBar}>
      {backLabel !== undefined ? (
        <TouchableOpacity
          onPress={onBack ?? (() => router.back())}
          style={styles.back}
          hitSlop={8}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={22}
            color={COLORS.text}
          />
        </TouchableOpacity>
      ) : null}

      <View style={styles.titleCol}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {rightIcon ? (
        <TouchableOpacity
          onPress={onRightPress}
          style={styles.navBtn}
          hitSlop={8}
        >
          <MaterialCommunityIcons
            name={rightIcon}
            size={20}
            color={COLORS.textLight}
          />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  back: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  titleCol: {
    flex: 1,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
