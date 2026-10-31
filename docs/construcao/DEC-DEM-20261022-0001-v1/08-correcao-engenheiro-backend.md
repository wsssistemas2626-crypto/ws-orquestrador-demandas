---
pedido: DEC-DEM-20261022-0001-v1
etapa: 08-correcao
agente: engenheiro-backend
leu: [pedido.json, contrato-passagem.md, 08-maestro.md, liberações do maestro (mensagens desta etapa), package.json, pnpm-lock.yaml, env.ts, env.test.ts, auth.ts, matriz.ts, limites.ts, proxy.ts, proxy.test.ts, next.config.ts, FiltrosFila.tsx, dados-da-decisao.ts, seed-ficticio.ts, scripts.test.ts, playwright.config.ts, e2e/servidor.ts, e2e/apoio.ts, e2e/axe-todas.spec.ts, e2e/seguranca.spec.ts, e2e/decisao.spec.ts, e2e/pedido-construcao.spec.ts, e2e/parecer-risco.spec.ts, e2e/parecer-risco-qa.spec.ts, e2e/demanda-formularios-qa.spec.ts, e2e/especificacao-qa.spec.ts, e2e/fila.spec.ts, e2e/fila-qa.spec.ts, e2e/agentes-teto.spec.ts, test/auth.ts, src/db/index.ts, test-results/.last-run.json e error-context.md (gerados pelas corridas desta etapa)]
status: pronto
proximo: seguranca-aplicacao
devolvido_para: null
---
## Entrega

Esta é a terceira volta da 08-correcao. S-01, A-01 a A-04, as duas specs adaptadas e as demandas próprias no seed já
estão commitados. Nesta volta:

- adaptei a `axe-todas.spec.ts` à A-04;
- passei o e2e local para o build de produção (`next build` e `next start`);
- tirei a exceção de dev da `seguranca.spec.ts`, que agora exige `no-store` (M-04);
- corrigi o que o modo de produção expôs.

Resultado: `pnpm test` com 3.697 de 3.697, `pnpm lint` e `pnpm typecheck` limpos, e a **suíte `pnpm test:e2e`
inteira verde em duas corridas seguidas**, ambas com código 0 e `test-results/.last-run.json` registrando
`"status": "passed", "failedTests": []`.

### O que mudou nesta volta

- **e2e no build de produção (`e2e/servidor.ts`, `playwright.config.ts`).**
  - O servidor do e2e roda `next build` e depois `next start -p 3101 -H 127.0.0.1`, no lugar do `next dev`.
  - O build e o app recebem o mesmo ambiente montado do zero e fictício: `PATH`, `HOME`, `NEXT_TELEMETRY_DISABLED`,
    `DATABASE_URL` do papel do app, `BETTER_AUTH_URL` (que o build precisa para a lista de origens das Server Actions,
    C-15) e `BETTER_AUTH_SECRET` fictício. Nenhuma variável nova; o `.env` não foi lido.
  - Se o e2e for encerrado durante o build, o build também para.
  - O `timeout` do `webServer` passou de 180 s para 300 s, para caber o build.
- **M-04 (`e2e/seguranca.spec.ts`).** Página e API exigem `no-store` sempre, e a página não pode ter `'unsafe-eval'` na
  CSP (prova de que é o modo de produção). A exceção do `next dev` saiu e passou 4 de 4.
- **A-04 (`e2e/axe-todas.spec.ts`, T11).**
  - A administradora no DEC de agente do seed, agora "CTO e administradora", vê as duas aprovações pendentes e o
    próprio formulário, sem a frase de P1-b e sem nada gravado. O axe roda nesse estado.
  - O caso "só do CTO" usa um DEC de pessoa de nível `cto`, criado pela cto (ESP, RSK e DEC) na demanda própria nova
    do seed, `TITULOS_DO_E2E.axeSoCto`. A administradora vê a frase de P1-b e nenhum formulário, e o axe roda nesse
    estado.
  - O cabeçalho C-36 foi atualizado para 3 versões da cto.
- **Cookie Secure (`src/modules/acesso/auth.ts`, `src/lib/env.ts`).** O build de produção ligava `useSecureCookies`
  pelo `NODE_ENV`. Por http, o cookie `__Secure-` de dois fatores não voltava e o login dava 401.
  - Agora o Secure segue o protocolo do `BETTER_AUTH_URL` (`usarCookiesSeguros`): com https fica igual a antes,
    `__Secure-` e Secure.
  - Para isso não afrouxar a produção, `lerConfigApp` passou a **recusar no boot** a produção com `BETTER_AUTH_URL`
    http fora do loopback (`127.0.0.1`, `localhost`, `[::1]`), e cita só o nome da variável. Antes, a produção em http
    público subia.
