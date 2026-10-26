---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T47-construcao
agente: engenheiro-dados-bd
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, 05-tech-lead.md, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T07 e T47 e T08), 06-T08-engenheiro-backend.md, 06-T04-engenheiro-dados-bd.md, src/db/schema/acesso.ts, src/db/schema/acesso.test.ts, drizzle/meta/_journal.json, drizzle/0006_familiar_crusher_hogan.sql, docker-compose.dev.yml, scripts/migrate.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

### Resumo

A T47 põe na `two_factor` as três colunas que o plugin `twoFactor` do Better Auth 1.7.6 confere ao abrir o adaptador:
`verified`, `failed_verification_count` e `locked_until`. Elas entram numa migration nova (`0006`), gerada pelo
`pnpm db:generate` e não editada. A 0000 não mudou. Com a migration, os 9 testes de `auth.test.ts` da T08 que
falhavam com `Drizzle schema mismatch` passam, e os 3 testes novos também. Resultado: 618 de 618.

### Arquivos alterados

- `src/db/schema/acesso.ts`: `twoFactor` ganhou três campos e um `check`, como no passo 3 do plano.
  - `verified: boolean().default(true)`
  - `failedVerificationCount: integer().notNull().default(0)`
  - `lockedUntil: momento()`
  - `check('two_factor_failed_verification_count_check', "failed_verification_count" >= 0)`
  - O índice `two_factor_user_id_idx` continua como estava.
- `src/db/schema/acesso.test.ts`: o bloco `two_factor: colunas do plugin twoFactor do Better Auth 1.7.6 (T47)` entrou
  no fim do arquivo, igual ao do plano.
- `drizzle/meta/_journal.json`: entrada `idx 6`, escrita pelo drizzle-kit.
- Novos, saídos do `pnpm db:generate` sem edição: `drizzle/0006_familiar_crusher_hogan.sql` e
  `drizzle/meta/0006_snapshot.json`.
- `src/db/privilegios.ts` não mudou, e nenhuma migration custom foi criada. A guarda de privilégios ficou verde sem
  edição.

### Migration 0006, como saiu do gerador

```sql
ALTER TABLE "two_factor" ADD COLUMN "verified" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "two_factor" ADD COLUMN "failed_verification_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "two_factor" ADD COLUMN "locked_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_failed_verification_count_check" CHECK ("failed_verification_count" >= 0);
```

O drizzle-kit gerou só as três colunas e o `CHECK`, sem tocar outra tabela. Era a condição do passo 4. Esquema e
migrations commitadas não divergem.

Efeito no Postgres 16:
- O `ADD COLUMN` com padrão constante só muda metadados: não reescreve a tabela.
- O `ADD CONSTRAINT ... CHECK` lê a tabela sob `ACCESS EXCLUSIVE`. A `two_factor` tem no máximo uma linha por conta,
  então o bloqueio dura um instante.
- As linhas que já existem passam a ler `verified = true`, `failed_verification_count = 0` e `locked_until = null`.

### Testes criados

Os três de `src/db/schema/acesso.test.ts` (T47):

1. Tipos, nulidade e padrão das três colunas, lidos de `information_schema.columns` pelo migrator.
2. Uma linha gravada pelo app sem as colunas novas nasce com `verified = true`, zero falhas e sem bloqueio.
3. O app grava `verified = false`, 5 falhas e `locked_until`, e lê de volta. Com contagem `-1`, o banco recusa com
   `23514` e a constraint `two_factor_failed_verification_count_check`.

### Teste antes do código (visto falhando)

`pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test`, com os testes novos escritos e antes do esquema:

```
 ❯ src/modules/acesso/auth.test.ts (14 tests | 9 failed) 5424ms
 ❯ src/db/schema/acesso.test.ts (27 tests | 3 failed) 6391ms
   ❯ two_factor: colunas do plugin twoFactor do Better Auth 1.7.6 (T47) (3)
     × tem verified, failed_verification_count e locked_until com os tipos e padrões 32ms
     × linha gravada sem as colunas novas nasce verificada, com zero falhas e sem bloqueio 24ms
     × o app grava falha e bloqueio, e a contagem não fica negativa (23514) 36ms

 FAIL  src/modules/acesso/auth.test.ts > Better Auth fechado > C-01: sign-up/email não cria usuário
BetterAuthError: Drizzle schema mismatch
  Missing columns
    twoFactor.verified
    twoFactor.failedVerificationCount
    twoFactor.lockedUntil

 FAIL  src/db/schema/acesso.test.ts > ... > tem verified, failed_verification_count e locked_until com os tipos e padrões
AssertionError: expected [] to deeply equal [ { …(4) }, { …(4) }, { …(4) } ]
 FAIL  src/db/schema/acesso.test.ts > ... > linha gravada sem as colunas novas nasce verificada, ...
error: column "verified" does not exist
 FAIL  src/db/schema/acesso.test.ts > ... > o app grava falha e bloqueio, ...
error: column "verified" of relation "two_factor" does not exist

 Test Files  2 failed | 30 passed (32)
      Tests  12 failed | 606 passed (618)
```

