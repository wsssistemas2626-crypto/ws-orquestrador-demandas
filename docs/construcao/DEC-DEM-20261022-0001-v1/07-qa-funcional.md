---
pedido: DEC-DEM-20261022-0001-v1
etapa: 07-qa-funcional
agente: qa-funcional
leu: [contrato-passagem.md, pedido.json, 2026-10-25-ws-orquestrador-demandas-design.md, 01-analista-requisitos.md, 03-ux-ui-design.md, tarefas.json, 06-T01-qa-automacao.md a 06-T47-qa-automacao.md (as 47), 06-T37-engenheiro-frontend.md, 06-T37-tech-lead.md, 06-T15-tech-lead.md, 06-T20-tech-lead.md, 06-T28-tech-lead.md, 06-T44-tech-lead.md, 06-T38-engenheiro-frontend.md a 06-T45-engenheiro-frontend.md (só as Pendências), parada-P1.md, package.json, scripts/seed-ficticio.ts, scripts/start-hml.ts, scripts/criar-usuario.ts, scripts/criar-token-servico.ts, src/lib/auth-cliente.ts, src/modules/acesso/auth.ts (ganchos do bloqueio), src/modules/historico/registrar.ts, src/modules/dados-pessoais/detectores.ts, src/modules/pacotes-decisao/criar.test.ts, src/modules/pacotes-decisao/decidir.test.ts, test/transversal/sentinelas.test.ts, e2e/axe-todas.spec.ts (nomes dos testes), saídas das minhas buscas desta etapa gravadas pela ferramenta em ~/.claude/projects/.../tool-results/]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

### 0. O que esta etapa fez e o que não fez

- Fez: o mapa de cada critério de aceite da `01` para o teste automatizado que o cobre, conferido nas 47 entregas
  `06-*-qa-automacao.md` e, por amostra, no código de teste; o roteiro manual de cada critério; a conferência do
  construído contra a `03` pelo que as entregas e o código dizem; os casos exploratórios; e o roteiro de aceite para
  Fabiano.
- Não fez: nenhuma execução. Meu papel não tem Bash, navegador nem celular. As sessões exploratórias da seção 5 são
  plano de sessão, não relatório de sessão executada. A leitura do QR code por um aplicativo autenticador de verdade
  (condição da decisão do tech-lead na T37) não foi feita e vai a Fabiano como pendência, com o caminho de teste no
  cenário U-01 da seção 7.
- Base: commit `2e4e45b` (47 tarefas prontas), ramo `construcao/DEC-DEM-20261022-0001-v1`.

### 1. Pré-condições comuns do roteiro manual

Valem para as seções 2 e 7. Todo dado é fictício.

| Id | Pré-condição |
|---|---|
| P1 | Ambiente: a homologação que a etapa 09 sobe (`pnpm start:hml`, banco semeado com `SEED_FICTICIO=1`) e o `pnpm worker`; na falta dela, o ambiente de desenvolvimento (`pnpm dev`, porta 3101, com o Postgres do `docker-compose.dev.yml`). Nunca produção |
| P2 | Contas criadas por `scripts/criar-usuario.ts`: C1 `uat-cto@ficticio.test` (papel `cto`), C2 `uat-adm@ficticio.test` (papel `administradora`), C3 `uat-sem2fa@ficticio.test` (papel `cto`, nunca configura o 2FA). C1 e C2 configuram o 2FA na T02 no primeiro acesso. As contas do seed (`CONTAS_FICTICIAS`) servem como reserva |
| P3 | Tokens de serviço criados por `scripts/criar-token-servico.ts`: TK-orq (orquestrador), TK-insumo (insumo_tecnico), TK-risco (risco). TK-rev: um token de risco revogado por `scripts/revogar-token-servico.ts` |
| P4 | Chamada à API "com sessão": cookie da sessão do navegador, cabeçalho `Origin` igual ao endereço do painel e `Content-Type: application/json` (C-15). "Com token": `Authorization: Bearer <token>`, sem cookie |
| P5 | Dados-base. D-BUG: `{ titulo: "Pedidos duplicados no ERP (fictício)", tipo: "bug", solicitanteNome: "Pessoa Ficticia Solicitante" }`. E-OK (ESP): `escopoInclui: ["Deduplicar pedidos (fictício)"]`, `escopoExclui: []`, `duvidasEmAberto: []`, `sistemaAlvo: "sistema-ficticio"`, `repositorioDestino: "wsssistemas2626-crypto/sistema-ficticio"`, `criteriosAceitePreliminares: ["Pedido repetido não duplica (fictício)"]`, `definicaoDePronto: ["Testes verdes (fictício)"]`, demais campos com texto fictício curto. R-OK (RSK): níveis `baixo`, `medio`, `baixo`, listas com um item fictício. DC-OK (DEC): opções A "Corrigir na integração (fictício)" e B "Corrigir no ERP (fictício)", `nivelAprovacaoRequerido: "cto"` |
| P6 | Texto T-PII: "Bom dia, sou Pessoa Ficticia Solicitante. Contato: contato@exemplo.test, (11) 90000-0000, CPF 000.000.000-00. Os pedidos do marketplace duplicam no ERP." |

"Só automatizado" no roteiro marca o critério cuja condição não se monta à mão sem violar regra (relógio injetado,
provedor de IA falso, mexer no banco com o papel do migrator, concorrência exata). Nesses, vale o teste do mapa da
seção 3, e o roteiro traz só a parte observável à mão, quando existe.

### 2. Roteiro de teste por critério de aceite

#### RF-01 Autenticação com 2FA

| CA | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| CA-01.1 | Abrir `/entrar`; e-mail e senha; "Continuar"; código do aplicativo; "Entrar" | C1 | Abre a fila `/demandas`; o foco vai ao título do passo 2 ao avançar |
| CA-01.2 | Entrar com C3 (só senha); depois digitar `/demandas` na barra; chamar `GET /api/demandas` com o cookie de C3 | C3 | Tela vai a `/configurar-2fa` com "Para usar o painel, configure a verificação em duas etapas."; `/demandas` volta para lá; a API responde 403 `sem_2fa` |
| CA-01.3 | `GET /api/demandas` sem cookie e sem Bearer; `GET /api/saude` | nenhum | 401 com código e mensagem, sem detalhe; a saúde responde 200 |
| CA-01.4 | Abrir `/cadastro`; `POST /api/auth/sign-up/email` | `novo@ficticio.test` | Tela "Página não encontrada" (404); a API recusa e o login com esse e-mail falha |

#### RF-02 Token de serviço e separação de rotas

| CA | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| CA-02.1 | `PATCH /api/pacotes-decisao/<DEC pendente>/decisao` com TK-risco, corpo `{ statusDecisao: "aprovada", opcaoEscolhida: "A" }`; depois abrir o DEC e o histórico | DEC pendente do seed | 403; DEC continua pendente; nenhum evento novo |
| CA-02.2 | Com TK-risco: `PATCH /api/agentes/risco` `{ ligado: true }`; `PUT /api/configuracao/teto`; `PATCH /api/demandas/<id>` `{ status: "em_analise" }`; `POST /api/pacotes-decisao/<DEC aprovado>/pedido-construcao` | teto 10 | 403 nas quatro; nada muda |
| CA-02.3 | `GET /api/demandas` com TK-rev; repetir com `wsod_` seguido de texto inventado | TK-rev | 401 nas duas, com a mesma resposta, sem citar o token |
| CA-02.4 | `POST /api/demandas/<id>/especificacoes` com TK-insumo e E-OK; abrir o Histórico da T05 | D-BUG, E-OK | 201; o histórico mostra o agente `insumo_tecnico` como autor, não uma pessoa |
| CA-02.5 | Só automatizado. Conferência manual opcional, por quem opera o banco de homologação: a linha do token não guarda o valor exibido pelo script | TK-orq | Nenhuma coluna com o token em claro |

#### RF-03 Criar demanda

| CA | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| CA-03.1 | `POST /api/demandas` com sessão de C1 | D-BUG | 201; `id` `DEM-AAAAMMDD-NNNN` com a data de hoje em São Paulo; `status: "nova"` |
| CA-03.2 | T04 com o orquestrador desligado: colar texto, preencher título, solicitante e tipo; "Salvar" | D-BUG, texto "Pedidos duplicam (fictício)" | T05 com "Demanda DEM-… criada com status Nova."; a fila mostra o id |
| CA-03.3 | `POST /api/demandas` com `tipo: "outro"` e sem `titulo` | `{ tipo: "outro", solicitanteNome: "Pessoa Ficticia" }` | 400 com `titulo` e `tipo` na lista, em pt-BR, sem pilha, SQL nem nome de tabela |

