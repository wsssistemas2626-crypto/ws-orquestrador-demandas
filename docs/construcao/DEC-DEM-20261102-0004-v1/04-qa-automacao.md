---
pedido: DEC-DEM-20261102-0004-v1
etapa: 04-regressao
agente: qa-automacao
leu: [contrato-passagem.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-frontend.md, e2e/decisao.spec.ts, playwright.config.ts, .gitignore, git diff b8a8c44 9fc863a]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

Regressão da correção do B-01 (commit `9fc863a`, sobre a main `b8a8c44`). A correção cumpre os critérios do pedido, a
suíte inteira passa e o teste que reproduz o defeito agora pula com a mensagem em vez de passar sem provar nada.

### Critérios de aceite e o teste que cobre cada um

| Critério (`pedido.json`) | Teste | Como ficou provado |
|---|---|---|
| Com `CI` definido, o "Arquivar" reprova se a demanda não partir de um status de `ORIGENS_DO_FLUXO` | `e2e/decisao.spec.ts`, `Arquivar → "Pacote arquivado. A demanda foi para Encerrada."` (linha 346), pré-condição `exigeBancoRecemSemeado(ORIGENS_DO_FLUXO.includes(status), …)` | Pela leitura do diff: a condição deixou de aceitar `encerrada`, e o ramo do CI de `exigeBancoRecemSemeado` (`expect(condicao, mensagem).toBe(true)`, linha 45) não mudou. A condição é a mesma que, sem `CI`, fez o teste pular na execução repetida (abaixo). A prova executada com `CI=1` fica fora da minha lista Pode (ver Pendências). |
| Fora do CI, com a demanda já encerrada, o teste é pulado com a mensagem `exige banco recém-semeado: …`; nunca passa sem provar a mudança | O mesmo teste | `--grep "Arquivar" --repeat-each=2`, sem `CI`: 1 passou e 1 pulado. Mensagem do pulado: `exige banco recém-semeado: a demanda DEM-20261102-0012 está encerrada, e o arquivamento não prova a mudança para Encerrada`. Antes da correção, a 2ª repetição passava (01-qa-funcional; 03 viu a falha "antes de arquivar" com a pré-condição velha). |
| O teste confere o status antes e depois do arquivamento | O mesmo teste | Partida em `ORIGENS_DO_FLUXO` (pré-condição); `pronta_para_decisao` "antes de arquivar" depois do DEC novo; `statusDecisao` `arquivada` no DEC e `encerrada` "depois de arquivar" na demanda. Passou na 1ª repetição de cada execução em banco novo. |
| A suíte e2e passa três vezes seguidas, e a rodada repetida no mesmo banco não tem falha nem teste pulado sem mensagem | Suíte inteira; `e2e/decisao.spec.ts --repeat-each=3` | Três execuções seguidas: 143 passados, 0 pulado, 0 falha em cada uma. Repetida no mesmo banco: 19 passados, 8 pulados (todos com mensagem), 0 falha. |

Teste que reproduz o defeito da `01-qa-funcional.md`: `Arquivar → "Pacote arquivado. A demanda foi para Encerrada."`
rodado com `--grep "Arquivar" --repeat-each=2`. A 2ª repetição parte de `encerrada`, que é a condição do B-01. Hoje
ela é pulada com a mensagem; antes da correção, passava.

### Testes acrescentados

Nenhum nesta etapa. Os testes da correção já vieram no commit `9fc863a` e estão cobrindo os critérios:
- conferências novas no "Arquivar" (status antes, `statusDecisao` e status depois, com mensagem);
- teste novo `404 para DEC inexistente, id de outro tipo e caminho inválido; sem sessão, a decisão vai para /entrar`
  (linha 367), sem pré-condição e sem POST. Passou nas três repetições do mesmo banco;
- `test/estatico/projeto.test.ts`, versão 0.1.3.

### Resultados

| Execução | Passados | Pulados | Falhas | Fonte da contagem |
|---|---|---|---|---|
| `pnpm test:e2e` (rodada inicial, sem contagem) | — | — | — | código de saída 0; `test-results/.last-run.json` com `"status": "passed"` e `"failedTests": []` |
| `pnpm test:e2e`, execução 1 de 3, banco novo | 143 | 0 | 0 | reporter de contagem (`test-results/contagem.json`) |
| `pnpm test:e2e`, execução 2 de 3, banco novo | 143 | 0 | 0 | reporter de contagem |
| `pnpm test:e2e`, execução 3 de 3, banco novo | 143 | 0 | 0 | reporter de contagem |
| `e2e/decisao.spec.ts --repeat-each=3`, mesmo banco | 19 | 8 | 0 | resumo do terminal ("8 skipped", "19 passed") e reporter de contagem |
| `e2e/decisao.spec.ts --grep "Arquivar" --repeat-each=2`, mesmo banco | 1 | 1 | 0 | resumo do terminal ("1 skipped", "1 passed") e reporter de contagem |

No `--repeat-each=3`, por repetição: 1ª com 9 passados e 0 pulado; 2ª e 3ª com 5 passados (C-14, M-01, P1-b, A-02 e
404/sessão) e 4 pulados cada. Os 8 pulados têm mensagem `exige banco recém-semeado: …`:
- "nível cto: aprovar A": `a demanda DEM-20261102-0012 já tem DEC aprovado (A-02) ou está encerrada`;
- "dupla aprovação": `a demanda DEM-20261102-0006 já tem DEC aprovado (A-02)`;
- "CA-12.4": `a demanda DEM-20261102-0012 está encerrada, e a devolução não a leva a Em análise`;
- "Arquivar": `a demanda DEM-20261102-0012 está encerrada, e o arquivamento não prova a mudança para Encerrada`.

