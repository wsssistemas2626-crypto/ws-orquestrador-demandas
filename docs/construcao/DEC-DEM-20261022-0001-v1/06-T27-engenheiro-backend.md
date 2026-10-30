---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T27-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, passagens.jsonl, 05-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6, T26 a T29), 02-arquiteto-solucoes.md (seção 8), 03-ux-ui-design.md (seção 2.6), 06-T23-engenheiro-backend.md, 06-T24-engenheiro-backend.md, 06-T24-tech-lead.md, 06-T25-engenheiro-backend.md, 06-T25-tech-lead.md, 06-T25-qa-automacao.md, 06-T26-engenheiro-backend.md, 06-T26-tech-lead.md, 06-T26-qa-automacao.md, src/db/schema/agentes.ts, src/db/schema/index.ts, src/db/index.ts, src/db/transacao.ts, drizzle/0005_rls_privilegios_agentes.sql, src/lib/fila.ts, src/lib/fila.test.ts, src/lib/deps.ts, src/lib/erros.ts, src/lib/log.ts, src/lib/log.test.ts, src/lib/sentry.ts, src/lib/reduzir-erro.ts, src/lib/relogio.ts, src/modules/acesso/ator.ts, src/modules/acesso/matriz.ts, src/modules/agentes/provedor.ts, src/modules/agentes/entrada-agente.ts, src/modules/agentes/uso.ts, src/modules/agentes/teto.ts, src/modules/agentes/configuracao.ts, src/modules/agentes/configuracao.test.ts, src/modules/agentes/preco.ts, src/modules/agentes/schemas.ts, src/agents/index.ts, src/agents/comum.ts, src/agents/risco.ts, src/agents/insumo-tecnico.ts, src/agents/prompts.test.ts, src/modules/especificacoes/servico.ts, src/modules/especificacoes/servico.test.ts, src/modules/pareceres-risco/servico.ts, src/modules/pareceres-risco/consultas.ts, src/modules/pacotes-decisao/criar.ts, src/modules/demandas/servico.ts, src/modules/demandas/consultas.ts, src/modules/demandas/schemas.ts, src/modules/historico/registrar.ts, src/modules/historico/consultas.test.ts, src/modules/limites.ts, src/modules/versoes.ts, test/banco.ts, test/deps.ts, test/provedor-falso.ts, test/sentinelas.ts, vitest.config.ts, eslint.config.mjs]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T27: execução de agente idempotente, com teto, interruptor e novas tentativas. Cobre:

- RF-16: CA-16.1 a CA-16.4;
- RF-17: CA-17.1 e CA-17.2;
- RF-18: CA-18.1 e CA-18.3;
- RF-19: CA-19.4;
- RNF-06, RNF-07, C-12 (no worker), C-25, C-26, ADR-06, ADR-07 e P1-e.

Esta é a primeira tentativa da etapa.

### Arquivos criados (os 6 do plano e mais 1)

- `src/modules/agentes/espera.ts`
  - `TENTATIVAS_MAXIMAS = 3`.
  - `esperaAntesDaTentativa(n)`: 30.000 ms para n = 2 e 120.000 ms para n = 3. Qualquer outro n lança `RangeError`.
- `src/modules/agentes/execucoes.ts`. Interfaces do plano:
  - `ExecucaoAgente`;
  - `criarExecucao(t, deps, e)`: faz `insert … on conflict (agente, chave_entrada) do nothing returning id`. Só quando a
    linha entra, envia `agente.executar { execucaoId }` pelo executor da mesma transação, com `singletonKey`
    `<agente>:<chave>:t1`. Se a execução já existe, devolve `null`;
  - `reivindicar(db, id, relogio)`: o `UPDATE` condicional da ADR-07, com `RETURNING *`.

  Acréscimos:
  - `TRAVA_MS = 150_000`;
  - `ExecucaoPerdida`;
  - `chaveDoJob`;
  - `confirmarPosse`, `encerrar` e `reagendar`: as mudanças de estado depois da reivindicação. As três são guardadas
    pela condição (id, `em_andamento`, mesmo número de tentativas).
- `src/modules/agentes/executar.ts`. Interfaces do plano:
  - `DepsAgente`, `DestinoDoAgente` e `ResultadoExecucao`;
  - `DESTINOS`: `insumo_tecnico` → `criarEspecificacao`, `risco` → `criarParecerRisco`, `consolidacao` →
    `criarPacoteDecisao`. Os três gravam com `extras.execucaoAgenteId`, e o `schema` de cada destino é o mesmo objeto de
    `SCHEMA_DE_SAIDA`;
  - `executarAgente(deps, id)`.
