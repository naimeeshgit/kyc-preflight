// Lexical retrieval over the policy taxonomy (BM25). The model never sees all 340 rows;
// it chooses among the top-k candidates the retriever returns, so a wrong answer has to be
// one of the plausible ones, and the UI can show what was considered.
const TAXONOMY = require("../../shared/taxonomy.json");

// Hinglish-aware tokeniser: lower-case, strip punctuation, split, drop stop words, light stemming.
const STOP = new Set("i am a an the and or of to in on for my me we our is are se ka ki ke ko ki hai hain hu hun hoon ho mai main mein me bhi aur ya par pe home ghar instagram insta whatsapp facebook website page karta karti karte krta krti krte kar kr chalata chalati chalate chalta chalti sell bechta bechti bechte bechna sale selling business shop dukan dukaan online through via from with by at this that it".split(" "));
const STEM = (w) => w.replace(/(ies)$/, "y").replace(/(es|s)$/, "").replace(/(ing)$/, "");
function tokens(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9ऀ-ॿఀ-౿\s]/g, " ").split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w)).map(STEM);
}

// Build the index once per process.
const DOCS = TAXONOMY.map((row) => {
  const text = `${row.label} ${row.label} ${row.categoryLabel} ${row.keywords || ""}`;
  const t = tokens(text);
  const tf = new Map();
  for (const w of t) tf.set(w, (tf.get(w) || 0) + 1);
  return { id: row.id, len: t.length, tf };
});
const N = DOCS.length;
const AVG = DOCS.reduce((s, d) => s + d.len, 0) / N;
const DF = new Map();
for (const d of DOCS) for (const w of d.tf.keys()) DF.set(w, (DF.get(w) || 0) + 1);
const K1 = 1.4, B = 0.6;
const idf = (w) => Math.log(1 + (N - (DF.get(w) || 0) + 0.5) / ((DF.get(w) || 0) + 0.5));

/** Return the top-k taxonomy rows for a free-text description, with scores and the matched terms. */
function retrieve(text, k = 8) {
  const q = Array.from(new Set(tokens(text)));
  const scored = DOCS.map((d) => {
    let s = 0; const hits = [];
    for (const w of q) {
      const f = d.tf.get(w); if (!f) continue;
      s += idf(w) * (f * (K1 + 1)) / (f + K1 * (1 - B + B * d.len / AVG));
      hits.push(w);
    }
    return { id: d.id, score: s, hits };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, k);
  const byId = Object.fromEntries(TAXONOMY.map((r) => [r.id, r]));
  const top = scored[0]?.score || 0;
  return {
    candidates: scored.map((x) => ({ ...byId[x.id], score: Math.round((x.score / (top || 1)) * 100) / 100, hits: x.hits })),
    queryTerms: q,
  };
}

module.exports = { retrieve, tokens, TAXONOMY };
