import Link from "next/link";
import {
  ArrowRight,
  Captions,
  Check,
  Crop,
  Download,
  Film,
  Gauge,
  Layers,
  Scissors,
  Sparkles,
  Upload,
  Wand2,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { MarketingComposer, MarketingStyles } from "@/components/marketing/LightShowcase";
import { env } from "@/lib/env";

const CTA = "/dashboard";

export default function LandingPage() {
  return (
    <main className="mkt-shell relative min-h-dvh">
      {/* pastel ambience — clipped in its own layer so the nav can stay sticky */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="mkt-blob -left-32 top-10 h-[420px] w-[420px] bg-[rgba(255,176,120,0.5)]" />
        <div className="mkt-blob -right-24 top-24 h-[460px] w-[460px] bg-[rgba(140,205,255,0.45)]" />
        <div className="mkt-blob left-1/3 top-[520px] h-[380px] w-[380px] bg-[rgba(255,214,150,0.4)]" />
        <div className="absolute inset-0 rf-noise" />
      </div>

      <div className="relative">
        <Nav />

        {/* ── hero ─────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 pb-8 pt-10 sm:pt-14">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-cream-900/10 bg-white/70 px-3 py-1.5 text-[11.5px] font-medium text-cream-700">
              <span className="h-1.5 w-1.5 rounded-full bg-ember" />
              Public beta · free while we build
            </span>
            <h1 className="rf-serif mt-6 text-[2.6rem] leading-[1.05] text-cream-900 sm:text-6xl lg:text-[4.2rem]">
              Raw footage in.
              <br />
              Ready-to-post out.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[14.5px] leading-relaxed text-cream-700">
              Drop one long take. Reelforge finds the words, cuts the dead air, burns in captions you can restyle in a
              click, and hands you a vertical video that is ready to post.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={CTA}
                className="inline-flex items-center gap-2 rounded-full bg-cream-900 px-5 py-3 text-[13.5px] font-semibold text-cream-50 transition-transform hover:-translate-y-0.5"
              >
                Start editing free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#styles"
                className="inline-flex items-center gap-2 rounded-full border border-cream-900/12 bg-white/70 px-5 py-3 text-[13.5px] font-medium text-cream-900 hover:bg-white"
              >
                See the styles
              </Link>
            </div>
            <p className="mt-4 text-[11.5px] text-cream-700/70">
              No card · MP4, MOV, WEBM{env.mode === "demo" ? " · running in demo mode right now" : ""}
            </p>
          </div>

          <div className="mt-10">
            <MarketingComposer />
          </div>

          <div id="styles" className="mx-auto mt-10 max-w-6xl scroll-mt-28">
            <MarketingStyles />
          </div>
        </section>

        {/* ── statement ────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 py-16 text-center">
          <h2 className="rf-serif mx-auto max-w-3xl text-[2.2rem] leading-[1.1] text-cream-900 sm:text-5xl">
            Make better videos, in minutes.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[13.5px] leading-relaxed text-cream-700">
            A focused toolset instead of a 400-button timeline. The parts you would otherwise pay five tools for.
          </p>

          <div className="mt-10 grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Captions, title: "Word-level captions", body: "Per-word timings so the highlight lands on the syllable being spoken — not a line every four seconds." },
              { icon: Scissors, title: "Cut by text", body: "The edit is a document, so trimming and re-styling never destroys your transcript alignment." },
              { icon: Crop, title: "Every aspect", body: "9:16, 4:5, 1:1 and 16:9 from one project. Captions rescale because they are sized in percentages." },
              { icon: Film, title: "Two export paths", body: "Export right in the browser, or send it to an ffmpeg worker for a fast, font-perfect MP4." },
              { icon: Layers, title: "Ten real presets", body: "Hormozi, karaoke pop, boxed, editorial — every one is a starting point you can dial in." },
              { icon: Gauge, title: "Built to scale", body: "Supabase auth, storage and Postgres behind row-level security. Your data stays yours." },
            ].map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-cream-900/8 bg-white/60 p-5 transition-colors hover:bg-white/85">
                <feature.icon className="h-4 w-4 text-ember-deep" />
                <h3 className="mt-3 text-[13.5px] font-semibold text-cream-900">{feature.title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-cream-700">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── how it works ─────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 pb-16">
          <div className="rounded-3xl border border-cream-900/8 bg-white/55 p-6 sm:p-10">
            <h2 className="rf-serif text-2xl text-cream-900 sm:text-3xl">Three steps, one coffee.</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {[
                { icon: Upload, step: "01", title: "Drop the clip", body: "Reelforge reads duration, resolution and audio on upload." },
                { icon: Wand2, step: "02", title: "Captions appear", body: "Transcription runs word by word. Pick a preset, tweak colours, drag the position." },
                { icon: Download, step: "03", title: "Export and post", body: "A 9:16 MP4 with captions burned in. No watermark on paid plans." },
              ].map((item) => (
                <div key={item.step}>
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-cream-700/70">
                    <item.icon className="h-3.5 w-3.5" /> Step {item.step}
                  </div>
                  <h3 className="mt-2 text-[14px] font-semibold text-cream-900">{item.title}</h3>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-cream-700">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── pricing ──────────────────────────────────────── */}
        <section id="pricing" className="mx-auto max-w-6xl scroll-mt-28 px-5 pb-16">
          <div className="text-center">
            <h2 className="rf-serif text-2xl text-cream-900 sm:text-4xl">Pricing that starts at free</h2>
            <p className="mt-2 text-[13px] text-cream-700">Founding pricing during the beta. Cancel any time.</p>
          </div>
          <div className="mt-8 grid gap-3 lg:grid-cols-3">
            {[
              { name: "Free", price: "$0", blurb: "post this week", features: ["3 exports / month", "1080p vertical", "All 10 caption presets", "Browser export"], highlight: false },
              { name: "Creator", price: "$19", blurb: "per month", features: ["Unlimited exports", "Server MP4 renders", "4K, no watermark", "Brand kit + music beds"], highlight: true },
              { name: "Studio", price: "$79", blurb: "per month", features: ["5 seats", "API access", "Shared presets", "Priority render queue"], highlight: false },
            ].map((plan) => (
              <div
                key={plan.name}
                className={
                  plan.highlight
                    ? "relative rounded-3xl border border-ember/40 bg-gradient-to-b from-ember/10 to-white/70 p-6"
                    : "rounded-3xl border border-cream-900/8 bg-white/60 p-6"
                }
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-6 rounded-full bg-ember px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cream-900">
                    Most popular
                  </span>
                )}
                <h3 className="text-[13.5px] font-semibold text-cream-900">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold tracking-tight text-cream-900">{plan.price}</span>
                  <span className="text-[11.5px] text-cream-700">{plan.blurb}</span>
                </div>
                <ul className="mt-4 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-[12.5px] text-cream-700">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ember-deep" /> {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={CTA}
                  className={
                    plan.highlight
                      ? "mt-5 flex w-full items-center justify-center rounded-full bg-cream-900 py-2.5 text-[12.5px] font-semibold text-cream-50 hover:bg-cream-900/90"
                      : "mt-5 flex w-full items-center justify-center rounded-full border border-cream-900/12 bg-white/70 py-2.5 text-[12.5px] font-semibold text-cream-900 hover:bg-white"
                  }
                >
                  {plan.name === "Studio" ? "Talk to us" : "Start free"}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-[11px] text-cream-700/70">
            Checkout is not wired yet — the editor works today, billing lands next.
          </p>
        </section>

        {/* ── close ────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 pb-20">
          <div className="relative overflow-hidden rounded-3xl bg-cream-900 px-6 py-14 text-center">
            <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(255,161,76,0.55),transparent)] blur-2xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(62,198,245,0.45),transparent)] blur-2xl" />
            <Sparkles className="relative mx-auto h-6 w-6 text-ember" />
            <h2 className="rf-serif relative mx-auto mt-4 max-w-2xl text-3xl leading-tight text-cream-50 sm:text-4xl">
              Your next upload is already in your camera roll.
            </h2>
            <Link
              href={CTA}
              className="relative mt-7 inline-flex items-center gap-2 rounded-full bg-cream-50 px-5 py-3 text-[13.5px] font-semibold text-cream-900 transition-transform hover:-translate-y-0.5"
            >
              Open the editor <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <Footer />
      </div>
    </main>
  );
}

function Nav() {
  return (
    <header className="sticky top-4 z-40 mx-auto max-w-6xl px-4">
      <nav className="mkt-pill-nav flex items-center justify-between gap-3 rounded-full px-4 py-2.5">
        <Link href="/" aria-label="Reelforge home">
          <Logo size={26} tone="dark" />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {[
            ["Features", "#styles"],
            ["Styles", "#styles"],
            ["Pricing", "#pricing"],
            ["Docs", "/docs"],
          ].map(([label, href]) => (
            <Link
              key={label}
              href={href}
              className="rounded-full px-3 py-1.5 text-[12.5px] font-medium text-cream-700 transition-colors hover:bg-cream-900/5 hover:text-cream-900"
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden px-3 py-1.5 text-[12.5px] font-medium text-cream-700 hover:text-cream-900 sm:block">
            Log in
          </Link>
          <Link
            href={CTA}
            className="rounded-full bg-cream-900 px-4 py-2 text-[12.5px] font-semibold text-cream-50 transition-transform hover:-translate-y-0.5"
          >
            Sign up
          </Link>
        </div>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-cream-900/8 bg-white/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Logo size={24} tone="dark" />
          <p className="mt-3 max-w-xs text-[11.5px] leading-relaxed text-cream-700/80">
            AI video editing for people who post every day. Built with Next.js, Supabase and ffmpeg.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-7 gap-y-2 text-[12px] text-cream-700">
          <Link href="/docs" className="hover:text-cream-900">Docs</Link>
          <Link href="/dashboard" className="hover:text-cream-900">Editor</Link>
          <Link href="/login" className="hover:text-cream-900">Log in</Link>
          <a href="https://github.com/frRitamDas/UNKNOWNPLATFORM" className="hover:text-cream-900">GitHub</a>
        </div>
      </div>
      <div className="border-t border-cream-900/8 px-5 py-4 text-center text-[11px] text-cream-700/60">
        © {new Date().getFullYear()} Reelforge. All rights reserved.
      </div>
    </footer>
  );
}
