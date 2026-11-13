---
pedido: DEC-DEM-20261111-0017-v1
etapa: 01-requisitos
agente: analista-requisitos
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, pedidos/insumos/2026-11-11_orquestrador-andamento-0.4.0.md, ferramentas/construir/enviar-andamento.mjs, ferramentas/construir/lib/andamento.mjs, ferramentas/construir/lib/buscar-pedidos.mjs (enderecoDa, lerToken, chamar), docs/superpowers/specs/2026-11-11-ws-orquestrador-demandas-integracoes-design.md, docs/construcao/DEC-DEM-20261111-0016-v1/01-analista-requisitos.md (formato), package.json, src/modules/acesso/matriz.ts, src/modules/demandas/transicoes.ts, src/modules/demandas/consultas.ts, src/modules/historico/registrar.ts, src/modules/limites.ts, src/modules/pedido-construcao/pendentes.ts, src/modules/pedido-construcao/receber.ts, src/modules/pedido-construcao/conferir.ts (estudo), src/app/api/pedidos-construcao/[decId]/recebimento/route.ts, src/app/api/demandas/[id]/route.ts, src/app/api/demandas/contrato-awave.test.ts, src/lib/rota.ts, src/lib/erros.ts, src/lib/corpo.ts, src/components/dados-das-etapas.ts, src/db/schema (CHECKs), docs/manual-tecnico (índice), docs/operacao (índice)]
status: pronto
proximo: arquiteto-solucoes
devolvido_para: null
---

## Entrega

### 0. Contexto e regra de leitura

Demanda do tipo `melhoria`. O `/construir` passa a informar ao Orquestrador a fase e as tarefas prontas de cada Pedido
de Construção que nasceu no painel; o Orquestrador guarda o último andamento na demanda, mostra na fila e no detalhe,
faz duas mudanças de status automáticas e entrega ao Awave uma leitura reduzida do andamento.

- **Base:** a ESP fala em "main depois do merge do 0016 (0.3.0)". A `main` hoje está em `0ac099a`, versão **0.3.1**,
  com os atores `awave` e `construir`, as rotas `/api/pedidos-construcao/*` e as correções M-1 a M-5 e B-1 a B-3. Vale a
  0.3.1 como base; nada da 0.3.1 muda os requisitos abaixo. Sai como **0.4.0**.
- **Contrato fixo do lado de lá:** o envio do `/construir` está pronto e desligado
  (`ferramentas/construir/enviar-andamento.mjs` e `lib/andamento.mjs`, CA-F-04). Ele define a seção 4 e não muda
  (RNF-07).
- **Decisões de Fabiano já tomadas (DEC, 11/11):** A1 `entregue` sempre de pessoa; A2 evento só na mudança de fase ou
  status; A3 pedido escrito direto fica sem andamento (404).

Numeração: RF-NN, RNF-NN e CA-NN.n valem **só para este pedido**. Requisito do sistema é citado pelo capítulo do manual
ou pelo id da 0.3.x (ex.: "RF-14 da 0.3.0", "IN-10"). Controles citados pelo código: C-09 (token de serviço), C-10
(matriz), C-11 (autoria só do ator), C-15 (CSRF), C-17 (regex de id e limite de corpo), C-30 (evento sem texto livre),
C-34 (privilégios do papel do app), C-36 (limite por ator), IN-01 a IN-18 (0.3.0).

### 1. Glossário

| Termo | Significado neste pedido |
|---|---|
| Andamento | O último estado de construção de um Pedido informado pelo `/construir`, guardado na demanda: `decId`, `fase`, `tarefasProntas`, `tarefasTotal`, `statusConstrucao`, `atualizadoEm` |
| Fase | Uma de seis, lista fechada: `entendendo_o_pedido`, `planejando`, `construindo`, `testando`, `revisando_e_entregando`, `documentando` |
| `statusConstrucao` | O campo `status` do corpo enviado: `em_construcao`, `construido` ou `cancelado`. **Não é o status da demanda.** Neste documento, "status" sozinho é sempre o status da demanda; o do corpo é sempre `statusConstrucao` |
| Status final | `entregue` e `encerrada` (`STATUS_FINAIS` de `transicoes.ts`) |
| Pedido gerado | DEC com evento `pedido_gerado` cujo ator é **pessoa** (`pedidoGeradoPorPessoa`, IN-10): a mesma regra da entrega e do recebimento da 0.3.0 |
| DEC vigente | O DEC aprovado que não foi substituído por um aprovado mais novo da mesma demanda (cap. 04, Substituição) |
| Mesmo estado | `decId`, `fase`, `tarefasProntas`, `tarefasTotal` e `statusConstrucao` do envio iguais aos do andamento gravado na demanda |
| Mudança de marco | Primeiro andamento da demanda, ou `fase`, `statusConstrucao` ou `decId` diferente do gravado. Só ela cria o evento `andamento_registrado` (A2) |
| Gravação de andamento | Envio aceito que altera o andamento gravado (não é "mesmo estado") |
| Janela do limite | Os 60 minutos anteriores ao instante da requisição, pelo relógio injetado (janela móvel, a mesma do C-36) |
| Selo de fase | Texto curto na fila, ex.: "Construindo · 9/17" |

### 2. Requisitos funcionais

#### RF-01. Ação `registrar_andamento` só para a integração `construir`

Regra: `ACOES` ganha `registrar_andamento`, com linha da matriz sem pessoa, sem agente e com `integracoes =
['construir']`. Nenhuma outra linha muda. O `construir` passa a ter exatamente quatro ações (as três da 0.3.0 e esta); o
`awave` continua com as duas dele. Nenhuma Server Action nova chama esta ação.

