---
pedido: DEC-DEM-20261111-0016-v1
etapa: 01-requisitos
agente: analista-requisitos
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, pedidos/insumos/2026-11-11_orquestrador-integracao-awave.md (partes 1 e 2), ferramentas/construir/buscar-pedidos.mjs, ferramentas/construir/lib/buscar-pedidos.mjs, docs/manual-tecnico/05-pedido-de-construcao.md, docs/construcao/DEC-DEM-20261110-0015-v1/01-analista-requisitos.md (formato), docs/construcao/DEC-DEM-20261110-0015-v1/05-tech-lead.md (vigilância de origem), src/modules/acesso/matriz.ts, src/modules/acesso/ator.ts, src/modules/acesso/resolver-ator.ts, src/modules/acesso/tokens-servico.ts, src/modules/acesso/mensagens.ts, src/db/schema/acesso.ts, src/db/schema/historico.ts, src/db/schema/demandas.ts, src/db/privilegios.ts, src/modules/limites.ts, src/modules/demandas/servico.ts, src/modules/demandas/consultas.ts, src/modules/demandas/schemas.ts, src/modules/demandas/transicoes.ts, src/modules/agentes/gatilhos.ts, src/modules/historico/registrar.ts, src/modules/pedido-construcao/gerar.ts, src/lib/rota.ts, src/lib/erros.ts, src/proxy.ts, src/app/api/demandas/route.ts, src/app/api/demandas/[id]/route.ts, src/app/api/pacotes-decisao/[decId]/pedido-construcao/route.ts, src/app/(painel)/demandas/[id]/acoes.ts, scripts/criar-token-servico.ts, scripts/revogar-token-servico.ts]
status: pronto
proximo: arquiteto-solucoes
devolvido_para: null
---

## Entrega

### 0. Contexto e regra de leitura

Demanda do tipo `melhoria` sobre a `main` com a 0.2.0 (a9fd9b8). Sai como 0.3.0. Duas integrações internas ganham
acesso próprio e mínimo ao Orquestrador, pela opção A aprovada no DEC: um tipo de ator novo, `integracao`, fora dos
agentes de IA.

- **Parte 1, `awave`:** o Awave abre demanda pela API, quando o dono aprova em `/aprovacoes` do Awave, e lê só as
  demandas que ele mesmo criou. O lado do Awave está pronto (`awave-agents`, commit 0ab8ced) e define o contrato da
  seção 4.
- **Parte 2, `construir` (CA-F-01):** o `/construir` busca sozinho o Pedido de Construção que uma pessoa gerou no
  painel. O lado do `/construir` está pronto e desligado (`buscar-pedidos.mjs`, commit dfedf16) e também define um
  contrato (seção 4).

Numeração: RF-NN, RNF-NN e CA-NN.n deste documento valem **só para este pedido**. Requisito do sistema é citado pelo
capítulo do manual técnico (ex.: "cap. 05, RF-22", passos 1 a 12 da ordem de conferências). Controles citados pelo
código: C-09 (token de serviço), C-10 (matriz), C-11 (autoria só do ator), C-15 (CSRF), C-17 (regex de id), C-28
(dado pessoal no pedido), C-30 (evento sem texto livre), C-34 (privilégios do papel do app), C-36 (limite por ator).

### 1. Glossário

| Termo | Significado neste pedido |
|---|---|
| Integração | Sistema interno da empresa que chama a API com token de serviço próprio e não é agente de IA. Valores: `awave` e `construir`. Lista fechada |
| Ator de integração | O ator resolvido de um token de integração: `{ tipo: 'integracao', integracao, prefixoToken }` (forma final na etapa 02) |
| Agente de IA | Só os quatro de `AGENTES`: `orquestrador`, `insumo_tecnico`, `risco`, `consolidacao`. Integração **não** é agente |
| Token de serviço | `wsod_` + 43 caracteres base64url; o banco guarda só o SHA-256; o prefixo (8 caracteres depois de `wsod_`) identifica o token no histórico e na revogação |
| Origem da demanda | Quem criou a demanda, lido da autoria gravada (`autorTipo`, `autorId`), nunca do `solicitanteNome`: Pessoa, Agente de IA ou Awave |
| Demanda do Awave | Demanda com autoria da integração `awave` |
| Confirmação | Ato de uma pessoa com sessão e 2FA que aceita a demanda do Awave para seguir o fluxo automático; é o que dispara o `insumo_tecnico` (D1) |
| Pedido gerado | DEC com o evento `pedido_gerado` (cap. 05, RF-22, passo 12). Só pessoa gera |
| Aprovado vigente | O DEC aprovado que não foi substituído por um aprovado mais novo da mesma demanda (cap. 04, Substituição) |
| Pendente (de entrega) | DEC com pedido gerado, ainda aprovado vigente, não desatualizado, com a demanda fora de status final (`entregue`, `encerrada`) e sem `pedido_recebido` |
| Entrega | A resposta da API com o JSON do pedido para a integração `construir` |
| Recebimento | A confirmação, pela integração `construir`, de que gravou o pedido, com o SHA-256 dos bytes recebidos |
| Janela do limite | Os 60 minutos anteriores ao instante da requisição, pelo relógio injetado (janela móvel, a mesma do C-36 hoje); "na mesma hora" quer dizer isso |

### 2. Requisitos funcionais

#### RF-01. Ator de integração com token próprio

Regra: existe um tipo de ator novo, `integracao`, com os valores `awave` e `construir`. Ele entra na API só por
`Authorization: Bearer <token>`, com o mesmo formato, a mesma geração (32 bytes aleatórios) e o mesmo armazenamento (só
o SHA-256) dos tokens de agente. Token revogado, inexistente ou fora do formato responde 401 com a mesma mensagem de
hoje ("Token de serviço inválido ou revogado."), sem dizer qual dos três. Cookie de sessão junto com `Authorization`
continua 400. Integração não é agente: não está em `AGENTES` e nenhuma regra que percorre `AGENTES` a alcança.

- **CA-01.1** Dado um token `awave` ativo, quando ele chama uma ação permitida, então o ator resolvido é
  `integracao`/`awave` com o prefixo do token, e não um agente.