- `src/jobs/agente-executar.ts`: `tratarAgenteExecutar(deps, jobs)`.
  - Lê `{ execucaoId }` com o schema da própria fila. Payload fora dele vai ao log como `agente_payload_invalido`, sem o
    conteúdo, e não chega à execução.
  - Chama `executarAgente` para cada job do lote, um de cada vez.
  - Em erro inesperado: log com o erro reduzido e `capturarErro`. O erro não é relançado, e o job seguinte do lote
    ainda roda.
- Testes: `espera.test.ts`, `executar.test.ts` e `src/jobs/agente-executar.test.ts` (este fora da lista, ver o desvio 4).

### Arquivos existentes alterados (ver desvios 3 e 5)

- `src/lib/fila.ts`: `PAYLOADS` passou a ser exportado (uma palavra e um comentário).
- `src/agents/insumo-tecnico.ts`: uma frase na regra do `sistemaAlvo`. É o Minor 1 da `06-T26-revisao`, que a revisão
  deixou para a T27.
- `src/agents/prompts.test.ts`: um teste novo, para essa frase.

### Como `executarAgente` funciona (ordem do plano, 02, seção 8)

1. **`reivindicar`.** Se nada voltou, o resultado é `ja_tratada`, sem chamar o provedor.
2. **Mais de 3 tentativas.** Acontece quando o worker caiu no meio da 3ª e a trava venceu. Resultado: `falhou` com
   motivo `tentativas_esgotadas`, sem chamar o provedor.
3. **Agente sem destino.** Hoje é só o orquestrador, até a T28. Resultado: `falhou` com motivo `sem_destino`, sem
   chamar o provedor.
4. **Interruptor, preço e provedor.** Agente desligado, modelo sem preço vigente ou provedor ausente: `ignorada` mais o
   evento `agente_ignorado`, com motivo `desligado`, `sem_preco` ou `sem_provedor` (CA-19.4).
5. **Teto.** Se `situacaoDoTeto(...).suspenso`: `ignorada` mais o evento `suspensao_por_teto` (CA-18.1, CA-18.3).
6. **Entrada.** `montarEntrada` (T24) e `PROMPTS[agente]` (T26). Se der `nao_encontrado`: `falhou` com motivo
   `entrada_nao_encontrada`, sem chamar o provedor nem registrar uso.
7. **Chamada.** `provedor.gerar({ modelo, sistema, conteudo, maxTokens })`, fora de qualquer transação.
8. **Leitura da resposta.**
   - Tokens que não são inteiros, ou texto que não é texto: uso `erro` com 0 token e nova tentativa.
   - Depois, `JSON.parse` (sem a cerca de bloco de código, se houver) e `SCHEMA_DE_SAIDA[agente].safeParse`.
9. **Saída válida.** Numa transação: `confirmarPosse` (`FOR UPDATE`), `DESTINOS[agente].gravar` com o ator
   `{ tipo: 'agente', agente, prefixoToken: null }` (o serviço chama `autorizar`) e `encerrar('concluida', artefatoId)`.
10. **Nova tentativa ou falha.**
    - Saída inválida, recusa do serviço com `entrada_invalida`, `ErroProvedor('transitorio')`, resposta fora do envelope
      ou `limite_excedido`:
      - com `tentativas < 3`: volta a `pendente`, com `proxima_tentativa_em = agora + esperaAntesDaTentativa(n + 1)`, e
        envia um job novo com o mesmo `startAfter` e a `singletonKey` `…:t<n+1>`, na mesma transação;
      - na 3ª tentativa: `falhou` mais o evento `falha_agente`, que leva só `{ agente, tentativas, motivo }`.
    - `ErroProvedor('autenticacao')` ou erro que não é do provedor: `falhou` na hora, com `capturarErro`.
11. **Linha de uso.** Toda chamada feita deixa uma linha de uso, em transação própria, gravada depois que o resultado é
    conhecido. Os resultados são:
    - `sucesso`: gravou o artefato;
    - `fora_do_schema`: o schema ou a regra do serviço recusou a saída;
    - `erro`: falhou a chamada, ou nada foi gravado por outro motivo.

    O custo é `calcularCusto` com o preço vigente quando a execução foi reivindicada. O modelo gravado é o ligado no
    agente, que é o do preço.

