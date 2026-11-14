"use client";

import { useRef } from "react";
import { Music, Trash2, Upload } from "lucide-react";
import type { Aspect, ProjectDoc } from "@/lib/types";
import { ASPECTS } from "@/lib/types";
import { ColorField, PanelSection, Segmented, Slider, Toggle } from "@/components/ui/controls";
import { cn } from "@/lib/utils";

export function CanvasPanel({
  doc,
  update,
}: {
  doc: ProjectDoc;
  update: (updater: (doc: ProjectDoc) => ProjectDoc) => void;
}) {
  return (
    <div>
      <PanelSection title="Canvas">
        <div className="grid grid-cols-2 gap-1.5">
          {(Object.keys(ASPECTS) as Aspect[]).map((key) => {
            const { width, height } = ASPECTS[key];
            const ratio = width / height;
            return (
              <button
                key={key}
                onClick={() => update((d) => ({ ...d, aspect: key }))}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg border px-2 py-2 text-left transition-colors",
                  doc.aspect === key
                    ? "border-ember/60 bg-ember/10"
                    : "border-ink-700 bg-ink-900 hover:border-ink-600",
                )}
              >
                <span
                  className={cn(
                    "shrink-0 rounded-[3px] border",
                    doc.aspect === key ? "border-ember bg-ember/20" : "border-ink-500",
                  )}
                  style={{ width: ratio >= 1 ? 22 : 22 * ratio, height: ratio >= 1 ? 22 / ratio : 22 }}
                />
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold text-ink-100">{key}</span>
                  <span className="block truncate text-[9.5px] text-ink-500">
                    {width}×{height}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </PanelSection>

      <PanelSection title="Framing">
        <Segmented
          label="Scale"
          value={doc.framing.fit}
          onChange={(fit) => update((d) => ({ ...d, framing: { ...d.framing, fit } }))}
          options={[
            { value: "cover", label: "Fill frame" },
            { value: "contain", label: "Fit inside" },
          ]}
        />
        <Segmented
          label="Padding"
          value={doc.framing.background}
          onChange={(background) => update((d) => ({ ...d, framing: { ...d.framing, background } }))}
          options={[
            { value: "black", label: "Solid" },
            { value: "blur", label: "Blur" },
            { value: "gradient", label: "Gradient" },
          ]}
        />
        <ColorField
          label="Padding colour"
          value={doc.framing.padColor}
          onChange={(padColor) => update((d) => ({ ...d, framing: { ...d.framing, padColor } }))}
        />
        <p className="text-[10.5px] leading-snug text-ink-500">
          Smart subject reframing (auto-follow faces) is the next milestone — today the crop is centre-based.
        </p>
      </PanelSection>

      <PanelSection title="Branding">
        <Toggle
          label="Watermark"
          checked={doc.branding.watermarkEnabled}
          onChange={(watermarkEnabled) =>
            update((d) => ({ ...d, branding: { ...d.branding, watermarkEnabled } }))
          }
          hint="Bottom-right handle on the exported video."
        />
        <input
          value={doc.branding.watermarkText}
          onChange={(e) =>
            update((d) => ({ ...d, branding: { ...d.branding, watermarkText: e.target.value.slice(0, 32) } }))
          }
          placeholder="@yourhandle"
          className="rf-input text-[12px]"
        />
        <Toggle
          label="Progress bar"
          checked={doc.branding.progressBar}
          onChange={(progressBar) => update((d) => ({ ...d, branding: { ...d.branding, progressBar } }))}
          hint="Thin retention bar along the bottom edge."
        />
      </PanelSection>
    </div>
  );
}

export function AudioPanel({
  doc,
  update,
  onUploadMusic,
  uploadingMusic,
}: {
  doc: ProjectDoc;
  update: (updater: (doc: ProjectDoc) => ProjectDoc) => void;
  onUploadMusic: (file: File) => void;
  uploadingMusic: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <PanelSection title="Voice">
        <Slider
          label="Original audio"
          value={doc.audio.clipVolume}
          min={0}
          max={1}
          step={0.01}
          onChange={(clipVolume) => update((d) => ({ ...d, audio: { ...d.audio, clipVolume } }))}
          format={(v) => `${Math.round(v * 100)}%`}
        />
        <Toggle
          label="Normalise loudness"
          checked={doc.audio.normalize}
          onChange={(normalize) => update((d) => ({ ...d, audio: { ...d.audio, normalize } }))}
          hint="Targets −14 LUFS for social platforms (applied on server export)."
        />
        <Toggle
          label="Voice boost"
          checked={doc.audio.voiceBoost}
          onChange={(voiceBoost) => update((d) => ({ ...d, audio: { ...d.audio, voiceBoost } }))}
          hint="High-pass + presence lift. Server export only."
        />
        <Toggle
          label="Denoise"
          checked={doc.audio.denoise}
          onChange={(denoise) => update((d) => ({ ...d, audio: { ...d.audio, denoise } }))}
          hint="Requires an ffmpeg worker with arnndn. Browser export ignores it."
        />
      </PanelSection>

      <PanelSection title="Music bed">
        {doc.music ? (
          <div className="rounded-lg border border-ink-700 bg-ink-900 p-2.5">
            <div className="flex items-center gap-2">
              <Music className="h-3.5 w-3.5 shrink-0 text-ember" />
              <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink-200">{doc.music.name}</span>
              <button
                onClick={() => update((d) => ({ ...d, music: null }))}
                className="rounded p-1 text-ink-500 hover:text-rose-signal"
                aria-label="Remove music"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-3">
              <Slider
                label="Music level"
                value={doc.music.volume}
                min={0}
                max={1}
                step={0.01}
                onChange={(volume) =>
                  update((d) => (d.music ? { ...d, music: { ...d.music, volume } } : d))
                }
                format={(v) => `${Math.round(v * 100)}%`}
              />
            </div>
            <div className="mt-3">
              <Toggle
                label="Duck under voice"
                checked={doc.music.duckUnderVoice}
                onChange={(duckUnderVoice) =>
                  update((d) => (d.music ? { ...d, music: { ...d.music, duckUnderVoice } } : d))
                }
              />
            </div>
          </div>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploadingMusic}
            className="flex w-full items-center gap-2.5 rounded-lg border border-dashed border-ink-600 bg-ink-900 px-3 py-3 text-left hover:border-ember/50 disabled:opacity-60"
          >
            <Upload className="h-4 w-4 shrink-0 text-ink-400" />
            <span>
              <span className="block text-[11.5px] font-medium text-ink-200">
                {uploadingMusic ? "Uploading…" : "Add a music track"}
              </span>
              <span className="block text-[10px] text-ink-500">MP3 or WAV · one bed per video</span>
            </span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUploadMusic(file);
            e.target.value = "";
          }}
        />
        <p className="text-[10px] leading-snug text-ink-500">
          Music is mixed and ducked during the server export, not in the live preview.
        </p>
      </PanelSection>
    </div>
  );
}
