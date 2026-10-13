import POLICY_JSON from "../shared/policy.json";

export type Lang = "en" | "hi";
export type Status = "supported" | "needs_review" | "not_supported";
export type Policy = { id: string; label: string; status: Status; extra?: string; resellerDoc?: boolean };
export const POLICY = POLICY_JSON as Policy[];
export const policyById = (id?: string): Policy =>
  POLICY.find((p) => p.id === id) || (POLICY.find((p) => p.id === "other") as Policy);

/* Fees: rules, not AI. */
export const FEE = 199;
export const GST = Math.round(FEE * 0.18 * 100) / 100;
export const FEE_TOTAL = Math.round((FEE + GST) * 100) / 100;
export const inr = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });

export type Flag = { severity: "info" | "warn"; text: string };
export type ClassifyAI = {
  policy_id: string; category_label?: string; sub_category?: string; confidence?: number;
  is_reseller?: boolean | null; has_gst?: boolean | null; has_website?: boolean | null;
  channels?: string[]; flags?: Flag[]; explanation?: string;
};
export type Verdict = "match" | "likely_fail" | "unclear";
export type NamesAI = {
  documents: { doc: string; name: string; readable?: boolean }[];
  comparisons: { doc: string; verdict: Verdict; reason: string; fix: string | null }[];
  summary?: string;
};

/* Demo sellers */
export const PRESETS: Record<string, { label: string; en: string; hi: string }> = {
  priya: {
    label: "Jewellery on Instagram",
    en: "I make handmade kundan and oxidised jewellery at home and sell it on Instagram and WhatsApp. No GST, no website yet.",
    hi: "Main ghar pe handmade kundan aur oxidised jewellery banati hoon, Instagram aur WhatsApp pe bechti hoon. GST nahi hai, website bhi nahi hai.",
  },
  tools: {
    label: "Tools on WhatsApp",
    en: "I resell hardware tools like drills and spanners on WhatsApp. I buy them from the wholesale market. No GST.",
    hi: "Main WhatsApp pe hardware tools resell karta hoon, drills, spanners. Wholesale market se kharidta hoon. GST nahi hai.",
  },
  astro: {
    label: "Astrology readings",
    en: "I do online astrology and kundli readings on video call. Clients pay in advance.",
    hi: "Main online astrology aur kundli reading karta hoon video call pe. Clients advance mein pay karte hain.",
  },
  vape: {
    label: "Vape refills",
    en: "I sell vape pods and e-cigarette refills on Instagram with home delivery.",
    hi: "Main Instagram pe vape pods aur e-cigarette refills bechta hoon, home delivery ke saath.",
  },
};

type Loc<T> = { en: T; hi: T };

