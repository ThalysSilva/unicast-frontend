"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { CheckCircle2 } from "lucide-react";

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
  noPhone: boolean;
  consent: boolean;
};

export default function StudentRegisterPage() {
  const params = useParams();
  const code = params?.code as string;
  const { showToast } = useToast();
  const [isRegistered, setIsRegistered] = useState(false);

  const form = useForm<StudentRegisterForm>({
    defaultValues: {
      studentId: "",
      name: "",
      email: "",
      phone: "",
      noPhone: false,
      consent: false,
    },
  });
  const noPhone = form.watch("noPhone");

  useEffect(() => {
    if (noPhone) {
      form.setValue("phone", "");
      form.clearErrors("phone");
    }
  }, [form, noPhone]);

  const handleSubmit = async (values: StudentRegisterForm) => {
    try {
      await apiRequest<ApiMessage>(`/invite/self-register/${code}`, {
        method: "POST",
        body: {
          ...values,
          phone: values.noPhone ? "" : normalizePhone(values.phone ?? ""),
        },
      });
      setIsRegistered(true);
      form.reset();
    } catch (err) {
      showToast({
        title:
          err instanceof Error ? err.message : "Este aluno já possui cadastro",
        variant: "error",
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-16">
      <Card className="w-full max-w-lg rounded-3xl border border-border/60 bg-white/80 p-8 shadow-lg">
        {isRegistered ? (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="flex size-14 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
              <CheckCircle2 className="size-7" aria-hidden="true" />
            </div>
            <p className="mt-5 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Auto-registro
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-foreground">
              Cadastro efetuado com sucesso!
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Seus contatos foram registrados. A partir de agora, você pode
              receber os comunicados acadêmicos desta disciplina pelos canais
              informados.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Auto-registro
              </p>
              <h1 className="text-3xl font-semibold text-foreground">
                Complete seu cadastro
              </h1>
              <p className="text-sm text-muted-foreground">
                Se sua matrícula já foi registrada pelo professor, preencha os dados abaixo para liberar os comunicados por email e, quando disponível, por WhatsApp.
              </p>
            </div>
            <FormProvider {...form}>
              <form
                className="mt-6 flex flex-col gap-5"
                onSubmit={form.handleSubmit(handleSubmit)}
              >
                <FormInput<StudentRegisterForm>
                  name="studentId"
                  label="Matrícula"
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
                  disabled={noPhone}
                  helper={
                    noPhone
                      ? "Marcado como sem número de contato."
                      : undefined
                  }
                  rules={{
                    validate: (value: string) =>
                      noPhone ||
                      phoneRules("Informe seu telefone").validate(value),
                  }}
                />
                <FormCheckbox<StudentRegisterForm>
                  name="noPhone"
                  label="Não possuo número de contato"
                  description="Você ainda poderá receber avisos por email."
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
          </>
        )}
      </Card>
    </div>
  );
}