### Testes criados (52 novos)

| Arquivo | Testes | O que prova |
|---|---|---|
| `espera.test.ts` | 7 | O do plano (P1-e: 30 s, 2 min e 4ª lança erro). Mais 6 casos sem espera: tentativa 1, 0, −1, 2,5, NaN e infinito |
| `executar.test.ts` | 38 | **Os 11 do plano, todos com corpo:** CA-16.1, CA-17.1, CA-16.2 com CA-17.2, CA-16.3, CA-16.4, CA-18.1, CA-18.3, CA-19.4, sem provedor, C-25 e 401. **`criarExecucao`:** job só com `{ execucaoId }` e a chave `…:t1`; mesma entrada dá `null` sem 2ª linha nem 2º job; rollback leva execução e job juntos (ADR-06). **`reivindicar`:** trava de 150 s; trava valendo bloqueia e trava vencida libera; pendente antes da hora não é reivindicada; `concluida`, `falhou` e `ignorada` não são reivindicadas; id inexistente ou fora do formato dá `null`. **Mais da execução:** a chamada leva o prompt, o `maxTokens`, o modelo e a entrada minimizada; os três destinos gravam ESP, RSK e DEC; cerca de bloco de código; ESP recusada pela regra de construção conta como saída inválida; CA-16.4 com as duas execuções ao mesmo tempo; trava vencida durante a chamada (o primeiro worker não grava um 2º RSK, e as duas chamadas ficam no uso); reivindicada depois da 3ª tentativa; gasto logo abaixo do teto ainda chama; modelo sem preço; erro transitório com tokens; `TypeError` (falha imediata, Sentry, log sem a mensagem); `RangeError` sem linha de uso; resposta 200 fora do envelope; entrada que não existe; orquestrador sem destino; C-21 (nenhuma linha de log com o sentinela nem o modelo) |
| `src/jobs/agente-executar.test.ts` | 6 | Lote chamado na ordem, com o resultado no log. 4 payloads inválidos (chave a mais com sentinela, id fora do formato, vazio, nulo) não chegam à execução, e o log fica sem o conteúdo. Erro inesperado: log reduzido, Sentry uma vez, sem relançar, e o job seguinte ainda roda |
| `src/agents/prompts.test.ts` | +1 | O prompt do insumo técnico diz que propor o `sistemaAlvo` é a única exceção à regra de não inventar sistema, e os outros três prompts não dizem isso |

### TDD: os testes foram escritos antes e vistos falhando

Comando: `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/agentes/espera.test.ts src/modules/agentes/executar.test.ts src/jobs/agente-executar.test.ts src/agents/prompts.test.ts`.
Rodou antes de qualquer código da tarefa. Trecho da saída:

```
 FAIL  src/jobs/agente-executar.test.ts [ src/jobs/agente-executar.test.ts ]
Error: Cannot find module '/src/modules/agentes/executar' imported from .../src/jobs/agente-executar.test.ts
 FAIL  src/modules/agentes/espera.test.ts [ src/modules/agentes/espera.test.ts ]
Error: Cannot find module './espera' imported from .../src/modules/agentes/espera.test.ts
 FAIL  src/modules/agentes/executar.test.ts [ src/modules/agentes/executar.test.ts ]
Error: Cannot find module '/src/modules/agentes/execucoes' imported from .../src/modules/agentes/executar.test.ts
 FAIL  src/agents/prompts.test.ts > regras de cada agente > insumo técnico: propor o sistemaAlvo é dito como a única exceção à regra de não inventar sistema (Minor 1 da 06-T26-revisao)
AssertionError: expected 'Você é o agente de Insumo Técnico, co…' to match /sistemaAlvo[^\n]*única exceção à reg…/i
 Test Files  4 failed (4)
      Tests  1 failed | 55 passed (56)
```

### Resultado

