"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, Mail, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup" | "magic";

export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Supabase is not configured. Use the demo workspace below, or add your keys to .env.local.");
      return;
    }
    if (!email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "magic") {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
        });
        if (otpError) throw otpError;
        setNotice("Check your inbox — the sign-in link is on its way.");
        return;
      }

      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          router.push(next);
          router.refresh();
        } else {
          setNotice("Account created. Confirm your email, then sign in.");
        }
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function oauth(provider: "google" | "github") {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Add your Supabase keys to enable OAuth.");
      return;
    }
    setBusy(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (oauthError) {
      setError(oauthError.message);
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-[400px]">
      <Link href="/" className="mb-8 inline-block">
        <Logo size={34} />
      </Link>

      <h1 className="text-2xl font-extrabold tracking-tight text-ink-50">
        {mode === "signup" ? "Create your workspace" : "Welcome back"}
      </h1>
      <p className="mt-2 text-sm text-ink-400">
        {mode === "signup"
          ? "Free while we are in beta. No card, no sales call."
          : "Sign in to your projects, presets and exports."}
      </p>

      {!configured && (
        <div className="mt-6 rounded-xl border border-amber-signal/30 bg-amber-signal/[0.07] p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-signal" />
            <div>
              <p className="text-[13px] font-semibold text-ink-100">Demo mode — no Supabase keys found</p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-400">
                Accounts need <code className="rounded bg-ink-800 px-1 py-0.5 text-[11px]">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
                and an anon key. Until then everything runs locally in your browser.
              </p>
              <Link href="/dashboard" className="rf-btn rf-btn-primary mt-3 w-full">
                Enter demo workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {configured && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => oauth("google")} disabled={busy} className="rf-btn rf-btn-ghost">
              Google
            </button>
            <button type="button" onClick={() => oauth("github")} disabled={busy} className="rf-btn rf-btn-ghost">
              GitHub
            </button>
          </div>

          <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-widest text-ink-600">
            <span className="h-px flex-1 bg-ink-800" />
            or email
            <span className="h-px flex-1 bg-ink-800" />
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label htmlFor="email" className="rf-label mb-1.5 block">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@studio.com"
                className="rf-input"
              />
            </div>

            {mode !== "magic" && (
              <div>
                <label htmlFor="password" className="rf-label mb-1.5 block">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="rf-input"
                />
              </div>
            )}

            {error && (
              <p className="rounded-lg border border-rose-signal/30 bg-rose-signal/10 px-3 py-2 text-[12px] text-rose-signal">
                {error}
              </p>
            )}
            {notice && (
              <p className="rounded-lg border border-lime-signal/30 bg-lime-signal/10 px-3 py-2 text-[12px] text-lime-signal">
                {notice}
              </p>
            )}

            <button type="submit" disabled={busy} className="rf-btn rf-btn-primary w-full py-2.5">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "magic" ? <Mail className="h-4 w-4" /> : null}
              {mode === "signup" ? "Create account" : mode === "magic" ? "Email me a link" : "Sign in"}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[12px] text-ink-400">
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signup" ? "signin" : "signup");
                setError(null);
                setNotice(null);
              }}
              className="hover:text-ink-100"
            >
              {mode === "signup" ? "I already have an account" : "Create an account"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode(mode === "magic" ? "signin" : "magic");
                setError(null);
                setNotice(null);
              }}
              className={cn("hover:text-ink-100", mode === "magic" && "text-lime-signal")}
            >
              Use a magic link
            </button>
          </div>

          <p className="mt-6 text-[11px] leading-relaxed text-ink-600">
            By continuing you agree to the terms. Uploaded media stays in your own Supabase storage bucket.
          </p>
        </>
      )}
    </div>
  );
}
