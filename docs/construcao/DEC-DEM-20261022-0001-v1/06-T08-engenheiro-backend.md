---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T08-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, 05-tech-lead.md, 06-T08-engenheiro-backend.md (volta anterior), 06-T47-engenheiro-dados-bd.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T47 e T08), src/modules/acesso/auth.ts, src/lib/env.ts, src/app/api/auth/[...all]/route.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

### Resumo

Esta é a volta da T08 depois da T47 (commit a93cd60), que criou na `two_factor` as colunas `verified`,
`failed_verification_count` e `locked_until`. O código e os testes da T08 já estavam no ramo, no commit `a643bc1`.
Nesta volta não mudou nenhum arquivo do código nem dos testes: o `git status` continua limpo.

Os 9 testes de `src/modules/acesso/auth.test.ts` que falhavam com `BetterAuthError: Drizzle schema mismatch` passam
agora. O arquivo dá 14 de 14, e a suíte inteira dá 628 de 628. Lint e typecheck estão limpos.

Conferi a tarefa contra o plano (arquivos, interfaces, configuração de `criarAuth` e passos 1 a 5). Não falta nada.

### Arquivos da T08 (do commit `a643bc1`, sem mudança nesta volta)

- `src/lib/env.ts`: `ConfigApp`, `lerConfigApp(env?)` e `ErroConfiguracao`, com Zod.
  - `BETTER_AUTH_SECRET` precisa ter 32 bytes ou mais (C-33).
  - `BETTER_AUTH_URL` precisa ser `http` ou `https` e é guardada como origem.
  - `DATABASE_URL` é obrigatória.
  - `CABECALHO_IP_CLIENTE` tem padrão `x-real-ip`.
  - `RETENCAO_TEXTO_BRUTO_DIAS` vai de 1 a 365, com padrão 90 (C-31).
  - O erro cita só o nome da variável.
- `src/modules/acesso/auth.ts`: `criarAuth({ db, config, relogio? })` e o tipo `Auth`. A configuração é a do plano
  (C-01, C-02, C-03, C-07 e RNF-12), mais os desvios 3 e 4.
- `src/app/api/auth/[...all]/route.ts`: `GET` e `POST` por `toNextJsHandler`. A instância nasce na primeira
  requisição.
- `src/lib/deps.ts`: só o tipo `Deps` de G5.
- `test/auth.ts`: `CONFIG_TESTE` e `criarContaDeTeste(auth, { papel, email?, nome? })`.
- `test/deps.ts`: `criarDepsDeTeste(banco, { relogio? })`.

### Testes da T08 (do commit `a643bc1`)

- `src/lib/env.test.ts`: 9 testes (C-31, C-33, C-06, padrões, erro sem o valor).
- `src/modules/acesso/auth.test.ts`: 14 testes.
  - Controles: C-01, C-02, C-03 (com a origem recusada), C-06 (base), C-07, C-33 (cifra do TOTP) e C-21 (logger).
  - Também testa `criarContaDeTeste`.
- `src/app/api/auth/[...all]/route.test.ts`: 2 testes.
- `test/deps.test.ts`: 2 testes.

### Teste antes do código (visto falhando)

Na volta anterior, antes de qualquer código da T08, `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test`
deu:

```
 FAIL  src/lib/env.test.ts [ src/lib/env.test.ts ]
Error: Cannot find module './env' imported from .../src/lib/env.test.ts
 FAIL  src/modules/acesso/auth.test.ts [ src/modules/acesso/auth.test.ts ]
Error: Cannot find module '../../../test/auth' imported from .../src/modules/acesso/auth.test.ts
 Test Files  4 failed | 28 passed (32)
      Tests  2 failed | 588 passed (590)
```

Antes da T47, com o código da T08 pronto, 9 testes de `auth.test.ts` ainda falhavam. O mesmo trecho está no passo 2
da T47 (`06-T47-engenheiro-dados-bd.md`):

```
 ❯ src/modules/acesso/auth.test.ts (14 tests | 9 failed)
BetterAuthError: Drizzle schema mismatch
  Missing columns
    twoFactor.verified
    twoFactor.failedVerificationCount
    twoFactor.lockedUntil
```

### Resultado desta volta

- `pnpm test`: 33 arquivos, 628 de 628 testes passaram e 0 falharam.
- `pnpm test src/modules/acesso/auth.test.ts`: 14 de 14 passaram. Os 9 que falhavam estão verdes.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.

A suíte imprime duas linhas no stdout: `{"level":50,...,"evento":"better_auth"}`. Elas vêm dos dois logins que falham
de propósito no teste de C-21 (e-mail inexistente e senha errada). É o logger do desvio 4 funcionando: as linhas não
têm mensagem, e-mail nem argumento.

### Desvios do plano (os mesmos da volta anterior; a `06-T08-revisao` julga cada um)

1. Assinatura `lerConfigApp(env: Record<string, string | undefined> = process.env)` em vez de
   `env?: NodeJS.ProcessEnv`. Com os tipos do Next, `NODE_ENV` é obrigatório no `ProcessEnv`, e o teste do plano não
   compilava.
2. Os testes leem `auth.options` pelo tipo `BetterAuthOptions`. Com o tipo inferido, as chaves `sendResetPassword` e
   `socialProviders` não compilavam.
3. `advanced.disableOriginCheck: false` e `disableCSRFCheck: false` ficam explícitos. Sem eles, o Better Auth 1.7.6
   desliga a conferência de origem quando `NODE_ENV=test`.
4. O `logger` do Better Auth vai para o `log` (C-21), só com `{ evento, erro: { classe, code } }`, e nada abaixo de
   `warn`. O logger padrão escrevia no console a mensagem, os argumentos e a consulta SQL com os parâmetros.
5. Em `criarContaDeTeste`, o `internalAdapter.createUser` do 1.7.6 exige `{ method: 'script' }` como segundo argumento
   (`UserProvisioningSource`). A T32 deve usar o mesmo.
6. O teste C-01 filtra pelo e-mail, em vez de esperar a tabela `user` vazia, para não depender da ordem dos testes
   (RNF-15).
7. Há testes além dos do plano: a rota, os `Deps`, a origem recusada, a cifra de C-33 e o logger de C-21.

## Decisões tomadas

- Não mexi no código nem nos testes nesta volta. A T47 resolveu a única causa da falha, e a conferência contra o plano
  não achou nada faltando.
- Rodei `auth.test.ts` também sozinho, para mostrar os 14 verdes do arquivo além da suíte inteira.
- Não subi o banco de desenvolvimento: os testes usam Testcontainers.

## Pendências

- Para a T09, como na volta anterior e no `05-tech-lead.md`:
  - Com as colunas da T47, o plugin `twoFactor` passa a ter bloqueio próprio de verificação. Esse bloqueio se sobrepõe
    a C-06 e à tabela `bloqueio_verificacao`.
  - Fica em aberto se o `/sign-in` tem um limite próprio, mais estrito que 10 por minuto.
- Para a T11 e a T13: os testes de C-15 dependem de `disableOriginCheck: false` explícito (desvio 3).
- Para a T32: `createUser` com `{ method: 'script' }` (desvio 5).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -15` — último commit 6f11a9f (06-T47-testes), com a93cd60 (T47) e a643bc1 (T08) no ramo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 33 arquivos, 628 de 628
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso/auth.test.ts` — 14 de 14
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, nenhum arquivo mudou nesta volta

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
