---
pedido: DEC-DEM-20261111-0016-v1
etapa: 09-entrega
agente: devops-sre
leu: [contrato-passagem.md, padrao-tecnico.md (seções 1 e 9), pedido.json, tarefas.json, 01-analista-requisitos.md (contexto), 02-arquiteto-solucoes.md, 05-tech-lead.md, 08-maestro.md, DEC-DEM-20261110-0015-v1/09-devops-sre.md (formato), docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (T20, V-01, V-02), .github/workflows/ci.yml, .github/workflows/deploy.yml, Dockerfile, docker-compose.hml.yml, .env.example, package.json, drizzle/0007_greedy_wendigo.sql, src/app/api/saude/route.ts, docs/operacao/deploy.md]
status: pronto
proximo: documentacao-tecnica
devolvido_para: null
---
## Entrega

A 0.3.0 não mexe no pipeline nem na imagem. O que muda para a entrega é a migration `0007`: é a primeira versão com
migration desde que o sistema entrou no ar, e a volta para a 0.2.0 **exige restaurar o backup**.

Comparei com a `main` (`a9fd9b8`, 0.2.0). Em `.github`, `Dockerfile`, `.dockerignore`, `docker-entrypoint.sh`,
`docker-compose.hml.yml`, `.env.example`, `src/lib/env.ts`, `src/lib/env-worker.ts`, `pnpm-lock.yaml`,
`pnpm-workspace.yaml` e `next.config.ts`, o `git diff --stat main...HEAD` saiu vazio. Mudaram só `drizzle/` (a `0007`, o
snapshot e o journal) e a versão no `package.json`.

Não alterei `ci.yml`, `deploy.yml`, `Dockerfile`, `.dockerignore`, `docker-compose.hml.yml` nem `.env.example`. Só
`docs/operacao/deploy.md` mudou: 112 linhas incluídas e 5 tiradas.

### Verificações

| Verificação | Resultado |
|---|---|
| CI (`ci.yml`) | Dispara em `pull_request` e `workflow_call`. Roda `pnpm install --frozen-lockfile`, lint, typecheck, test (Testcontainers), e2e (Playwright contra o build de produção, com os tokens do e2e local da T20), `pnpm audit --prod --audit-level high`, gitleaks e `docker build` sem publicar. Não publica, não usa segredo, não chama webhook. Igual à `main` |
| Deploy (`deploy.yml`) | Dispara só em `on: push: branches: [main]`. O job `publicar` tem `if: github.event_name == 'push' && github.ref == 'refs/heads/main'`. Com a `0007` no push, o passo "Migration nova neste push?" dá `nova=sim`: a imagem vai ao GHCR e os webhooks **não** são chamados. Igual à `main` |
| Imagem (`docker build`) | Passou, pelo `docker compose up --build` do `homologar` e do `ensaiar-rollback`, com o mesmo `Dockerfile` (ver Decisões). `docker image ls hml-ws-orquestrador-demandas-app`: **1,77 GB em disco, 440 MB de conteúdo** (eram 1,76 GB e 438 MB na 0.2.0) |
| Homologação (`construir.mjs homologar`) | `ok: true`. Subir: `http://127.0.0.1:3200`. Saúde: `/api/saude` respondeu 200. **e2e: 271 passed**. Derrubar: projeto e volumes removidos |
| Ensaio de rollback (`construir.mjs ensaiar-rollback`) | `ok: true`, **`alteram_dado: false`**, **`volta_sem_restaurar: false`**. Migrations da `main`: nenhuma alterada; novas: 1 (`0007`), sem alterar dado existente. A `main` (0.2.0) subiu em 126 s; backup de 117 KB, impressão `e1a4d9c0ca2a431f`. A 0.3.0 migrou por cima e subiu em 121 s. A 0.2.0 **só voltou com o backup restaurado**, em 11 s; banco igual ao backup, mesma impressão. A 0.3.0 subiu de novo em 44 s. Derrubar: projeto e volumes removidos |
| Variáveis (`process.env`) | `git diff --stat -G process\.env main...HEAD` não lista nenhum arquivo de `src/`. Aparecem só `e2e/integracoes.ts`, `e2e/servidor.ts`, `playwright.config.ts`, dois testes, o plano e uma entrega. A variável nova é a `E2E_ARQUIVO_TOKENS`, que o próprio `playwright.config.ts` põe só sem `BASE_URL` e que ninguém configura (ver Decisões). `env.ts`, `env-worker.ts` e `.env.example` não mudaram, e a lista lida pelo app continua inteira no `.env.example` |
| Segredo | Nenhum arquivo do ramo tem segredo. O `deploy.md` cita variáveis, segredos e tokens só pelo nome. As senhas do `docker-compose.hml.yml` são as fictícias de antes. Os tokens do e2e local nascem num banco descartável e vão para um arquivo 600 fora do repositório |
| Publicação | Nenhuma imagem publicada, nenhum webhook chamado, nada mexido no Easypanel nem em banco de produção. Não li `.env` |

