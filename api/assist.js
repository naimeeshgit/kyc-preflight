// POST /api/assist { lang, messages:[{role:"user"|"assistant", content}], case:{...} }
//   -> { message, draft:{title, body, notes}|null, suggestions:string[], guard?:string, model, ms }
//
// The in-app assistant. It answers from THIS seller's case (category row, document plan, missing pages,
// name verdicts, evidence flags) and drafts what she needs without leaving the app.
// Same guardrails as the drafter, plus two more: it never changes or predicts a verdict beyond what
// the rules already said, and it never helps reword a blocked business so it passes.
const { callClaude, cors, readBody } = require("./_lib/claude");

const TOOL = {
  name: "reply",
  description: "Reply to the seller.",
  input_schema: {
    type: "object",
    properties: {
      message: { type: "string", description: "Short, plain answer. 2-6 sentences or a short numbered list. No markdown symbols except numbered lines." },
      draft: {
        type: ["object", "null"],
        description: "Only when the seller asked for a document or text she will copy and use. Otherwise null.",
        properties: {
          title: { type: "string" },
          body: { type: "string", description: "Plain text, short headings as plain lines, [brackets] for anything unknown." },
          notes: { type: "array", items: { type: "string" }, description: "Up to 3 things she must fill or check." },
        },
        required: ["title", "body", "notes"],
      },
      suggestions: { type: "array", items: { type: "string" }, description: "2-3 short next questions she might tap, in her language, specific to her case." },
    },
    required: ["message", "draft", "suggestions"],
  },
};

// Deterministic guard: a blocked category plus a request to reword, hide or get around it gets a fixed answer.
const WORKAROUND = /(reword|re-word|rephrase|describe (it|this|my business) (differently|as)|call it something|hide|bypass|get around|work ?around|so (that )?it (passes|gets approved)|trick|without (them|razorpay) knowing|kaise chhupa|chupa|badal ke likh)/i;

const clip = (v, n = 600) => String(v ?? "").slice(0, n);

function caseBlock(c = {}) {
  const lines = [];
  lines.push(`Seller (legal name as on PAN): ${clip(c.legalName, 80) || "[unknown]"}; shop name: ${clip(c.shopName, 80) || "[unknown]"}`);
  lines.push(`What she said she sells: """${clip(c.description, 600)}"""`);
  if (c.category) lines.push(`Category row: ${clip(c.category.label, 120)} (${clip(c.category.id, 80)}); status told to seller: ${clip(c.category.status, 30)}${c.category.reason ? `; reason on the row: ${clip(c.category.reason, 200)}` : ""}${c.category.extraDocs?.length ? `; category needs: ${c.category.extraDocs.map((d) => clip(d, 60)).join(", ")}` : ""}`);
  if (c.entity) lines.push(`Business set-up: ${clip(c.entity, 60)}; registrations she has: ${(c.have || []).map((x) => clip(x, 40)).join(", ") || "none"}`);
  if (c.plan?.length) lines.push(`Document plan: ${c.plan.map((p) => `${clip(p.label, 80)} = ${clip(p.status, 12)}`).join("; ")}`);
  if (c.channel) lines.push(`Takes payments: ${c.channel === "site" ? `on a website ${clip(c.siteUrl, 120)}` : "via Instagram/WhatsApp/in person (Payment Links, QR)"}`);
  if (c.siteMissing?.length) lines.push(`Website pages missing: ${c.siteMissing.map((x) => clip(x, 40)).join(", ")}`);
  if (c.route) lines.push(`KYC route: ${c.route === "video" ? `video KYC call${c.slot ? `, booked ${clip(c.slot, 40)}` : ", not booked yet"}` : "instant (in the KYC registry)"}`);
  if (c.names?.length) lines.push(`Names: ${c.names.map((n) => `${clip(n.doc, 20)} "${clip(n.name, 80)}" vs PAN → ${clip(n.verdict, 20)}`).join("; ")}`);
  if (c.evidence?.length) lines.push(`Business-proof flags: ${c.evidence.map((f) => `${clip(f.row, 30)} / ${clip(f.source, 40)}: ${clip(f.why, 140)}`).join("; ")}`);
  if (c.pass?.length) lines.push(`Go-live pass: ${c.pass.map((p) => `${clip(p.label, 30)} = ${clip(p.tone, 6)}`).join("; ")}`);
  return lines.join("\n");
}

