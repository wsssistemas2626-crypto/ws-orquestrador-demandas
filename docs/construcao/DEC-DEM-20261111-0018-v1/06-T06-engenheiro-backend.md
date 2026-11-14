---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T06-construcao
agente: engenheiro-backend
leu: [pedido.json, contrato-passagem.md, tarefas.json, 2026-11-13-ws-orquestrador-demandas-sobras-plano.md (G0 a G10 e T06), 04-seguranca-aplicacao.md (SB-11, por git grep), 2026-11-13-ws-orquestrador-demandas-sobras-design.md (SB-11 e RF-03, por git grep), 06-T05-engenheiro-backend.md (formato), src/modules/demandas/transicoes.ts, src/modules/pacotes-decisao/decidir.ts, src/modules/pacotes-decisao/substituido.ts, src/modules/pacotes-decisao/desatualizado.ts, src/modules/demandas/servico.ts (alterarDemanda), src/modules/demandas/servico.test.ts (linhas 1 a 120 e 380 a 486), src/modules/pacotes-decisao/substituicao.test.ts, src/modules/pacotes-decisao/concorrencia.test.ts, src/modules/pacotes-decisao/marcacao-da-criacao.test.ts (linhas 1 a 230), src/modules/especificacoes/servico.ts (linhas 1 a 60), src/modules/pedido-construcao/gerar.ts, src/modules/pedido-construcao/gerar.test.ts (linhas 290 a 335), src/modules/pedido-construcao/situacao.ts, src/modules/pedido-construcao/situacao.test.ts (linhas 1 a 90), src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.test.ts (linhas 230 a 254), test/integracoes.ts (linhas 1 a 25), test/estatico/importacoes.ts, test/estatico/situacao.test.ts, test/estatico/andamento.test.ts (linhas 1 a 200), test/estatico/piso-de-assercoes.test.ts, saída do pnpm test em /tmp]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

A T06 está feita (S-04, decisão S1 de Fabiano e 7.1; RF-03 no servidor, CA-03.1 a CA-03.5, SB-11, ADR-38). Arquivar o DEC
mais novo leva a demanda pelo estado do aprovado vigente, lido sob a trava da demanda e depois de `gravarDecisao`:

| Vigente | Destino (origens `nova`, `aguardando_informacao`, `pronta_para_decisao`) | De `em_analise` |
|---|---|---|
| nenhum | `encerrada` (como até a 0.4.0) | `encerrada` |
| atualizado | `aprovada` (S1) | `aprovada` |
| desatualizado | `em_analise` (7.1) | não muda |

Fora das origens (`aprovada`, `em_construcao`, `devolvida`, `entregue`, `encerrada`), nada muda e não há evento. A
mudança é gravada pelo ator `sistema`. Devolver continua levando a `em_analise`.

**Arquivos criados**
- `src/modules/demandas/arquivamento.ts`: `ESTADOS_DO_VIGENTE`, `EstadoDoVigente`, `estadoDoVigente` e
  `destinoDoArquivamento`. Pura (só `import type { Status } from './schemas'`), com `switch` exaustivo e `never` nos
  nove status e nos três estados. É o código do plano, sem mudança.

**Arquivos alterados**
- `src/modules/demandas/transicoes.ts`:
  - `decisao_arquivada` sai do tipo `TransicaoAutomatica` e de `AUTOMATICAS`;
  - entra `mudarStatusPorArquivamento(t, deps, demandaId, estado)`, depois de `mudarStatusPeloSistema`: trava a
    demanda, decide por `destinoDoArquivamento` sobre o status da linha travada, e com destino nulo ou igual ao atual
    não grava nada; senão, `update` e `status_alterado` com `{ tipo: 'sistema' }`;
  - a importação de `./arquivamento` e o comentário do topo ("decisão devolvida (o arquivamento tem função própria)").
  - `MANUAIS`, `duvida_em_aberto`, `dec_criado`, `decisao_devolvida`, `mudarStatusPeloSistema`,
    `AUTOMATICAS_DO_CONSTRUIR`, `CONTRADIZ_STATUS_FINAL`, `transicaoDoConstruir` e `mudarStatusPeloConstruir` sem linha
    mudada.