- T27 isolada, nos 4 arquivos: 107 de 107.
- `pnpm test`: 122 arquivos e **2491 de 2491**, nenhum falhou. Eram 2439 depois da `06-T26-testes`; a tarefa somou 52.
  O aviso do undici "Using `patch`" segue igual, aberto desde a `06-T23-revisao`.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git status`: os 7 arquivos novos e os 3 alterados listados acima. Nenhum outro arquivo mudou.

### Desvios do plano

1. **`DepsAgente = Pick<Deps, 'db' | 'pool' | 'relogio' | 'fila'> & { provedor }`, e não `Deps & { provedor }`.**
   - O worker não precisa montar Better Auth para executar agente.
   - Quem tem `Deps` passa sem mudança.
   - É o mesmo desvio aceito com `DepsDemanda` de T18 a T23.
   - Pelo mesmo motivo, `criarExecucao` recebe `Pick<Deps, 'fila' | 'relogio'>`.
2. **`reivindicar` também exige `proxima_tentativa_em` nula ou vencida para a execução `pendente`.** Sem isso, um job da
   tentativa anterior entregue de novo faria a próxima tentativa paga antes da espera de P1-e. A varredura da T29
   reenfileira só a pendente vencida, então a regra não a atrapalha. Um teste prende o caso.
3. **`PAYLOADS` exportado de `src/lib/fila.ts`.** O plano manda o handler ler o payload "com o schema da fila". Exportar
   evita escrever de novo o schema no handler, o que seria duplicação.
4. **Teste do handler em `src/jobs/agente-executar.test.ts`.** O plano não lista teste para o handler, mas ele tem
   comportamento próprio: recusar payload, reduzir o erro e não relançar.
5. **Minor 1 da `06-T26-revisao` resolvido aqui, com um teste.** A revisão o deixou para a T27. Ele fica em
   `src/agents/insumo-tecnico.ts`, uma frase, e `src/agents/prompts.test.ts`, um teste. Os 55 testes da T26 e os 75 da
   `06-T26-testes` continuam passando sem mudança.
6. **Acréscimos exportados.** `TRAVA_MS`, `ExecucaoPerdida`, `chaveDoJob`, `confirmarPosse`, `encerrar`, `reagendar` e
   `ResultadoExecucao` são aditivos. Nenhuma assinatura do plano mudou.

## Decisões tomadas

- **Toda mudança de estado depois da reivindicação é guardada por (id, `em_andamento`, tentativas).** Assim, o worker
  cuja trava venceu e que outro reivindicou não grava artefato, não reagenda e não marca falha. Ele recebe
  `ExecucaoPerdida`, a transação dele é desfeita e o resultado é `ja_tratada`. Na gravação, o `FOR UPDATE` vem antes do
  serviço, e quem perdeu a execução nem chega a gravar.
- **A linha de uso é gravada depois de o resultado ser conhecido, em transação própria, e não logo depois da chamada.**
  Assim, uma ESP recusada pelo serviço aparece como `fora_do_schema`, e não como `sucesso`. O custo: se o processo cair
  entre a resposta do provedor e essa linha (inclui a transação da gravação, poucos milissegundos), uma chamada fica
  sem uso. Isso está em Pendências para a 08.
- **Os resultados de uso seguem uma regra fechada:**
  - `sucesso`: gravou o artefato;
  - `fora_do_schema`: o schema ou a regra do serviço recusou a saída;
  - `erro`: falhou a chamada, ou nada foi gravado por outro motivo (inclui a execução perdida e o `limite_excedido`).
- **`RangeError` não gera linha de uso.** O provedor o lança antes de chamar (T25), então não houve chamada. A execução
  falha sem nova tentativa e vai ao Sentry: é erro de programação.
- **Erro que não é `ErroProvedor` falha na hora, com uso `erro` e Sentry.** É o caso do `TypeError` de resposta
  malformada (pendência da `06-T25-testes`). Uma resposta que resolve com tokens que não são inteiros conta como erro
  transitório, com uso de 0 token, e não deixa o `RangeError` de `registrarUso` escapar.
- **Recusa do serviço depois de o schema passar:**
  - `entrada_invalida` conta como saída inválida e tem nova tentativa (pendência da T26);
  - `limite_excedido` (C-36) é transitório e tem nova tentativa;
  - qualquer outro `ErroDominio` faz falhar, com motivo `recusada_pelo_servico`.
- **Eventos:**
  - `falha_agente` tem o ator agente sem token, como o teste da T12 já prevê;
  - `agente_ignorado` e `suspensao_por_teto` têm o ator `sistema`, porque o agente não chegou a agir;
  - os três usam `entidade: 'execucao_agente'`, o id da execução e o `demanda_id` dela, e aparecem no histórico da
    demanda;
  - `depois` leva só enumeração e número (`agente`, `motivo`, `tentativas`), sem texto (C-30).
- **O handler não relança o erro inesperado.** O pg-boss gravaria a mensagem do erro no próprio job, e ela pode trazer
  dado. A execução presa em `em_andamento` volta pela varredura da T29 quando a trava vence.
- **Cerca de bloco de código tirada antes do `JSON.parse`.** O prompt pede JSON puro, mas o modelo às vezes envolve a
  resposta em ```` ```json ````. Tirar a cerca evita uma tentativa paga a mais. O schema continua decidindo tudo.
