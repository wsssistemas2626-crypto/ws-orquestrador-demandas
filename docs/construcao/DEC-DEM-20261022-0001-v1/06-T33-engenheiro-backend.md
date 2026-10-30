---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T33-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (início, G1 a G6, mapa das fases, T27 fim a T35), 02-arquiteto-solucoes.md (seções 1 e 2, ADR-04 fim a ADR-12, seção 11), 04-seguranca-aplicacao.md (início, 2.14 fim a 2.17, C-01 a C-40, seção 4, seções 5 e 6), 06-T32-engenheiro-backend.md, 06-T32-tech-lead.md, 06-T32-qa-automacao.md, scripts/criar-usuario.ts, scripts/criar-usuario.test.ts, scripts/desativar-conta.ts, scripts/lib/argumentos.ts, scripts/lib/saida.ts, scripts/migrate.ts, src/modules/acesso/tokens-servico.ts, src/modules/acesso/auth.ts, src/modules/acesso/ator.ts, src/modules/acesso/matriz.ts, src/modules/agentes/preco.ts, src/modules/agentes/executar.ts, src/modules/agentes/configuracao.ts (início), src/agents/index.ts, src/agents/comum.ts, src/agents/insumo-tecnico.ts, src/agents/risco.ts, src/agents/consolidacao.ts, src/modules/demandas/servico.ts, src/modules/demandas/schemas.ts, src/modules/demandas/transicoes.ts, src/modules/especificacoes/servico.ts, src/modules/especificacoes/schemas.ts, src/modules/pareceres-risco/servico.ts (início), src/modules/pacotes-decisao/criar.ts, src/modules/avisos/aviso-dec.ts, src/modules/historico/registrar.ts, src/modules/limites.ts, src/db/schema/acesso.ts, src/db/schema/agentes.ts, src/db/schema/demandas.ts, src/db/schema/versoes.ts, src/db/privilegios.ts, src/db/index.ts, src/db/transacao.ts, src/lib/env.ts, src/lib/deps.ts, src/lib/erros.ts, src/lib/log.ts, src/lib/fila.ts, src/lib/fuso.ts, test/deps.ts, test/banco.ts, test/auth.ts, test/sessao.ts, test/sentinelas.ts, test/setup-global.ts, test/estatico/variaveis.test.ts, test/estatico/relogio.test.ts, test/estatico/projeto.test.ts, test/estatico/preco-so-por-script.test.ts, vitest.config.ts, docker-compose.dev.yml, package.json, node_modules/better-auth/package.json (só o início, ver Pendências), saída do pnpm test gravada pela ferramenta (tool-results/bqln2dy5b.txt, só o fim)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T33: scripts de token de serviço, de preço por modelo, seed fictício e subida da homologação. Cobre RF-02 (token criado
por script e exibido uma vez), C-09 (evento com o prefixo), C-33 (segredo TOTP cifrado no seed), C-37, ADR-12
(`start:hml`) e a seção 9 do padrão técnico (seed na primeira subida). Esta é a primeira tentativa da etapa.

### Arquivos criados (os 7 do plano)

- `scripts/criar-token-servico.ts`. Uso: `pnpm tsx scripts/criar-token-servico.ts --agente orquestrador|insumo_tecnico|risco|consolidacao`.
  - `argumentosCriarToken = z.strictObject({ agente: z.enum(AGENTES) })`. `--token` e `--senha` não existem.
  - `criarTokenPorScript(deps, agente, saida)` devolve `{ prefixo }`. Valida o agente de novo. Numa transação, chama
    `criarTokenServico` (T10) e grava o evento `token_criado`: ator `sistema`, entidade `token_servico`, `entidadeId` =
    prefixo, `depois: { agente, prefixo }`.
  - O token é escrito **uma vez** na `saida`, depois do commit, na linha "Token, mostrado só esta vez". O log leva só
    `{ evento, atorTipo, agente }`.
  - `executarCriarToken(deps, argv, saida)` é o `main`, exportado para teste (pendência do `qa-automacao` na T32).
