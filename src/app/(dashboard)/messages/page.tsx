"use client";

import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToastOnError, useToast } from "@/components/ui/toast-provider";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { apiRequest, extractData, getAuth } from "@/lib/api";
import { formatPhone, studentStatusLabel } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import type {
  ApiMessage,
  ApiResponse,
  SmtpInstance,
  Student,
  WhatsappInstance,
} from "@/lib/types";

const EMPTY_STUDENTS: Student[] = [];
const EMPTY_SMTP: SmtpInstance[] = [];
const EMPTY_WHATSAPP: WhatsappInstance[] = [];

export default function MessagesPage() {
  const [selected, setSelected] = useState<string[]>([]);
  const { showToast } = useToast();

  const form = useForm({
    defaultValues: {
      from: "",
      subject: "",
      body: "",
      smtp_id: "",
      whatsapp_id: "",
    },
  });

  const studentsQuery = useApiQuery({
    queryKey: queryKeys.students(),
    queryFn: async () => {
      const response = await apiRequest<ApiResponse<Student[]>>("/student");
      return extractData(response);
    },
  });

  const smtpQuery = useApiQuery({
    queryKey: queryKeys.smtp(),
    queryFn: async () => {
      const response = await apiRequest<ApiResponse<SmtpInstance[]>>(
        "/smtp/instance"
      );
      return extractData(response);
    },
  });

  const whatsappQuery = useApiQuery({
    queryKey: queryKeys.whatsapp(),
    queryFn: async () => {
      const response = await apiRequest<
        ApiResponse<{ instances: WhatsappInstance[] }>
      >("/whatsapp/instance");
      return extractData(response).instances ?? [];
    },
  });

  const sendMessageMutation = useApiMutation<
    ApiMessage,
    {
      from: string;
      subject: string;
      body: string;
      smtp_id: string;
      whatsapp_id: string;
    }
  >({
    mutationFn: async (values) => {
      const auth = getAuth();
      return apiRequest<ApiMessage>("/message/send", {
        method: "POST",
        body: {
          ...values,
          to: validSelected,
          jwe: auth?.jwe ?? "",
        },
      });
    },
    onSuccess: (res) => {
      showToast({ title: res.message ?? "Mensagem enviada", variant: "success" });
    },
  });

  const students = studentsQuery.data ?? EMPTY_STUDENTS;
  const smtp = smtpQuery.data ?? EMPTY_SMTP;
  const whatsapp = whatsappQuery.data ?? EMPTY_WHATSAPP;
  const isLoading =
    studentsQuery.isLoading || smtpQuery.isLoading || whatsappQuery.isLoading;

  const toggleStudent = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const validSelected = selected.filter((id) =>
    students.some((student) => student.id === id)
  );
  const selectedCount = validSelected.length;
  const queryError = useMemo(
    () => studentsQuery.error ?? smtpQuery.error ?? whatsappQuery.error ?? null,
    [studentsQuery.error, smtpQuery.error, whatsappQuery.error]
  );
  const smtpId = useWatch({ control: form.control, name: "smtp_id" });
  const whatsappId = useWatch({ control: form.control, name: "whatsapp_id" });

  const handleSend = async (values: {
    from: string;
    subject: string;
    body: string;
    smtp_id: string;
    whatsapp_id: string;
  }) => {
    if (!validSelected.length) {
      showToast({ title: "Selecione ao menos um aluno", variant: "error" });
      return;
    }

    await sendMessageMutation.mutateAsync(values);
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Mensagens"
        description="Envie comunicados via email e WhatsApp usando os alunos cadastrados."
        badge="Envio imediato"
      />
      <ToastOnError error={queryError} />

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
          <h2 className="text-lg font-semibold">Selecionar alunos</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Marque quem deve receber a mensagem. O envio usa os IDs dos alunos.
          </p>
          <div className="mt-4 grid gap-3">
            {isLoading ? (
              <LoadingState label="Carregando alunos e integracoes..." />
            ) : students.length ? (
              students.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => toggleStudent(student.id)}
                  className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    selected.includes(student.id)
                      ? "border-primary bg-primary/10"
                      : "border-border/60 bg-background"
                  }`}
                >
                  <Checkbox checked={selected.includes(student.id)} />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {student.name ?? "Sem nome"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {student.email ?? "-"} · {formatPhone(student.phone)}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {studentStatusLabel(student.status)}
                  </Badge>
                </button>
              ))
            ) : (
              <EmptyState
                title="Nenhum aluno disponivel"
                description="Cadastre ou importe alunos antes de enviar comunicados."
              />
            )}
          </div>
        </Card>

        <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
          <h2 className="text-lg font-semibold">Configurar envio</h2>
          <form
            className="mt-4 flex flex-col gap-4"
            onSubmit={form.handleSubmit(handleSend)}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>SMTP</Label>
                <Select
                  value={smtpId}
                  onValueChange={(value) =>
                    form.setValue("smtp_id", value ?? "")
                  }
                >
                  <SelectTrigger disabled={isLoading || sendMessageMutation.isPending}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {smtp.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Select
                  value={whatsappId}
                  onValueChange={(value) =>
                    form.setValue("whatsapp_id", value ?? "")
                  }
                >
                  <SelectTrigger disabled={isLoading || sendMessageMutation.isPending}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {whatsapp.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.instanceName ?? item.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="msg-from">Remetente</Label>
              <Input
                id="msg-from"
                disabled={sendMessageMutation.isPending}
                {...form.register("from")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="msg-subject">Assunto</Label>
              <Input
                id="msg-subject"
                disabled={sendMessageMutation.isPending}
                {...form.register("subject")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="msg-body">Mensagem</Label>
              <Textarea
                id="msg-body"
                rows={5}
                disabled={sendMessageMutation.isPending}
                {...form.register("body")}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
              {selectedCount} aluno(s) selecionado(s)
              </span>
              <Button type="submit" disabled={isLoading || sendMessageMutation.isPending}>
                {sendMessageMutation.isPending
                  ? "Enviando..."
                  : "Enviar mensagem"}
              </Button>
            </div>
          </form>
        </Card>
      </section>
    </div>
  );
}
