---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T10-testes
agente: qa-automacao
leu: [contrato-passagem.md, pedido.json, padrao-tecnico.md, tarefas.json, 05-tech-lead.md, 01-analista-requisitos.md (glossário, RF-01, RF-09 a RF-15 e RNF), 04-seguranca-aplicacao.md (linhas 1 a 40), docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (T10 e início da T11, linhas 1890 a 2004), 06-T10-engenheiro-dados-bd.md, 06-T10-tech-lead.md, 06-T09-qa-automacao.md, commit b158185 (diff contra 0ca1791), src/modules/pedido-construcao/pendentes.ts, src/modules/pedido-construcao/pendentes.test.ts, src/modules/pacotes-decisao/decidir.ts, src/modules/pacotes-decisao/schemas.ts, src/modules/demandas/transicoes.ts, src/modules/historico/registrar.ts, src/modules/acesso/ator.ts, src/db/schema/decisao.ts (linhas 90 a 123), src/db/transacao.ts, src/db/index.ts, src/lib/relogio.ts, test/banco.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T10 (commit `b158185`): as cinco leituras do Pedido de Construção no histórico, em `pendentes.ts`. O código
passa em todos os critérios. Os 18 testes do engenheiro estão corretos e estáveis. Acrescentei um arquivo com 4 testes
para quatro lacunas: duas são filtros da consulta que nenhum teste derrubava se fossem retirados, as outras duas são o
uso pela T11 e pela T12.

### Critérios da tarefa e o teste que cobre cada um

A T10 cobre RF-12 (consulta), RF-15 (leitura), RNF-02 (plano), IN-10, ADR-27, CA-12.1 a CA-12.6, P-02 e P-03. Os
critérios de rota (HTTP 200, `{ itens }`, 403 para os outros atores, CA-15.1 na tela) são da T11, da T12 e da T19. Aqui
estão cobertos só no nível da função.

| Critério | Arquivo | Teste |
|---|---|---|
| CA-12.1 e CA-12.2: sem `pedido_gerado` fica fora; depois de `gerarPedido` por pessoa, entra; gerar de novo não duplica | `pendentes.test.ts` | "CA-12.1 e CA-12.2: o DEC aprovado sem pedido_gerado fica fora; depois de gerarPedido por pessoa, entra como { decId }" |
| CA-12.6: só a chave `decId`, sem repetir, e a leitura não grava evento | `pendentes.test.ts` | "cada item tem só a chave decId, nenhum DEC se repete, e a leitura não grava evento (CA-12.6)" |
| CA-12.6 para as cinco leituras: nenhuma grava evento | `pendentes-bordas.test.ts` (novo) | "id com caractere de SQL ou de LIKE não casa com nada e não dá erro; nenhuma das cinco leituras grava evento" |
| IN-10: só `pedido_gerado` de pessoa sobre `pacote_decisao` conta (agente, integração, sistema, outra entidade ficam fora) | `pendentes.test.ts` | "IN-10: pedido_gerado de agente, de integração, de sistema ou sobre outra entidade não põe o DEC na lista" |
| IN-10: pessoa e agente no mesmo DEC | `pendentes.test.ts` | "IN-10: um pedido_gerado de pessoa basta, mesmo com outro de agente no mesmo DEC" |
| Glossário "pendente": só decisão `aprovada`. DEC devolvido com `pedido_gerado` de pessoa fica fora e não substitui o v1 | `pendentes-bordas.test.ts` (novo) | "só decisão aprovada conta: um v2 devolvido, com pedido_gerado de pessoa, fica fora e não substitui o v1 aprovado" |
| CA-12.3: `entregue` e `encerrada` tiram; `aprovada` e `em_construcao` não | `pendentes.test.ts` | "CA-12.3: a demanda entregue ou encerrada tira o DEC da lista; aprovada e em_construcao não tiram" |
| CA-12.4: substituição | `pendentes.test.ts` | "CA-12.4: um DEC mais novo da demanda, aprovado, tira o antigo; o novo só entra com o próprio pedido_gerado" |
| CA-12.4: desatualizado por ESP e por RSK | `pendentes.test.ts` | "CA-12.4: uma ESP ou um RSK mais novos que os citados (desatualizado) tiram o DEC" |
| CA-12.5 e P-02: `pedido_recebido` tira; `pedido_entregue` não; o recebido de outro DEC não conta | `pendentes.test.ts` | "CA-12.5: pedido_recebido tira o DEC; pedido_entregue não tira (P-02); o recebido de outro DEC não conta" |
| CA-12.5: o recebido sobre a entidade `demanda` não tira o DEC da lista nem conta em `recebidoComSha` | `pendentes-bordas.test.ts` (novo) | "pedido_recebido sobre a entidade demanda, com o id do DEC, não tira o DEC da lista nem conta em recebidoComSha" |
| P-02: a lista não monta o pedido (entrega recusada pelo nome, o DEC continua) | `pendentes.test.ts` | "P-02: o DEC continua na lista quando a entrega seria recusada pelo nome do solicitante (a lista não monta o pedido)" |
| P-03 e RF-12: sem corte por data; vale o primeiro `pedido_gerado`; desempate pelo id | `pendentes.test.ts` | "P-03: pedido gerado em outubro também conta; a ordem é do primeiro pedido_gerado mais antigo para o mais novo, e depois pelo id" |
| IN-10 (T11): `pedidoGeradoPorPessoa` devolve só `{ demandaId }`, ou `null` (antes, inexistente, sem `demanda_id`) | `pendentes.test.ts` | "depois de gerarPedido devolve só { demandaId }, a demanda do DEC; antes, null"; "DEC que não existe → null; pedido_gerado de pessoa sem demanda_id → null" |
| ADR-26 e P-02 (T11): `shasEntregues` só no formato, na ordem de gravação, sem repetir | `pendentes.test.ts` | "shasEntregues: só os sha256 de pedido_entregue do mesmo DEC no formato ^[0-9a-f]{64}$, na ordem de gravação, sem repetir" |
| IN-11 (T12): `recebidoComSha` só com o mesmo DEC e o mesmo hash | `pendentes.test.ts` | "recebidoComSha: verdadeiro só com pedido_recebido do mesmo DEC e o mesmo hash" |
| RF-15 (T19): `recebimentoDoPedido` dá o primeiro recebido, ou `null` | `pendentes.test.ts` | "recebimentoDoPedido: a data do primeiro pedido_recebido do DEC, ou null" |
| G7 (T11 e T12): as leituras rodam na transação de quem chama e veem o que ela gravou; a outra conexão não vê; o rollback desfaz | `pendentes-bordas.test.ts` (novo) | "as leituras usam a transação de quem chama: veem o que ela gravou, a outra conexão não vê, e o rollback desfaz" |
| IN-10 / C-17: o id vai por igualdade e parâmetro. Aspas, `%` e `_` não casam com nada nem dão erro | `pendentes-bordas.test.ts` (novo) | "id com caractere de SQL ou de LIKE não casa com nada e não dá erro; nenhuma das cinco leituras grava evento" |
| RNF-02: 200 DEC e 20 mil eventos, a lista exata | `pendentes.test.ts` | "a carga tem 200 demandas, 200 DEC v1 e 20 mil eventos"; "devolve exatamente os pendentes da regra, na ordem do primeiro pedido_gerado e do id" |
| RNF-02 e ADR-27: uma consulta, `evento_acao_entidade_idx`, sem `Seq Scan` em `evento`, abaixo de 1 s | `pendentes.test.ts` | "uma consulta só, que usa evento_acao_entidade_idx, não varre evento inteira e roda abaixo de 1 s" |

### Testes acrescentados

`src/modules/pedido-construcao/pendentes-bordas.test.ts` (novo, 4 testes). Usa Postgres real pelo papel do app, relógio
fixo, um dia por teste e demandas próprias. As contagens de evento são relativas. Os dados são fictícios: "Carlos
Exemplar", `@exemplo.test`, prefixo `ficticio`, hashes `0…0a1`. Não gera nenhum token.

1. **Filtro `aprovada` da lista.** O v1 é aprovado e tem o pedido gerado. O v2 da mesma demanda é **devolvido** pelo
   `registrarDecisao` real, e o teste confere que a demanda foi a `em_analise`, que não é status final. Depois entra
   um `pedido_gerado` de pessoa no v2, pelo migrator. A lista é exatamente `[v1]`.
   - Sem `eq(decisao.statusDecisao, 'aprovada')` em `pendentes.ts:35`, o v2 entraria, e nenhum teste da T10 pegava
     isso: na carga do RNF-02, o DEC sem aprovação não tem linha em `decisao`, e a junção já o tirava.
   - O teste também prova que um DEC devolvido mais novo não substitui o aprovado.
2. **Filtro de entidade do recebido.** Um `pedido_recebido` sobre a entidade `demanda`, com `entidade_id` igual ao id
   do DEC, não tira o DEC da lista, e `recebidoComSha` dá `false`.
   - O desvio 2 do engenheiro pôs `entidade` no `NOT EXISTS`, mas o teste dele só cobria `recebimentoDoPedido`.
   - Sem o filtro em `pendentes.ts:46` ou em `:93`, o teste falha.
3. **Transação de quem chama.** Dentro de `comTransacao`, o teste grava `pedido_entregue` e `pedido_recebido` com
   `registrarEvento` e o ator `construir`.
   - Lidas com `tx`, as cinco leituras veem os dois eventos: o DEC fora da lista, `[hash]`, `true` e a data do relógio.
   - Pela outra conexão, ao mesmo tempo, nada aparece.
   - Depois do rollback, a contagem de eventos volta ao número de antes e o DEC continua pendente.

   É disso que a T11 (gravar um `pedido_entregue` por hash) e a T12 (não gravar o recebido de novo, sob a trava) dependem.
4. **Id estranho.** As quatro leituras por id recebem estes valores e devolvem `null`, `[]` ou `false`, sem erro, com um
   DEC entregue e recebido no banco:
   - `<decId>' or '1'='1`;
   - `' or ''='`;
   - `%`;
   - o id truncado com `%`;
   - o id com `_`;
   - vazio.

   O mesmo DEC pelo id exato casa. Nenhuma das cinco leituras grava evento.

### Resultado

- `pnpm test src/modules/pedido-construcao/pendentes-bordas.test.ts`: 1 arquivo, **4 de 4**. A primeira execução
  falhou num erro do meu teste (`obterDemanda` não existe em `servico.ts`). Troquei por um `select` em `demanda`, e o
  código não mudou.
- `pnpm test` (suíte inteira): **271 de 271 arquivos e 5712 de 5712 testes**, 0 falharam, em 170 s. A 06-T10 tinha 270
  arquivos e 5708 testes; o arquivo novo soma 1 arquivo e 4 testes.
- `pnpm lint`: limpo. `pnpm typecheck`: limpo.
- `git status --short`: só `?? src/modules/pedido-construcao/pendentes-bordas.test.ts`. `git diff --stat`: vazio.
  Nenhum arquivo rastreado mudou.
- O commit `b158185` só criou `pendentes.ts` e `pendentes.test.ts` em `src/`. Nenhum teste existente foi apagado,
  afrouxado ou marcado.

### Leitura crítica dos testes do engenheiro

- **Ordem:** o bloco funcional divide o banco, mas cada teste filtra só os próprios DEC (`pendentesEntre`) e conta
  eventos de forma relativa. O CA-12.6 percorre a lista inteira, mas a asserção vale para qualquer item. Não depende de
  ordem.
- **Relógio:** é fixo, com um dia por teste. O RNF-02 mede o tempo com `performance.now()`, o que a revisão aceitou. O
  limite é 1 s e a medição foi de cerca de 16 ms, então a folga é grande. A lista exata do RNF-02 não tem empate de
  tempo, porque 37 e 200 são primos entre si e as datas de `(i * 37) % 200` são todas diferentes. Assim o desempate em
  TypeScript não diverge da collation do banco.
- **Mutação, filtro a filtro:** retirei mentalmente cada condição de `pendentes.ts`. Cada uma, sem a outra, tem um
  teste que falha: ator, entidade do gerado, status final, substituído, desatualizado, `acao` e entidade do recebido,
  `aprovada`, ordem por `min`, `isNotNull`, formato do hash e `acao` de cada leitura. Antes desta etapa, só `aprovada` e
  a entidade do recebido ficavam sem teste.
- Nenhum `.only`, `.skip` ou `.todo`.

## Decisões tomadas

- Os testes novos ficaram num arquivo novo, `pendentes-bordas.test.ts`. Assim `pendentes.test.ts` não muda e o
  `git diff` dos rastreados fica vazio (IN-16).
- O DEC do teste 1 é devolvido pelo `registrarDecisao` real, e não por uma linha em `decisao` inserida pelo migrator. O
  estado é um que o sistema produz de verdade, e o teste confere `em_analise` para não passar pelo motivo errado. Uma
  decisão `arquivada` levaria a demanda a `encerrada`, e aí o DEC sairia pelo status final.
- Não escrevi teste para a diferença do Minor 2 da revisão (a `g` aceita `pedido_gerado` de pessoa sem `demanda_id`, e
  `pedidoGeradoPorPessoa` não). Um teste fixaria um comportamento que a `08-revisao` pode querer mudar. Hoje só o
  migrator grava esse caso.
- O teste da transação guarda o que leu dentro do erro que força o rollback. Assim ele não depende de tempo nem de
  espera entre conexões: as duas leituras rodam em sequência, enquanto a transação está aberta.

## Pendências

- Nenhuma bloqueia a T10.
- Para a `06-T11-testes`: repetir pela rota `GET /api/pedidos-construcao/pendentes` o caso do DEC devolvido com
  `pedido_gerado` de pessoa (fora da lista) e o do recebido sobre a entidade `demanda` (continua na lista). Também
  conferir que a entrega usa `pedidoGeradoPorPessoa` e `shasEntregues` com o `tx` da trava, que o teste 3 mostra ser
  suportado.
- Fica valendo o Minor 2 da revisão (`demanda_id` nulo na `g`), para a `08-revisao`. Se o maestro alinhar as duas regras
  com `isNotNull(evento.demandaId)` na `g`, vale acrescentar o caso a `pendentes-bordas.test.ts`.
- Glob e Grep não estavam disponíveis nesta sessão. Li tudo com Read e achei os arquivos pelos caminhos citados no plano
  e nas entregas.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -12` — `b158185` é a 06-T10-construcao e `5e02e96` a revisão
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pedido-construcao/pendentes-bordas.test.ts` — 3 de 4: `obterDemanda is not a function`, erro no meu teste
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pedido-construcao/pendentes-bordas.test.ts` — 4 de 4
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 271 de 271 arquivos, 5712 de 5712 testes, 0 falharam (saída longa lida com Read)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só o arquivo novo `pendentes-bordas.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — vazio (nenhum arquivo rastreado mudou)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 0ca1791 b1581851fb5733079628271a7bf52380c87b0a02` — só `pendentes.ts`, `pendentes.test.ts`, a entrega da 06 e o `passagens.jsonl`, todos novos ou só com linhas acrescentadas

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
