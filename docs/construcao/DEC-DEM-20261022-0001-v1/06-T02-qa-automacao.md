---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T02-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (cabeçalho e G1 a G6 e T01 e T02), 01-analista-requisitos.md (RF e RNF-10 e matriz), 04-seguranca-aplicacao.md (seções 1 a 4 com C-21 e D9), 05-tech-lead.md, 06-T02-engenheiro-backend.md, 06-T02-tech-lead.md, 06-T01-qa-automacao.md (cabeçalho), git show 6372a4a (--stat), git show b9737de (--stat), git show 88fd6b8 d7dc4d1 73313f2 9ca8d3e (--stat), src/lib/log.ts, src/lib/log.test.ts, src/lib/reduzir-erro.ts, src/lib/reduzir-erro.test.ts, src/lib/sentry.ts, src/lib/sentry.test.ts, test/sentinelas.ts, vitest.config.ts, package.json]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T02 (Log por lista de permissão e Sentry sem dado pessoal, risco alto). Cobre a base de C-21, a base de RNF-10
e D9. O código testado é o do `6372a4a` com a correção do `b9737de`. Todos os testes novos passaram no código como está,
então nada volta para a construção. Só mudaram arquivos de teste. Nenhum arquivo de código, configuração ou dependência
foi alterado.

### Critérios da tarefa e os testes que os cobrem

| # | Critério (plano T02 e C-21, RNF-10, D9) | Arquivo | Testes |
|---|---|---|---|
| 1 | O log descarta todo campo fora de `CAMPOS_PERMITIDOS` (C-21) | `src/lib/log.test.ts` | `descarta campo fora da lista`; `mantém os campos da lista e nada além deles, do pino só nível e hora`; **novos** `nível info/warn/error: nenhum sentinela passado como campo de topo chega à saída` (3 casos) e `campo permitido herdado do protótipo não passa: só conta a chave própria do objeto` |
| 2 | Erro do Postgres e do Drizzle vira `{ classe, code }` antes de chegar ao pino (C-21) | `src/lib/log.test.ts`, `src/lib/reduzir-erro.test.ts` | `erro vira { classe, code } antes de ir à saída`; `erro em texto solto não vai à saída: vira classe desconhecida`; **novos** `erro de consulta do Drizzle com causa do Postgres sai só com a classe e o code da causa` e `erro nulo, indefinido ou numérico vira classe desconhecida`; em `reduzir-erro.test.ts`: `tira mensagem e detail do Postgres`, `desembrulha a causa do erro de consulta do Drizzle...`, `valor que não é Error vira classe desconhecida`, `code que não é texto curto de código não passa adiante`, `nome de classe com texto livre não passa adiante` |
| 3 | O mesmo vale antes do Sentry: o erro original nunca é enviado, só classe e `code` (C-21, D9) | `src/lib/sentry.test.ts` | `o envelope enviado pelo transporte falso não tem sentinela (C-21)`; **novos** `erro com cause encadeada não leva a mensagem nem a pilha da causa`, `valor que não é Error vai como "desconhecido", sem o conteúdo`, `objeto com message e code que não é Error não vaza o message` e `code com texto livre não vai ao título do Sentry` |
| 4 | O `redact` continua como segunda barreira, com `*.email`, `*.nome`, `*.anexos` e `*.referencia` a mais (C-21) | `src/lib/log.test.ts` | `redact continua como segunda barreira para campo permitido com objeto`; **novo** `segunda barreira: a chave %s dentro de campo permitido sai como [removido]` (16 casos, um por chave da lista `REDACT`, para que tirar qualquer uma delas quebre o teste) |
| 5 | O `beforeSend` remove `request.data`, cookies, cabeçalhos, query, `extra`, `user` e `contexts.response` (C-21; plano T02) | `src/lib/sentry.test.ts` | `beforeSend remove request.data, cookies, cabeçalhos, query, extra e user` (teste unitário do `limparEvento`); **novo** `usuário, extra e contexto da resposta postos no escopo não chegam ao envelope pelo beforeSend real`, que prova que o `limparEvento` está ligado no `Sentry.init` e roda sobre o evento montado pelo SDK |
| 6 | Breadcrumbs não saem (`beforeBreadcrumb: () => null`, plano T02) | `src/lib/sentry.test.ts` | **novo** `breadcrumb com sentinela é descartado e não vai no envelope` |
| 7 | A pilha enviada leva só os quadros, nunca a mensagem (parecer 1 da revisão, C-21) | `src/lib/sentry.test.ts` | `linha da mensagem que começa por "    at " não vira quadro de pilha no Sentry (C-21)`; `subclasse que troca o name no construtor mantém os quadros e não vaza a mensagem`; `stack que não começa pelo cabeçalho atual do erro não manda quadro nenhum, só o título`; **novos** `Error.stackTraceLimit = 0 com mensagem de várias linhas não manda a mensagem` e `erro com name vazio e mensagem com linha "    at " não manda a mensagem` (os dois casos de borda citados na `06-T02-tech-lead.md` que ainda não tinham teste) |
| 8 | DSN ausente = Sentry desligado (interface `iniciarSentry` do plano) | `src/lib/sentry-desligado.test.ts` (novo) | **novo** `sem DSN (ausente ou vazio) o Sentry não liga, não cria transporte e capturarErro não falha` |
| 9 | O `log` padrão usa o destino atual, trocável no teste por `substituirDestinoDoLog`, com o mesmo filtro | `src/lib/log.test.ts` | `o log padrão escreve no destino trocado pelo teste, com o mesmo filtro` |
| 10 | Sentinelas fictícias únicas para todo teste de vazamento (RNF-10, G3.2) | `test/sentinelas.ts` | usadas por todos os testes acima; nenhum sentinela aparece na saída capturada do pino nem no transporte falso do Sentry |

