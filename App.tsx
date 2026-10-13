import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as Haptics from "expo-haptics";
import { useFonts } from "expo-font";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { TASAOrbiter_600SemiBold, TASAOrbiter_700Bold } from "@expo-google-fonts/tasa-orbiter";
import { IBMPlexMono_500Medium, IBMPlexMono_600SemiBold } from "@expo-google-fonts/ibm-plex-mono";
import { font, r, Theme, useTheme } from "./src/theme";
import { COPY, Copy, FEE, FEE_TOTAL, GST, Lang, NamesAI, PRESETS, REC_NAMES, ClassifyAI, Policy, Status as PStatus, inr, policyById, recordedClassify } from "./src/data";
import { classify, DocInput, health, Health, readNames } from "./src/api";
import { compareNames, Token } from "./src/names";
import { GoLivePass, PassRow } from "./src/Pass";
import { Button, Chip, FeeRows, Icon, IconRow, Notice, Panel, Reveal, Sheet, Status, Thinking, Tone, Txt } from "./src/ui";

const SPECIMEN_IMG = {
  pan: require("./assets/specimens/pan.png"),
  aadhaar: require("./assets/specimens/aadhaar.png"),
  bank_short: require("./assets/specimens/bank_short.png"),
  bank_full: require("./assets/specimens/bank_full.png"),
};

type DocKey = "pan" | "aadhaar" | "bank";
type Photo = { uri: string; base64: string; mediaType: string };
type LogKind = "ai" | "rec" | "rule" | "mock";
type LogItem = { id: number; kind: LogKind; title: string; at: string; ms?: number; note?: string; json: unknown };
type BizResult = { ai: ClassifyAI; policy: Policy; status: PStatus; lowConf: boolean; docs: string[]; website: boolean; source: "live" | "rec" };

const haptic = (kind: "success" | "warning" | "light") => {
  if (Platform.OS === "web") return;
  if (kind === "light") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  else Haptics.notificationAsync(kind === "success" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning).catch(() => {});
};

export default function App() {
  const [loaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, TASAOrbiter_600SemiBold, TASAOrbiter_700Bold, IBMPlexMono_500Medium, IBMPlexMono_600SemiBold });
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => { const t = setTimeout(() => setTimedOut(true), 2500); return () => clearTimeout(t); }, []);
  if (!loaded && !timedOut) return null;
  return <SafeAreaProvider><Root /></SafeAreaProvider>;
}

