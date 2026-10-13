// Word-level name comparison for the name-match view. The engine itself lives in shared/namematch.js
// and is the same code the API runs, so what the seller sees is what the server decided.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const NM = require("../shared/namematch") as {
  compare: (legal: string, other: string) => { tokens: Token[]; score: number; verdict: "match" | "review" | "fail"; note: string | null };
  tokenize: (s: string) => string[];
  THRESHOLDS: { match: number; review: number };
};

export type TokenState = "match" | "variant" | "missing" | "extra";
export type Token = { text: string; state: TokenState; kind?: "exact" | "phonetic" | "fuzzy" | "initial"; firm?: boolean };

export const tokenize = NM.tokenize;
export const THRESHOLDS = NM.THRESHOLDS;
export const compareNames = (legal: string, other: string): Token[] => NM.compare(legal, other).tokens;
export const scoreNames = (legal: string, other: string) => NM.compare(legal, other);
