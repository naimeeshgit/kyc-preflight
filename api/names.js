// POST /api/names  { lang, docs: { pan, aadhaar, bank } }
// Each doc is either { sample: "pan" | "aadhaar" | "bank_short" | "bank_full" } or { base64, mediaType } from the camera / gallery.
const { namesPrompt, callClaude, cors, readBody } = require("./_lib/claude");
const SPECIMENS = require("./_lib/specimens");
const NM = require("../shared/namematch");

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_B64 = 1_800_000; // ~1.3 MB per image after base64

function toImageBlock(doc) {
  if (doc && doc.sample && SPECIMENS[doc.sample]) {
    return { type: "image", source: { type: "base64", media_type: "image/png", data: SPECIMENS[doc.sample] } };
  }
  if (doc && typeof doc.base64 === "string") {
    const mediaType = ALLOWED_TYPES.includes(doc.mediaType) ? doc.mediaType : "image/jpeg";
    const data = doc.base64.replace(/^data:[^;]+;base64,/, "");
    if (data.length > MAX_B64) throw Object.assign(new Error("Image too large. Try a smaller photo."), { status: 413 });
    return { type: "image", source: { type: "base64", media_type: mediaType, data } };
  }
  throw Object.assign(new Error("Each document needs a sample key or a photo"), { status: 400 });
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const started = Date.now();
  try {
    const { lang, docs } = await readBody(req);
    if (!docs) return res.status(400).json({ error: "docs is required" });
    const content = [
      { type: "text", text: "Image 1: PAN card" }, toImageBlock(docs.pan),
      { type: "text", text: "Image 2: Aadhaar card" }, toImageBlock(docs.aadhaar),
      { type: "text", text: "Image 3: bank proof" }, toImageBlock(docs.bank),
      { type: "text", text: namesPrompt(lang === "hi" ? "hi" : "en") },
    ];
    const { json, model } = await callClaude(content, { maxTokens: 1024, schema: "names" });
    if (!Array.isArray(json.comparisons)) return res.status(502).json({ error: "Unexpected model output" });
    // The model reads; the engine decides. Keep the model's plain-language reason and fix, but the
    // verdict and score come from the deterministic name-match engine, and disagreements are logged.
    const readName = (doc) => (json.documents || []).find((d) => d.doc === doc) || {};
    const legal = readName("PAN").name || "";
    const engine = {};
    const disagreements = [];
    for (const doc of ["Aadhaar", "Bank"]) {
      const d = readName(doc);
      const cmp = NM.compare(legal, d.name || "");
      const verdict = d.readable === false || !legal ? "unclear" : NM.verdictFor(doc, cmp);
      engine[doc] = { score: cmp.score, verdict, note: cmp.note, tokens: cmp.tokens };
      const c = json.comparisons.find((x) => x.doc === doc);
      if (c) { if (c.verdict !== verdict) disagreements.push({ doc, model: c.verdict, engine: verdict, score: cmp.score }); c.model_verdict = c.verdict; c.verdict = verdict; c.score = cmp.score; c.note = cmp.note || null; }
      else json.comparisons.push({ doc, verdict, reason: "", fix: null, score: cmp.score, note: cmp.note || null });
    }
    return res.status(200).json({ ai: json, engine, disagreements, thresholds: NM.THRESHOLDS, model, ms: Date.now() - started });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || "Server error" });
  }
};
