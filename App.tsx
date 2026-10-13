import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Switch, Text, TextInput, useWindowDimensions, View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { useTheme, Theme, radius } from "./src/theme";
import {
  COPY, FEE, FEE_TOTAL, GST, Lang, NAMES, NamesAI, PRESETS, REC_NAMES, ClassifyAI, Policy, Status,
  inr, policyById, recordedClassify,
} from "./src/data";
import { classify, DocInput, health, Health, readNames } from "./src/api";
import { Button, Card, Chip, H, KV, Line, Pill, StatusBox, T, Thinking, Tone } from "./src/ui";

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
type BizResult = { ai: ClassifyAI; policy: Policy; status: Status; lowConf: boolean; docs: string[]; website: boolean; source: "live" | "rec" };

export default function App() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

function Root() {
  const th = useTheme();
  const { width } = useWindowDimensions();
  const wide = Platform.OS === "web" && width >= 960;
  const [lang, setLang] = useState<Lang>("en");
  const c = COPY[lang];
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<"live" | "rec">("live");
  const [srv, setSrv] = useState<Health | null | undefined>(undefined);
  const [log, setLog] = useState<LogItem[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Step 1
  const [preset, setPreset] = useState<string | null>("priya");
  const [bizText, setBizText] = useState(PRESETS.priya.en);
  const [bizBusy, setBizBusy] = useState(false);
  const [bizErr, setBizErr] = useState<string | null>(null);
  const [biz, setBiz] = useState<BizResult | null>(null);
  // Step 2
  const [pan, setPan] = useState("ABCPR0000X");
  const [consent, setConsent] = useState(true);
  const [simFound, setSimFound] = useState(false);
  const [route, setRoute] = useState<"instant" | "video" | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  // Step 3
  const [bankVariant, setBankVariant] = useState<"short" | "full">("short");
  const [photos, setPhotos] = useState<Partial<Record<DocKey, Photo>>>({});
  const [namesBusy, setNamesBusy] = useState(false);
  const [namesErr, setNamesErr] = useState<string | null>(null);
  const [names, setNames] = useState<{ ai: NamesAI; source: "live" | "rec"; recKey?: "short" | "full" } | null>(null);
  const [brand, setBrand] = useState("Gulmohar Jewels");

  const live = mode === "live" && !!srv?.liveAI;

  useEffect(() => { health().then((h) => { setSrv(h); if (!h?.liveAI) setMode("rec"); }); }, []);

  const addLog = useCallback((e: Omit<LogItem, "id" | "at">) => {
    const at = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLog((l) => [{ ...e, id: Date.now() + Math.random(), at }, ...l].slice(0, 14));
  }, []);

  const go = (n: number) => { setStep(n); requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false })); };

  // Language switch keeps preset text and recorded results in sync.
  const switchLang = (l: Lang) => {
    if (l === lang) return;
    setLang(l);
    if (preset) setBizText(PRESETS[preset][l]);
    if (biz && biz.source === "rec" && preset) setBiz(buildBiz(recordedClassify(preset, l), l, "rec"));
    if (names && names.source === "rec" && names.recKey) setNames({ ai: REC_NAMES[names.recKey][l], source: "rec", recKey: names.recKey });
  };

  /* ----- Rules: eligibility and documents from the policy table ----- */
  function buildBiz(ai: ClassifyAI, l: Lang, source: "live" | "rec"): BizResult {
    const policy = policyById(ai.policy_id);
    let status = policy.status, lowConf = false;
    if (status === "supported" && !(Number(ai.confidence) >= 0.6)) { status = "needs_review"; lowConf = true; }
    const docs = [...COPY[l].docBase];
    if (ai.is_reseller === true && policy.resellerDoc) docs.push(COPY[l].docInvoice);
    if (policy.extra) docs.push(policy.extra);
    return { ai, policy, status, lowConf, docs, website: ai.has_website === true, source };
  }

  async function runClassify() {
    const text = bizText.trim(); if (!text) return;
    setBizBusy(true); setBizErr(null); setBiz(null);
    const presetKey = Object.keys(PRESETS).find((k) => PRESETS[k].en === text || PRESETS[k].hi === text) || null;
    let ai: ClassifyAI | null = null, source: "live" | "rec" = "rec", ms = 0, note = "", model = "";
    if (live) {
      try { const r = await classify(text, lang); ai = r.ai; ms = r.ms; model = r.model; source = "live"; }
      catch (e: any) { note = `Live call failed (${e?.message || "error"}), used the recorded response.`; }
    }
    if (!ai && presetKey) ai = recordedClassify(presetKey, lang);
    setBizBusy(false);
    if (!ai) { setBizErr(c.errNoAI); return; }
    const res = buildBiz(ai, lang, source);
    setBiz(res);
    addLog({ kind: source === "live" ? "ai" : "rec", title: "Classify business description", ms, note: model ? `${model}${note ? " · " + note : ""}` : note, json: ai });
    addLog({ kind: "rule", title: "Eligibility from policy table", json: { policy_id: res.policy.id, table_status: res.policy.status, confidence: ai.confidence, final_status: res.status, documents: res.docs } });
  }

  function runRoute() {
    const r = simFound ? "instant" : "video";
    setRoute(r); setSlot(null);
    addLog({ kind: "mock", title: "KYC registry lookup (mocked)", json: { pan: pan.slice(0, 3) + "XX" + pan.slice(-3), consent, record_found: simFound, route: r } });
  }

  async function pick(k: DocKey, from: "camera" | "gallery") {
    try {
      if (from === "camera") {
        const p = await ImagePicker.requestCameraPermissionsAsync();
        if (!p.granted) return;
      }
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1, allowsEditing: false };
      const r = from === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (r.canceled || !r.assets?.[0]?.uri) return;
      const a = r.assets[0];
      // Shrink to ~1200px wide JPEG so three photos stay well under the server's request limit.
      const ctx = ImageManipulator.manipulate(a.uri);
      if ((a.width || 0) > 1200) ctx.resize({ width: 1200 });
      const img = await ctx.renderAsync();
      const out = await img.saveAsync({ base64: true, compress: 0.6, format: SaveFormat.JPEG });
      if (!out.base64) throw new Error("no image data");
      setPhotos((ph) => ({ ...ph, [k]: { uri: out.uri, base64: out.base64 as string, mediaType: "image/jpeg" } }));
      setNames(null); setNamesErr(null);
    } catch {
      setNamesErr(c.errPhotos);
    }
  }

  async function runNames(variant = bankVariant) {
    setNamesBusy(true); setNamesErr(null); setNames(null);
    const anyPhoto = Object.keys(photos).length > 0;
    const doc = (k: DocKey): DocInput => photos[k] ? { base64: photos[k]!.base64, mediaType: photos[k]!.mediaType } : { sample: k === "bank" ? `bank_${variant}` : k };
    let ai: NamesAI | null = null, source: "live" | "rec" = "rec", ms = 0, note = "", model = "";
    if (live) {
      try { const r = await readNames({ pan: doc("pan"), aadhaar: doc("aadhaar"), bank: doc("bank") }, lang); ai = r.ai; ms = r.ms; model = r.model; source = "live"; }
      catch (e: any) { note = `Live call failed (${e?.message || "error"}), used the recorded response.`; }
    }
    if (!ai && !anyPhoto) ai = REC_NAMES[variant][lang];
    setNamesBusy(false);
    if (!ai) { setNamesErr(c.errPhotos); return; }
    setNames({ ai, source, recKey: source === "rec" ? variant : undefined });
    addLog({ kind: source === "live" ? "ai" : "rec", title: "Read names from documents and compare", ms, note: model ? `${model} · vision${note ? " · " + note : ""}` : note, json: ai });
  }

  /* ----- Rules: readiness gate ----- */
  const readiness = useMemo(() => {
    const items: { k: string; v: string; s: Tone; sub?: string }[] = [];
    items.push({ k: c.rCat, v: biz ? biz.policy.label : "—", s: !biz ? "bad" : biz.status === "supported" ? "ok" : biz.status === "needs_review" ? "warn" : "bad", sub: biz ? c[biz.status] : undefined });
    items.push({ k: c.rRoute, v: biz?.website ? "Website checkout" : "Payment Links & QR", s: "ok" });
    items.push({ k: c.rKyc, v: !route ? "—" : route === "instant" ? c.instantTitle : `${c.videoTitle}${slot !== null ? " · " + c.slots[slot] : ""}`, s: !route ? "bad" : route === "instant" || slot !== null ? "ok" : "warn", sub: route === "video" && slot === null ? c.noSlot : undefined });
    let ns: Tone = "bad", nv = "—";
    if (names) { const v = names.ai.comparisons.map((x) => x.verdict); ns = v.includes("likely_fail") ? "bad" : v.includes("unclear") ? "warn" : "ok"; nv = names.ai.summary || ""; }
    items.push({ k: c.rNames, v: nv, s: ns });
    items.push({ k: c.rBrand, v: brand.trim() || "—", s: brand.trim() ? "ok" : "warn" });
    return { items, ready: !items.some((i) => i.s === "bad") };
  }, [biz, route, slot, names, brand, c]);

  function restart() {
    setBiz(null); setBizErr(null); setRoute(null); setSlot(null); setNames(null); setNamesErr(null); setPhotos({}); setBankVariant("short");
    setPreset("priya"); setBizText(PRESETS.priya[lang]); go(0);
  }

  /* ----- Screens ----- */
  const screen = (() => {
    if (step === 0) return (
      <>
        <Text style={{ color: th.brand, fontWeight: "700", fontSize: 11.5, letterSpacing: 0.8 }}>{c.s0Eyebrow}</Text>
        <H th={th}>{c.s0Title}</H>
        <T th={th} muted>{c.s0Lead}</T>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: th.brandSubtle, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: th.brandStrong, fontWeight: "800" }}>PR</Text>
          </View>
          <View style={{ flex: 1 }}>
            <T th={th} bold>Priya Lakshmi Reddy · Gulmohar Jewels</T>
            <T th={th} small muted>{c.persona}</T>
          </View>
        </View>
        <Card th={th}>
          {c.s0Checks.map((x, i) => <Line key={i} th={th} tone="info" label={String(i + 1)}><T th={th}>{x}</T></Line>)}
        </Card>
        <Card th={th} soft>
          <T th={th} bold>{c.costTitle}</T>
          <KV th={th} rows={[[c.feeRow, inr(FEE)], [c.gstRow, inr(GST)], [c.totalRow, inr(FEE_TOTAL), true]]} />
          <T th={th} small muted>{c.offer}</T>
        </Card>
      </>
    );

    if (step === 1) return (
      <>
        <H th={th}>{c.s1Title}</H>
        <T th={th} muted>{c.s1Lead}</T>
        <T th={th} small muted bold>{c.yourBiz}</T>
        <TextInput
          value={bizText}
          onChangeText={(v) => { setBizText(v); setPreset(null); setBiz(null); setBizErr(null); }}
          multiline
          accessibilityLabel={c.yourBiz}
          style={{ minHeight: 100, borderWidth: 1, borderColor: th.border, borderRadius: radius.md, padding: 12, color: th.fg, backgroundColor: th.surface, fontSize: 15, lineHeight: 21, textAlignVertical: "top" }}
          placeholderTextColor={th.faint}
        />
        <T th={th} small muted>{c.tryOther}</T>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {Object.entries(PRESETS).map(([k, p]) => (
            <Chip key={k} th={th} label={p.label} on={preset === k} onPress={() => { setPreset(k); setBizText(p[lang]); setBiz(null); setBizErr(null); }} />
          ))}
        </View>
        {bizBusy ? <Thinking th={th} label={c.thinking} /> : null}
        {bizErr ? <StatusBox th={th} tone="warn" title={bizErr} /> : null}
        {biz ? (
          <>
            <Card th={th}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <View style={{ flex: 1, minWidth: 160 }}>
                  <T th={th} bold>{biz.ai.category_label || biz.policy.label}</T>
                  {biz.ai.sub_category ? <T th={th} small muted>{biz.ai.sub_category}</T> : null}
                </View>
                <Pill th={th} tone={biz.status === "supported" ? "ok" : biz.status === "needs_review" ? "warn" : "bad"} label={c[biz.status]} />
              </View>
              <T th={th}>{biz.ai.explanation}</T>
              {biz.lowConf ? <T th={th} small muted>{c.lowConf}</T> : null}
              {(biz.ai.flags || []).map((f, i) => <Line key={i} th={th} tone={f.severity === "warn" ? "warn" : "info"}><T th={th} small>{f.text}</T></Line>)}
            </Card>
            {biz.status === "not_supported" ? (
              <StatusBox th={th} tone="bad" title={c.savedTitle}>
                <T th={th}>{c.savedBody}</T>
                <Text style={{ color: th.neg, fontWeight: "800", fontSize: 16 }}>{inr(FEE_TOTAL)} {c.saved}</Text>
              </StatusBox>
            ) : (
              <>
                {biz.status === "needs_review" ? <StatusBox th={th} tone="warn" title={c.reviewTitle}><T th={th}>{c.reviewBody}</T></StatusBox> : null}
                <Card th={th} soft><T th={th} bold>{c.route}</T><T th={th} small muted>{biz.website ? c.routeSite : c.routeNoSite}</T></Card>
                <Card th={th}>
                  <T th={th} bold>{c.docsFor}</T>
                  {biz.docs.map((d, i) => <Line key={i} th={th} tone="info"><T th={th}>{d}</T></Line>)}
                </Card>
              </>
            )}
          </>
        ) : null}
      </>
    );

    if (step === 2) return (
      <>
        <H th={th}>{c.s2Title}</H>
        <T th={th} muted>{c.s2Lead}</T>
        <Card th={th}>
          <T th={th} small muted bold>{c.pan}</T>
          <TextInput
            value={pan}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={10}
            accessibilityLabel={c.pan}
            onChangeText={(v) => { setPan(v.toUpperCase()); setRoute(null); setSlot(null); }}
            style={{ borderWidth: 1, borderColor: th.border, borderRadius: radius.md, padding: 12, color: th.fg, fontSize: 16, letterSpacing: 1.5, fontVariant: ["tabular-nums"] }}
          />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Switch value={consent} onValueChange={(v) => { setConsent(v); setRoute(null); }} accessibilityLabel={c.consent} />
            <View style={{ flex: 1 }}><T th={th} small>{c.consent}</T></View>
          </View>
        </Card>
        {route === "instant" ? <StatusBox th={th} tone="ok" title={c.instantTitle}><T th={th}>{c.instantBody}</T></StatusBox> : null}
        {route === "video" ? (
          <>
            <StatusBox th={th} tone="warn" title={c.videoTitle}><T th={th}>{c.videoBody}</T></StatusBox>
            <Card th={th}>{c.videoList.map((v, i) => <Line key={i} th={th} tone="info"><T th={th}>{v}</T></Line>)}</Card>
            <Card th={th} soft>
              <T th={th} bold>{c.bookTitle}</T>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {c.slots.map((s, i) => <Chip key={i} th={th} label={s} on={slot === i} onPress={() => setSlot(i)} />)}
              </View>
              {slot !== null ? <Pill th={th} tone="ok" label={`${c.booked} · ${c.slots[slot]}`} /> : null}
              <T th={th} small muted>{c.slotNote}</T>
            </Card>
          </>
        ) : null}
        <Pressable onPress={() => { setSimFound(!simFound); setRoute(null); setSlot(null); }} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 }} accessibilityRole="switch" accessibilityState={{ checked: simFound }}>
          <View style={{ width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, borderColor: th.faint, backgroundColor: simFound ? th.brand : "transparent" }} />
          <T th={th} small muted>{c.simFound}</T>
        </Pressable>
      </>
    );

    if (step === 3) {
      const byDoc = Object.fromEntries((names?.ai.documents || []).map((d) => [d.doc, d]));
      const tile = (k: DocKey, label: string) => {
        const src = photos[k] ? { uri: photos[k]!.uri } : SPECIMEN_IMG[k === "bank" ? (`bank_${bankVariant}` as const) : k];
        return (
          <View key={k} style={{ flex: 1, minWidth: 0, borderWidth: 1, borderColor: th.border, borderRadius: radius.md, padding: 6, gap: 6, backgroundColor: th.surface2 }}>
            <Image source={src} style={{ width: "100%", aspectRatio: 1.6, borderRadius: 6, backgroundColor: th.border }} resizeMode="cover" accessibilityLabel={`${label} ${photos[k] ? "photo" : "sample"}`} />
            <Text style={{ color: th.fg, fontSize: 11.5, fontWeight: "700", textAlign: "center" }}>{label}</Text>
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
              {Platform.OS !== "web" ? <Pressable onPress={() => pick(k, "camera")}><Text style={{ color: th.brandStrong, fontSize: 11.5, fontWeight: "700" }}>{c.takePhoto}</Text></Pressable> : null}
              <Pressable onPress={() => pick(k, "gallery")}><Text style={{ color: th.brandStrong, fontSize: 11.5, fontWeight: "700" }}>{c.gallery}</Text></Pressable>
              {photos[k] ? <Pressable onPress={() => { setPhotos((p) => { const n = { ...p }; delete n[k]; return n; }); setNames(null); }}><Text style={{ color: th.muted, fontSize: 11.5, fontWeight: "600" }}>{c.sample}</Text></Pressable> : null}
            </View>
          </View>
        );
      };
      const bankFail = names?.ai.comparisons.some((x) => x.doc === "Bank" && x.verdict === "likely_fail");
      return (
        <>
          <H th={th}>{c.s3Title}</H>
          <T th={th} muted>{c.s3Lead}</T>
          <View style={{ flexDirection: "row", gap: 8 }}>{tile("pan", "PAN")}{tile("aadhaar", "Aadhaar")}{tile("bank", "Bank")}</View>
          <T th={th} small muted>{c.sampleNote}</T>
          {namesBusy ? <Thinking th={th} label={c.reading} /> : null}
          {namesErr ? <StatusBox th={th} tone="warn" title={namesErr} /> : null}
          {names ? (
            <>
              <View style={{ borderWidth: 1, borderColor: th.border, borderRadius: radius.md, padding: 12, gap: 4 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><T th={th} small muted>{c.legal}</T><Pill th={th} tone="info" label="PAN" /></View>
                <Text style={{ color: th.fg, fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "ui-monospace, Menlo, monospace" }), fontSize: 14 }}>{byDoc.PAN?.name || ""}</Text>
              </View>
              {names.ai.comparisons.map((x, i) => {
                const tone: Tone = x.verdict === "match" ? "ok" : x.verdict === "likely_fail" ? "bad" : "warn";
                return (
                  <View key={i} style={{ borderWidth: 1, borderColor: th.border, borderRadius: radius.md, padding: 12, gap: 4 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <T th={th} small muted>{x.doc === "Bank" ? "Bank account" : x.doc}</T>
                      <Pill th={th} tone={tone} label={c[x.verdict] || x.verdict} />
                    </View>
                    <Text style={{ color: th.fg, fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "ui-monospace, Menlo, monospace" }), fontSize: 14 }}>{byDoc[x.doc]?.name || ""}</Text>
                    <T th={th} small>{x.reason}</T>
                    {x.fix ? <T th={th} small muted><Text style={{ fontWeight: "700", color: th.fg }}>{c.fix} </Text>{x.fix}</T> : null}
                  </View>
                );
              })}
              {bankFail && bankVariant === "short" && !photos.bank ? (
                <Button th={th} ghost label={c.switchAcct} onPress={() => { setBankVariant("full"); runNames("full"); }} />
              ) : null}
              <Card th={th} soft>
                <T th={th} bold>{c.brandTitle}</T>
                <T th={th} small muted bold>{c.brandLabel}</T>
                <TextInput value={brand} onChangeText={setBrand} maxLength={40} accessibilityLabel={c.brandLabel}
                  style={{ borderWidth: 1, borderColor: th.border, borderRadius: radius.md, padding: 12, color: th.fg, backgroundColor: th.surface, fontSize: 15 }} />
                <KV th={th} rows={[[c.legal, byDoc.PAN?.name || ""], [c.brandLabel, brand]]} />
                <T th={th} small muted>{c.brandHelp}</T>
              </Card>
            </>
          ) : null}
        </>
      );
    }

    if (step === 4) return (
      <>
        <H th={th}>{readiness.ready ? c.s4Title : c.s4TitleNot}</H>
        <T th={th} muted>{c.s4Lead}</T>
        <Card th={th}>
          {readiness.items.map((i, n) => (
            <Line key={n} th={th} tone={i.s}>
              <T th={th} bold>{i.k}</T>
              <T th={th} small muted>{i.v}{i.sub ? ` · ${i.sub}` : ""}</T>
            </Line>
          ))}
        </Card>
        <Card th={th} soft>
          <KV th={th} rows={[[c.feeRow, inr(FEE)], [c.gstRow, inr(GST)], [c.totalRow, inr(FEE_TOTAL), true]]} />
          <T th={th} small muted>{c.promise}</T>
        </Card>
      </>
    );

    const tl = (route === "instant" ? c.tlInstant : c.tl).map((x) => x.replace("{slot}", slot !== null ? c.slots[slot] : ""));
    return (
      <>
        <StatusBox th={th} tone="ok" title={c.s5Title}><T th={th}>{c.s5Lead}</T></StatusBox>
        <Card th={th}>{tl.map((x, i) => <Line key={i} th={th} tone={i === 0 ? "ok" : "info"} label={i === 0 ? undefined : String(i + 1)}><T th={th}>{x}</T></Line>)}</Card>
      </>
    );
  })();

  const footer = (() => {
    if (step === 0) return <><Button th={th} label={c.start} onPress={() => go(1)} /><T th={th} small muted style={{ textAlign: "center" }}>{c.time}</T></>;
    if (step === 1) return biz && biz.status !== "not_supported"
      ? <Button th={th} label={c.next} onPress={() => go(2)} />
      : <Button th={th} label={c.check} onPress={runClassify} busy={bizBusy} disabled={!bizText.trim()} />;
    if (step === 2) return !route
      ? <Button th={th} label={c.checkRoute} onPress={runRoute} disabled={!consent || pan.trim().length < 10} />
      : <Button th={th} label={c.next} onPress={() => go(3)} disabled={route === "video" && slot === null} />;
    if (step === 3) return !names
      ? <Button th={th} label={c.readCompare} onPress={() => runNames()} busy={namesBusy} />
      : <Button th={th} label={c.next} onPress={() => go(4)} />;
    if (step === 4) return <>
      <Button th={th} label={readiness.ready ? c.pay.replace("{amt}", inr(FEE_TOTAL)) : c.fixFirst} disabled={!readiness.ready}
        onPress={() => { addLog({ kind: "mock", title: "Payment and submission (simulated)", json: { amount_inr: FEE_TOTAL, charged_after_checks: true } }); go(5); }} />
      <T th={th} small muted style={{ textAlign: "center" }}>{c.paySim}</T>
    </>;
    return <Button th={th} ghost label={c.restart} onPress={restart} />;
  })();

  const panel = <BehindPanel th={th} step={step} log={log} srv={srv} mode={mode} setMode={setMode} />;

  const phone = (
    <View style={{ flex: 1, backgroundColor: th.surface, ...(wide ? { maxWidth: 420, borderRadius: 28, borderWidth: 1, borderColor: th.border, overflow: "hidden", maxHeight: 860 } : null) }}>
      <View style={{ backgroundColor: th.navy, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" disabled={step === 0 || step === 5} onPress={() => go(step - 1)}
            style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center", opacity: step === 0 || step === 5 ? 0.3 : 1 }}>
            <Text style={{ color: th.onNavy, fontSize: 22, marginTop: -2 }}>‹</Text>
          </Pressable>
          <Text style={{ color: th.onNavy, fontSize: 16, fontWeight: "700", flex: 1 }} numberOfLines={1}>{c.bar}</Text>
          <View style={{ flexDirection: "row", backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 8, padding: 2 }}>
            {(["en", "hi"] as Lang[]).map((l) => (
              <Pressable key={l} onPress={() => switchLang(l)} accessibilityRole="button" accessibilityState={{ selected: lang === l }}
                style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: lang === l ? "#fff" : "transparent" }}>
                <Text style={{ fontSize: 12, fontWeight: lang === l ? "700" : "500", color: lang === l ? "#10224A" : "rgba(255,255,255,0.85)" }}>{l === "en" ? "EN" : "Hinglish"}</Text>
              </Pressable>
            ))}
          </View>
          {!wide ? (
            <Pressable accessibilityRole="button" accessibilityLabel="How it works" onPress={() => setPanelOpen(true)}
              style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.7)", alignItems: "center", justifyContent: "center", marginLeft: 2 }}>
              <Text style={{ color: th.onNavy, fontWeight: "800", fontSize: 13 }}>?</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, letterSpacing: 0.7 }}>{c.steps[step].toUpperCase()}</Text>
        <View style={{ flexDirection: "row", gap: 4 }}>
          {[1, 2, 3, 4].map((i) => <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: step >= i ? "#7DAAFF" : "rgba(255,255,255,0.22)" }} />)}
        </View>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          {screen}
        </ScrollView>
        <View style={{ borderTopWidth: 1, borderTopColor: th.border, padding: 14, gap: 8, backgroundColor: th.surface }}>{footer}</View>
      </KeyboardAvoidingView>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: wide ? th.bg : th.navy }} edges={wide ? [] : ["top"]}>
      <StatusBar style="light" />
      {wide ? (
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16, alignItems: "center" }} style={{ backgroundColor: th.bg }}>
          <View style={{ width: "100%", maxWidth: 1120, gap: 4 }}>
            <H th={th} size={24}>KYC Pre-flight</H>
            <T th={th} muted>Know you'll pass before you pay ₹199. One task, about 90 seconds, inside the merchant app. Concept prototype for the Razorpay Build Challenge, not a Razorpay product.</T>
          </View>
          <View style={{ width: "100%", maxWidth: 1120, flexDirection: "row", gap: 28, alignItems: "flex-start" }}>
            <View style={{ width: 420, height: 840 }}>{phone}</View>
            <View style={{ flex: 1, minWidth: 0 }}>{panel}</View>
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1, backgroundColor: th.surface }}>
          <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: th.surface }}>{phone}</SafeAreaView>
          <Modal visible={panelOpen} animationType="slide" onRequestClose={() => setPanelOpen(false)} presentationStyle="pageSheet">
            <SafeAreaView style={{ flex: 1, backgroundColor: th.bg }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 }}>
                <H th={th} size={18}>Behind the screen</H>
                <Button th={th} small ghost label="Close" onPress={() => setPanelOpen(false)} />
              </View>
              <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0 }}>{panel}</ScrollView>
            </SafeAreaView>
          </Modal>
        </View>
      )}
    </SafeAreaView>
  );
}

