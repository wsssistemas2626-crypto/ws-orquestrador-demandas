---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T29-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md (cabeçalho), 2026-10-25-ws-orquestrador-demandas-plano.md (T29), 01-analista-requisitos.md (RF-01 a RF-07, RF-14 a RF-26, RNF, matriz), 02-arquiteto-solucoes.md (seções 7 e 8), 04-seguranca-aplicacao.md (cabeçalho, 2.14 a 2.17, controles C-01 a C-40), 06-T29-engenheiro-backend.md (e a versão do 465cdb4), 06-T29-tech-lead.md, git diff a710740..d7a2015, src/jobs/batimento.ts, src/worker/iniciar.ts, src/worker/index.ts, src/modules/agentes/situacao-worker.ts, src/modules/agentes/executar.ts (linhas 150 a 230), src/modules/agentes/execucoes.ts, src/lib/env-worker.ts, src/lib/fila.ts, src/lib/sentry.ts, src/lib/relogio.ts, src/jobs/batimento.test.ts, src/worker/iniciar.test.ts, src/lib/env-worker.test.ts, test/deps.ts, test/estatico/variaveis.test.ts, saída do pnpm test gravada pela ferramenta (tool-results/byhucttvg.txt, bn870ptqx.txt e bevaxkzs2.txt, só o fim)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T29 (processo worker, agendamentos, batimento e varredura de execuções órfãs), sobre o intervalo
`a710740..d7a2015`. O código e os testes do engenheiro entraram no `465cdb4`. **Nenhum defeito impede a passagem.**
Os 25 testes do engenheiro cobrem todos os critérios do plano, com asserção forte: estado no banco, `pgboss.job`,
`pgboss.schedule` e chamadas ao provedor falso. Acrescentei **17 testes** para as três pendências da `06-T29-revisao`,
para as bordas que faltavam e para dois caminhos sem teste: o erro no job agendado e o temporizador fora da fila.

### Critérios da tarefa e o teste que cobre cada um

