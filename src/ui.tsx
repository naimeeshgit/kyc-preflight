import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";
import { radius, Theme } from "./theme";

export type Tone = "ok" | "warn" | "bad" | "info";

export function tones(th: Theme, tone: Tone) {
  return {
    ok: { fg: th.pos, bg: th.posSubtle },
    warn: { fg: th.warn, bg: th.warnSubtle },
    bad: { fg: th.neg, bg: th.negSubtle },
    info: { fg: th.brandStrong, bg: th.brandSubtle },
  }[tone];
}

export function T({ th, style, children, muted, small, bold, numberOfLines }: {
  th: Theme; style?: TextStyle | TextStyle[]; children: React.ReactNode; muted?: boolean; small?: boolean; bold?: boolean; numberOfLines?: number;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[{ color: muted ? th.muted : th.fg, fontSize: small ? 12.5 : 14.5, lineHeight: small ? 18 : 21, fontWeight: bold ? "600" : "400" }, style as TextStyle]}
    >
      {children}
    </Text>
  );
}

export function H({ th, children, size = 22 }: { th: Theme; children: React.ReactNode; size?: number }) {
  return <Text style={{ color: th.fg, fontSize: size, lineHeight: size * 1.22, fontWeight: "700", letterSpacing: -0.2 }}>{children}</Text>;
}

export function Card({ th, children, soft, style }: { th: Theme; children: React.ReactNode; soft?: boolean; style?: ViewStyle }) {
  return (
    <View style={[{ borderWidth: 1, borderColor: th.border, borderRadius: radius.lg, padding: 14, gap: 10, backgroundColor: soft ? th.surface2 : th.surface }, style]}>
      {children}
    </View>
  );
}

export function Button({ th, label, onPress, disabled, ghost, busy, small }: {
  th: Theme; label: string; onPress?: () => void; disabled?: boolean; ghost?: boolean; busy?: boolean; small?: boolean;
}) {
  const off = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      onPress={off ? undefined : onPress}
      style={({ pressed }) => ({
        borderRadius: radius.md,
        paddingVertical: small ? 8 : 13,
        paddingHorizontal: small ? 12 : 16,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
        borderWidth: ghost ? 1 : 0,
        borderColor: th.border,
        backgroundColor: off ? th.border : ghost ? (pressed ? th.brandSubtle : "transparent") : pressed ? th.brandStrong : th.brand,
        alignSelf: small ? "flex-start" : "stretch",
      })}
    >
      {busy ? <ActivityIndicator size="small" color={th.faint} /> : null}
      <Text style={{ color: off ? th.faint : ghost ? th.brandStrong : "#fff", fontWeight: "600", fontSize: small ? 13 : 15 }}>{label}</Text>
    </Pressable>
  );
}

export function Pill({ th, tone, label }: { th: Theme; tone: Tone; label: string }) {
  const c = tones(th, tone);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.bg, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10, alignSelf: "flex-start" }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.fg }} />
      <Text style={{ color: c.fg, fontSize: 12, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

export function Icon({ th, tone, label }: { th: Theme; tone: Tone; label?: string }) {
  const c = tones(th, tone);
  const glyph = label ?? (tone === "ok" ? "✓" : tone === "warn" ? "!" : tone === "bad" ? "✕" : "•");
  return (
    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: c.bg, alignItems: "center", justifyContent: "center", marginTop: 0 }}>
      <Text style={{ color: c.fg, fontSize: 12, fontWeight: "800" }}>{glyph}</Text>
    </View>
  );
}

export function Line({ th, tone, label, children }: { th: Theme; tone: Tone; label?: string; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
      <Icon th={th} tone={tone} label={label} />
      <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
    </View>
  );
}

export function StatusBox({ th, tone, title, children }: { th: Theme; tone: Tone; title: string; children?: React.ReactNode }) {
  const c = tones(th, tone);
  return (
    <View style={{ backgroundColor: c.bg, borderRadius: radius.lg, padding: 14, gap: 6 }}>
      <Text style={{ color: c.fg, fontWeight: "700", fontSize: 14.5 }}>{(tone === "ok" ? "✓ " : tone === "bad" ? "✕ " : "! ") + title}</Text>
      {children}
    </View>
  );
}

export function Chip({ th, label, on, onPress }: { th: Theme; label: string; on?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!on }}
      onPress={onPress}
      style={{ borderWidth: 1, borderColor: on ? th.brand : th.border, backgroundColor: on ? th.brandSubtle : th.surface, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 11 }}
    >
      <Text style={{ fontSize: 12.5, color: on ? th.brandStrong : th.fg, fontWeight: on ? "700" : "500" }}>{label}</Text>
    </Pressable>
  );
}

export function Thinking({ th, label }: { th: Theme; label: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
      <ActivityIndicator size="small" color={th.brand} />
      <Text style={{ color: th.muted }}>{label}</Text>
    </View>
  );
}

export function KV({ th, rows }: { th: Theme; rows: [string, string, boolean?][] }) {
  return (
    <View style={{ gap: 6 }}>
      {rows.map(([k, v, total], i) => (
        <View key={i} style={[s.kv, total ? { borderTopWidth: 1, borderTopColor: th.border, paddingTop: 6 } : null]}>
          <Text style={{ color: total ? th.fg : th.muted, fontWeight: total ? "700" : "400", flex: 1 }}>{k}</Text>
          <Text style={{ color: th.fg, fontWeight: total ? "700" : "500", fontVariant: ["tabular-nums"] }}>{v}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({ kv: { flexDirection: "row", gap: 12, alignItems: "baseline" } });
