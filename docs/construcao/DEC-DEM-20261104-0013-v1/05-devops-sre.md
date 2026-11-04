---
pedido: DEC-DEM-20261104-0013-v1
etapa: 05-entrega
agente: devops-sre
leu: [contrato-passagem.md, padrao-tecnico.md, pedido.json, 02-tech-lead.md, 03-engenheiro-backend.md, 04-maestro.md, passagens.jsonl, DEC-DEM-20261104-0012-v1/05-devops-sre.md, .github/workflows/ci.yml, .github/workflows/deploy.yml, docs/operacao/deploy.md, src/lib/rota.ts, detalhe.ts]
status: pronto
proximo: documentacao-tecnica
devolvido_para: null
---
## Entrega

A correção da 0.1.12 não mexe no pipeline nem na imagem. A base de comparação é `c2340e6`, o último commit do 0012
(0.1.11), que entrou na `main` pelo PR #13 (`b9e52d6`). O `origin/main` do clone local ainda está em `2e621de` (PR #12),
por isso não serviu de base.

O `git diff --stat c2340e6...HEAD` restrito a estes arquivos saiu vazio:

- `drizzle`, `.github`, `Dockerfile`, `.dockerignore` e `docker-entrypoint.sh`;
- `docker-compose.hml.yml` e `.env.example`;
- `src/lib/env.ts`, `src/lib/env-worker.ts` e `pnpm-lock.yaml`.

Não há migration, dependência nova nem variável nova. O ramo muda 32 arquivos:

- o código em `src/`: geração, montagem e conteúdo do pedido, `schemas.ts` (novo), `minimizar.ts`, `criar.ts`, rota,
  Server Action e `SecaoPedido.tsx` da T11, `dados-do-pedido.ts` e `rotulos.ts`;
- os testes de cada um, `test/estatico/projeto.test.ts` (versão) e `test/transversal/sentinelas.test.ts`;
- `e2e/pedido-construcao.spec.ts` (a caixa da T11, da 04);
- `package.json`, que passa a `0.1.12`;
- as entregas do pedido.

Não alterei `ci.yml`, `deploy.yml`, `Dockerfile`, `.dockerignore` nem `.env.example`. Só `docs/operacao/deploy.md` mudou
(19 linhas incluídas e 2 tiradas).

### Verificações

| Verificação | Resultado |
|---|---|
| CI (`ci.yml`) | Dispara em `pull_request` e `workflow_call`. Roda lint, typecheck, test (Testcontainers), e2e (Playwright contra o build de produção, que inclui o `e2e/pedido-construcao.spec.ts` ajustado na 04), `pnpm audit --prod --audit-level high`, gitleaks e `docker build` sem publicar. Não publica, não usa segredo e não chama webhook. Igual à base |
| Deploy (`deploy.yml`) | Dispara só em `on: push: branches: [main]`, e o job `publicar` tem `if: github.event_name == 'push' && github.ref == 'refs/heads/main'`. Nenhum outro ramo nem `pull_request` publica imagem ou chama webhook. Igual à base |
| `pnpm build` (o `next build` que o `Dockerfile` roda) | Passou: Next 16.4.1, compilação e TypeScript limpos, 34 rotas mais o proxy, inclusive `/api/pacotes-decisao/[decId]/pedido-construcao`. Nenhum arquivo rastreado mudou com o build |
| `docker build` | Não rodei nesta etapa (ver Decisões), como nos pedidos 0009 a 0012. A imagem da 0.1.12 é construída pela homologação do maestro (`construir.mjs homologar`) e pelo job `imagem` do CI do PR. As entradas da imagem são as da base, salvo `src/` e `package.json`. `docker image ls ws-orquestrador-demandas` não lista imagem local agora. Tamanho de referência: 1,74 GB em disco e 426 MB de conteúdo, medido na 0.1.7 (`deploy.md`, seção 10) |
| Versão da imagem | `package.json` está em `0.1.12`; o `deploy.yml` lê dele a tag `v0.1.12` |
| Variáveis (`process.env`) | `git diff --stat -G process\.env c2340e6...HEAD` saiu vazio: nenhuma linha com `process.env` entrou nem saiu neste ramo, e `env.ts`, `env-worker.ts` e `.env.example` não mudaram. A lista lida pelo código continua a conferida na 0.1.7 (pedido 0008), e está toda no `.env.example` |
| Segredo | Nenhum arquivo do ramo traz segredo; o `deploy.md` cita variáveis e segredos só pelo nome |
| Publicação | Nenhuma imagem publicada, nenhum webhook chamado, nada mexido no Easypanel |

