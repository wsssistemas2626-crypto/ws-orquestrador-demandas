---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T07-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G5 e T07), 06-T07-engenheiro-backend.md, commit 9619e11, commit 59998da, src/lib/fila.ts, src/lib/fila.test.ts, src/lib/log.ts, scripts/migrate.ts, src/db/privilegios.ts, src/db/privilegios.test.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T07 (Fila pg-boss com esquema pelo migrator e envio na transação), sobre os commits 9619e11 (código e
primeira entrega) e 59998da (entrega regravada, sem o comando fora da lista Pode; nenhum código mudou nele).

### Escopo e arquivos

Mudaram só os arquivos da T07: `src/lib/fila.ts` e `src/lib/fila.test.ts` (criados), `scripts/migrate.ts` e
`src/db/privilegios.test.ts` (modificados), além da entrega e do `passagens.jsonl`. As interfaces produzidas batem
com as do plano (`FILAS`, `NomeFila`, `PayloadDe`, `Fila`, `criarFila`, `instalarFilas`); `OpcoesEnvio` é só o tipo
nomeado do `op` que o plano já trazia.

### Conferências da T-02

| Conferência | Resultado verificado | Parecer |
|---|---|---|
| `migrate: false` | `criarFila` sobe com o papel do app sobre o esquema do migrator; o app segue sem `CREATE` em nenhum esquema | Conforme o plano |
| `db` no `send` | Teste de rollback e commit com o executor da transação (ADR-06) | Conforme o plano |
| `singletonKey` | Padrão e `singleton` não descartam; `stately` descarta (um na fila e um ativo por chave) sem serializar chaves diferentes | Desvio aceito, abaixo |
| `work` sem DDL | Worker com o papel do app processa o job; nada voltou ao 05-plano | Conforme o plano |

### Desvios do plano

1. `policy: 'stately'` em `agente.executar`: aceito. O plano dava `singleton` e, se nem assim, só a reivindicação
   da T27. A entrega mostra a `singleton` falhando, e a `stately` atende a ADR-07 melhor que a saída final do plano:
   descarta a tentativa repetida enquanto está na fila e não põe os quatro agentes em fila única. O teste
   `stately: chaves diferentes ficam ativas...` fixa os dois lados. A brecha que sobra (com a chave já ativa, entra
   mais um na fila) está nas Pendências do engenheiro para a T27, que já tem a reivindicação como garantia final.
2. `createQueue` só para fila que falta: aceito. Rodar o migrate de novo fica sem depender de `createQueue` aceitar
   fila repetida, e o teste `instalarFilas de novo...` cobre isso.
3. Ouvinte de `error` nos dois `PgBoss`: aceito. Sem ele o `EventEmitter` derruba o processo; o log passa pela lista
   de permissão, e `erro` sai como `{ classe, code }` (`src/lib/log.ts:52`).
4. Testes a mais em `fila.test.ts` e no bloco `esquema pgboss` de `privilegios.test.ts`: aceitos, porque fixam o que
   a T-02 conferiu e a C-34 no esquema novo.

### Checklist da seção 12

- [x] Faz o que o plano pede; os desvios estão registrados e justificados; nenhum arquivo de fora mudou.
- [x] Há teste para cada comportamento novo, visto falhando antes do código (`Cannot find module './fila'`,
  `schema "pgboss" does not exist`, 9 de 557). Se `migrar` não chamasse `instalarFilas`, o teste
  `as quatro filas existem` falharia, porque o banco modelo dos testes nasce do mesmo `migrar`.
- [x] Sem segredo nem dado pessoal: uuid fictício, ids `DEM-20261022-*`, sentinela `SENTINELA-TEXTO`.
- [x] Entrada validada com Zod: `z.strictObject` por fila, e o valor validado é o que vai ao `send` (C-22).
- [x] Banco: o esquema `pgboss` é instalado com o papel migrator; o app recebe só DML, `USAGE` e `EXECUTE`. O bloco
  novo da guarda confere o dono, a ausência de `CREATE`, o DML exato por tabela, `PUBLIC` sem privilégio e cinco DDL
  recusados com 42501 (C-34). Sem `tenant_id`, então sem RLS.
- [x] Nada duplica função que já existe. A única repetição é uma constante (parecer 1), Minor, que vai para
  Pendências pelo item seguinte.
- [x] Interface: não se aplica (sem tela).
- [x] Os Minor vão para Pendências; nenhum Critical nem Important.
- [x] `/code-review` e `/security-review` do PR: não se aplicam aqui; são da `08-revisao`.

