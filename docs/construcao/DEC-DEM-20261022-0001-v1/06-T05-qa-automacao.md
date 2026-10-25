---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T05-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G5 e T03 a T06), 01-analista-requisitos.md (glossário e RF-01 a RF-26 e RNF-01 a RNF-18), 06-T05-engenheiro-dados-bd.md, 06-T05-tech-lead.md, 06-T04-qa-automacao.md, git show 7069464, src/db/schema/demandas.ts, src/db/schema/versoes.ts, src/db/schema/decisao.ts, src/db/privilegios.ts, src/db/imutabilidade.test.ts, src/db/schema/dominio.test.ts, test/banco.ts, vitest.config.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T05 (tabelas de demanda, versões e decisão, com privilégios e índices; risco alto). O código testado é o
do commit `7069464`; o `65d05b5` só traz a revisão do tech-lead. Todos os testes novos passaram no código como está,
e por isso nada volta para a construção. Só mudaram arquivos de teste: dois que já existiam, só com acréscimos, e um
novo. Nenhum arquivo de código, migration, configuração ou dependência mudou.

### Critérios da tarefa e os testes que os cobrem

| # | Critério (plano T05, RF-11, CA-11.2, C-34, RNF-09, RNF-03, T-01) | Arquivo | Testes |
|---|---|---|---|
| 1 | RF-11 e CA-11.2: com o papel do app, ESP, RSK, DEC, aprovação e decisão não mudam nem saem | `src/db/imutabilidade.test.ts` | `%s é recusado com o papel do app` (9 casos, do plano). **Novos**: `%s: "%s" é recusado (42501) e a linha fica igual` (16 casos, com a linha gravada em cada tabela e o `row_to_json` igual antes e depois: 3 `UPDATE` e 1 `DELETE` na ESP, `UPDATE` e `DELETE` no RSK, 2 `UPDATE` e 1 `DELETE` no DEC, `UPDATE` e `DELETE` na aprovação e na decisão); `pelo Drizzle, o caminho das tarefas seguintes, o UPDATE e o DELETE da ESP também são recusados`; `dentro de comTransacao, o UPDATE do DEC é recusado e desfaz o que a transação gravou antes` |
| 2 | CA-11.3 no banco: uma decisão por DEC | `src/db/schema/dominio.test.ts`, `src/db/imutabilidade.test.ts` | `uma decisão só por DEC (23505, CA-11.3 no banco)`; **novo** `decisao: "update decisao set status_decisao = 'arquivada' ..." é recusado (42501) e a linha fica igual` (a decisão aprovada não vira arquivada) |
| 3 | C-34, `demanda`: `SELECT`, `INSERT` e `UPDATE` só nas 15 colunas; sem `DELETE`; id, autoria e criação imutáveis | `src/db/imutabilidade.test.ts`, `src/db/privilegios.test.ts`, `src/db/schema/dominio.test.ts` | `o app altera título, status, listas e atualizada_em`; `mudar %s é recusado com o papel do app (42501)` (4 casos); `UPDATE por coluna só nas colunas listadas` (guarda da T04, que agora percorre a `demanda`); **novos** `demanda: "delete from demanda where id = $1" é recusado (42501) e a linha fica igual` e `o app altera a demanda pelo Drizzle nas colunas da regra, e a autoria não muda` |
| 4 | C-34, `entrada_bruta`: `UPDATE` só em `texto`, `origem` e `expurgada_em`; estados do expurgo | `src/db/imutabilidade.test.ts`, `src/db/schema/dominio.test.ts` | `o expurgo consegue limpar texto e origem de entrada_bruta`; `update entrada_bruta set recebida_em = now() é recusado`; os três estados recusados e a origem objeto; **novos** `entrada_bruta: "delete ..."` e `entrada_bruta: "update entrada_bruta set demanda_id ..."` (42501, linha igual) e `o expurgo pela metade é recusado (23514): texto sem a data, ou a data com o texto guardado` |
| 5 | T-01, `entrada_pendente`: o app faz o CRUD; `status` e `solicitante_papel` na lista | `src/db/schema/dominio.test.ts` | `entrada_pendente: o app inclui (nasce aguardando), marca falha e apaga`; `entrada_pendente: %s fora da lista (%j) é recusado (23514)` (2 casos); `entrada pendente vencida (expurgo) sai por índice` |
| 6 | C-34 em toda tabela nova: privilégio exato, sem `TRUNCATE`, e a sequência só com `USAGE` | `src/db/privilegios.test.ts` (T04) | a guarda percorre `PRIVILEGIOS` e `SEQUENCIAS`, e por isso já cobre as 8 tabelas e a `demanda_seq`: `privilégios de tabela são exatamente os da regra (...)`, `TRUNCATE é recusado ao app em toda tabela da regra (...)`, `toda sequência de public fora de SEQUENCIAS fica sem privilégio do app (...)` |
| 7 | RNF-09 e RF-04: `demanda_seq` global, de 1 a 9999, `NO CYCLE`, `CACHE 1`; o app só tem `nextval` | `src/db/sequencia.test.ts` (novo), `src/db/imutabilidade.test.ts` | `a sequência para em 9999` (do plano). **Novos**: `o primeiro número é 1, e os seguintes vêm em ordem, sem pular`; `duas conexões do app alternadas recebem números consecutivos (CACHE 1 ...)`; `20 pedidos ao mesmo tempo recebem 20 números distintos, de 1 a 20`; `o número usado numa transação desfeita não volta (...)`; `9999 ainda sai; o 10.000º pedido falha com 2200H e continua falhando (NO CYCLE ...)`; `%s é recusado com o papel do app (42501)` (4 casos: `setval`, leitura direta, `alter sequence` e `drop sequence`); `o catálogo confere: limites 1 e 9999, sem ciclo, cache 1, dona não é o app` |
| 8 | Id da demanda no formato `DEM-AAAAMMDD-NNNN`; id de ESP, RSK e DEC derivado da demanda e da versão; versão de 1 a 9999 | `src/db/schema/dominio.test.ts` | `id fora do formato DEM-AAAAMMDD-NNNN (%j) é recusado (23514)` (5 casos); `id incoerente com a demanda ou a versão é recusado (23514)`; `versão %i fora de 1..9999 é recusada (23514)` (ESP); **novos** `%s: versão %i fora de 1..9999 é recusada (23514)` (4 casos, RSK e DEC) e `agente com rascunho e pessoa sem rascunho entram nos dois artefatos, e v9999 é o último número aceito` |
| 9 | `rascunho_agente = (autor_tipo = 'agente')` nos três artefatos (C-11; parecer 4 da `06-T05-tech-lead.md`) | `src/db/schema/dominio.test.ts` | `rascunho_agente acompanha o autor: %s é recusado (...)` (ESP, 2 casos); **novos** `%s: rascunho_agente acompanha o autor, %s é recusado (23514, C-11 no banco)` (4 casos, RSK e DEC), `%s: rascunho_agente é obrigatório (23502)` (2 casos) e o caso positivo do item 8 |
| 10 | Unicidade `(demanda_id, versao)`, segunda barreira de CA-04.3 | `src/db/schema/dominio.test.ts` | `a mesma versão da mesma demanda não entra duas vezes (23505)`; **novo** `5 conexões gravam a ESP v1 da mesma demanda ao mesmo tempo: 1 entra e 4 recebem 23505` |
| 11 | DEC cita só ESP e RSK da própria demanda; FKs sem cascata | `src/db/schema/dominio.test.ts`, `src/db/imutabilidade.test.ts` | `o DEC não cita ESP nem RSK de outra demanda (...)`; `o DEC só cita ESP e RSK que existem (23503)`; **novo** `nem o migrator apaga em silêncio: demanda com versões não sai (FK sem cascata, 23503)` |
| 12 | Decisão: opção só A ou B, obrigatória na aprovada e nula nas outras; documento da administradora (CA-14.3 no banco) | `src/db/schema/dominio.test.ts` | `decisão %s é recusada (23514)` (4 casos); `aprovação da administradora exige referência e data do documento (...)`; **novos** `DEC v%i %s sem opção é gravado, com a opção nula` (devolvida e arquivada) e `aprovação de papel cto não exige documento, e o mesmo DEC aceita a da administradora com documento` |
| 13 | Trava da demanda com o `UPDATE` por coluna (CA-04.3, T14) | `src/db/imutabilidade.test.ts` | `a trava da demanda (select ... for update) funciona com o UPDATE por coluna`; **novo** `a trava da demanda segura a segunda transação: o segundo "for update nowait" recebe 55P03` |
| 14 | RNF-03: índices das consultas da fila, do limite por ator, da maior versão, das aprovações e do expurgo | `src/db/schema/dominio.test.ts` | `%s sai por índice` (11 casos, `EXPLAIN`). O p95 com 5.000 demandas é a T35 |
| 15 | Esquema TypeScript igual à migration, com listas e opções em `jsonb` pelo Drizzle | `src/db/schema/dominio.test.ts` | `enumerações do banco são as listas exportadas pelo esquema` (20 casos); **novo** `grava e lê de volta demanda, ESP, RSK e DEC com listas e opções` (as listas de JS chegam como `jsonb` de tipo `array` e voltam como lista) |
| 16 | Parecer 2 da `06-T04-tech-lead.md`: conexão derrubada no meio da transação | `src/db/transacao.test.ts` | `conexão derrubada no meio da transação: o erro sai, o processo segue, a conexão morta sai do pool e a próxima transação grava` (do engenheiro, conferido: segue a forma indicada pela `06-T04-testes` e não é instável nas 5 rodadas abaixo) |

