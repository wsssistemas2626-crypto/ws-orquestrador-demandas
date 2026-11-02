---
pedido: DEC-DEM-20261102-0002-v1
etapa: 04-regressao
agente: qa-automacao
leu: [pedido.json, contrato-passagem.md, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-frontend.md, e2e/apoio.ts, e2e/decisao.spec.ts, e2e/parecer-risco-qa.spec.ts, e2e/sem-violacoes.spec.ts, scripts/seed-ficticio.ts, scripts/scripts.test.ts, test/estatico/projeto.test.ts, package.json, playwright.config.ts, src/modules/limites.ts, src/modules/limites.test.ts, test-results/.last-run.json, test-results/decisao-nível-cto-aprovar--edb19-rete-de-status-manual-P1-d--chromium/error-context.md]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

Regressão da correção do commit `c1f3c4e`, conferida com `git diff dd8ddee c1f3c4e` (a main 0.1.0). Mudaram só
`e2e/apoio.ts`, `e2e/decisao.spec.ts`, `e2e/parecer-risco-qa.spec.ts`, `e2e/sem-violacoes.spec.ts` (novo),
`scripts/seed-ficticio.ts`, `scripts/scripts.test.ts`, `test/estatico/projeto.test.ts` e o campo `version` do
`package.json`, mais os arquivos da pasta do pedido. **Nada mudou em `src/` nem em `playwright.config.ts`**
(`retries: 0`, `workers: 1` e `forbidOnly` como estavam). Não acrescentei teste: os do engenheiro cobrem os cinco
critérios, e a conferência abaixo mostra que eles provam o que dizem.

### Critério de aceite e o teste que o cobre

| # | Critério do pedido | Teste que cobre | O que conferi |
|---|---|---|---|
| 1 | `semViolacoes` só roda o axe depois de `<title>` não vazio e continua exigindo zero violação com as mesmas tags | `e2e/sem-violacoes.spec.ts`, "corrida: o <title> chega 500 ms depois do corpo; o axe espera o título e não acusa violação" | `apoio.ts`: espera `document.title.trim() !== ''` por até 5 s (`page.waitForFunction`) e roda o axe em qualquer caso, com `withTags([...TAGS_AXE])`, sem `disableRules`, `exclude`, filtro de violação nem repetição; continua `expect(violacoes).toEqual([])`. A corrida reproduz o defeito do CI: antes da correção falhou com `document-title` / serious / `html` (trecho na 03), igual ao log da execução 41249512830. Vale também para `agentes-teto.spec.ts` ("T12 com agente ligado") e `decisao.spec.ts` ("T11 decidido"), que chamam o mesmo `semViolacoes` |
| 2 | Uma tela sem `<title>` continua fazendo o teste falhar, pela regra `document-title` | `e2e/sem-violacoes.spec.ts`, "controle negativo: tela sem <title> continua reprovada pela regra document-title" | `await expect(semViolacoes(page, 'T12 sem título')).rejects.toThrow(/document-title/)`: o erro tem de citar a regra, e não o tempo esgotado. A regra continua ligada |
| 3 | `parecer-risco-qa.spec.ts:183` usa demanda do seed e não chama `POST /api/demandas` | `e2e/parecer-risco-qa.spec.ts`, "T07 da ESP com a correção da Lista de textos: ..." (agora na linha 191); apoio em `scripts/scripts.test.ts`, "as demandas próprias do e2e: ..." | A T07 usa `demandaDoSeed(page, TITULOS_DO_E2E.espListaDeTextos)` e confere `totalDeDemandas` igual antes e depois. O duplo clique usa `TITULOS_DO_E2E.rskDuploClique`, e a `decisao.spec.ts` usa `TITULOS_DO_E2E.decisao`, sem a variável de módulo `demandaDaSpec`. O teste do seed confere os 3 títulos exatos, o tipo `melhoria`, a autoria `sem2fa`, o total de 14 e a "cto" com as mesmas 5 demandas do seed |
| 4 | `conferirLimite`, variáveis de ambiente e contas ficam como estão; o 429 do C-36 continua testado | `src/modules/limites.test.ts` ("C-36: com 29 demandas na hora passa; com 30, responde limite_excedido (429) com a mensagem", "C-36: artefatos de ESP, RSK e DEC somam; 59 passa, 60 responde 429 com a mensagem" e os demais) e `src/app/api/demandas/demandas.bordas.test.ts` | `git diff dd8ddee c1f3c4e -- src` vazio: `limites.ts`, `limites.test.ts` e `demandas.bordas.test.ts` sem mudança. Nenhuma variável de ambiente, conta, cabeçalho ou relógio novo no e2e. As três demandas novas são da `sem2fa`, que não cria demanda no e2e; a "cto" fica com as 5 de antes no seed |
| 5 | `pnpm test:e2e` inteiro passa três vezes seguidas contra o build de produção | a suíte inteira, 128 testes em 22 arquivos | Três corridas seguidas sobre o `c1f3c4e`, sem mudar nada entre elas, cada uma com Postgres, seed, `next build` e `next start` próprios (`e2e/servidor.ts`): exit 0, exit 0, exit 0. Com `retries: 0`, exit 0 é nenhuma falha e nenhuma nova tentativa |

### Exploratório da cascata (01 e 02)

Pus uma falha temporária na `decisao.spec.ts`, no "nível cto: aprovar A", logo depois do `semViolacoes(page, 'T11
decidido')`, o mesmo ponto em que o CI falhou: `expect(true, 'FALHA FORCADA 04-regressao (temporaria)').toBe(false)`.
Rodei a suíte inteira.

