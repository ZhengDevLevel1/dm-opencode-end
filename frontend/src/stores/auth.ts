import { create } from "zustand";
import { authService } from "@/lib/services";
import {
  clearAuthStorage,
  getStoredUser,
  getToken,
  setStoredUser,
  setToken,
  setTokenExpiry,
} from "@/lib/storage";
import { queryClient } from "@/lib/query-client";
import type { LoginResponse, UserVO } from "@/types/api";

type AuthStatus = "idle" | "loading" | "authenticated" | "anonymous";

interface AuthState {
  token: string | null;
  user: UserVO | null;
  status: AuthStatus;
  login: (username: string, password: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  setUser: (user: UserVO) => void;
  clearAuth: () => void;
}

let hydratePromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  token: getToken(),
  user: getStoredUser(),
  status: "idle",

  login: async (username, password) => {
    const result = await authService.login({ username, password });
    setToken(result.token);
    setStoredUser(result.user);
    setTokenExpiry(result.expiresIn);
    set({ token: result.token, user: result.user, status: "authenticated" });
    queryClient.clear();
    return result;
  },

  logout: async () => {
    try {
      await authService.logout();
    } catch {
      /* 无论服务端是否成功，本地都必须清理 */
    }
    get().clearAuth();
  },

  clearAuth: () => {
    clearAuthStorage();
    set({ token: null, user: null, status: "anonymous" });
    queryClient.clear();
  },

  setUser: (user) => {
    setStoredUser(user);
    set({ user });
  },

  hydrate: async () => {
    if (hydratePromise) return hydratePromise;
    const token = getToken();
    if (!token) {
      set({ status: "anonymous", token: null, user: null });
      return;
    }
    set({ status: "loading", token });
    hydratePromise = (async () => {
      try {
        const user = await authService.me();
        setStoredUser(user);
        set({ user, status: "authenticated" });
      } catch {
        clearAuthStorage();
        set({ token: null, user: null, status: "anonymous" });
      } finally {
        hydratePromise = null;
      }
    })();
    return hydratePromise;
  },
}));
