import type { CaptionStyle, ProjectDoc, Word } from "@/lib/types";

export type CaptionLine = {
  index: number;
  words: Word[];
  startMs: number;
  endMs: number;
  text: string;
};

const MAX_LINE_MS = 4200;
const GAP_BREAK_MS = 650;

/**
 * Group word timings into caption lines. This is the ONLY place line breaking
 * happens, so the browser preview and the ffmpeg `.ass` export always agree.
 */
export function buildLines(words: Word[], style: CaptionStyle): CaptionLine[] {
  const maxWords = style.animation === "word" ? 1 : Math.max(1, style.maxWordsPerLine);
  const maxChars = Math.max(4, style.maxCharsPerLine);

  const lines: CaptionLine[] = [];
  let current: Word[] = [];

  const flush = () => {
    if (!current.length) return;
    const text = current
      .map((w) => w.w)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    lines.push({
      index: lines.length,
      words: current,
      startMs: current[0].s,
      endMs: current[current.length - 1].e,
      text,
    });
    current = [];
  };

  for (const raw of words) {
    const word: Word = { w: (raw.w ?? "").trim(), s: Math.max(0, raw.s), e: Math.max(0, raw.e) };
    if (!word.w) continue;
    if (word.e <= word.s) word.e = word.s + 180;

    if (current.length) {
      const prev = current[current.length - 1];
      const candidate = [...current, word].map((w) => w.w).join(" ").trim();
      const tooManyWords = current.length >= maxWords;
      const tooWide = candidate.length > maxChars;
      const longGap = word.s - prev.e > GAP_BREAK_MS;
      const tooLong = word.e - current[0].s > MAX_LINE_MS;
      if (tooManyWords || tooWide || longGap || tooLong) flush();
    }
    current.push(word);
  }
  flush();
  return lines;
}

export function findLineAt(lines: CaptionLine[], ms: number): CaptionLine | null {
  // Small lookahead so captions appear a hair before the word is spoken.
  if (!lines.length) return null;
  let lo = 0;
  let hi = lines.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const line = lines[mid];
    if (ms < line.startMs) hi = mid - 1;
    else if (ms > line.endMs) lo = mid + 1;
    else return line;
  }
  return null;
}

export function activeWordIndex(line: CaptionLine, ms: number): number {
  for (let i = 0; i < line.words.length; i++) {
    const w = line.words[i];
    if (ms >= w.s && ms <= w.e) return i;
  }
  // Between words: hold the last spoken word so the highlight doesn't flicker.
  let idx = -1;
  for (let i = 0; i < line.words.length; i++) if (line.words[i].s <= ms) idx = i;
  return idx;
}

/** Timeline ms → source ms for the clip that is currently playing. */
export function sourceTimeAt(doc: ProjectDoc, timelineMs: number): number {
  let cursor = 0;
  for (const clip of doc.clips) {
    const len = Math.max(0, clip.outMs - clip.inMs);
    if (timelineMs <= cursor + len) return clip.inMs + (timelineMs - cursor);
    cursor += len;
  }
  const last = doc.clips[doc.clips.length - 1];
  return last ? last.outMs : timelineMs;
}

/** Source ms → timeline ms (for drawing caption lines on the timeline ruler). */
export function timelineTimeFor(doc: ProjectDoc, sourceMs: number): number {
  let cursor = 0;
  for (const clip of doc.clips) {
    if (sourceMs >= clip.inMs && sourceMs <= clip.outMs) return cursor + (sourceMs - clip.inMs);
    cursor += Math.max(0, clip.outMs - clip.inMs);
  }
  return -1;
}

/** Filter caption words down to the parts of the source that survived trimming. */
export function wordsInRange(words: Word[], clip: { inMs: number; outMs: number }): Word[] {
  return words.filter((w) => w.e > clip.inMs && w.s < clip.outMs).map((w) => ({ ...w }));
}

export function formatTimecode(ms: number, withMs = false): string {
  const safe = Math.max(0, Math.round(ms));
  const totalSeconds = Math.floor(safe / 1000);
  const mmm = String(safe % 1000).padStart(3, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);
  const head = h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
  return withMs ? `${head}.${mmm}` : head;
}
