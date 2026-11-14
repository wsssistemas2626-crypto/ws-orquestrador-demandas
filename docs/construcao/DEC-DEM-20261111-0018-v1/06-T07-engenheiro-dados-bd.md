---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T07-construcao
agente: engenheiro-dados-bd
leu: [pedido.json, tarefas.json, contrato-passagem.md, docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md (G0 a G7 e T07), src/modules/andamento/consultas.ts, src/modules/andamento/consultas.test.ts, test/estatico/andamento.test.ts, test/estatico/piso-de-assercoes.test.ts, src/app/(painel)/demandas/fila-andamento.test.ts (linhas 170 a 234), 06-T03-engenheiro-dados-bd.md (formato)]
status: devolvido
proximo: tech-lead
devolvido_para: 05-plano
---
## Entrega

T07 (B-08-1, SB-13, CA-07.1 a CA-07.3, ADR-39, D-08): `andamentosDasDemandas` passa do `selectDistinctOn` (que lia
todas as linhas de andamento de cada demanda e ordenava com `Incremental Sort`) para `demanda` com
`crossJoinLateral` de uma subconsulta `ORDER BY id DESC LIMIT 1` correlacionada por `demanda_id = demanda.id`. O
Drizzle instalado tem `crossJoinLateral`: o `pnpm typecheck` passou limpo com o método (o caso de bloqueio da D-08 não
ocorreu). Sem template `sql`, sem migration, sem índice novo.

**A tarefa volta ao `05-plano`**: a troca da consulta quebra um dublê em `src/app/(painel)/demandas/fila-andamento.test.ts`,
arquivo fora da lista Pode do `engenheiro-dados-bd` e fora da G5 (detalhe em "Suíte" e em Pendências). O código e os
testes da T07 estão prontos na árvore de trabalho, sem commit.

**Arquivos alterados (árvore de trabalho)**
- `src/modules/andamento/consultas.ts`: só o corpo de `andamentosDasDemandas` (com o comentário do plano) e a
  importação de `demanda` de `../../db/schema`. `ultimoAndamento`, `subconsultaDoUltimoAndamento` e `COLUNAS` sem
  linha mudada; a projeção da lateral é chave a chave (sete chaves de `LinhaDeAndamento`, SB-13 / G3.5).
- `src/modules/andamento/consultas.test.ts` (só acréscimos):
  - `sortsSobreAndamento` (com `ORDENACOES = ['Sort', 'Incremental Sort']`, ver Desvios) ao lado de `leAndamentoPor`;
  - teste da página em `planos (RNF-01)`: título ganha "e sem Sort sobre ela" e a asserção
    `expect(sortsSobreAndamento(nos)).toEqual([])`; as duas asserções de hoje (índice no texto, nada de `Seq Scan`)
    ficam iguais;
  - novo `describe('B-08-1: uma linha por demanda (CA-07.3, SB-13)')` no fim do arquivo, com as demandas 4001 e 4002
    (50 andamentos cada, sem `analyze`): `explain (analyze, format json)` com no máximo 2 linhas lidas de
    `andamento_construcao` para 2 demandas; resultado com a linha de maior id e exatamente as sete chaves; ids com
    aspas e com comando SQL dão mapa vazio, sem erro.
- `test/estatico/piso-de-assercoes.test.ts`: só acréscimo, `'src/modules/andamento/consultas.test.ts': 38` (contagem
  do fim da tarefa; era 33 em `HEAD`).

**Testes de hoje em `consultas.test.ts` que passam sem mudar (CA-07.1):** empate de `gravado_em`, demanda sem
andamento fora do mapa, ids repetidos uma vez só nos parâmetros, lista vazia sem consulta, uma consulta por chamada, a
página cheia (200 com andamento, 10 sem, uma inexistente) e o bloco da qa-automacao do 0017 (maior id, não maior
`gravado_em`).

**Teste antes do código (visto falhando)** — `pnpm --dir <repo> test src/modules/andamento/consultas.test.ts --reporter=dot`,
com os testes novos e o código de hoje (segunda rodada, já com o filtro de `Incremental Sort`):

```
T06 plano
Unique  (cost=2.10..96.69 rows=52 width=90)
  ->  Incremental Sort  (cost=2.10..96.53 rows=60 width=90)
        Sort Key: demanda_id, id DESC
        Presorted Key: demanda_id
        ->  Index Scan using andamento_construcao_demanda_id_idx on andamento_construcao  (cost=0.28..94.11 rows=60 width=90)
              Index Cond: (demanda_id = ANY ('{DEM-20261112-0001,DEM-20261112-0003}'::text[]))
 FAIL  ... planos (RNF-01) > a página usa andamento_construcao_demanda_id_idx, sem varrer a tabela e sem Sort sobre ela
AssertionError: expected [ { …(11) } ] to deeply equal []      ("Node Type": "Incremental Sort")
 FAIL  ... B-08-1: uma linha por demanda (CA-07.3, SB-13) > explain analyze: no máximo 2 linhas lidas de andamento_construcao para 2 demandas
AssertionError: expected 100 to be less than or equal to 2
      Tests  2 failed | 15 passed (17)
```

