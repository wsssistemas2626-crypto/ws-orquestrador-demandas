---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T29-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, 05-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6, mapa das fases, T01, T26 a T30), 02-arquiteto-solucoes.md (seção 8, linhas 226 a 265), 06-T28-engenheiro-backend.md, 06-T28-tech-lead.md, src/lib/deps.ts, src/lib/fila.ts, src/lib/fila.test.ts, src/lib/env.ts, src/lib/env.test.ts, src/lib/log.ts, src/lib/sentry.ts, src/instrumentation.ts, src/db/index.ts, src/db/transacao.ts, src/db/privilegios.ts, src/db/schema/index.ts, src/db/schema/comum.ts, src/db/schema/agentes.ts, src/db/schema/operacao.ts, src/modules/agentes/execucoes.ts, src/modules/agentes/executar.ts, src/modules/agentes/provedor.ts, src/modules/agentes/gatilhos.test.ts, src/jobs/agente-executar.ts, test/deps.ts, test/banco.ts, test/auth.ts, test/provedor-falso.ts, test/estatico/variaveis.test.ts, vitest.config.ts, package.json, saída do pnpm test gravada pela ferramenta (tool-results/bjn58smtr.txt e byd03o44p.txt, só o fim)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T29: processo worker, agendamentos, batimento e varredura de execuções órfãs. Cobre RF-16 (worker), RNF-05 (uma
réplica, alerta de duas), ADR-04, ADR-06 (varredura), C-27 e C-31 (boot com prazo fora de 1..365 não sobe). Esta é a
primeira tentativa da etapa.

### Arquivos criados (os 8 do plano)

- `src/lib/env-worker.ts`: `ConfigWorker` e `lerConfigWorker(env?)`.
  - É a configuração do app (`lerConfigApp`, com a mesma regra de retenção) mais as chaves do provedor de IA e do e-mail
    e os dois endereços do aviso.
  - Chave vazia ou só com espaço conta como ausente, e o worker sobe sem o provedor correspondente.
  - Os dois endereços passam por `z.email()`.
  - O erro junta os nomes das variáveis do app e do worker, em ordem, sem nenhum valor (`ErroConfiguracao`).
- `src/modules/agentes/situacao-worker.ts`: `SituacaoWorker` e `situacaoDoWorker(db, relogio)`.
  - `atrasado`: nenhum batimento, ou o último tem mais de 5 min;
  - `instanciasRecentes`: instâncias que bateram nos últimos 2 min;
  - `duasInstancias`: duas ou mais nessa janela.
- `src/jobs/batimento.ts`: `batimento(deps, instancia)` e `gravarBatimento(deps, instancia)`.
  - Grava o batimento da instância, uma linha por instância, e apaga o das instâncias que não batem há mais de um dia.
  - Varre e reenfileira, até 100 por batimento:
    - a execução `pendente` com `proxima_tentativa_em` vencida há mais de 1 min;
    - a `em_andamento` com `bloqueada_ate` vencida.
  - O job vai com payload só `{ execucaoId }` (C-22) e a `singletonKey` da próxima tentativa
    (`<agente>:<chave>:t<tentativas+1>`).
  - A varredura não muda a execução. Quem muda é a reivindicação (ADR-07), quando o job roda.
  - Devolve `{ reenfileiradas }`: os jobs que de fato entraram. O envio que a política `stately` descarta não conta.
  - O log leva só `evento`, `instancia` e `quantidade` (C-21).
- `src/worker/iniciar.ts`: `DepsWorker` e `iniciarWorker(deps)`.
  - Grava o batimento da instância ao subir (instância = UUID gerado no boot).
  - Agenda `worker.batimento` (`* * * * *`) e `retencao.expurgo` (`0 3 * * *`, `tz: 'America/Sao_Paulo'`), os dois com
    `data: {}`.
  - Registra `agente.executar` com `localConcurrency: 1` e `batchSize: 1`, sobre `tratarAgenteExecutar` (T27).
  - Registra `worker.batimento`. O handler confere o payload com `PAYLOADS` (Zod); fora dele, `worker_payload_invalido`
    sem o conteúdo. Erro vai ao log reduzido e ao Sentry, sem relançar.
  - Grava o batimento da própria instância a cada minuto, num temporizador fora da fila (ver o desvio 3).
  - `parar()` é idempotente: para o temporizador e tira os dois `work`.
