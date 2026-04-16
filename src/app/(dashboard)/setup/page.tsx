"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectValueFromOptions,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToastOnError, useToast } from "@/components/ui/toast-provider";
import { useApiQuery } from "@/hooks/use-api-query";
import { apiRequest, extractData } from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  ApiMessage,
  ApiResponse,
  Campus,
  Course,
  Program,
} from "@/lib/types";

const isProgramLike = (value: unknown): value is Program => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<Program>;

  return (
    typeof candidate.id === "string" &&
    candidate.id.length > 0 &&
    typeof candidate.name === "string" &&
    candidate.name.length > 0
  );
};

const extractPrograms = (
  payload: ApiResponse<Program[]> | Program[] | unknown,
  campus: Campus
) => {
  const data = extractData(payload as ApiResponse<Program[]> | Program[]);

  if (!Array.isArray(data)) {
    return [];
  }

  return data.filter(
    (item): item is Program =>
      isProgramLike(item) &&
      (item.id !== campus.id || item.name !== campus.name)
  );
};

const setupSections = [
  {
    value: "campus",
    label: "Campus",
    description: "Defina as unidades ou polos atendidos.",
  },
  {
    value: "program",
    label: "Curso",
    description: "Cadastre cursos como Ciencia da Computacao ou Biologia.",
  },
  {
    value: "course",
    label: "Disciplina",
    description: "Crie a disciplina que vai receber matriculas e convite.",
  },
  {
    value: "roster",
    label: "Turma",
    description: "Matriculas entram vinculadas a disciplina, nao soltas.",
  },
] as const;