/* Recorded AI outputs from the same prompts, used when the server is unreachable. */
export const REC_CLASSIFY: Record<string, Omit<ClassifyAI, "flags" | "explanation"> & Loc<{ explanation: string; flags: Flag[] }>> = {
  priya: {
    policy_id: "jewellery_fashion", category_label: "Fashion & handmade jewellery", sub_category: "Handmade kundan & oxidised jewellery",
    confidence: 0.94, is_reseller: false, has_gst: false, has_website: false, channels: ["Instagram", "WhatsApp"],
    en: { explanation: "You make and sell handmade fashion jewellery, which is a supported category. You can sign up as an individual without GST or a website.",
      flags: [{ severity: "info", text: "No website needed to start: you can collect with Payment Links and a QR code." }] },
    hi: { explanation: "Aap handmade fashion jewellery banati aur bechti hain, yeh category supported hai. GST aur website ke bina aap individual seller ke roop mein sign up kar sakti hain.",
      flags: [{ severity: "info", text: "Shuru karne ke liye website zaroori nahi: Payment Links aur QR code se payment le sakti hain." }] },
  },
  tools: {
    policy_id: "hardware_tools", category_label: "Hardware & tools", sub_category: "Hand and power tools (resale)",
    confidence: 0.9, is_reseller: true, has_gst: false, has_website: false, channels: ["WhatsApp"],
    en: { explanation: "Selling hardware tools is supported. Because you resell, keep proof of where your stock comes from.",
      flags: [{ severity: "warn", text: "Resellers may be asked for one purchase invoice from their supplier. Keep a clear photo ready." }] },
    hi: { explanation: "Hardware tools bechna supported hai. Aap resell karte hain, isliye stock kahan se aata hai uska proof ready rakhein.",
      flags: [{ severity: "warn", text: "Resellers se supplier ka ek purchase invoice maanga ja sakta hai. Uski saaf photo ready rakhein." }] },
  },
  astro: {
    policy_id: "astrology_spiritual", category_label: "Astrology & spiritual services", sub_category: "Online astrology consultations",
    confidence: 0.92, is_reseller: false, has_gst: null, has_website: false, channels: ["Video call"],
    en: { explanation: "Astrology services go to a manual review and are sometimes declined. You'll know the outcome of this step before paying any fee.",
      flags: [{ severity: "warn", text: "Expect a reviewer to ask how you deliver the service and handle refunds." }] },
    hi: { explanation: "Astrology services ka manual review hota hai, aur kabhi kabhi decline hota hai. Fee dene se pehle aapko yeh pata rahega.",
      flags: [{ severity: "warn", text: "Reviewer pooch sakte hain ki aap service kaise dete hain aur refund kaise karte hain." }] },
  },
  vape: {
    policy_id: "tobacco_ecig", category_label: "Tobacco, e-cigarettes & vapes", sub_category: "E-cigarette and vape refills",
    confidence: 0.97, is_reseller: true, has_gst: null, has_website: false, channels: ["Instagram"],
    en: { explanation: "E-cigarettes and vape products can't be accepted. Their sale is banned in India, so this application would be rejected.", flags: [] },
    hi: { explanation: "E-cigarettes aur vape products accept nahi ho sakte. India mein inki bikri banned hai, isliye yeh application reject hoti.", flags: [] },
  },
};
export const recordedClassify = (key: string, lang: Lang): ClassifyAI => {
  const r = REC_CLASSIFY[key];
  const { en, hi, ...rest } = r;
  return { ...rest, ...(lang === "hi" ? hi : en) };
};

export const NAMES = { pan: "PRIYA LAKSHMI REDDY", aadhaar: "Reddy Priya Lakshmi", bankShort: "PRIYA REDDY", bankFull: "PRIYA LAKSHMI REDDY" };

