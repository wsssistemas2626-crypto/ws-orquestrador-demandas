---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T02-construcao
agente: engenheiro-frontend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, 06-T01-engenheiro-frontend.md, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7, T01 e T02), package.json, src/app/layout.tsx, src/app/layout.test.ts, src/app/globals.css, src/proxy.ts, next.config.ts, playwright.config.ts, vitest.config.ts, e2e/apoio.ts, e2e/axe-todas.spec.ts, src/app/(painel)/demandas/fila.tsx, src/app/(painel)/pacotes-decisao/[decId]/page.tsx]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T02 (fase 2, Identidade): Noto Sans e Noto Sans Mono servidas pelo próprio app, por `next/font/local` sobre os
arquivos dos pacotes `@fontsource` (ADR-13). Nenhuma tela mudou de texto ou de estrutura; a CSP e o `next.config.ts`
não mudaram.

### Versões exatas resolvidas (D-13)

- `@fontsource/noto-sans` **5.3.0**
- `@fontsource/noto-sans-mono` **5.3.0**

Resolvidas pelo `pnpm add -D -E @fontsource/noto-sans @fontsource/noto-sans-mono`, o único comando de pacote rodado.
O comando não pediu aprovação de script de instalação e **não** alterou `pnpm-workspace.yaml`.

### Diff do `package.json` (só as duas linhas, CV-05)

```diff
   "devDependencies": {
     "@axe-core/playwright": "4.13.0",
+    "@fontsource/noto-sans": "5.3.0",
+    "@fontsource/noto-sans-mono": "5.3.0",
     "@playwright/test": "1.63.0",
```

O `pnpm-lock.yaml` ganhou só as entradas dos dois pacotes: `importers` (specifier e version 5.3.0), `packages` (com
`resolution: {integrity: sha512-…}`) e `snapshots` (`{}`, sem dependência). Nenhuma outra linha mudou.

### Arquivos criados

- `src/app/fontes.ts`: `fonteSans` (400, 600, 700, 800, latin, `--font-noto-sans`, fallback ajustado sobre Arial) e
  `fonteMono` (400 e 600, latin, `--font-noto-sans-mono`), os dois com `display: 'swap'`, caminhos literais dos woff2
  em `node_modules/@fontsource/*/files/`. Nenhum `.js` dos pacotes é importado.
- `test/estatico/fontes.test.ts`: os seis woff2 com assinatura `wOF2` e soma ≤ 300 KB; `fontes.ts` com exatamente os
  seis caminhos, `next/font/local`, dois `swap` e as duas variáveis; os dois pacotes só em `devDependencies`, versão
  exata, `OFL-1.1`, sem `preinstall`/`install`/`postinstall`; integrity sha512 no lockfile; nenhum import de
  `@fontsource` em `layout.tsx`, `fontes.ts` e `globals.css`.
- `e2e/fontes.spec.ts`: CV-04 em T01 (`/entrar`), T03 (`/demandas`) e T11 (o DEC de rascunho de agente do seed, o
  mesmo da `axe-todas`). Em cada tela: a primeira família do `body` (e do `.font-mono`, em T03 e T11) está entre as
  fontes carregadas; toda parte do `src` de todo `@font-face` é `local(...)` ou `url(...woff2)` que, resolvida contra a
  folha, fica na mesma origem em `/_next/static/media/`; todo woff2 baixado vem da mesma origem com `content-type:
  font/woff2`. Só leitura: entra pela API, faz GET e abre telas; não cria demanda (C-36). A vigia da T01 vale nos três.
- `test/next-font-local.ts`: substituto de `next/font/local` só para o Vitest (ver Desvios, item 2).

### Arquivos alterados

- `package.json` e `pnpm-lock.yaml`: só pelo `pnpm add` acima.
- `src/app/layout.tsx`: importa `fonteSans` e `fonteMono` e põe só as duas `.variable` no `<html>`
  (`className={`${fonteSans.variable} ${fonteMono.variable}`}`). Nenhum `.style`.
