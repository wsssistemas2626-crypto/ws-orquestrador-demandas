---
pedido: DEC-DEM-20261112-0019-v1
etapa: 02-triagem
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md, pedido.json, 01-qa-funcional.md, engenheiro-backend.md (lista Pode), qa-automacao.md (lista Pode), src/modules/demandas/consultas.ts, src/modules/demandas/confirmacao.ts, src/modules/demandas/confirmar.ts, src/modules/demandas/servico.ts, src/modules/especificacoes/servico.ts, src/modules/especificacoes/consultas.ts, src/modules/pareceres-risco/servico.ts, src/modules/pacotes-decisao/criar.ts, src/modules/versoes.ts, src/modules/integracoes/tempo-limite.ts, src/db/transacao.ts, src/db/index.ts, src/modules/pedido-construcao/receber.ts, src/modules/pedido-construcao/entregar.ts, src/modules/pedido-construcao/pendentes.ts, src/modules/pedido-construcao/conferir.ts, src/modules/agentes/executar.ts, src/modules/agentes/execucoes.ts, src/modules/agentes/gatilhos.ts, src/modules/agentes/entrada-agente.ts, src/lib/fila.ts, src/app/api/demandas/route.ts, src/app/api/demandas/[id]/route.ts, src/app/api/demandas/[id]/historico/route.ts, src/app/api/demandas/[id]/especificacoes/route.ts, src/app/api/demandas/[id]/pareceres-risco/route.ts, src/app/api/demandas/[id]/pacotes-decisao/route.ts, src/app/api/especificacoes/[espId]/route.ts, src/app/api/pareceres-risco/[rskId]/route.ts, src/app/api/pacotes-decisao/[decId]/route.ts, src/app/api/demandas/criacao-awave.test.ts, src/modules/agentes/executar-awave.test.ts, src/modules/agentes/gatilhos-awave-qa.test.ts, scripts/criar-token-servico.ts, e2e/integracoes.spec.ts]
status: pronto
proximo: engenheiro-backend
devolvido_para: null
---
## Entrega

Triagem dos oito achados reproduzidos na `01-qa-funcional.md`, sobre o ramo `construcao/DEC-DEM-20261112-0019-v1`
(base `d49de53`, 0.3.0). Confirmei por leitura todas as causas apontadas pela 01. Todas as correções ficam no lado
servidor (`src/`, `scripts/`, `package.json`): **engenheiro responsável: `engenheiro-backend`**, numa só
`03-correcao`. O B-1 mexe só em `e2e/`, que não está na lista **Pode** do engenheiro, e por isso vai para a
`04-regressao`.

As decisões P1 a P5 do maestro, que Fabiano autorizou, já estão aplicadas abaixo. Elas só endurecem os controles e
substituem, onde divergem, o texto da spec (404 em vez de 409 na criação; só o hash da última entrega).

**Ordem sugerida, pela dependência:** B-3 → M-1 → M-5 → M-4 → M-3 → M-2 → B-2 → versão. O helper do M-1 depende do
B-3, e o M-2 usa a transação com prazo do M-3. Cada item começa pelo teste que falha.

---

### B-3. `jaConfirmada` aceita evento de qualquer ator (faça primeiro)

**Causa:** `src/modules/demandas/confirmacao.ts:8-15` filtra o evento só por `acao`, `entidade` e `entidade_id`, sem
olhar o ator.
**Correção:** acrescente `eq(evento.atorTipo, 'pessoa')` no WHERE.
**Teste de regressão** (integração, em `confirmacao.test.ts` ou num novo `confirmacao-0019.test.ts`): demanda fictícia
do Awave, com o evento `demanda_confirmada` inserido pelo `poolMigrator` com `ator_tipo = 'sistema'` (e, num segundo
caso, `'agente'`). O teste exige:
- `jaConfirmada` = false e `aguardaConfirmacao` = true;
- `confirmarDemanda(deps, pessoa, id)` devolve `{ jaConfirmada: false }` e grava o evento da pessoa.

---

### M-1. O agente lê e escreve numa demanda do Awave não confirmada

**Causa:**
- Nenhum caminho de agente consulta a confirmação. A checagem existe só no gatilho e no worker.
- `lerDemandaPara` (`consultas.ts:385-388`) vai direto a `obterDemanda`.
- A listagem (`paginaDeDemandas`, `consultas.ts:430-458`) não filtra nada.
- Os três serviços de criação travam a demanda e seguem: `especificacoes/servico.ts:59`, `pareceres-risco/servico.ts:68`
  e `pacotes-decisao/criar.ts:136`.