- **CA-01.1** Dado um token `construir` ativo e um DEC com pedido gerado, quando ele faz `POST
  /api/pedidos-construcao/<DEC-id>/andamento` com corpo válido, então a resposta é 204.
- **CA-01.2** Dado um token `awave`, um token de cada um dos quatro agentes e uma pessoa com sessão e 2FA de cada papel
  (`cto`, `administradora`), quando cada um faz o mesmo `POST` com corpo válido, então a resposta é 403 `sem_permissao`
  com a mensagem de hoje, e nada é gravado (andamento, status e contagem de eventos iguais aos de antes).
- **CA-01.3** Dado o teste de pares exatos da matriz, quando roda, então os pares permitidos a integrações são
  exatamente: `criar_demanda:awave`, `ler_demanda:awave`, `listar_pedidos_pendentes:construir`,
  `entregar_pedido:construir`, `confirmar_recebimento_pedido:construir` e `registrar_andamento:construir`.
- **CA-01.4** Dado o teste transversal que percorre todas as rotas (T13), quando roda, então a rota nova está nele e todo
  ator de `atoresProibidos('registrar_andamento')` recebe 403.
- **CA-01.5** Dado um token `construir`, quando ele chama qualquer rota de outra ação (ex.: `GET /api/demandas/:id`,
  `POST /api/demandas`, `PATCH /api/demandas/:id`), então a resposta continua 403.
- **CA-01.6** Dado um ator de integração montado com nome fora da lista (ex.: `jarvis`), quando `autorizar` é chamado
  com `registrar_andamento`, então é negado.

#### RF-02. Rota e formato do corpo

Regra: `POST /api/pedidos-construcao/<DEC-id>/andamento`, com `Authorization: Bearer`, sem `Origin`, corpo JSON. O corpo
é um objeto fechado com **exatamente** `fase`, `tarefasProntas`, `tarefasTotal` e `status`: `fase` na lista de seis;
`status` em `em_construcao`, `construido`, `cancelado`; `tarefasProntas` e `tarefasTotal` inteiros JSON (não texto), com
`0 <= tarefasProntas <= tarefasTotal <= 999`. JSON válido fora desse formato responde **422** `nao_processavel`, sem
ecoar o valor recebido, antes de qualquer consulta ao DEC e sem gravar. As recusas do adaptador `rota()` continuam como
hoje: id fora da regex 404 sem consulta; JSON malformado 400; `content-type` que não é JSON 415; corpo acima de 512 KB
413; cookie com Bearer 400. Aceito: **204 sem corpo**, com `no-store` e `nosniff`. Nunca 3xx.

- **CA-02.1** Dado o token `construir` e um DEC com pedido gerado, quando envia `{ "fase": "construindo",
  "tarefasProntas": 9, "tarefasTotal": 17, "status": "em_construcao" }`, então a resposta é 204 sem corpo, com
  `cache-control: no-store` e `x-content-type-options: nosniff`.
- **CA-02.2** Dado o mesmo DEC, quando o corpo tem qualquer um destes defeitos, então a resposta é 422 `nao_processavel`
  e nada é gravado: chave a mais (`"nota": "x"`); cada uma das quatro chaves ausente; `fase` `"Construindo"`,
  `"construido"` ou `""`; `status` `"entregue"` ou `"encerrada"`; `tarefasProntas` 10 com `tarefasTotal` 9; inteiro
  negativo; `1.5`; `"9"` (texto); `null`; `true`; `tarefasTotal` 1000; corpo `[]`, `null` ou `"texto"`.
- **CA-02.3** Dado um corpo do CA-02.2 e um DEC inexistente com id no formato, quando enviado, então a resposta é a mesma
  422, idêntica à do DEC existente com o mesmo corpo (o corpo é conferido antes do DEC).
- **CA-02.4** Dado um corpo com chave a mais cujo valor é uma sentinela, quando recusado, então a resposta, a linha de
  log e o Sentry falso não contêm a sentinela.
- **CA-02.5** Dado o token `construir`, quando envia JSON malformado, então 400; com `content-type: text/plain`, 415; em
  ambos nada é gravado.
- **CA-02.6** Dado `tarefasTotal` 0 e `tarefasProntas` 0 (pedido de bug, ou antes do plano), quando enviado com fase
  válida, então é aceito (204).
- **CA-02.7** Dado um id fora da regex (ex.: `DEC-xyz`), quando enviado, então 404 sem consulta ao banco.

#### RF-03. Só DEC com pedido gerado por pessoa; 404 sem oráculo

Regra: o envio só é aceito para DEC com pedido gerado (glossário). DEC inexistente, DEC existente sem `pedido_gerado` e
DEC com `pedido_gerado` de ator que não é pessoa respondem **o mesmo 404** `nao_encontrado` com
`MENSAGEM_NAO_ENCONTRADO`: mesmo status, corpo e cabeçalhos, sem dizer se o DEC existe. Nada é gravado. O pedido escrito
direto, sem demanda gerada no painel (A3), cai aqui.

- **CA-03.1** Dado um id `DEC-DEM-20991231-9999-v1` que não existe, quando o token `construir` envia corpo válido, então
  404 com `{ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO }`.
- **CA-03.2** Dado um DEC aprovado sem `pedido_gerado`, quando enviado o mesmo corpo, então a resposta é igual byte a
  byte à do CA-03.1.
- **CA-03.3** Dado um DEC com `pedido_gerado` de ator `agente` ou `sistema` inserido à mão, quando enviado, então a
  mesma resposta do CA-03.1.
- **CA-03.4** Nos CA-03.1 a CA-03.3, a contagem de eventos, o andamento, o status e o `atualizadaEm` da demanda não
  mudam.

