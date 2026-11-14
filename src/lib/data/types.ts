import type { Aspect, ProjectDoc, ProjectRow, RenderRow } from "@/lib/types";

export type NewProjectInput = {
  title: string;
  aspect: Aspect;
  file?: File | null;
};

export type StorageMode = "cloud" | "local";

export interface ProjectStore {
  readonly mode: StorageMode;
  list(): Promise<ProjectRow[]>;
  get(id: string): Promise<ProjectRow | null>;
  create(input: NewProjectInput): Promise<ProjectRow>;
  save(project: ProjectRow): Promise<ProjectRow>;
  remove(id: string): Promise<void>;
  /** Stores a media file and returns a resolvable src token. */
  uploadMedia(projectId: string, file: File): Promise<{ src: string; name: string; size: number }>;
  createRender(projectId: string, engine: "browser" | "ffmpeg"): Promise<RenderRow>;
  getRender(id: string): Promise<RenderRow | null>;
  /** Signed/object URL for any src token. */
  resolveSrc(src: string): Promise<string>;
  signedUrlFor(doc: ProjectDoc): Promise<ProjectDoc>;
}