- `src/worker/index.ts`: entrada do `pnpm worker`.
  - Ordem: `lerConfigWorker()`, `iniciarSentry`, pool e Drizzle, `criarFila(url, { agendador: true })`,
    `criarProvedor`, `iniciarWorker`.
  - No `SIGTERM` e no `SIGINT`: `parar()`, fecha a fila e o pool e sai.
  - Configuração inválida: log `worker_configuracao_invalida` só com os nomes das variáveis, e saída com código 1.
  - Outra falha no boot: log reduzido, Sentry e saída com código 1 depois de 2 s.
- `src/lib/env-worker.test.ts`: 8 testes.
- `src/jobs/batimento.test.ts`: 11 testes.
- `src/worker/iniciar.test.ts`: 6 testes.

### Arquivo alterado fora da lista (desvio 1)

- `src/lib/fila.ts`: `criarFila(urlApp, op?: { agendador?: boolean })`. Com `agendador: true`, o pg-boss liga `schedule`
  e `supervise`; sem ele, nada muda para o app (os dois ficam desligados, como antes). O comentário do arquivo já dizia
  "o worker da T29 liga o que precisar".

### Testes criados (25 novos)

| Arquivo | Testes | O que prova |
|---|---|---|
| `env-worker.test.ts` | 8 | **Os 2 do plano** (C-31 com 400; sem chaves sobe com as chaves ausentes). **Mais:** a configuração do app inteira, com os padrões; as quatro variáveis lidas, com a chave sem espaço nas pontas; vazia ou só espaço conta como ausente; e-mail inválido cita só o nome; erro do app e do worker juntos, em ordem, sem valor nem na pilha; obrigatória do app ausente impede o worker |
| `batimento.test.ts` | 11 | **Os 4 do plano**, com corpo: grava o batimento (e atualiza a mesma linha); reenfileira pendente vencida há mais de 1 min e `em_andamento` com trava vencida, e não mexe em pendente recente, futura, trava valendo, `concluida`, `falhou` nem `ignorada`, com a chave `…:t<n+1>` certa; reenfileirar duas vezes é inofensivo (worker caiu no meio, dois batimentos, um job só; o job duas vezes no worker chama o provedor uma vez e grava uma ESP só); `situacaoDoWorker` nas bordas de 5 min e de 2 min. **Mais:** limpeza da instância antiga; C-21 no log; pendente da 1ª tentativa sem `proxima_tentativa_em` (desvio 2); a execução do orquestrador, com `demanda_id` nulo (pendência da `06-T28-revisao`); o job ainda na fila não é duplicado; a varredura não muda a execução; `situacaoDoWorker` sem batimento nenhum |
| `iniciar.test.ts` | 6 | **O do plano**, com corpo: os dois agendamentos em `pgboss.schedule` (cron, fuso e `data`) e a concorrência 1 provada pelo comportamento: duas execuções na fila, um provedor falso que demora 1 s e conta as chamadas abertas, e no máximo uma aberta por vez. **Mais:** o batimento gravado ao subir; duas instâncias no mesmo banco aparecem em `situacaoDoWorker` (RNF-05); o job `worker.batimento` roda a varredura; payload fora do schema é descartado sem o conteúdo no log; `parar()` duas vezes |

Conferi que o teste de concorrência pega o erro: com `localConcurrency: 2`, ele falhou (`expected 2 to be 1`). Depois
voltei para 1.

### TDD: os testes foram escritos antes e vistos falhando

Comando: `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/env-worker.test.ts src/jobs/batimento.test.ts src/worker/iniciar.test.ts`.
Rodou antes de qualquer código da tarefa. Trecho da saída:

```
 FAIL  src/jobs/batimento.test.ts [ src/jobs/batimento.test.ts ]
Error: Cannot find module '../modules/agentes/situacao-worker' imported from .../src/jobs/batimento.test.ts
 FAIL  src/lib/env-worker.test.ts [ src/lib/env-worker.test.ts ]
Error: Cannot find module './env-worker' imported from .../src/lib/env-worker.test.ts
 FAIL  src/worker/iniciar.test.ts [ src/worker/iniciar.test.ts ]
Error: Cannot find module '../modules/agentes/situacao-worker' imported from .../src/worker/iniciar.test.ts
 Test Files  3 failed (3)
      Tests  no tests
```

