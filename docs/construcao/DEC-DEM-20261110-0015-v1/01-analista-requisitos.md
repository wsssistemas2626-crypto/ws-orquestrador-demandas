---
pedido: DEC-DEM-20261110-0015-v1
etapa: 01-requisitos
agente: analista-requisitos
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, A1-mesa-de-controle-fila.html, A2-mesa-de-controle-demanda.html, C2-decisao-no-celular.html, 2026-10-09_manual_de_marca.md, docs/manual-tecnico/08-painel.md, docs/manual-tecnico/02-acesso-e-seguranca.md, docs/manual-tecnico/04-versoes-e-decisao.md, docs/manual-tecnico/03-demandas.md (RF-07), src/app/layout.tsx, src/app/globals.css, src/app/(painel)/layout.tsx, src/components/CabecalhoPainel.tsx, src/components/rotulos.ts, src/components/dados-da-decisao.ts, src/app/(painel)/demandas/page.tsx, src/app/(painel)/demandas/fila.tsx, src/app/(painel)/demandas/FiltrosFila.tsx, src/app/(painel)/demandas/[id]/page.tsx, src/app/(painel)/pacotes-decisao/[decId]/FormularioDecisao.tsx, src/modules/demandas/consultas.ts (tipos e listagem), src/proxy.ts (CSP), src/app/configurar-2fa/AssistenteDoisFatores.tsx (cores do QR), playwright.config.ts, e2e/axe-todas.spec.ts (lista de testes), package.json]
status: pronto
proximo: arquiteto-solucoes
devolvido_para: null
---

## Entrega

### 0. Contexto e regra de leitura

Demanda do tipo `melhoria` sobre a main 198e97d (0.1.13). Só a camada visual muda (ESP-DEM-20261110-0015-v1). Os
mockups A1, A2 e C2 são referência visual, com dados fictícios e estilos inline; **não** são código para copiar: eles
carregam Google Fonts e usam `style=` inline, o que a CSP do sistema (`default-src 'self'`, sem `style-src`) não aceita.

Numeração: RF-NN e RNF-NN deste documento são **deste pedido**. Requisito do sistema é citado pelo capítulo do manual
(ex.: "cap. 04, RF-13").

Larguras de referência para teste:

| Nome | Viewport | Origem |
|---|---|---|
| computador | 1280 × 720 | `devices['Desktop Chrome']` do Playwright, já usado hoje |
| celular | 390 × 844 | largura do C2 |
| ponto de quebra | 768 px | ESP: "abaixo de 768 px" vale para a gaveta, os cartões da fila e o layout C2 |

### 1. Glossário

| Termo | Significado neste pedido |
|---|---|
| Casca | Moldura comum das telas autenticadas: menu lateral marinho com a marca, os itens do painel, a conta e "Sair", os avisos da moldura e o `main` |
| Gaveta | O menu lateral abaixo de 768 px: fechado por padrão, aberto pelo botão "Menu" |
| Contador | Botão no topo da T03 com um status e o total de demandas nele; ativa ou limpa o filtro de status |
| Etapas (fila) | As três marcas ESP, RSK e DEC de cada demanda na T03: feita quando a demanda tem ao menos uma versão daquele tipo |
| Barra de etapas (T05) | As cinco etapas da demanda: Demanda, Especificação, Parecer de risco, Decisão, Pedido de Construção |
| Próxima ação | Cartão da T05 que diz o que falta e quem age. Só informa: não habilita nem desabilita nada |
| Idade | Dias de calendário entre a criação da demanda e hoje, no fuso do sistema (`src/lib/fuso`), pelo relógio injetado (`deps.relogio`) |
| DEC mais novo | O pacote de maior versão da demanda (cap. 04, A-01) |
| Aprovado vigente | O DEC aprovado de maior versão (cap. 04, Substituição) |
| Regra de exibição | Função pura que decide só texto e aparência a partir de dado já lido; não grava, não autoriza, não muda status |

### 2. Requisitos funcionais

#### RF-01. Tokens de marca num só lugar

Regra: cores, famílias tipográficas, raios e espaçamentos da marca ficam como variáveis CSS num só arquivo
(`src/app/globals.css`, bloco `@theme`). Componentes usam só os tokens. Paleta do manual: Marinho `#12385f`, Azul de
ação `#1a6ae0`, Azul de texto `#1354b4`, Azul claro `#7db0f5`, Tinta `#0f1620`, Tinta média `#4a5763`, Superfície
`#f6f8fa`, Azul névoa `#eaf1fd`, Linha `#dfe4ea`, Branco `#ffffff`, e os tons de estado (positivo, atenção, erro) do
manual. As cores de selo de status e de decisão (`COR_STATUS`, `COR_DECISAO`, selos fixos) também viram tokens. Uso
vetado pelo manual (§3.2) não aparece: `#1a6ae0` como texto sobre marinho, `#7db0f5` sobre `#1f4f86`, `#6b7885`
sobre `#f6f8fa`.

- **CA-01.1** Dado o código do ramo, quando se buscam cores hexadecimais em `src/**/*.tsx` e `src/**/*.ts` fora de
  `globals.css`, então a única ocorrência é o QR da T02 (`#ffffff` e `#000000` em `AssistenteDoisFatores.tsx`).
- **CA-01.2** Dado o código do ramo, quando se busca `style={` em `src/`, então não há ocorrência (hoje são zero).
- **CA-01.3** Dado o arquivo de tokens, quando se lê o bloco `@theme`, então cada cor da paleta acima tem uma variável
  com o valor exato do manual.

#### RF-02. Fontes Noto servidas pelo próprio app

Regra: Noto Sans (400, 600, 700, 800) e Noto Sans Mono (400, 600) saem da mesma origem do app, por `next/font/local`
ou por arquivos em `public/`. Nenhuma chamada ao Google Fonts nem a outra origem. Texto corrido em Noto Sans; id
(`DEM-…`, `ESP-…`, `RSK-…`, `DEC-…`), etiqueta e número de contador em Noto Sans Mono (manual §4). Fallback
`system-ui, sans-serif` e `ui-monospace, monospace`.

