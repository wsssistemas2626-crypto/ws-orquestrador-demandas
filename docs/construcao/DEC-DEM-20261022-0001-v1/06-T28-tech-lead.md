---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T28-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6, mapa das fases, T28, T29 e T31), 05-tech-lead.md, 06-T28-engenheiro-backend.md, 06-T27-tech-lead.md, git diff e7288e6..fd2a2cd, src/modules/agentes/gatilhos.ts, src/modules/agentes/gatilhos.test.ts, src/modules/agentes/saida-orquestrador.ts, src/modules/agentes/saida-orquestrador.test.ts, src/modules/demandas/entradas-pendentes.ts, src/modules/agentes/executar.ts, src/modules/agentes/execucoes.ts (cabeçalho), src/modules/agentes/entrada-agente.ts, src/modules/demandas/servico.ts, src/modules/demandas/texto-recebido.ts, src/lib/deps.ts, src/app/api/demandas/entrada/route.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Primeira revisão da T28, no intervalo `e7288e6..fd2a2cd`. O código e os testes entraram no `b40faaf`. O `65e687b` só
acrescenta uma linha a `passagens.jsonl` (a liberação do bloqueio só de leitura), e o `fd2a2cd` só regrava a entrega do
engenheiro (−5 linhas) e acrescenta uma linha ao registro.

**Não há problema Critical nem Important.** A passagem segue para a `06-T28-testes`. Ficam seis Minor, nos Pareceres e
em Pendências.

### Arquivos do intervalo

| Arquivo | Situação |
|---|---|
| `src/modules/agentes/gatilhos.ts` e `gatilhos.test.ts` | Novos, do plano |
| `src/modules/agentes/saida-orquestrador.ts` e `saida-orquestrador.test.ts` | Novos, do plano |
| `src/modules/demandas/entradas-pendentes.ts` | Novo, do plano |
| `src/modules/demandas/servico.ts`, `src/modules/especificacoes/servico.ts`, `src/modules/pareceres-risco/servico.ts` | Alterados, do plano (gatilhos) |
| `src/modules/demandas/entrada.ts`, `src/modules/demandas/consultas.ts`, `src/modules/agentes/executar.ts` | Alterados, do plano |
| `executar.test.ts`, `executar.bordas.test.ts`, `consultas.test.ts`, `entrada.test.ts` | Alterados, fora da lista (desvio 3) |
| `06-T28-engenheiro-backend.md` e `passagens.jsonl` | Entrega e registro |

### Conferência contra o plano (T28)

