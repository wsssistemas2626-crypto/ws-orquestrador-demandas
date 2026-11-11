---
pedido: DEC-DEM-20261110-0015-v1
etapa: 02-arquitetura
agente: arquiteto-solucoes
leu: [pedido.json, 01-analista-requisitos.md, padrao-tecnico.md, contrato-passagem.md, package.json, Dockerfile, .dockerignore, next.config.ts, playwright.config.ts, docs/manual-tecnico/01-arquitetura.md, docs/construcao/DEC-DEM-20261022-0001-v1/02-arquiteto-solucoes.md (seções 5 e 10), src/proxy.ts, src/app/layout.tsx, src/app/globals.css, src/app/(painel)/layout.tsx, src/components/CabecalhoPainel.tsx, src/components/DialogoConfirmacao.tsx, src/components/Selo.tsx, src/app/(painel)/demandas/page.tsx, src/app/(painel)/demandas/fila.tsx, src/app/(painel)/demandas/[id]/page.tsx, src/app/(painel)/demandas/[id]/demanda-da-pagina.ts, src/app/(painel)/pacotes-decisao/[decId]/FormularioDecisao.tsx, src/modules/demandas/consultas.ts, src/modules/acesso/matriz.ts, .claude/agents/engenheiro-frontend.md e .claude/agents/tech-lead.md (lista Pode)]
status: pronto
proximo: seguranca-aplicacao
devolvido_para: null
---

## Entrega

### 0. Escopo desta arquitetura

Reforma da camada de apresentação de um sistema que já está no ar (0.1.13, main 198e97d). O desenho parte do monólito
modular de hoje (ADR-01 a ADR-12, cap. 01 do manual) e não mexe em nada do servidor além de **duas leituras novas, só
SELECT**, para a fila, e de **uma leitura que já existe** (`obterPacoteDecisao`) chamada também pela T05. Não há rota de
API, Server Action, esquema, migration, papel, permissão, job ou cabeçalho novo ou alterado (RF-15). Os ADRs deste
pedido continuam a numeração do sistema: ADR-13 a ADR-19.

### 1. Visão da solução

```mermaid
flowchart TB
  subgraph Navegador
    H[html com as classes das fontes] --> CP[Casca do painel]
    CP --> ML[Menu lateral, de 768 px]
    CP --> GV[Gaveta dialog, abaixo de 768 px]
    CP --> M[main#conteudo]
    M --> T03[T03 fila: contadores, tabela ou cartões]
    M --> T05[T05 demanda: barra de etapas, próxima ação]
    M --> T11[T11 decisão: um formulário, três botões, rodapé fixo abaixo de 768 px]
    MP[Moldura pública] --> T01[T01, T02, sem permissão, erro, 404]
  end
  subgraph app Next
    TK[globals.css: tokens no @theme] -.-> H
    FT[fontes.ts: next/font/local] -.->|/_next/static/media, mesma origem| H
    PG[páginas: exigirPessoaNaPagina + autorizar] --> RE[dados-*.ts: regras de exibição puras]
    PG --> RF[resumo-da-fila.ts: 2 SELECT novos]
    PG --> MOD[módulos de hoje, sem mudança]
  end
  RF --> DB[(Postgres 16)]
  MOD --> DB
  NPM[(registro npm, só no install)] -.->|@fontsource, lockfile| FT
```

Princípios que guiam o desenho:

1. **Uma fonte para cada coisa.** Cor, fonte, raio, foco e alturas fixas vivem só no `@theme` de `globals.css`. Regra
   de exibição vive só numa função pura em `src/components/dados-*.ts`. Regra de negócio continua só em `src/modules/`.
2. **Responsivo por CSS, não por script.** Cada tela tem um só DOM; a largura só muda o arranjo (media query do
   Tailwind, `md:` = 768 px). A exceção é a gaveta, que precisa de estado aberto ou fechado.
3. **Nada de fora.** Nenhuma requisição a outra origem, nem no navegador nem no `next build`. A CSP de hoje fica
   byte a byte.
4. **Nenhuma dependência de interface em tempo de execução** (RNF-10). Diálogo, recolhível e foco usam os elementos
   nativos (`<dialog>`, `<details>`), como o `DialogoConfirmacao` já faz.

### 2. Componentes e responsabilidades

