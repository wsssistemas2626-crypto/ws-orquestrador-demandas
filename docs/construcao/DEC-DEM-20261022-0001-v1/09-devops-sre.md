---
pedido: DEC-DEM-20261022-0001-v1
etapa: 09-entrega
agente: devops-sre
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, 02-arquiteto-solucoes.md, tarefas.json, 08-maestro.md, 08-seguranca-aplicacao.md, package.json, pnpm-workspace.yaml, tsconfig.json, next.config.ts, drizzle.config.ts, .gitignore, docker-compose.dev.yml, playwright.config.ts, e2e/servidor.ts, e2e/apoio.ts, scripts/start-hml.ts, scripts/migrate.ts, scripts/seed-ficticio.ts (linhas 1-80), scripts/criar-usuario.ts, scripts/lib/saida.ts, scripts/hml/criar-papeis.sql, src/lib/env.ts, src/lib/env-worker.ts, src/lib/deps.ts, src/worker/index.ts, src/app/api/saude/route.ts, construir.mjs, lib/homologacao.mjs, lib/rollback.mjs, lib/verificacao.mjs, lib/permissoes.mjs, conferencias/homologar.json]
status: pronto
proximo: documentacao-tecnica
devolvido_para: null
---
## Entrega

Arquivos novos no repositório (nenhum commit, nenhum push, nenhuma imagem publicada, nenhum webhook chamado):

- `.github/workflows/ci.yml`: roda em `pull_request` e por `workflow_call` (chamado pelo `deploy.yml`). Cinco jobs:
  `verificar` (`pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test` com Testcontainers), `e2e`
  (`playwright install --with-deps chromium` e `pnpm test:e2e` contra o build de produção do `e2e/servidor.ts`),
  `dependencias` (`pnpm audit --prod --audit-level high`), `segredos` (gitleaks no histórico inteiro, `fetch-depth: 0`,
  `--redact`) e `imagem` (`docker build` sem publicar). `permissions: contents: read` no topo, checkout com
  `persist-credentials: false`, sem segredo nenhum. Fecha a A-05 (C-39), menos a fixação por SHA (Pendências).
- `.github/workflows/deploy.yml`: só `on: push: branches: [main]`. Chama o `ci.yml` inteiro, e só depois dele o job
  `publicar` (com `packages: write` só nesse job) constrói com `--provenance=false --sbom=false`, publica
  `ghcr.io/<repo>:<sha>`, `:v<versão>` e `:latest`, decide pelos webhooks e apaga as versões além das 2 mais recentes
  pela API de pacotes (`gh api`). Os webhooks (`EASYPANEL_WEBHOOK_WORKER` e depois `EASYPANEL_WEBHOOK_APP`, segredos do
  GitHub) só são chamados quando o push **não** muda `drizzle/`. Com migration nova, a imagem sai, os webhooks não, e o
  resumo da execução manda seguir backup → migrate → deploy (ADR-12, CA-P7-06).
- `Dockerfile`: multiestágio sobre `node:24-bookworm-slim` (`base` com corepack e pnpm 12.6.0 já baixado; `deps` com
  `pnpm install --frozen-lockfile`; `build` com `pnpm build`; `final` como usuário `node`, código do root só de leitura,
  `.next` do `node`). Sem segredo e sem variável do app no build; sem `HEALTHCHECK` na imagem, porque o worker usa a
  mesma imagem e não serve `/api/saude`.
- `.dockerignore`: `.env*` (menos `.env.example`), `.git`, `.github`, `node_modules`, `.next`, relatórios de teste,
  `docs`, `Dockerfile` e os compose.
- `docker-compose.hml.yml`: `db` (`postgres:16-alpine`, `POSTGRES_USER: migrator`, `POSTGRES_DB: orquestrador`,
  `scripts/hml/criar-papeis.sql` no `docker-entrypoint-initdb.d`, healthcheck `pg_isready -h 127.0.0.1`), `app`
  (`pnpm start:hml`, `SEED_FICTICIO: "1"`, publicado só em `127.0.0.1:${HML_PORTA:-3200}:3101`, healthcheck em
  `/api/saude`) e `worker` (`pnpm worker`, sobe depois da saúde do app). Só valores fictícios escritos no arquivo, sem
  `.env`; `BETTER_AUTH_URL` em `http://127.0.0.1:${HML_PORTA}`, que o `env.ts` aceita por ser loopback. Fecha a C-35.
