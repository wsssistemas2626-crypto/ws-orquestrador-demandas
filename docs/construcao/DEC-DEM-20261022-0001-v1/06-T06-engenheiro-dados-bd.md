---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T06-construcao
agente: engenheiro-dados-bd
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T04 a T07 e T21 a T31), 06-T05-engenheiro-dados-bd.md, 06-T05-tech-lead.md, 06-T05-qa-automacao.md, src/db/index.ts, src/db/transacao.ts, src/db/transacao.test.ts, src/db/privilegios.ts, src/db/privilegios.test.ts, src/db/imutabilidade.test.ts, src/db/schema/index.ts, src/db/schema/acesso.ts, src/db/schema/historico.ts, src/db/schema/demandas.ts, src/db/schema/versoes.ts, src/db/schema/decisao.ts, src/db/schema/dominio.test.ts, src/lib/log.ts, src/lib/reduzir-erro.ts, test/banco.ts, drizzle.config.ts, drizzle/0002_brown_jackal.sql, drizzle/0003_rls_privilegios_dominio.sql, drizzle/meta/_journal.json]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T06 do plano: tabelas de agentes, uso de IA, avisos e operação, com sementes e privilégios. Cobre RF-17 (CA-17.3),
RF-18 (teto inicial 0), RF-19 (CA-19.1, os quatro desligados), C-26 e C-34. A tarefa também fecha os pareceres 1, 2 e
3 da `06-T05-tech-lead.md`, que a revisão da T05 mandou para cá.

### Arquivos

Criados:
- `src/db/schema/agentes.ts`: `configuracaoAgente`, `configuracaoIa`, `precoModelo`, `execucaoAgente` e `usoIa`. Também
  as listas `AGENTES`, `MOEDAS`, `STATUS_EXECUCAO`, `RESULTADOS_USO` e os tipos que saem delas.
- `src/db/schema/operacao.ts`: `avisoEmail`, `workerBatimento`, `rotinaExecucao`, `STATUS_AVISO_EMAIL`, `ROTINAS`.
- `src/db/schema/comum.ts`: `momento` (parecer 3). Não tem tabela e fica fora de `schema/index.ts`.
- `drizzle/0004_busy_jigsaw.sql`: saída do `pnpm db:generate`, sem edição. Cria 8 tabelas, 4 FKs e 4 índices. A troca do
  `momento` não gerou nenhuma diferença nas tabelas antigas.
- `drizzle/0005_rls_privilegios_agentes.sql`: custom, criada vazia pelo drizzle-kit e escrita à mão. Tem os `GRANT`, o
  `REVOKE` do parecer 1 e as sementes.
- `drizzle/meta/0004_snapshot.json`, `drizzle/meta/0005_snapshot.json`: gerados.
- Testes: `src/db/sementes.test.ts` (o do plano, com casos a mais), `src/db/schema/agentes.test.ts`,
  `src/db/schema/operacao.test.ts` e `src/db/index.test.ts`.

Modificados:
- `src/db/schema/index.ts`: exporta `agentes` e `operacao`.
- `src/db/privilegios.ts`: regras das 8 tabelas; `rascunho_agente` sai de `colunasUpdate` da `demanda`.
- `src/db/index.ts`: ouvinte de `error` em `criarPool` (parecer 2).
- `src/db/schema/acesso.ts`, `demandas.ts`, `versoes.ts`, `decisao.ts`, `historico.ts`: usam `momento` de `comum.ts`
  (parecer 3). `acesso.ts` também tipa `token_servico.agente` com `Agente`.
- `src/db/imutabilidade.test.ts`: parecer 1 (abaixo).
- `drizzle/meta/_journal.json`: gerado.

### Modelo físico (migration 0004)

