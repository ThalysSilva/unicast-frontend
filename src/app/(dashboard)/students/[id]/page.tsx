"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
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
import { cn } from "@/lib/utils";
import type {
  ApiMessage,
  ApiResponse,
  Student,
  StudentStatus,
} from "@/lib/types";

type StudentForm = {
  name: string;
  email: string;
  phone: string;
  annotation: string;
  status: StudentStatus;
};

const statusOptions: Array<{ value: StudentStatus; label: string }> = [
  { value: "ACTIVE", label: "Ativo" },
  { value: "PENDING", label: "Pendente" },
  { value: "LOCKED", label: "Trancado" },
  { value: "CANCELED", label: "Cancelado" },
  { value: "GRADUATED", label: "Graduado" },
];

const EMPTY_DISCIPLINES: AcademicDiscipline[] = [];

const toStudentArray = (value: unknown): Student[] =>
  Array.isArray(value) ? value : [];

const emptyForm = (): StudentForm => ({
  name: "",
  email: "",
  phone: "",
  annotation: "",
  status: "PENDING",
});

const formFromStudent = (student: Student): StudentForm => ({
  name: student.name ?? "",
  email: student.email ?? "",
  phone: student.phone ?? "",
  annotation: student.annotation ?? "",
  status: student.status ?? "PENDING",
});