O teste da RNF-10 com o fluxo completo e os caminhos de erro (400, 409, restrição, agente fora do schema, Resend) é da
T34, como diz o plano. A linha de requisição é da T11, e o login que falhou sem o e-mail é da T09. Nenhum desses é
critério da T02.

### Testes acrescentados (31)

- `src/lib/log.test.ts`: 22 casos novos (3 do `it.each` por nível, 16 do `it.each` por chave do `redact`, Drizzle com
  causa, erro nulo, indefinido ou numérico, e campo herdado do protótipo).
- `src/lib/sentry.test.ts`: 8 casos novos (escopo pelo `beforeSend` real, breadcrumb, valor que não é Error, objeto
  parecido com erro, `code` com texto livre, `stackTraceLimit = 0`, `name` vazio, `cause` encadeada).
- `src/lib/sentry-desligado.test.ts`: arquivo novo, 1 caso. Fica separado porque o Sentry é estado global do processo
  e o `sentry.test.ts` o inicia com DSN no `beforeAll`. O Vitest isola cada arquivo, e o teste passa sozinho e na
  suíte.

### Resultado

- `pnpm test`: 11 arquivos, 88 testes, 88 passaram e 0 falharam (eram 57 antes, mais os 31 novos). Rodou duas vezes
  na suíte inteira com o mesmo resultado, e os dois arquivos do Sentry também passaram rodando sozinhos (13 de 13 e 1
  de 1).
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.

### Conferência com `git diff`

- `src/lib/log.test.ts` e `src/lib/sentry.test.ts`: só linhas acrescentadas. Nenhum teste apagado, nenhuma asserção
  mudada e nenhum `.skip`, `.only` ou `.todo`.
- `src/lib/sentry-desligado.test.ts`: arquivo novo.

## Decisões tomadas

- Um caso por chave do `redact`: o teste antigo cobria só `senha` e `token`, e C-21 exige as quatro chaves a mais
  nominalmente. Com um caso por chave, tirar qualquer uma delas da lista quebra um teste com nome claro.
- O teste do escopo passa pelo `Sentry.init` real, não só pelo `limparEvento`: o teste unitário não prova que a função
  está ligada no `beforeSend`, e esta prova, porque o SDK junta usuário e extra do escopo ao evento antes do
  `beforeSend`.
- Escopo, breadcrumb e `Error.stackTraceLimit` ficam presos ao teste que os usa (`withScope`, `withIsolationScope` e
  `try/finally`). Cada teste zera os envios no `beforeEach`, e assim nenhum depende de ordem.
- Nenhum teste lê o relógio real nem confere hora. O `time` do pino só aparece como nome de chave.
- O IP do teste do escopo é `203.0.113.7`, da faixa reservada para documentação (TEST-NET-3), e os demais valores são
  as sentinelas de `test/sentinelas.ts`. Não há dado pessoal real.

## Pendências

- Nenhuma que segure a passagem.
- Minor, para a T34 (sentinelas transversais): o `redact` do pino com `*.<chave>` só alcança o primeiro nível dentro de
  um campo permitido. Um objeto mais fundo, como `erro: { causa: { email: ... } }`, ou um valor sem chave sensível,
  como `quantidade: { qualquer: ... }`, passa inteiro. Hoje é a lista de permissão que segura. Na T34, conferir que
  nenhum chamador põe objeto livre em campo permitido, ou fazer o `filtrar` aceitar só valor primitivo fora de `erro`.
- Minor, para a T11 ou a T34: o `reduzirErro` não tem `try/catch`. Um erro cujo getter de `name` lança faz o
  `capturarErro` e o `log.error` lançarem também, dentro do próprio tratamento de erro. Isso não vaza dado, por isso
  não virou teste nem devolução, mas o `quadrosDaPilha` já se protege desse caso e o `reduzirErro`, chamado antes
  dele, não.
- Continuam valendo os Minors 1 a 5 da `06-T02-tech-lead.md` (T34, T11 e T13), entre eles o `beforeSendTransaction`,
  que é ignorado no `@sentry/node` 11.4.0.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — árvore limpa no ramo `construcao/DEC-DEM-20261022-0001-v1`, antes de começar
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -15` — commits da T02: `6372a4a`, `9ca8d3e`, `73313f2`, `d7dc4d1`, `b9737de`, `88fd6b8`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 6372a4a` — 9 arquivos, os 7 da T02 mais a entrega e o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat b9737dea0064399d493c448bde9698cea9bd821a` — 4 arquivos: `src/lib/sentry.ts`, `src/lib/sentry.test.ts`, a entrega e o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 88fd6b8 d7dc4d1 73313f2 9ca8d3e` — só a entrega do tech-lead e o `passagens.jsonl`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 10 arquivos, 57 de 57, antes dos testes novos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 11 arquivos, 88 de 88, com os testes novos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/sentry-desligado.test.ts` — 1 de 1
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/sentry.test.ts` — 13 de 13
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 11 arquivos, 88 de 88, segunda rodada
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — `src/lib/log.test.ts` e `src/lib/sentry.test.ts` alterados, `src/lib/sentry-desligado.test.ts` novo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — só linhas acrescentadas nos dois arquivos de teste

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