- **O log usa `codigoErro` para o motivo e `status` para o resultado.** São campos que já estão na lista de permissão. O
  modelo não vai ao log.

## Pendências

- **Para o maestro: um comando de leitura fora da lista Pode.** Rodei por engano
  `git -C <repo> grep -n -e agente_ignorado -e suspensao_por_teto -e falha_agente -- docs src test`, só leitura, para
  achar os nomes dos eventos. Está em "Comandos executados". Não alterou nada, e nenhuma decisão depende só dele: os
  mesmos nomes estão em `src/modules/historico/registrar.ts` e no plano, que li pelo Read.
- **Para a T28 (`engenheiro-backend`):**
  - Ao pôr o destino do orquestrador em `DESTINOS`, três testes de `executar.test.ts` mudam junto: `agente sem destino
    nesta versão (orquestrador, até a T28)`, `cada agente da lista tem prompt e schema; só os três de artefato têm
    destino` e a lista de chaves de `DESTINOS` em `insumo_tecnico grava a ESP…`.
  - `DESTINOS` está congelado: a T28 edita o literal.
  - A "falha final marca a pendente como falhou" entra em `falhar()`.
  - `criarExecucao` recebe só `fila` e `relogio`, então `dispararSeLigado` pode passar as `Deps` da rota.
- **Para a T29 (`engenheiro-backend`):**
  - Registrar `tratarAgenteExecutar(deps, jobs)` com `localConcurrency: 1`.
  - A T27 não passa `sinal` ao provedor (Minor 1 da `06-T25-revisao`). Se a T29 abortar a chamada no `SIGTERM`, o
    abort vira `ErroProvedor('transitorio')` e conta como tentativa. A sugestão é parar o worker sem abortar a chamada
    em curso.
  - A varredura deve reenfileirar com a `singletonKey` da tentativa corrente.
- **Para a `08-revisao` (`seguranca-aplicacao`), só registro:**
  - existe uma janela de milissegundos entre a resposta do provedor e a linha de uso, em que uma queda do processo
    deixa a chamada sem uso (RNF-07 tolera uma chamada acima do teto);
  - a resposta 200 que resolve fora do envelope agora é tratada aqui, mas o `ProvedorAnthropic` continua sem conferir o
    envelope (Minor da `06-T25-testes`).
- Seguem abertos, sem mudança: os Minor 2 e 3 da `06-T26-revisao`, o Minor de `fabianojp06` da `06-T26-testes` e o aviso
  do undici "Using `patch`".

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h%x20%s --diff-filter=A` — arquivos criados em cada commit do ramo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e agente_ignorado -e suspensao_por_teto -e falha_agente -- docs src test` — FORA da lista Pode, só leitura, rodado por engano (ver Pendências)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat HEAD` — vazio, antes de qualquer mudança
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/agentes/espera.test.ts src/modules/agentes/executar.test.ts src/jobs/agente-executar.test.ts src/agents/prompts.test.ts` — antes do código: 3 arquivos sem módulo e 1 teste falhou, 55 passaram
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/agentes/espera.test.ts src/modules/agentes/executar.test.ts src/jobs/agente-executar.test.ts src/agents/prompts.test.ts` — depois do código: 107 de 107
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent=passed-only --reporter=dot` — 122 arquivos, 2491 de 2491
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 7 arquivos novos e 3 alterados, os da Entrega

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real (dados fictícios e sentinelas de `test/sentinelas.ts`; teste de log com sentinela)
- [x] só mudaram os arquivos da tarefa (mais `fila.ts`, `insumo-tecnico.ts`, `prompts.test.ts` e o teste do handler, nos desvios 3, 4 e 5)
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (o job lê o payload com o schema Zod da fila; a saída do provedor passa pelo schema da rota; o erro vai reduzido ao log e ao Sentry)
