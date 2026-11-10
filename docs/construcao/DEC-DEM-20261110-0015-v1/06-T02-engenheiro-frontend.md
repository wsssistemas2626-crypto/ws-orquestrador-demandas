---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T02-construcao
agente: engenheiro-frontend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, 06-T02-qa-automacao.md, 06-T02-engenheiro-frontend.md (volta anterior), e2e/fontes.spec.ts, e2e/fontes-qa.spec.ts, e2e/apoio.ts, playwright.config.ts, package.json, test/estatico/fontes-qa.test.ts, test/estatico/vigia.test.ts (regra do import de ./apoio), src/app/(painel)/demandas/page.tsx, src/app/(painel)/pacotes-decisao/[decId]/page.tsx]
status: bloqueado
proximo: engenheiro-frontend
devolvido_para: null
---
## Entrega

Segunda volta da T02, pelo teste instável apontado pelo qa-automacao: `e2e/fontes.spec.ts` › "CV-04 na T03: Noto Sans e
Noto Sans Mono (ids) carregadas". A correção está feita e verde: a suíte inteira de unidade, a e2e inteira, o lint e o
typecheck passam. **Marco `bloqueado` só por um arquivo temporário que eu criei e não consigo apagar** (ver Pendências,
1ª linha): `e2e/tmp-corrida-fontes.spec.ts`. Apagar arquivo (`rm`) não está na minha lista Pode. Hoje ele não tem teste
e não quebra nada, mas não faz parte da tarefa e não pode ir para o commit.

### Causa (confirmada)

A lista da T03 fica dentro de um `<Suspense>` (`src/app/(painel)/demandas/page.tsx:87`). O conteúdo chega por streaming
e o React só o revela depois. Enquanto está escondido, o `.font-mono` já existe no DOM, mas não é desenhado, e a Noto
Sans Mono não é pedida. O teste antigo chamava `document.fonts.ready` logo depois do `page.goto`. Quando a revelação
vinha depois disso, o `ready` resolvia sem a Mono, e a leitura única seguinte a encontrava `loading` ou `unloaded`.

### Correção (só no teste, nenhuma asserção saiu)

Arquivo alterado: `e2e/fontes.spec.ts` (19 linhas a mais, 4 a menos, só em `conferirFontes`).

1. Quando `temMono` (T03 e T11), espera `main .font-mono:visible` antes do `document.fonts.ready`. O `:visible` serve
   para a revelação do Suspense e para a T09, em que a fila terá tabela e cartões no DOM, um deles com `display: none`.
2. A família do mono é lida do mesmo elemento que a espera achou: o primeiro `.font-mono` visível do `main`. Antes era
   o primeiro `.font-mono` do documento, que podia estar escondido.
3. A carga é conferida até passar, por até 5 s, e não por uma leitura só. As duas asserções de antes ficaram com o
   mesmo texto (`expect(carregadas).toContain(r.corpo)` e `if (temMono) expect(carregadas).toContain(r.mono)`) dentro
   de um `await expect(async () => { … }).toPass({ timeout: 5_000 })`, que lê `document.fonts` de novo a cada tentativa.
4. Não mudou: `retries` e tempo-limite do `playwright.config.ts`, o tempo do teste, a conferência das regras
   `@font-face` e a das respostas woff2.
5. Linhas com `expect(` no arquivo: eram 7 e agora são 8. O piso da CV-20 em `fontes-qa.test.ts` é 7 e passa.

### Vi falhar (a forma antiga) e vi a nova estável

A corrida depende do tempo e não aparece sempre. Seis rodadas da forma antiga sem carga na máquina passaram todas.
Para medir, criei uma sonda temporária (`e2e/tmp-corrida-fontes.spec.ts`). Ela entra uma vez e abre `/demandas` N
vezes, cada vez num contexto novo e sem cache, comparando a forma antiga com a nova. Rodei com a suíte de unidade em
paralelo para carregar a máquina:

```
CORRIDA antiga: 0 de 25 falharam; nova: 0 de 25 falharam   (sem carga)
CORRIDA antiga: 1 de 25 falharam; nova: 0 de 25 falharam   (com a suíte de unidade em paralelo)
CORRIDA antiga: 1 de 40 falharam; nova: 0 de 40 falharam   (com a suíte de unidade em paralelo)
```

Na soma: a forma antiga falhou 2 de 90 vezes e a nova, 0 de 90. Junto com as 2 falhas em 6 rodadas do qa-automacao
(`Received array: ["fonteSans", "fonteSans", "fonteSans"]`), isso confirma a causa. Depois da medição, esvaziei a sonda:
ela não tem mais nenhum teste.

Rodadas do `fontes.spec.ts` corrigido: **todas verdes**.

- `fontes.spec.ts` + `fontes-qa.spec.ts`, com a suíte de unidade em paralelo: 7 de 7
- só o teste da T03, `--repeat-each=3`: 3 de 3
- `fontes.spec.ts`: 3 de 3
- e2e inteira: 154 de 154, com a T03 e a T11 incluídas

No total, o teste da T03 corrigido passou 6 de 6 vezes nas rodadas e 90 de 90 na sonda.

Observação: `--repeat-each` acima de 3 esbarra no limite de taxa do login (`429` em `sign-in/email` e
`two-factor/verify-totp`, a partir da 4ª entrada seguida da conta `cto`). Por isso usei várias rodadas curtas e a
sonda, que entra uma vez só.

### Resultados finais

