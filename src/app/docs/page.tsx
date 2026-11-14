import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Boxes, CheckCircle2, CircleDashed, Database, Film, Rocket, Server, Terminal } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export const metadata: Metadata = {
  title: "Docs & launch guide",
  description: "How Reelforge is built, what runs where, and the exact steps to deploy it globally.",
};

const SECTIONS = [
  { id: "status", label: "What works today" },
  { id: "quickstart", label: "Quick start" },
  { id: "architecture", label: "Architecture" },
  { id: "config", label: "Configuration" },
  { id: "database", label: "Database & storage" },
  { id: "worker", label: "Render worker" },
  { id: "captions", label: "Caption engine" },
  { id: "api", label: "API surface" },
  { id: "deploy", label: "Deploy to Vercel" },
  { id: "roadmap", label: "Roadmap to launch" },
];

export default function DocsPage() {
  return (
    <main className="min-h-dvh bg-ink-950">
      <header className="sticky top-0 z-40 border-b border-ink-800/80 bg-ink-950/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link href="/" className="flex items-center gap-3">
            <Logo size={26} />
          </Link>
          <Link href="/dashboard" className="rf-btn rf-btn-primary h-8 text-xs">
            Open the editor <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-10 px-5 py-10">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24">
            <p className="rf-label mb-3">On this page</p>
            <nav className="space-y-1">
              {SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="block rounded-md px-2 py-1.5 text-[12.5px] text-ink-400 transition-colors hover:bg-ink-850 hover:text-ink-100"
                >
                  {section.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <article className="min-w-0 flex-1">
          <p className="rf-label text-lime-signal">Documentation</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.04em] text-ink-50">Build notes & launch guide</h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-300">
            Reelforge is a complete, deployable AI editing platform skeleton: paste a raw clip, get captions, style
            them, export a finished vertical video. This page is the honest map — what is finished, what needs a key,
            and the order to wire it up.
          </p>

          <Section id="status" title="What works today" icon={CheckCircle2}>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Upload + project storage", "Browser (IndexedDB) in demo mode, Supabase Storage in cloud mode."],
                ["Word-level caption engine", "Ten presets, full style control, three renderers kept in sync."],
                ["Live preview", "Real-time karaoke highlight, scrub, trim, aspect switching."],
                ["Transcript editing", "Fix a line, retime it, or paste a script and auto-time it."],
                ["In-browser export", "Canvas + MediaRecorder → MP4 or WEBM download, no server."],
                ["Server MP4 export", "Queue + ffmpeg worker that burns the .ass caption track."],
              ].map(([title, body]) => (
                <div key={title} className="rf-card p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-lime-signal" />
                    <div>
                      <p className="text-[13px] font-semibold text-ink-100">{title}</p>
                      <p className="mt-1 text-[12px] leading-relaxed text-ink-400">{body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rf-card p-4">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-400">Not built yet</p>
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {[
                  "Billing / Stripe checkout",
                  "Silence + filler-word auto-cut",
                  "Face-tracking auto reframe",
                  "B-roll and stock library",
                  "Team workspaces",
                  "Public API keys + webhooks",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-[12.5px] text-ink-400">
                    <CircleDashed className="h-3.5 w-3.5 text-ink-600" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </Section>

          <Section id="quickstart" title="Quick start" icon={Terminal}>
            <p className="text-[13.5px] leading-relaxed text-ink-300">
              The app runs with zero configuration. In that mode projects live in your browser and captions come from a
              demo transcript scaled to the clip duration — useful for design work and demos, not for real footage.
            </p>
            <Code>{`git clone https://github.com/frRitamDas/UNKNOWNPLATFORM.git
cd UNKNOWNPLATFORM
npm install
npm run dev        # http://localhost:3000  → works immediately in demo mode`}</Code>
            <p className="text-[13.5px] leading-relaxed text-ink-300">Then, to switch on the real stack:</p>
            <Code>{`cp .env.example .env.local   # paste your Supabase keys
npm run db:setup            # checks tables, creates the storage bucket`}</Code>
          </Section>

          <Section id="architecture" title="Architecture" icon={Boxes}>
            <p className="text-[13.5px] leading-relaxed text-ink-300">
              One Next.js app, one Postgres database, one optional worker. The edit itself is a versioned JSON document
              (<code className="rounded bg-ink-800 px-1 py-0.5 text-[12px]">ProjectDoc</code>), which is why the UI, the
              API and the worker can all read the same state without stepping on each other.
            </p>
            <Code>{`Browser (Next.js client components)
  │  editor UI, live preview, in-browser export (canvas + MediaRecorder)
  │
  ├── Supabase Auth        session cookies, OAuth, magic links
  ├── Supabase Postgres    projects.doc (jsonb), renders queue, profiles
  ├── Supabase Storage     private bucket "media", path <user>/<project>/<file>
  │
  └── /api/transcribe ──►  OpenAI Whisper (word timestamps)
      /api/render     ──►  renders row + captions.ass uploaded
                                │
                                ▼
                          worker/index.mjs
                          polls queue → ffmpeg → uploads MP4`}</Code>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {[
                [Database, "State", "Postgres holds the document. Nothing is rendered from screenshots of the UI."],
                [Server, "Queue", "A plain table polled by the worker. No extra infra, easy to replace with SQS or pgmq."],
                [Film, "Render", "ffmpeg composes clips, burns .ass captions, mixes audio, uploads MP4."],
              ].map(([Icon, title, body]) => {
                const Component = Icon as typeof Database;
                return (
                  <div key={title as string} className="rf-card p-4">
                    <Component className="h-4 w-4 text-lime-signal" />
                    <p className="mt-2 text-[12.5px] font-semibold text-ink-100">{title as string}</p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-ink-400">{body as string}</p>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section id="config" title="Configuration" icon={SettingsIcon}>
            <div className="overflow-hidden rounded-xl border border-ink-800">
              <table className="w-full text-left text-[12.5px]">
                <thead className="bg-ink-900 text-ink-400">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Variable</th>
                    <th className="px-3 py-2 font-semibold">Required for</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-800">
                  {[
                    ["NEXT_PUBLIC_SUPABASE_URL", "Accounts, cloud projects, storage"],
                    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "Same — safe to expose (RLS protects rows)"],
                    ["SUPABASE_SERVICE_ROLE_KEY", "Server transcription, render queue (never expose)"],
                    ["OPENAI_API_KEY", "Real Whisper transcription"],
                    ["RENDER_WORKER_SECRET", "Flags server export as available"],
                    ["FFMPEG_PATH", "Worker, if ffmpeg is not on PATH"],
                    ["NEXT_PUBLIC_APP_URL", "Metadata URLs, OAuth redirects"],
                  ].map(([name, use]) => (
                    <tr key={name}>
                      <td className="px-3 py-2 font-mono text-[11.5px] text-lime-signal/90">{name}</td>
                      <td className="px-3 py-2 text-ink-300">{use}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="database" title="Database & storage" icon={Database}>
            <p className="text-[13.5px] leading-relaxed text-ink-300">
              Create a Supabase project, then run the migration once in the SQL editor. It is idempotent — safe to
              re-run after edits.
            </p>
            <Code>{`-- Supabase dashboard → SQL Editor → paste:
supabase/migrations/0001_init.sql`}</Code>
            <p className="text-[13.5px] leading-relaxed text-ink-300">
              It creates <code className="rounded bg-ink-800 px-1 py-0.5 text-[12px]">profiles</code>,{" "}
              <code className="rounded bg-ink-800 px-1 py-0.5 text-[12px]">projects</code>,{" "}
              <code className="rounded bg-ink-800 px-1 py-0.5 text-[12px]">renders</code>, row-level-security policies
              for all three, a signup trigger, and the private{" "}
              <code className="rounded bg-ink-800 px-1 py-0.5 text-[12px]">media</code> bucket with folder-scoped
              policies. Users can only ever touch <code className="rounded bg-ink-800 px-1 py-0.5 text-[12px]">&lt;their-uid&gt;/…</code>.
            </p>
          </Section>

          <Section id="worker" title="Render worker" icon={Server}>
            <p className="text-[13.5px] leading-relaxed text-ink-300">
              Vercel functions cannot run long ffmpeg jobs, so rendering lives in a worker you host anywhere. Browser
              export works without it, but the worker is what gives you fast, watermark-free, font-perfect MP4s.
            </p>
            <Code>{`# local
npm i -D ffmpeg-static
SUPABASE_URL=https://xxx.supabase.co \\
SUPABASE_SERVICE_ROLE_KEY=... \\
npm run worker

# container (Fly.io / Railway / Render / VPS)
docker build -f worker/Dockerfile -t reelforge-worker .
docker run --env-file .env reelforge-worker`}</Code>
            <p className="text-[13.5px] leading-relaxed text-ink-300">
              Install the fonts your presets use (the Dockerfile already does: Inter, DejaVu, Liberation, Noto).
              Otherwise burned-in captions fall back to a different typeface than the preview.
            </p>
          </Section>

          <Section id="captions" title="Caption engine" icon={Film}>
            <p className="text-[13.5px] leading-relaxed text-ink-300">
              Three renderers share one line-breaking function, so the preview, the canvas export and the ffmpeg export
              cannot disagree about where a line wraps:
            </p>
            <Code>{`src/lib/captions/layout.ts   buildLines() — the shared truth
src/components/captions/CaptionLayer.tsx   React preview
src/lib/media/caption-canvas.ts            canvas (browser export)
src/lib/captions/ass.ts                     .ass for ffmpeg`}</Code>
            <p className="text-[13.5px] leading-relaxed text-ink-300">
              All sizing is expressed as a percentage of canvas width, so the same document renders correctly at 720p,
              1080p and 4K.
            </p>
          </Section>

          <Section id="api" title="API surface" icon={Server}>
            <div className="overflow-hidden rounded-xl border border-ink-800">
              <table className="w-full text-left text-[12.5px]">
                <thead className="bg-ink-900 text-ink-400">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Endpoint</th>
                    <th className="px-3 py-2 font-semibold">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-800">
                  {[
                    ["POST /api/transcribe", "Whisper word timings for a project's first clip"],
                    ["POST /api/render", "Queue an ffmpeg render, compile the .ass caption track"],
                    ["GET  /api/render?id=", "Poll status, mint a signed MP4 URL"],
                    ["GET  /auth/callback", "OAuth / magic-link code exchange"],
                  ].map(([endpoint, purpose]) => (
                    <tr key={endpoint}>
                      <td className="px-3 py-2 font-mono text-[11.5px] text-lime-signal/90">{endpoint}</td>
                      <td className="px-3 py-2 text-ink-300">{purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink-400">
              Project CRUD happens over the Supabase client with RLS rather than through custom routes — fewer moving
              parts and the policies are the security boundary.
            </p>
          </Section>

          <Section id="deploy" title="Deploy to Vercel" icon={Rocket}>
            <Code>{`# 1. push the repo, then import it at vercel.com/new
# 2. add environment variables (Project → Settings → Environment Variables)
NEXT_PUBLIC_APP_URL=https://videoeditingai.vercel.app
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
RENDER_WORKER_SECRET=...

# 3. deploy
vercel --prod`}</Code>
            <p className="text-[13.5px] leading-relaxed text-ink-300">
              Then in Supabase → Authentication → URL Configuration, set the Site URL to{" "}
              <code className="rounded bg-ink-800 px-1 py-0.5 text-[12px]">https://videoeditingai.vercel.app</code> and
              add <code className="rounded bg-ink-800 px-1 py-0.5 text-[12px]">/auth/callback</code> as a redirect URL.
              Without that, OAuth and magic links bounce.
            </p>
            <div className="mt-3 rounded-xl border border-amber-signal/30 bg-amber-signal/[0.07] p-4">
              <p className="text-[12.5px] font-semibold text-amber-signal">Vercel limits to respect</p>
              <ul className="mt-1.5 space-y-1 text-[12px] leading-relaxed text-ink-300">
                <li>· Request body limit: 4.5 MB on the free tier — uploads go straight to Supabase Storage, not through a route.</li>
                <li>· Function duration: 60 s max on Hobby — never render video in a function; use the worker.</li>
                <li>· Large uploads: raise the bucket limit and switch to Supabase resumable uploads (TUS) before launch.</li>
              </ul>
            </div>
          </Section>

          <Section id="roadmap" title="Roadmap to launch" icon={Rocket}>
            <ol className="space-y-3">
              {[
                ["Wire Supabase", "Migration + keys. Accounts, cloud projects and uploads go live."],
                ["Add the OpenAI key", "Real word-level captions replace the demo transcript."],
                ["Ship the worker", "Docker container on Fly.io or Railway with a small always-on instance."],
                ["Set auth redirects", "Site URL + callback URLs so login works on the custom domain."],
                ["Raise upload limits", "Switch to resumable uploads and a 500 MB bucket limit for real footage."],
                ["Add billing", "Stripe Checkout + a usage table; gate exports by plan."],
                ["Add auto-cut", "Remove silences and filler words from the transcript, then re-map timings."],
                ["Add auto-reframe", "Face detection per frame → crop keyframes in the render graph."],
              ].map(([title, body], index) => (
                <li key={title as string} className="flex gap-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-ink-700 bg-ink-850 text-[11px] font-bold text-lime-signal">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-ink-100">{title as string}</p>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-400">{body as string}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ink-800 bg-ink-900/50 p-5">
            <div>
              <p className="text-[13px] font-semibold text-ink-100">Ready to try it?</p>
              <p className="mt-0.5 text-[12px] text-ink-400">The editor works right now, even in demo mode.</p>
            </div>
            <Link href="/dashboard" className="rf-btn rf-btn-primary">
              Open the editor <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <Link href="/" className="mt-8 inline-flex items-center gap-1.5 text-[12.5px] text-ink-400 hover:text-ink-100">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
        </article>
      </div>
    </main>
  );
}

function Section({
  id,
  title,
  icon: Icon,
  children,
}: {
  id: string;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-14 scroll-mt-24">
      <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-ink-50">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink-850 ring-1 ring-ink-700">
          <Icon className="h-3.5 w-3.5 text-lime-signal" />
        </span>
        {title}
      </h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="rf-scroll-thin overflow-x-auto rounded-xl border border-ink-800 bg-ink-900/80 p-4 text-[11.5px] leading-relaxed text-ink-200">
      <code>{children}</code>
    </pre>
  );
}

function SettingsIcon(props: React.ComponentProps<typeof Server>) {
  return <Server {...props} />;
}
