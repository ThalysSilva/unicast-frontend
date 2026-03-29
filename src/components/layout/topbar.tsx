"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { clearAuth, getAuth, onAuthChange } from "@/lib/api";

export const Topbar = () => {
  const router = useRouter();
  const [userName, setUserName] = useState("Professor");

  useEffect(() => {
    const syncUser = () => {
      setUserName(getAuth()?.user?.name ?? "Professor");
    };

    syncUser();
    return onAuthChange(syncUser);
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
        <p className="text-sm font-medium text-foreground">{userName}</p>
      </div>
      <Button variant="outline" size="sm" onClick={handleLogout}>
        Sair
      </Button>
    </div>
  );
};