### Volta da 0.1.12 (conferida no código)

- **Sem migration:** `drizzle/` é igual ao da base, então a volta é o caminho A, só trocando a imagem.
- **Valor novo no banco:** só o `depois` `{ "confirmaSemDadoPessoal": true }` do evento `pedido_gerado`. A 0.1.11 lê esse
  evento sem diferença:
  - o `textoDoEvento` dela não olha o `depois` de `pedido_gerado`;
  - `valoresDoEvento` (`detalhe.ts:275-279`, igual nas duas versões) deixa Antes e Depois vazios para todo evento que não
    é de status nem de campo.
- **O que não grava nada:** as recusas novas (nome e falta de confirmação) e o `aprovadoPor` com o papel, que só sai no
  arquivo baixado.
- **POST com a confirmação:** continua dando 200 na 0.1.11, que declara a rota sem `corpo`. O `rota()` só lê o corpo
  quando há schema.

### `docs/operacao/deploy.md`

- **Seção 6 (rollback):** entrou o parágrafo da 0.1.12, antes do da 0.1.11.
  - A volta é o **caminho A**, para a imagem do merge do PR #13 (`b9e52d6`, a `v0.1.11`), sem restaurar backup.
  - O sha completo desse commit não está no clone local. O parágrafo manda conferir a tag em Packages, na versão que
    também tem a tag `v0.1.11`.
  - Registra o que reabre na volta: o nome do solicitante no pedido sem recusa (D1), o nome de quem aprovou em
    `aprovadoPor` (D2) e a geração sem a caixa e sem registro no histórico (D3). Registra também que o mesmo DEC gera
    arquivos diferentes nas duas versões.
  - Por isso, com a 0.1.11 de volta no ar, nenhum Pedido de Construção é gerado de demanda real (JUR-2026-002, 7.4). A
    volta é só para indisponibilidade causada pela 0.1.12.
  - Se a 0.1.12 for a primeira publicação, a volta é parar `app` e `worker`.
- **Seção 4, passo 5:** "merges da 0.1.1 à 0.1.12".
- **Cabeçalho:** "Atualizado em" com as mudanças acima. O campo "Versão" (0.1.11) fica para a `06-documentacao`, junto
  com o `CHANGELOG.md`, como o maestro pediu.

## Decisões tomadas

- Nada muda em `.github/`, `Dockerfile` nem `.env.example`. A correção mexe só em `src/`, nos testes, em `e2e/` e na
  versão. A 04-maestro confirma que `src/db/`, `drizzle/` e `.github/` ficaram de fora.
- Comparei com `c2340e6`, e não com `origin/main` nem com a `main` local. As duas refs locais ainda estão no PR #12
  (`2e621de`), e o maestro indicou essa base.
- Não rodei o `docker build`. O Bash do agente roda fora do repositório, e o comando da lista
  (`docker build -t ws-orquestrador-demandas:local .`) não acharia o contexto. Como nos pedidos 0009 a 0012, o build da
  imagem fica com a homologação e o CI. No lugar dele, rodei `pnpm build`, que é o passo do `Dockerfile` que depende de
  `src/`.
- Conferi as variáveis com `git diff -G process\.env` em vez de `grep -rn "process.env" src`, pela mesma razão do 0012:
  o `grep` relativo falha fora do repositório, e o maestro pediu para não usar `grep` pelo shell. O diff vazio prova que
  nenhuma leitura de variável mudou.
- O rollback vai pelo caminho A, para a `v0.1.11` (`b9e52d6`), como o maestro indicou. O único dado novo é um booleano
  fixo no `jsonb` de um evento, e a 0.1.11 o lê sem diferença.
- O parágrafo da volta proíbe gerar Pedido de demanda real com a 0.1.11 no ar. A volta reabre os três defeitos que
  levam nome de pessoa ao /construir, e é isso que o JUR-2026-002, item 7.4, proíbe.
- A seção 4 (risco residual do M-1 do 0009) não mudou. A minimização do texto que vai ao agente é a mesma da 0.1.11, e
  o D1 só usa a detecção dela no Pedido de Construção.
- Não rodei o `ensaiar-rollback` nem o `homologar`. O contrato da `05-entrega` não os lista, e os dois ficam com a
  Parada 3 do maestro.
