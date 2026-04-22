"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";

import {
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/components/forms/form-fields";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
import { ToastOnError, useToast } from "@/components/ui/toast-provider";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import {
  type AcademicDiscipline,
  loadAcademicStructure,
} from "@/lib/academic-structure";
import { apiRequest, extractData } from "@/lib/api";
import { formatPhone, studentStatusLabel } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { requiredTrimmed } from "@/lib/validation";
import type {
  ApiMessage,
  ApiResponse,
  SmtpInstance,
  Student,
  WhatsappInstance,
} from "@/lib/types";

const EMPTY_STUDENTS: AudienceStudent[] = [];
const EMPTY_DISCIPLINES: AcademicDiscipline[] = [];
const EMPTY_SMTP: SmtpInstance[] = [];
const EMPTY_WHATSAPP: WhatsappInstance[] = [];

const toStudentArray = (value: unknown): Student[] =>
  Array.isArray(value) ? value : [];

type AudienceStudent = Student & {
  campusNames: string[];
  disciplineNames: string[];
};

const sortByLabel = <T,>(items: T[], getLabel: (item: T) => string) =>
  [...items].sort((a, b) =>
    getLabel(a).localeCompare(getLabel(b), "pt-BR", { sensitivity: "base" })
  );

const aggregateAudienceStudents = (
  groups: Array<{ discipline: AcademicDiscipline; students: Student[] }>
): AudienceStudent[] => {
  const byStudent = new Map<
    string,
    {
      student: Student;
      campusNames: Set<string>;
      disciplineNames: Set<string>;
    }
  >();

  for (const group of groups) {
    for (const student of group.students) {
      const current =
        byStudent.get(student.id) ??
        {
          student,
          campusNames: new Set<string>(),
          disciplineNames: new Set<string>(),
        };

      current.campusNames.add(group.discipline.campusName);
      current.disciplineNames.add(group.discipline.name);
      byStudent.set(student.id, current);
    }
  }

  return Array.from(byStudent.values()).map((item) => ({
    ...item.student,
    campusNames: Array.from(item.campusNames).sort((a, b) =>
      a.localeCompare(b, "pt-BR", { sensitivity: "base" })
    ),
    disciplineNames: Array.from(item.disciplineNames).sort((a, b) =>
      a.localeCompare(b, "pt-BR", { sensitivity: "base" })
    ),
  }));
};

const audienceContextLabel = (student: AudienceStudent) => {
  const disciplines =
    student.disciplineNames.length === 1
      ? "1 disciplina"
      : `${student.disciplineNames.length} disciplinas`;
  const campuses =
    student.campusNames.length === 1
      ? "1 campus"
      : `${student.campusNames.length} campus`;

  return `${disciplines} · ${campuses}`;
};

const formatAudienceList = (items: string[]) => {
  if (items.length <= 2) return items.join(", ");
  return `${items.slice(0, 2).join(", ")} +${items.length - 2}`;
};

const sameSelection = (a: string[], b: string[]) =>
  a.length === b.length && a.every((item, index) => item === b[index]);

type MessageFormValues = {
  subject: string;
  body: string;
  smtp_id: string;
  whatsapp_id: string;
};

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedCampusIds, setSelectedCampusIds] = useState<string[]>([]);
  const [selectedDisciplineIds, setSelectedDisciplineIds] = useState<string[]>([]);
  const [excludedDisciplineIds, setExcludedDisciplineIds] = useState<string[]>([]);
  const [recipientsDialogOpen, setRecipientsDialogOpen] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");
  const { showToast } = useToast();
  const requestedDisciplineId = searchParams.get("disciplineId") ?? "";

  const form = useForm<MessageFormValues>({
    defaultValues: {
      subject: "",
      body: "",
      smtp_id: "",
      whatsapp_id: "",
    },
  });

  const structureQuery = useApiQuery({
    queryKey: ["academic-structure"],
    queryFn: loadAcademicStructure,
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

  const campuses = useMemo(
    () =>
      sortByLabel(structureQuery.data?.campuses ?? [], (campus) => campus.name),
    [structureQuery.data?.campuses]
  );
  const disciplines = useMemo(
    () =>
      sortByLabel(
        structureQuery.data?.disciplines ?? EMPTY_DISCIPLINES,
        (discipline) =>
          `${discipline.campusName} ${discipline.programName} ${discipline.name}`
      ),
    [structureQuery.data?.disciplines]
  );
  const selectedCampusDisciplineIds = useMemo(
    () =>
      disciplines
        .filter((discipline) => selectedCampusIds.includes(discipline.campusId))
        .map((discipline) => discipline.id),
    [disciplines, selectedCampusIds]
  );
  const selectedScopeDisciplineIds = useMemo(
    () =>
      Array.from(
        new Set([
          ...selectedCampusDisciplineIds.filter(
            (disciplineId) => !excludedDisciplineIds.includes(disciplineId)
          ),
          ...selectedDisciplineIds,
        ])
      ).sort(),
    [excludedDisciplineIds, selectedCampusDisciplineIds, selectedDisciplineIds]
  );
  const selectedScopeKey = selectedScopeDisciplineIds.join("|");
  const selectedScopeDisciplines = useMemo(
    () =>
      selectedScopeDisciplineIds
        .map((disciplineId) =>
          disciplines.find((discipline) => discipline.id === disciplineId)
        )
        .filter((discipline): discipline is AcademicDiscipline => Boolean(discipline)),
    [disciplines, selectedScopeDisciplineIds]
  );

  const studentsQuery = useApiQuery({
    queryKey: ["students", { disciplines: selectedScopeKey }],
    enabled:
      selectedScopeDisciplineIds.length > 0 &&
      selectedScopeDisciplines.length === selectedScopeDisciplineIds.length,
    queryFn: async () => {
      const results = await Promise.allSettled(
        selectedScopeDisciplines.map(async (discipline) => {
          const params = new URLSearchParams({ discipline: discipline.id });
          const response = await apiRequest<ApiResponse<Student[]>>(
            `/student?${params.toString()}`
          );
          return {
            discipline,
            students: toStudentArray(extractData(response)),
          };
        })
      );

      return aggregateAudienceStudents(
        results.flatMap((result) =>
          result.status === "fulfilled" && result.value ? [result.value] : []
        )
      );
    },
  });

  const sendMessageMutation = useApiMutation<
    ApiMessage,
    MessageFormValues
  >({
    mutationFn: async (values) =>
      apiRequest<ApiMessage>("/message/send", {
        method: "POST",
        body: {
          ...values,
          to: validSelected,
        },
      }),
    onSuccess: (res) => {
      showToast({ title: res.message ?? "Mensagem enviada", variant: "success" });
    },
  });

  const students = studentsQuery.data ?? EMPTY_STUDENTS;
  const smtp = smtpQuery.data ?? EMPTY_SMTP;
  const whatsapp = whatsappQuery.data ?? EMPTY_WHATSAPP;
  const isLoading =
    structureQuery.isLoading ||
    studentsQuery.isLoading ||
    smtpQuery.isLoading ||
    whatsappQuery.isLoading;

  const toggleStudent = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };
  const toggleCampus = (id: string) => {
    const campusDisciplineIds = disciplines
      .filter((discipline) => discipline.campusId === id)
      .map((discipline) => discipline.id);
    const hasAllDisciplinesInScope =
      campusDisciplineIds.length > 0 &&
      campusDisciplineIds.every((disciplineId) =>
        selectedScopeDisciplineIds.includes(disciplineId)
      );

    setSelectedCampusIds((prev) => {
      if (hasAllDisciplinesInScope) {
        return prev.filter((item) => item !== id);
      }

      return prev.includes(id) ? prev : [...prev, id];
    });
    setSelectedDisciplineIds((prev) =>
      hasAllDisciplinesInScope
        ? prev.filter((disciplineId) => !campusDisciplineIds.includes(disciplineId))
        : prev
    );
    setExcludedDisciplineIds((prev) => {
      const cleared = prev.filter(
        (disciplineId) => !campusDisciplineIds.includes(disciplineId)
      );

      return hasAllDisciplinesInScope
        ? [...cleared, ...campusDisciplineIds]
        : cleared;
    });
  };
  const toggleDiscipline = (id: string) => {
    const discipline = disciplines.find((item) => item.id === id);
    const isCampusSelected = discipline
      ? selectedCampusIds.includes(discipline.campusId)
      : false;
    const isSelected = selectedScopeDisciplineIds.includes(id);

    if (isSelected) {
      setSelectedDisciplineIds((prev) => prev.filter((item) => item !== id));
      if (isCampusSelected) {
        setExcludedDisciplineIds((prev) =>
          prev.includes(id) ? prev : [...prev, id]
        );
      }
      return;
    }

    setExcludedDisciplineIds((prev) => prev.filter((item) => item !== id));
    setSelectedDisciplineIds((prev) =>
      prev.includes(id) ? prev : [...prev, id]
    );
  };
  const clearScope = () => {
    setSelectedCampusIds([]);
    setSelectedDisciplineIds([]);
    setExcludedDisciplineIds([]);
    setSelected([]);
  };

  const validSelected = selected.filter((id) =>
    students.some((student) => student.id === id)
  );
  const selectedCount = validSelected.length;
  const queryError = useMemo(
    () =>
      structureQuery.error ??
      studentsQuery.error ??
      smtpQuery.error ??
      whatsappQuery.error ??
      null,
    [
      structureQuery.error,
      studentsQuery.error,
      smtpQuery.error,
      whatsappQuery.error,
    ]
  );
  const smtpOptions = useMemo(
    () =>
      smtp.map((item) => ({
        value: item.id,
        label: item.email,
      })),
    [smtp]
  );
  const whatsappOptions = useMemo(
    () =>
      whatsapp.map((item) => ({
        value: item.id,
        label: item.phone ? formatPhone(item.phone) : item.instanceName || item.id,
      })),
    [whatsapp]
  );
  const hasSmtp = smtpOptions.length > 0;
  const hasWhatsapp = whatsappOptions.length > 0;
  const hasAnyIntegration = hasSmtp || hasWhatsapp;
  const isSendBlocked =
    isLoading || sendMessageMutation.isPending || !hasAnyIntegration;
  const hasScope = selectedScopeDisciplineIds.length > 0;
  const campusDisciplines = (campusId: string) =>
    disciplines.filter((discipline) => discipline.campusId === campusId);
  const normalizedRecipientSearch = recipientSearch.trim().toLocaleLowerCase("pt-BR");
  const filteredCampuses = campuses.filter((campus) => {
    if (!normalizedRecipientSearch) return true;

    const campusMatches = campus.name
      .toLocaleLowerCase("pt-BR")
      .includes(normalizedRecipientSearch);
    const disciplineMatches = campusDisciplines(campus.id).some((discipline) =>
      `${discipline.programName} ${discipline.name} ${discipline.campusName}`
        .toLocaleLowerCase("pt-BR")
        .includes(normalizedRecipientSearch)
    );

    return campusMatches || disciplineMatches;
  });
  const filteredDisciplines = disciplines.filter((discipline) => {
    if (!normalizedRecipientSearch) return true;

    return `${discipline.programName} ${discipline.name} ${discipline.campusName} ${discipline.year}.${discipline.semester}`
      .toLocaleLowerCase("pt-BR")
      .includes(normalizedRecipientSearch);
  });
  const selectedCampusCount = campuses.filter((campus) =>
    campusDisciplines(campus.id).some((discipline) =>
      selectedScopeDisciplineIds.includes(discipline.id)
    )
  ).length;
  const selectedScopeSummary = hasScope
    ? `${selectedScopeDisciplineIds.length} disciplina(s) no filtro`
    : "Selecione campus ou disciplina para montar os destinatários";
  const recipientsSummary = hasScope
    ? `${selectedScopeDisciplineIds.length} disciplina(s), ${selectedCampusCount} campus, ${students.length} aluno(s)`
    : "Nenhum filtro selecionado";

  const handleSend = async (values: MessageFormValues) => {
    if (!hasAnyIntegration) {
      showToast({
        title: "Configure Email ou WhatsApp antes de enviar mensagens",
        variant: "error",
      });
      return;
    }

    if (!validSelected.length) {
      showToast({ title: "Selecione ao menos um aluno", variant: "error" });
      return;
    }

    if (!values.smtp_id && !values.whatsapp_id) {
      showToast({
        title: "Selecione ao menos um canal de envio",
        variant: "error",
      });
      return;
    }

    await sendMessageMutation.mutateAsync(values);
  };

  useEffect(() => {
    if (!requestedDisciplineId) {
      return;
    }

    const requestedDiscipline = disciplines.find(
      (discipline) => discipline.id === requestedDisciplineId
    );
    if (!requestedDiscipline) {
      return;
    }

    setSelectedCampusIds([]);
    setExcludedDisciplineIds([]);
    setSelectedDisciplineIds((prev) =>
      sameSelection(prev, [requestedDisciplineId]) ? prev : [requestedDisciplineId]
    );
  }, [disciplines, requestedDisciplineId]);

  useEffect(() => {
    const next = students.map((student) => student.id).sort();
    queueMicrotask(() => {
      setSelected((prev) => (sameSelection([...prev].sort(), next) ? prev : next));
    });
  }, [selectedScopeKey, students]);

  useEffect(() => {
    const currentSmtpId = form.getValues("smtp_id");
    const currentWhatsappId = form.getValues("whatsapp_id");
    const nextSmtpId = smtpOptions[0]?.value ?? "";
    const nextWhatsappId = whatsappOptions[0]?.value ?? "";

    if (!smtpOptions.some((option) => option.value === currentSmtpId)) {
      form.setValue("smtp_id", nextSmtpId);
    }

    if (!whatsappOptions.some((option) => option.value === currentWhatsappId)) {
      form.setValue("whatsapp_id", nextWhatsappId);
    }
  }, [form, smtpOptions, whatsappOptions]);

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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Público do envio</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Defina o público por campus, curso ou disciplina.
              </p>
            </div>
          </div>

          <Dialog
            open={recipientsDialogOpen}
            onOpenChange={setRecipientsDialogOpen}
          >
            <div className="mt-5 rounded-2xl border border-border/60 bg-background px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Filtro atual
                  </p>
                  <p className="mt-1 text-sm font-medium">{recipientsSummary}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {hasScope ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearScope}
                    >
                      Limpar
                    </Button>
                  ) : null}
                  <DialogTrigger render={<Button type="button" size="sm" />}>
                    Definir filtro
                  </DialogTrigger>
                </div>
              </div>
            </div>
              <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[min(960px,calc(100vw-2rem))] max-w-none flex-col overflow-hidden p-0 sm:max-w-none">
                <DialogHeader className="shrink-0 px-5 pt-5">
                  <DialogTitle>Filtro do público</DialogTitle>
                  <DialogDescription>
                    Escolha campus inteiros ou disciplinas específicas.
                  </DialogDescription>
                </DialogHeader>
                <div className="shrink-0 px-5">
                  <Input
                    value={recipientSearch}
                    onChange={(event) => setRecipientSearch(event.target.value)}
                    placeholder="Buscar por campus, curso ou disciplina"
                  />
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
                  <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                    <div className="min-w-0">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <Label>Campus inteiro</Label>
                        {selectedCampusCount ? (
                          <span className="text-xs text-muted-foreground">
                            {selectedCampusCount} selecionado(s)
                          </span>
                        ) : null}
                      </div>
                      <div className="grid gap-2">
                        {filteredCampuses.map((campus) => {
                          const campusDisciplineIds = campusDisciplines(campus.id).map(
                            (discipline) => discipline.id
                          );
                          const totalDisciplines = campusDisciplineIds.length;
                          const selectedDisciplineCount = campusDisciplineIds.filter(
                            (disciplineId) =>
                              selectedScopeDisciplineIds.includes(disciplineId)
                          ).length;
                          const disabled = totalDisciplines === 0;
                          const isInScope = selectedDisciplineCount > 0;

                          return (
                            <button
                              key={campus.id}
                              type="button"
                              disabled={disabled}
                              onClick={() => toggleCampus(campus.id)}
                              className={`flex w-full min-w-0 items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                isInScope
                                  ? "border-primary bg-primary/10"
                                  : "border-border/60 bg-background hover:border-primary/50"
                              }`}
                            >
                              <Checkbox
                                checked={isInScope}
                                disabled={disabled}
                                className="pointer-events-none"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium">
                                  {campus.name}
                                </span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  {disabled
                                    ? "Sem disciplina registrada"
                                    : isInScope
                                      ? `${selectedDisciplineCount} de ${totalDisciplines} disciplina(s) no filtro`
                                      : `${totalDisciplines} disciplina(s)`}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                        {!filteredCampuses.length ? (
                          <p className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-muted-foreground">
                            Nenhum campus encontrado.
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <Label>Curso / disciplina</Label>
                        {selectedScopeDisciplineIds.length ? (
                          <span className="text-xs text-muted-foreground">
                            {selectedScopeDisciplineIds.length} selecionada(s)
                          </span>
                        ) : null}
                      </div>
                      <div className="grid gap-2">
                        {filteredDisciplines.length ? (
                          filteredDisciplines.map((discipline) => (
                            <button
                              key={discipline.id}
                              type="button"
                              onClick={() => toggleDiscipline(discipline.id)}
                              className={`flex w-full min-w-0 items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${
                                selectedScopeDisciplineIds.includes(discipline.id)
                                  ? "border-primary bg-primary/10"
                                  : "border-border/60 bg-background hover:border-primary/50"
                              }`}
                            >
                              <Checkbox
                                checked={selectedScopeDisciplineIds.includes(discipline.id)}
                                className="pointer-events-none"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium">
                                  {discipline.programName} / {discipline.name}
                                </span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  {discipline.campusName} · {discipline.year}.
                                  {discipline.semester}
                                </span>
                              </span>
                            </button>
                          ))
                        ) : (
                          <p className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-muted-foreground">
                            Nenhuma disciplina encontrada.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="shrink-0 border-t bg-muted/50 px-5 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xs text-muted-foreground">
                      {selectedScopeSummary} · {students.length} aluno(s) encontrado(s)
                    </span>
                    <div className="flex gap-2 sm:justify-end">
                    <Button type="button" variant="ghost" onClick={clearScope}>
                      Limpar
                    </Button>
                    <DialogClose render={<Button type="button" />}>
                      Usar este filtro
                    </DialogClose>
                    </div>
                  </div>
                </div>
              </DialogContent>
          </Dialog>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Alunos no filtro</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Todos entram selecionados; remova quem não deve receber.
              </p>
            </div>
          </div>

          <div className="mt-3 grid max-h-[360px] gap-3 overflow-y-auto pr-1">
            {isLoading ? (
              <LoadingState label="Carregando alunos e integrações..." />
            ) : !hasScope ? (
              <EmptyState
                title="Escolha um filtro de envio"
                description="Selecione um campus inteiro ou uma ou mais disciplinas para carregar os alunos."
              />
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
                  <Checkbox
                    checked={selected.includes(student.id)}
                    className="pointer-events-none"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {student.name ?? "Sem nome"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {student.email ?? "-"} · {formatPhone(student.phone)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {audienceContextLabel(student)} ·{" "}
                      {formatAudienceList(student.disciplineNames)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Badge variant="outline" className="text-xs">
                      {studentStatusLabel(student.status)}
                    </Badge>
                    {student.campusNames.length > 1 ? (
                      <Badge variant="outline" className="text-xs">
                        {student.campusNames.length} campus
                      </Badge>
                    ) : null}
                  </div>
                </button>
              ))
            ) : (
              <EmptyState
                title="Nenhum aluno no filtro"
                description="Cadastre ou importe matrículas para as disciplinas selecionadas antes de enviar comunicados."
              />
            )}
          </div>
        </Card>

        <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
          <h2 className="text-lg font-semibold">Configurar envio</h2>
          {!isLoading && !hasAnyIntegration ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-medium text-amber-950">
                Nenhum canal de envio configurado.
              </p>
              <p className="mt-1 text-sm text-amber-900">
                Conecte um email, uma instância de WhatsApp ou ambos para
                liberar o envio de comunicados.
              </p>
              <Link
                href="/integrations"
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className: "mt-3 bg-white",
                })}
              >
                Configurar integrações
              </Link>
            </div>
          ) : null}
          <FormProvider {...form}>
            <form
              className="mt-4 flex flex-col gap-4"
              onSubmit={form.handleSubmit(handleSend)}
            >
              <div className="grid gap-3 md:grid-cols-2">
                <FormSelect<MessageFormValues>
                  name="smtp_id"
                  label="Email"
                  disabled={isSendBlocked || !hasSmtp}
                  options={smtpOptions}
                  placeholder={
                    hasSmtp ? "Selecione" : "Nenhum email configurado"
                  }
                  helper={
                    hasSmtp
                      ? "Canal usado para enviar o email da mensagem."
                      : "Cadastre um email em Integrações para usar este canal."
                  }
                />
                <FormSelect<MessageFormValues>
                  name="whatsapp_id"
                  label="WhatsApp"
                  disabled={isSendBlocked || !hasWhatsapp}
                  options={whatsappOptions}
                  placeholder={
                    hasWhatsapp ? "Selecione" : "Nenhum WhatsApp configurado"
                  }
                  helper={
                    hasWhatsapp
                      ? "Canal usado para enviar a mensagem pelo WhatsApp."
                      : "Crie uma instância em Integrações para usar este canal."
                  }
                />
              </div>
              <FormInput<MessageFormValues>
                name="subject"
                label="Assunto"
                disabled={isSendBlocked}
                rules={{
                  required: "Informe o assunto da mensagem",
                  validate: requiredTrimmed("Informe o assunto da mensagem"),
                }}
              />
              <FormTextarea<MessageFormValues>
                name="body"
                label="Mensagem"
                rows={5}
                disabled={isSendBlocked}
                rules={{
                  required: "Escreva a mensagem",
                  validate: requiredTrimmed("Escreva a mensagem"),
                }}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {selectedCount} aluno(s) selecionado(s)
                </span>
                <Button
                  type="submit"
                  disabled={isSendBlocked || !selectedCount}
                >
                  {sendMessageMutation.isPending
                    ? "Enviando..."
                    : "Enviar mensagem"}
                </Button>
              </div>
            </form>
          </FormProvider>
        </Card>
      </section>
    </div>
  );
}
