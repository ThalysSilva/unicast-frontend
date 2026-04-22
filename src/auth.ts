import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import type { ApiResponse, User } from "@/lib/types";

const DEFAULT_BACKEND_URL = "http://localhost:8080";

type BackendLoginResponse = {
  user: User;
  accessToken: string;
  refreshToken: string;
  jwe: string;
};

type BackendRefreshResponse = {
  user?: User;
  accessToken: string;
  refreshToken: string;
};

const backendBaseUrl = () =>
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  DEFAULT_BACKEND_URL;

const backendUrl = (path: string) =>
  `${backendBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

const unwrapPayload = <T,>(payload: ApiResponse<T> | T): T => {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as ApiResponse<T>).data;
  }

  return payload as T;
};

const extractErrorMessage = (payload: unknown) => {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const value = record.error ?? record.message;
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return "Falha ao autenticar";
};

const decodeJwtExpiresAt = (token?: string) => {
  if (!token) return 0;

  try {
    const [, payload] = token.split(".");
    if (!payload) return 0;
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      exp?: number;
    };

    return decoded.exp ? decoded.exp * 1000 : 0;
  } catch {
    return 0;
  }
};

const refreshBackendToken = async (token: {
  accessToken?: string;
  refreshToken?: string;
  jwe?: string;
}) => {
  if (!token.refreshToken) {
    return { ...token, error: "RefreshTokenMissing" as const };
  }

  try {
    const response = await fetch(backendUrl("/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: token.refreshToken }),
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as
      | ApiResponse<BackendRefreshResponse>
      | BackendRefreshResponse
      | null;

    if (!response.ok || !payload) {
      return { ...token, error: "RefreshTokenError" as const };
    }

    const refreshed = unwrapPayload(payload);
    return {
      ...token,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      accessTokenExpiresAt: decodeJwtExpiresAt(refreshed.accessToken),
      error: undefined,
    };
  } catch {
    return { ...token, error: "RefreshTokenError" as const };
  }
};

export { refreshBackendToken };

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string" ? credentials.email : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

        const response = await fetch(backendUrl("/auth/login"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as
          | ApiResponse<BackendLoginResponse>
          | BackendLoginResponse
          | null;

        if (!response.ok || !payload) {
          throw new Error(extractErrorMessage(payload));
        }

        const login = unwrapPayload(payload);
        return {
          ...login.user,
          accessToken: login.accessToken,
          refreshToken: login.refreshToken,
          accessTokenExpiresAt: decodeJwtExpiresAt(login.accessToken),
          jwe: login.jwe,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.accessTokenExpiresAt = user.accessTokenExpiresAt;
        token.jwe = user.jwe;
      }

      if (trigger === "update" && session) {
        const updated = session as {
          accessToken?: string;
          refreshToken?: string;
          accessTokenExpiresAt?: number;
          jwe?: string;
          error?: "RefreshTokenError" | "RefreshTokenMissing";
        };

        if (typeof updated.accessToken !== "undefined") {
          token.accessToken = updated.accessToken;
        }
        if (typeof updated.refreshToken !== "undefined") {
          token.refreshToken = updated.refreshToken;
        }
        if (typeof updated.accessTokenExpiresAt !== "undefined") {
          token.accessTokenExpiresAt = updated.accessTokenExpiresAt;
        }
        if (typeof updated.jwe !== "undefined") {
          token.jwe = updated.jwe;
        }
        if (typeof updated.error !== "undefined") {
          token.error = updated.error;
        } else {
          delete token.error;
        }

        return token;
      }

      if (
        token.accessTokenExpiresAt &&
        Date.now() < token.accessTokenExpiresAt - 60_000
      ) {
        return token;
      }

      return refreshBackendToken(token);
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.name = token.name;
        session.user.email = token.email ?? "";
      }
      session.error = token.error;

      return session;
    },
  },
});