function Root() {
  const th = useTheme();
  const { width, height } = useWindowDimensions();
  const phoneH = Math.max(600, Math.min(820, height - 48));
  const wide = Platform.OS === "web" && width >= 900;
  const [lang, setLang] = useState<Lang>("en");
  const c = COPY[lang];
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<"live" | "rec">("live");
  const [srv, setSrv] = useState<Health | null | undefined>(undefined);
  const [log, setLog] = useState<LogItem[]>([]);
  const [howOpen, setHowOpen] = useState(false);
  const [feeOpen, setFeeOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const [preset, setPreset] = useState<string | null>("priya");
  const [bizText, setBizText] = useState(PRESETS.priya.en);
  const [bizBusy, setBizBusy] = useState(false);
  const [bizErr, setBizErr] = useState<string | null>(null);
  const [biz, setBiz] = useState<BizResult | null>(null);

  const [pan, setPan] = useState("ABCPR0000X");
  const [panEdit, setPanEdit] = useState(false);
  const [consent, setConsent] = useState(false);
  const [simFound, setSimFound] = useState(false);
  const [routeBusy, setRouteBusy] = useState(false);
  const [route, setRoute] = useState<"instant" | "video" | null>(null);
  const [day, setDay] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);

  const [bankVariant, setBankVariant] = useState<"short" | "full">("short");
  const [photos, setPhotos] = useState<Partial<Record<DocKey, Photo>>>({});
  const [namesBusy, setNamesBusy] = useState(false);
  const [namesErr, setNamesErr] = useState<string | null>(null);
  const [names, setNames] = useState<{ ai: NamesAI; source: "live" | "rec"; recKey?: "short" | "full" } | null>(null);
  const [brand, setBrand] = useState("Gulmohar Jewels");
  const [brandDraft, setBrandDraft] = useState("Gulmohar Jewels");

  const live = mode === "live" && !!srv?.liveAI;
  useEffect(() => { health().then((h) => { setSrv(h); if (!h?.liveAI) setMode("rec"); }); }, []);

  const addLog = useCallback((e: Omit<LogItem, "id" | "at">) => {
    const at = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLog((l) => [{ ...e, id: Date.now() + Math.random(), at }, ...l].slice(0, 16));
  }, []);
  const go = (n: number) => { setStep(n); requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false })); };
  const scrollDown = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);

  function buildBiz(ai: ClassifyAI, l: Lang, source: "live" | "rec"): BizResult {
    const policy = policyById(ai.policy_id);
    let status = policy.status, lowConf = false;
    if (status === "supported" && !(Number(ai.confidence) >= 0.6)) { status = "needs_review"; lowConf = true; }
    const docs = [...COPY[l].docBase];
    if (ai.is_reseller === true && policy.resellerDoc) docs.push(COPY[l].docInvoice);
    if (policy.extra) docs.push(policy.extra);
    return { ai, policy, status, lowConf, docs, website: ai.has_website === true, source };
  }

  const switchLang = (l: Lang) => {
    if (l === lang) return;
    setLang(l);
    if (preset) setBizText(PRESETS[preset][l]);
    if (biz && biz.source === "rec" && preset) setBiz(buildBiz(recordedClassify(preset, l), l, "rec"));
    if (names && names.source === "rec" && names.recKey) setNames({ ai: REC_NAMES[names.recKey][l], source: "rec", recKey: names.recKey });
  };

  async function runClassify() {
    const text = bizText.trim(); if (!text) return;
    setBizBusy(true); setBizErr(null); setBiz(null);
    const presetKey = Object.keys(PRESETS).find((k) => PRESETS[k].en === text || PRESETS[k].hi === text) || null;
    let ai: ClassifyAI | null = null, source: "live" | "rec" = "rec", ms = 0, note = "", model = "";
    if (live) {
      try { const res = await classify(text, lang); ai = res.ai; ms = res.ms; model = res.model; source = "live"; }
      catch (e: any) { note = `Live call failed (${e?.message || "error"}); used the recorded answer.`; }
    }
    if (!ai && presetKey) ai = recordedClassify(presetKey, lang);
    setBizBusy(false);
    if (!ai) {
      setBizErr(c.errNoAI);
      addLog({ kind: "ai", title: "Description → category failed", note: note || "Live AI is off", json: { error: note || "Live AI is off and no recorded answer exists for this text" } });
      return;
    }
    const res = buildBiz(ai, lang, source);
    setBiz(res);
    haptic(res.status === "supported" ? "success" : "warning");
    addLog({ kind: source === "live" ? "ai" : "rec", title: "Description → category", ms, note: [model, note].filter(Boolean).join(" · "), json: ai });
    addLog({ kind: "rule", title: "Eligibility from the policy table", json: { policy_id: res.policy.id, table_status: res.policy.status, confidence: ai.confidence, final_status: res.status, documents: res.docs } });
    scrollDown();
  }

  function runRoute() {
    setRouteBusy(true); setRoute(null); setSlot(null);
    setTimeout(() => {
      const res = simFound ? "instant" : "video";
      setRoute(res); setRouteBusy(false); haptic(res === "instant" ? "success" : "light");
      addLog({ kind: "mock", title: "KYC registry lookup (mocked)", json: { pan: pan.slice(0, 3) + "•••" + pan.slice(-2), consent, record_found: simFound, route: res } });
      scrollDown();
    }, 900);
  }

  async function pick(k: DocKey, from: "camera" | "gallery") {
    try {
      if (from === "camera") { const p = await ImagePicker.requestCameraPermissionsAsync(); if (!p.granted) return; }
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1 };
      const res = from === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (res.canceled || !res.assets?.[0]?.uri) return;
      const a = res.assets[0];
      const ctx = ImageManipulator.manipulate(a.uri);
      if ((a.width || 0) > 1200) ctx.resize({ width: 1200 });
      const out = await (await ctx.renderAsync()).saveAsync({ base64: true, compress: 0.6, format: SaveFormat.JPEG });
      if (!out.base64) throw new Error("no data");
      setPhotos((ph) => ({ ...ph, [k]: { uri: out.uri, base64: out.base64 as string, mediaType: "image/jpeg" } }));
      setNames(null); setNamesErr(null);
    } catch { setNamesErr(c.errPhotos); }
  }

  async function runNames(variant = bankVariant) {
    setNamesBusy(true); setNamesErr(null); setNames(null);
    const anyPhoto = Object.keys(photos).length > 0;
    const doc = (k: DocKey): DocInput => photos[k] ? { base64: photos[k]!.base64, mediaType: photos[k]!.mediaType } : { sample: k === "bank" ? `bank_${variant}` : k };
    let ai: NamesAI | null = null, source: "live" | "rec" = "rec", ms = 0, note = "", model = "";
    if (live) {
      try { const res = await readNames({ pan: doc("pan"), aadhaar: doc("aadhaar"), bank: doc("bank") }, lang); ai = res.ai; ms = res.ms; model = res.model; source = "live"; }
      catch (e: any) { note = `Live call failed (${e?.message || "error"}); used the recorded answer.`; }
    } else {
      await new Promise((res) => setTimeout(res, 1400)); // keep the scan moment in recorded mode
    }
    if (!ai && !anyPhoto) ai = REC_NAMES[variant][lang];
    setNamesBusy(false);
    if (!ai) {
      setNamesErr(c.errPhotos);
      addLog({ kind: "ai", title: "Read names failed", note: note || "Live AI is off", json: { error: note || "Live AI is off and uploaded photos have no recorded answer" } });
      return;
    }
    setNames({ ai, source, recKey: source === "rec" ? variant : undefined });
    haptic(ai.comparisons.some((x) => x.verdict === "likely_fail") ? "warning" : "success");
    addLog({ kind: source === "live" ? "ai" : "rec", title: "Read names from documents (vision) and compare", ms, note: [model, note].filter(Boolean).join(" · "), json: ai });
    scrollDown();
  }

  /* Readiness: rules decide what the pass shows. */
  const slotLabel = slot ? `${c.days[day]} ${slot}` : null;
  const namesTone: Tone = !names ? "bad" : names.ai.comparisons.some((x) => x.verdict === "likely_fail") ? "bad" : names.ai.comparisons.some((x) => x.verdict === "unclear") ? "warn" : "ok";
  const passRows: PassRow[] = useMemo(() => {
    const catTone: Tone = !biz ? "bad" : biz.status === "supported" ? "ok" : biz.status === "needs_review" ? "warn" : "bad";
    const routeTone: Tone = !route ? "bad" : route === "instant" || slot ? "ok" : "warn";
    return [
      { label: c.rowCat, value: biz ? (biz.ai.category_label || biz.policy.label) : "—", tone: catTone, stamp: catTone === "ok" ? c.passed : catTone === "warn" ? c.review : c.fix, onFix: catTone === "ok" ? undefined : () => go(1) },
      { label: c.rowRoute, value: !route ? "—" : route === "instant" ? c.routeInstant : c.routeVideo(slotLabel || "—"), tone: routeTone, stamp: routeTone === "ok" ? c.passed : c.fix, onFix: routeTone === "ok" ? undefined : () => go(2) },
      { label: c.rowNames, value: namesTone === "ok" ? c.namesOk : namesTone === "warn" ? c.namesWarn : c.namesBad, tone: namesTone, stamp: namesTone === "ok" ? c.passed : namesTone === "warn" ? c.review : c.fix, onFix: namesTone === "ok" ? undefined : () => go(3) },
    ];
  }, [biz, route, slot, slotLabel, namesTone, c]);
  const ready = !passRows.some((x) => x.tone === "bad");

  function restart() {
    setBiz(null); setBizErr(null); setRoute(null); setSlot(null); setConsent(false); setNames(null); setNamesErr(null); setPhotos({}); setBankVariant("short");
    setPreset("priya"); setBizText(PRESETS.priya[lang]); go(0);
  }

  /* ---------------- Screens ---------------- */
  let screen: React.ReactNode = null, footer: React.ReactNode = null;

  if (step === 0) {
    screen = (
      <>
        <Txt th={th} v="smallMed" color={th.muted}>{c.hi}</Txt>
        <Txt th={th} v="h1">{c.s0Title}</Txt>
        <Txt th={th} color={th.muted}>{c.s0Body}</Txt>
        <PassPreview th={th} labels={c.s0Checks} />
        <View style={{ gap: 12, marginTop: 4 }}>
          {c.s0Why.map(([ic, t], i) => <IconRow key={i} th={th} icon={ic}><Txt th={th} color={th.muted}>{t}</Txt></IconRow>)}
        </View>
        <Pressable onPress={() => setFeeOpen(true)} accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", paddingVertical: 6 }}>
          <Icon name="info" size={16} color={th.brand} />
          <Txt th={th} v="bodyMed" color={th.brand}>{c.s0Fee}</Txt>
        </Pressable>
      </>
    );
    footer = <Button th={th} label={c.s0Cta} onPress={() => go(1)} />;
  }

  if (step === 1) {
    const st = biz?.status;
    screen = (
      <>
        <Txt th={th} v="h1">{c.s1Title}</Txt>
        <Txt th={th} color={th.muted}>{c.s1Body}</Txt>
        <View style={{ borderWidth: 1.5, borderColor: th.line, borderRadius: r.lg, backgroundColor: th.surface }}>
          <TextInput
            value={bizText}
            onChangeText={(v) => { setBizText(v); setPreset(null); setBiz(null); setBizErr(null); }}
            placeholder={c.s1Placeholder}
            placeholderTextColor={th.faint}
            multiline
            accessibilityLabel={c.s1Title}
            style={{ minHeight: 112, padding: 16, fontFamily: font.body, fontSize: 16, lineHeight: 23, color: th.ink, textAlignVertical: "top", ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null) }}
          />
        </View>
        {!biz ? (
          <View style={{ gap: 8 }}>
            <Txt th={th} v="smallMed" color={th.muted}>{c.examples}</Txt>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {Object.entries(PRESETS).map(([k, p]) => (
                <Chip key={k} th={th} label={p.label} on={preset === k} onPress={() => { setPreset(k); setBizText(p[lang]); setBiz(null); setBizErr(null); }} />
              ))}
            </View>
          </View>
        ) : null}
        {bizBusy ? <Thinking th={th} label={c.s1Busy} /> : null}
        {bizErr ? <Notice th={th} tone="warn" title={bizErr} /> : null}
        {biz ? (
          <Reveal>
            <Panel th={th}>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Txt th={th} v="h3">{biz.ai.category_label || biz.policy.label}</Txt>
                  {biz.ai.sub_category ? <Txt th={th} v="small" color={th.muted}>{biz.ai.sub_category}</Txt> : null}
                </View>
                <Status th={th} tone={st === "supported" ? "ok" : st === "needs_review" ? "warn" : "bad"} label={c[biz.status]} />
              </View>
              <Txt th={th}>{biz.ai.explanation}</Txt>
              {biz.lowConf ? <Txt th={th} v="small" color={th.muted}>{c.lowConf}</Txt> : null}
            </Panel>
            {st === "not_supported" ? (
              <Notice th={th} tone="bad" title={c.stopTitle}>
                <Txt th={th}>{c.stopBody}</Txt>
                <Text style={{ fontFamily: font.display, fontSize: 22, color: th.neg, marginTop: 4 }}>{inr(FEE_TOTAL)} {c.saved}</Text>
              </Notice>
            ) : (
              <>
                {st === "needs_review" ? <Notice th={th} tone="warn" title={c.needs_review}><Txt th={th}>{c.reviewNote}</Txt></Notice> : null}
                <Panel th={th} tint>
                  <Txt th={th} v="h3">{c.youNeed}</Txt>
                  {biz.docs.map((d, i) => <IconRow key={i} th={th} icon={i === 0 ? "credit-card" : i === 1 ? "user" : i === 2 ? "briefcase" : "file-text"}><Txt th={th}>{d}</Txt></IconRow>)}
                  <IconRow th={th} icon="link" tone="ok"><Txt th={th}>{biz.website ? c.routeSite : c.routeLinks}</Txt></IconRow>
                  {(biz.ai.flags || []).filter((f) => f.severity === "warn").map((f, i) => <IconRow key={`f${i}`} th={th} icon="alert-triangle" tone="warn"><Txt th={th}>{f.text}</Txt></IconRow>)}
                </Panel>
              </>
            )}
          </Reveal>
        ) : null}
      </>
    );
    footer = biz
      ? st === "not_supported"
        ? <Button th={th} kind="secondary" label={c.tryAnother} icon="rotate-ccw" onPress={() => { setBiz(null); setPreset(null); }} />
        : <Button th={th} label={c.s1Next} onPress={() => go(2)} />
      : <Button th={th} label={c.s1Cta} onPress={runClassify} busy={bizBusy} disabled={!bizText.trim()} />;
  }

  if (step === 2) {
    const masked = `${pan.slice(0, 3)}•••${pan.slice(-2)}`;
    screen = (
      <>
        <Txt th={th} v="h1">{c.s2Title}</Txt>
        <Txt th={th} color={th.muted}>{c.s2Body}</Txt>
        <Panel th={th}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: th.brandTint, alignItems: "center", justifyContent: "center" }}><Icon name="credit-card" size={18} color={th.brand} /></View>
            <View style={{ flex: 1 }}>
              <Txt th={th} v="tiny" color={th.muted}>{c.panLabel}</Txt>
              {panEdit ? (
                <TextInput autoFocus value={pan} maxLength={10} autoCapitalize="characters" autoCorrect={false} onBlur={() => setPanEdit(false)}
                  onChangeText={(v) => { setPan(v.toUpperCase()); setRoute(null); }}
                  style={{ fontFamily: font.monoBold, fontSize: 17, letterSpacing: 2, color: th.ink, paddingVertical: 2, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null) }} />
              ) : <Text style={{ fontFamily: font.monoBold, fontSize: 17, letterSpacing: 2, color: th.ink }}>{masked}</Text>}
            </View>
            {!panEdit ? <Button th={th} kind="quiet" compact label={c.change} onPress={() => setPanEdit(true)} /> : null}
          </View>
          <Pressable onPress={() => { setConsent(!consent); setRoute(null); }} accessibilityRole="checkbox" accessibilityState={{ checked: consent }} style={{ flexDirection: "row", gap: 12, alignItems: "center", paddingTop: 4 }}>
            <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: consent ? th.brand : th.faint, backgroundColor: consent ? th.brand : "transparent", alignItems: "center", justifyContent: "center" }}>
              {consent ? <Icon name="check" size={14} color="#fff" /> : null}
            </View>
            <Txt th={th} style={{ flex: 1 }}>{c.consent}</Txt>
          </Pressable>
        </Panel>
        {routeBusy ? <Thinking th={th} label={c.s2Busy} /> : null}
        {route === "instant" ? <Reveal><Notice th={th} tone="ok" title={c.instantTitle}><Txt th={th}>{c.instantBody}</Txt></Notice></Reveal> : null}
        {route === "video" ? (
          <Reveal>
            <Notice th={th} tone="info" icon="video" title={c.videoTitle}><Txt th={th}>{c.videoBody}</Txt></Notice>
            <Panel th={th} tint>
              <Txt th={th} v="h3">{c.keepReady}</Txt>
              {c.videoList.map(([ic, t], i) => <IconRow key={i} th={th} icon={ic}><Txt th={th}>{t}</Txt></IconRow>)}
            </Panel>
            <Panel th={th}>
              <Txt th={th} v="h3">{c.pickTime}</Txt>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {c.days.map((d, i) => <Chip key={d} th={th} label={d} on={day === i} onPress={() => { setDay(i); setSlot(null); }} />)}
              </View>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                {c.times.map((tm) => <Chip key={tm} th={th} icon="clock" label={tm} on={slot === tm} onPress={() => { setSlot(tm); haptic("light"); }} />)}
              </View>
              <Txt th={th} v="small" color={th.faint}>{c.slotNote}</Txt>
            </Panel>
          </Reveal>
        ) : null}
        <Pressable onPress={() => { setSimFound(!simFound); setRoute(null); setSlot(null); }} accessibilityRole="switch" accessibilityState={{ checked: simFound }} style={{ flexDirection: "row", gap: 8, alignItems: "center", alignSelf: "flex-start", paddingVertical: 4, opacity: 0.8 }}>
          <Icon name={simFound ? "toggle-right" : "toggle-left"} size={20} color={simFound ? th.brand : th.faint} />
          <Txt th={th} v="small" color={th.muted}>{c.simFound}</Txt>
        </Pressable>
      </>
    );
    footer = !route
      ? <Button th={th} label={c.s2Cta} onPress={runRoute} busy={routeBusy} disabled={!consent || pan.trim().length !== 10} />
      : <Button th={th} label={c.s2Next} onPress={() => go(3)} disabled={route === "video" && !slot} />;
  }

  if (step === 3) {
    const byDoc = Object.fromEntries((names?.ai.documents || []).map((d) => [d.doc, d.name]));
    const legal = byDoc.PAN || "";
    const verdicts = Object.fromEntries((names?.ai.comparisons || []).map((x) => [x.doc, x]));
    const bankFail = verdicts.Bank?.verdict === "likely_fail";
    screen = (
      <>
        <Txt th={th} v="h1">{c.s3Title}</Txt>
        <Txt th={th} color={th.muted}>{c.s3Body}</Txt>
        <View style={{ gap: 10 }}>
          {(["pan", "aadhaar", "bank"] as DocKey[]).map((k) => (
            <DocRow key={k} th={th} c={c} label={c.docs[k]} scanning={namesBusy}
              src={photos[k] ? { uri: photos[k]!.uri } : SPECIMEN_IMG[k === "bank" ? (`bank_${bankVariant}` as const) : k]}
              isPhoto={!!photos[k]}
              onCamera={Platform.OS !== "web" ? () => pick(k, "camera") : undefined}
              onGallery={() => pick(k, "gallery")}
              onSample={photos[k] ? () => { setPhotos((p) => { const n = { ...p }; delete n[k]; return n; }); setNames(null); } : undefined} />
          ))}
        </View>
        <Txt th={th} v="small" color={th.faint}>{c.samplesNote}</Txt>
        {namesBusy ? <Thinking th={th} label={c.s3Busy} /> : null}
        {namesErr ? <Notice th={th} tone="warn" title={namesErr} /> : null}
        {names ? (
          <Reveal>
            <Panel th={th}>
              <NameLine th={th} label={c.legal} tokens={compareNames(legal, legal).map((tk) => ({ ...tk, state: "match" as const }))} anchor />
              <View style={{ height: 1, backgroundColor: th.line }} />
              {(["Aadhaar", "Bank"] as const).map((d) => verdicts[d] ? (
                <View key={d} style={{ gap: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Txt th={th} v="smallMed" color={th.muted} style={{ flex: 1 }}>{d === "Bank" ? c.bankName : c.aadhaarName}</Txt>
                    <Status th={th} tone={verdicts[d].verdict === "match" ? "ok" : verdicts[d].verdict === "likely_fail" ? "bad" : "warn"} label={c[verdicts[d].verdict]} />
                  </View>
                  <NameLine th={th} c={c} tokens={compareNames(legal, byDoc[d] || "")} />
                  <Txt th={th} v="small" color={th.muted}>{verdicts[d].reason}</Txt>
                </View>
              ) : null)}
            </Panel>
            {bankFail ? (
              <Panel th={th} tint>
                <Txt th={th} v="h3">{c.fixTitle}</Txt>
                {verdicts.Bank?.fix ? <Txt th={th} color={th.muted}>{verdicts.Bank.fix}</Txt> : null}
                {bankVariant === "short" && !photos.bank ? <Button th={th} label={c.fixSwap} icon="repeat" onPress={() => { setBankVariant("full"); runNames("full"); }} /> : null}
                <Button th={th} kind="secondary" label={c.fixBranch} icon="map-pin" onPress={() => setBranchOpen(true)} />
              </Panel>
            ) : null}
          </Reveal>
        ) : null}
      </>
    );
    footer = !names
      ? <Button th={th} label={c.s3Cta} icon="maximize" onPress={() => runNames()} busy={namesBusy} />
      : <Button th={th} label={c.s3Next} kind={bankFail ? "secondary" : "primary"} onPress={() => go(4)} />;
  }

  if (step === 4) {
    const code = "PF-" + (pan.slice(-4) || "0000");
    screen = (
      <>
        <Txt th={th} v="h1">{ready ? c.s4Title : c.s4TitleNot}</Txt>
        <GoLivePass th={th} canvasColor={th.canvas} title={c.passLabel} sub={c.passSub} holder="Priya Lakshmi Reddy" shopLabel={c.shop} shop={brand} editLabel={c.edit}
          onEditShop={() => { setBrandDraft(brand); setBrandOpen(true); }} rows={passRows} code={code}
          footer={(
            <>
              <FeeRows th={th} rows={[[c.feeRow, inr(FEE)], [c.gstRow, inr(GST)], [c.totalRow, inr(FEE_TOTAL), true]]} />
              <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                <Icon name="shield" size={14} color={th.pos} />
                <Txt th={th} v="small" color={th.muted} style={{ flex: 1 }}>{c.promise}</Txt>
              </View>
            </>
          )} />
      </>
    );
    footer = (
      <>
        <Button th={th} label={ready ? c.payCta(inr(FEE_TOTAL)) : c.payBlocked} icon={ready ? "lock" : undefined} disabled={!ready}
          onPress={() => { haptic("success"); addLog({ kind: "mock", title: "Payment and submission (simulated)", json: { amount_inr: FEE_TOTAL, charged_after_checks: true } }); go(5); }} />
        <Txt th={th} v="tiny" color={th.faint} style={{ textAlign: "center" }}>{c.simulated}</Txt>
      </>
    );
  }

  if (step === 5) {
    screen = (
      <>
        <Reveal>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: th.posTint, alignItems: "center", justifyContent: "center" }}><Icon name="check" size={32} color={th.pos} /></View>
          <Txt th={th} v="h1">{c.s5Title}</Txt>
          <Txt th={th} color={th.muted}>{c.s5Body}</Txt>
          <View style={{ gap: 0 }}>
            {c.tl(route === "video" ? slotLabel : null).map(([ic, t, s], i, arr) => (
              <View key={i} style={{ flexDirection: "row", gap: 14 }}>
                <View style={{ alignItems: "center" }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: i === 0 ? th.posTint : th.brandTint, alignItems: "center", justifyContent: "center" }}><Icon name={ic} size={16} color={i === 0 ? th.pos : th.brand} /></View>
                  {i < arr.length - 1 ? <View style={{ width: 2, flex: 1, minHeight: 18, backgroundColor: th.line }} /> : null}
                </View>
                <View style={{ flex: 1, paddingTop: 6, paddingBottom: 18, gap: 2 }}>
                  <Txt th={th} v="bodyMed">{t}</Txt>
                  <Txt th={th} v="small" color={th.muted}>{s}</Txt>
                </View>
              </View>
            ))}
          </View>
        </Reveal>
      </>
    );
    footer = <Button th={th} kind="secondary" label={c.restart} icon="rotate-ccw" onPress={restart} />;
  }

  /* ---------------- Chrome ---------------- */
  const header = (
    <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10, backgroundColor: th.surface, gap: 10, borderBottomWidth: step > 0 && step < 5 ? 1 : 0, borderBottomColor: th.line }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Pressable onPress={() => go(step - 1)} disabled={step === 0 || step === 5} accessibilityRole="button" accessibilityLabel="Back"
          style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", opacity: step === 0 || step === 5 ? 0 : 1 }}>
          <Icon name="arrow-left" size={21} color={th.ink} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          {step >= 1 && step <= 3 ? <Txt th={th} v="smallMed" color={th.muted}>{c.stepOf(step)}</Txt> : null}
        </View>
        <View style={{ flexDirection: "row", backgroundColor: th.sunken, borderRadius: r.pill, padding: 3, borderWidth: 1, borderColor: th.line }}>
          {(["en", "hi"] as Lang[]).map((l) => (
            <Pressable key={l} onPress={() => switchLang(l)} accessibilityRole="button" accessibilityState={{ selected: lang === l }}
              style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: r.pill, backgroundColor: lang === l ? th.surface : "transparent" }}>
              <Text style={{ fontFamily: lang === l ? font.bodySemi : font.bodyMed, fontSize: 12.5, color: lang === l ? th.ink : th.muted }}>{l === "en" ? "EN" : "Hinglish"}</Text>
            </Pressable>
          ))}
        </View>
        {!wide ? (
          <Pressable onPress={() => setHowOpen(true)} accessibilityRole="button" accessibilityLabel={c.howItWorks} style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }}>
            <Icon name="help-circle" size={20} color={th.muted} />
          </Pressable>
        ) : <View style={{ width: 8 }} />}
      </View>
      {step >= 1 && step <= 3 ? (
        <View style={{ flexDirection: "row", gap: 6, paddingHorizontal: 8 }}>
          {[1, 2, 3].map((i) => <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: step >= i ? th.brand : th.line }} />)}
        </View>
      ) : null}
    </View>
  );

  const app = (
    <View style={{ flex: 1, backgroundColor: step === 4 ? th.canvas : th.surface }}>
      {header}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 18, gap: 14, paddingBottom: 28 }} keyboardShouldPersistTaps="handled">
          {screen}
        </ScrollView>
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14, gap: 8, backgroundColor: step === 4 ? th.canvas : th.surface, borderTopWidth: 1, borderTopColor: th.line }}>{footer}</View>
      </KeyboardAvoidingView>
    </View>
  );

  const sheets = (
    <>
      <Sheet th={th} wide={wide} visible={feeOpen} onClose={() => setFeeOpen(false)} title={c.feeTitle}>
        <Txt th={th} color={th.muted}>{c.feeBody}</Txt>
        <FeeRows th={th} rows={[[c.feeRow, inr(FEE)], [c.gstRow, inr(GST)], [c.totalRow, inr(FEE_TOTAL), true]]} />
        <Txt th={th} v="small" color={th.muted}>{c.offer}</Txt>
        <Button th={th} label={c.gotIt} onPress={() => setFeeOpen(false)} />
      </Sheet>
      <Sheet th={th} wide={wide} visible={branchOpen} onClose={() => setBranchOpen(false)} title={c.branchTitle}>
        <Txt th={th} color={th.muted}>{c.branchBody}</Txt>
        <Button th={th} label={c.gotIt} onPress={() => setBranchOpen(false)} />
      </Sheet>
      <Sheet th={th} wide={wide} visible={brandOpen} onClose={() => setBrandOpen(false)} title={c.brandTitle}>
        <TextInput value={brandDraft} onChangeText={setBrandDraft} maxLength={40} accessibilityLabel={c.brandTitle}
          style={{ borderWidth: 1.5, borderColor: th.line, borderRadius: r.md, padding: 14, fontFamily: font.bodyMed, fontSize: 16, color: th.ink, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null) }} />
        <Txt th={th} v="small" color={th.muted}>{c.brandBody}</Txt>
        <Button th={th} label={c.save} disabled={!brandDraft.trim()} onPress={() => { setBrand(brandDraft.trim()); setBrandOpen(false); }} />
      </Sheet>
      <Sheet th={th} wide={wide} visible={howOpen} onClose={() => setHowOpen(false)} title={c.howItWorks}>
        <HowItWorks th={th} step={step} log={log} srv={srv} mode={mode} setMode={setMode} />
      </Sheet>
    </>
  );

  if (wide) {
    return (
      <View style={{ flex: 1, backgroundColor: th.canvas }}>
        <StatusBar style={th.dark ? "light" : "dark"} />
        <ScrollView contentContainerStyle={{ minHeight: "100%", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <View style={{ flexDirection: "row", gap: 56, alignItems: "center", maxWidth: 1040, width: "100%", justifyContent: "center" }}>
            <View style={{ width: 340, gap: 18 }}>
              <Txt th={th} v="h1" style={{ fontSize: 34, lineHeight: 40 }}>KYC Pre-flight</Txt>
              <Txt th={th} color={th.muted}>New sellers pay ₹199 for KYC and often learn only afterwards that their category, KYC route or bank name won't pass. Pre-flight runs those checks first, in about 90 seconds, inside the merchant app.</Txt>
              <View style={{ gap: 10 }}>
                <Legend th={th} kind="ai" text="AI reads the business description and document photos" />
                <Legend th={th} kind="rule" text="Rules decide eligibility, fees and the pay gate" />
                <Legend th={th} kind="mock" text="Registry, penny drop and payment are mocked" />
              </View>
              <Button th={th} kind="secondary" compact icon="cpu" label="See how it works" onPress={() => setHowOpen(true)} />
              <Txt th={th} v="tiny" color={th.faint}>Concept prototype for the Razorpay × ISB Build Challenge. Not a Razorpay product. The seller and documents are fictional.</Txt>
            </View>
            <View style={{ width: 390, height: phoneH, borderRadius: 40, borderWidth: 10, borderColor: th.dark ? "#2A3344" : "#101828", overflow: "hidden", backgroundColor: th.surface, shadowColor: "#0B1E3F", shadowOpacity: 0.18, shadowRadius: 40, shadowOffset: { width: 0, height: 20 } }}>
              {app}
            </View>
          </View>
        </ScrollView>
        {sheets}
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: th.surface }} edges={["top", "bottom"]}>
      <StatusBar style={th.dark ? "light" : "dark"} />
      {app}
      {sheets}
    </SafeAreaView>
  );
}

