---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T28-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, 05-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6, T17, T26 a T31, Rastreabilidade), 03-ux-ui-design.md (T04, linhas 345 a 404), 06-T27-engenheiro-backend.md, 06-T27-tech-lead.md, 06-T27-qa-automacao.md, src/modules/agentes/executar.ts, src/modules/agentes/execucoes.ts, src/modules/agentes/entrada-agente.ts, src/modules/agentes/configuracao.ts, src/modules/agentes/teto.ts, src/modules/agentes/schemas.ts, src/modules/agentes/executar.test.ts, src/modules/agentes/executar.bordas.test.ts, src/agents/orquestrador.ts, src/modules/demandas/entrada.ts, src/modules/demandas/entrada.test.ts, src/modules/demandas/servico.ts, src/modules/demandas/consultas.ts, src/modules/demandas/consultas.test.ts, src/modules/demandas/schemas.ts, src/modules/demandas/transicoes.ts, src/modules/demandas/gerar-id.ts, src/modules/especificacoes/servico.ts, src/modules/pareceres-risco/servico.ts, src/modules/historico/registrar.ts, src/modules/historico/consultas.ts, src/modules/acesso/matriz.ts, src/modules/limites.ts, src/modules/versoes.ts, src/db/schema/agentes.ts, src/db/schema/demandas.ts, src/db/privilegios.ts, src/lib/deps.ts, src/lib/fila.ts, src/lib/erros.ts, src/app/api/demandas/entrada/route.ts, test/deps.ts, test/banco.ts, test/provedor-falso.ts, test/sessao.ts, test/requisicao.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T28: gatilhos dos agentes e entrada pelo agente orquestrador. Cobre:

- RF-05 (CA-05.2), RF-15 (perguntas do orquestrador), RF-16 (disparos) e RF-19 (CA-19.2);
- T-01 (entrada pendente), T-03 (`agentesEmAndamento`), C-22 (payload só com id) e C-31 (a pendente existe e é achável).

Esta é a primeira tentativa da etapa.

### Arquivos criados (os 5 do plano)

- `src/modules/agentes/gatilhos.ts`. Interfaces do plano:
  - `dispararSeLigado(t, deps, agente, chaveEntrada, demandaId)`. Agente desligado ou suspenso devolve `false` e não
    cria nada. Agente disponível chama `criarExecucao` (T27), na transação de quem chama, e devolve `true` quando a
    execução foi criada. Se a mesma entrada já tinha execução, devolve `false`;
  - `orquestradorDisponivel(db, relogio)`: o orquestrador está ligado e o teto não suspendeu os agentes.

  Acréscimos:
  - `estadoDoAgente(db, agente, relogio)`, que devolve `desligado`, `suspenso` ou `disponivel`. A entrada usa o estado
    para escolher a mensagem do 409;
  - `ERRO_SEM_FILA` (ver o desvio 2).
- `src/modules/agentes/saida-orquestrador.ts`: `gravarSaidaOrquestrador(t, deps, ator, exec, saida)`, na transação da
  execução:
  1. trava a pendente da chave (`FOR UPDATE`). Se ela não existe mais, lança `nao_encontrado`;
  2. cria a demanda por `criarDemanda`, com o ator agente:
     - passa por `autorizar` e pelo limite C-36;
     - os campos vêm da saída do modelo;
     - o nome e o papel do solicitante vêm da pendente, e os anexos começam vazios;
  3. copia o texto original, a origem e o `recebida_em` da pendente para `entrada_bruta` e apaga a pendente;
  4. grava `perguntasParaSolicitante` em `duvidas_entrada`. Se houver pergunta, chama
     `mudarStatusPeloSistema('duvida_em_aberto')`.
