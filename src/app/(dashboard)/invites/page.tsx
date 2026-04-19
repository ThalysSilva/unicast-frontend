"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import { FormInput } from "@/components/forms/form-fields";
import { InviteQrDialog } from "@/components/invites/invite-qr-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValueFromOptions,
} from "@/components/ui/select";
import { ToastOnError, useToast } from "@/components/ui/toast-provider";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { ApiError, apiRequest, extractData } from "@/lib/api";
import { loadAcademicStructure } from "@/lib/academic-structure";
import {
  formatInviteExpiration,
  inviteStatusLabel,
  type InvitePayload,
} from "@/lib/invites";
import type { ApiMessage, ApiResponse } from "@/lib/types";

type InviteFormValues = {
  campusId: string;
  disciplineId: string;
  expiresAt: string;
};

const toDateTimeLocalValue = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
};

const buildMinimumInviteExpiration = () => {
  const date = new Date();
  date.setSeconds(0, 0);
  date.setMinutes(date.getMinutes() + 1);
  return toDateTimeLocalValue(date);
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

export default function InvitesPage() {
  const searchParams = useSearchParams();
  const [invite, setInvite] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const { showToast } = useToast();

  const form = useForm<InviteFormValues>({
    defaultValues: { campusId: "", disciplineId: "", expiresAt: "" },
  });
  const campusId = useWatch({ control: form.control, name: "campusId" });
  const disciplineId = useWatch({ control: form.control, name: "disciplineId" });
  const expiresAt = useWatch({ control: form.control, name: "expiresAt" });
  const requestedDisciplineId = searchParams.get("disciplineId") ?? "";
  const structureQuery = useApiQuery({
    queryKey: ["academic-structure"],
    queryFn: loadAcademicStructure,
  });
  const invitesQuery = useApiQuery({
    queryKey: ["invites", { disciplineId }],
    enabled: Boolean(disciplineId),
    queryFn: async () => {
      const response = await apiRequest<ApiResponse<InvitePayload[]>>(
        `/invite/${disciplineId}`
      );
      const data = extractData(response);
      return Array.isArray(data) ? data : [];
    },
  });
  const deleteInviteMutation = useApiMutation<ApiMessage, string>({
    mutationFn: (inviteId) =>
      apiRequest<ApiMessage>(`/invite/${inviteId}`, { method: "DELETE" }),
    onSuccess: async (res) => {
      showToast({
        title: res.message ?? "Convite removido com sucesso",
        variant: "success",
      });
      await Promise.all([invitesQuery.refetch(), loadCurrentInvite(disciplineId)]);
    },
  });
  const disciplines = structureQuery.data?.disciplines ?? [];
  const campuses = structureQuery.data?.campuses ?? [];
  const campusHasDisciplines = (selectedCampusId: string) =>
    disciplines.some((discipline) => discipline.campusId === selectedCampusId);
  const campusDisciplines = campusId
    ? disciplines.filter((discipline) => discipline.campusId === campusId)
    : [];
  const selectedDiscipline = disciplines.find((discipline) => discipline.id === disciplineId);
  const generatedInvites = invitesQuery.data ?? [];
  const campusOptions = campuses.map((campus) => ({
    value: campus.id,
    label: campusHasDisciplines(campus.id)
      ? campus.name
      : `${campus.name} (sem disciplina registrada)`,
  }));
  const disciplineOptions = campusDisciplines.map((discipline) => ({
    value: discipline.id,
    label: `${discipline.programName} / ${discipline.name}`,
  })).sort((first, second) =>
    first.label.localeCompare(second.label, "pt-BR", { sensitivity: "base" })
  );
  const sortedCampusDisciplines = [...campusDisciplines].sort((first, second) => {
    const firstLabel = `${first.programName} / ${first.name}`;
    const secondLabel = `${second.programName} / ${second.name}`;

    return firstLabel.localeCompare(secondLabel, "pt-BR", {
      sensitivity: "base",
    });
  });

  const loadCurrentInvite = async (selectedDisciplineId: string) => {
    if (!selectedDisciplineId) {
      setInvite(null);
      return null;
    }

    try {
      const inviteRes = await apiRequest<ApiResponse<InvitePayload | null>>(
        `/invite/${selectedDisciplineId}/current`
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
  }, []);

  useEffect(() => {
    if (!requestedDisciplineId) {
      return;
    }

    const requestedDiscipline = disciplines.find((discipline) => discipline.id === requestedDisciplineId);
    if (!requestedDiscipline) {
      return;
    }

    form.setValue("campusId", requestedDiscipline.campusId);
    form.setValue("disciplineId", requestedDisciplineId);
  }, [disciplines, form, requestedDisciplineId]);

  useEffect(() => {
    loadCurrentInvite(disciplineId).catch(() => {
      showToast({
        title: "Não foi possível carregar o convite atual da disciplina.",
        variant: "error",
      });
    });
  }, [disciplineId, showToast]);

  const createInvite = async (values: {
    campusId: string;
    disciplineId: string;
    expiresAt?: string;
  }) => {
    if (!values.disciplineId) {
      showToast({ title: "Selecione uma disciplina", variant: "error" });
      return;
    }
    if (values.expiresAt && new Date(values.expiresAt).getTime() <= Date.now()) {
      showToast({
        title: "A data de expiração precisa ser posterior ao momento atual.",
        variant: "error",
      });
      return;
    }

    const payload = values.expiresAt
      ? { expiresAt: new Date(values.expiresAt).toISOString() }
      : undefined;

    const res = await apiRequest<ApiResponse<Record<string, string>> | Record<string, string>>(
      `/invite/${values.disciplineId}`,
      {
        method: "POST",
        body: payload,
      }
    );
    const code = extractInviteCode(res);
    if (code) {
      setInvite(code);
    }

    const currentCode = await loadCurrentInvite(values.disciplineId);
    await invitesQuery.refetch();
    if (!currentCode && !code) {
      showToast({
        title: "O convite foi criado, mas o código não voltou na resposta.",
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
  const copyInviteCode = async (code: string) => {
    const link = buildInviteLink(code);
    await navigator.clipboard.writeText(link);
    showToast({ title: "Link copiado", variant: "success" });
  };
  const buildInviteLink = (code: string) =>
    origin && code ? `${origin}/student/register/${code}` : `/student/register/${code}`;
  const minExpiresAt = buildMinimumInviteExpiration();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Convites"
        description="Gere o link da disciplina para projetar em sala, colar no mural ou compartilhar com a turma. E o aluno completa o cadastro sozinho."
        badge="Link da turma"
      />
      <ToastOnError error={structureQuery.error ?? invitesQuery.error} />

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
          <h2 className="text-lg font-semibold">Criar convite da disciplina</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            O convite serve para o aluno informar matrícula, nome, email e telefone sem o professor precisar coletar isso manualmente.
          </p>
          <FormProvider {...form}>
            <form
              className="mt-4 flex flex-col gap-4"
              onSubmit={form.handleSubmit(createInvite)}
            >
            <div className="space-y-2">
              <Label>Campus</Label>
              <Select
                value={campusId}
                onValueChange={(value) => {
                  form.setValue("campusId", value ?? "");
                  form.setValue("disciplineId", "");
                  setInvite(null);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValueFromOptions
                    placeholder={
                      structureQuery.isLoading
                        ? "Carregando campus..."
                        : "Selecione o campus"
                    }
                    options={campusOptions}
                    value={campusId}
                  />
                </SelectTrigger>
                <SelectContent>
                  {campuses.map((campus) => (
                    <SelectItem
                      key={campus.id}
                      value={campus.id}
                      disabled={!campusHasDisciplines(campus.id)}
                    >
                      {campusHasDisciplines(campus.id)
                        ? campus.name
                        : `${campus.name} (sem disciplina registrada)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Curso / disciplina</Label>
              <Select
                value={disciplineId}
                onValueChange={(value) => form.setValue("disciplineId", value ?? "")}
                disabled={!campusId || !campusDisciplines.length}
              >
                <SelectTrigger className="w-full">
                  <SelectValueFromOptions
                    placeholder={
                      structureQuery.isLoading
                        ? "Carregando disciplinas..."
                        : campusId
                          ? campusDisciplines.length
                            ? "Selecione a disciplina"
                            : "Nenhuma disciplina neste campus"
                          : "Selecione um campus primeiro"
                    }
                    options={disciplineOptions}
                    value={disciplineId}
                  />
                </SelectTrigger>
                <SelectContent>
                  {sortedCampusDisciplines.map((discipline) => (
                    <SelectItem key={discipline.id} value={discipline.id}>
                      {discipline.programName} / {discipline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {campusId && !campusDisciplines.length ? (
                <p className="text-xs text-muted-foreground">
                  Cadastre uma disciplina neste campus antes de gerar convites.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <FormInput<InviteFormValues>
                name="expiresAt"
                label="Expira em"
                type="datetime-local"
                min={minExpiresAt}
                rules={{
                  validate: (value) =>
                    !value ||
                    new Date(value).getTime() > Date.now() ||
                    "Escolha um horário posterior ao momento atual.",
                }}
                onBlur={(event) => {
                  if (
                    event.currentTarget.value &&
                    new Date(event.currentTarget.value).getTime() <= Date.now()
                  ) {
                    form.setValue("expiresAt", buildMinimumInviteExpiration(), {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    showToast({
                      title:
                        "A data de expiração foi ajustada para o próximo horário disponível.",
                      variant: "error",
                    });
                  }
                }}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    form.setValue("expiresAt", buildEndOfDay(0), {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                >
                  Hoje, 23:59
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    form.setValue("expiresAt", buildEndOfDay(1), {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                >
                  Amanhã, 23:59
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    form.setValue("expiresAt", buildEndOfDay(7), {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                >
                  7 dias
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    form.setValue("expiresAt", "", {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                >
                  Sem expiração
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                O horário é preenchido no seu fuso local e convertido automaticamente para o formato aceito pelo backend.
              </p>
            </div>
            <Button type="submit" disabled={!disciplineId}>
              Gerar convite
            </Button>
            </form>
          </FormProvider>
        </Card>

        <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
          <h2 className="text-lg font-semibold">Compartilhar com a turma</h2>
          {invite ? (
            <div className="mt-4 space-y-3">
              <Badge variant="outline">Código: {invite}</Badge>
              <div className="rounded-2xl border border-border/60 bg-background px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Link de autocadastro
                </p>
                <p className="mt-2 break-all text-sm font-medium text-foreground">
                  {inviteLink || `/student/register/${invite}`}
                </p>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Use esse link no quadro, no slide da aula ou em um QR code externo.</p>
                <p>O aluno acessa, informa a matrícula e completa os dados de contato.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <InviteQrDialog
                  code={invite}
                  link={inviteLink || `/student/register/${invite}`}
                  campusName={selectedDiscipline?.campusName}
                  disciplineName={selectedDiscipline?.name}
                />
                <Button variant="outline" onClick={copyInviteLink}>
                  Copiar link
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Gere um convite para visualizar o link que será compartilhado com a turma.
            </p>
          )}
        </Card>
      </section>

      <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              Convites gerados pela disciplina selecionada
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Histórico de convites da disciplina selecionada.
            </p>
          </div>
          {disciplineId ? (
            <Badge variant="outline">{generatedInvites.length} link(s)</Badge>
          ) : null}
        </div>

        <div className="mt-5 grid max-h-[560px] gap-3 overflow-y-auto pr-1">
          {!disciplineId ? (
            <p className="rounded-2xl border border-border/60 bg-background px-5 py-4 text-sm text-muted-foreground">
              Selecione uma disciplina para ver os links já gerados.
            </p>
          ) : invitesQuery.isLoading ? (
            <p className="rounded-2xl border border-border/60 bg-background px-5 py-4 text-sm text-muted-foreground">
              Carregando links...
            </p>
          ) : generatedInvites.length ? (
            generatedInvites.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-border/60 bg-background px-5 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{item.code}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <p className="text-sm text-muted-foreground">
                        {formatInviteExpiration(item.expiresAt)}
                      </p>
                      <Badge variant="outline">{inviteStatusLabel(item)}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <InviteQrDialog
                      code={item.code}
                      link={buildInviteLink(item.code)}
                      campusName={selectedDiscipline?.campusName}
                      disciplineName={selectedDiscipline?.name}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => copyInviteCode(item.code)}
                    >
                      Copiar
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={
                        deleteInviteMutation.isPending &&
                        deleteInviteMutation.variables === item.id
                      }
                      onClick={() => deleteInviteMutation.mutate(item.id)}
                    >
                      {deleteInviteMutation.isPending &&
                      deleteInviteMutation.variables === item.id
                        ? "Removendo..."
                        : "Remover"}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-border/60 bg-background px-5 py-4 text-sm text-muted-foreground">
              Nenhum link foi gerado para esta disciplina ainda.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
