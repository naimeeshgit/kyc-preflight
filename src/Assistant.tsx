import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
import { assist, AssistCase, AssistMsg, AssistReply } from "./api";
import type { Lang } from "./data";
import { font, r, Theme } from "./theme";
import { Icon, IconRow, Txt } from "./ui";

type Turn = AssistMsg & { draft?: AssistReply["draft"]; checklist?: AssistReply["checklist"]; suggestions?: string[]; guard?: string; error?: boolean };
export type AssistCopy = { typeHere: string; useSuggested: string; edit: string; doneEditing: string; typeHint: string; attach: string; attachedOk: string; remove: string; fillFirst: (n: number) => string; fillAsk: (n: number) => string; attachNote: string; title: string; sub: string; disclaimer: string; disclaimerChecklist: string; fix: string; checklistTitle: (done: number, total: number) => string; blanks: (n: number) => string; placeholder: string; busy: string; error: string; draftLabel: string; copy: string; copied: string; share: string; startersTitle: string };

/**
 * The in-app assistant: a chat grounded in this seller's case. It explains requirements and drafts
 * documents so she never leaves the app. Verdicts stay with the rules; drafts are labelled.
 */
export function Assistant({ th, t, lang, visible, onClose, caseData, starters, seed, onSeedUsed, mic, wide, onLog, attachedTitles = [], onAttach, onDetach }: {
  th: Theme; t: AssistCopy; lang: Lang; visible: boolean; onClose: () => void; caseData: AssistCase; starters: string[];
  seed: string | null; onSeedUsed: () => void; mic?: (onText: (s: string) => void) => React.ReactNode; wide?: boolean;
  onLog?: (title: string, json: unknown, ms?: number, note?: string) => void;
  attachedTitles?: string[]; onAttach?: (d: { title: string; body: string }) => void; onDetach?: (title: string) => void;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [copiedAt, setCopiedAt] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [filling, setFilling] = useState<number | null>(null);
  const [typed, setTyped] = useState<Record<string, string>>({});
  const fillBlank = (i: number, blank: string, value: string) => { if (!value.trim()) return; setTurns((cur) => cur.map((x, k) => (k === i && x.draft ? { ...x, draft: { ...x.draft, body: x.draft.body.split(blank).join(value.trim()) } } : x))); };
  const editBody = (i: number, body: string) => setTurns((cur) => cur.map((x, k) => (k === i && x.draft ? { ...x, draft: { ...x.draft, body } } : x)));
  const scroll = useRef<ScrollView>(null);
  const toEnd = () => setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 80);

  async function send(text: string) {
    const q = text.trim(); if (!q || busy) return;
    const next: Turn[] = [...turns, { role: "user", content: q }];
    setTurns(next); setInput(""); setBusy(true); toEnd();
    try {
      const history = next.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.draft ? `${m.content}\n[Draft given: ${m.draft.title}]` : m.content }));
      const res = await assist({ lang, messages: history, case: caseData });
      setTurns((cur) => [...cur, { role: "assistant", content: res.message, draft: res.draft, checklist: res.checklist, suggestions: res.suggestions, guard: res.guard }]);
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
  // When the assistant just asked a question, the chips are answers: make them easy, thumb-sized pills.
  const answering = Boolean(last && last.role === "assistant" && !last.draft && !last.checklist?.length && /\?\s*$/.test(last.content));
  const isEscape = (s: string) => /^(skip|just draft it|bas draft kar dijiye)$/i.test(s.trim());

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
                {m.checklist?.length ? (
                  <View style={{ borderWidth: 1, borderColor: th.line, borderRadius: r.md, backgroundColor: th.surface, overflow: "hidden" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: th.brandTint }}>
                      <Icon name="check-square" size={15} color={th.brand} />
                      <Txt th={th} v="smallMed" color={th.brand} style={{ flex: 1 }}>{t.checklistTitle(m.checklist.filter((x) => x.done).length, m.checklist.length)}</Txt>
                    </View>
                    {m.checklist.map((x, k) => (
                      <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 9, borderTopWidth: k ? 1 : 0, borderTopColor: th.line }}>
                        <Icon name={x.done ? "check-circle" : "circle"} size={16} color={x.done ? th.pos : th.faint} />
                        <Txt th={th} v="small" color={x.done ? th.muted : th.ink} style={{ flex: 1 }}>{x.item}</Txt>
                        {!x.done && x.action ? (
                          <Pressable onPress={() => send(x.action!)} disabled={busy} accessibilityRole="button" style={({ hovered }: any) => ({ paddingVertical: 5, paddingHorizontal: 10, borderRadius: r.pill, backgroundColor: hovered ? th.brandPress : th.brand })}>
                            <Text style={{ fontFamily: font.bodySemi, fontSize: 12, color: "#fff" }}>{t.fix}</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    ))}
                    <Txt th={th} v="tiny" color={th.faint} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>{t.disclaimerChecklist}</Txt>
                  </View>
                ) : null}
                {m.draft ? (
                  <View style={{ borderWidth: 1, borderColor: th.line, borderRadius: r.md, backgroundColor: th.surface, overflow: "hidden" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: th.brandTint }}>
                      <Icon name="file-text" size={15} color={th.brand} />
                      <Txt th={th} v="smallMed" color={th.brand} style={{ flex: 1 }}>{m.draft.title}</Txt>
                      <Text style={{ fontFamily: font.bodySemi, fontSize: 11, color: th.brand, borderWidth: 1, borderColor: th.brand, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>{t.draftLabel}</Text>
                    </View>
                    {editing === i ? (
                      <TextInput value={m.draft.body} onChangeText={(v) => editBody(i, v)} multiline autoFocus accessibilityLabel={m.draft.title}
                        style={{ margin: 10, padding: 10, minHeight: 160, borderWidth: 1.5, borderColor: th.brand, borderRadius: r.md, fontFamily: font.body, fontSize: 13.5, lineHeight: 20, color: th.ink, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null) }} />
                    ) : (
                      <Pressable onPress={() => setEditing(i)} accessibilityRole="button" accessibilityLabel={t.edit}>
                        <Text style={{ padding: 12, fontFamily: font.body, fontSize: 13.5, lineHeight: 20, color: th.ink }}>{m.draft.body}</Text>
                      </Pressable>
                    )}
                    <Pressable onPress={() => setEditing(editing === i ? null : i)} accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingBottom: 8 }}>
                      <Icon name={editing === i ? "check" : "edit-2"} size={13} color={th.brand} />
                      <Txt th={th} v="smallMed" color={th.brand}>{editing === i ? t.doneEditing : t.edit}</Txt>
                    </Pressable>
                    {m.draft.notes.length ? <View style={{ paddingHorizontal: 12, paddingBottom: 10, gap: 4 }}>{m.draft.notes.map((n, k) => <IconRow key={k} th={th} icon="alert-circle" tone="warn"><Txt th={th} v="small">{n}</Txt></IconRow>)}</View> : null}
                    {(() => { const n = (m.draft.body.match(/\[[^\]]+\]/g) || []).length; return n ? (
                      <View style={{ marginHorizontal: 12, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: r.md, backgroundColor: th.warnTint }}>
                        <Icon name="edit-3" size={13} color={th.warn} /><Txt th={th} v="smallMed" color={th.warn} style={{ flex: 1 }}>{t.blanks(n)} · {t.typeHint}</Txt>
                        {(m.draft.body.match(/\[[^\]]*\d[^\]]*\]/g) || []).length ? (
                          <Pressable onPress={() => editBody(i, m.draft!.body.replace(/\[(?:e\.g\.,?\s*)?([^\]]*\d[^\]]*)\]/g, "$1"))} accessibilityRole="button" style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: r.pill, backgroundColor: th.surface, borderWidth: 1, borderColor: th.warn }}>
                            <Text style={{ fontFamily: font.bodySemi, fontSize: 12, color: th.warn }}>{t.useSuggested}</Text>
                          </Pressable>
                        ) : null}
                      </View>) : null; })()}
                    {filling === i ? (() => {
                      const blanks = Array.from(new Set(m.draft!.body.match(/\[[^\]]+\]/g) || []));
                      return blanks.length ? (
                        <View style={{ marginHorizontal: 12, marginBottom: 10, padding: 10, gap: 10, borderRadius: r.md, borderWidth: 1.5, borderColor: th.brand, backgroundColor: th.brandTint }}>
                          {blanks.map((b) => {
                            const label = b.slice(1, -1); const opts = blankOptions(label);
                            return (
                              <View key={b} style={{ gap: 6 }}>
                                <Txt th={th} v="smallMed">{label.replace(/^e\.g\.,?\s*/i, "")}</Txt>
                                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                                  {opts.map((o) => (
                                    <Pressable key={o} onPress={() => fillBlank(i, b, o)} accessibilityRole="button" style={{ borderWidth: 1.5, borderColor: th.brand, backgroundColor: th.surface, borderRadius: r.pill, paddingVertical: 6, paddingHorizontal: 12 }}>
                                      <Text style={{ fontFamily: font.bodySemi, fontSize: 13, color: th.brand }}>{o}</Text>
                                    </Pressable>
                                  ))}
                                  <View style={{ flexDirection: "row", flex: 1, minWidth: 140, borderWidth: 1, borderColor: th.line, borderRadius: r.md, backgroundColor: th.surface }}>
                                    <TextInput value={typed[b] || ""} onChangeText={(v) => setTyped((x) => ({ ...x, [b]: v }))} placeholder={t.typeHere} placeholderTextColor={th.faint}
                                      onSubmitEditing={() => fillBlank(i, b, typed[b] || "")} accessibilityLabel={label}
                                      style={{ flex: 1, paddingHorizontal: 10, paddingVertical: 7, fontFamily: font.body, fontSize: 13.5, color: th.ink, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null) }} />
                                    <Pressable onPress={() => fillBlank(i, b, typed[b] || "")} accessibilityRole="button" style={{ paddingHorizontal: 10, justifyContent: "center" }}>
                                      <Icon name="check" size={16} color={th.brand} />
                                    </Pressable>
                                  </View>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      ) : null;
                    })() : null}
                    <Txt th={th} v="tiny" color={th.faint} style={{ paddingHorizontal: 12, paddingBottom: 10 }}>{t.disclaimer}</Txt>
                    {(() => {
                      const d = m.draft!; const n = (d.body.match(/\[[^\]]+\]/g) || []).length; const isOn = attachedTitles.includes(d.title);
                      return (
                        <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: th.line }}>
                          <Pressable onPress={() => copy(i, d)} accessibilityRole="button" style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 11, borderRightWidth: 1, borderRightColor: th.line }}>
                            <Icon name={copiedAt === i ? "check" : Platform.OS === "web" ? "copy" : "share-2"} size={15} color={th.brand} />
                            <Txt th={th} v="smallMed" color={th.brand}>{copiedAt === i ? t.copied : Platform.OS === "web" ? t.copy : t.share}</Txt>
                          </Pressable>
                          {onAttach ? (isOn ? (
                            <Pressable onPress={() => onDetach?.(d.title)} accessibilityRole="button" style={{ flex: 1.4, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 11, backgroundColor: th.posTint }}>
                              <Icon name="check-circle" size={15} color={th.pos} />
                              <Txt th={th} v="smallMed" color={th.pos}>{t.attachedOk}</Txt>
                              <Txt th={th} v="tiny" color={th.muted}>· {t.remove}</Txt>
                            </Pressable>
                          ) : n ? (
                            <Pressable onPress={() => setFilling(filling === i ? null : i)} accessibilityRole="button" style={{ flex: 1.4, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 11, backgroundColor: th.warnTint }}>
                              <Icon name="edit-3" size={15} color={th.warn} />
                              <Txt th={th} v="smallMed" color={th.warn}>{t.fillFirst(n)}</Txt>
                            </Pressable>
                          ) : (
                            <Pressable onPress={() => { onAttach(d); setTurns((cur) => [...cur, { role: "assistant", content: t.attachNote }]); toEnd(); }} accessibilityRole="button" style={({ hovered }: any) => ({ flex: 1.4, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 11, backgroundColor: hovered ? th.brandPress : th.brand })}>
                              <Icon name="upload" size={15} color="#fff" />
                              <Text style={{ fontFamily: font.bodySemi, fontSize: 13.5, color: "#fff" }}>{t.attach}</Text>
                            </Pressable>
                          )) : null}
                        </View>
                      );
                    })()}
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
                  {chips.map((s) => answering ? (
                    <Pressable key={s} onPress={() => send(s)} accessibilityRole="button" style={({ hovered }: any) => isEscape(s)
                      ? { borderRadius: r.pill, paddingVertical: 9, paddingHorizontal: 14 }
                      : { borderWidth: 1.5, borderColor: th.brand, backgroundColor: hovered ? th.brand : th.brandTint, borderRadius: r.pill, paddingVertical: 9, paddingHorizontal: 16, maxWidth: "100%" }}>
                      {({ hovered }: any) => <Text style={{ fontFamily: font.bodySemi, fontSize: 14, color: isEscape(s) ? th.muted : hovered ? "#fff" : th.brand }}>{s}</Text>}
                    </Pressable>
                  ) : (
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

/** Tap options for a blank, from its wording. Rules only: no model involved in filling blanks. */
function blankOptions(label: string): string[] {
  const l = label.toLowerCase();
  if (l.includes("/")) return label.split("/").map((x) => x.replace(/^(e\.g\.,?\s*)/i, "").trim()).filter((x) => x && x.length < 40);
  if (/hour/.test(l)) return ["24 hours", "48 hours"];
  if (/working day|refund|process/.test(l)) return ["5-7 working days", "7-10 working days"];
  if (/day|window|cancel|return/.test(l)) return ["3 days", "7 days", "15 days"];
  if (/minute|session|length/.test(l)) return ["30 minutes", "45 minutes", "60 minutes"];
  if (/price|₹|rs|amount/.test(l)) return ["₹500-1,000", "₹1,000-2,000"];
  if (/number/.test(l)) return ["3", "7", "15"];
  return [];
}
