---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T02-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7, T01 e T02), 01-analista-requisitos.md (RF-02, RF-15, RF-16, RNF-06, RNF-07, RNF-10), 02-arquiteto-solucoes.md (ADR-13), 04-seguranca-aplicacao.md (CV-01 a CV-05, CV-20), 06-T01-qa-automacao.md, 06-T02-engenheiro-frontend.md, 06-T02-tech-lead.md, passagens.jsonl, diff do commit f6e8b4b (e2e, src, test, vitest.config.ts, package.json, pnpm-lock.yaml), package.json, pnpm-workspace.yaml, e2e/apoio.ts, e2e/axe-todas.spec.ts (telas e seed), src/app/(painel)/demandas/page.tsx, src/app/(painel)/demandas/fila.tsx, src/app/(painel)/pacotes-decisao/[decId]/page.tsx, test/estatico/projeto.test.ts, test/estatico/pacote-sem-extras.test.ts, test/estatico/piso-de-assercoes-qa.test.ts, test/estatico/vigia-qa.test.ts, src/app/fontes.ts, src/app/layout.test.ts, test/next-font-local.ts, vitest.config.ts, playwright.config.ts, e2e/fontes.spec.ts, e2e/servidor.ts, e2e/preparacao.ts (cabeçalho), e2e/moldura.spec.ts, e2e/fila.spec.ts, e2e/vigia.spec.ts, e2e/vigia-qa.spec.ts (cabeçalho), scripts/seed-ficticio.ts (cabeçalho), 03-ux-ui-design.md (cabeçalho), 05-tech-lead.md (fases), 06-T01-engenheiro-frontend.md (cabeçalho)]
status: devolvido
proximo: engenheiro-frontend
devolvido_para: 06-T02-construcao
---
## Entrega

T02 (Fontes Noto servidas pelo próprio app) verificada. O código cumpre os critérios: Noto Sans no corpo, Noto Sans Mono
nos ids, seis woff2 da mesma origem com `swap`, nenhum recurso externo e as superfícies congeladas sem diff. **Devolvo
por um teste do engenheiro instável**: `e2e/fontes.spec.ts` › "CV-04 na T03: Noto Sans e Noto Sans Mono (ids)
carregadas" falhou em 2 de 6 execuções, sem mudança de código entre elas. A suíte inteira passou na rodada completa
(154 de 154), mas um teste que reprova um terço das vezes vai travar o CI. Fechei também quatro lacunas de cobertura com
testes novos, sem tocar em teste existente nem em código.

### O teste instável

- **Falha:** `expect(r.carregadas).toContain(r.mono)` em `e2e/fontes.spec.ts:34`, com `Expected value: "fonteMono"` e
  `Received array: ["fonteSans", "fonteSans", "fonteSans"]`.
- **Contagem:** 6 execuções de `e2e/fontes.spec.ts`: cinco só com os specs de fonte e uma na suíte inteira. Falhou na
  1ª e na 5ª e passou nas outras quatro. A T01 e a T11 passaram nas 6.
- **Causa: corrida com o streaming, não defeito do app.** Em `src/app/(painel)/demandas/page.tsx:87`, a lista da T03
  fica dentro de um `<Suspense>` e chega depois do `load`. O `conferirFontes` chama `document.fonts.ready` logo depois
  do `page.goto`. Quando a lista ainda não chegou, não há texto em mono na tela, a Noto Sans Mono não foi pedida e o
  `ready` resolve sem ela. A leitura seguinte já encontra o `.font-mono` (a lista chegou nesse meio-tempo), mas a fonte
  ainda está `loading`. Nas execuções que passam, a lista chegou antes do `ready`.
- **Correção sugerida (só no teste; a regra testada não muda):** em `conferirFontes`, quando `temMono`, esperar o
  `.font-mono` dentro do `main` antes do `document.fonts.ready`
  (`await page.locator('main .font-mono:visible').first().waitFor()`; o `:visible` vale a partir da T09, quando a
  fila terá tabela e cartões no DOM, um deles com `display: none`). Depois, conferir o status `loaded` com
  `expect.poll` em vez de uma leitura única, como faz `carregadaNoPeso400` em `e2e/fontes-qa.spec.ts`. Vale pôr a mesma espera na T11
  como prevenção: ela não usa Suspense hoje, mas a T13 vai refazer a tela. Nenhuma asserção sai, e `retries` e o
  tempo-limite não mudam (G3.2, CV-20).

### Critérios da tarefa e os testes que os cobrem

