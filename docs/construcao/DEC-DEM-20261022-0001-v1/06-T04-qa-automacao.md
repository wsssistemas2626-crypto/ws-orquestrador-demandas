---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T04-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T01 a T05), 01-analista-requisitos.md (RF-01 a RF-02 e RF-13 a RF-22), 02-arquiteto-solucoes.md (seções 1 a 10), 04-seguranca-aplicacao.md (seções 2 e 3), 05-tech-lead.md (cabeçalho), 06-T04-engenheiro-dados-bd.md, 06-T04-tech-lead.md, 06-T03-qa-automacao.md, git show b156a37, vitest.config.ts, eslint.config.mjs, drizzle/meta/_journal.json, test/sentinelas.ts, src/db/privilegios.test.ts, src/db/transacao.test.ts, scripts/migrate.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T04 (banco: conexão, transação, ajudante de teste, migrate, tabelas de acesso e histórico, guarda de
privilégios; risco alto). Cobre C-34, ADR-03, ADR-12, CA-21.2 e a parte de RF-21 que cabe à T04. O código testado é o
do commit `b156a37`; o `4f27ab6` só traz a revisão do tech-lead. Todos os testes novos passaram no código como está, e
por isso nada volta para a construção. Só mudaram arquivos de teste: três já existentes (só acréscimos) e três novos.
Nenhum arquivo de código, migration, configuração ou dependência foi alterado.

### Critérios da tarefa e os testes que os cobrem

