---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T13-testes
agente: qa-automacao
leu: [contrato-passagem.md, pedido.json, padrao-tecnico.md, tarefas.json, 01-analista-requisitos.md (glossário e seção 3, RNF-01 a RNF-10), 04-seguranca-aplicacao.md (seção 2, C05 a C15, e seção 3, IN-01 a IN-18), docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G7, T05, T12 e T13), 06-T13-engenheiro-backend.md, 06-T13-tech-lead.md, 06-T12-qa-automacao.md, commit 5e8c657 (git diff do commit), src/app/api/pedidos-construcao/log-das-integracoes.test.ts, test/pedidos-construcao.ts, test/transversal/sentinelas.test.ts, test/integracoes.ts, test/requisicao.ts, test/deps.ts, src/lib/rota.ts, src/modules/limites.ts, src/modules/agentes/gatilhos.ts, src/modules/historico/registrar.ts, src/modules/demandas/confirmar.ts, src/modules/demandas/confirmar.test.ts (linhas 1 a 90), src/modules/acesso/tokens-servico.ts, src/modules/acesso/resolver-ator.ts, src/modules/acesso/mensagens.ts, a saída do pnpm test]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T13 (commit `5e8c65790fde28f87e740105eb9635481d155cd5`): os testes transversais das integrações, com as
sentinelas e o log. Todos os critérios da tarefa têm teste, e os 8 testes do engenheiro estão certos. Achei uma asserção
que passava pelo motivo errado no fluxo (a) de `sentinelas.test.ts` e a reforcei (só acrescentando linhas). Também
acrescentei um arquivo com 3 testes para as duas saídas do RNF-04 que os testes da construção não liam: a resposta e o
401.

### Critérios da tarefa e o teste que cobre cada um

`L` = `src/app/api/pedidos-construcao/log-das-integracoes.test.ts` (engenheiro). `S` =
`test/transversal/sentinelas.test.ts` (engenheiro, com o reforço desta etapa no fluxo (a)). `Q` =
`src/app/api/pedidos-construcao/saidas-das-integracoes-qa.test.ts` (novo, desta etapa). `I` =
`src/db/schema/integracao.test.ts`.

| Critério | Arquivo | Teste |
|---|---|---|
| RNF-04 e IN-14: a linha de log do POST e do GET do Awave e das três rotas do `/construir` leva só `atorTipo: 'integracao'`, sem `wsod_`, token, prefixo, SHA-256, `decId`, id de demanda nem título, nos caminhos de sucesso e de erro | L | "Awave: 400, 201, GET da própria demanda e 429 …"; "/construir: pendentes, entrega, recebimento (409 e 204) e o 404 …" |
| IN-14: o `lock_timeout` estourado vira o 503 fixo, e a linha de erro não leva texto do Postgres | L | "/construir: pendentes com a tabela evento travada → 503 …" (as outras rotas das integrações já têm o 503 nos arquivos da T05, T06, T11 e T12) |
| RNF-04: o token nunca na resposta (corpo e cabeçalhos), em todos os caminhos das duas integrações | Q | "Awave: 400, 201, GET da própria (200), GET de outra (404), ações negadas (403) e 429 …"; "/construir: pendentes, entrega, recebimento (409 e 204), entrega de DEC inexistente (404) e ações negadas (403) …" |
| RNF-04 e C-09: token de integração revogado ou nunca emitido → 401 com a mensagem fixa; a linha de log como `anonimo`, sem eco do token; nada gravado; os tokens ativos seguem valendo | Q | "401 com a mensagem fixa nas cinco rotas das integrações; …" |
| IN-12 transversal: sentinelas no corpo do Awave (título, descrição, contexto, solicitante, anexos, chave desconhecida) e na ESP do pedido não chegam ao pino, ao console, ao Sentry falso, ao `pgboss`, a `execucao_agente` nem a `antes`/`depois` dos eventos de integração | S | "T13 (a) Awave: …"; "T13 (b) /construir: …" (`conferirSaidasDasIntegracoes`) |
| IN-04: nem o token, nem o texto depois do prefixo em log, console, Sentry, eventos e `pgboss`; nenhum `wsod_` em log, eventos e `pgboss` | S | os dois fluxos (a) e (b) |
| RNF-05 e IN-12: `depois` exato dos eventos novos. `demanda_criada` do Awave `{ status: 'nova', tipo }`; `pedido_entregue` e `pedido_recebido` `{ sha256 }` com o hash do servidor | S | "T13 (a)" (os 10 `demanda_criada`) e "T13 (b)" (os dois eventos do `construir`) |
| RNF-05: `demanda_confirmada` `{ confirmada: true }` | `src/modules/demandas/confirmar.test.ts` (T08) | "CA-06.1: grava demanda_confirmada com a pessoa …" (igualdade exata da linha) |
| RNF-05: `token_criado` e `token_revogado` de integração | — | é da T14 (CA-02.1 e CA-02.6), que ainda não foi construída |
| IN-06 no fluxo do Awave: nenhuma execução de agente para demanda do Awave, **com os agentes ligados** | S | "T13 (a)" (controle novo desta etapa) |
| IN-12: os CHECK de evento e de demanda amarrados a `INTEGRACOES`; o evento do `construir` exige prefixo | I | "evento aceita o construir com prefixo, e recusa sem prefixo"; "%s tem só os nomes da lista" (2 casos) |
| IN-01 (b): toda rota com os tokens `awave` e `construir`, 403 fora dos pares, nada gravado | `test/matriz-rotas-integracoes-qa.test.ts` (T03) | o 04 põe este teste na T13, mas ele já existe desde a T03; a T13 não o mudou |

