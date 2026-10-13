# AI Build Log — KYC Pre-flight

**Razorpay × ISB Build Challenge · Track 1: Razorpay in Your Pocket**
Author: Naimeesh Tiwari (PGP Co'27) · Build window: 4–13 October 2026

---

## 1. How I worked

I treated AI as a team of specialists, each with a defined job, and kept every product decision with myself. The rule I worked to: **AI widens the search and compresses the grunt work; I decide what is true, what matters, and what ships.**

| Role | Tool | What it did | What I did |
|---|---|---|---|
| Research analyst | Claude (extended research agent) | Seven multi-source research reports: company and product landscape, AI-agent competitor scan, onboarding pain points, merchant voices after submission, competitor onboarding teardown, regulation vs. product choice, pricing and claims fact-check | Wrote each research brief, set evidence standards (cite every claim, label official vs. anecdote vs. third-party, flag sample bias), and rejected or down-weighted weak claims |
| Sparring partner | Claude (chat, Opus) | Scored ideas against my rubric, then attacked my preferred idea as a Razorpay risk PM would | Defined the rubric and weights, overrode scores where I disagreed, chose the final direction |
| Field auditor | Claude in Chrome | Walked Razorpay's live signup and KYC flow with me, logging every screen, field, error and wait; mined YouTube onboarding tutorials via transcripts and comments | Entered all personal details myself; designed hand-off rules so the agent stopped at every OTP, upload, payment and irreversible choice |
| Builder | Claude (chat) + Claude Artifacts runtime | Wrote the prototype code, the in-product prompts and the fallback responses | Set the scope, the flow, the guardrails, the persona and the success metrics; reviewed every screen and prompt |
| In-product AI | Claude via the Artifact `sample` capability | Runs live inside the prototype: business-description classification, document reading, name reconciliation, plain-language explanations | Decided which jobs need AI and which stay as deterministic rules |

**Net effect.** As a solo builder alongside a full MBA term, I produced seven research reports with citations on every claim, a live audit of the real flow, a teardown of eight competitors, a regulation map, mining of four YouTube tutorials, a coded corpus of 16 Reddit threads, and a working prototype with live AI. The time AI saved went into the part it cannot do for me: deciding which problem is worth solving, and testing that decision against real merchants.

---

## 2. Decision timeline

Each entry records what AI contributed and what I decided. Pivots are included deliberately; they show where my judgement changed the direction.

### Day 1 (4 Oct) — Understanding the brief
- **AI:** Parsed the CAPD email and both JDs; flagged that the challenge brief was missing.
- **Me:** Chose the **Full Stack Builder** track. My CS degree and agentic-AI work at Walmart map to a builder-PM role better than to a classic PM role where I would be competing against candidates with PM tenure.
- **Me:** When the brief arrived, I caught that it scopes Track 1 to *the Razorpay mobile app* and *one task*. This killed my first idea (a three-flow WhatsApp copilot), which would have been off-brief.

### Day 2 (5 Oct) — Mapping the landscape
- **AI:** Two research reports — Razorpay's products, financials and 2026 AI stack (Agent Studio, Agentic Dashboard, Ray); and a competitor scan (Cashfree Relay, PayU Agent HQ, PhonePe, Paytm, BharatPe, Pine Labs).
- **Me:** Drew the key strategic conclusion: **recovery agents are now commoditised** (Razorpay and four competitors all shipped them between Oct 2025 and Sep 2026). Building another one would be "recreating an existing experience", which the brief explicitly penalises. I steered toward trust and control problems, which no agent addresses.

### Days 3–6 (6–9 Oct) — Structured idea selection
- **Me:** Defined a weighted rubric before scoring anything, so that I could not rationalise toward a favourite:

  | Criterion | Weight |
  |---|---|
  | Pain × frequency for Razorpay merchants | 20% |
  | Track 1 fit (mobile, one task, <2 min) | 20% |
  | Whitespace vs. Cashfree / PayU / PhonePe / Paytm | 15% |
  | Buildable as a convincing demo without internal data | 15% |
  | AI is essential, not decorative | 10% |
  | Measurable business impact for Razorpay | 10% |
  | Judge wow and story | 10% |

- **AI:** Generated 9 genuinely different Track 1 ideas and scored them.
- **Me:** Disagreed with several scores and argued them down. Examples:
  - *Unblock My Money* (settlement holds): I scored it 3.8, not 3.9. Document collection rarely fits in two minutes, the AI was mostly OCR, and it depends on the risk team.
  - *Sale Mode*: I scored it 3.8, not 4.2. It is a pull feature for a problem merchants don't know they have, and a fraudster can declare a Diwali sale too.
- **Me:** Proposed a counter-idea, *Hold Shield* (a push-based, Razorpay-initiated pre-clearance), and asked AI to attack it as a Razorpay risk PM would.
- **AI:** Found the fatal flaw: pre-clearance during the festive spike is exactly when bust-out fraud happens.
- **Together:** Reframed "pre-clear" into **"pre-agree a reserve"** (*Peak Pass*). I scored it 4.4, with a remaining concern that the AI was close to a rules engine.

### Day 9 (12–13 Oct) — The pivot that mattered
- **Me:** Before committing, I spoke to merchants. Many independently said Razorpay **onboarding** is the painful part: slow, important requirements revealed late, and restarting means starting over. This was primary evidence that outweighed my desk research, so I **dropped Peak Pass** and pivoted to onboarding.
- **AI:** Three parallel research reports (merchant voices after submission, competitor onboarding teardown, regulation vs. product choice) and one pricing fact-check.
- **Me + Claude in Chrome:** A live audit of Razorpay's signup as a real applicant (details below).
- **AI + me:** YouTube transcript and comment mining (4 videos, ~90K combined views).
- **Me:** Synthesised all six evidence streams into one insight (Section 4) and chose **KYC Pre-flight**.
- **Me (13 Oct, afternoon):** I stress-tested the choice against a pivot to an agentic payments-data dashboard, my own area of expertise. Research showed Razorpay already ships it (web, WhatsApp, Claude) and Cashfree and PayU launched equivalents in Aug–Sep 2026. Then I collected 17 Reddit threads by hand, and they showed merchants are openly cynical about AI announcements while basics fail. **Decision: stay on Pre-flight**, and deepen it with the edge cases Reddit surfaced (Section 3A).

---

## 3. Evidence discipline

I set rules for how AI-gathered evidence could be used, because a PM pitch built on invented statistics would fail in front of Razorpay's own team.

1. **Every factual claim cited**, and labelled *official*, *merchant anecdote*, *third-party guide* or *regulator*.
2. **Anecdotes describe themes, never frequencies.** Trustpilot is 73% one-star and self-selected; I use it for quotes, not rates.
3. **Company claims are labelled as claims.** Razorpay's own blog says bank–PAN name mismatches cause "~40% of onboarding delays"; no source is given, so I present it as Razorpay's claim.
4. **Conflicts are surfaced, not resolved by guessing.** Razorpay's blogs disagree on settlement cycle (T+1 vs T+2) and instant-settlement pricing; a 2026 YouTube walkthrough shows a "2.5% / Plus ₹500/month" plan screen that contradicts "2% + GST". I flagged these instead of picking one.
5. **Regulatory claims verified at source before use.** The research reports RBI's Sept 2025 PA Master Direction includes a lighter route for merchants under ₹40 lakh turnover. I treat it as a hypothesis to verify, and I frame it to judges as an opportunity, not as a criticism of Razorpay.
6. **Contradicted findings are kept.** My audit said the brand name is forced to match the PAN name; Razorpay's Oct 2026 blog says it need not. YouTube commenters then reported the same block. Conclusion: policy allows it, the interface prevents it. That gap became a feature.
7. **Sources are checked for independence, not only for content.** On Reddit, 10 of the 16 opening posts carry an "AI-written/polished" label from the classifier Reddit displays. One account posted almost identical pro-Razorpay tips in three separate threads, and another offered "account-manager escalation" by DM in two. Competitor founders promote their own gateways in most threads. I treat these as interested parties: they can illustrate a theme, but never count toward it.

---

## 3A. How I gathered merchant evidence: nine methods, one picture

No single source can be trusted on its own. Reviews over-represent anger, Razorpay's blogs over-represent success, and my own audit is one applicant on one day. So I used nine methods that fail in different ways, and I trust only the findings that show up across several of them.

### Methods and what each one uniquely contributed

| # | Method | Scale | What only this method showed | Blind spot |
|---|---|---|---|---|
| 1 | **Merchant conversations** (informal, my network) | Several merchants, not recorded | The problem itself: important requirements arrive late, and a restart means starting over. This is why I pivoted away from Peak Pass | Small sample, my network, recalled rather than observed |
| 2 | **Live first-hand audit** (me as a real applicant) | 1 full signup | Exact screens, wording and waits: the fee appears only after Submit, restricted categories carry no warning, the brand-name helper text misleads, uploads fail silently | One applicant, one category, one day |
| 3 | **AI agent as a novice user** (Claude in Chrome taking notes, with me at every sensitive step) | Same flow | Every place the agent could not continue without guessing is a place the interface relies on knowledge a first-time seller doesn't have, such as the business-model answer silently changing the document checklist | An agent is not a merchant; I use it to find confusion, not to measure it |
| 4 | **Public reviews** (Play Store, Trustpilot, G2, Shopify), via research agent | Hundreds of reviews, summarised | The most repeated complaint: paid ₹199, then rejected with no reason | Self-selected, so I use them for themes and never for rates |
| 5 | **Reddit deep-dive** (detail below) | 17 threads collected, 16 coded, 15 unique authors | *How* failures unfold over weeks: document requests that arrive one by one, a 4-month KYC caused by a middle name, help that arrives only after a public post | Complaint-heavy, AI-polished posts, astroturf in the comments |
| 6 | **YouTube tutorial mining** | 4 videos, ~90K views, 156+ comments | Video KYC prep (physical PAN, pen, morning slots) is revealed only after submission; some merchants pay ₹300 grey-market "approval agents" | Creators cover hard parts by design |
| 7 | **Official sources** (Razorpay docs, pricing, FAQ, blogs; RBI directions; news) | — | What is *mandated* (CKYC, address verification, aggregator due-diligence liability) versus what is a *product choice* (fee timing, hidden category rules, wording) | Company claims are labelled as claims |
| 8 | **Competitor teardown** | 8 gateways, plus Cashfree Relay and PayU Agent HQ | PayU, CCAvenue and PhonePe PG charge no onboarding fee; only CCAvenue warns about prohibited categories up front; Q&A agents over payment data are now standard everywhere | Marketing pages, not lived experience |
| 9 | **Using my own AI prototype on real inputs** | Live Hinglish and English descriptions | How the AI fails: free-text replies that didn't parse ("achaar" case), and the model wandering into fee advice. This led to forced structured output and a narrower prompt | Tests the product, not the market |

### The Reddit deep-dive

**Corpus.** I collected 17 threads (r/indianstartups, r/StartUpIndia, r/developersIndia, r/IndiaBusiness, r/IndiaFinance, r/IndiaInvestments, r/Scams), dated from 3 years ago to 7 days ago. Ten are from the last 6 months. I excluded one thread because it was about the internship programme, not merchants. Two threads share an author, which leaves 15 independent voices. I coded each thread for every theme it raised, then separately for its main complaint.

| Theme | Threads raising it (of 16) | Main complaint in |
|---|---|---|
| Support can't explain or resolve; help comes through public posts or insiders | 11 | 2 |
| Onboarding or approval slow, opaque or rejected | 9 | 3 |
| Account suspended or settlement held after going live, with documents requested one at a time | 4 | 3 |
| International card acceptance (3-D Secure, risk checks) | 5 | 3 (2 authors) |
| Integration, docs, dashboard | 4 | 1 |
| Pricing opacity (₹199 at the end, undisclosed add-ons, foreign-exchange markup) | 2 | 1 |
| Scepticism about AI ("AI dashboard" data called hallucinated; "make the gateway work first") | 2 | 0 |
| Platform abuse (card-testing fraud, advice to game approval) | 3 | 1 |

**International acceptance is deliberately out of scope.** It is a real, high-engagement problem, but it affects a different segment (SaaS exporters), it is a payments-rail problem rather than a 2-minute mobile task, and the fix (enabling non-3-D-Secure cards) is a partner-bank decision.

### Seven patterns that held across methods

| Pattern | Seen in | What it means for the product |
|---|---|---|
| **P1. Requirements are drip-fed after the merchant has committed.** Fee at the end; website changes requested "every few days"; vendor confirmation, then customer confirmation, then an affidavit; one merchant asked why they couldn't ask for everything at once | Conversations, audit, YouTube, Reddit (4 threads), reviews | **Front-load everything knowable.** Pre-flight shows the full personalised checklist (documents, KYC route, Video KYC prep) *before* ₹199. This is the core of the product |
| **P2. Fixable and final rejections look the same.** A merchant rejected over "pay what you want" didn't know if the problem was documents or business model; another sent 5+ cheque leaves while support "didn't know what the issue is" | Reddit (3), reviews, audit | Every check ends in one of three states: **fix this now**, **a reviewer decides**, or **don't pay, not supported**. The three stamp colours on the pass encode exactly this |
| **P3. Name mismatch can cost months.** One merchant's IDs differed on a middle name; the bank's old cheque book printed a short name; fixing it took over a month at the bank | Reddit, reviews, Razorpay's own claim (~40% of delays), audit | Validates the name check. Adds an edge case: **a cheque leaf with a short name is not a bank-record mismatch, so upload a statement or passbook page instead** |
| **P4. Some opacity is legally required.** Aggregators can't reveal AML or risk triggers (tipping-off rules); commenters with payments backgrounds said so | Reddit (2), regulation research | **Explain requirements, never risk signals.** Pre-flight covers only what is safe to explain (category policy, documents, name match, KYC route). This boundary is also why "just add better error messages" is harder than it sounds |
| **P5. Help depends on who you know.** A non-3-D-Secure request stuck for months was fixed in 24 hours once a stranger escalated to an account manager; "tag them on X" is standard advice; Razorpay staff offer help by DM | Reddit (4), reviews | The target segment is the long tail **without an account manager**. Pre-flight gives them, up front, the answer an AM would give |
| **P6. Gaming pressure is real.** The top advice on the rejected-website thread was to show a fixed price for approval and change it later; one merchant who did this got a compliance email at once | Reddit (2), research on scam merchants | The AI **never coaches re-description** (enforced in the prompt), and every description attempt is kept for the reviewer |
| **P7. Merchants are cynical about AI announcements.** "Cool. But can we make the payment gateway work properly first?" | Reddit (2); no independent accuracy data on RAY in research | AI is used only to read and understand; **rules decide**, and every result shows its working. This is also why I did not pivot to a payments-data Q&A agent: it adds to the very narrative merchants distrust, in a space where Razorpay and two competitors already ship |

### Counter-evidence I kept
- Some merchants report a smooth experience: activated in 2 days once policy pages were added, two years without issues, "best gateway for me." So the problem is concentrated in the **uncertain path**: unregistered sellers, unusual business models, name and document edge cases. That is exactly where Pre-flight works.
- Developers in the threads defend the strictness as RBI-driven. I agree, and the product doesn't loosen any check. It only moves the checks earlier and makes them clearer.
- One poster claimed Razorpay sends legal notices to critics. It is unverified, so I excluded it.

### What is still missing
Observed tests with real merchants. Every method above is either second-hand or uses me as the applicant. The next step is to watch 3–5 sellers run Pre-flight on their own phones and record time to verdict, whether they understood each stamp, and whether they would still pay ₹199.

---

## 4. The insight

All nine methods (Section 3A) converged on one finding:

> **Merchants don't mind filling forms. They mind paying ₹199 and then being rejected, or delayed, for a reason they could have been told on day one.**

| Evidence stream | What it showed |
|---|---|
| Merchant conversations (primary) | Onboarding is slow, important things are revealed late, restarting means starting over |
| Live audit (Claude in Chrome) | ₹199 fee with no refund terms; restricted categories listed without warning; misleading brand-name helper text; silent upload failures; a business-model answer that silently changes the document checklist |
| Merchant reviews (Play Store, Trustpilot, X) | "Paid ₹199, then rejected with no reason" is the most repeated complaint; PAN mismatches "without explaining why" |
| YouTube (4 tutorials, 156+ comments) | The fee appears only after Submit; Video KYC (physical PAN, pen, morning slots) is revealed only after submission; merchants learn onboarding from creators, and some pay ₹300 grey-market "approval agents" |
| Reddit (16 threads, 15 authors) | Requirements drip-fed one at a time; fixable and final rejections look identical; a middle-name mismatch cost one merchant 4 months; help arrives only through public posts or insiders |
| Competitors | PayU, CCAvenue and PhonePe PG publish zero onboarding fees; only CCAvenue flags prohibited categories up front; nobody separates legal name from brand name cleanly |
| Regulation | CKYC and address verification are mandatory; the fee timing, the hidden category rules and the interface wording are product choices |

**Why this problem, and why now.** Razorpay's Agentic Onboarding (FTX'26) made the *happy path* fast. Nobody has fixed the *uncertain path*: the merchant still pays before learning whether their category, name match or KYC route will work. KYC Pre-flight moves those checks before payment.