Na primeira rodada, com o filtro do plano (`=== 'Sort'`), só o teste do `explain analyze` falhou (`1 failed | 16
passed`): o nó do `distinct on` é `Incremental Sort`, e a asserção do plano passaria com o defeito. Daí o desvio 1.

**Depois do código** — o mesmo comando: `Tests 17 passed (17)`. Plano em texto da página (o `process.stdout.write` de
`planoDe`):

```
T06 plano
Nested Loop  (cost=0.56..16.80 rows=2 width=82)
  ->  Index Only Scan using demanda_pkey on demanda  (cost=0.28..12.59 rows=2 width=18)
        Index Cond: (id = ANY ('{DEM-20261112-0001,DEM-20261112-0003}'::text[]))
  ->  Limit  (cost=0.28..2.08 rows=1 width=90)
        ->  Index Scan Backward using andamento_construcao_demanda_id_idx on andamento_construcao  (cost=0.28..54.31 rows=30 width=90)
              Index Cond: (demanda_id = demanda.id)
```

Um `Limit` sobre `Index Scan Backward` por demanda, nenhum `Sort` nem `Incremental Sort`, nenhum `Seq Scan`.

**Suíte, lint e tipos:** `pnpm test` **1 falhou, 8128 passaram (8129; 375 de 376 arquivos)**; `pnpm lint` limpo;
`pnpm typecheck` limpo. A falha (não é das instabilidades conhecidas):

```
 FAIL  src/app/(painel)/demandas/fila-andamento.test.ts > andamentosDaPagina (RF-08; ADR-35; AN-12; D-16) > com linhas: só as que passam em lerAndamento entram no mapa, já como AndamentoVista; sem log
AssertionError: expected null not to be null
 ❯ src/app/(painel)/demandas/fila-andamento.test.ts:222:22
```

Causa: o dublê `dbCom` (linhas 193 a 198) imita a cadeia **antiga** do Drizzle (`selectDistinctOn … from … where …
orderBy`, com `orderBy` devolvendo as linhas). A consulta nova chama `select … from … where … orderBy … limit … as`
(a subconsulta) e depois `select … from(demanda) … crossJoinLateral … where`; no dublê, `orderBy` devolve uma Promise
sem `limit`, a leitura lança, `andamentosDaPagina` captura e devolve `null`. Não é defeito da consulta (no banco real,
`consultas.test.ts` 17 de 17); é o dublê preso à forma da consulta. O arquivo está em `src/app/`, fora da lista Pode do
`engenheiro-dados-bd` (G1 do plano: "não edita `src/app/`") e fora da G5, e a T07 diz que a fila não muda.

**G4:** o comando da G4 (diff contra `41108ee` das superfícies congeladas) saiu **vazio**. `git diff --stat`: só os
três arquivos da tarefa (`consultas.test.ts` +44 −1, `consultas.ts` +17 −6, `piso-de-assercoes.test.ts` +3).

**Desvios do plano**
1. `sortsSobreAndamento` filtra `Node Type` em `['Sort', 'Incremental Sort']`, não só `=== 'Sort'`. Razão: no Postgres
   do teste o `distinct on` sobre o índice (demanda_id, id) vira `Incremental Sort` (Presorted Key: demanda_id); com
   `=== 'Sort'` a asserção do CA-07.2 passava com o código antigo (visto na primeira rodada). É endurecimento: exige
   mais que o plano escrito e nada do teste de hoje foi afrouxado.
2. O comentário acima do `describe` novo diz "T07 do DEC-DEM-20261111-0018-v1" e "sem `analyze`" além do texto do
   plano, para seguir o padrão dos blocos acrescentados por etapa no arquivo.

## Decisões tomadas

- Lateral a partir de `demanda` filtrada por `inArray(demanda.id, unicos)`: a chave primária limita as voltas da lateral
  às demandas da página, e cada volta lê no máximo uma linha pelo índice (demanda_id, id) — razão: ADR-39 e B-08-1.
- `crossJoinLateral` (e não `leftJoinLateral`): demanda sem andamento fica fora do mapa, como hoje (CA-07.1).
- Id malicioso ou inexistente: não casa com `demanda.id` (parâmetro, nunca texto da consulta), e a lateral não roda —
  razão: SB-13, provado pelo teste das aspas e do `drop table`.
- Nenhuma migration nesta tarefa (o índice `andamento_construcao_demanda_id_idx` de hoje já serve) — nada a desfazer no
  banco; a volta é reverter o commit da T07.
- `Incremental Sort` conta como Sort no teste de plano — razão: desvio 1.
- Não ajustei o código para caber no dublê antigo: a cadeia `crossJoinLateral` não tem forma compatível com
  `from … where … orderBy`, e moldar a consulta ao dublê trocaria a prova pelo teste.

