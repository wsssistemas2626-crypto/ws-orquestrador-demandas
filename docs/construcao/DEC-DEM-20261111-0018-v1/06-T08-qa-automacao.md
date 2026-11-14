---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T08-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md (seções 5 a 7), contrato-passagem.md, docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md (T08 com o registro de correção), 01-analista-requisitos.md (RF-04, CA-04.1 a CA-04.4), 04-seguranca-aplicacao.md (SB-14, SB-15), 06-T08-engenheiro-backend.md, 06-T08-tech-lead.md, commit 9da1cf8, src/lib/deps-qa.test.ts, src/lib/deps.ts, src/lib/env.ts, src/lib/fila.ts, test/sessoes-do-banco.ts, test/sessoes-do-banco.test.ts, test/banco.ts, test/setup-global.ts, vitest.config.ts, package.json, Dockerfile, .dockerignore, test/estatico/piso-de-assercoes.test.ts, test/estatico/piso-de-assercoes-qa.test.ts, test/estatico/variaveis.test.ts, test/estatico/relogio.test.ts, test/estatico/sem-recurso-externo.test.ts, test/estatico/importacoes.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

**Resultado: a T08 passa nos testes adversariais do SB-14.** Ataquei a verificação do C-27 com 4 formas de o app
conectar como migrator e 3 mutações no auxiliar. Ela ficou vermelha em todos os casos em que deveria. A leitura feita
pelo superusuário só existe na infraestrutura de teste. O C-27 passou 20 vezes seguidas, com as três asserções
intactas.

### Critérios da T08 e o teste que cobre cada um

| Critério | Teste (arquivo › nome) |
|---|---|
| CA-04.1: o C-27 passa 20 vezes seguidas | `src/lib/deps-qa.test.ts` › `C-27: com DATABASE_URL_MIGRATOR no ambiente, o pool e a fila conectam só como orquestrador_app`, em 20 execuções seguidas desta etapa (tabela abaixo) |
| CA-04.2: nenhuma asserção retirada nem enfraquecida | `test/estatico/sessoes-do-banco-qa.test.ts` › `as três asserções, com os matchers de antes`; `nem o caso, nem os arquivos do C-27, nem o vitest.config pulam, isolam ou repetem teste`; `há uma consulta só, com distinct usename…`; `nenhum filtro por usename, por papel ou por pid, nem limite`; `o JS não filtra a lista…`. PISO `src/lib/deps-qa.test.ts: 8` (8 em `41108ee`, 8 agora) |
| CA-04.3 / SB-14 (a): o app conectando como migrator deixa o caso vermelho | `test/sessoes-do-banco.test.ts` › `CA-04.3: …` (engenheiro) e, novos, em `test/sessoes-do-banco-qa.test.ts`: `obterDeps() com DATABASE_URL apontando para o migrator…`; `só a fila montada sobre o migrator, com o pool do app certo…`; `o pool do migrator passado como argumento (SB-14 a, forma literal)…`; `a espera por tentativas não tira o papel do migrator…` |
| SB-14 (b): a mensagem da falha forçada não tem URL, senha, `query`, `client_addr` nem `application_name` | `test/sessoes-do-banco-qa.test.ts` › `com o migrator conectado e o diagnóstico lido pelo superusuário, a mensagem não traz URL, senha, consulta, application_name nem endereço`; `test/estatico/sessoes-do-banco-qa.test.ts` › `o diagnóstico seleciona só backend_type, usename e state` |
| SB-14 (d) e SB-15: testes de segurança no PISO | `test/estatico/piso-de-assercoes.test.ts`: os dois arquivos novos entraram no PISO (26 e 66). As entradas da construção ficaram (8 e 5) |
| Pedido do maestro: o superusuário só lê as sessões no banco de teste | `test/estatico/sessoes-do-banco-qa.test.ts` › `código de produção (src/ e scripts/ fora dos testes) não lê pg_stat_activity, pgAdmin, o auxiliar, o Testcontainers nem o vitest`; `pgAdmin só é fornecido por test/setup-global.ts e só é lido em arquivo de teste`; `o setup global sobe o contêiner descartável e o derruba…`; `o Testcontainers é dependência de desenvolvimento, e a imagem final não leva test/`; `o auxiliar só é importado por arquivo de teste`; `o auxiliar não lê variável de ambiente nem a URL do migrator…`; `o pool recebido só dá o nome do banco; quem lê pg_stat_activity é o observador`. Em `test/sessoes-do-banco-qa.test.ts`: `o observador é o superusuário do contêiner de teste, conectado ao banco postgres, e não ao banco observado` |
| Por que o observador é necessário (o desvio aceito na revisão) | `test/sessoes-do-banco-qa.test.ts` › `o papel do app não é superusuário nem membro de pg_read_all_stats ou pg_monitor`; `pela visão do app, a sessão do migrator vem sem backend_type; pela do observador, como client backend` |

