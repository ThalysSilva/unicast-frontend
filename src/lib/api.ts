import type { ApiResponse, AuthSession } from "@/lib/types";

const AUTH_KEY = "unicast.auth";
const DEFAULT_BASE_URL = "http://localhost:8080";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_BASE_URL;

export const getAuth = (): AuthSession | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
};

export const setAuth = (session: AuthSession) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_KEY, JSON.stringify(session));
};

export const clearAuth = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_KEY);
};

const buildUrl = (path: string) => {
  if (path.startsWith("http")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${apiBaseUrl}${normalized}`;
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: HeadersInit;
};

export const apiRequest = async <T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> => {
  const auth = getAuth();
  const headers = new Headers(options.headers);
  if (auth?.accessToken) {
    headers.set("Authorization", `Bearer ${auth.accessToken}`);
  }

  const isFormData = options.body instanceof FormData;
  let body: BodyInit | undefined;

  if (typeof options.body !== "undefined") {
    if (isFormData) {
      body = options.body as BodyInit;
    } else {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(options.body);
    }
  }

  const response = await fetch(buildUrl(path), {
    method: options.method ?? (body ? "POST" : "GET"),
    headers,
    body,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error || payload?.message || "Erro inesperado";
    throw new ApiError(response.status, message);
  }
  return payload as T;
};

export const extractData = <T>(payload: ApiResponse<T> | T): T => {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as ApiResponse<T>).data;
  }
  return payload as T;
};
