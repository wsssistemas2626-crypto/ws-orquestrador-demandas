---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T01-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, 05-tech-lead.md, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (cabeçalho, G1 a G6 e T01), .gitignore, 06-T01-engenheiro-backend.md (entrega anterior), nutridebby/package.json, nutridebby/pnpm-workspace.yaml, nutridebby/eslint.config.mjs, nutridebby/tsconfig.json, nutridebby/.prettierrc, nutridebby/postcss.config.mjs, nutridebby/.gitignore]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T01 (Esqueleto do projeto, relógio e fuso) feita conforme o plano, no commit `aba6bcc`. Nesta volta o código ficou
como estava: nenhum arquivo de `src/`, `test/` ou de configuração mudou. Rodei de novo `test`, `lint` e `typecheck` e
regravei só esta entrega.

Interfaces produzidas, com as assinaturas do plano: `Relogio`, `relogioDoSistema`, `relogioFixo` (em
`src/lib/relogio.ts`) e `aaaammddSaoPaulo`, `dataIsoSaoPaulo`, `inicioDoMesSaoPaulo`, `inicioDoProximoMesSaoPaulo`,
`formatarDataHora`, `formatarData` (em `src/lib/fuso.ts`).

### Arquivos criados (commit `aba6bcc`)

- `package.json`: versão 0.1.0, `packageManager: pnpm@12.6.0`, `engines.node >=24`, os scripts do plano (`dev` na
  3101, `start` com `${PORT:-3101}`, `audit:prod`), todas as dependências do padrão nas versões exatas do plano
- `pnpm-lock.yaml`: gerado pelo `pnpm add`
- `pnpm-workspace.yaml`: criado pelo próprio `pnpm add` (ver Desvios)
- `tsconfig.json`: `strict`, `noUncheckedIndexedAccess`, `resolveJsonModule`, paths `@/*` → `src/*`
- `next.config.ts`: `poweredByHeader: false`, `serverExternalPackages: ['pg', 'pg-boss', 'pino']`
- `vitest.config.ts`: `environment: 'node'`, os três `include` do plano, `globalSetup: ['test/setup-global.ts']`,
  `testTimeout` 30 s, `hookTimeout` 180 s, alias `@` → `src`
- `eslint.config.mjs`: `eslint-config-next` 16.3.8 (core-web-vitals e typescript), `react/no-danger: 'error'` (C-18),
  `no-console: 'error'` (G3.7); ignora `.next/`, `drizzle/`, `src/vendor/`, `playwright-report/`, `test-results/`
- `.prettierrc`, `postcss.config.mjs` (`@tailwindcss/postcss`)
- `docker-compose.dev.yml`: `postgres:16-alpine`, só em `127.0.0.1:5434:5432` (C-35, parte de dev), credenciais
  fictícias de uso local
- `src/app/layout.tsx` (`<html lang="pt-BR">`, título "WS Orquestrador de Demandas"), `src/app/page.tsx`
  (`redirect('/demandas')`)
- `src/lib/relogio.ts`, `src/lib/fuso.ts`
- `test/setup-global.ts` (vazio, a T04 preenche)

### Arquivos modificados (commit `aba6bcc`)

- `.gitignore`: as entradas do padrão (seção 10) já estavam todas; acrescentei `*.tsbuildinfo` (o `tsc` com
  `incremental` grava esse arquivo na raiz) e `next-env.d.ts` (gerado pelo `next build`)

### Arquivos alterados nesta volta

- Só esta entrega (`06-T01-engenheiro-backend.md`).

### Testes criados

- `src/lib/relogio.test.ts`: 3 testes (instante como cópia, só anda quando mandado, `relogioDoSistema` devolve `Date`)
- `src/lib/fuso.test.ts`: 4 testes (data de São Paulo e não UTC, CA-04.1; início do mês civil; virada de ano em
  dezembro; formatação pt-BR)
- `test/estatico/compose.test.ts`: 1 teste (C-35: toda porta publicada começa com `127.0.0.1:` e existe a
  `127.0.0.1:5434:5432`)

### Teste antes do código (visto falhando, na primeira volta)

`pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test`, com os testes e o `vitest.config.ts` escritos
e sem `relogio.ts`, `fuso.ts` nem `docker-compose.dev.yml`:

```
 FAIL  src/lib/fuso.test.ts [ src/lib/fuso.test.ts ]
Error: Cannot find module './fuso' imported from .../src/lib/fuso.test.ts
 FAIL  src/lib/relogio.test.ts [ src/lib/relogio.test.ts ]
Error: Cannot find module './relogio' imported from .../src/lib/relogio.test.ts
 FAIL  test/estatico/compose.test.ts > docker-compose.dev.yml só publica porta em 127.0.0.1
Error: ENOENT: no such file or directory, open 'docker-compose.dev.yml'
 Test Files  3 failed (3)
      Tests  1 failed (1)
```

É a falha que o passo 3 do plano espera.

### Resultado nesta volta

- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test`: 3 arquivos, 8 de 8 testes passaram,
  0 falharam

  ```
   Test Files  3 passed (3)
        Tests  8 passed (8)
  ```

- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint`: limpo (`eslint .` sem saída)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck`: limpo (`tsc --noEmit` sem saída)

### Desvios do plano, com a razão

1. **`pnpm-workspace.yaml` novo.** O pnpm 12.6.0 recusou o `pnpm add -D` (`ERR_PNPM_IGNORED_BUILDS`: esbuild,
   cpu-features, protobufjs, ssh2, unrs-resolver) e criou sozinho o `pnpm-workspace.yaml` com valores a preencher.
   Sem esses valores, todo `pnpm install` seguinte (outros engenheiros, CI, Dockerfile) falha. Não editei o arquivo à
   mão, porque ele não está na minha lista Pode: preenchi pelo próprio `pnpm add`, com `--allow-build` (aceita `!` para
   negar), deixando os mesmos valores do NutriDebby: `esbuild: true`; `cpu-features`, `protobufjs`, `ssh2` e
   `unrs-resolver: false`. Depois disso o `pnpm install` terminou sem erro. O arquivo tem só o bloco `allowBuilds`.
2. **`fuso.ts`: deslocamento do dia alvo.** O código do plano usava o deslocamento da data de referência para montar a
   meia-noite do mês seguinte. Usei o deslocamento do próprio dia 1º (lido ao meio-dia UTC desse dia). Hoje dá o
   mesmo resultado (São Paulo está sem horário de verão desde 2019); se o horário de verão voltar, a versão do plano
   erraria por uma hora. Formatador `Intl` criado uma vez só, no módulo.
3. **Teste a mais em `fuso.test.ts`:** virada de ano (dezembro → janeiro e 1º/01 antes das 03:00 UTC), o ramo
   `mes === 12` que o plano não cobria.
4. **`relogioFixo` recusa data inválida** (`RangeError`), para um teste com ISO mal escrito não seguir com `NaN`.
5. **`tsconfig.json`:** `target: ES2022` (o NutriDebby usa ES2017); o resto segue o NutriDebby mais o que o plano pede.
6. **`.prettierrc` com `printWidth: 120`** (NutriDebby usa 100), porque é a largura em que o plano e as entregas
   estão escritos; aspas simples, ponto e vírgula e vírgula no fim, como no NutriDebby.
7. **`tsx` ficou com `^4.23.15`** (o plano não fixa versão); as dependências com versão no plano estão exatas.

## Decisões tomadas

- Código da T01 mantido como no commit `aba6bcc`: o motivo da volta era só a forma da entrega, não o código.
- Nesta volta, leitura só pelo Read; pelo Bash, só `git -C` e `pnpm -C` no repositório do sistema, um comando por vez.
- Escrevi o `vitest.config.ts` junto com os testes, antes do código, porque sem o `include` e o `globalSetup` o
  `pnpm test` não mostraria a falha do passo 3 do jeito que o plano espera.
- `allowBuilds` pelo `pnpm add --allow-build`, e não à mão: é o único caminho dentro da lista Pode.
- Sem `globals.css` nem import de Tailwind no layout: o plano não pede nesta tarefa, e o design system é da T36.
- `.gitignore` ganhou `*.tsbuildinfo` e `next-env.d.ts`, para os artefatos do `tsc` e do `next build` não entrarem no
  commit.

## Pendências

- Leitura fora da lista Pode, registrada para a revisão: na primeira volta li sete arquivos de configuração do
  NutriDebby (`/home/deploy/servidor/projetos/nutridebby`: `package.json`, `pnpm-workspace.yaml`, `eslint.config.mjs`,
  `tsconfig.json`, `.prettierrc`, `postcss.config.mjs`, `.gitignore`), que não é nem o repositório do sistema nem a
  estruturaAutonoma, como referência do padrão. Nada foi alterado fora do repositório do sistema. Nesta volta não li
  nada fora do repositório do sistema e da estruturaAutonoma.
- Os comandos da primeira volta (instalação das dependências, `pnpm add --allow-build`, teste vermelho, `build`) estão
  na versão desta entrega do commit `aba6bcc`; abaixo estão só os desta volta.
- Tech-lead: confirmar se o `pnpm-workspace.yaml` (Desvio 1) fica no repositório; sem ele, o próximo `pnpm install`
  volta a falhar. Se for preciso mudar esse arquivo à mão no futuro, o caminho é incluí-lo na lista Pode do
  `engenheiro-backend` ou passar a mudança ao `devops-sre`.
- `pnpm add` avisou que o `eslint` 9.39.5 está marcado como obsoleto (a 10.x existe); o padrão fixa `^9`. Mudar de
  linha é decisão do padrão técnico, não desta tarefa.
- O `docker compose -f docker-compose.dev.yml up -d` não foi rodado: a T01 não usa banco; a T04 sobe o Postgres.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — árvore limpa no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -5` — `d7ab75d` no topo, `aba6bcc` (T01) logo abaixo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 8 de 8 passaram, 0 falharam
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa (mais o `pnpm-workspace.yaml` que o `pnpm add` criou, Desvio 1); nesta volta, só esta entrega
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (a T01 não cria rota, Server Action nem job; `page.tsx` só redireciona)
