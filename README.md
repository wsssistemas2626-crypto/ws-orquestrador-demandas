# WS Orquestrador de Demandas

| Campo | Valor |
|---|---|
| Versão | 0.1.4 (`package.json`) |
| Atualizado em | 02/11/2026 |
| Dono do sistema | Fabiano (CTO) |
| Dono deste documento | `documentacao-tecnica` |
| Repositório | `wsssistemas2626-crypto/ws-orquestrador-demandas` (privado) |
| Pedido de origem | `DEC-DEM-20261022-0001-v1` (`docs/construcao/DEC-DEM-20261022-0001-v1/`) |

Sistema interno da WS Sistemas. Recebe uma demanda técnica (bug, melhoria, novo projeto, estudo ou produto próprio),
guarda a especificação técnica (ESP), o parecer de risco (RSK) e o pacote de decisão (DEC) em versões que não mudam
depois de gravadas, registra a decisão de uma pessoa com 2FA (com dupla aprovação quando o nível pede) e, de um DEC
aprovado, gera o **Pedido de Construção** que o `/construir` aceita. O pedido é baixado e copiado à mão para
`pedidos/` da estruturaAutonoma.

Quatro agentes de IA (orquestrador, insumo técnico, risco e consolidação) podem preencher rascunhos como jobs, mas
**nascem desligados e com teto de gasto zero**. Na 0.1.0 a pessoa preenche tudo pelo painel.

## Onde está cada coisa

| Assunto | Documento |
|---|---|
| Como o sistema funciona, requisito por requisito | [Manual técnico](docs/manual-tecnico/README.md) |
| Deploy, serviços do Easypanel, variáveis, rollback | [docs/operacao/deploy.md](docs/operacao/deploy.md) |
| O que entrou em cada versão e o que ficou pendente | [CHANGELOG.md](CHANGELOG.md) |
| Spec aprovada na Parada 1 | [docs/superpowers/specs/2026-10-25-ws-orquestrador-demandas-design.md](docs/superpowers/specs/2026-10-25-ws-orquestrador-demandas-design.md) |
| Plano de implementação (47 tarefas) | [docs/superpowers/plans/2026-10-25-ws-orquestrador-demandas-plano.md](docs/superpowers/plans/2026-10-25-ws-orquestrador-demandas-plano.md) |

## Requisitos da máquina

- Node 24 (`engines.node >=24`) com corepack. O pnpm vem do `packageManager` (`pnpm@12.6.0`).
- Docker: o `pnpm test` sobe um Postgres por suíte pelo Testcontainers, e o `pnpm test:e2e` sobe o dele.
- Porta 3101 livre. Nunca use a 3000: é o painel do Easypanel.

## Instalar e verificar

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm exec playwright install chromium
pnpm test:e2e
pnpm audit --prod --audit-level high
```

- `pnpm test` roda o Vitest com Postgres real (Testcontainers). Nenhum teste chama o provedor de IA nem o Resend.
- `pnpm test:e2e` roda o Playwright com axe. Sem `BASE_URL`, o `e2e/servidor.ts` sobe um Postgres descartável, aplica
  as migrations, cria os dados fictícios, faz o `next build` e o `next start` em `127.0.0.1:3101`. Com `BASE_URL`,
  roda contra um ambiente que já está de pé e não sobe nada.
- Os dados do e2e vêm do seed fictício (contas e demandas achadas pelo título) e da API (o que os testes criam). Contra
  o mesmo banco, as demandas do seed acumulam versões e decisões entre execuções. Sem a variável `CI`, os testes que
  precisam de banco recém-semeado são pulados com a mensagem `exige banco recém-semeado: <motivo>`; com `CI` (GitHub
  Actions e homologação do `/construir`), eles reprovam, porque ali o banco é sempre novo. A suíte inteira repetida na
  mesma hora contra o mesmo banco recebe 429 do limite de demandas por hora: espere uma hora entre as execuções.
- `pnpm audit --prod --audit-level high` (ou `pnpm audit:prod`) tem de terminar com código 0. O `pnpm-workspace.yaml`
  fixa o `zod` em 4.6.6 por `overrides`, inclusive o que vem pelo better-auth. Não tire essa linha sem rodar o audit.

## Ver o sistema de pé com dados fictícios

O `docker-compose.hml.yml` sobe banco, app e worker só com valores fictícios escritos no próprio arquivo, sem `.env`,
e publica só o app em `127.0.0.1`:

```bash
HML_PORTA=3200 docker compose -f docker-compose.hml.yml -p hml-local up --build -d
```

1. Espere o app ficar saudável (`docker compose -f docker-compose.hml.yml -p hml-local ps`).
2. Abra `http://127.0.0.1:3200/entrar`. As contas fictícias, com senha e 2FA, estão em `CONTAS_FICTICIAS`, no
   `scripts/seed-ficticio.ts`.
