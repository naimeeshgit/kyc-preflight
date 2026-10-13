# KYC Pre-flight: demo video guide

Razorpay × ISB AI PM Build Challenge, Track 1: Razorpay in Your Pocket
Naimeesh Tiwari, ISB PGP Co'27 · Prototype: https://kyc-preflight.vercel.app
Code, product note and AI build log: https://github.com/naimeeshgit/kyc-preflight

## The user problem

Priya makes jewellery at home and sells on Instagram. To accept payments through Razorpay she pays a ₹199 + GST KYC fee before any check runs. Problems then arrive one at a time, days apart: a restricted category, a bank name that doesn't match her PAN, a missing registration, a video KYC call she didn't know about, or a reviewer who can't tell from her Instagram whether her business is real. The complaint we heard most across nine research methods was "paid, then rejected, no reason".

## The idea

KYC Pre-flight runs every check a Razorpay reviewer will do before she reaches the pay button, inside the merchant app, in about two minutes. The model reads her words, documents and photos. Fixed rules make every decision. Payment stays blocked while anything is red, and an in-app assistant helps her fix each gap.

## What the product is

KYC Pre-flight is a step inside the Razorpay merchant app that runs before the KYC fee. In about two minutes it checks, one question at a time: whether her business category is allowed, which documents she needs for how her business is set up, whether her KYC will be instant or need a video call, whether the names on her PAN, Aadhaar and bank account will match, whether her Instagram, catalog and invoice tell a consistent story, and whether her website has the five policy pages. She ends with a go-live pass with one stamp per check. Payment stays blocked while anything is red. An in-app assistant drafts what is missing (a refund policy, a bank letter, answers for the reviewer), and Razorpay's reviewer receives a pre-checked case file.

## Architecture

- App: Expo / React Native, running on the web (react-native-web) and deployed on Vercel.
- Server: Vercel serverless functions. The Anthropic API key lives only in server environment variables.
- Model: Claude Haiku through the Anthropic Messages API, always with forced tool calls and fixed output schemas.
- Category check: a BM25 retriever picks 8 of Razorpay's 340 published sub-categories (25 blocked, 74 reviewed by hand). The model may choose only among those 8. A deterministic policy then decides: supported, ask one question, or send to a human reviewer (confidence threshold, mixed-candidate check, blocked-term tripwire).
- Document plan: a rule table by entity type (individual, proprietor, partnership, company) plus category extras such as FSSAI.
- KYC route: a registry adapter (CKYC, mocked) returns instant or video call.
- Names: the model reads PAN, Aadhaar and bank proof; a deterministic name engine (word order, initials, honorifics, Devanagari and Telugu transliteration, phonetic keys) decides the match. Any bank result short of a match blocks payment.
- Proof of business: the model extracts only visible facts from images; rules cross-check name, owner, products, prices and contact across sources.
- Website: fetched server-side and checked for terms, privacy, refund, shipping and contact pages.
- Assistant: grounded in her case object; never predicts approval, never helps reword a blocked business, never explains risk signals.
- Evals: 146 labelled business descriptions and 304 name pairs, runnable in the app.

## What the video shows

| Time | On screen | What it shows |
|---|---|---|
| 0–7 s | Landing page | The problem: pay first, find out later |
| 7–17 s | Category check | Her description matched to Razorpay's 340 published categories; the model picks, rules decide |
| 17–30 s | Document plan | A list built for a proprietor with no registration; Udyam flagged as missing, with how to get it; the assistant answers in context |
| 30–36 s | Plan updated | She registers; the plan is complete |
| 36–44 s | KYC route | Not in the registry, so a video call; she books a slot before paying |
| 44–56 s | Name match | PAN, Aadhaar and bank proof read; bank name missing "Lakshmi"; she switches accounts and it passes |
| 56–68 s | Proof of business | Instagram, catalog and invoice cross-checked; a wrong catalog is caught (different business name, vape products) |
| 68–80 s | Go-live pass | One open item, pay blocked; the reviewer's pre-checked case file |
| 80–90 s | Results | Zero blocked businesses told "supported", zero false name passes |

## What makes it work

- The model reads and writes; rules decide eligibility, documents, name verdicts and consistency.
- When unsure, it asks one question or sends the case to a human instead of guessing.
- It explains requirements, never risk signals.
- Tested on 146 business descriptions and 304 name pairs that I wrote, so these are regression numbers, not field data.

## Not shown or not built

Registry, bank penny drop and payment calls are mocked. Demo stores and documents are fictional. AI approvals and workarounds for restricted categories are deliberately left out.
