"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
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

type ConnectionStateResponse = ApiResponse<{ status?: string }>;
type CreateWhatsappResponse = {
  instanceId?: string;
  qrCode?: string;
  pairingCode?: string;
};

type OAuthStartResponse = ApiResponse<{ url: string }>;

const CONNECTED_STATUSES = new Set(["open", "connected"]);

export default function IntegrationsPage() {
  const [qrData, setQrData] = useState<ConnectResponse | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrInstanceId, setQrInstanceId] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const status = params.get("oauth_status");
    if (!status) return;

    const provider = params.get("oauth_provider");
    const message = params.get("oauth_message");
    showToast({
      title:
        status === "success"
          ? "Google conectado com sucesso"
          : message ?? "Falha ao conectar provedor de email",
      variant: status === "success" ? "success" : "error",
    });

    params.delete("oauth_status");
    params.delete("oauth_provider");
    params.delete("oauth_message");
    const nextQuery = params.toString();
    const nextURL = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
    window.history.replaceState({}, "", nextURL);
  }, [showToast]);

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

  const normalizeConnectionStatus = (status?: string) =>
    status?.trim().toLowerCase() ?? "";

  const syncWhatsappInstances = async () => {
    const freshWhatsapp = await whatsappQuery.refetch();
    return freshWhatsapp.data ?? [];
  };

  const handleQrOpenChange = (open: boolean) => {
    setQrOpen(open);

    if (!open) {
      const instanceId = qrInstanceId;
      setQrData(null);
      setQrInstanceId(null);
      void (async () => {
        if (instanceId) {
          await apiRequest<ConnectionStateResponse>(
            `/whatsapp/instance/${instanceId}/status`
          );
        }
        await syncWhatsappInstances();
      })();
    }
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

  const testSmtpMutation = useApiMutation<
    ApiMessage,
    {
      host: string;
      port: number;
      email: string;
      password: string;
    }
  >({
    mutationFn: async (values) =>
      apiRequest<ApiMessage>("/smtp/instance/test", {
        method: "POST",
        body: values,
      }),
    onSuccess: (res) => {
      handleSuccess(res.message ?? "Conexao SMTP validada");
    },
  });

  const startOAuthMutation = useApiMutation<OAuthStartResponse, "google">({
    mutationFn: async (provider) =>
      apiRequest<OAuthStartResponse>(`/smtp/oauth/${provider}/start`, {
        method: "POST",
      }),
    onSuccess: (res) => {
      if (typeof window !== "undefined" && res.data?.url) {
        window.location.href = res.data.url;
      }
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
    ApiResponse<CreateWhatsappResponse>,
    { phone: string }
  >({
    mutationFn: async (values) =>
      apiRequest<ApiResponse<CreateWhatsappResponse>>("/whatsapp/instance", {
        method: "POST",
        body: values,
      }),
    invalidateQueryKeys: [queryKeys.whatsapp()],
    onSuccess: async (res, values) => {
      handleSuccess(res.message ?? "Instancia criada");
      whatsappForm.reset();
      const instances = await syncWhatsappInstances();
      const created = instances.find((item) => item.phone === values.phone);

      if (created?.id) {
        setQrInstanceId(created.id);
        await connectInstanceMutation.mutateAsync(created.id);
        return;
      }

      setQrData({
        code: res.data?.qrCode,
        qrcode: {
          code: res.data?.qrCode,
          base64: res.data?.qrCode,
        },
        pairingCode: res.data?.pairingCode,
      });
      setQrOpen(true);
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
  const isQrLoading =
    createWhatsappMutation.isPending || connectInstanceMutation.isPending;
  const isLoading = smtpQuery.isLoading || whatsappQuery.isLoading;
  const queryError = smtpQuery.error ?? whatsappQuery.error ?? null;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Integracoes"
        description="Conecte seus canais de envio para liberar comunicados via email e WhatsApp."
        badge="SMTP + WhatsApp"
      />

      <ToastOnError error={queryError} />

      <Dialog open={qrOpen} onOpenChange={handleQrOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
            <DialogDescription>
              {isQrLoading
                ? "Criando a instancia e preparando o QR Code."
                : "Escaneie o QR Code no WhatsApp ou use o codigo de pareamento."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {isQrLoading ? (
              <LoadingState
                label="Carregando QR Code do WhatsApp..."
                className="min-h-56"
              />
            ) : resolveQrImage(qrData) ? (
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
          <div className="mt-4 rounded-2xl border border-border/60 bg-background p-4">
            <p className="text-sm font-medium text-foreground">
              Conectar email pessoal com OAuth
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Use esta opcao para conectar uma conta Gmail sem depender de senha SMTP.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={startOAuthMutation.isPending}
                onClick={() => startOAuthMutation.mutate("google")}
              >
                {startOAuthMutation.isPending &&
                startOAuthMutation.variables === "google"
                  ? "Conectando..."
                  : "Conectar Google"}
              </Button>
            </div>
          </div>
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
                  disabled={createSmtpMutation.isPending || testSmtpMutation.isPending}
                  {...smtpForm.register("host")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-port">Porta</Label>
                <Input
                  id="smtp-port"
                  type="number"
                  disabled={createSmtpMutation.isPending || testSmtpMutation.isPending}
                  {...smtpForm.register("port", { valueAsNumber: true })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-email">Email</Label>
                <Input
                  id="smtp-email"
                  type="email"
                  disabled={createSmtpMutation.isPending || testSmtpMutation.isPending}
                  {...smtpForm.register("email")}
                />
              </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-pass">Senha</Label>
                <Input
                  id="smtp-pass"
                  type="password"
                  disabled={createSmtpMutation.isPending || testSmtpMutation.isPending}
                  {...smtpForm.register("password")}
                />
              </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={createSmtpMutation.isPending || testSmtpMutation.isPending}
                onClick={smtpForm.handleSubmit((values) =>
                  testSmtpMutation.mutateAsync(values)
                )}
              >
                {testSmtpMutation.isPending ? "Testando..." : "Testar SMTP"}
              </Button>
              <Button type="submit" disabled={createSmtpMutation.isPending || testSmtpMutation.isPending}>
                {createSmtpMutation.isPending ? "Salvando..." : "Salvar SMTP"}
              </Button>
            </div>
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
                        {item.authMode === "oauth"
                          ? "Google OAuth"
                          : `${item.host}:${item.port}`}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {item.authMode === "oauth" ? "OAuth" : "SMTP"}
                    </Badge>
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
            onSubmit={whatsappForm.handleSubmit(async (values) => {
              setQrData(null);
              setQrInstanceId(null);
              await createWhatsappMutation.mutateAsync(values);
            })}
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
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <span>{item.instanceName ?? item.id}</span>
                          {CONNECTED_STATUSES.has(
                            normalizeConnectionStatus(item.connectionStatus)
                          ) ? (
                            <Badge
                              variant="outline"
                              className="w-fit border-emerald-200 bg-emerald-50 text-emerald-700"
                            >
                              Conectado
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{item.phone}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          {!CONNECTED_STATUSES.has(
                            normalizeConnectionStatus(item.connectionStatus)
                          ) ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={
                                connectInstanceMutation.isPending ||
                                actionMutation.isPending
                              }
                              onClick={() => {
                                setQrData(null);
                                setQrInstanceId(item.id);
                                setQrOpen(true);
                                connectInstanceMutation.mutate(item.id);
                              }}
                            >
                              {connectInstanceMutation.isPending &&
                              connectInstanceMutation.variables === item.id
                                ? "Conectando..."
                                : "Conectar"}
                            </Button>
                          ) : null}
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
                            actionMutation.variables?.path ===
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
