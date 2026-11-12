---
pedido: DEC-DEM-20261111-0016-v1
etapa: 07-qa-funcional
agente: qa-funcional
leu: [contrato-passagem.md, pedido.json, docs/superpowers/specs/2026-11-11-ws-orquestrador-demandas-integracoes-design.md (5.5, 6 e 7), 01-analista-requisitos.md, 03-ux-ui-design.md, tarefas.json, 05-tech-lead.md, 02-arquiteto-solucoes.md (seção 7, trecho da volta), docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (Verificação na homologação e Cobertura), 06-T01-qa-automacao.md, 06-T02-qa-automacao.md, 06-T03-qa-automacao.md, 06-T04-qa-automacao.md, 06-T05-qa-automacao.md, 06-T06-qa-automacao.md, 06-T07-qa-automacao.md, 06-T08-qa-automacao.md, 06-T09-qa-automacao.md, 06-T10-qa-automacao.md, 06-T11-qa-automacao.md, 06-T12-qa-automacao.md, 06-T13-qa-automacao.md, 06-T14-qa-automacao.md, 06-T15-qa-automacao.md, 06-T16-qa-automacao.md, 06-T17-qa-automacao.md, 06-T18-qa-automacao.md, 06-T19-qa-automacao.md, 06-T20-qa-automacao.md, docs/construcao/DEC-DEM-20261110-0015-v1/07-qa-funcional.md (formato), estruturaAutonoma/pedidos/insumos/2026-11-11_orquestrador-integracao-awave.md (seção 7 e parte 2), estruturaAutonoma/ferramentas/construir/buscar-pedidos.mjs (uso e situações), docs/operacao/deploy.md (seções 4 e 5, trechos), scripts/seed-ficticio.ts (TITULOS_DO_E2E, por busca), src/modules/limites.ts (MENSAGEM_LIMITE_AWAVE, por busca), src/modules/demandas/consultas.ts (linhas 270 a 380), test/estatico/ (por busca: CHANGELOG, versão, docs), e2e/agentes-teto.spec.ts (por busca)]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

### 0. Como ler

- Os **79 critérios de aceite** (CA) de `01-analista-requisitos.md` aparecem no roteiro (seção 2) e no mapa (seção 3).
  Os textos esperados seguem a 03 onde ela fechou o texto do 01 (ex.: a mensagem do 429 é a da 03, seção 8:
  "Limite de 10 demandas por hora do Awave atingido. Tente de novo mais tarde.", que é a de `MENSAGEM_LIMITE_AWAVE`).
- **Ambiente do roteiro por critério:** a homologação do ramo (`docker-compose.hml.yml`) com o `scripts/seed-ficticio.ts`,
  ou a execução local do e2e. **Nunca a produção**: o roteiro grava demandas, decisões, tokens e eventos. O roteiro de
  produção é só o de aceite (seção 7).