- **CA-01.2** Dado um token `construir` ativo, quando ele chama uma ação permitida, então o ator resolvido é
  `integracao`/`construir` com o prefixo.
- **CA-01.3** Dado um token `awave` revogado, quando ele faz `POST /api/demandas`, então a resposta é 401 com
  `mensagem` "Token de serviço inválido ou revogado." e nada é gravado.
- **CA-01.4** Dado um token `awave` e um token de cada agente ativos e uma pessoa com sessão, quando o token `awave` é
  revogado, então os tokens dos agentes, o token `construir` e a sessão continuam aceitos nas ações que já tinham.
- **CA-01.5** Dado um token `construir` revogado, quando ele chama `GET /api/pedidos-construcao/pendentes`, então a
  resposta é 401 com a mesma mensagem do CA-01.3.

#### RF-02. Emissão, troca e revogação dos tokens de integração

Regra: os scripts existentes `scripts/criar-token-servico.ts` e `scripts/revogar-token-servico.ts` emitem e revogam
também o token de integração. A criação aceita a integração por um argumento próprio (nome final na etapa 02; o insumo
sugere `--integracao awave|construir`), exatamente um entre agente e integração, e recusa qualquer outro argumento
(`strictObject`, C-37). O token aparece uma vez na saída padrão e nunca em log, evento ou erro. O evento `token_criado`
(ator `sistema`) leva só a integração e o prefixo. A revogação continua pelo prefixo, sem mudar de forma. Troca =
emitir um token novo e depois revogar o antigo pelo prefixo; os dois valem ao mesmo tempo até a revogação (como hoje
para agente).

- **CA-02.1** Dado o banco migrado, quando se roda a criação com a integração `awave`, então sai 0, a saída mostra o
  prefixo e o token uma vez, o banco tem uma linha com a integração `awave`, o hash e o prefixo (sem o token), e o
  histórico tem `token_criado` com `{ integracao: 'awave', prefixo }`.
- **CA-02.2** O mesmo do CA-02.1 para `construir`.
- **CA-02.3** Dado o script de criação, quando ele recebe integração fora da lista (ex.: `jarvis`), agente e
  integração juntos, nenhum dos dois, ou `--token`, então sai com erro de argumento e nada é gravado.
- **CA-02.4** Dado um token `awave` ativo, quando se roda a revogação com o prefixo dele, então sai 0, o token passa a
  responder 401 e o histórico tem `token_revogado` com o prefixo; rodar de novo sai 1 sem gravar evento.
- **CA-02.5** Dado um token `awave` antigo ativo, quando se emite um novo e se revoga o antigo, então o novo é aceito e
  o antigo responde 401.
- **CA-02.6** Dado qualquer execução dos scripts, quando se leem o log e os eventos gravados, então o token (o texto
  depois de `wsod_`, além do prefixo) não aparece.

#### RF-03. Matriz de acesso por integração, com lista fechada

Regra: cada ação da matriz ganha a lista das integrações permitidas; ação sem a lista nega toda integração. A linha
`LEITURA` (dos agentes) não inclui integração. Permissões, e nada além delas:

| Integração | Ações permitidas |
|---|---|
| `awave` | `criar_demanda`, `ler_demanda` (só a própria, RF-07) |
| `construir` | `listar_pedidos_pendentes`, `entregar_pedido`, `confirmar_recebimento_pedido` (ações novas) |

As três ações novas não têm pessoa nem agente. A ação nova de confirmação de demanda do Awave (RF-06) é só de pessoa.
Nenhuma ação existente muda de dono para pessoa ou agente. O teste transversal da matriz (`atoresProibidos`) passa a
listar também as integrações proibidas em cada ação, e o teste que percorre as rotas (T13, pelo `meta` de cada handler)
cobre as rotas novas.

- **CA-03.1** Dado um token `awave`, quando ele chama cada rota da API cuja ação não é `criar_demanda` nem
  `ler_demanda` (inclusive `GET /api/demandas`, ESP, RSK, DEC, decisão, pedido, texto bruto, entrada, histórico,
  agentes, teto e as três rotas de `pedidos-construcao`), então a resposta é 403 com a mensagem de sem permissão e nada
  é gravado.
- **CA-03.2** Dado um token `construir`, quando ele chama qualquer rota fora das três de `pedidos-construcao`
  (inclusive `POST /api/demandas` e `GET /api/demandas/:id`), então a resposta é 403.
- **CA-03.3** Dado o token de cada um dos quatro agentes e o token `awave`, quando chamam as três rotas de
  `pedidos-construcao`, então a resposta é 403.
- **CA-03.4** Dada uma pessoa com sessão e 2FA, com `Origin` correto e `content-type: application/json` (para passar
  pelo C-15), quando chama as três rotas de `pedidos-construcao`, então a resposta é 403.
- **CA-03.5** Dada a função `atoresProibidos(acao)`, quando chamada para cada ação de `ACOES`, então a lista traz
  `awave` em toda ação fora de `criar_demanda` e `ler_demanda`, e `construir` em toda ação fora das três novas; o teste
  transversal falha se uma integração for permitida em ação que não está na tabela acima.
- **CA-03.6** Dado um ator de integração com valor fora da lista (ex.: montado à mão num teste), quando passa por
  `autorizar` em qualquer ação, então é negado.

#### RF-04. O Awave cria demanda (contrato da seção 4)

Regra: `POST /api/demandas` com token `awave` aceita o corpo do contrato do Awave e grava:

- autoria = integração `awave` (nunca do corpo, C-11);
- `rascunhoAgente = true` (fixo para a autoria `awave`; continua imutável, C-11 e C-34);
- `solicitanteNome = "Awave"`, seja qual for o valor do corpo (o campo continua obrigatório no schema, para o contrato
  não mudar; o valor enviado é descartado);
- `status = 'nova'`, demais campos como hoje, campo a campo;
- o evento `demanda_criada` com ator `integracao`/`awave`, o prefixo do token e `depois` só com enumerações
  (`{ status: 'nova', tipo }`), sem texto livre (C-30).

Resposta: 201 com a vista do Awave (RF-07), em que `id` segue `DEM-AAAAMMDD-NNNN`. Erros no formato `{ erro, mensagem }`
de hoje: 400 para corpo fora do schema, 401, 403, 429. O Awave não recebe 3xx (ele não segue redirecionamento).