| Id | Componente | Caminho | Responsabilidade | Roda em |
|---|---|---|---|---|
| C01 | Tokens | `src/app/globals.css` | Única fonte de cor (paleta do manual, estados, selos, foco), famílias, raios, espaços e alturas fixas (`--altura-cabecalho`, `--altura-rodape`); base, foco visível, `prefers-reduced-motion` | CSS |
| C02 | Fontes | `src/app/fontes.ts` (novo), aplicado em `src/app/layout.tsx` | `next/font/local` com Noto Sans 400/600/700/800 e Noto Sans Mono 400/600 (subconjunto latin do `@fontsource`), `display: 'swap'`, variáveis `--font-noto-sans` e `--font-noto-sans-mono` no `<html>` (ADR-13) | build |
| C03 | Marca | `src/components/marca/MarcaWs.tsx` (novo) | Bloco "WS" + "Orquestrador de Demandas" em HTML/CSS, sem imagem nem script; variante sobre marinho e sobre claro; como link, nome acessível "WS Orquestrador de Demandas" | servidor |
| C04 | Casca do painel | `src/components/casca/` (novo): `CascaPainel.tsx`, `MenuLateral.tsx`, `GavetaMenu.tsx`, `BotaoSair.tsx`, `FocoNaTrocaDeTela.tsx`, `navegacao.ts`; usada por `src/app/(painel)/layout.tsx` | Grade menu + conteúdo; "Pular para o conteúdo" como primeiro focável; avisos da moldura; `main#conteudo`. `navegacao.ts` guarda `LINKS` e `ehPaginaAtual` (mesma assinatura e testes de hoje). O foco no `h1` ao trocar de tela fica num componente só, para não rodar duas vezes (menu e gaveta). Substitui `CabecalhoPainel.tsx` (ADR-15) | servidor + cliente |
| C05 | Moldura pública | `src/components/casca/MolduraPublica.tsx` (novo) | Marca, cores e fontes, sem menu, para T01, T02, `/sem-permissao`, `src/app/error.tsx` e o 404 da raiz (RF-13). Só marcação: sem leitura, sem estado | servidor e cliente (o `error.tsx` é cliente) |
| C06 | Selo | `src/components/Selo.tsx` | Troca o mapa de classes da paleta do Tailwind por classes de token (`bg-selo-<cor>-fundo`, `text-selo-<cor>-texto`). `CorSelo`, `COR_STATUS`, `COR_DECISAO` e os selos fixos de `rotulos.ts` não mudam de valor | servidor |
| C07 | Leituras da fila | `src/modules/demandas/resumo-da-fila.ts` (novo) | `contarDemandasPorStatus(db, filtro)` e `etapasDasDemandas(db, ids)`, só SELECT, sem tocar `listarDemandas`, `DemandaResumo` nem `GET /api/demandas` (ADR-16) | servidor |
| C08 | Regras de exibição da fila | `src/components/dados-da-fila.ts` (novo) | `contadoresDaFila(contagem, filtro)` (rótulo, total, `pressionado`, `href` por `hrefDaFila` com `offset` zerado), `idadeDaDemanda(criadaEm, agora)` (dias de calendário por `dataIsoSaoPaulo`), `textoDasEtapas(etapas)` ("Etapas: ESP feita, RSK feita, DEC por fazer") | servidor e cliente |
| C09 | Contadores | `src/app/(painel)/demandas/ContadoresDaFila.tsx` (novo) | Grupo com nome acessível; botões com `aria-pressed`; ativar navega pelo mecanismo de hoje (`pedirFocoNoResultado`, senão `router.push`), que já leva o foco ao resultado e anuncia o total | cliente |
| C10 | Fila | `src/app/(painel)/demandas/page.tsx`, `fila.tsx`, `CartoesDaFila.tsx` (novo) | A página chama C07 depois do `autorizar(pessoa, 'listar_demandas')` que já faz. Tabela densa a partir de 768 px e lista de cartões abaixo, as duas renderizadas no servidor, uma com `display: none` por largura. Um só alvo de foco do resultado (ver Decisões) | servidor |
| C11 | Regras de exibição da demanda | `src/components/dados-das-etapas.ts` (novo) | `etapasDaDemanda(demanda, espMaisNova, pacoteMaisNovo, historico)` (tabela do RF-08) e `proximaAcao(...)` (tabela do RF-09, primeira linha que casa). Funções puras; só importam tipos de `src/modules/`; chamadas só por página (CA-09.4; ADR-17) | servidor |
| C12 | Detalhe da demanda | `src/app/(painel)/demandas/[id]/page.tsx`, `BarraDeEtapas.tsx` e `CartaoProximaAcao.tsx` (novos) | Arranjo A2 sem perder seção (RF-10). Quando há DEC, `autorizar(pessoa, 'ler_pacote_decisao')` e `obterPacoteDecisao(deps.db, <DEC mais novo>)` para as aprovações, antes de C11 | servidor |
| C13 | Decisão | `src/app/(painel)/pacotes-decisao/[decId]/page.tsx`, `FormularioDecisao.tsx`, `RevisaoDoPacote.tsx` | Um formulário só; três botões `type="submit"` com `name="acao"`; o `onSubmit` lê `SubmitEvent.submitter` para definir `statusDecisao` e segue com `validarDecisao`, diálogo e `registrarDecisaoNoPainel` de hoje. Rodapé fixo abaixo de 768 px só por CSS; recolhíveis com `<details>` (ADR-18) | cliente |
| C14 | Demais telas | T04, T06 a T10, T12 | Só classes e tokens; nenhum campo, ordem, texto de regra ou condição muda (RF-14) | — |
| C15 | Testes | `e2e/apoio.ts`, `e2e/axe-todas.spec.ts`, specs novos de gaveta, contadores, decisão em 390 px e capturas; `test/estatico/contraste-tokens.test.ts`, `test/estatico/fontes.test.ts`; unidade de C08 e C11; integração de C07 | Ver ADR-19 | Vitest, Playwright |
| C16 | Versão e docs | `package.json` (0.2.0), `CHANGELOG.md`, `docs/manual-tecnico/08-painel.md`, `docs/manual-tecnico/capturas/` | RF-17 | — |

