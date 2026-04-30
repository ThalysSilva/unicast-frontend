import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-14">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
          Unicast
        </p>
        <h1 className="text-3xl font-semibold text-foreground md:text-4xl">
          Termos de Serviço
        </h1>
        <p className="text-sm text-muted-foreground">
          Última atualização: 30 de abril de 2026.
        </p>
      </div>

      <section className="space-y-4 text-sm leading-7 text-muted-foreground">
        <p>
          Estes termos descrevem as condições gerais de uso do Unicast, uma
          plataforma web para organização de comunicação acadêmica entre docentes
          e discentes por meio de e-mail, WhatsApp e convites de auto-cadastro.
        </p>

        <h2 className="pt-4 text-lg font-semibold text-foreground">
          Uso permitido
        </h2>
        <p>
          O Unicast deve ser utilizado para fins acadêmicos, educacionais ou
          administrativos relacionados à comunicação entre professores e
          estudantes. O usuário é responsável por cadastrar informações corretas,
          manter seus acessos protegidos e utilizar os canais de envio de forma
          compatível com a legislação aplicável e com as políticas dos provedores
          integrados.
        </p>

        <h2 className="pt-4 text-lg font-semibold text-foreground">
          Contas e credenciais
        </h2>
        <p>
          O acesso à área docente depende de autenticação. O usuário deve manter
          suas credenciais em sigilo e comunicar qualquer uso indevido conhecido.
          Integrações externas, como Gmail, SMTP e WhatsApp, dependem de
          autorização ou configuração fornecida pelo próprio usuário.
        </p>

        <h2 className="pt-4 text-lg font-semibold text-foreground">
          Comunicação e responsabilidade
        </h2>
        <p>
          O Unicast oferece ferramentas para seleção de destinatários, canais e
          envio de comunicados. O conteúdo das mensagens, a escolha dos
          destinatários e a obtenção de consentimentos necessários são de
          responsabilidade do usuário que realiza o envio.
        </p>

        <h2 className="pt-4 text-lg font-semibold text-foreground">
          Integrações externas
        </h2>
        <p>
          Algumas funcionalidades dependem de serviços externos, como provedores
          de e-mail, Google/Gmail e integrações com WhatsApp. A disponibilidade,
          limites, políticas e alterações desses serviços podem afetar o
          funcionamento de determinadas funcionalidades.
        </p>

        <h2 className="pt-4 text-lg font-semibold text-foreground">
          Limitações
        </h2>
        <p>
          O sistema é fornecido conforme disponível e pode passar por ajustes,
          interrupções ou mudanças técnicas. Embora sejam adotadas medidas de
          segurança e confiabilidade, não há garantia de disponibilidade
          ininterrupta ou entrega absoluta de todas as mensagens enviadas por
          provedores externos.
        </p>

        <h2 className="pt-4 text-lg font-semibold text-foreground">
          Alterações dos termos
        </h2>
        <p>
          Estes termos podem ser atualizados para refletir mudanças no sistema,
          em integrações externas ou em requisitos legais e operacionais. O uso
          contínuo da plataforma após alterações indica ciência das condições
          atualizadas.
        </p>

        <h2 className="pt-4 text-lg font-semibold text-foreground">
          Contato
        </h2>
        <p>
          Dúvidas sobre estes termos podem ser encaminhadas ao responsável pelo
          projeto pelo e-mail{" "}
          <a
            href="mailto:thalysfarias11@gmail.com"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            thalysfarias11@gmail.com
          </a>
          .
        </p>
      </section>

      <Link
        href="/"
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Voltar para a página inicial
      </Link>
    </main>
  );
}
