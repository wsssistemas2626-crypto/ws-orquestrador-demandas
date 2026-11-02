---
pedido: DEC-DEM-20261102-0003-v1
etapa: 04-regressao
agente: qa-automacao
leu: [contrato-passagem.md, padrao-tecnico.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-frontend.md, git diff 30b71b5 b8cfd25 (e2e/apoio.ts, e2e/decisao.spec.ts, e2e/parecer-risco-qa.spec.ts, e2e/preparacao.ts, e2e/preparacao.spec.ts, playwright.config.ts, package.json, test/estatico/projeto.test.ts), e2e/preparacao.ts, e2e/preparacao.spec.ts, e2e/decisao.spec.ts, e2e/apoio.ts, playwright.config.ts, .gitignore, test-results/.last-run.json, e2e/test-results/contagem-*.json (criados nesta etapa)]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

Regressão da correção `b8cfd25` sobre a main `30b71b5`. Nenhum arquivo de `src/`, `scripts/`, `.github/` ou `Dockerfile`
mudou (`git diff --stat 30b71b5 b8cfd25`). No fim desta etapa, a árvore está limpa e igual a `b8cfd25` (`git status` e
`git diff` vazios). Esta etapa não acrescentou teste ao repositório: os testes de regressão já estavam no commit da
correção, e eu os conferi um por um, inclusive vendo-os falhar contra o código antigo (abaixo).

### Critérios de aceite do pedido e o teste que cobre cada um

| # | Critério | Teste (arquivo e nome) | Evidência nesta etapa |
|---|---|---|---|
| 1 | Com a ESP criada e o RSK faltando, a preparação cria só o RSK e os testes seguintes passam | `e2e/preparacao.spec.ts`: `prepararEspERsk (M-01) › 1 ESP e 0 RSK (a falha parcial da M-01): não cria ESP e cria um RSK` e `› a criação do RSK falha uma vez: a 1.ª chamada rejeita com o mesmo erro, a 2.ª cria só o RSK, a 3.ª não cria nada`; `e2e/decisao.spec.ts`: `M-01: a preparação da demanda da spec completa o que falta e não cria versão a mais` | Rodada com a M-01 forçada pelo estado (ver abaixo): 9 de 9. Contra a guarda antiga, o M-01 e os dois casos de `preparacao.spec` falham |
| 2 | Rodar a preparação duas vezes não cria versão a mais | `e2e/preparacao.spec.ts`: `› 1 ESP e 1 RSK: não cria nada` e a 3.ª chamada do caso da falha do RSK; `e2e/decisao.spec.ts`: `M-01: …` (chama `demanda()` duas vezes e confere as listas de ids com `toEqual`) | Passou em todas as execuções, inclusive nas repetições 2 e 3 do `--repeat-each=3`, com as listas já cheias |
| 3 | O duplo clique e a T07 conferem exatamente uma versão nova, sem supor v1 | `e2e/parecer-risco-qa.spec.ts`: `duplo clique em "Gravar": um envio só e um RSK só; a resposta da Server Action não traz o que foi digitado` e `T07 da ESP com a correção da Lista de textos: …`; `e2e/preparacao.spec.ts`: os quatro casos de `proximoId (B-01)` | `toEqual([esperado, ...antes])`, e não `toBeGreaterThanOrEqual`. A T07 lê `escopoInclui` pela versão `id === esperado`. Os dois passaram nas três repetições (v1, v2 e v3 de cada demanda) |
| 4 | A suíte e2e rodada duas vezes seguidas contra o mesmo banco passa, ou o teste que exige banco recém-semeado é pulado com mensagem | `e2e/decisao.spec.ts`: `exigeBancoRecemSemeado` em `nível cto: aprovar A …`, `dupla aprovação: …` e `CA-12.4: …` | `--repeat-each=3` num banco só: 75 passaram, 6 pulados e 0 falhou. Detalhe abaixo |
| 5 | A regra A-02 e o C-36 continuam intactos e testados | `e2e/decisao.spec.ts`: `A-02: com um DEC aprovado na demanda, aprovar outro mostra o conflito e o pacote continua pendente` (roda em qualquer banco); C-36 e A-02 do servidor nos testes de `src/`, sem mudança | A-02 passou nas 3 execuções completas e nas 3 repetições: alerta `Não foi possível concluir: outro pacote desta demanda já está aprovado.`, o DEC novo `pendente` e exatamente um DEC `aprovada`. `src/` sem diff, então `limites.ts`, `decidir.ts` e `transicoes.ts` não mudaram. `pnpm test`: 3697 de 3697 |
| 6 | O comentário de `playwright.config.ts:4` descreve as duas fontes de dado do e2e | Sem teste automatizado: é documentação (ver Decisões) | Conferido no diff: cita o seed fictício (`CONTAS_FICTICIAS`, o DEC de rascunho de agente e `TITULOS_DO_E2E`) e a API pela sessão da página; diz que as demandas do seed acumulam versões e que o teste pulado diz `exige banco recém-semeado: ...`. Nenhuma linha de configuração mudou (`workers: 1`, `retries: 0`, `fullyParallel: false`, `forbidOnly`, `webServer`) |

