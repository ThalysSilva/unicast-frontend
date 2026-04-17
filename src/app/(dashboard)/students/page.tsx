"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToastOnError, useToast } from "@/components/ui/toast-provider";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { apiRequest, extractData } from "@/lib/api";
import {
  type AcademicDiscipline,
  loadAcademicStructure,
} from "@/lib/academic-structure";
import { formatPhone, studentStatusLabel } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import type {
  ApiMessage,
  ApiResponse,
  Student,
  StudentStatus,
} from "@/lib/types";

const EMPTY_STUDENTS: Student[] = [];
const EMPTY_DISCIPLINES: AcademicDiscipline[] = [];

const statusFilters: Array<StudentStatus | "ALL"> = [
  "ALL",
  "ACTIVE",
  "PENDING",
  "LOCKED",
  "CANCELED",
  "GRADUATED",
];

export default function StudentsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StudentStatus | "ALL">("ALL");
  const [disciplineId, setDisciplineId] = useState("");
  const [singleDisciplineId, setSingleDisciplineId] = useState("");
  const [singleStudentId, setSingleStudentId] = useState("");
  const [importMode, setImportMode] = useState("upsert");
  const [file, setFile] = useState<File | null>(null);
  const { showToast } = useToast();

  const studentsQuery = useApiQuery({
    queryKey: queryKeys.students(),
    queryFn: async () => {
      const response = await apiRequest<ApiResponse<Student[]>>("/student");
      return extractData(response);
    },
  });

  const disciplinesQuery = useApiQuery({
    queryKey: queryKeys.disciplines(),
    queryFn: async () => {
      const structure = await loadAcademicStructure();
      return structure.disciplines;
    },
  });

  const importStudentsMutation = useApiMutation<ApiMessage, FormData>({
    mutationFn: async (formData) =>
      apiRequest<ApiMessage>(`/discipline/${disciplineId}/students/import?mode=${importMode}`, {
        method: "POST",
        body: formData,
      }),
    invalidateQueryKeys: [queryKeys.students()],
    onSuccess: (res) => {
      showToast({ title: res.message ?? "CSV importado", variant: "success" });
      setFile(null);
    },
  });

  const addStudentToDisciplineMutation = useApiMutation<
    ApiMessage,
    { disciplineId: string; studentId: string }
  >({
    mutationFn: async ({ disciplineId, studentId }) =>
      apiRequest<ApiMessage>(`/discipline/${disciplineId}/students`, {
        method: "POST",
        body: { studentId },
      }),
    invalidateQueryKeys: [queryKeys.students()],
    onSuccess: (res) => {
      showToast({
        title: res.message ?? "Matrícula vinculada com sucesso",
        variant: "success",
      });
      setSingleStudentId("");
    },
  });

  const students = studentsQuery.data ?? EMPTY_STUDENTS;
  const disciplines = disciplinesQuery.data ?? EMPTY_DISCIPLINES;
  const isLoading = studentsQuery.isLoading || disciplinesQuery.isLoading;
  const disciplineOptions = disciplines.map((discipline) => ({
    value: discipline.id,
    label: `${discipline.name} / ${discipline.programName}`,
  }));

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
    if (!file || !disciplineId) return;
    const formData = new FormData();
    formData.append("file", file);
    await importStudentsMutation.mutateAsync(formData);
  };

  const handleSingleAdd = async () => {
    if (!singleDisciplineId || !singleStudentId.trim()) {
      showToast({
        title: "Selecione a disciplina e informe a matrícula",
        variant: "error",
      });
      return;
    }

    await addStudentToDisciplineMutation.mutateAsync({
      disciplineId: singleDisciplineId,
      studentId: singleStudentId.trim(),
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Matriculas e contatos"
        description="Gerencie a base global de alunos, contatos, status acadêmico e vínculos com disciplinas."
        badge="Base de alunos"
      />
      <ToastOnError error={studentsQuery.error ?? disciplinesQuery.error} />

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
          <h2 className="text-lg font-semibold">Base de alunos</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Input
              placeholder="Buscar por nome, email ou matricula"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Select
              value={status}
              onValueChange={(value) => setStatus((value ?? "ALL") as typeof status)}
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
                description="Ajuste os filtros ou importe matriculas para iniciar o fluxo de auto-cadastro."
                className="rounded-none border-0"
              />
            )}
          </div>
        </Card>

        <div className="grid gap-6">
          <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
            <h2 className="text-lg font-semibold">Adicionar matrícula</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Use este formulário quando entrar um aluno novo depois da importação inicial. O sistema cria ou reaproveita a matrícula e faz o vínculo com a disciplina.
            </p>
            <div className="mt-4 flex flex-col gap-4">
              <div className="space-y-2">
                <Label>Disciplina</Label>
                <Select
                  value={singleDisciplineId}
                  onValueChange={(value) => setSingleDisciplineId(value ?? "")}
                >
                  <SelectTrigger disabled={disciplinesQuery.isLoading}>
                    <SelectValueFromOptions
                      placeholder="Selecione"
                      options={disciplineOptions}
                      value={singleDisciplineId}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {disciplines.map((discipline) => (
                      <SelectItem key={discipline.id} value={discipline.id}>
                        {discipline.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="single-student-id">Matrícula</Label>
                <Input
                  id="single-student-id"
                  value={singleStudentId}
                  disabled={addStudentToDisciplineMutation.isPending}
                  onChange={(event) => setSingleStudentId(event.target.value)}
                />
              </div>
              <Button
                onClick={handleSingleAdd}
                disabled={
                  !singleDisciplineId ||
                  !singleStudentId.trim() ||
                  addStudentToDisciplineMutation.isPending
                }
              >
                {addStudentToDisciplineMutation.isPending
                  ? "Vinculando..."
                  : "Adicionar à disciplina"}
              </Button>
            </div>
          </Card>

          <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
            <h2 className="text-lg font-semibold">Importar matriculas</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Envie um CSV com `studentId` obrigatorio para carga inicial ou atualizações maiores da turma.
            </p>
            <div className="mt-4 flex flex-col gap-4">
              <div className="space-y-2">
                <Label>Disciplina</Label>
                <Select
                  value={disciplineId}
                  onValueChange={(value) => setDisciplineId(value ?? "")}
                >
                  <SelectTrigger disabled={disciplinesQuery.isLoading}>
                    <SelectValueFromOptions
                      placeholder="Selecione"
                      options={disciplineOptions}
                      value={disciplineId}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {disciplines.map((discipline) => (
                      <SelectItem key={discipline.id} value={discipline.id}>
                        {discipline.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Modo de importacao</Label>
                <Select
                  value={importMode}
                  onValueChange={(value) => setImportMode(value ?? "upsert")}
                >
                  <SelectTrigger disabled={importStudentsMutation.isPending}>
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
                  disabled={importStudentsMutation.isPending}
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </div>
              <Button
                onClick={handleImport}
                disabled={!file || !disciplineId || importStudentsMutation.isPending}
              >
                {importStudentsMutation.isPending
                  ? "Importando..."
                  : "Importar matriculas"}
              </Button>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
