// Generates eval/names.json: labelled (PAN name, other-document name) pairs for the name-match engine.
// Each case is produced by a named transformation of a base name, so the expected verdict is
// defensible by construction, plus hand-written hard cases. Run: node eval/build-names.js
const fs = require("fs");
const path = require("path");

const BASES = [
  "PRIYA LAKSHMI REDDY", "RAMESH KUMAR SINGH", "ANJALI VERMA", "MOHAMMED IRFAN KHAN", "SUNITA DEVI", "VENKATA SUBRAHMANYAM",
  "DEEPAK JAIN", "FATIMA BEGUM", "ARJUN NAIR", "KAVITA SHARMA", "SURESH BABU K", "NAIMEESH TIWARI", "GURPREET KAUR", "RAJESH SHARMA",
  "SHAIK ABDUL RAHMAN", "MEENAKSHI SUNDARAM", "AMIT KUMAR GUPTA", "POOJA PATEL", "HARISH CHANDRA YADAV", "LAKSHMI NARAYANA",
];
const VARIANTS = { LAKSHMI: "LAXMI", MOHAMMED: "MOHD", KUMAR: "KR", SUBRAHMANYAM: "SUBRAMANYAM", MEENAKSHI: "MINAKSHI", NAIMEESH: "NIMISH", RAJESH: "RAJESH", SHAIK: "SHEIKH", HARISH: "HAREESH", POOJA: "PUJA", SUNITA: "SUNEETA", KAVITA: "KAVITHA", ANJALI: "ANJALEE", DEEPAK: "DIPAK", ARJUN: "ARJUN", FATIMA: "FATHIMA", GURPREET: "GURPRIT", VENKATA: "VENKAT", AMIT: "AMITH", RAMESH: "RAMESH" };
const DEV = { "RAJESH SHARMA": "राजेश शर्मा", "SUNITA DEVI": "सुनीता देवी", "AMIT KUMAR GUPTA": "अमित कुमार गुप्ता", "POOJA PATEL": "पूजा पटेल", "DEEPAK JAIN": "दीपक जैन", "ANJALI VERMA": "अंजलि वर्मा" };
const TEL = { "VENKATA SUBRAHMANYAM": "వెంకట సుబ్రహ్మణ్యం", "LAKSHMI NARAYANA": "లక్ష్మీ నారాయణ", "SURESH BABU K": "సురేష్ బాబు కె", "PRIYA LAKSHMI REDDY": "ప్రియ లక్ష్మి రెడ్డి" };
const OTHER_SURNAMES = ["GUPTA", "RAO", "MEHTA", "IYER", "DAS", "CHOUDHARY", "MISHRA", "PILLAI"];
const FIRMS = ["ENTERPRISES", "TRADERS", "& SONS", "COLLECTIONS", "CREATIONS", "STORES"];

const cases = [];
const add = (pan, other, expect, kind, note) => cases.push({ pan, other, expect, kind, ...(note ? { note } : {}) });
const words = (n) => n.split(" ");

for (const b of BASES) {
  const w = words(b);
  add(b, b, "match", "identical");
  add(b, b.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()), "match", "case");
  if (w.length >= 2) add(b, [...w].reverse().join(" "), "match", "reorder");
  if (w.length >= 3) add(b, [w[2], w[0], w[1]].join(" "), "match", "reorder_surname_first");
  add(b, `SHRI ${b}`, "match", "honorific");
  add(b, `${b} S/O ${w[w.length - 1] === "DEVI" ? "RAM" : "SURESH"} ${w[w.length - 1]}`, "match", "relation_suffix");
  add(b, b.replace(/\s/g, ". ") , "match", "punctuation");
  const vk = w.find((x) => VARIANTS[x] && VARIANTS[x] !== x);
  if (vk) add(b, b.replace(vk, VARIANTS[vk]), "match", "spelling_variant", `${vk}→${VARIANTS[vk]}`);
  if (w.length >= 2) add(b, `${w[0][0]} ${w.slice(1).join(" ")}`, "unclear", "first_name_initial");
  if (w.length >= 3) add(b, `${w[0]} ${w[1][0]} ${w[2]}`, "match", "middle_initial");
  if (w.length >= 3) add(b, `${w[0]} ${w[2]}`, "unclear", "missing_middle");
  if (w.length >= 2) add(b, w[0], "likely_fail", "first_name_only");
  if (w.length >= 2) add(b, w[w.length - 1], "likely_fail", "surname_only");
  if (w.length >= 2) add(b, `${w[0]} ${OTHER_SURNAMES[cases.length % OTHER_SURNAMES.length]}`, "likely_fail", "different_surname");
  add(b, `${b} ${FIRMS[cases.length % FIRMS.length]}`, "unclear", "firm_name");
  if (w.length === 2) add(b, `${w[0]} ${w[1]} ${OTHER_SURNAMES[(cases.length + 3) % OTHER_SURNAMES.length]}`, "unclear", "extra_surname");
  if (DEV[b]) add(b, DEV[b], "match", "devanagari");
  if (TEL[b]) add(b, TEL[b], "match", "telugu");
}
// Hand-written hard cases
add("MOHAMMED IRFAN", "MOHD IRFAN", "match", "abbreviation");
add("MOHAMMED IRFAN", "MD IRFAN", "match", "abbreviation");
add("RAMESH KUMAR", "RAMESH KR", "match", "abbreviation");
add("ABDUL KALAM", "A P J ABDUL KALAM", "match", "extra_initials");
add("PRIYA REDDY", "PRIYA REDDY & SONS", "unclear", "firm_name");
add("DEEPAK", "DEEPAK JAIN", "unclear", "single_word_pan");
add("DEEPAK", "DEEPAK", "match", "single_word_identical");
add("PRIYA LAKSHMI REDDY", "PRIYA REDDY", "unclear", "missing_middle");
add("ANJALI VERMA", "ANJALI GUPTA", "likely_fail", "different_person");
add("ANJALI VERMA", "ANJLI VERMA", "match", "typo");
add("SUNITA DEVI", "SUNITA DEVI W/O RAMESH KUMAR", "match", "relation_suffix");
add("GURPREET KAUR", "GURPREET KAUR SANDHU", "unclear", "extra_surname");
add("KAVITA SHARMA", "KAVITA SHARMA (MRS)", "match", "honorific_paren");
add("RAJESH SHARMA", "RAJESH SHARMA ENTERPRISES", "unclear", "firm_name");
add("VENKATA SUBRAHMANYAM", "V SUBRAMANYAM", "unclear", "initial_plus_variant");
add("LAKSHMI NARAYANA", "LAXMI NARAYAN", "match", "two_variants");
add("SHAIK ABDUL RAHMAN", "SK ABDUL RAHMAN", "match", "abbreviation");
add("AMIT KUMAR GUPTA", "AMIT GUPTA", "unclear", "missing_middle");
add("AMIT KUMAR GUPTA", "SUMIT KUMAR GUPTA", "likely_fail", "different_first_name_close");
add("POOJA PATEL", "POOJA BEN PATEL", "unclear", "extra_middle");
add("ARJUN NAIR", "ARJUN", "likely_fail", "first_name_only");
add("", "PRIYA REDDY", "unclear", "unreadable_pan");
add("PRIYA LAKSHMI REDDY", "", "likely_fail", "unreadable_other");

fs.writeFileSync(path.join(__dirname, "names.json"), JSON.stringify({ _about: "Expected bank-level verdicts (match | unclear | likely_fail) for PAN vs other-document names. Generated by named transformations plus hand cases.", cases }, null, 1));
console.log(`names.json: ${cases.length} cases`);
