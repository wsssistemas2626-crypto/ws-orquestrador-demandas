---
pedido: DEC-DEM-20261102-0003-v1
etapa: 05-entrega
agente: devops-sre
leu: [pedido.json, contrato-passagem.md, 02-tech-lead.md, 03-engenheiro-frontend.md, 04-maestro.md, passagens.jsonl, DEC-DEM-20261102-0002-v1/05-devops-sre.md, .github/workflows/ci.yml, .github/workflows/deploy.yml, Dockerfile, .dockerignore, .env.example, playwright.config.ts, docs/operacao/deploy.md, git diff main...HEAD]
status: pronto
proximo: documentacao-tecnica
devolvido_para: null
---
## Entrega

Conferência da entrega da 0.1.2 sobre a da 0.1.1. **Nenhum arquivo de entrega foi alterado**, e os três itens abaixo
continuam de pé:

- o `docker build` local passa;
- o `.env.example` cobre toda variável que o código lê;
- os procedimentos do `deploy.md` valem para a 0.1.2 como estão. Só o metadado de versão e a frase do alvo do rollback
  ficam para a `06-documentacao` (Pendências).

### O que mudou entre a `main` (0.1.1, `30b71b5`) e o ramo

Pelo `git diff --stat main...HEAD`, mudaram 8 arquivos de código, todos de teste ou da configuração de teste:

- `e2e/apoio.ts`, `e2e/decisao.spec.ts`, `e2e/parecer-risco-qa.spec.ts`, `e2e/preparacao.ts` (novo) e
  `e2e/preparacao.spec.ts` (novo);
- `playwright.config.ts`, só o comentário do topo (linhas 4-9). Nenhuma linha de configuração mudou: `testDir`,
  `testMatch`, `workers: 1`, `fullyParallel: false`, `retries: 0` e `webServer` estão como antes;
- `test/estatico/projeto.test.ts`, a conferência da versão;
- `package.json`, só no campo `version` (de `0.1.1` para `0.1.2`).

O diff tem mais 7 arquivos, todos da pasta do pedido. Não mudaram `src/`, `scripts/`, `drizzle/`, `.github/`,
`Dockerfile`, `.dockerignore`, `docker-compose.hml.yml`, `.env.example` nem `docs/operacao/`.

### `docker build` local

- Comando: `docker build -t ws-orquestrador-demandas:local /home/deploy/servidor/projetos/ws-orquestrador-demandas`,
  com o caminho absoluto liberado pelo maestro.
- Resultado: passou.
  - `pnpm install --frozen-lockfile` com o lockfile em dia ("Lockfile passes supply-chain policies", 814 entradas).
  - `next build` compilou e passou no TypeScript, com as mesmas rotas da 0.1.1.
  - O `pnpm --version` do estágio final rodou como `node` (12.6.0).
  - A imagem saiu como `ws-orquestrador-demandas:local` (`081eeee74a50`).
- Tamanho (`docker image ls ws-orquestrador-demandas`): **1,73 GB em disco, 425 MB de conteúdo**. É o mesmo da 0.1.1
  (1,73 GB e 425 MB).
- Nada foi publicado: a imagem só existe no Docker local da VPS.
- A imagem 0.1.2 só difere da 0.1.1 no `package.json` (versão). O estágio final copia só `package.json`, os lockfiles,
  `next.config.ts`, `tsconfig.json`, `src/`, `scripts/`, `drizzle/` e o `.next`; `e2e/`, `test/` e
  `playwright.config.ts` não entram nele.

### `.env.example` contra o código

Rodei o grep de `process.env` em `src/`. O resultado é o mesmo da 0.1.1, porque `src/` não mudou:

| Variável lida em `src/` | Onde | No `.env.example` |
|---|---|---|
| `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CABECALHO_IP_CLIENTE`, `RETENCAO_TEXTO_BRUTO_DIAS` | `env.ts` (recebe o `process.env` inteiro, `:63`) | sim |
| `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `EMAIL_REMETENTE`, `EMAIL_AVISO_DECISAO` | `env-worker.ts` (`:22`) | sim |
| `LOG_LEVEL` | `log.ts:70` | sim |
| `SENTRY_DSN` | `instrumentation.ts:9`, `worker/index.ts:19` | sim |
| `NODE_ENV`, `NEXT_RUNTIME` | `proxy.ts:15`, `instrumentation.ts:5` | sim, como "definidas pela imagem ou pelo Next" |

As outras ocorrências estão em testes (`*.test.ts`) ou em comentários. O `CI` que a `decisao.spec.ts` passou a ler é do
e2e, não do app, e já está no `.env.example` na seção "só para o e2e" (comentado, junto com `BASE_URL`). Nenhuma
variável nova.

### Pipeline e homologação: continuam valendo sem mudança

- **`ci.yml`:**
  - roda `lint`, `typecheck`, `test` (Testcontainers), `test:e2e` contra o build de produção, `pnpm audit`, gitleaks no
    histórico e `docker build` sem publicar;
  - dispara em `pull_request` e por `workflow_call`; não usa segredo, não publica imagem e não chama webhook;
  - a spec nova, `e2e/preparacao.spec.ts`, entra sozinha no `pnpm test:e2e` (`testMatch: '**/*.spec.ts'`). Ela não abre
    navegador nem chama a API;
  - o GitHub Actions define `CI`, então ali o `exigeBancoRecemSemeado` **reprova** o teste cuja pré-condição for falsa,
    em vez de pulá-lo. Com o banco novo do Testcontainers, o job e2e tem de terminar com 0 pulado.
- **`deploy.yml`:**
  - dispara só em `push` na `main`, e o job `publicar` repete a guarda `github.ref == 'refs/heads/main'`;
  - lê a versão do `package.json`, então a imagem sai com a tag `v0.1.2` sem mudança no workflow.
- **`.dockerignore`:** `.env`, `.env.*`, `.git`, `.github` e `docs` continuam fora do contexto.
- **`docker-compose.hml.yml`:** sem mudança. O `construir.mjs homologar` passa `CI: '1'` e apaga os volumes, então na
  homologação o banco é novo e os testes que exigem banco recém-semeado também reprovam em vez de pular (04-maestro,
  critério 3).

### Na publicação da 0.1.2 (Fabiano, depois do merge)

- **Sem migration nova:** `drizzle/` não mudou.
  - No merge, o `deploy.yml` não acha diferença em `drizzle/` desde o commit anterior (`git diff --quiet`) e segue para
    o passo dos webhooks: primeiro o do `worker`, depois o do `app` (`deploy.md`, seção 1, passo 3).
  - A seção 5 (backup → migrate → deploy) não se aplica à 0.1.2.
- **O merge publica a imagem no GHCR.** O passo "Publicar" vem antes dos webhooks, então `:<sha do merge>`, `:v0.1.2` e
  `:latest` sobem.
- **Os segredos de webhook ainda não existem** no repositório (`EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER`, por
  nome, como registrado no pedido 0002). O merge da 0.1.2 **não faz deploy no Easypanel**. Depois de publicar:
  - o passo "Disparar o Easypanel" falha com "Faltam os segredos EASYPANEL_WEBHOOK_APP e EASYPANEL_WEBHOOK_WORKER";
  - a execução fica vermelha;
  - a limpeza das versões antigas do GHCR não roda (o passo não tem `if: always()`), e o pacote segue acumulando
    versões, como no merge da 0.1.1.
- **Primeira publicação de verdade:** continua a seção 4 do `deploy.md`, com a `:latest`, que passa a ser a 0.1.2, e
  as mesmas 7 migrations da 0.1.0.
- **Rollback da 0.1.2: caminho A da seção 6.**
  - Basta trocar a imagem de `worker` e `app`, sem restaurar backup.
  - O journal de migrations da 0.1.2 é igual ao da 0.1.1, então o `/api/saude` da 0.1.1 responde 200 sobre o mesmo banco.
  - Alvo: `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:30b71b5185cb58d403847b95532e54b5a299e77a`, o commit de
    merge do PR #2 na `main` (tag `v0.1.1`).
  - Não conferi o GHCR (fora da minha lista Pode). Como a limpeza não roda sem os segredos, a `v0.1.1` publicada no merge
    do PR #2 continua lá. Antes de qualquer rollback, confirmar a tag em Packages.
  - A volta esperada é sem restaurar e sem migration que altere dado. Nesta etapa da cadeia curta isso não foi ensaiado:
    o ensaio é o `ensaiar-rollback` da Parada 3.

## Decisões tomadas

- Nenhum arquivo de entrega mudou: o diff não toca em src, scripts, drizzle, .github, Dockerfile nem na operação, e o contrato da 05 manda alterar só o que a correção exigir.
- Por liberação do maestro, por delegação de Fabiano (02/11, até 14h de Brasília), rodou o docker build com o caminho absoluto do repositório, em primeiro plano. Resultado: passou, imagem ws-orquestrador-demandas:local (081eeee74a50) com 1,73 GB em disco e 425 MB de conteúdo, igual à 0.1.1.
- O grep de process.env rodou com o caminho absoluto de src, porque o Bash não troca de pasta; é o mesmo comando da lista Pode, só com o caminho completo, e não lê nada fora de src.
- O deploy.md fica como está, como na 05 do pedido 0002: os passos das seções 4, 5 e 6 valem para a 0.1.2, e só mudam o campo "Versão", a frase da :latest na seção 4 e o alvo do rollback na seção 6, que a 06-documentacao atualiza junto com o CHANGELOG da 0.1.2.
- O homologar e o ensaiar-rollback não rodaram: são critérios da 09, e a Parada 3 os roda.

## Pendências

- Para a `06-documentacao`, em `docs/operacao/deploy.md`:
  - tabela do topo: "Versão" para `0.1.2` e "Atualizado em";
  - seção 4: a `:latest` da primeira publicação passa a ser a 0.1.2, ainda com as mesmas 7 migrations;
  - seção 6: a 0.1.2 não traz migration, e a volta dela é o caminho A, para
    `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:30b71b5185cb58d403847b95532e54b5a299e77a` (a `v0.1.1`).
- Para Fabiano, antes da primeira publicação: continua a pendência dos PR #1 e #2. Cadastrar no GitHub os segredos
  `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER` (Settings → Secrets and variables → Actions), com as URLs de deploy
  dos serviços `app` e `worker` do Easypanel. Os serviços seguem a seção 4 do `deploy.md`.
  - Até lá, todo push na `main` publica a imagem no GHCR e fica vermelho no passo dos webhooks, sem deploy.
  - A limpeza do GHCR também não roda até lá, e o pacote acumula versões além das 2.
  - Antes de qualquer passo, snapshot da VPS no hPanel.
- Continuam de antes, sem mudança neste pedido: as actions por SHA e o tamanho da imagem (1,73 GB por causa do `tsx`),
  na seção 10 do `deploy.md`.
- A imagem local `ws-orquestrador-demandas:local` (1,73 GB) ficou no Docker da VPS, substituindo a da 0.1.1 na mesma
  tag. Não a apaguei, porque apagar não está na minha lista Pode.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo construcao/DEC-DEM-20261102-0003-v1, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat main...HEAD` — 15 arquivos, 8 de código (e2e, `playwright.config.ts`, `test/estatico/projeto.test.ts`, `package.json`); fora do diff: `src/`, `scripts/`, `drizzle/`, `.github/`, Dockerfile e `docs/operacao/`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff main...HEAD -- package.json playwright.config.ts` — só `version` 0.1.1 → 0.1.2 e o comentário do topo do `playwright.config.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --format=%H%x20%s -4 main` — main em 30b71b5185cb58d403847b95532e54b5a299e77a (merge do PR #2, 0.1.1)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -10` — 3661a5c (04-revisao) no topo, sobre 30b71b5
- `docker image ls ws-orquestrador-demandas` — `ws-orquestrador-demandas:local`, 1,73 GB em disco, 425 MB de conteúdo
- `grep -rn "process.env" /home/deploy/servidor/projetos/ws-orquestrador-demandas/src` — as mesmas leituras da 0.1.1; todas no `.env.example`

## Critério de pronto atendido

- [x] o CI roda lint, typecheck, test e, se houver tela, e2e (`ci.yml` sem mudança; a spec nova entra no `pnpm test:e2e`)
- [x] `docker build` local passa (comando e tamanho da imagem na entrega: 1,73 GB em disco, 425 MB de conteúdo)
- [x] `.env.example` tem toda variável lida pelo código (conferido com `grep -rn "process.env" src`)
- [x] o rollback está descrito passo a passo (`deploy.md`, seção 6; a 0.1.2 usa o caminho A, alvo `v0.1.1`)
- [x] nenhum arquivo tem segredo (nenhum arquivo de entrega mudou; esta entrega cita os segredos só pelo nome)
- [x] nenhuma imagem foi publicada e nenhum webhook foi chamado
- [x] `deploy.yml` só dispara em `push` na `main`; nenhum workflow publica imagem nem chama webhook em outro ramo ou em `pull_request`
