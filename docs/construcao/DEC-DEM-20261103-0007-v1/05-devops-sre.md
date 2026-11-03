---
pedido: DEC-DEM-20261103-0007-v1
etapa: 05-entrega
agente: devops-sre
leu: [contrato-passagem.md, padrao-tecnico.md, pedido.json, 02-tech-lead.md, 03-engenheiro-backend.md, 04-maestro.md, .github/workflows/ci.yml, .github/workflows/deploy.yml, docs/operacao/deploy.md, .env.example, package.json (versão), src/lib/env.ts (diff main...HEAD)]
status: pronto
proximo: documentacao-tecnica
devolvido_para: null
---
## Entrega

Os arquivos de entrega já existiam (cadeia curta). Conferi cada um e só mudei o que o D-06 da `02-tech-lead.md` pede:
os SHAs das actions e o texto que os dava como pendentes. `Dockerfile`, `.dockerignore`, `docker-compose.hml.yml` e
`.env.example` não mudam. O ramo não altera nenhum deles nem `drizzle/` em relação à `main` (`git diff --stat
main...HEAD` sem saída), e a 03 não criou variável nova (o diff de `src/lib/env.ts` só exporta `ehLoopback`).

### Arquivos alterados

- **`.github/workflows/ci.yml`:**
  - as 8 linhas `uses:` fixadas pelo SHA completo, com a versão em comentário, sem troca de versão maior:
    - 5 de `actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 # v5.1.0`, nos jobs `verificar`, `e2e`,
      `dependencias`, `segredos` e `imagem`;
    - 3 de `actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444 # v5.0.0`, nos jobs `verificar`, `e2e` e
      `dependencias`;
  - o cabeçalho (linhas 5-7) diz que as actions estão fixadas por SHA e como atualizar, sem falar em pendência.
- **`.github/workflows/deploy.yml`:**
  - a linha `uses:` do job `publicar` passa a `actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 # v5.1.0`;
  - o cabeçalho (linhas 12-13) diz que as actions estão fixadas por SHA, como no `ci.yml`;
  - os gatilhos não mudaram: `on: push: branches: [main]` e o `if` do `publicar` com `push` e `refs/heads/main`. O
    `ci.yml` segue em `pull_request` e `workflow_call`, sem segredo, sem publicar e sem webhook.
