import Link from "next/link";
import {
  ArrowRight,
  Captions,
  Crop,
  Download,
  FileVideo,
  Gauge,
  Layers,
  Mic2,
  Scissors,
  Sparkles,
  Upload,
  Wand2,
  Zap,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { PhoneDemo } from "@/components/marketing/PhoneDemo";
import { PresetGallery } from "@/components/marketing/PresetGallery";
import { env } from "@/lib/env";

const CTA_HREF = "/dashboard";

export default function LandingPage() {
  return (
    <main className="relative overflow-hidden">
      {/* ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10 rf-grid-bg opacity-60" />
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(201,249,80,0.14),transparent)] blur-2xl" />
      <div className="pointer-events-none absolute right-0 top-[30%] -z-10 h-[420px] w-[420px] rounded-full bg-[radial-gradient(closest-side,rgba(123,97,255,0.16),transparent)] blur-2xl" />

      <Nav />

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-16 pt-10 md:pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-ink-700 bg-ink-850/80 px-3 py-1.5 text-[11px] font-medium text-ink-300 backdrop-blur">
            <span className="rf-pulse h-1.5 w-1.5 rounded-full bg-lime-signal" />
            Public beta · free while we build
          </div>

          <h1 className="mt-6 text-[2.6rem] font-extrabold leading-[1.02] tracking-[-0.045em] text-ink-50 sm:text-6xl">
            Paste the raw clip.
            <br />
            <span className="rf-gradient-text">Get the finished video.</span>
          </h1>

          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-ink-300 sm:text-base">
            Reelforge turns one long take into a ready-to-post vertical video: word-level captions you can
            restyle in a click, auto reframe to 9:16, silence cuts, and a clean MP4 export. No timeline
            gymnastics. No $200/mo edit suite.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={CTA_HREF} className="rf-btn rf-btn-primary px-5 py-3 text-[15px]">
              Start editing free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="#how" className="rf-btn rf-btn-ghost px-5 py-3 text-[15px]">
              See how it works
            </Link>
          </div>

          <p className="mt-4 text-xs text-ink-500">
            No card. Works with MP4, MOV, WEBM up to 25&nbsp;MB per file
            {env.mode === "demo" ? " · running in demo mode right now" : ""}.
          </p>

          <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-ink-800 pt-6">
            {[
              ["~40s", "raw clip → captioned"],
              ["10", "caption presets"],
              ["1080p", "vertical export"],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="text-xl font-bold tracking-tight text-ink-50">{value}</dt>
                <dd className="mt-0.5 text-[11px] leading-tight text-ink-400">{label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <PhoneDemo />
      </section>

      {/* ── platform strip ─────────────────────────────────── */}
      <section className="border-y border-ink-800/80 bg-ink-950/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-5 py-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500">
          <span>Built for</span>
          <span>TikTok</span>
          <span>Instagram Reels</span>
          <span>YouTube Shorts</span>
          <span>LinkedIn</span>
          <span>X</span>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────── */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
        <SectionHeading
          eyebrow="How it works"
          title="Three steps. One coffee."
          sub="The editor is built around the transcript, not the frame. That is why it is fast."
        />

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Upload,
              step: "01",
              title: "Drop the raw clips",
              body: "Upload a take, a podcast, a screen recording. Reelforge reads duration, resolution and audio on upload.",
            },
            {
              icon: Wand2,
              step: "02",
              title: "Captions appear",
              body: "Transcription runs word-by-word. Pick a preset, tweak the colour, drag the position — it updates live.",
            },
            {
              icon: Download,
              step: "03",
              title: "Export and post",
              body: "Burn captions into a 9:16 MP4, or export in-browser. Your aspect ratio, your brand, no watermark on paid plans.",
            },
          ].map((item) => (
            <div key={item.step} className="rf-card group relative overflow-hidden p-6">
              <div className="absolute right-4 top-4 text-5xl font-black leading-none text-ink-800 transition-colors group-hover:text-ink-700">
                {item.step}
              </div>
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-ink-800 text-lime-signal ring-1 ring-ink-700">
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="text-[15px] font-semibold text-ink-50">{item.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-400">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Presets ────────────────────────────────────────── */}
      <section id="presets" className="scroll-mt-20 border-y border-ink-800/80 bg-ink-900/40 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHeading
            eyebrow="Caption styles"
            title="Ten presets that actually look like 2025"
            sub="Every one is a starting point, not a straitjacket. Fonts, weights, colours, stroke, position and animation are all yours."
          />
          <div className="mt-12">
            <PresetGallery />
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <SectionHeading
          eyebrow="Inside the editor"
          title="The parts you would otherwise pay five tools for"
          sub="A focused toolset instead of a 400-button NLE."
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Captions, title: "Word-level captions", body: "Transcription with per-word timings, so the highlight lands on the syllable you are speaking." },
            { icon: Scissors, title: "Cut by text", body: "Trim the clip on an in/out ruler. Deleting a sentence in the transcript is on the roadmap next." },
            { icon: Crop, title: "Auto reframe", body: "9:16, 4:5, 1:1 and 16:9 canvases with the same project — change aspect without redoing captions." },
            { icon: FileVideo, title: "Two export paths", body: "Browser export for a quick WEBM, or an ffmpeg worker for a burned-in MP4 with correct fonts." },
            { icon: Mic2, title: "Audio sweetening", body: "Clip gain, music bed with ducking, normalisation and voice boost — all optional per project." },
            { icon: Layers, title: "Real API + data model", body: "The edit is a versioned JSON document. Everything the UI does, an API can do later." },
          ].map((f) => (
            <div key={f.title} className="rf-card p-5 transition-colors hover:border-ink-600">
              <f.icon className="h-5 w-5 text-lime-signal" />
              <h3 className="mt-4 text-sm font-semibold text-ink-50">{f.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-400">{f.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rf-card flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
          <div className="flex items-start gap-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-lime-signal/15 text-lime-signal ring-1 ring-lime-signal/30">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink-50">Bring your own keys, own your stack</h3>
              <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-ink-400">
                Supabase for auth, storage and Postgres. OpenAI for transcription. You deploy it — you keep the
                data, the costs are yours at cost, and nothing is resold.
              </p>
            </div>
          </div>
          <Link href="/docs" className="rf-btn rf-btn-ghost shrink-0">
            Read the architecture
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────── */}
      <section id="pricing" className="scroll-mt-20 border-t border-ink-800/80 bg-ink-900/40 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHeading
            eyebrow="Pricing"
            title="Cheap enough to keep, serious enough to sell"
            sub="Founding pricing for the beta. Cancel any time."
          />

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {[
              {
                name: "Free",
                price: "$0",
                note: "forever",
                features: ["3 exports per month", "1080p vertical", "All 10 caption presets", "Reelforge watermark"],
                cta: "Start free",
                highlight: false,
              },
              {
                name: "Creator",
                price: "$19",
                note: "per month",
                features: ["Unlimited exports", "No watermark", "4K export", "Brand kit + logos", "Priority render queue"],
                cta: "Go Creator",
                highlight: true,
              },
              {
                name: "Studio",
                price: "$79",
                note: "per month",
                features: ["5 seats", "Everything in Creator", "API access", "Team presets", "Dedicated render worker"],
                cta: "Talk to us",
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={
                  plan.highlight
                    ? "relative rounded-2xl border border-lime-signal/40 bg-gradient-to-b from-lime-signal/[0.07] to-ink-850 p-6 shadow-[0_0_60px_-20px_rgba(201,249,80,0.35)]"
                    : "rf-card p-6"
                }
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-6 rounded-full bg-lime-signal px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-950">
                    Most popular
                  </span>
                )}
                <h3 className="text-sm font-semibold text-ink-50">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold tracking-tight text-ink-50">{plan.price}</span>
                  <span className="text-xs text-ink-400">{plan.note}</span>
                </div>
                <ul className="mt-5 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-ink-300">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime-signal" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={CTA_HREF}
                  className={`rf-btn mt-6 w-full ${plan.highlight ? "rf-btn-primary" : "rf-btn-ghost"}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-xs text-ink-500">
            Pricing is a placeholder until billing is wired — the product works today, checkout comes next.
          </p>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-24">
        <div className="relative overflow-hidden rounded-3xl border border-ink-700 bg-[radial-gradient(120%_120%_at_50%_-20%,rgba(201,249,80,0.12),transparent_60%)] p-10 text-center sm:p-16">
          <Gauge className="mx-auto h-8 w-8 text-lime-signal" />
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-ink-50 sm:text-4xl">
            Your next upload is already in your camera roll.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-ink-300">
            Drop it in, let the captions land, post it before the idea goes cold.
          </p>
          <Link href={CTA_HREF} className="rf-btn rf-btn-primary mx-auto mt-8 px-6 py-3 text-[15px]">
            Open the editor
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function SectionHeading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <div className="max-w-2xl">
      <p className="rf-label text-lime-signal">{eyebrow}</p>
      <h2 className="mt-3 text-[1.75rem] font-extrabold leading-[1.15] tracking-[-0.03em] text-ink-50 sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-sm leading-relaxed text-ink-400">{sub}</p>
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-800/70 bg-ink-950/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <Link href="/" aria-label="Reelforge home">
          <Logo />
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          {[
            ["How it works", "#how"],
            ["Captions", "#presets"],
            ["Pricing", "#pricing"],
            ["Docs", "/docs"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg px-3 py-2 text-[13px] font-medium text-ink-300 transition-colors hover:bg-ink-850 hover:text-ink-50"
            >
              {label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="rf-btn rf-btn-quiet hidden sm:inline-flex">
            Sign in
          </Link>
          <Link href={CTA_HREF} className="rf-btn rf-btn-primary">
            Start free
          </Link>
        </div>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-ink-800/80 bg-ink-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Logo size={26} />
          <p className="mt-3 max-w-xs text-xs leading-relaxed text-ink-500">
            AI video editing for people who post every day. Built with Next.js, Supabase and ffmpeg.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs text-ink-400">
          <Link href="/docs" className="hover:text-ink-100">Docs</Link>
          <Link href="/dashboard" className="hover:text-ink-100">Dashboard</Link>
          <Link href="/login" className="hover:text-ink-100">Sign in</Link>
          <a href="https://github.com/frRitamDas/UNKNOWNPLATFORM" className="hover:text-ink-100">GitHub</a>
        </div>
      </div>
      <div className="border-t border-ink-800/60 px-5 py-4 text-center text-[11px] text-ink-600">
        © {new Date().getFullYear()} Reelforge. All rights reserved.
      </div>
    </footer>
  );
}
