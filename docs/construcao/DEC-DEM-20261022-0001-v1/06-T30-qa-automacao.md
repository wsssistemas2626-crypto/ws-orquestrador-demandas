---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T30-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6, mapa das fases, T29 e T30), 01-analista-requisitos.md (RF-24 a RF-26, RNF, matriz), tarefas.json, 06-T30-engenheiro-backend.md, commit 2655e8e (git show --stat e diff de criar.ts, iniciar.ts e index.ts), src/modules/avisos/aviso-dec.ts, src/modules/avisos/aviso-dec.test.ts, src/modules/avisos/enviador.ts, src/modules/avisos/enviador.test.ts, src/jobs/aviso-dec-pronto.ts, src/jobs/aviso-dec-pronto.test.ts, src/worker/iniciar.ts, src/lib/fila.ts, test/enviador-falso.ts, test/sentinelas.ts, saída do pnpm test gravada pela ferramenta (tool-results/bpy3zvqip.txt, só o fim)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T30, aviso por e-mail de pacote pronto para decisão. Cobre RF-25 (CA-25.1 a CA-25.3), C-38, RNF-14 e ADR-08. Também
cobre C-21, C-22 e ADR-06 no caminho do aviso. O código passou em todos os testes. Nenhum critério ficou sem teste.
Acrescentei 3 testes onde a cobertura do engenheiro parava antes do pg-boss (detalhes abaixo).

### Critério → teste que o cobre

| Critério | Arquivo | Teste |
|---|---|---|
| CA-25.1 (DEC criado → o falso recebe um e-mail com o id do DEC e o link) | `src/modules/avisos/aviso-dec.test.ts` | `enviarAviso > CA-25.1: DEC criado → o worker manda um e-mail com o id do DEC e o link` |
| CA-25.1 pelo worker de verdade | `src/jobs/aviso-dec-pronto.test.ts` | `no worker > o worker registra aviso.dec-pronto: DEC criado → um e-mail, job concluído e aviso enviado` e **novo** `no worker > CA-25.2 no worker: … com o id e o link (CA-25.1)` (confere o link inteiro) |
| CA-25.2 (o mesmo job enfileirado duas vezes → um e-mail só) | `src/modules/avisos/aviso-dec.test.ts` | `enviarAviso > CA-25.2: o mesmo aviso duas vezes → um e-mail só` e `enviarAviso > CA-25.2, ao mesmo tempo: dois envios simultâneos do mesmo aviso → um e-mail só` |
| CA-25.2 pelo handler e pelo worker | `src/jobs/aviso-dec-pronto.test.ts` | **novo** `tratarAvisoDecPronto > CA-25.2 no handler: dois jobs do mesmo DEC → um e-mail só, o segundo termina ja_enviado` e **novo** `no worker > CA-25.2 no worker: o mesmo aviso enfileirado duas vezes → os dois jobs concluem e sai um e-mail só, com o id e o link (CA-25.1)` |
| CA-25.3 (sem título, texto bruto nem nome do solicitante) | `src/modules/avisos/aviso-dec.test.ts` | `enviarAviso > CA-25.3: o corpo não tem título, texto bruto nem nome do solicitante` (sentinelas em todos os campos do e-mail, HTML inclusive) e `montarEmailDoAviso (texto da E01) > assunto, texto e HTML da E01, com o link para a tela de decisão` (texto exato) |
| C-38 (link só da origem configurada, destinatário só da configuração, id pela regex) | `src/modules/avisos/aviso-dec.test.ts` | `enviarAviso > C-38: o link começa pela origem configurada, mesmo com Host diferente na requisição`; os 5 casos de `montarEmailDoAviso > C-38: %s → recusado antes de montar o corpo`; `a URL base vale só pela origem…`; `URL base que não é http(s) é recusada` |
| RNF-14 (zero envio real) | `src/modules/avisos/enviador.test.ts` | todos com `fetch` injetado ou espiado; `EnviadorSemProvedor e criarEnviador > a fábrica não lê o ambiente…`; `EnviadorSemProvedor não envia…`; e `enviarAviso > sem RESEND_API_KEY → sem_provedor, nada enviado` em `aviso-dec.test.ts` |
| ADR-08 (Idempotency-Key, 10 s, endereço fixo) | `src/modules/avisos/enviador.test.ts` | `EnviadorResend manda o cabeçalho Idempotency-Key dec-<DEC-id>, com fetch injetado e sem rede`, `tempo limite de 10000 ms…`, `o endereço é fixo…` |
| ADR-06 (aviso e job na transação do DEC) | `src/modules/avisos/aviso-dec.test.ts` | `agendarAviso > ADR-06: o rollback da criação do DEC desfaz o aviso e o job` e `criar o DEC grava aviso_email pendente e o job aviso.dec-pronto só com { decId } (C-22)` |
| C-21 (log, Sentry e job sem dado do e-mail) | `aviso-dec.test.ts`, `enviador.test.ts` e `aviso-dec-pronto.test.ts` | `esgotou as tentativas → aviso falhou, Sentry sem dado pessoal…`, `falha do Resend: o log não leva o corpo do e-mail nem o destinatário`, `erro inesperado → relança sem a mensagem original…` e **novo** `no worker > falha no envio dentro do worker → o job fica em retry no pg-boss…` |
| 3 tentativas (02, seção 5) | `aviso-dec.test.ts` e `aviso-dec-pronto.test.ts` | `falha passageira: tenta de novo até 3 vezes…`, `esgotou as tentativas…` e **novo** `falha no envio dentro do worker…` (prova `retry_limit` 2 na fila real) |

