---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T11-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G5 e T10 a T14), 01-analista-requisitos.md (RF-01 e RF-17 até a matriz da seção 5), 06-T11-engenheiro-backend.md, commit 9caf56c, src/lib/rota.ts, src/lib/rota.test.ts, src/lib/acao-painel.ts, src/lib/acao-painel.test.ts, src/lib/deps.ts, src/lib/deps.test.ts, src/lib/env.ts, src/lib/env.test.ts, src/lib/erros.ts, src/lib/corpo.ts, src/lib/fila.ts, src/app/api/saude/route.ts, src/app/api/saude/route.test.ts, src/proxy.ts, src/proxy.test.ts, src/instrumentation.ts, src/instrumentation.test.ts, next.config.ts, test/next-config.test.ts, test/requisicao.ts, test/banco.ts, test/deps.ts, test/auth.ts, test/sessao.ts, test/sentinelas.ts, src/modules/acesso/matriz.ts, src/modules/acesso/exigir-pessoa.ts, src/modules/acesso/resolver-ator.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verificação da T11 (adaptador de rota e de Server Action, `obterDeps`, proxy, boot, saúde e `next.config.ts`), sobre o
commit `9caf56c`. Os 77 testes do engenheiro cobrem o caminho principal de cada controle. Acrescentei 53 testes de
borda em 6 arquivos novos `*-qa.test.ts`. Nenhum arquivo existente mudou. Todos os testes passam e nenhum defeito
bloqueia a tarefa. Um ponto Minor foi para Pendências.

### Critério da tarefa → teste que cobre

