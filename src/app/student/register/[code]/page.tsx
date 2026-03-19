"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api";
import type { ApiMessage } from "@/lib/types";

export default function StudentRegisterPage() {
  const params = useParams();
  const code = params?.code as string;
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      studentId: "",
      name: "",
      email: "",
      phone: "",
    },
  });

  const handleSubmit = async (values: {
    studentId: string;
    name?: string;
    email?: string;
    phone?: string;
  }) => {
    setMessage(null);
    setError(null);
    try {
      const res = await apiRequest<ApiMessage>(
        `/invite/self-register/${code}`,
        {
          method: "POST",
          body: values,
        }
      );
      setMessage(res.message ?? "Cadastro realizado");
      form.reset();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Este aluno ja possui cadastro"
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-16">
      <Card className="w-full max-w-lg rounded-3xl border border-border/60 bg-white/80 p-8 shadow-lg">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Auto-registro
          </p>
          <h1 className="text-3xl font-semibold text-foreground">
            Cadastro do aluno
          </h1>
          <p className="text-sm text-muted-foreground">
            Preencha os dados abaixo para confirmar sua inscricao.
          </p>
        </div>
        <form
          className="mt-6 flex flex-col gap-5"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <div className="space-y-2">
            <Label htmlFor="studentId">Matricula</Label>
            <Input id="studentId" {...form.register("studentId")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" {...form.register("name")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register("email")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" {...form.register("phone")} />
          </div>
          {message ? (
            <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          <Button type="submit">Finalizar cadastro</Button>
        </form>
      </Card>
    </div>
  );
}
