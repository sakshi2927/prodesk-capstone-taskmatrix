"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { getSupabaseClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth-store";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const isAuthReady = useAuthStore((state) => state.isAuthReady);
  const isRegistered = searchParams.get("registered") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthReady && user) {
      router.replace("/dashboard");
    }
  }, [isAuthReady, router, user]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const client = getSupabaseClient();

      const { error: signInError } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      router.push("/dashboard");
    } catch (submitError) {
      if (submitError instanceof Error) {
        if (submitError.message.toLowerCase() === "invalid login credentials") {
          setError(
            "Invalid login credentials. If you just signed up, confirm your email first and then try again.",
          );
        } else {
          setError(submitError.message);
        }
      } else {
        setError("Unable to login. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-card auth-card-login rise-in">
        <span className="auth-badge">ProDesk Hub</span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          Sign in to open your private workspace dashboard.
        </p>

        <div className="auth-accent-strip mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.1em]">Today in TaskMatrix</p>
          <p className="mt-1.5 text-sm">Track progress, update priorities, and move faster with your live dashboard.</p>
        </div>

        {isRegistered ? (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            You registered successfully. Please login with your new account.
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="mt-7 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium tracking-wide">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="field-input"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium tracking-wide">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="field-input"
              placeholder="Enter your password"
            />
          </div>

          {error ? <p className="error-note text-sm">{error}</p> : null}

          <button type="submit" disabled={loading} className="primary-btn">
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="mt-6 text-sm" style={{ color: "var(--muted)" }}>
          Need an account?{" "}
          <Link href="/register" className="text-link">
            Register
          </Link>
        </p>
      </section>
    </main>
  );
}