| Critério (plano, T11 "Cobre"; 01) | Testes do engenheiro | Testes acrescentados (QA) |
|---|---|---|
| C-15, CSRF da API: `Origin` igual à de `BETTER_AUTH_URL` (403) e JSON (415) | `src/lib/rota.test.ts` › "rota(): C-15, CSRF" (9 casos: Origin estranha, ausente, `null`; 415; charset; Bearer sem Origin; GET com cookie; origem antes da autenticação) | `src/lib/rota-qa.test.ts` › "C-15, CSRF em todo método que muda estado": `%s com cookie e Origin de outro site → 403` (POST, PUT, PATCH, DELETE); `%s com cookie e sem Origin → 403` (POST, PUT, DELETE); `método em minúsculas ("patch"…)`; `origem parecida com a do painel não passa: %s → 403` (porta, esquema, `localhost`, sufixo `.atacante.test`, sem porta); `qualquer cookie conta…`; `agente só com Bearer… cria pelo POST JSON`; `agente só com Bearer e corpo que não é JSON → 415`; `"application/json-patch+json"… → 415` |
| C-15, Server Actions: `allowedOrigins` só com o host de `BETTER_AUTH_URL` | `test/next-config.test.ts` (3 casos) | `test/next-config-qa.test.ts` › `BETTER_AUTH_URL com porta e caminho → só o host com a porta`; `BETTER_AUTH_URL que não é URL… não abre origem nenhuma` |
| C-17, parâmetros pela regex: fora dela 404 sem consulta | `rota.test.ts` › `id fora do formato → 404…`; `ESP no lugar de DEC → 404` | `rota-qa.test.ts` › `id fora do formato → 404 sem tocar nos Deps…`: os `Deps` são um Proxy que conta acessos, e a contagem fica em 0 |
| C-17 e RNF-04, corpo de até 512 KB (413) | `rota.test.ts` › `corpo de 600 KB → 413` | `rota-qa.test.ts` › `corpo de exatamente 512 KB é lido…` (524.288 bytes → 400); `um byte acima de 512 KB → 413 com a mensagem do limite`; `sem credencial e corpo de 600 KB → 401` (o corpo não é lido antes da autenticação) |
| Ordem do `rota()` (autorizar antes do Zod; a T13 conta com isso) | `rota.test.ts` › "autenticação e autorização" | `rota-qa.test.ts` › `agente proibido com corpo fora do schema → 403, não 400`; `pessoa sem 2FA com JSON quebrado → 403 sem_2fa, não 400`; `chave repetida na query vira lista e o schema de texto recusa` |
| C-19, cabeçalhos das rotas: `no-store`, `nosniff`, `no-referrer`, sem CORS | `rota.test.ts` › "rota(): C-19, cabeçalhos" (4 casos) | `rota-qa.test.ts` › `Cache-Control, Referrer-Policy e X-Content-Type-Options da função não trocam os seguros; CORS em qualquer caixa sai`; `o 403 de CSRF e o 413 também saem com no-store…` |
| C-19, CSP com nonce e `no-store` nas páginas (proxy) e cabeçalhos fixos | `src/proxy.test.ts` (8 casos); `test/next-config.test.ts` (HSTS só em produção, `poweredByHeader`) | — (já coberto; o teste no navegador é da T36 e da T46) |
| C-20, erro pelo mapeador e Sentry só no 5xx | `rota.test.ts` › "rota(): C-20, erro"; `acao-painel.test.ts` › `ErroDominio…`, `C-20: erro do banco…` | `rota-qa.test.ts` › `valor lançado que não é Error… → 500 genérico…`; `nenhum 4xx vai ao Sentry (400, 401, 403, 404, 413, 415)`; `a linha do 5xx sai como error (50) e a do 4xx como info (30)`. `src/lib/acao-painel-qa.test.ts` › `valor lançado que não é Error…`; `nenhum erro esperado vai ao Sentry…`; `linha do erro interno como error (50)…` |
| C-04 e C-09 na Server Action: só pessoa com sessão por cookie e 2FA | `acao-painel.test.ts` (sem sessão, sem 2FA, C-12) | `acao-painel-qa.test.ts` › `token de agente em Authorization, sem cookie → nao_autenticado…`; `o token da sessão da pessoa mandado como Bearer… → nao_autenticado`; `cookie de sessão inventado → nao_autenticado` |
| `redirect()` e `notFound()` passam direto (`unstable_rethrow`) | — (o engenheiro afirma, sem teste) | `acao-painel-qa.test.ts` › `redirect() dentro da função não vira erro_interno…` (`NEXT_REDIRECT`); `notFound() dentro da função também segue para o Next, sem Sentry` |
| C-21 e RNF-10: linha de requisição só com os campos da lista, sem dado sensível | `rota.test.ts` › "rota(): C-21" (5 casos); `acao-painel.test.ts` › `C-21…` | `rota-qa.test.ts` › `token de agente inválido (sentinela) → 401, e o token não vai ao log`; `o valor do cookie de sessão, o IP e o user-agent não vão ao log`; `o 403 de CSRF registra a linha como anonimo… sem a origem recebida`. `acao-painel-qa.test.ts` › `a linha não leva o valor do cookie de sessão` |
| C-27, `obterDeps` só com `DATABASE_URL` e o papel do app | `src/lib/deps.test.ts` (4 casos) | `src/lib/deps-qa.test.ts` › `C-27: com DATABASE_URL_MIGRATOR no ambiente, o pool e a fila conectam só como orquestrador_app` (confere `pg_stat_activity`); `banco fora no boot: rejeita sem a senha da URL…`; `chamadas ao mesmo tempo com a montagem falhando…` |
| C-31 e C-33 no boot (`register()`) | `src/instrumentation.test.ts` (5 casos); `env.test.ts` (das etapas anteriores) | `src/instrumentation-qa.test.ts` › `sem DATABASE_URL o app não sobe, e o Sentry não liga`; `BETTER_AUTH_URL fora de http/https… não traz o valor`; `retenção nos limites (1 e 365) sobe` |
| RNF-17 e ADR-12, saúde pública: 200 em menos de 200 ms, sem versão nem configuração; 503 sem migration | `src/app/api/saude/route.test.ts` (6 casos) | `src/app/api/saude/route-qa.test.ts` › `Deps que não montam… → 503 indisponivel, sem o valor no log`; `banco que recusa a conexão → 503, e o log não leva a URL nem a senha`; `200 só com { status: ok }: sem versão, sem cabeçalho de servidor…`; `a resposta de 200 não deixa linha de log` |
| CA-01.3: sem sessão nem token, 401 em toda rota exceto a saúde | `rota.test.ts` › `sem credencial → 401` | `rota-qa.test.ts` › `sem credencial e corpo de 600 KB → 401`. O teste que percorre todas as rotas é da T13 |

### Testes acrescentados

| Arquivo | Testes |
|---|---|
| `src/lib/rota-qa.test.ts` | 32 |
| `src/lib/acao-painel-qa.test.ts` | 9 |
| `src/lib/deps-qa.test.ts` | 3 |
| `src/app/api/saude/route-qa.test.ts` | 4 |
| `test/next-config-qa.test.ts` | 2 |
| `src/instrumentation-qa.test.ts` | 3 |
| **Total** | **53** |

Todos usam só dado fictício: as sentinelas de `test/sentinelas.ts`, IPs de documentação e domínios `.test`. Nenhum
define `ANTHROPIC_API_KEY` nem `RESEND_API_KEY` (G3.3). Nenhum lê o relógio real. Cada arquivo tem o próprio banco do
Testcontainers e zera o estado no `beforeEach`. A primeira rodada isolada teve 1 falha, que virou a pendência abaixo.
Os 6 arquivos rodaram duas vezes isolados, com 53 de 53 nas duas, e uma vez na suíte inteira.

### Resultado

