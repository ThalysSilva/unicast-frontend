import { LoadingState } from "@/components/ui/loading-state";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <LoadingState
        label="Carregando a interface..."
        className="min-h-48 w-full max-w-lg bg-white/80"
      />
    </main>
  );
}
