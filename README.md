# KYC Pre-flight

**Know you'll pass before you pay ₹199.** A concept for the Razorpay merchant app (Razorpay × ISB Build Challenge, Track 1). A new seller runs three checks in about 90 seconds and pays the KYC fee only when they pass:

1. **Category**: describe the business in your own words (English or Hinglish). AI maps it to the category policy; the policy decides eligibility.
2. **KYC route**: instant via the KYC registry, or Video KYC, with what to keep ready and a slot booked now.
3. **Names**: AI reads PAN, Aadhaar and bank proof photos and predicts whether the ₹1 penny-drop name check will pass, with a fix if it won't.

Concept prototype, not a Razorpay product. Registry lookup, penny drop and payment are mocked.

## What's real and what's mocked

| Part | How it works |
|---|---|
| Business description → category | **Live AI** (Claude) mapping into a fixed policy table |
| Eligibility, documents, fees, readiness gate | **Deterministic rules** (`shared/policy.json`, `src/data.ts`) |
| Reading names from document photos, reconciling name variants | **Live AI** (Claude vision) |
| KYC registry lookup, penny drop, payment, submission | **Mocked** |
| Fallback when the server is unreachable | Recorded responses from the same prompts |

## Stack

- **App:** Expo SDK 57 (React Native), one codebase for Android, iOS and web.
- **Server:** Vercel serverless functions in `api/` (`/api/classify`, `/api/names`, `/api/health`). The Anthropic API key lives only here.
- **Model:** `claude-haiku-5-5` by default (override with `ANTHROPIC_MODEL`).

## Deploy the web app and server (Vercel), about 10 minutes

1. Push this folder to a GitHub repository.
2. In Vercel: **Add New → Project →** import the repo. The settings in `vercel.json` are picked up automatically.
3. Before deploying, open **Environment Variables** and add `ANTHROPIC_API_KEY` (from console.anthropic.com; set a monthly spend limit there first).
4. Deploy. Open `https://<your-project>.vercel.app/api/health`; it should show `"liveAI": true`.
5. The web app is at `https://<your-project>.vercel.app`. Share this link with anyone who doesn't want to install anything.

## Try it on your phone today (Expo Go)

```bash
npm install
EXPO_PUBLIC_API_URL=https://<your-project>.vercel.app npx expo start --tunnel
```

Install **Expo Go** from the Play Store or App Store and scan the QR code.

## Build an installable Android APK (EAS, free)

1. In `eas.json`, replace `REPLACE-WITH-YOUR-VERCEL-URL` with your Vercel project name.
2. Run:

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure   # first time only
npx eas-cli@latest build -p android --profile preview
```

3. EAS prints a download link and QR code for the APK. Anyone can install it on Android (they'll allow "install from unknown sources").

## Store publishing (after the challenge)

- **Google Play:** a new personal developer account must run a closed test with at least 12 testers for 14 days before production access. Build with `--profile production` and submit with `eas submit -p android`.
- **App Store:** needs the Apple Developer Program. `eas build -p ios --profile production`, then `eas submit -p ios` to TestFlight.
- Ship under your own name and brand. Don't use Razorpay's name or logo in a store listing.

## Run the API locally

```bash
npm i -g vercel
vercel dev        # serves the web app and /api with your local env
```

## Project layout

```
App.tsx              screens, flow state, judges' "Behind the screen" panel
src/data.ts          copy (English + Hinglish), presets, recorded AI responses, fee rules
src/api.ts           client for the server API
src/ui.tsx           Blade-styled components
src/theme.ts         light and dark tokens
shared/policy.json   category policy table (shared by app and server)
api/                 Vercel functions; api/_lib holds prompts and specimen images
assets/specimens/    specimen documents for a fictional seller (not real documents)
```
