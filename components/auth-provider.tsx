"use client";

import { useEffect } from "react";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth-store";
import { clearDemoSession, readDemoSession } from "@/lib/demo-auth";

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const segments = token.split(".");

  if (segments.length < 2) {
    return null;
  }

  try {
    const normalizedPayload = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, "=");
    const json = atob(paddedPayload);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getProvisionalUserFromCookie() {
  const authToken = readCookie("auth-token");

  if (!authToken || authToken.startsWith("demo-")) {
    return null;
  }

  const payload = decodeJwtPayload(authToken);
  const email = typeof payload?.email === "string" ? payload.email : "";
  const nameFromMetadata =
    typeof payload?.user_metadata === "object" && payload.user_metadata !== null
      ? (payload.user_metadata as { full_name?: unknown; name?: unknown }).full_name ??
        (payload.user_metadata as { full_name?: unknown; name?: unknown }).name
      : null;

  return {
    uid: typeof payload?.sub === "string" ? payload.sub : "",
    email,
    name:
      typeof nameFromMetadata === "string" && nameFromMetadata.trim()
        ? nameFromMetadata
        : email
          ? email.split("@")[0]
          : "Authenticated user",
  };
}

type AuthProviderProps = {
  children: React.ReactNode;
};

export default function AuthProvider({ children }: AuthProviderProps) {
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);
  const setAuthReady = useAuthStore((state) => state.setAuthReady);

  useEffect(() => {
    if (isDemoMode) {
      const demoSession = readDemoSession();

      if (demoSession) {
        document.cookie = `auth-token=demo-${demoSession.uid}; path=/; max-age=604800; samesite=lax`;
        setUser(demoSession);
      } else {
        clearDemoSession();
        clearUser();
      }

      setAuthReady(true);
      return;
    }

    if (!isSupabaseConfigured) {
      clearUser();
      setAuthReady(true);
      return;
    }

    const provisionalUser = getProvisionalUserFromCookie();

    if (provisionalUser) {
      setUser(provisionalUser);
      setAuthReady(true);
    }

    const client = getSupabaseClient();

    const syncSession = async () => {
      try {
        const {
          data: { session },
        } = await client.auth.getSession();

        if (session?.access_token && session.user) {
          document.cookie = `auth-token=${session.access_token}; path=/; max-age=3600; samesite=lax`;

          setUser({
            uid: session.user.id,
            email: session.user.email ?? "",
            name: (session.user.user_metadata?.full_name as string | undefined) ?? "Anonymous",
          });
        } else {
          const demoSession = readDemoSession();

          if (demoSession) {
            document.cookie = `auth-token=demo-${demoSession.uid}; path=/; max-age=604800; samesite=lax`;
            setUser(demoSession);
          } else {
            clearDemoSession();
            clearUser();
          }
        }
      } catch {
        const demoSession = readDemoSession();

        if (demoSession) {
          document.cookie = `auth-token=demo-${demoSession.uid}; path=/; max-age=604800; samesite=lax`;
          setUser(demoSession);
        } else {
          clearDemoSession();
          clearUser();
        }
      } finally {
        setAuthReady(true);
      }
    };

    void syncSession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token && session.user) {
        document.cookie = `auth-token=${session.access_token}; path=/; max-age=3600; samesite=lax`;

        setUser({
          uid: session.user.id,
          email: session.user.email ?? "",
          name: (session.user.user_metadata?.full_name as string | undefined) ?? "Anonymous",
        });
      } else {
        const demoSession = readDemoSession();

        if (demoSession) {
          document.cookie = `auth-token=demo-${demoSession.uid}; path=/; max-age=604800; samesite=lax`;
          setUser(demoSession);
        } else {
          clearDemoSession();
          clearUser();
        }
      }

      setAuthReady(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [clearUser, setAuthReady, setUser]);

  return children;
}
