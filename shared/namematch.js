// Name-match engine, shared by the app (Metro) and the API (Node).
//
// The model reads names off documents. This module decides whether they match, the way a
// bank name-match check would: deterministic, scored, explainable word by word.
//
// Pipeline: normalise (Unicode, script) -> strip honorifics and relation suffixes ->
// tokenise -> align each legal-name word to the other document's words
// (exact > phonetic > initial > fuzzy) -> score -> verdict against documented thresholds.

/* eslint-disable no-useless-escape */

// ---- Transliteration (Devanagari + Telugu -> Latin, ITRANS-like, enough for names) --------
const DEV_C = { क: "K", ख: "KH", ग: "G", घ: "GH", ङ: "N", च: "CH", छ: "CHH", ज: "J", झ: "JH", ञ: "N", ट: "T", ठ: "TH", ड: "D", ढ: "DH", ण: "N", त: "T", थ: "TH", द: "D", ध: "DH", न: "N", प: "P", फ: "PH", ब: "B", भ: "BH", म: "M", य: "Y", र: "R", ल: "L", व: "V", श: "SH", ष: "SH", स: "S", ह: "H", क़: "Q", ख़: "KH", ग़: "G", ज़: "Z", ड़: "R", ढ़: "RH", फ़: "F" };
const DEV_V = { अ: "A", आ: "AA", इ: "I", ई: "EE", उ: "U", ऊ: "OO", ए: "E", ऐ: "AI", ओ: "O", औ: "AU", ऋ: "RI" };
const DEV_M = { "ा": "AA", "ि": "I", "ी": "EE", "ु": "U", "ू": "OO", "े": "E", "ै": "AI", "ो": "O", "ौ": "AU", "ृ": "RI", "ं": "N", "ँ": "N", "ः": "H" };
const TEL_C = { క: "K", ఖ: "KH", గ: "G", ఘ: "GH", ఙ: "N", చ: "CH", ఛ: "CHH", జ: "J", ఝ: "JH", ఞ: "N", ట: "T", ఠ: "TH", డ: "D", ఢ: "DH", ణ: "N", త: "T", థ: "TH", ద: "D", ధ: "DH", న: "N", ప: "P", ఫ: "PH", బ: "B", భ: "BH", మ: "M", య: "Y", ర: "R", ల: "L", వ: "V", శ: "SH", ష: "SH", స: "S", హ: "H", ళ: "L", ఱ: "R" };
const TEL_V = { అ: "A", ఆ: "AA", ఇ: "I", ఈ: "EE", ఉ: "U", ఊ: "OO", ఎ: "E", ఏ: "E", ఐ: "AI", ఒ: "O", ఓ: "O", ఔ: "AU", ఋ: "RI" };
const TEL_M = { "ా": "AA", "ి": "I", "ీ": "EE", "ు": "U", "ూ": "OO", "ె": "E", "ే": "E", "ై": "AI", "ొ": "O", "ో": "O", "ౌ": "AU", "ృ": "RI", "ం": "M", "ః": "H" };
const VIRAMA = new Set(["्", "్"]);

function transliterate(s) {
  let out = "";
  const chars = Array.from(s);
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const c = DEV_C[ch] || TEL_C[ch];
    if (c) {
      const next = chars[i + 1];
      if (next && VIRAMA.has(next)) { out += c; i++; continue; }            // dead consonant
      if (next && (DEV_M[next] || TEL_M[next])) { out += c + (DEV_M[next] || TEL_M[next]); i++; continue; }
      out += c + "A";                                                        // inherent vowel
      continue;
    }
    const v = DEV_V[ch] || TEL_V[ch]; if (v) { out += v; continue; }
    const m = DEV_M[ch] || TEL_M[ch]; if (m) { out += m; continue; }
    out += ch;
  }
  // Final inherent A is usually silent in Hindi (RAMESH not RAMESHA); keep it for Telugu-looking names ending in a vowel sign.
  return out.replace(/A\b/g, (x, off, str) => (/[KGCJTDPBMNLRSHVY]A$/.test(str.slice(Math.max(0, off - 1), off + 1)) && /[ऀ-ॿ]/.test(s) ? "" : x));
}

// ---- Normalisation ----------------------------------------------------------------------
const HONORIFICS = new Set("MR MRS MS MISS DR SHRI SRI SMT SH KUMARI KM MST MASTER PROF ADV CA ER LATE LT".split(" "));
// Common abbreviations seen on bank records and Aadhaar.
const ABBREV = { MOHD: "MOHAMMED", MD: "MOHAMMED", MOHAMMAD: "MOHAMMED", MUHAMMAD: "MOHAMMED", MOHAMED: "MOHAMMED", MOHMD: "MOHAMMED", KR: "KUMAR", KUM: "KUMAR", SK: "SHEIKH", SKH: "SHEIKH", VENKAT: "VENKATA", SUBBA: "SUBBA" };
// Words that mean the account is in a firm's name, not a person's.
const FIRM = new Set("SONS ENTERPRISES ENTERPRISE TRADERS TRADING STORE STORES AGENCIES AGENCY INDUSTRIES INDUSTRY CO COMPANY PVT LTD LIMITED LLP ASSOCIATES SERVICES SOLUTIONS TECHNOLOGIES COLLECTIONS BOUTIQUE CREATIONS FOODS TEXTILES GARMENTS JEWELLERS JEWELLERY ELECTRONICS HARDWARE AND".split(" "));
const RELATION = /\b([SDWC])\s*[\/\\]\s*O\b.*$|\b(SON|DAUGHTER|WIFE|CARE)\s+OF\b.*$/;

