---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T28-testes
agente: qa-automacao
leu: [contrato-passagem.md, pedido.json, padrao-tecnico.md, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (T28), 01-analista-requisitos.md (RF-05, RF-07, RF-15, RF-16, RF-18, RF-19), 06-T28-engenheiro-backend.md, 06-T28-tech-lead.md, 06-T27-qa-automacao.md, git show --stat b40faaf, git diff e7288e6 fd2a2cd (serviços e testes alterados), src/modules/agentes/gatilhos.ts, src/modules/agentes/gatilhos.test.ts, src/modules/agentes/saida-orquestrador.ts, src/modules/agentes/saida-orquestrador.test.ts, src/modules/demandas/entradas-pendentes.ts, src/modules/demandas/entrada.ts, src/modules/agentes/executar.ts, src/modules/agentes/execucoes.ts, src/modules/agentes/executar.bordas.test.ts (cabeçalho), src/modules/agentes/teto.ts, src/modules/limites.ts, src/lib/fila.ts, src/lib/relogio.ts, src/db/transacao.ts, test/banco.ts, test/deps.ts, test/provedor-falso.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T28, no intervalo `e7288e6..fd2a2cd`. O código e os testes entraram no `b40faaf`; o `65e687b` e o `fd2a2cd` só
mexem no registro e na entrega. **O código cumpre todos os critérios da tarefa.** Os 38 testes do engenheiro passam sem
mudança. Acrescentei 13 testes de borda, falha e concorrência num arquivo novo,
`src/modules/agentes/gatilhos.bordas.test.ts`. Eles cobrem as quatro pendências que a `06-T28-revisao` deixou para esta
etapa e mais cinco casos. Nenhum achou defeito que bloqueie. A suíte inteira está verde, e o lint e o typecheck estão
limpos.

### Critério da tarefa → teste que o cobre

Siglas dos arquivos:

- **G**: `src/modules/agentes/gatilhos.test.ts`, do engenheiro;
- **S**: `src/modules/agentes/saida-orquestrador.test.ts`, do engenheiro;
- **E**: `src/modules/agentes/executar.test.ts`, alterado pelo engenheiro (desvio 3);
- **GB**: `src/modules/agentes/gatilhos.bordas.test.ts`, o novo.

| Critério | Testes |
|---|---|
| RF-05 CA-05.2: orquestrador ligado e saída válida → demanda com responsável agente orquestrador e histórico com o agente | S: `CA-05.2: orquestrador ligado e saída válida → demanda criada como rascunho de agente, responsável agente orquestrador, histórico com o agente`; `a demanda nasce com o nome e o papel informados pela pessoa, nunca do provedor, e sem anexos`; `a entrada_bruta guarda o texto original (não o minimizado), a origem e a data da entrada, e a pendente some`. GB: `pendente sem papel nem origem → a demanda do orquestrador nasce sem papel e a entrada_bruta sem origem` |
| RF-15: perguntas do orquestrador → `aguardando_informacao`, sem mensagem ao solicitante | S: `perguntasParaSolicitante não vazia → aguardando_informacao, as perguntas em duvidas_entrada e nenhuma mensagem ao solicitante`. GB: `ESP com dúvida gravada pelo agente de insumo técnico → demanda aguardando_informacao e nenhum disparo do risco` |
| RF-16: demanda criada → `insumo_tecnico` | G: `insumo_tecnico ligado → uma execução demanda:<id> e um job com payload só { execucaoId } (C-22)`. S: `com o insumo técnico ligado, a demanda criada pelo orquestrador dispara o insumo técnico na mesma transação` |
| RF-16: ESP sem dúvida → `risco`; com dúvida, não | G: `ESP com dúvida não dispara o risco; ESP sem dúvida dispara`; `risco desligado → ESP sem dúvida não dispara nada`. GB: o teste da ESP com dúvida do agente, acima |
| RF-16: RSK com ESP → `consolidacao`; sem ESP, não | G: `RSK com ESP na demanda dispara a consolidação; RSK sem ESP, não`; `a ESP com dúvida também conta como ESP na demanda para a consolidação` |
| RF-16: entrada por texto → orquestrador | S: `ligado → pendente aguardando com o texto como chegou, execução entrada:<uuid> sem demanda e job só com { execucaoId } (C-22)` |
| RF-16: cadeia pelo worker, sem execução duplicada | G: `a ESP gravada pelo agente de insumo técnico dispara o risco na mesma transação, e o RSK do agente dispara a consolidação`; `dispararSeLigado: desligado → false sem nada criado; ligado → true; a mesma entrada de novo → false, sem 2ª execução`. S: `o mesmo job duas vezes → uma chamada e uma demanda (CA-16.4)` |
| RF-19 CA-19.2: insumo desligado → nada enfileirado, e a pessoa grava a ESP | G: `CA-19.2: insumo_tecnico desligado → criar demanda não enfileira nada, e a pessoa grava a ESP` |
| RF-19 e RF-18 na entrada: desligado ou suspenso → 409 sem gravar | S: `orquestrador desligado → conflito com a mensagem da tela, sem pendente, execução nem job`; `suspenso pelo teto → conflito com a mensagem de suspensão da 03, sem pendente`; `modo agente com orquestrador desligado → 409; ligado → 202 com entradaId, sem eco do texto`; `suspenso pelo teto → 409 com a mensagem de suspensão`. GB: os dois casos de `o estado do orquestrador muda entre a leitura e o disparo` |
| RF-18: suspenso pelo teto → nenhum gatilho dispara | G: `suspenso pelo teto → não dispara (teto 0 e gasto igual ao teto)`; `estadoDoAgente e orquestradorDisponivel: desligado, suspenso e disponível` |
| ADR-06: o gatilho anda com a transação do artefato | G: `ADR-06: a transação da demanda desfeita leva a execução e o job junto`; `dependências sem fila: …`. GB: os quatro testes de `ADR-06: o artefato desfeito leva junto a execução e o job do agente seguinte` |
| T-01: a entrada pendente e a conversão | S: os testes de `modo agente: a entrada pendente (T-01)` e de `preencher à mão a partir da pendente`. GB: `duas pessoas preenchem à mão a mesma pendente ao mesmo tempo → uma demanda, e a outra recebe nao_encontrado` |
| T-03: `agentesEmAndamento` | S: `obterDemanda traz agentesEmAndamento com o risco pendente; concluída a execução, a lista fica vazia`. GB: `T-03: agentesEmAndamento lista os agentes da demanda na ordem de criação, sem os de outra demanda nem o orquestrador sem demanda` |
| C-22: payload só com o id | G e S: os dois testes de C-22 acima (`data` igual a `{ execucaoId }` e a `singleton_key` `…:t1`) |
| C-31: a pendente existe e é achável | S: `3 falhas → a pendente fica falhou e aparece em listarEntradasPendentes, sem texto nem nome`; `antes de falhar, a pendente aparece como aguardando`; `agente desligado depois de a entrada entrar na fila → …`; `teto atingido depois de a entrada entrar na fila → …`; `listarEntradasPendentes: da mais nova para a mais antiga`; os dois de `obterEntradaPendente`. GB: os dois de `marcarPendenteComoFalha` |
| C-36 na saída do orquestrador | GB: `limite de demandas por hora do orquestrador → reagendada com uso erro e a pendente aguardando; passada a hora, a nova tentativa cria a demanda` |
| C-21: log sem texto | S: `o caminho inteiro (entrada, execução, falha e conversão à mão) não leva texto, nome, e-mail nem telefone ao log` |
| Destino do orquestrador no `executar.ts` | S: `o orquestrador tem destino, com o mesmo schema da saída`. E: `cada agente da lista tem prompt, schema e destino (o orquestrador desde a T28)`; `orquestrador com a entrada pendente que não existe (T28) → falhou sem chamar o provedor` |

### Testes acrescentados (13, em `src/modules/agentes/gatilhos.bordas.test.ts`)

1. **ADR-06: o rollback leva junto o disparo** (4). A primeira pendência da revisão, nos dois lados:
   - **pela pessoa:**
     - a ESP sem dúvida desfeita não deixa execução nem job do risco;
     - o RSK desfeito numa demanda com ESP não deixa execução nem job da consolidação;
   - **no worker**, com uma fila que envia o job de verdade (ele entra na transação) e falha logo depois:
     - o RSK do agente de risco é desfeito, e com ele a execução e o job da consolidação. A chamada fica com uso `erro`, e
       a execução do risco não fica `concluida`;
     - a demanda do orquestrador é desfeita, e com ela a execução e o job do insumo técnico e a `entrada_bruta`. A
       pendente continua `aguardando`.
2. **O estado muda entre a leitura e o disparo** (2, `it.each`). É a segunda pendência, o segundo 409 de
   `entrada.ts:118` e `:119`:
   - um gatilho no banco do próprio arquivo de teste baixa o teto a zero, ou desliga o orquestrador, logo depois de a
     pendente ser inserida, na mesma transação;
   - o resultado é `conflito`, sem pendente, execução nem job. O gatilho e a função são apagados no `finally`;
   - o envio seguinte funciona, o que prova que a mudança foi desfeita junto.
3. **C-36 na saída do orquestrador** (1). A terceira pendência:
   - com 30 demandas do orquestrador na última hora, a execução fica `reagendada`, com uso `erro` e os jobs `t1` e
     `t2`;
   - nenhuma demanda nasce, e a pendente continua `aguardando`;
   - passada a hora, a nova tentativa cria a demanda e apaga a pendente.
4. **Concorrência na conversão à mão** (1). Duas conversões da mesma pendente ao mesmo tempo (`Promise.allSettled`):
   - uma cria a demanda, e a outra recebe `nao_encontrado` com a mensagem da tela;
   - fica uma demanda e uma `entrada_bruta` a mais, com o texto da pendente.

   Isso prova a trava `FOR UPDATE` sob corrida real. O engenheiro só testou em sequência.
5. **`marcarPendenteComoFalha`** (2). A quarta pendência:
   - com a pendente já convertida, não falha e não recria linha;
   - com chave de outro agente ou fora do formato (`demanda:`, `esp:`, `entrada:nao-e-uuid`, uuid com sufixo ou com
     espaço), não toca na pendente que existe.
6. **Mais casos do caminho do agente** (3):
   - a ESP com dúvida gravada pelo agente de insumo técnico leva a demanda a `aguardando_informacao` e não dispara o
     risco, mesmo com o risco ligado;
   - a pendente sem papel nem origem gera a demanda com papel nulo, mesmo com o modelo devolvendo `financeiro`, e a
     `entrada_bruta` com origem nula;
   - `agentesEmAndamento` com dois agentes na mesma demanda, na ordem de criação, sem os de outra demanda e sem a
     execução do orquestrador, que não tem demanda.

### Resultado

- `gatilhos.bordas.test.ts` isolado: 13 de 13 depois do ajuste descrito em Decisões. Também deu 13 de 13 com
  `--sequence.shuffle` (semente 1793380884054).
- `pnpm test`: 126 arquivos e **2560 de 2560** (2547 da revisão mais os 13 novos), sem nenhuma falha. O aviso do undici
  "Using `patch`" continua igual.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git status`: só o arquivo novo, sem rastreio. `git diff --stat`: vazio, nenhum arquivo rastreado mudou.
- Conferi o diff `e7288e6 fd2a2cd` dos quatro testes existentes que o engenheiro alterou. Só mudou a ordem de montagem,
  as três asserções que a `06-T27-revisao` previu e dois títulos. Nenhum teste foi apagado, nenhuma asserção ficou mais
  fraca, e não há `.skip`, `.only` nem `.todo`, nem no intervalo nem no arquivo novo.

### Estabilidade e relógio

- Só o `relogioFixo`, sem `new Date()` sem argumento e sem `Date.now()`. A hora de C-36 passa por `relogio.avancar`.
- Os testes não dependem de ordem:
  - cada teste roda 2 h depois do anterior, ainda em outubro;
  - o `beforeEach` limpa `uso_ia`, desliga os agentes e volta o teto a 10;
  - o `afterEach` apaga as pendentes;
  - toda contagem é de antes e depois, ou filtrada pela demanda ou pela chave do próprio teste;
  - a rodada embaralhada passou.
- Banco próprio do arquivo (Testcontainers, cópia do `modelo`), provedor falso e Sentry simulado. Nenhuma chave de
  provedor.
- Dados só fictícios: `Pessoa Ficticia`, `gatilhos-bordas-cto@exemplo.test` e um texto de pedido inventado, sem nome,
  e-mail nem telefone.

## Decisões tomadas

- **Pronto, sem devolução.** Razão: cada critério da T28 tem teste e passa, e os 13 casos de borda não acharam defeito
  que bloqueie.
- **Arquivo novo, em vez de mexer em `gatilhos.test.ts` e `saida-orquestrador.test.ts`.** Razão: os testes do
  engenheiro ficam intactos, e o `git diff --stat` vazio prova isso.
- **O estado que muda no meio é simulado por um gatilho no banco do teste.** Razão: o gatilho dispara entre o insert da
  pendente e a 2ª leitura, sempre no mesmo ponto, sem `setTimeout` e sem depender de quantas vezes o relógio é lido. O
  banco é do próprio arquivo, e o gatilho é apagado no `finally`.
- **O rollback no worker é provocado por uma fila que falha depois de enviar.** Razão: assim a execução e o job do
  agente seguinte já estão na transação quando ela é desfeita. É o pior caso para ADR-06.
- **O teste do segundo 409 aceita as duas mensagens da tela.** Razão: hoje esse 409 diz sempre "desligado", mesmo quando
  a causa é o teto (Minor A). Um teste preso ao texto de hoje impediria a correção.
- **Ajuste antes de fechar.** Razão: na 1ª rodada, o teste de concorrência contava `entrada_bruta` pelo texto, e outro
  teste do arquivo já tinha gravado o mesmo texto. Isso dependia de ordem. Passei a contar antes e depois e a conferir
  pela demanda criada. Fiz o mesmo ajuste no teste de rollback do orquestrador, que passou na 1ª rodada, mas tinha a mesma dependência.

## Pendências

- **Para a `08-revisao`, Minor A, sem bloqueio:** o segundo 409 de `src/modules/demandas/entrada.ts:118` e `:119` usa
  sempre `MENSAGEM_ORQUESTRADOR_DESLIGADO`. Quando o teto cai entre as duas leituras, a pessoa lê "desligado" em vez de
  "Agentes suspensos pelo teto de gasto". A correção é ler o estado de novo, ou fazer `dispararSeLigado` devolver o
  motivo. O teste do GB aceita as duas mensagens e continua valendo depois da correção.
- **Para a T29 (`engenheiro-backend`), registro:** quando a gravação no worker falha por erro que não é de domínio
  (no teste, a fila depois do envio), a execução fica `em_andamento` até a trava vencer. Ela não fica `concluida` e não
  tem artefato. É o caso que a varredura de órfãs (ADR-07) reenfileira. Vale um teste da T29 com essa execução.
- Seguem abertos, sem mudança: os Minor 1 a 6 da `06-T28-revisao`, os quatro Minor da `06-T27-revisao`, os Minor 2 e 3
  da `06-T26-revisao`, o Minor de `fabianojp06` da `06-T26-testes` e o aviso do undici "Using `patch`".

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat b40faaf` — os 15 arquivos de código e teste da T28, a entrega e o registro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff e7288e6 fd2a2cd -- src/modules/pareceres-risco/servico.ts src/modules/especificacoes/servico.ts src/modules/demandas/servico.ts src/modules/demandas/consultas.ts` — os três gatilhos e `agentesEmAndamento`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/agentes/gatilhos.bordas.test.ts` — 1ª rodada: 12 de 13; o teste de concorrência contava `entrada_bruta` pelo texto (dependência de ordem do próprio teste, corrigida)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/agentes/gatilhos.bordas.test.ts` — 13 de 13
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/agentes/gatilhos.bordas.test.ts --sequence.shuffle` — 13 de 13, semente 1793380884054
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=dot` — 126 arquivos, 2560 de 2560, sem falha
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff e7288e6 fd2a2cd -- src/modules/agentes/executar.test.ts src/modules/agentes/executar.bordas.test.ts src/modules/demandas/consultas.test.ts src/modules/demandas/entrada.test.ts` — só ordem de montagem, as três asserções previstas e dois títulos; sem `.skip`, `.only` nem `.todo`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — só `src/modules/agentes/gatilhos.bordas.test.ts`, sem rastreio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — vazio: nenhum arquivo rastreado mudou
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — topo 0cfc485 (revisão), com b40faaf, 65e687b e fd2a2cd depois de e7288e6

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