| # | Critério (plano T04, C-34, ADR-03, ADR-12, CA-21.2, RF-21) | Arquivo | Testes |
|---|---|---|---|
| 1 | Toda tabela de `public` tem regra em `PRIVILEGIOS`, e toda regra tem tabela (ADR-03) | `src/db/privilegios.test.ts` | `toda tabela do esquema public tem regra, e toda regra tem tabela` |
| 2 | Nas tabelas imutáveis, só `SELECT` e `INSERT`; sem `TRUNCATE`, `TRIGGER` nem `REFERENCES` (C-34) | `src/db/privilegios.test.ts` | `privilégios de tabela são exatamente os da regra (sem TRUNCATE, TRIGGER, REFERENCES)`; `PUBLIC não tem privilégio em tabela do esquema public`; **novos** `TRUNCATE é recusado ao app em toda tabela da regra, mutável ou não (42501)` e `o papel do app não faz DDL: criar gatilho em user é recusado (42501)` |
| 3 | `UPDATE` por coluna só nas colunas listadas (`token_servico.revogado_em`) | `src/db/privilegios.test.ts`, `src/db/schema/acesso.test.ts` | `UPDATE por coluna só nas colunas listadas`; `nenhum privilégio por coluna além da regra (...)`; `token_servico: o app só revoga; não troca hash nem agente, nem apaga`; **novo** `o app revoga de fato: grava revogado_em e mantém hash, agente e prefixo` (o teste antigo só prova o privilégio, com `where false`) |
| 4 | O app não é dono de tabela, sequência, esquema nem banco; sem superusuário, `CREATEROLE` nem `CREATEDB` (C-34) | `src/db/privilegios.test.ts` | `o papel do app não é dono de nada, não é superusuário e não cria esquema, banco ou papel`; **novo** `o app não é dono de esquema nem do banco` |
| 5 | O app sem `CREATE` em esquema e sem DDL (C-34, ADR-04, ADR-12) | `src/db/privilegios.test.ts`, `scripts/migrate.test.ts` | **novos** `o app tem USAGE só em public e drizzle, e CREATE em nenhum esquema nem no banco`; `o papel do app não faz DDL: %s é recusado (42501)` (8 casos: criar tabela, criar esquema, `alter table evento`, `drop table evento`, criar índice, criar gatilho, criar função, criar tabela em `drizzle`); `com o papel do app, a migração é recusada pelo banco (o app não tem DDL)` |
| 6 | Sequências: só `USAGE` nas listadas, e nenhuma fora da lista com privilégio (C-34; parecer 1 da `06-T04-tech-lead.md`) | `src/db/privilegios.test.ts` | `sequências só com USAGE` (hoje vazio); **novos** `toda sequência de public fora de SEQUENCIAS fica sem privilégio do app, e toda entrada de SEQUENCIAS existe` e `o app não mexe na sequência da identidade de evento: nextval e setval recusados (42501)` |
| 7 | `UPDATE`, `DELETE` e `TRUNCATE` em `evento` recusados com o papel do app (CA-21.2, C-34) | `src/db/privilegios.test.ts`, `src/db/transacao.test.ts`, `scripts/migrate.test.ts` | `evento: UPDATE, DELETE e TRUNCATE recusados com o papel do app (CA-21.2)`; **novos** `dentro da transação, o papel do app também não altera evento (CA-21.2) e a inclusão anterior é desfeita` e `rodar de novo num banco já migrado não aplica nada nem duplica o registro` (que confere a recusa depois da segunda migração) |
| 8 | Migration só com o migrator; o app lê `drizzle.__drizzle_migrations` (saúde) e não o altera (ADR-12) | `src/db/privilegios.test.ts`, `scripts/migrate.test.ts` | `o app lê o registro de migrations (saúde, ADR-12)`; `o app não altera o registro de migrations`; **novos** `no registro de migrations o app tem só SELECT: INSERT, UPDATE e TRUNCATE também recusados`, `o registro de migrations tem exatamente as entradas do journal, na ordem`, `rodar de novo num banco já migrado não aplica nada nem duplica o registro` e `com senha errada, o erro sai do migrar (não é engolido)` |
| 9 | `scripts/migrate.ts` só roda pela linha de comando, com caminho absoluto ou relativo (desvio aceito do engenheiro) | `scripts/migrate.test.ts` | `roda quando o arquivo é o chamado pela linha de comando, com caminho absoluto ou relativo`; `não roda quando é importado (ajudante de teste, worker)`; **novos** `reconhece %j a partir de %j` (4 casos: `./`, `..` no meio, `..` a partir da raiz do app e a partir de `scripts/`), `não roda com %s` (5 casos: mesmo nome em outra pasta, mesmo relativo em outra pasta, outro arquivo da pasta, `.js` de mesmo nome e argumento vazio) e `caminho com espaço e acento: a URL do módulo e o argv batem` |
| 10 | `comTransacao`: erro desfaz o Drizzle e o executor juntos; sem erro grava e devolve o resultado; a conexão volta ao pool (G3.8, ADR-06) | `src/db/transacao.test.ts` | `erro dentro da transação desfaz o Drizzle e o executor juntos`; `sem erro, grava o Drizzle e o executor juntos e devolve o resultado da função`; `erro do banco dentro da transação desfaz e devolve a conexão ao pool`; **novos** `o Drizzle e o executor da transação usam a mesma conexão (ADR-06: o job enfileirado desfaz junto)`, `antes do commit, o que a transação gravou não aparece para outra conexão`, `o erro da função sai como veio, sem embrulho, e nada fica gravado` e `depois de 10 transações com erro ao mesmo tempo, 10 transações seguintes gravam em todas as conexões` |
| 11 | Pool do app com `statement_timeout` de 10 s | `src/db/transacao.test.ts` | `a conexão tem statement_timeout de 10 s` |
| 12 | `evento` (RF-21, parte da T04): ator `pessoa`, `agente` ou `sistema` com identificador; entidade, id e ação; antes e depois em jsonb; `demanda_id` nulo; `ocorrido_em` sem padrão (G3.4); id gerado pelo banco; índice `(demanda_id, ocorrido_em)` | `src/db/transacao.test.ts`, `src/db/schema/historico.test.ts` (novo) | `evento recusa ator_tipo fora da lista`; **novos** `grava e lê de volta um evento de ator %s, com antes e depois em jsonb` (3 casos), `evento de configuração fica sem demanda, sem prefixo de token e sem antes nem depois`, `o id vem do banco, em ordem crescente de inclusão`, `o app não escolhe o id do evento (GENERATED ALWAYS: 428C9)`, `ocorrido_em não tem padrão no banco: sem a data do Relogio, a inclusão é recusada (23502, G3.4)`, `%s é obrigatório (23502)` (5 casos), `ator_tipo fora de pessoa, agente e sistema (%j) é recusado (23514)` (4 casos), `o histórico de uma demanda sai pelo índice (demanda_id, ocorrido_em), nessa ordem de colunas` e `a leitura do histórico de uma demanda traz só os eventos dela, em ordem de ocorrência` |
| 13 | Tabelas de acesso: `user.papel` em `cto` ou `administradora` e obrigatório; e-mail único; FKs com cascata; `bloqueio_verificacao` com `falhas >= 0`; `token_servico` com os quatro agentes, `hash` único e `criado_em` sem padrão; datas em `timestamptz`; índices nas FKs | `src/db/schema/acesso.test.ts` (novo) | **novos** `aceita os papéis cto e administradora`; `recusa papel fora da lista (%j): 23514` (4 casos); `recusa conta sem papel: 23502`; `e-mail é único: 23505`; `sessão: token único (23505) e usuário existente (23503)`; `apagar a conta apaga em cascata sessão, conta de login, two_factor e bloqueio`; `bloqueio_verificacao: falhas começa em 0, sem janela nem bloqueio, e não aceita negativo (23514)`; `bloqueio_verificacao: um por conta (23505) e só de conta existente (23503)`; `aceita o agente %s, com id uuid gerado pelo banco` (4 casos); `recusa agente fora da lista (%j): 23514` (4 casos); `hash é único: 23505`; `criado_em não tem padrão no banco: sem a data do Relogio, a inclusão é recusada (23502, G3.4)`; `o app revoga de fato (...)`; `toda coluna de data do esquema public é timestamptz`; `as colunas de FK do Better Auth e o identifier da verificação têm índice`; e, em `privilegios.test.ts`, `o app faz o CRUD das tabelas do Better Auth e do bloqueio (privilégio dado de fato, não só listado)` |
| 14 | Ajudante `novoBanco`: banco novo por arquivo, copiado do modelo migrado, sob trava; `poolApp` e `db` com o papel do app (RNF-15, G5) | `test/banco.test.ts` (novo) | **novos** `três bancos pedidos ao mesmo tempo saem todos (a trava serializa a cópia do modelo), cada um com nome próprio`; `os bancos são isolados: o que um grava, o outro não vê`; `o banco novo já vem migrado, e poolApp e db entram com o papel do app, poolMigrator com o dono`; `fechar encerra os dois pools` |

