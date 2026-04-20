"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [router, status]);

  if (status === "loading") {
    return null;
  }

  return <>{children}</>;
};
