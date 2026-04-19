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

      const disciplineStudentResults = await Promise.allSettled(
        structure.disciplines.map((discipline) =>
          apiRequest<ApiResponse<Student[]>>(`/student?discipline=${discipline.id}`)
        )
      );

      const studentsByDiscipline = Object.fromEntries(
        structure.disciplines.map((discipline, index) => {
          const result = disciplineStudentResults[index];
          const disciplineStudents =
            result.status === "fulfilled" ? extractData(result.value) : [];

          return [
            discipline.id,
            toStudentArray(disciplineStudents),
          ];
        })
      );

      return {
        ...structure,
        students: extractData(studentRes),
        studentsByDiscipline,
      };
    },
  });

  const campuses = summaryQuery.data?.campuses ?? [];
  const programs = summaryQuery.data?.programs ?? [];
  const disciplines = summaryQuery.data?.disciplines ?? [];
  const students = summaryQuery.data?.students ?? [];
  const studentsByDiscipline = summaryQuery.data?.studentsByDiscipline ?? {};
  const disciplinesWithStats = disciplines.map((discipline) => {
    const disciplineStudents = toStudentArray(studentsByDiscipline[discipline.id]);

    return {
      ...discipline,
      totalStudents: disciplineStudents.length,
      activeStudents: disciplineStudents.filter((student) => student.status === "ACTIVE").length,
      pendingStudents: disciplineStudents.filter((student) => student.status === "PENDING").length,
    };
  });
  const campusStats = campuses.map((campus) => {
    const campusPrograms = programs.filter((program) => program.campusId === campus.id);
    const campusDisciplines = disciplinesWithStats.filter((discipline) => discipline.campusId === campus.id);

    return {
      ...campus,
      programsCount: campusPrograms.length,
      disciplinesCount: campusDisciplines.length,
      enrollmentsCount: campusDisciplines.reduce((sum, discipline) => sum + discipline.totalStudents, 0),
      pendingCount: campusDisciplines.reduce((sum, discipline) => sum + discipline.pendingStudents, 0),
    };
  });
  const programStats = programs.map((program) => {
    const programDisciplines = disciplinesWithStats.filter((discipline) => discipline.programId === program.id);

    return {
      ...program,
      disciplinesCount: programDisciplines.length,
      enrollmentsCount: programDisciplines.reduce((sum, discipline) => sum + discipline.totalStudents, 0),
      pendingCount: programDisciplines.reduce((sum, discipline) => sum + discipline.pendingStudents, 0),
    };
  });

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Olá, ${userName}`}
        description="Acompanhe quantas turmas já estão estruturadas, quantas matrículas aguardam autocadastro e o que falta para iniciar os disparos."
        badge="Comunicação da turma"
      />
      <ToastOnError error={summaryQuery.error} />

      {summaryQuery.isLoading ? (
        <LoadingState label="Carregando resumo do painel..." />
      ) : !summaryQuery.isError ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Campus" value={campuses.length} />
            <StatCard label="Cursos" value={programs.length} />
            <StatCard label="Disciplinas" value={disciplines.length} />
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
                  "Registre as matrículas esperadas",
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
                Pendentes ainda não concluíram o autocadastro. Ativos já podem receber mensagens pelos canais configurados.
              </p>
            </Card>
          </section>

          <section>
            <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Visão geral
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

              <Tabs defaultValue="disciplines" className="mt-5 gap-4">
                <TabsList className="h-auto flex-wrap justify-start rounded-2xl bg-muted/70 p-1.5">
                  <TabsTrigger value="disciplines" className="rounded-xl px-4 py-2">
                    Disciplinas
                  </TabsTrigger>
                  <TabsTrigger value="programs" className="rounded-xl px-4 py-2">
                    Cursos
                  </TabsTrigger>
                  <TabsTrigger value="campuses" className="rounded-xl px-4 py-2">
                    Campus
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="disciplines">
                  <div className="max-h-[440px] overflow-auto rounded-2xl border border-border/60">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Disciplina</TableHead>
                          <TableHead>Campus</TableHead>
                          <TableHead>Curso</TableHead>
                          <TableHead>Alunos</TableHead>
                          <TableHead>Pendentes</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {disciplinesWithStats.length ? (
                          disciplinesWithStats.map((discipline) => (
                            <TableRow key={discipline.id}>
                              <TableCell>
                                <p className="font-medium text-foreground">
                                  {discipline.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {discipline.year}/{discipline.semester}
                                </p>
                              </TableCell>
                              <TableCell>{discipline.campusName}</TableCell>
                              <TableCell>{discipline.programName}</TableCell>
                              <TableCell>{discipline.totalStudents}</TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {discipline.pendingStudents}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Link
                                  href={`/disciplines/${discipline.id}`}
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
                          <TableHead>Matrículas</TableHead>
                          <TableHead>Pendentes</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
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
                              <TableCell>{program.disciplinesCount}</TableCell>
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
                          <TableHead>Matrículas</TableHead>
                          <TableHead>Pendentes</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
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
                                  {campus.description || "Sem descrição"}
                                </p>
                              </TableCell>
                              <TableCell>{campus.programsCount}</TableCell>
                              <TableCell>{campus.disciplinesCount}</TableCell>
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