- **CA-02.1** Dado qualquer tela de T01 a T12, quando a página carrega no Playwright, então nenhuma requisição sai para
  origem diferente da do app (lista de requisições do navegador).
- **CA-02.2** Dado o `<body>` de qualquer tela, quando se lê o estilo computado, então `font-family` começa pela Noto
  Sans; e dado um id de demanda, então começa pela Noto Sans Mono.
- **CA-02.3** Dado o repositório, quando se procura `fonts.googleapis.com` ou `fonts.gstatic.com` em `src/`, `public/`
  e na configuração, então não há ocorrência.

#### RF-03. Casca da proposta A nas telas autenticadas (a partir de 768 px)

Regra: toda tela do grupo `(painel)` (T03 a T12, e o 404 do painel) usa a casca: menu lateral marinho com a marca, os
itens de hoje ("Demandas", "Nova demanda", "Agentes e teto", com `aria-current="page"` pela mesma regra de
`ehPaginaAtual`), a conta (nome e papel, como hoje) e "Sair". Continua tudo o que a moldura faz hoje: "Pular para o
conteúdo" como primeiro elemento focável; avisos de agentes suspensos (cap. 06, RF-18) e de capacidade de ids
(RNF-09 do sistema); foco no `h1` ao trocar de tela pelo painel e não na primeira carga; `main#conteudo`. A marca é o
bloco "WS" + "Orquestrador de Demandas" do A1, desenhado em HTML/CSS ou SVG no próprio bundle, como link para
`/demandas` com nome acessível "WS Orquestrador de Demandas". O monograma "W." do manual não é usado (ver Decisões).

- **CA-03.1** Dado uma pessoa com 2FA na T03, T05, T11 e T12 em 1280 px, quando a tela abre, então o menu lateral está
  visível, com os três itens, o item da tela em `aria-current="page"`, o nome e o papel da conta e o botão "Sair".
- **CA-03.2** Dado a T03 recém-carregada, quando a pessoa aperta Tab uma vez, então o foco está em "Pular para o
  conteúdo"; e quando aperta Enter, então o foco vai ao `main`.
- **CA-03.3** Dado o teto de agentes atingido (agentes suspensos) ou a capacidade de ids no limite do aviso, quando
  qualquer tela do painel abre, então o aviso aparece como na 0.1.13.
- **CA-03.4** Dado a T03 aberta, quando a pessoa clica em "Nova demanda" no menu, então o foco vai ao `h1` da T04.
- **CA-03.5** Dado a pessoa clicando em "Sair", então a sessão acaba e a tela vai para `/entrar`, como hoje.

#### RF-04. Gaveta do menu abaixo de 768 px

Regra: abaixo de 768 px o menu lateral some e aparece uma barra superior com a marca e o botão "Menu"
(`aria-expanded`, `aria-controls`). Aberta, a gaveta é modal: tem nome acessível, o foco vai para dentro dela, Tab e
Shift+Tab ficam presos nela, o conteúdo atrás não recebe foco nem leitura (inerte), Esc fecha, um botão "Fechar menu"
fecha, clicar num item navega e fecha; ao fechar sem navegar, o foco volta ao botão "Menu". A gaveta traz os mesmos
itens, a conta e "Sair". Com `prefers-reduced-motion`, sem animação.

- **CA-04.1** Dado a T03 em 390 px, quando a tela abre, então o menu lateral não aparece e o botão "Menu" tem
  `aria-expanded="false"`.
- **CA-04.2** Dado a T03 em 390 px, quando a pessoa ativa "Menu", então `aria-expanded="true"`, o foco está dentro da
  gaveta, e 20 Tabs seguidos nunca levam o foco para fora dela.
- **CA-04.3** Dado a gaveta aberta, quando a pessoa aperta Esc, então a gaveta fecha e o foco volta ao botão "Menu".
- **CA-04.4** Dado a gaveta aberta, quando a pessoa ativa "Agentes e teto", então a T12 abre, a gaveta está fechada e
  o foco está no `h1` da T12.
- **CA-04.5** Dado a gaveta aberta em 390 px, quando o axe roda, então não há violação.

#### RF-05. Contadores por status que filtram (T03)

Regra: no topo da T03, um grupo de contadores com nome acessível: "Todas" e um contador para cada um dos nove status
(`ROTULO_STATUS`, na ordem do fluxo). Cada contador mostra o rótulo e o total. O total conta as demandas daquele status
**com os filtros de tipo e de linha de serviço da URL aplicados** e ignorando o filtro de status; "Todas" conta todas com
esses mesmos filtros. Cada contador é um botão com `aria-pressed`: só o do status da URL fica `true` ("Todas" quando não
há status). Ativar um contador leva à URL `/demandas?status=<valor>` com os mesmos nomes de parâmetro de hoje
(`filtroDemandasSchema`), mantém `tipo` e `linhaServicoProvavel` da URL e volta à página 1 (sem `offset`). Ativar o
contador já pressionado, ou "Todas", tira o `status` da URL. Depois de filtrar, valem as regras de hoje: foco no
resultado (`ID_RESULTADO`) e "N demandas encontradas." na região de aviso. Filtro de status inválido na URL continua
mostrando o aviso de hoje e a lista sem filtro. O seletor de status do formulário pode sair; se ficar, mostra o mesmo
valor do contador pressionado. Tipo e linha de serviço continuam aplicados só pelo botão "Filtrar" (WCAG 3.2.2), e
"Limpar filtros" continua.

- **CA-05.1** Dado 3 demandas `nova` e 2 `pronta_para_decisao` no seed, sem filtro na URL, quando a T03 abre, então
  "Nova" mostra 3, "Pronta para decisão" mostra 2, "Todas" mostra o total e só "Todas" tem `aria-pressed="true"`.
