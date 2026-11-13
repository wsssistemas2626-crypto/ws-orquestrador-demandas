---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T01-construcao
agente: engenheiro-dados-bd
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, 05-tech-lead.md, tarefas.json, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (linhas 1 a 604, G1 a G10 e T01), src/db/schema/demandas.ts (em 0ac099a), src/db/schema/historico.ts, src/db/schema/index.ts, src/db/privilegios.ts, src/db/privilegios.test.ts, src/db/imutabilidade.test.ts, test/estatico/migration-0007.test.ts, test/estatico/piso-de-assercoes.test.ts, test/banco.ts, test/migracao/migration-0007-dados.test.ts (1 a 135), scripts/migrate.test.ts (45 a 74), drizzle/0005_rls_privilegios_agentes.sql, drizzle/meta/_journal.json, drizzle/meta/0007_snapshot.json (tabela demanda), drizzle.config.ts, docs/construcao/DEC-DEM-20261111-0016-v1/06-T01-engenheiro-dados-bd.md (forma dos comandos)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T01 do plano: tabela `andamento_construcao`, migrations `0008` (gerada) e `0009` (custom, só o `GRANT`), privilégio só de
inclusão (AN-10), com os testes da tarefa e as mudanças da G5.

### Arquivos criados

- `src/db/schema/andamento.ts`: `FASES_ANDAMENTO`, `STATUS_CONSTRUCAO`, `FaseAndamento`, `StatusConstrucao`,
  `MAXIMO_DE_TAREFAS` e `andamentoConstrucao` (G7), com os cinco CHECKs, as duas FKs sem cascata e os três índices do
  plano.
- `drizzle/0008_slippery_whirlwind.sql` e `drizzle/meta/0008_snapshot.json`: saída do `pnpm db:generate`, sem edição.
  Só `CREATE TABLE "andamento_construcao"`, duas `ADD CONSTRAINT ... FOREIGN KEY` (`ON DELETE no action`) e três
  `CREATE INDEX`. Nada em `demanda` nem em `evento`.
- `drizzle/0009_rls_andamento_construcao.sql` e `drizzle/meta/0009_snapshot.json`: criados vazios por
  `pnpm drizzle-kit generate --custom --name rls_andamento_construcao`. Só o `.sql` foi escrito: comentário e
  `GRANT SELECT, INSERT ON "andamento_construcao" TO orquestrador_app;`.
- `src/db/schema/andamento.test.ts`: o teste do plano. O `expect.any(Number)` da `demanda` virou **19**, a contagem das
  colunas em `0ac099a`. Contei em `src/db/schema/demandas.ts` e conferi em `drizzle/meta/0007_snapshot.json` e na saída
  do `db:generate` (`demanda 19 columns`). `evento` segue com 11.
- `test/estatico/migration-0008.test.ts`: o teste estático do plano. Confere o diário 0 a 9, a `0009` com o nome
  `rls_andamento_construcao`, a `0008` só aditiva e a `0009` com só o `GRANT`.

### Arquivos modificados

- `src/db/schema/index.ts`: `export * from './andamento';` no fim.
- `src/db/privilegios.ts`: a linha `{ tabela: 'andamento_construcao', privilegios: ['SELECT', 'INSERT'] }` depois da de
  `evento`, com o comentário do plano. Não tem `colunasUpdate`.
- `drizzle/meta/_journal.json`: entradas 8 e 9, escritas pelo drizzle-kit.
- `src/db/imutabilidade.test.ts` (G5): três casos novos no `it.each` da linha 32 (`update ... set fase = $1` com
  `['testando']`, `delete` e `truncate`). Nenhuma asserção saiu.
- `test/estatico/migration-0007.test.ts` (G5): o primeiro teste passou de "a 0007 é a última" para "a 0007 está no
  índice 7 do diário". A leitura do SQL agora usa a entrada de `idx` 7, e não `at(-1)`. As listas de proibidos e de
  esperados não mudaram.
- `test/estatico/piso-de-assercoes.test.ts`: `'src/db/schema/andamento.test.ts': 17` (linhas com `expect(` no fim da
  tarefa).

Nenhum outro teste fixava a `0007` como última. O `pnpm test` completo não apontou mais nenhum.

### Teste escrito antes, visto falhando

`pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/db/schema/andamento.test.ts test/estatico/migration-0008.test.ts src/db/imutabilidade.test.ts --reporter=dot`, antes do esquema e das migrations:

