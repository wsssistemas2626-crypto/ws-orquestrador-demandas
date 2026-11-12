---
pedido: DEC-DEM-20261112-0019-v1
etapa: 01-reproducao
agente: qa-funcional
leu: [contrato-passagem.md, pedido.json, DEC-DEM-20261111-0016-v1/08-maestro.md, spec 2026-11-11-ws-orquestrador-demandas-integracoes-design.md (ADR-28, IN-11, IN-16), src/modules/demandas/consultas.ts, src/modules/demandas/servico.ts, src/modules/demandas/confirmacao.ts, src/modules/demandas/confirmar.ts, src/modules/especificacoes/servico.ts, src/modules/pareceres-risco/servico.ts, src/modules/pacotes-decisao/criar.ts, src/modules/integracoes/tempo-limite.ts, src/db/transacao.ts, src/db/index.ts, src/db/privilegios.ts, src/modules/pedido-construcao/receber.ts, src/modules/pedido-construcao/entregar.ts, src/modules/pedido-construcao/conferir.ts, src/modules/pedido-construcao/pendentes.ts, src/modules/versoes.ts, src/modules/agentes/executar.ts, src/modules/agentes/execucoes.ts, src/modules/agentes/gatilhos.ts, src/modules/agentes/entrada-agente.ts, src/app/api/demandas/route.ts, src/app/api/demandas/[id]/route.ts, src/app/api/demandas/[id]/historico/route.ts, src/app/api/demandas/[id]/especificacoes/route.ts, src/app/api/especificacoes/[espId]/route.ts, src/app/api/demandas/criacao-awave.test.ts, src/modules/agentes/executar-awave.test.ts, e2e/integracoes.spec.ts, e2e/integracoes-qa.spec.ts, playwright.config.ts, scripts/criar-token-servico.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Reprodução dos oito achados da revisão da 0.3.0 (M-1 a M-5, B-1 a B-3) sobre a `main` em `d49de53` (0.3.0). A
reprodução foi feita por leitura do código e dos testes que já existem. Esta etapa não tem Bash, então não rodei
nada. Cada roteiro abaixo foi escrito para virar o teste que "falha antes e passa depois", como a spec pede. Todos os
dados são fictícios: ids `DEM-20261112-9xxx`, nomes "Pessoa Ficticia", tokens gerados pelo próprio teste
(`criarTokenServico`, `tokenDeIntegracao`) e hashes como `"a".repeat(64)`.

**Severidade geral do pedido: média.** Nenhum achado derruba o sistema nem é explorável por quem está fora da empresa.
Sem token de produção emitido, as rotas de integração respondem 401. Um dos defeitos, o M-5, ainda não é alcançável no
fluxo normal.

---

### M-1. O agente lê e escreve numa demanda do Awave que ainda não foi confirmada (média)

**Por que média:** o texto livre que vem de fora chega a quem tem token de agente, e é gravado artefato de IA
(ESP/RSK/DEC) antes de uma pessoa confirmar. Isso quebra o D1 ("até uma pessoa confirmar, nenhum agente de IA
trabalha nela"). Para acontecer, é preciso um token de agente legítimo.

**Pré-condição:** banco de teste com a migration 0007, o token da integração `awave` e um token de agente (`risco`).

**Passos:**
1. Com o token `awave`, `POST /api/demandas` com o corpo fictício `{ titulo: "Relatório fictício", tipo: "melhoria",
   solicitanteNome: "Awave", solicitantePapel: "outro", descricaoProblema: "Texto fictício.", contexto: "Aberta pelo
   teste." }`. Anote o `id`. A demanda **não** é confirmada.
2. Com o token `risco`, `GET /api/demandas/<id>`.
3. Com o mesmo token, `GET /api/demandas?origem=awave` (e também sem filtro).
4. Com o mesmo token, `POST /api/demandas/<id>/especificacoes` com uma ESP válida sem dúvida em aberto.
5. Com o mesmo token, `POST /api/demandas/<id>/pareceres-risco` com um RSK válido.
6. Com o mesmo token, `POST /api/pacotes-decisao` (ou a rota de DEC da demanda) com um DEC válido.
7. Para comparar: repita o passo 2 com um id que não existe (`DEM-20261112-9999`).

**Resultado esperado (spec da 0019):**
- Passo 2: o mesmo 404 do passo 7, com o mesmo corpo `{ erro, mensagem }` e sem diferença de texto.
- Passo 3: a demanda não aparece em `itens`, e o `total` não a conta.
- Passos 4 a 6: 409 com mensagem fixa, nenhuma linha nova em `especificacao_tecnica`, `parecer_risco` ou
  `pacote_decisao`, nenhum evento, nenhuma execução nem job, e o limite por ator não é consumido.
- Depois de uma pessoa com 2FA confirmar, os passos 2 a 6 se comportam como na 0.3.0.

**Resultado obtido (0.3.0):**
- Passo 2: 200 com a vista mínima. O texto de `contexto` e `descricaoProblema` vem minimizado, mas inteiro. Hoje o
  próprio teste `src/app/api/demandas/criacao-awave.test.ts:259-269` (CA-10.6) **exige** esse 200.
- Passo 3: a demanda aparece, com o título minimizado.
- Passos 4 e 5: 201, e a ESP ou o RSK é gravado com `rascunhoAgente: true`. O `dispararSeLigado` do fim não cria
  execução, porque o gatilho confere a confirmação, mas o artefato fica gravado.
- Passo 6: 201, desde que existam ESP e RSK. O DEC nasce e a demanda vai a `pronta_para_decisao`.

**Arquivos suspeitos:**
- `src/modules/demandas/consultas.ts:377-392`: `lerDemandaPara`. Os ramos `agente`/`sistema` (386-388) vão direto a
  `obterDemanda` + `vistaDaDemandaPara`, sem `aguardaConfirmacao`.
- `src/modules/demandas/consultas.ts:324-337`: `vistaDaDemandaPara`, caso `agente` (328-330).
- `src/modules/demandas/consultas.ts:430-458` e `483-497`: `paginaDeDemandas` e `listarDemandasPara`, sem filtro de
  confirmação para agente. O `total` (linha 456) também precisa sair sem a demanda escondida.
- `src/modules/especificacoes/servico.ts:55-63`: depois de `travarDemanda` (59), não há recusa para agente.
- `src/modules/pareceres-risco/servico.ts:63-70`: o mesmo.
- `src/modules/pacotes-decisao/criar.ts:130-138`: o mesmo.
- `src/modules/demandas/confirmacao.ts:19-34`: `aguardaConfirmacao` trata **qualquer** integração como "aguarda",
  enquanto `confirmar.ts:27-40` (`ehDoAwave`) só confirma a `awave`. Veja Pendências (B-5 do 0016).

---

### M-2. O 201 do POST do Awave é lido depois do COMMIT, fora do orçamento de tempo (média)

**Por que média:** com o banco lento ou o pool cheio, o Awave desiste em 10 s e repete o pedido, e a demanda fica
duplicada. Quem usa vê duas demandas iguais. Além disso, o erro de tempo depois do COMMIT não vira 503: sai como 500,
mesmo com a demanda já gravada.

**Passos:**
1. Teste de integração com o token `awave` (ou `criarDemanda(deps, atorAwave, corpoFicticio)` direto).
2. Faça a leitura depois do COMMIT falhar ou demorar. Há duas formas determinísticas:
   - a) espionar `obterDemanda`, que é chamado em `servico.ts:229`, para lançar um erro com `code: '57014'`;
   - b) pool com `max: 1`, ocupar a única conexão logo depois do COMMIT e soltar só depois de 10 s.
