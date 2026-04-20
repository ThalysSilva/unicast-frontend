"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useState } from "react";

import { ToastProvider } from "@/components/ui/toast-provider";
import { getQueryClient } from "@/lib/react-query";

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => getQueryClient());

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
