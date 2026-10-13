// POST /api/evidence { lang, declared:{legalName, shopName, policyId, description}, items:[{id, kind, sample?|base64,mediaType}] }
//   -> { sources:[{id,label,facts}], grid:{rows,flags,verdict}, model, ms }
//
// The model reads each piece of business evidence (Instagram profile, WhatsApp catalog, invoice,
// receipt) and extracts facts. The consistency engine decides. The model never says "legit" or not.
const { callClaude, cors, readBody, POLICY } = require("./_lib/claude");
const { retrieve } = require("./_lib/retrieve");
const SAMPLES = require("./_lib/evidence-samples");
const { crossCheck } = require("../shared/consistency");

const KINDS = { instagram: "Instagram or social profile", catalog: "WhatsApp or shop catalog", invoice: "Invoice or receipt", website: "Website page", other: "Other evidence" };
const TOOL = {
  name: "report_evidence",
  description: "Report the facts visible in each evidence image, in order.",
  input_schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            readable: { type: "boolean" },
            business_name: { type: ["string", "null"], description: "Business/brand name exactly as shown, or null." },
            person_name: { type: ["string", "null"], description: "Owner/proprietor/person name as shown, or null." },
            products: { type: "array", items: { type: "string" }, description: "Every product or service name visible, verbatim, up to 10." },
            price_mode: { type: "string", enum: ["fixed", "on_request", "variable", "unknown"] },
            contact: { type: ["string", "null"], description: "Phone, email or handle shown, or null." },
            notes: { type: ["string", "null"] },
          },
          required: ["readable", "business_name", "person_name", "products", "price_mode", "contact"],
        },
      },
    },
    required: ["items"],
  },
};

function block(item) {
  if (item.sample && SAMPLES[item.sample]) return { type: "image", source: { type: "base64", media_type: "image/png", data: SAMPLES[item.sample] } };
  if (item.base64) {
    const data = String(item.base64).replace(/^data:[^;]+;base64,/, "");
    if (data.length > 1_800_000) throw Object.assign(new Error("Image too large"), { status: 413 });
    return { type: "image", source: { type: "base64", media_type: ["image/png", "image/jpeg", "image/webp"].includes(item.mediaType) ? item.mediaType : "image/jpeg", data } };
  }
  throw Object.assign(new Error("Each item needs a sample or a photo"), { status: 400 });
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const started = Date.now();
  try {
    const { declared = {}, items = [] } = await readBody(req);
    if (!items.length || items.length > 4) return res.status(400).json({ error: "1 to 4 items" });
    const content = [];
    items.forEach((it, i) => { content.push({ type: "text", text: `Image ${i + 1}: ${KINDS[it.kind] || KINDS.other}` }); content.push(block(it)); });
    content.push({ type: "text", text: `You read business evidence that a small Indian seller uploads during payment-gateway onboarding. For EACH image, in order, report only what is visibly written: business name, person/owner name, every product or service listed (verbatim, keep words like "vape" or "refill" exactly), whether prices are fixed and visible, on request, or variable/pay-what-you-want, and any contact shown. Do not judge legitimacy. Do not guess hidden text. If an image is not business evidence, set readable false. Answer by calling report_evidence with exactly ${items.length} items.` });
    const { json, model } = await callClaude(content, { maxTokens: 1500, tool: TOOL });
    const sources = items.map((it, i) => ({ id: it.id, label: KINDS[it.kind] || KINDS.other, kind: it.kind, facts: (json.items || [])[i] || { readable: false } }));

    const declaredRow = POLICY.find((p) => p.id === declared.policyId);
    const productCheck = (text) => {
      const { candidates } = retrieve(text, 5);
      const top = candidates[0];
      if (!top || !declaredRow) return { sameFamily: true, topLabel: "", topStatus: "" };
      const same = candidates.slice(0, 3).some((c) => c.id === declaredRow.id || c.category === declaredRow.category);
      return { sameFamily: same, topLabel: top.label, topStatus: top.status };
    };
    const grid = crossCheck({ legalName: declared.legalName, shopName: declared.shopName, declaredLabel: declaredRow ? declaredRow.label : declared.label || "your category", sources, productCheck });
    return res.status(200).json({ sources, grid, model, ms: Date.now() - started });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || "Server error" });
  }
};