### Testes acrescentados (3, todos em `src/jobs/aviso-dec-pronto.test.ts`)

Os testes do engenheiro provam CA-25.2 chamando `enviarAviso` direto. Nenhum deles fazia dois jobs do mesmo DEC passarem
pelo handler ou pelo pg-boss. Também nenhum provava que a falha no worker vira nova tentativa na fila real. Os 3 novos
cobrem isso:

1. `tratarAvisoDecPronto > CA-25.2 no handler: dois jobs do mesmo DEC → um e-mail só, o segundo termina ja_enviado`.
   - Os dois jobs vão no mesmo lote.
   - Confere um envio e uma chamada ao enviador.
   - O log `aviso_job_tratado` sai na ordem `enviado` e depois `ja_enviado`.
   - O aviso termina `enviado`.
2. `no worker > CA-25.2 no worker: o mesmo aviso enfileirado duas vezes → os dois jobs concluem e sai um e-mail só, com
   o id e o link (CA-25.1)`.
   - O DEC é criado pelo serviço (job com `singletonKey`), e um segundo job sem `singletonKey` entra antes de o worker
     subir.
   - Os dois jobs ficam `completed`.
   - Sai um e-mail só, com o link inteiro `Abrir a tela de decisão: <urlBase>/pacotes-decisao/<DEC-id>` e o destinatário
     da configuração.
3. `no worker > falha no envio dentro do worker → o job fica em retry no pg-boss (3 execuções), com a mensagem fixa e
   sem dado do erro original`.
   - O enviador falha com sentinelas na mensagem.
   - O job vai a `retry`, com `retry_limit` 2.
   - O `output` guardado pelo pg-boss leva só `aviso_nao_enviado`, sem sentinela.
   - O aviso fica `pendente` com 1 tentativa, e o log não leva sentinela.

Nenhum teste existente mudou: o `git diff` mostra só 59 linhas acrescentadas e nenhuma removida.

### Resultado

- `pnpm test`: 133 arquivos e **2660 de 2660**. Eram 2657 na entrega do engenheiro, e esta etapa somou 3.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- Estabilidade: os 3 arquivos da T30 passaram de novo numa segunda execução, 58 de 58. O arquivo do job rodou verde
  duas vezes seguidas.

### Leitura crítica da cobertura (sem bloqueio)

- O teste de envios simultâneos (`CA-25.2, ao mesmo tempo`) usa um `setTimeout` real de 300 ms. Ele não fica instável,
  porque com a trava `FOR UPDATE` o resultado é sempre `['enviado', 'ja_enviado']`. O atraso só serve para o teste pegar
  a falta da trava, e o engenheiro mostrou que pega.
