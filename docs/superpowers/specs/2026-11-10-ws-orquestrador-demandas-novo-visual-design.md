# ws-orquestrador-demandas — spec consolidada da 0.2.0: novo visual do painel

Pedido `DEC-DEM-20261110-0015-v1` (DEM-20261110-0015, `melhoria`, risco **médio**), consolidado em 10/11/2026 a
partir das entregas da pasta `docs/construcao/DEC-DEM-20261110-0015-v1/`: `01-analista-requisitos.md`,
`02-arquiteto-solucoes.md` (volta 2), `03-ux-ui-design.md` e `04-seguranca-aplicacao.md` (volta 2), e do
`pedido.json`. Esta spec resume e amarra as quatro; o detalhe (critérios Dado/Quando/Então, wireframes, STRIDE por
componente) fica nelas. Cada bloco cita a origem entre parênteses: (01, RF-03), (02, ADR-15), (03, 6.3), (04, CV-10).
Onde duas entregas divergem, a seção 7.3 diz o que vale ou quem decide.

## 1. Objetivo

Dar ao painel do Orquestrador de Demandas (0.1.13, no ar em orquestrador.wsscloud.tech desde 10/11) a identidade da WS
e uma tela de decisão boa no celular, **mexendo só na camada visual** (pedido.json, ESP-DEM-20261110-0015-v1).

- **Opção aprovada no DEC** (Fabiano, 10/11/2026): proposta A, "Mesa de controle", como base de todo o painel (mockups
  A1 fila e A2 demanda), mais a tela de decisão no celular da proposta C (mockup C2), sobre a main 198e97d (0.1.13).
  Os mockups são referência de arranjo, com dados fictícios e estilos inline: não são código para copiar (carregam
  Google Fonts e usam `style=`, que a CSP recusa) (pedido.json; 01, seção 0).
- **Identidade**: manual de marca MKT-2026-005 (Marinho `#12385f`, Azul de ação `#1a6ae0`, Azul de texto `#1354b4`,
  Tinta `#0f1620`, Superfície `#f6f8fa`, Azul névoa `#eaf1fd`; Noto Sans e Noto Sans Mono) (pedido.json; 03, 2.1).
- **O que não muda**: nenhuma regra de negócio, rota de API, Server Action, esquema, migration, papel ou permissão;
  nenhum controle de segurança afrouxado (2FA, papéis, dupla aprovação, revisão de rascunhos, CSP, C-10, C-13, C-21,
  C-23, C-28, A-03, C-36) (pedido.json; 01, RF-15).
- **Versão**: 0.2.0. Publicação no ar só com aprovação de Fabiano, depois do PR. Nenhum dado pessoal real
  (JUR-2026-002, 7.4) (pedido.json, risco).
- **Larguras de referência**: computador 1280 × 720 (perfil do Playwright de hoje), celular 390 × 844 (largura da C2),
  ponto de quebra em 768 px; reflow conferido em 320 px (01, seção 0). A interface usa ainda o tablete, de 768 a 1199
  px, para o arranjo de duas colunas da T05 e da T11 (03, seção 0).

**Definição de pronto** (pedido.json): `pnpm test`, `pnpm lint` e `pnpm typecheck` verdes; `pnpm test:e2e` verde três
vezes seguidas; capturas das telas principais no computador e em 390 px; CHANGELOG com a 0.2.0; PR com CI verde.

## 2. Requisitos e critérios de aceite

17 requisitos funcionais e 14 não funcionais, com os critérios Dado/Quando/Então em `01-analista-requisitos.md`, seções
2 e 3. Os ids RF-NN e RNF-NN são **deste pedido**; requisito do sistema é citado pelo capítulo do manual (01, seção 0).

### 2.1 Requisitos funcionais

| RF | Resumo | Critérios |
|---|---|---|
| RF-01 | Tokens de marca num só lugar: cores, famílias, raios e espaços como variáveis CSS no `@theme` de `src/app/globals.css`; selos de status e decisão também viram tokens; usos vetados do manual §3.2 não aparecem. Único hexadecimal fora do `globals.css`: o QR da T02 | CA-01.1 a CA-01.3 |
| RF-02 | Noto Sans (400, 600, 700, 800) e Noto Sans Mono (400, 600) servidas pela mesma origem do app; nenhuma chamada ao Google Fonts; Mono em ids, etiquetas e números de contador | CA-02.1 a CA-02.3 |
| RF-03 | Casca da proposta A em T03 a T12 e no 404 do painel (a partir de 768 px): menu lateral marinho com a marca "WS" + "Orquestrador de Demandas", os três itens de hoje com `aria-current`, a conta e "Sair". Mantém "Pular para o conteúdo", os avisos da moldura e o foco no `h1` ao trocar de tela | CA-03.1 a CA-03.5 |
| RF-04 | Gaveta abaixo de 768 px: barra superior com "Menu" (`aria-expanded`); gaveta modal com foco preso, fundo inerte, Esc e "Fechar menu" fecham, foco volta a "Menu"; sem animação com movimento reduzido | CA-04.1 a CA-04.5 |
| RF-05 | Contadores na T03: "Todas" + os nove status, cada um botão com `aria-pressed`; o total respeita os filtros de tipo e linha da URL e ignora o de status; ativar leva a `?status=` mantendo tipo e linha, sem `offset`; ativar o pressionado tira o status | CA-05.1 a CA-05.7 |
| RF-06 | Tabela densa da fila a partir de 768 px: Id, Título, Tipo, Status, Etapas (ESP/RSK/DEC com texto acessível), Urgência, Linha de serviço e Idade (com a data de criação acessível). Dados das etapas por leitura nova só SELECT, sem mudar `DemandaResumo` nem `GET /api/demandas` | CA-06.1 a CA-06.4 |
| RF-07 | Abaixo de 768 px a tabela vira lista de cartões (`ul`/`li`), com os mesmos dados; só uma das formas na árvore de acessibilidade; sem rolagem horizontal em 390 e 320 px | CA-07.1 a CA-07.4 |
| RF-08 | Barra das cinco etapas na T05 (Demanda, Especificação, Parecer de risco, Decisão, Pedido de Construção), com estados de lista fechada e `aria-current="step"` na etapa atual; nenhuma em status final | CA-08.1 a CA-08.4 |
| RF-09 | Cartão "Próxima ação" na T05: o que falta, quem age e o link, por tabela fechada de 13 linhas (vale a primeira que casar). Só informa: não habilita nem esconde nada; chamado só por página | CA-09.1 a CA-09.4 |
| RF-10 | T05 no arranjo da A2 sem perder nada de hoje: selos, "Editar dados", "Nesta página", dúvidas, versões e botões nas mesmas condições, Mudar status, Texto recebido e **histórico completo** | CA-10.1 a CA-10.3 |
| RF-11 | T11 por três botões nas duas larguras: "Aprovar a opção X", "Devolver" e "Arquivar", num formulário só, com os campos, funções e validações de hoje; diálogo de confirmação (C-14) mantido; "Aprovar" indisponível e explicado com pacote desatualizado; documento assinado visível desde o início quando exigido | CA-11.1 a CA-11.7 |
| RF-12 | T11 abaixo de 768 px no layout C2: opções como rádios grandes (≥ 44 px), recomendação em texto visível, nível de aprovação, repositório destino e alertas sempre visíveis, rodapé fixo de até 160 px que nunca cobre o foco; **nenhuma opção vem marcada** | CA-12.1 a CA-12.6 |
| RF-13 | T01, T02, `/sem-permissao`, tela de erro e 404 da raiz com marca, cores e fontes, sem casca e sem mudar fluxo; QR da T02 preto sobre branco | CA-13.1 a CA-13.3 |
| RF-14 | T04, T06 a T10 e T12 recebem casca e tokens, sem mudar campo, ordem, texto de regra, validação ou condição | CA-14.1, CA-14.2 |
| RF-15 | Superfícies que não mudam: `git diff 198e97d` vazio em API, banco, migrations, acesso, proxy, worker, jobs, agentes, auth, QR e nos nove arquivos `'use server'`; em `src/modules/` só função nova de leitura | CA-15.1 a CA-15.4 |
| RF-16 | Testes existentes mudam só seletor ou texto; novos: axe nas duas larguras (T01 a T12, gaveta, estados da T11 em 390 px), e2e da aprovação em 390 px, dos contadores e da gaveta, unidade das regras do RF-08 e RF-09, e o teste de origem única | CA-16.1 a CA-16.3 |
| RF-17 | `package.json` 0.2.0, CHANGELOG, manual cap. 08 e nove capturas PNG (T01, T03, T05, T11 nas duas larguras + gaveta aberta), com dados fictícios | CA-17.1, CA-17.2 |

