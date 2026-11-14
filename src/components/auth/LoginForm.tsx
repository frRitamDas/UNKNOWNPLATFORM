"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { LogoMark } from "@/components/ui/Logo";
import { getSupabaseBrowser } from "@/lib/supabase/client";

type Mode = "magic" | "password";

export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  const [mode, setMode] = useState<Mode>("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  async function submitEmail(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Accounts need Supabase keys. You can still explore the demo workspace below.");
      return;
    }
    if (!emailValid) {
      setError("Enter a valid email address.");
      return;
    }

    setBusy("email");
    try {
      if (mode === "magic") {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (otpError) throw otpError;
        setNotice("Check your inbox — your sign-in link is on the way.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (!signInError) {
          router.push(next);
          router.refresh();
          return;
        }
        // No account yet? Create one with the same credentials.
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (signUpError) throw signInError;
        if (data.session) {
          router.push(next);
          router.refresh();
        } else {
          setNotice("Account created — confirm your email, then sign in.");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  async function oauth(provider: "google" | "azure" | "apple") {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Add Supabase keys to enable social sign-in.");
      return;
    }
    setBusy(provider);
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        ...(provider === "azure" ? { scopes: "email openid profile" } : {}),
      },
    });
    if (oauthError) {
      setError(
        `${provider === "azure" ? "Microsoft" : provider === "apple" ? "Apple" : "Google"} sign-in is not enabled in this Supabase project yet.`,
      );
      setBusy(null);
    }
  }

  return (
    <div className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-app-950 px-5 py-12">
      {/* ambient glows, bottom-left warm / bottom-right cool */}
      <div className="pointer-events-none absolute -bottom-40 -left-32 h-[420px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(255,140,60,0.5),transparent)] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -right-32 h-[460px] w-[560px] rounded-full bg-[radial-gradient(closest-side,rgba(62,198,245,0.35),transparent)] blur-3xl" />
      <div className="pointer-events-none absolute inset-0 rf-noise" />

      <div className="relative w-full max-w-[400px]">
        <div className="flex flex-col items-center">
          <Link href="/" aria-label="Reelforge home">
            <LogoMark size={54} />
          </Link>
          <h1 className="mt-4 text-[1.6rem] font-semibold tracking-[-0.02em] text-white">Welcome to Reelforge</h1>
        </div>

        <form
          onSubmit={submitEmail}
          className="mt-7 rounded-2xl border border-white/8 bg-app-850/90 p-5 shadow-[0_40px_80px_-50px_rgba(0,0,0,1)] backdrop-blur"
        >
          <label htmlFor="email" className="text-[12px] font-semibold text-app-100">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Your email address"
            className="mt-1.5 w-full rounded-lg border border-white/8 bg-white/[0.04] px-3 py-2.5 text-[13.5px] text-white outline-none transition-colors placeholder:text-app-500 focus:border-white/25 focus:bg-white/[0.06]"
          />

          {mode === "password" && (
            <input
              type="password"
              autoComplete="current-password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
              className="mt-2 w-full rounded-lg border border-white/8 bg-white/[0.04] px-3 py-2.5 text-[13.5px] text-white outline-none transition-colors placeholder:text-app-500 focus:border-white/25 focus:bg-white/[0.06]"
            />
          )}

          <button
            type="submit"
            disabled={!configured || !emailValid || busy !== null}
            className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy === "email" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {mode === "magic" ? "Continue with email" : "Continue"}
          </button>

          {error && <p className="mt-2.5 text-[11.5px] leading-snug text-rose-signal">{error}</p>}
          {notice && <p className="mt-2.5 text-[11.5px] leading-snug text-mint">{notice}</p>}

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/10" />
            <span className="text-[10.5px] uppercase tracking-[0.14em] text-app-500">or</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <div className="space-y-2">
            <ProviderButton label="Continue with Google" icon={<GoogleIcon />} onClick={() => void oauth("google")} busy={busy === "google"} />
            <ProviderButton label="Continue with Microsoft" icon={<MicrosoftIcon />} onClick={() => void oauth("azure")} busy={busy === "azure"} />
            <ProviderButton label="Continue with Apple" icon={<AppleIcon />} onClick={() => void oauth("apple")} busy={busy === "apple"} />
          </div>

          <div className="mt-2.5">
            <button
              type="button"
              onClick={() => {
                setMode(mode === "magic" ? "password" : "magic");
                setError(null);
                setNotice(null);
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] py-2.5 text-[12.5px] font-medium text-app-100 transition-colors hover:bg-white/[0.06]"
            >
              {mode === "magic" ? "Continue with a password" : "Continue another way"}
            </button>
          </div>

          {!configured && (
            <div className="mt-4 rounded-lg border border-amber-signal/25 bg-amber-signal/[0.06] p-3">
              <p className="text-[11.5px] font-semibold text-amber-signal">Demo mode — Supabase keys not set</p>
              <p className="mt-1 text-[11px] leading-relaxed text-app-400">
                Accounts are disabled until you add them. Everything still runs, stored in this browser.
              </p>
              <Link href="/dashboard" className="mt-2.5 flex items-center justify-center gap-1.5 rounded-md bg-white/10 py-2 text-[12px] font-semibold text-white hover:bg-white/15">
                Enter demo workspace <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </form>

        <p className="mt-8 text-center text-[11.5px] text-app-400">
          <span className="underline decoration-app-600 underline-offset-2">Terms of Service</span> and{" "}
          <span className="underline decoration-app-600 underline-offset-2">Privacy Policy</span>
        </p>
      </div>
    </div>
  );
}

function ProviderButton({
  label,
  icon,
  onClick,
  busy,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  busy: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex w-full items-center justify-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.03] py-2.5 text-[12.5px] font-medium text-white transition-colors hover:bg-white/[0.08]"
    >
      <span className="absolute left-3 flex h-4 w-4 items-center justify-center">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      </span>
      {label}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1S8.7 6 12 6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.06-1.1-.15-1.6H12Z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <rect x="2" y="2" width="9" height="9" fill="#F25022" />
      <rect x="13" y="2" width="9" height="9" fill="#7FBA00" />
      <rect x="2" y="13" width="9" height="9" fill="#00A4EF" />
      <rect x="13" y="13" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.9-1.5-.1-2.8.8-3.5.8-.7 0-1.8-.8-3-.8-1.6 0-3 .9-3.8 2.3-1.6 2.8-.4 6.9 1.2 9.2.8 1.1 1.7 2.3 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2-1.1 2.8-2.2c.9-1.3 1.3-2.5 1.3-2.6-.1 0-2.5-1-2.5-3.6ZM14.2 5.6c.6-.8 1-1.9.9-3-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2.1-.5 2.8-1.3Z" />
    </svg>
  );
}
