"use client";

import { useEffect, useMemo, useState } from "react";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest, extractData } from "@/lib/api";
import { formatPhone, studentStatusLabel } from "@/lib/format";
import type {
  ApiMessage,
  ApiResponse,
  Course,
  Student,
  StudentStatus,
} from "@/lib/types";

const statusFilters: Array<StudentStatus | "ALL"> = [
  "ALL",
  "ACTIVE",
  "PENDING",
  "LOCKED",
  "CANCELED",
  "GRADUATED",
];

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StudentStatus | "ALL">("ALL");
  const [courseId, setCourseId] = useState("");
  const [importMode, setImportMode] = useState("upsert");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    const [studentsRes, courseRes] = await Promise.allSettled([
      apiRequest<ApiResponse<Student[]>>("/student"),
      apiRequest<ApiResponse<Course[]>>("/course/any"),
    ]);

    if (studentsRes.status === "fulfilled") {
      setStudents(extractData(studentsRes.value));
    }
    if (courseRes.status === "fulfilled") {
      setCourses(extractData(courseRes.value));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return students.filter((student) => {
      const matchesQuery = [
        student.name,
        student.email,
        student.studentId,
        student.phone,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query.toLowerCase()));
      const matchesStatus =
        status === "ALL" ? true : student.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [students, query, status]);

  const handleImport = async () => {
    if (!file || !courseId) return;
    const formData = new FormData();
    formData.append("file", file);

    const res = await apiRequest<ApiMessage>(
      `/course/${courseId}/students/import?mode=${importMode}`,
      {
        method: "POST",
        body: formData,
      }
    );
    setMessage(res.message ?? "CSV importado");
    setFile(null);
    load();
  };

  const removeStudent = async (studentId: string) => {
    await apiRequest<ApiMessage>(`/student/${studentId}`, { method: "DELETE" });
    setMessage("Aluno removido");
    load();
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Alunos"
        description="Importe CSV, filtre status e acompanhe a situacao de cada aluno vinculado."
        badge="Gestao de turma"
      />

      {message ? (
        <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
          {message}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
          <h2 className="text-lg font-semibold">Lista inteligente</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Input
              placeholder="Buscar por nome, email ou matricula"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as typeof status)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusFilters.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item === "ALL" ? "Todos" : item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-border/60">
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStudent(student.id)}
                      >
                        Remover
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
          <h2 className="text-lg font-semibold">Importar CSV</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Envie um CSV com studentId,name,phone,email,status.
          </p>
          <div className="mt-4 flex flex-col gap-4">
            <div className="space-y-2">
              <Label>Disciplina</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Modo de importacao</Label>
              <Select value={importMode} onValueChange={setImportMode}>
                <SelectTrigger>
                  <SelectValue placeholder="Modo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upsert">Atualizar ou inserir</SelectItem>
                  <SelectItem value="clean">Substituir lista</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Arquivo CSV</Label>
              <Input
                type="file"
                accept=".csv"
                onChange={(event) =>
                  setFile(event.target.files?.[0] ?? null)
                }
              />
            </div>
            <Button onClick={handleImport} disabled={!file || !courseId}>
              Importar alunos
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
