---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T11-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T10 a T13), 04-seguranca-aplicacao.md (seções 1 a 3), 03-ux-ui-design.md (seções 1 e 2), 06-T10-tech-lead.md, 06-T10-qa-automacao.md (Pendências), src/lib/deps.ts, src/lib/env.ts, src/lib/erros.ts, src/lib/corpo.ts, src/lib/log.ts, src/lib/sentry.ts, src/lib/sentry.test.ts (início), src/lib/fila.ts, src/lib/relogio.ts, src/db/index.ts, src/db/transacao.ts, src/db/privilegios.ts, drizzle/0001_rls_privilegios_acesso.sql, drizzle/meta/_journal.json, scripts/migrate.ts, src/modules/acesso/auth.ts, src/modules/acesso/ator.ts, src/modules/acesso/exigir-pessoa.ts, src/modules/acesso/exigir-pessoa.test.ts, src/modules/acesso/resolver-ator.ts, src/modules/acesso/resolver-ator.test.ts (início), src/modules/acesso/matriz.ts, src/modules/acesso/tokens-servico.ts, src/app/api/auth/[...all]/route.ts, src/app/api/auth/[...all]/route.test.ts, test/deps.ts, test/sessao.ts, test/banco.ts, test/auth.ts, test/sentinelas.ts, test/setup-global.ts, next.config.ts, package.json, vitest.config.ts, tsconfig.json, eslint.config.mjs]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T11: adaptador de rota (`rota()`) e de Server Action (`acaoDoPainel()`), `obterDeps`, proxy com CSP e nonce, `register()`
do boot, rota de saúde e os cabeçalhos do `next.config.ts`. Cobre C-15, C-17 (413 e parâmetros pela regex), C-19, C-20
(no adaptador), C-21 (linha de requisição), C-27 (fábrica de `Deps`), C-31 e C-33 (boot), RNF-17 e ADR-12.

### Arquivos

Criados (os do plano):
- `src/lib/rota.ts`
  - `rota()`, na ordem do plano: (1) parâmetros pela regex, fora dela 404 sem consulta; (2) CSRF, com 403 e 415;
    (3) `resolverAtor`; (4) `autorizar`; (5) query e corpo pelo Zod, com `lerCorpoJson` de 512 KB; (6) a função.
  - Toda resposta, de sucesso ou de erro, sai com `no-store`, `nosniff` e `no-referrer`, e sem cabeçalho
    `access-control-*`, mesmo quando a função tenta pôr um.
  - Erro só por `mapearErro`; o 5xx vai a `capturarErro`.
  - Uma linha `requisicao` por chamada, com `metodo`, `rota` (o padrão), `status`, `ms`, `atorTipo` e `codigoErro`.
  - Também exporta `paramId` (demanda e versão por prefixo), `RE_ID_DEMANDA`, `reIdVersao` e os tipos `HandlerRota`,
    `RespostaRota`, `OpRota`, `ContextoRota` e `MetaRota`.
- `src/lib/acao-painel.ts`: `acaoDoPainel()` chama `exigirPessoa` com os `headers()` do Next, depois `autorizar` e
  depois `safeParse`, e devolve `ResultadoAcao<T>`. `redirect()` e `notFound()` passam direto (`unstable_rethrow`). Uma
  linha `acao_painel` por chamada.
- `src/lib/deps.ts` (modificado): `obterDeps()` monta uma vez, com chamadas simultâneas esperando a mesma montagem, e
  tenta de novo se a montagem falhar. Usa só `lerConfigApp()`: `criarPool(DATABASE_URL)`, `criarDb`, `relogioDoSistema`,
  `criarFila(DATABASE_URL)` e `criarAuth`. Não lê `DATABASE_URL_MIGRATOR`, `ANTHROPIC_API_KEY` nem `RESEND_API_KEY`
  (C-27). Também traz `definirDepsParaTeste()`.