3. Conte as linhas de `demanda` com `autor_id = 'awave'` e os eventos `demanda_criada`.

**Resultado esperado:** a vista de 6 chaves é montada dentro da transação orçada (`tr.tx`, ou a partir de `novoId`,
`campos` e `agora`). Qualquer estouro dentro dela vira 503 com `MENSAGEM_INDISPONIVEL` e não grava nada (zero
demandas, zero eventos). Nada é lido depois do COMMIT.

**Resultado obtido:**
- a) A demanda e o evento ficam gravados (1 e 1), e a rota responde com o erro bruto (500), não 503. O
  `traduzirTempoEsgotado` só envolve o `comTransacao`.
- b) A resposta passa de 10 s, porque `pool.connect()` não tem limite (veja M-3). O cliente desiste com a demanda já
  gravada; a nova tentativa cria a 2ª demanda.

**Arquivos suspeitos:**
- `src/modules/demandas/servico.ts:190-229`: `naTransacaoDaCriacao` devolve só o id, e a linha 229
  (`return obterDemanda(t?.tx ?? deps.db, id)`) lê fora da transação, com a vista inteira.
- `src/app/api/demandas/route.ts:10-13`: o POST aplica `vistaDaDemandaPara` sobre a `DemandaVista` inteira.
- `src/modules/demandas/consultas.ts:345-373`: `vistaDaIntegracao` e `obterDemandaDaIntegracao(db, ator, id)`, o
  ponto indicado para a correção.

