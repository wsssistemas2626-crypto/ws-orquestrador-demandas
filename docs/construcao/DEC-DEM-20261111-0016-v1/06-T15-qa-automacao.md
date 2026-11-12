---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T15-testes
agente: qa-automacao
leu: [contrato-passagem.md, pedido.json, tarefas.json, 01-analista-requisitos.md (contexto e glossário), docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G8 e T13 a T16), 06-T15-engenheiro-backend.md, 06-T15-tech-lead.md, 06-T14-qa-automacao.md, diff do commit 85d7b94 (scripts/scripts.test.ts), scripts/seed-ficticio.ts, scripts/seed-integracoes.test.ts, scripts/token-integracao-qa.test.ts (cabeçalho), test/integracoes.ts, test/pedidos-construcao.ts, test/requisicao.ts, src/app/api/demandas/[id]/route.ts, src/modules/limites.ts, src/modules/demandas/confirmar.ts, src/modules/pedido-construcao/entregar.ts, src/modules/pedido-construcao/gerar.ts, src/modules/pedido-construcao/conferir.ts, src/lib/erros.ts, src/lib/log.ts, playwright.config.ts, a saída do pnpm test e do pnpm test:e2e]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T15 (seed fictício com as demandas do Awave e os pedidos para o /construir; IN-17, V-01 e D-09), sobre o
commit `85d7b945ffd27cca823acc736ebd80e1034d4e53`. Nenhum arquivo rastreado mudou. Entrou um arquivo de teste novo,
`scripts/seed-integracoes-qa.test.ts`. Os tokens só nascem em tempo de teste, num banco Testcontainers, e nenhum deles
aparece em arquivo, em log ou em mensagem de `expect`.

### Critérios da tarefa e testes que os cobrem

Os critérios da T15 são os do passo 1 do plano. A tarefa não tem CA-NN próprio no `01-analista-requisitos.md`: ela é
apoio dos e2e T16 a T20 e da V-01.

| Critério (plano, T15) | Arquivo | Teste |
|---|---|---|
| Três demandas `integracao`/`awave`, rascunho, solicitante "Awave"; duas em `nova` e a `awaveEncerrada` em `encerrada` | `scripts/seed-integracoes.test.ts` (engenheiro) | `três demandas do Awave: autoria integracao/awave, rascunho, solicitante "Awave", melhoria; duas em Nova e uma encerrada` |
| Nenhuma tem `demanda_confirmada` | `scripts/seed-integracoes.test.ts` | `nenhuma demanda do Awave está confirmada: …` |
| Idem, pelo serviço de confirmação (o que a T18 vai usar) | `scripts/seed-integracoes-qa.test.ts` (novo) | `a awaveConfirmar confirma; a awaveEncerrada recusa por status final; a de pessoa recusa por origem; a awaveAguardando segue aguardando` |
| `listarPendentes` traz o DEC da `pedidoParaBuscar` e não o da `pedidoRecebido`; `recebimentoDoPedido` da `pedidoRecebido` é uma data | `scripts/seed-integracoes.test.ts` | `V-01: o /construir acha só o pedido a buscar; …` |
| V-01 de ponta a ponta pelas três rotas, com token real do `construir` | `scripts/seed-integracoes-qa.test.ts` | `busca o pedido a buscar, confere o SHA, confirma o recebimento; a segunda passada lista 0; o já recebido mantém o hash do seed` |
| `pedido_entregue` e `pedido_recebido` da `pedidoRecebido` com ator `construir` e prefixo `ficticio` | `scripts/seed-integracoes.test.ts` | `o pedido recebido: um pedido_entregue e um pedido_recebido do construir, …` |
| Os bytes do pedido recebido não mudam depois do seed (CA-22.2 sobre o dado semeado) | `scripts/seed-integracoes-qa.test.ts` | `a entrega do pedido já recebido devolve o mesmo hash que o seed gravou, sem gravar outro pedido_entregue` |
| `token_servico` vazio (D-09) e nenhum `wsod_` no log do seed | `scripts/seed-integracoes.test.ts` | `D-09 e IN-04: nenhum token de serviço no banco semeado, …` |
| G3.10: o log do seed não leva título, `decId`, `sha256`, prefixo nem texto do Awave (pendência da 06-T15-revisao) | `scripts/seed-integracoes-qa.test.ts` | `G3.10: o log do seed não leva título, decId, sha256, prefixo, token nem texto do Awave; a linha do seed só tem a quantidade` |
| Nenhuma execução de agente para as demandas do Awave | `scripts/seed-integracoes.test.ts` | `nenhuma execução de agente para as demandas do Awave` e `a demanda de pessoa tem a execução do insumo técnico; as três do Awave, nenhuma execução nem job` |
| O Awave fica com 3 das 10 por hora (cabeçalho do seed; pendência para a T20) | `scripts/seed-integracoes-qa.test.ts` | `lê as três do seed em seis chaves e não a de pessoa; sete criações na hora, a oitava 429, e depois de uma hora volta a criar` |
| Total do seed (28) e testes antigos do seed (G5) | `scripts/seed-integracoes.test.ts` e `scripts/scripts.test.ts` | `o total do seed conta as cinco novas: …` e os testes da tabela G5 da entrega do engenheiro |
| Minor 3 da revisão (o 5 de `TOTAL_DEMANDAS_DO_SEED - 5`) | `scripts/seed-integracoes-qa.test.ts` | `Minor 3: as cinco das integrações são as últimas demandas criadas, e os dois DECs delas vêm depois dos três de antes` |
| Minor 4 da revisão (duas cópias do molde da demanda do e2e) | `scripts/seed-integracoes-qa.test.ts` | `Minor 4: as demandas dos dois pedidos têm o molde das demandas do e2e da 0.2.0 (tipo, solicitante, papel, linha e autora)` |
| Atomicidade da parte nova | `scripts/seed-integracoes.test.ts` | `nenhuma demanda do Awave, pedido gerado nem evento das integrações fica gravado, e a subida seguinte semeia tudo` |

