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
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useApiQuery } from "@/hooks/use-api-query";
import { apiRequest, extractData } from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  ApiMessage,
  ApiResponse,
  Campus,
  Course,
  Program,
  Student,
  StudentStatus,
} from "@/lib/types";

const statusOptions: StudentStatus[] = [
  "ACTIVE",
  "PENDING",
  "LOCKED",
  "CANCELED",
  "GRADUATED",
];

const setupSections = [
  {
    value: "campus",
    label: "Campus",
    description: "Defina as unidades ou polos atendidos.",
  },
  {
    value: "program",
    label: "Programa",
    description: "Organize cursos ou frentes por campus.",
  },
  {
    value: "course",
    label: "Disciplina",
    description: "Cadastre as disciplinas ativas por periodo.",
  },
  {
    value: "student",
    label: "Aluno",
    description: "Use para pre-cadastros pontuais.",
  },
] as const;

export default function SetupPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] =
    useState<(typeof setupSections)[number]["value"]>("campus");

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
    defaultValues: { name: "", description: "", year: 2025, semester: 1 },
  });
  const studentForm = useForm({
    defaultValues: {
      studentId: "",
      name: "",
      email: "",
      phone: "",
      annotation: "",
      status: "ACTIVE" as StudentStatus,
    },
  });

  const selectedCampusId = useWatch({
    control: programForm.control,
    name: "campus_id",
  });
  const selectedStudentStatus = useWatch({
    control: studentForm.control,
    name: "status",
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
      const programs = programResults.flatMap((res) => {
        if (res.status !== "fulfilled") return [];
        return extractData(res.value);
      });

      const [courseRes, studentRes] = await Promise.allSettled([
        apiRequest<ApiResponse<Course[]>>("/course/any"),
        apiRequest<ApiResponse<Student[]>>("/student"),
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
  const programs = setupQuery.data?.programs ?? [];
  const courses = setupQuery.data?.courses ?? [];
  const students = setupQuery.data?.students ?? [];

  const handleMessage = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 4000);
  };

  const createCampus = async (values: { name: string; description: string }) => {
    const res = await apiRequest<ApiMessage>("/campus", {
      method: "POST",
      body: values,
    });
    handleMessage(res.message ?? "Campus criado");
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
    handleMessage(res.message ?? "Programa criado");
    programForm.reset({ ...values, name: "", description: "" });
    await setupQuery.refetch();
  };

  const createCourse = async (values: {
    name: string;
    description: string;
    year: number;
    semester: number;
  }) => {
    const res = await apiRequest<ApiMessage>("/course", {
      method: "POST",
      body: values,
    });
    handleMessage(res.message ?? "Disciplina criada");
    courseForm.reset({ ...values, name: "", description: "" });
    await setupQuery.refetch();
  };

  const createStudent = async (values: {
    studentId: string;
    name?: string;
    email?: string;
    phone?: string;
    annotation?: string;
    status: StudentStatus;
  }) => {
    const payload = {
      ...values,
      name: values.name || undefined,
      email: values.email || undefined,
      phone: values.phone || undefined,
      annotation: values.annotation || undefined,
    };
    const res = await apiRequest<ApiMessage>("/student/create", {
      method: "POST",
      body: payload,
    });
    handleMessage(res.message ?? "Aluno criado");
    studentForm.reset({
      ...values,
      studentId: "",
      name: "",
      email: "",
      phone: "",
      annotation: "",
    });
    await setupQuery.refetch();
  };

  const summary = {
    campus: campuses.length,
    program: programs.length,
    course: courses.length,
    student: students.length,
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Estrutura academica"
        description="Configure a base em etapas. Escolha o que deseja gerenciar agora e edite uma entidade por vez."
        badge="Setup guiado"
      />

      {message ? (
        <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
          {message}
        </div>
      ) : null}

      {setupQuery.isLoading ? (
        <LoadingState label="Carregando estrutura academica..." />
      ) : null}

      {setupQuery.isError ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {setupQuery.error.message}
        </div>
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
                    Comece por aqui. Os programas dependem de ao menos um campus.
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
                  <CardTitle className="text-lg">Cadastro de programa</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Vincule cada programa ao campus correto para manter a base organizada.
                  </p>
                </CardHeader>
                <CardContent className="px-6 py-6">
                  {!campuses.length ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      Cadastre ao menos um campus antes de criar programas.
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
                          <SelectValue placeholder="Selecione um campus" />
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
                      <Label htmlFor="program-name">Nome</Label>
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
                        Salvar programa
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
                    Cadastre as disciplinas ativas para uso em convites e importacao de alunos.
                  </p>
                </CardHeader>
                <CardContent className="px-6 py-6">
                  <form
                    className="flex flex-col gap-4"
                    onSubmit={courseForm.handleSubmit(createCourse)}
                  >
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
                        className={cn(buttonVariants({ variant: "default", size: "lg" }))}
                      >
                        Salvar disciplina
                      </button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="student">
              <Card className="rounded-3xl border border-border/60 bg-white/90 py-0">
                <CardHeader className="border-b border-border/60 px-6 py-6">
                  <CardTitle className="text-lg">Pre-cadastro de aluno</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Para volume maior, prefira a tela de alunos com importacao por CSV.
                  </p>
                </CardHeader>
                <CardContent className="px-6 py-6">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
                    <p className="text-sm text-muted-foreground">
                      Cadastros pontuais funcionam melhor aqui. Importacoes em lote ficam em uma tela dedicada.
                    </p>
                    <Link
                      href="/students"
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      Abrir alunos
                    </Link>
                  </div>
                  <form
                    className="flex flex-col gap-4"
                    onSubmit={studentForm.handleSubmit(createStudent)}
                  >
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="student-id">Matricula</Label>
                        <Input id="student-id" {...studentForm.register("studentId")} />
                      </div>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                          value={selectedStudentStatus}
                          onValueChange={(value) =>
                            studentForm.setValue("status", value as StudentStatus)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="student-name">Nome</Label>
                      <Input id="student-name" {...studentForm.register("name")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="student-email">Email</Label>
                      <Input
                        id="student-email"
                        type="email"
                        {...studentForm.register("email")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="student-phone">Telefone</Label>
                      <Input id="student-phone" {...studentForm.register("phone")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="student-annotation">Observacao</Label>
                      <Textarea
                        id="student-annotation"
                        {...studentForm.register("annotation")}
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className={cn(buttonVariants({ variant: "default", size: "lg" }))}
                      >
                        Salvar aluno
                      </button>
                    </div>
                  </form>
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
                    Programas
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
                    Alunos
                  </p>
                  <p className="mt-1 text-2xl font-semibold">{students.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border border-border/60 bg-white/90 py-0">
              <CardHeader className="border-b border-border/60 px-6 py-5">
                <CardTitle className="text-base">Proximos passos</CardTitle>
              </CardHeader>
              <CardContent className="px-6 py-5">
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>1. Cadastre campus para destravar programas.</p>
                  <p>2. Crie programas e depois as disciplinas ativas.</p>
                  <p>3. Use alunos apenas para casos pontuais ou revise a tela dedicada.</p>
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
                        Nenhum programa cadastrado ainda.
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

                  {activeSection === "student" &&
                    (students.length ? (
                      students.slice(0, 10).map((student) => (
                        <Badge key={student.id} variant="outline">
                          {student.studentId}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Nenhum aluno cadastrado ainda.
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