- `src/proxy.ts`
  - Nonce de 16 bytes por requisição e a CSP de C-19, igual à do controle: `default-src 'self'; script-src 'self'
    'nonce-…' 'strict-dynamic'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`. No
    desenvolvimento entra também `'unsafe-eval'`.
  - `Cache-Control: no-store` em toda página fora de `/_next/static`, `/_next/image` e `favicon.ico`.
  - O nonce vai em `x-nonce` e a CSP vai no cabeçalho da requisição. O `x-nonce` que o cliente mandar é trocado.
  - Não decide acesso.
- `src/instrumentation.ts`: `register()` só roda no runtime Node. Chama `lerConfigApp()` e depois
  `iniciarSentry({ dsn: SENTRY_DSN })`; DSN vazio deixa o Sentry desligado.
- `src/app/api/saude/route.ts`
  - Pública. Lê `max(created_at)` de `drizzle.__drizzle_migrations` e compara com o `when` da última entrada de
    `drizzle/meta/_journal.json`, importado no build.
  - Tempo limite de 150 ms. Responde 200 `{ "status": "ok" }` ou 503 `{ "status": "indisponivel" }`, com `no-store`.
  - A falha vai ao log como `saude_indisponivel`, com o erro reduzido.
- `test/requisicao.ts`: `requisicao()` e `chamarRota()` montam e chamam requisições de teste, com origem do painel, IP
  fictício, cookie ou Bearer. A T13 usa.

Modificados (os do plano):
- `next.config.ts`
  - `experimental.serverActions`: `allowedOrigins` só com o host de `BETTER_AUTH_URL` (vazio sem a variável ou com valor
    inválido) e `bodySizeLimit: '1mb'`.
  - `headers()` em `/:path*`: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY` e, só em produção,
    `Strict-Transport-Security`.
- `src/app/api/auth/[...all]/route.ts`: passa a usar `(await obterDeps()).auth`.

Fora da lista do plano (ver Desvios):
- Criado `src/modules/acesso/mensagens.ts`.
- Modificados `src/modules/acesso/exigir-pessoa.ts`, `src/modules/acesso/matriz.ts`, `src/modules/acesso/resolver-ator.ts`
  e `src/lib/erros.ts`.

### Testes criados

| Arquivo | Testes | O que prova |
|---|---|---|
| `src/lib/rota.test.ts` | 36 | C-15: Origin estranha, ausente ou `null` dá 403; sem JSON ou com outro `Content-Type` dá 415; `charset` é aceito; só Bearer passa sem Origin; GET com cookie passa sem Origin; a origem é conferida antes da autenticação. C-17: 600 KB dá 413; id fora da regex dá 404 sem chamar a função nem autenticar; ESP no lugar de DEC dá 404; corpo fora do schema dá 400 com campo pt-BR e sem o valor; JSON quebrado dá 400; chave desconhecida é descartada (C-11); query validada e convertida. Acesso: sem credencial 401, sem 2FA 403, agente fora da matriz 403, administradora em ação de cto 403, cookie com Bearer 400. C-19: cabeçalhos no sucesso, no erro e no `texto` com cabeçalhos da função; 204 sem corpo. C-20: `ErroDominio` dá 409 sem Sentry; erro do Postgres dá 500 genérico, sem a mensagem, com Sentry. C-21: uma linha só com a lista, `codigoErro` e `anonimo` no erro, agente sem o token, rota-padrão sem id nem query, sentinelas fora do log. `meta` com exemplo derivado e explícito |
| `src/lib/acao-painel.test.ts` | 11 | ok com 2FA; sem sessão; C-04 sem 2FA sem rodar a função; C-12 administradora em `alterar_teto`; autorização antes da validação; Zod pt-BR sem o valor; entrada que não é objeto; C-11 chave descartada; `ErroDominio` com extras; C-20 erro do banco genérico com Sentry; C-21 linha só com a lista |
| `src/lib/deps.test.ts` | 4 | importar não lê variável; monta uma vez, inclusive com chamadas simultâneas, como `orquestrador_app` e com `relogioDoSistema`; C-33 com o nome sem o valor, e nova tentativa depois da falha; `definirDepsParaTeste` |
| `src/app/api/saude/route.test.ts` | 6 | 200 em menos de 200 ms com `no-store`; não lê a requisição; 503 em banco vazio; 503 com a última migration faltando; 503 com o banco preso, sem passar de 400 ms; log sem a mensagem do Postgres |
| `src/proxy.test.ts` | 8 | CSP exata com nonce; nonce novo a cada chamada; nonce e CSP repassados à página; `x-nonce` do cliente trocado; `no-store`; não redireciona; `unsafe-eval` só no desenvolvimento; o matcher só deixa de fora os estáticos |
| `src/instrumentation.test.ts` | 5 | sobe com config válida e o Sentry com DSN vazio desligado; passa o `SENTRY_DSN`; C-33 com segredo curto, sem o valor; C-31 com 400 dias; fora do runtime Node não faz nada |
| `test/next-config.test.ts` | 6 | `allowedOrigins` com o host certo, vazio sem a variável, vazio com URL inválida; `bodySizeLimit` de 1 MB; cabeçalhos fixos sem HSTS fora de produção e com HSTS em produção; `poweredByHeader` desligado e nenhum CORS |
| `src/app/api/auth/[...all]/route.test.ts` (+1) | 1 | a rota do Better Auth usa a instância de `obterDeps` |

São 77 testes novos. Os testes já existentes de `exigir-pessoa`, `resolver-ator`, `matriz` e da rota de auth seguem
sem mudança e verdes.

### TDD: vermelho antes do código

`pnpm -C … test` com os 8 arquivos, antes de qualquer código da T11:

```
 FAIL  src/proxy.test.ts [ src/proxy.test.ts ]
