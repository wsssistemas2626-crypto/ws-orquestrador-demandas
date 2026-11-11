---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T01-construcao
agente: engenheiro-dados-bd
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G8 e T01), src/db/schema/acesso.ts, src/db/schema/historico.ts, src/db/schema/demandas.ts, src/db/schema/versoes.ts, src/db/schema/index.ts, src/db/schema/acesso.test.ts, src/db/schema/historico.test.ts, src/db/schema/dominio.test.ts, src/db/privilegios.ts, src/db/privilegios.test.ts, src/modules/acesso/tokens-servico.ts, drizzle/meta/_journal.json, drizzle/0003_rls_privilegios_dominio.sql, drizzle/0006_familiar_crusher_hogan.sql, drizzle.config.ts, package.json, scripts/migrate.test.ts, test/banco.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T01, esquema e migration `0007` (aditiva), como no plano.

### Arquivos alterados

- `src/db/schema/acesso.ts`: `INTEGRACOES` e `Integracao` (fonte única, ADR-20); `token_servico.agente` anulável;
  coluna nova `integracao` (anulável); CHECK `token_servico_integracao_check` e `token_servico_dono_check`
  (`num_nonnulls("agente", "integracao") = 1`). O `token_servico_agente_check` fica como está.
- `src/db/schema/historico.ts`: `AtorTipo` com `integracao`; `evento_ator_tipo_check` com `integracao`; CHECK novo
  `evento_ator_integracao_check` (ato de integração só com `ator_id` da lista e prefixo); índice
  `evento_acao_entidade_idx` em `(acao, entidade_id)` (ADR-27).
- `src/db/schema/demandas.ts`: `AUTORES_DEMANDA` e `AutorDemanda`; `demanda.autor_tipo` tipado por `AutorDemanda`;
  `demanda_autor_tipo_check` com `integracao`; CHECK novo `demanda_autor_integracao_check` (só `awave`, e sempre
  `rascunho_agente`). `AUTORES_ARTEFATO` (ESP, RSK, DEC) não muda.
- `src/modules/acesso/tokens-servico.ts`: só o `null` da linha sem agente em `validarTokenServico` (`linha?.agente`),
  para o `typecheck` e para um token de integração dar 401 até a T03.
- `src/db/schema/dominio.test.ts` (teste que já existe, fora da G5; explicado em Desvios).
- Gerados por `pnpm db:generate`, sem edição: `drizzle/0007_greedy_wendigo.sql`, `drizzle/meta/0007_snapshot.json`
  e a entrada 7 em `drizzle/meta/_journal.json`.

SQL gerado (`drizzle/0007_greedy_wendigo.sql`), 11 comandos, sem `UPDATE`, `DELETE`, `DROP COLUMN`, `DROP TABLE`,
`RENAME`, troca de tipo, `TRUNCATE` nem `GRANT`:

```sql
ALTER TABLE "evento" DROP CONSTRAINT "evento_ator_tipo_check";
ALTER TABLE "demanda" DROP CONSTRAINT "demanda_autor_tipo_check";
ALTER TABLE "token_servico" ALTER COLUMN "agente" DROP NOT NULL;
ALTER TABLE "token_servico" ADD COLUMN "integracao" text;
CREATE INDEX "evento_acao_entidade_idx" ON "evento" USING btree ("acao","entidade_id");
ALTER TABLE "token_servico" ADD CONSTRAINT "token_servico_integracao_check" CHECK ("integracao" in ('awave', 'construir'));
ALTER TABLE "token_servico" ADD CONSTRAINT "token_servico_dono_check" CHECK (num_nonnulls("agente", "integracao") = 1);
ALTER TABLE "evento" ADD CONSTRAINT "evento_ator_integracao_check" CHECK ("ator_tipo" <> 'integracao' or ("ator_id" in ('awave', 'construir') and "ator_token_prefixo" is not null));
ALTER TABLE "evento" ADD CONSTRAINT "evento_ator_tipo_check" CHECK ("ator_tipo" in ('pessoa', 'agente', 'sistema', 'integracao'));
ALTER TABLE "demanda" ADD CONSTRAINT "demanda_autor_integracao_check" CHECK ("autor_tipo" <> 'integracao' or ("autor_id" = 'awave' and "rascunho_agente"));
ALTER TABLE "demanda" ADD CONSTRAINT "demanda_autor_tipo_check" CHECK ("autor_tipo" in ('pessoa', 'agente', 'integracao'));
```

