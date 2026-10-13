import { Platform } from "react-native";
import type { Candidate, ClassifyAI, Decision, Lang, NamesAI } from "./data";

// Web: the app and the API are served from the same Vercel deployment, so relative URLs work.
// Native: set EXPO_PUBLIC_API_URL to the deployed URL (e.g. https://kyc-preflight.vercel.app).
const ENV_URL = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/$/, "");
export const API_BASE = ENV_URL || (Platform.OS === "web" ? "" : "");
const canReach = () => Platform.OS === "web" || Boolean(ENV_URL);

async function post<T>(path: string, body: unknown, timeoutMs = 45000): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

export type Health = { ok: boolean; liveAI: boolean; model?: string };
export async function health(): Promise<Health | null> {
  if (!canReach()) return null;
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 6000);
    const res = await fetch(`${API_BASE}/api/health`, { signal: ctl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as Health;
  } catch {
    return null;
  }
}

export type AIResult<T> = { ai: T; model: string; ms: number };

export type ClassifyResult = AIResult<ClassifyAI> & { decision: Decision; candidates: Candidate[]; queryTerms: string[] };
export const classify = (text: string, lang: Lang, qa?: { question: string; answer: string }) =>
  post<ClassifyResult>("/api/classify", { text, lang, qa });

export type DocInput = { sample: string } | { base64: string; mediaType: string };
export type NamesResult = AIResult<NamesAI> & {
  engine: Record<string, { score: number; verdict: string; note: string | null }>;
  disagreements: { doc: string; model: string; engine: string; score: number }[];
  thresholds: { match: number; review: number };
};
export const readNames = (docs: { pan: DocInput; aadhaar: DocInput; bank: DocInput }, lang: Lang) =>
  post<NamesResult>("/api/names", { docs, lang }, 60000);