- As seis rotas GET de ESP, RSK e DEC também entregam conteúdo de demanda não confirmada ao agente. Isso importa
  quando uma pessoa grava ESP ou RSK à mão antes de confirmar.

**Correção (P3 e P4):**
1. **Um helper só**, em `src/modules/demandas/confirmacao.ts`, ao lado de `aguardaConfirmacao`:
   `exigirVisivelPara(db: Db, ator: Ator, demandaId: string): Promise<void>`.
   - `pessoa`: não faz nada.
   - `agente` e `sistema`: com `aguardaConfirmacao(db, demandaId)` true, lança
     `new ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO)`, o mesmo erro de `travarDemanda` e `obterDemanda`
     para o id inexistente.
   - `integracao`: não faz nada. A integração tem filtros próprios: a matriz e a autoria no WHERE.
   - `default`: `atorDesconhecido`.

   A falha fechada vem do próprio `aguardaConfirmacao`: toda demanda com `autor_tipo = 'integracao'` sem confirmação de
   pessoa aguarda, qualquer que seja a integração (P4).
2. **Expressão SQL da mesma regra**, no mesmo arquivo, para a listagem: `condicaoVisivelAoAgente()`. A demanda entra
   se o `autor_tipo` não é `integracao` **ou** se existe evento `demanda_confirmada` da demanda com
   `ator_tipo = 'pessoa'`. Um teste confere que a expressão SQL e a função TS dão o mesmo resultado nos quatro casos:
   - pessoa;
   - Awave não confirmada;
   - Awave confirmada por pessoa;
   - Awave com evento de sistema.
3. **Leitura:**
   - Em `lerDemandaPara`, nos ramos `agente` e `sistema`, chame `exigirVisivelPara(deps.db, ator, id)` antes de
     `obterDemanda`. Para o id inexistente, `aguardaConfirmacao` dá false e `obterDemanda` responde o 404 de hoje.
   - Em `listarDemandasPara`, para quem não é pessoa, passe a `paginaDeDemandas` uma opção que acrescenta
     `condicaoVisivelAoAgente()` ao mesmo `onde`, usado tanto em `itens` quanto no `total`. `listarDemandas`, a do
     painel da pessoa, não muda.
   - Nas rotas `GET /api/demandas/[id]/especificacoes`, `/pareceres-risco` e `/pacotes-decisao`, chame
     `exigirVisivelPara(deps.db, ator, params.id)` antes de listar.
   - Nas rotas `GET /api/especificacoes/[espId]`, `/api/pareceres-risco/[rskId]` e `/api/pacotes-decisao/[decId]`,
     chame `exigirVisivelPara(deps.db, ator, v.demandaId)` logo depois de `obter*` e antes de montar a vista. O 404 sai
     igual ao do artefato inexistente.
4. **Criação (P3: 404, não 409):** nos três `criarComNomes`, chame `await exigirVisivelPara(tx, ator, demandaId)` logo
   depois de `travarDemanda`. A ordem importa:
   - **antes de `recusarSeDemandaFinal`**: a demanda final e não confirmada também dá 404, sem oráculo pelo 409 de
     status final;
   - **antes de `conferirLimite`**: o limite não é consumido.

   O worker grava pelos mesmos serviços com ator agente, e só chega ali com a demanda confirmada, então nada muda para
   ele.

**Testes de regressão** (integração, pela rota, com tokens fictícios gerados pelo teste):
- GET por id com o token `risco` numa demanda do Awave não confirmada: status, corpo `{ erro, mensagem }` e cabeçalhos
  idênticos aos do `DEM-20261112-9999` inexistente.
- `GET /api/demandas` com o mesmo token: a demanda não aparece em `itens` e o `total` não a conta. Faça também um caso
  com `limit` e `offset` na borda.
- POST de ESP, RSK e DEC com o token de agente: 404 idêntico ao da demanda inexistente, e nada gravado:
  - zero linhas em `especificacao_tecnica`, `parecer_risco` e `pacote_decisao`;
  - zero eventos;
  - zero execuções;
  - o contador do limite por ator igual ao de antes.