O drizzle-kit amplia um CHECK apagando e recriando a restrição com o mesmo nome. O migrator do Drizzle aplica a
migration numa transação só, então não há intervalo sem a regra. Toda linha que existe hoje passa nos CHECK novos:
os tokens têm `agente` preenchido e `integracao` nula, e nenhum evento nem demanda tem `integracao`.

### Testes criados

- `src/db/schema/integracao.test.ts` (11 testes, Postgres real por Testcontainers, papel do app):
  - token de integração aceito para `awave` e `construir`;
  - os dois donos nulos e os dois preenchidos recusados (`token_servico_dono_check`);
  - integração fora da lista recusada;
  - IN-17: o app não troca `integracao` (42501);
  - evento de integração aceito com prefixo e recusado sem prefixo ou fora da lista (`evento_ator_integracao_check`);
  - índice `evento_acao_entidade_idx` em `(acao, entidade_id)`;
  - demanda do `awave` como rascunho aceita; `construir` como autor e `awave` sem rascunho recusados
    (`demanda_autor_integracao_check`);
  - o CHECK de autoria da ESP continua sem `integracao`;
  - CA-11.2: `configuracao_agente` continua com as quatro linhas.
- `test/estatico/migration-0007.test.ts` (2 testes): a `0007` é a última e a única nova; o SQL dela não tem comando
  que apaga, renomeia, reescreve, troca tipo ou dá `GRANT`, e tem os quatro CHECK novos e o índice.

### Teste visto falhando antes do código

`pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/db/schema/integracao.test.ts test/estatico/migration-0007.test.ts`:

```
 ❯ test/estatico/migration-0007.test.ts (2 tests | 2 failed)
   × a 0007 é a última e a única nova
   × a 0007 não apaga, renomeia, reescreve nem troca tipo de nada
 ❯ src/db/schema/integracao.test.ts (11 tests | 9 failed)
AssertionError: expected [ +0, 1, 2, 3, 4, 5, 6 ] to deeply equal [ +0, 1, 2, 3, 4, 5, 6, 7 ]
Caused by: error: column "integracao" of relation "token_servico" does not exist
Caused by: error: new row for relation "demanda" violates check constraint "demanda_autor_tipo_check"
 Test Files  2 failed (2)
      Tests  11 failed | 2 passed (13)
```

Os 2 testes que já passavam guardam o que não pode mudar: o CHECK da ESP sem `integracao` e as quatro linhas de
`configuracao_agente`. Depois do esquema e da migration, os 13 passam.

### Resultado final

- `pnpm test`: 236 arquivos, 5263 testes passaram, 0 falharam.
- `pnpm lint` e `pnpm typecheck`: limpos.
- G4: o `git diff a9fd9b8` dos arquivos congelados sai vazio. São eles: `resolver-ator.ts`, `exigir-pessoa.ts`,
  `auth.ts`, `proxy.ts`, `privilegios.ts`, `next.config.ts`, as migrations e os snapshots `0000` a `0006` e
  `src/lib/rota.ts`.
- `src/db/privilegios.test.ts` passa sem mudança. A `0007` não tem `GRANT`, e `integracao` fica fora de
  `colunasUpdate`. O `SELECT, INSERT` por tabela que já existe cobre a coluna nova; `UPDATE` continua só em
  `revogado_em`.
