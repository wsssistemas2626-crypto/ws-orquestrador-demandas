---
pedido: DEC-DEM-20261110-0015-v1
etapa: 04-ameacas
agente: seguranca-aplicacao
leu: [pedido.json, 01-analista-requisitos.md, 02-arquiteto-solucoes.md, 03-ux-ui-design.md, padrao-tecnico.md, contrato-passagem.md, passagens.jsonl, docs/construcao/DEC-DEM-20261022-0001-v1/04-seguranca-aplicacao.md, docs/construcao/DEC-DEM-20261022-0001-v1/08-correcao-engenheiro-backend.md (A-01 a A-04), docs/manual-tecnico/02-acesso-e-seguranca.md, src/proxy.ts, next.config.ts, Dockerfile, package.json, pnpm-workspace.yaml, src/app/layout.tsx, src/app/(painel)/demandas/page.tsx, src/modules/demandas/consultas.ts, src/modules/acesso/matriz.ts, src/app/(painel)/pacotes-decisao/[decId]/FormularioDecisao.tsx, src/app/(painel)/pacotes-decisao/[decId]/acoes.ts, src/components/CampoTexto.tsx, e2e/apoio.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Modelo de ameaças da 0.2.0 do WS Orquestrador de Demandas (reforma visual, proposta A + decisão C2), sobre os
componentes C01 a C16 da seção 2 de `02-arquiteto-solucoes.md` e as telas de `03-ux-ui-design.md`. Referências: OWASP
Top 10 (2021), OWASP ASVS 4.0.3 nível 2 (V1, V4, V5, V8, V10, V14) e LGPD. Nível = nível da ameaça **antes** do
controle; na dúvida, o mais alto. Os controles deste pedido usam o prefixo **CV-** para não colidir com C-01 a C-40,
A-01 a A-04 e S-/M-/B- dos pedidos anteriores, que continuam valendo e **não podem ser afrouxados**.

Foco pedido pela ESP: CSP e nada de recurso externo. Resultado: o desenho de 02 (ADR-13, `next/font/local` sobre
`@fontsource`, sem `public/`, proxy e `next.config.ts` sem diff) atende, **desde que** a prova seja feita em execução
(CV-03, CV-04) e não só por leitura do código. Fora da CSP, os pontos de maior risco são a T11 (integridade do que se
aprova, CV-10 a CV-15) e as capturas versionadas no git (CV-17).

### 1. Fronteiras de confiança tocadas

| # | Fronteira | O que muda neste pedido |
|---|---|---|
| F1 | Navegador → app | Telas novas e um formulário da T11 com três botões de envio; nenhuma rota, Server Action ou cabeçalho novo |
| F3 | Texto do cliente e do agente → tela | Título, recomendação e textos de ESP, RSK e DEC aparecem em lugares novos (cartões, barra, Próxima ação, cabeçalho da T11) |
| F4 | Saída do modelo → tela | A recomendação do DEC é texto de agente; a C2 sugeria marcá-la por padrão |
| F8 | Registro npm → build → imagem | Novo: `@fontsource/noto-sans` e `@fontsource/noto-sans-mono` entram pelo lockfile e vão para a imagem final (o `Dockerfile` copia o `node_modules` inteiro, linha 42) |
| F9 | Ambiente do e2e → git | Novo: capturas PNG geradas pelo Playwright e versionadas no repositório (git não tem expurgo) |

### 2. STRIDE por componente (seção 2 de 02)

#### C01 Tokens (`src/app/globals.css`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Nenhuma | baixa | — |
| T | `@import url(...)`, `url(https:...)` ou `url(data:...)` posto no CSS (cópia do mockup, que carrega Google Fonts) abre carga de fora ou força afrouxar a CSP | alta | CV-02, CV-03 |
| R | Nenhuma | baixa | — |
| I | Requisição a terceiro pelo CSS entrega o IP de quem usa o painel (LGPD, transferência internacional) | média | CV-02, CV-03 |
| D | Nenhuma relevante | baixa | — |
| E | Nenhuma | baixa | — |

#### C02 Fontes (`src/app/fontes.ts`, `next/font/local` sobre `@fontsource`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Pacote de fonte trocado por outro de mesmo nome (typosquatting) ou versão adulterada no registro | alta | CV-05 |
| T | Pacote com script de instalação ou código executável que roda no CI ou no build da imagem; `next/font/google` usado no lugar do local, pondo o Google no build | alta | CV-05, CV-02 |
| R | Versão da fonte sem registro | baixa | versão exata no `package.json` e no CHANGELOG (ADR-13) |
| I | `next/font` gerando `<style>` em linha ou `url(` fora de `/_next/static/media`, que a CSP bloqueia e alguém "conserta" abrindo `style-src 'unsafe-inline'`; uso de `fonte.style` (vira atributo `style=`, bloqueado) | alta | CV-01, CV-02, CV-04 |
| D | Fonte bloqueada ou ausente: a tela cai no fallback sem aviso, e o defeito passa despercebido | baixa | CV-04 (fonte de fato carregada) |
| E | Dependência vulnerável de desenvolvimento dentro da imagem de produção, fora do alcance do `pnpm audit --prod` | média | CV-05; pendência do audit completo |

#### C03 Marca (`MarcaWs.tsx`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Marca com imagem ou SVG externo (logotipo baixado de fora) | média | CV-02 |
| T, R, D, E | Nenhuma (só marcação, sem estado) | baixa | — |
| I | Nenhuma | baixa | — |

#### C04 Casca do painel (`src/components/casca/`, gaveta em `<dialog>`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Nome e papel da conta lidos no cliente (cookie, `localStorage`) em vez da sessão do servidor; casca usada como se fosse a guarda de acesso | média | CV-16; C-04 continua: `exigirPessoaNaPagina` em cada página |
| T | "Sair" refeito como link `GET` (saída forçada por outro site) ou chamando outra rota | média | CV-16, CV-01 |
| R | Nenhuma | baixa | — |
| I | Item de menu levando a tela que o papel não pode usar | baixa | só os `LINKS` de hoje; a tela de destino decide (C-04, C-12) |
| D | Gaveta presa aberta impede uso no celular | baixa | e2e da gaveta (CA-04.2 a CA-04.4); não é segurança |
| E | Nenhuma (a casca não autoriza nada) | baixa | C-04 |

#### C05 Moldura pública (T01, T02, sem permissão, erro, 404)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Mudança no fluxo de entrada ou de 2FA "de carona" na troca visual (lembrar dispositivo, pular passo) | crítica | CV-01 (diff vazio em `src/lib/auth*`, `src/modules/acesso/`), C-05, e2e de entrada e 2FA sem asserção a menos (CV-20) |
| T | Volta depois do login passando a usar parâmetro novo da moldura | alta | C-40 sem mudança; a marca em T01 e T02 não é link (03, 7.2) |
| R | Nenhuma | baixa | — |
| I | Tela de erro passando a mostrar `erroId`, mensagem ou pilha; QR do 2FA com segredo em captura | alta | `error.tsx` só com o texto de hoje (03, seção 7); CV-17 (sem captura da T02) |
| D | Nenhuma | baixa | — |
| E | Nenhuma | baixa | — |

#### C06 Selo (`Selo.tsx`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| T | Selo de "Rascunho de agente" ou "Desatualizado" perdendo o texto e ficando só na cor (a revisão humana deixa de enxergar o aviso) | média | texto sempre presente (03, 2.5); CV-12 |
| S, R, I, D, E | Nenhuma | baixa | — |

#### C07 Leituras da fila (`src/modules/demandas/resumo-da-fila.ts`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Leitura chamada antes da sessão ou por rota de agente | alta | CV-06 |
| T | Injeção SQL pelo filtro da URL ou pela lista de ids; função de leitura que grava | alta | CV-06, C-17 (`sql.raw` proibido) |
| R | Nenhuma | baixa | — |
| I | A função nova devolvendo título, nome do solicitante ou texto livre (hoje a API minimiza para agente, M-1 do 0008); erro da consulta com parâmetros no log | alta | CV-06, CV-08, C-21 |
| D | Consulta por linha (N+1) ou contagem lenta derrubando a fila | baixa | RNF-09 (2 consultas fixas), `statement_timeout` de 10 s, falha isolada (02, seção 5) |
| E | Nenhuma (só leitura, matriz sem mudança) | baixa | CV-01 |

#### C08 Regras de exibição da fila (`src/components/dados-da-fila.ts`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| T | `href` do contador ou campo oculto `status` refletindo o valor cru da URL (parâmetro injetado, filtro inválido mantido) | média | CV-07 |
| I | Nenhuma | baixa | — |
| S, R, D, E | Nenhuma | baixa | — |

#### C09 Contadores (`ContadoresDaFila.tsx`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| T | Formulário GET dos contadores levando campo a mais para a URL | baixa | CV-07 (só `status`, `tipo`, `linhaServicoProvavel`) |
| S, R, I, D, E | Nenhuma (navegação para a própria fila; a página revalida tudo) | baixa | — |

#### C10 Fila (`page.tsx`, `fila.tsx`, `CartoesDaFila.tsx`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Página nova ou reorganizada sem `exigirPessoaNaPagina` | crítica | C-04 (teste estático de hoje), CV-01 |
| T | XSS pelo título da demanda nos cartões e na tabela | alta | CV-18, C-18 |
| R | Nenhuma | baixa | — |
| I | Lista de cartões escondida por `display: none` com dado a mais que a tabela | baixa | mesmos campos de `DemandaResumo` (RF-07); sem campo novo |
| D | Nenhuma relevante | baixa | — |
| E | Nenhuma | baixa | — |

#### C11 Regras de exibição da demanda (`src/components/dados-das-etapas.ts`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| T | Regra de negócio nova escondida na função de exibição (ex.: decide quem pode agir e passa a esconder ou liberar controle) | média | CV-09; CA-09.4 |
| I | Próxima ação mostrando `referenciaDocumento`, comentário da decisão ou nome do aprovador | média | CV-09 |
| E | Função de exibição importando `autorizar`, `db` ou função que grava | média | CV-09 (teste estático de importação) |
| S, R, D | Nenhuma | baixa | — |

#### C12 Detalhe da demanda (T05)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Leitura do DEC sem `autorizar('ler_pacote_decisao')`, ou com id vindo da URL | alta | CV-09 |
| T | XSS pelo título, dúvidas, textos de ESP/RSK/DEC nos cartões novos; link da Próxima ação montado de texto | alta | CV-18, CV-19 |
| R | Histórico cortado ("Ver histórico completo" do A2) esconde evento de decisão | média | RF-10: histórico completo (CA-10.2) |
| I | Nenhuma nova: os dados da T05 são os de hoje, para pessoa | baixa | — |
| D | Falha da leitura do DEC derrubando a página | baixa | tela de erro de hoje (02, seção 5) |
| E | Nenhuma | baixa | — |

#### C13 Decisão (T11: `FormularioDecisao.tsx`, `RevisaoDoPacote.tsx`, rodapé fixo)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Nenhuma nova: autoria e papel vêm da sessão (C-11, C-12, sem mudança) | baixa | CV-01 |
| T | O que a pessoa vê no diálogo difere do que é gravado (botão errado como `submitter`, estado relido depois do diálogo, Enter num campo acionando "Aprovar" sem passar pelo diálogo) | alta | CV-10 |
| T | Aprovação de pacote desatualizado pelo botão com `aria-disabled` (continua focável e ativável) | alta | CV-11; servidor com 409 (C-13, sem mudança) |
| T | Opção recomendada pelo agente marcada por padrão (C2): injeção de instrução no texto vira pré-escolha da aprovação | alta | CV-13 |
| T | Revisão humana (C-14) recolhida no celular: sistema alvo e níveis de risco rebaixados por agente deixam de ser vistos antes de aprovar | alta | CV-12 |
| T | Exigência de hoje sumindo no layout novo (caixa de revisão, documento assinado, aviso do C-28, seção do pedido para DEC desatualizado, A-03) | alta | CV-11, CV-12, CV-14 |
| R | Pessoa nega a decisão porque o botão dizia outra coisa | média | CV-10 (texto do botão, diálogo e gravação da mesma fonte) |
| I | Identificador do documento, data e comentários indo para a URL num envio nativo antes da hidratação (histórico do navegador, log de acesso do proxy) | média | CV-15 |
| I | Documento assinado enviado também ao devolver ou arquivar | baixa | CV-14 (CA-11.6) |
| D | Rodapé fixo cobrindo alerta ou campo | baixa | CA-12.3, CA-12.6 (acessibilidade; reforça CV-12) |
| E | Nenhuma: `registrarDecisaoNoPainel` e `registrarDecisao` sem mudança | baixa | CV-01 |

#### C14 Demais telas (T04, T06 a T10, T12)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| T | Troca de classe que muda campo, condição ou validação "de carona" (ex.: interruptor da T12 que a administradora passa a acionar) | alta | RF-14; CV-01 (Server Actions e matriz sem diff); C-12 decide no servidor |
| I | XSS nas seções viradas em cartão | alta | CV-18 |
| S, R, D, E | Nenhuma nova | baixa | — |

#### C15 Testes (`e2e/apoio.ts`, specs novos, estáticos)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| T | Asserção de segurança apagada ou afrouxada para o e2e passar com o seletor novo; `bypassCSP: true` na configuração; fixture de origem que nunca reprova | alta | CV-20, CV-03 (teste negativo da fixture) |
| I | Capturas com dado real ou segredo (rodando contra produção pelo `BASE_URL`), versionadas no git | alta | CV-17 |
| S, R, D, E | Nenhuma | baixa | — |

#### C16 Versão e docs (`package.json`, CHANGELOG, manual, capturas)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| T | `package.json` com mudança além da versão e das duas fontes (dependência de interface, faixa `^`) | média | CV-05 |
| I | Dado pessoal real em captura, CHANGELOG ou manual | alta | CV-17; RNF-14 |
| S, R, D, E | Nenhuma | baixa | — |

#### Integrações externas (seção 5 de 02)

| Integração | Ameaça | Nível | Controle |
|---|---|---|---|
| Google Fonts | Volta por cópia do mockup ou por `next/font/google` | alta | CV-02, CV-03 |
| Registro npm (`@fontsource`) | Cadeia de suprimento (F8) | alta | CV-05 |
| Anthropic, Resend, Sentry | Nenhuma mudança | baixa | CV-01 (worker, agentes e `src/lib/log.ts` sem diff) |

### 3. Controles exigidos

Todos são critério de aceite de alguma tarefa do plano. "Teste" é Vitest (Testcontainers quando toca banco) ou
Playwright contra o build de produção, sempre com dado fictício.

| Id | Nível | Controle (critério verificável) | Cobre |
|---|---|---|---|
| CV-01 | crítica | **Superfícies congeladas.** `git diff 198e97d -- src/proxy.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth* src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml` vazio, e vazio também nos arquivos com `'use server'` (o plano lista os nove por nome). `src/proxy.test.ts` sem diff e verde: a CSP é byte a byte a da 0.1.13, sem `style-src`, `font-src`, `img-src` nem `'unsafe-inline'`. Conferido na revisão de cada tarefa e na 08 | C02 I, C04 T, C05 S, C07 E, C10 S, C13 S e E, C14 T |
| CV-02 | alta | **Sem recurso externo no código.** Teste estático novo (ex.: `test/estatico/sem-recurso-externo.test.ts`) que varre `src/`, `e2e/`, `test/`, `next.config.ts`, `playwright.config.ts` e a configuração do PostCSS e reprova: `fonts.googleapis.com`, `fonts.gstatic.com`, `next/font/google`, `@import` com URL, `<link` ou `<script` com `href`/`src` absoluto; em `src/**/*.css`, qualquer `url(`; em `src/**/*.tsx`, `style={`, `dangerouslySetInnerHTML` e uso de `.style` do objeto de fonte. Literal `http://` ou `https://` novo em `src/` só `http://www.w3.org/2000/svg` (conferido no diff da 08). O teste precisa reprovar quando se planta uma ocorrência (prova vista falhando, padrão técnico 7) | C01 T e I, C02 T e I, C03 S |
| CV-03 | alta | **CSP vigiada em execução.** Fixture automática em `e2e/apoio.ts` (ADR-19), herdada por todos os specs, que reprova o teste quando: (a) qualquer `request` da página (inclui `websocket` e `serviceworker`) tem origem diferente da `baseURL`; (b) houve evento `securitypolicyviolation`, coletado por um ouvinte posto com `page.addInitScript` e lido no fim do teste; (c) há mensagem de console com "Content Security Policy". `playwright.config.ts` sem `bypassCSP: true` e o e2e roda contra `next start` ou a homologação (nunca `next dev`). Um teste negativo prova que a fixture reprova: injeta por `page.evaluate` um `<link rel="stylesheet" href="https://exemplo.test/x.css">` e é marcado `test.fail()` | C01, C02 I, integração Google Fonts, RNF-07, RNF-08 |
| CV-04 | alta | **Fontes da mesma origem e de fato aplicadas.** E2e em T01, T03 e T11: depois de `document.fonts.ready`, a primeira família do `font-family` computado do `body` e a de um id em mono estão em `document.fonts` com `status === 'loaded'` (a família computada sozinha não prova carga: ela aparece mesmo com a fonte bloqueada); toda regra `@font-face` de `document.styleSheets` tem `src` só com `/_next/static/media/<arquivo>.woff2` ou `local(...)`; as respostas das fontes são da `baseURL`, com `content-type` `font/woff2`. Responde à pendência de 02 sobre `<style>` em linha e `url(` fora de `/_next/static/media` | C02 I e D, RF-02 |
| CV-05 | alta | **Cadeia de suprimento das fontes.** `@fontsource/noto-sans` e `@fontsource/noto-sans-mono` em `devDependencies` com versão exata (sem `^` nem `~`), do escopo `@fontsource` (nome conferido letra a letra); `pnpm-lock.yaml` com `integrity` sha512 dos dois; `pnpm-workspace.yaml` sem diff (nenhum `allowBuilds` novo); o `package.json` de cada pacote sem `preinstall`, `install` nem `postinstall`; `next/font/local` aponta só para arquivos `.woff2` e nenhum `.js`, `.mjs` ou `.cjs` desses pacotes é importado pelo app. Diff do `package.json` do sistema só com `version: 0.2.0` e essas duas linhas (RNF-10). `pnpm install --frozen-lockfile` no CI e `pnpm audit --prod --audit-level high` sem alta nem crítica antes da 08 (em 10/11: nenhuma alta ou crítica, 5 moderadas anteriores a este pedido). Licença OFL conferida pelo `test/estatico/fontes.test.ts` (ADR-13) | C02 S, T e E, C16 T, F8 |
| CV-06 | alta | **Leituras novas da fila só de leitura, autorizadas e sem texto.** `resumo-da-fila.ts` usa só `db.select` do Drizzle (sem `insert`, `update`, `delete`, `execute`, `sql.raw` nem `sql` com valor de entrada interpolado); os filtros vêm só do `FiltroDemandas` já validado por `filtroDemandasSchema`; os ids da página entram por `inArray`; lista vazia não consulta. Retorno só com contagens por status e booleanos `esp`, `rsk`, `dec` por id: teste de integração (Testcontainers) confere as chaves exatas do retorno e que um título-sentinela fictício não aparece nele. Teste estático: o módulo só é importado por `src/app/(painel)/demandas/page.tsx`, que chama `exigirPessoaNaPagina` e `autorizar(pessoa, 'listar_demandas')` antes dele. CA-15.2 vale | C07 S, T e I |
| CV-07 | média | **Filtro da URL não refletido cru.** O campo oculto `status` do formulário de filtros e o `href` de cada contador saem só do valor do enum depois do parse; filtro inválido não gera `status`. O formulário GET dos contadores envia só `status`, `tipo` e `linhaServicoProvavel`. E2e: `/demandas?status=%3Cscript%3E&tipo=bug` mostra o alerta de filtro inválido, "Todas" pressionado, nenhum `input[name=status]` com valor fora do enum e nenhum `href` de contador com o texto injetado | C08 T, C09 T |
| CV-08 | média | **Log da falha dos contadores sem dado.** A falha da contagem grava `log.error({ evento: 'painel_contadores_falhou', rota: '/demandas', erro: e })`, no mesmo formato de `painel_fila_falhou`, sem filtro, SQL nem parâmetros. Teste de unidade: com `db` que lança erro cuja mensagem tem um sentinela fictício, a linha capturada do pino não contém o sentinela e os contadores aparecem sem total (02, seção 5) | C07 I, C-21 |
| CV-09 | média | **T05: leitura do DEC autorizada e exibição sem regra nem dado a mais.** `autorizar(pessoa, 'ler_pacote_decisao')` antes de `obterPacoteDecisao`, com o id do DEC mais novo tirado de `demanda.pacotesDecisao` (nunca da URL). `dados-das-etapas.ts` só tem `import type` de `src/modules/` e não importa `acesso`, `db`, `lib/deps` nem `acoes` (teste estático). `proximaAcao` e `etapasDaDemanda` não habilitam nem escondem controle (CA-09.4) e não devolvem `referenciaDocumento`, comentário de decisão nem nome de aprovador: teste de unidade com sentinelas nesses campos não acha o sentinela na saída | C11 T, I e E, C12 S |
| CV-10 | alta | **T11: o que se vê é o que se grava.** O `onSubmit` monta o objeto `v` uma vez, com `statusDecisao` lido do `submitter` e aceito só se for `aprovada`, `devolvida` ou `arquivada` (outro valor ou `submitter` nulo: nada acontece); o texto do diálogo sai de `textoDoDialogo(v, …)` e `registrar()` envia `entradaDaDecisao(v, contexto)` **do mesmo `v`**, sem reler o estado. Todo envio passa por `validarDecisao` e pelo diálogo (C-14), inclusive o Enter num campo de texto. Testes: unidade do manipulador (`submitter` com valor fora da lista não chama a Server Action); e2e com a opção B marcada e "Aprovar a opção B": diálogo com "Aprovar a opção B." e a API mostra a aprovação na opção B; e2e com a opção A marcada e "Devolver": diálogo de devolução e decisão gravada `devolvida`, sem opção nem documento; e2e do Enter no campo de comentários: abre o diálogo e nada é gravado sem "Confirmar e registrar" | C13 T e R |
| CV-11 | alta | **Aprovar indisponível não envia, e A-03 continua.** Com o pacote desatualizado, ativar o principal (clique, Enter ou Espaço nele, Enter em campo de texto) não valida, não abre diálogo e não chama a Server Action: o e2e conta zero `POST` de Server Action na página. O servidor continua recusando com 409 (teste de `decidir.ts` sem mudança). Em 390 px e em 1280 px, a seção do Pedido de Construção e o botão de gerar continuam escondidos para DEC desatualizado (A-03) e, quando aparecem, mostram o aviso do C-28 ("O pedido vai para o repositório git da estruturaAutonoma…") | C13 T |
| CV-12 | alta | **Revisão humana visível no celular (C-14 em 390 px).** Em 390 × 844, sem abrir nenhum controle, aparecem: `sistema_alvo` e `repositorio_destino` da ESP citada, os três níveis do RSK citado, o nível de aprovação do DEC, o selo "Rascunho de agente" de cada artefato citado e todos os alertas (desatualizado, rascunho citado, substituído, lembrete P1-d). Dentro do recolhível só podem ficar critérios de aceite, definição de pronto e descrição, vantagens, desvantagens e "quando escolher" das opções. O diálogo continua repetindo repositório destino e nível. O e2e do C-14 de hoje roda também em 390 px. **Estreita** o RF-12 de 01 e a seção 6.3 de 03 (ver Decisões) | C13 T, C06 T |
| CV-13 | alta | **Nenhuma opção pré-marcada.** Ao abrir a T11, nas duas larguras, nenhum rádio de opção está marcado, não há selo "Recomendada" e o botão principal diz "Aprovar" até a pessoa marcar uma opção (ou a opção estar fixada pela primeira aprovação). E2e confere os três pontos num DEC fictício de agente cuja recomendação cita a opção B | C13 T, F4 |
| CV-14 | média | **Exigências da T11 iguais às de hoje.** Caixa "Revisei os rascunhos de agente…" obrigatória nas três ações (CA-11.4); documento assinado obrigatório só para aprovar quando `pedeDocumento` (CA-11.5) e ausente da entrada ao devolver ou arquivar (CA-11.6); `dados-da-decisao.test.ts` sem asserção de regra removida ou trocada (CA-11.7). O servidor segue sendo a regra (`decidir.ts`, linhas 241 a 243, sem diff) | C13 T e I |
| CV-15 | média | **Nada digitado vai para a URL.** Os campos de identificador do documento, data e comentários da T11 não têm atributo `name`, e o `form` não ganha `action` nem `method`: antes da hidratação, um envio nativo vai por GET para a própria URL, e só o que tem `name` entra na query. Teste de componente (ou e2e) confere a ausência de `name` nesses três campos. `name` só é aceito nos rádios de opção e nos três botões (valores de enumeração) | C13 I |
| CV-16 | média | **Casca sem decisão de acesso.** Nome e papel exibidos chegam por prop do layout do servidor (da `pessoa` de `exigirPessoaNaPagina`), nunca de `localStorage`, `sessionStorage` ou cookie lido no cliente. "Sair" chama a mesma função de saída de hoje (Better Auth, `POST` com `Origin`); não existe link `GET` de saída. E2e CA-03.5 e o teste do C-07 de hoje (cookie antigo responde 401 depois de sair) passam pelo botão da casca e pelo da gaveta | C04 S e T |
| CV-17 | alta | **Capturas sem dado real.** `e2e/capturas.spec.ts` é pulado quando `CI` existe **e** quando o host da `baseURL` não é `127.0.0.1` nem `localhost` (nunca roda contra produção nem homologação remota pelo `BASE_URL`); usa só o seed fictício; não captura a T02 (QR, segredo TOTP, códigos de recuperação). Na 08, cada PNG é aberto e conferido contra os nomes, e-mails e textos do `scripts/seed-ficticio.ts`. Captura com dado real que chegue a commit é incidente (git sem expurgo): para, avisa Fabiano e `seguranca-informacao` | C15 I, C16 I, F9, RNF-14 |
| CV-18 | alta | **Texto de terceiro só como texto, nas telas novas.** Título, dúvidas, textos de ESP, RSK e DEC, recomendação e nomes entram nos componentes novos (cartão da fila, barra de etapas, Próxima ação, cabeçalho e rodapé da T11, cartões da T05 e da T12) só por expressão JSX; nunca em `dangerouslySetInnerHTML`, `href`, `src` ou atributo `style`. Título exibido ao lado de id ou selo fica num elemento com `unicode-bidi: isolate` (ou `<bdi>`), para caractere de direção (U+202E) não inverter o texto vizinho. O e2e de C-18 de hoje (texto fictício com `<script>` e `<img src=x onerror=…>`) passa a cobrir o cartão da T03 em 390 px, a T05 e o cabeçalho da T11, e mostra o texto literal sem executar nada | C10 T, C12 T, C14 I |
| CV-19 | média | **Links internos montados só de id validado.** Todo `href` novo (Próxima ação, trilha, "Voltar para a demanda", marca, contadores, id do cartão) sai de constante de rota mais id que casa a regex de hoje (`^DEM-\d{8}-\d{4}$`, `^(ESP\|RSK\|DEC)-DEM-\d{8}-\d{4}-v\d{1,4}$`) ou de âncora da própria página. Teste de unidade de `proximaAcao`: todo `href` devolvido casa `^/(demandas\|pacotes-decisao)/` ou `^#` | C12 T |
| CV-20 | alta | **Nenhum teste de segurança enfraquecido.** `e2e/seguranca.spec.ts`, `e2e/seguranca-qa.spec.ts`, `src/proxy.test.ts`, `test/estatico/*` e os testes de `src/modules/` sem asserção a menos, contada **por arquivo** (não só no total do CA-16.1); nenhuma regra do axe desligada (`test/estatico/decisao-e2e.test.ts` vale); `retries` e tempo-limite sem aumento (RNF-12); sem `bypassCSP`. Mudança em teste existente só de seletor, texto ou passo equivalente (CA-16.2), conferida trecho a trecho na revisão | C15 T, C05 S |

### 4. Dados pessoais (LGPD)

Este pedido **não cria dado pessoal novo, nem leitura nova de dado pessoal**: as duas leituras da fila devolvem
contagens e booleanos (CV-06), e a leitura do DEC na T05 é de pessoa, do mesmo dado que a T11 já mostra. Bases legais,
retenção e expurgo continuam os da seção 4 de `DEC-DEM-20261022-0001-v1/04-seguranca-aplicacao.md`, já confirmados ou
pendentes com `juridico-contratos` lá. O que muda é **onde** o dado aparece:

| Id | Dado | Onde passa a aparecer | Base legal | Retenção | Expurgo | Cuidado deste pedido |
|---|---|---|---|---|---|---|
| D1 | Texto bruto colado | T05, seção "Texto recebido" (como hoje) | art. 7º, V e IX (D1 do 0001) | 90 dias (configurável de 1 a 365) | job diário do RF-24 com C-31, sem mudança | a seção continua com a data do expurgo (RF-10) |
| D3 | Nome e papel do solicitante | T05, cartão Dados (como hoje); **nunca** na fila, no cartão da lista nem na Próxima ação | art. 7º, V e IX | status final + 5 anos | anonimização futura (D3 do 0001) | CV-06 (a fila não lê o nome), CV-09 |
| D5 | Dado incidental em título, ESP, RSK e DEC | cartões da fila, barra, cabeçalho da T11 | art. 7º, IX e VI | igual a D3 | igual a D5 do 0001 | só texto (CV-18); sem novo destino fora do sistema |
| D6 | Nome da conta e papel | casca e gaveta (antes no cabeçalho) | art. 7º, IX | enquanto a conta existir | script de desativação (D6 do 0001) | vem da sessão do servidor (CV-16) |
| D8 | Quem aprovou e decidiu | T11 (como hoje); na T05 só o **papel** ("O CTO já aprovou…"), sem nome nem documento | art. 7º, VI e IX | igual a D5 | igual a D5 | CV-09; documento só na aprovação (CV-14) e nunca na URL (CV-15) |
| D13 | IP e user agent de quem usa o painel, enviados a terceiro pela carga de fonte | **deixa de existir**: com Google Fonts, o IP iria ao Google (transferência internacional, art. 33) | sem tratamento: o envio a terceiro é eliminado | não se aplica (nada é coletado nem enviado) | não se aplica | CV-02, CV-03, CV-04 garantem que não volta |
| D14 | Capturas de tela PNG versionadas | `docs/manual-tecnico/capturas/` no git | não é dado pessoal: só o seed fictício | permanente no git | não se aplica; dado real em captura é incidente e exige remoção do histórico, com Fabiano e `seguranca-informacao` | CV-17 |

### 5. O que o plano (05) precisa conter

1. **Cada controle CV-01 a CV-20 como critério de aceite de uma tarefa**, com o teste citado no controle.
2. **Ordem**: a fixture de origem e CSP (CV-03, com o teste negativo) e o teste estático de recurso externo (CV-02)
   entram na **primeira** tarefa, antes de qualquer troca visual, para que toda tarefa seguinte já rode vigiada. O
   `test/estatico/fontes.test.ts` e CV-04 entram na tarefa das fontes; CV-05 é conferido na revisão dessa tarefa.
3. **Risco `alto` no `tarefas.json`** para: a tarefa da fixture e do teste estático (CV-02, CV-03); a das fontes
   (CV-04, CV-05); a do formulário da T11 (CV-10 a CV-15); a das leituras da fila (CV-06); a das capturas (CV-17).
4. **CV-01 em toda revisão de tarefa** (o `tech-lead` roda o `git diff 198e97d -- <lista>` e anexa o resultado vazio),
   e de novo na 08.
5. **A lista dos nove arquivos com `'use server'`** escrita no plano, por caminho, para o CV-01 ser conferível.
6. **Na 08**: `/security-review` no PR com foco em CSP, T11 e capturas; `pnpm audit --prod --audit-level high` limpo;
   diff de `package.json`, `pnpm-lock.yaml` e `pnpm-workspace.yaml` lido linha a linha (CV-05); cada PNG conferido
   (CV-17); contagem de `expect(` por arquivo de teste de segurança (CV-20). Achado crítico ou alto volta ao engenheiro e
   passa por reteste deste agente.
7. **Fora do `/construir`** (Fabiano, depois do PR): UAT da T11 no Safari do iOS (P-05 do 01) inclui conferir que o
   rodapé fixo não cobre alerta nem a caixa de revisão com o teclado virtual aberto (reforço do CV-12).

### 6. Respostas às pendências dirigidas à 04

- 02, "conferir no `next build` que o `next/font/local` não gera `<style>` em linha nem `url(` fora de
  `/_next/static/media`": não rodei o build (fora da minha lista Pode). Virou critério verificável em execução, mais
  forte que a leitura do build: CV-03 (violação de CSP reprova qualquer e2e) e CV-04 (`@font-face` só com
  `/_next/static/media/*.woff2` e fonte com `status === 'loaded'`).
- 01 P-03 e ADR-13 (origem das fontes): aprovado do ponto de vista de segurança, com CV-05. O caminho (a) do ADR,
  `next/font/google`, fica vetado por CV-02.
- 01 P-01 (opção recomendada marcada ou com selo): parecer de segurança **contrário** a marcar por padrão (CV-13). Se
  Fabiano quiser o selo numa demanda futura, o campo estruturado de recomendação tem de ser preenchido ou confirmado por
  pessoa, nunca só pela saída do agente de consolidação (C-25).
- 02, ADR-18 (Enter num campo aciona "Aprovar"): aceito, porque o caminho passa por validação e diálogo; fica preso por
  CV-10 e, com o pacote desatualizado, por CV-11.

## Decisões tomadas

- Nenhuma devolução: as lacunas de 01, 02 e 03 viraram controles verificáveis que cabem no plano, sem refazer etapa.
- CV-12 estreita o RF-12 de 01 e a 6.3 de 03 (sistema alvo e níveis de risco fora do recolhível no celular): é acréscimo de visibilidade, não muda fluxo nem texto, e recolher o que o C-14 manda mostrar seria afrouxar um controle, o que a ESP proíbe.
- CSP provada em execução (CV-03, CV-04) e não só por leitura: a família computada aparece mesmo com a fonte bloqueada, e a tentação de "consertar" um bloqueio abrindo `style-src` é o risco que a ESP descreve.
- A fixture de CSP precisa de um teste negativo: uma guarda que nunca reprova dá falsa segurança a toda a suíte.
- Nenhuma opção pré-marcada (CV-13): a recomendação é saída de modelo (F4), e o padrão marcado transforma injeção de instrução em pré-escolha.
- Capturas só em loopback (CV-17): o e2e aceita `BASE_URL`, e uma captura contra produção iria para o git, que não tem expurgo.
- Campos da T11 sem `name` (CV-15): o formulário de hoje já não tem; o controle impede que a reforma acrescente e leve o documento para a URL num envio antes da hidratação.
- Prefixo CV- nos controles: os IDs C-, A-, S-, M- e B- já existem no sistema e continuam valendo.
- Volta 2: o maestro liberou os comandos só de leitura fora da lista Pode da volta 1 (`ls`, `cd`, `git grep`), pela regra de 25/10, e eles saíram de Comandos executados por instrução dele; o conteúdo técnico não mudou.
- `pnpm audit --prod` em 10/11: 0 alta e 0 crítica, 5 moderadas (esbuild, `@vitest/mocker`, glob, minimatch), todas transitivas, de ferramenta de build ou teste e anteriores a este pedido; não bloqueiam pelo padrão técnico (alta ou crítica bloqueia).

## Pendências

- `tech-lead` / `devops-sre` (não bloqueia): o estágio final do `Dockerfile` copia o `node_modules` inteiro, com as `devDependencies` (fontes incluídas), que o `pnpm audit --prod` não cobre. Na 08, rodar uma vez `pnpm audit --audit-level high` sem `--prod` (comando fora da minha lista) ou registrar a lacuna para um pedido próprio de imagem só com dependências de produção.
- `tech-lead` (não bloqueia): as 5 vulnerabilidades moderadas anteriores (esbuild via drizzle-kit, `@vitest/mocker` < 5.0.3, glob ≤ 14.0.1, minimatch < 11.0.1) entram no backlog de atualização; nenhuma roda no app em produção.
- `marketing-comunicacao` (P-02 do 01, não bloqueia): se a marca mudar para logotipo em arquivo, ele entra no bundle (SVG no JSX ou arquivo importado), nunca por URL externa (CV-02).
- `gestao-riscos` (não bloqueia): nenhum risco residual novo deste pedido; os do 0001 e do M-1 do 0009 seguem com Fabiano.

## Comandos executados

- `git status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, limpo
- `git log --oneline -5` — topo c18b67b
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -3 198e97d` — base 198e97d (merge do PR #15)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/app/(painel)/pacotes-decisao/[decId]/acoes.ts` — não executou (erro de sintaxe do shell nos parênteses); o arquivo foi lido pela ferramenta Read
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -S "A-03" -- docs/manual-tecnico CHANGELOG.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline --reverse -S "A-03 " -- src` — a4ec19f
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat a4ec19f`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas audit --prod` — 5 moderadas, 0 alta, 0 crítica (código de saída 1 pelas moderadas)

## Critério de pronto atendido

- [x] (04) cada componente de 02 tem as ameaças STRIDE avaliadas
- [x] (04) cada ameaça alta ou crítica tem controle, escrito como critério verificável
- [x] (04) cada dado pessoal tem base legal, retenção e expurgo