3. Ao terminar, derrube tudo, volumes inclusive:

```bash
docker compose -f docker-compose.hml.yml -p hml-local down -v
```

## Desenvolver com banco local

1. Suba o Postgres de desenvolvimento, publicado só em `127.0.0.1:5434`:
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```
   O dono do banco (o papel migrator) e o nome do banco estão no próprio `docker-compose.dev.yml`.
2. Crie o papel da aplicação, sem DDL, com uma senha local sua. Sem ele, a migration de privilégios falha de
   propósito:
   ```bash
   docker compose -f docker-compose.dev.yml exec db psql -U migrator_dev -d orquestrador_dev -c "CREATE ROLE orquestrador_app LOGIN PASSWORD '<senha local>' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;"
   ```
3. Copie `.env.example` para `.env.local` (fora do git pelo `.gitignore`) e preencha:
   - `DATABASE_URL_MIGRATOR`: URL do papel migrator, em `127.0.0.1:5434`;
   - `DATABASE_URL`: URL do papel `orquestrador_app`, no mesmo banco;
   - `BETTER_AUTH_SECRET`: 32 bytes ou mais;
   - `BETTER_AUTH_URL`: `http://127.0.0.1:3101`. Abra o painel por esse mesmo endereço: rota que muda estado exige o
     `Origin` igual ao do `BETTER_AUTH_URL`, e `localhost` dá 403.
   Deixe `ANTHROPIC_API_KEY` e `RESEND_API_KEY` vazias.
4. Aplique as migrations (o comando lê o `.env.local`):
   ```bash
   pnpm db:migrate
   ```
5. Crie os dados fictícios (só com o banco vazio):
   ```bash
   SEED_FICTICIO=1 pnpm exec tsx --env-file=.env.local scripts/seed-ficticio.ts
   ```
6. Suba o painel e a API em `http://127.0.0.1:3101`. O Next lê o `.env.local`:
   ```bash
   pnpm dev
   ```
7. Em outro terminal, suba o worker. O `pnpm worker` não lê o `.env.local`, então passe o arquivo ao `tsx`:
   ```bash
   pnpm exec tsx --env-file=.env.local src/worker/index.ts
   ```

## Comandos do `package.json`

| Comando | O que faz |
|---|---|
| `pnpm dev` | `next dev` na porta 3101 |
| `pnpm build` / `pnpm start` | build de produção; `next start` na porta de `PORT` (padrão 3101) |
| `pnpm start:hml` | homologação: migrations, seed fictício e `pnpm start`, sem passar `DATABASE_URL_MIGRATOR` ao app |
| `pnpm worker` | processo worker (pg-boss): agentes, aviso por e-mail, expurgo, batimento |
| `pnpm lint` / `pnpm typecheck` / `pnpm format` | ESLint, `tsc --noEmit`, Prettier |
| `pnpm test` / `pnpm test:e2e` | Vitest com Testcontainers / Playwright com axe |
| `pnpm db:generate` | `drizzle-kit generate` (migration de esquema) |
| `pnpm db:migrate` | migrations e filas do pg-boss com `DATABASE_URL_MIGRATOR` |
| `pnpm audit:prod` | `pnpm audit --prod --audit-level high` |

Scripts de operação (contas, tokens de agente, preço de modelo, seed) estão no
[capítulo 10 do manual](docs/manual-tecnico/10-configuracao-e-scripts.md).

## Regras que valem para quem mexe no código

- Segredo só por variável de ambiente, citada pelo nome. `.env` e `.env.*` não entram no git.
- Só dado fictício em código, teste, fixture e log (JUR-2026-002, 7.4).
- Migration de esquema só por `pnpm db:generate`; SQL à mão só em migration custom `rls_<nome>`; migration commitada
  não se edita.
- Migration em produção nunca roda pelo `/construir`: é passo de Fabiano, na ordem backup → migrate → deploy
  ([deploy.md, seção 5](docs/operacao/deploy.md)).
