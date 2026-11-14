"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Film,
  ImagePlus,
  Loader2,
  Music4,
  Paperclip,
  Play,
  Plus,
  Smartphone,
  Sparkles,
  Type,
  UserRound,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import type { Aspect, CaptionStyle, Word } from "@/lib/types";
import { PRESETS, getPreset } from "@/lib/captions/presets";
import { CaptionLayer } from "@/components/captions/CaptionLayer";
import { captureThumbnail } from "@/lib/media/thumbnail";
import { cn, formatBytes } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────
   Prompt chips — every one maps to a real document change.
   ───────────────────────────────────────────────────────────── */
export type ChipId = "captions" | "transitions" | "punchy" | "social" | "audio";

const CHIPS: { id: ChipId; label: string; icon: typeof Type }[] = [
  { id: "captions", label: "Add captions", icon: Type },
  { id: "transitions", label: "Edit with transitions", icon: Wand2 },
  { id: "punchy", label: "Make it punchy", icon: Zap },
  { id: "social", label: "Make this a social media video", icon: Smartphone },
  { id: "audio", label: "Add a trending audio track", icon: Music4 },
];

export type ComposerResult = {
  file: File;
  styleId: string;
  chips: ChipId[];
  musicFile: File | null;
  aspect: Aspect;
};

/* ─────────────────────────────────────────────────────────────
   Composer
   ───────────────────────────────────────────────────────────── */