- `scripts/revogar-token-servico.ts`. Uso: `pnpm tsx scripts/revogar-token-servico.ts --prefixo <8 caracteres>`.
  - `argumentosRevogarToken`: prefixo com a regex do prefixo gravado (`^[A-Za-z0-9_-]{8}$`), conferida antes do banco.
  - `revogarTokenPorScript(deps, prefixo)` devolve `boolean`. Numa transação: `revogarTokenServico` (T10) e, só se
    revogou, o evento `token_revogado` (ator `sistema`, `depois: { prefixo }`).
  - Prefixo sem token ativo, ou revogação repetida, devolve `false`, sem evento.
  - `executarRevogarToken` sai com 0 quando revogou e com 1 quando não havia token ativo.
- `scripts/definir-preco-modelo.ts`. Uso: `pnpm tsx scripts/definir-preco-modelo.ts --modelo <id> --entradaPorMilhao <US$> --saidaPorMilhao <US$>`.
  - `definirPrecoModelo(deps, { modelo, entradaPorMilhao, saidaPorMilhao }, t?)` grava uma linha nova em
    `preco_modelo`, com `vigente_desde` do `Relogio` e moeda `USD`. A linha anterior fica.
  - O schema aceita preço de 0 a 999.999,999999, com até 6 casas (o `numeric(12, 6)`). O modelo tem de 1 a 100
    caracteres (o `LIMITE_MODELO` da configuração), só com letras, números, ponto, hífen, sublinhado e dois-pontos.
  - Na linha de comando, o valor é texto com ponto decimal (`3`, `0.25`). Vírgula, sinal e notação científica são
    recusados.
  - Dois preços do mesmo modelo no mesmo instante batem no `UNIQUE (modelo, vigente_desde)` e viram
    `ErroDominio('conflito')`.
  - `executarDefinirPreco` mostra o modelo, os dois valores em "US$ 0,25" e o início da vigência em horário de
    Brasília.
- `scripts/seed-ficticio.ts`.
  - `CONTAS_FICTICIAS`, com as quatro contas do plano: `cto@ficticio.test` e `administradora@ficticio.test`, com 2FA
    ativo; `sem2fa@ficticio.test` e `configurar2fa@ficticio.test`, papel `cto`, sem 2FA.
    - Cada conta traz `email`, `nome`, `papel` e `senha`. As duas com 2FA trazem também `segredoTotp`, o base32 que o
      e2e passa a `codigoTotp`.
    - As senhas têm 35 a 42 caracteres. Os segredos crus têm 32 caracteres, como os que o plugin gera.
  - `seedFicticio(deps, env)` devolve `'semeado' | 'recusado'`.
    - Só roda com `SEED_FICTICIO` exatamente `1` e com o banco sem demanda **e sem conta** (ver desvio 4).
    - Tudo numa transação, sob `pg_advisory_xact_lock`: duas subidas ao mesmo tempo semeiam uma vez só, e uma falha não
      deixa meio seed.
  - O que o seed cria:
    - As quatro contas, por `gravarConta`, o mesmo caminho do `criar-usuario` (parecer 3 da `06-T32-revisao`).
    - Para as duas com 2FA:
      - a linha de `two_factor` com o segredo cru e dez códigos de recuperação, cifrados pelo `symmetricEncrypt` do
        Better Auth com o segredo do `$context`;
      - `verified: true` e `two_factor_enabled = true`;
      - o evento `2fa_ativado` do sistema.
    - O preço de `modelo-ficticio` (3 e 15 por milhão), por `definirPrecoModelo` na mesma transação. Os quatro agentes
      continuam desligados.
    - Cinco demandas da conta `cto`, uma de cada tipo, com textos inventados.
    - Na demanda `bug`, a ESP, o RSK e o DEC gravados pelos serviços da API, com o ator agente de cada um
      (`insumo_tecnico`, `risco` e `consolidacao`). É o mesmo caminho do worker. Os dados são os `exemploSaida` dos
      prompts, passados pelos schemas da rota.
    - A demanda vai a `pronta_para_decisao`, e o aviso do DEC fica agendado (para a T43).
  - O log leva só `{ evento: 'seed_ficticio', status, quantidade, codigoErro }`.
  - `executarSeed` é o `main`. Não aceita argumento e sai com 0 quando semeou e com 1 quando recusou.
