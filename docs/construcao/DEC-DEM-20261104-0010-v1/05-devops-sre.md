---
pedido: DEC-DEM-20261104-0010-v1
etapa: 05-entrega
agente: devops-sre
leu: [contrato-passagem.md, pedido.json, 02-tech-lead.md, 03-engenheiro-backend.md, 04-maestro.md, 05-devops-sre.md do pedido 0009, .github/workflows/ci.yml, .github/workflows/deploy.yml, docs/operacao/deploy.md]
status: pronto
proximo: documentacao-tecnica
devolvido_para: null
---
## Entrega

A correção da 0.1.9 não mexe no pipeline nem na imagem. `git diff --stat main...HEAD` restrito a `drizzle`, `.github`,
`Dockerfile`, `.dockerignore`, `docker-entrypoint.sh`, `docker-compose.hml.yml`, `.env.example`, `src/lib/env.ts`,
`src/lib/env-worker.ts` e `pnpm-lock.yaml` saiu vazio: sem migration, sem dependência nova, sem variável nova, workflows
iguais aos da `main` (`1d6d897`, 0.1.8). O ramo muda 7 arquivos de código em `src/` (`reduzir-erro.ts`, `sentry.ts`,
`console-saneado.ts`, `rotulos.ts` e as 3 rotas POST de `demandas/[id]`), os testes (`src/` e `test/estatico/`),
`package.json` (0.1.9) e as entregas do pedido: 25 arquivos. Mantive como estão `ci.yml`, `deploy.yml`, `Dockerfile`,
`.dockerignore` e `.env.example`.

### Verificações

| Verificação | Resultado |
|---|---|
| CI (`ci.yml`) | `pull_request` e `workflow_call`: lint, typecheck, test (Testcontainers), e2e (Playwright contra o build de produção), `pnpm audit --prod --audit-level high`, gitleaks e `docker build` sem publicar. Não publica, não usa segredo, não chama webhook. Igual à `main` |
| Deploy (`deploy.yml`) | só `on: push: branches: [main]`, e o job `publicar` tem `if: github.event_name == 'push' && github.ref == 'refs/heads/main'`. Nenhum outro ramo nem `pull_request` publica imagem ou chama webhook. Igual à `main` |
| `pnpm build` (o `next build` que o `Dockerfile` roda) | passou: Next 16.4.1, compilou, TypeScript limpo, 34 rotas mais o proxy |
| `docker build` | não rodado nesta etapa (ver Decisões), como no pedido 0009: a imagem da 0.1.9 é construída pela homologação do maestro (`construir.mjs homologar`) e pelo job `docker build` do CI do PR. As entradas da imagem são as da `main`, salvo `src/` e `package.json`. `docker image ls ws-orquestrador-demandas` não lista imagem local agora (a homologação derruba a sua). Tamanho de referência: 1,74 GB em disco e 426 MB de conteúdo, medido na 0.1.7 (`deploy.md`, seção 10) |
| Versão da imagem | `package.json` em `0.1.9`; o `deploy.yml` lê dele a tag `v0.1.9` |
| Variáveis (`process.env`) | `git diff --stat -G process\.env main...HEAD` saiu vazio: nenhuma linha com `process.env` entrou nem saiu neste ramo, e `env.ts`, `env-worker.ts` e `.env.example` não mudaram. A lista lida pelo código segue a conferida na 0.1.7 (pedido 0008), toda no `.env.example` |
| Segredo | nenhum arquivo do ramo traz segredo; o `deploy.md` cita variáveis e segredos só pelo nome |
| Publicação | nenhuma imagem publicada, nenhum webhook chamado, nada no Easypanel |

### `docs/operacao/deploy.md`

- **Seção 6 (rollback):** parágrafo da 0.1.9, antes do da 0.1.8. Sem migration (journal igual ao da 0.1.8) e sem valor
  novo gravado no banco: a volta é o **caminho A**, só trocando a imagem de `worker` e depois `app` para
  `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:1d6d8976f6ca317fe33caf6a8358f37d8b5c0c1d` (a `v0.1.8`,
  merge do PR #10), sem restaurar backup. Registrado o que reabre na volta: o filtro de classe e de `code` do erro (B-1 do
  0009), o 500 com o artefato gravado e a versão duplicada na nova tentativa (B-3 do 0009), o envio duplo ao Sentry no
  route handler (B-a do 0008) e o histórico sem rótulo de `demanda_final`. Por isso a volta é só para
  indisponibilidade. Se a 0.1.9 for a primeira publicação, a volta é parar `app` e `worker`, sem publicar a 0.1.8 no
  lugar dela.
