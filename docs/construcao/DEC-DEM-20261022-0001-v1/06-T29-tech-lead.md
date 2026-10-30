---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T29-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6, mapa das fases, T27 a T30), 06-T29-engenheiro-backend.md, 06-T28-tech-lead.md, git show 465cdb4 (src), src/lib/fila.ts, src/lib/env.ts, src/modules/agentes/execucoes.ts, src/modules/agentes/executar.ts, src/jobs/agente-executar.ts, src/db/privilegios.ts, src/db/schema/operacao.ts, test/estatico/variaveis.test.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Primeira revisão da T29, no intervalo `a710740..d7a2015`. O código e os testes entraram no `465cdb4`. O `1ad7607` só
acrescenta uma linha a `passagens.jsonl` (a liberação do bloqueio só de leitura). O `d7a2015` só regrava a entrega do
engenheiro (5 linhas a menos) e acrescenta uma linha ao registro.

**Não há problema Critical nem Important.** A passagem segue para a `06-T29-testes`. Ficam quatro Minor, nos
Pareceres e em Pendências.

### Arquivos do intervalo

| Arquivo | Situação |
|---|---|
| `src/lib/env-worker.ts` e `env-worker.test.ts` | Novos, do plano |
| `src/worker/index.ts`, `src/worker/iniciar.ts` e `iniciar.test.ts` | Novos, do plano |
| `src/jobs/batimento.ts` e `batimento.test.ts` | Novos, do plano |
| `src/modules/agentes/situacao-worker.ts` | Novo, do plano |
| `src/lib/fila.ts` | Alterado, fora da lista (desvio 1) |
| `06-T29-engenheiro-backend.md` e `passagens.jsonl` | Entrega e registro |

### Conferência contra o plano (T29)

| Ponto do plano | Situação |
|---|---|
| `ConfigWorker` e `lerConfigWorker`: configuração do app mais as chaves e os dois endereços, com C-31 | Atendido (`env-worker.ts:8` a `:43`). Reaproveita `lerConfigApp`, então a regra de 1 a 365 é a mesma. O erro junta os nomes do app e do worker, sem valor: o teste confere a mensagem, as propriedades e a pilha com sentinelas |
| As chaves só no worker e nas fábricas (C-27) | Atendido. O teste estático de `variaveis.test.ts` aceita `src/worker/` e `src/lib/env-worker.ts` e passa |
| `iniciarWorker`: `migrate: false`, `agente.executar` com concorrência 1, os dois `schedule` | Atendido (`iniciar.ts:43` a `:72`). O cron e o fuso de cada agendamento são lidos de `pgboss.schedule`. A concorrência 1 é provada pelo comportamento: duas execuções e um provedor lento que conta as chamadas abertas. O engenheiro conferiu que o teste falha com `localConcurrency: 2` |
| A T30 e a T31 registram os handlers delas | Respeitado. O agendamento do expurgo existe, sem handler até a T31 (está em Pendências da entrega) |
| `batimento`: grava `worker_batimento`; reenfileira a `pendente` vencida há mais de 1 min e a `em_andamento` com trava vencida | Atendido (`batimento.ts:33` a `:62`). O payload leva só `{ execucaoId }` (C-22), e a chave da próxima tentativa sai de `chaveDoJob` da T27, sem formato novo. A varredura não muda a execução: o teste compara a linha inteira antes e depois |
| Reenfileirar duas vezes é inofensivo | Atendido. Dois batimentos geram um job só (a `stately` descarta o repetido), e o mesmo job duas vezes no worker chama o provedor uma vez e grava uma ESP só |
| `situacaoDoWorker`: atrasado com mais de 5 min; duas instâncias em 2 min | Atendido (`situacao-worker.ts:14` a `:29`), com teste nas bordas de 5 min e de 2 min (o valor exato e mais 1 ms) |
| `index.ts`: `lerConfigWorker`, Sentry, dependências, `criarProvedor`, `iniciarWorker` e parada no `SIGTERM` | Atendido (`index.ts:15` a `:41`). Também para no `SIGINT` |
| Os 7 testes do plano (2 em `env-worker`, 4 em `batimento`, 1 em `iniciar`) | Estão todos, com corpo, e mais 18 |
| Pendência da `06-T28-revisao`: a varredura cobre a execução do orquestrador, com `demanda_id` nulo | Atendida, com teste próprio (`batimento.test.ts:148`) |

