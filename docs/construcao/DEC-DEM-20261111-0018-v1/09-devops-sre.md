---
pedido: DEC-DEM-20261111-0018-v1
etapa: 09-entrega
agente: devops-sre
leu: [contrato-passagem.md, padrao-tecnico.md (seção 9), pedido.json, tarefas.json, 02-arquiteto-solucoes.md (seção 8 e as linhas da migration 0010), 08-maestro.md, DEC-DEM-20261111-0017-v1/09-devops-sre.md (formato), docs/operacao/deploy.md, .env.example, Dockerfile, scripts/migrate.ts, drizzle/0010_magical_cammi.sql, saída do homologar, saída do ensaiar-rollback, saída do docker build]
status: pronto
proximo: documentacao-tecnica
devolvido_para: null
---
## Entrega

A 0.4.1 não mexe no pipeline nem na imagem. A base é a `main` em `41108ee` (merge do PR #19, 0.4.0), que o maestro
informa estar em produção. O `git diff --stat 41108ee...HEAD` dos arquivos de entrega mostra só duas mudanças:

- o `package.json`, na versão 0.4.1;
- a migration `0010_magical_cammi.sql`, com o snapshot e o journal. É uma linha:
  `ALTER TABLE "pacote_decisao" ADD COLUMN "caminhos_com_nome_na_criacao" text[]`.

Não alterei `ci.yml`, `deploy.yml`, `Dockerfile`, `.dockerignore`, `docker-compose.hml.yml`, `docker-entrypoint.sh`
nem `.env.example`. Só o `docs/operacao/deploy.md` mudou: 242 linhas incluídas e 14 tiradas.

### Verificações

| Verificação | Resultado |
|---|---|
| CI (`ci.yml`) | Dispara em `pull_request` e `workflow_call`. Roda `pnpm install --frozen-lockfile`, lint, typecheck, test, e2e, `pnpm audit --prod --audit-level high`, gitleaks e `docker build` sem publicar. Igual à `main` |
| Deploy (`deploy.yml`) | Dispara só em `push` na `main`. O job `publicar` tem `if: github.event_name == 'push' && github.ref == 'refs/heads/main'`. Igual à `main`. No merge da 0.4.1, o passo "Migration nova neste push?" dá `sim`, porque o push traz a `0010`. Os webhooks **não** são chamados, e a publicação segue à mão (deploy.md, seção 5) |
| Imagem (`docker build`) | `docker build -t ws-orquestrador-demandas:local /home/deploy/servidor/projetos/ws-orquestrador-demandas` saiu com código 0. Pelo `docker image ls ws-orquestrador-demandas`, são **1,78 GB em disco e 442 MB de conteúdo** (eram 1,77 GB e 441 MB na 0.4.0). Nada foi publicado |
| Homologação (`construir.mjs homologar`) | **`ok: true`**. Subiu em `http://127.0.0.1:3200`, e `/api/saude` respondeu 200. **e2e: 285 passed.** O projeto e os volumes foram removidos |
| Ensaio de rollback (`construir.mjs ensaiar-rollback`) | **`ok: true`**, **`alteram_dado: false`** e **`volta_sem_restaurar: false`**, como esperado (02, seção 8; 08, "Para a 09-entrega"). Detalhes abaixo |
| Migration | A `0010` é aditiva: coluna `text[]` anulável e sem padrão, sem reescrita da tabela e sem migration custom. O ensaio confirma que ela não altera dado existente. O `scripts/migrate.ts` lê só `DATABASE_URL_MIGRATOR` e escreve `Migrations aplicadas.` no fim, a mensagem que o roteiro do `migrar` manda esperar no log |
| Variáveis (`process.env`) | O `grep -rn "process.env" src` acha leituras diretas de `NODE_ENV`, `LOG_LEVEL`, `NEXT_RUNTIME` e `SENTRY_DSN`, mais os dois leitores (`env.ts` e `env-worker.ts`). Todas estão no `.env.example` por nome, junto com a `DATABASE_URL_MIGRATOR` da migration. Nenhuma variável nova na 0.4.1 |
| Segredo | Nenhum arquivo do ramo tem segredo. O `deploy.md` cita variáveis, segredos e tokens só pelo nome. Não li `.env` |
| Publicação | Nenhuma imagem publicada e nenhum webhook chamado. Nada foi mexido no Easypanel, no GitHub nem em banco de produção |

O ensaio de rollback, em ordem:

1. Migrations da `main`: nenhuma alterada. Nova: 1 (`0010`), que não altera dado existente.
2. A `main` (0.4.0) subiu e respondeu 200 em 120 s.
3. O banco ganhou backup: 168 KB, impressão `0d1997489d639b98`.
4. A 0.4.1 migrou por cima e respondeu 200 em 35 s.
5. A 0.4.0 **só voltou com o backup restaurado**, com 200 em 11 s. O banco ficou igual ao backup, com a mesma impressão.
6. A 0.4.1 subiu de novo e respondeu 200 em 35 s.
7. O projeto e os volumes foram removidos.

### `docs/operacao/deploy.md`

- **Cabeçalho:** o "Atualizado em". O campo "Versão" fica para a `10-documentacao`, como nos pedidos anteriores.
- **Seção 1, passo 3:** o merge da 0.4.1 não chama os webhooks, porque traz a `0010`. O risco é o merge seguinte sem
  migration entrar antes da publicação. O `migrar` não tem webhook.
- **Seção 2, item 11 do pedido:**
  - linha do `migrar` na tabela;
  - subseção "Serviço `migrar`", com o roteiro de criação, que é ação de Fabiano:
    - a mesma origem do `worker`;
    - o comando `/bin/sh -c "pnpm db:migrate && sleep infinity"`;
    - só a `DATABASE_URL_MIGRATOR`;
    - 1 réplica na publicação e 0 entre versões;
    - sem domínio, sem porta e sem Auto Deploy;
    - sem webhook no GitHub;
  - o que o log mostra no sucesso e no erro: no erro, o laço de reinício pede parar o serviço na hora;
  - o teste seco opcional antes do merge;
  - o risco de a URL do migrator ficar guardada na configuração do serviço;
  - o caminho `!` como alternativa.
- **Seção 3:** a `DATABASE_URL_MIGRATOR` vale no `migrar` ou no comando pelo terminal.
- **Seção 4:**
  - a situação de 14/11, com a 0.4.0 no ar (`41108ee`, sha completo), pela informação do maestro;
  - o aviso da 0.4.1: depois do merge, o primeiro Deploy é o do `migrar`, depois do backup;
  - os avisos anteriores ficaram marcados como registro.
- **Seção 5:**
  - o passo genérico "Migrate" agora tem o `migrar` como padrão e o `!` como alternativa;
  - nova "Publicação 0.4.0 → 0.4.1", em 8 passos:
    1. antes do merge: Auto Deploy desligado, `migrar` criado e parado, imagens `:v0.4.0` rotuladas e nenhum outro
       merge;
    2. o snapshot, com o aviso;
    3. o merge;
    4. **backup antes, com aviso do maestro**;
    5. **Deploy do `migrar` até `Migrations aplicadas.` e o `migrar` parado**, com a leitura do erro pela saúde da
       0.4.0 e a alternativa `!` com a imagem do GHCR do merge;
    6. **Deploy do `worker` e depois do `app`**;
    7. a conferência;
    8. os segredos de webhook de volta.
- **Seção 6:**
  - no caminho B, o `migrar` parado antes da restauração;
  - nova "Volta da 0.4.1":
    - o que não pede volta: o envio, o D1 mais forte e o arquivamento do S-04;
    - o destino único é a 0.4.0 pelo caminho B, com o backup restaurado;
    - o `migrar` fica parado, porque subir depois da restauração aplicaria a `0010` de novo;
    - as imagens `:v0.4.0`, ou a do GHCR `41108eed4c2297ef4f1ec887d552c5dea6cd1336`;
    - o estado do envio do andamento zerado;
    - o resultado do ensaio e da homologação de 14/11.
- **Seção 10:** o tamanho da imagem da 0.4.1.

## Decisões tomadas

- Nada muda em `.github/`, `Dockerfile`, `.dockerignore`, `docker-compose.hml.yml` nem `.env.example`. A 0.4.1 não traz
  variável, dependência, serviço da aplicação nem processo novo, e o diff com a `main` confirma isso.
- O `migrar` fica parado entre versões e é parado logo depois de `Migrations aplicadas.`. Assim, nenhum reinício do
  servidor roda migration sem ninguém olhar, e a URL do migrator não fica num contêiner em execução.
- Em erro, o `&&` faz o contêiner sair e o Swarm o sobe de novo, em laço. Por isso, o roteiro manda parar o serviço na
  hora e ler o resultado pela saúde da 0.4.0, como nas publicações anteriores.
- A volta manda deixar o `migrar` parado: ele guarda a imagem da 0.4.1 e, se subisse depois da restauração, aplicaria a
  `0010` de novo.
- O teste seco do `migrar` com a `main` na 0.4.0 fica opcional e é decisão de Fabiano. Ele não muda o esquema, mas roda
  com o papel dono do banco contra a produção.
- A alternativa `!` usa a imagem do GHCR do commit do merge. Assim, o backup, o migrate e o Deploy usam o mesmo commit,
  como na 0.4.0.

## Pendências

- **Dois comandos de leitura fora da forma da lista Pode, nesta etapa, os dois só de leitura:**
  - um `git -C <repo do sistema> grep` com o caminho do `padrao-tecnico.md` da estruturaAutonoma, fora do repositório. O
    git recusou (código 128), e nada foi lido;
  - um `git -C /home/deploy/servidor/projetos/estruturaAutonoma grep -n "^## "` sobre o `padrao-tecnico.md`, para achar
    a seção 9. O `-C` vale só para o repositório do sistema.

  Depois disso, li o padrão técnico só pelo Read. Os dois estão em "Comandos executados", como o contrato manda.
- **Para Fabiano, antes do merge da 0.4.1** (deploy.md, seção 5, passo 1):
  - criar o serviço `migrar` pelo roteiro da seção 2 e deixá-lo parado;
  - Auto Deploy desligado no `app`, no `worker` e no `migrar`;
  - imagens da 0.4.0 rotuladas `:v0.4.0`;
  - nenhum outro merge até o fim da publicação.

  Não conferi nada disso, nem a situação da produção, porque está fora da minha lista. A situação "0.4.0 no ar" é a
  informada pelo maestro.
- **Risco do `migrar` para aceite de Fabiano e da `seguranca-aplicacao`:** a URL do migrator, com o papel dono do banco,
  passa a ficar guardada na configuração do serviço no Easypanel. Também fica legível a quem lê a configuração do serviço
  no Docker do host, inclusive o usuário dos agentes enquanto a D-F3 (agentes sem docker) não for executada. No caminho
  `!`, ela só existe no terminal durante a migração. O `deploy.md` registra o risco e a saída: usar o `!` e apagar o
  `migrar`.
- **Não verificado:**
  - o nome exato dos campos do Easypanel (comando do Deploy, réplicas, parar);
  - que o Swarm reinicia o contêiner que sai com código 1.

  O roteiro descreve o efeito esperado; o teste seco da seção 2 confirma os dois antes do dia da publicação.
- **Instabilidade de tempo conhecida no CI do PR** (08): `scripts/scripts.test.ts` T33, `test/desempenho/leitura.test.ts`,
  `src/app/api/saude/route.test.ts`, `resumo-da-fila`, `minimizar` e `e2e/reflow-qa.spec.ts:152`.
  - Se o CI do PR ficar vermelho, só conta como instabilidade a falha num desses arquivos que passa quando roda sozinho.
  - A falha fica registrada, nunca contornada em silêncio. Pipeline vermelho trava a entrega.
- **Para a `10-documentacao`:**
  - o campo "Versão" do `deploy.md` (0.4.1);
  - o `CHANGELOG.md` 0.4.1;
  - os caps. 04 e 08 do manual e a spec, como o 08 lista;
  - o serviço `migrar` no manual técnico, se o cap. de configuração e scripts citar como rodar a migration.
- **Herdadas, sem mudança:**
  - tirar o `--prod` do `pnpm audit` no `ci.yml` (proposta do 0015);
  - o `deploy.yml` comparar `drizzle/` com o commit em produção, e não com o push anterior (proposta do 0019).
- **Arquivos que ficaram:**
  - a imagem `ws-orquestrador-demandas:local` (1,78 GB) segue no host. Apagá-la não está na minha lista;
  - o `homologar` e o `ensaiar-rollback` criaram `docs/construcao/DEC-DEM-20261111-0018-v1/conferencias/`, como nos
    pedidos anteriores.
- O texto do `pedido.json` não traz instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório. Nada a registrar.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^## " -- /home/deploy/servidor/projetos/estruturaAutonoma/docs/construcao/padrao-tecnico.md` — recusado pelo git (caminho fora do repositório), código 128, nada lido
- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0018-v1` — entregas 01 a 08, paradas P1 e P2, `pedido.json`, `tarefas.json`
- `node /home/deploy/servidor/projetos/estruturaAutonoma/ferramentas/construir/construir.mjs homologar DEC-DEM-20261111-0018-v1` — `ok: true`, saúde 200, e2e com 285 passed, derrubado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "0010\|migrar\|Easypanel\|deploy.md\|09-entrega\|devops" -- docs/construcao/DEC-DEM-20261111-0018-v1/02-arquiteto-solucoes.md` — linhas da `0010` e a seção 8
- `git -C /home/deploy/servidor/projetos/estruturaAutonoma grep -n "^## " -- docs/construcao/padrao-tecnico.md` — seções do padrão técnico (fora da forma da lista Pode; ver Pendências)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 41108ee...HEAD -- .github Dockerfile .dockerignore docker-entrypoint.sh .env.example docker-compose.hml.yml drizzle package.json` — só a `0010`, o snapshot, o journal e o `package.json`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo, antes da edição
- `grep -rn "process.env" /home/deploy/servidor/projetos/ws-orquestrador-demandas/src` — leituras diretas e os dois leitores, todas no `.env.example`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "db:migrate\|\"worker\"\|\"start\"" -- package.json` — `db:migrate` por `tsx scripts/migrate.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "Migrations aplicadas" -- scripts src` — `scripts/migrate.ts:39` e `scripts/start-hml.ts:86`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^import" -- src/lib/fila.ts src/lib/reduzir-erro.ts` — a migration não importa o leitor de variáveis do app
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -3 --format="%H %s" 41108ee` — `41108eed4c2297ef4f1ec887d552c5dea6cd1336`, merge do PR #19 (0.4.0)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files docs/construcao/DEC-DEM-20261111-0017-v1` — formato da entrega anterior
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "on:\|branches\|pull_request\|workflow_call\|if:\|run: pnpm" -- .github/workflows/ci.yml .github/workflows/deploy.yml` — gatilhos e passos iguais à `main`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -i "nome da criação" -- docs/construcao/DEC-DEM-20261111-0018-v1/01-analista-requisitos.md` — o S-03 na 01
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — só `docs/operacao/deploy.md`
- `node /home/deploy/servidor/projetos/estruturaAutonoma/ferramentas/construir/construir.mjs ensaiar-rollback DEC-DEM-20261111-0018-v1` — `ok: true`, `alteram_dado: false`, `volta_sem_restaurar: false`
- `docker build -t ws-orquestrador-demandas:local /home/deploy/servidor/projetos/ws-orquestrador-demandas` — código 0
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "ensaio-0018" -- docs/operacao/deploy.md` — marcador do ensaio, linha 649
- `docker image ls ws-orquestrador-demandas` — `ws-orquestrador-demandas:local`, 1,78 GB em disco, 442 MB de conteúdo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — `docs/operacao/deploy.md`, 242 incluídas e 14 tiradas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — `docs/operacao/deploy.md` e a pasta `conferencias/`

## Critério de pronto atendido

- [x] o CI roda lint, typecheck, test e, se houver tela, e2e (`ci.yml` igual à `main`)
- [x] `docker build` local passa (comando e tamanho da imagem na entrega): `docker build -t ws-orquestrador-demandas:local /home/deploy/servidor/projetos/ws-orquestrador-demandas`, 1,78 GB em disco e 442 MB de conteúdo
- [x] `.env.example` tem toda variável lida pelo código (conferido com `grep -rn "process.env" src`)
- [x] o rollback está descrito passo a passo (deploy.md, seção 6, "Volta da 0.4.1": só para a 0.4.0, com o backup restaurado e o `migrar` parado)
- [x] nenhum arquivo tem segredo
- [x] nenhuma imagem foi publicada e nenhum webhook foi chamado
- [x] `deploy.yml` só dispara em `push` na `main`; nenhum workflow publica imagem nem chama webhook em outro ramo ou em `pull_request`
- [x] (09) `docker-compose.hml.yml` existe e `construir.mjs homologar <DEC-id>` passa: `ok: true`, saúde 200, e2e com 285 passed
- [x] (09) `construir.mjs ensaiar-rollback <DEC-id>` passa: `ok: true`, `alteram_dado: false`, `volta_sem_restaurar: false` (esperado; o `deploy.md` diz que a volta da 0.4.1 exige restaurar o backup tirado antes da publicação)
