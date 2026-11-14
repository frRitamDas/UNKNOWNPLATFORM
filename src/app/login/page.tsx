import type { Metadata } from "next";
import { Suspense } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 rf-grid-bg opacity-50" />
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(201,249,80,0.12),transparent)] blur-2xl" />
      <Suspense fallback={<div className="h-64 w-[400px] animate-pulse rounded-2xl bg-ink-850" />}>
        <LoginForm configured={isSupabaseConfigured} />
      </Suspense>
    </main>
  );
}
