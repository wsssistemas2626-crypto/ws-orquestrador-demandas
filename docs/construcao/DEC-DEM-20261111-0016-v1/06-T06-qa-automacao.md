---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T06-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G7, T05 passo 3, T06), 01-analista-requisitos.md (RF-01 a RF-12), 06-T06-engenheiro-backend.md, 06-T06-tech-lead.md, diff da construção f19c224..f40e2a7, src/app/api/demandas/criacao-awave.test.ts, src/app/api/demandas/contrato-awave.test.ts, src/modules/demandas/servico.test.ts, src/modules/demandas/schemas.ts, src/modules/demandas/consultas.ts (início), src/db/schema/demandas.ts (enumerações), test/integracoes.ts, test/requisicao.ts, test/deps.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T06 ("O Awave cria demanda: autoria, campos, sem disparo, limite e contrato (IN-05)"). O código da tarefa
está em f40e2a7; fafb47e só regrava a entrega. **Resultado: todos os critérios da T06 têm teste, a suíte inteira passa
duas vezes seguidas, lint e typecheck limpos. Nenhuma devolução.**

### Critério → teste

| Critério | Arquivo | Teste |
|---|---|---|
| CA-01.3 | `src/app/api/demandas/contrato-awave.test.ts` | "CA-01.3: token que não existe → 401 com a mensagem de hoje" |
| CA-01.3 (revogado, nada gravado) e CA-01.4 | `src/app/api/demandas/criacao-awave.test.ts` | "CA-01.3 e CA-01.4: token do Awave revogado → 401 sem gravar; o outro do Awave, o de agente, o do /construir e a sessão continuam valendo" |
| CA-04.1, CA-09.1 | `contrato-awave.test.ts` | "CA-04.1, CA-09.1 e CA-07.4: 201 sem Origin, id DEM, status nova, as seis chaves" |
| CA-04.2, CA-04.3, CA-04.4, IN-05 | `criacao-awave.test.ts` | "CA-04.2 a CA-04.4: autoria, solicitante e rascunho fixos; o que está fora da lista é descartado, sem 400"; "IN-05: o papel do solicitante vem do corpo (está na lista)" |
| IN-05 (reforço QA) | `src/app/api/demandas/criacao-awave-qa.test.ts` | "awave com o mesmo corpo completo: só os cinco campos da lista ficam, e nada dispara (contraprova no mesmo banco)"; "dúvidas do chamador são descartadas, e os opcionais ausentes ficam nulos" |
| CA-04.5, IN-12 | `criacao-awave.test.ts` | "CA-04.5 e IN-12: um demanda_criada com o awave e o prefixo do token, e o depois só com status e tipo" |
| CA-04.6 | `criacao-awave.test.ts` | "CA-04.6: tipo fora da lista e corpo sem título → 400, sem gastar id nem gravar"; `contrato-awave.test.ts` "erros no formato { erro, mensagem }, nunca 3xx" |
| CA-05.1 | `criacao-awave.test.ts` | "CA-05.1: com o insumo_tecnico ligado, o POST do Awave não cria execução nem job" |
| CA-05.2 (pessoa) | `criacao-awave.test.ts` | "CA-05.2: a mesma criação por pessoa cria a execução e o job (regressão)" |
| RF-05 (agente `orquestrador` continua disparando) | `criacao-awave-qa.test.ts` | "agente orquestrador: os mesmos campos, o solicitante do corpo (não "Awave"), rascunho, o prefixo do token no evento, e o insumo técnico dispara" |
| CA-07.4 | `contrato-awave.test.ts` | "CA-07.4: as chaves e os valores do 201 são os mesmos do GET por id do Awave" |
| CA-08.1, CA-08.2 | `criacao-awave.test.ts` | "CA-08.1 e CA-08.2: a 11ª na janela é 429 sem gastar id; quando a primeira sai da janela, passa uma e só uma" |
| CA-08.3 | `criacao-awave.test.ts` | "CA-08.3: com 10 do Awave na janela, uma pessoa cria 30, e a 31ª recebe o limite de pessoa" |
| CA-08.3 no sentido contrário (QA) | `criacao-awave-qa.test.ts` | "com uma pessoa no limite de 30, o Awave ainda cria dez e recebe 429 só na 11ª; o agente orquestrador segue com o dele" |
| CA-08.4 | `criacao-awave.test.ts` | "CA-08.4: 11 POSTs simultâneos com a janela vazia dão exatamente dez 201 e um 429" |
| CA-09.2 | `contrato-awave.test.ts` | "CA-09.2: o mesmo pelo endereço interno http://orquestrador_app" |
| CA-09.4 | `contrato-awave.test.ts` | "CA-09.4: com um cookie qualquer e sem Origin, continua 403 (C-15)" |
| CA-10.6 | `criacao-awave.test.ts` | "CA-10.6: um agente lê a demanda do Awave com a vista mínima, e o responsável é a integração" |
| CA-11.1 (API), CA-11.3 | `criacao-awave.test.ts` | "CA-11.1 (API) e CA-11.3: depois de dez demandas do Awave, só os quatro agentes, e uso e teto iguais" |
| IN-14 (503 e log) | `criacao-awave.test.ts` | "IN-14: com a trava do limite do awave segura por outra conexão, 503 fixo e nada gravado; sem a trava, passa"; "IN-14: a linha de log do POST do Awave leva só o tipo do ator, sem token, prefixo, nome nem id" |
| G8 #6 (`autoriaDaDemanda`) | `criacao-awave.test.ts` | "o awave grava como integração; construir, sistema e tipo desconhecido são recusados; pessoa e agente como antes" |
| `construir` não cria demanda (RF-03, QA) | `criacao-awave-qa.test.ts` | "o /construir não cria demanda, nem pela função nem pela rota, e nada é gravado" |
| G5 (D-01 → seis chaves) | `src/modules/acesso/ramos-por-ator.test.ts` | "T06: a vista da demanda para integração tem as seis chaves, só para a integração que a criou" |