#### RF-04. Último andamento guardado na demanda; idempotência

Regra: o andamento aceito é guardado na demanda do DEC (a do evento `pedido_gerado`) com `decId`, `fase`,
`tarefasProntas`, `tarefasTotal`, `statusConstrucao` e `atualizadoEm` (do relógio injetado). A demanda tem no máximo um
andamento, o último. O formato gravado e o lido passam pelo mesmo esquema Zod; valor lido fora do esquema é tratado
como "sem andamento" na tela e na API, sem 500. Forma de armazenamento (coluna `jsonb` ou tabela própria) é do
arquiteto. Envio no **mesmo estado** responde 204 sem gravar nada, sem evento e sem mudar `atualizadoEm`. Qualquer
outra diferença grava os seis campos. Os números podem diminuir (replanejamento do tech-lead). Gravar andamento sem
mudar o status da demanda não altera `demanda.atualizadaEm`.

- **CA-04.1** Dado um DEC com pedido gerado e a demanda sem andamento, quando o `construir` envia o corpo do CA-02.1
  com o relógio em T, então a demanda passa a ter o andamento `{ decId, fase: construindo, tarefasProntas: 9,
  tarefasTotal: 17, statusConstrucao: em_construcao, atualizadoEm: T }`.
- **CA-04.2** Dado o andamento do CA-04.1, quando o mesmo corpo é enviado de novo com o relógio em T + 2 min, então a
  resposta é 204, `atualizadoEm` continua T e nenhum evento é criado.
- **CA-04.3** Dado o andamento do CA-04.1, quando chega `tarefasProntas: 10` com o resto igual em T + 4 min, então
  `tarefasProntas` é 10, `atualizadoEm` é T + 4 min e nenhum evento é criado.
- **CA-04.4** Dado o andamento `construindo 9/17`, quando chega `construindo 3/19`, então é aceito e gravado, sem
  evento.
- **CA-04.5** Dado a demanda em `em_construcao` com `atualizadaEm` U, quando chega um andamento que não muda o status,
  então `demanda.atualizadaEm` continua U.
- **CA-04.6** Dado um andamento gravado fora do esquema (inserido à mão no teste), quando a fila, o detalhe e a API
  leem a demanda, então tratam como sem andamento e respondem sem erro.

#### RF-05. Mudanças de status automáticas e recusas

Regra: o `construir` só muda o status da demanda em duas transições, ambas com origem fixa (A1):

1. `statusConstrucao = em_construcao` com a demanda em `aprovada` → `em_construcao`, salvo demanda do tipo `estudo`
   (mesma regra da mudança manual: estudo não vai para construção), que grava o andamento sem mudar o status;
2. `statusConstrucao = cancelado` com a demanda em `em_construcao` → `devolvida`.

`construido` nunca muda o status. `entregue` e `encerrada` nunca são postos pelo `construir`. A mudança automática e o
andamento só valem para o **DEC vigente**: DEC substituído responde 409 sem gravar. Envio que contradiz um status final
responde 409 sem gravar, conforme a tabela da seção 5. Todo outro caso grava o andamento e não mexe no status. A
mudança de status grava `status_alterado` (antes e depois do status) com ator integração `construir` e o prefixo do
token, e atualiza `demanda.atualizadaEm`, na mesma transação do andamento. A tabela de mudanças manuais (`MANUAIS`) não
muda.

Ordem de conferência, depois do corpo (RF-02) e sob a trava do pedido e da demanda: (a) pedido gerado, senão 404; (b)
mesmo estado, então 204 sem gravar; (c) DEC não vigente, 409; (d) contradição com status final, 409; (e) limite, 429
(RF-12); (f) grava, muda o status se a regra casar, grava os eventos.

- **CA-05.1** Dado a demanda em `aprovada` e o DEC vigente com pedido gerado, quando chega `statusConstrucao:
  em_construcao`, então a resposta é 204, a demanda fica em `em_construcao`, `atualizadaEm` é o relógio e há um evento
  `status_alterado` `{ antes: { status: 'aprovada' }, depois: { status: 'em_construcao' } }` com `ator_tipo
  integracao`, `ator_id construir` e o prefixo do token.
- **CA-05.2** Dado a demanda em `em_construcao`, quando chega `statusConstrucao: cancelado`, então ela vai para
  `devolvida`, com `status_alterado` pelo ator `construir`.
- **CA-05.3** Dado a demanda em `em_construcao`, quando chega `statusConstrucao: construido`, então o status continua
  `em_construcao` e não há `status_alterado`.
- **CA-05.4** Dado a demanda em `entregue`, quando chega `em_construcao` ou `cancelado`, então 409 `conflito`; dado a
  demanda em `encerrada`, quando chega `em_construcao` ou `construido`, então 409. Em todos, nada é gravado.
- **CA-05.5** Dado a demanda em `entregue`, quando chega `construido`, então 204 e o andamento é gravado; dado a demanda
  em `encerrada`, quando chega `cancelado`, então 204 e o andamento é gravado. O status não muda.
- **CA-05.6** Dado a demanda em `devolvida`, quando chega `em_construcao`, então o andamento é gravado e o status
  continua `devolvida`; dado a demanda em `aprovada`, quando chega `construido` ou `cancelado`, então o status continua
  `aprovada`.
- **CA-05.7** Dado a demanda em `aprovada` cujo tipo foi mudado para `estudo` depois da geração, quando chega
  `em_construcao`, então o andamento é gravado e o status continua `aprovada`.
- **CA-05.8** Dado a demanda com DEC v1 (pedido gerado) substituído pelo v2 aprovado, quando chega um envio novo para o
  v1, então 409 `conflito`, nada é gravado e o status não muda.
