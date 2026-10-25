---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T04-construcao
agente: engenheiro-dados-bd
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T01 a T11), 06-T03-engenheiro-backend.md, package.json, vitest.config.ts, tsconfig.json, eslint.config.mjs, docker-compose.dev.yml, test/setup-global.ts, src/lib/reduzir-erro.ts, drizzle/0000_amusing_living_lightning.sql, drizzle/0001_rls_privilegios_acesso.sql, drizzle/meta/_journal.json]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T04 do plano: conexão, transação, ajudante de teste com Postgres real, `migrate.ts` com o migrator, tabelas de acesso
e de histórico, e a guarda de privilégios do `orquestrador_app` (C-34, ADR-03, ADR-12, CA-21.2, parte de RF-21).

### Arquivos

Criados:
- `drizzle.config.ts`: só gera (`dialect: postgresql`, `schema: ./src/db/schema/index.ts`, `out: ./drizzle`,
  `casing: snake_case`), sem credencial de banco.
- `src/db/schema/acesso.ts`: `user`, `session`, `account`, `verification`, `twoFactor` (`two_factor`),
  `bloqueioVerificacao`, `tokenServico`.
- `src/db/schema/historico.ts`: `evento` e o tipo `AtorTipo`.
- `src/db/schema/index.ts`, `src/db/index.ts` (`Db`, `criarPool` com `statement_timeout` de 10 s, `criarDb` com
  `casing: 'snake_case'`), `src/db/transacao.ts` (`Executor`, `Transacao`, `comTransacao`).
- `src/db/privilegios.ts` (`PAPEL_APP`, `RegraPrivilegio`, `PRIVILEGIOS`, `SEQUENCIAS`).
- `scripts/migrate.ts` (`migrar(urlMigrator)` e `ehExecucaoDireta`).
- `test/banco.ts` (`novoBanco`, `BancoDeTeste`).
- `drizzle/0000_amusing_living_lightning.sql` (saída do `pnpm db:generate`, sem edição),
  `drizzle/0001_rls_privilegios_acesso.sql` (custom, criada vazia pelo drizzle-kit e escrita à mão),
  `drizzle/meta/_journal.json`, `drizzle/meta/0000_snapshot.json`, `drizzle/meta/0001_snapshot.json`.
- Testes: `src/db/privilegios.test.ts`, `src/db/transacao.test.ts`, `scripts/migrate.test.ts`.

Modificado: `test/setup-global.ts` (contêiner `postgres:16-alpine` do Testcontainers, papel `orquestrador_app` criado
antes da migration, banco `modelo` migrado com o migrator, `provide('pgAdmin')`).

### Modelo físico (migration 0000)

| Tabela | Chave e restrições | Índices além da PK e dos únicos |
|---|---|---|
| `user` | `id` text PK; `email` único; `papel` NOT NULL com `CHECK in ('cto','administradora')`; `two_factor_enabled` padrão false; `desativado_em` nulo | — |
| `session` | `id` PK; `token` único; `user_id` FK `ON DELETE CASCADE` | `(user_id)` |
| `account` | `id` PK; `user_id` FK cascade | `(user_id)` |
| `verification` | `id` PK | `(identifier)` |
| `two_factor` | `id` PK; `user_id` FK cascade | `(user_id)` |
| `bloqueio_verificacao` | `usuario_id` PK e FK cascade; `falhas` padrão 0 com `CHECK >= 0` | — |
| `token_servico` | `id` uuid `gen_random_uuid()`; `hash` único; `agente` com `CHECK` dos quatro; `criado_em` NOT NULL sem padrão | — |
| `evento` | `id` bigint `GENERATED ALWAYS AS IDENTITY`; `ator_tipo` com `CHECK in ('pessoa','agente','sistema')`; `ocorrido_em` NOT NULL sem padrão; `demanda_id` nulo; `antes` e `depois` jsonb | `(demanda_id, ocorrido_em)` |

### Privilégios (migration 0001, espelho de `PRIVILEGIOS`)

`orquestrador_app`: `SELECT, INSERT, UPDATE, DELETE` nas seis tabelas do Better Auth e no bloqueio; `SELECT, INSERT`
mais `UPDATE (revogado_em)` em `token_servico`; `SELECT, INSERT` em `evento`; `USAGE` em `public` e `drizzle`;
`SELECT` em `drizzle.__drizzle_migrations`. Nenhuma sequência na lista: a identidade de `evento` não pede `USAGE`
(o teste insere com o papel do app sem esse privilégio).

### Testes criados (18 novos)

- `src/db/privilegios.test.ts` (11): os 7 do plano (toda tabela tem regra e vice-versa; privilégios de tabela exatos;
  `UPDATE` por coluna só nas listadas; app sem posse, sem superusuário, sem `CREATE` em `public`; sequências só
  `USAGE`; app lê `drizzle.__drizzle_migrations`; `UPDATE`, `DELETE` e `TRUNCATE` em `evento` dão 42501), mais 4:
  nenhum privilégio por coluna além da regra em **toda** tabela; `PUBLIC` sem privilégio em tabela de `public`; app
  não apaga o registro de migrations; em `token_servico` o app não troca `hash` nem `agente` nem apaga, e só atualiza
  `revogado_em`.