| Ponto do plano | Situação |
|---|---|
| `dispararSeLigado`: desligado ou suspenso → `false` sem nada criado; ligado → `criarExecucao` | Atendido (`gatilhos.ts:37` a `:47`). Roda na transação de quem chama; o teste de rollback (`gatilhos.test.ts:109`) prova que a execução e o job somem com a demanda (ADR-06). Idempotente pela chave (`:192`) |
| `orquestradorDisponivel`: ligado e não suspenso | Atendido (`gatilhos.ts:28`), sobre `estadoDoAgente` (`:22`) |
| Demanda criada → `insumo_tecnico` com `demanda:<id>` | Atendido (`servico.ts:103`). Teste com o job só `{ execucaoId }` e a chave `…:t1` (C-22) |
| ESP sem dúvida → `risco` com `esp:<id>`; com dúvida, não | Atendido (`especificacoes/servico.ts:74` e `:76`). Teste com as duas ESP na mesma demanda |
| RSK com ESP na demanda → `consolidacao` com `rsk:<id>`; sem ESP, não | Atendido (`pareceres-risco/servico.ts:75`, sobre `temEspecificacao` em `:26`) |
| Suspenso pelo teto → não dispara (CA-19.2, CA-18.1) | Atendido. Teste com teto 0 e com gasto igual ao teto |
| `gravarSaidaOrquestrador`: demanda com nome e papel da pendente, anexos `[]`; texto, origem e `recebida_em` copiados para `entrada_bruta`; pendente apagada; `perguntasParaSolicitante` em `duvidas_entrada` e `duvida_em_aberto` | Atendido (`saida-orquestrador.ts:20` a `:47`). A demanda passa por `criarDemanda` com o ator agente (`autorizar` e C-36). Os campos vão um a um, e o teste manda `solicitanteNome`, `solicitantePapel` e `anexos` na saída do modelo: nenhum chega à demanda (C-11, C-25) |
| `entrada.ts`: modo agente e conversão da pendente | Atendido (`entrada.ts:100` a `:123` e `:71` a `:96`). 409 sem gravar nada com o orquestrador desligado ou suspenso; pendente, execução `entrada:<uuid>` com `demanda_id` nulo e job numa transação só; a rota responde 202 só com `entradaId`, sem eco do texto |
| `consultas.ts`: `agentesEmAndamento` (T-03) | Atendido (`consultas.ts:130` a `:137`), lido de `execucao_agente`, sem o esquema do pg-boss. Teste com `pendente`, `em_andamento` e a lista vazia depois de `falhou` |
| `executar.ts`: destino do orquestrador; falha final marca a pendente `falhou` | Atendido (`executar.ts:77` a `:80` e `:124` a `:132`), com o desvio 1 |
| `listarEntradasPendentes` sem texto, origem nem nome; `obterEntradaPendente` só pessoa | Atendido (`entradas-pendentes.ts:36` e `:44`). O teste confere a lista sem sentinela, o `sem_permissao` do agente e o 404 sem consulta para id fora do formato (G3.10) |
| Os 13 testes do plano (5 em `gatilhos.test.ts`, 8 em `saida-orquestrador.test.ts`) | Estão todos, com corpo, e mais 25 |

### Desvios do plano

| # | Desvio | Parecer |
|---|---|---|
| 1 | A execução `ignorada` do orquestrador também deixa a pendente `falhou` | Aceito. A execução é única por entrada e a ignorada não roda de novo; a pendente ficaria "aguardando" para sempre. Com `falhou`, ela aparece para a pessoa preencher à mão, como pede a 03 (T04). Dois testes (desligado e teto) |
| 2 | `DepsComFila = DepsDemanda & Partial<Pick<Deps, 'fila'>>`; `dispararSeLigado` recebe `Pick<Deps, 'relogio'>` com fila opcional | Aceito. Rota, Server Action e worker sempre têm a fila (`src/lib/deps.ts:12` e `DepsAgente`). Sem a fila e com o agente ligado, `ERRO_SEM_FILA` desfaz a transação: nunca deixa de disparar em silêncio, e o teste prova os dois lados. Ver o Minor 4 |
| 3 | Quatro arquivos de teste existentes mudaram | Aceito. Conferi o diff: só mudou a ordem de criação (a demanda e a ESP antes de ligar o agente, porque o gatilho já criaria a execução) e as três asserções que a `06-T27-revisao` previu. Nenhuma asserção ficou mais fraca: "cada agente tem destino" ficou mais forte, e o teste do orquestrador sem pendente agora confere `entrada_nao_encontrada` sem chamar o provedor |
| 4 | Com `entradaPendenteId`, o `texto` e a `origem` do corpo são ignorados | Aceito. O que fica em `entrada_bruta` é o que chegou, e o prazo de retenção conta da data da chegada (C-31). Há teste de que o "outro texto" do corpo não é gravado |
| 5 | Os `flags` da saída do orquestrador são validados e descartados | Aceito nesta tarefa: o plano não diz onde guardá-los e a demanda não tem campo. Fica em Pendências para a `07-qa-funcional` conferir contra a T05 da 03 |
| 6 | Acréscimos exportados (`estadoDoAgente`, `ERRO_SEM_FILA`, `MENSAGEM_ORQUESTRADOR_SUSPENSO`, funções de apoio da pendente) | Aceito. São aditivos. `obterEntradaPendente` recebe `Pick<Deps, 'db'>` em vez de `Deps`, o que só estreita o tipo; quem tem `Deps` passa sem mudança |

