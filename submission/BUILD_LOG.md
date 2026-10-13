# AI build log: KYC Pre-flight

Razorpay × ISB AI PM Build Challenge, Track 1: Razorpay in Your Pocket  
Naimeesh Tiwari, ISB PGP Co'27 · Build window 4 to 13 October 2026  
Prototype: kyc-preflight.vercel.app · Code and full log: github.com/naimeeshgit/kyc-preflight (BUILD_LOG.md)

## 1. How I worked

I used AI as a set of specialists with defined jobs and kept every product decision with me. AI widened the search and did the grunt work; I decided what was true, what mattered and what shipped.

| Role | Tool | What AI did | What I did |
|---|---|---|---|
| Research analyst | Claude research agent | Seven cited reports: Razorpay's products and AI stack, competitor agents, onboarding pain, merchant voices after submission, competitor onboarding, regulation versus product choice, pricing fact-check | Wrote each brief, set evidence rules, rejected weak claims |
| Sparring partner | Claude chat | Scored ideas against my rubric, then attacked my favourite as a Razorpay risk PM would | Set the rubric and weights, overrode scores, chose the direction |
| Field auditor | Claude in Chrome | Walked Razorpay's live signup with me, logging every screen, error and wait; mined YouTube tutorials | Entered all personal details; the agent stopped at every OTP, upload and payment |
| Builder | Claude Code | Wrote the app, the server, the prompts, the eval harness; tested every path in the browser | Set scope, flow, guardrails and metrics; reviewed every screen; called each pivot |
| In-product AI | Claude Haiku via a small server | Reads descriptions, documents and evidence images; drafts policy pages and letters | Decided which jobs need a model and which stay as rules |

## 2. Decision timeline

Day 1 (4 Oct). I chose the Full Stack Builder track because my CS degree and agentic AI work at Walmart fit a builder PM role. When the brief arrived I saw it scopes Track 1 to the Razorpay mobile app and one task, which killed my first idea, a three-flow WhatsApp copilot.

Day 2 (5 Oct). Two research reports mapped Razorpay's 2026 AI stack and competitors' agents. My conclusion: recovery and Q&A agents are commoditised (Razorpay and four competitors shipped them between Oct 2025 and Sep 2026), so another one would recreate an existing experience, which the brief penalises.

Days 3 to 6. I fixed a weighted rubric before scoring anything (pain × frequency 20%, Track 1 fit 20%, whitespace 15%, buildable without internal data 15%, AI essential 10%, business impact 10%, judge story 10%). AI generated nine ideas and scored them; I argued several down. I proposed Hold Shield (pre-clearing settlement holds), AI found the fatal flaw (festive pre-clearance is when bust-out fraud happens), and we reframed it as Peak Pass, scored 4.4.

Day 9 (12 Oct). Before building, I spoke to merchants. Several said onboarding was the painful part: slow, requirements revealed late, restarts start over. Primary evidence beat my desk research, so I dropped Peak Pass and pivoted to onboarding. Three more research reports, a live audit of Razorpay's signup as a real applicant, YouTube transcript mining and 17 hand-collected Reddit threads followed. I chose KYC Pre-flight.

Day 10 (13 Oct). Build, test and repeated self-critique, logged in section 6.

## 3. Evidence rules

Every factual claim is cited and labelled official, merchant anecdote, third-party guide or regulator. Anecdotes describe themes, never frequencies. Company claims are labelled as claims: Razorpay's blog says name mismatches cause about 40% of onboarding delays, with no source. Conflicts are surfaced, not resolved by guessing. Regulatory claims are checked at source. Sources are checked for independence: on Reddit, 10 of 16 opening posts carry Reddit's own "AI-polished" label, and one account posted near-identical pro-Razorpay tips in three threads, so I weight those accordingly.

## 4. Nine research methods, one finding

| Method | What only it showed |
|---|---|
| Merchant conversations | The problem itself: requirements arrive late, restarts start over |
| Live audit as an applicant | The fee appears only after Submit; restricted categories carry no warning; uploads fail silently |
| AI agent as a novice | Every point where the agent had to guess is a point where a first-time seller would too |
| App store and Trustpilot reviews | Most repeated complaint: paid ₹199, then rejected with no reason |
| Reddit, 16 threads coded | Documents requested one at a time; a middle-name mismatch that took 4 months; help arrives through public posts |
| YouTube, 4 tutorials, 156+ comments | Video KYC prep (physical PAN, pen, morning slots) appears only after submission; some pay ₹300 "approval agents" |
| Razorpay and RBI documents | What is mandated (CKYC, address checks) versus what is a product choice (fee timing, hidden category rules) |
| Eight competitors | PayU, CCAvenue and PhonePe PG charge no onboarding fee; only CCAvenue flags prohibited categories up front |
| Testing my own prototype | How the AI fails, which shaped the guardrails |

