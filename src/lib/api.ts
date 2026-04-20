import type { ApiResponse } from "@/lib/types";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const buildUrl = (path: string) => {
  if (path.startsWith("http")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `/api/backend${normalized}`;
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: HeadersInit;
};

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

const toUserFacingErrorMessage = (status: number, message: string) => {
  if (status >= 500) {
    return "Falha no sistema. Tente novamente em instantes.";
  }

  return message.replace(/\s*:\s*Err[A-Za-z0-9_]+$/u, "").trim() || message;
};

const unwrapPayload = <T>(payload: ApiResponse<T> | T): T => {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as ApiResponse<T>).data;
  }

  return payload as T;
};

const performRequest = (
  path: string,
  options: RequestOptions
) => {
  const headers = new Headers(options.headers);

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
    credentials: "same-origin",
  });
};

export const apiRequest = async <T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> => {
  const response = await performRequest(path, options);
  const payload = await parsePayload(response);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      toUserFacingErrorMessage(response.status, extractErrorMessage(payload))
    );
  }

  if (payload === null || typeof payload === "undefined") {
    return {} as T;
  }

  return payload as T;
};

export const extractData = <T>(payload: ApiResponse<T> | T): T =>
  unwrapPayload(payload);
