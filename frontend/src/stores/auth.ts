import { create } from "zustand";
import { ApiError } from "@/lib/api-client";
import { authService } from "@/lib/services";
import {
  clearAuthStorage,
  getStoredUser,
  getToken,
  getTokenExpiry,
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
  loginByEmail: (email: string, code: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  setUser: (user: UserVO) => void;
  clearAuth: () => void;
}

let hydratePromise: Promise<void> | null = null;

const initialToken = getToken();
const initialUser = initialToken ? getStoredUser() : null;
const initialExpiry = getTokenExpiry();
const hasCachedSession = Boolean(
  initialToken &&
    initialUser &&
    (!initialExpiry || initialExpiry > Date.now()),
);

export const useAuthStore = create<AuthState>((set, get) => {
  const applyLogin = (result: LoginResponse): LoginResponse => {
    setToken(result.token);
    setStoredUser(result.user);
    setTokenExpiry(result.expiresIn);
    set({ token: result.token, user: result.user, status: "authenticated" });
    return result;
  };

  return {
    token: initialToken,
    user: initialUser,
    status: hasCachedSession ? "authenticated" : initialToken ? "loading" : "anonymous",

    login: async (username, password) =>
      applyLogin(await authService.login({ username, password })),

    loginByEmail: async (email, code) =>
      applyLogin(await authService.loginByEmail({ email, code })),

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
      if (get().user) {
        set({ token });
      } else {
        set({ status: "loading", token });
      }
      hydratePromise = (async () => {
        try {
          const user = await authService.me();
          setStoredUser(user);
          set({ user, status: "authenticated" });
        } catch (error) {
          const unauthorized =
            error instanceof ApiError && (error.status === 401 || error.status === 403);
          if (unauthorized) {
            clearAuthStorage();
            set({ token: null, user: null, status: "anonymous" });
          } else if (get().user) {
            set({ status: "authenticated" });
          } else {
            set({ token: getToken(), status: "anonymous" });
          }
        } finally {
          hydratePromise = null;
        }
      })();
      return hydratePromise;
    },
  };
});
