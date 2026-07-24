import { MD3LightTheme } from "react-native-paper";
import { COLORS } from "./colors";

export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: COLORS.primary,
    onPrimary: COLORS.white,
  },
};