### Testes acrescentados (7, em 1 arquivo novo)

`src/app/api/demandas/criacao-awave-qa.test.ts`: rota, tokens e Postgres reais; cada `describe` tem banco, relógio
fixo e token próprios. Cobrem o que a T06 mexeu e os testes da construção não fechavam: a troca do INSERT por
`camposDaEntrada`, do disparo por `dispararAoCriar` e do rascunho por `autorTipo !== 'pessoa'`.

1. Pessoa: cada um dos 11 campos do corpo, com valor exclusivo, vai à própria coluna (uma troca de coluna aparece);
   solicitante do corpo; `rascunho_agente = false`; o insumo técnico dispara (execução e job).
2. Agente `orquestrador`: o mesmo, com `rascunho_agente = true`, autoria do agente, o prefixo do token no evento e o
   disparo (RF-05 pede o disparo do agente como hoje; a construção só provava o da pessoa).
3. Awave com o mesmo corpo completo, no mesmo banco com o insumo ligado: só `titulo`, `tipo`, `solicitantePapel`,
   `contexto` e `descricaoProblema` ficam; os outros seis nulos ou vazios; nada dispara (contraprova).
4. Pela função, sem a rota: `extras.duvidasEntrada` do chamador é descartado para o Awave, e `solicitantePapel`,
   `contexto` e `descricaoProblema` ausentes ficam nulos.
5. Pela função, com a transação do chamador desfeita: a demanda e o evento do Awave somem (`executarComOrcamento` com
   `t` de fora).
6. O `/construir` recebe `sem_permissao` pela função e 403 pela rota, com sequência, demandas, eventos e tokens iguais.
7. Limite no sentido contrário do CA-08.3: com a pessoa nos 30, o Awave ainda cria 10 e recebe o 429 dele na 11ª
   (mensagem do limite de 10, diferente da de 30), e o agente `orquestrador` cria a dele.

