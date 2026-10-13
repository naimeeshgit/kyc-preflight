// Server-side helpers for the KYC Pre-flight API. The Anthropic key lives only here (Vercel env var).
const POLICY = require("../../shared/taxonomy.json");

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";
const API_URL = "https://api.anthropic.com/v1/messages";

const langName = (lang) =>
  lang === "hi" ? "Hinglish (Hindi written in Latin script, simple everyday words)" : "simple English";

/**
 * Classification prompt. The model chooses only among the retriever's candidates (plus
 * "none_of_these"), so the taxonomy stays the source of truth and the UI can show what was
 * considered. If the eligibility verdict depends on a fact the seller did not state, the model
 * asks exactly one question instead of guessing.
 */
function classifyPrompt(text, lang, candidates, qa) {
  const table = candidates.map((c) => `${c.id} | ${c.label} (${c.categoryLabel}) | ${c.status}${c.reason ? " — " + c.reason : ""}`).join("\n");
  const prior = qa && qa.question ? `\nYOU ASKED EARLIER: "${qa.question}"\nSELLER ANSWERED: "${String(qa.answer || "").slice(0, 300)}"\n` : "";
  return `You are the classification step of "KYC Pre-flight", a check that runs inside a payment gateway's merchant app BEFORE a small, often unregistered seller pays a ₹199 KYC fee.

Task: map the seller's own description (English, Hindi, Hinglish or Telugu) to exactly one policy_id from the CANDIDATES, and extract facts they stated.

Rules:
- Choose policy_id only from CANDIDATES. If none fits, use "none_of_these".
- The status column decides eligibility, not you. Your explanation must agree with it.
- If the status is not_supported, say so plainly and kindly. Never suggest how to re-describe or restructure the business to fit another category.
- confidence is your confidence in the policy_id, from 0 to 1. Be honest: 0.9+ only when the description clearly names the business.
- ASK ONE QUESTION when the choice between candidates with DIFFERENT statuses, or the verdict itself, depends on something the seller has not said (examples: real gold vs imitation; real-money vs free-to-play; selling own products vs reselling; fixed price vs pay-what-you-want; delivering now vs collecting advances). Put it in "question" (one short sentence, in the seller's language) and set confidence below 0.6. Otherwise "question" must be null. Never ask a second time if an answer is already given below.
- Report only facts the seller stated or clearly implied. Use null when unknown.
- is_reseller is true when they buy finished goods from others to sell.
- The explanation covers only the category decision. Do not mention fees, payment, documents or next steps.

CANDIDATES (policy_id | label | status — note for reviewed/blocked):
${table}
none_of_these | Not a standard category | needs_review

SELLER DESCRIPTION:
"""${String(text).slice(0, 1500)}"""
${prior}
Write "explanation" (2 short sentences), "question" and every "flags" text in ${langName(lang)}. Use plain words a first-time seller understands. Do not use jargon like MCC, CKYC or KYB. Flags are optional practical tips (at most 2).

Answer by calling the report_category tool.`;
}

function namesPrompt(lang) {
  return `You are the name-check step of "KYC Pre-flight", which runs before a seller pays a KYC fee. The 3 images are, in this order: 1) PAN card, 2) Aadhaar card, 3) bank passbook, cheque or bank statement. Read the holder's name exactly as printed on each. If an image is not that kind of document, set readable to false.

Treat the PAN name as the legal name. Compare the Aadhaar name and the bank account name with it, the way a bank name-match check would:
- Same words in a different order: "match".
- An initial standing for a word, or a common spelling variant (Lakshmi / Laxmi): "match", and mention it in the reason.
- A whole word missing or extra, or a different name: for the bank account this is "likely_fail", because the ₹1 penny-drop check compares the bank's account name with the PAN name. For Aadhaar use "unclear".
- Unreadable or the wrong kind of document: "unclear".
For anything that is not "match", give one concrete fix the seller can do. Never suggest altering, editing or creating a document.

Write reason, fix and summary in ${langName(lang)}, one short sentence each, plain words.

Answer by calling the report_names tool. Shape for reference:
{"documents":[{"doc":"PAN","name":"...","readable":true},{"doc":"Aadhaar","name":"...","readable":true},{"doc":"Bank","name":"...","readable":true}],"comparisons":[{"doc":"Aadhaar","verdict":"match","reason":"...","fix":null},{"doc":"Bank","verdict":"likely_fail","reason":"...","fix":"..."}],"summary":"..."}`;
}

