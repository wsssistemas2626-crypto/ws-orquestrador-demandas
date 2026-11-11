---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T04-construcao
agente: engenheiro-frontend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (cabeçalho, G1 a G7, T02 a T05), 01-analista-requisitos.md (RF-07 a RF-13), 02-arquiteto-solucoes.md (seções 0 a 2), 03-ux-ui-design.md (seções 0 a 3.3, 5.4 a 11), 04-seguranca-aplicacao.md (seções 1 a 3, 5 e 6), 06-T03-engenheiro-frontend.md, playwright.config.ts, e2e/apoio.ts, e2e/vigia.spec.ts, e2e/entrar.spec.ts, e2e/configurar-2fa.spec.ts, e2e/autenticacao-qa.spec.ts, src/app/layout.tsx, src/app/entrar/page.tsx, src/app/entrar/FormularioEntrar.tsx, src/app/entrar/entrar.test.ts, src/app/entrar/pagina-qa.test.ts, src/app/configurar-2fa/page.tsx, src/app/configurar-2fa/AssistenteDoisFatores.tsx, src/app/configurar-2fa/configurar-2fa.test.ts, src/app/configurar-2fa/pagina-qa.test.ts, src/app/sem-permissao/page.tsx, src/app/error.tsx, src/app/not-found.tsx, src/components/Cartao.tsx, src/components/Botao.tsx, test/estatico/painel-qa.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T04 (marca e moldura pública: Entrar, 2FA, sem permissão, erro e 404) feita. Unidade, e2e, lint e typecheck verdes; G4
(CV-01) vazio.

### Arquivos novos

- `src/components/marca/MarcaWs.tsx`: `MarcaWs({ variante: 'clara' | 'escura'; compacta?: boolean; comLink?: boolean })`
  e a constante `DESTINO_DA_MARCA = '/demandas'`. Bloco "WS" (quadrado 36 px, ou 32 px na compacta, raio de campo, 15 px,
  peso 800) mais "Orquestrador" (15 px, 700) e "de Demandas" (13 px) em HTML e CSS. Não usa imagem, SVG nem script
  (CV-02). Cores por token, conforme a 03, 3.2 e 3.3: na clara, quadrado `marinho`/`branco`, nome `marinho` e apoio
  `tinta-media`; na escura, quadrado `superficie`/`marinho`, nome `branco` e apoio `texto-claro-apoio`; na compacta,
  "Orquestrador de Demandas" numa linha. Sem link, sai num `<p>`. Com link, sai num `Link` só para a constante (CV-19),
  com `min-h-11` e sem `aria-label`: o nome acessível "WS Orquestrador de Demandas" sai do texto, com os espaços no DOM.
  A variante escura e a compacta ficam prontas para a casca da T05.
- `src/components/casca/MolduraPublica.tsx`: `MolduraPublica({ comLinkNaMarca, children })`. O conteúdo fica
  centralizado até 440 px (`max-w-110`), com 16 px de margem no celular. A marca clara fica num `header` acima do
  `main#conteudo` (`tabIndex={-1}`), e o conteúdo da tela fica num `Cartao`. Só marcação: sem leitura e sem estado.
- `src/components/casca/moldura-publica.test.ts`: 17 testes de unidade:
  - `MarcaWs`: texto e nome, link só para `/demandas`, alvo de 44 px sem `aria-label`, cores por variante, compacta, e
    nada de `<img>`, `<svg>`, `style=` nem nome antigo de token;
  - `MolduraPublica`: `header` acima do `main`, cartão, 440 px, nada do painel, link só quando pedido;
  - as cinco telas: link da marca em Sem permissão, 404 e erro; sem link em T01 e T02; botão ou link principal com
    `w-full`. O erro não mostra a mensagem nem o digest (sentinela).
- `e2e/moldura-publica.spec.ts`: 4 testes:
  - RF-13 T01: marca visível sem link, nenhum link na tela, sem `nav "Principal"` nem "Sair", "Continuar" na largura
    do campo;
  - RF-13: em Sem permissão e no 404, a marca e "Voltar para a fila" levam a `/demandas`; a marca leva a `/entrar` com o
    `callbackURL` de hoje quando não há sessão;
  - CA-13.2: no passo 2 da T02 (conta `sem2fa`, que nunca verifica código), o QR tem `rect` `#ffffff` e `path`
    `#000000`, 16 px de área branca em volta e fundo branco;
  - CA-13.3: o axe roda na T01 vazia, com erro e no passo 2, e também em Sem permissão, no 404 e nos passos 1 e 2 da
    T02. Cada estado roda em 1280 × 720 e em 390 × 844, e a página não pode ter rolagem lateral em 390 px.