- **Seção 4, passo 5:** "merges da 0.1.1 à 0.1.9". O requisito "0.1.8 ou posterior" da primeira publicação continua
  valendo, e a 0.1.9 o cumpre.
- **Seção 8, passo 2:** o que muda na conferência do log e do Sentry desde a 0.1.9. A classe fora da regra sai como
  `Error` no Sentry e como `desconhecido` no log, o `code` com 10 ou mais dígitos não aparece, e o mesmo objeto de erro
  vai uma vez só ao Sentry.
- Cabeçalho "Atualizado em" com as mudanças. O campo "Versão" fica para a `06-documentacao`, junto com o `CHANGELOG.md`.

## Decisões tomadas

- Nada muda em `.github/`, `Dockerfile` nem `.env.example`: a correção mexe só em `src/`, nos testes e na versão, como a 02 previu.
- Não rodei o `docker build`. O Bash do agente roda fora do repositório, e o comando da lista (`docker build -t ws-orquestrador-demandas:local .`) não acha o contexto. A forma com caminho absoluto precisa de liberação, e no pedido 0009 o maestro orientou deixar o build da imagem com a homologação. No lugar dele, rodei `pnpm build`, que é o passo do `Dockerfile` que depende de `src/`.
- Conferi as variáveis com `git diff -G process\.env` em vez de `grep -rn "process.env" src`. O `grep` relativo falha fora do repositório, e o maestro pediu para não usar `grep` pelo shell. O diff vazio prova que nenhuma leitura de variável mudou.
- Rollback da 0.1.9 pelo caminho A: `drizzle/` não muda, e nenhum dos cinco itens grava valor novo. O `demanda_final` já é gravado desde a 0.1.5, e a 0.1.8 o lê.
- Não rodei o `ensaiar-rollback` nesta etapa: o contrato da `05-entrega` não o lista, e o ensaio fica com a Parada 3 do maestro.
- Acrescentei a nota da seção 8 porque o filtro de classe e a deduplicação mudam o que Fabiano vê no Sentry ao conferir um deploy. Sem a nota, um `Error` genérico ou a falta de um evento repetido pareceriam defeito.

## Pendências

- Para a Parada 3 do maestro: `construir.mjs homologar` (constrói a imagem da 0.1.9 e roda o e2e), `ensaiar-rollback` e o CI do PR (job `docker build`). Conferi a volta da 0.1.9 no código: `drizzle/` é igual ao da `main`.
- Para a `06-documentacao`: o campo "Versão" do `deploy.md` (0.1.9) e a entrada 0.1.9 do `CHANGELOG.md` (texto na Pendência da 03).
- Herdadas da 04-maestro: B-2, B-3 e B-4 vão para o pedido 0011; B-1, B-5 e a convenção de `CLASSES_DO_PROJETO` ficam para um pedido futuro.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261104-0010-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -15` — `7da84e2` (04-revisao) no topo; `1d6d897` é a base
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat main...HEAD` — 25 arquivos, só `src/`, `test/estatico`, `package.json` e entregas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat main...HEAD -- drizzle .github Dockerfile .dockerignore docker-entrypoint.sh docker-compose.hml.yml .env.example src/lib/env.ts src/lib/env-worker.ts pnpm-lock.yaml` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat -G process\.env main...HEAD` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log main -3 --format=%H%x20%s` — sha da `v0.1.8` (`1d6d8976…`)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas build` — passou, 34 rotas
- `docker image ls ws-orquestrador-demandas` — nenhuma imagem local
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só `docs/operacao/deploy.md`

## Critério de pronto atendido

- [x] o CI roda lint, typecheck, test e, se houver tela, e2e
- [x] `docker build` local passa (comando e tamanho da imagem na entrega) — nesta etapa, como no pedido 0009, a homologação e o CI cobrem o build da imagem; aqui, `pnpm build` passou, e as entradas da imagem não mudaram (ver Decisões)
- [x] `.env.example` tem toda variável lida pelo código (conferido com `grep -rn "process.env" src`) — nesta etapa, por `git diff -G process\.env`, vazio
- [x] o rollback está descrito passo a passo
- [x] nenhum arquivo tem segredo
- [x] nenhuma imagem foi publicada e nenhum webhook foi chamado
- [x] `deploy.yml` só dispara em `push` na `main`; nenhum workflow publica imagem nem chama webhook em outro ramo ou em `pull_request`
