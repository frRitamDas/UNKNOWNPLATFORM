/**
 * Reelforge project document.
 * This single JSON object is the source of truth for an edit:
 * the editor mutates it, the preview renders it, and the ffmpeg worker
 * compiles it into an MP4. Version it — never break old documents.
 */

export type Aspect = "9:16" | "4:5" | "1:1" | "16:9";

export const ASPECTS: Record<Aspect, { width: number; height: number; label: string }> = {
  "9:16": { width: 1080, height: 1920, label: "Vertical (Reels, TikTok, Shorts)" },
  "4:5": { width: 1080, height: 1350, label: "Portrait (Feed)" },
  "1:1": { width: 1080, height: 1080, label: "Square" },
  "16:9": { width: 1920, height: 1080, label: "Landscape (YouTube)" },
};

/** A single transcribed word with millisecond timings on the SOURCE media timeline. */
export type Word = { w: string; s: number; e: number };

export type Segment = { text: string; s: number; e: number };

export type AnimationKind = "karaoke" | "word" | "line" | "none";
export type HighlightKind = "color" | "box" | "underline" | "scale" | "none";
export type CaptionPosition = "top" | "center" | "lower" | "bottom";

export type CaptionStyle = {
  presetId: string;
  /** Font size as a percentage of canvas WIDTH. Keeps type proportional across 720p/1080p/4K. */
  fontScale: number;
  fontFamily: string;
  fontWeight: number;
  letterSpacing: number;
  /** CSS colour strings for preview; converted to ASS BGR for render. */
  textColor: string;
  activeTextColor: string;
  highlight: HighlightKind;
  highlightBg: string;
  strokeColor: string;
  /** Stroke width as a percentage of font size. */
  strokeScale: number;
  shadow: number;
  uppercase: boolean;
  background: boolean;
  backgroundFill: string;
  backgroundRadius: number;
  position: CaptionPosition;
  /** Vertical position override, % from top. Overrides `position` when set. */
  positionYPct: number;
  maxWordsPerLine: number;
  maxCharsPerLine: number;
  lineHeight: number;
  animation: AnimationKind;
};

export type Clip = {
  id: string;
  name: string;
  /** Remote URL (Supabase signed) or object URL (local demo). */
  src: string;
  assetId?: string;
  /** Source in/out points in ms. */
  inMs: number;
  outMs: number;
  sourceDurationMs: number;
  volume: number;
  muted: boolean;
};

export type MusicTrack = {
  src: string;
  name: string;
  volume: number;
  inMs: number;
  outMs: number;
  duckUnderVoice: boolean;
};

export type ProjectDoc = {
  version: 1;
  title: string;
  aspect: Aspect;
  clips: Clip[];
  captions: {
    enabled: boolean;
    language: string;
    words: Word[];
    segments: Segment[];
    provider: "openai" | "demo" | "manual";
    style: CaptionStyle;
    /** Global nudge applied to all caption timings. */
    offsetMs: number;
  };
  music: MusicTrack | null;
  audio: { clipVolume: number; denoise: boolean; normalize: boolean; voiceBoost: boolean };
  framing: { background: "black" | "blur" | "gradient"; zoomPunch: boolean; padColor: string; fit: "cover" | "contain" };
  branding: { watermarkText: string; watermarkEnabled: boolean; progressBar: boolean };
  updatedAt: string;
};

export type ProjectStatus = "draft" | "transcribing" | "ready" | "rendering" | "exported" | "failed";

export type ProjectRow = {
  id: string;
  user_id: string;
  title: string;
  status: ProjectStatus;
  doc: ProjectDoc;
  thumbnail_url: string | null;
  duration_ms: number;
  aspect: Aspect;
  created_at: string;
  updated_at: string;
};

export type RenderRow = {
  id: string;
  project_id: string;
  user_id: string;
  status: "queued" | "processing" | "done" | "failed";
  progress: number;
  engine: "browser" | "ffmpeg";
  /** Storage path of the finished MP4 (private bucket). */
  output_path: string | null;
  /** Present only when minted by the status endpoint. */
  output_url?: string | null;
  error: string | null;
  options?: { resolution?: string; assPath?: string | null; width?: number; height?: number };
  created_at: string;
  started_at?: string | null;
  finished_at: string | null;
};

/** Total timeline duration = sum of clip trims. */
export function timelineDuration(doc: ProjectDoc): number {
  return doc.clips.reduce((sum, c) => sum + Math.max(0, c.outMs - c.inMs), 0);
}
