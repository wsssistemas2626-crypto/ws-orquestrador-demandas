---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T02-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), 2026-10-25-ws-orquestrador-demandas-plano.md (cabeçalho e G1 a G6 e T02), 06-T02-tech-lead.md (revisão anterior), 06-T02-engenheiro-backend.md, src/lib/sentry.ts, commit b9737dea0064399d493c448bde9698cea9bd821a]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Segunda revisão da T02 (Log por lista de permissão e Sentry sem dado pessoal, risco alto, C-21 base, RNF-10 base, D9).
Ela cobre a correção do parecer 1 da primeira revisão (`src/lib/sentry.ts:25`), que está no commit `b9737de`. O código
original da T02 é o do `6372a4a`, já revisado. O commit muda só `src/lib/sentry.ts` e `src/lib/sentry.test.ts`, os dois
da lista da T02, além da entrega do engenheiro e do `passagens.jsonl`. As interfaces do plano continuam as mesmas.
Rodei de novo nesta revisão: `pnpm test` (57 de 57), `pnpm lint` e `pnpm typecheck`, todos verdes.

O parecer 1 está resolvido e não há problema Critical nem Important. A passagem segue para a `06-T02-testes`.

### Conferência do parecer 1

- **`src/lib/sentry.ts:26-38` (`quadrosDaPilha`):** segue o caminho do parecer. O cabeçalho é
  `Error.prototype.toString.call(e) + '\n'` e sai por comparação literal (`startsWith` e depois `slice`), e o filtro
  `^\s+at\s` só se aplica ao que vem depois dele. Se o `stack` não começa pelo cabeçalho, a função devolve `[]`. O
  `try/catch` devolve `[]` se o `toString` ou um getter de `name` ou `message` lançar. Três casos de borda dão `[]` e
  assim não vazam nada: `Error.stackTraceLimit = 0` (o `stack` não tem o `\n` depois do cabeçalho), `name` vazio (o
  V8 e o `toString` dão os dois só a mensagem) e mensagem trocada depois do primeiro acesso ao `stack`.
- **`src/lib/sentry.ts:44`:** o `stack` enviado continua sendo `Error: <classe> [code]` mais os quadros. O título sai de
  `reduzirErro` e não leva texto livre.
- **Teste do passo 1 (`src/lib/sentry.test.ts:60`):** a mensagem é a do parecer. O teste confere que nenhuma sentinela
  chega ao envelope e que o quadro `sentry.test` está lá, o que prova que a pilha não sumiu. A entrega mostra esse teste
  falhando no código antigo (`expected true to be false`, linha 62). O teste do cabeçalho divergente também falhou no
  código antigo, porque a linha `    at SENTINELA-TEXTO-7f3a` passava no filtro.
- **Teste da subclasse (`src/lib/sentry.test.ts:67`):** foi escrito depois da correção, mas falharia no código antigo,
  porque a mensagem tem uma linha `    at ${SENTINELAS.nome}`. Ele prova que o caminho "sem quadro" não dispara no caso
  comum, em que a biblioteca define `this.name` no construtor. Aceito.
- **Reorganização do `sentry.test.ts`:** o arquivo passou a ter um `Sentry.init` só, no `beforeAll`, e a zerar os envios
  no `beforeEach`. Os testes não dependem de ordem, porque cada um zera os envios e espera o `flush`. As asserções dos
  dois testes antigos não mudaram. Aceito: a mudança tirou o `MaxListenersExceededWarning`.

### Checklist da seção 12 do padrão técnico

- [x] A tarefa faz o que o plano pede, nem mais nem menos; arquivos fora da tarefa não mudaram. Só mudaram os dois
      arquivos que o parecer aponta, e as interfaces da T02 ficaram como estavam.
- [x] Há teste para cada comportamento novo, e ele falharia sem o código. Os três testes novos falham no código do
      `6372a4a`, e a falha do passo 1 está na entrega.
- [x] Nenhum segredo, valor de `.env` ou dado pessoal real em código, teste, log ou fixture. Os testes usam só as
      sentinelas de G3.2, e o DSN continua `sentry.exemplo.test`.
- [x] Entrada externa validada com Zod; erro sem vazar detalhe. Não se aplica à rota, porque a tarefa não cria rota,
      Server Action nem job. A mensagem do erro já não chega ao Sentry nem pela pilha.
- [x] Banco: não se aplica (sem migration nem tabela).
- [x] Nada duplica função que já existe no repositório.
- [x] Textos de interface e axe: não se aplica (sem tela).
- [x] Minor vai para Pendências; nenhum Critical ou Important sobrou.
- [x] PR (`/code-review`, `/security-review`): não se aplica nesta etapa; fica com a `08-revisao`.

## Decisões tomadas

- Status `pronto`: a correção fecha o parecer 1 do jeito que ele pedia, e o teste que reproduzia o vazamento está verde.
- Devolver `[]` quando o cabeçalho não confere está aceito. Perder a pilha nesse caso raro é menos grave que vazar a
  mensagem (C-21).
- O teste da subclasse foi escrito depois da correção, e isso está aceito: ele falha no código antigo, então cumpre o
  item "falharia sem o código".
- O aviso do `beforeSendTransaction` vai como Minor, não como bloqueio. Hoje o `iniciarSentry` não liga tracing
  (`tracesSampleRate` não aparece), e então nenhum span sai.

## Pendências

- Nenhuma que segure a passagem.
- Minor 4, para a T11 (configuração): o engenheiro conta que o `@sentry/node` 11.4.0 avisa que `beforeSendTransaction`
  (`src/lib/sentry.ts:17`) é ignorado com `traceLifecycle: 'stream'`. Assim essa opção não protege nada. Quando a T11
  montar a configuração do Sentry, troque essa opção por `beforeSendSpan: () => null` ou `ignoreSpans`, depois de
  conferir no `tsc` que a opção existe nessa versão, ou registre que o tracing fica desligado. Não ligue
  `tracesSampleRate` sem isso.
- Minor 5, para a T34 (teste transversal de sentinelas): o `quadrosDaPilha` confia que, depois do cabeçalho, o `stack`
  só tem quadros. Uma biblioteca que escreva o `stack` à mão com a pilha da `cause` emendada (por exemplo
  `Caused by: <mensagem>` mais quadros) e que tenha na mensagem interna uma linha que comece por `    at ` faria essa
  linha passar. Na T34, capture pelo `capturarErro` os erros reais do Drizzle e do `pg` com sentinela nos parâmetros
  (Testcontainers) e confira o envelope. Se algum emendar pilha, guarde só as linhas que vêm antes da primeira que não
  é quadro.
- Seguem em aberto os Minors 1, 2 e 3 da primeira revisão desta tarefa (T34, T11 e T13) e o Minor 2 da
  `06-T01-tech-lead.md` (`@types/node` para `^24`), com as tarefas já indicadas.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show b9737dea0064399d493c448bde9698cea9bd821a` — diff da correção: `src/lib/sentry.ts`, `src/lib/sentry.test.ts`, a entrega do engenheiro e o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat b9737dea0064399d493c448bde9698cea9bd821a` — 4 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — árvore limpa no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 10 arquivos, 57 de 57 passaram
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