### Arquivos alterados

- `src/app/entrar/page.tsx` e `src/app/configurar-2fa/page.tsx`: o `header` antigo e o `main` deram lugar a
  `MolduraPublica comLinkNaMarca={false}`. A guarda `exigirSessaoParaConfigurar2fa`, `destinoSeguro` (C-40), `metadata`
  e `dynamic` não mudaram.
- `src/app/entrar/FormularioEntrar.tsx`: só classes. "Continuar" e "Entrar" ganharam `w-full`. A linha do passo 2
  passou a coluna (`flex-col items-center gap-2`), com "Usar um código de recuperação" abaixo. Campos, textos, fluxo,
  `trustDevice: false` e foco não mudaram.
- `src/app/configurar-2fa/AssistenteDoisFatores.tsx`: só classes e um invólucro. O QR fica num `div` `bg-branco p-4`
  com borda decorativa `linha`, que saiu do `border-borda` do `svg`. Atributos e cores do `svg`, `rect` e `path` não
  mudaram, nem `src/lib/qr.ts`. "Continuar", "Verificar" e "Concluir" ganharam `w-full`.
- `src/app/sem-permissao/page.tsx`, `src/app/not-found.tsx` e `src/app/error.tsx`: `MolduraPublica comLinkNaMarca`. O
  título, o texto, "Voltar para a fila" ou "Tentar de novo" (agora `w-full`), `connection()` e `dynamic` são os de hoje.
  O `error.tsx` continua sem ler `message`, `stack`, `digest` nem `cause`.

### Testes existentes que mudaram (fora de G5, só o texto procurado)

- `src/app/entrar/entrar.test.ts:46` e `src/app/configurar-2fa/pagina-qa.test.ts:29`: a regex
  `<header…>…WS Orquestrador de Demandas…</header>` passou a procurar `>WS<`, `>Orquestrador<` e `>de Demandas<` no
  `header`, nessa ordem. A marca agora vem em três blocos de texto, então a frase contínua não existe mais no HTML. A
  asserção continua a mesma, "o nome do sistema no cabeçalho", e nenhuma outra linha desses arquivos mudou.
- `e2e/entrar.spec.ts`, `e2e/configurar-2fa.spec.ts` e `e2e/autenticacao-qa.spec.ts` passaram **sem nenhuma mudança**
  (CA-13.1).

### Comandos e resultado

- Visto falhando (antes do código):
  - unidade, antes de existirem os componentes: `Error: Cannot find module '/src/components/marca/MarcaWs'`;
  - unidade, com os componentes e sem as páginas novas: 6 de 15 falhas. Exemplos: `expected [ { href: '/demandas', …(1)
    } ] to deeply equal [ { href: '/demandas', …(1) }, …(1) ]` no Sem permissão, e `expected '<header class="border-b
    border-borda …' to match …>WS<…` na T01;
  - e2e (`e2e/moldura-publica.spec.ts`): 3 de 4 falhas. Por exemplo, `Locator: getByText('WS', { exact: true }) …
    element(s) not found` na T01 e na T02, e `getByRole('link', { name: 'WS Orquestrador de Demandas' }) … element(s)
    not found` no Sem permissão.
- Depois do código:
  - `pnpm test`: **213 arquivos, 4768 de 4768**;
  - `pnpm test:e2e`: **158 de 158** (6,1 min), com os 4 novos e a vigia da T01 sem achado. Isso prova que a moldura não
    trouxe recurso de fora nem violação de CSP;
  - `pnpm lint` e `pnpm typecheck`: limpos;
  - G4: `git diff 198e97d --stat` nos arquivos congelados (auth, auth-cliente, qr, acesso, proxy e os nove
    `'use server'`) e em `src/modules`: vazio.

### Desvios do plano

1. O teste do CA-13.2 confere o QR **no passo 2**, não no passo 1 como diz o comentário do plano. O QR só existe no
   passo 2 ("Ligue o aplicativo autenticador"); no passo 1 não há o que medir. Usei a conta `sem2fa`, como a
   `autenticacao-qa.spec.ts`: ela não conclui a ativação e continua sem 2FA para C-04 (c). A `configurar2fa` não serve,
   porque o fluxo completo a deixa com 2FA.
