"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, Pencil, Sparkles, X } from "lucide-react";
import type { ProjectDoc, Word } from "@/lib/types";
import { buildLines, findLineAt, formatTimecode } from "@/lib/captions/layout";
import { transcriptFromScript } from "@/lib/project-defaults";
import { cn } from "@/lib/utils";

// Group timings into sentence-ish rows for reading, independent of caption style.
const DISPLAY_STYLE = {
  animation: "karaoke" as const,
  maxWordsPerLine: 7,
  maxCharsPerLine: 46,
};

export function TranscriptPanel({
  doc,
  update,
  currentMs,
  onSeek,
  onAutoCaption,
  onPasteScript,
  transcribing,
}: {
  doc: ProjectDoc;
  update: (updater: (doc: ProjectDoc) => ProjectDoc) => void;
  currentMs: number;
  onSeek: (ms: number) => void;
  onAutoCaption: () => void;
  onPasteScript: (text: string) => void;
  transcribing: boolean;
}) {
  const [editing, setEditing] = useState<{ startMs: number; text: string } | null>(null);
  const [showScript, setShowScript] = useState(false);
  const [script, setScript] = useState("");

  const lines = useMemo(
    () => buildLines(doc.captions.words, { ...doc.captions.style, ...DISPLAY_STYLE }),
    [doc.captions.words, doc.captions.style],
  );
  const activeLine = useMemo(() => findLineAt(lines, currentMs), [lines, currentMs]);

  function commitEdit() {
    if (!editing) return;
    const replacement = transcriptFromScript(editing.text, 1000);
    update((d) => {
      const words = [...d.captions.words];
      const startIndex = words.findIndex((w) => w.s === editing.startMs);
      const line = lines.find((l) => l.startMs === editing.startMs);
      if (startIndex < 0 || !line) return d;

      const span = Math.max(200, line.endMs - line.startMs);
      const share = span / Math.max(1, replacement.length);
      const nextWords: Word[] = replacement.map((w, i) => ({
        w: w.w,
        s: Math.round(line.startMs + i * share),
        e: Math.round(line.startMs + (i + 1) * share),
      }));

      words.splice(startIndex, line.words.length, ...nextWords);
      return { ...d, captions: { ...d.captions, words, provider: "manual" } };
    });
    setEditing(null);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-ink-800 px-3 py-2.5">
        <button
          onClick={onAutoCaption}
          disabled={transcribing || !doc.clips.length}
          className="rf-btn rf-btn-primary h-8 flex-1 px-2 text-[11.5px]"
        >
          {transcribing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {transcribing ? "Transcribing…" : "Auto-caption"}
        </button>
        <button
          onClick={() => setShowScript((v) => !v)}
          className="rf-btn rf-btn-ghost h-8 px-2 text-[11.5px]"
          title="Paste a script and time it automatically"
        >
          Script
        </button>
      </div>

      {showScript && (
        <div className="border-b border-ink-800 bg-ink-900/60 p-3">
          <p className="mb-2 text-[10.5px] leading-snug text-ink-500">
            Paste exactly what is said. Timings are distributed across the clip — no AI key needed.
          </p>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            rows={5}
            placeholder="Paste the transcript here…"
            className="rf-input resize-none font-mono text-[11px] leading-relaxed"
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => {
                if (!script.trim()) return;
                onPasteScript(script);
                setShowScript(false);
                setScript("");
              }}
              className="rf-btn rf-btn-primary h-7 flex-1 text-[11px]"
            >
              Apply timings
            </button>
            <button onClick={() => setShowScript(false)} className="rf-btn rf-btn-quiet h-7 px-2 text-[11px]">
              Cancel
            </button>
          </div>
        </div>
      )}

      {doc.captions.provider === "demo" && (
        <div className="border-b border-amber-signal/20 bg-amber-signal/[0.06] px-3 py-2">
          <p className="text-[10.5px] leading-snug text-amber-signal/90">
            Demo transcript — the words are a placeholder scaled to your clip. Add{" "}
            <code className="rounded bg-ink-800 px-1">OPENAI_API_KEY</code> for real speech recognition.
          </p>
        </div>
      )}

      <div className="rf-scroll-thin flex-1 overflow-y-auto px-2 py-2">
        {lines.length === 0 ? (
          <div className="px-2 py-10 text-center">
            <p className="text-[12px] text-ink-400">No transcript yet.</p>
            <p className="mt-1 text-[11px] text-ink-500">Run Auto-caption, or paste a script.</p>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {lines.map((line) => {
              const isActive = activeLine?.index === line.index;
              const isEditing = editing?.startMs === line.startMs;
              return (
                <li key={line.index}>
                  {isEditing ? (
                    <div className="rounded-lg border border-lime-signal/50 bg-ink-850 p-2">
                      <textarea
                        autoFocus
                        rows={2}
                        value={editing.text}
                        onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setEditing(null);
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            commitEdit();
                          }
                        }}
                        className="rf-input resize-none text-[12px]"
                      />
                      <div className="mt-1.5 flex justify-end gap-1">
                        <button onClick={() => setEditing(null)} className="rf-btn rf-btn-quiet h-6 px-2 text-[10.5px]">
                          <X className="h-3 w-3" /> Cancel
                        </button>
                        <button onClick={commitEdit} className="rf-btn rf-btn-primary h-6 px-2 text-[10.5px]">
                          <Check className="h-3 w-3" /> Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "group flex items-start gap-2 rounded-lg px-2 py-1.5 transition-colors",
                        isActive ? "bg-lime-signal/10" : "hover:bg-ink-850",
                      )}
                    >
                      <button
                        onClick={() => onSeek(line.startMs + doc.captions.offsetMs)}
                        className="mt-0.5 shrink-0 font-mono text-[9.5px] tabular-nums text-ink-500 group-hover:text-lime-signal"
                        title="Jump to this line"
                      >
                        {formatTimecode(line.startMs)}
                      </button>
                      <button
                        onClick={() => onSeek(line.startMs + doc.captions.offsetMs)}
                        className={cn(
                          "flex-1 text-left text-[12px] leading-snug",
                          isActive ? "text-ink-50" : "text-ink-300",
                        )}
                      >
                        {line.text}
                      </button>
                      <button
                        onClick={() => setEditing({ startMs: line.startMs, text: line.text })}
                        className="mt-0.5 shrink-0 rounded p-0.5 text-ink-600 opacity-0 transition-opacity hover:text-ink-200 group-hover:opacity-100"
                        title="Edit this line"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