- **CA-04.1** Dado um token `awave` e o corpo
  `{ "titulo": "Relatório semanal fictício", "tipo": "melhoria", "solicitanteNome": "Awave", "solicitantePapel": "outro", "descricaoProblema": "Texto fictício.", "contexto": "Demanda aberta pelo agente \"jarvis\" do Awave, com aprovação do dono em /aprovacoes." }`,
  quando faz `POST /api/demandas` sem `Origin`, então a resposta é 201, o corpo tem `id` que casa com
  `^DEM-\d{8}-\d{4}$` e `status: "nova"`.
- **CA-04.2** Dada a demanda do CA-04.1, quando se lê o banco, então `autor_tipo` e `autor_id` identificam a
  integração `awave`, `rascunho_agente` é `true`, `solicitante_nome` é `Awave` e `status` é `nova`.
- **CA-04.3** Dado o mesmo POST com `"solicitanteNome": "Maria Ficticia"`, quando a demanda é criada, então
  `solicitante_nome` é `Awave`.
- **CA-04.4** Dado o mesmo POST com `autorTipo`, `autorId` ou `rascunhoAgente` no corpo, quando a demanda é criada,
  então a autoria e o rascunho gravados são os do CA-04.2 (chave desconhecida descartada).
- **CA-04.5** Dada a demanda do CA-04.1, quando uma pessoa lê o histórico dela, então há um evento `demanda_criada`
  com ator Awave e o prefixo do token, sem o token, sem o título, sem a descrição e sem o contexto.
- **CA-04.6** Dado um POST com `tipo` fora da lista ou sem `titulo`, quando o token `awave` envia, então a resposta é
  400 com `{ erro, mensagem }`, sem `id` consumido da sequência.
- **CA-04.7** Dada a demanda do CA-04.1, quando uma pessoa abre a fila do painel, então a demanda aparece com o selo
  de rascunho e a origem "Awave" (RF-10).

#### RF-05. Sem disparo automático do insumo técnico para demanda do Awave (D1)

Regra: a criação de demanda pela integração `awave` nunca cria execução de agente nem job do pg-boss, esteja o
`insumo_tecnico` ligado ou não, com ou sem suspensão pelo teto. Para os outros autores (pessoa e agente
`orquestrador`) o disparo continua como hoje (`dispararSeLigado`, chave `demanda:<id>`).

- **CA-05.1** Dado o `insumo_tecnico` ligado, com preço vigente e teto livre, quando o token `awave` cria uma
  demanda, então não há linha em `execucao_agente` com a chave `demanda:<id>` nem job novo na fila.
- **CA-05.2** Dado o mesmo estado, quando uma pessoa cria uma demanda pelo painel ou pela API, então a execução e o
  job são criados como hoje (regressão).

#### RF-06. Confirmação por pessoa da demanda do Awave

Regra (D1: "a confirmação por pessoa dispara"): uma pessoa com sessão e 2FA, de qualquer papel, confirma a demanda do
Awave pelo painel, no detalhe da demanda. A confirmação:

- vale só para demanda com origem Awave, ainda não confirmada e fora de status final; demanda de outra origem → 409;
  demanda em status final → 409;
- grava o evento `demanda_confirmada` com a pessoa como ator, sem texto livre;
- na mesma transação, chama o disparo do `insumo_tecnico` como na criação (`dispararSeLigado`, chave `demanda:<id>`):
  com o agente ligado e disponível, cria a execução e o job; desligado ou suspenso, não cria nada;
- é idempotente: confirmar de novo não grava outro evento nem cria outra execução (a resposta não é erro);
- não muda `rascunhoAgente`, autoria nem status (C-11, C-34). O estado "confirmada" é derivado do evento.

A ação é nova na matriz (nome final na etapa 02; sugerido `confirmar_demanda`), só pessoa, sem agente e sem integração.
Se o arquiteto criar rota de API para ela, vale a mesma regra.

- **CA-06.1** Dada uma demanda do Awave não confirmada e o `insumo_tecnico` ligado, quando uma pessoa confirma, então
  o histórico ganha `demanda_confirmada` com o nome da pessoa e há uma execução do `insumo_tecnico` com a chave
  `demanda:<id>` e o job correspondente.
- **CA-06.2** Dada a mesma situação com o `insumo_tecnico` desligado, quando uma pessoa confirma, então o evento é
  gravado e nenhuma execução nem job é criado.
- **CA-06.3** Dada uma demanda do Awave já confirmada, quando uma pessoa confirma de novo, então não há segundo evento
  nem segunda execução.
- **CA-06.4** Dada uma demanda criada por pessoa, quando se tenta confirmar, então a resposta é 409 e nada é gravado.
- **CA-06.5** Dada uma demanda do Awave em `encerrada`, quando se tenta confirmar, então a resposta é 409.
- **CA-06.6** Dado o token de um agente ou de uma integração, quando chama a ação de confirmação (rota, se existir, ou
  a função direto), então é negado (403).
- **CA-06.7** Dada uma demanda do Awave, quando uma pessoa abre o detalhe, então a tela mostra se ela está
  "aguardando confirmação" ou "confirmada" (com quem e quando), e o controle de confirmar só aparece no primeiro caso.

#### RF-07. O Awave lê só a própria demanda, com a vista mínima

Regra: `GET /api/demandas/:id` com token `awave` devolve a demanda só quando a autoria é da integração `awave`. Demanda
de outro autor responde 404 com a mesma mensagem e o mesmo corpo de demanda inexistente (`nao_encontrado`), sem revelar
que existe. A vista do Awave é montada chave a chave, com exatamente seis campos: `id`, `titulo`, `tipo`, `status`,
`criadaEm`, `atualizadaEm`. O `titulo` sai com a mesma minimização da vista de quem não é pessoa (M-1 do 0008, pelo
`solicitanteNome` atual da demanda). A resposta do 201 do RF-04 usa esta mesma vista.

- **CA-07.1** Dada uma demanda criada pelo token `awave`, quando ele faz `GET /api/demandas/:id`, então a resposta é
  200 e o corpo tem exatamente as chaves `id`, `titulo`, `tipo`, `status`, `criadaEm`, `atualizadaEm`.
