# Deploying Reelforge

Target: **https://videoeditingai.vercel.app**

Three moving parts. Do them in this order — each one is independently useful.

1. **Vercel** — hosts the Next.js app (the editor UI + API routes)
2. **Supabase** — accounts, Postgres, file storage
3. **Worker** — a container that runs ffmpeg for server MP4 export

---

## 0. Prerequisites

- GitHub repo connected to Vercel
- A Supabase project (`ap-south-1` if your audience is in India)
- Optional: an OpenAI key for real transcription
- Optional: a small container host for the worker (Fly.io, Railway, Render, a VPS)

---

## 1. Supabase

### Create the schema

Supabase → **SQL Editor** → paste the whole of `supabase/migrations/0001_init.sql` → **Run**.

Verify: `projects`, `renders`, `profiles` exist, and Storage shows a private `media` bucket.

### Grab the keys

**Project Settings → API**

| Key | Where it goes |
| --- | --- |
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` public | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` secret | `SUPABASE_SERVICE_ROLE_KEY` (**server only**) |

### Auth URLs

**Authentication → URL Configuration**

```
Site URL:        https://videoeditingai.vercel.app
Redirect URLs:   https://videoeditingai.vercel.app/auth/callback
                 http://localhost:3000/auth/callback
                 https://*-<your-team>.vercel.app/auth/callback   (preview deploys)
```

If OAuth/magic links bounce back to `localhost`, this is the setting you missed.

### Storage limits

**Storage → media → Settings**: file size limit. The migration sets 250 MB; the app's UI cap is 25 MB until you switch to resumable uploads.

---

## 2. Vercel

```bash
npm i -g vercel
vercel link
vercel env add NEXT_PUBLIC_APP_URL production          # https://videoeditingai.vercel.app
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add OPENAI_API_KEY production
vercel env add RENDER_WORKER_SECRET production         # any long random string
vercel --prod
```

Or: import the repo at [vercel.com/new](https://vercel.com/new), add the variables in **Settings → Environment Variables**, deploy. Framework preset is detected as Next.js; `vercel.json` pins region `bom1`.

### Custom domain

**Settings → Domains → Add** `videoeditingai.vercel.app` (or your own domain), then update:

- `NEXT_PUBLIC_APP_URL` in Vercel
- Site URL + redirect URLs in Supabase

### Vercel constraints that shaped this build

| Limit | How the code avoids it |
| --- | --- |
| 4.5 MB function body | Uploads go **direct to Supabase Storage**, never through a route handler |
| 60 s function duration (Hobby) | No rendering in functions — the worker does it |
| 250 MB deployment size | ffmpeg lives in the worker image, not the Next.js bundle |
| No long-lived sockets | Render progress is polled with `GET /api/render?id=` |

---

## 3. Render worker

Any host that runs Docker and can reach Supabase over HTTPS.

### Fly.io

```bash
fly launch --no-deploy --name reelforge-worker
fly secrets set SUPABASE_URL=https://xxxx.supabase.co \
               SUPABASE_SERVICE_ROLE_KEY=eyJ... \
               WORKER_CONCURRENCY=1
fly deploy
```

`fly.toml` essentials — this is a background worker, so no `[http_service]`:

```toml
app = "reelforge-worker"
primary_region = "bom"

[build]
  dockerfile = "worker/Dockerfile"

[[vm]]
  size = "shared-cpu-2x"
  memory = "2gb"

[env]
  SUPABASE_BUCKET = "media"
  WORKER_POLL_MS = "4000"
```

### Railway / Render

Point the service at this repo, set the Dockerfile path to `worker/Dockerfile`, add the two secrets. No ports to expose.

### VPS

```bash
docker build -f worker/Dockerfile -t reelforge-worker .
docker run -d --restart=always --env-file .env.production reelforge-worker
```

### Verify

1. Open a project in the deployed app, hit **Export → Render worker**.
2. The dialog should move from *Queueing* → *Waiting for a worker* → *Rendering n%*.
3. If it stays on *Waiting*, the worker is not running or cannot see the queue:

```sql
select id, status, progress, error, created_at from public.renders order by created_at desc limit 5;
```

---

## 4. Post-deploy checklist

- [ ] Landing page loads over HTTPS
- [ ] Sign up with email → confirmation → lands on `/dashboard`
- [ ] Badge says **Cloud** (not Local demo)
- [ ] Upload a clip → poster frame appears
- [ ] `Auto-caption` returns real words (needs `OPENAI_API_KEY`)
- [ ] Edit a line in the transcript → preview updates
- [ ] Export 720p in browser → file downloads and plays
- [ ] Export via worker → progress reaches 100% and the MP4 downloads
- [ ] Sign out, sign in again, project still there
- [ ] Lighthouse: no console errors on landing

---

## 5. Costs at small scale

| Service | Free tier | Notes |
| --- | --- | --- |
| Vercel Hobby | 100 GB bandwidth | fine for a beta |
| Supabase Free | 500 MB DB, 1 GB storage | video fills this fast — move to Pro ($25) early |
| OpenAI Whisper | $0.006 / minute | 100 hours ≈ $36 |
| Worker (Fly shared 2x) | ~$10–15/mo | idle polling is cheap; CPU spikes during renders |

Storage is the line item that grows: one minute of 1080p vertical is roughly 10–20 MB. Plan for it before launch.

---

## 6. Scaling notes (when you outgrow this)

- **Queue**: replace table-polling with `pgmq` or SQS; the worker only needs a claim/release contract.
- **Parallel workers**: `WORKER_CONCURRENCY=2` per box, plus more boxes. The claim is an atomic conditional update, so double-rendering is already prevented.
- **Uploads**: switch to Supabase TUS resumable uploads and raise the 25 MB cap.
- **Rendering**: for >10 min videos, split into segment renders and concat, or move to GPU NVENC.
- **Transcription**: for files >25 MB, have the worker extract a 16 kHz mono WAV with ffmpeg before calling Whisper.
- **Billing**: Stripe Checkout + a `usage_events` table; gate `POST /api/render` by plan.