| Critério | Teste (arquivo › nome) |
|---|---|
| CV-04: família de fato carregada (corpo e mono) em T01, T03 e T11 | `e2e/fontes.spec.ts` › "CV-04 na T01…", **"CV-04 na T03…" (instável, devolvido)**, "CV-04 na T11…" |
| CV-04: `@font-face` só com `local(...)` ou `.woff2` da mesma origem em `/_next/static/media/` | `e2e/fontes.spec.ts` › os três testes (`conferirFontes`) |
| CV-04: respostas de fonte da `baseURL` com `content-type: font/woff2` | `e2e/fontes.spec.ts` › os três testes |
| CV-05: versão exata, só em `devDependencies`, nome do pacote conferido, OFL-1.1, sem `preinstall`/`install`/`postinstall` | `test/estatico/fontes.test.ts` › "os dois pacotes: devDependencies com versão exata…" |
| CV-05: integrity sha512 no lockfile | `fontes.test.ts` › "o lockfile tem integrity sha512…"; **novo** `test/estatico/fontes-qa.test.ts` › "lockfile: versão igual à do package.json, só integrity (sem tarball nem git), sem script e sem dependência" |
| CV-05: `pnpm-workspace.yaml` sem `allowBuilds` novo | **novo** `fontes-qa.test.ts` › "pnpm-workspace.yaml sem o @fontsource e sem allowBuilds novo"; CV-01 (diff vazio) |
| CV-05: `next/font/local` só aponta `.woff2`, e nenhum `.js`, `.mjs` ou `.cjs` dos pacotes é importado pelo app | `fontes.test.ts` › "fontes.ts aponta exatamente os seis caminhos…" e "nenhum arquivo de src/ importa código dos pacotes…" (três arquivos); **novo** `fontes-qa.test.ts` › "reprova import, @import, require e caminho que não é .woff2…", "nenhum arquivo de src/ usa o @fontsource fora dos seis caminhos de fontes.ts" (todo `src/`) |
| CV-05 e RNF-10: `package.json` só com as duas linhas novas | **novo** `fontes-qa.test.ts` › "RNF-10: dependências de produção iguais às de 198e97d; de desenvolvimento, só as duas fontes a mais" |
| RNF-06: só woff2, seis arquivos (Sans 400/600/700/800, Mono 400/600), soma ≤ 300 KB | `fontes.test.ts` › "os seis arquivos existem, têm a assinatura wOF2 e somam até 300 KB"; **novo** `fontes-qa.test.ts` › "Noto Sans: 400, 600, 700 e 800…", "Noto Sans Mono: 400 e 600…"; **novo** `e2e/fontes-qa.spec.ts` › "CA-02.2 e RNF-06 na T03…" (seis arquivos no navegador) |
| RNF-06: `font-display: swap` | `fontes.test.ts` (texto de `fontes.ts`); **novo** `fontes-qa.test.ts` (opções passadas ao `next/font/local`); **novo** `e2e/fontes-qa.spec.ts` › "CA-02.2 e RNF-06 na T03…" (todo `@font-face` com arquivo, no navegador) |
| RNF-06: subconjunto que cobre o pt-BR | **novo** `fontes-qa.test.ts` › "@fontsource/noto-sans: o subconjunto latin cobre os caracteres do pt-BR…" (e o mesmo para a Mono), "a leitura do unicode-range reprova caractere de fora" |
| RNF-06 e ADR-13: licença OFL junto dos arquivos | `fontes.test.ts` (campo `license`); **novo** `fontes-qa.test.ts` › "@fontsource/noto-sans: a licença OFL 1.1 viaja no pacote (LICENSE)" (e o mesmo para a Mono) |
| CA-02.1: nenhuma requisição a outra origem | a vigia da T01 em todo e2e, inclusive nos sete testes de fonte |
| CA-02.2: corpo em Noto Sans e id em Noto Sans Mono | `e2e/fontes.spec.ts` (família carregada); **novo** `e2e/fontes-qa.spec.ts` › "CA-02.2 e RNF-06 na T03…" (cada família ligada aos seus arquivos; corpo e id em famílias diferentes), "CA-02.2 na T01…", "CA-02.2 na T02…", "CA-02.2 na T04, T05 e T12…"; **novo** `fontes-qa.test.ts` › "--font-sans e --font-mono declaradas uma vez só, dentro do @theme inline…" |
| CA-02.3: sem Google Fonts em `src/`, `public/` e configuração | `test/estatico/sem-recurso-externo.test.ts` (T01, agora varre também `src/app/fontes.ts`); `test/estatico/vigia-qa.test.ts` (T01) |
| CV-01: superfícies congeladas | `git diff 198e97d HEAD --stat` nas superfícies do G4, mais `src/modules`, `src/app/(painel)` e `playwright.config.ts`: vazio; `src/proxy.test.ts` sem diff e verde |
| CV-20: testes da T02 sem perder asserção nas próximas tarefas | **novo** `fontes-qa.test.ts` › "%s tem ao menos %i linhas com expect(" (`fontes.test.ts` 15, `layout.test.ts` 4, `e2e/fontes.spec.ts` 7, `e2e/fontes-qa.spec.ts` 8), "este arquivo também tem piso" |