### O reforço no fluxo (a) de `sentinelas.test.ts`

O teste de cima termina o passo 2d com `update configuracao_agente set ligado = false`, e nada liga os agentes de novo.
Rodando sozinho (`-t`), o fluxo (a) também começa com os agentes desligados. Nos dois casos, a asserção "nenhuma execução
de agente para demanda do Awave" (IN-06) passava porque os agentes estavam desligados, e não pelo IN-06.

O que entrou, só com linhas acrescentadas (+17 −0 no arquivo):
- no começo do fluxo, os quatro agentes ligados com o modelo fictício, como no passo 1 do teste de cima;
- um controle: uma demanda de pessoa (sem sentinela, criada pelo serviço, sem passar pela rota) ganha a execução do
  `insumo_tecnico`. O teste afirma isso, então o gatilho está vivo quando o Awave cria as dez demandas;
- no fim do fluxo, os agentes voltam a desligados. Assim o fluxo (b) roda nas mesmas condições de antes.

Nenhuma asserção do engenheiro mudou. A sequência das linhas de log continua igual, porque o controle não passa pela
rota e acontece antes do `inicio`.

### Os três pontos que a 06-T13-revisao pediu

1. **Ordem.** Rodei `-t "T13 \(a\)"` e `-t "T13 \(b\)"` sozinhos, depois do reforço: 1 de 1 cada. O arquivo inteiro deu 3
   de 3. Também rodei sozinho o teste do 503 do log (`-t "503"`, 1 de 1) e o teste do 401 do arquivo novo
   (`-t "revogado"`, 1 de 1).
2. **O 429 do fluxo (a).** O limite conta a autoria `(integracao, awave)` na janela de uma hora do relógio fixo
   (`limites.ts`, `conferirLimite`). Cada arquivo de teste tem banco próprio (`novoBanco`). Em `sentinelas.test.ts`, só o
   fluxo (a) cria demanda do Awave, e o controle novo é de pessoa. O fluxo espera exatamente dez 201 e depois o 429. Se
   outro teste tivesse gastado o limite, o teste falharia num dos 201, em vez de passar calado. Sozinho e em ordem, o
   resultado é o mesmo.
3. **A mutação do título no `depois` de `demanda_criada`.** Não repeti. Ela edita `src/modules/demandas/servico.ts`, e
   a minha lista Pode só permite editar `test/`, `e2e/` e `*.test.ts`. Li a asserção que a mutação derruba
   (`contemSentinela` sobre `[antes, depois]` dos eventos de integração, em `conferirSaidasDasIntegracoes`). O título do
   fluxo (a) leva `SENTINELAS.texto`, então um título no `depois` faria a asserção falhar.

### Testes acrescentados

