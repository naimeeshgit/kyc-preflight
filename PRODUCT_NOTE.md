# KYC Pre-flight — one-page product note

**Razorpay × ISB Build Challenge · Track 1: Razorpay in Your Pocket**
Naimeesh Tiwari, PGP Co'27 · Prototype: https://kyc-preflight.vercel.app · Code: github.com/naimeeshgit/kyc-preflight

## The merchant

Priya runs a jewellery page on Instagram from Hyderabad. No GST, no website, orders on WhatsApp. She wants to stop sharing a UPI screenshot and send a Payment Link instead. She signs up on the Razorpay app on her phone, in Hinglish, between orders. She has never heard the words MCC, CKYC or penny drop.

## What happens today, and where it breaks

Razorpay's own docs list the steps: account → business overview → PAN and address → bank → Aadhaar eKYC → review (~3 working days) → clarifications on the web dashboard → activation. Three things the docs don't say, and merchants learn after the fact: a ₹199 + GST KYC fee is charged **before** any check; if she isn't in the CKYC registry she needs a **Video KYC** call (physical PAN, pen, morning slots); and if she takes payments on a website, reviewers reject it without **five policy pages**.

Nine evidence streams (merchant conversations, a live audit as a real applicant, an AI agent as a novice user, Play Store and Trustpilot reviews, 16 Reddit threads, 4 YouTube tutorials, Razorpay docs and RBI directions, 8 competitors, and testing the engine on real inputs) converged on one finding:

> Merchants don't mind filling forms. They mind paying ₹199 and then being rejected, or delayed, for a reason they could have been told on day one.

The most repeated complaint across every channel is "paid, then rejected, no reason". Requirements arrive one at a time, days apart. One merchant spent four months on a missing middle name. Trustpilot sits at 1.4/5 with KYC and holds as the dominant themes. Cashfree, PayU and PhonePe charge no onboarding fee.

## The product

**Four checks before the pay button, one question at a time, about 90 seconds, in the merchant app.**

1. **Category.** She describes what she sells, by voice or text, in Hinglish. The description is matched against Razorpay's published onboarding taxonomy (340 sub-categories; 25 blocked under Terms §17, 74 human-reviewed). A retriever picks 8 candidates, the model chooses only among those, and a fixed decision policy turns confidence into *decided / ask one question / a reviewer decides*. Blocked means no fee, ever.
2. **KYC route.** A consented registry lookup says instant or video call. If video, she sees what to keep ready and books a slot now.
3. **Names.** The model reads PAN, Aadhaar and bank proof; a deterministic engine (order, initials, honorifics, abbreviations, Devanagari and Telugu, Indian phonetic variants) scores the match the way the ₹1 bank check will, and names the cheapest fix.
4. **Website.** If she'll take payments on a site, it's fetched the way a reviewer opens it and checked for terms, privacy, refund, shipping and contact pages.

The result is a go-live pass with four stamps. A red stamp jumps to its fix. Payment is possible only when nothing is red.

## Why mobile, and why in the app

Onboarding already happens on the phone for this segment; clarifications today happen on the web dashboard, which is why they take days. The checks need the camera (documents), the mic (Hinglish), and the moment just before the fee.

## Key decisions

- **The model reads; rules decide.** Eligibility comes from the taxonomy row, verdicts from the name engine, fees from a table. The model's verdict is overridden when the engine disagrees, and every disagreement is logged.
- **Ask or defer rather than guess.** 21% of test cases get one clarifying question or go to a human. A blocked-term tripwire withholds a green stamp whenever a blocked domain is mentioned.
- **Explain what, never why.** AML tipping-off rules forbid revealing risk signals. Pre-flight explains requirements only, which is also why this is harder than "better error messages" and why it hasn't shipped.
- **Measured.** Two labelled sets ship inside the app and a judge can run the category set live: 146 descriptions (EN, Hinglish, Telugu, vague, adversarial) → 91.1% told the right status, 0/76 false green, 0/70 false red, 14/14 adversarial caught; 304 name pairs → 303 correct, 0 false passes. Author-written sets, so regression numbers, not field data.

## Deliberately not built

AI approvals or risk decisions; workarounds for restricted categories; the clarification loop after submission (the next product on this engine); settlement holds after activation; real CKYC, penny-drop and payment integrations (adapters carry the real request/response shapes; the calls are mocked).

## How we'd measure it

**North star:** first-time-right activation, the share of paid KYC applications activated on first submission. **Guardrails:** fraud and chargeback rate of activated merchants flat against a holdout; ₹199-paid-then-rejected rate, onboarding tickets and clarification rounds per application fall. **Proposed commitment:** credit the ₹199 if Pre-flight said "pay" and the reviewer rejects, which makes precision-of-green the metric the team is accountable for. Hypothesis to test with real merchants: 1–2 weeks of activation time saved for the 30–40% who would otherwise hit a category, name, website or Video KYC failure, at a cost of 90 seconds for everyone; every week matters because the 0%-fee-for-90-days offer starts at activation.

## How AI was used to 10x the build

Seven cited research reports, a Chrome agent that audited the live flow with hand-offs at every sensitive step, YouTube transcript mining, 16 Reddit threads coded by theme, and a prototype with live AI, a 340-row taxonomy, a shared name engine and an evaluation harness, in one solo build week alongside an MBA term. The full build log records every pivot, including the two I rejected (an agentic dashboard; a trust ladder) and why.