- Demanda do Awave não confirmada e já em status final: o agente recebe 404, e não o 409 de status final.
- As seis rotas GET de ESP, RSK e DEC, numa demanda não confirmada em que uma pessoa gravou ESP e RSK: 404 para o
  agente.
- Controle positivo: depois de `confirmarDemanda` por pessoa com 2FA, tudo como na 0.3.0. Pessoa vê e age antes e
  depois da confirmação.

**Mudança aprovada (P5, IN-16):** `src/app/api/demandas/criacao-awave.test.ts:259-269` (CA-10.6). Motivo: o M-1 da
0019 substitui o CA-10.6, com aprovação de Fabiano em 12/11.
- Não apague o teste nem as asserções.
- Antes da confirmação, ele passa a exigir o 404 igual ao do inexistente.
- Depois de uma pessoa confirmar, mantém as asserções de hoje: 200, a vista mínima, `responsavel` igual à integração,
  sem `solicitanteNome` e sem `anexos`.
- Escreva no comentário do teste: "mudança aprovada (M-1 da 0019, substitui o CA-10.6)".

---

### M-5. A guarda do worker olha a demanda errada e gasta a chave ao bloquear

**Causa:**
- (a) `executar.ts:236` e `:239` usam `exec.demandaId`, mas `montarEntrada` (`entrada-agente.ts:198-216`) lê a demanda
  pela `chaveEntrada`. As duas podem divergir, ou `demandaId` pode ser nulo.
- (b) O bloqueio chama `ignorar` (`executar.ts:179-193`), que encerra a execução como `ignorada`. Na confirmação,
  `criarExecucao` (`execucoes.ts:45-50`) bate no `onConflictDoNothing` de (agente, chave), devolve null e não envia
  job. O insumo nunca roda.

**Correção (P2):**
1. Crie, em `entrada-agente.ts`, a função exportada `demandaDaChave(db, agente, chaveEntrada): Promise<string | null>`,
   que lê só ids, nunca texto:
   - `orquestrador`: null;
   - `insumo_tecnico`: o id da chave (passa por `idDaChave`);
   - `risco`: o `demandaId` da ESP da chave;
   - `consolidacao`: o `demandaId` do RSK da chave;
   - ESP ou RSK inexistente: `nao_encontrado`.
2. Em `executarReivindicada`, antes da checagem de status final (linha 236), calcule `demandaDaEntrada`:
   - `nao_encontrado` → `falhar(c, 'entrada_nao_encontrada')`;
   - **agente diferente de `orquestrador` com `demandaDaEntrada` nulo, ou diferente de `exec.demandaId`** →
     `falhar(c, 'entrada_nao_encontrada')`. É a falha fechada: o provedor não é chamado, e `demandaDa(exec)` nos
     DESTINOS fica coerente com a entrada.

   Depois disso, as checagens de status final (M-02) e de confirmação (3c) usam `demandaDaEntrada`. Mantenha a ordem:
   status final antes da confirmação.
3. O bloqueio por falta de confirmação deixa de usar `ignorar`. Crie `adiarAteConfirmacao(c)` em `executar.ts`, com
   apoio de uma função nova em `execucoes.ts` (`devolverAPendenteSemJob`). Ela faz, numa transação:
   - UPDATE guardado por `daMesmaReivindicacao`, com `status: 'pendente'`, `tentativas: exec.tentativas - 1` (a
     tentativa do bloqueio não conta para `TENTATIVAS_MAXIMAS`), `bloqueadaAte: null`, `proximaTentativaEm: null` e
     `atualizadaEm`;
   - **sem enviar job**;
   - o mesmo evento de hoje: `agente_ignorado`, ator sistema, `depois: { agente, motivo: 'sem_confirmacao' }`. Assim o
     D-18, o texto fixo no histórico, continua valendo, e não precisa de ação nova.

   Sem DELETE: o papel do app não tem esse privilégio, e ele não deve ser dado. A coluna `tentativas` já tem UPDATE
   (`reivindicar` a altera).

   Acrescente o valor `'aguardando_confirmacao'` a `ResultadoExecucao` e devolva-o. Confira quem consome
   `ResultadoExecucao` no worker: o `typecheck` acusa `switch` não exaustivo.
