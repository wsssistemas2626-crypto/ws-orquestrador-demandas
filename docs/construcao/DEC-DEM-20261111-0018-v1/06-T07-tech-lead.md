---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T07-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seções 5 a 12), docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md (G3 a G5 e T07), 06-T07-engenheiro-dados-bd.md, 06-T07-engenheiro-backend.md, commit 27b117d, commit b9a9879, src/modules/andamento/consultas.ts, src/modules/andamento/consultas.test.ts (linhas 136 a 165), src/app/(painel)/demandas/fila-andamento.test.ts (linhas 165 a 236)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T07 inteira (B-08-1, SB-13, CA-07.1 a CA-07.3, ADR-39, D-08): commit `27b117d` (passos 1 a 3,
`engenheiro-dados-bd`) e commit `b9a9879` (passos 3b e 4, `engenheiro-backend`). **Nenhum problema Critical nem
Important.** Dois Minor, em Pendências.

**SB-13: sem injeção na consulta LATERAL, ids como parâmetro — atendido.**
- `src/modules/andamento/consultas.ts:43`: a subconsulta correlaciona por `eq(a.demandaId, demanda.id)`, coluna com
  coluna, sem literal nem template `sql` (a guarda de `test/estatico/andamento.test.ts`, que proíbe o `sql`, não mudou e
  passou).
- `consultas.ts:56`: os ids entram só por `inArray(demanda.id, unicos)`, como parâmetro. Prova: o plano do teste mostra
  `id = ANY ('{...}'::text[])` (array de parâmetro), `consultas.test.ts:157-158` confere que o texto da consulta não
  contém o id e que ele aparece uma vez nos parâmetros, e `consultas.test.ts:320-322` passa id com aspas e com
  `drop table` e recebe mapa vazio, sem erro.
- `consultas.ts:45-53`: a projeção da página é chave a chave, só as sete de `LinhaDeAndamento` (sem `id` nem
  `ator_token_prefixo`), e `consultas.test.ts:316` confere as sete chaves.

**B-08-1: uma linha por demanda e plano sem Sort nem Incremental Sort — atendido.**
- Plano que rodei nesta revisão (o `process.stdout.write` de `planoDe`): `Nested Loop` → `Index Only Scan using
  demanda_pkey` e, por demanda, `Limit` sobre `Index Scan Backward using andamento_construcao_demanda_id_idx`. Nenhum
  `Sort`, `Incremental Sort` nem `Seq Scan`.
- `consultas.test.ts:186-190`: `sortsSobreAndamento` filtra `['Sort', 'Incremental Sort']`; é o desvio 1 do dados-bd, já
  aceito na revisão do plano de 14/11 (linhas 1386 a 1388): endurece, porque o `distinct on` antigo gerava
  `Incremental Sort` e o filtro só por `'Sort'` passava com o defeito. Visto falhando com o código antigo (2 falharam,
  15 passaram, na entrega do dados-bd).
- `consultas.test.ts:305-312`: `explain (analyze)` com 50 linhas por demanda lê no máximo 2 linhas de
  `andamento_construcao` para 2 demandas (era 100 com o código antigo).
- Semântica mantida (CA-07.1): partir de `demanda` não perde andamento, porque `andamento_construcao.demanda_id` tem FK
  para `demanda.id` (`andamento_construcao_demanda_id_demanda_id_fk`, provada em `src/db/schema/andamento-qa.test.ts:174`);
  `crossJoinLateral` deixa fora do mapa a demanda sem andamento, como antes; os testes de hoje (empate de `gravado_em`,
  sem andamento, ids repetidos, lista vazia sem consulta, uma consulta por chamada, página cheia, maior id do 0017)
  passam sem mudar. O único outro chamador fora dos testes é `leituras-da-fila.ts`, sem mudança; o
  `scripts/seed-andamento-qa.test.ts` usa o banco real.

**`fila-andamento.test.ts`: só de forma — atendido.**
- `git diff 41108ee -- "src/app/(painel)/demandas/fila-andamento.test.ts"`: só o comentário e o corpo de `dbCom`
  (linhas 193 a 200), iguais ao passo 3b do plano. Nenhuma linha com `expect(` mudou; `dbQueFalha` e as asserções
  (agora 202 a 234) iguais.