- `src/db/transacao.test.ts` (5): erro desfaz o Drizzle e o executor juntos; sem erro grava os dois e devolve o
  resultado; 12 transações com erro do banco seguidas (pool de 10) não prendem conexão; `ator_tipo` fora da lista dá
  23514; a conexão do pool tem `statement_timeout` de 10 s.
- `scripts/migrate.test.ts` (2): `ehExecucaoDireta` reconhece o script chamado por caminho absoluto ou relativo e não
  roda quando importado.

### TDD: falha vista antes do código

`pnpm test` com os três arquivos de teste escritos, antes de `test/banco.ts`, `privilegios.ts`, do esquema e do
`migrate.ts`:

```
 FAIL  scripts/migrate.test.ts [ scripts/migrate.test.ts ]
Error: Cannot find module './migrate' imported from .../scripts/migrate.test.ts
 FAIL  src/db/privilegios.test.ts [ src/db/privilegios.test.ts ]
Error: Cannot find module '../../test/banco' imported from .../src/db/privilegios.test.ts
 FAIL  src/db/transacao.test.ts [ src/db/transacao.test.ts ]
Error: Cannot find module '../../test/banco' imported from .../src/db/transacao.test.ts
 Test Files  3 failed | 13 passed (16)
      Tests  154 passed (154)
```

Falha provocada na guarda, depois do verde: acrescentei por um instante `GRANT UPDATE ("depois") ON "evento"` à 0001
(arquivo ainda não commitado) e rodei só a guarda:

```
 × nenhum privilégio por coluna além da regra (um GRANT UPDATE (coluna) esquecido quebra a imutabilidade)
AssertionError: evento: expected [ 'UPDATE:depois' ] to deeply equal []
 Tests  1 failed | 10 passed (11)
```

Os 7 testes do plano passaram com esse `GRANT` a mais; só o teste por coluna o pegou. A linha foi retirada e a suíte
inteira rodou de novo: `Test Files 16 passed (16)`, `Tests 172 passed (172)` (154 anteriores + 18 novos), 0 falhas.

### Ensaio do `pnpm db:migrate` no banco de desenvolvimento

Com o banco do `docker-compose.dev.yml` em `127.0.0.1:5434`, o script rodou pela linha de comando e parou em
`Migrations não aplicadas (Error 42704)`: o papel `orquestrador_app` não existe no banco de dev, e a 0001 falha sem
ele, como o plano manda. O caminho de linha de comando (`ehExecucaoDireta`) e a saída sem mensagem do Postgres ficaram
provados; a aplicação completa com o migrator está provada no Testcontainers. O banco foi derrubado ao fim.

### Desvios do plano

- `scripts/migrate.ts`: o plano comparava `fileURLToPath(import.meta.url) === process.argv[1]`, que fica falso em
  silêncio se o `argv[1]` vier relativo, e o `db:migrate` terminaria sem aplicar nada. Troquei por
  `ehExecucaoDireta(argv1, import.meta.url, cwd)`, que resolve o caminho, com teste próprio (`scripts/migrate.test.ts`,
  arquivo a mais). A falha sai só com classe e código, por `reduzirErro` da T02 (C-21, sem duplicar), e o sucesso
  imprime "Migrations aplicadas.".
- Quatro testes a mais na guarda e três a mais em `transacao.test.ts` (lista acima); o do privilégio por coluna fecha
  um buraco real (ver a falha provocada).
- Índices nas colunas de FK (`session.user_id`, `account.user_id`, `two_factor.user_id`) e em
  `verification.identifier`, que o plano não listava: o Better Auth consulta por elas, e a FK com cascade sem índice
  varre a tabela filha.
- `CHECK ("falhas" >= 0)` em `bloqueio_verificacao`.
- `evento.id` como `GENERATED ALWAYS AS IDENTITY` (o plano dizia "identity"): o app não escolhe o id do evento.
- `ocorrido_em` e `token_servico.criado_em` sem padrão no banco, e nenhuma coluna com `$onUpdate(() => new Date())`:
  a data vem do `Relogio` (G3.4, e o teste estático da T13 proíbe `new Date()` sem argumento em `src/`). Nas tabelas do
  Better Auth, `created_at` e `updated_at` têm `DEFAULT now()` no banco.
- `user.papel` NOT NULL, coerente com `required: true` da T08. `papel`, `agente` e `ator_tipo` tipados por `$type<>`.
- Teste do plano ajustado para o `strict` com `noUncheckedIndexedAccess`: `linha` com `as const` e leitura de
  `count()` por `const [r] = ...; r?.total`, em vez de `const [{ total }] = ...`.

## Decisões tomadas

