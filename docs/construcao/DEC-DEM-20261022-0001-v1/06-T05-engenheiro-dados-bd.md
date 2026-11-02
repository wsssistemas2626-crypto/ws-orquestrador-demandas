---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T05-construcao
agente: engenheiro-dados-bd
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T01 a T22), 01-analista-requisitos.md (RF-01 a RF-12), 02-arquiteto-solucoes.md (seções 1 a 6), 2026-10-15_orquestrador-demandas_spec-original.md (seção 3), 06-T04-engenheiro-dados-bd.md, 06-T04-tech-lead.md, 06-T04-qa-automacao.md, src/db/schema/acesso.ts, src/db/schema/historico.ts, src/db/schema/index.ts, src/db/privilegios.ts, src/db/privilegios.test.ts, src/db/transacao.ts, src/db/transacao.test.ts, src/db/schema/acesso.test.ts, test/banco.ts, drizzle/0000_amusing_living_lightning.sql, drizzle/0001_rls_privilegios_acesso.sql, drizzle/meta/_journal.json]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T05 do plano: tabelas de demanda, versões e decisão, com privilégios e índices. Cobre RF-11 e CA-11.2 no banco,
C-34, RNF-09 (sequência), RNF-03 (índices) e T-01 (`entrada_pendente`). Também fecha o parecer 2 da
`06-T04-tech-lead.md`, que a revisão mandou para esta tarefa. O parecer 1 já tinha sido coberto pelo teste de
sequências da `06-T04-testes`, e a `demanda_seq` entrou em `SEQUENCIAS`.

### Arquivos

Criados:
- `src/db/schema/demandas.ts`: `demandaSeq`, `demanda`, `entradaBruta`, `entradaPendente`, mais as listas
  `TIPOS_DEMANDA`, `STATUS_DEMANDA`, `PAPEIS_SOLICITANTE`, `LINHAS_SERVICO`, `URGENCIAS`, `AUTORES_ARTEFATO` e
  `STATUS_ENTRADA_PENDENTE`, os tipos que saem delas e os tipos `Anexo` e `Origem`.
- `src/db/schema/versoes.ts`: `especificacaoTecnica`, `parecerRisco`, `NIVEIS_RISCO`.
- `src/db/schema/decisao.ts`: `pacoteDecisao`, `aprovacao`, `decisao`, `NIVEIS_APROVACAO`, `PAPEIS_APROVACAO`,
  `OPCOES_DECISAO`, `STATUS_DECISAO` (só os gravados, sem `pendente`) e o tipo `Opcao`.
- `drizzle/0002_brown_jackal.sql`: saída do `pnpm db:generate`, sem edição. Cria 1 sequência, 8 tabelas, 8 FKs e
  7 índices.
- `drizzle/0003_rls_privilegios_dominio.sql`: custom, criada vazia pelo drizzle-kit e escrita à mão (os `GRANT`).
- `drizzle/meta/0002_snapshot.json` e `drizzle/meta/0003_snapshot.json`, gerados.
- Testes: `src/db/imutabilidade.test.ts` (o do plano, com casos a mais) e `src/db/schema/dominio.test.ts` (novo).

Modificados: `src/db/schema/index.ts` (exporta os três arquivos), `src/db/privilegios.ts` (regras das 8 tabelas e
`demanda_seq` em `SEQUENCIAS`), `src/db/transacao.ts` e `src/db/transacao.test.ts` (parecer 2),
`drizzle/meta/_journal.json` (gerado).

### Modelo físico (migration 0002)