---

## 5. Key prompts I wrote

These are the prompts that shaped the outcome. Each reflects a judgement I made about how to get a useful answer rather than an agreeable one.

**5.1 Adversarial review (to prevent confirmation bias)**
> "Attack this hard: what would a Razorpay risk PM say, what is the fatal flaw, how does it score on my rubric vs. Sale Mode and Go-Live Rescue, and what single sharpening would make it a 4.5?"

*Why:* I wanted the idea broken before Razorpay's panel broke it. This prompt surfaced the bust-out fraud flaw.

**5.2 Field audit with human hand-off (Claude in Chrome)**
> "You are a careful note-taker, not someone completing KYC on my behalf … STOP AND HAND OVER TO ME at any OTP, identity number, document upload, payment, consent, final submit, or irreversible choice … Never enter fake or deliberately wrong information to trigger errors … For every screen, log fields, what is explained and what is not, exact error wording, time spent and friction."

*Why:* I wanted first-hand evidence with an honest method. The agent observed and timed; I stayed in control of every sensitive input and every irreversible decision.

**5.3 Research brief standard (used for every report)**
> "Cite every factual claim with links; prefer 2024–2026 sources; distinguish verified facts from anecdotal complaints; flag uncertainty and sample-size limits; keep output structured so it can feed a one-page product note."

