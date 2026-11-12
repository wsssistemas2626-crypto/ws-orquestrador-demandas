---
pedido: DEC-DEM-20261112-0019-v1
etapa: 04-revisao
agente: maestro
leu: [construir.md seção 3, contrato-passagem.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-backend.md, 04-qa-automacao.md, DEC-DEM-20261111-0016-v1/08-maestro.md, git diff main...HEAD --stat]
status: devolvido
proximo: engenheiro-backend
devolvido_para: 04-correcao
---
## Entrega

Revisei o ramo `construcao/DEC-DEM-20261112-0019-v1` contra a `main` (`d49de53`, 0.3.0): 53 arquivos, 3.297 linhas
acrescentadas e 118 removidas.

**Resultado: volta para correção.** As duas revisões não acharam falha nova explorável por quem está de fora da
empresa. Mas a 0.3.1 existe para fechar M-1, M-3 e M-5 antes de emitir os tokens de produção, e três critérios de aceite
do próprio pedido ficaram descumpridos. Classifico os três como **alto**, porque entregar a versão assim seria emitir os
tokens com o furo que ela devia fechar.

### Revisões usadas

1. **Código:** skill `code-review`, nível alto, sobre o ramo contra a `main`. A `code-review:code-review` pede PR, que
   ainda não existe. Saíram 10 achados.
2. **Segurança:** a skill `security-review` revisa o ramo atual da sessão, que é a estruturaAutonoma, e não este
   repositório. Por isso usei a alternativa da seção 3: o agente `seguranca-aplicacao`, com o diff do ramo e as
   entregas 01 e 02, e os achados na resposta. Saíram 1 médio e 3 baixos, nenhum crítico ou alto em si.

## Decisões tomadas

**Altos: critério de aceite do pedido descumprido; a correção é obrigatória**

- **A-1 (M-1 incompleto; segurança MR-1, código 1).** `GET /api/pacotes-decisao`
  (`src/app/api/pacotes-decisao/route.ts:11-18`; `listarPacotes`, `src/modules/pacotes-decisao/consultas.ts:297-310`)
  lista os DEC de todas as demandas sem filtro de visibilidade para agente.
  - Vazamento: com token `risco`, o agente recebe o DEC de uma demanda do Awave não confirmada, com `demandaTitulo`,
    `demandaDescricao`, opções e ESP citada, e o `total` conta esse DEC.
  - Oráculo: o `demandaId` aparece na lista, mas `GET /api/demandas/<id>` responde 404.
  - Correção: passar o ator a `listarPacotes`. Para agente e sistema, juntar `demanda` e pôr `condicaoVisivelAoAgente()`
    no mesmo `onde` dos itens e do `total`, no padrão de `paginaDeDemandas`.
  - Teste de regressão, antes e depois da confirmação, com `statusDecisao`, `limit` e `offset`: o DEC não aparece e o
    `total` não o conta para agente; aparece depois da confirmação por pessoa; a pessoa vê sempre.
  - Confira também se não sobra outra rota de leitura acessível a agente sem a regra, varrendo as ações `ler_*` da
    matriz.
- **A-2 (M-3 incompleto; segurança BR-1, código 2).** Em `src/db/transacao.ts:74-87`, o `set local
  statement_timeout` de `limitarTempo` passa pelo Proxy e devolve o piso por cima do `set_config(restante)`. Como
  `p.aplicado` guarda o valor menor, a instrução seguinte pode rodar com 5 s ou 10 s depois do prazo, e o 503 sai
  depois dos 8 s ou 12 s prometidos.
  - Correção: com prazo, o `comTransacao` aplica `min(piso, restante)` logo depois do BEGIN, direto na conexão, e
    inicializa `p.aplicado` com esse valor. Esse caminho não chama `limitarTempo`. Outra saída: o Proxy volta
    `p.aplicado` ao piso depois de qualquer `set local`.
  - Teste com relógio falso: espera longa pela conexão e o `current_setting` igual ao restante, não ao piso.