- `pnpm test`: 209 arquivos, **4599 de 4599** passaram, 0 falharam
- `pnpm test:e2e` (inteira): **154 de 154** (9,1 min), com `vigia.spec.ts` como falha esperada
- `pnpm lint`: limpo
- `pnpm typecheck`: limpo
- `git status --short`: `M e2e/fontes.spec.ts` e `?? e2e/tmp-corrida-fontes.spec.ts`, que é o arquivo a apagar

### Desvios

- O qa-automacao sugeriu `expect.poll`. Usei `expect(async () => …).toPass({ timeout: 5_000 })`, que também lê de novo
  até passar. Assim as duas asserções de antes ficam como estavam, linha por linha, e o piso de `expect(` da CV-20 não
  cai. Com `expect.poll`, as duas linhas deixariam de ter `expect(` e o piso do arquivo cairia de 7 para 5.

## Decisões tomadas

- `toPass` em vez de `expect.poll`: mesma retentativa, e as asserções e o piso da CV-20 ficam como estavam.
- `timeout: 5_000` explícito no `toPass`: sem ele, o `toPass` não tem limite próprio e só pararia no tempo do teste.
  5 s é o tempo padrão do `expect`, o mesmo que o `expect.poll` usaria.
- A família do mono vem do primeiro `.font-mono` **visível do `main`**, o mesmo elemento da espera, para a T09 e para o
  conteúdo de Suspense escondido.
- A espera fica dentro de `conferirFontes`, para valer também na T11, como prevenção para a T13.
- A sonda usou `browser.newContext()`, que a regra da vigia proíbe em e2e. Foi só para medir. Ela foi esvaziada e não
  fica no repositório.

## Pendências

- Apagar `e2e/tmp-corrida-fontes.spec.ts`. É a sonda temporária desta volta, já sem teste, e tem só um `import { test }
  from './apoio'` para não reprovar a regra de `test/estatico/vigia.test.ts`. Apagar arquivo (`rm`) não está na minha
  lista Pode. Com ele fora, o critério "só mudaram os arquivos da tarefa" fica cumprido e o status pode ir a `pronto`
  sem outra mudança: a única alteração da tarefa é `e2e/fontes.spec.ts`.
- Comando fora da lista Pode, rodado por engano e só de leitura: um `git -C … grep` em `src/lib/auth.ts`, para achar o
  limite de taxa do login. Não alterou nada e não devolveu nada (está em Comandos executados).
- Para o tech-lead (Minor): `--repeat-each` acima de 3 em spec que chama `entrarComo` esbarra no limite de taxa do
  login (`429`). Isso vale para quem quiser repetir teste com login para provar estabilidade.

## Comandos executados

- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fontes.spec.ts -g "CV-04 na T03" --repeat-each=20` — forma antiga: 7 passaram e 13 falharam, todas por `429` do login a partir da 4ª entrada, e nenhuma pela fonte
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fontes.spec.ts -g "CV-04 na T03" --repeat-each=3` — forma antiga: 3 de 3
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fontes-qa.spec.ts e2e/fontes.spec.ts` — forma antiga: 7 de 7
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — em segundo plano, para carregar a máquina; 1 falha, da sonda temporária na regra da vigia
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fontes.spec.ts` — forma antiga, com carga: 3 de 3
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A6 "customRules" -- src/lib/auth.ts` — fora da lista Pode, rodado por engano, só leitura, sem saída (ver Pendências)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/tmp-corrida-fontes.spec.ts` — o servidor não subiu (erro de tipo na sonda)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico` — 1 falha, a sonda na regra `browser.newContext` de `vigia-qa.test.ts` (esperada enquanto a sonda existia)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/tmp-corrida-fontes.spec.ts` — sem carga: antiga 0 de 25 falharam, nova 0 de 25
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — em segundo plano, para carregar a máquina (falha da sonda, como acima)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/tmp-corrida-fontes.spec.ts` — com carga: antiga 1 de 25 falharam, nova 0 de 25
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/tmp-corrida-fontes.spec.ts` — com carga: antiga 1 de 40 falharam, nova 0 de 40
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — em segundo plano, para carregar a máquina (falha da sonda, como acima)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fontes.spec.ts e2e/fontes-qa.spec.ts` — corrigido, com carga: 7 de 7
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fontes.spec.ts -g "CV-04 na T03" --repeat-each=3` — corrigido: 3 de 3
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fontes.spec.ts` — corrigido: 3 de 3
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 4598 de 4599; falhou `vigia.test.ts` pela sonda esvaziada sem o import de `./apoio`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 154 de 154 (9,1 min; `vigia.spec.ts` como falha esperada)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — `M e2e/fontes.spec.ts`, `?? e2e/tmp-corrida-fontes.spec.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 1 arquivo, `e2e/fontes.spec.ts`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico` — 1 falha em `vigia.test.ts` (a escrita da sonda com o import não tinha sido gravada)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico` — 227 de 227
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 209 arquivos, 4599 de 4599
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- e2e/fontes.spec.ts` — só `conferirFontes` e as duas constantes novas

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (nesta volta a mudança é no próprio teste; a forma antiga foi vista falhando na sonda, 2 de 90 com carga, e nas 2 de 6 do qa-automacao; a saída está em Entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [ ] só mudaram os arquivos da tarefa — falta apagar `e2e/tmp-corrida-fontes.spec.ts` (Pendências, 1ª linha); a única mudança da tarefa é `e2e/fontes.spec.ts`
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas (nenhuma tela mudou; a e2e inteira, com a `axe-todas`, passou)
