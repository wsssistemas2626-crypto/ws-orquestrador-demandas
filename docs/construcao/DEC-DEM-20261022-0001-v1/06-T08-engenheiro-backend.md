---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T08-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, 05-tech-lead.md, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T07 a T09), 04-seguranca-aplicacao.md (seções 2 a 5), 06-T07-engenheiro-backend.md, package.json, tsconfig.json, vitest.config.ts, eslint.config.mjs, test/setup-global.ts, test/banco.ts, test/sentinelas.ts, test/estatico/projeto.test.ts, src/db/index.ts, src/db/transacao.ts, src/db/privilegios.ts, src/db/schema/index.ts, src/db/schema/acesso.ts, src/db/schema/comum.ts, src/lib/fila.ts, src/lib/log.ts, src/lib/reduzir-erro.ts, src/lib/erros.ts, src/lib/relogio.ts]
status: devolvido
proximo: tech-lead
devolvido_para: 05-plano
---
## Entrega

### Resumo

A configuração do Better Auth da T08 está escrita e testada, mas os testes não ficam verdes, por uma causa fora da
tarefa. A tabela `two_factor` criada na T04 não tem as três colunas que o plugin `twoFactor` do Better Auth 1.7.6
exige: `verified`, `failedVerificationCount` e `lockedUntil`. Na primeira chamada ao banco, o Better Auth confere o
esquema do Drizzle e para com `BetterAuthError: Drizzle schema mismatch`. Pôr as colunas pede uma migration, e
migration é só do `engenheiro-dados-bd` (G1 do plano): não está na minha lista **Pode**. A interface que a T08 consome
(a tabela `two_factor` da T04) está errada para a versão instalada, então devolvo para a `05-plano`.

Para ver se o resto da T08 funciona, fiz uma sonda temporária: as três colunas no esquema Drizzle e um `ALTER TABLE`
pelo migrator no banco descartável do Testcontainers. Com ela, a suíte inteira passou (615 de 615), lint e typecheck
limpos. Depois desfiz a sonda: `src/db/schema/acesso.ts` está igual ao commit (o `git status` não o lista) e o teste
não tem mais o `ALTER`.

### Correção sugerida para o plano (dados-bd, antes de a T08 voltar)

Uma migration por `pnpm db:generate`, com as três colunas em `two_factor` e os mesmos campos em
`src/db/schema/acesso.ts`. Estes tipos foram os da sonda que passou (`/two-factor/enable` gravou e leu a linha):

| Campo no Drizzle | Coluna | Tipo da sonda |
|---|---|---|
| `verified` | `verified` | `boolean default true` |
| `failedVerificationCount` | `failed_verification_count` | `integer not null default 0` |
| `lockedUntil` | `locked_until` | `timestamptz` (`momento()`), nulo |

O `GRANT` de `two_factor` já é de tabela inteira (`SELECT, INSERT, UPDATE, DELETE`, `src/db/privilegios.ts`), então
a guarda de privilégios não precisa mudar. O teste de esquema de acesso da T04 provavelmente precisa da lista nova de
colunas. A conferência do Better Auth olha só o **nome** da coluna, não o tipo: com colunas `text` ela também passou.
Os tipos da tabela foram testados pela sonda, mas não estão confirmados no código da biblioteca. Não há
`node_modules` rastreado para ler, e o `npx auth generate` que a mensagem sugere não está na lista Pode.

### Arquivos (todos novos, todos da T08)

- `src/lib/env.ts`: `ConfigApp`, `lerConfigApp(env?)` e `ErroConfiguracao`. Os valores passam por Zod:
  - `BETTER_AUTH_SECRET` tem que ter 32 bytes ou mais (C-33);
  - `BETTER_AUTH_URL` só aceita `http` ou `https` e é guardada como origem;
  - `DATABASE_URL` é obrigatória;
  - `CABECALHO_IP_CLIENTE` tem padrão `x-real-ip`, vira minúsculas e só aceita nome de cabeçalho;
  - `RETENCAO_TEXTO_BRUTO_DIAS` é um inteiro de 1 a 365, com padrão 90 (C-31);
  - `producao` vale só com `NODE_ENV=production`.

  Variável vazia conta como ausente. O erro cita só os nomes das variáveis, nunca o valor, e não leva o `ZodError`
  junto.
