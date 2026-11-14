#!/usr/bin/env node
/**
 * Reelforge render worker.
 *
 * Polls the Supabase `renders` table for queued jobs, downloads the source
 * clips, burns the pre-generated .ass captions with ffmpeg, mixes audio, and
 * uploads the finished MP4 back to storage.
 *
 * Run it anywhere Node + ffmpeg exist (Dockerfile included):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run worker
 */
import { createClient } from "@supabase/supabase-js";
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_BUCKET ?? "media";
const POLL_MS = Number(process.env.WORKER_POLL_MS ?? 4000);
const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY ?? 1);

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("✗ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const FFMPEG = await resolveFfmpeg();
const FFPROBE = await resolveFfprobe();
console.log(`▶ Reelforge worker started`);
console.log(`  ffmpeg:  ${FFMPEG}`);
console.log(`  ffprobe: ${FFPROBE}`);
console.log(`  bucket:  ${BUCKET}  concurrency: ${CONCURRENCY}`);

const active = new Set();
let stopping = false;

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`\n… ${signal} received, finishing ${active.size} job(s)`);
  const timer = setInterval(() => {
    if (active.size === 0) {
      clearInterval(timer);
      process.exit(0);
    }
  }, 500);
  setTimeout(() => process.exit(0), 30000);
}

async function resolveFfmpeg() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try {
    const mod = await import("ffmpeg-static");
    if (mod?.default) return mod.default;
  } catch {
    /* not installed — fall through to PATH */
  }
  return "ffmpeg";
}

async function resolveFfprobe() {
  if (process.env.FFPROBE_PATH) return process.env.FFPROBE_PATH;
  try {
    const mod = await import("ffprobe-static");
    if (mod?.default?.path) return mod.default.path;
  } catch {
    /* not installed */
  }
  return "ffprobe";
}

/* ── main loop ─────────────────────────────────────────── */
async function loop() {
  while (!stopping) {
    if (active.size < CONCURRENCY) {
      const job = await claimJob();
      if (job) {
        active.add(job.id);
        processJob(job)
          .catch((error) => fail(job, error))
          .finally(() => active.delete(job.id));
        continue;
      }
    }
    await sleep(POLL_MS);
  }
}

async function claimJob() {
  const { data: candidates, error } = await supabase
    .from("renders")
    .select("id, project_id, user_id, options, engine")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    console.error("poll error:", error.message);
    await sleep(5000);
    return null;
  }
  const candidate = candidates?.[0];
  if (!candidate) return null;

  // Optimistic claim: only one worker wins the update.
  const { data: claimed } = await supabase
    .from("renders")
    .update({ status: "processing", progress: 2, started_at: new Date().toISOString() })
    .eq("id", candidate.id)
    .eq("status", "queued")
    .select("id")
    .maybeSingle();

  return claimed ? candidate : null;
}