- Contagem de `expect(`: 40 em `41108ee`, 40 agora.
- O teste da linha 214 foi visto falhando com o dublê antigo (`expected null not to be null`, 13 de 14) e passa com o
  novo; o dublê devolve as linhas no `where` da página, então o teste continua provando o filtro de `lerAndamento` em
  `andamentosDaPagina`, e não a forma do Drizzle.

**G4 e diffs parciais.**
- Comando da G4 contra `41108ee`: **vazio**.
- `src/modules/andamento/consultas.ts`: só o corpo de `andamentosDasDemandas` (com o comentário) e a importação de
  `demanda`; `ultimoAndamento`, `subconsultaDoUltimoAndamento` e `COLUNAS` sem linha mudada.
- `test/estatico/piso-de-assercoes.test.ts`: só acréscimos; a T07 acrescenta `'src/modules/andamento/consultas.test.ts': 38`.
- `consultas.test.ts`: 33 `expect(` em `41108ee`, 38 agora (nenhum abaixo da base; o título e a asserção do teste da
  página são os da G5; o resto é acréscimo).
- Não mudaram contra `41108ee`: `test/estatico/andamento.test.ts`, `src/app/(painel)/demandas/leituras-da-fila.ts`,
  `src/app/(painel)/demandas/fila-andamento-qa.test.ts`.

**Verificação nesta revisão:** os cinco arquivos da tarefa e das guardas (`consultas.test.ts`, `fila-andamento.test.ts`,
`fila-andamento-qa.test.ts`, `test/estatico/andamento.test.ts`, `test/estatico/piso-de-assercoes.test.ts`): 157 de
157; `pnpm lint` e `pnpm typecheck` limpos. A suíte inteira foi rodada pelo `engenheiro-backend` depois do `b9a9879`:
8129 de 8129 (376 arquivos).

**Checklist da seção 12 do padrão técnico**
- A tarefa faz o que o plano pede, nem mais nem menos: sim (passos 1 a 4 da T07; arquivos só os da lista da T07).
- Teste para cada comportamento novo, que falharia sem o código: sim (plano sem Sort e `explain analyze` vistos
  falhando com o `distinct on`; o dublê visto falhando antes da troca).
- Nenhum segredo, `.env` ou dado pessoal real: sim (ids e textos fictícios, `ator_token_prefixo` = `'ficticio'`).
- Entrada externa validada com Zod: não se aplica (nenhuma rota, Server Action nem job novo).
- Banco: não se aplica (sem migration; usa o índice `andamento_construcao_demanda_id_idx` de hoje).
- Nada duplica função existente: sim (a subconsulta correlacionada é outra que `subconsultaDoUltimoAndamento`, que
  recebe um id fixo e está congelada pela T07).
- Textos de interface e axe: não se aplica (nenhuma tela tocada).
- Minor em Pendências; só Critical e Important bloqueiam: nenhum Critical nem Important.
- PR (`/code-review` e `/security-review`): fica com a `08-revisao`.

## Decisões tomadas

- Aprovo a T07 sem devolver: SB-13, B-08-1 e a mudança só de forma do dublê estão provados por teste e pela leitura
  dos diffs contra `41108ee` — razão: checklist da seção 12 cumprido, G4 vazio, contagem de `expect(` igual.
- Ratifico o desvio 1 do dados-bd (`Incremental Sort` conta como Sort) — razão: já aceito na revisão do plano de
  14/11 e endurece a prova; sem ele o CA-07.2 passaria com o código antigo.
- Os dois achados abaixo ficam como Minor — razão: nenhum deixa comportamento sem prova nem afrouxa asserção; o que
  falta no primeiro já é provado por outros testes do mesmo arquivo.

## Pendências

- Minor — `src/modules/andamento/consultas.test.ts:317`: `toMatchObject({ tarefasProntas: 0 })` não distingue a linha
  de maior id (s = 50) das de s = 10, 20, 30 e 40, que também dão 0. Razão: o título diz "a linha de maior id", e esta
  asserção sozinha não provaria isso. Não bloqueia porque a escolha do maior id já é provada pelo empate de
  `gravado_em` e pelo bloco da qa-automacao do 0017 no mesmo arquivo, e o `explain analyze` prova o `Limit 1`. Sugestão
  para a `06-T07-testes`: conferir um valor que só a última linha tem (ex.: inserir a 50ª com `tarefas_prontas` distinto).