| Tabela | Chave e restrições | Índices além da PK e dos únicos |
|---|---|---|
| `demanda_seq` | `START 1 MINVALUE 1 MAXVALUE 9999 NO CYCLE CACHE 1` | — |
| `demanda` | `id` com `CHECK ~ '^DEM-[0-9]{8}-[0-9]{4}$'`; `CHECK` de `tipo` (5), `status` (9, padrão `nova`), `solicitante_papel` (4 ou nulo), `linha_servico_provavel` (5 ou nulo), `urgencia` (3 ou nulo), `autor_tipo` (`pessoa` ou `agente`); `anexos` e `duvidas_entrada` jsonb `NOT NULL DEFAULT '[]'` com `CHECK jsonb_typeof = 'array'`; `rascunho_agente` padrão false; `criada_em` e `atualizada_em` NOT NULL sem padrão | `(criada_em)`, `(status, criada_em)`, `(tipo, criada_em)`, `(linha_servico_provavel, criada_em)`, `(autor_tipo, autor_id, criada_em)` |
| `entrada_bruta` | `demanda_id` PK e FK; `CHECK`: sem expurgo há texto, com expurgo nem texto nem origem; `origem` objeto jsonb | `(recebida_em) WHERE expurgada_em IS NULL` |
| `entrada_pendente` | `id` uuid `gen_random_uuid()`; `texto`, `solicitante_nome`, `registrada_por`, `recebida_em` NOT NULL; `status` (`aguardando` padrão, `falhou`); `solicitante_papel` (4 ou nulo); `origem` objeto | `(recebida_em)` |
| `especificacao_tecnica` | único `(demanda_id, versao)`; FK `demanda`; `CHECK id = 'ESP-' \|\| demanda_id \|\| '-v' \|\| versao`; `versao` de 1 a 9999; `rascunho_agente = (autor_tipo = 'agente')`, NOT NULL sem padrão; `descricao_objetiva` e `escopo_inclui` NOT NULL; as cinco listas com `CHECK` de lista; `escopo_exclui` e `duvidas_em_aberto` padrão `[]`; os quatro campos de construção nulos (tipo `estudo`); `execucao_agente_id` uuid sem FK | — (o único serve ao `max(versao)`) |
| `parecer_risco` | o mesmo molde com `RSK-`; três níveis NOT NULL com `CHECK` (`baixo`, `medio`, `alto`); `recomendacoes_mitigacao` e `pre_condicoes` listas padrão `[]` | — |
| `pacote_decisao` | o mesmo molde com `DEC-`; FKs para a ESP e o RSK citados; `CHECK especificacao_id = 'ESP-' \|\| demanda_id \|\| '-v' \|\| especificacao_versao` (e o mesmo para o RSK); `demanda_tipo` (5) e `nivel_aprovacao_requerido` (2) com `CHECK`; `opcao_a` e `opcao_b` objetos jsonb NOT NULL; `demanda_titulo`, `demanda_descricao` e `resumo_executivo` NOT NULL | — |
| `aprovacao` | `id` uuid; único `(pacote_decisao_id, papel_aprovacao)`; FK DEC; `papel_aprovacao` (2) e `opcao` (`A`, `B`) com `CHECK`; papel `administradora` exige `referencia_documento` e `data_documento` (`date`); `revisou_rascunhos` padrão false | — (o único serve à leitura por DEC) |
| `decisao` | `pacote_decisao_id` PK e FK (uma decisão por DEC, CA-11.3); `status_decisao` (`aprovada`, `devolvida`, `arquivada`); `opcao_escolhida` (`A`, `B`); aprovada tem opção, e só aprovada tem opção | — |

### Privilégios do `orquestrador_app` (migration 0003, espelho de `PRIVILEGIOS`)

| Objeto | Privilégio |
|---|---|
| `demanda` | `SELECT, INSERT` + `UPDATE` em 15 colunas: todas menos `id`, `autor_tipo`, `autor_id` e `criada_em` |
| `entrada_bruta` | `SELECT, INSERT` + `UPDATE (texto, origem, expurgada_em)` |
| `entrada_pendente` | `SELECT, INSERT, UPDATE, DELETE` |
| `especificacao_tecnica`, `parecer_risco`, `pacote_decisao`, `aprovacao`, `decisao` | `SELECT, INSERT` |
| `demanda_seq` | `USAGE` (dá `nextval`; `setval` e a leitura direta ficam com o migrator) |

### Correção do parecer 2 (`src/db/transacao.ts`)

