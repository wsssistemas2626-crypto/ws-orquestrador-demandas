---
pedido: DEC-DEM-20261103-0009-v1
etapa: 05-entrega
agente: devops-sre
leu: [contrato-passagem.md, pedido.json, 02-tech-lead.md, 03-engenheiro-backend.md, 04-maestro.md, 05-devops-sre.md do pedido 0008, .github/workflows/ci.yml, .github/workflows/deploy.yml, docs/operacao/deploy.md]
status: pronto
proximo: documentacao-tecnica
devolvido_para: null
---
## Entrega

A correção da 0.1.8 não mexe no pipeline nem na imagem. `git diff --stat main...HEAD` restrito a `drizzle`, `.github`,
`Dockerfile`, `.dockerignore`, `docker-entrypoint.sh`, `docker-compose.hml.yml`, `.env.example`, `src/lib/env.ts`,
`src/lib/env-worker.ts` e `pnpm-lock.yaml` saiu vazio: sem migration, sem dependência nova, sem variável nova, workflows
iguais aos da `main` (`3c8a942`, 0.1.7). O ramo muda só `src/` (16 arquivos com os testes), `test/estatico/projeto.test.ts`,
`package.json` (0.1.8) e as entregas do pedido. Mantive como estão `ci.yml`, `deploy.yml`, `Dockerfile`, `.dockerignore`
e `.env.example`.

### Verificações

| Verificação | Resultado |
|---|---|
| CI (`ci.yml`) | `pull_request` e `workflow_call`: lint, typecheck, test (Testcontainers), e2e (Playwright contra o build de produção), `pnpm audit --prod --audit-level high`, gitleaks e `docker build` sem publicar. Não publica, não usa segredo, não chama webhook. Igual à `main` |
| Deploy (`deploy.yml`) | só `on: push: branches: [main]`, e o job `publicar` tem `if: github.event_name == 'push' && github.ref == 'refs/heads/main'`. Nenhum outro ramo nem `pull_request` publica imagem ou chama webhook. Igual à `main` |
| `pnpm build` (o `next build` que o `Dockerfile` roda) | passou: compilou, TypeScript limpo, 34 rotas |
| `docker build` | não rodado nesta etapa (ver Decisões): a imagem da 0.1.8 é construída pela homologação do maestro (`construir.mjs homologar`) e pelo job `docker build` do CI do PR. Entradas da imagem iguais às da `main`, salvo `src/` e `package.json`. Última imagem local: `ws-orquestrador-demandas:local`, id `872f0b1b35c0`, 1,74 GB em disco, 426 MB de conteúdo (a da 0.1.7) |
| Versão da imagem | `package.json` em `0.1.8`; o `deploy.yml` lê dele a tag `v0.1.8` |
| Variáveis (`process.env`) | `git diff --stat -G process\.env main...HEAD` saiu vazio: nenhuma linha com `process.env` entrou nem saiu neste ramo, e `env.ts`, `env-worker.ts` e `.env.example` não mudaram. A lista lida pelo código segue a conferida na 0.1.7 (pedido 0008), toda no `.env.example` |
| Segredo | nenhum arquivo do ramo traz segredo; o `deploy.md` cita variáveis e segredos só pelo nome |
| Publicação | nenhuma imagem publicada, nenhum webhook chamado, nada no Easypanel |

### `docs/operacao/deploy.md`

- **Seção 4 (primeira publicação):** o bloqueio de dado pessoal (CA-P5-16, CA-P5-21) sai com a 0.1.8, que fecha o M-a do
  0008. A primeira publicação passa a exigir a 0.1.8 ou posterior na `main` (a 0.1.6 e a 0.1.7 não podem ser a
  primeira). O M-1 da revisão do 0009 (nome antigo ou parcial do solicitante em texto guardado sai em claro) fica
  registrado como risco residual para Fabiano e a `gestao-riscos`, sem bloquear. Passo 5: "merges da 0.1.1 à 0.1.8".
