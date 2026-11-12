# ws-orquestrador-demandas — spec consolidada da 0.4.0: andamento do Pedido de Construção registrado pelo `/construir`

Pedido `DEC-DEM-20261111-0017-v1` (DEM-20261111-0017, `melhoria`, risco **médio**), consolidado em 12/11/2026 a
partir das entregas da pasta `docs/construcao/DEC-DEM-20261111-0017-v1/`: `01-analista-requisitos.md`,
`02-arquiteto-solucoes.md`, `03-ux-ui-design.md` e `04-seguranca-aplicacao.md`, e do `pedido.json`. Esta spec resume
e amarra as quatro; o detalhe (critérios Dado/Quando/Então, wireframes, STRIDE por componente) fica nelas. Cada bloco
cita a origem entre parênteses: (01, RF-05), (02, ADR-30), (03, 5.2), (04, AN-03). Onde duas entregas divergem, a
seção 7.3 diz o que vale ou quem decide.

## 1. Objetivo

Hoje o andamento real de um pedido só existe no `/construir` (passagens e plano). No Orquestrador, `em_construcao` é
marcado à mão e não há dado de progresso: quem olha a fila não sabe em que fase o pedido está, e o Awave não tem o que
responder ao cliente (pedido.json, demanda).

- **O que entra**: o `/construir` informa a fase e as tarefas prontas de cada Pedido de Construção que nasceu no
  painel. O Orquestrador guarda o último andamento na demanda, mostra na fila e no detalhe, faz duas mudanças de status
  automáticas e entrega ao Awave uma leitura reduzida do andamento (01, seção 0).
- **Contrato fixo do lado de lá**: o envio do `/construir` está pronto e desligado (`ferramentas/construir/enviar-andamento.mjs`
  e `lib/andamento.mjs`, commit aa01e2d, CA-F-04). Ele define a rota e não muda (01, seção 4 e RNF-07).
- **Opção aprovada no DEC** (Fabiano, como CTO, 11/11/2026): andamento registrado pelo token `construir` da 0.3.0;
  **A1** `entregue` sempre de pessoa; **A2** evento só na mudança de fase ou status; **A3** pedido escrito direto, sem
  demanda gerada no painel, fica sem andamento (404) (pedido.json, decisão).
- **O que não muda**: nenhum controle existente é afrouxado (C-09, C-10, C-11, C-15, C-17, C-30, C-34, C-36, IN-01 a
  IN-18, axe); o token `construir` não muda de emissão; o Awave não muda (pedido.json, risco; 01, RNF-07 e RNF-08).
- **Base e versão**: a ESP fala na 0.3.0; vale a `main` em `0ac099a`, versão **0.3.1**, porque é a `main` atual e nada
  nela muda o contrato do andamento. Sai como **0.4.0** (01, seção 0 e Decisões; 04, Entrega). Migration só aditiva.
  Deploy, migration em produção e a troca de `"andamento_ligado"` são ações de Fabiano depois do merge.

**Definição de pronto** (pedido.json): `pnpm test`, `pnpm lint` e `pnpm typecheck` verdes; `pnpm test:e2e` verde três
vezes seguidas; migration aditiva com ensaio de rollback aprovado; manual técnico (cap. 05) e `docs/operacao`
atualizados; CHANGELOG e `package.json` na 0.4.0.

## 2. Requisitos e critérios de aceite

13 requisitos funcionais e 10 não funcionais, com os critérios Dado/Quando/Então em `01-analista-requisitos.md`,
seções 2 e 3. Os ids RF-NN, RNF-NN e CA-NN.n são **deste pedido**; requisito do sistema é citado pelo capítulo do
manual ou pelo id da 0.3.x (ex.: "RF-14 da 0.3.0", "IN-10") (01, seção 0).

Termos usados abaixo (01, seção 1): **`statusConstrucao`** é o campo `status` do corpo (`em_construcao`, `construido`,
`cancelado`) e **não** é o status da demanda; **pedido gerado** é DEC com evento `pedido_gerado` cujo ator é pessoa
(IN-10); **DEC vigente** é o aprovado que não foi substituído; **mesmo estado** é `decId`, `fase`, `tarefasProntas`,
`tarefasTotal` e `statusConstrucao` iguais aos gravados; **mudança de marco** é o primeiro andamento ou `fase`,
`statusConstrucao` ou `decId` diferente do gravado.

### 2.1 Requisitos funcionais

| RF | Resumo | Critérios |
|---|---|---|
| RF-01 | Ação nova `registrar_andamento` na matriz, linha sem pessoa e sem agente, só `integracoes = ['construir']`. Nenhuma outra linha muda. O `construir` fica com exatamente quatro ações; o `awave`, com duas. Nenhuma Server Action chama a ação | CA-01.1 a CA-01.6 |
| RF-02 | `POST /api/pedidos-construcao/<DEC-id>/andamento`, Bearer, sem `Origin`. Corpo fechado com **exatamente** `fase` (seis), `tarefasProntas`, `tarefasTotal` (inteiros JSON, `0 <= prontas <= total <= 999`) e `status` (três). JSON válido fora do formato → 422 `nao_processavel`, sem eco, **antes** de olhar o DEC. Recusas do `rota()` como hoje (404 regex, 400, 415, 413, cookie com Bearer 400). Aceito → 204 sem corpo, `no-store`, `nosniff`. `tarefasTotal = 0` é aceito | CA-02.1 a CA-02.7 |
| RF-03 | Só DEC com pedido gerado. Inexistente, sem `pedido_gerado` e gerado por não pessoa dão **o mesmo 404** byte a byte, sem gravar. O pedido escrito direto (A3) cai aqui | CA-03.1 a CA-03.4 |
| RF-04 | Último andamento guardado na demanda: `decId`, `fase`, `tarefasProntas`, `tarefasTotal`, `statusConstrucao`, `atualizadoEm` (relógio injetado). Mesmo estado → 204 sem gravar, sem evento, sem mudar `atualizadoEm`. Os números podem diminuir (replanejamento). Gravar andamento sem mudar status não toca `demanda.atualizadaEm`. Valor lido fora do esquema = "sem andamento", sem 500 | CA-04.1 a CA-04.6 |
| RF-05 | Só duas transições automáticas, com origem fixa: `em_construcao` com a demanda em `aprovada` → `em_construcao` (salvo tipo `estudo`, que só grava); `cancelado` com a demanda em `em_construcao` → `devolvida`. `construido` nunca muda o status. DEC não vigente → 409. Contradição com status final → 409 (tabela da seção 5 de 01). Mudança grava `status_alterado` pelo ator `construir` com prefixo, na mesma transação. `MANUAIS` não muda. Ordem: pedido gerado (404) → mesmo estado (204) → DEC não vigente (409) → status final (409) → limite (429) → grava | CA-05.1 a CA-05.11 |
| RF-06 | Evento novo `andamento_registrado` (`entidade = 'pacote_decisao'`, `entidadeId = DEC`), ator `construir` com prefixo, só na mudança de marco (A2). `depois` com exatamente `fase`, `tarefasProntas`, `tarefasTotal`, `statusConstrucao`; `antes` igual ou `null`. Ciclo de 20 tarefas → no máximo 7 eventos | CA-06.1 a CA-06.6 |
| RF-07 | Demanda em `em_construcao` com andamento do DEC vigente em `construido`: Próxima ação nova pedindo a uma pessoa que confira e marque Entregue, com link para Mudar status; avaliada antes da linha 11 | CA-07.1 a CA-07.3 |
| RF-08 | Selo de fase na fila (tabela e cartões), só com a demanda em `em_construcao` e com andamento: rótulo da fase e " · x/y" quando `tarefasTotal > 0`; texto próprio para `construido`. Sem filtro novo; texto, não só cor | CA-08.1 a CA-08.5 |
| RF-09 | Detalhe mostra, quando há andamento: DEC (link), fase, situação, "x de y tarefas" com barra acessível quando `tarefasTotal > 0`, e a data em `<time>`. Sem andamento, a seção não aparece. Mudança manual de status como está | CA-09.1 a CA-09.5 |
| RF-10 | Vista do Awave ganha a sétima chave `andamento`: `{ fase, tarefasProntas, tarefasTotal, atualizadoEm }` ou `null`, sem `statusConstrucao` e sem `decId`; só da demanda que ele criou (outra continua 404 igual ao inexistente). O 201 do `POST /api/demandas` sai com `andamento: null` e igual ao GET | CA-10.1 a CA-10.5 |
| RF-11 | Vista de pessoa de `GET /api/demandas/:id` ganha `andamento` com os seis campos ou `null`. Vista mínima de agente e de sistema e a listagem `GET /api/demandas` não mudam | CA-11.1 a CA-11.3 |
| RF-12 | Limite próprio do `construir` para `registrar_andamento`, no mecanismo da 0.3.0 (janela móvel de 60 min, trava consultiva): **60 gravações por DEC** e **600 no total** por hora; acima, 429 sem gravar. Só gravação conta; mesmo estado não conta. Limites de `awave`, pessoa e agente intactos | CA-12.1 a CA-12.6 |
| RF-13 | `package.json` 0.4.0; CHANGELOG; manual cap. 05 (rota, respostas, tabela de transições, evento, limite, A3), caps. 08 e 09; `docs/operacao/` com implantação e volta, e `tokens-de-integracao.md` dizendo que o token `construir` ganhou a ação. Nenhum valor de token, `.env` ou dado pessoal | CA-13.1 a CA-13.3 |