`comTransacao` agora põe um ouvinte de `error` na conexão emprestada e o tira no `finally`. Quando o `rollback`
falha, ou o cliente emite `error`, a conexão volta com `release(erro)` e o pool a descarta. O defeito era maior do que
o parecer dizia. Sem o ouvinte, a conexão derrubada no meio da transação emite `error` sem ninguém para receber, e
**o processo cai**. O teste novo mostrou isso antes da correção (abaixo). O teste segue a forma que a `06-T04-testes`
indicou: a transação mata a própria conexão pelo executor.

### Testes criados (123 novos)

- `src/db/imutabilidade.test.ts` (17): os 11 do plano (9 comandos recusados com 42501, o expurgo limpa texto e
  origem e a sequência para em 9999 com 2200H), mais 6. São eles: o app altera os campos descritivos da demanda; mudar
  `id`, `autor_tipo`, `autor_id` ou `criada_em` dá 42501 (4 casos); o `select ... for update` da trava funciona com o
  `UPDATE` por coluna.
- `src/db/schema/dominio.test.ts` (105), em cinco grupos:
  - demanda: valores padrão; formato do id (5 casos); enumerações (6); listas jsonb (2); obrigatórios sem padrão (7);
    nulos aceitos.
  - entradas: FK e unicidade de `entrada_bruta`; os três estados recusados do expurgo; origem objeto; ciclo
    completo da `entrada_pendente` com o papel do app; enumerações dela (2).
  - ESP e RSK: id coerente com a demanda e a versão; versão de 1 a 9999; versão repetida (23505); FK; listas da ESP
    (5) e do RSK (2); padrões; `rascunho_agente` coerente com o autor (2) e obrigatório; níveis do RSK, fora da lista
    (3) e obrigatórios (3).
  - DEC, aprovação e decisão: o DEC só cita ESP e RSK da própria demanda, com a versão do id; FKs; restrições (5);
    obrigatórios (7); aprovação (opção, papel, documento da administradora, uma por papel); decisão (4 recusas e
    uma por DEC).
  - enumerações e índices: cada `CHECK` de enumeração bate com a lista exportada (20 casos); 11 consultas críticas
    saem por índice no `EXPLAIN`.
- `src/db/transacao.test.ts` (+1): conexão derrubada no meio da transação. O erro sai, o processo segue, o pid morto
  não volta e as 10 transações seguintes gravam.

### Plano de execução (EXPLAIN, em `dominio.test.ts`)

Com a tabela pequena, o planejador prefere varrer. Por isso o teste roda `set local enable_seqscan = off` e confere
que o plano tem `"Index Name":"<índice>"` e não tem `"Node Type":"Seq Scan"`. Consultas conferidas:

- fila sem filtro (`demanda_criada_idx`), por status, por tipo e por linha (`demanda_<x>_criada_idx`);
- limite por ator na hora (`demanda_autor_criada_idx`, C-36);
- maior versão de ESP, RSK e DEC (`<tabela>_demanda_versao_unique`);
- aprovações do DEC (`aprovacao_pacote_papel_unique`);
- texto vencido para o expurgo (`entrada_bruta_a_expurgar_idx`) e entrada pendente vencida
  (`entrada_pendente_recebida_idx`).

Resultado: 11 de 11. O plano com volume (5.000 demandas) é a T35.

### TDD: falha vista antes do código

`pnpm test` com os três arquivos de teste escritos, antes do esquema, da migration e da correção de `comTransacao`:

```
 FAIL  src/db/imutabilidade.test.ts [ src/db/imutabilidade.test.ts ]
error: relation "demanda" does not exist
 FAIL  src/db/schema/dominio.test.ts [ src/db/schema/dominio.test.ts ]
error: relation "demanda" does not exist
⎯⎯⎯⎯⎯ Uncaught Exception ⎯⎯⎯⎯⎯
Error: Connection terminated unexpectedly
 ❯ Connection.<anonymous> node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/client.js:204:73
This error originated in "src/db/transacao.test.ts" test file.
The last test to run before this error was "conexão derrubada no meio da transação: o erro sai, o processo segue, a conexão morta sai do pool e a próxima transação grava".
 Test Files  2 failed | 19 passed (21)
      Tests  253 passed | 122 skipped (375)
     Errors  1 error
```

