---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T01-construcao
agente: engenheiro-frontend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7 e T01), e2e/apoio.ts, playwright.config.ts, vitest.config.ts, eslint.config.mjs, tsconfig.json, package.json, test/estatico/decisao-e2e.test.ts, cabeçalho e importações dos 23 e2e/*.spec.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T01 (fase 1, Vigilância): vigia de origem e CSP em todo e2e, teste estático de recurso externo e piso de asserções.
Nenhuma tela mudou; nada em `src/` mudou.

### Arquivos criados

- `e2e/vigia.ts`: funções puras `origemDaUrl`, `problemasDaVigia` e o tipo `Coletor` (CV-03).
- `e2e/vigia.spec.ts`: teste negativo do CV-03 (folha de estilo de `https://exemplo.test` injetada em `/entrar`), com
  `test.fail()`.
- `test/estatico/sem-recurso-externo.test.ts`: CV-02, nove regras com a forma plantada vista reprovando e a varredura
  de `src/`, `e2e/`, `test/` e dos `*.config.*`.
- `test/estatico/vigia.test.ts`: funções da vigia, todo spec importando `test` e `expect` de `./apoio`, e
  `playwright.config.ts` sem `bypassCSP` e com `retries: 0`.
- `test/estatico/piso-de-assercoes.test.ts`: CV-20 e D-12, piso de linhas `expect(` por arquivo de segurança (números
  do plano, de 198e97d).

### Arquivos alterados

- `e2e/apoio.ts`: exporta `test` (o `test` do Playwright estendido com a fixture automática `vigiaDeOrigemECsp`) e
  `expect`; `origem()` passa a usar `testBase.info()`. As linhas de `TAGS_AXE`, `AxeBuilder` e
  `expect(violacoes, …)` não mudaram (o `decisao-e2e.test.ts` as confere e passa).
- Os 23 `e2e/*.spec.ts` que já existiam: só a importação (G5). `expect` e `test` saem de `@playwright/test` e entram
  no `import … from './apoio'` que o spec já tinha; os tipos (`Page`, `Locator`, `Request`, `APIResponse`) continuam
  de `@playwright/test`. No `preparacao.spec.ts`, que não importava de `./apoio`, a linha virou
  `import { expect, test } from './apoio';`. Nenhuma asserção, título ou passo de teste mudou.

### Caminho do teste negativo

Valeu o **plano A** (`test.fail()`): o erro do `expect` no fim da fixture conta para o `test.fail()` no Playwright
1.63.0. Prova: tirei o `test.fail()` por uma rodada só deste spec e a vigia reprovou pelos três canais, depois recoloquei:

```
Error: CV-03: nenhuma requisição a outra origem nem violação de CSP
+   "requisição a outra origem: https://exemplo.test/x.css",
+   "violação de CSP: Loading the stylesheet 'https://exemplo.test/x.css' violates the following Content Security Policy directive: \"default-src 'self'\". ...",
+   "violação de CSP: style-src-elem https://exemplo.test/x.css",
   at apoio.ts:47
```

Com o `test.fail()` de volta: `✘ 1 … CV-03 (negativo) … (1.2s)` e `1 passed`.

### Specs com contexto novo

Nenhum spec usa `browser.newContext()`. Os que abrem outra aba usam `context.newPage()` no mesmo contexto, que a vigia
cobre (ver Decisões).

### Teste escrito antes, visto falhando

`pnpm test test/estatico/sem-recurso-externo.test.ts test/estatico/vigia.test.ts test/estatico/piso-de-assercoes.test.ts`,
antes de `e2e/vigia.ts` e das importações:

```
 FAIL  test/estatico/vigia.test.ts [ test/estatico/vigia.test.ts ]
Error: Cannot find module '../../e2e/vigia' imported from .../test/estatico/vigia.test.ts
 FAIL  test/estatico/sem-recurso-externo.test.ts > CV-02: sem recurso externo > cada regra reprova a forma plantada
+   "src/app/globals.css: endereço absoluto na interface",
 Test Files  2 failed | 1 passed (3)
      Tests  1 failed | 21 passed (22)
```

A varredura do repositório (`nenhum arquivo do repositório tem recurso externo`) e o piso passaram já na primeira
rodada, como o plano previa: o código de hoje está limpo.

### Resultados finais

- `pnpm test`: 205 arquivos, 4491 de 4491 testes passaram, 0 falharam.
- `pnpm test:e2e`: 145 de 145 passaram (10,9 min), com `e2e/vigia.spec.ts` como falha esperada (✘ contado como
  passou) e a vigia ligada em todos os outros 144: nenhuma requisição a outra origem nem violação de CSP na suíte.
- `pnpm lint` e `pnpm typecheck`: limpos.
- G4: `git diff 198e97d --stat` nas superfícies congeladas, mais `src/modules`, `src/lib`, `src/app/(painel)`,
  `package.json`, `pnpm-lock.yaml` e `playwright.config.ts`: vazio.

### Desvios do plano

1. `sem-recurso-externo.test.ts`, teste "cada regra reprova a forma plantada": a lista esperada para o `@import` do
   Google Fonts em `src/app/globals.css` ganhou o quarto item, `'src/app/globals.css: endereço absoluto na interface'`.
   A regra "endereço absoluto na interface" do próprio plano vale para `src/app/*.css`, então ela também acusa a forma
   plantada; o plano a esqueceu na lista. A expectativa ficou mais rígida, não mais frouxa.
2. `vigia.test.ts`: o exemplo de origem externa passou de `https://fonts.gstatic.com/s/x.woff2` para
   `https://fontes.exemplo.test/s/x.woff2`. Com o endereço do Google, o próprio `vigia.test.ts` reprovaria na regra
   "Google Fonts" do `sem-recurso-externo` (que varre `test/**`); o que se testa (a origem de uma URL https externa)
   é o mesmo.
3. `e2e/apoio.ts`: console, `exposeFunction('__vigiaCsp')` e `addInitScript` ficam no **contexto**
   (`context.on('console')`, `context.exposeFunction`, `context.addInitScript`), e o websocket é vigiado na página do
   teste e em toda página nova do contexto (`context.on('page')`). O plano os punha só na `page`; assim a aba aberta
   com `context.newPage()` (caminho completo da `pedido-construcao.spec.ts`) também fica vigiada, sem precisar de
   `vigiar(context, page)`. A cobertura é maior que a do plano, e o comportamento na página do teste é o mesmo.

## Decisões tomadas

- Plano A do teste negativo: a saída sem `test.fail()` mostra que a falha vem da vigia, e não de tempo esgotado nem de
  navegação.
- Vigia no contexto, não só na página: cobre a segunda aba dos specs que já a usam, sem mudar spec.
- `import { type Page } from '@playwright/test'` em vez de `import type`: mexe só nos nomes da linha que já existia, e
  o lint aceita.

## Pendências

- Para o tech-lead (Minor, não bloqueia): o `preparacao.spec.ts` diz no cabeçalho que os testes "não abrem navegador".
  Com a fixture automática, cada teste dele abre uma página em branco, sem navegar nem chamar o servidor; os 12 testes
  passam em 88 a 275 ms. Não mexi no comentário porque a T01 só autoriza trocar a importação nos specs.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format= -- e2e test/estatico playwright.config.ts` — lista dos specs e estáticos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/sem-recurso-externo.test.ts test/estatico/vigia.test.ts test/estatico/piso-de-assercoes.test.ts` — vermelho esperado: 2 arquivos falharam, 1 de 22 testes falhou
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico` — 119 de 119
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 4491 de 4491
- `tail -n 12 /tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/tasks/bg2njxfsq.output` — só leitura do resumo da rodada anterior, gravado na pasta temporária da sessão; fora da lista Pode, feito por engano no lugar do Read; declarado aqui
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 145 de 145 (vigia.spec como falha esperada)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/vigia.spec.ts` — 1 de 1 (a edição que tirava o `test.fail()` ainda não tinha sido aplicada)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/vigia.spec.ts` — sem `test.fail()`: falhou pela vigia (saída acima), como esperado
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/vigia.spec.ts` — com `test.fail()` de volta: 1 de 1
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d --stat -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules src/worker src/jobs src/agents src/lib package.json pnpm-lock.yaml pnpm-workspace.yaml playwright.config.ts "src/app/(painel)"` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 24 alterados em `e2e/`, 5 novos (2 em `e2e/`, 3 em `test/estatico/`)

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas (a T01 não toca tela nem texto de interface; o axe de todas as telas segue verde na suíte e2e)