const aadhaarMatch = {
  en: { doc: "Aadhaar", verdict: "match" as Verdict, reason: "Same three names with the surname first. A different order is accepted.", fix: null },
  hi: { doc: "Aadhaar", verdict: "match" as Verdict, reason: "Teeno naam same hain, bas surname pehle hai. Order alag hona chalta hai.", fix: null },
};
export const REC_NAMES: Record<"short" | "full", Loc<NamesAI>> = {
  short: {
    en: {
      documents: [{ doc: "PAN", name: NAMES.pan }, { doc: "Aadhaar", name: NAMES.aadhaar }, { doc: "Bank", name: NAMES.bankShort }],
      comparisons: [aadhaarMatch.en, { doc: "Bank", verdict: "likely_fail", reason: "Your bank account says PRIYA REDDY. LAKSHMI is missing, so the ₹1 bank check against your PAN name will likely fail.", fix: "Use a bank account whose name matches your PAN, or ask your branch to update the account name using your PAN card." }],
      summary: "Your ID documents match. Your bank account name doesn't, and that would stall your application after you pay.",
    },
    hi: {
      documents: [{ doc: "PAN", name: NAMES.pan }, { doc: "Aadhaar", name: NAMES.aadhaar }, { doc: "Bank", name: NAMES.bankShort }],
      comparisons: [aadhaarMatch.hi, { doc: "Bank", verdict: "likely_fail", reason: "Bank account mein PRIYA REDDY likha hai. LAKSHMI missing hai, isliye PAN naam se ₹1 bank check fail hone ke chances hain.", fix: "Aisa bank account use karein jiska naam PAN se match kare, ya PAN card leke branch mein account naam update karwayein." }],
      summary: "Aapke ID documents match karte hain. Bank account ka naam match nahi karta, aur yeh fee dene ke baad application rok deta.",
    },
  },
  full: {
    en: {
      documents: [{ doc: "PAN", name: NAMES.pan }, { doc: "Aadhaar", name: NAMES.aadhaar }, { doc: "Bank", name: NAMES.bankFull }],
      comparisons: [aadhaarMatch.en, { doc: "Bank", verdict: "match", reason: "Your bank account name matches your PAN exactly.", fix: null }],
      summary: "All three names match. The ₹1 bank check should pass.",
    },
    hi: {
      documents: [{ doc: "PAN", name: NAMES.pan }, { doc: "Aadhaar", name: NAMES.aadhaar }, { doc: "Bank", name: NAMES.bankFull }],
      comparisons: [aadhaarMatch.hi, { doc: "Bank", verdict: "match", reason: "Bank account ka naam PAN se bilkul match karta hai.", fix: null }],
      summary: "Teeno naam match karte hain. ₹1 bank check pass hona chahiye.",
    },
  },
};