### Testes acrescentados

`scripts/seed-integracoes-qa.test.ts`, com 7 testes em 4 `describe`. Cada `describe` tem o próprio banco semeado e
relógio fixo. Os que gravam são um `it` só por banco.

1. **Só leitura do banco semeado** (4 testes):
   - **G3.10:** o log capturado durante o seed não contém nenhum dos cinco títulos, nenhum dos dois `decId`, o `sha256`
     da entrega, o valor `"ficticio"`, `wsod_`, "Awave" nem trechos da descrição e do contexto do Awave. A linha
     `seed_ficticio`, sem `level` e `time`, é exatamente `{ evento, status: 'semeado', quantidade: 28 }`.
   - **Minor 3:** na ordem dos `demanda_criada`, as cinco da T15 são as cinco últimas, nesta ordem, e nenhuma aparece
     antes. Na ordem de criação dos DECs, os três primeiros são da primeira demanda, da `etapasDupla` e da
     `decisaoRecomendaB`, e os dois últimos são dos pedidos. É isso que torna correto o `TOTAL_DEMANDAS_DO_SEED - 5` de
     `scripts/scripts.test.ts:1054`. Se alguém mudar a ordem ou o número, este teste aponta a causa.
   - **Minor 4:** as demandas dos dois pedidos têm, campo a campo, o mesmo molde da `etapasDupla`: tipo, solicitante,
     papel, linha, urgência nula, sem rascunho, autoria `pessoa` da `sem2fa` e contexto preenchido. O molde de
     referência também é conferido por igualdade.
   - **Bytes estáveis:** `entregarPedido` do pedido já recebido, chamado depois do seed, devolve um JSON cujo SHA-256
     (calculado pelo serviço e pelo oráculo independente `sha256DoTexto`) é o que o seed gravou. Nenhum evento novo
     entra.
2. **V-01 pelas três rotas** (1 teste), com token real do `construir`, sem `Origin`, como o `buscar-pedidos.mjs` chama:
   - pendentes é exatamente `{ itens: [{ decId: <pedidoParaBuscar> }] }`;
   - duas entregas dão 200 com bytes iguais e um único `pedido_entregue`. O JSON tem `pedido` igual ao DEC e o título e
     o tipo da demanda;
   - SHA errado: 409, nenhum `pedido_recebido`, e o pedido continua na lista;
   - SHA certo: 204, um `pedido_recebido`, e a lista fica `{ itens: [] }` (a "segunda execução lista 0" da V-01). Repetir
     dá 204 sem gravar de novo;
   - a `pedidoRecebido` é entregue com o hash do seed, sem `pedido_entregue` a mais.
