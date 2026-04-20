import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
    error?: "RefreshTokenError" | "RefreshTokenMissing";
  }

  interface User {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: number;
    jwe: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpiresAt?: number;
    jwe?: string;
    error?: "RefreshTokenError" | "RefreshTokenMissing";
  }
}