**Tabela de decisão** (01, seção 5): status da demanda × `statusConstrucao`, para o DEC vigente e estado novo. "Grava"
sem mais nada: o status não muda.

| Status da demanda | `em_construcao` | `construido` | `cancelado` |
|---|---|---|---|
| `nova`, `em_analise`, `aguardando_informacao`, `pronta_para_decisao` | grava | grava | grava |
| `aprovada` | grava e vai para `em_construcao` (estudo: só grava) | grava | grava |
| `em_construcao` | grava | grava; Próxima ação do RF-07 | grava e vai para `devolvida` |
| `devolvida` | grava | grava | grava |
| `entregue` | 409 | grava | 409 |
| `encerrada` | 409 | 409 | grava |

Mesmo estado responde 204 em qualquer linha, sem gravar (CA-05.9). DEC não vigente responde 409 em qualquer linha
(CA-05.8).

### 2.2 Requisitos não funcionais (os números)

| Id | Requisito | Número (01, seção 3) |
|---|---|---|
| RNF-01 | Tempo de resposta | `POST .../andamento`: p95 ≤ 1 s e nenhuma acima de 5 s em 50 chamadas na homologação, com 200 DEC e 20 mil eventos. Cliente corta em 15 s. Orçamento `padrao` (ADR-28): estouro → 503 `indisponivel`, nada gravado |
| RNF-02 | Volume | No máximo 1 envio a cada 2 min por pedido, só quando o estado muda (≤ 30/h por pedido); até 20 pedidos em curso. Limite: 60 por DEC e 600 no total por hora |
| RNF-03 | Histórico sem texto livre (C-30, IN-12) | Eventos do `construir` só com enumerações, inteiros, ids e prefixo. Teste de sentinelas da 0.3.0 estendido à rota (resposta, evento, log, Sentry falso, esquema `pgboss`) |
| RNF-04 | Segredo e log | Token nunca em log, Sentry, evento, resposta ou documentação; log da rota só com `atorTipo` |
| RNF-05 | Migration só aditiva | Nenhuma coluna removida; nenhuma migration da `main` editada; `alteram_dado = false` no ensaio aprovado; privilégio novo só o necessário, conferido por `privilegios.test.ts`; nenhum `UPDATE` ou `DELETE` em `evento` (C-34). Ver 7.3 sobre "uma migration" |
| RNF-06 | Concorrência | Envios simultâneos do mesmo DEC: no máximo uma gravação e um evento por estado; envio e mudança manual em fila pela trava da demanda, decididos pela tabela lida depois da trava |
| RNF-07 | Compatibilidade | 0 mudança em `enviar-andamento.mjs` e `lib/andamento.mjs`; teste de contrato com a requisição exata do `/construir` e o cenário V-02; o 201 do Awave com a chave nova não quebra o contrato da 0.3.0 |
| RNF-08 | Nenhum controle afrouxado | C-09, C-10, C-11, C-15, C-17, C-30, C-34, C-36, IN-01 a IN-18 e axe com os mesmos testes verdes; nenhum teste apagado ou enfraquecido |
| RNF-09 | Qualidade | test, lint e typecheck verdes; e2e verde 3 vezes seguidas; axe sem violação na fila e no detalhe em 1280 × 720 e 390 × 844 |
| RNF-10 | Retenção | O andamento não tem dado pessoal; segue a retenção da demanda; evento permanente; sem regra nova de expurgo |

### 2.3 Rastreabilidade dos critérios preliminares

Os nove critérios preliminares do `pedido.json` estão na matriz da seção 7.1 de `01` (01, seção 7.1):

| Critério preliminar | RF / RNF | Critérios-chave |
|---|---|---|
| CP-1 POST válido do `construir` para DEC com pedido gerado → 204; fila e detalhe mostram fase e x de y | RF-01 a RF-04, RF-08, RF-09 | CA-01.1, CA-02.1, CA-04.1, CA-08.1, CA-09.1 |
| CP-2 Demanda em `aprovada` com `em_construcao` vai para `em_construcao`, com evento de status pelo `construir` | RF-05, RF-06 | CA-05.1, CA-06.1 |
| CP-3 `construido` não muda o status e a Próxima ação pede a uma pessoa que marque entregue | RF-05, RF-07 | CA-05.3, CA-05.10, CA-07.1, CA-07.3 |
| CP-4 `cancelado` com a demanda em `em_construcao` leva a `devolvida` | RF-05 | CA-05.2, CA-05.11 |
| CP-5 Mesmo corpo duas vezes não cria evento nem altera `atualizadoEm` | RF-04, RF-06, RNF-06 | CA-04.2, CA-05.9, CA-06.3 |
| CP-6 DEC sem pedido gerado ou inexistente → 404 igual; campo a mais, fase fora da lista ou prontas > total → 422 sem gravar | RF-02, RF-03 | CA-02.2, CA-02.3, CA-03.1 a CA-03.4 |
| CP-7 `awave`, agente e pessoa → 403 em `registrar_andamento`; teste transversal da matriz cobre a ação | RF-01 | CA-01.2 a CA-01.6 |
| CP-8 `awave` lê o andamento só da própria demanda; de outro autor, 404 | RF-10 | CA-10.1 a CA-10.5 |
| CP-9 `enviar-andamento.mjs` passa contra a homologação da 0.4.0 com pedido fictício | RF-02 a RF-05, RNF-07 | Cenário V-02 |

**V-02** (01, seção 7.3): homologação da 0.4.0 com seed fictício (uma demanda em `aprovada` com DEC vigente e pedido
gerado por pessoa, e um DEC aprovado sem pedido gerado); token `construir` emitido dentro da homologação pelo script,
em arquivo 600 numa pasta temporária fora do repositório, apagado no fim (04, AN-15). Com config `"andamento_ligado":
true` e `passagens.jsonl` fictícios: (1) `enviar-andamento.mjs --estado <tmp>` sai 0, com `enviado (HTTP 204)` para o
DEC com pedido e `fora_do_orquestrador (HTTP 404)` para o outro; (2) a demanda fica em `em_construcao`, com andamento e
um `andamento_registrado`; (3) a segunda execução imprime `nada mudou` e não cria evento. A montagem fica na etapa 05.

Os itens (1) a (10) da ESP, o "Fora" da ESP, os itens do RSK e a definição de pronto também estão mapeados (01, seção
7.2, cobertura complementar).

## 3. Arquitetura e ADRs

A 0.4.0 acrescenta uma única escrita vinda de fora. O Orquestrador **não chama ninguém de novo**: nenhum processo,
fila, job, pacote nem variável de ambiente novo. O desenho reaproveita, sem mudar, o ator `construir` e a emissão do
token (ADR-20, ADR-21), a matriz fechada (ADR-22), o `rota()`, o orçamento `padrao` (ADR-28 e M-3 da 0019), a trava
`pedido:<decId>` e o `pedidoGeradoPorPessoa` (M-4 da 0019, IN-10), `travarDemanda` e `aprovadoVigente`, o limite por
integração (ADR-24, C-36, IN-09), as vistas por lista de permissão (IN-08, M-1 da 0019) e `registrarEvento` com ator de
integração (IN-12) (02, seção 1).

### 3.1 O que muda e o que não muda

| Muda | Não muda |
|---|---|
| Uma ação na matriz, uma rota de API, uma tabela nova só de inclusão, duas migrations aditivas, um módulo `src/modules/andamento/` (02, seção 2) | Processo, serviço, fila, job, pacote, variável de ambiente, chamada de saída: nenhum novo (02, seção 1) |
| `transicoes.ts` ganha a tabela das transições do `construir` (02, ADR-34) | `MANUAIS`, `AUTOMATICAS` do sistema e `mudarStatusPeloSistema` sem diff contra `0ac099a` (04, AN-04) |
| `limites.ts` ganha o limite do andamento (02, ADR-31) | `TipoLimite`, `LIMITE_POR_HORA`, `MENSAGEM_LIMITE`, `LIMITE_DA_INTEGRACAO`, `conferirLimite` sem diff (04, AN-07) |
| `rota.ts` ganha a opção `corpoInvalido` para o 422 (02, ADR-33) | Sem a opção, nenhuma rota muda; `resolver-ator.ts`, `exigir-pessoa.ts`, `auth.ts`, `tokens-servico.ts`, `proxy.ts`, `transacao.ts`, `tempo-limite.ts`, `confirmacao.ts` sem diff (04, AN-13) |
| `andamento` na vista de pessoa e, com quatro chaves, na do Awave (02, ADR-35) | `vistaMinimaDaDemanda`, `paginaDeDemandas`, `resumoDe`, vistas de ESP, RSK e DEC, `entrada-agente.ts` (04, AN-09) |
| Painel: selo na fila, seção no detalhe, linha da Próxima ação, texto do evento, texto de `dicaAprovada` (03, seção 1) | Stack: Next 16.4.1, Drizzle 0.45.3, Zod 4.6.6, como no ADR-29; sem ADR de desvio (02, seção 9) |