| Tabela | Chave e restrições | Índices além da PK e dos únicos |
|---|---|---|
| `configuracao_agente` | `agente` PK com `CHECK` dos quatro; `ligado` padrão false; `modelo`, `atualizado_em` e `atualizado_por` nulos; `CHECK not ligado or modelo is not null` | — |
| `configuracao_ia` | `id` smallint PK com `CHECK id = 1`; `teto_mensal` numeric(12,2) padrão 0 com `CHECK >= 0`; `moeda` padrão `USD` com `CHECK in ('USD')` | — |
| `preco_modelo` | `id` uuid; `modelo` NOT NULL; preços de entrada e saída numeric(12,6) NOT NULL com `CHECK >= 0`; `moeda` padrão `USD` com `CHECK`; `vigente_desde` NOT NULL; único `(modelo, vigente_desde)` | — (o único serve ao preço vigente) |
| `execucao_agente` | `id` uuid; único `(agente, chave_entrada)`; `CHECK` de `agente` (4), de `status` (5, padrão `pendente`) e de `tentativas >= 0` (padrão 0); a chave de entrada confere com o agente e só tem id (`entrada:<uuid>`, `demanda:DEM-…`, `esp:ESP-…`, `rsk:RSK-…`); `concluida` exige `artefato_id`; `em_andamento` exige `bloqueada_ate`; FK `demanda_id` nula para `demanda`; `artefato_id` sem FK | `(status, proxima_tentativa_em)`, `(demanda_id, status)` |
| `uso_ia` | `id` uuid; FK `execucao_agente_id` NOT NULL; FK `demanda_id` nula; `CHECK` de `agente` (4) e de `resultado` (3); tokens int e `custo` numeric(12,6), todos NOT NULL com `CHECK >= 0`; **sem** coluna de prompt, resposta ou texto | `(ocorrido_em)` |
| `aviso_email` | `pacote_decisao_id` PK e FK; `status` (4, padrão `pendente`); `tentativas >= 0` (padrão 0); `enviado` exige `enviado_em`; `atualizado_em` NOT NULL | — |
| `worker_batimento` | `instancia` PK; `visto_em` NOT NULL | `(visto_em)` |
| `rotina_execucao` | `rotina` PK com `CHECK in ('retencao.expurgo')`; `ultima_execucao_em` NOT NULL; `quantidade >= 0` | — |

### Privilégios do `orquestrador_app` (migration 0005, espelho de `PRIVILEGIOS`)

| Tabela | Privilégio |
|---|---|
| `configuracao_agente` | `SELECT` + `UPDATE (ligado, modelo, atualizado_em, atualizado_por)` |
| `configuracao_ia` | `SELECT` + `UPDATE (teto_mensal, atualizado_em, atualizado_por)` |
| `preco_modelo`, `uso_ia` | `SELECT, INSERT` |
| `execucao_agente` | `SELECT, INSERT` + `UPDATE (status, tentativas, proxima_tentativa_em, bloqueada_ate, artefato_id, atualizada_em)` |
| `aviso_email` | `SELECT, INSERT` + `UPDATE (status, tentativas, id_provedor, enviado_em, atualizado_em)` |
| `worker_batimento` | `SELECT, INSERT, UPDATE, DELETE` |
| `rotina_execucao` | `SELECT, INSERT` + `UPDATE (ultima_execucao_em, quantidade)` |
| `demanda` | perde `UPDATE (rascunho_agente)` (parecer 1) |

Sementes: quatro linhas de `configuracao_agente` com `ligado = false` e sem modelo, e a linha `id = 1` de
`configuracao_ia` com `teto_mensal = 0` e `moeda = 'USD'`. Com o teto zero, todo agente fica suspenso até alguém
definir o teto (CA-18.3).

### Pareceres da `06-T05-tech-lead.md`

1. `REVOKE UPDATE ("rascunho_agente") ON "demanda"` está na 0005, e a coluna saiu de `colunasUpdate`. Em
   `src/db/imutabilidade.test.ts`, o caso `o app altera título, status, listas e atualizada_em` não põe mais
   `rascunho_agente = false` no `UPDATE`. O `it.each` `mudar %s é recusado com o papel do app (42501)` ganhou o caso
   `rascunho_agente`. É a troca que o tech-lead indicou e que a `06-T05-testes` previu. Nenhuma asserção foi afrouxada.
