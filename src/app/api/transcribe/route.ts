import { NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseServer } from "@/lib/supabase/server";
import { generateDemoTranscript } from "@/lib/project-defaults";
import type { Word, Segment } from "@/lib/types";
import { transcribeRequest, firstIssue } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024; // OpenAI audio endpoint hard limit
const BUCKET = "media";



/**
 * Transcription endpoint.
 *
 * With OPENAI_API_KEY  → downloads the project's source clip from Supabase
 *                        storage and calls Whisper for word-level timings.
 * Without a key        → returns a duration-scaled demo transcript so the
 *                        editor still works end to end.
 */
export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured on the server." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to transcribe." }, { status: 401 });

  const parsed = transcribeRequest.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }
  const body = parsed.data;

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, doc, duration_ms")
    .eq("id", body.projectId)
    .maybeSingle();

  if (projectError) return NextResponse.json({ error: projectError.message }, { status: 400 });
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const doc = project.doc as { clips?: { src?: string; name?: string }[] } | null;
  const firstClip = doc?.clips?.[0];
  const durationMs = body.durationMs ?? project.duration_ms ?? 0;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !firstClip?.src?.startsWith("storage:")) {
    return NextResponse.json({
      words: generateDemoTranscript(durationMs),
      segments: [] as Segment[],
      provider: "demo",
      language: "en",
      notice: apiKey
        ? "No cloud-hosted clip found — returning a demo transcript."
        : "OPENAI_API_KEY is not set — returning a demo transcript.",
    });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is required for server transcription." }, { status: 503 });
  }

  const path = firstClip.src.slice("storage:".length);
  const { data: fileBlob, error: downloadError } = await admin.storage.from(BUCKET).download(path);
  if (downloadError || !fileBlob) {
    return NextResponse.json({ error: `Could not read the source file: ${downloadError?.message ?? "unknown"}` }, { status: 500 });
  }

  if (fileBlob.size > MAX_BYTES) {
    return NextResponse.json(
      {
        error: `That clip is ${(fileBlob.size / 1024 / 1024).toFixed(1)} MB. OpenAI's transcription endpoint caps at 25 MB — use the render worker (it extracts audio with ffmpeg first) or trim the clip.`,
      },
      { status: 413 },
    );
  }

  try {
    const form = new FormData();
    form.append("file", fileBlob, firstClip.name ?? "audio.mp4");
    form.append("model", process.env.TRANSCRIBE_MODEL ?? "whisper-1");
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "word");
    form.append("timestamp_granularities[]", "segment");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        { error: `OpenAI transcription failed (${response.status}): ${detail.slice(0, 300)}` },
        { status: 502 },
      );
    }

    const payload = (await response.json()) as {
      text?: string;
      language?: string;
      words?: { word: string; start: number; end: number }[];
      segments?: { text: string; start: number; end: number }[];
    };

    const words: Word[] = (payload.words ?? [])
      .map((w) => ({
        w: (w.word ?? "").trim(),
        s: Math.round((w.start ?? 0) * 1000),
        e: Math.round((w.end ?? 0) * 1000),
      }))
      .filter((w) => w.w.length > 0);

    const segments: Segment[] = (payload.segments ?? []).map((s) => ({
      text: (s.text ?? "").trim(),
      s: Math.round((s.start ?? 0) * 1000),
      e: Math.round((s.end ?? 0) * 1000),
    }));

    return NextResponse.json({
      words,
      segments,
      provider: "openai",
      language: payload.language ?? "en",
      text: payload.text ?? "",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Transcription request failed." },
      { status: 500 },
    );
  }
}
