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
  type AcademicCourse,
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

const toStudentArray = (value: unknown): Student[] =>
  Array.isArray(value) ? value : [];

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const courseId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [origin, setOrigin] = useState("");
  const { showToast } = useToast();

  const structureQuery = useApiQuery({
    queryKey: ["academic-structure"],
    queryFn: loadAcademicStructure,
  });

  const studentsQuery = useApiQuery({
    queryKey: ["students", { courseId }],
    enabled: Boolean(courseId),
    queryFn: async () => {
      const params = new URLSearchParams({ course: courseId });
      const response = await apiRequest<ApiResponse<Student[]>>(
        `/student?${params.toString()}`
      );
      return toStudentArray(extractData(response));
    },
  });

  const inviteQuery = useApiQuery({
    queryKey: ["invite", { courseId }],
    enabled: Boolean(courseId),
    queryFn: async () => {
      try {
        const response = await apiRequest<ApiResponse<InvitePayload | null>>(
          `/invite/${courseId}/current`
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
    queryKey: ["invites", { courseId }],
    enabled: Boolean(courseId),
    queryFn: async () => {
      const response = await apiRequest<ApiResponse<InvitePayload[]>>(
        `/invite/${courseId}`
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

  const course = useMemo<AcademicCourse | undefined>(
    () =>
      structureQuery.data?.courses.find((item) => item.id === courseId),
    [courseId, structureQuery.data?.courses]
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

  if (!course) {
    return (
      <div className="flex flex-col gap-6">
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

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={course.name}
        description={`${course.campusName} / ${course.programName} / ${course.year}.${course.semester}`}
        badge="Disciplina"
      />
      <AcademicBreadcrumb
        items={[
          { label: "Estrutura", href: "/setup" },
          { label: course.campusName, href: `/campuses/${course.campusId}` },
          { label: course.programName, href: `/programs/${course.programId}` },
          { label: course.name },
        ]}
      />
      <ToastOnError error={queryError} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border border-border/60 bg-white/90 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Matriculas
          </p>
          <p className="mt-2 text-3xl font-semibold">{students.length}</p>
        </Card>
        <Card className="rounded-2xl border border-border/60 bg-white/90 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Ativos
          </p>
          <p className="mt-2 text-3xl font-semibold">{activeStudents}</p>
        </Card>
        <Card className="rounded-2xl border border-border/60 bg-white/90 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Pendentes
          </p>
          <p className="mt-2 text-3xl font-semibold">{pendingStudents}</p>
        </Card>
        <Card className="rounded-2xl border border-border/60 bg-white/90 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Convite
          </p>
          <p className="mt-2 text-lg font-semibold">
            {invite?.code ? invite.code : "Nao gerado"}
          </p>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
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

          <div className="mt-5 overflow-hidden rounded-2xl border border-border/60">
            {students.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Contato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
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
                title="Nenhuma matricula vinculada"
                description="Importe ou adicione matriculas para esta disciplina antes de compartilhar o convite."
                className="rounded-none border-0"
              />
            )}
          </div>
        </Card>

        <aside className="grid gap-6">
          <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
            <h2 className="text-lg font-semibold">Estado da turma</h2>
            <div className="mt-4 grid gap-3">
              {statusStats.map((item) => (
                <div
                  key={item.status}
                  className="flex items-center justify-between rounded-2xl border border-border/60 bg-background px-4 py-3"
                >
                  <span className="text-sm text-muted-foreground">
                    {studentStatusLabel(item.status)}
                  </span>
                  <span className="font-semibold">{item.count}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
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
                    campusName={course.campusName}
                    courseName={course.name}
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
                </div>
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                <p className="text-sm text-muted-foreground">
                  Esta disciplina ainda nao tem convite ativo.
                </p>
                <Link
                  href={`/invites?courseId=${course.id}`}
                  className={cn(
                    buttonVariants({ variant: "default", size: "sm" })
                  )}
                >
                  Criar convite
                </Link>
              </div>
            )}
          </Card>

          <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
            <h2 className="text-lg font-semibold">Links gerados</h2>
            <div className="mt-4 grid gap-3">
              {invites.length ? (
                invites.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-border/60 bg-background px-4 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">
                          {item.code}
                        </p>
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
                        campusName={course.campusName}
                        courseName={course.name}
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
          </Card>

          <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
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
                href={`/programs/${course.programId}`}
                className={cn(buttonVariants({ variant: "ghost", size: "lg" }))}
              >
                Voltar para o curso
              </Link>
            </div>
          </Card>
        </aside>
      </section>
    </div>
  );
}
