---
pedido: DEC-DEM-20261102-0005-v1
etapa: 05-entrega
agente: devops-sre
leu: [pedido.json, contrato-passagem.md, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-frontend.md, 04-qa-automacao.md, 04-maestro.md, passagens.jsonl, DEC-DEM-20261102-0004-v1/05-devops-sre.md, Dockerfile, .dockerignore, .github/workflows/ci.yml, .github/workflows/deploy.yml, docs/operacao/deploy.md, test/estatico/decisao-e2e.test.ts (linhas 1 a 40), git diff main...HEAD]
status: pronto
proximo: documentacao-tecnica
devolvido_para: null
---
## Entrega

Conferi a entrega da 0.1.4 contra a da 0.1.3. **Nenhum arquivo de entrega foi alterado**, e estes três pontos continuam
valendo:

- o `docker build` local passa;
- o `.env.example` cobre toda variável que o código lê;
- os procedimentos do `deploy.md` valem para a 0.1.4 como estão.

O metadado de versão, a frase da `:latest` e o alvo do rollback ficam para a `06-documentacao` (Pendências).

### O que mudou entre a `main` (0.1.3, `00a924e`) e o ramo

Pelo `git diff --stat main...HEAD`, mudaram 11 arquivos:

- 4 de código, todos de teste ou de versão:
  - `e2e/decisao.spec.ts`: o axe no "Arquivar" e o reflow do cabeçalho;
  - `test/estatico/decisao-e2e.test.ts`: arquivo novo, da 04-regressao;
  - `test/estatico/projeto.test.ts`: o `it` da versão;
  - `package.json`: só o campo `version`, de `0.1.3` para `0.1.4`;
- 7 da pasta do pedido.

Rodei o `git diff --stat main...HEAD` só nos caminhos `src`, `scripts`, `drizzle`, `.github`, `Dockerfile`,
`.dockerignore`, `docker-compose.hml.yml`, `docker-entrypoint.sh`, `.env.example` e `docs/operacao`, e ele saiu vazio:
nada disso mudou. O axe não achou violação na tela arquivada, então `src/` ficou como estava (03 e 04-maestro).

### `docker build` local

- **Comando:** `docker build -t ws-orquestrador-demandas:local /home/deploy/servidor/projetos/ws-orquestrador-demandas`.
  Rodou em primeiro plano, com o caminho absoluto liberado pelo maestro (Decisões tomadas).
- **Resultado:** passou, até o fim, sem erro.
  - `pnpm install --frozen-lockfile`: 621 pacotes, com o lockfile aprovado nas políticas de cadeia de suprimentos.
  - `next build`: compilou, com o TypeScript limpo e as mesmas rotas da 0.1.3.
  - `pnpm --version` do estágio final: `12.6.0`.
  - Imagem: `ws-orquestrador-demandas:local`, com id `9217c6ccf026`.
- **Tamanho** (`docker image ls ws-orquestrador-demandas`): **1,74 GB em disco e 425 MB de conteúdo**. É praticamente
  o mesmo da 0.1.3, que tinha 1,73 GB e 425 MB.
- **Nada foi publicado:** a imagem só existe no Docker local da VPS.
- **O que muda na imagem:**
  - O estágio final copia `src`, `scripts`, `drizzle`, `.next` e os arquivos de configuração da raiz. Ele não leva
    `e2e/` nem `test/`.
  - Por isso a imagem 0.1.4 difere da 0.1.3 só no `package.json` (a versão) e no `.next` refeito, sem mudança de código.
- Antes do `docker build`, rodei também o `pnpm build` no repositório: passou, e o `git status` depois saiu limpo.

### `.env.example` contra o código

- O `src/` não mudou desde a 0.1.3: o diff restrito a `src` saiu vazio.
- O arquivo de teste novo lê só arquivos do repositório, sem `process.env`.
- Por isso as variáveis lidas pelo código são as mesmas da 05 do pedido 0003, que as conferiu com o grep de
  `process.env`:
  - `env.ts`: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CABECALHO_IP_CLIENTE` e
    `RETENCAO_TEXTO_BRUTO_DIAS`;
  - `env-worker.ts`: `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `EMAIL_REMETENTE` e `EMAIL_AVISO_DECISAO`;
  - além dessas, `LOG_LEVEL`, `SENTRY_DSN`, `NODE_ENV` e `NEXT_RUNTIME`.
