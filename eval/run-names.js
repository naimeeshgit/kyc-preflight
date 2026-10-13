// Runs eval/names.json through the shared name-match engine (no network). Usage: node eval/run-names.js
const fs = require("fs");
const path = require("path");
const NM = require("../shared/namematch");

const { cases } = JSON.parse(fs.readFileSync(path.join(__dirname, "names.json"), "utf8"));
const results = cases.map((c) => {
  const cmp = NM.compare(c.pan, c.other);
  const got = !c.pan || !c.other ? (c.pan ? "likely_fail" : "unclear") : NM.verdictFor("Bank", cmp);
  return { ...c, got, score: cmp.score, engine_note: cmp.note, ok: got === c.expect, false_match: got === "match" && c.expect !== "match", false_fail: got === "likely_fail" && c.expect === "match" };
});
const pct = (n, d) => `${(100 * n / d).toFixed(1)}%`;
const summary = {
  n: cases.length,
  verdict_accuracy: pct(results.filter((r) => r.ok).length, results.length),
  false_match: `${results.filter((r) => r.false_match).length} / ${results.filter((r) => r.expect !== "match").length} non-matches passed as match`,
  false_fail: `${results.filter((r) => r.false_fail).length} / ${results.filter((r) => r.expect === "match").length} true matches failed`,
  by_kind: {},
};
for (const k of Array.from(new Set(cases.map((c) => c.kind)))) {
  const g = results.filter((r) => r.kind === k);
  summary.by_kind[k] = `${g.filter((r) => r.ok).length}/${g.length}`;
}
console.log(JSON.stringify(summary, null, 2));
fs.mkdirSync(path.join(__dirname, "results"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "results", "names-latest.json"), JSON.stringify({ summary, results }, null, 1));
console.log("\nMisses:");
for (const r of results.filter((r) => !r.ok)) console.log(`  [${r.kind}] got ${r.got} (expect ${r.expect}) score ${r.score}${r.engine_note ? " " + r.engine_note : ""}: "${r.pan}" vs "${r.other}"`);