### `docs/operacao/deploy.md`

- **Seção 4, situação em 11/11/2026: a 0.2.0 está no ar.** Registro da publicação de Fabiano, por volta das 17h20
  (Brasília):
  - backup manual `20261111-2012-diario.sql.gz` e imagens locais rotuladas `easypanel/orquestrador/{app,worker}:v0.1.13`
    antes do Deploy;
  - Deploy do `worker` e depois do `app`, origem GitHub, ramo `main`, `a9fd9b8`;
  - saúde em 200, com as duas primeiras chamadas em 503 por pool frio;
  - aceite no computador e no iPhone por volta das 17h40.
- **Seção 4, aviso para a 0.3.0.** Com a origem GitHub no ramo `main`, depois do merge da 0.3.0, qualquer Deploy do `app`
  (ou do `worker`) leva a 0.3.0 e a `0007` junto. Isso vale até para um Deploy feito só para trocar variável. Como a
  imagem não migra ao subir, o `app` ficaria com a saúde em 503. O "Auto Deploy" tem de estar desligado antes do
  merge.
- **Seção 5, "Publicação da 0.3.0"** (novo), em 8 passos:
  1. antes do merge: conferir o Auto Deploy e rotular as imagens da 0.2.0 como `:v0.2.0`;
  2. snapshot, com o aviso de que hoje ele congela a VPS;
  3. merge, que publica no GHCR sem chamar webhook;
  4. backup com `--create`;
  5. migration num passo separado, com a imagem do GHCR do commit do merge. Inclui a janela de 503 da 0.2.0 sobre o
     banco migrado e o que fazer se a migration der erro;
  6. Deploy do `worker` e depois do `app`;
  7. conferência;
  8. tokens só depois, e com Fabiano. Inclui a recomendação da 08 de corrigir M-1 a M-5 numa 0.3.1 antes dos tokens.
- **Seção 6, "Volta da 0.3.0 para a 0.2.0"** (novo), pelo caminho B, com restauração:
  - o que se perde na volta, inclusive as demandas do Awave e os tokens;
  - desligar o `orquestrador.json`; não é preciso revogar os tokens, porque o backup é anterior à emissão;
  - restaurar o `.sql.gz` por `gunzip -c`;
  - trocar a origem para "Docker image" `:v0.2.0` local, ou para o GHCR `a9fd9b82351006eaf9efac61ed4038a392afccdb`;
  - o aviso de não voltar com Deploy pela origem GitHub, porque isso montaria a 0.3.0 de novo;
  - o resultado do ensaio.
- **Seção 6, parágrafo da 0.2.0:** a volta rápida que ficou pronta em 11/11 são as imagens locais `:v0.1.13`, sem
  credencial do GHCR. As versões antigas ganharam o título "Volta das versões anteriores (registro)".
- **Seção 2:** nota de que a produção usa origem GitHub, e não a imagem do GHCR da tabela.
- **Seção 10:** tamanho da imagem medido na 0.3.0.
- **Cabeçalho:** "Atualizado em". O campo "Versão" (0.2.0) fica para a `10-documentacao`, como nos pedidos anteriores.

## Decisões tomadas

