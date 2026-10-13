// POST /api/site { url, sellsGoods } -> { ok, finalUrl, pages: {terms, privacy, refund, shipping, contact}, missing, notes }
//
// Website-readiness check: the activation review rejects sites that lack policy pages (terms,
// privacy, refund/cancellation, shipping for physical goods, contact). Merchants learn this
// after paying, one page at a time. This runs the same check before payment.
// Deterministic: fetch the home page, read links and text, match each policy by anchor/href/text.
const { cors, readBody } = require("./_lib/claude");

// For each policy: how its URL path usually looks (strong signal), how its link text reads (weaker),
// and where stores conventionally put it (Shopify /policies/*, WooCommerce/WordPress, Wix) to probe directly.
const REQUIRED = {
  terms: { label: "Terms and conditions", path: /terms|tnc|t-and-c|conditions/i, text: /\bterms\b|t&c|tnc|conditions/i, probe: ["/policies/terms-of-service", "/terms-of-service", "/terms-and-conditions", "/terms", "/pages/terms-and-conditions", "/pages/terms-of-service", "/terms-conditions"] },
  privacy: { label: "Privacy policy", path: /privacy/i, text: /privacy/i, probe: ["/policies/privacy-policy", "/privacy-policy", "/privacy", "/pages/privacy-policy"] },
  refund: { label: "Refund / cancellation policy", path: /refund|cancel|return/i, text: /refund|cancellation|returns?\b/i, probe: ["/policies/refund-policy", "/refund-policy", "/return-policy", "/returns", "/pages/refund-policy", "/pages/return-policy", "/cancellation-policy", "/pages/cancellation-and-refund-policy"] },
  shipping: { label: "Shipping / delivery policy", path: /shipping|delivery|dispatch/i, text: /shipping|delivery|dispatch/i, goodsOnly: true, probe: ["/policies/shipping-policy", "/shipping-policy", "/shipping", "/pages/shipping-policy", "/delivery-policy", "/pages/shipping-and-delivery"] },
  contact: { label: "Contact details (email or phone)", path: /contact/i, text: /contact|reach us|call us|support/i, probe: ["/pages/contact", "/contact", "/contact-us", "/pages/contact-us", "/policies/contact-information"] },
};
const SOCIAL = /instagram\.com|facebook\.com|wa\.me|whatsapp\.com|linktr\.ee|youtube\.com/i;

function extractLinks(html, base) {
  const out = [];
  const seen = new Set();
  // Anchors with text.
  const re = /<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) && out.length < 600) {
    const text = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
    let href = m[1];
    try { href = new URL(href, base).toString(); } catch { continue; }
    if (seen.has(href)) continue; seen.add(href);
    out.push({ href, text });
  }
  // Any other href (menus rendered oddly, JSON in scripts) — path only matters.
  const re2 = /href\s*=\s*["']([^"'#\s]+)["']/gi;
  while ((m = re2.exec(html)) && out.length < 1200) {
    let href = m[1]; try { href = new URL(href, base).toString(); } catch { continue; }
    if (seen.has(href)) continue; seen.add(href);
    out.push({ href, text: "" });
  }
  return out;
}
const pathOf = (href) => { try { return new URL(href).pathname; } catch { return ""; } };
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
    const sameSite = (href) => { try { return new URL(href).hostname.replace(/^www\./, "") === u.hostname.replace(/^www\./, ""); } catch { return false; } };
    const verify = async (href) => { try { const p = await fetchHtml(href); return { status: p.status, words: p.ok ? textOf(p.html).split(" ").filter(Boolean).length : 0 }; } catch { return { status: 0, words: 0 }; } };
    for (const [k, spec] of Object.entries(REQUIRED)) {
      if (spec.goodsOnly && !sellsGoods) continue;
      // 1. A same-site link whose path says what it is. 2. A link whose short text says what it is. 3. Probe conventional URLs.
      let hit = links.find((l) => sameSite(l.href) && spec.path.test(pathOf(l.href)))
        || links.find((l) => l.text && l.text.length <= 40 && !/\d{2}/.test(l.text) && spec.text.test(l.text));
      let how = hit ? (spec.path.test(pathOf(hit.href)) ? pathOf(hit.href) : hit.text) : "";
      let v = hit ? await verify(hit.href) : null;
      if (!hit || (v && v.status >= 400)) {
        for (const probe of spec.probe) {
          const href = new URL(probe, home.finalUrl).toString();
          const pv = await verify(href);
          if (pv.status && pv.status < 400 && pv.words >= 40) { hit = { href, text: "" }; v = pv; how = probe; break; }
        }
      }
      if (hit && v && v.status < 400) {
        pages[k] = { label: spec.label, found: true, url: hit.href, linkText: how, status: v.status, words: v.words, thin: v.words > 0 && v.words < 80 };
        if (pages[k].thin) notes.push(`${spec.label}: the page has only ${v.words} words; reviewers reject placeholder policies.`);
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
