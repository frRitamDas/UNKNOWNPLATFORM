# Reelforge

**Raw footage in. Ready-to-post out.**

An AI video editing platform: upload a raw take, get word-level captions you can restyle in one click, reframe to 9:16, and export a finished MP4. Built with Next.js 15, Supabase and ffmpeg.

> **Status: working vertical slice, ready to deploy.** The editor, caption engine and both export paths are real. Accounts, cloud storage and server MP4 export switch on when you add keys — see [Setup](#setup-step-by-step). Nothing is a mockup: if a feature needs a key it says so in the UI and falls back to a demo path instead of pretending.

---

## What actually works today

| Area | State |
| --- | --- |
| Upload video (drag & drop) | ✅ browser storage (IndexedDB) or Supabase Storage |
| Projects dashboard | ✅ create, search, delete, poster frames |
| Word-level captions | ✅ 10 presets, 15+ style controls |
| Live preview | ✅ karaoke highlight at 60fps, scrub, trim, aspect switch |
| Transcript editing | ✅ fix a line, retime it, or paste a script and auto-time it |
| Real transcription | ✅ Whisper word timings **with `OPENAI_API_KEY`**; demo transcript without |
| In-browser export | ✅ canvas + MediaRecorder → MP4/WEBM download, zero infrastructure |
| Server MP4 export | ✅ ffmpeg worker burns the `.ass` caption track, mixes audio |
| Accounts | ✅ Supabase magic link, email/password, Google, Microsoft, Apple |
| Billing | ❌ not built (pricing page is a placeholder) |
| Auto silence/filler cut | ❌ next milestone |
| Face-tracking reframe | ❌ next milestone (crop is centre-based) |

### Interface

The app chrome mirrors the product surface it is modelled on: a dark sidebar (founding-offer card,
Home / Projects / Avatars / Search, workspace card with plan + upgrade), a large top-glow panel
holding the composer ("Add media" → pick a style → "Create my video"), a category-tabbed gallery of
caption styles rendered by the real preview engine, a plans modal, and a light marketing page with a
serif headline. Caption style cards are live previews of the ten presets, not stock footage.

---

## Quick start (zero config)

```bash
npm install
npm run dev          # http://localhost:3000
```

It boots in **demo mode**: projects live in your browser, captions come from a duration-scaled transcript, and export works in-browser. That is the fastest way to feel the product.

```bash
npm test             # 17 unit tests for the caption engine
npm run build        # production build
```

---

## Setup, step by step

The easy path, in the order that unblocks the most value per step.

### 1. Supabase project (5 min)

1. Create a project at [supabase.com](https://supabase.com) — pick the region closest to your users (`ap-south-1` for India).
2. **SQL Editor → New query** → paste all of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) → Run.
   Creates `profiles`, `projects`, `renders`, RLS policies, a signup trigger and the private `media` bucket.
3. **Project Settings → API** → copy the URL, `anon` key and `service_role` key.

### 2. Environment (1 min)

```bash
cp .env.example .env.local
```

Fill in:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # server-only, never prefix with NEXT_PUBLIC_
```

```bash
npm run db:setup     # verifies tables + bucket, prints what is still missing
npm run dev
```

The dashboard badge flips from **Local demo** to **Cloud**. Accounts now work.

### 3. Authentication (3 min)

Supabase → **Authentication → URL Configuration**:

- Site URL: `http://localhost:3000` (later your production URL)
- Redirect URLs: `http://localhost:3000/auth/callback`

Optional: **Providers → Google / GitHub** to enable the social buttons.

### 4. Transcription (2 min)

Add `OPENAI_API_KEY=sk-...` to `.env.local`, restart. `Auto-caption` now returns real word timings.

- Files over 25 MB are rejected by OpenAI's endpoint — the worker path chunks audio with ffmpeg instead.
- No key? Captions fall back to a demo transcript, clearly labelled in the UI.

### 5. Render worker (10 min, optional but recommended)

Vercel functions cannot run a 2-minute ffmpeg job, so rendering lives in its own container.

```bash
# local (needs ffmpeg installed)
brew install ffmpeg           # macOS
sudo apt install ffmpeg       # Debian/Ubuntu
npm run worker

# or container
docker build -f worker/Dockerfile -t reelforge-worker .
docker run --env-file .env.local reelforge-worker
```

Worker environment: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, optional `SUPABASE_BUCKET`, `WORKER_CONCURRENCY`.

Deploy it to Fly.io / Railway / Render / any VPS. It only needs Node + ffmpeg + outbound HTTPS.

### 6. Deploy (5 min)

See [DEPLOY.md](DEPLOY.md). Short version:

```bash
vercel --prod
```

Then set the same env vars in Vercel and add your production `/auth/callback` URL in Supabase.

---

## Architecture in one screen

```
Browser (editor)
  │  ProjectDoc JSON  ← single source of truth for an edit
  ├── Supabase Auth / Postgres / Storage (private bucket, folder-scoped RLS)
  ├── In-browser export: canvas + MediaRecorder
  └── POST /api/render ──► renders row + captions.ass
                              │
                              ▼
                        worker/index.mjs (ffmpeg) ──► MP4 in Storage
```

The caption engine has **three renderers sharing one line-breaker**, so the preview, the canvas export and the ffmpeg export always agree:

```
src/lib/captions/layout.ts                 buildLines()   ← shared truth
src/components/captions/CaptionLayer.tsx   React preview
src/lib/media/caption-canvas.ts            canvas (browser export)
src/lib/captions/ass.ts                    .ass (ffmpeg worker)
```

All type sizes are percentages of canvas width, so one document renders correctly at 720p, 1080p and 4K.

More depth: [ARCHITECTURE.md](ARCHITECTURE.md) · in-app [/docs](http://localhost:3000/docs).

---

## Project layout

```
src/app/                  routes: landing, login, dashboard, editor, docs, api
src/components/editor/    editor shell, preview, timeline, transcript, style panels, export
src/components/captions/  shared caption renderer
src/lib/captions/         preset catalogue, line breaking, ASS + SRT writers, colour maths
src/lib/data/             storage abstraction: Supabase ("cloud") and IndexedDB ("local")
src/lib/media/            canvas export pipeline, thumbnail capture, caption canvas renderer
src/lib/types.ts          ProjectDoc — the versioned edit document
worker/                   ffmpeg render worker + Dockerfile
supabase/migrations/      0001_init.sql
tests/                    caption engine unit tests
scripts/                  setup doctor, ffmpeg installer
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server on `0.0.0.0:3000` |
| `npm run build` / `start` | Production build / serve |
| `npm test` | Caption engine unit tests |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:setup` | Setup doctor: env, tables, bucket, ffmpeg |
| `npm run worker` | Start the render worker |
| `npm run worker:install` | Download a static ffmpeg for local dev |

## Keyboard shortcuts (editor)

| Key | Action |
| --- | --- |
| `Space` | Play / pause |
| `←` / `→` | Seek 1s |
| `E` | Export |

## Known limits

- **25 MB** per upload in the UI (bump the bucket limit and move to resumable uploads before launch).
- **Multi-clip**: clips concatenate, but captions transcribe the first clip only.
- **Browser export** runs in real time and needs the tab visible; it is MP4 in Chromium/Safari and WEBM elsewhere.
- **Music** is mixed on the server export, not in the live preview.
- **Fonts**: the worker image installs Inter/DejaVu/Liberation/Noto. Add a font to `worker/Dockerfile` if you add a preset that needs one, or burned captions will differ from the preview.

## License

Proprietary. © Reelforge.
