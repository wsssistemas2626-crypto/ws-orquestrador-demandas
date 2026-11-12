---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T13-construcao
agente: engenheiro-backend
leu: [contrato-passagem.md, pedido.json, padrao-tecnico.md, 05-tech-lead.md, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G8, fim da T12, T13, T14 e T15), 06-T01-tech-lead.md, 06-T03-tech-lead.md, 06-T03-qa-automacao.md, 06-T05-tech-lead.md (linhas 40 a 128), 06-T05-qa-automacao.md (linhas 60 a 116), 06-T06-engenheiro-backend.md (linhas 90 a 213), 06-T06-tech-lead.md, 06-T08-tech-lead.md, 06-T11-engenheiro-backend.md (linhas 100 a 179), 06-T11-tech-lead.md, 06-T11-qa-automacao.md (linhas 100 a 154), 06-T12-engenheiro-backend.md, 06-T12-tech-lead.md, 06-T12-qa-automacao.md, test/transversal/sentinelas.test.ts, test/sentinelas.ts, test/requisicao.ts, test/integracoes.ts, test/deps.ts, test/sessao.ts (linhas 1 a 60), vitest.config.ts, src/app/api/pedidos-construcao/entrega.test.ts, src/app/api/pedidos-construcao/entrega-qa.test.ts, src/app/api/pedidos-construcao/recebimento.test.ts, src/app/api/pedidos-construcao/recebimento-qa.test.ts (linhas 1 a 170), src/modules/pedido-construcao/receber.ts, src/modules/acesso/tokens-servico.ts, src/modules/demandas/servico.ts (linhas 100 a 250), src/modules/demandas/schemas.ts, src/modules/limites.ts, src/lib/rota.ts, src/lib/log.ts, src/app/api/demandas/[id]/route.ts, src/app/api/pacotes-decisao/[decId]/pedido-construcao/route.ts, src/db/schema/historico.ts, src/db/schema/demandas.ts (linhas 20 a 89), src/db/schema/integracao.test.ts, src/db/schema/dominio.test.ts, a saída do pnpm test]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T13: testes transversais das integrações, com as sentinelas e o log (IN-12 transversal, IN-14, RNF-04, RNF-05, IN-04). A
tarefa só tem testes. Nenhum módulo de produção mudou: `git diff --stat -- src/modules test/estatico` sai vazio, e o G4
também.

### Conferência antes de começar

A T13 modifica `test/transversal/sentinelas.test.ts` (só acrescenta) e cria
`src/app/api/pedidos-construcao/log-das-integracoes.test.ts`. O Minor 1 da 06-T12-revisao pede um ajudante em `test/`, e
o Minor 2 da 06-T01-revisao pede um caso em `src/db/schema/integracao.test.ts`. Todos os arquivos estão em `src/` ou
`test/`, dentro da minha lista Pode. Não houve motivo para devolver ao plano.

### Pendências das entregas 06-T01 a 06-T12 que citam a T13

A busca foi `git log -G T13` na pasta do pedido. Citam a T13: 06-T01-revisao, 06-T03 (revisão e testes), 06-T05 (revisão
e testes), 06-T06 (construção e revisão), 06-T08-revisao, 06-T11 (as três) e 06-T12 (as três).

