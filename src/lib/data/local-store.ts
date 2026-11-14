import type { ProjectDoc, ProjectRow, RenderRow } from "@/lib/types";
import { timelineDuration } from "@/lib/types";
import { createEmptyDoc } from "@/lib/project-defaults";
import { getFile, putFile, deleteFile } from "@/lib/idb";
import { uid } from "@/lib/utils";
import type { NewProjectInput, ProjectStore } from "@/lib/data/types";

/**
 * Demo-mode store: no accounts, no network. Projects live in localStorage,
 * media blobs in IndexedDB, and src tokens are `local:<fileId>`.
 */
const PROJECTS_KEY = "reelforge.projects.v1";
const RENDERS_KEY = "reelforge.renders.v1";
const LOCAL_USER = "local-user";

const urlCache = new Map<string, string>();

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded — thumbnails are the usual culprit, drop them and retry.
    if (Array.isArray(value)) {
      const slim = value.map((v) => ({ ...(v as object), thumbnail_url: null }));
      try {
        window.localStorage.setItem(key, JSON.stringify(slim));
      } catch {
        /* give up quietly */
      }
    }
  }
}

function seedIfEmpty(): ProjectRow[] {
  const existing = readJson<ProjectRow[]>(PROJECTS_KEY, []);
  if (existing.length) return existing;

  const now = new Date().toISOString();
  const starterTitles = ["My first vertical edit", "Podcast clip — hook test"];
  const seeded: ProjectRow[] = starterTitles.map((title, i) => {
    const doc = createEmptyDoc(title);
    return {
      id: uid("prj"),
      user_id: LOCAL_USER,
      title,
      status: "draft",
      doc,
      thumbnail_url: null,
      duration_ms: 0,
      aspect: doc.aspect,
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
      updated_at: now,
    };
  });
  writeJson(PROJECTS_KEY, seeded);
  return seeded;
}

export class LocalStore implements ProjectStore {
  readonly mode = "local" as const;

  private all(): ProjectRow[] {
    return seedIfEmpty().sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }

  private persist(rows: ProjectRow[]) {
    writeJson(PROJECTS_KEY, rows);
  }

  async list(): Promise<ProjectRow[]> {
    return this.all();
  }

  async get(id: string): Promise<ProjectRow | null> {
    return this.all().find((p) => p.id === id) ?? null;
  }

  async create(input: NewProjectInput): Promise<ProjectRow> {
    const now = new Date().toISOString();
    const doc = createEmptyDoc(input.title, input.aspect);

    if (input.file) {
      const media = await this.uploadMedia("pending", input.file);
      const objectUrl = await this.resolveSrc(media.src);
      const durationMs = await probeDuration(objectUrl);
      doc.clips = [
        {
          id: uid("clip"),
          name: input.file.name,
          src: media.src,
          inMs: 0,
          outMs: durationMs,
          sourceDurationMs: durationMs,
          volume: 1,
          muted: false,
        },
      ];
    }

    const row: ProjectRow = {
      id: uid("prj"),
      user_id: LOCAL_USER,
      title: input.title,
      status: doc.clips.length ? "ready" : "draft",
      doc,
      thumbnail_url: null,
      duration_ms: timelineDuration(doc),
      aspect: doc.aspect,
      created_at: now,
      updated_at: now,
    };

    const rows = this.all();
    rows.unshift(row);
    this.persist(rows);
    return row;
  }

  async save(project: ProjectRow): Promise<ProjectRow> {
    const rows = this.all();
    const index = rows.findIndex((p) => p.id === project.id);
    const next: ProjectRow = {
      ...project,
      duration_ms: timelineDuration(project.doc),
      aspect: project.doc.aspect,
      title: project.doc.title || project.title,
      updated_at: new Date().toISOString(),
    };
    if (index >= 0) rows[index] = next;
    else rows.unshift(next);
    this.persist(rows);
    return next;
  }

  async remove(id: string): Promise<void> {
    const existing = this.all().find((p) => p.id === id);
    if (existing) {
      for (const clip of existing.doc.clips) await forgetLocalFile(clip.src);
      if (existing.doc.music) await forgetLocalFile(existing.doc.music.src);
    }
    this.persist(this.all().filter((p) => p.id !== id));
  }

  async uploadMedia(_projectId: string, file: File): Promise<{ src: string; name: string; size: number }> {
    const id = uid("file");
    await putFile(id, file);
    return { src: `local:${id}`, name: file.name, size: file.size };
  }

  async resolveSrc(src: string): Promise<string> {
    if (!src.startsWith("local:")) return src;
    const cached = urlCache.get(src);
    if (cached) return cached;
    const blob = await getFile(src.slice("local:".length));
    if (!blob) return src;
    const url = URL.createObjectURL(blob);
    urlCache.set(src, url);
    return url;
  }

  async signedUrlFor(doc: ProjectDoc): Promise<ProjectDoc> {
    const next: ProjectDoc = structuredClone(doc);
    for (const clip of next.clips) clip.src = await this.resolveSrc(clip.src);
    if (next.music) next.music.src = await this.resolveSrc(next.music.src);
    return next;
  }

  async createRender(projectId: string, engine: "browser" | "ffmpeg"): Promise<RenderRow> {
    const rows = readJson<RenderRow[]>(RENDERS_KEY, []);
    const row: RenderRow = {
      id: uid("render"),
      project_id: projectId,
      user_id: LOCAL_USER,
      status: engine === "browser" ? "processing" : "failed",
      progress: engine === "browser" ? 5 : 0,
      engine,
      output_path: null,
      output_url: null,
      error:
        engine === "ffmpeg"
          ? "Server renders need Supabase + the render worker. Use “Export in browser” or follow DEPLOY.md."
          : null,
      created_at: new Date().toISOString(),
      finished_at: null,
    };
    rows.unshift(row);
    writeJson(RENDERS_KEY, rows);
    return row;
  }

  async getRender(id: string): Promise<RenderRow | null> {
    return readJson<RenderRow[]>(RENDERS_KEY, []).find((r) => r.id === id) ?? null;
  }

}

/** Reads intrinsic duration of a video blob URL in the browser. */
export function probeDuration(src: string): Promise<number> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") return resolve(0);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    const done = (value: number) => {
      video.removeAttribute("src");
      video.load();
      resolve(Number.isFinite(value) ? Math.round(value) : 0);
    };
    video.onloadedmetadata = () => done(video.duration * 1000);
    video.onerror = () => done(0);
    video.src = src;
    // Guard against metadata never firing for exotic codecs.
    setTimeout(() => done(video.duration * 1000 || 0), 12000);
  });
}

export async function forgetLocalFile(src: string) {
  if (!src.startsWith("local:")) return;
  await deleteFile(src.slice("local:".length));
}
