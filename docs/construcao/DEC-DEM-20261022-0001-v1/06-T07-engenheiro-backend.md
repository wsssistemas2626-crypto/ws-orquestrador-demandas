---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T07-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, 05-tech-lead.md, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T07), scripts/migrate.ts, scripts/migrate.test.ts, test/banco.ts, test/setup-global.ts, src/db/transacao.ts, src/db/index.ts, src/db/privilegios.ts, src/db/privilegios.test.ts, src/lib/log.ts, package.json, vitest.config.ts, eslint.config.mjs]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

### Arquivos

- Criado `src/lib/fila.ts`: `FILAS`, `NomeFila`, `PayloadDe`, `Fila`, `criarFila(urlApp)` e `instalarFilas(urlMigrator)`,
  com as assinaturas de "Interfaces produzidas" da T07.
  - `instalarFilas`: sobe o pg-boss com o migrator (`supervise: false`, `schedule: false`), o que instala ou atualiza o
    esquema `pgboss`; cria só as filas que ainda não existem (idempotente); para o pg-boss e dá ao `orquestrador_app`
    `USAGE` no esquema, DML nas tabelas, `USAGE, SELECT` nas sequências e `EXECUTE` nas funções. Nenhum DDL ao app.
  - `criarFila`: sobe com o papel do app e `migrate: false`, sem supervisão nem agendador. `enviar` confere o payload
    com `z.strictObject` por fila (só ids; chave a mais é recusada, C-22) antes de chamar `boss.send(..., { db: executor })`.
  - Ouvinte de `error` nos dois casos, com `log.warn({ evento: 'fila_erro', erro })` (só classe e código, C-21).
  - Opções das filas: `agente.executar` com `retryLimit: 0`, `expireInSeconds: 180` e `policy: 'stately'` (desvio,
    abaixo); `aviso.dec-pronto` com `retryLimit: 2`, `retryDelay: 60`, `retryBackoff: true`; `retencao.expurgo` e
    `worker.batimento` com o padrão.
- Modificado `scripts/migrate.ts`: depois das migrations do Drizzle, `migrar()` chama `instalarFilas(urlMigrator)`.
  O setup global dos testes usa o mesmo `migrar`, então o banco `modelo` (e cada cópia dele) já nasce com o esquema
  `pgboss` e as quatro filas.
- Modificado `src/db/privilegios.test.ts`: o teste de esquemas com `USAGE` passa a esperar
  `['drizzle', 'pgboss', 'public']`, e um bloco novo confere o esquema `pgboss`.

### Testes criados

`src/lib/fila.test.ts` (9 testes):
- o app sobe com `migrate: false` e não tem `CREATE` em `pgboss`;
- as quatro filas existem, criadas pelo migrator;
- `instalarFilas` de novo num banco já instalado não falha nem duplica fila;
- `send` com o executor da transação desfaz junto com o rollback e grava com o commit (ADR-06);
- `singletonKey` repetida é descartada e a da próxima tentativa entra (ADR-07);
- `agente.executar` tem a política `stately`, as outras filas a `standard`;
- com `stately`, chaves diferentes ficam ativas ao mesmo tempo (a fila não serializa os agentes), e com a chave já
  ativa entra no máximo mais um job na fila;
- payload fora do formato é recusado antes do banco, e a sentinela `SENTINELA-TEXTO` não aparece em `pgboss.job` (C-22);
- um worker com o papel do app processa o job.

`src/db/privilegios.test.ts`, bloco "esquema pgboss" (10 testes): esquema existe e não é do app; app sem `CREATE`;
nenhuma tabela, sequência ou função do `pgboss` é do app; app com exatamente `SELECT, INSERT, UPDATE, DELETE` em cada
tabela do `pgboss`; `PUBLIC` sem privilégio nas tabelas do `pgboss`; `create table`, `alter table`, `drop table`,
`create index` e `truncate` no `pgboss` recusados ao app com 42501.

### Teste antes do código (visto falhando)

`pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test`, antes de `fila.ts` e da mudança no `migrate.ts`:

```
 FAIL  src/lib/fila.test.ts [ src/lib/fila.test.ts ]
Error: Cannot find module './fila' imported from .../src/lib/fila.test.ts
 FAIL  src/db/privilegios.test.ts > esquema pgboss: ... > o app não tem CREATE no esquema pgboss
error: schema "pgboss" does not exist
AssertionError: expected [ 'drizzle', 'public' ] to deeply equal [ 'drizzle', 'pgboss', 'public' ]
 Test Files  2 failed | 25 passed (27)
      Tests  9 failed | 548 passed (557)
```