- `src/modules/demandas/entradas-pendentes.ts`. Interfaces do plano:
  - `EntradaPendenteResumo` e `listarEntradasPendentes(db)`: da mais nova para a mais antiga, sem texto, origem nem
    nome;
  - `obterEntradaPendente(deps, ator, id)`: só pessoa, por `autorizar('ler_texto_bruto')`. Id fora do formato UUID ou
    que não existe dá 404 sem consulta.

  Acréscimos, usados pela entrada e pelo agente:
  - `chaveDaPendente`, `pendenteDaChave`, `travarEntradaPendente` e `converterEntradaPendente`;
  - `marcarPendenteComoFalha`.
- `src/modules/agentes/gatilhos.test.ts`: 12 testes.
- `src/modules/agentes/saida-orquestrador.test.ts`: 26 testes.

### Arquivos alterados (os 6 do plano, mais 4 testes)

- `src/modules/demandas/servico.ts`:
  - `criarDemanda` dispara o `insumo_tecnico` com a chave `demanda:<id>`, na mesma transação;
  - tipo novo `DepsComFila` (ver o desvio 2).
- `src/modules/especificacoes/servico.ts`: a ESP sem dúvida dispara o `risco` com a chave `esp:<id>`. A ESP com dúvida
  segue para `aguardando_informacao`, sem disparar nada.
- `src/modules/pareceres-risco/servico.ts`: o RSK dispara a `consolidacao` com a chave `rsk:<id>` quando a demanda já
  tem alguma ESP.
- `src/modules/demandas/entrada.ts`:
  - **modo agente.** Com o orquestrador desligado, 409 com a mensagem da T17. Com o orquestrador suspenso, 409 com a
    mensagem nova `MENSAGEM_ORQUESTRADOR_SUSPENSO`, que é o texto da 03 (T04): "Agentes suspensos pelo teto de gasto.
    Preencha os campos abaixo.". Com o orquestrador disponível, numa transação só:
    - grava a pendente (`aguardando`, `registrada_por` com o id da pessoa);
    - cria a execução `entrada:<uuid>`, com `demanda_id` nulo, e o job;
    - devolve `{ tipo: 'pendente', entradaId }`. A rota já respondia 202 para esse caso;
  - **manual com `entradaPendenteId`.** Trava a pendente antes de gerar o id da demanda. Cria a demanda com os campos do
    formulário e converte a pendente: o texto, a origem e a data vêm da pendente, e a pendente é apagada.
- `src/modules/demandas/consultas.ts`: `DemandaVista.agentesEmAndamento` lista as execuções `pendente` ou
  `em_andamento` da demanda, lidas de `execucao_agente` (T-03).
- `src/modules/agentes/executar.ts`:
  - `DESTINOS.orquestrador` usa `gravarSaidaOrquestrador`, e o `schema` desse destino é o mesmo objeto de
    `SCHEMA_DE_SAIDA.orquestrador`;
  - `falhar()` marca a pendente como `falhou`, e `ignorar()` também (ver o desvio 1).
- Testes existentes que mudaram (ver o desvio 3):
  - `src/modules/agentes/executar.test.ts`:
    - os três testes que a `06-T27` previu;
    - o `beforeEach`;
    - a ordem de criação no teste da ESP recusada;
  - `src/modules/agentes/executar.bordas.test.ts`: o `beforeEach` e a criação da ESP v2 num teste;
  - `src/modules/demandas/consultas.test.ts`: `agentesEmAndamento: []` no objeto esperado;
  - `src/modules/demandas/entrada.test.ts`: o título de dois testes perdeu o "até a T28". A asserção não mudou.

### Testes criados (38 novos)