### Testes acrescentados (48)

- `src/db/sequencia.test.ts` (novo), 10 casos em dois `describe`: 5 do comportamento da `demanda_seq` e 5 do que o
  app pode nela.
- `src/db/imutabilidade.test.ts`, 21 casos num `describe` novo no fim do arquivo, com a cadeia completa gravada
  (`DEM-20261022-0501`).
- `src/db/schema/dominio.test.ts`, 17 casos em quatro `describe` novos no fim do arquivo: RSK e DEC (parecer 4 e
  versão, 11), decisão e aprovação aceitas (3), gravação simultânea (1) e Drizzle (2).

### Resultado

- `pnpm test`: 22 arquivos, 423 testes, 423 passaram e 0 falharam. Eram 375 em 21 arquivos, e agora há 48 testes
  novos e 1 arquivo novo. A suíte inteira rodou três vezes com o mesmo resultado.
- Os três arquivos da tarefa, sozinhos, deram 170 de 170 em ordem embaralhada com duas sementes diferentes (a
  aleatória e `42`).
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.

### Conferência com `git diff`

- `src/db/imutabilidade.test.ts`: só acréscimos. Os imports ganharam `eq`, `demanda`, `especificacaoTecnica`,
  `comTransacao` e o ajudante `codigoPg` (`@@ -2,0`, `@@ -4,0`), e o resto vem depois do último teste (`@@ -81,0`).
