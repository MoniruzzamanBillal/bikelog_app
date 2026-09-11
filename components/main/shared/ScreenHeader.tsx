import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { COLORS } from "@/utils/colors";

interface ScreenHeaderProps {
  title: string;
  backLabel?: string;
  onBack?: () => void;
  rightIcon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  onRightPress?: () => void;
}

export function ScreenHeader({
  title,
  backLabel,
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
          <MaterialCommunityIcons name="chevron-left" size={20} color={COLORS.accent} />
          <Text style={styles.backText} numberOfLines={1}>
            {backLabel}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.backPlaceholder} />
      )}

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      {rightIcon ? (
        <TouchableOpacity onPress={onRightPress} style={styles.navBtn} hitSlop={8}>
          <MaterialCommunityIcons name={rightIcon} size={20} color={COLORS.accent} />
        </TouchableOpacity>
      ) : (
        <View style={styles.navBtn} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  back: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: 100,
  },
  backPlaceholder: {
    width: 32,
  },
  backText: {
    fontSize: 15,
    color: COLORS.accent,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
  },
  navBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
