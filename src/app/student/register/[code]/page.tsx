"use client";

import { useParams } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";

import {
  FormCheckbox,
  FormEmailInput,
  FormInput,
  FormPhoneInput,
} from "@/components/forms/form-fields";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast-provider";
import { apiRequest } from "@/lib/api";
import { normalizePhone } from "@/lib/phone";
import type { ApiMessage } from "@/lib/types";
import { emailRules, phoneRules } from "@/lib/validation";

type StudentRegisterForm = {
  studentId: string;
  name: string;
  email: string;
  phone: string;
  consent: boolean;
};

export default function StudentRegisterPage() {
  const params = useParams();
  const code = params?.code as string;
  const { showToast } = useToast();

  const form = useForm<StudentRegisterForm>({
    defaultValues: {
      studentId: "",
      name: "",
      email: "",
      phone: "",
      consent: false,
    },
  });

  const handleSubmit = async (values: StudentRegisterForm) => {
    try {
      const res = await apiRequest<ApiMessage>(
        `/invite/self-register/${code}`,
        {
          method: "POST",
          body: {
            ...values,
            phone: normalizePhone(values.phone ?? ""),
          },
        }
      );
      showToast({ title: res.message ?? "Cadastro realizado", variant: "success" });
      form.reset();
    } catch (err) {
      showToast({
        title:
          err instanceof Error ? err.message : "Este aluno ja possui cadastro",
        variant: "error",
      });
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
            Complete seu cadastro
          </h1>
          <p className="text-sm text-muted-foreground">
            Se sua matricula ja foi registrada pelo professor, preencha os dados abaixo para liberar os comunicados por email e WhatsApp.
          </p>
        </div>
        <FormProvider {...form}>
          <form
            className="mt-6 flex flex-col gap-5"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            <FormInput<StudentRegisterForm>
              name="studentId"
              label="Matricula"
              rules={{ required: "Informe a matrícula" }}
            />
            <FormInput<StudentRegisterForm>
              name="name"
              label="Nome"
              rules={{ required: "Informe seu nome" }}
            />
            <FormEmailInput<StudentRegisterForm>
              name="email"
              label="Email"
              rules={emailRules("Informe seu email")}
            />
            <FormPhoneInput<StudentRegisterForm>
              name="phone"
              label="Telefone"
              rules={phoneRules("Informe seu telefone")}
            />
            <FormCheckbox<StudentRegisterForm>
              name="consent"
              label="Aceito receber comunicados automatizados desta disciplina por email e WhatsApp para fins acadêmicos."
              rules={{
                validate: (value) =>
                  value === true ||
                  "É necessário aceitar o recebimento de comunicados",
              }}
            />
            <Button type="submit">Ativar meus contatos</Button>
          </form>
        </FormProvider>
      </Card>
    </div>
  );
}
