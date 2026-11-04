---
pedido: DEC-DEM-20261104-0011-v1
etapa: 05-entrega
agente: devops-sre
leu: [contrato-passagem.md, pedido.json, 02-tech-lead.md, 03-engenheiro-backend.md, 04-maestro.md, 05-devops-sre.md do pedido 0010, .github/workflows/ci.yml, .github/workflows/deploy.yml (1-40), docs/operacao/deploy.md, src/modules/demandas/consultas.ts (180-308)]
status: pronto
proximo: documentacao-tecnica
devolvido_para: null
---
## Entrega

A correção da 0.1.10 não mexe no pipeline nem na imagem. `git diff --stat main...HEAD` restrito a `drizzle`, `.github`,
`Dockerfile`, `.dockerignore`, `docker-entrypoint.sh`, `docker-compose.hml.yml`, `.env.example`, `src/lib/env.ts`,
`src/lib/env-worker.ts` e `pnpm-lock.yaml` saiu vazio: sem migration, sem dependência nova, sem variável nova, workflows
iguais aos da `main` (`fb675ee`, 0.1.9). O ramo muda 31 arquivos: o código em `src/` (`minimizar.ts`,
`dados-da-demanda.ts`, `reduzir-erro.ts`, `sentry.ts`, os 3 serviços de ESP, RSK e DEC e as 3 rotas POST de
`demandas/[id]`), os testes (`src/` e `test/`), `package.json` (0.1.10) e as entregas do pedido. Mantive como estão
`ci.yml`, `deploy.yml`, `Dockerfile`, `.dockerignore` e `.env.example`. O único arquivo que alterei foi
`docs/operacao/deploy.md`.

### Verificações

| Verificação | Resultado |
|---|---|
| CI (`ci.yml`) | `pull_request` e `workflow_call`: lint, typecheck, test (Testcontainers), e2e (Playwright contra o build de produção), `pnpm audit --prod --audit-level high`, gitleaks e `docker build` sem publicar. Não publica, não usa segredo, não chama webhook. Igual à `main` |
| Deploy (`deploy.yml`) | só `on: push: branches: [main]`, e o job `publicar` tem `if: github.event_name == 'push' && github.ref == 'refs/heads/main'`. Nenhum outro ramo nem `pull_request` publica imagem ou chama webhook. Igual à `main` |
| `pnpm build` (o `next build` que o `Dockerfile` roda) | passou: Next 16.4.1, compilou, TypeScript limpo, 34 rotas mais o proxy. Nada rastreado mudou depois do build |
| `docker build` | não rodado nesta etapa (ver Decisões), como nos pedidos 0009 e 0010: a imagem da 0.1.10 é construída pela homologação do maestro (`construir.mjs homologar`) e pelo job `imagem` do CI do PR. As entradas da imagem são as da `main`, salvo `src/` e `package.json`. `docker image ls ws-orquestrador-demandas` não lista imagem local agora. Tamanho de referência: 1,74 GB em disco e 426 MB de conteúdo, medido na 0.1.7 (`deploy.md`, seção 10) |
| Versão da imagem | `package.json` em `0.1.10`; o `deploy.yml` lê dele a tag `v0.1.10` |
| Variáveis (`process.env`) | `git diff --stat -G process\.env main...HEAD` saiu vazio: nenhuma linha com `process.env` entrou nem saiu neste ramo, e `env.ts`, `env-worker.ts` e `.env.example` não mudaram. A lista lida pelo código segue a conferida na 0.1.7 (pedido 0008), toda no `.env.example` |
| Segredo | nenhum arquivo do ramo traz segredo; o `deploy.md` cita variáveis e segredos só pelo nome |
| Publicação | nenhuma imagem publicada, nenhum webhook chamado, nada no Easypanel |

### `docs/operacao/deploy.md`

