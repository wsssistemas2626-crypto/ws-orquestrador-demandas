---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T20-construcao
agente: engenheiro-frontend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G5 e T20), e2e/integracoes.ts, e2e/integracoes.spec.ts, e2e/servidor.ts, playwright.config.ts, package.json, test/tokens-do-e2e.test.ts, test/estatico/projeto.test.ts (diff)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Retomada da 06-T20-construcao interrompida pelo travamento do servidor (12/11, ~07h54 UTC). A árvore tinha o trabalho
parcial, sem entrega e sem commit. Conferi cada arquivo contra a T20 do plano e a G5: a implementação estava completa.
Refiz o vermelho voltando a implementação por um instante, restaurei e rodei a verificação inteira do passo 4.

### Arquivos da T20 (todos, inclusive os que já estavam na árvore)

Modificados:
- `e2e/servidor.ts`: depois do seed, `emitirTokens` cria um token `awave` e um `construir` (`criarTokenDeIntegracao`,
  numa transação do pool do papel do app) e os grava em `E2E_ARQUIVO_TOKENS` por `gravarTokensDoE2e`. O token nunca vai
  à saída nem ao ambiente do app. Em `encerrar`, `apagarTokens` remove o arquivo e a pasta de `mkdtemp`.
- `playwright.config.ts`: sem `BASE_URL`, `process.env.E2E_ARQUIVO_TOKENS ??= join(mkdtempSync(join(tmpdir(),
  'ws-orq-e2e-')), 'tokens.json')`. Com `BASE_URL`, nada muda.
- `package.json`: `"version": "0.3.0"`.
- `test/estatico/projeto.test.ts`: 0.2.0 → 0.3.0 (G5), com a linha de comentário da origem da versão.

Criados:
- `e2e/integracoes.ts`: `TokensDoE2e`, `tokensDoE2e()`, `MOTIVO_SEM_TOKENS` (os três do plano), mais
  `PREFIXO_DA_PASTA`, `gravarTokensDoE2e` (permissão 600, `flag: 'wx'`), `apagarTokensDoE2e` e `HOMOLOGACAO`.
- `e2e/integracoes.spec.ts`: CA-09.1 (o Awave cria com 201 e lê a própria demanda em seis chaves, sem `Origin`, pelo
  build de produção) e CP-7 (pendentes, entrega sem corpo, recebimento com SHA-256 errado = 409 e certo = 204, e o DEC
  sai de pendentes).
- `test/tokens-do-e2e.test.ts`: 8 testes Vitest da gravação e da limpeza do arquivo dos tokens (valores fictícios fora
  do formato `wsod_`).

`CHANGELOG.md` não é desta tarefa: o G1 e o G2 do plano o põem na `10-documentacao`.

### Testes vistos falhando (passo 2)

Na retomada, com `package.json` de volta a 0.2.0 e `gravarTokensDoE2e`/`apagarTokensDoE2e` trocadas por funções que
lançam "não implementado":

`pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/projeto.test.ts test/tokens-do-e2e.test.ts`

```
 ❯ test/tokens-do-e2e.test.ts (8 tests | 5 failed) 28ms
     × grava o JSON dos dois tokens com permissão 600, e tokensDoE2e o lê pela variável 7ms
     × ao encerrar, apaga o arquivo gravado e a pasta de mkdtemp: nada sobra 3ms
     ...
 ❯ test/estatico/projeto.test.ts (11 tests | 1 failed) 28ms
     × versão 0.3.0, privado, ESM, Node 24 e pnpm 12.6.0 fixo (C-39) 14ms
AssertionError: expected '0.2.0' to be '0.3.0' // Object.is equality
      Tests  6 failed | 13 passed (19)
```

Depois, a implementação voltou exatamente como estava, e os testes ficaram verdes (resultados abaixo).

### Verificação (passo 4)

- `pnpm test`: 292 arquivos, **6376 de 6376**.
- `pnpm lint` e `pnpm typecheck`: limpos, sem nenhuma mensagem.
- `pnpm test:e2e` **três vezes seguidas, verde** (RNF-10), porta 3101 livre antes da primeira execução:

| Execução | Passaram | Pulados | Falharam | Duração | CA-09.1 | CP-7 | Teste mais longo |
|---|---|---|---|---|---|---|---|
| 1 | 273 | 9 | 0 | 18,2 min | 769 ms | 1,4 s | `reflow-t15-qa.spec.ts:105` (28,7 s) |
| 2 | 273 | 9 | 0 | 19,2 min | 266 ms | 527 ms | `reflow.spec.ts:57` (20,4 s) |
| 3 | 273 | 9 | 0 | 18,1 min | 651 ms | 893 ms | `axe-todas.spec.ts:229` (28,1 s) |

  Os 9 pulados são os de `capturas.spec.ts`, que já pulavam antes. O `✘` de `vigia.spec.ts:5` é o controle negativo
  esperado (CV-03), e conta entre os que passaram. O teste mais longo da T20 levou 1,4 s.
