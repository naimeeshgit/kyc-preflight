// Visual system: Razorpay Blade's azure brand and blue-gray neutrals on a quiet white app.
// The one bold element is the navy "go-live pass". Everything else stays calm.
import { useColorScheme } from "react-native";

export const light = {
  dark: false,
  canvas: "#F3F5F9",
  surface: "#FFFFFF",
  sunken: "#F6F8FB",
  ink: "#0E1726",
  muted: "#5A6474",
  faint: "#8A94A3",
  line: "#E3E7EE",
  brand: "#1563F2",
  brandPress: "#0B4FCC",
  brandTint: "#EAF1FE",
  navy: "#0B1E3F",
  navyInk: "#FFFFFF",
  navyMuted: "#A9B8D6",
  pos: "#00855D",
  posTint: "#E4F4EC",
  warn: "#B85000",
  warnTint: "#FFF1E5",
  neg: "#C92A1E",
  negTint: "#FDECEA",
  code: "#EEF2F8",
  scrim: "rgba(10,18,32,0.45)",
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

export function useTheme(): Theme {
  return useColorScheme() === "dark" ? dark : light;
}

export const font = {
  display: "TASAOrbiter_700Bold",
  displayMed: "TASAOrbiter_600SemiBold",
  body: "Inter_400Regular",
  bodyMed: "Inter_500Medium",
  bodySemi: "Inter_600SemiBold",
  bodyBold: "Inter_700Bold",
  mono: "IBMPlexMono_500Medium",
  monoBold: "IBMPlexMono_600SemiBold",
};

export const type = {
  h1: { fontFamily: font.display, fontSize: 28, lineHeight: 34, letterSpacing: -0.3 },
  h2: { fontFamily: font.display, fontSize: 21, lineHeight: 27, letterSpacing: -0.2 },
  h3: { fontFamily: font.bodySemi, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: font.body, fontSize: 15, lineHeight: 22 },
  bodyMed: { fontFamily: font.bodyMed, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: font.body, fontSize: 13, lineHeight: 19 },
  smallMed: { fontFamily: font.bodyMed, fontSize: 13, lineHeight: 19 },
  tiny: { fontFamily: font.bodyMed, fontSize: 11.5, lineHeight: 16 },
};

export const r = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 };