- **CA-07.2** Dada uma demanda criada por pessoa e outra criada pelo agente `orquestrador`, quando o token `awave` faz
  `GET` de cada uma, então as duas respostas são 404 com o mesmo corpo de um id que não existe.
- **CA-07.3** Dada uma demanda do Awave que uma pessoa editou (status, título), quando o Awave lê, então vê o status e
  o título atuais, e nenhum outro campo (sem ESP, RSK, DEC, responsável, solicitante, textos, anexos, agentes em
  andamento).
- **CA-07.4** Dado o 201 do RF-04, quando se comparam as chaves do corpo com as do CA-07.1, então são as mesmas.

#### RF-08. Limite de 10 demandas por hora para o Awave (D2)

Regra: a integração `awave` cria no máximo 10 demandas na janela do limite; a 11ª responde 429 `limite_excedido`, com
a mensagem "Limite de 10 demandas por hora atingido. Tente de novo mais tarde." (texto final com a `ux-ui-design`;
precisa dizer o número 10). O limite de pessoa e de agente continua 30 demandas e 60 artefatos por hora, com a mensagem
de hoje. A contagem é pela autoria `awave` e segue a trava consultiva por ator (C-36), sem corrida. A recusa vem antes
de gerar id.

- **CA-08.1** Dadas 10 demandas criadas pelo `awave` nos últimos 60 minutos (relógio injetado), quando o `awave` envia
  a 11ª, então a resposta é 429 com a mensagem do limite de 10 e nenhum id é consumido.
- **CA-08.2** Dado o mesmo estado, com o relógio avançado até a primeira das 10 sair da janela, quando o `awave` envia
  outra, então a resposta é 201.
- **CA-08.3** Dadas 10 demandas do `awave` na janela, quando uma pessoa cria a sua 1ª até a 30ª, então todas são 201;
  a 31ª da pessoa é 429 com a mensagem de 30 (regressão).
- **CA-08.4** Dadas 11 requisições simultâneas do `awave` com a janela vazia, quando terminam, então exatamente 10 são
  201 e 1 é 429.

#### RF-09. Chamada de servidor para servidor, sem `Origin`, também pela rede interna

Regra: requisição com `Authorization: Bearer` e sem cookie continua sem exigir `Origin` (C-15 só vale com cookie),
depois da CSP do `proxy.ts` e da vigilância de origem da 0.2.0. Nada na API das integrações depende do `Host` nem do
esquema (`http` interno, `https` público). Corpo declarado continua só em JSON. A rota `entrega` aceita `POST` sem
corpo e sem `content-type` (é como o `/construir` chama).

- **CA-09.1** Dado um token `awave`, quando faz `POST /api/demandas` com `content-type: application/json` e sem
  `Origin`, então a resposta é 201 (teste de contrato, também no e2e contra a homologação).
- **CA-09.2** Dado o mesmo POST com `Host: orquestrador_app` (o nome interno do Easypanel), quando chega ao app, então
  a resposta é 201, igual à do domínio.
- **CA-09.3** Dado um token `construir`, quando faz `POST /api/pedidos-construcao/:decId/entrega` sem corpo, sem
  `content-type` e sem `Origin`, então a requisição passa do C-15 (não responde 403 nem 415 por isso).
- **CA-09.4** Dado o mesmo POST do CA-09.1 com um cookie qualquer e sem `Origin`, então continua 403 (o C-15 não
  afrouxa).

#### RF-10. Origem da demanda na fila e no detalhe, com filtro

Regra: a origem vem da autoria gravada. Valores e rótulos: **Pessoa** (no detalhe, com o nome da conta, como o
responsável hoje), **Agente de IA** (com o nome do agente) e **Awave**. Editar o `solicitanteNome` não muda a origem.
A fila do painel mostra a origem de cada demanda e tem um filtro por origem (Todas, Pessoa, Agente de IA, Awave), que
se combina com os filtros de hoje e com a paginação. O detalhe da demanda mostra a origem. A listagem
`GET /api/demandas` aceita o mesmo filtro (`origem=pessoa|agente|awave`), porque o painel e a API usam uma consulta só;
valor fora da lista → 400. A vista da demanda para pessoa e para agente (`responsavel`) passa a aceitar a autoria de
integração, sem erro 500.

- **CA-10.1** Dadas três demandas fictícias, uma de cada origem, quando uma pessoa abre a fila sem filtro, então cada
  linha (tabela e cartões) mostra a origem certa.
- **CA-10.2** Dado o mesmo estado, quando o filtro é "Awave", então só a demanda do Awave aparece e o total é 1; com
  "Pessoa", só a da pessoa; com "Agente de IA", só a do agente.
- **CA-10.3** Dado o filtro "Awave" e o filtro de status `nova`, quando aplicados juntos, então valem os dois.
- **CA-10.4** Dada a demanda do Awave com o `solicitanteNome` editado por uma pessoa para "Teste Ficticio", quando se
  abre a fila e o detalhe, então a origem continua "Awave".
- **CA-10.5** Dado `GET /api/demandas?origem=awave` com sessão de pessoa, então só vêm demandas do Awave; com
  `origem=outra`, 400.
- **CA-10.6** Dado um agente com token, quando faz `GET /api/demandas/:id` de uma demanda do Awave, então a resposta é
  200 com a vista mínima de hoje e o `responsavel` identifica a integração `awave` (sem 500).
- **CA-10.7** Dadas a fila com o filtro de origem e o detalhe de uma demanda do Awave, quando o axe roda no Playwright
  (computador e celular), então não há violação.

#### RF-11. Integração fora das telas e contas de agente de IA

Regra: integração não aparece na tela de agentes (`/configuracao/agentes`), não tem interruptor, não entra no teto,
não grava `uso_ia`, não tem linha em `configuracao_agente` e não entra em `GET /api/agentes`.

- **CA-11.1** Dados tokens `awave` e `construir` ativos e demandas do Awave, quando uma pessoa abre a tela de agentes,
  então só os quatro agentes de IA aparecem.
- **CA-11.2** Dado o banco depois da migration, quando se lê `configuracao_agente`, então há as mesmas quatro linhas de
  antes.
- **CA-11.3** Dadas 10 demandas criadas pelo `awave`, quando se lê `uso_ia` e a situação do teto, então nada mudou.