| # | Critério (origem) | Arquivo e teste |
|---|---|---|
| 1 | Boot com `RETENCAO_TEXTO_BRUTO_DIAS` fora de 1..365 não sobe (C-31; plano) | `src/lib/env-worker.test.ts`: `C-31: RETENCAO_TEXTO_BRUTO_DIAS=400 não sobe`. **Novos:** `C-31: RETENCAO_TEXTO_BRUTO_DIAS=%s não sobe, e o erro cita só o nome` (0, 366, -1, 90.5, noventa) e `C-31: RETENCAO_TEXTO_BRUTO_DIAS=%s sobe com o prazo lido` (1, 365) |
| 2 | Sem chaves o worker sobe, com as chaves ausentes (plano; CA-16.5) | `env-worker.test.ts`: `sem chaves sobe, com as chaves ausentes`, `variável vazia ou só com espaço conta como ausente` |
| 3 | Erro de configuração só com o nome da variável (C-21, C-31) | `env-worker.test.ts`: `e-mail fora do formato não sobe, e o erro cita só o nome`, `erro do app e do worker juntos: …`, e os novos do item 1 |
| 4 | Chaves de IA e de e-mail só no worker e nas fábricas (C-27) | `test/estatico/variaveis.test.ts`: `variáveis de segredo só nos arquivos permitidos` (da T13; cobre `src/worker/` e `src/lib/env-worker.ts`) |
| 5 | Grava o batimento da instância (plano; 02, seção 8) | `src/jobs/batimento.test.ts`: `grava o batimento da instância`; `src/worker/iniciar.test.ts`: `grava o batimento da instância ao subir, …`. **Novo:** `o temporizador regrava o batimento da instância a cada minuto, fora da fila, e parar() o desliga` |
| 6 | Reenfileira a `pendente` vencida há mais de 1 min e a `em_andamento` com trava vencida, e não mexe na que ainda vale (plano; ADR-06) | `batimento.test.ts`: `reenfileira pendente vencida há mais de 1 min e em_andamento com trava vencida; …`, `pendente da 1ª tentativa (sem proxima_tentativa_em) …`, `cobre a execução do orquestrador, …`. **Novos:** `borda de 1 min da pendente: …`, `borda da trava: …`, `teto de 100 por batimento: …` |
| 7 | Reenfileirar duas vezes é inofensivo: uma execução só roda (plano; ADR-07; CA-16.4) | `batimento.test.ts`: `reenfileirar duas vezes é inofensivo: …`, `o job da tentativa ainda na fila não é duplicado: …`. **Novos:** `corrida com a reivindicação: job t1 ativo e execução ainda pendente; …`, `trava vencida na 3ª tentativa: a varredura manda o job t4, e ele falha sem chamar o provedor (P1-e)` |
| 8 | Payload do job só com o id (C-22) | `batimento.test.ts`: `reenfileira pendente vencida …` (`data` igual a `{ execucaoId }`); `iniciar.test.ts`: `job de batimento com payload fora do formato é descartado pelo schema, …` |
| 9 | `situacaoDoWorker`: atrasado com mais de 5 min; duas instâncias em 2 min (plano; RNF-05) | `batimento.test.ts`: `sem batimento nenhum: …`, `atrasado depois de 5 min sem batimento; duasInstancias com duas em 2 min` (bordas exatas e +1 ms); `iniciar.test.ts`: `RNF-05: duas instâncias no mesmo banco aparecem como duas em situacaoDoWorker` |
| 10 | `agente.executar` com concorrência 1 e os dois agendamentos, expurgo no fuso de São Paulo (plano; ADR-04; RNF-07) | `iniciar.test.ts`: `registra a fila de agentes com concorrência 1 e os dois agendamentos` (comportamento: provedor lento, no máximo uma chamada aberta) |
| 11 | O job `worker.batimento` roda a varredura e confere o payload com Zod (02, seção 8; C-22) | `iniciar.test.ts`: `o job worker.batimento roda a varredura: …`, `job de batimento com payload fora do formato …`. **Novo:** `erro na varredura do job worker.batimento vai ao log sem a mensagem, o job termina sem relançar e o worker segue` |
| 12 | O worker sobe o pg-boss com o agendador ligado, senão o cron não dispara (Minor 1 da `06-T29-revisao`) | **Novo arquivo** `test/estatico/worker-agendador.test.ts`: `src/worker/index.ts sobe a fila com o agendador ligado`, `criarFila liga schedule e supervise do pg-boss pela opção agendador, …`, `as regras recusam a ligação errada …` |
| 13 | Log por lista de permissão (C-21) | `batimento.test.ts`: `C-21: o log do batimento leva só o evento, a instância e a quantidade`; `iniciar.test.ts`: o teste do payload e o novo teste do erro (sentinela ausente, erro reduzido a `classe`) |
| 14 | `parar()` idempotente e o temporizador parado | `iniciar.test.ts`: `parar() encerra o worker e pode ser chamado de novo sem erro` e o novo teste do temporizador |

### Testes acrescentados (17)

| Arquivo | Novos | O que prova |
|---|---|---|
| `src/lib/env-worker.test.ts` | 7 | Bordas de C-31 no worker: 0, 366, -1, 90.5 e `noventa` não sobem, e o erro traz só `RETENCAO_TEXTO_BRUTO_DIAS`; 1 e 365 sobem, com o prazo lido |
| `src/jobs/batimento.test.ts` | 5 | **Borda de 1 min da pendente**, com e sem `proxima_tentativa_em`: exatamente 1 min não volta, e 1 min e 1 ms volta. A `proxima_tentativa_em` recente vale mais que a `atualizada_em` velha (o `coalesce`). **Borda da trava**: igual a agora não volta, vencida há 1 ms volta com `…:t2`. **Corrida com a reivindicação** (pendência da revisão): job `t1` ativo, execução ainda `pendente` e parada há 10 min. Dois batimentos dão no máximo um job novo, da mesma tentativa. Os jobs no worker: um `concluida`, o resto `ja_tratada`, uma chamada ao provedor, uma ESP. **Teto de 100** (pendência da revisão): 101 órfãs dão 100 jobs, sem a mais nova. O batimento seguinte não duplica nenhum. A 101ª entra quando as outras saem da varredura. **Trava vencida na 3ª tentativa**: a varredura manda `…:t4`, a execução termina `falhou` sem chamar o provedor e sem linha em `uso_ia` |
| `src/worker/iniciar.test.ts` | 2 | **Erro no job agendado**: o relógio lança erro com sentinela. O log sai com nível de erro e `erro: { classe: 'Error' }`, sem a sentinela. O job termina `completed`, sem relançar, e o envio seguinte varre normalmente. **Temporizador** (só `setInterval` falso; banco e pg-boss reais): regrava o batimento da instância depois de 1 min. Depois de `parar()`, mais 2 min de temporizador não gravam nada |
| `test/estatico/worker-agendador.test.ts` | 3 | Confere no código que `src/worker/index.ts` chama `criarFila` uma vez, com `{ agendador: true }`, e que `criarFila` liga `schedule` e `supervise` por essa opção, com padrão `false`. Tem também a autoverificação das regras com as formas erradas |

