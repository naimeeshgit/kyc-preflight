# AI build log: KYC Pre-flight

Razorpay × ISB AI PM Build Challenge, Track 1: Razorpay in Your Pocket  
Naimeesh Tiwari, ISB PGP Co'27 · Build window 4 to 13 October 2026  
Prototype: https://kyc-preflight.vercel.app

KYC Pre-flight runs every check a Razorpay reviewer will do (category, documents, KYC route, name match, proof of business, website pages) before the ₹199 KYC fee, inside the merchant app. The model reads and writes; rules decide.

## 1. AI tools and models used

| Tool / model | Used for |
|---|---|
| Claude (research agent mode) | Seven cited research reports: Razorpay products and AI stack, competitor agents, onboarding pain points, merchant voices after submission, competitor onboarding teardown, regulation versus product choice, pricing fact-check |
| Claude (chat) | Idea scoring against my rubric, red-teaming my preferred idea, critique of drafts |
| Claude in Chrome (browser agent) | Live audit of Razorpay's real signup and KYC flow with me as the applicant; YouTube transcript and comment mining; end-to-end testing of every path in the deployed prototype |
| Claude Code | Wrote the Expo / React Native web app, the Vercel serverless API, the prompts, the 340-row taxonomy builder, the name-match and consistency engines, and the eval harness |
| Claude Haiku (claude-haiku-5-5) via Anthropic Messages API | The in-product model: reads business descriptions, document photos and evidence images; drafts policy pages, letters and reviewer answers; powers the in-app assistant |
| Browser speech recognition (en-IN, hi-IN) | Voice input for Hinglish descriptions |
| Trupeer | Screen recording and voice-over for the demo video |

No API keys or credentials are in the code or this log; the Anthropic key lives only in Vercel environment variables.

## 2. Key prompts, workflows and agent setup

Research workflow. Each report had a written brief with evidence rules: cite every claim, label it official / merchant anecdote / third-party guide / regulator, describe anecdotes as themes and never as frequencies, surface conflicts instead of resolving them by guessing.

Browser agent setup. Claude in Chrome walked Razorpay's live signup with me. Hand-off rule: the agent stops at every OTP, upload, payment and irreversible choice; I entered all personal details myself. The agent's job was to log every screen, field, error and wait, and to mark every point where it would have had to guess, since that is where a first-time seller gets stuck.

In-product pipeline (category check):
1. A BM25 retriever picks 8 of Razorpay's 340 published sub-categories (a Hinglish lexicon is included; native-script input is glossed to English first).
2. The model must answer through a forced tool call whose schema allows only those 8 ids. Prompt excerpt: "Choose only from the candidates listed. If the verdict depends on something the seller hasn't said, ask exactly one question. Do not judge legitimacy."
3. A deterministic policy decides: decided, ask one question, or a human reviewer decides (confidence thresholds, a mixed-candidate check, a blocked-term tripwire). The model never decides eligibility.

Names: the model reads PAN, Aadhaar and bank proof; a deterministic engine (word order, initials, honorifics, Devanagari and Telugu transliteration, phonetic keys) scores the match and overrides the model when they disagree.

Proof of business: the model extracts facts only from Instagram, catalog and invoice images ("report only what is visibly written; do not judge legitimacy"); rules cross-check name, owner, products, prices and contact across sources.

Assistant prompt (excerpts): "Answer from her case. Verdicts come from the app's rules; never say she will be approved. Never help reword, hide or misdescribe a blocked business. Never explain risk or fraud signals. Only state a status the case gives you; if a check is NOT CHECKED YET, say so. Drafting is a quick tap-through: ask one short pointed question per turn with 3 to 4 tap answers, at most 4 questions, then draft. Use [brackets] for unknowns; never invent registration numbers." A rule (not the model) answers any request to reword a blocked business.

Evaluation workflow. Two labelled sets ship in the app: 146 business descriptions (English, Hinglish, Telugu, vague, adversarial) and 304 name pairs. I re-ran them live after every policy change.