2. `criarPool` agora tem `pool.on('error', (erro) => log.warn({ evento: 'conexao_perdida', erro }))`. O teste derruba,
   pelo `poolMigrator`, a conexão ociosa do `poolApp`, e confere quatro coisas: o processo segue, o pool descarta a
   conexão, a próxima consulta abre outra (pid diferente), e a linha do log só tem `level`, `time`, `evento` e `erro`
   (`code: 57P01`), sem a mensagem do Postgres.
3. `momento` está em `src/db/schema/comum.ts`, usado pelos cinco esquemas antigos (com a cópia que estava dentro de
   `historico.ts`) e pelos dois novos. O `pnpm db:generate` confirmou que não houve diferença nas tabelas antigas.

### Testes criados (99 novos)

- `src/db/sementes.test.ts` (7): os 4 do plano, mais 3. Os agentes nascem sem modelo e sem autor; `configuracao_ia` tem
  só a linha 1; as tabelas de operação nascem vazias.
- `src/db/schema/agentes.test.ts` (72):
  - `configuracao_agente` (7): o app liga e desliga; ligado sem modelo dá 23514; incluir, apagar, renomear ou truncar
    dá 42501; nem o migrator inclui agente fora dos quatro.
  - `configuracao_ia` (8): o app troca o teto; teto negativo dá 23514; moeda, id, inclusão e exclusão dão 42501; nem o
    migrator grava segunda linha nem moeda fora de USD.
  - `preco_modelo` (7): duas vigências e a consulta do preço vigente; vigência repetida dá 23505; preços negativos e
    moeda dão 23514 (3 casos); alterar e apagar dão 42501.
  - `execucao_agente` (21): padrões; unicidade e o `on conflict do nothing` de `criarExecucao`; as quatro chaves do
    plano entram; 6 chaves recusadas (de outro agente, texto livre, id ou uuid fora do formato, sufixo); 5 restrições;
    FK; a reivindicação condicional da ADR-07 (a primeira leva, a segunda não acha nada); mudar agente, chave, demanda
    ou criação dá 42501 (4 casos); apagar dá 42501.
  - `uso_ia` (11): registro com custo em 6 casas; `fora_do_schema` e `erro` registrados; 5 restrições; FK; alterar,
    apagar e truncar dão 42501.
  - Enumerações (10): cada `CHECK` de lista bate com a lista exportada, inclusive o `token_servico_agente_check` da T04
    contra `AGENTES`.
  - Planos de execução (8), abaixo.
- `src/db/schema/operacao.test.ts` (17):
  - `aviso_email` (10): agendar com `on conflict do nothing` não duplica (CA-25.2); tentativa e envio; 3 restrições;
    `sem_provedor` e `falhou` sem data; FK; trocar o DEC, apagar e truncar dão 42501.
  - `worker_batimento` (2): upsert e exclusão pelo app; sem data dá 23502.
  - `rotina_execucao` (5): upsert pelo app; rotina fora da lista e quantidade negativa dão 23514; renomear e apagar dão
    42501.
- `src/db/index.test.ts` (2): parecer 2.
- `src/db/imutabilidade.test.ts` (+1): parecer 1.

A guarda de privilégios da T04 (`privilegios.test.ts`) percorre `PRIVILEGIOS` e por isso já cobre as 8 tabelas novas
sem caso a mais: privilégio exato de tabela e de coluna, `TRUNCATE` recusado e nenhuma tabela sem regra.

### Plano de execução (EXPLAIN, em `agentes.test.ts`)

Mesmo molde da T05: `set local enable_seqscan = off` e `explain (format json)`. O teste confere que o plano tem
`"Index Name":"<índice>"` e não tem `"Node Type":"Seq Scan"`. Consultas conferidas:

- gasto do mês (`uso_ia where ocorrido_em >= $1 and ocorrido_em < $2`): `uso_ia_ocorrido_idx`;
- preço vigente (`modelo = $1 and vigente_desde <= $2 order by vigente_desde desc limit 1`):
  `preco_modelo_modelo_vigencia_unique`;
