"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Cloud, Download, Loader2, MonitorPlay, Server, X } from "lucide-react";
import type { ProjectDoc, ProjectRow } from "@/lib/types";
import { ASPECTS, timelineDuration } from "@/lib/types";
import { renderInBrowser, downloadBlob } from "@/lib/media/browser-render";
import { slugify } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Resolution = "720" | "1080";

export function ExportDialog({
  doc,
  project,
  srcMap,
  onClose,
}: {
  doc: ProjectDoc;
  project: ProjectRow;
  srcMap: Record<string, string>;
  onClose: () => void;
}) {
  const [engine, setEngine] = useState<"browser" | "ffmpeg">("browser");
  const [resolution, setResolution] = useState<Resolution>("720");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [serverNote, setServerNote] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const aspect = ASPECTS[doc.aspect];
  const scale = resolution === "1080" ? 1 : 2 / 3;
  const width = Math.round((aspect.width * scale) / 2) * 2;
  const height = Math.round((aspect.height * scale) / 2) * 2;
  const duration = timelineDuration(doc);

  const cleanup = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  async function startBrowserExport() {
    setError(null);
    setDone(null);
    setRunning(true);
    setProgress(0);
    setLabel("Preparing…");
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await renderInBrowser({
        doc,
        srcMap,
        width,
        height,
        watermark: doc.branding.watermarkText,
        onProgress: (fraction, text) => {
          setProgress(Math.round(fraction * 100));
          setLabel(text);
        },
        signal: controller.signal,
      });

      const filename = `${slugify(doc.title)}-${resolution}p.${result.extension}`;
      downloadBlob(result.blob, filename);
      setDone(filename);
      setProgress(100);
      setLabel("Downloaded");
    } catch (err) {
      if ((err as Error)?.name === "AbortError") setLabel("Cancelled");
      else setError(err instanceof Error ? err.message : "The export failed.");
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  async function startServerExport() {
    setError(null);
    setDone(null);
    setServerNote(null);
    setRunning(true);
    setProgress(5);
    setLabel("Queueing render…");

    try {
      const response = await fetch("/api/render", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId: project.id, engine: "ffmpeg", resolution }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setServerNote(payload.error ?? "Server rendering is not configured yet.");
        setRunning(false);
        setProgress(0);
        return;
      }

      const renderId = payload.renderId as string;
      setLabel("Worker picked it up…");

      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/render?id=${renderId}`, { cache: "no-store" });
          const status = await statusRes.json();
          if (status.error) throw new Error(status.error);

          setProgress(status.progress ?? 10);
          setLabel(
            status.status === "processing"
              ? `Rendering… ${status.progress ?? 0}%`
              : status.status === "queued"
                ? "Waiting for a worker…"
                : status.status === "done"
                  ? "Done"
                  : "Rendering…",
          );

          if (status.status === "done" && status.output_url) {
            cleanup();
            setRunning(false);
            setDone(status.output_url);
            setProgress(100);
          } else if (status.status === "failed") {
            cleanup();
            setRunning(false);
            setError(status.error ?? "The render failed.");
          }
        } catch (err) {
          cleanup();
          setRunning(false);
          setError(err instanceof Error ? err.message : "Lost contact with the render worker.");
        }
      }, 2500);
    } catch (err) {
      setRunning(false);
      setError(err instanceof Error ? err.message : "Could not reach the render service.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/85 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-ink-700 bg-ink-850 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-ink-800 px-5 py-4">
          <div>
            <h2 className="text-base font-bold tracking-tight text-ink-50">Export</h2>
            <p className="mt-0.5 text-[11.5px] text-ink-400">
              {aspect.width}×{aspect.height} canvas · {Math.round(duration / 1000)}s
            </p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-ink-500 hover:bg-ink-800 hover:text-ink-200" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setEngine("browser")}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
                engine === "browser" ? "border-ember/60 bg-ember/[0.08]" : "border-ink-700 bg-ink-900 hover:border-ink-600",
              )}
            >
              <MonitorPlay className="h-4 w-4 text-ember" />
              <span className="mt-2 block text-[12px] font-semibold text-ink-100">In this browser</span>
              <span className="mt-0.5 block text-[10.5px] leading-snug text-ink-500">
                Works now. Real-time, no server.
              </span>
            </button>
            <button
              onClick={() => setEngine("ffmpeg")}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
                engine === "ffmpeg" ? "border-ember/60 bg-ember/[0.08]" : "border-ink-700 bg-ink-900 hover:border-ink-600",
              )}
            >
              <Server className="h-4 w-4 text-sky" />
              <span className="mt-2 block text-[12px] font-semibold text-ink-100">Render worker</span>
              <span className="mt-0.5 block text-[10.5px] leading-snug text-ink-500">
                MP4, faster, exact fonts.
              </span>
            </button>
          </div>

          <div>
            <span className="mb-1.5 block text-[11px] font-medium text-ink-300">Resolution</span>
            <div className="flex gap-2">
              {(
                [
                  ["720", "720p · fast"],
                  ["1080", "1080p · crisp"],
                ] as const
              ).map(([value, text]) => (
                <button
                  key={value}
                  onClick={() => setResolution(value)}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2 text-[11.5px] transition-colors",
                    resolution === value
                      ? "border-ember/60 bg-ember/10 text-ink-100"
                      : "border-ink-700 text-ink-400 hover:border-ink-600",
                  )}
                >
                  {text}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-signal/30 bg-rose-signal/10 px-3 py-2 text-[11.5px] text-rose-signal">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {serverNote && (
            <div className="rounded-lg border border-amber-signal/30 bg-amber-signal/[0.07] p-3">
              <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-amber-signal">
                <Cloud className="h-3.5 w-3.5" /> Worker not connected
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-400">{serverNote}</p>
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-ink-500">
                Run <code className="rounded bg-ink-800 px-1">npm run worker</code> with your Supabase service key,
                or deploy worker/Dockerfile. See DEPLOY.md.
              </p>
            </div>
          )}

          {running && (
            <div>
              <div className="flex items-center justify-between text-[11px] text-ink-300">
                <span>{label}</span>
                <span className="font-mono tabular-nums text-ink-500">{progress}%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-800">
                <div className="h-full rounded-full bg-ember transition-[width] duration-200" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {done && (
            <div className="flex items-center gap-2 rounded-lg border border-ember/30 bg-ember/10 px-3 py-2 text-[11.5px] text-ember">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">
                {done.startsWith("http") ? "Render complete" : `Saved ${done}`}
              </span>
              {done.startsWith("http") && (
                <a href={done} download className="flex items-center gap-1 font-semibold underline">
                  <Download className="h-3 w-3" /> Download
                </a>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            {running && engine === "browser" ? (
              <button onClick={() => abortRef.current?.abort()} className="rf-btn rf-btn-ghost">
                Cancel
              </button>
            ) : (
              <button onClick={onClose} className="rf-btn rf-btn-quiet">
                Close
              </button>
            )}
            <button
              onClick={() => (engine === "browser" ? void startBrowserExport() : void startServerExport())}
              disabled={running || !doc.clips.length}
              className="rf-btn rf-btn-primary"
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {running ? "Exporting…" : `Export ${resolution}p`}
            </button>
          </div>

          <p className="text-[10px] leading-relaxed text-ink-600">
            Browser export runs in real time and captures the canvas plus audio. Keep this tab in focus for the
            best result; a {Math.round(duration / 1000)}s clip takes about {Math.round(duration / 1000)}s.
          </p>
        </div>
      </div>
    </div>
  );
}