#### RF-04 Identificador

| CA | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| CA-04.1 | Só automatizado. À mão: criar uma demanda entre 21h e 23h59 de São Paulo (já é o dia seguinte em UTC) | D-BUG | Id com a data de São Paulo |
| CA-04.2 | Só automatizado. À mão: anotar o id de hoje e criar outra demanda no dia seguinte | D-BUG | O número segue (+1); não volta a `0001` |
| CA-04.3 | Só automatizado. À mão, aproximado: duas abas na T07 da mesma demanda, "Gravar" quase ao mesmo tempo | E-OK | Uma v1 e uma v2; nenhuma tela de erro |
| CA-04.4 | Só automatizado (exige pôr a sequência em 9999 no banco) | — | — |

#### RF-05 Entrada colando o texto

| CA | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| CA-05.1 | T12: conferir orquestrador desligado; T04: colar T-PII, preencher, "Salvar"; na T05 abrir "Texto recebido" | T-PII, D-BUG | Demanda criada; o texto aparece igual na T05; nenhum aviso de agente trabalhando |
| CA-05.2 | Só automatizado (provedor falso; na homologação o agente não roda sem a chave) | — | — |
| CA-05.3 | T04 e `POST /api/demandas/entrada` com 100.001 caracteres; repetir com 100.000 | a letra "a" repetida | 100.001: 400 no campo texto e nenhuma demanda nova na fila; 100.000: aceita |

#### RF-06 Consultar e alterar

| CA | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| CA-06.1 | Criar 3 demandas `bug` e 2 `melhoria`; `GET /api/demandas?tipo=bug` | títulos "Fila bug 1..3 (fictício)", "Fila melhoria 1..2 (fictício)" | Só itens `bug` (as 3 novas e as do seed), da mais nova para a mais antiga, com o `total` de bugs |
| CA-06.2 | `GET /api/demandas?limit=500` | — | 400 no campo `limit` |
| CA-06.3 | `GET /api/demandas/DEM-20261022-9999` | — | 404 |
| CA-06.4 | T06: Linha de serviço de "Sob medida" para "Automação e integração"; salvar; abrir o Histórico | D-BUG | Evento com antes, depois, a pessoa e a data e hora |

#### RF-07 Status e transições

| CA | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| CA-07.1 | Demanda em "Pronta para decisão" com DEC pendente; T05 "Mudar status"; depois `PATCH` `{ status: "aprovada" }` | D-BUG com ESP, RSK e DEC | "Aprovada" indisponível na tela, com o motivo; a API responde 409 com o motivo; o status não muda |
| CA-07.2 | Demanda `estudo` levada a "Aprovada" (ESP sem os quatro campos, RSK, DEC aprovado, status manual); tentar "Em construção" | "Estudo de IA (fictício)", tipo `estudo` | 409; a tela já marca a opção indisponível |
| CA-07.3 | Demanda em "Em construção"; T05 "Entregue" | demanda do CA-07.2 trocada por uma `bug` | Status "Entregue"; histórico com a pessoa, antes e depois |
| CA-07.4 | `PATCH /api/demandas/<id>` `{ status: "em_analise" }` com TK-orq | D-BUG | 403; nada muda |
| CA-07.5 | Demanda "Entregue"; `PATCH` para cada um dos outros status | a do CA-07.3 | 409 em todos; a T05 não oferece mudança |

#### RF-08 ESP versionada

| CA | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| CA-08.1 | T07 "Gravar" duas vezes na mesma demanda | E-OK | `ESP-<dem>-v1`, depois `-v2`; "A v1 continua guardada e não muda." |
| CA-08.2 | Demanda `novo_projeto`; `POST .../especificacoes` sem `repositorioDestino` | E-OK sem o campo | 400 com `repositorioDestino` |
| CA-08.3 | `POST` com `sistemaAlvo: "meu-sistema"` e `repositorioDestino: "outra-conta/meu-sistema"` | E-OK alterado | 400 no `repositorioDestino` |
| CA-08.4 | Demanda `estudo`; ESP sem os quatro campos de construção | E-OK sem os quatro | 201 |
| CA-08.5 | `POST` com `escopoInclui: "texto corrido fictício"` | E-OK alterado | 400 no `escopoInclui` |

#### RF-09 RSK versionado

| CA | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| CA-09.1 | T08 "Gravar" | R-OK | `RSK-<dem>-v1` |
| CA-09.2 | `POST .../pareceres-risco` com `riscoTecnicoNivel: "critico"` | R-OK alterado | 400 no campo |
| CA-09.3 | `POST` com `preCondicoes: "texto corrido fictício"` | R-OK alterado | 400 no campo |

#### RF-10 DEC versionado

| CA | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| CA-10.1 | Demanda nova sem ESP e RSK; `POST .../pacotes-decisao`; abrir a T09 | DC-OK | 400 com `faltando: ["especificacao", "parecer_risco"]`; a T09 diz o que falta |
| CA-10.2 | Só com ESP v1 | DC-OK | 400 com `faltando: ["parecer_risco"]` |
| CA-10.3 | ESP v1, ESP v2, RSK v1; criar o DEC | DC-OK | O DEC cita `ESP-…-v2` e `RSK-…-v1` e nasce pendente |
| CA-10.4 | Abrir a demanda depois do CA-10.3 | — | "Pronta para decisão"; histórico com ator sistema |

#### RF-11 Imutabilidade

| CA | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| CA-11.1 | `PATCH`, `PUT` e `DELETE` em `/api/especificacoes/<espId>`; `GET` antes e depois | ESP v1 | 405 nos três; conteúdo igual |
| CA-11.2 | Só automatizado (papel do banco) | — | — |
| CA-11.3 | DEC aprovado; nova decisão no mesmo DEC pela API | DC-OK | 409 |

#### RF-12 DEC desatualizado

| CA | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| CA-12.1 | DEC v1 que cita ESP v1; gravar ESP v2; `GET /api/pacotes-decisao/<id>` | E-OK | `desatualizado: true` |
| CA-12.2 | Aprovar esse DEC pela API | opção A | 409; continua pendente |
| CA-12.3 | Devolver esse DEC | — | Aceito; a demanda volta a "Em análise" |
| CA-12.4 | Abrir a T11 de um DEC desatualizado | — | Aviso de desatualizado; "Aprovar" visível, indisponível, alcançável pelas setas e com o motivo |

#### RF-13 Decisão

| CA | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| CA-13.1 | C1 aprova A num DEC pendente, em dia, nível `cto` | DC-OK | "Aprovada", com data e C1 em aprovadores |
| CA-13.2 | API com `opcaoEscolhida: "C"` | — | 400 |
| CA-13.3 | API com `statusDecisao: "aprovada"` sem opção | — | 400 |
| CA-13.4 | DEC do seed (rascunho de agente): aprovar sem marcar a revisão (tela) e sem `revisouRascunhosDeAgente` (API) | DEC do seed | A tela exige a caixa; a API responde 400; nada gravado |
| CA-13.5 | API com `aprovadorNome: "Nome Forjado Ficticio"` | — | Gravado o nome da sessão de C1 |

#### RF-14 Dupla aprovação

| CA | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| CA-14.1 | DEC `cto_e_administradora`; só C1 aprova A; tentar gerar o pedido | DC-OK com o nível trocado | Pendente, sem data, com a aprovação parcial visível; pedido 409 |
| CA-14.2 | C2 entra e aprova com a referência e a data do documento | `DOC-FICTICIO-001`, data de hoje | "Aprovada", com as duas aprovações |
| CA-14.3 | C2 aprova sem a referência | — | 400 (tela: erro no campo) |
| CA-14.4 | Em outro DEC: C1 aprova A; C2 manda B pela API (a tela fixa a opção do CTO) | — | 409 |

#### RF-15 Dúvidas em aberto