Dono de cada componente novo: o `tech-lead` do pedido até o merge; depois, o sistema (Fabiano), como o resto do
painel. Como se observa e plano de falha: seção 6.

### 3. Rastreabilidade RF → componente

| RF | Componente responsável | Observação |
|---|---|---|
| RF-01 Tokens | C01, C06 | `test/estatico/contraste-tokens.test.ts` cobre RNF-01 e RNF-02 |
| RF-02 Fontes | C02, C01 | ADR-13; `test/estatico/fontes.test.ts` cobre RNF-06 |
| RF-03 Casca | C04, C03 | ADR-15 |
| RF-04 Gaveta | C04 (`GavetaMenu.tsx`) | ADR-15 |
| RF-05 Contadores | C07, C08, C09 | ADR-16 |
| RF-06 Tabela densa | C07, C08, C10 | ADR-16 |
| RF-07 Cartões | C10 | |
| RF-08 Barra de etapas | C11, C12 | ADR-17 |
| RF-09 Próxima ação | C11, C12 | ADR-17 |
| RF-10 Detalhe A2 | C12 | |
| RF-11 Decisão por botões | C13 | ADR-18 |
| RF-12 Decisão C2 | C13, C01 | ADR-18 |
| RF-13 Telas públicas | C05, C03 | |
| RF-14 Demais telas | C14, C04 | |
| RF-15 Superfícies que não mudam | C07 (só SELECT); guarda: CA-15.1 a CA-15.4 na revisão | Seção 7 |
| RF-16 Testes | C15 | ADR-19 |
| RF-17 Versão, CHANGELOG, manual, capturas | C16, C15 (spec de capturas) | ADR-19 |

### 4. Modelo de dados preliminar

**Nenhuma entidade, coluna, índice ou migration nova.** As tabelas lidas são as de hoje: `demanda`,
`especificacao_tecnica`, `parecer_risco`, `pacote_decisao`, `aprovacao`, `decisao`, `evento` (relações de hoje:
demanda 1-N ESP, RSK e DEC; DEC 1-N aprovação; DEC 1-0..1 decisão; demanda 1-N evento).

Modelos de leitura novos (tipos TypeScript, não tabelas):

| Tipo | Onde | Forma | Origem |
|---|---|---|---|
| `ContagemPorStatus` | C07 | `{ porStatus: Record<Status, number>; todas: number }`; status sem demanda vale 0; `todas` é a soma | 1 SELECT: `status, count(*) from demanda where [tipo = $1] and [linha_servico_provavel = $2] group by status` (o filtro de status da URL é ignorado; os de tipo e linha, aplicados) |
| `EtapasDaFila` | C07 | `Map<idDemanda, { esp: boolean; rsk: boolean; dec: boolean }>` | 1 SELECT: `id, exists(ESP da demanda), exists(RSK), exists(DEC) from demanda where id = any($ids)`, com os ids da página (no máximo `limit`); lista vazia não consulta |
| `ContadorDaFila` | C08 | `{ status: Status \| null; rotulo; total: number \| null; pressionado; href }` | C07 + filtro da URL |
| `EtapaDaDemanda` | C11 | `{ numero: 1..5; nome; idVersao: string \| null; estado: <lista fechada do RF-08>; atual: boolean }` | `DemandaVista`, ESP mais nova, `PacoteDecisaoVista` do DEC mais novo, histórico |
| `ProximaAcao` | C11 | `{ linha: 1..13; oQueFalta; quemAge; link: { rotulo; href } \| null }` | as mesmas fontes |

Índices que servem as consultas novas, todos existentes: `especificacao_tecnica_demanda_versao_unique`,
`parecer_risco_demanda_versao_unique` e `pacote_decisao_demanda_versao_unique` (começam por `demanda_id`, atendem o
`exists`); `demanda_tipo_criada_idx` e `demanda_linha_criada_idx` (filtro da contagem). No volume previsto (200
demandas por mês), a contagem por `group by` é varredura pequena; índice novo só se o `engenheiro-performance` medir
necessidade, e aí em outro pedido (exige migration).

Custo por carga de `/demandas` (RNF-09): hoje 2 consultas (página + total). Agora 4: + contagem + etapas. Fixo,
qualquer que seja o número de linhas (sem N+1).

### 5. Integrações externas

Este pedido **não cria integração externa** e não altera as que existem.

| Integração | Uso | Tempo limite | Comportamento de falha | Muda neste pedido? |
|---|---|---|---|---|
| API Anthropic | agentes, só no worker | 120 s por chamada, nova tentativa da aplicação (ADR-07) | como na 0.1.13 (DEC-0001, seção 5) | Não |
| Resend | aviso de DEC pronto | 10 s | como na 0.1.13 | Não |
| Sentry | erros | padrão do SDK, assíncrono | falha de envio ignorada | Não |
| Google Fonts | — | — | **Não existe**: nem no navegador nem no `next build` (ADR-13) | — |
| Registro npm (`@fontsource/noto-sans`, `@fontsource/noto-sans-mono`) | só no `pnpm install` (desenvolvimento, CI, estágio `deps` da imagem) | o do pnpm | falhou: `pnpm install --frozen-lockfile` falha, o build não sai e nada muda em produção. Integridade pelo hash do `pnpm-lock.yaml`. Em execução, nenhum acesso | Novo pacote, mesmo canal de hoje |