- execução por agente e entrada: `execucao_agente_agente_chave_unique`;
- varredura do batimento: pendente vencida e trava vencida, `execucao_agente_status_proxima_idx`;
- agentes em andamento da demanda (T-03): `execucao_agente_demanda_status_idx`;
- batimentos recentes e último batimento: `worker_batimento_visto_idx`.

Resultado: 8 de 8. O plano com volume é da T35.

### TDD: falha vista antes do código

`pnpm test` com os testes escritos, antes do esquema, das migrations e do ouvinte do pool. Trecho da rodada com os
dois arquivos sem tabela de outro teste:

```
 ❯ src/db/sementes.test.ts (7 tests | 7 failed) 280ms
   × os quatro agentes nascem desligados (CA-19.1) 37ms
 FAIL  src/db/sementes.test.ts > os quatro agentes nascem desligados (CA-19.1)
error: relation "configuracao_agente" does not exist
 ❯ src/db/index.test.ts (2 tests | 2 failed) 10270ms
   × conexão ociosa derrubada pelo banco: o processo segue, o log registra conexao_perdida e a próxima consulta responde 5061ms
Serialized Error: { length: 116, severity: 'FATAL', code: '57P01', ... routine: 'ProcessInterrupts', ... }
This error originated in "src/db/index.test.ts" test file.
 Test Files  2 failed (2)
      Tests  9 failed (9)
     Errors  2 errors
```

O `57P01` sem ouvinte é o erro que derrubaria o processo. Na suíte inteira, antes do código, também falharam
`agentes.test.ts` (61 falhas e 11 pulados, `relation "configuracao_ia" does not exist`), `operacao.test.ts` (17 de 17)
e `imutabilidade.test.ts` (1: `mudar rascunho_agente é recusado com o papel do app (42501)`).

Depois do código: 26 arquivos, 522 de 522 (423 anteriores + 99 novos), 0 falhas, na primeira rodada e na final. Os
cinco arquivos da tarefa rodaram também em ordem embaralhada: 137 de 137. O `typecheck` acusou um erro de tipo num
teste novo (lista de campos com propriedade opcional), corrigido.

### Desvios do plano

- `UPDATE` por coluna, e não na tabela inteira, em `configuracao_agente`, `configuracao_ia`, `execucao_agente`,
  `aviso_email` e `rotina_execucao`. Chave, agente, entrada, demanda, criação e moeda ficam imutáveis também para o
  app (C-11, C-34, P1-f). As colunas liberadas são as que as T23, T27, T29, T30 e T31 mudam, conferidas nas interfaces
  e nos passos do plano.
- Restrições que o plano não listava, todas para a integridade morar no banco:
  - ligado exige modelo;
  - teto, preços, tokens, custo, tentativas e quantidade não negativos;
  - moeda só USD;
  - `configuracao_ia` com a linha 1 só;
  - chave de entrada coerente com o agente e só com id (C-22);
  - `concluida` com artefato e `em_andamento` com trava;
  - `enviado` com data;
  - rotina na lista.
  Nenhuma recusa o que o plano manda gravar.
- FKs a mais: `execucao_agente.demanda_id` e `uso_ia.demanda_id` para `demanda`, nulas e sem cascata, como as da T05.
- Índice `worker_batimento_visto_idx`, para a situação do worker (T29) e a tela T12, que o plano não listava.
- Listas de enumeração e tipos exportados pelo esquema (`AGENTES` e as outras), com o teste que as compara ao `CHECK`.
  É a decisão de fonte única da `06-T05-tech-lead.md`.
- Arquivos fora da lista da T06: `src/db/index.ts`, `src/db/imutabilidade.test.ts`, `src/db/schema/comum.ts`,
  `acesso.ts`, `demandas.ts`, `versoes.ts`, `decisao.ts` e `historico.ts`. São os pareceres 1, 2 e 3 que a revisão da T05
  mandou para esta tarefa. Também há arquivos de teste a mais: `agentes.test.ts`, `operacao.test.ts` e
  `index.test.ts`.

