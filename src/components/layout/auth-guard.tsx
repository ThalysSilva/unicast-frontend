"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { getAuth, onAuthChange } from "@/lib/api";

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();

  useEffect(() => {
    const syncAuthState = () => {
      const auth = getAuth();
      if (!auth?.accessToken) {
        router.replace("/login");
      }
    };

    syncAuthState();
    return onAuthChange(syncAuthState);
  }, [router]);

  return <>{children}</>;
};
