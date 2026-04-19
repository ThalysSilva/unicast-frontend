"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";

import { FormEmailInput, FormInput } from "@/components/forms/form-fields";
import { buttonVariants } from "@/components/ui/button-variants";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast-provider";
import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(2, "Informe o nome"),
  email: z.string().email("Informe um email válido"),
  password: z.string().min(6, "Senha mínima de 6 caracteres"),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const {
    handleSubmit,
    formState: { isSubmitting },
  } = form;

  const onSubmit = async (values: FormValues) => {
    try {
      await apiRequest("/auth/register", { method: "POST", body: values });
      showToast({
        title: "Cadastro realizado. Você já pode entrar.",
        variant: "success",
      });
      setTimeout(() => router.push("/login"), 800);
    } catch (err) {
      showToast({
        title: err instanceof Error ? err.message : "Falha ao cadastrar",
        variant: "error",
      });
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
        <FormProvider {...form}>
          <form
            className="mt-6 flex flex-col gap-5"
            onSubmit={handleSubmit(onSubmit)}
          >
            <FormInput<FormValues>
              name="name"
              label="Nome"
              placeholder="Prof. Nome"
            />
            <FormEmailInput<FormValues>
              name="email"
              label="Email"
              placeholder="prof@escola.com"
            />
            <FormInput<FormValues> name="password" label="Senha" type="password" />
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? "Criando..." : "Criar conta"}
            </Button>
          </form>
        </FormProvider>
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
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
