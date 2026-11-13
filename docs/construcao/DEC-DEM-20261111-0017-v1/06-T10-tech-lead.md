---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T10-revisao
agente: tech-lead
leu: [tarefas.json, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (G3, G4, G5, G6 D-07 e D-11, T10), 06-T10-engenheiro-backend.md, commit 84a0b254fa3ef284acb680650da19e8c766a8da8, padrao-tecnico.md (seção 12), contrato-passagem.md, scripts/seed-andamento.test.ts, src/modules/andamento/registrar.ts, src/modules/andamento/regras.ts (exportações e decidirPorStatus), src/modules/demandas/transicoes.ts (AUTOMATICAS_DO_CONSTRUIR, transicaoDoConstruir, mudarStatusPeloConstruir), e2e/fila-contadores.spec.ts (linhas 150 a 174)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T10 (seed fictício com as oito demandas do andamento), commit `84a0b25`. Nenhum Critical nem Important: a
tarefa passa. Os pareceres abaixo são Minor e vão para Pendências.

**O que foi conferido**

- Escopo: o commit só muda `scripts/seed-ficticio.ts`, `scripts/seed-andamento.test.ts` (novo) e os três testes do seed
  da G5, mais a entrega e o `passagens.jsonl`. Nada em `src/`, `test/`, `e2e/`, `drizzle/` nem configuração.
- G4: o `git diff 0ac099a` das superfícies congeladas saiu vazio. Árvore de trabalho limpa.
- Testes: `scripts` e `test/estatico` com 50 arquivos e 1112 testes passando (inclui as guardas
  `test/estatico/andamento*.test.ts`, que ficam verdes com o seed importando só `andamento/regras.ts`); `typecheck` e
  `lint` limpos. A entrega mostra o teste novo falhando antes do código (17 de 18).
- Tabela da T10: as oito chaves, títulos, tipo `melhoria`, `sob_medida`, autoria `sem2fa`, contexto preenchido, ESP, RSK
  e DEC da `sem2fa`, DEC `cto` aprovado pela "cto" na opção A, pedido gerado, entregue e recebido nas seis primeiras
  (D-11), e o status final e os passos de cada uma conferidos por `it.each` em `seed-andamento.test.ts:201`.
- D-07 e AN-15: o andamento entra direto, pelo ator `CONSTRUIR_DO_SEED` (`integracao`/`construir`, prefixo `ficticio`,
  `scripts/seed-ficticio.ts:447`), com `travarDemanda`, `mudarStatusPeloConstruir` com a transação do seed (G3.7), o
  `insert` com `gravadoEm: deps.relogio.agora()` e o `andamento_registrado` por `marcoDoEvento`, só quando
  `mudancaDeMarco` — as mesmas peças de `src/modules/andamento/registrar.ts:72-96`. Nenhum token criado: o teste confere
  `token_servico` vazio, `ficticio` como único prefixo em `evento` e `andamento_construcao`, e nada de `wsod_` no log e
  nos eventos (`seed-andamento.test.ts:312`). G3.10: o log não leva título, decId nem fase (`seed-andamento.test.ts:321`).
- C-36: 28 demandas e 33 versões da `sem2fa` na hora do seed, conferidas (`seed-andamento.test.ts:190`).

**Ponto 1 — `andamentoConcluido` com a "cto" levando a `em_construcao` (decisão fora do texto do plano): aceita.**
O texto da T10 manda, para as seis primeiras, só a "cto" levar a `aprovada`, mas a tabela da T10 pede `em_construcao`
como estado final da C. `AUTOMATICAS_DO_CONSTRUIR` (`src/modules/demandas/transicoes.ts:103-106`) só tem
`em_construcao` (de `aprovada`) e `cancelado` (de `em_construcao`): `construido` não muda status (A1), e o serviço real,
por `decidirPorStatus` (`src/modules/andamento/regras.ts:48-51`), gravaria o mesmo `construido` deixando a demanda em
`aprovada`. As saídas seriam: mudar a tabela (fora do alcance do engenheiro), acrescentar um passo `em_construcao` do
construir (daria dois `andamento_registrado` na C, contra o "B, C, E: 1" do plano), ou a "cto" mudar o status, como o
plano já faz na `emConstrucaoSemAndamento`. A terceira é a única que cumpre a tabela e a contagem; está declarada em
"Decisões tomadas" da entrega, comentada no código (`seed-ficticio.ts`, tipo `DemandaDoAndamento`) e conferida no
teste (`DA_PESSOA.andamentoConcluido`, `seed-andamento.test.ts:88-91`, e `doConstruir: []`). A tabela do plano marca
"(pelo construir)" só na A e na D, então não há contradição com a C.

**Ponto 2 — mudanças da G5 nos testes existentes: dentro da G5, sem afrouxar.**
Contei os `expect(` de cada trecho do diff: nenhum saiu.

| Trecho | Mudança | Parecer |
|---|---|---|
| `scripts/scripts.test.ts:371` | 28 → 36 | total, G5 |
| `scripts/scripts.test.ts:429` | as oito saem do filtro das "demandas próprias do e2e" (sem versão, em Nova) | lista das oito, G5. As oito têm versões e status próprios, como as cinco da T15 que já saíam; o `toHaveLength(18)` das de antes continua, e o estado das oito é conferido em `seed-andamento.test.ts`. Sem isso o teste mentiria sobre elas |
| `scripts/scripts.test.ts:477` | `todos` 23 → 31 | total, G5 |
| `scripts/scripts.test.ts:581` | `[TOTAL, 5, 5, 5, 3]` → `[TOTAL, 13, 13, 13, 11]` | +8 ESP, RSK, DEC e aprovação: confere com o seed |
| `scripts/scripts.test.ts:869` | 5 → 13 DECs; o resto (aviso pendente e job por DEC) igual | total, G5 |
| `scripts/scripts.test.ts:1069` | `TOTAL - 5` → `TOTAL - 13` no terceiro aviso | total, G5; a premissa (as oito vêm depois das cinco) passou a ser conferida no `-qa` |
| `scripts/scripts.test.ts:1092-1093` | 5 → 13 DECs, 3 → 11 aprovações | total, G5 |
| `scripts/seed-integracoes.test.ts:69-70` | 28 → 36 e o título | total, G5 |
| `scripts/seed-integracoes-qa.test.ts:119-147` | as oito são as últimas e as cinco da T15 vêm imediatamente antes; DECs na ordem ganham os oito no fim | lista, G5. A asserção ficou mais forte: duas `expect` viraram três, e a ordem das oito passou a ser conferida |

`src/db/sementes.test.ts` e `MENSAGENS_SEED` não precisaram mudar (a mensagem já usa `TOTAL_DEMANDAS_DO_SEED`). A
lista de pendentes não mudou (D-11), conferida em `seed-andamento.test.ts:297`.

**Pareceres (todos Minor)**

1. `scripts/seed-ficticio.ts:587-614` — o bloco de trava, transição, `insert` e `andamento_registrado` repete
   `src/modules/andamento/registrar.ts:62-96`. Razão: é o que o D-07 manda (o serviço não aceita a transação de quem
   chama), e extrair uma peça comum mexeria em `src/modules/andamento/**`, fora da tarefa e sob as guardas da G3.7;
   o risco é o seed divergir se o serviço mudar. Mitigado: `seed-andamento.test.ts` confere o resultado no formato do
   serviço (linhas, `antes`/`depois` chave a chave, `status_alterado` do construir, `lerAndamento`). Registrar como
   dívida pequena; não bloqueia.
2. `scripts/seed-ficticio.ts:589-598` — a ordem é transição antes do `insert`; no serviço é `insert` antes da transição
   (`registrar.ts:72-82`). Razão para não bloquear: o plano escreve essa ordem para o seed, a tabela
   `andamento_construcao` não gera evento, e a ordem dos eventos (`status_alterado` antes de `andamento_registrado`) é
   a mesma do serviço. Só fica anotado para quem comparar os dois.
3. `scripts/scripts.test.ts:429` — a variável `daT15` passou a conter também as oito da T10. Razão: o nome não diz mais
   o que guarda (`foraDaConferencia` diria). Só legibilidade.
4. `e2e/fila-contadores.spec.ts:4` e `e2e/fila-origem-qa.spec.ts:86` — os comentários ainda dizem "28 no banco novo".
   Razão: o seed passou a 36. São comentários, e o e2e não está na lista do engenheiro-backend: fica com a T12 a T14.

## Decisões tomadas

- Aceita a `andamentoConcluido` com a "cto" levando a `em_construcao`: é o único caminho que cumpre o estado final e a
  contagem de `andamento_registrado` da tabela da T10 sem mudar a tabela de transições.
- Aceitas as mudanças em `scripts/scripts.test.ts`, `scripts/seed-integracoes.test.ts` e
  `scripts/seed-integracoes-qa.test.ts`: são totais e listas das oito (G5), nenhuma asserção saiu e a do `-qa` ficou
  mais forte.
- Aceito o andamento gravado direto pelo ator `construir` de prefixo `ficticio`, sem token: é o D-07 e o AN-15, e o
  teste prova que nenhum token nasce e que nenhum prefixo além de `ficticio` aparece.
- A repetição do bloco do serviço no seed fica como Minor, não Important: está no plano (D-07) e o teste cobre a
  divergência.
- `scripts/seed-andamento.test.ts` fora do `PISO`: a G3 só pede o piso nas T01, T02, T03, T07, T08 e T09.

## Pendências

- Dois comandos fora da lista **Pode**, ambos só de leitura e sem efeito, rodados por engano e declarados abaixo: (a)
  `git -C <repo> grep` apontando para `padrao-tecnico.md` da estruturaAutonoma (fora do repositório; o git recusou com
  erro 128 e o arquivo foi lido em seguida pela ferramenta Read); (b) um `git -C <repo> grep` com `\|` (alternativa em
  regex num comando só) sobre `e2e/fila-contadores.spec.ts`. Nenhum dos dois mudou nada.
- Para a T12 a T14: as oito novas são as mais recentes do seed, então a primeira página da fila (e o
  `?limit=8` de `e2e/fila-contadores.spec.ts:152`) passa a mostrar demandas em `em_construcao` com selo de fase; e a
  `em_construcao` da `andamentoConcluido` e da `emConstrucaoSemAndamento` aparece no histórico como mudança da "cto", não
  do construir. Os comentários "28 no banco novo" dos e2e ficam com elas (parecer 4).
- Para a `10-documentacao`: `docs/manual-tecnico/10-configuracao-e-scripts.md` ainda diz 28 demandas no seed (já
  apontado pelo engenheiro).
- Dívida pequena (parecer 1): o bloco do andamento no seed repete o do serviço; se `registrarAndamento` mudar a ordem
  ou o conteúdo do evento, o seed tem de acompanhar.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "### T10" -- docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "## 12" -- /home/deploy/servidor/projetos/estruturaAutonoma/docs/construcao/padrao-tecnico.md` — erro 128 do git (fora do repositório); fora da lista Pode (ver Pendências)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "G5" -- docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 84a0b254fa3ef284acb680650da19e8c766a8da8`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 84a0b254fa3ef284acb680650da19e8c766a8da8 -- scripts/seed-ficticio.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A30 "export function transicaoDoConstruir" -- src/modules/demandas/transicoes.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A25 "export function decidirPorStatus" -- src/modules/andamento/regras.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -B3 -A12 "AUTOMATICAS_DO_CONSTRUIR" -- src/modules/demandas/transicoes.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 84a0b254fa3ef284acb680650da19e8c766a8da8 -- scripts/scripts.test.ts scripts/seed-integracoes.test.ts scripts/seed-integracoes-qa.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export" -- src/modules/andamento/registrar.ts src/modules/andamento/regras.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "CONSTRUIR_DO_SEED" -- scripts/seed-ficticio.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0ac099a -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/db/transacao.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/agentes/entrada-agente.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/pacotes-decisao/consultas.ts next.config.ts 'drizzle/000[0-7]_*.sql' 'drizzle/meta/000[0-7]_snapshot.json'` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts test/estatico --reporter=dot` — 1112 de 1112 (50 arquivos)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "TOTAL_DEMANDAS_DO_SEED" -- e2e src test` — sem resultado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -w "28" -- e2e`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -i "construção" -- e2e/fila-contadores.spec.ts e2e/fila-origem-qa.spec.ts` — sem resultado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "toHaveText\|toHaveCount" -- e2e/fila-contadores.spec.ts` — alternativa em regex num comando só; fora da lista Pode (ver Pendências)

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido: a tarefa faz o que o plano pede (a única
      decisão fora do texto cumpre a tabela da T10) e só os arquivos dela mudaram; há teste para cada comportamento
      novo, visto falhando antes; nenhum segredo, token ou dado pessoal real; nenhuma entrada externa nova (o seed passa
      pelos esquemas Zod dos serviços); sem migration; a repetição do bloco do serviço é exigida pelo D-07 e ficou como
      Minor; nenhuma tela tocada; os Minor estão em Pendências; o item de PR fica para a `08-revisao`.
