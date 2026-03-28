"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { buttonVariants } from "@/components/ui/button-variants";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(2, "Informe o nome"),
  email: z.string().email("Informe um email valido"),
  password: z.string().min(6, "Senha minima de 6 caracteres"),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setSuccess(null);
    try {
      await apiRequest("/auth/register", { method: "POST", body: values });
      setSuccess("Cadastro realizado. Voce ja pode entrar.");
      setTimeout(() => router.push("/login"), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao cadastrar");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-16">
      <Card className="w-full max-w-lg rounded-3xl border border-border/60 bg-white/80 p-8 shadow-lg">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Cadastro docente
          </p>
          <h1 className="text-3xl font-semibold text-foreground">
            Criar conta
          </h1>
          <p className="text-sm text-muted-foreground">
            Use seu email institucional para acessar o painel.
          </p>
        </div>
        <form
          className="mt-6 flex flex-col gap-5"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" placeholder="Prof. Nome" {...register("name")} />
          </div>
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
          {success ? (
            <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
              {success}
            </div>
          ) : null}
          {error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? "Criando..." : "Criar conta"}
          </Button>
        </form>
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Ja tem conta?{" "}
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "link" }))}
          >
            Entrar
          </Link>
        </div>
      </Card>
    </div>
  );
}
