---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T20-revisao
agente: tech-lead
leu: [pedido.json, contrato-passagem.md, padrao-tecnico.md (seção 12), docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G7, T19, T20, Verificação na homologação, Cobertura), 06-T20-engenheiro-frontend.md, commit 13c9c76 (git show), commit 3398917 (git show, o código da T20), e2e/servidor.ts, playwright.config.ts, e2e/apoio.ts, .github/workflows/ci.yml, e2e/reflow-t15-qa.spec.ts (linhas 95 a 139), e2e/axe-todas.spec.ts (linhas 215 a 264)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T20 (e2e das integrações contra o build de produção, tokens do e2e local e versão 0.3.0).

O commit informado pelo maestro, `13c9c76`, só regrava a entrega do engenheiro e o `passagens.jsonl` (volta 2, depois da
liberação do bloqueio só de leitura). O código da T20 está no commit anterior da mesma etapa, `3398917` (volta 0), e foi
esse que revisei: `e2e/integracoes.ts`, `e2e/integracoes.spec.ts`, `e2e/servidor.ts`, `playwright.config.ts`,
`package.json`, `test/estatico/projeto.test.ts` e `test/tokens-do-e2e.test.ts`. A árvore está limpa no ramo
`construcao/DEC-DEM-20261111-0016-v1`.

**Nenhum problema Critical ou Important.** Dois Minor, abaixo, que não bloqueiam a passagem e seguem em Pendências.

### Pareceres

| # | Severidade | Arquivo:linha | Problema | Razão |
|---|---|---|---|---|
| M1 | Minor | `e2e/integracoes.spec.ts:27-28` com `playwright.config.ts:39` | O token vai no `extraHTTPHeaders` (`authorization: Bearer …`) de um contexto de API, e a configuração guarda o trace de teste que falha (`trace: 'retain-on-failure'`). Se um dos dois testes falhar, o trace em `test-results/` pode registrar a requisição com o cabeçalho, com o valor do token. | O G3.3 e o IN-04 pedem token fora de log e de arquivo. O efeito real é pequeno: o token só vale no banco descartável, que o `e2e/servidor.ts` derruba ao encerrar; `test-results/` está no `.gitignore`; o CI não publica artefato do e2e (`ci.yml` sem `upload-artifact`). O formato vem do próprio plano (código do passo 1 da T20). Fica para o `/security-review` da `08-revisao` confirmar se o trace grava esse cabeçalho e, se gravar, decidir entre `test.use({ trace: 'off' })` só neste spec ou aceitar o risco pelo token morto. |
| M2 | Minor | `playwright.config.ts:24` | O `mkdtempSync` roda a cada carga da configuração sem `BASE_URL`, mesmo quando o `webServer` não chega a subir (`playwright test --list`, ou falha antes do `e2e/servidor.ts`). Nesses casos sobra uma pasta `ws-orq-e2e-*` vazia em `tmpdir()`. | Sem token: o arquivo só nasce no `e2e/servidor.ts`, e a limpeza dele já cobre o caminho normal e o de erro (`encerrar` com SIGTERM, que o `gracefulShutdown` do `webServer` manda). É lixo de pasta vazia, não exposição. Não precisa de correção nesta tarefa. |

### Checklist da seção 12 do padrão técnico

- A tarefa faz o que o plano pede: os seis arquivos da T20 e o passo 3 inteiro (`E2E_ARQUIVO_TOKENS` só sem `BASE_URL`,
  dois `criarTokenDeIntegracao` numa transação do pool do papel do app depois do seed, gravação 600 com `flag: 'wx'`,
  limpeza no `encerrar`, `version` 0.3.0). Arquivo a mais: `test/tokens-do-e2e.test.ts` (desvio 5), aceito (ver
  Decisões). Nenhum arquivo fora da T20 mudou.
- Teste para cada comportamento novo, e falharia sem o código: a gravação e a limpeza do arquivo têm 8 testes Vitest; a
  versão, o teste estático do G5; as rotas pelo build de produção, o `e2e/integracoes.spec.ts`. O vermelho foi visto
  (6 falharam, 13 passaram) com a implementação desfeita por um instante, e reproduzi o verde (19 de 19).