### Testes acrescentados

**`test/sessoes-do-banco-qa.test.ts`** (novo, banco real, 8 casos, 26 linhas com `expect(`):
- **App inteiro como migrator.** `obterDeps()` com `DATABASE_URL` igual a `b.urlMigrator`: o pool e a fila sobem como
  migrator. A asserção do C-27, copiada igual, lança erro, e a mensagem cita o papel `migrator`.
- **Só a fila como migrator.** A fila (pg-boss) sobe por `criarFila(b.urlMigrator)`, com o pool do app certo. O papel do
  migrator aparece ao lado do `orquestrador_app`, e a asserção falha. É a metade "fila" do C-27, que a revisão disse que
  a versão do plano esconderia.
- **Forma literal do SB-14 (a), Minor 2 da revisão.** `papeisDasSessoesDeCliente(b.poolMigrator)` contém o migrator, e a
  asserção falha.
- **A espera não esconde papel.** Com 1 tentativa e com 50, o migrator continua na lista, sem `null`.
- **SB-14 (b) com falha forçada.** A sessão do migrator tem `application_name` e `query` com sentinelas, e o teste
  confere antes que elas estão de fato no `pg_stat_activity`. O diagnóstico é lido pelo superusuário, que vê todas as
  colunas. Mensagem, `String(erro)`, JSON do erro e diagnóstico não contêm as URLs, as senhas nem as sentinelas.
  Mensagem e diagnóstico também não contêm endereço IPv4.
- **O porquê do observador.**
  - O papel do app não é superusuário nem membro de `pg_read_all_stats` ou de `pg_monitor`.
  - Pela visão do app, a sessão do migrator vem com `backend_type` nulo. Pelo observador, ela aparece.
  - O observador é superusuário, está no banco `postgres`, e o banco observado é um `t_<uuid>` descartável.

**`test/estatico/sessoes-do-banco-qa.test.ts`** (novo, estático, 19 casos, 66 linhas com `expect(`):
- **Fora do código de produção.** Nenhum arquivo de `src/` e `scripts/` fora dos testes cita `pg_stat_activity`,
  `pgAdmin`, `sessoes-do-banco`, `testcontainers` nem importa `vitest`.
- **O superusuário só no teste.**
  - `pgAdmin` é fornecido só por `test/setup-global.ts`, que sobe o `postgres:16-alpine` do Testcontainers e o derruba.
    Esse arquivo é o único `globalSetup`.
  - `pgAdmin` só é lido em arquivo de teste.
  - O Testcontainers está só em `devDependencies`.
  - Nenhum `COPY` do estágio final do `Dockerfile` leva `test/`.
- **O auxiliar.**
  - Só arquivos `.test.ts` o importam, conferido pela árvore do TypeScript (`importacoes.ts`).
  - Não lê `process.env`, `DATABASE_URL`, `urlMigrator` nem `MIGRATOR`.
  - Tem um único `new pg.Pool`, o de `inject('pgAdmin')`, fechado no `finally`.
  - O `pool` recebido faz uma consulta só (`current_database()`). Quem lê o `pg_stat_activity` é o observador.
- **A consulta do C-27.**
  - É uma só: `select distinct usename … where datname = $1 and backend_type = 'client backend'`, com um único `and`.
  - Não filtra por `usename`, papel, `pid`, `application_name` ou `client_addr`, nem usa `not`, `<>` ou `limit`.
  - No JS, só mapeia o `usename`, sem `filter`, `slice`, `Set` etc. A espera repete só enquanto houver `null`.
- **O diagnóstico** seleciona exatamente `backend_type`, `usename` e `state`.
- **O caso do C-27.**
  - Mantém o `toEqual(['orquestrador_app'])`, o `toBe(b.urlApp)` e o `not.toContain(b.urlMigrator)`.
  - Nem ele, nem os arquivos do C-27, nem o `vitest.config.ts` têm modificador que pule, isole ou repita teste, `retry`,
    `repeats` ou `bail`.
- **Cada regra é testada com a forma plantada:** pega o que deve pegar e deixa passar o resto.

**`test/estatico/piso-de-assercoes.test.ts`**: só acréscimo, com `test/sessoes-do-banco-qa.test.ts: 26` e
`test/estatico/sessoes-do-banco-qa.test.ts: 66`.

