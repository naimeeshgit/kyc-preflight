# KYC Pre-flight

Razorpay × ISB AI PM Build Challenge, Track 1: Razorpay in Your Pocket  
Naimeesh Tiwari, ISB PGP Co'27 · Prototype: kyc-preflight.vercel.app · Code: github.com/naimeeshgit/kyc-preflight

## The user

Priya makes kundan jewellery at home in Hyderabad and sells on Instagram and WhatsApp. She has a PAN, an Aadhaar and a savings account, no GST and no website, and wants Payment Links instead of UPI screenshots. She signs up on her phone, in Hinglish, between orders.

## The problem

Razorpay charges a ₹199 + GST KYC fee (₹234.82) before any check runs. Then the application meets checks she could not see in advance: whether her category is allowed, whether her bank account name matches her PAN, whether she is in the CKYC registry or needs a video call, whether her website has five policy pages, and whether her business looks real to a reviewer who opens her Instagram and catalog by hand. Each problem arrives separately, days apart, by email.

Nine research methods (merchant conversations, a live audit as an applicant, an AI agent as a novice, reviews, 16 Reddit threads, YouTube, Razorpay and RBI documents, eight competitors, tests of our own engine) pointed to one finding: merchants accept forms; they resent paying and then being rejected or delayed for a reason they could have been told on day one. Trustpilot sits at 1.4/5 with KYC and fund holds as the main themes.

## The product

Pre-flight runs everything a reviewer will check before the pay button, inside the merchant app, one question at a time, in about two minutes.

1. Category. She types or says what she sells. A retriever picks 8 of Razorpay's 340 published sub-categories (25 blocked, 74 reviewed by hand), the model chooses only among those, and fixed rules decide. When the answer depends on something she has not said, it asks one question. A blocked business is told before any fee.
2. Document plan. Two taps (how the business is set up, which registrations she has) produce a list built for her: different for an individual, a proprietor, a partnership or a company, with category extras such as FSSAI. Each gap shows how to close it ("Udyam: about 10 minutes, free"), and she can upload the certificate in the app.
3. KYC route. A consented registry lookup says instant or video call. If it is a call, she sees what to keep ready and books a slot now.
4. Names. The model reads PAN, Aadhaar and bank proof. A deterministic engine (word order, initials, honorifics, Devanagari and Telugu, phonetic variants) scores the match the way the ₹1 bank check will and names the cheapest fix.
5. Proof of business. She adds her Instagram, catalog and one invoice. The model extracts facts; rules cross-check business name, owner, products, prices and contact across sources, and flag restricted items or a different business name.
6. Website, if she has one: fetched as a reviewer would and checked for terms, privacy, refund, shipping and contact pages.

Everything ends in a go-live pass with a stamp per check. Payment stays blocked while anything is red. An in-app assistant knows her case and drafts what is missing (a refund policy, a bank letter, answers for the reviewer). It asks one short question at a time with tap answers, and every draft must have its blanks filled before she can attach it. Razorpay's reviewer receives a case file with open items first, every source and every score.

## Why mobile

Her proof already lives on her phone (Instagram, catalog, invoice photos), and the checks need the camera, the mic for Hinglish, and the moment just before the fee.

## Key decisions

The model reads and writes; rules decide. Eligibility comes from the taxonomy row, documents from an entity table, name verdicts from the engine, business consistency from cell-by-cell rules. The model is never asked whether a business is legitimate.

Ask or defer before guessing. About 21% of test descriptions get a question or go to a human, and a blocked-term tripwire withholds a green stamp when a blocked domain is mentioned.

Explain the requirement, never the risk signal. Anti-money-laundering rules forbid telling a merchant what triggered a risk flag, which is why "better error messages" is harder than it sounds and why the assistant refuses to help reword a blocked business.

Measured. Two labelled test sets ship in the app and anyone can run the category set live. 146 descriptions (English, Hinglish, Telugu, vague, adversarial): 90 to 91% told the right status across runs, 0 of 76 blocked or reviewed businesses told "supported", 0 of 70 supported businesses told "not supported", 14 of 14 adversarial rewordings caught, every miss a cautious deferral. 304 name pairs: 303 correct, 0 false passes. I wrote both sets, so these are regression numbers, not field data.

## How we would measure it

North star: share of paid KYC applications activated on first submission. Guardrails: fraud and chargeback rates of activated merchants flat against a holdout; paid-then-rejected rate, clarification rounds and onboarding tickets falling. Proposed commitment: refund the ₹199 if Pre-flight said "pay" and the reviewer rejects for a reason it should have caught, which makes the accuracy of green the number the team owns.

## Not built

AI approvals or risk decisions, workarounds for restricted categories, the clarification loop after submission, settlement holds, and real CKYC, penny drop and payment calls (adapters carry the real shapes; calls are mocked). The AI build log covers how AI was used and every pivot.

