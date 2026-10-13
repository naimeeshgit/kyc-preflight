// Voice input. Two engines behind one interface:
//  1. The browser's speech recognition (Chrome, including Android Chrome): free, streams interim text,
//     supports en-IN, hi-IN, te-IN. Used by default on web.
//  2. Gnani ASR (Indian-language speech API) through /api/transcribe: records audio, posts it, gets text.
//     Enabled when the server has GNANI_API_KEY; keys never reach the app.
import { Platform } from "react-native";
import { API_BASE } from "./api";

export type VoiceLang = "en" | "hi";
const BCP = { en: "en-IN", hi: "hi-IN" } as const;

export const browserSpeechAvailable = () =>
  Platform.OS === "web" && typeof window !== "undefined" && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

/** Start listening; calls onText with the full transcript so far. Returns a stop function. */
export function startBrowserSpeech(lang: VoiceLang, onText: (text: string, final: boolean) => void, onEnd: (err?: string) => void): () => void {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const rec = new SR();
  rec.lang = BCP[lang]; rec.interimResults = true; rec.continuous = true; rec.maxAlternatives = 1;
  let finalText = "";
  rec.onresult = (e: any) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalText += (finalText ? " " : "") + t.trim(); else interim += t;
    }
    onText((finalText + (interim ? " " + interim : "")).trim(), !interim);
  };
  rec.onerror = (e: any) => onEnd(e?.error || "speech error");
  rec.onend = () => onEnd();
  rec.start();
  return () => { try { rec.stop(); } catch { /* already stopped */ } };
}

/** Gnani path: record with MediaRecorder, send to the server adapter. */
export async function recordAndTranscribe(lang: VoiceLang, seconds = 8, onLevel?: (n: number) => void): Promise<string> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const chunks: Blob[] = [];
  const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
  rec.ondataavailable = (e) => chunks.push(e.data);
  const done = new Promise<void>((res) => { rec.onstop = () => res(); });
  rec.start();
  await new Promise((r) => setTimeout(r, seconds * 1000));
  rec.stop(); await done; stream.getTracks().forEach((t) => t.stop());
  const blob = new Blob(chunks, { type: "audio/webm" });
  const base64 = await new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(",")[1]); fr.readAsDataURL(blob); });
  const r = await fetch(`${API_BASE}/api/transcribe`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ audioBase64: base64, mimeType: "audio/webm", lang: BCP[lang] }) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || `Transcription failed (${r.status})`);
  return j.text as string;
}
