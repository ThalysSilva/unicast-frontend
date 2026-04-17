"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { InviteQrDialog } from "@/components/invites/invite-qr-dialog";
import { AcademicBreadcrumb } from "@/components/layout/academic-breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
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
import { cn } from "@/lib/utils";
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

const toStudentArray = (value: unknown): Student[] =>
  Array.isArray(value) ? value : [];

export default function DisciplineDetailPage() {
  const params = useParams<{ id: string }>();
  const disciplineId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [origin, setOrigin] = useState("");
  const [studentStatusFilter, setStudentStatusFilter] =
    useState<StudentStatusFilter>("ALL");
  const { showToast } = useToast();

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

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  if (isLoading) {
    return <LoadingState label="Carregando disciplina e turma..." />;
  }

  if (!discipline) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader
          title="Disciplina nao encontrada"
          description="Volte para a estrutura academica e selecione uma disciplina cadastrada."
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

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={discipline.name}
        description={`Disciplina cadastrada para o periodo ${discipline.year}.${discipline.semester}.`}
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

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border border-border/60 bg-white/90 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Matriculas
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
            {invite?.code ? invite.code : "Nao gerado"}
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
              Gerenciar matriculas
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
                          Matricula {student.studentId}
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
                    ? "Nenhuma matricula nesse filtro"
                    : "Nenhuma matricula vinculada"
                }
                description={
                  students.length
                    ? "Selecione outro status para ver os alunos dessa turma."
                    : "Importe ou adicione matriculas para esta disciplina antes de compartilhar o convite."
                }
                className="rounded-none border-0"
              />
            )}
          </div>
        </Card>

        <aside className="grid gap-5">
          <Card className="rounded-3xl border border-border/60 bg-white/90 p-5">
            <h2 className="text-lg font-semibold">Acoes</h2>
            <div className="mt-4 flex flex-col gap-3">
              <Link
                href="/students"
                className={cn(buttonVariants({ variant: "default", size: "lg" }))}
              >
                Importar ou adicionar matriculas
              </Link>
              <Link
                href="/messages"
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
            <h2 className="text-lg font-semibold">Ultimo convite gerado</h2>
            {invite?.code ? (
              <div className="mt-4 grid gap-3">
                <Badge variant="outline">Codigo: {invite.code}</Badge>
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
                  Esta disciplina ainda nao tem convite ativo.
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
