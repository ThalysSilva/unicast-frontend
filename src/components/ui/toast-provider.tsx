"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

import { extractErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

type ToastVariant = "error" | "success" | "warning" | "info";

type ToastItem = {
  id: number;
  title: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  showToast: (toast: Omit<ToastItem, "id">) => void;
};

const TOAST_DURATION_MS = 4000;

const ToastContext = createContext<ToastContextValue | null>(null);

const capitalizeMessage = (message: string) => {
  const trimmed = message.trim();
  if (!trimmed) return trimmed;

  return trimmed.charAt(0).toLocaleUpperCase("pt-BR") + trimmed.slice(1);
};

const toastStyles = {
  error: {
    icon: AlertTriangle,
    className:
      "border-red-200 bg-red-50 text-red-950 shadow-red-950/10",
    iconClassName: "text-red-700",
  },
  success: {
    icon: CheckCircle2,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-950 shadow-emerald-950/10",
    iconClassName: "text-emerald-700",
  },
  warning: {
    icon: AlertTriangle,
    className:
      "border-amber-200 bg-amber-50 text-amber-950 shadow-amber-950/10",
    iconClassName: "text-amber-700",
  },
  info: {
    icon: Info,
    className: "border-sky-200 bg-sky-50 text-sky-950 shadow-sky-950/10",
    iconClassName: "text-sky-700",
  },
} satisfies Record<
  ToastVariant,
  {
    icon: typeof AlertTriangle;
    className: string;
    iconClassName: string;
  }
>;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, variant }: Omit<ToastItem, "id">) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const message = capitalizeMessage(extractErrorMessage(title));
      setToasts((current) => [
        ...current,
        { id, title: message, variant },
      ]);
      window.setTimeout(() => dismissToast(id), TOAST_DURATION_MS);
    },
    [dismissToast]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => {
          const style = toastStyles[toast.variant];
          const Icon = style.icon;

          return (
            <div
              key={toast.id}
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-lg border px-3 py-3 text-sm font-medium shadow-lg backdrop-blur",
                style.className
              )}
              role="alert"
              aria-live="assertive"
            >
              <Icon
                className={cn("mt-0.5 size-4 shrink-0", style.iconClassName)}
                aria-hidden="true"
              />
              <p className="min-w-0 flex-1 leading-snug">{toast.title}</p>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="rounded-md p-1 text-current/65 transition hover:bg-black/5 hover:text-current focus-visible:ring-2 focus-visible:ring-current/25 focus-visible:outline-none"
                aria-label="Fechar aviso"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
}

export function ToastOnError({
  error,
  enabled = true,
}: {
  error: Error | null | undefined;
  enabled?: boolean;
}) {
  const { showToast } = useToast();

  useEffect(() => {
    if (!enabled || !error?.message) return;

    showToast({
      title: extractErrorMessage(error.message),
      variant: "error",
    });
  }, [enabled, error, showToast]);

  return null;
}
