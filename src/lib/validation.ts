import { z } from "zod";

/** Request bodies for the API routes. Keep these strict — they are the edge. */
export const transcribeRequest = z.object({
  projectId: z.string().uuid("projectId must be a UUID"),
  durationMs: z.number().int().min(0).max(60 * 60 * 1000).optional(),
});

export const renderRequest = z.object({
  projectId: z.string().uuid("projectId must be a UUID"),
  engine: z.enum(["browser", "ffmpeg"]).optional(),
  resolution: z.enum(["720", "1080"]).optional(),
});

/** Turns a zod failure into a single readable line for the client. */
export function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid request.";
  const path = issue.path.join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}