- `.env.example`: só nomes, agrupados por onde valem.
- `docs/operacao/deploy.md`: fluxo da entrega, os três serviços do Easypanel (uma réplica de cada; porta do app só pelo
  Traefik, B-03), variáveis por nome e por serviço, rotação (inclusive o efeito do `BETTER_AUTH_SECRET` sobre o 2FA),
  primeira publicação, deploy com migration (backup → migrate → deploy), rollback passo a passo nos dois caminhos,
  homologação com acesso restrito e `SEED_FICTICIO` nunca em produção (M-07), conferência pós-deploy, alertas mínimos
  e pendências do pipeline.

### Resultado das verificações

| Verificação | Resultado |
|---|---|
| `docker build` local | passou; imagem `ws-orquestrador-demandas:local` com **1,74 GB em disco e 426 MB comprimidos** (`docker image ls`) |
| `construir.mjs homologar` | **ok**: subiu em `http://127.0.0.1:3200`, `/api/saude` respondeu 200, e2e com **126 passed**, projeto e volumes removidos (`conferencias/homologar.json`, sha `049d2c9`) |
| `construir.mjs ensaiar-rollback` | **ok**: `primeira_publicacao: true`, `alteram_dado: false`; migrations da main: nenhuma alterada; 7 migrations novas, nenhuma altera dado existente; a main não tem `docker-compose.hml.yml`, então não há versão para onde voltar e a saída **não traz `volta_sem_restaurar`** |
| `pnpm lint` | limpo |
| `pnpm typecheck` | limpo |
| `.env.example` × código | toda variável do `grep` de `process.env` em `src` está no arquivo (`SENTRY_DSN`, `LOG_LEVEL`, `NODE_ENV`, `NEXT_RUNTIME`, e as dos esquemas de `env.ts` e `env-worker.ts`: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL`, `CABECALHO_IP_CLIENTE`, `RETENCAO_TEXTO_BRUTO_DIAS`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `EMAIL_REMETENTE`, `EMAIL_AVISO_DECISAO`), mais as dos scripts (`DATABASE_URL_MIGRATOR`, `SEED_FICTICIO`, `PORT`) e as do e2e (`BASE_URL`, `CI`) em comentário |
| Versão | `package.json` em 0.1.0; a `main` não tem `package.json`, então 0.1.0 é maior |

O e2e da homologação roda com `NODE_ENV=production` no `next start` da imagem, então o C-19 (`no-store` e CSP sem
`'unsafe-eval'`) passou com `BASE_URL`, como o reteste pediu.

### Três falhas da imagem achadas pela homologação, já corrigidas no `Dockerfile`

1. O pnpm 12 baixa o binário nativo no primeiro uso, para dentro do `COREPACK_HOME`; como `node`, a pasta é só de
   leitura (`EACCES`). Agora o `pnpm --version` roda no estágio `base`, como root, e um `RUN pnpm --version` como `node`
   no estágio final confere que nada é baixado.
2. O `pnpm-lock.yaml` e o `pnpm-workspace.yaml` estão com modo 600 no disco; o `COPY` do estágio final usa `--chmod=644`.
3. Antes de cada `pnpm <script>`, o pnpm 12 refaz os atalhos de `node_modules/.bin` (falha como `node`) e consulta o
   registro na rede. No estágio final, `pnpm_config_verify_deps_before_run=false` e `pnpm_config_update_notifier=false`.
   O `PNPM_HOME=/pnpm` fixa o store no mesmo caminho para qualquer usuário.

Para achar a 1 e a 3, um `RUN` provisório de diagnóstico, com URLs de banco inexistentes e segredo fictício, ficou no
`Dockerfile` durante quatro builds e foi tirado antes do build final.

## Decisões tomadas

- O `deploy.yml` chama o `ci.yml` por `workflow_call` e o `ci.yml` não roda em push: o commit da `main` passa pelo CI
  inteiro antes de publicar, sem rodar duas vezes.
- Webhook só sem migration nova: a produção precisa de backup → migrate → deploy (ADR-12), e o CLAUDE.md da VPS pede
  confirmação antes de migration. Disparar o Easypanel sobre um banco não migrado deixaria a saúde em 503.
- Na dúvida (sem `before` ou commit anterior ausente), o `deploy.yml` trata como migration nova e não dispara.
- Docker CLI e `gh` em vez de `docker/login-action`, `docker/build-push-action`, `gitleaks-action` e
  `delete-package-versions`: são menos actions de terceiros para fixar e auditar, e o `gitleaks-action` pede licença
  em conta de organização.
- `--provenance=false --sbom=false` na publicação: um manifesto por versão, para a limpeza das 2 mais recentes não
  apagar um pedaço da versão atual.
- Instalação completa no estágio final: `pnpm worker`, `pnpm db:migrate`, `pnpm start:hml` e os scripts de conta rodam
  por `tsx`, que está em `devDependencies`. Mudar isso exige mexer no `package.json`, que não é desta etapa (pendência).
- Sem `HEALTHCHECK` na imagem: no Swarm, o worker apareceria como não saudável e seria reiniciado sem parar.
- Worker com `build: .` no compose, sem `image:` fixo: evita o compose tentar baixar uma imagem local e evita colisão
  de tag entre o projeto `hml-` e o `rbk-` do ensaio.
- Na homologação, o worker sobe só depois da saúde do app, porque o esquema do pg-boss nasce na migration do `start:hml`.
- Valores fictícios de baixa entropia no compose: o padrão técnico pede os valores no arquivo, e assim o gitleaks tem
  menos chance de acusar falso positivo.
- Rollback em dois caminhos: a saúde compara a última migration do banco com o journal da própria imagem, então
  depois de migration nova a versão anterior só volta com o backup restaurado.
- Actions fixadas por versão (`@v5`), com a pendência do SHA: a lista **Pode** não tem como consultar o SHA, e o
  maestro mandou não inventar. A versão v5 roda em Node 24 (a v4 roda em Node 20).

## Pendências

- Para Fabiano ou o maestro (A-05, sem isso a A-05 não fecha por inteiro): fixar por SHA completo `actions/checkout@v5`
  (5 usos no `ci.yml` e 1 no `deploy.yml`) e `actions/setup-node@v5` (3 usos no `ci.yml`), e fixar por digest a imagem
  `ghcr.io/gitleaks/gitleaks:v8.28.0`. Confirmar também se a tag v8.28.0 é a mais recente. Esta etapa não tem como
  consultar o GitHub ou o registro pela lista **Pode**, e o maestro mandou não inventar.
- Para a `documentacao-tecnica` (10): o `CHANGELOG.md` com a seção `## 0.1.0` não existe, e o `verificar` da P3 exige
  esse arquivo. Ele está fora da lista **Pode** desta etapa. O README também não existe.
- Para o maestro: comandos fora da letra da lista **Pode**, todos só de leitura ou dentro do que ela permite:
  - três `ls` no início, para listar as pastas;
  - `grep` e `docker build` com caminho absoluto no lugar de `src` e de `.`, porque o Bash começa na estruturaAutonoma
    e não troca de pasta;
  - três builds com `--progress=plain`.

  O `conferir` deve recusar esses itens, e eles estão declarados abaixo como rodaram.
- Para o maestro: `docker-compose.hml.yml` está em **Entrega**, mas não na lista de edição do **Pode**. Foi criado por
  estar na Entrega.
- Para o maestro: a pasta `conferencias/`, gravada pelo `homologar` e pelo `ensaiar-rollback`, está sem commit, junto
  com os arquivos desta entrega.
- Para Fabiano (configuração, fora do /construir; detalhes no `deploy.md`, seção 2):
  - os segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER` no GitHub;
  - a credencial `read:packages` do GHCR no Easypanel;
  - acesso **Admin** das Actions do repositório ao pacote no GHCR, para a limpeza de versões. Sem isso, o último passo
    do `deploy.yml` fica vermelho depois de publicar.
- Para o `seguranca-aplicacao`: a primeira execução do gitleaks pode acusar as senhas fictícias que já existem
  (`scripts/seed-ficticio.ts`, `scripts/hml/criar-papeis.sql`, `e2e/servidor.ts`, `docker-compose.*.yml`). A triagem é
  dele, e nada entra em lista de exceção sem essa revisão.
- Para o `tech-lead` (backlog): imagem de 1,74 GB por levar as `devDependencies`. Compilar o worker, a migration e os
  scripts no build (e tirar o `tsx` do caminho de produção) permitiria `pnpm install --prod` no estágio final.
- Para Fabiano na P3: as médias M-01 a M-07 e as 5 moderadas do audit seguem como o 08 registrou. A M-07 e a B-03
  ficam com controle operacional no `deploy.md` (`SEED_FICTICIO` nunca em produção; porta só pelo Traefik).

## Comandos executados

- `ls -la /home/deploy/servidor/projetos/ws-orquestrador-demandas /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261022-0001-v1` — fora da lista Pode, só leitura; repositório sem `.github`, `Dockerfile` e `CHANGELOG.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo do pedido, árvore limpa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff main HEAD -- package.json CHANGELOG.md` — `package.json` novo no ramo (0.1.0), sem CHANGELOG
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -5 main` — main só com o commit inicial
- `ls /home/deploy/servidor/projetos/estruturaAutonoma/ferramentas/construir` — fora da lista Pode, só leitura
- `ls /home/deploy/servidor/projetos/estruturaAutonoma/ferramentas/construir/lib` — fora da lista Pode, só leitura
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only main HEAD -- scripts e2e src/app/api src/lib src/worker test/apoio drizzle.config.ts next.config.ts playwright.config.ts docker-compose.dev.yml .gitignore pnpm-workspace.yaml src/db` — lista dos arquivos lidos
- `grep -rn "process.env" src` — falhou: a pasta do Bash é a estruturaAutonoma
- `grep -rn "process.env" /home/deploy/servidor/projetos/ws-orquestrador-demandas/src` — caminho absoluto; variáveis conferidas com o `.env.example`
- `git log --name-only --format=%h -- "*.yml" "*.yaml"` — na estruturaAutonoma, sem workflow para copiar SHA
- `docker build -t ws-orquestrador-demandas:local /home/deploy/servidor/projetos/ws-orquestrador-demandas` — passou (primeira versão do Dockerfile)
- `docker image ls ws-orquestrador-demandas` — 1,65 GB em disco, 401 MB comprimidos (primeira versão)
- `node /home/deploy/servidor/projetos/estruturaAutonoma/ferramentas/construir/construir.mjs homologar DEC-DEM-20261022-0001-v1` — falhou: o app saiu com 1
- `docker build --progress=plain -t ws-orquestrador-demandas:local /home/deploy/servidor/projetos/ws-orquestrador-demandas` — falhou de propósito na conferência como node: `EACCES` no COREPACK_HOME
- `docker build --progress=plain -t ws-orquestrador-demandas:local /home/deploy/servidor/projetos/ws-orquestrador-demandas` — falhou: `pnpm-workspace.yaml` com modo 600
- `docker build --progress=plain -t ws-orquestrador-demandas:local /home/deploy/servidor/projetos/ws-orquestrador-demandas` — passou
- `node /home/deploy/servidor/projetos/estruturaAutonoma/ferramentas/construir/construir.mjs homologar DEC-DEM-20261022-0001-v1` — falhou: o app saiu com 1
- `docker build -t ws-orquestrador-demandas:local /home/deploy/servidor/projetos/ws-orquestrador-demandas` — diagnóstico: `ERR_PNPM_PACKAGE_MANAGER_REMOVE_MODULES_DIR` no `pnpm start:hml` como node
- `docker build -t ws-orquestrador-demandas:local /home/deploy/servidor/projetos/ws-orquestrador-demandas` — diagnóstico: o mesmo erro com e sem `NODE_ENV`
- `docker build -t ws-orquestrador-demandas:local /home/deploy/servidor/projetos/ws-orquestrador-demandas` — diagnóstico com `PNPM_HOME`: `ERR_PNPM_CMD_SHIM_CHMOD`
- `docker build -t ws-orquestrador-demandas:local /home/deploy/servidor/projetos/ws-orquestrador-demandas` — diagnóstico: `pnpm_config_verify_deps_before_run=false` resolve
- `docker build -t ws-orquestrador-demandas:local /home/deploy/servidor/projetos/ws-orquestrador-demandas` — passou (Dockerfile final, sem diagnóstico)
- `node /home/deploy/servidor/projetos/estruturaAutonoma/ferramentas/construir/construir.mjs homologar DEC-DEM-20261022-0001-v1` — ok: saúde 200, e2e 126 passed, volumes removidos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only main HEAD -- docs/operacao docs/manual-tecnico README.md CHANGELOG.md` — nada: sem documentação de operação anterior
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `node /home/deploy/servidor/projetos/estruturaAutonoma/ferramentas/construir/construir.mjs ensaiar-rollback DEC-DEM-20261022-0001-v1` — ok: `primeira_publicacao: true`, `alteram_dado: false`, sem `volta_sem_restaurar`
- `docker image ls ws-orquestrador-demandas` — 1,74 GB em disco, 426 MB comprimidos (imagem final)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — novos: `.dockerignore`, `.env.example`, `.github/`, `Dockerfile`, `docker-compose.hml.yml`, `docs/operacao/`, `conferencias/`

## Critério de pronto atendido

- [x] o CI roda lint, typecheck, test e, se houver tela, e2e
- [x] `docker build` local passa (comando e tamanho da imagem na entrega)
- [x] `.env.example` tem toda variável lida pelo código (conferido com `grep -rn "process.env" src`)
- [x] o rollback está descrito passo a passo
- [x] nenhum arquivo tem segredo
- [x] nenhuma imagem foi publicada e nenhum webhook foi chamado
- [x] `deploy.yml` só dispara em `push` na `main`; nenhum workflow publica imagem nem chama webhook em outro ramo ou em `pull_request`
- [x] (09) `docker-compose.hml.yml` existe e `construir.mjs homologar <DEC-id>` passa (resultado na entrega)
- [x] (09) `construir.mjs ensaiar-rollback <DEC-id>` passa (resultado na entrega, com `volta_sem_restaurar` e `alteram_dado`)
