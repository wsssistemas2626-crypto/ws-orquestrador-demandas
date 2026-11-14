---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T03-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seções 5 a 7 e 12), docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md (G0 a G7 e T03), 06-T03-engenheiro-dados-bd.md, commit 79f65116cd2a7cc8e7c434cacf9f8243a6e2fff6, 02-arquiteto-solucoes.md (linhas da coluna e ADR-37), 04-seguranca-aplicacao.md (SB-09), src/modules/pacotes-decisao/consultas.ts (tipos, selecao e vistaDe), src/modules/versoes.ts, src/modules/demandas/consultas.ts (linhas 140 a 164), src/modules/demandas/resumo-da-fila.ts (linhas 30 a 48), src/modules/limites.ts (linhas 76 a 100)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T03 (coluna `pacote_decisao.caminhos_com_nome_na_criacao` e migration `0010`; SB-10, SB-07 d, RNF-08,
ADR-37 na forma), commit `79f6511`. **Sem problema Critical ou Important. A passagem segue.**

**O que foi conferido**

1. **Nenhuma migration da `main` editada.** `git diff 41108ee --stat -- drizzle` mostra só `drizzle/0010_magical_cammi.sql`
   (novo), `drizzle/meta/0010_snapshot.json` (novo) e `drizzle/meta/_journal.json` (+7, só a entrada `idx 10`). O
   comando da G4 (superfícies congeladas, inclusive `drizzle/000[0-9]_*.sql`, os snapshots `000[0-9]` e
   `src/db/privilegios.ts`) saiu **vazio**. O snapshot `0010` encadeia no `0009` (`prevId` do 0010 = `id` do 0009,
   `f6ab00a6-…`) e tem exatamente uma entrada `"name":` a mais que o `0009` (399 contra 398): só a coluna.
2. **Migration gerada, aditiva e sem custom.** `drizzle/0010_magical_cammi.sql:1` é só
   `ALTER TABLE "pacote_decisao" ADD COLUMN "caminhos_com_nome_na_criacao" text[];` — anulável, sem padrão, sem CHECK,
   sem GRANT, nome gerado (sem `rls_`). Bate com 02 (linhas 52 e 191) e com o passo 3 da T03. Não reescreve dado
   existente: `alteram_dado: false` esperado no ensaio da `09-entrega`.
3. **Esquema.** `src/db/schema/decisao.ts:52-55`: uma coluna (`text().array()`) depois de `criadaEm`, com o comentário do
   plano, palavra por palavra.
4. **A coluna não vaza para vista de agente nem saída (SB-09).** O nome TS `caminhosComNomeNaCriacao` só aparece em
   `src/db/schema/decisao.ts:55` em `src`, `test`, `scripts` e `e2e`; o nome SQL só nos testes da tarefa e na `0010`.
   Nenhum `row_to_json`/`to_jsonb` de `pacote_decisao` nem `select().from(pacoteDecisao)` em código de produção (os
   dois `select()` sem campos são de teste: `src/db/schema/dominio.test.ts:675`,
   `src/modules/pacotes-decisao/criar.test.ts:77`); nenhum `getTableColumns(pacoteDecisao` (busca declarada na entrega
   do engenheiro). Conferido com Read: `PacoteDecisaoVista` é um tipo escrito chave a chave
   (`src/modules/pacotes-decisao/consultas.ts:44-77`), não derivado da tabela; os usos de `typeof pacoteDecisao` são
   uniões de tabela que só escolhem campos: `src/modules/versoes.ts:11` e `:27` (`max(versao)`),
   `src/modules/demandas/consultas.ts:143` e `:146` (`autorTipo` e `autorId` na junção),
   `src/modules/demandas/resumo-da-fila.ts:35` e `:40` (`exists` com `id`) e `src/modules/limites.ts:80` e `:84`
   (`count()`). Todas as outras leituras de `pacote_decisao` escolhem campo a campo. A única que lê a linha inteira,
   `selecao` em `src/modules/pacotes-decisao/consultas.ts:90` (`p: pacoteDecisao`), entrega a vista por `vistaDe`
   (linhas 146 a 188), campo a campo, sem `...p`: a chave não chega a `PacoteDecisaoVista`. O evento
   `pacote_decisao_criado` (`criar.ts:187`) monta o `depois` campo a campo. `entrada-agente.ts` está na G4 e não mudou.
