---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T13-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T09 a T14), 04-seguranca-aplicacao.md (seções 1 a 5), 06-T11-engenheiro-backend.md, 06-T11-tech-lead.md, 06-T12-tech-lead.md, test/requisicao.ts, test/sessao.ts, test/deps.ts, test/banco.ts, test/auth.ts, test/estatico/eslint.test.ts, test/estatico/projeto.test.ts, src/lib/rota.ts, src/lib/rota.test.ts (início), src/lib/deps.ts, src/lib/env.ts, src/lib/erros.ts, src/lib/log.ts, src/lib/relogio.ts, src/db/transacao.ts, src/db/schema/acesso.ts, src/modules/acesso/matriz.ts, src/modules/acesso/ator.ts, src/modules/acesso/tokens-servico.ts, src/modules/acesso/resolver-ator.ts, vitest.config.ts, eslint.config.mjs, package.json]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T13: testes estáticos e o teste que percorre a matriz de acesso em todas as rotas. Cobre:
- C-04 (b), pelo teste estático;
- C-04 (a), C-10 e C-12, pelo teste que percorre as rotas;
- C-17, pela varredura de `sql.raw`;
- C-27;
- G3.4;
- CA-01.3, CA-02.1 e CA-02.2, por construção, para toda rota futura;
- parecer 7 da `06-T11-revisao`: um parâmetro de caminho fora do formato responde 404 antes de autenticar.

### Arquivos

Criados:
- `test/estatico/exigir-pessoa.test.ts` (C-04 b). Varre `src/app`:
  - todo arquivo com `'use server'` chama `acaoDoPainel(` ou `exigirPessoa(`;
  - toda `page.tsx` de `src/app/(painel)` chama `exigirPessoaNaPagina(`;
  - toda `route.ts` da API, fora de `auth` e `saude`, usa `rota(`.
- `test/estatico/sql-raw.test.ts` (C-17): nenhum `sql.raw(` em `src/`. Pega também as formas com espaço.
- `test/estatico/variaveis.test.ts` (C-27):
  - `ANTHROPIC_API_KEY` só em `src/worker/`, `src/modules/agentes/provedor.ts` e `src/lib/env-worker.ts`;
  - `RESEND_API_KEY` só em `src/worker/`, `src/modules/avisos/enviador.ts` e `src/lib/env-worker.ts`;
  - `DATABASE_URL_MIGRATOR` só em `scripts/migrate.ts` e `scripts/start-hml.ts`.
- `test/estatico/relogio.test.ts` (G3.4): `new Date()` sem argumento e `Date.now()` só em `src/lib/relogio.ts`.
- `test/matriz-rotas.test.ts` (C-04 a, C-10, C-12). Para cada `route.ts` de `src/app/api`, fora de `auth` e `saude`, e
  para cada método exportado (`GET`, `POST`, `PATCH`, `PUT`, `DELETE`), confere seis coisas:
  - o método é função, veio de `rota()` (tem `meta.acao`) e a ação está na matriz;
  - `meta.rota` é o caminho do próprio arquivo;
  - cada ator que `atoresProibidos` lista recebe 403;
  - cada papel sem 2FA recebe 403;
  - a chamada sem credencial recebe 401;
  - na rota dinâmica, o parâmetro `x` recebe 404 antes de autenticar.

  Tokens e cookies são reais no banco do Testcontainers. O bloco "verificador" roda a mesma função de conferência sobre
  handlers sintéticos de `rota()`, um `GET` e um `POST` para cada uma das 19 ações. Nesses handlers, os atores
  permitidos chegam à função, com 200 ou 201. Quatro casos provam que a conferência recusa o handler errado:
  - um método solto, que não veio de `rota()`;
  - um `meta.rota` diferente do caminho do arquivo;
  - uma rota dinâmica sem `params`, que responde 401 em vez de 404;
  - um handler com o `meta` de `registrar_decisao` que autoriza como leitura e deixa o agente passar.

Modificados:
- `test/requisicao.ts`. Ganhou:
  - `METODOS` e os tipos `Metodo`, `AtorDeTeste` e `Credenciais`;
  - `prepararCredenciais(deps)`, com um token de serviço por agente e, por papel, uma sessão com 2FA e outra sem;
  - `padraoDaRota(arquivo)`, que tira o grupo de rota;
  - `chamarComo`, `chamarSemCredencial` e `chamarComParametroInvalido`.

  Os parâmetros saem de `meta.exemplo`. Os métodos que mudam estado mandam corpo `{}` em JSON, com a origem certa.