- Resultado: exit 1, com **um teste só** em `failedTests` (`test-results/.last-run.json`). A pasta de artefatos e o
  `error-context.md` confirmam que é o forçado: `decisao.spec.ts:158`, "Error: FALHA FORCADA 04-regressao (temporaria)".
- Depois do worker novo, os testes seguintes da `decisao.spec.ts` (dupla aprovação, CA-12.4 e arquivar) passaram sobre a
  mesma demanda do seed, e a T07 da `parecer-risco-qa.spec.ts` passou, **sem 429**. Antes da correção, esse mesmo
  cenário dava 429 na T07 (01, seção 3).
- Tirei a falha na hora. `git status --short` ficou vazio: nada dela fica no ramo.

### Conferência de afrouxamento (`git diff dd8ddee c1f3c4e`)

- Nenhum `.skip`, `.only`, `.todo` nem `test.fixme` acrescentado; nenhum teste apagado.
- `scripts/scripts.test.ts`: 11 → 14 e 6 → 9 acompanham as 3 demandas novas. As conferências de antes ficaram, e entraram
  outras: os 3 títulos exatos e o tipo `melhoria` de cada um.
- `test/estatico/projeto.test.ts`: `0.1.0` → `0.1.1`, acompanhando o `package.json` (passo 4 da triagem). As outras
  conferências do `it` são as mesmas.
- `parecer-risco-qa.spec.ts`: as asserções de antes ficaram (`ESP-${d.id}-v1 gravada.`, um RSK só, a resposta sem o
  texto digitado), e entrou a do total de demandas.
- `semViolacoes`: a espera não decide o resultado. O axe roda nos dois casos, e a mensagem só ganha
  "(a página ficou sem <title> por 5 s)".

### Resultados

- `pnpm test`: **192 arquivos, 3697 de 3697**, 0 falha.
- `pnpm lint`: limpo (`eslint .`, sem saída).
- `pnpm typecheck`: limpo (`tsc --noEmit`, sem saída).
- `pnpm test:e2e`: três vezes seguidas, exit 0 nas três (128 testes). Uma quarta corrida com a falha forçada deu um
  teste falhando, o forçado, e nenhum 429.

### Observações (não bloqueiam)

- Baixa: `demanda()` da `decisao.spec.ts` só cria ESP e RSK quando a demanda não tem ESP. Se uma execução parasse entre o
  POST da ESP e o do RSK, a próxima acharia a ESP e não criaria o RSK. O caminho é estreito, os dois POSTs vêm seguidos e
  só caem com o servidor fora. Pode ficar para o Minor da triagem, junto com o `demandaDoSeed`.
- Baixa: `demandaDoSeed` e `demandaDaDupla` procuram entre as 100 primeiras demandas `melhoria`. Hoje a suíte fica bem
  abaixo disso, perto de 70 pela tabela da 01 (14 do seed, 22 da "cto" pela API e até 30 da "administradora"). Se a
  suíte crescer, vale filtrar pela busca da API em vez da página de 100.

## Decisões tomadas

- Não acrescentei teste: cada critério já tem um teste que falharia sem a correção (corrida, total da T07, seed), e o critério 2 tem o controle negativo.
- A falha forçada ficou no ponto exato do CI (depois do axe de "T11 decidido"). É o caminho que deixava a demanda com DEC aprovado ao subir o worker novo, o mais exigente para a troca da variável de módulo pela demanda do seed.
- Conferi qual teste falhou pelo `test-results/.last-run.json` e pelo `error-context.md` do Playwright, que ficam no repositório (no `.gitignore`), e não pela saída em `/tmp`.
- As três corridas limpas vieram antes da corrida com falha forçada, para serem seguidas e sobre o código do `c1f3c4e` sem nenhuma mudança.
- Não rodei a `parecer-risco-qa.spec.ts` sozinha: `pnpm test:e2e <arquivo>` não está na minha lista **Pode**, que tem só `pnpm test:e2e`. A 03 rodou essa spec com a `sem-violacoes.spec.ts` antes da correção, e a suíte inteira cobre a T07 nas quatro corridas.
- Não contei uma a uma as versões da "cto" (perto de 45 de 60 pela 01): a correção não mudou quantas versões cada teste grava, só em qual demanda. Nas quatro corridas não houve 429 de artefato.

## Pendências

- Para o maestro, sem bloquear: as duas observações baixas acima podem entrar no Minor que a triagem já registrou (`demandaDoSeed` nas outras specs).
- O `CHANGELOG.md` da 0.1.1 continua com a `06-documentacao`, pela tabela da triagem.
- Fora do escopo, como manda a ESP: os médios M-01 a M-07 e o médio do reteste do pedido anterior seguem para decisão de Fabiano.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --branch` — ramo construcao/DEC-DEM-20261102-0002-v1, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — c1f3c4e no topo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat dd8ddee c1f3c4e` — 8 arquivos de código e teste, mais a pasta do pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff dd8ddee c1f3c4e -- e2e scripts test package.json src playwright.config.ts` — nada em src nem em playwright.config.ts
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 3697 de 3697 (192 arquivos)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — corrida 1: exit 0
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — corrida 2: exit 0
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — corrida 3: exit 0
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — com a falha forçada temporária: exit 1, só o teste forçado falhou, sem 429
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --ignored --untracked-files=all -- test-results` — só a pasta do teste forçado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — a falha forçada ainda no arquivo (1 linha), antes de tirá-la
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo depois de tirar a falha forçada

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] (04 regressão) há um teste que reproduz o defeito descrito em `01-qa-funcional.md`