/* ---------- Judges' panel: what is AI, what is rules, what is mocked ---------- */
const PARTS: Record<number, [LogKind, string, string][]> = {
  0: [["rule", "Fee and offer", "Computed from the fee schedule and shown before any input, so the whole cost is visible on the first screen instead of after Submit."]],
  1: [
    ["ai", "Description → category", "Claude maps a free-text, often Hinglish description to one row of the policy table and extracts stated facts: reseller, GST, website, channels."],
    ["rule", "Eligibility", "The policy table decides supported, manual review or not supported. AI never decides eligibility; low confidence downgrades to review."],
    ["rule", "Documents and payment route", "Built from entity type, category and reseller status, so the checklist is exactly what this seller needs."],
  ],
  2: [
    ["mock", "KYC registry lookup", "Mocked. In production this is the consented registry lookup that already runs during onboarding, moved before payment."],
    ["rule", "Route and preparation", "Instant route, or Video KYC with what to keep ready and a slot booked now, instead of discovering it after paying."],
  ],
  3: [
    ["ai", "Read the documents", "Claude vision reads the holder name on each photo, from the camera, the gallery or the built-in specimens of a fictional seller."],
    ["ai", "Reconcile names", "Judges order swaps, missing words, initials and spelling variants the way a bank name-match does, and predicts the ₹1 penny-drop result."],
    ["rule", "Legal name vs shop name", "Kept separate: legal name for records, shop name for customers."],
  ],
  4: [["rule", "Readiness gate", "Any red item disables pay. The fee is charged only when every check passes or the remaining item is a known review."]],
  5: [["mock", "Submission", "Simulated. No payment or application is created."]],
};