Interna, para registro: as três leituras novas da página herdam o `statement_timeout` de 10 s do papel da aplicação.
Falha de cada uma:

| Leitura | Falhou | Por quê |
|---|---|---|
| Contagem (C07) | log `painel_contadores_falhou` (pino, sem dado pessoal); os contadores aparecem **sem o total** e continuam filtrando; a lista segue | o contador é atalho; não pode derrubar a fila |
| Etapas (C07) | dentro do mesmo `try` de `listarDemandas`: vale o estado de erro de hoje (`painel_fila_falhou`, "Tentar de novo") | linha sem etapa seria informação errada, não informação faltando |
| DEC mais novo na T05 (C12) | sobe para a tela de erro, como as outras leituras da T05 hoje | "Decisão pendente" no lugar de "1 de 2 aprovações" seria informação errada |

### 6. Observabilidade, dono e plano de falha dos componentes novos

| Componente | Como se observa | Plano de falha |
|---|---|---|
| C02 Fontes | `test/estatico/fontes.test.ts` (existência, assinatura `wOF2`, soma ≤ 300 KB, licença OFL no pacote); e2e CA-02.2 (família computada) | arquivo ausente quebra o `pnpm build` (falha cedo, no CI); no navegador, `display: swap` + fallback `system-ui` / `ui-monospace` |
| C04 Gaveta | e2e CA-04.1 a CA-04.5 | sem script, o botão "Menu" não abre a gaveta; o "Pular para o conteúdo" e os links da T03 continuam (o painel já exige script para Server Actions) |
| C07 | log `painel_contadores_falhou`; o erro da fila de hoje | tabela da seção 5 |
| C09, C13 | e2e; o `ResumoErros` e os alertas de hoje | o servidor continua a única regra (`registrarDecisaoNoPainel`, `autorizar`) |
| CSP e origem | fixture automática de `e2e/apoio.ts` (ADR-19): falha o teste com requisição a outra origem ou com mensagem de console de violação de CSP | nada a degradar: violação é defeito de build |

### 7. Invariantes de segurança para a etapa 04

- `src/proxy.ts` e `next.config.ts` sem diff. A CSP continua `default-src 'self'` sem `style-src`, `font-src` ou
  `img-src` próprios. As fontes saem de `/_next/static/media/<hash>.woff2`, fora do `matcher` do proxy e com o cache
  imutável do Next.
- Nenhum `style=`, `dangerouslySetInnerHTML`, `<link>` ou `@import` externo. Em CSS, nenhum `url(` escrito à mão: o
  único `url(` do bundle é o gerado pelo `next/font`. Nada de `data:` em CSS (a CSP bloqueia `data:` em imagem): ícones,
  marcas de etapa e marcação de rádio ou caixa são SVG embutido no JSX ou CSS puro.
- `public/` não é usado: o estágio final do `Dockerfile` não o copia, e o proxy poria `no-store` e CSP em arquivos de lá.
- Sem diff em `src/app/api/`, `src/db/`, `drizzle/`, `src/modules/acesso/`, `src/worker/`, `src/jobs/`, `src/agents/`,
  `src/lib/auth*`, `src/lib/qr.ts` e nos arquivos com `'use server'` (CA-15.1). Em `src/modules/` só entra
  `resumo-da-fila.ts` (e seu teste), só SELECT (CA-15.2).
- A T11 não pula o diálogo de confirmação em nenhum caminho: o Enter num campo de texto aciona o botão padrão do
  formulário (o primeiro `submit` do DOM, "Aprovar…"), que passa por `validarDecisao` e abre o diálogo; com "Aprovar"
  indisponível, o Enter não envia nada (ADR-18).
- Os pacotes de fonte não têm script de instalação nem código executável; o pnpm 12 já não roda script de dependência
  sem permissão explícita. Não há chave de `onlyBuiltDependencies` nova.

### 8. Porta de desenvolvimento

**3101**, a que o sistema já usa (`pnpm dev`, `pnpm start`, e2e local). Diferente de 3000 e **livre** em `ss -ltn` em
10/11/2026 (em escuta só 22, 53, 80, 443, 2377, 3000, 7946 e portas altas em 127.0.0.1). Homologação de 3200 a 3299,
sem mudança. Postgres de desenvolvimento em `127.0.0.1:5434`, sem mudança.

### 9. ADRs

#### ADR-13. Fontes Noto por `next/font/local` a partir do pacote `@fontsource` (desvio do padrão: pacote novo)

- Contexto: a ESP exige Noto Sans e Noto Sans Mono servidas pelo próprio app, sem chamada ao Google Fonts e sem domínio
  novo na CSP. O RNF-10 só aceita dependência nova se for o pacote de fonte, com ADR. O padrão técnico não tem fonte
  definida. O estágio final do `Dockerfile` copia `.next`, `src`, `scripts` e `drizzle`, mas **não** `public/`. O
  `matcher` do proxy exclui só `_next/static`, `_next/image` e `favicon.ico`. O engenheiro do pedido pode rodar
  `pnpm add` de pacote do plano, mas não baixa arquivo por `curl`, `npm pack` nem copia binário.