- O teste `parar() tira também o work de aviso.dec-pronto` é fraco. Ele confere que nada aconteceu esperando 2,5 s de
  relógio real, e a busca padrão do pg-boss é de cerca de 2 s. Se a fila continuasse registrada, o teste ainda poderia
  passar. Não é instável (não falha à toa), por isso não mexi nele. Fica como Minor nas Pendências.
- Não há teste de ponta a ponta das 3 execuções pelo pg-boss: a nova tentativa espera 60 s de relógio real. Juntos, o
  `retry_limit` 2 na fila real (teste novo 3) e as 3 chamadas de `enviarAviso` com a coluna `tentativas` cobrem o
  comportamento sem depender do relógio.

## Decisões tomadas

- **Os 3 testes novos entraram no arquivo do job, que já existia.** Razão: ele já tem o banco, a fila e o worker
  montados por teste. Um arquivo novo pediria outro Testcontainers só para isso.
- **O teste novo 3 não confere `retry_count`.** Razão: no pg-boss 12.34.0 a contagem só sobe quando o job é buscado de
  novo, e a primeira execução viu `retry_count` 0. O teste confere `retry_limit` 2, que é a configuração da tarefa, e o
  estado `retry`.
- **O segundo job do teste 2 entra sem `singletonKey`.** Razão: assim existem de fato dois jobs do mesmo DEC na fila,
  como no CA-25.2. A deduplicação do `singletonKey` numa fila `standard` é da biblioteca e não é o que se quer provar.

## Pendências

- **Minor para a `08-revisao` ou a T34:** o teste `no worker > parar() tira também o work de aviso.dec-pronto: o job
  criado depois fica na fila` prova a ausência só por uma espera de 2,5 s. Uma prova mais forte: subir um segundo worker
  depois do `parar()` e ver que só ele pega o job, ou conferir com o pg-boss que não sobrou `work` registrado na fila.
- **Para a T34 (sentinelas transversais):** o teste novo 3 já confere o `output` do job no esquema `pgboss` para a fila
  `aviso.dec-pronto`. A T34 pode estender o mesmo para as outras filas.
- Os logs `worker_parado` aparecem na saída do `pnpm test`. Eles são gravados depois do `substituirDestinoDoLog(null)`
  do `afterEach`, o que já acontecia antes desta etapa. É só cosmético.
- Seguem abertas, sem mudança, as pendências da `06-T30-construcao`: o pacote `resend` sem uso, as notas do `deploy.md`
  e os Minor da T29.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 2655e8e61f66f88e54d79b4abfb5d43b01bfda7f` — 12 arquivos; os 3 arquivos de teste são novos, nenhum teste existente alterado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 2655e8e61f66f88e54d79b4abfb5d43b01bfda7f -- src/modules/pacotes-decisao/criar.ts src/worker/index.ts src/worker/iniciar.ts` — diff do código alterado
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/jobs/aviso-dec-pronto.test.ts` — 9 de 10: o teste novo 3 falhou na minha asserção de `retry_count` (o pg-boss conta só ao buscar de novo), não no código
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/jobs/aviso-dec-pronto.test.ts` — 10 de 10
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent=true --reporter=dot` — 133 arquivos, **2660 de 2660**
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — só `src/jobs/aviso-dec-pronto.test.ts` alterado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 59 linhas acrescentadas, nenhuma removida
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent=true src/modules/avisos src/jobs/aviso-dec-pronto.test.ts` — 3 arquivos, 58 de 58 (segunda execução, estabilidade)

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste (CA-25.1, CA-25.2 e CA-25.3, mais C-38, RNF-14 e ADR-08; tabela na Entrega)
- [x] a suíte inteira passa (2660 de 2660)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real: cada um cria o próprio DEC e a própria fila, e a espera é por `expect.poll` sobre o estado, não por tempo fixo. O relógio de negócio é o `relogioFixo`
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada. Conferido com `git diff --stat` (só acréscimos) e no `git show --stat` do commit (testes da T30 todos novos)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real (domínio `.test`, "Pessoa Ficticia" e sentinelas de `test/sentinelas.ts`)