### Desvios do plano

| # | Desvio | Parecer |
|---|---|---|
| 1 | `criarFila(urlApp, { agendador?: boolean })` em `src/lib/fila.ts` | Aceito. Sem `schedule` o cron não dispara, e sem `supervise` o job vencido não falha. Um segundo `PgBoss` em `iniciar.ts` repetiria o esquema privado e o ouvinte de erro. O padrão continua desligado, e o app não muda (`fila.ts:89` e `:90`). O comentário da T07 já previa isso. Ver o Minor 1 |
| 2 | A varredura também pega a `pendente` sem `proxima_tentativa_em`, contando `atualizada_em` | Aceito. A 1ª tentativa nasce sem `proxima_tentativa_em`. Se o worker cai entre pegar o job e reivindicar, o job vence e falha (`retryLimit: 0`), e sem esse ramo a execução ficaria `pendente` para sempre. Há teste do caso e de que a pendente nova (30 s) e a que só espera a vez na fila não ganham job novo |
| 3 | Cada instância grava o próprio batimento num temporizador fora da fila | Aceito. O cron entrega o job a uma instância só por minuto, e a 02, seção 8, pede que cada worker grave a sua instância. Sem isso o alerta de duas instâncias (RNF-05) não seria confiável. O temporizador tem `unref()` e para no `parar()` |
| 4 | O batimento apaga a linha de instância sem sinal há mais de um dia | Aceito. Cada subida gera um UUID novo, e o `privilegios.ts` da T06 já dá `DELETE` ao app nessa tabela com essa razão. O teste prova que a recente fica |
| 5 | `DepsWorker` definido em `iniciar.ts`; `batimento` recebe `DepsBatimento`, mais estreito que `DepsWorker` | Aceito. O plano usa o tipo sem defini-lo. Estreitar só tira dependência (`src/jobs` não importa `src/worker`), e quem tem `DepsWorker` passa sem mudança. É o mesmo tipo de desvio aceito na T27 e na T28 |
| 6 | Teto de 100 execuções por batimento | Aceito. Uma consulta sem limite seria o único ponto sem teto do worker. O que sobra fica para o minuto seguinte, em ordem de `atualizada_em` |
| 7 | Constantes exportadas a mais | Aceito. São aditivas, e nenhuma assinatura do plano mudou |

Conferi também a borda que a varredura cria na 3ª tentativa. A `em_andamento` com `tentativas = 3` e trava vencida
ganha o job `…:t4`, e a reivindicação sobe para 4. O `executarReivindicada` da T27 (`executar.ts:195`) para nesse ponto
com `tentativas_esgotadas`, sem chamar o provedor. Então a varredura não cria uma 4ª chamada paga (P1-e).

### Testes e TDD

- A entrega mostra a primeira rodada falhando antes do código: os três arquivos sem módulo.
- Os testes falham sem o código, porque conferem estado no banco: `worker_batimento`, `pgboss.job` (dados, chave e
  estado), `pgboss.schedule`, a linha da execução e a ESP. Também conferem as chamadas ao provedor falso, não só o
  valor devolvido.
- O teste da execução do orquestrador entrou depois do código e passou de primeira. É cobertura de comportamento que já
  existia, não código novo sem teste.
- Banco real, provedor falso, relógio fixo, só dados fictícios e sentinelas. Os testes de log (C-21) conferem a lista
  exata de campos do `worker_batimento` e a ausência da sentinela no payload inválido. Sem `.skip`, `.only` nem `.todo`.

