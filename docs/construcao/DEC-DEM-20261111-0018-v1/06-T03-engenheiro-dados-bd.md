---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T03-construcao
agente: engenheiro-dados-bd
leu: [pedido.json, tarefas.json, padrao-tecnico.md, contrato-passagem.md, docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md (G0 a G7 e T03), src/db/schema/decisao.ts, src/db/imutabilidade.test.ts, src/db/schema/andamento.test.ts, test/banco.ts, test/estatico/migration-0008.test.ts, test/estatico/piso-de-assercoes.test.ts, drizzle/meta/_journal.json, drizzle/0003_rls_privilegios_dominio.sql]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T03 (SB-10, SB-07 d, RNF-08, ADR-37 na forma): coluna `pacote_decisao.caminhos_com_nome_na_criacao text[]`, anulável e
sem padrão, e a migration `0010` gerada pelo `pnpm db:generate`, sem edição e sem custom.

**Arquivos criados**
- `drizzle/0010_magical_cammi.sql` (gerado; conteúdo inteiro: `ALTER TABLE "pacote_decisao" ADD COLUMN "caminhos_com_nome_na_criacao" text[];`)
- `drizzle/meta/0010_snapshot.json` (gerado)
- `test/estatico/migration-0010.test.ts` (2 testes, 4 linhas `expect(`): a 0010 é a última e a única nova, de nome gerado e sem `rls_`; o SQL é só o `ADD COLUMN` anulável e sem padrão
- `src/db/schema/caminhos-da-criacao.test.ts` (7 testes, 9 linhas `expect(`, Postgres real, dados fictícios): tipo `ARRAY`/`_text`, `is_nullable = YES`, sem padrão; DEC inserido sem a coluna fica `null`; 21 colunas em `pacote_decisao` (as 20 de `41108ee` e a nova); o papel do app inclui DEC com `['demanda.titulo']` e com `[]`; três `UPDATE` da coluna pelo papel do app recusados (42501) com o retrato da tabela (`jsonb_agg(to_jsonb(t))`) igual antes e depois

**Arquivos alterados**
- `src/db/schema/decisao.ts`: uma coluna (`caminhosComNomeNaCriacao: text().array()`) depois de `criadaEm`, com o comentário do plano
- `drizzle/meta/_journal.json`: só a entrada `idx 10` acrescentada (pelo gerador)
- `src/db/imutabilidade.test.ts` (G5): o `it.each` da linha 32 ganha `['update pacote_decisao set caminhos_com_nome_na_criacao = $1', ['{}']]`, com comentário; contagem de `expect(` igual (23)
- `test/estatico/migration-0008.test.ts` (G5): o teste das linhas 22 a 25 passa a "a 0008 e a 0009 estão nos índices 8 e 9 do diário", com `find((e) => e.idx === 8 | 9)`, sem `entries[9]` nem a lista inteira fixa; as outras asserções ficam; contagem de `expect(` igual (6). A asserção da lista inteira de índices vive agora em `migration-0010.test.ts`, com o 10
- `test/estatico/piso-de-assercoes.test.ts`: só acréscimo, `src/db/schema/caminhos-da-criacao.test.ts: 9` e `test/estatico/migration-0010.test.ts: 4`

**Não mudou:** `drizzle/0000` a `0009` e os snapshots `0000` a `0009` (`git diff 41108ee --stat -- drizzle src/db/privilegios.ts` mostra só o `_journal.json`, +7); `src/db/privilegios.ts` (o `GRANT SELECT, INSERT` de tabela da `0003` cobre a coluna nova; o caso 3 do teste novo prova o INSERT pelo app e o 4 prova que não há UPDATE).

**Teste antes do código (visto falhando)** — `pnpm --dir <repo> test test/estatico/migration-0010.test.ts src/db/schema/caminhos-da-criacao.test.ts src/db/imutabilidade.test.ts test/estatico/migration-0008.test.ts --reporter=dot`, antes do esquema:

```
 FAIL  src/db/imutabilidade.test.ts > versões gravadas não mudam (RF-11) > update pacote_decisao set caminhos_com_nome_na_criacao = $1 é recusado com o papel do app
-   "code": "42501",
+   "code": "42703",
 FAIL  test/estatico/migration-0010.test.ts > a 0010 é a última e a única nova, e não é custom (nome gerado, sem rls_)
AssertionError: expected [ +0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ] to deeply equal [ +0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ]
 FAIL  src/db/schema/caminhos-da-criacao.test.ts > ... > a coluna é text[], anulável e sem padrão
AssertionError: expected [] to deeply equal [ { data_type: 'ARRAY', …(3) } ]
 FAIL  src/db/schema/caminhos-da-criacao.test.ts > ... > pacote_decisao tem 21 colunas: as 20 de 41108ee e a nova
AssertionError: expected [ { n: 20 } ] to deeply equal [ { n: 21 } ]
 Test Files  3 failed | 1 passed (4)
      Tests  10 failed | 45 passed (55)
```

O `migration-0008.test.ts` passou já na forma nova antes do código (guarda de forma, G5): é a exceção declarada da G3.1;
o teste que exige o código novo é o `migration-0010.test.ts` e o `caminhos-da-criacao.test.ts`.

**Depois do código:** os mesmos 4 arquivos, `Test Files 4 passed (4)`, `Tests 55 passed (55)`.

**Suíte, lint e tipos:** `pnpm test` com 360 de 360 arquivos e 7907 de 7907 testes passando, 0 falhas; `pnpm lint` e
`pnpm typecheck` limpos. O `typecheck` recusou uma vez o `it.each` do teste novo (TS2769) com a suíte já rodando; o
ajuste foi só de tipo (`it.each<[string, unknown[]]>`), e os arquivos da tarefa e o piso rodaram de novo depois dele
(85 de 85).

