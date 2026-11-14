"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Clapperboard,
  Crown,
  Loader2,
  MoreHorizontal,
  Search,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import type { Aspect, ProjectRow } from "@/lib/types";
import { timelineDuration } from "@/lib/types";
import { getStore } from "@/lib/data";
import { getPreset } from "@/lib/captions/presets";
import { captureThumbnail } from "@/lib/media/thumbnail";
import { probeDuration } from "@/lib/data/local-store";
import { formatTimecode } from "@/lib/captions/layout";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import { Composer, EmptyProjects, StyleGallery, type ComposerResult } from "@/components/app/Composer";
import { Sidebar, type AppView } from "@/components/app/Sidebar";
import { OfferModal, PricingModal } from "@/components/app/PricingModal";
import { Logo } from "@/components/ui/Logo";
import { cn, relativeTime } from "@/lib/utils";

export function HomeScreen({ userEmail }: { userEmail: string | null }) {
  const router = useRouter();
  const store = useMemo(() => getStore(), []);

  const [view, setView] = useState<AppView>("home");
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [styleId, setStyleId] = useState("hormozi");
  const [pricingOpen, setPricingOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const stylesRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      setProjects(await store.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your projects.");
    } finally {
      setLoading(false);
    }
  }, [store]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // ── create ────────────────────────────────────────────────
  const handleStart = useCallback(
    async ({ file, styleId: pickedStyle, chips, musicFile }: ComposerResult) => {
      setError(null);
      setBusyLabel("Uploading your clip…");
      try {
        const social = chips.includes("social");
        const finalStyle = social ? "tiktok-box" : chips.includes("punchy") ? "hormozi" : pickedStyle;
        const aspect: Aspect = "9:16";

        const project = await store.create({
          title: file.name.replace(/\.[^.]+$/, ""),
          aspect,
          file,
        });

        let doc = {
          ...project.doc,
          aspect,
          captions: {
            ...project.doc.captions,
            enabled: chips.includes("captions") || chips.length === 0,
            style: {
              ...getPreset(finalStyle).style,
              positionYPct: social ? 76 : getPreset(finalStyle).style.positionYPct,
            },
          },
          framing: {
            ...project.doc.framing,
            transition: chips.includes("transitions") ? ("fade" as const) : ("cut" as const),
          },
        };

        if (musicFile) {
          setBusyLabel("Adding the audio track…");
          const media = await store.uploadMedia(project.id, musicFile);
          const url = await store.resolveSrc(media.src);
          const durationMs = await probeDuration(url);
          doc = {
            ...doc,
            music: {
              src: media.src,
              name: musicFile.name,
              volume: 0.22,
              inMs: 0,
              outMs: durationMs || 60000,
              duckUnderVoice: true,
            },
          };
        }

        setBusyLabel("Building your project…");
        let saved = await store.save({ ...project, doc, status: "ready" });

        // Poster frame for the project card.
        if (saved.doc.clips[0]) {
          const resolved = await store.resolveSrc(saved.doc.clips[0].src);
          const thumb = await captureThumbnail(resolved);
          if (thumb) saved = await store.save({ ...saved, thumbnail_url: thumb });
        }

        router.push(`/editor/${saved.id}?transcribe=1`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create the project.");
        setBusyLabel(null);
      }
    },
    [router, store],
  );

  const removeProject = useCallback(
    async (id: string) => {
      setMenuFor(null);
      setProjects((current) => current.filter((p) => p.id !== id));
      try {
        await store.remove(id);
      } catch {
        void refresh();
      }
    },
    [refresh, store],
  );

  async function signOut() {
    const supabase = getSupabaseBrowser();
    await supabase?.auth.signOut();
    router.push(isSupabaseConfigured ? "/login" : "/");
    router.refresh();
  }

  function openStyles() {
    setView("home");
    setTimeout(() => stylesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  return (
    <div className="app-shell flex min-h-dvh">
      <Sidebar
        view={view}
        onNavigate={setView}
        onNewProject={() => {
          setView("home");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onUpgrade={() => setPricingOpen(true)}
        onOffer={() => setOfferOpen(true)}
        onSearch={() => setSearchOpen(true)}
        onSignOut={signOut}
        userEmail={userEmail}
        projectCount={projects.length}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
      />

      <main className="min-w-0 flex-1 p-2 sm:p-3 lg:p-4">
        {/* mobile top bar */}
        <div className="mb-2 flex items-center justify-between rounded-2xl border border-white/5 bg-app-900 px-4 py-2.5 lg:hidden">
          <Link href="/">
            <Logo size={24} />
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={() => setSearchOpen(true)} className="rounded-lg p-2 text-app-300 hover:bg-white/5" aria-label="Search">
              <Search className="h-4 w-4" />
            </button>
            <button onClick={() => setPricingOpen(true)} className="rounded-lg bg-gradient-to-b from-ember to-ember-deep px-3 py-1.5 text-[11.5px] font-semibold text-app-950">
              Get MAX
            </button>
          </div>
        </div>
        <div className="mb-2 flex gap-1 overflow-x-auto rounded-2xl border border-white/5 bg-app-900 p-1.5 lg:hidden">
          {(
            [
              ["home", "Home"],
              ["projects", "Projects"],
              ["avatars", "Avatars"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={cn(
                "flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors",
                view === id ? "bg-white/10 text-white" : "text-app-300",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="app-panel relative min-h-[calc(100dvh-2rem)] overflow-hidden px-4 pb-10 pt-5 sm:px-8 sm:pt-6">
          {/* panel header */}
          <div className="flex items-start justify-between gap-4">
            <div className="hidden items-center gap-2 lg:flex">
              <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10.5px] font-medium text-app-300">
                <span className="h-1.5 w-1.5 rounded-full bg-mint" />
                {store.mode === "cloud" ? "Cloud workspace" : "Local demo"}
              </span>
            </div>
            <button
              onClick={() => setPricingOpen(true)}
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-ember/60 bg-gradient-to-b from-ember/25 to-ember/10 px-3 py-1.5 text-[12px] font-semibold text-ember-soft transition-colors hover:border-ember hover:text-white"
            >
              <Crown className="h-3.5 w-3.5" />
              Get MAX
            </button>
          </div>

          {view === "home" && (
            <>
              <div className="mx-auto mt-6 max-w-3xl text-center sm:mt-8">
                <h1 className="text-[1.75rem] font-bold tracking-[-0.03em] text-white sm:text-[2.1rem]">
                  Welcome to Reelforge
                </h1>
                <p className="mt-1.5 text-[13.5px] text-app-300">Import media and select an edit style</p>
              </div>

              <div className="mx-auto mt-6 max-w-3xl">
                {error && (
                  <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-rose-signal/30 bg-rose-signal/10 px-3 py-2 text-[12px] text-rose-signal">
                    <span className="truncate">{error}</span>
                    <button onClick={() => setError(null)} aria-label="Dismiss">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                <div className="rounded-2xl border border-white/8 bg-app-850/70 p-4 sm:p-5">
                  <Composer
                    styleId={styleId}
                    onStyleChange={setStyleId}
                    onStart={(result) => void handleStart(result)}
                    busy={busyLabel !== null}
                    busyLabel={busyLabel}
                    onOpenStyles={openStyles}
                  />
                </div>
              </div>

              <div className="mx-auto mt-8 max-w-5xl">
                <StyleGallery selected={styleId} onSelect={setStyleId} sectionRef={stylesRef} />
              </div>

              {projects.length > 0 && (
                <div className="mx-auto mt-10 max-w-5xl">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-app-400">Recent projects</h2>
                    <button onClick={() => setView("projects")} className="flex items-center gap-1 text-[12px] text-app-300 hover:text-white">
                      View all <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {projects.slice(0, 4).map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        menuOpen={menuFor === project.id}
                        onMenu={() => setMenuFor(menuFor === project.id ? null : project.id)}
                        onDelete={() => void removeProject(project.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {loading && (
                <div className="mt-8 grid place-items-center text-app-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              )}
            </>
          )}

          {view === "projects" && (
            <div className="mx-auto mt-8 max-w-5xl">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h1 className="text-[1.6rem] font-bold tracking-[-0.03em] text-white">Projects</h1>
                  <p className="mt-1 text-[12.5px] text-app-400">
                    {projects.length} project{projects.length === 1 ? "" : "s"} ·{" "}
                    {formatTimecode(projects.reduce((sum, p) => sum + (p.duration_ms || timelineDuration(p.doc)), 0))} edited
                  </p>
                </div>
                <button onClick={openStyles} className="rf-btn rf-btn-primary h-9 text-[12.5px]">
                  <Sparkles className="h-3.5 w-3.5" /> New project
                </button>
              </div>

              {projects.length === 0 ? (
                <EmptyProjects onNew={openStyles} />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {projects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      menuOpen={menuFor === project.id}
                      onMenu={() => setMenuFor(menuFor === project.id ? null : project.id)}
                      onDelete={() => void removeProject(project.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {view === "avatars" && (
            <div className="mx-auto mt-10 max-w-xl text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-gradient-to-br from-ember/25 to-sky/20 text-white">
                <UserRound className="h-6 w-6" />
              </div>
              <h1 className="mt-5 text-[1.5rem] font-bold tracking-tight text-white">AI avatars are next</h1>
              <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-app-400">
                A talking avatar that reads your script, in your brand style. It needs a video model plus consent
                tooling, so it is deliberately not faked here.
              </p>
              <div className="mt-5 grid gap-2 text-left sm:grid-cols-3">
                {["Script to voice", "Lip-synced avatar", "Brand wardrobe"].map((item) => (
                  <div key={item} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-[11.5px] text-app-300">
                    {item}
                    <span className="ml-1.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] uppercase text-app-400">soon</span>
                  </div>
                ))}
              </div>
              <button onClick={openStyles} className="rf-btn rf-btn-ghost mx-auto mt-6 h-9 text-[12.5px]">
                Back to the composer
              </button>
            </div>
          )}
        </div>
      </main>

      {pricingOpen && <PricingModal onClose={() => setPricingOpen(false)} />}
      {offerOpen && (
        <OfferModal
          onAccept={() => {
            setOfferOpen(false);
            setPricingOpen(true);
          }}
          onDecline={() => setOfferOpen(false)}
        />
      )}
      {searchOpen && (
        <SearchModal
          projects={projects}
          onClose={() => setSearchOpen(false)}
          onOpenProject={(id) => router.push(`/editor/${id}`)}
          onPickStyle={(id) => {
            setStyleId(id);
            setSearchOpen(false);
            openStyles();
          }}
        />
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

  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/8 bg-app-800 transition-colors hover:border-white/20">
      <Link href={`/editor/${project.id}`} className="block">
        <div className="relative aspect-[9/13] overflow-hidden bg-app-900">
          {project.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.thumbnail_url}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-[radial-gradient(80%_70%_at_40%_20%,rgba(255,161,76,0.12),transparent_70%)]">
              <Clapperboard className="h-6 w-6 text-app-600" />
            </div>
          )}
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[9.5px] font-medium text-white/85">
            {formatTimecode(duration)}
          </span>
        </div>
      </Link>
      <div className="flex items-start justify-between gap-1 p-2.5">
        <div className="min-w-0">
          <Link href={`/editor/${project.id}`} className="block truncate text-[12.5px] font-semibold text-white hover:text-ember-soft">
            {project.title}
          </Link>
          <p className="mt-0.5 text-[10.5px] text-app-500">
            {relativeTime(project.updated_at)} · {project.doc.captions.words.length} words
          </p>
        </div>
        <button onClick={onMenu} className="rounded p-1 text-app-500 hover:bg-white/5 hover:text-white" aria-label="Project actions">
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>

      {menuOpen && (
        <div className="absolute right-1.5 top-1.5 z-10 w-32 overflow-hidden rounded-lg border border-white/10 bg-app-750 py-1 shadow-xl">
          <Link href={`/editor/${project.id}`} className="block px-3 py-1.5 text-[11.5px] text-app-100 hover:bg-white/10">
            Open editor
          </Link>
          <button
            onClick={onDelete}
            className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-[11.5px] text-rose-signal hover:bg-white/10"
          >
            <Trash2 className="h-3 w-3" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

function SearchModal({
  projects,
  onClose,
  onOpenProject,
  onPickStyle,
}: {
  projects: ProjectRow[];
  onClose: () => void;
  onOpenProject: (id: string) => void;
  onPickStyle: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filteredProjects = projects.filter((p) => p.title.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 px-4 pt-[12vh] backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-auto w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-app-850 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
          <Search className="h-4 w-4 text-app-400" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects and styles"
            className="w-full bg-transparent text-[13.5px] text-white outline-none placeholder:text-app-500"
          />
          <button onClick={onClose} className="rounded p-1 text-app-400 hover:text-white" aria-label="Close search">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="rf-scroll-thin max-h-[50vh] overflow-y-auto p-2">
          {filteredProjects.length > 0 && (
            <>
              <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-app-500">Projects</p>
              {filteredProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => onOpenProject(project.id)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-white/5"
                >
                  <Clapperboard className="h-3.5 w-3.5 text-app-400" />
                  <span className="flex-1 truncate text-[12.5px] text-app-100">{project.title}</span>
                  <span className="text-[10.5px] text-app-500">{project.aspect}</span>
                </button>
              ))}
            </>
          )}
          <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-app-500">Caption styles</p>
          {["clean", "hormozi", "karaoke-pop", "tiktok-box", "neon", "podcast", "yellow-impact", "editorial", "underline", "beast"]
            .filter((id) => getPreset(id).name.toLowerCase().includes(query.trim().toLowerCase()))
            .map((id) => {
              const preset = getPreset(id);
              return (
                <button
                  key={id}
                  onClick={() => onPickStyle(id)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-white/5"
                >
                  <span className="flex gap-0.5">
                    {preset.swatch.map((color, index) => (
                      <span key={index} className="h-3 w-1 rounded-full" style={{ background: color }} />
                    ))}
                  </span>
                  <span className="flex-1 truncate text-[12.5px] text-app-100">{preset.name}</span>
                  <span className="text-[10.5px] text-app-500">{preset.style.animation}</span>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
