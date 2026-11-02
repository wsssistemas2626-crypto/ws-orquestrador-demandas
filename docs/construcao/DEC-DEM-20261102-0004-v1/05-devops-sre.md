---
pedido: DEC-DEM-20261102-0004-v1
etapa: 05-entrega
agente: devops-sre
leu: [pedido.json, contrato-passagem.md, 02-tech-lead.md, 03-engenheiro-frontend.md, 04-maestro.md, passagens.jsonl, DEC-DEM-20261102-0003-v1/05-devops-sre.md, .github/workflows/ci.yml, .github/workflows/deploy.yml, .dockerignore, .env.example, docs/operacao/deploy.md, git diff main...HEAD]
status: pronto
proximo: documentacao-tecnica
devolvido_para: null
---
## Entrega

Conferência da entrega da 0.1.3 sobre a da 0.1.2. **Nenhum arquivo de entrega foi alterado**, e os três itens abaixo
continuam de pé:

- o `docker build` local passa;
- o `.env.example` cobre toda variável que o código lê;
- os procedimentos do `deploy.md` valem para a 0.1.3 como estão. Só o metadado de versão, a frase da `:latest` e o
  alvo do rollback ficam para a `06-documentacao` (Pendências).

### O que mudou entre a `main` (0.1.2, `b8a8c44`) e o ramo

Pelo `git diff --stat main...HEAD`, mudaram 3 arquivos de código, todos de teste ou de versão:

- `e2e/decisao.spec.ts`: o "Arquivar" e o teste novo de 404 e sessão;
- `test/estatico/projeto.test.ts`: a conferência da versão;
- `package.json`: só o campo `version`, de `0.1.2` para `0.1.3`.

Os outros 7 arquivos do diff são da pasta do pedido. O `git diff --stat main...HEAD` restrito a `src`, `scripts`,
`drizzle`, `.github`, `Dockerfile`, `.dockerignore`, `docker-compose.hml.yml`, `docker-entrypoint.sh`, `.env.example` e
`docs/operacao` saiu vazio: nada disso mudou.

### `docker build` local

- Comando: `docker build -t ws-orquestrador-demandas:local /home/deploy/servidor/projetos/ws-orquestrador-demandas`,
  com o caminho absoluto liberado pelo maestro.
- Resultado: passou, com código de saída 0.
  - `next build` compilou com as mesmas rotas da 0.1.2.
  - O `pnpm --version` do estágio final rodou (12.6.0).
  - A imagem saiu como `ws-orquestrador-demandas:local` (`c5267d163176`).
- Tamanho (`docker image ls ws-orquestrador-demandas`): **1,73 GB em disco e 425 MB de conteúdo**, o mesmo da 0.1.2.
- Nada foi publicado: a imagem só existe no Docker local da VPS.
- A imagem 0.1.3 só difere da 0.1.2 no `package.json` (versão). O estágio final não leva `e2e/` nem `test/`, que são o
  resto do diff.

### `.env.example` contra o código

- `src/` não mudou desde a 0.1.2: o diff restrito a `src` saiu vazio. Por isso as variáveis lidas pelo código são as
  mesmas da 05 do pedido 0003, conferidas lá com o grep de `process.env`:
  - `env.ts`: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CABECALHO_IP_CLIENTE` e
    `RETENCAO_TEXTO_BRUTO_DIAS`;
  - `env-worker.ts`: `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `EMAIL_REMETENTE` e `EMAIL_AVISO_DECISAO`;
  - `LOG_LEVEL`, `SENTRY_DSN`, `NODE_ENV` e `NEXT_RUNTIME`.
- O `.env.example` atual tem todas, só pelo nome. O `CI` que a `decisao.spec.ts` usa é do e2e e já está na seção
  "só para o e2e". Nenhuma variável nova.
- Desta vez o grep não rodou (ver Decisões tomadas).

### Pipeline e homologação continuam valendo sem mudança

- **`ci.yml`:**
  - roda `lint`, `typecheck`, `test` (Testcontainers), `test:e2e` contra o build de produção, `pnpm audit`, gitleaks no
    histórico e `docker build` sem publicar;
  - dispara em `pull_request` e por `workflow_call`; não usa segredo, não publica imagem e não chama webhook;
  - o teste novo de 404 e sessão entra sozinho no `pnpm test:e2e`;
  - no GitHub Actions, com `CI` definido e banco novo, o "Arquivar" parte de `ORIGENS_DO_FLUXO` e passa. Se a partida
    for outra, ele reprova, sem pular. O job e2e tem de terminar com 0 pulado.