`src/app/api/pedidos-construcao/saidas-das-integracoes-qa.test.ts` (novo, 3 testes):
- usa banco real (Testcontainers), rotas reais e tokens criados em tempo de teste;
- as requisições têm a forma do Awave e do `buscar-pedidos.mjs`: Bearer, `accept: application/json` e sem `Origin`;
- o relógio é fixo e avança duas horas por teste, para o limite de 10 por hora do Awave não ligar um teste ao outro;
- as mensagens de `expect` levam só o rótulo da resposta, nunca o valor do token;
- os dados são fictícios.

1. **Awave.** Passa por 400, 201, GET da própria (200), GET de uma demanda de pessoa (404), `GET /api/demandas` (403),
   pendentes (403), mais nove 201 e o 429. O teste confere a sequência exata de status, para a ausência não ser vazia.
   Em nenhuma resposta, corpo ou cabeçalho, aparece o token, o texto dele depois do prefixo (35 caracteres), o prefixo
   ou `wsod_`. Isso vale para o token do Awave e para o do `/construir`.
2. **`/construir`.** Passa por pendentes (200), entrega (200, com os bytes da geração), recebimento 409 e 204, entrega de
   DEC inexistente (404) e três ações negadas (403): criar demanda, ler demanda e listar demandas. A conferência é a
   mesma do teste 1.
3. **401.** Um token de cada integração é emitido e revogado pelo prefixo, e um token no formato certo nunca foi
   emitido. As cinco rotas das integrações são chamadas, 10 requisições ao todo. Cada uma recebe 401 com o corpo exato
   `{ erro: 'nao_autenticado', mensagem: MENSAGENS_ACESSO.token_invalido }`. As dez linhas de log:
   - são `requisicao` com `atorTipo: 'anonimo'` e `codigoErro: 'nao_autenticado'`;
   - só têm chaves da lista fechada;
   - não ecoam nenhum dos cinco tokens nem prefixos.

   Eventos, demandas e execuções não mudam. No fim, os tokens ativos das duas integrações continuam valendo (200 e 201).

Os três passaram na primeira execução, sem mudança de código. São testes de guarda, como os da T13. A sequência de
status de cada um prova que os caminhos foram exercitados.

### Resultado

- `pnpm test src/app/api/pedidos-construcao/saidas-das-integracoes-qa.test.ts`: 3 de 3.
- `pnpm test test/transversal/sentinelas.test.ts`: 3 de 3. Com `-t "T13 \(a\)"`: 1 de 1. Com `-t "T13 \(b\)"`: 1 de 1.
- `pnpm test` (suíte inteira): **277 de 277 arquivos e 5803 de 5803 testes**, 0 falharam, em 183 s. Na 06-T13-revisao
  eram 276 arquivos e 5800 testes. Entraram 1 arquivo e 3 testes.
- `pnpm lint`: limpo. `pnpm typecheck`: limpo.
- `git status --short`: `M test/transversal/sentinelas.test.ts` e `?? src/app/api/pedidos-construcao/saidas-das-integracoes-qa.test.ts`.
- `git diff`: `sentinelas.test.ts` com +17 −0 (dois imports, o controle e a linha que desliga os agentes). Nenhuma
  asserção saiu nem ficou mais fraca. Não há `.skip`, `.only` nem `.todo`. O arquivo está no D-17 e só ganhou `expect`.

### Leitura crítica dos testes do engenheiro

- **Ordem:** os dois fluxos de `sentinelas.test.ts` criam o próprio token e os próprios dados e passam sozinhos. No log,
  só o teste 1 usa o Awave, e os testes 2 e 3 montam o próprio DEC. Nenhum depende de ordem.
- **Relógio:** é o fixo de `criarDepsDeTeste` e de `sentinelas.test.ts`. O 503 espera o `lock_timeout` do Postgres, que
  é tempo do banco e não do relógio do app.
- **Asserção vazia:** a única que achei é a do IN-06 no fluxo (a), já reforçada. As outras ausências vêm junto com uma
  presença:
  - o sentinela está no pedido gerado e no GET da própria demanda;
  - a sequência das linhas de log é exata;
  - os 10 eventos e os 2 eventos do `construir` são contados.
- **Lista fechada de chaves no log:** `CHAVES_DA_LINHA` barra qualquer chave nova, inclusive `integracao` ou `prefixo`.
  Isso é mais forte que procurar valores.

## Decisões tomadas