#### RF-12. Lista de pedidos pendentes para o `/construir`

Regra: `GET /api/pedidos-construcao/pendentes`, só integração `construir`, responde 200
`{ "itens": [{ "decId": "DEC-DEM-AAAAMMDD-NNNN-vN" }] }` com todos os DEC pendentes (glossário), do pedido gerado mais
antigo para o mais novo. Só ids: nenhum título, texto, nome, data ou contagem. Não grava evento. Pedido gerado antes da
0.3.0 também conta (a ESP não faz corte por data; ver Pendências).

- **CA-12.1** Dado um DEC aprovado vigente sem pedido gerado, quando o `construir` lista, então o DEC não está em
  `itens`.
- **CA-12.2** Dado que uma pessoa gera o pedido desse DEC (cap. 05, RF-22), quando o `construir` lista, então o DEC
  está em `itens`.
- **CA-12.3** Dado o DEC do CA-12.2, quando a demanda vai a `entregue` ou `encerrada`, então ele sai de `itens`.
- **CA-12.4** Dado o DEC do CA-12.2, quando um DEC mais novo da mesma demanda é aprovado (substituição) ou uma ESP ou
  RSK mais nova deixa o DEC desatualizado, então ele sai de `itens`.
- **CA-12.5** Dado o DEC do CA-12.2 com `pedido_recebido`, quando o `construir` lista, então ele não está em `itens`.
- **CA-12.6** Dada qualquer lista, quando se leem as chaves de cada item, então só existe `decId`; e a tabela `evento`
  não ganha linha pela listagem.

#### RF-13. Entrega do pedido ao `/construir`

Regra: `POST /api/pedidos-construcao/:decId/entrega`, só integração `construir`, sem corpo. Refaz as conferências 3 a
11 da geração (cap. 05, RF-22: DEC existe e trava da demanda; demanda fora de status final; decisão aprovada completa;
não substituído; não desatualizado; não é estudo; montagem só com a ESP e o RSK citados; dado pessoal C-28 e nome do
solicitante; `validarPedido`), com os mesmos códigos e mensagens, sem a conferência 1 (ator pessoa) e sem pedir a
confirmação de novo (ela foi dada na geração e está no `pedido_gerado`). Além delas: DEC sem `pedido_gerado` → 404, com
a mesma resposta de DEC inexistente. Aceita, responde 200 com `content-type: application/json; charset=utf-8` e o corpo
igual, byte a byte, ao da geração (CA-22.2, RNF-15 do sistema), e grava o evento `pedido_entregue` (ator `construir`,
prefixo do token, entidade o DEC, sem texto). Recusada, não grava evento.

- **CA-13.1** Dado um DEC com pedido gerado por pessoa, quando o `construir` pede a entrega, então a resposta é 200 e
  o SHA-256 do corpo é igual ao SHA-256 do corpo da resposta da geração (RF-22) do mesmo DEC.
- **CA-13.2** Dado um DEC aprovado vigente sem `pedido_gerado`, quando o `construir` pede a entrega, então a resposta
  é 404 com o mesmo corpo de um DEC inexistente.
- **CA-13.3** Dado o DEC do CA-13.1 depois substituído, quando o `construir` pede a entrega, então a resposta é 409 com
  a mensagem de substituído do RF-22; desatualizado, 409 com a mensagem de desatualizado; demanda em status final, 409
  com a mensagem de status final.
- **CA-13.4** Dado o DEC do CA-13.1 com a demanda renomeada depois para um solicitante cujo nome aparece no título
  copiado no DEC, quando o `construir` pede a entrega, então a resposta é 422 com `erros` (`demanda.titulo: nome`),
  sem o valor, e nenhum evento é gravado.
- **CA-13.5** Dada uma entrega aceita, quando se lê o histórico do DEC, então há `pedido_entregue` com o ator
  `construir` e o prefixo, e `antes`/`depois` sem texto livre.
- **CA-13.6** Dado o `buscar-pedidos.mjs` (commit dfedf16), quando ele recebe a entrega, então o `validarPedido` dele
  passa e `pedido` no JSON é igual ao `decId` pedido.

#### RF-14. Confirmação de recebimento pelo `/construir`

Regra: `POST /api/pedidos-construcao/:decId/recebimento`, só integração `construir`, com corpo `{ "sha256": "<64
hexadecimais minúsculos>" }`. Respostas:

- DEC sem `pedido_gerado` (ou inexistente) → 404, a mesma resposta de inexistente;
- DEC sem `pedido_entregue` anterior → 409 (só se confirma o que foi entregue);
- `sha256` fora do formato → 400;
- `sha256` diferente do SHA-256 dos bytes que a entrega devolve para esse DEC → 409, sem evento; o DEC continua
  pendente;
- `sha256` igual → 204 sem corpo e o evento `pedido_recebido` (ator `construir`, prefixo, sem texto); a partir dele o
  DEC sai da lista do RF-12;
- repetir com o `sha256` igual depois de recebido → 204 sem gravar outro evento.

A substituição, o desatualizado ou o status final que aconteçam entre a entrega e o recebimento não impedem o 204: o
arquivo já está no `/construir`, e o registro diz o que aconteceu. O jeito de comparar o SHA-256 (refazer a montagem ou
guardar o hash no evento da entrega) é da etapa 02.

- **CA-14.1** Dado um DEC entregue, quando o `construir` confirma com o SHA-256 do corpo da entrega, então a resposta é
  204, o histórico ganha `pedido_recebido` e o DEC some de `pendentes`.
- **CA-14.2** Dado o mesmo DEC, quando o `construir` confirma com um SHA-256 de 64 hexadecimais diferente, então a
  resposta é 409, nenhum evento é gravado e o DEC continua em `pendentes`.
- **CA-14.3** Dado o DEC do CA-14.1, quando o `construir` confirma de novo com o mesmo SHA-256, então a resposta é 204
  e há um só `pedido_recebido`.
- **CA-14.4** Dado um DEC com pedido gerado e ainda não entregue, quando o `construir` confirma, então a resposta é
  409.
- **CA-14.5** Dado `{ "sha256": "abc" }` ou corpo ausente, quando o `construir` confirma, então a resposta é 400.

