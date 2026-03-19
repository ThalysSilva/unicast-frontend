import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <main className="w-full max-w-5xl space-y-10">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
              Unicast Frontend
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-foreground md:text-5xl">
              Centralize a comunicacao com alunos e campanhas em um unico painel.
            </h1>
            <p className="max-w-xl text-base text-muted-foreground md:text-lg">
              Crie campi, cursos e alunos, conecte SMTP e WhatsApp, envie mensagens
              e acompanhe o status das turmas. Um fluxo simples, com tudo que o
              backend do Unicast oferece.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg">
                <Link href="/login">Entrar como professor</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/student/register/demo">Registro do aluno</Link>
              </Button>
            </div>
          </div>
          <Card className="flex flex-col gap-6 rounded-3xl border border-border/60 bg-white/80 p-6 shadow-lg">
            <div>
              <p className="text-sm font-medium text-foreground">
                Fluxo rapido para o docente
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Configure o basico, importe o CSV e envie mensagens em minutos.
              </p>
            </div>
            <div className="space-y-3">
              <div className="rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm">
                1. Cadastre campus, programa e disciplina.
              </div>
              <div className="rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm">
                2. Importe alunos ou crie convites.
              </div>
              <div className="rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm">
                3. Conecte SMTP/WhatsApp e dispare a campanha.
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
