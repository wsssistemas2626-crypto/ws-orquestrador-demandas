---
pedido: DEC-DEM-20261112-0019-v1
etapa: 03-correcao
agente: engenheiro-backend
leu: [contrato-passagem.md, padrao-tecnico.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, DEC-DEM-20261111-0016-v1/06-T08-engenheiro-backend.md (formato), src/modules/demandas/confirmacao.ts, src/modules/demandas/confirmar.ts, src/modules/demandas/consultas.ts, src/modules/demandas/servico.ts, src/modules/demandas/schemas.ts, src/modules/especificacoes/servico.ts, src/modules/especificacoes/consultas.ts, src/modules/especificacoes/schemas.ts, src/modules/pareceres-risco/servico.ts, src/modules/pareceres-risco/consultas.ts (início), src/modules/pacotes-decisao/criar.ts, src/modules/pacotes-decisao/consultas.ts (início), src/modules/versoes.ts, src/modules/limites.ts, src/modules/acesso/ator.ts, src/modules/acesso/matriz.ts, src/modules/integracoes/tempo-limite.ts, src/db/transacao.ts, src/db/index.ts, src/db/schema/historico.ts, src/lib/erros.ts, src/lib/reduzir-erro.ts, src/lib/log.ts, src/lib/fila.ts, src/lib/rota.ts (início), src/modules/pedido-construcao/receber.ts, src/modules/pedido-construcao/entregar.ts, src/modules/pedido-construcao/pendentes.ts, src/modules/pedido-construcao/conferir.ts, src/modules/agentes/executar.ts, src/modules/agentes/execucoes.ts, src/modules/agentes/gatilhos.ts, src/modules/agentes/entrada-agente.ts, src/jobs/agente-executar.ts, src/jobs/batimento.ts, src/worker/index.ts, src/worker/iniciar.ts, as nove rotas tocadas (demandas, demandas/[id], historico, as três de lista e as três de artefato), scripts/criar-token-servico.ts, scripts/lib/saida.ts, scripts/seed-ficticio.ts, scripts/token-integracao.test.ts, test/banco.ts, test/deps.ts, test/integracoes.ts, test/requisicao.ts, test/sessao.ts, test/pedidos-construcao.ts, test/provedor-falso.ts, test/estatico/sql-raw.test.ts, test/estatico/projeto.test.ts (trecho), src/app/api/demandas/criacao-awave.test.ts, src/app/api/pedidos-construcao/recebimento.test.ts, src/app/api/pedidos-construcao/recebimento-qa.test.ts (trecho), src/modules/agentes/executar-awave.test.ts, src/modules/agentes/gatilhos-awave-qa.test.ts, src/modules/agentes/executar.bordas.test.ts (trecho), src/modules/demandas/origem.test.ts, src/modules/demandas/origem-qa.test.ts, src/modules/integracoes/tempo-limite.test.ts, src/db/transacao.test.ts, src/lib/reduzir-erro.test.ts (trecho)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Correção de M-1 a M-5, B-2 e B-3 da revisão da 0.3.0, na ordem da triagem (B-3 → M-1 → M-5 → M-4 → M-3 → M-2 → B-2 →
versão), com as decisões P1 a P5 aplicadas. O B-1 (`e2e/`) fica com a `04-regressao`, como a triagem manda. Todos os
arquivos tocados estão na lista **Pode** (`src/`, `test/`, `scripts/`, `package.json`); conferi isso antes de escrever
código. A seção 0.3.1 do `CHANGELOG.md` **não** foi escrita aqui: a triagem a atribui à `06-documentacao`, e o
`CHANGELOG.md` não está na minha lista Pode.

### O que mudou, por achado

| Achado | Arquivos | O que mudou |
|---|---|---|
| B-3 | `src/modules/demandas/confirmacao.ts` | `jaConfirmada` exige `ator_tipo = 'pessoa'` (condição única `confirmadaPorPessoa`, reusada no SQL do M-1). |
| M-1 | `confirmacao.ts` | Helper único `exigirVisivelPara(db, ator, demandaId)`: pessoa e integração passam; agente e sistema com `aguardaConfirmacao` → `ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO)`; `default` → `atorDesconhecido`. A regra em SQL, `condicaoVisivelAoAgente()`: `autor_tipo in ('pessoa','agente')` (lista de permissão) **ou** existe `demanda_confirmada` de pessoa. Valores por parâmetro. |
| M-1 | `src/modules/demandas/consultas.ts` | `lerDemandaPara`: agente e sistema chamam o helper antes de `obterDemanda`. `paginaDeDemandas` ganha a opção `soVisiveisAoAgente`, posta no mesmo `onde` dos itens e do total; `listarDemandasPara` a liga para agente e sistema. `listarDemandas` (painel) não muda. |
| M-1 | as seis rotas GET de ESP, RSK e DEC (`src/app/api/demandas/[id]/{especificacoes,pareceres-risco,pacotes-decisao}/route.ts`, `src/app/api/{especificacoes/[espId],pareceres-risco/[rskId],pacotes-decisao/[decId]}/route.ts`) | Lista: o helper antes de listar. Por id: o helper logo depois do `obter*`, antes da vista. |
| M-1 | `src/modules/{especificacoes,pareceres-risco}/servico.ts`, `src/modules/pacotes-decisao/criar.ts` | `await exigirVisivelPara(tx, ator, demandaId)` logo depois de `travarDemanda`, **antes** de `recusarSeDemandaFinal` e de `conferirLimite` (P3: 404, não 409). |
| M-5 | `src/modules/agentes/entrada-agente.ts` | `demandaDaChave(db, agente, chave)`: orquestrador → null; insumo → id da chave; risco → `demandaId` da ESP; consolidação → `demandaId` do RSK; inexistente ou fora do formato → `nao_encontrado`. Só ids. |
| M-5 | `src/modules/agentes/executar.ts` | Passo 3a: a demanda da entrada; `nao_encontrado` → `falhar('entrada_nao_encontrada')`; agente fora o orquestrador com demanda nula ou diferente de `exec.demandaId` → o mesmo `falhar` (falha fechada, sem provedor). Status final (M-02) e confirmação (3c) passam a usar essa demanda, na mesma ordem. O 3c chama `adiarAteConfirmacao` em vez de `ignorar`: volta a `pendente` e devolve `'aguardando_confirmacao'` (valor novo de `ResultadoExecucao`), com o mesmo evento `agente_ignorado`/`sem_confirmacao` (D-18 intacto). |
| M-5 | `src/modules/agentes/execucoes.ts` | `devolverAPendenteSemJob` (UPDATE guardado por `daMesmaReivindicacao`: `pendente`, `tentativas - 1`, `bloqueadaAte` e `proximaTentativaEm` nulos, sem job, sem DELETE) e `reenfileirarPendente` (`SELECT … FOR UPDATE` da pendente sem hora marcada; envia o job com `chaveDoJob(…, tentativas + 1)` e payload só com `execucaoId`). |
| M-5 | `src/modules/agentes/gatilhos.ts`, `src/modules/demandas/confirmar.ts` | `dispararOuReenfileirar`, com as mesmas guardas de `dispararSeLigado` (extraídas para `filaSeDisponivel`, sem duplicar); quando `criarExecucao` devolve null, reenfileira. `confirmarDemanda` passa a usá-lo; os outros gatilhos não mudam. |
| M-5 | `src/jobs/batimento.ts` | **Desvio 1** (abaixo): a pendente cuja demanda aguarda confirmação não é reenfileirada (`semEsperaDeConfirmacao`, de `confirmacao.ts`). |
| M-4 | `src/modules/pedido-construcao/pendentes.ts` | `ultimoShaEntregue(db, decId)` (o `pedido_entregue` de maior id que casa com `RE_SHA256`) e `travarPedido(tx, decId)` (`pg_advisory_xact_lock(hashtextextended(${'pedido:' + decId}, 0))`, chave por parâmetro). `shasEntregues` fica (seed e testes usam). |
| M-4 | `receber.ts`, `entregar.ts` | As duas chamam `travarPedido` como primeira instrução. Recebimento: sem entrega → 409 `naoEntregue`; `sha256 !== ultimo` → 409 `shaDiferente` sem gravar; igual → como hoje. Entrega: grava `pedido_entregue` quando o hash difere do último (X → Y → X grava as três; repetição do mesmo hash não grava). |
| M-3 | `src/db/transacao.ts` | `comTransacao(pool, fn, op?)` com `prazoMs`, `piso` e `agora` (padrão `performance.now()`). Sem `prazoMs`, o caminho de hoje. Com ele: a espera por `pool.connect()` corre contra o tempo restante (`Promise.race`; a conexão que chega depois volta ao pool por `.then(c => c.release())`); cada instrução passa por um `Proxy` de `query` que lança `PrazoDaTransacaoEsgotado` com o prazo vencido e, com o restante abaixo do piso em vigor, roda antes `select set_config('statement_timeout', $1, true), set_config('lock_timeout', $2, true)` (valores por parâmetro); antes do COMMIT, prazo vencido lança e o ROLLBACK de hoje roda. BEGIN, COMMIT e ROLLBACK vão direto na conexão. O erro causado pelo prazo (ele mesmo na cadeia de causas, ou 57014/55P03 de um tempo-limite que o prazo encurtou) sai como `PrazoDaTransacaoEsgotado` limpo. |
| M-3 | `src/modules/integracoes/tempo-limite.ts` | `PRAZO_TOTAL_MS = { padrao: 8000, entrega: 12000 }` e `PISO_MS` (os mesmos valores dos `SET LOCAL`, que não mudaram), ambos congelados; `prazoTotalDe(ator, orcamento)` (integração → prazo; pessoa, agente e sistema → null; `default` → `atorDesconhecido`). `executarComOrcamento` passa `{ prazoMs, piso }` só quando o prazo não é nulo. `traduzirTempoEsgotado` traduz `PrazoDaTransacaoEsgotado` para o 503 com `MENSAGEM_INDISPONIVEL`. Nenhum `connectionTimeoutMillis` no pool. |
| M-3 | `src/lib/reduzir-erro.ts` | `PrazoDaTransacaoEsgotado` entra em `CLASSES_DO_PROJETO` (a classe não termina em Error; procedimento da própria lista). |
| M-2 | `src/modules/demandas/servico.ts`, `src/app/api/demandas/route.ts` | `criarDemanda` com sobrecargas: `AtorIntegracao` → `DemandaVistaDaIntegracao`, os outros → `DemandaVista`. Para a integração, `executarComOrcamento(…, async (tr) => obterDemandaDaIntegracao(tr.tx, ator, await gravar(tr)))`: a vista de seis chaves sai de dentro da transação orçada, e nada é lido depois do COMMIT. Pessoa, agente e sistema seguem com `obterDemanda` depois da transação, como hoje. A rota POST escolhe pelo tipo do ator. |
| B-2 | `scripts/criar-token-servico.ts` | `donoDosArgumentos` exportada e pura: exatamente um entre agente e integração; nenhum ou os dois → `ErroDominio('entrada_invalida', MENSAGEM_UM_DOS_DOIS)`, sem valor de argumento. `executarCriarToken` faz `switch` com `never`; não há caminho que devolva 0 sem emitir. |
| Versão | `package.json` | `"version": "0.3.1"`. |

### Testes criados (8 arquivos, 64 testes)

- `src/modules/demandas/confirmacao-0019.test.ts` (10): B-3 com `demanda_confirmada` de sistema, agente e integração
  (não confirma; a pessoa confirma e grava o próprio evento); regressão da confirmação idempotente; `exigirVisivelPara`
  para agente, sistema, pessoa, integração, id inexistente, demanda de pessoa e ator desconhecido; a equivalência da
  expressão SQL com `aguardaConfirmacao` nos quatro casos da triagem.
- `src/app/api/demandas/visibilidade-agente-0019.test.ts` (11, pela rota, tokens gerados no teste): GET por id com os
  quatro tokens de agente, status, cabeçalhos e corpo iguais aos do `DEM-20261112-9999`; as seis leituras de ESP, RSK e
  DEC com artefatos gravados por pessoa (404 igual ao do inexistente, 200 depois da confirmação); listagem com e sem
  `origem`, `total` sem a escondida, `limit`/`offset` na borda; POST de ESP, RSK e DEC com o 404 do inexistente e nada
  gravado (versões, eventos, execuções, jobs e artefatos do agente); demanda não confirmada e encerrada → 404 e não 409;
  a recusa antes do limite (com a trava `limite:artefato:agente:insumo_tecnico` presa, o 404 sai na hora); controle
  positivo depois da confirmação; pessoa lê e grava antes da confirmação.
- `src/modules/agentes/executar-0019.test.ts` (10): caso A com `demanda_id` de pessoa e nulo, e com a demanda da chave já
  confirmada (falhou `entrada_nao_encontrada`, provedor sem chamada, zero uso, zero ESP); ESP inexistente; regressão da
  execução coerente; caso B (aguardando, `pendente` com `tentativas` 0, sem job novo; confirmação → um job; uma passada
  do handler do worker → uma chamada, uma ESP, `concluida`); confirmação com o insumo desligado; duas confirmações; quatro
  bloqueios seguidos não esgotam as tentativas; o batimento não reenfileira a execução que espera, e a reenfileira depois
  da confirmação.
- `src/modules/pedido-construcao/recebimento-0019.test.ts` (7): `ultimoShaEntregue`; a corrida (A entrega Y sem commit, B
  recebe X: B espera na trava, 409 `shaDiferente`, nenhum `pedido_recebido`, DEC pendente); a entrega espera a mesma
  trava (503 fixo com ela presa); X antes e Y depois sem corrida; X → Y → X; P-02 (a entrega repetida grava uma vez);
  `naoEntregue` e o 404 de sempre.
- `src/db/transacao-prazo.test.ts` (10): prazo de 400 ms com três `pg_sleep(0.2)` (rejeita em menos de 650 ms, zero
  linhas, conexão devolvida e sem os tempos-limite); pool de uma conexão segura (rejeita entre 250 e 1000 ms,
  `waitingCount` 0, o pool atende a seguinte); sem prazo nada muda; relógio falso antes do COMMIT, antes de cada instrução
  (Drizzle e executor), o piso que vale e o que não sobe; o erro alheio sai como veio; estático do `set_config` por
  parâmetro e do relógio monotônico.
- `src/modules/integracoes/prazo-total-0019.test.ts` (9): `prazoTotalDe` (8000, 12000, null para pessoa, agente e
  sistema, ator desconhecido lança); `PRAZO_TOTAL_MS.padrao < 10_000`, `entrega < 15_000`, congelado; `PISO_MS` igual ao
  que `limitarTempo` põe; a tradução para o 503; `executarComOrcamento` com o relógio monotônico adiantado (awave/padrão e
  construir/entrega → indisponivel e nada gravado; abaixo do prazo, grava); pessoa, agente e sistema com a mesma carga
  não recebem 503.
- `src/app/api/demandas/criacao-awave-0019.test.ts` (4, rota e token reais, com `vi.mock` parcial de `consultas` e de
  `limites` só para provocar a falha): o 201 com exatamente as 6 chaves, lido uma vez por `obterDemandaDaIntegracao`;
  `57014` na leitura da vista → 503 e zero demanda do Awave e zero `demanda_criada`; prazo de 8 s esgotado depois do
  limite → 503 e nada gravado, nem o id da sequência; pessoa com a mesma carga → 201.
- `scripts/criar-token-0019.test.ts` (3): `donoDosArgumentos` certo para agente e integração; nenhum ou os dois lança a
  mensagem fixa; `executarCriarToken` com `lerArgumentos` regredido lança, não escreve na saída e não grava token nem
  evento.

### Testes existentes alterados (IN-16)

Nenhuma asserção de segurança foi apagada. As que mudam de sentido trocam pela regra nova e ficam marcadas no próprio
teste como "mudança aprovada":

| Teste | Mudança | Base |
|---|---|---|
| `src/app/api/demandas/criacao-awave.test.ts`, CA-10.6 | Antes da confirmação, 404 com o corpo do inexistente; depois de uma pessoa confirmar, as asserções de hoje (200, vista mínima, responsável integração, sem `solicitanteNome` e `anexos`). Comentário "mudança aprovada (M-1 da 0019, substitui o CA-10.6)". | P5 (aprovada) |
| `src/modules/agentes/executar-awave.test.ts`, os testes das linhas 82-95 e 107-119 | `'ignorada'` → `'aguardando_confirmacao'` no retorno e `'pendente'` no `statusDa`. Provedor sem chamada, uso zero, ESP zero e o evento `agente_ignorado`/`sem_confirmacao` continuam exigidos. "M-02 vem antes" não mudou. | P5 (aprovada) |
| `src/modules/agentes/gatilhos-awave-qa.test.ts:149` | `status: 'ignorada'` → `'pendente'`; o resto fica. | Pendência da triagem (registrar) |
| `src/modules/agentes/executar.bordas.test.ts`, "execução sem demanda (demandaId nulo)" | Antes: provedor chamado, uso `erro`, `recusada_pelo_servico`. Agora: falha fechada antes do provedor, sem uso, `entrada_nao_encontrada`. Continuam: `falhou`, sem artefato, sem nova tentativa, sem texto no evento, sem Sentry. Mais restritivo. | M-5/P2 (falha fechada); registrar |
| `src/modules/demandas/origem.test.ts`, "listagem da API para agente" | Primeiro exige a demanda do Awave fora dos itens e do total; depois de `confirmarDemanda` por pessoa, as asserções de hoje. | M-1 (substitui o CA-10.6); registrar |
| `src/modules/demandas/origem-qa.test.ts`, "agente (Bearer, sem Origin), ?origem=awave" | O mesmo: sem confirmação, nada; com o evento de pessoa (pelo migrator), as asserções de hoje. | M-1; registrar |
| `src/app/api/pedidos-construcao/recebimento-qa.test.ts`, "um pedido_recebido por hash entregue" | O hash substituído passa a dar 409 `shaDiferente` sem gravar; só o último confirma, uma vez; o desconhecido continua 409. | P1 (aprovada) |
| `src/lib/reduzir-erro.test.ts`, "as classes do projeto estão na lista" | A lista fechada ganha `PrazoDaTransacaoEsgotado`; as outras ficam. | Procedimento da lista (C-21); registrar |
| `test/estatico/projeto.test.ts`, versão | `0.3.0` → `0.3.1`. | Versão pedida |

`src/app/api/pedidos-construcao/recebimento.test.ts:311` ("IN-12: um hash entregue antes … vale") **não** mudou e passa:
o hash inserido no teste é gravado depois da entrega real, então ele é o último.

### Teste antes do código (visto falhando)

Rodada 1, com os 8 arquivos novos e os 3 testes alterados pela triagem, e nenhum código:

```
 ❯ src/modules/demandas/confirmacao-0019.test.ts (10 tests | 9 failed)
 ❯ src/app/api/demandas/visibilidade-agente-0019.test.ts (11 tests | 7 failed)
     × demanda que aguarda confirmação e já está em status final: 404 (e não o 409 do status final), sem oráculo
-   "status": 404,  +   "status": 409,
     × a recusa vem antes do limite: … AssertionError: expected 500 to be 404
 ❯ src/modules/agentes/executar-0019.test.ts (10 tests | 8 failed)
 ❯ src/modules/pedido-construcao/recebimento-0019.test.ts (7 tests | 5 failed)
 ❯ src/db/transacao-prazo.test.ts (10 tests | 8 failed)
     × pool de uma conexão, segura por outra chamada … Error: Test timed out in 30000ms.
     × o piso vale enquanto o restante for maior … expected { stmt: '10s', lock: '0' } to deeply equal { stmt: '1s', lock: '1s' }
 ❯ src/modules/integracoes/prazo-total-0019.test.ts (9 tests | 7 failed)
 ❯ src/app/api/demandas/criacao-awave-0019.test.ts (4 tests | 3 failed)
 ❯ scripts/criar-token-0019.test.ts (3 tests | 3 failed)   TypeError: donoDosArgumentos is not a function
 ❯ src/app/api/demandas/criacao-awave.test.ts (15 tests | 1 failed)   (CA-10.6)
 ❯ src/modules/agentes/executar-awave.test.ts (6 tests | 2 failed)
 ❯ src/modules/agentes/gatilhos-awave-qa.test.ts (5 tests | 1 failed)
 Test Files  11 failed (11)
      Tests  54 failed | 36 passed (90)
```

Os 36 que passaram são controles e regressões que não podem mudar (pessoa, ordem do M-02, recusa já existente, sem
prazo). O `executar-0019` rodou de novo depois de `adiarAteConfirmacao` e antes do filtro do batimento:
`× a execução pendente da demanda não confirmada não é reenfileirada pelo batimento … expected [ { …(2) } ] to deeply
equal []` (9 de 10). Esse é o laço do desvio 1, visto de fato.

Rodada 2, os mesmos 11 arquivos depois do código: **90 de 90**.

### Resultado final

- `pnpm test` (suíte inteira): **301 de 301 arquivos e 6454 de 6454 testes**, 0 falharam, em 244 s (base `d49de53` +
  `8ad4440`: 293 arquivos e 6390 testes; entraram 8 arquivos e 64 testes líquidos).
- Uma rodada intermediária da suíte deu 10 falhas em 8 arquivos; todas vinham das mudanças aprovadas (tabela acima) e do
  desvio 2. Foram corrigidas e a suíte inteira rodou de novo, verde.
- `pnpm typecheck`: limpo (nenhum `switch` não exaustivo sobre `ResultadoExecucao`; o worker só o leva ao log).
- `pnpm lint`: limpo.

### Desvios do plano

1. **`src/jobs/batimento.ts` mudou, e não está na triagem.** Sem ele, o M-5 abriria um laço: o batimento reenfileira
   toda `pendente` com `atualizada_em` de mais de 1 min, e a execução devolvida a `pendente` voltaria ao worker a cada
   minuto, com um `agente_ignorado` novo por minuto até a confirmação. A varredura passa a ignorar a pendente cuja
   demanda aguarda confirmação (a mesma regra SQL do M-1, por `execucao_agente.demanda_id`; a falha fechada do 3a garante
   que a execução devolvida tem a demanda da chave). Depois da confirmação ela volta a ser varrida: se a confirmação
   achou o agente desligado, o batimento a reenfileira, e o worker a encerra como `ignorada`/`desligado` (se o agente
   continuar desligado) ou a roda. Teste: `executar-0019`, último caso.
2. **`scripts/seed-ficticio.ts:444` mudou.** O seed comparava `dem.titulo` com o título da `awaveEncerrada`; com o M-2,
   `criarDemanda` da integração devolve a vista de seis chaves, que traz o título minimizado ("Awave" vira o marcador), e
   a demanda deixava de ser encerrada (`seed-integracoes*.test.ts` acusaram). Passa a comparar o título da entrada. O
   contrato do 201 do Awave não mudou (já era essa vista).
3. **`PrazoDaTransacaoEsgotado` em `CLASSES_DO_PROJETO`** e o teste da lista: a classe não termina em `Error`, e a lista
   fechada existe para isso; o nome é o da triagem.
4. **Testes existentes além dos nomeados pela triagem** (`executar.bordas`, `origem`, `origem-qa`, `recebimento-qa`,
   `reduzir-erro`, `projeto`): consequências diretas de M-1, M-4 (P1), M-5 (P2) e da versão. Todos mais restritivos ou
   de inventário; ver a tabela.
5. **`PISO_MS` exportado** em `tempo-limite.ts`: a triagem manda o `set_config` agir abaixo do "piso em vigor", e
   `comTransacao` não sabe o que `limitarTempo` pôs. O piso vai junto do prazo, e um teste confere que é o mesmo dos
   `SET LOCAL` (que não mudaram).
6. **O prazo de um erro de tempo-limite encurtado pelo prazo** vira `PrazoDaTransacaoEsgotado`: com 200 ms restando, o
   `statement_timeout` de 199 ms corta a instrução com 57014; sem isso, o teste de 400 ms da triagem veria 57014. Os dois
   viram o mesmo 503.

## Decisões tomadas

- Helper único do M-1 em `confirmacao.ts`, com a condição de confirmação por pessoa numa só função usada por
  `jaConfirmada`, pela listagem e pelo batimento: as três regras não se separam, e o teste de equivalência cobre a SQL.
- Na SQL do M-1, a lista de permissão `autor_tipo in ('pessoa','agente')` (e não `<> 'integracao'`), para a falha fechada
  valer também lá.
- `exigirVisivelPara` nos serviços vem antes do status final e do limite (P3); a recusa sai igual à do id inexistente,
  com o mesmo `ErroDominio` e o mesmo texto.
- No M-3, BEGIN, COMMIT e ROLLBACK passam direto na conexão, fora do `Proxy`: o ROLLBACK nunca é barrado pelo prazo.
- O `set_config` só baixa (mínimo entre restante e o aplicado): o lock_timeout de 2 s não sobe quando o restante é 3 s.
- No M-2, `criarDemanda` com sobrecarga por tipo de ator; a rota escolhe pelo tipo. A integração nunca passa por
  `obterDemanda`.
- No M-5, `adiarAteConfirmacao` não chama `liberarPendente` (só o orquestrador tem pendente, e ele nunca chega ali).
- Nenhuma linha de log nova fora a de `adiarAteConfirmacao`, que leva os mesmos campos da de `ignorar`, com
  `status: 'aguardando_confirmacao'`.
- Sem migration, GRANT, pacote, variável de ambiente, rota ou tela nova.
- Dados de teste fictícios ("Pessoa Ficticia", `@exemplo.test`, prefixo `ficticio`, hashes `'a'.repeat(64)`); tokens só
  gerados em tempo de teste.
- Glob e Grep não estavam disponíveis nesta sessão. Li com Read e achei arquivos por `git log --diff-filter=A` e
  `git log -S`.

## Pendências

- Para o maestro registrar como "mudança aprovada" (IN-16), além das já aprovadas na P5 e na P1: `gatilhos-awave-qa.test.ts:149`
  (a pendência da triagem), `executar.bordas.test.ts` (o caso de `demandaId` nulo, agora com falha fechada antes do
  provedor), `origem.test.ts` e `origem-qa.test.ts` (listagem do agente, pela regra do M-1), `reduzir-erro.test.ts`
  (classe nova na lista fechada). Detalhe na tabela da Entrega.
- Desvio 1 (batimento) e desvio 2 (seed) são mudanças fora da lista da triagem; peço o olhar do tech-lead e da
  `04-revisao`.
- O `set_config` por parâmetro e o `Proxy` de `query` em `transacao.ts` são SQL e mecanismo novos: ficam para o olhar de
  segurança na `04-revisao`, como a triagem previu.
- Seção 0.3.1 do `CHANGELOG.md` (e README e manual técnico no que mudou): `06-documentacao`, pela triagem. Inclui o
  comportamento novo do batimento e do recebimento (só o último hash).
- B-1 (`e2e/integracoes.spec.ts` com `test.use({ trace: 'off' })` e o teste estático do trace) e `pnpm test:e2e`:
  `04-regressao`. Se algum `e2e/` exigir o 200 do CA-10.6 ou ler a demanda do Awave não confirmada com token de agente,
  ele muda pela mesma mudança aprovada.
- O texto do `pedido.json` não traz instrução fora do escopo. Nada a registrar.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261112-0019-v1`, limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — base, antes de qualquer mudança: 293 de 293 arquivos, 6390 de 6390 testes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — a base não deixou arquivo alterado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --diff-filter=A --name-only --format=%h -- scripts src/db src/modules/integracoes src/modules/pedido-construcao src/modules/demandas src/jobs` — onde moram os testes de cada módulo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S receberPedido --name-only --format=%h` — os testes do recebimento
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S filtroDemandasSchema --format=%h --name-only -- src/modules/demandas/schemas.ts` — o filtro da listagem
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S validarCamposDeConstrucao --format=%h --name-only -- src/modules/especificacoes/schemas.ts` — a regra de campos da ESP
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S shasEntregues --format=%h --name-only` — quem usa a lista de hashes (fica)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/confirmacao-0019.test.ts src/app/api/demandas/visibilidade-agente-0019.test.ts src/app/api/demandas/criacao-awave.test.ts src/modules/agentes/executar-0019.test.ts src/modules/agentes/executar-awave.test.ts src/modules/agentes/gatilhos-awave-qa.test.ts src/modules/pedido-construcao/recebimento-0019.test.ts src/db/transacao-prazo.test.ts src/modules/integracoes/prazo-total-0019.test.ts src/app/api/demandas/criacao-awave-0019.test.ts scripts/criar-token-0019.test.ts` — rodada 1, sem código: 11 arquivos falharam, 54 falharam e 36 passaram
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só os testes novos e os três alterados
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/agentes/executar-0019.test.ts` — com o M-5 e sem o filtro do batimento: 1 falhou (o laço) e 9 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/confirmacao-0019.test.ts src/app/api/demandas/visibilidade-agente-0019.test.ts src/app/api/demandas/criacao-awave.test.ts src/modules/agentes/executar-0019.test.ts src/modules/agentes/executar-awave.test.ts src/modules/agentes/gatilhos-awave-qa.test.ts src/modules/pedido-construcao/recebimento-0019.test.ts src/db/transacao-prazo.test.ts src/modules/integracoes/prazo-total-0019.test.ts src/app/api/demandas/criacao-awave-0019.test.ts scripts/criar-token-0019.test.ts` — rodada 2, depois do código: 11 arquivos, 90 de 90
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — os arquivos da correção
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — suíte inteira, 1ª: 8 arquivos e 10 testes falharam (mudanças aprovadas e o seed), 293 arquivos e 6444 testes passaram
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S awaveEncerrada --format=%h --name-only -- scripts test src` — onde o seed encerra a demanda do Awave
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "encerrada" --format=%h -n 3 -- scripts/seed-ficticio.ts` — o commit da T15
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/seed-integracoes-qa.test.ts scripts/seed-integracoes.test.ts src/lib/reduzir-erro.test.ts test/estatico/projeto.test.ts src/modules/agentes/executar.bordas.test.ts src/modules/demandas/origem-qa.test.ts src/modules/demandas/origem.test.ts src/app/api/pedidos-construcao/recebimento-qa.test.ts` — os 8 arquivos ajustados: 147 de 147
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — suíte inteira, 2ª: 301 de 301 arquivos, 6454 de 6454 testes, código 0
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 37 arquivos rastreados, 580 linhas a mais e 118 a menos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 37 alterados e 8 testes novos, todos da correção

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa (301 arquivos, 6454 testes)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa (mais `batimento.ts` e `seed-ficticio.ts`, desvios 1 e 2, e os testes existentes da tabela, todos consequência direta das correções)
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (nenhuma rota ou job novo; as recusas novas usam `MENSAGEM_NAO_ENCONTRADO`, `MENSAGENS_RECEBIMENTO.shaDiferente`, `MENSAGEM_INDISPONIVEL` e `MENSAGEM_UM_DOS_DOIS`, todas fixas)