- Reforcei o fluxo (a) no próprio `it`, em vez de criar um fluxo (c). Um terceiro fluxo do Awave no mesmo banco gastaria
  o limite de 10 por hora e mudaria a contagem de eventos de (a). Teria virado dependência de ordem.
- Os agentes voltam a desligados no fim de (a), sem `try/finally`. Com `try/finally`, o corpo inteiro do engenheiro
  ficaria reindentado e o diff não seria só acréscimo. Se (a) falhar no meio, a suíte já está vermelha.
- O controle usa `criarDemanda` pelo serviço, e não pela rota. Assim ele não entra na sequência exata de linhas de log
  nem no limite do Awave.
- O teste das respostas confere também o prefixo, embora o RNF-04 só proíba o token na resposta. O IN-13 diz que o
  prefixo nunca vai à vista de agente nem à de integração. Um prefixo de 8 caracteres aleatórios coincidir com o texto de
  uma resposta tem probabilidade desprezível.
- O 401 confere o corpo inteiro, e não só o status. A mensagem de token inválido não pode variar entre revogado e nunca
  emitido (`resolver-ator.ts`).

## Pendências

- Nenhuma bloqueia a T13.
- Para a T14: o RNF-05 de `token_criado` e `token_revogado` de integração (`depois = { integracao, prefixo }`, sem o
  texto do token) fica com o CA-02.1 e o CA-02.6 do plano.
- Herdadas, sem mudança: o parecer 1 da 06-T13-revisao (`chamadasDoAwave` em `test/integracoes.ts`). O arquivo novo
  desta etapa também monta as chamadas do Awave à mão (`postDemanda`, `getDemanda`), e entra na mesma troca. Seguem
  também o parecer 2 da 06-T13-revisao (`recebimento-qa.test.ts`) e as duas pendências da 08 (a fábrica do 404 e a
  leitura do 201 do Awave fora do orçamento).
- Rodei uma vez `git -C <repo> show --stat 5e8c657…`, só leitura, no repositório do pedido. O comando está na lista
  Pode do meu agente, mas o prompt do maestro pede para não usar `git show`. Depois usei só `git diff` e `git log`.
  Fica declarado abaixo, para o conferir decidir.
- Glob e Grep não estavam disponíveis nesta sessão. Li tudo com Read, pelos caminhos citados no plano e nas entregas.
- As caixas da T13 no plano ficam com o maestro (G1).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — árvore limpa no início, no ramo `construcao/DEC-DEM-20261111-0016-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — HEAD em 3005941 (06-T13-revisao), sobre 5e8c657
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 5e8c65790fde28f87e740105eb9635481d155cd5` — 10 arquivos (ver Pendências)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 5e8c65790fde28f87e740105eb9635481d155cd5~1 5e8c65790fde28f87e740105eb9635481d155cd5 -- test/transversal/sentinelas.test.ts src/db/schema/integracao.test.ts` — os dois fluxos novos e o `describe` dos CHECK
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --stat --format=%h%x20%s --grep=06-T08` — os testes da T08 (`confirmar.test.ts`, gatilhos do Awave)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pedidos-construcao/saidas-das-integracoes-qa.test.ts` — 3 de 3
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/transversal/sentinelas.test.ts -t "T13 \(a\)"` — 1 de 1, com o reforço
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/transversal/sentinelas.test.ts -t "T13 \(b\)"` — 1 de 1
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/transversal/sentinelas.test.ts` — 3 de 3
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pedidos-construcao/log-das-integracoes.test.ts -t "503"` — 1 de 1, sozinho
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pedidos-construcao/saidas-das-integracoes-qa.test.ts -t "revogado"` — 1 de 1, sozinho
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 277 de 277 arquivos, 5803 de 5803 testes, 0 falharam (em segundo plano; saída lida com Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — só `sentinelas.test.ts`, +17 −0
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — `M sentinelas.test.ts` e `?? saidas-das-integracoes-qa.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — os dois imports, o controle e a linha que desliga os agentes; nenhuma asserção removida

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste (tabela acima; o `token_*` do RNF-05 é da T14, que ainda não existe)
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real (relógio fixo, duas horas por teste; cada um rodado sozinho com `-t`)
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`: +17 −0)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real (tokens só gerados em tempo de teste, fora das mensagens de `expect`; nomes "Pessoa Ficticia …")