**Desvios do plano**
- `caminhos-da-criacao.test.ts`, caso 4: além do `update ... = '{}'` do plano, entram dois `UPDATE` a mais da coluna
  (com `where ... is null`, o DEC anterior à 0.4.1, e `= null`), no mesmo `it.each`, com o mesmo retrato antes e depois.
  Razão: o caminho de ataque relevante do SB-07 (d) é "preencher depois" o DEC antigo ou "apagar" a marcação; nenhum
  afrouxa nada.
- `caminhos-da-criacao.test.ts`, `it.each<[string, unknown[]]>`: tipo explícito, porque o `typecheck` recusou a união
  `string[] | string[][]` inferida para o segundo argumento do `query`.

## Decisões tomadas

- Coluna `text[]` anulável, sem padrão e sem CHECK: `null` é o DEC anterior à 0.4.1 (ADR-37); o formato dos caminhos
  é conferido pela aplicação na leitura (`lerCaminhosDaCriacao`, T05) e a gravação é só por `criar.ts` (T04); um CHECK
  de formato exigiria migration custom, que o plano e o SB-10 não preveem.
- Sem migration custom e sem GRANT: o `GRANT SELECT, INSERT ON "pacote_decisao"` da `0003` é de tabela e vale para a
  coluna nova; o papel do app segue sem UPDATE (provado no teste).
- Sem RLS nova: `pacote_decisao` não tem `tenant_id` (o sistema não é multiempresa); a regra de RLS/guarda do critério
  de pronto não se aplica a esta tabela.
- **Como desfazer a `0010`:** a volta é a restauração do backup (caminho B, 02 seção 8). O SQL equivalente, só para
  registro, é `ALTER TABLE "pacote_decisao" DROP COLUMN "caminhos_com_nome_na_criacao";` pelo migrator, e não é usado
  porque a saúde da 0.4.0 fica em 503 com o diário da 0.4.1 (a 0.4.0 não roda sobre o banco com a entrada `0010` no
  `__drizzle_migrations` sem ela no próprio diário). A migration não apaga, não renomeia, não troca tipo e não reescreve
  dado existente: `alteram_dado: false` esperado no ensaio de rollback; `volta_sem_restaurar: false` esperado (SB-10).
- Plano de execução: a tarefa não cria consulta nova (só a coluna); nenhuma consulta crítica muda, e não há `EXPLAIN`
  a registrar nesta tarefa.
- Retenção (LGPD): a coluna não guarda dado pessoal, só nomes de campo de lista fechada (sem o nome nem hash dele);
  segue a retenção do próprio DEC, que é só de inclusão.

## Pendências

- Nenhuma que impeça a próxima etapa. A T04 grava a coluna (insert só em `criar.ts`) e a T05 a lê; até lá, todo DEC
  novo nasce com `null`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files docs/construcao/DEC-DEM-20261111-0018-v1` — 16 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T03" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md` — 12 linhas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files src/db test/banco.ts test/estatico drizzle` — lista
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "pacote_decisao" -- drizzle/0003_rls_privilegios_dominio.sql src/db/privilegios.ts` — GRANT SELECT, INSERT de tabela
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "getTableColumns(pacoteDecisao" -- src test` — nenhum uso
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/migration-0010.test.ts src/db/schema/caminhos-da-criacao.test.ts src/db/imutabilidade.test.ts test/estatico/migration-0008.test.ts --reporter=dot` — antes do código: 10 falharam, 45 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas db:generate` — gerou `drizzle/0010_magical_cammi.sql`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 4 arquivos rastreados alterados
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/migration-0010.test.ts src/db/schema/caminhos-da-criacao.test.ts src/db/imutabilidade.test.ts test/estatico/migration-0008.test.ts --reporter=dot` — depois do código: 55 de 55
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" -- src/db/schema/caminhos-da-criacao.test.ts test/estatico/migration-0010.test.ts test/estatico/migration-0008.test.ts src/db/imutabilidade.test.ts` — imutabilidade 23, migration-0008 6 (os novos ainda não rastreados)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep --untracked -c "expect(" -- src/db/schema/caminhos-da-criacao.test.ts test/estatico/migration-0010.test.ts` — 9 e 4
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — em segundo plano: 360 de 360 arquivos, 7907 de 7907 testes, 0 falhas (201 s)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- drizzle/meta/_journal.json` — só a entrada idx 10
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 41108ee --stat -- drizzle src/db/privilegios.ts` — só `_journal.json` (+7)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — 1 erro (TS2769 no `it.each` do teste novo), corrigido com o tipo explícito
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- src/db/schema/decisao.ts` — só a coluna e o comentário
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/db/schema/caminhos-da-criacao.test.ts test/estatico/migration-0010.test.ts test/estatico/piso-de-assercoes.test.ts --reporter=dot` — 85 de 85 (repetido depois do ajuste de tipo, que entrou com a suíte já rodando)

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] a migration roda com o papel migrator e tem RLS e guarda quando a tabela tem `tenant_id` (`pacote_decisao` não tem `tenant_id`; a 0010 roda pelo migrator nos testes, no `modelo` do setup global)
- [x] cada migration nova tem, em `## Decisões tomadas`, como desfazê-la (o SQL de volta ou a razão de ser irreversível)
- [x] a migration de esquema fica como saiu do `pnpm db:generate`; o SQL que o Drizzle não gera (RLS forçada, política, função de guarda) fica numa migration criada vazia por `pnpm drizzle-kit generate --custom --name rls_<tabela>` e escrita por você; nenhuma migration já commitada foi editada