## 3. AI output I rejected, corrected or significantly improved

The first version of the product was itself an AI output I rejected. Claude built a clean flow: a text box, one prompt that classified the business, and a static document list. It looked finished. When I used it as the merchant, it was a linter on top of one LLM call: every seller got the same PAN, Aadhaar and bank list, and the category verdict was whatever the model said. I rejected it on three grounds: it did not touch the real reason applications stall ("legitimate business required", which a reviewer judges by hand from Instagram, catalog and invoices), it gave no help after the verdict, and nothing was measurable.

What replaced it, at my direction: the taxonomy plus retriever plus deterministic decision policy; an entity-aware document plan; the proof-of-business cross-check; in-app fixes for every red stamp; and labelled eval sets. On the first eval run the model-only approach would have told blocked businesses "supported"; after the rebuild, 0 of 76 blocked or reviewed businesses are told "supported".

Smaller corrections from my own testing:
- The assistant once told a seller her names "matched" before any document had been read. I added explicit NOT CHECKED YET markers and a rule to state only statuses the case gives.
- "Vapes on Instagram" got a clarifying question instead of a block. The cause was the stemmer cutting "vapes" to "vap" so the tobacco row was never retrieved. Fixing it raised retrieval recall from 94.5% to 95.2%.
- Model-driven blank filling in drafts was unreliable (it re-asked after "just draft it" and added new blanks), so I replaced that step with a rule-based form.

## 4. What AI did versus what I decided or built

| AI did | I decided or did |
|---|---|
| Generated nine product ideas and scored them | Wrote the weighted rubric first; overrode several scores; proposed the idea that was red-teamed |
| Found the fatal flaw in my settlement-hold idea (pre-clearance during festive spikes invites fraud) | Talked to merchants, heard that onboarding was the real pain, and pivoted away from my own scored favourite |
| Wrote research reports and coded 16 Reddit threads by theme | Set evidence rules; flagged astroturf and AI-polished posts; kept counter-evidence |
| Walked the live Razorpay flow and logged it | Was the applicant; entered all personal data; decided what each finding meant |
| Wrote nearly all the code, prompts and evals | Chose scope, architecture (model reads, rules decide), guardrails, thresholds' intent, UX, every pivot; tested every path and reported every bug fixed |
| Drafted the note, script and this log | Edited for accuracy and tone; removed any claim I could not support |

## 5. Known limitations, risks and verification steps

Limitations
- Registry (CKYC), bank penny drop and payment are mocked. Adapters carry the real request and response shapes; the calls are not live.
- Both eval sets were written by me and thresholds were tuned on them, so the numbers (90 to 91% right across runs, 0/76 false "supported", 0/70 false "not supported", 14/14 adversarial caught, 303/304 name pairs, 0 false name passes) are regression numbers, not field accuracy.
- The taxonomy and document rules come from Razorpay's public documents, not internal policy.
- No observed tests with real sellers yet.

Risks
- A wrong green costs a seller ₹234.82 and trust. Mitigation: ask or defer when unsure (about 21% of cases), a blocked-term tripwire, and pay blocked while anything is red.
- Gaming: sellers may try to reword a blocked business. Mitigation: a rule refuses before the model sees the request, and every description attempt is kept for the reviewer.
- Tipping-off: the product explains requirements only, never risk signals.
- Model drift: the in-product model is small and fast; results vary between runs, which is why rules hold every decision.

Verification steps taken
- Every claim in the product note is traced to a cited source or to my own audit.
- Eval sets re-run live after each policy change; misses inspected one by one (all were cautious "needs review", none a wrong green).
- Every demo path walked end to end in the deployed app by the browser agent and by me before recording; bugs found this way are listed above.
- Specimen documents and demo stores are fictional and watermarked.

Next verification: watch three to five real sellers run Pre-flight on their phones and record time to verdict, whether each stamp was understood, and whether they would still pay ₹199.