Pontos que o maestro pediu para conferir:

- **Preparação idempotente que completa uma falha parcial:** `prepararEspERsk` confere a lista de ESP e depois a de RSK,
  e cria cada uma só quando está vazia. A falha não é engolida: no caso 4, `rejects.toThrow` com o mesmo erro.
- **Duplo clique e T07 sem supor v1:** `proximoId` sai da lista lida antes de agir. O botão usa `exact: true` (sem isso,
  `-v1` casaria com `-v10`). A lista depois é exatamente `[esperado, ...antes]`. O `SENTINELA` é único por execução
  (`randomUUID`), e o `not.toContain(SENTINELA)` continua valendo na 2.ª e na 3.ª repetição.
- **Nenhum teste pulado sem mensagem:** só existe o `test.skip(!condicao, mensagem)` condicionado de
  `exigeBancoRecemSemeado`, sempre chamado depois das leituras GET e antes de qualquer POST. Com `CI`, a mesma
  pré-condição vira `expect(condicao, mensagem).toBe(true)` e reprova. Não há `.only`, `.fixme`, `.todo`, `test.skip`
  sem condição nem `return` silencioso no diff.
- **A-02, C-36 e axe intactos:** `TAGS_AXE` e `semViolacoes` não mudaram (`e2e/apoio.ts` só ganhou a paginação de
  `demandaDoSeed`). Todas as chamadas do axe que existiam na `decisao.spec` e na `parecer-risco-qa.spec` continuam, e há
  uma nova, `T11 com o conflito da A-02`. Não há exceção de A-02 nem de C-36 para o teste.

### `pnpm test:e2e` três vezes seguidas, com a contagem

Cada execução, sem `BASE_URL`, sobe um Postgres novo pelo Testcontainers. O harness passa para segundo plano todo
comando com mais de 180 s e grava a saída em `/tmp`, que eu não posso ler. Por isso, a contagem saiu de um reporter
auxiliar do Playwright, posto junto do `list` pela linha de comando, que grava um JSON por execução em
`e2e/test-results/`, pasta que o git ignora (ver Decisões).

| Execução | Início (UTC) | Total | Passaram | Pulados | Falharam | Instáveis |
|---|---|---|---|---|---|---|
| 0 (sem o reporter auxiliar) | 15:05 | — | código de saída 0; `test-results/.last-run.json`: `"status": "passed"`, `"failedTests": []` | — | 0 | — |
| 1 | 15:11:04 | 142 | 142 | 0 | 0 | 0 |
| 2 | 15:16:47 | 142 | 142 | 0 | 0 | 0 |
| 3 | 15:21:57 | 142 | 142 | 0 | 0 | 0 |

As execuções 1 a 3 são as três seguidas da definição de pronto: 142 de 142 em cada, com 0 pulado. É o que a triagem
esperava num banco novo, sem `CI`: nenhuma pré-condição de banco recém-semeado ficou falsa. Cada execução levou cerca
de 5 minutos.

### `--repeat-each=3` das três specs, num banco só

`pnpm test:e2e e2e/decisao.spec.ts e2e/parecer-risco-qa.spec.ts e2e/preparacao.spec.ts --repeat-each=3`: 81 testes,
**75 passaram, 6 pulados e 0 falhou** (1,7 min). A saída veio em primeiro plano.

