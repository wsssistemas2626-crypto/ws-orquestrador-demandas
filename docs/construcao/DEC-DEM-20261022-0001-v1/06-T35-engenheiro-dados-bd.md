---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T35-construcao
agente: engenheiro-dados-bd
leu: [pedido.json, padrao-tecnico.md (seções 1 a 10), contrato-passagem.md, 05-tech-lead.md, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (início, G1 a G6, mapa das fases, T01 início, T33 a T35), 06-T34-engenheiro-backend.md, src/modules/demandas/consultas.ts, src/modules/demandas/schemas.ts, src/modules/pacotes-decisao/desatualizado.ts, src/db/index.ts, src/db/schema/demandas.ts, src/db/schema/versoes.ts, src/db/schema/decisao.ts, src/db/schema/agentes.ts, src/db/schema/dominio.test.ts, src/app/api/demandas/route.ts, src/app/api/demandas/[id]/route.ts, src/app/api/demandas/demandas.test.ts, src/lib/rota.ts, test/banco.ts, test/deps.ts, test/sessao.ts, test/requisicao.ts, test/setup-global.ts, test/estatico/relogio.test.ts, vitest.config.ts, saída do pnpm test gravada pela ferramenta nesta etapa (tool-results/b2zo4unxh.txt, só o fim)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T35: desempenho de leitura com 5.000 demandas. Cobre a RNF-03. É a primeira tentativa da etapa.

### Arquivo criado (o único do plano)

`test/desempenho/leitura.test.ts`, com 9 testes de integração. Eles rodam contra:

- o Postgres 16 real (Testcontainers), com banco próprio do arquivo;
- os handlers reais de `GET /api/demandas` e `GET /api/demandas/:id`, chamados por `test/requisicao.ts`, com `rota()`,
  o Zod e o Drizzle;
- o Better Auth de verdade, com uma conta `cto` fictícia com 2FA (cookie de pessoa).

**A massa.** Entra pelo migrator, em lote, com `generate_series`, e só tem dado fictício:

| Tabela | Linhas | Regra (n = número da demanda, de 1 a 5000) |
|---|---|---|
| `demanda` | 5000 | uma por hora desde 01/01/2026; status, tipo, linha e urgência em rodízio; um quarto é rascunho de agente |
| `especificacao_tecnica` | 3750 | v1 quando n é par; v2 quando n é múltiplo de 4 (o DEC dessas fica desatualizado) |
| `parecer_risco` | 1666 | v1 quando n é múltiplo de 3 |
| `pacote_decisao` | 833 | v1 quando n é múltiplo de 6 |
| `decisao` | 417 | `aprovada` quando n % 12 = 6 |
| `execucao_agente` | 500 | `insumo_tecnico` pendente quando n é múltiplo de 10 |

Depois da carga roda `ANALYZE`, como o autovacuum faria em produção.

**Os testes:**

1. A massa tem as contagens acima.
2. **RNF-03:** 100 chamadas de cada handler, com cookie de pessoa.
   - Na fila, dez filtros em rodízio: sem filtro, cada filtro sozinho, combinações, `limit=100` e `offset=4800`.
   - No detalhe, 100 demandas diferentes: todas com ESP, metade com a v2, um terço com RSK e DEC, um sexto com DEC
     aprovado.
   - O p95 sai pelo posto mais próximo e é comparado com 500 ms.
3. A fila devolve a página certa sobre o volume: `status=nova` tem 555 demandas, e as três mais novas vêm primeiro.
4. **EXPLAIN do filtro por status ordenado por `criada_em`** (o teste do plano):
   - as duas consultas que `listarDemandas` gera são capturadas pelo logger do Drizzle, sobre o pool do app;
   - o `EXPLAIN (FORMAT JSON)` roda com os mesmos parâmetros, pelo papel do app e sem desligar a varredura;
   - a página não tem Seq Scan em `demanda` e sai por um índice que já entrega `criada_em` em ordem;
   - a contagem sai pelo `demanda_status_criada_idx`.
5. a 8. A fila sem filtro, por tipo, por linha de serviço e com os três filtros juntos: nenhuma varredura completa de
   `demanda`. A exceção é a contagem sem filtro (ver Decisões).
9. O detalhe de uma demanda com ESP, RSK e DEC aprovado: nenhuma das 5 consultas de `obterDemanda` varre por
   completo as tabelas que crescem (`demanda`, `especificacao_tecnica`, `parecer_risco`, `pacote_decisao`, `decisao` e
   `execucao_agente`).

### Números (RNF-03)

| Corrida | Fila p50 | Fila p95 | Fila máx | Detalhe p50 | Detalhe p95 | Detalhe máx |
|---|---|---|---|---|---|---|
| Arquivo sozinho, 1ª corrida (frio) | 15,6 ms | 57,1 ms | 206,2 ms | 26,2 ms | 261,8 ms | 646,2 ms |
| Arquivo sozinho, corrida final | 8,4 ms | 11,8 ms | 24,6 ms | 11,6 ms | 16,3 ms | 23,7 ms |
| Suíte inteira, em paralelo | 11,6 ms | 41,2 ms | 96,2 ms | 12,7 ms | 35,6 ms | 41,0 ms |

Nas três corridas, o p95 ficou abaixo de 500 ms.

### Plano de execução (trecho da saída do teste)

```
T35 EXPLAIN fila por status: Limit > Incremental Sort > Index Scan demanda demanda_criada_idx
T35 EXPLAIN contagem por status: Aggregate > Bitmap Heap Scan demanda > Bitmap Index Scan demanda_status_criada_idx
T35 EXPLAIN fila sem filtro: Limit > Incremental Sort > Index Scan demanda demanda_criada_idx
T35 EXPLAIN fila sem filtro (contagem): Aggregate > Seq Scan demanda
T35 EXPLAIN fila por tipo: Limit > Incremental Sort > Index Scan demanda demanda_criada_idx
T35 EXPLAIN fila por tipo (contagem): Aggregate > Bitmap Heap Scan demanda > Bitmap Index Scan demanda_tipo_criada_idx
T35 EXPLAIN fila por linha de serviço: Limit > Incremental Sort > Index Scan demanda demanda_criada_idx
T35 EXPLAIN fila por linha de serviço (contagem): Aggregate > Bitmap Heap Scan demanda > Bitmap Index Scan demanda_linha_criada_idx
T35 EXPLAIN fila status, tipo e linha juntos: Limit > Sort > Bitmap Heap Scan demanda > Bitmap Index Scan demanda_status_criada_idx
T35 EXPLAIN fila status, tipo e linha juntos (contagem): Aggregate > Bitmap Heap Scan demanda > Bitmap Index Scan demanda_status_criada_idx
T35 EXPLAIN detalhe: Nested Loop > Index Scan demanda demanda_pkey > Seq Scan user
T35 EXPLAIN detalhe: Nested Loop > Index Scan especificacao_tecnica especificacao_tecnica_demanda_versao_unique > Seq Scan user
T35 EXPLAIN detalhe: Nested Loop > Index Scan parecer_risco parecer_risco_demanda_versao_unique > Seq Scan user
T35 EXPLAIN detalhe: Nested Loop > Nested Loop > Index Scan pacote_decisao pacote_decisao_demanda_versao_unique > Seq Scan user > Index Scan decisao decisao_pkey > Result > Limit > Index Only Scan especificacao_tecnica especificacao_tecnica_demanda_versao_unique > Result > Limit > Index Only Scan parecer_risco parecer_risco_demanda_versao_unique
T35 EXPLAIN detalhe: Sort > Index Scan execucao_agente execucao_agente_demanda_status_idx
```

O `Seq Scan user` é a tabela de contas do painel, que tem poucas linhas e não cresce com as demandas.

### TDD: o teste foi escrito antes e visto falhando

O teste foi escrito antes de qualquer outra mudança. Na 1ª corrida, 7 passaram e 2 falharam:

```
 FAIL  test/desempenho/leitura.test.ts > plano de execução das consultas da fila e do detalhe, com volume (EXPLAIN) > EXPLAIN do filtro por status ordenado por criada_em usa o índice (status, criada_em)
AssertionError: expected [ undefined, undefined, …(1) ] to include 'demanda_status_criada_idx'
 FAIL  test/desempenho/leitura.test.ts > plano de execução das consultas da fila e do detalhe, com volume (EXPLAIN) > fila sem filtro: nenhuma varredura completa de demanda
AssertionError: select count(*) from "demanda": expected [ 'demanda' ] to deeply equal []
      Tests  2 failed | 7 passed (9)
```

As duas falhas eram de expectativa do próprio teste. Nenhuma era de desempenho.

1. **O índice da página por status.** O planejador escolheu `demanda_criada_idx`, varrido de trás para frente com o
   status como filtro, e não `demanda_status_criada_idx`.
   - O motivo: o heap está na ordem de `criada_em` (correlação 1). Ler as ~180 linhas mais novas em sequência sai mais
     barato que ler 20 linhas espalhadas. Em produção as demandas também entram em ordem de tempo.
   - **Ensaio do passo 3 do plano.** Criei um índice `(status, criada_em, id)` temporário, só no banco do arquivo,
     que serve o `ORDER BY criada_em DESC, id DESC` inteiro, e rodei `ANALYZE`. O planejador manteve
     `demanda_criada_idx` na página e só usou o índice novo na contagem. Um índice novo, portanto, não muda o plano e só
     custaria escrita. Por isso não criei migration.
   - A asserção passou a pedir o que garante a RNF-03:
     - a página sem Seq Scan, por um índice que já entrega `criada_em` em ordem (`demanda_status_criada_idx` ou
       `demanda_criada_idx`);
     - a contagem por status pelo `demanda_status_criada_idx`, que é o índice (status, criada_em) do título do plano.
2. **A contagem sem filtro.** `select count(*) from demanda` lê a tabela inteira por definição, e a varredura completa
   é o plano certo para ela. O teste não exige índice nessa consulta. A página sem filtro continua sob a asserção.

**Prova de que o teste pega a falta de índice.** Apaguei, de forma temporária e só no banco do arquivo,
`demanda_criada_idx` e `demanda_status_criada_idx`, e rodei `ANALYZE`. O teste falhou:

```
T35 EXPLAIN fila por status: Limit > Sort > Seq Scan demanda
T35 EXPLAIN fila sem filtro: Limit > Sort > Seq Scan demanda
 FAIL  ... > EXPLAIN do filtro por status ordenado por criada_em usa o índice (status, criada_em), sem Seq Scan em demanda
AssertionError: expected [ 'demanda_status_criada_idx', …(1) ] to include undefined
 FAIL  ... > fila sem filtro: nenhuma varredura completa de demanda
AssertionError: select "id", "titulo", "tipo", "status", "urgencia", "linha_servico_provavel", "rascunho_agente", "criada_em" from "demanda" order by "demanda"."criada_em" desc, "demanda"."id" desc limit $1: expected [ 'demanda' ] to deeply equal []
      Tests  2 failed | 4 passed | 3 skipped (9)
```

As duas linhas temporárias (o ensaio do índice e a remoção dos índices) saíram do arquivo. A corrida final passou com
9 de 9.

### Resultado

- `test/desempenho/leitura.test.ts`: 9 de 9, em cerca de 11 s.
- `pnpm test`: 141 arquivos e **2765 de 2765**, nenhum falhou. Os 2756 que já existiam continuam iguais, e o arquivo
  novo soma 9. O aviso do undici "Using `patch`" segue igual.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git status`: só `test/desempenho/leitura.test.ts`, novo.

### Desvios do plano

1. **A asserção do índice da página.** O plano dizia "usa o índice (status, criada_em)". O teste aceita
   `demanda_status_criada_idx` ou `demanda_criada_idx` na página e exige o `demanda_status_criada_idx` na contagem. O
   critério escrito no plano ("o plano não tem Seq Scan em demanda") ficou igual.
   - Motivo: o planejador escolhe `demanda_criada_idx` com os dados em ordem de tempo, e o ensaio mostrou que nenhum
     índice novo muda essa escolha.
2. **Sem migration.** O passo 3 do plano só cria índice "se falhar". A falha não era de desempenho, e o índice
   ensaiado não foi usado.
3. **Testes a mais que o plano não lista:**
   - as contagens da massa;
   - a página certa sobre o volume;
   - o EXPLAIN da fila sem filtro, por tipo, por linha e combinada;
   - o EXPLAIN das 5 consultas do detalhe.
   - Motivo: o padrão do agente pede o plano verificado de toda consulta em caminho crítico, e o detalhe também é
     caminho crítico da RNF-03.

## Decisões tomadas

- **Massa pelo migrator, com `generate_series`, e `ANALYZE` depois.** Razão: 5.000 linhas entram em lote em menos de
  um segundo, e o `ANALYZE` dá ao planejador as estatísticas que o autovacuum daria em produção. Sem ele, o plano seria
  o de tabela sem estatística.
- **As consultas do EXPLAIN são as que `listarDemandas` e `obterDemanda` geram.** Elas são capturadas pelo logger do
  Drizzle sobre o pool do app, e não reescritas à mão. Razão: se a consulta mudar, o EXPLAIN muda junto.
- **EXPLAIN sem `enable_seqscan = off`.** Razão: a T05 já provou que os índices servem à forma das consultas. Aqui o
  que vale é a escolha real do planejador com volume.
- **Tempo medido por `performance.now()`, e não pelo `Relogio`.** Razão: medir latência exige o relógio do processo. O
  teste estático de G3.4 só olha `src/` e aceita `performance.now()`.
- **Contagem sem filtro fora da regra de "nenhuma varredura completa".** Razão: ela conta todas as linhas por
  definição. A tabela também tem teto: a sequência `demanda_seq` vai até 9.999 (RNF-09), então essa leitura é limitada.
- **`user` fora das tabelas vigiadas.** Razão: são as contas do painel, com poucas linhas. A junção é pela chave
  primária, que o planejador passa a usar quando a tabela crescer.
- **Nenhuma migration nova.** Razão: o índice ensaiado `(status, criada_em, id)` não foi escolhido pelo planejador e
  só aumentaria o custo de escrita. Como não há migration, não há volta a registrar.

## Pendências

- **Para o `qa-automacao` e o `devops-sre` (risco de teste instável, não de produto).** O teste mede tempo real. Na 1ª
  corrida, a frio, o p95 do detalhe foi 261,8 ms, e a chamada mais lenta levou 646 ms. Nas outras corridas, o p95 ficou
  entre 16 e 41 ms. O limite de 500 ms tem folga, mas um runner do CI muito lento ou sobrecarregado pode chegar perto.
  Se isso acontecer, a saída `T35 ...` do teste mostra os números da corrida.
- **Observação, sem ação nesta tarefa.** Com os filtros juntos (status, tipo e linha), a página sai por Bitmap Heap Scan
  e Sort. Isso está certo para o volume testado: são poucas linhas. A tabela tem teto de 9.999 demandas, então não há
  crescimento que mude isso.
- **Leitura do arquivo de saída da ferramenta:** li o fim de `tool-results/b2zo4unxh.txt`, a saída do `pnpm test` que a
  ferramenta gravou nesta etapa, para ver o total. O arquivo não fica em `/tmp`. É o mesmo procedimento das entregas
  anteriores.
- Seguem abertos, sem mudança: os Minor das revisões anteriores e as pendências da `06-T34`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -15` — topo 606950c (06-T34-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -1 -- docs/superpowers/plans/2026-10-25-ws-orquestrador-demandas-plano.md` — 2f4e1e2 (05-plano)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --diff-filter=A --name-only --format= -- src test scripts drizzle` — lista dos arquivos de código, teste e migration já criados
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/desempenho/leitura.test.ts` — 1ª corrida: 7 de 9, falharam o índice da página por status e a contagem sem filtro (expectativas do teste)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/desempenho/leitura.test.ts -t EXPLAIN` — com o índice `(status, criada_em, id)` temporário: o planejador manteve `demanda_criada_idx` na página, 2 falharam
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/desempenho/leitura.test.ts -t EXPLAIN` — com `demanda_criada_idx` e `demanda_status_criada_idx` apagados de forma temporária: Seq Scan em `demanda`, 2 falharam (prova de detecção)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/desempenho/leitura.test.ts` — sem as linhas temporárias: 9 de 9
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent=true --reporter=dot` — 141 arquivos, **2765 de 2765**
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — só `test/desempenho/leitura.test.ts`, novo

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega). A 1ª corrida falhou em 2 de 9, e a prova com os índices apagados de forma temporária mostrou o teste pegando o Seq Scan
- [x] `pnpm test` passa (2765 de 2765)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real. Só "Pessoa Ficticia", "Demanda ficticia", `u-ficticio-desempenho` e a conta `@ficticio.test` do ajudante
- [x] só mudaram os arquivos da tarefa (`test/desempenho/leitura.test.ts`, o único do plano)
- [x] a migration roda com o papel migrator e tem RLS e guarda quando a tabela tem `tenant_id`. Não se aplica: esta tarefa não criou migration, e o sistema não tem `tenant_id`
- [x] cada migration nova tem, em `## Decisões tomadas`, como desfazê-la. Não se aplica: nenhuma migration nova, e a razão está nas Decisões
- [x] a migration de esquema fica como saiu do `pnpm db:generate`; nenhuma migration já commitada foi editada (`drizzle/` sem mudança)