const nullableValue = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const studentId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [form, setForm] = useState<StudentForm>(emptyForm);
  const { showToast } = useToast();

  const studentQuery = useApiQuery({
    queryKey: ["student", { studentId }],
    enabled: Boolean(studentId),
    queryFn: async () => {
      const response = await apiRequest<ApiResponse<Student>>(
        `/student/${studentId}`
      );
      return extractData(response);
    },
  });

  const structureQuery = useApiQuery({
    queryKey: ["academic-structure"],
    queryFn: loadAcademicStructure,
  });

  const disciplines = structureQuery.data?.disciplines ?? EMPTY_DISCIPLINES;

  const enrollmentsQuery = useApiQuery({
    queryKey: ["student-enrollments", { studentId, total: disciplines.length }],
    enabled: Boolean(studentId) && disciplines.length > 0,
    queryFn: async () => {
      const results = await Promise.allSettled(
        disciplines.map(async (discipline) => {
          const params = new URLSearchParams({ discipline: discipline.id });
          const response = await apiRequest<ApiResponse<Student[]>>(
            `/student?${params.toString()}`
          );
          const students = toStudentArray(extractData(response));
          return students.some((student) => student.id === studentId)
            ? discipline
            : null;
        })
      );

      return results.flatMap((result) =>
        result.status === "fulfilled" && result.value ? [result.value] : []
      );
    },
  });

  const updateStudentMutation = useApiMutation<ApiMessage, StudentForm>({
    mutationFn: async (values) =>
      apiRequest<ApiMessage>(`/student/${studentId}`, {
        method: "PUT",
        body: {
          name: nullableValue(values.name),
          email: nullableValue(values.email),
          phone: nullableValue(values.phone),
          annotation: nullableValue(values.annotation),
          status: values.status,
        },
      }),
    invalidateQueryKeys: [queryKeys.students(), ["student", { studentId }]],
    onSuccess: async (res) => {
      showToast({
        title: res.message ?? "Aluno atualizado",
        variant: "success",
      });
      await studentQuery.refetch();
    },
  });

  const unlinkMutation = useApiMutation<
    ApiMessage,
    { disciplineId: string; disciplineName: string }
  >({
    mutationFn: async ({ disciplineId }) =>
      apiRequest<ApiMessage>(`/discipline/${disciplineId}/students/${studentId}`, {
        method: "DELETE",
      }),
    invalidateQueryKeys: [queryKeys.students()],
    onSuccess: async (res, variables) => {
      showToast({
        title:
          res.message ??
          `Matrícula desvinculada de ${variables.disciplineName}`,
        variant: "success",
      });
      await enrollmentsQuery.refetch();
    },
  });

  const student = studentQuery.data ?? null;
  const enrollments = useMemo(
    () =>
      [...(enrollmentsQuery.data ?? [])].sort((a, b) =>
        `${a.campusName} ${a.programName} ${a.name}`.localeCompare(
          `${b.campusName} ${b.programName} ${b.name}`,
          "pt-BR",
          { sensitivity: "base" }
        )
      ),
    [enrollmentsQuery.data]
  );
  const isLoading =
    studentQuery.isLoading ||
    structureQuery.isLoading ||
    enrollmentsQuery.isLoading;
  const queryError =
    studentQuery.error ?? structureQuery.error ?? enrollmentsQuery.error ?? null;

  useEffect(() => {
    if (student) {
      setForm(formFromStudent(student));
    }
  }, [student]);

  const updateField = (field: keyof StudentForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    await updateStudentMutation.mutateAsync(form);
  };

  if (studentQuery.isLoading) {
    return <LoadingState label="Carregando cadastro do aluno..." />;
  }

  if (!student) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader
          title="Aluno nao encontrado"
          description="Volte para a base de alunos e selecione um cadastro existente."
          badge="Aluno"
        />
        <Link
          href="/students"
          className={cn(buttonVariants({ variant: "default", size: "lg" }))}
        >
          Voltar para alunos
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={student.name || `Matrícula ${student.studentId}`}
        description="Gerencie os dados globais do aluno e os vínculos com disciplinas."
        badge="Aluno"
      />
      <ToastOnError error={queryError} />

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border border-border/60 bg-white/90 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Matrícula
          </p>
          <p className="mt-1 text-lg font-semibold">{student.studentId}</p>
        </Card>
        <Card className="rounded-2xl border border-border/60 bg-white/90 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Status
          </p>
          <div className="mt-2">
            <Badge variant="outline">{studentStatusLabel(student.status)}</Badge>
          </div>
        </Card>
        <Card className="rounded-2xl border border-border/60 bg-white/90 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Vínculos
          </p>
          <p className="mt-1 text-lg font-semibold">{enrollments.length}</p>
        </Card>
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
          <h2 className="text-lg font-semibold">Cadastro global</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Essas informações são compartilhadas por todos os vínculos do aluno.
          </p>

          <div className="mt-5 grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="student-name">Nome</Label>
              <Input
                id="student-name"
                value={form.name}
                disabled={updateStudentMutation.isPending}
                onChange={(event) => updateField("name", event.target.value)}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="student-email">Email</Label>
                <Input
                  id="student-email"
                  type="email"
                  value={form.email}
                  disabled={updateStudentMutation.isPending}
                  onChange={(event) => updateField("email", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-phone">Telefone</Label>
                <Input
                  id="student-phone"
                  value={form.phone}
                  disabled={updateStudentMutation.isPending}
                  onChange={(event) => updateField("phone", event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status acadêmico</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  updateField("status", (value ?? "PENDING") as StudentStatus)
                }
              >
                <SelectTrigger disabled={updateStudentMutation.isPending}>
                  <SelectValueFromOptions
                    placeholder="Selecione"
                    options={statusOptions}
                    value={form.status}
                  />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-annotation">Observação</Label>
              <Textarea
                id="student-annotation"
                rows={4}
                value={form.annotation}
                disabled={updateStudentMutation.isPending}
                onChange={(event) =>
                  updateField("annotation", event.target.value)
                }
              />
            </div>
            <div className="flex flex-wrap justify-between gap-3">
              <Link
                href="/students"
                className={cn(buttonVariants({ variant: "ghost" }))}
              >
                Voltar
              </Link>
              <Button
                type="button"
                disabled={updateStudentMutation.isPending}
                onClick={handleSave}
              >
                {updateStudentMutation.isPending
                  ? "Salvando..."
                  : "Salvar cadastro"}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Vínculos com disciplinas</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Desvincular remove o aluno apenas daquela disciplina.
              </p>
            </div>
            <Badge variant="outline">{enrollments.length} vínculo(s)</Badge>
          </div>

          <div className="mt-5 max-h-[520px] overflow-auto rounded-2xl border border-border/60">
            {isLoading ? (
              <LoadingState label="Carregando vínculos..." className="rounded-none border-0" />
            ) : enrollments.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Disciplina</TableHead>
                    <TableHead>Campus</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.map((discipline) => (
                    <TableRow key={discipline.id}>
                      <TableCell>
                        <Link
                          href={`/disciplines/${discipline.id}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {discipline.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {discipline.programName}
                        </p>
                      </TableCell>
                      <TableCell>{discipline.campusName}</TableCell>
                      <TableCell>
                        {discipline.year}.{discipline.semester}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={
                            unlinkMutation.isPending &&
                            unlinkMutation.variables?.disciplineId === discipline.id
                          }
                          onClick={() =>
                            unlinkMutation.mutate({
                              disciplineId: discipline.id,
                              disciplineName: discipline.name,
                            })
                          }
                        >
                          {unlinkMutation.isPending &&
                          unlinkMutation.variables?.disciplineId === discipline.id
                            ? "Desvinculando..."
                            : "Desvincular"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                title="Nenhum vínculo encontrado"
                description="Adicione ou importe a matrícula em uma disciplina para criar o vínculo."
                className="rounded-none border-0"
              />
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