### Testes e TDD

- A entrega mostra a primeira rodada falhando antes do código: os dois arquivos sem módulo.
- Os testes falham sem o código: conferem estado no banco (execução, job e chave, pendente, `entrada_bruta`, demanda,
  histórico, `aviso_email`) e as chamadas ao provedor falso, não só o valor devolvido.
- As corridas que importam têm teste: o mesmo job duas vezes (uma chamada, uma demanda), a pendente convertida à mão
  antes do agente (sem chamada ao provedor) e durante a chamada (sem segunda demanda), e a pendente que não converte
  duas vezes. A trava `FOR UPDATE` é pega na mesma ordem pela pessoa e pelo agente (`travarEntradaPendente` antes de
  `criarDemanda`), então não há inversão de trava.
- A cadeia inteira pelo worker (`gatilhos.test.ts:217`): o insumo grava a ESP, que dispara o risco, cujo RSK dispara a
  consolidação. Não há laço: o DEC não dispara nada.
- Banco real, provedor falso, relógio fixo, só dados fictícios e sentinelas. O teste C-21 percorre entrada, execução,
  falha e conversão à mão sem sentinela no log. Sem `.skip`, `.only` nem `.todo`.

### Verificação própria

- `pnpm test`: 125 arquivos, 2547 de 2547. Bate com a entrega (2509 depois da `06-T27-testes`, mais 38). O aviso do
  undici "Using `patch`" segue o mesmo.
- `pnpm lint` e `pnpm typecheck`: limpos.
- `git status`: limpo antes desta entrega.

### Checklist da seção 12

- [x] Faz o que o plano pede. Os arquivos fora da lista são os quatro testes do desvio 3, que o comportamento novo
      obriga a mudar.
- [x] Há teste para cada comportamento novo, e ele falharia sem o código.
- [x] Não há segredo, valor de `.env` nem dado pessoal real. A pendente guarda dado pessoal de terceiro, mas a lista não
      o traz, a leitura é só de pessoa (`ler_texto_bruto`), e nem histórico nem log o recebem (teste com sentinelas).
- [x] Entrada externa validada com Zod: o corpo pelo `entradaSchema` da T17 (o `entradaPendenteId` ainda passa pela
      regex de UUID antes do banco), a saída do modelo pelo `saidaOrquestradorSchema`. O 409 e o 404 levam só a
      mensagem da tela.
- [x] Banco: a tarefa não cria migration. Usa `entrada_pendente`, `entrada_bruta` e `execucao_agente` da Fundação, pelo
      papel do app.
- [x] Nada duplica função existente. A demanda nasce por `criarDemanda`, a execução por `criarExecucao`, o estado por
      `obterConfiguracaoAgente` e `situacaoDoTeto`. Sobra a repetição de uma constante e de um formato de chave (Minor 3).
- [x] Textos em pt-BR. A mensagem de suspensão é a da 03 (T04). A tarefa não tem tela.
- [x] Os Minor estão em Pendências. Não há Critical nem Important.
- [x] PR (`/code-review`, `/security-review`): não se aplica a esta etapa, fica com a `08-revisao`.

### Pareceres

