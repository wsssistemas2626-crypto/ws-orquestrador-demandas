---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T05-construcao
agente: engenheiro-frontend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (cabeçalho, G1 a G7, T01 a T07), 01-analista-requisitos.md (RF-01 a RF-05), 02-arquiteto-solucoes.md (seções 0 a 9, ADR-13 a ADR-18), 03-ux-ui-design.md (seções 0 a 3, 5.4 a 11), 04-seguranca-aplicacao.md (seções 1 a 6), 06-T04-engenheiro-frontend.md, src/components/CabecalhoPainel.tsx, src/app/(painel)/layout.tsx, src/app/(painel)/not-found.tsx, src/app/globals.css, src/components/marca/MarcaWs.tsx, src/components/Botao.tsx, src/components/Cartao.tsx, src/components/AvisosDaMoldura.tsx, src/components/componentes.test.ts, src/components/componentes-qa.test.ts, src/components/tokens-em-uso.test.ts, src/components/casca/moldura-publica-qa.test.ts, test/estatico/painel-qa.test.ts, test/estatico/varreduras-qa.test.ts, test/estatico/projeto.test.ts, e2e/apoio.ts, e2e/moldura.spec.ts, e2e/fontes.spec.ts, e2e/entrar.spec.ts, e2e/autenticacao-qa.spec.ts, e2e/seguranca.spec.ts, e2e/seguranca-qa.spec.ts (cabeçalho), playwright.config.ts, scripts/seed-ficticio.ts (CONTAS_FICTICIAS)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

A T05 (casca do painel e gaveta) está pronta. Unidade, e2e, lint e typecheck passam, e o G4 (CV-01) saiu vazio.

### Arquivos novos

- `src/components/casca/navegacao.ts`: `LINKS` e `ehPaginaAtual` vieram do `CabecalhoPainel` sem mudança de
  assinatura nem de regra. Também exporta o tipo `LinkDoMenu`.
- `src/components/casca/foco.ts`:
  - `proximoIndiceCircular(atual, total, paraTras)` faz a volta do Tab na gaveta: do último vai ao primeiro, e com
    Shift do primeiro vai ao último. Com o foco fora da lista, vai ao primeiro ou ao último. No meio da lista devolve
    `null`, porque aí quem move o foco é o navegador.
  - `focaveisEm(raiz)` lista os focáveis desenhados, na ordem do DOM.
- `src/components/casca/ItensDoMenu.tsx`: os três itens com ícone SVG `aria-hidden`: linhas, mais e engrenagem.
  - Cores sobre marinho: `texto-claro`; com o mouse, `marinho-luz` e `branco`.
  - O item atual tem fundo `marinho-luz`, barra de 4 px `azul-claro` à esquerda e peso 700. A barra e o peso dão a
    diferença por forma, além da cor.
  - Alvo de 44 px. O callback `aoEscolher` é opcional e só a gaveta o usa.
- `src/components/casca/BotaoSair.tsx`: o "Sair" de hoje, sem mudança de comportamento: `authClient().signOut()`,
  depois `router.replace('/entrar')` e `router.refresh()`.
  - Variante `sobre-escuro`; enquanto sai, mostra "Saindo…" e fica desabilitado.
  - O menu lateral e a gaveta usam este mesmo componente. Não há link: nenhuma saída por GET.
- `src/components/casca/FocoNaTrocaDeTela.tsx`: a regra do foco no `h1` saiu do `CabecalhoPainel` sem mudança. O foco
  vai ao `h1` ao trocar de tela pelo painel, e não na primeira carga. A regra existe uma vez só, para não rodar duas
  vezes (menu lateral e gaveta).
- `src/components/casca/GavetaMenu.tsx`: `<dialog id="gaveta-menu" aria-label="Menu">` aberto com `showModal()`.
  - Na ordem: marca escura sem link, "Fechar menu" (ícone X `aria-hidden` mais texto visível), `nav "Principal"`,
    conta e "Sair".
  - O conteúdo só existe enquanto a gaveta está aberta (D-09).
  - Ao abrir, o foco vai para "Fechar menu", e Tab e Shift+Tab dão a volta dentro da gaveta.
  - Esc, "Fechar menu", clique no véu e o item da tela atual fecham a gaveta e devolvem o foco a "Menu".
  - O item de outra tela fecha a gaveta sem devolver o foco: o `FocoNaTrocaDeTela` o põe no `h1` da tela nova.
  - Se a janela passa a 768 px ou mais, `matchMedia('(min-width: 768px)')` fecha a gaveta e põe o foco no
    `main#conteudo`.
  - Com a gaveta aberta, o `html` recebe a classe `gaveta-aberta` por `classList` e a página atrás não rola. A classe
    sai ao fechar e também quando a casca sai da tela com a gaveta aberta (por exemplo, "Sair").
  - Todo fechamento passa pelo evento `close` do próprio `<dialog>`, inclusive o Esc nativo.