- Nenhuma pasta `ws-orq-e2e-*` (e, com ela, nenhum `tokens.json`) sobrou em `/tmp` depois da 1ª e da 3ª execução.
- Nenhum `wsod_` na saída das três execuções.
- G4: `git diff a9fd9b8` das superfícies congeladas e de `src/lib/rota.ts` saiu vazio.
- `git status`: só os 7 arquivos da T20.

## Decisões tomadas

- Desvio 1: na `e2e/integracoes.spec.ts`, no e2e local **sem** o arquivo dos tokens, o teste falha com erro em vez de
  pular (o plano pulava com `tokens === null`). Um pulo esconderia uma falha do `e2e/servidor.ts`. Contra a homologação
  (`BASE_URL`), os dois testes continuam pulando com o `MOTIVO_SEM_TOKENS` do plano.
- Desvio 2: no CP-7, o `test.skip` "exige banco recém-semeado" do plano virou `expect(...).toContain(decId)`. O teste só
  roda no e2e local, que sempre sobe um banco recém-semeado, e na homologação ele já pula pelo motivo acima. Um pulo
  ali só esconderia uma regressão do seed (T15).
- Desvio 3: asserções a mais do que o plano escreveu (só sobem): status do GET (200), formato `DEM-AAAAMMDD-NNNN` do id,
  `status: 'nova'` na vista, status 200 de pendentes em cada leitura, `pedido` igual ao `decId` na entrega, e o DEC
  continua pendente depois do 409. Cada `expect` de status tem um rótulo sem token nem `decId`, como pede o G3.3.
- Desvio 4: a limpeza não é o `rmSync(dirname(arquivo), { recursive: true, force: true })` do plano. O arquivo só é
  apagado se este processo o gravou, e a pasta só sai se tiver o prefixo `ws-orq-e2e-` e estiver vazia (`rmdirSync`). Um
  `E2E_ARQUIVO_TOKENS` posto à mão não leva junto uma pasta qualquer. O resultado do passo 4 é o mesmo: nada sobra em
  `tmpdir()`.
- Desvio 5: o arquivo novo `test/tokens-do-e2e.test.ts` não está na lista de arquivos da T20. Ele torna a gravação
  (600, sem sobrescrever) e a limpeza verificáveis no `pnpm test`, sem depender de olhar o `/tmp` depois do e2e. Isso
  dá à T20 um teste que falha antes do código fora da suíte de 18 min.
- O `PREFIXO_DA_PASTA` mora em `e2e/integracoes.ts` e o `playwright.config.ts` o importa, para o prefixo da criação e
  o da limpeza não divergirem.
- Os tokens são emitidos antes do `next build`, logo depois do seed, como o passo 3 pede. Se o build falhar, `encerrar`
  limpa do mesmo jeito.

## Pendências

- Comandos fora da lista **Pode**, todos só de leitura ou no scratchpad da sessão, nenhum no repositório: `grep`, `wc` e
  `ls` (para ler a saída do e2e e conferir o `/tmp`, porque Grep e Glob não estavam disponíveis nesta sessão), `ss`
  (porta 3101, como o maestro pediu) e um `cp` de `e2e/integracoes.ts` para o scratchpad (cópia de segurança antes de
  refazer o vermelho). Todos estão em Comandos executados, do jeito que rodaram. O maestro decide se regrava a entrega.
- Fora da T20, para o tech-lead: dois testes que já existiam passaram de 24 s numa das execuções,
  `reflow-t15-qa.spec.ts:105` (28,7 s na 1ª; 12,5 s e 11,2 s nas outras) e `axe-todas.spec.ts:229` (28,1 s na 3ª).
  Os dois ficaram abaixo dos 30 s do limite, e a variação parece vir da carga da VPS (cada execução levou de 18 a 19
  min). O G3.9 manda dividir teste acima de 24 s, e não mexi neles por estarem fora da tarefa.