Porta de desenvolvimento **3101**, a do sistema desde a 0.1.0, livre em `ss -ltn` em 12/11; homologação em
`127.0.0.1:${HML_PORTA}` (3200 a 3299) (02, seção 10).

### 3.2 Componentes

| Componente (caminho) | Novo/alterado | Papel (02, seção 2) | RF |
|---|---|---|---|
| `src/db/schema/andamento.ts` (+ `index.ts`) | novo | Tabela `andamento_construcao`; `FASES_ANDAMENTO` e `STATUS_CONSTRUCAO` como fonte única do CHECK e do Zod | RF-04 |
| `drizzle/0008_*.sql` (gerada), `drizzle/0009_rls_privilegios_andamento.sql` (custom) | novos | Tabela, CHECKs, FKs, índices; `GRANT SELECT, INSERT` ao `orquestrador_app` | RF-04, RNF-05 |
| `src/db/privilegios.ts` | alterado | Linha `andamento_construcao: ['SELECT', 'INSERT']`; nenhuma `colunasUpdate` nova | RNF-05 |
| `src/modules/acesso/matriz.ts` | alterado | `registrar_andamento` em `ACOES` e linha `SO_CONSTRUIR` | RF-01 |
| `src/modules/andamento/schemas.ts` | novo | `corpoAndamentoSchema` (`z.strictObject`), `andamentoLidoSchema`, `AndamentoVista` (seis campos) e `AndamentoDaIntegracao` (quatro) | RF-02, RF-04 |
| `src/modules/andamento/regras.ts` | novo | Funções puras `mesmoEstado`, `mudancaDeMarco`, `decidirPorStatus`, `lerAndamento` (nunca lança) | RF-04 a RF-06 |
| `src/modules/andamento/registrar.ts` | novo | `registrarAndamento`: o fluxo de 3.3 numa transação `padrao` | RF-03 a RF-06 |
| `src/modules/andamento/consultas.ts` | novo | `ultimoAndamento(db, demandaId)` e `andamentosDasDemandas(db, ids)` (uma consulta por página); só `SELECT` | RF-08 a RF-11 |
| `src/modules/demandas/transicoes.ts` | alterado | `AUTOMATICAS_DO_CONSTRUIR`, `CONTRADIZ_STATUS_FINAL`, `mudarStatusPeloConstruir` | RF-05 |
| `src/modules/limites.ts` | alterado | `LIMITE_ANDAMENTO` (60, 600, mensagens) e `conferirLimiteDeAndamento` | RF-12 |
| `src/modules/historico/registrar.ts` | alterado | `AcaoEvento` ganha `andamento_registrado` | RF-06 |
| `src/lib/rota.ts` | alterado | Opção `corpoInvalido?: { codigo: 'nao_processavel'; mensagem }` | RF-02 |
| `src/app/api/pedidos-construcao/[decId]/andamento/route.ts` | novo | Adaptador fino → 204 | RF-02 |
| `src/modules/demandas/consultas.ts` | alterado | `DemandaVista.andamento` em `obterDemanda`; `andamento` de quatro chaves em `obterDemandaDaIntegracao` (mesma consulta, autoria no `WHERE`) e em `vistaDaIntegracao` | RF-09 a RF-11 |
| `src/components/dados-das-etapas.ts` | alterado | `DadosDasEtapas.andamento?`; linha nova da Próxima ação dentro de `em_construcao`, antes da 11, só com DEC vigente | RF-07 |
| `src/components/dados-da-fila.ts`, `rotulos.ts` | alterados | Rótulos de fase e situação, `seloDeFase` (puro), `textoDoEvento('andamento_registrado')` | RF-06, RF-08 |
| `(painel)/demandas/leituras-da-fila.ts`, `page.tsx`, `fila.tsx`, `CartoesDaFila.tsx` | alterados | Leitura `andamentosDaPagina` e o selo na linha e no cartão | RF-08 |
| `(painel)/demandas/[id]/SecaoAndamento.tsx`, `page.tsx` | novo, alterado | Seção do detalhe | RF-09 |
| Manual caps. 01, 02, 05, 08, 09; `docs/operacao/deploy.md`, `tokens-de-integracao.md`; `CHANGELOG.md`; `package.json` | alterados | Versão e documentação | RF-13 |

Dono do módulo `src/modules/andamento/`: o `engenheiro-backend` na construção e Fabiano no sistema (02, seção 7).

### 3.3 Fluxo do registro

**Fora da transação, em `rota()`** (02, seção 3): id pela regex (404), CSRF e tipo de conteúdo (403/415),
`resolverAtor` (401), `autorizar(ator, 'registrar_andamento')` (403), JSON (400/413) e `corpoAndamentoSchema` (422 com
mensagem fixa, sem `campos`, sem eco). O serviço chama `autorizar` de novo, na primeira linha, antes de abrir a
transação (04, AN-01).

**Dentro de `executarComOrcamento(deps.pool, ator, 'padrao', undefined, …)`**, sem transação vinda de quem chama (04,
AN-06), nesta ordem (02, seção 3; 04, AN-03):

1. `travarPedido(tx, decId)` (chave `pedido:<decId>`, a da entrega e do recebimento).
2. `pedidoGeradoPorPessoa(tx, decId)`; nulo → 404. Em seguida, o `demanda_id` de `pacote_decisao` do DEC é comparado
   com o do evento; diferente ou ausente → **o mesmo** 404, sem travar nem gravar (04, AN-03).
3. `travarDemanda(tx, demandaId)`. Ordem fixa de travas: pedido → demanda → limite (02, ADR-32).
4. `ultimoAndamento`; `mesmoEstado` (os cinco campos) → 204 sem gravar. Vem antes dos 409 (CA-05.9).
5. `aprovadoVigente(...)?.id !== decId` → 409 (DEC substituído).
6. `decidirPorStatus(status, statusConstrucao)` = recusa → 409 (status final), com `status` e `tipo` lidos da linha
   devolvida por `travarDemanda` (04, AN-04).
7. `conferirLimiteDeAndamento` → 429.
8. `INSERT` em `andamento_construcao` com `gravado_em = relogio.agora()` e o prefixo do token.
9. Se a regra casar, `mudarStatusPeloConstruir`: `UPDATE demanda SET status, atualizada_em` e `status_alterado` pelo
   ator `construir`. Sem regra, `demanda` não é tocada (CA-04.5).
10. Se `mudancaDeMarco`, `andamento_registrado`.

Nada enfileira job, dispara agente, manda aviso ou grava log próprio; a linha de log é a de `rota()`, só com `atorTipo`
e `codigoErro` (02, seção 3; 04, AN-11).

### 3.4 Modelo de dados e migrations

**Tabela nova `andamento_construcao`**, só de inclusão para o papel do app (02, seção 4; 04, AN-10):

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | `bigint` identity | PK; ordem de gravação, usada para "o último" (o relógio injetado pode empatar) |
| `demanda_id` | `text not null` | FK `demanda(id)`, sem `ON DELETE CASCADE`; o valor conferido no passo 2, nunca do corpo nem da URL |
| `dec_id` | `text not null` | FK `pacote_decisao(id)`, sem `CASCADE`; CHECK `^DEC-DEM-[0-9]{8}-[0-9]{4}-v[0-9]{1,4}$` |
| `fase` | `text not null` | CHECK nas seis fases |
| `tarefas_prontas`, `tarefas_total` | `integer not null` | CHECK `0 <= tarefas_prontas <= tarefas_total <= 999` |
| `status_construcao` | `text not null` | CHECK nos três valores |
| `ator_token_prefixo` | `text not null` | CHECK `^[A-Za-z0-9_-]{8}$`; atribui também a gravação sem evento |
| `gravado_em` | `momento() not null`, sem padrão no banco | do `Relogio`; é o `atualizadoEm` das vistas |

Índices: `(demanda_id, id)`, `(dec_id, gravado_em)` e `(gravado_em)`. Nenhuma coluna nova em `demanda` nem em `evento`;
`evento.acao` é texto sem CHECK, então a ação nova não pede DDL (02, seção 4).

**Vistas lidas**, montadas chave a chave depois do `andamentoLidoSchema` (linha fora do esquema vira `null`): pessoa
`{ decId, fase, tarefasProntas, tarefasTotal, statusConstrucao, atualizadoEm }`; Awave `{ fase, tarefasProntas,
tarefasTotal, atualizadoEm }`; agente, sistema e listagem sem a chave (02, seção 4).

**Volume**: grava só quando o estado muda; um pedido de cadeia completa fica em dezenas a poucas centenas de linhas
(cerca de 60 bytes cada); sem expurgo nesta versão (02, seção 4; RNF-10).

**Eventos** (02, seção 3; 04, AN-11):

| `acao` | Ator | Entidade | `depois` |
|---|---|---|---|
| `andamento_registrado` (novo) | integração `construir` + prefixo | `pacote_decisao` (`entidadeId = DEC`) | `{ fase, tarefasProntas, tarefasTotal, statusConstrucao }`; `antes` igual ou `null` |
| `status_alterado` (pelo `construir`) | integração `construir` + prefixo | `demanda` | `mudancaDeCampo('status', …)`, nunca com ator `sistema` |