- **CA-05.2** Dado a T03 sem filtro, quando a pessoa ativa "Pronta para decisão", então a URL fica
  `/demandas?status=pronta_para_decisao`, a lista mostra só esse status, o contador fica `aria-pressed="true"`, o foco
  vai ao resultado e a região de aviso diz "2 demandas encontradas.".
- **CA-05.3** Dado a URL `/demandas?status=nova&tipo=bug&offset=20`, quando a pessoa ativa "Em análise", então a URL
  fica com `status=em_analise` e `tipo=bug`, sem `offset`.
- **CA-05.4** Dado a URL com `tipo=bug`, quando a T03 abre, então cada contador conta só demandas do tipo bug.
- **CA-05.5** Dado o contador "Nova" pressionado, quando a pessoa o ativa de novo, então o `status` sai da URL e
  "Todas" fica pressionado.
- **CA-05.6** Dado só teclado, quando a pessoa chega a um contador por Tab e aperta Enter ou Espaço, então o filtro se
  aplica como no clique.
- **CA-05.7** Dado `?status=xyz`, quando a T03 abre, então aparece "Algum filtro do endereço não é válido. Mostrando
  todas as demandas." e "Todas" fica pressionado.

#### RF-06. Tabela densa da fila (T03, a partir de 768 px)

Regra: a tabela tem as colunas Id (link em fonte mono para a T05), Título (com o selo "Rascunho de agente" quando vale),
Tipo, Status (selo), Etapas, Urgência, Linha de serviço e Idade. Etapas: três marcas ESP, RSK e DEC; cada uma feita
quando a demanda tem ao menos uma versão daquele tipo, com diferença de forma além da cor (preenchida x tracejada) e um
texto acessível no formato "Etapas: ESP feita, RSK feita, DEC por fazer". Idade: "Hoje", "1 dia" ou "N dias", com
`<time dateTime>` da criação e a data "criada em dd/mm/aaaa" disponível como texto (visível ou só para leitor de tela,
nunca só em `title`). Ficam como hoje: a legenda da tabela ("Demandas …, da mais nova para a mais antiga"), a
ordenação, 20 por página, a paginação Anterior/Próxima com o número da página, os estados vazio, vazio com filtro, erro
com "Tentar de novo" e carregando, as "entradas que aguardam o agente" e os alertas `aviso=2fa-ativado` e
`aviso=entrada-enviada`. O dado das etapas vem de leitura só de consulta (SELECT) feita para a página, sem mudar
`DemandaResumo` nem a resposta de `GET /api/demandas` (RF-15).

- **CA-06.1** Dado uma demanda com ESP e RSK e sem DEC, quando a T03 abre em 1280 px, então a linha mostra ESP e RSK
  feitas e DEC por fazer, e o nome acessível da célula é "Etapas: ESP feita, RSK feita, DEC por fazer".
- **CA-06.2** Dado o relógio injetado em 10/11/2026 e demandas criadas em 10/11, 09/11 e 07/11/2026, quando a T03
  abre, então a coluna Idade mostra "Hoje", "1 dia" e "3 dias", e cada célula tem `<time dateTime>` com a data de
  criação.
- **CA-06.3** Dado a T03 com 25 demandas, quando a pessoa ativa "Próxima", então aparecem as 5 restantes e o foco vai
  ao resultado, como hoje.
- **CA-06.4** Dado `GET /api/demandas` com token de agente e com sessão de pessoa, quando se compara a resposta com a da
  0.1.13 para o mesmo seed, então os campos são os mesmos.

#### RF-07. Fila em lista de cartões abaixo de 768 px

Regra: abaixo de 768 px a tabela vira uma lista (`ul`/`li`) de cartões, um por demanda, com os mesmos dados e textos
acessíveis da linha (RF-06). O id é o link para a T05; o cartão inteiro não vira um link sem nome. O alvo de foco do
resultado e a legenda existem também na lista. Em cada largura só uma das duas formas fica exposta à tecnologia
assistiva (a outra com `display: none`). Sem rolagem horizontal da página em 390 px nem em 320 px.

- **CA-07.1** Dado a T03 em 390 px com 8 demandas, quando a tela abre, então não há `table` visível, há uma lista com 8
  itens, e cada item tem id, título, tipo, status, etapas, urgência, linha de serviço e idade.
- **CA-07.2** Dado a T03 em 390 px, quando a pessoa ativa um contador, então o foco vai ao resultado da lista e a
  região de aviso anuncia o total.
- **CA-07.3** Dado a T03 em 320 px, quando se mede `document.documentElement.scrollWidth`, então ele não passa da
  largura da janela.
- **CA-07.4** Dado a T03 em 1280 px, quando a tela abre, então a tabela está visível e a lista de cartões não está na
  árvore de acessibilidade.

#### RF-08. Barra das cinco etapas (T05)

Regra de exibição: uma lista ordenada com nome acessível "Etapas da demanda" e cinco itens; cada item tem o nome, o id
da versão mais nova (ou "Nenhuma") e um estado de uma lista fechada:

| Etapa | Estados, na ordem de conferência (vale o primeiro) |
|---|---|
| 1 Demanda | "Registrada" (sempre) |
| 2 Especificação | sem ESP: "Por fazer"; ESP mais nova com dúvidas em aberto: "Com dúvidas em aberto"; senão "Feita" |
| 3 Parecer de risco | sem RSK: "Por fazer"; senão "Feito" |
| 4 Decisão | sem DEC: "Por fazer"; DEC mais novo pendente e desatualizado: "Desatualizado"; pendente com 1 de 2 aprovações: "1 de 2 aprovações"; pendente: "Decisão pendente"; aprovado: "Aprovada, opção X"; devolvido: "Devolvida"; arquivado: "Arquivada" |
| 5 Pedido de Construção | há `pedido_gerado` no histórico para o aprovado vigente: "Gerado"; há aprovado vigente: "Ainda não gerado"; senão "Depois da aprovação" |

