---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T07-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 01-analista-requisitos.md (glossário, RF-07 a RF-10), 06-T07-engenheiro-dados-bd.md, 06-T07-engenheiro-backend.md, 06-T07-tech-lead.md, 06-T06-qa-automacao.md (cabeçalho), docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G7, T07), diff 59ddf37..69f871b de src/ (os 11 arquivos da T07), diff 4306728..b925dfe do plano, src/modules/demandas/origem.test.ts, src/modules/demandas/consultas.ts (linhas 380 a 498), src/modules/dados-pessoais/minimizar.ts, src/db/schema/demandas.ts, src/app/api/demandas/route.ts, src/app/api/demandas/demandas.test.ts (linhas 1 a 110 e 340 a 400), src/lib/erros.ts, src/modules/acesso/mensagens.ts, test/integracoes.ts, test/requisicao.ts (linhas 1 a 80), test/deps.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T07 ("Origem da demanda: leitura, listagem e filtro (servidor)"; RF-10 no servidor, CA-10.2 a CA-10.5, C-17,
IN-02 linha 13 do G8 e IN-16/D-22). O código das duas passagens (7c8c206 e 4306728 do `engenheiro-dados-bd`; b5b347c e
69f871b do `engenheiro-backend`) passa em todos os testes. Não há falha a classificar: **nada volta à construção**.

### Critério a critério

| Critério da T07 | Teste que cobre (arquivo › nome do teste) |
|---|---|
| RF-10: a origem vem da autoria, lista fechada (`origemDaAutoria`, `origemDoResponsavel`) | `src/modules/demandas/origem.test.ts` › "pessoa, agente e awave pela autoria; construir e autoria fora da lista lançam"; "pelo responsável da vista: o mesmo resultado; construir e tipo desconhecido lançam" |
| RF-10: o item da listagem traz `origem` e não traz o id do autor | `origem.test.ts` › "sem filtro: cada item tem a origem certa e a chave origem, sem autorId"; `src/modules/demandas/consultas.test.ts` › "o item resumido tem só os campos da fila: sem solicitante, texto livre, anexos nem autor"; `src/app/api/demandas/demandas.test.ts` › "o item da fila não traz solicitante, texto livre, anexos nem autor" e "a listagem, nos dois atores, só tem as chaves da fila" |
| RF-10: o filtro se combina com a paginação e com os filtros que já existem | **novo** `src/modules/demandas/origem-qa.test.ts` › "origem=awave página a página (limit 1): uma por vez, da mais nova para a mais velha, com o total da origem em todas"; "a origem se combina como E com a linha, o tipo e o status"; "pessoa, ?origem=agente&limit=1&offset=1: a paginação vale com o filtro pela rota" |
| CA-10.2: cada filtro traz só a sua origem, com o total certo | `origem.test.ts` › "CA-10.2 e CA-10.4: cada filtro traz só a sua, com total 1; o solicitante editado não muda a origem"; **novo** `origem-qa.test.ts` › "CA-10.2: pessoa junta as duas contas e agente junta os dois agentes; a soma das três origens é o total sem filtro" |
| CA-10.3: origem e status valem como E | `origem.test.ts` › "awave + nova → só a nova do Awave; awave sozinho → as duas; nova sozinho → a do Awave e a da pessoa"; "o total segue o filtro inteiro, e a contagem por status com origem ignora o status da URL" |
| CA-10.4: o solicitante editado não muda a origem (listagem e detalhe) | `origem.test.ts` › "CA-10.2 e CA-10.4: …"; "CA-10.4 no detalhe: a origem lida do responsável da vista continua awave (e pessoa na de pessoa)" |
| CA-10.5: `GET /api/demandas?origem=awave` com pessoa só traz as do Awave; `origem=outra` → 400 | `origem.test.ts` › "?origem=awave → 200 só com a do Awave, cada item com origem"; "?origem=awave&status=nova vale os dois; ?origem=pessoa&tipo=bug não acha nada"; "?origem=outra, vazia e repetida → 400 com o campo origem, sem ecoar o valor"; **novo** `origem-qa.test.ts` › "pessoa, ?origem=awave: o mesmo recorte, com o título original" |
| CA-10.5 para agente (a listagem da API usa a mesma consulta), com o M-1 mantido | **novo** `origem-qa.test.ts` › "agente (Bearer, sem Origin), ?origem=awave: 200 só com as do Awave, origem awave e o título minimizado pelo solicitante atual"; `origem.test.ts` › "listagem da API para agente: a origem sai igual, e o título continua minimizado como hoje" |
| Contagem por status com a origem | `origem.test.ts` › "contarDemandasPorStatus com origem conta só a origem; sem origem, as três"; **novo** `origem-qa.test.ts` › "contarDemandasPorStatus: agente e pessoa pela origem, e a origem combinada com a linha" |
| C-17: enum do filtro; valor só por parâmetro no SQL | `origem.test.ts` › "CA-10.5: as três origens passam; fora da lista, vazia, maiúscula ou repetida, não"; "C-17: a origem vai ao SQL como parâmetro, nunca no texto, na página, no total e na contagem"; "condicaoDaOrigem: …"; **novo** `origem-qa.test.ts` › "espaço nas pontas, maiúscula, lista por vírgula e nome de integração não passam"; "valor fora da lista dá 400 com o campo origem, para pessoa e para agente, sem ecoar o valor" |
| IN-02 (G8 linha 13): o filtro não abre a listagem para integração | `origem.test.ts` › "IN-02: o filtro de origem não abre a listagem para a integração" (função); **novo** `origem-qa.test.ts` › "IN-02: as duas integrações recebem 403 na listagem, com e sem o filtro de origem, sem nada da fila no corpo" (rota, `awave` e `construir`) |
| IN-16 / D-22: a guarda da origem da entrada bruta não enfraqueceu | `src/modules/demandas/entrada-qa.test.ts` › "GET /api/demandas (fila) e GET /api/demandas/:id/historico da demanda criada pela entrada não têm sentinela" (lista fechada das nove chaves, mais `origem === 'pessoa'`, mais `contemSentinela`) |
| Desempenho do filtro do Awave (índice) | `origem.test.ts` › "página, total e contagem por status com origem=awave: pelo índice demanda_autor_criada_idx, sem varrer demanda" (nesta rodada: `Index Scan` ou `Index Only Scan` em `demanda_autor_criada_idx` nas três consultas) |

