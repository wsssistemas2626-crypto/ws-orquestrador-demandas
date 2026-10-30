---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T27-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G5, mapa das fases, T27), 05-tech-lead.md (cabeçalho), 06-T27-engenheiro-backend.md, 06-T26-tech-lead.md, git diff 7c59703..034f6d2, src/modules/agentes/executar.ts, src/modules/agentes/execucoes.ts, src/modules/agentes/espera.ts, src/modules/agentes/espera.test.ts, src/modules/agentes/executar.test.ts, src/jobs/agente-executar.ts, src/jobs/agente-executar.test.ts, src/modules/agentes/provedor.ts, src/lib/log.ts, src/lib/fila.ts (diff), src/agents/insumo-tecnico.ts (diff), src/agents/prompts.test.ts (diff)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Primeira revisão da T27, no intervalo `7c59703..034f6d2`. O código e os testes entraram no `640818a`. O `809adc2` só
acrescenta uma linha a `passagens.jsonl`, e o `034f6d2` só regrava a entrega do engenheiro.

**Não há problema Critical nem Important.** A passagem segue para a `06-T27-testes`. Ficam quatro Minor, nos Pareceres
e em Pendências.

### Arquivos do intervalo

| Arquivo | Situação |
|---|---|
| `src/modules/agentes/espera.ts` e `espera.test.ts` | Novos, do plano |
| `src/modules/agentes/execucoes.ts` | Novo, do plano |
| `src/modules/agentes/executar.ts` e `executar.test.ts` | Novos, do plano |
| `src/jobs/agente-executar.ts` | Novo, do plano |
| `src/jobs/agente-executar.test.ts` | Novo, fora da lista (desvio 4) |
| `src/lib/fila.ts` | `PAYLOADS` exportado (desvio 3) |
| `src/agents/insumo-tecnico.ts` e `src/agents/prompts.test.ts` | Minor 1 da `06-T26-revisao` (desvio 5) |
| `06-T27-engenheiro-backend.md` e `passagens.jsonl` | Entrega e registro |

### Conferência contra o plano (T27)