---

### M-3. O orçamento de tempo vale por instrução, não pela transação, e a espera pela conexão não tem limite (média)

**Por que média:** sem um prazo total, o servidor pode continuar trabalhando e gravar depois que o cliente já
desistiu. É a mesma porta da duplicata do M-2, e vale também para o /construir.

**Passos:**
1. Chame `executarComOrcamento(pool, atorAwave, 'padrao', undefined, corpo)` com um `corpo` que roda três vezes
   `select pg_sleep(4)` e depois um INSERT fictício.
2. Repita com o orçamento `'entrega'` e o ator `construir`: dois `select pg_sleep(9)` seguidos de um INSERT.
3. Pool com `max: 1`: segure a única conexão em outra chamada e chame `executarComOrcamento` com o ator `awave`.

**Resultado esperado (spec da 0019):**
- Passo 1: ROLLBACK e 503 em no máximo 8 s, sem o INSERT.
- Passo 2: ROLLBACK e 503 em no máximo 12 s.
- Passo 3: 503 em no máximo 8 s, com a espera pela conexão contada dentro do prazo.
- Os `SET LOCAL` de hoje continuam como piso.
- Pessoa, agente e sistema não ganham prazo total.

**Resultado obtido:**
- Passo 1: conclui com sucesso em cerca de 12 s, com o INSERT gravado. Cada instrução fica abaixo do
  `statement_timeout` de 5 s.
- Passo 2: conclui em cerca de 18 s (cada instrução fica abaixo de 10 s), passando dos 15 s do cliente.
- Passo 3: espera sem fim (até a conexão ser liberada). Não há `connectionTimeoutMillis`.

**Arquivos suspeitos:**
- `src/modules/integracoes/tempo-limite.ts:24-38` (`limitarTempo`, só SET LOCAL por instrução) e `49-65`
  (`executarComOrcamento`).
- `src/db/transacao.ts:9`: `pool.connect()` sem limite.
- `src/db/index.ts:12`: `new pg.Pool({ ..., max, statement_timeout: 10_000 })`, sem `connectionTimeoutMillis`.

---

### M-4. A entrega e o recebimento do mesmo DEC usam travas diferentes (média)

**Por que média:** o DEC sai da lista de pendentes com o recebimento de um hash antigo. A entrega nova fica sem
confirmação e o /construir não a busca de novo. Para acontecer, é preciso haver dois hashes para o mesmo DEC, e na
prática isso só ocorre quando a montagem ou a serialização muda entre versões (os artefatos citados são imutáveis).

**Pré-condição:** a demanda fictícia de pessoa, com ESP, RSK e DEC aprovado e `pedido_gerado` por pessoa (o seed do e2e
tem uma). Grave à mão, pelo `poolMigrator`, um `pedido_entregue` com `depois: { sha256: "a".repeat(64) }`. Esse é o
"hash antigo" X.

**Passos:**
1. Sessão A: abra uma transação (`comTransacao`) e chame `entregarPedido(deps, atorConstruir, decId, tA)`. Ela trava
   a linha da demanda e grava `pedido_entregue` com o hash atual Y. **Não faça o commit ainda** (use uma barreira).
2. Sessão B, ao mesmo tempo: `receberPedido(deps, atorConstruir, decId, "a".repeat(64))`.
3. Solte a barreira e faça o commit de A.
4. Consulte os eventos `pedido_recebido` do DEC e `listarPendentes`.

**Resultado esperado (spec da 0019):** B espera A na mesma trava e só lê os hashes entregues depois de travar. Pelo
critério "o recebimento nunca grava hash antigo depois de entrega nova", B não grava `pedido_recebido` com X, e o
DEC continua pendente até alguém confirmar Y.

**Resultado obtido:**
- B não espera A: a trava é consultiva em `pedido:<decId>` (`receber.ts:41`), e a de A é a linha da demanda
  (`conferir.ts:60`).
- B lê `[X]`, aceita X e grava `pedido_recebido` com X.
- Depois do commit de A, existe `pedido_entregue` Y sem recebimento, e o DEC já saiu de `listarPendentes` (o NOT EXISTS
  de `pendentes.ts:43-48` vale para qualquer recebimento).

