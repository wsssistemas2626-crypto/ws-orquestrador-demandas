---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T25-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T25), 06-T25-engenheiro-backend.md, 06-T24-tech-lead.md (pendências para a T25 e a T27), git show c5f1b92, src/modules/agentes/provedor.ts, src/modules/agentes/provedor.test.ts, test/provedor-falso.ts, test/sentinelas.ts, test/estatico/variaveis.test.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Primeira revisão da T25, commit `c5f1b92`. O código está em três arquivos novos: `src/modules/agentes/provedor.ts`,
`src/modules/agentes/provedor.test.ts` e `test/provedor-falso.ts`. Os outros dois arquivos do commit são a entrega do
engenheiro e a linha do registro. **Não há problema Critical nem Important.** A passagem segue para a `06-T25-testes`.
Há dois Minor, nos Pareceres e em Pendências.

### Conferência contra o plano

| Ponto do plano (T25) | Situação |
|---|---|
| Interfaces `PedidoAoProvedor`, `RespostaDoProvedor`, `ErroProvedor`, `ProvedorIA`, `ProvedorAnthropic`, `criarProvedor`, `MAX_TOKENS_TETO`, `ProvedorFalso` | Iguais às do plano. `TEMPO_LIMITE_MS` e `TipoErroProvedor` são acréscimos exportados e não mudam assinatura nenhuma |
| `new Anthropic({ apiKey, fetch, timeout: 120_000, maxRetries: 0 })` | Atendido (`provedor.ts:51` a `:61`). Os acréscimos `authToken: null`, `baseURL` fixo e `logLevel: 'off'` estão no desvio 1, que foi aceito (ver abaixo) |
| Corpo só com `model`, `max_tokens`, `system` e `messages` | Atendido (`provedor.ts:69` a `:74`). O corpo é montado campo a campo, então uma chave extra no pedido não passa, nem com um `as` que engane o tipo. O teste da chave extra prende isso |
| Junta os blocos `text` | Atendido (`provedor.ts:81` em diante). O bloco `thinking` é ignorado. Resposta sem texto devolve `''` com os tokens, e o schema da T27 decide |
| `maxTokens` acima de 8.000 recusado antes de chamar | Atendido, e com mais: 0, negativo, fracionário e infinito também são recusados (desvio 3). O teste confere que nenhuma chamada saiu |
| 401 vira `autenticacao`; 429 e 5xx viram `transitorio` | Atendido (`provedor.ts:42` a `:45`). O 403 também vira `autenticacao`, e o 400 e o 404 viram `transitorio` (desvio 2) |
| Fábrica: sem chave, `null` | Atendido. A chave vazia ou só com espaços também dá `null`. A fábrica recebe o ambiente por parâmetro e não lê `process.env` |
| RNF-06 (120 s) | Atendido. O teste usa o relógio falso do Vitest: a chamada segue pendente aos 119 s e vira `transitorio` depois dos 120 s, sem nova tentativa. Não depende do relógio real (padrão, seção 7) |
| RNF-14 e CA-16.5 | Atendido. O `fetch` é falso em todos os testes. A chave é `chave-ficticia-de-teste`, só no arquivo de teste. O teste `a suíte não tem a chave definida` passa |
| C-27 | Atendido. A regra de `test/estatico/variaveis.test.ts:11` permite o nome da chave em `src/modules/agentes/provedor.ts`. O nome não aparece em `test/provedor-falso.ts`, e o arquivo de teste fica fora da varredura (`.test.ts`) |

### Desvios do plano

| # | Desvio | Parecer |
|---|---|---|
| 1 | `baseURL` fixo, `authToken: null` e `logLevel: 'off'` | Aceito. O SDK lê `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN` e `ANTHROPIC_LOG` do ambiente quando a opção não vem. A primeira mandaria a chave e o texto da demanda para outro host. A segunda abriria uma segunda credencial. A terceira poria o corpo no console, e isso fere C-21. A entrega mostra a saída do `debug` com o sentinela do texto quando o `logLevel` sai. Os três testes usam `vi.stubEnv` e falham sem a opção |
| 2 | 403 vira `autenticacao`; 400 e 404 viram `transitorio` | Aceito. O 403 é permissão da conta, e tentar de novo não resolve. O 400 e o 404 não consomem token, e as 3 tentativas da T27 terminam em falha. Com isso, todo erro sai como `ErroProvedor`, e a T27 trata um conjunto fechado de dois tipos |
| 3 | `maxTokens` menor que 1 ou fracionário recusado | Aceito. É o mesmo `RangeError`, antes de chamar. Não muda a interface |
| 4 | Exporta `TEMPO_LIMITE_MS` e `TipoErroProvedor` | Aceito. São aditivos, e a T27 pode usar o tempo limite para conferir a trava de 150 s |

### Testes e TDD

- A entrega mostra a primeira rodada falhando, por módulo ausente, antes do código.
- O engenheiro também tirou as quatro opções de endurecimento por uma rodada, e 7 testes falharam. Isso mostra que cada
  endurecimento tem teste que falha sem ele. A saída do `debug` com o sentinela está na entrega.
- 33 testes novos, sem `.skip`, `.only` nem `.todo`. Nenhum arquivo existente mudou.
- O erro não leva o corpo da resposta, a mensagem do provedor nem a chave, e não guarda `cause`. O teste confere
  `message`, `stack` e o JSON do erro contra o sentinela e a chave. Isso importa porque a T27 pode mandar o erro ao
  Sentry.

### Verificação própria

