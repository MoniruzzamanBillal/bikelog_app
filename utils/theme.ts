import { MD3DarkTheme } from "react-native-paper";
import { COLORS } from "./colors";

export const paperTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: COLORS.accent,
    onPrimary: COLORS.white,
    background: COLORS.background,
    surface: COLORS.surface,
    surfaceVariant: COLORS.surface2,
    onSurface: COLORS.text,
    onSurfaceVariant: COLORS.textLight,
    outline: COLORS.border,
    outlineVariant: COLORS.borderSubtle,
    error: COLORS.danger,
    elevation: {
      ...MD3DarkTheme.colors.elevation,
      level0: COLORS.background,
      level1: COLORS.surface,
      level2: COLORS.surface2,
      level3: COLORS.surface3,
      level4: COLORS.surface3,
      level5: COLORS.surface3,
    },
  },
};
