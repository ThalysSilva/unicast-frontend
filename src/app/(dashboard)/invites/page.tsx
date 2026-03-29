"use client";

import { useEffect, useState } from "react";
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
import { useToast } from "@/components/ui/toast-provider";
import { apiRequest, extractData } from "@/lib/api";
import type { ApiResponse, Course } from "@/lib/types";

export default function InvitesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [invite, setInvite] = useState<string | null>(null);
  const { showToast } = useToast();

  const form = useForm({
    defaultValues: { courseId: "", expiresAt: "" },
  });
  const courseId = useWatch({ control: form.control, name: "courseId" });

  useEffect(() => {
    const load = async () => {
      const coursesRes = await apiRequest<ApiResponse<Course[]>>("/course/any");
      setCourses(extractData(coursesRes));
    };
    load();
  }, []);

  const createInvite = async (values: {
    courseId: string;
    expiresAt?: string;
  }) => {
    if (!values.courseId) {
      showToast({ title: "Selecione uma disciplina", variant: "error" });
      return;
    }
    const payload = values.expiresAt
      ? { expiresAt: values.expiresAt }
      : undefined;

    const res = await apiRequest<ApiResponse<Record<string, string>>>(
      `/invite/${values.courseId}`,
      {
        method: "POST",
        body: payload,
      }
    );
    const code = res.data?.code ?? Object.values(res.data ?? {})[0];
    setInvite(code ?? null);
    showToast({ title: "Convite criado com sucesso", variant: "success" });
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Convites"
        description="Gere links para os alunos se cadastrarem no curso informado."
        badge="Auto-registro"
      />

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
          <h2 className="text-lg font-semibold">Criar convite</h2>
          <form
            className="mt-4 flex flex-col gap-4"
            onSubmit={form.handleSubmit(createInvite)}
          >
            <div className="space-y-2">
              <Label>Disciplina</Label>
              <Select
                value={courseId}
                onValueChange={(value) => form.setValue("courseId", value ?? "")}
              >
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
              <Label htmlFor="invite-exp">Expira em (ISO)</Label>
              <Input
                id="invite-exp"
                placeholder="2025-01-31T23:59:00Z"
                {...form.register("expiresAt")}
              />
            </div>
            <Button type="submit">Gerar convite</Button>
          </form>
        </Card>

        <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
          <h2 className="text-lg font-semibold">Compartilhar</h2>
          {invite ? (
            <div className="mt-4 space-y-3">
              <Badge variant="outline">Codigo: {invite}</Badge>
              <p className="text-sm text-muted-foreground">
                Link:
                <span className="ml-2 font-medium text-foreground">
                  /student/register/{invite}
                </span>
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Crie um convite para visualizar o link de cadastro.
            </p>
          )}
        </Card>
      </section>
    </div>
  );
}
