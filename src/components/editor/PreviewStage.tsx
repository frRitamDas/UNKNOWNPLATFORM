"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play, RotateCcw, SkipBack, SkipForward, Upload, Volume2, VolumeX } from "lucide-react";
import type { ProjectDoc } from "@/lib/types";
import { ASPECTS } from "@/lib/types";
import { CaptionLayer } from "@/components/captions/CaptionLayer";
import { formatTimecode } from "@/lib/captions/layout";
import { cn } from "@/lib/utils";

type Props = {
  doc: ProjectDoc;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  activeSrc: string;
  time: number;
  duration: number;
  playing: boolean;
  onToggle: () => void;
  onSeek: (ms: number) => void;
  onUpload: (file: File) => void;
  uploadBusy: boolean;
  onVideoReady: () => void;
};

export function PreviewStage({
  doc,
  videoRef,
  activeSrc,
  time,
  duration,
  playing,
  onToggle,
  onSeek,
  onUpload,
  uploadBusy,
  onVideoReady,
}: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(360);
  const [muted, setMuted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const hasClip = doc.clips.length > 0;
  const aspect = ASPECTS[doc.aspect];

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (width > 0) setStageWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasClip, doc.aspect]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted, videoRef]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-[#08090c]">
      <div className="flex min-h-0 flex-1 items-center justify-center p-3 sm:p-5">
        <div
          ref={boxRef}
          className="relative max-h-full w-auto max-w-full overflow-hidden rounded-lg bg-black shadow-[0_30px_80px_-40px_rgba(0,0,0,1)] ring-1 ring-white/5"
          style={{ aspectRatio: `${aspect.width} / ${aspect.height}`, height: "100%" }}
        >
          {hasClip ? (
            <>
              <video
                ref={videoRef}
                src={activeSrc || undefined}
                playsInline
                preload="auto"
                crossOrigin="anonymous"
                onLoadedMetadata={onVideoReady}
                onCanPlay={onVideoReady}
                onClick={onToggle}
                className="h-full w-full bg-black"
                style={{ objectFit: doc.framing.fit, background: doc.framing.padColor }}
              />

              <CaptionLayer
                style={doc.captions.style}
                words={doc.captions.words}
                currentMs={time + doc.captions.offsetMs}
                stageWidth={stageWidth}
                visible={doc.captions.enabled}
              />

              {doc.branding.watermarkEnabled && doc.branding.watermarkText && (
                <div className="pointer-events-none absolute bottom-3 right-3 rounded bg-black/30 px-1.5 py-0.5 text-[9px] font-semibold text-white/60 backdrop-blur-sm">
                  {doc.branding.watermarkText}
                </div>
              )}

              {doc.branding.progressBar && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-white/15">
                  <div
                    className="h-full bg-ember"
                    style={{ width: `${duration ? Math.min(100, (time / duration) * 100) : 0}%` }}
                  />
                </div>
              )}

              {!playing && (
                <button
                  onClick={onToggle}
                  className="absolute inset-0 z-30 grid place-items-center bg-black/20 opacity-0 transition-opacity hover:opacity-100"
                  aria-label="Play"
                >
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-ember/90 text-ink-950 shadow-xl backdrop-blur">
                    <Play className="ml-0.5 h-6 w-6 fill-current" />
                  </span>
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadBusy}
              className="group flex h-full w-full flex-col items-center justify-center gap-3 bg-[radial-gradient(80%_80%_at_50%_40%,rgba(201,249,80,0.06),transparent_70%)] px-6 text-center"
            >
              {uploadBusy ? (
                <Loader2 className="h-7 w-7 animate-spin text-ember" />
              ) : (
                <span className="grid h-12 w-12 place-items-center rounded-2xl border border-ink-700 bg-ink-850 text-ember transition-transform group-hover:scale-105">
                  <Upload className="h-5 w-5" />
                </span>
              )}
              <span className="block text-[13px] font-semibold text-ink-100">
                {uploadBusy ? "Uploading…" : "Add your clip"}
              </span>
              <span className="block max-w-[220px] text-[11px] leading-relaxed text-ink-500">
                MP4, MOV or WEBM. Captions appear as soon as the file is in.
              </span>
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />

      {/* transport */}
      <div className="flex items-center justify-between gap-2 border-t border-ink-800 px-3 py-2">
        <div className="flex items-center gap-1">
          <button onClick={() => onSeek(time - 1000)} className="rounded-md p-1.5 text-ink-400 hover:bg-ink-800 hover:text-ink-100" aria-label="Back 1 second">
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onSeek(0)} className="rounded-md p-1.5 text-ink-400 hover:bg-ink-800 hover:text-ink-100" aria-label="Go to start">
            <SkipBack className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onToggle}
            disabled={!hasClip}
            className="grid h-8 w-8 place-items-center rounded-full bg-ember text-ink-950 disabled:opacity-40"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
          </button>
          <button onClick={() => onSeek(duration)} className="rounded-md p-1.5 text-ink-400 hover:bg-ink-800 hover:text-ink-100" aria-label="Go to end">
            <SkipForward className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] tabular-nums text-ink-400">
            {formatTimecode(time)} <span className="text-ink-600">/</span> {formatTimecode(duration)}
          </span>
          <span className={cn("hidden rounded border border-ink-700 px-1.5 py-0.5 text-[9.5px] font-semibold text-ink-400 sm:block")}>
            {doc.aspect} · {aspect.width}×{aspect.height}
          </span>
          <button
            onClick={() => setMuted((m) => !m)}
            className="rounded-md p-1.5 text-ink-400 hover:bg-ink-800 hover:text-ink-100"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
