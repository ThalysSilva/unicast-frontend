"use client";

import Link from "next/link";
import { FormProvider, useForm } from "react-hook-form";

import { FormInput, FormTextarea } from "@/components/forms/form-fields";
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

type CampusFormValues = { name: string; description: string };

export default function SetupPage() {
  const { showToast } = useToast();
  const campusForm = useForm<CampusFormValues>({
    defaultValues: { name: "", description: "" },
  });

  const structureQuery = useApiQuery({
    queryKey: ["academic-structure"],
    queryFn: loadAcademicStructure,
  });

  const campuses = structureQuery.data?.campuses ?? [];
  const programs = structureQuery.data?.programs ?? [];
  const disciplines = structureQuery.data?.disciplines ?? [];

  const createCampus = async (values: CampusFormValues) => {
    const res = await apiRequest<ApiMessage>("/campus", {
      method: "POST",
      body: values,
    });

    showToast({ title: res.message ?? "Campus criado", variant: "success" });
    campusForm.reset();
    await structureQuery.refetch();
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Estrutura academica"
        description="Comece pelo campus. Dentro de cada campus voce organiza cursos, e dentro de cada curso cria as disciplinas e acompanha a turma."
        badge="Fluxo docente"
      />
      <ToastOnError error={structureQuery.error} />

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border border-border/60 bg-white/90 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Campus
          </p>
          <p className="mt-2 text-3xl font-semibold">{campuses.length}</p>
        </Card>
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
          <p className="mt-2 text-3xl font-semibold">{disciplines.length}</p>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="rounded-3xl border border-border/60 bg-white/90 py-0">
          <CardHeader className="border-b border-border/60 px-6 py-6">
            <CardTitle className="text-lg">Novo campus</CardTitle>
            <p className="text-sm text-muted-foreground">
              Campus e a primeira divisao da estrutura. Cursos e disciplinas ficam dentro dele.
            </p>
          </CardHeader>
          <CardContent className="px-6 py-6">
            <FormProvider {...campusForm}>
              <form
                className="flex flex-col gap-4"
                onSubmit={campusForm.handleSubmit(createCampus)}
              >
                <FormInput<CampusFormValues>
                  name="name"
                  label="Nome"
                  rules={{
                    required: "Informe o nome do campus",
                    validate: requiredTrimmed("Informe o nome do campus"),
                  }}
                />
                <FormTextarea<CampusFormValues>
                  name="description"
                  label="Descricao"
                />
                <button
                  type="submit"
                  className={cn(buttonVariants({ variant: "default", size: "lg" }))}
                >
                  Salvar campus
                </button>
              </form>
            </FormProvider>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Campus cadastrados</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Abra um campus para criar cursos e navegar pela estrutura dele.
              </p>
            </div>
          </div>

          <div className="mt-5 grid max-h-[560px] gap-3 overflow-y-auto pr-1">
            {structureQuery.isLoading ? (
              <LoadingState label="Carregando campus..." />
            ) : campuses.length ? (
              campuses.map((campus) => {
                const campusPrograms = programs.filter(
                  (program) => program.campusId === campus.id
                );
                const campusDisciplines = disciplines.filter(
                  (discipline) => discipline.campusId === campus.id
                );

                return (
                  <Link
                    key={campus.id}
                    href={`/campuses/${campus.id}`}
                    className="block rounded-2xl border border-border/60 bg-background px-5 py-4 transition hover:border-primary/40 hover:bg-white"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">
                          {campus.name}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {campus.description || "Sem descricao"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">
                          {campusPrograms.length} curso(s)
                        </Badge>
                        <Badge variant="secondary">
                          {campusDisciplines.length} disciplina(s)
                        </Badge>
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <p className="rounded-2xl border border-border/60 bg-background px-5 py-4 text-sm text-muted-foreground">
                Nenhum campus cadastrado ainda.
              </p>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
