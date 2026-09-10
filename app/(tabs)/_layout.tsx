import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import AuthGuard from "@/utils/AuthGuard";
import { COLORS } from "@/utils/colors";

export default function TabsLayout() {
  return (
    <AuthGuard>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: COLORS.accent,
          tabBarInactiveTintColor: COLORS.textMuted,
          tabBarStyle: {
            backgroundColor: COLORS.background,
            borderTopColor: COLORS.borderSubtle,
            height: 64,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "500",
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Garage",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="home-variant-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="cog-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </AuthGuard>
  );
}
