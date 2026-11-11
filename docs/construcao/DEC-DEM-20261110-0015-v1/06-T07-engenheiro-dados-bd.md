---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T07-construcao
agente: engenheiro-dados-bd
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (cabeçalho, G1 a G7, T06 a T08), 04-seguranca-aplicacao.md (C07, CV-06, seção 4), src/modules/demandas/consultas.ts, src/modules/demandas/consultas.test.ts (helpers), src/modules/demandas/schemas.ts, src/modules/versoes.ts, src/db/index.ts, src/db/schema/index.ts, src/db/schema/demandas.ts, src/db/schema/versoes.ts, src/db/schema/decisao.ts, test/banco.ts, test/setup-global.ts, test/desempenho/leitura.test.ts, test/estatico/sem-controle-bidi.test.ts, test/estatico/projeto.test.ts, vitest.config.ts, package.json, node_modules/typescript/package.json]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T07, leituras novas da fila, só de consulta (ADR-16, C07, CV-06, RNF-09, CA-15.2). Nenhuma migration, nenhum esquema,
nenhuma escrita e nenhum arquivo que já existia mudou.

### Arquivos criados (só os três da tarefa)

- `src/modules/demandas/resumo-da-fila.ts`: `ContagemPorStatus`, `EtapasNaFila`, `contarDemandasPorStatus(db, filtro)`
  e `etapasDasDemandas(db, ids)`, com as assinaturas do G7.
- `src/modules/demandas/resumo-da-fila.test.ts`: integração com Testcontainers pelo papel do app (20 testes).
- `test/estatico/leituras-da-fila.test.ts`: CV-06 estático e CA-15.2 (7 testes).

`git diff 198e97d --stat -- src/modules` sai vazio, e `git status --short` lista só os três arquivos novos (`??`).
Portanto nenhuma linha mudou em arquivo de `src/modules/` que já existia. O diff do CV-01 (G4, sem os nove
`'use server'`, que estão fora de `src/modules/`) também sai vazio.

### Testes criados

`resumo-da-fila.test.ts` usa um banco por bloco, porque a contagem é da tabela inteira:

- `contarDemandasPorStatus`: CA-05.1 (3 `nova` e 2 `pronta_para_decisao`, os outros status em 0, `todas` igual à soma);
  CA-05.4 (`tipo=bug` com `status=nova` na URL: o status é ignorado); filtro por linha; tipo e linha juntos (E) e
  combinação vazia; CV-06 (chaves exatas `porStatus` com os nove status e `todas`, todos números, SENTINELA ausente);
  CV-06 (uma consulta só, filtros como parâmetros, nenhum valor do filtro no texto do SQL).
- `etapasDasDemandas`: CA-06.1 (ESP v1 e v2 com RSK e sem DEC dá `{ esp: true, rsk: true, dec: false }`, mais os
  casos sem nada, com tudo e só com ESP); id inexistente fica fora do mapa; lista vazia sem nenhuma consulta; CV-06
  (texto de injeção `…' or '1'='1` vai como parâmetro, não aparece no SQL e devolve mapa vazio); CV-06 (cada valor tem só
  `esp`, `rsk` e `dec`, booleanos, e a SENTINELA do título, da ESP e do DEC não aparece).
- RNF-09: com 20 e com 100 demandas, a carga da página (`listarDemandas`, `contarDemandasPorStatus`,
  `etapasDasDemandas`) faz 4 consultas, com a página inteira de uma vez (20 e 100 ids).
- EXPLAIN com 5.000 demandas (a massa de `test/desempenho/leitura.test.ts`, mais `analyze`): etapas da página de 20 e
  de 100, e a contagem sem filtro, por tipo, por linha e com tipo e linha juntos. Também tem um teste da regra do plano
  com planos plantados.

`test/estatico/leituras-da-fila.test.ts` tem duas regras, e cada uma tem casos plantados que a fazem reprovar:

- O módulo tem `select(` e não tem `insert(`, `update(`, `delete(`, `execute(`, `transaction(` nem `.raw(`. Também não
  importa o `sql` do `drizzle-orm` (por nome, por apelido, em várias linhas ou de `drizzle-orm/sql`) nem o namespace
  do `drizzle-orm`.
- Em `src/` e `scripts/`, fora os `*.test.*`, quem importa o módulo por valor cabe em
  `IMPORTADORES_PERMITIDOS = ['src/app/(painel)/demandas/leituras-da-fila.ts']` (D-08). O teste cobre import nomeado,
  em várias linhas, reexport, `export *`, `import()`, `require`, import de efeito e import misto. `import type` e
  `export type` não contam, e o nome parecido (`resumo-da-fila-antigo`) também não.