### Testes acrescentados

`src/modules/demandas/origem-qa.test.ts` (novo, 11 testes, 11 de 11). Usa Postgres real (Testcontainers) com o papel do
app. Sete demandas fictícias entram no `beforeAll` pelo migrator, com datas fixas (01/11/2026, uma por hora):

- três do Awave: uma com `linha = sob_medida`, uma `em_analise` e uma com o solicitante editado para "Pessoa Ficticia
  Joana" e esse nome no título;
- duas de pessoa, das contas `u-qa-origem-1` e `u-qa-origem-2`;
- duas de agente, `orquestrador` e `insumo_tecnico`.

Nenhum teste grava, então a ordem dos testes não muda nada. O relógio real não é lido: `criarDepsDeTeste` usa o relógio
fixo. Os tokens (`risco`, `awave`, `construir`) são gerados em tempo de teste e não aparecem em mensagem de `expect`: o
rótulo leva só o nome da integração.

O que eles acrescentam ao `origem.test.ts`:

1. **Paginação com o filtro** (RF-10): com `limit 1` e `offset` de 0 a 3, a listagem percorre as três do Awave na ordem
   da fila. O `total` é 3 em todas as páginas, e a última página vem vazia. Também cobre `limit 2 offset 1` e a rota com
   `?origem=agente&limit=1&offset=1`.
2. **Agrupamento por tipo de autor**: `pessoa` reúne as duas contas e `agente` reúne os dois agentes. A soma 2 + 2 + 3 é o
   total sem filtro (7). Isso pega um filtro que, por engano, olhasse o `autor_id` de pessoa ou de agente.
3. **Combinações**: origem com linha, tipo e status, inclusive três filtros juntos, na listagem e na contagem.
4. **Agente pela rota, Bearer sem `Origin`**:
   - a resposta é 200 só com as do Awave e `origem: 'awave'`;
   - o título sai com `[nome removido]` no lugar do solicitante atual (M-1 do 0008), e o corpo não tem o nome;
   - a pessoa vê o mesmo recorte com o título original.

   O teste antigo sobre o mesmo assunto ("o título continua minimizado como hoje") não confere o título.
5. **IN-02 pela rota**: `awave` e `construir` recebem 403 `sem_permissao`, com a mensagem de `MENSAGENS_ACESSO`, sem
   filtro e com cada uma das três origens. O corpo não tem nenhum id nem título da fila.
