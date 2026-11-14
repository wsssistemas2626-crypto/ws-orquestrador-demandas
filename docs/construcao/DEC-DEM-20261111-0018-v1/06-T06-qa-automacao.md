---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T06-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 2026-11-13-ws-orquestrador-demandas-sobras-plano.md (T06 e G8), 01-analista-requisitos.md (RF-03, CA-03.1 a CA-03.6), 04-seguranca-aplicacao.md (SB-11, por git grep), 06-T06-engenheiro-backend.md, 06-T06-tech-lead.md, commit 9318e10 (git show), src/modules/pacotes-decisao/decidir.ts (linhas 180 a 262), src/modules/demandas/transicoes.ts, src/modules/pacotes-decisao/desatualizado.ts, src/modules/pareceres-risco/servico.ts (linhas 25 a 54), src/modules/pedido-construcao/conferir.ts (linhas 30 a 69), src/modules/pacotes-decisao/arquivar-com-vigente.test.ts, src/modules/demandas/arquivamento-status.test.ts, test/estatico/arquivamento.test.ts, src/app/api/pacotes-decisao/decisao.test.ts (linhas 1 a 150), src/app/api/pacotes-decisao/pedido.test.ts (linhas 36 a 170), src/app/api/pedidos-construcao/situacao.test.ts (linhas 1 a 139), test/pedidos-construcao.ts, test/deps.ts, test/estatico/piso-de-assercoes.test.ts (linhas 125 a 139), saída do pnpm test em /tmp]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verificação da T06 (destino do arquivamento pelo aprovado vigente, SB-11), commit `9318e10`. O ramo está em `01d7796`.
Os commits depois de `9318e10` só trazem as entregas de revisão e o `passagens.jsonl`. O código passa nos testes do
engenheiro e nos novos. Não há devolução.

**Critério → teste**

| Critério | Teste (arquivo › nome) |
|---|---|
| Critério 3 do pedido: com o v1 aprovado e o v2 pendente, arquivar o v2 deixa a demanda em `aprovada` e o v1 gera o pedido | `arquivar-com-vigente.test.ts` › "CA-03.1: …" e "CA-03.2: …"; `arquivar-com-vigente-qa.test.ts` › "PATCH arquivar o v2 → 200 e aprovada pelo Sistema; POST do pedido do v1 → 200, válido; situação do v1 vigente; o v2 não gera nem tem situação" (pelas rotas reais) |
| CA-03.1 | `arquivar-com-vigente.test.ts` › "CA-03.1: v1 aprovado e atualizado, v2 pendente; arquivar o v2 → aprovada, pelo Sistema, …"; `arquivar-com-vigente-qa.test.ts` › o teste do critério 3 (pela rota PATCH) |
| CA-03.2 | `arquivar-com-vigente.test.ts` › "CA-03.2: depois do arquivamento, o v1 gera o pedido e a situação dele é vigente; …"; `arquivar-com-vigente-qa.test.ts` › o teste do critério 3 (POST do pedido, `validarPedido` do /construir e GET da situação pelo token `construir`) |
| CA-03.3 (outro sentido do RSK) | `arquivar-com-vigente.test.ts` › "CA-03.3 (outro sentido): …"; `arquivamento-status.test.ts` › coluna `nenhum`; `arquivar-com-vigente-qa.test.ts` › "DEC anterior devolvido não é vigente: …" |
| CA-03.4 | `arquivar-com-vigente.test.ts` › "CA-03.4: v1 aprovado, v2 pendente; devolver o v2 → em_analise, …" |
| CA-03.5 | `arquivar-com-vigente.test.ts` › "CA-03.5: v1 de dupla aprovação aprovado e v2 só do CTO pendente (recusado pelo S-01); …" |
| 7.1 (vigente desatualizado → `em_analise`) | `arquivar-com-vigente.test.ts` › "7.1: …" (pela ESP); `arquivar-com-vigente-qa.test.ts` › "RSK novo depois do v1 (e não ESP): …" |
| SB-11 (a): tabela 9 × 3 | `arquivamento.test.ts` (31 testes); `arquivamento-status.test.ts` › "vigente %s: em cada status, …" (pelo banco) |
| SB-11 (b): CA-03.1 a CA-03.5 | as linhas acima |
| SB-11 (c): aprovação incompleta não conta | `arquivar-com-vigente.test.ts` › "SB-11 (c): …" (só a administradora); `arquivar-com-vigente-qa.test.ts` › "dupla aprovação só com o CTO (a outra ordem do SB-11 c): …", "DEC mais novo incompleto e atualizado por cima de um aprovado desatualizado: …", "o outro lado: DEC mais novo incompleto não esconde o vigente completo e atualizado; …" e "completar a aprovação do v1 de dupla aprovação ao mesmo tempo que arquivar o v2: …" |
| SB-11 (d): corrida com ESP ou RSK nova | `arquivar-com-vigente.test.ts` › "(i) a ESP nova segura a trava; …" e "(ii) o arquivamento segura a trava; …"; `arquivar-com-vigente-qa.test.ts` › "(i) o RSK novo segura a trava; …" e "(ii) o arquivamento segura a trava; o RSK novo espera → aprovada com o v1 atualizado no commit, …" |
| SB-11 (e): sem `40P01` em 50 repetições | `arquivar-com-vigente.test.ts` › "lote %i de 10: …" (5 × 10) |
| SB-11: ordem sob a trava, ator `sistema`, pureza | `test/estatico/arquivamento.test.ts` (10 testes, com casos plantados) |
| Arquivar não é atalho para `aprovada` (04, linha E) | `arquivar-com-vigente-qa.test.ts` › `semAtalhoParaAprovada` em cinco casos: o predicado `temPacoteAprovadoAtualizado` é falso, `gerarPedido` do v1 dá 409 e não há `pedido_gerado` |