- `src/modules/acesso/auth.ts`: `criarAuth({ db, config, relogio? })` e o tipo `Auth`. A configuração é a do plano
  (C-01, C-02, C-03, C-07, RNF-12), mais os desvios 3 e 4 abaixo.
- `src/app/api/auth/[...all]/route.ts`: `GET` e `POST` por `toNextJsHandler`. A instância nasce na primeira
  requisição, com `lerConfigApp()`, `criarPool` e `criarDb`. Importar o módulo, como faz o `next build`, não lê
  variável de ambiente. A T11 troca isso por `obterDeps().auth`.
- `src/lib/deps.ts`: só o tipo `Deps` de G5.
- `test/auth.ts`: `CONFIG_TESTE`, com segredo fictício de 48 caracteres, e `criarContaDeTeste(auth, { papel, email?,
  nome? })`. A conta é criada pelo `internalAdapter.createUser` e pelo `linkAccount`, com `password.hash`, usando uma
  senha aleatória de 24 caracteres e um e-mail `@exemplo.test`.
- `test/deps.ts`: `criarDepsDeTeste(banco, { relogio? })`. Monta `Deps` reais: o pool e o Drizzle do papel do app, a
  fila do pg-boss sobre o banco do teste, `criarAuth` com `CONFIG_TESTE` e um relógio fixo (`2026-10-22T12:00:00Z`
  quando nenhum é dado).

### Testes criados

- `src/lib/env.test.ts`, 9 testes:
  - C-33: segredo de 5 e de 31 bytes recusado, 32 aceito;
  - C-31: retenção de 0, 366, 400, 9.5 e "noventa" recusada; 1, 365 e o padrão 90 aceitos;
  - o erro cita o nome e não leva o sentinela, nem nas propriedades;
  - as três obrigatórias ausentes aparecem no erro;
  - os valores padrão;
  - URL fora de `http` ou `https` recusada, e URL com barra no fim vira origem;
  - `producao` só com `NODE_ENV=production`;
  - C-06: cabeçalho de IP em minúsculas, e nome inválido recusado;
  - sem argumento, a função lê `process.env`.
- `src/modules/acesso/auth.test.ts`, 14 testes:
  - C-01: o `sign-up/email` não cria usuário;
  - C-02: `papel` não muda por `update-user`; `desativadoEm` também não é campo de entrada;
  - C-03: só os plugins previstos, opções fechadas e `additionalFields` com `input: false`; o pedido de redefinição de
    senha não gera token em `verification`; com cookie de sessão, um POST de outra origem (com Fetch Metadata
    `cross-site`) responde 403 e não muda nada;
  - C-06 (base): limite ligado, 10 por minuto, IP só do cabeçalho configurado;
  - C-07: em produção o cookie é `__Secure-wsod.session_token`, com `HttpOnly`, `Secure` e `SameSite=Lax`, e a
    sessão é de 8 h fixa; no desenvolvimento é `wsod.session_token`, sem `Secure`;
  - C-33: `two_factor.secret` não contém o segredo base32 do `totpURI`, `backupCodes` não contém nenhum código em
    claro, o emissor é "WS Orquestrador de Demandas" e o 2FA não fica ativo sem verificação;
  - C-21: o logger do Better Auth sai pelo `log`, sem mensagem nem argumentos; um login que falha (e-mail inexistente
    ou senha errada) não deixa o sentinela no log nem no console, e nada vai ao console;
  - `criarContaDeTeste`: o papel, o hash da senha e a senha de 24 caracteres, com e sem e-mail e nome dados.
