---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T08-testes
agente: qa-automacao
leu: [pedido.json, contrato-passagem.md, tarefas.json, 01-analista-requisitos.md (glossário, RF-01, RF-05, RF-06), 06-T07-qa-automacao.md (formato), 06-T08-engenheiro-backend.md, 06-T08-tech-lead.md, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G8, T08), diff --stat e82f615..9ce66b2, src/modules/demandas/confirmacao.ts, src/modules/demandas/confirmar.ts, src/modules/demandas/servico.ts (linhas 1 a 60), src/modules/agentes/gatilhos.ts, src/modules/agentes/executar.ts, src/modules/agentes/execucoes.ts (linhas 1 a 90), src/jobs/agente-executar.ts, src/worker/iniciar.ts, src/lib/fila.ts, src/db/transacao.ts, src/modules/demandas/confirmar.test.ts, src/modules/agentes/gatilhos-awave.test.ts, src/modules/agentes/executar-awave.test.ts, src/app/(painel)/demandas/[id]/acoes-confirmar.test.ts (linhas 60 a 157), test/deps.ts, test/integracoes.ts, test/provedor-falso.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T08, "Confirmação da demanda do Awave e nenhum agente de IA antes dela" (RF-05 nos gatilhos e no worker,
RF-06, IN-06, IN-07, CA-06.1 a CA-06.6, D-07, D-08, D-18). O código está em 9ce66b2. O commit d4a7a20 só regrava a
entrega.

O código passa em todos os testes, os da construção e os novos. Não há falha a classificar e **nada volta à construção**.

### Critério a critério

| Critério da T08 | Teste que cobre (arquivo › nome do teste) |
|---|---|
| RF-05/IN-06: a demanda do Awave nasce sem execução nem job, com o insumo ligado | `src/modules/demandas/confirmar.test.ts` › "controle: a demanda do Awave nasce sem confirmação, sem execução e sem job, mesmo com o insumo ligado (RF-05)" |
| CA-06.1: o evento sai com a pessoa (nome no histórico), e há execução `demanda:<id>` e job | `confirmar.test.ts` › "CA-06.1: grava demanda_confirmada com a pessoa e dispara o insumo técnico (execução e job)"; `src/app/(painel)/demandas/[id]/acoes-confirmar.test.ts` › "pessoa cto com 2FA confirma: …" |
| CA-06.2: com o insumo desligado ou suspenso, o evento é gravado, sem execução nem job | `confirmar.test.ts` › "CA-06.2: com o insumo desligado, …" e "CA-06.2: com o insumo suspenso pelo teto, …" |
| CA-06.3: idempotente (sem segundo evento nem segunda execução, e sem erro) | `confirmar.test.ts` › "CA-06.3: confirmar de novo responde sem erro …"; `acoes-confirmar.test.ts` › "CA-06.3: confirmar de novo pelo painel não é erro …" |
| IN-07: concorrência | `confirmar.test.ts` › "IN-07: duas confirmações simultâneas terminam com um evento, uma execução e um job" |
| CA-06.4: outra origem → 409, nada gravado | `confirmar.test.ts` › "CA-06.4: demanda de pessoa → 409 …" e "CA-06.4: demanda do agente orquestrador → 409 …"; `acoes-confirmar.test.ts` › "CA-06.4: demanda de pessoa → conflito …" |
| CA-06.5 e D-08: status final → 409; já confirmada e depois encerrada → sucesso sem gravar | `confirmar.test.ts` › "CA-06.5: Awave em status final → 409 …" e "D-08: já confirmada e depois encerrada, …" |
| CA-06.6: agente, integração e sistema negados | `confirmar.test.ts` › "CA-06.6: agente, as duas integrações e o sistema chamando a função direto → sem_permissao, nada gravado" |
| RF-06/C-11/C-34: autoria, rascunho e status não mudam | `confirmar.test.ts` › "C-11 e C-34: não muda autoria, rascunho, status nem nenhum outro campo da demanda" |
| RF-06: o evento e o disparo saem na mesma transação | **novo** `src/modules/agentes/gatilhos-awave-qa.test.ts` › "o envio do job falha com o insumo ligado: a confirmação não fica gravada, e a seguinte confirma e dispara"; "G3.8: na transação de quem chama, desfeita depois, não sobra evento, execução nem job" |
| IN-06 no gatilho, para os quatro agentes | `src/modules/agentes/gatilhos-awave.test.ts` › "dispararSeLigado chamado direto, para cada agente, …" e "ESP sem dúvida e RSK da pessoa …" (linhas 94 e 95) |
| IN-06 sem chamada ao provedor (gatilho, fila e worker juntos) | **novo** `gatilhos-awave-qa.test.ts` › "ESP e RSK da pessoa na demanda do Awave não confirmada: a passada do worker não chama o provedor; depois da confirmação, a mesma passada chama" |
| IN-06 no worker, passo 3c (D-07) | `src/modules/agentes/executar-awave.test.ts` › insumo, risco e "M-02 vem antes"; **novo** `gatilhos-awave-qa.test.ts` › "consolidação (rsk:) que chega à fila numa demanda do Awave não confirmada: …" e o controle "na demanda de pessoa, o RSK dispara pelo gatilho e a mesma passada chama o provedor …" |
| Depois da confirmação, roda como hoje; pessoa, agente e entrada sem demanda sem mudança | `gatilhos-awave.test.ts` › "depois da confirmação, …" (risco e consolidação) e as três regressões; `executar-awave.test.ts` › "depois da confirmação, a mesma execução roda …" e "regressão: …" |
| D-18: o motivo no histórico | `executar-awave.test.ts` › "D-18: o histórico da demanda mostra o motivo com o texto fixo" |
| G8 #23: a regra de `aguardaConfirmacao`, com falha fechada | `gatilhos-awave.test.ts` › "pessoa e agente não aguardam; …", "a confirmação é a do evento demanda_confirmada da própria demanda: …" e "autor_tipo desconhecido → true: …" |
| Server Action: sessão, 2FA, P-01, C-11, C-17, C-21 | `acoes-confirmar.test.ts` › os 10 testes |
| CA-06.7 (tela) | Fica com a T17 e a T18, fora da T08 |