- `src/components/casca/foco.test.ts`: 5 testes de unidade de `proximoIndiceCircular`, com os 4 casos do plano mais as
  bordas: Shift com o foco fora da lista, um focável só e nenhum focável.
- `test/estatico/casca.test.ts`: 7 testes do CV-16. A varredura cobre `src/components/casca/**` e o
  `CabecalhoPainel.tsx`, sem testes e sem comentários. Reprova:
  - `localStorage`, `sessionStorage`, `document.cookie` e `fetch(`;
  - saída por endereço (`sign-out`, `/api/auth`);
  - importação de leitura do servidor (`next/headers`, `lib/deps`, `db`, `acesso/auth|exigir-pessoa|autorizar|matriz`);
  - `autorizar(` e `'use server'`.

  Cada regra tem caso plantado que reprova e caso permitido que passa. O teste também confere que:
  - o `signOut` existe só no `BotaoSair`, seguido de `/entrar`, e o arquivo não tem link;
  - o layout passa `moldura.pessoa.nome` e `moldura.pessoa.papel` da pessoa de `exigirPessoa`;
  - os itens só têm `href={l.href}` e os `LINKS` são exatamente os três de hoje;
  - o header e a gaveta não têm `href` próprio (CV-19).
- `e2e/casca.spec.ts`: 13 testes.
  - Computador (1280 × 720):
    - CA-03.1 em T03, T05, T11 e T12: três itens, um atual, conta, "Sair", marca levando a `/demandas`, sem "Menu" nem
      gaveta, um banner só, menu de 248 px na altura da janela e o `main` à direita;
    - tablete (1000 px): menu de 216 px, fixo ao rolar;
    - CA-03.2: o `h1` não recebe foco na carga; o primeiro Tab vai ao "Pular para o conteúdo"; Enter leva ao `main`;
    - CA-03.4: "Nova demanda" leva o foco ao `h1` da T04;
    - CA-03.5 e CV-16 pela casca: um POST a `/api/auth/sign-out`, a tela vai a `/entrar`, e o cookie antigo, recolocado
      no navegador, recebe 401 em `/api/demandas`.
  - Celular (390 × 844):
    - CA-04.1 a CA-04.3: barra de 56 px, `aria-controls="gaveta-menu"`, alvo de 44 px no "Menu", marca compacta como
      link, foco em "Fechar menu", marca da gaveta sem link, animação de `0.2s`, `html.gaveta-aberta` com
      `overflow: hidden`, 20 Tabs e 20 Shift+Tabs sem sair da gaveta, Esc fecha e volta a "Menu";
    - "Fechar menu" devolve o foco a "Menu", e Enter abre a gaveta de novo;
    - CA-04.4: "Agentes e teto" abre a T12 com a gaveta fechada e o foco no `h1`;
    - clique no véu, clique dentro da gaveta (que não fecha) e item da tela atual;
    - 390 → 1280 px fecha a gaveta e põe o foco no `main`;
    - RNF-11: com `reducedMotion: 'reduce'`, a duração da animação fica abaixo de 1 ms;
    - CV-16 pela gaveta;
    - CA-04.5: axe na barra e com a gaveta aberta.

### Arquivos alterados

- `src/components/CabecalhoPainel.tsx`: o arquivo virou o `header` da casca, cliente, com o mesmo nome exportado e com
  `ehPaginaAtual` reexportado de `casca/navegacao`.
  - O header é `superficie-escura`, `bg-marinho` e `sticky top-0`.
  - A partir de 768 px: menu lateral de `md:w-54` (216 px) e `xl:w-62` (248 px), na altura da janela, com a marca
    escura como link, o `nav "Principal"`, a conta e o "Sair".
  - Abaixo de 768 px: barra de 56 px com "Menu" e a marca compacta como link. O "Menu" tem ícone, texto, `aria-expanded`
    e `aria-controls="gaveta-menu"`.
  - O `GavetaMenu` vem logo depois do header.
- `src/app/(painel)/layout.tsx`: a grade agora é menu mais conteúdo (`md:flex`).
  - Os `AvisosDaMoldura` ficam no topo da coluna do conteúdo, acima do `main`.
  - O `main#conteudo` tem largura máxima de 1200 px (`max-w-300`) e margem de 16, 24 e 32 px.
  - Nome e papel continuam vindo de `exigirPessoa`, como hoje.
  - O "Pular para o conteúdo" continua o primeiro focável. Só as classes do foco trocaram do apelido `fundo` para
    `branco` e `acao-escura`.
