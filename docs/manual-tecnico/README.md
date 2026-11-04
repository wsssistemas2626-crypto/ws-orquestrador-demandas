# Manual técnico do WS Orquestrador de Demandas

| Campo | Valor |
|---|---|
| Versão do sistema | 0.1.12 (o Pedido de Construção sai sem nome de pessoa: a geração é recusada com o nome do solicitante no texto, exige a confirmação de que o texto não tem dado pessoal, na API e na caixa da T11, registrada no histórico, e `aprovadoPor` leva o papel de quem aprovou; ver o [cap. 05](05-pedido-de-construcao.md) e o [CHANGELOG](../../CHANGELOG.md)) |
| Atualizado em | 04/11/2026 |
| Dono do sistema | Fabiano (CTO) |
| Dono deste manual | `documentacao-tecnica` |
| Fonte de verdade | o código do ramo (padrão técnico, seção 11). Onde a spec ou o plano dizem outra coisa, vale o código, e a diferença está apontada no capítulo |
| Situação | vigente |

O manual descreve o sistema como ele está construído. Cada capítulo cita os arquivos de onde a descrição saiu e os
requisitos (RF) que cobre. Variável de ambiente aparece só pelo nome; valor nenhum é escrito aqui.

A spec aprovada na Parada 1 (`docs/superpowers/specs/2026-10-25-ws-orquestrador-demandas-design.md`) ainda descreve o
C-28 só com e-mail, telefone e CPF e a T11 sem a caixa de confirmação. Vale o código, descrito no
[cap. 05](05-pedido-de-construcao.md).

## Capítulos

| Cap. | Assunto | Requisitos |
|---|---|---|
| [01](01-arquitetura.md) | Arquitetura, processos, módulos, banco e versões da stack | RNF-01, RNF-02, RNF-05, ADR-01 a ADR-12 |
| [02](02-acesso-e-seguranca.md) | Login com 2FA, tokens de agente, matriz de acesso, CSRF, log | RF-01, RF-02, RNF-10, RNF-12, RNF-13 |
| [03](03-demandas.md) | Demanda, entrada colando o texto, id, consulta, status, dúvida em aberto, histórico | RF-03 a RF-07, RF-15, RF-21 |
| [04](04-versoes-e-decisao.md) | ESP, RSK e DEC em versões, desatualizado, decisão e dupla aprovação | RF-08 a RF-14 |
| [05](05-pedido-de-construcao.md) | Pedido de Construção e filtro de pacotes por decisão | RF-22, RF-23 |
| [06](06-agentes-de-ia.md) | Os quatro agentes, uso, teto, interruptor, minimização e as pré-condições para ligar | RF-16 a RF-20 |
| [07](07-worker-avisos-retencao.md) | Worker, aviso por e-mail e expurgo do texto bruto | RF-24, RF-25 |
| [08](08-painel.md) | Telas do painel | RF-26, RNF-11, RNF-16 |
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
| RF-13 | Decisão só por pessoa com 2FA | [04](04-versoes-e-decisao.md#rf-13-decisão) |
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
| Status final | `entregue` ou `encerrada`: status sem transição manual de saída (`STATUS_FINAIS`, `transicoes.ts`). Não aceita ESP, RSK nem DEC novos, decisão de DEC nem geração de Pedido |
| Decisão | `aprovada` (opção A ou B), `devolvida` ou `arquivada`, registrada uma vez por DEC; sem decisão, o DEC está `pendente` |
| Aprovação | Registro de uma pessoa (papel `cto` ou `administradora`) aprovando uma opção do DEC |
| Pedido de Construção | JSON gerado de um DEC aprovado, no formato que o `validarPedido` do `/construir` aceita. Desde a 0.1.12, sai só com a confirmação sem dado pessoal, sem o nome do solicitante no texto e com o papel, e não o nome, em `aprovadoPor` ([cap. 05](05-pedido-de-construcao.md#rf-22-gerar-o-pedido)) |
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