**Atenção:** existe um caminho sem corrida que dá o mesmo resultado. A entrega Y faz o commit primeiro, e depois
chega o recebimento X. O `shasEntregues` devolve `[X, Y]`, e `receber.ts:46` aceita **qualquer** hash já entregue.
Só igualar as travas não fecha esse caso. Veja Pendências.

**Arquivos suspeitos:**
- `src/modules/pedido-construcao/receber.ts:38-48`: a trava em 41 e o `find` sobre todos os hashes em 46.
- `src/modules/pedido-construcao/entregar.ts:33-48`: não tem trava própria. Quem trava é `conferirEMontarPedido`.
- `src/modules/pedido-construcao/conferir.ts:58-60`: `travarDemanda`.
- `src/modules/pedido-construcao/pendentes.ts:75-83` (`shasEntregues`) e `43-48` (critério de pendente).

---

### M-5. A guarda do worker confere a demanda errada e gasta a chave única ao bloquear (média, latente)

**Por que média:** a guarda é a defesa em profundidade do D1, e tem dois furos.
- Ela pode deixar passar texto de demanda não confirmada ao provedor de IA.
- Quando bloqueia, a confirmação posterior nunca dispara o insumo técnico, e a pessoa fica sem insumo, tendo de
  preencher à mão.

Hoje o defeito é inalcançável no fluxo normal: só o `dispararSeLigado` cria execução, e ele já confere a confirmação.

**Passos (caso A: a guarda olha a demanda errada):**
1. Crie uma demanda fictícia do Awave **não confirmada** (D1) e uma demanda fictícia de pessoa (D2).
2. Ligue o `insumo_tecnico` com o modelo fictício e o preço vigente, como em `executar-awave.test.ts`.
3. Insira à mão uma execução `insumo_tecnico` com `chave_entrada = "demanda:<D1>"` e `demanda_id = <D2>` (variação:
   `demanda_id = null`).
4. Chame `executarAgente(deps, execId)` com o `ProvedorFalso`.

**Resultado esperado:** a guarda confere a demanda que `montarEntrada` lê pela `chaveEntrada` (D1) e bloqueia. Se o
agente não for `orquestrador` e não houver demanda, a guarda falha fechada. O provedor não é chamado e nada vai para
`uso_ia`.

**Resultado obtido:** a guarda de `executar.ts:239` olha `exec.demandaId` (D2, ou null), não bloqueia, e
`montarEntrada` (`entrada-agente.ts:198-216`) lê D1 pela chave. O texto de D1 vai ao provedor, e uma ESP é gravada em
D1.

**Passos (caso B: a chave é gasta):**
1. Demanda fictícia do Awave não confirmada (D3). Com o `insumo_tecnico` ligado, insira uma execução precoce com
   `chave_entrada = "demanda:<D3>"` e `demanda_id = <D3>`, como `novaExecucao` faz em
   `executar-awave.test.ts:82-95`.
2. `executarAgente`: a execução é bloqueada (`sem_confirmacao`).
3. Uma pessoa com 2FA confirma D3 (`confirmarDemanda`).
4. Conte as execuções e os jobs `agente.executar` da chave `demanda:<D3>`, rode o worker e conte as chamadas ao
   provedor e as ESP de D3.

**Resultado esperado (spec da 0019):** o bloqueio não gasta a chave. Depois da confirmação, o insumo técnico roda uma
vez só: uma chamada ao provedor e uma ESP.

**Resultado obtido:**
- No passo 2, a execução fica `ignorada` (`ignorar` → `encerrar`, `executar.ts:179-193`).
- No passo 3, `dispararSeLigado` chama `criarExecucao`, que bate no `onConflictDoNothing` de (agente, chave_entrada)
  (`execucoes.ts:45-50`), devolve null e **não envia job**.
- Resultado: zero chamadas ao provedor e zero ESP. O insumo nunca roda.

**Arquivos suspeitos:**
- `src/modules/agentes/executar.ts:239` (a guarda), `179-193` (`ignorar`) e `243` (`montarEntrada` pela chave).
- `src/modules/agentes/entrada-agente.ts:85-90` e `198-216`: de onde sai a demanda real da entrada.
- `src/modules/agentes/execucoes.ts:39-53`: `criarExecucao` não reenfileira uma execução que já existe.
- `src/modules/demandas/confirmar.ts:57`: o disparo da confirmação.
- `src/db/privilegios.ts:57-61`: `execucao_agente` só tem SELECT, INSERT e UPDATE de colunas ("não é apagada").
  Veja Pendências.

---

