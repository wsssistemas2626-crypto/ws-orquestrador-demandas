---
pedido: DEC-DEM-20261111-0017-v1
etapa: 09-entrega
agente: devops-sre
leu: [contrato-passagem.md, padrao-tecnico.md, pedido.json, tarefas.json, 02-arquiteto-solucoes.md, 05-tech-lead.md (linhas 20 a 89), 06-T06-engenheiro-dados-bd.md (linhas 60 a 148), 08-maestro.md, plano 2026-11-12-ws-orquestrador-demandas-plano.md (linhas 2725 a 2772), DEC-DEM-20261112-0019-v1/05-devops-sre.md (formato, pela main), .github/workflows/ci.yml, .github/workflows/deploy.yml, Dockerfile, .dockerignore, docker-compose.hml.yml, .env.example, docs/operacao/deploy.md, drizzle/0008_slippery_whirlwind.sql, drizzle/0009_rls_andamento_construcao.sql, scripts/migrate.ts, src/lib/env.ts, src/lib/env-worker.ts, src/lib/rota.ts (linhas 140 a 189), src/app/api/pedidos-construcao/[decId]/andamento/route.ts, src/modules/andamento/consultas.test.ts (linhas 60 a 219), estruturaAutonoma ferramentas/construir/enviar-andamento.mjs, estruturaAutonoma ferramentas/status-report/enviar-andamento.sh]
status: bloqueado
proximo: documentacao-tecnica
devolvido_para: null
---
## Entrega

