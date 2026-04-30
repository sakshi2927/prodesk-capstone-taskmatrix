"use client";

import { useEffect } from "react";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth-store";
import { clearDemoSession, readDemoSession } from "@/lib/demo-auth";

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

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
