"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth-store";

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthReady = useAuthStore((state) => state.isAuthReady);

  useEffect(() => {
    if (isAuthReady && !user) {
      router.replace("/login");
    }
  }, [isAuthReady, router, user]);

  const onLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (!isAuthReady || !user) {
    return (
      <main className="auth-shell">
        <div className="auth-card rise-in text-center">
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Preparing your workspace...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl p-6 md:p-10">
      <header className="rise-in mb-8 overflow-hidden rounded-2xl border p-6 shadow-[0_14px_40px_rgba(58,44,32,0.12)]" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="auth-badge">Authenticated Session</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Hello, {user.name}</h1>
            <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
              Your account is active and this route is protected by the Next.js proxy guard.
            </p>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="rounded-xl border px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5"
            style={{ borderColor: "var(--line)", background: "rgba(255,255,255,0.75)" }}
          >
            Logout
          </button>
        </div>
      </header>

      <section className="rise-in grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border p-5" style={{ borderColor: "var(--line)", background: "rgba(255,255,255,0.72)" }}>
          <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--muted)" }}>
            Name
          </p>
          <p className="mt-2 text-base font-semibold">{user.name}</p>
        </article>

        <article className="rounded-2xl border p-5" style={{ borderColor: "var(--line)", background: "rgba(255,255,255,0.72)" }}>
          <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--muted)" }}>
            Email
          </p>
          <p className="mt-2 text-base font-semibold break-all">{user.email}</p>
        </article>

        <article className="rounded-2xl border p-5" style={{ borderColor: "var(--line)", background: "rgba(255,255,255,0.72)" }}>
          <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--muted)" }}>
            UID
          </p>
          <p className="mt-2 text-sm font-semibold break-all">{user.uid}</p>
        </article>
      </section>
    </main>
  );
}
