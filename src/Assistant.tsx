import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
import { assist, AssistCase, AssistMsg, AssistReply } from "./api";
import type { Lang } from "./data";
import { font, r, Theme } from "./theme";
import { Icon, IconRow, Txt } from "./ui";

type Turn = AssistMsg & { draft?: AssistReply["draft"]; suggestions?: string[]; guard?: string; error?: boolean };
export type AssistCopy = { title: string; sub: string; placeholder: string; busy: string; error: string; draftLabel: string; copy: string; copied: string; share: string; startersTitle: string };

/**
 * The in-app assistant: a chat grounded in this seller's case. It explains requirements and drafts
 * documents so she never leaves the app. Verdicts stay with the rules; drafts are labelled.
 */
export function Assistant({ th, t, lang, visible, onClose, caseData, starters, seed, onSeedUsed, mic, wide, onLog }: {
  th: Theme; t: AssistCopy; lang: Lang; visible: boolean; onClose: () => void; caseData: AssistCase; starters: string[];
  seed: string | null; onSeedUsed: () => void; mic?: (onText: (s: string) => void) => React.ReactNode; wide?: boolean;
  onLog?: (title: string, json: unknown, ms?: number, note?: string) => void;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [copiedAt, setCopiedAt] = useState<number | null>(null);
  const scroll = useRef<ScrollView>(null);
  const toEnd = () => setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 80);

  async function send(text: string) {
    const q = text.trim(); if (!q || busy) return;
    const next: Turn[] = [...turns, { role: "user", content: q }];
    setTurns(next); setInput(""); setBusy(true); toEnd();
    try {
      const history = next.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.draft ? `${m.content}\n[Draft given: ${m.draft.title}]` : m.content }));
      const res = await assist({ lang, messages: history, case: caseData });
      setTurns((cur) => [...cur, { role: "assistant", content: res.message, draft: res.draft, suggestions: res.suggestions, guard: res.guard }]);
      onLog?.(res.guard ? "Assistant: rule answered (blocked-category workaround)" : `Assistant reply${res.draft ? `, draft: ${res.draft.title}` : ""}`, { question: q, reply: res.message, draft: res.draft ? { title: res.draft.title, notes: res.draft.notes } : null, guard: res.guard || null }, res.ms, res.model);
    } catch (e: any) {
      setTurns((cur) => [...cur, { role: "assistant", content: t.error, error: true }]);
      onLog?.("Assistant failed", { error: e?.message });
    }
    setBusy(false); toEnd();
  }

  useEffect(() => { if (visible && seed) { onSeedUsed(); send(seed); } }, [visible, seed]);

  async function copy(i: number, d: NonNullable<Turn["draft"]>) {
    const text = `${d.title}\n\n${d.body}`;
    try {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) { await navigator.clipboard.writeText(text); setCopiedAt(i); setTimeout(() => setCopiedAt(null), 1600); }
      else await Share.share({ message: text, title: d.title });
    } catch { /* cancelled */ }
  }

  const last = turns[turns.length - 1];
  const chips = !turns.length ? starters : last && last.role === "assistant" && !busy ? last.suggestions || [] : [];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: th.scrim, justifyContent: wide ? "center" : "flex-end", alignItems: "center" }} accessibilityLabel="Close">
        <Pressable onPress={() => {}} style={{ width: "100%", maxWidth: wide ? 520 : 480, height: "88%", backgroundColor: th.surface, borderTopLeftRadius: r.xl, borderTopRightRadius: r.xl, borderBottomLeftRadius: wide ? r.xl : 0, borderBottomRightRadius: wide ? r.xl : 0, overflow: "hidden" }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: th.line }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: th.brandTint, alignItems: "center", justifyContent: "center" }}><Icon name="message-circle" size={17} color={th.brand} /></View>
            <View style={{ flex: 1 }}>
              <Txt th={th} v="h3">{t.title}</Txt>
              <Txt th={th} v="tiny" color={th.muted}>{t.sub}</Txt>
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: th.sunken }}>
              <Icon name="x" size={18} color={th.muted} />
            </Pressable>
          </View>

          {/* Conversation */}
          <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
            {turns.map((m, i) => m.role === "user" ? (
              <View key={i} style={{ alignSelf: "flex-end", maxWidth: "85%", backgroundColor: th.brand, borderRadius: 16, borderBottomRightRadius: 4, paddingVertical: 9, paddingHorizontal: 13 }}>
                <Text style={{ fontFamily: font.body, fontSize: 14.5, lineHeight: 20, color: "#fff" }}>{m.content}</Text>
              </View>
            ) : (
              <View key={i} style={{ alignSelf: "stretch", gap: 8 }}>
                <View style={{ alignSelf: "flex-start", maxWidth: "92%", backgroundColor: m.error ? th.warnTint : th.sunken, borderRadius: 16, borderBottomLeftRadius: 4, paddingVertical: 9, paddingHorizontal: 13, gap: 6 }}>
                  {m.guard ? <Txt th={th} v="tiny" color={th.muted}>Rule answer · no model</Txt> : null}
                  <Text selectable style={{ fontFamily: font.body, fontSize: 14.5, lineHeight: 21, color: th.ink }}>{m.content}</Text>
                </View>
                {m.draft ? (
                  <View style={{ borderWidth: 1, borderColor: th.line, borderRadius: r.md, backgroundColor: th.surface, overflow: "hidden" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: th.brandTint }}>
                      <Icon name="file-text" size={15} color={th.brand} />
                      <Txt th={th} v="smallMed" color={th.brand} style={{ flex: 1 }}>{m.draft.title}</Txt>
                      <Text style={{ fontFamily: font.bodySemi, fontSize: 11, color: th.brand, borderWidth: 1, borderColor: th.brand, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>{t.draftLabel}</Text>
                    </View>
                    <Text selectable style={{ padding: 12, fontFamily: font.body, fontSize: 13.5, lineHeight: 20, color: th.ink }}>{m.draft.body}</Text>
                    {m.draft.notes.length ? <View style={{ paddingHorizontal: 12, paddingBottom: 10, gap: 4 }}>{m.draft.notes.map((n, k) => <IconRow key={k} th={th} icon="alert-circle" tone="warn"><Txt th={th} v="small">{n}</Txt></IconRow>)}</View> : null}
                    <Pressable onPress={() => copy(i, m.draft!)} accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderTopWidth: 1, borderTopColor: th.line }}>
                      <Icon name={copiedAt === i ? "check" : Platform.OS === "web" ? "copy" : "share-2"} size={15} color={th.brand} />
                      <Txt th={th} v="smallMed" color={th.brand}>{copiedAt === i ? t.copied : Platform.OS === "web" ? t.copy : t.share}</Txt>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))}
            {busy ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", backgroundColor: th.sunken, borderRadius: 16, paddingVertical: 9, paddingHorizontal: 13 }}>
                <ActivityIndicator size="small" color={th.brand} /><Txt th={th} v="small" color={th.muted}>{t.busy}</Txt>
              </View>
            ) : null}
            {chips.length ? (
              <View style={{ gap: 8, marginTop: 4 }}>
                {!turns.length ? <Txt th={th} v="smallMed" color={th.muted}>{t.startersTitle}</Txt> : null}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {chips.map((s) => (
                    <Pressable key={s} onPress={() => send(s)} accessibilityRole="button" style={({ hovered }: any) => ({ borderWidth: 1, borderColor: th.line, borderStyle: "dashed", backgroundColor: hovered ? th.sunken : th.surface, borderRadius: r.md, paddingVertical: 7, paddingHorizontal: 11, maxWidth: "100%" })}>
                      <Text style={{ fontFamily: font.bodyMed, fontSize: 13.5, color: th.ink }}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>

          {/* Input */}
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: th.line, backgroundColor: th.surface }}>
            <View style={{ flex: 1, borderWidth: 1.5, borderColor: th.line, borderRadius: r.lg, backgroundColor: th.surface }}>
              <TextInput value={input} onChangeText={setInput} placeholder={t.placeholder} placeholderTextColor={th.faint} multiline accessibilityLabel={t.placeholder}
                onKeyPress={(e: any) => { if (Platform.OS === "web" && e.nativeEvent.key === "Enter" && !e.nativeEvent.shiftKey) { e.preventDefault?.(); send(input); } }}
                style={{ minHeight: 44, maxHeight: 110, paddingHorizontal: 12, paddingVertical: 11, fontFamily: font.body, fontSize: 15, color: th.ink, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null) }} />
            </View>
            {mic ? mic((s) => setInput(s)) : null}
            <Pressable onPress={() => send(input)} disabled={!input.trim() || busy} accessibilityRole="button" accessibilityLabel="Send"
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: input.trim() && !busy ? th.brand : th.line, alignItems: "center", justifyContent: "center" }}>
              <Icon name="arrow-up" size={20} color={input.trim() && !busy ? "#fff" : th.faint} />
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