A etapa atual é a primeira, de 2 a 5, que não está em "Feita", "Feito", "Aprovada, opção X" ou "Gerado"; ela recebe
`aria-current="step"`. Demanda em status final (`entregue`, `encerrada`) não tem etapa atual. Feito, atual e por fazer
diferem por forma além da cor. Dados: `DemandaVista`, a ESP mais nova (já lida hoje), o histórico (já lido hoje) e,
para "1 de 2 aprovações", as aprovações do DEC mais novo pela leitura de DEC existente, com `ler_pacote_decisao`.

- **CA-08.1** Dado uma demanda com ESP v2 sem dúvidas, RSK v1 e DEC v1 `cto_e_administradora` com só a aprovação do
  CTO, quando a T05 abre, então os estados são "Registrada", "Feita", "Feito", "1 de 2 aprovações" e "Depois da
  aprovação", e a etapa 4 tem `aria-current="step"`.
- **CA-08.2** Dado uma demanda sem ESP, quando a T05 abre, então a etapa 2 é "Por fazer", com id "Nenhuma", e é a
  atual.
- **CA-08.3** Dado uma demanda `encerrada`, quando a T05 abre, então nenhuma etapa tem `aria-current`.
- **CA-08.4** Dado a função de regra de exibição, quando o teste de unidade passa cada linha da tabela acima, então o
  estado devolvido é o da tabela.

#### RF-09. Cartão "Próxima ação" (T05)

Regra de exibição: o cartão tem o título "Próxima ação", o que falta, quem age e, quando houver, um link para a tela
onde se age. Vale a primeira linha que casar:

| # | Condição | O que falta | Quem age | Link |
|---|---|---|---|---|
| 1 | status `entregue` ou `encerrada` | Nada: a demanda está em <status> | Ninguém | — |
| 2 | há agente pendente ou em andamento | <agente> está trabalhando nesta demanda | o agente | — |
| 3 | status `aguardando_informacao` | Responder às dúvidas em aberto e voltar a demanda para Em análise | Uma pessoa (CTO ou administradora) | seção de dúvidas |
| 4 | sem ESP | Escrever a especificação técnica | Agente de insumo técnico ou uma pessoa | T07 |
| 5 | sem RSK | Escrever o parecer de risco | Agente de risco ou uma pessoa | T08 |
| 6 | sem DEC, ou DEC mais novo devolvido | Montar o pacote de decisão | Agente de consolidação ou uma pessoa | T09 |
| 7 | DEC mais novo pendente e desatualizado | Criar um pacote novo: o atual está desatualizado | Uma pessoa | T09 |
| 8 | DEC mais novo pendente | Decidir entre as opções A e B | nível `cto`: CTO; dupla sem aprovação: CTO e administradora; dupla com uma: o papel que falta | T11 do DEC mais novo |
| 9 | status `pronta_para_decisao` e há aprovado vigente | Mudar o status para Aprovada e gerar o Pedido de Construção | Uma pessoa (CTO ou administradora) | T11 do vigente |
| 10 | status `aprovada` | Gerar o Pedido de Construção e, ao começar a construção, mudar para Em construção | Uma pessoa (CTO ou administradora) | T11 do vigente |
| 11 | status `em_construcao` | Acompanhar a construção; ao terminar, mudar para Entregue ou Devolvida | Uma pessoa (CTO ou administradora) | seção Status |
| 12 | status `devolvida` | Rever o motivo e voltar a demanda para Em construção ou Em análise | Uma pessoa (CTO ou administradora) | seção Status |
| 13 | qualquer outro caso | Acompanhar a demanda | — | — |

O cartão não habilita, desabilita nem esconde nenhum controle: as regras continuam no servidor e nas telas de destino.
Os textos são proposta para a `ux-ui-design` revisar; as condições e a ordem, não.

- **CA-09.1** Dado uma demanda `pronta_para_decisao` com DEC `cto_e_administradora` e só a aprovação do CTO, quando a
  T05 abre, então o cartão diz "Decidir entre as opções A e B", quem age "Administradora" e tem o link para a T11 do DEC.
- **CA-09.2** Dado uma demanda `aguardando_informacao` com execução do agente de insumo técnico pendente, quando a T05
  abre, então vale a linha 2, e não a 3.
- **CA-09.3** Dado a função de regra de exibição, quando o teste de unidade passa um caso por linha da tabela, então o
  resultado é o da linha, e a ordem de prioridade é a da tabela.
- **CA-09.4** Dado o código do ramo, quando se procura o uso da função do cartão, então ela só é chamada por página e
  não por Server Action, rota ou módulo de regra.

#### RF-10. Detalhe da demanda no layout A2 (T05), sem perder nada

Regra: a T05 ganha o arranjo da A2 (cabeçalho com id, selos e título; barra de etapas; coluna principal com Dados e
Versões; coluna lateral com Próxima ação e Histórico em 1280 px; uma coluna só abaixo de 768 px). Continua tudo o que a
T05 tem hoje, na mesma condição: selos de status, rascunho, desatualizado e substituído; "Editar dados"; a navegação
"Nesta página" com as seções e os `h2` focáveis; alertas de chegada e de topo; dúvidas em aberto; versões de ESP, RSK e
DEC com "Nova ESP", "Novo RSK" e "Novo DEC" nas mesmas condições, e o texto do que falta para o pacote; Mudar status;
Texto recebido com a data do expurgo; Histórico **completo** (sem corte nem "Ver histórico completo"); aviso de agente
trabalhando.

- **CA-10.1** Dado a T05 de uma demanda com versões, quando a tela abre em 1280 px e em 390 px, então existem as
  seções Dados, Versões, Status, Texto recebido e Histórico, e cada link de "Nesta página" leva o foco ao `h2` da seção.
