"use client";

import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { useApiQuery } from "@/hooks/use-api-query";
import { apiRequest, extractData, getAuth } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { ApiResponse, Campus, Course, Program, Student } from "@/lib/types";

export default function DashboardPage() {
  const auth = getAuth();

  const summaryQuery = useApiQuery({
    queryKey: queryKeys.dashboardSummary(),
    queryFn: async () => {
      const campusRes = await apiRequest<ApiResponse<Campus[]>>("/campus");
      const campuses = extractData(campusRes);

      const programResults = await Promise.allSettled(
        campuses.map((campus) =>
          apiRequest<ApiResponse<Program[]>>(`/program/${campus.id}`)
        )
      );

      const programs = programResults.flatMap((result) => {
        if (result.status !== "fulfilled") return [];
        return extractData(result.value);
      });

      const [courseRes, studentRes] = await Promise.all([
        apiRequest<ApiResponse<Course[]>>("/course/any"),
        apiRequest<ApiResponse<Student[]>>("/student"),
      ]);

      return {
        campuses,
        programs,
        courses: extractData(courseRes),
        students: extractData(studentRes),
      };
    },
  });

  const campuses = summaryQuery.data?.campuses ?? [];
  const programs = summaryQuery.data?.programs ?? [];
  const courses = summaryQuery.data?.courses ?? [];
  const students = summaryQuery.data?.students ?? [];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Ola, ${auth?.user?.name ?? "Professor"}`}
        description="Acompanhe o resumo das suas entidades e prossimos passos para manter as comunicacoes em dia."
        badge="Visao geral"
      />

      {summaryQuery.isLoading ? (
        <LoadingState label="Carregando resumo do painel..." />
      ) : summaryQuery.isError ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {summaryQuery.error.message}
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Campi" value={campuses.length} />
            <StatCard label="Programas" value={programs.length} />
            <StatCard label="Disciplinas" value={courses.length} />
            <StatCard label="Alunos" value={students.length} />
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
              <h2 className="text-lg font-semibold text-foreground">
                Proximas etapas sugeridas
              </h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {[
                  "Cadastre ou atualize o campus",
                  "Crie os programas ativos",
                  "Configure as disciplinas",
                  "Importe o CSV de alunos",
                  "Ative SMTP e WhatsApp",
                  "Envie o primeiro comunicado",
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
                Status dos alunos
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
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
