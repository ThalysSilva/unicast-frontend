"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { FormInput } from "@/components/forms/form-fields";
import { InviteQrDialog } from "@/components/invites/invite-qr-dialog";
import { AcademicBreadcrumb } from "@/components/layout/academic-breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card } from "@/components/ui/card";
import {
  DialogClose,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValueFromOptions,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToastOnError, useToast } from "@/components/ui/toast-provider";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { ApiError, apiRequest, extractData } from "@/lib/api";
import {
  type AcademicDiscipline,
  loadAcademicStructure,
} from "@/lib/academic-structure";
import { formatPhone, studentStatusLabel } from "@/lib/format";
import {
  formatInviteExpiration,
  inviteStatusLabel,
  type InvitePayload,
} from "@/lib/invites";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { requiredTrimmed } from "@/lib/validation";
import type { ApiMessage, ApiResponse, Student, StudentStatus } from "@/lib/types";

const statusOrder: StudentStatus[] = [
  "ACTIVE",
  "PENDING",
  "LOCKED",
  "CANCELED",
  "GRADUATED",
];

const EMPTY_STUDENTS: Student[] = [];
type StudentStatusFilter = "ALL" | StudentStatus;
type AddStudentFormValues = {
  studentId: string;
};

const importModeOptions = [
  { value: "upsert", label: "Atualizar ou inserir" },
  { value: "clean", label: "Substituir lista" },
];

const toStudentArray = (value: unknown): Student[] =>
  Array.isArray(value) ? value : [];