- **CA-10.2** Dado uma demanda com 30 eventos, quando a T05 abre, então o Histórico mostra os 30.
- **CA-10.3** Dado os e2e de hoje da T05 (`detalhe-demanda.spec.ts`, `decisao.spec.ts`, `pedido-construcao.spec.ts`),
  quando rodam no ramo, então passam com mudança só de seletor ou de texto.

#### RF-11. Decisão (T11) por botões de ação, nas duas larguras

Regra: o grupo de rádio "Decisão" mais "Registrar decisão" dá lugar a três botões de ação: o principal, "Aprovar a
opção X" (X é a opção marcada ou a fixada pela primeira aprovação; sem opção marcada, "Aprovar"), e "Devolver" e
"Arquivar". O formulário continua um só no DOM, com os mesmos campos, valores e funções de hoje (`valoresDaDecisao`,
`validarDecisao`, `entradaDaDecisao`, `errosDaApiDecisao`, `textoDoDialogo`, quem vê o formulário); o botão só define
`statusDecisao` e envia. Tudo o que vale hoje continua:

- o diálogo de confirmação (C-14) antes de registrar, com a ação, o repositório destino e o nível de aprovação;
- "Aprovar" indisponível e explicado em texto visível quando o pacote está desatualizado (CA-12.4 do sistema), com
  "Devolver" e "Arquivar" disponíveis;
- a consequência de cada ação em texto associado ao botão (`aria-describedby`): "a demanda volta para Em análise" e
  "a demanda vai para Encerrada";
- na segunda aprovação, a frase da opção fixada no lugar das opções (`TEXTOS_DECISAO.fixada`);
- o documento assinado (identificador e data) quando `pedeDocumento`, obrigatório para aprovar; com os botões ele fica
  visível desde o início e o rótulo diz que é obrigatório para aprovar;
- a caixa "Revisei os rascunhos de agente citados neste pacote" quando `exigeRevisao`, obrigatória nas três ações;
- "Comentários (opcional)";
- resumo de erros, alerta de envio com foco, alerta de resultado, aviso de saída com dado não salvo;
- as seções de revisão (destino, critérios, definição de pronto, níveis de risco, nível de aprovação), as opções com
  descrição, vantagens, desvantagens e quando escolher, a recomendação, as aprovações, os alertas de desatualizado,
  rascunho de agente e substituído, a seção do Pedido de Construção com a caixa de confirmação sem dado pessoal, e o
  lembrete de P1-d.

Em 1280 px, a T11 usa a casca e a linguagem visual de A1 e A2; não há mockup A da T11, e o arranjo fica com a
`ux-ui-design` dentro desta regra.

- **CA-11.1** Dado um DEC nível `cto` pendente e a conta `cto`, quando a pessoa marca a opção B e ativa "Aprovar a
  opção B", então abre o diálogo com "Aprovar a opção B.", o repositório destino e o nível; e ao confirmar, a decisão é
  gravada como na 0.1.13 e aparece "Decisão registrada: Aprovada, opção B.".
- **CA-11.2** Dado o mesmo DEC sem opção marcada, quando a pessoa ativa "Aprovar", então nada é enviado, o resumo de
  erros mostra "Escolha a opção A ou a opção B." e o diálogo não abre.
- **CA-11.3** Dado um DEC desatualizado, quando a T11 abre, então "Aprovar" está indisponível com o texto
  "Indisponível: pacote desatualizado." visível, e "Devolver" e "Arquivar" funcionam.
- **CA-11.4** Dado um DEC que cita rascunho de agente, quando a pessoa ativa "Devolver" sem marcar a caixa de revisão,
  então aparece "Marque que revisou os rascunhos de agente para registrar a decisão." e nada é enviado.
- **CA-11.5** Dado a conta administradora num DEC `cto_e_administradora` sem aprovação, quando ela marca a opção A e
  ativa "Aprovar a opção A" sem o documento, então aparecem os erros do identificador e da data e nada é enviado.
- **CA-11.6** Dado a conta administradora com o documento preenchido, quando ela ativa "Devolver", então a entrada
  enviada não tem `referenciaDocumento` nem `dataDocumento` (como `entradaDaDecisao` faz hoje).
- **CA-11.7** Dado o teste de unidade de `dados-da-decisao.ts`, quando roda no ramo, então nenhuma asserção de regra
  mudou; só textos de rótulo podem ter mudado.

#### RF-12. Decisão abaixo de 768 px no layout C2

Regra: abaixo de 768 px a T11 segue a C2, sobre a regra do RF-11: no topo, o link de volta para a demanda e o selo da
decisão; o id do DEC em mono; o título; a linha das aprovações já registradas (ex.: "O CTO aprovou a opção A"); o
resumo executivo; as opções como rádios grandes, com área de toque do cartão inteiro de pelo menos 44 px de altura; a
recomendação do pacote em texto visível logo antes ou logo depois das opções, com o rótulo de hoje ("Recomendação" ou
"Recomendação do agente de consolidação"); vantagens, desvantagens, quando escolher e as seções de revisão podem ficar
recolhidas num controle de abrir e fechar acessível, mas o nível de aprovação, o repositório destino e todos os alertas
(desatualizado, rascunho de agente, substituído) ficam visíveis sem abrir nada; o documento assinado e a caixa de
revisão nas mesmas condições do RF-11; "Comentários (opcional)"; e o rodapé fixo com o botão principal e, abaixo, "Devolver"
e "Arquivar". O rodapé fixo só existe enquanto há formulário de decisão; nunca cobre o elemento com foco (rolagem com
folga do tamanho do rodapé) e tem no máximo 160 px de altura em 390 × 844. Nenhuma opção vem marcada ao abrir (ver
Decisões).

- **CA-12.1** Dado a conta administradora em 390 px num DEC dupla com a aprovação do CTO na opção A e rascunho de agente
  citado, quando a T11 abre, então estão visíveis sem rolagem lateral: a frase da opção fixada, os campos do
  identificador e da data do documento, a caixa de revisão e o rodapé com "Aprovar a opção A", "Devolver" e "Arquivar".