| De onde | O que pede | Como ficou |
|---|---|---|
| 06-T12-revisao, Minor 1, e 06-T12-testes | extrair para `test/` o preparo repetido de `entrega.test.ts` e `recebimento.test.ts` (`ESP_COMPLETA`, `RSK_PADRAO`, `novoDec`, `aprovar`, `prepararDec`, `listar`, `entregar`, `LinhaEvento`), também copiado em `entrega-qa.test.ts` e `recebimento-qa.test.ts`, sem mudar asserção | **Feito.** `test/pedidos-construcao.ts` (novo). Os quatro arquivos usam o ajudante, e a T13 também. Explicação trecho a trecho em "Mudança nos quatro testes do /construir" |
| 06-T12-revisao, Minor 2 | `naoEncontrado()` repetido em `receber.ts:34`, `entregar.ts:24` e `rota.ts:78` | **Não feito, de propósito.** O caminho que a revisão deu é "na `08-revisao` ou num pedido de sobras", com `rota.ts` congelado (G4). A T13 só tem testes (risco baixo), e a lista dela não inclui módulo de produção. Fica para a 08 |
| 06-T01-revisao, Minor 2 | o evento aceitar `construir`, e os literais dos CHECK de evento e de demanda amarrados a `INTEGRACOES` | **Feito** em `src/db/schema/integracao.test.ts`, só acrescentando (desvio 2) |
| 06-T05-revisao, Minor 1, e 06-T05-testes | IN-14 transversal: o 503 do orçamento, com a trava de tabela, nas rotas das integrações | **Conferido e completado.** O GET do Awave (`leitura-awave-qa.test.ts`), o POST do Awave (`criacao-awave.test.ts`, teste 6), a entrega (`entrega.test.ts`, IN-14) e o recebimento (`recebimento.test.ts`, IN-14) já provam o 503. Faltava a lista de pendentes, que agora está em `log-das-integracoes.test.ts`, teste 3 |
| 06-T06 (construção e revisão), parecer 1 | decidir se a leitura do 201 do Awave (`obterDemanda` depois do COMMIT) entra no orçamento | **Não decidi.** A pendência é "para a T13 **e a 08**", e mudar `criarDemanda` sai da T13, que só tem testes. Recomendo à 08 a mudança pequena: só para integração, ler a vista dentro da transação de `naTransacaoDaCriacao`. O risco residual (500 com a demanda gravada) é o que a 04, seção 6, já aceita |
| 06-T03-revisao, parecer 4 (repetido na 06-T03-testes, 06-T11 e 06-T12) | tirar a dependência de ordem do "nada gravado" de `test/matriz-rotas.test.ts`, para quem tocar o arquivo | **Não toquei o arquivo**, que está no D-17 e não está na lista da T13. A prova sem dependência de ordem já existe em `test/matriz-rotas-integracoes-qa.test.ts` (06-T03-testes). Continua para quem tocar o arquivo |

### Arquivos

| Arquivo | O que é |
|---|---|
| `src/app/api/pedidos-construcao/log-das-integracoes.test.ts` (novo) | 3 testes do log das rotas das integrações (RNF-04, IN-14) |
| `test/transversal/sentinelas.test.ts` | 2 fluxos novos, Awave e `/construir`, mais a conferência das saídas. O teste de hoje não mudou: só entraram linhas depois dele e dois imports |
| `test/pedidos-construcao.ts` (novo) | ajudante comum do `/construir` (Minor 1 da 06-T12-revisao) |
| `src/app/api/pedidos-construcao/entrega.test.ts`, `entrega-qa.test.ts`, `recebimento.test.ts`, `recebimento-qa.test.ts` | o preparo passou a vir do ajudante; nenhuma asserção mudou |
| `src/db/schema/integracao.test.ts` | 3 testes novos (Minor 2 da 06-T01-revisao) |

`test/sentinelas.ts` não mudou: os sentinelas de hoje bastaram. Sem migration, GRANT, pacote, variável de ambiente nem
linha de log nova.

### Testes criados

**`log-das-integracoes.test.ts`** (banco, rotas e tokens reais; captura por `substituirDestinoDoLog`). A conferência de
toda linha:
- só as chaves `level`, `time`, `evento`, `metodo`, `rota`, `status`, `ms`, `atorTipo` e `codigoErro`, numa lista
  fechada;
- `evento` é `requisicao` e `atorTipo` é `integracao`;
- nada de `wsod_`, token, prefixo, texto do token depois do prefixo, SHA-256 (`[0-9a-f]{64}`), decId, id de demanda ou
  título.

1. Awave: 400, 201, GET da própria demanda e mais nove 201, até o 429. Treze linhas, nesta ordem, e a conferência acima
   vale para todas.
2. `/construir`: pendentes, entrega, recebimento 409 e 204, e o 404 do DEC inexistente. Os bytes recebidos são os da
   geração.
3. IN-14: pendentes com a tabela `evento` travada por outra conexão → 503 `{ erro: 'indisponivel', mensagem:
   MENSAGEM_INDISPONIVEL }`. A linha de erro tem só os campos da lista, sem texto do Postgres. Depois que a trava sai,
   200.

**`sentinelas.test.ts`**, dois `it` novos. Cada um cria o próprio token e os próprios dados, e passa sozinho (`-t`).
- **(a) Awave.** O POST leva sentinela no título, na descrição, no contexto (inclusive o token sentinela e a senha), no
  solicitante, nos anexos e numa chave desconhecida. O fluxo passa pelo 400, pelo 201, pelo GET da própria demanda
  (que devolve o título com o sentinela, que é do Awave) e pelo 429 depois de 10 criações. Confere:
  - a ordem exata das linhas da rota;
  - os 10 `demanda_criada` com prefixo e `depois = { status, tipo }`;
  - nenhuma execução de agente para demanda do Awave.