#### RF-15. Recebimento visível no painel e eventos novos no histórico

Regra: depois do `pedido_recebido`, o detalhe do DEC (`/pacotes-decisao/[decId]`) mostra "Recebido pelo /construir em
<data e hora>" no fuso do sistema (`src/lib/fuso`). O histórico mostra os eventos novos com rótulo em pt-BR, com o ator
de integração ("Awave", "/construir") e o prefixo do token: `demanda_criada` pelo Awave, `demanda_confirmada`,
`pedido_entregue`, `pedido_recebido`, `token_criado` e `token_revogado` de integração. Textos finais com a
`ux-ui-design`.

- **CA-15.1** Dado um DEC com `pedido_recebido`, quando uma pessoa abre o detalhe do DEC, então vê "Recebido pelo
  /construir em" seguido da data e hora do evento.
- **CA-15.2** Dado um DEC com pedido gerado e não recebido, quando uma pessoa abre o detalhe, então a frase não
  aparece.
- **CA-15.3** Dados os seis eventos novos, quando uma pessoa abre o histórico, então cada um tem rótulo próprio, nenhum
  cai no rótulo genérico de evento desconhecido, e nenhum mostra o token.
- **CA-15.4** Dado o detalhe do DEC com a frase, quando o axe roda, então não há violação.

#### RF-16. Documentação e versão

Regra: `package.json` na 0.3.0; `CHANGELOG.md` com a 0.3.0; manual técnico atualizado (acesso e segurança: ator de
integração e matriz; demandas: origem, limite do Awave, confirmação; cap. 05: rotas de pendentes, entrega e
recebimento; referência da API; painel); `docs/operacao/` com emissão, troca e revogação dos tokens `awave` e
`construir`, e onde cada token vai (cofre do Awave; arquivo de permissão 600 do usuário `deploy` para o `/construir`),
sem nenhum valor de token.

- **CA-16.1** Dado o ramo, quando se lê `package.json`, então `version` é `0.3.0`, e o `CHANGELOG.md` tem a entrada
  0.3.0 com as duas integrações.
- **CA-16.2** Dado `docs/operacao/`, quando se lê, então há os passos de emitir, trocar e revogar os dois tokens, com
  os comandos dos scripts, e nenhum token, hash ou valor de `.env`.
- **CA-16.3** Dado o manual técnico, quando se lê o cap. 05, então ele descreve as três rotas novas e não diz mais que
  o pedido é só baixado e copiado à mão.

### 3. Requisitos não funcionais

| Id | Requisito | Número e forma de medir |
|---|---|---|
| RNF-01 | Tempo de resposta do Awave | `POST /api/demandas` pelo `awave`: p95 ≤ 1 s e nenhuma acima de 5 s em 20 chamadas na homologação (o Awave corta em 10 s) |
| RNF-02 | Tempo de resposta do `/construir` | `pendentes` p95 ≤ 1 s com 200 DEC e 20 mil eventos fictícios; `entrega` p95 ≤ 3 s e `recebimento` p95 ≤ 3 s com pedido de até 512 KB (pior caso medido do nome, ~1 s; o `/construir` corta em 15 s) |
| RNF-03 | Volume | Awave: até 10 demandas por hora (RF-08). `/construir`: 1 busca a cada 5 min (12 listagens por hora) e até 20 pedidos por busca; sem limite novo de taxa nas três rotas |
| RNF-04 | Segredo | Token de 32 bytes aleatórios, só SHA-256 no banco, prefixo de 8 caracteres; o token nunca em log, Sentry, evento, mensagem de erro, resposta ou documentação. A linha de log por requisição (C-21) ganha só o tipo de ator `integracao`, sem o nome da integração além da lista fechada e sem prefixo |
| RNF-05 | Histórico sem texto livre (C-30) | Os eventos novos (`demanda_confirmada`, `pedido_entregue`, `pedido_recebido`, `token_*` de integração) só levam ids, enumerações, booleanos, prefixo e, se a etapa 02 decidir, hash hexadecimal; 0 campo de texto livre, conferido por teste |
| RNF-06 | Migration só aditiva | Amplia os CHECK de `token_servico` (coluna de integração anulável, ou `agente` anulável com CHECK de exatamente um dos dois), de `evento.ator_tipo` e de `demanda.autor_tipo`; nenhuma coluna removida, nenhum dado existente alterado (`alteram_dado = false` no ensaio), nenhuma migration da `main` editada; ensaio de rollback (CA-P7-04) aprovado; `privilegios.ts` atualizado só no que a coluna nova pedir (o `UPDATE` de `demanda` continua sem `autor_*` e `rascunho_agente`) |
| RNF-07 | Retenção | Sem regra nova: eventos são permanentes como hoje; token revogado continua no banco (hash, prefixo, datas); a demanda do Awave segue o mesmo ciclo das outras e não cria `entrada_bruta` |
| RNF-08 | Compatibilidade de contrato | 0 mudança exigida do lado de lá: a tool `criar_demanda_orquestrador` do Awave (0ab8ced) e o `buscar-pedidos.mjs` (dfedf16) funcionam sem alteração; um teste de contrato por integração com as requisições exatas da seção 4 |
| RNF-09 | Nenhum controle afrouxado | C-09, C-10, C-11, C-15, C-17, C-28, C-30, C-34, C-36, A-02 e axe com os mesmos testes verdes de antes; nenhum teste existente apagado ou enfraquecido |
| RNF-10 | Qualidade | `pnpm test`, `pnpm lint` e `pnpm typecheck` verdes; `pnpm test:e2e` verde três vezes seguidas; axe sem violação nas telas tocadas (fila, detalhe da demanda, detalhe do DEC, histórico), no computador (1280 × 720) e no celular (390 × 844); textos de interface em pt-BR |

### 4. Contratos que não podem quebrar

**Awave** (`custom/tools/orquestrador.ts`, commit 0ab8ced):

```
POST <origem>/api/demandas
authorization: Bearer wsod_...
content-type: application/json
accept: application/json
redirect: error, timeout 10 s
{ "titulo", "tipo": "bug|melhoria|novo_projeto|estudo|produto_proprio", "solicitanteNome": "Awave",
  "solicitantePapel": "outro", "descricaoProblema", "contexto" }
```