- **Ordem:** as cópias rodaram em sequência, repetição por repetição. Os testes 1 a 27 são a 1.ª repetição (decisao,
  depois parecer-risco-qa, depois preparacao), os 28 a 54 a 2.ª e os 55 a 81 a 3.ª. Isso confirma o que a triagem
  pediu para conferir.
- **1.ª repetição:** 27 de 27, 0 pulado.
- **2.ª e 3.ª:** foram pulados só os três testes previstos, um de cada por repetição, todos com a mensagem:
  - `nível cto: aprovar A …`: `exige banco recém-semeado: a demanda DEM-20261102-0012 já tem DEC aprovado (A-02) ou está encerrada`;
  - `dupla aprovação: …`: `exige banco recém-semeado: a demanda DEM-20261102-0006 já tem DEC aprovado (A-02)`;
  - `CA-12.4: …`: `exige banco recém-semeado: a demanda DEM-20261102-0012 está encerrada, e a devolução não a leva a Em análise`.
- **Passaram nas três repetições:** C-14, M-01, P1-b, A-02 e "Arquivar", este com o 404 da N-01 sobre a versão
  seguinte à mais nova, inclusive na 3.ª. Também o duplo clique, a T07 e os 12 testes de `preparacao.spec`.

### Rodada com a M-01 forçada pelo estado (sem commit)

Como a triagem pediu, criei à mão só a ESP de D, antes da preparação. Para isso, acrescentei por um tempo, no topo de
`e2e/decisao.spec.ts`, um teste `TEMPORARIO 04-regressao: força a falha parcial da M-01 (só a ESP de D, sem RSK)`. Ele
confere 0 ESP e 0 RSK, grava `ESP-<D>-v1` pela API e confere `[ESP-<D>-v1]` e 0 RSK. Depois das rodadas, tirei o teste
com o Edit.

1. **Com a correção** (`pnpm test:e2e e2e/decisao.spec.ts`): **9 de 9**. O M-01 viu a ESP já gravada e o RSK vazio. A
   ESP ficou igual (`[ESP-<D>-v1]`), e o RSK passou a `[RSK-<D>-v1]`. P1-b, "aprovar A", A-02, a dupla, o CA-12.4 e o
   "Arquivar" passaram em seguida. Uma segunda rodada igual, com `preparacao.spec` junto, deu 21 de 21.
2. **Prova de que o teste pega o defeito:** troquei `prepararEspERsk` por um tempo pela guarda antiga (só a lista de
   ESP decide, e cria as duas) e rodei `pnpm test:e2e e2e/decisao.spec.ts e2e/preparacao.spec.ts` com a demanda forçada:
   **9 falharam e 12 passaram**.
   - `M-01: …`: `RSK da demanda`, esperado `["RSK-DEM-20261102-0012-v1"]` e recebido `[]`. É a M-01 de
     `01-qa-funcional.md`.
   - `P1-b`, `nível cto: aprovar A` e `Arquivar`: `POST /api/demandas/DEM-20261102-0012/pacotes-decisao respondeu 400`,
     o 400 de `Faltam itens para o pacote.` descrito no passo 6 da reprodução.
   - `A-02`, `dupla aprovação` e `CA-12.4`: `código TOTP da conta cto`, uma falha em cascata do login (ver Pendências).
   - `preparacao.spec.ts`, os casos `1 ESP e 0 RSK` (`rsk: 0` em vez de `1`) e `a criação do RSK falha uma vez`
     (`rsk: 0` em vez de `1` na 2.ª chamada).

   Depois, `prepararEspERsk` voltou ao código do commit, e o `git diff` ficou vazio.

### `pnpm test`, `pnpm lint` e `pnpm typecheck`

- `pnpm test`: **192 arquivos, 3697 de 3697**, rodado sozinho (115,6 s).
  - Na 1.ª rodada, feita em paralelo com o lint e o typecheck, deu 3696 de 3697. Falhou
    `src/modules/pacotes-decisao/concorrencia.test.ts:73`
    (`C-13: decisão × ESP ou RSK nova › aprovação e ESP v2 ao mesmo tempo: nunca DEC aprovado depois da ESP v2`), com
    `Test timed out in 30000ms`.
  - O arquivo é de `src/` e não foi tocado por este pedido. Passou na rodada sozinha. Está registrado em Pendências como
    sensível a CPU disputada.
