// Cross-source consistency: the check a reviewer does by hand when deciding whether a small
// seller's business is real and is what she says. The model only extracts facts from each
// source; this module decides, cell by cell, with rules a reviewer can read.
const NM = require("./namematch");

const BLOCKED = /\b(vape|vapes|e-?cig\w*|pod kit|pod refill\w*|hookah|tobacco|cigarettes?|gutka|liquor|whisk(e)?y|vodka|beer|wine|spirits|betting|satta|casino|rummy|lottery|crypto\w*|bitcoin|nft|airsoft|gun|pistol|rifle|ammunition|adult toys?|escort)\b/i;
const VARIABLE = /pay what you (want|like)|name your price|any amount|donat|contribut/i;

const norm = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
/** Business-name similarity: word overlap ignoring generic words. */
function bizNameMatch(a, b) {
  const GENERIC = new Set("THE AND & STORE STORES SHOP JEWELS JEWELLERY JEWELLERS COLLECTIONS CREATIONS ENTERPRISES TRADERS OFFICIAL IN CO".split(" "));
  const A = norm(a).split(" ").filter((w) => w && !GENERIC.has(w));
  const B = norm(b).split(" ").filter((w) => w && !GENERIC.has(w));
  if (!A.length || !B.length) return norm(a) && norm(a) === norm(b) ? 1 : 0;
  const hit = A.filter((w) => B.some((x) => x === w || (w.length > 4 && x.length > 4 && (x.startsWith(w) || w.startsWith(x))))).length;
  return hit / Math.max(A.length, 1);
}

/**
 * @param {{legalName:string, bankName?:string, shopName?:string, declaredLabel:string, declaredStatus:string, sources:{id:string,label:string,facts:{business_name?:string,person_name?:string,products?:string[],price_mode?:string,contact?:string,readable?:boolean}}[], productCheck?:(text:string)=>{sameFamily:boolean, topLabel:string, topStatus:string}}} input
 */
function crossCheck({ legalName, shopName, declaredLabel, sources, productCheck }) {
  const rows = [];
  const cell = (state, value, why) => ({ state, value, why });
  const S = sources.filter((s) => s.facts && s.facts.readable !== false);

  // 1. Business name
  rows.push({
    key: "business", label: "Business name", expected: shopName || "—",
    cells: Object.fromEntries(S.map((s) => {
      const v = s.facts.business_name;
      if (!v) return [s.id, cell("none", "—", "Not shown")];
      const m = bizNameMatch(shopName, v);
      return [s.id, cell(m >= 0.5 ? "ok" : "bad", v, m >= 0.5 ? "Same business" : `Different name from "${shopName}"`)];
    })),
  });
  // 2. Owner name vs PAN (namematch engine)
  rows.push({
    key: "owner", label: "Owner name", expected: legalName || "—",
    cells: Object.fromEntries(S.map((s) => {
      const v = s.facts.person_name;
      if (!v) return [s.id, cell("none", "—", "Not shown")];
      const r = NM.compare(legalName, v);
      const partial = r.tokens.filter((t) => t.state === "match" || t.state === "variant").length;
      const st = r.verdict === "match" ? "ok" : partial >= 1 && !r.tokens.some((t) => t.state === "extra" && t.text.length > 1) ? "ok" : r.verdict === "review" ? "warn" : "bad";
      return [s.id, cell(st, v, st === "ok" ? (r.verdict === "match" ? "Matches PAN" : "Consistent with PAN (shortened)") : st === "warn" ? "Partly matches PAN" : "Doesn't match PAN")];
    })),
  });
  // 3. What is sold vs declared category
  rows.push({
    key: "products", label: "What's sold", expected: declaredLabel,
    cells: Object.fromEntries(S.map((s) => {
      const p = (s.facts.products || []).filter(Boolean);
      if (!p.length) return [s.id, cell("none", "—", "No products shown")];
      const text = p.join(", ");
      const blocked = p.filter((x) => BLOCKED.test(x));
      if (blocked.length) return [s.id, cell("bad", text, `Restricted items listed: ${blocked.join(", ")}`)];
      const pc = productCheck ? productCheck(text) : { sameFamily: true };
      return [s.id, cell(pc.sameFamily ? "ok" : "warn", text, pc.sameFamily ? "Matches what you declared" : `Looks like ${pc.topLabel}, not ${declaredLabel}`)];
    })),
  });
  // 4. Price model
  rows.push({
    key: "price", label: "Prices", expected: "Fixed, visible",
    cells: Object.fromEntries(S.map((s) => {
      const m = s.facts.price_mode || "unknown";
      const v = (s.facts.products || []).join(" ");
      if (m === "variable" || VARIABLE.test(v)) return [s.id, cell("bad", "Variable / pay what you want", "Not accepted for unregistered sellers")];
      if (m === "fixed") return [s.id, cell("ok", "Fixed prices shown", "Reviewers can see what a customer pays")];
      if (m === "on_request") return [s.id, cell("warn", "Price on request", "Reviewers prefer visible prices")];
      return [s.id, cell("none", "—", "Not shown")];
    })),
  });
  // 5. Contact
  rows.push({
    key: "contact", label: "Contact", expected: "Phone or email",
    cells: Object.fromEntries(S.map((s) => [s.id, s.facts.contact ? cell("ok", s.facts.contact, "Customers can reach you") : cell("none", "—", "Not shown")])),
  });

  const flags = [];
  for (const r of rows) for (const [sid, c] of Object.entries(r.cells)) {
    if (c.state === "bad" || c.state === "warn") flags.push({ row: r.label, source: (sources.find((s) => s.id === sid) || {}).label || sid, state: c.state, why: c.why });
  }
  // Coverage: a reviewer needs at least one source that shows products with prices and one that ties a person to the business.
  const showsProducts = rows[2] && Object.values(rows[2].cells).some((c) => c.state === "ok");
  const tiesOwner = rows[1] && Object.values(rows[1].cells).some((c) => c.state === "ok");
  if (!showsProducts) flags.push({ row: "Coverage", source: "All", state: "warn", why: "No source shows what you sell with prices." });
  if (!tiesOwner) flags.push({ row: "Coverage", source: "All", state: "warn", why: "No source links your name to the business." });
  const verdict = flags.some((f) => f.state === "bad") ? "bad" : flags.length ? "warn" : "ok";
  return { rows, flags, verdict };
}

module.exports = { crossCheck, bizNameMatch };
