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
    label: "Handmade jewellery · Instagram",
    en: "I make handmade kundan and oxidised jewellery at home and sell it on Instagram and WhatsApp. No GST, no website yet.",
    hi: "Main ghar pe handmade kundan aur oxidised jewellery banati hoon, Instagram aur WhatsApp pe bechti hoon. GST nahi hai, website bhi nahi hai.",
  },
  tools: {
    label: "Tools reseller · WhatsApp",
    en: "I resell hardware tools like drills and spanners on WhatsApp. I buy them from the wholesale market. No GST.",
    hi: "Main WhatsApp pe hardware tools resell karta hoon, drills, spanners. Wholesale market se kharidta hoon. GST nahi hai.",
  },
  astro: {
    label: "Astrology · video calls",
    en: "I do online astrology and kundli readings on video call. Clients pay in advance.",
    hi: "Main online astrology aur kundli reading karta hoon video call pe. Clients advance mein pay karte hain.",
  },
  vape: {
    label: "Vape refills · Instagram",
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

/* UI copy */
const en = {
  bar: "Activate your account",
  steps: ["Before you pay", "Step 1 of 3 · Category", "Step 2 of 3 · KYC route", "Step 3 of 3 · Names", "Ready check", "Submitted"],
  s0Eyebrow: "BEFORE YOU PAY", s0Title: "Know you'll pass before you pay ₹199",
  s0Lead: "Three quick checks catch the issues that most often delay or reject new sellers. You pay only when they pass.",
  s0Checks: ["Is your business a category we can support?", "Which KYC route will you take: instant, or a short video call?", "Do the names on your PAN, Aadhaar and bank account match?"],
  persona: "Instagram seller · no GST · no website",
  costTitle: "What it costs, upfront", feeRow: "KYC processing fee", gstRow: "GST (18%)", totalRow: "You pay once",
  offer: "Then 0% platform fee for your first 90 days or ₹5 lakh in payments, whichever comes first. After that, 2% + GST per payment, including UPI.",
  start: "Start the check", time: "About 90 seconds",
  s1Title: "What do you sell, and where?", s1Lead: "Describe it in your own words, in English or Hinglish. No dropdowns.",
  yourBiz: "Your business", tryOther: "Try another seller", check: "Check my category", thinking: "Reading your description…",
  supported: "Supported", needs_review: "Manual review", not_supported: "Not supported",
  route: "How you'll take payments",
  routeNoSite: "Payment Links, Payment Pages and QR codes from day one. For checkout on your own website later, you'll need About, Contact, Pricing, Terms, Privacy, Refund and Shipping pages; we can draft them.",
  routeSite: "Checkout on your website. We'll check your policy pages next.",
  docsFor: "Documents you'll need", docBase: ["Your PAN card", "Aadhaar, or Voter ID, Passport or Driving licence", "A bank account in your own name"],
  docInvoice: "One purchase invoice from your supplier",
  savedTitle: "Don't pay the fee for this one", savedBody: "This category can't be accepted, so the application would be rejected. You've paid nothing.", saved: "saved",
  reviewTitle: "You can continue, with eyes open", reviewBody: "A reviewer will look at this category by hand. You'll know where you stand before anything else is charged.",
  lowConf: "We're not sure which category fits. A reviewer will confirm it.",
  next: "Continue",
  s2Title: "Which KYC route will you take?", s2Lead: "Some sellers are verified instantly from the national KYC registry. Others need a 5-minute video call. Knowing now means no surprises after you pay.",
  consent: "Check the KYC registry with my PAN", pan: "PAN", checkRoute: "Check my route",
  instantTitle: "Instant route", instantBody: "Your KYC record was found. Your identity and address fill in automatically, with no video call.",
  videoTitle: "Video KYC route", videoBody: "No registry record was found, so you'll do a 5-minute video call with an agent. Keep these ready:",
  videoList: ["Your original PAN card (a printed e-PAN isn't accepted)", "Your phone number linked to Aadhaar, for an OTP", "A blue or black pen and a blank sheet of paper", "Good light and a stable connection"],
  bookTitle: "Book your call now", booked: "Booked", slotNote: "Slots shown are illustrative.",
  slots: ["Tomorrow 9:30 AM", "Tomorrow 11:00 AM", "Tomorrow 2:30 PM"], noSlot: "No slot booked yet",
  simFound: "Demo: seller is in the KYC registry",
  s3Title: "Do your names match?", s3Lead: "Your bank's ₹1 check compares your account name with your PAN. A mismatch here is one of the most common reasons applications stall.",
  takePhoto: "Camera", gallery: "Gallery", sample: "Sample", readCompare: "Read and compare names", reading: "Reading your documents…",
  sampleNote: "Sample documents belong to a fictional seller. Photos you add are sent to Claude to read the names and aren't stored.",
  legal: "Legal name (from PAN)", match: "Matches", likely_fail: "Will likely fail", unclear: "Check this", fix: "Fix:",
  switchAcct: "Use my other account (in my full name)",
  brandTitle: "Your shop name", brandLabel: "What customers see",
  brandHelp: "Your legal name stays on your PAN and bank records. Customers see your shop name on payment pages and receipts. UPI apps may still show the name registered with your bank.",
  s4Title: "You're ready to submit", s4TitleNot: "Fix one thing before you pay", s4Lead: "Here's everything we checked. Nothing is charged until you tap pay.",
  rCat: "Category", rRoute: "Payments", rKyc: "KYC route", rNames: "Names", rBrand: "Shop name",
  promise: "Proposed policy: if your application is rejected for a reason this check didn't flag, the fee is refunded.",
  pay: "Pay {amt} and submit", paySim: "Simulated. No money moves in this prototype.", fixFirst: "Fix the red item to continue",
  s5Title: "Submitted. Here's what happens next", s5Lead: "No surprises: this is the whole road to going live.",
  tl: ["Application submitted · fee paid", "Video KYC call · {slot}", "Review · typically 1 to 3 business days (assumption)", "Account live · start with a Payment Link"],
  tlInstant: ["Application submitted · fee paid", "Identity verified from the registry", "Review · typically 1 to 3 business days (assumption)", "Account live · start with a Payment Link"],
  restart: "Run the demo again",
  errNoAI: "Live AI isn't reachable right now. Pick one of the sample sellers to continue.",
  errPhotos: "Couldn't read these photos right now. Try again, or switch back to the samples.",
};
export type Copy = typeof en;
const hi: Copy = {
  bar: "Account activate karein",
  steps: ["Pay karne se pehle", "Step 1/3 · Category", "Step 2/3 · KYC route", "Step 3/3 · Naam", "Ready check", "Submit ho gaya"],
  s0Eyebrow: "PAY KARNE SE PEHLE", s0Title: "₹199 dene se pehle jaan lijiye ki aap pass honge",
  s0Lead: "Teen chhote checks un problems ko pakad lete hain jinki wajah se naye sellers atakte ya reject hote hain. Pass hone ke baad hi pay karein.",
  s0Checks: ["Kya aapka business ek supported category hai?", "Aapka KYC route kya hoga: instant, ya chhota video call?", "Kya PAN, Aadhaar aur bank account mein naam match karte hain?"],
  persona: "Instagram seller · GST nahi · website nahi",
  costTitle: "Kharcha, pehle se saaf", feeRow: "KYC processing fee", gstRow: "GST (18%)", totalRow: "Ek baar dena hai",
  offer: "Phir pehle 90 din ya ₹5 lakh ke payments tak 0% platform fee, jo pehle ho. Uske baad har payment pe 2% + GST, UPI bhi.",
  start: "Check shuru karein", time: "Lagbhag 90 second",
  s1Title: "Aap kya bechte hain, aur kahan?", s1Lead: "Apne shabdon mein likhiye, English ya Hinglish mein. Koi dropdown nahi.",
  yourBiz: "Aapka business", tryOther: "Doosra seller try karein", check: "Meri category check karein", thinking: "Aapka description padh rahe hain…",
  supported: "Supported", needs_review: "Manual review", not_supported: "Supported nahi",
  route: "Payment kaise lenge",
  routeNoSite: "Pehle din se Payment Links, Payment Pages aur QR code. Baad mein apni website pe checkout ke liye About, Contact, Pricing, Terms, Privacy, Refund aur Shipping pages chahiye; hum draft kar denge.",
  routeSite: "Aapki website pe checkout. Agle step mein policy pages check karenge.",
  docsFor: "Aapko yeh documents chahiye", docBase: ["Aapka PAN card", "Aadhaar, ya Voter ID, Passport ya Driving licence", "Aapke apne naam ka bank account"],
  docInvoice: "Supplier ka ek purchase invoice",
  savedTitle: "Is ke liye fee mat dijiye", savedBody: "Yeh category accept nahi ho sakti, isliye application reject hoti. Aapne kuch pay nahi kiya.", saved: "bach gaye",
  reviewTitle: "Aage badh sakte hain, poori jaankari ke saath", reviewBody: "Is category ko reviewer haath se dekhenge. Aur kuch charge hone se pehle aapko pata rahega ki aap kahan khade hain.",
  lowConf: "Kaunsi category fit hogi, pakka nahi hai. Reviewer confirm karenge.",
  next: "Aage badhein",
  s2Title: "Aapka KYC route kya hoga?", s2Lead: "Kuch sellers national KYC registry se turant verify ho jaate hain. Baaki ko 5 minute ka video call karna hota hai. Abhi jaan lenge toh pay karne ke baad koi surprise nahi.",
  consent: "Mere PAN se KYC registry check karein", pan: "PAN", checkRoute: "Mera route check karein",
  instantTitle: "Instant route", instantBody: "Aapka KYC record mil gaya. Identity aur address apne aap bhar jaayenge, video call nahi.",
  videoTitle: "Video KYC route", videoBody: "Registry mein record nahi mila, isliye agent ke saath 5 minute ka video call hoga. Yeh ready rakhein:",
  videoList: ["Original PAN card (printed e-PAN nahi chalega)", "Aadhaar se linked phone number, OTP ke liye", "Neela ya kaala pen aur ek khaali kaagaz", "Achhi roshni aur stable internet"],
  bookTitle: "Abhi call book karein", booked: "Book ho gaya", slotNote: "Slots sirf udaharan ke liye hain.",
  slots: ["Kal 9:30 AM", "Kal 11:00 AM", "Kal 2:30 PM"], noSlot: "Slot book nahi hua",
  simFound: "Demo: seller KYC registry mein hai",
  s3Title: "Kya aapke naam match karte hain?", s3Lead: "Bank ka ₹1 check aapke account naam ko PAN se milata hai. Yahan mismatch hona application atakne ki sabse aam wajahon mein se ek hai.",
  takePhoto: "Camera", gallery: "Gallery", sample: "Sample", readCompare: "Naam padhein aur milayein", reading: "Documents padh rahe hain…",
  sampleNote: "Sample documents ek kaalpanik seller ke hain. Aapki photos naam padhne ke liye Claude ko bheji jaati hain aur save nahi hoti.",
  legal: "Legal naam (PAN se)", match: "Match", likely_fail: "Fail hone ke chances", unclear: "Ise check karein", fix: "Kya karein:",
  switchAcct: "Mera doosra account use karein (poore naam wala)",
  brandTitle: "Aapki dukaan ka naam", brandLabel: "Customers ko kya dikhega",
  brandHelp: "Legal naam PAN aur bank records mein rehta hai. Customers ko payment pages aur receipts pe aapki dukaan ka naam dikhta hai. UPI apps phir bhi bank mein registered naam dikha sakte hain.",
  s4Title: "Aap submit karne ke liye ready hain", s4TitleNot: "Pay karne se pehle ek cheez theek karein", s4Lead: "Humne yeh sab check kiya. Pay dabane tak kuch charge nahi hoga.",
  rCat: "Category", rRoute: "Payments", rKyc: "KYC route", rNames: "Naam", rBrand: "Dukaan ka naam",
  promise: "Prastaavit policy: agar application kisi aisi wajah se reject ho jo is check ne nahi bataayi, toh fee wapas.",
  pay: "{amt} pay karke submit karein", paySim: "Simulated. Is prototype mein paisa nahi katta.", fixFirst: "Aage badhne ke liye laal item theek karein",
  s5Title: "Submit ho gaya. Aage kya hoga", s5Lead: "Koi surprise nahi: live hone tak ka poora raasta yeh hai.",
  tl: ["Application submit · fee paid", "Video KYC call · {slot}", "Review · aam taur pe 1 se 3 business din (anumaan)", "Account live · Payment Link se shuru karein"],
  tlInstant: ["Application submit · fee paid", "Registry se identity verify", "Review · aam taur pe 1 se 3 business din (anumaan)", "Account live · Payment Link se shuru karein"],
  restart: "Demo phir se chalayein",
  errNoAI: "Live AI abhi reachable nahi hai. Aage badhne ke liye sample sellers mein se ek chuniye.",
  errPhotos: "Yeh photos abhi padhi nahi ja saki. Phir try karein, ya samples pe wapas jaayein.",
};
export const COPY: Record<Lang, Copy> = { en, hi };
