---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T07-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T07), 01-analista-requisitos.md (RF-16 RF-25 e RNF), 05-tech-lead.md, 06-T07-engenheiro-backend.md, 06-T07-tech-lead.md, commit 9619e11, commit 59998da, src/lib/fila.ts, src/lib/fila.test.ts, src/lib/log.ts, src/lib/reduzir-erro.ts, src/db/transacao.ts, src/db/privilegios.test.ts, scripts/migrate.ts, scripts/migrate.test.ts, test/banco.ts, test/setup-global.ts, vitest.config.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verificação da T07 (Fila pg-boss com esquema pelo migrator e envio na transação). O código está no commit 9619e11; o
59998da só regrava a entrega. A T07 não cita CA de `01-analista-requisitos.md`. Os critérios dela são os itens de
"Cobre" do plano (ADR-04, ADR-06, ADR-07, T-02, parte de C-22 e de C-34), as quatro conferências da T-02 e as opções
das filas do passo 3. CA-16.4 e CA-25.2 (sem execução nem aviso duplicado) dependem da T07 só no nível da fila: a
cobertura inteira fica com a T27 e a T30.

### Critério → teste

| Critério da T07 | Teste que cobre (arquivo › nome) |
|---|---|
| T-02 (1): o app sobe com `migrate: false` e sem DDL | `src/lib/fila.test.ts` › `o app sobe com migrate: false e não tem CREATE no esquema pgboss`; **novo** `src/lib/fila-sonda.test.ts` › `com o esquema pgboss numa versão anterior, criarFila recusa sem tentar DDL; sem a opção, o pg-boss tentaria migrar e o banco recusaria (42501)` |
| T-02 (2) e ADR-06: `send` pelo executor da transação | `fila.test.ts` › `send com o executor da transação desfaz junto com ela (ADR-06)`; **novo** `fila-sonda.test.ts` › `o job só aparece para outra conexão depois do commit` |
| T-02 (3) e ADR-07: `singletonKey` por tentativa | `fila.test.ts` › `singletonKey repetida é descartada; a da próxima tentativa entra (ADR-07)`, `agente.executar usa a política stately; as outras filas, a padrão`, `stately: chaves diferentes ficam ativas ao mesmo tempo, e com a chave já ativa entra no máximo mais uma na fila` |
| T-02 (4): `work` com o papel do app, sem DDL | `fila.test.ts` › `um worker com o papel do app processa o job` (ajustado nesta etapa, abaixo) |
| ADR-04: esquema e filas pelo migrator, no mesmo Postgres | `fila.test.ts` › `as quatro filas existem, criadas pelo migrator`, `instalarFilas de novo, num banco já instalado, não falha nem duplica fila` |
| C-22: payload só com ids, conferido antes do banco | `fila.test.ts` › `payload fora do formato da fila é recusado antes de ir ao banco (C-22)`; **novos** `fila-sonda.test.ts` › `%s: recusado` (12 casos) e `%s: aceito, pelo executor da transação, e gravado igual ao enviado` (4 casos) |
| C-34: sem DDL do app no esquema `pgboss` | `src/db/privilegios.test.ts` › bloco `esquema pgboss: criado pelo migrator, usado pelo app sem DDL (T07, C-34)` (10 testes) e `o app tem USAGE só em public, drizzle e pgboss (T07), e CREATE em nenhum esquema nem no banco` |
| Opções das filas (passo 3; P1-e) | **novos** `fila-sonda.test.ts` › `agente.executar: sem retry do pg-boss (a nova tentativa é da execução, T27) e expira em 180 s`, `aviso.dec-pronto: 2 novas tentativas, a partir de 60 s, com espera crescente` |
| Desvio 3: ouvinte de `error` | **novos** `fila-sonda.test.ts` › `erro emitido pelo pg-boss não derruba o processo e vai ao log só com classe e código`, `controle: um PgBoss sem ouvinte lança o erro emitido (é o que derrubaria o processo)` |

### Testes acrescentados: `src/lib/fila-sonda.test.ts` (22 testes, banco próprio)

- **Payload por fila (C-22), 12 recusas.** Cada caso usa um executor falso com `vi.fn` e confere duas coisas: a recusa
  é um `ZodError` e o executor não foi chamado. Isso prova que a recusa vem antes do banco, e não do rollback. Casos:
  uuid inválido, `execucaoId` ausente, `demandaId` e texto a mais em `agente.executar`; id de ESP, sufixo
  `' or 1=1`, `\n` no fim, versão com cinco dígitos, e-mail a mais e `null` em `aviso.dec-pronto`; qualquer chave
  em `retencao.expurgo` e `worker.batimento`.
- **4 aceites, como controle.** O executor real é espionado: ele é chamado e o job fica gravado com o payload igual ao
  enviado. Um dos casos é o limite `v9999`.
- **ADR-06 antes do commit.** Dentro da transação, outra conexão não vê o job. Depois do commit, vê.
- **Opções das filas.** `agente.executar` em `stately`, com `retryLimit 0` e `expireInSeconds 180`. `aviso.dec-pronto`
  em `standard`, com `retryLimit 2`, `retryDelay 60` e `retryBackoff true`.
- **`migrate: false`, com prova direta (fecha o parecer 3 da revisão).** Num segundo banco, a versão do `pgboss.version`
  é rebaixada de 42 para 41. Com a opção, `criarFila` falha com `pg-boss database requires migrations`, sem `code` do
  Postgres. Sem a opção, o mesmo papel tenta migrar e recebe `42501` (`permission denied for schema pgboss`). Nos dois
  casos a versão continua 41. Se alguém tirar `migrate: false` de `criarFila`, o teste passa a receber `42501` e falha.