- Nada muda em `.github/`, `Dockerfile`, `.dockerignore`, `docker-compose.hml.yml` nem `.env.example`. A 0.3.0 não traz
  variável, serviço nem dependência nova. A `0007` entra na imagem pelo `COPY drizzle`, que já existe. O `deploy.yml`
  já segura os webhooks quando há migration.
- `E2E_ARQUIVO_TOKENS` ficou fora do `.env.example`. Ela não é lida por `src/`, é posta pelo `playwright.config.ts` e não
  se configura. O mesmo critério valeu para a `TEST_WORKER_INDEX` no 0015. Cheguei a acrescentá-la como comentário e
  desfiz: eu não teria como rodar o `pnpm test` dentro do repositório para conferir se algum teste lê o arquivo.
- O `docker build` saiu pelo `homologar` e pelo `ensaiar-rollback`, como no 0012 a 0015. O Bash do agente roda fora
  do repositório, e `docker build -t ws-orquestrador-demandas:local .` não acharia o contexto. O `compose up --build`
  usa o mesmo `Dockerfile` e o mesmo contexto.
- Conferi as variáveis com `git diff -G process\.env`, e não com `grep -rn "process.env" src`: o `grep` relativo falha
  fora do repositório, e o maestro proibiu `grep` pelo shell.
- A migration da 0.3.0 roda com a imagem do GHCR do commit do merge, e não com uma imagem montada pelo Easypanel. Com
  a origem GitHub, o Easypanel só monta a imagem no Deploy, e o Deploy tem de vir **depois** da migration. A imagem do
  GHCR é publicada pelo `deploy.yml` no merge, antes de qualquer Deploy.
- A volta da 0.3.0 usa as imagens locais `:v0.2.0`, rotuladas antes do merge, como Fabiano fez com a `v0.1.13`. O GHCR
  fica como alternativa: a 0.2.0 continua lá depois da publicação da 0.3.0, porque o GHCR guarda as 2 versões mais
  recentes.
- O snapshot fica como decisão de Fabiano na hora, com o aviso. Hoje ele congela a VPS, e a produção está no ar. O
  backup do passo 4 é o que a volta restaura.
- Os médios M-1 a M-5 da 08 não mudam o pipeline. A recomendação de corrigir numa 0.3.1 antes de emitir os tokens entrou
  no passo 8 da publicação, para ficar junto do procedimento.

## Pendências

- **Para o maestro, antes do PR (não bloqueia esta etapa): V-01, V-02 e as medidas do RNF-01 e do RNF-02 na
  homologação** (plano, "Verificação na homologação"; 05-tech-lead).
  - Não rodei nenhuma das quatro. Elas pedem comandos fora da minha lista Pode: subir a homologação e deixá-la de pé,
    `docker compose exec` para emitir os tokens dentro dela, rodar o `buscar-pedidos.mjs` e um `POST` com `curl`.
  - O `homologar` derruba tudo no fim e não emite token. Por isso, contra a homologação, os testes de API das
    integrações (`CA-09.1` e `CP-7` de `e2e/integracoes.spec.ts`) pulam, com o motivo escrito.
  - O que já cobre o contrato: esses dois testes passam no e2e local, contra o build de produção, com tokens reais de
    um banco descartável (T20). O CI do PR os roda.
  - Sem a V-01, o critério preliminar "o `buscar-pedidos.mjs` passa contra a homologação da 0.3.0" fica sem prova. O
    maestro decide se roda a V-01 e a V-02 antes do PR ou se elas ficam só para o teste pela rede interna depois do
    deploy (08, "Para a 09-entrega").
- **Para Fabiano, antes do merge da 0.3.0** (deploy.md, seção 5, passo 1):
  - conferir no painel que o "Auto Deploy" está desligado no `app` e no `worker`. Com a origem GitHub, se estiver
    ligado, o merge publica a 0.3.0 sem a migration;
  - rotular as imagens em uso como `easypanel/orquestrador/{app,worker}:v0.2.0`, para a volta rápida;
  - conferir se o host consegue fazer `docker pull` da imagem privada do GHCR. A migration do passo 5 usa essa imagem.
