"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth-store";

export default function RegisterPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthReady = useAuthStore((state) => state.isAuthReady);

  const [name, setName] = useState("");
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
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      router.push("/login?registered=1");
    } catch (submitError) {
      if (submitError instanceof Error) {
        setError(submitError.message);
      } else {
        setError("Unable to register. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-card rise-in">
        <span className="auth-badge">ProDesk Hub</span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Create account</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          Set up your profile and continue to your dashboard.
        </p>

        <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium tracking-wide">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className="field-input"
            placeholder="Your full name"
          />
        </div>

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
            minLength={6}
            className="field-input"
            placeholder="At least 6 characters"
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="primary-btn"
        >
          {loading ? "Creating account..." : "Register"}
        </button>
        </form>

        <p className="mt-6 text-sm" style={{ color: "var(--muted)" }}>
          Already have an account?{" "}
          <Link href="/login" className="text-link">
            Login
          </Link>
        </p>
      </section>
    </main>
  );
}