- `scripts/start-hml.ts`. `iniciarHomologacao(env, op?)` faz `migrar(DATABASE_URL_MIGRATOR)` → `seedFicticio` →
  `spawn('pnpm', ['start'])`.
  - O seed usa as dependências do app (`lerConfigApp`, pool, Better Auth e fila). Pool e fila fecham antes de o app
    subir.
  - O app filho recebe o ambiente **sem** `DATABASE_URL_MIGRATOR`, e o código de saída dele vira o do script.
    `SIGTERM` e `SIGINT` passam para o filho.
  - Falha na migração, na configuração ou no seed não sobe o app: o script sai com 1. A mensagem leva só a classe e o
    código do erro, ou o nome da variável, nunca a URL.
  - Na segunda subida, o seed recusa e o app sobe do mesmo jeito.
  - Os passos `migrar` e `iniciarApp` podem ser trocados no teste.
- `scripts/hml/criar-papeis.sql`: um `CREATE ROLE orquestrador_app LOGIN PASSWORD '<fictícia>' NOSUPERUSER NOCREATEDB
  NOCREATEROLE NOREPLICATION NOBYPASSRLS`, para o `docker-entrypoint-initdb.d` do `docker-compose.hml.yml` da 09.
- `scripts/scripts.test.ts`.

### Arquivos modificados

- `package.json`: `"start:hml": "tsx scripts/start-hml.ts"`, como o plano pede.
- `scripts/criar-usuario.ts`: extraída `gravarConta(tx, { usuarioId, nome, email, papel, hash }, relogio)`, que grava
  `user`, `account` e o evento `conta_criada`, com a conferência de e-mail repetido. `criarUsuario` passou a chamá-la.
  O comportamento não mudou: os 28 testes da T32 passam sem edição (ver desvio 1).

### Testes criados (24, em `scripts/scripts.test.ts`)

| Grupo | Testes | O que prova |
|---|---|---|
| Token de serviço | 6 | **Os 2 do plano:** o token (`wsod_` + 43 caracteres) sai uma vez na saída e nunca no pino; o prefixo é o dos 8 caracteres depois de `wsod_`; o banco tem só o hash; o evento `token_criado` é do sistema, com a hora do relógio injetado, `depois: { agente, prefixo }` e sem o token; o token vale como o agente (`validarTokenServico`). Revogar pelo prefixo grava `token_revogado` com o prefixo, e o token deixa de valer; o outro token do mesmo agente continua valendo; a repetição e o prefixo sem token devolvem `false`, sem segundo evento. **Mais:** prefixo fora do formato recusado antes do banco (inclusive `a' or '1`); C-37 com `--token` e `--senha` recusados sem o valor no erro e agente fora dos quatro recusado; agente inválido chamado direto não grava nada; o `main` de criar e de revogar, com 0 e 1 |
| Preço | 5 | **O do plano:** o preço novo vira a vigência mais nova, a anterior continua valendo para o instante dela, e há duas linhas em USD. **Mais:** dois preços no mesmo instante dão `conflito` e o primeiro fica; preço negativo, com 7 casas, de 1.000.000, `NaN`, modelo vazio ou com espaço recusados sem gravar; os argumentos `--entradaPorMilhao` e `--saidaPorMilhao` só com ponto decimal; o `main` mostra o modelo e os valores em "US$ 0,25" |
| Seed | 7 | **Os 2 do plano:** sem `SEED_FICTICIO=1` (vazio, `0`, `true` e ` 1`) → recusado sem criar nada; com uma demanda existente → recusado sem mudar nada. O seed cria as quatro contas `@ficticio.test` (duas com 2FA ativo e duas sem), quatro eventos `conta_criada` do sistema, o preço de `modelo-ficticio`, os agentes desligados, as cinco demandas (uma por tipo) e ESP, RSK e DEC de agente (`rascunho_agente = true`, autor `insumo_tecnico`, `risco` e `consolidacao`), com a demanda em `pronta_para_decisao`; a segunda chamada recusa. **Mais:** banco com conta e sem demanda → recusado; cto e administradora entram com a senha e o código TOTP calculado de `CONTAS_FICTICIAS.*.segredoTotp`, e `exigirPessoa` devolve a pessoa com o papel; sem2fa e configurar2fa entram sem pedir código e dão `sem_2fa`; C-33: o banco não guarda o segredo base32 em claro; as credenciais não têm `wsod_`; o log do seed não tem senha nem e-mail |
| `start:hml` | 4 | A ordem é migrar → semear → app, e o app recebe o ambiente sem `DATABASE_URL_MIGRATOR`; a segunda subida recusa o seed e sobe o app; com a migração de verdade (idempotente) o código do app volta; com a migração falhando, o app não sobe, o seed não roda e o erro não leva a senha da URL; sem `DATABASE_URL_MIGRATOR`, ou com `BETTER_AUTH_SECRET` curto, o script sai com 1 e cita só o nome da variável |
| `criar-papeis.sql` | 2 | O arquivo tem um comando só, o `CREATE ROLE` de `PAPEL_APP` com os atributos, sem `wsod_`. Rodado no Postgres do teste, com o papel renomeado e numa transação desfeita no fim, o papel nasce com login e sem `rolsuper`, `rolcreatedb`, `rolcreaterole`, `rolreplication` nem `rolbypassrls` |

