/**
 * Colour conversion helpers. ASS/SSA uses &HAABBGGRR — alpha first, and
 * BGR byte order. Web/CSS uses #RRGGBB(+AA at the end).
 */

function clamp(n: number, lo = 0, hi = 255) {
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

export function parseCssColor(input: string): { r: number; g: number; b: number; a: number } {
  const c = (input || "#FFFFFF").trim();

  if (c.startsWith("#")) {
    const hex = c.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      const [r, g, b, a] = hex.split("").map((h) => parseInt(h + h, 16));
      return { r, g, b, a: a === undefined ? 1 : a / 255 };
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      return { r, g, b, a };
    }
  }

  const rgba = c.match(/rgba?\(([^)]+)\)/i);
  if (rgba) {
    const parts = rgba[1].split(/[,/\s]+/).filter(Boolean).map(Number);
    return { r: parts[0] ?? 255, g: parts[1] ?? 255, b: parts[2] ?? 255, a: parts[3] ?? 1 };
  }

  return { r: 255, g: 255, b: 255, a: 1 };
}

/** #RRGGBBAA → &HAABBGGRR (ASS wants the inverse alpha: 00 = opaque). */
export function cssToAssColor(input: string, opacity = 1): string {
  const { r, g, b, a } = parseCssColor(input);
  const alpha = clamp((1 - a * opacity) * 255);
  return `&H${hex(alpha)}${hex(b)}${hex(g)}${hex(r)}`;
}

function hex(n: number) {
  return clamp(n).toString(16).toUpperCase().padStart(2, "0");
}

export function cssToRgba(input: string, opacity: number): string {
  const { r, g, b } = parseCssColor(input);
  return `rgba(${clamp(r)}, ${clamp(g)}, ${clamp(b)}, ${Math.max(0, Math.min(1, opacity))})`;
}

/** Pick readable text colour for a filled chip. */
export function contrastOn(bg: string): string {
  const { r, g, b } = parseCssColor(bg);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#0B0C10" : "#FFFFFF";
}
