---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T47-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seções 5 e 12), tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T47 e T08), 06-T47-engenheiro-dados-bd.md, commit a93cd60, src/db/schema/acesso.ts, drizzle/0006_familiar_crusher_hogan.sql, drizzle/meta/_journal.json, drizzle/meta/0005_snapshot.json, drizzle/meta/0006_snapshot.json]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

### Parecer

Aprovada para `06-T47-testes`. Nenhum problema Critical ou Important. O commit `a93cd60` faz o que a T47 pede, nem
mais nem menos: o esquema, os três testes e o resultado do gerador batem com os passos 1, 3 e 4 do plano, linha a
linha. Os quatro achados abaixo são Minor ou só informativos e vão para Pendências.

### O que foi conferido

| Ponto | Resultado |
|---|---|
| Arquivos do commit | `src/db/schema/acesso.ts`, `src/db/schema/acesso.test.ts`, `drizzle/0006_familiar_crusher_hogan.sql`, `drizzle/meta/0006_snapshot.json`, `drizzle/meta/_journal.json`, mais a entrega e o `passagens.jsonl`. São os da seção Arquivos da T47. `src/db/privilegios.ts` não mudou, como o plano exige |
| Esquema (`acesso.ts:88-96`) | Igual ao passo 3: `verified boolean default true` (aceita nulo), `failedVerificationCount integer not null default 0`, `lockedUntil momento()` sem padrão (G3.4), `check` `>= 0` e o índice `two_factor_user_id_idx` mantido. `boolean`, `integer`, `check` e `sql` já estavam importados (linhas 5 e 6) |
| Migration 0006 | Só os três `ADD COLUMN` em `two_factor` e o `ADD CONSTRAINT ... CHECK`, que é a condição do passo 4. Nenhuma outra tabela foi tocada, não há migration custom e nenhuma migration já commitada foi editada (G3.12) |
| Snapshot 0006 contra o 0005 | `git diff --no-index`: a única mudança de conteúdo está em `public.two_factor` (as três colunas e o `checkConstraints`). O resto é só a ordem das chaves, que o drizzle-kit regrava. O `prevId` do 0006 é o `id` do 0005, então a cadeia não quebra |
| Journal | Entrada `idx 6`, `tag 0006_familiar_crusher_hogan`, `breakpoints: true`, escrita pelo gerador |
| Testes (`acesso.test.ts:163-195`) | Os três do passo 1, sem alteração. Cobrem os tipos, a nulidade e o padrão pelo `information_schema`, com o migrator; o `INSERT` do papel da aplicação sem as colunas novas; e a gravação de falha e bloqueio pelo app, com a recusa `23514` e o nome da constraint. Sem as colunas, os três falham (a entrega mostra `column "verified" does not exist` e a lista vazia) |
| TDD | A entrega mostra a suíte antes do esquema: 12 falhas, 3 da T47 e 9 de `auth.test.ts` da T08 com `Drizzle schema mismatch`. Era o esperado no passo 2 |
| Suíte, lint e typecheck | Rodei de novo nesta revisão: 618 de 618 em 32 arquivos, lint limpo e typecheck limpo. Os 9 de `auth.test.ts` estão verdes, e a guarda de `privilegios.test.ts` passa sem edição |
| Volta da migration | Está em `## Decisões tomadas` da entrega, com o SQL do passo 6. Ela perde só o estado do plugin e, depois dela, a T08 volta a falhar. A migration só expande, então a versão da main continua rodando sobre o banco migrado. Isso bate com o `volta_sem_restaurar` do ensaio de rollback (padrão, seção 9) |

### Checklist da seção 12 do padrão técnico

- [x] A tarefa faz o que o plano pede, nem mais nem menos, e nenhum arquivo fora da tarefa mudou.
- [x] Cada comportamento novo tem teste, e os três falham sem o código, como a entrega mostra.
- [x] Não há segredo, valor de `.env` nem dado pessoal real. As fixtures são `segredo-ficticio-cifrado`, `codigos-ficticios` e ids `tf-qa-t47-*`, e as linhas de log do Vitest trazem só nível, hora e evento.
- [x] Entrada externa com Zod: não se aplica. A tarefa não cria rota, ação nem schema de entrada.
- [x] Banco: a migration saiu do `pnpm db:generate` e roda com o papel migrator (Testcontainers, `test/setup-global.ts`). `two_factor` não tem `tenant_id`, e o `GRANT` de tabela inteira cobre as colunas novas (C-34).
- [x] Nada duplica função que já existe: a tarefa não cria função nova.
- [x] Textos de interface e axe: não se aplicam, porque a tarefa não tem tela.
- [x] Os achados Minor estão em Pendências e nenhum bloqueia a passagem.
- [x] `/code-review` e `/security-review` no PR: não cabem nesta etapa e ficam com a `08-revisao` (G2).

