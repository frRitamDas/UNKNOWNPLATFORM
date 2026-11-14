"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Music4, Paperclip, Plus, Sparkles, Smartphone, Type, UserRound, Wand2, Zap } from "lucide-react";
import type { Word } from "@/lib/types";
import { getPreset } from "@/lib/captions/presets";
import { CaptionLayer } from "@/components/captions/CaptionLayer";
import { cn } from "@/lib/utils";

const CHIPS = [
  { label: "Add captions", icon: Type },
  { label: "Edit with transitions", icon: Wand2 },
  { label: "Make it punchy", icon: Zap },
  { label: "Make this a social media video", icon: Smartphone },
  { label: "Add a trending audio track", icon: Music4 },
];

/** Static product preview. Every control routes into the real app. */
export function MarketingComposer() {
  return (
    <div className="mkt-card mx-auto w-full max-w-3xl p-4 sm:p-5">
      <Link
        href="/dashboard"
        className="relative flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-cream-900/15 bg-white/40 py-12 transition-colors hover:border-cream-900/25 hover:bg-white/60"
      >
        <span className="relative mb-1">
          <span className="absolute inset-0 rotate-[-8deg] rounded-xl border border-cream-900/10 bg-white/60" />
          <span className="relative grid h-14 w-14 place-items-center rounded-xl border border-cream-900/10 bg-white text-cream-700 shadow-sm">
            <Plus className="h-5 w-5" />
          </span>
        </span>
        <p className="text-[13.5px] font-semibold text-cream-900">Add media</p>
        <p className="text-[11.5px] text-cream-700/80">(videos, images, audio, etc)</p>
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link href="/dashboard" className="mkt-chip" aria-label="Attach media">
          <Paperclip className="h-3.5 w-3.5" />
        </Link>
        <Link href="/dashboard" className="mkt-chip">
          <Sparkles className="h-3.5 w-3.5" />
          Add style
        </Link>
        <span className="mkt-chip opacity-60">
          <UserRound className="h-3.5 w-3.5" />
          Add avatar
          <span className="rounded-full bg-cream-900/8 px-1.5 text-[9px] uppercase tracking-wide">soon</span>
        </span>
        <div className="flex-1" />
        <Link
          href="/dashboard"
          className="ml-auto inline-flex items-center gap-2 rounded-full bg-cream-900 px-4 py-2 text-[12.5px] font-semibold text-cream-50 transition-transform hover:-translate-y-0.5"
        >
          Create my video <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {CHIPS.map((chip) => (
          <Link key={chip.label} href="/dashboard" className="mkt-chip text-[12px]">
            <chip.icon className="h-3.5 w-3.5" />
            {chip.label}
          </Link>
        ))}
      </div>

      <p className="mt-3 text-[10.5px] text-cream-700/70">
        By uploading a video to be edited using AI, you are agreeing to our Terms and have read our Privacy Policy.
      </p>
    </div>
  );
}

const WORDS: Word[] = [
  { w: "cut", s: 0, e: 300 },
  { w: "the", s: 300, e: 500 },
  { w: "story", s: 500, e: 900 },
  { w: "not", s: 900, e: 1100 },
  { w: "the", s: 1100, e: 1300 },
  { w: "pixels", s: 1300, e: 1800 },
];

const TILES = [
  {
    id: "hormozi",
    label: "Hook",
    backdrop: "linear-gradient(165deg,#3b2a1b 0%,#221812 55%,#100c09 100%)",
  },
  {
    id: "beast",
    label: "Bold",
    backdrop: "linear-gradient(165deg,#31201c 0%,#221312 55%,#0f0908 100%)",
  },
  {
    id: "editorial",
    label: "Editorial",
    backdrop: "linear-gradient(165deg,#2b2a24 0%,#1d1c18 55%,#0f0e0c 100%)",
  },
  {
    id: "tiktok-box",
    label: "Podcast",
    backdrop: "linear-gradient(165deg,#1f2730 0%,#151a20 55%,#0a0d10 100%)",
  },
  {
    id: "karaoke-pop",
    label: "Karaoke",
    backdrop: "linear-gradient(165deg,#2a2331 0%,#1b1620 55%,#0c0a10 100%)",
  },
];

export function MarketingStyles() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {TILES.map((tile) => (
        <LightStyleTile key={tile.id} {...tile} />
      ))}
    </div>
  );
}

function LightStyleTile({ id, label, backdrop }: { id: string; label: string; backdrop: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [width, setWidth] = useState(150);
  const preset = getPreset(id);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width ?? 0;
      if (next > 0) setWidth(next);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Link
      ref={ref}
      href="/dashboard"
      className={cn(
        "group relative aspect-[9/16] overflow-hidden rounded-2xl ring-1 ring-cream-900/10 transition-all",
        "hover:-translate-y-1 hover:shadow-[0_24px_40px_-24px_rgba(29,26,22,0.5)]",
      )}
    >
      <span className="absolute inset-0" style={{ background: backdrop }} />
      <span className="absolute inset-0 opacity-70 [background:radial-gradient(70%_45%_at_70%_18%,rgba(255,161,76,0.22),transparent_65%),radial-gradient(60%_40%_at_20%_80%,rgba(62,198,245,0.16),transparent_65%)]" />
      <CaptionLayer style={preset.style} words={WORDS} currentMs={950} stageWidth={width} />
      <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/85 to-transparent px-2 pb-1.5 pt-6">
        <span className="text-[11px] font-semibold text-white/90">{label}</span>
        <span className="text-[9.5px] text-white/60">{preset.name}</span>
      </span>
    </Link>
  );
}