**Migrations** (02, seção 8): duas, ambas aditivas. `0008_*` gerada por `pnpm db:generate` (tabela, CHECKs, FKs,
índices) e `0009_rls_privilegios_andamento`, custom, criada vazia por `drizzle-kit generate --custom` e escrita à mão
só com `GRANT SELECT, INSERT ON "andamento_construcao" TO orquestrador_app`, sem GRANT de sequência.

- **Altera dado existente? Não.** Nenhuma linha muda, nenhuma coluna sai, nenhuma migration da `main` é editada:
  `alteram_dado = false` esperado. O `CREATE TABLE` é sobre tabela vazia, sem trava longa (02, seção 8; 04, AN-10).
- **Volta 0.4.0 → 0.3.1: só pelo caminho B** (backup restaurado). A saúde (ADR-12) responde 503 quando a última
  migration do banco não é a do journal da imagem; a 0.3.1 sobre o banco com `0008` e `0009` fica em 503. O
  `ensaiar-rollback` deve sair com `volta_sem_restaurar: false`, e isso é o esperado (02, seção 8).
- **Em `docs/operacao`**: antes da volta, `"andamento_ligado": false`; depois da restauração, o andamento gravado desde
  o backup se perde e o `/construir` reenvia o estado inteiro quando religado; `"andamento_ligado": true` só depois do
  deploy da 0.4.0 e da saúde em 200 (02, seção 8; 04, AN-14).

### 3.5 Contratos das rotas

**`/construir`, rota nova** (contrato fixado do lado de lá; 01, seção 4; 02, seção 6; mensagens em 03, seção 7):

| Entrada | Resposta | O que o `/construir` faz (`andamento.mjs`) |
|---|---|---|
| Corpo válido, DEC com pedido gerado, gravado ou mesmo estado | 204 sem corpo, `no-store`, `nosniff` | `enviado` |
| DEC inexistente, sem pedido gerado ou gerado por não pessoa (ou vínculo DEC ↔ demanda diferente, AN-03) | 404 `nao_encontrado`, igual nos casos | `fora_do_orquestrador`, não repete até o estado mudar |
| DEC substituído; contradição com status final | 409 `conflito` (duas mensagens) | `recusado`, não repete até mudar |
| JSON fora do formato | 422 `nao_processavel`, sem `campos` | `recusado` |
| JSON malformado / `content-type` / corpo grande / cookie com Bearer | 400 / 415 / 413 / 400 | `recusado` |
| Token inválido ou revogado / sem permissão | 401 / 403 | para a volta inteira |
| Limite (60 por DEC ou 600 no total por hora) | 429 `limite_excedido` | `erro`, repete na volta seguinte |
| Tempo esgotado (prazo total 8 s, `statement_timeout` 5 s, `lock_timeout` 2 s) | 503 `indisponivel`, nada gravado | `erro`, repete na volta seguinte |

Orquestrador fora do ar → falha de rede no cliente, `erro`, e o `/construir` segue construindo (02, seção 6).

**Awave, leitura e criação** (aditivo; 01, RF-10; 02, seção 6 e ADR-35):

| Rota | Mudança |
|---|---|
| `GET /api/demandas/:id` (token `awave`) | 200 com exatamente `id`, `titulo`, `tipo`, `status`, `criadaEm`, `atualizadaEm` e `andamento` (quatro chaves ou `null`); 404 igual para outro autor e inexistente |
| `POST /api/demandas` (token `awave`) | 201 com as sete chaves, `andamento: null`, igual ao GET seguinte |
| `GET /api/demandas/:id` (pessoa) | `andamento` com seis campos ou `null` |
| `GET /api/demandas/:id` (agente) e `GET /api/demandas` | sem mudança |

**Observabilidade e falha** (02, seções 6 e 7): a linha de log de `rota()` distingue 204, 404, 409, 422, 429 e 503;
5xx vai ao Sentry reduzido; sem métrica nem alerta novos. Andamento errado → mudança manual de status; token vazado →
revogação pelo prefixo, e o prefixo gravado em cada linha mostra o que ele escreveu; envio com defeito → `"andamento_ligado":
false`, sem deploy. Custo recorrente zero.

### 3.6 ADRs

Numeração contínua com o cap. 01 (ADR-01 a ADR-29) (02, seção 9).

| ADR | Decisão | Por quê | Descartadas |
|---|---|---|---|
| **ADR-30** Tabela própria só de inclusão | `andamento_construcao`, uma linha por gravação aceita; o último é a linha de maior `id` | Só `SELECT, INSERT` numa tabela nova; `demanda.atualizadaEm` intocado por construção; as mesmas linhas contam o limite; formato por CHECK e Zod; rastro de quem gravou sem inflar o histórico | Coluna `jsonb` na demanda (pede `UPDATE`, sem CHECK de forma, segunda estrutura para contar); tabela de uma linha por demanda com `UPSERT` (pede `UPDATE` e segunda estrutura) |
| **ADR-31** Limite contado nas linhas da tabela | `conferirLimiteDeAndamento` só para o `construir`; trava `limite:andamento:integracao:construir`; conta `gravado_em > agora − 60 min` por DEC (≥ 60) e no total (≥ 600); depois do mesmo estado e dos 409, antes do `INSERT` | Mesmo idempotente não conta; corrida no limite fica em fila; limites de hoje intactos | Pôr `andamento` em `TipoLimite` (obrigaria número para pessoa e agente) |
| **ADR-32** Transação `padrao`, travas pedido → demanda → limite | Primeira instrução `travarPedido`; leituras de estado depois das travas | Uma gravação e um evento por estado; envio e mudança manual em ordem; sem inversão de travas | — (custo: espera de até 2 s, depois 503) |
| **ADR-33** 422 pelo próprio `rota()` | `OpRota.corpoInvalido`; a falha do Zod do corpo vira `ErroDominio` sem `campos`; sem a opção, nada muda | A validação continua antes do banco num lugar só; 422 igual para DEC existente ou não; o T13 lê o mesmo `meta` | `corpo: z.unknown()` e validar no serviço (enfraquece a leitura do C-11 pela rota) |
| **ADR-34** Transições do `construir` em tabela própria | `AUTOMATICAS_DO_CONSTRUIR` e `CONTRADIZ_STATUS_FINAL` em `transicoes.ts`; `mudarStatusPeloConstruir` grava com ator de integração | `entregue` e `encerrada` nunca são destino (teste 9 × 3); `MANUAIS` intacta; histórico diz "/construir (prefixo …)" e não "Sistema" | — (custo: terceira tabela de transições no arquivo) |
| **ADR-35** Andamento nas leituras por lista de permissão | Fila lê `andamentosDasDemandas` por página; `obterDemanda` ganha `andamento`; `obterDemandaDaIntegracao` ganha a subconsulta na mesma consulta da autoria; `vistaMinimaDaDemanda` não muda | Agente e listagem ficam de fora sem código novo; 404 do Awave sai da mesma consulta; Próxima ação confere `decId` igual ao vigente | — (custo: uma consulta por página da fila e uma no detalhe) |

Desempenho (02, seção 7): cerca de 12 idas ao banco por envio, todas por índice; a fila ganha uma consulta `distinct
on (demanda_id)` por página.

## 4. Interface

Detalhe em `03-ux-ui-design.md`. Base visual: a 0.3.1 na `main`, **sem token, cor, componente ou variação nova** (03,
seções 0 e 2). Texto que não muda é citado pela constante; texto novo está por inteiro na seção 8 de 03. Exemplos com
dados fictícios.

### 4.1 O que chega ao painel (03, seção 1)

| Tela | Mudança | RF |
|---|---|---|
| T03 Fila | selo de fase na célula Status e no cartão | RF-08 |
| T05 Demanda | seção "Andamento da construção"; linha 15 da Próxima ação; texto do `andamento_registrado`; texto de `dicaAprovada` | RF-05 a RF-07, RF-09 |
| T11, T12 | nada (o andamento é da demanda, não da decisão) | — |
| Mensagens da API | 409, 422 e 429 da rota nova, lidas por Fabiano no registro do `/construir` | RF-02, RF-05, RF-12 |

Constantes sugeridas em `rotulos.ts`: `ROTULO_FASE` e `ROTULO_SITUACAO_CONSTRUCAO`; textos da seção num
`TEXTOS_ANDAMENTO` (nome e arquivo do `tech-lead`; ver 7.3) (03, seção 2).

### 4.2 T03 Fila (03, seção 4)

- **Onde**: segunda linha dentro da célula **Status**, sem coluna nova; no cartão, abaixo do selo de status, à direita
  (quebra para baixo em 320 px). Um pedaço só para tabela e cartão.
- **Quando**: só com status `em_construcao` **e** andamento lido e válido. Sem andamento, fora do esquema ou em outro
  status (inclusive `devolvida`, `entregue`, `encerrada` com andamento gravado): sem selo (CA-08.4).
- **Texto visível** (`aria-hidden`): "<Fase> · <prontas>/<total>" (ex.: "Construindo · 9/17"); com total 0, só
  "<Fase>"; `construido` → "Construção concluída"; `cancelado` (só se uma pessoa voltou a demanda para Em construção) →
  "Construção cancelada".
