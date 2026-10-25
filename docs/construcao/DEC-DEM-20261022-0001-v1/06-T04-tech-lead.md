---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T04-revisao
agente: tech-lead
leu: [2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T04), tarefas.json, 06-T04-engenheiro-dados-bd.md, commit b156a37, padrao-tecnico.md (seção 12), contrato-passagem.md]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T04 (banco: conexão, transação, ajudante de teste, migrate, tabelas de acesso e histórico, guarda de
privilégios), commit `b156a37`. Nenhum problema Critical ou Important: a passagem segue para `06-T04-testes`. Quatro
pareceres Minor, cada um com tarefa de destino em Pendências.

### Conferência contra o plano

- Arquivos: os 14 da lista da T04, mais `scripts/migrate.test.ts` (teste do desvio do `ehExecucaoDireta`, dentro de
  `scripts/`, que a G1 dá ao `engenheiro-dados-bd`). Nenhum arquivo fora da tarefa mudou; `test/setup-global.ts` era o
  único a modificar.
- Interfaces: `Db`, `criarPool` (com `statement_timeout` de 10 s), `criarDb` (`casing: 'snake_case'`), `Executor`,
  `Transacao`, `comTransacao`, `PAPEL_APP`, `RegraPrivilegio`, `PRIVILEGIOS`, `SEQUENCIAS`, `migrar`, `BancoDeTeste` e
  `novoBanco` com as assinaturas da T04 e da G5.
- Tabelas: as oito da T04 com as colunas listadas. A migration `0001_rls_privilegios_acesso.sql` é o SQL do plano,
  linha por linha, mais um comentário de cabeçalho.
- Desvios aceitos, todos dentro do escopo da tarefa e com razão escrita na entrega: `ehExecucaoDireta` com teste (a
  comparação do plano fica falsa em silêncio quando o `argv[1]` é relativo, e o `db:migrate` terminaria sem aplicar
  nada); saída de erro do script por `reduzirErro` da T02, sem duplicar; índices nas FKs do Better Auth e em
  `verification.identifier`; `CHECK (falhas >= 0)`; `GENERATED ALWAYS AS IDENTITY`; datas de `evento` e
  `token_servico` sem padrão no banco (G3.4); `user.papel` NOT NULL; quatro testes a mais na guarda e três em
  `transacao.test.ts`. O teste de privilégio por coluna fecha um buraco real: a falha provocada na entrega mostra que os
  7 testes do plano deixavam passar um `GRANT UPDATE ("depois") ON "evento"`.
- TDD: a falha antes do código está na entrega (3 arquivos, módulos não encontrados), e a guarda foi vista falhando com
  um privilégio a mais.
- Volta das duas migrations registrada em Decisões tomadas da entrega do engenheiro, com o SQL dos `REVOKE` e o aviso
  de que a volta da 0000 apaga dado.

### Checklist da seção 12 do padrão técnico

- [x] Faz o que o plano pede; os acréscimos são os desvios aceitos acima; nenhum arquivo fora da tarefa mudou.
- [x] Há teste para cada comportamento novo, e ele falharia sem o código (falha vista antes do código e falha
  provocada na guarda).
- [x] Sem segredo, valor de `.env` ou dado pessoal real: as senhas de teste (`app_teste`, `migrator_teste`) são do
  contêiner descartável, e as de desenvolvimento já estavam no `docker-compose.dev.yml` da T01.
- [x] Entrada externa com Zod: não se aplica (a tarefa não tem rota, Server Action nem entrada de fora).
- [x] Banco: migration de esquema saída do `pnpm db:generate`, SQL à mão só na custom `rls_privilegios_acesso`,
  aplicada pelo migrator; sem `tenant_id`, sem RLS (sistema de um cliente só); a guarda de privilégios nasce com a
  primeira migration (C-34).
- [x] Nada duplica função existente: `migrate.ts` usa `reduzirErro` da T02.
- [x] Textos de interface e axe: não se aplica (sem tela).
- [x] Os quatro pareceres abaixo são Minor e foram para Pendências; nenhum Critical ou Important.
- [x] `/code-review` e `/security-review`: ficam com o PR, na `08-revisao`.

### Pareceres

1. `src/db/privilegios.test.ts:75` — Minor. Problema: o teste "sequências só com USAGE" percorre só `SEQUENCIAS`, que
   está vazia, e nenhum teste confere que as sequências fora da lista (hoje `evento_id_seq`) ficam sem privilégio do
   app. Razão: para tabela a guarda cobre os dois sentidos ("toda tabela tem regra, e toda regra tem tabela"); para
   sequência, um `GRANT UPDATE ON SEQUENCE evento_id_seq` esquecido daria `setval` ao app sem quebrar nada. Não
   bloqueia porque hoje nenhuma sequência tem privilégio do app (o `REVOKE ALL` da 0001 e a falta de `GRANT` garantem),
   e a T05 traz a primeira sequência da lista (`demanda_seq`).
