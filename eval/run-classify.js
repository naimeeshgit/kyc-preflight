// Runs eval/classify.json against the classify endpoint and reports the metrics that matter:
//   status accuracy (what the seller is told), false-green rate (told "supported" when gold is not),
//   id accuracy, abstain rate, and per-kind breakdown.
// Usage: node eval/run-classify.js [https://kyc-preflight.vercel.app] [--concurrency 4]
const fs = require("fs");
const path = require("path");

const BASE = (process.argv[2] && process.argv[2].startsWith("http") ? process.argv[2] : "https://kyc-preflight.vercel.app").replace(/\/$/, "");
const CONC = Number((process.argv.find((a) => a.startsWith("--concurrency")) || "").split("=")[1] || 4);
const { cases } = JSON.parse(fs.readFileSync(path.join(__dirname, "classify.json"), "utf8"));

async function classify(text, lang, qa) {
  const r = await fetch(`${BASE}/api/classify`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, lang, qa }) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || r.status);
  return j;
}

async function runOne(c) {
  const lang = c.kind === "hi" ? "hi" : "en";
  const t0 = Date.now();
  const res = await classify(c.text, lang);
  const out = { text: c.text, kind: c.kind, gold: c.gold, ids: c.ids, askGold: Boolean(c.ask), ms: Date.now() - t0 };
  out.state = res.decision.state;
  out.asked = res.decision.state === "ask" ? res.decision.question : null;
  out.pred_id = res.ai.policy_id;
  out.conf = res.ai.confidence;
  out.retrieved = res.candidates.map((x) => x.id);
  // Told status: decided -> row status; reviewer or ask -> needs_review (seller is never told "supported").
  out.told = res.decision.state === "decided" ? res.decision.status : "needs_review";
  out.id_ok = c.ids.includes(out.pred_id);
  out.recall_ok = c.ids.some((id) => out.retrieved.includes(id));
  out.status_ok = out.told === c.gold;
  out.false_green = out.told === "supported" && c.gold !== "supported";
  out.false_red = out.told === "not_supported" && c.gold === "supported";
  return out;
}

(async () => {
  console.log(`Evaluating ${cases.length} cases against ${BASE} (concurrency ${CONC})`);
  const results = [];
  let i = 0;
  await Promise.all(Array.from({ length: CONC }, async () => {
    while (i < cases.length) {
      const c = cases[i++];
      try { results.push(await runOne(c)); process.stdout.write("."); }
      catch (e) { results.push({ text: c.text, kind: c.kind, gold: c.gold, error: String(e.message) }); process.stdout.write("x"); }
    }
  }));
  console.log();
  const ok = results.filter((r) => !r.error);
  const pct = (n, d) => (d ? `${(100 * n / d).toFixed(1)}%` : "n/a");
  const summary = {
    base: BASE, n: cases.length, errors: results.length - ok.length,
    status_accuracy: pct(ok.filter((r) => r.status_ok).length, ok.length),
    false_green: `${ok.filter((r) => r.false_green).length} / ${ok.filter((r) => r.gold !== "supported").length} non-supported cases told "supported"`,
    false_red: `${ok.filter((r) => r.false_red).length} / ${ok.filter((r) => r.gold === "supported").length} supported cases told "not supported"`,
    id_accuracy: pct(ok.filter((r) => r.id_ok).length, ok.length),
    retrieval_recall_at_8: pct(ok.filter((r) => r.recall_ok).length, ok.length),
    abstain_rate: pct(ok.filter((r) => r.state !== "decided").length, ok.length),
    asked_when_should: `${ok.filter((r) => r.askGold && r.state === "ask").length} / ${ok.filter((r) => r.askGold).length}`,
    asked_when_not_needed: `${ok.filter((r) => !r.askGold && r.state === "ask").length} / ${ok.filter((r) => !r.askGold).length}`,
    median_ms: ok.map((r) => r.ms).sort((a, b) => a - b)[Math.floor(ok.length / 2)],
    by_kind: {},
  };
  for (const k of ["en", "hi", "te", "ambiguous", "adversarial"]) {
    const g = ok.filter((r) => r.kind === k);
    summary.by_kind[k] = { n: g.length, status_accuracy: pct(g.filter((r) => r.status_ok).length, g.length), false_green: g.filter((r) => r.false_green).length, abstained: g.filter((r) => r.state !== "decided").length };
  }
  console.log(JSON.stringify(summary, null, 2));
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  fs.mkdirSync(path.join(__dirname, "results"), { recursive: true });
  fs.writeFileSync(path.join(__dirname, "results", `classify-${stamp}.json`), JSON.stringify({ summary, results }, null, 1));
  fs.writeFileSync(path.join(__dirname, "results", "classify-latest.json"), JSON.stringify({ summary, results }, null, 1));
  console.log("\nMisses:");
  for (const r of ok.filter((r) => !r.status_ok)) console.log(`  [${r.kind}] told ${r.told} (gold ${r.gold}) via ${r.pred_id} @${r.conf} state=${r.state}${r.asked ? ` Q="${r.asked}"` : ""}\n     ${r.text}`);
})();
