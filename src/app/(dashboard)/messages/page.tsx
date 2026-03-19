"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { apiRequest, extractData, getAuth } from "@/lib/api";
import { formatPhone, studentStatusLabel } from "@/lib/format";
import type {
  ApiMessage,
  ApiResponse,
  SmtpInstance,
  Student,
  WhatsappInstance,
} from "@/lib/types";

export default function MessagesPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [smtp, setSmtp] = useState<SmtpInstance[]>([]);
  const [whatsapp, setWhatsapp] = useState<WhatsappInstance[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      from: "",
      subject: "",
      body: "",
      smtp_id: "",
      whatsapp_id: "",
    },
  });

  const load = async () => {
    const [studentRes, smtpRes, whatsappRes] = await Promise.allSettled([
      apiRequest<ApiResponse<Student[]>>("/student"),
      apiRequest<ApiResponse<SmtpInstance[]>>("/smtp/instance"),
      apiRequest<ApiResponse<{ instances: WhatsappInstance[] }>>(
        "/whatsapp/instance"
      ),
    ]);

    if (studentRes.status === "fulfilled") {
      setStudents(extractData(studentRes.value));
    }
    if (smtpRes.status === "fulfilled") {
      setSmtp(extractData(smtpRes.value));
    }
    if (whatsappRes.status === "fulfilled") {
      setWhatsapp(extractData(whatsappRes.value).instances ?? []);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleStudent = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectedCount = useMemo(() => selected.length, [selected]);

  const handleSend = async (values: {
    from: string;
    subject: string;
    body: string;
    smtp_id: string;
    whatsapp_id: string;
  }) => {
    if (!selected.length) {
      setMessage("Selecione ao menos um aluno");
      return;
    }
    const auth = getAuth();
    const res = await apiRequest<ApiMessage>("/message/send", {
      method: "POST",
      body: {
        ...values,
        to: selected,
        jwe: auth?.jwe ?? "",
      },
    });
    setMessage(res.message ?? "Mensagem enviada");
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Mensagens"
        description="Envie comunicados via email e WhatsApp usando os alunos cadastrados."
        badge="Envio imediato"
      />

      {message ? (
        <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
          {message}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
          <h2 className="text-lg font-semibold">Selecionar alunos</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Marque quem deve receber a mensagem. O envio usa os IDs dos alunos.
          </p>
          <div className="mt-4 grid gap-3">
            {students.map((student) => (
              <button
                key={student.id}
                type="button"
                onClick={() => toggleStudent(student.id)}
                className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition ${
                  selected.includes(student.id)
                    ? "border-primary bg-primary/10"
                    : "border-border/60 bg-background"
                }`}
              >
                <Checkbox checked={selected.includes(student.id)} />
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    {student.name ?? "Sem nome"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {student.email ?? "-"} · {formatPhone(student.phone)}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {studentStatusLabel(student.status)}
                </Badge>
              </button>
            ))}
          </div>
        </Card>

        <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
          <h2 className="text-lg font-semibold">Configurar envio</h2>
          <form
            className="mt-4 flex flex-col gap-4"
            onSubmit={form.handleSubmit(handleSend)}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>SMTP</Label>
                <Select
                  value={form.watch("smtp_id")}
                  onValueChange={(value) => form.setValue("smtp_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {smtp.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Select
                  value={form.watch("whatsapp_id")}
                  onValueChange={(value) => form.setValue("whatsapp_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {whatsapp.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.instanceName ?? item.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="msg-from">Remetente</Label>
              <Input id="msg-from" {...form.register("from")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="msg-subject">Assunto</Label>
              <Input id="msg-subject" {...form.register("subject")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="msg-body">Mensagem</Label>
              <Textarea id="msg-body" rows={5} {...form.register("body")} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {selectedCount} aluno(s) selecionado(s)
              </span>
              <Button type="submit">Enviar mensagem</Button>
            </div>
          </form>
        </Card>
      </section>
    </div>
  );
}
