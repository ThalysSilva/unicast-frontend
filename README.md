# Unicast Frontend

Frontend oficial do Unicast, uma aplicação Next.js para professores organizarem estrutura acadêmica, matrículas, convites de auto-cadastro, integrações de envio e disparos de comunicados por Email e WhatsApp.

Este repositório contém apenas a interface e o BFF da aplicação. A API, as migrações, a seed demo e a documentação detalhada do domínio ficam no backend:

[https://github.com/ThalysSilva/unicast-backend](https://github.com/ThalysSilva/unicast-backend)

## Stack

- Next.js 16 com App Router
- React 19
- NextAuth/Auth.js com sessão JWT
- TanStack Query
- React Hook Form
- Tailwind CSS
- Base UI para componentes acessíveis

## Visão Geral

O frontend usa um BFF em `src/app/api/backend/[...path]/route.ts`.

Na prática:

- o browser chama `/api/backend/...`;
- o BFF valida sessão e origem das requisições mutáveis;
- o BFF injeta `Authorization: Bearer <accessToken>` server-side;
- em fluxos sensíveis, como envio de mensagem e SMTP por senha, o BFF injeta o `jwe` no body;
- `accessToken`, `refreshToken` e `jwe` não são acessados diretamente pelo JavaScript do browser.

As telas principais ficam em:

- `src/app/(dashboard)/dashboard`: visão geral
- `src/app/(dashboard)/setup`: estrutura acadêmica
- `src/app/(dashboard)/campuses/[id]`: campus
- `src/app/(dashboard)/programs/[id]`: cursos
- `src/app/(dashboard)/disciplines/[id]`: disciplinas, turma, convites e importação CSV
- `src/app/(dashboard)/students`: base global de alunos
- `src/app/(dashboard)/messages`: envio de comunicados
- `src/app/(dashboard)/integrations`: integrações de Email e WhatsApp
- `src/app/student/register/[code]`: auto-cadastro público do aluno

## Pré-Requisitos

- Node.js compatível com Next.js 16
- npm
- Backend Unicast rodando localmente ou em ambiente acessível

Para ambiente completo, configure e suba o backend seguindo o README do repositório da API.

## Configuração

Crie o arquivo `.env.local` a partir de `example.env`:

```bash
cp example.env .env.local
```

Variáveis usadas pelo frontend:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_APP_URL=http://localhost:3000
API_BASE_URL=http://localhost:8080
AUTH_SECRET=gere-um-segredo-com-openssl-rand-base64-32
```

Descrição:

- `NEXT_PUBLIC_API_BASE_URL`: URL pública da API. Usada como fallback.
- `NEXT_PUBLIC_APP_URL`: URL pública do frontend, usada em validações de origem e links.
- `API_BASE_URL`: URL server-side da API usada pelo BFF e Auth.js.
- `AUTH_SECRET`: segredo do Auth.js para assinar/criptografar sessão. Em desenvolvimento, gere com `openssl rand -base64 32`.

Em produção, use valores próprios do ambiente e não reutilize segredos locais.

## Instalação

```bash
npm install
```

## Desenvolvimento

Com o backend rodando:

```bash
npm run dev
```

Acesse:

[http://localhost:3000](http://localhost:3000)

Para testar com dados de demonstração, rode a seed no backend e entre com o usuário demo documentado no README da API.

## Scripts

```bash
npm run dev
```

Inicia o servidor de desenvolvimento.

```bash
npm run build
```

Gera build de produção e valida TypeScript.

```bash
npm run start
```

Executa o build de produção.

```bash
npm run lint
```

Executa o ESLint.

## Backend

Este frontend depende do backend Unicast para autenticação, dados acadêmicos, integrações, convites e envio de mensagens.

Repositório:

[https://github.com/ThalysSilva/unicast-backend](https://github.com/ThalysSilva/unicast-backend)

Consulte o README do backend para:

- Docker Compose local
- migrações
- seed de demonstração
- Swagger
- variáveis de ambiente da API
- configuração de Email OAuth
- configuração da Evolution API para WhatsApp
- detalhes de segurança e contratos da API

## Estrutura

```txt
src/
  app/
    (dashboard)/        Telas autenticadas
    api/backend/        BFF/proxy para a API
    api/auth/           Rotas Auth.js
    student/register/   Auto-cadastro público
  components/
    forms/              Campos integrados ao React Hook Form
    layout/             Sidebar, topbar, breadcrumbs e headers
    ui/                 Componentes visuais reutilizáveis
  hooks/                Hooks de query/mutation
  lib/                  API client, tipos, validações e formatadores
  types/                Extensões de tipos do Auth.js
```

## Licença

Este projeto está licenciado sob a licença MIT. Consulte o arquivo [LICENSE](./LICENSE) para mais detalhes.