- O `.env.example` tem todas, só pelo nome, e não há variável nova.
- Desta vez o grep não rodou (ver Decisões tomadas).

### Pipeline: continua valendo sem mudança

- **`ci.yml`:**
  - dispara em `pull_request` e por `workflow_call`;
  - roda `lint`, `typecheck`, `test`, `test:e2e`, `pnpm audit`, gitleaks e `docker build` sem publicar;
  - não usa segredo e não chama webhook.
- **O que este pedido acrescenta ao CI:**
  - o `test/estatico/decisao-e2e.test.ts` entra sozinho no `pnpm test`;
  - esse teste usa `globSync` de `node:fs` e só lê arquivos do checkout, sem git nem rede, então roda no Node 24 do CI;
  - a fixture da 0.1.3 está no próprio arquivo, então ele não exige histórico;
  - o "Arquivar" com o axe novo entra no `pnpm test:e2e`.
- **`deploy.yml`:**
  - dispara só em `push` na `main`, e o job `publicar` repete a guarda `github.ref == 'refs/heads/main'`;
  - lê a versão do `package.json`, então a imagem sai com a tag `v0.1.4` sem mudança no workflow.
- **`.dockerignore`:** `.env`, `.env.*`, `.git`, `.github` e `docs` continuam fora do contexto.

### Na publicação da 0.1.4 (Fabiano, depois do merge)

- **Sem migration nova:** `drizzle/` não mudou.
  - O `deploy.yml` segue direto para o passo dos webhooks.
  - A seção 5 do `deploy.md` (backup, migrate e deploy) não se aplica.
- **O merge publica a imagem no GHCR**, com as tags `:<sha do merge>`, `:v0.1.4` e `:latest`.
- **Os segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER` continuam sem cadastro.** Até lá, como nos merges
  da 0.1.1 à 0.1.3:
  - o passo "Disparar o Easypanel" falha e a execução fica vermelha, sem deploy;
  - a limpeza do GHCR não roda.
- **Rollback da 0.1.4: caminho A da seção 6.**
  - Basta trocar a imagem de `worker` e `app`, sem restaurar backup.
  - O journal de migrations da 0.1.4 é igual ao da 0.1.3, então o `/api/saude` da 0.1.3 responde 200 sobre o mesmo
    banco.
  - Alvo: `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:00a924ec746d731c9c0c9fb9a95bcf4c6d7f3c17`, a
    `v0.1.3`. É o merge do PR #5 e a ponta atual da `main`.
  - Antes de voltar, confirme a tag em Packages. Não conferi o GHCR, que está fora da minha lista Pode.
  - Nesta etapa da cadeia curta, a volta não foi ensaiada. O ensaio é o `ensaiar-rollback` da Parada 3.

## Decisões tomadas

- Nenhum arquivo de entrega mudou. O diff não toca em src, scripts, drizzle, .github, Dockerfile, docker-compose.hml.yml nem docs/operacao, e o contrato da 05 e a 02-tech-lead mandam alterar só o que a correção exigir.
- Na volta 0, a etapa ficou bloqueada no docker build, por duas razões:
  - o `docker build -t ws-orquestrador-demandas:local .` da lista Pode usa o diretório atual como contexto, e o meu Bash começa na estruturaAutonoma;
  - a forma com o caminho absoluto estava vedada naquela hora.
- Por liberação do maestro, por delegação de Fabiano (02/11, até 20h de Brasília), rodou o docker build com o caminho absoluto do repositório, em primeiro plano, sem pipe nem redirecionamento, só para imagem local e sem publicar nada. Resultado: passou, sem erro. A imagem ws-orquestrador-demandas:local (9217c6ccf026) tem 1,74 GB em disco e 425 MB de conteúdo. Como no pedido 0003, o comando fica registrado aqui e não em Comandos executados. O docker image ls, que leu o tamanho, está na lista Pode e fica lá.
- Rodei o pnpm build (lista Pode) antes da liberação, para adiantar a conferência. Ele não substitui o docker build, que rodou depois.
- O grep de process.env em src não rodou: no meu Bash, ele procuraria no src da estruturaAutonoma, e a ferramenta Grep não está disponível nesta sessão. A conferência do .env.example se apoia no diff restrito a src, que saiu vazio, e no grep que a 05 do pedido 0003 rodou sobre o mesmo src.
- O alvo do rollback é 00a924e: é o merge do PR #5, a única imagem 0.1.3 que o deploy.yml construiu, e a ponta da main.
- O deploy.md fica como está, como nas 05 dos pedidos 0002 a 0004. Só mudam o campo "Versão", a frase da :latest na seção 4 e o alvo do rollback na seção 6, e quem faz isso é a 06-documentacao, junto com o CHANGELOG.

## Pendências

- Para a `06-documentacao`, em `docs/operacao/deploy.md`:
  - na tabela do topo, "Versão" para `0.1.4` e "Atualizado em";
  - na seção 4, a `:latest` da primeira publicação passa a ser a 0.1.4, ainda com as mesmas 7 migrations;
  - na seção 6, registrar que a 0.1.4 não traz migration e que a volta dela é o caminho A, para
    `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:00a924ec746d731c9c0c9fb9a95bcf4c6d7f3c17` (a `v0.1.3`). O
    parágrafo da 0.1.3 fica como histórico.
- Para Fabiano, antes da primeira publicação, continua a pendência dos PR #1 a #5:
  - cadastrar no GitHub os segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER`;
  - seguir a seção 4 do `deploy.md`;
  - antes de qualquer passo, tirar snapshot no hPanel.