*Why:* It forced the research to separate signal from noise before it reached me, which made synthesis fast and defensible.

**5.4 YouTube mining (Claude in Chrome)**
> "Open the top 3–4 Razorpay KYC videos (2025–2026). For each, read the transcript and give: the steps shown, every point the creator calls confusing, slow, revealed late or requiring a redo (with timestamp), the tips given to avoid rejection, and the top problem comments."

*Why:* Tutorials reveal where merchants fail, because creators only make videos about the hard parts. This surfaced the Video KYC path and the grey-market agents, neither of which appeared in written reviews.

---

## 6. Build phase (13 Oct)

*Section updated as the build progresses.*

### 6.1 Design system
- **AI:** Pulled Razorpay's Blade design-system tokens directly from Blade's open-source repository (colour palette, type scale, semantic feedback colours).
- **Me:** Chose to build in Razorpay's own visual language so judges evaluate the product, not an unfamiliar look. Mobile-first, one primary action per screen, plain language, no jargon such as "CKYC" or "MCC" shown to the merchant.

### 6.2 Where AI is essential, and where it is not
A core product decision: use AI only where deterministic rules fail, and keep money, eligibility policy and fees in rules that compliance can audit.

| Job | Approach | Why |
|---|---|---|
| Mapping a free-text, Hinglish business description ("main Instagram pe handmade jewellery bechti hoon") to a category and eligibility status | **AI** | A dropdown forces the merchant to know Razorpay's taxonomy; the long tail of descriptions cannot be enumerated |
| Reading names from PAN, Aadhaar and bank-proof photos | **AI (vision)** | Documents vary in layout, quality and format |
| Reconciling name variants (surname-first ordering, missing middle names, initials, transliterations such as Lakshmi/Laxmi) and predicting penny-drop failure | **AI** | Exact-string matching is precisely what fails today |
| Explaining results in the merchant's language | **AI** | Plain Hinglish/English, matched to the merchant |
| Category policy (supported / needs review / not supported) | **Rules** | Owned by Compliance; must be auditable; AI only maps *into* the table |
| Fees and cost breakdown | **Rules** | Money must be exact |
| KYC path (instant via CKYC vs. Video KYC) | **Rules on a mocked lookup** | Deterministic given the registry result |