/* ---------------- Pieces ---------------- */

function PassPreview({ th, labels }: { th: Theme; labels: string[] }) {
  return (
    <View style={{ borderRadius: r.xl, overflow: "hidden", borderWidth: 1, borderColor: th.line, marginTop: 6 }}>
      <View style={{ backgroundColor: th.navy, paddingHorizontal: 18, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text style={{ fontFamily: font.monoBold, fontSize: 12.5, color: th.navyInk, letterSpacing: 1.2 }}>SIGN-UP</Text>
        <View style={{ flex: 1, borderTopWidth: 1, borderStyle: "dashed", borderColor: th.navyMuted, opacity: 0.6 }} />
        <Icon name="send" size={15} color={th.navyInk} />
        <View style={{ flex: 1, borderTopWidth: 1, borderStyle: "dashed", borderColor: th.navyMuted, opacity: 0.6 }} />
        <Text style={{ fontFamily: font.monoBold, fontSize: 12.5, color: th.navyInk, letterSpacing: 1.2 }}>LIVE</Text>
      </View>
      <View style={{ flexDirection: "row", backgroundColor: th.surface }}>
        {labels.map((l, i) => (
          <View key={l} style={{ flex: 1, alignItems: "center", gap: 8, paddingVertical: 16, borderLeftWidth: i ? 1 : 0, borderLeftColor: th.line }}>
            <View style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderStyle: "dashed", borderColor: th.faint, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: font.monoBold, fontSize: 14, color: th.faint }}>{i + 1}</Text>
            </View>
            <Txt th={th} v="smallMed" color={th.muted}>{l}</Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

function DocRow({ th, c, label, src, isPhoto, scanning, onCamera, onGallery, onSample }: {
  th: Theme; c: Copy; label: string; src: any; isPhoto: boolean; scanning: boolean; onCamera?: () => void; onGallery: () => void; onSample?: () => void;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!scanning) { v.stopAnimation(); v.setValue(0); return; }
    const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== "web" }));
    a.start(); return () => a.stop();
  }, [scanning, v]);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 10, borderRadius: r.lg, borderWidth: 1, borderColor: th.line, backgroundColor: th.surface }}>
      <View style={{ width: 88, height: 55, borderRadius: 8, overflow: "hidden", backgroundColor: th.line }}>
        <Image source={src} style={{ width: 88, height: 55 }} resizeMode="cover" accessibilityLabel={label} />
        {scanning ? (
          <Animated.View style={{ position: "absolute", left: 0, right: 0, height: 3, backgroundColor: th.brand, shadowColor: th.brand, shadowOpacity: 0.9, shadowRadius: 6, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, 52] }) }] }} />
        ) : null}
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Txt th={th} v="bodyMed" numberOfLines={1}>{label}</Txt>
        <Txt th={th} v="small" color={isPhoto ? th.pos : th.faint}>{isPhoto ? c.photo : c.sample}</Txt>
      </View>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {onSample ? <RoundBtn th={th} icon="rotate-ccw" label={c.useSample} onPress={onSample} /> : null}
        {onCamera ? <RoundBtn th={th} icon="camera" label="Camera" onPress={onCamera} /> : null}
        <RoundBtn th={th} icon="image" label="Gallery" onPress={onGallery} />
      </View>
    </View>
  );
}