Primeira rodada depois do código: 374 de 375. A falha era do próprio teste. Lido pelo `pg` cru, `data_documento`
volta como `Date`. O teste passou a ler pelo Drizzle (`mode: 'string'`), que é o caminho das tarefas seguintes e
devolve `'2026-10-21'`. Rodada final: 21 arquivos, 375 de 375 (252 anteriores + 123 novos), 0 falhas.

### Desvios do plano

- Restrições que o plano não listava, todas para a integridade morar no banco:
  - id da demanda pela regex de G3.10;
  - id de ESP, RSK e DEC derivado da demanda e da versão, com a versão de 1 a 9999;
  - DEC que só cita versão da própria demanda;
  - `rascunho_agente = (autor_tipo = 'agente')` nos artefatos (C-11);
  - listas e objetos jsonb conferidos pelo tipo;
  - estados do expurgo em `entrada_bruta`;
  - documento da administradora (CA-14.3);
  - opção só na decisão aprovada.
  Nenhuma impede o que as tarefas T14 a T22 do plano gravam.
- `demanda` com `UPDATE` por coluna, e não na tabela inteira: `id`, autoria e criação ficam imutáveis também para o
  app (C-11, C-34). As 15 colunas são as que o `alterarDemanda` e as transições mudam.
- Índice `(criada_em)` em `demanda`, para a fila sem filtro (tela T03), que o plano não listava.
- Datas sem padrão no banco (G3.4, como na T04). Nos artefatos, `rascunho_agente` também fica sem padrão: quem grava
  diz se é rascunho. Na `demanda` o padrão é false, porque o teste do plano a insere sem a coluna.
- FKs sem cascata (`ON DELETE no action`): o app não apaga demanda nem versão, e o migrator também não apaga em
  silêncio. `aprovacao.registrada_por` e `decisao.decidida_por` ficam sem FK para `user`, como `evento.ator_id`. O
  nome do aprovador é cópia, e uma conta removida não leva a decisão junto.
- Arquivo de teste a mais (`src/db/schema/dominio.test.ts`) e seis casos a mais em `imutabilidade.test.ts`.
- `src/db/transacao.ts` e o seu teste não estavam na lista da T05. A revisão da T04 mandou o parecer 2 para cá
  (Pendências da `06-T04-tech-lead.md`).
- Listas de enumeração exportadas pelo esquema (`TIPOS_DEMANDA` etc.), com teste que as compara ao `CHECK` do banco.
  Dão às T15, T19 a T21 uma fonte só para as listas.

## Decisões tomadas

- Volta da `0002_brown_jackal` (migration nova, custom):
  `DROP TABLE "decisao", "aprovacao", "pacote_decisao", "parecer_risco", "especificacao_tecnica", "entrada_pendente", "entrada_bruta", "demanda";`
  `DROP SEQUENCE "demanda_seq";`. A ida só cria objetos e não toca dado existente: no ensaio de rollback,
  `alteram_dado` fica falso, e a versão anterior roda sobre o banco migrado porque não usa as tabelas novas. A volta
  apaga o que estiver nelas (demandas, versões, decisões, texto bruto): com dado, só com o backup.
- Volta da `0003_rls_privilegios_dominio` (migration nova, custom):
  `REVOKE ALL ON "demanda", "entrada_bruta", "entrada_pendente", "especificacao_tecnica", "parecer_risco", "pacote_decisao", "aprovacao", "decisao" FROM orquestrador_app;`
  `REVOKE ALL ON SEQUENCE "demanda_seq" FROM orquestrador_app;`. O `REVOKE` de tabela leva junto os privilégios por
  coluna. Só mexe em privilégio, sem dado: volta sem backup.
- Enumerações como `text` + `CHECK` com o nome `<tabela>_<coluna>_check`: valor novo é migration de troca de
  `CHECK`, sem `ALTER TYPE`.
- O id de ESP, RSK e DEC é conferido pelo banco a partir da demanda e da versão. Assim, as duas restrições do DEC
  bastam para garantir que ele cita versões da própria demanda, sem índice nem FK composta a mais.
