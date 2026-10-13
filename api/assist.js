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
      message: { type: "string", description: "Short and plain: one question, or 1-4 sentences, or a short numbered list. No markdown symbols except numbered lines." },
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
      checklist: {
        type: ["array", "null"],
        description: "Only when she asks to get fully ready / prepare everything / what's left: every base a reviewer will check for HER case, in order. Otherwise null.",
        items: {
          type: "object",
          properties: {
            item: { type: "string", description: "Short name of the base, e.g. 'Refund policy for sessions'." },
            done: { type: "boolean", description: "True only if her case shows it is already covered." },
            action: { type: ["string", "null"], description: "If not done: the exact request she can tap to work on it with you, e.g. 'Draft my refund policy for sessions'." },
          },
          required: ["item", "done", "action"],
        },
      },
    },
    required: ["message", "draft", "suggestions"],
  },
};

// Deterministic guard: a blocked category plus a request to reword, hide or get around it gets a fixed answer.
const WORKAROUND = /(reword|re-word|rephrase|describe (it|this|my business) (differently|as)|call it something|hide|bypass|get around|work ?around|so (that )?it (passes|gets approved)|trick|without (them|razorpay) knowing|kaise chhupa|chupa|badal ke likh|(list|show|register|mark|put|file|categori[sz]e) (it|them|this|my business|my shop) (as|under)|say (it'?s|it is|i sell|that i sell)|instead of (saying|writing))/i;

const clip = (v, n = 600) => String(v ?? "").slice(0, n);

function caseBlock(c = {}) {
  const lines = [];
  lines.push(`Seller (legal name as on PAN): ${clip(c.legalName, 80) || "[unknown]"}; shop name: ${clip(c.shopName, 80) || "[unknown]"}; registered mobile: ${clip(c.mobile, 20) || "[unknown]"}`);
  lines.push(`What she said she sells: """${clip(c.description, 600)}"""`);
  if (c.category) lines.push(`Category row: ${clip(c.category.label, 120)} (${clip(c.category.id, 80)}); status told to seller: ${clip(c.category.status, 30)}${c.category.reason ? `; reason on the row: ${clip(c.category.reason, 200)}` : ""}${c.category.extraDocs?.length ? `; category needs: ${c.category.extraDocs.map((d) => clip(d, 60)).join(", ")}` : ""}`);
  if (c.entity) lines.push(`Business set-up: ${clip(c.entity, 60)}; registrations she has: ${(c.have || []).map((x) => clip(x, 40)).join(", ") || "none"}`);
  if (c.plan?.length) lines.push(`Document plan: ${c.plan.map((p) => `${clip(p.label, 80)} = ${clip(p.status, 12)}${p.how ? ` (how: ${clip(p.how, 260)})` : ""}`).join("; ")}`);
  if (c.channel) lines.push(`Takes payments: ${c.channel === "site" ? `on a website ${clip(c.siteUrl, 120)}` : "via Instagram/WhatsApp/in person (Payment Links, QR)"}`);
  if (c.siteMissing?.length) lines.push(`Website pages missing: ${c.siteMissing.map((x) => clip(x, 40)).join(", ")}`);
  if (!c.route) lines.push("KYC route: NOT CHECKED YET (happens in step 2).");
  if (!c.names?.length) lines.push("PAN, Aadhaar and bank names: NOT CHECKED YET, no documents read (happens in step 3).");
  if (!c.evidence?.length && !c.evidenceRun) lines.push("Business proof (Instagram, catalog, invoice): NOT CHECKED YET (happens in step 3).");
  if (c.evidenceRun && !c.evidence?.length) lines.push("Business proof: checked, every source agrees.");
  if (!c.pass?.length) lines.push("Go-live pass: not reached yet.");
  if (c.attached?.length) lines.push(`Already attached to her application: ${c.attached.map((x) => clip(x, 80)).join("; ")}`);
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
- Only state a status the case gives you. If a check is NOT CHECKED YET, say so and which step does it; never call a document uploaded, a name matched or a step done unless the case says it.
- You are an assistant. You help her prepare; you cannot guarantee approval. Never say or imply she will be approved, "is all set" or "will pass"; say "ready to submit" at most, and when she is ready, remind her in one short clause that the final decision is the reviewer's.
- Cover all bases. When she asks to get fully ready (or what's left), return a "checklist" of everything a reviewer will look at for HER category and set-up: category fit and any category-specific asks (e.g. for services: what the session is, delivery mode, pricing, refund/cancellation terms; for food: FSSAI; for resellers: purchase invoice), documents from her plan, KYC route, bank name match, business proof (page, catalog, invoice), website pages if she has a site, visible fixed prices, contact details. Mark done only what her case already shows. Each open item gets an "action" she can tap. Keep the message to one line.
- "Prepare me for review" or "what's left" means the checklist above, never a long text draft; each open item's action is a short request she can tap, like "Help me get Udyam" or "Write my refund policy".
- After answering or drafting, if anything in her case is still open, end the message with one line "Still open: ..." naming at most 3 items.
- A draft with no [brackets] can be attached to her application with the "Add to my application" button under it; mention that once when a draft is complete. Don't re-draft something already attached unless she asks.
- After you give a draft, point to the next open base in "suggestions" (as a tappable request), so she keeps moving until everything is covered.
- Drafting is a quick tap-through, built for minimum effort. Before drafting, list to yourself the facts the document needs that are NOT in her case (session length, price range, refund window, delivery time, which bank, how customers book...). Then ask them ONE per turn: one short pointed question (under 15 words), prefixed with its number like "(1/3)", and put 3-4 concrete tap answers in "suggestions" (real values like "30 min", "₹500-1,000", "7 days"), with "${lang === "hi" ? "Skip" : "Skip"}" as the last. Ask only what truly changes the document, at most 4, most important first; the number in "(1/N)" is the real count, and if fewer facts are missing, ask fewer. Never ask for anything already in her case or already answered in this conversation, never ask two questions about the same thing, never ask open-ended questions. Speak to her as "you", never "she". Every question needs at least 3 real answer options. If she taps Skip, move on and leave that one as a [bracket]. After the last answer, draft immediately. If she says "just draft it", draft now.
- "Fill the N blanks with me": take the [brackets] in your last draft one at a time as pointed tap questions as above, then give the same draft again with the answers in. Never add new [brackets] while filling. For blanks only she can type (address, email, account or registration numbers), don't ask: say in one line that she can tap the draft text and type them in.
- When you give a draft, the message is one or two plain sentences; never repeat an earlier question in it.
- Contact details: write her registered mobile from the case into the draft itself (never a [bracket] for it); never ask for email, address or account numbers, leave those as [brackets].
- Bank name letter: addressed to her branch, quotes her PAN name and the account name exactly as in the case, asks to update the account holder name to match the PAN, lists PAN copy as enclosure.
- The app can take certificate uploads (Udyam, GST, shop licence, FSSAI): an "Upload certificate" button on her document plan, or she can say "upload my Udyam" here. Never say you can't upload; point her to that.
- Never write instructions to the seller inside the draft body (no "this draft has blanks"); the body is only the document.
- Drafts (policy pages, letters, product or business descriptions, reviewer answers, a declaration of business): put them in "draft". Labelled as a draft, plain text, [brackets] for anything unknown (address, GSTIN, account number, dates). Never invent registration or licence numbers, legal citations or facts she hasn't given.
- How-to answers (Udyam, FSSAI, bank name change, video KYC prep): short numbered steps with where to go and roughly how long it takes. When the document plan gives a "how" for an item, use its timing and facts exactly; don't contradict the app. Don't quote button labels or screen wording of government portals; describe the step instead ("register with your Aadhaar and verify the OTP"). Government portals: udyamregistration.gov.in, foscos.fssai.gov.in, gst.gov.in. No legal or tax advice beyond that; suggest a CA when it truly depends.
- Language: ${lang === "hi" ? "reply in simple Hinglish (Hindi in Latin script). Drafts meant for reviewers or customers stay in simple English." : "simple English."}
- Keep the message short; the draft carries the length.
- suggestions: when you asked a question, the likely answers (see above); otherwise 2-3 next things she might tap, specific to what's still open in her case.

${/^(just draft it|bas draft kar dijiye)\.?$/i.test(String((messages[messages.length - 1] || {}).content || "").trim()) ? "\nSHE JUST TAPPED 'JUST DRAFT IT': write the full draft in this reply, using everything she answered so far and [brackets] for the rest. Do not ask anything.\n" : ""}
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

    let { json, model } = await callClaude([{ type: "text", text: prompt(lang === "hi" ? "hi" : "en", msgs, c) }], { maxTokens: 2000, tool: TOOL });
    // "Just draft it" means a draft now. One retry if the model asked again anyway.
    if (/^(just draft it|bas draft kar dijiye)\.?$/i.test(last.content.trim()) && !(json.draft && json.draft.body)) {
      ({ json, model } = await callClaude([{ type: "text", text: prompt(lang === "hi" ? "hi" : "en", msgs, c) + "\nREMINDER: the reply MUST include the draft object. No questions." }], { maxTokens: 2000, tool: TOOL }));
    }
    // Facts the app already has never stay blank: her registered mobile fills any phone placeholder.
    const fillKnown = (t) => c.mobile ? String(t).replace(/\[(?:your |registered |whatsapp |contact |phone\s*\/\s*)?(?:mobile|phone|whatsapp|contact)(?: number| no\.?)?(?:[^\]]{0,30})\]/gi, c.mobile) : String(t);
    const draft = json.draft && json.draft.body ? { title: clip(json.draft.title, 120) || "Draft", body: fillKnown(json.draft.body), notes: (json.draft.notes || []).filter((n) => !/mobile|phone number/i.test(n)).slice(0, 3) } : null;
    let suggestions = (json.suggestions || []).slice(0, 3);
    if (draft) {
      suggestions = suggestions.filter((x) => !/just draft|bas draft|skip/i.test(x));
      // Blanks left in a draft get a one-tap way to fill them, question by question.
      const blanks = (draft.body.match(/\[[^\]]+\]/g) || []).length;
      // Blanks are filled in the draft card itself (rules, no model); no chat chip needed.
      suggestions = suggestions.filter((x) => !/fill the .*blank|khaali jagah/i.test(x));
    }
    const checklist = Array.isArray(json.checklist) && json.checklist.length ? json.checklist.slice(0, 14).map((x) => ({ item: clip(x.item, 120), done: Boolean(x.done), action: x.done ? null : clip(x.action, 200) || null })) : null;
    // A question before a draft always offers the way out.
    const just = lang === "hi" ? "Bas draft kar dijiye" : "Just draft it";
    const drafting = msgs.filter((m) => m.role === "user").slice(-5).some((m) => /draft|write|likh|letter|policy|page|answers|jawab|blanks|khaali/i.test(m.content));
    if (!draft && !checklist && /\?\s*$/.test(String(json.message || "")) && drafting && !suggestions.some((x) => /just draft|bas draft/i.test(x))) suggestions = [...suggestions.filter((x) => !/^skip$/i.test(x.trim())), "Skip", just];
    return res.status(200).json({ message: String(json.message || ""), draft, checklist, suggestions, model, ms: Date.now() - started });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || "Server error" });
  }
};
