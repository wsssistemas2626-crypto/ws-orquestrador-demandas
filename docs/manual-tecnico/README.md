# Manual técnico do WS Orquestrador de Demandas

| Campo | Valor |
|---|---|
| Versão do sistema | 0.2.0 (novo visual do painel: casca com menu lateral e gaveta, fila com contadores, demanda com barra de etapas e "Próxima ação", decisão por três botões e no celular; só a camada visual mudou; ver o [cap. 08](08-painel.md) e o [CHANGELOG](../../CHANGELOG.md)). Na 0.1.13, o DEC aprovado mais novo da demanda passou a substituir o aprovado anterior ([cap. 04](04-versoes-e-decisao.md#substituição-do-dec-aprovado)) |
| Atualizado em | 11/11/2026 |
| Dono do sistema | Fabiano (CTO) |
| Dono deste manual | `documentacao-tecnica` |
| Fonte de verdade | o código do ramo (padrão técnico, seção 11). Onde a spec ou o plano dizem outra coisa, vale o código, e a diferença está apontada no capítulo |
| Situação | vigente |

O manual descreve o sistema como ele está construído. Cada capítulo cita os arquivos de onde a descrição saiu e os
requisitos (RF) que cobre. Variável de ambiente aparece só pelo nome; valor nenhum é escrito aqui.

A spec aprovada na Parada 1 (`docs/superpowers/specs/2026-10-25-ws-orquestrador-demandas-design.md`) ainda descreve o
C-28 só com e-mail, telefone e CPF e a T11 sem a caixa de confirmação. Vale o código, descrito no
[cap. 05](05-pedido-de-construcao.md). A substituição do DEC aprovado (0.1.13), que revê a A-02, está descrita no
[cap. 04](04-versoes-e-decisao.md#substituição-do-dec-aprovado); a atualização da spec (RF-13 e RF-22) fica com o
maestro do `/construir`.

O novo visual (0.2.0) tem spec própria, `docs/superpowers/specs/2026-11-10-ws-orquestrador-demandas-novo-visual-design.md`,
com requisitos numerados de RF-01 a RF-17 **do pedido 0015**. Esses números não são os do sistema: o mapa deles está
na seção [Requisitos do novo visual](#requisitos-do-novo-visual-020) abaixo.

## Capítulos

| Cap. | Assunto | Requisitos |
|---|---|---|
| [01](01-arquitetura.md) | Arquitetura, processos, módulos, banco, versões da stack e fontes | RNF-01, RNF-02, RNF-05, ADR-01 a ADR-19 |
| [02](02-acesso-e-seguranca.md) | Login com 2FA, tokens de agente, matriz de acesso, CSRF, log | RF-01, RF-02, RNF-10, RNF-12, RNF-13 |
| [03](03-demandas.md) | Demanda, entrada colando o texto, id, consulta, status, dúvida em aberto, histórico | RF-03 a RF-07, RF-15, RF-21 |
| [04](04-versoes-e-decisao.md) | ESP, RSK e DEC em versões, desatualizado, decisão, substituição do DEC aprovado e dupla aprovação | RF-08 a RF-14 |
| [05](05-pedido-de-construcao.md) | Pedido de Construção e filtro de pacotes por decisão | RF-22, RF-23 |
| [06](06-agentes-de-ia.md) | Os quatro agentes, uso, teto, interruptor, minimização e as pré-condições para ligar | RF-16 a RF-20 |
| [07](07-worker-avisos-retencao.md) | Worker, aviso por e-mail e expurgo do texto bruto | RF-24, RF-25 |
| [08](08-painel.md) | Telas do painel, identidade visual, casca, fila, demanda, decisão, acessibilidade e capturas | RF-26, RNF-11, RNF-16; RF-01 a RF-17 do pedido 0015 |
| [09](09-referencia-api.md) | Referência da API: rotas, quem pode, corpo e erros | RF-03, RF-06, RF-13, RF-22, RF-23 |
| [10](10-configuracao-e-scripts.md) | Variáveis de ambiente e scripts de operação | RNF-13, RNF-14 |

Operação em produção (serviços do Easypanel, deploy, rollback, alertas) fica em
[docs/operacao/deploy.md](../operacao/deploy.md).

## Mapa de cada RF

| RF | Resumo | Capítulo |
|---|---|---|
| RF-01 | Login com senha e TOTP obrigatório; sem cadastro público | [02](02-acesso-e-seguranca.md#rf-01-login-com-2fa) |
| RF-02 | Token de serviço por agente, só em rota de agente | [02](02-acesso-e-seguranca.md#rf-02-token-de-serviço-dos-agentes) |
| RF-03 | Criar demanda pelo painel e pela API | [03](03-demandas.md#rf-03-criar-demanda) |
| RF-04 | Ids `DEM-AAAAMMDD-NNNN` e `<prefixo>-<demanda>-vN` | [03](03-demandas.md#rf-04-ids) |
| RF-05 | Entrada colando o texto bruto | [03](03-demandas.md#rf-05-entrada-colando-o-texto) |
| RF-06 | Consulta com filtros e paginação | [03](03-demandas.md#rf-06-consultar-e-alterar) |
| RF-07 | Nove status e tabela de transições | [03](03-demandas.md#rf-07-status-e-transições) |
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
| RF-22 | Pedido de Construção | [05](05-pedido-de-construcao.md#rf-22-gerar-o-pedido) |
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
| Aprovado vigente | O DEC de maior versão da demanda com decisão `aprovada`; o único que gera o Pedido de Construção (desde a 0.1.13, [cap. 04](04-versoes-e-decisao.md#substituição-do-dec-aprovado)) |
| Substituído | DEC com decisão `aprovada` que não é o aprovado vigente da demanda. Calculado na leitura (`substituido`, `substituidoPor`), sem status próprio; não gera Pedido de Construção (desde a 0.1.13) |
| Status final | `entregue` ou `encerrada`: status sem transição manual de saída (`STATUS_FINAIS`, `transicoes.ts`). Não aceita ESP, RSK nem DEC novos, decisão de DEC nem geração de Pedido |
| Decisão | `aprovada` (opção A ou B), `devolvida` ou `arquivada`, registrada uma vez por DEC; sem decisão, o DEC está `pendente` |
| Aprovação | Registro de uma pessoa (papel `cto` ou `administradora`) aprovando uma opção do DEC |
| Pedido de Construção | JSON gerado do DEC aprovado vigente (desde a 0.1.13; o substituído recebe 409), no formato que o `validarPedido` do `/construir` aceita. Desde a 0.1.12, sai só com a confirmação sem dado pessoal, sem o nome do solicitante no texto e com o papel, e não o nome, em `aprovadoPor` ([cap. 05](05-pedido-de-construcao.md#rf-22-gerar-o-pedido)) |
| Confirmação sem dado pessoal | O campo `confirmaSemDadoPessoal: true` do `POST .../pedido-construcao`, marcado na caixa da T11: quem gera declara que título, descrição, ESP e parecer de risco não têm dado pessoal de ninguém. Fica gravado no evento `pedido_gerado` (desde a 0.1.12) |
| Ator | Quem faz a ação: `pessoa` (sessão com 2FA), `agente` (token de serviço ou job do worker) ou `sistema` (mudança automática) |
| Vista mínima | O que a leitura de demanda pela API devolve a quem não é pessoa: sem `solicitanteNome`, `anexos` e nome de conta e, desde a 0.1.7, com o texto livre minimizado (`vistaDaDemandaPara`, [cap. 03](03-demandas.md#rf-06-consultar-e-alterar)); nas leituras de ESP, RSK e DEC, sem nome de pessoa nem `referenciaDocumento` (`vistaDaEspecificacaoPara`, `vistaDoParecerPara`, `vistaDoPacotePara`) e, desde a 0.1.8, com o texto livre minimizado também nelas e no 201 da criação ([cap. 09](09-referencia-api.md#exemplo-ler-demanda-com-token-de-agente)) |
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
| Próxima ação | Cartão da T05 que diz o que falta, quem age e onde, pela primeira de 13 condições que casar (`proximaAcao`, desde a 0.2.0). Só informa; não libera nem esconde nada |
