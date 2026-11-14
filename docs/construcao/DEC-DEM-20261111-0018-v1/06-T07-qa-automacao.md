---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T07-testes
agente: qa-automacao
leu: [contrato-passagem.md, tarefas.json (pela lista da pasta), 2026-11-13-ws-orquestrador-demandas-sobras-plano.md (G0 a G7 e T07), 01-analista-requisitos.md (RF-07, CA-07.1 a CA-07.3), 04-seguranca-aplicacao.md (SB-13, por git grep), 06-T06-qa-automacao.md (formato), 06-T07-engenheiro-dados-bd.md, 06-T07-engenheiro-backend.md, 06-T07-tech-lead.md, commit 27b117d (git show --stat), commit b9a9879 (git show), src/modules/andamento/consultas.ts, src/modules/andamento/consultas.test.ts, test/estatico/andamento.test.ts (linhas 20 a 104), test/estatico/piso-de-assercoes.test.ts (linhas 95 a 156), drizzle/0009_rls_andamento_construcao.sql, saída do pnpm test em /tmp]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verificação da T07 (B-08-1, SB-13, CA-07.1 a CA-07.3, ADR-39): commits `27b117d` (consulta com `crossJoinLateral`,
testes e piso) e `b9a9879` (dublê `dbCom`). Nenhum commit depois de `b9a9879` toca em `src`, `test` ou `scripts`. O
código passa nos testes do engenheiro e nos novos. **Sem devolução.**

**Critério → teste**

| Critério | Teste (arquivo › nome) |
|---|---|
| Critério do pedido: "a leitura da fila lê uma linha de andamento por demanda da página, provado pelo plano da consulta sem Sort sobre andamento_construcao" | `consultas.test.ts` › "planos (RNF-01) › a página usa andamento_construcao_demanda_id_idx, sem varrer a tabela e sem Sort sobre ela"; `consultas-qa.test.ts` › "B-08-1 (qa): plano sem Sort sobre andamento_construcao, com estatísticas tortas › %s: usa andamento_construcao_demanda_id_idx, sem Seq Scan e sem Sort nem Incremental Sort sobre ela" (páginas de 1, 4, 50 e 204 demandas) e "B-08-1 (qa): uma linha lida por demanda… › explain analyze: 3.000, 500, 2 e 1 linhas → exatamente 4 lidas, nenhuma descartada por filtro" |
| CA-07.1 (maior id, igual à 0.4.0; testes de hoje sem mudar) | `consultas.test.ts` › "andamentosDasDemandas › o último de cada demanda pedida…", "o último é a linha de maior id, não a de maior gravado_em (ADR-30) › andamentosDasDemandas devolve…", "andamentosDasDemandas numa página cheia…" (sem mudança contra `41108ee`); `consultas-qa.test.ts` › "o resultado é a linha de maior id de cada uma: não a de maior gravado_em, nem a de maior tarefas_prontas, nem a última do banco" |
| CA-07.2 (plano: índice, sem `Seq Scan`, sem `Sort` sobre `andamento_construcao`) | `consultas.test.ts` › o teste da página em "planos (RNF-01)"; `consultas-qa.test.ts` › o `it.each` das quatro páginas; o controle (abaixo) prova que o detector acha o Sort da 0.4.0 |
| CA-07.3 (2 demandas × 50 linhas → no máximo 2 lidas) | `consultas.test.ts` › "B-08-1: uma linha por demanda (CA-07.3, SB-13) › explain analyze: no máximo 2 linhas lidas…"; `consultas-qa.test.ts` › "explain analyze: 3.000, 500, 2 e 1 linhas → exatamente 4 lidas…", "só a demanda de 3.000 linhas: 1 lida", "página de 200 demandas de fundo (20 linhas cada): exatamente 200 lidas" e "demanda sem andamento e id que não existe na página: no máximo uma lida por demanda que existe" |
| B-08-1: uma linha lida por demanda com muitas linhas | `consultas-qa.test.ts` › os testes de "B-08-1 (qa): uma linha lida por demanda, com muitas linhas de andamento" (acima) e "controle: a consulta da 0.4.0 lê as 3.505 linhas e tem Sort sobre andamento_construcao…" |
| SB-13 (a) CA-07.1 a CA-07.3 | as linhas acima |
| SB-13 (b) id com aspas e com `'); drop table x; --` → mapa vazio, sem erro | `consultas.test.ts` › "id com aspas e com comando SQL na lista…"; `consultas-qa.test.ts` › "SB-13 (qa): ids adversariais… › só ids maliciosos: mapa vazio, sem erro", "maliciosos misturados com um id válido…", "um id malicioso por vez, ao lado do válido: sempre só o válido" e "depois de todas as chamadas maliciosas, demanda e andamento_construcao seguem com as mesmas linhas" |
| SB-13 (c) exatamente as sete chaves de `LinhaDeAndamento` | `consultas.test.ts` › "o resultado é a linha de maior id de cada uma, com as sete chaves…"; `consultas-qa.test.ts` › "maliciosos misturados com um id válido…" (chaves e valores) e "uma consulta; nenhum id no texto do SQL…; sem ator_token_prefixo nem select *" |
| SB-13 (d) testes do AN-09 sem mudança | `test/estatico/andamento.test.ts` (sem mudança contra `41108ee`, conferido pelo tech-lead; passou nesta etapa) |