- `src/app/(painel)/not-found.tsx`: o conteúdo de hoje foi para um `Cartao`. Texto e link não mudaram.
- `src/app/globals.css`:
  - `--breakpoint-xl: 75rem` no `@theme`, para o `xl:` valer 1200 px, como diz a G3.6;
  - `--altura-cabecalho` de 4rem (64 px) abaixo de 768 px e 1rem (16 px) a partir de 768 px;
  - `html.gaveta-aberta { overflow: hidden }`;
  - `dialog#gaveta-menu[open]` com a animação `gaveta-entra` de 200 ms (`translateX`);
  - `::backdrop` com `color-mix(in srgb, var(--color-tinta) 50%, transparent)`.

  O bloco `prefers-reduced-motion` não mudou e já zera a animação da gaveta.

### Testes existentes que mudaram (G5: só seletor ou marcação)

- `src/components/componentes.test.ts`, no teste "nome do sistema com link…":
  - a regex da marca passou a procurar os três blocos `WS`, `Orquestrador` e `de Demandas` dentro do link para
    `/demandas`;
  - as regex dos itens e do item atual aceitam o `<svg aria-hidden>` antes do texto;
  - a regex do "Menu" também aceita o ícone, e entrou `aria-controls="gaveta-menu"`.

  As asserções continuam as mesmas: um `aria-current`, a conta e "Sair". Um teste novo foi acrescentado no mesmo
  `describe` (gaveta fechada e vazia, menu lateral `hidden md:flex`, barra `md:hidden`, SVGs `aria-hidden`).
- `src/components/componentes-qa.test.ts:203`: a regex do item atual aceita o `<svg>` antes do texto. As 11 rotas e a
  contagem de `aria-current` ficam iguais.
- `e2e/moldura.spec.ts:28`: `getByRole('button', { name: 'Menu' })` passou a `{ name: 'Menu', exact: true }`. Com a
  gaveta aberta também existe "Fechar menu", e sem o `exact` o Playwright acharia os dois botões. O resto do teste
  passou sem mudança: a navegação some em 320 px, a gaveta mostra "Nova demanda" e o axe passa com o menu aberto.

### Comandos e resultado

- Visto falhando (antes do código), com
  `pnpm test src/components/casca/foco.test.ts test/estatico/casca.test.ts src/components/componentes.test.ts src/components/componentes-qa.test.ts`:
  3 arquivos falharam e 5 testes falharam.
  - `Error: Cannot find module './foco'`.
  - `expected '<header class="sticky top-0 z-10 bord…' to match /<a[^>]*…/demandas"[^>]*><span[^>]*>WS<\…` (marca).
  - `… to match /<dialog id="gaveta-menu" aria-…/dialog>` (gaveta).
  - `ENOENT … src/components/casca/BotaoSair.tsx` e `… ItensDoMenu.tsx`.
  - A varredura do CV-16 enxergou só `CabecalhoPainel.tsx` e `MolduraPublica.tsx`.

  O `e2e/casca.spec.ts` também foi escrito antes do código, mas só rodou depois. Em vermelho, só foi vista a unidade.
- Durante a construção, duas correções:
  - o meu próprio `casca.test.ts` reprovou `href === caminho` na gaveta, porque a regex `\bhref\s*=` pegava a
    comparação; passou a `\bhref\s*=\s*[{'"\`]`;
  - no `e2e/casca.spec.ts`, o clique "dentro da gaveta" em (160, 800) caía no "Sair"; passou a (160, 500), entre os
    itens e a conta.
- Depois do código:
  - `pnpm test`: **216 arquivos, 4795 de 4795**;
  - `pnpm test:e2e`: **174 de 174** (6,8 min), com os 13 novos e a vigia da T01 sem achado (nada de fora, nenhuma
    violação de CSP);
  - `pnpm lint` e `pnpm typecheck`: limpos;
  - G4: o `git diff 198e97d --stat` nos arquivos congelados, nos nove `'use server'` e em `src/modules`: vazio.

### Desvios do plano

1. **`--breakpoint-xl: 75rem` no `@theme`.** O plano (G3.6) diz que o `xl:` vale 1200 px, mas o Tailwind 4 tem 1280 px
   de padrão, e nenhuma tarefa anterior tinha definido o ponto. A casca precisa dele (216 px até 1199 e 248 px a partir
   de 1200), e o lugar único de token é o `@theme`. Os testes de tokens continuam verdes.
2. **A gaveta fica fora do `header`, como irmã dele.** O `<dialog>` sai logo depois do `header` (no mesmo componente),
   e não dentro do banner. O HTML continua começando por `<header`, como o teste de hoje exige, e o diálogo modal não
   fica aninhado na landmark.
