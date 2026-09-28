// "Nocturne" — Bikelog's dark-mode-only palette. Originally from the mobile
// Claude Design export (Bikelog Design.dc.html, Section 0); retuned in spec 38
// to the redesigned web client's `.dark` token block
// (`bikelog_client-web-/app/globals.css`) so both clients read as one product.
const nocturne = {
  primary: "#9184d9", // web --primary
  accent: "#9184d9",
  accentForeground: "#d2cefd", // web --accent-foreground (text on surface3)

  background: "#161826", // web --background
  surface: "#232532", // web --card
  surface2: "#1f2130", // web --muted (skeletons, bar tracks, file chips)
  surface3: "#2b2741", // web --accent (accent-tinted backgrounds)
  card: "#232532",

  text: "#e9e9ed", // web --foreground
  textLight: "#9397ab", // web --muted-foreground
  textMuted: "#75798c",
  placeholder: "#595d6c",

  border: "rgba(233,233,237,0.14)", // web --border
  borderSubtle: "rgba(233,233,237,0.10)",
  edge: "#3f424d", // web --elev-sm hairline (card elevation)

  success: "#7cbf8e", // web --success
  warning: "#d8a657", // web --warning
  danger: "#e0786e", // web --destructive

  white: "#ffffff",
  shadow: "#000000",
};

export const THEMES = {
  nocturne,
};

export const COLORS = THEMES?.nocturne;

// Web --chart-1..5. Categories use index `min(i, 4)`, like the web.
export const CHART_COLORS = [
  "#968ae0",
  "#d2cefd",
  "#75798c",
  "#5d5294",
  "#b2b6ca",
];

/**
 * `#rrggbb` (or `#rgb`) → `rgba(r,g,b,alpha)`. Used for the tone-tinted
 * backgrounds and outlines the Nocturne design leans on, so a tint always
 * derives from its `COLORS` token instead of being a hard-coded literal.
 * A non-hex input is returned unchanged.
 */
export const tint = (hex: string, alpha: number): string => {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return hex;

  const raw = match[1];
  const full =
    raw?.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);

  return `rgba(${r},${g},${b},${alpha})`;
};
