import { create } from "zustand";

export type AuthUser = {
  uid: string;
  email: string;
  name: string;
};

type AuthState = {
  user: AuthUser | null;
  isAuthReady: boolean;
  setUser: (user: AuthUser) => void;
  clearUser: () => void;
  setAuthReady: (ready: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthReady: false,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
  setAuthReady: (isAuthReady) => set({ isAuthReady }),
}));