- **CA-12.2** Dado esse estado, quando a administradora preenche o documento, marca a revisão e ativa "Aprovar a opção
  A", então abre o diálogo de confirmação; e ao confirmar, aparece "Aprovação da administradora registrada. O pacote
  está aprovado.".
- **CA-12.3** Dado a T11 em 390 × 844, quando o foco vai por Tab do primeiro ao último campo, então o retângulo de cada
  elemento focado nunca fica sob o rodapé fixo nem sob a barra superior.
- **CA-12.4** Dado a T11 em 390 × 844, quando se mede o rodapé, então ele tem até 160 px de altura, e cada um dos três
  botões tem pelo menos 44 × 44 px.
- **CA-12.5** Dado um DEC já decidido, quando a T11 abre em 390 px, então não há rodapé fixo e aparece "Decisão
  registrada: …" como hoje.
- **CA-12.6** Dado um DEC desatualizado em 390 px, quando a T11 abre, então o alerta de desatualizado está visível sem
  abrir nenhum controle e o botão principal está indisponível com o texto da explicação visível.

#### RF-13. Entrar (T01), 2FA (T02), sem permissão, erro e 404 com a marca

Regra: T01, T02, `/sem-permissao`, a tela de erro (`src/app/error.tsx`) e o 404 da raiz ganham a marca, as cores e as
fontes, sem a casca (não há menu para quem ainda não entrou). Fluxo, campos, textos de regra, mensagens de erro,
bloqueios e redirecionamentos não mudam. O QR da T02 continua preto sobre branco, com a mesma geração (`src/lib/qr.ts`).

- **CA-13.1** Dado os e2e `entrar.spec.ts`, `configurar-2fa.spec.ts` e `autenticacao-qa.spec.ts`, quando rodam no
  ramo, então passam com mudança só de seletor ou de texto.
- **CA-13.2** Dado a T02 no passo 1, quando a tela abre, então o QR tem fundo `#ffffff` e módulos `#000000`.
- **CA-13.3** Dado a T01 em 1280 px e em 390 px, quando o axe roda vazio, com erro e no passo 2, então não há violação.

#### RF-14. Demais telas recebem a casca e os tokens, sem mudar conteúdo

Regra: T04, T06, T07, T08, T09, T10 e T12 recebem a casca e os tokens. Campos, ordem, textos de regra, validações,
diálogos e condições de exibição não mudam.

- **CA-14.1** Dado os e2e de T04, T06 a T10 e T12 de hoje, quando rodam no ramo, então passam com mudança só de
  seletor ou de texto.
- **CA-14.2** Dado cada uma dessas telas em 390 px, quando se mede a página, então não há rolagem horizontal fora das
  regiões de tabela que já rolam hoje.

#### RF-15. Superfícies que não mudam

Regra: nada muda em regra de negócio, rota de API, Server Action, esquema, migration, papel, permissão ou controle de
segurança (2FA, papéis, dupla aprovação, revisão de rascunhos, CSP, C-10, C-13, C-21, C-23, C-28, A-03, C-36). Leitura
nova para a página (contadores e etapas da fila) é permitida só como função nova de consulta (SELECT) em
`src/modules/`, chamada por página depois do `autorizar` que a página já faz, sem alterar função, tipo ou resposta que já
existe.

- **CA-15.1** Dado `git diff 198e97d` no ramo, quando se filtra por `src/app/api/`, `src/db/`, `drizzle/`,
  `src/modules/acesso/`, `src/proxy.ts`, `src/worker/`, `src/jobs/`, `src/agents/`, `src/lib/auth*`, `src/lib/qr.ts` e
  os nove arquivos com `'use server'`, então o diff é vazio.
- **CA-15.2** Dado `git diff 198e97d -- src/modules/`, quando se lê, então só há arquivos ou funções novas de leitura,
  sem linha removida ou alterada em função existente, e sem `insert`, `update`, `delete` nem DDL.
- **CA-15.3** Dado `src/proxy.test.ts`, quando roda no ramo, então a asserção da CSP é a mesma da 0.1.13 e passa.
- **CA-15.4** Dado as suítes `seguranca.spec.ts`, `seguranca-qa.spec.ts` e os testes de unidade e integração de
  `src/modules/`, quando rodam no ramo, então passam sem mudança.

#### RF-16. Testes atualizados sem apagar regra, e testes novos

Regra: teste que já existe só muda seletor ou texto; a regra testada fica. Testes novos: axe nas duas larguras para
todos os estados que `axe-todas.spec.ts` já cobre de T01 a T12, mais a gaveta aberta em 390 px e os estados da T11 em
390 px (pendente com rascunho, dupla com opção fixada, desatualizado, com resumo de erros e com o diálogo aberto); e2e da
aprovação em 390 px (CA-12.1 e CA-12.2, mais a aprovação do CTO num DEC nível `cto`); e2e dos contadores (CA-05.2,
CA-05.3, CA-05.5) e da gaveta (CA-04.2 a CA-04.4); testes de unidade das regras de exibição do RF-08 e do RF-09; teste
que confere que nenhuma requisição sai para outra origem (CA-02.1). A verificação do axe continua só em `semViolacoes`
(`e2e/apoio.ts`), sem regra desligada (`test/estatico/decisao-e2e.test.ts` continua valendo).

- **CA-16.1** Dado `e2e/` e `src/**/*.test.ts` no ramo e na main 198e97d, quando se contam as chamadas `expect(`, então
  o ramo não tem menos que a main.
- **CA-16.2** Dado o diff dos testes que já existiam, quando se lê cada trecho alterado, então só mudou seletor, texto
  literal ou o passo de interação equivalente (ex.: marcar o rádio "Aprovar" e clicar "Registrar decisão" vira ativar
  "Aprovar a opção A").
- **CA-16.3** Dado `pnpm test:e2e` três vezes seguidas, quando roda, então as três passam, sem aumentar `retries` nem
  tempo-limite da configuração.