| # | Arquivo:linha | Problema | Razão |
|---|---|---|---|
| 1 (Minor) | `src/modules/agentes/saida-orquestrador.ts:25` a `:45` (com `src/modules/demandas/servico.ts:103`) | A demanda que o orquestrador cria com `perguntasParaSolicitante` dispara o insumo técnico (dentro de `criarDemanda`) e só depois vai a `aguardando_informacao`. Uma chamada paga roda sobre uma demanda que ainda espera resposta do solicitante | Não bloqueia: o plano manda "após criar → `insumo_tecnico`" sem exceção, e o insumo pode devolver a ESP com dúvida. Mas a regra da ESP (com dúvida, não dispara o risco) sugere a mesma lógica aqui. Decidir na `08-revisao`, ou com o `analista-requisitos`, se a demanda com perguntas do orquestrador deve esperar |
| 2 (Minor) | `src/modules/agentes/executar.ts:197` | Com o orquestrador em `DESTINOS`, todo agente tem destino: o ramo `sem_destino` virou código morto, e o único teste que o cobria passou a testar outro caminho | Não bloqueia: é uma defesa barata se um agente novo entrar em `AGENTES` sem destino. Mas o teste "cada agente tem destino" já pega esse caso. Remover o ramo e o motivo, ou manter com um comentário |
| 3 (Minor) | `src/modules/demandas/entradas-pendentes.ts:21` e `:22` a `:33` | `RE_UUID` passa a existir em três módulos (`execucoes.ts:23`, `entrada-agente.ts:72` e aqui), e o formato da chave `entrada:<uuid>` é lido em dois lugares (`pendenteDaChave` e `idDaChave` em `entrada-agente.ts:77` e `:85`). As chaves `demanda:`, `esp:` e `rsk:` são montadas à mão em três serviços | Não bloqueia: são uma constante e um formato curtos, e os testes pegam divergência. Mas a seção 12 pede nada duplicado: um módulo só para as chaves de entrada (montar e ler) e o `RE_UUID` em `src/lib` fecham isso. Fica para a `08-revisao` |
| 4 (Minor) | `src/modules/demandas/servico.ts:23` e `:28` | `DepsComFila` tem a fila opcional, ao contrário do que o nome diz, e o comentário de `DepsDemanda` ainda diz "sem Better Auth nem fila" para o worker | Não bloqueia: o desvio 2 foi aceito e falha alto. Mas quem montar dependências sem fila no futuro (scripts da T32 e da T33, seed) só descobre com o agente ligado. Renomear para algo como `DepsServico` e corrigir o comentário |
| 5 (Minor) | `src/modules/demandas/entrada.ts:100` a `:123` | O modo agente não tem limite por hora próprio: C-36 conta demandas e artefatos, e a pendente não é nenhum dos dois. Cada envio é uma chamada paga | Não bloqueia: só pessoa com conta e 2FA chega aqui, e o gasto segue preso ao teto (o 409 de suspensão já funciona). Cabe ao `/security-review` da `08-revisao` dizer se C-36 deve contar a pendente |
| 6 (Minor) | `src/app/api/demandas/entrada/route.ts:1` e `:2` | O comentário ainda diz "a partir da T28 (até lá, 409 com a mensagem da tela)" | Não bloqueia: o código já responde 202 e o teste da rota prova. O engenheiro deixou o arquivo fora para não sair da lista da tarefa. Uma linha de comentário na próxima tarefa que tocar a rota |

## Decisões tomadas

- **Os seis desvios foram aceitos.** Razão: o 1 evita pendente esperando para sempre e segue a 03; o 2 nunca deixa de
  disparar em silêncio e poupa a mudança de vários testes sem relação com a T28; o 3 só reordena a montagem dos testes,
  sem afrouxar asserção; o 4 guarda o texto como chegou, com o prazo contado da chegada; o 5 não tem destino no plano; o
  6 é aditivo.
