---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T10-construcao
agente: engenheiro-backend
leu: [pedido.json, tarefas.json, padrao-tecnico.md, contrato-passagem.md, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (G1 a G10, T10, T12, T13, V-02), 05-tech-lead.md (linha da T10), 06-T07-engenheiro-backend.md (nota para a T10), scripts/seed-ficticio.ts, scripts/seed-integracoes.test.ts, scripts/seed-integracoes-qa.test.ts, scripts/scripts.test.ts, src/modules/andamento/registrar.ts, src/modules/andamento/regras.ts, src/modules/demandas/transicoes.ts, src/modules/demandas/servico.ts (alterarDemanda), src/modules/pedido-construcao/pendentes.ts, src/modules/versoes.ts (travarDemanda), src/db/schema/andamento.ts, test/andamento.ts, test/estatico/andamento.test.ts, test/estatico/andamento-qa.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T10 do plano: o seed fictício cria as oito demandas do andamento da tabela da T10, com o andamento gravado direto pelo
ator `construir` de prefixo `ficticio` (D-07), sem token (AN-15), e a lista de pendentes do `/construir` igual à da 0.3.0
(D-11).

**Arquivos alterados**

| Arquivo | O que mudou |
|---|---|
| `scripts/seed-ficticio.ts` | cabeçalho com o parágrafo "0.4.0 (DEC-DEM-20261111-0017-v1, T10)"; oito títulos novos em `TITULOS_DO_E2E` (os do plano, sem mudança); `ANDAMENTOS` (a tabela da T10: título, contexto, se tem pedido, se a "cto" leva a `em_construcao`, e os passos), `DEMANDAS_DO_ANDAMENTO` (melhoria, sob_medida, "Pessoa Ficticia Produto", contexto preenchido) somado ao `TOTAL_DEMANDAS_DO_SEED` (36); `criarDadosDoAndamento(t, deps, pessoas)`, chamada no fim de `criarDadosDasIntegracoes` |
| `scripts/seed-andamento.test.ts` (novo) | 18 testes, no molde de `seed-integracoes.test.ts` (Postgres real, relógio fixo, `SEED_FICTICIO=1`, banco vazio) |
| `scripts/scripts.test.ts` | G5: os totais com as oito novas (ver a tabela abaixo) |
| `scripts/seed-integracoes.test.ts` | G5: total 28 → 36 |
| `scripts/seed-integracoes-qa.test.ts` | G5: a ordem de criação com as oito novas depois das cinco das integrações (ver a tabela abaixo) |

**O que o seed grava em cada demanda nova** (todas da `sem2fa`, com ESP, RSK e DEC dela, DEC de nível cto aprovado pela
"cto" na opção A):

| Chave | Pedido (gerado pela "cto", entregue e recebido pelo construir do seed) | Status pela "cto" | Andamento pelo construir (prefixo `ficticio`) | Status final |
|---|---|---|---|---|
| `andamentoConstruindo` | sim | → aprovada | `entendendo_o_pedido 0/0` → `construindo 9/17` (aprovada → em_construcao pelo construir) | em_construcao |
| `andamentoRevisando` | sim | → aprovada | `revisando_e_entregando 17/17` (aprovada → em_construcao pelo construir) | em_construcao |
| `andamentoConcluido` | sim | → aprovada → em_construcao | `documentando 12/12 construido` (sem transição, A1) | em_construcao |
| `andamentoCancelado` | sim | → aprovada | `construindo 3/8` → `construindo 3/8 cancelado` (aprovada → em_construcao → devolvida pelo construir) | devolvida |
| `andamentoSemPlano` | sim | → aprovada | `entendendo_o_pedido 0/0` (aprovada → em_construcao pelo construir) | em_construcao |
| `andamentoParaEnviar` | sim | → aprovada | nenhum | aprovada |
| `andamentoSemPedido` | não | nenhum | nenhum | pronta_para_decisao |
| `emConstrucaoSemAndamento` | não | → aprovada → em_construcao | nenhum | em_construcao |

Cada passo segue as regras do serviço sem chamá-lo (D-07): `travarDemanda`, `mudarStatusPeloConstruir(t, deps,
CONSTRUIR_DO_SEED, linha, statusConstrucao)`, `insert` em `andamentoConstrucao` com `atorTokenPrefixo: 'ficticio'` e
`gravadoEm: deps.relogio.agora()`, e o `andamento_registrado` por `registrarEvento`, com `antes`/`depois` de
`marcoDoEvento` e só quando `mudancaDeMarco`. Resultado: 7 linhas em `andamento_construcao` e 7 `andamento_registrado`
(A: 2; B, C, E: 1; D: 2, com dois `status_alterado` do construir). O seed não importa `andamento/registrar.ts` nem
`andamento/consultas.ts` e não escreve `registrar_andamento`: as guardas de `test/estatico/andamento*.test.ts` seguem
verdes sem mudança. C-36: a `sem2fa` fica com 28 de 30 demandas e 33 de 60 versões (conferido no teste).

**Testes criados** (`scripts/seed-andamento.test.ts`, 18): os oito títulos (do plano, "(fictício)", únicos); total 36
no banco, na mensagem e no log; ordem de criação e molde das oito; ESP, RSK e DEC da `sem2fa` com DEC aprovado e
vigente; C-36 (28 demandas e 33 versões da `sem2fa`); um `it.each` por chave com status, linhas de andamento (DEC,
números, situação, prefixo, hora), `andamento_registrado` (ator, prefixo, `antes`/`depois` chave a chave),
`status_alterado` do construir, da pessoa e do sistema, e o último andamento por `lerAndamento(ultimoAndamento(...))`;
pedido gerado, entregue e recebido nas seis com pedido e ausente nas outras duas; D-11 (`listarPendentes` só com a
`pedidoParaBuscar`); totais 7 e 7; AN-15/D-09 (`token_servico` vazio, único prefixo `ficticio` em evento e andamento,
nada de `wsod_`); G3.10 (o log não leva título, decId nem fase).

**Teste antes do código (visto falhando)**

`pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/seed-andamento.test.ts --reporter=dot`
antes do código:

```
 FAIL  ... > os oito títulos novos: ... AssertionError: expected { …(23) } to match object { …(8) }
 FAIL  ... > o total do seed conta as oito novas: 36 demandas ... AssertionError: expected 28 to be 36
 FAIL  ... > andamentoConstruindo: status, ... AssertionError: expected [] to have a length of 1 but got +0
 Test Files  1 failed (1)
      Tests  17 failed | 1 passed (18)
```

O que passou já na primeira rodada é o D-11 (a lista de pendentes não muda: é a guarda de que as oito não entram nela).
Depois do código, uma asserção do próprio teste novo estava errada (esperava nenhum `status_alterado` do sistema, mas o
`dec_criado` de sempre leva cada demanda de Nova a Pronta para decisão); corrigida para conferir esse evento exato.

**Mudanças da G5 nos testes existentes, trecho a trecho** (só totais e listas das oito novas; nenhuma asserção saiu)

| Arquivo | Antes | Depois | Razão |
|---|---|---|---|
| `scripts/scripts.test.ts` ~370 | `TOTAL_DEMANDAS_DO_SEED` 28 | 36, e o comentário cita a T10 | as oito novas |
| `scripts/scripts.test.ts` ~412 | `titulos` = todos menos as cinco da T15 | menos as cinco da T15 e as oito da T10 (`DA_T10_0_4_0`); `titulos` continua 18 | as oito têm versões e estado próprios, conferidos em `seed-andamento.test.ts`, como as da T15 |
| `scripts/scripts.test.ts` ~478 | `todos` 23 | 31 | as oito novas |
| `scripts/scripts.test.ts` ~581 | `[TOTAL, 5, 5, 5, 3]` (demanda, ESP, RSK, DEC, aprovação) | `[TOTAL, 13, 13, 13, 11]` | ESP, RSK, DEC e aprovação de cada uma das oito |
| `scripts/scripts.test.ts` ~869 | 5 DECs (aviso e job por DEC) | 13 | os oito DECs novos |
| `scripts/scripts.test.ts` ~1070 | `TOTAL_DEMANDAS_DO_SEED - 5` no terceiro aviso | `- 13` | as oito vêm depois das cinco da T15, e ainda não existem no terceiro aviso |
| `scripts/scripts.test.ts` ~1093 | 5 DECs, 3 aprovações | 13 e 11 | as oito novas |
| `scripts/seed-integracoes.test.ts` 68 | título "28 demandas", total 28 | título cita a 0.4.0, total 36 | as oito novas |
| `scripts/seed-integracoes-qa.test.ts` 105 (Minor 3) | as cinco da T15 são as últimas criadas; DECs na ordem terminam nos dois dos pedidos | as oito da T10 são as últimas (`DO_ANDAMENTO`) e as cinco da T15 vêm imediatamente antes; a lista dos DECs ganha os oito no fim; comentário do topo diz que o número de `scripts.test.ts` passou a 13 | a T10 chama `criarDadosDoAndamento` no fim de `criarDadosDasIntegracoes` (plano); a asserção sobre as cinco continua, agora no bloco antes das oito |

Nada mudou em `src/`, `test/`, `e2e/`, `docs/` nem nos arquivos de configuração.

## Decisões tomadas

- `andamentoConcluido`: a "cto" leva a demanda de `aprovada` a `em_construcao` antes do passo `documentando 12/12
  construido` — a tabela pede status final `em_construcao` com um só `andamento_registrado`, e `construido` não muda
  status (A1); é o mesmo caminho da `emConstrucaoSemAndamento`.
- O "antes" de cada passo vem do passo anterior em memória, e não de `ultimoAndamento` — o seed não pode importar
  `andamento/consultas.ts` por valor (`IMPORTAM_CONSULTAS` em `test/estatico/andamento.test.ts`), e os passos são
  gravados em sequência na mesma transação.
- Ordem dentro do passo como no texto da T10 (trava, transição, linha, evento) — a ordem dos eventos fica igual à do
  serviço (`status_alterado` antes de `andamento_registrado`).
- Sem `decidirPorStatus`, `mesmoEstado` nem limite no seed — os passos são fixos, distintos e nunca partem de status final;
  o plano só pede `mudancaDeMarco` e a transição da tabela do construir.
- As oito demandas recebem contexto próprio (texto inventado) e as mesmas ESP, RSK e DEC (`ESP_DO_E2E`, `RSK_DO_E2E`,
  `DEC_DO_E2E` de nível cto) dos pedidos da 0.3.0 — o pedido sai do contexto e o `validarPedido` recusa descrição vazia.
- `scripts/seed-andamento.test.ts` não entra no `PISO` de asserções — a G3 só pede isso nas T01, T02, T03, T07, T08 e T09.

## Pendências

- Comando fora da lista **Pode**, só de leitura e sem necessidade: um `grep -n -E` sobre o arquivo de saída da suíte
  inteira, em `/tmp/claude-1000/...` (fora do repositório). O mesmo resultado (337 arquivos e 7483 testes passando) foi
  lido em seguida pela ferramenta Read, linhas 723 e 724 do mesmo arquivo. Declarado em "Comandos executados".
- Para a T12 e a T13 (frontend): a única demanda do seed em `aprovada` é a `andamentoParaEnviar`, e ela passa a
  `em_construcao` quando o e2e da T14 ou a V-02 enviam o andamento. As cinco com andamento têm `gravadoEm` igual à hora da
  subida: o texto "Última mudança informada pelo /construir em …" mostra a hora da subida da homologação.
- O seed passou de 28 para 36 demandas: um e2e que dependa do número total de demandas ou de uma página cheia da fila pode
  mudar. Não rodei `pnpm test:e2e` (não está na minha lista, G1); fica para a T12 a T14 e a `09-entrega`.
- `docs/manual-tecnico/10-configuracao-e-scripts.md` ainda diz 28 demandas no seed: fica para a `10-documentacao` (G2).

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T10" -- docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files scripts test src/db`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files src/modules/andamento src/modules/demandas src/modules/pedido-construcao src/lib`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "andamentoConcluido" -- .`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "TOTAL_DEMANDAS_DO_SEED" -- .`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export async function alterarDemanda" -A40 -- src/modules/demandas/servico.ts` — erro do git (opção depois do padrão); refeito abaixo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A40 "export async function alterarDemanda" -- src/modules/demandas/servico.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -ln "seed-ficticio" -- src test e2e scripts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -i "todas" -- e2e/fila-contadores.spec.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "seed" -- test/estatico/andamento-qa.test.ts test/estatico/andamento.test.ts test/estatico/leituras-da-fila.test.ts test/estatico/dados-das-etapas.test.ts test/estatico/capturas-qa.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A12 "export async function travarDemanda" -- src/modules/versoes.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "andamento" -- src/db/schema/index.ts src/modules/historico/registrar.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -i "seed" -- src/db/sementes.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "em_construcao" -- e2e`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "devolvida" -- e2e`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export async function aprovadoVigente" -- src/modules/pacotes-decisao/substituido.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "LinhaEvento" -- test/pedidos-construcao.ts`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/seed-andamento.test.ts --reporter=dot` — antes do código: 17 de 18 falharam (esperado)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/seed-andamento.test.ts --reporter=dot` — depois do código: 8 falharam (asserção errada do próprio teste sobre o `dec_criado`, corrigida)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/seed-andamento.test.ts --reporter=dot` — 18 de 18
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts --reporter=dot` — 141 de 148 (as sete da G5, antes do ajuste)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts --reporter=dot` — 148 de 148
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 7483 de 7483 (337 arquivos)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -3`
- `grep -n -E "Test Files|Tests |FAIL" /tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/d7de67e8-15e3-4f45-b927-45e1f3d1b43d/tasks/bmhib5lgl.output` — fora da lista Pode (ver Pendências)
- `grep -rn "T10" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1`

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída acima)
- [x] `pnpm test` passa (7483 de 7483)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log sem segredo, token, valor de `.env` nem dado pessoal real (títulos "(fictício)", "Pessoa Ficticia Produto", prefixo `ficticio`, nenhum token criado; conferido no teste)
- [x] só mudaram os arquivos da tarefa (`scripts/seed-ficticio.ts`, os testes do seed da G5 e o `scripts/seed-andamento.test.ts` novo)
- [x] toda entrada de rota, Server Action e job validada com Zod, sem vazar detalhe interno: nenhuma rota, Server Action nem job novo; as entradas do seed passam pelos esquemas Zod dos serviços (`criarDemandaSchema`, `criarEspecificacaoSchema`, `criarParecerRiscoSchema`, `criarPacoteDecisaoSchema`, `registrarDecisaoSchema`, `confirmacaoDoPedidoSchema`, `alterarDemandaSchema`), e o andamento usa os tipos `FaseAndamento`/`StatusConstrucao` com os CHECKs da tabela