- `src/app/api/auth/[...all]/route.test.ts`, 2 testes: a rota importa sem variável de ambiente e expõe `GET` e `POST`;
  com segredo curto, a requisição falha citando `BETTER_AUTH_SECRET` e sem o valor.
- `test/deps.test.ts`, 2 testes: os `Deps` reais sobre o banco do teste, com uma fila que envia na transação, e o
  relógio fixo quando nenhum é dado.

### Teste antes do código (visto falhando)

`pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test`, antes de qualquer código da T08:

```
 FAIL  src/lib/env.test.ts [ src/lib/env.test.ts ]
Error: Cannot find module './env' imported from .../src/lib/env.test.ts
 FAIL  src/modules/acesso/auth.test.ts [ src/modules/acesso/auth.test.ts ]
Error: Cannot find module '../../../test/auth' imported from .../src/modules/acesso/auth.test.ts
 FAIL  test/deps.test.ts [ test/deps.test.ts ]
Error: Cannot find module './auth' imported from .../test/deps.test.ts
 FAIL  src/app/api/auth/[...all]/route.test.ts > ... > importa sem variável de ambiente e expõe GET e POST
Error: Cannot find module '/src/app/api/auth/[...all]/route' imported from ...
 Test Files  4 failed | 28 passed (32)
      Tests  2 failed | 588 passed (590)
```

Antes do logger, o teste de C-21 também falhou:
`TypeError: Cannot read properties of undefined (reading 'log')`, e o console recebeu `[Better Auth]: User not found`
e `[Better Auth]: Invalid password`.

### Resultado final (sem a sonda)

- `pnpm test`: 32 arquivos, 606 de 615 testes passaram e 9 falharam. Os 9 falham com `BetterAuthError: Drizzle schema
  mismatch — Missing columns twoFactor.verified, twoFactor.failedVerificationCount, twoFactor.lockedUntil`. São os
  testes de `auth.test.ts` que chamam o `handler`.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- Com a sonda das três colunas, a mesma suíte deu 615 de 615.

### Desvios do plano

1. `lerConfigApp(env: Record<string, string | undefined> = process.env)` em vez de `env?: NodeJS.ProcessEnv`. Com os
   tipos do Next, `NODE_ENV` é obrigatório no `ProcessEnv`, e o teste do plano não compilava. `process.env` continua
   aceito.
2. Os testes leem `auth.options` pelo tipo `BetterAuthOptions`. O tipo inferido só tem as chaves que a configuração
   escreveu, e `sendResetPassword` e `socialProviders` do teste do plano não compilavam.
3. `advanced.disableOriginCheck: false` e `disableCSRFCheck: false` estão explícitos. Sem eles, o Better Auth 1.7.6
   desliga a conferência de origem quando `NODE_ENV=test`. O POST de outra origem com cookie respondeu 200 até eu pôr
   as duas opções, e 403 depois.
4. `logger` do Better Auth ligado ao `log` (C-21). O logger padrão escreve no console a mensagem e os argumentos. Com
   a tabela incompleta, ele escreveu a consulta SQL com os parâmetros (o id do usuário) e a pilha. Agora só sai
   `{ evento: 'better_auth', erro: { classe, code } }`, e nada abaixo de `warn`. O plano punha "login que falha sem
   e-mail" na T09; isso já fica coberto aqui.
5. Em `criarContaDeTeste`, o `internalAdapter.createUser` do 1.7.6 exige um segundo argumento,
   `UserProvisioningSource` (`{ method: string }`). Passei `{ method: 'script' }`; a T32 deve usar o mesmo.
6. O teste C-01 filtra pelo e-mail em vez de esperar a tabela `user` vazia: outros testes do arquivo criam contas, e o
   teste não pode depender de ordem (RNF-15).
7. Testes a mais, além dos do plano: a rota, os `Deps`, a origem recusada, o C-33 de cifra (o plano cita C-33 na T08
   sem teste de cifra) e o C-21 do logger.

## Decisões tomadas

