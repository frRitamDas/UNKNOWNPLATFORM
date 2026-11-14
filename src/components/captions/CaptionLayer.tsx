"use client";

import { useMemo } from "react";
import type { CaptionStyle, Word } from "@/lib/types";
import { buildLines, findLineAt, activeWordIndex } from "@/lib/captions/layout";
import { cn } from "@/lib/utils";

type Props = {
  style: CaptionStyle;
  words: Word[];
  /** Playhead position in ms on the SOURCE media timeline. */
  currentMs: number;
  /** Rendered width of the video stage in px — all caption sizes derive from it. */
  stageWidth: number;
  className?: string;
  /** When false, captions are hidden but still mounted (used for export ghosting). */
  visible?: boolean;
};

/**
 * The live caption preview. Mirrors @/lib/captions/ass.ts so that what the user
 * sees here is what ffmpeg burns into the exported MP4.
 */
export function CaptionLayer({ style, words, currentMs, stageWidth, className, visible = true }: Props) {
  const lines = useMemo(() => buildLines(words, style), [words, style]);
  const line = useMemo(() => findLineAt(lines, currentMs), [lines, currentMs]);
  const activeIdx = line ? activeWordIndex(line, currentMs) : -1;

  if (!visible || !line) return null;

  const fontSize = (stageWidth * style.fontScale) / 100;
  const strokeWidth = style.strokeScale * fontSize;
  const paddingX = style.background ? fontSize * 0.28 : 0;
  const paddingY = style.background ? fontSize * 0.1 : 0;

  const shadow =
    style.shadow > 0
      ? `0 ${(fontSize * 0.045).toFixed(1)}px ${(fontSize * 0.14).toFixed(1)}px rgba(0,0,0,${Math.min(
          0.85,
          style.shadow,
        )})`
      : "none";

  return (
    <div
      className={cn("pointer-events-none absolute inset-x-0 z-20 flex justify-center px-[5%]", className)}
      style={{ top: `${style.positionYPct}%`, transform: "translateY(-50%)" }}
      aria-hidden="true"
    >
      <div
        key={line.index}
        className={style.animation === "word" || style.animation === "line" ? "rf-anim-slide" : undefined}
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "baseline",
          columnGap: `${fontSize * 0.24}px`,
          rowGap: 0,
          maxWidth: "100%",
          textAlign: "center",
          background: style.background ? style.backgroundFill : undefined,
          opacity: style.background ? 0.92 : 1,
          borderRadius: style.background ? fontSize * style.backgroundRadius : undefined,
          padding: `${paddingY}px ${paddingX}px`,
        }}
      >
        {line.words.map((word, i) => {
          const isActive = i === activeIdx;
          const text = style.uppercase ? word.w.toUpperCase() : word.w;

          const highlightBox = isActive && style.highlight === "box";
          const highlightUnderline = isActive && style.highlight === "underline";
          const highlightScale = isActive && style.highlight === "scale";

          const color = isActive && style.highlight !== "none" ? style.activeTextColor : style.textColor;

          return (
            <span
              key={`${line.index}-${i}-${word.s}`}
              className={cn(
                "inline-block whitespace-pre",
                style.animation === "word" && isActive && "rf-anim-pop",
              )}
              style={{
                fontFamily: `"${style.fontFamily}", "Inter", system-ui, sans-serif`,
                fontWeight: style.fontWeight,
                fontSize: `${fontSize}px`,
                lineHeight: style.lineHeight,
                letterSpacing: `${style.letterSpacing}em`,
                color: highlightBox ? "#06070A" : color,
                WebkitTextStroke: strokeWidth > 0 ? `${strokeWidth.toFixed(2)}px ${style.strokeColor}` : undefined,
                paintOrder: "stroke fill",
                textShadow: shadow,
                textTransform: style.uppercase ? "uppercase" : "none",
                background: highlightBox ? style.highlightBg : undefined,
                borderRadius: highlightBox ? fontSize * 0.22 : undefined,
                padding: highlightBox ? `${fontSize * 0.02}px ${fontSize * 0.18}px` : undefined,
                margin: highlightBox ? `0 -${fontSize * 0.18}px` : undefined,
                boxDecorationBreak: highlightBox ? "clone" : undefined,
                borderBottom: highlightUnderline ? `${Math.max(2, fontSize * 0.09).toFixed(1)}px solid ${style.highlightBg}` : undefined,
                paddingBottom: highlightUnderline ? `${fontSize * 0.04}px` : undefined,
                transform: highlightScale ? "scale(1.12)" : undefined,
                transformOrigin: "center bottom",
                transition: "color 70ms linear, background-color 70ms linear, transform 90ms ease-out",
              }}
            >
              {text}
            </span>
          );
        })}
      </div>
    </div>
  );
}