- Nenhum segredo nem dado pessoal: tokens só nascem em tempo de execução, no banco descartável, e vão a um arquivo 600
  fora do repositório; os valores do Vitest são fictícios e fora do formato `wsod_`; nenhum rótulo de `expect` leva
  token ou `decId`; o erro do `e2e/servidor.ts` segue só com a classe do erro. Ressalva do trace no M1.
- Entrada externa com Zod: não se aplica. A T20 não cria rota nem Server Action; o arquivo dos tokens é escrito e lido
  pelo próprio e2e.
- Banco: não se aplica. Sem migration e sem `GRANT`; o token é emitido pela função da T03 com o papel do app.
- Duplicação: reusa `criarTokenDeIntegracao`, `comTransacao`, `criarPool`, `relogioDoSistema` e os ajudantes de
  `e2e/apoio.ts` (`entrarComo`, `demandaDoSeed`, `api`). O `contextoDe` é novo e não duplica nada: o `api` de
  `e2e/apoio.ts` usa a sessão da página com `Origin`, que é justamente o que este teste não pode mandar. O
  `PREFIXO_DA_PASTA` mora num lugar só e o `playwright.config.ts` o importa.
- Textos de interface e axe: a T20 não toca tela nem texto; as suítes do axe passaram nas três execuções do e2e.
- Minor em Pendências: M1 e M2.
- Item do PR (`/code-review` e `/security-review`): fica com a `08-revisao`.

### Superfícies congeladas e testes de segurança

- G4: o `git diff a9fd9b8` das superfícies congeladas e de `src/lib/rota.ts` saiu **vazio** (rodado por mim).
- IN-16: o commit `3398917` não toca nenhum arquivo da lista do D-17. O único teste existente que mudou é
  `test/estatico/projeto.test.ts`, na linha prevista pelo G5 (0.2.0 → 0.3.0, mais uma linha de comentário); nenhuma
  asserção saiu.
- G3.9: `retries: 0` e tempo-limite sem mudança; os dois testes novos levaram no máximo 1,4 s.

### Verificação

- `pnpm test` dos dois arquivos da T20: 19 de 19. `pnpm lint` e `pnpm typecheck`: limpos.
- Da entrega do engenheiro (não repeti a suíte inteira nem o e2e de 18 min): `pnpm test` 6376 de 6376 e `pnpm test:e2e`
  três vezes seguidas verde (273 passaram, 9 pulados já conhecidos, 0 falharam), sem `tokens.json` sobrando em `/tmp` e
  sem `wsod_` na saída.

## Decisões tomadas

- Desvio 1 aceito (sem o arquivo dos tokens no e2e local, o teste falha em vez de pular): o pulo esconderia uma quebra
  do `e2e/servidor.ts`; na homologação o pulo com o `MOTIVO_SEM_TOKENS` do plano continua, pelo `HOMOLOGACAO`.
- Desvio 2 aceito (no CP-7, o `test.skip` "exige banco recém-semeado" virou asserção): o teste só roda no e2e local,
  que sempre sobe banco novo, e nenhum outro spec usa o DEC de `pedidoParaBuscar`; o pulo só esconderia regressão do
  seed da T15.
- Desvio 3 aceito (asserções a mais): só sobem a cobertura, e os rótulos não levam token nem `decId`.
- Desvio 4 aceito (limpeza mais estreita que o `rmSync` recursivo do plano): o arquivo só sai se este processo o
  gravou, e a pasta só se tiver o prefixo e estiver vazia; um `E2E_ARQUIVO_TOKENS` posto à mão não leva junto uma pasta
  qualquer, e o resultado do passo 4 (nada sobra em `tmpdir()`) é o mesmo.
- Desvio 5 aceito (`test/tokens-do-e2e.test.ts` fora da lista de arquivos): está dentro do que o `engenheiro-frontend`
  edita pelo G1 (`test/`) e dá à T20 um teste que falha antes do código dentro do `pnpm test`, sem depender de olhar o
  `/tmp` depois de 18 min de e2e.
