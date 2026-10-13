// POST /api/site { url, sellsGoods } -> { ok, finalUrl, pages: {terms, privacy, refund, shipping, contact}, missing, notes }
//
// Website-readiness check: the activation review rejects sites that lack policy pages (terms,
// privacy, refund/cancellation, shipping for physical goods, contact). Merchants learn this
// after paying, one page at a time. This runs the same check before payment.
// Deterministic: fetch the home page, read links and text, match each policy by anchor/href/text.
const { cors, readBody } = require("./_lib/claude");

const REQUIRED = {
  terms: { label: "Terms and conditions", re: /terms|t&c|tnc|conditions/i },
  privacy: { label: "Privacy policy", re: /privacy/i },
  refund: { label: "Refund / cancellation policy", re: /refund|cancel|return/i },
  shipping: { label: "Shipping / delivery policy", re: /shipping|delivery|dispatch/i, goodsOnly: true },
  contact: { label: "Contact details (email or phone)", re: /contact|reach us|support|call us/i },
};
const SOCIAL = /instagram\.com|facebook\.com|wa\.me|whatsapp\.com|linktr\.ee|youtube\.com/i;

function extractLinks(html, base) {
  const out = [];
  const re = /<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) && out.length < 400) {
    const text = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    let href = m[1];
    try { href = new URL(href, base).toString(); } catch { continue; }
    out.push({ href, text });
  }
  return out;
}
const textOf = (html) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

async function fetchHtml(url) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(url, { signal: ctl.signal, redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (compatible; KYC-Preflight/1.0)" } });
    const html = await r.text();
    return { ok: r.ok, status: r.status, finalUrl: r.url || url, html: html.slice(0, 1_500_000) };
  } finally { clearTimeout(t); }
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const started = Date.now();
  try {
    let { url, sellsGoods } = await readBody(req);
    if (!url || typeof url !== "string") return res.status(400).json({ error: "url is required" });
    url = url.trim(); if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    let u; try { u = new URL(url); } catch { return res.status(400).json({ error: "That doesn't look like a URL" }); }
    if (SOCIAL.test(u.hostname + u.pathname)) {
      return res.status(200).json({ ok: true, kind: "social", finalUrl: url, pages: {}, missing: [], notes: ["Social or messaging link: no website review applies. Payment Links / Razorpay.me is the route."], ms: Date.now() - started });
    }
    const home = await fetchHtml(url);
    if (!home.ok) return res.status(200).json({ ok: false, kind: "unreachable", finalUrl: home.finalUrl, status: home.status, pages: {}, missing: Object.keys(REQUIRED), notes: [`The site answered ${home.status}. Reviewers open the same URL; it must load.`], ms: Date.now() - started });
    const links = extractLinks(home.html, home.finalUrl);
    const homeText = textOf(home.html);
    const pages = {}; const missing = []; const notes = [];
    for (const [k, spec] of Object.entries(REQUIRED)) {
      if (spec.goodsOnly && !sellsGoods) continue;
      const hit = links.find((l) => spec.re.test(l.text) || spec.re.test(l.href));
      if (hit) {
        // Confirm the linked page actually loads and has real text.
        let words = 0, status = 0;
        try { const p = await fetchHtml(hit.href); status = p.status; words = p.ok ? textOf(p.html).split(" ").filter(Boolean).length : 0; } catch { /* unreachable */ }
        pages[k] = { label: spec.label, found: true, url: hit.href, linkText: hit.text, status, words, thin: words > 0 && words < 80 };
        if (status && status >= 400) { pages[k].found = false; missing.push(k); notes.push(`${spec.label}: the link exists but the page returns ${status}.`); }
        else if (pages[k].thin) notes.push(`${spec.label}: the page has only ${words} words; reviewers reject placeholder policies.`);
      } else if (k === "contact" && (/[\w.+-]+@[\w-]+\.[\w.]+/.test(homeText) || /(\+91[\s-]?)?[6-9]\d{9}/.test(homeText))) {
        pages[k] = { label: spec.label, found: true, url: home.finalUrl, linkText: "on the home page" };
      } else { pages[k] = { label: spec.label, found: false }; missing.push(k); }
    }
    if (/pay what you want|name your price|any amount|donate|donation|contribute/i.test(homeText)) notes.push("The site mentions variable or donation-style amounts. Unregistered sellers are not approved for contributions; use fixed prices.");
    if (!/https:/.test(home.finalUrl)) notes.push("The site is not on HTTPS; reviewers expect it.");
    return res.status(200).json({ ok: true, kind: "site", finalUrl: home.finalUrl, pages, missing, notes, linksSeen: links.length, ms: Date.now() - started });
  } catch (e) {
    const timeout = /abort/i.test(String(e && e.name));
    return res.status(200).json({ ok: false, kind: "unreachable", pages: {}, missing: Object.keys(REQUIRED), notes: [timeout ? "The site took more than 8 seconds to load." : `Could not open the site: ${e.message}`], ms: Date.now() - started });
  }
};
