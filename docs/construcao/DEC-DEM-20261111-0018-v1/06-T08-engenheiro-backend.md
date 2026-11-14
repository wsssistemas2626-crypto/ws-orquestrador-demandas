---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T08-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, parada-P1.md, docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md (T08, T09 e Interfaces G7), docs/superpowers/specs/2026-11-13-ws-orquestrador-demandas-sobras-design.md (SB-14, 7.2), 01-analista-requisitos.md (RF-04, Pendência 5), 02-arquiteto-solucoes.md (3.6), 04-seguranca-aplicacao.md (SB-14), DEC-DEM-20261104-0014-v1/passagens.jsonl (falha do CI na P3), estruturaAutonoma/pedidos/insumos/2026-11-11_orquestrador-sobras-0.1.13.md, src/lib/deps-qa.test.ts, src/lib/deps.ts, test/banco.ts, test/setup-global.ts, vitest.config.ts, .github/workflows/ci.yml, test/estatico/piso-de-assercoes.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T08 (SB-14, RF-04, CA-04.1 a CA-04.4): o caso C-27 de `src/lib/deps-qa.test.ts` fica estável sem asserção a menos, e a
verificação passa a ser mais forte, não mais fraca.

**Arquivos alterados**
- `test/sessoes-do-banco.ts` (novo): `SessaoDoBanco`, `sessoesDoBanco(pool)` e `diagnosticoDasSessoes(s)` como nas
  Interfaces G7 (só `backend_type`, `usename` e `state`), e `papeisDasSessoesDeCliente(pool, tentativas = 50)`.
- `test/sessoes-do-banco.test.ts` (novo): os três casos do passo 2 do plano, sem mudança no texto do plano.
- `src/lib/deps-qa.test.ts`: o caso C-27 chama `papeisDasSessoesDeCliente(d.pool)`, com o diagnóstico como mensagem; as
  outras duas asserções do caso e os outros dois casos ficam iguais.
- `test/estatico/piso-de-assercoes.test.ts`: `PISO` ganha `src/lib/deps-qa.test.ts: 8` e
  `test/sessoes-do-banco.test.ts: 5` (só acréscimo).
- Não mudaram: `src/lib/deps.ts`, `test/banco.ts`, `vitest.config.ts` (sem `retry`).

### Causa (escrita antes da correção)

**Execuções antes da correção, com o diagnóstico como mensagem e a consulta e o matcher de hoje:** 10 de
`pnpm test src/lib src/db` (10 de 10 verdes, 1.070 testes cada) e 1 de `pnpm test` inteira (377 arquivos, 8.149
testes, verde). **Nenhuma das 11 falhou**: a falha não foi reproduzida nesta máquina.

**Evidência da falha real:** o CI do PR #15 (pedido 0014, `passagens.jsonl`, P3, 10/11/2026) falhou com
`expected [orquestrador_app, null] to deeply equal [orquestrador_app]`. A sessão a mais tinha `usename` **nulo**, e não
o papel do migrator: não é o C-27 falhando de verdade, é instabilidade da verificação.

**Causa: hipótese (a), processo de fundo do Postgres (autovacuum worker) no banco recém-copiado.** Como o diagnóstico
não reproduziu, a causa é dada por eliminação sobre a falha registrada, e o CHANGELOG deve dizer "causa provável":
- Sessão com `usename` nulo e `datname` do banco do teste só pode ser processo de fundo: no Postgres 16 (o
  `postgres:16-alpine` do `test/setup-global.ts`) a sessão de cliente só aparece no `pg_stat_activity` depois de
  autenticada, já com o papel. O autovacuum worker aparece com `datname` preenchido e sem papel.
- Cada arquivo de teste cria um banco novo a partir do `modelo` (`test/banco.ts`), e nenhum é apagado. O lançador do
  autovacuum escolhe primeiro o banco com atividade que nunca passou por autovacuum, e acorda a cada `naptime` dividido
  pelo número de bancos. Na suíte inteira são 377 bancos: um worker entra num banco novo logo depois da primeira
  atividade dele, que no `deps-qa` é justamente a montagem de `obterDeps()` antes da consulta. Rodando poucos arquivos,
  o lançador acorda raramente, e por isso a falha só aparece com a suíte inteira, como no CI.
- (b), sessão de cliente ainda autenticando: não acontece no Postgres 16 (ela não aparece antes de autenticar). Fica a
  espera contada como defesa, porque o Postgres 18 passou a mostrar a sessão durante a autenticação, sem papel.