### 6.3 Guardrails built into the prompts
- AI **explains and prepares; it never approves**.
- For a not-supported category, AI states this honestly and **never suggests a workaround** or a re-description.
- Low-confidence results are shown as "needs review", not as a pass.
- No document editing or generation. Sample documents in the demo are watermarked specimens for a fictional merchant.

### 6.4 Architecture decision: a real app, not a mock
- **First pass (AI):** a single-file interactive web prototype, built in about 20 minutes, which validated the flow, copy and AI prompts.
- **My decision:** I raised the bar. A clickable mock proves the idea; a working app proves I can ship. I set two requirements: judges must be able to test it with zero friction, and it must be a real installable mobile app.
- **Resulting architecture (AI proposed, I approved):**

  | Need | Choice | Why |
  |---|---|---|
  | One codebase for Android, iOS and web | Expo (React Native), SDK 57 | Native app plus a web link for judges who won't install anything; same code, same behaviour |
  | Keep the API key off the device | Serverless API on Vercel (`/api/classify`, `/api/names`, `/api/health`) | A key shipped inside an app can be extracted; the server is the only place it lives |
  | Demo must never break on stage | Recorded responses from the same prompts as a fallback, plus a Live/Recorded switch | Live AI when the network is good; deterministic replay for the 90-second video |
  | Installable on Android today | EAS cloud build producing an APK | No Play Store review needed for judges to install |
  | Show judges what is AI vs rules vs mocked | "Behind the screen" panel with a call log of every AI output, rule decision and mocked lookup | Makes the product reasoning inspectable, not just the UI |