#### RF-17. Versão, CHANGELOG, manual e capturas

Regra: `package.json` em 0.2.0; `CHANGELOG.md` com a 0.2.0 (o que mudou, o que ficou fora e as pendências); manual cap.
08 com a casca, a gaveta, os contadores, a barra de etapas, a próxima ação e a T11 nas duas larguras, e as regras de
exibição do RF-08 e do RF-09; capturas PNG versionadas no repositório, com dados fictícios do seed, de T01, T03, T05 e
T11 (pendente) em 1280 × 720 e em 390 × 844, mais a gaveta aberta em 390 px (nove arquivos no mínimo), citadas no
manual.

- **CA-17.1** Dado o ramo, quando se lê `package.json`, então `"version": "0.2.0"`.
- **CA-17.2** Dado o ramo, quando se procuram as capturas, então existem as nove, com nome que diz a tela e a largura, e
  nenhuma mostra dado pessoal real.

### 3. Requisitos não funcionais

| Id | Requisito | Número | Como se verifica |
|---|---|---|---|
| RNF-01 | Contraste de texto (regra da casa, manual §3.2, mais rígida que o AA) | ≥ 4,5:1 em qualquer tamanho | axe `color-contrast` nas duas larguras e teste de unidade que calcula a razão de cada par texto/fundo declarado nos tokens |
| RNF-02 | Contraste de elemento não textual (borda de campo, ícone que informa, marca de etapa, indicador de foco) | ≥ 3:1 contra o fundo adjacente, no claro e no marinho | o mesmo teste de unidade dos pares |
| RNF-03 | Alvo de toque | ≥ 44 × 44 px abaixo de 768 px em todo controle, menos link dentro de frase; ≥ 24 × 24 px a partir de 768 px (WCAG 2.5.8) | e2e mede o retângulo dos controles de T03, T05, T11 e da gaveta em 390 px |
| RNF-04 | Foco visível e não encoberto | contorno ≥ 2 px; nunca sob barra superior ou rodapé fixo (WCAG 2.4.7, 2.4.11) | CA-12.3 e o mesmo teste na T03 em 390 px |
| RNF-05 | Reflow | 0 px de rolagem horizontal da página em 320 px e 390 px, fora de região de tabela que já rola hoje | CA-07.3 e CA-14.2 |
| RNF-06 | Fontes | só `woff2`; até 6 arquivos (Sans 400/600/700/800, Mono 400/600); soma ≤ 300 KB; subconjunto que cobre o pt-BR; `font-display: swap`; `OFL.txt` junto dos arquivos | conferência dos arquivos no repositório na revisão |
| RNF-07 | Recurso externo | 0 requisições a outra origem em todos os e2e | CA-02.1 |
| RNF-08 | CSP e cabeçalhos de segurança | idênticos aos da 0.1.13, sem domínio novo | CA-15.3 e `seguranca.spec.ts` |
| RNF-09 | Custo da fila | no máximo 2 consultas a mais por carga de `/demandas` que na 0.1.13, qualquer que seja o número de linhas (sem N+1) | teste de integração com Testcontainers que conta as consultas com 20 e com 100 demandas no seed |
| RNF-10 | Dependências | 0 dependências novas de interface em tempo de execução; só o pacote de fonte, se o `arquiteto-solucoes` escolher esse caminho por ADR | diff de `package.json` |
| RNF-11 | Movimento | transição ≤ 200 ms; 0 animação com `prefers-reduced-motion` | regra de hoje em `globals.css` mantida; e2e da gaveta com `reducedMotion: 'reduce'` |
| RNF-12 | Estabilidade da suíte | 3 execuções seguidas verdes de `pnpm test:e2e`, sem aumento de `retries` ou tempo-limite | CA-16.3 |
| RNF-13 | Acessibilidade | 0 violação do axe (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`) em T01 a T12, em 1280 × 720 e 390 × 844 | RF-16 |
| RNF-14 | Dados | 0 dado pessoal real em seed, teste, captura, CHANGELOG ou manual (JUR-2026-002, 7.4) | revisão do diff e das capturas |

### 4. Fora do escopo

- Busca por título ou id na fila (o campo do A1): exige parâmetro novo no `filtroDemandasSchema` e na API.
- Item "Decisões pendentes" no menu, com contador (A1 e A2): não existe tela própria; o contador "Pronta para decisão"
  da T03 cobre o atalho.
- Subtítulos dos contadores do A1 ("1 rascunho de agente", "mais antiga: 3 dias", "falta a administradora em 1"):
  exigem agregações novas.
- "Ver histórico completo" com histórico cortado (A2): a T05 continua com o histórico inteiro.
- Selo "Recomendada" e opção recomendada marcada ao abrir a T11 (C2): a recomendação do DEC é texto livre; marcar uma
  opção exigiria campo estruturado no esquema (ver Pendências).
- Caixa de decisões da proposta C (C1) e o restante das propostas B e C.
- Modo escuro.
- E-mail E01 (aviso de pacote pronto).
- Revisão dos textos pendentes da `ux-ui-design` listados no cap. 08 (QF-01 a QF-04, D-01 a D-06, 409 em status final,
  textos de 0.1.10 a 0.1.13) e os três avisos que a T11 ainda não mostra, salvo o texto que mudar por causa do layout.
- Monograma "W." e qualquer arquivo de logotipo oficial.
- Publicação em produção, serviço no Easypanel e configuração de produção: ações de Fabiano depois do PR.

### 5. Matriz de rastreabilidade

| Critério preliminar do pedido | RF | RNF | Critérios de aceite |
|---|---|---|---|
| CP-1 Todas as telas autenticadas usam a casca da proposta A, com as cores e as fontes do manual de marca | RF-01, RF-02, RF-03, RF-04, RF-10, RF-11, RF-14 | RNF-01, RNF-02, RNF-06 | CA-01.1 a CA-01.3, CA-02.2, CA-03.1 a CA-03.5, CA-04.1 a CA-04.5, CA-14.1 |
| CP-2 A fila tem os contadores que filtram e vira lista de cartões abaixo de 768 px | RF-05, RF-06, RF-07 | RNF-03, RNF-05, RNF-09 | CA-05.1 a CA-05.7, CA-06.1 a CA-06.4, CA-07.1 a CA-07.4 |
| CP-3 A decisão em 390 px segue a C2, com todas as exigências de hoje visíveis e obrigatórias | RF-11, RF-12 | RNF-03, RNF-04 | CA-11.1 a CA-11.7, CA-12.1 a CA-12.6 |
| CP-4 Nenhuma rota, action, esquema, migration ou regra muda; nenhum controle de segurança é afrouxado | RF-15, RF-08, RF-09 (só exibição), RF-13 | RNF-08 | CA-15.1 a CA-15.4, CA-09.4, CA-06.4, CA-11.7 |
| CP-5 Fontes servidas pelo próprio app; a CSP não ganha domínio externo | RF-02, RF-15 | RNF-06, RNF-07, RNF-08 | CA-02.1, CA-02.3, CA-15.3 |
| CP-6 axe sem violação em T01 a T12 no computador e em 390 px | RF-16, RF-13, RF-04 | RNF-01, RNF-02, RNF-13 | CA-04.5, CA-13.3, RF-16 (lista de estados) |
| CP-7 A suíte e2e passa três vezes seguidas, com o e2e novo da aprovação em 390 px | RF-16, RF-12 | RNF-12 | CA-16.1 a CA-16.3, CA-12.1, CA-12.2 |

Definição de pronto do pedido: `pnpm test`, `pnpm lint` e `pnpm typecheck` (RF-16); e2e três vezes (RNF-12); capturas
e CHANGELOG 0.2.0 (RF-17); PR com CI verde (maestro, etapa 09).

## Decisões tomadas

- Ações da T11 por três botões nas duas larguras, num formulário só: duas interações por largura exigiriam dois
  formulários no DOM ou estado por media query, com ids duplicados e risco de envio do formulário escondido; o envio e
  as funções de regra continuam os de hoje.
- Opção recomendada não vem marcada nem com selo: `recomendacao` é texto livre, e deduzir a opção dele seria regra nova
  escondida na interface, o que a ESP proíbe ("os campos e validações são os de hoje"); a recomendação fica visível ao
  lado das opções.
- Documento assinado visível desde o início na T11 quando `pedeDocumento`, com rótulo "obrigatório para aprovar":
  sem o rádio "Aprovar" não há estado prévio para mostrá-lo, e `validarDecisao` e `entradaDaDecisao` já o tratam só na
  aprovação.
- Contadores para os nove status mais "Todas": cada filtro de status de hoje continua alcançável sem depender do
  seletor; o A1 mostra cinco, mas tirar os outros quatro seria perder função.
- Contadores com os filtros de tipo e linha aplicados e sem o de status: é o único jeito de o número bater com a
  lista que o clique mostra.
- Coluna "Linha de serviço" mantida, embora a ESP não a liste: está no A1 e na 0.1.13, e nada pede para tirá-la;
  "Criada em" vira "Idade", com a data ainda acessível.
- Dados de etapas e contadores por função nova só de leitura em `src/modules/`: mudar `DemandaResumo` mudaria a
  resposta de `GET /api/demandas`, que a ESP congela.
- Barra de etapas e Próxima ação definidas como tabelas de regra de exibição fechadas: sem isso, cada engenheiro
  inventaria uma regra, e a revisão não teria como conferir que nada de regra de negócio entrou.
- Marca da casca no formato do A1 (bloco "WS" + nome), sem o monograma "W.": o manual (§2) diz que produto não usa o
  monograma sem decisão própria, e o logotipo ainda não foi aprovado (D-01, D-02); o A1 foi escolhido por Fabiano na
  DEC.
- Histórico completo na T05: o A2 sugere corte, mas cortar esconde informação que existe hoje e não foi pedido.
- Larguras de teste 1280 × 720 e 390 × 844, quebra em 768 px: são o perfil do Playwright já usado, a largura do C2 e o
  número da ESP.

## Pendências

- P-01 (Fabiano, não bloqueia): quer a opção recomendada marcada ou com selo "Recomendada" na T11, como no C2? Exige um
  campo estruturado no DEC (esquema e migration), proibido neste pedido; seria uma demanda nova.
- P-02 (`marketing-comunicacao`, não bloqueia): o bloco "WS" do A1 conversa com o manual §2 ("WS" sozinho só existe
  dentro do monograma; produto não usa o monograma sem decisão própria)? Se não, a troca para o nome sem monograma (V4)
  é só de marcação e estilo.
- P-03 (`arquiteto-solucoes`, etapa 02): origem dos arquivos de fonte (pacote npm com a fonte ou arquivos `woff2` em
  `public/` ou na pasta da fonte), versão, URL e `OFL.txt`; o comprovante de licença da marca ainda está em aberto no
  manual (L-09).
- P-04 (`ux-ui-design`, etapa 03): arranjo da T11 em 1280 px, que não tem mockup A, dentro do RF-11; textos das
  tabelas do RF-08 e do RF-09; rótulos curtos "Devolver" e "Arquivar" com a consequência associada.
- P-05 (Fabiano, UAT, não bloqueia): conferir a T11 em 390 px num aparelho real com Safari do iOS (teclado virtual
  sobre o rodapé fixo); os e2e rodam só no Chromium.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] todo item de `criterios_aceite_preliminares` do pedido aparece na matriz
- [x] todo RF tem ao menos um critério Dado/Quando/Então verificável
- [x] nenhum requisito contradiz a especificação (ESP) ou o parecer de risco (RSK) do pedido
- [x] o que fica fora do escopo está listado
- [x] o texto não tem dado pessoal real, segredo nem valor de `.env`
