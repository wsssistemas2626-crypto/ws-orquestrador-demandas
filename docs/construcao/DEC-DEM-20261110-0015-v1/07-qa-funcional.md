---
pedido: DEC-DEM-20261110-0015-v1
etapa: 07-qa-funcional
agente: qa-funcional
leu: [contrato-passagem.md, pedido.json, docs/superpowers/specs/2026-11-10-ws-orquestrador-demandas-novo-visual-design.md (seções 1, 2, 6 e 7), 01-analista-requisitos.md, 03-ux-ui-design.md, tarefas.json, 06-T01-qa-automacao.md, 06-T02-qa-automacao.md, 06-T03-qa-automacao.md, 06-T04-qa-automacao.md, 06-T05-qa-automacao.md, 06-T06-qa-automacao.md, 06-T07-qa-automacao.md, 06-T08-qa-automacao.md, 06-T09-qa-automacao.md, 06-T10-qa-automacao.md, 06-T11-qa-automacao.md, 06-T12-qa-automacao.md, 06-T13-qa-automacao.md, 06-T14-qa-automacao.md, 06-T15-qa-automacao.md, 06-T16-qa-automacao.md, 06-T17-qa-automacao.md, 06-T17-engenheiro-frontend.md (trechos das rodadas e do G4, por busca), 06-T17-tech-lead.md (trecho 2.1, por busca), docs/manual-tecnico/capturas/*.png (as nove), test/estatico/piso-de-assercoes.test.ts, src/components/Tabela.tsx (região rolável), scripts/seed-ficticio.ts (contas e TITULOS_DO_E2E, por busca), nomes dos testes em e2e/, src/ e test/ (por busca)]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

### 0. Como ler

- Os 69 critérios de aceite (CA) de `01-analista-requisitos.md` aparecem nas seções 2 (roteiro) e 3 (mapa). Os
  textos esperados seguem a 03 onde ela ajustou o 01 (spec, 2.3): CA-08.1 espera "Pacote desatualizado" no lugar de
  "Desatualizado"; CA-09.1 espera "Decidir entre as opções A e B.", quem age "Administradora" e o link "Abrir a decisão".
- **Ambiente do roteiro:** o ramo `construcao/DEC-DEM-20261110-0015-v1` rodando localmente ou numa homologação com o
  `scripts/seed-ficticio.ts`. Nunca a produção: o roteiro grava decisões e versões.
- **Larguras:** computador 1280 × 720; celular 390 × 844; reflow 320 px.
- **Dados de teste, todos fictícios** (seed, C-37, JUR-2026-002 7.4):
  - contas `cto` ("Pessoa Ficticia CTO"), `administradora` ("Pessoa Ficticia Administradora") e `sem2fa`; o TOTP vem
    do segredo fictício do seed;
  - demandas pelo nome da chave em `TITULOS_DO_E2E`: `etapasDupla` ("Etapas com uma de duas aprovações (fictício)"),
    `etapasSemVersoes`, `decisaoOpcaoB`, `decisaoDevolverComOpcao`, `decisaoCelularCto`, `decisaoCelularDupla`,
    `decisaoRecomendaB`, `espListaDeTextos`, mais a `textoDeTerceiro` (título com U+202E, `<script>` e `<img onerror>`);
    os ids (`DEM-AAAAMMDD-NNNN`) mudam a cada banco, então o roteiro cita a demanda pelo título;
  - documento assinado: identificador `DOC-FICTICIO-1`, data 11/11/2026; repositório destino do seed
    (`…/painel-ficticio`).
- **Cobertura:** "e2e", "unidade" e "estático" rodam em `pnpm test` ou `pnpm test:e2e`. "Comando" é verificação por
  `git diff` ou por rodada, definida no próprio critério do 01 e executada em toda entrega 06-*-testes; a 08 repete.

### 1. Resumo

- Todo CA tem cobertura: 61 por teste automatizado (e2e, unidade ou estático) e 8 com parte ou todo por comando ou
  revisão de diff (CA-06.4, CA-11.7, CA-15.1, CA-15.2, CA-16.1, CA-16.2, CA-16.3, CA-17.2). Nenhum ficou "sem
  cobertura" (Decisões).
- Conferi as nove capturas (seção 6): todas com dado fictício. Achei 3 divergências visuais e 1 risco de produto, todos
  sem bloqueio (seção 5).
- Três verificações de pronto merecem atenção da 08 e da 09, sem bloquear esta etapa:
  - o G4 do CA-15.1 não sai vazio: `src/app/api/saude/route-qa.test.ts` tem +5 linhas. É exceção aceita pela
    06-T17-tech-lead (2.1). Só o teste mudou; a rota não mudou;
  - o RNF-12 foi cumprido nas rodadas A, B e C do engenheiro. A rodada 1 da 06-T17-testes teve 2 falhas
    intermitentes (`axe-todas.spec.ts:229` "socket hang up"; `:267` com 34,1 s);
  - o caminho sem script dos contadores não filtra (achado da 06-T09-testes, decisão aberta com o tech-lead).

### 2. Roteiro de teste por critério de aceite

Passo comum "entrar": `/entrar`, conta indicada, senha e código TOTP do seed. Os passos citam o caminho mínimo; onde há
e2e, o roteiro repete o que ele faz, para servir à UAT e à reprodução manual.

#### RF-01 Tokens

| CA | Passos | Dado | Resultado esperado |
|---|---|---|---|
| CA-01.1 | Buscar `#[0-9a-fA-F]{3,8}` em `src/**/*.ts(x)` fora de `globals.css` | código do ramo | Só `AssistenteDoisFatores.tsx`, com `#ffffff` e `#000000` (QR) |
| CA-01.2 | Buscar `style={` em `src/` | código do ramo | Nenhuma ocorrência |
| CA-01.3 | Ler o `@theme` de `src/app/globals.css` | paleta do manual | Uma variável por cor, com o valor exato (`#12385f`, `#1a6ae0`, `#1354b4`, `#7db0f5`, `#0f1620`, `#4a5763`, `#f6f8fa`, `#eaf1fd`, `#dfe4ea`, `#ffffff` e os tons de estado) |

#### RF-02 Fontes

| CA | Passos | Dado | Resultado esperado |
|---|---|---|---|
| CA-02.1 | Abrir T01 a T12 com a aba Rede do navegador aberta, nas duas larguras | conta `cto`; demanda `etapasDupla` | Toda requisição para a origem do app; nenhuma para `fonts.googleapis.com`, `fonts.gstatic.com` ou outro domínio; nenhum erro de CSP no console |
| CA-02.2 | Inspecionar o estilo computado do `<body>` e de um id `DEM-…` na T03 | conta `cto` | `font-family` do corpo começa por Noto Sans; a do id, por Noto Sans Mono; as duas carregadas (`document.fonts`) |
| CA-02.3 | Buscar `fonts.googleapis.com` e `fonts.gstatic.com` em `src/`, `public/` e na configuração | repositório | Nenhuma ocorrência |

#### RF-03 Casca (a partir de 768 px)

| CA | Passos | Dado | Resultado esperado |
|---|---|---|---|
| CA-03.1 | Entrar; abrir T03, T05, T11 e T12 em 1280 px | conta `cto`; `etapasDupla` e o DEC dela | Menu marinho com "Demandas", "Nova demanda", "Agentes e teto"; o item da tela com `aria-current="page"`; "Pessoa Ficticia CTO (CTO)" e "Sair" |
| CA-03.2 | Recarregar a T03; Tab uma vez; Enter | conta `cto` | Foco em "Pular para o conteúdo"; Enter leva o foco ao `main`; o `h1` não recebe foco na primeira carga |
| CA-03.3 | Com o teto de agentes atingido ou mais de 9.000 demandas, abrir qualquer tela do painel | homologação com teto 0,01 e agente suspenso (só em homologação) | Os avisos de suspensão e de capacidade, com os textos da 0.1.13, acima do `main` |
| CA-03.4 | Na T03, clicar "Nova demanda" no menu | conta `cto` | T04 abre; foco no `h1` "Nova demanda" |
| CA-03.5 | Na T03, clicar "Sair"; repetir `GET /api/demandas` com o cookie antigo | conta `cto` | "Saindo…"; vai a `/entrar`; o cookie antigo recebe 401 |

#### RF-04 Gaveta (abaixo de 768 px)

| CA | Passos | Dado | Resultado esperado |
|---|---|---|---|
| CA-04.1 | Abrir a T03 em 390 px | conta `cto` | Sem menu lateral; barra com "Menu" (`aria-expanded="false"`) e a marca |
| CA-04.2 | Ativar "Menu"; apertar Tab 20 vezes; depois Shift+Tab no primeiro | conta `cto` | `aria-expanded="true"`; foco em "Fechar menu"; o foco nunca sai da gaveta; Shift+Tab no primeiro vai a "Sair" |
| CA-04.3 | Com a gaveta aberta, Esc | conta `cto` | Gaveta fecha; foco em "Menu" |
| CA-04.4 | Com a gaveta aberta, ativar "Agentes e teto" | conta `cto` | T12 abre; gaveta fechada; foco no `h1` da T12 |
| CA-04.5 | Com a gaveta aberta, rodar o axe (extensão ou e2e) | conta `cto` | Nenhuma violação |

#### RF-05 Contadores (T03)

| CA | Passos | Dado | Resultado esperado |
|---|---|---|---|
| CA-05.1 | Abrir `/demandas` sem filtro; comparar cada contador com `GET /api/demandas?status=<s>` | seed (hoje: Nova 19, Pronta para decisão 4, Todas 23) | Cada contador mostra o total da API; só "Todas" com `aria-pressed="true"` |
| CA-05.2 | Ativar "Pronta para decisão" | idem | URL `/demandas?status=pronta_para_decisao`; só esse status na lista; contador pressionado; foco no título do resultado; região de aviso "N demandas encontradas." com o N da API |
| CA-05.3 | Abrir `/demandas?status=nova&tipo=bug&offset=20`; ativar "Em análise" | idem | URL com `status=em_analise` e `tipo=bug`, sem `offset` |
| CA-05.4 | Abrir `/demandas?tipo=bug` | idem | Cada contador igual a `GET /api/demandas?status=<s>&tipo=bug` |
| CA-05.5 | Com "Nova" pressionado, ativá-lo de novo | idem | `status` sai da URL; "Todas" pressionado |
| CA-05.6 | Só teclado: Tab até um contador; Enter; repetir com Espaço | idem | Filtra como o clique |
| CA-05.7 | Abrir `/demandas?status=xyz` e `/demandas?status=%3Cscript%3E&tipo=bug` | idem | Alerta "Algum filtro do endereço não é válido. Mostrando todas as demandas."; "Todas" pressionado; nada do valor inválido em link ou campo |

#### RF-06 Tabela densa (T03, a partir de 768 px)

| CA | Passos | Dado | Resultado esperado |
|---|---|---|---|
| CA-06.1 | Achar na tabela uma demanda com ESP e RSK e sem DEC; ler a célula Etapas com leitor de tela ou pela árvore de acessibilidade | seed; conferir as versões pela API | ESP e RSK cheias, DEC tracejada; nome "Etapas: ESP feita, RSK feita, DEC por fazer" |
| CA-06.2 | Ler a coluna Idade de demandas criadas hoje e em dias anteriores | seed (criado no dia da rodada) | "Hoje", "1 dia", "N dias"; `<time dateTime>` com a criação; "criada em dd/mm/aaaa" em texto |
| CA-06.3 | Com mais de 20 demandas, ativar "Próxima" | seed (23) | Página 2 com as 3 restantes; foco no título do resultado |
| CA-06.4 | Chamar `GET /api/demandas` com token de agente e com sessão; comparar os campos com a 0.1.13 | mesmo seed nas duas versões | Mesmos campos |

#### RF-07 Cartões (T03, abaixo de 768 px)

| CA | Passos | Dado | Resultado esperado |
|---|---|---|---|
| CA-07.1 | Abrir a T03 em 390 px | seed | Sem tabela visível; lista com um item por demanda; cada item com id (link), título, tipo, status, etapas, urgência, linha de serviço e idade |
| CA-07.2 | Em 390 px, ativar um contador | seed | Foco no título do resultado da lista; região de aviso anuncia o total |
| CA-07.3 | Em 320 px, medir `document.documentElement.scrollWidth` | seed, com a `textoDeTerceiro` | Não passa da largura da janela |
| CA-07.4 | Em 1280 px, inspecionar a árvore de acessibilidade | seed | Tabela visível; lista fora da árvore; `#resultado-da-fila` uma vez |

#### RF-08 Barra de etapas (T05)

| CA | Passos | Dado | Resultado esperado |
|---|---|---|---|
| CA-08.1 | Abrir a T05 da `etapasDupla` em 1280 e 390 px | `etapasDupla` (ESP v1 sem dúvidas, RSK v1, DEC v1 dupla com a aprovação do CTO na A) | "Registrada", "Feita", "Feito", "1 de 2 aprovações", "Depois da aprovação"; a etapa 4 com `aria-current="step"` |
| CA-08.2 | Abrir a T05 da `etapasSemVersoes` | `etapasSemVersoes` | Especificação "Por fazer", id "Nenhuma", etapa atual |
| CA-08.3 | Levar uma demanda a Encerrada (arquivar o DEC dela) e abrir a T05 | demanda descartável de homologação | Nenhuma etapa com `aria-current` |
| CA-08.4 | Rodar o teste de unidade das regras | tabela do RF-08 | Cada linha dá o estado da tabela ("Pacote desatualizado" no lugar de "Desatualizado") |

#### RF-09 Próxima ação (T05)

| CA | Passos | Dado | Resultado esperado |
|---|---|---|---|
| CA-09.1 | Abrir a T05 da `etapasDupla`; ativar o link do cartão | `etapasDupla` | "Decidir entre as opções A e B."; detalhe "O CTO já aprovou a opção A. Falta a aprovação da administradora, com o identificador do documento assinado."; "Quem age: Administradora"; "Abrir a decisão" leva à T11 do DEC |
| CA-09.2 | Demanda `aguardando_informacao` com o agente de insumo técnico pendente | só por unidade (agentes desligados no e2e) | Vale a linha 2 ("Esperar o …"), não a 3 |
| CA-09.3 | Rodar o teste de unidade com um caso por linha | tabela do RF-09 | Resultado de cada linha e ordem de prioridade da tabela |
| CA-09.4 | Buscar quem chama `proximaAcao` e `etapasDaDemanda` | código do ramo | Só `page.tsx`; nenhuma Server Action, rota ou módulo |

#### RF-10 Detalhe A2 (T05)

| CA | Passos | Dado | Resultado esperado |
|---|---|---|---|
| CA-10.1 | Abrir a T05 em 1280 e 390 px; ativar cada link de "Nesta página" | `etapasDupla` | Seções Dados, Versões, Status, Texto recebido e Histórico; cada link leva o foco ao `h2` |
| CA-10.2 | Contar os itens do Histórico e comparar com o histórico da API | demanda com mais eventos do seed | Todos os eventos, na ordem da API, sem "Ver histórico completo" |
| CA-10.3 | Rodar `detalhe-demanda.spec.ts`, `decisao.spec.ts`, `pedido-construcao.spec.ts` e ler o diff deles | ramo contra 198e97d | Passam; diff só de seletor ou texto |

#### RF-11 Decisão por botões (T11, duas larguras)

| CA | Passos | Dado | Resultado esperado |
|---|---|---|---|
| CA-11.1 | Conta `cto`; T11 do DEC de nível CTO; marcar B; "Aprovar a opção B"; "Confirmar e registrar" | `decisaoOpcaoB` | Diálogo com "Você vai registrar: Aprovar a opção B. …", o repositório e "Nível de aprovação: Só o CTO."; depois "Decisão registrada: Aprovada, opção B." |
| CA-11.2 | Mesmo tipo de DEC, sem marcar opção; "Aprovar" | `decisaoCelularCto` | Resumo de erros "Escolha a opção A ou a opção B."; diálogo não abre; nenhum POST |
| CA-11.3 | Gravar uma ESP nova numa demanda com DEC pendente; abrir a T11 do DEC antigo | `decisaoDevolverComOpcao` (homologação) | "Aprovar" com `aria-disabled` e "Indisponível: pacote desatualizado." visível; "Devolver" e "Arquivar" funcionam |
| CA-11.4 | DEC que cita rascunho de agente; "Devolver" sem marcar a revisão | `decisaoRecomendaB` | "Marque que revisou os rascunhos de agente para registrar a decisão."; nada enviado |
| CA-11.5 | Conta `administradora`; DEC dupla sem aprovação; marcar A; "Aprovar a opção A" sem o documento | DEC dupla criado na `decisaoCelularDupla` | "Informe o identificador do documento assinado." e "Informe a data da assinatura."; nada enviado |
| CA-11.6 | Mesma tela; preencher `DOC-FICTICIO-1` e 11/11/2026; marcar a revisão se pedida; "Devolver"; confirmar | idem | O pedido da Server Action (aba Rede) não leva `referenciaDocumento` nem `dataDocumento` |
| CA-11.7 | Ler `git diff 198e97d -- src/components/dados-da-decisao.test.ts` | ramo | Só textos de rótulo mudaram; nenhuma asserção de regra |

#### RF-12 Decisão no celular (C2)

| CA | Passos | Dado | Resultado esperado |
|---|---|---|---|
| CA-12.1 | Conta `cto` aprova a A no DEC dupla; conta `administradora` abre a T11 em 390 px | `decisaoCelularDupla` | À vista, sem rolagem lateral: a frase da opção fixada, os dois campos do documento, a caixa de revisão (se houver rascunho) e o rodapé com "Aprovar a opção A", "Devolver" e "Arquivar" |
| CA-12.2 | Preencher `DOC-FICTICIO-1` e 11/11/2026; marcar a revisão; "Aprovar a opção A"; confirmar | idem | Diálogo de confirmação; depois "Aprovação da administradora registrada. O pacote está aprovado." |
| CA-12.3 | Em 390 × 844, Tab do primeiro ao último campo | `decisaoRecomendaB` | Nenhum elemento focado fica sob o rodapé nem sob a barra superior |
| CA-12.4 | Medir o rodapé e os três botões | idem | Rodapé até 160 px; cada botão com pelo menos 44 × 44 px |
| CA-12.5 | Abrir a T11 de um DEC decidido em 390 px | DEC do CA-11.1 | Sem rodapé; "Decisão registrada: …" |
| CA-12.6 | Abrir a T11 do DEC desatualizado do CA-11.3 em 390 px | idem | Alerta de desatualizado visível sem abrir nada; principal indisponível com a explicação visível |

#### RF-13 Telas públicas

| CA | Passos | Dado | Resultado esperado |
|---|---|---|---|
| CA-13.1 | Rodar `entrar.spec.ts`, `configurar-2fa.spec.ts`, `autenticacao-qa.spec.ts`; ler o diff | ramo | Passam; diff só de seletor ou texto (hoje, sem diff) |
| CA-13.2 | Conta `sem2fa`; T02 no passo do QR; inspecionar as cores | `sem2fa` (não concluir a ativação) | Fundo `#ffffff`, módulos `#000000` |
| CA-13.3 | Axe na T01 vazia, com erro (senha errada) e no passo 2, em 1280 e 390 px | conta `cto` | Nenhuma violação |

#### RF-14 Demais telas

| CA | Passos | Dado | Resultado esperado |
|---|---|---|---|
| CA-14.1 | Rodar os e2e de T04, T06 a T10 e T12; ler o diff | ramo | Passam; diff só de seletor ou texto |
| CA-14.2 | Abrir T04, T06 a T10 e T12 em 390 e 320 px; com 50 anexos na T06, itens a mais na T07 e T08, erros na T09 e o diálogo de ligar na T12 | `espListaDeTextos`, `etapasDupla`; conta `cto` | Sem rolagem lateral da página fora da tabela da T12 |

#### RF-15 Superfícies que não mudam

| CA | Passos | Dado | Resultado esperado |
|---|---|---|---|
| CA-15.1 | Rodar o comando do G4 (lista do plano) contra 198e97d | ramo | Só a exceção registrada: `src/app/api/saude/route-qa.test.ts`, +5 linhas, nenhuma removida |
| CA-15.2 | `git diff 198e97d -- src/modules/` | ramo | Só `resumo-da-fila.ts` e o teste dele, novos; nenhum `insert`, `update`, `delete` nem DDL |
| CA-15.3 | Rodar `src/proxy.test.ts`; ler o diff | ramo | Sem diff; passa |
| CA-15.4 | Rodar `seguranca.spec.ts`, `seguranca-qa.spec.ts` e os testes de `src/modules/` | ramo | Passam; piso de asserções dos 68 testes de `src/modules/` intacto |

#### RF-16 Testes

| CA | Passos | Dado | Resultado esperado |
|---|---|---|---|
| CA-16.1 | Contar linhas com `expect(` em `e2e/` e `src/**/*.test.ts` no ramo e em 198e97d | ramo e main | Ramo ≥ main |
| CA-16.2 | Ler o diff de cada teste que já existia | ramo | Só seletor, texto ou passo equivalente |
| CA-16.3 | `pnpm test:e2e` três vezes seguidas, cada uma sozinha | `retries: 0` | Três verdes; sem aumento de `retries` ou tempo-limite |

#### RF-17 Versão e capturas

| CA | Passos | Dado | Resultado esperado |
|---|---|---|---|
| CA-17.1 | Ler `package.json` | ramo | `"version": "0.2.0"` |
| CA-17.2 | Listar e abrir `docs/manual-tecnico/capturas/` | ramo | As nove PNG, nome com tela e largura, só dado fictício (conferido na seção 6) |

### 3. Mapa critério → teste automatizado

Arquivo › nome do teste (abreviado). Os nomes conferidos por busca no repositório ou nas entregas 06-*-qa-automacao.

| CA | Tipo | Teste que cobre |
|---|---|---|
| CA-01.1 | estático | `test/estatico/cores-so-por-token.test.ts` › "CA-01.1 …"; `src/components/tokens-em-uso.test.ts` |
| CA-01.2 | estático | `cores-so-por-token.test.ts` › "CA-01.2: nenhum style={ em src/"; `sem-recurso-externo.test.ts` |
| CA-01.3 | estático | `cores-so-por-token.test.ts` › "--color-%s = %s"; `painel-qa.test.ts` › "token %s = %s, dentro do @theme" |
| CA-02.1 | e2e | vigia de origem e CSP (`e2e/vigia.ts` pela fixture automática de `e2e/apoio.ts`) em todo e2e; `vigia.spec.ts` (negativo); `vigia-qa.spec.ts` (três canais) |
| CA-02.2 | e2e | `e2e/fontes-qa.spec.ts` › "CA-02.2 e RNF-06 na T03 …", "CA-02.2 na T01 …", "CA-02.2 na T02 …", "CA-02.2 na T04, T05 e T12 …"; `e2e/fontes.spec.ts` › "CV-04 na T01/T03/T11" |
| CA-02.3 | estático | `sem-recurso-externo.test.ts`; `vigia-qa.test.ts` › "nenhum arquivo de public/ nem de configuração da raiz cita Google Fonts" |
| CA-03.1 | e2e | `e2e/casca.spec.ts` › "CA-03.1: menu lateral com três itens …" |
| CA-03.2 | e2e + estático | `casca.spec.ts` › "CA-03.2: primeiro Tab …"; `test/estatico/casca-qa.test.ts` › "layout do painel: ordem da moldura" |
| CA-03.3 | unidade + estático | `src/components/componentes.test.ts` › "AvisosDaMoldura (03, 2.7: RF-18 e RNF-09)"; `componentes-qa.test.ts` › "AvisosDaMoldura: fronteiras"; `casca-qa.test.ts` › "ordem da moldura (CA-03.2, CA-03.3)". Sem e2e (o seed não suspende agente): ver EX-03 |
| CA-03.4 | e2e | `casca.spec.ts` › "CA-03.4: "Nova demanda" no menu leva o foco ao h1 da T04" |
| CA-03.5 | e2e | `casca.spec.ts` › "CA-03.5 e CV-16: Sair pela casca … cookie antigo recebe 401" |
| CA-04.1 | e2e | `casca.spec.ts` › "CA-04.1 a CA-04.3 …" |
| CA-04.2 | e2e | `casca.spec.ts` › "CA-04.1 a CA-04.3 …"; `casca-qa.spec.ts` › "CA-04.2: Shift+Tab no primeiro vai a "Sair" …" |
| CA-04.3 | e2e | `casca.spec.ts` › "CA-04.1 a CA-04.3 …" e "clique no véu e item da tela atual fecham …" |
| CA-04.4 | e2e | `casca.spec.ts` › "CA-04.4: "Agentes e teto" na gaveta …" |
| CA-04.5 | e2e | `casca.spec.ts` › "CA-04.5: axe com a gaveta aberta"; `axe-todas.spec.ts` › "T03 Fila em 390 px: com "Mais filtros" aberto e com a gaveta do menu aberta" |
| CA-05.1 | e2e + unidade | `e2e/fila-contadores.spec.ts` › "CA-05.1 e CA-05.4: com tipo=bug, cada contador mostra o total da API …"; `resumo-da-fila.test.ts` › "CA-05.1 …"; `dados-da-fila.test.ts` › "CA-05.1 …" |
| CA-05.2 | e2e | `fila-contadores.spec.ts` › "CA-05.2: ativar "Pronta para decisão" filtra …" |
| CA-05.3 | e2e + unidade | `fila-contadores.spec.ts` › "CA-05.3 …"; `dados-da-fila.test.ts` › "CA-05.3 …"; `resumo-da-fila.test.ts` › "CA-05.3: status, offset e limit da URL não mudam a contagem" |
| CA-05.4 | e2e + unidade | `fila-contadores.spec.ts` › "CA-05.1 e CA-05.4 …"; `resumo-da-fila.test.ts` › "CA-05.4 …" |
| CA-05.5 | e2e + unidade | `fila-contadores.spec.ts` › "CA-05.5 …"; `dados-da-fila.test.ts` › "CA-05.5 …" |
| CA-05.6 | e2e | `fila-contadores.spec.ts` › "CA-05.6: Enter e Espaço num contador filtram como o clique" |
| CA-05.7 | e2e + unidade | `fila-contadores.spec.ts` › "CA-05.7 e CV-07 …"; `fila.spec.ts` › "filtro inválido na URL …"; `dados-da-fila.test.ts` › "CA-05.7 e CV-07 na regra" |
| CA-06.1 | e2e + unidade | `fila-contadores.spec.ts` › "CA-06.1: o nome acessível da célula de etapas segue a API"; `fila-a1.test.ts` › "CA-06.1 na tabela …"; `resumo-da-fila.test.ts`; `dados-da-fila.test.ts` › "textoDasEtapas: as oito combinações" |
| CA-06.2 | unidade | `dados-da-fila.test.ts` › "idadeDaDemanda (CA-06.2)" e bordas; `fila-a1-qa.test.ts` › "a tabela e a lista mostram "Hoje" e "1 dia" …" |
| CA-06.3 | e2e | `fila-contadores.spec.ts` › "CA-06.3 …"; `fila.spec.ts` › "paginação …" |
| CA-06.4 | comando + unidade | G4 vazio em `src/app/api` (fora a exceção de teste) e `consultas.ts` sem diff; testes de API de hoje sem mudança (`src/app/api/demandas/demandas.test.ts`) |
| CA-07.1 | e2e + unidade | `fila-contadores.spec.ts` › "celular › CA-07.1 …"; `fila-a1.test.ts` › "CA-07.1: um item por demanda …" |
| CA-07.2 | e2e | `fila-contadores.spec.ts` › "celular › CA-07.2 …" |
| CA-07.3 | e2e | `fila-contadores.spec.ts` › "CA-07.3: em 320 px, scrollWidth …" |
| CA-07.4 | e2e | `fila-contadores.spec.ts` › "CA-07.4: em 1280 px …" |
| CA-08.1 | e2e + unidade | `e2e/detalhe-a2.spec.ts` › "CA-08.1 e CA-09.1: etapasDupla → …"; `detalhe.test.ts` › "BarraDeEtapas.tsx > CA-08.1 …" |
| CA-08.2 | e2e + unidade | `detalhe-a2.spec.ts` › "CA-08.2: etapasSemVersoes → …"; `detalhe.test.ts` › "CA-08.2 (HTML) …" |
| CA-08.3 | unidade | `detalhe.test.ts` › "BarraDeEtapas.tsx > CA-08.3 …" e "CA-08.3 (HTML): encerrada …"; `dados-das-etapas.test.ts`. Sem e2e (o seed não tem demanda encerrada): ver UAT-05 |
| CA-08.4 | unidade | `src/components/dados-das-etapas.test.ts` › "etapasDaDemanda (RF-08)" e bordas |
| CA-09.1 | e2e + unidade | `detalhe-a2.spec.ts` › "CA-08.1 e CA-09.1 …"; `detalhe.test.ts` › "CartaoProximaAcao.tsx > …" |
| CA-09.2 | unidade | `dados-das-etapas.test.ts` › "proximaAcao (RF-09) > CA-09.2 …"; `detalhe.test.ts` › "agente trabalhando (linha 2) …" |
| CA-09.3 | unidade | `dados-das-etapas.test.ts` › "proximaAcao (RF-09) > linha %i" (13) e "proximaAcao: bordas" (90 casos com oráculo) |
| CA-09.4 | estático | `test/estatico/dados-das-etapas.test.ts` › "CA-09.4: etapasDaDemanda e proximaAcao só em página" |
| CA-10.1 | e2e + unidade | `detalhe-a2.spec.ts` › "CA-10.1 …" e "alvo de toque em 390 px …"; `detalhe.test.ts` › "%s: toda âncora da página … tem alvo" |
| CA-10.2 | e2e + unidade | `detalhe-a2.spec.ts` › "CA-10.2 …"; `detalhe.test.ts` › "Historico.tsx > CA-10.2: com 30 eventos …"; `LinhaDoTempo.test.ts` |
| CA-10.3 | e2e | `e2e/detalhe-demanda.spec.ts`, `e2e/decisao.spec.ts`, `e2e/pedido-construcao.spec.ts` (diff só de seletor, 06-T11-testes) |
| CA-11.1 | e2e + unidade | `e2e/decisao-botoes.spec.ts` › "CA-11.1 e CV-10: decisaoOpcaoB …"; `dados-da-decisao.test.ts` (malha de 6.048 combinações) |
| CA-11.2 | e2e + unidade | `dados-da-decisao.test.ts` › "CA-11.2 …"; `decisao.spec.ts` › "C-14 …"; `decisao-botoes-qa.spec.ts` › "administradora em 390 px …" |
| CA-11.3 | e2e + unidade | `decisao-botoes.spec.ts` › "CA-11.3 …" e "CV-11 …"; `decisao.spec.ts` › "CA-12.4 …"; `pagina.test.ts` › "desatualizado: …" |
| CA-11.4 | e2e + unidade | `dados-da-decisao.test.ts` › "CA-11.4 e CV-14 …"; `decisao-botoes-qa.spec.ts` › "administradora em 390 px …" |
| CA-11.5 | e2e + unidade | `dados-da-decisao.test.ts` › "CA-11.5 e CA-11.6 …"; `decisao-botoes.spec.ts` › "CV-10 e D-05 …"; `decisao-celular-qa.spec.ts` › "segunda aprovação nas duas larguras …" |
| CA-11.6 | unidade + e2e | `dados-da-decisao.test.ts` › "CA-11.5 e CA-11.6 …" e a malha; `decisao-botoes-qa.spec.ts` ("Devolver" sem o documento abre o diálogo) |
| CA-11.7 | comando | `git diff` de `dados-da-decisao.test.ts` lido na 06-T12-testes; piso de asserções |
| CA-12.1 | e2e + unidade | `e2e/decisao-celular.spec.ts` › "CA-12.1 e CA-12.2 …" e "CV-12 e CA-12.1 …"; `decisao-celular-qa.spec.ts`; `pagina.test.ts` › "T13: nenhuma exigência de aprovação escondida em alguma largura" |
| CA-12.2 | e2e | `decisao-celular.spec.ts` › "CA-12.1 e CA-12.2 …" |
| CA-12.3 | e2e | `decisao-celular.spec.ts` › "CA-12.3 e CA-12.4: Tab do primeiro ao último campo …"; `decisao-celular-qa.spec.ts` (resumo e campos fora do rodapé) |
| CA-12.4 | e2e + unidade | `decisao-celular.spec.ts` › "CA-12.3 e CA-12.4 …"; `pagina.test.ts` › "rodapé (03, 6.3) …"; `alvo-de-toque.spec.ts` › "RNF-03: T11 Decisão …" |
| CA-12.5 | e2e + unidade | `decisao-celular.spec.ts` › "CA-12.5 e CV-11 …"; `pagina.test.ts` › "CA-12.5: sem formulário … não há rodapé" |
| CA-12.6 | e2e + unidade | `decisao-celular.spec.ts` › "CA-12.6 e CV-11: desatualizado em 390 px …"; `pagina.test.ts` › "T13: nenhuma exigência …" |
| CA-13.1 | e2e | `e2e/entrar.spec.ts`, `e2e/configurar-2fa.spec.ts`, `e2e/autenticacao-qa.spec.ts` (sem diff) |
| CA-13.2 | e2e | `e2e/moldura-publica.spec.ts` › "CA-13.2: o QR da T02 continua #ffffff com módulos #000000 …" |
| CA-13.3 | e2e | `moldura-publica.spec.ts` › "CA-13.3: axe na T01 vazia, com erro e no passo 2 …"; `axe-todas.spec.ts` › "T01 Entrar …" |
| CA-14.1 | e2e | `nova-demanda.spec.ts`, `editar-demanda.spec.ts`, `demanda-formularios-qa.spec.ts`, `especificacao(-qa).spec.ts`, `parecer-risco(-qa).spec.ts`, `pacote-decisao.spec.ts`, `agentes-teto.spec.ts` |
| CA-14.2 | e2e | `e2e/reflow.spec.ts` (T14 e T15, 390 e 320 px); `reflow-qa.spec.ts` (5 testes); `reflow-t15-qa.spec.ts` |
| CA-15.1 | comando | G4 contra 198e97d em toda 06-*-testes; saída esperada fixada na 06-T17-tech-lead, 2.1 |
| CA-15.2 | estático + comando | `test/estatico/leituras-da-fila.test.ts` › "CV-06: resumo-da-fila.ts só lê" e "CV-06 e CA-15.2: quem importa resumo-da-fila"; `git diff 198e97d -- src/modules` |
| CA-15.3 | unidade | `src/proxy.test.ts` (sem diff); piso em `piso-de-assercoes.test.ts` |
| CA-15.4 | e2e + unidade | `e2e/seguranca.spec.ts`, `e2e/seguranca-qa.spec.ts`; testes de `src/modules/` com piso em `piso-de-assercoes-qa.test.ts` (68 arquivos) |
| CA-16.1 | estático (parcial) + comando | `piso-de-assercoes.test.ts` e `piso-de-assercoes-qa.test.ts` (piso por arquivo, 88 arquivos); a contagem total contra a main fica na 08 |
| CA-16.2 | comando + estático | leitura do diff em cada 06-*-testes; `test/estatico/decisao-e2e.test.ts` (estrutura do e2e da decisão e axe sem regra desligada) |
| CA-16.3 | comando + estático | rodadas A, B e C (06-T17-engenheiro-frontend: 249 de 249 nas três); `vigia.test.ts` › "a configuração não desliga a CSP nem sobe retries" |
| CA-17.1 | estático | `test/estatico/projeto.test.ts` › "versão 0.2.0, privado, ESM …" |
| CA-17.2 | estático + revisão | `test/estatico/capturas.test.ts`; `capturas-qa.test.ts` (as nove, tamanho pelo nome, sem metadado, spec só lê); conferência visual na seção 6 |

### 4. Casos exploratórios sugeridos

Sessões curtas (30 a 45 min cada), com registro do que foi coberto. Prioridade: A (antes do PR ir ao ar), B (na UAT),
C (quando houver tempo).

| Id | Missão | Como | O que procurar | Prioridade | Origem |
|---|---|---|---|---|---|
| EX-01 | Burlar a exigência de documento na segunda aprovação pelo celular | Conta `administradora`, 390 px, `decisaoCelularDupla` com a A do CTO: Enter no campo de data, toque duplo no principal, alternar Devolver e Aprovar com o documento parcial, voltar do diálogo e trocar o campo | Envio sem identificador ou sem data; diálogo com ação diferente do botão ativado; POST em "Voltar" | A | RF-11, RF-12, CV-10 |
| EX-02 | Sair com o limite de taxa ativo | Conta `cto`; entrar e sair várias vezes seguidas, observar a resposta do pedido de saída e testar o cookie antigo em `/api/demandas` | Saída com 429 que leva a `/entrar` mas deixa a sessão válida (a 06-T13-testes viu 200 em vez de 401 no cookie antigo, 3 vezes, sob muitos logins) | A | 06-T13-testes, Pendências |
| EX-03 | Avisos da moldura nas duas larguras | Homologação com teto 0,01 e agente suspenso; abrir T03, T05 e T11 em 1280 e 390 px, com a gaveta aberta e fechada | Aviso sob a barra superior, coberto pelo rodapé da T11, ou fora da ordem de leitura; "Ver agentes e teto" com alvo menor que 44 px | B | CA-03.3 sem e2e |
| EX-04 | Gaveta com toque rápido e troca de largura | 390 px: tocar "Menu" e logo em seguida um item; abrir a gaveta e girar a tela ou alargar a janela para 1280 px | Toque nos 200 ms de entrada que cai no véu e fecha (06-T05-testes); gaveta presa aberta depois de 768 px; foco perdido | B | 06-T05-testes |
| EX-05 | Ordem de Tab da gaveta em 390 e 320 px | Teclado físico conectado ao celular ou emulação; Tab e Shift+Tab completos | Ordem marca → Fechar menu → itens → Sair; nenhum item cortado em 320 px | B | 06-T17-testes |
| EX-06 | Fila sem script | Desligar o JavaScript; abrir `/demandas?tipo=bug` | Contadores desabilitados para sempre (achado da 06-T09-testes); confirmar se o painel passa a exigir script ou se o contador deve filtrar | B | 06-T09-testes |
| EX-07 | Contadores e filtros combinados | Ativar contador, mudar "Mais filtros" sem "Filtrar", voltar com o botão Voltar do navegador, recarregar, colar URL com `status` repetido | Contador pressionado que não bate com a lista; número que não bate com o total da lista; perda do `status` no "Filtrar" | B | RF-05, D-02 |
| EX-08 | Leitor de tela na T03, T05 e T11 | VoiceOver (iOS) e NVDA (Windows) | Anúncio do contador ("Nova 19 demandas"), das etapas da fila, do `aria-current="step"`, do separador " · " do histórico, da troca do texto do principal ao marcar a opção | B | 06-T11 e 06-T12-testes |
| EX-09 | Zoom de 200 % e 400 % | Chrome no computador, T03, T05, T11 | Rolagem lateral; rodapé da T11 cobrindo o formulário; texto cortado nos contadores | B | 03, seção 10 |
| EX-10 | Dois "Mudar status" na T05 | Conferir o botão do cabeçalho e o link de "Nesta página" com leitor de tela | Dois controles com o mesmo nome e o mesmo destino; confusão de navegação (a 03 previa "Status" na navegação) | C | 06-T11-testes |
| EX-11 | Tela de erro de verdade e T02 em 320 px | Provocar falha de leitura em homologação (banco parado por instantes); T02 em 320 px com a chave de configuração longa | Marca, foco no `h1` e "Tentar de novo"; chave que estoura a largura | C | 06-T04-testes |
| EX-12 | T12 com interruptor | Conta `cto`: ligar e desligar um agente; conta `administradora`: interruptor desabilitado | Foco depois de ligar e de desligar; contraste do trilho ligado; aparência do desabilitado | C | 06-T15-tech-lead, Minor 3 |
| EX-13 | T04 com agente ligado | Ligar o agente orquestrador em homologação; abrir "Nova demanda" | Grupo "Como criar a demanda?" dentro de cartão, como no HTML testado | C | 06-T14-tech-lead, Minor 2 |
| EX-14 | Títulos e ids longos | `textoDeTerceiro` e um título de 200 caracteres sem espaço, em T03, T05 e T11, nas duas larguras | Texto que sai do cartão; U+202E invertendo o texto vizinho; id com reticência | C | CV-18 |
| EX-15 | Data no formato do navegador | T11 da administradora com o navegador em pt-BR e em en-US | Campo de data em "dd/mm/aaaa" no pt-BR; envio com a data certa nos dois | C | seção 5, QF-0015-03 |

Fica fora destas sessões: Safari de computador, Firefox, modo escuro, impressão e qualquer teste em produção.

### 5. Achados desta etapa

Nenhum bloqueia o PR. Evidência: as capturas versionadas na T17 (ambiente: ramo
`construcao/DEC-DEM-20261110-0015-v1`, `next start`, Chromium do Playwright, seed fictício de 11/11/2026).

**QF-0015-01 — Coluna "Idade" cortada na fila em 1280 px (divergência da 03, 4.2). Criticidade: baixa.**
- Passos: entrar com `cto`; abrir `/demandas` em 1280 × 720.
- Esperado (03, 4.2): a tabela cabe no computador; a rolagem dentro da região é só de 768 a 1199 px.
- Obtido (`t03-fila-1280.png`): a coluna "Idade" aparece cortada na borda direita ("Ida", "Ho", "11/"), e só aparece
  rolando a região da tabela. O id quebra em três linhas ("DEM-" / "20261111-" / "0023") e o selo "Pronta para
  decisão" em três.
- Impacto: a coluna nova do pedido fica escondida na largura de referência; a leitura da fila fica mais lenta. A
  informação continua acessível (região rolável com `tabindex="0"` e leitor de tela).
- Suspeitos: `src/app/(painel)/demandas/fila.tsx` (larguras das colunas, quebra do id); `src/components/Tabela.tsx`.
- Para: `ux-ui-design` decidir o ajuste (ex.: id sem quebra na tabela, coluna "Linha de serviço" mais estreita);
  `engenheiro-frontend` (T09) aplicar. Nenhum teste confere "sem rolagem da região em 1280 px": candidato a
  `qa-automacao`.

**QF-0015-02 — "N demandas encontradas." acima do título do resultado (divergência da 03, 4.2). Criticidade: baixa.**
- Passos: os mesmos do QF-0015-01, em 1280 e em 390 px.
- Esperado (03, 4.2): o título `h2` e, ao lado, o total.
- Obtido (`t03-fila-1280.png`, `t03-fila-390.png`): o total aparece numa linha acima do `h2`.
- Impacto: visual; o anúncio na região de aviso continua. Quem navega pelo foco cai no `h2` e passa do total.
- Para: `ux-ui-design` confirmar se aceita a ordem; `engenheiro-frontend` (T09).

**QF-0015-03 — Data da assinatura no formato americano na captura do manual. Criticidade: baixa (documentação).**
- Passos: abrir a T11 da `etapasDupla` com a conta `administradora` em 1280 × 720 no Chromium do Playwright.
- Obtido (`t11-decisao-1280.png`): o campo nativo mostra "mm/dd/yyyy", porque o navegador do e2e está em en-US. No
  Chrome em pt-BR o mesmo campo mostra "dd/mm/aaaa". Não é regressão (o campo é o da 0.1.13).
- Impacto: o manual em pt-BR mostra um formato que a pessoa não vai ver; pode induzir a digitar a data invertida.
- Para: `qa-automacao` e `engenheiro-frontend` avaliarem `locale: 'pt-BR'` e `timezoneId` no projeto do Playwright
  (ou só no spec das capturas) e regravar a captura; `documentacao-tecnica` saber da diferença.

**QF-0015-04 — Sessão que pode sobreviver ao "Sair" sob limite de taxa. Criticidade: a classificar (provável média).**
- Origem: 06-T13-testes, com repetição de 10 do `casca.spec.ts`: o cookie antigo recebeu 200 em vez de 401 depois do
  "Sair", 3 vezes. Não reproduzi (sem Bash nesta etapa).
- Hipótese: a saída recebe 429 do limite por IP, a tela vai a `/entrar` mesmo assim (comportamento de hoje, 03, 3.4) e a
  sessão fica válida.
- Impacto se confirmado: pessoa que sai num computador compartilhado acha que saiu e não saiu. Não é regressão deste
  pedido (fluxo "como hoje"), mas a casca nova é quem mostra o "Sair".
- Para: `seguranca-aplicacao` na 08 (reteste por EX-02); se confirmado, demanda própria, pois a correção mexe em
  `src/modules/acesso/`, congelado neste pedido.

### 6. Conferência das nove capturas (CA-17.2, pendência das 06-T17)

| Arquivo | Tela e largura conferidas | Dado pessoal real | Aderência à 03 |
|---|---|---|---|
| `t01-entrar-1280.png` | T01, 1280 × 720 | Não | Marca clara acima do cartão; campos e textos de hoje |
| `t01-entrar-390.png` | T01, 390 × 844 | Não | Idem |
| `t03-fila-1280.png` | T03, 1280 × 720 | Não ("Pessoa Ficticia CTO") | Casca, contadores em 5 colunas, "Todas" com visto; QF-0015-01 e 02 |
| `t03-fila-390.png` | T03, 390 × 844 | Não | Barra com "Menu", pílulas, "Mais filtros", cartão; QF-0015-02 |
| `t05-demanda-1280.png` | T05, 1280 × 720 | Não | Trilha, barra de 5 etapas com a 4 atual, Próxima ação marinho com o texto da 03, 5.5 |
| `t05-demanda-390.png` | T05, 390 × 844 | Não | Barra vertical; "Nesta página" com alvo alto; EX-10 |
| `t11-decisao-1280.png` | T11, 1280 × 720, administradora | Não | Repositório destino no cabeçalho; frase da opção fixada; documento "(obrigatório para aprovar)"; QF-0015-03 |
| `t11-decisao-390.png` | T11, 390 × 844, administradora | Não | "Voltar para a demanda", rodapé fixo com os três botões |
| `gaveta-aberta-390.png` | gaveta, 390 × 844 | Não | Marca, "Fechar menu", itens, conta e "Sair"; véu sobre a página |

Nomes que aparecem: só "Pessoa Ficticia …", títulos com "(fictício)" e o repositório fictício do seed.

### 7. Roteiro de aceite para Fabiano (UAT)

**Onde:** homologação com o seed fictício, ou execução local preparada pela `devops-sre` na 09. **Nunca** a produção:
os passos gravam decisões. **Com quê:** computador com Chrome em pt-BR e iPhone com Safari. **Contas:** `cto` e
`administradora` do seed (Fabiano usa as duas, uma de cada vez). **Duração estimada:** 40 a 60 minutos.

| # | Passo | Aceito quando | OK? |
|---|---|---|---|
| UAT-01 | No computador, entrar com `cto` | T01 com a marca WS e as cores da casa; depois do código, a fila | [ ] |
| UAT-02 | Na fila, olhar os contadores e clicar "Pronta para decisão"; clicar de novo | A lista só com esse status e o total certo; o segundo clique volta a "Todas" | [ ] |
| UAT-03 | Abrir a demanda "Etapas com uma de duas aprovações (fictício)" | Barra com Decisão em "1 de 2 aprovações"; cartão "Próxima ação" diz o que falta e que quem age é a administradora | [ ] |
| UAT-04 | Clicar "Abrir a decisão" e conferir a tela no computador | Repositório destino, nível de aprovação, aprovações, resumo, recomendação, opções e revisão à vista; documento marcado "(obrigatório para aprovar)" | [ ] |
| UAT-05 | Na demanda "Aprovar a opção B (fictício)" (nível CTO), marcar B, "Aprovar a opção B", conferir o diálogo e confirmar | Diálogo com a ação, o repositório e o nível; depois "Decisão registrada: Aprovada, opção B." | [ ] |
| UAT-06 | No iPhone (Safari), entrar com `administradora` e abrir a T11 da "Decisão no celular, dupla aprovação (fictício)" depois de o CTO aprovar a A | Frase da opção fixada, campos do documento, caixa de revisão (se houver) e rodapé com "Aprovar a opção A", "Devolver" e "Arquivar" | [ ] |
| UAT-07 | Ainda no iPhone, tocar "Aprovar a opção A" sem o documento; depois tocar no campo do identificador com o teclado aberto | Erros do identificador e da data; com o teclado aberto, o rodapé não cobre o campo nem a caixa de revisão; a área segura de baixo respeitada (P-05 do 01 / P-04 da 03) | [ ] |
| UAT-08 | Preencher `DOC-FICTICIO-1` e 11/11/2026, marcar a revisão, aprovar e confirmar | Diálogo abre e fecha bem no Safari; "Aprovação da administradora registrada. O pacote está aprovado." | [ ] |
| UAT-09 | No iPhone, abrir o "Menu", navegar para "Agentes e teto" e voltar | A gaveta abre, fecha e não deixa a página atrás rolar | [ ] |
| UAT-10 | Na fila do iPhone, rolar até o fim e abrir uma demanda pelo id | Cartões legíveis, sem rolagem para o lado; o id abre a demanda | [ ] |
| UAT-11 | Clicar "Sair" e tentar voltar pelo botão Voltar do navegador | Volta a `/entrar`; a fila não reabre sem entrar de novo (EX-02) | [ ] |

**Decisões que ficam com Fabiano** (registrar no relatório de UAT):
- P-01: quer a opção recomendada marcada ou com selo "Recomendada" na T11, como na C2? Hoje nenhuma vem marcada e a
  recomendação aparece em texto antes das opções. Mudar exige demanda nova (campo no DEC, migration); a
  `seguranca-aplicacao` é contra marcar por padrão.
- QF-0015-01: aceita a coluna "Idade" cortada em 1280 px nesta versão ou quer o ajuste antes de publicar?
- Publicação da 0.2.0 no ar, depois do PR com CI verde: só com a aprovação dele.

**Pendências de aceite já conhecidas** (não reprovam a UAT, ficam registradas): P-02 do bloco "WS" com o
`marketing-comunicacao`; caminho sem script dos contadores (EX-06); Safari só conferido na UAT, pois os e2e rodam só no
Chromium.

## Decisões tomadas

- Contei como cobertos, e não "sem cobertura", os oito critérios verificados por comando ou revisão de diff (CA-06.4,
  CA-11.7, CA-15.1, CA-15.2, CA-16.1, CA-16.2, CA-16.3, CA-17.2): o próprio 01 os define como `git diff`, contagem,
  rodada ou conferência; cada 06-*-testes os executou; e a 06-T07-testes registrou por que `git diff 198e97d` não vira
  teste (clone raso no CI).
- CA-03.3, CA-08.3 e CA-09.2 ficam cobertos só por unidade ou estático: o seed do e2e não tem agente suspenso, demanda
  encerrada nem agente rodando, e criá-los gastaria o limite C-36. Viraram EX-03, UAT e unidade, sem devolver.
- Não devolvi nenhum achado: QF-0015-01 a 03 são de aparência e documentação, sem perda de informação nem de regra; o
  QF-0015-04 não é regressão deste pedido e a correção toca superfície congelada.
- Os exploratórios A ficam com o que pode ferir regra de aprovação ou segurança (documento na segunda aprovação, sessão
  depois do "Sair"); o resto vai para a UAT ou para depois.
- O roteiro cita as demandas do seed pela chave e pelo título, não pelo id: o id muda a cada banco novo.
- A UAT só em homologação ou local, com as contas fictícias: os passos gravam decisões e a produção tem dado real.

## Pendências

- Para a 08 (maestro): repetir o G4 esperando só a exceção do `route-qa.test.ts` (06-T17-tech-lead, 2.1); fazer a
  contagem total de `expect(` do CA-16.1 contra 198e97d; considerar a rodada 1 da 06-T17-testes com 2 falhas
  intermitentes no parecer do RNF-12.
- Para a `seguranca-aplicacao` (08): EX-02 e QF-0015-04 (sessão depois do "Sair" sob 429).
- Para a `ux-ui-design` e o `engenheiro-frontend` (T09): QF-0015-01 e QF-0015-02.
- Para o `tech-lead`: decisão do caminho sem script dos contadores (06-T09-testes), já aberta.
- Candidatos a automação para a `qa-automacao`: (1) contagem total de `expect(` contra a main (CA-16.1); (2) "sem
  rolagem na região da tabela em 1280 px" (QF-0015-01); (3) `locale: 'pt-BR'` no Playwright e captura regravada
  (QF-0015-03); (4) o G4 como passo do CI com `fetch-depth` suficiente.
- Para Fabiano: executar a UAT da seção 7 e responder P-01, QF-0015-01 e a publicação.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (07) todo critério de aceite de 01 aparece no mapa
- [x] (07) nenhum critério ficou "sem cobertura"
- [x] (07) os dados de teste são fictícios