- `pnpm test`: 117 arquivos, 2295 de 2295. Bate com a entrega (2262 antes, mais 33).
- `pnpm lint` e `pnpm typecheck`: limpos.
- `git status`: limpo.
- O aviso do undici "Using `patch`" segue na saída, como nas revisões anteriores. Não vem desta tarefa.

### Checklist da seção 12

- [x] Faz o que o plano pede. Os acréscimos são endurecimentos com teste e estão nos desvios aceitos. Só os três
      arquivos da tarefa mudaram no código.
- [x] Há teste para cada comportamento novo, e ele falharia sem o código (saídas na entrega do engenheiro).
- [x] Não há segredo, valor de `.env` nem dado pessoal real. A chave é fictícia e só existe no teste. Os sentinelas são
      os de `test/sentinelas.ts`, e o host desviado é `.test`.
- [x] Entrada externa: a tarefa não tem rota, Server Action nem job. A borda é o `maxTokens`, recusado antes da chamada.
      O erro sai com mensagem fixa, sem detalhe do provedor.
- [x] Banco: não se aplica.
- [x] Nada duplica função existente. É o primeiro cliente do provedor no repositório, e a T23 e a T24 não criam outro.
- [x] Textos em pt-BR (mensagens do `ErroProvedor`). A tarefa não tem tela.
- [x] Os Minor estão em Pendências. Não há Critical nem Important.
- [x] PR (`/code-review`, `/security-review`): não se aplica a esta etapa, fica com a `08-revisao`.

### Pareceres

| # | Arquivo:linha | Problema | Razão |
|---|---|---|---|
| 1 (Minor) | `src/modules/agentes/provedor.ts:44` | O abort pelo sinal de quem chama vira `transitorio`, igual ao tempo limite e à falha de rede. O `ErroProvedor` não diz se a chamada parou por decisão do próprio processo, como a trava de 150 s ou o desligamento do worker, ou por falha do provedor | Não bloqueia: com a trava de 150 s acima do tempo limite de 120 s, o tempo limite do SDK chega antes, e o resultado é o mesmo. Mas se a T27 usar o sinal para desligar o worker, esse abort não deveria contar como tentativa nem como falha do provedor. Quem decide é a T27, que conhece o sinal que passou. Não cabe mudar o tipo aqui sem a T27 pedir |
| 2 (Minor) | `src/modules/agentes/provedor.ts:79` | `ErroProvedor.tokens` nunca é preenchido pelo `ProvedorAnthropic`. O erro do SDK não traz `usage`, então a falha registra uso com 0 tokens | Não bloqueia: está declarado na entrega, e a interface do plano deixa `tokens` opcional. Fica registrado para a T27 não contar com o campo vindo do provedor real |

## Decisões tomadas

- **Os quatro desvios foram aceitos.** Razão: cada um fecha um caminho que o plano deixou aberto (host, segunda
  credencial, log do corpo, `maxTokens` inválido, erro fora do conjunto), tem teste que falha sem ele e não muda
  nenhuma interface do plano.
- **Classificar 400 e 404 como `transitorio` não é Important.** Razão: essas respostas não consomem token, e o limite de
  3 tentativas da T27 encerra a execução. Criar um terceiro tipo de erro mudaria a interface do plano sem ganho para a
  0.1.0.
- **O abort de quem chama como `transitorio` fica Minor.** Razão: com a trava de 150 s, quem dispara antes é o tempo
  limite do SDK, e o uso do sinal no desligamento é decisão da T27.
- **`proximo: qa-automacao`.** Razão: a revisão não tem bloqueio, e a próxima etapa da cadeia é a `06-T25-testes`.

## Pendências

- **Para a T27 (`engenheiro-backend`):**
  - Minor 1: decidir se o abort do sinal no desligamento do worker conta como tentativa. Se não contar, a T27 confere
    `sinal.aborted` antes de tratar o `ErroProvedor` como falha do provedor.
  - Minor 2: `ErroProvedor.tokens` vem vazio do provedor real, então a falha registra uso com 0 tokens.
  - O `RangeError` de `maxTokens` não é `ErroProvedor`. É erro de programação, vira falha sem nova tentativa e não
    registra uso pago (como diz a entrega do engenheiro).
  - Valem também as pendências da `06-T24-revisao` para a T27: `nao_encontrado` do montador é falha sem nova tentativa,
    o `conteudo` vai como está e o prompt da T26 vai em `sistema`.
- **Para a `10-documentacao`:** o `deploy.md` deve dizer que `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN` e
  `ANTHROPIC_LOG` não têm efeito no sistema. Só `ANTHROPIC_API_KEY`, no worker, vale.
- **Para a `06-T25-testes` (`qa-automacao`):** o aviso do undici "Using `patch`" segue aberto desde a `06-T23-revisao`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat c5f1b922105b312fc683cd133d396b8fe059414a` — 5 arquivos: provedor.ts, provedor.test.ts, provedor-falso.ts, a entrega do engenheiro e o registro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show c5f1b922105b312fc683cd133d396b8fe059414a -- src test` — três arquivos novos, nenhum existente mudou
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -5` — topo c5f1b92
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 117 arquivos, 2295 de 2295
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat --format=%h%x20%s HEAD~40..HEAD -- test/estatico` — só o 8e92ce8 (T23) mexeu em test/estatico no período
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --format=%h%x20%s --name-only --diff-filter=A -- test/estatico` — o teste de C-27 é test/estatico/variaveis.test.ts, da T13

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
