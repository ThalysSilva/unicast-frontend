import type { ReactNode } from "react";

import { AuthGuard } from "@/components/layout/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen flex-col gap-6 px-6 py-6">
        <div className="grid flex-1 gap-6 lg:grid-cols-[260px_1fr]">
          <Sidebar />
          <main className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-white/80 p-6 shadow-sm">
            <Topbar />
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