- Opções: (a) `next/font/google`: o próprio Next baixa do Google no `next build`; (b) arquivos `woff2` em `public/` com
  `@font-face` à mão; (c) `woff2` versionados em `src/app/fontes/`; (d) `@fontsource/noto-sans` e
  `@fontsource/noto-sans-mono` como `devDependencies` de versão exata, com `next/font/local` apontando os arquivos do
  subconjunto `latin` dentro do pacote.
- Decisão: (d). Seis arquivos: Sans `latin-400`, `latin-600`, `latin-700`, `latin-800` e Mono `latin-400`,
  `latin-600`, todos `normal`. `display: 'swap'`; `adjustFontFallback: 'Arial'` na Sans e `false` na Mono; fallback
  `system-ui, sans-serif` e `ui-monospace, monospace`. As famílias entram no `@theme inline` de `globals.css` como
  `--font-sans: var(--font-noto-sans), system-ui, sans-serif` e `--font-mono: var(--font-noto-sans-mono), ui-monospace,
  monospace`. A versão exata fica no `package.json` e no CHANGELOG.
- Consequências: nenhuma requisição externa, nem no build; CSP sem mudança; fontes com hash, cache imutável e
  `preload` da mesma origem; integridade pelo lockfile; atualização = trocar a versão do pacote. A licença (OFL 1.1)
  viaja no pacote (`LICENSE`), junto dos arquivos; o `test/estatico/fontes.test.ts` confere os seis caminhos, a
  assinatura `wOF2`, a soma ≤ 300 KB e que a licença do pacote é a OFL, o que substitui a "conferência dos arquivos no
  repositório" do RNF-06. Custos: o caminho relativo até `node_modules/@fontsource/...` depende do leiaute do pnpm (se
  quebrar, o `pnpm build` falha no CI, não em produção); o `pnpm audit --prod` não cobre `devDependencies` (aceitável:
  o pacote só tem CSS e `woff2`, sem código); só o subconjunto `latin` (cobre todo o pt-BR, aspas, travessão e
  reticências; glifo fora dele cai no fallback). Descartadas: (a) põe o Google Fonts no caminho do build e do CI, deixa
  o build dependente de rede externa e contraria o item (6) da ESP; (b) em produção as fontes dariam 404 (o `public/`
  não entra na imagem final) e ainda levariam `no-store` e CSP do proxy, sem `preload` nem fallback métrico; (c) seria o
  ideal sem dependência, mas o binário não tem como entrar no repositório dentro da lista Pode do engenheiro, e a
  origem ficaria documentada à mão, sem hash conferido.

#### ADR-14. Tokens no `@theme` de `globals.css`, com os nomes semânticos de hoje apontando para a paleta da marca

- Contexto: RF-01 quer tudo em variáveis CSS num só arquivo e cada cor do manual com variável de valor exato. Hoje o
  painel usa nomes semânticos (`texto`, `texto-suave`, `fundo`, `fundo-suave`, `borda`, `primaria`, `perigo`,
  `sucesso`, `atencao-*`) em todas as telas, e o `Selo` usa a paleta do Tailwind. Contas de contraste: Azul de ação
  `#1a6ae0` sobre Marinho `#12385f` dá cerca de 2,4:1 (abaixo dos 3:1 do RNF-02 para indicador de foco); Linha
  `#dfe4ea` sobre branco não chega a 3:1 (não serve para borda de campo).
- Opções: (a) paleta da marca como tokens de valor exato e os nomes semânticos de hoje redefinidos por `var()` para
  ela; (b) renomear tudo para os nomes da marca em todas as telas; (c) tema em arquivo TypeScript.
- Decisão: (a). Tokens da marca (`--color-marinho`, `--color-azul-acao`, `--color-azul-texto`, `--color-azul-claro`,
  `--color-tinta`, `--color-tinta-media`, `--color-superficie`, `--color-azul-nevoa`, `--color-linha`,
  `--color-branco`, estados) com o valor do manual; semânticos por `var()`; tokens próprios de foco por fundo
  (`--color-foco` no claro, `--color-foco-sobre-marinho` no menu, que não pode ser o Azul de ação); `--color-borda`
  (campo, ícone que informa) nunca é a Linha, que fica só para divisória decorativa; selos como pares
  `--color-selo-<cor>-fundo` e `--color-selo-<cor>-texto` para as dez chaves de `CorSelo`. Os valores finais de estado,
  selo e foco são da `ux-ui-design` (etapa 03); a regra de quem pode ser usado onde é esta.
- Consequências: o diff das telas fica pequeno (as classes `text-primaria`, `border-borda` etc. continuam), o que
  reduz o risco de regressão em 12 telas. `test/estatico/contraste-tokens.test.ts` lê o bloco `@theme` e calcula cada
  par declarado (texto ≥ 4,5:1, não textual ≥ 3:1). Custo: duas camadas de nome (marca e semântico); quem cria tela
  nova usa o semântico. (b) descartada por mexer em toda classe de toda tela sem ganho para o usuário; (c) por criar
  segunda fonte de verdade e não atender o CA-01.3.

#### ADR-15. Casca com menu lateral e gaveta em `<dialog>` nativo

- Contexto: RF-03 e RF-04 pedem menu lateral a partir de 768 px e, abaixo, gaveta modal com foco preso, conteúdo
  atrás inerte, Esc, "Fechar menu" e foco de volta ao "Menu". O RNF-10 proíbe biblioteca de interface. O
  `DialogoConfirmacao` já usa `<dialog>` com `showModal()`.
