"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValueFromOptions,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast-provider";
import { ApiError, apiRequest, extractData } from "@/lib/api";
import type { ApiResponse, Course } from "@/lib/types";

const toDateTimeLocalValue = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
};

const buildEndOfDay = (daysFromNow: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(23, 59, 0, 0);
  return toDateTimeLocalValue(date);
};

const extractInviteCode = (payload: unknown) => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const payloadRecord = payload as Record<string, unknown>;

  const nestedData =
    "data" in payloadRecord &&
    payloadRecord.data &&
    typeof payloadRecord.data === "object"
      ? (payloadRecord.data as Record<string, unknown>)
      : null;

  if (nestedData?.code && typeof nestedData.code === "string") {
    return nestedData.code;
  }

  if ("code" in payloadRecord && typeof payloadRecord.code === "string") {
    return payloadRecord.code;
  }

  const fallbackNested = nestedData
    ? Object.values(nestedData).find((value) => typeof value === "string")
    : null;
  if (typeof fallbackNested === "string") {
    return fallbackNested;
  }

  const fallbackTopLevel = Object.values(payloadRecord).find(
    (value) => typeof value === "string" && value !== payloadRecord.message
  );
  return typeof fallbackTopLevel === "string" ? fallbackTopLevel : null;
};

type InvitePayload = {
  id: string;
  courseId: string;
  code: string;
  expiresAt?: string | null;
  active: boolean;
};

export default function InvitesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [invite, setInvite] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const { showToast } = useToast();

  const form = useForm({
    defaultValues: { courseId: "", expiresAt: "" },
  });
  const courseId = useWatch({ control: form.control, name: "courseId" });
  const courseOptions = courses.map((course) => ({
    value: course.id,
    label: course.name,
  }));

  const loadCurrentInvite = async (selectedCourseId: string) => {
    if (!selectedCourseId) {
      setInvite(null);
      return null;
    }

    try {
      const inviteRes = await apiRequest<ApiResponse<InvitePayload | null>>(
        `/invite/${selectedCourseId}/current`
      );
      const currentInvite = extractData(inviteRes);
      const currentCode = currentInvite?.code ?? null;
      setInvite(currentCode);
      return currentCode;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setInvite(null);
        return null;
      }
      throw error;
    }
  };

  useEffect(() => {
    setOrigin(window.location.origin);
    const load = async () => {
      const coursesRes = await apiRequest<ApiResponse<Course[]>>("/course");
      setCourses(extractData(coursesRes));
    };
    load();
  }, []);

  useEffect(() => {
    loadCurrentInvite(courseId).catch(() => {
      showToast({
        title: "Nao foi possivel carregar o convite atual da disciplina.",
        variant: "error",
      });
    });
  }, [courseId, showToast]);

  const createInvite = async (values: {
    courseId: string;
    expiresAt?: string;
  }) => {
    if (!values.courseId) {
      showToast({ title: "Selecione uma disciplina", variant: "error" });
      return;
    }
    const payload = values.expiresAt
      ? { expiresAt: new Date(values.expiresAt).toISOString() }
      : undefined;

    const res = await apiRequest<ApiResponse<Record<string, string>> | Record<string, string>>(
      `/invite/${values.courseId}`,
      {
        method: "POST",
        body: payload,
      }
    );
    const code = extractInviteCode(res);
    if (code) {
      setInvite(code);
    }

    const currentCode = await loadCurrentInvite(values.courseId);
    if (!currentCode && !code) {
      showToast({
        title: "O convite foi criado, mas o codigo nao voltou na resposta.",
        variant: "error",
      });
      return;
    }
    showToast({ title: "Convite criado com sucesso", variant: "success" });
  };

  const inviteLink = invite ? `${origin}/student/register/${invite}` : "";

  const copyInviteLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    showToast({ title: "Link copiado", variant: "success" });
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Convites"
        description="Gere o link da disciplina para projetar em sala, colar no mural ou compartilhar com a turma. E o aluno completa o cadastro sozinho."
        badge="Link da turma"
      />

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
          <h2 className="text-lg font-semibold">Criar convite da disciplina</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            O convite serve para o aluno informar matricula, nome, email e telefone sem o professor precisar coletar isso manualmente.
          </p>
          <form
            className="mt-4 flex flex-col gap-4"
            onSubmit={form.handleSubmit(createInvite)}
          >
            <div className="space-y-2">
              <Label>Disciplina</Label>
              <Select
                value={courseId}
                onValueChange={(value) => form.setValue("courseId", value ?? "")}
              >
                <SelectTrigger>
                  <SelectValueFromOptions
                    placeholder="Selecione"
                    options={courseOptions}
                    value={courseId}
                  />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-exp">Expira em</Label>
              <Input
                id="invite-exp"
                type="datetime-local"
                {...form.register("expiresAt")}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => form.setValue("expiresAt", buildEndOfDay(0))}
                >
                  Hoje, 23:59
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => form.setValue("expiresAt", buildEndOfDay(1))}
                >
                  Amanhã, 23:59
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => form.setValue("expiresAt", buildEndOfDay(7))}
                >
                  7 dias
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => form.setValue("expiresAt", "")}
                >
                  Sem expiração
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                O horário é preenchido no seu fuso local e convertido automaticamente para o formato aceito pelo backend.
              </p>
            </div>
            <Button type="submit">Gerar convite</Button>
          </form>
        </Card>

        <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
          <h2 className="text-lg font-semibold">Compartilhar com a turma</h2>
          {invite ? (
            <div className="mt-4 space-y-3">
              <Badge variant="outline">Codigo: {invite}</Badge>
              <div className="rounded-2xl border border-border/60 bg-background px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Link de auto-cadastro
                </p>
                <p className="mt-2 break-all text-sm font-medium text-foreground">
                  {inviteLink || `/student/register/${invite}`}
                </p>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Use esse link no quadro, no slide da aula ou em um QR code externo.</p>
                <p>O aluno acessa, informa a matricula e completa os dados de contato.</p>
              </div>
              <Button variant="outline" onClick={copyInviteLink}>
                Copiar link
              </Button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Gere um convite para visualizar o link que sera compartilhado com a turma.
            </p>
          )}
        </Card>
      </section>
    </div>
  );
}