- **(b) `/construir`.** ESP com texto sentinela, sem e-mail nem telefone; DEC aprovado; geração por pessoa, com o
  sentinela no pedido; pendentes; entrega com os bytes iguais aos da geração; recebimento com SHA errado (409) e certo
  (204); o DEC sai da lista. Os dois eventos do `construir` são `pedido_entregue` e `pedido_recebido`, só com
  `{ sha256 }` do servidor.

Nos dois, `conferirSaidasDasIntegracoes` repete as asserções de hoje: nenhum sentinela no pino, no console, no Sentry
falso, no esquema `pgboss` nem em `execucao_agente`. E acrescenta:
- nenhum sentinela em `antes` e `depois` dos eventos de integração (IN-12);
- nem o token, nem o texto dele depois do prefixo, em log, console, Sentry, eventos e `pgboss`, e nenhum `wsod_` em
  log, eventos e `pgboss` (IN-04, C-39);
- o 400, o 429 e o 409 devolvidos sem sentinela, pilha, SQL, nome interno nem hash.

**`integracao.test.ts`**, três testes:
- `evento` aceita o `construir` com prefixo e o recusa sem prefixo;
- os nomes do `evento_ator_integracao_check` são exatamente `INTEGRACOES`;
- os do `demanda_autor_integracao_check` são exatamente `['awave']`, todos dentro de `INTEGRACOES`.

### Teste antes do código

Os dois arquivos da T13, escritos antes do ajudante (`pnpm --dir … test src/app/api/pedidos-construcao/log-das-integracoes.test.ts test/transversal/sentinelas.test.ts`):
```
 FAIL  test/transversal/sentinelas.test.ts [ test/transversal/sentinelas.test.ts ]
Error: Cannot find module '../pedidos-construcao' imported from .../test/transversal/sentinelas.test.ts
 FAIL  src/app/api/pedidos-construcao/log-das-integracoes.test.ts [ src/app/api/pedidos-construcao/log-das-integracoes.test.ts ]
Error: Cannot find module '../../../../test/pedidos-construcao' imported from .../log-das-integracoes.test.ts
 Test Files  2 failed (2)
      Tests  no tests
```

Com o ajudante, 5 de 5, **sem mudança em código de produção**. São testes de guarda (G3.1): passam porque `rota()` só
loga a linha da lista e os eventos de integração só levam enumeração e hash. Os testes 3 do log e os três do
`integracao.test.ts`, acrescentados depois, também passaram de primeira, pela mesma razão: o orçamento e os CHECK já
estavam certos (T04, T01).

### Prova de que os testes de guarda pegam o vazamento

Fiz duas mutações temporárias, uma de cada vez, e desfiz as duas. `git status` mostrou depois só os arquivos da tarefa.

- **Log:** em `receber.ts`, no 409 `shaDiferente`, um `log.warn({ evento: 'MUTACAO_T13', demandaId: decId })`.
  `log-das-integracoes.test.ts` falhou no teste do `/construir`: `um decId no log: expected true to be false`.
- **Evento:** em `servico.ts`, `titulo: campos.titulo` no `depois` do `demanda_criada`. O fluxo (a) de `sentinelas.test.ts`,
  rodado sozinho com `-t "T13 \(a\)"`, falhou na asserção nova do IN-12, `contemSentinela(... antes, depois ...)`:
  `expected true to be false`.

### Mudança nos quatro testes do /construir (G3.2, trecho a trecho)

O que saiu de cada arquivo foi só definição de preparo, que agora vem de `test/pedidos-construcao.ts` com o mesmo
comportamento. Os nomes locais ficaram (`prepararDec`, `novoDec`, `aprovar`, `listar`, `entregar`, `receber`, `sha`,
`ESP_COMPLETA`, `totalDeEventos`, `inserirEvento`, `LinhaEvento`), então nenhum `it` mudou. Também não mudaram os
`usuarioId`, pelo `rotulo`, nem os dados fictícios, nem o prefixo `ficticio`.