4. Para reenfileirar na confirmação, crie `reenfileirarPendente(t, deps, agente, chaveEntrada)` em `execucoes.ts`:
   - `SELECT ... FOR UPDATE` da execução (agente, chave) com `status = 'pendente'` e `proxima_tentativa_em is null`;
   - se ela existir, `fila.enviar` pelo `t.executor`, com
     `singletonKey: chaveDoJob(agente, chave, tentativas + 1)` e payload só com `execucaoId`;
   - devolve o id, ou null.

   Em `gatilhos.ts`, crie `dispararOuReenfileirar(t, deps, agente, chave, demandaId)`, com as mesmas guardas de
   `dispararSeLigado` (confirmação, estado do agente, fila). Quando `criarExecucao` devolver null, ela chama
   `reenfileirarPendente`. `confirmarDemanda` (`confirmar.ts:57`) passa a chamar `dispararOuReenfileirar`, e os outros
   gatilhos não mudam.

   A fila `agente.executar` é `stately`: uma `singletonKey` igual à de um job concluído é aceita, e o job criado em
   duplicidade é descartado. A reivindicação condicional é a segunda barreira.

**Testes de regressão** (integração, com o `ProvedorFalso` e dados fictícios):
- Caso A: execução `insumo_tecnico` com `chave_entrada = demanda:<D1>` (Awave, não confirmada) e
  `demanda_id = <D2>` (de pessoa). Repita com `demanda_id = null`. O teste exige:
  - provedor não chamado;
  - zero `uso_ia`;
  - zero ESP em D1 e em D2;
  - execução `falhou`, com `falha_agente` e motivo `entrada_nao_encontrada`.
- Caso B: execução precoce em D3 (Awave, não confirmada). O teste exige:
  - `executarAgente` devolve `'aguardando_confirmacao'`;
  - a execução fica `pendente`, com as `tentativas` de antes da reivindicação;
  - nenhum job novo;
  - o provedor não é chamado.

  Depois, `confirmarDemanda` por pessoa. O teste exige:
  - um job `agente.executar` da execução;
  - uma passada do worker chama o provedor **uma vez** e grava **uma** ESP em D3;
  - a execução fica `concluida`.
- Confirmação com o insumo desligado: nada é enfileirado, e a execução continua `pendente`.
- Duas confirmações seguidas: um job só e uma chamada só ao provedor.

**Mudança aprovada (P5, IN-16):** em `src/modules/agentes/executar-awave.test.ts`, os testes das linhas 82-95 e 107-119
trocam `toBe('ignorada')`, no retorno e no `statusDa`, por `'aguardando_confirmacao'` e `'pendente'`. Motivo: o M-5 da
0019 não gasta a chave ao bloquear.
- As asserções de recusa ficam: provedor não chamado, zero uso, zero ESP e o evento `agente_ignorado` com
  `sem_confirmacao`.
- O teste "M-02 vem antes" (121-130) não muda.
- Vale o mesmo para `src/modules/agentes/gatilhos-awave-qa.test.ts:149`: o status `ignorada` vira `pendente`, e o resto
  fica (veja Pendências).

---

### M-4. Entrega e recebimento do mesmo DEC sob travas diferentes

**Causa:**
- O recebimento trava `pedido:<decId>` (`receber.ts:41`), e a entrega trava só a linha da demanda (`conferir.ts:60`).
  As duas não se esperam.
- Além disso, `receber.ts:46` aceita qualquer hash já entregue. Mesmo sem corrida, um hash antigo confirma depois de uma
  entrega nova (P1 da 01).

**Correção (P1):**
1. Em `entregarPedido` (`entregar.ts:35`), a primeira instrução dentro de `executarComOrcamento` é a mesma trava
   consultiva do recebimento. Extraia para uma função única em `pendentes.ts`, `travarPedido(tx, decId)`, que roda
   `select pg_advisory_xact_lock(hashtextextended(${'pedido:' + decId}, 0))` com a chave por parâmetro (G3.6). As duas
   usam essa função.
   - A ordem fica: trava do pedido → trava da demanda (dentro de `conferirEMontarPedido`).
   - O recebimento não trava a demanda, então não há inversão de ordem nem espera pela edição de pessoa.
2. Crie `ultimoShaEntregue(db, decId): Promise<string | null>` em `pendentes.ts`: o `depois->>'sha256'` do
   `pedido_entregue` de maior `id`, filtrado por `RE_SHA256`. O recebimento passa a seguir esta regra:
   - sem nenhuma entrega: 409 `naoEntregue`, como hoje;
   - `sha256 !== ultimo`, o que inclui o hash entregue antes e já substituído: 409 com a mensagem fixa
     `MENSAGENS_RECEBIMENTO.shaDiferente`, sem gravar nada. Não precisa de texto novo, e não revela se o hash já foi
     entregue;
   - igual ao último: segue com `recebidoComSha` e grava, como hoje.
