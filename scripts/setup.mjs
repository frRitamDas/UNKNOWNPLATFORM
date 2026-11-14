#!/usr/bin/env node
/**
 * Reelforge setup doctor.
 *
 *   node scripts/setup.mjs
 *
 * Verifies your environment, creates the storage bucket if it is missing, and
 * tells you exactly what is still unconfigured. Read-only against your data.
 */
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    }
  }
}

loadEnv();

const ok = (label, detail = "") => console.log(`${green("✓")} ${label}${detail ? dim(`  ${detail}`) : ""}`);
const bad = (label, detail = "") => console.log(`${red("✗")} ${label}${detail ? `\n    ${detail}` : ""}`);
const warn = (label, detail = "") => console.log(`${yellow("•")} ${label}${detail ? `\n    ${detail}` : ""}`);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("\nReelforge setup doctor\n" + "─".repeat(52) + "\n");

let fatal = false;

if (url && anon) ok("Supabase URL + anon key present");
else {
  bad("Supabase not configured", "Copy .env.example → .env.local and add Project Settings → API keys.");
  fatal = true;
}

if (service) ok("Service role key present (server transcription + worker)");
else warn("No service role key", "Required for /api/transcribe and the render worker. Never expose it to the browser.");

if (process.env.OPENAI_API_KEY) ok("OpenAI key present (real Whisper transcription)");
else warn("No OPENAI_API_KEY", "Captions fall back to a scripted demo transcript. Add a key for real speech recognition.");

if (process.env.RENDER_WORKER_SECRET) ok("Render worker secret present");
else warn("No RENDER_WORKER_SECRET", "Server MP4 export is disabled. Browser export still works.");

if (!fatal) {
  const admin = createClient(url, service ?? anon, { auth: { persistSession: false } });

  // Tables
  for (const table of ["projects", "renders", "profiles"]) {
    const { error } = await admin.from(table).select("id", { head: true, count: "exact" }).limit(1);
    if (!error) ok(`table public.${table} reachable`);
    else if (/does not exist|schema cache/i.test(error.message))
      bad(`table public.${table} missing`, "Run supabase/migrations/0001_init.sql in the SQL editor.");
    else ok(`table public.${table} reachable`, dim(error.message));
  }

  // Bucket
  const { data: buckets, error: bucketError } = await admin.storage.listBuckets();
  if (bucketError) {
    bad("Could not list storage buckets", bucketError.message);
  } else if (buckets?.some((b) => b.name === "media")) {
    ok("storage bucket 'media' exists");
  } else if (service) {
    const { error } = await admin.storage.createBucket("media", { public: false, fileSizeLimit: 262144000 });
    if (error) bad("Could not create bucket 'media'", error.message);
    else ok("created storage bucket 'media'", "re-run to confirm");
  } else {
    bad("storage bucket 'media' missing", "Create it in Storage → New bucket, private, or add SUPABASE_SERVICE_ROLE_KEY.");
  }

  // ffmpeg availability for the worker
  const { execFileSync } = await import("node:child_process");
  try {
    const version = execFileSync(process.env.FFMPEG_PATH ?? "ffmpeg", ["-version"], { encoding: "utf8" }).split("\n")[0];
    ok("ffmpeg on PATH", version.slice(0, 60));
  } catch {
    warn("ffmpeg not found", "Needed for server MP4 export. `npm i -D ffmpeg-static` or install ffmpeg.");
  }
}

console.log("\n" + "─".repeat(52));
if (fatal) {
  console.log(red("Setup incomplete.") + " The app still runs in local demo mode.\n");
  process.exit(1);
}
console.log(green("Ready.") + " Start the app with `npm run dev`.\n");