### Parecer 1 da revisão (`gatilhos-awave.test.ts:96`): agora coberto de verdade

A revisão estava certa: o `ProvedorFalso` da linha 88 não entra em nenhuma função. A asserção da linha 96 passa por
construção.

Criei o arquivo novo `src/modules/agentes/gatilhos-awave-qa.test.ts`, com 5 testes. Nele, o provedor falso entra no
**handler de verdade da fila**, `tratarAgenteExecutar`, o mesmo que `src/worker/iniciar.ts` registra. O handler recebe
todo job `agente.executar` da demanda que está em `pgboss.job`. O teste segue estes passos:

1. Com os quatro agentes ligados, a pessoa grava uma ESP sem dúvida e um RSK na demanda do Awave não confirmada.
2. A passada do worker: 0 jobs, provedor sem chamada, nenhum `uso_ia`.
3. **Controle positivo, no mesmo teste e com o mesmo provedor:** a pessoa confirma.
   - A execução que passa a existir é só a do insumo. A ESP e o RSK de antes da confirmação não disparam nada de forma
     retroativa.
   - A mesma passada trata 1 job e chama o provedor uma vez, com o prompt do insumo técnico.
   - A execução fica `concluida`, com 1 `uso_ia`, e `capturarErro` não é chamado.

O controle prova que a passada alcança o provedor. Assim, o zero de antes da confirmação é uma medida, não um caso
vazio. O teste falha nos dois tipos de defeito:

- sem a guarda do gatilho: aparecem execuções e jobs, e o `toBe(0)` e o `toEqual([])` falham;
- sem as duas guardas: o provedor é chamado.

Também cobri o que faltava no passo 3c: a **consolidação** (`rsk:`). O `executar-awave.test.ts` só cobre o insumo e o
risco. No teste novo, a execução é criada à mão, com o job na fila, e passa pelo handler. Ela fica `ignorada`, com o
motivo `sem_confirmacao`, sem chamada ao provedor e sem uso. O controle, numa demanda de pessoa, chama o provedor com o
prompt da consolidação.

Não mexi em `gatilhos-awave.test.ts`. Pelo G3.2, um teste que já existe só muda pela lista do G5. Pelo meu critério de
pronto, eu também não apago asserção. Tirar a linha 96 continua com quem tocar o arquivo de novo (Pendências).

### Testes acrescentados

`src/modules/agentes/gatilhos-awave-qa.test.ts` (novo): 5 testes, 5 de 5.

O teste usa Postgres real (Testcontainers), o papel do app e a fila do pg-boss no mesmo banco. O relógio é fixo e avança
duas horas por teste. Cada teste cria a própria demanda, com a configuração refeita no `beforeEach`, então a ordem dos
testes não importa.

O Sentry está substituído por `vi.fn()`, como em `executar-awave.test.ts`. O teste confere que ele não foi chamado, para
o handler não engolir um erro sem ninguém ver.

Os dados são fictícios: "Pessoa Ficticia QA", `@exemplo.test`, `modelo-ficticio` e prefixo `ficticio`. Nenhum token é
gerado.