function parseJson(text) {
  const t = String(text || "").trim();
  try { return JSON.parse(t); } catch (_) {}
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1]); } catch (_) {} }
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch (_) {} }
  return null;
}

// Structured output: the model must answer by calling one tool whose input schema is the shape we need,
// so the server always gets valid JSON instead of hoping free text parses.
const SCHEMAS = {
  // classify's enum is built per request from the retriever's candidates: see classifySchema().
  classify: (candidateIds) => ({
    name: "report_category",
    description: "Report the category decision for the seller's description.",
    input_schema: {
      type: "object",
      properties: {
        policy_id: { type: "string", enum: [...candidateIds, "none_of_these"] },
        category_label: { type: "string" },
        sub_category: { type: "string" },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        question: { type: ["string", "null"], description: "One clarifying question, only when the verdict depends on an unstated fact. Otherwise null." },
        is_reseller: { type: ["boolean", "null"] },
        has_gst: { type: ["boolean", "null"] },
        has_website: { type: ["boolean", "null"] },
        channels: { type: "array", items: { type: "string" } },
        flags: { type: "array", maxItems: 2, items: { type: "object", properties: { severity: { type: "string", enum: ["info", "warn"] }, text: { type: "string" } }, required: ["severity", "text"] } },
        explanation: { type: "string" },
      },
      required: ["policy_id", "category_label", "confidence", "question", "explanation"],
    },
  }),
  gloss: {
    name: "report_gloss",
    description: "Give a short English gloss of a business description written in an Indian script.",
    input_schema: { type: "object", properties: { english: { type: "string", description: "Plain English, one or two sentences, keep product and channel words." } }, required: ["english"] },
  },
  names: {
    name: "report_names",
    description: "Report the names read from the documents and how each compares with the PAN name.",
    input_schema: {
      type: "object",
      properties: {
        documents: { type: "array", items: { type: "object", properties: { doc: { type: "string", enum: ["PAN", "Aadhaar", "Bank"] }, name: { type: "string" }, readable: { type: "boolean" } }, required: ["doc", "name", "readable"] } },
        comparisons: { type: "array", items: { type: "object", properties: { doc: { type: "string", enum: ["Aadhaar", "Bank"] }, verdict: { type: "string", enum: ["match", "likely_fail", "unclear"] }, reason: { type: "string" }, fix: { type: ["string", "null"] } }, required: ["doc", "verdict", "reason"] } },
        summary: { type: "string" },
      },
      required: ["documents", "comparisons", "summary"],
    },
  },
};

async function callClaude(content, { maxTokens = 1024, schema, tool: toolOverride } = {}) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { const e = new Error("ANTHROPIC_API_KEY is not set"); e.status = 503; throw e; }
  const tool = toolOverride || (schema ? SCHEMAS[schema] : null);
  const body = { model: MODEL, max_tokens: maxTokens, messages: [{ role: "user", content }] };
  if (tool) { body.tools = [tool]; body.tool_choice = { type: "tool", name: tool.name }; }
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01",
      // Keys not scoped to a workspace need the workspace id (Console → Workspaces).
      ...(process.env.ANTHROPIC_WORKSPACE_ID ? { "anthropic-workspace-id": process.env.ANTHROPIC_WORKSPACE_ID } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const e = new Error(`Anthropic API ${res.status}: ${text.slice(0, 300)}`); e.status = 502; throw e;
  }
  const data = await res.json();
  const toolUse = (data.content || []).find((b) => b.type === "tool_use");
  let json = toolUse && toolUse.input && typeof toolUse.input === "object" ? toolUse.input : null;
  if (!json) {
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    json = parseJson(text);
    if (!json) { const e = new Error(`Model reply was not JSON (stop_reason ${data.stop_reason}): ${text.slice(0, 160)}`); e.status = 502; throw e; }
  }
  return { json, model: data.model || MODEL, usage: data.usage };
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > 6_000_000) throw Object.assign(new Error("Body too large"), { status: 413 }); chunks.push(c); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

module.exports = { POLICY, MODEL, SCHEMAS, classifyPrompt, namesPrompt, callClaude, cors, readBody };
