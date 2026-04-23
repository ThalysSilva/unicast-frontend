"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { FormProvider, useForm } from "react-hook-form";

import {
  FormCheckbox,
  FormEmailInput,
  FormInput,
  FormPhoneInput,
  FormSelect,
  FormTextarea,
} from "@/components/forms/form-fields";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  type AcademicDiscipline,
  loadAcademicStructure,
} from "@/lib/academic-structure";
import { apiRequest, extractData } from "@/lib/api";
import { studentStatusLabel } from "@/lib/format";
import { formatInternationalPhoneInput, normalizePhone } from "@/lib/phone";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import {
  optionalEmailRules,
  optionalPhoneRules,
  requiredTrimmed,
} from "@/lib/validation";
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
  noPhone: boolean;
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
  noPhone: false,
  annotation: "",
  status: "PENDING",
});

const formFromStudent = (student: Student): StudentForm => ({
  name: student.name ?? "",
  email: student.email ?? "",
  phone: formatInternationalPhoneInput(student.phone ?? ""),
  noPhone: student.noPhone ?? false,
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
  const form = useForm<StudentForm>({ defaultValues: emptyForm() });
  const { showToast } = useToast();
  const noPhone = form.watch("noPhone");

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
          phone: values.noPhone ? null : nullableValue(normalizePhone(values.phone)),
          noPhone: values.noPhone,
          annotation: nullableValue(values.annotation),
          status: values.status,
        },
      }),
    invalidateQueryKeys: [
      queryKeys.students.root(),
      queryKeys.dashboard.summary(),
      ["student", { studentId }],
    ],
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
    invalidateQueryKeys: [
      queryKeys.students.root(),
      queryKeys.dashboard.summary(),
    ],
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
      form.reset(formFromStudent(student));
    }
  }, [form, student]);

  useEffect(() => {
    if (noPhone) {
      form.setValue("phone", "");
      form.clearErrors("phone");
    }
  }, [form, noPhone]);

  const handleSave = async (values: StudentForm) =>
    updateStudentMutation.mutateAsync(values);

  if (studentQuery.isLoading) {
    return <LoadingState label="Carregando cadastro do aluno..." />;
  }

  if (!student) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader
          title="Aluno não encontrado"
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

          <FormProvider {...form}>
            <form
              className="mt-5 grid gap-4"
              onSubmit={form.handleSubmit(handleSave)}
            >
              <FormInput<StudentForm>
                name="name"
                label="Nome"
                disabled={updateStudentMutation.isPending}
                rules={{
                  required: "Informe o nome do aluno",
                  validate: requiredTrimmed("Informe o nome do aluno"),
                }}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <FormEmailInput<StudentForm>
                  name="email"
                  label="Email"
                  disabled={updateStudentMutation.isPending}
                  rules={optionalEmailRules()}
                />
                <FormPhoneInput<StudentForm>
                  name="phone"
                  label="Telefone"
                  disabled={updateStudentMutation.isPending || noPhone}
                  helper={
                    noPhone
                      ? "Marcado como sem número de contato."
                      : undefined
                  }
                  rules={{
                    validate: (value?: string) =>
                      noPhone || optionalPhoneRules().validate(value),
                  }}
                />
              </div>
              <FormCheckbox<StudentForm>
                name="noPhone"
                label="Aluno não possui número de contato"
                description="Permite manter o aluno ativo apenas com email válido."
                disabled={updateStudentMutation.isPending}
              />
              <FormSelect<StudentForm>
                name="status"
                label="Status acadêmico"
                disabled={updateStudentMutation.isPending}
                options={statusOptions}
                rules={{ required: "Informe o status acadêmico" }}
              />
              <FormTextarea<StudentForm>
                name="annotation"
                label="Observação"
                rows={4}
                disabled={updateStudentMutation.isPending}
              />
              <div className="flex flex-wrap justify-between gap-3">
                <Link
                  href="/students"
                  className={cn(buttonVariants({ variant: "ghost" }))}
                >
                  Voltar
                </Link>
                <Button type="submit" disabled={updateStudentMutation.isPending}>
                  {updateStudentMutation.isPending
                    ? "Salvando..."
                    : "Salvar cadastro"}
                </Button>
              </div>
            </form>
          </FormProvider>
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