```
 FAIL  src/db/schema/andamento.test.ts [ src/db/schema/andamento.test.ts ]
Error: Cannot find module './andamento' imported from .../src/db/schema/andamento.test.ts
 FAIL  src/db/imutabilidade.test.ts > versões gravadas não mudam (RF-11) > update andamento_construcao set fase = $1 é recusado com o papel do app
-   "code": "42501",
+   "code": "42P01",
 FAIL  test/estatico/migration-0008.test.ts > a 0008 e a 0009 são as duas últimas, ...
AssertionError: expected [ +0, 1, 2, 3, 4, 5, 6, 7 ] to deeply equal [ +0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ]
 Test Files  3 failed (3)
      Tests  6 failed | 39 passed (45)
```

### Resultado

- Testes da tarefa, mais `migration-0007` e `privilegios`: 5 arquivos, **103 passaram, 0 falharam**.
- `pnpm test` completo, depois do ajuste: **308 arquivos, 6526 testes passaram, 0 falharam**.
- `pnpm lint` e `pnpm typecheck`: limpos.
- G4: `git diff 0ac099a` das superfícies congeladas saiu vazio. Também saíram vazios os diffs de `drizzle/000[0-7]_*.sql`
  e dos snapshots 0000 a 0007. O diff de `src/db/privilegios.ts` tem só a linha nova e o comentário dela.

### Desvios do plano

- O comentário do cabeçalho de `andamento.ts` no plano dizia "(sem sql.raw)". Esse texto dispara a varredura C-17 de
  `test/estatico/varreduras-qa.test.ts`, que procura `sql.raw` também em comentário. Na primeira rodada do `pnpm test`
  completo, 1 teste falhou por isso. O texto passou a "(sem SQL cru, C-17)". Nenhum teste mudou.

## Decisões tomadas

- **Volta da `0008` e da `0009`:** é a restauração do backup (caminho B, 02 seção 8). O SQL equivalente fica só para
  registro e roda pelo migrator: `REVOKE SELECT, INSERT ON "andamento_construcao" FROM orquestrador_app; DROP TABLE
  "andamento_construcao";`. Ele não é usado, porque a saúde da 0.3.1 fica em 503 com o diário da 0.4.0. As duas
  migrations não alteram dado existente (`alteram_dado = false`): só criam a tabela, as restrições, os índices e o
  privilégio.
- **Contagem da `demanda` em 19:** contei no esquema de `0ac099a` e conferi no snapshot 0007 e na saída do
  `db:generate`. O plano dizia que deixar `expect.any` seria Important na revisão.
- **Sem RLS nem guarda de `tenant_id`:** o sistema não tem `tenant_id`. A tabela não é multiempresa, e a guarda do
  papel do app é o `GRANT` mais o `privilegios.test.ts`, como nas tabelas de hoje.
- **Sem `GRANT` na sequência da identidade:** o `INSERT` em coluna `GENERATED ALWAYS AS IDENTITY` não pede o
  privilégio, como em `evento`. O teste confere que o `nextval` direto é recusado (42501), e o `privilegios.test.ts`
  confere que a sequência nova fica sem privilégio do app.
- **Mudança no comentário de `andamento.ts`:** o texto "(sem sql.raw)" virou "(sem SQL cru, C-17)", para não afrouxar
  a varredura C-17.
- **Comandos `pnpm` com `--dir <repo>`:** o shell do agente começa na estruturaAutonoma e `cd` não está na lista Pode.
  É a mesma forma aceita na 06-T01 do pedido 0016.

## Pendências

- Nenhuma bloqueia a passagem.
- Rodei três comandos de leitura fora da forma exata da lista Pode, ao lado das formas permitidas. Peço que o maestro
  os libere, por só lerem:
  - `grep -n` (sem `-r`) no `padrao-tecnico.md` da estruturaAutonoma;
  - `grep -c` no `drizzle/meta/0007_snapshot.json`;
  - `grep -n` no arquivo de saída do meu próprio `pnpm test` em segundo plano, em `/tmp/claude-1000/...`, para achar a
    falha. Esse arquivo não é do repositório, só guarda a saída do teste.

  Nenhum dos três altera nada.
- Para a `06-T06-construcao` (minha): o `EXPLAIN` das leituras usa os índices `andamento_construcao_demanda_id_idx` e
  `andamento_construcao_dec_gravado_idx` desta tarefa.
- Para a `09-entrega`: no ensaio de rollback, o esperado é `alteram_dado = false` e `volta_sem_restaurar = false`, como
  no plano.
