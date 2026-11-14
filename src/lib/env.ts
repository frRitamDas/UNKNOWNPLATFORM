/**
 * Environment detection.
 *
 * The app boots in two modes:
 *  - PRODUCTION: Supabase + OpenAI configured. Real accounts, cloud storage,
 *    real Whisper transcripts, server-side MP4 renders.
 *  - DEMO: nothing configured. Everything runs locally in the browser
 *    (IndexedDB + object URLs) with a generated transcript, so a fresh clone
 *    or a preview deploy is instantly usable.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(url && anonKey);

export const env = {
  appUrl: (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  supabaseUrl: url,
  supabaseAnonKey: anonKey,
  hasOpenAI: Boolean(process.env.OPENAI_API_KEY),
  hasRenderWorker: Boolean(process.env.RENDER_WORKER_SECRET),
  transcribeModel: process.env.TRANSCRIBE_MODEL ?? "whisper-1",
  mode: isSupabaseConfigured ? ("cloud" as const) : ("demo" as const),
};

export const APP_NAME = "Reelforge";
export const APP_TAGLINE = "Paste the raw clip. Get the finished video.";