- **Scope I explicitly kept mocked:** KYC registry lookup, penny drop and payment. No public API exists for these, and faking them convincingly would misrepresent what the prototype proves.
- **Store reality I accounted for:** Google Play requires new personal developer accounts to run a 14-day closed test with at least 12 testers, and an app listed under Razorpay's name would be rejected on trademark grounds. So the plan is web link plus APK for judging, with store submission afterwards under my own brand.

### 6.5 Build entries (13 Oct)

| Time (IST, approx.) | What was built | Who decided what |
|---|---|---|
| 10:30 | Design tokens taken from Razorpay's open-source Blade repository (azure brand, blue-gray neutrals, emerald, cider and crimson feedback colours) | Me: build in Razorpay's visual language; light and dark themes |
| 10:35 | Web prototype of the full flow with live AI | AI built; I reviewed flow and copy |
| 10:40 | Pivot to native app (see 6.4) | Me |
| 10:45 | Expo project scaffolded; specimen documents generated for a fictional seller, each watermarked "SPECIMEN · NOT VALID" | Me: persona design. Priya Lakshmi Reddy has a surname-first Aadhaar and a bank account missing her middle name, the two name traps the evidence pointed to |
| 10:50 | Server API: prompts, JSON parsing, input limits, policy-ID validation | Me: the server rejects any category the policy table doesn't contain, so the model can't invent a new category |
| 10:55 | App screens, English and Hinglish copy, readiness gate, judges' panel | AI built; I set the gating rule: any red item disables payment |
| 11:00 | Photo capture with on-device resizing (about 1,200 px JPEG) before upload | Me: keeps three photos under the server's request limit and protects users on slow data |
| 11:05 | Verification: TypeScript typecheck clean; web production build succeeds; API tested against a simulated model for missing key (503 and fallback), Hinglish prompting, an invented category ID (forced to "other"), three-image vision payload and malformed input (400) | AI ran the tests; I defined the failure cases worth testing |

