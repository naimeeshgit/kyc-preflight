// Deterministic word-level comparison of names, used to draw the name-match view.
// AI reads the names off the documents; this shows exactly which words line up.

export type TokenState = "match" | "variant" | "missing" | "extra";
export type Token = { text: string; state: TokenState };

export const tokenize = (s: string) =>
  String(s || "").toUpperCase().replace(/[^A-Z\s]/g, " ").split(/\s+/).filter(Boolean);

function lev(a: string, b: string) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

/** Compare another document's name against the legal (PAN) name, word by word.
 * Returned in the other document's own word order (so a surname-first Aadhaar reads as printed),
 * with any PAN words it lacks appended as "missing". */
export function compareNames(legal: string, other: string): Token[] {
  const base = tokenize(legal);
  const pool = tokenize(other);
  const states: (TokenState | null)[] = pool.map(() => null);
  const missing: string[] = [];
  for (const w of base) {
    let idx = pool.findIndex((p, i) => states[i] === null && p === w);
    let state: TokenState = "match";
    if (idx < 0) {
      idx = pool.findIndex((p, i) => states[i] === null && ((p.length === 1 && p === w[0]) || (w.length >= 5 && lev(p, w) <= 2)));
      state = "variant";
    }
    if (idx < 0) missing.push(w); else states[idx] = state;
  }
  return [...pool.map((p, i) => ({ text: p, state: states[i] ?? ("extra" as TokenState) })), ...missing.map((w) => ({ text: w, state: "missing" as TokenState }))];
}
