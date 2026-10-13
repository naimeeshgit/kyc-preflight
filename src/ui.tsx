import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Easing, Modal, Platform, Pressable, ScrollView, Text, TextStyle, View, ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { font, r, Theme, type } from "./theme";

export type Tone = "ok" | "warn" | "bad" | "info";
export const toneColors = (th: Theme, tone: Tone) =>
  ({ ok: [th.pos, th.posTint], warn: [th.warn, th.warnTint], bad: [th.neg, th.negTint], info: [th.brand, th.brandTint] } as const)[tone];

type TxtProps = { th: Theme; v?: keyof typeof type; color?: string; style?: TextStyle | TextStyle[]; children: React.ReactNode; numberOfLines?: number; selectable?: boolean };
export function Txt({ th, v = "body", color, style, children, numberOfLines, selectable }: TxtProps) {
  return <Text selectable={selectable} numberOfLines={numberOfLines} style={[type[v], { color: color ?? th.ink }, style as TextStyle]}>{children}</Text>;
}

export function Icon({ name, size = 18, color }: { name: string; size?: number; color: string }) {
  return <Feather name={name as any} size={size} color={color} />;
}

export function Button({ th, label, onPress, disabled, busy, kind = "primary", icon, compact }: {
  th: Theme; label: string; onPress?: () => void; disabled?: boolean; busy?: boolean; kind?: "primary" | "secondary" | "quiet"; icon?: string; compact?: boolean;
}) {
  const off = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      onPress={off ? undefined : onPress}
      style={({ pressed, hovered }: any) => {
        const bg = kind === "primary"
          ? (off ? th.line : pressed || hovered ? th.brandPress : th.brand)
          : kind === "secondary" ? (pressed || hovered ? th.brandTint : th.surface) : "transparent";
        return {
          minHeight: compact ? 40 : 52, borderRadius: r.md, paddingHorizontal: compact ? 14 : 18,
          backgroundColor: bg, borderWidth: kind === "secondary" ? 1 : 0, borderColor: th.line,
          flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
          alignSelf: compact ? "flex-start" : "stretch",
        } as ViewStyle;
      }}
    >
      {busy ? <ActivityIndicator size="small" color={kind === "primary" ? "#fff" : th.brand} /> : icon ? <Icon name={icon} size={17} color={kind === "primary" ? (off ? th.faint : "#fff") : th.brand} /> : null}
      <Text style={{ fontFamily: font.bodySemi, fontSize: compact ? 14 : 16, color: kind === "primary" ? (off ? th.faint : "#fff") : th.brand }}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ th, label, on, onPress, icon }: { th: Theme; label: string; on?: boolean; onPress?: () => void; icon?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!on }}
      onPress={onPress}
      style={({ hovered }: any) => ({
        flexDirection: "row", alignItems: "center", gap: 6,
        borderWidth: 1, borderColor: on ? th.brand : th.line, backgroundColor: on ? th.brandTint : hovered ? th.sunken : th.surface,
        borderRadius: r.pill, paddingVertical: 8, paddingHorizontal: 14,
      })}
    >
      {icon ? <Icon name={icon} size={14} color={on ? th.brand : th.muted} /> : null}
      <Text style={{ fontFamily: on ? font.bodySemi : font.bodyMed, fontSize: 14, color: on ? th.brand : th.ink }}>{label}</Text>
    </Pressable>
  );
}

export function Status({ th, tone, label }: { th: Theme; tone: Tone; label: string }) {
  const [fg, bg] = toneColors(th, tone);
  const icon = tone === "ok" ? "check" : tone === "bad" ? "x" : tone === "warn" ? "alert-triangle" : "info";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: bg, borderRadius: r.pill, paddingVertical: 4, paddingHorizontal: 10, alignSelf: "flex-start" }}>
      <Icon name={icon} size={12} color={fg} />
      <Text style={{ fontFamily: font.bodySemi, fontSize: 12.5, color: fg }}>{label}</Text>
    </View>
  );
}

