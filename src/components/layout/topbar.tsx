"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { clearAuth, getAuth } from "@/lib/api";
import type { AuthSession } from "@/lib/types";

export const Topbar = () => {
  const router = useRouter();
  const [auth, setAuth] = useState<AuthSession | null>(null);

  useEffect(() => {
    setAuth(getAuth());
  }, []);

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Sessao ativa
        </p>
        <p className="text-sm font-medium text-foreground">
          {auth?.user?.name ?? "Professor"}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={handleLogout}>
        Sair
      </Button>
    </div>
  );
};