2. O axe nas duas larguras roda por uma função local do spec (`semViolacoesNasDuasLargurasDaMoldura`), não por
   `semViolacoesNasDuasLarguras` de `e2e/apoio.ts`, que é da T16 (G7). Ela segue o D-06: mesmo estado, 1280 × 720,
   depois 390 × 844, e volta. Também confere a rolagem lateral em 390 px.
3. A marca ficou num `header` (banner) **fora** do `main`, acima dele. A 03, 7.2 e o plano dizem "marca acima do
   cartão". Assim os alertas da tela continuam sendo os únicos dentro do `main`, que é o que os e2e de hoje localizam
   (`getByRole('main').getByRole('alert')`), e a marca continua num `header`, como os dois testes de unidade de hoje
   exigem.
4. Fora do plano: o e2e da marca no 404 também clica nela e confere o destino. Sem sessão, ela leva a `/entrar` com o
   `callbackURL` de hoje.

## Decisões tomadas

- A marca é texto com os espaços no DOM, sem `aria-label`: o nome acessível é o texto visível (WCAG 2.5.3), e a marca
  pode ser lida e copiada.
- O link da marca tem `min-h-11` (03, 2.4): o quadrado tem 36 px e o alvo mínimo é 44 px.
- A marca sem link sai num `<p>`, e não num `div` com `aria-label`, que o axe recusa em elemento sem papel.
- A largura de 440 px vale para o conteúdo, com a margem de 16 px por fora: a margem fica no invólucro externo e o
  `max-w-110` no interno, para o cartão não perder 32 px.
- A borda do QR é `linha` (decorativa): a fronteira do QR é a área branca, e `borda` é nome que a T16 apaga.
- A linha "Entrar" e "Usar um código de recuperação" passou a coluna: com o primário na largura toda, o link ficaria
  sozinho numa linha de qualquer jeito, e a coluna deixa a ordem visual igual à do DOM.
- A tela de erro não tem e2e: provocar o `error.tsx` no build de produção exigiria rota ou falha plantada no servidor,
  fora da tarefa. A marca, o texto e a ausência da mensagem e do digest ficam no teste de unidade.

## Pendências

- Para a 07 (não bloqueia): conferir à mão o foco no link da marca no Sem permissão e no 404 (contorno `acao-escura`
  sobre `superficie`), a tela de erro aberta de verdade e a T02 em 320 px com a chave longa. Pelo CSS ela quebra nos
  espaços, e o e2e só mediu 390 px.
- Para a T16 (não bloqueia): trocar a função local `semViolacoesNasDuasLargurasDaMoldura` de
  `e2e/moldura-publica.spec.ts` pela `semViolacoesNasDuasLarguras` de `e2e/apoio.ts`, quando ela existir.
- Para a T05 (não bloqueia): `MarcaWs` já tem `variante="escura"`, `compacta` e `comLink`, para o menu lateral e a
  barra do celular.
- `marketing-comunicacao` (P-02, não bloqueia): se o bloco "WS" for vetado, a troca fica só em `MarcaWs.tsx`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -12` — topo f306eec (06-T03-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format= -- src/app/entrar src/app/configurar-2fa src/app/sem-permissao src/app/error.tsx src/app/not-found.tsx src/components/casca src/components/marca src/components/Cartao.tsx` — 12 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/casca/moldura-publica.test.ts --reporter=dot` — visto falhando (módulo `MarcaWs` ausente)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/moldura-publica.spec.ts --reporter=line` — o servidor não subiu (typecheck do teste novo)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/casca/moldura-publica.test.ts --reporter=dot` — visto falhando, 6 de 15 (páginas sem a moldura)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/moldura-publica.spec.ts --reporter=line` — o servidor não subiu (typecheck do teste novo)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — 1 erro, `children` no `createElement` do teste novo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/moldura-publica.spec.ts --reporter=line` — visto falhando, 3 de 4 (marca ausente)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 213 arquivos, 4768 de 4768
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=dot` — 158 de 158 (6,1 min)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d --stat -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 9 modificados e 3 novos (1 spec, 2 pastas de componentes), todos da tarefa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 9 arquivos

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa (os dois testes de unidade fora de G5 mudaram só no texto procurado, explicado em Entrega)
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas (T01, T02, Sem permissão e 404 nas duas larguras; a tela de erro não tem como ser aberta no e2e e fica na unidade, ver Decisões)