3. **Awave sobre o banco semeado** (1 teste), com token real, cujo prefixo é outro e não `ficticio`:
   - lê as três do seed com 200 e exatamente as seis chaves, com `id`, tipo e status certos. A demanda de pessoa
     (`pedidoParaBuscar`) dá 404;
   - 30 minutos depois do seed, sete `POST /api/demandas` dão 201 e o oitavo dá 429
     `{ erro: 'limite_excedido', mensagem: MENSAGEM_LIMITE_AWAVE }`, sem gravar. O total fica em 28 + 7;
   - 61 minutos depois do seed, as 3 dele saem da janela e o POST volta a dar 201.
4. **Confirmação** (1 teste): a "cto" do seed confirma a `awaveConfirmar` (`{ jaConfirmada: false }`, e ela deixa de
   aguardar). A `awaveEncerrada` dá `conflito` com `MENSAGENS_CONFIRMACAO.statusFinal`, e a demanda de pessoa dá
   `conflito` com `outraOrigem`, sem gravar evento. A `awaveAguardando` continua aguardando, e há um único
   `demanda_confirmada`.

### e2e com o seed novo (pedido do maestro)

`pnpm test:e2e`, uma vez, local (Testcontainers, build de produção, porta 3101), sem `BASE_URL`: **258 testes, 249
passaram e 9 foram pulados, código de saída 0**, em 9,5 min.
- Os 9 pulados são os de `e2e/capturas.spec.ts`, que só rodam quando pedidos. Não têm relação com o seed.
- O `✘` da `e2e/vigia.spec.ts:5` (CV-03 negativo) é o controle negativo esperado: está contado entre os que passaram, e
  a saída é 0.
- Os e2e que leem o seed passaram com as 28 demandas: `fila-contadores.spec.ts` (inclusive CA-06.3 e CA-07.1 com os
  cartões das demandas do Awave), `fila.spec.ts` (paginação), `axe-todas.spec.ts`, `decisao.spec.ts` e
  `pedido-construcao.spec.ts`. **O seed novo não quebrou nenhum e2e de hoje.**

### Resultado

- `pnpm test scripts/seed-integracoes-qa.test.ts`: 1 de 1 arquivo, 7 de 7 testes. Com `scripts/seed-integracoes.test.ts`
  e `scripts/scripts.test.ts`: 3 de 3 arquivos, 67 de 67 testes.
- `pnpm test` (suíte inteira): **282 de 282 arquivos, 6239 de 6239 testes**, 0 falharam. Na 06-T15-construcao eram 281 e
  6230. Entrou este arquivo, com 7 testes. O restante da diferença vem das guardas que varrem `docs/` com um `it` por
  arquivo, e a pasta do pedido ganhou entregas.
- `pnpm lint`: limpo. `pnpm typecheck`: limpo.
- `git status --short`: só `?? scripts/seed-integracoes-qa.test.ts`. Nenhum arquivo rastreado mudou, então nenhum teste
  existente perdeu asserção, foi apagado ou ganhou `.skip`, `.only` ou `.todo`.
- O diff de `scripts/scripts.test.ts` no commit 85d7b94 foi conferido. As linhas `expect(` que saíram voltaram com o
  número novo, e uma entrou. A unicidade de títulos passa a valer para os 23. Nenhuma asserção foi afrouxada.

## Decisões tomadas

- **V-01 pela rota, e não só pelo serviço:** o teste do engenheiro lê `listarPendentes` no banco. A V-01 da 09 roda o
  `buscar-pedidos.mjs` pelas rotas, com token e sem `Origin`. Por isso, o mesmo caminho (listar, entregar, receber
  errado e certo, listar de novo) agora passa pela API sobre o banco semeado.
- **Prefixo do token diferente de `ficticio` no teste do Awave:** isso prova que a leitura das três demandas do seed vale
  para o token que o e2e local emite (D-10), porque a posse é pela autoria `(integracao, awave)` e não pelo token.
