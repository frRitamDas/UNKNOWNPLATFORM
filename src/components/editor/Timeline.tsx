"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Scissors } from "lucide-react";
import type { ProjectDoc } from "@/lib/types";
import { timelineDuration } from "@/lib/types";
import { buildLines, formatTimecode, timelineTimeFor } from "@/lib/captions/layout";
import { clipOffsets } from "@/components/editor/useTimelinePlayer";
import { cn } from "@/lib/utils";

type Props = {
  doc: ProjectDoc;
  time: number;
  onSeek: (ms: number) => void;
  onTrim: (clipId: string, inMs: number, outMs: number) => void;
};

/**
 * Two-part timeline:
 *  1. Trim bar — the full source clip with draggable in/out handles.
 *  2. Programme timeline — clips, caption blocks and the playhead.
 */
export function Timeline({ doc, time, onSeek, onTrim }: Props) {
  const duration = Math.max(1, timelineDuration(doc));
  const trackRef = useRef<HTMLDivElement>(null);
  const [scrubbing, setScrubbing] = useState(false);

  const offsets = useMemo(() => clipOffsets(doc.clips), [doc.clips]);
  const captionBlocks = useMemo(() => {
    return buildLines(doc.captions.words, {
      ...doc.captions.style,
      maxWordsPerLine: 6,
      maxCharsPerLine: 32,
      animation: "karaoke",
    })
      .map((line) => ({
        start: timelineTimeFor(doc, line.startMs + doc.captions.offsetMs),
        end: timelineTimeFor(doc, line.endMs + doc.captions.offsetMs),
      }))
      .filter((b) => b.start >= 0 && b.end > b.start);
  }, [doc]);

  const seekFromEvent = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      onSeek(ratio * duration);
    },
    [duration, onSeek],
  );

  useEffect(() => {
    if (!scrubbing) return;
    const onMove = (e: PointerEvent) => seekFromEvent(e.clientX);
    const onUp = () => setScrubbing(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [scrubbing, seekFromEvent]);

  const ticks = useMemo(() => {
    const stepMs = duration > 120000 ? 30000 : duration > 60000 ? 10000 : 5000;
    const marks: number[] = [];
    for (let ms = 0; ms <= duration; ms += stepMs) marks.push(ms);
    return marks;
  }, [duration]);

  const playheadPct = Math.min(100, (time / duration) * 100);

  return (
    <div className="border-t border-ink-800 bg-ink-900/70">
      {/* trim bar for the first clip */}
      {doc.clips[0] && (
        <TrimBar clip={doc.clips[0]} onTrim={onTrim} playheadSourceMs={doc.clips[0].inMs + time} />
      )}

      {/* programme */}
      <div className="px-3 pb-3 pt-1">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-500">Timeline</span>
          <span className="font-mono text-[10px] tabular-nums text-ink-500">
            {formatTimecode(time, true)} / {formatTimecode(duration, true)}
          </span>
        </div>

        <div
          ref={trackRef}
          className="relative select-none rounded-lg border border-ink-800 bg-ink-950/60 px-0 py-0"
          onPointerDown={(e) => {
            setScrubbing(true);
            seekFromEvent(e.clientX);
          }}
          role="slider"
          aria-label="Timeline position"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(time)}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") onSeek(time + 1000);
            if (e.key === "ArrowLeft") onSeek(time - 1000);
          }}
        >
          {/* ruler */}
          <div className="relative h-4 border-b border-ink-800">
            {ticks.map((ms) => (
              <div key={ms} className="absolute top-0 h-full" style={{ left: `${(ms / duration) * 100}%` }}>
                <div className="h-1.5 w-px bg-ink-600" />
                <span className="absolute left-1 top-0 font-mono text-[8.5px] text-ink-600">{formatTimecode(ms)}</span>
              </div>
            ))}
          </div>

          {/* clip lane */}
          <div className="relative h-7 border-b border-ink-800/70">
            {doc.clips.map((clip, i) => {
              const offset = offsets[i];
              return (
                <div
                  key={clip.id}
                  className="absolute inset-y-1 overflow-hidden rounded border border-ember/30 bg-ember/10"
                  style={{
                    left: `${(offset.startMs / duration) * 100}%`,
                    width: `${Math.max(0.8, (offset.lengthMs / duration) * 100)}%`,
                  }}
                >
                  <span className="absolute left-1 top-1/2 -translate-y-1/2 truncate text-[9px] font-medium text-ember/80">
                    {clip.name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* caption lane */}
          <div className="relative h-6">
            {captionBlocks.map((block, i) => (
              <div
                key={i}
                className="absolute inset-y-1.5 rounded-sm bg-ink-500/50"
                style={{
                  left: `${(block.start / duration) * 100}%`,
                  width: `${Math.max(0.4, ((block.end - block.start) / duration) * 100)}%`,
                }}
                title="Caption"
              />
            ))}
            {captionBlocks.length === 0 && (
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-ink-600">no captions</span>
            )}
          </div>

          {/* playhead */}
          <div
            className="pointer-events-none absolute top-0 z-10 h-full w-px bg-ember"
            style={{ left: `${playheadPct}%` }}
          >
            <div className="absolute -left-[5px] top-0 h-2.5 w-2.5 rounded-sm bg-ember" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TrimBar({
  clip,
  onTrim,
  playheadSourceMs,
}: {
  clip: ProjectDoc["clips"][number];
  onTrim: (clipId: string, inMs: number, outMs: number) => void;
  playheadSourceMs: number;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"in" | "out" | null>(null);
  const source = Math.max(1, clip.sourceDurationMs);

  const msFromClientX = useCallback(
    (clientX: number) => {
      const el = barRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      return Math.max(0, Math.min(source, ((clientX - rect.left) / rect.width) * source));
    },
    [source],
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const ms = msFromClientX(e.clientX);
      if (dragging === "in") onTrim(clip.id, Math.min(ms, clip.outMs - 200), clip.outMs);
      else onTrim(clip.id, clip.inMs, Math.max(ms, clip.inMs + 200));
    };
    const onUp = () => setDragging(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [clip.id, clip.inMs, clip.outMs, dragging, msFromClientX, onTrim]);

  const inPct = (clip.inMs / source) * 100;
  const outPct = (clip.outMs / source) * 100;

  return (
    <div className="px-3 pt-2.5">
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-500">
          <Scissors className="h-3 w-3" /> Trim
        </span>
        <span className="font-mono text-[10px] tabular-nums text-ink-400">
          in {formatTimecode(clip.inMs, true)} · out {formatTimecode(clip.outMs, true)} ·{" "}
          <span className="text-ember">{formatTimecode(clip.outMs - clip.inMs)}</span>
        </span>
      </div>

      <div ref={barRef} className="relative h-8 select-none overflow-hidden rounded-md border border-ink-800 bg-ink-950">
        {/* waveform-ish decoration */}
        <div className="absolute inset-0 flex items-center gap-px px-0.5 opacity-40">
          {Array.from({ length: 160 }).map((_, i) => {
            const height = 20 + Math.abs(Math.sin(i * 0.7)) * 60 + Math.abs(Math.cos(i * 0.23)) * 20;
            const inRange = (i / 160) * 100 >= inPct && (i / 160) * 100 <= outPct;
            return (
              <span
                key={i}
                className={cn("flex-1 rounded-sm", inRange ? "bg-ember/70" : "bg-ink-600/50")}
                style={{ height: `${Math.min(88, height)}%` }}
              />
            );
          })}
        </div>

        {/* dimmed regions */}
        <div className="absolute inset-y-0 left-0 bg-ink-950/75" style={{ width: `${inPct}%` }} />
        <div className="absolute inset-y-0 right-0 bg-ink-950/75" style={{ width: `${100 - outPct}%` }} />

        {/* selection border */}
        <div
          className="pointer-events-none absolute inset-y-0 border-y-2 border-ember/70"
          style={{ left: `${inPct}%`, width: `${outPct - inPct}%` }}
        />

        {/* playhead inside source */}
        <div
          className="pointer-events-none absolute inset-y-0 w-px bg-white/70"
          style={{ left: `${Math.min(100, (playheadSourceMs / source) * 100)}%` }}
        />

        {/* handles */}
        {(["in", "out"] as const).map((which) => (
          <button
            key={which}
            type="button"
            aria-label={`Drag ${which} point`}
            onPointerDown={(e) => {
              e.stopPropagation();
              setDragging(which);
            }}
            className="absolute inset-y-0 z-10 w-2.5 cursor-ew-resize bg-ember/90 transition-colors hover:bg-ember"
            style={{ left: `calc(${which === "in" ? inPct : outPct}% - ${which === "in" ? 0 : 10}px)` }}
          >
            <span className="absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-ink-950/60" />
          </button>
        ))}
      </div>
    </div>
  );
}
