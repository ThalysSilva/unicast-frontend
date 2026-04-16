"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { useForm } from "react-hook-form";

import { AcademicBreadcrumb } from "@/components/layout/academic-breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
import { Textarea } from "@/components/ui/textarea";
import { ToastOnError, useToast } from "@/components/ui/toast-provider";
import { useApiQuery } from "@/hooks/use-api-query";
import { apiRequest } from "@/lib/api";
import { loadAcademicStructure } from "@/lib/academic-structure";
import { cn } from "@/lib/utils";
import type { ApiMessage } from "@/lib/types";

export default function ProgramDetailPage() {
  const params = useParams<{ id: string }>();
  const programId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { showToast } = useToast();

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      year: new Date().getFullYear(),
      semester: 1,
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
  const courses = useMemo(
    () =>
      (structureQuery.data?.courses ?? []).filter(
        (course) => course.programId === programId
      ),
    [programId, structureQuery.data?.courses]
  );

  const createCourse = async (values: {
    name: string;
    description: string;
    year: number;
    semester: number;
  }) => {
    const res = await apiRequest<ApiMessage>("/course", {
      method: "POST",
      body: {
        ...values,
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
          title="Curso nao encontrado"
          description="Volte para a estrutura academica e selecione um curso cadastrado."
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
          <p className="mt-2 text-3xl font-semibold">{courses.length}</p>
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
              A disciplina sera criada dentro de {program.name}.
            </p>
          </CardHeader>
          <CardContent className="px-6 py-6">
            <form
              className="flex flex-col gap-4"
              onSubmit={form.handleSubmit(createCourse)}
            >
              <div className="space-y-2">
                <Label htmlFor="course-name">Nome</Label>
                <Input id="course-name" {...form.register("name")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-desc">Descricao</Label>
                <Textarea id="course-desc" {...form.register("description")} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="course-year">Ano</Label>
                  <Input
                    id="course-year"
                    type="number"
                    {...form.register("year", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="course-sem">Semestre</Label>
                  <Input
                    id="course-sem"
                    type="number"
                    {...form.register("semester", { valueAsNumber: true })}
                  />
                </div>
              </div>
              <button
                type="submit"
                className={cn(buttonVariants({ variant: "default", size: "lg" }))}
              >
                Salvar disciplina
              </button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Disciplinas deste curso</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Abra uma disciplina para ver a turma, convite e matriculas.
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
            {courses.length ? (
              courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/courses/${course.id}`}
                  className="block rounded-2xl border border-border/60 bg-background px-5 py-4 transition hover:border-primary/40 hover:bg-white"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        {course.name}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {course.description || "Sem descricao"}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {course.year}/{course.semester}
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