export default function SetupPage() {
  const [activeSection, setActiveSection] =
    useState<(typeof setupSections)[number]["value"]>("campus");
  const { showToast } = useToast();

  const campusForm = useForm({
    defaultValues: { name: "", description: "" },
  });
  const programForm = useForm({
    defaultValues: {
      name: "",
      description: "",
      campus_id: "",
      active: true,
    },
  });
  const courseForm = useForm({
    defaultValues: {
      name: "",
      description: "",
      program_id: "",
      year: 2025,
      semester: 1,
    },
  });
  const selectedCampusId = useWatch({
    control: programForm.control,
    name: "campus_id",
  });
  const selectedProgramId = useWatch({
    control: courseForm.control,
    name: "program_id",
  });

  const setupQuery = useApiQuery({
    queryKey: ["setup-data"],
    queryFn: async () => {
      const campusRes = await apiRequest<ApiResponse<Campus[]>>("/campus");
      const campuses = extractData(campusRes);

      const programResults = await Promise.allSettled(
        campuses.map((campus) =>
          apiRequest<ApiResponse<Program[]>>(`/program/${campus.id}`)
        )
      );
      const programs = programResults.flatMap((res, index) => {
        if (res.status !== "fulfilled") return [];
        return extractPrograms(res.value, campuses[index]);
      });

      const [courseRes, studentRes] = await Promise.allSettled([
        apiRequest<ApiResponse<Course[]>>("/course/any"),
        apiRequest<ApiResponse<never[]>>("/student"),
      ]);

      return {
        campuses,
        programs,
        courses:
          courseRes.status === "fulfilled" ? extractData(courseRes.value) : [],
        students:
          studentRes.status === "fulfilled"
            ? extractData(studentRes.value)
            : [],
      };
    },
  });

  const campuses = setupQuery.data?.campuses ?? [];
  const programs = Array.from(
    new Map((setupQuery.data?.programs ?? []).map((program) => [program.id, program])).values()
  );
  const courses = setupQuery.data?.courses ?? [];
  const campusOptions = campuses.map((campus) => ({
    value: campus.id,
    label: campus.name,
  }));
  const programOptions = programs.map((program) => ({
    value: program.id,
    label: program.name,
  }));

  const createCampus = async (values: { name: string; description: string }) => {
    const res = await apiRequest<ApiMessage>("/campus", {
      method: "POST",
      body: values,
    });
    showToast({ title: res.message ?? "Campus criado", variant: "success" });
    campusForm.reset();
    await setupQuery.refetch();
  };

  const createProgram = async (values: {
    name: string;
    description: string;
    campus_id: string;
    active: boolean;
  }) => {
    const res = await apiRequest<ApiMessage>("/program", {
      method: "POST",
      body: values,
    });
    showToast({ title: res.message ?? "Curso criado", variant: "success" });
    programForm.reset({ ...values, name: "", description: "" });
    await setupQuery.refetch();
  };

  const createCourse = async (values: {
    name: string;
    description: string;
    program_id: string;
    year: number;
    semester: number;
  }) => {
    const res = await apiRequest<ApiMessage>("/course", {
      method: "POST",
      body: values,
    });
    showToast({ title: res.message ?? "Disciplina criada", variant: "success" });
    courseForm.reset({ ...values, name: "", description: "" });
    await setupQuery.refetch();
  };

  const summary = {
    campus: campuses.length,
    program: programs.length,
    course: courses.length,
    roster: courses.length,
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Estrutura da turma"
        description="Monte a base da disciplina, registre as matriculas que voce ja conhece e prepare o caminho para os alunos completarem email e telefone por conta propria."
        badge="Fluxo docente"
      />
      <ToastOnError error={setupQuery.error} />

      {setupQuery.isLoading ? (
        <LoadingState label="Carregando estrutura academica..." />
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {setupSections.map((section) => (
          <button
            key={section.value}
            type="button"
            onClick={() => setActiveSection(section.value)}
            className={cn(
              "rounded-3xl border px-5 py-4 text-left transition hover:border-primary/40 hover:bg-white",
              activeSection === section.value
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border/60 bg-white/80"
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">
                {section.label}
              </p>
              <Badge variant="outline">{summary[section.value]}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {section.description}
            </p>
          </button>
        ))}
      </section>

      <Tabs
        value={activeSection}
        onValueChange={(value) =>
          setActiveSection(value as (typeof setupSections)[number]["value"])
        }
        className="gap-6"
      >
        <TabsList className="h-auto w-full flex-wrap justify-start rounded-2xl bg-muted/70 p-1.5">
          {setupSections.map((section) => (
            <TabsTrigger
              key={section.value}
              value={section.value}
              className="min-w-[120px] rounded-xl px-4 py-2"
            >
              {section.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_360px]">
          <div>
            <TabsContent value="campus">
              <Card className="rounded-3xl border border-border/60 bg-white/90 py-0">
                <CardHeader className="border-b border-border/60 px-6 py-6">
                  <CardTitle className="text-lg">Cadastro de campus</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Comece pela estrutura institucional. Os cursos dependem de ao menos um campus.
                  </p>
                </CardHeader>
                <CardContent className="px-6 py-6">
                  <form
                    className="flex flex-col gap-4"
                    onSubmit={campusForm.handleSubmit(createCampus)}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="campus-name">Nome</Label>
                      <Input id="campus-name" {...campusForm.register("name")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="campus-desc">Descricao</Label>
                      <Textarea
                        id="campus-desc"
                        {...campusForm.register("description")}
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className={cn(buttonVariants({ variant: "default", size: "lg" }))}
                      >
                        Salvar campus
                      </button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="program">
              <Card className="rounded-3xl border border-border/60 bg-white/90 py-0">
                <CardHeader className="border-b border-border/60 px-6 py-6">
                  <CardTitle className="text-lg">Cadastro de curso</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    O curso organiza as disciplinas que vao receber matriculas e convites.
                  </p>
                </CardHeader>
                <CardContent className="px-6 py-6">
                  {!campuses.length ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      Cadastre ao menos um campus antes de criar cursos.
                    </div>
                  ) : null}
                  <form
                    className="mt-4 flex flex-col gap-4"
                    onSubmit={programForm.handleSubmit(createProgram)}
                  >
                    <div className="space-y-2">
                      <Label>Campus</Label>
                      <Select
                        value={selectedCampusId}
                        onValueChange={(value) =>
                          programForm.setValue("campus_id", value ?? "")
                        }
                      >
                        <SelectTrigger>
                          <SelectValueFromOptions
                            placeholder="Selecione um campus"
                            options={campusOptions}
                            value={selectedCampusId}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {campuses.map((campus) => (
                            <SelectItem key={campus.id} value={campus.id}>
                              {campus.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="program-name">Nome do curso</Label>
                      <Input id="program-name" {...programForm.register("name")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="program-desc">Descricao</Label>
                      <Textarea
                        id="program-desc"
                        {...programForm.register("description")}
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={!campuses.length}
                        className={cn(buttonVariants({ variant: "default", size: "lg" }))}
                      >
                        Salvar curso
                      </button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="course">
              <Card className="rounded-3xl border border-border/60 bg-white/90 py-0">
                <CardHeader className="border-b border-border/60 px-6 py-6">
                  <CardTitle className="text-lg">Cadastro de disciplina</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    A disciplina e a unidade pratica do fluxo: e nela que voce importa matriculas, gera convite e acompanha o cadastro da turma.
                  </p>
                </CardHeader>
                <CardContent className="px-6 py-6">
                  {!programs.length ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      Cadastre ao menos um curso antes de criar disciplinas.
                    </div>
                  ) : null}
                  <form
                    className="mt-4 flex flex-col gap-4"
                    onSubmit={courseForm.handleSubmit(createCourse)}
                  >
                    <div className="space-y-2">
                      <Label>Curso</Label>
                      <Select
                        value={selectedProgramId}
                        onValueChange={(value) =>
                          courseForm.setValue("program_id", value ?? "")
                        }
                      >
                        <SelectTrigger>
                          <SelectValueFromOptions
                            placeholder="Selecione um curso"
                            options={programOptions}
                            value={selectedProgramId}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {programs.map((program) => (
                            <SelectItem key={program.id} value={program.id}>
                              {program.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="course-name">Nome</Label>
                      <Input id="course-name" {...courseForm.register("name")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="course-desc">Descricao</Label>
                      <Textarea
                        id="course-desc"
                        {...courseForm.register("description")}
                      />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="course-year">Ano</Label>
                        <Input
                          id="course-year"
                          type="number"
                          {...courseForm.register("year", { valueAsNumber: true })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="course-sem">Semestre</Label>
                        <Input
                          id="course-sem"
                          type="number"
                          {...courseForm.register("semester", { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={!programs.length}
                        className={cn(buttonVariants({ variant: "default", size: "lg" }))}
                      >
                        Salvar disciplina
                      </button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="roster">
              <Card className="rounded-3xl border border-border/60 bg-white/90 py-0">
                <CardHeader className="border-b border-border/60 px-6 py-6">
                  <CardTitle className="text-lg">Vinculo da turma</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    A matricula precisa entrar vinculada a uma disciplina para o convite funcionar. O backend valida enrollment antes do auto-cadastro.
                  </p>
                </CardHeader>
                <CardContent className="px-6 py-6">
                  <div className="grid gap-4">
                    <div className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-4">
                      <p className="text-sm text-muted-foreground">
                        Use a tela de matriculas para importar ou registrar alunos dentro de uma disciplina especifica. Assim o sistema cria ou reaproveita o aluno e garante o vinculo necessario para o convite.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background px-4 py-4 text-sm text-muted-foreground">
                      Fluxo correto: disciplina, matriculas, convite, auto-cadastro e mensagens.
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Link
                        href="/students"
                        className={cn(buttonVariants({ variant: "default", size: "lg" }))}
                      >
                        Abrir matriculas
                      </Link>
                      <Link
                        href="/invites"
                        className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
                      >
                        Abrir convites
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>

          <aside className="flex flex-col gap-4">
            <Card className="rounded-3xl border border-border/60 bg-white/90 py-0">
              <CardHeader className="border-b border-border/60 px-6 py-5">
                <CardTitle className="text-base">Resumo atual</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 px-6 py-5">
                <div className="rounded-2xl border border-border/60 bg-background px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Campus
                  </p>
                  <p className="mt-1 text-2xl font-semibold">{campuses.length}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Cursos
                  </p>
                  <p className="mt-1 text-2xl font-semibold">{programs.length}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Disciplinas
                  </p>
                  <p className="mt-1 text-2xl font-semibold">{courses.length}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Disciplinas com turma
                  </p>
                  <p className="mt-1 text-2xl font-semibold">{courses.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border border-border/60 bg-white/90 py-0">
              <CardHeader className="border-b border-border/60 px-6 py-5">
                <CardTitle className="text-base">Proximos passos</CardTitle>
              </CardHeader>
              <CardContent className="px-6 py-5">
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>1. Estruture campus, curso e disciplina.</p>
                  <p>2. Registre matriculas dentro da disciplina pela tela dedicada.</p>
                  <p>3. Gere o convite da disciplina e compartilhe o link com a turma.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border border-border/60 bg-white/90 py-0">
              <CardHeader className="border-b border-border/60 px-6 py-5">
                <CardTitle className="text-base">Itens recentes</CardTitle>
              </CardHeader>
              <CardContent className="px-6 py-5">
                <div className="flex flex-wrap gap-2">
                  {activeSection === "campus" &&
                    (campuses.length ? (
                      campuses.map((campus) => (
                        <Badge key={campus.id} variant="outline">
                          {campus.name}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Nenhum campus cadastrado ainda.
                      </p>
                    ))}

                  {activeSection === "program" &&
                    (programs.length ? (
                      programs.map((program) => (
                        <Badge key={program.id} variant="secondary">
                          {program.name}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Nenhum curso cadastrado ainda.
                      </p>
                    ))}

                  {activeSection === "course" &&
                    (courses.length ? (
                      courses.map((course) => (
                        <Badge key={course.id} variant="outline">
                          {course.name} {course.year}/{course.semester}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Nenhuma disciplina cadastrada ainda.
                      </p>
                    ))}

                  {activeSection === "roster" &&
                    (courses.length ? (
                      courses.slice(0, 10).map((course) => (
                        <Badge key={course.id} variant="outline">
                          {course.name}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Nenhuma disciplina pronta para receber matriculas ainda.
                      </p>
                    ))}
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </Tabs>
    </div>
  );
}