### Resultado

- Os três arquivos novos: 25 de 25.
- `pnpm test`: 129 arquivos e **2585 de 2585**, nenhum falhou. Eram 2560 antes da tarefa, e ela somou 25. O aviso do
  undici "Using `patch`" continua igual.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo. O typecheck também confirmou contra o pg-boss 12.34.0 instalado as opções `localConcurrency`,
  `tz` do `schedule` e `offWork(nome)`.
- `git status`: os 8 arquivos novos e `src/lib/fila.ts` alterado. Nenhum outro arquivo mudou.

### Desvios do plano

1. **`src/lib/fila.ts` mudou** (opção `agendador`), fora da lista de arquivos.
   - O worker precisa de um pg-boss com `schedule` (para o cron disparar) e `supervise` (para vencer job ativo e limpar
     a fila).
   - O `criarFila` da T07 sobe os dois desligados, e o esquema `pgboss` é uma constante privada dele.
   - Criar outro `PgBoss` em `iniciar.ts` repetiria o esquema e o ouvinte de erro.
   - O padrão continua desligado, e o app não muda.
2. **A varredura também pega a `pendente` sem `proxima_tentativa_em`**, parada há mais de 1 min (conta
   `atualizada_em`).
   - O plano só cita a `proxima_tentativa_em` vencida. Mas a 1ª tentativa nasce sem ela. Se o worker cai depois de
     pegar o job e antes de reivindicar, o job vence e falha (`retryLimit: 0`), e a execução ficaria `pendente` para
     sempre.
   - Não duplica o job que só espera a vez: a chave é a mesma (`…:t1`), e a `stately` descarta. Há teste.
3. **Cada instância grava o próprio batimento ao subir e a cada minuto, num temporizador fora da fila.** O
   `worker.batimento` agendado continua gravando e varrendo.
   - O job agendado roda numa instância só por minuto. Com duas réplicas, só a que pegou o job bateria.
   - Assim, o alerta de duas instâncias (RNF-05; 02, seção 8: "cada worker grava a sua `instancia`") não seria
     confiável.
   - O temporizador tem `unref()` e para no `parar()`.
4. **O batimento apaga a linha da instância que não bate há mais de um dia.** Cada subida do worker gera uma instância
   nova. O comentário de `privilegios.ts` (T06) já prevê essa limpeza.
5. **Onde ficam os tipos.**
   - O plano usa `DepsWorker` sem defini-lo. Ele ficou em `src/worker/iniciar.ts`:
     `DepsAgente & { fila: Fila & { boss: PgBoss }; config: ConfigWorker }`.
   - `batimento` recebe `DepsBatimento = Pick<Deps, 'db' | 'pool' | 'relogio' | 'fila'>`, que é mais estreito.
     `DepsWorker` passa sem mudança, e `src/jobs` não depende de `src/worker`. É o mesmo tipo de desvio aceito na T27 e
     na T28.
6. **A varredura tem teto de 100 execuções por batimento.** O que sobrar fica para o minuto seguinte. Com o volume da
   RNF-05, o teto não é atingido.
7. **Acréscimos exportados.** `gravarBatimento`, `DepsBatimento`, `FOLGA_PENDENTE_MS`, `GUARDA_BATIMENTO_MS`,
   `LIMITE_VARREDURA`, `ATRASO_MAXIMO_MS`, `JANELA_INSTANCIAS_MS`, `FUSO_AGENDAMENTOS`, `CRON_BATIMENTO`, `CRON_EXPURGO`
   e `INTERVALO_BATIMENTO_MS`. Todos são aditivos, e nenhuma assinatura do plano mudou.

## Decisões tomadas

- **O reenfileiramento usa a `singletonKey` da próxima tentativa (`t<tentativas+1>`).** Razão: é a mesma chave que o
  `reagendar` da T27 usaria. Se o job dessa tentativa ainda está na fila, a `stately` (T07) descarta o repetido. Se dois
  chegarem ao worker, a reivindicação deixa um só rodar. Há teste das duas coisas.
- **Cada job reenfileirado vai na sua própria transação curta.** Razão: `fila.enviar` exige um executor, e um envio
  que falha não desfaz os outros.