Sucesso só 201 com `id` `DEM-\d{8}-\d{4}` (`status` opcional). Erros esperados: 401, 403, 400/422 com
`{ erro, mensagem }` (a mensagem é mostrada ao dono), 429. Qualquer outro código vira "confira a fila antes de repetir".

**`/construir`** (`ferramentas/construir/lib/buscar-pedidos.mjs`, commit dfedf16): Bearer, `accept: application/json`,
sem seguir redirecionamento, 15 s.

```
GET  /api/pedidos-construcao/pendentes             → 200 { itens: [{ decId }] }
POST /api/pedidos-construcao/<DEC-id>/entrega       (sem corpo)  → 200 JSON do pedido, bytes da geração
POST /api/pedidos-construcao/<DEC-id>/recebimento   { sha256 }   → 204 (aceita 200); 409 se não bate
```

O cliente trata 401 e 403 como erro de token ou permissão, e qualquer código diferente de 200 na entrega como erro do
pedido (ele tenta de novo na busca seguinte).

### 5. Fora do escopo

- O Awave alterar, cancelar, comentar ou listar demandas; aviso de volta ao Awave (webhook).
- Andamento visível para o cliente final (item E01): pedido próprio depois do teste ponta a ponta.
- Qualquer mudança no `awave-agents` e no `buscar-pedidos.mjs` (os dois lados estão prontos).
- Ligar os agentes de IA do Orquestrador.
- A integração `construir` ler demanda, ESP, RSK ou DEC, ou gerar pedido; a pessoa continua gerando pelo RF-22, com a
  confirmação de que não há dado pessoal.
- Mudar o status da demanda sozinho na entrega ou no recebimento (`em_construcao`, `entregue` e `devolvida` continuam
  à mão, como hoje).
- Tela para emitir ou revogar token (continua pelos scripts).
- Confirmação por pessoa para demanda de outra origem; mudar o disparo do `insumo_tecnico` para pessoa e agente.
- Deploy, emissão dos tokens de produção, gravação do token do `/construir` em `~/.config/ws-construir/`, troca de
  `"ligado"` em `pedidos/config/orquestrador.json` e o teste ponta a ponta pela rede interna em produção (V01/W16,
  V02/W17): ações de Fabiano depois do merge (insumo, seção 7).

### 6. Matriz de rastreabilidade

**Critérios preliminares do pedido → RF/RNF → CA**

