import type { ApiResponse } from "@/types/api";
import { getToken } from "./storage";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");
const TIMEOUT_MS = 15000;

export class ApiError extends Error {
  code: number;
  status: number;
  details?: unknown;

  constructor(message: string, code: number, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  query?: object;
  skipAuthRedirect?: boolean;
  timeout?: number;
}

const STATUS_FALLBACK: Record<number, string> = {
  400: "请求参数有误，请检查后重试。",
  401: "登录状态已失效，请重新登录。",
  403: "没有访问该资源的权限。",
  404: "请求的资源不存在。",
  405: "请求方式不被支持。",
  409: "当前数据状态已变化，请刷新后重试。",
  500: "服务器开小差了，请稍后重试。",
};

function buildQuery(query?: object): string {
  if (!query) return "";
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) {
      if (value.length === 0) return;
      params.set(key, value.join(","));
      return;
    }
    params.set(key, String(value));
  });
  const text = params.toString();
  return text ? `?${text}` : "";
}

function normalizeMessage(status: number, message?: string): string {
  if (message && message.trim()) return message;
  return STATUS_FALLBACK[status] ?? "数据没送到，请稍后重试。";
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, query, skipAuthRedirect, timeout = TIMEOUT_MS, headers, signal, ...rest } = options;

  const controller = new AbortController();
  let timedOut = false;
  const timer = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeout);

  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", onAbort, { once: true });
  }

  const token = getToken();
  const finalHeaders = new Headers(headers);
  if (!finalHeaders.has("Content-Type") && body !== undefined) {
    finalHeaders.set("Content-Type", "application/json");
  }
  finalHeaders.set("Accept", "application/json");
  if (token) finalHeaders.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}${buildQuery(query)}`, {
      ...rest,
      headers: finalHeaders,
      signal: controller.signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    window.clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onAbort);
    if (timedOut) {
      throw new ApiError("请求超时，请检查网络后重试。", 0, 0);
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new ApiError("无法连接服务器，请检查网络或后端是否启动。", 0, 0);
  }

  window.clearTimeout(timer);
  if (signal) signal.removeEventListener("abort", onAbort);

  let payload: ApiResponse<T> | null = null;
  const raw = await response.text().catch(() => "");
  if (raw) {
    try {
      payload = JSON.parse(raw) as ApiResponse<T>;
    } catch {
      throw new ApiError("服务器返回了无法解析的响应。", 0, response.status);
    }
  }

  const code = payload?.code ?? response.status;
  const ok = response.ok && code === 200;

  if (!ok) {
    const message = normalizeMessage(response.status, payload?.message);
    if ((response.status === 401 || code === 401) && !skipAuthRedirect) {
      window.dispatchEvent(new CustomEvent("flower:unauthorized"));
    }
    throw new ApiError(message, code, response.status, payload);
  }

  return (payload?.data ?? undefined) as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "数据没送到，请稍后重试。";
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