### Resultado

| Momento | Arquivos | Testes |
|---|---|---|
| Antes do esquema | 2 falharam, 30 passaram (32) | 12 falharam (9 de `auth.test.ts` e 3 da T47), 606 passaram (618) |
| Depois da migration | 32 passaram (32) | 618 de 618, 0 falhas |

- `pnpm lint` e `pnpm typecheck` estão limpos.
- As duas linhas `{"level":50,...,"evento":"better_auth"}` na saída do Vitest vêm dos testes de C-21 da T08, com login
  que falha de propósito. Elas só têm nível, hora e evento: nenhum e-mail, senha nem valor.

### Desvios do plano

Nenhum. Testes, esquema e migration são os do plano. A migration saiu só com as instruções previstas no passo 4.

## Decisões tomadas

- **Volta da `0006_familiar_crusher_hogan`.** É uma migration nova, criada por
  `pnpm drizzle-kit generate --custom --name rls_volta_two_factor` e com este SQL:
  `ALTER TABLE "two_factor" DROP CONSTRAINT "two_factor_failed_verification_count_check", DROP COLUMN "verified", DROP COLUMN "failed_verification_count", DROP COLUMN "locked_until";`
  - Perde só o estado de bloqueio e de verificação do plugin. Segredo e códigos de recuperação ficam intactos.
  - Depois da volta, a T08 falha de novo com `Drizzle schema mismatch`.
  - Não precisa de backup: as colunas são só do plugin, e nenhum dado anterior foi reescrito.
- **Só expande.** A migration não apaga, não renomeia, não troca tipo e não reescreve dado. A versão da main, sem as
  colunas no Drizzle, continua rodando sobre o banco migrado: os padrões cobrem os `INSERT` que não citam as colunas.
- **`verified` aceita nulo e tem padrão `true`.** É o que a sonda da T08 provou e o plano fixou. Um `NOT NULL` não foi
  provado contra a biblioteca.
- **`CHECK (>= 0)` em `failed_verification_count`**, pela mesma regra de `bloqueio_verificacao`.
- **`locked_until` sem padrão no banco** (G3.4): quem grava a data é quem bloqueia.
- **Sem migration custom e sem mudança em `privilegios.ts`.** O `GRANT` de `two_factor` vale para a tabela inteira e
  cobre colunas novas. A guarda passou sem edição.
- **`pnpm db:migrate` não rodou no banco de desenvolvimento.** O dev ainda não cria o `orquestrador_app`, e a 0001 para
  em 42704, como já registrado na T04. O ensaio só repetiria essa falha. A aplicação de todas as migrations, a 0006
  inclusive, com o papel migrator está provada pelo Testcontainers (`test/setup-global.ts`). Por isso o banco de dev
  não subiu, e não há nada para derrubar.

## Pendências

- **Para a T08 (`engenheiro-backend`):** a volta dela pode rodar a suíte. Os 9 testes de `auth.test.ts` já passam com a
  0006.
- **Para a T09:** segue aberta a pendência do `05-tech-lead.md`. O plugin agora tem bloqueio próprio
  (`failed_verification_count` e `locked_until`), que se sobrepõe a `bloqueio_verificacao` e a C-06. As colunas
  existem, mas esta tarefa não liga nem configura esse bloqueio.
- **Banco de desenvolvimento:** segue a pendência da T04. O `docker-compose.dev.yml` não cria o `orquestrador_app`, e
  por isso o `pnpm db:migrate` não roda no dev.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — antes do esquema: 12 de 618 falharam (3 da T47 com `column "verified" does not exist` e lista vazia; 9 de `auth.test.ts` com `Drizzle schema mismatch`), 606 passaram
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas db:generate` — gerou `drizzle/0006_familiar_crusher_hogan.sql`, com as três colunas e o `CHECK`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 618 de 618, 0 falhas (32 de 32 arquivos)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — modificados `drizzle/meta/_journal.json`, `src/db/schema/acesso.test.ts` e `src/db/schema/acesso.ts`; novos `drizzle/0006_familiar_crusher_hogan.sql` e `drizzle/meta/0006_snapshot.json`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 3 arquivos rastreados, 49 linhas a mais e 1 a menos

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] a migration roda com o papel migrator e tem RLS e guarda quando a tabela tem `tenant_id`
- [x] cada migration nova tem, em `## Decisões tomadas`, como desfazê-la (o SQL de volta ou a razão de ser irreversível)
- [x] a migration de esquema fica como saiu do `pnpm db:generate`; o SQL que o Drizzle não gera (RLS forçada, política, função de guarda) fica numa migration criada vazia por `pnpm drizzle-kit generate --custom --name rls_<tabela>` e escrita por você; nenhuma migration já commitada foi editada