### Lacunas encontradas e fechadas

1. **CA-02.2 não distinguia qual família é qual.** O `fontes.spec.ts` confere que a primeira família do corpo e a do
   `.font-mono` estão carregadas. Com o corpo em Noto Sans Mono, ou com uma família só para tudo, ele passaria. O
   `e2e/fontes-qa.spec.ts` lê os `@font-face` da página e liga cada família aos arquivos que ela usa: o corpo aos quatro
   `noto_sans_latin_*`, o id da demanda (o link `DEM-…`) aos dois `noto_sans_mono_latin_*`, com o peso declarado igual
   ao do nome do arquivo. O "qualquer tela" do CA-02.2 ganhou T02, T04, T05 e T12.
2. **O que `fontes.ts` passa ao `next/font/local` só era conferido como texto.** O `fontes.test.ts` tira os `../` dos
   caminhos antes de comparar, então um caminho com `../` a menos passaria (o erro só apareceria no `pnpm build`). Ele
   também não confere se o peso declarado é o do arquivo. O `fontes-qa.test.ts` captura as opções reais por `vi.mock`.
   Cada caminho, resolvido a partir de `src/app/`, tem de chegar ao arquivo do pacote certo, com peso, `latin`,
   `normal`, `swap`, variável e fallback conferidos.
3. **A varredura de import do `@fontsource` lia três arquivos** (Minor do tech-lead). Agora cobre todo `src/`, sem
   contar comentário. Também confere que o substituto `test/next-font-local.ts` não é citado pelo app nem pelo
   `next.config`.
4. **Cadeia de suprimento e dependências:** o lockfile tem a mesma versão do `package.json`, só `integrity` (sem
   tarball nem git), sem `hasBin`, `requiresBuild` ou dependência. A lista de dependências é a de 198e97d mais as duas
   fontes (RNF-10). A licença viaja no `LICENSE` do pacote (ADR-13). O `unicode-range` do subconjunto latin cobre o
   pt-BR, as aspas, o travessão e as reticências.

### Vi falhar

- `fontes-qa.test.ts`: cada regra tem a forma plantada vista reprovando dentro do próprio teste: peso trocado, outro
  subconjunto, caminho que não chega ao pacote, `import`, `@import`, `require`, caminho que não é `.woff2`, e um
  `unicode-range` sem o caractere. Também um `/*` dentro de texto, que não pode apagar o import que vem depois. Na
  primeira rodada, três testes falharam por erro do próprio teste, e não do app: o da varredura, porque o comentário de
  `fontes.ts` cita o `@fontsource`, e os dois do subconjunto, porque o `latin-400.css` do pacote não tem
  `unicode-range`. Corrigi: o comentário que abre a linha sai antes da varredura, e a faixa vem do bloco latin do
  `400.css`.
- A primeira versão do meu e2e lia a carga uma vez só, com a mesma corrida do teste do engenheiro. Passou na única
  rodada, mas troquei pela espera do id e pelo `expect.poll` antes de fechar.
- `e2e/fontes-qa.spec.ts`: troquei por uma rodada a expectativa do corpo pelos arquivos da Mono. Os 4 testes
  reprovaram, com o diff dos quatro `noto_sans_latin_*` recebidos. Voltei a expectativa certa e os 4 passaram.

### Testes acrescentados

- `test/estatico/fontes-qa.test.ts`: 21 testes
- `e2e/fontes-qa.spec.ts`: 4 testes

### Resultados

- `pnpm test`: 209 arquivos, **4599 de 4599** (4578 de antes + 21 novos)
- `pnpm test:e2e` (suíte inteira): **154 de 154** (6,9 min; 150 de antes + 4 novos), com `vigia.spec.ts` como falha
  esperada e a vigia sem achado nos outros 153. Nessa rodada o teste instável passou.