- `src/modules/pacotes-decisao/substituido.ts`: só o acréscimo de `VigenteDaDemanda` e `vigenteDaDemanda` (a mesma
  leitura de `aprovadoVigente`, mais o `desatualizado` por `expressaoDesatualizado`), e a importação de
  `./desatualizado`.
- `src/modules/pacotes-decisao/decidir.ts`: só o ramo de `devolvida`/`arquivada` em `registrarDecisao`, as importações
  e o item 7 do comentário do topo. `devolvida` chama `mudarStatusPeloSistema(..., 'decisao_devolvida')` como antes;
  `arquivada` lê `vigenteDaDemanda(tx, ...)` e chama `mudarStatusPorArquivamento(tr, deps, ..., estadoDoVigente(vigente))`.
- `src/modules/demandas/servico.test.ts` (G5): a linha `decisao_arquivada` sai do `it.each` de
  `mudarStatusPeloSistema`. A expectativa dela (das quatro origens a `encerrada` com evento do ator sistema; fora delas,
  nada e sem evento) passou para a coluna `nenhum` de `arquivamento-status.test.ts`, pelo banco e com as mesmas
  asserções. As linhas com `expect(` do arquivo continuam 77, o mesmo número de `41108ee`.
- `src/modules/pacotes-decisao/substituicao.test.ts` (G5): só o comentário da linha 146, que passa a "arquivar com
  vigente leva a Aprovada (0.4.1)". Nenhuma asserção mudou.
- `test/estatico/piso-de-assercoes.test.ts`: só acréscimo das quatro entradas novas (10, 14, 49 e 29).

**Testes criados**
- `src/modules/demandas/arquivamento.test.ts` (SB-11 a): a tabela 9 × 3 célula a célula (27 casos); os únicos destinos
  são `encerrada`, `aprovada`, `em_analise` e `null`; `aprovada` só com `atualizado`; status ou estado fora da lista
  lança; `estadoDoVigente` nos três casos. São 31 testes, sem banco, com 10 linhas de `expect(`.
- `src/modules/demandas/arquivamento-status.test.ts`: `mudarStatusPorArquivamento` contra o Postgres real, pelo papel do
  app. Para cada estado (um teste por estado, num dia próprio), os nove status:
  - quando muda: o retorno, o status, o `atualizada_em` e um `status_alterado` com ator `sistema`, `antes` e `depois`;
  - quando não muda: retorno `null`, status e `atualizada_em` iguais, nenhum evento.
  - Também: a coluna `nenhum` igual à regra antiga; a transação desfeita volta o status sem deixar evento; demanda
    inexistente dá `nao_encontrado`. São 6 testes, com 14 linhas de `expect(`.
- `src/modules/pacotes-decisao/arquivar-com-vigente.test.ts`: serviços reais, uma autora por demanda (C-36), cada teste
  num dia próprio. São 15 testes, com 49 linhas de `expect(`:
  1. **CA-03.1:** v1 aprovado e atualizado, v2 pendente; arquivar o v2 leva a `aprovada`, com `status_alterado` de
     `pronta_para_decisao` para `aprovada` pelo Sistema; `temPacoteAprovadoAtualizado` é `true`; `vigenteDaDemanda` é
     o v1, nível `cto`, atualizado.
  2. **CA-03.2:** depois disso, `gerarPedido` do v1 sai (`pedido` = v1, um `pedido_gerado`), e `situacaoDoPedido` do v1
     pelo `construir` é `vigente`; o v2 arquivado dá 409 `naoAprovado`.
  3. **CA-03.3:** sem aprovado e com o v1 pendente, arquivar o v1 leva a `encerrada`; `vigenteDaDemanda` é `null`.
  4. **CA-03.4:** v1 aprovado e v2 pendente; devolver o v2 leva a `em_analise`.
  5. **CA-03.5:** v1 `cto_e_administradora` aprovado, v2 `cto` pendente; aprovar o v2 dá 409 `nivelMenorQueOVigente`;
     arquivar o v2 leva a `aprovada`, e o v1 gera.
  6. **7.1:** v1 aprovado e desatualizado (ESP v2 depois dele), v2 pendente e atualizado; arquivar o v2 leva a
     `em_analise`. Em outra demanda já levada a `em_analise` pelo migrator, continua `em_analise`, sem evento novo.
  7. **SB-11 (c):** v1 `cto_e_administradora` só com a aprovação da administradora, v2 pendente; `vigenteDaDemanda` é
     `null`, e arquivar o v2 leva a `encerrada`.
  8. **Fora das origens:** v1 aprovado, demanda em `aprovada`, v2 pendente; arquivar o v2 deixa `aprovada`, sem evento
     de status.
  9. **SB-11 (d), duas conexões:**
     - (i) a ESP nova segura a trava; o arquivamento espera (`pg_stat_activity` em `Lock`); solto, termina em
       `em_analise`.
     - (ii) o arquivamento segura a trava; a ESP nova espera; solto, termina em `aprovada`, o `status_alterado` para
       `aprovada` vem antes do `especificacao_criada` do v2, e só depois o v1 fica desatualizado.
  10. **SB-11 (e):** 50 repetições (5 lotes de 10) de `Promise.allSettled([arquivar o v2, alterarDemanda → em_analise])`.
      Nenhuma rejeição tem `code` `40P01`; o arquivamento sempre passa; a demanda sempre termina em `aprovada`. O
      caminho do histórico é um dos dois aceitos: (i) pessoa `pronta_para_decisao → em_analise` e depois sistema
      `em_analise → aprovada`; ou (ii) só sistema `pronta_para_decisao → aprovada`, com a manual recusada por
      `MOTIVOS_TRANSICAO.foraDaTabela`.
