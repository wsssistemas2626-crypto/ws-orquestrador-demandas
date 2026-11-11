---
pedido: DEC-DEM-20261110-0015-v1
etapa: 09-entrega
agente: devops-sre
leu: [contrato-passagem.md, padrao-tecnico.md (seções 1 e 9), pedido.json, tarefas.json, 02-arquiteto-solucoes.md, 06-T17-tech-lead.md, 06-T17-qa-automacao.md, 08-maestro.md, DEC-DEM-20261104-0014-v1/05-devops-sre.md, .github/workflows/ci.yml, .github/workflows/deploy.yml, Dockerfile, .dockerignore, docker-compose.hml.yml, .env.example, docs/operacao/deploy.md, playwright.config.ts, e2e/capturas.spec.ts, estruturaAutonoma docs/superpowers/plans/2026-11-10-orquestrador-primeira-publicacao.md, estruturaAutonoma ferramentas/construir/construir.mjs (homologar e ensaiar-rollback), ferramentas/construir/lib/permissoes.mjs, ferramentas/construir/lib/homologacao.mjs]
status: pronto
proximo: documentacao-tecnica
devolvido_para: null
---
## Entrega

A 0.2.0 não mexe no pipeline nem na imagem. Comparei com a `main` local, em `198e97d` (merge do PR #15, 0.1.13). Em
`.github`, `Dockerfile`, `.dockerignore`, `docker-entrypoint.sh`, `docker-compose.hml.yml`, `.env.example`, `drizzle`,
`src/lib/env.ts`, `src/lib/env-worker.ts`, `pnpm-workspace.yaml` e `next.config.ts`, o `git diff --stat main...HEAD`
saiu vazio. Mudaram só estes arquivos que entram na imagem:

- `package.json`: versão 0.2.0 e as duas `@fontsource` 5.3.0;
- `pnpm-lock.yaml`: só as duas fontes;
- `scripts/seed-ficticio.ts` e o teste dele: seed fictício dos e2e novos, que só roda na homologação.

Não alterei `ci.yml`, `deploy.yml`, `Dockerfile`, `.dockerignore`, `docker-compose.hml.yml` nem `.env.example`. Só
`docs/operacao/deploy.md` mudou: 49 linhas incluídas e 6 tiradas.

### Verificações

| Verificação | Resultado |
|---|---|
| CI (`ci.yml`) | Dispara em `pull_request` e `workflow_call`. Roda `pnpm install --frozen-lockfile`, lint, typecheck, test (Testcontainers), e2e (Playwright contra o build de produção, `retries: 0`), `pnpm audit --prod --audit-level high`, gitleaks e `docker build` sem publicar. Não publica, não usa segredo, não chama webhook. Igual à `main` |
| Deploy (`deploy.yml`) | Dispara só em `on: push: branches: [main]`. O job `publicar` tem `if: github.event_name == 'push' && github.ref == 'refs/heads/main'`. Nenhum outro ramo nem `pull_request` publica imagem ou chama webhook. Igual à `main` |
| Imagem (`docker build`) | Passou. O build foi feito pelo `docker compose up --build` do `homologar` e do `ensaiar-rollback`, com o mesmo `Dockerfile` (ver Decisões). `docker image ls hml-ws-orquestrador-demandas-app`: **1,76 GB em disco, 438 MB de conteúdo** (era 1,74 GB e 426 MB na 0.1.7; a diferença são as fontes e o código novo) |
| Homologação (`construir.mjs homologar`) | `ok: true`. Subir: `http://127.0.0.1:3200`. Saúde: `/api/saude` respondeu 200. **e2e: 249 passed**, sem falha nem `flaky`, com `CI=1` (as 9 capturas pulam pelo CV-17). Derrubar: projeto e volumes removidos |
| Ensaio de rollback (`construir.mjs ensaiar-rollback`) | `ok: true`, **`alteram_dado: false`**, **`volta_sem_restaurar: true`**. Migrations da `main`: nenhuma alterada; novas: nenhuma. A `main` (0.1.13) subiu em 173 s; backup de 106 KB, impressão `5928a978d3c8c34c`. A 0.2.0 subiu por cima em 42 s. A 0.1.13 voltou sobre o banco migrado e, de novo, sobre o backup restaurado, em 12 s; banco igual ao backup, mesma impressão. A 0.2.0 subiu de novo em 46 s. Derrubar: projeto e volumes removidos |
| Auditoria sem `--prod` (pedido da 08 e da 04) | **Rodada pelo maestro, não por mim**, em 11/11/2026 por volta das 16h19 UTC: `pnpm audit --audit-level high`, sem `--prod`. Resultado: 5 moderadas, nenhuma alta nem crítica, saída 0. As `devDependencies` que vão na imagem não têm achado alto nem crítico |
| Origem da produção e deploy automático | **Conferido pelo maestro, só lendo.** Os serviços `orquestrador_app` e `orquestrador_worker` usam as imagens `easypanel/orquestrador/app` e `easypanel/orquestrador/worker`, montadas pelo Easypanel a partir do GitHub; o `app` foi atualizado pela última vez em 10/11 às 14h45 UTC. O repositório tem 0 webhooks e nenhum segredo de Actions: `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER` não existem (o P16 da publicação continua pendente). **Conclusão: o merge da 0.2.0 não dispara deploy.** O `deploy.yml` publica a imagem no GHCR e para no passo dos webhooks, sem os segredos |
| Variáveis (`process.env`) | `git diff --stat -G process\.env main...HEAD` não lista nenhum arquivo de `src/`. Só aparecem `e2e/apoio.ts` (`TEST_WORKER_INDEX`, que o Playwright põe em cada worker), `e2e/capturas.spec.ts` (`CI`, já comentada no `.env.example`), o plano e duas entregas. `env.ts`, `env-worker.ts` e `.env.example` não mudaram. A lista lida pelo app continua inteira no `.env.example` |
| Segredo | Nenhum arquivo do ramo tem segredo. O `deploy.md` cita variáveis e segredos só pelo nome. As senhas do `docker-compose.hml.yml` são as fictícias de antes |
| Publicação | Nenhuma imagem publicada, nenhum webhook chamado, nada mexido no Easypanel nem em banco de produção |

### Pendências da 08 e da T17 para esta etapa

- **Testes longos e intermitências (08; 06-T17-tech-lead, 2.3; 06-T17-qa-automacao).** Na homologação, os 249 passaram
  numa rodada só, sem `retries`. Então `decisao.spec.ts:148`, `reflow-t15-qa.spec.ts:105`, `axe-todas.spec.ts:395`,
  `:229` e `:267` ficaram abaixo dos 30 s. O `socket hang up` do `:229` não voltou.
  - O `homologar` devolve só o resumo do Playwright. Não tenho a duração de cada teste, nem como saber se algum passou
    de 24 s.
  - Não mexi em `timeout`, `retries` nem `test.slow()`.
  - A medição por teste fica com o CI do PR: o job `e2e` usa o reporter `list`, que imprime a duração de cada teste no
    log. Ver Pendências.
- **`pnpm audit --audit-level high` sem `--prod` (08; 04):** feito pelo maestro, sem achado alto nem crítico (tabela
  acima).

### `docs/operacao/deploy.md`

- **Seção 6, rollback da 0.2.0** (novo, antes do parágrafo da 0.1.13):
  - a volta é o **caminho A**, para
    `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:198e97db928256fc301071f1bca9966a4de6bed4` (a `v0.1.13`),
    sem restaurar backup;
  - o parágrafo diz por que a 0.2.0 não grava valor novo, e o que volta e o que não se perde na volta;
  - a aba aberta antes da troca pode recusar o envio, e recarregar resolve;
  - com o serviço de origem GitHub, a volta é trocar a origem para a imagem do GHCR, e a credencial de leitura tem de
    estar cadastrada **antes** de publicar. A conferência do maestro mostrou que esse é o caso da produção hoje;
  - o resultado do ensaio desta etapa.
- **Seção 4, passo 5:** o merge da 0.2.0 entra entre os merges sem migration.
- **Seção 10:** tamanho da imagem medido na 0.2.0, nota de que as fontes são `devDependencies` lidas no `next build`, e
  a proposta da auditoria sem `--prod`.
- **Cabeçalho:** "Atualizado em". O campo "Versão" (0.1.13) fica para a `10-documentacao`, como nos pedidos anteriores.

## Decisões tomadas

- Nada muda em `.github/`, `Dockerfile`, `.dockerignore`, `docker-compose.hml.yml` nem `.env.example`. A 0.2.0 só mexe
  na camada visual, não traz variável, migration nem serviço novo, e as fontes entram pelo `pnpm install` que o
  `Dockerfile` já faz.
- O `docker build` saiu pelo `homologar` e pelo `ensaiar-rollback`, e não pelo comando literal da lista. O Bash do
  agente roda fora do repositório, e `docker build -t ws-orquestrador-demandas:local .` não acharia o contexto. O
  `compose up --build` usa o mesmo `Dockerfile` e o mesmo contexto. O tamanho saiu do `docker image ls` da imagem da
  homologação.
- Conferi as variáveis com `git diff -G process\.env` em vez de `grep -rn "process.env" src`, como no 0012 a 0014: o
  `grep` relativo falha fora do repositório, e o maestro pediu para não usar `grep` pelo shell.
- Rodei uma leitura do estado do pedido fora da minha lista Pode; o conferir a barrou, e o maestro registrou o bloqueio
  e a liberação pela regra de 25/10, por ser só leitura.
- A auditoria sem `--prod` foi rodada pelo maestro; registro o resultado dele, não um comando meu.
- O portão do `audit` no `ci.yml` continua com `--prod` nesta entrega. A auditoria sem `--prod` saiu sem alto nem
  crítico, então tirar o `--prod` não deixaria o CI vermelho. Mas a troca muda um portão do pipeline, e o maestro pediu
  que esta volta mexesse só nesta entrega. Fica como proposta (Pendências e `deploy.md`, seção 10).
- Não mudei o `e2e/servidor.ts` para a hipótese do keep-alive do `:229`. O arquivo está fora da minha lista, a falha
  não voltou e a decisão é do `tech-lead` (06-T17-qa-automacao).
- A volta da 0.2.0 vai para a 0.1.13 pelo caminho A. Não há migration, e o ensaio mostrou a 0.1.13 de pé sobre o banco
  que a 0.2.0 usou. Como a produção monta a imagem a partir do GitHub, vale a forma "trocar a origem para a imagem do
  GHCR" da seção 6.
- A conferência visual do "Auto Deploy" no painel não bloqueia: sem webhook no repositório e sem segredo de Actions, o
  merge não tem como chamar o Easypanel.

## Pendências

- **Para Fabiano (não bloqueia):** conferir no painel do Easypanel que o "Auto Deploy" está desligado nos serviços `app`
  e `worker` do projeto `orquestrador`. A conferência do maestro (0 webhooks, nenhum segredo) indica que o merge não
  dispara deploy, mas o botão só se vê no painel.
- **Para Fabiano, antes de publicar a 0.2.0:**
  - cadastrar no Easypanel a credencial de leitura do GHCR (`read:packages`). A produção monta a imagem a partir do
    GitHub, e sem essa credencial a volta para a `v0.1.13` não é rápida (deploy.md, seção 6);
  - conferir em Packages que a tag `198e97db928256fc301071f1bca9966a4de6bed4` existe;
  - os segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER` (P16 da publicação) só entram depois de ele aprovar
    a publicação da 0.2.0. Com eles, cada merge na `main` passa a publicar sozinho.
- **Para o maestro, no CI do PR:** ler no log do job `e2e` a duração de `decisao.spec.ts:148`,
  `reflow-t15-qa.spec.ts:105`, `axe-todas.spec.ts:395`, `:229` e `:267`.
  - Acima de 24 s: pela regra da 06-T17-tech-lead (2.3), devolver ao `engenheiro-frontend` para dividir o `:148`, sem
    subir `timeout` nem `retries`.
  - Se o `:229` repetir o `socket hang up`: decisão do `tech-lead` entre (a) e (b) da 06-T17-qa-automacao.
- **Proposta para um pedido de pipeline:** tirar o `--prod` do `pnpm audit` no `ci.yml`. A imagem leva as
  `devDependencies`, e a auditoria sem `--prod` de 11/11 saiu sem alto nem crítico.
- **Para a `10-documentacao` (e o P18 da publicação):**
  - o campo "Versão" do `deploy.md` (0.2.0) e a entrada no `CHANGELOG.md`;
  - registrar no `deploy.md` como a produção ficou em 10/11:
    - serviços `orquestrador_app` e `orquestrador_worker` com imagens `easypanel/orquestrador/*` montadas a partir do
      GitHub, e não do GHCR;
    - nenhum webhook nem segredo de Actions;
    - pelo registro da publicação, a confirmar no painel: `db` recriado em Postgres 16 e porta do app pela `PORT` do
      Easypanel;
    - a seção 4, que ainda diz "a produção ainda não tem versão no ar".
- Seguem sem mudança no pipeline os médios R-01 a R-04 e os baixos R-05 a R-11 da 08.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -15` — topo `47b14f5` (08-revisao)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6 --grep=09-entrega main` — entregas 09 anteriores (pedido 0001)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -4 --grep=05-entrega main` — entrega 05 do 0014
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -2 --format=%H%x20%s main` — `198e97db928256fc301071f1bca9966a4de6bed4`, merge do PR #15
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat main...HEAD -- drizzle .github Dockerfile .dockerignore docker-entrypoint.sh docker-compose.hml.yml .env.example src/lib/env.ts src/lib/env-worker.ts pnpm-lock.yaml package.json pnpm-workspace.yaml next.config.ts scripts` — só `package.json`, `pnpm-lock.yaml` e o seed fictício com o teste
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat -G process\.env main...HEAD` — nenhum arquivo de `src/`; `e2e/apoio.ts`, `e2e/capturas.spec.ts`, o plano e duas entregas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff main...HEAD -- e2e/apoio.ts` — `TEST_WORKER_INDEX`, do Playwright
- `node /home/deploy/servidor/projetos/estruturaAutonoma/ferramentas/construir/construir.mjs homologar DEC-DEM-20261110-0015-v1` — `ok: true`, 249 passed, saúde 200, derrubado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --shortstat main...HEAD` — 256 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat main...HEAD -- docs/operacao CHANGELOG.md docs/manual-tecnico/10-configuracao-e-scripts.md` — vazio antes da minha edição
- `node /home/deploy/servidor/projetos/estruturaAutonoma/ferramentas/construir/construir.mjs ensaiar-rollback DEC-DEM-20261110-0015-v1` — `ok: true`, `alteram_dado: false`, `volta_sem_restaurar: true`
- `docker image ls hml-ws-orquestrador-demandas-app` — 1,76 GB em disco, 438 MB de conteúdo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — `docs/operacao/deploy.md` e a pasta `conferencias/` gravada pelo `homologar` e pelo `ensaiar-rollback`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — só `docs/operacao/deploy.md` (49 incluídas, 6 tiradas)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — repetido depois de gravar a entrega: igual

## Critério de pronto atendido

- [x] o CI roda lint, typecheck, test e, se houver tela, e2e
- [x] `docker build` local passa (comando e tamanho da imagem na entrega). Nesta etapa, pelo `compose up --build` do `homologar` e do `ensaiar-rollback`, com o mesmo `Dockerfile`: 1,76 GB em disco e 438 MB de conteúdo (ver Decisões)
- [x] `.env.example` tem toda variável lida pelo código (conferido com `grep -rn "process.env" src`). Nesta etapa, por `git diff -G process\.env`: nenhuma linha de `src/` mudou
- [x] o rollback está descrito passo a passo
- [x] nenhum arquivo tem segredo
- [x] nenhuma imagem foi publicada e nenhum webhook foi chamado. O repositório não tem webhook nem segredo de Actions (conferência do maestro), então o merge também não dispara deploy
- [x] `deploy.yml` só dispara em `push` na `main`; nenhum workflow publica imagem nem chama webhook em outro ramo ou em `pull_request`
- [x] (09) `docker-compose.hml.yml` existe e `construir.mjs homologar <DEC-id>` passa (resultado na entrega)
- [x] (09) `construir.mjs ensaiar-rollback <DEC-id>` passa (resultado na entrega, com `volta_sem_restaurar` e `alteram_dado`)
