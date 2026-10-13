# KYC Pre-flight: demo video guide

Razorpay × ISB AI PM Build Challenge, Track 1: Razorpay in Your Pocket
Naimeesh Tiwari, ISB PGP Co'27 · Prototype: https://kyc-preflight.vercel.app

## The user problem

Priya makes jewellery at home and sells on Instagram. To accept payments through Razorpay she pays a ₹199 + GST KYC fee before any check runs. Problems then arrive one at a time, days apart: a restricted category, a bank name that doesn't match her PAN, a missing registration, a video KYC call she didn't know about, or a reviewer who can't tell from her Instagram whether her business is real. The complaint we heard most across nine research methods was "paid, then rejected, no reason".

## The idea

KYC Pre-flight runs every check a Razorpay reviewer will do before she reaches the pay button, inside the merchant app, in about two minutes. The model reads her words, documents and photos. Fixed rules make every decision. Payment stays blocked while anything is red, and an in-app assistant helps her fix each gap.

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
