---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T09-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, tarefas.json, docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md (G0, G1, D-18 e T09), 01-analista-requisitos.md (RF-08, CA-08.1 a CA-08.3 e Pendência 7), test/estatico/piso-de-assercoes.test.ts, test/estatico/piso-de-assercoes-qa.test.ts, .prettierrc]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T09 (B-08-2, SB-15; RF-08, CA-08.1 a CA-08.3, D-18): os testes de segurança da 0.3.x e da 0.4.0 que estavam fora do
`PISO` entraram nele, cada um com a contagem de linhas com `expect(` recontada no fim da tarefa.

Arquivos alterados:
- `test/estatico/piso-de-assercoes.test.ts`: só acréscimo de 38 entradas no fim do `PISO`, com o comentário de origem
  pedido no plano. Nenhuma entrada saiu e nenhum valor mudou (`git diff --stat`: 40 inserções, 0 remoções; as 2 linhas a
  mais são o comentário).

Teste criado:
- `test/estatico/piso-de-assercoes-0018.test.ts` (3 casos, 3 linhas com `expect(`):
  1. a cópia `PISO_41108EE` tem as 63 entradas do `PISO` de 41108ee;
  2. nenhuma entrada de 41108ee saiu do `PISO` nem ficou abaixo do valor daquela versão (CA-08.3);
  3. cada arquivo do B-08-2 está no `PISO` com valor maior ou igual à contagem de 41108ee (CA-08.1 e a lista da T09).
  O `PISO` é lido do fonte pela expressão do plano; entrada ausente vira 0, para a falha dizer o arquivo.

Tabela da T09 com os números recontados (`git grep -c "expect(" -- src test e2e scripts` no fim da tarefa; todos iguais
aos de 41108ee que o plano trazia):

| Arquivo | `expect(` no fim da T09 | No PISO | Razão |
|---|---|---|---|
| `src/modules/andamento/registrar-qa.test.ts` | 69 | entra, 69 (CA-08.1) | AN-01 a AN-08 do registro |
| `src/modules/acesso/matriz-integracoes.test.ts` e `-qa` | 8 e 45 | entram | controle de acesso por integração |
| `src/modules/acesso/ramos-por-ator.test.ts` e `-qa` | 30 e 59 | entram | ramo por tipo de ator (IN-02) |
| `src/modules/acesso/tokens-integracao.test.ts`, `-qa` e `-corrompido` | 25, 40 e 3 | entram | autenticação do token |
| `test/matriz-rotas-integracoes-qa.test.ts` | 14 | entra | matriz × rotas pelos tokens |
| `src/app/api/pedidos-construcao/entrega.test.ts` e `entrega-qa` | 81 e 50 | entram | 404 sem oráculo, escopo |
| `src/app/api/pedidos-construcao/recebimento.test.ts` e `recebimento-qa` | 71 e 54 | entram | idem |
| `src/app/api/pedidos-construcao/log-das-integracoes.test.ts` | 31 | entra | sentinela de log |
| `src/app/api/pedidos-construcao/saidas-das-integracoes-qa.test.ts` | 19 | entra | saídas sem dado |
| `src/modules/pedido-construcao/recebimento-0019.test.ts` | 35 | entra | escopo do recebimento |
| `src/app/api/demandas/visibilidade-agente-0019.test.ts` | 40 | entra | visibilidade e 404 sem oráculo |
| `src/app/api/demandas/criacao-awave-0019.test.ts` | 12 | entra | visibilidade do Awave |
| `src/app/api/pacotes-decisao/visibilidade-0019.test.ts` | 16 | entra | visibilidade |
| `src/modules/demandas/confirmacao-0019.test.ts` | 21 | entra | visibilidade (confirmação) |
| `src/modules/demandas/autor-desconhecido-0019.test.ts` | 5 | entra | ator desconhecido negado |
| `src/modules/integracoes/prazo-total-0019.test.ts` | 21 | entra | prazo total |
| `src/modules/limites-integracao.test.ts` e `-qa` | 30 e 23 | entram | limite por integração |
| `src/db/schema/integracao.test.ts` e `-qa` | 21 e 32 | entram | privilégio e imutabilidade do token |
| `src/modules/historico/consultas-integracao.test.ts` e `-qa` | 9 e 8 | entram | visibilidade do histórico da integração |
| `test/estatico/trace-e2e.test.ts` | 14 | entra | credencial fora do trace |
| `e2e/integracoes.spec.ts` e `-qa` | 13 e 43 | entram | rotas das integrações no build |
| `src/lib/rota-corpo-invalido.test.ts` | 7 | entra | AN-02, corpo sem eco (o `-qa` já estava, 67) |
| `src/modules/andamento/schemas.test.ts` | 11 | entra | AN-02, corpo fechado |
| `src/modules/andamento/regras.test.ts` | 18 | entra | AN-04 e AN-12 |
| `src/modules/demandas/transicoes-construir.test.ts` | 19 | entra | AN-04, transições só do construir |
| `e2e/andamento-construir.spec.ts` | 40 | entra | token, 404 e 422 sem eco no build |
| `test/estatico/migration-0008.test.ts` | 6 (recontado depois da T03) | entra | AN-10, custom só com o GRANT |
| `src/lib/deps-qa.test.ts` | 8 | já estava (T08), segue 8 | C-27; nada a acrescentar |
| `test/estatico/piso-de-assercoes-0018.test.ts` | 3 | entra (Passo 4) | o piso só sobe |
| `src/app/(painel)/demandas/fila-andamento.test.ts` e `-qa` | 40 e 51 | não entram (proposta do plano) | tela, sem controle de acesso, visibilidade, oráculo, sentinela, prazo nem imutabilidade |
| `src/components/dados-das-etapas-andamento.test.ts` | 11 | não entra (proposta do plano) | idem |
| `scripts/seed-andamento.test.ts` e `-qa` | 41 e 37 | não entram (proposta do plano) | seed fictício |
| `e2e/andamento-detalhe.spec.ts` e `e2e/andamento-fila.spec.ts` | 58 e 18 | não entram (proposta do plano) | tela |