### 2.2 Requisitos não funcionais (os números)

| Id | Requisito | Número (01, seção 3) |
|---|---|---|
| RNF-01 | Contraste de texto (regra da casa) | ≥ 4,5:1 em qualquer tamanho |
| RNF-02 | Contraste não textual (borda de campo, ícone, marca de etapa, foco) | ≥ 3:1, no claro e no marinho |
| RNF-03 | Alvo de toque | ≥ 44 × 44 px abaixo de 768 px; ≥ 24 × 24 px a partir de 768 px (03 adota 44 px em toda largura, ver 7.3) |
| RNF-04 | Foco visível e não encoberto | contorno ≥ 2 px; nunca sob barra superior ou rodapé fixo |
| RNF-05 | Reflow | 0 px de rolagem horizontal em 320 e 390 px |
| RNF-06 | Fontes | só `woff2`, até 6 arquivos, soma ≤ 300 KB, subconjunto pt-BR, `font-display: swap`, licença OFL junto |
| RNF-07 | Recurso externo | 0 requisições a outra origem em todos os e2e |
| RNF-08 | CSP e cabeçalhos | idênticos aos da 0.1.13 |
| RNF-09 | Custo da fila | no máximo +2 consultas por carga de `/demandas`, sem N+1 |
| RNF-10 | Dependências | 0 dependência nova de interface em execução; só o pacote de fonte, com ADR |
| RNF-11 | Movimento | transição ≤ 200 ms; nenhuma com `prefers-reduced-motion` |
| RNF-12 | Estabilidade | 3 execuções seguidas verdes de `pnpm test:e2e`, sem aumentar `retries` nem tempo-limite |
| RNF-13 | Acessibilidade | 0 violação do axe (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`) em T01 a T12, 1280 × 720 e 390 × 844 |
| RNF-14 | Dados | 0 dado pessoal real em seed, teste, captura, CHANGELOG ou manual |

### 2.3 Rastreabilidade dos critérios preliminares

Os sete critérios preliminares do pedido estão mapeados na matriz da seção 5 de `01` (01, seção 5):

| Critério preliminar | RF | Critérios-chave |
|---|---|---|
| CP-1 Casca A com cores e fontes do manual em todas as telas autenticadas | RF-01 a RF-04, RF-10, RF-11, RF-14 | CA-01.x, CA-02.2, CA-03.x, CA-04.x, CA-14.1 |
| CP-2 Contadores que filtram; cartões abaixo de 768 px | RF-05 a RF-07 | CA-05.x, CA-06.x, CA-07.x |
| CP-3 Decisão em 390 px segue a C2, com as exigências de hoje | RF-11, RF-12 | CA-11.x, CA-12.x |
| CP-4 Nenhuma rota, action, esquema, migration ou regra muda | RF-15, RF-08, RF-09, RF-13 | CA-15.x, CA-09.4, CA-06.4, CA-11.7 |
| CP-5 Fontes do próprio app; CSP sem domínio externo | RF-02, RF-15 | CA-02.1, CA-02.3, CA-15.3 |
| CP-6 axe sem violação em T01 a T12 nas duas larguras | RF-16, RF-13, RF-04 | CA-04.5, CA-13.3 |
| CP-7 e2e verde três vezes, com o e2e da aprovação em 390 px | RF-16, RF-12 | CA-16.x, CA-12.1, CA-12.2 |

A interface ajusta dois critérios: o CA-08.1 passa a esperar "Pacote desatualizado" no lugar de "Desatualizado", e o
CA-09.1 espera "Decidir entre as opções A e B.", quem age "Administradora" e o link "Abrir a decisão" (03, seção 11).

## 3. Arquitetura e ADRs

Reforma da camada de apresentação sobre o monólito modular de hoje (ADR-01 a ADR-12, cap. 01 do manual). Princípios
(02, seção 1):

1. **Uma fonte para cada coisa**: cor, fonte, raio, foco e alturas fixas só no `@theme`; regra de exibição só em
   função pura em `src/components/dados-*.ts`; regra de negócio continua só em `src/modules/`.
2. **Responsivo por CSS, não por script**: um DOM por tela, o arranjo muda por media query (`md:` = 768 px). A exceção
   é a gaveta, que tem estado aberto ou fechado.
3. **Nada de fora**: nenhuma requisição a outra origem, nem no navegador nem no `next build`; a CSP fica byte a byte.
4. **Nenhuma dependência de interface em execução**: diálogo, recolhível e foco com elementos nativos (`<dialog>`).

### 3.1 O que muda e o que não muda no servidor

| Muda | Não muda |
|---|---|
| **Duas leituras novas, só SELECT**, em `src/modules/demandas/resumo-da-fila.ts`: contagem por status e etapas ESP/RSK/DEC por id da página, chamadas só pela página da T03 depois do `autorizar(pessoa, 'listar_demandas')` (02, ADR-16) | Rota de API, Server Action, esquema, migration, papel, permissão, job, cabeçalho (02, seção 0) |
| **Uma leitura que já existe** (`obterPacoteDecisao`) passa a ser chamada também pela T05, depois de `autorizar(pessoa, 'ler_pacote_decisao')`, para as aprovações do DEC mais novo (02, C12) | `src/proxy.ts` e `next.config.ts`: CSP `default-src 'self'` sem `style-src`, `font-src` ou `img-src` próprios (02, seção 7) |
| Custo por carga de `/demandas`: de 2 para 4 consultas, fixo, sem N+1 (02, seção 4) | `listarDemandas`, `DemandaResumo`, resposta de `GET /api/demandas` (02, ADR-16) |
| Dois pacotes de fonte em `devDependencies`, só no `pnpm install` (02, ADR-13) | Integrações Anthropic, Resend e Sentry; nenhuma integração externa nova (02, seção 5) |
| — | Nenhuma entidade, coluna, índice ou migration; os índices de hoje servem as consultas novas (02, seção 4) |
| — | `public/` não é usado: a imagem final não o copia (02, seção 7) |

Falha das leituras novas (02, seção 5): contagem falhou → log `painel_contadores_falhou`, contadores **sem total** que
continuam filtrando; etapas falharam → estado de erro da fila de hoje ("Tentar de novo"); DEC da T05 falhou → tela de
erro de hoje. Regra: número que falta é tolerável, número errado não. As três herdam o `statement_timeout` de 10 s.

Porta de desenvolvimento **3101**, a de hoje, livre em `ss -ltn` em 10/11 (02, seção 8).

### 3.2 Componentes

| Id | Componente | Caminho | Papel (02, seção 2) |
|---|---|---|---|
| C01 | Tokens | `src/app/globals.css` | Única fonte de cor, famílias, raios, espaços, alturas fixas, foco, movimento reduzido |
| C02 | Fontes | `src/app/fontes.ts` (novo), aplicado em `layout.tsx` | `next/font/local` com os seis arquivos `latin` do `@fontsource` |
| C03 | Marca | `src/components/marca/MarcaWs.tsx` (novo) | Bloco "WS" + nome em HTML/CSS, variante clara e escura |
| C04 | Casca do painel | `src/components/casca/` (novo) | Menu lateral, gaveta, "Sair", foco na troca de tela, `navegacao.ts` com `LINKS` e `ehPaginaAtual` de hoje; substitui `CabecalhoPainel.tsx` |
| C05 | Moldura pública | `src/components/casca/MolduraPublica.tsx` (novo) | Marca e cores em T01, T02, sem permissão, erro e 404, sem menu |
| C06 | Selo | `src/components/Selo.tsx` | Classes de token no lugar da paleta do Tailwind; valores de `COR_STATUS` e `COR_DECISAO` sem mudança |
| C07 | Leituras da fila | `src/modules/demandas/resumo-da-fila.ts` (novo) | `contarDemandasPorStatus` e `etapasDasDemandas`, só SELECT |
| C08 | Regras de exibição da fila | `src/components/dados-da-fila.ts` (novo) | Contadores, idade em dias de calendário (fuso de São Paulo), texto das etapas |
| C09 | Contadores | `demandas/ContadoresDaFila.tsx` (novo) | Botões com `aria-pressed`; navegação e foco pelo mecanismo de hoje |
| C10 | Fila | `demandas/page.tsx`, `fila.tsx`, `CartoesDaFila.tsx` (novo) | Tabela e cartões renderizados no servidor, um com `display: none` por largura; um só alvo de foco do resultado |
| C11 | Regras de exibição da demanda | `src/components/dados-das-etapas.ts` (novo) | `etapasDaDemanda` (RF-08) e `proximaAcao` (RF-09), funções puras |
| C12 | Detalhe da demanda | `demandas/[id]/page.tsx`, `BarraDeEtapas.tsx`, `CartaoProximaAcao.tsx` (novos) | Arranjo A2; lê o DEC mais novo para as aprovações |
| C13 | Decisão | `pacotes-decisao/[decId]/page.tsx`, `FormularioDecisao.tsx`, `RevisaoDoPacote.tsx` | Um formulário, três botões de envio, rodapé fixo por CSS |
| C14 | Demais telas | T04, T06 a T10, T12 | Só classes e tokens |
| C15 | Testes | `e2e/apoio.ts`, specs novos, `test/estatico/contraste-tokens.test.ts`, `test/estatico/fontes.test.ts` | Ver ADR-19 |
| C16 | Versão e docs | `package.json`, `CHANGELOG.md`, cap. 08, `docs/manual-tecnico/capturas/` | RF-17 |

Dono de cada componente novo: o `tech-lead` do pedido até o merge; depois, o sistema (Fabiano) (02, seção 2).

### 3.3 ADRs

| ADR | Decisão | Por quê | Custo e descartadas |
|---|---|---|---|
| **ADR-13** Fontes | `@fontsource/noto-sans` e `@fontsource/noto-sans-mono` em `devDependencies` de versão exata, lidos por `next/font/local`: seis arquivos `latin` (Sans 400/600/700/800, Mono 400/600), `display: 'swap'`, fallback `system-ui` e `ui-monospace`. **Desvio do padrão técnico** (pacote novo) | Único caminho sem rede externa no build, servido pela imagem final (de `/_next/static/media`, com hash e cache imutável) e executável na lista Pode do engenheiro; licença OFL 1.1 viaja no pacote | Caminho até `node_modules` depende do leiaute do pnpm (quebra no CI, não em produção); `pnpm audit --prod` não cobre `devDependencies`; só o subconjunto `latin`. Descartadas: `next/font/google` (Google no build), `woff2` em `public/` (404 em produção, `no-store` e CSP do proxy), `woff2` versionados no repositório (binário fora da lista Pode, origem sem hash) |
| **ADR-14** Tokens | Paleta da marca como tokens de valor exato; os nomes semânticos de hoje (`texto`, `primaria`, `borda`…) redefinidos por `var()` para ela; foco com token próprio por fundo; borda de campo nunca é a Linha `#dfe4ea`; selos como pares fundo/texto para as dez chaves de `CorSelo` | Diff pequeno nas 12 telas, menos regressão; Azul de ação sobre Marinho dá cerca de 2,4:1 e Linha sobre branco não chega a 3:1 | Duas camadas de nome. Descartadas: renomear tudo (toda classe de toda tela), tema em TypeScript (segunda fonte de verdade). Ver divergência com 03 em 7.3 |
| **ADR-15** Casca e gaveta | Menu lateral `hidden md:flex`; gaveta em `<dialog>` nativo com `showModal()`, volta do Tab e devolução do foco feitas à mão; fecha sozinha ao passar de 768 px; itens, conta e "Sair" de um componente só | Inércia do fundo, camada de topo e Esc vêm do navegador; o Chromium deixa o Tab sair do diálogo, por isso a prisão é explícita | Safari do iOS só no UAT. Descartadas: `div role="dialog"` à mão, biblioteca (RNF-10) |
| **ADR-16** Leituras da fila | Módulo novo com duas consultas fixas (contagem `group by status` com tipo e linha; `exists` de ESP, RSK, DEC para os ids da página), `db` injetável | API intocada, custo fixo +2 consultas | Contagem e lista podem divergir por milissegundos. Descartadas: estender `DemandaResumo` (muda a API), consulta por linha (N+1), contar no cliente (só vê 20 itens) |
| **ADR-17** Etapas e próxima ação | Funções puras em `src/components/dados-das-etapas.ts`, só dados já lidos, `switch` exaustivo (`never`), sem importar nada que grave nem `autorizar`, chamadas só por página | Testáveis por linha das tabelas, fora de `src/modules/` (onde a revisão não aceita lógica nova) | Linhas 9 a 12 do RF-09 repetem a máquina de status (`transicoes.ts`). Descartadas: função em `src/modules/`, lógica no JSX |
| **ADR-18** T11 | Um formulário; três `<button type="submit" name="acao">`; o `onSubmit` lê o `submitter`, monta `v` com `statusDecisao`, valida, abre o diálogo e registra com as funções de hoje; rodapé fixo só por CSS (`max-md:fixed`, `scroll-padding-bottom` por `:has(#rodape-da-decisao)`); nenhuma opção marcada | Um DOM, sem id duplicado, sem diferença na hidratação; o Enter num campo aciona o principal, que valida e abre o diálogo (C-14 mantido) | `:has()` pede Safari 15.4+; plano B do foco sob o rodapé: `focusin` com `scrollIntoView`. Descartadas: dois formulários, árvore por `matchMedia`, `onClick` + `requestSubmit()` (corrida) |
| **ADR-19** Testes | Largura por teste, sem projeto novo do Playwright; `axe-todas.spec.ts` repete cada estado nas duas larguras; `e2e/apoio.ts` exporta `test` com fixture automática que reprova requisição a outra origem e violação de CSP; capturas por `e2e/capturas.spec.ts` em `docs/manual-tecnico/capturas/<tela>-<largura>.png`, pulado no CI | A suíte não dobra de tempo; a CSP passa a ser vigiada em todo e2e | O spec de capturas regrava os PNG a cada execução local. Descartado: segundo projeto "celular" com a suíte inteira |

**Desvios do padrão técnico** (02, seção 10): só os dois pacotes `@fontsource` (ADR-13). A divergência do Next (16.4.1
contra 16.3.8 no padrão) é anterior e não muda aqui.

## 4. Interface

Detalhe em `03-ux-ui-design.md`. Texto que não muda é citado pela constante do código (ex.: `TEXTOS_FILA.vazio`);
texto novo ou alterado está por inteiro na seção 9 de 03. Pontos de quebra: celular abaixo de 768 px, tablete de 768 a
1199 px, computador a partir de 1200 px (03, seção 0).

### 4.1 Design system 0.2.0 (03, seção 2)

**Tokens de cor** (`@theme` em `globals.css`, único lugar com hexadecimal) (03, 2.1):

| Grupo | Tokens |
|---|---|
| Marca | `marinho` `#12385f` (casca, cartão Próxima ação, `h1`, etapa feita); `marinho-luz` `#1f4f86` (item ativo, só fundo); `acao` `#1a6ae0` (preenchimento do primário, contador pressionado, etapa atual; **nunca texto sobre marinho**); `acao-escura` `#1354b4` (link, foco no claro); `azul-claro` `#7db0f5` (sobre marinho); `nevoa` `#eaf1fd` |
| Texto e fundo | `tinta` `#0f1620`; `tinta-media` `#4a5763`; `tinta-suave` `#6b7885` (**só** borda de campo e marca tracejada); `linha` `#dfe4ea` (só decorativa); `superficie` `#f6f8fa`; `branco`; `texto-claro` `#dfe6ee` e `texto-claro-apoio` `#b9c5d2` (sobre marinho) |
| Estados | `positivo` `#0f7a52`/`#e7f4ee`; `atencao` `#8a5a00`/`#fdf3e0`; `erro` `#b42318`/`#fdecea` |
| Selos | violeta `#5b3fa0`, petróleo `#0b5d6b`, verde `#1d6b3a`, marinho-fundo `#e6edf5`, laranja `#9a3412`, cinza-fundo `#eceff3` (cada um com fundo próprio) |

- **Foco** com cor por superfície: `acao-escura` no claro, `branco` dentro do marinho (casca, gaveta, cartão Próxima
  ação); `outline` de 2 px com afastamento de 2 px, nunca removido (03, 2.1 e 2.4).
- **Contraste** calculado à mão para todos os pares (texto de 4,7:1 a 18,2:1; não textual de 3,7:1 a 11,9:1); o teste
  de unidade do RNF-01/RNF-02 é a fonte final (03, 2.2; P-03 de 03). Pares **vetados**: `acao` como texto sobre
  `marinho` (2,4) ou `tinta`; `azul-claro` sobre `marinho-luz` (3,7); `tinta-suave` como texto sobre `superficie`; as
  bordas do mockup `#c3ccd6` (1,6:1) e `#a7b3bf` (2,1:1), que reprovam WCAG 1.4.11 (03, 0 e 2.2).
- **Tipografia**: Mono 600 em ids, número de contador, marcas ESP/RSK/DEC e etiquetas; corpo e campo 16 px (nunca
  abaixo no celular); `h1` 28 px peso 800 em `marinho` (22 px no celular); nada abaixo de 12 px (03, 2.3).
- **Raio** 10 px em botão, campo, item de menu e contador; 16 px em cartão; pílula em selo. Cartão branco com borda
  `linha`, sem sombra (03, 2.4, pelo manual 5.1).
- **Alvo** de 44 × 44 px em todo controle e, no celular, também em link solto; **movimento** só na gaveta (200 ms),
  nenhum com movimento reduzido; **rolagem** com `scroll-padding` que respeita a barra de 56 px e o rodapé da T11 (03,
  2.4).
- **Selos** com texto sempre presente; mapa de cada status, decisão, rascunho (violeta com borda tracejada),
  desatualizado (vermelho), substituído e nível de risco em 03, 2.5.
- **Componentes**: os de hoje com tokens novos; variações novas de `Botao` (`sobre-escuro`, `claro-sobre-escuro`,
  estado `aria-disabled`), `GrupoOpcoes` (`cartao`), `Tabela` (legenda fora) e `Alerta` (`informacao`); componentes
  novos `Casca`, `Marca`, `Gaveta`, `Cartao`, `ContadoresDeStatus`, `MarcasDeEtapa`, `CartaoDeDemanda`,
  `BarraDeEtapas`, `ProximaAcao`, `LinhaDoTempo`, `Recolhivel` e `AcoesDaDecisao` (03, 2.6).

### 4.2 Casca e gaveta (RF-03, RF-04; 03, seção 3)

- **A partir de 768 px**: `header` marinho de 248 px (216 px no tablete), fixo na altura da janela; marca (quadrado
  "WS" + "Orquestrador" / "de Demandas", link para `/demandas`, nome acessível "WS Orquestrador de Demandas"); `nav
  "Principal"` com Demandas, Nova demanda e Agentes e teto (44 px, ícones SVG `aria-hidden`); item ativo marcado por
  fundo `marinho-luz`, barra `azul-claro` de 4 px e peso 700 (forma além da cor); conta `<Nome> (<Papel>)` e "Sair"
  ("Saindo…" durante a saída). Avisos da moldura acima do `main`, textos sem mudança.
- **Abaixo de 768 px**: o mesmo `header` vira barra superior de 56 px com "Menu" (texto visível, `aria-expanded`,
  `aria-controls="gaveta-menu"`) e a marca compacta. A gaveta é `<dialog aria-label="Menu">` aberto com `showModal()`,
  entra pela esquerda, largura `min(320 px, 85 %)`, véu `tinta` a 50 %. Abre com foco em "Fechar menu"; Tab e
  Shift+Tab circulares; fecham Esc, "Fechar menu", clique no véu e o item da tela atual (foco volta a "Menu"); item de
  outra tela navega e o foco vai ao `h1`; fecha ao passar de 768 px; a página atrás não rola.
- Um só banner e um só `nav "Principal"` na árvore em cada largura.

### 4.3 Fila, T03 (RF-05, RF-06, RF-07; 03, seção 4)

- **Cabeçalho**: etiqueta "Fila", `h1` "Demandas", botão primário "Nova demanda".
- **Contadores**: `div role="group" aria-label="Filtrar por status"` com "Todas" e os nove status na ordem de
  `ROTULO_STATUS`; ponto da cor do selo, rótulo, número em Mono e texto oculto " demandas" (nome acessível "Nova 3
  demandas"). Pressionado: borda 2 px `acao`, fundo `nevoa` e ícone de visto. Grade de 5 colunas no computador, 3 no
  tablete, pílulas de 44 px que quebram linha no celular. Recomendação sem obrigar: `form` GET com cada contador como
  `<button name="status">`, que filtra também sem script.
- **Filtros**: só Tipo e Linha de serviço (o seletor de Status sai; um campo oculto `status` mantém o da URL),
  "Filtrar" e "Limpar filtros", sem aplicar ao mudar o seletor (WCAG 3.2.2). No celular ficam no recolhível "Mais
  filtros" ("Mais filtros (1 ativo)").
- **Título do resultado**: `h2 id="resultado-da-fila" tabindex="-1"` com a legenda de hoje e "N demandas encontradas."
  ao lado; a tabela tem `caption` só para leitor de tela, sem id; a lista usa `aria-labelledby` (um id só nas duas
  larguras).
- **Tabela** (a partir de 768 px): Id (link Mono), Título (+ selo de rascunho), Tipo, Status, Etapas, Urgência (ponto +
  texto), Linha de serviço, Idade ("Hoje", "1 dia", "N dias", com `<time dateTime>` e "criada em dd/mm/aaaa" na linha
  de baixo). Coluna "Criada em" sai.
- **Marcas de etapa**: feita = fundo `marinho` e texto branco; por fazer = fundo branco com borda **tracejada**; as três
  `aria-hidden`, precedidas do texto oculto "Etapas: ESP feita, RSK feita, DEC por fazer".
- **Cartão** (abaixo de 768 px): id-link e selo no topo, título em `h3`, `dl` com Tipo, Urgência, Linha de serviço,
  Etapas e Idade; o cartão não é link, só o id. Em 320 px, título e id quebram sem rolagem lateral.
- **Estados**: vazio (`TEXTOS_FILA.vazio`), vazio com filtro, carregando (esqueleto na tabela ou em 3 cartões; contadores
  sem número), erro da lista (`TEXTOS_FILA.erro` + "Tentar de novo"), **erro dos contadores** ("Não foi possível contar
  as demandas por status. Os filtros por status continuam funcionando."), filtro inválido (`TEXTOS_FILA.filtroInvalido`,
  "Todas" pressionado) e sucesso (foco no título e "N demandas encontradas." na região de aviso).

### 4.4 Demanda, T05 (RF-08, RF-09, RF-10; 03, seção 5)

- **Arranjo**: a partir de 1200 px, grade com cabeçalho e barra de etapas na linha toda, coluna principal (2/3) com
  Dados, Dúvidas, Versões, Status e Texto recebido, e coluna lateral (1/3) com Próxima ação e Histórico; abaixo de 1200
  px, uma coluna. Ordem no DOM: trilha, cabeçalho, "Nesta página", alertas, barra, **Próxima ação**, Dados, Dúvidas,
  Versões, Status, Texto recebido, **Histórico** (a grade posiciona; a ordem de leitura segue o DOM).
- **Cabeçalho**: trilha `nav "Trilha"`; id em Mono, selos de hoje, "Urgência: Alta" quando informada; `h1` com o
  título; "Editar dados" e o novo "Mudar status" (leva ao `h2` Status).
- **Barra de etapas**: `ol aria-label="Etapas da demanda"`, 5 colunas no computador e lista vertical abaixo de 1200 px;
  cada etapa com marca por forma (feita = círculo marinho com visto; atual = círculo `acao` com número e anel; por
  fazer = círculo tracejado), nome, id da versão mais nova ou "Nenhuma" e o estado em texto. Estados (01, RF-08, com o
  texto de 03, 5.4):

| Etapa | Estados (vale o primeiro) |
|---|---|
| 1 Demanda | "Registrada" |
| 2 Especificação | "Por fazer" · "Com dúvidas em aberto" · "Feita" |
| 3 Parecer de risco | "Por fazer" · "Feito" |
| 4 Decisão | "Por fazer" · "Pacote desatualizado" · "1 de 2 aprovações" · "Decisão pendente" · "Aprovada, opção X" · "Devolvida" · "Arquivada" |
| 5 Pedido de Construção | "Gerado" · "Ainda não gerado" · "Depois da aprovação" |

A etapa atual (`aria-current="step"`) é a primeira, de 2 a 5, que não está feita; `entregue` e `encerrada` não têm
etapa atual.

- **Próxima ação**: `section` marinho com `h2` "Próxima ação"; o que falta (18 px, branco), detalhe quando houver,
  "Quem age: …" e o link. Condições e ordem do RF-09 com os textos de 03, 5.5:

| # | Condição (01, RF-09) | O que falta (03, 5.5) | Quem age | Link |
|---|---|---|---|---|
| 1 | `entregue` ou `encerrada` | "Nada. A demanda está em <status>." | Ninguém | — |
| 2 | agente pendente ou em andamento | "Esperar o <agente> terminar <artefato>." | o agente | — |
| 3 | `aguardando_informacao` | "Responder às dúvidas em aberto e voltar a demanda para Em análise." | Uma pessoa (CTO ou administradora) | "Ver as dúvidas em aberto" (ou "Mudar o status") |
| 4 | sem ESP | "Escrever a especificação técnica." | Agente de insumo técnico ou uma pessoa | T07 |
| 5 | sem RSK | "Escrever o parecer de risco." | Agente de risco ou uma pessoa | T08 |
| 6 | sem DEC, ou DEC mais novo devolvido | "Montar o pacote de decisão." | Agente de consolidação ou uma pessoa | T09 |
| 7 | DEC mais novo pendente e desatualizado | "Montar um pacote novo. O pacote atual está desatualizado." | Uma pessoa (CTO ou administradora) | T09 |
| 8 | DEC mais novo pendente | "Decidir entre as opções A e B." + detalhe de quem já aprovou | CTO; CTO e administradora; ou o papel que falta | "Abrir a decisão" → T11 |
| 9 | `pronta_para_decisao` com aprovado vigente | "Mudar o status para Aprovada e gerar o Pedido de Construção." | Uma pessoa (CTO ou administradora) | T11 do vigente |
| 10 | `aprovada` | "Gerar o Pedido de Construção e, quando a construção começar, mudar o status para Em construção." | idem | T11 do vigente |
| 11 | `em_construcao` | "Acompanhar a construção. Quando terminar, mudar o status para Entregue ou Devolvida pela construção." | idem | "Mudar o status" |
| 12 | `devolvida` | "Ler o motivo da devolução no histórico e voltar a demanda para Em construção ou Em análise." | idem | "Mudar o status" |
| 13 | qualquer outro caso | "Acompanhar a demanda." | "Sem responsável definido" | — |

O detalhe da linha 8 usa só o papel de quem aprovou ("O CTO já aprovou a opção A. Falta a aprovação da
administradora, com o identificador do documento assinado."), sem nome nem documento (03, 5.5; 04, D8).

- **Histórico**: `ol` com **todos** os eventos, "Do mais novo para o mais antigo.", cada item com o texto do evento,
  "Antes: … Depois: …" quando houver, ator e `<time>`. Textos de evento e ator sem mudança (03, 5.6).
- **Estados**: vazio (Especificação "Por fazer" atual, Próxima ação linha 4), carregando, erro e sucesso como hoje
  (03, 5.7).

### 4.5 Decisão, T11 (RF-11, RF-12; 03, seção 6)

**Regras dos três botões, nas duas larguras** (03, 6.4):

- Um formulário; botões `decisao-aprovar`, `decisao-devolver`, `decisao-arquivar`; o botão ativado define
  `statusDecisao` e segue `validarDecisao` → diálogo → `registrarDecisaoNoPainel`.
- Principal: "Aprovar a opção <X>" (opção fixada ou marcada); sem opção marcada, "Aprovar".
- "Devolver" e "Arquivar" com a consequência visível e ligada por `aria-describedby`: "Devolver: a demanda volta para
  Em análise." e "Arquivar: a demanda vai para Encerrada.".
- Pacote desatualizado: o principal diz "Aprovar", fica `aria-disabled` (continua focável) com "Indisponível: pacote
  desatualizado." visível; ativá-lo, inclusive por Enter, não valida, não abre diálogo e não envia; opções e documento
  não aparecem; revisão e comentários continuam.
- Enter num campo de texto envia pelo principal, passando por validação e diálogo. Foco no botão ativado antes do
  diálogo e de volta depois. Enviando: os três desabilitados e "Registrando…".
- Documento assinado (`pedeDocumento`): visível desde o início, rótulos "(obrigatório para aprovar)", **sem**
  `aria-required`; validado e enviado só na aprovação. Revisão (`exigeRevisao`): "(obrigatório)", com `aria-required`,
  obrigatória nas três ações.

**No computador** (a partir de 1200 px): cabeçalho com id, selos, `h1` "Decisão: <título>", linha com demanda, nível de
aprovação e criação, **linha nova "Repositório destino: <valor>"** e citações; alertas de hoje; à esquerda (3/5)
Aprovações, Resumo executivo, Recomendação, Opções e Revisão antes de decidir; à direita (2/5) o cartão "Registrar
decisão", não fixo, com opções em cartão, documento, revisão, comentários, consequências e os três botões; Pedido de
Construção na linha toda depois de aprovado. De 768 a 1199 px, uma coluna, sem rodapé fixo. A ordem do DOM é a mesma em
toda largura, com a revisão (C-14) antes do formulário (03, 6.2).

**Em 390 px (C2)** (03, 6.3):

- "‹ Voltar para a demanda" (só no celular), id do DEC em Mono, selos, `h1` de 22 px, nível, repositório destino,
  citações, alertas, Aprovações, Resumo executivo, Recomendação (rótulo de hoje), o recolhível "Ver vantagens,
  desvantagens e a revisão do pacote", e "Registrar decisão" com a frase da opção fixada ou as opções como cartões
  grandes, documento, revisão, comentários e consequências.
- **Nenhuma opção vem marcada** e não há selo "Recomendada" (01, RF-12; 04, CV-13).
- Rodapé fixo `AcoesDaDecisao` (`role="group" aria-label="Ações da decisão"`, dentro do `form`): principal de 48 px na
  largura toda, "Devolver" e "Arquivar" lado a lado de 44 px; 124 px de altura (150 px com a explicação de
  indisponível), respeita a área segura; o `main` ganha folga e `scroll-padding-bottom` do mesmo tamanho. Só existe com
  formulário; já decidido ou sem formulário, não há rodapé.
- O que fica fora do recolhível vale como **estreitado pela 04** (CV-12): sistema alvo, repositório destino, os três
  níveis de risco, nível de aprovação, selos de rascunho e todos os alertas sempre visíveis; dentro, só critérios de
  aceite, definição de pronto e o detalhe das opções (ver 7.3).

**Diálogo de confirmação**: o de hoje, sem mudança de texto (ação, repositório destino, nível); no celular, botões
empilhados na largura toda (03, 6.5). **Estados**: sem formulário, já decidido, carregando, erro de validação e 400
(`ResumoErros` com foco), erro 409/403/rede, desatualizado e sucesso, com os textos de `TEXTOS_DECISAO` sem mudança
(03, 6.6).

### 4.6 Telas públicas e demais telas (RF-13, RF-14; 03, seções 7 e 8)

- T01, T02, Sem permissão, erro e 404 da raiz: fundo `superficie`, conteúdo centralizado (máx. 440 px), marca clara
  acima do cartão (sem link em T01 e T02; link para `/demandas` nas outras). Dentro do cartão, tudo como hoje; QR da
  T02 `#000000` sobre `#ffffff` com 16 px de margem branca. O 404 do painel fica dentro da casca.
- T04, T06 a T10 e T12: cada `fieldset` ou `section` vira um cartão; formulário com até 760 px; interruptor da T12 com
  trilho `acao`/`tinta-suave`. Nenhum campo, ordem, texto ou condição muda.

### 4.7 Textos alterados (03, seção 9)

Além dos novos (casca, contadores, colunas, barra, Próxima ação, botões e "Repositório destino"), mudam três textos de
hoje: "Devolver para nova análise: …" vira "Devolver: a demanda volta para Em análise."; os rótulos do documento ganham
"(obrigatório para aprovar)"; a coluna "Criada em" vira "Idade". Ficam sem uso na T11 o rádio "Decisão" e o botão
"Registrar decisão" (o `h2` continua); não apagar as constantes sem conferir outros usos.

### 4.8 Acessibilidade (03, seção 10)

Comum a todas as telas: `lang="pt-BR"`, um `h1`, foco de 2 px com a cor da superfície, contraste da 4.1, alvo de 44
px, reflow em 320 px e zoom de 200 % e 400 %, espaçamento de texto ajustável, nada só por cor, axe sem violação em
1280 × 720 e 390 × 844. Pontos por tela:

| Tela | Pontos principais |
|---|---|
| Casca e gaveta | "Pular para o conteúdo" primeiro; foco no `h1` só na troca de tela; gaveta modal com foco preso e circular, Esc, retorno a "Menu", sem animação com movimento reduzido |
| T03 | Enter e Espaço nos contadores; foco no título do resultado; `aria-pressed`; `caption` oculta e `th scope="col"`; só tabela ou só lista na árvore; região rolável da tabela com `tabindex="0"` |
| T05 | "Nesta página" e "Mudar status" focam o `h2`; Próxima ação antes do conteúdo no Tab; `aria-current="step"`; histórico com `<time>`; id longo quebra sem reticência |
| T11 | nada focado sob a barra nem sob o rodapé (2.4.11); `fieldset`/`legend` nas opções; `aria-required` só na revisão; consequências e indisponível por `aria-describedby`; recolhível com `aria-expanded` |
| T01, T02, demais | os de hoje; colar e gerenciador de senha funcionam (3.3.8) |

## 5. Ameaças e controles

Modelo de ameaças em `04-seguranca-aplicacao.md`: STRIDE sobre C01 a C16 e as telas de 03, com OWASP Top 10 (2021),
ASVS 4.0.3 nível 2 e LGPD. Controles com prefixo **CV-**, para não colidir com C-01 a C-40, A-01 a A-04 e S-/M-/B-,
que continuam valendo e não podem ser afrouxados (04, Entrega).

**Conclusão da 04**: o desenho de 02 (ADR-13, sem `public/`, proxy e `next.config.ts` sem diff) atende à CSP **desde
que** a prova seja feita em execução (CV-03, CV-04), não só por leitura. Fora da CSP, os pontos de maior risco são a
T11 (integridade do que se aprova, CV-10 a CV-15) e as capturas versionadas no git (CV-17). Nenhuma devolução às
etapas anteriores.

### 5.1 Fronteiras tocadas (04, seção 1)

F1 navegador → app (telas novas, formulário da T11 com três botões); F3 texto do cliente e do agente em lugares novos;
F4 a recomendação do DEC é saída de modelo; **F8 novo**: registro npm → build → imagem (os pacotes de fonte vão para a
imagem final, que copia o `node_modules` inteiro); **F9 novo**: capturas PNG do e2e versionadas no git (sem expurgo).

### 5.2 Ameaças críticas e altas (04, seção 2)

| Componente | Ameaça | Nível | Controle |
|---|---|---|---|
| C05 Moldura pública | Mudança no fluxo de entrada ou 2FA "de carona" | crítica | CV-01, CV-20, C-05 |
| C10 Fila | Página reorganizada sem `exigirPessoaNaPagina` | crítica | C-04, CV-01 |
| C01, C02, C03 | `@import`/`url(` externo ou `next/font/google` abrindo carga de fora; `<style>` em linha "consertado" com `'unsafe-inline'` | alta | CV-01 a CV-04 |
| C02 | Pacote de fonte trocado ou com script de instalação | alta | CV-05 |
| C05 | Tela de erro mostrando detalhe; QR do 2FA em captura | alta | CV-17 (sem captura da T02) |
| C07 | Leitura antes da sessão; injeção SQL; retorno com título ou nome | alta | CV-06, CV-08 |
| C10, C12, C14 | XSS por título e textos de ESP/RSK/DEC nos cartões novos | alta | CV-18, C-18 |
| C12 | Leitura do DEC sem `autorizar` ou com id da URL | alta | CV-09 |
| C13 | O que se vê no diálogo difere do que se grava; Enter aprovando sem diálogo | alta | CV-10 |
| C13 | Aprovação de pacote desatualizado pelo botão `aria-disabled` | alta | CV-11 (e 409 do servidor) |
| C13 | Opção recomendada pelo agente marcada por padrão: injeção de instrução vira pré-escolha | alta | CV-13 |
| C13 | Revisão humana (C-14) recolhida no celular; exigência de hoje sumindo no layout | alta | CV-11, CV-12, CV-14 |
| C14 | Troca de classe que muda campo ou condição "de carona" | alta | CV-01, C-12 |
| C15, C16 | Asserção de segurança apagada; `bypassCSP`; captura com dado real | alta | CV-03, CV-17, CV-20 |

As médias e baixas (casca sem decisão de acesso, filtro da URL refletido, log da contagem, documento na URL, entre
outras) estão nas tabelas por componente da 04 e são cobertas por CV-07, CV-08, CV-09, CV-15, CV-16 e CV-19.

### 5.3 Controles exigidos (04, seção 3)

Todos são critério de aceite de alguma tarefa do plano, com teste em Vitest ou Playwright contra o build de produção e
dado fictício.

| Id | Nível | Controle |
|---|---|---|
| CV-01 | crítica | **Superfícies congeladas**: `git diff 198e97d` vazio em `src/proxy.ts`, `next.config.ts`, `src/app/api`, `src/db`, `drizzle`, `src/modules/acesso`, `src/worker`, `src/jobs`, `src/agents`, `src/lib/auth*`, `src/lib/qr.ts`, `src/lib/log.ts`, `src/lib/erros.ts`, `src/instrumentation.ts`, `pnpm-workspace.yaml` e nos nove `'use server'`; `src/proxy.test.ts` sem diff e verde |
| CV-02 | alta | **Sem recurso externo no código**: teste estático que reprova Google Fonts, `next/font/google`, `@import` com URL, `<link>`/`<script>` absolutos, `url(` em CSS, `style={`, `dangerouslySetInnerHTML` e `.style` da fonte; precisa ser visto falhando |
| CV-03 | alta | **CSP vigiada em execução**: fixture de `e2e/apoio.ts` reprova requisição a outra origem, evento `securitypolicyviolation` e mensagem de CSP no console; sem `bypassCSP`; nunca contra `next dev`; teste negativo com `test.fail()` prova que a fixture reprova |
| CV-04 | alta | **Fontes da mesma origem e de fato carregadas**: em T01, T03 e T11, família em `document.fonts` com `status === 'loaded'`; `@font-face` só com `/_next/static/media/*.woff2` ou `local()`; `content-type` `font/woff2` |
| CV-05 | alta | **Cadeia de suprimento das fontes**: versão exata, escopo `@fontsource` conferido letra a letra, `integrity` sha512 no lockfile, sem script de instalação, nenhum `.js` dos pacotes importado; diff do `package.json` só com 0.2.0 e as duas linhas; `pnpm audit --prod --audit-level high` limpo |
| CV-06 | alta | **Leituras da fila só de leitura, autorizadas e sem texto**: só `db.select`, filtros já validados, ids por `inArray`; retorno só com contagens e booleanos (teste com título-sentinela); módulo importado só pela página da T03, depois de `exigirPessoaNaPagina` e `autorizar` |
| CV-07 | média | **Filtro da URL não refletido cru**: campo oculto e `href` dos contadores só do enum validado; e2e com `?status=%3Cscript%3E` |
| CV-08 | média | **Log da falha da contagem sem dado**: `painel_contadores_falhou` sem filtro, SQL nem parâmetros (teste com sentinela) |
| CV-09 | média | **T05**: `autorizar('ler_pacote_decisao')` antes de ler o DEC, id tirado da demanda, nunca da URL; `dados-das-etapas.ts` só com `import type`; saída sem documento, comentário nem nome de aprovador |
| CV-10 | alta | **T11, o que se vê é o que se grava**: `v` montado uma vez do `submitter` (só `aprovada`, `devolvida`, `arquivada`); diálogo e envio do mesmo `v`; todo envio passa por validação e diálogo, inclusive Enter; e2e com opção B, com "Devolver" e com Enter |
| CV-11 | alta | **Aprovar indisponível não envia** (zero `POST` no e2e), o servidor segue com 409; A-03 e o aviso do C-28 mantidos nas duas larguras |
| CV-12 | alta | **Revisão humana visível no celular**: em 390 × 844, sem abrir nada, sistema alvo e repositório destino da ESP, três níveis do RSK, nível de aprovação, selos de rascunho e todos os alertas; o e2e do C-14 roda também em 390 px. **Estreita** o RF-12 de 01 e a 6.3 de 03 |
| CV-13 | alta | **Nenhuma opção pré-marcada** nas duas larguras, sem selo "Recomendada", principal diz "Aprovar" até a escolha |
| CV-14 | média | **Exigências da T11 iguais às de hoje**: revisão nas três ações; documento só para aprovar e ausente ao devolver ou arquivar; `dados-da-decisao.test.ts` sem asserção de regra trocada |
| CV-15 | média | **Nada digitado vai para a URL**: documento, data e comentários sem `name`; `form` sem `action` nem `method` |
| CV-16 | média | **Casca sem decisão de acesso**: nome e papel por prop do servidor; "Sair" é a função de hoje (POST com `Origin`), nunca link GET; e2e pelo botão da casca e da gaveta |
| CV-17 | alta | **Capturas sem dado real**: spec pulado no CI e fora de `127.0.0.1`/`localhost`; só seed fictício; sem captura da T02; cada PNG conferido na 08; captura real em commit é incidente (para e avisa Fabiano e `seguranca-informacao`) |
| CV-18 | alta | **Texto de terceiro só como texto** nos componentes novos (só expressão JSX; título isolado com `unicode-bidi: isolate` ou `<bdi>`); e2e do C-18 cobre cartão da T03 em 390 px, T05 e cabeçalho da T11 |
| CV-19 | média | **Links internos só de id validado** pelas regex de hoje ou âncora da página; teste de `proximaAcao` |
| CV-20 | alta | **Nenhum teste de segurança enfraquecido**: contagem de asserções **por arquivo**, nenhuma regra do axe desligada, `retries` e tempo-limite sem aumento, sem `bypassCSP` |

### 5.4 Dados pessoais (04, seção 4)

O pedido **não cria dado pessoal novo nem leitura nova de dado pessoal**; muda só onde o dado aparece. Nome do
solicitante nunca na fila nem na Próxima ação (D3); nome e papel da conta na casca, vindos da sessão (D6); na T05 só o
**papel** de quem aprovou (D8). O envio do IP de quem usa o painel ao Google pela carga de fonte **deixa de existir**
(D13). As capturas não são dado pessoal desde que só com o seed fictício (D14). Bases legais, retenção e expurgo
continuam os do pedido 0001.

### 5.5 O que o plano (05) precisa conter (04, seção 5)

1. Cada CV-01 a CV-20 como critério de aceite de uma tarefa.
2. A fixture de origem e CSP (CV-03, com o teste negativo) e o teste estático (CV-02) na **primeira** tarefa, antes de
   qualquer troca visual; fontes com CV-04 e CV-05 na tarefa das fontes.
3. Risco `alto` no `tarefas.json` para: fixture e teste estático; fontes; formulário da T11; leituras da fila;
   capturas.
4. CV-01 em toda revisão de tarefa e de novo na 08, com a lista dos nove arquivos `'use server'` por caminho no plano.
5. Na 08: `/security-review` com foco em CSP, T11 e capturas; audit limpo; diff de `package.json`, lockfile e
   `pnpm-workspace.yaml` linha a linha; cada PNG conferido; asserções contadas por arquivo.

## 6. Fora do escopo

- Busca por título ou id na fila (exige parâmetro novo no `filtroDemandasSchema` e na API) (01, seção 4).
- Item "Decisões pendentes" no menu com contador; o contador "Pronta para decisão" da T03 cobre o atalho (01).
- Subtítulos dos contadores do A1 ("1 rascunho de agente", "mais antiga: 3 dias"…): exigem agregações novas (01).
- "Ver histórico completo" com histórico cortado: a T05 mantém o histórico inteiro (01; 04, C12 R).
- Selo "Recomendada" e opção recomendada marcada ao abrir a T11: exigem campo estruturado no esquema (01; 04, CV-13).
  Ver P-01 em 7.1.
- Caixa de decisões da proposta C (C1) e o restante das propostas B e C (01).
- Modo escuro; e-mail E01 (01).
- Revisão dos textos pendentes da `ux-ui-design` do cap. 08 (QF-01 a QF-04, D-01 a D-06, 409 em status final, textos de
  0.1.10 a 0.1.13, os três avisos que a T11 ainda não mostra), salvo o que mudar pelo layout (01; 03, P-05).
- Monograma "W." e qualquer arquivo de logotipo oficial (01).
- Índice novo para a contagem: só se o `engenheiro-performance` medir necessidade, em outro pedido (exige migration)
  (02, seção 4).
- Imagem de produção só com dependências de produção (hoje o `node_modules` inteiro vai para a imagem) (04,
  Pendências).
- Dívida técnica observada (02, seção 11): `next` 16.4.1 sem ADR de troca de linha (registrar ADR ou atualizar o
  `padrao-tecnico.md` em pedido próprio); as linhas 9 a 12 do RF-09 espelham a máquina de status (expor de
  `transicoes.ts` uma descrição pura se ela crescer).
- Publicação em produção, serviço no Easypanel e configuração de produção: ações de Fabiano depois do PR (01; pedido).

## 7. Pendências

### 7.1 Para Fabiano

| ID | Pendência | Origem | Bloqueia? | Se não decidir agora |
|---|---|---|---|---|
| **P-01** | **Decisão**: quer a opção recomendada marcada ou com selo "Recomendada" na T11, como na C2? A ESP aprovada dizia "com a recomendada marcada", mas isso exige campo estruturado no DEC (esquema e migration, proibidos neste pedido): seria uma demanda nova. Parecer da 04 **contrário** a marcar por padrão; se vier o selo, o campo tem de ser preenchido ou confirmado por pessoa, nunca só pelo agente (C-25) | 01 P-01, 03 P-01, 04 seção 6 e CV-13 | Não | Nenhuma opção marcada, recomendação em texto visível antes das opções |
| **P-05 (01) / P-04 (03)** | **Ação (UAT)**: conferir a T11 em 390 px num iPhone com Safari: teclado virtual sobre o rodapé fixo, área segura, `<dialog>` e `:has()`; e que o rodapé não cobre alerta nem a caixa de revisão (reforço do CV-12). Os e2e rodam só no Chromium | 01 P-05, 02 ADR-15 e ADR-18, 03 P-04, 04 seção 5.7 | Não (depois do PR) | Comportamento no iOS fica sem prova |
| — | **Decisão**: publicação da 0.2.0 no ar, depois do PR com CI verde | pedido.json (risco); 01 seção 4 | — | Fica na main sem ir para produção |
| — | Só se acontecer: captura com dado real que chegue a commit é incidente (git sem expurgo); para, avisa Fabiano e `seguranca-informacao` | 04 CV-17, D14 | — | — |

### 7.2 Para outras áreas, sem bloquear a construção

| Pendência | Dono | Origem |
|---|---|---|
| O bloco "WS" da marca do A1 conversa com o manual §1.1, §2 e §2.8 ("WS" sozinho só existe dentro do monograma)? Se for vetado, a troca para o nome tipográfico (V4) é só de marcação e estilo na `Marca` | `marketing-comunicacao` | 01 P-02, 03 P-02 |
| Se a marca virar logotipo em arquivo, ele entra no bundle (SVG no JSX ou arquivo importado), nunca por URL externa (CV-02) | `marketing-comunicacao` | 04 |
| Comprovante de licença da marca (L-09 do manual) segue aberto; a licença das fontes (OFL 1.1) independe dele | `marketing-comunicacao` | 01 P-03, 02 |
| Listar por nome no plano `@fontsource/noto-sans` e `@fontsource/noto-sans-mono` (`pnpm add -D -E`): o engenheiro só adiciona pacote do padrão ou do plano | `tech-lead` (05) | 02 |
| Decidir em que passagem as nove capturas são geradas e consolidadas (o spec regrava os PNG a cada execução local) | `tech-lead` (05) | 02 ADR-19 |
| Escrever no plano os nove arquivos `'use server'` por caminho e os CV-01 a CV-20 como critérios, na ordem da 5.5 | `tech-lead` (05) | 04 seção 5 |
| Conferir pelo teste de unidade as razões de contraste calculadas à mão; par abaixo do mínimo volta à `ux-ui-design`, sem troca de cor por conta própria | `engenheiro-frontend` e `qa-automacao` | 03 P-03 |
| Rodar uma vez na 08 `pnpm audit --audit-level high` sem `--prod` (a imagem leva as `devDependencies`) ou registrar a lacuna para um pedido de imagem só com dependências de produção | `tech-lead` / `devops-sre` | 04 |
| As 5 vulnerabilidades moderadas anteriores (esbuild via drizzle-kit, `@vitest/mocker`, glob, minimatch) vão ao backlog de atualização; nenhuma roda no app em produção | `tech-lead` | 04 |
| Revisão dos textos pendentes do cap. 08 (QF-01 a QF-04, D-01 a D-06, 409, três avisos da T11) | `ux-ui-design` (próxima demanda de textos) | 03 P-05 |
| Nenhum risco residual novo deste pedido; os do 0001 e do M-1 do 0009 seguem com Fabiano | `gestao-riscos` | 04 |

Já respondidas dentro do pedido: origem das fontes (01 P-03 → 02 ADR-13, aprovado pela 04 com CV-05); arranjo da T11
no computador, textos das tabelas do RF-08 e RF-09 e rótulos curtos "Devolver"/"Arquivar" (01 P-04 → 03, 5.4, 5.5 e
6.2 a 6.4); valores finais dos tokens de estado, selo e foco e texto dos contadores sem total (02 → 03, 2.1 e 4.6);
conferência do `next/font/local` no build (02 → 04, CV-03 e CV-04, em execução).

### 7.3 Divergências entre as entregas

| Ponto | Entregas | Vale |
|---|---|---|
| O que pode ficar recolhido na T11 em 390 px | 01 RF-12 e 03 6.3 recolhem as seções de revisão; 04 CV-12 exige sistema alvo, repositório destino, níveis de risco, nível de aprovação, selos e alertas sempre visíveis | **04** (a própria 04 registra que estreita 01 e 03) |
| "Aprovar" indisponível | 02 ADR-18: `disabled`, o Enter não envia; 03 6.4: `aria-disabled`, focável | **03**, com a garantia do CV-11 da 04 (zero envio por clique, Enter ou Espaço) |
| Textos da barra e da Próxima ação | 01 RF-08/RF-09 dá textos como proposta para a 03 revisar; 03 troca "Desatualizado" por "Pacote desatualizado" e reescreve as linhas 2, 12 e 13 | **03** para texto; condições e ordem de **01** |
| Fontes em `public/` e "OFL.txt junto dos arquivos" | ESP e 01 RF-02/RNF-06 admitem `public/`; 02 ADR-13 descarta (`public/` não entra na imagem) e troca a conferência manual pelo `fontes.test.ts` com a licença do pacote | **02** |
| Alvo de toque a partir de 768 px | 01 RNF-03: ≥ 24 px; 03 2.4: 44 px em toda largura | **03** é mais rígida e cabe no RNF-03 |
| Nomes dos tokens de cor | 02 ADR-14: manter os nomes semânticos de hoje (`texto`, `primaria`, `borda`…) apontando para a paleta; 03 2.1: mapa para o engenheiro trocar as classes pelos nomes novos (`tinta`, `acao`, `tinta-suave`…) "sem sobrar classe antiga" | **Sem decisão nas entregas**: resolver no plano (`tech-lead`, 05). Pelo 02, a regra de nome é do ADR-14 e os valores são da 03 |
| Mecanismo do recolhível | 02 ADR-18 e seção 1: `<details>`/`<summary>`; 03 2.6: componente `Recolhivel` (botão com `aria-expanded`, que some a partir de 768 px) | **Sem decisão nas entregas**: resolver no plano (`tech-lead`, 05) |
| Arranjo de duas colunas da T05 | 01 RF-10: lateral em 1280 px e uma coluna abaixo de 768 px; 03 5.2: duas colunas só a partir de 1200 px | **03** (compatível com os CA de 01, medidos em 1280 e 390 px) |
