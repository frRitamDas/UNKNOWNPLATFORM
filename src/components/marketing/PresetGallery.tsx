"use client";

import { useEffect, useMemo, useState } from "react";
import { CaptionLayer } from "@/components/captions/CaptionLayer";
import { PRESETS } from "@/lib/captions/presets";
import { transcriptFromScript } from "@/lib/project-defaults";
import { cn } from "@/lib/utils";

const SCRIPT =
  "Every preset is real. Pick one, then change the font, the colour, the size, the position. Nothing is locked.";
const LOOP_MS = 12000;

export function PresetGallery() {
  const [selected, setSelected] = useState(1);
  const [ms, setMs] = useState(0);
  const words = useMemo(() => transcriptFromScript(SCRIPT, LOOP_MS - 800), []);
  const preset = PRESETS[selected];

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setMs((now - start) % LOOP_MS);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,320px)_1fr] lg:gap-12">
      {/* stage */}
      <div className="mx-auto w-full max-w-[320px]">
        <div className="relative overflow-hidden rounded-2xl border border-ink-700 bg-ink-900 shadow-2xl" style={{ aspectRatio: "4 / 5" }}>
          <div className="absolute inset-0 bg-[linear-gradient(160deg,#1b2430_0%,#0e1218_55%,#080a0d_100%)]" />
          <div className="absolute inset-0 opacity-80 [background:radial-gradient(70%_50%_at_30%_20%,rgba(123,97,255,0.28),transparent_70%),radial-gradient(60%_40%_at_80%_80%,rgba(201,249,80,0.16),transparent_70%)]" />
          <div className="rf-noise absolute inset-0" />
          <CaptionLayer style={preset.style} words={words} currentMs={ms} stageWidth={300} />
          <div className="absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-semibold text-white/80 backdrop-blur">
            {preset.name}
          </div>
        </div>
      </div>

      {/* picker */}
      <div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PRESETS.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(i)}
              className={cn(
                "group flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors",
                i === selected
                  ? "border-lime-signal/60 bg-lime-signal/10"
                  : "border-ink-700 bg-ink-850 hover:border-ink-600 hover:bg-ink-800",
              )}
              aria-pressed={i === selected}
            >
              <span className="flex shrink-0 flex-col gap-0.5">
                {p.swatch.map((c, ci) => (
                  <span key={ci} className="h-1 w-4 rounded-full" style={{ background: c }} />
                ))}
              </span>
              <span className="truncate text-[13px] font-semibold text-ink-100">{p.name}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-ink-700 bg-ink-850/70 p-4">
          <p className="text-sm text-ink-300">{preset.blurb}</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px] sm:grid-cols-4">
            <Meta label="Type" value={`${preset.style.fontFamily} ${preset.style.fontWeight}`} />
            <Meta label="Animation" value={preset.style.animation} />
            <Meta label="Highlight" value={preset.style.highlight} />
            <Meta label="Words / line" value={String(preset.style.maxWordsPerLine)} />
          </dl>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.08em] text-ink-500">{label}</dt>
      <dd className="mt-0.5 truncate capitalize text-ink-200">{value}</dd>
    </div>
  );
}
