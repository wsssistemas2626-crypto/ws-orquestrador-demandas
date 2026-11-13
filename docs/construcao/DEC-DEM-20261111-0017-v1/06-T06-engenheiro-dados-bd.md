---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T06-construcao
agente: engenheiro-dados-bd
leu: [pedido.json, contrato-passagem.md, 05-tech-lead.md, tarefas.json, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (linhas 1 a 330, G1 a G10, e 1528 a 1727, T06), 06-T01-engenheiro-dados-bd.md, 06-T02-qa-automacao.md (linhas 60 a 89), src/db/schema/andamento.ts, src/db/schema/andamento.test.ts, src/db/schema/comum.ts, src/db/index.ts, test/banco.ts, test/estatico/andamento.test.ts, test/estatico/importacoes.ts, test/estatico/leituras-da-fila.test.ts, src/modules/demandas/resumo-da-fila.test.ts (95 a 164), test/desempenho/leitura.test.ts (100 a 159)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T06 do plano: as três leituras do andamento (`ultimoAndamento`, `andamentosDasDemandas` e
`subconsultaDoUltimoAndamento`), com o plano de execução de cada uma conferido por `EXPLAIN` no Postgres do
Testcontainers, e a guarda estática "consultas só lê" com a lista de importadores (D-04).

Antes de escrever código, conferi a lista Pode: os três arquivos da tarefa ficam em `src/modules/andamento/` e
`test/estatico/`. Nenhum arquivo fora da lista.

### Arquivos criados

- `src/modules/andamento/consultas.ts`: `LinhaDeAndamento`, `ultimoAndamento(db, demandaId)`,
  `andamentosDasDemandas(db, ids)` (uma consulta `select distinct on`; lista vazia não consulta; ids repetidos vão uma
  vez só) e `subconsultaDoUltimoAndamento(db, demandaId)` (`.as('ultimo_andamento')`). Os nomes e assinaturas são os da
  G7. As colunas saem de uma lista de permissão (`COLUNAS`), sem `id` e sem `ator_token_prefixo`. Só tem `select` e
  `selectDistinctOn`, e não importa o `sql`.
- `src/modules/andamento/consultas.test.ts`, com 10 testes:
  - `ultimoAndamento`: a linha de maior `id` com as três linhas na mesma data (o relógio empata), com os sete campos
    exatos. Dá `null` sem andamento e com demanda que não existe. Faz uma consulta só, com o id como parâmetro e fora
    do texto do SQL.
  - `andamentosDasDemandas`: o último de cada demanda pedida. A demanda sem andamento fica fora do mapa. Faz uma
    consulta por chamada, com o id repetido uma vez só nos parâmetros. A lista vazia dá zero consultas.
  - Subconsulta (D-09): junta na consulta da demanda. Com andamento, vêm os campos do último. Sem andamento, vêm
    nulos. Com demanda que não existe, não vem linha (a base do 404 da T09). Tudo numa consulta só.
  - Planos (RNF-01): o `EXPLAIN` roda sobre o SQL exato que cada função manda, capturado pelo logger do Drizzle (o
    mesmo molde de `test/desempenho/leitura.test.ts`). O teste confere o índice pelo nome e confere, no
    `explain (format json)`, que nenhuma das tabelas é varrida por `Seq Scan`.

### Arquivo modificado

- `test/estatico/andamento.test.ts`: o bloco "andamento/consultas.ts (T06)" (4 testes), com `CONSULTAS`,
  `IMPORTAM_CONSULTAS` (T07, T09 e T12, como no plano), `achadosNasConsultas` (o critério de `resumo-da-fila.ts`:
  `select`/`selectDistinctOn`, sem `insert(`, `update(`, `delete(`, `execute(`, `transaction(` nem `.raw(`, e sem o
  `sql` do drizzle-orm por nome, apelido ou namespace) e `importadoresDasConsultas` (usa o `importacoesDe` de
  `./importacoes`, e `import type` não conta). Cada regra tem casos plantados que a reprovam. São só acréscimos: 80
  linhas novas e nenhuma removida (`git diff --stat`). O arquivo passou de 8 para 25 linhas com `expect(`. O piso dele
  continua em 8, porque o piso só sobe e a T06 não está entre as tarefas que o atualizam (G4).

### Teste escrito antes, visto falhando

`pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento/consultas.test.ts test/estatico/andamento.test.ts --reporter=dot`, antes de `consultas.ts`:

```
 FAIL  src/modules/andamento/consultas.test.ts [ src/modules/andamento/consultas.test.ts ]
Error: Cannot find module './consultas' imported from .../src/modules/andamento/consultas.test.ts
 FAIL  test/estatico/andamento.test.ts > andamento/consultas.ts (T06) > existe, é código que roda e só lê
AssertionError: expected [ …(249) ] to include 'src/modules/andamento/consultas.ts'
 Test Files  2 failed (2)
      Tests  1 failed | 7 passed (8)
```

Com o código e o volume do plano (2 linhas por DEC), 2 dos 10 testes de banco falharam no plano. A página e a leitura
com a subconsulta saíram por `Seq Scan`. O ajuste está em "Desvios do plano".

### Plano de execução (RNF-01), saída do teste verde

```
-- ultimoAndamento
Limit  (cost=0.28..2.08 rows=1 width=90)
  ->  Index Scan Backward using andamento_construcao_demanda_id_idx on andamento_construcao  (cost=0.28..54.31 rows=30 width=90)
        Index Cond: (demanda_id = 'DEM-20261112-0001'::text)
-- andamentosDasDemandas (página)
Unique  (cost=2.10..96.69 rows=52 width=90)
  ->  Incremental Sort  (cost=2.10..96.53 rows=60 width=90)
        Sort Key: demanda_id, id DESC
        Presorted Key: demanda_id
        ->  Index Scan using andamento_construcao_demanda_id_idx on andamento_construcao  (cost=0.28..94.11 rows=60 width=90)
              Index Cond: (demanda_id = ANY ('{DEM-20261112-0001,DEM-20261112-0003}'::text[]))
-- leitura do Awave com subconsultaDoUltimoAndamento (D-09)
Nested Loop Left Join  (cost=0.56..10.40 rows=1 width=39)
  ->  Index Only Scan using demanda_pkey on demanda  (cost=0.28..8.29 rows=1 width=18)
        Index Cond: (id = 'DEM-20261112-0001'::text)
  ->  Subquery Scan on ultimo_andamento  (cost=0.28..2.10 rows=1 width=39)
        Filter: (ultimo_andamento.demanda_id = 'DEM-20261112-0001'::text)
        ->  Limit  (cost=0.28..2.08 rows=1 width=115)
              ->  Index Scan Backward using andamento_construcao_demanda_id_idx on andamento_construcao  (cost=0.28..54.31 rows=30 width=115)
                    Index Cond: (demanda_id = 'DEM-20261112-0001'::text)
```

### Resultado

- Testes da tarefa: 2 arquivos, **18 passaram, 0 falharam**.
- `pnpm test` completo: **324 arquivos, 7251 testes passaram, 0 falharam**.
- `pnpm lint` e `pnpm typecheck`: limpos.
- G4: o `git diff 0ac099a --stat` das superfícies congeladas saiu vazio.
- `git status --short`: só os três arquivos da tarefa.

### Desvios do plano

- **Volume do teste de plano.** O plano previa 200 demandas com 2 linhas cada, mais 3 linhas, num laço com 6 consultas
  por demanda. Com 403 linhas, a tabela cabe em 5 páginas. O planejador escolheu `Seq Scan` na página (custo 12,04) e
  em `demanda`, e o `toContain('andamento_construcao_demanda_id_idx')` do plano falhou. Esse plano não dizia nada
  sobre a produção. Passei a gravar em lote, com `generate_series`, pelo migrator:
  - 2.000 demandas (0003 a 2002), cada uma com ESP, RSK e DEC v1;
  - os 200 DEC do RNF-01 (0003 a 0202) com 30 andamentos cada, 6.000 linhas, metade do limite de 60 por DEC por hora;
  - as três linhas da demanda 0001 e a 0002 sem andamento, com os mesmos `insert` do plano.

  Com esse volume, as três leituras usam o índice. A expectativa da demanda 0003 passou de `2/2` para `30/30` (o
  último dos 30 andamentos dela). O lote também deixou o `beforeAll` mais rápido do que o laço.
- **Asserções a mais.** Além do `toContain` do plano, cada teste de plano confere no JSON que não há `Seq Scan`. A
  leitura com a subconsulta também confere o `demanda_pkey`. Foram acrescentados testes de "uma consulta só" e de
  parâmetro fora do texto do SQL.
- **O SQL do `EXPLAIN`.** O plano pedia copiar o SQL do `.toSQL()`. Em vez disso, o teste captura o SQL e os
  parâmetros que as funções mandam, pelo logger do Drizzle. Assim, o plano conferido é sempre o da consulta real, e não
  uma cópia que pode ficar velha.
- **Importações do teste.** O teste não importa `desc` nem `criarDb`, que aparecem no esboço do plano mas não são
  usados (o lint recusaria).

## Decisões tomadas

- **Sem migration nesta tarefa.** Os índices são os da T01 (`andamento_construcao_demanda_id_idx` em
  `(demanda_id, id)`) e bastam. Não há nada a desfazer.
- **O `Incremental Sort` da página fica.** O índice é `(demanda_id, id)` ascendente, e a página ordena `id DESC`
  dentro de cada demanda. O Postgres ordena só dentro de cada `demanda_id`, já em ordem pelo índice. Cada demanda tem
  poucas dezenas de linhas por hora (limite de 60). Um índice `(demanda_id, id desc)` pediria uma migration nova sem
  ganho medido. Se o RNF-01 da `09-entrega` apontar a página, ele é o próximo passo.
- **Colunas por lista de permissão.** O `id` da linha e o `ator_token_prefixo` nunca saem das leituras (G3.5, e o
  comentário de `andamento.ts`: o prefixo nunca sai em vista). O `toEqual` com os sete campos garante isso.
- **`selectDistinctOn` com `inArray`** numa consulta por página (ADR-16). Com os ids deduplicados antes, cada id vai
  uma vez só como parâmetro.
- **O plano vai para a saída do teste** (`process.stdout.write` com o prefixo `T06 plano`), como o `T35` de
  `test/desempenho/leitura.test.ts`. Assim a revisão vê o plano em qualquer rodada. As linhas só têm ids fictícios.
- **Comandos `pnpm` com `--dir <repo>`.** O shell do agente começa na estruturaAutonoma, e `cd` não está na lista
  Pode. É a mesma forma da 06-T01.

## Pendências

- Nenhuma bloqueia a passagem.
- Para a `06-T07`, a `06-T09` e a `06-T12`: `IMPORTAM_CONSULTAS` em `test/estatico/andamento.test.ts` já lista
  `registrar.ts`, `demandas/consultas.ts` e `leituras-da-fila.ts`. Outro importador por valor reprova o teste.
- Para a `06-T09`: a leitura do Awave deve usar `subconsultaDoUltimoAndamento` com
  `leftJoin(ua, eq(ua.demandaId, demanda.id))` na mesma consulta da autoria, como no teste. O plano dessa forma está
  acima (`demanda_pkey` mais o índice do andamento).
- Para a `09-entrega` (RNF-01): o `Incremental Sort` da página é o único passo que não sai direto do índice. Se a
  medição apontar a página, a saída é o índice `(demanda_id, id desc)`, numa migration nova.
- Nenhuma migration rodou e nenhum banco fora do Testcontainers foi usado.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — arquivos da pasta do pedido
- `grep -n "T06" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md` — onde a T06 aparece no plano
- `grep -rn "T06" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — pendências das entregas anteriores que citam a T06
- `grep -rn "andamento/consultas" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — menções ao módulo nas entregas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261111-0017-v1`, limpo no início
- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/modules/andamento /home/deploy/servidor/projetos/ws-orquestrador-demandas/test/estatico` — arquivos do módulo e dos testes estáticos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files src/db test/banco.ts src/modules/andamento` — arquivos do banco e do módulo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "logger" -- src test` — molde do logger do Drizzle nos testes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "andamento" -- test/estatico/piso-de-assercoes.test.ts` — piso de `andamento.test.ts` (8)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento/consultas.test.ts test/estatico/andamento.test.ts --reporter=dot` — antes do código: 2 arquivos falharam, 1 teste falhou, 7 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento/consultas.test.ts test/estatico/andamento.test.ts --reporter=verbose` — com o código e o volume do plano: 16 passaram, 2 falharam (`Seq Scan` na página e em `demanda`)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento/consultas.test.ts test/estatico/andamento.test.ts --reporter=verbose` — com o volume em lote: 18 passaram, 0 falharam
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 324 arquivos, 7251 passaram, 0 falharam
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só os três arquivos da tarefa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0ac099a --stat -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/db/transacao.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/agentes/entrada-agente.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/pacotes-decisao/consultas.ts next.config.ts drizzle/000[0-7]_*.sql drizzle/meta/000[0-7]_snapshot.json` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — `test/estatico/andamento.test.ts`, 80 inserções e nenhuma remoção
- `grep -rn "expect(" /home/deploy/servidor/projetos/ws-orquestrador-demandas/test/estatico/andamento.test.ts` — 25 linhas

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] a migration roda com o papel migrator e tem RLS e guarda quando a tabela tem `tenant_id` (esta tarefa não cria migration; a tabela não tem `tenant_id`)
- [x] cada migration nova tem, em `## Decisões tomadas`, como desfazê-la (nenhuma migration nova nesta tarefa)
- [x] a migration de esquema fica como saiu do `pnpm db:generate`; o SQL que o Drizzle não gera (RLS forçada, política, função de guarda) fica numa migration criada vazia por `pnpm drizzle-kit generate --custom --name rls_<tabela>` e escrita por você; nenhuma migration já commitada foi editada (nenhuma migration criada nem editada)