## Decisões tomadas

- Volta da `0004_busy_jigsaw` (migration nova, custom):
  `DROP TABLE "uso_ia", "execucao_agente", "aviso_email", "worker_batimento", "rotina_execucao", "preco_modelo", "configuracao_ia", "configuracao_agente";`.
  - A ida só cria objetos e não toca dado existente: no ensaio de rollback, `alteram_dado` fica falso, e a versão
    anterior roda sobre o banco migrado porque não usa as tabelas novas.
  - A volta apaga o que estiver nelas (uso e custo de IA, execuções, avisos, configuração): com dado, só com o backup.
  - O `DROP` leva junto os privilégios e as sementes da 0005.
- Volta da `0005_rls_privilegios_agentes` (migration nova, custom):
  `REVOKE ALL ON "configuracao_agente", "configuracao_ia", "preco_modelo", "uso_ia", "execucao_agente", "aviso_email", "worker_batimento", "rotina_execucao" FROM orquestrador_app;`
  `GRANT UPDATE ("rascunho_agente") ON "demanda" TO orquestrador_app;`
  `DELETE FROM "configuracao_agente"; DELETE FROM "configuracao_ia";`.
  - As sementes entram em tabelas que a 0004 acabou de criar, e o `REVOKE` da demanda só mexe em privilégio. Por isso a
    ida não altera dado existente.
  - A volta dos privilégios não precisa de backup.
  - O `DELETE` das sementes perde o teto e os interruptores que alguém tenha mudado. Esses valores são anotados antes
    de voltar.
- Enumerações como `text` + `CHECK` com o nome `<tabela>_<coluna>_check`, como na T05: valor novo é migration de troca
  de `CHECK`.
- `numeric` para teto, preço e custo, sem ponto flutuante: soma do gasto exata. O driver devolve texto (`'0.00'`), como o
  teste do plano espera.
- `atualizado_por` e o autor das linhas de configuração ficam sem FK para `user`, como `evento.ator_id` e
  `decisao.decidida_por`. Uma conta removida não leva a configuração junto.
- `artefato_id` sem FK: aponta para ESP, RSK, DEC ou demanda, conforme o agente.
- `uso_ia.execucao_agente_id` NOT NULL com FK: todo uso tem execução (`registrarUso` da T23 sempre recebe
  `execucaoId`).
- `CHECK` de `tentativas` só `>= 0`, sem teto em 3. A varredura da T29 reivindica a execução presa em `em_andamento` e
  soma uma tentativa. Um teto no banco faria essa reivindicação falhar com 23514 dentro do worker, em vez de cair na
  regra de falha da T27.
- Não subi o banco de desenvolvimento: o `db:migrate` de dev para na 0001 sem o papel do app (registrado na T04; a
  criação desse papel é da T33). O ensaio das migrations foi no Testcontainers: `postgres:16-alpine`, com o migrator
  aplicando 0000 a 0005 a cada `pnpm test`. Não ficou banco de dev para derrubar.

## Pendências

- T10 (`engenheiro-backend`): `AGENTES` e `Agente` já existem em `src/db/schema/agentes.ts`. O `ator.ts` reexporta
  (`export { AGENTES, type Agente } from '../../db/schema'`), sem redeclarar (decisão de fonte única da
  `06-T05-tech-lead.md`).
- T23 (`engenheiro-backend`):
  - `alterarAgente` ligado sem modelo é recusado pelo banco com 23514. O serviço devolve o 409 do plano antes de
    gravar.
  - O app não muda `moeda` nem `id` de `configuracao_ia`.
  - Teto com mais de duas casas o `numeric(12,2)` arredonda; o schema do plano já limita a duas.