### B-1. `e2e/integracoes.spec.ts` sem `test.use({ trace: 'off' })` (baixa)

**Por que baixa:** só o token do e2e local (descartável) pode parar em `test-results/`, e só quando um teste falha.

**Passos:**
1. No e2e local, faça falhar de propósito um teste de `e2e/integracoes.spec.ts`, por exemplo o `expect` de status do
   CA-09.1.
2. Rode `pnpm test:e2e` e abra o `trace.zip` desse teste em `test-results/`.

**Resultado esperado:** nenhum trace desse arquivo, como no irmão `e2e/integracoes-qa.spec.ts:29`.

**Resultado obtido (pela leitura):** `playwright.config.ts:39` tem `trace: 'retain-on-failure'`, e o arquivo não
desliga o trace. O contexto criado em `integracoes.spec.ts:27-28` leva `authorization: Bearer <token>` em
`extraHTTPHeaders`. Falta confirmar, rodando, que o trace do contexto criado por `request.newContext` guarda o
cabeçalho. A `qa-automacao` faz isso na 04.

**Arquivo suspeito:** `e2e/integracoes.spec.ts:11-28`.

---

### B-2. `executarCriarToken` sem `else` final (baixa)

**Por que baixa:** hoje o caso é inalcançável, porque o `superRefine` de `criar-token-servico.ts:31-37` recusa "nenhum
dos dois". Se a validação regredir, o script sai com 0 sem emitir token, e quem opera acha que o token existe.

**Passos:** chame `executarCriarToken(deps, [], saida)` com `lerArgumentos` trocado por um dublê que devolva
`{ agente: undefined, integracao: undefined }`.

**Resultado esperado:** lança um erro, e o código de saída não é 0. Também vale `switch` com `never`.

**Resultado obtido:** devolve 0, sem linha em `token_servico` e sem nada na `saida`.

**Arquivo suspeito:** `scripts/criar-token-servico.ts:111-116`.

---

### B-3. `jaConfirmada` aceita `demanda_confirmada` de qualquer ator (baixa)

**Por que baixa:** só `confirmar.ts` grava esse evento, sempre com a pessoa, então hoje é defesa em profundidade.

**Passos:**
1. Demanda fictícia do Awave não confirmada.
2. Pelo `poolMigrator`, insira o evento `demanda_confirmada` com `ator_tipo = 'sistema'` (variação: `'agente'`).
3. Chame `jaConfirmada`, `aguardaConfirmacao` e `confirmarDemanda(deps, pessoa, id)`.

**Resultado esperado:**
- `jaConfirmada` = false e `aguardaConfirmacao` = true.
- A confirmação da pessoa grava o próprio evento e dispara o insumo.

**Resultado obtido:**
- `jaConfirmada` = true e `aguardaConfirmacao` = false: os gatilhos e o worker passam a aceitar a demanda.
- `confirmarDemanda` responde `{ jaConfirmada: true }` sem gravar a pessoa.

**Arquivo suspeito:** `src/modules/demandas/confirmacao.ts:8-15`.

---

### Testes de hoje que codificam o comportamento a corrigir (para a triagem e para o IN-16)

- `src/app/api/demandas/criacao-awave.test.ts:259-269` (CA-10.6) exige 200 para o agente na demanda não
  confirmada. A 0019 substitui o CA-10.6 com a aprovação de Fabiano em 12/11. O teste muda de sentido (passa a exigir
  404), o que aperta o controle em vez de afrouxá-lo. Mesmo assim, a contagem de asserções do IN-16 vai acusar a
  mudança, e ela precisa ficar registrada como substituição aprovada.
- `src/modules/agentes/executar-awave.test.ts:82-119` e `gatilhos-awave-qa.test.ts:134-151` exigem
  `statusDa(id) === 'ignorada'` e o evento `agente_ignorado`/`sem_confirmacao`. Se a correção do M-5 devolver a
  execução a `pendente`, essas asserções mudam. A recusa (provedor não chamado, zero uso, zero ESP) tem de continuar
  exigida.

### Casos exploratórios sugeridos para a 04 e para o reteste

- M-1:
  - 404 do agente idêntico ao do inexistente no corpo e nos cabeçalhos, e sem diferença perceptível de tempo.
  - A listagem com `limit`/`offset` na borda, para a demanda escondida não deixar página com buraco nem `total`
    diferente.
  - Demanda do Awave não confirmada **e** em status final: qual erro vem primeiro, 409 da confirmação ou 409 do status
    final.
  - Ator `sistema` (hoje cai no mesmo ramo do agente).
  - Pessoa sem 2FA continua barrada como hoje.