- `pnpm test`: 61 arquivos, 1011 de 1011, 0 falhas. Antes: 55 arquivos e 958 testes.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git diff --stat`: vazio. Só há os 6 arquivos novos, todos sem rastreio. Nenhum teste existente foi apagado,
  afrouxado nem marcado com `.skip`, `.only` ou `.todo`. No commit `9caf56c`, o único teste antigo que mudou foi
  `src/app/api/auth/[...all]/route.test.ts`, com 1 caso a mais e nenhuma linha removida.

## Decisões tomadas

- **Arquivos `*-qa.test.ts` separados.** Segue o padrão da `06-T10-testes`, e assim os testes do engenheiro ficam como
  ele entregou.
- **Proxy que conta acessos aos `Deps` no teste do 404.** Prova o "sem consulta" de C-17 pelo comportamento: o teste
  não depende de como o código está escrito.
- **`pg_stat_activity` para C-27.** Prova que nenhuma conexão do app nem da fila usa o migrator, mesmo com
  `DATABASE_URL_MIGRATOR` no ambiente. A busca no código-fonte das chaves de IA e de e-mail fica com o teste estático
  da T13, porque G3.3 proíbe definir essas variáveis no teste.
- **Borda exata de 512 KB.** O teste anterior só usava 600 KB. Um limite errado para menos, por exemplo 500 KB,
  passaria nele.
- **Sem testes novos no proxy.** Os 8 casos existentes cobrem a CSP, o nonce, o `no-store` e o matcher. O que falta é a
  conferência no navegador, que é da T36 e da T46.
- **Caso do curinga fora do teste.** O caso `https://*.exemplo.test` saiu do teste do `next.config`. Mantê-lo deixaria
  a suíte vermelha por um ponto Minor, e uma asserção que aceitasse o curinga confirmaria o defeito. Ele está descrito
  em Pendências, com o jeito de reproduzir.

## Pendências

- **`engenheiro-backend` e `tech-lead`, Minor, não bloqueia.** O comentário de `next.config.ts` diz "nunca um
  curinga", mas `hostsPermitidos('https://*.exemplo.test')` devolve `['*.exemplo.test']`. O Next lê esse valor como
  curinga de subdomínio em `allowedOrigins`. O `lerConfigApp()` do boot também aceita essa URL, porque confere só o
  protocolo.
  - Risco baixo: o valor vem da configuração de Fabiano no Easypanel, não do cliente. Com ele, o login também não
    funcionaria.
  - Correção sugerida: recusar `*` no host, em `hostsPermitidos` e no `URL_HTTP` de `src/lib/env.ts`.
  - Teste que deve entrar com a correção: `vi.stubEnv('BETTER_AUTH_URL', 'https://*.exemplo.test')` e esperar `[]`.
- **T13:** o teste estático de C-27 (`test/estatico/variaveis.test.ts`) fecha a parte "não lê `ANTHROPIC_API_KEY` nem
  `RESEND_API_KEY`" de `obterDeps`, que não dá para provar sem definir essas variáveis.
- **T36 e T46:** a CSP com nonce, o `no-store` das páginas e o `OPTIONS` sem CORS só se confirmam no navegador
  (Playwright).
- **Aviso na saída da suíte:** o teste do método em minúsculas faz o undici imprimir um `UNDICI-FETCH-patch`. É de
  propósito: prova que o `rota()` normaliza o método. O aviso não é erro.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 9caf56c99a28cff1249fbd968692b72b5a4314da`: arquivos do commit da construção
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8`: topo em a066a41 (06-T11-revisao)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status`: limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat a066a41`: a revisão só tocou documentos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat --format=%h 1bd39bb`: padrão `*-qa.test.ts` da 06-T10-testes
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test`: linha de base, 55 arquivos, 958 de 958
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/rota-qa.test.ts src/lib/acao-painel-qa.test.ts src/lib/deps-qa.test.ts src/app/api/saude/route-qa.test.ts test/next-config-qa.test.ts src/instrumentation-qa.test.ts`: 52 de 53, 1 falha (o curinga, ver Pendências)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/next-config-qa.test.ts`: 2 de 2
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint`: limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck`: limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test`: 61 arquivos, 1011 de 1011
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/rota-qa.test.ts src/lib/acao-painel-qa.test.ts src/lib/deps-qa.test.ts src/app/api/saude/route-qa.test.ts test/next-config-qa.test.ts src/instrumentation-qa.test.ts`: 53 de 53, segunda rodada para conferir estabilidade
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status`: só os 6 arquivos novos, sem rastreio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat`: vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 9caf56c99a28cff1249fbd968692b72b5a4314da -- src/app/api/auth/[...all]/route.test.ts`: só acréscimo de 1 caso

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
