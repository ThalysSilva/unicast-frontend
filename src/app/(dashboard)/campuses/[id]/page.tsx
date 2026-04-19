"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { FormInput, FormTextarea } from "@/components/forms/form-fields";
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

type ProgramFormValues = {
  name: string;
  description: string;
  active: boolean;
};

export default function CampusDetailPage() {
  const params = useParams<{ id: string }>();
  const campusId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { showToast } = useToast();

  const form = useForm<ProgramFormValues>({
    defaultValues: {
      name: "",
      description: "",
      active: true,
    },
  });

  const structureQuery = useApiQuery({
    queryKey: ["academic-structure"],
    queryFn: loadAcademicStructure,
  });

  const campus = useMemo(
    () => structureQuery.data?.campuses.find((item) => item.id === campusId),
    [campusId, structureQuery.data?.campuses]
  );
  const programs = useMemo(
    () =>
      (structureQuery.data?.programs ?? []).filter(
        (program) => program.campusId === campusId
      ),
    [campusId, structureQuery.data?.programs]
  );
  const disciplines = structureQuery.data?.disciplines ?? [];

  const createProgram = async (values: ProgramFormValues) => {
    const res = await apiRequest<ApiMessage>("/program", {
      method: "POST",
      body: {
        ...values,
        campus_id: campusId,
      },
    });

    showToast({ title: res.message ?? "Curso criado", variant: "success" });
    form.reset({ name: "", description: "", active: true });
    await structureQuery.refetch();
  };

  if (structureQuery.isLoading) {
    return <LoadingState label="Carregando campus..." />;
  }

  if (!campus) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader
          title="Campus não encontrado"
          description="Volte para a estrutura acadêmica e selecione um campus cadastrado."
          badge="Campus"
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
        title={campus.name}
        description={campus.description || "Cursos e disciplinas deste campus."}
        badge="Campus"
      />
      <AcademicBreadcrumb
        items={[
          { label: "Estrutura", href: "/setup" },
          { label: campus.name },
        ]}
      />
      <ToastOnError error={structureQuery.error} />

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-2xl border border-border/60 bg-white/90 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Cursos
          </p>
          <p className="mt-2 text-3xl font-semibold">{programs.length}</p>
        </Card>
        <Card className="rounded-2xl border border-border/60 bg-white/90 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Disciplinas
          </p>
          <p className="mt-2 text-3xl font-semibold">
            {disciplines.filter((discipline) => discipline.campusId === campus.id).length}
          </p>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="rounded-3xl border border-border/60 bg-white/90 py-0">
          <CardHeader className="border-b border-border/60 px-6 py-6">
            <CardTitle className="text-lg">Novo curso</CardTitle>
            <p className="text-sm text-muted-foreground">
              O curso será criado dentro de {campus.name}.
            </p>
          </CardHeader>
          <CardContent className="px-6 py-6">
            <FormProvider {...form}>
              <form
                className="flex flex-col gap-4"
                onSubmit={form.handleSubmit(createProgram)}
              >
                <FormInput<ProgramFormValues>
                  name="name"
                  label="Nome do curso"
                  rules={{
                    required: "Informe o nome do curso",
                    validate: requiredTrimmed("Informe o nome do curso"),
                  }}
                />
                <FormTextarea<ProgramFormValues>
                  name="description"
                  label="Descrição"
                />
                <button
                  type="submit"
                  className={cn(buttonVariants({ variant: "default", size: "lg" }))}
                >
                  Salvar curso
                </button>
              </form>
            </FormProvider>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Cursos deste campus</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Abra um curso para cadastrar disciplinas e acompanhar as turmas.
              </p>
            </div>
            <Link
              href="/setup"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              Voltar
            </Link>
          </div>

          <div className="mt-5 grid max-h-[560px] gap-3 overflow-y-auto pr-1">
            {programs.length ? (
              programs.map((program) => {
                const programDisciplines = disciplines.filter(
                  (discipline) => discipline.programId === program.id
                );

                return (
                  <Link
                    key={program.id}
                    href={`/programs/${program.id}`}
                    className="block rounded-2xl border border-border/60 bg-background px-5 py-4 transition hover:border-primary/40 hover:bg-white"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">
                          {program.name}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {program.description || "Sem descrição"}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {programDisciplines.length} disciplina(s)
                      </Badge>
                    </div>
                  </Link>
                );
              })
            ) : (
              <p className="rounded-2xl border border-border/60 bg-background px-5 py-4 text-sm text-muted-foreground">
                Nenhum curso cadastrado neste campus ainda.
              </p>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
