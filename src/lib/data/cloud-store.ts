import type { ProjectDoc, ProjectRow, RenderRow } from "@/lib/types";
import { timelineDuration } from "@/lib/types";
import { createEmptyDoc } from "@/lib/project-defaults";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { uid, slugify } from "@/lib/utils";
import { probeDuration } from "@/lib/data/local-store";
import type { NewProjectInput, ProjectStore } from "@/lib/data/types";

const BUCKET = "media";
const SIGNED_URL_TTL = 60 * 60 * 6; // 6 hours
const urlCache = new Map<string, { url: string; expires: number }>();

/**
 * Cloud store: Supabase Auth + Postgres + Storage.
 * Media is stored privately at `<user_id>/<project_id>/<file>` and served via
 * short-lived signed URLs. RLS guarantees a user only ever sees their folder.
 */
export class CloudStore implements ProjectStore {
  readonly mode = "cloud" as const;

  private db() {
    const client = getSupabaseBrowser();
    if (!client) throw new Error("Supabase is not configured.");
    return client;
  }

  private async userId(): Promise<string> {
    const { data } = await this.db().auth.getUser();
    if (!data.user) throw new Error("Not signed in.");
    return data.user.id;
  }

  async list(): Promise<ProjectRow[]> {
    const { data, error } = await this.db()
      .from("projects")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as ProjectRow[];
  }

  async get(id: string): Promise<ProjectRow | null> {
    const { data, error } = await this.db().from("projects").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return (data as ProjectRow) ?? null;
  }

  async create(input: NewProjectInput): Promise<ProjectRow> {
    const userId = await this.userId();
    const now = new Date().toISOString();
    const doc = createEmptyDoc(input.title, input.aspect);
    const id = uid();

    // Insert first so storage policies can scope the upload path to the project.
    const { data, error } = await this.db()
      .from("projects")
      .insert({
        id,
        user_id: userId,
        title: input.title,
        status: "draft",
        doc,
        aspect: doc.aspect,
        duration_ms: 0,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    let row = data as ProjectRow;

    if (input.file) {
      const media = await this.uploadMedia(id, input.file);
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
      row = await this.save({
        ...row,
        doc,
        status: "ready",
        duration_ms: timelineDuration(doc),
      });
    }

    return row;
  }

  async save(project: ProjectRow): Promise<ProjectRow> {
    const patch = {
      title: project.doc.title || project.title,
      doc: project.doc,
      aspect: project.doc.aspect,
      duration_ms: timelineDuration(project.doc),
      status: project.status,
      thumbnail_url: project.thumbnail_url,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await this.db()
      .from("projects")
      .update(patch)
      .eq("id", project.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as ProjectRow;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.db().from("projects").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  async uploadMedia(projectId: string, file: File): Promise<{ src: string; name: string; size: number }> {
    const userId = await this.userId();
    const path = `${userId}/${projectId}/${uid()}-${slugify(file.name)}`;

    const { error } = await this.db()
      .storage.from(BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type || "video/mp4",
        upsert: false,
      });
    if (error) throw new Error(`Upload failed: ${error.message}`);

    return { src: `storage:${path}`, name: file.name, size: file.size };
  }

  async resolveSrc(src: string): Promise<string> {
    if (!src.startsWith("storage:")) return src;
    const path = src.slice("storage:".length);

    const cached = urlCache.get(path);
    if (cached && cached.expires > Date.now() + 60_000) return cached.url;

    const { data, error } = await this.db().storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
    if (error || !data?.signedUrl) return src;

    urlCache.set(path, { url: data.signedUrl, expires: Date.now() + SIGNED_URL_TTL * 1000 });
    return data.signedUrl;
  }

  async signedUrlFor(doc: ProjectDoc): Promise<ProjectDoc> {
    const next: ProjectDoc = structuredClone(doc);
    for (const clip of next.clips) clip.src = await this.resolveSrc(clip.src);
    if (next.music) next.music.src = await this.resolveSrc(next.music.src);
    return next;
  }

  async createRender(projectId: string, engine: "browser" | "ffmpeg"): Promise<RenderRow> {
    const userId = await this.userId();
    const { data, error } = await this.db()
      .from("renders")
      .insert({ project_id: projectId, user_id: userId, engine, status: "queued" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as RenderRow;
  }

  async getRender(id: string): Promise<RenderRow | null> {
    const { data, error } = await this.db().from("renders").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return (data as RenderRow) ?? null;
  }

  /** Pushes a fully-resolved doc to the worker queue (called by /api/render). */
  async enqueueRender(projectId: string, engine: "browser" | "ffmpeg" = "ffmpeg"): Promise<RenderRow> {
    const userId = await this.userId();
    const { data, error } = await this.db()
      .from("renders")
      .insert({ project_id: projectId, user_id: userId, engine, status: "queued" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as RenderRow;
  }
}