| Arquivo | Saiu | Entrou |
|---|---|---|
| `entrega.test.ts` | `CONFIRMADO`, `ESP_COMPLETA`, `RSK_PADRAO`, `geradora`, `novaAutora`, `sha`, `listar`, `entregar`, `novoDec`, `aprovar`, `prepararDec`, `LinhaEvento`, `totalDeEventos`, `inserirEvento` e os imports só deles | os mesmos nomes, ligados ao ajudante (`rotulo: 'entrega'`) |
| `recebimento.test.ts` | idem, mais `receber` | idem (`rotulo: 'recebimento'`); `prepararDec` mantém a regra de hoje (entrega se gerar e se `entregar` não for `false`) |
| `entrega-qa.test.ts` | idem; `inserirEvento` com prefixo só para integração | idem (`rotulo: 'entrega-qa'`); o prefixo segue `null` para pessoa; `relogio` continua o mesmo de `deps` |
| `recebimento-qa.test.ts` | idem | idem (`rotulo: 'recebimento-qa'`); `prepararDec` devolve `{ demandaId, decId, recebido }` como hoje |

A única linha `expect(` que saiu dos arquivos é o `expect(r.status).toBe(200)` da entrega dentro de `prepararDec`, em
`recebimento.test.ts` e em `recebimento-qa.test.ts`. Ela continua valendo dentro de `preparadorDePedidos`
(`test/pedidos-construcao.ts`), no mesmo ponto do preparo. Confere com `git diff -G "expect\(" -- src/app/api/pedidos-construcao`.
Os quatro arquivos não estão no D-17, e nenhum dos 16 do piso perdeu linha. `sentinelas.test.ts`, que está no D-17, só
ganhou linhas. Contagem dos quatro arquivos: 59 testes antes e 59 depois (31 da entrega e 28 do recebimento).

### Resultado

- Arquivos tocados pela T13 (`src/app/api/pedidos-construcao`, `integracao.test.ts`, `sentinelas.test.ts`): 7 arquivos,
  78 de 78, antes do teste 3 do log. `log-das-integracoes.test.ts` com o teste 3: 3 de 3.
- `pnpm test` (suíte inteira): **276 de 276 arquivos e 5800 de 5800 testes**, 0 falharam, em 186 s. Na 06-T12-testes
  eram 275 arquivos e 5792 testes. Entraram 1 arquivo e 8 testes: 3 do log, 2 das sentinelas e 3 de `integracao.test.ts`.
- `pnpm typecheck` e `pnpm lint`: limpos.
- G4: o `git diff a9fd9b8 --stat` das superfícies congeladas, com `src/lib/rota.ts`, saiu vazio. `git diff --stat --
  src/modules test/estatico` também.

### Desvios do plano

1. **`test/pedidos-construcao.ts` e os quatro testes do `/construir`**, fora da lista da T13. Foi o caminho que o Minor 1
   da 06-T12-revisao deu à T13, e a troca está explicada trecho a trecho acima.
2. **`src/db/schema/integracao.test.ts`**, fora da lista: o Minor 2 da 06-T01-revisao foi endereçado "à T13 (testes
   transversais) ou à primeira tarefa que tocar esses arquivos", e nenhuma tarefa tocou. Só acrescenta.
3. **Testes além do texto do plano:**
   - o 503 de pendentes (pendência da 06-T05);
   - os caminhos de erro no log (400, 429, 409, 404, 503);
   - a lista fechada de chaves da linha;
   - o 409 com corpo conferido no fluxo do `/construir`;
   - o `wsod_` ausente;
   - a contagem dos eventos e das execuções do Awave.

   Todos só reforçam o IN-04, o IN-12 e o IN-14.

## Decisões tomadas

- Os fluxos novos ficaram em `it` próprios, depois do teste de hoje, e não dentro dele. Dentro, a DEC do `/construir`
  criaria um quarto aviso `aviso.dec-pronto` e mudaria duas asserções que já existem (`avisos` igual a 3 e o
  `toHaveLength(3)`), o que o G3.2 não deixa. Separados, cada um confere todas as saídas desde o `beforeAll` e passa com
  ou sem o teste de hoje antes. Rodei os dois sozinhos com `-t`.
- O texto do token que nunca pode sair é o de depois de `wsod_` e do prefixo de 8 caracteres (35 caracteres). O prefixo
  pode estar no evento: é o IN-13.
- `chamadasDoConstruir` recebe o token por função, porque cada arquivo só o cria no `beforeAll`. Assim o token nunca fica
  em constante nem em arquivo.
- O Minor 2 da 06-T12-revisao (`naoEncontrado`) e o parecer 1 da 06-T06 (a leitura do 201 fora do orçamento) mudam código
  de produção. A T13 só tem testes. Ficam com a 08, que é a outra dona que as pendências citam.
- **Migration:** nenhuma. Para voltar a T13: apagar os dois arquivos novos e restaurar os seis alterados pelo `git`.

## Pendências

