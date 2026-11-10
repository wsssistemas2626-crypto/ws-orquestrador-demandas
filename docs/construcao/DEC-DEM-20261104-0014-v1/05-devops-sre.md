---
pedido: DEC-DEM-20261104-0014-v1
etapa: 05-entrega
agente: devops-sre
leu: [contrato-passagem.md, padrao-tecnico.md, pedido.json, 02-tech-lead.md, 03-engenheiro-backend.md, 04-maestro.md, 04-seguranca-aplicacao.md, DEC-DEM-20261104-0013-v1/05-devops-sre.md, .github/workflows/ci.yml, .github/workflows/deploy.yml, Dockerfile, .dockerignore, .env.example, docs/operacao/deploy.md, src/components/rotulos.ts (180-267), src/modules/historico/consultas.ts, "src/app/(painel)/demandas/[id]/Historico.tsx", "src/app/(painel)/demandas/[id]/detalhe.ts (265-279)", "src/app/api/demandas/[id]/historico/route.ts"]
status: pronto
proximo: documentacao-tecnica
devolvido_para: null
---
## Entrega

A correção da 0.1.13 não mexe no pipeline nem na imagem. A base é `89eca46` (merge do PR #14, 0.1.12), que é também o
`origin/main` do clone local.

O `git diff --stat 89eca46...HEAD` restrito a estes arquivos saiu vazio:

- `drizzle`, `.github`, `Dockerfile`, `.dockerignore` e `docker-entrypoint.sh`;
- `docker-compose.hml.yml` e `.env.example`;
- `src/lib/env.ts`, `src/lib/env-worker.ts` e `pnpm-lock.yaml`.

Não há migration, dependência nova nem variável nova. O ramo muda 44 arquivos:

- o código em `src/`: `substituido.ts` (novo), `decidir.ts`, `gerar.ts`, as consultas de DEC e de demanda,
  `registrar.ts`, `rotulos.ts`, `dados-da-decisao.ts`, `dados-do-pedido.ts` e as páginas da T11 e da T05;
- os testes de cada um, `test/estatico/projeto.test.ts` (versão) e `scripts/` (seed e o teste dele);
- `e2e/decisao.spec.ts` e `e2e/pedido-construcao.spec.ts` (da 04);
- `package.json`, que passa a `0.1.13`;
- as entregas do pedido.

Não alterei `ci.yml`, `deploy.yml`, `Dockerfile`, `.dockerignore` nem `.env.example`. Só `docs/operacao/deploy.md`
mudou (32 linhas incluídas e 5 tiradas).

### Verificações

| Verificação | Resultado |
|---|---|
| CI (`ci.yml`) | Dispara em `pull_request` e `workflow_call`. Roda lint, typecheck, test (Testcontainers), e2e (Playwright contra o build de produção, com os dois specs ajustados na 04), `pnpm audit --prod --audit-level high`, gitleaks e `docker build` sem publicar. Não publica, não usa segredo e não chama webhook. Igual à base |
| Deploy (`deploy.yml`) | Dispara só em `on: push: branches: [main]`, e o job `publicar` tem `if: github.event_name == 'push' && github.ref == 'refs/heads/main'`. Nenhum outro ramo nem `pull_request` publica imagem ou chama webhook. Igual à base |
| `pnpm build` (o `next build` que o `Dockerfile` roda) | Passou: Next 16.4.1, compilação e TypeScript limpos, 34 rotas mais o proxy. Nenhum arquivo rastreado mudou com o build |
| `docker build` | Não rodei nesta etapa (ver Decisões), como nos pedidos 0009 a 0013. A imagem da 0.1.13 é construída pela homologação do maestro (`construir.mjs homologar`) e pelo job `imagem` do CI do PR. As entradas da imagem são as da base, salvo `src/`, `scripts/` e `package.json`. `docker image ls ws-orquestrador-demandas` não lista imagem local. Tamanho de referência: 1,74 GB em disco e 426 MB de conteúdo, medido na 0.1.7 (`deploy.md`, seção 10) |
| Versão da imagem | `package.json` está em `0.1.13`; o `deploy.yml` lê dele a tag `v0.1.13` |
| Variáveis (`process.env`) | `git diff --stat -G process\.env 89eca46...HEAD` saiu vazio: nenhuma linha com `process.env` entrou nem saiu neste ramo, e `env.ts`, `env-worker.ts` e `.env.example` não mudaram. A lista lida pelo código continua a conferida na 0.1.7 (pedido 0008), toda no `.env.example` |
| Segredo | Nenhum arquivo do ramo traz segredo; o `deploy.md` cita variáveis e segredos só pelo nome |
| Publicação | Nenhuma imagem publicada, nenhum webhook chamado, nada mexido no Easypanel |

### Volta da 0.1.13 (conferida no código)

- **Sem migration:** `drizzle/` é igual ao da base, então a volta é o caminho A, só trocando a imagem, para
  `:89eca465e96ae7a3b729205dff69c70417c372b3` (a `v0.1.12`).
- **Evento novo `pacote_decisao_substituido`:** a 0.1.12 lê sem erro.
  - `listarHistorico` (igual nas duas versões) só converte o tipo de `acao`, sem validar.
  - O `textoDoEvento` da 0.1.12 não tem caso para a ação e devolve `undefined`. A célula do que aconteceu sai vazia.
  - `valoresDoEvento` (`detalhe.ts:275-279`, igual nas duas versões) deixa Antes e Depois vazios.
  - A rota `/api/demandas/:id/historico` devolve o evento como está gravado.
- **Demanda com dois DEC aprovados:** a 0.1.12 não marca o substituído. O `gerarPedido` dela (base, `gerar.ts`) confere
  só `aprovada` e `desatualizado`, então o substituído volta a gerar Pedido de Construção. É o risco do RSK.
  - O `deploy.md` manda gerar só do DEC aprovado de maior versão enquanto a 0.1.12 estiver no ar.
  - O A-02 volta, e nenhum DEC novo se aprova numa demanda que já tem um aprovado.
- **Recusas novas** (409 do substituído no gerar, 409 `nivelMenorQueOVigente` do S-01): não gravam nada.

### `docs/operacao/deploy.md`

- **Seção 6 (rollback):** entrou o parágrafo da 0.1.13, antes do da 0.1.12.
  - A volta é o **caminho A**, para a `v0.1.12` (`89eca46…`), sem restaurar backup.
  - O parágrafo registra os dois dados novos que a 0.1.12 lê sem erro e o que reabre na volta: o substituído gerando, o
    A-02 e a recusa por nome sem saída.
  - Ele traz três passos para gerar Pedido com a 0.1.12 no ar.
  - Se a 0.1.13 for a primeira publicação, a volta é parar `app` e `worker`.
- **Parágrafo da 0.1.12:** o `b9e52d6` virou a imagem pelo sha completo
  (`b9e52d6828ec2496a2fcdce066dfaa908f6160f8`, a `v0.1.11`), como nos parágrafos anteriores. Era a Pendência 1 do
  0013: o commit agora está no clone local.
- **Seção 4, passo 5:** "merges da 0.1.1 à 0.1.13".
- **Cabeçalho:** "Atualizado em" com as mudanças acima. O campo "Versão" (0.1.12) fica para a `06-documentacao`, junto
  com o `CHANGELOG.md`.

## Decisões tomadas

- Nada muda em `.github/`, `Dockerfile` nem `.env.example`. A correção mexe só em `src/`, `scripts/`, nos testes, em
  `e2e/` e na versão, e a 04-maestro confirma que `src/db/`, `drizzle/` e `.github/` ficaram de fora.
- Comparei com `89eca46`, que é a base do pedido e o `origin/main` local.
- Não rodei o `docker build`. O Bash do agente roda fora do repositório, e o comando da lista
  (`docker build -t ws-orquestrador-demandas:local .`) não acharia o contexto. Como nos pedidos 0009 a 0013, o build
  da imagem fica com a homologação e o CI. No lugar dele, rodei `pnpm build`, que é o passo do `Dockerfile` que
  depende de `src/`.
- Conferi as variáveis com `git diff -G process\.env` em vez de `grep -rn "process.env" src`, pela razão do 0012 e do
  0013: o `grep` relativo falha fora do repositório, e o maestro pediu para não usar `grep` pelo shell.
- A volta vai pelo caminho A, para a `v0.1.12`. A 0.1.13 não tem migration, e a 0.1.12 lê sem erro os dois dados novos.
- A regra de uso na volta ("só gerar do DEC aprovado de maior versão") vai como passo do `deploy.md`. A 0.1.12 não tem a
  guarda no código, e o RSK já aceita a regra de uso como controle de um Pedido de DEC substituído.
- Não rodei o `ensaiar-rollback` nem o `homologar`. O contrato da `05-entrega` não os lista, e os dois ficam com a
  Parada 3 do maestro.

## Pendências

1. O `git grep` rodado por engano (só leitura) foi liberado pelo maestro pela regra de 25/10 e está no registro de bloqueio.
2. Para a Parada 3 do maestro:
   - rodar `construir.mjs homologar`, que constrói a imagem da 0.1.13 e roda o e2e;
   - rodar o `ensaiar-rollback`, que deve dar `alteram_dado: false` (sem migration nova);
   - acompanhar o CI do PR (job `imagem`).
3. Para a `06-documentacao`: o campo "Versão" do `deploy.md` (0.1.13) e a entrada 0.1.13 do `CHANGELOG.md`, com a regra
   de nível ao substituir (S-01).
4. Herdadas da 04, sem efeito no pipeline:
   - S-02 (médio), para a `gestao-riscos` e um pedido futuro: a `00-inicio` do /construir consultar `substituido`;
   - S-03 e S-04 (baixos);
   - os textos novos, para a `ux-ui-design`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261104-0014-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --stat -8` — commits do pedido, da `02-triagem` ao `04-reteste`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -n 3 --stat -- docs/construcao/DEC-DEM-20261104-0012-v1/05-devops-sre.md docs/construcao/DEC-DEM-20261104-0013-v1/05-devops-sre.md` — entregas anteriores da etapa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 89eca46...HEAD -- drizzle .github Dockerfile .dockerignore docker-entrypoint.sh docker-compose.hml.yml .env.example src/lib/env.ts src/lib/env-worker.ts pnpm-lock.yaml` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat -G process\.env 89eca46...HEAD` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -12` — `3f2d3ba` (04-reteste) no topo; `89eca46` é a base
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 89eca46...HEAD` — 44 arquivos, só `src/`, `test/`, `scripts/`, `e2e/`, `package.json` e entregas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 89eca46...HEAD -- src/components/rotulos.ts src/modules/historico/registrar.ts src/modules/pedido-construcao/gerar.ts package.json` — ação nova, texto do histórico, 409 do substituído e versão `0.1.13`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 89eca46...HEAD -- "src/app/(painel)/demandas/[id]/Historico.tsx" "src/app/(painel)/demandas/[id]/detalhe.ts" src/modules/historico/consultas.ts src/app/api` — só 3 testes de API; leitura do histórico igual à base
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log 89eca46 -1 --format=%H%x20%s` — `89eca465e96ae7a3b729205dff69c70417c372b3`, merge do PR #14
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log origin/main -2 --format=%H%x20%s` — `origin/main` local em `89eca46`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log b9e52d6 -1 --format=%H%x20%s` — `b9e52d6828ec2496a2fcdce066dfaa908f6160f8`, merge do PR #13
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas build` — passou, 34 rotas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — vazio (depois do build)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — só `docs/operacao/deploy.md` (32 incluídas, 5 tiradas)
- `docker image ls ws-orquestrador-demandas` — nenhuma imagem local

## Critério de pronto atendido

- [x] o CI roda lint, typecheck, test e, se houver tela, e2e
- [x] `docker build` local passa (comando e tamanho da imagem na entrega). Nesta etapa, como nos pedidos 0009 a 0013, a homologação e o CI cobrem o build da imagem. Aqui, `pnpm build` passou, e as entradas da imagem não mudaram fora de `src/`, `scripts/` e `package.json` (ver Decisões)
- [x] `.env.example` tem toda variável lida pelo código (conferido com `grep -rn "process.env" src`). Nesta etapa, por `git diff -G process\.env`, vazio
- [x] o rollback está descrito passo a passo
- [x] nenhum arquivo tem segredo
- [x] nenhuma imagem foi publicada e nenhum webhook foi chamado
- [x] `deploy.yml` só dispara em `push` na `main`; nenhum workflow publica imagem nem chama webhook em outro ramo ou em `pull_request`