Pulado sem mensagem: 0. É o que a triagem previu (19, 8 e 0).

- `pnpm test`: 192 de 192 arquivos e 3697 de 3697 testes aprovados.
- `pnpm lint` e `pnpm typecheck`: limpos.

### Conferência pelo `git diff b8a8c44 9fc863a`

- Só mudaram `e2e/decisao.spec.ts`, `package.json` (`version`), `test/estatico/projeto.test.ts` e os arquivos da
  pasta do pedido. Nada em `src/`, `scripts/`, `playwright.config.ts`, `e2e/apoio.ts` nem `e2e/preparacao.ts`.
- Nenhum `.skip`, `.only`, `.fixme` ou `.todo` novo; `retries`, `workers` e `fullyParallel` iguais.
- Nenhuma asserção afrouxada:
  - `expect(statusDa(...)).toBe('encerrada')` continua, agora com mensagem;
  - entraram duas conferências novas (status antes e `statusDecisao`);
  - os três 404 e o redirecionamento para `/entrar` foram para o teste novo sem perder nenhuma conferência. A sessão
    agora usa o DEC de agente do seed em vez do DEC arquivado, e a asserção (`toHaveURL(/\/entrar\?/)`) é a mesma;
  - os `semViolacoes` (axe), o C-36 e a A-02 estão iguais.
- `exigeBancoRecemSemeado` não mudou; mudou só a condição passada a ele.
- O teste estático de versão troca 0.1.2 por 0.1.3: é a nova versão esperada, não uma asserção mais fraca.
- A árvore de trabalho seguiu limpa depois de todas as execuções (`git status`).

## Decisões tomadas

- As três execuções inteiras foram para segundo plano depois de 180 s, e a saída do terminal ficou num arquivo em `/tmp`, que não posso ler. Para contar passados, pulados e falhas, rodei as três com um reporter auxiliar além do `list`. O reporter fica no meu scratchpad, fora do repositório, e grava `test-results/contagem.json` (pasta ignorada pelo git). Não muda o teste nem o código.
- A rodada inicial sem esse reporter ficou registrada só pelo código de saída e pelo `.last-run.json`. As três execuções seguidas que contam para o pedido são as três com contagem.
- A rodada repetida no mesmo banco foi a `decisao.spec.ts --repeat-each=3`, como a triagem pediu. Repetir a suíte inteira no mesmo banco esbarraria no limite C-36 das outras specs, que criam demandas pela API, e isso não tem relação com este defeito.
- Não acrescentei teste: os critérios já estão cobertos pelos testes do `9fc863a`, e o B-01 está reproduzido pelo `--grep "Arquivar" --repeat-each=2`. A pré-condição como função pura em `e2e/preparacao.ts` (item 5, opcional, da 01) ficou fora pela mesma razão da triagem: a ESP limita a mudança a `e2e/decisao.spec.ts`.
- Testes novos sem dependência de ordem nem do relógio: o de 404 e sessão não tem pré-condição nem POST e passou nas três repetições; o "Arquivar" passou na 1ª repetição de um banco novo rodado sozinho (`--grep`). Nenhum dos dois usa data nem `Date`.

## Pendências

- Para o maestro, na `04-revisao`, opcional e sem bloquear (como já está na 02 e na 03): a prova executada do ramo do CI precisa de `CI=1 pnpm test:e2e e2e/decisao.spec.ts --grep "Arquivar" --repeat-each=2`, com o esperado de 1 passado e 1 reprovado com `exige banco recém-semeado: a demanda … está encerrada …`. Essa forma de comando não está na minha lista Pode. Hoje o ramo fica provado pela leitura: a condição é a mesma que fez o pulo fora do CI, e o ramo do CI não mudou.
- Fora deste pedido (N-04 do DEC-DEM-20261102-0003-v1, já com o `analista-requisitos`): a API aceita criar e arquivar DEC numa demanda Encerrada, e o alerta diz "A demanda foi para Encerrada." mesmo quando ela já estava.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo construcao/DEC-DEM-20261102-0004-v1, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — 9fc863a (03-correcao) sobre b8a8c44
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff b8a8c44 9fc863a -- e2e test package.json src scripts playwright.config.ts` — só decisao.spec.ts, package.json e projeto.test.ts; nada em src/ nem scripts/
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — rodada inicial: código de saída 0, .last-run.json "passed" e sem falha
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=list,/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/contagem-reporter.mjs` — execução 1 de 3: 143 passados, 0 pulado, 0 falha
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=list,/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/contagem-reporter.mjs` — execução 2 de 3: 143 passados, 0 pulado, 0 falha
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=list,/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/contagem-reporter.mjs` — execução 3 de 3: 143 passados, 0 pulado, 0 falha
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/decisao.spec.ts --repeat-each=3 --reporter=list,/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/contagem-reporter.mjs` — 19 passados, 8 pulados com mensagem, 0 falha
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/decisao.spec.ts --grep "Arquivar" --repeat-each=2 --reporter=list,/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/contagem-reporter.mjs` — 1 passado, 1 pulado com "exige banco recém-semeado: …", 0 falha
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 192 de 192 arquivos, 3697 de 3697 testes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo depois das execuções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff b8a8c44 9fc863a --stat` — 3 arquivos do sistema e os da pasta do pedido

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] (04 regressão) há um teste que reproduz o defeito descrito em `01-qa-funcional.md`