Error: Cannot find module './proxy' imported from .../src/proxy.test.ts
 FAIL  src/lib/acao-painel.test.ts [ src/lib/acao-painel.test.ts ]
Error: Cannot find module '/src/lib/acao-painel' imported from .../src/lib/acao-painel.test.ts
 FAIL  src/lib/rota.test.ts [ src/lib/rota.test.ts ]
Error: Cannot find module '/src/lib/rota' imported from .../src/lib/rota.test.ts
 FAIL  src/app/api/saude/route.test.ts [ src/app/api/saude/route.test.ts ]
Error: Cannot find module './route' imported from .../src/app/api/saude/route.test.ts
 FAIL  test/next-config.test.ts > next.config > Server Actions: allowedOrigins só com o host de BETTER_AUTH_URL e bodySizeLimit de 1 MB
AssertionError: expected undefined to deeply equal { …(2) }
 FAIL  src/lib/deps.test.ts > obterDeps > monta uma vez só, ...
TypeError: obterDeps is not a function
 FAIL  src/app/api/auth/[...all]/route.test.ts > ... > T11: usa o Better Auth de obterDeps, ...
TypeError: definirDepsParaTeste is not a function
 Test Files  8 failed (8)
      Tests  16 failed | 2 passed (18)
```

Os 2 que passaram são os dois testes antigos da rota de auth.

### Resultado

- `pnpm test`: 55 arquivos, 958 de 958, 0 falhas. Antes eram 881, na `06-T10-testes`; a T11 soma 77.
- `pnpm lint`: limpo. A primeira rodada teve 1 aviso, de parâmetro sem uso em `saude/route.ts`, corrigido.
- `pnpm typecheck`: limpo.
- `pnpm build`, sem nenhuma variável de ambiente: passa. Lista `/api/auth/[...all]`, `/api/saude` e
  `ƒ Proxy (Middleware)`. Importar os módulos e o `next.config.ts` não exige configuração.

As linhas `better_auth` e `login_falhou` na saída da suíte são as mesmas da linha de base, dos logins errados de
propósito da T08 e da T09. Os testes da T11 capturam a própria saída.

### Desvios do plano, com a razão

1. **Mensagens de acesso num lugar só.** Novo `src/modules/acesso/mensagens.ts`, importado por `exigir-pessoa.ts`,
   `matriz.ts`, `resolver-ator.ts` e `rota.ts`. É a pendência do parecer 1 do `06-T10-tech-lead.md`, endereçada à T11.
   Os textos não mudaram, e os testes que conferem o texto exato seguem verdes.
2. **`exigir-pessoa.ts` passa a usar `obterDeps`.** O `depsDaPagina` local, que montava um segundo pool e um segundo
   Better Auth, saiu. Com ele, haveria duas instâncias, e o limite em memória do Better Auth seria um por instância. O
   comentário do arquivo já anunciava a troca na T11. Os testes passam `deps` explícito e não mudaram.
3. **`MENSAGEM_NAO_ENCONTRADO` em `src/lib/erros.ts`.** É o texto do 404 da 03, seção 2.8, ao lado de
   `MENSAGEM_ERRO_INTERNO`. Assim os serviços da T15 em diante usam o mesmo texto sem importar o adaptador.
4. **Testes além dos 3 arquivos do plano:** `deps.test.ts`, `proxy.test.ts`, `instrumentation.test.ts`,
   `test/next-config.test.ts` e +1 caso na rota de auth. Cada peça nova da tarefa tem comportamento próprio, e o padrão
   pede teste para cada comportamento novo.
5. **`GET` da saúde sem parâmetro.** O handler não lê a requisição. Com o parâmetro sem uso, o lint avisava. O teste
   chama `GET()` e confere `GET.length === 0`.
6. **CSRF, quem conta como "com cookie".** Conta qualquer `Cookie`, e não só o de sessão, porque o navegador manda
   cookie sozinho. Requisição só com Bearer e com corpo declarado também precisa de JSON (415). É mais restritivo que
   C-15 e não muda o caso de agente, que manda JSON.
7. **Texto do 403 de CSRF.** É o de "Sem permissão" da 03, para seguir G3.11. O texto do 415 ("O conteúdo enviado
   precisa estar em JSON.") não está na 03 e foi para Pendências.
8. **Linha de log da Server Action.** O evento é `acao_painel`, e `rota` leva o nome da ação, porque a lista de C-21
   não tem campo `acao` e a Server Action não tem rota. Não há `metodo` nem `status`.
9. **`meta.exemplo`.** Quando a rota não informa, ele é derivado do padrão: `[id]`, `[espId]`, `[rskId]`, `[decId]` e
   `[agente]` ganham um valor que passa na regex. Assim o teste da T13 chega à autorização sem cada rota declarar
   exemplo.
10. **Nível do log no 5xx.** A linha de requisição com 5xx sai como `error`, e as outras como `info`. Os campos são os
    mesmos.
11. **Tempo limite da saúde.** Os 150 ms valem também para `obterDeps`. Assim, o healthcheck responde 503 rápido mesmo
    com o banco fora. Por isso a primeira conferência depois do boot pode dar 503, se a partida do pg-boss passar de
    150 ms; a próxima já encontra os `Deps` prontos. Foi para Pendências da `09-entrega`.
12. **`RE_ID_DEMANDA` e `reIdVersao` exportados de `rota.ts`.** São as regex de G3.10 que `paramId` usa. A T14, do
    gerador de id, pode levá-las ao módulo de ids e reexportar daqui.

## Decisões tomadas

- **Parâmetros antes de `obterDeps` e da autenticação.** Id fora do formato responde 404 sem tocar banco nem sessão
  (C-17), como diz a ordem do plano.
- **Cabeçalhos seguros aplicados por último.** A função pode pôr `content-disposition` e `content-type`, mas não troca
  `no-store`, `nosniff` nem `no-referrer`, e `access-control-*` é descartado (C-19, C-15).
- **`unstable_rethrow` em `acaoDoPainel`.** Sem ele, um `redirect()` da função viraria `erro_interno`.
- **CSP no cabeçalho da requisição também.** É o caminho documentado para o Next pôr o nonce nos scripts dele.
  `'unsafe-eval'` só no desenvolvimento, porque o React em modo dev precisa dele.
- **HSTS por `NODE_ENV` no `next.config.ts`**, com `max-age=63072000; includeSubDomains`. Sem `preload`, que é
  compromisso com os navegadores e cabe a Fabiano.
- **Saúde por `max(created_at)::text`**, comparado como texto com o `when` do journal. O `bigint` não passa por número
  do JS.
- **Sentry trocado por espião só em `rota.test.ts` e `acao-painel.test.ts`.** O que se confere ali é que só o 5xx vai
  para ele. O conteúdo do envio já é testado em `sentry.test.ts`. Banco, Better Auth e tokens seguem reais.
- **Sem banco de desenvolvimento.** Tudo roda no Testcontainers. O `docker-compose.dev.yml` não subiu.

## Pendências

- **`ux-ui-design`:** confirmar o texto do 415, "O conteúdo enviado precisa estar em JSON.". Ele entra na lista do texto
  do 401 de token (parecer 2 da T10).
- **T13:**
  - `test/requisicao.ts` já existe, com `chamarRota(h, { metodo, cookie, bearer, params })`.
  - `h.meta.exemplo` traz parâmetros que passam na regex.
  - Os testes de C-15 já contam com `disableOriginCheck: false` (desvio 3 da T08). A conferência de origem da API
    agora é do `rota()`, e a do Better Auth segue nas rotas `/api/auth`.
- **T16 e T40:** o teste de integração de C-19 em `GET /api/demandas/:id` e em `/demandas/[id]` entra com a primeira
  rota e a primeira página reais.
- **T36 e T46:**
  - A CSP não tem `style-src` próprio e herda `default-src 'self'`, como pede C-19. Se o e2e mostrar estilo inline do
    Next bloqueado, a T36 decide com o tech-lead entre `style-src 'self' 'nonce-…'` e a mudança de C-19.
  - A página que precisar do nonce lê `x-nonce` dos cabeçalhos da requisição.
  - O `OPTIONS` automático do Next sem `Access-Control-Allow-Origin` (C-15) se confere no e2e da T46. O proxy não põe
    cabeçalho CORS.
- **`09-entrega`:** dar ao healthcheck do `docker-compose.hml.yml` e do Easypanel um período de partida (desvio 11).
  O primeiro `GET /api/saude` depois do boot pode dar 503 enquanto o pg-boss parte.
- **`10-documentacao`:** no `deploy.md`, o HSTS do app vale só com `NODE_ENV=production` e não tem `preload`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -20` — topo em 1bd39bb (06-T10-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --stat --format=%h%x20%s -n 40` — arquivos de cada passagem, da T02 à T10
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/rota.test.ts src/lib/acao-painel.test.ts src/lib/deps.test.ts src/app/api/saude/route.test.ts src/proxy.test.ts src/instrumentation.test.ts test/next-config.test.ts src/app/api/auth` — vermelho: 8 arquivos falharam, 16 testes falharam e 2 passaram (módulos não encontrados)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/rota.test.ts src/lib/acao-painel.test.ts src/lib/deps.test.ts src/app/api/saude/route.test.ts src/proxy.test.ts src/instrumentation.test.ts test/next-config.test.ts src/app/api/auth` — verde: 8 arquivos, 79 de 79
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — 0 erros, 1 aviso (parâmetro sem uso na saúde), corrigido em seguida
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 55 arquivos, 958 de 958, 0 falhas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas build` — compilou, com `/api/auth/[...all]`, `/api/saude` e o Proxy
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — 8 modificados e 13 novos, todos em `src/`, `test/` e `next.config.ts`

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
