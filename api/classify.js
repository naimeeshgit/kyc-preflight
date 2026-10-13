// POST /api/classify  { text, lang, qa?: {question, answer} }
//   -> { ai, decision, candidates, model, ms }
//
// Pipeline: retrieve (BM25 over the 340-row taxonomy) -> LLM chooses among the candidates only
// -> deterministic decision policy. The model reads; the rules decide.
const { classifyPrompt, callClaude, cors, readBody, POLICY, SCHEMAS } = require("./_lib/claude");
const { retrieve } = require("./_lib/retrieve");

const K = 8;
// Decision thresholds (documented in the build log; tuned on eval/classify.json).
const T_DECIDE = 0.6;   // below this we do not state a verdict
const T_MIXED = 0.75;   // a strong alternative with a different status needs this much confidence to decide without a human
const STRONG_ALT = 0.6; // relative retrieval score that makes an alternative "strong"

// Defence in depth: words that belong to blocked domains. If any appear and the chosen row is
// "supported", a human decides. This never blocks anyone; it only stops a green stamp.
const TRIPWIRE = /\b(spirits?|whisk(e)?y|vodka|rum|gin|beer|wine|liquor|alcohol|sharab|daru|tobacco|cigarettes?|cigars?|vape|vapour|e-?cig\w*|hookah|molasses|gutka|beedi|bet(ting|s)?|satta|casino|rummy|poker|teen patti|lottery|lucky draw|jackpot|crypto\w*|bitcoin|usdt|nft|token|airsoft|rifle|pistol|gun|knives|knife|ammunition|escort|adult|sex\w*|intimate|dropship\w*|drop-?ship\w*|downline|mlm|pyramid|guaranteed returns?|double your money|prediction market|real[- ]money|cash prizes?)\b/i;

function decide(ai, candidates, qa, text = "") {
  const chosen = POLICY.find((p) => p.id === ai.policy_id) || null;
  // Mixed = a strong alternative (retrieval score ≥ STRONG_ALT, not the chosen row) carries a different status.
  const mixed = Boolean(chosen) && candidates.some((c) => c.id !== chosen.id && c.score >= STRONG_ALT && c.status !== chosen.status);
  const conf = Number(ai.confidence) || 0;
  const alreadyAsked = Boolean(qa && qa.question);

  // 1. The model asked a question and we have not asked before: ask.
  if (ai.question && !alreadyAsked && conf < T_DECIDE) return { state: "ask", question: ai.question };
  // 2. Nothing fits, or confidence too low after any question: a human reviewer decides.
  if (!chosen || ai.policy_id === "none_of_these" || conf < T_DECIDE) return { state: "reviewer", why: "low_confidence" };
  // 3. Candidates straddle supported/not: require stronger confidence, else reviewer.
  if (mixed && conf < T_MIXED) return { state: "reviewer", why: "mixed_candidates" };
  // 4. Blocked-domain words in the description with a "supported" row chosen: a human decides.
  if (chosen.status === "supported" && TRIPWIRE.test(text)) return { state: "reviewer", why: "blocked_terms" };
  // 5. Decided by the taxonomy row, never by the model.
  return { state: "decided", status: chosen.status, policy: chosen };
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const started = Date.now();
  try {
    const { text, lang, qa } = await readBody(req);
    if (!text || typeof text !== "string" || text.length > 2000) return res.status(400).json({ error: "text is required (max 2000 chars)" });
    // Descriptions in Devanagari, Telugu etc. never reach the Latin keyword index, so gloss them first.
    let gloss = null;
    if (/[\u0900-\u0DFF]/.test(text)) {
      const g = await callClaude([{ type: "text", text: `Gloss this business description in plain English (one or two sentences, keep product, service and channel words):\n"""${text.slice(0, 800)}"""` }], { maxTokens: 200, schema: "gloss" });
      gloss = g.json.english || null;
    }
    const query = [text, gloss, qa && qa.answer].filter(Boolean).join("\n");
    let { candidates, queryTerms } = retrieve(query, K);
    // Always keep the catch-all reachable so the model can say "none of these" honestly.
    if (!candidates.some((c) => c.id === "others.others")) candidates = [...candidates, POLICY.find((p) => p.id === "others.others")];
    const { json, model } = await callClaude(
      [{ type: "text", text: classifyPrompt(text, lang === "hi" ? "hi" : "en", candidates, qa) }],
      { maxTokens: 1024, tool: SCHEMAS.classify(candidates.map((c) => c.id)) },
    );
    if (json.policy_id !== "none_of_these" && !candidates.some((c) => c.id === json.policy_id)) json.policy_id = "none_of_these";
    const decision = decide(json, candidates, qa, query);
    return res.status(200).json({
      ai: json, decision, model, ms: Date.now() - started,
      candidates: candidates.map(({ id, label, categoryLabel, status, score, hits }) => ({ id, label, categoryLabel, status, score, hits })),
      queryTerms, gloss,
    });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || "Server error" });
  }
};
module.exports.decide = decide;