The finding all nine pointed to: merchants accept forms; they resent paying and then being rejected or delayed for a reason they could have been told on day one. I kept the counter-evidence: some merchants activate in two days without trouble, so the problem is concentrated in the uncertain path (unregistered sellers, unusual business models, name and document edge cases), which is where Pre-flight works.

## 5. Where AI is used, and where it is not

The rule is that the model reads and writes, and rules decide.

| Job | Model | Rules |
|---|---|---|
| Category | Picks among 8 retrieved rows out of 340, may ask one question | Decision policy: thresholds, a mixed-candidate check, a blocked-term tripwire |
| Names | Reads PAN, Aadhaar, bank proof | Name engine scores and sets the verdict; overrides the model when they disagree |
| Business proof | Extracts facts from images | Cross-source grid decides each cell |
| Documents, route, pay gate | None | Entity table, registry adapter, fee table |
| Drafting | Writes pages, letters, reviewer answers | Blanks filled in a rule-based form; a draft can be attached only with zero blanks |

Guardrails in the prompts: forced tool output with schemas; the model never decides eligibility; it never explains risk signals (anti-money-laundering tipping-off rules); it never helps reword a blocked business (a rule answers those requests before the model sees them); drafts use [brackets] for unknowns and invent no registration numbers; the assistant states only statuses the case gives it and says plainly it cannot guarantee approval.

## 6. Build and test log (13 October)

Each entry is a problem I found by using the product myself, and what I changed.

1. A form, not an engine. My first version was a prompt and a form. I rebuilt the category check on Razorpay's published taxonomy (340 rows, 25 blocked, 74 reviewed), BM25 retrieval, a constrained model choice and a deterministic decision policy, and wrote a 146-case labelled set. Run 1 exposed two bugs (native script never reached retrieval; weak alternatives forced "mixed"); run 3 reached 91.1% with 0 false greens.
2. Names. A first-name initial and an extra surname were passing. I added weights for both; the name set reached 303 of 304 with 0 false passes.
3. The whole process. My audit had stopped at "legitimate business required", so I mapped the full twelve-step onboarding and added the missing website check (five policy pages, fetched as a reviewer would).
4. A bug from my own test. A bank account missing a middle name still allowed payment. Any bank result short of a match now blocks pay.
5. From a linter to a product. Four verdicts and "go fix it yourself" was not help. Every red stamp got an in-app fix: write the missing page, draft the branch letter, prepare reviewer answers.
6. Everyone got the same documents. I added an entity-aware document plan and the proof-of-business check: the model extracts facts from Instagram, catalog and invoice; rules cross-check name, owner, products, prices and contact. A swapped-in catalog with vapes and another business name is caught. Razorpay's reviewer receives a case file.
7. Reviewers would only see the happy path. I added a "Try" row at every input (eight category paths, two demo stores, registry, bank, evidence). Walking every path found three bugs: vapes asked a pointless question because the stemmer turned "vapes" into "vap" and missed the tobacco row; a reset button reopened an old question; a gaming preset never asked. After the fixes, recall rose from 94.5% to 95.2% and the eval held at 0 false greens and 0 false reds.
8. Too much text, a dark neon theme, and two separate tools for chat and drafting. I cut every screen to a title, a line and an action, moved to a calm light theme, and routed every "write this" button into one assistant that asks one short question at a time with tap answers.
9. Honesty checks. "Next" buttons looked like a pass with a document missing; they now say "1 open". The assistant once called names "matched" before any document was read; it now receives explicit "not checked yet" markers. Drafts count unfilled blanks.
10. Uploads that changed nothing. Attaching a draft only reached the case file. Attachments now show where they belong (a page draft marks that row "publish, then re-check"), without faking a green stamp. Filling blanks through the model was unreliable (it re-asked after "just draft it" and added new blanks), so blanks are now filled in a rule-based form inside the card, and certificates can be uploaded from the plan or the chat.

## 7. Evaluation

| Set | Size | Result |
|---|---|---|
| Category (English, Hinglish, Telugu, vague, adversarial) | 146 | 90 to 91% right across runs; 0/76 false green; 0/70 false red; 14/14 adversarial caught; recall@8 95.2%; about 21% asked or deferred |
| Name pairs | 304 | 303 correct; 0 false passes |

Both sets were written by me and the thresholds were tuned on them, so these are regression numbers, not a field measurement. Every category miss was a cautious "needs review", never a wrong green. The category set can be run live from the app.

## 8. What I rejected, and why

An agentic payments-data dashboard: Razorpay already ships one and Cashfree and PayU launched equivalents in Aug to Sep 2026, and Reddit merchants are openly cynical about AI announcements while basics fail. International card acceptance: real, but a different segment and a partner-bank decision. An AI approval engine: it would make the model the decision-maker, which is exactly the trust problem merchants describe.

## 9. What is still missing

Observed tests with real sellers. Every method above is second-hand or uses me as the applicant. Next: watch three to five sellers run Pre-flight on their own phones and record time to verdict, whether each stamp was understood, and whether they would still pay ₹199.