### Prova de que os testes ficam vermelhos (mutações no auxiliar, desfeitas)

Mudei `test/sessoes-do-banco.ts` temporariamente, rodei os testes e voltei ao texto original. O
`git diff --stat` saiu vazio depois.

| Mutação | Quem pegou |
|---|---|
| 1. Ler o `pg_stat_activity` pelo `pool` do app, a versão do plano | 4 casos novos (só a fila como migrator, espera, SB-14 b, visão do app) e o CA-04.3 do engenheiro. A 2ª rodada pegou também o estático novo `o pool recebido só dá o nome do banco…` (2 consultas pelo `pool`) |
| 2. `.filter((u) => u !== 'migrator')` na lista | 6 casos novos e o estático `o JS não filtra a lista` (8 falhas no total, com o CA-04.3) |
| 3. Diagnóstico com `application_name \|\| query as state` | `SB-14 b` (achou a sentinela) e o estático `o diagnóstico seleciona só backend_type, usename e state`. **O teste do diagnóstico da construção não pegou essa mutação** (ele só procura URL e senha) |

### CA-04.1: as 20 execuções desta etapa

Comando: `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db test/sessoes-do-banco.test.ts test/sessoes-do-banco-qa.test.ts --reporter=dot`, uma chamada por execução. É o mesmo recorte do engenheiro, mais os dois arquivos do auxiliar. O paralelismo é o padrão do `vitest run`.
Cada execução: 44 de 44 arquivos e 1.081 de 1.081 testes, com `src/lib/deps-qa.test.ts` verde. Nenhuma falhou.

| # | Início | Duração | # | Início | Duração |
|---|---|---|---|---|---|
| 1 | 04:25:27 | 24,07 s | 11 | 04:30:23 | 26,54 s |
| 2 | 04:25:56 | 25,96 s | 12 | 04:30:56 | 27,95 s |
| 3 | 04:26:27 | 22,50 s | 13 | 04:31:29 | 24,90 s |
| 4 | 04:26:54 | 25,08 s | 14 | 04:31:59 | 27,79 s |
| 5 | 04:27:24 | 22,92 s | 15 | 04:32:32 | 23,35 s |
| 6 | 04:27:52 | 27,19 s | 16 | 04:33:00 | 24,32 s |
| 7 | 04:28:24 | 23,04 s | 17 | 04:33:30 | 23,17 s |
| 8 | 04:28:52 | 23,36 s | 18 | 04:33:58 | 26,78 s |
| 9 | 04:29:20 | 22,28 s | 19 | 04:34:30 | 22,37 s |
| 10 | 04:29:48 | 30,23 s | 20 | 04:34:58 | 29,54 s |

Com as 20 da construção, são 40 execuções seguidas sem falha depois da correção, mais a suíte inteira.

**Sem asserção retirada (CA-04.2):**
- `git grep -c "expect("` dá 8 em `src/lib/deps-qa.test.ts` em `41108ee` e 8 agora.
- O diff de `9da1cf8` troca só a origem da lista (`papeisDasSessoesDeCliente(d.pool)`) e põe o diagnóstico como
  mensagem. Ficam o `toEqual(['orquestrador_app'])`, o `toBe(b.urlApp)` e o `not.toContain(b.urlMigrator)`.
- Agora o estático novo e o PISO prendem esse estado.

### Suíte, lint e typecheck

- `pnpm test`, suíte inteira: **380 de 380 arquivos, 8.184 de 8.184 testes**, 0 falha (04:35:32, 200,71 s). A
  construção deu 8.155. Os 29 a mais são os 27 casos novos e as 2 entradas novas do PISO.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.

## Decisões tomadas

- **Testes da fila e do app inteiro como migrator.** Usei `obterDeps()` e `criarFila()` reais em vez de só uma conexão
  extra: o C-27 é sobre o pool e a fila do app, e a revisão apontou que a versão do plano escondia as duas metades.
- **Consulta pela fila errada antes de observar.** A fila errada faz um `getQueues()` logo antes da leitura, para a
  sessão dela estar aberta naquela hora sem depender do tempo ocioso do pool.
- **SB-14 (b) com o diagnóstico lido pelo superusuário.** É a visão que vê `query`, `application_name` e `client_addr`.
  Se o diagnóstico vazasse uma dessas colunas, só essa visão mostraria. O teste confere antes que as sentinelas estão de
  fato no `pg_stat_activity`, para o "não contém" não passar por vazio.