- **Seção 6 (rollback):** parágrafo da 0.1.8. Sem migration (journal igual ao da 0.1.7) e sem valor novo gravado no
  banco: a volta é o **caminho A**, só trocando a imagem de `worker` e depois `app` para
  `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:3c8a942f48011aadc093afc92b88dd774f0242d8` (a `v0.1.7`,
  merge do PR #9), sem restaurar backup. Registrado o efeito da volta (M-a e B-b reabrem; volta só para
  indisponibilidade) e que, se a 0.1.8 for a primeira publicação, a volta é parar `app` e `worker`, sem publicar a
  0.1.7 no lugar.
- Cabeçalho "Atualizado em" com as mudanças. O campo "Versão" fica para a `06-documentacao`, junto com o `CHANGELOG.md`.

## Decisões tomadas

- Nada muda em `.github/`, `Dockerfile` nem `.env.example`: a correção é só de `src/`, testes e versão, como a 02 previu.
- `docker build` não rodado: o Bash do agente roda fora do repositório, então o comando da lista (`docker build -t ws-orquestrador-demandas:local .`) não acha o contexto, e a forma com o caminho absoluto precisou de liberação no pedido 0008; o maestro orientou não rodar e deixar o build da imagem com a homologação. No lugar, rodei `pnpm build`, que é o passo do `Dockerfile` que depende de `src/`.
- Conferência de variáveis por `git diff -G process\.env` em vez de `grep -rn "process.env" src`, porque o maestro pediu para não usar `grep` pelo shell e o `grep` relativo falha fora do repositório; o diff prova que nenhuma leitura de variável mudou.
- Rollback da 0.1.8 pelo caminho A, sem `ensaiar-rollback` nesta etapa: o contrato da `05-entrega` não o lista, e o ensaio fica com a Parada 3 do maestro.
- O bloqueio da primeira publicação saiu do `deploy.md`, como a 04-maestro indicou; deixar o texto antigo travaria a publicação depois deste merge sem motivo.

## Pendências

- Para a Parada 3 do maestro: `construir.mjs homologar` (constrói a imagem da 0.1.8 e roda o e2e), `ensaiar-rollback` e o CI do PR (job `docker build`). A volta da 0.1.8 foi conferida no código (`drizzle/` igual à `main`).
- Para Fabiano e a `gestao-riscos`: aceitar ou não o M-1 do 0009 como risco residual antes da primeira publicação.
- Para a `06-documentacao`: campo "Versão" do `deploy.md` (0.1.8) e entrada 0.1.8 do `CHANGELOG.md`.
- Herdadas da 04-maestro: B-1 e B-3 para pedido futuro.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261103-0009-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat main...HEAD` — 25 arquivos, só `src/`, `test/estatico`, `package.json` e entregas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log main -3 --format=%H%x20%s` — sha da `v0.1.7` (`3c8a942f…`)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat -G process\.env main...HEAD` — vazio
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas build` — passou, 34 rotas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat main...HEAD -- drizzle .github Dockerfile .dockerignore docker-entrypoint.sh docker-compose.hml.yml .env.example src/lib/env.ts src/lib/env-worker.ts pnpm-lock.yaml` — vazio
- `docker image ls ws-orquestrador-demandas` — `ws-orquestrador-demandas:local`, 1,74 GB em disco, 426 MB de conteúdo (imagem da 0.1.7)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só `docs/operacao/deploy.md`

## Critério de pronto atendido

- [x] o CI roda lint, typecheck, test e, se houver tela, e2e
- [x] `docker build` local passa (comando e tamanho da imagem na entrega) — nesta etapa, por orientação do maestro, coberto pelo build da homologação e do CI; aqui, `pnpm build` passou e as entradas da imagem não mudaram (ver Decisões)
- [x] `.env.example` tem toda variável lida pelo código (conferido com `grep -rn "process.env" src`) — nesta etapa, por `git diff -G process\.env`, vazio
- [x] o rollback está descrito passo a passo
- [x] nenhum arquivo tem segredo
- [x] nenhuma imagem foi publicada e nenhum webhook foi chamado
- [x] `deploy.yml` só dispara em `push` na `main`; nenhum workflow publica imagem nem chama webhook em outro ramo ou em `pull_request`