- **Leitor de tela** (`sr-only`): "Andamento: Construindo, 9 de 17 tarefas prontas."; total 1, "0 de 1 tarefa pronta";
  total 0, "Andamento: <Fase>."; "Andamento: construção concluída."; "Andamento: construção cancelada.".
- **Aparência**: 13 px, peso 600; `marinho` em andamento, `positivo` em concluída, `tinta-media` em cancelada. A cor só
  reforça; a diferença está no texto.
- **Sem** filtro, contador ou coluna nova.
- **Erro só da leitura do andamento**: como a 02 lê o andamento em leitura separada (`andamentosDaPagina`), vale o
  estado da 03: fila **sem nenhum selo** e `Alerta` `atencao` estático: "Não foi possível ler o andamento da
  construção. A fila aparece sem a fase das demandas em construção." (03, 4.4; 02, seção 2).

### 4.3 T05 Demanda (03, seção 5)

**Seção "Andamento da construção"** (`h2` focável, `id="andamento-da-construcao"`), em **qualquer** status quando há
andamento válido; sem andamento, não existe, nem em "Nesta página" (CA-09.4). No DOM, depois da Próxima ação e antes
de Dados; a partir de 1200 px, na coluna lateral, entre Próxima ação e Histórico. Primeiro item de "Nesta página".

Conteúdo, em `dl` de duas colunas (03, 5.2):

| Termo | Valor |
|---|---|
| Pedido de Construção | `decId` em Mono, link para `/pacotes-decisao/<decId>` só se casar `RE_ID_DEC`; senão "Não informado" (CV-19) |
| Fase | `ROTULO_FASE`: Entendendo o pedido, Planejando, Construindo, Testando, Revisando e entregando, Documentando |
| Situação | "Em andamento", "Concluída" ou "Cancelada" (não usa os rótulos de status da demanda) |
| Tarefas prontas | "<prontas> de <total> tarefas" e a barra; com total 0, "Nenhuma tarefa contada. O plano de tarefas ainda não foi feito, ou este pedido não tem plano." e sem barra |

