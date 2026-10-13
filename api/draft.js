// POST /api/draft { kind: "policy" | "clarification", lang, business:{description, category, label, status, reason}, page?, site? }
//   -> { title, body, notes }
//
// The second role of the model: it WRITES. Different guardrail from reading: every draft is labelled a
// draft, uses [brackets] for anything the seller must fill, invents no registrations or numbers, and
// the seller reviews it before it goes anywhere. Rules still decide eligibility; drafts never change a verdict.
const { callClaude, cors, readBody } = require("./_lib/claude");

const TOOL = {
  name: "report_draft",
  description: "Return the drafted text.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      body: { type: "string", description: "Plain text with short headings. No markdown symbols." },
      notes: { type: "array", items: { type: "string" }, description: "Up to 3 things the seller must check or fill before using it." },
    },
    required: ["title", "body", "notes"],
  },
};

const PAGE_GUIDE = {
  terms: "Terms and conditions for a small Indian seller: who the seller is, what is sold, prices in INR, order acceptance, payment (via a payment gateway), delivery/service timelines, returns reference, limitation, governing law (India), contact. 350–500 words.",
  privacy: "Privacy policy for a small Indian seller taking online payments: what data is collected (name, phone, address, order details), that card/UPI details are handled by the payment gateway and never stored by the seller, how data is used, sharing with courier/payment partners, retention, how to ask for deletion, contact. 300–450 words.",
  refund: "Refund and cancellation policy: when a customer can cancel, when refunds are given, timelines (e.g. 5–7 working days to the original payment method), conditions for returns if physical goods, non-refundable cases, how to request. Must be fair and specific, no 'no refunds under any circumstances'. 250–400 words.",
  shipping: "Shipping and delivery policy for physical goods in India: dispatch time, delivery time by region, courier partners (placeholder), charges, tracking, what happens if damaged or lost, service area. 200–350 words.",
  contact: "Contact details page: business name, owner name placeholder, email, phone, address placeholder, hours, expected response time. Short.",
};

function policyPrompt(lang, business, page, site) {
  return `You write plain-language policy pages for small Indian sellers so their website passes a payment gateway's activation review.

Seller's own description of the business: """${String(business.description || "").slice(0, 800)}"""
Category: ${business.label || "unknown"}${business.category ? ` (${business.category})` : ""}
Website: ${site || "[website]"}

Write the "${page}" page. Guide: ${PAGE_GUIDE[page] || "A clear policy page."}

Rules:
- Tailor it to what this seller actually sells and how they deliver (physical goods vs service vs digital).
- Use [square brackets] for anything you cannot know: legal name, address, email, phone, GSTIN, courier names, exact days.
- Do not invent registrations, licence numbers, or legal citations. Mention Indian law only generically ("governed by the laws of India").
- Reviewers reject placeholder or one-line policies, so be specific and complete, but no filler.
- Write in ${lang === "hi" ? "simple English (policy pages are read by reviewers in English), with a one-line Hinglish summary at the top" : "simple English"}.
- Headings as plain lines, no markdown symbols.
- notes: up to 3 things the seller must fill or confirm before publishing.

Answer by calling report_draft.`;
}

function clarificationPrompt(lang, business) {
  return `A small Indian seller's business category is "${business.label}" which a payment gateway marks for manual review${business.reason ? ` because: ${business.reason}` : ""}. Reviewers typically ask a few clarifying questions by email, and each round costs about three days.

Seller's own description: """${String(business.description || "").slice(0, 800)}"""

Draft the clarification the seller can attach to the application now, so the first review round is also the last. Structure:
1. Three to five questions a reviewer would ask for THIS category (what exactly is sold, how it is delivered, who the customers are, pricing/advance-payment terms, refund terms, any licence or registration the category needs).
2. Under each, a suggested answer drawn only from what the seller said; where they have not said it, put a [bracketed] prompt for them to fill. Never invent facts.
3. A short list of documents to attach for this category, if any.

Rules: ${lang === "hi" ? "Hinglish (Hindi in Latin script) for the questions' plain explanations, English for the suggested answers (reviewers read English)" : "simple English"}. No legal advice; no promises about approval; nothing that coaches the seller to misdescribe the business. Headings as plain lines, no markdown symbols. notes: up to 3 things they must fill before sending.

Answer by calling report_draft.`;
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const started = Date.now();
  try {
    const { kind, lang, business = {}, page, site } = await readBody(req);
    let prompt;
    if (kind === "policy") { if (!PAGE_GUIDE[page]) return res.status(400).json({ error: "unknown page" }); prompt = policyPrompt(lang, business, page, site); }
    else if (kind === "clarification") prompt = clarificationPrompt(lang, business);
    else return res.status(400).json({ error: "kind must be policy or clarification" });
    const { json, model } = await callClaude([{ type: "text", text: prompt }], { maxTokens: 1800, tool: TOOL });
    return res.status(200).json({ title: json.title, body: json.body, notes: json.notes || [], model, ms: Date.now() - started, draft: true });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || "Server error" });
  }
};