3. Na entrega (`entregar.ts:40`), grave `pedido_entregue` quando `sha256 !== ultimoShaEntregue`, e não mais quando o
   hash não está na lista. Sem isso, a sequência X → Y → X não grava a última entrega X, e o recebimento de X levaria
   409 para sempre. A entrega repetida do mesmo hash continua sem gravar.

**Testes de regressão** (integração):
- Corrida: com uma barreira, a sessão A entrega Y sem commit; a sessão B recebe X, o hash antigo inserido pelo
  `poolMigrator`. O teste exige:
  - B espera A;
  - B recebe 409 com `shaDiferente`;
  - nenhum `pedido_recebido`;
  - o DEC continua em `listarPendentes`.
- Sem corrida: X entregue antes, Y entregue depois, recebimento de X → 409. Recebimento de Y → grava. Repetição de Y →
  `jaRecebido: true` e um evento só.
- Entrega repetida do mesmo hash: um `pedido_entregue` só (P-02, como hoje).
- Dois recebimentos simultâneos do mesmo hash: um evento só (IN-11, como hoje).

---

### M-3. O orçamento vale por instrução, não pela transação, e a espera por conexão não tem limite

**Causa:**
- `limitarTempo` (`tempo-limite.ts:24-38`) só aplica `SET LOCAL` por instrução.
- `comTransacao` (`transacao.ts:9`) espera `pool.connect()` sem prazo, e `criarPool` (`db/index.ts:12`) não tem
  `connectionTimeoutMillis`.

**Correção:**
1. Em `tempo-limite.ts`, exporte `PRAZO_TOTAL_MS = { padrao: 8_000, entrega: 12_000 } as const` e a função pura
   `prazoTotalDe(ator, orcamento): number | null`.
   - Integração: o prazo do orçamento.
   - Pessoa, agente e sistema: null.
   - `default`: `atorDesconhecido`.
2. `comTransacao(pool, fn, op?: { prazoMs?: number })`. Sem `prazoMs`, nada muda: pessoa, agente e sistema, como hoje.
   Com `prazoMs`, ela faz quatro coisas:
   - **Conexão:** `Promise.race` entre `pool.connect()` e um temporizador com o tempo que resta. Se o temporizador
     ganhar, lança `PrazoDaTransacaoEsgotado`, uma classe nova exportada de `transacao.ts`, e solta a conexão que
     chegar depois (`.then((c) => c.release())`), para o pool não vazar.
   - **Cada instrução:** a mesma conexão vai para `criarDb` e para o executor, embrulhada por um `Proxy` que intercepta
     `query`. Antes de cada instrução, ela calcula o tempo restante:
     - restante ≤ 0: lança `PrazoDaTransacaoEsgotado`;
     - restante menor que o piso em vigor: roda antes
       `select set_config('statement_timeout', $1, true), set_config('lock_timeout', $2, true)`, com os valores em
       milissegundos **por parâmetro**, nunca interpolados (G3.6).

     Os `SET LOCAL` de `limitarTempo` continuam como piso.
   - **Antes do COMMIT:** com o prazo vencido, lança, e o `catch` de hoje faz o ROLLBACK.
   - **Relógio:** use um relógio monotônico (`performance.now()`), injetável por parâmetro para o teste.
3. Em `executarComOrcamento`, quando abre a própria transação, passe `prazoMs: prazoTotalDe(ator, orcamento)`.
   `traduzirTempoEsgotado` passa a traduzir também `PrazoDaTransacaoEsgotado` para o 503 com `MENSAGEM_INDISPONIVEL`.
4. Não ponha `connectionTimeoutMillis` no pool: ele valeria para pessoa também, e a spec restringe o prazo à
   integração.

**Testes de regressão** (integração, com Postgres real e prazos curtos passados direto a `comTransacao`, para a suíte
não esperar 8 s):
- `prazoMs: 400` e três `select pg_sleep(0.2)` seguidos de um INSERT fictício. O teste exige:
  - `PrazoDaTransacaoEsgotado` em menos de cerca de 600 ms;
  - zero linhas;
  - a conexão devolvida ao pool.