- **CA-05.9** Dado o andamento gravado igual ao enviado e a demanda já em `entregue` por uma pessoa, quando o mesmo corpo
  chega de novo, então 204 sem gravar (o "mesmo estado" vem antes do 409).
- **CA-05.10** Dado qualquer combinação de status da demanda e de corpo válido, quando enviada, então a demanda nunca
  termina em `entregue` nem `encerrada` por este envio (teste por tabela com os 9 status × 3 `statusConstrucao`).
- **CA-05.11** Dado a demanda posta em `devolvida` pelo CA-05.2, quando uma pessoa muda o status, então as opções são as
  de hoje (`em_construcao`, `em_analise`).

#### RF-06. Histórico: `andamento_registrado` só na mudança de marco

Regra: evento novo `andamento_registrado`, com `entidade = 'pacote_decisao'`, `entidadeId = <DEC-id>`, `demandaId` da
demanda, ator integração `construir` com o prefixo do token, só na mudança de marco (glossário). `depois` tem exatamente
`{ fase, tarefasProntas, tarefasTotal, statusConstrucao }`; `antes` tem as mesmas quatro chaves do andamento anterior,
ou `null` no primeiro. Só enumerações e inteiros (C-30). Grava na mesma transação do andamento. Quando há mudança de
status (RF-05), os dois eventos são gravados. No painel, rótulo pt-BR com o DEC, a fase, "x de y tarefas" e o ator
"/construir (prefixo <prefixo>)"; nunca o token.

- **CA-06.1** Dado a demanda sem andamento, quando chega o primeiro envio, então há exatamente um
  `andamento_registrado` (mais um `status_alterado` se o RF-05 casar).
- **CA-06.2** Dado o andamento `construindo`, quando chega `testando`, então um `andamento_registrado` novo.
- **CA-06.3** Dado o andamento `construindo 9/17`, quando chega `construindo 10/17`, então nenhum evento.
- **CA-06.4** Dado um `andamento_registrado` gravado, quando lido do banco, então `depois` tem só as quatro chaves, com
  valores da lista ou inteiros, `ator_tipo = integracao`, `ator_id = construir` e `ator_token_prefixo` igual ao prefixo
  do token usado.
- **CA-06.5** Dado o histórico da demanda no painel, quando há `andamento_registrado`, então aparece em pt-BR com o
  DEC, a fase, "x de y tarefas" e "/construir (prefixo …)", sem token nem hash.
- **CA-06.6** Dado um ciclo completo simulado de um pedido de 20 tarefas (seis fases, `tarefasProntas` de 0 a 20 uma a
  uma e `construido` no fim), quando todos os envios chegam, então o número de `andamento_registrado` é no máximo 7.

#### RF-07. Próxima ação depois de `construido`

Regra: com a demanda em `em_construcao` e o andamento do DEC vigente em `construido`, a Próxima ação é "Construção
concluída: confira e marque como entregue.", quem age "Uma pessoa", com link para Mudar status. Avaliada antes da linha
11 de hoje. Nos demais casos, a Próxima ação é a de hoje.

- **CA-07.1** Dado a demanda em `em_construcao` com andamento `construido`, quando o detalhe é aberto, então a Próxima
  ação mostra o texto acima, "Uma pessoa" e o link para Mudar status.
- **CA-07.2** Dado a demanda em `em_construcao` com andamento `em_construcao` ou sem andamento, quando aberta, então a
  Próxima ação é a linha 11 de hoje.
