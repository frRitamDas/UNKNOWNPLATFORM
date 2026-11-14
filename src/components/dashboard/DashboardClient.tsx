"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Clapperboard,
  Cloud,
  HardDrive,
  Loader2,
  LogOut,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { Aspect, ProjectRow } from "@/lib/types";
import { ASPECTS, timelineDuration } from "@/lib/types";
import { getStore } from "@/lib/data";
import { captureThumbnail } from "@/lib/media/thumbnail";
import { formatTimecode } from "@/lib/captions/layout";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import { Logo } from "@/components/ui/Logo";
import { cn, formatBytes, relativeTime } from "@/lib/utils";

export function DashboardClient({ userEmail }: { userEmail: string | null }) {
  const router = useRouter();
  const store = getStore();

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const rows = await store.list();
      setProjects(rows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load projects.");
    } finally {
      setLoading(false);
    }
  }, [store]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createProject = useCallback(
    async (title: string, file: File | null, aspect: Aspect = "9:16") => {
      setCreating(file ? `Uploading ${file.name}…` : "Creating project…");
      try {
        const project = await store.create({ title: title || "Untitled edit", aspect, file });

        // Poster frame for the card, best effort.
        if (file && project.doc.clips[0]) {
          const resolved = await store.resolveSrc(project.doc.clips[0].src);
          const thumb = await captureThumbnail(resolved);
          if (thumb) {
            await store.save({ ...project, thumbnail_url: thumb });
          }
        }

        const params = new URLSearchParams();
        if (file) params.set("transcribe", "1");
        router.push(`/editor/${project.id}${params.size ? `?${params}` : ""}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create the project.");
        setCreating(null);
      }
    },
    [router, store],
  );

  async function onDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setError("That file is not a video. Use MP4, MOV or WEBM.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError(`That file is ${formatBytes(file.size)}. The UI limit is 25 MB — raise it in next.config.ts and your Supabase bucket policy.`);
      return;
    }
    await createProject(file.name.replace(/\.[^.]+$/, ""), file);
  }

  async function removeProject(id: string) {
    setMenuFor(null);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    try {
      await store.remove(id);
    } catch {
      void refresh();
    }
  }

  async function signOut() {
    const supabase = getSupabaseBrowser();
    await supabase?.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const filtered = projects.filter((p) => p.title.toLowerCase().includes(query.trim().toLowerCase()));
  const totalMs = projects.reduce((sum, p) => sum + (p.duration_ms || timelineDuration(p.doc)), 0);

  return (
    <div
      className="min-h-dvh"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      {/* top bar */}
      <header className="sticky top-0 z-30 border-b border-ink-800/80 bg-ink-950/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Logo size={28} />
            </Link>
            <span className="hidden h-5 w-px bg-ink-800 sm:block" />
            <span className="hidden text-[13px] font-medium text-ink-400 sm:block">Projects</span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider sm:inline-flex",
                store.mode === "cloud"
                  ? "border-lime-signal/30 bg-lime-signal/10 text-lime-signal"
                  : "border-amber-signal/30 bg-amber-signal/10 text-amber-signal",
              )}
              title={
                store.mode === "cloud"
                  ? "Connected to Supabase — projects sync to the cloud."
                  : "Demo mode — projects are stored in this browser only."
              }
            >
              {store.mode === "cloud" ? <Cloud className="h-3 w-3" /> : <HardDrive className="h-3 w-3" />}
              {store.mode === "cloud" ? "Cloud" : "Local demo"}
            </span>

            {userEmail ? (
              <div className="flex items-center gap-1">
                <span className="hidden max-w-[160px] truncate text-xs text-ink-400 md:block">{userEmail}</span>
                <button onClick={signOut} className="rf-btn rf-btn-quiet h-9 px-2" title="Sign out">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link href="/login" className="rf-btn rf-btn-quiet text-xs">
                Sign in
              </Link>
            )}

            <button onClick={() => setShowNew(true)} className="rf-btn rf-btn-primary">
              <Plus className="h-4 w-4" />
              New project
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink-50">
              {userEmail ? "Your projects" : "Demo workspace"}
            </h1>
            <p className="mt-1 text-[13px] text-ink-400">
              {projects.length} project{projects.length === 1 ? "" : "s"} ·{" "}
              {formatTimecode(totalMs)} of footage ·{" "}
              {store.mode === "local" ? "saved in this browser only" : "synced to Supabase"}
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects"
              className="rf-input pl-9"
              aria-label="Search projects"
            />
          </div>
        </div>

        {error && (
          <div className="mt-5 flex items-start justify-between gap-3 rounded-xl border border-rose-signal/30 bg-rose-signal/10 px-4 py-3 text-[13px] text-rose-signal">
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="mt-10 grid place-items-center py-20 text-ink-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState onCreate={() => setShowNew(true)} />
        ) : (
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                menuOpen={menuFor === project.id}
                onMenu={() => setMenuFor(menuFor === project.id ? null : project.id)}
                onDelete={() => removeProject(project.id)}
              />
            ))}
            <button
              onClick={() => setShowNew(true)}
              className="group grid min-h-[190px] place-items-center rounded-2xl border border-dashed border-ink-700 bg-ink-900/40 transition-colors hover:border-lime-signal/50 hover:bg-ink-850/60"
            >
              <span className="flex flex-col items-center gap-2 text-ink-500 transition-colors group-hover:text-lime-signal">
                <Plus className="h-6 w-6" />
                <span className="text-[13px] font-medium">New project</span>
              </span>
            </button>
          </div>
        )}

        <div className="mt-10 rounded-2xl border border-ink-800 bg-ink-900/40 p-5">
          <h2 className="text-[13px] font-semibold text-ink-200">Launch checklist</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {[
              ["Supabase project + keys", isSupabaseConfigured],
              ["Storage bucket + RLS", isSupabaseConfigured],
              ["OpenAI key for real captions", false],
              ["Render worker online", false],
            ].map(([label, done]) => (
              <div key={label as string} className="flex items-center gap-2 text-[12.5px] text-ink-400">
                <span
                  className={cn(
                    "grid h-4 w-4 place-items-center rounded-full border text-[9px]",
                    done ? "border-lime-signal bg-lime-signal text-ink-950" : "border-ink-600",
                  )}
                >
                  {done ? "✓" : ""}
                </span>
                {label as string}
              </div>
            ))}
          </div>
          <Link href="/docs" className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-lime-signal hover:underline">
            Read the deployment guide <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </main>

      {dragging && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/80 backdrop-blur-sm">
          <div className="rounded-2xl border-2 border-dashed border-lime-signal bg-ink-900/90 px-16 py-14 text-center">
            <Upload className="mx-auto h-8 w-8 text-lime-signal" />
            <p className="mt-4 text-lg font-semibold text-ink-50">Drop the clip</p>
            <p className="mt-1 text-xs text-ink-400">MP4, MOV or WEBM · up to 25 MB</p>
          </div>
        </div>
      )}

      {showNew && <NewProjectDialog onClose={() => setShowNew(false)} onCreate={createProject} />}

      {creating && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/85 backdrop-blur">
          <div className="flex items-center gap-3 rounded-xl border border-ink-700 bg-ink-850 px-5 py-4">
            <Loader2 className="h-4 w-4 animate-spin text-lime-signal" />
            <span className="text-sm text-ink-200">{creating}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectCard({
  project,
  menuOpen,
  onMenu,
  onDelete,
}: {
  project: ProjectRow;
  menuOpen: boolean;
  onMenu: () => void;
  onDelete: () => void;
}) {
  const duration = project.duration_ms || timelineDuration(project.doc);
  const hasVideo = project.doc.clips.length > 0;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-ink-800 bg-ink-850 transition-all hover:border-ink-600 hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9)]">
      <Link href={`/editor/${project.id}`} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-ink-900">
          {project.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.thumbnail_url}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-[radial-gradient(80%_80%_at_30%_20%,rgba(123,97,255,0.14),transparent_70%)]">
              <Clapperboard className="h-7 w-7 text-ink-600" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-6">
            <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white/85">
              {project.aspect}
            </span>
            <span className="text-[10px] font-medium text-white/70">{formatTimecode(duration)}</span>
          </div>
        </div>
      </Link>

      <div className="flex items-start justify-between gap-2 p-3.5">
        <div className="min-w-0">
          <Link href={`/editor/${project.id}`} className="block truncate text-[13.5px] font-semibold text-ink-100 hover:text-white">
            {project.title}
          </Link>
          <p className="mt-0.5 text-[11px] text-ink-500">
            {relativeTime(project.updated_at)} ·{" "}
            <span className={cn(hasVideo ? "text-ink-400" : "text-amber-signal")}>
              {hasVideo ? `${project.doc.captions.words.length} words` : "no media"}
            </span>
          </p>
        </div>
        <button
          onClick={onMenu}
          className="rounded-md p-1 text-ink-500 hover:bg-ink-800 hover:text-ink-200"
          aria-label="Project actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {menuOpen && (
        <div className="absolute right-2 top-2 z-10 w-36 overflow-hidden rounded-lg border border-ink-700 bg-ink-850 py-1 shadow-xl">
          <Link href={`/editor/${project.id}`} className="block px-3 py-1.5 text-[12px] text-ink-200 hover:bg-ink-800">
            Open editor
          </Link>
          <button
            onClick={onDelete}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-rose-signal hover:bg-ink-800"
          >
            <Trash2 className="h-3 w-3" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-ink-700 bg-ink-900/40 px-6 py-16 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-ink-850 text-lime-signal ring-1 ring-ink-700">
        <Upload className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-ink-50">Drop your first clip</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-400">
        Add a video and Reelforge builds the project, reads the duration and gets it ready for captions.
      </p>
      <button onClick={onCreate} className="rf-btn rf-btn-primary mx-auto mt-5">
        <Plus className="h-4 w-4" />
        New project
      </button>
    </div>
  );
}

function NewProjectDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (title: string, file: File | null, aspect: Aspect) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [aspect, setAspect] = useState<Aspect>("9:16");
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/80 p-5 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-ink-700 bg-ink-850 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-ink-50">New project</h2>
            <p className="mt-1 text-[12.5px] text-ink-400">Start empty or drop a clip to caption immediately.</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-ink-500 hover:bg-ink-800 hover:text-ink-200" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="title" className="rf-label mb-1.5 block">
              Title
            </label>
            <input
              id="title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Episode 12 — hook"
              className="rf-input"
            />
          </div>

          <div>
            <span className="rf-label mb-1.5 block">Canvas</span>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(ASPECTS) as Aspect[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAspect(key)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-[12px] transition-colors",
                    aspect === key
                      ? "border-lime-signal/60 bg-lime-signal/10 text-ink-50"
                      : "border-ink-700 bg-ink-900 text-ink-300 hover:border-ink-600",
                  )}
                >
                  <span className="block font-semibold">{key}</span>
                  <span className="block text-[10.5px] text-ink-500">{ASPECTS[key].label.split(" (")[0]}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="rf-label mb-1.5 block">Source clip (optional)</span>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full items-center gap-3 rounded-lg border border-dashed border-ink-600 bg-ink-900 px-3 py-3 text-left hover:border-lime-signal/50"
            >
              <Upload className="h-4 w-4 shrink-0 text-ink-400" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-medium text-ink-200">
                  {file ? file.name : "Choose a video"}
                </span>
                <span className="block text-[11px] text-ink-500">
                  {file ? formatBytes(file.size) : "MP4, MOV, WEBM · 25 MB max"}
                </span>
              </span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const picked = e.target.files?.[0] ?? null;
                setFile(picked);
                if (picked) {
                  setAspect("9:16");
                  if (!title) setTitle(picked.name.replace(/\.[^.]+$/, ""));
                }
              }}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rf-btn rf-btn-quiet">
            Cancel
          </button>
          <button
            onClick={() => void onCreate(title.trim() || "Untitled edit", file, aspect)}
            className="rf-btn rf-btn-primary"
          >
            Create project
          </button>
        </div>
      </div>
    </div>
  );
}