| CA | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| CA-15.1 | Demanda "Em análise"; gravar ESP com uma dúvida; "Gravar mesmo assim" | `duvidasEmAberto: ["Qual o volume diário? (fictício)"]` | "Aguardando informação"; histórico com ator sistema |
| CA-15.2 | Só automatizado nas filas e no e-mail falso. À mão: conferir a caixa de e-mail configurada e a T05 | — | Nenhuma mensagem ao solicitante; a T05 diz que nada é enviado |
| CA-15.3 | Abrir a T05 dessa demanda | — | Lista das dúvidas da ESP mais nova |

#### RF-16, RF-17 e RF-20 Agentes, uso e minimização

Os CA-16.1 a CA-16.5, CA-17.1 a CA-17.3 e CA-20.1 e CA-20.2 são **só automatizados**: dependem do provedor falso, e na
0.1.0 nenhum agente chama provedor real (sem a chave do CA-E-03). Parte observável à mão: com o `worker` no ar e sem a
chave, T12 mostra os quatro desligados; ligar um não gera linha de uso (ver CA-18.3); a T04 mostra o aviso de
minimização (texto da 03, T04).

#### RF-18 e RF-19 Teto e interruptores

| CA | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| CA-18.1 | Só automatizado (gasto igual ao teto exige linhas de uso) | — | — |
| CA-18.2 | Só automatizado (virada do mês por relógio injetado) | — | — |
| CA-18.3 | Sistema recém-instalado: T12 mostra teto não definido; gravar o modelo do risco por `PATCH /api/agentes/risco` `{ modelo: "modelo-ficticio" }` (a T12 não tem campo de modelo, ver D-06); ligar o risco; gravar ESP sem dúvida | E-OK | Nenhuma linha de uso; gasto do mês 0; histórico com a suspensão ou a execução sem chamada |
| CA-18.4 | `PUT /api/configuracao/teto` com TK-risco | teto 10 | 403 |
| CA-19.1 | T12 numa homologação recém-semeada | — | Os quatro desligados, "Nunca alterado" |
| CA-19.2 | Com insumo_tecnico desligado, criar demanda; gravar ESP na T07 | D-BUG, E-OK | Nenhum aviso de agente trabalhando; a ESP grava pela T07 |
| CA-19.3 | C1 liga e desliga o risco na T12 | — | Diálogo ao ligar; desligar sem confirmação; T12 e histórico com quem e quando |
| CA-19.4 | Só automatizado (job na fila e desligamento entre tentativas) | — | — |

#### RF-21 Histórico

| CA | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| CA-21.1 | Fluxo completo do cenário U-05 da seção 7; abrir o Histórico da T05 | D-BUG, E-OK, R-OK, DC-OK | Um evento por passo: demanda criada (C1), ESP criada (C1), RSK criado (C1), DEC criado (C1), status para "Pronta para decisão" (sistema), aprovação e decisão (C1) |
| CA-21.2 | Só automatizado (papel do banco) | — | — |
| CA-21.3 | Demanda criada com T-PII; ler o Histórico da T05 e `GET /api/demandas/<id>/historico` | T-PII | Nenhum trecho do texto bruto, e-mail, telefone ou CPF |

#### RF-22 Pedido de Construção

| CA | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| CA-22.1 | DEC aprovado; T11 "Gerar"; baixar; rodar `node /home/deploy/servidor/projetos/estruturaAutonoma/ferramentas/construir/construir.mjs validar <arquivo baixado>` (fora da pasta `pedidos/`) | fluxo do U-05 | `ok: true`; `pedido` igual a `decisao.id` |
| CA-22.2 | Gerar de novo depois de editar o título da demanda na T06; comparar os dois arquivos | título "Título editado (fictício)" | Arquivos idênticos byte a byte |
| CA-22.3 | DEC aprovado de demanda `estudo`; pedir o pedido | a do CA-07.2 | A T11 mostra só a frase; a API responde 422 "demanda do tipo estudo não gera Pedido de Construção" |
| CA-22.4 | Pedir o pedido de DEC pendente, devolvido e com só a aprovação do CTO | — | 409 nos três; a T11 não mostra a seção |
| CA-22.5 | RSK com níveis baixo, alto e medio; DEC; aprovar; gerar | R-OK com os níveis trocados | `risco.nivel: "alto"` |
| CA-22.6 | Demanda com T-PII e solicitante fictício; gerar o pedido; procurar no JSON | T-PII | Nenhum nome do solicitante nem trecho do texto bruto |

#### RF-23 Filtro por status de decisão

| CA | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| CA-23.1 | Com 2 DEC aprovados e 1 pendente: `GET /api/pacotes-decisao?statusDecisao=aprovada` | DECs dos cenários | Só os aprovados, cada um com `desatualizado` |
| CA-23.2 | `GET /api/pacotes-decisao?statusDecisao=talvez` | — | 400 |

#### RF-24 Expurgo

CA-24.1 a CA-24.4 são **só automatizados** (relógio injetado, 89, 90 e 91 dias). À mão, numa homologação que fique no
ar: com o prazo configurado em 1 dia, uma demanda com T-PII deve mostrar "expurgado em <data>" na T05 depois do job das
03:00 do segundo dia, com o evento do sistema no histórico. Custo alto de tempo; não entra no UAT.

#### RF-25 Aviso por e-mail

CA-25.1 a CA-25.3 são **só automatizados** (cliente de e-mail falso; nenhum envio real na construção, RNF-14). À mão,
só se a etapa 09 configurar o Resend na homologação, com destinatário interno: criar um DEC e conferir que chega um
e-mail só, com o id do DEC, o id da demanda e o link, sem título, texto bruto nem nome do solicitante.

#### RF-26 Painel

| CA | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| CA-26.1 | 5 demandas com status diferentes; filtrar a fila por "Aguardando informação" | demandas dos cenários | Só as desse status; "N demandas encontradas." |
| CA-26.2 | Demanda com ESP v1, v2, RSK v1 e DEC v1 desatualizado; abrir a T05 | E-OK, R-OK, DC-OK | As quatro versões, o selo de desatualizado no DEC e o histórico |
| CA-26.3 | DEC aprovado; "Baixar" na T11; comparar com a resposta do `POST .../pedido-construcao` | — | `<DEC-id>.json` igual à resposta da API |
| CA-26.4 | Só automatizado (axe). À mão: a coluna "Foco" e "Teclado" da 03, seção 5, na sessão S-01 | — | — |

### 3. Mapa critério → teste automatizado

Tarefa dona pelo `tarefas.json`. Todos os testes abaixo estão nomeados nas entregas `06-Tnn-qa-automacao.md` e
passaram nas suítes registradas nelas (última: `06-T46-testes`, `pnpm test` 3.674 de 3.674 e `pnpm test:e2e` com código
0). "E2E" é Playwright; "Int." é Vitest com Testcontainers; "Unit." é Vitest sem banco.