| Arquivo | Testes | O que prova |
|---|---|---|
| `gatilhos.test.ts` | 12 | **Os 5 do plano**, com corpo: CA-19.2, o insumo técnico ligado (execução `demanda:<id>`, job só com `{ execucaoId }` e a chave `…:t1`), a ESP com dúvida contra a ESP sem dúvida, o RSK com ESP contra o RSK sem ESP, e a suspensão pelo teto (teto 0 e gasto igual ao teto). **Mais:** o rollback da demanda leva junto a execução e o job (ADR-06); o risco desligado não dispara; uma ESP com dúvida já conta como "ESP na demanda" para a consolidação; os três estados de `estadoDoAgente` e `orquestradorDisponivel`; `dispararSeLigado` é idempotente; dependências sem fila; a cadeia inteira pelo worker (o insumo grava a ESP, que dispara o risco, cujo RSK dispara a consolidação) |
| `saida-orquestrador.test.ts` | 26 | **Os 8 do plano**, com corpo: CA-05.2; o nome e o papel vêm da pessoa, nunca do provedor; a `entrada_bruta` guarda o texto original e a pendente some; as perguntas levam a `aguardando_informacao` sem mensagem (nenhum `aviso_email` e nenhum job além do de agente); 3 falhas deixam a pendente `falhou` e listada; preencher à mão a partir da pendente; 409 com o agente desligado e 202 com `entradaId`; T-03. **Mais:** a pendente com todos os campos, a execução sem demanda e o job (C-22); o 409 de suspensão (serviço e rota); um agente como ator dá `sem_permissao`; o orquestrador tem destino com o schema da saída; o provedor recebe o texto sem nome, e-mail nem telefone; a demanda do orquestrador dispara o insumo técnico; o mesmo job duas vezes cria uma demanda só; a pendente aparece `aguardando` antes de falhar; desligado ou teto atingido com o job na fila deixam a pendente `falhou`; a ordem da lista; `obterEntradaPendente` (leitura, agente e id inválido); a pendente não converte duas vezes; convertida à mão antes do agente, o provedor não é chamado; convertida à mão durante a chamada, o agente não grava uma segunda demanda; C-21 com o log do caminho inteiro sem sentinela |

### TDD: os testes foram escritos antes e vistos falhando

Comando: `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/agentes/gatilhos.test.ts src/modules/agentes/saida-orquestrador.test.ts`.
Rodou antes de qualquer código da tarefa. Trecho da saída:

```
 FAIL  src/modules/agentes/gatilhos.test.ts [ src/modules/agentes/gatilhos.test.ts ]
Error: Cannot find module './gatilhos' imported from .../src/modules/agentes/gatilhos.test.ts
 FAIL  src/modules/agentes/saida-orquestrador.test.ts [ src/modules/agentes/saida-orquestrador.test.ts ]
Error: Cannot find module '../demandas/entradas-pendentes' imported from .../src/modules/agentes/saida-orquestrador.test.ts
 Test Files  2 failed (2)
      Tests  no tests
```

### Resultado