| Ponto do plano | Situação |
|---|---|
| `TENTATIVAS_MAXIMAS = 3`; `esperaAntesDaTentativa`: 2 → 30 s, 3 → 2 min, 4 lança erro (P1-e) | Atendido (`espera.ts:3` a `:11`). Qualquer n fora de 2 a 3 lança `RangeError`, e há teste para 1, 0, −1, 2,5, NaN e infinito |
| `criarExecucao`: `insert … on conflict do nothing`; job `{ execucaoId }` com `singletonKey` `<agente>:<chave>:t1` só se inseriu | Atendido (`execucoes.ts:39` a `:53`). O job sai pelo executor da mesma transação. O teste de rollback prova que a execução e o job somem juntos (ADR-06) |
| `reivindicar`: o `UPDATE` condicional da ADR-07, trava de 150 s, `tentativas + 1`, `RETURNING *` | Atendido (`execucoes.ts:57` a `:74`), com o desvio 2. Id fora do formato UUID dá `null` sem consulta |
| Passo 1: nada voltou → `ja_tratada`, sem provedor (CA-16.4) | Atendido (`executar.ts:162` e `:163`). Dois testes: o mesmo job em sequência e o mesmo job ao mesmo tempo (`Promise.all`) |
| Passo 2: desligado, sem preço vigente ou sem provedor → `ignorada` + `agente_ignorado` (CA-19.4) | Atendido (`executar.ts:184` a `:188`). Há um teste por motivo |
| Passo 3: gasto do mês ≥ teto → `ignorada` + `suspensao_por_teto` (CA-18.1, CA-18.3) | Atendido (`executar.ts:189`). Testes com gasto 10 e teto 10, gasto 9,99 e teto 0 |
| Passo 4: `montarEntrada` (T24) e `PROMPTS[agente]` (T26) | Atendido (`executar.ts:191` a `:199`). Um teste confere a chamada: o prompt em `sistema`, o `maxTokens`, o modelo e a entrada minimizada |
| Passo 5: provedor fora de transação; `registrarUso` em transação própria, haja o que houver (CA-17.2) | Atendido. A chamada (`executar.ts:203`) não está dentro de `comTransacao`. Toda chamada feita deixa uma linha de uso, gravada depois de o resultado ser conhecido (ver Decisões) |
| Passo 6: JSON + `safeParse`; válido grava com o ator agente e marca `concluida` com `artefato_id`; inválido ou transitório reagenda com `startAfter` e `…:t<n+1>`; na 3ª, `falhou` + `falha_agente` sem conteúdo; `autenticacao` falha na hora, com evento e `capturarErro` | Atendido (`executar.ts:230` a `:279` e `execucoes.ts:103` a `:119`). O teste CA-16.3 confere as três chaves de job, as esperas, o evento só com `{ agente, tentativas, motivo }` e a ausência do sentinela |
| Passo 7: C-25, nada da saída define status, autoria ou ator | Atendido. O teste manda `status`, `rascunhoAgente:false`, `autorTipo`, `autorId`, `id` e `versao` na saída, e o RSK fica v1, rascunho de agente, com o status da demanda inalterado |
| `DESTINOS` com insumo técnico, risco e consolidação; orquestrador na T28 | Atendido (`executar.ts:73` a `:89`). O `schema` de cada destino é o mesmo objeto de `SCHEMA_DE_SAIDA` (o teste usa `toBe`). Cada `gravar` passa pelo serviço da API, que chama `autorizar` (C-12 no worker) |
| Handler: lê `{ execucaoId }` com o schema da fila; erro inesperado vai ao log reduzido e ao Sentry | Atendido (`agente-executar.ts:14` a `:31`). O `erro` do log passa por `reduzirErro` em `log.ts:52`, e o teste do handler confere `{ classe: 'Error' }` sem o sentinela |
| Os 11 testes do plano | Estão todos em `executar.test.ts`, com corpo, e o de `espera.test.ts` está igual ao plano |

### Desvios do plano

| # | Desvio | Parecer |
|---|---|---|
| 1 | `DepsAgente = Pick<Deps, 'db' \| 'pool' \| 'relogio' \| 'fila'> & { provedor }` | Aceito. O worker não monta Better Auth para executar agente, e quem tem `Deps` passa sem mudança. É o mesmo desvio já aceito com `DepsDemanda` |
| 2 | `reivindicar` exige `proxima_tentativa_em` nula ou vencida na execução `pendente` | Aceito. Sem isso, o job de uma tentativa anterior entregue de novo faria a próxima tentativa paga antes da espera de P1-e. Há teste (`executar.test.ts:200` e `:295`). Ver o Minor 3 |
| 3 | `PAYLOADS` exportado de `src/lib/fila.ts` | Aceito. O handler lê o payload com o mesmo schema do envio, sem reescrevê-lo, como pede o item de duplicação da seção 12 |
| 4 | Teste do handler em `src/jobs/agente-executar.test.ts` | Aceito. O handler tem comportamento próprio (recusa de payload, erro reduzido, lote que continua). Sem teste, ele entraria sem cobertura |
| 5 | Minor 1 da `06-T26-revisao` resolvido aqui | Aceito. A `06-T26-revisao` o deixou para a T27. É uma frase em `insumo-tecnico.ts:44`, com teste que falharia sem ela |
| 6 | `TRAVA_MS`, `ExecucaoPerdida`, `chaveDoJob`, `confirmarPosse`, `encerrar`, `reagendar` e `ResultadoExecucao` exportados | Aceito. São aditivos, e nenhuma assinatura do plano mudou |

### Testes e TDD

- A entrega mostra a primeira rodada falhando antes do código: três arquivos sem módulo e o teste novo de
  `prompts.test.ts` com `AssertionError`.
- Os testes falham sem o código: cada um confere estado no banco (execução, uso, job, evento, artefato) ou chamada ao
  provedor falso, e não só o valor devolvido.