- A migration roda com o papel migrator: o setup global dos testes migra o banco modelo com ele. O
  `scripts/migrate.test.ts` passa e confere que o registro de migrations tem as 8 entradas do diário e que o papel do
  app é recusado (42501).

### Desvios do plano

1. `src/db/schema/dominio.test.ts` (teste que já existe, fora da G5):
   - a linha `['demanda_autor_tipo_check', AUTORES_ARTEFATO]` passou a `['demanda_autor_tipo_check', AUTORES_DEMANDA]`;
   - entrou a linha `['token_servico_integracao_check', INTEGRACOES]`, com os dois imports.

   Razão: o teste confere que cada enumeração do banco é a lista exportada pelo esquema. A demanda agora tem lista
   própria (ADR-24); sem a troca o teste falha (`expected [ 'agente', 'integracao', 'pessoa' ] to deeply equal
   [ 'agente', 'pessoa' ]`). Nenhuma asserção saiu. A linha nova amarra o CHECK de `token_servico` à `INTEGRACOES`
   (ADR-20). O arquivo não está na lista do piso de asserções (D-17).
2. `src/db/schema/integracao.test.ts`, teste "as versões continuam só com pessoa e agente": somei
   `expect(rows[0]?.d).toMatch(/pessoa/)` antes do `not.toMatch(/integracao/)` do plano. Sem ela, o teste passaria à
   toa se o CHECK sumisse ou mudasse de nome. O nome `especificacao_tecnica_autor_tipo_check` foi conferido em
   `src/db/schema/versoes.ts` e é o real.

## Decisões tomadas

- A migration de esquema saiu do `pnpm db:generate` (`0007_greedy_wendigo`) e não foi editada. Não houve SQL à mão,
  então não há migration custom. Nenhuma tabela tem `tenant_id`, então não há RLS nem guarda nova (padrão técnico 5).
- Nenhum `GRANT` na `0007`: o privilégio por tabela que já existe cobre a coluna nova para `SELECT` e `INSERT`. A falta
  de `UPDATE` em `integracao` é o que prova o IN-17 no banco.
- `num_nonnulls` no `token_servico_dono_check`: diz "exatamente um dono" num CHECK só e já vale para as linhas de hoje
  (agente preenchido, integração nula).
- Índice `evento_acao_entidade_idx` sem `CONCURRENTLY`: o migrator do Drizzle roda a migration dentro de uma
  transação, onde `CONCURRENTLY` não é aceito. Com o volume do RNF-02 (20 mil eventos), a trava de escrita em `evento`
  dura milissegundos. O `EXPLAIN` das consultas que usam o índice fica na T10 (D-12), onde essas consultas nascem.
- **Como desfazer a `0007`.** O SQL abaixo é só referência: a volta real é a restauração do backup (ADR-12). O ensaio
  de rollback da 09 deve dar `alteram_dado = false`, porque a migration não reescreve dado.

  ```sql
  DROP INDEX "evento_acao_entidade_idx";
  ALTER TABLE "token_servico" DROP CONSTRAINT "token_servico_dono_check";
  ALTER TABLE "token_servico" DROP CONSTRAINT "token_servico_integracao_check";
  ALTER TABLE "evento" DROP CONSTRAINT "evento_ator_integracao_check";
  ALTER TABLE "demanda" DROP CONSTRAINT "demanda_autor_integracao_check";
  ALTER TABLE "evento" DROP CONSTRAINT "evento_ator_tipo_check";
  ALTER TABLE "evento" ADD CONSTRAINT "evento_ator_tipo_check" CHECK ("ator_tipo" in ('pessoa', 'agente', 'sistema'));
  ALTER TABLE "demanda" DROP CONSTRAINT "demanda_autor_tipo_check";
  ALTER TABLE "demanda" ADD CONSTRAINT "demanda_autor_tipo_check" CHECK ("autor_tipo" in ('pessoa', 'agente'));
  ALTER TABLE "token_servico" DROP COLUMN "integracao";
  ALTER TABLE "token_servico" ALTER COLUMN "agente" SET NOT NULL;
  ```

  Esse SQL só funciona enquanto o banco não tiver dado de integração. Com evento, demanda ou token de integração
  gravado, os dois `ADD CONSTRAINT` e o `SET NOT NULL` falham, e o `DROP COLUMN` apagaria o dono dos tokens de
  integração. Nesse caso, a volta é a restauração do backup.