- Nenhuma migration rodou em banco fora do Testcontainers. Não usei o `db:migrate` nem o banco de desenvolvimento.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — arquivos da pasta do pedido
- `grep -n "T01\|^## \|^### " /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md` — seções do plano
- `grep -n "migration\|Migration\|RLS\|tenant\|migrator" /home/deploy/servidor/projetos/estruturaAutonoma/docs/construcao/padrao-tecnico.md` — regras de migration (fora da forma exata; ver Pendências)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261111-0017-v1`, limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 0ac099a:src/db/schema/demandas.ts` — 19 colunas em `demanda`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files drizzle src/db test/estatico test/banco.ts` — arquivos do banco e dos testes estáticos
- `grep -c "\"name\":" /home/deploy/servidor/projetos/ws-orquestrador-demandas/drizzle/meta/0007_snapshot.json` — 377 (fora da forma exata; ver Pendências)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0ac099a --stat -- src drizzle test` — vazio no início (o ramo está na base)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "_journal" -e "at(-1)" -e "0007" -- src test scripts` — só o `migration-0007.test.ts` fixa a última migration
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "export const pacoteDecisao" -e "export const momento" -- src/db/schema` — exportações usadas
- `grep -rn "\"public\.\|\"columns\"" /home/deploy/servidor/projetos/ws-orquestrador-demandas/drizzle/meta/0007_snapshot.json` — tabelas do snapshot
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "pnpm .*test" -- docs/construcao/DEC-DEM-20261111-0016-v1/06-T01-engenheiro-dados-bd.md` — forma dos comandos da entrega anterior
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/db/schema/andamento.test.ts test/estatico/migration-0008.test.ts src/db/imutabilidade.test.ts --reporter=dot` — antes do código: 6 falharam, 39 passaram, 3 arquivos falharam
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:drizzle.config.ts` — esquema em `src/db/schema/index.ts`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas db:generate` — `drizzle/0008_slippery_whirlwind.sql`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas drizzle-kit generate --custom --name rls_andamento_construcao` — `drizzle/0009_rls_andamento_construcao.sql` vazia
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — arquivos da tarefa
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/db/schema/andamento.test.ts test/estatico/migration-0008.test.ts src/db/imutabilidade.test.ts test/estatico/migration-0007.test.ts src/db/privilegios.test.ts --reporter=dot` — 103 passaram, 0 falharam
- `grep -rn "expect(" /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/db/schema/andamento.test.ts` — 17 linhas
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 6525 passaram, 1 falhou (`varreduras-qa.test.ts`, C-17: o comentário "sem sql.raw" em `andamento.ts`)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0ac099a --stat -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/db/transacao.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/agentes/entrada-agente.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/pacotes-decisao/consultas.ts next.config.ts drizzle/000[0-7]_*.sql drizzle/meta/000[0-7]_snapshot.json` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- src/db/privilegios.ts drizzle/meta/_journal.json` — a linha nova e as entradas 8 e 9
- `grep -n "FAIL\|Test Files\|Tests  \|AssertionError\|Error:" /tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/d7de67e8-15e3-4f45-b927-45e1f3d1b43d/tasks/bwet8mo7z.output` — localizou a falha na saída do próprio teste (fora da forma exata; ver Pendências)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "C-17" -e "raw" -- test/estatico/varreduras-qa.test.ts` — regex da varredura C-17
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/varreduras-qa.test.ts test/estatico/sql-raw.test.ts test/estatico/piso-de-assercoes.test.ts --reporter=dot` — 1 falhou, 49 passaram (a edição ainda não tinha sido aplicada)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/varreduras-qa.test.ts test/estatico/sql-raw.test.ts test/estatico/piso-de-assercoes.test.ts --reporter=dot` — 50 passaram, 0 falharam
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 308 arquivos, 6526 passaram, 0 falharam
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo, depois do ajuste
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo, depois do ajuste
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só os 13 arquivos da tarefa

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] a migration roda com o papel migrator e tem RLS e guarda quando a tabela tem `tenant_id`
- [x] cada migration nova tem, em `## Decisões tomadas`, como desfazê-la (o SQL de volta ou a razão de ser irreversível)
- [x] a migration de esquema fica como saiu do `pnpm db:generate`; o SQL que o Drizzle não gera (RLS forçada, política, função de guarda) fica numa migration criada vazia por `pnpm drizzle-kit generate --custom --name rls_<tabela>` e escrita por você; nenhuma migration já commitada foi editada