export default function DisciplineDetailPage() {
  const params = useParams<{ id: string }>();
  const disciplineId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const [origin] = useState(() =>
    typeof window === "undefined" ? "" : window.location.origin
  );
  const [studentStatusFilter, setStudentStatusFilter] =
    useState<StudentStatusFilter>("ALL");
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isImportStudentsOpen, setIsImportStudentsOpen] = useState(false);
  const [importMode, setImportMode] = useState("upsert");
  const [file, setFile] = useState<File | null>(null);
  const { showToast } = useToast();
  const addStudentForm = useForm<AddStudentFormValues>({
    defaultValues: {
      studentId: "",
    },
  });

  const structureQuery = useApiQuery({
    queryKey: ["academic-structure"],
    queryFn: loadAcademicStructure,
  });

  const studentsQuery = useApiQuery({
    queryKey: ["students", { disciplineId }],
    enabled: Boolean(disciplineId),
    queryFn: async () => {
      const params = new URLSearchParams({ discipline: disciplineId });
      const response = await apiRequest<ApiResponse<Student[]>>(
        `/student?${params.toString()}`
      );
      return toStudentArray(extractData(response));
    },
  });

  const importStudentsMutation = useApiMutation<ApiMessage, FormData>({
    mutationFn: async (formData) =>
      apiRequest<ApiMessage>(
        `/discipline/${disciplineId}/students/import?mode=${importMode}`,
        {
          method: "POST",
          body: formData,
        }
      ),
    invalidateQueryKeys: [
      queryKeys.students.root(),
      queryKeys.dashboard.summary(),
    ],
    onSuccess: async (res) => {
      showToast({ title: res.message ?? "CSV importado", variant: "success" });
      setFile(null);
      setIsImportStudentsOpen(false);
      await studentsQuery.refetch();
    },
  });

  const addStudentToDisciplineMutation = useApiMutation<ApiMessage, string>({
    mutationFn: async (studentId) =>
      apiRequest<ApiMessage>(`/discipline/${disciplineId}/students`, {
        method: "POST",
        body: { studentId },
      }),
    invalidateQueryKeys: [
      queryKeys.students.root(),
      queryKeys.dashboard.summary(),
    ],
    onSuccess: async (res) => {
      showToast({
        title: res.message ?? "Matrícula vinculada com sucesso",
        variant: "success",
      });
      addStudentForm.reset({ studentId: "" });
      setIsAddStudentOpen(false);
      await studentsQuery.refetch();
    },
  });

  const inviteQuery = useApiQuery({
    queryKey: ["invite", { disciplineId }],
    enabled: Boolean(disciplineId),
    queryFn: async () => {
      try {
        const response = await apiRequest<ApiResponse<InvitePayload | null>>(
          `/invite/${disciplineId}/current`
        );
        return extractData(response);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return null;
        }
        throw error;
      }
    },
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
      await Promise.all([invitesQuery.refetch(), inviteQuery.refetch()]);
    },
  });
  const deleteDisciplineMutation = useApiMutation<ApiMessage, void>({
    mutationFn: () =>
      apiRequest<ApiMessage>(`/discipline/${disciplineId}`, {
        method: "DELETE",
      }),
    invalidateQueryKeys: [
      queryKeys.academicStructure.root(),
      queryKeys.students.root(),
      queryKeys.dashboard.summary(),
    ],
    onSuccess: (res) => {
      showToast({
        title: res.message ?? "Disciplina removida com sucesso",
        variant: "success",
      });
      if (discipline) {
        router.push(`/programs/${discipline.programId}`);
        router.refresh();
      }
    },
  });

  const discipline = useMemo<AcademicDiscipline | undefined>(
    () =>
      structureQuery.data?.disciplines.find((item) => item.id === disciplineId),
    [disciplineId, structureQuery.data?.disciplines]
  );
  const students = studentsQuery.data ?? EMPTY_STUDENTS;
  const invite = inviteQuery.data ?? null;
  const invites = invitesQuery.data ?? [];
  const inviteLink =
    invite?.code && origin ? `${origin}/student/register/${invite.code}` : "";
  const queryError =
    structureQuery.error ??
    studentsQuery.error ??
    inviteQuery.error ??
    invitesQuery.error ??
    null;
  const isLoading =
    structureQuery.isLoading ||
    studentsQuery.isLoading ||
    inviteQuery.isLoading ||
    invitesQuery.isLoading;

  const statusStats = statusOrder.map((status) => ({
    status,
    count: students.filter((student) => student.status === status).length,
  }));
  const statusFilters: Array<{
    status: StudentStatusFilter;
    label: string;
    count: number;
  }> = [
    { status: "ALL", label: "Todos", count: students.length },
    ...statusStats.map((item) => ({
      status: item.status,
      label: studentStatusLabel(item.status),
      count: item.count,
    })),
  ];
  const filteredStudents =
    studentStatusFilter === "ALL"
      ? students
      : students.filter((student) => student.status === studentStatusFilter);

  const activeStudents = students.filter(
    (student) => student.status === "ACTIVE"
  ).length;
  const pendingStudents = students.filter(
    (student) => student.status === "PENDING"
  ).length;

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

  const handleImport = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    await importStudentsMutation.mutateAsync(formData);
  };

  const handleSingleAdd = async (values: AddStudentFormValues) => {
    await addStudentToDisciplineMutation.mutateAsync(values.studentId.trim());
  };

  if (isLoading) {
    return <LoadingState label="Carregando disciplina e turma..." />;
  }

  if (!discipline) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader
          title="Disciplina não encontrada"
          description="Volte para a estrutura acadêmica e selecione uma disciplina cadastrada."
          badge="Turma"
        />
        <Link
          href="/setup"
          className={cn(buttonVariants({ variant: "default", size: "lg" }))}
        >
          Abrir estrutura
        </Link>
      </div>
    );
  }

  const inviteHistoryDialog = (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          />
        }
      >
        Exibir todos convites
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Todos convites gerados</DialogTitle>
          <DialogDescription>
            Histórico de links criados para esta disciplina.
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[520px] gap-3 overflow-y-auto pr-1">
          {invites.length ? (
            invites.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-border/60 bg-background px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{item.code}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatInviteExpiration(item.expiresAt)}
                    </p>
                  </div>
                  <Badge variant="outline">{inviteStatusLabel(item)}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <InviteQrDialog
                    code={item.code}
                    link={buildInviteLink(item.code)}
                    campusName={discipline.campusName}
                    disciplineName={discipline.name}
                  />
                  <button
                    type="button"
                    onClick={() => copyInviteCode(item.code)}
                    className={cn(
                      buttonVariants({
                        variant: "ghost",
                        size: "sm",
                      })
                    )}
                  >
                    Copiar link
                  </button>
                  <button
                    type="button"
                    disabled={
                      deleteInviteMutation.isPending &&
                      deleteInviteMutation.variables === item.id
                    }
                    onClick={() => deleteInviteMutation.mutate(item.id)}
                    className={cn(
                      buttonVariants({
                        variant: "destructive",
                        size: "sm",
                      })
                    )}
                  >
                    {deleteInviteMutation.isPending &&
                    deleteInviteMutation.variables === item.id
                      ? "Removendo..."
                      : "Remover"}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum link foi gerado para esta disciplina ainda.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  const csvHelpDialog = (
    <Dialog>
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
        Como montar o CSV
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[min(720px,calc(100vw-2rem))] max-w-none overflow-y-auto sm:max-w-none">
        <DialogHeader>
          <DialogTitle>Como montar o CSV</DialogTitle>
          <DialogDescription>
            Use a primeira linha como cabeçalho. A coluna `studentId` é
            obrigatória.
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-w-0 gap-4 text-sm">
          <div className="rounded-2xl border border-border/60 bg-background p-4">
            <p className="font-medium">Colunas aceitas</p>
            <div className="mt-3 grid gap-2 text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">studentId</span>:
                matrícula institucional do aluno. Obrigatória.
              </p>
              <p>
                <span className="font-medium text-foreground">name</span>: nome
                do aluno. Opcional.
              </p>
              <p>
                <span className="font-medium text-foreground">phone</span>:
                telefone cru com DDI, DDD e número. Opcional.
              </p>
              <p>
                <span className="font-medium text-foreground">email</span>:
                email do aluno. Opcional.
              </p>
              <p>
                <span className="font-medium text-foreground">status</span>:
                opcional. Em branco vira PENDING.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background p-4">
            <p className="font-medium">Status aceitos</p>
            <div className="mt-3 grid gap-2 text-muted-foreground sm:grid-cols-2">
              <p>
                <span className="font-medium text-foreground">1</span> ou
                ACTIVE: ativo
              </p>
              <p>
                <span className="font-medium text-foreground">2</span> ou
                LOCKED/TRANCADO: trancado
              </p>
              <p>
                <span className="font-medium text-foreground">3</span> ou
                GRADUATED/CONCLUIDO: graduado
              </p>
              <p>
                <span className="font-medium text-foreground">4</span> ou
                CANCELED/CANCELADO: cancelado
              </p>
              <p>
                <span className="font-medium text-foreground">5</span>,
                PENDING/PENDENTE ou vazio: pendente
              </p>
            </div>
          </div>
          <div>
            <p className="mb-2 font-medium">Exemplo</p>
            <pre className="max-w-full overflow-x-auto rounded-2xl border border-border/60 bg-muted p-4 text-xs leading-relaxed">
{`studentId,name,phone,email,status
112233,Thalys Farias,5511999999999,thalys@email.com,1
445566,Ana Silva,5521988887777,ana@email.com,5`}
            </pre>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background p-4 text-muted-foreground">
            <p>
              Em `Atualizar ou inserir`, o sistema cria alunos novos e vincula
              alunos existentes a esta disciplina. Em `Substituir lista`, os
              vínculos atuais da disciplina são limpos antes da importação.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const addStudentDialog = (
    <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
      <DialogTrigger render={<Button type="button" variant="default" size="lg" />}>
        Adicionar matrícula
      </DialogTrigger>
      <DialogContent className="w-[min(520px,calc(100vw-2rem))] max-w-none sm:max-w-none">
        <DialogHeader>
          <DialogTitle>Adicionar matrícula</DialogTitle>
          <DialogDescription>
            Vincule uma matrícula diretamente a {discipline.name}.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...addStudentForm}>
          <form
            className="grid gap-4"
            onSubmit={addStudentForm.handleSubmit(handleSingleAdd)}
          >
            <FormInput<AddStudentFormValues>
              name="studentId"
              label="Matrícula"
              disabled={addStudentToDisciplineMutation.isPending}
              rules={{
                required: "Informe a matrícula",
                validate: requiredTrimmed("Informe a matrícula"),
              }}
            />
            <Button
              type="submit"
              disabled={addStudentToDisciplineMutation.isPending}
            >
              {addStudentToDisciplineMutation.isPending
                ? "Vinculando..."
                : "Adicionar à disciplina"}
            </Button>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );

  const importStudentsDialog = (
    <Dialog open={isImportStudentsOpen} onOpenChange={setIsImportStudentsOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" size="lg" />}>
        Importar CSV
      </DialogTrigger>
      <DialogContent className="w-[min(560px,calc(100vw-2rem))] max-w-none sm:max-w-none">
        <DialogHeader>
          <DialogTitle>Importar matrículas</DialogTitle>
          <DialogDescription>
            Carregue um CSV para montar a turma de {discipline.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="flex justify-end">{csvHelpDialog}</div>
          <div className="space-y-2">
            <Label>Modo de importação</Label>
            <Select
              value={importMode}
              onValueChange={(value) => setImportMode(value ?? "upsert")}
            >
              <SelectTrigger disabled={importStudentsMutation.isPending}>
                <SelectValueFromOptions
                  placeholder="Modo"
                  options={importModeOptions}
                  value={importMode}
                />
              </SelectTrigger>
              <SelectContent>
                {importModeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Arquivo CSV</Label>
            <Input
              type="file"
              accept=".csv"
              disabled={importStudentsMutation.isPending}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </div>
          <Button
            type="button"
            onClick={handleImport}
            disabled={!file || importStudentsMutation.isPending}
          >
            {importStudentsMutation.isPending
              ? "Importando..."
              : "Importar matrículas"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={discipline.name}
        description={`Disciplina cadastrada para o período ${discipline.year}.${discipline.semester}.`}
        badge="Disciplina"
      />
      <AcademicBreadcrumb
        className="py-2"
        items={[
          { label: "Estrutura", href: "/setup" },
          { label: discipline.campusName, href: `/campuses/${discipline.campusId}` },
          { label: discipline.programName, href: `/programs/${discipline.programId}` },
          { label: discipline.name },
        ]}
      />
      <ToastOnError error={queryError} />

      <div className="flex justify-end">
        <Dialog>
          <DialogTrigger render={<Button type="button" variant="destructive" size="sm" />}>
            Excluir disciplina
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Excluir disciplina</DialogTitle>
              <DialogDescription>
                Esta ação remove a disciplina atual. A turma, convites e vínculos
                associados também podem ser removidos.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancelar
              </DialogClose>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteDisciplineMutation.isPending}
                onClick={() => deleteDisciplineMutation.mutate()}
              >
                {deleteDisciplineMutation.isPending ? "Removendo..." : "Confirmar exclusão"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border border-border/60 bg-white/90 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Matrículas
          </p>
          <p className="mt-0.5 text-2xl font-semibold leading-none">
            {students.length}
          </p>
        </Card>
        <Card className="rounded-2xl border border-border/60 bg-white/90 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Ativos
          </p>
          <p className="mt-0.5 text-2xl font-semibold leading-none">
            {activeStudents}
          </p>
        </Card>
        <Card className="rounded-2xl border border-border/60 bg-white/90 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Pendentes
          </p>
          <p className="mt-0.5 text-2xl font-semibold leading-none">
            {pendingStudents}
          </p>
        </Card>
        <Card className="rounded-2xl border border-border/60 bg-white/90 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Convite
          </p>
          <p className="mt-0.5 text-base font-semibold leading-none">
            {invite?.code ? invite.code : "Não gerado"}
          </p>
        </Card>
      </section>

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <Card className="rounded-3xl border border-border/60 bg-white/90 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Turma da disciplina</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Alunos vinculados a esta disciplina pela matrícula da turma.
              </p>
            </div>
            <Link
              href="/students"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Ver base de alunos
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-1.5 lg:grid-cols-6">
            {statusFilters.map((item) => {
              const isSelected = studentStatusFilter === item.status;

              return (
                <button
                  key={item.status}
                  type="button"
                  onClick={() => setStudentStatusFilter(item.status)}
                  className={cn(
                    "flex min-h-8 items-center justify-between gap-1 rounded-lg border px-2 py-1 text-left transition",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/60 bg-background hover:border-primary/50"
                  )}
                >
                  <span
                    className={cn(
                      "text-[11px] leading-none",
                      isSelected
                        ? "text-primary-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                  <span className="text-sm font-semibold">{item.count}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 max-h-[360px] overflow-auto rounded-2xl border border-border/60">
            {filteredStudents.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Contato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <p className="font-medium text-foreground">
                          {student.name || "Sem nome"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Matrícula {student.studentId}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {studentStatusLabel(student.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{student.email ?? "-"}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatPhone(student.phone)}
                        </p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                title={
                  students.length
                    ? "Nenhuma matrícula nesse filtro"
                    : "Nenhuma matrícula vinculada"
                }
                description={
                  students.length
                    ? "Selecione outro status para ver os alunos dessa turma."
                    : "Importe ou adicione matrículas para esta disciplina antes de compartilhar o convite."
                }
                className="rounded-none border-0"
              />
            )}
          </div>
        </Card>

        <aside className="grid gap-5">
          <Card className="rounded-3xl border border-border/60 bg-white/90 p-5">
            <h2 className="text-lg font-semibold">Ações</h2>
            <div className="mt-4 flex flex-col gap-3">
              {addStudentDialog}
              {importStudentsDialog}
              <Link
                href={`/messages?disciplineId=${discipline.id}`}
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                Enviar mensagem
              </Link>
              <Link
                href={`/programs/${discipline.programId}`}
                className={cn(buttonVariants({ variant: "ghost", size: "lg" }))}
              >
                Voltar para o curso
              </Link>
            </div>
          </Card>

          <Card className="rounded-3xl border border-border/60 bg-white/90 p-5">
            <h2 className="text-lg font-semibold">Último convite gerado</h2>
            {invite?.code ? (
              <div className="mt-4 grid gap-3">
                <Badge variant="outline">Código: {invite.code}</Badge>
                <div className="rounded-2xl border border-border/60 bg-background px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Link
                  </p>
                  <p className="mt-2 break-all text-sm font-medium">
                    {inviteLink || `/student/register/${invite.code}`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <InviteQrDialog
                    code={invite.code}
                    link={inviteLink || `/student/register/${invite.code}`}
                    campusName={discipline.campusName}
                    disciplineName={discipline.name}
                  />
                  <button
                    type="button"
                    onClick={copyInviteLink}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" })
                    )}
                  >
                    Copiar link
                  </button>
                  {inviteHistoryDialog}
                </div>
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                <p className="text-sm text-muted-foreground">
                  Esta disciplina ainda não tem convite ativo.
                </p>
                <Link
                  href={`/invites?disciplineId=${discipline.id}`}
                  className={cn(
                    buttonVariants({ variant: "default", size: "sm" })
                  )}
                >
                  Criar convite
                </Link>
                {inviteHistoryDialog}
              </div>
            )}
          </Card>
        </aside>
      </section>
    </div>
  );
}