1. O IN-06 de ponta a ponta, com o controle positivo (acima).
2. A consolidação na demanda do Awave não confirmada, pelo handler: `ignorada` e `sem_confirmacao`, com o evento exato,
   sem provedor nem uso.
3. O controle da consolidação na demanda de pessoa: o provedor é chamado uma vez, com o prompt da consolidação.
4. Atomicidade do RF-06: quando o envio do job falha (fila falsa que rejeita), a confirmação lança e não fica nenhum
   evento nem execução. A demanda continua aguardando. A confirmação seguinte, com a fila real, grava 1 evento, 1
   execução e 1 job.
5. G3.8: a confirmação dentro da transação de quem chama.
   - Dentro da transação, `jaConfirmada` já é `true`.
   - Depois que a transação é desfeita, não sobra evento, execução nem job, e a demanda volta a aguardar.

### Resultado

- `pnpm test src/modules/agentes/gatilhos-awave-qa.test.ts`: 1 arquivo, **5 de 5**.
- `pnpm test` (suíte inteira): **266 de 266 arquivos e 5666 de 5666 testes**, sem falha, em 184 s. São os 5661 da
  construção mais os 5 novos.
- `pnpm typecheck`: limpo.
- `pnpm lint`: limpo.

### Conferência do IN-16 nas passagens da construção

- `git diff --stat e82f615 9ce66b2 -- "*.test.ts"`: só os 4 arquivos novos da T08, com 699 linhas a mais e nenhuma a
  menos. Nenhum teste que já existia mudou.
- `git log -S` com `.skip(`, `.only(` e `.todo(` no intervalo `e82f615..9ce66b2`: vazio nos três.
- Nesta etapa, `git status --short` mostra só o arquivo novo.

## Decisões tomadas

- Os testes ficam num arquivo novo, `gatilhos-awave-qa.test.ts`. Assim sigo o padrão `*-qa.test.ts` e o G3.2, sem mudar
  teste da construção.
- A passada usa `tratarAgenteExecutar`, não `executarAgente` direto. O handler é o caminho de produção (fila → payload
  Zod → execução), e ler os jobs de `pgboss.job` prova que nada foi enfileirado.
- O controle positivo fica no mesmo teste e usa o mesmo provedor. Só assim a asserção "sem chamada" pode falhar quando o
  código quebra.
- Testei a falha do envio do job com uma `Fila` falsa que rejeita. Essa é a única forma de provar, sem mudar código, que
  o evento e o disparo saem juntos, como a 06-T08-engenheiro-backend afirma.
- Não testei a execução com chave de demanda e `demanda_id` nulo. É o parecer 2 da revisão, já endereçado à 08-revisao.

## Pendências

- Nenhuma bloqueia a passagem.
- Minor, para quem tocar `src/modules/agentes/gatilhos-awave.test.ts` de novo: a linha 96 continua sem provar nada
  (parecer 1). A prova real está agora em `gatilhos-awave-qa.test.ts`, então a linha pode sair sem perder cobertura.
- Observação para a `08-revisao` (foco em gatilhos), lida no código e não reproduzida em teste. A execução é única por
  `(agente, chave_entrada)`. Se uma execução `demanda:<id>` de uma demanda do Awave chegar ao worker antes da confirmação
  e ficar `ignorada` por `sem_confirmacao`, a confirmação seguinte não cria outra: `criarExecucao` devolve `null`.
  Nesse caso, o insumo técnico não roda para essa demanda. Hoje nenhum caminho cria essa execução, porque o gatilho a
  barra. Isso só acontece pela mesma porta da defesa em profundidade do 3c, e o resultado falha fechado (sem IA), não
  aberto.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -15` — código da T08 em 9ce66b2, base e82f615; d4a7a20 e 626c356 são a entrega e a revisão
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat e82f615 9ce66b2` — 13 arquivos: 11 de código e teste, a entrega e `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --diff-filter=A --name-only --format=%h -- src/worker src/modules/agentes/worker.ts src/modules/fila src/lib/fila.ts src/worker.ts` — onde fica o worker (`src/worker/iniciar.ts`) e a fila
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/agentes/gatilhos-awave-qa.test.ts` — 5 de 5
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — em segundo plano, saída lida com Read: 266 de 266 arquivos e 5666 de 5666 testes, código 0
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat e82f615 9ce66b2 -- "*.test.ts"` — só os 4 testes novos, 699 linhas a mais e nenhuma a menos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -S ".skip(" e82f615..9ce66b2` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -S ".only(" e82f615..9ce66b2` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -S ".todo(" e82f615..9ce66b2` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só `src/modules/agentes/gatilhos-awave-qa.test.ts` (novo)

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
