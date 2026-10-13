import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, Text, TextInput, useWindowDimensions, View } from "react-native";
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
import { COPY, Copy, FEE, FEE_TOTAL, GST, Lang, NamesAI, PRESETS, REC_NAMES, ClassifyAI, Candidate, Decision, Policy, Status as PStatus, TAXONOMY_STATS as TAX, NAMES, inr, policyById, recordedClassify } from "./src/data";
import { classify, DocInput, health, Health, readNames } from "./src/api";
import { checkSite, draft as draftApi, Draft, EvidenceResult, readEvidence, SiteResult } from "./src/api";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const DOCPLAN = require("./shared/docplan") as { ENTITIES: Record<string, { label: string; hint: string }>; HAVE: Record<string, { label: string }>; plan: (i: { entity: string; have: string[]; extraDocs?: string[] }) => DocPlan };
type DocPlan = { items: { key: string; label: string; status: "have" | "in_app" | "missing"; why?: string; how?: { what: string; time: string; how: string } }[]; ready: boolean; upgrade?: { title: string; body: string } };
import { browserSpeechAvailable, startBrowserSpeech } from "./src/voice";
import { compareNames, scoreNames, Token } from "./src/names";
import { Scorecard } from "./src/Scorecard";
import { Landing } from "./src/Landing";
import { ckycSearch, captureFee, CkycSearchRequest } from "./src/adapters";
import { GoLivePass, PassRow } from "./src/Pass";
import { Button, Chip, FeeRows, Icon, IconRow, Notice, Panel, Reveal, Sheet, Status, Thinking, Tone, Txt, toneColors } from "./src/ui";

const SPECIMEN_IMG = {
  pan: require("./assets/specimens/pan.png"),
  aadhaar: require("./assets/specimens/aadhaar.png"),
  bank_short: require("./assets/specimens/bank_short.png"),
  bank_full: require("./assets/specimens/bank_full.png"),
};

