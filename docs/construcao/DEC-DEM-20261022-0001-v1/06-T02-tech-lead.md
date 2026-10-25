---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T02-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), 2026-10-25-ws-orquestrador-demandas-plano.md (cabeçalho e G1 a G6 e T02), 06-T02-engenheiro-backend.md, commit 6372a4ac5e6a008a0837fc91df8fb475243ac516]
status: devolvido
proximo: engenheiro-backend
devolvido_para: 06-T02-construcao
---
## Entrega

Revisão da T02 (Log por lista de permissão e Sentry sem dado pessoal, risco alto, C-21 base, RNF-10 base, D9) sobre o
commit `6372a4a`. Arquivos do commit: os 7 da lista da T02 e a entrega do engenheiro; nenhum outro arquivo de código
mudou. `pnpm test` (54 de 54), `pnpm lint` e `pnpm typecheck` conferidos de novo nesta revisão: verdes.

Um problema Important impede a passagem (parecer 1). Os demais são Minor e vão para Pendências.

### Pareceres

**1. Important — `src/lib/sentry.ts:25` (`quadrosDaPilha`)**

- **Problema:** o filtro guarda toda linha do `stack` que case com `^\s+at\s`. A mensagem do erro também fica no
  `stack`, logo depois de `Nome: `. Se a mensagem tiver uma linha que comece por espaço e `at ` (ex.:
  `` `falhou\n    at ${SENTINELAS.texto}` ``), essa linha passa no filtro, entra em `enviado.stack` (linha 32) e vira
  quadro de pilha no evento que vai ao Sentry.
- **Razão:** é o controle central da tarefa (C-21: nada da mensagem original sai). O próprio plano registra que o
  erro de consulta do Drizzle leva os parâmetros na mensagem. Assim, texto livre da demanda, escrito por pessoa ou por
  agente de IA, chega à mensagem, e uma linha recuada que comece com "at " sai inteira. O desvio 2 da entrega fechou o
  caso da mensagem com várias linhas, mas filtrar pelo formato da linha não separa a mensagem dos quadros. O teste
  atual não pega o problema porque a segunda linha da mensagem dele não começa com `    at `.
- **Caminho:**
  1. Escreva primeiro o teste que falha, em `src/lib/sentry.test.ts`: um erro com mensagem
     `` `falhou\n    at ${SENTINELAS.texto}\n    at ${SENTINELAS.email}` ``, capturado por `capturarErro` com o
     transporte falso; conferir que `contemSentinela(enviados.join(''))` é `false` e que o envelope ainda traz quadro
     de pilha do arquivo do teste (ex.: `sentry.test`), para provar que a pilha não sumiu.
  2. Em `quadrosDaPilha`, tire o cabeçalho pelo conteúdo conhecido, sem tentar adivinhar pelo formato. O V8 começa o
     `stack` com o mesmo texto de `Error.prototype.toString.call(e)`. Se o `stack` começar com esse cabeçalho seguido
     de `\n`, use só o que vem depois (e mantenha o filtro `^\s+at\s` sobre esse resto). Se não começar, por exemplo
     quando o nome ou a mensagem mudaram depois do primeiro acesso ao `stack`, não envie quadro nenhum, só o título.
     Envolva em `try/catch` e devolva `[]` se `toString` lançar.
  3. `pnpm test`, `pnpm lint` e `pnpm typecheck` verdes, e a falha do passo 1 mostrada na entrega.

### Checklist da seção 12 do padrão técnico

- [x] A tarefa faz o que o plano pede, nem mais nem menos; arquivos fora da tarefa não mudaram. Os desvios 1 a 8 só
      apertam o filtro e não mudam interface: aceitos (ver Decisões). Exceção: a implementação do desvio 2 está
      incompleta (parecer 1).
- [ ] Há teste para cada comportamento novo, e ele falharia sem o código. Os 13 testes falhariam sem o código, mas o
      comportamento "a mensagem nunca vai ao Sentry" não tem teste para a mensagem com linha que começa por `at`
      (parecer 1).