- **IPv4 procurado só na mensagem e no diagnóstico.** No `stack` não, porque número de versão de pacote no caminho
  daria falso positivo.
- **"Só no banco de teste" provado por varredura estática e por um caso no banco.** Não dá para provar com um teste só,
  em tempo de execução, que algo não existe em produção.
- **Mutações feitas à mão no auxiliar e desfeitas.** A regra de edição da etapa permite mexer em `test/`. O
  `git diff --stat` vazio confirma que voltou ao texto de `9da1cf8`.
- **Nomes dos modificadores do vitest montados por lista no estático.** Assim o arquivo não leva a forma literal que
  outra varredura poderia ler como uso real.

## Pendências

- **Minor, para a decisão do tech-lead.** O teste da construção `o diagnóstico não contém as URLs nem as senhas` não
  pegou a mutação 3 (diagnóstico com `query` e `application_name`). Agora quem cobre o SB-14 (b) são os dois testes
  novos. O teste dele fica como está: não está errado, só é mais fraco.
- **Não exercitado: espera esgotada com `null` (falha fechada).** No Postgres 16 não dá para criar uma sessão de cliente
  sem papel: ela só aparece no `pg_stat_activity` depois de autenticada. O comportamento fica preso pelo estático (o laço
  repete só com `includes(null)` e devolve a lista sem filtro) e pelo caso `a espera por tentativas não tira o papel do
  migrator`.
- **Não exercitado: `walsender`, Minor 3 da revisão.** Uma conexão de replicação aberta como migrator não seria contada.
  Não fiz o teste, porque o `pg_hba` do contêiner de teste não deve aceitar replicação vinda de fora do contêiner, e não
  conferi isso. Fica com o `seguranca-aplicacao` no registro do SB-14, como a revisão já pediu.
- **A causa continua "provável".** Nenhuma das minhas 21 rodadas (20 do recorte e 1 da suíte inteira) reproduziu a
  falha de antes. A confirmação continua sendo o CI do PR desta versão. Se o C-27 falhar lá, o caso volta como bug, sem
  `retry` (a mesma pendência da revisão).