- **`deploy.yml`:**
  - dispara só em `push` na `main`, e o job `publicar` repete a guarda `github.ref == 'refs/heads/main'`;
  - lê a versão do `package.json`, então a imagem sai com a tag `v0.1.3` sem mudança no workflow.
- **`.dockerignore`:** `.env`, `.env.*`, `.git`, `.github` e `docs` continuam fora do contexto.
- **`docker-compose.hml.yml`:** sem mudança. O `homologar` da Parada 3 passa `CI: '1'` com banco novo e prova ali o
  ramo do CI do "Arquivar" (04-maestro, Decisões).

### Na publicação da 0.1.3 (Fabiano, depois do merge)

- **Sem migration nova:** `drizzle/` não mudou.
  - No merge, o `deploy.yml` não acha diferença em `drizzle/` desde o commit anterior (`git diff --quiet`) e segue para
    o passo dos webhooks: primeiro o do `worker`, depois o do `app` (`deploy.md`, seção 1, passo 3).
  - A seção 5 (backup → migrate → deploy) não se aplica à 0.1.3.
- **O merge publica a imagem no GHCR.** O passo "Publicar" vem antes dos webhooks, então sobem `:<sha do merge>`,
  `:v0.1.3` e `:latest`.
- **Os segredos de webhook ainda não existem** no repositório (`EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER`, só
  pelo nome). O merge da 0.1.3 **não faz deploy no Easypanel**. Depois de publicar:
  - o passo "Disparar o Easypanel" falha com "Faltam os segredos EASYPANEL_WEBHOOK_APP e EASYPANEL_WEBHOOK_WORKER";
  - a execução fica vermelha;
  - a limpeza das versões antigas do GHCR não roda (o passo não tem `if: always()`), e o pacote continua acumulando
    versões, como nos merges da 0.1.1 e da 0.1.2.
- **Primeira publicação de verdade:** continua a seção 4 do `deploy.md`. A `:latest` passa a ser a 0.1.3, com as mesmas
  7 migrations da 0.1.0.
