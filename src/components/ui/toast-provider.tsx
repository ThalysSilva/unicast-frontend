"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type ToastVariant = "error" | "success";

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

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, variant }: Omit<ToastItem, "id">) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((current) => [...current, { id, title, variant }]);
      window.setTimeout(() => dismissToast(id), TOAST_DURATION_MS);
    },
    [dismissToast]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={[
              "pointer-events-auto rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur",
              toast.variant === "error"
                ? "border-destructive/30 bg-destructive text-destructive-foreground"
                : "border-primary/30 bg-primary text-primary-foreground",
            ].join(" ")}
            role="alert"
            aria-live="assertive"
          >
            {toast.title}
          </div>
        ))}
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
      title: error.message,
      variant: "error",
    });
  }, [enabled, error, showToast]);

  return null;
}