- M-1, outras rotas de leitura que o agente alcança e que a spec não lista:
  - `GET /api/demandas/<id>/especificacoes`, `/pareceres-risco` e `/pacotes-decisao`;
  - `GET /api/especificacoes/<espId>`, `/api/pareceres-risco/<rskId>` e `/api/pacotes-decisao/<decId>`.
  - Elas importam numa demanda não confirmada em que uma **pessoa** criou ESP/RSK à mão (B-7 do 0016): o agente lê esse
    conteúdo? Na lista vazia, a resposta é igual à da demanda inexistente?
- M-2/M-3:
  - Prazo total estourando no meio do `nextval`: a sequência avança, mas a demanda não é gravada. Conferir que o id
    "pulado" não quebra nada.
  - Pessoa e agente criando demanda com o banco lento: não podem receber 503.
- M-4:
  - Dois recebimentos simultâneos do mesmo hash: gravam um evento só, como hoje.
  - Recebimento sob a trava da demanda com uma pessoa editando a demanda ao mesmo tempo: o `lock_timeout` de 2 s pode
    virar 503 para o /construir.
- M-5:
  - Reenfileirar a execução que voltou a `pendente` usa a mesma `singletonKey` `t1` do job precoce (já concluído).
    Conferir que o pg-boss aceita.
  - Conferir também que a tentativa gasta no bloqueio não conta para `TENTATIVAS_MAXIMAS`.

## Decisões tomadas

- Severidade média para M-1 a M-5 e baixa para B-1 a B-3, pelo impacto em quem usa: duplicata, texto de fora indo à IA
  antes da confirmação, insumo que não roda. O M-5 fica marcado como latente por ser inalcançável no fluxo de hoje.
- Reproduzi por leitura de código e testes, não por execução. O agente não tem Bash nesta etapa, e cada roteiro já sai
  no formato do teste que a 03/04 escreve.
- B-4 a B-7 do 0016 ficaram fora do pedido e não foram reproduzidos. Só aparecem onde tocam M-1 e M-4.

## Pendências

- **P1 (M-4, critério ambíguo, para tech-lead e analista-requisitos na triagem):** a correção da spec (mesma trava e
  leitura depois de travar) só ordena as duas operações. Com as travas iguais, o caso "entrega Y com commit, depois
  recebimento X" continua gravando X, porque `receber.ts:46` aceita qualquer hash já entregue. Para cumprir "o
  recebimento nunca grava hash antigo depois de entrega nova", é preciso decidir se o recebimento aceita só o hash da
  entrega mais recente, e qual é a resposta para o antigo (409 `shaDiferente`?). Também é preciso confirmar que isso não
  contraria o IN-11.
- **P2 (M-5, restrição de implementação):** "a execução é removida" exige DELETE em `execucao_agente`, que o papel do
  app não tem (`privilegios.ts:57-61`). Mudar isso pede alteração de privilégio, e a spec diz "sem migration nova". O
  caminho viável parece ser "volta a pendente", e ele não basta sozinho: a confirmação passa por `criarExecucao`, que
  ignora a execução que já existe e não envia job. A confirmação precisa reenfileirar a execução pendente da chave.
- **P3 (M-1, observação para Fabiano, não bloqueia):** o GET responde 404 para não revelar existência, mas criar
  ESP/RSK/DEC responde 409, enquanto a demanda inexistente dá 404 no mesmo POST. Assim, um token de agente consegue
  saber que a demanda existe e aguarda confirmação. Isso foi decidido na spec aprovada em 12/11. Registro só para
  ciência.
- **P4 (M-1, escopo do helper):** `aguardaConfirmacao` vale para qualquer autoria de integração, e `confirmarDemanda`
  só confirma a `awave` (B-5 do 0016). Se a M-1 usar `aguardaConfirmacao`, uma demanda de outra integração ficaria
  escondida do agente para sempre. Hoje a matriz impede essa criação. A triagem deve escolher o helper com consciência
  disso.
- **P5 (IN-16):** as mudanças nos testes citados na seção "Testes de hoje que codificam o comportamento a corrigir"
  precisam ficar registradas como substituição aprovada (CA-10.6) ou ajuste de estado (M-5), para não serem lidas como
  afrouxamento.
- O texto do `pedido.json` não traz instrução fora do escopo. Nada a registrar.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (01) os passos de reprodução estão completos e o resultado obtido está descrito