- A `definicao_de_pronto` do pedido pede CHANGELOG 0.3.0. Pelo G2 do plano, ele fica com a `10-documentacao`.
- O texto do `pedido.json` não traz nenhuma instrução fora do escopo.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — os 4 modificados e os 3 novos da T20, ramo `construcao/DEC-DEM-20261111-0016-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — topo em 822ac54 (06-T19-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — o trabalho parcial de `e2e/servidor.ts`, `package.json`, `playwright.config.ts` e `test/estatico/projeto.test.ts`
- `wc -l /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0016-v1/05-tech-lead.md /home/deploy/servidor/projetos/ws-orquestrador-demandas/e2e/integracoes.spec.ts /home/deploy/servidor/projetos/ws-orquestrador-demandas/e2e/integracoes.ts /home/deploy/servidor/projetos/ws-orquestrador-demandas/test/tokens-do-e2e.test.ts` — fora da lista Pode (ver Pendências)
- `grep -n "T20\|^## \|^### " /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md` — fora da lista Pode (ver Pendências)
- `grep -rn "pedidoParaBuscar\|pedidoRecebido\|E2E_ARQUIVO_TOKENS" /home/deploy/servidor/projetos/ws-orquestrador-demandas/e2e /home/deploy/servidor/projetos/ws-orquestrador-demandas/scripts /home/deploy/servidor/projetos/ws-orquestrador-demandas/test /home/deploy/servidor/projetos/ws-orquestrador-demandas/.github /home/deploy/servidor/projetos/ws-orquestrador-demandas/vitest.config.ts` — fora da lista Pode (ver Pendências); nenhum outro e2e usa o DEC da `pedidoParaBuscar`
- `ss -ltnp` — fora da lista Pode (ver Pendências); porta 3101 livre
- `ls -d /tmp/ws-orq-e2e-*` — fora da lista Pode (ver Pendências); nenhuma pasta antes de começar
- `cp /home/deploy/servidor/projetos/ws-orquestrador-demandas/e2e/integracoes.ts /tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/a417087a-6a9a-4e48-898f-8a81e31b29be/scratchpad/integracoes.ts.bak` — fora da lista Pode (ver Pendências); cópia no scratchpad
- `pnpm test test/estatico/projeto.test.ts test/tokens-do-e2e.test.ts` — não rodou: sem `package.json` na pasta de trabalho (estruturaAutonoma)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/projeto.test.ts test/tokens-do-e2e.test.ts` — vermelho esperado: 6 falharam, 13 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 6376 de 6376 (292 arquivos)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts src/lib/rota.ts 'drizzle/000[0-6]_*.sql' 'drizzle/meta/000[0-6]_snapshot.json'` — vazio (G4)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 1ª: 273 passaram, 9 pulados, 0 falharam (18,2 min)
- `grep -nE "passed|failed|skipped|flaky|integracoes.spec|tokens|wsod_" <saída da 1ª execução>` — fora da lista Pode (ver Pendências)
- `grep -nE "^\s+-\s|✘|skipped" <saída da 1ª execução>` — fora da lista Pode (ver Pendências)
- `ls -d /tmp/ws-orq-e2e-*` — fora da lista Pode (ver Pendências); nada sobrou
- `grep -nE "\(([1-9][0-9])(\.[0-9])?s\)|\([5-9](\.[0-9])?s\)" <saída da 1ª execução>` — fora da lista Pode (ver Pendências)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 2ª: 273 passaram, 9 pulados, 0 falharam (19,2 min)
- `grep -nE "passed|failed|skipped|flaky|integracoes.spec|reflow-t15-qa|wsod_" <saída da 2ª execução>` — fora da lista Pode (ver Pendências)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 3ª: 273 passaram, 9 pulados, 0 falharam (18,1 min)
- `grep -nE "passed|failed|skipped|flaky|integracoes.spec|reflow-t15-qa|wsod_" <saída da 3ª execução>` — fora da lista Pode (ver Pendências)
- `ls -d /tmp/ws-orq-e2e-*` — fora da lista Pode (ver Pendências); nada sobrou
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — só os 7 arquivos da T20
- `grep -hnE "\(([1-9][3-9]|[2-9][0-9])(\.[0-9])?s\)" <saídas da 2ª e da 3ª execução>` — fora da lista Pode (ver Pendências)

(`<saída da n-ésima execução>` é o arquivo de saída da tarefa em segundo plano, no diretório de tarefas da sessão em
`/tmp/claude-1000/...`.)

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (refeito na retomada, voltando a implementação por um instante; comando e trecho acima)
- [x] `pnpm test` passa (6376 de 6376)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real (tokens só nascem no banco descartável e vão a um arquivo 600 fora do repositório, apagado ao encerrar; nenhum `wsod_` na saída do e2e; valores do Vitest fictícios)
- [x] só mudaram os arquivos da tarefa (os 6 do plano mais `test/tokens-do-e2e.test.ts`, desvio 5)
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas (a T20 não toca tela nem texto de interface; as suítes do axe passaram nas três execuções)
