/**
 * Global auth store — Zustand.
 *
 * Persists tokens to localStorage so sessions survive page reloads.
 * The user profile is stored in memory only (re-fetched on /me if needed).
 */
import { create } from "zustand";

import { apiClient, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/lib/axios";
import type {
  AuthResponse,
  LoginPayload,
  SignupPayload,
  User,
} from "@/types/auth";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  signup: (payload: SignupPayload) => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  setUser: (user: User) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
  isAuthenticated: !!localStorage.getItem(ACCESS_TOKEN_KEY),
  isLoading: false,

  signup: async (payload) => {
    set({ isLoading: true });
    try {
      const { data } = await apiClient.post<AuthResponse>(
        "/auth/signup",
        payload
      );
      localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
      set({
        user: data.user,
        accessToken: data.access_token,
        isAuthenticated: true,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (payload) => {
    set({ isLoading: true });
    try {
      const { data } = await apiClient.post<AuthResponse>(
        "/auth/login",
        payload
      );
      localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
      set({
        user: data.user,
        accessToken: data.access_token,
        isAuthenticated: true,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Best-effort — clear local state regardless
    } finally {
      get().clearAuth();
    }
  },

  loadUser: async () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return;
    try {
      const { data } = await apiClient.get<User>("/auth/me");
      set({ user: data, isAuthenticated: true });
    } catch {
      get().clearAuth();
    }
  },

  setUser: (user) => set({ user }),

  clearAuth: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    set({ user: null, accessToken: null, isAuthenticated: false });
  },
}));
