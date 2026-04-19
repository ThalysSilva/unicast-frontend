"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { FormProvider, useForm } from "react-hook-form";

import {
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/components/forms/form-fields";
import { AcademicBreadcrumb } from "@/components/layout/academic-breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { ToastOnError, useToast } from "@/components/ui/toast-provider";
import { useApiQuery } from "@/hooks/use-api-query";
import { apiRequest } from "@/lib/api";
import { loadAcademicStructure } from "@/lib/academic-structure";
import { cn } from "@/lib/utils";
import { requiredTrimmed } from "@/lib/validation";
import type { ApiMessage } from "@/lib/types";

type DisciplineFormValues = {
  name: string;
  description: string;
  year: number;
  semester: string;
};

const currentYear = new Date().getFullYear();
const yearMin = currentYear - 1;
const yearMax = currentYear + 3;
const semesterOptions = [
  { value: "1", label: "1º semestre" },
  { value: "2", label: "2º semestre" },
];

export default function ProgramDetailPage() {
  const params = useParams<{ id: string }>();
  const programId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { showToast } = useToast();

  const form = useForm<DisciplineFormValues>({
    defaultValues: {
      name: "",
      description: "",
      year: currentYear,
      semester: "1",
    },
  });

  const structureQuery = useApiQuery({
    queryKey: ["academic-structure"],
    queryFn: loadAcademicStructure,
  });

  const program = useMemo(
    () => structureQuery.data?.programs.find((item) => item.id === programId),
    [programId, structureQuery.data?.programs]
  );
  const disciplines = useMemo(
    () =>
      (structureQuery.data?.disciplines ?? []).filter(
        (discipline) => discipline.programId === programId
      ),
    [programId, structureQuery.data?.disciplines]
  );

  const createDiscipline = async (values: DisciplineFormValues) => {
    const res = await apiRequest<ApiMessage>("/discipline", {
      method: "POST",
      body: {
        name: values.name,
        description: values.description,
        year: Number(values.year),
        semester: Number(values.semester),
        program_id: programId,
      },
    });

    showToast({ title: res.message ?? "Disciplina criada", variant: "success" });
    form.reset({
      name: "",
      description: "",
      year: values.year,
      semester: values.semester,
    });
    await structureQuery.refetch();
  };

  if (structureQuery.isLoading) {
    return <LoadingState label="Carregando curso..." />;
  }

  if (!program) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader
          title="Curso não encontrado"
          description="Volte para a estrutura acadêmica e selecione um curso cadastrado."
          badge="Curso"
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
        title={program.name}
        description={`${program.campusName} / ${program.description || "Disciplinas deste curso."}`}
        badge="Curso"
      />
      <AcademicBreadcrumb
        items={[
          { label: "Estrutura", href: "/setup" },
          { label: program.campusName, href: `/campuses/${program.campusId}` },
          { label: program.name },
        ]}
      />
      <ToastOnError error={structureQuery.error} />

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-2xl border border-border/60 bg-white/90 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Disciplinas
          </p>
          <p className="mt-2 text-3xl font-semibold">{disciplines.length}</p>
        </Card>
        <Card className="rounded-2xl border border-border/60 bg-white/90 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Campus
          </p>
          <p className="mt-2 text-sm font-semibold">{program.campusName}</p>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="rounded-3xl border border-border/60 bg-white/90 py-0">
          <CardHeader className="border-b border-border/60 px-6 py-6">
            <CardTitle className="text-lg">Nova disciplina</CardTitle>
            <p className="text-sm text-muted-foreground">
              A disciplina será criada dentro de {program.name}.
            </p>
          </CardHeader>
          <CardContent className="px-6 py-6">
            <FormProvider {...form}>
              <form
                className="flex flex-col gap-4"
                onSubmit={form.handleSubmit(createDiscipline)}
              >
                <FormInput<DisciplineFormValues>
                  name="name"
                  label="Nome"
                  rules={{
                    required: "Informe o nome da disciplina",
                    validate: requiredTrimmed("Informe o nome da disciplina"),
                  }}
                />
                <FormTextarea<DisciplineFormValues>
                  name="description"
                  label="Descrição"
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <FormInput<DisciplineFormValues>
                    name="year"
                    label="Ano"
                    type="number"
                    parseValue={(value) => Number(value)}
                    rules={{
                      required: "Informe o ano",
                      min: {
                        value: yearMin,
                        message: `Use um ano entre ${yearMin} e ${yearMax}`,
                      },
                      max: {
                        value: yearMax,
                        message: `Use um ano entre ${yearMin} e ${yearMax}`,
                      },
                    }}
                  />
                  <FormSelect<DisciplineFormValues>
                    name="semester"
                    label="Semestre"
                    options={semesterOptions}
                    rules={{
                      required: "Informe o semestre",
                      validate: (value) =>
                        value === "1" ||
                        value === "2" ||
                        "Selecione 1º ou 2º semestre",
                    }}
                  />
                </div>
                <button
                  type="submit"
                  className={cn(buttonVariants({ variant: "default", size: "lg" }))}
                >
                  Salvar disciplina
                </button>
              </form>
            </FormProvider>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Disciplinas deste curso</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Abra uma disciplina para ver a turma, convite e matrículas.
              </p>
            </div>
            <Link
              href={`/campuses/${program.campusId}`}
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              Voltar
            </Link>
          </div>

          <div className="mt-5 grid max-h-[560px] gap-3 overflow-y-auto pr-1">
            {disciplines.length ? (
              disciplines.map((discipline) => (
                <Link
                  key={discipline.id}
                  href={`/disciplines/${discipline.id}`}
                  className="block rounded-2xl border border-border/60 bg-background px-5 py-4 transition hover:border-primary/40 hover:bg-white"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        {discipline.name}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {discipline.description || "Sem descrição"}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {discipline.year}/{discipline.semester}
                    </Badge>
                  </div>
                </Link>
              ))
            ) : (
              <p className="rounded-2xl border border-border/60 bg-background px-5 py-4 text-sm text-muted-foreground">
                Nenhuma disciplina cadastrada neste curso ainda.
              </p>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
