// Colour tokens follow Razorpay's Blade palette: azure brand, blue-gray neutrals, emerald / cider / crimson feedback.
import { useColorScheme } from "react-native";

export type Theme = typeof light;

export const light = {
  dark: false,
  bg: "#F2F5FA",
  surface: "#FFFFFF",
  surface2: "#F7F9FD",
  fg: "#121A26",
  muted: "#58636E",
  faint: "#808C96",
  border: "#DDE2E9",
  brand: "#0F62F2",
  brandStrong: "#0E52CC",
  brandSubtle: "#EAF1FF",
  navy: "#10224A",
  onNavy: "#FFFFFF",
  pos: "#008548",
  posSubtle: "#E3F4EA",
  warn: "#C25200",
  warnSubtle: "#FFF0E6",
  neg: "#CF2318",
  negSubtle: "#FDEEEC",
  code: "#EEF2F8",
};

export const dark: Theme = {
  dark: true,
  bg: "#0D1219",
  surface: "#151C27",
  surface2: "#1B2330",
  fg: "#EBF0F6",
  muted: "#A9B3BE",
  faint: "#808C96",
  border: "#2A3443",
  brand: "#4D8DFB",
  brandStrong: "#7AABFF",
  brandSubtle: "#16284A",
  navy: "#0F1B33",
  onNavy: "#FFFFFF",
  pos: "#3DCB86",
  posSubtle: "#12291E",
  warn: "#F7A55A",
  warnSubtle: "#33220F",
  neg: "#F07870",
  negSubtle: "#3A1715",
  code: "#0F151E",
};

export function useTheme(): Theme {
  return useColorScheme() === "dark" ? dark : light;
}

export const radius = { sm: 8, md: 10, lg: 12, xl: 16 };