5. **Não guarda o nome nem hash dele (decisão da P1, ADR-37).** A coluna é `text[]` de caminhos; o comentário do
   esquema registra "só nomes de campo de lista fechada, sem o nome nem hash dele"; nenhum código grava a coluna nesta
   tarefa (a gravação é da T04, só em `criar.ts`; o formato é conferido na leitura pela lista de permissão da 02,
   linha 191, na T05). Nada na T03 copia `solicitante_nome`.
6. **App só inclui (SB-07 d).** `src/db/imutabilidade.test.ts:38` (G5) e o `it.each` de
   `src/db/schema/caminhos-da-criacao.test.ts:83-91` provam 42501 no `UPDATE` da coluna pelo papel do app, com a tabela
   igual antes e depois; o caso 3 (linhas 66 a 81) prova o INSERT pelo `GRANT SELECT, INSERT` de tabela da `0003`.
7. **G5 respeitada.** `test/estatico/migration-0008.test.ts:22-27`: sai a lista inteira fixa e o `entries[9]`, entram
   os dois `find` por índice, como a G5 manda; contagem de `expect(` igual (6). `src/db/imutabilidade.test.ts`: só a
   linha nova do `it.each` e o comentário; `expect(` igual (23). `test/estatico/piso-de-assercoes.test.ts:110-112`: só
   acréscimo, com `caminhos-da-criacao.test.ts: 9` e `migration-0010.test.ts: 4`, que conferem com o `git grep -c`.
8. **TDD.** A entrega mostra a falha antes do código (diário até 9, coluna inexistente, 42703 no lugar de 42501, 20
   colunas em vez de 21). A exceção do `migration-0008.test.ts` (guarda de forma que nasce verde) está nomeada, como a
   G3.1 pede. Os dois testes novos falhariam sem o código.
9. **Dados fictícios.** `DEM-20261114-0801`, "Demanda ficticia", "Pessoa Ficticia", `u-ficticio`; data fixa
   (`QUANDO`), sem relógio real; nenhum segredo nem valor de `.env`.
10. **Comandos aqui:** os 5 arquivos da tarefa com o piso, 131 de 131; `pnpm lint` e `pnpm typecheck` limpos. A suíte
    inteira (360 arquivos, 7907 testes) foi rodada pelo engenheiro e volta na `06-T03-testes`.

**Desvios do engenheiro, aceitos**
- Dois `UPDATE` a mais no caso 4 (`where … is null` e `= null`): só somam cobertura do ataque "preencher depois" e
  "apagar a marcação" do SB-07 (d); nenhuma asserção do plano saiu.
- `it.each<[string, unknown[]]>`: ajuste só de tipo, sem efeito no comportamento.

**Pareceres (Minor, não bloqueiam)**

- `src/modules/pacotes-decisao/consultas.ts:90` — problema: `selecao` lê `p: pacoteDecisao` inteiro, então a partir da
  T04 o valor da coluna passa a vir do banco em toda leitura de DEC, embora `vistaDe` o descarte. Razão: hoje não vaza
  (vista campo a campo), mas qualquer `...l.p` futuro o exporia; o arquivo está congelado pela G4, então não se mexe
  aqui. Caminho: o teste (a) do SB-09 na T04 (chaves de `GET /api/pacotes-decisao/:decId` e da listagem, pessoa e os
  quatro agentes, a partir da `MATRIZ`) é a trava; a revisão da T04 confere que ele existe e entra no `PISO`.

## Decisões tomadas

- Status `pronto`: o checklist da seção 12 está cumprido e não há Critical nem Important.
- O parecer sobre `selecao` fica Minor e sem mudança de código: `consultas.ts` é superfície congelada (G4) e o SB-09 (a)
  da T04 cobre o risco por teste.
- Os dois `UPDATE` a mais e o tipo explícito do `it.each` são aceitos: endurecem o teste sem afrouxar nada (G3.2).
- Na 2ª volta, a conclusão sobre tipos derivados da tabela (`typeof pacoteDecisao`) foi refeita com Read, arquivo a
  arquivo, sem comando novo; a conclusão não mudou.

## Pendências

- Para a revisão da T04: conferir que o teste do SB-09 (a) percorre as leituras de DEC a partir da `MATRIZ` e entra no
  `PISO` (parecer Minor acima).