- T27 (`engenheiro-backend`):
  - `criarExecucao` grava a chave no formato da T28. Fora dele, o banco devolve 23514.
  - Marcar `concluida` exige `artefato_id`, e `em_andamento` exige `bloqueada_ate`. A reivindicação do plano já põe
    os dois.
  - O app só muda as seis colunas de estado.
- T27 e T29 (`engenheiro-backend`), Minor, para o tech-lead decidir: a varredura da T29 procura `pendente` com
  `proxima_tentativa_em` vencida. Se `criarExecucao` deixar essa coluna nula na primeira tentativa, um primeiro job
  perdido nunca é reenfileirado. Proposta: `criarExecucao` grava `proxima_tentativa_em = criada_em`. O índice
  `(status, proxima_tentativa_em)` já serve à consulta.
- T28 (`engenheiro-backend`): `execucao_agente.demanda_id` não muda depois de criada. A execução do orquestrador fica
  com `demanda_id` nulo e o id da demanda criada vai em `artefato_id`.
- T30 (`engenheiro-backend`): `enviado` exige `enviado_em`. `agendarAviso` usa `insert ... on conflict
  (pacote_decisao_id) do nothing`, com o padrão `pendente`.
- T31 (`engenheiro-backend`): `rotina_execucao` aceita o upsert por `on conflict (rotina) do update` só em
  `ultima_execucao_em` e `quantidade`. Rotina nova pede migration de `CHECK`.
- T35 (`engenheiro-dados-bd`): repetir com volume os planos de `uso_ia_ocorrido_idx` (gasto do mês) e
  `execucao_agente_demanda_status_idx` (detalhe da demanda).
- Seguem valendo da T04 e da T05:
  - papel do app no banco de dev e migrator dono do banco (T33);
  - `realpath` no `ehExecucaoDireta` (`09-entrega`);
  - colunas do Better Auth (T08);
  - guarda do esquema `pgboss` (T07);
  - listas importadas de `src/db/schema` (T15, T19, T20, T21);
  - documento da administradora com 23514 (T21).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h%x20%s -n 12` — último commit `518ac2d` (06-T05-testes) e os arquivos das T04 e T05
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — antes do código: `agentes.test.ts` 61 falhas e 11 pulados, `operacao.test.ts` 17 falhas, `sementes.test.ts` 7 falhas, `index.test.ts` 2 falhas e 2 erros não tratados (57P01), `imutabilidade.test.ts` 1 falha (`relation ... does not exist` e o caso `rascunho_agente`)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/db/index.test.ts src/db/sementes.test.ts` — antes do código: 9 de 9 falharam e 2 erros não tratados (57P01), trecho na Entrega
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas db:generate` — gerou `drizzle/0004_busy_jigsaw.sql` (8 tabelas, 4 FKs, 4 índices; nada nas tabelas antigas)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas drizzle-kit generate --custom --name rls_privilegios_agentes` — criou `drizzle/0005_rls_privilegios_agentes.sql` vazia
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 26 arquivos, 522 de 522, 0 falhas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — 1 erro de tipo em `agentes.test.ts` (lista de campos com propriedade opcional), corrigido
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/db/sementes.test.ts src/db/index.test.ts src/db/schema/agentes.test.ts src/db/schema/operacao.test.ts src/db/imutabilidade.test.ts --sequence.shuffle` — 137 de 137 em ordem embaralhada
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 26 arquivos, 522 de 522, 0 falhas (rodada final)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo (rodada final)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — só arquivos de `src/db/` e `drizzle/` (11 novos, 10 modificados)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 10 arquivos, 59 inserções e 20 remoções

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] a migration roda com o papel migrator e tem RLS e guarda quando a tabela tem `tenant_id`
- [x] cada migration nova tem, em `## Decisões tomadas`, como desfazê-la (o SQL de volta ou a razão de ser irreversível)
- [x] a migration de esquema fica como saiu do `pnpm db:generate`; o SQL que o Drizzle não gera (RLS forçada, política, função de guarda) fica numa migration criada vazia por `pnpm drizzle-kit generate --custom --name rls_<tabela>` e escrita por você; nenhuma migration já commitada foi editada