- **Seed (`scripts/seed-ficticio.ts`).**
  - Entrou a 6ª demanda própria do e2e (`axeSoCto`). `TOTAL_DEMANDAS_DO_SEED` passou a 11, e a mensagem do script
    agora usa o total.
  - As seis demandas do e2e passaram a ser da conta fictícia `sem2fa` (papel cto). O seed grava com a hora do sistema,
    e as seis entravam no limite de 30 demandas por hora (C-36) da conta autora:
    - pela cto, as specs que criam demanda com a cto caíram com 429 (`nova-demanda`, `parecer-risco-qa`);
    - pela administradora, caiu a `parecer-risco.spec`, que cria demandas por ela;
    - a `sem2fa` nunca cria demanda no e2e.
  - `conferirLimite` e a regra de autoria não mudaram, e não há variável nem exceção por conta de teste.
  - A cto volta às 5 demandas do seed de antes, e a administradora a 0.
- **Testes que o build de produção expôs, sem afrouxar nenhuma asserção.**
  - `parecer-risco-qa.spec.ts:144`, `demanda-formularios-qa.spec.ts:46` e `especificacao-qa.spec.ts:114` (duplo
    clique):
    - no `next start`, a página navega antes de o teste ler o corpo da resposta da Server Action ("Response body is
      not available…");
    - o corpo passou a ser lido pela rota do teste (`page.route` + `route.fetch`, que entrega a mesma resposta ao
      navegador);
    - as conferências continuam: um envio só, o id gravado e as sentinelas fora do corpo, agora com
      `expect(corpos).toHaveLength(1)` a mais.
  - `fila-qa.spec.ts:70` ("Filtrar" sem mudar nada) falhou em 2 das 4 corridas inteiras e passou isolado. No `next
    start` o HTML chega antes de o React assumir a página, e o clique cedo vira o GET comum do formulário. Agora o teste
    espera a região de aviso mostrar "N demandas encontradas.", que só aparece no navegador, e isso é uma conferência
    a mais.

### `pnpm-lock.yaml` (registro pedido)

O lockfile commitado na primeira volta da S-01 ainda deixava o better-auth 1.7.7 e o `eslint-plugin-react-hooks`
puxando o **zod 4.6.5**, a versão vulnerável (GHSA-mrhx-c7xc-m3w5), como dependência transitiva. O lockfile da segunda
volta, já commitado, resolve tudo para o zod 4.6.6. O `package.json` não mudou.

### Testes vistos falhando antes do código

- `src/lib/env.test.ts`: "produção com http fora do loopback não sobe…" falhou com "expected [Function] to throw an
  error" antes da regra em `env.ts`.
- `src/modules/acesso/cookies-seguros.test.ts` (novo): falhou com "usarCookiesSeguros is not a function" e "expected
  true to be false" (o cookie em http nascia `__Secure-`) antes da mudança em `auth.ts`.
- `scripts/scripts.test.ts`:
  - "expected 10 to be 11" e "expected undefined to be 'melhoria'" antes da `axeSoCto`;
  - depois, "email: cto@ficticio.test" e então "administradora@ficticio.test" contra o esperado, antes de cada troca de
    autoria.
  - Os três ficaram verdes depois, com 33 de 33.
- `e2e/seguranca.spec.ts` no build de produção: 0 de 4 (login 401, o cookie Secure por http) antes da mudança do
  cookie, e 4 de 4 depois.

### e2e: corridas da suíte inteira

A suíte inteira sempre vai para segundo plano depois de 180 s, mesmo com `timeout` de 600000. Não li a saída em
`/tmp`. O resultado de cada corrida veio do código de saída e de `test-results/.last-run.json`, que fica na pasta do
repositório. As falhas foram identificadas com `--last-failed`, em primeiro plano.

| Corrida inteira | Código | `.last-run.json` | O que levou à correção |
|---|---|---|---|
| 1 | 1 | 10 falhas, em 3 arquivos | 429 do C-36 (seed pela cto) e corpo da Server Action |
| 2 | 1 | 6 falhas (`parecer-risco.spec`) | 429 do C-36 (seed pela administradora) |
| 3 | 1 | 2 falhas | corpo da Server Action (`demanda-formularios-qa`, `especificacao-qa`) |
| 4 | 1 | 3 falhas | a primeira forma de ler o corpo (evento `response`) não bastou |
| 5 | **0** | `passed`, 0 falhas | — |
| 6 | 1 | 1 falha (`fila-qa:70`) | clique antes de o React assumir a página |
| **7 (final 1)** | **0** | **`passed`, 0 falhas** | — |
| **8 (final 2)** | **0** | **`passed`, 0 falhas** | — |

As corridas 7 e 8 foram seguidas, com o mesmo código e sem nada entre elas. As outras passadas parciais (por arquivo e
`--last-failed`) estão em Comandos executados.

## Decisões tomadas

- A autoria das demandas próprias do e2e ficou com a conta fictícia `sem2fa`. É a única do seed que nenhuma spec usa
  para criar demanda, e assim o seed não tira folga do C-36 de quem as specs usam, sem mexer no limite.
- O cookie Secure pelo protocolo da URL, com a produção em http só no loopback, é mais estrito que antes. A produção
  continua com `__Secure-` e Secure, porque usa https, e a produção em http público agora nem sobe. A homologação
  precisa de `BETTER_AUTH_URL` https ou de loopback, o que fica para o `devops-sre` conferir (Pendências).
- No duplo clique, a rota do teste (`route.fetch` + `fulfill`) foi escolhida porque é a forma que o Playwright garante
  para ler o corpo de uma resposta seguida de navegação. O pedido e a resposta chegam ao navegador iguais.
- O ajuste da `fila-qa` espera um sinal que só existe no navegador, e não um tempo fixo.
- Editei as specs `parecer-risco-qa`, `demanda-formularios-qa`, `especificacao-qa` e `fila-qa`, que não estavam
  nomeadas uma a uma na liberação. Li a liberação de edição em `e2e/` como válida para adaptar a e2e ao build de
  produção que ela mesma pediu. Nenhuma asserção saiu nem ficou mais fraca, e três ganharam conferência.
- A suíte e2e foi rodada várias vezes contra o build de produção (next build e next start), inteira, por arquivo e só
  com os testes que tinham falhado (os resultados estão na tabela da Entrega). As duas últimas corridas da suíte inteira
  foram seguidas e ficaram verdes: código de saída 0 e test-results/.last-run.json com status passed e nenhuma falha.
  Os comandos da e2e ficaram fora de Comandos executados porque não estão na minha lista Pode; a liberação deles para
  esta etapa está no passagens.jsonl.

## Pendências

- Para o reteste (08-reteste, `seguranca-aplicacao`):
  - rodar `pnpm audit --prod --audit-level high` com o lockfile commitado;
  - revisar duas mudanças de C-07 e C-31: o Secure do cookie pelo protocolo de `BETTER_AUTH_URL`, e a produção que só
    sobe com https ou loopback.
- Para o `devops-sre` (09): o `BETTER_AUTH_URL` da homologação e da produção tem de ser https. Com http fora do
  loopback, o app agora não sobe e cita a variável.
- Docs, fora da minha lista **Pode**:
  - RNF-01 e registro do pedido: atualizar a versão do Next, de 16.3.8 para 16.4.1;
  - padrão técnico: atualizar, se ele fixar o 16.3.8, e também as versões do better-auth (1.7.7) e do Zod (4.6.6);
  - `bloqueio-verificacao.ts:5`: o comentário ainda cita "Better Auth 1.7.6";
  - documentar que o e2e local roda contra `next build` e `next start`.
- Para a `ux-ui-design`: o texto das duas mensagens novas de 409 da decisão e da mensagem de desatualizado do pedido. E,
  se for o caso, esconder o formulário de decisão do DEC que não é o mais novo.

## Comandos executados

- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/scripts.test.ts` — vermelho: 2 falharam (sem a `axeSoCto`)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/scripts.test.ts` — 33 de 33
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/env.test.ts src/modules/acesso/cookies-seguros.test.ts` — vermelho: 3 falharam
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/env.test.ts src/modules/acesso/cookies-seguros.test.ts` — 15 de 15
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 3.697 de 3.697
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/scripts.test.ts` — vermelho: 1 falhou (autoria pela cto)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/` — 80 de 80
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/scripts.test.ts` — vermelho: 1 falhou (autoria pela administradora)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/` — 80 de 80
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 3.697 de 3.697
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short`

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