## Pendências

- Tarefa impossível como está escrita: a troca para `crossJoinLateral` quebra o dublê `dbCom` de `src/app/(painel)/demandas/fila-andamento.test.ts` (linhas 193 a 198, preso à cadeia `selectDistinctOn … orderBy`), arquivo fora da lista Pode do engenheiro-dados-bd e fora da G5; `pnpm test` fica com 1 falha (8128 de 8129).
- O que o `05-plano` precisa decidir: (a) pôr `src/app/(painel)/demandas/fila-andamento.test.ts` na G5 como "mudança de
  forma, não de expectativa" (só o dublê `dbCom` e o comentário da linha 193; as asserções das linhas 222 a 225 e o
  `dbQueFalha` não mudam; a contagem de `expect(` fica igual); e (b) dizer quem edita: o `engenheiro-backend` (que tem
  `src/`) junto ou logo depois da T07, ou liberar esse arquivo ao `engenheiro-dados-bd` nesta tarefa. Proposta de
  dublê, não executada (não pude editar o arquivo):

  ```ts
  // Banco falso que devolve as linhas dadas à consulta da página: a 1ª chamada de select monta a subconsulta lateral
  // (select … from … where … orderBy … limit … as), a 2ª é a página (select … from(demanda) … crossJoinLateral … where).
  const dbCom = (linhas: unknown[]) => {
    const sub = { from: () => ({ where: () => ({ orderBy: () => ({ limit: () => ({ as: () => ({}) }) }) }) }) };
    const pagina = { from: () => ({ crossJoinLateral: () => ({ where: async () => linhas }) }) };
    let chamadas = 0;
    return { select: () => (chamadas++ === 0 ? sub : pagina) } as unknown as Db;
  };
  ```
- O código e os testes da T07 ficam na árvore de trabalho, sem commit (`consultas.ts`, `consultas.test.ts`,
  `piso-de-assercoes.test.ts`): `consultas.test.ts` 17 de 17, `pnpm lint` e `pnpm typecheck` limpos, G4 vazio. Com o
  dublê ajustado, a T07 não precisa de outra mudança de código.
- `src/app/(painel)/demandas/fila-andamento-qa.test.ts` só confere que o log não contém `selectDistinctOn` e passou;
  nenhum outro dublê usa a cadeia antiga (`git grep -n "selectDistinctOn" -- src test scripts`).
- Para a revisão: a G5 não lista `consultas.test.ts`, mas a T07 do plano manda mudar o título e acrescentar uma
  asserção no teste da página; foi só isso (nenhuma asserção saiu; a contagem de `expect(` subiu de 33 para 38).
- RNF-05 (p95 da fila com 5.000 demandas e 6.000 linhas, na `main` e no ramo) fica para a `09-entrega` (D-17).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files docs/construcao/DEC-DEM-20261111-0018-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T07" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "consultas" -- test/estatico/andamento.test.ts test/estatico/piso-de-assercoes.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento/consultas.test.ts --reporter=dot` — 1ª rodada (filtro `=== 'Sort'`): 1 falhou, 16 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento/consultas.test.ts --reporter=dot` — 2ª rodada (com `Incremental Sort`, antes do código): 2 falharam, 15 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo (com `crossJoinLateral`)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento/consultas.test.ts --reporter=dot` — depois do código: 17 de 17
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" -- src/modules/andamento/consultas.test.ts` — 38
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — em segundo plano, saída lida com Read: 1 falhou, 8128 passaram (8129)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 41108ee -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/lib/rota.ts src/db/transacao.ts src/db/privilegios.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/pedido-construcao/pendentes.ts src/modules/pedido-construcao/entregar.ts src/modules/pedido-construcao/receber.ts src/modules/andamento/registrar.ts src/modules/limites.ts src/modules/pacotes-decisao/consultas.ts src/modules/demandas/consultas.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/agentes/entrada-agente.ts next.config.ts 'drizzle/000[0-9]_*.sql' 'drizzle/meta/000[0-9]_snapshot.json'` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — três arquivos da tarefa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- src/modules/andamento/consultas.ts` — só o corpo e a importação
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" HEAD -- src/modules/andamento/consultas.test.ts` — 33
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "dbCom\|selectDistinctOn\|orderBy\|crossJoin" -- "src/app/(painel)/demandas/fila-andamento.test.ts"`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "selectDistinctOn" -- src test scripts`

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [ ] `pnpm test` passa (1 falha: dublê de `src/app/(painel)/demandas/fila-andamento.test.ts`, fora da lista Pode; ver Pendências)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] a migration roda com o papel migrator e tem RLS e guarda quando a tabela tem `tenant_id` (não se aplica: tarefa sem migration)
- [x] cada migration nova tem, em `## Decisões tomadas`, como desfazê-la (não se aplica: nenhuma migration nova)
- [x] a migration de esquema fica como saiu do `pnpm db:generate`; nenhuma migration já commitada foi editada (nenhuma migration tocada)
