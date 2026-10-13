// POST /api/transcribe { audioBase64, mimeType, lang } -> { text, engine }
// Server adapter for Gnani ASR. The key lives only in Vercel env (GNANI_API_KEY). The endpoint and
// field names below follow Gnani's REST ASR shape and are confirmed against the account's docs before
// the key is added; until then the route answers 503 and the app uses browser speech.
const { cors, readBody } = require("./_lib/claude");

const GNANI_URL = process.env.GNANI_ASR_URL || "https://asr.gnani.ai/api/v1/transcribe";

module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const key = process.env.GNANI_API_KEY;
  if (!key) return res.status(503).json({ error: "Gnani ASR is not configured; using browser speech." });
  try {
    const { audioBase64, mimeType, lang } = await readBody(req);
    if (!audioBase64) return res.status(400).json({ error: "audioBase64 is required" });
    if (audioBase64.length > 6_000_000) return res.status(413).json({ error: "Audio too long" });
    const r = await fetch(GNANI_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ audio: audioBase64, encoding: mimeType || "audio/webm", language: lang || "hi-IN" }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(502).json({ error: `Gnani ${r.status}: ${JSON.stringify(j).slice(0, 200)}` });
    const text = j.transcript || j.text || (j.results && j.results[0] && j.results[0].transcript) || "";
    return res.status(200).json({ text, engine: "gnani" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