/* UI copy. Sentence case, verbs on buttons, one job per line. */
const en = {
  stepOf: (n: number) => `Step ${n} of 3`,
  hi: "Hi Priya",
  s0Title: "Check you'll be approved before you pay",
  s0Body: "Three quick checks, about 90 seconds. The ₹199 KYC fee is charged only after they pass.",
  s0Checks: ["Category", "KYC route", "Names"],
  s0Fee: "What does the ₹199 cover?",
  s0Cta: "Start checks",
  feeTitle: "The KYC fee",
  feeBody: "A one-time fee for reviewing your documents. With Pre-flight you pay it only after your checks pass.",
  feeRow: "KYC processing fee", gstRow: "GST (18%)", totalRow: "Total, paid once",
  offer: "After you're live: 0% platform fee for 90 days or your first ₹5 lakh, whichever comes first. Then 2% + GST per payment, including UPI.",
  gotIt: "Got it",
  s1Title: "What do you sell, and where?",
  s1Body: "Describe it the way you'd tell a customer. English or Hinglish is fine.",
  s1Placeholder: "e.g. I sell handmade earrings on Instagram",
  examples: "Examples",
  s1Cta: "Check my category",
  s1Busy: "Reading your description",
  supported: "Supported", needs_review: "Needs a manual review", not_supported: "Not supported",
  youNeed: "You'll need",
  routeLinks: "Start with Payment Links and QR codes. No website needed.",
  routeSite: "You'll take payments on your website. We'll check its policy pages next.",
  docBase: ["Your PAN card", "Aadhaar, or another ID like Voter ID or passport", "A bank account in your own name"],
  docInvoice: "One purchase invoice from your supplier",
  stopTitle: "Don't pay the fee for this one",
  stopBody: "This category can't be accepted, so the application would be rejected. Nothing has been charged.",
  saved: "saved",
  reviewNote: "A reviewer will look at this category by hand. You'll know where you stand before you're charged anything more.",
  lowConf: "We're not sure which category fits. A reviewer will confirm it.",
  tryAnother: "Try a different description",
  s1Next: "Next: KYC route",
  s2Title: "How will we verify you?",
  s2Body: "We check the government KYC registry using your PAN. If you're not in it, you'll do a 5-minute video call instead.",
  panLabel: "Your PAN",
  change: "Change",
  consent: "I agree to a KYC registry check using my PAN",
  s2Cta: "Check my KYC route",
  s2Busy: "Checking the KYC registry",
  instantTitle: "You're in the registry",
  instantBody: "Your identity and address will fill in automatically. No video call needed.",
  videoTitle: "You'll need a 5-minute video call",
  videoBody: "You're not in the KYC registry yet, so an agent will verify you on a short call.",
  keepReady: "Keep these ready",
  videoList: [
    ["credit-card", "Your original PAN card. A printed e-PAN isn't accepted."],
    ["smartphone", "The phone number linked to your Aadhaar, for an OTP."],
    ["edit-3", "A blue or black pen and a blank sheet of paper."],
    ["sun", "Good light and a stable internet connection."],
  ] as [string, string][],
  pickTime: "Pick a time for your call",
  days: ["Tomorrow", "Thursday"],
  times: ["9:30 AM", "11:00 AM", "2:30 PM"],
  slotNote: "Times shown are examples.",
  simFound: "Demo: this seller is in the registry",
  s2Next: "Next: names",
  s3Title: "Do your names match?",
  s3Body: "Your bank confirms your account by sending ₹1 and matching the account name to your PAN. A mismatch is one of the most common reasons applications get stuck.",
  docs: { pan: "PAN card", aadhaar: "Aadhaar", bank: "Bank passbook or cheque" },
  sample: "Sample", photo: "Your photo", useSample: "Use sample",
  samplesNote: "Sample documents belong to a fictional seller. Photos you add are read by AI to find the names, and aren't stored.",
  s3Cta: "Read my documents",
  s3Busy: "Reading names from your documents",
  legal: "Legal name, from PAN",
  aadhaarName: "Aadhaar", bankName: "Bank account",
  match: "Matches", likely_fail: "₹1 check will likely fail", unclear: "Check this",
  missing: "missing", extra: "extra", variant: "spelling",
  fixTitle: "How to fix it",
  fixSwap: "Use another account in my full name",
  fixBranch: "Update the name at my bank branch",
  branchTitle: "Updating your bank account name",
  branchBody: "Take your PAN card to your branch and ask them to update the account holder name to match it exactly. It usually takes 2 to 3 working days. Come back and run this check again.",
  s3Next: "See my go-live pass",
  s4Title: "Your go-live pass",
  s4TitleNot: "One thing to fix first",
  passLabel: "Go-live pass",
  passSub: "Checked before payment",
  shop: "Shop name customers see",
  edit: "Edit",
  rowCat: "Category", rowRoute: "KYC route", rowNames: "Names",
  routeInstant: "Instant, from registry",
  routeVideo: (slot: string) => `Video call, ${slot}`,
  namesOk: "PAN, Aadhaar and bank match",
  namesBad: "Bank name doesn't match PAN",
  namesWarn: "One name needs a look",
  fix: "Fix",
  passed: "Passed",
  review: "Review",
  promise: "Proposed: if you're rejected for a reason this check didn't flag, the fee is refunded.",
  payCta: (amt: string) => `Pay ${amt} and submit`,
  payBlocked: "Fix the item above to continue",
  simulated: "Simulated. No money moves in this demo.",
  brandTitle: "Your shop name",
  brandBody: "Customers see this on payment pages and receipts. Your legal name stays on your PAN and bank records, and UPI apps may still show your bank-registered name.",
  save: "Save",
  s5Title: "Application submitted",
  s5Body: "Here's the road to going live.",
  tl: (slot: string | null) => [
    ["check", "Fee paid and application submitted", "Now"],
    slot ? ["video", "Video KYC call", slot] : ["user-check", "Identity verified from the registry", "Done"],
    ["clock", "Review by our team", "Usually 1 to 3 working days"],
    ["zap", "Account live", "Start with a Payment Link"],
  ] as [string, string, string][],
  restart: "Run the demo again",
  errNoAI: "Couldn't reach the AI right now. Pick one of the examples to continue.",
  errPhotos: "Couldn't read these photos. Try clearer photos, or switch back to the samples.",
  howItWorks: "How it works",
};
export type Copy = typeof en;

