# Architecture

Decisions worth knowing before you change anything.

---

## 1. The edit is a document, not a database of operations

Every project stores one JSON document (`src/lib/types.ts → ProjectDoc`) inside `projects.doc` (jsonb):

```ts
{
  version: 1,
  aspect: "9:16",
  clips: [{ id, src, inMs, outMs, sourceDurationMs, volume, muted }],
  captions: {
    enabled, language, words /* [{w,s,e}] */, provider, offsetMs,
    style: { fontScale, fontFamily, textColor, highlight, animation, positionYPct, ... }
  },
  music, audio, framing, branding
}
```

Why: the editor, the in-browser exporter and the ffmpeg worker all need the same edit. An operation log would force every consumer to replay it. A document is trivially cacheable, diffable, versionable and exportable.

**Rules**

- `version` is bumped only for breaking changes; migrations go in a `migrate(doc)` function (add one when needed).
- Timings are **milliseconds, integers**. Never seconds, never floats.
- Caption timings are on the **source media timeline**, not the programme timeline. Trimming changes the mapping, not the caption data. This is why re-trimming never destroys transcript alignment.

---

## 2. One line-breaker, three renderers

Choosing where a caption line wraps is the only place the three outputs could disagree. So it happens exactly once, in `src/lib/captions/layout.ts → buildLines()`.

```
                    buildLines(words, style)
        ┌───────────────────┼────────────────────┐
        ▼                   ▼                    ▼
CaptionLayer.tsx        caption-canvas.ts      ass.ts
(React preview)         (browser export)       (ffmpeg burn-in)
```

Each renderer implements the same geometry contract:

| Concept | Formula |
| --- | --- |
| Font size | `canvasWidth * style.fontScale / 100` |
| Anchor Y | `canvasHeight * style.positionYPct / 100` |
| Word gap | `fontSize * 0.24` |
| Stroke | `style.strokeScale * fontSize` |
| Shadow | `style.shadow * fontSize * 0.14` |

If you change one, change all three and update `tests/captions.test.ts`. Percentage-based sizing is what lets a single document render identically at 720p and 4K.

### Why `.ass` and not drawtext filters

ffmpeg's `subtitles` filter with an ASS file gives per-word styling, precise timing and font fallback in one shot. Generating a `drawtext` chain per word would produce a multi-megabyte filter graph and no line-layout engine.

### The per-word event trick

`ass.ts` emits **one Dialogue event per word**, each redrawing the whole line and only styling the active word. Plain `\k` karaoke tags cannot express a pill behind one word or a per-word scale punch. Cost: ~3× the events — irrelevant, ASS files are tiny.

---

## 3. Two storage backends, one interface

`src/lib/data/types.ts → ProjectStore` is the only way the UI touches data. Two implementations:

| | `LocalStore` | `CloudStore` |
| --- | --- | --- |
| Trigger | no Supabase env | Supabase env present |
| Projects | `localStorage` | Postgres + RLS |
| Media | IndexedDB blobs | Supabase Storage |
| Src token | `local:<fileId>` | `storage:<path>` |
| Resolution | object URL | 6-hour signed URL |

Src tokens are **indirections on purpose**: the document never contains a URL that expires. `resolveSrc()` mints a usable URL at load time; the document keeps the durable path. Saving a resolved URL into the document is the one bug that would silently break projects after a week.

---

## 4. Rendering

### In-browser (`src/lib/media/browser-render.ts`)

Canvas compositing + `MediaRecorder`, real time.

- The `<video>` element is fed into a `MediaStreamAudioDestinationNode` so audio is captured **without** playing through the speakers.
- Each frame: pad background → blurred/gradient backdrop (if selected) → fitted video frame → captions → watermark → progress bar.
- MP4 where the browser supports it (`avc1`), otherwise WEBM/VP9.

Trade-off: real time and tab-focus-sensitive, but zero infrastructure and instant for short social clips.

### Worker (`worker/index.mjs`)

1. Claim: `update renders set status='processing' where id=? and status='queued'` — atomic, so N workers never double-render.
2. Download the clips, the pre-built `captions.ass`, and the music bed.
3. One `filter_complex`: `trim/setpts` per clip → `scale`+`pad` to canvas → `concat` → `subtitles` → optional `volume` / `amix` / `loudnorm` → libx264 + AAC.
4. Upload to `renders/<id>.mp4`, mark done.

Captions are compiled in the **Next.js route** (`/api/render`), not in the worker, because the caption engine is TypeScript. The worker stays a dumb ffmpeg runner — easy to rewrite in Python or Go later.

---

## 5. Security model

- **RLS everywhere.** `projects` and `renders` policies are `auth.uid() = user_id`; a client cannot read another user's row even with the anon key.
- **Storage is folder-scoped.** Policies match `storage.foldername(name)[1] = auth.uid()`, so a signed URL is required and only the owner can mint one.
- **Service role is server-only.** Used in `/api/transcribe` and `/api/render`, and by the worker. It is never sent to the browser; `NEXT_PUBLIC_*` is the only prefix that leaks into the bundle.
- **Middleware** refreshes the session cookie and gates `/dashboard`, `/editor`, `/settings`. It is bypassed entirely in demo mode (nothing to protect).
- **API routes re-authenticate.** They never trust a `projectId` from the client — they re-read the row through the user's RLS-scoped client before doing anything privileged.

---

## 6. Failure modes and how they are handled

| Failure | Behaviour |
| --- | --- |
| No OpenAI key | Demo transcript, labelled in the transcript panel |
| File > 25 MB | `413` with an actionable message, not a stack trace |
| No worker | Export dialog explains setup; browser export still available |
| Render fails | `renders.error` holds ffmpeg's last stderr lines; project marked `failed` |
| Expired signed URL | `resolveSrc` re-mints on next load (cached for 6h) |
| Browser can't decode codec | Export error suggests the worker instead |
| localStorage quota | Thumbnails are dropped and the write retried |

---

## 7. What to build next, in dependency order

1. **Billing** (Stripe) — a product needs a paywall before a launch.
2. **Silence + filler cut** — operate on `captions.words`, produce a list of keep-ranges, feed them into the same `clips` array. The document model already supports it.
3. **Resumable uploads** — TUS, raise the cap, stop losing takes over 25 MB.
4. **Auto-reframe** — per-frame face box → crop keyframes → `crop` with `sendcmd` in the worker graph.
5. **B-roll** — a second `clips` layer with `overlay` in the filter graph.
6. **Public API** — export the `ProjectStore` contract as REST + API keys.