- `test/estatico/arquivamento.test.ts` (SB-11; D-06): sem importar de outro `*.test.ts` (usa `./importacoes` e o
  `typescript`, com `funcaoDeclarada` local). São 10 testes, com 29 linhas de `expect(`. Confere:
  - em `registrarDecisao`, a ordem `travarDemanda` → `gravarDecisao` → `vigenteDaDemanda` → `mudarStatusPorArquivamento`,
    com uma chamada de cada, e `mudarStatusPeloSistema` só com `'decisao_devolvida'`;
  - em `mudarStatusPorArquivamento`, os parâmetros `t, deps, demandaId, estado`, a ordem `travarDemanda` →
    `destinoDoArquivamento` → `registrarEvento`, e o ator `{ tipo: 'sistema' }`;
  - `decisao_arquivada` em nenhum arquivo de `src/` fora de teste;
  - `arquivamento.ts` só com `import type` de `./schemas`;
  - os casos plantados de cada regra, inclusive a leitura do vigente dentro do argumento de `mudarStatusPorArquivamento`
    (na mesma linha, a chamada do destino vem antes da leitura, e a regra reprova).

**TDD (teste antes, visto falhando).** Com os quatro testes escritos e sem o código:
`pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/arquivamento.test.ts src/modules/demandas/arquivamento-status.test.ts src/modules/pacotes-decisao/arquivar-com-vigente.test.ts test/estatico/arquivamento.test.ts --reporter=dot`

```
 FAIL  src/modules/demandas/arquivamento.test.ts [ src/modules/demandas/arquivamento.test.ts ]
Error: Cannot find module './arquivamento' imported from .../src/modules/demandas/arquivamento.test.ts
 FAIL  test/estatico/arquivamento.test.ts > SB-11: registrarDecisao lê o vigente sob a trava e depois de gravarDecisao > a ordem travarDemanda → gravarDecisao → vigenteDaDemanda → mudarStatusPorArquivamento
AssertionError: expected false to be true // Object.is equality
 FAIL  src/modules/pacotes-decisao/arquivar-com-vigente.test.ts > SB-11 (d): ... > (i) a ESP nova segura a trava; o arquivamento espera → vê o v1 desatualizado e leva a em_analise
AssertionError: expected 'encerrada' to be 'em_analise' // Object.is equality
 FAIL  src/modules/pacotes-decisao/arquivar-com-vigente.test.ts > SB-11 (e): ... > lote 1 de 10: os dois desfechos possíveis terminam em aprovada, e nada rejeita com 40P01
AssertionError: expected 'encerrada' to be 'aprovada' // Object.is equality
 Test Files  4 failed (4)
      Tests  19 failed | 6 passed (25)
```

