"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CloudOff,
  Film,
  Loader2,
  Music4,
  Plus,
  Sparkles,
  Type,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import type { CaptionStyle, ProjectDoc, ProjectRow } from "@/lib/types";
import { timelineDuration } from "@/lib/types";
import { getStore } from "@/lib/data";
import { generateDemoTranscript, transcriptFromScript } from "@/lib/project-defaults";
import { probeDuration } from "@/lib/data/local-store";
import { useTimelinePlayer } from "@/components/editor/useTimelinePlayer";
import { PreviewStage } from "@/components/editor/PreviewStage";
import { Timeline } from "@/components/editor/Timeline";
import { TranscriptPanel } from "@/components/editor/TranscriptPanel";
import { StylePanel } from "@/components/editor/StylePanel";
import { AudioPanel, CanvasPanel } from "@/components/editor/InspectorPanels";
import { ExportDialog } from "@/components/editor/ExportDialog";
import { Logo } from "@/components/ui/Logo";
import { cn, formatBytes } from "@/lib/utils";

type LeftTab = "transcript" | "clips" | "audio";
type RightTab = "style" | "canvas";
type SaveState = "idle" | "saving" | "saved" | "error";

export function EditorShell({ projectId, initialTranscribe }: { projectId: string; initialTranscribe?: boolean }) {
  const store = useMemo(() => getStore(), []);
  const router = useRouter();

  const [project, setProject] = useState<ProjectRow | null>(null);
  const [doc, setDoc] = useState<ProjectDoc | null>(null);
  const [srcMap, setSrcMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [leftTab, setLeftTab] = useState<LeftTab>("transcript");
  const [rightTab, setRightTab] = useState<RightTab>("style");
  const [showExport, setShowExport] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadingMusic, setUploadingMusic] = useState(false);
  const autoRan = useRef(false);
  const docRef = useRef<ProjectDoc | null>(null);
  docRef.current = doc;

  const player = useTimelinePlayer({ doc, srcMap });

  /* ── load ─────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const row = await store.get(projectId);
      if (!row) {
        setError("This project does not exist, or it belongs to another account.");
        return;
      }
      setProject(row);
      setDoc(row.doc);

      const map: Record<string, string> = {};
      for (const clip of row.doc.clips) map[clip.src] = await store.resolveSrc(clip.src);
      if (row.doc.music) map[row.doc.music.src] = await store.resolveSrc(row.doc.music.src);
      setSrcMap(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open the project.");
    } finally {
      setLoading(false);
    }
  }, [projectId, store]);

  useEffect(() => {
    void load();
  }, [load]);

  /* ── autosave ─────────────────────────────────────────── */
  useEffect(() => {
    if (!project || !doc) return;
    setSaveState("saving");
    const timer = setTimeout(async () => {
      try {
        const saved = await store.save({ ...project, doc });
        setProject((prev) => (prev ? { ...prev, ...saved, doc } : saved));
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 900);
    return () => clearTimeout(timer);
    // project is intentionally excluded: saving it back would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  /* ── editing helpers ─────────────────────────────────── */
  const update = useCallback((updater: (current: ProjectDoc) => ProjectDoc) => {
    setDoc((current) => (current ? { ...updater(current), updatedAt: new Date().toISOString() } : current));
  }, []);

  const updateStyle = useCallback(
    (patch: Partial<CaptionStyle>) => {
      update((current) => ({
        ...current,
        captions: { ...current.captions, style: { ...current.captions.style, ...patch } },
      }));
    },
    [update],
  );

  const runTranscribe = useCallback(
    async (currentDoc?: ProjectDoc) => {
      const target = currentDoc ?? doc;
      if (!target || !target.clips.length) return;
      setTranscribing(true);
      setError(null);
      try {
        const durationMs =
          timelineDuration(target) ||
          target.clips[0]?.sourceDurationMs ||
          0;

        if (store.mode === "local") {
          await new Promise((resolve) => setTimeout(resolve, 600));
          const words = generateDemoTranscript(durationMs);
          update((d) => ({
            ...d,
            captions: { ...d.captions, words, segments: [], provider: "demo" },
          }));
          return;
        }

        // The API reads the project from Postgres, so flush the latest document first.
        if (project) {
          try {
            await store.save({ ...project, doc: target });
          } catch {
            /* autosave will retry; the request below may still succeed */
          }
        }

        const response = await fetch("/api/transcribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ projectId, durationMs }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error ?? "Transcription failed.");

        update((d) => ({
          ...d,
          captions: {
            ...d.captions,
            words: payload.words ?? [],
            segments: payload.segments ?? [],
            provider: payload.provider ?? "openai",
            language: payload.language ?? d.captions.language,
          },
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Transcription failed.");
      } finally {
        setTranscribing(false);
      }
    },
    [doc, project, projectId, store, update],
  );

  // Auto-run captions once when arriving from an upload.
  useEffect(() => {
    if (!initialTranscribe || autoRan.current) return;
    if (!doc || !doc.clips.length || loading) return;
    if (doc.captions.words.length > 0) return;
    autoRan.current = true;
    void runTranscribe(doc);
  }, [doc, initialTranscribe, loading, runTranscribe]);

  const onUpload = useCallback(
    async (file: File) => {
      setUploadBusy(true);
      setError(null);
      try {
        if (file.size > 25 * 1024 * 1024) {
          throw new Error(`That clip is ${formatBytes(file.size)}. Keep uploads under 25 MB for now.`);
        }
        const base = docRef.current;
        if (!base) return;

        const media = await store.uploadMedia(projectId, file);
        const objectUrl = await store.resolveSrc(media.src);
        const durationMs = await probeDuration(objectUrl);

        setSrcMap((map) => ({ ...map, [media.src]: objectUrl }));

        const nextDoc: ProjectDoc = {
          ...base,
          clips: [
            ...base.clips,
            {
              id: `clip_${Date.now().toString(36)}`,
              name: file.name,
              src: media.src,
              inMs: 0,
              outMs: durationMs,
              sourceDurationMs: durationMs,
              volume: 1,
              muted: false,
            },
          ],
        };

        setDoc(nextDoc);
        await runTranscribe(nextDoc);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setUploadBusy(false);
      }
    },
    [projectId, runTranscribe, store],
  );

  const onUploadMusic = useCallback(
    async (file: File) => {
      setUploadingMusic(true);
      try {
        const media = await store.uploadMedia(projectId, file);
        const objectUrl = await store.resolveSrc(media.src);
        setSrcMap((map) => ({ ...map, [media.src]: objectUrl }));
        const durationMs = await probeDuration(objectUrl);
        update((current) => ({
          ...current,
          music: {
            src: media.src,
            name: file.name,
            volume: 0.25,
            inMs: 0,
            outMs: durationMs,
            duckUnderVoice: true,
          },
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not add the music track.");
      } finally {
        setUploadingMusic(false);
      }
    },
    [projectId, store, update],
  );

  const onTrim = useCallback(
    (clipId: string, inMs: number, outMs: number) => {
      update((current) => ({
        ...current,
        clips: current.clips.map((clip) =>
          clip.id === clipId
            ? { ...clip, inMs: Math.max(0, inMs), outMs: Math.min(clip.sourceDurationMs, Math.max(inMs + 200, outMs)) }
            : clip,
        ),
      }));
      player.pause();
    },
    [player, update],
  );

  /* ── keyboard shortcuts ──────────────────────────────── */
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (target?.isContentEditable) return;

      if (event.code === "Space") {
        event.preventDefault();
        player.toggle();
      } else if (event.key === "ArrowRight") {
        player.seek(player.time + 1000);
      } else if (event.key === "ArrowLeft") {
        player.seek(player.time - 1000);
      } else if (event.key.toLowerCase() === "e" && !event.metaKey && !event.ctrlKey) {
        setShowExport(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [player]);

  /* ── render ──────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="grid h-dvh place-items-center bg-ink-950">
        <div className="flex flex-col items-center gap-3 text-ink-400">
          <Loader2 className="h-6 w-6 animate-spin text-ember" />
          <p className="text-[12px]">Opening project…</p>
        </div>
      </div>
    );
  }

  if (error && !doc) {
    return (
      <div className="grid h-dvh place-items-center bg-ink-950 px-5">
        <div className="max-w-sm text-center">
          <CloudOff className="mx-auto h-8 w-8 text-ink-500" />
          <h1 className="mt-4 text-lg font-semibold text-ink-50">Project unavailable</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-400">{error}</p>
          <Link href="/dashboard" className="rf-btn rf-btn-primary mt-5">
            Back to projects
          </Link>
        </div>
      </div>
    );
  }

  if (!doc || !project) return null;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-ink-950">
      {/* top bar */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-ink-800 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <button onClick={() => router.push("/dashboard")} className="rf-btn rf-btn-quiet h-8 px-2" aria-label="Back to projects">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Link href="/" className="hidden sm:block">
            <Logo size={24} />
          </Link>
          <span className="hidden h-4 w-px bg-ink-800 sm:block" />
          <input
            value={doc.title}
            onChange={(e) => update((current) => ({ ...current, title: e.target.value }))}
            className="w-32 min-w-0 truncate rounded-md bg-transparent px-1.5 py-1 text-[13px] font-semibold text-ink-100 outline-none hover:bg-ink-850 focus:bg-ink-850 sm:w-64"
            aria-label="Project title"
          />
          <SaveBadge state={saveState} />
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "hidden items-center gap-1 rounded-full border px-2 py-1 text-[9.5px] font-semibold uppercase tracking-wider md:inline-flex",
              store.mode === "cloud"
                ? "border-ember/30 bg-ember/10 text-ember"
                : "border-amber-signal/30 bg-amber-signal/10 text-amber-signal",
            )}
          >
            {store.mode === "cloud" ? "Cloud" : "Local demo"}
          </span>
          <button
            onClick={() => void runTranscribe()}
            disabled={transcribing || !doc.clips.length}
            className="rf-btn rf-btn-ghost h-8 px-2.5 text-[11.5px]"
          >
            {transcribing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{transcribing ? "Transcribing" : "Auto-caption"}</span>
          </button>
          <button onClick={() => setShowExport(true)} className="rf-btn rf-btn-primary h-8 px-3 text-[11.5px]">
            Export
          </button>
        </div>
      </header>

      {error && (
        <div className="flex items-center justify-between gap-3 border-b border-rose-signal/30 bg-rose-signal/10 px-4 py-2 text-[11.5px] text-rose-signal">
          <span className="truncate">{error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* workspace */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        {/* left panel */}
        <aside className="order-3 flex h-[62vh] w-full shrink-0 flex-col border-t border-ink-800 bg-ink-900/60 lg:order-1 lg:h-full lg:w-[300px] lg:border-r lg:border-t-0 xl:w-[320px]">
          <div className="flex shrink-0 border-b border-ink-800">
            {(
              [
                ["transcript", "Transcript", Type],
                ["clips", "Media", Film],
                ["audio", "Audio", Music4],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setLeftTab(id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium transition-colors",
                  leftTab === id
                    ? "border-b-2 border-ember text-ink-50"
                    : "border-b-2 border-transparent text-ink-500 hover:text-ink-200",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto lg:overflow-hidden">
            {leftTab === "transcript" && (
              <TranscriptPanel
                doc={doc}
                update={update}
                currentMs={player.activeClip ? player.time : 0}
                onSeek={(ms) => player.seek(Math.max(0, ms))}
                onAutoCaption={() => void runTranscribe()}
                onPasteScript={(text) => {
                  const duration = timelineDuration(doc) || doc.clips[0]?.sourceDurationMs || 0;
                  const words = transcriptFromScript(text, duration);
                  update((current) => ({
                    ...current,
                    captions: { ...current.captions, words, segments: [], provider: "manual" },
                  }));
                }}
                transcribing={transcribing}
              />
            )}

            {leftTab === "clips" && (
              <div className="p-3">
                <div className="space-y-2">
                  {doc.clips.map((clip, index) => (
                    <div key={clip.id} className="rounded-lg border border-ink-700 bg-ink-850 p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[11.5px] font-medium text-ink-100">
                            {index + 1}. {clip.name}
                          </p>
                          <p className="mt-0.5 text-[10px] text-ink-500">
                            {(clip.outMs - clip.inMs) / 1000}s used · {clip.sourceDurationMs / 1000}s source
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            update((current) => ({
                              ...current,
                              clips: current.clips.filter((c) => c.id !== clip.id),
                            }))
                          }
                          className="rounded p-1 text-ink-500 hover:text-rose-signal"
                          aria-label="Remove clip"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3">
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-ink-600 bg-ink-900 px-3 py-3 text-[11.5px] text-ink-300 hover:border-ember/50">
                    <Plus className="h-3.5 w-3.5" />
                    Add another clip
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void onUpload(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>

                <div className="mt-4 rounded-lg border border-ink-800 bg-ink-900/60 p-3">
                  <p className="text-[10.5px] leading-relaxed text-ink-500">
                    Clips play in order. Captions follow the first clip&apos;s transcript — multi-clip
                    transcription lands in the next milestone.
                  </p>
                </div>
              </div>
            )}

            {leftTab === "audio" && (
              <AudioPanel doc={doc} update={update} onUploadMusic={(file) => void onUploadMusic(file)} uploadingMusic={uploadingMusic} />
            )}
          </div>
        </aside>

        {/* centre */}
        <main className="order-1 flex h-[52vh] min-h-0 flex-col lg:order-2 lg:h-auto lg:flex-1">
          <PreviewStage
            doc={doc}
            videoRef={player.videoRef}
            activeSrc={player.activeSrc}
            time={player.time}
            duration={player.duration}
            playing={player.playing}
            onToggle={player.toggle}
            onSeek={(ms) => player.seek(ms)}
            onUpload={(file) => void onUpload(file)}
            uploadBusy={uploadBusy}
            onVideoReady={() => player.setReady(true)}
          />
          <Timeline doc={doc} time={player.time} onSeek={player.seek} onTrim={onTrim} />
        </main>

        {/* right panel */}
        <aside className="order-2 flex h-[62vh] w-full shrink-0 flex-col border-t border-ink-800 bg-ink-900/60 lg:order-3 lg:h-full lg:w-[320px] lg:border-l lg:border-t-0 xl:w-[340px]">
          <div className="flex shrink-0 border-b border-ink-800">
            {(
              [
                ["style", "Captions", Sparkles],
                ["canvas", "Canvas", Upload],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setRightTab(id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium transition-colors",
                  rightTab === id
                    ? "border-b-2 border-ember text-ink-50"
                    : "border-b-2 border-transparent text-ink-500 hover:text-ink-200",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {rightTab === "style" ? (
              <StylePanel doc={doc} update={update} updateStyle={updateStyle} />
            ) : (
              <CanvasPanel doc={doc} update={update} />
            )}
          </div>
        </aside>
      </div>

      {showExport && (
        <ExportDialog doc={doc} project={project} srcMap={srcMap} onClose={() => setShowExport(false)} />
      )}
    </div>
  );
}

function SaveBadge({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  const map = {
    saving: { icon: Loader2, text: "Saving", className: "text-ink-500", spin: true },
    saved: { icon: Check, text: "Saved", className: "text-ember/70", spin: false },
    error: { icon: CloudOff, text: "Not saved", className: "text-rose-signal", spin: false },
    idle: { icon: Check, text: "", className: "", spin: false },
  } as const;
  const entry = map[state];
  const Icon = entry.icon;
  return (
    <span className={cn("flex items-center gap-1 text-[10px]", entry.className)}>
      <Icon className={cn("h-3 w-3", entry.spin && "animate-spin")} />
      <span className="hidden sm:inline">{entry.text}</span>
    </span>
  );
}
