// POST /api/classify  { text, lang }  ->  { ai, model, ms }
const { classifyPrompt, callClaude, cors, readBody, POLICY } = require("./_lib/claude");

module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const started = Date.now();
  try {
    const { text, lang } = await readBody(req);
    if (!text || typeof text !== "string" || text.length > 2000) return res.status(400).json({ error: "text is required (max 2000 chars)" });
    const { json, model } = await callClaude([{ type: "text", text: classifyPrompt(text, lang === "hi" ? "hi" : "en") }], { maxTokens: 1024, schema: "classify" });
    // Never trust a policy_id the table doesn't contain.
    if (!POLICY.some((p) => p.id === json.policy_id)) json.policy_id = "other";
    return res.status(200).json({ ai: json, model, ms: Date.now() - started });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || "Server error" });
  }
};