| CA | Teste que cobre (arquivo › teste) | Camada | Tarefa |
|---|---|---|---|
| CA-01.1 | `src/modules/acesso/verificacao.test.ts` › "CA-01.1: senha e código válidos dão sessão com 2FA"; `verificacao-qa.test.ts`; `e2e/entrar.spec.ts` › "CA-01.1: senha e código válidos entram na fila" | Int., E2E | T09, T37 |
| CA-01.2 | `exigir-pessoa-qa.test.ts` › "CA-01.2: senha certa e sem 2FA → 403 sem_2fa"; `src/app/api/demandas/demandas.bordas.test.ts` › "CA-01.2: sessão sem 2FA → 403…"; `e2e/configurar-2fa.spec.ts` › "C-04 c e CA-01.2…" | Int., E2E | T09, T16, T37 |
| CA-01.3 | `test/matriz-rotas-qa.test.ts` (401 nas 19 ações e 5 métodos); `demandas.test.ts` › "CA-01.3…" | Int. | T13, T16 |
| CA-01.4 | `e2e/entrar.spec.ts` › "CA-01.4: /cadastro e /api/auth/sign-up/email não criam conta…"; `src/app/entrar/entrar.test.ts` | E2E, Unit. | T37 |
| CA-02.1 | `test/matriz-rotas-qa.test.ts` › "CA-02.1: PATCH /api/pacotes-decisao/[decId]/decisao com o token de cada agente responde 403…"; `decisao.test.ts` › "CA-02.1: token de cada agente… nada muda" | Int. | T13, T21 |
| CA-02.2 | `test/matriz-rotas-qa.test.ts` › os quatro "CA-02.2: …"; `src/modules/acesso/matriz.test.ts` | Int., Unit. | T13, T10 |
| CA-02.3 | `resolver-ator-qa.test.ts` › "token revogado, inventado e de outro esquema: a mesma resposta…"; `demandas.bordas.test.ts` › "C-36: CA-02.3: token revogado → 401…" | Int. | T10, T16 |
| CA-02.4 | `src/modules/historico/consultas-qa.test.ts` › "CA-02.4: artefato criado pelo agente insumo_tecnico sai como agente…"; `demandas.test.ts` › "historico > CA-02.4…" | Int. | T12, T16 |
| CA-02.5 | `tokens-servico.test.ts` › "CA-02.5: em nenhuma coluna da tabela…"; `scripts/scripts.test.ts` › "CA-02.5: nenhuma coluna de token_servico guarda o token…" | Int. | T10, T33 |
| CA-03.1 | `demandas.test.ts` › "POST > CA-03.1: título, solicitante e tipo → 201…"; `src/modules/demandas/servico.test.ts` › "CA-03.1: …" | Int. | T15, T16 |
| CA-03.2 | `e2e/nova-demanda.spec.ts` › "CA-03.2: preencher e salvar cria a demanda…"; `acoes-qa` da T39 › "CA-03.2 e CA-05.1…" | E2E, Int. | T39 |
| CA-03.3 | `demandas.test.ts` › "POST > CA-03.3: tipo \"outro\" e sem título → 400…"; `demandas.bordas.test.ts` › "CA-03.3: só o tipo…"; `schemas.bordas.test.ts` | Int., Unit. | T15, T16 |
| CA-04.1 | `src/modules/demandas/gerar-id.test.ts` › "CA-04.1: data de São Paulo e sequência 41 → DEM-20261022-0042"; `demandas.bordas.test.ts` › "CA-04.1 pela rota…"; `src/lib/fuso.test.ts` | Int., Unit. | T14, T16, T01 |
| CA-04.2 | `gerar-id.test.ts` › "CA-04.2, como escrito: com a sequência em 7…" | Int. | T14 |
| CA-04.3 | `src/modules/versoes.test.ts` › "CA-04.3: versões simultâneas…"; `especificacoes.test.ts` e `pareceres.test.ts` › "CA-04.3: … pela rota"; `pacotes-decisao/criar.test.ts` › "CA-04.3: três criações simultâneas…" | Int. | T14, T18, T19, T20 |
| CA-04.4 | `gerar-id.test.ts` › "CA-04.4: com a sequência em 9999, erro claro e nada gravado"; "CA-04.4: o banco não aceita id fora do formato…" | Int. | T14 |
| CA-05.1 | `src/modules/demandas/entrada.test.ts` › "CA-05.1: orquestrador desligado…"; `acoes-qa` da T39 | Int. | T17, T39 |
| CA-05.2 | `src/modules/agentes/saida-orquestrador.test.ts` › "CA-05.2: orquestrador ligado e saída válida → demanda criada como rascunho de agente…" | Int. | T28 |
| CA-05.3 | `entrada.test.ts` › "CA-05.3: texto acima de 100.000 caracteres → 400…"; `entrada-qa.test.ts` › "100.000 caracteres ASCII → 201; 100.001 → 400…"; `e2e/nova-demanda.spec.ts` › "texto com 100.001 caracteres…" | Int., E2E | T17, T39 |
| CA-06.1 | `demandas.test.ts` › "GET /api/demandas > CA-06.1: filtro por tipo…"; `src/modules/demandas/consultas.test.ts` › "CA-06.1: 3 bug e 2 melhoria…" | Int. | T15, T16 |
| CA-06.2 | `demandas.test.ts` › "CA-06.2: limit=500 → 400…"; `demandas.bordas.test.ts` › "CA-06.2 na borda…" | Int. | T15, T16 |
| CA-06.3 | `demandas.test.ts` › "CA-06.3: GET /api/demandas/DEM-20261022-9999 → 404…"; `servico.bordas.test.ts` | Int. | T15, T16 |
| CA-06.4 | `demandas.test.ts` › "PATCH > CA-06.4…"; `demandas.bordas.test.ts` › "CA-06.4: o evento traz a data e a hora…"; `historico/consultas-qa.test.ts` › "CA-06.4…" | Int. | T12, T15, T16 |
| CA-07.1 | `transicoes.test.ts` e `servico.test.ts` › "CA-07.1…"; `servico.bordas.test.ts` › "CA-07.1: o DEC aprovado e atualizado é conferido por pacote…"; `detalhe-qa.test.ts` (T40) › "CA-07.1: …" | Unit., Int. | T15, T16, T40 |
| CA-07.2 | `demandas.bordas.test.ts` › "CA-07.2 pela API…"; `servico.test.ts`; `detalhe-qa.test.ts` › "CA-07.2…" | Int. | T15, T16, T40 |
| CA-07.3 | `demandas.bordas.test.ts` › "CA-07.3 pela API…"; `e2e/detalhe-demanda.spec.ts` › "CA-07.3: em_construcao → Entregue pelo painel…" | Int., E2E | T15, T16, T40 |
| CA-07.4 | `demandas.test.ts` › "PATCH > CA-07.4: token de agente em PATCH → 403…"; `test/matriz-rotas.test.ts` | Int. | T15, T16, T13 |
| CA-07.5 | `demandas.bordas.test.ts` › "CA-07.5 pela API…"; `detalhe-qa.test.ts` › "CA-07.5…" | Int. | T15, T16, T40 |
| CA-08.1 | `src/app/api/especificacoes/especificacoes.test.ts` › "CA-08.1: primeira ESP é ESP-<dem>-v1; a seguinte, -v2"; `e2e/especificacao.spec.ts` › "primeira ESP…" | Int., E2E | T18, T41 |
| CA-08.2 | `especificacoes.test.ts` › "CA-08.2: novo_projeto sem repositorioDestino → 400…"; `especificacao-qa.test.ts` (T41) | Int. | T18, T41 |
| CA-08.3 | `especificacoes.test.ts` › "CA-08.3: repositório em outra conta → 400…"; `especificacao-qa.test.ts` › "CA-08.3 pelo painel…" | Int. | T18, T41 |
| CA-08.4 | `especificacoes.test.ts` › "CA-08.4: estudo sem os quatro campos → 201" | Int. | T18 |
| CA-08.5 | `especificacoes.test.ts` › "CA-08.5: escopoInclui como texto corrido → 400…" | Int. | T18, T41 |
| CA-09.1 | `src/app/api/pareceres-risco/pareceres.test.ts` › "CA-09.1: primeiro RSK é RSK-<dem>-v1…"; `parecer-qa.test.ts` (T42) | Int. | T19, T42 |
| CA-09.2 | `pareceres.test.ts` › "CA-09.2: riscoTecnicoNivel \"critico\" → 400…"; `parecer-qa.test.ts` › "CA-09.2 pela tela…" | Int. | T19, T42 |
| CA-09.3 | `pareceres.test.ts` › "CA-09.3: preCondicoes como texto corrido → 400…" | Int. | T19, T42 |
| CA-10.1 | `src/modules/pacotes-decisao/criar.test.ts` › "CA-10.1…"; `pacotes.test.ts` › "CA-10.1 pela rota…" | Int. | T20, T43 |
| CA-10.2 | `criar.test.ts` › "CA-10.2…"; `pacotes.test.ts` › "CA-10.2 pela rota…" | Int. | T20, T43 |
| CA-10.3 | `criar.test.ts` › "CA-10.3: ESP v1, v2 e RSK v1 → cita ESP-…-v2…"; `pacotes.test.ts` › "CA-10.3 pela rota…" | Int. | T20, T43 |
| CA-10.4 | `criar.test.ts` › "CA-10.4: depois do DEC, a demanda está em pronta_para_decisao…" | Int. | T20, T43 |
| CA-11.1 | `especificacoes.test.ts` › "CA-11.1: PATCH, PUT e DELETE… → 405…"; `pareceres.test.ts` e `pacotes.test.ts` › "CA-11.1…" | Int. | T18, T19, T20 |
| CA-11.2 | `src/db/imutabilidade.test.ts` › "%s: \"%s\" é recusado (42501) e a linha fica igual" (16 casos) | Int. | T05 |
| CA-11.3 | `decidir.test.ts` › "CA-11.3: segunda decisão no mesmo DEC → 409"; `decisao.test.ts` › "CA-11.3 pela rota…"; `src/db/schema/dominio.test.ts` | Int. | T21, T05 |
| CA-12.1 | `src/modules/pacotes-decisao/consultas.test.ts` e `pacotes.test.ts` › "CA-12.1: DEC v1 que cita ESP v1; criada a ESP v2 → desatualizado: true" | Int. | T20 |
| CA-12.2 | `decidir.test.ts` › "CA-12.2 e CA-12.3…"; `decisao.test.ts` › "CA-12.2 pela rota…"; `concorrencia.test.ts` (C-13) | Int. | T21 |
| CA-12.3 | `decidir.test.ts` › "CA-12.2 e CA-12.3…", "CA-12.3: desatualizado por RSK novo também arquiva" | Int. | T21 |
| CA-12.4 | `e2e/decisao.spec.ts` › "CA-12.4: desatualizado: aviso, Aprovar indisponível e explicado…" | E2E | T43 |
| CA-13.1 | `decidir.test.ts` › "CA-13.1…"; `decisao.test.ts` › "CA-13.1 pela rota…" | Int. | T21, T43 |
| CA-13.2 | `decisao.test.ts` › "CA-13.2 e CA-13.3 pela rota…"; `decId/acoes` (T43) › "CA-13.2 e CA-13.3…" | Int. | T21, T43 |
| CA-13.3 | os mesmos de CA-13.2 | Int. | T21, T43 |
| CA-13.4 | `decidir.test.ts` › "CA-13.4: DEC do agente consolidacao sem revisouRascunhosDeAgente → 400…"; `decId/acoes` › "CA-13.4…" | Int. | T21, T43 |
| CA-13.5 | `decidir.test.ts` e `decisao.test.ts` › "CA-13.5 e C-11…"; `decId/acoes` › "CA-13.5 e C-11…" | Int. | T21, T43 |
| CA-14.1 | `decidir.test.ts` › "CA-14.1: só com a do CTO → pendente…"; `gerar.test.ts` › "CA-22.4: … só uma das duas aprovações → 409" (a parte do pedido) | Int. | T21, T22, T43 |
| CA-14.2 | `decidir.test.ts` › "CA-14.2…"; `concorrencia.test.ts` | Int. | T21, T43 |
| CA-14.3 | `decidir.test.ts` › "CA-14.3: administradora sem referência ao documento → 400…"; `src/db/schema/dominio.test.ts` | Int. | T21, T05, T43 |
| CA-14.4 | `decidir.test.ts` › "CA-14.4…"; `decidir-bordas.test.ts` (ao mesmo tempo); `decId/acoes` › "CA-14.1 e CA-14.4…" | Int. | T21, T43 |
| CA-15.1 | `especificacoes.test.ts` › "CA-15.1: ESP com dúvida leva a demanda em_analise a aguardando_informacao…"; `especificacao-qa.test.ts` › "CA-15.1 e CA-15.2 pelo painel…" | Int. | T18, T41 |
| CA-15.2 | `especificacoes.test.ts` › "CA-15.2: nenhuma mensagem ao solicitante: nenhum job de aviso e nenhum e-mail" | Int. | T18, T41 |
| CA-15.3 | `e2e/detalhe-demanda.spec.ts` › "CA-15.3: aguardando_informacao lista as dúvidas da ESP mais nova…"; `detalhe-qa.test.ts` | E2E, Int. | T40 |
| CA-16.1 | `src/modules/agentes/executar.test.ts` › "CA-16.1: provedor falso com JSON válido → RSK-…-v1…" | Int. | T27 |
| CA-16.2 | `executar.test.ts` › "CA-16.2 e CA-17.2: 1ª fora do schema…; 2ª válida grava exatamente um" | Int. | T27 |
| CA-16.3 | `executar.test.ts` › "CA-16.3: sempre fora do schema → 3 tentativas, nenhum artefato…" | Int. | T27 |
| CA-16.4 | `executar.test.ts` › "CA-16.4: o mesmo job duas vezes…"; `saida-orquestrador.test.ts` › "o mesmo job duas vezes → uma chamada e uma demanda (CA-16.4)"; `batimento.test.ts` (T29) | Int. | T27, T28, T29 |
| CA-16.5 | `src/modules/agentes/provedor.test.ts` › "CA-16.5: a suíte não tem a chave definida", "CA-16.5: criar o provedor… não faz chamada de rede"; `env-worker.test.ts` (T29) | Unit. | T25, T29 |
| CA-17.1 | `preco.test.ts` › "CA-17.1: 1.000 tokens de entrada a 3/M e 200 de saída a 15/M custam 0,006"; `executar.test.ts` › "CA-17.1…" | Unit., Int. | T23, T27 |
| CA-17.2 | `executar.test.ts` › "CA-16.2 e CA-17.2…"; `src/app/api/agentes/agentes.test.ts` › "CA-17.2…" | Int. | T23, T27 |
| CA-17.3 | `src/db/schema/agentes.test.ts` › "uso_ia tem exatamente as colunas e os tipos esperados"; `agentes.test.ts` › "CA-17.3…" | Int. | T06, T23 |
| CA-18.1 | `executar.test.ts` › "CA-18.1: teto 10 e gasto 10 → …" | Int. | T27 |
| CA-18.2 | `teto.test.ts` › "CA-18.2: no primeiro dia do mês seguinte, o gasto do mês é zero"; `teto-bordas.test.ts` | Int. | T23, T27 |
| CA-18.3 | `executar.test.ts` › "CA-18.3: agente ligado com teto 0 → nenhuma chamada"; `src/db/sementes.test.ts` (teto inicial) | Int. | T27, T06 |
| CA-18.4 | `agentes.test.ts` › "CA-18.4: token de agente em PUT /api/configuracao/teto → 403"; `test/matriz-rotas-qa.test.ts` | Int. | T23, T13 |
| CA-19.1 | `src/db/sementes.test.ts` › "os quatro agentes nascem desligados (CA-19.1)"; `agentes.test.ts` › "CA-19.1: GET /api/agentes no sistema novo…" | Int. | T06, T23, T45 |
| CA-19.2 | `gatilhos.test.ts` › "CA-19.2: insumo_tecnico desligado → criar demanda não enfileira nada, e a pessoa grava a ESP"; `especificacao-qa.test.ts` › "CA-19.2…" | Int. | T28, T41 |
| CA-19.3 | `configuracao.test.ts` e `agentes.test.ts` › "CA-19.3…"; `acoes` da T45 › "CA-19.3 por inteiro…" | Int. | T23, T45 |
| CA-19.4 | `executar.test.ts` › "CA-19.4: job na fila e agente desligado em seguida → provedor não é chamado" | Int. | T27 |
| CA-20.1 | `src/modules/dados-pessoais/minimizar.test.ts` › "CA-20.1: e-mail, telefone e CPF fictícios viram marcadores"; `entrada-agente.test.ts` › "CA-20.1…" | Unit. | T24 |
| CA-20.2 | `entrada-agente.test.ts` › "CA-20.2: insumo_tecnico não recebe nome do solicitante nem referência de anexo" | Unit. | T24 |
| CA-21.1 | Coberto por composição, sem um teste único do fluxo: `criar.test.ts` › "CA-10.4…" confere a sequência `demanda_criada`, `especificacao_criada`, `parecer_risco_criado`, `pacote_decisao_criado`, `status_alterado` (sistema); `decidir.test.ts` › "RF-21 e C-30: aprovacao_registrada e decisao_registrada com a pessoa…"; o ator de cada passo em `servico.test.ts` (demanda e ESP), `pareceres.test.ts` › "RF-21 e C-30: evento parecer_risco_criado com a pessoa…" e `criar.test.ts` (DEC de pessoa e de agente). Ver A-01 | Int. | T12, T15, T18, T19, T20, T21 |
| CA-21.2 | `src/db/privilegios.test.ts` › "evento: UPDATE, DELETE e TRUNCATE recusados com o papel do app (CA-21.2)"; `src/db/transacao.test.ts` | Int. | T04 |
| CA-21.3 | `historico/consultas-qa.test.ts` › "CA-21.3 e C-30: demanda com texto bruto…"; `entrada-qa.test.ts` › "RF-06 e CA-21.3…" | Int. | T12, T17 |
| CA-22.1 | `src/modules/pedido-construcao/gerar.test.ts` › "CA-22.1: DEC aprovado com ESP e RSK completos → passa no validarPedido…"; `pedido-bordas.test.ts` | Int. | T22 |
| CA-22.2 | `gerar.test.ts` › "CA-22.2: o mesmo DEC, duas vezes, inclusive depois de editar o título…"; `pedido-bordas.test.ts` › "CA-22.2 pela rota…" | Int. | T22, T44 |
| CA-22.3 | `gerar.test.ts` e `pedido.test.ts` › "CA-22.3: estudo… → 422 com a mensagem" | Int. | T22, T44 |
| CA-22.4 | `gerar.test.ts` › "CA-22.4: pendente, devolvida, arquivada e só uma das duas aprovações → 409…"; `acoes-ped` (T44) › "CA-22.4…" | Int. | T22, T44 |
| CA-22.5 | `gerar.test.ts` › "CA-22.5: RSK baixo, alto e medio → risco.nivel alto" e o `it.each` de 6 combinações | Int. | T22 |
| CA-22.6 | `gerar.test.ts` › "CA-22.6: solicitante, texto bruto, origem e anexo fictícios não aparecem no JSON" | Int. | T22 |
| CA-23.1 | `pacotes.test.ts` › "CA-23.1: 2 aprovados e 1 pendente…"; `consultas.test.ts` | Int. | T20 |
| CA-23.2 | `pacotes.test.ts` › "CA-23.2: statusDecisao=talvez → 400…" | Int. | T20 |
| CA-24.1 | `src/modules/retencao/expurgar.test.ts` › "CA-24.1: texto de 91 dias → …"; `src/jobs/expurgo-texto-bruto.test.ts` (pelo worker) | Int. | T31 |
| CA-24.2 | `expurgar.test.ts` › "CA-24.2: 89 dias → continua guardado…" e o limite estrito de 90 dias | Int. | T31 |
| CA-24.3 | `expurgar.test.ts` › "CA-24.3: prazo 30 e texto de 31 dias → expurgado…"; `expurgo-texto-bruto.test.ts` | Int. | T31 |
| CA-24.4 | `expurgar.test.ts` › "CA-24.4: já expurgado → rodar de novo não cria evento novo…"; `expurgo-texto-bruto.test.ts` › "CA-24.4 pelo job…" | Int. | T31 |
| CA-25.1 | `src/modules/avisos/aviso-dec.test.ts` › "CA-25.1…"; `src/jobs/aviso-dec-pronto.test.ts` (pelo worker) | Int. | T30 |
| CA-25.2 | `aviso-dec.test.ts` › "CA-25.2…" e "CA-25.2, ao mesmo tempo…"; `aviso-dec-pronto.test.ts` › "CA-25.2 no worker…" | Int. | T30 |
| CA-25.3 | `aviso-dec.test.ts` › "CA-25.3: o corpo não tem título, texto bruto nem nome do solicitante" | Int. | T30 |
| CA-26.1 | `e2e/fila.spec.ts` › "CA-26.1: 5 demandas com status diferentes…" | E2E | T38 |
| CA-26.2 | `e2e/detalhe-demanda.spec.ts` › "CA-26.2: ESP v1, v2, RSK v1 e DEC v1 desatualizado…" | E2E | T40 |
| CA-26.3 | `e2e/pedido-construcao.spec.ts` › "CA-26.3: só depois de aprovado; gerar por ação; baixar devolve <DEC-id>.json igual à resposta da API" | E2E | T44 |
| CA-26.4 | `e2e/axe-todas.spec.ts` (12 testes, de "T01 Entrar" a "T12 Agentes e teto", 40 verificações) e o axe de cada spec da T37 à T45 | E2E | T46 |
| RNF-10 (critério preliminar 13) | `test/transversal/sentinelas.test.ts` › "fluxo completo e caminhos de erro sem nenhum sentinela no pino, no Sentry falso, no pgboss nem em execucao_agente" | Int. | T34 |

