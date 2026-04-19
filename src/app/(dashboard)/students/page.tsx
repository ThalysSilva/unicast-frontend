"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToastOnError } from "@/components/ui/toast-provider";
import { useApiQuery } from "@/hooks/use-api-query";
import { apiRequest, extractData } from "@/lib/api";
import { formatPhone, studentStatusLabel } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import type { ApiResponse, Student, StudentStatus } from "@/lib/types";

const EMPTY_STUDENTS: Student[] = [];

type StudentStatusFilter = StudentStatus | "ALL";

const statusOrder: StudentStatus[] = [
  "ACTIVE",
  "PENDING",
  "LOCKED",
  "CANCELED",
  "GRADUATED",
];

export default function StudentsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StudentStatusFilter>("ALL");

  const studentsQuery = useApiQuery({
    queryKey: queryKeys.students(),
    queryFn: async () => {
      const response = await apiRequest<ApiResponse<Student[]>>("/student");
      return extractData(response);
    },
  });

  const students = studentsQuery.data ?? EMPTY_STUDENTS;
  const isLoading = studentsQuery.isLoading;

  const searchedStudents = useMemo(() => {
    return students.filter((student) => {
      if (!query.trim()) return true;

      return [
        student.name,
        student.email,
        student.studentId,
        student.phone,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query.toLowerCase()));
    });
  }, [students, query]);

  const statusFilterItems: Array<{
    status: StudentStatusFilter;
    label: string;
    count: number;
  }> = [
    { status: "ALL", label: "Todos", count: searchedStudents.length },
    ...statusOrder.map((item) => ({
      status: item,
      label: studentStatusLabel(item),
      count: searchedStudents.filter((student) => student.status === item)
        .length,
    })),
  ];

  const filtered = useMemo(() => {
    if (status === "ALL") return searchedStudents;
    return searchedStudents.filter((student) => student.status === status);
  }, [searchedStudents, status]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Matriculas e contatos"
        description="Gerencie a base global de alunos, contatos, status acadêmico e vínculos com disciplinas."
        badge="Base de alunos"
      />
      <ToastOnError error={studentsQuery.error} />

      <section>
        <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
          <h2 className="text-lg font-semibold">Base de alunos</h2>
          <div className="mt-4 grid gap-3">
            <Input
              placeholder="Buscar por nome, email ou matricula"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-6">
              {statusFilterItems.map((item) => {
                const isSelected = status === item.status;

                return (
                  <button
                    key={item.status}
                    type="button"
                    onClick={() => setStatus(item.status)}
                    className={cn(
                      "flex min-h-8 items-center justify-between gap-1 rounded-lg border px-2 py-1 text-left transition",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/60 bg-background hover:border-primary/50"
                    )}
                  >
                    <span
                      className={cn(
                        "text-[11px] leading-none",
                        isSelected
                          ? "text-primary-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {item.label}
                    </span>
                    <span className="text-sm font-semibold">{item.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-4 max-h-[540px] overflow-auto rounded-2xl border border-border/60">
            {isLoading ? (
              <LoadingState
                label="Carregando alunos e disciplinas..."
                className="rounded-none border-0"
              />
            ) : filtered.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <p className="font-medium text-foreground">
                          {student.name || "Sem nome"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Matricula {student.studentId}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {studentStatusLabel(student.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{student.email ?? "-"}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatPhone(student.phone)}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/students/${student.id}`}
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" })
                          )}
                        >
                          Gerenciar
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                title="Nenhum aluno encontrado"
                description="Ajuste os filtros ou abra uma disciplina para adicionar ou importar matrículas da turma."
                className="rounded-none border-0"
              />
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
