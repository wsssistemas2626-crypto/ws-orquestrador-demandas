---
pedido: DEC-DEM-20261102-0002-v1
etapa: 05-entrega
agente: devops-sre
leu: [pedido.json, contrato-passagem.md, 02-tech-lead.md, 03-engenheiro-frontend.md, 04-maestro.md, passagens.jsonl, .github/workflows/ci.yml, .github/workflows/deploy.yml, Dockerfile, .dockerignore, docker-compose.hml.yml, .env.example, docs/operacao/deploy.md, src/lib/env.ts, src/lib/env-worker.ts, git diff main...HEAD]
status: pronto
proximo: documentacao-tecnica
devolvido_para: null
---
## Entrega

Conferência da entrega da 0.1.1 sobre a da 0.1.0. **Nenhum arquivo de entrega foi alterado**, e os três itens abaixo
continuam de pé:

- o `docker build` local passa;
- o `.env.example` cobre toda variável que o código lê;
- os procedimentos do `deploy.md` valem para a 0.1.1 como estão.

### O que mudou entre a `main` (0.1.0) e o ramo

Pelo `git diff --stat main...HEAD`, mudaram 8 arquivos de código:

- `e2e/apoio.ts`, `e2e/decisao.spec.ts`, `e2e/parecer-risco-qa.spec.ts` e `e2e/sem-violacoes.spec.ts` (novo);
- `scripts/seed-ficticio.ts` e `scripts/scripts.test.ts`;
- `test/estatico/projeto.test.ts`;
- `package.json`, só no campo `version` (de `0.1.0` para `0.1.1`).

O diff tem mais 7 arquivos, todos da pasta do pedido. Não mudaram `src/`, `drizzle/`, `.github/`, `Dockerfile`,
`.dockerignore`, `docker-compose.hml.yml`, `.env.example` nem `docs/operacao/`.

### `docker build` local

- Comando: `docker build -t ws-orquestrador-demandas:local /home/deploy/servidor/projetos/ws-orquestrador-demandas`.
  É a forma com caminho absoluto, liberada pelo maestro e registrada no `passagens.jsonl`.
- Resultado: passou.
  - `pnpm install --frozen-lockfile` com o lockfile em dia ("Lockfile passes supply-chain policies").
  - `next build` compilou e passou no TypeScript.
  - O `pnpm --version` do estágio final rodou como `node` (12.6.0).
  - A imagem saiu como `ws-orquestrador-demandas:local` (`26367a38b1ef`).
- Tamanho (`docker image ls ws-orquestrador-demandas`): **1,73 GB em disco, 425 MB de conteúdo**. É o mesmo patamar
  da 0.1.0 (cerca de 1,74 GB e 426 MB, `deploy.md` seção 10).
- Nada foi publicado: a imagem só existe no Docker local da VPS.
- A imagem 0.1.1 só difere da 0.1.0 em `scripts/seed-ficticio.ts` (três demandas fictícias novas) e no `package.json`.
  `e2e/` e `test/` não entram no estágio final.

### `.env.example` contra o código

Rodei `grep -rn "process.env" src` e li `src/lib/env.ts` e `src/lib/env-worker.ts`, que recebem o `process.env`
inteiro e leem as variáveis pelo nome:

| Variável lida em `src/` | Onde | No `.env.example` |
|---|---|---|
| `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CABECALHO_IP_CLIENTE`, `RETENCAO_TEXTO_BRUTO_DIAS` | `env.ts` | sim |
| `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `EMAIL_REMETENTE`, `EMAIL_AVISO_DECISAO` | `env-worker.ts` | sim |
| `LOG_LEVEL` | `log.ts:70` | sim |
| `SENTRY_DSN` | `instrumentation.ts:9`, `worker/index.ts:19` | sim |
| `NODE_ENV`, `NEXT_RUNTIME` | `env.ts`, `proxy.ts:15`, `instrumentation.ts:5` | sim, como "definidas pela imagem ou pelo Next" |

As outras ocorrências estão em testes (`*.test.ts`) ou em comentários. Nenhuma variável nova desde a 0.1.0, como a ESP
exige.

### Pipeline e homologação: continuam valendo sem mudança

- **`ci.yml`:**
  - roda `lint`, `typecheck`, `test` (Testcontainers), `test:e2e` contra o build de produção, `pnpm audit`, gitleaks no
    histórico e `docker build` sem publicar;
  - dispara em `pull_request` e por `workflow_call`;
  - não usa segredo, não publica imagem e não chama webhook;
  - a spec nova, `e2e/sem-violacoes.spec.ts`, entra sozinha no `pnpm test:e2e`.
- **`deploy.yml`:**
  - dispara só em `push` na `main`, e o job `publicar` repete a guarda `github.ref == 'refs/heads/main'`;
  - lê a versão do `package.json`, então a imagem sai com a tag `v0.1.1` sem mudança no workflow.
- **`.dockerignore`:** `.env`, `.env.*`, `.git`, `.github` e `docs` continuam fora do contexto.
- **`docker-compose.hml.yml`:** sem mudança. As três demandas novas nascem do mesmo `SEED_FICTICIO=1` do app da
  homologação.

### `deploy.md`: os procedimentos valem para a 0.1.1 como estão

- **Sem migration nova:** `drizzle/` não mudou.
  - No merge, o `deploy.yml` não acha diferença em `drizzle/` desde o commit anterior (`git diff --quiet`).
  - Com isso, ele segue para o passo dos webhooks: primeiro o do `worker`, depois o do `app` (seção 1, passo 3).
  - A seção 5 (backup → migrate → deploy) não se aplica à 0.1.1.
- **Rollback da 0.1.1: caminho A da seção 6.**
  - Basta trocar a imagem, sem restaurar backup.
  - O journal de migrations da 0.1.1 é igual ao da 0.1.0, então o `/api/saude` da 0.1.0 responde 200 sobre o mesmo
    banco.
  - A volta esperada é sem restaurar e sem migration que altere dado. Nesta etapa da cadeia curta, isso não foi ensaiado:
    o ensaio é o `ensaiar-rollback` da Parada 3.
- **Alvo do rollback:**
  `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:dd8ddee6d8a30cda8dff0f1a45f0abe30db8f364`.
  - É o commit de merge da 0.1.0 na `main`, também com a tag `v0.1.0`.
  - A limpeza do GHCR guarda 2 versões, então a 0.1.0 continua lá depois da 0.1.1.
- **Uma linha desatualizada:** o campo "Versão" da tabela do topo diz `0.1.0`. É metadado e não muda nenhum passo.
  Fica para a `06-documentacao` (Pendências).

### Na publicação da 0.1.1 (Fabiano, depois do merge)

**Os segredos de webhook não existem.** O maestro conferiu pelos nomes que `EASYPANEL_WEBHOOK_APP` e
`EASYPANEL_WEBHOOK_WORKER` não estão no repositório. O merge da 0.1.1 **não faz deploy no Easypanel**.

Pela ordem do `deploy.yml`, porém, o merge **publica, sim, a imagem no GHCR**. O passo "Publicar" vem antes dos
webhooks, então `:<sha do merge>`, `:v0.1.1` e `:latest` sobem. Depois disso:

- o passo "Disparar o Easypanel" falha com "Faltam os segredos EASYPANEL_WEBHOOK_APP e EASYPANEL_WEBHOOK_WORKER";
- a execução fica vermelha;
- a limpeza das versões antigas do GHCR não roda nessa execução.

A 0.1.0 só publicou a imagem pelo mesmo caminho: sem segredos, a produção ainda não foi configurada. Assim, a primeira
publicação de verdade segue a seção 4 do `deploy.md`, com a imagem `:latest`, que será a 0.1.1:

1. snapshot;
2. `db`, papel `orquestrador_app`, `app` e `worker` no Easypanel;
3. os dois segredos de webhook no GitHub;
4. a migration com as mesmas 7 migrations;
5. o deploy do `worker` e depois o do `app`;
6. a conferência da seção 8.

Daí em diante, versões sem migration seguem sozinhas pelo webhook, e o rollback é o caminho A.

## Decisões tomadas

- Nenhum arquivo de entrega mudou: o diff não toca em `src/`, `drizzle/`, `.github/`, `Dockerfile` nem na operação, e o contrato da 05 manda alterar só o que a correção exigir.
- O build e o grep rodaram com caminho absoluto: o Bash desta etapa não troca de pasta, e o maestro liberou essas duas formas, com registro no `passagens.jsonl`.
- O campo "Versão" do `deploy.md` fica `0.1.0` aqui: não muda nenhum passo, e a `06-documentacao` já atualiza a versão (CHANGELOG da 0.1.1 e B-02) e pode trocar o campo na mesma passada.
- Registrei que o merge publica a imagem, mesmo sem os segredos: o `deploy.yml` roda "Publicar" antes do passo dos webhooks. Só o deploy no Easypanel fica de fora.
- O `homologar` e o `ensaiar-rollback` não rodaram: são critérios da 09, e a Parada 3 os roda.

## Pendências

- Para Fabiano, antes da primeira publicação: cadastrar no GitHub os segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER` (Settings → Secrets and variables → Actions), com as URLs de deploy dos serviços `app` e `worker` do Easypanel. Os serviços seguem a seção 4 do `deploy.md`.
  - Até lá, todo push na `main` publica a imagem no GHCR e fica vermelho no passo dos webhooks, sem deploy.
  - A limpeza do GHCR também não roda até lá, e o pacote acumula versões além das 2.
  - Antes de qualquer passo, snapshot da VPS no hPanel.