A 0.4.0 não mexe no pipeline nem na imagem. A base é a `main` em `0ac099a` (merge do PR #18, 0.3.1), que o maestro
informa estar em produção. O `git diff --stat main...HEAD` dos arquivos de entrega (`.github`, `Dockerfile`,
`.dockerignore`, `docker-compose.hml.yml`, `docker-entrypoint.sh`, `.env.example`, `docs/operacao`, `package.json` e
`drizzle`) mostra só:

- o `package.json`, na versão 0.4.0 (era 0.3.1);
- as migrations `0008_slippery_whirlwind` e `0009_rls_andamento_construcao`, com os snapshots e o journal.

Não mudaram as variáveis, o worker, os scripts de operação (fora o seed e testes), o lockfile, o `next.config.ts` nem o
`playwright.config.ts`. Não alterei `ci.yml`, `deploy.yml`, `Dockerfile`, `.dockerignore`, `docker-compose.hml.yml`
nem `.env.example`. Só `docs/operacao/deploy.md` mudou: 193 linhas incluídas e 6 tiradas.

### Verificações

| Verificação | Resultado |
|---|---|
| CI (`ci.yml`) | Dispara em `pull_request` e `workflow_call`. Roda `pnpm install --frozen-lockfile`, lint, typecheck, test (Testcontainers), e2e (Playwright contra o build de produção), `pnpm audit --prod --audit-level high`, gitleaks e `docker build` sem publicar. Não publica imagem, não usa segredo e não chama webhook. Igual à `main` |
| Deploy (`deploy.yml`) | Dispara só em `on: push: branches: [main]`. O job `publicar` tem `if: github.event_name == 'push' && github.ref == 'refs/heads/main'`. Igual à `main`. No merge da 0.4.0, o passo "Migration nova neste push?" dá `sim`, porque o push traz a `0008` e a `0009`. Assim, os webhooks **não** são chamados, e a publicação segue à mão (deploy.md, seção 5) |
| Imagem (`docker build`) | `docker build -t ws-orquestrador-demandas:local /home/deploy/servidor/projetos/ws-orquestrador-demandas` saiu com código 0. O `next build` lista a rota nova `/api/pedidos-construcao/[decId]/andamento`. Pelo `docker image ls ws-orquestrador-demandas`, a imagem `ws-orquestrador-demandas:local` tem **1,77 GB em disco e 441 MB de conteúdo** (na 0.3.1 eram 1,77 GB e 440 MB). Nada foi publicado |
| Migrations | A `0008` cria a tabela `andamento_construcao` vazia, com 5 CHECK, 2 chaves estrangeiras (para `demanda` e `pacote_decisao`) e 3 índices. A `0009` só faz `GRANT SELECT, INSERT` ao `orquestrador_app`. As duas são aditivas: nenhuma linha muda e nenhuma migration da `main` foi editada (o diff de `drizzle/` só acrescenta). O `scripts/migrate.ts` usa o `migrate` do Drizzle, que aplica as pendentes numa transação só |
| Variáveis (`process.env`) | `grep -rn "process.env" src` mostra as leituras de `NEXT_RUNTIME`, `SENTRY_DSN`, `NODE_ENV` e `LOG_LEVEL` e os dois leitores (`env.ts` e `env-worker.ts`). Os esquemas dos leitores pedem `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL`, `CABECALHO_IP_CLIENTE`, `RETENCAO_TEXTO_BRUTO_DIAS`, `NODE_ENV`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `EMAIL_REMETENTE` e `EMAIL_AVISO_DECISAO`. Fora deles, `scripts/migrate.ts` lê `DATABASE_URL_MIGRATOR`. Todas estão no `.env.example`, por nome. Nenhuma variável nova na 0.4.0 |
| Segredo | Nenhum arquivo do ramo tem segredo. O `deploy.md` cita variáveis, segredos e tokens só pelo nome. As senhas do `docker-compose.hml.yml` são as fictícias de antes. Não li `.env` |
| Publicação | Nenhuma imagem publicada e nenhum webhook chamado. Nada foi mexido no Easypanel, no GitHub nem em banco de produção |
| Homologação (`construir.mjs homologar`) | **Não rodei.** Por instrução do maestro no prompt desta etapa, a homologação, a verificação e o ensaio ficam com ele na Parada 3. O `docker-compose.hml.yml` existe e não mudou desde a 0.3.1 |
| Ensaio de rollback (`construir.mjs ensaiar-rollback`) | **Não rodei**, pelo mesmo motivo. Esperado: `ok: true`, `alteram_dado: false` e **`volta_sem_restaurar: false`**. A saúde da 0.3.1 responde 503 sobre o banco com a `0008` e a `0009`, então a volta só existe pelo caminho B, e isso não é falha (02, seção 8). O `deploy.md` (seção 6) já diz que a volta exige restaurar o backup tirado antes da publicação, e guarda o lugar do resultado |
| V-02 (CP-9, AN-15) e RNF-01 (50 envios, p95 ≤ 1 s) | **Não rodei.** Os dois pedem comandos fora da minha lista Pode: `docker compose`, `docker exec` (token e carga fictícia), `mktemp` e `node .../enviar-andamento.mjs`. O roteiro está no plano (seção "Verificação na homologação"), e a execução fica com o maestro na Parada 3. Hoje, a prova do RNF-01 é só o plano de execução: em `consultas.test.ts`, as três leituras usam o índice sobre 6.000 linhas (200 DEC × 30). O tempo do envio não foi medido |

### `docs/operacao/deploy.md`

- **Cabeçalho:** o "Atualizado em". O campo "Versão" fica para a `10-documentacao`, como nos pedidos anteriores.
- **Seção 1, passo 3:** o caso da 0.4.0.
  - O merge da 0.4.0 não chama os webhooks, porque traz migration.
  - O risco é o merge **seguinte** sem migration (a 0018, por exemplo) entrar antes da publicação: ele chamaria os
    webhooks e levaria a `0008` e a `0009` sem backup.
  - Regra: nenhum outro merge até o fim da publicação, ou os segredos de webhook ausentes nesse intervalo.
- **Seção 4:**
  - a situação de 13/11, com a 0.3.1 no ar (`0ac099a`, sha completo), pela informação do maestro, e o que conferir no
    painel;
  - o aviso da 0.4.0: com a origem GitHub, qualquer Deploy depois do merge leva a 0.4.0 sem as migrations, e a saúde
    fica em 503;
  - o aviso da 0.3.0/0.3.1 ficou marcado como registro.
- **Seção 5, "Publicação 0.3.1 → 0.4.0"**, nova, em 8 passos:
  1. antes do merge:
     - o Auto Deploy desligado;
     - `"andamento_ligado": false`, porque contra a 0.3.1 o envio grava `fora_do_orquestrador` e não repete;
     - as imagens rotuladas `:v0.3.1`;
     - o `docker pull` do GHCR funcionando;
     - nenhum outro merge, ou os segredos de webhook fora;
  2. o snapshot, com o aviso de que hoje ele congela a VPS;
  3. o merge. A execução fica verde, com "Deploy parado antes da produção", e o passo diz o que fazer se os webhooks
     forem chamados;
  4. **backup antes** (`pg_dump --create`, arquivo `...-antes-v0.4.0.sql`);
  5. **as migrations `0008` e `0009` num passo separado**, com a imagem do GHCR do merge. Em caso de erro, a saúde da
     0.3.1 diz se as migrations entraram: 200, nada entrou; 503, entraram;
  6. **Deploy do `worker` e depois do `app`**;
  7. a conferência;
  8. só depois, com Fabiano: a P-04 (usuário próprio para o crontab do envio), o token `construir`, o estado do envio
     zerado se preciso, `"andamento_ligado": true` com o que conferir em 2 minutos, a P-05 e os segredos de webhook de
     volta.
- **Seção 6, "Volta da 0.4.0"**, nova:
  - primeiro, uma tabela do que resolve sem volta (desligar o envio, revogar o token pelo prefixo, mudança manual de
    status);
  - depois, o destino único, a 0.3.1 pelo caminho B, com o backup restaurado, em 7 passos;
  - o que se perde na volta;
  - as imagens `:v0.3.1` ou a do GHCR `0ac099a69e8bead9d10a118b2dcc850d6d22b11c`;
  - o aviso de não voltar por Deploy com origem GitHub;
  - o estado do envio zerado antes de religar, porque o /construir não reenvia o que já mandou;
  - o lugar do resultado do ensaio, que fica com o maestro na P3.
- **Seção 8, item 5:** a conferência do andamento: sem envio, sem selo; com envio, 204 no log, selo na fila, seção no
  detalhe e "Registrou o andamento" só na mudança de fase ou situação.
- **Seção 9:** quatro sinais novos, cada um com limiar e ação. Todos vêm do log que já existe, sem código novo:
  - 401/403 no envio;
  - 429 `limite_excedido`;
  - 503 na rota do andamento;
  - andamento parado.
- **Seção 10:** o tamanho da imagem da 0.4.0.

## Decisões tomadas

- Nada muda em `.github/`, `Dockerfile`, `.dockerignore`, `docker-compose.hml.yml` nem `.env.example`. A 0.4.0 não traz
  variável, dependência, serviço nem processo novo (02, seção 1), e o diff com a `main` confirma isso.
- A migration da publicação roda com a imagem do GHCR do merge da 0.4.0. Assim, o backup, o migrate e o Deploy são do
  mesmo commit, como na publicação conjunta.
- O envio do andamento só liga no último passo, depois da saúde em 200 e da P-04. Ligado antes, contra a 0.3.1, ele
  grava `fora_do_orquestrador` no estado local e não repete (li `enviar-andamento.mjs`). Por isso, o `deploy.md` manda
  zerar o estado quando o envio foi ligado antes da hora ou depois de uma restauração.
- Os alertas novos da seção 9 usam sinais que já existem: a linha `requisicao` de `rota()`, com `rota`, `status`,
  `atorTipo` e `codigoErro`, e o `andamento.log` do /construir. Cada um tem ação. O arquiteto não pediu métrica nova, e
  o código está fora da minha lista Pode.
- A volta tem um destino só, a 0.3.1 com restauração. Uma volta sem restaurar exigiria apagar tabela e registro de
  migration à mão no banco de produção, e isso não entra como procedimento.
- O `docker build` rodou direto, com o caminho absoluto do repositório como contexto, e não pelo `compose` da
  homologação, que fica com o maestro.

## Pendências

- **Comando fora da lista Pode, só de leitura (primeira linha = motivo do `bloqueado`):**
  - `grep -n "RNF-01" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1/01-analista-requisitos.md`
    usa `-n` sem `-r`, e a lista tem `grep -rn`;
  - o `git grep` com dois `-e` (`construir.mjs` e `^- \[`) devia ter virado um comando por alternativa.

  Os dois só leram arquivos rastreados do repositório do pedido. Um terceiro, um `grep` sobre o `padrao-tecnico.md` da
  estruturaAutonoma, foi **negado** pelo sistema de permissão e não rodou: li o arquivo pelo Read. O resto da etapa está
  completo. Pela regra de 25/10, cabe ao maestro liberar a leitura e regravar como `pronto`, ou mandar refazer.
- **Para o maestro, na Parada 3:**
  - `construir.mjs homologar DEC-DEM-20261111-0017-v1`, com o e2e três vezes seguidas, como pede a definição de pronto;
  - `construir.mjs ensaiar-rollback DEC-DEM-20261111-0017-v1`, com `volta_sem_restaurar: false` esperado. O resultado
    vai para o parágrafo "Ensaio da volta 0.4.0 → 0.3.1" da seção 6 do `deploy.md`;
  - a V-02 (CP-9);
  - a medição do RNF-01: 50 envios, p95 ≤ 1 s e nenhum acima de 5 s, com 200 DEC e 20 mil eventos.

  Os quatro são da 09 no plano (G2). Os dois últimos pedem `docker exec` e `node enviar-andamento.mjs`, fora da minha
  lista.
- **B-08-1 (consulta da página da fila):**
  - a correção (`CROSS JOIN LATERAL … LIMIT 1` e o teste de plano sem Sort) é código em `src/`, fora da minha lista;
  - não bloqueia a publicação: o resultado é certo, e o custo cresce devagar, com o acúmulo de andamento por demanda;
  - recomendo a 0018, com a medição da página da fila no mesmo volume do RNF-01 antes e depois.
- **Instabilidade de tempo conhecida no CI do PR:** `scripts/scripts.test.ts` T33, `test/desempenho/leitura.test.ts`,
  `src/app/api/saude/route.test.ts`, `resumo-da-fila` e `minimizar`.
  - Se o CI do PR ficar vermelho, só conta como instabilidade a falha num desses arquivos que passa sozinho. Ela fica
    registrada e não se contorna em silêncio.
  - Proposta para a 0018: tirar a dependência de tempo de parede desses testes. Pipeline vermelho trava a entrega.
- **Para Fabiano, antes do merge da 0.4.0** (deploy.md, seção 5, passo 1):
  - o Auto Deploy desligado;
  - `"andamento_ligado": false`;
  - as imagens da 0.3.1 rotuladas `:v0.3.1`;
  - o `docker pull` do GHCR funcionando;
  - nenhum outro merge até o fim da publicação.

  Não conferi nada disso, nem a situação da produção (se os segredos de webhook voltaram e se os tokens de produção
  foram emitidos): está fora da minha lista. A situação "0.3.1 no ar" é a informada pelo maestro.
- **P-04 (pendência da publicação):**
  - o envio do andamento tem de rodar por um usuário do sistema que os agentes não usem. Hoje o crontab
    (`ferramentas/status-report/enviar-andamento.sh`) roda como `deploy`, e o estado fica em
    `/home/deploy/.local/state/wss-status/`;
  - o aceite do risco residual é com a `gestao-riscos` e Fabiano;
  - está no passo 8 da publicação, antes de ligar o envio.
- **P-05:** conferir a tool do Awave com a sétima chave (`andamento`) antes da parte 3 da E01. Também está no passo 8.
- **Para a `10-documentacao`:**
  - o campo "Versão" do `deploy.md` (0.4.0);
  - o `CHANGELOG.md` 0.4.0;
  - o manual técnico (caps. 01, 02, 05, 08 e 09, e o `10-configuracao-e-scripts.md`, com o seed de 36 demandas);
  - o `tokens-de-integracao.md`, com a ação `registrar_andamento` do token `construir`.
- **Herdadas, sem mudança:**
  - tirar o `--prod` do `pnpm audit` no `ci.yml` (proposta do 0015);
  - o `deploy.yml` comparar `drizzle/` com o commit em produção, e não com o push anterior (proposta do 0019). A 0.4.0
    mostra de novo por que isso importa (seção 1, passo 3).
- **Imagem local:** a `ws-orquestrador-demandas:local` (1,77 GB) ficou no host. Apagar é ação que não está na minha
  lista: fica para o maestro ou Fabiano decidir.
- O texto do `pedido.json` não traz instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório. Nada a registrar.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — entregas 01 a 08, paradas P1 e P2, `pedido.json`, `tarefas.json`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261111-0017-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -5` — topo `433a8d0` (08-revisao)
- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/operacao` — `deploy.md` e `tokens-de-integracao.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8 main` — `0ac099a`, merge do PR #18
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat main...HEAD -- .github Dockerfile .dockerignore docker-compose.hml.yml docker-entrypoint.sh .env.example docs/operacao package.json drizzle` — só `drizzle/` (0008, 0009, snapshots e journal) e o `package.json`
- `grep -rn "process.env" /home/deploy/servidor/projetos/ws-orquestrador-demandas/src` — leituras diretas e os dois leitores, todas no `.env.example`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff main...HEAD -- package.json drizzle/meta/_journal.json` — versão 0.3.1 → 0.4.0; journal com `0008` e `0009`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat main...HEAD -- src/lib/env.ts src/lib/env-worker.ts src/instrumentation.ts src/worker scripts next.config.ts pnpm-lock.yaml pnpm-workspace.yaml playwright.config.ts` — só seed e testes em `scripts/`
- `grep -n "RNF-01" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1/01-analista-requisitos.md` — linhas 318 e 409 (fora da forma da lista: ver Pendências)
- `grep -rn "andamento" /home/deploy/servidor/projetos/ws-orquestrador-demandas/test/desempenho` — comentário da T09 em `leitura.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "RNF-01" -- src test e2e` — planos em `consultas.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -i "p95" -- src/modules/andamento src/app/api/pedidos-construcao` — vazio: o p95 do envio não é medido em teste
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -i "RNF-01" -- docs/construcao/DEC-DEM-20261111-0017-v1` — RNF-01 deixado para a 09 pelas etapas 05, 06, 07 e 08
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show main:docs/construcao/DEC-DEM-20261112-0019-v1/05-devops-sre.md` — formato da entrega anterior
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "construir.mjs" -e "^- \[" main -- docs/construcao/DEC-DEM-20261111-0016-v1/09-devops-sre.md docs/construcao/DEC-DEM-20261110-0015-v1/09-devops-sre.md` — como as 09 anteriores registraram homologação e ensaio (dois `-e`: ver Pendências)
- `docker build -t ws-orquestrador-demandas:local /home/deploy/servidor/projetos/ws-orquestrador-demandas` — código 0; rota do andamento no `next build`
- `grep -rn "P-04" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — P-04 = envio por usuário próprio do sistema e aceite com a `gestao-riscos`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "V-02" -- docs/superpowers` — roteiro da V-02 no plano, linha 2745
- `grep -rn "codigoErro" /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/lib/rota.ts` — campo da linha de log
- `grep -rn "tipo: 'integracao'" /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/modules/acesso` — `atorTipo` da integração é `integracao`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%H%x20%ad%x20%s --date=iso main` — `0ac099a69e8bead9d10a118b2dcc850d6d22b11c`, 12/11/2026 18h27
- `docker image ls ws-orquestrador-demandas` — `ws-orquestrador-demandas:local`, 1,77 GB em disco, 441 MB de conteúdo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — só `docs/operacao/deploy.md` (193 incluídas, 6 tiradas)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só `docs/operacao/deploy.md`

## Critério de pronto atendido

- [x] o CI roda lint, typecheck, test e, se houver tela, e2e (`ci.yml` igual à `main`)
- [x] `docker build` local passa (comando e tamanho da imagem na entrega): `docker build -t ws-orquestrador-demandas:local /home/deploy/servidor/projetos/ws-orquestrador-demandas`, 1,77 GB em disco e 441 MB de conteúdo
- [x] `.env.example` tem toda variável lida pelo código (conferido com `grep -rn "process.env" src`)
- [x] o rollback está descrito passo a passo (deploy.md, seção 6, "Volta da 0.4.0": só para a 0.3.1, com o backup restaurado)
- [x] nenhum arquivo tem segredo
- [x] nenhuma imagem foi publicada e nenhum webhook foi chamado
- [x] `deploy.yml` só dispara em `push` na `main`; nenhum workflow publica imagem nem chama webhook em outro ramo ou em `pull_request`
- [ ] (09) `docker-compose.hml.yml` existe e `construir.mjs homologar <DEC-id>` passa (resultado na entrega). O arquivo existe e não mudou. A execução fica com o maestro na Parada 3, por instrução do prompt desta etapa, e o resultado ainda não existe
- [ ] (09) `construir.mjs ensaiar-rollback <DEC-id>` passa (resultado na entrega, com `volta_sem_restaurar` e `alteram_dado`). A execução fica com o maestro na Parada 3, por instrução do prompt. O esperado é `alteram_dado: false` e `volta_sem_restaurar: false`