3. **O item da tela atual na gaveta não cancela a navegação.** Ativar o item com `href` igual ao caminho fecha a gaveta
   e devolve o foco a "Menu", mas a navegação do link acontece. Na fila com filtro, ela limpa os filtros, como o mesmo
   item faz no menu lateral. Itens com `aria-current` e `href` diferente do caminho (por exemplo, "Demandas" na T05)
   navegam e levam o foco ao `h1`.
4. **O destino do foco no fechamento por largura.** O plano fala em `main#conteudo`; a 03, 3.1 só diz "sem mover o
   foco para fora da página". Segui o plano.
5. **Mais testes do que o plano lista.** Entraram: tablete de 216 px, "Fechar menu" com reabertura por Enter, Shift+Tab
   circular, alvo de 44 px no "Menu", `overflow: hidden` com a gaveta aberta e a duração de 0,2 s fora do movimento
   reduzido, que serve de contraprova do RNF-11.

## Decisões tomadas

- O conteúdo da gaveta só existe enquanto ela está aberta, mas o `<dialog id="gaveta-menu">` vazio fica sempre no DOM.
  Assim o `aria-controls` aponta para um id que existe, e o HTML do servidor tem um só `nav "Principal"` e um só
  `aria-current` (D-09).
- Todo fechamento passa pelo evento `close` do `<dialog>`, com o destino do foco num `ref` (`menu`, `conteudo` ou
  `nenhum`). O Esc nativo, o véu, o botão, o item e a largura fecham pelo mesmo caminho, sem estado divergente.
- Ouvintes do `<dialog>` por `addEventListener` no efeito, e não por props do JSX. O véu é o próprio `<dialog>`
  (`target === currentTarget`), e o conteúdo ocupa a caixa inteira, então um clique dentro da gaveta nunca fecha.
- O botão "Menu" só abre, e não alterna. Com a gaveta aberta ele fica inerte. Isso também deixa seguro o novo clique no
  e2e antes da hidratação (`abrirGaveta` com `toPass`).
- "Fechar menu" e "Sair" usam o `Botao` na variante `sobre-escuro` da T03, sem componente novo.
- O "Pular para o conteúdo" saiu do apelido `bg-fundo` para `bg-branco` com `text-acao-escura`, porque o arquivo já
  estava na tarefa. Pela D-01, tela nova não usa os apelidos.
- O `AvisosDaMoldura.tsx` não foi tocado: ele não está na lista da T05, e o texto e as condições não mudam. O
  invólucro dele (`max-w-6xl`, `text-atencao-texto`) fica para a T14 ou a T16.

## Pendências

- Para a 07 (não bloqueia): conferir à mão:
  - leitura da gaveta por leitor de tela (anúncio do diálogo "Menu" e do `aria-expanded`);
  - foco branco sobre marinho nos itens, na marca e no "Sair";
  - reflow em 320 px da barra, onde a marca compacta quebra em duas linhas dentro dos 56 px;
  - zoom de 200 % e 400 % com o menu lateral.
- Para Fabiano, no UAT (P-04 e P-05 do 01): conferir o `<dialog>` da gaveta no Safari do iOS (inércia do fundo, Esc
  inexistente no teclado virtual, véu e trava de rolagem).
- Para a T16 (não bloqueia): o `AvisosDaMoldura` ainda usa `max-w-6xl` e o apelido `text-atencao-texto`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -12` — topo 924fdbd (06-T04-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format= -- e2e src/components test/estatico` — lista dos arquivos de teste e componentes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%H -- scripts/seed-ficticio.ts` — d6df360
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/casca/foco.test.ts test/estatico/casca.test.ts src/components/componentes.test.ts src/components/componentes-qa.test.ts --reporter=dot` — visto falhando: 3 arquivos e 5 testes
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components test/estatico --reporter=dot` — 790 de 791 (1 falha no meu `casca.test.ts`, regex corrigida)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 216 arquivos, 4795 de 4795
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/casca.spec.ts e2e/moldura.spec.ts --reporter=line` — 17 de 18 (o clique em (160, 800) caiu no "Sair"; ponto corrigido)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=line` — 174 de 174 (6,8 min)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d --stat -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 7 modificados e 9 novos, todos da tarefa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 7 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- src/components/componentes.test.ts src/components/componentes-qa.test.ts e2e/moldura.spec.ts` — só seletor e marcação, um teste novo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo (estado final)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo (estado final)

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega; a unidade foi vista em vermelho, e o e2e foi escrito antes, mas só rodou depois do código)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa (os três testes existentes mudaram só no seletor ou na marcação, explicado em Entrega)
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas (casca em 1280 px pela `moldura.spec`, barra e gaveta aberta em 390 px, gaveta aberta em 320 px, 404 do painel)