function Tag({ th, kind }: { th: Theme; kind: LogKind }) {
  const m = { ai: ["AI", th.brandSubtle, th.brandStrong], rec: ["AI · recorded", th.brandSubtle, th.brandStrong], rule: ["Rules", th.posSubtle, th.pos], mock: ["Mocked", th.warnSubtle, th.warn] }[kind];
  return <View style={{ backgroundColor: m[1], borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start" }}><Text style={{ color: m[2], fontSize: 10, fontWeight: "800", letterSpacing: 0.6 }}>{String(m[0]).toUpperCase()}</Text></View>;
}

function BehindPanel({ th, step, log, srv, mode, setMode }: { th: Theme; step: number; log: LogItem[]; srv: Health | null | undefined; mode: "live" | "rec"; setMode: (m: "live" | "rec") => void }) {
  const status = srv === undefined ? "Checking the AI server…" : srv?.liveAI
    ? `Live AI is on (${srv.model}). Calls go from the app to a small server that holds the API key. Switch to Recorded for a fast, repeatable demo.`
    : "Live AI isn't configured on this deployment, so the app uses responses recorded from the same prompts.";
  const section = { backgroundColor: th.surface, borderWidth: 1, borderColor: th.border, borderRadius: 14, padding: 16, gap: 12 } as const;
  return (
    <View style={{ gap: 16 }}>
      <View style={section}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <H th={th} size={16}>This step</H>
          <View style={{ flexDirection: "row", borderWidth: 1, borderColor: th.border, borderRadius: 8, overflow: "hidden" }}>
            {(["live", "rec"] as const).map((m) => (
              <Pressable key={m} disabled={m === "live" && !srv?.liveAI} onPress={() => setMode(m)} accessibilityRole="button" accessibilityState={{ selected: mode === m }}
                style={{ paddingVertical: 6, paddingHorizontal: 10, backgroundColor: mode === m ? th.brand : "transparent", opacity: m === "live" && !srv?.liveAI ? 0.4 : 1 }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: mode === m ? "#fff" : th.fg }}>{m === "live" ? "Live AI" : "Recorded"}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <T th={th} small muted>{status}</T>
        {(PARTS[step] || []).map(([k, b, p], i) => (
          <View key={i} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
            <Tag th={th} kind={k} />
            <View style={{ flex: 1 }}><T th={th} small><Text style={{ fontWeight: "700" }}>{b}. </Text><Text style={{ color: th.muted }}>{p}</Text></T></View>
          </View>
        ))}
      </View>
      <View style={section}>
        <H th={th} size={16}>Call log</H>
        {log.length === 0 ? <T th={th} small muted>AI calls, rule decisions and mocked system lookups appear here as you go.</T> : null}
        {log.map((e, i) => <LogRow key={e.id} th={th} e={e} open={i === 0} />)}
      </View>
      <View style={section}>
        <H th={th} size={16}>How we'd measure it</H>
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", gap: 10 }}><Tag th={th} kind="ai" /><View style={{ flex: 1 }}><T th={th} small><Text style={{ fontWeight: "700" }}>North star: first-time-right activation. </Text>Share of paid KYC applications activated on the first submission, with no clarification round.</T></View></View>
          <View style={{ flexDirection: "row", gap: 10 }}><Tag th={th} kind="rule" /><View style={{ flex: 1 }}><T th={th} small>Guardrail: fraud and chargeback rate of activated merchants stays flat against a holdout. Pre-flight prepares merchants; it never approves them.</T></View></View>
          <View style={{ flexDirection: "row", gap: 10 }}><Tag th={th} kind="rule" /><View style={{ flex: 1 }}><T th={th} small>Guardrail: onboarding support tickets per activated merchant and paid-then-rejected applications both fall.</T></View></View>
        </View>
        <T th={th} small bold>Deliberately not built</T>
        <T th={th} small muted>AI approvals or risk decisions · workarounds for restricted categories · post-activation settlement holds · clarification handling after submission (v2) · website builder · Video KYC redesign · real registry, penny-drop or payment integrations (mocked).</T>
      </View>
    </View>
  );
}

function LogRow({ th, e, open }: { th: Theme; e: LogItem; open: boolean }) {
  const [show, setShow] = useState(open);
  useEffect(() => setShow(open), [open]);
  return (
    <View style={{ borderWidth: 1, borderColor: th.border, borderRadius: 10, overflow: "hidden" }}>
      <Pressable onPress={() => setShow(!show)} style={{ padding: 10, backgroundColor: th.surface2, gap: 4 }} accessibilityRole="button" accessibilityState={{ expanded: show }}>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Tag th={th} kind={e.kind} />
          <Text style={{ color: th.fg, fontWeight: "700", fontSize: 13, flexShrink: 1 }}>{e.title}</Text>
        </View>
        <Text style={{ color: th.muted, fontSize: 11.5 }}>{e.at}{e.kind === "ai" && e.ms ? ` · ${(e.ms / 1000).toFixed(1)} s` : ""}{e.note ? ` · ${e.note}` : ""}</Text>
      </Pressable>
      {show ? (
        <ScrollView horizontal style={{ backgroundColor: th.code, maxHeight: 280 }}>
          <Text selectable style={{ color: th.fg, fontSize: 11.5, lineHeight: 16, padding: 10, fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "ui-monospace, Menlo, monospace" }) }}>
            {JSON.stringify(e.json, null, 2)}
          </Text>
        </ScrollView>
      ) : null}
    </View>
  );
}
