"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { LogoMark } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";

type Cycle = "monthly" | "yearly";

const PLANS = [
  {
    id: "free",
    name: "Free",
    badge: null as string | null,
    monthly: 0,
    yearly: 0,
    blurb: "Everything you need to post this week.",
    features: [
      "3 exports per month",
      "1080p vertical, square or landscape",
      "All 10 caption presets",
      "Browser export, no watermark on shorts",
    ],
    cta: "Start free",
    accent: "muted" as const,
  },
  {
    id: "creator",
    name: "Creator",
    badge: "Recommended",
    monthly: 19,
    yearly: 13.3,
    blurb: "For people posting every single day.",
    features: [
      "Unlimited exports",
      "Server MP4 renders, faster than realtime",
      "4K export + no watermark",
      "Brand kit, music beds, progress bars",
    ],
    cta: "Start free trial",
    accent: "ember" as const,
  },
  {
    id: "studio",
    name: "Studio",
    badge: null,
    monthly: null,
    yearly: null,
    blurb: "Teams, agencies and in-house content ops.",
    features: [
      "5 seats included",
      "Shared presets and brand templates",
      "API access + webhooks",
      "Priority render queue",
    ],
    cta: "Talk to us",
    accent: "mint" as const,
  },
];

export function PricingModal({ onClose }: { onClose: () => void }) {
  const [cycle, setCycle] = useState<Cycle>("yearly");
  const [noted, setNoted] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] overflow-y-auto bg-black/70 px-4 py-10 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Plans and pricing"
    >
      <div className="mx-auto w-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-8 text-center">
          <button
            onClick={onClose}
            className="float-right grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-app-300 hover:bg-white/10 hover:text-white"
            aria-label="Close pricing"
          >
            <X className="h-4 w-4" />
          </button>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Plans and pricing</h2>
          <p className="mt-2 text-sm text-app-300">Create polished videos in minutes.</p>

          <div className="mt-5 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
            {(
              [
                ["monthly", "Monthly"],
                ["yearly", "Yearly · 2 months free"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setCycle(value)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors",
                  cycle === value ? "bg-white text-app-950" : "text-app-300 hover:text-white",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-app-400">* Listed prices are in USD. Billing opens after beta.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((plan) => {
            const price = cycle === "yearly" ? plan.yearly : plan.monthly;
            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-3xl border p-5",
                  plan.accent === "ember"
                    ? "border-ember/40 bg-gradient-to-b from-ember/[0.12] to-app-850"
                    : "border-white/10 bg-app-850",
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-[12px] font-semibold text-app-950",
                      plan.accent === "ember" && "bg-ember",
                      plan.accent === "mint" && "bg-mint",
                      plan.accent === "muted" && "bg-app-200",
                    )}
                  >
                    {plan.name}
                  </span>
                  {plan.badge && <span className="text-[11px] font-semibold text-ember">{plan.badge}</span>}
                </div>

                <div className="mt-4 flex items-baseline gap-1.5">
                  {price === null ? (
                    <span className="text-2xl font-bold text-white">Custom pricing</span>
                  ) : (
                    <>
                      {cycle === "yearly" && plan.monthly !== null && plan.monthly > 0 && (
                        <span className="mr-1 text-sm text-app-500 line-through">${plan.monthly}</span>
                      )}
                      <span className="text-3xl font-bold tracking-tight text-white">
                        ${price % 1 === 0 ? price : price.toFixed(2)}
                      </span>
                      <span className="text-xs text-app-400">/mo*</span>
                    </>
                  )}
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-app-300">{plan.blurb}</p>

                <ul className="mt-4 flex-1 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-[12.5px] text-app-200">
                      <Check
                        className={cn(
                          "mt-0.5 h-3.5 w-3.5 shrink-0",
                          plan.accent === "ember" ? "text-ember" : "text-app-300",
                        )}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => {
                    if (plan.id === "free") return onClose();
                    setNoted(plan.id);
                  }}
                  className={cn(
                    "mt-5 w-full rounded-xl py-2.5 text-[13px] font-semibold transition-colors",
                    plan.accent === "ember"
                      ? "bg-ember text-app-950 hover:bg-ember-soft"
                      : "border border-white/10 bg-white/5 text-white hover:bg-white/10",
                  )}
                >
                  {noted === plan.id ? "We'll email you at launch" : plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-app-400">
          <LogoMark size={16} />
          No card required during beta. Cancel any time.
        </div>
      </div>
    </div>
  );
}


/* ─────────────────────────────────────────────────────────────
   Founding-offer interstitial (opened from the sidebar offer card)
   ───────────────────────────────────────────────────────────── */
const OFFER_ENDS = new Date("2026-12-01T00:00:00Z").getTime();

function useOfferClock() {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(OFFER_ENDS - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  if (left === null) return "--:--";
  if (left <= 0) return "00:00";
  const totalMinutes = Math.floor(left / 60000);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (totalMinutes >= 1440) return `${Math.floor(totalMinutes / 1440)}d ${pad(Math.floor((totalMinutes % 1440) / 60))}h`;
  return `${pad(Math.floor(totalMinutes / 60))}:${pad(totalMinutes % 60)}`;
}

export function OfferModal({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  const clock = useOfferClock();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onDecline();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDecline]);

  return (
    <div
      className="fixed inset-0 z-[75] grid place-items-center bg-black/75 px-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Founding member offer"
      onClick={onDecline}
    >
      <div
        className="relative w-full max-w-[380px] overflow-hidden rounded-2xl border border-white/10 bg-app-850 p-6 text-center"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-64 -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,161,76,0.35),transparent)] blur-2xl" />

        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ember/40 bg-ember/10 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ember">
            <LogoMark size={13} /> Founding member
          </span>

          <h2 className="mt-4 text-[1.35rem] font-semibold leading-tight tracking-[-0.02em] text-white">
            50% off Creator,
            <br />
            for 12 months.
          </h2>

          <div className="mt-4 flex items-baseline justify-center gap-2">
            <span className="text-sm text-app-500 line-through">$19</span>
            <span className="text-[2.1rem] font-bold leading-none tracking-tight text-white">$9.50</span>
            <span className="text-[12px] text-app-400">/mo</span>
          </div>

          <p className="mt-3 text-[11.5px] leading-relaxed text-app-400">
            Unlimited exports, server MP4 renders and no watermark. Billing opens at the end of the beta — this
            reserves the price.
          </p>

          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-app-400">
            offer ends in <span className="text-ember">{clock}</span>
          </p>

          <button onClick={onAccept} className="rf-btn rf-btn-primary mt-4 w-full py-3 text-[13px]">
            Try it for $9.50/mo
          </button>
          <button onClick={onDecline} className="mt-1 w-full py-2 text-[12px] font-medium text-app-300 hover:text-white">
            Decline offer
          </button>
        </div>
      </div>
    </div>
  );
}