Os dois arquivos que não carregaram não entram na contagem de 25. Os 6 que passaram antes do código não dependem da regra
nova:
- os 4 testes de casos plantados do estático;
- o CA-03.4, porque devolver não muda;
- o "fora das origens", porque a regra antiga também não mexia em `aprovada`.

Depois do código, o mesmo comando deu `Test Files 4 passed (4)`, `Tests 62 passed (62)`.

**Suíte, lint e tipos**
- `pnpm test` (inteiro, em segundo plano): `Test Files 375 passed (375)`, `Tests 8112 passed (8112)`, nenhuma falha,
  em 207 s.
- `pnpm lint`: limpo (`eslint .` sem saída).
- `pnpm typecheck`: limpo (`tsc --noEmit` sem saída).

**G4 e diffs parciais**
- O comando da G4 (`git diff 41108ee -- ...`, as superfícies congeladas) saiu **vazio**.
- Os diffs parciais, lidos com `git diff`:
  - `transicoes.ts`: só o tipo, `AUTOMATICAS` sem a linha, a função nova, a importação e o comentário do topo;
  - `decidir.ts`: só o ramo de `devolvida`/`arquivada`, as importações e o item 7 do comentário;
  - `substituido.ts`: só o acréscimo de `vigenteDaDemanda` e a importação dele.
- As linhas com `expect(` de `servico.test.ts` continuam 77, a mesma contagem de `41108ee`.

**Nenhum teste existente além dos da G5 mudou.** A suíte não apontou outro teste que esperasse `encerrada` ao arquivar
com vigente atualizado (a linha 152 da G5 não precisou ser usada). `decidir.test.ts:440` e `gerar.test.ts:302`, que
arquivam sem vigente, continuam passando sem mudança.

**Desvios do plano**
1. Em `decidir.ts`, o vigente é lido numa linha própria (`const vigente = await vigenteDaDemanda(...)`), antes da
   chamada de `mudarStatusPorArquivamento`. O plano o lia dentro do argumento. A semântica é a mesma: lido depois de
   `gravarDecisao`, sob a trava e na mesma transação. A forma do plano poria a chamada de `mudarStatusPorArquivamento`
   antes de `vigenteDaDemanda` no texto, e o estático da ordem, pedido pelo próprio plano, reprovaria. O `if`/`else`
   ficou com chaves no ramo `else`.
2. No comentário do topo de `transicoes.ts`, o texto ficou "decisão devolvida (o arquivamento tem função própria)", e
   as duas linhas seguintes foram reflowed para caber na largura. O plano pedia "decisão devolvida; o arquivamento tem
   função própria". O sentido é o mesmo.
3. O SB-11 (e) roda as 50 repetições em 5 lotes de 10 (`it.each([1..5])`). Num teste só, o tempo ficaria perto dos
   30 s do `testTimeout` sob carga, e o tempo-limite não se sobe (G3.2). O total e as asserções são os do plano.
4. O teste de CA-03.5 também confere a recusa do S-01 ao aprovar o v2 (409 `nivelMenorQueOVigente`). O plano a cita
   entre parênteses.

## Decisões tomadas
- Vigente lido numa linha própria em `decidir.ts`: é o único jeito de a guarda estática da ordem (D-06) aprovar o código.
- A tabela `ESPERADO` foi escrita de novo em `arquivamento-status.test.ts`, em vez de importada de `arquivamento.test.ts`:
  um teste não importa de outro `*.test.ts` (D-06).
- Uma autora por demanda em `arquivar-com-vigente.test.ts` (`u-arq-vig-N`): as 50 repetições criam 50 demandas com ESP,
  RSK e dois DEC, acima do limite de 30 por hora de uma conta só (C-36). Avançar o relógio um dia por repetição invadiria
  os dias dos outros testes.
- `situacaoDoPedido` no CA-03.2 é chamado com `{ pool: b.poolApp }` e o ator `construir` de `atorDeIntegracao`, sem
  token: o serviço só pede o `pool` (`DepsSituacao`).
- O nome do teste estático guarda o texto da transição antiga montado em partes (`['decisao', 'arquivada'].join('_')`).
  A varredura só olha `src/`, mas assim nenhum `git grep` de revisão confunde o teste com um uso.