Conferência: os 99 critérios de aceite do `01` (RF-01 a RF-26) estão no mapa; nenhum ficou "sem cobertura". O único
coberto só por composição é o CA-21.1 (A-01).

### 4. Aderência ao desenho da 03 e defeitos registrados

Os itens abaixo vêm da leitura das entregas e do código, não de sessão executada. Os passos estão escritos para quem
for reproduzir na homologação.

**QF-01. Bloqueio de 15 minutos anunciado como "Aguarde um minuto".** Criticidade **baixa**.
- Ambiente: homologação ou desenvolvimento, conta C1 com 2FA.
- Passos: (1) entrar com e-mail e senha de C1; (2) no passo 2, digitar `000000` cinco vezes; (3) na sexta tentativa,
  ler a mensagem; (4) esperar 1 minuto e digitar o código certo do aplicativo.
- Esperado pelo usuário: depois de esperar o que a tela pediu, o código certo entra.
- Obtido (pelo código): a tela mostra "Muitas tentativas. Aguarde um minuto e tente de novo." (`src/lib/auth-cliente.ts:29`
  e `:63`), mas o servidor bloqueia a verificação da conta por 15 minutos (`src/modules/acesso/bloqueio-verificacao.ts:14`) e
  responde 429 com `code: "VERIFICACAO_BLOQUEADA"` (`src/modules/acesso/auth.ts:142`). O código certo é recusado com a
  mesma frase até passar o bloqueio.
