---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T11-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12 e o resto), 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T10 a T13), 06-T11-engenheiro-backend.md, 06-T10-tech-lead.md, 04-seguranca-aplicacao.md (seção 1 e controles C-06 a C-40), commit 9caf56c (código e testes da T11), src/lib/env.ts, src/lib/fila.ts, src/lib/erros.ts, src/lib/corpo.ts, src/lib/log.ts, src/lib/rota.ts, src/app/api/saude/route.ts, src/modules/acesso/resolver-ator.ts, test/deps.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T11: `rota()`, `acaoDoPainel()`, `obterDeps`, proxy com CSP e nonce, `register()` do boot, `GET /api/saude`
e os cabeçalhos do `next.config.ts`. O commit 9caf56c traz os 10 arquivos que o plano manda criar e os 2 que manda
modificar, mais 77 testes. Fora da lista, ele cria `src/modules/acesso/mensagens.ts` e modifica `exigir-pessoa.ts`,
`matriz.ts`, `resolver-ator.ts` e `erros.ts`.

**Resultado: aprovada.** Não há problema Critical nem Important. Os sete pareceres abaixo são Minor e foram para
Pendências.

### Checklist da seção 12 do padrão técnico

| Item | Situação | Base |
|---|---|---|
| Faz o que o plano pede, nem mais nem menos; arquivos fora da tarefa não mudaram | Cumprido | Os 12 arquivos do plano estão no commit. As mudanças fora da lista são duas. A primeira é a pendência do parecer 1 do `06-T10-tech-lead.md`: as mensagens de acesso ficam num lugar só, e o texto não muda. A segunda tira o `depsDaPagina` de `exigir-pessoa.ts`, que montava um segundo pool e um segundo Better Auth. O comentário do próprio arquivo já anunciava essa troca na T11. Os desvios 1 a 12 da entrega são aceitos (ver Decisões) |
| Há teste para cada comportamento novo, e ele falharia sem o código | Cumprido, com 1 Minor | A rodada vermelha mostra os 8 arquivos falhando: 16 testes, por módulo ou função que não existia. Banco, Better Auth e tokens são reais; só o Sentry vira espião. Os testes cobrem: a ordem do `rota()` (o 404 sai antes de autenticar, e a origem é conferida antes do cookie), cada código (403, 415, 413, 404, 400, 401, 409, 500), os cabeçalhos no sucesso e no erro, a linha de log com a lista exata, a saúde com banco vazio, com migration faltando e com banco preso, o nonce, o `x-nonce` trocado, o boot com segredo curto e com 400 dias, e o `next.config` com e sem a variável. Três ramos ficaram sem teste (parecer 6) |
| Nenhum segredo, valor de `.env` ou dado pessoal real | Cumprido | O segredo é fictício (`SEGREDO-FICTICIO-DE-TESTE-…`), os domínios são `.test`, o IP vem de `novoIp` e os sentinelas seguem o formato `SENTINELA-`. Há teste de que o token, o id da rota, a query e o corpo não chegam ao log, e de que a mensagem do Postgres não chega à resposta. O erro de configuração cita só o nome da variável |
| Entrada externa validada com Zod; erro sem vazar detalhe | Cumprido, com 1 Minor | Os parâmetros passam pela regex antes de `obterDeps`, e fora dela sai 404 sem consulta (C-17, G3.10). A query e o corpo passam pelo Zod, com `lerCorpoJson` de 512 KB. A Server Action também passa pelo Zod. O erro sai só por `mapearErro`, e o 5xx tem texto genérico. Uma rota com segmento dinâmico e sem `params` não teria a regex (parecer 7) |
| Banco: migration gerada, papel migrator, RLS e guarda | Não se aplica | Nenhuma migration. A saúde lê `drizzle.__drizzle_migrations` com o papel `orquestrador_app`, e o teste de 200 prova o acesso de leitura. `obterDeps` monta tudo com `DATABASE_URL` e nunca lê `DATABASE_URL_MIGRATOR` (C-27). Sem `tenant_id` |
| Nada duplica função que já existe | Cumprido, com 2 Minor | Saíram o `depsDaPagina` e a montagem própria da rota de auth: agora há uma instância só de `Deps` por processo. As três cópias das mensagens de acesso também saíram. Sobram os cabeçalhos seguros copiados na saúde (parecer 1) e o texto do 415 escrito duas vezes (parecer 2) |
| Textos de interface em pt-BR; axe nas telas tocadas | Cumprido, com 1 Minor | Nenhuma tela. O 404 e o 403 usam os textos da 03, seção 2.8, por inteiro. O texto do 415 não está na 03 e já está nas pendências da entrega (parecer 2) |
| Minor vai para Pendências; só Critical e Important bloqueiam | Cumprido | Os 7 pareceres são Minor e estão em Pendências |
| No PR: `/code-review`, correções, `/security-review` | Não se aplica nesta etapa | Fica com a `08-revisao` (G2 do plano) |