- Para a `06-documentacao`: passar a 0.1.1 o campo "Versão" e o "Atualizado em" da tabela do topo de `docs/operacao/deploy.md`.
- Continuam de antes, sem mudança neste pedido: as actions por SHA e o tamanho da imagem (1,73 GB por causa do `tsx`), na seção 10 do `deploy.md`.
- A imagem local `ws-orquestrador-demandas:local` (1,73 GB) ficou no Docker da VPS. Não a apaguei, porque apagar não está na minha lista Pode.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --branch` — ramo construcao/DEC-DEM-20261102-0002-v1, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — 28e5c66 (04-revisao) no topo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat main...HEAD` — 15 arquivos, 8 de código; fora do diff: `src/`, `drizzle/`, `.github/`, Dockerfile e `docs/operacao/`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff main...HEAD -- package.json` — só `version` 0.1.0 → 0.1.1
- `cd /home/deploy/servidor/projetos/ws-orquestrador-demandas` — a pasta não persistiu para a chamada seguinte
- `git status` — `On branch main` da estruturaAutonoma: o Bash não trocou de pasta
- `docker image ls ws-orquestrador-demandas` — nenhuma imagem local (antes do build)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --format=%H%x20%s -3 main` — main em dd8ddee6d8a30cda8dff0f1a45f0abe30db8f364 (merge do PR #1, 0.1.0)
- `docker build -t ws-orquestrador-demandas:local /home/deploy/servidor/projetos/ws-orquestrador-demandas` — passou, imagem 26367a38b1ef (liberado pelo maestro)
- `grep -rn "process.env" /home/deploy/servidor/projetos/ws-orquestrador-demandas/src` — só variáveis já no `.env.example` (liberado pelo maestro)
- `docker image ls ws-orquestrador-demandas` — `ws-orquestrador-demandas:local`, 1,73 GB em disco, 425 MB de conteúdo

## Critério de pronto atendido

- [x] o CI roda lint, typecheck, test e, se houver tela, e2e (`ci.yml` sem mudança; a spec nova entra no `pnpm test:e2e`)
- [x] `docker build` local passa (comando e tamanho da imagem na entrega: 1,73 GB em disco, 425 MB de conteúdo)
- [x] `.env.example` tem toda variável lida pelo código (conferido com `grep -rn "process.env" src`)
- [x] o rollback está descrito passo a passo (`deploy.md`, seção 6; a 0.1.1 usa o caminho A)
- [x] nenhum arquivo tem segredo (nenhum arquivo de entrega mudou; esta entrega cita os segredos só pelo nome)
- [x] nenhuma imagem foi publicada e nenhum webhook foi chamado
- [x] `deploy.yml` só dispara em `push` na `main`; nenhum workflow publica imagem nem chama webhook em outro ramo ou em `pull_request`
