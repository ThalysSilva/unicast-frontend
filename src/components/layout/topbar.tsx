"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export const Topbar = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const userName = session?.user?.name ?? "Professor";

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Sessão ativa
        </p>
        <p className="text-sm font-medium text-foreground">{userName}</p>
      </div>
      <Button variant="outline" size="sm" onClick={handleLogout}>
        Sair
      </Button>
    </div>
  );
};