Rodei de novo `pnpm test` (55 arquivos, 958 de 958), `pnpm lint` e `pnpm typecheck`, e os três passaram limpos. O ramo
está limpo.

### Conferência contra o plano e os controles

- **Interfaces:** `obterDeps`, `definirDepsParaTeste`, `RespostaRota`, `HandlerRota`, `rota<P, Q, C>`, `paramId`,
  `ResultadoAcao<T>` e `acaoDoPainel<E, T>` têm a assinatura do plano. `Deps` segue G5.
- **Ordem do `rota()`** (`src/lib/rota.ts:141-154`): parâmetros, CSRF, `resolverAtor`, `autorizar`, query, corpo e
  função, como manda o plano. `obterDeps` vem depois da regex, e por isso o id fora do formato não toca o banco.
- **C-15:** a origem é comparada com `config.urlBase`, que `env.ts:23` normaliza para `URL.origin`. Assim, uma
  `BETTER_AUTH_URL` com barra no fim não quebra a comparação. Com cookie, a falta de `Origin` e o `Origin: null` dão
  403. Só com Bearer, sem cookie, não precisa de `Origin`. O `allowedOrigins` das Server Actions tem só o host
  configurado, e fica vazio sem a variável, nunca com curinga. Nenhum `access-control-*` sai, nem quando a função
  tenta pôr um.
- **C-17:** o 413 sai antes do parse (`corpo.ts`, pelos bytes lidos). As regex de demanda e de versão são as de G3.10,
  e há uma regex por prefixo: ESP no lugar de DEC dá 404.
- **C-19:** `rota()` põe `no-store`, `nosniff` e `no-referrer` por último, e a função não troca nenhum dos três. O
  proxy põe a CSP com nonce e o `no-store` em toda página e em `/api/auth`. O `next.config.ts` põe `X-Frame-Options`,
  `nosniff` e `Referrer-Policy`, e põe HSTS em produção. `poweredByHeader` segue `false`. A CSP é a do plano, com
  `'strict-dynamic'`. O teste de integração em `/demandas/[id]` e em `GET /api/demandas/:id` fica para a T16 e a T40,
  como está nas pendências da entrega.
- **C-20 e C-21:** o erro sai só por `mapearErro`, e só o 5xx vai ao Sentry. A linha `requisicao` tem os seis campos e o
  `codigoErro`. A rota no log é o padrão. Todos esses campos estão em `CAMPOS_PERMITIDOS` (`log.ts:7-24`).
- **C-27, C-31 e C-33:** `deps.ts` lê só `lerConfigApp()`. `register()` impede a subida com segredo curto ou com
  retenção de 400 dias, e o erro cita só o nome da variável.
- **RNF-17 e ADR-12:** `max(created_at)::text` é comparado como texto com o `when` do journal, sem passar `bigint` por
  número do JS. Com o tempo limite de 150 ms, o banco preso não prende o healthcheck. Quando o tempo esgota, a promessa
  que continua rodando já tem tratador pelo `Promise.race`, e não sobra rejeição sem tratamento.

### Pareceres (todos Minor)

1. **`src/app/api/saude/route.ts:11`: cabeçalhos seguros copiados de `src/lib/rota.ts:57`.**
   - Problema: `CABECALHOS`, com `no-store`, `nosniff` e `no-referrer`, repete o `CABECALHOS_SEGUROS` do adaptador.
   - Razão: o checklist proíbe duplicação. Se C-19 ganhar um cabeçalho, a saúde fica para trás sem nenhum teste quebrar.
   - Não bloqueia porque hoje os valores são iguais e o teste da saúde confere o `no-store`.
   - Caminho: exportar `CABECALHOS_SEGUROS` de `rota.ts` e importar na saúde. Faz quem tocar `src/lib/rota.ts` ou a
     saúde de novo.