### Verificação própria

- `pnpm test`: 129 arquivos, 2585 de 2585. Bate com a entrega (2560 antes da tarefa, mais 25). O aviso do undici
  "Using `patch`" segue o mesmo.
- `pnpm lint` e `pnpm typecheck`: limpos.
- `git status`: limpo antes desta entrega.

### Checklist da seção 12

- [x] Faz o que o plano pede. O único arquivo fora da lista é `src/lib/fila.ts` (desvio 1), com uma opção que o app
      não usa e que o worker precisa para o cron disparar.
- [x] Há teste para cada comportamento novo, e ele falharia sem o código. A exceção é o disparo real do cron (Minor 1),
      que depende de um minuto de relógio real e fica com a `06-T29-testes` e a homologação.
- [x] Não há segredo, valor de `.env` nem dado pessoal real. Chaves e endereços fictícios, domínio `.test`, sentinelas.
      O erro de configuração e o log de boot levam só nomes de variáveis.
- [x] Entrada externa validada com Zod. O job `worker.batimento` passa por `PAYLOADS`, o `agente.executar` segue pelo
      handler da T27, e a configuração passa por `lerConfigApp` mais o esquema do worker. Nenhum erro leva valor.
- [x] Banco: a tarefa não cria migration. Usa `worker_batimento` e `execucao_agente` da Fundação pelo papel do app, com
      os privilégios que `privilegios.ts` já dá.
- [x] Nada duplica função existente. A chave do job vem de `chaveDoJob`, a configuração de `lerConfigApp`, a transação
      de `comTransacao` e o handler de agente de `tratarAgenteExecutar`.
- [x] A tarefa não tem tela nem texto de interface.
- [x] Os Minor estão em Pendências. Não há Critical nem Important.
- [x] PR (`/code-review`, `/security-review`): não se aplica a esta etapa, fica com a `08-revisao`.

### Pareceres

| # | Arquivo:linha | Problema | Razão |
|---|---|---|---|
| 1 (Minor) | `src/lib/fila.ts:89` e `:90`; `src/worker/iniciar.test.ts:124` | Nenhum teste prova que o cron dispara no worker. O teste do `worker.batimento` envia o job à mão. Se alguém voltar `schedule` para `false` ou trocar o `{ agendador: true }` de `index.ts:20`, a suíte continua verde | Não bloqueia: o código está certo, e o disparo depende de um minuto de relógio real. Mas sem cron nem a varredura nem o expurgo diário (C-31, T31) rodam. E o temporizador do desvio 3 continua gravando o batimento, então o alerta "worker sem sinal" não acenderia. A `06-T29-testes` decide se cabe um teste de até 70 s que espera o primeiro disparo. Se não couber, a homologação da `09-entrega` confere no log um `worker_batimento` por minuto |
| 2 (Minor) | `src/worker/index.ts:28` | O nome do sinal vai ao log no campo `codigoErro` | Não bloqueia: o log tem lista de permissão (C-21), e o valor é só `SIGTERM` ou `SIGINT`. Mas quem filtrar o log por `codigoErro` vai achar um encerramento normal como se fosse erro. Um campo próprio na lista, ou nenhum campo (o evento já diz que está encerrando) |
| 3 (Minor) | `src/worker/index.ts:15` a `:53` | O arquivo não tem teste: ordem do boot, saída com código 1 na configuração inválida e caminho do `SIGTERM` | Não bloqueia: a lógica está em `lerConfigWorker` e `iniciarWorker`, que têm teste, e o arquivo roda `principal()` ao ser importado. A homologação da `09-entrega` sobe o worker de verdade, e cabe a ela conferir a saída com `RETENCAO_TEXTO_BRUTO_DIAS` fora da faixa e a parada limpa no `SIGTERM` |
| 4 (Minor) | `src/worker/iniciar.ts:55` e `:56` | A falha do temporizador de batimento vai só ao log, com `warn`, enquanto a mesma falha no job agendado vai ao log e ao Sentry (`:37` e `:38`) | Não bloqueia: banco fora do ar já aparece pelo job agendado e pelo alerta de atraso. Mas o mesmo evento `worker_batimento_erro` sai com dois níveis e destinos diferentes. Alinhar os dois, ou dar outro nome ao do temporizador |