- Por que baixa: não perde dado nem abre acesso; as tentativas durante o bloqueio não o prolongam (`auth.ts:170`). O
  impacto é a pessoa achar que o sistema está quebrado e ficar até 15 min sem decidir.
- Causa: o texto da 03 (T01, estados) é um só para os dois 429. Dono: `ux-ui-design` (texto próprio para o bloqueio por
  conta, também na T02, que não tem 429), depois `engenheiro-frontend` (usar o `code` que o servidor já devolve).

**QF-02. "Voltar" do navegador descarta o formulário sem a confirmação da 03, 2.5.** Criticidade **baixa**.
- Passos: (1) T04, colar T-PII e preencher o título; (2) sem salvar, usar o "Voltar" do navegador.
- Esperado (03, 2.5): diálogo "Sair sem salvar? O que você digitou nesta tela será perdido."
- Obtido (registrado pelo engenheiro na `06-T39-engenheiro-frontend.md`, Pendências): a página sai sem perguntar; o
  ouvinte só pega clique em link e `beforeunload`. Vale também para a T06.
- Por que baixa: nada errado é gravado, e o texto colado ainda existe na origem; o custo é redigitar.
- Dono: `ux-ui-design` decide se o "Voltar" entra na regra; se entrar, volta à T39.

**QF-03. "Baixar" o Pedido de Construção pode falhar calado com pedido grande e acentuado.** Criticidade **baixa**, a
confirmar.
- Passos: (1) ESP com cada campo de texto perto de 10.000 caracteres acentuados (por exemplo "ação " repetido) e listas
  com 50 itens, até perto do limite de 512 KB do corpo; RSK do mesmo jeito; (2) DEC, aprovar; (3) T11, "Gerar" e "Baixar"
  no Chromium.
- Esperado: o arquivo `<DEC-id>.json` baixa.
- Risco apontado (`06-T44-tech-lead.md`, Minor 1): o pedido vai num `data:` URL, o `encodeURIComponent` triplica cada
  byte fora do ASCII e pode passar do limite de URL do navegador; "Copiar" e o bloco continuam funcionando.
- Por que baixa: pedidos reais ficam muito abaixo disso, e há o "Copiar" como contorno. Se falhar na sessão S-03, volta
  ao tech-lead para a troca por `Blob`.

**QF-04. Segunda cópia seguida do JSON pode não ser anunciada.** Criticidade **baixa**, a confirmar com leitor de tela
(sessão S-01). Origem: `06-T44-tech-lead.md`, Minor 3. Copiar duas vezes grava o mesmo texto na região `role="status"`.