- **Os dois testes antigos acima de 24 s** (`e2e/reflow-t15-qa.spec.ts:105`, 28,7 s numa execução e 12,5 s e 11,2 s
  nas outras; `e2e/axe-todas.spec.ts:229`, 28,1 s numa execução): **não bloqueiam a T20 e não mudam nesta tarefa.** São
  do pedido 0015, estão fora dos arquivos da T20, o G3.2 proíbe mexer em teste existente fora da lista do G5, ficaram
  abaixo dos 30 s e a variação acompanha a carga da VPS (o mesmo teste fez 11 s em outra execução). Ficam registrados
  como dívida técnica DT-0016-01, com o caminho: dividir o `reflow-t15-qa.spec.ts:105` em três testes (T09, T10 e T12,
  as três telas que o título já lista) e o `axe-todas.spec.ts:229` em dois ("primeira e com erro" e "a partir da v1"),
  pelo `engenheiro-frontend`, com uma linha de G5 no plano do pedido que a receber, **sem** subir `timeout` nem
  `retries`. Gatilho: se qualquer um dos dois falhar por tempo no e2e do CI ou no `homologar` da `09-entrega`, vira
  Important e volta como correção antes do PR, pelo mesmo caminho.
- **CHANGELOG 0.3.0: fica com a `10-documentacao`**, como o G1 e o G2 do plano já dizem (ninguém da 06 escreve
  `CHANGELOG.md` nem `docs/`). O item "CHANGELOG e package.json na 0.3.0" da `definicao_de_pronto` fica assim dividido:
  `package.json` cumprido aqui na T20; `CHANGELOG.md` com a `10-documentacao`, conferido pela guarda estática da T14
  (D-20: nenhum valor no formato de token em `CHANGELOG.md`). A `08-revisao` e a `09-entrega` não devem contar a falta
  do CHANGELOG como pendência da construção.

## Pendências

- M1 (Minor) para o `/security-review` da `08-revisao`: confirmar se o trace de teste que falha (`retain-on-failure`)
  grava o cabeçalho `authorization` dos contextos de API do `e2e/integracoes.spec.ts` e decidir entre desligar o trace
  só nesse spec ou aceitar o risco (token de banco descartável, `test-results/` no `.gitignore`, CI sem artefato).
- M2 (Minor), sem ação agora: pasta `ws-orq-e2e-*` vazia pode sobrar em `tmpdir()` quando a configuração carrega e o
  `webServer` não sobe.
- DT-0016-01 (dívida técnica, ver Decisões): dividir `e2e/reflow-t15-qa.spec.ts:105` e `e2e/axe-todas.spec.ts:229`.
  Proposta: entrar no backlog do `/construir` como item de dívida; em que pedido entra (0017, 0018 ou outro) é decisão
  do maestro com Fabiano, porque o 0017 e o 0018 já foram aprovados com escopo fechado. Para a `06-T20-testes`: o
  `qa-automacao` não mexe nesses dois testes. Para a `09-entrega`: anotar a duração dos dois no `homologar` e no CI.
- CHANGELOG 0.3.0 com a `10-documentacao` (ver Decisões).
- O texto do `pedido.json` não traz instrução fora do escopo.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 13c9c76434679efe4574846a9f26bdf33ff68e23` — só a entrega do engenheiro e o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 13c9c76434679efe4574846a9f26bdf33ff68e23` — regravação da lista de comandos da entrega
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6 --stat` — o código da T20 está em 3398917
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 3398917 -- e2e playwright.config.ts package.json test` — os 7 arquivos da T20
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — árvore limpa, ramo `construcao/DEC-DEM-20261111-0016-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts src/lib/rota.ts 'drizzle/000[0-6]_*.sql' 'drizzle/meta/000[0-6]_snapshot.json'` — vazio (G4)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/projeto.test.ts test/tokens-do-e2e.test.ts` — 19 de 19
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
