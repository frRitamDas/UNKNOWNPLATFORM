import type { Aspect, ProjectDoc, Word } from "@/lib/types";
import { DEFAULT_PRESET } from "@/lib/captions/presets";

export function createEmptyDoc(title: string, aspect: Aspect = "9:16"): ProjectDoc {
  return {
    version: 1,
    title,
    aspect,
    clips: [],
    captions: {
      enabled: true,
      language: "en",
      words: [],
      segments: [],
      provider: "manual",
      style: { ...DEFAULT_PRESET.style },
      offsetMs: 0,
    },
    music: null,
    audio: { clipVolume: 1, denoise: false, normalize: true, voiceBoost: false },
    framing: { background: "black", zoomPunch: false, padColor: "#000000", fit: "cover", transition: "cut" },
    branding: { watermarkText: "", watermarkEnabled: false, progressBar: false },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Turns a pasted script into word-level timings spread across the clip.
 * This is the zero-API "make captions now" path: no Whisper call needed, and
 * for scripted content it is often more accurate than ASR.
 */
export function transcriptFromScript(text: string, durationMs: number): Word[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean || durationMs <= 0) return [];
  const tokens = clean.split(" ");

  // Weight each word by character count so long words get more screen time.
  const weights = tokens.map((t) => Math.max(2, t.length) + 1.5);
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  // Leave ~120ms of breathing room at the end.
  const usable = Math.max(500, durationMs - 120);
  let cursor = 0;
  const words: Word[] = [];

  tokens.forEach((token, i) => {
    const share = (weights[i] / totalWeight) * usable;
    const start = Math.round(cursor);
    const end = Math.round(cursor + share);
    words.push({ w: token, s: start, e: end });
    cursor += share;
  });

  return words;
}

const DEMO_SCRIPT = `Okay so this is the part nobody tells you about editing your own videos.
I used to spend four hours on a clip that should have taken twenty minutes.
Then I stopped cutting frames by hand and started cutting by transcript.
You paste the raw file, the words show up on a timeline, and you delete sentences instead of frames.
The captions are already timed. The framing is already vertical.
So the only thing left is taste, and that is the part that should take your time.
That is the whole trick. Cut the story, not the pixels.`;

/**
 * Deterministic demo transcript used when no transcription provider is set.
 * Word timings are scaled to the real duration of the uploaded clip so the
 * editor behaves exactly like it does with real captions.
 */
export function generateDemoTranscript(durationMs: number): Word[] {
  if (durationMs <= 0) return [];

  // Repeat the script if the clip is long, trim if it is short.
  let script = DEMO_SCRIPT;
  while (transcriptFromScript(script, durationMs).length && estimateSpokenMs(script) < durationMs - 2000) {
    script += "\n" + DEMO_SCRIPT;
    if (script.length > 12000) break;
  }

  const words = transcriptFromScript(script, durationMs);
  return words.filter((w) => w.e <= durationMs);
}

function estimateSpokenMs(text: string): number {
  // ~2.6 words per second is a natural talking pace.
  return (text.trim().split(/\s+/).length / 2.6) * 1000;
}