- Opções: (a) `<dialog>` nativo com `showModal()`, mais volta do Tab feita à mão no primeiro e no último focável e
  devolução explícita do foco; (b) `div role="dialog"` com `inert` e prisão de foco à mão; (c) biblioteca
  (focus-trap, Radix).
- Decisão: (a). Os itens do menu, a conta e "Sair" saem de um componente só, usado pelo menu lateral e pela gaveta.
  O menu lateral é `hidden md:flex`; a barra superior com "Menu" é `md:hidden`; a gaveta fecha sozinha quando a largura
  passa a 768 px (`matchMedia('(min-width: 768px)')`). Ao ativar um item, a gaveta fecha antes da navegação; o foco
  no `h1` da tela nova vem do `FocoNaTrocaDeTela`, que roda depois e prevalece sobre a devolução ao "Menu".
- Consequências: inércia do fundo, camada de topo e Esc vêm do navegador; prisão do Tab e devolução do foco ficam
  explícitas porque o Chromium deixa o Tab sair do diálogo modal para a interface do navegador (o CA-04.2 mede isso).
  Há dois `<nav aria-label="Principal">` no DOM, mas só um exposto por vez (diálogo fechado e `display: none` saem da
  árvore de acessibilidade); os `id` são distintos. Custo: o comportamento do `<dialog>` no Safari do iOS só é
  conferido no UAT (P-05 do 01). (b) descartada por refazer à mão o que o navegador dá; (c) pelo RNF-10.

#### ADR-16. Contadores e etapas da fila por leitura nova e separada, só SELECT

- Contexto: RF-05 e RF-06 precisam do total por status (com tipo e linha aplicados, sem o status) e das marcas ESP,
  RSK, DEC por linha. `DemandaResumo` e `listarDemandas` alimentam também `GET /api/demandas`, que a ESP congela.
  RNF-09: no máximo 2 consultas a mais, sem N+1.
- Opções: (a) estender `DemandaResumo`; (b) consulta por linha; (c) contar no cliente; (d) módulo novo com duas
  consultas fixas.
- Decisão: (d), em `src/modules/demandas/resumo-da-fila.ts`, chamado só pela página da T03 depois do `autorizar` de
  `listar_demandas`. Recebe `db` (injetável), para o teste de integração contar as consultas com 20 e com 100
  demandas.
- Consequências: API intocada; custo fixo de +2 consultas. A contagem e a lista são consultas separadas e podem
  divergir se uma demanda mudar de status entre as duas (milissegundos; a próxima carga corrige; não é regra, é número
  de atalho). Falha da contagem isolada (seção 5). (a) descartada por mudar a API; (b) pelo RNF-09; (c) porque o
  cliente só vê os 20 itens da página.

#### ADR-17. Barra de etapas e próxima ação como funções puras de exibição, chamadas só por página

- Contexto: RF-08 e RF-09 trazem tabelas fechadas de condição; a ESP proíbe regra de negócio nova. O sistema já guarda
  regra de exibição em `src/components/dados-*.ts` (ex.: `dados-da-decisao.ts`), com teste de unidade.
- Opções: (a) funções puras em `src/components/dados-das-etapas.ts`; (b) função em `src/modules/demandas/`; (c) lógica
  dentro do JSX.
- Decisão: (a). Entram só dados já lidos; saem texto e aparência; não importam nada que grave nem `autorizar`. O
  `switch` sobre `Status` e sobre o estado do DEC é exaustivo (`never` no padrão), para o `typecheck` acusar status
  novo.
- Consequências: teste de unidade por linha das duas tabelas (CA-08.4, CA-09.3) e revisão simples (CA-09.4). Custo: as
  linhas 9 a 12 do RF-09 repetem conhecimento da máquina de status (`transicoes.ts`); se a máquina mudar, a função
  precisa mudar junto. A exaustividade e os testes reduzem esse desvio. (b) descartada porque `src/modules/` é regra e
  a revisão do CA-15.2 não aceita lógica nova lá; (c) por não ter teste de unidade.

#### ADR-18. T11 com um formulário, três botões de envio e arranjo só por CSS

- Contexto: RF-11 troca o rádio "Decisão" + "Registrar decisão" por "Aprovar a opção X", "Devolver" e "Arquivar", nas
  duas larguras; RF-12 pede o arranjo C2 abaixo de 768 px com rodapé fixo de até 160 px que nunca cobre o foco. As
  funções `valoresDaDecisao`, `validarDecisao`, `entradaDaDecisao`, `errosDaApiDecisao` e `textoDoDialogo` não mudam.
- Opções: (a) um formulário, três `<button type="submit" name="acao" value="aprovada|devolvida|arquivada">`, com o
  `onSubmit` lendo `ev.nativeEvent.submitter`; arranjo e rodapé fixo só por CSS; (b) dois formulários, um por largura;
  (c) árvore diferente por largura escolhida em script (`matchMedia`); (d) `onClick` que grava o estado e chama
  `requestSubmit()`.
