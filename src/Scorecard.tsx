import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { font, r, Theme } from "./theme";
import { Button, Txt } from "./ui";
import { classify } from "./api";
import { scoreNames } from "./names";
import { TAXONOMY_STATS } from "./data";
import NAMES_EVAL from "../eval/names.json";
import CLASSIFY_EVAL from "../eval/classify.json";

type NameCase = { pan: string; other: string; expect: "match" | "unclear" | "likely_fail"; kind: string };
type ClassCase = { text: string; gold: "supported" | "needs_review" | "not_supported"; ids: string[]; kind: string; ask?: boolean };

const bankVerdict = (pan: string, other: string) => {
  if (!pan) return "unclear"; if (!other) return "likely_fail";
  const v = scoreNames(pan, other).verdict;
  return v === "match" ? "match" : v === "review" ? "unclear" : "likely_fail";
};

/** Runs the labelled evaluation sets: names locally (same engine as the server), categories live against the API. */
export function Scorecard({ th, live }: { th: Theme; live: boolean }) {
  const names = useMemo(() => {
    const cases = (NAMES_EVAL as any).cases as NameCase[];
    const res = cases.map((c) => ({ ...c, got: bankVerdict(c.pan, c.other) }));
    const nonMatch = res.filter((x) => x.expect !== "match");
    return {
      n: res.length, ok: res.filter((x) => x.got === x.expect).length,
      falseMatch: nonMatch.filter((x) => x.got === "match").length, nonMatch: nonMatch.length,
      falseFail: res.filter((x) => x.expect === "match" && x.got === "likely_fail").length, trueMatch: res.filter((x) => x.expect === "match").length,
      misses: res.filter((x) => x.got !== x.expect),
    };
  }, []);

  const cases = (CLASSIFY_EVAL as any).cases as ClassCase[];
  const [done, setDone] = useState(0);
  const [running, setRunning] = useState(false);
  const [out, setOut] = useState<any[]>([]);
  const [showMiss, setShowMiss] = useState(false);

  async function run() {
    setRunning(true); setDone(0); setOut([]);
    const results: any[] = [];
    let i = 0;
    const worker = async () => {
      while (i < cases.length) {
        const c = cases[i++];
        try {
          const res = await classify(c.text, c.kind === "hi" ? "hi" : "en");
          const told = res.decision.state === "decided" ? res.decision.status : "needs_review";
          results.push({ ...c, told, state: res.decision.state, pred: res.ai.policy_id, conf: res.ai.confidence, q: res.decision.state === "ask" ? res.decision.question : null, retrieved: res.candidates.map((x) => x.id) });
        } catch (e: any) { results.push({ ...c, error: e?.message || "error" }); }
        setDone(results.length); setOut([...results]);
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    setRunning(false);
  }

  const ok = out.filter((x) => !x.error);
  const pct = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1)}%` : "—");
  const nonSup = ok.filter((x) => x.gold !== "supported");
  const sup = ok.filter((x) => x.gold === "supported");
  const stat = (label: string, value: string, sub?: string) => (
    <View key={label} style={{ flex: 1, minWidth: 120, gap: 2, padding: 12, borderRadius: r.md, backgroundColor: th.sunken }}>
      <Txt th={th} v="tiny" color={th.muted}>{label}</Txt>
      <Text style={{ fontFamily: font.display, fontSize: 22, color: th.ink }}>{value}</Text>
      {sub ? <Txt th={th} v="tiny" color={th.muted}>{sub}</Txt> : null}
    </View>
  );

  return (
    <>
      <Txt th={th} v="h3">Scorecard</Txt>
      <Txt th={th} v="small" color={th.muted}>Two labelled test sets ship with the app. The name set runs here in the browser with the same engine the server uses. The category set calls the live model, so you can measure it yourself. Both sets were written by me, so treat these as regression numbers, not a field measurement.</Txt>

      <Txt th={th} v="smallMed">Name match · {names.n} labelled pairs</Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {stat("Verdict accuracy", pct(names.ok, names.n))}
        {stat("False pass", `${names.falseMatch} / ${names.nonMatch}`, "non-matches passed")}
        {stat("False fail", `${names.falseFail} / ${names.trueMatch}`, "true matches failed")}
      </View>
      {names.misses.length ? <Txt th={th} v="tiny" color={th.muted}>Misses: {names.misses.map((m) => `"${m.pan}" vs "${m.other}" → ${m.got}`).join("; ")}</Txt> : null}

      <Txt th={th} v="smallMed">Category · {cases.length} labelled descriptions across {TAXONOMY_STATS.rows} sub-categories</Txt>
      <Txt th={th} v="tiny" color={th.muted}>English, Hinglish, Telugu, deliberately vague, and adversarial re-descriptions of blocked businesses. Scored on what the seller is told, never on the model's raw label.</Txt>
      {out.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {stat("Told the right status", pct(ok.filter((x) => x.told === x.gold).length, ok.length), `${ok.length} of ${cases.length} run`)}
          {stat("False green", `${nonSup.filter((x) => x.told === "supported").length} / ${nonSup.length}`, "blocked or reviewed told 'supported'")}
          {stat("False red", `${sup.filter((x) => x.told === "not_supported").length} / ${sup.length}`, "supported told 'not supported'")}
          {stat("Asked or deferred", pct(ok.filter((x) => x.state !== "decided").length, ok.length), "instead of guessing")}
          {stat("Retrieval recall@8", pct(ok.filter((x) => x.ids.some((id: string) => x.retrieved.includes(id))).length, ok.length))}
          {stat("Adversarial caught", `${ok.filter((x) => x.kind === "adversarial" && x.told !== "supported").length} / ${ok.filter((x) => x.kind === "adversarial").length}`, "re-worded blocked businesses")}
        </View>
      ) : null}
      {running ? (
        <View style={{ height: 6, borderRadius: 3, backgroundColor: th.sunken, overflow: "hidden" }}>
          <View style={{ width: `${(100 * done) / cases.length}%`, height: 6, backgroundColor: th.brand }} />
        </View>
      ) : null}
      <Button th={th} kind={out.length ? "secondary" : "primary"} compact icon="play" label={running ? `Running ${done} / ${cases.length}` : out.length ? "Run again" : "Run the category eval live"} onPress={run} busy={running} disabled={!live || running} />
      {!live ? <Txt th={th} v="tiny" color={th.muted}>Needs live AI.</Txt> : null}
      {ok.length && ok.some((x) => x.told !== x.gold) ? (
        <Pressable onPress={() => setShowMiss((v) => !v)} accessibilityRole="button"><Txt th={th} v="smallMed" color={th.brand}>{showMiss ? "Hide misses" : `Show ${ok.filter((x) => x.told !== x.gold).length} misses`}</Txt></Pressable>
      ) : null}
      {showMiss ? ok.filter((x) => x.told !== x.gold).map((m, i) => (
        <View key={i} style={{ gap: 2, padding: 10, borderRadius: r.md, borderWidth: 1, borderColor: th.line }}>
          <Txt th={th} v="small">{m.text}</Txt>
          <Txt th={th} v="tiny" color={th.muted}>told {m.told} · gold {m.gold} · {m.pred} @ {m.conf}{m.q ? ` · asked: ${m.q}` : ""}</Txt>
        </View>
      )) : null}
    </>
  );
}