- (c), sessão saindo: a sessão que sai ainda tem papel e seria `orquestrador_app`; não explica o `null`.

**Achado durante a correção (CA-04.3 pegou):** a correção (a) como o plano a escreveu, `backend_type = 'client backend'`
lido **pelo pool do app**, esconde o migrator. O papel do app não tem `pg_read_all_stats` e, para a sessão de outro
papel, o `pg_stat_activity` devolve `backend_type` e `state` nulos. Com a função do plano, o caso CA-04.3 falhou assim
(diagnóstico pela visão do app, com a conexão do migrator aberta no mesmo banco):

```
AssertionError: sessões: client backend/orquestrador_app/active, -/migrator/-: expected [ 'orquestrador_app' ] to not deeply equal [ 'orquestrador_app' ]
```

O filtro tirava `-/migrator/-` da lista. Seria exatamente a correção proibida pelo SB-14: esconder o app conectando como
migrator.

**Correção aplicada:** `papeisDasSessoesDeCliente(pool)` usa `pool` só para saber o nome do banco
(`select current_database()`), e lê as sessões por um observador: o superusuário do contêiner descartável de teste
(`inject('pgAdmin')`, como já faz o `test/banco.ts`), conectado ao banco `postgres`, fora do banco observado, para não
se contar. O superusuário vê o `backend_type` de todas as sessões. A consulta é
`select distinct usename from pg_stat_activity where datname = $1 and backend_type = 'client backend' order by 1`:
- mantém o `distinct`;
- não filtra por `usename`;
- tira só processo de fundo, causa (a);
- espera até 50 tentativas de `pg_sleep(0.05)` enquanto houver `null`, causa (b), sem relógio do teste.

Esgotadas as tentativas, o `null` fica e o `toEqual(['orquestrador_app'])` falha (falha fechada).

**Texto para o CHANGELOG 0.4.1 (CA-04.4), para a `10-documentacao` copiar:**

> **C-27 (teste instável de `src/lib/deps-qa.test.ts`).** Causa provável: o caso lia todas as sessões do banco do teste
> no `pg_stat_activity`, inclusive os processos de fundo do Postgres. Na suíte inteira, com centenas de bancos copiados
> do `modelo`, o autovacuum entra no banco novo logo depois da primeira atividade e aparece sem papel. Daí a falha do
> CI na 0.1.13: `[orquestrador_app, null]`. Não foi reproduzida em 11 execuções locais. Correção: a verificação conta
> só as sessões de cliente (`backend_type = 'client backend'`), mantém o `distinct` e o `toEqual(['orquestrador_app'])`,
> e espera por tentativas contadas a sessão ainda sem papel. Ela lê o `pg_stat_activity` pelo superusuário do banco
> descartável de teste, porque pelo papel do app a sessão de outro papel vem com `backend_type` nulo e seria escondida.
> Um teste permanente prova que uma conexão do migrator no mesmo banco faz a verificação falhar (CA-04.3). Nenhuma
> asserção retirada (8 linhas com `expect(` antes e depois); o arquivo entrou no piso de asserções.

**A mesma causa explica a instabilidade conhecida dos outros arquivos? Não.** Fica só o registro; corrigir está fora do
pedido. Nenhum destes arquivos lê `pg_stat_activity`. As instabilidades conhecidas deles são limites de tempo de relógio
de parede, sensíveis à carga da máquina:
- `src/app/api/saude/route.test.ts`: `< 200 ms` e `< 400 ms`.
- `test/desempenho/leitura.test.ts`: p95 `< 500 ms`.
- `src/modules/demandas/resumo-da-fila.test.ts`: `< 1000 ms`.
- `src/modules/dados-pessoais/minimizar.test.ts`: `< 200 ms` e `< 1000 ms`, só CPU, sem banco.
- `scripts/scripts.test.ts` (T33): subprocessos dos scripts sob o `testTimeout`. Não achei asserção de tempo explícita
  nem a falha registrada; a ligação com carga é a hipótese registrada antes deste pedido, não confirmada aqui.

O autovacuum pode somar um pouco de carga ao contêiner compartilhado, mas não é a causa.

### CA-04.2: `expect(` antes e depois

| Arquivo | `41108ee` | Agora |
|---|---|---|
| `src/lib/deps-qa.test.ts` | 8 | 8 |
| `test/sessoes-do-banco.test.ts` | — | 5 |