2. `src/db/transacao.ts:19` e `:22` — Minor. Problema: quando o `rollback` falha (conexão caída), o erro é engolido e
   `cliente.release()` devolve ao pool uma conexão quebrada. Razão: o `pg` só descarta a conexão quando recebe
   `release(erro)`; a próxima transação pegaria a conexão morta e falharia. Correção esperada: guardar a falha do
   `rollback` e chamar `cliente.release(falha)` nesse caso, com teste que derruba a conexão dentro da transação
   (`pg_terminate_backend` pelo `poolMigrator`) e confere que a volta seguinte funciona.
3. `test/setup-global.ts:19` — Minor. Problema: no teste o migrator é o `POSTGRES_USER` do contêiner, que é
   superusuário; o `REVOKE CREATE ON SCHEMA public FROM PUBLIC` de `drizzle/0001_rls_privilegios_acesso.sql:5` pede
   que o migrator seja dono do banco (no Postgres 16 o esquema `public` pertence a `pg_database_owner`). Razão: a
   suíte não prova a migration com um migrator sem superusuário; na homologação e na produção ela passa só se o
   migrator for dono do banco. Não é defeito da T04, é condição do ambiente que a T33 e o `deploy.md` precisam dizer.
4. `scripts/migrate.ts:26` — Minor. Problema: `ehExecucaoDireta` compara o caminho resolvido sem `realpath`; se o
   repositório for aberto por um link simbólico, o `import.meta.url` (caminho real) e o `argv[1]` (caminho do link)
   diferem e o script sai sem aplicar nada e sem erro. Razão: é o mesmo silêncio que o desvio quis evitar. Hoje não
   ocorre (o ensaio no banco de dev chegou à migration); registro para quem montar a imagem.

## Decisões tomadas

- Status `pronto`: os quatro pareceres são Minor e a seção 12 manda só Critical e Important bloquearem a passagem.
- Desvios do engenheiro aceitos: todos têm razão escrita, ficam nos arquivos da tarefa e reforçam C-34, G3.4 ou C-21.
- Papel `orquestrador_app` no banco de desenvolvimento (pendência do engenheiro): entra na T33, com o mesmo SQL de
  papéis da homologação montado em `/docker-entrypoint-initdb.d/` no `docker-compose.dev.yml` (G1 dá esse arquivo ao
  `engenheiro-backend`); assim o SQL de papéis existe uma vez só. Nada da Fundação depende do `db:migrate` em dev: os
  testes usam o Testcontainers.
- Colunas do Better Auth não conferidas contra a biblioteca: ficam com a T08, que prova com login real; coluna a mais
  vira migration nova do `engenheiro-dados-bd`, sem editar a 0000.

## Pendências

- T05 (`engenheiro-dados-bd`), parecer 1: acrescentar à guarda o teste de que toda sequência do esquema `public` com
  privilégio do app está em `SEQUENCIAS`, e que nenhuma tem `SELECT` ou `UPDATE`, além do `USAGE` já conferido.
- T05 (`engenheiro-dados-bd`), parecer 2: `comTransacao` descarta a conexão quando o `rollback` falha, com o teste
  descrito no parecer. Fica na T05 por ser a próxima tarefa do mesmo engenheiro em `src/db/`.
- T33 (`engenheiro-backend`), parecer 3 e decisão do banco de dev: SQL de papéis com o migrator dono do banco e sem
  superusuário; o mesmo SQL no init do `docker-compose.dev.yml`. Na `10-documentacao`, o `deploy.md` diz que o
  migrator precisa ser dono do banco.
- `09-entrega` (`devops-sre`), parecer 4: o `Dockerfile` roda `scripts/migrate.ts` por caminho real, sem link
  simbólico, ou o `ehExecucaoDireta` passa a comparar com `realpath`.
- T08 (`engenheiro-backend`): conferir as colunas do Better Auth e do plugin `twoFactor` no login real (pendência do
  engenheiro, mantida).
- T07 (`engenheiro-backend`): estender a guarda ao esquema `pgboss` (pendência do engenheiro, mantida).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat b156a37a147526e77e57e0f4610b88283bf21a3a` — 20 arquivos, os da T04 mais a entrega e o registro do maestro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show b156a37a147526e77e57e0f4610b88283bf21a3a -- drizzle.config.ts drizzle/0000_amusing_living_lightning.sql drizzle/0001_rls_privilegios_acesso.sql drizzle/meta/_journal.json scripts src test` — diff do código revisado
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 16 arquivos, 172 de 172
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
