"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { getAuth } from "@/lib/api";

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();

  useEffect(() => {
    const auth = getAuth();
    if (!auth?.accessToken) {
      router.replace("/login");
    }
  }, [router]);

  return <>{children}</>;
};