**Divergências de texto e de estado, para a `ux-ui-design` (não são defeito da construção):**
- D-01: os dois 429 com um texto só (QF-01).
- D-02: a T02 sem texto próprio de 429 e sem texto para senha vazia (`06-T37-tech-lead.md`, Minor 6).
- D-03: a falha de cópia da chave usa o texto da falha de cópia dos códigos.
- D-04: os esqueletos "Gerando o QR code…", da T05, da T06 e da fila não aparecem: a página chega pronta do servidor.
  Recomendação desta etapa: tirar esses estados da 03 em vez de criar esqueleto que nunca seria visto.
- D-05: textos usados que não estão na 03: aviso de C-28 na T11 (`06-T44-tech-lead.md`, Minor 4), os de (a) a (g) da
  `06-T43-engenheiro-frontend.md`, o `caption` com mais de um filtro (T38), os de worker e expurgo da T12 (T45) e as
  frases compostas da T41.
- D-06: a T12 não tem como escolher o modelo do agente, e ligar sem modelo dá 409 (`06-T45-engenheiro-frontend.md`).
  Não afeta a 0.1.0, com os agentes desligados; precisa de decisão antes de ligar o primeiro agente em produção.

**Perguntas de regra, para o `analista-requisitos` (e Fabiano, se mudar o requisito):**
- R-01: demanda `entregue` ou `encerrada` ainda aceita edição de campos pela T06 e pelo `PATCH` (hoje aceita;
  `06-T15-tech-lead.md`). Sugestão desta etapa: recusar com 409, porque a demanda final não deveria mudar sem registro
  de reabertura.
- R-02: o DEC é aceito em demanda `encerrada`, `entregue` ou `em_construcao`; o status não muda e o DEC pendente
  aparece no filtro `statusDecisao=pendente` sem caminho de volta (`06-T20-tech-lead.md`, Minor 3).
- R-03: demanda sem contexto, problema e impacto gera DEC com descrição vazia, que só falha (422) na hora de gerar o
  pedido, depois da aprovação (`06-T20-tech-lead.md`, Minor 4).
- R-04: os `flags` da saída do orquestrador são validados e descartados (`06-T28-tech-lead.md`, desvio 5). Conferi: nem
  o `01` nem a T05 da `03` pedem que apareçam. Está conforme; fica só como ideia para a 0.2.0.

### 5. Casos exploratórios sugeridos (plano de sessões)

Cada sessão tem missão, tempo, o que cobre e o que fica de fora. Nenhuma foi executada nesta etapa.

| Sessão | Missão | Tempo | Cobre | Fica de fora |
|---|---|---|---|---|
| S-01 Teclado e leitor de tela (G2) | Percorrer as 12 telas só com teclado e com NVDA ou o leitor do sistema, pela coluna "Foco" e "Teclado" da 03, seção 5 | 2 h | Foco no `h1` ao abrir e no título do passo (T01, T02); foco no `caption` depois de filtrar e de "Voltar" do navegador (T38); contador anunciado a partir de 90 % (T04); foco no `h2` pelas âncoras e no "Mudar status" em status final, `details` (T05); diálogo que prende e devolve o foco, "Gravar mesmo assim" com falha da API (T07); Resumo de erros reanunciado ao remover item, os três "Comentário" e os três grupos de nível (T08); alerta de resultado, grupo "Opção escolhida" sem mover o foco, "Aprovar" indisponível pelas setas (T11); "Gerando o pedido…", bloco rolável, copiado duas vezes (T44, QF-04); interruptor com Espaço e Enter, foco depois de ligar e no erro, "Teto salvo" anunciado (T12); opção indisponível do Grupo de opções nunca marcada pelas setas (T36); controle sob o cabeçalho fixo ao rolar (T40, `target-size`) | Leitores de tela além de um; navegadores além do Chromium |
| S-02 Permissão indevida | Tentar fazer, com a conta errada, o que só a outra pode | 1 h | Administradora tenta: aprovar DEC de nível `cto` (P1-b, deve ser recusado), ligar agente, mudar teto (só `cto`); CTO tenta registrar a aprovação como administradora (C-12); conta sem 2FA tenta abrir telas por URL direta e chamar a API; sessão de 8 h vencida no meio de um formulário; sessão sem 2FA passados 15 min; Server Action chamada com sessão de outra conta | Ataques de rede (são da `seguranca-aplicacao`) |
| S-03 Limites e borda | Empurrar cada limite um pouco acima e um pouco abaixo | 1 h 30 | Texto bruto de 100.000 e 100.001 caracteres, com acento e emoji; campo de 10.000; lista de 50 e 51 itens; QF-03 com ESP grande e acentuada; 31ª demanda na mesma hora pela mesma conta (C-36, 429: qual texto a T04 mostra?); 61º artefato na hora; `limit` 100 e 101 na fila; aviso de capacidade acima de 9.000 ids (só com banco preparado pela engenharia); demanda criada às 23h59 e às 00h01 de São Paulo | Volume de 5.000 demandas (RNF-03 é do teste de desempenho, T35) |
| S-04 Sequência fora de ordem | Fazer as coisas na ordem que ninguém previu, com duas abas | 1 h | Aprovar na aba A enquanto a aba B grava ESP v2 (o DEC tem que recusar ou a ESP tem que deixá-lo desatualizado, nunca os dois sem aviso); decidir o mesmo DEC nas duas abas; CTO e administradora aprovando ao mesmo tempo com opções diferentes; mudar status da demanda na T05 enquanto o DEC é criado; "Voltar" e "Avançar" do navegador depois de decidir (reenvio da ação?); duplo clique em "Salvar", "Gravar" e "Registrar decisão"; DEC criado em demanda encerrada (R-02) | Concorrência exata, já automatizada nas T14, T18 a T21 |
| S-05 Conteúdo hostil e dado pessoal | Ver se o painel trata o que vem de fora como texto e se o dado pessoal fica onde deve | 45 min | `<script>` e `<img onerror>` em todo campo livre, inclusive anexo e origem; link `javascript:` em anexo; e-mail, telefone e CPF fictícios na ESP, no RSK e na opção do DEC (C-28: 422 com o campo e o tipo, sem o valor); texto recebido fechado por padrão na T05; código de recuperação usado duas vezes | Varredura automatizada de XSS (T46) |
| S-06 2FA de ponta a ponta com aparelho real | Ativar e usar o 2FA com celular, como Fabiano vai usar | 30 min | Leitura do QR (U-01); chave digitada à mão com e sem espaços; relógio do celular adiantado 2 min; código de recuperação; "Copiar chave" e "Baixar códigos"; passo 2 vencido ("O tempo para digitar o código acabou.") | Outros aplicativos além de dois |

Candidatos a automação, para o `qa-automacao`:
- A-01: um teste de integração único do CA-21.1, que percorra demanda, ESP, RSK, DEC, aprovação e decisão e confira a
  lista completa de eventos com o ator de cada um. Hoje a cobertura é por composição de seis arquivos.
- A-02: e2e do "Baixar" com pedido grande e acentuado (QF-03), se a sessão S-03 confirmar o risco.
- A-03: e2e do texto do bloqueio por conta (QF-01), depois do texto novo da `ux-ui-design`.
- A-04: e2e da 31ª demanda na hora pelo painel, conferindo o texto do 429 na T04 (S-03).

### 6. Leitura do QR code pelo aplicativo autenticador (condição da T37)

Não foi feita nesta etapa: meu papel não tem navegador nem aparelho. O que existe hoje: `src/lib/qr-norma.test.ts`
(40 versões lidas por um leitor próprio em `test/leitor-qr.ts`, que não importa o gerador) e
`e2e/autenticacao-qa.spec.ts` › "QR code do passo 2, lido de volta por um leitor independente". Nenhum leitor de
mercado leu o símbolo. O caminho de teste é o cenário U-01 da seção 7. Se o aplicativo não ler o QR, a decisão do
tech-lead manda a T37 voltar; a chave em texto continua valendo como contorno.

### 7. Roteiro de aceite (UAT) para Fabiano

Ambiente: P1 (homologação da etapa 09, ou desenvolvimento). Não é produção, então não há snapshot a tirar. Dados só
fictícios. Para cada cenário, marcar "aceito" ou anotar a pendência. Os cenários seguem as escolhas padrão da Parada 1
que ficaram valendo: a administradora aprova com a própria conta (P1-a), não aprova DEC de nível "Só o CTO" (P1-b), a
aprovação não muda o status da demanda sozinha (P1-d), e o teto é em US$ (P1-f).