- Decisão: (a). No envio: `const v = { ...valores, statusDecisao: <valor do submitter> }`; valida `v`; com erro, mostra
  o resumo; sem erro, grava `v` no estado, devolve o foco ao botão acionado e abre o diálogo, que lê o estado já
  atualizado. Rodapé: `max-md:fixed max-md:bottom-0`, existe só enquanto há formulário; `scroll-padding-bottom` igual a
  `--altura-rodape` aplicado por `@media (max-width: 767px) { :root:has(#rodape-da-decisao) { … } }` e `padding-bottom`
  do `main` do mesmo tamanho. Vantagens, desvantagens, "quando escolher" e seções de revisão recolhíveis por
  `<details>`/`<summary>`; nível de aprovação, repositório destino e alertas nunca dentro de `<details>`. Nenhuma opção
  marcada ao abrir.
- Consequências: um só DOM, sem `id` duplicado, sem diferença entre servidor e cliente na hidratação; a regra continua
  no servidor. O Enter num campo de texto aciona o primeiro `submit` do DOM (o principal), que valida e abre o diálogo
  (C-14 mantido); com "Aprovar" indisponível (`disabled`), o Enter não envia nada. Custos: `:has()` pede Safari 15.4 ou
  mais novo (UAT, P-05 do 01); se o Chromium não respeitar o `scroll-padding` ao focar por Tab (o CA-12.3 mede), o
  plano B é um `focusin` no formulário que chama `scrollIntoView({ block: 'nearest' })` com a margem do rodapé, sem
  outra mudança de desenho. (b) descartada por `id` duplicado e risco de enviar o formulário escondido; (c) porque o
  servidor não sabe a largura (troca de árvore depois da hidratação, foco perdido); (d) por corrida entre o estado e o
  envio.

#### ADR-19. Testes nas duas larguras sem projeto novo do Playwright; origem conferida em todo e2e; capturas por spec

- Contexto: RF-16 pede axe em T01 a T12 em 1280 × 720 e 390 × 844, e2e novos em 390 px, zero requisição a outra origem
  em todos os e2e (RNF-07) e três execuções verdes sem mexer em `retries` ou tempo-limite (RNF-12). Hoje há um projeto
  (`chromium`, Desktop Chrome), `workers: 1` e banco único. RF-17 pede nove capturas PNG versionadas.
- Opções: (a) segundo projeto "celular" rodando a suíte inteira; (b) largura por teste (`test.use({ viewport })` ou
  `page.setViewportSize`) só onde o requisito pede, e `axe-todas.spec.ts` repetindo cada estado nas duas larguras.
- Decisão: (b). `e2e/apoio.ts` exporta `test` estendido com uma fixture automática que falha o teste em requisição a
  origem diferente da `baseURL` e em mensagem de console de violação de CSP; os specs passam a importar `test` e
  `expect` de `./apoio` (mudança mecânica, sem asserção a menos). As capturas saem de `e2e/capturas.spec.ts`, que grava
  em `docs/manual-tecnico/capturas/<tela>-<largura>.png` com o seed fictício e é pulado no CI (`test.skip(!!process.env.CI)`).
- Consequências: a suíte não dobra de tempo (menos chance de instabilidade nas três execuções); a CSP passa a ser
  vigiada em todo e2e. Custo: o spec de capturas regrava os PNG a cada execução local (datas do seed mudam), o que suja a
  árvore de trabalho; quem consolida as capturas é a última passagem antes do PR (pendência ao `tech-lead`). Viewport de
  390 px no Chromium não reproduz o Safari do iOS (P-05 do 01, UAT de Fabiano). (a) descartada por dobrar o tempo e a
  superfície de instabilidade sem cobrir mais requisito.

### 10. Desvios do padrão técnico

| Desvio | ADR |
|---|---|
| Pacotes `@fontsource/noto-sans` e `@fontsource/noto-sans-mono` (`devDependencies`, versão exata), fora da tabela de stack | ADR-13 |
| Nenhum outro. Stack, pastas, comandos, porta, banco e entrega são os do padrão. A divergência do Next (16.4.1 no `package.json` contra 16.3.8 no padrão) é anterior a este pedido, registrada no cap. 01 e no CHANGELOG, e este pedido não a altera | — |

### 11. Dívida técnica estrutural observada (fora do escopo)

- `next` 16.4.1 sem ADR de troca de linha (cap. 01, "Divergências conhecidas"): registrar ADR ou atualizar o
  `padrao-tecnico.md` em pedido próprio.
- As linhas 9 a 12 do RF-09 espelham a máquina de status (ADR-17); se a máquina crescer, vale expor de
  `transicoes.ts` uma descrição pura que a exibição consuma.

## Decisões tomadas