As três asserções do caso C-27 ficam:
- `toEqual(['orquestrador_app'])` sobre `select distinct usename` (agora com o diagnóstico como mensagem);
- `d.config.databaseUrl` igual a `b.urlApp`;
- `Object.values(d.config)` sem `b.urlMigrator`.

Nenhuma troca para `toContain`, sem `retry`, `skip`, `fails`, `todo` nem condição.

Diff do caso:

```diff
-      // A fila já conectou no start(); o pool conecta aqui. Toda sessão deste banco é do papel do app.
-      const { rows } = await d.pool.query<{ usename: string }>(
-        'select distinct usename from pg_stat_activity where datname = current_database() order by 1',
-      );
-      expect(rows.map((r) => r.usename)).toEqual(['orquestrador_app']);
+      // A fila já conectou no start(); o pool conecta aqui. Toda sessão de cliente deste banco é do papel do app
+      // (`select distinct usename` só de `client backend`, com espera contada pela sessão ainda sem papel; C-27, SB-14).
+      const papeis = await papeisDasSessoesDeCliente(d.pool);
+      const diagnostico = diagnosticoDasSessoes(await sessoesDoBanco(d.pool));
+      expect(papeis, diagnostico).toEqual(['orquestrador_app']);
```

### Testes criados

`test/sessoes-do-banco.test.ts`:
- CA-04.3, permanente: com uma conexão do migrator no mesmo banco, a lista não é só `orquestrador_app` e contém o papel
  do migrator.
- Só o app conectado: a lista é exatamente `['orquestrador_app']`.
- O diagnóstico não contém `b.urlApp`, `b.urlMigrator` nem as senhas delas.

### Teste visto falhando antes do código

`pnpm --dir … test test/sessoes-do-banco.test.ts src/lib/deps-qa.test.ts --reporter=dot` → 3 falharam, 3 passaram:

```
 FAIL  test/sessoes-do-banco.test.ts > C-27: a verificação das sessões > CA-04.3: …
TypeError: papeisDasSessoesDeCliente is not a function
 FAIL  src/lib/deps-qa.test.ts > obterDeps QA > C-27: com DATABASE_URL_MIGRATOR no ambiente, …
TypeError: papeisDasSessoesDeCliente is not a function
      Tests  3 failed | 3 passed (6)
```

Depois, com a função do plano lendo pelo pool do app, o CA-04.3 falhou (`-/migrator/-` escondido, trecho acima). Com o
observador, 6 de 6.

### CA-04.1: as 20 execuções depois da correção

`pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db --reporter=dot`, uma por
chamada. Cada uma: 42 arquivos de 42 e 1.070 testes de 1.070, com `src/lib/deps-qa.test.ts` verde. Nenhuma falhou.

| # | Início | Duração | # | Início | Duração |
|---|---|---|---|---|---|
| 1 | 03:59:11 | 22,47 s | 11 | 04:04:17 | 21,71 s |
| 2 | 03:59:38 | 30,15 s | 12 | 04:04:44 | 26,14 s |
| 3 | 04:00:16 | 29,42 s | 13 | 04:05:14 | 22,52 s |
| 4 | 04:00:51 | 30,00 s | 14 | 04:05:40 | 26,95 s |
| 5 | 04:01:26 | 24,09 s | 15 | 04:06:11 | 22,57 s |
| 6 | 04:01:54 | 27,08 s | 16 | 04:06:38 | 24,42 s |
| 7 | 04:02:25 | 23,65 s | 17 | 04:07:07 | 22,19 s |
| 8 | 04:02:53 | 25,26 s | 18 | 04:07:33 | 21,88 s |
| 9 | 04:03:23 | 21,10 s | 19 | 04:07:59 | 26,88 s |
| 10 | 04:03:48 | 25,21 s | 20 | 04:08:30 | 22,58 s |

**Paralelismo (decisão 10 da P1):**
- As execuções usam o paralelismo padrão do `vitest run`, o mesmo comando do CI (`pnpm test`, sem opção de workers),
  com o `deps-qa` correndo junto dos outros 41 arquivos de `src/lib` e `src/db`.
- Nesta máquina (8 vCPU) são mais workers que no runner `ubuntu-latest` do CI: carga igual ou maior.
- Não usei `--maxWorkers` para igualar o número exato do CI, porque a opção está fora da regra de comando desta etapa.