### Teste antes do código (visto falhando)

`pnpm -C … test src/modules/demandas/resumo-da-fila.test.ts test/estatico/leituras-da-fila.test.ts`, sem o módulo:

```
 FAIL  src/modules/demandas/resumo-da-fila.test.ts [ src/modules/demandas/resumo-da-fila.test.ts ]
Error: Cannot find module './resumo-da-fila' imported from …/src/modules/demandas/resumo-da-fila.test.ts
 FAIL  test/estatico/leituras-da-fila.test.ts > CV-06: resumo-da-fila.ts só lê > o módulo existe e não tem achado
Error: ENOENT: no such file or directory, open '…/src/modules/demandas/resumo-da-fila.ts'
 Test Files  2 failed (2)
      Tests  1 failed | 6 passed (7)
```

Os 6 que passaram nessa rodada são os casos plantados do estático, que não dependem do módulo.

Com o código do plano (três `leftJoin` com `countDistinct`), o EXPLAIN reprovou:

```
T07 EXPLAIN etapas (20 ids, 9.6 ms): Aggregate > Sort > Hash Join > Seq Scan parecer_risco > Hash > Hash Join > Seq Scan pacote_decisao > Hash > Hash Join > Seq Scan especificacao_tecnica > Hash > Index Only Scan demanda demanda_pkey
AssertionError: expected [ 'parecer_risco', …(2) ] to deeply equal []
```

### Plano de execução verificado (EXPLAIN (FORMAT JSON, VERBOSE), Postgres 16, 5.000 demandas, rodada final)

```
T07 EXPLAIN etapas (20 ids, 7.1 ms): Index Only Scan demanda demanda_pkey > [SubPlan 1] Index Only Scan especificacao_tecnica especificacao_tecnica_demanda_versao_unique > [SubPlan 4] Seq Scan parecer_risco > [SubPlan 6] Seq Scan pacote_decisao
T07 EXPLAIN etapas (20 ids), saída: demanda.id, (SubPlan 1), (hashed SubPlan 4), (hashed SubPlan 6)
T07 EXPLAIN etapas (100 ids, 6.1 ms): Index Only Scan demanda demanda_pkey > [SubPlan 2] Seq Scan especificacao_tecnica > [SubPlan 4] Seq Scan parecer_risco > [SubPlan 6] Seq Scan pacote_decisao
T07 EXPLAIN etapas (100 ids), saída: demanda.id, (hashed SubPlan 2), (hashed SubPlan 4), (hashed SubPlan 6)
T07 EXPLAIN contagem sem filtro (2.5 ms): Aggregate > Seq Scan demanda
T07 EXPLAIN contagem por tipo (1.7 ms): Aggregate > Bitmap Heap Scan demanda > Bitmap Index Scan demanda_tipo_criada_idx
T07 EXPLAIN contagem por linha de serviço (2.0 ms): Aggregate > Bitmap Heap Scan demanda > Bitmap Index Scan demanda_linha_criada_idx
T07 EXPLAIN contagem tipo e linha juntos (1.4 ms): Aggregate > Bitmap Heap Scan demanda > Bitmap Index Scan demanda_tipo_criada_idx
```

Leitura do plano:

- A página entra por `demanda_pkey`.
- Para cada tabela de versões, o planejador escolhe entre buscar no índice único `(demanda_id, versao)` por demanda
  (SubPlan 1, ESP com 20 ids) e ler a tabela uma vez com hash (`hashed SubPlan`). Nos dois casos a tabela é lida no
  máximo uma vez por consulta.
- O teste reprova junção, Seq Scan fora de `hashed SubPlan` (seria uma varredura por demanda da página), `demanda` sem
  `demanda_pkey` e consulta acima de 1 s.
- A contagem sem filtro lê `demanda` inteira de propósito: contar tudo é ler tudo, e a tabela tem no máximo 9.999 linhas
  (`demanda_seq`, `maxValue 9999`). Com filtro, usa `demanda_tipo_criada_idx` ou `demanda_linha_criada_idx`.
- Nenhum índice novo é necessário.

## Decisões tomadas

- **Desvio do plano:** `etapasDasDemandas` usa um `exists` correlacionado por tabela (subconsulta do query builder,
  `exists(db.select(…)).mapWith(Boolean)`, sem `sql`) no lugar dos três `leftJoin` com `countDistinct`. Com a junção, o
  EXPLAIN mostrou Hash Join com Seq Scan nas três tabelas de versões em toda carga, um custo que segue o tamanho do
  banco e não o da página, além de multiplicar as linhas (ESP × RSK × DEC por demanda). Com `exists`, o planejador
  pode buscar pelo índice por demanda, e o retorno já sai booleano. Continua uma consulta só. O plano mandava trocar só
  acima de 1 s, e o tempo medido era de 8 a 10 ms. Troquei pelo critério do meu contrato: consulta crítica com plano de
  execução verificado, sem varredura que cresça com o banco.
