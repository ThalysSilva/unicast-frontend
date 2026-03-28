import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

type LoadingStateProps = {
  label?: string;
  className?: string;
};

export function LoadingState({
  label = "Carregando...",
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-32 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 bg-muted/30 px-6 py-10 text-center text-sm text-muted-foreground",
        className
      )}
    >
      <LoaderCircle className="size-5 animate-spin text-primary" />
      <p>{label}</p>
    </div>
  );
}