**Suíte inteira depois da correção:** `pnpm test` com 378 de 378 arquivos e 8.155 de 8.155 testes, sem falha (04:09:01,
215,49 s).

## Decisões tomadas

- Causa (a) por eliminação sobre a falha registrada no CI (`null`, não outro papel), já que 11 execuções locais não a
  reproduziram. Por isso apliquei as duas correções aceitas, como manda o plano quando a causa não é reproduzida.
- Observador superusuário em vez de ler pelo pool do app. Pela visão do app, `backend_type` vem nulo para a sessão de
  outro papel, e o filtro de `client backend` esconderia o migrator; o CA-04.3 provou isso. Mantive a assinatura
  `papeisDasSessoesDeCliente(pool)` do plano, para que o texto dos testes do passo 2 não mudasse.
- O observador conecta ao banco `postgres`, e não ao banco do teste, para não aparecer na lista que ele mesmo lê.
- O observador usa a URL de administração do contêiner descartável (`inject('pgAdmin')`, a mesma do `test/banco.ts`),
  e não `DATABASE_URL_MIGRATOR`. `src/lib/deps.ts` não mudou, e o app continua montado só com `DATABASE_URL`.
- O diagnóstico ficou pelo pool do app (`sessoesDoBanco(d.pool)`), como nas Interfaces G7. Ele mostra `-` no
  `backend_type` e no `state` das sessões de outro papel, mas mostra o `usename`, que é o que identifica o papel.
- `test/banco.ts` não mudou: a causa não está nele, e sim em ler o `pg_stat_activity` inteiro.

## Pendências

- Desvio do plano, para a revisão (`tech-lead` e `seguranca-aplicacao`): o passo 3 do plano manda filtrar
  `backend_type = 'client backend'` lendo pelo pool do app. Essa correção esconde o migrator. O 02 (3.6) e o 04
  (SB-14) a dão como "aceitável", e isso vale só com um observador que veja o `backend_type` de todos. Sugiro corrigir
  o texto do plano e do SB-14 para a próxima vez.
- A causa fica como **provável**, não reproduzida: a `10-documentacao` deve escrever "causa provável" no CHANGELOG.
  A prova definitiva é o CI do PR desta versão rodando a suíte inteira.
- Paralelismo exato do CI: se o maestro quiser as 20 execuções com o número de workers do runner, falta liberar
  `--maxWorkers=<n>` no `pnpm test`. Não sei de memória a vCPU do runner do repositório privado. As 20 execuções
  daqui tiveram paralelismo igual ou maior.