- **`git grep` com pathspec de exclusão.** Usei `":!*.test.ts"` num `git grep` só de leitura no repositório. O pathspec
  de exclusão não está nos exemplos da regra de comando.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — árvore limpa no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T08" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md` — localizar a T08
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "CA-04" -- docs/construcao/DEC-DEM-20261111-0018-v1/01-analista-requisitos.md` — critérios do RF-04
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "SB-14" -- docs/construcao/DEC-DEM-20261111-0018-v1/04-seguranca-aplicacao.md` — controle SB-14
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "pg_stat_activity" -- .` — nenhum arquivo de produção lê
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "pgAdmin" -- .` — só arquivos de teste
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "databaseUrl" -e "export function lerConfigApp" -- src/lib/env.ts` — origem da URL do app
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "export" -- src/lib/fila.ts` — assinatura de `criarFila`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "testcontainers" -e "\"pg\"" -e "Dependencies" -- package.json` — Testcontainers em devDependencies
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "retry" -- test/estatico` — sem resultado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export function criarPool" -- src/db/index.ts` — sem resultado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "criarPool" -- src/db` — assinatura
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files -- Dockerfile .dockerignore test/estatico` — estáticos existentes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "skip" -e "only" -e "todo" -- test/estatico` — varreduras existentes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "from 'vitest'" -- src scripts ":!*.test.ts"` — sem resultado
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/sessoes-do-banco-qa.test.ts test/estatico/sessoes-do-banco-qa.test.ts test/sessoes-do-banco.test.ts src/lib/deps-qa.test.ts --reporter=dot` — 4 arquivos, 31 de 31
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/sessoes-do-banco-qa.test.ts test/estatico/sessoes-do-banco-qa.test.ts test/sessoes-do-banco.test.ts src/lib/deps-qa.test.ts --reporter=dot` — mutação 1 (leitura pelo pool do app): 5 falharam, 26 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/sessoes-do-banco-qa.test.ts test/estatico/sessoes-do-banco-qa.test.ts test/sessoes-do-banco.test.ts src/lib/deps-qa.test.ts --reporter=dot` — mutação 2 (filtro no JS): 8 falharam, 23 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/sessoes-do-banco-qa.test.ts test/estatico/sessoes-do-banco-qa.test.ts test/sessoes-do-banco.test.ts src/lib/deps-qa.test.ts --reporter=dot` — mutação 3 (diagnóstico com query): 2 falharam, 30 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/sessoes-do-banco-qa.test.ts --reporter=dot` — mutação 1 de novo, só o estático: 1 falhou, 17 passaram
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — vazio: auxiliar de volta ao original
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep --untracked -c "expect(" -- test/sessoes-do-banco-qa.test.ts test/estatico/sessoes-do-banco-qa.test.ts` — 26 e 66
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db test/sessoes-do-banco.test.ts test/sessoes-do-banco-qa.test.ts --reporter=dot` — C-27 1/20: 1.081 de 1.081, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db test/sessoes-do-banco.test.ts test/sessoes-do-banco-qa.test.ts --reporter=dot` — C-27 2/20: 1.081 de 1.081, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db test/sessoes-do-banco.test.ts test/sessoes-do-banco-qa.test.ts --reporter=dot` — C-27 3/20: 1.081 de 1.081, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db test/sessoes-do-banco.test.ts test/sessoes-do-banco-qa.test.ts --reporter=dot` — C-27 4/20: 1.081 de 1.081, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db test/sessoes-do-banco.test.ts test/sessoes-do-banco-qa.test.ts --reporter=dot` — C-27 5/20: 1.081 de 1.081, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db test/sessoes-do-banco.test.ts test/sessoes-do-banco-qa.test.ts --reporter=dot` — C-27 6/20: 1.081 de 1.081, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db test/sessoes-do-banco.test.ts test/sessoes-do-banco-qa.test.ts --reporter=dot` — C-27 7/20: 1.081 de 1.081, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db test/sessoes-do-banco.test.ts test/sessoes-do-banco-qa.test.ts --reporter=dot` — C-27 8/20: 1.081 de 1.081, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db test/sessoes-do-banco.test.ts test/sessoes-do-banco-qa.test.ts --reporter=dot` — C-27 9/20: 1.081 de 1.081, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db test/sessoes-do-banco.test.ts test/sessoes-do-banco-qa.test.ts --reporter=dot` — C-27 10/20: 1.081 de 1.081, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db test/sessoes-do-banco.test.ts test/sessoes-do-banco-qa.test.ts --reporter=dot` — C-27 11/20: 1.081 de 1.081, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db test/sessoes-do-banco.test.ts test/sessoes-do-banco-qa.test.ts --reporter=dot` — C-27 12/20: 1.081 de 1.081, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db test/sessoes-do-banco.test.ts test/sessoes-do-banco-qa.test.ts --reporter=dot` — C-27 13/20: 1.081 de 1.081, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db test/sessoes-do-banco.test.ts test/sessoes-do-banco-qa.test.ts --reporter=dot` — C-27 14/20: 1.081 de 1.081, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db test/sessoes-do-banco.test.ts test/sessoes-do-banco-qa.test.ts --reporter=dot` — C-27 15/20: 1.081 de 1.081, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db test/sessoes-do-banco.test.ts test/sessoes-do-banco-qa.test.ts --reporter=dot` — C-27 16/20: 1.081 de 1.081, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db test/sessoes-do-banco.test.ts test/sessoes-do-banco-qa.test.ts --reporter=dot` — C-27 17/20: 1.081 de 1.081, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db test/sessoes-do-banco.test.ts test/sessoes-do-banco-qa.test.ts --reporter=dot` — C-27 18/20: 1.081 de 1.081, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db test/sessoes-do-banco.test.ts test/sessoes-do-banco-qa.test.ts --reporter=dot` — C-27 19/20: 1.081 de 1.081, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db test/sessoes-do-banco.test.ts test/sessoes-do-banco-qa.test.ts --reporter=dot` — C-27 20/20: 1.081 de 1.081, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — suíte inteira (foi para segundo plano pelo ambiente, saída lida com Read): 380 de 380 arquivos, 8.184 de 8.184 testes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" 41108ee -- src/lib/deps-qa.test.ts` — 8
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" -- src/lib/deps-qa.test.ts test/sessoes-do-banco.test.ts` — 8 e 5
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- test/estatico/piso-de-assercoes.test.ts` — só acréscimo de 2 entradas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 9da1cf878152439092a95e1a190645f8cd9022d8 --stat` — arquivos do commit da construção
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 9da1cf878152439092a95e1a190645f8cd9022d8 -- src/lib/deps-qa.test.ts test/estatico/piso-de-assercoes.test.ts` — diff do caso e do PISO
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — 1 alterado, 2 novos
- `git -C /home/deploy/servidor/projetos/estruturaAutonoma grep -n "^## " -- docs/construcao/padrao-tecnico.md` — seções do padrão técnico

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