- Pool com `max: 1`, a única conexão segura por outra chamada, e `comTransacao` com `prazoMs: 300`. O teste exige:
  - a rejeição dentro do prazo;
  - depois de soltar a conexão segurada, `pool.waitingCount === 0`, e o pool atende a chamada seguinte.
- Unitário: `prazoTotalDe` dá 8000 e 12000 para integração e null para pessoa, agente e sistema. O mesmo teste afirma
  `PRAZO_TOTAL_MS.padrao < 10_000` e `PRAZO_TOTAL_MS.entrega < 15_000`.
- Pela rota, com o ator `awave`: o `PrazoDaTransacaoEsgotado` vira 503 com `MENSAGEM_INDISPONIVEL`.
- Pessoa com a mesma carga lenta não recebe 503.

---

### M-2. O 201 do POST do Awave é lido depois do COMMIT

**Causa:**
- `criarDemanda` (`servico.ts:190-229`) devolve só o id da transação orçada e lê a vista inteira depois do COMMIT
  (linha 229), fora do `traduzirTempoEsgotado` e do prazo.
- A rota (`route.ts:10-13`) aplica `vistaDaDemandaPara` sobre a `DemandaVista` inteira, o que o D-16 proíbe para
  integração.

**Correção:**
- Para o ator integração, a vista de 6 chaves sai de dentro da transação orçada:
  `return obterDemandaDaIntegracao(tr.tx, ator, novoId)` no fim do corpo, sob o prazo do M-3. Nada é lido depois do
  COMMIT, e a integração nunca passa por `obterDemanda`.
- Sugestão de forma, a critério do engenheiro desde que tipada: `criarDemanda` com sobrecarga, que devolve
  `DemandaVistaDaIntegracao` para `AtorIntegracao` e `DemandaVista` para os outros. A rota POST escolhe pelo tipo do
  ator:
  - integração devolve a vista direto;
  - os outros passam por `vistaDaDemandaPara`, como hoje.
- Pessoa, agente e sistema seguem com a leitura de hoje.

**Testes de regressão** (integração):
- Com `vi.mock` parcial de `../demandas/consultas`, `obterDemandaDaIntegracao` lança uma vez `{ code: '57014' }`. O
  teste exige, pela rota com o token `awave`:
  - 503 com `MENSAGEM_INDISPONIVEL`;
  - zero `demanda` com `autor_id = 'awave'`;
  - zero `demanda_criada`.
- Com prazo esgotado (M-3) no meio da criação: 503 e nada gravado.
- O 201 de sucesso continua com exatamente as 6 chaves (IN-08).

---

### B-2. `executarCriarToken` sem `else` final

**Causa:** `scripts/criar-token-servico.ts:113-115`. Sem agente e sem integração, a função devolve 0 sem emitir nada.
**Correção:** `else throw new Error(...)`, com mensagem fixa e sem valor de argumento, ou uma função pura exportada que
decide o alvo com `switch` e `never`. O teste fica mais simples com a função pura.
**Teste de regressão:** a decisão com `{ agente: undefined, integracao: undefined }` lança, e
`executarCriarToken` / `rodarScript` não sai com 0. Nenhuma linha nova em `token_servico`.

---

### Versão

`package.json` com `"version": "0.3.1"`. Faz parte da `03-correcao`, porque `package.json` está na lista **Pode** do
engenheiro.

---

### B-1. `e2e/integracoes.spec.ts` sem `test.use({ trace: 'off' })`. Vai para a `04-regressao`

**Causa:** `playwright.config.ts:39` usa `trace: 'retain-on-failure'`, e o contexto de `integracoes.spec.ts:27-28` leva
o `authorization: Bearer` em `extraHTTPHeaders`. O irmão `integracoes-qa.spec.ts:29` já desliga o trace.
**Correção (qa-automacao, na 04):** `test.use({ trace: 'off' })` no topo do arquivo, como no irmão.
**Teste de regressão (qa-automacao, em `test/`):** um teste estático. Todo `e2e/*.spec.ts` que monta `Bearer` em
`extraHTTPHeaders` tem que declarar `test.use({ trace: 'off' })`.

---

### Definição de pronto do pedido, por etapa da cadeia curta