export function Notice({ th, tone, title, children, icon }: { th: Theme; tone: Tone; title: string; children?: React.ReactNode; icon?: string }) {
  const [fg, bg] = toneColors(th, tone);
  return (
    <View style={{ backgroundColor: bg, borderRadius: r.lg, padding: 16, gap: 6, flexDirection: "row" }}>
      <View style={{ paddingTop: 1 }}><Icon name={icon ?? (tone === "ok" ? "check-circle" : tone === "bad" ? "x-circle" : tone === "warn" ? "alert-circle" : "info")} size={20} color={fg} /></View>
      <View style={{ flex: 1, gap: 4 }}>
        <Txt th={th} v="h3" color={fg}>{title}</Txt>
        {children}
      </View>
    </View>
  );
}

export function Panel({ th, children, style, tint }: { th: Theme; children: React.ReactNode; style?: ViewStyle; tint?: boolean }) {
  return <View style={[{ backgroundColor: tint ? th.sunken : th.surface, borderRadius: r.lg, borderWidth: 1, borderColor: th.line, padding: 16, gap: 12 }, style]}>{children}</View>;
}

export function IconRow({ th, icon, children, tone }: { th: Theme; icon: string; children: React.ReactNode; tone?: Tone }) {
  const [fg, bg] = toneColors(th, tone ?? "info");
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={16} color={fg} />
      </View>
      <View style={{ flex: 1, minWidth: 0, paddingTop: 5 }}>{children}</View>
    </View>
  );
}

export function Thinking({ th, label }: { th: Theme; label: string }) {
  const dots = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.timing(dots, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: Platform.OS !== "web" }));
    a.start(); return () => a.stop();
  }, [dots]);
  const op = dots.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.35, 1, 0.35] });
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 }} accessibilityLiveRegion="polite">
      <ActivityIndicator size="small" color={th.brand} />
      <Animated.Text style={[type.smallMed, { color: th.muted, opacity: op }]}>{label}…</Animated.Text>
    </View>
  );
}

/** Bottom sheet built on Modal; full-width on phones, centred card on wide screens. */
export function Sheet({ th, visible, onClose, title, children, wide }: { th: Theme; visible: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: th.scrim, justifyContent: wide ? "center" : "flex-end", alignItems: "center" }} accessibilityLabel="Close">
        <Pressable onPress={() => {}} style={{ width: "100%", maxWidth: wide ? 520 : 480, maxHeight: "88%", backgroundColor: th.surface, borderTopLeftRadius: r.xl, borderTopRightRadius: r.xl, borderBottomLeftRadius: wide ? r.xl : 0, borderBottomRightRadius: wide ? r.xl : 0, paddingTop: 10 }}>
          {!wide ? <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: th.line, marginBottom: 6 }} /> : null}
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 10 }}>
            <Txt th={th} v="h2" style={{ flex: 1 }}>{title}</Txt>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: th.sunken }}>
              <Icon name="x" size={18} color={th.muted} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28, gap: 14 }}>{children}</ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function FeeRows({ th, rows }: { th: Theme; rows: [string, string, boolean?][] }) {
  return (
    <View style={{ gap: 8 }}>
      {rows.map(([k, v, total], i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "baseline", gap: 12, ...(total ? { borderTopWidth: 1, borderTopColor: th.line, paddingTop: 8 } : null) }}>
          <Txt th={th} v={total ? "bodyMed" : "body"} color={total ? th.ink : th.muted} style={{ flex: 1 }}>{k}</Txt>
          <Text style={{ fontFamily: total ? font.bodyBold : font.bodyMed, fontSize: 15, color: th.ink, fontVariant: ["tabular-nums"] }}>{v}</Text>
        </View>
      ))}
    </View>
  );
}

/** Fades and lifts children in once, when they first mount. Respects the "one orchestrated moment" rule by being used only for results. */
export function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(v, { toValue: 1, duration: 260, delay, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== "web" }).start(); }, [v, delay]);
  return <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }], gap: 14 }}>{children}</Animated.View>;
}