export function Composer({
  styleId,
  onStyleChange,
  onStart,
  busy,
  busyLabel,
  onOpenStyles,
}: {
  styleId: string;
  onStyleChange: (id: string) => void;
  onStart: (result: ComposerResult) => void;
  busy: boolean;
  busyLabel: string | null;
  onOpenStyles: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [poster, setPoster] = useState<string | null>(null);
  const [chips, setChips] = useState<ChipId[]>(["captions"]);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoInput = useRef<HTMLInputElement>(null);
  const musicInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setPoster(null);
      return;
    }
    const url = URL.createObjectURL(file);
    void captureThumbnail(url, 1, 480).then(setPoster);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pickFile(next: File | null) {
    setError(null);
    if (!next) return;
    if (!next.type.startsWith("video/")) {
      setError("That is not a video file. MP4, MOV or WEBM works.");
      return;
    }
    if (next.size > 25 * 1024 * 1024) {
      setError(`That clip is ${formatBytes(next.size)}. The beta caps uploads at 25 MB.`);
      return;
    }
    setFile(next);
  }

  function toggleChip(id: ChipId) {
    if (id === "audio" && !musicFile) {
      musicInput.current?.click();
      return;
    }
    setChips((current) => (current.includes(id) ? current.filter((c) => c !== id) : [...current, id]));
  }

  const preset = getPreset(styleId);

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          pickFile(event.dataTransfer.files?.[0] ?? null);
        }}
        className={cn(
          "relative overflow-hidden rounded-2xl border border-dashed transition-colors",
          dragging ? "border-ember bg-ember/[0.06]" : "border-white/15 bg-white/[0.02]",
        )}
      >
        {file ? (
          <div className="flex flex-col items-center gap-3 px-4 py-5 sm:flex-row sm:items-center">
            <div className="relative h-24 w-[54px] shrink-0 overflow-hidden rounded-lg bg-app-800 ring-1 ring-white/10">
              {poster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={poster} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-app-500">
                  <Film className="h-4 w-4" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="truncate text-[13px] font-semibold text-white">{file.name}</p>
              <p className="mt-0.5 text-[11.5px] text-app-400">
                {formatBytes(file.size)} · style{" "}
                <span className="text-ember">{preset.name}</span>
                {musicFile ? ` · music ${musicFile.name.slice(0, 18)}` : ""}
              </p>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setMusicFile(null);
              }}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-[11.5px] text-app-200 hover:bg-white/5"
            >
              Replace
            </button>
          </div>
        ) : (
          <button
            onClick={() => videoInput.current?.click()}
            disabled={busy}
            className="group flex w-full flex-col items-center justify-center gap-2 px-6 py-10 text-center sm:py-12"
          >
            <span className="relative mb-1">
              <span className="absolute inset-0 rotate-[-8deg] rounded-xl border border-white/10 bg-white/[0.04]" />
              <span className="relative grid h-14 w-14 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-app-200 transition-transform group-hover:scale-105">
                <Plus className="h-5 w-5" />
              </span>
            </span>
            <span className="text-[13.5px] font-semibold text-white">Add media</span>
            <span className="text-[11.5px] text-app-400">(videos, images, audio, etc)</span>
          </button>
        )}
      </div>

      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-rose-signal">
          <X className="h-3 w-3" /> {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-app-300">How do you want to edit your video?</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => videoInput.current?.click()}
          className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-app-200 hover:bg-white/10 hover:text-white"
          aria-label="Attach media"
        >
          <Paperclip className="h-4 w-4" />
        </button>

        <button onClick={onOpenStyles} className="rf-chip">
          <Sparkles className="h-3.5 w-3.5" />
          Add style
          <span className="ml-1 rounded-full bg-white/10 px-1.5 text-[10px] text-app-200">{preset.name}</span>
        </button>

        <button
          onClick={() => setChips((c) => (c.includes("captions") ? c.filter((x) => x !== "captions") : [...c, "captions"]))}
          className="rf-chip"
          data-active={chips.includes("captions")}
        >
          <Type className="h-3.5 w-3.5" />
          Captions
          {chips.includes("captions") && <Check className="h-3 w-3 text-ember" />}
        </button>

        <button className="rf-chip cursor-not-allowed opacity-60" title="AI avatars are next on the roadmap" disabled>
          <UserRound className="h-3.5 w-3.5" />
          Add avatar
          <span className="rounded-full bg-white/10 px-1.5 text-[9px] uppercase tracking-wide">soon</span>
        </button>

        <div className="flex-1" />

        <button
          onClick={() => file && onStart({ file, styleId, chips, musicFile, aspect: "9:16" })}
          disabled={!file || busy}
          className="rf-btn rf-btn-primary ml-auto h-9 px-4 text-[12.5px]"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {busy ? busyLabel ?? "Working…" : "Create my video"}
          {!busy && <ArrowRight className="h-3.5 w-3.5" />}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {CHIPS.map((chip) => (
          <button
            key={chip.id}
            onClick={() => toggleChip(chip.id)}
            data-active={chips.includes(chip.id)}
            className="rf-chip text-[12px]"
            title={
              chip.id === "audio"
                ? "Pick an audio file to mix under the voice"
                : chip.id === "transitions"
                  ? "Dips to black between clips (multi-clip projects)"
                  : undefined
            }
          >
            <chip.icon className="h-3.5 w-3.5" />
            {chip.id === "audio" && musicFile ? musicFile.name.slice(0, 20) : chip.label}
            {chips.includes(chip.id) && chip.id !== "audio" && <Check className="h-3 w-3 text-ember" />}
          </button>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-app-500">
        By uploading a video to be edited using AI, you are agreeing to our{" "}
        <span className="text-app-300 underline decoration-app-600">Terms</span> and have read our{" "}
        <span className="text-app-300 underline decoration-app-600">Privacy Policy</span>.
      </p>

      <input
        ref={videoInput}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(event) => {
          pickFile(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
      />
      <input
        ref={musicInput}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(event) => {
          const picked = event.target.files?.[0] ?? null;
          if (picked) {
            setMusicFile(picked);
            setChips((c) => (c.includes("audio") ? c : [...c, "audio"]));
          }
          event.target.value = "";
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Style gallery — real presets, rendered by the real engine
   ───────────────────────────────────────────────────────────── */
const CATEGORIES = [
  { id: "trending", label: "Trending", presets: ["hormozi", "karaoke-pop", "beast", "tiktok-box"] },
  { id: "bold", label: "Bold", presets: ["yellow-impact", "beast", "hormozi"] },
  { id: "clean", label: "Clean", presets: ["clean", "underline", "podcast"] },
  { id: "editorial", label: "Editorial", presets: ["editorial", "podcast", "clean"] },
] as const;

const BACKDROPS = [
  "linear-gradient(160deg,#2b2118 0%,#171310 60%,#0d0b09 100%)",
  "linear-gradient(160deg,#16222e 0%,#101820 60%,#080b0f 100%)",
  "linear-gradient(160deg,#2a1b23 0%,#1b1218 60%,#0c090b 100%)",
  "linear-gradient(160deg,#1d2a1c 0%,#121a12 60%,#080d08 100%)",
];

const TILE_WORDS: Word[] = [
  { w: "this", s: 0, e: 400 },
  { w: "is", s: 400, e: 700 },
  { w: "how", s: 700, e: 1000 },
  { w: "it", s: 1000, e: 1200 },
  { w: "reads", s: 1200, e: 1600 },
];

export function StyleGallery({
  selected,
  onSelect,
  sectionRef,
}: {
  selected: string;
  onSelect: (id: string) => void;
  sectionRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["id"]>("trending");
  const active = CATEGORIES.find((c) => c.id === category) ?? CATEGORIES[0];

  const tiles = useMemo(
    () => active.presets.map((id, index) => ({ preset: getPreset(id), backdrop: BACKDROPS[index % BACKDROPS.length] })),
    [active],
  );

  return (
    <section ref={sectionRef} className="scroll-mt-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {CATEGORIES.map((item) => (
          <button
            key={item.id}
            onClick={() => setCategory(item.id)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors",
              category === item.id
                ? "bg-white text-app-950"
                : "border border-white/10 text-app-200 hover:bg-white/5 hover:text-white",
            )}
          >
            {item.label}
          </button>
        ))}
        <div className="ml-auto hidden items-center gap-2 sm:flex">
          <span className="text-[11px] text-app-500">{PRESETS.length} styles</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map(({ preset, backdrop }) => (
          <StyleTile
            key={preset.id}
            id={preset.id}
            name={preset.name}
            style={preset.style}
            backdrop={backdrop}
            selected={selected === preset.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}

function StyleTile({
  id,
  name,
  style,
  backdrop,
  selected,
  onSelect,
}: {
  id: string;
  name: string;
  style: CaptionStyle;
  backdrop: string;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [width, setWidth] = useState(160);

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
    <button
      ref={ref}
      onClick={() => onSelect(id)}
      className={cn(
        "group relative aspect-[9/16] overflow-hidden rounded-xl ring-1 transition-all",
        selected ? "ring-2 ring-ember" : "ring-white/10 hover:ring-white/25",
      )}
      aria-pressed={selected}
      aria-label={`Use the ${name} caption style`}
    >
      <span className="absolute inset-0" style={{ background: backdrop }} />
      <span className="absolute inset-0 opacity-70 [background:radial-gradient(70%_45%_at_70%_18%,rgba(255,161,76,0.25),transparent_65%),radial-gradient(60%_40%_at_20%_80%,rgba(62,198,245,0.18),transparent_65%)]" />

      <CaptionLayer style={style} words={TILE_WORDS} currentMs={850} stageWidth={width} />

      <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/85 to-transparent px-2 pb-1.5 pt-6">
        <span className="text-[11px] font-semibold text-white/90">{name}</span>
        <span className="grid h-4 w-4 place-items-center rounded-full bg-white/15 text-[8px] text-white opacity-0 transition-opacity group-hover:opacity-100">
          <Play className="h-2 w-2 fill-current" />
        </span>
      </span>

      {selected && (
        <span className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full bg-ember text-[9px] font-bold text-app-950">
          <Check className="h-2.5 w-2.5" />
        </span>
      )}
    </button>
  );
}

/* Empty-state used by the Projects tab */
export function EmptyProjects({ onNew }: { onNew: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-6 py-14 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-app-200">
        <ImagePlus className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-[15px] font-semibold text-white">No projects yet</h3>
      <p className="mx-auto mt-1 max-w-xs text-[12.5px] leading-relaxed text-app-400">
        Drop a clip into the composer and Reelforge builds the project, transcribes it and styles the captions.
      </p>
      <button onClick={onNew} className="rf-btn rf-btn-primary mx-auto mt-5 h-9 text-[12.5px]">
        <Plus className="h-3.5 w-3.5" /> New project
      </button>
    </div>
  );
}

export { CHIPS };