- **A concorrência 1 é provada pelo comportamento, não pela opção.** Razão: um teste que só lesse a opção passaria com
  a opção errada. Com o valor trocado para 2, o teste falhou.
- **O handler de `worker.batimento` não relança erro.** Razão: é o mesmo padrão do `agente-executar` da T27. O pg-boss
  guardaria a mensagem do erro no job, e o minuto seguinte tenta de novo.
- **O `index.ts` sai com `process.exit`.** Razão: depois de `criarFila`, os temporizadores do pg-boss seguram o
  processo, e só `exitCode` não encerraria. Na falha de boot, a saída espera 2 s para o Sentry enviar.
- **O `SENTRY_DSN` é lido em `src/worker/index.ts`, como em `src/instrumentation.ts`.** Razão: ele não faz parte do
  `ConfigWorker` do plano.
- **O `index.ts` não tem teste automatizado.** Razão: ele roda `principal()` ao ser importado. Toda a lógica dele está
  em `lerConfigWorker` e `iniciarWorker`, que têm teste. O teste estático de C-27 passa sobre ele.

## Pendências

- **Para a T30 e a T31 (`engenheiro-backend`):**
  - registrar em `iniciarWorker` os handlers de `aviso.dec-pronto` e de `retencao.expurgo`, e acrescentar a fila à lista
    que o `parar()` percorre;
  - o agendamento do expurgo já existe desde esta tarefa. Até a T31, o job diário entra na fila sem handler;
  - o enviador entra em `src/worker/index.ts`. `ConfigWorker` já traz `chaveResend`, `emailRemetente` e
    `emailAvisoDecisao`.
- **Para a T45 (`engenheiro-frontend`):** `situacaoDoWorker(db, relogio)` está pronta para os alertas "worker sem sinal"
  e "duas instâncias". Ainda não existe rota nem Server Action para ela.
- **Para a `09-entrega` e a `10-documentacao`:**
  - nos testes, o pg-boss com `supervise` e o papel do app não emitiu `fila_erro`. Mas a manutenção completa do pg-boss
    roda em intervalos maiores que um teste. Convém olhar o log do worker na homologação;
  - no `SIGTERM`, o `parar()` tira os `work` e a fila fecha sem esperar a chamada em curso (`graceful: false`, da T07).
    Uma chamada cortada fica `em_andamento` e volta pela varredura quando a trava vence (150 s). O `deploy.md` deve
    dizer isso, junto com a regra de uma réplica de worker.
- **Para a `08-revisao`, só registro:** o `RE_UUID` repetido (Minor 3 da `06-T28-revisao`) segue como estava; esta
  tarefa não o tocou.
- Seguem abertos, sem mudança: os Minor da `06-T28-revisao` e das anteriores, e o aviso do undici "Using `patch`".

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -15` — topo a710740 (06-T28-testes)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/env-worker.test.ts src/jobs/batimento.test.ts src/worker/iniciar.test.ts` — antes do código: 3 arquivos sem módulo, nenhum teste rodou
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo (com o código novo)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/env-worker.test.ts src/jobs/batimento.test.ts src/worker/iniciar.test.ts` — depois do código: 24 de 24
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent src/worker/iniciar.test.ts` — não rodou: o vitest 5 recusou o `--silent` sem valor
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent=true src/worker/iniciar.test.ts` — com `localConcurrency: 2` de propósito: 1 falhou (`expected 2 to be 1`) e 5 passaram; valor voltou para 1
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent=true --reporter=dot` — 129 arquivos, 2584 de 2584
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 8 arquivos novos e `src/lib/fila.ts` alterado
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo (depois da saída explícita no `index.ts`)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent=true --reporter=dot` — 129 arquivos, 2584 de 2584
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/jobs/batimento.test.ts` — 11 de 11 (com o teste da execução do orquestrador)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent=true --reporter=dot` — 129 arquivos, **2585 de 2585**

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real (chaves e endereços fictícios, domínio `.test`, sentinelas; teste de log do batimento só com instância e quantidade, e do payload inválido sem a sentinela)
- [x] só mudaram os arquivos da tarefa (mais `src/lib/fila.ts`, desvio 1, com uma opção que o app não usa)
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (o job `worker.batimento` confere o payload com `PAYLOADS`; o `agente.executar` segue no handler da T27; a configuração do worker passa por Zod e o erro cita só o nome da variável)