As colunas do Better Auth contra a biblioteca ficam com a T08 (login real), como dizem a entrega do engenheiro e a
revisão. A guarda do esquema `pgboss` fica com a T07.

### Testes acrescentados (80)

- `src/db/privilegios.test.ts`, 15 casos num `describe` novo, `guarda de privilégios: DDL, esquemas, sequências e
  registro de migrations (C-34, ADR-03, ADR-12)`.
- `src/db/transacao.test.ts`, 5 casos no fim do arquivo.
- `src/db/schema/acesso.test.ts` (novo), 24 casos em quatro `describe`: `user`, sessão e bloqueio, `token_servico` e
  modelo físico.
- `src/db/schema/historico.test.ts` (novo), 18 casos.
- `scripts/migrate.test.ts`, 14 casos em dois `describe` novos: 10 de `ehExecucaoDireta` e 4 de `migrar`.
- `test/banco.test.ts` (novo), 4 casos.

### Resultado

- `pnpm test`: 19 arquivos, 252 testes, 252 passaram e 0 falharam. Eram 172 em 16 arquivos antes, mais os 80 novos
  em 3 arquivos novos. Rodou duas vezes na suíte inteira com o mesmo resultado. Os seis arquivos da tarefa, rodados
  sozinhos, deram 98 de 98, e `src/db/transacao.test.ts` em ordem embaralhada deu 10 de 10.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.

### Conferência com `git diff`

- `src/db/privilegios.test.ts`: só linhas acrescentadas no fim (`@@ -110,0`).
- `src/db/transacao.test.ts`: o import passou de `count` para `count, sql`, e o resto são linhas acrescentadas no fim
  (`@@ -82,0`).
- `scripts/migrate.test.ts`: os imports ganharam `readFileSync`, `describe`, `beforeAll`, `afterAll`, `novoBanco` e
  `migrar`, e o resto são linhas acrescentadas no fim (`@@ -15,0`). Os dois testes antigos ficaram iguais, linha por
  linha.
- Nenhum teste apagado, nenhuma asserção mudada e nenhum `.skip`, `.only` ou `.todo`.

## Decisões tomadas

- Os testes novos de privilégio rodam o comando com o papel do app e esperam `42501`. A guarda antiga compara a lista
  com o catálogo; estes provam a recusa no banco, que é a barreira que a ADR-03 escolheu.