- **Rollback da 0.1.3: caminho A da seção 6.**
  - Basta trocar a imagem de `worker` e `app`, sem restaurar backup.
  - O journal de migrations da 0.1.3 é igual ao da 0.1.2, então o `/api/saude` da 0.1.2 responde 200 sobre o mesmo banco.
  - Alvo: `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:b8a8c4457dc0603ffb2fc30418cfe906d6684131`, a ponta
    atual da `main` (merge do PR #4, versão 0.1.2).
  - Por que esse e não o merge do PR #3 (`01a26a8`): o PR #4 entrou depois, também com a 0.1.2, e mudou só dois
    `passagens.jsonl` da pasta `docs/`, que o `.dockerignore` deixa fora da imagem. Se o push do PR #4 publicou, a tag
    `v0.1.2` aponta hoje para a imagem dele. `01a26a8` tem o mesmo código e serve de alternativa, se estiver em Packages.
  - Não conferi o GHCR nem as execuções do Actions: estão fora da minha lista Pode. Antes de qualquer rollback, confirme
    a tag em Packages.
  - A volta esperada é sem restaurar e sem migration que altere dado. Nesta etapa da cadeia curta ela não foi ensaiada:
    o ensaio é o `ensaiar-rollback` da Parada 3.

## Decisões tomadas

- Nenhum arquivo de entrega mudou: o diff não toca em src, scripts, drizzle, .github, Dockerfile, docker-compose.hml.yml nem docs/operacao, e o contrato da 05 manda alterar só o que a correção exigir.
- Por liberação do maestro, por delegação de Fabiano (02/11, até 18h de Brasília), rodou o docker build com o caminho absoluto do repositório, em primeiro plano e com timeout de 600000. Resultado: passou, com código de saída 0. Imagem ws-orquestrador-demandas:local (c5267d163176), com 1,73 GB em disco e 425 MB de conteúdo, igual à 0.1.2. Depois de 180 s, o ambiente passou o comando para segundo plano, já na fase de exportação da imagem. Não li a saída gravada em /tmp, como o maestro proibiu. O fim foi confirmado pelo aviso de término, com código 0, e pelo docker image ls.
- O grep de process.env em src não rodou. O maestro proibiu grep no Bash, e a ferramenta Grep não estava disponível nesta sessão. A conferência do .env.example se apoia no diff restrito a src, que saiu vazio, e na conferência com grep da 05 do pedido 0003 sobre o mesmo src.
- O alvo do rollback é b8a8c44 e não 01a26a8: é a ponta da main, a última imagem 0.1.2 que o deploy.yml construiu, e o PR #4 não mudou nada que entre na imagem.
- O deploy.md fica como está, como na 05 dos pedidos 0002 e 0003. Os passos das seções 4, 5 e 6 valem para a 0.1.3, e só mudam o campo "Versão", a frase da :latest na seção 4 e o alvo do rollback na seção 6. A 06-documentacao atualiza isso junto com o CHANGELOG da 0.1.3.
- O homologar e o ensaiar-rollback não rodaram: são critérios da 09, e a Parada 3 os roda.
- No começo da etapa, rodou pelo Bash um ls -la das pastas dos pedidos 0003 e 0004. Só lê e está fora da lista Pode. A liberação de Fabiano está no passagens.jsonl (volta 1), e por isso, como no docker build, o comando fica registrado aqui e não em Comandos executados.

## Pendências

- Para a `06-documentacao`, em `docs/operacao/deploy.md`:
  - tabela do topo: "Versão" para `0.1.3` e "Atualizado em";
  - seção 4: a `:latest` da primeira publicação passa a ser a 0.1.3, ainda com as mesmas 7 migrations;
  - seção 6: a 0.1.3 não traz migration, e a volta dela é o caminho A, para
    `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:b8a8c4457dc0603ffb2fc30418cfe906d6684131` (a `v0.1.2`). O
    parágrafo da 0.1.2 fica como histórico, como o da 0.1.1.
- Para Fabiano, antes da primeira publicação: continua a pendência dos PR #1 a #3. Cadastrar no GitHub os segredos
  `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER` (Settings → Secrets and variables → Actions), com as URLs de deploy
  dos serviços `app` e `worker` do Easypanel. Os serviços seguem a seção 4 do `deploy.md`.
  - Até lá, todo push na `main` publica a imagem no GHCR e fica vermelho no passo dos webhooks, sem deploy.
  - Até lá, a limpeza do GHCR também não roda, e o pacote acumula versões além das 2.
  - Antes de qualquer passo, snapshot da VPS no hPanel.
- Continuam de antes, sem mudança neste pedido: as actions por SHA e o tamanho da imagem (1,73 GB por causa do `tsx`),
  na seção 10 do `deploy.md`.
- A imagem local `ws-orquestrador-demandas:local` (1,73 GB) ficou no Docker da VPS, no lugar da 0.1.2, na mesma tag.
  Não a apaguei, porque apagar não está na minha lista Pode.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo construcao/DEC-DEM-20261102-0004-v1, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat main...HEAD` — 10 arquivos: 3 de código (`e2e/decisao.spec.ts`, `package.json` e `test/estatico/projeto.test.ts`) e 7 da pasta do pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --format=%H%x20%s -4 main` — main em b8a8c4457dc0603ffb2fc30418cfe906d6684131 (merge do PR #4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — 462a62d (04-revisao) no topo, sobre b8a8c44
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff main...HEAD -- package.json` — só `version` 0.1.2 → 0.1.3
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --first-parent --format=%H%x20%s -6 main` — merges: PR #4 b8a8c44, PR #3 01a26a8, PR #2 30b71b5, PR #1 dd8ddee
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 01a26a8321a1bd630c6bb1f70a8b68bfa5bd775f b8a8c4457dc0603ffb2fc30418cfe906d6684131` — o PR #4 mudou só 2 `passagens.jsonl` em `docs/`
- `docker image ls ws-orquestrador-demandas` — `ws-orquestrador-demandas:local` (c5267d163176), 1,73 GB em disco, 425 MB de conteúdo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat main...HEAD -- src scripts drizzle .github Dockerfile .dockerignore docker-compose.hml.yml docker-entrypoint.sh .env.example docs/operacao` — vazio: nenhum desses mudou

## Critério de pronto atendido

- [x] o CI roda lint, typecheck, test e, se houver tela, e2e (`ci.yml` sem mudança; o teste novo de 404 e sessão entra no `pnpm test:e2e`)
- [x] `docker build` local passa (comando e tamanho da imagem na entrega: 1,73 GB em disco, 425 MB de conteúdo)
- [x] `.env.example` tem toda variável lida pelo código (`src/` igual ao da 0.1.2, conferido com grep na 05 do pedido 0003; desta vez sem grep, ver Decisões tomadas)
- [x] o rollback está descrito passo a passo (`deploy.md`, seção 6; a 0.1.3 usa o caminho A, com alvo `b8a8c44`, a `v0.1.2`)
- [x] nenhum arquivo tem segredo (nenhum arquivo de entrega mudou; esta entrega cita os segredos só pelo nome)
- [x] nenhuma imagem foi publicada e nenhum webhook foi chamado
- [x] `deploy.yml` só dispara em `push` na `main`; nenhum workflow publica imagem nem chama webhook em outro ramo ou em `pull_request`