| # | Cenário | Passos | Resultado esperado | Aceite |
|---|---|---|---|---|
| U-01 | Ativar o 2FA lendo o QR com o celular (fecha a condição da T37) | Criar C1 por `pnpm tsx scripts/criar-usuario.ts --email uat-cto@ficticio.test --nome "Pessoa Ficticia UAT CTO" --papel cto` (anotar a senha que aparece uma vez); entrar em `/entrar`; na T02, confirmar a senha; no Google Authenticator **e** no Microsoft Authenticator, "adicionar conta" e ler o QR da tela; digitar o código de um deles em "Verificar"; baixar os códigos; marcar "Guardei…"; "Concluir" | Os dois aplicativos leem o QR na primeira tentativa e mostram "WS Orquestrador de Demandas" e `uat-cto@ficticio.test`; o código é aceito; a fila abre com "Verificação em duas etapas ativada." Se um aplicativo não ler: anotar qual, a versão e o modelo do celular, e tentar a chave em texto | [ ] |
| U-02 | Conta da administradora | Criar C2 (`uat-adm@ficticio.test`, papel `administradora`) e ativar o 2FA como no U-01 | Mesmo resultado do U-01 | [ ] |
| U-03 | Entrar, sair e errar | Sair; entrar com C1; errar a senha uma vez; errar o código uma vez; entrar com um código de recuperação; tentar o mesmo código de novo | Mensagens da 03 em pt-BR; o código de recuperação vale uma vez só | [ ] |
| U-04 | Criar demanda colando o texto | T04: colar T-PII; título "Pedidos duplicados no ERP (fictício)", solicitante "Pessoa Ficticia Solicitante", tipo Bug; "Salvar" | T05 com o id `DEM-<hoje>-NNNN` e status Nova; "Texto recebido" fechado, com o aviso de dado pessoal; a fila mostra a demanda | [ ] |
| U-05 | Do zero ao pacote | Na demanda do U-04: T07 com E-OK sem dúvida; T08 com R-OK; T09 com DC-OK (nível "Só o CTO") | ESP v1, RSK v1 e DEC v1 na T05; status "Pronta para decisão"; o histórico tem um evento por passo, com C1 e o sistema (CA-21.1) | [ ] |
| U-06 | Dúvida em aberto | Nova demanda; ESP com a dúvida "Qual o volume diário? (fictício)"; "Gravar mesmo assim" | Status "Aguardando informação"; a T05 lista a dúvida e diz que nada é enviado ao solicitante; nenhuma mensagem sai | [ ] |
| U-07 | DEC desatualizado | Na demanda do U-05, gravar a ESP v2; abrir a T11 do DEC v1 | Aviso de desatualizado; "Aprovar" indisponível com o motivo; "Devolver" funciona e a demanda volta a "Em análise" | [ ] |
| U-08 | Aprovar e gerar o pedido | Criar DEC v2 (cita ESP v2); na T11, conferir a revisão (destino, níveis, nível de aprovação); aprovar A; "Gerar"; "Baixar"; "Copiar"; validar o arquivo baixado com `node /home/deploy/servidor/projetos/estruturaAutonoma/ferramentas/construir/construir.mjs validar <arquivo>`, **sem** copiá-lo para `pedidos/` | Pedido gerado; `ok: true` na validação; o arquivo não traz o nome do solicitante nem o texto colado; gerar de novo dá o mesmo arquivo; o lembrete diz que o status muda à mão | [ ] |
| U-09 | Dupla aprovação | Nova demanda com ESP e RSK; DEC com nível "CTO e administradora"; C1 aprova A; sair; C2 entra e aprova com a referência `DOC-FICTICIO-001` e a data de hoje | Depois da 1ª: pendente, com a aprovação do CTO visível e sem pedido; depois da 2ª: aprovada, com os dois nomes; a opção fica fixada em A para C2 | [ ] |
| U-10 | Pedido recusado por dado pessoal | Nova demanda; ESP com "contato@exemplo.test" na situação atual; RSK; DEC; aprovar; "Gerar" | 422 com o campo e o tipo ("e-mail"), sem mostrar o valor; nenhum arquivo | [ ] |
| U-11 | Status manual até o fim | Na demanda do U-08: Aprovada → Em construção → Entregue; tentar mudar de novo | Cada mudança no histórico com C1; em "Entregue", nenhuma opção de mudança | [ ] |
| U-12 | Estudo não gera pedido | Demanda tipo Estudo; ESP sem os campos de construção; RSK; DEC; aprovar; abrir a seção do pedido | Só a frase de que estudo não gera Pedido de Construção, sem botão | [ ] |
| U-13 | Agentes e teto | T12 com C1: quatro desligados, teto não definido, gasto 0; salvar teto 10; entrar com C2 e abrir a T12 | Teto salvo com aviso; para C2 os controles aparecem desabilitados e legíveis | [ ] |
| U-14 | Fila e filtros | Filtrar por "Aguardando informação", depois por tipo Bug e linha "Automação e integração"; "Limpar filtros" | Só as demandas do filtro, com "N demandas encontradas."; o filtro fica na URL | [ ] |
| U-15 | Celular e zoom | Abrir a fila, a T05 e a T11 no celular (320 px) e no computador com zoom de 200 % | Nada some nem fica cortado; o menu abre e fecha | [ ] |

Pendências de aceite já conhecidas antes do UAT: QF-01 a QF-04, D-01 a D-06 e R-01 a R-03. Nenhuma impede o aceite da
0.1.0 pelos critérios do pedido; Fabiano decide se alguma entra antes da entrega.

## Decisões tomadas

- CA-21.1 contado como coberto por composição, e não "sem cobertura": cada passo do fluxo tem o evento e o ator
  conferidos em algum teste, e `criar.test.ts` confere a sequência até o DEC; falta só um teste único, que vai como
  candidato a automação (A-01) e não como devolução.
- Critérios que dependem de relógio injetado, provedor falso, papel do banco ou concorrência exata ficaram marcados
  "só automatizado" no roteiro manual: montá-los à mão exigiria mexer no banco ou chamar provedor real, o que a
  construção proíbe.
- A leitura do QR com aplicativo de verdade foi para o UAT (U-01) como pendência de Fabiano, conforme a orientação do
  maestro: não tenho aparelho nem navegador.
- QF-01 a QF-04 classificados como baixa: nenhum perde dado, abre acesso ou impede o fluxo; todos têm contorno.
- O texto de 429 é tratado como defeito de desenho (dono `ux-ui-design`), e não da construção: o engenheiro usou o
  texto que a 03 tinha.
- Os `flags` do orquestrador (R-04) ficaram conformes: nem o 01 nem a 03 pedem que apareçam.
- No UAT, contas próprias por `criar-usuario.ts` em vez das do seed: o U-01 testa o QR de uma conta sem 2FA, e as senhas
  do seed não precisam aparecer em nenhum roteiro.
- Status `pronto` e não `devolvido`: o contrato devolve só critério sem cobertura, e não há nenhum.

## Pendências

- Fabiano: executar o U-01 (leitura do QR pelo Google Authenticator e pelo Microsoft Authenticator). É a condição da
  decisão do tech-lead sobre `src/lib/qr.ts` na T37; se algum não ler, a T37 volta.
- Fabiano: executar o roteiro de aceite da seção 7 depois que a etapa 09 subir a homologação.
- `ux-ui-design`: QF-01, QF-02 e D-01 a D-06.
- `analista-requisitos`: R-01 a R-03.
- `qa-automacao`: A-01 a A-04.
- Maestro (08-revisao) ou tech-lead: QF-03 depende da sessão S-03; se o "Baixar" falhar, a troca por `Blob` passa pelo
  tech-lead.
- Sessões S-01 a S-06 não executadas: precisam de navegador, leitor de tela e celular. Podem rodar numa volta desta
  etapa com o ambiente da 09, ou junto com o UAT.
- Para o maestro: algumas buscas desta etapa passaram do limite de exibição, e a ferramenta gravou a saída em
  `~/.claude/projects/.../tool-results/`. Li esses arquivos, gerados pelas minhas próprias buscas nesta etapa.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (07) todo critério de aceite de 01 aparece no mapa
- [x] (07) nenhum critério ficou "sem cobertura"
- [x] (07) os dados de teste são fictícios