- `src/lib/deps.ts`: só o comentário do topo. Ele citava o nome `DATABASE_URL_MIGRATOR` e passou a dizer "a URL do
  migrator". O código não mudou.
- `src/db/schema/acesso.ts`: só o comentário do topo. Ele citava `new Date()` e passou a dizer "tira a hora do processo".
  O esquema não mudou, e não há migration.

Nesta tarefa, as únicas rotas da API são `/api/auth` e `/api/saude`, as duas públicas. Por isso o laço sobre as rotas
reais não tem casos ainda, e o verificador prova a conferência. A partir da T16, cada `route.ts` nova entra no laço sem
mudar o teste.

### TDD: vermelho antes do código

Primeiro escrevi os cinco testes, sem as funções novas em `test/requisicao.ts` e sem mexer nos comentários:

```
$ vitest run test/estatico test/matriz-rotas.test.ts
 ❯ test/estatico/variaveis.test.ts (3 tests | 1 failed)
   × variáveis de segredo só nos arquivos permitidos
 ❯ test/estatico/relogio.test.ts (3 tests | 1 failed)
   × new Date() sem argumento e Date.now() só em src/lib/relogio.ts
 ❯ test/matriz-rotas.test.ts (22 tests | 22 skipped)
 FAIL  test/matriz-rotas.test.ts [ test/matriz-rotas.test.ts ]
TypeError: prepararCredenciais is not a function
 FAIL  test/estatico/relogio.test.ts > new Date() sem argumento e Date.now() só em src/lib/relogio.ts
AssertionError: src/db/schema/acesso.ts: expected '// Tabelas de acesso: as cinco do Bet…' not to match /\bnew\s+Date\s*\(\s*\)|\bDate\s*\.\s*…/
 FAIL  test/estatico/variaveis.test.ts > variáveis de segredo só nos arquivos permitidos
AssertionError: DATABASE_URL_MIGRATOR em src/lib/deps.ts: expected 'src/lib/deps.ts' to match /^scripts\/(migrate|start-hml)\.ts$/
 Test Files  3 failed | 5 passed (8)
      Tests  2 failed | 28 passed | 22 skipped (52)
```

Os estáticos acusaram dois comentários, e o teste da matriz acusou a falta de `prepararCredenciais`. Depois disso
mudei três coisas:
- implementei `test/requisicao.ts`;
- corrigi os dois comentários;
- passei os estáticos a juntar todos os arquivos que violam a regra numa lista só, em vez de parar no primeiro.

### Resultado

- `pnpm test` (suíte inteira): 70 arquivos, 1086 de 1086, nenhuma falha. A T13 soma 5 arquivos e 37 testes:
  - `exigir-pessoa`: 4;
  - `sql-raw`: 2;
  - `variaveis`: 3;
  - `relogio`: 3;
  - `matriz-rotas`: 25, que são a varredura, 19 ações sintéticas, 4 recusas e o padrão da rota.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.

As linhas `better_auth` e `login_falhou` na saída da suíte são as mesmas da linha de base: vêm dos logins errados de
propósito da T08 e da T09. O teste da matriz captura a própria saída do log.

### Desvios do plano, com a razão

1. **`test/estatico/eslint.test.ts` não foi criado de novo.** O arquivo já existe desde a `06-T01-testes`. Ele roda o
   ESLint de verdade sobre código com `dangerouslySetInnerHTML` e com `console.log`, e confere que os dois são erro. A
   verificação é mais forte que o `calculateConfigForFile` do plano. Reescrever o arquivo duplicaria o que já existe.
2. **`chamarComo(h, metodo, ator, cred)`, com as credenciais no quarto argumento.** O plano escreve
   `chamarComo(h, metodo, proibido)`. As credenciais são criadas no `beforeAll`, com o banco do teste. Passar as
   credenciais no argumento evita estado global de módulo em `test/requisicao.ts`.
3. **Mais conferências que as do plano no teste da matriz.** Entraram três:
   - `meta.rota` igual ao caminho do arquivo. Sem essa conferência, um `meta.rota` errado levaria a um exemplo de
     parâmetros errado e a um 404 enganoso, ou faria o teste de 404 ser pulado;
   - o 404 do parâmetro fora do formato, pedido no parecer 7 da `06-T11-revisao`;
   - o 403 sem 2FA nos dois papéis. O plano testa só `cto`.
