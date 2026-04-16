"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type InviteQrDialogProps = {
  code: string;
  link: string;
};

const buildFileName = (code: string) =>
  `convite-${code.toLowerCase().replace(/[^a-z0-9_-]/g, "-")}.png`;

export function InviteQrDialog({ code, link }: InviteQrDialogProps) {
  const [open, setOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    if (!open) return;

    QRCode.toDataURL(link, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 960,
      color: {
        dark: "#111827",
        light: "#ffffff",
      },
    }).then(setQrDataUrl);
  }, [link, open]);

  const downloadQrCode = () => {
    if (!qrDataUrl) return;

    const anchor = document.createElement("a");
    anchor.href = qrDataUrl;
    anchor.download = buildFileName(code);
    anchor.click();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        QR Code
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code do convite</DialogTitle>
          <DialogDescription>
            Use esta imagem em slides, materiais impressos ou no quadro da sala.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="rounded-2xl border border-border/60 bg-white p-4">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt={`QR Code do convite ${code}`}
                className="mx-auto aspect-square w-full max-w-72"
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center text-sm text-muted-foreground">
                Gerando QR Code...
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border/60 bg-background px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Link
            </p>
            <p className="mt-2 break-all text-sm font-medium text-foreground">
              {link}
            </p>
          </div>

          <Button type="button" onClick={downloadQrCode} disabled={!qrDataUrl}>
            Baixar imagem
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

