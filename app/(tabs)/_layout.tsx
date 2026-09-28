import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AuthGuard from "@/utils/AuthGuard";
import { COLORS } from "@/utils/colors";

type TTabIconProps = {
  name: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  color: string;
  size: number;
  focused: boolean;
};

/** Nocturne tab item: a 2×20 accent mark sits above the focused tab's icon. */
function TabIcon({ name, color, size, focused }: TTabIconProps) {
  return (
    <View style={styles.tabIcon}>
      <View style={[styles.mark, focused && styles.markActive]} />
      <MaterialCommunityIcons name={name} size={size} color={color} />
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <AuthGuard>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: COLORS.accent,
          tabBarInactiveTintColor: COLORS.textLight,
          tabBarStyle: {
            backgroundColor: COLORS.background,
            borderTopColor: COLORS.border,
            height: 64 + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 4,
          },
          tabBarLabelStyle: {
            fontSize: 11,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Garage",
            tabBarIcon: ({ color, size, focused }) => (
              <TabIcon
                name="home-variant-outline"
                size={size}
                color={color}
                focused={focused}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color, size, focused }) => (
              <TabIcon
                name="cog-outline"
                size={size}
                color={color}
                focused={focused}
              />
            ),
          }}
        />
      </Tabs>
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    alignItems: "center",
    gap: 6,
  },
  mark: {
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: "transparent",
  },
  markActive: {
    backgroundColor: COLORS.accent,
  },
});