Os 7 passaram na primeira rodada: são guardas de regressão sobre código já correto. Não foi possível vê-los falhando
por mutação, porque a lista **Pode** não deixa editar `src/` fora de teste.

### Resultado

- `pnpm test src/app/api/demandas/criacao-awave-qa.test.ts`: 1 arquivo, 7 de 7.
- `pnpm test` (suíte inteira), duas rodadas seguidas: **259 arquivos, 5589 de 5589**, nas duas (antes: 258 e 5582;
  entraram 1 arquivo e 7 testes). Em nenhuma das duas o teste de cronômetro de `minimizar.test.ts` falhou, e o CA-08.4
  passou nas duas.
- `pnpm typecheck` e `pnpm lint`: limpos.

## Decisões tomadas

- Arquivo novo `criacao-awave-qa.test.ts`, no padrão `-qa.test.ts` das etapas anteriores, em vez de mexer nos dois
  arquivos da construção: nenhum teste existente muda.
- O RF-05 diz "pessoa e agente `orquestrador`" e o CA-05.2 só cobre a pessoa. Acrescentei o agente, porque a T06
  trocou o disparo incondicional por um `switch`.
- O teste da pessoa e o do agente comparam as 11 colunas uma a uma. O `servico.test.ts` só confere parte delas, e a
  T06 reescreveu o mapeamento campo a campo.
- Não toquei a regex com `alta` do CA-04.2 a CA-04.4 (parecer 4 da revisão). Tirar a palavra seria afrouxar uma
  asserção, e hoje ela não oscila. Vai para Pendências.
- Não rodei `git show` (vetado pelo maestro neste pedido). Li a construção pelo `git diff f19c224 f40e2a7`.
- Glob e Grep não estavam disponíveis nesta sessão. Li os arquivos com Read e os localizei pelo `git diff --stat`.

## Pendências

- Nenhuma bloqueia a T06.
- **Para a 08 (parecer 4 da 06-T06-revisao):** em `criacao-awave.test.ts`, o teste "CA-04.2 a CA-04.4" tem `alta`
  solta na regex de ausência. Um texto fictício ou uma coluna futura que contenha "alta" dentro de outra palavra faz o
  teste falhar sem que haja falha real. O `urgencia: null` do `toMatchObject` já cobre o caso. A troca é decisão da
  revisão, porque tira um termo de uma asserção.
- **CA-08.4 (parecer 5):** passou nas duas rodadas da suíte inteira, sem oscilar. Continua dependendo do
  `lock_timeout` de 2 s numa máquina carregada; não subi tempo-limite (G3.2).
- **`minimizar.test.ts` (cronômetro, fora da T06):** não repetiu a falha de 4,8 ms nas duas rodadas. O registro da
  construção continua valendo para a 08 ou para quem cuidar da suíte.
- Os 7 testes novos não foram vistos falhando por mutação (eu não posso editar `src/`). Se a 08 quiser, basta trocar
  duas colunas em `camposDaEntrada`, ou tirar o `case 'agente'` de `dispararAoCriar`, e ver os testes 1 e 2 caírem.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -15` — código da T06 em f40e2a7, base f19c224
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat f19c224 c68e7c0` — 9 arquivos, os da T06 e da pasta do pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff f19c224 f40e2a7 -- src/modules/demandas/servico.ts src/modules/demandas/consultas.ts src/modules/acesso/ramos-por-ator.test.ts test/integracoes.ts` — o código e o caso do G5 (2 linhas com `expect(` viraram 4; nenhuma asserção a menos)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/demandas/criacao-awave-qa.test.ts` — 1 arquivo, 7 de 7
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — em segundo plano, saída lida com Read: 259 arquivos, 5589 de 5589, código 0
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só o arquivo novo de teste
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat f19c224 f40e2a7 -- src test e2e` — 6 arquivos da T06; o único teste que já existia e mudou é `ramos-por-ator.test.ts` (G5)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — segunda rodada, em segundo plano, saída lida com Read: 259 arquivos, 5589 de 5589, código 0
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só o arquivo novo de teste

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