- Para a `09-entrega`: `alteram_dado: false` e `volta_sem_restaurar: false` esperados no ensaio (SB-10).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files docs/construcao/DEC-DEM-20261111-0018-v1` — 17 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "### Task 3\|### T03\|## T03\|Tarefa 3\|T03" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md` — T03 na linha 701
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 79f65116cd2a7cc8e7c434cacf9f8243a6e2fff6~1 79f65116cd2a7cc8e7c434cacf9f8243a6e2fff6 --stat` — 11 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 41108ee -- drizzle` — só a 0010, o snapshot 0010 e a entrada do diário
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 41108ee --stat -- drizzle` — 3 arquivos, 2912 inserções, 0 remoções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 79f65116cd2a7cc8e7c434cacf9f8243a6e2fff6 -- drizzle/meta/_journal.json src/db/imutabilidade.test.ts src/db/schema/caminhos-da-criacao.test.ts src/db/schema/decisao.ts test/estatico/migration-0008.test.ts test/estatico/migration-0010.test.ts test/estatico/piso-de-assercoes.test.ts` — diff lido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 41108ee -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/lib/rota.ts src/db/transacao.ts src/db/privilegios.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/pedido-construcao/pendentes.ts src/modules/pedido-construcao/entregar.ts src/modules/pedido-construcao/receber.ts src/modules/andamento/registrar.ts src/modules/limites.ts src/modules/pacotes-decisao/consultas.ts src/modules/demandas/consultas.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/agentes/entrada-agente.ts next.config.ts 'drizzle/000[0-9]_*.sql' 'drizzle/meta/000[0-9]_snapshot.json'` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "prevId\|\"id\": \"" -- drizzle/meta/0009_snapshot.json drizzle/meta/0010_snapshot.json` — 0010 encadeado no 0009
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "\"name\":" -- drizzle/meta/0009_snapshot.json drizzle/meta/0010_snapshot.json` — 398 e 399
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "from(pacoteDecisao)" -- src` — 13 linhas, todas campo a campo exceto `selecao` e dois testes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "SB-09" -- docs/construcao/DEC-DEM-20261111-0018-v1/04-seguranca-aplicacao.md` — 7 linhas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "function paraVista\|\.\.\.p\b\|\.\.\.l\.\|\.\.\.linha\|: Linha\|p\.\(id\|criadaEm\|resumoExecutivo\)" -- src/modules/pacotes-decisao/consultas.ts` — vista campo a campo, sem espalhamento
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "returning\|depois\|\.\.\." -- src/modules/pacotes-decisao/criar.ts` — `depois` campo a campo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A3 "\.select(" -- src/modules/demandas/consultas.ts src/modules/pacotes-decisao/desatualizado.ts src/modules/pacotes-decisao/substituido.ts src/modules/pedido-construcao/pendentes.ts` — todas campo a campo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "caminhosComNomeNaCriacao" -- src test scripts e2e` — só o esquema
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "caminhos_com_nome_na_criacao" -- src test scripts e2e drizzle/0010_magical_cammi.sql` — só testes da tarefa e a 0010
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "select().from(pacoteDecisao)\|toEqual\|toMatchObject" -- src/db/schema/dominio.test.ts` — `toMatchObject` parcial na linha 676
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -i "from pacote_decisao" -- src scripts` — só testes, com colunas nomeadas ou contagem
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "to_jsonb\|row_to_json" -- src scripts` — só testes, nenhum sobre `pacote_decisao` fora da tarefa
- `git -C /home/deploy/servidor/projetos/estruturaAutonoma grep -n "^## " -- docs/construcao/padrao-tecnico.md` — 12 seções
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/migration-0010.test.ts src/db/schema/caminhos-da-criacao.test.ts src/db/imutabilidade.test.ts test/estatico/migration-0008.test.ts test/estatico/piso-de-assercoes.test.ts --reporter=dot` — 5 de 5 arquivos, 131 de 131 testes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" -- src/db/schema/caminhos-da-criacao.test.ts test/estatico/migration-0010.test.ts test/estatico/migration-0008.test.ts src/db/imutabilidade.test.ts` — 9, 4, 6 e 23
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "hash" -- docs/construcao/DEC-DEM-20261111-0018-v1/parada-P1.md` — nenhuma linha
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -i "sem o nome\|caminhos marcados\|caminhos_com_nome" -- docs/construcao/DEC-DEM-20261111-0018-v1/parada-P1.md docs/construcao/DEC-DEM-20261111-0018-v1/02-arquiteto-solucoes.md` — ADR-37 e a forma da coluna na 02

O git grep com $ no padrão, da 1ª volta, está no registro (bloqueado e ajuste da 06-T03-revisao em 14/11).

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