- `src/db/schema/dominio.test.ts`: só acréscimos. O import de `./index` ganhou `demanda`, `especificacaoTecnica`,
  `pacoteDecisao` e `parecerRisco` (`@@ -9,0`), e o resto vem depois do último teste (`@@ -470,0`).
- Nenhum teste apagado, nenhuma asserção mudada e nenhum `.skip`, `.only` ou `.todo`.

## Decisões tomadas

- O parecer 4 ganhou um `it.each` novo para RSK e DEC, e o `it.each` antigo da ESP ficou como estava. Mexer nele
  mudaria um teste existente sem necessidade.
- Os testes de imutabilidade do plano rodam com as tabelas de versão vazias. Nesse caso o Postgres recusa por
  privilégio antes de procurar linha, e o teste não mostra que o conteúdo ficou igual. Os novos gravam uma linha em cada
  tabela e comparam o `row_to_json` antes e depois. Assim, um `GRANT UPDATE` esquecido numa migration futura quebra o
  teste, e um gatilho que engolisse o comando sem erro também.
- O erro do Drizzle é lido pelo `codigoPg`, que aceita o código no próprio erro ou na causa. O teste fixa que o banco
  recusa (42501), não a forma do embrulho do Drizzle, que é da T03 e da T11 (`mapearErro`).
- Na gravação simultânea, a recusa vem da chave primária (`especificacao_tecnica_pkey`). O id é derivado da demanda e da
  versão pelo `CHECK`, e por isso a PK já barra a repetição antes do único `(demanda_id, versao)`. O teste aceita as
  duas restrições e mais nenhuma: as duas são a barreira que CA-04.3 pede.
- A `demanda_seq` ganhou arquivo próprio. O `setval` do migrator muda o estado da sequência, e cada teste começa num
  ponto fixado no `beforeEach` (`setval(1, false)`). Com isso nenhum teste depende do que o anterior consumiu.
