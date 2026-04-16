"use client";

import { useEffect } from "react";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth-store";

type AuthProviderProps = {
  children: React.ReactNode;
};

export default function AuthProvider({ children }: AuthProviderProps) {
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);
  const setAuthReady = useAuthStore((state) => state.setAuthReady);

  useEffect(() => {
    const syncSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token && session.user) {
        document.cookie = `auth-token=${session.access_token}; path=/; max-age=3600; samesite=lax`;

        setUser({
          uid: session.user.id,
          email: session.user.email ?? "",
          name: (session.user.user_metadata?.full_name as string | undefined) ?? "Anonymous",
        });
      } else {
        document.cookie = "auth-token=; path=/; max-age=0; samesite=lax";
        clearUser();
      }

      setAuthReady(true);
    };

    void syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token && session.user) {
        document.cookie = `auth-token=${session.access_token}; path=/; max-age=3600; samesite=lax`;

        setUser({
          uid: session.user.id,
          email: session.user.email ?? "",
          name: (session.user.user_metadata?.full_name as string | undefined) ?? "Anonymous",
        });
      } else {
        document.cookie = "auth-token=; path=/; max-age=0; samesite=lax";
        clearUser();
      }

      setAuthReady(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [clearUser, setAuthReady, setUser]);

  return children;
}
