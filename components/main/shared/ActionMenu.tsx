import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Menu, TouchableRipple } from "react-native-paper";
import { COLORS } from "@/utils/colors";

export type TMenuAction = {
  label: string;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

interface ActionMenuProps {
  actions: TMenuAction[];
  size?: number;
  /** Outlined 40×40 button (the bike hub's odometer panel) vs. a bare glyph. */
  outlined?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The Nocturne ⋯ overflow menu.
 *
 * ! Remounts Paper's `Menu` on every close via `menuKey` — same fix as
 * ! `SelectPickerField`: Menu's internal `prevRendered` ref settles ~250ms
 * ! after `visible` flips, so a quick reopen otherwise silently no-ops.
 */
export function ActionMenu({
  actions,
  size = 18,
  outlined,
  style,
}: ActionMenuProps) {
  const [visible, setVisible] = useState(false);
  const [menuKey, setMenuKey] = useState(0);

  const close = () => {
    setVisible(false);
    setMenuKey((k) => k + 1);
  };

  return (
    <Menu
      key={menuKey}
      visible={visible}
      onDismiss={close}
      anchor={
        <TouchableRipple
          onPress={() => setVisible(true)}
          borderless
          style={[styles.trigger, outlined && styles.triggerOutlined, style]}
        >
          <View style={styles.triggerInner}>
            <MaterialCommunityIcons
              name="dots-horizontal"
              size={size}
              color={COLORS.textLight}
            />
          </View>
        </TouchableRipple>
      }
      contentStyle={styles.content}
    >
      {actions.map((action) => (
        <Menu.Item
          key={action.label}
          title={action.label}
          leadingIcon={action.icon}
          disabled={action.disabled}
          titleStyle={[
            styles.itemTitle,
            action.destructive && styles.itemTitleDestructive,
          ]}
          onPress={() => {
            close();
            action.onPress();
          }}
        />
      ))}
    </Menu>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  triggerOutlined: {
    borderWidth: 1,
    borderColor: COLORS.edge,
  },
  triggerInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.edge,
    borderRadius: 10,
  },
  itemTitle: {
    color: COLORS.text,
    fontSize: 14,
  },
  itemTitleDestructive: {
    color: COLORS.danger,
  },
});