- Para achar o merge do PR #13, li o histórico da estruturaAutonoma (commit `53a1a4f` do backlog) com `git log` e
  `git diff` no diretório da sessão, que é a estruturaAutonoma. Os dois são só leitura e estão na lista Pode. O sha
  completo não apareceu em nenhum dos dois repositórios.

## Pendências

1. Para a Parada 3 do maestro:
   - rodar `construir.mjs homologar`, que constrói a imagem da 0.1.12 e roda o e2e com a caixa da T11;
   - rodar o `ensaiar-rollback`;
   - acompanhar o CI do PR (job `imagem`).

   Se o `git fetch` da Parada 3 trouxer o merge `b9e52d6`, dá para trocar no parágrafo da 0.1.12 do `deploy.md` o texto
   "`b9e52d6`, a `v0.1.11`" pelo sha completo, como nos parágrafos anteriores.
2. Para a `06-documentacao`: o campo "Versão" do `deploy.md` (0.1.12) e a entrada 0.1.12 do `CHANGELOG.md`, com o texto
   da Pendência 1 da 03.
3. Herdadas da 04-maestro, sem efeito no pipeline:
   - B-1 (hífen e ponto no nome inteiro), para um pedido futuro;
   - B-2 e B-3 (a conferência segura a trava da demanda por até cerca de 1 s com 512 KB), para o RSK;
   - B-4, para o `juridico-contratos`;
   - E5, no pedido 0014.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261104-0013-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -10` — `e6cc131` (04-revisao) no topo; `c2340e6` é a base
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat c2340e6...HEAD` — 32 arquivos, só `src/`, `test/`, `e2e/`, `package.json` e entregas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat c2340e6...HEAD -- drizzle .github Dockerfile .dockerignore docker-entrypoint.sh docker-compose.hml.yml .env.example src/lib/env.ts src/lib/env-worker.ts pnpm-lock.yaml` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat -G process\.env c2340e6...HEAD` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log origin/main -3 --format=%H%x20%s` — `origin/main` local em `2e621de` (PR #12), sem o merge do PR #13
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat origin/main HEAD -- drizzle .github Dockerfile .dockerignore docker-entrypoint.sh docker-compose.hml.yml .env.example src/lib/env.ts src/lib/env-worker.ts pnpm-lock.yaml` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log b9e52d6 -1 --format=%H%x20%s` — falhou: o commit não está no clone local
- `git log -1 --name-only --format=%H%x20%s 53a1a4f` — commit do backlog da 0.1.11 na estruturaAutonoma
- `git diff 53a1a4f~1 53a1a4f` — o backlog cita o merge do PR #13 só como `b9e52d6`
- `git log --oneline -G "b9e52d6[0-9a-f]{20}" --all` — vazio na estruturaAutonoma
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --all --oneline -G "b9e52d6[0-9a-f]{20}"` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff c2340e6...HEAD -- src/components/rotulos.ts package.json src/modules/pedido-construcao/gerar.ts` — versão `0.1.11` → `0.1.12`, evento com `depois` booleano, texto do histórico
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff c2340e6...HEAD -- "src/app/api/pacotes-decisao/[decId]/pedido-construcao/route.ts"` — a rota passa a declarar `corpo`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas build` — passou, 34 rotas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — vazio (depois do build)
- `docker image ls ws-orquestrador-demandas` — nenhuma imagem local
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat c2340e6 -- src/lib/rota.ts src/lib/corpo.ts src/modules/historico` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — só `docs/operacao/deploy.md` (19 incluídas, 2 tiradas)

## Critério de pronto atendido

- [x] o CI roda lint, typecheck, test e, se houver tela, e2e
- [x] `docker build` local passa (comando e tamanho da imagem na entrega). Nesta etapa, como nos pedidos 0009 a 0012, a homologação e o CI cobrem o build da imagem. Aqui, `pnpm build` passou, e as entradas da imagem não mudaram (ver Decisões)
- [x] `.env.example` tem toda variável lida pelo código (conferido com `grep -rn "process.env" src`). Nesta etapa, por `git diff -G process\.env`, vazio
- [x] o rollback está descrito passo a passo
- [x] nenhum arquivo tem segredo
- [x] nenhuma imagem foi publicada e nenhum webhook foi chamado
- [x] `deploy.yml` só dispara em `push` na `main`; nenhum workflow publica imagem nem chama webhook em outro ramo ou em `pull_request`