- Os dois arquivos novos: 38 de 38.
- `pnpm test`: 125 arquivos e **2547 de 2547**, nenhum falhou. Eram 2509 depois da `06-T27-testes`; a tarefa somou 38.
  O aviso do undici "Using `patch`" continua igual.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git status`: os 5 arquivos novos e os 10 alterados listados acima. Nenhum outro arquivo mudou.

### Desvios do plano

1. **A execução ignorada do orquestrador também deixa a pendente como `falhou`.** O plano só manda marcar na falha
   final.
   - A execução é única por entrada, então uma execução ignorada (agente desligado, teto ou falta de chave) não roda de
     novo.
   - Se a pendente ficasse `aguardando`, a fila diria "aguardando o agente" para sempre.
   - Com `falhou`, ela aparece para a pessoa preencher à mão, como na T04 da 03.
   - Dois testes cobrem o caso: agente desligado e teto atingido.
2. **A fila é opcional no tipo das dependências dos serviços.** O tipo é
   `DepsComFila = DepsDemanda & Partial<Pick<Deps, 'fila'>>`.
   - Vários arquivos de teste montam `{ db, pool, relogio }` sem fila para chamar `criarDemanda`,
     `criarEspecificacao` e `criarParecerRisco`. Entre eles estão `pareceres.test.ts`, `especificacoes/servico.test.ts`,
     `pacotes-decisao/concorrencia.test.ts` e `pacotes-decisao/consultas.test.ts`; a saída do typecheck saiu cortada.
     Com a fila obrigatória, o typecheck quebrava em todos eles.
   - A fila só faz falta com o agente disponível. Nesse caso, sem fila, `dispararSeLigado` lança `ERRO_SEM_FILA`, a
     transação é desfeita e nada é gravado. Assim, nunca se deixa de disparar em silêncio.
   - Rota, Server Action e worker (`DepsAgente`) sempre têm a fila.
   - Um teste prova os dois lados: sem fila, a gravação funciona com o agente desligado e falha com ele ligado.
   - `dispararSeLigado` recebe `Pick<Deps, 'relogio'>` com a fila opcional, e não `Deps`. É o mesmo tipo de desvio
     aceito na T27.
3. **Quatro arquivos de teste existentes mudaram.** A ordem de criação mudou e nenhuma asserção ficou mais fraca.
   - Desde a T28, uma ESP sem dúvida criada com o risco ligado já cria a execução `esp:<id>`. Por isso o
     `novaExecucao()` dos testes da T27 devolvia `null`, e 51 testes falharam.
   - O `beforeEach` de `executar.test.ts` e de `executar.bordas.test.ts` agora cria a demanda e a ESP antes de ligar o
     risco. Três testes também criam a demanda, o RSK ou a ESP v2 antes de ligar o agente.
   - Três testes de `executar.test.ts` mudaram de asserção, como a `06-T27` previu, porque agora o orquestrador tem
     destino:
     - a lista de `DESTINOS`;
     - "cada agente tem destino";
     - "orquestrador sem destino" virou "orquestrador com pendente inexistente", com o motivo `entrada_nao_encontrada`.
   - `consultas.test.ts` ganhou `agentesEmAndamento: []` no objeto esperado.
4. **Com `entradaPendenteId`, o `texto` e a `origem` do corpo são ignorados.** O que fica guardado é o que chegou na
   pendente, e o prazo de retenção conta da data dela. Um teste prova que um "outro texto" mandado no corpo não é
   gravado.
5. **Os avisos (`flags`) da saída do orquestrador não são gravados.** A demanda não tem campo para eles, e o plano não
   diz onde guardá-los. O schema os valida e eles são descartados.
6. **Acréscimos exportados.** `estadoDoAgente`, `ERRO_SEM_FILA`, `MENSAGEM_ORQUESTRADOR_SUSPENSO`, `EntradaAgente`,
   `AgenteEmAndamento` e as funções de apoio de `entradas-pendentes.ts` são aditivos. Nenhuma assinatura do plano mudou
   além das do desvio 2.

## Decisões tomadas

- **O gatilho roda dentro da transação do artefato que o dispara.** Razão: a execução e o job somem junto com o rollback
  (ADR-06), e um teste prova isso.
- **`dispararSeLigado` confere o interruptor e o teto, mas não o preço nem a chave.** Razão: o app não lê a chave
  (C-27), e o interruptor só liga com preço vigente (T23). A execução (T27) confere tudo de novo antes de chamar o
  provedor.
- **No modo agente, o estado é lido antes de gravar a pendente.** Razão: o 409 sai sem gravar nada e com a mensagem
  certa (desligado ou suspenso). Se o estado mudar entre as duas leituras, `dispararSeLigado` devolve `false`, e a
  transação é desfeita com 409.
- **A pendente é travada (`FOR UPDATE`) pelo agente e pela pessoa antes de criar a demanda.** Razão: assim ela não é
  convertida duas vezes. Quem chega depois recebe `nao_encontrado`. No agente, isso cai em `recusada_pelo_servico`, sem
  segunda demanda; o teste de "convertida durante a chamada" prova isso.
- **O RSK dispara a consolidação com qualquer ESP na demanda, mesmo a que tem dúvida.** Razão: o plano diz "RSK com ESP
  na demanda". O DEC só exige que as duas existam.
- **A entrada pendente é gravada como chegou**, com o trim do `entradaAgenteSchema` da T17. Razão: o que vai à
  `entrada_bruta` é o original, e só a cópia ao provedor é minimizada (T24).
- **O log não ganhou evento novo para o disparo.** Razão: o disparo roda dentro de uma transação que pode ser desfeita,
  e uma linha de log ali poderia registrar um disparo que não aconteceu. A execução já registra cada resultado.

## Pendências

- **Para a T29 (`engenheiro-backend`):** a varredura também cobre a execução do orquestrador, que tem `demanda_id`
  nulo. Se a pendente for expurgada (T31) com a execução ainda pendente, a execução falha com `entrada_nao_encontrada`,
  sem chamar o provedor.
- **Para a T31 (`engenheiro-backend`):** a pendente convertida é apagada na conversão. Só fica para o expurgo a que
  continua `aguardando` ou `falhou` depois do prazo.
- **Para a T38 e a T40 (`engenheiro-frontend`):**
  - `listarEntradasPendentes` e `obterEntradaPendente` estão prontas para a fila e para "preencher à mão";
  - `agentesEmAndamento` já sai em `GET /api/demandas/:id`;
  - ainda não existe rota nem Server Action para listar ou ler a pendente. Fica para quem faz a tela, sobre estas
    funções.
- **Para a `08-revisao`, só registro:**
  - `RE_UUID` agora está repetido em três módulos (`execucoes.ts`, `entrada-agente.ts` e `entradas-pendentes.ts`). Ele
    pode virar um só em `src/lib`;
  - o comentário de `src/app/api/demandas/entrada/route.ts` ainda diz "a partir da T28 (até lá, 409…)". O código da
    rota não mudou e já responde 202. O arquivo ficou fora para não sair da lista da tarefa;
  - o modo agente não tem limite por hora próprio (C-36 conta demandas, e a pendente não é demanda). O gasto continua
    preso ao teto, e cada demanda que o orquestrador cria conta no limite dele.
- Seguem abertos, sem mudança: os quatro Minor da `06-T27-revisao`, os Minor 2 e 3 da `06-T26-revisao`, o Minor de
  `fabianojp06` da `06-T26-testes` e o aviso do undici "Using `patch`".

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/agentes/gatilhos.test.ts src/modules/agentes/saida-orquestrador.test.ts` — antes do código: 2 arquivos sem módulo, nenhum teste rodou
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — 1ª vez: erros em arquivos de teste que montam deps sem fila (deu origem ao desvio 2)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/agentes/gatilhos.test.ts src/modules/agentes/saida-orquestrador.test.ts` — depois do código: 38 de 38
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent=passed-only --reporter=dot` — falhas em `executar.test.ts` e `executar.bordas.test.ts` (setup com o risco ligado); a contagem final saiu cortada
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=dot --hideSkippedTests src/modules/agentes src/jobs` — 51 falharam, todos de setup (desvio 3)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=dot src/modules/agentes src/jobs` — 308 de 309; faltava a ESP v2 de um teste de `executar.bordas.test.ts`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=dot` — 2546 de 2547; faltava `agentesEmAndamento` no esperado de `consultas.test.ts`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=dot` — 125 arquivos, 2547 de 2547
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 5 arquivos novos e 10 alterados, os da Entrega

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real (dados fictícios e sentinelas de `test/sentinelas.ts`; teste de log do caminho inteiro sem sentinela)
- [x] só mudaram os arquivos da tarefa (mais os quatro arquivos de teste do desvio 3, todos por causa do comportamento novo)
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (a entrada vem do `entradaSchema` da T17; a saída do orquestrador passa pelo `saidaOrquestradorSchema` antes de gravar; o 409 e o 404 levam só a mensagem da tela)
