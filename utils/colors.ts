// "Nocturne" — Bikelog's dark-mode-only v1 palette (see Bikelog Design.dc.html, Section 0)
const nocturne = {
  primary: "#9184d9",
  accent: "#9184d9",

  background: "#161826",
  surface: "#1e2030",
  surface2: "#252840",
  surface3: "#2e3150",
  card: "#1e2030",

  text: "#e9e9ed",
  textLight: "#a0a3b8",
  textMuted: "#6b6f8a",
  placeholder: "#4a4e6a",

  border: "rgba(255,255,255,0.1)",
  borderSubtle: "rgba(255,255,255,0.06)",

  success: "#4ade80",
  warning: "#fbbf24",
  danger: "#f87171",

  white: "#ffffff",
  shadow: "#000000",
};

export const THEMES = {
  nocturne,
};

export const COLORS = THEMES.nocturne;

export const CHART_COLORS = [
  "#9184d9", // COLORS.accent
  "#4ade80", // COLORS.success
  "#fbbf24", // COLORS.warning
  "#60a5fa",
  "#f87171", // COLORS.danger
];
