---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T05-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (cabeçalho, G1 a G7, T01 a T05), 01-analista-requisitos.md (RF-01 a RF-05, RF-13 a RF-17, RNF), 04-seguranca-aplicacao.md (cabeçalho, seção 2 de C10 a C16, seção 3), 06-T05-engenheiro-frontend.md, 06-T04-qa-automacao.md, diff do commit 85ace62 (e2e, src e test), src/components/CabecalhoPainel.tsx, src/components/casca/*.ts(x), src/components/marca/MarcaWs.tsx, src/components/Botao.tsx, src/app/(painel)/layout.tsx, src/app/(painel)/not-found.tsx, src/app/globals.css, e2e/apoio.ts, playwright.config.ts, vitest.config.ts, package.json, src/components/componentes-qa.test.ts (cabeçalho)]
status: devolvido
proximo: engenheiro-frontend
devolvido_para: 06-T05-construcao
---
## Entrega

T05 (casca do painel e gaveta), código em 85ace62. O código cumpre todos os critérios da tarefa, e cada critério tem
teste. A suíte inteira passa, e o lint e o typecheck saem limpos. Mesmo assim a etapa volta para a construção, porque um
e2e do engenheiro é **instável**:

`e2e/casca.spec.ts`, "clique no véu e item da tela atual fecham e devolvem o foco a Menu" (linha 200).

### O teste instável

- **Sintoma.** O teste passou na suíte inteira (182 de 182), mas falhou 5 de 5 vezes rodando sozinho
  (`--repeat-each=5`). Também falhou 3 de 3 vezes junto com `casca-qa.spec.ts` e `moldura.spec.ts`. A falha é sempre na
  linha 212: depois de `page.mouse.click(160, 500)`, `expect(gaveta(page)).toBeVisible()` não acha o diálogo, porque a
  gaveta fechou.
- **Causa (conferida por diagnóstico).** A gaveta entra pela esquerda numa animação de 200 ms (`gaveta-entra`). O
  `abrirGaveta` termina assim que o `<dialog>` fica visível, que é o começo da animação. Nesse instante a caixa do
  diálogo ainda está fora da tela. A medida antes do clique deu `x = -236,6` com 1 animação rodando, e
  `document.elementFromPoint(160, 500)` deu o próprio `DIALOG`, ou seja, o `::backdrop`. O clique cai no véu, e o
  `aoClicar` fecha a gaveta, como deve. Quando o mesmo clique espera o fim da animação
  (`d.getAnimations().map(a => a.finished)`), ele passou 2 de 2 vezes. Sem a espera, falhou 1 de 2.
- **Correção sugerida, só no teste.** Antes do clique "dentro da gaveta", esperar o fim da animação
  (`await gaveta(page).evaluate((d) => Promise.all(d.getAnimations().map((a) => a.finished)))`), ou clicar por
  localizador num elemento da gaveta que não seja controle, como o texto da conta. O clique por localizador espera o
  elemento parar. A asserção continua a mesma. O teste novo `casca-qa.spec.ts`, "clique dentro da gaveta, fora de
  controle, não fecha…", já usa a segunda forma e passou 3 de 3 vezes.
- **Observação sobre o produto (baixa, não bloqueia).** Durante os 200 ms de entrada, um toque no lugar onde a gaveta
  vai parar cai no véu e fecha a gaveta. Isso segue a regra de hoje (clique no véu fecha). Se a ux-ui-design achar que
  não deve ser assim, a decisão é da revisão, e eu não acrescentei teste que trave esse comportamento.

### Critério da tarefa e teste que cobre

| Critério (plano, T05) | Teste |
|---|---|
| CA-03.1: menu lateral com os três itens, o item atual, a conta e "Sair" | `e2e/casca.spec.ts`, "CA-03.1: menu lateral com três itens, item atual, conta e Sair em T03, T05, T11 e T12". Novos: `e2e/casca-qa.spec.ts`, "fronteiras: 767 px barra com "Menu"; 768 e 1199 px menu lateral de 216 px; 1200 px de 248 px" e "404 do painel em 1280 px (RF-03)…" |
| CA-03.2: o primeiro Tab vai a "Pular para o conteúdo", e Enter leva ao `main` | `e2e/casca.spec.ts`, "CA-03.2: primeiro Tab no "Pular para o conteúdo"…"; `e2e/moldura.spec.ts` (de hoje). Novo: `test/estatico/casca-qa.test.ts`, ""Pular para o conteúdo" antes da casca; avisos na coluna do conteúdo, acima do main#conteudo" |
| CA-03.3: os avisos da moldura aparecem como na 0.1.13 | Os testes do `AvisosDaMoldura` em `src/components/componentes.test.ts` e `componentes-qa.test.ts` (componente sem mudança). Novos: `test/estatico/casca-qa.test.ts`, o mesmo teste da linha acima (as três props de hoje, acima do `main`) e "sem sessão, só o conteúdo…" |
| CA-03.4: "Nova demanda" leva o foco ao `h1` da T04 | `e2e/casca.spec.ts`, "CA-03.4: "Nova demanda" no menu leva o foco ao h1 da T04" |
| CA-03.5: "Sair" encerra a sessão e leva a `/entrar` | `e2e/casca.spec.ts`, "CA-03.5 e CV-16: Sair pela casca…". Novo: `e2e/casca-qa.spec.ts`, ""Sair" com a gaveta aberta: em /entrar a página volta a rolar…" |
| CA-04.1: em 390 px não há menu lateral, e "Menu" tem `aria-expanded="false"` | `e2e/casca.spec.ts`, "CA-04.1 a CA-04.3…". Novo: `casca-qa.spec.ts`, "fronteiras…" (767 px) |
| CA-04.2: o foco entra na gaveta e 20 Tabs não saem dela | `e2e/casca.spec.ts`, "CA-04.1 a CA-04.3…"; `src/components/casca/foco.test.ts` (5 testes). Novo: `casca-qa.spec.ts`, "CA-04.2: Shift+Tab no primeiro vai a "Sair", Tab no último volta; modal com o main inerte; Espaço abre" |
| CA-04.3: Esc fecha e devolve o foco a "Menu" | `e2e/casca.spec.ts`, "CA-04.1 a CA-04.3…" e ""Fechar menu" fecha e devolve o foco a Menu…". Novo: `casca-qa.spec.ts`, "404 do painel em 390 px…" (Esc na 404) |
| CA-04.4: "Agentes e teto" abre a T12, fecha a gaveta e põe o foco no `h1` | `e2e/casca.spec.ts`, "CA-04.4…". Novo: `casca-qa.spec.ts`, "na T05, "Demandas" (atual, outro endereço) vai à fila, fecha a gaveta e põe o foco no h1; a gaveta reabre" |
| CA-04.5: axe sem violação com a gaveta aberta | `e2e/casca.spec.ts`, "CA-04.5: axe com a gaveta aberta" |
| CV-16: a casca não decide acesso, e "Sair" é por POST | `test/estatico/casca.test.ts` (7 testes); `e2e/casca.spec.ts`, os dois testes de "Sair" (casca e gaveta). Novos: `test/estatico/casca-qa.test.ts`, "o BotaoSair é usado só pelo menu lateral e pela gaveta, uma vez em cada"; `src/components/casca/gaveta-qa.test.ts`, "o texto da conta chega por prop e sai escapado" |
| CV-19: a marca só leva a `/demandas` | `test/estatico/casca.test.ts`, "os itens do menu só levam às três telas de hoje…"; `e2e/casca.spec.ts`, CA-03.1 e CA-04.1. Novo: `gaveta-qa.test.ts`, "a marca da gaveta não é link: o único href para /demandas é o item "Demandas" (CV-19)" |
| RNF-11: animação de até 200 ms, e nenhuma com movimento reduzido | `e2e/casca.spec.ts`, "RNF-11: com reducedMotion reduce…" e a duração de 0,2 s no CA-04.1. Novos: `casca-qa.test.ts`, "cada animação do CSS dura no máximo 200 ms" e "o bloco prefers-reduced-motion zera animação e transição de todo elemento" |
| CV-01: superfícies congeladas | Comando do G4 contra 198e97d: saída vazia (Comandos executados) |

### Lacunas que achei e testes que acrescentei

`src/components/casca/gaveta-qa.test.ts` (novo, 11 testes de unidade, HTML do servidor, sem DOM):

- Com a gaveta aberta, a ordem é: marca, "Fechar menu", nav "Principal" com os três itens, conta e "Sair".
- A marca da gaveta não é link: o único `href="/demandas"` é o item "Demandas", e só há três `<a>`.
- "Fechar menu" é um botão com texto visível. Os quatro SVGs são `aria-hidden`.
- Há um item atual só em cada rota: fila, nova, agentes e DEC. Com o caminho nulo, nenhum item é atual, e a conta e
  "Sair" continuam.
- O texto da conta sai escapado: um nome com `<img onerror>` aparece como texto.
- `ItensDoMenu`: com `aoEscolher`, cada item avisa o próprio `href`. É disso que a gaveta depende para decidir o foco.
  Sem `aoEscolher` (menu lateral), nenhum item intercepta o clique.

`test/estatico/casca-qa.test.ts` (novo, 14 testes):

- Ordem do layout: "Pular para o conteúdo", casca, avisos com as três props de hoje, `main#conteudo` e
  `{children}`. Sem sessão, só o conteúdo.
- G3.4: nenhum `.style` nem `style=` nos arquivos da casca. Há caso plantado que reprova. A trava de rolagem é
  `classList.add` uma vez e `classList.remove` duas vezes (ao fechar e ao desmontar), com a mesma classe do CSS
  (`html.gaveta-aberta { overflow: hidden }`).
- A gaveta abre por `showModal()`, nunca por `show()` nem com `open` no JSX. O id `gaveta-menu` é o mesmo no `<dialog>`,
  no `aria-controls` e nos dois seletores do CSS. O `matchMedia` usa os mesmos 768 px do `md:`.
- RNF-11: cada `animation:` dura até 200 ms. O bloco de movimento reduzido zera animação e transição. O véu usa token,
  sem hexadecimal.
- Um único `FocoNaTrocaDeTela` em todo o app, para a regra do foco não rodar duas vezes. `BotaoSair` aparece uma vez no
  lateral e uma vez na gaveta. `GavetaMenu` é montada uma vez, depois do `</header>`.

`e2e/casca-qa.spec.ts` (novo, 8 testes; cada um faz o próprio login no `beforeEach` e não cria demanda):

- Fronteiras de largura, todas com a altura da janela e o `main` à direita do menu:
  - 767 px: barra de 56 px com "Menu";
  - 768 px: menu lateral de 216 px;
  - 1199 px: 216 px;
  - 1200 px: 248 px.

  Esse teste cobre o desvio 1 da construção (`--breakpoint-xl: 75rem`).
- Tab circular com prova de volta, e não só "o foco continua dentro":
  - Shift+Tab em "Fechar menu" vai a "Sair", e Tab volta;
  - a ordem completa é Fechar menu, Demandas, Nova demanda, Agentes e teto, Sair;
  - `dialog.matches(':modal')`, e o `main#conteudo` não recebe foco nem por `focus()` (página atrás inerte);
  - Espaço no "Menu" reabre a gaveta.
- O desvio 3 da construção: na T05, "Demandas" (item atual, com outro endereço) leva à fila, fecha a gaveta, põe o foco
  no `h1` e tira a classe. A gaveta reabre com o foco em "Fechar menu".
- Clique dentro da gaveta, fora de controle (texto da conta e marca), depois da entrada de 200 ms: a gaveta não fecha.
  O véu fecha.
- "Sair" com a gaveta aberta: em `/entrar`, o `html` fica sem `gaveta-aberta` e sem `overflow: hidden`.
- 320 px:
  - a barra tem 56 px e não rola de lado;
  - a marca compacta cabe na largura;
  - o "Menu" tem pelo menos 44 px;
  - a gaveta tem 272 px, e "Fechar menu" e "Sair" aparecem na tela.

  Isso automatiza parte da pendência de reflow que a construção deixou para a 07.
- 404 do painel (RF-03) com a casca:
  - 1280 px: três itens, um atual, "Sair", o `h1` no `main` e menu de 248 px;
  - 390 px: barra, gaveta com "Demandas" atual e Esc.

### Resultado

| Suíte | Antes (construção) | Agora | Diferença |
|---|---|---|---|
| `pnpm test` | 216 arquivos, 4795 testes | **218 arquivos, 4820 de 4820** | 25 testes novos em 2 arquivos novos |
| `pnpm test:e2e` | 174 | **182 de 182** (5,9 min) | 8 e2e novos; vigia de origem e CSP sem achado |
| `pnpm lint` e `pnpm typecheck` | limpos | **limpos** | — |

Outras execuções:

- `e2e/casca-qa.spec.ts` sozinho, `--repeat-each=3`: 24 de 24.
- `casca.spec`, `casca-qa.spec` e `moldura.spec`, `--repeat-each=3`: 72 de 75. As 3 falhas são o teste instável acima.

### Conferências do `git diff`

- Árvore de trabalho: só os 3 arquivos novos de teste (`??`). `git diff` saiu vazio, então nenhum teste existente foi
  tocado nesta etapa.
- Commit 85ace62: nenhum `.skip(`, `.only(` ou `.todo(` acrescentado.
- Os três testes existentes mudaram só no seletor ou na marcação:
  - `componentes.test.ts`: as regex aceitam o `<svg aria-hidden>` e a marca em três blocos, e entraram duas asserções
    novas;
  - `componentes-qa.test.ts:203`: a regex aceita o `<svg>`;
  - `moldura.spec.ts:28`: `exact: true`.

  Nenhuma asserção saiu nem ficou mais fraca.
- G4 (CV-01) contra 198e97d: vazio.

## Decisões tomadas

- Status `devolvido`, embora o código esteja correto: o contrato manda devolver quando um teste do engenheiro é
  instável, e esse falhou 8 de 8 vezes fora da suíte inteira.
- Não corrigi o `casca.spec.ts` do engenheiro: a correção é da etapa dona. A causa e a correção de uma linha estão na
  Entrega.
- Testes novos em arquivos `-qa` próprios (padrão da T04): os testes da construção ficam como foram revisados.
- Os e2e novos fazem só leitura e uma saída da própria sessão, sem criar demanda (C-36). Não leem o relógio. Cada um
  entra no `beforeEach`, e nenhum depende da ordem.
- Não acrescentei teste que trave o fechamento por toque durante a animação de entrada. É comportamento de produto a
  decidir, e não regra escrita.

## Pendências

- `e2e/casca.spec.ts`, "clique no véu e item da tela atual fecham e devolvem o foco a Menu" (linha 200): instável. O
  `page.mouse.click(160, 500)` cai no véu durante a entrada de 200 ms da gaveta e a fecha. Falhou 5 de 5 vezes sozinho e
  3 de 3 com casca, casca-qa e moldura, e passou na suíte inteira. Esperar o fim da animação ou clicar por localizador
  num elemento que não seja controle (ver Entrega).
- Observação para a revisão e a ux-ui-design (baixa, não bloqueia): um toque no lugar onde a gaveta vai parar, durante os
  200 ms de entrada, fecha a gaveta.
- Para a 07 (não bloqueia): continuam à mão a leitura por leitor de tela, o contraste do foco branco sobre marinho e o
  zoom de 200 % e 400 %. O reflow da barra em 320 px agora tem e2e.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 85ace62~1 85ace62` — 18 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 85ace62~1 85ace62 -- src/components/componentes.test.ts src/components/componentes-qa.test.ts e2e/moldura.spec.ts` — só seletor e marcação
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S AvisosDaMoldura --name-only --format=%h -- e2e test src` — testes de unidade dos avisos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "capacidade" --name-only --format=%h -- e2e` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only 4b825dc642cb6eb9a060e54bf8d69288fbbebdc4 HEAD -- vitest.config.ts vitest.config.mts playwright.config.ts package.json docker-compose.dev.yml e2e/servidor.ts e2e/preparacao.ts` — erro (objeto da árvore vazia ausente); li os arquivos com Read
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -5` — topo bd54155 (06-T05-revisao)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/casca/gaveta-qa.test.ts test/estatico/casca-qa.test.ts` — 25 de 25
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/casca-qa.spec.ts --reporter=line` — 7 de 7 (primeira versão)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/casca.spec.ts e2e/casca-qa.spec.ts e2e/moldura.spec.ts --repeat-each=3 --reporter=dot` — 72 de 75 (as 3 falhas no teste instável)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/casca.spec.ts -g "clique no véu" --repeat-each=5 --reporter=line` — 0 de 5
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/casca-qa.spec.ts -g DIAGNOSTICO --repeat-each=3 --reporter=line` — 6 de 6 (diagnóstico na primeira abertura, já removido)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/casca-qa.spec.ts -g DIAGNOSTICO --repeat-each=2 --reporter=line` — 3 de 4 (com espera, 2 de 2; sem espera, 1 de 2, `x=-236,6` e alvo `DIALOG`; diagnóstico removido)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/casca-qa.spec.ts --repeat-each=3 --reporter=dot` — 24 de 24
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 218 arquivos, 4820 de 4820
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=line` — 182 de 182 (5,9 min)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d --stat -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 3 arquivos novos de teste
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — vazio

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [ ] a suíte inteira passa (passou: 4820 de 4820 e 182 de 182; mas um e2e do engenheiro é instável e falha fora da suíte inteira)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