- O teste da trava vencida no meio da chamada (`executar.test.ts:371`) prova o ponto mais delicado da ADR-07. O segundo
  worker grava, o primeiro recebe `ExecucaoPerdida` e não grava outro RSK, e as duas chamadas pagas ficam no uso.
- Banco real (Testcontainers), provedor falso, relógio fixo e só dados fictícios (`Pessoa Ficticia`, `.test`,
  `SENTINELAS`). Nenhuma chave de provedor definida.
- Sem `.skip`, `.only` nem `.todo`.

### Verificação própria

- `pnpm test`: 122 arquivos, 2491 de 2491. Bate com a entrega (2439 depois da `06-T26-testes`, mais 52). O aviso do
  undici "Using `patch`" segue o mesmo.
- `pnpm lint` e `pnpm typecheck`: limpos.
- `git status`: limpo.

### Checklist da seção 12

- [x] Faz o que o plano pede. Os arquivos fora da lista estão nos desvios 3, 4 e 5, que foram aceitos.
- [x] Há teste para cada comportamento novo, e ele falharia sem o código.
- [x] Não há segredo, valor de `.env` nem dado pessoal real. Os testes usam sentinelas e conferem log e evento sem elas.
- [x] Entrada externa validada com Zod: o payload do job pelo schema da fila, e a saída do provedor pelo schema da rota
      e depois pelo schema de criação do serviço. O erro vai reduzido ao log e ao Sentry.
- [x] Banco: a tarefa não cria migration. Usa `execucao_agente` e `uso_ia` da T06, pelo papel do app.
- [x] Nada duplica função existente. Os schemas, o custo, o teto, a configuração, a entrada e o registro de evento vêm
      dos módulos das tarefas anteriores.
- [x] Textos em pt-BR. A tarefa não tem tela.
- [x] Os Minor estão em Pendências. Não há Critical nem Important.
- [x] PR (`/code-review`, `/security-review`): não se aplica a esta etapa, fica com a `08-revisao`.

### Pareceres

| # | Arquivo:linha | Problema | Razão |
|---|---|---|---|
| 1 (Minor) | `src/modules/agentes/executar.ts:259` a `:276` | A linha de uso `sucesso` é gravada depois do `commit` do artefato, numa transação à parte. Se o processo cair, ou se o `registrarUso` falhar, entre os dois passos, a chamada paga fica sem uso e o teto conta menos | Não bloqueia: o plano manda o uso em transação própria, a janela é de milissegundos e o engenheiro a registrou. Mas, no caminho de sucesso, gravar o uso dentro da mesma transação do artefato fecha a janela sem perder nada: se a transação cair, o `catch` já grava `erro` à parte. Fica para a `08-revisao` decidir |
| 2 (Minor) | `src/modules/agentes/executar.ts:128` e `:180` | No caso `tentativas_esgotadas`, o evento `falha_agente` sai com `tentativas: 4`, porque a reivindicação já somou um. O log mostra o mesmo. Houve no máximo 3 chamadas | Não bloqueia: o motivo deixa claro o que houve, e nada lê esse número para decidir. Mas o histórico da demanda mostra "4 tentativas" quando o limite é 3. Basta gravar `Math.min(exec.tentativas, TENTATIVAS_MAXIMAS)` no `depois` desse caso |
| 3 (Minor) | `src/modules/agentes/execucoes.ts:67` | O desvio 2 compara `proxima_tentativa_em` com o relógio do app. Já o `startAfter` do pg-boss é decidido pelo relógio do banco. Se o job sair um instante antes pela conta do app, a execução devolve `ja_tratada`, o job é concluído e a execução fica `pendente` sem job | Não bloqueia: app e banco rodam no mesmo host, e o job é buscado depois do `startAfter`, então a diferença é desprezível. Mas a única rede de segurança é a varredura da T29, que precisa reenfileirar a `pendente` vencida que ficou sem job |
| 4 (Minor) | `src/jobs/agente-executar.ts:26` a `:29` | O erro inesperado não é relançado. A execução fica `em_andamento` até a trava vencer, e só a varredura da T29 a retoma | Não bloqueia: a escolha está justificada (o pg-boss gravaria a mensagem do erro no job, C-21). Mas a T29 tem de cobrir esse caso com teste: execução `em_andamento` com a trava vencida e sem job ativo volta para a fila |