const hi: Copy = {
  stepOf: (n: number) => `Step ${n} / 3`,
  hi: "Namaste Priya",
  s0Title: "Pay karne se pehle jaan lijiye ki approval milega",
  s0Body: "Teen chhote checks, lagbhag 90 second. ₹199 KYC fee tabhi lagegi jab checks pass ho jaayein.",
  s0Checks: ["Category", "KYC route", "Naam"],
  s0Fee: "₹199 kis cheez ki fee hai?",
  s0Cta: "Checks shuru karein",
  feeTitle: "KYC fee",
  feeBody: "Aapke documents review karne ki ek baar ki fee. Pre-flight ke saath yeh checks pass hone ke baad hi lagti hai.",
  feeRow: "KYC processing fee", gstRow: "GST (18%)", totalRow: "Kul, ek baar",
  offer: "Live hone ke baad: 90 din ya pehle ₹5 lakh tak 0% platform fee, jo pehle ho. Phir har payment pe 2% + GST, UPI bhi.",
  gotIt: "Samajh gaya",
  s1Title: "Aap kya bechte hain, aur kahan?",
  s1Body: "Waise likhiye jaise customer ko batate hain. English ya Hinglish, dono chalega.",
  s1Placeholder: "jaise: main Instagram pe handmade earrings bechti hoon",
  examples: "Udaharan",
  s1Cta: "Meri category check karein",
  s1Busy: "Aapka description padh rahe hain",
  supported: "Supported", needs_review: "Manual review hoga", not_supported: "Supported nahi",
  youNeed: "Aapko chahiye",
  routeLinks: "Payment Links aur QR code se shuru karein. Website zaroori nahi.",
  routeSite: "Aap website pe payment lenge. Agle step mein policy pages check honge.",
  docBase: ["Aapka PAN card", "Aadhaar, ya Voter ID, passport jaisa koi ID", "Aapke apne naam ka bank account"],
  docInvoice: "Supplier ka ek purchase invoice",
  stopTitle: "Is ke liye fee mat dijiye",
  stopBody: "Yeh category accept nahi ho sakti, isliye application reject hoti. Kuch charge nahi hua.",
  saved: "bach gaye",
  reviewNote: "Is category ko reviewer haath se dekhenge. Aur kuch charge hone se pehle aapko pata rahega.",
  lowConf: "Kaunsi category fit hogi, pakka nahi. Reviewer confirm karenge.",
  tryAnother: "Alag description try karein",
  s1Next: "Aage: KYC route",
  s2Title: "Aapko verify kaise karenge?",
  s2Body: "Hum aapke PAN se government KYC registry check karte hain. Registry mein nahi hain toh 5 minute ka video call hoga.",
  panLabel: "Aapka PAN",
  change: "Badlein",
  consent: "Main apne PAN se KYC registry check ke liye sehmat hoon",
  s2Cta: "Mera KYC route check karein",
  s2Busy: "KYC registry check ho rahi hai",
  instantTitle: "Aap registry mein hain",
  instantBody: "Identity aur address apne aap bhar jaayenge. Video call ki zaroorat nahi.",
  videoTitle: "5 minute ka video call hoga",
  videoBody: "Aap abhi KYC registry mein nahi hain, isliye ek agent chhote call pe verify karega.",
  keepReady: "Yeh ready rakhein",
  videoList: [
    ["credit-card", "Original PAN card. Printed e-PAN nahi chalega."],
    ["smartphone", "Aadhaar se linked phone number, OTP ke liye."],
    ["edit-3", "Neela ya kaala pen aur ek khaali kaagaz."],
    ["sun", "Achhi roshni aur stable internet."],
  ],
  pickTime: "Call ka time chuniye",
  days: ["Kal", "Guruvaar"],
  times: ["9:30 AM", "11:00 AM", "2:30 PM"],
  slotNote: "Dikhaye gaye time sirf udaharan hain.",
  simFound: "Demo: yeh seller registry mein hai",
  s2Next: "Aage: naam",
  s3Title: "Kya aapke naam match karte hain?",
  s3Body: "Bank ₹1 bhejkar aapke account ka naam PAN se milata hai. Mismatch hona application atakne ki sabse aam wajahon mein se ek hai.",
  docs: { pan: "PAN card", aadhaar: "Aadhaar", bank: "Bank passbook ya cheque" },
  sample: "Sample", photo: "Aapki photo", useSample: "Sample use karein",
  samplesNote: "Sample documents ek kaalpanik seller ke hain. Aapki photos AI naam padhne ke liye dekhta hai, save nahi hoti.",
  s3Cta: "Mere documents padhein",
  s3Busy: "Documents se naam padh rahe hain",
  legal: "Legal naam, PAN se",
  aadhaarName: "Aadhaar", bankName: "Bank account",
  match: "Match", likely_fail: "₹1 check fail ho sakta hai", unclear: "Ise dekhein",
  missing: "missing", extra: "extra", variant: "spelling",
  fixTitle: "Kaise theek karein",
  fixSwap: "Mere poore naam wala doosra account use karein",
  fixBranch: "Bank branch mein naam update karwayein",
  branchTitle: "Bank account ka naam update karna",
  branchBody: "PAN card leke branch jaayein aur account holder ka naam PAN jaisa hi karwayein. Aam taur pe 2 se 3 working din lagte hain. Phir yeh check dobara chalayein.",
  s3Next: "Mera go-live pass dekhein",
  s4Title: "Aapka go-live pass",
  s4TitleNot: "Pehle ek cheez theek karein",
  passLabel: "Go-live pass",
  passSub: "Payment se pehle check hua",
  shop: "Customers ko dikhne wala dukaan ka naam",
  edit: "Badlein",
  rowCat: "Category", rowRoute: "KYC route", rowNames: "Naam",
  routeInstant: "Instant, registry se",
  routeVideo: (slot: string) => `Video call, ${slot}`,
  namesOk: "PAN, Aadhaar aur bank match",
  namesBad: "Bank ka naam PAN se match nahi",
  namesWarn: "Ek naam dekhna hoga",
  fix: "Theek karein",
  passed: "Pass",
  review: "Review",
  promise: "Prastaav: agar aisi wajah se reject ho jo is check ne nahi bataayi, toh fee wapas.",
  payCta: (amt: string) => `${amt} pay karke submit karein`,
  payBlocked: "Aage badhne ke liye upar wala item theek karein",
  simulated: "Simulated. Is demo mein paisa nahi katta.",
  brandTitle: "Dukaan ka naam",
  brandBody: "Customers ko payment pages aur receipts pe yeh dikhta hai. Legal naam PAN aur bank records mein rehta hai, aur UPI apps bank mein registered naam dikha sakte hain.",
  save: "Save karein",
  s5Title: "Application submit ho gayi",
  s5Body: "Live hone tak ka raasta yeh hai.",
  tl: (slot: string | null) => [
    ["check", "Fee paid, application submit", "Abhi"],
    slot ? ["video", "Video KYC call", slot] : ["user-check", "Registry se identity verify", "Ho gaya"],
    ["clock", "Team ka review", "Aam taur pe 1 se 3 working din"],
    ["zap", "Account live", "Payment Link se shuru karein"],
  ],
  restart: "Demo phir se chalayein",
  errNoAI: "Abhi AI tak nahi pahunch paaye. Aage badhne ke liye ek udaharan chuniye.",
  errPhotos: "Yeh photos padhi nahi ja saki. Saaf photo try karein, ya samples pe wapas jaayein.",
  howItWorks: "Kaise kaam karta hai",
};
export const COPY: Record<Lang, Copy> = { en, hi };