- Cada `describe` do teste de integração tem banco próprio. A contagem é da tabela inteira, e um bloco não pode contar
  as demandas de outro.
- No RNF-09, `limit` é igual ao total (página de 20 e de 100 ids), e não `parse({})` (20 nos dois casos). Assim o teste
  prova que o número de consultas não cresce com o tamanho da página.
- O EXPLAIN fica em `resumo-da-fila.test.ts`, e não em `test/desempenho/leitura.test.ts`: assim só mudam os arquivos da
  tarefa. A massa é a mesma.
- Seq Scan em tabela de versões só é aceito dentro de `hashed SubPlan`. No Postgres 16 o nó se chama só "SubPlan N", e
  o hash aparece na expressão que o usa. Por isso o EXPLAIN é `VERBOSE`. Se uma versão nova do Postgres mudar esse
  texto, o teste reprova, e não passa calado.
- O estático lê as importações pela árvore do TypeScript (`typescript` já é devDependency), não por regex. Assim o
  import em várias linhas e o `type` por especificador contam certo.
- `import type` não conta como importador, porque some na compilação: a T08 importa os tipos em `dados-da-fila.ts`. Os
  testes também não contam, porque não fazem parte da cadeia que roda.
- O CV-06 da 04 diz que o módulo é importado "só por `page.tsx`". Segui o D-08 do plano
  (`leituras-da-fila.ts`, só servidor, que por sua vez é importado só pela página). A T09 acrescenta a regra da cadeia.
- As regras de escrita vão além da lista do plano: também cobrem `transaction(`, import por namespace do `drizzle-orm`,
  `sql` por apelido ou de `drizzle-orm/sql`, e exigem `select(`. Fecham caminhos para o `sql` entrar por outro nome.
- **Migration:** nenhuma. Não há o que desfazer no banco. Para desfazer a tarefa, basta remover os três arquivos novos,
  porque nenhum outro arquivo depende deles nesta etapa.
- **Índices e LGPD:** nenhum índice novo, nenhum dado pessoal novo. O retorno só tem contagens e booleanos, e o nome do
  solicitante não é lido (D3 da 04).

## Pendências

- `engenheiro-frontend` (T09): acrescentar ao `test/estatico/leituras-da-fila.test.ts` a regra da cadeia até a página
  (`leituras-da-fila.ts` importado só por `src/app/(painel)/demandas/page.tsx`, depois de `exigirPessoaNaPagina` e
  `autorizar(pessoa, 'listar_demandas')`). `IMPORTADORES_PERMITIDOS` já tem `leituras-da-fila.ts`.
- `seguranca-aplicacao` (08, não bloqueia): o texto do CV-06 ("só importado por `page.tsx`") difere do D-08 do plano, e
  o estático segue o plano. Convém registrar isso na revisão.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -15` — topo 63c754a (06-T06-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo, antes de escrever
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — antes do código: falhou (módulo inexistente; saída truncada pelo terminal)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/resumo-da-fila.test.ts test/estatico/leituras-da-fila.test.ts` — antes do código: 2 arquivos falharam, 1 teste falhou e 6 passaram
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/resumo-da-fila.test.ts test/estatico/leituras-da-fila.test.ts` — com `leftJoin`: 2 falharam (Seq Scan nas três tabelas), 24 passaram
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/resumo-da-fila.test.ts test/estatico/leituras-da-fila.test.ts` — com `exists` e a regra sem `VERBOSE`: 2 falharam, 25 passaram
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/resumo-da-fila.test.ts test/estatico/leituras-da-fila.test.ts` — 27 de 27
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 221 arquivos, 4859 de 4859
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d --stat -- src/modules` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só os três arquivos novos (`??`)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d --stat -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml` — vazio

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] a migration roda com o papel migrator e tem RLS e guarda quando a tabela tem `tenant_id` (não há migration nesta tarefa; nenhuma tabela tem `tenant_id`)
- [x] cada migration nova tem, em `## Decisões tomadas`, como desfazê-la (nenhuma migration nova; registrado em Decisões)
- [x] a migration de esquema fica como saiu do `pnpm db:generate`; o SQL que o Drizzle não gera fica numa migration custom; nenhuma migration já commitada foi editada (nenhuma migration criada nem editada)
