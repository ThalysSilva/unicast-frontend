"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LoadingState } from "@/components/ui/loading-state";
import { useApiQuery } from "@/hooks/use-api-query";
import { apiRequest, extractData } from "@/lib/api";
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

export default function SetupPage() {
  const [message, setMessage] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Cadastro base"
        description="Crie as entidades principais antes de importar alunos e enviar mensagens."
        badge="Base academica"
      />

      {message ? (
        <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
          {message}
        </div>
      ) : null}

      {setupQuery.isLoading ? (
        <LoadingState label="Carregando entidades base..." />
      ) : null}

      {setupQuery.isError ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {setupQuery.error.message}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
          <h2 className="text-lg font-semibold">Campus</h2>
          <form
            className="mt-4 flex flex-col gap-4"
            onSubmit={campusForm.handleSubmit(createCampus)}
          >
            <div className="space-y-2">
              <Label htmlFor="campus-name">Nome</Label>
              <Input id="campus-name" {...campusForm.register("name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campus-desc">Descricao</Label>
              <Textarea id="campus-desc" {...campusForm.register("description")} />
            </div>
            <Button type="submit">Salvar campus</Button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {campuses.map((campus) => (
              <Badge key={campus.id} variant="outline">
                {campus.name}
              </Badge>
            ))}
          </div>
        </Card>

        <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
          <h2 className="text-lg font-semibold">Programa</h2>
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
              <Textarea id="program-desc" {...programForm.register("description")} />
            </div>
            <Button type="submit">Salvar programa</Button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {programs.map((program) => (
              <Badge key={program.id} variant="secondary">
                {program.name}
              </Badge>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
          <h2 className="text-lg font-semibold">Disciplina</h2>
          <form
            className="mt-4 flex flex-col gap-4"
            onSubmit={courseForm.handleSubmit(createCourse)}
          >
            <div className="space-y-2">
              <Label htmlFor="course-name">Nome</Label>
              <Input id="course-name" {...courseForm.register("name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-desc">Descricao</Label>
              <Textarea id="course-desc" {...courseForm.register("description")} />
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
            <Button type="submit">Salvar disciplina</Button>
          </form>
          <div className="mt-4 grid gap-2">
            {courses.map((course) => (
              <div
                key={course.id}
                className="rounded-2xl border border-border/60 bg-background px-3 py-2 text-sm"
              >
                {course.name} · {course.year}/{course.semester}
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
          <h2 className="text-lg font-semibold">Aluno (pre-cadastro)</h2>
          <form
            className="mt-4 flex flex-col gap-4"
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
            <Button type="submit">Salvar aluno</Button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {students.slice(0, 6).map((student) => (
              <Badge key={student.id} variant="outline">
                {student.studentId}
              </Badge>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