async function processJob(job) {
  const workdir = await mkdtemp(join(tmpdir(), "reelforge-"));
  console.log(`\n▶ render ${job.id}`);

  try {
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, title, doc")
      .eq("id", job.project_id)
      .maybeSingle();
    if (projectError) throw new Error(projectError.message);
    if (!project) throw new Error("Project vanished");

    const doc = project.doc;
    const options = job.options ?? {};
    const resolution = options.resolution === "720" ? 720 : 1080;
    const { width, height } = canvasSize(doc.aspect, resolution);

    if (!doc?.clips?.length) throw new Error("Project has no clips");

    // 1. Download sources
    await setProgress(job.id, 6);
    const clipPaths = [];
    for (const [index, clip] of doc.clips.entries()) {
      if (!clip.src?.startsWith("storage:")) throw new Error(`Clip ${index + 1} has no cloud source`);
      const path = clip.src.slice("storage:".length);
      const local = join(workdir, `clip_${index}${extname(path)}`);
      await download(path, local);
      clipPaths.push(local);
      await setProgress(job.id, 6 + Math.round(((index + 1) / doc.clips.length) * 14));
    }

    // 2. Captions (.ass pre-generated by /api/render)
    let assPath = null;
    if (doc.captions?.enabled && options.assPath) {
      assPath = join(workdir, "captions.ass");
      await download(options.assPath, assPath);
    }

    let musicPath = null;
    if (doc.music?.src?.startsWith("storage:")) {
      musicPath = join(workdir, `music${extname(doc.music.src)}`);
      await download(doc.music.src.slice("storage:".length), musicPath);
    }

    // 3. Render
    await setProgress(job.id, 22);
    const output = join(workdir, "output.mp4");
    await runFfmpeg({
      doc,
      clipPaths,
      assPath,
      musicPath,
      output,
      width,
      height,
      onProgress: (fraction) => setProgress(job.id, 22 + Math.round(fraction * 70)),
    });

    // 4. Upload
    await setProgress(job.id, 94);
    const outputPath = `${job.user_id}/${job.project_id}/renders/${job.id}.mp4`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(outputPath, createReadStreamOf(output), { contentType: "video/mp4", upsert: true });
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    await supabase
      .from("renders")
      .update({
        status: "done",
        progress: 100,
        output_path: outputPath,
        finished_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    await supabase.from("projects").update({ status: "exported" }).eq("id", job.project_id);
    console.log(`✓ render ${job.id} complete`);
  } finally {
    await rm(workdir, { recursive: true, force: true }).catch(() => {});
  }
}

async function fail(job, error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`✗ render ${job.id}: ${message}`);
  await supabase
    .from("renders")
    .update({ status: "failed", error: message.slice(0, 800), finished_at: new Date().toISOString() })
    .eq("id", job.id);
  await supabase.from("projects").update({ status: "failed" }).eq("id", job.project_id);
}

/* ── ffmpeg ────────────────────────────────────────────── */
function buildArgs({ doc, clipPaths, assPath, musicPath, output, width, height }) {
  const filters = [];
  const inputs = [];
  const fps = 30;

  clipPaths.forEach((path) => inputs.push("-i", path));
  doc.clips.forEach((clip, i) => {
    const start = (clip.inMs / 1000).toFixed(3);
    const end = (clip.outMs / 1000).toFixed(3);
    const fit = doc.framing?.fit === "contain" ? "decrease" : "increase";
    const padColor = (doc.framing?.padColor ?? "#000000").replace("#", "0x");

    filters.push(
      `[${i}:v]trim=start=${start}:end=${end},setpts=PTS-STARTPTS,` +
        `scale=${width}:${height}:force_original_aspect_ratio=${fit},` +
        `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=${padColor},` +
        `fps=${fps},setsar=1,format=yuv420p[v${i}]`,
    );
    filters.push(`[${i}:a]atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS,aformat=fltp:44100:stereo[a${i}]`);
  });

  const concatInputs = doc.clips.map((_, i) => `[v${i}][a${i}]`).join("");
  filters.push(`${concatInputs}concat=n=${doc.clips.length}:v=1:a=1[vc][ac]`);

  let videoLabel = "vc";
  if (assPath) {
    const escaped = assPath.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
    filters.push(`[vc]subtitles='${escaped}':fontsdir=/usr/share/fonts[vs]`);
    videoLabel = "vs";
  }

  let audioLabel = "ac";
  const clipVolume = doc.audio?.clipVolume ?? 1;
  if (clipVolume !== 1) {
    filters.push(`[ac]volume=${clipVolume}[av]`);
    audioLabel = "av";
  }
  if (musicPath) {
    const musicIndex = inputs.filter((token) => token === "-i").length / 2;
    inputs.push("-stream_loop", "-1", "-i", musicPath);
    const musicVolume = doc.music?.volume ?? 0.25;
    filters.push(`[${musicIndex}:a]volume=${musicVolume},aformat=fltp:44100:stereo[am]`);
    filters.push(`[${audioLabel}][am]amix=inputs=2:duration=first:dropout_transition=2[amixed]`);
    audioLabel = "amixed";
  }
  if (doc.audio?.normalize) {
    filters.push(`[${audioLabel}]loudnorm=I=-14:TP=-1.5:LRA=11[anorm]`);
    audioLabel = "anorm";
  }

  const args = [...inputs];
  args.push(
    "-filter_complex",
    filters.join(";"),
    "-map",
    `[${videoLabel}]`,
    "-map",
    `[${audioLabel}]`,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-movflags",
    "+faststart",
    "-shortest",
    "-y",
    output,
  );

  return args;
}

function runFfmpeg(options) {
  const args = buildArgs(options);
  return new Promise((resolve, reject) => {
    const child = spawn(FFMPEG, ["-hide_banner", "-progress", "pipe:1", ...args], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let durationMs = 0;
    // Sum of chosen trims gives the expected output duration.
    durationMs = options.doc.clips.reduce((sum, clip) => sum + Math.max(0, clip.outMs - clip.inMs), 0);

    let stderr = "";
    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      const match = /out_time_ms=(\d+)/.exec(text);
      if (match && durationMs > 0) {
        const fraction = Math.min(1, Number(match[1]) / 1000 / durationMs);
        options.onProgress?.(fraction);
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 20000) stderr = stderr.slice(-20000);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.split("\n").slice(-6).join(" ")}`));
    });
  });
}

/* ── helpers ───────────────────────────────────────────── */
function canvasSize(aspect, resolution) {
  const map = {
    "9:16": [1080, 1920],
    "4:5": [1080, 1350],
    "1:1": [1080, 1080],
    "16:9": [1920, 1080],
  };
  const [w, h] = map[aspect] ?? map["9:16"];
  if (resolution >= 1080) return { width: w, height: h };
  return { width: Math.round((w * resolution) / 1080 / 2) * 2, height: Math.round((h * resolution) / 1080 / 2) * 2 };
}

async function download(path, destination) {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) throw new Error(`Download ${path} failed: ${error?.message ?? "unknown"}`);
  const nodeStream = Readable.fromWeb(data.stream());
  await pipeline(nodeStream, createWriteStream(destination));
}

function createReadStreamOf(path) {
  return createReadStream(path);
}

async function setProgress(id, progress) {
  await supabase.from("renders").update({ progress: Math.min(99, Math.round(progress)) }).eq("id", id);
}

function extname(path) {
  const match = /\.([a-z0-9]{2,4})(\?|$)/i.exec(path);
  return match ? `.${match[1].toLowerCase()}` : ".mp4";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

await loop();
