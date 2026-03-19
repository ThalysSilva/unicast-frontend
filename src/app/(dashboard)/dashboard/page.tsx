"use client";

import { useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { apiRequest, extractData, getAuth } from "@/lib/api";
import type { ApiResponse, Campus, Course, Program, Student } from "@/lib/types";

export default function DashboardPage() {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const campusRes = await apiRequest<ApiResponse<Campus[]>>("/campus");
        const campusData = extractData(campusRes);
        setCampuses(campusData);

        const programResults = await Promise.allSettled(
          campusData.map((campus) =>
            apiRequest<ApiResponse<Program[]>>(`/program/${campus.id}`)
          )
        );
        const programData = programResults.flatMap((res) => {
          if (res.status !== "fulfilled") return [];
          return extractData(res.value);
        });
        setPrograms(programData);

        const [courseRes, studentRes] = await Promise.allSettled([
          apiRequest<ApiResponse<Course[]>>("/course/any"),
          apiRequest<ApiResponse<Student[]>>("/student"),
        ]);

        if (courseRes.status === "fulfilled") {
          setCourses(extractData(courseRes.value));
        }
        if (studentRes.status === "fulfilled") {
          setStudents(extractData(studentRes.value));
        }
      } catch {
        return;
      }
    };

    load();
  }, []);

  const auth = getAuth();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Ola, ${auth?.user?.name ?? "Professor"}`}
        description="Acompanhe o resumo das suas entidades e prossimos passos para manter as comunicacoes em dia."
        badge="Visao geral"
      />

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
    </div>
  );
}
