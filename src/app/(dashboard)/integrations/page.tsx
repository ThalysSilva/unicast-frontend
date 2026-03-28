"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
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
import { apiRequest, extractData, getAuth } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type {
  ApiMessage,
  ApiResponse,
  SmtpInstance,
  WhatsappInstance,
} from "@/lib/types";

type ConnectResponse = {
  status?: string;
  message?: string;
  pairingCode?: string;
  code?: string;
  base64?: string;
  count?: number;
  qrcode?: { code?: string; base64?: string };
};

export default function IntegrationsPage() {
  const [qrData, setQrData] = useState<ConnectResponse | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const { showToast } = useToast();

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

  const smtpQuery = useApiQuery({
    queryKey: queryKeys.smtp(),
    queryFn: async () => {
      const response = await apiRequest<ApiResponse<SmtpInstance[]>>(
        "/smtp/instance"
      );
      return extractData(response);
    },
  });

  const whatsappQuery = useApiQuery({
    queryKey: queryKeys.whatsapp(),
    queryFn: async () => {
      const response = await apiRequest<
        ApiResponse<{ instances: WhatsappInstance[] }>
      >("/whatsapp/instance");
      return extractData(response).instances ?? [];
    },
  });

  const handleSuccess = (text: string) => {
    showToast({
      title: text,
      variant: "success",
    });
  };

  const createSmtpMutation = useApiMutation<
    ApiMessage,
    {
      host: string;
      port: number;
      email: string;
      password: string;
    }
  >({
    mutationFn: async (values) => {
      const auth = getAuth();
      return apiRequest<ApiMessage>("/smtp/instance", {
        method: "POST",
        body: {
          ...values,
          jwe: auth?.jwe ?? "",
        },
      });
    },
    invalidateQueryKeys: [queryKeys.smtp()],
    onSuccess: (res) => {
      handleSuccess(res.message ?? "SMTP criado");
      smtpForm.reset();
    },
  });

  const removeSmtpMutation = useApiMutation<ApiMessage, string>({
    mutationFn: async (id) =>
      apiRequest<ApiMessage>(`/smtp/instance/${id}`, {
        method: "DELETE",
      }),
    invalidateQueryKeys: [queryKeys.smtp()],
    onSuccess: (res) => {
      handleSuccess(res.message ?? "SMTP removido");
    },
  });

  const connectInstanceMutation = useApiMutation<
    ApiResponse<ConnectResponse>,
    string
  >({
    mutationFn: async (instanceId) =>
      apiRequest<ApiResponse<ConnectResponse>>(
        `/whatsapp/instance/${instanceId}/connect`,
        { method: "POST" }
      ),
    onSuccess: (res) => {
      if (res.data) {
        setQrData(res.data);
        setQrOpen(true);
      }

      handleSuccess(res.message ?? "Conexao solicitada");
    },
  });

  const createWhatsappMutation = useApiMutation<
    ApiResponse<{ instanceId?: string }>,
    { phone: string }
  >({
    mutationFn: async (values) =>
      apiRequest<ApiResponse<{ instanceId?: string }>>("/whatsapp/instance", {
        method: "POST",
        body: values,
      }),
    invalidateQueryKeys: [queryKeys.whatsapp()],
    onSuccess: async (res, values) => {
      handleSuccess(res.message ?? "Instancia criada");
      whatsappForm.reset();
      const freshWhatsapp = await whatsappQuery.refetch();
      const created = (freshWhatsapp.data ?? []).find(
        (item) => item.phone === values.phone
      );

      if (created?.id) {
        await connectInstanceMutation.mutateAsync(created.id);
      }
    },
  });

  const actionMutation = useApiMutation<
    ApiMessage,
    { path: string; method: string; success: string }
  >({
    mutationFn: async ({ path, method }) =>
      apiRequest<ApiMessage>(path, { method }),
    invalidateQueryKeys: [queryKeys.whatsapp()],
    onSuccess: (res, variables) => {
      handleSuccess(res.message ?? variables.success);
    },
  });

  const resolveQrImage = (data?: ConnectResponse | null) => {
    const raw = data?.base64 || data?.qrcode?.base64 || "";
    if (!raw) return "";
    if (raw.startsWith("data:image")) return raw;
    return `data:image/png;base64,${raw}`;
  };

  const smtp = smtpQuery.data ?? [];
  const whatsapp = whatsappQuery.data ?? [];
  const isLoading = smtpQuery.isLoading || whatsappQuery.isLoading;
  const queryError = smtpQuery.error ?? whatsappQuery.error ?? null;
  const error = smtpQuery.error?.message ?? whatsappQuery.error?.message ?? null;
  const pendingWhatsappAction = useMemo(() => {
    if (actionMutation.variables?.path) return actionMutation.variables.path;
    if (connectInstanceMutation.variables) {
      return `/whatsapp/instance/${connectInstanceMutation.variables}/connect`;
    }
    return null;
  }, [actionMutation.variables, connectInstanceMutation.variables]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Integracoes"
        description="Conecte seus canais de envio para liberar comunicados via email e WhatsApp."
        badge="SMTP + WhatsApp"
      />

      <ToastOnError error={queryError} />

      {error ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
            <DialogDescription>
              Escaneie o QR Code no WhatsApp ou use o codigo de pareamento.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {resolveQrImage(qrData) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolveQrImage(qrData)}
                alt="QR Code WhatsApp"
                className="h-56 w-56 rounded-2xl border border-border/60 bg-white"
              />
            ) : (
              <div className="rounded-2xl border border-border/60 bg-muted px-4 py-6 text-sm text-muted-foreground">
                QR Code indisponivel. Tente novamente.
              </div>
            )}
            {qrData?.pairingCode ? (
              <div className="rounded-2xl border border-border/60 bg-background px-4 py-2 text-sm">
                Codigo: <span className="font-semibold">{qrData.pairingCode}</span>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
          <h2 className="text-lg font-semibold">SMTP</h2>
          <form
            className="mt-4 flex flex-col gap-4"
            onSubmit={smtpForm.handleSubmit((values) =>
              createSmtpMutation.mutateAsync(values)
            )}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="smtp-host">Host</Label>
                <Input
                  id="smtp-host"
                  disabled={createSmtpMutation.isPending}
                  {...smtpForm.register("host")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-port">Porta</Label>
                <Input
                  id="smtp-port"
                  type="number"
                  disabled={createSmtpMutation.isPending}
                  {...smtpForm.register("port", { valueAsNumber: true })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-email">Email</Label>
              <Input
                id="smtp-email"
                type="email"
                disabled={createSmtpMutation.isPending}
                {...smtpForm.register("email")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-pass">Senha</Label>
              <Input
                id="smtp-pass"
                type="password"
                disabled={createSmtpMutation.isPending}
                {...smtpForm.register("password")}
              />
            </div>
            <Button type="submit" disabled={createSmtpMutation.isPending}>
              {createSmtpMutation.isPending ? "Salvando..." : "Salvar SMTP"}
            </Button>
          </form>
          <div className="mt-4">
            {smtpQuery.isLoading ? (
              <LoadingState label="Carregando SMTP..." className="min-h-24" />
            ) : smtp.length ? (
              <div className="grid gap-3">
                {smtp.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{item.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.host}:{item.port}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={removeSmtpMutation.isPending}
                      onClick={() => removeSmtpMutation.mutate(item.id)}
                    >
                      {removeSmtpMutation.isPending &&
                      removeSmtpMutation.variables === item.id
                        ? "Removendo..."
                        : "Apagar"}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Nenhum SMTP cadastrado"
                description="Cadastre uma credencial para liberar envios por email."
              />
            )}
          </div>
        </Card>

        <Card className="rounded-3xl border border-border/60 bg-white/90 p-6">
          <h2 className="text-lg font-semibold">WhatsApp</h2>
          <form
            className="mt-4 flex flex-col gap-4"
            onSubmit={whatsappForm.handleSubmit((values) =>
              createWhatsappMutation.mutateAsync(values)
            )}
          >
            <div className="space-y-2">
              <Label htmlFor="whatsapp-phone">Telefone (com DDI)</Label>
              <Input
                id="whatsapp-phone"
                disabled={createWhatsappMutation.isPending}
                {...whatsappForm.register("phone")}
              />
            </div>
            <Button type="submit" disabled={createWhatsappMutation.isPending}>
              {createWhatsappMutation.isPending ? "Criando..." : "Criar instancia"}
            </Button>
          </form>
          <div className="mt-4 overflow-hidden rounded-2xl border border-border/60">
            {isLoading ? (
              <LoadingState
                label="Carregando instancias do WhatsApp..."
                className="rounded-none border-0"
              />
            ) : whatsapp.length ? (
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
                            disabled={
                              connectInstanceMutation.isPending ||
                              actionMutation.isPending
                            }
                            onClick={() => connectInstanceMutation.mutate(item.id)}
                          >
                            {connectInstanceMutation.isPending &&
                            pendingWhatsappAction ===
                              `/whatsapp/instance/${item.id}/connect`
                              ? "Conectando..."
                              : "Conectar"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={
                              connectInstanceMutation.isPending ||
                              actionMutation.isPending
                            }
                            onClick={() =>
                              actionMutation.mutate({
                                path: `/whatsapp/instance/${item.id}/status`,
                                method: "GET",
                                success: "Status consultado",
                              })
                            }
                          >
                            {actionMutation.isPending &&
                            pendingWhatsappAction ===
                              `/whatsapp/instance/${item.id}/status`
                              ? "Consultando..."
                              : "Status"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={
                              connectInstanceMutation.isPending ||
                              actionMutation.isPending
                            }
                            onClick={() =>
                              actionMutation.mutate({
                                path: `/whatsapp/instance/${item.id}/restart`,
                                method: "POST",
                                success: "Instancia reiniciada",
                              })
                            }
                          >
                            {actionMutation.isPending &&
                            pendingWhatsappAction ===
                              `/whatsapp/instance/${item.id}/restart`
                              ? "Reiniciando..."
                              : "Reiniciar"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={
                              connectInstanceMutation.isPending ||
                              actionMutation.isPending
                            }
                            onClick={() =>
                              actionMutation.mutate({
                                path: `/whatsapp/instance/${item.id}/logout`,
                                method: "DELETE",
                                success: "Logout realizado",
                              })
                            }
                          >
                            {actionMutation.isPending &&
                            pendingWhatsappAction ===
                              `/whatsapp/instance/${item.id}/logout`
                              ? "Saindo..."
                              : "Logout"}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={
                              connectInstanceMutation.isPending ||
                              actionMutation.isPending
                            }
                            onClick={() =>
                              actionMutation.mutate({
                                path: `/whatsapp/instance/${item.id}`,
                                method: "DELETE",
                                success: "Instancia removida",
                              })
                            }
                          >
                            {actionMutation.isPending &&
                            pendingWhatsappAction ===
                              `/whatsapp/instance/${item.id}`
                              ? "Removendo..."
                              : "Remover"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                title="Nenhuma instancia criada"
                description="Crie uma instancia para conectar o WhatsApp ao sistema."
                className="rounded-none border-0"
              />
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
