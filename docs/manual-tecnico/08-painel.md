# 08. Painel

| Campo | Valor |
|---|---|
| Atualizado em | 31/10/2026 |
| Dono | `documentacao-tecnica` (sistema: Fabiano) |
| Cobre | RF-26; RNF-11, RNF-16 |
| Fontes no código | `src/app/entrar/`, `src/app/configurar-2fa/`, `src/app/(painel)/`, `src/components/`, `src/proxy.ts`, `e2e/` |

Todas as telas são em pt-BR, com os textos de `03-ux-ui-design.md`. Rótulos de enumeração e de selo vêm só de
`src/components/rotulos.ts`. Cada página do painel começa por `exigirPessoaNaPagina` ([cap. 02](02-acesso-e-seguranca.md#rf-01-login-com-2fa)),
e cada Server Action passa pelo mesmo módulo e pela mesma `autorizar` da API. Texto de cliente e de agente é mostrado só
como texto (`react/no-danger`). As páginas saem com `no-store` e CSP com nonce.

## Telas

| Tela | Rota | O que faz | RF |
|---|---|---|---|
| T01 Entrar | `/entrar` | senha e depois o código do aplicativo ou um código de recuperação | RF-01 |
| T02 Configurar 2FA | `/configurar-2fa` | QR, chave para digitar, confirmação do código e códigos de recuperação; única tela aberta à sessão sem 2FA, por até 15 min | RF-01 |
| T03 Fila de demandas | `/demandas` | filtros por status, tipo e linha de serviço na URL, aplicados por botão; total encontrado; entradas que aguardam o agente | RF-06 |
| T04 Nova demanda | `/demandas/nova` | colar o texto e preencher os campos, ou mandar ao agente orquestrador quando ligado | RF-03, RF-05, RF-20 |
| T05 Detalhe | `/demandas/[id]` | dados, dúvidas, versões de ESP, RSK e DEC, mudança manual de status, texto recebido (com a data do expurgo), histórico, agente trabalhando | RF-06, RF-07, RF-12, RF-15, RF-21, RF-24 |
| T06 Editar demanda | `/demandas/[id]/editar` | editar os campos | RF-06 |
| T07 Nova ESP | `/demandas/[id]/especificacoes/nova` | começa com a mais nova; destino por conta e sistema | RF-08 |
| T08 Novo RSK | `/demandas/[id]/pareceres-risco/novo` | três níveis, comentários, listas | RF-09 |
| T09 Novo DEC | `/demandas/[id]/pacotes-decisao/novo` | resumo, opções A e B, recomendação, nível de aprovação | RF-10 |
| T10 Ver ESP ou RSK | `/especificacoes/[espId]`, `/pareceres-risco/[rskId]` | somente leitura | RF-11 |
| T11 Decisão | `/pacotes-decisao/[decId]` | revisão do destino, dos níveis e do nível de aprovação; decisão com confirmação em diálogo; aprovar indisponível e explicado quando desatualizado; gerar, baixar e copiar o pedido; aviso sobre dado pessoal no pedido | RF-12, RF-13, RF-14, RF-22 |
| T12 Agentes e teto | `/configuracao/agentes` | interruptor e modelo de cada agente, teto, gasto do mês, batimento do worker, último expurgo; as duas contas leem, só a `cto` altera | RF-17, RF-18, RF-19 |
| Sem permissão | `/sem-permissao` | conta sem papel válido | RF-01 |
| E01 E-mail | Resend | aviso de pacote pronto ([cap. 07](07-worker-avisos-retencao.md#rf-25-aviso-por-e-mail)) | RF-25 |

## Acessibilidade (RNF-11)

Cada tela tem verificação do axe sem violação no Playwright (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`),
em mais de um estado. Foco, teclado e anúncios que o axe não pega foram conferidos pelo `qa-funcional` na etapa 07.

## Pendências de interface conhecidas

- Textos para a `ux-ui-design`: QF-01 a QF-04 e D-01 a D-06 do `07-qa-funcional.md` (por exemplo, o bloqueio de
  15 minutos anunciado como "Aguarde um minuto"), e as mensagens de 409 da decisão e do pedido desatualizado.
- Leitura do QR da T02 com o Google Authenticator e o Microsoft Authenticator (cenário U-01 do UAT) ainda não foi feita
  com aparelho real. O QR é gerado por `src/lib/qr.ts`.
