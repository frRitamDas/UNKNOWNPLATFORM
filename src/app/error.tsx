"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surface the digest in the console so a client crash is traceable.
    console.error("[reelforge]", error);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center bg-ink-950 px-5">
      <div className="max-w-md text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-rose-signal/30 bg-rose-signal/10">
          <AlertTriangle className="h-5 w-5 text-rose-signal" />
        </div>
        <h1 className="mt-5 text-xl font-bold tracking-tight text-ink-50">Something broke mid-render</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-400">
          Your project is saved. Reload to pick up where you left off — if it keeps happening, the details are in the
          browser console{error.digest ? ` (ref ${error.digest})` : ""}.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={reset} className="rf-btn rf-btn-primary">
            <RotateCcw className="h-4 w-4" /> Try again
          </button>
          <Link href="/dashboard" className="rf-btn rf-btn-ghost">
            Back to projects
          </Link>
        </div>
      </div>
    </main>
  );
}