type DocKey = "pan" | "aadhaar" | "bank";
type EvKey = "instagram" | "catalog" | "invoice";
const EV_IMG = {
  ig_priya: require("./assets/evidence/ig_priya.png"),
  catalog_priya: require("./assets/evidence/catalog_priya.png"),
  catalog_mismatch: require("./assets/evidence/catalog_mismatch.png"),
  invoice_priya: require("./assets/evidence/invoice_priya.png"),
};
const HAVE_BY_ENTITY: Record<string, string[]> = { individual: ["udyam", "gst"], proprietorship: ["udyam", "gst", "shop", "current"], partnership: ["deed", "gst", "current"], company: ["coi", "gst", "current"] };
type Photo = { uri: string; base64: string; mediaType: string };
type LogKind = "ai" | "rec" | "rule" | "mock";
type LogItem = { id: number; kind: LogKind; title: string; at: string; ms?: number; note?: string; json: unknown };
type BizResult = { ai: ClassifyAI; policy: Policy; status: PStatus; lowConf: boolean; reviewerWhy?: "low_confidence" | "mixed_candidates" | "blocked_terms"; docs: string[]; website: boolean; source: "live" | "rec"; candidates?: Candidate[] };
type Ask = { question: string; answer: string };

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
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftBusy, setDraftBusy] = useState(false);
  const [draftDoc, setDraftDoc] = useState<Draft | null>(null);
  const [copied, setCopied] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const [preset, setPreset] = useState<string | null>("priya");
  const [bizText, setBizText] = useState(PRESETS.priya.en);
  const [bizBusy, setBizBusy] = useState(false);
  const [bizErr, setBizErr] = useState<string | null>(null);
  const [biz, setBiz] = useState<BizResult | null>(null);
  const [ask, setAsk] = useState<Ask | null>(null);        // one clarifying question, when the verdict depends on it
  const [showCands, setShowCands] = useState(false);
  const [siteUrl, setSiteUrl] = useState("");
  const [site, setSite] = useState<SiteResult | null>(null);
  const [siteBusy, setSiteBusy] = useState(false);
  const [siteMode, setSiteMode] = useState<null | "social" | "site">(null);
  const [entity, setEntity] = useState<string | null>(null);
  const [have, setHave] = useState<string[]>([]);
  const [haveDone, setHaveDone] = useState(false);
  const [evPhotos, setEvPhotos] = useState<Partial<Record<EvKey, Photo>>>({});
  const [evMismatch, setEvMismatch] = useState(false);
  const [evidence, setEvidence] = useState<EvidenceResult | null>(null);
  const [evBusy, setEvBusy] = useState(false);
  const [caseOpen, setCaseOpen] = useState(false);

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

  // Try live AI unless the server says it has no key; a slow health check shouldn't silently force recorded mode.
  const live = mode === "live" && srv?.liveAI !== false;
  useEffect(() => { health().then((h) => { setSrv(h); if (h && !h.liveAI) setMode("rec"); }); }, []);

  const addLog = useCallback((e: Omit<LogItem, "id" | "at">) => {
    const at = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLog((l) => [{ ...e, id: Date.now() + Math.random(), at }, ...l].slice(0, 16));
  }, []);
  const go = (n: number) => { setStep(n); requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false })); };
  const scrollDown = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);

  function buildBiz(ai: ClassifyAI, l: Lang, source: "live" | "rec", decision?: Decision, candidates?: Candidate[]): BizResult {
    const policy = policyById(ai.policy_id);
    // The server's decision policy is authoritative when present; the recorded path applies the same rule locally.
    let status = policy.status, lowConf = false, reviewerWhy: BizResult["reviewerWhy"];
    if (decision?.state === "reviewer") { status = "needs_review"; lowConf = true; reviewerWhy = decision.why; }
    else if (decision?.state === "decided") status = decision.status;
    else if (status === "supported" && !(Number(ai.confidence) >= 0.6)) { status = "needs_review"; lowConf = true; reviewerWhy = "low_confidence"; }
    const docs = [...COPY[l].docBase];
    if (ai.is_reseller === true && policy.resellerDoc) docs.push(COPY[l].docInvoice);
    for (const d of policy.extraDocs || []) docs.push(d);
    return { ai, policy, status, lowConf, reviewerWhy, docs, website: ai.has_website === true, source, candidates };
  }

  const switchLang = (l: Lang) => {
    if (l === lang) return;
    setLang(l);
    if (preset) setBizText(PRESETS[preset][l]);
    if (biz && biz.source === "rec" && preset) setBiz(buildBiz(recordedClassify(preset, l), l, "rec"));
    if (names && names.source === "rec" && names.recKey) setNames({ ai: REC_NAMES[names.recKey][l], source: "rec", recKey: names.recKey });
  };

  async function runClassify(qa?: Ask) {
    const text = bizText.trim(); if (!text) return;
    setBizBusy(true); setBizErr(null); setBiz(null); setShowCands(false);
    if (!qa) setAsk(null);
    const presetKey = Object.keys(PRESETS).find((k) => PRESETS[k].en === text || PRESETS[k].hi === text) || null;
    let ai: ClassifyAI | null = null, source: "live" | "rec" = "rec", ms = 0, note = "", model = "";
    let decision: Decision | undefined, candidates: Candidate[] | undefined;
    if (live) {
      try {
        const res = await classify(text, lang, qa);
        ai = res.ai; ms = res.ms; model = res.model; source = "live"; decision = res.decision; candidates = res.candidates;
        addLog({ kind: "rule", title: `Retrieval: ${res.candidates.length} candidates from ${TAX.rows} sub-categories`, note: `terms: ${res.queryTerms.join(", ")}`, json: res.candidates.map((x) => ({ id: x.id, status: x.status, score: x.score, matched: x.hits })) });
        if (decision.state === "ask") {
          setBizBusy(false);
          setAsk({ question: decision.question, answer: "" });
          addLog({ kind: "ai", title: "Needs one answer before deciding", ms, note: model, json: ai });
          return;
        }
      }
      catch (e: any) { note = `Live call failed (${e?.message || "error"}); used the recorded answer.`; }
    }
    if (!ai && presetKey) ai = recordedClassify(presetKey, lang);
    setBizBusy(false);
    if (!ai) {
      setBizErr(c.errNoAI);
      addLog({ kind: "ai", title: "Description → category failed", note: note || "Live AI is off", json: { error: note || "Live AI is off and no recorded answer exists for this text" } });
      return;
    }
    const res = buildBiz(ai, lang, source, decision, candidates);
    setBiz(res);
    haptic(res.status === "supported" ? "success" : "warning");
    addLog({ kind: source === "live" ? "ai" : "rec", title: "Description → category", ms, note: [model, note].filter(Boolean).join(" · "), json: ai });
    addLog({ kind: "rule", title: "Decision policy", json: { policy_id: res.policy.id, table_status: res.policy.status, confidence: ai.confidence, decision: decision || { state: "local_rule", threshold: 0.6 }, final_status: res.status, documents: res.docs } });
    scrollDown();
  }

  /** The model's second job: it writes. Every draft is labelled, bracketed where unknown, and reviewed by the seller. */
  async function makeDraft(payload: Parameters<typeof draftApi>[0]) {
    setDraftOpen(true); setDraftBusy(true); setDraftDoc(null); setCopied(false);
    try {
      const d = await draftApi(payload);
      setDraftDoc(d);
      addLog({ kind: "ai", title: `Draft: ${d.title}`, ms: d.ms, note: `${d.model} · labelled draft, seller reviews before use`, json: { kind: payload.kind, page: payload.page, notes: d.notes } });
    } catch (e: any) {
      setDraftDoc({ title: c.draftTitle, body: c.errNoAI, notes: [], ms: 0, draft: true });
      addLog({ kind: "ai", title: "Draft failed", json: { error: e?.message } });
    }
    setDraftBusy(false);
  }
  /** Deterministic: the branch letter needs no model, only the names the engine already has. */
  function branchLetter() {
    const byDoc = Object.fromEntries((names?.ai.documents || []).map((d) => [d.doc, d.name]));
    const body = [
      "To,", "The Branch Manager,", "[Bank name], [Branch]", "",
      `Subject: ${c.letterTitle}`, "",
      "Dear Sir/Madam,", "",
      `I hold savings/current account number [account number] at your branch. The account holder name is currently recorded as "${byDoc.Bank || "[name on bank record]"}".`,
      `My name as per PAN (${pan.slice(0, 3)}•••${pan.slice(-2)}) is "${byDoc.PAN || "[name on PAN]"}". The payment gateway's bank verification compares the account holder name with the PAN name, and the difference is holding up my business account activation.`,
      "", `I request you to update the account holder name to "${byDoc.PAN || "[name on PAN]"}" exactly as on my PAN card. I am enclosing a self-attested copy of my PAN card and [Aadhaar / passbook first page].`,
      "", "Thanking you,", "", `${byDoc.PAN || "[Your name]"}`, "Mobile: [mobile]", "Date: [date]",
    ].join("\n");
    setDraftDoc({ title: c.letterTitle, body, notes: ["Fill the bank name, branch, account number, mobile and date.", "Carry the original PAN card; most branches update the name in 2–3 working days.", "Then come back and run the name check again."], ms: 0, draft: true });
    setDraftOpen(true); setDraftBusy(false); setCopied(false);
    addLog({ kind: "rule", title: "Draft: branch letter (template, names from the engine)", json: { pan_name: byDoc.PAN, bank_name: byDoc.Bank } });
  }
  async function copyDraft() {
    if (!draftDoc) return;
    const text = `${draftDoc.title}\n\n${draftDoc.body}`;
    try {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }
      else await Share.share({ message: text, title: draftDoc.title });
    } catch { /* user cancelled */ }
  }

  async function runSite() {
    const url = siteUrl.trim(); if (!url) return;
    setSiteBusy(true); setSite(null);
    try {
      const res = await checkSite(url, Boolean(biz && biz.policy.category === "ecommerce"));
      setSite(res);
      haptic(res.ok && res.missing.length === 0 ? "success" : "warning");
      addLog({ kind: "rule", title: "Website readiness (fetched live, rules decide)", ms: res.ms, note: res.kind === "site" ? `${res.linksSeen} links read · ${res.missing.length} missing` : res.kind, json: res });
    } catch (e: any) {
      setSite({ ok: false, kind: "unreachable", pages: {}, missing: [], notes: [e?.message || "error"], ms: 0 });
      addLog({ kind: "rule", title: "Website readiness failed", json: { error: e?.message } });
    }
    setSiteBusy(false); scrollDown();
  }

  async function runRoute() {
    setRouteBusy(true); setRoute(null); setSlot(null);
    const req: CkycSearchRequest = { id_type: "PAN", id_number_masked: pan.slice(0, 3) + "•••" + pan.slice(-2), consent: { given: true, at: new Date().toISOString(), purpose: "merchant_onboarding_kyc" } };
    const resp = await ckycSearch(req, "mock", { found: simFound, name: "PRIYA LAKSHMI REDDY" });
    const res = resp.found ? "instant" : "video";
    setRoute(res); setRouteBusy(false); haptic(res === "instant" ? "success" : "light");
    addLog({ kind: "mock", title: "CKYC registry search (mock adapter, real request/response shape)", json: { request: req, response: resp, route_rule: "found → registry route; not found → Video KYC" } });
    scrollDown();
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

  async function pickEv(k: EvKey) {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
      if (res.canceled || !res.assets?.[0]?.uri) return;
      const a = res.assets[0];
      const ctx = ImageManipulator.manipulate(a.uri);
      if ((a.width || 0) > 1200) ctx.resize({ width: 1200 });
      const out = await (await ctx.renderAsync()).saveAsync({ base64: true, compress: 0.6, format: SaveFormat.JPEG });
      if (!out.base64) throw new Error("no data");
      setEvPhotos((ph) => ({ ...ph, [k]: { uri: out.uri, base64: out.base64 as string, mediaType: "image/jpeg" } }));
      setEvidence(null);
    } catch { setNamesErr(c.errPhotos); }
  }
  const evSample = (k: EvKey) => (k === "instagram" ? "ig_priya" : k === "catalog" ? (evMismatch ? "catalog_mismatch" : "catalog_priya") : "invoice_priya") as keyof typeof EV_IMG;

  async function runEvidence(legalName: string) {
    if (!biz) return;
    setEvBusy(true); setEvidence(null);
    const items = (["instagram", "catalog", "invoice"] as EvKey[]).map((k) => ({ id: k, kind: k, ...(evPhotos[k] ? { base64: evPhotos[k]!.base64, mediaType: evPhotos[k]!.mediaType } : { sample: evSample(k) }) }));
    try {
      const res = await readEvidence({ lang, declared: { legalName, shopName: brand, policyId: biz.policy.id, description: bizText }, items });
      setEvidence(res);
      addLog({ kind: "ai", title: "Read business evidence (vision): facts only", ms: res.ms, note: res.model, json: res.sources });
      addLog({ kind: "rule", title: `Cross-source consistency: ${res.grid.verdict}`, note: `${res.grid.rows.length} facts × ${res.sources.length} sources · ${res.grid.flags.length} flags`, json: res.grid });
    } catch (e: any) {
      addLog({ kind: "ai", title: "Evidence read failed", json: { error: e?.message } });
    }
    setEvBusy(false);
  }
  async function runAll() {
    const legal = photos.pan ? "" : NAMES.pan;
    if (legal) await Promise.all([runNames(), runEvidence(legal)]);
    else { await runNames(); }
  }

  async function runNames(variant = bankVariant) {
    setNamesBusy(true); setNamesErr(null); setNames(null);
    const anyPhoto = Object.keys(photos).length > 0;
    const doc = (k: DocKey): DocInput => photos[k] ? { base64: photos[k]!.base64, mediaType: photos[k]!.mediaType } : { sample: k === "bank" ? `bank_${variant}` : k };
    let ai: NamesAI | null = null, source: "live" | "rec" = "rec", ms = 0, note = "", model = "";
    if (live) {
      try {
        const res = await readNames({ pan: doc("pan"), aadhaar: doc("aadhaar"), bank: doc("bank") }, lang); ai = res.ai; ms = res.ms; model = res.model; source = "live";
        addLog({ kind: "rule", title: "Name-match engine: scored verdicts", note: `thresholds match ≥ ${res.thresholds.match}, review ≥ ${res.thresholds.review}${res.disagreements.length ? ` · overrode the model on ${res.disagreements.map((d) => d.doc).join(", ")}` : " · model agreed"}`, json: { engine: res.engine, disagreements: res.disagreements } });
      }
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
    haptic(ai.comparisons.some((x) => x.verdict !== "match") ? "warning" : "success");
    addLog({ kind: source === "live" ? "ai" : "rec", title: "Read names from documents (vision)", ms, note: [model, note].filter(Boolean).join(" · "), json: ai });
    if (source === "rec") {
      const legal = ai.documents.find((d) => d.doc === "PAN")?.name || "";
      addLog({ kind: "rule", title: "Name-match engine: scored verdicts", note: "same engine, run locally", json: Object.fromEntries(ai.documents.filter((d) => d.doc !== "PAN").map((d) => { const r = scoreNames(legal, d.name); return [d.doc, { score: r.score, verdict: r.verdict, note: r.note }]; })) });
    }
    scrollDown();
  }

  useEffect(() => {
    if (names && photos.pan && !evidence && !evBusy) {
      const legal = names.ai.documents.find((d) => d.doc === "PAN")?.name;
      if (legal) runEvidence(legal);
    }
  }, [names]);

  const docPlan: DocPlan | null = useMemo(() => {
    if (!entity || !biz) return null;
    const extra = [...(biz.policy.extraDocs || [])];
    const fssaiNeeded = extra.some((d) => /fssai/i.test(d));
    return DOCPLAN.plan({ entity, have: [...have, ...(fssaiNeeded && have.includes("fssai") ? ["fssai"] : [])], extraDocs: extra });
  }, [entity, have, biz]);

  /* Readiness: rules decide what the pass shows. */
  const slotLabel = slot ? `${c.days[day]} ${slot}` : null;
  // Product rule: the bank name is what the ₹1 check compares with PAN and the seller can fix it cheaply, so anything short of a match blocks payment. An Aadhaar doubt goes to a reviewer.
  const bankVerdict = names?.ai.comparisons.find((x) => x.doc === "Bank")?.verdict;
  const namesTone: Tone = !names ? "bad" : bankVerdict !== "match" || names.ai.comparisons.some((x) => x.verdict === "likely_fail") ? "bad" : names.ai.comparisons.some((x) => x.verdict === "unclear") ? "warn" : "ok";
  const passRows: PassRow[] = useMemo(() => {
    const catTone: Tone = !biz ? "bad" : biz.status === "supported" ? "ok" : biz.status === "needs_review" ? "warn" : "bad";
    const routeTone: Tone = !route ? "bad" : route === "instant" || slot ? "ok" : "warn";
    return [
      { label: c.rowCat, value: biz ? (biz.ai.category_label || biz.policy.label) : "—", tone: catTone, stamp: catTone === "ok" ? c.passed : catTone === "warn" ? c.review : c.fix, onFix: catTone === "ok" ? undefined : () => go(1) },
      { label: c.rowRoute, value: !route ? "—" : route === "instant" ? c.routeInstant : c.routeVideo(slotLabel || "—"), tone: routeTone, stamp: routeTone === "ok" ? c.passed : c.fix, onFix: routeTone === "ok" ? undefined : () => go(2) },
      { label: c.rowNames, value: namesTone === "ok" ? c.namesOk : namesTone === "warn" ? c.namesWarn : c.namesBad, tone: namesTone, stamp: namesTone === "ok" ? c.passed : namesTone === "warn" ? c.review : c.fix, onFix: namesTone === "ok" ? undefined : () => go(3) },
      ...(docPlan ? [{ label: c.rowDocs, value: docPlan.ready ? c.docsReady : c.docsMissing(docPlan.items.filter((i) => i.status === "missing").length), tone: (docPlan.ready ? "ok" : "bad") as Tone, stamp: docPlan.ready ? c.passed : c.fix, onFix: docPlan.ready ? undefined : () => go(1) }] : []),
      ...(evidence ? [{ label: c.rowProof, value: evidence.grid.verdict === "ok" ? c.proofOk : evidence.grid.verdict === "warn" ? c.proofWarn : c.proofBad, tone: evidence.grid.verdict as Tone, stamp: evidence.grid.verdict === "ok" ? c.passed : evidence.grid.verdict === "warn" ? c.review : c.fix, onFix: evidence.grid.verdict === "ok" ? undefined : () => go(3) }] : []),
      ...(siteMode === "site" && site && site.kind !== "social" ? [{ label: c.rowSite, value: site.ok ? (site.missing.length ? c.siteMissing(site.missing.length) : c.siteOk) : c.siteDown, tone: (site.ok && site.missing.length === 0 ? "ok" : "bad") as Tone, stamp: site.ok && site.missing.length === 0 ? c.passed : c.fix, onFix: site.ok && site.missing.length === 0 ? undefined : () => go(1) }] : []),
    ];
  }, [biz, route, slot, slotLabel, namesTone, site, siteMode, docPlan, evidence, c]);
  const ready = !passRows.some((x) => x.tone === "bad");

  function restart() {
    setBiz(null); setBizErr(null); setRoute(null); setSlot(null); setConsent(false); setNames(null); setNamesErr(null); setPhotos({}); setBankVariant("short"); setSite(null); setSiteUrl(""); setAsk(null); setSiteMode(null); setEntity(null); setHave([]); setHaveDone(false); setEvPhotos({}); setEvMismatch(false); setEvidence(null);
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
    const siteDone = siteMode === "social" || (siteMode === "site" && site !== null);
    const askBlock = ask && !biz && !bizBusy ? (
      <Reveal>
        <Panel th={th} tint>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <Icon name="help-circle" size={18} color={th.brand} />
            <Txt th={th} v="smallMed" color={th.brand}>{c.askTitle}</Txt>
          </View>
          <Txt th={th} v="h3">{ask.question}</Txt>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <View style={{ flex: 1, borderWidth: 1.5, borderColor: th.line, borderRadius: r.md, backgroundColor: th.surface }}>
              <TextInput value={ask.answer} onChangeText={(v) => setAsk({ ...ask, answer: v })} placeholder={c.askPlaceholder} placeholderTextColor={th.faint} accessibilityLabel={ask.question}
                style={{ minHeight: 48, padding: 12, fontFamily: font.body, fontSize: 16, color: th.ink, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null) }} />
            </View>
            <MicButton th={th} lang={lang} onText={(t) => setAsk({ ...ask, answer: t })} />
          </View>
          <Txt th={th} v="small" color={th.muted}>{c.askWhy}</Txt>
        </Panel>
      </Reveal>
    ) : null;
    screen = (
      <>
        {/* Q1: what do you sell */}
        {!biz && !ask ? (
          <>
            <Txt th={th} v="h1">{c.s1Title}</Txt>
            <Txt th={th} color={th.muted}>{c.s1Body}</Txt>
            <View style={{ borderWidth: 1.5, borderColor: th.line, borderRadius: r.lg, backgroundColor: th.surface }}>
              <TextInput
                value={bizText}
                onChangeText={(v) => { setBizText(v); setPreset(null); setBiz(null); setBizErr(null); setAsk(null); }}
                placeholder={c.s1Placeholder}
                placeholderTextColor={th.faint}
                multiline
                accessibilityLabel={c.s1Title}
                style={{ minHeight: 104, padding: 16, paddingBottom: 48, fontFamily: font.body, fontSize: 16, lineHeight: 23, color: th.ink, textAlignVertical: "top", ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null) }}
              />
              <View style={{ position: "absolute", right: 10, bottom: 10 }}>
                <MicButton th={th} lang={lang} onText={(t) => { setBizText(t); setPreset(null); }} />
              </View>
            </View>
            <View style={{ gap: 8 }}>
              <Txt th={th} v="smallMed" color={th.muted}>{c.examples}</Txt>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {Object.entries(PRESETS).map(([k, p]) => (
                  <Chip key={k} th={th} label={p.label} on={preset === k} onPress={() => { setPreset(k); setBizText(p[lang]); setBiz(null); setBizErr(null); }} />
                ))}
              </View>
            </View>
          </>
        ) : (
          <Answered th={th} label={c.s1Title} value={bizText} onEdit={() => { setBiz(null); setAsk(null); setSite(null); setSiteMode(null); }} editLabel={c.edit} />
        )}
        {bizBusy ? <Thinking th={th} label={c.s1Busy} /> : null}
        {bizErr ? <Notice th={th} tone="warn" title={bizErr} /> : null}
        {askBlock}

        {/* Result card */}
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
              {biz.lowConf ? <Txt th={th} v="small" color={th.muted}>{biz.reviewerWhy === "mixed_candidates" ? c.mixedConf : biz.reviewerWhy === "blocked_terms" ? c.blockedTerms : c.lowConf}</Txt> : null}
              {biz.status === "needs_review" && biz.policy.reason && !biz.lowConf ? <Txt th={th} v="small" color={th.muted}>{biz.policy.reason}</Txt> : null}
              {biz.candidates && biz.candidates.length > 1 ? (
                <Pressable onPress={() => setShowCands((v) => !v)} accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <Icon name={showCands ? "chevron-up" : "chevron-down"} size={14} color={th.muted} />
                  <Txt th={th} v="smallMed" color={th.muted}>{c.considered(biz.candidates.length)}</Txt>
                </Pressable>
              ) : null}
              {showCands && biz.candidates ? (
                <View style={{ gap: 6 }}>
                  {biz.candidates.map((x) => {
                    const on = x.id === biz.policy.id;
                    const tone: Tone = x.status === "supported" ? "ok" : x.status === "needs_review" ? "warn" : "bad";
                    const [fg] = toneColors(th, tone);
                    return (
                      <View key={x.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: fg }} />
                        <Txt th={th} v="small" color={on ? th.ink : th.muted} style={{ flex: 1 }}>{x.label}{on ? " ✓" : ""}</Txt>
                        <Text style={{ fontFamily: font.mono, fontSize: 11, color: th.faint }}>{x.score.toFixed(2)}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </Panel>
            {st === "not_supported" ? (
              <Notice th={th} tone="bad" title={c.stopTitle}>
                <Txt th={th}>{c.stopBody}</Txt>
                <Text style={{ fontFamily: font.display, fontSize: 22, color: th.neg, marginTop: 4 }}>{inr(FEE_TOTAL)} {c.saved}</Text>
              </Notice>
            ) : null}
            {st === "needs_review" ? (
              <Notice th={th} tone="warn" title={c.needs_review}>
                <Txt th={th}>{c.reviewNote}</Txt>
                <Button th={th} kind="secondary" compact icon="edit-3" label={c.writeAnswers} onPress={() => makeDraft({ kind: "clarification", lang, business: { description: bizText, category: biz.policy.category, label: biz.policy.label, status: biz.policy.status, reason: biz.policy.reason } })} />
              </Notice>
            ) : null}
          </Reveal>
        ) : null}

        {/* Q2: where will customers pay */}
        {biz && st !== "not_supported" ? (
          siteMode === null ? (
            <Reveal>
              <Txt th={th} v="h2">{c.q2Title}</Txt>
              <View style={{ gap: 8 }}>
                <ChoiceRow th={th} icon="message-circle" label={c.q2Social} sub={c.q2SocialSub} onPress={() => { setSiteMode("social"); addLog({ kind: "rule", title: "Channel: social or messaging", json: { route: "payment_links", website_review: false } }); }} />
                <ChoiceRow th={th} icon="globe" label={c.q2Site} sub={c.q2SiteSub} onPress={() => setSiteMode("site")} />
              </View>
            </Reveal>
          ) : siteMode === "social" ? (
            <Answered th={th} label={c.q2Title} value={c.q2Social} onEdit={() => { setSiteMode(null); setSite(null); }} editLabel={c.edit} />
          ) : (
            <Reveal>
              {site ? <Answered th={th} label={c.q2Title} value={site.finalUrl || siteUrl} onEdit={() => { setSite(null); }} editLabel={c.edit} /> : (
                <Panel th={th}>
                  <Txt th={th} v="h3">{c.siteTitle}</Txt>
                  <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                    <View style={{ flex: 1, borderWidth: 1.5, borderColor: th.line, borderRadius: r.md, backgroundColor: th.surface }}>
                      <TextInput value={siteUrl} onChangeText={(v) => { setSiteUrl(v); setSite(null); }} placeholder={c.sitePlaceholder} placeholderTextColor={th.faint} autoCapitalize="none" autoCorrect={false} keyboardType="url" accessibilityLabel={c.siteTitle}
                        style={{ minHeight: 44, paddingHorizontal: 12, fontFamily: font.body, fontSize: 15, color: th.ink, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null) }} />
                    </View>
                    <Button th={th} kind="secondary" compact label={c.siteCta} onPress={runSite} busy={siteBusy} disabled={!siteUrl.trim() || siteBusy} />
                  </View>
                  <Pressable onPress={() => setSiteMode(null)} accessibilityRole="button"><Txt th={th} v="smallMed" color={th.brand}>{c.q2Back}</Txt></Pressable>
                  {siteBusy ? <Thinking th={th} label={c.siteBusy} /> : null}
                </Panel>
              )}
              {site ? (
                <Panel th={th}>
                  {site.kind === "social" ? <Notice th={th} tone="ok" title={c.siteSocial} /> : !site.ok ? <Notice th={th} tone="bad" title={c.siteDown}>{site.notes.map((n, i) => <Txt key={i} th={th} v="small">{n}</Txt>)}</Notice> : (
                    <>
                      <Status th={th} tone={site.missing.length ? "bad" : "ok"} label={site.missing.length ? c.siteMissing(site.missing.length) : c.siteOk} />
                      {Object.entries(site.pages).map(([k, p]) => (
                        <View key={k} style={{ gap: 6 }}>
                          <IconRow th={th} icon={p.found ? "check-circle" : "x-circle"} tone={p.found ? (p.thin ? "warn" : "ok") : "bad"}>
                            <Txt th={th}>{p.label}{p.found && p.linkText ? <Txt th={th} v="small" color={th.muted}>  · {p.linkText}</Txt> : null}</Txt>
                          </IconRow>
                          {!p.found || p.thin ? (
                            <View style={{ paddingLeft: 30 }}>
                              <Button th={th} kind="secondary" compact icon="edit-3" label={c.writePage} onPress={() => makeDraft({ kind: "policy", page: k, lang, site: site.finalUrl, business: { description: bizText, category: biz.policy.category, label: biz.policy.label } })} />
                            </View>
                          ) : null}
                        </View>
                      ))}
                      {site.notes.map((n, i) => <IconRow key={`n${i}`} th={th} icon="alert-triangle" tone="warn"><Txt th={th} v="small">{n}</Txt></IconRow>)}
                    </>
                  )}
                </Panel>
              ) : null}
            </Reveal>
          )
        ) : null}

        {/* Q3: how is the business set up */}
        {biz && st !== "not_supported" && siteDone ? (
          entity === null ? (
            <Reveal>
              <Txt th={th} v="h2">{c.entityTitle}</Txt>
              <View style={{ gap: 8 }}>
                {Object.entries(DOCPLAN.ENTITIES).map(([k, e]) => (
                  <ChoiceRow key={k} th={th} icon={k === "individual" ? "user" : k === "proprietorship" ? "briefcase" : k === "partnership" ? "users" : "home"} label={e.label} sub={e.hint}
                    onPress={() => { setEntity(k); setHave([]); setHaveDone(false); addLog({ kind: "rule", title: "Entity type", json: { entity: k } }); }} />
                ))}
              </View>
            </Reveal>
          ) : (
            <Answered th={th} label={c.entityTitle} value={DOCPLAN.ENTITIES[entity].label} onEdit={() => { setEntity(null); setHave([]); setHaveDone(false); }} editLabel={c.edit} />
          )
        ) : null}

        {/* Q4: what do you already have */}
        {biz && st !== "not_supported" && siteDone && entity ? (
          !haveDone ? (
            <Reveal>
              <Txt th={th} v="h2">{c.haveTitle}</Txt>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {[...HAVE_BY_ENTITY[entity], ...((biz.policy.extraDocs || []).some((d) => /fssai/i.test(d)) ? ["fssai"] : [])].map((k) => (
                  <Chip key={k} th={th} label={DOCPLAN.HAVE[k].label} on={have.includes(k)} onPress={() => setHave((h) => (h.includes(k) ? h.filter((x) => x !== k) : [...h, k]))} />
                ))}
              </View>
              <Button th={th} kind="secondary" compact label={have.length ? c.haveDone : c.haveNone} onPress={() => { setHaveDone(true); addLog({ kind: "rule", title: "Document plan (rules)", json: DOCPLAN.plan({ entity, have, extraDocs: biz.policy.extraDocs || [] }) }); }} />
            </Reveal>
          ) : (
            <Answered th={th} label={c.haveTitle} value={have.length ? have.map((k) => DOCPLAN.HAVE[k].label).join(", ") : c.haveNone} onEdit={() => setHaveDone(false)} editLabel={c.edit} />
          )
        ) : null}

        {/* The plan */}
        {biz && st !== "not_supported" && siteDone && entity && haveDone && docPlan ? (
          <Reveal>
            <Panel th={th} tint>
              <Txt th={th} v="h3">{c.planTitle}</Txt>
              <Txt th={th} v="small" color={th.muted}>{c.planSub}</Txt>
              {docPlan.items.map((it) => (
                <View key={it.key} style={{ gap: 4 }}>
                  <IconRow th={th} icon={it.status === "missing" ? "x-circle" : it.status === "have" ? "check-circle" : "smartphone"} tone={it.status === "missing" ? "bad" : "ok"}>
                    <Txt th={th}>{it.label}<Txt th={th} v="small" color={th.muted}>{"  · "}{it.status === "missing" ? c.planMissing : it.status === "have" ? c.planHave : c.planInApp}</Txt></Txt>
                  </IconRow>
                  {it.status === "missing" && it.how ? (
                    <View style={{ marginLeft: 30, padding: 10, borderRadius: r.md, backgroundColor: th.surface, borderWidth: 1, borderColor: th.line, gap: 2 }}>
                      <Txt th={th} v="smallMed">{it.how.what} · {it.how.time}</Txt>
                      <Txt th={th} v="small" color={th.muted}>{it.how.how}</Txt>
                    </View>
                  ) : null}
                </View>
              ))}
              <IconRow th={th} icon="link" tone="ok"><Txt th={th}>{siteMode === "site" ? c.routeSite : c.routeLinks}</Txt></IconRow>
              {docPlan.upgrade ? (
                <View style={{ padding: 10, borderRadius: r.md, backgroundColor: th.brandTint, gap: 2 }}>
                  <Txt th={th} v="smallMed" color={th.brand}>{docPlan.upgrade.title}</Txt>
                  <Txt th={th} v="small">{docPlan.upgrade.body}</Txt>
                </View>
              ) : null}
            </Panel>
          </Reveal>
        ) : null}
      </>
    );
    footer = biz
      ? st === "not_supported"
        ? <Button th={th} kind="secondary" label={c.tryAnother} icon="rotate-ccw" onPress={() => { setBiz(null); setPreset(null); setSiteMode(null); setSite(null); }} />
        : <Button th={th} label={c.s1Next} onPress={() => go(2)} disabled={!siteDone || !entity || !haveDone} />
      : ask
        ? <Button th={th} label={c.askCta} onPress={() => runClassify(ask)} busy={bizBusy} disabled={!ask.answer.trim()} />
        : <Button th={th} label={c.s1Cta} onPress={() => runClassify()} busy={bizBusy} disabled={!bizText.trim()} />;
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
    const bankFail = Boolean(verdicts.Bank) && verdicts.Bank.verdict !== "match";
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
        <Txt th={th} v="h3">{c.evTitle}</Txt>
        <Txt th={th} v="small" color={th.muted}>{entity && entity !== "individual" ? c.evBodyReg : c.evBody}</Txt>
        <View style={{ gap: 10 }}>
          {(["instagram", "catalog", "invoice"] as EvKey[]).map((k) => (
            <DocRow key={k} th={th} c={c} label={c.ev[k]} scanning={evBusy}
              src={evPhotos[k] ? { uri: evPhotos[k]!.uri } : EV_IMG[evSample(k)]}
              isPhoto={!!evPhotos[k]}
              onGallery={() => pickEv(k)}
              onSample={evPhotos[k] ? () => { setEvPhotos((p) => { const n = { ...p }; delete n[k]; return n; }); setEvidence(null); } : undefined} />
          ))}
        </View>
        <Pressable onPress={() => { setEvMismatch((v) => !v); setEvidence(null); }} accessibilityRole="switch" accessibilityState={{ checked: evMismatch }} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Icon name={evMismatch ? "toggle-right" : "toggle-left"} size={18} color={evMismatch ? th.brand : th.faint} />
          <Txt th={th} v="small" color={th.muted}>{c.evMismatchToggle}</Txt>
        </Pressable>
        <Txt th={th} v="small" color={th.faint}>{c.samplesNote}</Txt>
        {namesBusy || evBusy ? <Thinking th={th} label={c.s3BusyAll} /> : null}
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
                    <Status th={th} tone={verdicts[d].verdict === "match" ? "ok" : verdicts[d].verdict === "likely_fail" || d === "Bank" ? "bad" : "warn"} label={d === "Bank" && verdicts[d].verdict === "unclear" ? c.bankPartial : c[verdicts[d].verdict]} />
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
                <Button th={th} kind="secondary" label={c.fixLetter} icon="file-text" onPress={branchLetter} />
                <Button th={th} kind="quiet" label={c.fixBranch} icon="map-pin" onPress={() => setBranchOpen(true)} />
              </Panel>
            ) : null}
          </Reveal>
        ) : null}
        {evidence ? (
          <Reveal>
            <ConsistencyGrid th={th} c={c} ev={evidence} />
          </Reveal>
        ) : null}
      </>
    );
    footer = !names || (!evidence && !evBusy)
      ? <Button th={th} label={c.s3CtaAll} icon="maximize" onPress={() => (names && !evidence ? runEvidence(legal) : runAll())} busy={namesBusy || evBusy} />
      : <Button th={th} label={c.s3Next} kind={bankFail ? "secondary" : "primary"} onPress={() => go(4)} />;
  }

  if (step === 4) {
    const code = "PF-" + (pan.slice(-4) || "0000");
    screen = (
      <>
        <Txt th={th} v="h1">{ready ? c.s4Title : passRows.filter((x) => x.tone === "bad").length > 1 ? c.s4TitleNotN.replace("{n}", String(passRows.filter((x) => x.tone === "bad").length)) : c.s4TitleNot}</Txt>
        <GoLivePass th={th} canvasColor={th.canvas} title={c.passLabel} sub={c.passSub} holder="Priya Lakshmi Reddy" shopLabel={c.shop} shop={brand} editLabel={c.edit}
          onEditShop={() => { setBrandDraft(brand); setBrandOpen(true); }} rows={passRows} code={code}
          footer={(
            <>
              <FeeRows th={th} rows={[[c.feeRow, inr(FEE)], [c.gstRow, inr(GST)], [c.totalRow, inr(FEE_TOTAL), true]]} />
              <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                <Icon name="shield" size={14} color={th.pos} />
                <Txt th={th} v="small" color={th.muted} style={{ flex: 1 }}>{c.promise}</Txt>
              </View>
              <Button th={th} kind="secondary" compact icon="folder" label={c.caseCta} onPress={() => setCaseOpen(true)} />
            </>
          )} />
      </>
    );
    footer = (
      <>
        <Button th={th} label={ready ? c.payCta(inr(FEE_TOTAL)) : c.payBlocked} icon={ready ? "lock" : undefined} disabled={!ready}
          onPress={async () => { haptic("success"); const req = { amount_paise: Math.round(FEE_TOTAL * 100), currency: "INR" as const, purpose: "kyc_processing_fee" as const, preflight_pass_id: "pf_" + Date.now().toString(36) }; const resp = await captureFee(req, "mock"); addLog({ kind: "mock", title: "Fee capture (mock adapter, real request/response shape)", json: { request: req, response: resp, gate: "called only after every stamp is green" } }); go(5); }} />
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
      <Sheet th={th} wide={wide} visible={draftOpen} onClose={() => setDraftOpen(false)} title={draftDoc?.title || c.draftTitle}>
        {draftBusy ? <Thinking th={th} label={c.drafting} /> : null}
        {draftDoc ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Tag th={th} kind={draftDoc.model ? "ai" : "rule"} />
              <Txt th={th} v="small" color={th.muted} style={{ flex: 1 }}>{c.draftNote}</Txt>
            </View>
            <View style={{ padding: 14, borderRadius: r.md, backgroundColor: th.sunken, borderWidth: 1, borderColor: th.line }}>
              <Text selectable style={{ fontFamily: font.body, fontSize: 14, lineHeight: 21, color: th.ink }}>{draftDoc.body}</Text>
            </View>
            {draftDoc.notes.length ? <View style={{ gap: 6 }}>{draftDoc.notes.map((n, i) => <IconRow key={i} th={th} icon="alert-circle" tone="warn"><Txt th={th} v="small">{n}</Txt></IconRow>)}</View> : null}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}><Button th={th} label={copied ? c.copied : Platform.OS === "web" ? c.copy : c.share} icon={copied ? "check" : Platform.OS === "web" ? "copy" : "share-2"} onPress={copyDraft} /></View>
              <View style={{ flex: 1 }}><Button th={th} kind="secondary" label={c.gotIt} onPress={() => setDraftOpen(false)} /></View>
            </View>
          </>
        ) : null}
      </Sheet>
      <Sheet th={th} wide={wide} visible={caseOpen} onClose={() => setCaseOpen(false)} title={c.caseTitle}>
        <CaseFile th={th} c={c} biz={biz} bizText={bizText} ask={ask} entity={entity} plan={docPlan} site={siteMode === "site" ? site : null} names={names?.ai || null} route={route} slotLabel={slotLabel} evidence={evidence} rows={passRows} brand={brand} pan={pan} />
      </Sheet>
      <Sheet th={th} wide={wide} visible={howOpen} onClose={() => setHowOpen(false)} title={c.howItWorks}>
        <HowItWorks th={th} step={step} log={log} srv={srv} mode={mode} setMode={setMode} live={live} />
      </Sheet>
    </>
  );

  if (wide) {
    return (
      <View style={{ flex: 1, backgroundColor: th.canvas }}>
        <StatusBar style={th.dark ? "light" : "dark"} />
        <ScrollView contentContainerStyle={{ alignItems: "center" }}>
          <View style={{ flexDirection: "row", gap: 56, alignItems: "center", maxWidth: 1040, width: "100%", justifyContent: "center", minHeight: Math.max(phoneH + 48, height), padding: 24 }}>
            <View style={{ width: 340, gap: 18 }}>
              <Txt th={th} v="h1" style={{ fontSize: 34, lineHeight: 40 }}>KYC Pre-flight</Txt>
              <Txt th={th} color={th.muted}>New sellers pay ₹199 for KYC and often learn only afterwards that their category, bank name, website or KYC route won't pass. Pre-flight runs those checks first, in about 90 seconds, inside the merchant app.</Txt>
              <Txt th={th} v="smallMed" color={th.brand}>Try it on the phone →  Scroll for the evidence ↓</Txt>
              <View style={{ gap: 10 }}>
                <Legend th={th} kind="ai" text="AI reads the business description and document photos" />
                <Legend th={th} kind="rule" text={`Rules decide: a ${TAX.rows}-row policy taxonomy, a scored name-match engine, fees and the pay gate`} />
                <Legend th={th} kind="mock" text="Registry, penny drop and payment are mocked" />
              </View>
              <Button th={th} kind="secondary" compact icon="cpu" label="See how it works" onPress={() => setHowOpen(true)} />
              <Txt th={th} v="tiny" color={th.faint}>Concept prototype for the Razorpay × ISB Build Challenge. Not a Razorpay product. The seller and documents are fictional.</Txt>
            </View>
            <View style={{ width: 390, height: phoneH, borderRadius: 40, borderWidth: 10, borderColor: th.dark ? "#2A3344" : "#101828", overflow: "hidden", backgroundColor: th.surface, shadowColor: "#0B1E3F", shadowOpacity: 0.18, shadowRadius: 40, shadowOffset: { width: 0, height: 20 } }}>
              {app}
            </View>
          </View>
          <Landing th={th} onHow={() => setHowOpen(true)} />
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

/** Facts × sources, each cell decided by rules. Mobile-first: one block per fact. */
function ConsistencyGrid({ th, c, ev }: { th: Theme; c: Copy; ev: EvidenceResult }) {
  const tone: Tone = ev.grid.verdict;
  const short: Record<string, string> = { instagram: "Instagram", catalog: "Catalog", invoice: "Invoice" };
  return (
    <Panel th={th}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt th={th} v="h3">{c.gridTitle}</Txt>
          <Txt th={th} v="small" color={th.muted}>{c.gridSub}</Txt>
        </View>
        <Status th={th} tone={tone} label={tone === "ok" ? c.gridOk : tone === "warn" ? c.gridWarn : c.gridBad} />
      </View>
      {ev.grid.rows.map((row) => (
        <View key={row.key} style={{ gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: th.line }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
            <Txt th={th} v="smallMed">{row.label}</Txt>
            <Txt th={th} v="tiny" color={th.muted} numberOfLines={1} style={{ flexShrink: 1, textAlign: "right" }}>{c.expected}: {row.expected}</Txt>
          </View>
          {Object.entries(row.cells).map(([sid, cell]) => {
            const t: Tone = cell.state === "none" ? "warn" : (cell.state as Tone);
            const [fg, bg] = toneColors(th, t);
            return (
              <View key={sid} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                <View style={{ width: 70, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 6, backgroundColor: cell.state === "none" ? th.sunken : bg }}>
                  <Text style={{ fontFamily: font.bodySemi, fontSize: 10.5, color: cell.state === "none" ? th.faint : fg }} numberOfLines={1}>{short[sid] || sid}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt th={th} v="small" color={cell.state === "none" ? th.faint : th.ink} numberOfLines={2}>{cell.value}</Txt>
                  {cell.state === "bad" || cell.state === "warn" ? <Txt th={th} v="tiny" color={fg}>{cell.why}</Txt> : null}
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </Panel>
  );
}

/** The packet a reviewer receives: everything already checked, with the open items first. */
function CaseFile({ th, c, biz, bizText, ask, entity, plan, site, names, route, slotLabel, evidence, rows, brand, pan }: {
  th: Theme; c: Copy; biz: BizResult | null; bizText: string; ask: Ask | null; entity: string | null; plan: DocPlan | null; site: SiteResult | null;
  names: NamesAI | null; route: string | null; slotLabel: string | null; evidence: EvidenceResult | null; rows: PassRow[]; brand: string; pan: string;
}) {
  const open = rows.filter((r) => r.tone !== "ok");
  const Sec = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={{ gap: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: th.line }}><Txt th={th} v="smallMed" color={th.muted}>{title.toUpperCase()}</Txt>{children}</View>
  );
  const Line = ({ k, v, tone }: { k: string; v: string; tone?: Tone }) => (
    <View style={{ flexDirection: "row", gap: 10 }}>
      <Txt th={th} v="small" color={th.muted} style={{ width: 110 }}>{k}</Txt>
      <Txt th={th} v="small" color={tone ? toneColors(th, tone)[0] : th.ink} style={{ flex: 1 }}>{v}</Txt>
    </View>
  );
  return (
    <>
      <Txt th={th} v="small" color={th.muted}>{c.caseSub}</Txt>
      <Notice th={th} tone={open.length ? "warn" : "ok"} title={open.length ? c.caseOpen(open.length) : c.caseReady}>
        {open.map((r) => <Txt key={r.label} th={th} v="small">{r.label}: {r.value}</Txt>)}
      </Notice>
      <Sec title="Merchant">
        <Line k="Legal name" v={names?.documents.find((d) => d.doc === "PAN")?.name || "—"} />
        <Line k="Shop" v={brand} />
        <Line k="PAN" v={`${pan.slice(0, 3)}•••${pan.slice(-2)}`} />
        <Line k="Entity" v={entity ? DOCPLAN.ENTITIES[entity].label : "—"} />
      </Sec>
      <Sec title="Category (rules decided)">
        <Line k="Seller said" v={bizText} />
        {ask?.question ? <Line k="Asked" v={`${ask.question} → ${ask.answer}`} /> : null}
        <Line k="Row" v={biz ? `${biz.policy.label} (${biz.policy.id})` : "—"} />
        <Line k="Status" v={biz ? biz.status : "—"} tone={biz ? (biz.status === "supported" ? "ok" : biz.status === "needs_review" ? "warn" : "bad") : undefined} />
        {biz?.candidates ? <Line k="Considered" v={biz.candidates.map((x) => x.label).slice(0, 5).join(" · ")} /> : null}
      </Sec>
      <Sec title="Documents">
        {plan ? plan.items.map((i) => <Line key={i.key} k={i.status === "missing" ? "Missing" : i.status === "have" ? "Has" : "Collected"} v={i.label} tone={i.status === "missing" ? "bad" : "ok"} />) : <Line k="—" v="Not answered" />}
      </Sec>
      <Sec title="Identity and names (engine)">
        {names ? names.comparisons.map((x) => <Line key={x.doc} k={`${x.doc} vs PAN`} v={`${x.verdict}${typeof x.score === "number" ? ` · score ${x.score.toFixed(2)}` : ""}`} tone={x.verdict === "match" ? "ok" : x.verdict === "likely_fail" ? "bad" : "warn"} />) : <Line k="—" v="Not run" />}
        <Line k="KYC route" v={route === "instant" ? "Registry (CKYC)" : route === "video" ? `Video KYC, booked ${slotLabel || "—"}` : "—"} />
      </Sec>
      <Sec title="Business proof (cross-checked)">
        {evidence ? (
          <>
            <Line k="Verdict" v={evidence.grid.verdict === "ok" ? "Sources agree" : evidence.grid.verdict === "warn" ? "Needs a look" : "Sources don't agree"} tone={evidence.grid.verdict} />
            {evidence.sources.map((s) => <Line key={s.id} k={s.label} v={[s.facts.business_name, (s.facts.products || []).slice(0, 4).join(", ")].filter(Boolean).join(" · ") || "unreadable"} />)}
            {evidence.grid.flags.map((f, i) => <Line key={i} k={`Flag · ${f.row}`} v={`${f.source}: ${f.why}`} tone={f.state === "bad" ? "bad" : "warn"} />)}
          </>
        ) : <Line k="—" v="Not run" />}
      </Sec>
      {site ? (
        <Sec title="Website">
          {Object.values(site.pages).map((p) => <Line key={p.label} k={p.found ? "Found" : "Missing"} v={p.label} tone={p.found ? "ok" : "bad"} />)}
        </Sec>
      ) : null}
    </>
  );
}

/** A question already answered: compact row, tap to change. */
function Answered({ th, label, value, onEdit, editLabel }: { th: Theme; label: string; value: string; onEdit: () => void; editLabel: string }) {
  return (
    <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel={`${label}: ${value}. ${editLabel}`}
      style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: r.md, backgroundColor: th.sunken, borderWidth: 1, borderColor: th.line }}>
      <Icon name="check" size={16} color={th.pos} />
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <Txt th={th} v="tiny" color={th.muted}>{label}</Txt>
        <Txt th={th} v="smallMed" numberOfLines={2}>{value}</Txt>
      </View>
      <Txt th={th} v="smallMed" color={th.brand}>{editLabel}</Txt>
    </Pressable>
  );
}

function ChoiceRow({ th, icon, label, sub, onPress }: { th: Theme; icon: any; label: string; sub?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: r.lg, borderWidth: 1.5, borderColor: pressed ? th.brand : th.line, backgroundColor: th.surface })}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: th.brandTint, alignItems: "center", justifyContent: "center" }}><Icon name={icon} size={18} color={th.brand} /></View>
      <View style={{ flex: 1, gap: 1 }}><Txt th={th} v="bodyMed">{label}</Txt>{sub ? <Txt th={th} v="small" color={th.muted}>{sub}</Txt> : null}</View>
      <Icon name="chevron-right" size={18} color={th.muted} />
    </Pressable>
  );
}

/** Mic: browser speech recognition on web (en-IN / hi-IN). Hidden where unsupported. */
function MicButton({ th, lang, onText }: { th: Theme; lang: Lang; onText: (t: string) => void }) {
  const [on, setOn] = useState(false);
  const stopRef = useRef<null | (() => void)>(null);
  if (!browserSpeechAvailable()) return null;
  const toggle = () => {
    if (on) { stopRef.current?.(); stopRef.current = null; setOn(false); return; }
    setOn(true);
    stopRef.current = startBrowserSpeech(lang, (t) => onText(t), () => { setOn(false); stopRef.current = null; });
  };
  return (
    <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={on ? "Stop listening" : "Speak instead of typing"}
      style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: on ? th.neg : th.brandTint, borderWidth: on ? 0 : 1, borderColor: th.line }}>
      <Icon name={on ? "square" : "mic"} size={18} color={on ? "#fff" : th.brand} />
    </Pressable>
  );
}

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
  1: [["rule", "Retrieve candidates", "A lexical retriever picks 8 of 340 sub-categories from Razorpay's published taxonomy; the model never sees the whole table."],
      ["ai", "Choose and explain", "Claude picks only among those candidates, extracts stated facts, and asks one question when the verdict depends on something unsaid."],
      ["rule", "Decision policy", "Thresholds and a blocked-term tripwire turn confidence into decided, ask, or reviewer decides. AI never decides eligibility."],
      ["rule", "Website readiness", "The site is fetched live and checked for the policy pages reviewers require: terms, privacy, refund, shipping, contact."]],
  2: [["mock", "KYC registry lookup", "Mocked here. In production this is the consented lookup onboarding already runs, moved before payment."],
      ["rule", "Route and preparation", "Instant route, or a video call with what to keep ready and a slot booked now, instead of a surprise after paying."]],
  3: [["ai", "Read the documents", "Claude vision reads the holder name on each photo: camera, gallery, or the built-in specimens."],
      ["rule", "Name-match engine", "Transliteration, honorifics, abbreviations, phonetic keys and word alignment give a score and the verdict. The model's reason is kept; its verdict is overridden if the engine disagrees."],
      ["rule", "Word-by-word view", "The same engine draws which words match, so the merchant sees exactly what's missing."]],
  4: [["rule", "Pay gate", "Any red stamp disables payment. Tapping a red stamp takes the merchant to the fix."]],
  5: [["mock", "Submission", "Simulated. No payment or application is created."]],
};

function HowItWorks({ th, step, log, srv, mode, setMode, live }: { th: Theme; step: number; log: LogItem[]; srv: Health | null | undefined; mode: "live" | "rec"; setMode: (m: "live" | "rec") => void; live: boolean }) {
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
      <Txt th={th} v="h3">Under the hood</Txt>
      <Txt th={th} v="small" color={th.muted}>Category: the description is matched against Razorpay's published onboarding taxonomy ({TAX.rows} sub-categories in {TAX.categories} categories; {TAX.not_supported} blocked, {TAX.needs_review} reviewed by a human). A lexical retriever picks the top 8 rows, the model chooses only among those, and a fixed decision policy turns confidence into decided / ask one question / reviewer decides. Names: the model reads the documents; a deterministic engine (honorifics, abbreviations, Devanagari and Telugu transliteration, Indian phonetic keys, word alignment) scores the match and sets the verdict. The model never decides eligibility.</Txt>
      <Scorecard th={th} live={live} />
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
