import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description: string;
  className?: string;
};

export function EmptyState({
  title,
  description,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-32 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 bg-muted/20 px-6 py-10 text-center",
        className
      )}
    >
      <p className="font-medium text-foreground">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
