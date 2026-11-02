---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T02-construcao
agente: engenheiro-backend
leu: [contrato-passagem.md, 06-T02-tech-lead.md, 06-T02-engenheiro-backend.md (entrega anterior), src/lib/sentry.ts, src/lib/sentry.test.ts, test/sentinelas.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Segunda volta da T02, para corrigir o parecer 1 (Important) da `06-T02-tech-lead.md`: em `src/lib/sentry.ts`, uma
linha da mensagem do erro que começasse por espaço e `at ` passava no filtro de `quadrosDaPilha` e ia ao Sentry como
quadro de pilha, o que furava C-21. As interfaces da T02 não mudaram.

### Arquivos alterados (só os dois da T02 que o parecer aponta)

- `src/lib/sentry.ts`: o `quadrosDaPilha` agora tira o cabeçalho pelo conteúdo e não pelo formato da linha. Monta
  `Error.prototype.toString.call(e) + '\n'`. Se o `stack` começa por esse texto, usa só o resto e mantém o filtro
  `^\s+at\s` sobre ele. Se não começa (nome ou mensagem trocados depois do primeiro acesso ao `stack`), devolve `[]` e
  o Sentry recebe só o título. Tudo fica num `try/catch` que devolve `[]` se `toString` lançar.
- `src/lib/sentry.test.ts`: três testes novos. O arquivo também passou a iniciar o Sentry uma vez só (`beforeAll`),
  com um transporte falso único, e a zerar os envios em `beforeEach`, com o auxiliar `enviar`. Chamar `Sentry.init`
  em cada teste disparava `MaxListenersExceededWarning`. As asserções dos dois testes antigos ficaram iguais.

### Testes criados (3)

- `linha da mensagem que começa por "    at " não vira quadro de pilha no Sentry (C-21)`: é o teste do passo 1 do
  parecer. A mensagem é `` `falhou\n    at ${SENTINELAS.texto}\n    at ${SENTINELAS.email}` ``. O teste confere que o
  envelope não tem sentinela e que ainda traz o quadro `sentry.test`, ou seja, a pilha não sumiu.
- `stack que não começa pelo cabeçalho atual do erro não manda quadro nenhum, só o título`: lê o `stack` primeiro e
  troca `message` depois. O teste confere que não sai sentinela nem quadro e que o título `Error` vai.
- `subclasse que troca o name no construtor mantém os quadros e não vaza a mensagem`: escrito depois da correção, para
  registrar o comportamento. Uma subclasse com `this.name` definido no construtor, que é o caso comum das bibliotecas,
  continua mandando os quadros, porque o V8 só monta o `stack` no primeiro acesso.

### Teste antes do código (visto falhando)

Rodei `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` com os dois primeiros testes novos já
escritos e o `sentry.ts` ainda sem mudança:

```
 ❯ src/lib/sentry.test.ts (4 tests | 2 failed) 29ms
   × linha da mensagem que começa por "    at " não vira quadro de pilha no Sentry (C-21) 6ms
   × stack que não começa pelo cabeçalho atual do erro não manda quadro nenhum, só o título 3ms

 FAIL  src/lib/sentry.test.ts > linha da mensagem que começa por "    at " não vira quadro de pilha no Sentry (C-21)
AssertionError: expected true to be false // Object.is equality
 ❯ src/lib/sentry.test.ts:62:34
     62|   expect(contemSentinela(saida)).toBe(false);

 Test Files  1 failed | 9 passed (10)
      Tests  2 failed | 54 passed (56)
```

A falha é a que o parecer descreve: a sentinela da mensagem chega ao envelope.

### Resultado

- `pnpm test`: 10 arquivos, 57 testes, 57 passaram e 0 falharam (os 54 de antes mais os 3 novos)
- `pnpm lint`: limpo
- `pnpm typecheck`: limpo

### Desvios do plano, com a razão

- Nenhum desvio novo. A correção segue o caminho do parecer 1. Os desvios 1 a 8 da primeira volta continuam valendo,
  e o tech-lead já os aceitou.
- Fiz duas coisas além do parecer. Acrescentei o teste da subclasse, que prova que o caminho "sem quadro" não dispara
  no caso comum. Também reorganizei o `sentry.test.ts` para um `Sentry.init` só, o que tirou o aviso de ouvintes. Nada
  disso muda código de produção além do `quadrosDaPilha`.

## Decisões tomadas

- O cabeçalho sai por `startsWith` sobre o texto exato de `Error.prototype.toString`, sem regex sobre a mensagem.
  Razão: o conteúdo da mensagem é livre, e só a comparação literal separa a mensagem dos quadros.
- Quando o cabeçalho não confere, não sai quadro nenhum. Razão: nesse caso não dá para saber onde a mensagem termina,
  e perder a pilha é menos grave que vazar dado (C-21).
- O Sentry passou a ser iniciado uma vez por arquivo de teste. Razão: o `Sentry.init` repetido somava ouvintes de
  `beforeExit` no processo e gerava aviso.

## Pendências

- Nenhuma que segure a passagem.
- Para a revisão e a T11: na rodada que falhou, o `@sentry/node` 11.4.0 avisou no stderr que `beforeSendTransaction`
  é ignorado com `traceLifecycle: 'stream'`, o padrão dele, e que o equivalente é `beforeSendSpan` ou `ignoreSpans`.
  Hoje nada sai, porque o `iniciarSentry` não liga amostragem de tracing (sem `tracesSampleRate`). Se alguém ligar
  tracing depois, vai precisar de `beforeSendSpan`. Não mexi nisso nesta volta porque está fora do parecer.
- Os Minors 1, 2 e 3 da `06-T02-tech-lead.md` (T34, T11 e T13) e o Minor 2 da `06-T01-tech-lead.md` (`@types/node`)
  continuam com as tarefas indicadas.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — árvore limpa no ramo `construcao/DEC-DEM-20261022-0001-v1`, antes de começar
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — FAIL esperado: 2 dos testes novos falharam e 54 passaram
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 56 de 56 passaram, depois da correção
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 57 de 57 passaram, com o teste da subclasse (aviso `MaxListenersExceededWarning`)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 57 de 57 passaram, sem aviso, depois de passar para um `Sentry.init` só
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — só `src/lib/sentry.ts` e `src/lib/sentry.test.ts` alterados

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real (só as sentinelas fictícias de G3.2; o DSN do teste é `sentry.exemplo.test`)
- [x] só mudaram os arquivos da tarefa (`src/lib/sentry.ts` e `src/lib/sentry.test.ts`, os dois da lista da T02)
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (a T02 não cria rota, Server Action nem job)
