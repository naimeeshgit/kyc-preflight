// Visual system: Razorpay Blade's azure brand and blue-gray neutrals on a quiet white app.
// The one bold element is the navy "go-live pass". Everything else stays calm.
import { useColorScheme } from "react-native";

export const light = {
  dark: false,
  canvas: "#F4F2EE",
  surface: "#FFFFFF",
  sunken: "#F7F5F1",
  ink: "#1B1B1A",
  muted: "#5E5A54",
  faint: "#9B968E",
  line: "#E6E1D8",
  brand: "#2F54C8",
  brandPress: "#2545A8",
  brandTint: "#EEF1FB",
  navy: "#F1ECE3",
  navyInk: "#1B1B1A",
  navyMuted: "#8C867C",
  pos: "#1F7A4D",
  posTint: "#E9F3EC",
  warn: "#9A5B07",
  warnTint: "#FAF0E0",
  neg: "#B3261E",
  negTint: "#FBEBE9",
  code: "#F3F0EA",
  scrim: "rgba(27,27,26,0.35)",
};
export type Theme = typeof light;

export const dark: Theme = {
  dark: true,
  canvas: "#0A0F18",
  surface: "#121A27",
  sunken: "#0F1622",
  ink: "#E9EEF5",
  muted: "#9AA5B5",
  faint: "#6F7A8B",
  line: "#243042",
  brand: "#4C8DFA",
  brandPress: "#79A8FF",
  brandTint: "#15284B",
  navy: "#0E2148",
  navyInk: "#FFFFFF",
  navyMuted: "#A9B8D6",
  pos: "#3CC48A",
  posTint: "#0F2A1F",
  warn: "#F2A15A",
  warnTint: "#33210F",
  neg: "#F07A70",
  negTint: "#3A1714",
  code: "#0C121C",
  scrim: "rgba(0,0,0,0.6)",
};

// One calm light theme everywhere; the dark palette is kept only for reference.
export function useTheme(): Theme {
  void useColorScheme;
  return light;
}

export const font = {
  display: "Inter_700Bold",
  displayMed: "Inter_600SemiBold",
  body: "Inter_400Regular",
  bodyMed: "Inter_500Medium",
  bodySemi: "Inter_600SemiBold",
  bodyBold: "Inter_700Bold",
  mono: "IBMPlexMono_500Medium",
  monoBold: "IBMPlexMono_600SemiBold",
};

export const type = {
  h1: { fontFamily: font.display, fontSize: 26, lineHeight: 32, letterSpacing: -0.6 },
  h2: { fontFamily: font.display, fontSize: 19, lineHeight: 25, letterSpacing: -0.3 },
  h3: { fontFamily: font.bodySemi, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: font.body, fontSize: 15, lineHeight: 22 },
  bodyMed: { fontFamily: font.bodyMed, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: font.body, fontSize: 13, lineHeight: 19 },
  smallMed: { fontFamily: font.bodyMed, fontSize: 13, lineHeight: 19 },
  tiny: { fontFamily: font.bodyMed, fontSize: 11.5, lineHeight: 16 },
};

export const r = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 };