- Fontes por `next/font/local` sobre `@fontsource` em `devDependencies` (ADR-13): único caminho sem rede externa no build, servido pela imagem final e executável dentro da lista Pode do engenheiro.
- Nomes semânticos de token mantidos e apontados para a paleta (ADR-14): diff pequeno em 12 telas, menos regressão.
- Foco sobre o marinho com token próprio: o Azul de ação lá fica perto de 2,4:1, abaixo do RNF-02.
- Linha `#dfe4ea` só como divisória: não chega a 3:1 para borda de campo.
- Gaveta em `<dialog>` nativo com Tab e foco de volta explícitos (ADR-15): sem dependência, mesmo padrão do diálogo de hoje.
- Contadores e etapas por módulo novo só SELECT, +2 consultas fixas (ADR-16): API congelada e sem N+1.
- Falha da contagem esconde só o total; falha das etapas e do DEC da T05 usa o estado de erro de hoje: número que falta é tolerável, número errado não.
- Regras do RF-08 e RF-09 como funções puras em `src/components/` com `switch` exaustivo (ADR-17): testáveis e fora de `src/modules/`.
- T11 com um formulário e `SubmitEvent.submitter` (ADR-18): um DOM, sem corrida de estado, regra no servidor intacta.
- Um só alvo de foco do resultado na T03 (`ID_RESULTADO`, fora da tabela e da lista, que o referenciam por `aria-labelledby`): `id` não pode repetir e o mecanismo `pedirFocoNoResultado` fica igual.
- Largura por teste e fixture automática de origem e CSP (ADR-19): cobre RNF-07 em toda a suíte sem dobrar o tempo.
- Porta 3101: já é a do sistema, diferente de 3000 e livre em `ss -ltn`.
- Sem índice novo: os índices únicos por `demanda_id` e os de tipo e linha já servem as consultas, e índice exigiria migration.
- Volta 2: os comandos só de leitura fora da lista Pode da volta 1 (`git grep`, `git ls-files`) foram liberados pelo maestro (regra de 25/10) e saíram de Comandos executados por instrução dele; o conteúdo técnico não mudou.
- Manual de marca e mockups não lidos diretamente: o manual não é rastreado pelo git (fora da lista Pode) e a transcrição da paleta e dos usos vetados está no RF-01 do 01; arranjo de tela é da etapa 03.

## Pendências

- `tech-lead` (05): o plano precisa listar por nome `@fontsource/noto-sans` e `@fontsource/noto-sans-mono` (`pnpm add -D -E`), porque o engenheiro só adiciona pacote do padrão técnico ou do plano.
- `tech-lead` (05): decidir em que passagem as nove capturas são geradas e consolidadas, já que o spec de capturas regrava os PNG a cada execução local (ADR-19).
- `ux-ui-design` (03): valores finais dos tokens de estado, de selo e de foco (incluindo o foco sobre o marinho) dentro das regras do ADR-14; texto dos contadores sem total quando a contagem falha.
- `seguranca-aplicacao` (04): conferir no `next build` que o `next/font/local` não gera `<style>` em linha nem `url(` fora de `/_next/static/media` (a fixture de CSP do ADR-19 também acusa).
- `marketing-comunicacao` (não bloqueia): o comprovante de licença da marca (L-09 do manual) segue aberto; a licença das fontes (OFL 1.1) independe dele e viaja no pacote.
- P-01, P-02 e P-05 do 01 seguem com os donos indicados lá; nenhuma muda este desenho.

## Comandos executados

- `cat /home/deploy/servidor/projetos/estruturaAutonoma/docs/construcao/contrato-passagem.md`
- `ls -la /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261110-0015-v1/ /home/deploy/servidor/projetos/estruturaAutonoma/pedidos/insumos/2026-11-10_orquestrador-novo-visual/`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — topo 38fa0b0, base 198e97d
- `ls -R /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/app /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/components /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/modules/demandas /home/deploy/servidor/projetos/ws-orquestrador-demandas/public /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs` — `public/` não existe
- `ls "/home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261104-0014-v1" "/home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261104-0013-v1" "/home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/manual-tecnico" "/home/deploy/servidor/projetos/ws-orquestrador-demandas/src" "/home/deploy/servidor/projetos/ws-orquestrador-demandas/src/app/(painel)" "/home/deploy/servidor/projetos/ws-orquestrador-demandas/src/app/(painel)/demandas" "/home/deploy/servidor/projetos/ws-orquestrador-demandas/src/app" "/home/deploy/servidor/projetos/ws-orquestrador-demandas/src/lib" "/home/deploy/servidor/projetos/ws-orquestrador-demandas/e2e"` — uma tentativa anterior do mesmo `ls`, sem aspas, falhou por erro de sintaxe do shell e não executou
- `ls "/home/deploy/servidor/projetos/ws-orquestrador-demandas/src/app/(painel)/demandas/[id]" "/home/deploy/servidor/projetos/ws-orquestrador-demandas/src/modules/pacotes-decisao" "/home/deploy/servidor/projetos/ws-orquestrador-demandas/src/modules/historico" "/home/deploy/servidor/projetos/ws-orquestrador-demandas/src/db/schema"`
- `ls -la /home/deploy/servidor/projetos/ws-orquestrador-demandas /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/app/entrar /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/manual-tecnico`
- `ss -ltn` — 3101 livre; 3000 em uso (Easypanel)
- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/node_modules /home/deploy/servidor/projetos/ws-orquestrador-demandas/node_modules/next/dist/compiled/@next` — sem `@fontsource` instalado; `next/font` presente no próprio Next

## Critério de pronto atendido

- [x] cada RF de 01 tem um componente responsável
- [x] a stack é a do padrão técnico, ou o desvio tem ADR
- [x] cada integração externa tem comportamento de falha e tempo limite
- [x] a porta de desenvolvimento é diferente de 3000 e estava livre em `ss -ltn`
- [x] o texto não tem segredo nem valor de `.env`