- `pnpm lint`: limpo
- `pnpm typecheck`: limpo

## Decisões tomadas

- Devolver, e não corrigir eu mesmo o `fontes.spec.ts`: o contrato manda devolver teste do engenheiro instável, e a
  correção mexe na forma do teste (espera e `expect.poll`). Quem escreve isso é o dono do arquivo, e a revisão do
  tech-lead confere que nenhuma asserção saiu.
- Meu e2e espera o id na tela e confere a carga com `expect.poll`, sem `waitForTimeout`. Ele não repete a corrida: passou
  em todas as execuções depois dessa forma, inclusive com a suíte de unidade rodando ao mesmo tempo.
- Opções de `fontes.ts` capturadas por `vi.mock` e não lidas como texto: o teste confere o que o `next/font/local`
  recebe, e não a forma do código.
- O id da T03 é achado pelo texto (`DEM-AAAAMMDD-NNNN`) dentro do `main`, e não pela classe `.font-mono`: o CA-02.2
  fala de id, e a T09 vai refazer as classes da fila.
- Pisos de asserção da T02 no meu arquivo novo, e não no `piso-de-assercoes-qa.test.ts` da T01: assim não altero teste
  existente.
- As listas exatas de dependências e de `allowBuilds` reprovam qualquer pacote novo. Isso é de propósito (RNF-10,
  CV-05). A T17 só muda `version`, que o teste não lê.

## Pendências

- Teste instável `e2e/fontes.spec.ts` › "CV-04 na T03: Noto Sans e Noto Sans Mono (ids) carregadas" (2 de 6 execuções
  falharam): o `document.fonts.ready` corre contra a lista da T03, que chega por Suspense; esperar o `.font-mono` e
  conferir a carga com `expect.poll` (ver Entrega, "O teste instável").
- Para o tech-lead (Minor, não bloqueia): o `fontes.test.ts` › "nenhum arquivo de src/ importa código dos pacotes…" segue
  lendo só três arquivos. A cobertura de todo `src/` está agora no `fontes-qa.test.ts`; o nome do teste antigo pode
  ficar.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat f6e8b4b176b9ad49a7f1734ebe75d2943d94af57^ f6e8b4b176b9ad49a7f1734ebe75d2943d94af57` — 12 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff f6e8b4b176b9ad49a7f1734ebe75d2943d94af57^ f6e8b4b176b9ad49a7f1734ebe75d2943d94af57 -- e2e src test vitest.config.ts package.json` — diff do código; teste existente alterado só em `src/app/layout.test.ts` (literal da regex, mais rígido)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff f6e8b4b176b9ad49a7f1734ebe75d2943d94af57^ f6e8b4b176b9ad49a7f1734ebe75d2943d94af57 -- pnpm-lock.yaml` — só as entradas dos dois pacotes
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/fontes-qa.test.ts` — 3 de 21 falharam (erro do próprio teste, ver "Vi falhar")
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/fontes-qa.test.ts` — 21 de 21
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fontes-qa.spec.ts e2e/fontes.spec.ts` — 6 de 7; falhou `fontes.spec.ts` › "CV-04 na T03…" (1ª execução do teste instável)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fontes.spec.ts` — 3 de 3
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fontes-qa.spec.ts` — expectativa trocada de propósito: 4 de 4 falharam, como esperado
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fontes-qa.spec.ts` — 4 de 4
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 209 arquivos, 4599 de 4599
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d HEAD --stat -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml playwright.config.ts "src/app/(painel)"` — vazio (CV-01)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só os 2 arquivos novos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fontes.spec.ts e2e/fontes-qa.spec.ts` — 7 de 7
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fontes.spec.ts` — 3 de 3
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fontes.spec.ts` — 2 de 3; falhou de novo "CV-04 na T03…" (2ª falha)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 154 de 154 (vigia.spec como falha esperada)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/fontes-qa.test.ts` — 21 de 21 (depois do ajuste do `/*` dentro de texto)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fontes-qa.spec.ts` — 4 de 4 (versão final, com o id visível)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 209 arquivos, 4599 de 4599 (versão final dos dois arquivos)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — os 2 arquivos de teste novos e esta entrega

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [ ] a suíte inteira passa — `pnpm test` e a rodada completa do `pnpm test:e2e` passaram, mas o `e2e/fontes.spec.ts` › "CV-04 na T03…" é instável (2 de 6)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