## Decisões tomadas

- **Os seis desvios foram aceitos.** Razão: o `Pick` evita montar Better Auth no worker, a guarda de
  `proxima_tentativa_em` impede uma tentativa paga antes da espera, `PAYLOADS` exportado evita schema duplicado, o teste
  do handler cobre comportamento que ficaria sem teste, e o Minor da T26 foi deixado para esta tarefa pela própria
  revisão.
- **A linha de uso depois do resultado, e não logo depois da chamada, foi aceita.** Razão: o plano pede o uso "haja o
  que houver", com o resultado `sucesso`, `fora_do_schema` ou `erro`. Só depois da gravação se sabe se a ESP foi
  recusada pela regra do serviço. A janela que sobra está no Minor 1.
- **`ErroDominio('entrada_invalida')` do serviço conta como saída fora do schema, e `limite_excedido` como transitório.**
  Razão: era a pendência da `06-T26-revisao`. A recusa por `validarCamposDeConstrucao` é saída ruim do modelo, não erro
  de programação, e uma nova tentativa pode acertar.
- **`proximo: qa-automacao`.** Razão: a revisão não tem bloqueio, e a próxima etapa da cadeia é a `06-T27-testes`.

## Pendências

- **Para a `06-T27-testes` (`qa-automacao`):** os casos de borda que ainda não têm teste:
  - `ErroDominio` do serviço que não é `entrada_invalida` nem `limite_excedido` → `falhou` com
    `recusada_pelo_servico`, com uso `erro`;
  - `limite_excedido` (C-36) → `reagendada`, com uso `erro`;
  - execução de insumo técnico, risco ou consolidação com `demandaId` nulo → `nao_encontrado` no `gravar`
    (`executar.ts:67` e `:68`), que cai em `recusada_pelo_servico`, sem artefato.
- **Para a T29 (`engenheiro-backend`):** Minor 3 e Minor 4. A varredura reenfileira:
  - a `pendente` com `proxima_tentativa_em` vencida e sem job ativo;
  - a `em_andamento` com a trava vencida;
  - as duas com a `singletonKey` da tentativa corrente.

  Valem também as pendências da entrega do engenheiro: `localConcurrency: 1` e não abortar a chamada em curso no
  `SIGTERM`.
- **Para a T28 (`engenheiro-backend`):** as da entrega do engenheiro. Ao pôr o orquestrador em `DESTINOS`, mudam três
  testes de `executar.test.ts`.
- **Para a `08-revisao`:**
  - Minor 1: o uso `sucesso` dentro da transação do artefato;
  - Minor 2: `tentativas: 4` no evento de `tentativas_esgotadas`;
  - a resposta fora do envelope ainda não é conferida no `ProvedorAnthropic` (Minor da `06-T25-testes`).
- Seguem abertos, sem mudança: os Minor 2 e 3 da `06-T26-revisao`, o Minor de `fabianojp06` da `06-T26-testes` e o aviso
  do undici "Using `patch`".

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — topo 034f6d2, com 640818a, 809adc2 e 034f6d2 depois de 7c59703
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 7c59703 034f6d2` — 12 arquivos: 10 de código e teste, a entrega e o registro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 7c59703 034f6d2 -- src` — o diff de código do intervalo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 7c59703 034f6d2 -- src/lib/fila.ts src/modules/agentes/espera.test.ts src/agents/prompts.test.ts` — `PAYLOADS` exportado, teste de espera e teste do prompt
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/lib` — nenhum utilitário de id ou de UUID que a tarefa devesse reusar
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 809adc2` — só uma linha em `passagens.jsonl`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent=passed-only --reporter=dot` — 122 arquivos, 2491 de 2491
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
