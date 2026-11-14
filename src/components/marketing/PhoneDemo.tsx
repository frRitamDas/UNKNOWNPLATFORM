"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CaptionLayer } from "@/components/captions/CaptionLayer";
import { PRESETS } from "@/lib/captions/presets";
import { transcriptFromScript } from "@/lib/project-defaults";
import { formatTimecode } from "@/lib/captions/layout";

const SCRIPT =
  "I stopped editing frames by hand and started editing the transcript instead. Delete a sentence, the video cuts itself. The captions are already timed. That is the whole trick.";

const LOOP_MS = 15000;
const CYCLE_MS = 5200;

/**
 * Animated product proof on the landing page. It runs the real caption engine —
 * the same buildLines/findLineAt code the editor uses — so the marketing demo
 * can never drift from the actual output.
 */
export function PhoneDemo() {
  const [ms, setMs] = useState(0);
  const [presetIndex, setPresetIndex] = useState(1);
  const startRef = useRef<number>(0);

  const words = useMemo(() => transcriptFromScript(SCRIPT, LOOP_MS - 1200), []);

  useEffect(() => {
    let raf = 0;
    startRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = (now - startRef.current) % LOOP_MS;
      setMs(elapsed);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const cycle = setInterval(() => {
      setPresetIndex((i) => (i + 1) % PRESETS.length);
    }, CYCLE_MS);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(cycle);
    };
  }, []);

  const preset = PRESETS[presetIndex];
  const progress = Math.min(1, ms / LOOP_MS);

  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      {/* glow */}
      <div className="pointer-events-none absolute -inset-10 -z-10 rounded-full bg-lime-signal/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-10 -z-10 h-40 w-40 rounded-full bg-violet-signal/20 blur-3xl" />

      {/* device */}
      <div className="relative rounded-[2.6rem] border border-ink-600/80 bg-ink-850 p-2.5 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.9)]">
        <div className="absolute left-1/2 top-2.5 z-30 h-5 w-24 -translate-x-1/2 rounded-full bg-ink-950" />
        <div className="relative overflow-hidden rounded-[2.1rem] bg-ink-950" style={{ aspectRatio: "9 / 16" }}>
          {/* fake footage */}
          <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_20%_0%,#2b3a2a_0%,#111a16_45%,#070a09_100%)]" />
          <div className="absolute inset-0 opacity-70 [background:radial-gradient(60%_45%_at_75%_30%,rgba(201,249,80,0.22),transparent_70%),radial-gradient(45%_35%_at_20%_75%,rgba(123,97,255,0.25),transparent_70%)]" />
          <div className="rf-noise absolute inset-0" />

          {/* subject silhouette */}
          <div className="absolute bottom-0 left-1/2 h-[62%] w-[76%] -translate-x-1/2 rounded-t-[45%] bg-gradient-to-b from-ink-600/50 to-ink-900/80 blur-[2px]" />

          {/* top chrome */}
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pt-8 text-[10px] font-medium text-white/70">
            <span className="rounded-full bg-black/40 px-2 py-1 backdrop-blur-sm">REC ● 0:14</span>
            <span className="rounded-full bg-black/40 px-2 py-1 backdrop-blur-sm">{preset.name}</span>
          </div>

          {/* the real captions */}
          <CaptionLayer
            style={preset.style}
            words={words}
            currentMs={ms}
            stageWidth={310}
          />

          {/* bottom chrome */}
          <div className="absolute inset-x-0 bottom-0 z-20 space-y-2 p-4">
            <div className="flex items-center gap-2 text-[10px] text-white/80">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-lime-signal text-[9px] font-bold text-ink-950">
                RF
              </span>
              <span className="font-semibold">@yourhandle</span>
              <span className="text-white/40">·</span>
              <span className="text-white/50">Original audio</span>
            </div>
            <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-lime-signal" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* floating status cards */}
      <div className="absolute -left-6 top-[22%] hidden animate-none rounded-xl border border-ink-700 bg-ink-850/95 px-3 py-2 shadow-xl backdrop-blur sm:-left-10 sm:block">
        <div className="flex items-center gap-2">
          <span className="rf-pulse h-1.5 w-1.5 rounded-full bg-lime-signal" />
          <span className="text-[10px] font-semibold tracking-wide text-ink-200">Transcribing · 98%</span>
        </div>
        <div className="mt-1.5 h-1 w-28 overflow-hidden rounded-full bg-ink-700">
          <div className="h-full w-[98%] rounded-full bg-lime-signal" />
        </div>
      </div>

      <div className="absolute -right-4 bottom-[24%] hidden rounded-xl border border-ink-700 bg-ink-850/95 px-3 py-2 shadow-xl backdrop-blur sm:-right-8 sm:block">
        <div className="text-[10px] font-semibold text-ink-200">Auto reframe → 9:16</div>
        <div className="mt-1 text-[10px] text-ink-400">{formatTimecode(ms)} / 0:14</div>
      </div>
    </div>
  );
}