6. **C-17**:
   - no schema, `' awave'`, `'awave '`, `AWAVE`, `Pessoa`, `pessoa,agente`, `agente_ia`, `integracao:awave` e `sistema`
     são recusados;
   - pela rota, `AWAVE`, `pessoa%2Cagente` e `%20awave` dão 400 com o campo `origem`, para pessoa e para agente, sem
     ecoar o valor.

### Resultado

- `pnpm test src/modules/demandas/origem-qa.test.ts`: 1 arquivo, **11 de 11**.
- `pnpm test` (suíte inteira): **261 de 261 arquivos e 5621 de 5621 testes** (os 5610 da construção mais os 11 novos),
  sem falha, em 190 s. O `EXPLAIN` do `origem.test.ts` saiu de novo pelo índice `demanda_autor_criada_idx` nas três
  consultas.
- `pnpm typecheck`: limpo.
- `pnpm lint`: limpo.

### Conferência do IN-16 nas passagens da construção

No diff 59ddf37..69f871b, nenhum teste foi apagado nem marcado com `.skip`, `.only` ou `.todo`.

- As listas exatas de `consultas.test.ts:118` e de `demandas.test.ts:223` e `:394` só ganharam `'origem'`.
- Os quatro ajudantes `demanda` do painel só ganharam `origem: 'pessoa'` antes do `...extra`, e nenhuma asserção mudou.
- A linha 163 de `entrada-qa.test.ts` virou lista fechada mais valor exato. A guarda nova é mais forte que a antiga,
  como a revisão já mostrou.

Nesta etapa, `git status --short` mostra só o arquivo novo: nenhum teste existente mudou.

## Decisões tomadas

- Criei o arquivo novo `origem-qa.test.ts` em vez de editar o `origem.test.ts`. Assim sigo o padrão `*-qa.test.ts` do
  repositório e não mexo em teste da construção (G3.2).
- A massa entra pelo migrator, com datas fixas, e não por `criarDemanda`. Com o relógio fixo, todas as demandas teriam o
  mesmo `criadaEm`, e a ordem da paginação dependeria só do id. Assim, a ordem por data também fica provada.
- A massa tem dois agentes e duas contas diferentes. É isso que separa "filtro por tipo de autor" de "filtro por autor".
- O 403 das integrações é conferido com o corpo exato (`sem_permissao` e a mensagem de `MENSAGENS_ACESSO`) e sem nenhum
  id da fila, com e sem o filtro. Assim, o filtro novo nunca vira um caminho de leitura da fila.
- Não testei a ordem entre autorização e validação para integração com `?origem=outra`. Esse comportamento é da
  `rota()`, que a T07 não toca, e nenhuma das duas respostas (400 ou 403) vaza dado.

## Pendências

- Nenhuma bloqueia.
- Minor, para a T16 (a revisão já registrou): os contadores, `temFiltro`, `legendaDaFila` e `hrefDaFila` do painel ainda
  não conhecem a origem. O CA-10.1 (origem em cada linha e cartão) e o CA-10.7 (axe com o filtro) ficam com a T16 e o
  e2e.
- Minor, sem ação nesta etapa: o teste "listagem da API para agente: a origem sai igual, e o título continua minimizado
  como hoje" (`origem.test.ts`) não confere o título. A minimização com o filtro ficou coberta pelo teste novo do agente
  pela rota. Numa volta futura, esse teste pode perder a segunda metade do nome ou ganhar a asserção.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -25` — os commits da T07 sobre 59ddf37
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261111-0016-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 59ddf37 bc01548` — os 11 arquivos de `src/` da T07 e as entregas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 4306728 b925dfe -- docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md` — a volta do plano (G5, D-22, D-23, passos 3a, 3b e 4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 59ddf37 69f871b -- src/modules/demandas/consultas.ts src/modules/demandas/schemas.ts src/modules/demandas/resumo-da-fila.ts src/modules/demandas/consultas.test.ts src/modules/demandas/entrada-qa.test.ts src/app/api/demandas/demandas.test.ts` — o código e os testes alterados da T07
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 59ddf37 69f871b -- src/app/(painel)/demandas` — não rodou: erro de sintaxe do shell nos parênteses sem aspas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 59ddf37 69f871b -- "src/app/(painel)/demandas"` — só a linha `origem: 'pessoa'` nos quatro ajudantes
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/origem-qa.test.ts` — 11 de 11
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — em segundo plano, saída lida com Read: 261 de 261 arquivos e 5621 de 5621 testes
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só `src/modules/demandas/origem-qa.test.ts` (novo)

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