2. **`src/lib/rota.ts:95` e `src/lib/rota.ts:98`: o texto do 415 está escrito duas vezes e não está na 03.**
   - Problema: "O conteúdo enviado precisa estar em JSON." aparece literal nos dois ramos de `conferirCsrf`.
   - Razão: G3.11, e é a mesma situação do parecer 1 da T10: com duas cópias, uma muda sem a outra.
   - Não bloqueia porque o texto só aparece no corpo da API.
   - Caminho: uma constante só (em `erros.ts`, ao lado de `MENSAGEM_NAO_ENCONTRADO`). A confirmação do texto já está
     com a `ux-ui-design`, nas pendências da entrega.
3. **`src/app/api/saude/route.ts:37`: o `GET` não lê a requisição nem declara que é dinâmico.**
   - Problema: o handler não usa nada da requisição e não exporta `dynamic`. O teste chama `GET()` direto e não prova
     como o Next trata a rota no build.
   - Razão: se o `next build` pré-renderizasse a rota, ele rodaria sem variável de ambiente e gravaria um 503 fixo, e a
     saúde nunca daria 200. Não bloqueia porque a falha seria visível: o `homologar` esperaria a saúde até esgotar o
     tempo, e nada chegaria à produção em silêncio.
   - Caminho: a `09-entrega` confere que `/api/saude` sai marcada como `ƒ` (dinâmica) na saída do `next build`. Se sair
     `○`, a tarefa volta ao `engenheiro-backend` para pôr `export const dynamic = 'force-dynamic'`.
4. **`next.config.ts:266` e `next.config.ts:269`: `headers()` e `serverActions` são avaliados no `next build`.**
   - Problema: o Next grava os cabeçalhos de `headers()` no manifesto de rotas durante o build, e no `next build` o
     `NODE_ENV` é sempre `production`. Então o HSTS vai em toda imagem, inclusive na da homologação, que roda em http.
     O navegador ignora HSTS em http, e por isso não há efeito. Com `output: 'standalone'`, o `allowedOrigins` também
     fica com o valor da variável no build: vazio no Docker, e aí o Next confere a origem pela própria `Host`.
   - Razão: o teste "sem HSTS fora de produção" vale só para o `next dev`. A pendência da entrega para a `10-documentacao`
     ("HSTS só com `NODE_ENV=production`") descreveria um comportamento que a imagem não tem.
   - Não bloqueia porque os dois casos ficam do lado seguro: o HSTS é ignorado em http, e o `allowedOrigins` vazio
     aceita só a origem da `Host`.
   - Caminho: a `09-entrega` registra se o `Dockerfile` usa `standalone` e confere a Server Action em homologação. A
     `10-documentacao` escreve no `deploy.md` que o HSTS vai em toda imagem de `next build`, sem `preload`.
5. **`src/modules/acesso/resolver-ator.ts:15-16`: comentário órfão.**
   - Problema: quando a constante local saiu, o comentário que a explicava ficou solto antes de `temCookieDeSessao`.
   - Razão: o comentário fala de uma declaração que não está mais ali.
   - Caminho: levar o comentário para junto do `throw` da linha 34, ou tirá-lo. Faz quem tocar `src/modules/acesso/`
     de novo.
6. **Três ramos sem teste.**
   - Problema: nenhum teste exercita estes três ramos:
     - `src/lib/rota.ts:98`: só Bearer, com corpo e `Content-Type` que não é JSON, deve dar 415 (desvio 6 da entrega);
     - `src/lib/acao-painel.ts:39`: um `redirect()` ou `notFound()` chamado pela função deve passar direto pelo
       `unstable_rethrow`, e não virar `erro_interno`;
     - `src/lib/deps.ts:24-26`: quando `criarFila` falha, o pool deve ser fechado e a próxima chamada deve tentar de
       novo.
   - Razão: o padrão pede teste para cada comportamento novo, e as três decisões estão justificadas na entrega. Não
     bloqueia porque os três são o lado restritivo ou a limpeza de recurso, e o caminho principal de cada um tem teste.
   - Caminho: a `06-T11-testes` (`qa-automacao`) acrescenta os três casos. No terceiro, uma `DATABASE_URL` com porta
     fechada faz o `criarFila` falhar.
7. **`src/lib/rota.ts:142`: rota com segmento dinâmico e sem `params` não passa pela regex.**
   - Problema: `params` é opcional em `OpRota`. Se uma rota `/api/demandas/[id]` for declarada sem `params: paramId.demanda`,
     o id bruto chega à função sem a regex de G3.10.
   - Razão: C-17 pede o 404 sem consulta para todo parâmetro de caminho, e esquecer o `params` não quebra nenhum teste
     hoje.
   - Não bloqueia porque ainda não existe rota de negócio: a primeira chega na T16.
   - Caminho: na T13, o teste que percorre as rotas chama, para cada handler cujo `meta.rota` tem `[`, o handler com o
     parâmetro `x` e sem credencial, e espera 404, não 401. Esse teste usa só o `meta` que já existe, e a interface não
     muda.