## Pendências

- Nenhuma bloqueia a passagem.
- Para a `09-entrega` e o procedimento de volta (`10-documentacao`): a 0.2.0 roda sobre o banco migrado, porque a
  `0007` só amplia. Mas o `validarTokenServico` da 0.2.0 devolveria `{ tipo: 'agente', agente: null }` para um token de
  integração. A matriz nega esse ator, porque nenhuma linha lista `null`. Mesmo assim, se a imagem voltar para a
  0.2.0 depois de os tokens de integração serem emitidos, revogue esses tokens pelo prefixo antes. Na T01 ainda não
  existe nenhum token de integração.
- Para a T10 (minha): o `EXPLAIN` das leituras do pedido no histórico confere que `evento_acao_entidade_idx` é usado.
- Os comandos `pnpm` rodaram com `--dir <repo>`, porque o shell do agente começa na estruturaAutonoma e `cd` é vedado
  nesta etapa. São os comandos da lista Pode (`test`, `lint`, `typecheck`, `db:generate`), apontados para o
  repositório do pedido.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261111-0016-v1`, limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -n 1 --format=%H -S "Task T01" -- docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md` — sem saída (só leitura do histórico)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- test drizzle scripts src/db vitest.config.ts package.json docker-compose.dev.yml drizzle.config.ts` — lista dos arquivos rastreados
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/db/schema/integracao.test.ts test/estatico/migration-0007.test.ts` — antes do código: 11 falharam, 2 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas db:generate` — `drizzle/0007_greedy_wendigo.sql`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/db/schema/integracao.test.ts test/estatico/migration-0007.test.ts` — 13 passaram, 0 falharam
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 5261 passaram, 1 falhou (`dominio.test.ts`: `demanda_autor_tipo_check` comparado com `AUTORES_ARTEFATO`)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/db/schema/dominio.test.ts` — 123 passaram, 0 falharam, depois do ajuste
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 5263 passaram, 0 falharam, 236 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só os arquivos da tarefa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 --stat -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts drizzle/0000_amusing_living_lightning.sql drizzle/0001_rls_privilegios_acesso.sql drizzle/0002_brown_jackal.sql drizzle/0003_rls_privilegios_dominio.sql drizzle/0004_busy_jigsaw.sql drizzle/0005_rls_privilegios_agentes.sql drizzle/0006_familiar_crusher_hogan.sql drizzle/meta/0000_snapshot.json drizzle/meta/0001_snapshot.json drizzle/meta/0002_snapshot.json drizzle/meta/0003_snapshot.json drizzle/meta/0004_snapshot.json drizzle/meta/0005_snapshot.json drizzle/meta/0006_snapshot.json src/lib/rota.ts` — vazio (G4)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo, depois do ajuste
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo, depois do ajuste
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 6 arquivos rastreados alterados

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] a migration roda com o papel migrator e tem RLS e guarda quando a tabela tem `tenant_id`
- [x] cada migration nova tem, em `## Decisões tomadas`, como desfazê-la (o SQL de volta ou a razão de ser irreversível)
- [x] a migration de esquema fica como saiu do `pnpm db:generate`; o SQL que o Drizzle não gera (RLS forçada, política, função de guarda) fica numa migration criada vazia por `pnpm drizzle-kit generate --custom --name rls_<tabela>` e escrita por você; nenhuma migration já commitada foi editada
