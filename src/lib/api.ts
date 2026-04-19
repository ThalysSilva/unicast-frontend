import type { ApiResponse, AuthSession } from "@/lib/types";

const AUTH_KEY = "unicast.auth";
const AUTH_EVENT = "unicast:auth-changed";
const DEFAULT_BASE_URL = "http://localhost:8080";

type RefreshPayload = Pick<AuthSession, "accessToken" | "refreshToken" | "user">;

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
  window.dispatchEvent(new Event(AUTH_EVENT));
};

export const clearAuth = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_KEY);
  window.dispatchEvent(new Event(AUTH_EVENT));
};

export const onAuthChange = (listener: () => void) => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(AUTH_EVENT, listener);
  return () => window.removeEventListener(AUTH_EVENT, listener);
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
  skipAuthRefresh?: boolean;
};

let refreshSessionPromise: Promise<AuthSession | null> | null = null;

const parsePayload = async (response: Response) =>
  response.json().catch(() => null) as Promise<unknown>;

const tryParseJson = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const messageFromUnknown = (value: unknown): string | null => {
  if (!value) return null;

  if (typeof value === "string") {
    const parsed = tryParseJson(value);
    if (parsed !== value) {
      return messageFromUnknown(parsed);
    }

    return value.trim() || null;
  }

  if (Array.isArray(value)) {
    const messages = value
      .map((item) => messageFromUnknown(item))
      .filter(Boolean);
    return messages.length ? messages.join("; ") : null;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferred =
      messageFromUnknown(record.message) ??
      messageFromUnknown(record.error) ??
      messageFromUnknown(record.detail) ??
      messageFromUnknown(record.details);

    if (preferred) return preferred;

    const fieldMessages = Object.values(record)
      .map((item) => messageFromUnknown(item))
      .filter(Boolean);
    return fieldMessages.length ? fieldMessages.join("; ") : null;
  }

  return null;
};

export const extractErrorMessage = (payload: unknown) => {
  if (payload && typeof payload === "object") {
    const { error, message } = payload as {
      error?: unknown;
      message?: unknown;
    };

    const extracted = messageFromUnknown(message) ?? messageFromUnknown(error);
    if (extracted) return extracted;
  }

  return messageFromUnknown(payload) ?? "Erro inesperado";
};

const unwrapPayload = <T>(payload: ApiResponse<T> | T): T => {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as ApiResponse<T>).data;
  }

  return payload as T;
};

const performRequest = (
  path: string,
  options: RequestOptions,
  auth: AuthSession | null
) => {
  const headers = new Headers(options.headers);

  if (auth?.accessToken && path !== "/auth/refresh") {
    headers.set("Authorization", `Bearer ${auth.accessToken}`);
  }

  const isFormData = options.body instanceof FormData;
  let body: BodyInit | undefined;

  if (typeof options.body !== "undefined") {
    if (isFormData) {
      body = options.body as BodyInit;
    } else {
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }

      body = JSON.stringify(options.body);
    }
  }

  return fetch(buildUrl(path), {
    method: options.method ?? (body ? "POST" : "GET"),
    headers,
    body,
  });
};

const refreshAuthSession = async (): Promise<AuthSession | null> => {
  if (typeof window === "undefined") return null;

  if (refreshSessionPromise) {
    return refreshSessionPromise;
  }

  refreshSessionPromise = (async () => {
    const currentSession = getAuth();

    if (!currentSession?.refreshToken) {
      clearAuth();
      return null;
    }

    const response = await performRequest(
      "/auth/refresh",
      {
        method: "POST",
        body: { refreshToken: currentSession.refreshToken },
        skipAuthRefresh: true,
      },
      null
    );

    const payload = await parsePayload(response);

    if (!response.ok) {
      clearAuth();
      return null;
    }

    const refreshed = unwrapPayload(
      payload as RefreshPayload | ApiResponse<RefreshPayload>
    );

    if (!refreshed?.accessToken || !refreshed?.refreshToken) {
      clearAuth();
      return null;
    }

    const nextSession: AuthSession = {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      user: refreshed.user ?? currentSession.user,
      jwe: currentSession.jwe,
    };

    setAuth(nextSession);
    return nextSession;
  })().finally(() => {
    refreshSessionPromise = null;
  });

  return refreshSessionPromise;
};

export const apiRequest = async <T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> => {
  let response = await performRequest(path, options, getAuth());
  let payload = await parsePayload(response);

  if (
    response.status === 401 &&
    !options.skipAuthRefresh &&
    path !== "/auth/login" &&
    path !== "/auth/register" &&
    path !== "/auth/refresh"
  ) {
    const refreshedSession = await refreshAuthSession();

    if (refreshedSession?.accessToken) {
      response = await performRequest(
        path,
        { ...options, skipAuthRefresh: true },
        refreshedSession
      );
      payload = await parsePayload(response);
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, extractErrorMessage(payload));
  }

  if (payload === null || typeof payload === "undefined") {
    return {} as T;
  }

  return payload as T;
};

export const extractData = <T>(payload: ApiResponse<T> | T): T =>
  unwrapPayload(payload);