- `src/app/globals.css`: `--font-sans` e `--font-mono` saem do `@theme` e entram num `@theme inline` logo depois:
  `--font-sans: var(--font-noto-sans), system-ui, sans-serif;` e
  `--font-mono: var(--font-noto-sans-mono), ui-monospace, monospace;`. O resto do arquivo não mudou.
- `vitest.config.ts`: o alias passa à forma de lista, com o `@` de antes e o `next/font/local` apontado para o
  substituto (regex exata `^next\/font\/local$`).
- `src/app/layout.test.ts`: o seletor do `<html>` (ver Desvios, item 3).

### Teste escrito antes, visto falhando

`pnpm -C … test test/estatico/fontes.test.ts`, antes do `pnpm add` e de `fontes.ts`:

```
 ❯ test/estatico/fontes.test.ts (5 tests | 5 failed) 21ms
     × os seis arquivos existem, têm a assinatura wOF2 e somam até 300 KB 8ms
     × fontes.ts aponta exatamente os seis caminhos, só .woff2, com display swap e as duas variáveis 3ms
     × os dois pacotes: devDependencies com versão exata, licença OFL-1.1, sem script de instalação 2ms
     × o lockfile tem integrity sha512 dos dois pacotes 5ms
     × nenhum arquivo de src/ importa código dos pacotes (só o caminho do woff2 em fontes.ts) 1ms
AssertionError: node_modules/@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff2: expected false to be true
Error: ENOENT: no such file or directory, open '…/src/app/fontes.ts'
```

O `e2e/fontes.spec.ts` também foi visto falhando na primeira rodada depois do código (3 de 3), pela forma do `src`
(Desvios, item 1); a família carregada já passava, o que mostra que a asserção de família não é vazia.

### Resultados finais

- `pnpm test`: 208 arquivos, **4578 de 4578** passaram, 0 falharam.
- `pnpm test:e2e`: **150 de 150** passaram (7,2 min), com `e2e/vigia.spec.ts` como falha esperada; a vigia da T01
  ligada em todos os outros, sem requisição a outra origem nem violação de CSP (CA-02.1). As telas com axe da
  `axe-todas` seguem sem violação com a fonte nova.
- `pnpm build`: compilou (Turbopack), as fontes vão para `/_next/static/media/`.
- `pnpm lint` e `pnpm typecheck`: limpos.
- G4 (CV-01): `git diff 198e97d --stat` em `src/proxy.ts`, `src/proxy.test.ts`, `next.config.ts`, `src/app/api`,
  `src/db`, `drizzle`, `src/modules`, `src/worker`, `src/jobs`, `src/agents`, `src/lib`, `pnpm-workspace.yaml`,
  `playwright.config.ts` e `src/app/(painel)`: vazio.

### Desvios do plano

1. `e2e/fontes.spec.ts`, conferência do `src` do `@font-face`: o plano esperava `url("/_next/static/media/….woff2")`.
   O build do Next 16.4.1 (Turbopack) grava a URL **relativa à folha** (`url("../media/noto_sans_latin_400_normal-s.p.….woff2")`),
   e foi isso que reprovou os três testes na primeira rodada. Agora o teste lê o `href` de cada folha, confere a forma
   (`local(...)` ou `url(....woff2)` com `format("woff2")` opcional) e resolve a URL contra a folha, exigindo
   **a mesma origem da página e o caminho `/_next/static/media/<arquivo>.woff2`**. É a mesma garantia do plano, sobre
   o endereço que o navegador de fato pede; uma URL absoluta de outra origem continua reprovando.
2. `test/next-font-local.ts` e o alias em `vitest.config.ts` (fora da lista de arquivos da T02, dentro da lista Pode):
   o `src/app/layout.test.ts` (da 0.1.x) renderiza o `RootLayout`, e `next/font/local` só funciona dentro do
   compilador do Next; no Vitest o import padrão vem vazio (`TypeError: default is not a function` em
   `src/app/fontes.ts:8`, 1 arquivo reprovado na primeira rodada da suíte). O substituto devolve o mesmo formato
   (`className`, `variable`, `style`) com classe previsível; o build e o e2e usam a função de verdade. O substituto
   fica em `test/`, não em `src/`, e não é importado pelo app.