- **`docs/operacao/deploy.md`:**
  - seção 10: o item "Actions por SHA" passa a feito em 03/11/2026, com os SHAs, a contagem por arquivo e a regra de
    atualização (SHA e comentário juntos; versão maior pede revisão do `devops-sre`). Saiu a frase do item do gitleaks
    que dizia que as actions seguiam pendentes;
  - seção 6: parágrafo da volta da 0.1.6. Ela não tem migration, então segue o caminho A, para
    `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:e0d5f4c39740275c31e4f4de55874128adb52e78`, a `v0.1.5`
    (commit de merge do PR #7 na `main`). O parágrafo avisa que, depois da volta, o M-05 e o M-06 deixam de valer até a
    correção ser publicada.

São 9 linhas `uses:` ao todo, e nenhuma ficou por tag nem com "SHA pendente" (conferido no `git diff -- .github`).

### Resultado de cada verificação

- **CI:** o job `verificar` roda `pnpm lint`, `pnpm typecheck` e `pnpm test`, e o job `e2e` roda `pnpm test:e2e` (o
  sistema tem tela). Rodam também `pnpm audit`, gitleaks e `docker build` sem publicar. Nenhum passo mudou nesta etapa.
- **`docker build`:** `docker build -t ws-orquestrador-demandas:local /home/deploy/servidor/projetos/ws-orquestrador-demandas`
  passou (código 0). O `next build` do Next 16.4.1 compilou as 33 rotas. Pelo `docker image ls`, a imagem
  `ws-orquestrador-demandas:local` (`ce602d7628ab`) tem **1,74 GB em disco e 426 MB de conteúdo**, o mesmo da 0.1.5. O
  `package.json` copiado para a imagem está na versão 0.1.6.
- **`pnpm test`:** a 1ª rodada, feita ao mesmo tempo que o `docker build`, deu 3873 de 3879, com 6 falhas em 4 arquivos.
  Todas foram por tempo: `statement timeout` no `truncate` de `expurgo-texto-bruto.test.ts` e `Test timed out in
  30000ms` em `rota.test.ts`, `verificacao-qa.test.ts` e `concorrencia.test.ts`. Rodados de novo sozinhos, depois do
  build, esses 4 arquivos passaram **58 de 58**. A suíte inteira de novo, sem o build em paralelo: **3879 de 3879**, em 195 arquivos.
  Esta etapa só mudou YAML e Markdown, que nenhum teste de unidade executa.
- **`.env.example`:** `grep -rn "process.env" src` acha leitura direta só de `NODE_ENV`, `NEXT_RUNTIME`, `SENTRY_DSN` e
  `LOG_LEVEL`. As outras variáveis chegam por `lerConfigApp` e `lerConfigWorker`, que esta versão não mudou. As quatro
  estão no `.env.example`: `SENTRY_DSN` e `LOG_LEVEL` como variáveis, e `NODE_ENV` e `NEXT_RUNTIME` em comentário,
  porque vêm da imagem e do Next.
- **Rollback:** está descrito passo a passo na seção 6 do `deploy.md`: caminho A sem migration e caminho B com
  restauração do backup. A 0.1.6 cai no caminho A, com o alvo nomeado pelo SHA. Na cadeia curta, o ensaio na
  homologação é o `ensaiar-rollback` da Parada 3, como nos pedidos 0001 a 0006.
- **Segredo:** nenhum arquivo tocado tem valor de segredo. Os workflows citam só nomes (`EASYPANEL_WEBHOOK_APP`,
  `EASYPANEL_WEBHOOK_WORKER`, `GITHUB_TOKEN`), e os SHAs das actions são públicos.
- **Nada publicado:** sem `docker push`, sem push de git, sem chamada de webhook e sem Easypanel. A imagem só existe
  no Docker local.

## Decisões tomadas

- Os SHAs são exatamente os do D-06 e da ESP, conferidos pelo maestro na API do GitHub. A versão maior (v5) ficou, como
  a ESP pede. O CI do PR prova que resolvem, como a 02 e a 04 registram.
- Usei o `replace_all` da ferramenta Edit nas 8 linhas do `ci.yml`, que eram iguais por action, e conferi o resultado
  linha a linha no `git diff`.
- O cabeçalho dos dois workflows diz como atualizar (SHA e comentário juntos). Assim a próxima atualização não deixa um
  SHA velho com comentário de versão nova.
- Acrescentei a volta da 0.1.6 na seção 6 do `deploy.md`, porque o rollback com alvo nomeado é critério desta etapa e
  a seção só ia até a 0.1.5. O alvo é o merge do PR #7 (`e0d5f4c`), lido no `git log main`.
- Não mexi no cabeçalho do `deploy.md` (versão 0.1.5 e "Atualizado em") nem na seção 4 (primeira publicação com a
  0.1.5): a troca da versão no manual é da `06-documentacao`, como nos pedidos anteriores.
- Dois comandos rodaram com o caminho absoluto do repositório do pedido no lugar do relativo da lista **Pode**, porque
  o Bash desta sessão começa na estruturaAutonoma e o `cd ... &&` está vetado. O maestro liberou os dois e os registrou
  no `passagens.jsonl`, e por isso eles ficam fora de "Comandos executados":
  - o `docker build -t ws-orquestrador-demandas:local` com o caminho do repositório como contexto (código 0), por
    delegação de Fabiano de 03/11. Ele só cria a imagem local e não publica nada;
  - o `grep -rn "process.env"` no `src` do repositório, pela regra de Fabiano de 25/10 sobre comando só de leitura.
    Achou `NODE_ENV`, `NEXT_RUNTIME`, `SENTRY_DSN` e `LOG_LEVEL` lidos direto, e o resto por `lerConfigApp` e
    `lerConfigWorker`.
- O `grep -rn "process.env" src` rodou antes como está na lista e falhou, porque a sessão não está no repositório.
- A 1ª rodada do `pnpm test` disputou CPU e disco com o `docker build`, e as 6 falhas foram todas por tempo, em testes
  de banco e de concorrência. Por isso rodei os 4 arquivos sozinhos e a suíte inteira de novo, em vez de devolver.
- As ferramentas Grep e Glob não estão disponíveis nesta sessão. Li tudo com a ferramenta Read e conferi que não
  sobrou "SHA pendente" pelo `git diff` e pela leitura inteira dos dois workflows.

## Pendências

- Para a Parada 3 (maestro): o CI do PR prova os 9 SHAs. Se algum job falhar em "Set up job" com a action não
  encontrada, o SHA está errado, e a correção volta ao `devops-sre`.
- Para a Parada 3: `construir.mjs homologar` e `ensaiar-rollback` não estão na lista **Pode** da `05-entrega` e não
  rodaram aqui. Sem migration nova, a saída do ensaio deve dar `volta_sem_restaurar: true` e `alteram_dado: false`.
- Para a `06-documentacao`: o cabeçalho do `deploy.md` (versão 0.1.6 e "Atualizado em"), a seção 4, que fala da
  primeira publicação com a 0.1.5, e a entrada "as actions estão fixadas por SHA" no `CHANGELOG.md` da 0.1.6.
- Sugestão fora deste pedido: a cada atualização do `actions/checkout` ou do `actions/setup-node`, o SHA e o
  comentário mudam juntos. Um Dependabot ou Renovate para `github-actions` faria isso sozinho.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261103-0007-v1`, limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -8 --format="%h %ci %s"` — última passagem 93dc27c (04-revisao)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat main...HEAD -- drizzle Dockerfile .dockerignore docker-entrypoint.sh docker-compose.hml.yml .env.example` — sem saída: nada disso mudou em relação à main
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -3 --format="%H %ci %s" main` — merge do PR #7 em e0d5f4c39740275c31e4f4de55874128adb52e78 (0.1.5)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- .github` — 9 linhas `uses:` trocadas e 2 cabeçalhos
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 3873 de 3879, 6 por tempo em 4 arquivos, junto com o build
- `grep -rn "process.env" src` — falhou: a sessão não está no repositório (`src: No such file or directory`)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat main...HEAD -- src/lib/env.ts src/lib/env-worker.ts` — só `env.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff main...HEAD -- src/lib/env.ts` — só exporta `ehLoopback`, sem variável nova
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 3 alterados (`ci.yml`, `deploy.yml`, `deploy.md`) e esta entrega
- `docker image ls ws-orquestrador-demandas` — `:local`, 1,74 GB em disco, 426 MB de conteúdo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/jobs/expurgo-texto-bruto.test.ts src/lib/rota.test.ts src/modules/acesso/verificacao-qa.test.ts src/modules/pacotes-decisao/concorrencia.test.ts` — 58 de 58
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 3879 de 3879, 195 arquivos, sem o build em paralelo

## Critério de pronto atendido

- [x] o CI roda lint, typecheck, test e, se houver tela, e2e
- [x] `docker build` local passa (comando e tamanho da imagem na entrega)
- [x] `.env.example` tem toda variável lida pelo código (conferido com `grep -rn "process.env" src`)
- [x] o rollback está descrito passo a passo
- [x] nenhum arquivo tem segredo
- [x] nenhuma imagem foi publicada e nenhum webhook foi chamado
- [x] `deploy.yml` só dispara em `push` na `main`; nenhum workflow publica imagem nem chama webhook em outro ramo ou em `pull_request`