Depois do código, com a política padrão e depois com `singleton`, a conferência de `singletonKey` falhou (trecho na
seção de conferências). Com `stately`, tudo verde.

### Resultado de cada conferência da T-02 (pg-boss 12.34.0 instalado)

| Conferência | Resultado | Caminho seguido |
|---|---|---|
| `migrate: false` no construtor | Existe e funciona: o app sobe sobre o esquema criado pelo migrator, sem `CREATE` em `pgboss` | O do plano |
| `db` no `send` | Existe e funciona: o job enviado pelo executor da transação some no rollback e fica no commit | O do plano |
| `singletonKey` descarta repetida | **Não** na política padrão nem na `singleton`: o segundo envio com a mesma chave devolveu id (`expected 'f5b00d0e-…' to be null` na padrão; `expected 'ad63e209-…' to be null` na `singleton`). **Sim** na `stately` | Desvio 1 |
| `work` e manutenção sem DDL ao app | O `work` com o papel do app processa o job; o app segue sem `CREATE` em nenhum esquema | O do plano; nada voltou ao tech-lead |

### Comandos e resultado final

- `pnpm test`: 27 arquivos, 566 de 566 testes passaram, 0 falharam.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.

### Desvios do plano

1. `agente.executar` é criada com `policy: 'stately'`. O plano dava `policy: 'singleton'` como alternativa e, se nem
   assim, só a reivindicação da T27. A `singleton` foi testada e não descarta a chave repetida; a `stately` descarta
   (no máximo um job na fila e um ativo por chave) sem serializar a fila entre chaves diferentes, o que o teste
   novo comprova. A reivindicação da execução da T27 segue sendo a garantia final depois que o job sai da fila.
2. `instalarFilas` só chama `createQueue` para fila que ainda não existe (o plano chamava para todas). Assim rodar o
   migrate de novo não depende de `createQueue` aceitar fila repetida.
3. Ouvinte de `error` nos dois `PgBoss` (não estava no trecho do plano): sem ele, um erro emitido derruba o processo.
4. Testes a mais em `fila.test.ts` (filas existentes, reinstalação idempotente, política, `stately` com chaves
   diferentes, sentinela fora de `pgboss.job`) e em `privilegios.test.ts` (o bloco do esquema `pgboss`), para fixar o
   que a T-02 conferiu.

## Decisões tomadas

- Política `stately` em `agente.executar`: é a única das testadas que descarta a `singletonKey` repetida sem pôr
  todos os agentes numa fila só.
- As outras três filas ficam na política padrão: nenhuma delas depende de descarte por chave nesta tarefa.
- `GRANT` refeito a cada `migrar`: `ON ALL TABLES` vale para o que existe, então tabela nova que o pg-boss criar numa
  atualização também fica com o app.
- `max: 1` no `PgBoss` do migrator: ele só instala e cria filas; não precisa de mais de uma conexão.
- Payload validado com `z.strictObject` e o valor parseado é o que vai ao `send`: chave a mais é recusada, não
  descartada em silêncio.

## Pendências

- T27: com `stately`, depois que o job da chave `t1` fica ativo, entra mais um com a mesma chave. A reivindicação da
  execução (passo 1 da T27) tem que bloquear esse segundo.
- T29: o worker que ligar `supervise` ou `schedule` tem que rodar com o papel do app sem DDL. Se a manutenção do
  pg-boss pedir DDL ali, volta ao tech-lead (como diz a T07). Filas novas entram em `OPCOES_FILA` e são criadas pelo
  migrator.
- A política de fila já criada não muda com `createQueue`: se `OPCOES_FILA` mudar a política de uma fila que já
  existe num ambiente, isso pede um passo de migração próprio. Hoje não há ambiente com as filas criadas fora do teste.
- Não subi o banco de desenvolvimento: os testes usam Testcontainers.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -15` — último commit 07509d2 (06-T06-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --stat --format=%h%x20%s -12` — arquivos das tarefas anteriores
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — falha esperada: `Cannot find module './fila'`, `schema "pgboss" does not exist`; 9 de 557 falharam
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — política padrão: 1 de 564 falhou (`singletonKey` repetida não descartada)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — política `singleton`: 1 de 564 falhou (o mesmo)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — política `stately`: 564 de 564
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — com os testes da política: 566 de 566
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — 2 modificados, 2 novos, todos da T07
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — `scripts/migrate.ts` e `src/db/privilegios.test.ts`

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