3. `src/app/layout.test.ts` (teste existente fora da tabela G5), só o seletor: `/^<html lang="pt-BR">/` virou
   `/^<html lang="pt-BR" class="fonte-teste-font-noto-sans fonte-teste-font-noto-sans-mono">/`. A regra testada fica
   (o `lang="pt-BR"` continua o primeiro atributo do `<html>`, e as outras duas asserções do teste, `<body>` e um só
   `lang=`, não mudaram) e ficou mais rígida: agora também prova que as duas variáveis das fontes chegam ao `<html>`.
   Nenhuma asserção apagada; o número de linhas `expect(` do arquivo é o mesmo.
4. T11 do `e2e/fontes.spec.ts`: o plano deixou o corpo como comentário. Implementado com GET
   `/api/demandas?tipo=bug&limit=100` e o título da demanda de tipo bug do seed (o mesmo meio da `axe-todas`), sem
   navegar antes, e `conferirFontes(page, '/pacotes-decisao/DEC-<id>-v1', true)`.

## Decisões tomadas

- `@theme inline` como o plano manda: a família se resolve na raiz, onde o `next/font` põe as variáveis; o e2e prova
  que o `body` e o `.font-mono` usam a família carregada.
- Conferir o `src` pela URL resolvida contra a folha, não pela string: é o que o navegador pede, e cobre build que
  grave a URL relativa ou absoluta.
- Substituto de `next/font/local` por alias do Vitest, em vez de mexer no layout ou apagar o teste do `lang`: mantém o
  layout como o plano o escreve e a asserção de hoje viva.
- A T11 do e2e usa o DEC do seed já citado pela `axe-todas`, que existe em qualquer estado (pendente ou decidido) e
  tem `.font-mono` (ids do DEC, da ESP e do RSK).

## Pendências

- Para o tech-lead (Minor, não bloqueia): a soma dos seis woff2 passou no teste de ≤ 300 KB; o número exato não foi
  impresso, porque o teste só compara com o limite.
- Para a `10-documentacao` (G2): as versões exatas `@fontsource/noto-sans` 5.3.0 e `@fontsource/noto-sans-mono` 5.3.0
  vão ao CHANGELOG 0.2.0.
- Para a `08-revisao` (G2): o `pnpm add` mostrou o aviso já conhecido de `eslint@9.39.5` descontinuado e de três
  subdependências descontinuadas (`@esbuild-kit/core-utils`, `@esbuild-kit/esm-loader`, `glob@10.5.0`); nenhum deles
  veio com os dois pacotes novos, que não têm dependência.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — topo db5acd9 (06-T01-testes)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/fontes.test.ts` — vermelho esperado: 5 de 5 falharam
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas add -D -E @fontsource/noto-sans @fontsource/noto-sans-mono` — 5.3.0 e 5.3.0, +2 pacotes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só `package.json` e `pnpm-lock.yaml` alterados pelo comando
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- package.json pnpm-lock.yaml pnpm-workspace.yaml` — só as duas linhas e as entradas dos dois pacotes; `pnpm-workspace.yaml` sem diff
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico` — 206 de 206
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas build` — compilou
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fontes.spec.ts` — 3 de 3 falharam (forma relativa do `src`, Desvios 1)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fontes.spec.ts` — 3 de 3
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — saída truncada na tela; rodado de novo em segundo plano
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 4576 de 4576 testes, 1 arquivo reprovado na carga (`src/app/layout.test.ts`, Desvios 2)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/layout.test.ts test/estatico` — 208 de 208
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 4578 de 4578
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 150 de 150 (vigia.spec como falha esperada)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d --stat -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules src/worker src/jobs src/agents src/lib pnpm-workspace.yaml playwright.config.ts "src/app/(painel)"` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 6 alterados, 4 novos (lista em Entrega)

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa (mais `vitest.config.ts`, `test/next-font-local.ts` e o seletor de `src/app/layout.test.ts`, explicados em Desvios 2 e 3)
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas (a T02 não muda texto; a `axe-todas` passa em T01 a T12 com a fonte nova)
