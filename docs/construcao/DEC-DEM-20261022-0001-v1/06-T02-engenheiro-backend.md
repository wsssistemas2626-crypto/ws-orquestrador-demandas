---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T02-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (cabeçalho, G1 a G6, T01 e T02), 06-T01-engenheiro-backend.md, 06-T01-tech-lead.md, package.json, vitest.config.ts, eslint.config.mjs, tsconfig.json, test/estatico/projeto.test.ts, test/estatico/eslint.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T02 (Log por lista de permissão e Sentry sem dado pessoal), conforme o plano. Cobre C-21 (base), RNF-10 (base) e D9.
A T02 não consome interface de outra tarefa; não precisou de banco nem de dependência nova.

Interfaces produzidas, com as assinaturas do plano:

- `src/lib/reduzir-erro.ts`: `ErroReduzido`, `reduzirErro(e)`
- `src/lib/log.ts`: `CAMPOS_PERMITIDOS` (os 16 do plano), `CamposLog`, `Logger`, `criarLogger(destino?)`, `log`,
  `substituirDestinoDoLog(destino | null)`
- `src/lib/sentry.ts`: `iniciarSentry({ dsn?, transporte? })` (DSN ausente = desligado), `capturarErro(e, contexto?)`,
  `limparEvento(evento)`

### Arquivos criados (todos da lista da T02; nenhum outro arquivo mudou)

- `src/lib/reduzir-erro.ts`, `src/lib/log.ts`, `src/lib/sentry.ts`
- `src/lib/reduzir-erro.test.ts`, `src/lib/log.test.ts`, `src/lib/sentry.test.ts`
- `test/sentinelas.ts` (`SENTINELAS` e `contemSentinela`, só valores fictícios do formato de G3.2)

### Testes criados (13)

- `src/lib/log.test.ts` (6): descarta campo fora da lista; mantém só os campos da lista (do pino, só `level` e
  `time`); `erro` vira `{ classe, code }`; `erro` em texto solto vira `{ classe: 'desconhecido' }`; `redact` como
  segunda barreira em campo permitido com objeto; o `log` padrão escreve no destino trocado por
  `substituirDestinoDoLog`, com o mesmo filtro
- `src/lib/reduzir-erro.test.ts` (5): tira mensagem e `detail` do Postgres; desembrulha a `cause` do erro de consulta
  do Drizzle; não-Error vira `desconhecido` (inclusive objeto com `message` e `code`); `code` que não é código curto não
  passa; `name` com texto livre não passa
- `src/lib/sentry.test.ts` (2): `limparEvento` tira `request.data`, `cookies`, `headers`, `query_string`, a query da
  `url`, `extra`, `user`, `contexts.response` e `breadcrumbs`; o envelope que o transporte falso recebe não tem
  sentinela (erro com mensagem de duas linhas, `detail` e `cause` com sentinela) e traz `Error 23505`, o que prova que
  o envio aconteceu

### Teste antes do código (visto falhando)

`pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test`, com os quatro arquivos de teste escritos e sem
`log.ts`, `reduzir-erro.ts` nem `sentry.ts`:

```
 FAIL  src/lib/log.test.ts [ src/lib/log.test.ts ]
Error: Cannot find module './log' imported from .../src/lib/log.test.ts
 FAIL  src/lib/reduzir-erro.test.ts [ src/lib/reduzir-erro.test.ts ]
Error: Cannot find module './reduzir-erro' imported from .../src/lib/reduzir-erro.test.ts
 FAIL  src/lib/sentry.test.ts [ src/lib/sentry.test.ts ]
Error: Cannot find module './sentry' imported from .../src/lib/sentry.test.ts
 Test Files  3 failed | 7 passed (10)
      Tests  41 passed (41)
```

É a falha que o passo 2 do plano espera.

### Resultado

- `pnpm test`: 10 arquivos, 54 de 54 testes passaram, 0 falharam (41 de antes mais os 13 da T02)
- `pnpm lint`: limpo
- `pnpm typecheck`: limpo (na primeira rodada falhou por `sendDefaultPii`, ver Desvio 1; corrigido e rodado de novo)