| Item | Etapa dona |
|---|---|
| `pnpm test`, `pnpm lint` e `pnpm typecheck` verdes | `03-correcao` (engenheiro-backend); conferido de novo na `04-regressao` |
| `pnpm test:e2e` verde, com o B-1 em `e2e/integracoes.spec.ts` e o teste estático do trace | `04-regressao` (qa-automacao) |
| Versão 0.3.1 no `package.json` | `03-correcao` (engenheiro-backend) |
| Seção 0.3.1 no `CHANGELOG.md` (e README e manual técnico, no que mudou) | `06-documentacao` (documentacao-tecnica) |
| PR com CI verde (e o `docker build`) | `05-entrega` (devops-sre) |

## Decisões tomadas

- Um engenheiro só, o `engenheiro-backend`: todos os arquivos tocados estão em `src/`, `scripts/` e `package.json`. Não
  há tela nem migration.
- B-1 vai para a `04-regressao`: `e2e/` não está na lista **Pode** do engenheiro, e a regra da triagem manda o `e2e/`
  para a etapa dona.
- M-1 com um helper só (`exigirVisivelPara` sobre `aguardaConfirmacao`), e a expressão SQL ao lado, testada contra
  ela. A listagem precisa filtrar no banco, para o `total` sair certo, e o teste de equivalência impede que as duas
  regras se separem.
- M-1 também nas seis rotas GET de ESP, RSK e DEC: o critério "agente recebe 404 ao ler" não fecha se o agente lê a ESP
  que uma pessoa gravou na demanda escondida. É mais restritivo e está dentro das decisões do maestro, que só
  endurecem.
- M-1 checa antes do status final e do limite: sem oráculo pelo 409 de status final, e sem consumo de limite.
- M-5 com volta a `pendente` e reenfileiramento na confirmação (P2), sem DELETE. A tentativa do bloqueio é devolvida,
  para não contar no `TENTATIVAS_MAXIMAS`. O evento `agente_ignorado`/`sem_confirmacao` fica, porque preserva o D-18 sem
  ação nova.
- M-5 com falha fechada para execução cuja chave aponta outra demanda: não há uso legítimo para a divergência, e assim
  os DESTINOS e a entrada ficam coerentes.
- M-4 com a trava consultiva `pedido:<decId>` nas duas operações, e não a da demanda no recebimento. Isso evita esperar
  pela edição de pessoa (o `lock_timeout` de 2 s virava 503) e não inverte a ordem de travas.
- M-4 com a entrega gravando sempre que o hash difere do último, e não "um por hash para sempre". É o que faz a "última
  entrega" ser de fato a última, na sequência X → Y → X.
- M-4 reusa a mensagem `shaDiferente`: o texto já pede para buscar de novo, e não precisa de texto novo para a
  ux-ui-design.
- M-3 com o prazo dentro de `comTransacao`, opcional, e não no pool: o prazo vale só para integração. O `set_config`
  com parâmetro mantém o G3.6, sem interpolação.

## Pendências

- O P5 nomeia só `executar-awave.test.ts` para o M-5, mas `src/modules/agentes/gatilhos-awave-qa.test.ts:149` também
  exige `status: 'ignorada'` na execução bloqueada. O motivo é o mesmo (M-5 da 0019), e a mudança só troca `ignorada`
  por `pendente`, mantendo provedor não chamado, uso zero e o evento. Peço ao maestro que registre esse arquivo na
  mesma "mudança aprovada". Se algum `e2e/` exigir o 200 do CA-10.6, a `04-regressao` registra do mesmo jeito.
- A ferramenta Grep não estava disponível nesta sessão. Li só com Read e não localizei todos os consumidores de
  `ResultadoExecucao` no worker. O `typecheck` da 03 acusa o `switch` não exaustivo, se houver.
- A 04 e o reteste devem conferir que nenhum teste de segurança da 0.3.0 foi apagado ou afrouxado (IN-16), fora as
  mudanças aprovadas acima.
- O `set_config` por parâmetro do M-3 é instrução nova em SQL. Fica para o olhar de segurança na `04-revisao`.
- O texto do `pedido.json` não traz instrução fora do escopo. Nada a registrar.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261112-0019-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -5` — topo `8ad4440` (01-reproducao) sobre `d49de53`

## Critério de pronto atendido

- [x] (02 triagem) `proximo` é um dos três engenheiros
- [x] (02 triagem) cada item da definição de pronto do pedido está atribuído a uma etapa da cadeia curta, pela lista da Entrega