- Nenhuma bloqueia a T13.
- Para a `08-revisao`:
  - o Minor 2 da 06-T12-revisao: uma fábrica do 404 em `src/lib/erros.ts`, usada por `receber.ts` e `entregar.ts`, sem
    tocar `rota.ts`;
  - o parecer 1 da 06-T06: a leitura do 201 do Awave fora do orçamento. A recomendação está na tabela acima.
- Para quem tocar `test/matriz-rotas.test.ts`: segue o parecer 4 da 06-T03-revisao, com a prova já coberta em
  `test/matriz-rotas-integracoes-qa.test.ts`.
- Para quem tocar `test/integracoes.ts`: o `=(` sem espaço da linha 23 (parecer 3 da 06-T06-revisao). A T13 não tocou o
  arquivo.
- Para a T15 (seed): `test/pedidos-construcao.ts` tem `DEMANDA_DO_PEDIDO`, `ESP_DO_PEDIDO`, `RSK_DO_PEDIDO` e
  `DEC_DO_PEDIDO`, se o teste do seed quiser os mesmos dados. O seed em si continua com os dele (`scripts/`).
- As caixas `- [ ]` da T13 no plano não foram marcadas, porque a 06 não edita `docs/` (G1). A marcação fica com o maestro.
- Glob e Grep não estavam disponíveis nesta sessão. Li tudo com Read e achei as entregas com `git log -G`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -25` — HEAD em f07cc33 (06-T12-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — árvore limpa no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G T13 --format=%h%x20%s --name-only -- docs/construcao/DEC-DEM-20261111-0016-v1` — 06-T01-revisao, 06-T03, 06-T05, 06-T06, 06-T08-revisao, 06-T11 e 06-T12, além do 05, do 04, do 02 e do 01
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --diff-filter=A --format= --name-only -- vitest.config.ts vitest.config.mts test/deps.ts test/banco.ts test/sessao.ts src/lib/log.ts src/modules/limites.ts` — os caminhos dos arquivos de apoio
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pedidos-construcao/log-das-integracoes.test.ts test/transversal/sentinelas.test.ts` — antes do ajudante: 2 arquivos falharam, `Cannot find module`, nenhum teste rodou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pedidos-construcao/log-das-integracoes.test.ts test/transversal/sentinelas.test.ts` — com o ajudante: 2 arquivos, 5 de 5
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pedidos-construcao/log-das-integracoes.test.ts` — com a mutação temporária do log em `receber.ts`: 1 de 2 falhou (`um decId no log`)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/transversal/sentinelas.test.ts -t "T13 \(a\)"` — com a mutação temporária do título no evento: falhou na asserção do IN-12
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — as mutações saíram: só os arquivos da tarefa
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/transversal/sentinelas.test.ts -t "T13 \(b\)"` — o fluxo do `/construir` sozinho: 1 de 1
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo, depois da troca do preparo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pedidos-construcao src/db/schema/integracao.test.ts test/transversal/sentinelas.test.ts` — 7 arquivos, 78 de 78
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 6 arquivos rastreados, todos de teste
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -G "expect\(" -- src/app/api/pedidos-construcao` — só o `expect` do 200 de `prepararDec`, levado ao ajudante, nos dois arquivos do recebimento
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 276 de 276 arquivos, 5799 de 5799 testes, antes do teste 3 do log (saída longa lida com Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 --stat -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts 'drizzle/000[0-6]_*.sql' 'drizzle/meta/000[0-6]_snapshot.json' src/lib/rota.ts` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat -- src/modules test/estatico` — vazio: nenhum módulo de produção nem teste estático mudou
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 6 alterados e 2 novos, todos da tarefa
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pedidos-construcao/log-das-integracoes.test.ts` — com o teste 3 (503 de pendentes): 3 de 3
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — rodada final: 276 de 276 arquivos, 5800 de 5800 testes, 0 falharam (em segundo plano; saída lida com Read)

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega; os testes de guarda que passaram sem mudança de código estão nomeados, com a razão e com a prova por mutação, como o G3.1 pede para a T13)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real (tokens só gerados em tempo de teste, fora de mensagem de `expect`; sentinelas e nomes fictícios)
- [x] só mudaram os arquivos da tarefa (mais o ajudante, os quatro testes do `/construir` e `integracao.test.ts`, pelas pendências endereçadas à T13; desvios 1 e 2)
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (a T13 não cria rota, Server Action nem job; os testes novos conferem que o 400, o 409, o 429 e o 503 devolvidos às integrações não levam sentinela, pilha, SQL, hash nem texto do Postgres)