### Resultado

- `pnpm test`: **130 arquivos, 2602 de 2602**. Eram 129 e 2585 antes desta etapa (conferido no início), e a etapa
  somou 17. O aviso do undici "Using `patch`" segue o mesmo.
- `pnpm lint`: limpo (a primeira rodada deu 1 aviso `no-unused-vars` num teste novo, já corrigido).
- `pnpm typecheck`: limpo.
- Os quatro arquivos da T29 em ordem aleatória (`--sequence.shuffle`): 42 de 42. O `iniciar.test.ts` sozinho, em ordem
  aleatória, depois do último ajuste: 8 de 8.
- `git diff`: só `src/jobs/batimento.test.ts`, `src/lib/env-worker.test.ts` e `src/worker/iniciar.test.ts` mudaram, e
  `test/estatico/worker-agendador.test.ts` é novo. A única linha removida é o import do vitest, que ganhou `vi`. Nenhum
  teste foi apagado, nenhum ganhou `.skip`, `.only` ou `.todo`, e nenhuma asserção ficou mais fraca. Nenhum arquivo de
  `src/` fora de `*.test.ts` foi tocado.

### Achados

| # | Criticidade | Achado | Encaminhamento |
|---|---|---|---|
| 1 | baixa | **Teto de 100 (desvio 6):** "o que sobrar fica para o minuto seguinte" só vale depois que as 100 primeiras saem da varredura. Enquanto os jobs delas esperam na fila, o batimento seguinte escolhe as mesmas 100 (`atualizada_em` mais antiga). A `stately` descarta os envios, e a 101ª espera. Não se perde execução, ela só atrasa, porque cada job tratado tira a execução da varredura. Com o volume da RNF-05 o teto não é atingido | Não bloqueia. O teste `teto de 100 por batimento: …` fixa o comportamento real. Fica para a `08-revisao` decidir se a varredura deve pular quem já tem job na fila |
| 2 | — (sem defeito) | **Corrida varredura x reivindicação:** com o `t1` ativo, a `stately` aceita um segundo `t1` na fila, e o job duplicado existe. Ele é inofensivo: no sucesso, a reivindicação devolve `ja_tratada`. Na falha da 1ª tentativa, a reivindicação confere `proxima_tentativa_em <= agora` (`execucoes.ts`), então o `t1` duplicado também não pula a espera de 30 s da RNF-06 | Coberto pelo teste novo da corrida |

## Decisões tomadas

- **Não entrou teste que espera o cron de verdade (Minor 1).** Razão: uma sonda nesta etapa mostrou o primeiro disparo
  do `worker.batimento` 36 s depois de o worker subir, e esse tempo varia de 0 a cerca de 60 s com o relógio real. Um
  teste assim depende do relógio real (padrão técnico, seção 7) e custaria até um minuto em cada execução. A sonda
  foi removida. No lugar entrou o teste estático da ligação do agendador. O disparo real fica para a homologação da
  `09-entrega`, como a revisão já previa.
- **O teste do temporizador falsifica só `setInterval` e `clearInterval`.** Razão: o temporizador é a única coisa
  ligada a um minuto real. O banco, o pg-boss e o `expect.poll` continuam com os temporizadores reais.
- **O teste do temporizador tira o agendamento de `worker.batimento` antes de medir.** Razão: no `iniciar.test.ts`, o
  cron do pg-boss dispara em segundo plano a cada minuto real. Um batimento agendado em voo poderia gravar a hora
  antiga depois do temporizador e fazer o teste falhar às vezes. Os outros testes do arquivo voltam a agendar no
  `iniciarWorker`, e por isso a ordem não importa: rodou em ordem aleatória.