- **Abreviações:**
  - `TA` e `TA2`: tokens `awave` emitidos **dentro da homologação** por
    `pnpm tsx scripts/criar-token-servico.ts --integracao awave`, gravados em arquivo com permissão 600 fora de
    repositório. O valor nunca vai a terminal, entrega, chat ou e-mail; o roteiro cita só o prefixo.
  - `TC`: token `construir` emitido do mesmo jeito. `TG`: token do agente `orquestrador` da homologação.
  - `S`: sessão da conta `cto` do seed ("Pessoa Ficticia CTO"), com 2FA (TOTP do segredo fictício do seed).
  - `C1`: o corpo do contrato do Awave, do CA-04.1: `{ "titulo": "Relatório semanal fictício", "tipo": "melhoria",
    "solicitanteNome": "Awave", "solicitantePapel": "outro", "descricaoProblema": "Texto fictício.", "contexto":
    "Demanda aberta pelo agente \"jarvis\" do Awave, com aprovação do dono em /aprovacoes." }`, enviado com
    `authorization: Bearer`, `content-type: application/json`, `accept: application/json` e **sem** `Origin`.
  - Demandas do seed pela chave de `TITULOS_DO_E2E` (os ids mudam a cada banco): `awaveAguardando` ("Relatório do Awave
    aguardando confirmação (fictício)"), `awaveConfirmar`, `awaveEncerrada`, `pedidoParaBuscar` ("Pedido para o
    /construir buscar (fictício)"), `pedidoRecebido` ("Pedido já recebido pelo /construir (fictício)"), `etapasDupla`,
    `decisaoOpcaoB`.
- **Tipos de cobertura no mapa:** "unidade" (Vitest sem banco), "integração" (Vitest com Postgres real e rota real),
  "e2e" (Playwright contra o build de produção), "estático" (teste que lê o repositório), "conferência" (leitura de
  documento numa etapa definida pelo plano). Todos os testes citados rodam em `pnpm test` ou `pnpm test:e2e`.
- **Larguras:** computador 1280 × 720; celular 390 × 844; reflow 320 px.

### 1. Resumo

- **Todo CA tem cobertura** (seção 3): 76 por teste automatizado e 3 em parte por conferência de documento (CA-16.1, no
  CHANGELOG; CA-16.2; CA-16.3, no manual). Os três são documentos que o plano aprovado põe na `10-documentacao` (05, "Fora
  das tarefas da 06", G2), depois desta etapa; a parte deles que dá para testar já tem teste (versão 0.3.0, nenhum token
  em `docs/` e no CHANGELOG, texto novo da T11). Ver Decisões.
- **Nenhuma devolução.** Nenhum critério ficou "sem cobertura" e nenhum achado fere regra de negócio, de acesso ou de
  dado pessoal.
- **Última rodada registrada (06-T20-testes):** `pnpm test` 6381 de 6381 em 293 arquivos; `pnpm test:e2e` 276 passaram,
  9 pulados (capturas), 0 falharam; lint e typecheck limpos. O e2e três vezes seguidas foi feito na 06-T20-construcao.
- **Achados desta etapa** (seção 5): 1 comportamento de produto para decisão de Fabiano (QF-0016-01, o nome "Awave"
  vira "[nome removido]" no título visto pelo Awave e pelos agentes), 1 texto errado no seed (QF-0016-02), 1 teste
  instável fora do pedido (QF-0016-03) e 1 risco de segredo em trace de e2e já endereçado à 08 (QF-0016-04).
- **O que só a produção prova:** a chamada pela rede interna do Easypanel (`http://orquestrador_app`) com o token de
  produção (V01/W16), a revogação vista pelo dono no Awave (V02/W17) e a busca real do `/construir`. Dependem da emissão
  dos tokens de produção, que é ação de Fabiano depois do deploy. Estão no roteiro de aceite (seção 7).

### 2. Roteiro de teste por critério de aceite

Passo comum "entrar": `/entrar`, conta `cto`, senha e código TOTP do seed. Para os passos de API, use um cliente HTTP
que leia o token do arquivo (ex.: `curl` com o cabeçalho montado a partir do arquivo), sem mostrar o valor.

#### RF-01 Ator de integração com token próprio

| CA | Passos | Dado | Resultado esperado |
|---|---|---|---|
| CA-01.1 | `POST /api/demandas` com `C1` e `TA`; com `S`, abrir o histórico da demanda criada | `C1`; prefixo de `TA` anotado | 201; no histórico, "Criou a demanda" com o ator "Awave (prefixo <prefixo de TA>)", e não um agente |
| CA-01.2 | `GET /api/pedidos-construcao/pendentes` com `TC`; repetir com `TG` | seed | `TC`: 200 `{ "itens": [...] }`; `TG`: 403. Só a integração `construir` passa |
| CA-01.3 | Revogar `TA` pelo prefixo; `POST /api/demandas` com `C1` e `TA` | `C1` | 401 `{ "erro": "nao_autenticado", "mensagem": "Token de serviço inválido ou revogado." }`; total da fila igual ao de antes |
| CA-01.4 | Com `TA` revogado: `GET /api/demandas` com `TG`; `GET .../pendentes` com `TC`; abrir a fila com `S` | seed | Os três respondem como antes (200 e a fila) |
| CA-01.5 | Revogar `TC`; `GET /api/pedidos-construcao/pendentes` com `TC` | seed | 401 com a mesma mensagem do CA-01.3 |

#### RF-02 Emissão, troca e revogação pelos scripts

| CA | Passos | Dado | Resultado esperado |
|---|---|---|---|
| CA-02.1 | No console do `app` da homologação: `pnpm tsx scripts/criar-token-servico.ts --integracao awave`; consulta só de leitura de `integracao, prefixo, revogado_em` em `token_servico` e do último `token_criado` em `evento` | banco da homologação | Sai 0; a saída mostra o prefixo e o token uma vez; uma linha com `integracao = awave` e o prefixo (sem o token); `token_criado` com `depois = { integracao: "awave", prefixo }` |
| CA-02.2 | O mesmo com `--integracao construir` | idem | O mesmo, com `construir` |
| CA-02.3 | Rodar a criação com `--integracao jarvis`; com `--agente risco --integracao awave`; sem argumento; com `--token qualquer` | idem | Erro de argumento em todos; nenhuma linha nova em `token_servico` nem evento |
| CA-02.4 | `pnpm tsx scripts/revogar-token-servico.ts --prefixo <prefixo de TA>` duas vezes; depois `POST` com `C1` e `TA` | `TA` ativo | 1ª: sai 0 e grava `token_revogado` com o prefixo; o `POST` dá 401; 2ª: sai 1 sem evento novo |
| CA-02.5 | Com `TA` ativo, emitir `TA2`; `POST` com `C1` por `TA` e por `TA2`; revogar `TA`; `POST` de novo pelos dois | títulos "Troca 1 (fictício)" e "Troca 2 (fictício)" | Antes da revogação, os dois dão 201; depois, `TA` dá 401 e `TA2` dá 201 |
| CA-02.6 | Ler o log do `app` e os eventos `token_*` gravados nos passos acima | idem | Nenhum `wsod_` nem o texto do token depois do prefixo; só o prefixo |

#### RF-03 Matriz fechada por integração

| CA | Passos | Dado | Resultado esperado |
|---|---|---|---|
| CA-03.1 | Com `TA`, chamar cada rota de `src/app/api/**/route.ts` fora de `POST /api/demandas` e `GET /api/demandas/:id`: listagem, histórico, ESP, RSK, DEC, decisão, pedido, entrada, agentes, teto e as três de `pedidos-construcao`; contar demandas e eventos antes e depois | ids do seed | 403 `sem_permissao` com a mensagem de sem permissão em todas; contagens iguais |
| CA-03.2 | Com `TC`: `POST /api/demandas` com `C1`, `GET /api/demandas/<id da awaveAguardando>` e `GET /api/demandas` | idem | 403 nas três; nada gravado |
| CA-03.3 | Com o token de cada um dos quatro agentes e com `TA`, chamar as três rotas de `pedidos-construcao` | DEC da `pedidoParaBuscar` | 403 em todas |
| CA-03.4 | Com `S`, `Origin` da homologação e `content-type: application/json`, chamar as três rotas | idem | 403 em todas |
| CA-03.5 | Rodar `src/modules/acesso/matriz-integracoes.test.ts` e `matriz-integracoes-qa.test.ts` | código do ramo | Verdes: `awave` proibido em toda ação fora das duas; `construir` fora das três |
| CA-03.6 | Rodar os mesmos testes (caso "integração fora da lista") | `jarvis`, maiúsculas, vazio | Negado em toda ação |

#### RF-04 O Awave cria demanda

| CA | Passos | Dado | Resultado esperado |
|---|---|---|---|
| CA-04.1 | `POST /api/demandas` com `C1` e `TA`, sem `Origin` | `C1` | 201; `id` casa com `^DEM-\d{8}-\d{4}$`; `status: "nova"`; o corpo tem exatamente `id`, `titulo`, `tipo`, `status`, `criadaEm`, `atualizadaEm` |
| CA-04.2 | Com `S`, abrir o detalhe da demanda criada (ou consulta só de leitura das colunas de autoria) | demanda do CA-04.1 | "Origem: Awave", "Criada por: Awave", selo "Rascunho de agente", solicitante "Awave", status Nova (`autor_tipo = integracao`, `autor_id = awave`, `rascunho_agente = true`) |
| CA-04.3 | `C1` com `"solicitanteNome": "Maria Ficticia"` | título "Solicitante trocado (fictício)" | Solicitante gravado "Awave" |
| CA-04.4 | `C1` com `"autorTipo": "pessoa"`, `"autorId": "u-ficticio"` e `"rascunhoAgente": false` | título "Autoria no corpo (fictício)" | 201; origem Awave e selo de rascunho, como no CA-04.2 |
| CA-04.5 | Com `S`, abrir o Histórico da demanda do CA-04.1 | idem | Um "Criou a demanda" com "Awave (prefixo …)"; o evento não traz título, descrição, contexto nem token |
| CA-04.6 | `C1` com `"tipo": "outro"`; `C1` sem `titulo`; depois um `C1` válido | idem | 400 `{ erro, mensagem }` nos dois; o 201 seguinte recebe o número logo depois do último (nenhum id gasto) |
| CA-04.7 | Com `S`, abrir a fila em 1280 e 390 px | `awaveAguardando` | A linha e o cartão com "Rascunho de agente" e "Origem: Awave" |

#### RF-05 Sem disparo do insumo técnico na criação pelo Awave

| CA | Passos | Dado | Resultado esperado |
|---|---|---|---|
| CA-05.1 | Na T12, ligar o "insumo técnico" (homologação, preço vigente e teto livre); `POST` com `C1` e `TA`; abrir o detalhe | título "Sem disparo (fictício)" | Sem alerta de agente trabalhando; Próxima ação "Confirmar a demanda aberta pelo Awave."; nenhuma linha em `execucao_agente` com a chave `demanda:<id>` e nenhum job novo |
| CA-05.2 | Com a mesma configuração, criar uma demanda por "Nova demanda" com `S`; depois desligar o agente | título "Disparo de pessoa (fictício)" | A execução do insumo técnico e o job são criados, como na 0.2.0 |

#### RF-06 Confirmação por pessoa

| CA | Passos | Dado | Resultado esperado |
|---|---|---|---|
| CA-06.1 | Insumo técnico ligado; abrir a demanda do CA-05.1; "Confirmar demanda" | idem | "Confirmando…", depois "Demanda confirmada."; Histórico "Confirmou a demanda aberta pelo Awave" com "Pessoa Ficticia CTO (CTO)"; Próxima ação passa a esperar o agente de insumo técnico (execução `demanda:<id>` e job criados) |
| CA-06.2 | Insumo técnico desligado; confirmar a `awaveConfirmar` | seed | Evento gravado; Próxima ação "Escrever a especificação técnica"; nenhuma execução nem job |
| CA-06.3 | Abrir a demanda do CA-04.3 em duas abas; confirmar na 1ª; depois clicar "Confirmar demanda" na 2ª (sem recarregar) | idem | A 2ª também mostra "Demanda confirmada."; o Histórico tem um só "Confirmou…" e há uma só execução |
| CA-06.4 | Reenviar a Server Action da confirmação com o id trocado pelo de uma demanda de pessoa (como o controle do IN-07 no e2e) | `etapasDupla` | "Não foi possível concluir: Só demanda aberta pelo Awave precisa de confirmação."; nada gravado |
| CA-06.5 | Abrir a demanda do CA-04.4 em duas abas; na 1ª, Mudar status → Encerrada; na 2ª, "Confirmar demanda" | idem | "Não foi possível concluir: A demanda está em um status final e não pode mais ser confirmada." com foco no alerta; nada gravado |
| CA-06.6 | Não há rota de API para confirmar (03, 5.3: Server Action no detalhe). Conferir pelos testes da função e da matriz | `TG`, `TA`, `TC` | Negado (`sem_permissao`) para agente, integração e sistema |
| CA-06.7 | Abrir `awaveAguardando`, a demanda confirmada no CA-06.2 e `awaveEncerrada`, em 1280 e 390 px | seed | Aguardando: três parágrafos e o botão; confirmada: "Confirmada por Pessoa Ficticia CTO (CTO) em <data e hora>." sem botão; encerrada: "Esta demanda foi aberta pelo Awave e não foi confirmada. Ela está em Encerrada, um status final: não há confirmação a fazer." sem botão |

#### RF-07 O Awave lê só a própria demanda

| CA | Passos | Dado | Resultado esperado |
|---|---|---|---|
| CA-07.1 | `GET /api/demandas/<id do CA-04.1>` com `TA2` (ou outro token `awave` ativo) | idem | 200 com exatamente as seis chaves (a posse é pela autoria, não pelo token) |
| CA-07.2 | Com `TA2`, `GET` da `etapasDupla` (pessoa), de uma demanda criada por `TG` e de `DEM-20991231-9999` | seed; `POST` com `TG` e título "Criada por agente (fictício)" | 404 nas três, com o mesmo corpo, byte a byte |
| CA-07.3 | Com `S`, editar o título para "Relatório semanal fictício revisado" e mudar o status para Em análise; `GET` com `TA2` | demanda do CA-04.1 | Título e status novos; só as seis chaves; nada de ESP, RSK, DEC, solicitante, textos ou anexos |
| CA-07.4 | Comparar as chaves do 201 do CA-04.1 com as do CA-07.1 | idem | As mesmas seis |

#### RF-08 Limite de 10 por hora do Awave

| CA | Passos | Dado | Resultado esperado |
|---|---|---|---|
| CA-08.1 | Numa homologação semeada há mais de 1 h (o seed conta 3 demandas do Awave na hora em que roda), enviar `C1` com `TA2` até o 429 | títulos "Limite 01 (fictício)" a "Limite 11 (fictício)" | Dez 201 e o 11º 429 `limite_excedido` com "Limite de 10 demandas por hora do Awave atingido. Tente de novo mais tarde."; nenhuma demanda nova e nenhum id gasto |
| CA-08.2 | Esperar a primeira das dez completar 60 minutos; enviar de novo | "Limite 12 (fictício)" | 201, e o seguinte volta a 429 |
| CA-08.3 | Com o Awave no limite, criar demandas com `S` (ou `TG`) | "Pessoa no limite (fictício) N" | Passam até a 30ª; a 31ª recebe a mensagem do limite de 30, não a do Awave |
| CA-08.4 | Janela vazia; 11 `POST` simultâneos com `C1` (ex.: 11 processos em paralelo) | "Paralelo NN (fictício)" | Exatamente dez 201 e um 429 |

#### RF-09 Servidor a servidor, sem `Origin`, também pela rede interna

| CA | Passos | Dado | Resultado esperado |
|---|---|---|---|
| CA-09.1 | O mesmo `POST` do CA-04.1 (sem `Origin`) | `C1` | 201 |
| CA-09.2 | O mesmo `POST` com `Host: orquestrador_app` pelo endereço da homologação | `C1`, título "Rede interna (fictício)" | 201 igual ao do domínio. A rede interna real fica na UAT-04 |
| CA-09.3 | `POST /api/pedidos-construcao/<DEC da pedidoParaBuscar>/entrega` com `TC`, sem corpo, sem `content-type`, sem `Origin` | seed | 200 com o JSON; nunca 403 nem 415 por falta de `Origin` ou de corpo |
| CA-09.4 | `C1` com `TA2`, mais `Cookie: sessao=ficticia`, sem `Origin` | `C1` | 403 (o C-15 continua) |

#### RF-10 Origem na fila e no detalhe

| CA | Passos | Dado | Resultado esperado |
|---|---|---|---|
| CA-10.1 | Com `S`, abrir a fila sem filtro em 1280 px (tabela) e 390 px (cartões) | seed mais as demandas criadas acima | Cada linha diz "Origem: Pessoa", "Origem: Agente de IA" ou "Origem: Awave", de acordo com quem criou |
| CA-10.2 | Escolher Origem = Awave e "Filtrar"; repetir com Pessoa e Agente de IA | idem | Só a origem escolhida; o total é o de `GET /api/demandas?origem=<o>`; sem demanda da origem, "Nenhuma demanda com esses filtros." |
| CA-10.3 | Com Origem = Awave, ativar o contador "Nova" | idem | URL com `status=nova` e `origem=awave`; só demandas do Awave em Nova |
| CA-10.4 | Editar o solicitante da demanda do CA-04.1 para "Teste Ficticio" | idem | Fila e detalhe continuam com "Origem: Awave" |
| CA-10.5 | `GET /api/demandas?origem=awave` com `S`; depois `?origem=outra` | idem | 200 só com demandas do Awave, cada item com `origem: "awave"`; 400 com o campo `origem`, sem ecoar o valor |
| CA-10.6 | `GET /api/demandas/<id do CA-04.1>` com `TG` | idem | 200 com a vista mínima e `responsavel: { tipo: "integracao", integracao: "awave" }`; nunca 500 |
| CA-10.7 | Axe (extensão do navegador) na fila com Origem = Awave e no detalhe da `awaveAguardando`, nas duas larguras | seed | Nenhuma violação |

#### RF-11 Integração fora das telas de agente

| CA | Passos | Dado | Resultado esperado |
|---|---|---|---|
| CA-11.1 | Com `TA2` e `TC` ativos e demandas do Awave criadas, abrir "Agentes e teto" | seed | Só os quatro agentes de IA; nenhuma linha, rótulo ou contagem com "Awave" ou "/construir" |
| CA-11.2 | Consulta só de leitura de `configuracao_agente` | banco migrado | As mesmas quatro linhas |
| CA-11.3 | Anotar o uso de IA e o teto na T12; criar dez demandas pelo Awave (CA-08.1); abrir a T12 de novo | idem | Uso e teto iguais |

#### RF-12 Pendentes para o `/construir`

| CA | Passos | Dado | Resultado esperado |
|---|---|---|---|
| CA-12.1 | Com `S`, aprovar o DEC da `decisaoOpcaoB` (opção B); `GET .../pendentes` com `TC` | seed | O DEC aprovado não está em `itens` |
| CA-12.2 | Na T11 desse DEC, marcar a confirmação de dado pessoal e gerar o pedido; listar de novo | idem | O DEC está em `itens` |
| CA-12.3 | Levar a demanda desse DEC a Encerrada; listar | idem | O DEC sai de `itens` |
| CA-12.4 | Num DEC pendente, gravar uma ESP nova na demanda (desatualizado); noutro, aprovar um DEC mais novo da mesma demanda (substituído); listar | demandas descartáveis da homologação | Os dois saem de `itens` |
| CA-12.5 | Confirmar o recebimento do DEC da `pedidoParaBuscar` (RF-14); listar | seed | Ele sai de `itens`; o da `pedidoRecebido` nunca aparece |
| CA-12.6 | Ler as chaves de cada item; contar eventos antes e depois da listagem | seed | Só `decId` em cada item; nenhum evento novo |

#### RF-13 Entrega do pedido

| CA | Passos | Dado | Resultado esperado |
|---|---|---|---|
| CA-13.1 | Gerar o pedido de um DEC e baixar o JSON pela T11; pedir a entrega com `TC`; comparar os SHA-256 | DEC do CA-12.2 | 200 com `content-type: application/json; charset=utf-8`; os dois SHA-256 iguais |
| CA-13.2 | Entrega de um DEC aprovado sem pedido gerado e de `DEC-DEM-20991231-9999-v1` | DEC do CA-12.1 antes da geração | 404 nas duas, com o mesmo corpo |
| CA-13.3 | Entrega dos DEC do CA-12.4 (substituído, desatualizado) e do CA-12.3 (status final) | idem | 409 com as mensagens de substituído, desatualizado e status final do RF-22 |
| CA-13.4 | Demanda com título "Pedido da Joana Ficticia (fictício)" e solicitante "Carlos Exemplar"; gerar o pedido; trocar o solicitante para "Joana Ficticia"; pedir a entrega | demanda descartável | 422 com `erros: ["demanda.titulo: nome"]`, sem o nome; nenhum evento |
| CA-13.5 | Depois de uma entrega aceita, abrir o Histórico da demanda | DEC do CA-13.1 | "Buscou o Pedido de Construção de DEC-…" com "/construir (prefixo …)"; nenhum texto do pedido |
| CA-13.6 | V-01 do plano: `buscar-pedidos.mjs` com `CONSTRUIR_PEDIDOS` numa pasta temporária, `config/orquestrador.json` ligado para a homologação e o arquivo de `TC` (600) | seed | Sai 0; grava `<DEC-id>.json` da `pedidoParaBuscar` com situação `gravado`; a 2ª execução lista 0 pendentes |

#### RF-14 Recebimento

| CA | Passos | Dado | Resultado esperado |
|---|---|---|---|
| CA-14.1 | `POST .../recebimento` com `{ "sha256": <SHA-256 do corpo da entrega> }` e `TC` | DEC entregue no CA-09.3 | 204 sem corpo; Histórico "Confirmou o recebimento do Pedido de Construção de DEC-…"; o DEC sai de `pendentes` |
| CA-14.2 | O mesmo com `"0000…0000"` (64 zeros) num DEC entregue e não recebido | DEC do CA-13.1 | 409 "O SHA-256 enviado não confere com o pedido entregue. Busque o pedido de novo."; nenhum evento; continua pendente |
| CA-14.3 | Repetir o CA-14.1 | idem | 204; um só "Confirmou o recebimento…" |
| CA-14.4 | Recebimento de um DEC com pedido gerado e sem entrega | DEC do CA-12.2 antes da entrega | 409 "Este pedido ainda não foi entregue ao /construir. Peça a entrega antes de confirmar o recebimento." |
| CA-14.5 | `{ "sha256": "abc" }`; depois sem corpo | qualquer DEC | 400 "Informe o sha256 com 64 caracteres hexadecimais minúsculos." |

#### RF-15 Recebimento no painel e eventos novos

| CA | Passos | Dado | Resultado esperado |
|---|---|---|---|
| CA-15.1 | Abrir a T11 do DEC da `pedidoRecebido` e o Histórico da demanda | seed | "Recebido pelo /construir em dd/mm/aaaa às hh:mm." depois de "Repositório destino", com a hora do `pedido_recebido` no fuso do sistema |
| CA-15.2 | Abrir a T11 do DEC do CA-12.2 antes do recebimento | idem | A frase não existe |
| CA-15.3 | Ler o Histórico das demandas usadas acima | idem | Rótulos próprios: "Criou a demanda" (Awave), "Confirmou a demanda aberta pelo Awave", "Buscou o Pedido de Construção de …", "Confirmou o recebimento do Pedido de Construção de …"; os de token (sem demanda, fora da T05) pelo teste de rótulos; nenhum token |
| CA-15.4 | Axe na T11 com a frase, nas duas larguras | DEC da `pedidoRecebido` | Nenhuma violação |

#### RF-16 Documentação e versão

| CA | Passos | Dado | Resultado esperado |
|---|---|---|---|
| CA-16.1 | Ler `package.json` e `CHANGELOG.md` (depois da 10) | ramo | `"version": "0.3.0"`; entrada 0.3.0 com as duas integrações |
| CA-16.2 | Ler `docs/operacao/` (depois da 10) | ramo | Emitir, trocar (12 meses ou suspeita) e revogar os tokens `awave` e `construir`, com os comandos dos scripts e onde cada token mora (cofre do Awave; `~/.config/ws-construir/`, 600); nenhum token, hash ou valor de `.env` |
| CA-16.3 | Ler o cap. 05 do manual técnico (depois da 10) e a seção "Pedido de Construção" da T11 | ramo | As três rotas novas descritas; nenhum texto diz que o envio é só manual |

### 3. Mapa critério → teste automatizado

Arquivo › nome do teste, abreviado. Fonte: as entregas 06-T01 a 06-T20-qa-automacao e a busca no repositório.

| CA | Tipo | Teste que cobre |
|---|---|---|
| CA-01.1 | integração | `src/modules/acesso/tokens-integracao.test.ts` › "token da integração %s resolve como integração, com o prefixo"; `tokens-integracao-qa.test.ts` › "token %s ativo resolve como integração com o prefixo, nunca agente" e "CA-01.1/CA-01.2: $integracao em $acao …" |
| CA-01.2 | integração | os mesmos três, no caso `construir` |
| CA-01.3 | integração + e2e | `src/app/api/demandas/contrato-awave.test.ts` › "CA-01.3: token que não existe → 401 …"; `criacao-awave.test.ts` › "CA-01.3 e CA-01.4: token do Awave revogado → 401 sem gravar …"; `saidas-das-integracoes-qa.test.ts` › "401 com a mensagem fixa nas cinco rotas …"; `e2e/integracoes-qa.spec.ts` › "CP-2 e CP-8 pelo build …" |
| CA-01.4 | integração | `criacao-awave.test.ts` › "CA-01.3 e CA-01.4 …"; `tokens-integracao-qa.test.ts` › "revogar o construir deixa o awave e os quatro agentes valendo …" e "revogar o token de um agente deixa os das duas integrações valendo" |
| CA-01.5 | integração | `src/app/api/pedidos-construcao/entrega-qa.test.ts` › "CA-01.5: token construir revogado → 401 … nas duas rotas …"; `recebimento-qa.test.ts` › "CA-01.5: …"; `saidas-das-integracoes-qa.test.ts` (401) |
| CA-02.1 | integração | `scripts/token-integracao.test.ts` › "CA-02.1 e CA-02.2: --integracao %s sai com 0 …"; `token-integracao-qa.test.ts` › invariante "para cada argv, ou recusa … ou sai 0 com exatamente um token …" |
| CA-02.2 | integração | os mesmos, no caso `construir` |
| CA-02.3 | unidade + integração | `token-integracao.test.ts` › "CA-02.3: …" e "argumentos: …"; `token-integracao-qa.test.ts` › invariante (14 argv recusados), "chamada direta sem dono …" e "o schema aceita só exatamente um dono …" |
| CA-02.4 | integração | `token-integracao.test.ts` › "CA-02.4: revogar pelo prefixo sai com 0 …"; `token-integracao-qa.test.ts` › "awave: o token do script cria demanda (201); …" e "construir: …" (401 pela rota) |
| CA-02.5 | integração | `token-integracao.test.ts` › "CA-02.5: troca do token %s …"; `token-integracao-qa.test.ts` (os dois de rota) |
| CA-02.6 | integração + estático | `conferirSemToken` nos dois arquivos de scripts; `test/transversal/sentinelas.test.ts` › "T13 (a)" e "T13 (b)"; `test/estatico/docs-sem-token.test.ts` |
| CA-03.1 | integração + e2e | `test/matriz-rotas.test.ts` (laço com as integrações); `test/matriz-rotas-integracoes-qa.test.ts` › "<arquivo>: 403 … para cada integração proibida, com e sem Origin, sem gravar" e "CA-03.1: GET …/demandas/route.ts com o token awave …"; `e2e/integracoes-qa.spec.ts` › "CP-2 e CP-8 pelo build …" |
| CA-03.2 | integração + e2e | `matriz-rotas-integracoes-qa.test.ts` › "CA-03.2: POST …", "CA-03.2: GET …[id]…" e "CA-03.2 com corpo válido do contrato do Awave …"; `criacao-awave-qa.test.ts` › "o /construir não cria demanda …"; `e2e/integracoes-qa.spec.ts` (CP-8) |
| CA-03.3 | unidade + integração | `matriz-rotas.test.ts`, `matriz-rotas-qa.test.ts` e `matriz-rotas-integracoes-qa.test.ts` (rotas reais desde a T11 e a T12); `tokens-integracao-qa.test.ts` › "CA-03.3: o token de cada agente nas três ações …"; `entrega.test.ts` › "as duas rotas respondem 403 ao token do awave …"; `recebimento.test.ts` › "a rota responde 403 ao token do awave …" |
| CA-03.4 | unidade + integração | `test/matriz-rotas-qa.test.ts` › "listar_pedidos_pendentes / entregar_pedido / confirmar_recebimento_pedido: proibido …"; `matriz-integracoes-qa.test.ts` › "%s nega cada agente …, cada papel, o awave e o sistema" |
| CA-03.5 | unidade | `matriz-integracoes.test.ts` › "(b) atoresProibidos …"; `matriz-integracoes-qa.test.ts` › "em cada ação, as integrações proibidas …" e "nenhum ator proibido é permitido …" |
| CA-03.6 | unidade | `matriz-integracoes.test.ts` › "(d) integração fora da lista …"; `matriz-integracoes-qa.test.ts` › "valor %i negado nas 23 ações"; `ramos-por-ator-qa.test.ts` |
| CA-04.1 | integração + e2e | `contrato-awave.test.ts` › "CA-04.1, CA-09.1 e CA-07.4: 201 sem Origin …"; `e2e/integracoes.spec.ts` › "CA-09.1: o Awave cria e lê a própria demanda, sem Origin" |
| CA-04.2 | integração | `criacao-awave.test.ts` › "CA-04.2 a CA-04.4: …"; `criacao-awave-qa.test.ts` › "awave com o mesmo corpo completo …"; `src/db/schema/integracao-qa.test.ts` (CHECK do IN-05) |
| CA-04.3 | integração | `criacao-awave.test.ts` › "CA-04.2 a CA-04.4: …" |
| CA-04.4 | integração | `criacao-awave.test.ts` › "CA-04.2 a CA-04.4: …"; `integracao-qa.test.ts` › "o app não troca a autoria nem o rascunho …" |
| CA-04.5 | integração | `criacao-awave.test.ts` › "CA-04.5 e IN-12: …"; `sentinelas.test.ts` › "T13 (a)" |
| CA-04.6 | integração | `criacao-awave.test.ts` › "CA-04.6: tipo fora da lista e corpo sem título → 400, sem gastar id …"; `contrato-awave.test.ts` › "erros no formato { erro, mensagem }, nunca 3xx" |
| CA-04.7 | unidade + e2e | `fila-origem.test.ts` › "CA-04.7: …"; `fila-origem-qa.test.ts` › "CA-04.7: toda demanda do Awave tem o selo …"; `e2e/fila-origem-qa.spec.ts` › "CA-04.7: a demanda do Awave do seed …" |
| CA-05.1 | integração | `criacao-awave.test.ts` › "CA-05.1: …"; `confirmar.test.ts` › "controle: a demanda do Awave nasce sem confirmação …"; `sentinelas.test.ts` › "T13 (a)" (com os agentes ligados) |
| CA-05.2 | integração | `criacao-awave.test.ts` › "CA-05.2: …"; `criacao-awave-qa.test.ts` › "agente orquestrador: … e o insumo técnico dispara" |
| CA-06.1 | integração | `confirmar.test.ts` › "CA-06.1: …"; `acoes-confirmar.test.ts` › "pessoa cto com 2FA confirma: …"; `gatilhos-awave-qa.test.ts` (IN-06 com o handler real da fila) |
| CA-06.2 | integração | `confirmar.test.ts` › "CA-06.2: com o insumo desligado …" e "CA-06.2: com o insumo suspenso pelo teto …" |
| CA-06.3 | integração | `confirmar.test.ts` › "CA-06.3: …" e "IN-07: duas confirmações simultâneas …"; `acoes-confirmar.test.ts` › "CA-06.3: …" |
| CA-06.4 | integração + e2e | `confirmar.test.ts` › "CA-06.4: demanda de pessoa → 409 …" e "… do agente orquestrador → 409 …"; `acoes-confirmar.test.ts` › "CA-06.4: …"; `e2e/confirmacao-awave-qa.spec.ts` › "erro de conflito: …" |
| CA-06.5 | integração | `confirmar.test.ts` › "CA-06.5: Awave em status final → 409 …" e "D-08: …"; `seed-integracoes-qa.test.ts` › confirmação |
| CA-06.6 | unidade + integração + e2e | `confirmar.test.ts` › "CA-06.6: agente, as duas integrações e o sistema …"; `matriz-integracoes-qa.test.ts` › "cada papel passa; cada agente, cada integração e o sistema são negados"; `e2e/seguranca.spec.ts` › "IN-07: …" |
| CA-06.7 | unidade + e2e | `e2e/confirmacao-awave.spec.ts` (aguardando, confirmar, encerrada, pessoa); `e2e/confirmacao-awave-qa.spec.ts` (descrição acessível, erro); `confirmar-demanda.test.ts`; `confirmar-demanda-qa.test.ts`; `dados-da-confirmacao.test.ts`; `dados-da-confirmacao-qa.test.ts` |
| CA-07.1 | integração + e2e | `src/app/api/demandas/leitura-awave.test.ts` › "CA-07.1: …"; `leitura-awave-qa.test.ts` › cabeçalhos do 200; `e2e/integracoes.spec.ts` › "CA-09.1: …" |
| CA-07.2 | integração + e2e | `leitura-awave.test.ts` › "CA-07.2: … 404 igual, byte a byte …"; `leitura-awave-qa.test.ts` › "demanda de pessoa com conta de id \"awave\" …"; `e2e/integracoes-qa.spec.ts` (CP-2) |
| CA-07.3 | integração | `leitura-awave.test.ts` › "CA-07.3: …" e "M-1: …"; `leitura-awave-qa.test.ts` › "editada por pessoa com todo campo preenchido …" |
| CA-07.4 | integração | `contrato-awave.test.ts` › "CA-07.4: as chaves e os valores do 201 são os mesmos do GET …"; `leitura-awave-qa.test.ts` › "vistaDaIntegracao recebe a DemandaVista inteira …" |
| CA-08.1 | integração | `criacao-awave.test.ts` › "CA-08.1 e CA-08.2: …"; `limites-integracao.test.ts`; `limites-integracao-qa.test.ts` › "com 10 na janela … 429 com a mensagem do 10 …" |
| CA-08.2 | integração | `criacao-awave.test.ts` › "CA-08.1 e CA-08.2: …"; `limites-integracao-qa.test.ts` › "a primeira das 10 sai da janela exatamente uma hora depois …" |
| CA-08.3 | integração | `criacao-awave.test.ts` › "CA-08.3: …"; `criacao-awave-qa.test.ts` › "com uma pessoa no limite de 30 …"; `limites-integracao-qa.test.ts` (C-36 ao lado do Awave) |
| CA-08.4 | integração | `criacao-awave.test.ts` › "CA-08.4: 11 POSTs simultâneos …"; `limites-integracao-qa.test.ts` › "exatamente 10 passam e gravam …" |
| CA-09.1 | integração + e2e | `contrato-awave.test.ts` › "CA-04.1, CA-09.1 e CA-07.4 …"; `e2e/integracoes.spec.ts` › "CA-09.1: …" |
| CA-09.2 | integração + e2e | `contrato-awave.test.ts` › "CA-09.2: o mesmo pelo endereço interno …"; `entrega-qa.test.ts` e `recebimento-qa.test.ts` › "RF-09: pela rede interna …"; `e2e/integracoes-qa.spec.ts` › "CA-09.2 pelo build: …". A rede interna real: UAT-04 |
| CA-09.3 | integração + e2e | `entrega.test.ts` › "CA-09.3 e CA-13.1: 200 sem corpo e sem Origin …"; `e2e/integracoes.spec.ts` › "CP-7: …" |
| CA-09.4 | integração | `contrato-awave.test.ts` › "CA-09.4: …"; `entrega-qa.test.ts` › "CA-09.4 na entrega sem corpo …"; `recebimento-qa.test.ts` › "C-15 com cookie …" |
| CA-10.1 | unidade + e2e | `fila-origem.test.ts`; `fila-origem-qa.test.ts` › "tabela: a linha de cada id …" e "cartões: …"; `e2e/fila-origem-qa.spec.ts` › "CA-10.1 sem filtro …"; `e2e/fila-contadores.spec.ts` (cartão em 390 px) |
| CA-10.2 | integração + e2e | `src/modules/demandas/origem.test.ts` › "CA-10.2 e CA-10.4: …"; `origem-qa.test.ts` › "CA-10.2: pessoa junta as duas contas …"; `e2e/fila-origem.spec.ts` › "CA-10.1 e CA-10.2: …" |
| CA-10.3 | integração + e2e | `origem.test.ts` › "awave + nova → só a nova do Awave …"; `e2e/fila-origem.spec.ts` › "CA-10.3 e F2: …"; `e2e/fila-origem-qa.spec.ts` › "Tipo e Origem juntos …" |
| CA-10.4 | integração + unidade | `origem.test.ts` › "CA-10.2 e CA-10.4: …" e "CA-10.4 no detalhe …"; `confirmar-demanda.test.ts` › "Dados: "Origem" antes de "Criada por" …"; `confirmar-demanda-qa.test.ts` › "o contrário do CA-10.4 …" |
| CA-10.5 | integração | `origem.test.ts` › "?origem=awave → 200 …" e "?origem=outra, vazia e repetida → 400 …"; `origem-qa.test.ts` › "pessoa, ?origem=awave …" e "valor fora da lista dá 400 …" |
| CA-10.6 | integração + unidade | `criacao-awave.test.ts` › "CA-10.6: …"; `ramos-por-ator-qa.test.ts` › "a demanda do Awave vista pelo agente identifica a integração …" |
| CA-10.7 | e2e | `e2e/fila-origem.spec.ts` › "filtro Origem = Awave: …" (axe em 1280 e 390) e "Mais filtros (1 ativo) …"; `e2e/confirmacao-awave.spec.ts` (axe no detalhe em três estados); `e2e/confirmacao-awave-qa.spec.ts` (axe no erro) |
| CA-11.1 | integração + e2e | `criacao-awave.test.ts` › "CA-11.1 (API) e CA-11.3: …"; `e2e/agentes-teto.spec.ts` (a T12 percorre `AGENTES`). Falta asserção explícita de ausência na tela: candidato a automação (Pendências) |
| CA-11.2 | integração | `src/db/schema/integracao.test.ts` › "CA-11.2: …"; `test/migracao/migration-0007-dados.test.ts` › "nenhuma linha que existia muda …" |
| CA-11.3 | integração | `criacao-awave.test.ts` › "CA-11.1 (API) e CA-11.3: …" |
| CA-12.1 | integração | `src/modules/pedido-construcao/pendentes.test.ts` › "CA-12.1 e CA-12.2: …"; `entrega.test.ts` › "o DEC aprovado sem pedido_gerado não aparece …" |
| CA-12.2 | integração + e2e | `pendentes.test.ts` › "CA-12.1 e CA-12.2: …"; `e2e/integracoes.spec.ts` › "CP-7: …" |
| CA-12.3 | integração | `pendentes.test.ts` › "CA-12.3: …" |
| CA-12.4 | integração | `pendentes.test.ts` › "CA-12.4: …" (substituição e desatualizado); `pendentes-bordas.test.ts` e `entrega-qa.test.ts` (v2 devolvido) |
| CA-12.5 | integração + e2e | `pendentes.test.ts` › "CA-12.5: …"; `pendentes-bordas.test.ts`; `entrega-qa.test.ts` › "pedido_recebido sobre a entidade demanda …"; `e2e/integracoes.spec.ts` (CP-7) |
| CA-12.6 | integração + e2e | `entrega.test.ts` › "200 com { itens: [{ decId }] } …"; `pendentes.test.ts` › "cada item tem só a chave decId …"; `pendentes-bordas.test.ts`; `e2e/integracoes-qa.spec.ts` › "RF-12 a RF-14 pelo build …" |
| CA-13.1 | integração + e2e | `entrega.test.ts` › "CA-09.3 e CA-13.1 …"; `conferir.test.ts` (ADR-26); `gerar-bytes.test.ts` (SHA-256 fixado antes do refatoramento); `e2e/integracoes-qa.spec.ts` › "RF-12 a RF-14 pelo build …" |
| CA-13.2 | integração | `entrega.test.ts` › "CA-13.2: …"; `entrega-qa.test.ts` › "C-17: decId fora da regex …" |
| CA-13.3 | integração | `entrega.test.ts` › os três "CA-13.3: …"; `conferir-bordas.test.ts` (os três depois do pedido gerado) |
| CA-13.4 | integração | `entrega.test.ts` › "CA-13.4: …"; `conferir-bordas.test.ts` › "CA-13.4: …" |
| CA-13.5 | integração | `entrega.test.ts` › "CA-13.5 e IN-12: …"; `sentinelas.test.ts` › "T13 (b)" |
| CA-13.6 | integração | `entrega.test.ts` › "CA-13.6: o validarPedido do /construir aceita o corpo …"; `scripts/seed-integracoes-qa.test.ts` (V-01 pelas três rotas). V-01 com o `buscar-pedidos.mjs` real: 09 |
| CA-14.1 | integração + e2e | `recebimento.test.ts` › "CA-14.1: …"; `e2e/integracoes.spec.ts` (CP-7) |
| CA-14.2 | integração + e2e | `recebimento.test.ts` › "CA-14.2: …"; `recebimento-qa.test.ts` › "o SHA-256 entregue de um DEC não confirma outro DEC …"; `e2e/integracoes.spec.ts` (CP-7) |
| CA-14.3 | integração + e2e | `recebimento.test.ts` › "CA-14.3: …"; `recebimento-qa.test.ts` › "um pedido_recebido por hash entregue …"; `e2e/integracoes-qa.spec.ts` |
| CA-14.4 | integração | `recebimento.test.ts` › "CA-14.4: …" |
| CA-14.5 | integração + e2e | `recebimento.test.ts` › "CA-14.5 e D-04: …" e "CA-14.5: chave a mais …"; `e2e/integracoes-qa.spec.ts` |
| CA-15.1 | unidade + e2e | `src/components/recebimento.test.ts` › "CA-15.1: …"; `recebimento-qa.test.ts` (componente e página); `pacotes-decisao/[decId]/pagina.test.ts` › "CA-15.1: …"; `e2e/recebido-construir.spec.ts`; `e2e/recebido-construir-qa.spec.ts` |
| CA-15.2 | unidade | `src/components/recebimento.test.ts` › "CA-15.2: …"; `pagina.test.ts` › "CA-15.2: …"; `pacotes-decisao/[decId]/recebimento-qa.test.ts` (sem e2e pela D-11) |
| CA-15.3 | unidade + e2e | `src/components/rotulos-integracao-qa.test.ts` › "CA-15.3: os seis eventos do RF-15 …"; `rotulos-integracao.test.ts`; `rotulos-qa.test.ts`; `e2e/confirmacao-awave.spec.ts` (ator "Awave (prefixo ficticio)") |
| CA-15.4 | e2e | `e2e/recebido-construir.spec.ts` › "T11 com o pedido recebido: … axe nas duas larguras"; `e2e/axe-todas.spec.ts` (T11) |
| CA-16.1 | estático + conferência | `test/estatico/projeto.test.ts` › "versão 0.3.0 …"; `docs-sem-token.test.ts` (CHANGELOG sem token). A entrada 0.3.0 do CHANGELOG: conferência na 10 e na 08 |
| CA-16.2 | estático + conferência | `test/estatico/docs-sem-token.test.ts` (nenhum token em `docs/**/*.md`). Os passos de emitir, trocar e revogar: conferência na 10 |
| CA-16.3 | unidade + e2e + conferência | `src/components/recebimento.test.ts` › "CA-16.3: …"; `e2e/recebido-construir-qa.spec.ts` › "CA-16.3: …"; `e2e/pedido-construcao.spec.ts`. O cap. 05 do manual: conferência na 10 |

### 4. Casos exploratórios sugeridos

Sessões de 30 a 45 minutos, na homologação, com registro do que foi coberto e do que ficou de fora. Prioridade: A
(antes do PR ir ao ar), B (na UAT ou logo depois), C (quando houver tempo).

| Id | Missão | Como | O que procurar | Prioridade | Origem |
|---|---|---|---|---|---|
| EX-01 | Burlar a matriz com o token do Awave | Com `TA`: `PUT`, `PATCH`, `DELETE` e `HEAD` em `/api/demandas/:id`; barra no fim, maiúsculas e `%2F` no caminho; `GET /api/demandas/:id/historico`; `?origem=awave` na listagem | Qualquer 200 fora das duas ações; 404 que difere do de inexistente; dado de outra demanda no corpo de erro | A | RF-03, RF-07 |
| EX-02 | Corpo hostil do Awave | `C1` com título de 10 mil caracteres, U+202E, `<script>`, `anexos` com URL, `urgencia`, e-mail e telefone fictícios no contexto | 500; texto refletido como HTML na fila ou no detalhe; anexo ou urgência gravados (o 06-T06 diz que só 5 campos ficam); o que chega ao agente depois da confirmação | A | RF-04, IN-05 |
| EX-03 | Confirmação fora de ordem | Duplo clique em "Confirmar demanda"; voltar do navegador depois de confirmar e clicar de novo; sessão expirada no meio; conta `sem2fa` | Dois eventos; botão que volta a aparecer; confirmação sem 2FA; erro sem foco no alerta | A | RF-06, IN-07 |
| EX-04 | ESP escrita à mão antes da confirmação | Na demanda do Awave não confirmada, gravar ESP e RSK à mão; ligar o insumo técnico; confirmar | O insumo técnico roda e grava uma ESP nova por cima da da pessoa; o DEC fica desatualizado sem ninguém pedir (o 06-T08 viu que só o insumo dispara depois da confirmação) | B | RF-06, 06-T08-testes |
| EX-05 | Leitor de tela e foco | NVDA (Windows) e VoiceOver (iPhone): fila com "Origem: …" na célula Título; anúncio depois de "Filtrar"; descrição do botão "Confirmar demanda"; "Demanda confirmada."; foco no `h2` da seção; linha "Recebido pelo /construir" com o visto | Visto lido como texto; anúncio duplicado ou ausente; foco que cai no fim da página | B | 06-T16, 06-T18 e 06-T19-testes |
| EX-06 | Zoom de 200 % e 400 % | Chrome no computador: T03 com o seletor Origem; T05 com a seção "Confirmação do Awave" e três selos; T11 com a linha do recebimento | Rolagem lateral; selo cortado; botão fora da vista | B | 03, seção 10 |
| EX-07 | Origem com contadores e navegação | Origem + contador + Voltar do navegador + recarregar; colar URL com `origem` repetida; sem JavaScript, só a Origem | Contador que não bate com a lista; origem perdida no "Filtrar" ou na paginação | B | RF-10, EX-06 da 0015 |
| EX-08 | Entrega recusada em laço | DEC pendente cuja demanda tem o solicitante renomeado para um nome do título; deixar o `buscar-pedidos.mjs` (pasta temporária) rodar algumas vezes | Volume de e-mails de erro a cada 5 minutos; mensagem que ajude Fabiano a achar o DEC; DEC que nunca sai da lista (P-02) | B | 01 e spec P-02 |
| EX-09 | Primeira busca com pedidos antigos | Pasta temporária de pedidos com um arquivo igual e outro diferente do que a entrega devolve | `ja_existia` para o igual; `conflito` claro para o diferente, sem sobrescrever | B | spec P-03 |
| EX-10 | Palavra "Awave" no texto da demanda | `C1` com "Awave" no título e no contexto; ler com `TA` e com `TG`; confirmar com o insumo ligado e ver a entrada do agente | "[nome removido]" no lugar de "Awave" no que o Awave e os agentes recebem (QF-0016-01) | C | 06-T15-testes |
| EX-11 | Duas integrações ao mesmo tempo | Dois tokens `awave` ativos (troca); criar uma demanda por cada um; ler o histórico | Prefixo certo em cada "Criou a demanda"; limite de 10 contado pela integração e não pelo token | C | RF-02, RF-08 |

Fica fora destas sessões: Safari de computador, Firefox, carga (RNF-01 e RNF-02 são da 09) e qualquer teste em produção
fora do roteiro da seção 7.

### 5. Achados desta etapa

Nenhum bloqueia o PR. Não reproduzi à mão (sem Bash nesta etapa); a evidência é a dos testes citados e a leitura do
código.

**QF-0016-01 — O nome "Awave" vira "[nome removido]" no que o Awave e os agentes recebem. Criticidade: baixa.**
- Ambiente: ramo `construcao/DEC-DEM-20261111-0016-v1`, banco do seed (06-T15-testes, `seed-integracoes-qa.test.ts`).
- Passos: criar demanda pelo Awave com o título "Relatório do Awave aguardando confirmação (fictício)"; `GET
  /api/demandas/:id` com o token `awave`.
- Esperado pelo usuário: o título como foi enviado.
- Obtido: `"titulo": "Relatório do [nome removido] aguardando confirmação (fictício)"`. O mesmo vale para o 201 e, pela
  mesma regra, para a vista mínima do agente (título e textos), porque o solicitante gravado é sempre "Awave" e o M-1
  troca o nome do solicitante.
- É o que o RF-07 manda ("minimização pelo `solicitanteNome` atual"), e a spec (7.2) já sabia do efeito. Por isso não é
  defeito de construção.
- Impacto: o contrato da tool do Awave não quebra (ela usa só o `id`). O agente de insumo técnico, depois da confirmação,
  perde a palavra "Awave" do título e do contexto ("pelo agente jarvis do [nome removido]"), o que tira contexto da
  especificação. O painel da pessoa não é afetado.
- Suspeitos: `src/modules/demandas/consultas.ts:345-354` (`vistaDaIntegracao`), `:283` (`nomesDoSolicitante`), a vista
  mínima do agente e `src/modules/dados-pessoais/minimizar.ts`.
- Para: decisão de Fabiano (UAT, seção 7). Se ele quiser mudar, é pedido próprio: tirar os nomes de `NOME_INTEGRACAO` da
  lista de nomes a minimizar (dono: `engenheiro-backend`), com a `seguranca-aplicacao` olhando o M-1.

**QF-0016-02 — Resumo do DEC da `pedidoRecebido` no seed diz "duas aprovações" num DEC só do CTO. Criticidade: baixa
(só homologação).**
- Origem: Minor 2 da 06-T15-revisao, ainda aberto (06-T19-testes).
- Impacto: quem fizer a UAT na homologação lê um resumo que contradiz o "Nível: Só o CTO" da mesma tela. Não chega à
  produção.
- Suspeito: `scripts/seed-ficticio.ts` (`resumoExecutivo` do pedido recebido). Para: `engenheiro-backend` na 08, se o
  maestro quiser.

**QF-0016-03 — Teste instável fora do pedido: `src/modules/dados-pessoais/minimizar.test.ts:642`. Criticidade: média
para o processo, nenhuma para o usuário.**
- Mede o relógio real (limite de 200 ms) e falhou com 306 ms na suíte inteira (06-T18-testes); sozinho, passa.
- Impacto: CI vermelho sem defeito, que ensina a ignorar vermelho.
- Para: `qualidade` e `tech-lead` (tarefa própria; subir o limite seria afrouxar a asserção). Candidato a `qa-automacao`:
  medir crescimento linear sem relógio.

**QF-0016-04 — Trace do e2e pode guardar o cabeçalho `authorization` do token do e2e local. Criticidade: baixa.**
- Origem: M1 da 06-T20-tech-lead; `e2e/integracoes.spec.ts` com `trace: retain-on-failure`. O arquivo de QA já desliga o
  trace. O token é de banco descartável.
- Para: `/security-review` da 08.

**Observações sem achado:**
- Entrega depois do `pedido_recebido` continua 200 e não grava evento se o hash já foi entregue; a regra não está escrita
  no 01 (06-T11 e 06-T12). Decisão da 08.
- Uma execução `demanda:<id>` ignorada por `sem_confirmacao` impediria o insumo técnico depois da confirmação (06-T08).
  Hoje nenhum caminho cria essa execução; falha fechada. Para a 08.
- `RE_DEC` do `buscar-pedidos.mjs` aceita `v\d+` e o servidor `v\d{1,4}` (06-T12). Sem efeito prático.

### 6. Aderência ao desenho da 03

Conferi os textos e estados da 03 contra os testes de tela das 06-T16 a 06-T19: filtro "Origem" entre Tipo e Linha;
"Origem: …" na célula Título e no cartão; selo "Aguardando confirmação" âmbar; seção "Confirmação do Awave" depois de
Dados, com os três parágrafos, o botão sem diálogo e os estados aguardando, confirmada, final sem confirmação e erro;
linha 14 da Próxima ação; rótulos do histórico; linha "Recebido pelo /construir em …" depois de "Repositório destino";
texto novo da seção do pedido; T12 sem mudança. Nenhuma divergência achada nos testes. O que só se vê à mão (leitor de
tela, zoom, Safari) está em EX-05, EX-06 e na UAT.

### 7. Roteiro de aceite para Fabiano (UAT, depois da publicação)

**Quando:** logo depois do deploy da 0.3.0 e **antes** de o Awave e o `/construir` entrarem em uso normal. A volta para
a 0.2.0 é por restauração do backup (ADR-12): tudo o que for gravado depois do deploy se perde numa volta, e por isso
quanto antes a UAT, menos se perde.

**Pré-requisitos, todos de Fabiano:** merge do PR com CI verde; backup, migration `0007` e deploy pela seção 5 de
`docs/operacao/deploy.md` (worker e app); lembrar que o snapshot no hPanel hoje congela a VPS e exige reboot manual; a
conferência só de leitura depois do deploy (R09) sem diferença, com a 0.3.0 no app e no worker.

**Onde:** produção (`orquestrador.wsscloud.tech`), com a conta real de Fabiano (CTO), o Awave de produção e o crontab do
`/construir`. **Dados:** só demandas com título terminado em "(fictício)", sem nome de pessoa e sem a palavra "Awave" no
título (QF-0016-01). As demandas de teste são encerradas no fim; os eventos ficam (são permanentes). **Tokens:** cada
token aparece uma vez no console e vai direto ao lugar dele; nunca ao chat, a arquivo do repositório ou a e-mail; anote
só o prefixo. **Duração:** 45 a 60 minutos, mais a espera de uma busca do `/construir` (até 5 minutos).

Fora da UAT em produção, de propósito: o limite de 10 por hora (criaria 11 demandas; coberto pelo CA-08.4 e pela
homologação) e a recusa de entrega (precisa mexer em demanda real).

| # | Passo | Aceito quando | OK? |
|---|---|---|---|
| UAT-01 | Abrir a fila no computador | Toda linha das demandas que já existiam mostra "Origem: Pessoa" (ou "Agente de IA"); o seletor "Origem" aparece entre Tipo e Linha de serviço; nenhuma tela de erro | [ ] |
| UAT-02 | Abrir "Agentes e teto"; anotar se o insumo técnico está ligado e o uso do mês | Só os quatro agentes de IA; nada de "Awave" nem "/construir". Se o insumo técnico estiver ligado, decidir antes do UAT-07 se ele deve rodar sobre o texto fictício (gasta pouco do teto) | [ ] |
| UAT-03 | No console do serviço `app` no Easypanel: `pnpm tsx scripts/criar-token-servico.ts --integracao awave`; colar o token no card "Token do Orquestrador" do `/config` do Awave; endereço `http://orquestrador_app` | A saída mostra o prefixo e o token uma vez; o card aceita os dois | [ ] |
| UAT-04 (V01/W16) | No Awave, pedir a um agente uma demanda: título "Teste de integração 0.3.0 (fictício)", tipo melhoria, descrição "Texto fictício para o teste de aceite."; aprovar em `/aprovacoes` | O Awave informa sucesso com um id `DEM-AAAAMMDD-NNNN` (chamada pela rede interna, sem `Origin`) | [ ] |
| UAT-05 | Na fila, Origem = Awave e "Filtrar" | Só a demanda do UAT-04, com "Rascunho de agente" e "Origem: Awave"; total 1 | [ ] |
| UAT-06 | Abrir a demanda | Selo "Aguardando confirmação"; Próxima ação "Confirmar a demanda aberta pelo Awave."; Dados com "Origem: Awave", "Criada por: Awave" e solicitante "Awave"; seção "Confirmação do Awave" com os três parágrafos e o botão; Histórico "Criou a demanda" por "Awave (prefixo <o anotado>)"; na T12, o uso de IA igual ao do UAT-02 | [ ] |
| UAT-07 | "Confirmar demanda" | "Confirmando…" e depois "Demanda confirmada."; a seção diz "Confirmada por <seu nome> (CTO) em <data e hora>."; o selo some; Histórico "Confirmou a demanda aberta pelo Awave"; Próxima ação muda (insumo desligado: "Escrever a especificação técnica"; ligado: esperar o agente) | [ ] |
| UAT-08 | Mudar status → Encerrada | A seção continua com "Confirmada por …"; a demanda sai dos contadores abertos | [ ] |
| UAT-09 (V02/W17) | No console: `pnpm tsx scripts/revogar-token-servico.ts --prefixo <prefixo do UAT-03>`; pedir ao Awave outra demanda fictícia e aprovar | O Awave mostra ao dono "Token de serviço inválido ou revogado."; a fila com Origem = Awave continua com 1 | [ ] |
| UAT-10 | Emitir um token `awave` novo (como no UAT-03), trocar no card e pedir "Teste de troca de token 0.3.0 (fictício)" | Sucesso com id novo; no Histórico, o prefixo novo | [ ] |
| UAT-11 | No iPhone (Safari), abrir a demanda do UAT-10; depois Mudar status → Encerrada, sem confirmar | Antes: selos quebram linha sem cortar e "Confirmar demanda" ocupa a largura do cartão. Depois: "Esta demanda foi aberta pelo Awave e não foi confirmada. Ela está em Encerrada, um status final: não há confirmação a fazer.", sem botão | [ ] |
| UAT-12 | No console: `pnpm tsx scripts/criar-token-servico.ts --integracao construir`; gravar o token direto em `~/.config/ws-construir/token-orquestrador` do usuário `deploy`, com `chmod 600`, sem mostrar o valor | Arquivo com permissão 600; nenhum token na tela depois da gravação | [ ] |
| UAT-13 | Antes de ligar, conferir em `pedidos/` da estruturaAutonoma quais pedidos gerados no painel ainda não foram copiados (os gerados antes da 0.3.0 entram na primeira busca, P-03); trocar `"ligado"` para `true` em `pedidos/config/orquestrador.json`; esperar a busca do crontab (até 5 min) ou rodar uma vez `node ferramentas/construir/buscar-pedidos.mjs` | A linha da busca é `ok` (ou `atencao` só por um `conflito` esperado de pedido antigo); cada pendente sai `gravado` ou `ja_existia`; o e-mail chega quando há pedido novo; a busca seguinte não traz nada | [ ] |
| UAT-14 | Se a busca trouxe um pedido: abrir a T11 do DEC e o Histórico da demanda; comparar o SHA-256 do arquivo em `pedidos/` com o do JSON baixado da T11 | "✓ Recebido pelo /construir em dd/mm/aaaa às hh:mm."; Histórico com "Buscou o Pedido de Construção de DEC-…" e "Confirmou o recebimento do Pedido de Construção de DEC-…" por "/construir (prefixo …)"; SHA-256 iguais. Se não havia pedido pendente: repetir no próximo pedido gerado; até lá vale a V-01 da homologação (09) | [ ] |
| UAT-15 | Abrir a T11 de um DEC aprovado vigente | A seção "Pedido de Construção" diz "Gere o pedido. Com a busca automática do /construir ligada, …"; nada diz que o envio é só manual | [ ] |
| UAT-16 | No dia seguinte, ler o status report das 8h | A seção "Busca de pedidos no Orquestrador" mostra as buscas `ok` | [ ] |

**Decisões que ficam com Fabiano** (registrar no relatório de UAT):
- QF-0016-01: aceita que o Awave e os agentes recebam "[nome removido]" no lugar de "Awave" no título e no contexto, ou
  quer um pedido próprio para tirar os nomes das integrações da minimização?
- P-04 da spec (risco residual dos dois tokens e do ponto humano só na geração do pedido): aceito em 11/11; falta o
  registro com a `gestao-riscos`.
- Uso normal das integrações depois da UAT: só com a aprovação dele.

**Se algo falhar na UAT:** revogar pelo prefixo o token da integração com problema (efeito imediato, os outros seguem) e,
no `/construir`, voltar `"ligado"` para `false` (a cópia manual continua valendo). A volta da versão é por restauração do
backup, decisão de Fabiano.

## Decisões tomadas

- Contei como cobertos, e não "sem cobertura", o CHANGELOG do CA-16.1, o CA-16.2 e o manual do CA-16.3: são documentos
  que o plano aprovado põe na `10-documentacao` (05, G2; plano, Cobertura: "RF-16 … manual, `docs/operacao` e CHANGELOG
  na 10"), depois desta etapa; a parte testável já tem teste; e nenhuma tarefa do `tarefas.json` é dona deles, então
  devolver a um engenheiro da 06 contrariaria o plano. Mesmo critério da 07 do pedido 0015 para o que se confere por
  leitura.
- O CA-09.2 e o critério preliminar 6 ficam cobertos pelo `Host: orquestrador_app` nos testes de rota e no e2e do build;
  a rede interna real do Easypanel só existe em produção e vai para a UAT-04, como o 01 (seção 5) e a spec (5.5, item 8)
  definem.
- O critério preliminar 9 (`buscar-pedidos.mjs` contra a homologação) fica com o CA-13.6 automatizado e a V-01 da 09.
- O CA-11.1 conta como coberto (API, `configuracao_agente` com quatro linhas e o e2e da T12 que percorre `AGENTES`), mas
  sem asserção de ausência de "Awave" na tela; virou candidato a automação, sem devolver.
- Nenhum achado volta à construção: o QF-0016-01 é comportamento pedido pelo RF-07; os outros não são do código entregue
  ou já estão endereçados à 08.
- A UAT é em produção porque o pedido do maestro pede um roteiro válido depois da publicação e porque só lá existem a
  rede interna e os tokens reais; por isso usa o mínimo de dado fictício (três tentativas no Awave, duas demandas,
  encerradas) e deixa o limite de taxa e a recusa de entrega para a homologação.
- O V02/W17 (token revogado) é feito revogando o token ativo e emitindo outro, e não chamando a API à mão com o token
  antigo: assim nenhum token passa por terminal além do console de emissão, e o dono vê no Awave a mensagem real.

## Pendências

- Para a 08 (maestro): QF-0016-02 (texto do seed), QF-0016-04 (trace com `authorization`), a regra da entrega depois do
  recebimento e a execução ignorada por `sem_confirmacao` (seção 5, Observações).
- Para a 10 (`documentacao-tecnica`): CHANGELOG 0.3.0, `docs/operacao/` dos dois tokens e o cap. 05; a 08 ou a 10 confere
  o CA-16.1, o CA-16.2 e o CA-16.3 pelo roteiro da seção 2. Registrar no manual que título de demanda do Awave não deve
  levar nome de pessoa (spec 7.2) e o efeito do QF-0016-01.
- Para a 09 (`devops-sre`): V-01 e V-02 na homologação; RNF-01 e RNF-02 medidos; o roteiro da seção 2 serve de reprodução
  manual.
- Candidatos a automação para a `qa-automacao`: (1) a T12 sem "Awave" nem "/construir" na tela (CA-11.1); (2) teste
  estático de que o CHANGELOG tem a entrada da versão do `package.json` (CA-16.1), depois da 10; (3) o
  `minimizar.test.ts` sem relógio (QF-0016-03); (4) o ajudante único `ehServerAction` no `e2e/apoio.ts` (Minor 3 da
  06-T18).
- Para `qualidade` e `tech-lead`: QF-0016-03.
- Para Fabiano: executar a UAT da seção 7 depois do deploy e responder o QF-0016-01.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (07) todo critério de aceite de 01 aparece no mapa
- [x] (07) nenhum critério ficou "sem cobertura"
- [x] (07) os dados de teste são fictícios