**Testes acrescentados: `src/modules/pacotes-decisao/arquivar-com-vigente-qa.test.ts`** (9 testes, 63 linhas com
`expect(`). Usa o Postgres real, o papel do app, serviços e rotas reais (PATCH da decisão, POST do pedido e GET da
situação com o token `construir` criado em tempo de teste). O relógio é fixo, cada demanda tem a sua autora (C-36), e os
nomes são fictícios.
1. **Critério 3 pelas rotas.** Arquivar o v2 pelo PATCH dá 200, e a demanda vai a `aprovada` com `status_alterado` do
   ator `sistema`. O POST do pedido do v1 dá 200, e o JSON passa no `validarPedido` do /construir. A situação do v1 é
   `vigente`. O v2 arquivado dá 409 `naoAprovado` e 404 na situação (sem pedido gerado). Só existe um `pedido_gerado`, e
   o nome do solicitante não vai ao log das rotas.
2. **Vigente desatualizado pelo RSK.** O engenheiro só desatualiza o v1 pela ESP. Aqui, um RSK novo desatualiza o v1, e
   o v2 nasce atualizado. Arquivar o v2 leva a `em_analise`, e o v1 dá 409 `desatualizado`.
3. **Dupla aprovação só com o CTO.** É a outra ordem do SB-11 (c). O vigente fica nulo, e arquivar o v2 leva a
   `encerrada`.
4. **DEC mais novo incompleto por cima de um aprovado desatualizado.** O v2, de dupla aprovação, tem só a administradora
   e está atualizado. O v1 aprovado está desatualizado. Arquivar o v3 leva a `em_analise`, e não a `aprovada`. Isso pega
   um `vigenteDaDemanda` que contasse aprovação parcial, ou que pegasse o DEC de maior versão sem olhar a decisão.
5. **DEC anterior devolvido não é vigente.** O v1 foi devolvido, e arquivar o v2 leva a `encerrada`. Isso pega um filtro
   que contasse qualquer linha de `decisao`.
6. **O outro lado do 4.** Com o v1 completo e atualizado, um v2 incompleto não esconde o v1. Arquivar o v3 leva a
   `aprovada`, e o v1 gera.
7. **SB-11 (d) com o RSK, nas duas ordens.** Na G8, o caminho do RSK (linha 3) estava "sem mudança" e sem teste na T06.
   - (i) O RSK segura a trava, e o arquivamento termina em `em_analise`.
   - (ii) O arquivamento segura a trava. Dentro da transação dele, antes do commit, `temPacoteAprovadoAtualizado` é
     `true`. O `parecer_risco_criado` do v2 vem depois do `status_alterado` para `aprovada`.
   - A espera é conferida por `pg_stat_activity`, com `wait_event` `transactionid` ou `tuple` (a do `FOR UPDATE`), para
     não confundir com outra espera de trava.
8. **Completar a aprovação do v1 × arquivar o v2.** São 5 repetições com `Promise.allSettled`. O arquivamento sempre
   passa. A aprovação do v1 sempre é recusada com 409 (`naoEhOMaisNovo` ou `demandaFinal`, conforme a ordem). A demanda
   termina em `encerrada`, e o vigente fica nulo.

**Piso:** `test/estatico/piso-de-assercoes.test.ts` ganhou só uma entrada, com comentário:
`'src/modules/pacotes-decisao/arquivar-com-vigente-qa.test.ts': 63`. É teste de segurança (SB-11) e entra no PISO.

**Resultados**
- O arquivo novo sozinho passou 9 de 9. Junto com os quatro da T06 e os dois do piso, passaram 7 de 7 arquivos e 235 de
  235 testes.
- `pnpm test` (suíte inteira, em segundo plano): **376 de 376 arquivos, 8124 de 8124 testes, 0 falhas** (203 s). Em
  relação aos 8113 da revisão, são os 9 testes novos e mais 2. Os 2 devem ser casos gerados por entrada do PISO, mas isso
  não foi conferido.
- `pnpm lint`: limpo. `pnpm typecheck`: limpo.
- `git diff --stat`: só `test/estatico/piso-de-assercoes.test.ts` (+4 linhas). Além disso, o arquivo de teste novo e esta
  entrega. Nenhum teste existente foi apagado. Nenhum recebeu `.skip`, `.only` ou `.todo`, e nenhuma asserção foi
  afrouxada.