- **O título não é conferido na leitura pelo Awave.** A vista devolve "Relatório do [nome removido] …", como explicado
  em Pendências. Fixar esse texto num teste congelaria um comportamento que ainda precisa de decisão. O teste confere
  `id`, tipo, status e as seis chaves.
- **"ficticio" no log é conferido como valor de campo (`"ficticio"`).** O nome do evento `seed_ficticio` contém a
  palavra e não é vazamento.
- **Sem dependência de ordem nem do relógio real:** um banco por `describe`, `relogioFixo` com `definir` e `avancar` no
  teste do limite, e as contagens são sempre o antes e o depois do próprio caso.
- **Os Minor 3 e 4 foram cobertos por teste e não por mudança no seed.** O seed não é arquivo da minha lista Pode. Os
  testes deixam a dependência explícita para quem for corrigir.

## Pendências

- Nenhuma bloqueia a T15.
- **Achado para a 07 ou a 08 (não é da T15): a vista do Awave minimiza "Awave" no título.** `GET /api/demandas/:id` com
  o token `awave` devolve `"titulo": "Relatório do [nome removido] aguardando confirmação (fictício)"`. A vista da
  integração passa o título pela minimização do nome do solicitante, e o solicitante gravado é sempre "Awave"
  (`NOME_DA_INTEGRACAO.awave`). Por isso, toda demanda do Awave cujo título cite "Awave" volta mutilada para o próprio
  Awave. O contrato da tool (só o `id` do 201) não quebra. Ainda assim, é provável que o 201 e o GET mostrem o mesmo
  efeito, e a T20 (e2e das integrações) não deve procurar a demanda do seed pelo título na resposta do Awave. Decidir se
  "Awave" fica fora da minimização (dono: `engenheiro-backend`, módulo de consultas) ou se os títulos do seed deixam de
  citar "Awave".
- Para a T20: o Awave começa com 3 das 10 da hora. O teste novo prova que sobram 7 criações e que a 8ª dá 429.
- Para a 09 (V-01): o teste novo mostra o roteiro completo sobre um banco recém-semeado, com 1 pendente e depois 0. Numa
  homologação em que o e2e já rodou, vale a ressalva da 06-T15-revisao: conferir a ausência do DEC do
  `pedidoParaBuscar`, e não o total 0.
- Minor 2 da revisão (o `resumoExecutivo` que diz "duas aprovações" num DEC de nível `cto`) segue com a T19 ou a 07. É
  texto e não tem teste.
- Glob e Grep não estavam disponíveis nesta sessão. Li tudo com Read e localizei arquivos pelo `git log`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --stat -1 85d7b945ffd27cca823acc736ebd80e1034d4e53` — os 5 arquivos do commit da T15
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261111-0016-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — HEAD em 43adf01 (06-T15-revisao)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 258 testes: 249 passaram, 9 pulados (capturas), saída 0
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 85d7b945ffd27cca823acc736ebd80e1034d4e53~1 85d7b945ffd27cca823acc736ebd80e1034d4e53 -- scripts/scripts.test.ts` — só contagens, e uma asserção a mais
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — 1 erro de tipo no teste novo (`DA_T15`), corrigido
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/seed-integracoes-qa.test.ts` — 3 de 7 falharam, todos por erro do teste: `seed_ficticio` contém "ficticio"; `etapasDupla` não está em Nova; título minimizado na vista do Awave (ver Pendências)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/seed-integracoes-qa.test.ts` — 7 de 7
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — 2 avisos de variável sem uso no teste novo, corrigidos
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/seed-integracoes-qa.test.ts scripts/seed-integracoes.test.ts scripts/scripts.test.ts` — 3 de 3 arquivos, 67 de 67 testes
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 282 de 282 arquivos, 6239 de 6239 testes, 0 falharam (saída lida com Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só `scripts/seed-integracoes-qa.test.ts` (novo)

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste (tabela acima)
- [x] a suíte inteira passa (282 de 282 arquivos, 6239 de 6239 testes; e2e 249 passaram e 9 pulados, saída 0)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real (um banco por `describe`, relógio fixo com `definir` e `avancar`, contagens por diferença)
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (nenhum arquivo rastreado mudou; o diff de `scripts/scripts.test.ts` do commit foi conferido)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real (tokens só em tempo de teste e nunca em `expect`; só dado fictício do seed e de `test/integracoes.ts`)
