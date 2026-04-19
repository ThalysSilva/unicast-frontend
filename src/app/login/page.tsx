"use client";

import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";

import { FormEmailInput, FormInput } from "@/components/forms/form-fields";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast-provider";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import { apiRequest, setAuth } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ApiResponse, AuthSession } from "@/lib/types";

const schema = z.object({
  email: z.string().email("Informe um email válido"),
  password: z.string().min(4, "Informe a senha"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const {
    handleSubmit,
    formState: { isSubmitting },
  } = form;

  const onSubmit = async (values: FormValues) => {
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
      showToast({
        title: err instanceof Error ? err.message : "Falha ao autenticar",
        variant: "error",
      });
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
        <FormProvider {...form}>
          <form
            className="mt-6 flex flex-col gap-5"
            onSubmit={handleSubmit(onSubmit)}
          >
            <FormEmailInput<FormValues>
              name="email"
              label="Email"
              placeholder="prof@escola.com"
            />
            <FormInput<FormValues> name="password" label="Senha" type="password" />
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </FormProvider>
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Ainda não tem conta?{" "}
          <Link
            href="/register"
            className={cn(buttonVariants({ variant: "link" }))}
          >
            Criar conta
          </Link>
        </div>
      </Card>
    </div>
  );
}