- [x] Nenhum segredo, valor de `.env` ou dado pessoal real em código, teste, log ou fixture. As sentinelas são
      fictícias, no formato de G3.2, e o DSN do teste é `sentry.exemplo.test`.
- [x] Entrada externa validada com Zod; erro sem vazar detalhe. Não se aplica: a tarefa não cria rota, Server Action nem
      job. A redução de erro está correta (`reduzirErro`).
- [x] Banco: não se aplica (sem migration nem tabela).
- [x] Nada duplica função que já existe no repositório (`reduzirErro` é usado por `log.ts` e por `sentry.ts`).
- [x] Textos de interface e axe: não se aplica (sem tela).
- [x] Minor vai para Pendências; só o Important do parecer 1 bloqueia.
- [x] PR (`/code-review`, `/security-review`): não se aplica nesta etapa; fica com a `08-revisao`.

## Decisões tomadas

- Status `devolvido`: o parecer 1 é falha no controle principal de uma tarefa de risco alto e tem correção pequena e
  testável. Não dá para deixar como dívida.
- Desvio 1 aceito (sem `sendDefaultPii`). O `tsc` recusou a opção. O que segura o dado é
  `defaultIntegrations: false` junto com `limparEvento`, e o teste do envelope prova o resultado.
- Desvios 3 a 8 aceitos. `code` e `name` só passam no formato de identificador; texto solto em `erro` vira
  `desconhecido`; o `REDACT` ganhou caminhos; a query sai da `url`; o `evento` vai como tag; o filtro usa
  `hasOwnProperty`. Todos apertam o filtro sem mudar as interfaces do plano.
- `Logger` foi declarado à mão em vez de `ReturnType<typeof criarLogger>`. O formato é o mesmo do plano: aceito.

## Pendências

- Devolvido: `src/lib/sentry.ts:25` deixa passar para o Sentry uma linha da mensagem do erro que comece por espaço e "at ", o que fura C-21 (parecer 1).
- Minor 1, para a T34 (teste transversal de sentinelas): em `src/lib/log.ts:54`, valor de `erro` que seja objeto
  simples ou array passa inteiro, e só o `redact` o filtra. O `redact` funciona como lista de negação e só desce um
  nível, então `erro: { motivo: <dado> }`, `erro: { a: { email } }` ou `erro: [<dado>]` saem como vieram. O plano manda
  aceitar objeto sob o `redact`, e por isso o problema não bloqueia agora. A T34 deve testar esses três formatos e,
  se algum vazar, reduzir todo valor de `erro` que não seja `Error` com `reduzirErro`.
- Minor 2, para a T11 (configuração): em `src/lib/log.ts:70`, `LOG_LEVEL` com valor inválido faz o `pino` lançar
  exceção na primeira chamada de `log`, que pode cair dentro do mapeador de erro. Valide `LOG_LEVEL` na carga da
  configuração.
- Minor 3, para a T13 (testes estáticos): o `limparEvento` (`src/lib/sentry.ts:37`) não mexe em `event.message` nem em
  `exception.values[].value`. Hoje isso está certo porque só o `capturarErro` envia evento, mas uma chamada direta a
  `Sentry.captureException` em outro arquivo mandaria a mensagem original. Proíba a importação de `@sentry/node` fora
  de `src/lib/sentry.ts`.
- Segue em aberto o Minor 2 da `06-T01-tech-lead.md` (`@types/node` para `^24`), para a próxima tarefa do backend que
  rodar `pnpm add`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 6372a4ac5e6a008a0837fc91df8fb475243ac516` — 9 arquivos: os 7 da T02, a entrega do engenheiro e o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 6372a4ac5e6a008a0837fc91df8fb475243ac516 -- src test` — diff do código e dos testes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — árvore limpa no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 10 arquivos, 54 de 54 passaram
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