- Volta da `0000_amusing_living_lightning` (migration nova, custom):
  `DROP TABLE "two_factor", "session", "account", "bloqueio_verificacao", "token_servico", "verification", "evento", "user";`.
  Só cria tabela e não toca dado existente, mas a volta apaga o que estiver nelas (contas, sessões e o histórico de
  `evento`): com dado, só com o backup do banco.
- Volta da `0001_rls_privilegios_acesso` (migration nova, custom):
  `REVOKE ALL ON "user", "session", "account", "verification", "two_factor", "bloqueio_verificacao", "token_servico", "evento" FROM orquestrador_app;`
  `REVOKE ALL ON drizzle.__drizzle_migrations FROM orquestrador_app;` `REVOKE USAGE ON SCHEMA drizzle FROM orquestrador_app;`
  `REVOKE USAGE ON SCHEMA public FROM orquestrador_app;`. O `REVOKE CREATE ON SCHEMA public FROM PUBLIC` não precisa
  voltar: no Postgres 16 o `PUBLIC` já nasce sem `CREATE` em `public`, e devolvê-lo abriria DDL a qualquer papel. Só
  mexe em privilégio, sem dado: volta sem backup.
- Tabelas do Better Auth escritas à mão no formato do adaptador Drizzle 1.7.6, como o plano manda; o CLI do Better Auth
  não está na lista Pode, e a T08 prova com login real.
- O papel `orquestrador_app` não nasce da migration: o ajudante de teste o cria antes (`nosuperuser nocreatedb
  nocreaterole`), e a migration falha sem ele em qualquer ambiente.
- Um contêiner por execução do Vitest e um banco por arquivo, copiado do `modelo` sob trava consultiva: teste
  independente de ordem (RNF-15) sem pagar a migração a cada arquivo.
- `statement_timeout` de 10 s no pool do app: consulta presa não segura conexão.

## Pendências

- T08 (`engenheiro-backend`): as colunas do Better Auth seguem a lista do plano e não foram conferidas contra o código
  da biblioteca (fora do git e da lista Pode). Se o plugin `twoFactor` ou o adaptador pedirem coluna a mais, a T08
  volta ao `engenheiro-dados-bd` para uma migration nova; a 0000 não se edita.
- Banco de desenvolvimento: o `docker-compose.dev.yml` não cria o `orquestrador_app`, então `pnpm db:migrate` em dev
  para em 42704. Proposta para o tech-lead decidir em qual tarefa entra: um SQL de init montado em
  `/docker-entrypoint-initdb.d/` no compose de dev, com senha fictícia de dev (a T33 já faz o equivalente na
  homologação). Não fiz porque o compose não é arquivo desta tarefa.
- O volume `ws-orquestrador-demandas_dbdata` ficou (o `down` não apaga volume). Pode ter o esquema `drizzle` vazio,
  que o migrator do Drizzle cria antes da transação das migrations; nenhuma tabela da aplicação ficou aplicada.
- T07: o `migrate.ts` já tem o ponto marcado para `instalarFilas`; a guarda continua olhando só `public`, e a T07
  acrescenta a do esquema `pgboss`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -15` — último commit `a51a556` (06-T03-testes)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — antes do código: 3 arquivos falharam (módulos `./migrate` e `../../test/banco` não encontrados), 154 de 154 dos demais
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas db:generate` — gerou `drizzle/0000_amusing_living_lightning.sql` (8 tabelas)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas drizzle-kit generate --custom --name rls_privilegios_acesso` — criou `drizzle/0001_rls_privilegios_acesso.sql` vazia
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 172 de 172, 0 falhas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/db/privilegios.test.ts` — com o `GRANT UPDATE ("depois")` provocado: 1 falha de 11, como esperado
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `docker compose -f /home/deploy/servidor/projetos/ws-orquestrador-demandas/docker-compose.dev.yml up -d` — banco de dev de pé em `127.0.0.1:5434`
- `DATABASE_URL_MIGRATOR=postgres://migrator_dev:dev_somente_local@127.0.0.1:5434/orquestrador_dev DATABASE_URL=postgres://orquestrador_app:app_dev_somente_local@127.0.0.1:5434/orquestrador_dev pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas db:migrate` — `Migrations não aplicadas (Error 42704)`: papel do app ausente no dev, falha prevista
- `docker compose -f /home/deploy/servidor/projetos/ws-orquestrador-demandas/docker-compose.dev.yml down` — contêiner e rede removidos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — só os arquivos da tarefa (novos e `test/setup-global.ts` modificado)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 172 de 172, 0 falhas (depois de retirar a linha provocada)

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] a migration roda com o papel migrator e tem RLS e guarda quando a tabela tem `tenant_id`
- [x] cada migration nova tem, em `## Decisões tomadas`, como desfazê-la (o SQL de volta ou a razão de ser irreversível)
- [x] a migration de esquema fica como saiu do `pnpm db:generate`; o SQL que o Drizzle não gera (RLS forçada, política, função de guarda) fica numa migration criada vazia por `pnpm drizzle-kit generate --custom --name rls_<tabela>` e escrita por você; nenhuma migration já commitada foi editada
