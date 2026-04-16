"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToastOnError } from "@/components/ui/toast-provider";
import { useApiQuery } from "@/hooks/use-api-query";
import { apiRequest, extractData, getAuth, onAuthChange } from "@/lib/api";
import { loadAcademicStructure } from "@/lib/academic-structure";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import type { ApiResponse, Student } from "@/lib/types";

const toStudentArray = (value: unknown): Student[] =>
  Array.isArray(value) ? value : [];

export default function DashboardPage() {
  const [userName, setUserName] = useState("Professor");

  useEffect(() => {
    const syncUser = () => {
      setUserName(getAuth()?.user?.name ?? "Professor");
    };

    syncUser();
    return onAuthChange(syncUser);
  }, []);

  const summaryQuery = useApiQuery({
    queryKey: queryKeys.dashboardSummary(),
    queryFn: async () => {
      const [structure, studentRes] = await Promise.all([
        loadAcademicStructure(),
        apiRequest<ApiResponse<Student[]>>("/student"),
      ]);

      const courseStudentResults = await Promise.allSettled(
        structure.courses.map((course) =>
          apiRequest<ApiResponse<Student[]>>(`/student?course=${course.id}`)
        )
      );

      const studentsByCourse = Object.fromEntries(
        structure.courses.map((course, index) => {
          const result = courseStudentResults[index];
          const courseStudents =
            result.status === "fulfilled" ? extractData(result.value) : [];

          return [
            course.id,
            toStudentArray(courseStudents),
          ];
        })
      );

      return {
        ...structure,
        students: extractData(studentRes),
        studentsByCourse,
      };
    },
  });

  const campuses = summaryQuery.data?.campuses ?? [];
  const programs = summaryQuery.data?.programs ?? [];
  const courses = summaryQuery.data?.courses ?? [];
  const students = summaryQuery.data?.students ?? [];
  const studentsByCourse = summaryQuery.data?.studentsByCourse ?? {};
  const coursesWithStats = courses.map((course) => {
    const courseStudents = toStudentArray(studentsByCourse[course.id]);

    return {
      ...course,
      totalStudents: courseStudents.length,
      activeStudents: courseStudents.filter((student) => student.status === "ACTIVE").length,
      pendingStudents: courseStudents.filter((student) => student.status === "PENDING").length,
    };
  });
  const campusStats = campuses.map((campus) => {
    const campusPrograms = programs.filter((program) => program.campusId === campus.id);
    const campusCourses = coursesWithStats.filter((course) => course.campusId === campus.id);

    return {
      ...campus,
      programsCount: campusPrograms.length,
      coursesCount: campusCourses.length,
      enrollmentsCount: campusCourses.reduce((sum, course) => sum + course.totalStudents, 0),
      pendingCount: campusCourses.reduce((sum, course) => sum + course.pendingStudents, 0),
    };
  });
  const programStats = programs.map((program) => {
    const programCourses = coursesWithStats.filter((course) => course.programId === program.id);

    return {
      ...program,
      coursesCount: programCourses.length,
      enrollmentsCount: programCourses.reduce((sum, course) => sum + course.totalStudents, 0),
      pendingCount: programCourses.reduce((sum, course) => sum + course.pendingStudents, 0),
    };
  });

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Ola, ${userName}`}
        description="Acompanhe quantas turmas ja estao estruturadas, quantas matriculas aguardam auto-cadastro e o que falta para iniciar os disparos."
        badge="Comunicacao da turma"
      />
      <ToastOnError error={summaryQuery.error} />

      {summaryQuery.isLoading ? (
        <LoadingState label="Carregando resumo do painel..." />
      ) : !summaryQuery.isError ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Campus" value={campuses.length} />
            <StatCard label="Cursos" value={programs.length} />
            <StatCard label="Disciplinas" value={courses.length} />
            <StatCard label="Alunos" value={students.length} />
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
              <h2 className="text-lg font-semibold text-foreground">
                Fluxo sugerido
              </h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {[
                  "Estruture campus, curso e disciplina",
                  "Registre as matriculas esperadas",
                  "Gere o convite da disciplina",
                  "Projete o link ou QR code em sala",
                  "Aguarde os alunos completarem email e telefone",
                  "Ative Email e WhatsApp para disparo em massa",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm text-muted-foreground"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </Card>

            <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
              <h2 className="text-lg font-semibold text-foreground">
                Estado da base de contatos
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  {
                    label: "Ativos",
                    count: students.filter((s) => s.status === "ACTIVE").length,
                  },
                  {
                    label: "Pendentes",
                    count: students.filter((s) => s.status === "PENDING").length,
                  },
                  {
                    label: "Bloqueados",
                    count: students.filter((s) => s.status === "LOCKED").length,
                  },
                  {
                    label: "Cancelados",
                    count: students.filter((s) => s.status === "CANCELED").length,
                  },
                ].map((item) => (
                  <Badge key={item.label} variant="outline" className="text-xs">
                    {item.label}: {item.count}
                  </Badge>
                ))}
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Pendentes ainda nao concluíram o auto-cadastro. Ativos ja podem receber mensagens pelos canais configurados.
              </p>
            </Card>
          </section>

          <section>
            <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Visao geral
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Consulte a estrutura por disciplina, curso ou campus e abra o item para continuar o trabalho.
                  </p>
                </div>
                <Link
                  href="/setup"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  Gerenciar estrutura
                </Link>
              </div>

              <Tabs defaultValue="courses" className="mt-5 gap-4">
                <TabsList className="h-auto flex-wrap justify-start rounded-2xl bg-muted/70 p-1.5">
                  <TabsTrigger value="courses" className="rounded-xl px-4 py-2">
                    Disciplinas
                  </TabsTrigger>
                  <TabsTrigger value="programs" className="rounded-xl px-4 py-2">
                    Cursos
                  </TabsTrigger>
                  <TabsTrigger value="campuses" className="rounded-xl px-4 py-2">
                    Campus
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="courses">
                  <div className="max-h-[440px] overflow-auto rounded-2xl border border-border/60">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Disciplina</TableHead>
                          <TableHead>Campus</TableHead>
                          <TableHead>Curso</TableHead>
                          <TableHead>Alunos</TableHead>
                          <TableHead>Pendentes</TableHead>
                          <TableHead className="text-right">Acoes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {coursesWithStats.length ? (
                          coursesWithStats.map((course) => (
                            <TableRow key={course.id}>
                              <TableCell>
                                <p className="font-medium text-foreground">
                                  {course.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {course.year}/{course.semester}
                                </p>
                              </TableCell>
                              <TableCell>{course.campusName}</TableCell>
                              <TableCell>{course.programName}</TableCell>
                              <TableCell>{course.totalStudents}</TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {course.pendingStudents}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Link
                                  href={`/courses/${course.id}`}
                                  className={cn(
                                    buttonVariants({ variant: "ghost", size: "sm" })
                                  )}
                                >
                                  Abrir
                                </Link>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                              Nenhuma disciplina cadastrada ainda.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="programs">
                  <div className="max-h-[440px] overflow-auto rounded-2xl border border-border/60">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Curso</TableHead>
                          <TableHead>Campus</TableHead>
                          <TableHead>Disciplinas</TableHead>
                          <TableHead>Matriculas</TableHead>
                          <TableHead>Pendentes</TableHead>
                          <TableHead className="text-right">Acoes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {programStats.length ? (
                          programStats.map((program) => (
                            <TableRow key={program.id}>
                              <TableCell>
                                <p className="font-medium text-foreground">
                                  {program.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {program.active ? "Ativo" : "Inativo"}
                                </p>
                              </TableCell>
                              <TableCell>{program.campusName}</TableCell>
                              <TableCell>{program.coursesCount}</TableCell>
                              <TableCell>{program.enrollmentsCount}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{program.pendingCount}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Link
                                  href={`/programs/${program.id}`}
                                  className={cn(
                                    buttonVariants({ variant: "ghost", size: "sm" })
                                  )}
                                >
                                  Abrir
                                </Link>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                              Nenhum curso cadastrado ainda.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="campuses">
                  <div className="max-h-[440px] overflow-auto rounded-2xl border border-border/60">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campus</TableHead>
                          <TableHead>Cursos</TableHead>
                          <TableHead>Disciplinas</TableHead>
                          <TableHead>Matriculas</TableHead>
                          <TableHead>Pendentes</TableHead>
                          <TableHead className="text-right">Acoes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {campusStats.length ? (
                          campusStats.map((campus) => (
                            <TableRow key={campus.id}>
                              <TableCell>
                                <p className="font-medium text-foreground">
                                  {campus.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {campus.description || "Sem descricao"}
                                </p>
                              </TableCell>
                              <TableCell>{campus.programsCount}</TableCell>
                              <TableCell>{campus.coursesCount}</TableCell>
                              <TableCell>{campus.enrollmentsCount}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{campus.pendingCount}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Link
                                  href={`/campuses/${campus.id}`}
                                  className={cn(
                                    buttonVariants({ variant: "ghost", size: "sm" })
                                  )}
                                >
                                  Abrir
                                </Link>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                              Nenhum campus cadastrado ainda.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </section>
        </>
      ) : null}
    </div>
  );
}