- **Ouvinte de `error` (fecha o parecer 5 na parte do `criarFila`).** O teste emite um erro com mensagem e `detail`
  sentinela. `emit` devolve `true` e sai uma linha `warn` (`level 40`), `fila_erro`, `{ classe: 'Error', code: '57P01' }`,
  sem nenhum `SENTINELA`. O controle confirma que um `PgBoss` sem ouvinte lança o erro: o pg-boss não registra ouvinte
  próprio, e por isso o desvio 3 é necessário.

### Teste ajustado (parecer 4 da revisão)

`fila.test.ts` › `um worker com o papel do app processa o job` dependia do job que o teste do ADR-06 deixava em
`aviso.dec-pronto`. Rodado antes dele, falharia. Agora ele envia o próprio job a `worker.batimento`, fila que nenhum
outro teste do arquivo usa, e espera esse id ser processado e chegar a `completed`. A asserção ficou mais forte: antes,
qualquer job com aquele `decId` servia. Agora vale o id exato, mais o estado final. Rodei o arquivo três vezes com
`describe.shuffle` (posto e tirado nesta etapa, fora do diff final), e as três passaram.

### Resultado

- `pnpm test`: 28 arquivos, 588 de 588 (eram 566; +22 do arquivo novo).
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git diff`: só `src/lib/fila.test.ts` (o teste do worker), e um arquivo novo, `src/lib/fila-sonda.test.ts`. Nenhum
  teste apagado, nenhum `.skip`, `.only` ou `.todo`, nenhuma asserção afrouxada.

## Decisões tomadas

- Arquivo próprio para os testes novos: o de `migrate: false` exige um banco com a versão do esquema rebaixada, e o
  arquivo separado não mexe no estado de `fila.test.ts`.
- Executor falso com `vi.fn` nas recusas: o teste do engenheiro só via a sentinela fora de `pgboss.job`, e isso também
  aconteceria se o job fosse enviado e depois desfeito. O espião prova que o banco nem é tocado.
- Controle negativo junto de cada sonda (`sem a opção → 42501`, `sem ouvinte → lança`): se o pg-boss mudar de
  comportamento numa atualização, o teste avisa, em vez de passar sem provar nada.
- Teste do worker movido para `worker.batimento`: é a única forma de deixá-lo independente sem mexer na asserção exata
  (`toEqual` de um job só) do teste do ADR-06.
- Status `pronto`: todos os critérios da T07 têm teste e a suíte está verde. Nenhum teste do engenheiro está errado ou
  instável a ponto de devolver: o único com dependência de ordem foi corrigido aqui, dentro de `*.test.ts`.

## Pendências

- Pareceres 1 e 2 da revisão seguem com o `engenheiro-backend`: o nome `orquestrador_app` aparece fixo em
  `src/lib/fila.ts:34` e em `fila.test.ts` (`has_schema_privilege('orquestrador_app', ...)`). Não mexi no teste, para o
  ajuste sair junto com o do código.
- Parecer 5, parte que sobra: o ouvinte de `error` do `PgBoss` de `instalarFilas` não tem como ser alcançado por teste
  sem mudar o código, porque a instância não sai da função. Ele é idêntico ao do `criarFila` (mesmo `ouvirErros`), que
  agora está coberto.
- Informação para a T29 e a T31: `retencao.expurgo` e `worker.batimento` usam o padrão do pg-boss 12.34.0, que dá
  `retryLimit 2`, `retryDelay 0`, `expireInSeconds 900` e `deleteAfterSeconds 604800`. A sonda mostrou também que as
  quatro filas usam a tabela comum `job_common` (`partition: false`), sem tabela própria por fila.
- CA-16.4 (um RSK só com o job duplicado) e CA-25.2 (um e-mail só com o aviso duplicado) ainda precisam de teste na T27
  e na T30. A T07 só garante o descarte da chave repetida na fila.
- Não subi o banco de desenvolvimento: os testes usam Testcontainers.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 9619e11` — 4 arquivos de código, a entrega e o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 59998da8ad9bca066a95ff33400cf72dbca8082f` — só a entrega e o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 9619e11 -- scripts/migrate.ts src/db/privilegios.test.ts src/lib/fila.test.ts src/lib/fila.ts` — diff do código da T07
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — último commit af6c6f7 (06-T07-revisao)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 8a77563 af6c6f7` — só o `passagens.jsonl` e a revisão do tech-lead
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — antes das mudanças: 27 arquivos, 566 de 566
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/fila-sonda.test.ts` — sonda do comportamento do pg-boss (falha esperada, que mostrou as opções das filas e os dois resultados de `start`)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/fila-sonda.test.ts` — 22 de 22
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/fila-sonda.test.ts` — 22 de 22 (de novo, para ver a duração)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/fila.test.ts` — com `describe.shuffle` provisório: 9 de 9
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/fila.test.ts` — com `describe.shuffle` provisório: 9 de 9
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/fila.test.ts` — com `describe.shuffle` provisório: 9 de 9
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 28 arquivos, 588 de 588
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — só o teste do worker em `src/lib/fila.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — `src/lib/fila.test.ts` modificado e `src/lib/fila-sonda.test.ts` novo

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