- Devolvido para a `05-plano`, e não para a própria etapa: o que falta é uma migration, fora da lista Pode, e a T08
  não fica verde sem ela, por mais tentativas que tenha.
- A sonda foi desfeita: deixar coluna no esquema Drizzle sem migration quebraria o banco real, e o arquivo é do
  `engenheiro-dados-bd`.
- O código e os testes da T08 ficam no repositório: já estão verdes com as três colunas, e a volta da T08 só precisa
  rodar a suíte.
- A instância do Better Auth nasce na primeira requisição: assim o `next build` não lê variável nem falha sem `.env`.
- `urlBase` é guardada como origem, para `baseURL`, `trustedOrigins` e o link do aviso (C-38) usarem o mesmo valor.
- O logger do Better Auth descarta mensagem e argumentos, e não só passa por filtro: a mensagem é texto livre da
  biblioteca e pode trazer e-mail.

## Pendências

- Causa: a tabela `two_factor` da T04 não tem as colunas `verified`, `failed_verification_count` e `locked_until`, que
  o plugin `twoFactor` do Better Auth 1.7.6 exige (`BetterAuthError: Drizzle schema mismatch`). A correção é uma
  migration do `engenheiro-dados-bd`, fora da lista Pode do backend. Sugestão: uma tarefa de dados-bd antes da volta
  da T08, com os tipos da tabela acima.
- Para o tech-lead (afeta a T09): o plugin 1.7.6 tem bloqueio próprio de verificação, com `failedVerificationCount` e
  `lockedUntil`. Isso se sobrepõe a C-06 e à tabela `bloqueio_verificacao`. Não conferi o limite nem a janela padrão
  do plugin. Vale decidir se a T09 usa o bloqueio do plugin, configurado para 5 falhas em 15 min, ou mantém a tabela
  própria.
- Para a T09: não conferi se o Better Auth aplica ao `/sign-in` uma regra de limite própria, mais estrita que 10 por
  minuto. O teste de C-06 ("11ª tentativa responde 429") vai mostrar.
- Para a T11 e a T13: os testes de C-15 dependem de `disableOriginCheck: false` explícito (desvio 3). Sem ele, com
  `NODE_ENV=test`, a conferência de origem do Better Auth fica desligada.
- Não subi o banco de desenvolvimento: os testes usam Testcontainers.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -25` — último commit 6d4aac3 (06-T07-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only 4b825dc642cb6eb9a060e54bd8604f9b0f2c2c3e HEAD` — `fatal: bad object` (não serviu para listar arquivos)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-status --format=%h -- src test scripts package.json vitest.config.ts tsconfig.json eslint.config.mjs` — arquivos das tarefas anteriores
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — falha esperada: 4 arquivos com módulo não encontrado; 2 de 590 testes falharam
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — erros: `ProcessEnv` sem `NODE_ENV`, chaves de `auth.options` e `createUser` com 2 argumentos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — `undefined` não aceito como `UserProvisioningSource`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — `string` não aceito como `UserProvisioningSource`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — falta a propriedade `method` em `UserProvisioningSource`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 8 de 613 falharam: `Drizzle schema mismatch` (3 colunas de `two_factor`)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — sonda com colunas `text` só no Drizzle: 2 de 613 falharam (`column "verified" does not exist`; origem)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — sonda com `ALTER` no banco do teste: 1 de 613 falhou (origem com cookie respondeu 200)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — com Fetch Metadata `cross-site`: 1 de 613 falhou (ainda 200)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — com `disableOriginCheck: false`: 613 de 613 (com a sonda)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — testes novos do logger: 2 de 615 falharam (esperado)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — com o logger: 615 de 615 (com a sonda)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — só arquivos novos da T08; `src/db/schema/acesso.ts` sem mudança depois de desfeita a sonda
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — estado final, sem a sonda: 9 de 615 falharam (`Drizzle schema mismatch`)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [ ] `pnpm test` passa (9 de 615 falham por falta das três colunas em `two_factor`; com elas, 615 de 615)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