## Pendências
- Para a 08 ratificar (G5, já registrada nas Pendências do `05-tech-lead.md`): a linha `decisao_arquivada` saiu do
  `it.each` de `servico.test.ts`. A expectativa dela está na coluna `nenhum` de `arquivamento-status.test.ts`, e a
  contagem de `expect(` do arquivo não caiu (77).
- Fora desta tarefa: o texto "Arquivar: a demanda vai para Encerrada." da T11 e a dica e a chegada do Arquivar são da
  T12. O e2e "Arquivar → …" (`e2e/decisao.spec.ts:455-474`) passa para `arquivarSemVigente` na T11. Com a regra nova, a
  demanda `decisao`, que já tem um aprovado vigente desatualizado, iria a Em análise. Eu não rodei `pnpm test:e2e`, que
  não está na minha lista Pode.

## Comandos executados
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files docs/construcao/DEC-DEM-20261111-0018-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T06" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files src/modules/pacotes-decisao src/modules/demandas test/estatico`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "funcaoDeclarada" -- test src`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "decisao_arquivada"`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "SB-11" -- docs/construcao/DEC-DEM-20261111-0018-v1/04-seguranca-aplicacao.md docs/superpowers/specs/2026-11-13-ws-orquestrador-demandas-sobras-design.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export async function\|export function\|export type Deps" -- src/modules/pedido-construcao/gerar.ts src/modules/pedido-construcao/situacao.ts src/modules/especificacoes/servico.ts src/modules/demandas/servico.ts src/db/transacao.ts src/modules/versoes.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "status\|throw" -- src/modules/pedido-construcao/conferir.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export" -- test/pedidos-construcao.ts test/integracoes.ts test/banco.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "wait_event_type" -- src test`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "novaAutora\|autoras" -- src/modules/pacotes-decisao/marcacao-da-criacao.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "references" -- src/db/schema/decisao.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export const STATUS\b\|export const STATUS =\|export type Status\b" -- src/modules/demandas/schemas.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "decisao: {\|pedido: " -- src/modules/pedido-construcao/montar.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "Timeout\|pool\|maxWorkers" -- vitest.config.ts`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/arquivamento.test.ts src/modules/demandas/arquivamento-status.test.ts src/modules/pacotes-decisao/arquivar-com-vigente.test.ts test/estatico/arquivamento.test.ts --reporter=dot` — antes do código: 4 arquivos falharam, 19 falharam e 6 passaram de 25 testes
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/arquivamento.test.ts src/modules/demandas/arquivamento-status.test.ts src/modules/pacotes-decisao/arquivar-com-vigente.test.ts test/estatico/arquivamento.test.ts --reporter=dot` — depois do código: 62 de 62
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep --untracked -c "expect(" -- src/modules/demandas/arquivamento.test.ts` — 10
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep --untracked -c "expect(" -- src/modules/demandas/arquivamento-status.test.ts` — 14
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep --untracked -c "expect(" -- src/modules/pacotes-decisao/arquivar-com-vigente.test.ts` — 49
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep --untracked -c "expect(" -- test/estatico/arquivamento.test.ts` — 29
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" -- src/modules/demandas/servico.test.ts` — 77
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 8112 de 8112 (375 arquivos), em segundo plano
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 41108ee -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/lib/rota.ts src/db/transacao.ts src/db/privilegios.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/pedido-construcao/pendentes.ts src/modules/pedido-construcao/entregar.ts src/modules/pedido-construcao/receber.ts src/modules/andamento/registrar.ts src/modules/limites.ts src/modules/pacotes-decisao/consultas.ts src/modules/demandas/consultas.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/agentes/entrada-agente.ts next.config.ts 'drizzle/000[0-9]_*.sql' 'drizzle/meta/000[0-9]_snapshot.json'` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- src/modules/demandas/transicoes.ts src/modules/pacotes-decisao/decidir.ts src/modules/pacotes-decisao/substituido.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "statusDecisao: 'arquivada'" -- src test`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep --untracked -n "RESULTADO_DA_SUITE" -- docs/construcao/DEC-DEM-20261111-0018-v1/06-T06-engenheiro-backend.md`

## Critério de pronto atendido
- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
