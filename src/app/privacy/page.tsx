import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-14">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
          Unicast
        </p>
        <h1 className="text-3xl font-semibold text-foreground md:text-4xl">
          Política de Privacidade
        </h1>
        <p className="text-sm text-muted-foreground">
          Última atualização: 30 de abril de 2026.
        </p>
      </div>

      <section className="space-y-4 text-sm leading-7 text-muted-foreground">
        <p>
          O Unicast é uma plataforma web desenvolvida para apoiar a comunicação
          entre docentes e discentes. Esta política descreve como os dados são
          tratados no uso da aplicação, incluindo dados de cadastro, dados
          acadêmicos e integrações de envio por e-mail e WhatsApp.
        </p>

        <h2 className="pt-4 text-lg font-semibold text-foreground">
          Dados coletados
        </h2>
        <p>
          O sistema pode armazenar dados de usuários docentes, como nome, e-mail
          e credenciais de autenticação, além de dados acadêmicos informados pelo
          docente ou pelo estudante, como campus, curso, disciplina, matrícula,
          nome do estudante, e-mail, telefone, consentimento e registros de envio
          de mensagens.
        </p>

        <h2 className="pt-4 text-lg font-semibold text-foreground">
          Uso dos dados
        </h2>
        <p>
          Os dados são utilizados para autenticar usuários, organizar o vínculo
          entre docentes, disciplinas e estudantes, permitir o auto-cadastro por
          convite, configurar canais de comunicação e registrar o resultado de
          envios realizados pela plataforma.
        </p>

        <h2 className="pt-4 text-lg font-semibold text-foreground">
          Integração com Google e Gmail
        </h2>
        <p>
          Quando o docente conecta uma conta Google ao Unicast, a autorização é
          utilizada para envio de mensagens por e-mail a partir da própria conta
          autorizada. O Unicast solicita apenas os escopos necessários para essa
          funcionalidade e não utiliza dados da conta Google para publicidade,
          venda de informações ou compartilhamento com terceiros fora da
          finalidade de envio configurada pelo usuário.
        </p>

        <h2 className="pt-4 text-lg font-semibold text-foreground">
          Compartilhamento e retenção
        </h2>
        <p>
          Os dados não são vendidos. Informações podem ser encaminhadas a
          provedores externos apenas quando necessário para executar o envio de
          mensagens, como provedores SMTP, Gmail ou serviços de integração com
          WhatsApp. Registros operacionais podem ser mantidos para auditoria,
          diagnóstico de falhas e melhoria da confiabilidade do sistema.
        </p>

        <h2 className="pt-4 text-lg font-semibold text-foreground">
          Segurança
        </h2>
        <p>
          A plataforma utiliza medidas como autenticação por sessão, cookies
          HttpOnly, tráfego HTTPS, controle de acesso por usuário e proteção de
          credenciais sensíveis no lado servidor. Mesmo assim, nenhum sistema é
          completamente imune a riscos, e o uso deve observar boas práticas de
          segurança por parte dos usuários.
        </p>

        <h2 className="pt-4 text-lg font-semibold text-foreground">
          Contato
        </h2>
        <p>
          Solicitações relacionadas a privacidade, revisão ou remoção de dados
          podem ser encaminhadas ao responsável pelo projeto pelo e-mail{" "}
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