- **Para Fabiano, na publicação:** backup antes, migration num passo separado, Deploy do `worker` e depois do `app`, e
  conferência (seção 5). A volta para a 0.2.0 exige restaurar esse backup (`volta_sem_restaurar: false`). Tokens de
  produção, `orquestrador.json` e o teste pela rede interna (V01/W16, V02/W17) só depois, e de preferência com a 0.3.1
  dos M-1 a M-5 (08).
- **Para a `10-documentacao`:**
  - o campo "Versão" do `deploy.md` (0.3.0);
  - a entrada no `CHANGELOG.md`;
  - emissão, troca e revogação dos tokens `awave` e `construir` em `docs/operacao/`. Não escrevi essa parte: é tarefa
    da 10 pelo plano (G2), e o `deploy.md` só cita os tokens na publicação e na volta.
- Herdadas, sem mudança: tirar o `--prod` do `pnpm audit` no `ci.yml` (proposta do 0015) e o "Auto Deploy", que segue
  a conferir no painel.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261111-0016-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -12` — topo `227237a` (08-revisao)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat main...HEAD -- drizzle .github Dockerfile .dockerignore docker-entrypoint.sh docker-compose.hml.yml .env.example src/lib/env.ts src/lib/env-worker.ts pnpm-lock.yaml package.json pnpm-workspace.yaml next.config.ts` — só a `0007` (SQL, snapshot e journal) e o `package.json`
- `node /home/deploy/servidor/projetos/estruturaAutonoma/ferramentas/construir/construir.mjs homologar DEC-DEM-20261111-0016-v1` — `ok: true`, saúde 200, 271 passed, derrubado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat -G process\.env main...HEAD` — nenhum arquivo de `src/`; só e2e, `playwright.config.ts`, testes, o plano e uma entrega
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -2 --format=%H%x20%s main` — `a9fd9b82351006eaf9efac61ed4038a392afccdb`, merge do PR #16
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff main...HEAD -- e2e/integracoes.ts playwright.config.ts e2e/servidor.ts` — `E2E_ARQUIVO_TOKENS`, posta pelo `playwright.config.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat main...HEAD -- docs/operacao docs/manual-tecnico CHANGELOG.md scripts docker-compose.hml.yml` — só os scripts de token, o seed e os testes deles
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — só `docs/operacao/deploy.md`, no meio da edição
- `node /home/deploy/servidor/projetos/estruturaAutonoma/ferramentas/construir/construir.mjs ensaiar-rollback DEC-DEM-20261111-0016-v1` — `ok: true`, `alteram_dado: false`, `volta_sem_restaurar: false`
- `docker image ls hml-ws-orquestrador-demandas-app` — 1,77 GB em disco, 440 MB de conteúdo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — `docs/operacao/deploy.md` e a pasta `conferencias/` do `homologar` e do `ensaiar-rollback`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — só `docs/operacao/deploy.md` (112 incluídas, 5 tiradas)

## Critério de pronto atendido

- [x] o CI roda lint, typecheck, test e, se houver tela, e2e
- [x] `docker build` local passa (comando e tamanho da imagem na entrega). Nesta etapa, pelo `compose up --build` do `homologar` e do `ensaiar-rollback`, com o mesmo `Dockerfile`: 1,77 GB em disco e 440 MB de conteúdo (ver Decisões)
- [x] `.env.example` tem toda variável lida pelo código (conferido com `grep -rn "process.env" src`). Nesta etapa, por `git diff -G process\.env`: nenhuma linha de `src/` mudou
- [x] o rollback está descrito passo a passo (deploy.md, seção 6, "Volta da 0.3.0 para a 0.2.0", com restauração do backup)
- [x] nenhum arquivo tem segredo
- [x] nenhuma imagem foi publicada e nenhum webhook foi chamado
- [x] `deploy.yml` só dispara em `push` na `main`; nenhum workflow publica imagem nem chama webhook em outro ramo ou em `pull_request`
- [x] (09) `docker-compose.hml.yml` existe e `construir.mjs homologar <DEC-id>` passa (resultado na entrega)
- [x] (09) `construir.mjs ensaiar-rollback <DEC-id>` passa (resultado na entrega, com `volta_sem_restaurar` e `alteram_dado`)
