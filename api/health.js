// GET /api/health -> tells the app whether live AI is configured, without exposing the key.
const { MODEL } = require("./_lib/claude");
module.exports = (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json({ ok: true, liveAI: Boolean(process.env.ANTHROPIC_API_KEY), model: MODEL });
};