| # | Critério preliminar (`pedido.json`) | Requisito | Critérios de aceite |
|---|---|---|---|
| 1 | Token awave cria demanda com 201 e id DEM, como rascunho, origem Awave na fila, solicitanteNome Awave e evento com ator awave e prefixo | RF-01, RF-04, RF-10 | CA-01.1, CA-04.1 a CA-04.7, CA-10.1 |
| 2 | Token awave recebe 403 em toda ação fora de criar_demanda e ler_demanda, e 404 ao ler demanda de outro autor; a visão tem só os seis campos | RF-03, RF-07 | CA-03.1, CA-03.5, CA-03.6, CA-07.1 a CA-07.4 |
| 3 | Demanda do awave não cria execução nem job do insumo_tecnico, mesmo ligado | RF-05, RF-06 | CA-05.1, CA-05.2, CA-06.1 a CA-06.3 |
| 4 | A 11ª demanda do awave na mesma hora recebe 429; o limite dos outros atores não muda | RF-08 | CA-08.1 a CA-08.4 |
| 5 | Token revogado recebe 401 com a mensagem de token inválido, sem afetar os demais tokens | RF-01, RF-02 | CA-01.3, CA-01.4, CA-01.5, CA-02.4, CA-02.5 |
| 6 | Bearer sem cabeçalho Origin continua aceito, também pela rede interna (http://orquestrador_app) | RF-09 | CA-09.1 a CA-09.4 (a chamada real pela rede interna é verificação pós-deploy de Fabiano, fora do escopo) |
| 7 | Pedido gerado por pessoa aparece em pendentes para o token construir; a entrega devolve os mesmos bytes da geração; o recebimento com SHA-256 certo tira da lista e com errado responde 409 | RF-12, RF-13, RF-14, RF-15 | CA-12.1 a CA-12.6, CA-13.1 a CA-13.6, CA-14.1 a CA-14.5, CA-15.1 |
| 8 | Token construir recebe 403 fora das três ações; awave, agentes e pessoa recebem 403 nas três rotas novas | RF-03 | CA-03.2, CA-03.3, CA-03.4, CA-03.5 |
| 9 | O buscar-pedidos.mjs do /construir passa contra a homologação da 0.3.0 com um pedido fictício | RF-12, RF-13, RF-14, RNF-08 | CA-13.6 e o cenário de verificação abaixo (V-01) |

**V-01 (verificação do critério 9).** Dado o `docker-compose.hml.yml` no ar, com seed fictício que tenha um DEC
aprovado vigente com pedido gerado por pessoa, e um token `construir` emitido dentro da homologação pelo script, quando
o `buscar-pedidos.mjs` roda com `CONSTRUIR_PEDIDOS` apontando para uma pasta temporária com
`config/orquestrador.json` ligado (url da homologação, arquivo de token com permissão 600), então ele sai 0, grava
`<DEC-id>.json` com os bytes da entrega, a situação é `gravado`, e uma segunda execução lista 0 pendentes. Montagem
do cenário na etapa 05.

**Critérios do insumo e itens da ESP → RF (cobertura complementar)**

| Origem | Requisito |
|---|---|
| Insumo parte 1, CA 1 a 10; ESP (1) a (9) | CA 1 → RF-04, RF-10; 2 → RF-04; 3 → RF-03; 4 → RF-07; 5 → RF-01; 6 → RF-04; 7 → RF-08; 8 → RF-11; 9 e 10 → RF-09; ESP (1) → RF-01, RF-02; (2) → RF-03; (3), (4) → RF-07; (5) → RF-04, RF-05, RF-06; (6) → RF-08; (7) → RF-10; (8) → RF-11; (9) → RF-09 |
| Insumo parte 2, CA 1 a 6; ESP (10) a (14) | CA 1 → RF-12; 2 → RF-13; 3 → RF-14; 4 → RF-12, RF-13; 5 → RF-03; 6 → RF-12, RF-13, RF-14, RNF-05; ESP (10) → RF-01, RF-03; (11) → RF-12; (12) → RF-13; (13) → RF-14; (14) → RF-15 |
| ESP: migration aditiva; documentação; CHANGELOG e 0.3.0 | RNF-06; RF-16 |
| RSK: token vazado, texto externo ao modelo de IA, dado pessoal, afrouxamento da matriz, Origin, migration | RF-03, RF-05, RF-07, RF-08, RF-04 (`solicitanteNome` fixo), RNF-05, RF-09, RNF-06, RNF-09 |
| Definição de pronto do pedido | RNF-10 (testes, e2e 3×), RNF-06 (migration e ensaio), RF-16 (manual, operação, CHANGELOG, 0.3.0) |

## Decisões tomadas

- Confirmação da demanda do Awave (RF-06) como ação nova e explícita de pessoa no detalhe da demanda, e não como efeito
  de mudar o status: o insumo e a ESP dizem só "a confirmação por pessoa dispara", e nada no sistema hoje confirma
  demanda; uma ação própria é verificável e não muda o comportamento da transição `nova → em_analise` das outras
  demandas.
- O estado "confirmada" vem do evento `demanda_confirmada`, sem mudar `rascunhoAgente`: o C-11 e o `privilegios.ts`
  proíbem o UPDATE dessa coluna, e o RSK veta afrouxar controle.
- Confirmação idempotente e sem erro na repetição, como o recebimento da parte 2: a mesma regra para o mesmo tipo de
  ato, e o `dispararSeLigado` já é idempotente pela chave `demanda:<id>`.
- Origem lida da autoria e não do `solicitanteNome`: a autoria é imutável (C-11); o nome do solicitante é editável por
  pessoa.
- Filtro de origem também na API (`GET /api/demandas?origem=`): o painel e a API usam uma consulta só
  (`paginaDeDemandas`); o filtro não abre dado novo a quem já lista.
- Três origens no filtro (Pessoa, Agente de IA, Awave), e não duas: o agente `orquestrador` já cria demanda hoje, e
  um filtro "Awave ou pessoa" deixaria essas demandas sem lugar.
- `titulo` da vista do Awave com a minimização de quem não é pessoa (M-1): manter a regra existente para todo ator que
  não é pessoa, porque uma pessoa pode editar o título depois.
- `solicitanteNome` continua obrigatório no corpo do Awave e é trocado por "Awave": tirar a obrigatoriedade mudaria o
  schema comum, e o contrato do Awave já manda o campo.
- Recebimento exige entrega anterior (409 sem ela) e aceita o 204 mesmo se o DEC foi substituído depois da entrega: só
  se confirma o que saiu, e o recebimento registra um fato que já aconteceu no `/construir`.
- `sha256` só em hexadecimal minúsculo: é o que o `buscar-pedidos.mjs` envia (`digest('hex')`).
- Pedido gerado antes da 0.3.0 conta como pendente: a ESP define a lista sem corte por data; o efeito vai para as
  Pendências, sem bloquear.
- Números dos RNF de tempo a partir dos tempos de corte dos clientes (10 s do Awave, 15 s do `/construir`) e do pior
  caso medido do nome no RF-22 (~1 s com 512 KB).

## Pendências

- Nenhuma bloqueia a etapa. Itens para as etapas seguintes e para Fabiano ver na Parada:
- (Fabiano, na Parada 1) A forma da confirmação do RF-06 foi definida aqui, porque o insumo não a descreve. Se a
  intenção era outra (ex.: confirmar ao mover para `em_analise`), o RF-06 muda antes da etapa 05.
- (Fabiano / arquiteto) Na primeira busca, os DEC com pedido gerado antes da 0.3.0 e demanda fora de status final
  (`aprovada`, `em_construcao`, `devolvida`) aparecem em `pendentes`. O `buscar-pedidos.mjs` grava como `ja_existia`
  quando os bytes batem com o arquivo em `pedidos/`, ou acusa `conflito` por e-mail quando o arquivo antigo difere (ex.:
  gerado antes da 0.1.12, com `aprovadoPor` em nomes). Não há corte por data na ESP; se Fabiano quiser um, é mudança de
  escopo.
- (arquiteto) DEC pendente cuja entrega passa a ser recusada (422 pelo nome do solicitante renomeado, por exemplo)
  continua na lista do RF-12, e o `/construir` acusa erro a cada 5 minutos até uma pessoa resolver. Avaliar se a
  lista deve excluir esse caso ou se o aviso por e-mail basta.
- (arquiteto) Como comparar o SHA-256 do recebimento (refazer a montagem ou guardar o hash no `pedido_entregue`), e o
  nome final das ações, do argumento do script e da coluna nova de `token_servico`.
- (arquiteto / devops-sre) Voltar da 0.3.0 para a 0.2.0 com demandas do Awave já gravadas faz o `responsavelDe` da
  0.2.0 lançar "autoria desconhecida" (500) no detalhe dessas demandas e o histórico mostrar ator desconhecido. O
  ensaio de rollback com seed sem dado de integração não pega isso; definir se o seed do ensaio inclui uma demanda do
  Awave e qual é o procedimento (revogar os tokens antes de voltar).
- (seguranca-aplicacao, etapa 04) O schema comum aceita do Awave campos que o contrato não usa (`anexos` com URL,
  `urgencia`, `impactoPercebido`). Avaliar se a autoria `awave` deve recusar ou descartar esses campos; aqui ficaram
  aceitos para não divergir do schema comum.
- (ux-ui-design, etapa 03) Textos: rótulos de origem, filtro, estado e botão da confirmação, mensagem do limite de 10,
  "Recebido pelo /construir em", rótulos dos seis eventos novos no histórico, e o cartão "Próxima ação" da 0.2.0 para
  demanda do Awave aguardando confirmação.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] todo item de `criterios_aceite_preliminares` do pedido aparece na matriz
- [x] todo RF tem ao menos um critério Dado/Quando/Então verificável
- [x] nenhum requisito contradiz a especificação (ESP) ou o parecer de risco (RSK) do pedido
- [x] o que fica fora do escopo está listado
- [x] o texto não tem dado pessoal real, segredo nem valor de `.env`