4. **O bloco "verificador".** O plano admite que o teste passe sem casos nesta tarefa. Só que um teste sem caso não
   mostra que a conferência funciona. Por isso a mesma função roda sobre handlers sintéticos, e há quatro handlers
   errados que ela precisa recusar.
5. **Os estáticos juntam a lista de violações.** O plano usa um `expect` por arquivo, que para no primeiro. A lista
   mostra todos os arquivos de uma vez. Cada estático também confere que a varredura enxerga arquivos conhecidos, para
   não passar à toa se o glob quebrar.
6. **Comentários mudados em `src/db/schema/acesso.ts` (arquivo da T04) e em `src/lib/deps.ts`.** O passo 3 do plano
   manda "corrigir o que os estáticos acusarem". Os dois casos eram comentários, e o código não mudou. A regra continua
   a valer também para comentário: assim o teste fica sem exceção, e os comentários citam a regra sem citar o nome.

## Decisões tomadas

- **Glob com `cwd` explícito (`node:fs` `globSync`).** O teste não depende da pasta de onde o Vitest é chamado.
- **A regra vale também em comentário, nos estáticos de variável e de relógio.** Separar comentário de código por regex
  é frágil, e abriria um jeito de esconder a chamada.
- **Na matriz, `autorizar` antes do Zod garante o 403 com corpo `{}`.** É a ordem do `rota()` da T11. O verificador
  prova isso para as 19 ações, em `GET` e em `POST`.
- **A saída do log fica com o teste da matriz** (`substituirDestinoDoLog`). São centenas de linhas `requisicao` por
  rodada, e a lista de campos já é testada em `rota.test.ts`.
- **Sem banco de desenvolvimento.** Tudo rodou no Testcontainers. O `docker-compose.dev.yml` não subiu.

## Pendências

- **T16 em diante:** cada `route.ts` nova precisa de três coisas para passar no laço:
  - ser exportada por `rota()`;
  - ter `meta.rota` igual ao caminho do arquivo;
  - ter `params` declarado quando a rota for dinâmica.

  Um nome de parâmetro fora de `id`, `espId`, `rskId`, `decId` e `agente` precisa de `exemplo` explícito em `rota()`.
  Sem ele, o exemplo vira `x` e a rota responde 404 em vez de 403.
- **T23, T25, T29 e T30:** os arquivos que podem citar as chaves são `src/worker/`, `src/modules/agentes/provedor.ts`,
  `src/modules/avisos/enviador.ts` e `src/lib/env-worker.ts`. Um nome diferente desses quebra o estático de C-27, e
  então a tarefa ajusta a lista com o tech-lead.
- **T33:** `scripts/start-hml.ts` é o único lugar, fora de `scripts/migrate.ts`, onde `DATABASE_URL_MIGRATOR` pode
  aparecer.
- **T36 em diante:** toda `page.tsx` nova em `src/app/(painel)` e toda Server Action entram nos estáticos de C-04 (b).
- **Fora da T13:** o aviso `[UNDICI-FETCH-patch]` na saída da suíte vem de algum teste anterior que usa o método
  `patch` em minúsculas. Não é desta tarefa, e não muda nenhum resultado.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -25` — topo em 2b8b7a2 (06-T12-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h --diff-filter=A` — arquivos criados em cada passagem
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico test/matriz-rotas.test.ts` — vermelho: 3 arquivos falharam e 2 testes falharam (`prepararCredenciais is not a function` e os dois comentários)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico test/matriz-rotas.test.ts` — ainda vermelho no estático do relógio, porque a correção do comentário de `acesso.ts` não tinha sido aplicada; o log das requisições encheu a saída, e daí veio o `substituirDestinoDoLog` no teste da matriz
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico test/matriz-rotas.test.ts` — verde: 8 arquivos, 52 de 52
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico test/matriz-rotas.test.ts` — verde depois de juntar a conferência numa função só: 8 arquivos, 55 de 55
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 70 arquivos, 1086 de 1086, nenhuma falha
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — 3 modificados e 5 novos, todos em `src/` e `test/`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — `src/db/schema/acesso.ts` (comentário), `src/lib/deps.ts` (comentário), `test/requisicao.ts` (+80 −1)

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