`pnpm test` (566 de 566), `pnpm lint` e `pnpm typecheck` verdes, rodados nesta revisão.

### Pareceres

Todos Minor. Nenhum impede a passagem.

1. **`src/lib/fila.ts:34`**, `const PAPEL_APP = 'orquestrador_app'`. **Problema:** repete a constante que
   `src/db/privilegios.ts:3` já exporta. **Razão:** a guarda da C-34 tem uma fonte só para o nome do papel; se o
   nome mudar lá, os `GRANT` do pg-boss seguem com o antigo. O caminho é importar `PAPEL_APP` de
   `../db/privilegios`.
2. **`src/lib/fila.test.ts:26`**, `has_schema_privilege('orquestrador_app', ...)` com o nome escrito no SQL.
   **Problema:** o mesmo nome fixo, agora no teste. **Razão:** a mesma do parecer 1; o caminho é passar `PAPEL_APP`
   como parâmetro, como já faz `privilegios.test.ts`.
3. **`src/lib/fila.test.ts:25`**, teste `o app sobe com migrate: false...`. **Problema:** ele confere só a falta de
   `CREATE`. Se alguém tirar o `migrate: false` de `criarFila`, o teste continua passando, porque, com o esquema já
   na versão atual, o pg-boss não tenta DDL. **Razão:** o nome promete mais do que o teste prova. O trecho veio do
   próprio plano, por isso fica como Minor. Fecha com uma conferência estática da opção, ou com um esquema em versão
   antiga em que o `start` do app tenha de falhar.
4. **`src/lib/fila.test.ts:99`**, teste `um worker com o papel do app processa o job`. **Problema:** depende do job
   que o teste `send com o executor...` (linha 41) deixou na fila. O `fetch` da linha 75 também pega jobs dos testes
   anteriores. **Razão:** a seção 7 do padrão diz que teste não depende de ordem. O desenho também veio do plano.
   O caminho é cada teste enviar o seu próprio job.
5. **`src/lib/fila.ts:60`**, `ouvirErros`. **Problema:** comportamento novo sem teste que o exercite. **Razão:**
   ninguém confere que o `error` emitido é logado e não derruba o processo. Cabe na T34 (sentinelas no log) ou num
   teste curto que emita `error` no `boss` com um destino substituído (`substituirDestinoDoLog`).

## Decisões tomadas

- `stately` aceita no lugar de `singleton`: o teste mostra que só ela descarta a chave repetida e que não serializa os
  agentes; a T27 continua com a garantia final.
- Pareceres 1 a 5 classificados como Minor: nenhum muda comportamento hoje, e os pareceres 3 e 4 repetem um desenho
  que o próprio plano deu.
- Status `pronto`: o checklist da seção 12 manda o Minor para Pendências, e só Critical e Important bloqueiam.

## Pendências

- Pareceres 1 e 2 (nome do papel duplicado): corrigir na próxima tarefa do `engenheiro-backend` que tocar
  `src/lib/fila.ts` (T29 é a primeira que já prevê isso).
- Parecer 3 (`migrate: false` sem prova direta): fechar junto com a T34, que cobre o esquema do pg-boss.
- Parecer 4 (ordem dos testes da fila): ajustar no mesmo momento do parecer 1.
- Parecer 5 (ouvinte de `error` sem teste): T34.
- As pendências do engenheiro seguem valendo. T27: a reivindicação tem que barrar o segundo job da mesma chave
  quando o primeiro já está ativo. T29: `supervise` e `schedule` com o papel do app sem DDL, ou a tarefa volta ao
  05-plano. Mudar a política de uma fila que já existe pede um passo de migração próprio.
- Para a T28: com `stately`, enviar a `agente.executar` sem `singletonKey` deixa no máximo um job na fila inteira
  sem chave. Todo envio a essa fila precisa levar a chave por tentativa (ADR-07).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 59998da8ad9bca066a95ff33400cf72dbca8082f` — só a entrega e o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 9619e11` — 4 arquivos de código e a entrega
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 9619e11 -- scripts/migrate.ts src/db/privilegios.test.ts src/lib/fila.test.ts src/lib/fila.ts` — diff do código da T07
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 59998da8ad9bca066a95ff33400cf72dbca8082f` — só remove da entrega o comando com pipe
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, ramo `construcao/DEC-DEM-20261022-0001-v1`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 27 arquivos, 566 de 566
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