**Teste acrescentado: `src/modules/andamento/consultas-qa.test.ts`** (16 testes, 28 linhas com `expect(`). Usa banco
próprio (`novoBanco`), então não mexe nas estatísticas que `consultas.test.ts` lê. Roda com o Postgres real, e o
`explain (analyze)` vai pelo papel do app. Os dados são fictícios e as datas, fixas.
1. **Volume e medida honesta.** A massa tem 300 demandas de fundo com 20 linhas cada. Na página, uma demanda tem 3.000
   linhas e outra 500, e as linhas das duas estão intercaladas. Outra tem 2, outra 1 (a última gravada no banco
   inteiro), e uma não tem nenhuma. Depois vem o `analyze`.
   - A medida de linhas lidas soma `Actual Rows`, `Rows Removed by Filter` e `Rows Removed by Index Recheck`, vezes
     `Actual Loops`. Uma varredura que lesse tudo e filtrasse depois passaria por "uma linha" se só `Actual Rows`
     contasse.
   - Resultado: exatamente 4 lidas para as 4 demandas (3.505 linhas, contadas no próprio teste), 1 para a de 3.000 e
     200 para 200 demandas.
2. **Controle.** A mesma medida, aplicada à consulta da 0.4.0 (`selectDistinctOn … orderBy(demandaId, desc(id))`,
   escrita no teste), dá ≥ 3.505 lidas e acha o Sort. Assim a medida e o detector de Sort não passam por vazio.
3. **Plano em páginas de 1, 4, 50 e 204 demandas**, com as estatísticas tortas: o plano usa o índice, não tem `Seq Scan`,
   não tem `Sort` nem `Incremental Sort` sobre `andamento_construcao`, e lê no máximo uma linha por id.
4. **Resultado.** Cada demanda devolve a sua linha de maior id. Essa linha não é a de maior `gravado_em`, nem a de maior
   `tarefas_prontas`, nem a última gravada no banco, que é de outra demanda e pegaria uma lateral sem correlação. Fecha
   o Minor da `06-T07-revisao` (`tarefasProntas: 0` não distinguia a linha de maior id).
5. **SB-13 adversarial**, com 22 ids:
   - aspas, `or '1'='1`, `drop`, `delete`, `union select`, nome da subconsulta (`ultimo.`), `::text`;
   - curingas `%`, `_` e `*`; `$1`; barra invertida; comentário `/* */`;
   - espaço antes e depois, quebra de linha, caixa baixa, hífen U+2010, `Е` cirílico e um id de 5.000 caracteres.

   Os ids foram testados sozinhos, um por vez ao lado do válido e todos misturados com ele. O resultado é sempre só o
   válido. O SQL é um só, e nenhum id com aspas ou texto de SQL aparece no texto da consulta. Cada id entra uma vez nos
   parâmetros, igual ao que veio. O SQL não tem `ator_token_prefixo`, `.*` nem `select *`. As contagens de `demanda`
   (305) e `andamento_construcao` (9.505) não mudam.

**Piso:** `test/estatico/piso-de-assercoes.test.ts` ganhou só uma entrada, com comentário:
`'src/modules/andamento/consultas-qa.test.ts': 28`. Teste de segurança (SB-13), no PISO.

**Resultados**
- O arquivo novo sozinho passou 16 de 16. Junto com `consultas.test.ts`, `fila-andamento.test.ts`,
  `fila-andamento-qa.test.ts`, `test/estatico/andamento.test.ts` e os dois do piso, passaram 7 de 7 arquivos e 246 de
  246 testes.