- Continuam de antes, sem mudança neste pedido: as actions por SHA e o tamanho da imagem, na seção 10 do `deploy.md`.
- A imagem local `ws-orquestrador-demandas:local` (1,74 GB) ficou no Docker da VPS, no lugar da 0.1.3, na mesma tag.
  Não a apaguei, porque apagar não está na minha lista Pode.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo construcao/DEC-DEM-20261102-0005-v1, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -10` — 760a616 (04-revisao) no topo, sobre 00a924e (main 0.1.3)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat main...HEAD` — 11 arquivos: 4 de código (`e2e/decisao.spec.ts`, `package.json`, `test/estatico/decisao-e2e.test.ts` e `test/estatico/projeto.test.ts`) e 7 da pasta do pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat main...HEAD -- src scripts drizzle .github Dockerfile .dockerignore docker-compose.hml.yml docker-entrypoint.sh .env.example docs/operacao` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff main...HEAD -- package.json` — só `version` 0.1.3 → 0.1.4
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --first-parent --format=%H%x20%s -6 main` — merge do PR #5 em 00a924ec746d731c9c0c9fb9a95bcf4c6d7f3c17 (0.1.3)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas build` — passou; TypeScript limpo, as mesmas rotas
- `docker image ls ws-orquestrador-demandas` — antes do build: só a imagem anterior (c5267d163176), 1,73 GB em disco, 425 MB de conteúdo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — vazio depois do pnpm build
- `docker image ls ws-orquestrador-demandas` — depois do build: `ws-orquestrador-demandas:local` (9217c6ccf026), 1,74 GB em disco, 425 MB de conteúdo

## Critério de pronto atendido

- [x] o CI roda lint, typecheck, test e, se houver tela, e2e (`ci.yml` sem mudança; o teste estático novo entra no `pnpm test` e o axe do arquivado no `pnpm test:e2e`)
- [x] `docker build` local passa (comando e tamanho da imagem na entrega: 1,74 GB em disco, 425 MB de conteúdo)
- [x] `.env.example` tem toda variável lida pelo código (`src/` igual ao da 0.1.3, conferido com grep na 05 do pedido 0003; desta vez sem grep, ver Decisões tomadas)
- [x] o rollback está descrito passo a passo (`deploy.md`, seção 6; a 0.1.4 usa o caminho A, com alvo `00a924e`, a `v0.1.3`)
- [x] nenhum arquivo tem segredo (nenhum arquivo de entrega mudou; esta entrega cita os segredos só pelo nome)
- [x] nenhuma imagem foi publicada e nenhum webhook foi chamado
- [x] `deploy.yml` só dispara em `push` na `main`; nenhum workflow publica imagem nem chama webhook em outro ramo ou em `pull_request`