- A trava foi provada com `for update nowait` (55P03), sem espera por tempo. Um teste que esperasse a segunda
  transação bloquear dependeria do relógio.
- O caso `nem o migrator apaga em silêncio` fixa a decisão do engenheiro de FKs sem cascata. Se uma migration futura
  puser `ON DELETE CASCADE`, apagar a demanda levaria as versões junto, e o teste quebra.
- As datas dos testes novos são ISO fixas (`2026-10-22T12:00:00Z`, `2026-10-23T09:00:00Z`), e nenhum usa `now()`
  nem `new Date()` sem argumento. Cada `describe` novo usa demandas só suas (`DEM-20261022-0301` a `0602`), e cada
  arquivo tem banco próprio (`novoBanco`). Nenhum teste novo depende da ordem nem do relógio real.
- Os dados são todos fictícios: `Pessoa Ficticia`, `u-ficticio`, `DOC-FICTICIO-2`, `https://exemplo.test/anexo`,
  `sistema-ficticio` e textos com "ficticio". Não há segredo, token, valor de `.env` nem dado pessoal real.

## Pendências

- Nenhuma que segure a passagem.
- T06 (`engenheiro-dados-bd`), parecer 1 da `06-T05-tech-lead.md`: quando o `REVOKE UPDATE ("rascunho_agente")` entrar,
  `src/db/imutabilidade.test.ts:63` (`o app altera título, status, listas e atualizada_em`) põe `rascunho_agente = false`
  no `UPDATE` e passa a falhar com 42501. A troca desse caso pelo que espera 42501 é a que o tech-lead já indicou.
  Os testes novos desta etapa não alteram `rascunho_agente` da demanda.
- T14 e T15 (`engenheiro-backend`): o 2200H da `demanda_seq` se repete a cada pedido depois de 9999 (sem ciclo), e a
  violação de versão repetida chega como 23505 na `especificacao_tecnica_pkey`, não na restrição única. O tratamento
  de `capacidade_de_ids_esgotada` e o de nova tentativa da trava devem olhar o código (`2200H`, `23505`) e não o nome
  da restrição.
- Continuam valendo os pareceres 1, 2 e 3 da `06-T05-tech-lead.md` (T06) e as pendências da T04 (T07, T08, T33 e
  `09-entrega`).
- Para o `conferir`: rodei `pnpm test` com os três arquivos da tarefa como argumento, e duas vezes com
  `--sequence.shuffle`. As três foram leituras de teste, listadas abaixo do jeito que rodaram.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 7069464978e0e2de19449d4fb02400e6ce59364c` — 16 arquivos: os da T05, `transacao.ts` e o seu teste, a entrega e o registro do maestro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8 --stat` — último commit `65d05b5` (06-T05-revisao), que só traz a revisão
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`, antes de começar
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline --stat -3 -- docs/superpowers` — localizar o plano
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --name-only --format=%H 5f3c9e8` — caminho do plano
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 7069464978e0e2de19449d4fb02400e6ce59364c -- src/db/transacao.ts src/db/transacao.test.ts drizzle/0003_rls_privilegios_dominio.sql src/db/schema/index.ts` — diff da transação, dos privilégios e do índice do esquema
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 21 arquivos, 375 de 375, antes dos testes novos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/db/sequencia.test.ts src/db/imutabilidade.test.ts src/db/schema/dominio.test.ts` — 169 de 170; 1 falha do próprio teste (esperava a restrição única, e a recusa veio da PK)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/db/sequencia.test.ts src/db/imutabilidade.test.ts src/db/schema/dominio.test.ts --sequence.shuffle` — 170 de 170 em ordem embaralhada
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/db/sequencia.test.ts src/db/imutabilidade.test.ts src/db/schema/dominio.test.ts --sequence.shuffle --sequence.seed=42` — 170 de 170 com a semente 42
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — 5 erros nos testes novos (índice e desestruturação possivelmente indefinidos), corrigidos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 22 arquivos, 423 de 423
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 22 arquivos, 423 de 423, segunda rodada
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — 2 arquivos de teste alterados e 1 novo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -U0` — só acréscimos, inclusive nas linhas de import
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 22 arquivos, 423 de 423, terceira rodada, depois de corrigir um comentário
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
