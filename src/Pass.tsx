import React, { useEffect, useRef } from "react";
import { Animated, Easing, Platform, Pressable, Text, View } from "react-native";
import { font, r, Theme } from "./theme";
import { Icon, Tone, toneColors, Txt } from "./ui";

export type PassRow = { label: string; value: string; tone: Tone; stamp: string; onFix?: () => void };

/** The go-live pass: the single bold element of the product. Stamps land one by one when it opens. */
export function GoLivePass({ th, title, sub, holder, shopLabel, shop, onEditShop, editLabel, rows, footer, code, canvasColor }: {
  th: Theme; title: string; sub: string; holder: string; shopLabel: string; shop: string; onEditShop: () => void; editLabel: string;
  rows: PassRow[]; footer: React.ReactNode; code: string; canvasColor: string;
}) {
  const anims = useRef(rows.map(() => new Animated.Value(0))).current;
  const key = rows.map((x) => x.tone).join(",");
  useEffect(() => {
    anims.forEach((a) => a.setValue(0));
    Animated.stagger(220, anims.map((a) => Animated.spring(a, { toValue: 1, friction: 6, tension: 120, useNativeDriver: Platform.OS !== "web" }))).start();
  }, [key]);

  return (
    <View style={{ borderRadius: r.xl, overflow: "hidden", backgroundColor: th.surface, borderWidth: 1, borderColor: th.line }}>
      {/* Header band */}
      <View style={{ backgroundColor: th.navy, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 20, gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ gap: 2 }}>
            <Text style={{ fontFamily: font.display, fontSize: 20, color: th.navyInk, letterSpacing: -0.2 }}>{title}</Text>
            <Text style={{ fontFamily: font.bodyMed, fontSize: 12.5, color: th.navyMuted }}>{sub}</Text>
          </View>
          <Text style={{ fontFamily: font.monoBold, fontSize: 13, color: th.navyMuted, letterSpacing: 1 }}>{code}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={{ fontFamily: font.monoBold, fontSize: 13, color: th.navyInk, letterSpacing: 1.2 }}>SIGN-UP</Text>
          <View style={{ flex: 1, height: 1, borderTopWidth: 1, borderStyle: "dashed", borderColor: th.navyMuted, opacity: 0.6 }} />
          <Icon name="send" size={16} color={th.navyInk} />
          <View style={{ flex: 1, height: 1, borderTopWidth: 1, borderStyle: "dashed", borderColor: th.navyMuted, opacity: 0.6 }} />
          <Text style={{ fontFamily: font.monoBold, fontSize: 13, color: th.navyInk, letterSpacing: 1.2 }}>LIVE</Text>
        </View>
        <View style={{ gap: 10 }}>
          <View style={{ gap: 2 }}>
            <Text style={{ fontFamily: font.bodyMed, fontSize: 11.5, color: th.navyMuted }}>Merchant</Text>
            <Text style={{ fontFamily: font.bodySemi, fontSize: 15, color: th.navyInk }}>{holder}</Text>
          </View>
          <Pressable onPress={onEditShop} accessibilityRole="button" accessibilityLabel={`${shopLabel}: ${shop}. ${editLabel}`} style={{ gap: 2, alignSelf: "flex-start" }}>
            <Text style={{ fontFamily: font.bodyMed, fontSize: 11.5, color: th.navyMuted }}>{shopLabel}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontFamily: font.bodySemi, fontSize: 15, color: th.navyInk }}>{shop}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)" }}>
                <Icon name="edit-2" size={11} color={th.navyInk} />
                <Text style={{ fontFamily: font.bodySemi, fontSize: 11.5, color: th.navyInk }}>{editLabel}</Text>
              </View>
            </View>
          </Pressable>
        </View>
      </View>

      {/* Checks with stamps */}
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 }}>
        {rows.map((row, i) => {
          const [fg, bg] = toneColors(th, row.tone);
          const a = anims[i];
          return (
            <View key={row.label} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, borderBottomWidth: i < rows.length - 1 ? 1 : 0, borderBottomColor: th.line }}>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Txt th={th} v="tiny" color={th.muted}>{row.label}</Txt>
                <Txt th={th} v="bodyMed" numberOfLines={2}>{row.value}</Txt>
              </View>
              <Animated.View style={{ opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [1.6, 1] }) }, { rotate: "-8deg" }] }}>
                <Pressable
                  disabled={!row.onFix}
                  onPress={row.onFix}
                  accessibilityRole={row.onFix ? "button" : undefined}
                  accessibilityLabel={`${row.label}: ${row.stamp}`}
                  style={{ borderWidth: 2, borderColor: fg, backgroundColor: bg, borderRadius: 10, paddingVertical: 5, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 5 }}
                >
                  <Icon name={row.tone === "ok" ? "check" : row.tone === "bad" ? "x" : "alert-triangle"} size={13} color={fg} />
                  <Text style={{ fontFamily: font.monoBold, fontSize: 12, color: fg, letterSpacing: 0.8 }}>{row.stamp.toUpperCase()}</Text>
                </Pressable>
              </Animated.View>
            </View>
          );
        })}
      </View>

      {/* Perforation */}
      <View style={{ height: 22, justifyContent: "center" }}>
        <View style={{ marginHorizontal: 18, borderTopWidth: 2, borderStyle: "dashed", borderColor: th.line }} />
        <View style={{ position: "absolute", left: -11, width: 22, height: 22, borderRadius: 11, backgroundColor: canvasColor, borderWidth: 1, borderColor: th.line }} />
        <View style={{ position: "absolute", right: -11, width: 22, height: 22, borderRadius: 11, backgroundColor: canvasColor, borderWidth: 1, borderColor: th.line }} />
      </View>

      {/* Stub */}
      <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 18, gap: 10 }}>{footer}</View>
    </View>
  );
}
