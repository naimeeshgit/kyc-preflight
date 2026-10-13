# KYC Pre-flight — one-page product note

**Razorpay × ISB Build Challenge · Track 1: Razorpay in Your Pocket**
Naimeesh Tiwari, PGP Co'27 · Prototype: https://kyc-preflight.vercel.app · Code: github.com/naimeeshgit/kyc-preflight

## The merchant

Priya runs a jewellery page on Instagram from Hyderabad. No GST, no website, orders on WhatsApp. She wants to stop sharing a UPI screenshot and send a Payment Link instead. She signs up on the Razorpay app on her phone, in Hinglish, between orders. She has never heard the words MCC, CKYC or penny drop.

## What happens today, and where it breaks

Razorpay's own docs list the steps: account → business overview → PAN and address → bank → Aadhaar eKYC → review (~3 working days) → clarifications on the web dashboard → activation. Three things the docs don't say, and merchants learn after the fact: a ₹199 + GST KYC fee is charged **before** any check; if she isn't in the CKYC registry she needs a **Video KYC** call (physical PAN, pen, morning slots); and if she takes payments on a website, reviewers reject it without **five policy pages**.

Nine evidence streams (merchant conversations, a live audit as an applicant, an AI agent as a novice, app-store and Trustpilot reviews, 16 Reddit threads, YouTube, Razorpay and RBI docs, 8 competitors) converged:

> Merchants don't mind filling forms. They mind paying ₹199 and then being rejected, or delayed, for a reason they could have been told on day one.

The most repeated complaint across every channel is "paid, then rejected, no reason". Requirements arrive one at a time, days apart. One merchant spent four months on a missing middle name. Trustpilot sits at 1.4/5 with KYC and holds as the dominant themes. Cashfree, PayU and PhonePe charge no onboarding fee.

**The core problem.** "Legitimate business required" is not a field. For a seller with no certificate, a reviewer opens her Instagram, catalog and invoices by hand and asks whether the name, the owner, the products and the prices agree with what she declared. She can't see that test until after she pays, and the reviewer rebuilds it from scratch for every application.

## The product

**Razorpay tells her everything a reviewer will check, checks it, and helps her fix it before the pay button. One question at a time, about 2 minutes, in the merchant app.**

1. **Category.** She describes what she sells, by voice or text, in Hinglish. A retriever picks 8 of Razorpay's 340 published sub-categories (25 blocked, 74 human-reviewed), the model chooses only among those, and a fixed policy decides: *decided / ask one question / a reviewer decides*. Blocked means no fee, ever.
2. **Her document plan.** Two taps (how the business is set up; which registrations she has) give a list built for her: different for an individual, a proprietor, a partnership or a company, plus category extras such as FSSAI. Each gap says how to close it ("Udyam: 10 minutes, free, online").
3. **KYC route.** A consented registry lookup says instant or video call. If video, she sees what to keep ready and books a slot now.
4. **Names.** The model reads PAN, Aadhaar and bank proof; a deterministic engine (order, initials, honorifics, Devanagari and Telugu, phonetic variants) scores the match the way the ₹1 bank check will.
5. **Proof of business.** She adds her Instagram, catalog and one invoice. The model extracts facts only; a rules engine cross-checks business name, owner, products, prices and contact across every source, the way a reviewer would, and flags restricted items or a different business name.
6. **Website**, if she sells on one: fetched as a reviewer would and checked for the five policy pages.

The result is a go-live pass with a stamp per check. A red stamp jumps to its fix, **done inside the app**: a missing policy page is written for her business; a bank name mismatch produces the branch letter; a category needing review gets the reviewer's likely questions with her answers pre-filled. Payment is possible only when nothing is red. **Razorpay's reviewer receives a case file**: entity, category row and alternatives, documents, name scores, the consistency grid, and open items first. The seller gets certainty; Razorpay gets a first-time-right application.

## Why mobile, and why in the app

Onboarding already happens on the phone for this segment, and her proof (Instagram, WhatsApp catalog, invoice photos) lives on that phone. The checks need the camera, the mic (Hinglish), and the moment just before the fee.

## Key decisions

- **The model has two jobs with two guardrails.** Reading (category, document names): schema-constrained, and the rules decide. Writing (policy pages, reviewer answers): every draft is labelled, uses [brackets] for anything unknown, invents no registrations, and never changes a verdict. The branch letter needs no model at all.
- **The model reads; rules decide.** Eligibility comes from the taxonomy row, documents from an entity table, name verdicts from the engine, business consistency from cell-by-cell rules. The model is never asked whether a business is "legit"; it reports what is written.
- **Ask or defer rather than guess.** 21% of test cases get one clarifying question or go to a human. A blocked-term tripwire withholds a green stamp whenever a blocked domain is mentioned.
- **Explain what, never why.** AML tipping-off rules forbid revealing risk signals. Pre-flight explains requirements only, which is also why this is harder than "better error messages" and why it hasn't shipped.
- **Measured.** Two labelled sets ship inside the app and a judge can run the category set live: 146 descriptions (EN, Hinglish, Telugu, vague, adversarial) → 90–91% told the right status across runs, 0/76 false green, 0/70 false red, 14/14 adversarial caught; 304 name pairs → 303 correct, 0 false passes. Author-written sets, so regression numbers, not field data.

## Deliberately not built

AI approvals or risk decisions; workarounds for restricted categories; the clarification loop after submission (the next product on this engine); settlement holds after activation; real CKYC, penny-drop and payment integrations (adapters carry the real request/response shapes; the calls are mocked).

## How we'd measure it

**North star:** first-time-right activation, the share of paid KYC applications activated on first submission. **Guardrails:** fraud and chargeback rate of activated merchants flat against a holdout; ₹199-paid-then-rejected rate, onboarding tickets and clarification rounds per application fall. **Proposed commitment:** credit the ₹199 if Pre-flight said "pay" and the reviewer rejects, so precision-of-green is what the team answers for. Hypothesis to test: 1–2 weeks of activation time saved for the 30–40% who would hit a failure, at a cost of 2 minutes for everyone, plus fewer reviewer touches per application.

## How AI was used to 10x the build

Seven cited research reports, a Chrome agent that audited the live flow, 16 Reddit threads coded by theme, and a prototype with live AI, a 340-row taxonomy, a name engine, a consistency engine and an eval harness, built solo alongside an MBA term. The build log records every pivot, including the ones I rejected and why.