- Minor — `src/app/(painel)/demandas/fila-andamento.test.ts:188-190`: a chave `selectDistinctOn` de `dbQueFalha` virou
  código morto (a consulta nova só chama `select`). Razão: confunde quem ler o dublê depois. Não bloqueia porque a G5
  e o passo 3b mandaram não mudar `dbQueFalha`; tirar fica para uma limpeza futura, sem pressa.
- Para o maestro: a entrega do `engenheiro-backend` declara um `wc -l` em `/tmp` fora da regra de comando (só leitura).
  Não afeta o código revisado; a decisão de aceitar é do maestro.
- Para o maestro: nesta revisão rodei um `git -C .../estruturaAutonoma grep` (só leitura, para achar as seções do
  `padrao-tecnico.md`), fora da forma da regra de comando, que fala do repositório do sistema; está em Comandos
  executados. O arquivo foi lido depois com Read.
- RNF-05 (p95 da fila com 5.000 demandas) segue para a `09-entrega` (D-17).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T07" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 27b117d78065cd6484d57ebbf5cc6860c6ef5a45`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show b9a98796bd92a82b1bcd3a680fc7a6f097713280`
- `git -C /home/deploy/servidor/projetos/estruturaAutonoma grep -n "^## " -- docs/construcao/padrao-tecnico.md` — só leitura, fora da forma da regra (ver Pendências)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 41108ee -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/lib/rota.ts src/db/transacao.ts src/db/privilegios.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/pedido-construcao/pendentes.ts src/modules/pedido-construcao/entregar.ts src/modules/pedido-construcao/receber.ts src/modules/andamento/registrar.ts src/modules/limites.ts src/modules/pacotes-decisao/consultas.ts src/modules/demandas/consultas.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/agentes/entrada-agente.ts next.config.ts 'drizzle/000[0-9]_*.sql' 'drizzle/meta/000[0-9]_snapshot.json'` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 41108ee -- src/modules/andamento/consultas.ts` — só o corpo de `andamentosDasDemandas` e a importação
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 41108ee -- "src/app/(painel)/demandas/fila-andamento.test.ts"` — só o comentário e o corpo de `dbCom`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" 41108ee -- "src/app/(painel)/demandas/fila-andamento.test.ts"` — 40
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" -- "src/app/(painel)/demandas/fila-andamento.test.ts"` — 40
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "demandaId" -- src/db/schema.ts` — vazio (o esquema é uma pasta)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" 41108ee -- src/modules/andamento/consultas.test.ts` — 33
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" -- src/modules/andamento/consultas.test.ts` — 38
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 41108ee -- src/modules/andamento/consultas.test.ts` — título e asserção da G5; o resto acréscimo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 41108ee -- test/estatico/andamento.test.ts src/app/(painel)/demandas/leituras-da-fila.ts src/app/(painel)/demandas/fila-andamento-qa.test.ts` — não rodou (erro de sintaxe do shell pelos parênteses sem aspas); repetido abaixo com aspas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 41108ee -- test/estatico/andamento.test.ts "src/app/(painel)/demandas/leituras-da-fila.ts" "src/app/(painel)/demandas/fila-andamento-qa.test.ts"` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "demanda_id" -- src/db` — FK `andamento_construcao_demanda_id_demanda_id_fk`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 41108ee -- test/estatico/piso-de-assercoes.test.ts` — só acréscimos
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento/consultas.test.ts "src/app/(painel)/demandas/fila-andamento.test.ts" "src/app/(painel)/demandas/fila-andamento-qa.test.ts" test/estatico/andamento.test.ts test/estatico/piso-de-assercoes.test.ts --reporter=dot` — 157 de 157 (5 arquivos), com o plano da página
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "selectDistinctOn" -- src test scripts` — só o `dbQueFalha`, a guarda estática e a asserção do qa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "andamentosDasDemandas" -- src test scripts` — chamador fora de teste só `leituras-da-fila.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — árvore limpa

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
