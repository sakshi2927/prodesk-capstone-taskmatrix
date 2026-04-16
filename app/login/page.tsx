import { Suspense } from "react";

import LoginForm from "@/components/login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="auth-shell">
          <section className="auth-card rise-in">
            <span className="auth-badge">ProDesk Hub</span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
              Sign in to open your private workspace dashboard.
            </p>
          </section>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
