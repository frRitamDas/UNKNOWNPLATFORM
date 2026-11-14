"use client";

import { RotateCcw, Sparkles } from "lucide-react";
import type { CaptionStyle, ProjectDoc } from "@/lib/types";
import { PRESETS, applyPreset, getPreset } from "@/lib/captions/presets";
import { ColorField, PanelSection, Segmented, Select, Slider, Toggle } from "@/components/ui/controls";
import { cn } from "@/lib/utils";

const FONTS = ["Inter", "Playfair Display", "Impact", "Arial Black", "Georgia"] as const;

export function StylePanel({
  doc,
  update,
  updateStyle,
}: {
  doc: ProjectDoc;
  update: (updater: (doc: ProjectDoc) => ProjectDoc) => void;
  updateStyle: (patch: Partial<CaptionStyle>) => void;
}) {
  const style = doc.captions.style;
  const preset = getPreset(style.presetId);
  const wordCount = doc.captions.words.length;

  return (
    <div>
      <PanelSection
        title="Preset"
        action={
          <button
            onClick={() => updateStyle(applyPreset(style, style.presetId))}
            className="flex items-center gap-1 text-[10px] text-ink-500 hover:text-ink-200"
            title="Reset to preset defaults"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        }
      >
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => updateStyle({ ...applyPreset(style, p.id), presetId: p.id })}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-2 py-2 text-left transition-colors",
                style.presetId === p.id
                  ? "border-ember/60 bg-ember/10"
                  : "border-ink-700 bg-ink-900 hover:border-ink-600",
              )}
              title={p.blurb}
            >
              <span className="flex shrink-0 gap-0.5">
                {p.swatch.map((c, i) => (
                  <span key={i} className="h-3.5 w-1 rounded-full" style={{ background: c }} />
                ))}
              </span>
              <span className="truncate text-[11px] font-semibold text-ink-200">{p.name}</span>
            </button>
          ))}
        </div>
        <p className="text-[10.5px] leading-snug text-ink-500">{preset.blurb}</p>
      </PanelSection>

      <PanelSection title="Type">
        <Select
          label="Font"
          value={style.fontFamily}
          onChange={(fontFamily) => updateStyle({ fontFamily })}
          options={FONTS.map((f) => ({ value: f as string, label: f }))}
        />
        <Segmented
          label="Weight"
          value={String(style.fontWeight)}
          onChange={(v) => updateStyle({ fontWeight: Number(v) })}
          options={[
            { value: "500", label: "Med" },
            { value: "700", label: "Bold" },
            { value: "800", label: "Black" },
            { value: "900", label: "Heavy" },
          ]}
        />
        <Slider
          label="Size"
          value={style.fontScale}
          min={3}
          max={18}
          step={0.2}
          onChange={(fontScale) => updateStyle({ fontScale })}
          format={(v) => `${v.toFixed(1)}% of width`}
        />
        <Slider
          label="Letter spacing"
          value={style.letterSpacing}
          min={-0.05}
          max={0.12}
          step={0.005}
          onChange={(letterSpacing) => updateStyle({ letterSpacing })}
          format={(v) => `${(v * 100).toFixed(0)}%`}
        />
        <Toggle label="ALL CAPS" checked={style.uppercase} onChange={(uppercase) => updateStyle({ uppercase })} />
      </PanelSection>

      <PanelSection title="Colour & weight">
        <div className="grid grid-cols-2 gap-2.5">
          <ColorField label="Text" value={style.textColor} onChange={(textColor) => updateStyle({ textColor })} />
          <ColorField
            label="Active word"
            value={style.activeTextColor}
            onChange={(activeTextColor) => updateStyle({ activeTextColor })}
          />
          <ColorField label="Accent" value={style.highlightBg} onChange={(highlightBg) => updateStyle({ highlightBg })} />
          <ColorField label="Stroke" value={style.strokeColor} onChange={(strokeColor) => updateStyle({ strokeColor })} />
        </div>
        <Slider
          label="Outline"
          value={style.strokeScale}
          min={0}
          max={0.3}
          step={0.01}
          onChange={(strokeScale) => updateStyle({ strokeScale })}
          format={(v) => (v === 0 ? "off" : v.toFixed(2))}
        />
        <Slider
          label="Drop shadow"
          value={style.shadow}
          min={0}
          max={0.9}
          step={0.05}
          onChange={(shadow) => updateStyle({ shadow })}
          format={(v) => (v === 0 ? "off" : v.toFixed(2))}
        />
      </PanelSection>

      <PanelSection title="Motion & highlight">
        <Segmented
          label="Animation"
          value={style.animation}
          onChange={(animation) => updateStyle({ animation })}
          options={[
            { value: "karaoke", label: "Karaoke" },
            { value: "word", label: "Word" },
            { value: "line", label: "Line" },
            { value: "none", label: "None" },
          ]}
        />
        <Segmented
          label="Highlight"
          value={style.highlight}
          onChange={(highlight) => updateStyle({ highlight })}
          options={[
            { value: "color", label: "Colour" },
            { value: "box", label: "Box" },
            { value: "underline", label: "Line" },
            { value: "scale", label: "Scale" },
          ]}
        />
      </PanelSection>

      <PanelSection title="Layout">
        <Slider
          label="Position"
          value={style.positionYPct}
          min={8}
          max={92}
          step={1}
          onChange={(positionYPct) => updateStyle({ positionYPct })}
          format={(v) => `${v}% down`}
        />
        <div className="grid grid-cols-4 gap-1">
          {[
            ["Top", 16],
            ["Upper", 38],
            ["Lower", 68],
            ["Bottom", 84],
          ].map(([label, value]) => (
            <button
              key={label as string}
              onClick={() => updateStyle({ positionYPct: value as number })}
              className={cn(
                "rounded-md border px-1 py-1 text-[10px] transition-colors",
                Math.abs(style.positionYPct - (value as number)) < 4
                  ? "border-ember/50 bg-ember/10 text-ink-100"
                  : "border-ink-700 text-ink-400 hover:border-ink-600",
              )}
            >
              {label as string}
            </button>
          ))}
        </div>
        <Slider
          label="Words per line"
          value={style.maxWordsPerLine}
          min={1}
          max={8}
          onChange={(maxWordsPerLine) => updateStyle({ maxWordsPerLine })}
          format={(v) => String(v)}
        />
        <Slider
          label="Characters per line"
          value={style.maxCharsPerLine}
          min={6}
          max={44}
          onChange={(maxCharsPerLine) => updateStyle({ maxCharsPerLine })}
          format={(v) => String(v)}
        />
        <Toggle
          label="Background box"
          checked={style.background}
          onChange={(background) => updateStyle({ background })}
          hint="Solid pill behind every line — best for busy footage."
        />
      </PanelSection>

      <PanelSection title="Timing">
        <Slider
          label="Nudge all captions"
          value={doc.captions.offsetMs}
          min={-2000}
          max={2000}
          step={50}
          onChange={(offsetMs) =>
            update((d) => ({ ...d, captions: { ...d.captions, offsetMs } }))
          }
          format={(v) => `${v > 0 ? "+" : ""}${v} ms`}
        />
        <div className="rounded-lg border border-ink-800 bg-ink-900/60 px-3 py-2">
          <p className="text-[10.5px] leading-relaxed text-ink-500">
            {wordCount === 0
              ? "No transcript yet. Run Auto-caption or paste a script."
              : `${wordCount} words · ${doc.captions.provider === "demo" ? "demo transcript" : `${doc.captions.provider} transcript`} · ${doc.captions.language}`}
          </p>
        </div>
        <button
          onClick={() =>
            update((d) => ({
              ...d,
              captions: { ...d.captions, enabled: !d.captions.enabled },
            }))
          }
          className={cn(
            "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-[11.5px] transition-colors",
            doc.captions.enabled
              ? "border-ember/40 bg-ember/[0.07] text-ink-100"
              : "border-ink-700 bg-ink-900 text-ink-400",
          )}
        >
          <span className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5" />
            Burn captions into export
          </span>
          <span className={cn("h-1.5 w-1.5 rounded-full", doc.captions.enabled ? "bg-ember" : "bg-ink-600")} />
        </button>
      </PanelSection>
    </div>
  );
}