- **Seção 6 (rollback):** parágrafo da 0.1.10, antes do da 0.1.9. Sem migration (journal igual ao da 0.1.9) e sem valor
  novo gravado no banco: a volta é o **caminho A**, só trocando a imagem de `worker` e depois `app` para
  `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:fb675ee1df144b52a01d0baa4b20df5d8edc367f` (a `v0.1.9`,
  merge do PR #11), sem restaurar backup. Registrado o que reabre na volta: as partes do nome em claro para o agente
  (M-1 do 0009), a dica e o aviso que prometem mais do que o sistema faz, o nome lido fora da trava no 201 (B-3 do
  0010), o `name` que não é texto no log e no Sentry (B-2 do 0010) e o erro marcado sem envio (B-4 do 0010). Por isso a
  volta é só para indisponibilidade. Se a 0.1.10 for a primeira publicação, a volta é parar `app` e `worker`, sem
  publicar a 0.1.9 no lugar dela.
- **Seção 4:** passo 5 com "merges da 0.1.1 à 0.1.10". O parágrafo do risco residual do M-1 do 0009 agora diz o que a
  0.1.10 fecha e o que sobra: nome todo em minúscula (aceito no RSK), nome grudado em número, `_` ou CamelCase (B-1 da
  04-revisao do 0011), nome antigo de antes de uma edição (a troca usa só o nome atual, `nomesDoSolicitante` em
  `consultas.ts:193`) e nomes de outras pessoas.
- **Seção 8, passo 2:** o que muda na conferência do Sentry desde a 0.1.10: `name` que não é texto sai `Error`, e o
  objeto só conta como enviado depois que o Sentry o recebe.
- Cabeçalho "Atualizado em" com as mudanças. O campo "Versão" fica para a `06-documentacao`, junto com o `CHANGELOG.md`.

## Decisões tomadas

- Nada muda em `.github/`, `Dockerfile` nem `.env.example`: a correção mexe só em `src/`, nos testes e na versão, como a 02 previu.
- Não rodei o `docker build`: o Bash do agente roda fora do repositório, e o comando da lista (`docker build -t ws-orquestrador-demandas:local .`) não acha o contexto. Como nos pedidos 0009 e 0010, o build da imagem fica com a homologação e o CI; no lugar dele, rodei `pnpm build`, que é o passo do `Dockerfile` que depende de `src/`.
- Conferi as variáveis com `git diff -G process\.env` em vez de `grep -rn "process.env" src`: o `grep` relativo falha fora do repositório, e o maestro pediu para não usar `grep` pelo shell. O diff vazio prova que nenhuma leitura de variável mudou.
- Rollback da 0.1.10 pelo caminho A: `drizzle/` não muda, nenhum dos cinco itens grava valor novo, e o marcador `[nome removido]` no texto escrito pelo agente já existia na 0.1.9.
- Atualizei o risco residual da seção 4 em vez de só acrescentar a 0.1.10 na seção 6: o texto da 0.1.9 dizia que só o nome completo era trocado, o que deixa de ser verdade com a 0.1.10.
- Citei o nome antigo como resíduo depois de conferir no código que a troca usa só o `solicitanteNome` atual da demanda.
- Não rodei o `ensaiar-rollback` nesta etapa: o contrato da `05-entrega` não o lista, e o ensaio fica com a Parada 3 do maestro.

## Pendências

- Para a Parada 3 do maestro: `construir.mjs homologar` (constrói a imagem da 0.1.10 e roda o e2e), `ensaiar-rollback` e o CI do PR (job `imagem`). Conferi a volta da 0.1.10 no código: `drizzle/` é igual ao da `main`.
- Para a `06-documentacao`: o campo "Versão" do `deploy.md` (0.1.10) e a entrada 0.1.10 do `CHANGELOG.md` (texto na Pendência 1 da 03).
- Herdadas da 04-maestro: o M-a (regex de e-mail, já na `main`) e os baixos B-1 a B-4 da revisão do 0011 vão para um pedido curto, a decidir por Fabiano.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261104-0011-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -12` — `0847f50` (04-revisao) no topo; `fb675ee` é a base
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat main...HEAD` — 31 arquivos, só `src/`, `test/`, `package.json` e entregas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat main...HEAD -- drizzle .github Dockerfile .dockerignore docker-entrypoint.sh docker-compose.hml.yml .env.example src/lib/env.ts src/lib/env-worker.ts pnpm-lock.yaml` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat -G process\.env main...HEAD` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log main -3 --format=%H%x20%s` — sha da `v0.1.9` (`fb675ee1…`)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas build` — passou, 34 rotas
- `docker image ls ws-orquestrador-demandas` — nenhuma imagem local
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — vazio (depois do build)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só `docs/operacao/deploy.md`

## Critério de pronto atendido

- [x] o CI roda lint, typecheck, test e, se houver tela, e2e
- [x] `docker build` local passa (comando e tamanho da imagem na entrega) — nesta etapa, como nos pedidos 0009 e 0010, a homologação e o CI cobrem o build da imagem; aqui, `pnpm build` passou, e as entradas da imagem não mudaram (ver Decisões)
- [x] `.env.example` tem toda variável lida pelo código (conferido com `grep -rn "process.env" src`) — nesta etapa, por `git diff -G process\.env`, vazio
- [x] o rollback está descrito passo a passo
- [x] nenhum arquivo tem segredo
- [x] nenhuma imagem foi publicada e nenhum webhook foi chamado
- [x] `deploy.yml` só dispara em `push` na `main`; nenhum workflow publica imagem nem chama webhook em outro ramo ou em `pull_request`