- **O RSK dispara a consolidação com qualquer ESP na demanda, mesmo a com dúvida.** Razão: é o que o plano diz ("RSK com
  ESP na demanda"), e o DEC só exige que as duas existam. O `criarPacoteDecisao` usa a ESP mais nova.
- **Nenhum Minor foi elevado.** Razão: nenhum deles deixa dado pessoal sair, grava algo errado ou gasta além do teto;
  todos têm caminho de correção pequeno e dono na cadeia.
- **`proximo: qa-automacao`.** Razão: a revisão não tem bloqueio, e a próxima etapa da cadeia é a `06-T28-testes`.

## Pendências

- **Para a `06-T28-testes` (`qa-automacao`):** os casos de borda que ainda não têm teste:
  - o RSK criado pelo agente de risco quando a demanda já tem ESP dispara a consolidação dentro da transação do worker
    (há o caminho feliz; falta o rollback: a gravação do RSK desfeita leva a execução da consolidação junto);
  - `registrarParaOAgente` quando o estado muda entre a leitura e o disparo (o segundo 409, `entrada.ts:118` e `:119`), por
    exemplo com um teto que cai a zero no meio;
  - a saída do orquestrador que estoura o limite C-36 do agente (`limite_excedido` → `reagendada`, pendente continua
    `aguardando`);
  - `marcarPendenteComoFalha` com a pendente já apagada (convertida) não falha e não cria linha.
- **Para a `07-qa-funcional`:** conferir na T05 da 03 se os `flags` do orquestrador (desvio 5) deveriam aparecer para a
  pessoa. Se sim, volta ao plano, porque a demanda não tem campo para eles.
- **Para a `08-revisao`:** os Minor 1 a 6 desta revisão.
- **Para a T29 (`engenheiro-backend`):** a varredura cobre a execução do orquestrador, que tem `demanda_id` nulo; a
  `pendente` reenfileirada depois da conversão à mão falha com `entrada_nao_encontrada`, sem chamar o provedor (já
  coberto pelo teste da T28 para o primeiro job).
- **Para a T31 (`engenheiro-backend`):** a pendente convertida é apagada na conversão; o expurgo só encontra a
  `aguardando` ou `falhou` vencida. A execução do orquestrador de uma pendente expurgada falha com
  `entrada_nao_encontrada`.
- **Para a T32 e a T33 (`engenheiro-backend`):** scripts que criem demanda, ESP ou RSK passam a fila nas dependências
  (Minor 4).
- **Para a T38 e a T40 (`engenheiro-frontend`):** `listarEntradasPendentes` e `obterEntradaPendente` estão prontas, mas
  não há rota nem Server Action para elas; `agentesEmAndamento` já sai em `GET /api/demandas/:id`.
- Seguem abertos, sem mudança: os quatro Minor da `06-T27-revisao`, os Minor 2 e 3 da `06-T26-revisao`, o Minor de
  `fabianojp06` da `06-T26-testes` e o aviso do undici "Using `patch`".

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — topo fd2a2cd, com b40faaf, 65e687b e fd2a2cd depois de e7288e6
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat e7288e6..fd2a2cd` — 17 arquivos: 15 de código e teste, a entrega e o registro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff e7288e6 fd2a2cd -- src/modules/agentes/gatilhos.ts src/modules/agentes/saida-orquestrador.ts src/modules/demandas/entradas-pendentes.ts src/modules/agentes/executar.ts src/modules/demandas/servico.ts src/modules/especificacoes/servico.ts src/modules/pareceres-risco/servico.ts src/modules/demandas/consultas.ts src/modules/demandas/entrada.ts` — saída longa demais; li os arquivos novos pelo Read e os alterados nos comandos seguintes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff e7288e6 fd2a2cd -- src/modules/agentes/executar.ts src/modules/demandas/servico.ts src/modules/especificacoes/servico.ts src/modules/pareceres-risco/servico.ts src/modules/demandas/consultas.ts` — gatilhos, `agentesEmAndamento` e destino do orquestrador
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff e7288e6 fd2a2cd -- src/modules/demandas/entrada.ts` — modo agente e conversão da pendente
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/demandas` — lista do módulo; a leitura do texto bruto da demanda fica em `texto-recebido.ts`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent=passed-only --reporter=dot` — 125 arquivos, 2547 de 2547
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff e7288e6 fd2a2cd -- src/modules/agentes/executar.test.ts src/modules/agentes/executar.bordas.test.ts src/modules/demandas/consultas.test.ts src/modules/demandas/entrada.test.ts` — só ordem de montagem e as três asserções previstas na `06-T27-revisao`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat --format=%h 65e687b` — só uma linha em `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat --format=%h fd2a2cd` — só a entrega do engenheiro (−5) e uma linha em `passagens.jsonl`

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