- `pnpm lint`: limpo (`eslint .`), antes e depois das rodadas, com o reporter auxiliar já em `e2e/test-results/`.
- `pnpm typecheck`: limpo (`tsc --noEmit`), antes e depois.

### Conferência do diff (`git diff 30b71b5 b8cfd25`)

- Nenhum teste existente foi apagado. `TITULO_DUPLA`, `demandaDaDupla` e o tipo `Demanda` saíram, mas eram apoio, e a
  dupla passou a usar `demandaDoSeed(TITULOS_DO_E2E.duplaAprovacao)`. Os títulos de todos os testes continuam.
- Nenhum `.skip`, `.only` ou `.todo` sem condição.
- Nenhuma asserção ficou mais fraca. As trocas de `-v1` fixo por `esperado` mantêm o `toEqual`, e a lista final ficou
  mais estrita, porque confere também as versões antigas e a ordem. A T07 trocou `itens[0]` pela busca por id. O laço do
  404 trocou `v9` por `proximoId` sobre a lista lida logo antes.
- O `expect(pkg.version).toBe('0.1.2')` de `test/estatico/projeto.test.ts` é a troca de versão pedida na triagem.
- Os dados de teste são fictícios: `DOC-FICTICIO-0001`, textos com `(fictício)`, contas de `CONTAS_FICTICIAS`, demanda
  `DEM-20261102-0099` nos falsos e o sentinela aleatório. Não há segredo, token nem valor de `.env`.

## Decisões tomadas

- A contagem do e2e saiu de um reporter auxiliar, porque o harness passa para segundo plano todo comando com mais de 180 s, mesmo com `timeout` 600000, e a saída vai para `/tmp`, que eu não posso ler.
- O reporter fica em `e2e/test-results/contagem-reporter.mjs`: está dentro de `e2e/` (lista Pode), o padrão `test-results/` do `.gitignore` o cobre, e o `outputDir` do Playwright (`./test-results` da raiz) não o apaga.
- O reporter entrou pela linha de comando (`--reporter=list,./e2e/test-results/contagem-reporter.mjs`), e não pelo `playwright.config.ts`: a configuração não mudou, e o `list` continuou na saída.
- A M-01 foi forçada com um teste temporário na própria `decisao.spec.ts`, e não com um arquivo novo: assim ele roda antes da preparação, no mesmo banco, e sai com o Edit sem deixar arquivo para trás.
- A prova de que o teste pega o defeito foi refeita aqui, contra a guarda antiga, e não só aceita da 03: um bug corrigido precisa de um teste visto falhando antes da correção.
- O critério 6 (o comentário) não ganhou teste automatizado: conferir o texto de um comentário seria um teste frágil e sem comportamento. Ele foi conferido no diff, e a única trava útil, a de que nenhuma linha de configuração mudou, está conferida no mesmo diff.
- A suíte inteira rodada duas vezes na mesma hora contra a mesma homologação não foi testada: pela leitura do N-02 na triagem, isso esbarra no C-36, que não pode ganhar exceção. O critério 4 foi conferido pelo `--repeat-each=3`.
- A falha do C-13 na 1.ª rodada do `pnpm test` não bloqueia a etapa: o arquivo é de `src/`, sem mudança neste pedido, e passou sozinho. Fica como achado de estabilidade.

## Pendências