- T09: `src/lib/deps-qa.test.ts` e `test/sessoes-do-banco.test.ts` já estão no `PISO`. A `06-T09` só confere.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0018-v1` — lista da pasta do pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T08" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md` — localizar a tarefa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "SB-14" -- docs/superpowers/specs/2026-11-13-ws-orquestrador-demandas-sobras-design.md` — controle na spec
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "C-27" -- docs/superpowers/specs/2026-11-13-ws-orquestrador-demandas-sobras-design.md docs/construcao/DEC-DEM-20261111-0018-v1/02-arquiteto-solucoes.md docs/construcao/DEC-DEM-20261111-0018-v1/04-seguranca-aplicacao.md docs/construcao/DEC-DEM-20261111-0018-v1/01-analista-requisitos.md` — hipóteses e controles
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files -- vitest.config.ts .github package.json test` — arquivos de teste e CI
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "\"test" -e "vitest" -e "pg-boss" -e "\"pg\"" -- package.json` — versões
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — árvore limpa no início
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — antes da correção, em segundo plano: 377 arquivos, 8.149 de 8.149
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db --reporter=dot` — antes da correção, 1ª: 1.070 de 1.070
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db --reporter=dot` — antes da correção, 2ª: 1.070 de 1.070
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db --reporter=dot` — antes da correção, 3ª: 1.070 de 1.070
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db --reporter=dot` — antes da correção, 4ª: 1.070 de 1.070
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db --reporter=dot` — antes da correção, 5ª: 1.070 de 1.070
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db --reporter=dot` — antes da correção, 6ª: 1.070 de 1.070
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db --reporter=dot` — antes da correção, 7ª: 1.070 de 1.070
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db --reporter=dot` — antes da correção, 8ª: 1.070 de 1.070
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db --reporter=dot` — antes da correção, 9ª: 1.070 de 1.070
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db --reporter=dot` — antes da correção, 10ª: 1.070 de 1.070
- `git -C /home/deploy/servidor/projetos/estruturaAutonoma grep -n "C-27" -- pedidos/insumos/2026-11-11_orquestrador-sobras-0.1.13.md` — insumo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "deps-qa" -- CHANGELOG.md docs` — falha registrada do CI (`[orquestrador_app, null]`)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export function criarPool" -- src/db` — sem resultado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "criarPool" -- src/db` — assinatura
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/sessoes-do-banco.test.ts src/lib/deps-qa.test.ts --reporter=dot` — FAIL esperado: 3 falharam, 3 passaram (`papeisDasSessoesDeCliente is not a function`)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/deps-qa.test.ts test/sessoes-do-banco.test.ts --reporter=dot` — com a função do plano: 1 falhou (CA-04.3), 5 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/sessoes-do-banco.test.ts --reporter=dot` — diagnóstico temporário pela visão do app: `-/migrator/-`, 1 falhou, 2 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/deps-qa.test.ts test/sessoes-do-banco.test.ts --reporter=dot` — com o observador: 6 de 6
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "T0" -e "const PISO" -e "^};" -- test/estatico/piso-de-assercoes.test.ts` — estrutura do PISO
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" -- src/lib/deps-qa.test.ts` — 8
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep --untracked -c "expect(" -- test/sessoes-do-banco.test.ts` — 5
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" 41108ee -- src/lib/deps-qa.test.ts` — 8
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico test/sessoes-do-banco.test.ts src/lib/deps-qa.test.ts --reporter=dot` — 51 arquivos, 1.123 de 1.123
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db --reporter=dot` — C-27 1/20: 1.070 de 1.070, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db --reporter=dot` — C-27 2/20: 1.070 de 1.070, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db --reporter=dot` — C-27 3/20: 1.070 de 1.070, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db --reporter=dot` — C-27 4/20: 1.070 de 1.070, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db --reporter=dot` — C-27 5/20: 1.070 de 1.070, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db --reporter=dot` — C-27 6/20: 1.070 de 1.070, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db --reporter=dot` — C-27 7/20: 1.070 de 1.070, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db --reporter=dot` — C-27 8/20: 1.070 de 1.070, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db --reporter=dot` — C-27 9/20: 1.070 de 1.070, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db --reporter=dot` — C-27 10/20: 1.070 de 1.070, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db --reporter=dot` — C-27 11/20: 1.070 de 1.070, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db --reporter=dot` — C-27 12/20: 1.070 de 1.070, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db --reporter=dot` — C-27 13/20: 1.070 de 1.070, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db --reporter=dot` — C-27 14/20: 1.070 de 1.070, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db --reporter=dot` — C-27 15/20: 1.070 de 1.070, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db --reporter=dot` — C-27 16/20: 1.070 de 1.070, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db --reporter=dot` — C-27 17/20: 1.070 de 1.070, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db --reporter=dot` — C-27 18/20: 1.070 de 1.070, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db --reporter=dot` — C-27 19/20: 1.070 de 1.070, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db --reporter=dot` — C-27 20/20: 1.070 de 1.070, `deps-qa.test.ts` passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — depois da correção, em segundo plano: 378 de 378 arquivos, 8.155 de 8.155 testes, 0 falha
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "T33" -e "pg_stat_activity" -- scripts/scripts.test.ts test/desempenho/leitura.test.ts src/app/api/saude/route.test.ts` — nenhum lê `pg_stat_activity`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "p95" -e "performance.now" -e "toBeLessThan" -- test/desempenho/leitura.test.ts src/app/api/saude/route.test.ts` — limites de tempo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -l "minimizar" -- src test scripts` — localizar
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -l "resumo-da-fila" -- src test scripts` — localizar
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "toBeLessThan" -e "performance.now" -e "Date.now" -e "_000" -- src/modules/dados-pessoais/minimizar.test.ts src/modules/demandas/resumo-da-fila.test.ts` — limites de tempo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "toBeLessThan" -e "performance.now" -e "timeout" -e "_000" -- scripts/scripts.test.ts` — sem limite de tempo explícito
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- src/lib/deps-qa.test.ts` — diff do caso
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — 2 alterados, 2 novos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 2 arquivos, 10 inserções, 5 remoções

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (não se aplica: a tarefa não cria nem muda rota, Server Action ou job)
