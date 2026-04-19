import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
              Colete contatos da turma sem planilha improvisada.
            </h1>
            <p className="max-w-xl text-base text-muted-foreground md:text-lg">
              O professor registra as matrículas esperadas, compartilha um convite
              por link ou QR code em sala e deixa o próprio aluno completar email e
              telefone. Depois disso, o envio por WhatsApp e email fica centralizado.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/login"
                className={cn(buttonVariants({ size: "lg" }))}
              >
                Entrar como professor
              </Link>
              <Link
                href="/register"
                className={cn(buttonVariants({ size: "lg", variant: "secondary" }))}
              >
                Criar conta docente
              </Link>
              <Link
                href="/student/register/demo"
                className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
              >
                Ver tela do aluno
              </Link>
            </div>
          </div>
          <Card className="flex flex-col gap-5 rounded-3xl border border-border/60 bg-white/80 p-6 shadow-lg">
            <div>
              <p className="text-sm font-medium text-foreground">
                Fluxo real de uso
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                A jornada foi pensada para sala de aula, convite projetado e cadastro pelo próprio aluno.
              </p>
            </div>
            <div className="space-y-3">
              <div className="rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm">
                1. Cadastre campus, curso e disciplina.
              </div>
              <div className="rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm">
                2. Registre as matrículas ou importe a turma por CSV.
              </div>
              <div className="rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm">
                3. Gere o convite, compartilhe em sala e receba os contatos preenchidos pelos alunos.
              </div>
              <div className="rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm">
                4. Conecte Email/WhatsApp e envie comunicados em massa.
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