- `statusDecisao = pendente` não é gravado: é a ausência de linha em `decisao`, e o `CHECK` recusa `pendente`.
- `data_documento` é `date` (`mode: 'string'`): é a data civil do documento externo, sem fuso.
- `comTransacao` descarta a conexão pelo `release(erro)` do `pg`. Vale para o `rollback` que falha e para o `error`
  emitido com a conexão emprestada.
- O ensaio do `pnpm db:migrate` foi feito no Testcontainers, com `postgres:16-alpine` e o migrator aplicando 0000 a
  0003 em todo `pnpm test`. No banco de dev o `db:migrate` para na 0001 por falta do papel do app (42704, já
  registrado na T04); a criação desse papel ficou com a T33. Por isso não subi o banco de dev.

## Pendências

- T15, T19, T20, T21 (`engenheiro-backend`): importar as listas de `src/db/schema` (`TIPOS_DEMANDA`,
  `STATUS_DEMANDA`, `PAPEIS_SOLICITANTE`, `LINHAS_SERVICO`, `URGENCIAS`, `NIVEIS_RISCO`, `NIVEIS_APROVACAO`,
  `OPCOES_DECISAO`) em vez de redeclarar, ou reexportá-las com os nomes do plano (`TIPOS`, `STATUS`, `LINHAS`,
  `NIVEIS`). Se uma lista mudar, o teste das enumerações quebra até uma migration nova trocar o `CHECK`.
- T15 (`engenheiro-backend`): o `UPDATE` do app na `demanda` é por coluna. Se `alterarDemanda` precisar mudar coluna
  fora das 15, a tarefa volta ao `engenheiro-dados-bd` para uma migration nova de `GRANT`.
- T21 (`engenheiro-backend`): o banco recusa a aprovação de papel `administradora` sem referência e data do
  documento (23514). O serviço continua devolvendo 400 com os campos antes de gravar.
- Minor, para o tech-lead decidir a tarefa: `criarPool` (`src/db/index.ts`) não tem ouvinte de `error` no pool. Uma
  conexão **ociosa** que o banco derrube (reinício do Postgres) emite `error` no pool sem ouvinte e derruba o
  processo, o mesmo defeito que esta tarefa corrigiu para a conexão emprestada. Correção: `pool.on('error', ...)` com
  `log.warn({ evento: 'conexao_perdida', erro })`. Cabe na T11 (`obterDeps`) ou numa volta do `engenheiro-dados-bd`.
- Seguem valendo da T04: papel do app no banco de dev e migrator dono do banco (T33), `realpath` no
  `ehExecucaoDireta` (`09-entrega`), colunas do Better Auth (T08) e guarda do esquema `pgboss` (T07).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -15` — último commit `6e06587` (06-T04-testes)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — antes do código: 2 arquivos falharam (`relation "demanda" does not exist`) e 1 erro não tratado (`Connection terminated unexpectedly`, de `transacao.test.ts`); 253 passaram e 122 pularam
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas db:generate` — gerou `drizzle/0002_brown_jackal.sql` (1 sequência, 8 tabelas)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas drizzle-kit generate --custom --name rls_privilegios_dominio` — criou `drizzle/0003_rls_privilegios_dominio.sql` vazia
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 374 de 375; 1 falha do próprio teste (`date` lido pelo `pg` cru)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 21 arquivos, 375 de 375, 0 falhas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — só os arquivos da tarefa (9 novos, 5 modificados)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 5 arquivos, 95 inserções e 3 remoções (em `transacao.ts` e na linha antiga de `SEQUENCIAS` em `privilegios.ts`); `transacao.test.ts` só com acréscimos

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] a migration roda com o papel migrator e tem RLS e guarda quando a tabela tem `tenant_id`
- [x] cada migration nova tem, em `## Decisões tomadas`, como desfazê-la (o SQL de volta ou a razão de ser irreversível)
- [x] a migration de esquema fica como saiu do `pnpm db:generate`; o SQL que o Drizzle não gera (RLS forçada, política, função de guarda) fica numa migration criada vazia por `pnpm drizzle-kit generate --custom --name rls_<tabela>` e escrita por você; nenhuma migration já commitada foi editada