- Para sequência, o teste percorre o catálogo, não a lista `SEQUENCIAS`. Hoje a lista está vazia e o teste antigo não
  conferia nada; agora um `GRANT` esquecido em `evento_id_seq`, ou a `demanda_seq` da T05 com `USAGE` e fora da lista,
  quebra o teste. Isso cobre o parecer 1 do tech-lead.
- O teste de 10 transações com erro ao mesmo tempo é o que prova o `rollback`. As 10 chamadas pedem conexão no mesmo
  instante e pegam as 10 conexões do pool. Sem `rollback`, a conexão voltaria em transação abortada e a gravação
  seguinte nela daria `25P02`. O teste antigo de 12 transações em série espera erro em todas, então passaria mesmo
  assim.
- `migrar` com o papel do app falha no `CREATE SCHEMA IF NOT EXISTS drizzle`: no Postgres 16, a permissão de `CREATE`
  no banco é conferida antes de ver se o esquema existe. O teste fixa esse comportamento como prova de que o app não
  migra.
- O parecer 2 do tech-lead (`rollback` que falha devolve conexão quebrada ao pool) não ganhou teste aqui: está com a T05
  e é mudança de código. Matar a conexão por fora com `pg_terminate_backend` enquanto ela está emprestada dispara um
  evento `error` sem ouvinte no cliente do `pg`, e isso pode derrubar o processo do Vitest. Por isso o teste da T05 deve
  matar a própria conexão com uma consulta da própria transação (`select pg_terminate_backend(pg_backend_pid())` pelo
  executor), para o erro chegar na consulta ativa.
- As datas dos testes novos são ISO fixas e as esperas não dependem de tempo. Cada arquivo usa um banco só seu
  (`novoBanco`), os ids de cada teste são únicos e os arquivos que contam `evento` limpam a tabela em `beforeEach` pelo
  migrator. Nenhum teste depende da ordem nem do relógio real.
- Os dados são todos fictícios: `Pessoa Ficticia`, e-mails `@exemplo.test`, hashes, tokens e segredos com o texto
  `ficticio`, e a senha errada `senha_errada_ficticia`, que só existe para provar o `28P01`. Não há segredo, valor de
  `.env` nem dado pessoal real.

## Pendências

- Nenhuma que segure a passagem.
- T05 (`engenheiro-dados-bd`): ao criar a `demanda_seq` com `USAGE`, ela entra em `SEQUENCIAS`. Fora da lista, o teste
  novo de sequências quebra, como deve. Toda tabela nova também passa pelo teste de `TRUNCATE` recusado.
- T05 (`engenheiro-dados-bd`): continua valendo o parecer 2 da `06-T04-tech-lead.md`, com a forma de teste descrita em
  Decisões tomadas.
- Continuam valendo os pareceres 3 e 4 da `06-T04-tech-lead.md` (T33 e `09-entrega`) e as pendências T07 e T08 do
  engenheiro.
- Para o `conferir`: rodei `pnpm test` uma vez com uma pasta como argumento (`src/db`) e uma vez com
  `--sequence.shuffle`. As duas foram leituras de teste, e estão listadas abaixo do jeito que rodaram.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat b156a37a147526e77e57e0f4610b88283bf21a3a` — 20 arquivos: os da T04, a entrega do engenheiro e o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -20 --stat` — último commit `4f27ab6` (06-T04-revisao), que só traz a revisão
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show b156a37a147526e77e57e0f4610b88283bf21a3a -- drizzle.config.ts drizzle/0000_amusing_living_lightning.sql drizzle/0001_rls_privilegios_acesso.sql scripts src test` — diff do código testado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:docs/construcao/DEC-DEM-20261022-0001-v1/04-seguranca-aplicacao.md --stat` — leitura da entrega 04 (C-34)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`, antes de começar
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 16 arquivos, 172 de 172, antes dos testes novos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/db scripts/migrate.test.ts test/banco.test.ts` — 6 arquivos, 98 de 98
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 19 arquivos, 252 de 252
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 19 arquivos, 252 de 252, segunda rodada
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/db/transacao.test.ts --sequence.shuffle` — 10 de 10 em ordem embaralhada
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — 3 arquivos de teste alterados e 3 novos, todos de teste
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -U0` — só acréscimos, além das linhas de import de `transacao.test.ts` e `migrate.test.ts`

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