function normalise(s) {
  let t = String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "");
  if (/[ऀ-ॿఀ-౿]/.test(t)) t = transliterate(t);
  t = t.toUpperCase().replace(/[.,'’`"\-_(){}\[\]]/g, " ");
  t = t.replace(RELATION, " ");                       // "PRIYA REDDY S/O VENKAT" -> "PRIYA REDDY"
  t = t.replace(/[^A-Z\s]/g, " ");
  return t.split(/\s+/).filter((w) => w && !HONORIFICS.has(w)).map((w) => ABBREV[w] || w);
}
const tokenize = normalise;

// ---- Phonetic key for Indian names in Latin script ----------------------------------------
function phonetic(w) {
  let k = w;
  k = k.replace(/KSH/g, "X").replace(/CH/g, "C").replace(/SH/g, "S").replace(/PH/g, "F").replace(/TH/g, "T").replace(/DH/g, "D").replace(/BH/g, "B").replace(/GH/g, "G").replace(/KH/g, "K").replace(/JH/g, "J");
  k = k.replace(/W/g, "V").replace(/Z/g, "J").replace(/Q/g, "K").replace(/C(?=[EIY])/g, "S").replace(/C/g, "K");
  k = k.replace(/OO/g, "U").replace(/EE/g, "I").replace(/AU/g, "O").replace(/AI/g, "E").replace(/Y/g, "I");
  k = k.replace(/(.)\1+/g, "$1");                      // double letters
  k = k.replace(/H(?![AEIOU])/g, "");                   // silent H after consonant
  k = k.replace(/[AEIOU]+$/g, "");                      // trailing vowel (LAKSHMI/LAXMI keep; RAMA/RAM merge)
  k = k.replace(/(?<=.)[AEIOU]/g, "");                  // drop inner vowels, keep the first letter
  return k;
}

function lev(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

// ---- Alignment and scoring ----------------------------------------------------------------
const W = { exact: 1, phonetic: 0.9, fuzzy: 0.8, initial: 0.6, missing: 0 };
const EXTRA_PENALTY = 0.08, EXTRA_CAP = 0.25;
/** Thresholds (documented in the build log; tuned on eval/names.json). */
const T = { match: 0.85, review: 0.6 };

function kind(a, b) {
  if (a === b) return "exact";
  if (a.length === 1 && b[0] === a) return "initial";
  if (b.length === 1 && a[0] === b) return "initial";
  if (a.length >= 3 && b.length >= 3 && phonetic(a) === phonetic(b)) return "phonetic";
  const d = lev(a, b), L = Math.max(a.length, b.length);
  if ((L >= 7 && d <= 2) || (L >= 4 && d <= 1)) return "fuzzy";
  return null;
}

/**
 * Compare another document's name against the legal (PAN) name.
 * @returns {{ tokens: {text:string,state:string,kind?:string}[], score: number, verdict: "match"|"review"|"fail", pairs: any[] }}
 */
function compare(legal, other) {
  const base = normalise(legal);
  const pool = normalise(other);
  const used = pool.map(() => null);
  const pairs = [];
  // Greedy by match quality: do exact first across all words, then phonetic, fuzzy, initial.
  for (const want of ["exact", "phonetic", "fuzzy", "initial"]) {
    base.forEach((w, bi) => {
      if (pairs.some((p) => p.bi === bi)) return;
      const pi = pool.findIndex((p, i) => used[i] === null && kind(w, p) === want);
      if (pi >= 0) { used[pi] = want; pairs.push({ bi, pi, kind: want, legal: w, other: pool[pi] }); }
    });
  }
  const missing = base.filter((_, bi) => !pairs.some((p) => p.bi === bi));
  const extra = pool.filter((_, i) => used[i] === null);
  const firm = extra.some((w) => FIRM.has(w));
  let score = base.length ? pairs.reduce((s, p) => s + W[p.kind], 0) / base.length : 0;
  // Extra initials (A P J) are cheap; extra names are not.
  score -= Math.min(EXTRA_CAP, extra.reduce((s, w) => s + (w.length === 1 ? EXTRA_PENALTY / 3 : EXTRA_PENALTY), 0));
  score = Math.max(0, Math.round(score * 100) / 100);
  let verdict = score >= T.match ? "match" : score >= T.review ? "review" : "fail";
  let note = null;
  if (firm) { verdict = verdict === "fail" ? "fail" : "review"; note = "firm_name"; }           // trade-name account: a reviewer checks the proprietorship proof
  else if (base.length === 1 && extra.length && verdict === "match") { verdict = "review"; note = "single_word_legal_name"; }
  const tokens = [
    ...pool.map((p, i) => ({ text: p, state: used[i] === null ? "extra" : used[i] === "exact" ? "match" : "variant", kind: used[i] || undefined, firm: used[i] === null && FIRM.has(p) ? true : undefined })),
    ...missing.map((w) => ({ text: w, state: "missing" })),
  ];
  return { tokens, score, verdict, note, pairs, missing, extra };
}

/** Document-specific verdict: the bank name is what the ₹1 penny-drop compares against PAN; Aadhaar mismatches go to a human. */
function verdictFor(doc, cmp) {
  if (doc === "Bank") return cmp.verdict === "match" ? "match" : cmp.verdict === "review" ? "unclear" : "likely_fail";
  return cmp.verdict === "match" ? "match" : "unclear";
}

module.exports = { normalise, tokenize, transliterate, phonetic, compare, verdictFor, THRESHOLDS: T, WEIGHTS: W };
