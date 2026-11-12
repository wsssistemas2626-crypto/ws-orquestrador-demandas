---
pedido: DEC-DEM-20261112-0019-v1
etapa: 05-entrega
agente: devops-sre
leu: [contrato-passagem.md, padrao-tecnico.md (seção 9), pedido.json, 02-tech-lead.md, 03-engenheiro-backend.md, 04-maestro.md, 04-seguranca-aplicacao.md, DEC-DEM-20261111-0016-v1/09-devops-sre.md (formato), DEC-DEM-20261104-0014-v1/05-devops-sre.md (formato), .github/workflows/ci.yml, .github/workflows/deploy.yml, Dockerfile, docker-compose.hml.yml, .env.example, docs/operacao/deploy.md]
status: pronto
proximo: documentacao-tecnica
devolvido_para: null
---
## Entrega

A 0.3.1 não mexe no pipeline nem na imagem. A base é a `main` em `d49de53` (merge do PR #17, 0.3.0). O
`git diff --stat main...HEAD` restrito a `drizzle`, `.github`, `Dockerfile`, `.dockerignore`, `docker-entrypoint.sh`,
`docker-compose.hml.yml`, `.env.example`, `src/lib/env.ts`, `src/lib/env-worker.ts`, `pnpm-lock.yaml`,
`pnpm-workspace.yaml`, `next.config.ts` e `playwright.config.ts` mostra só o `package.json` (a versão 0.3.1). Não há
migration, dependência, variável nem serviço novo.

O que muda para a entrega é a situação da produção. A 0.3.0 foi mergeada e não foi publicada, e a produção está na
0.2.0. Por isso a publicação é conjunta, 0.2.0 → 0.3.1, e leva a migration `0007` da 0.3.0.

Não alterei `ci.yml`, `deploy.yml`, `Dockerfile`, `.dockerignore`, `docker-compose.hml.yml` nem `.env.example`. Só
`docs/operacao/deploy.md` mudou: 132 linhas incluídas e 47 tiradas.

### Verificações

| Verificação | Resultado |
|---|---|
| CI (`ci.yml`) | Dispara em `pull_request` e `workflow_call`. Roda `pnpm install --frozen-lockfile`, lint, typecheck, test (Testcontainers), e2e (Playwright contra o build de produção), `pnpm audit --prod --audit-level high`, gitleaks e `docker build` sem publicar. Não publica imagem, não usa segredo e não chama webhook. Igual à `main` |
| Deploy (`deploy.yml`) | Dispara só em `on: push: branches: [main]`. O job `publicar` tem `if: github.event_name == 'push' && github.ref == 'refs/heads/main'`. Igual à `main`. **Atenção:** no merge da 0.3.1, o passo "Migration nova neste push?" dá `nova=nao`, porque o push não muda `drizzle/` em relação à 0.3.0. Por isso o `deploy.yml` chamaria os webhooks, se os segredos existissem (ver Decisões) |
| Imagem (`docker build`) | Passou, pelo `docker compose up --build` do `homologar` e do `ensaiar-rollback`, com o mesmo `Dockerfile` e o mesmo contexto. `docker image ls hml-ws-orquestrador-demandas-app`: **1,77 GB em disco, 440 MB de conteúdo**, igual à 0.3.0 |
| Homologação (`construir.mjs homologar`) | `ok: true`. Subiu em `http://127.0.0.1:3200`, e `/api/saude` respondeu 200. **e2e: 271 passed.** O projeto e os volumes foram removidos no fim |
| Ensaio de rollback (`construir.mjs ensaiar-rollback`) | `ok: true`, **`alteram_dado: false`**, **`volta_sem_restaurar: true`**. Nenhuma migration da `main` foi alterada, e não há migration nova. A `main` (0.3.0) respondeu 200 em 190 s. O backup tem 127 KB, impressão `c317a025168aa4db`. A 0.3.1 subiu sobre o banco da `main` e respondeu 200 em 47 s. A 0.3.0 voltou sobre o banco migrado e de novo sobre o backup, com 200 em 18 s. A restauração deixou o banco igual ao backup, com a mesma impressão. A 0.3.1 subiu de novo e respondeu 200 em 44 s. O projeto e os volumes foram removidos no fim |
| Variáveis (`process.env`) | `git diff --stat -G process\.env main...HEAD` saiu vazio: nenhuma linha com `process.env` entrou nem saiu. `env.ts`, `env-worker.ts` e `.env.example` não mudaram, e a lista lida pelo código continua inteira no `.env.example` |
| Segredo | Nenhum arquivo do ramo tem segredo. O `deploy.md` cita variáveis, segredos e tokens só pelo nome. As senhas do `docker-compose.hml.yml` são as fictícias de antes |
| Publicação | Nenhuma imagem publicada e nenhum webhook chamado. Nada foi mexido no Easypanel nem no banco de produção. Não li `.env` |

### `docs/operacao/deploy.md`

- **Seção 1, passo 3:** o limite da detecção de migration. O `deploy.yml` compara o push com o commit anterior da
  `main`, e não com a versão que está no ar. O merge da 0.3.1 dá "sem migration nova" e chamaria os webhooks, o que
  levaria a `0007` à produção sem backup nem migrate.
- **Seção 4, aviso:** passa a valer para a 0.3.0 e a 0.3.1. A 0.3.0 foi mergeada (`d49de53`) e não foi publicada, e
  ela entra junto com a 0.3.1. Antes do merge da 0.3.1, duas coisas têm de estar fora: o "Auto Deploy" e os segredos de
  webhook.
- **Seção 5, "Publicação conjunta 0.2.0 → 0.3.1"**, no lugar da "Publicação da 0.3.0". São 8 passos:
  1. antes do merge:
     - o Auto Deploy desligado;
     - os segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER` ausentes, apagados antes e cadastrados de novo
       só depois do passo 7;
     - as imagens da 0.2.0 rotuladas `:v0.2.0`;
     - o `docker pull` do GHCR funcionando;
  2. snapshot, com o aviso de que hoje ele congela a VPS;
  3. merge. Aqui a execução fica vermelha no passo "Disparar o Easypanel", e isso é o esperado: a imagem já está
     publicada, nenhum webhook foi chamado e a `v0.2.0` continua no GHCR. O passo traz também o que fazer se os
     webhooks forem chamados: o banco ainda não migrou, então dá para seguir para backup e migrate ou voltar para
     `:v0.2.0` sem restaurar;
  4. **backup antes** (`pg_dump --create`, arquivo `...-antes-v0.3.1.sql`);
  5. **a migration `0007` num passo separado**, com a imagem do GHCR do merge da 0.3.1;
  6. **Deploy do `worker` e depois do `app`**, conferindo que o commit montado é o da 0.3.1, e não o `d49de53`;
  7. conferência;
  8. tokens e `orquestrador.json` só depois, com Fabiano, e os segredos de webhook de volta.
- **Seção 6, "Volta da 0.3.1"**, no lugar de "Volta da 0.3.0 para a 0.2.0". Uma tabela decide o destino:
  - **para a 0.3.0, caminho A**, só trocando a imagem para o GHCR `d49de538fab47779e2db7c6371bc6370121f389a`. A volta
    reabre o M-1 a M-5. Com os tokens emitidos, antes de voltar, desligar o `orquestrador.json` e revogar o token
    `awave`. Não existe imagem local da 0.3.0, então essa volta depende da credencial do GHCR no Easypanel. O resultado
    do ensaio deste pedido está na seção;
  - **para a 0.2.0, caminho B**: a volta **exige restaurar o backup** do passo 4. Os passos são os da volta da 0.3.0
    para a 0.2.0, com as imagens locais `:v0.2.0` ou o GHCR `a9fd9b8…`. O ensaio do 0016 (`volta_sem_restaurar: false`)
    continua valendo, porque a 0.3.1 não muda `drizzle/`.
- **Seção 6, registro da 0.2.0:** o ponteiro passa para "Volta da 0.3.1".
- **Seção 10:** o tamanho da imagem, medido de novo na 0.3.1 (igual).
- **Cabeçalho:** o "Atualizado em". O campo "Versão" fica para a `06-documentacao`, como nos pedidos anteriores.

## Decisões tomadas

- Nada muda em `.github/`, `Dockerfile`, `.dockerignore`, `docker-compose.hml.yml` nem `.env.example`. A 0.3.1 muda só
  `src/`, `scripts/`, testes, `e2e/` e a versão, e o diff com a `main` confirma isso.
- O risco do webhook no merge da 0.3.1 ficou no `deploy.md`, e não no `deploy.yml`. O `deploy.yml` não tem como saber
  qual versão está no ar. Uma trava no pipeline seria uma mudança de comportamento fora do escopo de um pedido de
  correção. Por isso a regra virou passo de operação: os segredos ficam ausentes até o passo 7. Hoje eles nem devem
  existir (P16 da publicação, sem confirmação minha), e nesse caso o passo só confere. A proposta de trava fica em
  Pendências.
- A migration da publicação conjunta roda com a imagem do GHCR do merge da 0.3.1, e não com a da 0.3.0. As duas têm a
  mesma `0007`. Com a da 0.3.1, as imagens do backup, do migrate e do Deploy são de um só commit.
- A volta tem dois destinos, e a escolha é de Fabiano. Para a 0.3.0 não se perde dado, mas reabrem os médios. Para a
  0.2.0 é preciso restaurar o backup e perder o que foi gravado depois dele. O ensaio deste pedido prova o primeiro
  (`volta_sem_restaurar: true`), e o do 0016 prova o segundo (`false`, com restauração).
- O `docker build` saiu pelo `homologar` e pelo `ensaiar-rollback`, como no 0016. O Bash do agente roda fora do
  repositório, e `docker build -t ws-orquestrador-demandas:local .` não acharia o contexto. O `compose up --build` usa o
  mesmo `Dockerfile` e o mesmo contexto.
- Conferi as variáveis com `git diff -G process\.env`, e não com `grep -rn "process.env" src`. O `grep` relativo falha
  fora do repositório, e o maestro proibiu `grep` pelo shell.
- Rodei o `homologar` e o `ensaiar-rollback` nesta `05-entrega`, embora os dois itens sejam (09) no contrato. Os dois
  estão na lista **Pode**, sem restrição de etapa. Eles dão a prova do build da imagem e da volta para a 0.3.0, e não
  deixam nada de pé.

## Pendências

- **Para Fabiano, antes do merge da 0.3.1** (deploy.md, seção 5, passo 1):
  - confirmar que os segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER` **não existem** no repositório. Não
    consegui conferir, porque `gh secret list` não está na minha lista Pode;
  - confirmar que o "Auto Deploy" está desligado no `app` e no `worker`;
  - confirmar que as imagens da 0.2.0 foram rotuladas `easypanel/orquestrador/{app,worker}:v0.2.0`;
  - confirmar que o host faz `docker pull` da imagem privada do GHCR.
- **Para Fabiano, na publicação conjunta:** backup antes, a `0007` num passo separado, Deploy do `worker` e depois do
  `app`, e conferência. A volta para a 0.2.0 exige restaurar esse backup. A volta para a 0.3.0 só existe com a
  credencial de leitura do GHCR cadastrada no Easypanel (seção 2), porque não há imagem local da 0.3.0.
- **Portão de dependência:** a `04-reteste` deixou o `pnpm audit --prod` para esta etapa. Ele não está na minha lista
  Pode, e não o rodei. O `pnpm-lock.yaml` não mudou em relação à `main`, e o job `dependencias` do CI do PR roda o
  audit. O maestro confere esse job no PR.
- **Para a `06-documentacao`:** o campo "Versão" do `deploy.md` (0.3.1) e a seção 0.3.1 do `CHANGELOG.md`.
- **Proposta (devops-sre, versão futura):** o `deploy.yml` comparar `drizzle/` com o commit que está em produção, e não
  com o push anterior. Exemplo: uma variável de repositório `COMMIT_EM_PRODUCAO`, atualizada por Fabiano a cada
  publicação. Assim, um merge sem migration depois de uma versão com migration não publicada não chama os webhooks.
- Herdadas, sem mudança: tirar o `--prod` do `pnpm audit` no `ci.yml` (proposta do 0015).
- A pasta `docs/construcao/DEC-DEM-20261112-0019-v1/conferencias/` foi criada pelo `homologar` e pelo
  `ensaiar-rollback`, como no 0016.
- O texto do `pedido.json` não traz instrução fora do escopo. Nada a registrar.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261112-0019-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -12` — topo `4a146a0` (04-reteste)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat d49de53 HEAD` — 63 arquivos, nenhum em `drizzle/`, `.github/` ou `Dockerfile`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat main...HEAD -- drizzle .github Dockerfile .dockerignore docker-entrypoint.sh docker-compose.hml.yml .env.example src/lib/env.ts src/lib/env-worker.ts pnpm-lock.yaml package.json pnpm-workspace.yaml next.config.ts playwright.config.ts` — só o `package.json`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -3 --format=%H%x20%s main` — `d49de538fab47779e2db7c6371bc6370121f389a`, merge do PR #17
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat -G process\.env main...HEAD` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --diff-filter=A --name-only --format=%h -- docs/construcao/*/05-devops-sre.md` — entregas anteriores da etapa
- `node /home/deploy/servidor/projetos/estruturaAutonoma/ferramentas/construir/construir.mjs homologar DEC-DEM-20261112-0019-v1` — `ok: true`, saúde 200, 271 passed, derrubado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — só `docs/operacao/deploy.md`, no meio da edição
- `docker image ls hml-ws-orquestrador-demandas-app` — 1,77 GB em disco, 440 MB de conteúdo
- `node /home/deploy/servidor/projetos/estruturaAutonoma/ferramentas/construir/construir.mjs ensaiar-rollback DEC-DEM-20261112-0019-v1` — `ok: true`, `alteram_dado: false`, `volta_sem_restaurar: true`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — `docs/operacao/deploy.md` e a pasta `conferencias/`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — só `docs/operacao/deploy.md` (132 incluídas, 47 tiradas)

## Critério de pronto atendido

- [x] o CI roda lint, typecheck, test e, se houver tela, e2e
- [x] `docker build` local passa (comando e tamanho da imagem na entrega). Nesta etapa, pelo `compose up --build` do `homologar` e do `ensaiar-rollback`, com o mesmo `Dockerfile`: 1,77 GB em disco e 440 MB de conteúdo (ver Decisões)
- [x] `.env.example` tem toda variável lida pelo código (conferido com `grep -rn "process.env" src`). Nesta etapa, por `git diff -G process\.env`, vazio
- [x] o rollback está descrito passo a passo (deploy.md, seção 6, "Volta da 0.3.1": para a 0.3.0 só trocando a imagem e para a 0.2.0 com o backup restaurado)
- [x] nenhum arquivo tem segredo
- [x] nenhuma imagem foi publicada e nenhum webhook foi chamado
- [x] `deploy.yml` só dispara em `push` na `main`; nenhum workflow publica imagem nem chama webhook em outro ramo ou em `pull_request`