## Decisões tomadas

- O arquivo novo é `-qa`, ao lado do do engenheiro. Assim nenhuma asserção dos testes da T06 muda.
- O critério 3 é provado pelas rotas, e não só pelo serviço. É o caminho que a pessoa e o /construir usam, e uma
  divergência entre a rota de decisão, a do pedido e a da situação quebra o teste.
- Os casos adversariais miram as três formas de o arquivamento virar atalho para `aprovada`:
  - aprovação parcial contada como vigente;
  - DEC de maior versão tomado sem olhar a decisão;
  - desatualização por um caminho que o engenheiro não exercitou (RSK).
- Os serviços rodam sem a fila, como no teste do engenheiro, para nenhum job nascer no meio das corridas. As rotas usam
  as deps completas.
- As corridas usam sinais e a espera real na trava, ou `allSettled`, conferindo só o que vale em qualquer ordem. Não
  dependem de tempo nem de ordem de agenda.
- Não rodei mutação no código de produção, porque `src/` sem `.test.ts` está fora da minha lista **Pode**. Os testes
  falhariam assim:
  - com a regra da 0.4.0 (arquivar → `encerrada`): o 1, o 6 e o 7 (ii);
  - com o vigente lido antes da trava ou antes de `gravarDecisao`: o 7 (i), que terminaria em `aprovada`;
  - com `vigenteDaDemanda` contando aprovação parcial ou qualquer decisão: o 3, o 4 e o 5.

## Pendências

- Nenhuma que impeça a próxima etapa.
- Para a `08-revisao`: as Minor da 06-T06-revisao (duplicação em `transicoes.ts` e `substituido.ts`, e o comentário de
  `gerar.test.ts:318`) seguem como estão. Esta etapa não toca nesses arquivos.
- O `pedido.json` não traz instrução fora do pedido.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files docs/construcao/DEC-DEM-20261111-0018-v1` — 27 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T06" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md` — T06 na linha 1132
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "CA-03" -- docs/construcao/DEC-DEM-20261111-0018-v1/01-analista-requisitos.md` — critérios
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 9318e10c7a50b6996f0ff07abbe59453041a635b --stat` — 13 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 9318e10c7a50b6996f0ff07abbe59453041a635b -- test/estatico/piso-de-assercoes.test.ts src/modules/demandas/servico.test.ts src/modules/pacotes-decisao/substituicao.test.ts src/modules/pacotes-decisao/substituido.ts` — diffs da G5, do piso e de `substituido.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "SB-11" -- docs/construcao/DEC-DEM-20261111-0018-v1/04-seguranca-aplicacao.md` — ameaças e SB-11
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files src/app/api/pacotes-decisao src/app/api/pedidos-construcao test` — rotas e ajudantes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export async function criarParecerRisco\|export async function criarEspecificacao\|export async function gerarPedido\|export const MENSAGENS_PEDIDO" -- src/modules` — assinaturas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "chamarRota\|beforeAll\|criarPessoa\|import " -- src/app/api/pacotes-decisao/pedido.test.ts` — molde da rota do pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A6 "CA-15.1\|it('200" -- src/app/api/pacotes-decisao/pedido.test.ts` — sem resultado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A8 "export async function travarDemanda" -- src/modules/versoes.ts` — `FOR UPDATE`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "DepsComFila =\|type DepsComFila" -- src` — a fila é opcional
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "from '../../app/" -- src/modules` — testes de módulo já importam rotas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "registrarDecisao(" -- src/app` — caminhos da decisão
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "acao: '" -- src/modules/pareceres-risco/servico.ts src/modules/especificacoes/servico.ts` — `parecer_risco_criado`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pacotes-decisao/arquivar-com-vigente-qa.test.ts --reporter=dot` — 9 de 9
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep --untracked -c "expect(" -- src/modules/pacotes-decisao/arquivar-com-vigente-qa.test.ts` — 63
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pacotes-decisao/arquivar-com-vigente-qa.test.ts src/modules/pacotes-decisao/arquivar-com-vigente.test.ts src/modules/demandas/arquivamento.test.ts src/modules/demandas/arquivamento-status.test.ts test/estatico/arquivamento.test.ts test/estatico/piso-de-assercoes.test.ts test/estatico/piso-de-assercoes-qa.test.ts --reporter=dot` — 7 de 7 arquivos, 235 de 235
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — em segundo plano: 376 de 376 arquivos, 8124 de 8124 testes, 0 falhas (203 s)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — só o piso, +4
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep --untracked -n -e "Date.now" -e "new Date()" -e ".only(" -e ".skip(" -e ".todo(" -- src/modules/pacotes-decisao/arquivar-com-vigente-qa.test.ts` — sem resultado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — o piso e o arquivo novo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -4` — ramo em `01d7796`

A saída da suíte foi lida com a ferramenta Read em /tmp.

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