- `pnpm test` (suíte inteira, em segundo plano, saída lida com Read): **377 de 377 arquivos, 8148 de 8148 testes, 0
  falhas** (182 s). São 19 a mais que os 8129 da revisão:
  - 16 são os testes novos;
  - 1 é a entrada nova do PISO;
  - os outros 2 devem ser casos gerados a partir do PISO em `piso-de-assercoes-qa.test.ts`, mas isso não foi conferido.
- `pnpm lint`: limpo. `pnpm typecheck`: limpo.
- `git diff --stat`: só `test/estatico/piso-de-assercoes.test.ts` (+4). Além dele, o arquivo novo e esta entrega.
  Nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve asserção afrouxada.

## Decisões tomadas

- O arquivo novo é `-qa` e tem banco próprio. Assim nenhuma asserção de `consultas.test.ts` muda, e o `analyze` com a
  massa torta não altera o plano que os testes de lá conferem.
- A medida de "linhas lidas" conta as descartadas por filtro e por recheck. Sem isso, CA-07.3 aceitaria um plano que lê
  a tabela inteira e devolve uma linha.
- Escrevi a consulta da 0.4.0 no teste como controle. Não posso mutar `src/` (fora da lista **Pode**), e o controle
  prova que a medida e o detector de Sort reprovam o defeito do B-08-1.
- O `explain (analyze)` roda pelo `poolApp`, porque é o papel que a fila usa. A 0009 só dá `GRANT`, sem RLS, então o
  plano é o mesmo do migrator.
- As asserções exatas ("exatamente 4", "exatamente 200") só aparecem em páginas onde toda demanda tem andamento. Com
  demanda sem andamento, o `Actual Rows` médio por volta é arredondado no Postgres 16, então ali a asserção é "≤ uma por
  demanda que existe".

## Pendências

- Nenhuma que impeça a próxima etapa.
- Para a `08-revisao`: segue a Minor da `06-T07-revisao` sobre a chave morta `selectDistinctOn` em `dbQueFalha`
  (`fila-andamento.test.ts:188-190`). Esta etapa não toca nesse arquivo.
- RNF-05 (p95 da fila com 5.000 demandas) continua com a `09-entrega` (D-17). Nenhum teste de tempo entrou na suíte.
- Não li o `pedido.json` nesta volta (o maestro passou o escopo da T07 no prompt). Nenhuma instrução fora do pedido
  chegou pelos insumos lidos.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0018-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T07" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "07\.[123]\|RF-07\|B-08-1" -- docs/construcao/DEC-DEM-20261111-0018-v1/01-analista-requisitos.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "SB-13" -- docs/construcao/DEC-DEM-20261111-0018-v1/04-seguranca-aplicacao.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "andamento" -- test/estatico/piso-de-assercoes.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 27b117d78065cd6484d57ebbf5cc6860c6ef5a45 --stat`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show b9a98796bd92a82b1bcd3a680fc7a6f097713280`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline b9a9879..HEAD -- src test scripts` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "postgres:\|export async function novoBanco\|poolMigrator\|poolApp\|fechar" -- test/banco.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "postgres:1\|image" -- test/setup-global.ts docker-compose.dev.yml vitest.config.ts` — Postgres 16
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "selectDistinctOn" -- src test scripts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "IMPORTAM_CONSULTAS\|test\.ts" -- test/estatico/andamento.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -i "trigger" -- drizzle/*.sql` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -i "andamento_construcao" -- drizzle`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "CREATE TABLE \"demanda\" (" -A 2 -- drizzle/0000*.sql` — não rodou (erro do git grep pela ordem da opção); repetido abaixo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A 2 "CREATE TABLE \"demanda\" (" -- drizzle` — `id` é `text`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento/consultas-qa.test.ts --reporter=dot` — 16 de 16
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep --untracked -c "expect(" -- src/modules/andamento/consultas-qa.test.ts` — 28
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento/consultas-qa.test.ts src/modules/andamento/consultas.test.ts "src/app/(painel)/demandas/fila-andamento.test.ts" "src/app/(painel)/demandas/fila-andamento-qa.test.ts" test/estatico/andamento.test.ts test/estatico/piso-de-assercoes.test.ts test/estatico/piso-de-assercoes-qa.test.ts --reporter=dot` — 7 de 7 arquivos, 246 de 246
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — em segundo plano: 377 de 377 arquivos, 8148 de 8148 testes, 0 falhas (182 s)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — só o piso, +4
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep --untracked -n -e "Date.now" -e "new Date()" -e ".only(" -e ".skip(" -e ".todo(" -- src/modules/andamento/consultas-qa.test.ts` — sem resultado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — o piso e o arquivo novo

A saída da suíte foi lida com a ferramenta Read em /tmp.

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