Depois da `dl`: alerta estático "A construção deste pedido foi cancelada no /construir." quando `cancelado`; alerta
estático de pacote substituído quando o DEC do andamento está `substituido` ("Este andamento é do pedido de <decId>,
cujo pacote foi substituído por um aprovado mais novo. O andamento do pedido novo aparece aqui quando o /construir
começar."); a linha "Última mudança informada pelo /construir em <data e hora>." em `<time dateTime>`; e a nota "Esta
página não se atualiza sozinha. Recarregue para ver o andamento mais novo."

**Barra** (03, 5.3): `<progress value max>` nativo (a CSP e o CV-02 recusam `style=`), 8 px, `aria-labelledby` do `dt`
"Tarefas prontas", `aria-valuetext` "9 de 17 tarefas"; preenchimento `acao` contra trilho `linha` 3,9:1. Sem animação;
se o total subir num replanejamento, a barra volta.

**Próxima ação, linha 15** (avaliada dentro de `em_construcao`, antes da 11; o número não renumera a 0.2.0) (03, 5.6):

| O que falta | Detalhe | Quem age | Link |
|---|---|---|---|
| "Construção concluída: confira e marque como Entregue." | "O /construir não marca Entregue: quem confere a entrega é uma pessoa." | "Uma pessoa (CTO ou administradora)" (`UMA_PESSOA`) | "Mudar o status" → `h2` de Mudar status |

Só com andamento do DEC **vigente** em `construido`. Sem andamento, com `em_construcao`, `cancelado` ou DEC não vigente:
linha 11 de hoje. Depois de Entregue: linha 1 de hoje.

**Histórico** (03, 5.7), sem "Antes/Depois" para o evento novo:

| `depois` | Texto |
|---|---|
| `em_construcao`, total > 0 | "Registrou o andamento de <DEC>: <Fase>, <prontas> de <total> tarefas" |
| `construido`, total > 0 | "Registrou o fim da construção de <DEC>: <Fase>, <prontas> de <total> tarefas" |
| `cancelado`, total > 0 | "Registrou o cancelamento da construção de <DEC>: <Fase>, <prontas> de <total> tarefas" |
| total = 0 / total = 1 | sem a parte de tarefas / "… de 1 tarefa" |
| valor fora da lista ou não inteiro | "Registrou o andamento de <DEC>" |

Ator "/construir (prefixo a1b2c3d4)", nunca token nem hash. O `status_alterado` do `/construir` usa o texto, o
"Antes/Depois" e o ator de hoje.

**Mudar status**: comportamento e opções iguais (CA-05.11); só `TEXTOS_DETALHE.dicaAprovada` muda para "Quando o
/construir começar o Pedido de Construção gerado no painel, a demanda passa sozinha para Em construção. Entregue é
sempre marcado por uma pessoa." (03, 5.1).

### 4.4 Mensagens da API (03, seção 7)

Corpo `{ erro, mensagem }`, sem `campos` e sem eco.

| Situação | Código | Mensagem |
|---|---|---|
| Corpo fora do formato | 422 | "Andamento fora do formato. Envie só fase, tarefasProntas, tarefasTotal e status, com fase e status da lista e 0 ≤ tarefasProntas ≤ tarefasTotal ≤ 999." |
| DEC substituído | 409 | "O pacote deste pedido foi substituído por um aprovado mais novo. O andamento não foi registrado: envie o do pedido novo." |
| Contradição com status final | 409 | "A demanda deste pedido já está em um status final e não aceita este andamento. Nada foi registrado." |
| Limite por DEC | 429 | "Limite de 60 registros de andamento por hora deste pedido atingido. Tente de novo mais tarde." |
| Limite total | 429 | "Limite de 600 registros de andamento por hora do /construir atingido. Tente de novo mais tarde." |
| 404, 503, 400, 415, 413, 401, 403 | — | as de hoje (`MENSAGEM_NAO_ENCONTRADO`, `MENSAGEM_INDISPONIVEL` etc.) |

O 409 de status final não diz qual status, e o de DEC substituído não cita o substituto. Os números do 429 seguem a
P-03 (7.1).

### 4.5 Acessibilidade (03, seção 9)

Tudo o que a 0.2.0 e a 0.3.x garantem continua (WCAG 2.2 AA, 4,5:1, foco de 2 px, alvo de 44 px abaixo de 768 px,
reflow em 320 px, axe em 1280 × 720 e 390 × 844). Pontos novos: selo não focável, com `sr-only` por extenso e
contrastes de 12,0:1, 5,4:1 e 7,4:1; seção com `aria-labelledby`, `dl`, `<progress>` com nome e `aria-valuetext`,
`<time dateTime>`, alertas estáticos sem `role="alert"`; link do DEC com alvo de 44 px no celular; id do DEC quebra
sem reticência.

## 5. Ameaças e controles

Modelo de ameaças em `04-seguranca-aplicacao.md`: STRIDE sobre os componentes de 02 e as telas de 03, com OWASP Top 10
2021, OWASP API Security Top 10 2023, ASVS 4.0.3 nível 2 e LGPD. Controles com prefixo **AN-**, para não colidir com
C-01 a C-40, CV-, IN-01 a IN-18, M-, B-, A- e S-, que continuam valendo e não podem ser afrouxados (04, Entrega).

**Achados da leitura do código** que o desenho de 02 não cobria por inteiro e viraram controle (04, Entrega):

1. **Vínculo DEC ↔ demanda**: `pedidoGeradoPorPessoa` devolve o `demandaId` do evento, e nada confere que é a demanda
   do próprio DEC. A 0.4.0 é a primeira escrita que muda status a partir desse evento (AN-03).
2. **Prazo total contra o piso**: um `set local` ou `set_config` no corpo do serviço, uma transação recebida de quem
   chama ou um `comTransacao` próprio devolvem o piso por cima do restante do prazo (AN-06).
3. **Leitura de agente e do Awave**: o campo novo só fica fora da resposta do agente porque `vistaMinimaDaDemanda` é
   lista de permissão; e `vistaDaIntegracao` recebe a `DemandaVista` inteira, então copiar o `andamento` sem montar
   chave a chave vazaria `statusConstrucao` e `decId` (AN-09).
4. **Limite que não conta**: a função nova fica fora da tabela de `limiteDe`; esquecer um ramo apareceria como
   ausência de limite, sem teste vermelho (AN-07).

Nenhuma devolução às etapas anteriores (04, Decisões).

### 5.1 Fronteiras tocadas (04, seção 1)

**F2** primeira **escrita** do token `construir`, pelo domínio público em HTTPS, Bearer, sem cookie e sem `Origin`;
**F2'** a leitura do Awave pela rede interna ganha a chave `andamento`; **F6** fila e detalhe mostram dado gravado por
integração; **F7** migration aditiva com tabela nova e `GRANT SELECT, INSERT`; **F8** o arquivo do token, legível pelo
usuário `deploy` que roda os agentes com Bash, passa a dar escrita em status de demanda.

### 5.2 Ameaças críticas e altas (04, seção 2)

| Componente | Ameaça | Nível | Controle |
|---|---|---|---|
| Matriz | `registrar_andamento` aberta a agente, pessoa ou `awave` (BFLA); o `construir` ganhando outra ação | crítica | AN-01 |
| Regras | `decidirPorStatus` incompleta: `entregue`/`encerrada` como destino, ou status não previsto caindo em "grava e muda" | crítica | AN-04 |
| Transições | `construir` pondo `entregue` ou `encerrada` (contra A1) ou fazendo transição fora das duas | crítica | AN-04 |
| Leituras | Awave recebendo `statusConstrucao`, `decId` ou prefixo (BOPLA), ou andamento de outro autor (BOLA) | crítica | AN-09 |
| Fila | Leitura nova sem `exigirPessoa` | crítica | C-04 |
| Tabela | Andamento alterado ou apagado depois de gravado; GRANT a mais ou coluna em `colunasUpdate` | alta | AN-10 |
| Matriz | Server Action ou job chamando a ação | alta | AN-01 |
| Rota | Cookie com Bearer deixando de dar 400; `corpoInvalido` mudando outras rotas | alta | AN-13, AN-02 |
| Rota, esquemas | Corpo com chave a mais, texto, `__proto__`, número como texto ou fora da faixa; `z.coerce`, sem `.int()`, sem `strict` | alta | AN-02 |
| Rota | 422 ecoando a chave ou o valor; 422 diferente para DEC existente e inexistente (oráculo) | alta | AN-02 |
| Serviço | Andamento aceito sem `pedido_gerado` de pessoa; gravado na demanda errada; 404 diferente entre os casos | alta | AN-03 |
| Serviço | DEC substituído pondo em `devolvida` a demanda do DEC novo | alta | AN-04, AN-05 |
| Serviço | Corrida com mudança manual, aprovação de DEC novo ou troca para `estudo`, decidida antes da trava | alta | AN-05 |
| Serviço | Serviço chamado sem `autorizar` | alta | AN-01 |
| Serviço | Prazo total sobrescrito pelo piso; 503 depois de o cliente cortar | alta | AN-06 |
| Transições | `MANUAIS` ou `AUTOMATICAS` mudando junto; reaproveitar `mudarStatusPeloSistema` (histórico diria "Sistema") | alta | AN-04, AN-13 |
| Limite | Função nova sai sem contar para algum ator | alta | AN-07 |
| Histórico | Texto livre ou valor cru em `antes`/`depois`; evento editado ou apagado | alta | AN-11, C-34 |
| Leituras | Agente recebendo o andamento em alguma rota de leitura; 404 do Awave diferente por causa da subconsulta | alta | AN-09 |
| Documentação | Token, hash ou `.env` no roteiro ou no exemplo | alta | AN-14, IN-18, C-39 |
| Integrações | Chave nova quebrando a vista fechada do Awave; token da V-02 no repositório ou no log | alta | AN-09, AN-15 |

As médias e baixas (linha fora do formato gravada por outro caminho, log com `decId`, corrida no limite, token vazado
esgotando as 600 da hora, trava global atrasando a pessoa, rótulo por chave sem conferir, link do DEC fora do formato,
tabela sem expurgo, token lido por agente com Bash) estão nas tabelas por componente da 04 e são cobertas por AN-04,
AN-06, AN-07, AN-08, AN-10, AN-11, AN-12 e AN-14, ou ficam como risco residual (7.1).

### 5.3 Controles exigidos (04, seção 3)

Todos são critério de aceite de alguma tarefa do plano, com teste em Vitest (Testcontainers quando toca o banco) ou
Playwright, sempre com dado e token fictícios. "Duas conexões" = duas transações reais no Postgres do teste.

| Id | Nível | Controle |
|---|---|---|
| AN-01 | crítica | **Ação só do `construir`, e ele não ganha outra**: linha `SO_CONSTRUIR`; diff de `matriz.ts` de uma linha em `ACOES` e uma em `MATRIZ`; `autorizar` na primeira linha do serviço. Testes: pares exatos montados de `MATRIZ`; `construir` com exatamente quatro ações e `awave` com duas; T13 com `awave`, quatro agentes, `cto` e `administradora` → 403 sem gravar; `construir` 403 nas outras rotas; `jarvis` negado; teste estático de que a ação só aparece em `matriz.ts`, na rota, no serviço e em testes |
| AN-02 | alta | **Corpo fechado e 422 sem eco nem oráculo**: `z.strictObject`, `z.enum` das listas do CHECK, `z.number().int().min(0).max(999)`, `refine` de prontas ≤ total; sem `coerce`, `passthrough`, `catch`, `default`. Com `corpoInvalido`, `ErroDominio` sem `campos`, `issues` nem `cause`. Testes: cada corpo do CA-02.2, mais `__proto__`, `constructor`, objeto aninhado, `1e2`, `-0` aceito como 0, `1e400`; 422 idêntico para DEC existente ou não, sem consulta ao banco; sentinela e nome da chave fora da resposta, do log e do Sentry falso; testes de `rota()` existentes sem mudança |
| AN-03 | alta | **Só DEC com pedido gerado por pessoa, na demanda do próprio DEC**: depois de `travarPedido`, `pedidoGeradoPorPessoa` e a comparação do `demanda_id` de `pacote_decisao` com o do evento; diferente → o mesmo 404. O `demanda_id` gravado é esse valor conferido. Testes: três 404 byte a byte; `pedido_gerado` com `demanda_id` de outra demanda → 404 e nenhuma das duas muda |
| AN-04 | crítica | **Duas transições, com origem fixa; `entregue` e `encerrada` nunca**: `decidirPorStatus` em `switch` exaustivo com `never`, sem ramo padrão que grave; `mudarStatusPeloConstruir` só aceita o `construir`; decisão com `status` e `tipo` da linha de `travarDemanda`; `mesmoEstado` com os cinco campos; `MANUAIS`, `AUTOMATICAS`, `mudarStatusPeloSistema` sem diff. Testes: CA-05.1 a CA-05.11; tabela 9 status × 3 × tipo (`estudo` e não); envio de mesmo estado pelo v2 vigente, só com `decId` diferente, grava e cria evento |
| AN-05 | alta | **A mesma trava nas rotas que concorrem**: ordem pedido → demanda → limite; inventário no plano de quem escreve o que o registro lê (`alterarDemanda`, `mudarStatusPeloSistema`, `registrarDecisao`, `confirmarDemanda`, `mudarStatusPeloConstruir`, `entregarPedido`, `receberPedido`). Testes com duas conexões: dois envios iguais → uma linha e um evento; `cancelado` × pessoa marcando `entregue` → só um vence; envio × aprovação de DEC novo; envio × troca para `estudo`; dois DEC da mesma demanda sem *deadlock* em 50 repetições |
| AN-06 | alta | **Prazo total não sobrescrito pelo piso**: a rota chama o serviço sem transação; `executarComOrcamento(…, 'padrao', undefined, …)`; em `src/modules/andamento/**`, `mudarStatusPeloConstruir` e `conferirLimiteDeAndamento`, nenhum `set local`, `set_config`, `comTransacao`, orçamento aninhado nem `Promise.all` (teste estático). Testes com relógio falso: 7 s de espera → `statement_timeout` e `lock_timeout` no `INSERT` ≤ ~1.000 ms; prazo vencido → 503 sem gravar; o mesmo na leitura do Awave |
| AN-07 | alta | **Limite próprio, sempre contado**: `switch` exaustivo; só o `construir` conta; `awave`, integração fora da lista, pessoa, agente e **sistema** lançam. Chave da trava literal constante, passada por parâmetro. Conta pelo `Relogio`, por DEC (≥ 60) e total (≥ 600), com as mensagens da 03; depois do mesmo estado e dos 409, antes do `INSERT`. Testes: CA-12.1 a CA-12.6; cada outro ator lança; 599 gravações e duas simultâneas de DEC diferentes → uma 204 e uma 429 |
| AN-08 | média | **Trava global do limite aceita com condições**: só no caminho que grava, como última trava, segurada só por duas contagens, um `INSERT`, no máximo um `UPDATE` e dois eventos; espera sob `lock_timeout` 2 s e prazo de 8 s; pessoa, agente e Awave nunca a tomam. Testes com duas conexões: trava segurada → envio 503 em até 3 s e, logo depois, pessoa altera a demanda sem esperar; pessoa e Awave em outras demandas sem esperar; mesmo estado com a trava segurada → 204 |
| AN-09 | crítica | **Visibilidade em toda rota de leitura**: andamento só na vista de pessoa (seis campos, sem prefixo) e na do Awave, montada **chave a chave** com quatro campos, só da própria demanda, na mesma consulta da autoria. Vistas de agente, listagem, ESP, RSK, DEC e `entrada-agente.ts` sem diff. Testes: varredura que **percorre `MATRIZ`** com os quatro agentes sobre demanda com `testando 987/988` (nenhuma chave nem número aparece); entrada do provedor falso sem as chaves; CA-10.1 a CA-10.5 e 404 byte a byte; `vistaDaDemandaPara(awave, d)` com seis campos devolve quatro; itens de `GET /api/demandas` como na 0.3.1 |
| AN-10 | alta | **Tabela só de inclusão, com o formato no banco**: CHECKs de fase, status, números, `dec_id` e prefixo; FKs sem `CASCADE`; custom só com `GRANT SELECT, INSERT`, sem GRANT de sequência; `privilegios.ts` com uma linha e sem `colunasUpdate`; nada novo em `demanda` nem `evento`; duas migrations aditivas; ensaio com `alteram_dado = false` (e `volta_sem_restaurar = false` esperado). Testes: `privilegios.test.ts` e `imutabilidade.test.ts` com a tabela; INSERT com cada CHECK violado recusado |
| AN-11 | alta | **Eventos e log sem texto livre**: `depois` montado chave a chave do corpo já validado; ator e prefixo do ator resolvido; só na mudança de marco; nenhuma linha de log própria. Testes: CA-06.1 a CA-06.6; sentinelas ampliado à rota e à leitura do Awave (evento, log, Sentry falso, `pgboss`, `andamento_construcao`); log sem `wsod_`, prefixo nem `decId` |
| AN-12 | média | **Tela só com valor conferido**: andamento só depois do `andamentoLidoSchema`; rótulos por `Object.hasOwn`; `textoDoEvento` confere cada valor e cai na frase genérica; link do DEC só com `RE_ID_DEC`; prefixo só no histórico; sem `dangerouslySetInnerHTML` nem `style=`. Testes: evento com `<img src=x onerror=…>` mostra a frase genérica; teste estático do CV-02 cobre `SecaoAndamento.tsx`; axe |
| AN-13 | alta | **Nenhum controle afrouxado**: `git diff 0ac099a` vazio em `resolver-ator.ts`, `exigir-pessoa.ts`, `auth.ts`, `tokens-servico.ts`, `proxy.ts`, `transacao.ts`, `tempo-limite.ts`, `confirmacao.ts`; `rota.ts` só na opção `corpoInvalido`. Testes de segurança sem asserção a menos, contada por arquivo. Mudanças aprovadas de antemão, só para acrescentar: par novo, sétima chave nos contratos do Awave, rota no T13, texto de `dicaAprovada` |
| AN-14 | média | **Operação documentada, sem valor**: `tokens-de-integracao.md` diz que o `construir` passou a **escrever**, que suspeita pede revogação imediata e como achar o que um prefixo gravou; `deploy.md` com backup, migrator, `worker` e depois `app`, sem snapshot (D5), `andamento_ligado` só depois da saúde em 200, desligado antes da volta, volta pelo caminho B. Varredura de segredo do CI passa |
| AN-15 | média | **V-02 sem vazar o token**: emitido na homologação, arquivo 600 em pasta temporária fora do repositório, apagado no fim (também na falha); nunca em fixture, log, `passagens.jsonl` ou arquivo rastreado; `git status` limpo depois |

**Respostas da 04 às pendências dirigidas a ela** (04, seções 4 e 7): primeira escrita do token `construir` avaliada
como risco médio no conjunto (AN-01, AN-03, AN-04, AN-07, AN-08 e revogação pelo prefixo), com T13 no AN-01 e
sentinelas no AN-11; **trava global** aceita com as condições do AN-08 (é o único jeito de o teto de 600 ser exato);
**prefixo por linha** aprovado (não é segredo nem dado pessoal; atribui a gravação sem evento); mensagens 409 e 422 da
03 de acordo; link do DEC só com `RE_ID_DEC`.

`pnpm audit --prod` em 12/11: 0 alta, 0 crítica, as mesmas 5 moderadas de ferramenta de build e teste (04, Decisões).

### 5.4 Dados pessoais (04, seção 5)

Este pedido **não cria dado pessoal novo**: o andamento só tem enumerações, inteiros, ids de sistema e datas, e o corpo
fechado (AN-02) impede texto livre. Bases legais, retenção e expurgo seguem a seção 4 do pedido 0001 (D1 a D12) e a do
0016 (D5 ampliado, D8 ampliado, D15, D16), sem mudança.

| Dado | É dado pessoal? | Retenção | Cuidado |
|---|---|---|---|
| Andamento em `andamento_construcao` | não | a da demanda (status final + 5 anos); sem expurgo nesta versão; um expurgo futuro da demanda terá de tratar estas linhas (FK sem `CASCADE`) | AN-02, AN-10 |
| Prefixo do token por linha | não (identifica token de sistema) | a da linha | AN-10, AN-12 (fora de toda vista) |
| `andamento_registrado` e `status_alterado` do `construir` | não | permanente (C-34) | AN-11 |
| D15 ampliado: vista do Awave com `andamento` | não, no campo novo | a do Awave, fora deste sistema | AN-09 |
| D8: nome de quem mudou o status depois | pessoa da empresa; art. 7º, VI e IX, sem mudança | igual ao D5 | sem mudança |
| D9: linha de log da rota nova | não deve ter | rotação do Docker | AN-11 |

### 5.5 O que o plano (05) precisa conter (04, seção 6)

1. Cada AN-01 a AN-15 como critério de aceite de uma tarefa, com o teste citado no controle. IN-01 a IN-18 entram na
   revisão de toda tarefa que toca matriz, rota, vistas ou histórico.
2. **Ordem**: AN-01 (matriz e T13), AN-10 (tabela e privilégio) e AN-07 (limite) na fundação, **antes** da rota e do
   serviço; AN-02 junto com a mudança de `rota()`; AN-03, AN-04, AN-05, AN-06 e AN-08 na mesma tarefa do serviço;
   AN-09 junto com a primeira mudança em `consultas.ts`.
3. **Risco `alto` no `tarefas.json`** para: matriz e rota; serviço e transições; limite; leituras de pessoa e do Awave;
   migration.
4. **Inventários no plano**, por caminho e função: o do AN-05 (quem escreve o que o registro lê e qual trava toma) e o
   do AN-09 (toda rota cuja ação tem agente ou integração na matriz, com a vista que devolve).
5. **Testes transversais**: matriz × rotas × dois tokens e quatro agentes; sentinelas ampliado; varredura de leituras
   a partir da matriz; 404 idênticos do envio e do Awave; concorrência com duas conexões; prazo total com relógio falso.
6. **AN-13 em toda revisão de tarefa** (`git diff 0ac099a -- <lista>` e asserções por arquivo) e de novo na 08.
7. **Na 08**: revisão de segurança com foco em matriz, `corpoInvalido`, ordem das travas, prazo total, vistas por tipo
   de ator e transições; `pnpm audit --prod --audit-level high` sem alta nem crítica; achado crítico ou alto volta ao
   engenheiro e passa por reteste da `seguranca-aplicacao`.
8. **Fora do `/construir`** (Fabiano, depois do merge): backup, migration, deploy e só então `"andamento_ligado":
   true`. O token `construir` de produção é o mesmo; nada de token novo passa por chat, arquivo do repositório ou e-mail.

## 6. Fora do escopo

- A tool `consultar_demanda` e o vínculo contato↔demanda no Awave (E01, parte 3) (pedido.json, ESP; 01, seção 6).
- Prazo, previsão ou data estimada de qualquer tipo (pedido.json, ESP; 01).
- Texto livre no corpo: nome de tarefa, arquivo, agente ou erro (01).
- O `/construir` marcar `entregue` ou `encerrada` (A1); qualquer transição automática além das duas do RF-05 (01).
- Andamento para pedido escrito direto, sem demanda gerada no painel (A3): recebe 404 (01).
- Evento por tarefa pronta (A2) (01).
- Filtro da fila por fase; andamento na listagem `GET /api/demandas`; andamento na vista de agente (01).
- Selo de fase fora de `em_construcao`; andamento na T11 (03, seções 4.1 e 6).
- Atualização automática da T05: a página não se recarrega sozinha (03, 5.2).
- Token novo ou mudança na emissão: o `construir` ganha a ação pela matriz (01).
- Qualquer mudança em `enviar-andamento.mjs`, `lib/andamento.mjs`, `buscar-pedidos.mjs` ou no `awave-agents` (01).
- Expurgo de `andamento_construcao` (02, seção 4; RNF-10).
- Limite de requisição para envio no mesmo estado (04, Decisões; risco residual em 7.1).
- Deploy, migration em produção, troca de `"andamento_ligado"` e conferência em produção: ações de Fabiano depois do
  merge (01; 04, 5.5 item 8).

## 7. Pendências

### 7.1 Para Fabiano

| ID | Pendência | Origem | Bloqueia? | Se não decidir agora (recomendação das entregas) |
|---|---|---|---|---|
| **P-01** | **Decisão**: andamento de DEC substituído por um aprovado mais novo responde 409 sem gravar. Restringe a ESP: sem isso, o `cancelado` de um pedido antigo poria em `devolvida` a demanda em construção pelo pedido novo | 01 P-01 e CA-05.8; 02 fluxo passo 5; 03 5.2 (alerta de pacote substituído); 04 AN-04, AN-05 | Não | Vale o 409, que as quatro entregas já seguem |
| **P-02** | **Decisão**: tabela de contradição com status final. `entregue` aceita `construido`; `encerrada` aceita `cancelado`; o resto é 409. A ESP diz só "o que o contradiz" | 01 P-02 e seção 5; 02 ADR-34; 04 AN-04 | Não | Vale a tabela da seção 2.1 |
| **P-03** | **Decisão**: números do limite, 60 gravações por DEC e 600 no total por hora (o dobro do ritmo do `/construir`; cobre 20 pedidos). Mudar o número é decisão por pedido (ADR-24) e troca duas constantes e o texto do 429 | 01 P-03 e RF-12; 02 ADR-31; 03 seção 7; 04 AN-07 | Não | Valem 60 e 600 |
| **P-04** | **Aceite formal de risco residual** (com `gestao-riscos`): (a) o token `construir` passa a **escrever**, e o arquivo dele é legível pelo usuário `deploy`, que roda os agentes com Bash; um agente levado por injeção pode alterar fase e números e pôr demandas com pedido gerado em `em_construcao` ou `devolvida`, nunca em `entregue` (médio; ligado à D-F3, aceita e não executada, e à pendência (c) do 0016); (b) um token vazado esgota as 600 gravações da hora e para o andamento de todos os pedidos por até 1 h, e envios no mesmo estado (que não contam) seguram a trava do pedido e a linha da demanda até 8 s cada (médio); (c) `andamento_construcao` sem expurgo, com crescimento limitado pelo teto (baixo) | 04 seção 4 e Pendências; pedido.json (risco) | Não | Riscos ficam sem aceite registrado. A 04 recomenda, para (a), o envio do andamento rodar com um usuário do sistema que os agentes não usem, dono do arquivo do token |
| **P-05** | **Conferir do lado do Awave**: o 201 e o GET ganham a chave `andamento` (`null` no 201). A tool do Awave (`awave-agents`, 0ab8ced) não foi lida; do lado de cá, o teste de contrato da 0.3.0 cobre. Conferir antes de ligar a parte 3 da E01 | 01 P-08 | Não (fora do `/construir`) | A chave nova é aditiva; o risco é a tool do Awave rejeitar chave desconhecida |
| — | **Ação depois do merge**: backup; migrations `0008` e `0009` pelo migrator; deploy do `worker` e depois do `app`; sem snapshot (D5); saúde em 200; só então `"andamento_ligado": true`; conferir que a fase aparece na fila em até 2 minutos. Volta só pelo caminho B, com `"andamento_ligado": false` antes | 01 CA-13.3; 02 seção 8; 04 AN-14 e 5.5 item 8 | — | Fica na `main` sem ir para produção |
| — | **Lembrete, fora deste pedido** (E01, parte 3): quando o Awave mostrar o andamento ao cliente, usar os rótulos de fase da 03, sem número de tarefas fora da fase Construindo e sem prazo | 03 Pendências; pedido.json (risco) | — | — |

### 7.2 Para outras áreas, sem bloquear a construção

| Pendência | Dono | Origem |
|---|---|---|
| Escrever AN-01 a AN-15 como critérios, na ordem da 5.5, com risco `alto` nas tarefas listadas | `tech-lead` (05) | 04 seção 6 |
| Inventários do AN-05 (escritores e travas) e do AN-09 (rotas de leitura e vistas), por caminho e função | `tech-lead` (05) | 04 seção 6, item 4 |
| Decidir onde ficam os testes estáticos do AN-01 (citação da ação) e do AN-06 (sem `set local` no corpo) | `tech-lead` (05) | 04 Pendências |
| CA-04.6 como teste unitário de `lerAndamento` mais teste de que o CHECK recusa linha fora do formato; `privilegios.test.ts` e `imutabilidade.test.ts` com a tabela; T13 e pares exatos com a rota e o par novos; sentinelas na rota nova, inclusive `pgboss` | `tech-lead` (05) | 02 Pendências; 04 AN-10, AN-11 |
| Montagem do V-02: seed da homologação (demanda em `aprovada` com DEC de pedido gerado por pessoa, e DEC sem pedido gerado) e `passagens.jsonl` fictícios válidos para o `calcularEstado`; token conforme AN-15 | `tech-lead` (05) | 01 P-07; 04 AN-15 |
| Textos alterados mudam asserções de hoje (`dicaAprovada`; CA-07.1 com "Entregue" maiúsculo): mudar o texto do teste é permitido, a regra não | `tech-lead` (05) | 03 Pendências; 04 AN-13 |
| Grade da T05 (`GRADE`, Histórico de `xl:row-[2/-1]` para `xl:row-[3/-1]` quando a seção existe); conferir no axe e no e2e em 1280 px que nada se sobrepõe | `tech-lead` (05) | 03 5.1 e Pendências |
| Nome e arquivo das constantes de texto (`ROTULO_SITUACAO_CONSTRUCAO` ou `ROTULO_STATUS_CONSTRUCAO`, `TEXTOS_ANDAMENTO`) | `tech-lead` (05) | 02 seção 2; 03 seção 2 |
| As pendências do 0016 sobre a rede interna do Easypanel (`x-real-ip` forjável) e sobre `pnpm audit` sem `--prod` continuam abertas | `seguranca-informacao` | 04 Pendências |

Já respondidas dentro do pedido: armazenamento, contagem do limite, travas e privilégio mínimo (01 P-04 → 02, ADR-30 a
ADR-32); volta 0.4.0 → 0.3.1 (01 P-05 → 02, seção 8: só caminho B); textos de fases, selo, seção, evento, 409 e 429
(01 P-06 → 03, seções 7 e 8); primeira escrita do token, sentinelas e T13 (01 P-09 → 04, AN-01 e AN-11); trava global
e prefixo por linha (02 → 04, seção 4); textos do 422, 409 e 429 como constantes e "Quem age" (02 → 03, seções 5.6 e
7); mensagens 409 e 422 e link do DEC (03 → 04, seção 7); forma da leitura da fila (03 → 02: leitura separada por
página, então vale o estado de erro com alerta da 03, 4.4).

### 7.3 Divergências entre as entregas

| Ponto | Entregas | Vale |
|---|---|---|
| Base da versão | ESP: "main depois do merge do 0016 (0.3.0)"; 01, 02, 03 e 04 usam a 0.3.1 (`0ac099a`) | **0.3.1** (é a `main` atual; nada nela muda o contrato) |
| Quantas migrations | 01 RNF-05: "uma migration gerada"; 02 seção 8: duas, `0008` gerada e `0009` custom só com o GRANT, porque o padrão técnico manda SQL à mão para custom; 04 AN-10 aceita duas | **02 e 04** (ambas aditivas, `alteram_dado = false`; o espírito do RNF-05 fica) |
| Verificação do CA-04.6 | 01: andamento fora do esquema "inserido à mão" lido pela fila, detalhe e API sem erro; 02 ADR-30: o CHECK do banco recusa a linha, então vira teste unitário de `lerAndamento` mais teste do CHECK; 04 AN-12 mantém o Zod na leitura | **02** (o comportamento de "sem andamento, sem 500" continua; muda só como se prova) |
| Rótulo da data no detalhe | ESP (7) "quando foi atualizado"; 01 RF-09 e CA-09.1 "Atualizado em <data e hora>"; 03 5.2 "Última mudança informada pelo /construir em <data e hora>." | **03** (o envio no mesmo estado não muda a data, RF-04; "Atualizado" faria achar que o `/construir` parou). O `<time datetime>` do CA-09.1 continua |
| O que a data mostra | 02 seção 7: "o 'Atualizado em' mostra quando o andamento parou de chegar"; 03 5.2: a data só muda com mudança de estado, então não distingue envio parado de pedido sem mudança | **03** (consequência do RF-04). O painel não tem sinal de que o envio parou; ninguém pediu esse sinal neste pedido |
| Texto da Próxima ação (RF-07) | 01: "…marque como entregue.", quem age "Uma pessoa"; 02: deixa a escolha à 03 (`UMA_PESSOA` ou "Uma pessoa"); 03 5.6: "Entregue" maiúsculo, detalhe novo, quem age "Uma pessoa (CTO ou administradora)" (`UMA_PESSOA`) | **03** (o 01 delegou o texto final; o CA-07.1 segue a 03) |
| Fluxo do registro sem a conferência DEC ↔ demanda | 02 seção 3: usa o `demandaId` do evento `pedido_gerado`; 04 AN-03: compara com o `demanda_id` de `pacote_decisao` e devolve o mesmo 404 se diferir | **04** (passo 2 da seção 3.3; uma leitura por chave primária, falha fechada) |
| Transação de quem chama | 02 seção 3: `executarComOrcamento(deps.pool, ator, 'padrao', t, …)`; 04 AN-06: a rota chama sem transação, `undefined`, sem `t` usado pela rota e sem `set local` no corpo | **04** (protege o prazo total de 8 s) |
| Nome da constante de situação | 02 seção 2: `ROTULO_STATUS_CONSTRUCAO`; 03 seção 2: `ROTULO_SITUACAO_CONSTRUCAO`, com "Em andamento", "Concluída", "Cancelada" | **Texto da 03; nome do `tech-lead`** (a 03 diz que o nome e o arquivo são dele) |
| Selo de `cancelado` | 01 RF-08 define o selo só para `em_construcao` e `construido`; 03 4.1 acrescenta "Construção cancelada" para a demanda que uma pessoa voltou a Em construção depois do cancelamento | **Sem divergência**: a 03 cobre um caso que o 01 não citou, sem mudar a regra de quando o selo aparece |
| Seção do detalhe em outros status | 01 RF-09 não restringe; 03 5.1 mostra a seção em qualquer status com andamento | **Sem divergência**: só o selo da fila é restrito a `em_construcao` (RF-08) |