### Achados (Minor ou informativos; nenhum bloqueia)

1. **`drizzle/0006_familiar_crusher_hogan.sql:4`.** Problema: o `ADD CONSTRAINT ... CHECK` é feito sem `NOT VALID`,
   então lê a tabela inteira sob `ACCESS EXCLUSIVE`. Razão: a `two_factor` tem no máximo uma linha por conta e o
   sistema tem poucas contas, então o bloqueio é desprezível. Além disso, o arquivo é saída do gerador, que não se
   edita. Fica só como registro para o `deploy.md` da `10-documentacao` (ordem backup → migrate → deploy).
2. **`src/db/schema/acesso.ts:90-91`, efeito na T09.** Problema: o plugin passa a ter bloqueio próprio
   (`failed_verification_count`, `locked_until`), que se sobrepõe a `bloqueio_verificacao` e a C-06. Razão: com duas
   contagens, o comportamento na 5ª falha pode divergir do que o teste de C-06 da T09 espera. A T47 não deveria ligar
   esse bloqueio, e não liga. Quem decide é a T09, onde a pendência já está registrada no `05-tech-lead.md`.
3. **Banco de desenvolvimento.** Problema: o `pnpm db:migrate` não rodou no dev. Razão: o `docker-compose.dev.yml`
   não cria o `orquestrador_app` e a 0001 para em 42704, o que já está registrado na T04. A aplicação da 0006 com o
   migrator está provada pelo Testcontainers. A pendência segue aberta na T04 e não é desta tarefa.
4. **Entrega, `## Decisões tomadas`, a volta.** Problema: a entrega descreve a volta como uma migration custom
   `rls_volta_two_factor`. Razão: o nome segue o formato de G1. Mas, pelo padrão (seção 9), a volta de produção é a
   imagem da main mais o restore do backup, e uma migration de volta só seria criada se Fabiano pedisse. A `09-entrega`
   e a `10-documentacao` devem tratar esse SQL como recurso manual, não como passo do rollback.

## Decisões tomadas

- Aprovada sem devolução: o código, os testes e a migration são os do plano, e a suíte está verde nesta revisão.
- Comparei os snapshots 0005 e 0006 com `git diff --no-index`, para confirmar que o gerador não carregou mudança
  escondida de outra tabela. A diferença é só de ordem das chaves.
- Os achados 1 a 4 são Minor: nenhum muda o comportamento da T47, e cada um tem uma etapa dona nomeada.

## Pendências

- T09 (`engenheiro-backend`): decidir como o bloqueio próprio do plugin convive com `bloqueio_verificacao` e C-06
  (achado 2; pendência já aberta no `05-tech-lead.md`).
- T08 (`engenheiro-backend`): na volta, rodar a suíte e regravar a entrega. Os 9 de `auth.test.ts` já passam.
- T04: o banco de dev sem o `orquestrador_app` continua pendente (achado 3).
- `09-entrega` e `10-documentacao`: registrar no `deploy.md` que o SQL de volta da 0006 é manual, porque o rollback é
  feito com a imagem da main mais o restore (achados 1 e 4).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat a93cd6025ff3b4c3f740251a40f6765fb3e9178e` — 7 arquivos, 2883 linhas a mais e 1 a menos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show a93cd6025ff3b4c3f740251a40f6765fb3e9178e -- src drizzle/0006_familiar_crusher_hogan.sql drizzle/meta/_journal.json` — diff do esquema, dos testes, da migration e do journal
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --no-index /home/deploy/servidor/projetos/ws-orquestrador-demandas/drizzle/meta/0005_snapshot.json /home/deploy/servidor/projetos/ws-orquestrador-demandas/drizzle/meta/0006_snapshot.json` — conteúdo novo só em `public.two_factor`; o resto é ordem das chaves
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 618 de 618, 32 de 32 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
