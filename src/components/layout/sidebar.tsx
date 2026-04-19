"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  MessageSquare,
  PlugZap,
  UserPlus,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/setup", label: "Estrutura e turma", icon: ClipboardList },
  { href: "/students", label: "Matrículas", icon: UserPlus },
  { href: "/messages", label: "Mensagens", icon: MessageSquare },
  { href: "/integrations", label: "Integrações", icon: PlugZap },
  { href: "/invites", label: "Convites", icon: BookOpen },
];

export const Sidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-full flex-col gap-6 rounded-3xl border border-sidebar-border bg-sidebar px-5 py-6 shadow-sm">
      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Unicast
        </span>
        <h2 className="text-xl font-semibold text-sidebar-foreground">
          Central Docente
        </h2>
      </div>
      <nav className="flex flex-1 flex-col gap-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === "/setup" &&
              (pathname.startsWith("/campuses/") ||
                pathname.startsWith("/programs/") ||
                pathname.startsWith("/disciplines/")));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="rounded-2xl border border-sidebar-border bg-white/70 p-4 text-xs text-muted-foreground shadow-sm">
        <p className="font-medium text-sidebar-foreground">Atalhos</p>
        <p className="mt-2">Estruture a disciplina, registre matrículas e compartilhe o convite com a turma.</p>
      </div>
    </aside>
  );
};