### 6.6 In-product prompts (abridged)

**Classification** (`api/_lib/claude.js`)
> "Map the seller's own description (English, Hindi, Hinglish or Telugu) to exactly one policy_id from the table … The table's status column decides eligibility, not you … If the status is not_supported, say so plainly and kindly. Never suggest how to re-describe or restructure the business to fit another category … Do not use jargon like MCC, CKYC or KYB."

**Name check (vision)**
> "Treat the PAN name as the legal name. Compare the Aadhaar name and the bank account name with it, the way a bank name-match check would: same words in a different order: match … a whole word missing … for the bank account this is likely_fail, because the ₹1 penny-drop check compares the bank's account name with the PAN name … Never suggest altering, editing or creating a document."

*Design choice:* both prompts make the model **classify and explain**, while the decision stays in auditable rules. This is the pattern I would propose for any AI feature that sits next to compliance.

### 6.7 Design review and rebuild (13 Oct, ~12:00–13:00 IST)
- **Trigger (my review):** I reviewed the first deployed build and rejected it. It read as a debug dashboard, not a merchant product: the judges' panel took half the screen, the first screen stacked five blocks of text before any action, the fee led before the value, and nothing felt native to a phone.
- **My direction:** one question per screen; fee as a reassurance, not a headline; a single memorable product moment; judges' material moved behind a "How it works" control.
- **Skills used:** `frontend-design` (visual direction and anti-template checks), `design:ux-copy` (sentence-case, verb-led buttons, error copy that says what to do), with Razorpay's Blade palette as the base.
- **What changed:**

  | Before | After | Why |
  |---|---|---|
  | Wide panel next to a stretched "phone" | Real 390 px phone frame; judges' panel in a sheet | Track 1 is a mobile experience; judges should see the product first |
  | Five text blocks on the first screen | Title, one sentence, a preview of the pass, three reasons, one button | Progressive disclosure; the fee moved into "What does ₹199 cover?" |
  | Plain list of name verdicts | Word-by-word name view: each document's name as printed, matched words green, the missing word struck through in red | The merchant sees exactly which word breaks the ₹1 bank check, the core "aha" |
  | A readiness checklist | A **go-live pass** (boarding-pass metaphor for "Pre-flight") with stamps that land one by one; a red stamp is tappable and jumps to the fix | One orchestrated motion moment; the pay button unlocks only when every stamp passes |
  | System font, bordered cards everywhere | TASA Orbiter headings (Blade's display face), Inter body, IBM Plex Mono for document names and pass codes; navy reserved for the pass only | Restraint everywhere except the one bold element |
  | Scanning had no feedback | Animated scan line across the document thumbnails while AI reads | Sets expectations during the 3–8 s vision call |

- **Verification method:** I gave Claude access to my browser (Claude in Chrome) so it could open the live deployment, click through every step, screenshot each screen and critique it. That loop caught three issues a code review would not: the phone frame overflowing a laptop viewport and hiding the main button, truncated merchant and shop names on the pass, and the Aadhaar name being shown in PAN order rather than as printed.
- **Production finding:** the same browser check showed live AI calls failing because the API key was not scoped to a workspace. The app's recorded-response fallback had hidden this from the UI, which validated the fallback design; the "How it works" call log records every fallback with the error, so judges can always tell live from recorded. Fix: support the `anthropic-workspace-id` header via an environment variable, and recreate the key inside a workspace.
- **Reliability fix found in user testing (12:30):** a real Hinglish description ("achaar shop… delhivery se ship") failed while others passed. The call log showed the model's reply wasn't valid JSON. I switched both AI calls from "reply with JSON" prompting to **forced structured output** (the model must answer through a tool whose input schema is the exact shape we need, with the category ID restricted to the policy table's values). The same description now classifies correctly as home-made food, supported, with FSSAI added by the rules. Lesson: for anything a product depends on, constrain the model's output format, don't just ask for it.

### 6.8 From a form to an engine (13 Oct, 17:15–19:30 IST)

- **Trigger (my review):** I was not convinced by my own prototype. Every hard part of the problem was hidden behind a mock or a hardcoded table: 16 categories where Razorpay has hundreds, a Levenshtein check standing in for name matching, a confidence number nobody used, and no evidence that any of it worked. A reviewer who knows the domain would see that in thirty seconds. The fix was not more features; it was to build the parts that are actually hard and measure them.
- **AI:** Drafted each component to my spec; proposed the eval-set structure; generated the 304 name pairs from transformations I named.
- **Me:** Chose what counts as hard, wrote every status rule and threshold, labelled the 146 category cases by hand, and decided what the scorecard measures.

**What was built**

| Component | Before | After |
|---|---|---|
| Policy taxonomy | 16 rows I made up | Razorpay's published onboarding taxonomy (18 categories, 340 sub-categories) with a status per row. Status rules live in `shared/build-taxonomy.js` and cite Razorpay's Terms Part A §17 (45 prohibited items) so a reviewer can audit each one: 25 blocked, 74 reviewed by a human, 241 supported |
| Category classification | One prompt, the model picks from 16 | Retrieval → constrained choice → decision policy. A BM25 retriever with a Hinglish lexicon picks 8 candidates; the model's answer is *schema-constrained to those ids*; a fixed policy turns confidence into **decided / ask one question / reviewer decides**. The UI shows what was considered. Pure Hindi or Telugu text is glossed to English first, because the keyword index is Latin |
| Clarifying question | None | The model asks exactly one question when the verdict depends on an unstated fact (real-money vs free, real vs imitation, own goods vs reselling, fixed price vs pay-what-you-want). It never asks twice |
| Name matching | Levenshtein ≤ 2 and an initials check | `shared/namematch.js`, the same code on the phone and the server: Unicode normalisation; Devanagari and Telugu transliteration; honorifics, relation suffixes (S/O, W/O) and common abbreviations (MOHD, KR); an Indian-name phonetic key (Lakshmi/Laxmi, Kavita/Kavitha); order-free alignment (exact > phonetic > fuzzy > initial); a score with documented weights; verdicts at thresholds 0.85 / 0.60. Firm words in the account name (& SONS, ENTERPRISES) route to a reviewer instead of passing |
| Division of labour | Blurred | **The model reads; the rules decide.** The server overwrites the model's verdict with the engine's and logs every disagreement |
| Evidence | Three preset sellers | Two labelled sets shipped inside the app, with a scorecard a judge can run live |

**What the eval changed.** The name set's first run scored 92% with 22 false passes, all in the dangerous direction: an initial for the *given* name ("P LAKSHMI REDDY") and an extra surname ("ANJALI VERMA MISHRA") both passed. Two weight changes (a first-name initial counts 0.45 not 0.6; an extra name word costs 0.16, an extra initial 0.03) took it to 303/304, with 0 false passes and 0 false fails. The one remaining miss is a Telugu single-letter initial, which I left as an honest limit.

**First live run of the category set (146 cases, claude-haiku-5-5):** 83.6% told the right status; **0 of 76** blocked-or-reviewed cases told "supported"; **0 of 70** supported cases told "not supported"; **14 of 14** adversarial re-descriptions caught; 26% asked a question or deferred to a reviewer rather than guessing. All 24 misses were over-cautious: five were pure Devanagari or Telugu descriptions that never reached the Latin index (fixed with the gloss step), the rest were supported rows deferred because a *weak* retrieval alternative had a different status (fixed: "mixed" now needs a strong alternative). The questions it asked were the right ones: "Is it a real-money game where players deposit cash and win cash back, or free to play?"

**Second run (after the two fixes):** 87.7% right, recall@8 93.2%, but **one false green**: "Beverage shop selling premium imported spirits for gifting" was told "supported" as *Gifting*, because "spirits" was not a liquor keyword and the blocked row never became a strong alternative. I treated that one case as more important than the four-point accuracy gain, and added a deterministic **blocked-term tripwire**: if words from a blocked domain appear and the chosen row is "supported", a human decides. It never blocks a seller; it only withholds the green stamp.

**Third run (final):** **91.1%** told the right status; **0 of 76** false green; **0 of 70** false red; **14 of 14** adversarial caught; retrieval recall@8 **94.5%**; 21% asked or deferred. The remaining 13 misses are all over-cautious deferrals of supported or blocked cases to a reviewer.

| Run | Right status | False green | False red | Adversarial caught | Deferred |
|---|---|---|---|---|---|
| 1 | 83.6% | 0 / 76 | 0 / 70 | 14 / 14 | 26% |
| 2 (gloss + strong-alternative rule) | 87.7% | **1** / 76 | 0 / 70 | 13 / 14 | 23% |
| 3 (+ blocked-term tripwire) | 91.1% | 0 / 76 | 0 / 70 | 14 / 14 | 21% |

**Caveats I state to judges.** Both sets were written by me, so these are regression numbers, not a field measurement. The thresholds were tuned on the same sets. The model's confidence clusters at 0.6–0.7 even on clear cases, so the decision policy, not the model, is what keeps false greens at zero.

**Integration contracts.** The three mocked systems (CKYC registry search, bank-account validation with a name-match score, fee capture) now sit behind adapters that carry the real request/response shapes, drawn from public documentation. The call log shows each request and response, so the trust boundary is visible: AI reads, rules decide, external systems verify.

**Why this matters for the product.** The ₹199 gate is only the first place this engine ships. The same taxonomy, retriever and name engine are what a reviewer tool, a clarification flow and a fee-credit promise would run on. The prototype now demonstrates the hard parts rather than hiding them.

### 6.9 Coverage check and interaction rewrite (13 Oct, 18:30–19:40 IST)

- **Trigger (my review):** Does Pre-flight cover the *whole* onboarding, or only the part my own audit reached before it stopped at "legitimate business required"? I mapped the full process from Razorpay's mobile-app docs plus what reviews, YouTube and Reddit add (the docs omit the ₹199 fee, Video KYC and the clarification loop). Twelve steps. Pre-flight covered 2, 3, 5, 7, 8. Step 9, the website policy-page review, was the gap my audit had hit, and it is where "add a page every few days" comes from.
- **Built:** step 9 as a live check. The site is fetched the way a reviewer would open it, links are read, and the five pages reviewers require (terms, privacy, refund, shipping for goods, contact) are each confirmed to load with real text. Social-only sellers skip it. Pay-what-you-want and donation wording is flagged. Rules only; no model.
- **Bug fixed from my own test:** a bank account missing a middle name scored "review" and the pass still allowed payment. The bank name is what the ₹1 check compares against PAN, and the seller can fix it cheaply, so any bank result short of a match now blocks the pay button. An Aadhaar doubt goes to a reviewer instead.
- **Interaction rewrite:** step 1 was one screen with a text box, examples, results and a website panel stacked. It now asks one thing at a time (what you sell → one clarifying question if needed → where customers pay you → website link), and each answered question collapses to a row the seller can tap to change.
- **Voice:** a mic on every text field through the browser's speech recognition (en-IN, hi-IN), free and on-device, because many first-time sellers would rather speak Hinglish than type it. A server adapter for Gnani ASR sits behind the same interface; the key lives only in the server environment.
- **Steps 10 and 12** (clarification rounds after submission; post-activation holds) are deliberately out of scope and named as the next product in the note.
