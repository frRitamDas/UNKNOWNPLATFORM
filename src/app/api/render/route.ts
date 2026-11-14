import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSupabaseAdmin, getSupabaseServer } from "@/lib/supabase/server";
import { buildAss } from "@/lib/captions/ass";
import { ASPECTS, type ProjectDoc } from "@/lib/types";
import { renderRequest, firstIssue } from "@/lib/validation";

export const runtime = "nodejs";

const BUCKET = "media";
const SIGNED_TTL = 60 * 60 * 24;

/** Queue a server-side (ffmpeg) render. */
export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured on the server." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to export." }, { status: 401 });

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      {
        error:
          "Server rendering needs SUPABASE_SERVICE_ROLE_KEY plus a running worker. Use “In this browser” for now, or follow DEPLOY.md to start the worker.",
      },
      { status: 501 },
    );
  }

  const parsed = renderRequest.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }
  const body = parsed.data;

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, user_id, doc")
    .eq("id", body.projectId)
    .maybeSingle();

  if (projectError) return NextResponse.json({ error: projectError.message }, { status: 400 });
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const doc = project.doc as ProjectDoc;
  const resolution = body.resolution === "720" ? 720 : 1080;
  const canvas = ASPECTS[doc.aspect] ?? ASPECTS["9:16"];
  const width = Math.round((canvas.width * resolution) / 1080 / 2) * 2;
  const height = Math.round((canvas.height * resolution) / 1080 / 2) * 2;

  // Compile the caption track here, in TypeScript, so the worker only runs ffmpeg.
  const renderId = randomUUID();
  let assPath: string | null = null;

  if (doc.captions?.enabled && doc.captions.words?.length) {
    const ass = buildAss(doc.captions.words, doc.captions.style, {
      aspect: doc.aspect,
      width,
      height,
      // Trim shifts the programme timeline; captions are authored on source time.
      offsetMs: -(doc.clips[0]?.inMs ?? 0) + (doc.captions.offsetMs ?? 0),
    });
    assPath = `${user.id}/${project.id}/renders/${renderId}/captions.ass`;
    const { error: assError } = await admin.storage
      .from(BUCKET)
      .upload(assPath, new Blob([ass], { type: "text/plain" }), { contentType: "text/plain", upsert: true });
    if (assError) {
      return NextResponse.json({ error: `Could not store captions: ${assError.message}` }, { status: 500 });
    }
  }

  const { error: insertError } = await admin.from("renders").insert({
    id: renderId,
    project_id: project.id,
    user_id: user.id,
    engine: "ffmpeg",
    status: "queued",
    progress: 0,
    options: { resolution: String(resolution), assPath, width, height },
  });

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });

  await admin.from("projects").update({ status: "rendering" }).eq("id", project.id);

  return NextResponse.json({ renderId, status: "queued", width, height });
}

/** Poll render status and mint a download URL when finished. */
export async function GET(request: Request) {
  const supabase = await getSupabaseServer();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in." }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const { data: render, error } = await supabase
    .from("renders")
    .select("id, status, progress, error, output_path, engine, created_at, finished_at")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!render) return NextResponse.json({ error: "Render not found." }, { status: 404 });

  let output_url: string | null = null;
  if (render.status === "done" && render.output_path) {
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(render.output_path, SIGNED_TTL);
    output_url = signed?.signedUrl ?? null;
  }

  return NextResponse.json({ ...render, output_url });
}
