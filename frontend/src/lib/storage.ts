import type { UserVO } from "@/types/api";

const TOKEN_KEY = "flower.auth.token";
const USER_KEY = "flower.auth.user";
const EXPIRES_KEY = "flower.auth.expiresAt";
const REMEMBER_KEY = "flower.auth.remember";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable */
  }
}

export function getStoredUser(): UserVO | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as UserVO) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: UserVO | null): void {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function setTokenExpiry(expiresInSeconds: number): void {
  try {
    localStorage.setItem(EXPIRES_KEY, String(Date.now() + expiresInSeconds * 1000));
  } catch {
    /* storage unavailable */
  }
}

export function getTokenExpiry(): number | null {
  try {
    const raw = localStorage.getItem(EXPIRES_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

export function clearAuthStorage(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(EXPIRES_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function getRememberedUsername(): string {
  try {
    return localStorage.getItem(REMEMBER_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setRememberedUsername(username: string | null): void {
  try {
    if (username) localStorage.setItem(REMEMBER_KEY, username);
    else localStorage.removeItem(REMEMBER_KEY);
  } catch {
    /* storage unavailable */
  }
}