### Desvios do plano, com a razão

1. **Sem `sendDefaultPii: false` no `Sentry.init`.** O `tsc` recusou: a opção não existe no tipo `NodeOptions` do
   `@sentry/node` 11.4.0 (`TS2353`). Ficou o resto do plano: `defaultIntegrations: false` (nada coletado sozinho),
   `beforeSend: limparEvento`, `beforeBreadcrumb: () => null`. O teste do envelope prova o resultado pelo transporte
   falso. Acrescentei `beforeSendTransaction: () => null`, para nenhuma transação de desempenho sair.
2. **Pilha no Sentry: só as linhas `    at ...`**, em vez de "as linhas depois da primeira". Mensagem com quebra de linha
   ocupa várias linhas no topo do `stack`; cortar só a primeira deixaria o resto da mensagem sair. O teste usa uma
   mensagem de duas linhas com sentinela.
3. **`reduzirErro` mais estrito:** `code` só passa se for texto curto de código (`^[A-Za-z0-9_]{1,40}$`, cobre
   `23505`, `ECONNREFUSED`, `ERR_...`), e a classe só se `name` for identificador (senão vira `Error`). Razão: `code` e
   `name` são campos que qualquer biblioteca pode preencher com texto livre.
4. **`erro` no log:** além do `Error` (plano), valor primitivo também passa por `reduzirErro` e vira
   `{ classe: 'desconhecido' }`; antes, `erro: 'texto com e-mail'` ia direto à saída. Objeto simples continua passando,
   sob o `redact`, como o plano pede.
5. **`REDACT` com quatro caminhos a mais:** `*.password`, `*.message`, `*.detail` e `*.stack` (objeto de erro que não
   é `Error`), além dos do plano. Só aperta a segunda barreira.
6. **`limparEvento` também apaga `request.env` e `breadcrumbs` e tira a query e o fragmento da `url`.** A query pode
   trazer filtro com dado pessoal; o resto da URL fica.
7. **`capturarErro` com contexto:** o `evento` vai como tag do Sentry (nome de evento, sem dado pessoal). O plano não
   dizia o que fazer com o contexto.
8. **`filtrar` usa `hasOwnProperty`**, para campo herdado de protótipo não entrar.

## Decisões tomadas

- Implementação no molde do plano, com os desvios acima: todos apertam o filtro e nenhum muda as interfaces produzidas.
- Não rodei `pnpm add`: a T02 não precisa de pacote novo. Por isso o parecer Minor 2 da `06-T01-tech-lead.md`
  (`@types/node` para `^24`) segue para a próxima tarefa do backend que rodar `pnpm add`.
- Não li os tipos do `@sentry/node` em `node_modules` (não rastreado pelo git, fora da lista Pode); o desvio 1 saiu do
  erro do `tsc`.
- Não subi o banco de desenvolvimento: a T02 não usa banco.

## Pendências

- Nenhuma que segure a passagem.
- Para a revisão (tech-lead): conferir se os desvios 2 a 8 ficam; todos são mais restritivos que o plano.
- O teste transversal de sentinelas (log, Sentry, esquema do pg-boss e execuções) é da T34; o teste estático de
  `console.*` e de quem lê cada variável é da T13. Esta tarefa entrega só a base que eles usam.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — árvore limpa no ramo `construcao/DEC-DEM-20261022-0001-v1`, antes de começar
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — FAIL esperado: 3 arquivos sem módulo, 41 de 41 dos outros passaram
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 54 de 54 passaram, 0 falharam
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — falhou: `TS2353` em `sendDefaultPii` (Desvio 1)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo, depois da correção
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 54 de 54 passaram, 0 falharam (rodada final)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo (rodada final)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo (rodada final)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — só os 7 arquivos novos da T02

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real (só as sentinelas fictícias de G3.2; o DSN do teste é `sentry.exemplo.test`)
- [x] só mudaram os arquivos da tarefa (os 7 da lista da T02)
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (a T02 não cria rota, Server Action nem job; entrega a redução de erro que o mapeador da T03 vai usar)