function RoundBtn({ th, icon, label, onPress }: { th: Theme; icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={({ hovered, pressed }: any) => ({ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: hovered || pressed ? th.brandTint : th.sunken })}>
      <Icon name={icon} size={17} color={th.brand} />
    </Pressable>
  );
}

function NameLine({ th, c, label, tokens, anchor }: { th: Theme; c?: Copy; label?: string; tokens: Token[]; anchor?: boolean }) {
  return (
    <View style={{ gap: 8 }}>
      {label ? <Txt th={th} v="smallMed" color={th.muted}>{label}</Txt> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {tokens.map((tk, i) => {
          const missing = tk.state === "missing", extra = tk.state === "extra", variant = tk.state === "variant";
          const fg = anchor ? th.ink : missing || extra ? th.neg : variant ? th.warn : th.pos;
          const bg = anchor ? th.sunken : missing || extra ? th.negTint : variant ? th.warnTint : th.posTint;
          return (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8, backgroundColor: missing ? "transparent" : bg, borderWidth: missing ? 1.5 : 0, borderStyle: "dashed", borderColor: th.neg }}>
              <Text style={{ fontFamily: font.monoBold, fontSize: 14, color: fg, letterSpacing: 0.5, textDecorationLine: missing ? "line-through" : "none" }}>{tk.text}</Text>
              {c && (missing || extra || variant) ? <Text style={{ fontFamily: font.bodySemi, fontSize: 11, color: fg }}>{missing ? c.missing : extra ? c.extra : c.variant}</Text> : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Legend({ th, kind, text }: { th: Theme; kind: LogKind; text: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
      <Tag th={th} kind={kind} />
      <Txt th={th} v="small" color={th.muted} style={{ flex: 1 }}>{text}</Txt>
    </View>
  );
}

function Tag({ th, kind }: { th: Theme; kind: LogKind }) {
  const m = { ai: ["AI", th.brandTint, th.brand], rec: ["AI, recorded", th.brandTint, th.brand], rule: ["Rules", th.posTint, th.pos], mock: ["Mocked", th.warnTint, th.warn] }[kind];
  return <View style={{ backgroundColor: m[1], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" }}><Text style={{ fontFamily: font.bodySemi, fontSize: 11.5, color: m[2] }}>{m[0]}</Text></View>;
}

const PARTS: Record<number, [LogKind, string, string][]> = {
  0: [["rule", "Fee shown first", "The full cost is visible before any input, and is charged only after the checks pass."]],
  1: [["ai", "Description to category", "Claude maps a free-text, often Hinglish description to one row of the policy table and pulls out stated facts like reselling, GST and website."],
      ["rule", "Eligibility and documents", "The policy table decides supported, review or not supported. AI never decides eligibility, and low confidence becomes a review."]],
  2: [["mock", "KYC registry lookup", "Mocked here. In production this is the consented lookup onboarding already runs, moved before payment."],
      ["rule", "Route and preparation", "Instant route, or a video call with what to keep ready and a slot booked now, instead of a surprise after paying."]],
  3: [["ai", "Read the documents", "Claude vision reads the holder name on each photo: camera, gallery, or the built-in specimens."],
      ["ai", "Reconcile names", "Judges order swaps, missing words, initials and spelling variants the way a bank name check does, and predicts the ₹1 result."],
      ["rule", "Word-by-word view", "A deterministic comparison draws which words match, so the merchant sees exactly what's missing."]],
  4: [["rule", "Pay gate", "Any red stamp disables payment. Tapping a red stamp takes the merchant to the fix."]],
  5: [["mock", "Submission", "Simulated. No payment or application is created."]],
};

function HowItWorks({ th, step, log, srv, mode, setMode }: { th: Theme; step: number; log: LogItem[]; srv: Health | null | undefined; mode: "live" | "rec"; setMode: (m: "live" | "rec") => void }) {
  const status = srv === undefined ? "Checking the AI server…" : srv?.liveAI ? `Live AI is on (${srv.model}). The app calls a small server that holds the API key.` : "Live AI isn't configured here, so the app uses answers recorded from the same prompts.";
  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Txt th={th} v="small" color={th.muted} style={{ flex: 1, minWidth: 200 }}>{status}</Txt>
        <View style={{ flexDirection: "row", borderRadius: r.pill, borderWidth: 1, borderColor: th.line, padding: 3 }}>
          {(["live", "rec"] as const).map((m) => (
            <Pressable key={m} disabled={m === "live" && !srv?.liveAI} onPress={() => setMode(m)} accessibilityRole="button" accessibilityState={{ selected: mode === m }}
              style={{ paddingVertical: 5, paddingHorizontal: 12, borderRadius: r.pill, backgroundColor: mode === m ? th.brand : "transparent", opacity: m === "live" && !srv?.liveAI ? 0.4 : 1 }}>
              <Text style={{ fontFamily: font.bodySemi, fontSize: 12.5, color: mode === m ? "#fff" : th.ink }}>{m === "live" ? "Live AI" : "Recorded"}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Txt th={th} v="h3">On this screen</Txt>
      {(PARTS[step] || []).map(([k, b, p], i) => (
        <View key={i} style={{ flexDirection: "row", gap: 10 }}>
          <Tag th={th} kind={k} />
          <View style={{ flex: 1, gap: 2 }}><Txt th={th} v="smallMed">{b}</Txt><Txt th={th} v="small" color={th.muted}>{p}</Txt></View>
        </View>
      ))}
      <Txt th={th} v="h3">Call log</Txt>
      {log.length === 0 ? <Txt th={th} v="small" color={th.muted}>Every AI answer, rule decision and mocked lookup appears here as you go.</Txt> : null}
      {log.map((e, i) => <LogRow key={e.id} th={th} e={e} open={i === 0} />)}
      <Txt th={th} v="h3">How we'd measure it</Txt>
      <Txt th={th} v="small" color={th.muted}>North star: first-time-right activation, the share of paid KYC applications activated on the first submission. Guardrails: fraud and chargeback rate of activated merchants stays flat against a holdout; onboarding tickets and paid-then-rejected applications fall.</Txt>
      <Txt th={th} v="h3">Deliberately not built</Txt>
      <Txt th={th} v="small" color={th.muted}>AI approvals or risk decisions, workarounds for restricted categories, settlement holds after activation, clarification handling after submission, a website builder, and real registry, penny-drop or payment integrations.</Txt>
    </>
  );
}

function LogRow({ th, e, open }: { th: Theme; e: LogItem; open: boolean }) {
  const [show, setShow] = useState(open);
  return (
    <View style={{ borderWidth: 1, borderColor: th.line, borderRadius: r.md, overflow: "hidden" }}>
      <Pressable onPress={() => setShow(!show)} accessibilityRole="button" accessibilityState={{ expanded: show }} style={{ padding: 12, gap: 4, backgroundColor: th.sunken }}>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <Tag th={th} kind={e.kind} />
          <Txt th={th} v="smallMed" style={{ flex: 1 }} numberOfLines={1}>{e.title}</Txt>
          <Icon name={show ? "chevron-up" : "chevron-down"} size={16} color={th.muted} />
        </View>
        <Txt th={th} v="tiny" color={th.muted}>{e.at}{e.kind === "ai" && e.ms ? ` · ${(e.ms / 1000).toFixed(1)} s` : ""}{e.note ? ` · ${e.note}` : ""}</Txt>
      </Pressable>
      {show ? (
        <ScrollView horizontal style={{ backgroundColor: th.code, maxHeight: 260 }}>
          <Text selectable style={{ fontFamily: font.mono, fontSize: 11.5, lineHeight: 16, color: th.ink, padding: 12 }}>{JSON.stringify(e.json, null, 2)}</Text>
        </ScrollView>
      ) : null}
    </View>
  );
}
