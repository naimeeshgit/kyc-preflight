// Document plan: entity type × what the seller already has × category → the exact list, the gaps,
// and how to close each gap. Rules only. Based on Razorpay's public onboarding docs and common
// reviewer asks; a reading of public material, not Razorpay's internal policy.

const ENTITIES = {
  individual: { label: "Just me, not registered", hint: "Freelancer, home seller, Instagram shop" },
  proprietorship: { label: "Sole proprietorship", hint: "Your own business, registered under Udyam, GST or a shop licence" },
  partnership: { label: "Partnership or LLP", hint: "Two or more partners with a deed or LLP agreement" },
  company: { label: "Private limited company", hint: "Has a CIN and a company PAN" },
};

const HAVE = {
  gst: { label: "GST certificate" },
  udyam: { label: "Udyam registration" },
  shop: { label: "Shop & Establishment licence" },
  fssai: { label: "FSSAI registration" },
  current: { label: "Current account in the business name" },
  deed: { label: "Partnership deed / LLP agreement" },
  coi: { label: "Certificate of incorporation" },
};

const HOW = {
  udyam: { what: "Udyam registration", time: "about 10 minutes, free", how: "Online at udyamregistration.gov.in with your Aadhaar and PAN. You get a certificate immediately." },
  gst: { what: "GST registration", time: "about 3–7 working days, free", how: "Online at gst.gov.in. Needed above the turnover threshold or for some online sales; a CA can confirm whether you need it." },
  shop: { what: "Shop & Establishment licence", time: "a few days, small state fee", how: "From your state's labour department portal." },
  fssai: { what: "FSSAI basic registration", time: "about 7 days, ₹100 per year", how: "Online at foscos.fssai.gov.in. Basic registration covers food businesses up to ₹12 lakh turnover." },
  current: { what: "Current account in the business name", time: "1–3 days at most banks", how: "Open it with your business proof (Udyam, GST or shop licence) and PAN." },
  deed: { what: "Partnership deed", time: "a day with a notary", how: "Signed by all partners on stamp paper." },
  coi: { what: "Certificate of incorporation", time: "already issued at incorporation", how: "Download from the MCA portal." },
};

/**
 * @param {{entity: keyof ENTITIES, have: string[], extraDocs?: string[], category?: string}} input
 * @returns {{items: {key:string,label:string,status:"have"|"in_app"|"missing"|"optional",how?:object,why?:string}[], ready: boolean, upgrade?: {title:string, body:string}}}
 */
function plan({ entity, have = [], extraDocs = [], reseller = false }) {
  const H = new Set(have);
  const items = [];
  const add = (key, label, status, why, howKey) => items.push({ key, label, status, why, ...(howKey ? { how: HOW[howKey] } : {}) });

  // Identity: always, collected in the app.
  add("pan", entity === "individual" || entity === "proprietorship" ? "Your PAN card" : "Business PAN + signatory's PAN", "in_app", "Identity and the name every other document is matched against.");
  add("aadhaar", "Aadhaar (OTP eKYC)", "in_app", "Address and identity, verified by OTP.");

  // Business proof by entity.
  if (entity === "individual") {
    add("bank", "Savings account in your own name", "in_app", "Settlements go here; its name must match your PAN.");
    add("proof", "Proof your business is real: social page, catalog, invoices", "in_app", "Unregistered sellers have no certificate, so reviewers look for this instead. We collect it in step 3.");
  } else if (entity === "proprietorship") {
    const proof = ["gst", "udyam", "shop"].find((k) => H.has(k));
    if (proof) add("bizproof", `Business proof: ${HAVE[proof].label}`, "have", "One registration that shows the business exists.");
    else add("bizproof", "One business proof: Udyam, GST or shop licence", "missing", "A proprietorship needs one registration in the business name.", "udyam");
    add("bank", H.has("current") ? "Current account in the business name" : "Bank account in your or the business name", H.has("current") ? "have" : "in_app", "Settlements go here; the name must match PAN or the business.");
  } else if (entity === "partnership") {
    add("deed", "Partnership deed or LLP agreement", H.has("deed") ? "have" : "missing", "Shows who the partners are and who can sign.", "deed");
    add("bank", "Current account in the firm's name", H.has("current") ? "have" : "missing", "Firms settle into a firm account.", "current");
    if (H.has("gst")) add("gst", "GST certificate", "have", "Registered firm.");
  } else if (entity === "company") {
    add("coi", "Certificate of incorporation (CIN)", H.has("coi") ? "have" : "missing", "Shows the company exists.", "coi");
    add("bank", "Current account in the company's name", H.has("current") ? "have" : "missing", "Companies settle into a company account.", "current");
    if (H.has("gst")) add("gst", "GST certificate", "have", "Registered company.");
  }

  // Resellers: reviewers ask where the goods come from.
  if (reseller) add("invoice", "One purchase invoice from your supplier", "in_app", "Shows where your stock comes from. Add it with your business proof in step 3.");

  // Category extras from the taxonomy (FSSAI, drug licence...).
  for (const d of extraDocs) {
    const isFssai = /fssai/i.test(d);
    const has = isFssai && H.has("fssai");
    add(`extra:${d}`, d, has ? "have" : "missing", "Your category needs it.", isFssai ? "fssai" : undefined);
  }

  const ready = !items.some((i) => i.status === "missing");
  let upgrade;
  if (entity === "individual") {
    upgrade = { title: "Optional: become a registered proprietor in 10 minutes", body: "A free Udyam registration (Aadhaar + PAN, online) lets you apply as a registered business. Reviewers then see a certificate instead of judging your social page." };
  }
  return { items, ready, upgrade };
}

module.exports = { ENTITIES, HAVE, HOW, plan };
