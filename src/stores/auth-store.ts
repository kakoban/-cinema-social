"use client";

import { create } from "zustand";
import { api, setAccessToken } from "@/lib/api-client";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
  avatar: string | null;
  bio: string | null;
  language: string;
  theme: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (
    username: string,
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  setUser: (u: AuthUser | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  bootstrap: async () => {
    set({ loading: true });
    // Try the in-memory access token first
    let res = await api.get<AuthUser>("/api/auth/me");
    if (res.success && res.data) {
      set({ user: res.data, loading: false, initialized: true });
      return;
    }
    // No valid access token (e.g. after reload) — try the httpOnly refresh cookie
    const r = await api.post<{ user: AuthUser; accessToken: string }>(
      "/api/auth/refresh"
    );
    if (r.success && r.data) {
      setAccessToken(r.data.accessToken);
      set({ user: r.data.user, loading: false, initialized: true });
      return;
    }
    set({ user: null, loading: false, initialized: true });
  },

  login: async (email, password) => {
    set({ loading: true });
    const res = await api.post<{ user: AuthUser; accessToken: string }>(
      "/api/auth/login",
      { email, password }
    );
    set({ loading: false });
    if (res.success && res.data) {
      setAccessToken(res.data.accessToken);
      set({ user: res.data.user });
      return { ok: true };
    }
    return { ok: false, error: res.error };
  },

  register: async (username, email, password) => {
    set({ loading: true });
    const res = await api.post<{ user: AuthUser; accessToken: string }>(
      "/api/auth/register",
      { username, email, password }
    );
    set({ loading: false });
    if (res.success && res.data) {
      setAccessToken(res.data.accessToken);
      set({ user: res.data.user });
      return { ok: true };
    }
    return { ok: false, error: res.error };
  },

  logout: async () => {
    await api.post("/api/auth/logout");
    setAccessToken(null);
    set({ user: null });
  },

  setUser: (u) => set({ user: u }),
}));
