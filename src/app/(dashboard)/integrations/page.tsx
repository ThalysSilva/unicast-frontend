"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest, extractData, getAuth } from "@/lib/api";
import type {
  ApiMessage,
  ApiResponse,
  SmtpInstance,
  WhatsappInstance,
} from "@/lib/types";

export default function IntegrationsPage() {
  const [smtp, setSmtp] = useState<SmtpInstance[]>([]);
  const [whatsapp, setWhatsapp] = useState<WhatsappInstance[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const smtpForm = useForm({
    defaultValues: {
      host: "",
      port: 587,
      email: "",
      password: "",
    },
  });

  const whatsappForm = useForm({
    defaultValues: { phone: "" },
  });

  const load = async () => {
    const [smtpRes, whatsappRes] = await Promise.allSettled([
      apiRequest<ApiResponse<SmtpInstance[]>>("/smtp/instance"),
      apiRequest<ApiResponse<{ instances: WhatsappInstance[] }>>(
        "/whatsapp/instance"
      ),
    ]);

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

  const handleMessage = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 4000);
  };

  const createSmtp = async (values: {
    host: string;
    port: number;
    email: string;
    password: string;
  }) => {
    const auth = getAuth();
    const res = await apiRequest<ApiMessage>("/smtp/instance", {
      method: "POST",
      body: {
        ...values,
        jwe: auth?.jwe ?? "",
      },
    });
    handleMessage(res.message ?? "SMTP criado");
    smtpForm.reset();
    load();
  };

  const createWhatsapp = async (values: { phone: string }) => {
    const res = await apiRequest<ApiResponse<{ pairingCode?: string }>>(
      "/whatsapp/instance",
      {
        method: "POST",
        body: values,
      }
    );
    handleMessage(
      res.message ?? `Instancia criada: ${res.data?.pairingCode ?? ""}`
    );
    whatsappForm.reset();
    load();
  };

  const action = async (path: string, method: string, success: string) => {
    await apiRequest<ApiMessage>(path, { method });
    handleMessage(success);
    load();
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Integracoes"
        description="Conecte seus canais de envio para liberar comunicados via email e WhatsApp."
        badge="SMTP + WhatsApp"
      />

      {message ? (
        <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
          {message}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
          <h2 className="text-lg font-semibold">SMTP</h2>
          <form
            className="mt-4 flex flex-col gap-4"
            onSubmit={smtpForm.handleSubmit(createSmtp)}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="smtp-host">Host</Label>
                <Input id="smtp-host" {...smtpForm.register("host")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-port">Porta</Label>
                <Input
                  id="smtp-port"
                  type="number"
                  {...smtpForm.register("port", { valueAsNumber: true })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-email">Email</Label>
              <Input
                id="smtp-email"
                type="email"
                {...smtpForm.register("email")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-pass">Senha</Label>
              <Input
                id="smtp-pass"
                type="password"
                {...smtpForm.register("password")}
              />
            </div>
            <Button type="submit">Salvar SMTP</Button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {smtp.map((item) => (
              <Badge key={item.id} variant="outline">
                {item.email}
              </Badge>
            ))}
          </div>
        </Card>

        <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
          <h2 className="text-lg font-semibold">WhatsApp</h2>
          <form
            className="mt-4 flex flex-col gap-4"
            onSubmit={whatsappForm.handleSubmit(createWhatsapp)}
          >
            <div className="space-y-2">
              <Label htmlFor="whatsapp-phone">Telefone (com DDI)</Label>
              <Input
                id="whatsapp-phone"
                {...whatsappForm.register("phone")}
              />
            </div>
            <Button type="submit">Criar instancia</Button>
          </form>
          <div className="mt-4 overflow-hidden rounded-2xl border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Instancia</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {whatsapp.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.instanceName ?? item.id}</TableCell>
                    <TableCell>{item.phone}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            action(
                              `/whatsapp/instance/${item.id}/connect`,
                              "POST",
                              "Conexao solicitada"
                            )
                          }
                        >
                          Conectar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            action(
                              `/whatsapp/instance/${item.id}/status`,
                              "GET",
                              "Status consultado"
                            )
                          }
                        >
                          Status
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            action(
                              `/whatsapp/instance/${item.id}/restart`,
                              "POST",
                              "Instancia reiniciada"
                            )
                          }
                        >
                          Reiniciar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            action(
                              `/whatsapp/instance/${item.id}/logout`,
                              "DELETE",
                              "Logout realizado"
                            )
                          }
                        >
                          Logout
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            action(
                              `/whatsapp/instance/${item.id}`,
                              "DELETE",
                              "Instancia removida"
                            )
                          }
                        >
                          Remover
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </section>
    </div>
  );
}
