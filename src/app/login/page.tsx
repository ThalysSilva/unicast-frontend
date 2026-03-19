"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, setAuth } from "@/lib/api";
import type { ApiResponse, AuthSession } from "@/lib/types";

const schema = z.object({
  email: z.string().email("Informe um email valido"),
  password: z.string().min(4, "Informe a senha"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      const payload = await apiRequest<ApiResponse<AuthSession>>("/auth/login", {
        method: "POST",
        body: values,
      });
      if (payload?.data) {
        setAuth(payload.data);
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao autenticar");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-16">
      <Card className="w-full max-w-lg rounded-3xl border border-border/60 bg-white/80 p-8 shadow-lg">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Acesso docente
          </p>
          <h1 className="text-3xl font-semibold text-foreground">
            Bem-vindo de volta
          </h1>
          <p className="text-sm text-muted-foreground">
            Entre para gerenciar alunos, cursos e mensagens.
          </p>
        </div>
        <form
          className="mt-6 flex flex-col gap-5"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="prof@escola.com"
              {...register("email")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" {...register("password")} />
          </div>
          {error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