## Decisões tomadas

- **Os sete desvios foram aceitos.** Razão: o 1 é o único jeito de ligar o cron sem repetir o esquema privado da fila,
  e não muda o app. O 2 fecha um caso real de execução presa para sempre, com teste. O 3 é o que a 02 pede para o
  alerta de duas instâncias. O 4 já estava previsto nos privilégios. O 5 só estreita tipos. O 6 põe teto num laço que
  não tinha. O 7 é aditivo.
- **A varredura na 3ª tentativa não é problema desta tarefa.** Razão: a T27 já para em `tentativas_esgotadas` antes do
  provedor, e o teste da T27 cobre esse ramo.
- **Nenhum Minor foi elevado.** Razão: nenhum deles grava algo errado, deixa dado sair ou gasta além do teto. O 1 é o
  de maior peso, mas tem dono e forma de conferir na cadeia (`06-T29-testes` e `09-entrega`).
- **`proximo: qa-automacao`.** Razão: a revisão não tem bloqueio, e a próxima etapa da cadeia é a `06-T29-testes`.

## Pendências

- **Para a `06-T29-testes` (`qa-automacao`):**
  - avaliar o teste do disparo real do cron (Minor 1): `criarFila(url, { agendador: true })`, `iniciarWorker` e a
    espera do primeiro `worker.batimento` vindo de `pgboss.schedule`, com teto de 70 s;
  - a corrida entre a varredura e a reivindicação: o job `…:t1` em estado `active`, a execução ainda `pendente` com
    `atualizada_em` velho, e a varredura no meio. Esperado: um job novo no máximo, e uma chamada ao provedor só;
  - o limite de 100 da varredura (101 órfãs: 100 no primeiro batimento, 1 no seguinte).
- **Para a `09-entrega` (`devops-sre`):** na homologação, conferir no log do worker um `worker_batimento` por minuto
  (Minor 1). Conferir também a saída com código 1 e só o nome da variável quando `RETENCAO_TEXTO_BRUTO_DIAS` estiver
  fora da faixa, e a parada limpa no `SIGTERM` (Minor 3).
- **Para a `10-documentacao` (`documentacao-tecnica`):** o `deploy.md` diz que o worker roda com uma réplica e que uma
  chamada cortada no `SIGTERM` volta pela varredura quando a trava vence (150 s), como a entrega do engenheiro já pede.
- **Para a T30 e a T31 (`engenheiro-backend`):** registrar os handlers em `iniciarWorker` e acrescentar as filas à lista
  que o `parar()` percorre (`iniciar.ts:51`). Ao tocar `index.ts` ou `iniciar.ts`, os Minor 2 e 4 cabem na mesma
  passagem.
- **Para a T45 (`engenheiro-frontend`):** `situacaoDoWorker(db, relogio)` está pronta para os alertas, sem rota nem
  Server Action.
- **Para a `08-revisao`:** os Minor 1 a 4 desta revisão, se não forem fechados antes.
- Seguem abertos, sem mudança: os seis Minor da `06-T28-revisao`, os da `06-T27-revisao` e anteriores, e o aviso do
  undici "Using `patch`".

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --stat a710740..d7a2015` — três commits: 465cdb4 (código, testes e entrega), 1ad7607 (só registro) e d7a2015 (entrega −5 e registro)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 465cdb4 -- src` — diff completo dos 9 arquivos de código e teste
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent=true --reporter=dot` — 129 arquivos, 2585 de 2585
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat --format=%h d7a2015` — só a entrega do engenheiro (−5) e uma linha em `passagens.jsonl`

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
