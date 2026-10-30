---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T27-testes
agente: qa-automacao
leu: [contrato-passagem.md, pedido.json, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (T27), 01-analista-requisitos.md (RF-11 a RF-26, RNF-01 a RNF-18), 06-T27-engenheiro-backend.md, 06-T27-tech-lead.md, 06-T26-qa-automacao.md, git show --stat 640818a, git diff --stat 7c59703..034f6d2, src/modules/agentes/executar.ts, src/modules/agentes/execucoes.ts, src/modules/agentes/espera.ts, src/jobs/agente-executar.ts, src/modules/agentes/executar.test.ts, src/modules/agentes/espera.test.ts, src/jobs/agente-executar.test.ts, src/modules/agentes/uso.ts, src/modules/agentes/teto.ts, src/modules/pareceres-risco/servico.ts, src/modules/pacotes-decisao/criar.ts, src/modules/limites.ts, src/modules/versoes.ts, src/db/schema/agentes.ts, src/lib/relogio.ts, test/banco.ts, test/deps.ts, test/provedor-falso.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T27, no intervalo `7c59703..034f6d2`. O código e os testes estão no `640818a`. **O código cumpre todos os
critérios da tarefa.** Os 52 testes do engenheiro passam sem mudança. Acrescentei 18 testes de borda, falha e
concorrência num arquivo novo, `src/modules/agentes/executar.bordas.test.ts`. Os 18 passaram na primeira rodada e não
acharam defeito. A suíte inteira está verde, e o lint e o typecheck estão limpos.

### Critério da tarefa → teste que o cobre

Os arquivos têm uma sigla:

- **E**: `src/modules/agentes/executar.test.ts`, do engenheiro;
- **S**: `src/modules/agentes/espera.test.ts`, do engenheiro;
- **H**: `src/jobs/agente-executar.test.ts`, do engenheiro;
- **B**: `src/modules/agentes/executar.bordas.test.ts`, o novo.

| Critério | Testes |
|---|---|
| CA-16.1: JSON válido → `RSK-…-v1` com responsável agente risco | E: `CA-16.1: provedor falso com JSON válido → RSK-…-v1 gravado com responsável agente risco`; `insumo_tecnico grava a ESP da demanda; consolidação grava o DEC (os três destinos)` |
| CA-16.2: a 1ª fora do schema não grava, a 2ª grava exatamente um | E: `CA-16.2 e CA-17.2: 1ª fora do schema (…); 2ª válida grava exatamente um`. B: `válida só na 3ª tentativa → concluida, um RSK e nenhum evento falha_agente` |
| CA-16.3: sempre fora do schema → nada gravado, falha no histórico sem o conteúdo | E: `CA-16.3: sempre fora do schema → 3 tentativas, nenhum artefato, falhou, evento falha_agente sem o conteúdo`. B: `erro transitório nas três → falhou com erro_provedor, três usos erro, jobs t1 a t3 e sem Sentry` |
| CA-16.4: o mesmo job duas vezes → uma chamada e um RSK | E: `CA-16.4: o mesmo job duas vezes …`; `CA-16.4: o mesmo job ao mesmo tempo …`; `trava vencida durante a chamada: …`. B: `o payload gravado por criarExecucao passa no handler; o mesmo job duas vezes no lote chama o provedor uma vez` e os dois testes de `execução perdida` |
| CA-17.1: tokens e custo pela tabela de preço | E: `CA-17.1: a linha de uso registra 1.000 e 200 tokens e custo 0,006` |
| CA-17.2: tentativa fora do schema também gera uso, `fora_do_schema` | E: `CA-16.2 e CA-17.2: …`; `ESP de agente recusada pela regra de construção (400 no serviço) conta como saída inválida, sem gravar`. B: `JSON com texto em volta (fora de bloco de código) é saída inválida` |
| CA-18.1: teto 10 e gasto 10 → sem chamada, sem artefato, suspensão no histórico | E: `CA-18.1: teto 10 e gasto 10 → …`; `gasto logo abaixo do teto ainda chama` |
| CA-18.3: agente ligado com teto 0 → nenhuma chamada | E: `CA-18.3: agente ligado com teto 0 → nenhuma chamada` |
| CA-19.4: job na fila e agente desligado → sem chamada | E: `CA-19.4: job na fila e agente desligado em seguida → provedor não é chamado`. B: `CA-19.4: agente desligado entre a 1ª e a 2ª tentativa → a 2ª não chama o provedor` |
| RNF-06 e P1-e: 3 tentativas, esperas de 30 s e 2 min | S: `P1-e: 3 tentativas, esperas de 30 s e 2 min`; `a tentativa %s não tem espera e lança RangeError` (× 6). E: `pendente com a próxima tentativa ainda no futuro não é reivindicada antes da hora`. B: `o job da 3ª tentativa entregue antes dos 2 min não chama o provedor`; o teste das três falhas transitórias confere o `start_after` de cada job |
| RNF-07: teto conferido antes de **cada** chamada; a última pode passar do teto em uma chamada | B: `RNF-07: a 1ª tentativa leva o gasto ao teto → a 2ª não chama o provedor e a execução fica ignorada por teto` |
| C-12 no worker: o artefato passa pelo serviço da API, com o ator agente | E: `CA-16.1 …` (autor agente, `execucao_agente_id`); `insumo_tecnico grava a ESP …` (`DESTINOS[a].schema` é o `SCHEMA_DE_SAIDA[a]`) |
| C-25: nada da saída define status, autoria ou ator | E: `C-25: saída com status "aprovada" e rascunhoAgente:false não muda status nem autoria` |
| C-26: sem chave ou sem preço → nenhuma chamada | E: `sem provedor (sem chave) → ignorada, sem erro`; `modelo sem preço vigente → ignorada, sem chamada` |
| ADR-06: execução e job na mesma transação | E: `cria a execução pendente e um job só com { execucaoId } …`; `a mesma entrada de novo devolve null …`; `ADR-06: a transação desfeita leva a execução e o job junto` |
| ADR-07: reivindicação condicional e trava de 150 s | E: os 7 testes de `reivindicar (ADR-07)`. B: os 3 testes de `execução perdida (ADR-07)` |
| 401 → falhou na 1ª tentativa | E: `401 do provedor → falhou na 1ª tentativa, com uso, evento e Sentry` |
| Handler: payload pelo schema da fila, erro reduzido no log e no Sentry | H: os 6 testes. B: `o payload gravado por criarExecucao passa no handler …` |
| C-21: log sem texto | E: `nenhuma linha de log tem o texto da demanda, da resposta ou o modelo`. B: o teste do handler confere o log sem sentinela |
| Pendências da `06-T27-revisao` para esta etapa | B: `execução sem demanda (demandaId nulo) → nao_encontrado no gravar: falhou com recusada_pelo_servico, uso erro, sem artefato nem nova tentativa`; `C-36: limite de artefatos por hora do agente → reagendada com uso erro; passada a hora, a nova tentativa grava` |

### Testes acrescentados (18, em `src/modules/agentes/executar.bordas.test.ts`)

1. **Recusa do serviço depois de o schema passar** (2). São as três pendências da `06-T27-revisao`:
   - execução com `demandaId` nulo: o `gravar` lança `nao_encontrado`, e o resultado é `falhou` com
     `recusada_pelo_servico`;
     - a linha de uso fica `erro`, com os tokens e `demanda_id` nulo;
     - não há artefato, não há 2º job e nada vai ao Sentry;
     - o evento sai sem sentinela;
   - C-36: 60 RSK do agente risco na última hora. A execução fica `reagendada`, com uso `erro` e job `t2`. Passada a
     hora, a nova tentativa grava o RSK.
2. **Execução perdida** (3):
   - a trava vence durante a chamada, e os dois workers recebem saída inválida. O primeiro devolve `ja_tratada`, e o
     reagendamento dele é desfeito: ficam só os jobs `t1` e `t3`, sem o `t2` dele. Os dois usos ficam registrados;
   - a trava vence, o segundo worker grava, e o primeiro recebe 401. A execução continua `concluida`, sem evento
     `falha_agente`;
   - duas execuções do risco na mesma demanda ao mesmo tempo, sobre a ESP v1 e a v2: saem o RSK v1 e o v2, sem colisão de
     versão.
3. **Teto e interruptor antes de cada tentativa** (3):
   - RNF-07: a 1ª tentativa custa 3,00 com teto 3, e a 2ª fica `ignorada` por teto, sem chamada;
   - CA-19.4: o agente é desligado entre as tentativas, e a 2ª não chama o provedor;
   - CA-18.2 na virada do mês em São Paulo:
     - o gasto chega ao teto em 31/10 às 23 h;
     - às 23:59:59,999 a execução segue suspensa;
     - à meia-noite de 1º/11 (03:00 UTC), o provedor é chamado.
4. **As três tentativas** (3):
   - três erros transitórios terminam em `falhou` com `erro_provedor`, três usos `erro`, jobs `t1` a `t3` com
     `start_after` de +30 s e +2 min 30 s, e nada vai ao Sentry;
   - quando a saída só fica válida na 3ª tentativa, a execução fica `concluida`, sem evento de falha;
   - o job da 3ª tentativa entregue 1 ms antes dos 2 min dá `ja_tratada` e não chama o provedor.
5. **Leitura da resposta** (6):
   - resposta fora do envelope: tokens negativos, tokens fracionários, tokens `NaN` ou texto nulo. Os quatro casos dão
     uso `erro`, nova tentativa e nenhum artefato, sem Sentry;
   - JSON com texto em volta é `fora_do_schema`. A leitura não procura JSON no meio do texto;
   - bloco de código sem linguagem, com espaço em volta, ainda é lido.
6. **Handler com o job real** (1). O payload que `criarExecucao` grava no `pgboss.job` passa no schema do handler. É o
   contrato entre o envio e a leitura, que o teste do engenheiro só prova com `executarAgente` falso. O mesmo job
   duas vezes no lote chama o provedor uma vez, e o log fica sem sentinela.

### Resultado

- `executar.bordas.test.ts` isolado: 18 de 18 na primeira rodada.
- `pnpm test`: 123 arquivos, **2509 de 2509** (2491 da revisão mais os 18 novos), sem nenhuma falha. O aviso do undici
  "Using `patch`" segue igual, aberto desde a `06-T23-revisao`.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git status`: só o arquivo novo, sem rastreio. `git diff --stat`: vazio, nenhum arquivo rastreado mudou. Nenhum
  `.skip`, `.only` ou `.todo` nos testes do intervalo nem no novo, e nenhuma asserção afrouxada.

### Estabilidade e relógio

- Só o `relogioFixo`, sem `new Date()` sem argumento nem `Date.now()`. As esperas e a trava são feitas com
  `relogio.avancar`, sem `setTimeout`.
- Os testes não dependem de ordem:
  - cada `beforeEach` limpa `uso_ia`, volta a configuração dos agentes e do teto e cria demanda e ESP novas;
  - cada teste roda 2 h depois do anterior pela ordem de execução, seja ela qual for. Os 60 RSK do teste de C-36 não
    entram na janela de uma hora de outro teste;
  - o teste da virada do mês deixa no máximo 1 RSK do agente risco com data de novembro, longe do limite de 60.
- Banco próprio do arquivo (Testcontainers, cópia do `modelo`), provedor falso e Sentry simulado. Nenhuma chave de
  provedor.
- Dados só fictícios: `Pessoa Ficticia`, `bordas-cto@exemplo.test`, ids `DEM-20990102-…` no gasto e as sentinelas de
  `test/sentinelas.ts`.

## Decisões tomadas

- **Pronto, sem devolução.** Razão: cada critério da T27 tem teste e passa, e os 18 casos de borda não acharam defeito.
- **Arquivo novo, em vez de mexer no `executar.test.ts`.** Razão: os testes do engenheiro ficam intactos, e o
  `git diff --stat` vazio prova isso. A T28 já vai mudar três testes daquele arquivo.
- **O caso `demandaId` nulo cobre as pendências 1 e 3 da revisão num teste só.** Razão: nos três destinos, o único
  `ErroDominio` que não é `entrada_invalida` nem `limite_excedido`, e que um teste alcança sem dublê, é o
  `nao_encontrado` de `demandaDa`. A FK de `execucao_agente.demanda_id` impede uma demanda inexistente.
- **C-36 com os 60 RSK criados pelo próprio serviço, com o ator agente, e não por SQL do migrator.** Razão: a contagem
  usa a autoria gravada, e o serviço grava a mesma autoria que a execução usa.
- **A execução perdida foi testada no reagendamento e na falha.** Razão: o engenheiro só testou o caminho da gravação. O
  risco era o primeiro worker enfileirar um `t2` ou marcar `falhou` por cima de quem ficou com a execução.
- **Não fixei o número de `tentativas` no evento de `tentativas_esgotadas`.** Razão: é o Minor 2 da revisão, deixado
  para a 08. Um teste que prendesse o 4 de hoje impediria a correção.

## Pendências

- **Para a T28 e a T29 (`engenheiro-backend`):** nada novo além do que está na `06-T27-revisao`. O teste do handler com o
  job real (B) não muda quando a T29 registrar o handler no worker.
- **Observação para a 08, sem bloqueio:** a RNF-06 da `01-analista-requisitos.md` cita "30 s, 2 min, 10 min". O código
  e o plano seguem a P1-e, aprovada na Parada 1: 3 tentativas no total, sem a espera de 10 min. Os testes seguem a P1-e.
  Vale ajustar o texto da RNF-06 na documentação.
- Seguem abertos, sem mudança: os quatro Minor da `06-T27-revisao`, os Minor 2 e 3 da `06-T26-revisao`, o Minor de
  `fabianojp06` da `06-T26-testes` e o aviso do undici "Using `patch`".

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — topo db2c6d7, com 640818a, 809adc2 e 034f6d2 depois de 7c59703
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 7c59703..034f6d2` — 12 arquivos: 10 de código e teste, a entrega e o registro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:docs/superpowers/plans/` — o plano
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/db/schema/` — arquivos do schema
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/agentes/executar.bordas.test.ts` — 18 de 18
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 123 arquivos, 2509 de 2509, sem falha
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — só `src/modules/agentes/executar.bordas.test.ts`, sem rastreio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — vazio: nenhum arquivo rastreado mudou
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 640818a` — os 10 arquivos de código e teste da T27, a entrega e o registro

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