Comandos e resultados:
- teste visto falhando antes das entradas: `pnpm --dir … test test/estatico/piso-de-assercoes-0018.test.ts` → 1 falhou,
  2 passaram. Trecho da segunda execução (a primeira falhou igual, só que com `actual value must be number or bigint,
  received "undefined"`, o que levou ao `?? 0` para a falha nomear o arquivo):
  `AssertionError: src/modules/andamento/registrar-qa.test.ts: expected 0 to be greater than or equal to 69`.
- depois das entradas: `test test/estatico` → 51 arquivos, 1181 testes passaram; os três do piso juntos → 211 de 211.
- `pnpm lint` e `pnpm typecheck`: limpos.
- `pnpm test` inteiro (em segundo plano, saída lida com Read): 381 arquivos, 8227 testes passaram, 0 falharam, saída 0.

Desvios do plano, com a razão:
- `DO_B_08_2` virou um mapa arquivo → contagem de 41108ee e o caso confere `>=` essa contagem, não só `> 0`: com `> 0`,
  uma entrada de valor 1 passaria e o CA-08.1 pede a contagem atual. Mais forte, mesmo efeito.
- `PISO_41108EE` tem 63 entradas, não 84 como diz o comentário do plano: são as entradas do `PISO` antes da primeira do
  0018 (T01 a T08 só acrescentaram, conforme as entregas e revisões delas). Um caso trava esse 63.
- O comentário de origem cita que o `deps-qa.test.ts` já entrou na T08 e segue 8; não dupliquei a chave.

## Decisões tomadas

- Copiei o `PISO_41108EE` do bloco do `PISO` antes do comentário "T01 do DEC-DEM-20261111-0018-v1", sem rodar
  `git show 41108ee:…`: a regra de comando desta passagem não traz `git show`, e todas as entregas de T01 a T08 registram
  só acréscimo no `PISO`.
- Os valores do `PISO_41108EE` são os de hoje nessas 63 linhas, que nenhuma tarefa deste pedido mudou; se algum tivesse
  subido, a cópia ficaria mais rígida, nunca mais frouxa.
- Comentário do teste novo escrito sem `expect(` com parêntese, para a contagem do arquivo (3) ser só de asserção.
- Fiquei na lista da T09: o que não está nela vai para Pendências, para a 06-T09-testes decidir (CA-08.2 é dela).

## Pendências

1. Para a `06-T09-testes` (qa-automacao, CA-08.2): conferir o `PISO_41108EE` contra
   `git show 41108ee:test/estatico/piso-de-assercoes.test.ts` (o plano fala em 84 entradas; eu contei 63 no bloco da
   0.4.0).
2. Para a `06-T09-testes`: candidatos que achei por nome na contagem e que não estão no `PISO` nem na tabela da T09; não
   conferi a versão de cada um nem o conteúdo. Ficam para confirmar ou incluir:
   `scripts/token-integracao.test.ts` e `-qa` (62 e 48), `scripts/criar-token-0019.test.ts` (8),
   `src/modules/integracoes/tempo-limite.test.ts` e `-qa` (32 e 16), `src/db/transacao-prazo.test.ts` (26),
   `test/matriz-rotas-qa.test.ts` (22; o `test/matriz-rotas.test.ts` está), `src/db/imutabilidade.test.ts` (23),
   `src/modules/agentes/executar-0019.test.ts` (53), `src/modules/agentes/revisao-0019.test.ts` (31),
   `src/app/api/demandas/nomes-antes-de-gravar.test.ts` (29), `src/app/api/demandas/leitura-awave.test.ts` e `-qa`
   (28 e 36), `src/app/api/demandas/criacao-awave.test.ts` e `-qa` (81 e 35), `test/tokens-do-e2e.test.ts` (15).
3. O texto do `pedido.json` não trouxe instrução fora do escopo. Nada a registrar.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T09" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md` — linhas da T09 no plano
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "Pendência 7\|^7\. " -- docs/construcao/DEC-DEM-20261111-0018-v1/01-analista-requisitos.md` — Pendência 7 da 01
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "G0" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md` — regra de comando do plano
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "41108ee" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md` — base do pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "sobe de" -- docs/construcao/DEC-DEM-20261111-0018-v1` — só a T02 subiu um valor, e de entrada do próprio 0018
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" -- src test e2e scripts` — contagem de cada arquivo de teste
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "printWidth" -- .prettierrc` — 120
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "entradas" -- docs/construcao/DEC-DEM-20261111-0018-v1` — T01 a T08 só acrescentaram ao PISO
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/piso-de-assercoes-0018.test.ts --reporter=dot` — 1 falhou (`actual value must be number or bigint, received "undefined"`), 2 passaram (antes das entradas)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/piso-de-assercoes-0018.test.ts --reporter=dot` — 1 falhou (registrar-qa fora do PISO), 2 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico --reporter=dot` — 1181 de 1181, 51 arquivos
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/piso-de-assercoes-0018.test.ts test/estatico/piso-de-assercoes.test.ts test/estatico/piso-de-assercoes-qa.test.ts --reporter=dot` — 211 de 211
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 8227 de 8227, 381 arquivos (em segundo plano)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 1 arquivo, 40 inserções (mais o teste novo, não rastreado)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- test/estatico/piso-de-assercoes.test.ts` — só acréscimo: o comentário de 2 linhas e as 38 entradas

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (a tarefa não toca rota, Server Action nem job)