function prompt(lang, messages, c) {
  const convo = messages.slice(-10).map((m) => `${m.role === "assistant" ? "Assistant" : "Seller"}: ${clip(m.content, 1200)}`).join("\n");
  return `You are the onboarding assistant inside a payment gateway's merchant app in India. A small first-time seller is setting up her account. Your job: answer her questions and draft what she needs so she never has to leave the app or wait for an email.

HER CASE (from the app's checks; rules decided these, you did not):
${caseBlock(c)}

CONVERSATION SO FAR:
${convo}

Rules:
- Answer from her case. Be specific to her business, set-up and what is still missing. If something isn't in the case, say what you'd need.
- Verdicts come from the app's rules. Never say she will be approved, never change or second-guess a status, never promise timelines from the gateway. You can explain what a requirement is and how to meet it.
- Never help reword, hide or misdescribe a blocked or restricted business. If her category is not supported, say so plainly and help only with honest alternatives (e.g. selling only the supported part of her range).
- Never explain risk or fraud signals; explain requirements only.
- Drafts (policy pages, letters, product or business descriptions, reviewer answers, a declaration of business): put them in "draft". Labelled as a draft, plain text, [brackets] for anything unknown (address, GSTIN, account number, dates). Never invent registration or licence numbers, legal citations or facts she hasn't given.
- How-to answers (Udyam, FSSAI, bank name change, video KYC prep): short numbered steps with where to go and roughly how long it takes. Government portals: udyamregistration.gov.in, foscos.fssai.gov.in, gst.gov.in. No legal or tax advice beyond that; suggest a CA when it truly depends.
- Language: ${lang === "hi" ? "reply in simple Hinglish (Hindi in Latin script). Drafts meant for reviewers or customers stay in simple English." : "simple English."}
- Keep the message short; the draft carries the length.
- suggestions: 2-3 next questions she might tap, specific to what's still open in her case.

Answer by calling reply.`;
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const started = Date.now();
  try {
    const { lang, messages = [], case: c = {} } = await readBody(req);
    const msgs = (Array.isArray(messages) ? messages : []).filter((m) => m && typeof m.content === "string" && m.content.trim());
    const last = msgs[msgs.length - 1];
    if (!last || last.role !== "user") return res.status(400).json({ error: "the last message must be from the seller" });
    if (last.content.length > 2000) return res.status(400).json({ error: "message too long" });

    if (c.category && c.category.status === "not_supported" && WORKAROUND.test(last.content)) {
      const hi = lang === "hi";
      return res.status(200).json({
        message: hi
          ? `Yeh category (${clip(c.category.label, 80)}) accept nahi hoti, aur description badalne se woh badalti nahi. Agar aapki range mein koi aur cheez bhi hai jo allowed hai, toh hum sirf usi ke liye application bana sakte hain.`
          : `This category (${clip(c.category.label, 80)}) isn't accepted, and describing it differently won't change that. If part of your range is something else that is allowed, I can help you apply for only that part.`,
        draft: null,
        suggestions: hi ? ["Meri range ka kaunsa hissa allowed hai?", "Fee kab charge hoti hai?"] : ["Which part of my range is allowed?", "When is the fee charged?"],
        guard: "workaround_blocked", model: "rule", ms: Date.now() - started,
      });
    }

    const { json, model } = await callClaude([{ type: "text", text: prompt(lang === "hi" ? "hi" : "en", msgs, c) }], { maxTokens: 2000, tool: TOOL });
    const draft = json.draft && json.draft.body ? { title: clip(json.draft.title, 120) || "Draft", body: String(json.draft.body), notes: (json.draft.notes || []).slice(0, 3) } : null;
    return res.status(200).json({ message: String(json.message || ""), draft, suggestions: (json.suggestions || []).slice(0, 3), model, ms: Date.now() - started });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || "Server error" });
  }
};