- Para o `tech-lead` e a `qualidade` (estabilidade, baixa, fora deste pedido): `src/modules/pacotes-decisao/concorrencia.test.ts:73` (`C-13 … aprovação e ESP v2 ao mesmo tempo`) estourou os 30 s com o `pnpm test` rodando junto do lint e do typecheck, e passou sozinho. No CI, ou num runner disputado, pode ficar instável. Vale medir o tempo dele e ver se o limite de 30 s ou o número de iterações cabe na máquina.
- Para o `tech-lead` (fragilidade latente, baixa, fora deste pedido): na rodada contra a guarda antiga, três testes que falharam em menos de 1 s, um depois do outro, caíram em `código TOTP da conta cto` (`e2e/apoio.ts:39`). Vários logins da mesma conta na mesma janela do TOTP parecem ser recusados. Isso não aparece quando os testes passam, mas mascara a causa real quando muitos falham em sequência. Fica para uma demanda própria, se Fabiano quiser.
- Para o maestro: o caminho de `exigeBancoRecemSemeado` com `CI` (o `expect` que reprova) não roda aqui, porque eu não ligo `CI`. Ele é exercitado no CI do PR (Parada 3), onde o banco é sempre novo e a pré-condição tem de ser verdadeira.
- Para o maestro: em `e2e/test-results/` ficaram o reporter auxiliar e os JSONs de contagem (`contagem-2026-11-02T15-*.json`). O git os ignora, e eles não entram em commit. Eu não os apaguei porque `rm` não está na minha lista Pode. Podem ficar ou ser apagados.
- Para a `06-documentacao`: CHANGELOG 0.1.2.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — b8cfd25 (03-correcao) no topo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo construcao/DEC-DEM-20261102-0003-v1
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 30b71b5 b8cfd25` — 13 arquivos, nenhum de src/, scripts/, .github/ ou Dockerfile
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 30b71b5 b8cfd25 -- e2e playwright.config.ts package.json test` — saída longa, lida por arquivo nos dois comandos seguintes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 30b71b5 b8cfd25 -- e2e/parecer-risco-qa.spec.ts playwright.config.ts test package.json` — sem asserção afrouxada
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 30b71b5 b8cfd25 -- e2e/decisao.spec.ts` — sem asserção afrouxada, skip só condicionado e com mensagem
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 3696 de 3697 (C-13 estourou 30 s, em paralelo com lint e typecheck)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --ignored` — e2e/test-results/ ignorado pelo git
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 3697 de 3697, sozinho
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — execução 0, código de saída 0, .last-run.json passed
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=list,./e2e/test-results/contagem-reporter.mjs` — execução 1: 142 de 142, 0 pulado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --ignored --untracked-files=all -- e2e/test-results` — nome do JSON da execução 1
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=list,./e2e/test-results/contagem-reporter.mjs` — execução 2: 142 de 142, 0 pulado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --ignored --untracked-files=all -- e2e/test-results` — nome do JSON da execução 2
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=list,./e2e/test-results/contagem-reporter.mjs` — execução 3: 142 de 142, 0 pulado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --ignored --untracked-files=all -- e2e/test-results` — nome do JSON da execução 3
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/decisao.spec.ts e2e/parecer-risco-qa.spec.ts e2e/preparacao.spec.ts --repeat-each=3 --reporter=list,./e2e/test-results/contagem-reporter.mjs` — 75 passaram, 6 pulados com mensagem, 0 falhou
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --ignored --untracked-files=all -- e2e/test-results` — nome do JSON do --repeat-each
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/decisao.spec.ts --reporter=list,./e2e/test-results/contagem-reporter.mjs` — 8 de 8 (o Edit do teste temporário não tinha entrado; rodada comum)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/decisao.spec.ts --reporter=list,./e2e/test-results/contagem-reporter.mjs` — M-01 forçada, com a correção: 9 de 9
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/decisao.spec.ts e2e/preparacao.spec.ts --reporter=list,./e2e/test-results/contagem-reporter.mjs` — M-01 forçada, com a correção (o Edit da guarda antiga não tinha entrado): 21 de 21
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/decisao.spec.ts e2e/preparacao.spec.ts --reporter=list,./e2e/test-results/contagem-reporter.mjs` — M-01 forçada, com a guarda antiga: 9 falharam e 12 passaram (defeito reproduzido)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --ignored --untracked-files=all -- e2e/test-results` — nome do JSON da rodada com a guarda antiga
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, depois de desfazer as duas edições temporárias
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — vazio
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste (o 6, que é o texto de um comentário, foi conferido no diff; ver Decisões)
- [x] a suíte inteira passa (`pnpm test` 3697 de 3697; `pnpm test:e2e` 142 de 142 três vezes seguidas)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real (A-02 e M-01 rodam sozinhos; o sentinela vem de `randomUUID`; `proximoId` sai do estado lido)
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] (04 regressão) há um teste que reproduz o defeito descrito em `01-qa-funcional.md` (`decisao.spec.ts` M-01 e `preparacao.spec.ts` casos 2 e 4, vistos falhando contra a guarda antiga com a ESP sem RSK)
