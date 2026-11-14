import type { CaptionStyle } from "@/lib/types";

/**
 * Caption presets. Each is a full CaptionStyle so the editor can fork a preset
 * and the user can tweak anything without breaking the original.
 *
 * fontFamily values are deliberately chosen from fonts available in the
 * render worker image (see worker/Dockerfile) AND common on desktop, so the
 * preview and the exported MP4 look the same.
 */
export type Preset = {
  id: string;
  name: string;
  blurb: string;
  style: CaptionStyle;
  /** Small swatch triple used by the preset picker UI. */
  swatch: [string, string, string];
};

const base: CaptionStyle = {
  presetId: "clean",
  fontScale: 6.4,
  fontFamily: "Inter",
  fontWeight: 800,
  letterSpacing: 0,
  textColor: "#FFFFFF",
  activeTextColor: "#FFFFFF",
  highlight: "color",
  highlightBg: "#7CFF4F",
  strokeColor: "#000000",
  strokeScale: 0,
  shadow: 0.35,
  uppercase: false,
  background: false,
  backgroundFill: "#000000",
  backgroundRadius: 0.28,
  position: "center",
  positionYPct: 62,
  maxWordsPerLine: 4,
  maxCharsPerLine: 18,
  lineHeight: 1.18,
  animation: "karaoke",
};

export const PRESETS: Preset[] = [
  {
    id: "clean",
    name: "Clean",
    blurb: "Newsroom white, subtle shadow. Safe everywhere.",
    swatch: ["#FFFFFF", "#FFFFFF", "#0B0C10"],
    style: { ...base, presetId: "clean" },
  },
  {
    id: "hormozi",
    name: "Hormozi",
    blurb: "Bold uppercase, one loud active word. Highest retention.",
    swatch: ["#FFFFFF", "#FFE24B", "#0B0C10"],
    style: {
      ...base,
      presetId: "hormozi",
      fontScale: 8.2,
      fontWeight: 900,
      uppercase: true,
      textColor: "#FFFFFF",
      activeTextColor: "#FFE24B",
      highlight: "color",
      strokeScale: 0.14,
      strokeColor: "#000000",
      shadow: 0.15,
      maxWordsPerLine: 3,
      maxCharsPerLine: 14,
      positionYPct: 58,
    },
  },
  {
    id: "karaoke-pop",
    name: "Karaoke Pop",
    blurb: "One giant word at a time with a scale punch.",
    swatch: ["#FFFFFF", "#7CFF4F", "#0B0C10"],
    style: {
      ...base,
      presetId: "karaoke-pop",
      fontScale: 12,
      fontWeight: 900,
      uppercase: true,
      animation: "word",
      activeTextColor: "#7CFF4F",
      strokeScale: 0.1,
      strokeColor: "#000000",
      maxWordsPerLine: 1,
      maxCharsPerLine: 12,
      positionYPct: 60,
    },
  },
  {
    id: "tiktok-box",
    name: "Box",
    blurb: "White on a black pill. Reads on any footage.",
    swatch: ["#FFFFFF", "#FFFFFF", "#111111"],
    style: {
      ...base,
      presetId: "tiktok-box",
      fontScale: 5.6,
      fontWeight: 700,
      background: true,
      backgroundFill: "#000000",
      backgroundRadius: 0.5,
      shadow: 0,
      maxWordsPerLine: 3,
      maxCharsPerLine: 16,
      positionYPct: 72,
    },
  },
  {
    id: "neon",
    name: "Neon",
    blurb: "Acid green glow for tech and gaming edits.",
    swatch: ["#C6FF00", "#7CFF4F", "#0B0C10"],
    style: {
      ...base,
      presetId: "neon",
      fontScale: 7.2,
      fontWeight: 800,
      uppercase: true,
      textColor: "#C6FF00",
      activeTextColor: "#FFFFFF",
      highlight: "box",
      highlightBg: "#7CFF4F",
      strokeScale: 0.08,
      strokeColor: "#04230B",
      maxWordsPerLine: 3,
      positionYPct: 66,
    },
  },
  {
    id: "podcast",
    name: "Podcast",
    blurb: "Two quiet lines, lower third. Talking-head friendly.",
    swatch: ["#F2F2F2", "#FFD166", "#0B0C10"],
    style: {
      ...base,
      presetId: "podcast",
      fontScale: 4.8,
      fontWeight: 650,
      letterSpacing: 0.01,
      position: "bottom",
      positionYPct: 80,
      activeTextColor: "#FFD166",
      highlight: "color",
      maxWordsPerLine: 6,
      maxCharsPerLine: 26,
      lineHeight: 1.3,
    },
  },
  {
    id: "yellow-impact",
    name: "Yellow Impact",
    blurb: "Condensed yellow caps, hard black edge.",
    swatch: ["#FFD400", "#FFFFFF", "#0B0C10"],
    style: {
      ...base,
      presetId: "yellow-impact",
      fontScale: 8.8,
      fontWeight: 900,
      uppercase: true,
      textColor: "#FFD400",
      activeTextColor: "#FFFFFF",
      highlight: "color",
      strokeScale: 0.16,
      strokeColor: "#000000",
      maxWordsPerLine: 2,
      maxCharsPerLine: 12,
      positionYPct: 64,
    },
  },
  {
    id: "editorial",
    name: "Editorial",
    blurb: "Serif, sentence case, film-doc mood.",
    swatch: ["#FAF6EE", "#FFD166", "#0B0C10"],
    style: {
      ...base,
      presetId: "editorial",
      fontFamily: "Playfair Display",
      fontScale: 5.4,
      fontWeight: 500,
      textColor: "#FAF6EE",
      activeTextColor: "#FFD166",
      highlight: "color",
      shadow: 0.4,
      maxWordsPerLine: 5,
      maxCharsPerLine: 22,
      positionYPct: 76,
    },
  },
  {
    id: "underline",
    name: "Underline",
    blurb: "Minimal, the active word gets a marker underline.",
    swatch: ["#FFFFFF", "#FF5A5F", "#0B0C10"],
    style: {
      ...base,
      presetId: "underline",
      fontScale: 5.8,
      fontWeight: 750,
      highlight: "underline",
      highlightBg: "#FF5A5F",
      maxWordsPerLine: 5,
      maxCharsPerLine: 22,
      positionYPct: 74,
    },
  },
  {
    id: "beast",
    name: "Beast",
    blurb: "Red/white, tight tracking, maximum volume.",
    swatch: ["#FFFFFF", "#FF3B30", "#0B0C10"],
    style: {
      ...base,
      presetId: "beast",
      fontScale: 9.6,
      fontWeight: 900,
      uppercase: true,
      letterSpacing: -0.02,
      textColor: "#FFFFFF",
      activeTextColor: "#FF3B30",
      highlight: "color",
      strokeScale: 0.18,
      strokeColor: "#000000",
      maxWordsPerLine: 2,
      maxCharsPerLine: 11,
      positionYPct: 60,
    },
  },
];

export const DEFAULT_PRESET = PRESETS[0];

export function getPreset(id: string): Preset {
  return PRESETS.find((p) => p.id === id) ?? DEFAULT_PRESET;
}

export function applyPreset(style: CaptionStyle, id: string): CaptionStyle {
  const preset = getPreset(id);
  // Keep the user's global adjustments that are preset-agnostic.
  return { ...preset.style, positionYPct: style.positionYPct, position: style.position };
}
