# Manual técnico do WS Orquestrador de Demandas

| Campo | Valor |
|---|---|
| Versão do sistema | 0.4.1 (sobras da 0.1.13 e da revisão da 0.4.0: situação do pedido para o `/construir`, D1 também com o nome em vigor na criação do DEC, arquivar o DEC mais novo sem encerrar a demanda que tem um aprovado em vigor, três avisos da vigência na T11, textos revistos pela `ux-ui-design` e o teste C-27 estável; ver o [cap. 04](04-versoes-e-decisao.md#arquivar-o-dec-mais-novo-041), o [cap. 05](05-pedido-de-construcao.md#situação-do-pedido-041), o [cap. 08](08-painel.md#avisos-da-vigência-e-arquivar-041) e o [CHANGELOG](../../CHANGELOG.md)). Na 0.4.0, andamento do Pedido de Construção informado pelo `/construir`: fase e tarefas prontas, duas mudanças de status automáticas, selo de fase na fila, seção no detalhe e leitura reduzida pelo Awave; ver o [cap. 05](05-pedido-de-construcao.md#andamento-da-construção-040), o [cap. 08](08-painel.md#fila-t03-rf-05-a-rf-07) e o [CHANGELOG](../../CHANGELOG.md)). Na 0.3.1, correções da revisão da 0.3.0: o agente não lê nem grava na demanda do Awave antes da confirmação por pessoa, e recebe o 404 da inexistente; o insumo que chegou cedo roda depois da confirmação; o recebimento do `/construir` só aceita o hash da última entrega; prazo total nas transações das integrações; ver o [cap. 03](03-demandas.md#demanda-aberta-pelo-awave-030), o [cap. 05](05-pedido-de-construcao.md#recebimento-confirmar_recebimento_pedido), o [cap. 06](06-agentes-de-ia.md#rf-16-execução-dos-agentes) e o [CHANGELOG](../../CHANGELOG.md)). Na 0.3.0, entraram os atores de integração: o Awave cria demanda e lê as que criou, e o `/construir` busca o Pedido de Construção que uma pessoa gerou e confirma o recebimento; a demanda do Awave só vai a um agente de IA depois da confirmação por pessoa; origem da demanda na fila; ver o [cap. 02](02-acesso-e-seguranca.md#atores-de-integração-030), o [cap. 03](03-demandas.md#demanda-aberta-pelo-awave-030), o [cap. 05](05-pedido-de-construcao.md#entrega-ao-construir-030) e o [CHANGELOG](../../CHANGELOG.md)). Na 0.2.0, o painel ganhou o novo visual ([cap. 08](08-painel.md)) |
| Atualizado em | 14/11/2026 |
| Dono do sistema | Fabiano (CTO) |
| Dono deste manual | `documentacao-tecnica` |
| Fonte de verdade | o código do ramo (padrão técnico, seção 11). Onde a spec ou o plano dizem outra coisa, vale o código, e a diferença está apontada no capítulo |
| Situação | vigente |

O manual descreve o sistema como ele está construído. Cada capítulo cita os arquivos de onde a descrição saiu e os
requisitos (RF) que cobre. Variável de ambiente aparece só pelo nome; valor nenhum é escrito aqui.

A spec aprovada na Parada 1 (`docs/superpowers/specs/2026-10-25-ws-orquestrador-demandas-design.md`) ainda descreve o
C-28 só com e-mail, telefone e CPF e a T11 sem a caixa de confirmação. Vale o código, descrito no
[cap. 05](05-pedido-de-construcao.md). A substituição do DEC aprovado (0.1.13), que revê a A-02, está descrita no
[cap. 04](04-versoes-e-decisao.md#substituição-do-dec-aprovado). A atualização da spec (a A-02 e o S-01 no RF-13, os
CA-22.x e o D1 com o nome da criação no RF-22, o arquivamento da 0.4.1 no RF-07) fica com o maestro do `/construir`
(RF-09 do pedido 0018); até lá, vale o código, descrito nos caps. 04 e 05.

O novo visual (0.2.0) tem spec própria, `docs/superpowers/specs/2026-11-10-ws-orquestrador-demandas-novo-visual-design.md`,
com requisitos numerados de RF-01 a RF-17 **do pedido 0015**. Esses números não são os do sistema: o mapa deles está
na seção [Requisitos do novo visual](#requisitos-do-novo-visual-020) abaixo.

As integrações (0.3.0) também têm spec própria,
`docs/superpowers/specs/2026-11-11-ws-orquestrador-demandas-integracoes-design.md`, com RF-01 a RF-16 **do pedido
0016**. O mapa deles está em [Requisitos das integrações](#requisitos-das-integrações-030).

A 0.3.1 (pedido `DEC-DEM-20261112-0019-v1`, sem spec própria) mudou partes dessa spec. A spec ainda não foi atualizada
(fica com o maestro do `/construir`). Vale o código, descrito nos capítulos:

- o agente não lê nem grava na demanda do Awave antes da confirmação. Isso substitui o CA-10.6
  ([cap. 03](03-demandas.md#demanda-aberta-pelo-awave-030));
- o recebimento do `/construir` só aceita o hash da última entrega. Isso muda o RF-14 e o ADR-26
  ([cap. 05](05-pedido-de-construcao.md#recebimento-confirmar_recebimento_pedido));
- as transações das integrações têm prazo total. Isso completa o ADR-28
  ([cap. 02](02-acesso-e-seguranca.md#atores-de-integração-030)).

O andamento do Pedido de Construção (0.4.0) tem spec própria,
`docs/superpowers/specs/2026-11-12-ws-orquestrador-demandas-andamento-design.md`, com RF-01 a RF-13 **do pedido 0017**.
O mapa deles está em [Requisitos do andamento](#requisitos-do-andamento-040).

As sobras da 0.1.13 e da revisão da 0.4.0 (0.4.1) têm spec própria,
`docs/superpowers/specs/2026-11-13-ws-orquestrador-demandas-sobras-design.md`, com RF-01 a RF-10 **do pedido 0018**.
O mapa deles está em [Requisitos das sobras](#requisitos-das-sobras-041). A rota de situação ainda não está na spec das
integrações (fica com o maestro); vale o [cap. 05](05-pedido-de-construcao.md#situação-do-pedido-041).

## Capítulos

| Cap. | Assunto | Requisitos |
|---|---|---|
| [01](01-arquitetura.md) | Arquitetura, processos, módulos, banco, versões da stack e fontes | RNF-01, RNF-02, RNF-05, ADR-01 a ADR-40 |
| [02](02-acesso-e-seguranca.md) | Login com 2FA, tokens de agente e de integração, atores de integração, matriz de acesso, CSRF, log | RF-01, RF-02, RNF-10, RNF-12, RNF-13 |
| [03](03-demandas.md) | Demanda, entrada colando o texto, id, consulta, origem, demanda aberta pelo Awave e confirmação, status (com as transições do `/construir`), dúvida em aberto, histórico | RF-03 a RF-07, RF-15, RF-21 |
| [04](04-versoes-e-decisao.md) | ESP, RSK e DEC em versões, desatualizado, decisão, substituição do DEC aprovado, arquivamento do DEC mais novo e dupla aprovação | RF-08 a RF-14 |
| [05](05-pedido-de-construcao.md) | Pedido de Construção (com o nome da criação no D1), entrega ao `/construir`, andamento da construção, situação do pedido e filtro de pacotes por decisão | RF-22, RF-23 |
| [06](06-agentes-de-ia.md) | Os quatro agentes, uso, teto, interruptor, minimização e as pré-condições para ligar | RF-16 a RF-20 |
| [07](07-worker-avisos-retencao.md) | Worker, aviso por e-mail e expurgo do texto bruto | RF-24, RF-25 |
| [08](08-painel.md) | Telas do painel, identidade visual, casca, fila, demanda, decisão, acessibilidade e capturas | RF-26, RNF-11, RNF-16; RF-01 a RF-17 do pedido 0015 |
| [09](09-referencia-api.md) | Referência da API: rotas, quem pode, corpo e erros | RF-03, RF-06, RF-13, RF-22, RF-23 |
| [10](10-configuracao-e-scripts.md) | Variáveis de ambiente e scripts de operação | RNF-13, RNF-14 |

Operação em produção (serviços do Easypanel, deploy, rollback, alertas) fica em
[docs/operacao/deploy.md](../operacao/deploy.md). Emissão, guarda, troca e revogação dos tokens das integrações ficam em
[docs/operacao/tokens-de-integracao.md](../operacao/tokens-de-integracao.md).

## Mapa de cada RF

| RF | Resumo | Capítulo |
|---|---|---|
| RF-01 | Login com senha e TOTP obrigatório; sem cadastro público | [02](02-acesso-e-seguranca.md#rf-01-login-com-2fa) |
| RF-02 | Token de serviço por agente, só em rota de agente; desde a 0.3.0, também por integração | [02](02-acesso-e-seguranca.md#rf-02-token-de-serviço-dos-agentes) |
| RF-03 | Criar demanda pelo painel e pela API (desde a 0.3.0, também pelo Awave) | [03](03-demandas.md#rf-03-criar-demanda) |
| RF-04 | Ids `DEM-AAAAMMDD-NNNN` e `<prefixo>-<demanda>-vN` | [03](03-demandas.md#rf-04-ids) |
| RF-05 | Entrada colando o texto bruto | [03](03-demandas.md#rf-05-entrada-colando-o-texto) |
| RF-06 | Consulta com filtros e paginação | [03](03-demandas.md#rf-06-consultar-e-alterar) |
| RF-07 | Nove status e tabela de transições (desde a 0.4.1, o arquivamento do DEC mais novo segue o aprovado vigente) | [03](03-demandas.md#rf-07-status-e-transições) e [04](04-versoes-e-decisao.md#arquivar-o-dec-mais-novo-041) |
| RF-08 | ESP versionada com os campos de construção | [04](04-versoes-e-decisao.md#rf-08-especificação-técnica-esp) |
| RF-09 | RSK versionado | [04](04-versoes-e-decisao.md#rf-09-parecer-de-risco-rsk) |
| RF-10 | DEC cita a ESP e o RSK (os mais novos; na consolidação, os que o agente leu) | [04](04-versoes-e-decisao.md#rf-10-pacote-de-decisão-dec) |
| RF-11 | Versão gravada nunca muda | [04](04-versoes-e-decisao.md#rf-11-imutabilidade) |
| RF-12 | DEC desatualizado | [04](04-versoes-e-decisao.md#rf-12-dec-desatualizado) |
| RF-13 | Decisão só por pessoa com 2FA; o DEC aprovado mais novo substitui o anterior (desde a 0.1.13) | [04](04-versoes-e-decisao.md#rf-13-decisão) |
| RF-14 | Dupla aprovação `cto_e_administradora` | [04](04-versoes-e-decisao.md#rf-14-dupla-aprovação) |
| RF-15 | Dúvida em aberto leva a `aguardando_informacao` | [03](03-demandas.md#rf-15-dúvida-em-aberto) |
| RF-16 | Quatro agentes como jobs do pg-boss | [06](06-agentes-de-ia.md#rf-16-execução-dos-agentes) |
| RF-17 | Uso por chamada (tokens e custo) | [06](06-agentes-de-ia.md#rf-17-uso-por-chamada) |
| RF-18 | Teto mensal de gasto | [06](06-agentes-de-ia.md#rf-18-teto-de-gasto) |
| RF-19 | Interruptor por agente | [06](06-agentes-de-ia.md#rf-19-interruptor-e-modelo) |
| RF-20 | Minimização do que vai ao provedor | [06](06-agentes-de-ia.md#rf-20-minimização) |
| RF-21 | Histórico só de inclusão | [03](03-demandas.md#rf-21-histórico) |
| RF-22 | Pedido de Construção (desde a 0.3.0, também a entrega ao `/construir`; desde a 0.4.0, o andamento da construção; desde a 0.4.1, o nome da criação no D1 e a situação do pedido) | [05](05-pedido-de-construcao.md#rf-22-gerar-o-pedido), [05](05-pedido-de-construcao.md#entrega-ao-construir-030), [05](05-pedido-de-construcao.md#andamento-da-construção-040) e [05](05-pedido-de-construcao.md#situação-do-pedido-041) |
| RF-23 | `GET /api/pacotes-decisao?statusDecisao=` | [05](05-pedido-de-construcao.md#rf-23-pacotes-por-status-de-decisão) |
| RF-24 | Expurgo diário do texto bruto | [07](07-worker-avisos-retencao.md#rf-24-expurgo-do-texto-bruto) |
| RF-25 | E-mail de DEC pronto | [07](07-worker-avisos-retencao.md#rf-25-aviso-por-e-mail) |
| RF-26 | Painel em pt-BR | [08](08-painel.md) |

## Requisitos do novo visual (0.2.0)

Os RF abaixo são do pedido `DEC-DEM-20261110-0015-v1` (spec de 10/11/2026), e não os do sistema. Os critérios
Dado/Quando/Então estão em `docs/construcao/DEC-DEM-20261110-0015-v1/01-analista-requisitos.md`.

| RF do pedido | Resumo | Capítulo |
|---|---|---|
| RF-01 | Tokens de cor, família, raio e foco num só lugar | [08](08-painel.md#identidade-visual-rf-01-rf-02) |
| RF-02 | Noto Sans e Noto Sans Mono servidas pelo próprio app | [08](08-painel.md#identidade-visual-rf-01-rf-02) e [01](01-arquitetura.md#fontes-adr-13) |
| RF-03 | Casca com menu lateral, a partir de 768 px | [08](08-painel.md#casca-e-gaveta-rf-03-rf-04) |
| RF-04 | Gaveta do menu, abaixo de 768 px | [08](08-painel.md#casca-e-gaveta-rf-03-rf-04) |
| RF-05 | Contadores por status na fila | [08](08-painel.md#fila-t03-rf-05-a-rf-07) e [03](03-demandas.md#rf-06-consultar-e-alterar) |
| RF-06 | Tabela densa da fila, com Etapas e Idade | [08](08-painel.md#fila-t03-rf-05-a-rf-07) |
| RF-07 | Lista de cartões da fila, abaixo de 768 px | [08](08-painel.md#fila-t03-rf-05-a-rf-07) |
| RF-08 | Barra das cinco etapas na T05 | [08](08-painel.md#demanda-t05-rf-08-a-rf-10) |
| RF-09 | Cartão "Próxima ação" na T05 | [08](08-painel.md#demanda-t05-rf-08-a-rf-10) |
| RF-10 | T05 no arranjo A2, sem perder nada | [08](08-painel.md#demanda-t05-rf-08-a-rf-10) |
| RF-11 | T11 por três botões | [08](08-painel.md#decisão-t11-rf-11-rf-12) |
| RF-12 | T11 no celular (C2) | [08](08-painel.md#decisão-t11-rf-11-rf-12) |
| RF-13 | Entrar, 2FA, Sem permissão, erro e 404 com a marca | [08](08-painel.md#telas-públicas-e-demais-telas-rf-13-rf-14) |
| RF-14 | Demais telas com casca e tokens | [08](08-painel.md#telas-públicas-e-demais-telas-rf-13-rf-14) |
| RF-15 | Superfícies que não mudam | [08](08-painel.md#o-que-não-mudou-rf-15) |
| RF-16 | Testes nas duas larguras, vigia de origem e CSP | [08](08-painel.md#acessibilidade-rnf-11) |
| RF-17 | Versão 0.2.0, CHANGELOG, manual e capturas | [08](08-painel.md#capturas-de-tela) e [CHANGELOG](../../CHANGELOG.md) |

## Requisitos das integrações (0.3.0)

Os RF abaixo são do pedido `DEC-DEM-20261111-0016-v1` (spec de 11/11/2026), e não os do sistema. Os critérios
Dado/Quando/Então estão em `docs/construcao/DEC-DEM-20261111-0016-v1/01-analista-requisitos.md`.

| RF do pedido | Resumo | Capítulo |
|---|---|---|
| RF-01 | Ator `integracao` (`awave`, `construir`), só por Bearer, fora de `AGENTES` | [02](02-acesso-e-seguranca.md#atores-de-integração-030) |
| RF-02 | Scripts de token com `--integracao`; troca e revogação pelo prefixo | [10](10-configuracao-e-scripts.md#scripts-de-operação) e [tokens-de-integracao.md](../operacao/tokens-de-integracao.md) |
| RF-03 | Matriz com lista fechada por integração | [02](02-acesso-e-seguranca.md#matriz-de-acesso) |
| RF-04 | O Awave cria demanda: autoria, rascunho, solicitante "Awave", evento | [03](03-demandas.md#demanda-aberta-pelo-awave-030) |
| RF-05 | Demanda do Awave não dispara agente (desde a 0.3.1, o agente também não a lê nem grava nela antes da confirmação) | [03](03-demandas.md#demanda-aberta-pelo-awave-030) e [06](06-agentes-de-ia.md#os-quatro-agentes) |
| RF-06 | Confirmação por pessoa no painel | [03](03-demandas.md#demanda-aberta-pelo-awave-030) e [08](08-painel.md#demanda-t05-rf-08-a-rf-10) |
| RF-07 | O Awave lê só a própria demanda, em seis chaves | [03](03-demandas.md#demanda-aberta-pelo-awave-030) |
| RF-08 | Limite de 10 demandas por hora do Awave | [03](03-demandas.md#rf-03-criar-demanda) |
| RF-09 | Bearer sem `Origin` continua aceito | [02](02-acesso-e-seguranca.md#proteção-das-rotas) |
| RF-10 | Origem da demanda na fila, no detalhe e na API, com filtro | [03](03-demandas.md#rf-06-consultar-e-alterar) e [08](08-painel.md#fila-t03-rf-05-a-rf-07) |
| RF-11 | Integração fora da tela de agentes, do teto e do uso de IA | [02](02-acesso-e-seguranca.md#atores-de-integração-030) e [06](06-agentes-de-ia.md#os-quatro-agentes) |
| RF-12 | `GET /api/pedidos-construcao/pendentes` | [05](05-pedido-de-construcao.md#pendentes-listar_pedidos_pendentes) |
| RF-13 | `POST /api/pedidos-construcao/:decId/entrega` | [05](05-pedido-de-construcao.md#entrega-entregar_pedido) |
| RF-14 | `POST /api/pedidos-construcao/:decId/recebimento` (desde a 0.3.1, só o hash da última entrega) | [05](05-pedido-de-construcao.md#recebimento-confirmar_recebimento_pedido) |
| RF-15 | "Recebido pelo /construir em …" na T11 e rótulos do histórico | [05](05-pedido-de-construcao.md#no-painel), [08](08-painel.md#decisão-t11-rf-11-rf-12) e [03](03-demandas.md#rf-21-histórico) |
| RF-16 | Versão 0.3.0, CHANGELOG, manual e `docs/operacao` | [CHANGELOG](../../CHANGELOG.md) e [tokens-de-integracao.md](../operacao/tokens-de-integracao.md) |

## Requisitos do andamento (0.4.0)

Os RF abaixo são do pedido `DEC-DEM-20261111-0017-v1` (spec de 12/11/2026), e não os do sistema. Os critérios
Dado/Quando/Então estão em `docs/construcao/DEC-DEM-20261111-0017-v1/01-analista-requisitos.md`.

| RF do pedido | Resumo | Capítulo |
|---|---|---|
| RF-01 | Ação `registrar_andamento`, só do `construir` | [02](02-acesso-e-seguranca.md#matriz-de-acesso) |
| RF-02 | `POST /api/pedidos-construcao/<DEC-id>/andamento`, corpo fechado, 422 sem eco | [05](05-pedido-de-construcao.md#rota-registrar_andamento) e [09](09-referencia-api.md#exemplo-o-construir-informa-o-andamento) |
| RF-03 | Só DEC com pedido gerado por pessoa; o mesmo 404 nos outros casos (A3) | [05](05-pedido-de-construcao.md#ordem-das-conferências) |
| RF-04 | Último andamento guardado; mesmo estado não grava | [05](05-pedido-de-construcao.md#o-que-fica-gravado-andamento_construcao) |
| RF-05 | Duas transições automáticas e o 409 de status final e de DEC substituído | [05](05-pedido-de-construcao.md#transições-pelo-andamento) e [03](03-demandas.md#rf-07-status-e-transições) |
| RF-06 | Evento `andamento_registrado` só na mudança de fase ou situação (A2) | [05](05-pedido-de-construcao.md#evento-andamento_registrado) e [03](03-demandas.md#rf-21-histórico) |
| RF-07 | Linha 15 da Próxima ação: uma pessoa confere e marca Entregue (A1) | [08](08-painel.md#demanda-t05-rf-08-a-rf-10) |
| RF-08 | Selo de fase na fila | [08](08-painel.md#fila-t03-rf-05-a-rf-07) |
| RF-09 | Seção "Andamento da construção" no detalhe | [08](08-painel.md#demanda-t05-rf-08-a-rf-10) |
| RF-10 | Sétima chave, `andamento`, na vista do Awave, com quatro campos | [03](03-demandas.md#demanda-aberta-pelo-awave-030) |
| RF-11 | `andamento` na vista de pessoa; agente e listagem sem a chave | [03](03-demandas.md#rf-06-consultar-e-alterar) e [09](09-referencia-api.md#rotas) |
| RF-12 | Limite de 60 gravações por DEC e 600 no total por hora | [05](05-pedido-de-construcao.md#limite-conferirlimitedeandamento) |
| RF-13 | Versão 0.4.0, CHANGELOG, manual e `docs/operacao` | [CHANGELOG](../../CHANGELOG.md), [deploy.md](../operacao/deploy.md) e [tokens-de-integracao.md](../operacao/tokens-de-integracao.md) |

## Requisitos das sobras (0.4.1)

Os RF abaixo são do pedido `DEC-DEM-20261111-0018-v1` (spec de 13/11/2026), e não os do sistema. Os critérios
Dado/Quando/Então estão em `docs/construcao/DEC-DEM-20261111-0018-v1/01-analista-requisitos.md`.

| RF do pedido | Resumo | Capítulo |
|---|---|---|
| RF-01 | `GET /api/pedidos-construcao/<DEC-id>/situacao`, só do `construir`: `vigente` ou `substituido`; o mesmo 404 sem pedido gerado; 403 aos outros (S-02) | [05](05-pedido-de-construcao.md#situação-do-pedido-041), [09](09-referencia-api.md#exemplo-o-construir-consulta-a-situação-do-pedido) e [02](02-acesso-e-seguranca.md#matriz-de-acesso) |
| RF-02 | D1 também com o nome em vigor na criação do DEC, para o DEC criado a partir da 0.4.1 (S-03) | [05](05-pedido-de-construcao.md#nome-da-criação-041) |
| RF-03 | Arquivar o DEC mais novo com aprovado vigente: `aprovada`, `em_analise` ou `encerrada` pela tabela; dica e chegada pelo destino (S-04) | [04](04-versoes-e-decisao.md#arquivar-o-dec-mais-novo-041), [03](03-demandas.md#rf-07-status-e-transições) e [08](08-painel.md#avisos-da-vigência-e-arquivar-041) |
| RF-04 | C-27 estável, com a causa registrada e sem asserção a menos | [CHANGELOG](../../CHANGELOG.md) |
| RF-05 | Textos da T11 revistos pela `ux-ui-design` | [08](08-painel.md#avisos-da-vigência-e-arquivar-041) |
| RF-06 | Três avisos da vigência na T11, só informativos | [08](08-painel.md#avisos-da-vigência-e-arquivar-041) |
| RF-07 | Fila lê uma linha de andamento por demanda, sem `Sort` sobre `andamento_construcao` (B-08-1) | [01](01-arquitetura.md#módulos) |
| RF-08 | `registrar-qa.test.ts` e os testes de segurança da 0.3.x e da 0.4.0 no piso de asserções (B-08-2) | [CHANGELOG](../../CHANGELOG.md) e [08](08-painel.md#acessibilidade-rnf-11) |
| RF-09 | Spec do sistema e das integrações atualizadas | fica com o maestro (ver acima); vale o código, nos caps. 03, 04 e 05 |
| RF-10 | Versão 0.4.1, CHANGELOG, manual e `docs/operacao` | [CHANGELOG](../../CHANGELOG.md), [tokens-de-integracao.md](../operacao/tokens-de-integracao.md) e [deploy.md](../operacao/deploy.md) |

## Glossário

Cada termo significa a mesma coisa em todos os capítulos.

| Termo | Significado |
|---|---|
| Demanda | Pedido técnico recebido, com id `DEM-AAAAMMDD-NNNN` |
| ESP | Especificação técnica de uma demanda, em versões (`ESP-<demanda>-vN`) |
| RSK | Parecer de risco de uma demanda, em versões (`RSK-<demanda>-vN`) |
| DEC | Pacote de decisão, em versões (`DEC-<demanda>-vN`); cita uma ESP e um RSK |
| Versão | Linha gravada de ESP, RSK ou DEC. Não muda depois de gravada; mudar é gravar a próxima |
| Desatualizado | DEC que cita ESP ou RSK de versão menor que a mais nova da demanda |
| Aprovado vigente | O DEC de maior versão da demanda com decisão `aprovada`; o único que gera o Pedido de Construção (desde a 0.1.13, [cap. 04](04-versoes-e-decisao.md#substituição-do-dec-aprovado)). Na tela, o termo é "em vigor" ("o pacote em vigor") |
| Em vigor | O termo de tela para o aprovado vigente, nos avisos, na dica e na chegada da T11 (desde a 0.4.1) |
| Situação do pedido | A resposta da rota `GET /api/pedidos-construcao/<DEC-id>/situacao`: `vigente` ou `substituido` (desde a 0.4.1, [cap. 05](05-pedido-de-construcao.md#situação-do-pedido-041)). Não é a situação da construção nem o status da demanda, e não aparece em texto de tela |
| Caminhos da criação | A coluna `caminhos_com_nome_na_criacao` do DEC: os caminhos dos textos que tinham o nome do solicitante em vigor na criação, sem o nome. Nula no DEC anterior à 0.4.1 (desde a 0.4.1, [cap. 05](05-pedido-de-construcao.md#nome-da-criação-041)) |
| Substituído | DEC com decisão `aprovada` que não é o aprovado vigente da demanda. Calculado na leitura (`substituido`, `substituidoPor`), sem status próprio; não gera Pedido de Construção (desde a 0.1.13) |
| Status final | `entregue` ou `encerrada`: status sem transição manual de saída (`STATUS_FINAIS`, `transicoes.ts`). Não aceita ESP, RSK nem DEC novos, decisão de DEC nem geração de Pedido |
| Decisão | `aprovada` (opção A ou B), `devolvida` ou `arquivada`, registrada uma vez por DEC; sem decisão, o DEC está `pendente` |
| Aprovação | Registro de uma pessoa (papel `cto` ou `administradora`) aprovando uma opção do DEC |
| Pedido de Construção | JSON gerado do DEC aprovado vigente (desde a 0.1.13; o substituído recebe 409), no formato que o `validarPedido` do `/construir` aceita. Desde a 0.1.12, sai só com a confirmação sem dado pessoal, sem o nome do solicitante no texto e com o papel, e não o nome, em `aprovadoPor` ([cap. 05](05-pedido-de-construcao.md#rf-22-gerar-o-pedido)) |
| Confirmação sem dado pessoal | O campo `confirmaSemDadoPessoal: true` do `POST .../pedido-construcao`, marcado na caixa da T11: quem gera declara que título, descrição, ESP e parecer de risco não têm dado pessoal de ninguém. Fica gravado no evento `pedido_gerado` (desde a 0.1.12) |
| Ator | Quem faz a ação: `pessoa` (sessão com 2FA), `agente` (token de serviço ou job do worker), `sistema` (mudança automática) ou, desde a 0.3.0, `integracao` (token de integração) |
| Integração | Sistema interno da empresa que chama a API com token próprio, fora dos agentes de IA: `awave` ou `construir`. Lista fechada no código; integração nova pede pedido e migration (desde a 0.3.0, [cap. 02](02-acesso-e-seguranca.md#atores-de-integração-030)) |
| Prefixo do token de serviço | Os 8 caracteres depois de `wsod_` num token de agente ou de integração (não confundir com o token de CSS, abaixo). Identificam o token no histórico e na revogação sem revelá-lo |
| Origem da demanda | `pessoa`, `agente` ou `awave`, lida da autoria gravada e nunca do solicitante (desde a 0.3.0). Não é a `origem` da entrada colando o texto (canal e referência) |
| Confirmação da demanda do Awave | O evento `demanda_confirmada`, gravado quando uma pessoa com 2FA aperta "Confirmar demanda" na T05. Até ele existir, nenhum agente de IA trabalha na demanda do Awave (desde a 0.3.0). Desde a 0.3.1, só conta o evento de ator `pessoa`, e até ele existir a demanda, com a ESP, o RSK e o DEC dela, responde 404 ao agente |
| Prazo total | Tempo máximo da transação inteira de uma integração, contando a espera por conexão: 8 s, e 12 s na entrega do pedido (`PRAZO_TOTAL_MS`). Passou: `ROLLBACK` e 503 `indisponivel`. Pessoa e agente não têm (desde a 0.3.1, [cap. 02](02-acesso-e-seguranca.md#atores-de-integração-030)) |
| Pedido pendente | DEC com Pedido de Construção gerado por pessoa, ainda aprovado vigente, não desatualizado, com a demanda fora de status final e sem recebimento pelo `/construir` (desde a 0.3.0) |
| Entrega e recebimento | A entrega é o `/construir` buscar o pedido (evento `pedido_entregue`, com o SHA-256 dos bytes); o recebimento é ele confirmar que gravou os mesmos bytes (evento `pedido_recebido`). Nenhum dos dois muda status (desde a 0.3.0). Desde a 0.3.1, o recebimento só aceita o hash da última entrega |
| Andamento da construção | O que o `/construir` informa de um Pedido de Construção gerado no painel: a fase, as tarefas prontas e o total de tarefas do plano e a situação da construção. Fica uma linha por gravação em `andamento_construcao`, e vale o último da demanda (desde a 0.4.0, [cap. 05](05-pedido-de-construcao.md#andamento-da-construção-040)) |
| Fase | Etapa da construção no `/construir`: Entendendo o pedido, Planejando, Construindo, Testando, Revisando e entregando ou Documentando (`FASES_ANDAMENTO`, desde a 0.4.0) |
| Situação da construção | O campo `status` do corpo do andamento (`statusConstrucao` no código): `em_construcao` ("Em andamento"), `construido` ("Concluída") ou `cancelado` ("Cancelada"). Não é o status da demanda (desde a 0.4.0) nem a situação do pedido (desde a 0.4.1) |
| Mesmo estado | Andamento com DEC, fase, tarefas prontas, total e situação iguais aos do último gravado na demanda. Responde 204 sem gravar nada (desde a 0.4.0) |
| Mudança de marco | O primeiro andamento da demanda, ou fase, situação ou DEC diferente do último. Só ela grava o evento `andamento_registrado` (A2, desde a 0.4.0) |
| Selo de fase | Texto abaixo do status da demanda em Em construção, na fila, com a fase e as tarefas ("Construindo · 9/17"), "Construção concluída" ou "Construção cancelada" (desde a 0.4.0, [cap. 08](08-painel.md#fila-t03-rf-05-a-rf-07)) |
| Vista mínima | O que a leitura de demanda pela API devolve a agente e a `sistema`, sem o andamento da construção (a integração `awave` recebe outra, menor, de seis chaves, desde a 0.3.0, e de sete, com o andamento em quatro campos, desde a 0.4.0; desde a 0.3.1, na demanda do Awave só depois da confirmação por pessoa, e antes dela o 404): sem `solicitanteNome`, `anexos` e nome de conta e, desde a 0.1.7, com o texto livre minimizado (`vistaDaDemandaPara`, [cap. 03](03-demandas.md#rf-06-consultar-e-alterar)); nas leituras de ESP, RSK e DEC, sem nome de pessoa nem `referenciaDocumento` (`vistaDaEspecificacaoPara`, `vistaDoParecerPara`, `vistaDoPacotePara`) e, desde a 0.1.8, com o texto livre minimizado também nelas e no 201 da criação ([cap. 09](09-referencia-api.md#exemplo-ler-demanda-com-token-de-agente)) |
| Rascunho de agente | ESP, RSK ou DEC gravado por um agente; a decisão exige confirmar que foi revisado |
| Parte do nome | Pedaço do nome do solicitante, cortado em espaço, hífen e apóstrofo, com 3 letras ou mais e fora de `PARTICULAS_DO_NOME` (`partesDoNome`, `minimizar.ts`). Desde a 0.1.10, vira `[nome removido]` na entrada do agente e na API de quem não é pessoa quando, no texto, começa por maiúscula. Desde a 0.1.11, também grudada em número, `_` ou CamelCase, pela fronteira de `haFronteira` ([cap. 06](06-agentes-de-ia.md#rf-20-minimização)) |
| Texto bruto | O texto colado na entrada (e-mail, mensagem). Dado pessoal de terceiro; guardado à parte e expurgado no prazo |
| Entrada pendente | Texto enviado ao agente orquestrador antes de a demanda existir |
| Teto | Limite mensal de gasto com IA, em US$; nasce 0 |
| Migrator | Papel do banco dono do DDL, usado só para migration (`DATABASE_URL_MIGRATOR`) |
| Papel da aplicação | `orquestrador_app`: o papel do app e do worker, sem DDL (`DATABASE_URL`) |
| Worker | Segundo processo da mesma imagem (`pnpm worker`), que roda os jobs do pg-boss |
| Casca | A moldura das telas do painel depois do login: menu lateral a partir de 768 px, barra com "Menu" e gaveta abaixo disso (desde a 0.2.0, [cap. 08](08-painel.md#casca-e-gaveta-rf-03-rf-04)) |
| Gaveta | O menu do painel no celular: um `<dialog>` modal aberto pelo botão "Menu", abaixo de 768 px (desde a 0.2.0) |
| Moldura pública | A moldura das telas sem casca (Entrar, 2FA, Sem permissão, erro e 404 da raiz): só a marca acima de um cartão (desde a 0.2.0) |
| Token | Variável CSS do `@theme` de `src/app/globals.css` com uma cor, família, raio ou altura do painel. É o único lugar onde se escreve hexadecimal, salvo o QR da T02 (desde a 0.2.0) |
| Contador de status | Botão da fila com um status e o total de demandas nele, que filtra a fila por esse status (desde a 0.2.0) |
| Etapas da fila | As marcas ESP, RSK e DEC de cada linha da fila: feita quando a demanda tem ao menos uma versão daquele tipo (desde a 0.2.0). Não é o mesmo que a barra de etapas da T05 |
| Barra de etapas | As cinco etapas da T05 (Demanda, Especificação, Parecer de risco, Decisão, Pedido de Construção), com o estado de cada uma e a etapa atual (`etapasDaDemanda`, desde a 0.2.0) |
| Próxima ação | Cartão da T05 que diz o que falta, quem age e onde, pela primeira condição que casar (`proximaAcao`, desde a 0.2.0): 13 linhas na 0.2.0, desde a 0.3.0 a linha 14, da confirmação da demanda do Awave, e desde a 0.4.0 a linha 15, da construção concluída. Só informa; não libera nem esconde nada |