- **A corrida aceita "no máximo um" job novo, não "exatamente um".** Razão: é o requisito da revisão. Uma varredura que
  passe a pular a execução com job ativo também é correta, e o teste não deve quebrar por isso.
- **O teto de 100 é testado com o comportamento real, e o achado vai para Pendências.** Razão: não há perda de
  execução, o volume previsto não chega perto do teto, e mudar a consulta é decisão do tech-lead, não da etapa de
  testes.
- **O caminho do Sentry no erro do job agendado não tem asserção.** Razão: o teste confere o log reduzido e o job sem
  relançar. O `capturarErro` só envia classe e pilha, e o transporte falso do Sentry é do teste transversal da T34.
- **Nenhuma devolução.** Razão: nenhum teste do engenheiro é instável ou errado, todo critério tem teste, e a suíte
  passa.

## Pendências

- **Para a `08-revisao`:** o achado 1 (teto de 100). Opções: deixar como está e registrar o atraso no `deploy.md`, ou
  fazer a varredura pular a execução que já tem job `created` ou `retry` com a mesma `singletonKey`.
- **Para a `09-entrega` (`devops-sre`):** na homologação, conferir no log do worker um `worker_batimento` por minuto
  (Minor 1; o teste estático só prova a ligação no código). Conferir também a saída com código 1 com
  `RETENCAO_TEXTO_BRUTO_DIAS` fora da faixa e a parada limpa no `SIGTERM` (Minor 3; `src/worker/index.ts` segue sem
  teste automatizado).
- **Para a T30 e a T31:** quem registrar handler novo em `iniciarWorker` acrescenta o teste equivalente ao do erro no
  job agendado (log reduzido, sem relançar). Também confere que o teste do temporizador continua tirando o agendamento
  de `worker.batimento` antes de medir.
- Seguem abertos, sem mudança: os Minor 2 e 4 da `06-T29-revisao` e o aviso do undici "Using `patch`".

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — topo 8dfca38 (06-T29-revisao)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat a710740 d7a2015` — 11 arquivos, 949 inserções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent=true --reporter=dot` — antes: 129 arquivos, 2585 de 2585
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/worker/iniciar.test.ts -t "dispara sozinho"` — sonda do cron: 1 passou e 6 pulados, primeiro disparo 36 s depois de subir; o teste foi removido
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/jobs/batimento.test.ts` — 16 de 16
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/worker/iniciar.test.ts` — 8 de 8
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/env-worker.test.ts` — 15 de 15
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/worker-agendador.test.ts` — 3 de 3
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — 1 aviso (`no-unused-vars` em `batimento.test.ts`), corrigido
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --sequence.shuffle src/jobs/batimento.test.ts src/worker/iniciar.test.ts src/lib/env-worker.test.ts test/estatico/worker-agendador.test.ts` — 42 de 42, em ordem aleatória
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent=true --reporter=dot` — 130 arquivos, 2602 de 2602
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 3 arquivos de teste, 198 inserções e 1 remoção
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 3 testes alterados e `test/estatico/worker-agendador.test.ts` novo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --unified=0 src/worker/iniciar.test.ts` — a remoção é o import do vitest, que ganhou `vi`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --sequence.shuffle src/worker/iniciar.test.ts` — 8 de 8, em ordem aleatória (depois de isolar o temporizador do cron)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent=true --reporter=dot` — 130 arquivos, **2602 de 2602**
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 465cdb4:docs/construcao/DEC-DEM-20261022-0001-v1/06-T29-engenheiro-backend.md --format=` — a versão da entrega do engenheiro antes do bloqueio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/agentes/execucoes.ts` — a reivindicação confere `proxima_tentativa_em` (achado 2)

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste (tabela da Entrega, itens 1 a 14)
- [x] a suíte inteira passa (130 arquivos, 2602 de 2602)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real (relógio fixo; só o `setInterval` falso no teste do temporizador; cron isolado; rodaram em ordem aleatória; a sonda do cron real foi removida)
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`: só inserções, mais o import do vitest)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real (nomes "Pessoa Ficticia", domínio `.test`, chaves `DEM-…` fictícias, sentinelas `SENTINELA-…`)
