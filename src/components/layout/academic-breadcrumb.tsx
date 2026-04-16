import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type AcademicBreadcrumbProps = {
  items: BreadcrumbItem[];
  className?: string;
};

export function AcademicBreadcrumb({
  items,
  className,
}: AcademicBreadcrumbProps) {
  return (
    <nav
      aria-label="Caminho"
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-white/90 px-4 py-3 text-sm",
        className
      )}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={`${item.label}-${index}`} className="flex items-center gap-2">
            {index > 0 ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : null}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="font-medium text-muted-foreground transition hover:text-foreground"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  "font-medium",
                  isLast ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}