- **CA-07.3** Dado o CA-07.1, quando uma pessoa marca `entregue`, então a Próxima ação é a linha 1 de hoje ("Nada. A
  demanda está em Entregue.").

#### RF-08. Selo de fase na fila

Regra: na fila (tabela e cartões), a demanda em `em_construcao` com andamento mostra o selo de fase: rótulo pt-BR da fase
e, quando `tarefasTotal > 0`, " · x/y" (ex.: "Construindo · 9/17"). Com `statusConstrucao = construido`, o selo diz que a
construção terminou (texto final da etapa 03). Demanda sem andamento ou em outro status não tem selo. Sem filtro novo.
O selo é texto, não só cor.

- **CA-08.1** Dado a demanda em `em_construcao` com andamento `construindo 9/17`, quando a fila é aberta, então a linha e
  o cartão mostram "Construindo · 9/17".
- **CA-08.2** Dado o andamento `entendendo_o_pedido 0/0`, quando aberta, então o selo é só "Entendendo o pedido".
- **CA-08.3** Dado o andamento `construido`, quando aberta, então o selo diz que a construção terminou.
- **CA-08.4** Dado uma demanda em `em_construcao` sem andamento, e outra em `devolvida` com andamento, quando aberta,
  então nenhuma das duas tem selo.
- **CA-08.5** Dado a fila com selos, quando o axe roda em 1280 × 720 e 390 × 844, então nenhuma violação.

#### RF-09. Andamento no detalhe da demanda

Regra: o detalhe mostra, quando há andamento: o DEC de origem (link), a fase em pt-BR, o `statusConstrucao` em pt-BR,
"x de y tarefas" com barra de progresso acessível quando `tarefasTotal > 0`, e "Atualizado em <data e hora>" em
`<time>`. Sem andamento, a seção não aparece. A mudança manual de status continua como está.

- **CA-09.1** Dado o andamento `construindo 9/17` atualizado em T, quando o detalhe é aberto, então aparecem a fase
  "Construindo", "9 de 17 tarefas", uma barra com valor 9 e máximo 17 com nome acessível, e "Atualizado em" com T no
  fuso do sistema dentro de `<time datetime>`.
- **CA-09.2** Dado `tarefasTotal = 0`, quando aberto, então não há barra e o texto diz que o plano de tarefas ainda não
  foi feito (texto final da 03).
- **CA-09.3** Dado `statusConstrucao = cancelado`, quando aberto, então a seção diz que a construção foi cancelada no
  `/construir`.
- **CA-09.4** Dado a demanda sem andamento, quando aberta, então a seção não existe.
- **CA-09.5** Dado o detalhe com andamento, quando o axe roda em 1280 × 720 e 390 × 844, então nenhuma violação.

#### RF-10. Andamento na leitura do Awave

Regra: a vista do Awave (seis chaves da 0.3.0) ganha a sétima chave `andamento`: `{ fase, tarefasProntas,
tarefasTotal, atualizadoEm }` (exatamente quatro chaves, sem `statusConstrucao` e sem `decId`), ou `null` sem
andamento. Continua só da demanda que o Awave criou; a de outro autor dá o 404 igual ao de inexistente (IN-08). O 201 do
`POST /api/demandas` usa a mesma vista, com `andamento: null`, e continua igual ao GET (CA-07.4 da 0.3.0).

- **CA-10.1** Dado uma demanda do Awave com andamento `construindo 9/17`, quando o token `awave` faz `GET
  /api/demandas/:id`, então 200 com exatamente `id`, `titulo`, `tipo`, `status`, `criadaEm`, `atualizadaEm` e
  `andamento`, e `andamento` com exatamente `fase`, `tarefasProntas`, `tarefasTotal`, `atualizadoEm`.
- **CA-10.2** Dado uma demanda do Awave sem andamento, quando lida, então `andamento` é `null`.
- **CA-10.3** Dado uma demanda de pessoa com andamento, quando o token `awave` a lê, então 404 igual byte a byte ao de id
  inexistente.
- **CA-10.4** Dado o token `awave`, quando cria uma demanda, então o 201 tem as sete chaves com `andamento: null`, e o GET
  seguinte devolve o mesmo objeto.
- **CA-10.5** Dado a demanda do Awave levada a `devolvida` pelo `cancelado`, quando lida, então `status` é `devolvida` e
  `andamento` não tem `statusConstrucao`.

#### RF-11. Andamento nas vistas de pessoa e de agente

Regra: a vista inteira (pessoa) de `GET /api/demandas/:id` ganha `andamento` com os seis campos, ou `null`. A vista
mínima de agente e de sistema não muda (lista de permissão: o campo novo não sai para agente). A listagem `GET
/api/demandas` não muda.

- **CA-11.1** Dado a demanda com andamento, quando uma pessoa a lê pela API, então `andamento` tem `decId`, `fase`,
  `tarefasProntas`, `tarefasTotal`, `statusConstrucao` e `atualizadoEm`.
- **CA-11.2** Dado a mesma demanda, quando um agente a lê, então as chaves da resposta são as mesmas da 0.3.1, sem
  `andamento`.
- **CA-11.3** Dado a listagem `GET /api/demandas`, quando lida por pessoa ou agente, então as chaves de cada item são as
  da 0.3.1.

#### RF-12. Limite de gravações de andamento

Regra: limite próprio da integração `construir` para `registrar_andamento`, no mesmo mecanismo da 0.3.0 (tabela por
integração, trava consultiva, janela móvel de 60 min): no máximo **60 gravações por DEC** e **600 gravações no total**
na janela. Acima, 429 `limite_excedido`, sem gravar. Conta só a gravação de andamento; envio no mesmo estado não grava
e não conta. Os limites do `awave`, de pessoa e de agente não mudam.

- **CA-12.1** Dado 60 gravações de um DEC nos últimos 60 minutos, quando chega a 61ª com estado diferente, então 429 e
  nada é gravado.
- **CA-12.2** Dado uma gravação, quando chegam 200 envios no mesmo estado, então todos respondem 204.
- **CA-12.3** Dado o DEC A no limite, quando chega uma gravação do DEC B, então 204; dado 600 gravações somadas em
  vários DEC, quando chega a 601ª, então 429.
- **CA-12.4** Dado o ritmo do `/construir` (30 envios com estados diferentes em 60 minutos para um DEC, um a cada 2
  minutos), quando chegam, então todos respondem 204.
- **CA-12.5** Dado 59 gravações de um DEC, quando chegam duas gravações ao mesmo tempo, então só uma passa e a outra
  recebe 429.
- **CA-12.6** Dado o teste do limite do Awave e o de pessoa e agente, quando rodam, então os números (10, 30, 60)
  continuam os mesmos.

#### RF-13. Versão e documentação

Regra: `package.json` na 0.4.0; CHANGELOG com a 0.4.0; manual técnico cap. 05 com a rota, o contrato, a tabela de
transições, o evento, o limite e a A3; caps. 08 e 09 atualizados onde descrevem a fila, o detalhe e a vista do Awave;
`docs/operacao/` com o roteiro de implantação e de volta. Nenhum valor de token, `.env` ou dado pessoal.

- **CA-13.1** Dado o ramo, quando lido, então `package.json` tem `"version": "0.4.0"` e o CHANGELOG tem a seção 0.4.0
  com a rota, o selo, o detalhe, a vista do Awave e a migration.
- **CA-13.2** Dado o cap. 05, quando lido, então descreve a rota, as respostas (204, 404, 409, 422, 429, 503), a tabela
  da seção 5 deste documento, o `andamento_registrado` e a A3.
- **CA-13.3** Dado `docs/operacao/`, quando lido, então traz: backup antes, migration com o migrator, deploy do `worker`
  e depois do `app`, sem snapshot (D5); a volta pelo caminho B; trocar `"andamento_ligado"` para `true` só depois do
  deploy; a conferência de que a fase aparece na fila em até 2 minutos; e, em `tokens-de-integracao.md`, que o token
  `construir` ganhou a ação sem mudar a emissão.

### 3. Requisitos não funcionais

| Id | Requisito | Número e verificação |
|---|---|---|
| RNF-01 | Tempo de resposta | `POST .../andamento`: p95 ≤ 1 s e nenhuma acima de 5 s em 50 chamadas na homologação, com 200 DEC e 20 mil eventos. O cliente corta em 15 s. Orçamento do servidor igual ao das outras rotas do `construir` (`padrao`, ADR-28): estouro → 503 `indisponivel`, nada gravado |
| RNF-02 | Volume | O `/construir` envia no máximo 1 vez a cada 2 min por pedido, só quando o estado muda (≤ 30/h por pedido); até 20 pedidos em curso. Limite do RF-12: 60 por DEC e 600 no total por hora |
| RNF-03 | Histórico sem texto livre (C-30, IN-12) | `andamento_registrado` e o `status_alterado` do `construir` só com enumerações, inteiros, ids e o prefixo. Teste de sentinelas da 0.3.0 estendido à rota nova (resposta, evento, log, Sentry falso, esquema `pgboss`) |
| RNF-04 | Segredo e log | Token nunca em log, Sentry, evento, resposta ou documentação; linha de log da rota só com `atorTipo` (como a 0.3.0) |
| RNF-05 | Migration só aditiva | Uma migration gerada; nenhuma coluna removida; nenhuma migration da `main` editada; `alteram_dado = false` no ensaio de rollback aprovado; privilégio novo do papel do app só o necessário para gravar o andamento, conferido por `privilegios.test.ts`; nenhum `UPDATE` ou `DELETE` em `evento` (C-34) |
| RNF-06 | Concorrência | Envios simultâneos do mesmo DEC: no máximo uma gravação e um evento para o mesmo estado; envio e mudança manual de status simultâneos ficam em fila pela trava da demanda, e o resultado segue a tabela da seção 5 lida depois da trava |
| RNF-07 | Compatibilidade | 0 mudança em `enviar-andamento.mjs` e `lib/andamento.mjs`. Teste de contrato com a requisição exata do `/construir` (POST, Bearer, `content-type` e `accept` JSON, sem `Origin`, sem cookie, corpo de quatro chaves) e o cenário V-02 (seção 7). O 201 do Awave com a chave nova não quebra o teste de contrato do Awave da 0.3.0 |
| RNF-08 | Nenhum controle afrouxado | C-09, C-10, C-11, C-15, C-17, C-30, C-34, C-36, IN-01 a IN-18 e axe com os mesmos testes verdes; nenhum teste apagado ou enfraquecido |
| RNF-09 | Qualidade | `pnpm test`, `pnpm lint` e `pnpm typecheck` verdes; `pnpm test:e2e` verde 3 vezes seguidas; axe sem violação na fila e no detalhe da demanda em 1280 × 720 e 390 × 844 |
| RNF-10 | Retenção | O andamento não tem dado pessoal; segue a retenção da demanda. O evento é permanente, como os demais. Sem regra nova de expurgo |

### 4. Contrato da rota (fixado pelo `/construir`)

| Entrada | Resposta | O que o `/construir` faz (`andamento.mjs`) |
|---|---|---|
| Corpo válido, DEC com pedido gerado, gravado ou mesmo estado | 204 | `enviado` |
| DEC inexistente, sem pedido gerado ou gerado por não pessoa | 404 (igual nos três) | `fora_do_orquestrador`, não repete até o estado mudar |
| DEC substituído; contradição com status final | 409 | `recusado`, não repete até mudar |
| JSON fora do formato | 422 | `recusado` |
| JSON malformado | 400 | `recusado` |
| Token inválido ou revogado / sem permissão | 401 / 403 | para a volta inteira |
| Limite do RF-12 | 429 | `erro`, repete na volta seguinte |
| Tempo esgotado no servidor | 503 | `erro`, repete na volta seguinte |

### 5. Tabela de decisão: status da demanda × `statusConstrucao` (DEC vigente, estado novo)

| Status da demanda | `em_construcao` | `construido` | `cancelado` |
|---|---|---|---|
| `nova`, `em_analise`, `aguardando_informacao`, `pronta_para_decisao` | grava | grava | grava |
| `aprovada` | grava e vai para `em_construcao` (estudo: só grava) | grava | grava |
| `em_construcao` | grava | grava; Próxima ação do RF-07 | grava e vai para `devolvida` |
| `devolvida` | grava | grava | grava |
| `entregue` | 409 | grava | 409 |
| `encerrada` | 409 | 409 | grava |

"Grava" sem mais nada: o status não muda. Mesmo estado responde 204 em qualquer linha, sem gravar (CA-05.9). DEC não
vigente responde 409 em qualquer linha (CA-05.8).

### 6. Fora do escopo

- A tool `consultar_demanda` e o vínculo contato↔demanda no Awave (E01, parte 3).
- Prazo, previsão ou data estimada de qualquer tipo.
- Texto livre no corpo: nome de tarefa, arquivo, agente ou erro.
- O `/construir` marcar `entregue` ou `encerrada` (A1); qualquer transição automática além das duas do RF-05.
- Andamento para pedido escrito direto, sem demanda gerada no painel (A3): recebe 404.
- Evento por tarefa pronta (A2).
- Filtro da fila por fase; andamento na listagem `GET /api/demandas`; andamento na vista de agente.
- Token novo ou mudança na emissão: o `construir` da 0.3.0 ganha a ação pela matriz.
- Qualquer mudança em `enviar-andamento.mjs`, `lib/andamento.mjs`, `buscar-pedidos.mjs` ou no `awave-agents`.
- Deploy, migration em produção, troca de `"andamento_ligado"` e conferência em produção: ações de Fabiano depois do
  merge.

### 7. Matriz de rastreabilidade

#### 7.1 Critérios preliminares do pedido → requisitos

| Critério preliminar (pedido.json) | RF / RNF | Critérios-chave |
|---|---|---|
| CP-1 Token construir com POST andamento válido para DEC com pedido gerado responde 204 e a fila e o detalhe mostram fase e x de y | RF-01, RF-02, RF-03, RF-04, RF-08, RF-09 | CA-01.1, CA-02.1, CA-04.1, CA-08.1, CA-09.1 |
| CP-2 Demanda em aprovada com status em_construcao vai para em_construcao, com evento de status pelo ator construir | RF-05, RF-06 | CA-05.1, CA-06.1 |
| CP-3 status construido não muda o status e a Próxima ação pede a uma pessoa que marque entregue | RF-05, RF-07 | CA-05.3, CA-05.10, CA-07.1, CA-07.3 |
| CP-4 status cancelado com a demanda em em_construcao leva a devolvida | RF-05 | CA-05.2, CA-05.11 |
| CP-5 O mesmo corpo enviado duas vezes não cria evento nem altera atualizadoEm | RF-04, RF-06, RNF-06 | CA-04.2, CA-05.9, CA-06.3 |
| CP-6 DEC sem pedido gerado ou inexistente responde 404 igual; campo a mais, fase fora da lista ou prontas > total responde 422 sem gravar | RF-02, RF-03 | CA-02.2, CA-02.3, CA-03.1 a CA-03.4 |
| CP-7 Tokens awave, agente e pessoa recebem 403 em registrar_andamento; o teste transversal da matriz cobre a ação nova | RF-01 | CA-01.2 a CA-01.6 |
| CP-8 Token awave lê o andamento só da própria demanda; de outro autor continua 404 | RF-10 | CA-10.1 a CA-10.5 |
| CP-9 O enviar-andamento.mjs do /construir passa contra a homologação da 0.4.0 com um pedido fictício | RF-02 a RF-05, RNF-07 | Cenário V-02 (7.3) |

#### 7.2 Cobertura complementar

| Origem | Item | RF / RNF |
|---|---|---|
| ESP (1) | Ação só do `construir`; o `construir` não ganha outra | RF-01 |
| ESP (2) | Rota, corpo fechado, 404 sem oráculo, 422 | RF-02, RF-03 |
| ESP (3) | Último andamento na demanda, Zod, migration aditiva | RF-04, RNF-05 |
| ESP (4) | Duas transições; `construido` sem mudança; 409 em status final | RF-05, RF-07, seção 5 |
| ESP (5) | Idempotência | RF-04 |
| ESP (6) | Evento só na mudança de fase ou status, com ator, prefixo e números (A2) | RF-06 |
| ESP (7) | Selo na fila, detalhe com fase, barra e atualização, mudança manual como está | RF-08, RF-09, CA-05.11 |
| ESP (8) | Vista do Awave com `andamento` de quatro campos, sem `statusConstrucao` | RF-10 |
| ESP (9) | Limite por integração com folga para 1 envio a cada 2 min por pedido | RF-12, RNF-02 |
| ESP (10) | CHANGELOG, 0.4.0, cap. 05, `docs/operacao` | RF-13 |
| ESP, Fora | `consultar_demanda`, prazo, texto livre, `entregue`/`encerrada` pelo `/construir`, A3 | Seção 6, CA-05.10, RF-03 |
| RSK | Token vazado: só esta ação, só DEC com pedido gerado, nunca `entregue`, revogação pelo prefixo | RF-01, RF-03, RF-05, RNF-04 |
| RSK | Transição errada: só duas, com origem fixa; correção manual | RF-05 (CA-05.10, CA-05.11) |
| RSK | Número de tarefas que volta | CA-04.4 |
| RSK | Histórico grande | RF-06 (CA-06.6) |
| RSK | Texto livre pela rota; teste de sentinelas | RF-02 (CA-02.4), RNF-03 |
| RSK | Migration aditiva, backup, caminho B | RNF-05, CA-13.3 |
| RSK | Nenhum controle afrouxado | RNF-08 |
| Definição de pronto | test, lint, typecheck; e2e 3 vezes; ensaio de rollback; manual e operação; CHANGELOG e 0.4.0 | RNF-09, RNF-05, RF-13 |
| Insumo, crit. 9 | Orquestrador fora do ar não para o `/construir` | Coberto do lado do `/construir`; aqui só o 503 do RNF-01 |

#### 7.3 Cenário V-02 (CP-9)

Homologação da 0.4.0 no ar com seed fictício: uma demanda em `aprovada` com DEC vigente e pedido gerado por pessoa, e um
DEC aprovado sem pedido gerado. Token `construir` emitido dentro da homologação pelo script, em arquivo 600 numa pasta
temporária fora do repositório, apagado no fim. Com `CONSTRUIR_PEDIDOS` e `CONSTRUIR_PROJETOS` apontando para pastas
temporárias (config com `"andamento_ligado": true`, `url` da homologação e `token_arquivo`; os dois `<DEC-id>.json`
fictícios; `passagens.jsonl` fictício para cada um):

1. `node ferramentas/construir/enviar-andamento.mjs --estado <tmp>` sai 0; a linha do DEC com pedido gerado termina em
   `enviado (HTTP 204)` e a do outro em `fora_do_orquestrador (HTTP 404)`;
2. a demanda fica em `em_construcao`, com andamento e um `andamento_registrado`;
3. a segunda execução com o mesmo `--estado` imprime `nada mudou` e não cria evento.

### 8. Pendências abertas

Listadas em `## Pendências`. Nenhuma bloqueia a etapa 02.

## Decisões tomadas

- Base 0.3.1 (`0ac099a`) em vez da 0.3.0 citada na ESP: é a `main` atual e nada nela muda o contrato do andamento.
- 422 para JSON válido fora do formato, mesmo com o adaptador devolvendo 400 por Zod hoje: a ESP e o CP-6 pedem 422;
  JSON malformado, 415 e 413 continuam do adaptador, e o `/construir` trata 400 e 422 do mesmo jeito.
- Corpo conferido antes do DEC (422 igual para DEC existente ou não): mesma ordem do recebimento da 0.3.0 (D-04), sem
  oráculo.
- Teto de 999 em `tarefasTotal`: os ids `Tnn` do `/construir` vão até 99; o teto só barra número absurdo e não afeta o
  envio real.
- "Pedido gerado" = `pedido_gerado` com ator pessoa (IN-10): a ESP manda seguir as leituras da T10, que já usam essa
  regra.
- `decId` guardado junto com o andamento (seis campos para pessoa): a demanda pode ter mais de um DEC com pedido gerado;
  sem ele o painel não diz de qual pedido é o andamento. O Awave continua só com os quatro campos da ESP.
- DEC substituído recebe 409 sem gravar: sem isso, o `cancelado` de um pedido antigo poria em `devolvida` a demanda que
  está em construção pelo pedido novo. Restringe a ESP, não a contradiz (pendência P-01).
- Tabela de contradição com status final (seção 5): `construido` combina com `entregue` e `cancelado` combina com
  `encerrada`; o resto contradiz. A ESP diz "o que o contradiz" sem a tabela (pendência P-02).
- "Mesmo estado" conferido antes dos 409: um reenvio igual ao gravado não muda nada e não deve virar erro no log do
  `/construir`.
- Mudança de `decId` conta como mudança de marco: o histórico precisa registrar que o andamento passou a ser de outro
  pedido.
- Demanda do tipo `estudo` não vai para `em_construcao` pela transição automática: é a mesma regra da manual.
- Gravar andamento não mexe em `demanda.atualizadaEm`, que segue só a mudança de status e de campo: o andamento tem a
  data própria, e o Awave lê as duas.
- Limite conta só gravações: contar todo envio exigiria gravar a cada requisição, o que contradiz a idempotência da ESP
  (5). 60 por DEC é o dobro do ritmo do `/construir` (30/h); 600 cobre 20 pedidos em curso (pendência P-03).
- `andamento: null` no 201 do Awave: o CA-07.4 da 0.3.0 exige 201 igual ao GET.
- Andamento fora da vista de agente e da listagem: lista de permissão da 0.3.0; ninguém pediu.

## Pendências

- **P-01** (Fabiano, não bloqueia): andamento de DEC substituído por um aprovado mais novo responde 409 sem gravar
  (CA-05.8). Se não decidir, vale isso.
- **P-02** (Fabiano, não bloqueia): tabela de contradição com status final da seção 5 (`entregue` aceita `construido`;
  `encerrada` aceita `cancelado`; o resto é 409). Se não decidir, vale a tabela.
- **P-03** (Fabiano, não bloqueia): números do limite, 60 gravações por DEC e 600 no total por hora. Mudar o número é
  decisão por pedido (ADR-24). Se não decidir, valem esses.
- **P-04** (`arquiteto-solucoes`, etapa 02): armazenamento do andamento (coluna `jsonb` na demanda ou tabela própria),
  como contar as gravações do RF-12 sem gravar no envio idempotente, a trava usada (do pedido, da demanda ou as duas) e
  o privilégio mínimo do papel do app, sem tocar `colunasUpdate` além do necessário.
- **P-05** (`arquiteto-solucoes`, etapa 02): dizer se a volta da 0.4.0 para a 0.3.1 funciona sem restaurar (a 0.3.1 lendo
  `andamento_registrado` e `status_alterado` com ator `construir` no histórico) ou só pelo caminho B, e registrar no
  `docs/operacao`.
- **P-06** (`ux-ui-design`, etapa 03): textos finais dos rótulos das fases, do selo de `construido`, da seção do detalhe
  (incluindo `tarefasTotal = 0` e `cancelado`), do evento no histórico e das mensagens 409 (DEC substituído, status final)
  e 429.
- **P-07** (`tech-lead`, etapa 05): montagem do V-02, com seed da homologação (demanda em `aprovada` com DEC de pedido
  gerado por pessoa, e DEC sem pedido gerado) e `passagens.jsonl` fictícios válidos para o `calcularEstado` do
  `/construir`.
- **P-08** (Fabiano, fora do `/construir`): a tool do Awave (`awave-agents`, 0ab8ced) não foi lida nesta etapa; o 201
  ganha a chave `andamento: null`. Do lado de cá, o teste de contrato da 0.3.0 cobre; conferir do lado do Awave antes de
  ligar a parte 3 da E01.
- **P-09** (`seguranca-aplicacao`, etapa 04): avaliar a primeira ação de escrita do token `construir` em demanda (RSK
  médio) e estender as sentinelas e o T13 à rota nova.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo ou sair do repositório.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] todo item de `criterios_aceite_preliminares` do pedido aparece na matriz
- [x] todo RF tem ao menos um critério Dado/Quando/Então verificável
- [x] nenhum requisito contradiz a especificação (ESP) ou o parecer de risco (RSK) do pedido
- [x] o que fica fora do escopo está listado
- [x] o texto não tem dado pessoal real, segredo nem valor de `.env`
