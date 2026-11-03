---
pedido: DEC-DEM-20261103-0006-v1
etapa: 05-entrega
agente: devops-sre
leu: [pedido.json, contrato-passagem.md, padrao-tecnico.md, 02-tech-lead.md, 03-engenheiro-backend.md, 04-maestro.md, DEC-DEM-20261102-0005-v1/05-devops-sre.md, Dockerfile, .dockerignore, .env.example, .github/workflows/ci.yml, .github/workflows/deploy.yml, docs/operacao/deploy.md, git diff main...HEAD]
status: pronto
proximo: documentacao-tecnica
devolvido_para: null
---
## Entrega

Conferi a entrega da 0.1.5 contra a da 0.1.4 (`main`, `cf36ec5`). **Nenhum arquivo de entrega foi alterado**: a
correção não exige mudança em pipeline, imagem, variável nem procedimento, como a `02-tech-lead` previu ("Para a
`05-entrega`: nada muda em `Dockerfile`, nos workflows nem em `docs/operacao/`").

### O que mudou entre a `main` (0.1.4) e o ramo

- Pelo `git diff --stat cf36ec5 HEAD`: 30 arquivos.
  - 8 de código de produção em `src/` (`transicoes.ts`, os três serviços de ESP, RSK e DEC, `entrada-agente.ts`,
    `executar.ts`, `aviso-dec.ts` e o cabeçalho de `aviso-dec-pronto.ts`);
  - testes de unidade e integração em `src/` e `test/estatico/projeto.test.ts`;
  - `e2e/fila-qa.spec.ts` e `e2e/fila.spec.ts` (esperas novas da 04-regressao);
  - `package.json`, só o `version` de `0.1.4` para `0.1.5`;
  - 7 da pasta do pedido.
- O `git diff --stat main...HEAD` restrito a `scripts`, `drizzle`, `.github`, `Dockerfile`, `.dockerignore`,
  `docker-compose.hml.yml`, `docker-entrypoint.sh`, `.env.example`, `docs/operacao`, `src/db`, `next.config.ts`,
  `pnpm-lock.yaml` e `pnpm-workspace.yaml` saiu **vazio**:
  - sem migration nova e sem mudança de schema;
  - sem dependência nova (lockfile igual);
  - sem mudança de pipeline, imagem ou configuração do Next.

### `docker build` local

- **Comando:** `docker build -t ws-orquestrador-demandas:local /home/deploy/servidor/projetos/ws-orquestrador-demandas`
  (caminho absoluto no lugar do `.`, ver Decisões tomadas). Em primeiro plano, só imagem local.
- **Resultado:** passou, até o fim, sem erro.
  - `pnpm install --frozen-lockfile`: 621 pacotes, lockfile aprovado nas políticas de cadeia de suprimentos
    (814 entradas), resolução pulada ("Lockfile is up to date").
  - `next build`: compilou em 23,3 s, TypeScript limpo em 42 s, as mesmas rotas da 0.1.4.
  - `pnpm --version` no estágio final, como `node`: `12.6.0`.
- **Imagem:** `ws-orquestrador-demandas:local`, id `2f1c01150e0a` (saída do build: "exporting layers", exit 0).
- **Tamanho** (`docker image ls ws-orquestrador-demandas`): **1,73 GB em disco e 425 MB de conteúdo**, praticamente
  igual à 0.1.4 (1,74 GB e 425 MB).
- **Nada foi publicado:** a imagem só existe no Docker local da VPS. Nenhum `docker push`, nenhum webhook.
- **O que muda na imagem:** o estágio final copia `src`, `scripts`, `drizzle`, `.next` e a configuração da raiz, sem
  `e2e/` nem `test/`. A 0.1.5 difere da 0.1.4 nos 8 arquivos de `src/` citados acima (e nos testes ao lado deles, que
  vão junto no `COPY src`), no `package.json` e no `.next` refeito.

### `.env.example` contra o código

- `git diff main...HEAD -G "process\.env" -- src e2e scripts test` saiu **vazio**: nenhuma linha que lê
  `process.env` foi acrescentada nem removida neste pedido.
- O M-03 usa `config.urlBase` e o enviador que já existiam; nenhum dos três defeitos lê variável nova.
- Logo, as variáveis lidas pelo código são as mesmas da 0.1.4, conferidas com o grep de `process.env` na 05 do pedido
  0003:
  - `env.ts`: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CABECALHO_IP_CLIENTE` e
    `RETENCAO_TEXTO_BRUTO_DIAS`;
  - `env-worker.ts`: `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `EMAIL_REMETENTE` e `EMAIL_AVISO_DECISAO`;
  - além dessas, `LOG_LEVEL`, `SENTRY_DSN`, `NODE_ENV` e `NEXT_RUNTIME`.
- O `.env.example` tem todas, só pelo nome.

### Pipeline: continua valendo sem mudança

- **`ci.yml`:** dispara em `pull_request` e por `workflow_call`; roda `lint`, `typecheck`, `test` (Testcontainers),
  `test:e2e`, `pnpm audit --prod --audit-level high`, gitleaks no histórico e `docker build` sem publicar; não usa
  segredo e não chama webhook.
  - Os testes novos (incluindo o arquivo novo `src/modules/pareceres-risco/servico.test.ts`) entram sozinhos no
    `pnpm test`; as esperas novas do `e2e/` entram no `pnpm test:e2e`.
  - O `pnpm test` passa de 3.794 para 3.811 testes (04-maestro). O job `verificar` tem 30 min de limite e a 03 mediu
    163 s localmente: folga suficiente.
- **`deploy.yml`:** dispara só em `push` na `main`, e o job `publicar` repete a guarda
  `github.ref == 'refs/heads/main'`. Lê a versão do `package.json`, então a imagem sai com a tag `v0.1.5` sem mudança
  no workflow.
- **`.dockerignore`:** `.env`, `.env.*`, `.git`, `.github` e `docs` continuam fora do contexto.

### Na publicação da 0.1.5 (Fabiano, depois do merge)

- **Sem migration nova:** `drizzle/` não mudou. O `deploy.yml` segue direto para o passo dos webhooks; a seção 5 do
  `deploy.md` (backup, migrate, deploy) não se aplica.
- **O merge publica a imagem no GHCR**, com as tags `:<sha do merge>`, `:v0.1.5` e `:latest`.
- **Os segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER` continuam sem cadastro.** Até lá, como nos merges
  da 0.1.1 à 0.1.4, o passo "Disparar o Easypanel" falha, a execução fica vermelha sem deploy, e a limpeza do GHCR não
  roda.
- **Mudança de comportamento que a operação deve conhecer** (nenhuma pede ação no painel):
  - ESP, RSK e DEC em demanda `entregue` ou `encerrada` passam a devolver 409 com mensagem fixa;
  - execução de agente na fila de demanda em status final termina `ignorada` (`demanda_final`), sem chamar o provedor:
    menos gasto, não mais;
  - o aviso por e-mail marca `falhou` na primeira recusa definitiva do Resend (4xx que não é 429) e passa a contar o
    erro inesperado; o alerta "erro novo no Sentry" da seção 9 do `deploy.md` passa a receber `aviso_email_falhou`
    nesses dois casos, e `aviso_erro_inesperado` fica só para o banco fora.
- **Rollback da 0.1.5: caminho A da seção 6.**
  - Basta trocar a imagem de `worker` e `app`, sem restaurar backup: o journal de migrations da 0.1.5 é igual ao da
    0.1.4, então o `/api/saude` da 0.1.4 responde 200 sobre o mesmo banco.
  - Nenhuma migration nova e nenhum dado novo de formato diferente: o motivo `demanda_final` vai no `jsonb` do evento,
    que a 0.1.4 lê sem restrição de valor (02-tech-lead). O rótulo dele já cai no texto de reserva
    ("Agente X não rodou") nas duas versões.
  - Alvo: `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:cf36ec5fe634ec27004817e30f656d92a80eb23d`, a
    `v0.1.4`. É o merge do PR #6 e a ponta atual da `main`.
  - Antes de voltar, confirme a tag em Packages. Não conferi o GHCR, que está fora da minha lista Pode.
  - Nesta etapa da cadeia curta a volta não foi ensaiada; o ensaio é o `ensaiar-rollback` da Parada 3.

## Decisões tomadas

- Nenhum arquivo de entrega mudou: o diff não toca em scripts, drizzle, .github, Dockerfile, docker-compose.hml.yml, .env.example nem docs/operacao, e o contrato da 05 manda alterar só o que a correção exigir.
- O docker build rodou com o caminho absoluto do repositório no lugar do `.` (`docker build -t ws-orquestrador-demandas:local /home/deploy/servidor/projetos/ws-orquestrador-demandas`), em primeiro plano e só para imagem local, porque o Bash do agente começa na estruturaAutonoma e o `cd` não persiste entre chamadas. O maestro liberou esse comando por delegação de Fabiano de 03/11 (cria só a imagem local, não publica) e registrou a liberação no `passagens.jsonl`; por isso ele fica aqui e não em "Comandos executados". Resultado: passou, com 621 pacotes, next build com TypeScript limpo e pnpm 12.6.0 no estágio final. O docker image ls, que leu o tamanho, está na lista Pode e fica lá.
- O grep de process.env em src não rodou: o maestro vedou grep pelo Bash e as ferramentas Grep e Glob não estão disponíveis nesta sessão. A conferência do .env.example usa o `git diff -G "process\.env"` (git diff está na lista Pode), que saiu vazio, mais o grep da 05 do pedido 0003 sobre o mesmo src de base.
- Não rodei pnpm lint, typecheck, test nem build fora da imagem: a 03 os deixou verdes (3794 de 3794) e o maestro os confere no verificar; o next build com TypeScript rodou dentro do docker build.
- O alvo do rollback é cf36ec5: é o merge do PR #6, a única imagem 0.1.4 que o deploy.yml construiu, e a ponta da main.
- O deploy.md fica como está, como nas 05 dos pedidos 0002 a 0005: só mudam o campo "Versão", a frase da :latest na seção 4 e o alvo do rollback na seção 6, e quem faz isso é a 06-documentacao, junto com o CHANGELOG.
- O build mostrou next 16.4.1 e better-auth 1.7.7, acima da referência do padrão técnico (16.3.8 e 1.7.6). O lockfile não mudou neste pedido, então isso já vinha da main; não é escopo da 05 e vai para Pendências.

## Pendências

- Para a `06-documentacao`, em `docs/operacao/deploy.md`:
  - na tabela do topo, "Versão" para `0.1.5` e "Atualizado em";
  - na seção 4, a `:latest` da primeira publicação passa a ser a 0.1.5, ainda com as mesmas 7 migrations;
  - na seção 6, registrar que a 0.1.5 não traz migration e que a volta dela é o caminho A, para
    `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:cf36ec5fe634ec27004817e30f656d92a80eb23d` (a `v0.1.4`). O
    parágrafo da 0.1.4 fica como histórico;
  - na seção 9, se couber, dizer que `aviso_email_falhou` agora também cobre o 4xx definitivo e o erro inesperado.
- Para Fabiano, antes da primeira publicação, continua a pendência dos PR #1 a #6: cadastrar no GitHub os segredos
  `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER`, seguir a seção 4 do `deploy.md` e, antes de qualquer passo, tirar
  snapshot no hPanel.
- Para o `/construir` (estruturaAutonoma): a lista Pode do devops-sre tem `grep -rn "process.env" src`, que depende de
  o Bash começar no repositório do pedido; vale garantir Grep e Glob ao subagente.
- Para o `arquiteto-solucoes` ou o `tech-lead`, à parte: conferir se next 16.4.1 e better-auth 1.7.7 da main têm ADR,
  ou atualizar a tabela do padrão técnico (seção 1 pede ADR para mudar de linha do Next).
- Continuam de antes, sem mudança neste pedido: as actions por SHA (o pedido 0007 trata) e o tamanho da imagem, na
  seção 10 do `deploy.md`.
- A imagem local `ws-orquestrador-demandas:local` ficou no Docker da VPS. Não a apaguei, porque apagar não está na minha
  lista Pode.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo construcao/DEC-DEM-20261103-0006-v1, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -12` — f198269 (04-revisao) no topo, sobre cf36ec5 (main 0.1.4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat cf36ec5 HEAD` — 30 arquivos: código e testes em `src/`, dois specs de `e2e/`, `test/estatico/projeto.test.ts`, `package.json` e 7 da pasta do pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat main...HEAD -- scripts drizzle .github Dockerfile .dockerignore docker-compose.hml.yml docker-entrypoint.sh .env.example docs/operacao src/db next.config.ts pnpm-lock.yaml pnpm-workspace.yaml` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff main...HEAD -G "process\.env" -- src e2e scripts test` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff main...HEAD -- package.json` — só `version` 0.1.4 → 0.1.5
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --first-parent --format="%H %s" -3 main` — merge do PR #6 em cf36ec5fe634ec27004817e30f656d92a80eb23d (0.1.4)
- `docker image ls ws-orquestrador-demandas` — antes do build: nenhuma imagem local
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — vazio durante o build
- `docker image ls ws-orquestrador-demandas` — depois do build: `ws-orquestrador-demandas:local` (2f1c01150e0a), 1,73 GB em disco, 425 MB de conteúdo

## Critério de pronto atendido

- [x] o CI roda lint, typecheck, test e, se houver tela, e2e (`ci.yml` sem mudança; os testes novos entram no `pnpm test` e as esperas novas no `pnpm test:e2e`)
- [x] `docker build` local passa (comando e tamanho da imagem na entrega: 1,73 GB em disco, 425 MB de conteúdo)
- [x] `.env.example` tem toda variável lida pelo código (`git diff -G "process\.env"` vazio sobre o src da 0.1.4, conferido com grep na 05 do pedido 0003; desta vez sem grep, ver Decisões tomadas)
- [x] o rollback está descrito passo a passo (`deploy.md`, seção 6; a 0.1.5 usa o caminho A, com alvo `cf36ec5`, a `v0.1.4`)
- [x] nenhum arquivo tem segredo (nenhum arquivo de entrega mudou; esta entrega cita os segredos só pelo nome)
- [x] nenhuma imagem foi publicada e nenhum webhook foi chamado
- [x] `deploy.yml` só dispara em `push` na `main`; nenhum workflow publica imagem nem chama webhook em outro ramo ou em `pull_request`
