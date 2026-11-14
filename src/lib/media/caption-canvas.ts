import type { CaptionStyle, Word } from "@/lib/types";
import { buildLines, findLineAt, activeWordIndex } from "@/lib/captions/layout";
import { parseCssColor } from "@/lib/captions/colors";

/**
 * Canvas implementation of the caption layout, used by the in-browser exporter.
 *
 * This is the third renderer (React preview, ffmpeg .ass, canvas). All three
 * share buildLines() so line breaking always matches; the geometry constants
 * below mirror CaptionLayer.tsx and ass.ts.
 */

const WORD_GAP_RATIO = 0.24;

export function drawCaptionFrame(
  ctx: CanvasRenderingContext2D,
  words: Word[],
  style: CaptionStyle,
  currentMs: number,
  width: number,
  height: number,
) {
  const lines = buildLines(words, style);
  const line = findLineAt(lines, currentMs);
  if (!line) return;

  const activeIdx = activeWordIndex(line, currentMs);
  const fs = (width * style.fontScale) / 100;
  const gap = fs * WORD_GAP_RATIO;
  const strokeWidth = style.strokeScale * fs;
  const anchorY = (height * style.positionYPct) / 100;
  const maxWidth = width * 0.9;

  const fontFor = (word: string) => `${style.fontWeight} ${fs}px "${style.fontFamily}", "Inter", system-ui, sans-serif`;

  // Measure + wrap into visual rows.
  const wordsToDraw = line.words.map((w) => (style.uppercase ? w.w.toUpperCase() : w.w));
  const widths: number[] = [];
  for (const [i, word] of wordsToDraw.entries()) {
    ctx.font = fontFor(word);
    widths.push(ctx.measureText(word).width);
  }

  const rows: number[][] = [];
  let row: number[] = [];
  let rowWidth = 0;
  wordsToDraw.forEach((_, i) => {
    const w = widths[i];
    const projected = rowWidth + (row.length ? gap : 0) + w;
    if (row.length && projected > maxWidth) {
      rows.push(row);
      row = [i];
      rowWidth = w;
    } else {
      rowWidth = projected;
      row.push(i);
    }
  });
  if (row.length) rows.push(row);

  const lineHeight = fs * style.lineHeight;
  const blockHeight = rows.length * lineHeight;

  // Background pill behind the whole block.
  if (style.background) {
    const widest = Math.max(...rows.map((r) => r.reduce((sum, i) => sum + widths[i], 0) + gap * (r.length - 1)));
    const padX = fs * 0.28;
    const padY = fs * 0.12;
    ctx.save();
    ctx.fillStyle = withAlpha(style.backgroundFill, 0.92);
    roundRect(ctx, width / 2 - widest / 2 - padX, anchorY - blockHeight / 2 - padY, widest + padX * 2, blockHeight + padY * 2, fs * style.backgroundRadius);
    ctx.fill();
    ctx.restore();
  }

  rows.forEach((indices, rowIndex) => {
    const totalWidth = indices.reduce((sum, i) => sum + widths[i], 0) + gap * (indices.length - 1);
    let x = width / 2 - totalWidth / 2;
    const baselineY = anchorY - blockHeight / 2 + rowIndex * lineHeight + lineHeight * 0.5 + fs * 0.35;

    for (const i of indices) {
      const word = wordsToDraw[i];
      const isActive = i === activeIdx;
      const textWidth = widths[i];
      ctx.font = fontFor(word);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";

      if (isActive && style.highlight === "box") {
        ctx.save();
        ctx.fillStyle = style.highlightBg;
        roundRect(ctx, x - fs * 0.14, baselineY - fs * 0.86, textWidth + fs * 0.28, fs * 1.14, fs * 0.22);
        ctx.fill();
        ctx.restore();
      }

      if (isActive && style.highlight === "underline") {
        ctx.save();
        ctx.fillStyle = style.highlightBg;
        ctx.fillRect(x, baselineY + fs * 0.14, textWidth, Math.max(2, fs * 0.08));
        ctx.restore();
      }

      const fill =
        isActive && style.highlight !== "none"
          ? style.highlight === "box"
            ? "#06070A"
            : style.activeTextColor
          : style.textColor;

      if (style.shadow > 0 && !(isActive && style.highlight === "box")) {
        ctx.save();
        ctx.shadowColor = `rgba(0,0,0,${Math.min(0.85, style.shadow)})`;
        ctx.shadowBlur = fs * 0.14;
        ctx.shadowOffsetY = fs * 0.045;
        ctx.fillStyle = fill;
        ctx.fillText(word, x, baselineY);
        ctx.restore();
      } else {
        ctx.fillStyle = fill;
        ctx.fillText(word, x, baselineY);
      }

      if (strokeWidth > 0) {
        ctx.save();
        ctx.strokeStyle = style.strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.lineJoin = "round";
        ctx.miterLimit = 2;
        ctx.strokeText(word, x, baselineY);
        // Re-fill so the stroke does not eat into the glyph.
        ctx.fillStyle = fill;
        ctx.fillText(word, x, baselineY);
        ctx.restore();
      }

      x += textWidth + gap;
    }
  });
}

function withAlpha(color: string, alpha: number) {
  const { r, g, b, a } = parseCssColor(color);
  return `rgba(${r},${g},${b},${a * alpha})`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function drawWatermark(ctx: CanvasRenderingContext2D, text: string, width: number, height: number) {
  if (!text) return;
  const fs = width * 0.022;
  ctx.save();
  ctx.font = `700 ${fs}px "Inter", system-ui, sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = fs * 0.5;
  ctx.fillText(text, width - fs * 1.2, height - fs * 1.2);
  ctx.restore();
}

export function drawProgressBar(ctx: CanvasRenderingContext2D, progress: number, width: number, height: number) {
  const h = Math.max(3, height * 0.004);
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(0, height - h, width, h);
  ctx.fillStyle = "#C9F950";
  ctx.fillRect(0, height - h, width * Math.max(0, Math.min(1, progress)), h);
  ctx.restore();
}