Os testes rodam com banco real (Testcontainers), o papel do app, relógio fixo nos `Deps` e um banco novo para cada
cenário de seed. Os dados são fictícios: `@ficticio.test`, `@exemplo.test`, "Pessoa Ficticia" e as sentinelas de
`test/sentinelas.ts`. Os códigos TOTP são calculados pelo mesmo `Date` que o Better Auth confere, como em
`test/sessao.ts` e nos testes da T32.

### TDD: os testes foram escritos antes do código e vistos falhando

Comando: `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/scripts.test.ts`. Rodou antes de
qualquer código da tarefa. Trecho da saída:

```
 FAIL  scripts/scripts.test.ts [ scripts/scripts.test.ts ]
Error: Cannot find module './criar-token-servico' imported from /home/deploy/servidor/projetos/ws-orquestrador-demandas/scripts/scripts.test.ts
 Test Files  1 failed (1)
      Tests  no tests
```

### Resultado

- `scripts/scripts.test.ts`: 24 de 24.
- `pnpm test`: 138 arquivos e **2744 de 2744** (2720 antes, mais os 24), nenhum falhou. Nenhum teste que já existia
  mudou. O aviso do undici "Using `patch`" continua igual.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git status`:
  - os 7 arquivos novos do plano;
  - `package.json` (+1 linha);
  - `scripts/criar-usuario.ts` (+21 −15, a extração do desvio 1).

### Desvios do plano

1. **`scripts/criar-usuario.ts` mudou: `gravarConta` foi extraída.** É o parecer 3 da `06-T32-revisao`, que pede a
   extração como "Modificar" na T33. Assim o seed não cria uma terceira forma de gravar conta. O comportamento ficou
   igual, e os 28 testes da T32 passam sem edição.
2. **As funções recebem `Pick<Deps, ...>` e `Saida`, e não `Deps` e `Writable`.**
   - Token e preço usam `pool` e `relogio`, e o seed usa `DepsDoScript` com a `fila` opcional. Assim o `main` de cada
     script sobe sem pg-boss, pelo `rodarScript` da T32, o mesmo critério da T31 e da T32.
   - `Deps` continua aceito, e é o que os testes passam. `Saida` (`{ write }`) é o tipo da T32, e `process.stdout` cabe
     nele.
3. **`CONTAS_FICTICIAS` tem `nome` e `papel` a mais.** Os campos do plano (`email`, `senha` e `segredoTotp`) estão lá.
   `nome` e `papel` servem ao seed e ao e2e (o nome aparece na moldura do painel).
4. **O seed também recusa banco que já tem conta.** O 02 pede `SEED_FICTICIO=1` e banco sem demanda. Mas um banco real
   com contas e ainda sem demanda, com `SEED_FICTICIO=1` posto por engano, ganharia quatro contas de senha pública. A
   guarda a mais fecha esse caso, e a homologação não perde nada: a primeira subida acha o banco vazio. Coberto pelo
   teste "com conta já existente e nenhuma demanda → recusado".
5. **O `env` do seed e do `start:hml` é `Record<string, string | undefined>`, e não `NodeJS.ProcessEnv`.** O motivo é o
   mesmo do `lerConfigApp`: os tipos do Next tornam `NODE_ENV` obrigatório no `ProcessEnv`. `process.env` continua
   aceito.
6. **`definirPrecoModelo` aceita a transação de quem chama (`t?`), pela G3.8.** O seed grava o preço junto com o resto.
7. **O plano não define a entidade dos eventos de token.** Usei `entidade: 'token_servico'`, `entidadeId` = prefixo e
   ator `sistema`, porque `criarTokenServico` não devolve o id da linha e o prefixo é o que identifica o token no
   histórico e na revogação.
8. **O seed grava `2fa_ativado` do sistema para as duas contas com 2FA.** Sem esse evento, o histórico da conta ficaria
   sem a ativação. O evento leva só os booleanos, como os da T09.
9. **O `start:hml` tira `DATABASE_URL_MIGRATOR` do ambiente do app filho.** O plano só diz `spawn('pnpm', ['start'])`.
   Pela ADR-12, o processo que atende requisição não deve ter a credencial de DDL, nem na homologação.
10. **Os argumentos do preço são `--entradaPorMilhao` e `--saidaPorMilhao`, em camelCase.** Com hífen, o `deZod`
    troca o segmento por `*` (`SEGMENTO_SEGURO` de `erros.ts`), e o erro diria `--*` em vez do nome do argumento.
11. **`criar-papeis.sql` tem também `NOREPLICATION NOBYPASSRLS`.** Os dois já são o padrão do Postgres para papel novo.
    Escritos, eles deixam a regra de C-34 visível no arquivo.

## Decisões tomadas

- **O segredo TOTP fica cru no banco, cifrado, e o base32 vai a `CONTAS_FICTICIAS`.** Razão: é o formato que o plugin
  grava (o `totpURI` leva o base32 dos bytes do segredo). O teste de login com `codigoTotp(segredoTotp)` prova isso
  contra o Better Auth 1.7.6 instalado.
- **Cifragem pelo `symmetricEncrypt` de `better-auth/crypto`, com `(await auth.$context).secret`.** Razão: é a mesma
  chave que o plugin usa para ler, e com ela o seed não traz criptografia própria (C-33). O login com 2FA prova a
  leitura.
- **ESP, RSK e DEC do seed passam pelos serviços da API, com o ator agente.** Razão: é o caminho do worker (autorizar,
  limite, versão, evento, status e aviso). O dado nasce igual ao que um agente ligado gravaria. Os textos são os
  `exemploSaida` dos prompts, que já passam nos schemas.
- **O seed inteiro numa transação, sob trava consultiva.** Razão: duas subidas ao mesmo tempo não semeiam duas vezes, e
  uma falha no meio não deixa conta sem demanda.
- **O token sai na saída só depois do commit.** Razão: se a transação falhar, nenhum token aparece para uma linha que
  não existe. É a mesma regra da senha na T32.
- **O `main` de cada script novo é uma função exportada (`executar*`).** Razão: o `qa-automacao` pediu isso na T32
  (pendência do `desativar-conta`), e assim os códigos de saída têm teste.
- **O preço tem até 6 casas e no máximo 999.999,999999.** Razão: é o que cabe no `numeric(12, 6)` sem arredondar.
  Arredondar em silêncio mudaria o custo de toda chamada.

## Pendências

- **Leitura fora da lista Pode:** li o início de `node_modules/better-auth/package.json` (os `exports`), que o git não
  rastreia. Nada no código depende dessa leitura. O formato da cifragem e do segredo foi provado pelos testes de login
  com 2FA, como na T-02 da T07. Fica registrado para o maestro.
- **Para a 09 (`devops-sre`), no `docker-compose.hml.yml` e no `Dockerfile`:**
  - o `start:hml` roda `tsx` (devDependency) e chama `pnpm start`. A imagem da homologação precisa de `tsx` e do
    `pnpm` (corepack);
  - o `db` monta `scripts/hml/criar-papeis.sql` em `/docker-entrypoint-initdb.d/`;
  - o app da homologação recebe `DATABASE_URL` com o papel `orquestrador_app` e a senha fictícia do arquivo,
    `DATABASE_URL_MIGRATOR` com o dono do banco, `SEED_FICTICIO=1`, `BETTER_AUTH_SECRET` fictício de 32 bytes ou mais e
    `BETTER_AUTH_URL`;
  - o worker da homologação não recebe `DATABASE_URL_MIGRATOR`.
- **Para a T36, a T37 e a T43 (`engenheiro-frontend`):**
  - as contas do e2e vêm de `CONTAS_FICTICIAS`, em `scripts/seed-ficticio.ts`. O código TOTP sai de
    `codigoTotp(segredoTotp, ...)`, de `test/sessao.ts`;
  - no banco de desenvolvimento, o seed roda com `SEED_FICTICIO=1 pnpm tsx scripts/seed-ficticio.ts` num banco vazio.
    Por esse caminho não há fila, e o aviso do DEC fictício fica pendente sem job. Pelo `start:hml`, o job entra;
  - o DEC de agente da T43 é o da demanda `bug` "Pedidos do marketplace duplicados no ERP (fictício)", de nível `cto`.
- **Para a `10-documentacao`, no manual técnico e no `deploy.md`:**
  - os três comandos de uso. Eles exigem `DATABASE_URL`, `BETTER_AUTH_SECRET` e `BETTER_AUTH_URL`, como os da T32;
  - o token aparece uma vez e não é recuperável. Se for perdido, revoga-se pelo prefixo e cria-se outro;
  - o preço é em dólar com ponto decimal, e o preço novo vale a partir do instante em que é definido;
  - o seed só roda com `SEED_FICTICIO=1` e com o banco sem demanda e sem conta;
  - `start:hml` é só da homologação;
  - as contas `@ficticio.test` têm senha pública e nunca podem existir em produção;
  - a linha JSON do log aparece na mesma saída do token (parecer 4 da `06-T32-revisao`).
- **Ficou de fora, por ser de outra tarefa:**
  - o parecer 1 da `06-T32-revisao` (o comentário de `test/auth.ts`). Esta tarefa não toca `test/`, e o item segue para
    a T34. Depois desta tarefa, o comentário fica ainda mais impreciso, porque o seed também grava pelo `gravarConta`;
  - exportar o `main` do `desativar-conta.ts` (observação do `qa-automacao` na T32), porque o arquivo não é desta
    tarefa. Os scripts novos já exportam o deles.
- Seguem abertos, sem mudança:
  - os Minor 2 e 4 da `06-T32-revisao` (o 2 foi coberto pelo `qa-automacao`);
  - o `--__proto__` de `scripts/lib/argumentos.ts`, observado pelo `qa-automacao` na T32;
  - os Minor das revisões anteriores;
  - o aviso do undici "Using `patch`".

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -12` — topo 1de85d6 (06-T32-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format= --diff-filter=A -- src scripts test package.json drizzle` — lista dos arquivos de código e teste já criados
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/scripts.test.ts` — antes do código: o arquivo sem módulo, nenhum teste rodou
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/scripts.test.ts` — depois do código: 24 de 24
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — 6 erros de tipo no `spawn` de `start-hml.ts` (env sem `NODE_ENV`)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — 2 avisos de variável não usada (desestruturação para tirar a URL do migrator)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo, depois da correção
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo, depois da correção
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent=true --reporter=dot` — 138 arquivos, **2744 de 2744**
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 7 arquivos novos, `package.json` e `scripts/criar-usuario.ts` alterados
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — `package.json` (+1) e `scripts/criar-usuario.ts` (+21 −15)

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real. As senhas e os segredos TOTP de `CONTAS_FICTICIAS` e a senha do `criar-papeis.sql` são fictícios e públicos de propósito, sem o formato `wsod_`. Os testes conferem que o token, a senha e o e-mail não vão ao log nem ao evento, e que a senha da URL do migrator não vai à saída de erro
- [x] só mudaram os arquivos da tarefa (os 7 do plano e o `package.json`). A extração em `scripts/criar-usuario.ts` foi pedida pelo parecer 3 da `06-T32-revisao` para esta tarefa (desvio 1)
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno. Os argumentos dos quatro scripts passam por `z.strictObject`, e as funções validam de novo. O erro sai como mensagem pt-BR, como nome de variável ou como classe e código, sem a mensagem do Postgres nem a URL