- **A-3 (M-5 incompleto; código 4).** Quando a confirmação acontece com o `insumo_tecnico` desligado, o batimento
  reenfileira a execução adiada, e o worker a encerra como `ignorada` (`desligado`). Isso gasta a chave. Quando o CTO
  religa o agente, o insumo dessa demanda nunca roda.
  - Correção: a execução adiada só sai do adiamento por `dispararOuReenfileirar` com o agente ligado. O batimento não
    reenfileira execução adiada cujo agente está desligado. Ou o worker, com o agente desligado, devolve a execução a
    pendente sem gastar a chave, como no adiamento.
  - Teste: adiar, confirmar com o agente desligado, religar, e o insumo roda uma vez.

**Médios: entram na mesma correção, porque o arquivo e o assunto são os mesmos**

- M-a (código 3): `adiarAteConfirmacao` (`src/modules/agentes/executar.ts:272`) decide fora da trava. Se a confirmação
  comitar no meio, a execução fica pendente sem job até o batimento. Conferir de novo sob a trava da demanda, ou
  reenfileirar depois de devolver quando já houver confirmação.
- M-b (código 5): `reenfileirarPendente` (`src/modules/agentes/execucoes.ts:137`) não atualiza `atualizadaEm`, e o
  batimento manda o job em dobro. Atualizar `atualizadaEm` ao reenfileirar.
- M-c (código 7): `condicaoVisivelAoAgente`, em SQL, e `aguardaConfirmacao`, em TS, divergem para `autor_tipo` fora da
  lista (`src/modules/demandas/confirmacao.ts:64`). Os dois têm de falhar fechado do mesmo jeito, com teste de autor
  desconhecido.
- M-d (segurança BR-2): a tela (`src/components/dados-da-confirmacao.ts:49`) aceita qualquer evento
  `demanda_confirmada`, e o servidor só aceita o de pessoa. Usar a mesma regra, com teste.

## Pendências

**Baixos e dívida: não entram nesta correção**

- Código 6: o `statement_timeout` é calculado quando o Proxy recebe a chamada. Instruções em paralelo no mesmo cliente
  (`Promise.all`) recebem cada uma o restante inteiro. Hoje não há uso assim; registrar a regra "sem `Promise.all` em
  transação com prazo".
- Código 8: um `set_config` a mais por instrução quando o restante fica abaixo do piso.
- Código 9: duplicação de `ultimoShaEntregue` com `shasEntregues`, e de `TEMPO_ESGOTADO` entre `transacao.ts` e
  `tempo-limite.ts`.
- Código 10, de arquitetura: a visibilidade do M-1 é chamada à mão em 9 lugares. O certo é centralizar na camada de
  dados ou em `rota()`, numa versão futura. O A-1 mostra o custo disso.
- BR-3 (informativo): os ids sequenciais deixam o agente perceber lacunas e deduzir a existência de uma demanda, sem
  ver o conteúdo. Risco residual, a aceitar com `gestao-riscos` e Fabiano.
- B-7 do 0016, ainda aberto: uma pessoa pode montar ESP, RSK e DEC à mão para uma demanda do Awave não confirmada.
- A revisão de segurança rodou um `git grep`, fora da regra; falhou sem retorno. Fica registrado.

**IN-16, mudanças aprovadas:** registro como "mudança aprovada" pelas decisões P1 a P5 deste pedido, sem afrouxar e
com a regra nova no lugar:
- `criacao-awave.test.ts` (CA-10.6);
- `executar-awave.test.ts` e `gatilhos-awave-qa.test.ts:149`;
- `recebimento-qa`;
- `executar.bordas.test.ts`;
- `origem.test.ts` e `origem-qa.test.ts`;
- `reduzir-erro.test.ts` e `projeto.test.ts` (inventário).

## Critério de pronto atendido

- [x] Revisão de código e de segurança feitas sobre o ramo inteiro, com a revisão usada registrada.
- [x] Altos encontrados: `status: devolvido`, `devolvido_para: 04-correcao`, `proximo: engenheiro-backend` (dono dos
  arquivos pela 02-triagem).
- [x] Médios e baixos classificados: os médios que entram na correção, na seção acima; os que ficam fora, em
  Pendências.