## Decisões tomadas

- **Aprovada sem devolução:** nenhum parecer é Critical ou Important. Cada controle da tarefa (C-15, C-17, C-19, C-20,
  C-21, C-27, C-31, C-33) tem teste contra o banco ou o Better Auth reais. O que ficou de fora é duplicação, comentário,
  conferência de build ou ramo restritivo sem teste.
- **Desvios aceitos:**
  - (1) e (3) as mensagens num lugar só cumprem o parecer 1 da T10, e o 404 vem da 03;
  - (2) com uma instância de `Deps` por processo, o limite em memória do Better Auth vale para o processo inteiro, e
    não um por cópia;
  - (4) os testes além do plano são o que o padrão pede para cada peça nova;
  - (5) a saúde sem parâmetro fica com o parecer 3, que manda conferir no build;
  - (6) tratar qualquer cookie como CSRF é mais restritivo que C-15, e o caso do agente segue igual;
  - (7) o 403 de CSRF com o texto da 03 segue G3.11;
  - (8) o evento `acao_painel` com o nome da ação em `rota` não sai da lista de C-21;
  - (9) o `meta.exemplo` derivado deixa a T13 chegar à autorização. Um nome de parâmetro desconhecido vira `x` e dá
    404, e a T13 quebra de forma visível;
  - (10) o 5xx com nível `error` tem os mesmos campos;
  - (11) os 150 ms incluem `obterDeps`, e o período de partida do healthcheck é da `09-entrega`;
  - (12) as regex exportadas de `rota.ts` podem ir para o módulo de ids na T14.
- **O pg-boss do app sobe com `migrate: false`, `supervise: false` e `schedule: false`** (`fila.ts:87`): `obterDeps` não
  faz DDL nem agenda, como pedem a T-02 e C-34.
- **A CSRF das Server Actions fica com o próprio Next:** `acaoDoPainel` não repete a conferência de origem. O
  `allowedOrigins` do `next.config.ts` é o controle de C-15 para elas, e o parecer 4 trata do caso em que ele fica vazio.
- **`definirDepsParaTeste` no código de produção é aceito:** está na interface do plano, e sem ele `obterDeps` não teria
  teste com banco real.

## Pendências

- **`qa-automacao` (06-T11-testes):** testar os três ramos do parecer 6: só Bearer com corpo que não é JSON dá 415;
  `redirect()` passa pelo `acaoDoPainel`; o pool é fechado e há nova tentativa quando `criarFila` falha.
- **T13:** no teste que percorre as rotas, todo handler com `[` em `meta.rota` responde 404 a um parâmetro fora do
  formato, sem credencial (parecer 7).
- **Quem tocar `src/lib/rota.ts`, a saúde ou `src/modules/acesso/` de novo:**
  - a saúde importa os cabeçalhos seguros de `rota.ts` (parecer 1);
  - o texto do 415 vira uma constante só (parecer 2);
  - o comentário órfão de `resolver-ator.ts:15-16` sai (parecer 5).
- **`ux-ui-design`:** confirmar o texto do 415. Já está na pendência da entrega, na mesma lista do texto do 401 de token
  (parecer 2 da T10).
- **`09-entrega`:**
  - conferir `/api/saude` como `ƒ` na saída do `next build` (parecer 3);
  - registrar se o `Dockerfile` usa `standalone` e conferir a Server Action em homologação (parecer 4);
  - dar o período de partida ao healthcheck, como no desvio 11 da entrega;
  - conferir em homologação que o app não sobe com segredo curto. O teste unitário prova que `register()` lança, mas
    não prova que o `next start` para com isso.
- **`10-documentacao`:** no `deploy.md`, escrever que o HSTS vai em toda imagem de `next build`, sem `preload`, em vez
  de "só com `NODE_ENV=production`" (parecer 4).
- **Seguem as da entrega:** T13 com `test/requisicao.ts` e `meta.exemplo`; T16 e T40 com o teste de integração de C-19;
  T36 e T46 com `style-src`, `x-nonce` e `OPTIONS` sem CORS.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 9caf56c99a28cff1249fbd968692b72b5a4314da` — 24 arquivos: os 12 do plano, os testes a mais, as 5 mudanças fora da lista, a entrega e o registro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 9caf56c99a28cff1249fbd968692b72b5a4314da` — diff completo do código e dos testes
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 55 arquivos, 958 de 958
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
