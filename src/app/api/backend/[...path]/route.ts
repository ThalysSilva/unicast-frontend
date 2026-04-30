import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { refreshBackendToken, unstable_update } from "@/auth";

const DEFAULT_BACKEND_URL = "http://localhost:8080";
const DEFAULT_APP_URL = "http://localhost:3000";

type BackendToken = {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpiresAt?: number;
  jwe?: string;
  error?: "RefreshTokenError" | "RefreshTokenMissing";
};

const PUBLIC_PATHS = [
  "/auth/register",
  "/invite/self-register/",
];

const JWE_BODY_PATHS = [
  { method: "POST", path: "/message/send" },
  { method: "POST", path: "/smtp/instance" },
];

const backendBaseUrl = () =>
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  DEFAULT_BACKEND_URL;

const appBaseUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.AUTH_URL ??
  process.env.NEXTAUTH_URL ??
  DEFAULT_APP_URL;

const usesSecureCookies = () => appBaseUrl().startsWith("https://");

const allowedOrigins = () =>
  [
    appBaseUrl(),
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.AUTH_URL,
    process.env.NEXTAUTH_URL,
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => new URL(value).origin);

const isMutatingMethod = (method: string) =>
  !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());

const validateOrigin = (request: NextRequest) => {
  if (!isMutatingMethod(request.method)) {
    return null;
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    return null;
  }

  if (allowedOrigins().includes(origin)) {
    return null;
  }

  return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
};

const shouldAllowPublic = (path: string) =>
  PUBLIC_PATHS.some((publicPath) =>
    publicPath.endsWith("/") ? path.startsWith(publicPath) : path === publicPath
  );

const shouldInjectJwe = (method: string, path: string) =>
  JWE_BODY_PATHS.some(
    (item) => item.method === method.toUpperCase() && item.path === path
  );

const buildBackendUrl = (path: string, search: string) =>
  `${backendBaseUrl()}${path}${search}`;

const refreshSessionToken = async (token: BackendToken) => {
  const refreshed = await refreshBackendToken(token);
  if (!refreshed.accessToken || !refreshed.refreshToken || refreshed.error) {
    return null;
  }

  await unstable_update({
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    accessTokenExpiresAt: refreshed.accessTokenExpiresAt,
    jwe: refreshed.jwe,
  } as never);

  return refreshed as BackendToken;
};

const buildHeaders = (request: NextRequest, token: BackendToken | null) => {
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("cookie");
  headers.delete("content-length");

  if (token?.accessToken) {
    headers.set("Authorization", `Bearer ${token.accessToken}`);
  }

  return headers;
};

const buildBody = async (
  request: NextRequest,
  headers: Headers,
  token: BackendToken | null,
  path: string
): Promise<BodyInit | undefined> => {
  if (request.method === "GET" || request.method === "HEAD") {
    return undefined;
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (
    contentType.includes("application/json") &&
    shouldInjectJwe(request.method, path)
  ) {
    const payload = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;

    headers.set("Content-Type", "application/json");
    return JSON.stringify({
      ...(payload ?? {}),
      jwe: token?.jwe ?? "",
    });
  }

  return request.arrayBuffer();
};

const proxy = async (
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) => {
  const originError = validateOrigin(request);
  if (originError) {
    return originError;
  }

  const params = await context.params;
  const path = `/${params.path.join("/")}`;
  const isPublic = shouldAllowPublic(path);
  let token = isPublic
    ? null
    : ((await getToken({
        req: request,
        secret: process.env.AUTH_SECRET,
        secureCookie: usesSecureCookies(),
      })) as BackendToken | null);

  if (
    !isPublic &&
    token?.accessTokenExpiresAt &&
    Date.now() >= token.accessTokenExpiresAt - 60_000
  ) {
    token = await refreshSessionToken(token);
  }

  if (!isPublic && !token?.accessToken) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const headers = buildHeaders(request, token);
  const body = await buildBody(request, headers, token, path);
  const response = await fetch(buildBackendUrl(path, request.nextUrl.search), {
    method: request.method,
    headers,
    body,
    cache: "no-store",
  });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("set-cookie");

  return new NextResponse(await response.arrayBuffer(), {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
};

export {
  proxy as DELETE,
  proxy as GET,
  proxy as PATCH,
  proxy as POST,
  proxy as PUT,
};
