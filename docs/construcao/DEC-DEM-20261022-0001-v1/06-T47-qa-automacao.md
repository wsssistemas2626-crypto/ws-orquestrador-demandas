---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T47-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G3 e T47), 01-analista-requisitos.md (RF-01), 04-seguranca-aplicacao.md (C-33 e C-34), 06-T47-engenheiro-dados-bd.md, git show a93cd60, src/db/schema/acesso.test.ts, src/modules/acesso/auth.test.ts, src/modules/acesso/auth.ts, src/db/privilegios.test.ts, test/auth.ts, test/banco.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

### Resumo

A T47 (commit `a93cd60`) põe três colunas na `two_factor`: `verified`, `failed_verification_count` e `locked_until`,
com o `CHECK >= 0`, pela migration `0006_familiar_crusher_hogan`. Os três testes do engenheiro provam as colunas no
banco. Faltava provar que o plugin `twoFactor` do Better Auth 1.7.6 grava e lê essas colunas no fluxo dele, e cobrir as
bordas do banco. Acrescentei 10 testes: 4 pelo fluxo do plugin e 6 de borda e de privilégio. A suíte foi de 618 para
628 testes, todos verdes. Nenhum defeito encontrado e nada a devolver.

### Critério da tarefa e teste que o cobre

| Critério da T47 (plano, tabela das colunas e passos 1 a 5) | Arquivo | Teste |
|---|---|---|
| As três colunas existem com tipo, nulidade e padrão do plano | `src/db/schema/acesso.test.ts` | `two_factor: colunas do plugin twoFactor do Better Auth 1.7.6 (T47)` > `tem verified, failed_verification_count e locked_until com os tipos e padrões` (engenheiro) |
| Linha gravada sem as colunas novas recebe os padrões: `true`, `0` e nulo (só expande) | `src/db/schema/acesso.test.ts` | `... (T47)` > `linha gravada sem as colunas novas nasce verificada, com zero falhas e sem bloqueio` (engenheiro) |
| O app grava falha e bloqueio, e a contagem não fica negativa | `src/db/schema/acesso.test.ts` | `... (T47)` > `o app grava falha e bloqueio, e a contagem não fica negativa (23514)` (engenheiro); `two_factor: bordas das colunas do plugin e privilégio do app (T47, C-34)` > `contagem negativa já na inclusão é recusada (23514)` (novo) |
| `failed_verification_count` é `not null` | `src/db/schema/acesso.test.ts` | `... (T47, C-34)` > `contagem nula é recusada (23502), na inclusão e na alteração` (novo) |
| `verified` aceita nulo; `locked_until` volta a nulo | `src/db/schema/acesso.test.ts` | `... (T47, C-34)` > `verified aceita nulo explícito (o plugin não o exige) e o app desfaz o bloqueio` (novo) |
| RF-01 (base do 2FA): o adaptador do Better Auth abre sem `Drizzle schema mismatch` | `src/modules/acesso/auth.test.ts` | os 14 testes da T08, entre eles os 9 que falhavam antes da 0006 (`C-01: sign-up/email não cria usuário` e os seguintes), sem edição |
| RF-01 (base do 2FA): o plugin grava as colunas novas ao ativar o 2FA | `src/modules/acesso/two-factor-colunas.test.ts` | `T47: o plugin twoFactor grava e lê as colunas novas de two_factor` > `ativar o 2FA cria a linha com verified = false, zero falhas e sem bloqueio` (novo) |
| RF-01 (base do 2FA): o primeiro código válido marca `verified` e liga o 2FA da conta | `src/modules/acesso/two-factor-colunas.test.ts` | `... > o primeiro código TOTP válido marca verified = true e liga o 2FA da conta` (novo) |
| RF-01: código errado na ativação não liga o 2FA | `src/modules/acesso/two-factor-colunas.test.ts` | `... > código errado na ativação é recusado, não conta falha, não liga o 2FA nem marca a linha como verificada` (novo) |
| C-34: o plugin atualiza a contagem pelo papel do app (`UPDATE` de tabela inteira cobre a coluna nova) | `src/modules/acesso/two-factor-colunas.test.ts` | `... > no login com 2FA, código errado soma 1 em failed_verification_count pelo papel do app, e o certo zera e abre a sessão` (novo) |
| C-34: privilégios sem mudança, guarda verde sem edição em `privilegios.ts` | `src/db/privilegios.test.ts` | `guarda de privilégios do orquestrador_app (C-34)` > `privilégios de tabela são exatamente os da regra (sem TRUNCATE, TRIGGER, REFERENCES)` e `nenhum privilégio por coluna além da regra (...)`, sem edição |
| C-34: o app não faz DDL nas colunas novas | `src/db/schema/acesso.test.ts` | `... (T47, C-34)` > `o papel do app não faz DDL em two_factor: %s é recusado (42501)`, 3 casos: apagar `locked_until`, apagar a constraint, trocar o padrão de `verified` (novos) |
| C-33: a linha do 2FA continua cifrada, sem segredo novo | `src/modules/acesso/auth.test.ts` | `Better Auth fechado` > `C-33: segredo TOTP e códigos de recuperação não ficam em claro em two_factor` (T08, sem edição; passa com a 0006) |

### Testes acrescentados

1. `src/modules/acesso/two-factor-colunas.test.ts` (arquivo novo, 4 testes, banco próprio do Testcontainers):
   - O fluxo é o do plugin: login, `/two-factor/enable` e `/two-factor/verify-totp`, sem inserir linha à mão.
   - Só `Date` é falso (`vi.useFakeTimers({ toFake: ['Date'] })`, fixado em `2026-10-22T12:00:07Z`). Os timers do
     driver do Postgres continuam reais.
   - O código TOTP é calculado no teste pela RFC 6238 (HMAC-SHA1, 30 s, 6 dígitos), a partir do segredo que o próprio
     plugin devolve. O código errado é escolhido fora das cinco janelas em volta do instante fixo, então o teste não
     depende de sorte.
   - Cada teste usa conta e IP fictícios próprios, da faixa `198.51.100.40` a `.43`. Assim o limite por IP de um teste
     não afeta o outro.
2. `src/db/schema/acesso.test.ts`: bloco novo
   `two_factor: bordas das colunas do plugin e privilégio do app (T47, C-34)`, no fim do arquivo, com 6 testes (3 diretos
   e 3 do `it.each`). Os testes que já existiam não mudaram: o `git diff --stat` mostra só 39 linhas a mais.

O que a sonda mostrou do plugin 1.7.6, e que agora está fixado em teste:
- `enable` grava `verified = false`.
- Código errado na ativação (com sessão) dá 4xx e **não** soma falha.
- No login com 2FA (cookie `wsod.two_factor`), o código errado dá 401, sem sessão, e soma 1 em
  `failed_verification_count`.
- Depois disso, o código certo dá 200, abre a sessão e zera a contagem.
- `locked_until` fica nulo depois de uma falha.

### Resultado

| Comando | Resultado |
|---|---|
| `pnpm test` (antes, linha de base) | 32 de 32 arquivos, 618 de 618 testes |
| `pnpm test` (depois) | 33 de 33 arquivos, 628 de 628 testes, 0 falhas |
| `pnpm test src/modules/acesso/two-factor-colunas.test.ts` (sozinho) | 4 de 4 |
| `pnpm test src/db/schema/acesso.test.ts` (sozinho) | 33 de 33 |
| `pnpm lint` | limpo |
| `pnpm typecheck` | limpo |

As duas linhas `{"level":50,...,"evento":"better_auth"}` na saída vêm dos testes de C-21 da T08, já registradas pelo
engenheiro. Têm só nível, hora e evento.

## Decisões tomadas

- **Fluxo do plugin num arquivo novo, `two-factor-colunas.test.ts`.** O `auth.test.ts` é da T08 e a T09 vai mexer
  nele. O arquivo novo prova a T47 pelo caminho real, sem disputar o arquivo de outra tarefa.
- **Só `Date` falso.** O TOTP depende da hora. Com o relógio real, um teste perto da virada da janela de 30 s ficaria
  instável. Falsificar os timers travaria o `pg`.
- **TOTP calculado no teste, sem ler a biblioteca.** `node_modules` não é rastreado pelo git, então fica fora do que
  posso ler. A RFC 6238 com os padrões do plugin bateu com o servidor.
- **A contagem do plugin fica fixada em teste** (+1 no login e zerada no acerto). É o comportamento que a pendência da
  T09 cita como sobreposto a `bloqueio_verificacao` e a C-06. Se a T09 mudar isso de propósito, o teste mostra a mudança.
- **Sem banco de desenvolvimento.** Todos os testes rodam no Testcontainers. Não subi o `docker-compose.dev.yml`, então
  não há nada para derrubar.

## Pendências

- **Para a T09 (`engenheiro-backend`):** o teste
  `no login com 2FA, código errado soma 1 em failed_verification_count pelo papel do app, e o certo zera e abre a sessão`
  mostra que o plugin já conta falhas em `two_factor`, ao lado de `bloqueio_verificacao`.
  - Não descobri a partir de quantas falhas o plugin grava `locked_until`. Ver isso exigiria mais de 5 tentativas e
    depende da configuração que a T09 vai decidir.
  - Se a T09 desligar ou trocar esse bloqueio, este teste e a pendência do `05-tech-lead.md` precisam andar juntos.
- **Para o `tech-lead`:** o critério de pronto da T47 não pede ensaio da volta da migration. O SQL de volta está no
  `06-T47-engenheiro-dados-bd.md` e é conferido pelo `ensaiar-rollback` do maestro, não por teste desta etapa.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat a93cd6025ff3b4c3f740251a40f6765fb3e9178e` — 7 arquivos, os da T47
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show a93cd6025ff3b4c3f740251a40f6765fb3e9178e -- drizzle/0006_familiar_crusher_hogan.sql drizzle/meta/_journal.json src/db/schema/acesso.test.ts src/db/schema/acesso.ts` — migration só com as três colunas e o `CHECK`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — linha de base: 618 de 618 (32 arquivos)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso/two-factor-colunas.test.ts` — 3 de 3 (primeira versão)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso/two-factor-colunas.test.ts` — sonda: falha esperada, ativação com código errado não soma falha (0)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso/two-factor-colunas.test.ts` — sonda: falha esperada, login com código errado dá 401 e soma 1
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso/two-factor-colunas.test.ts` — sonda: falha esperada, código certo depois dá 200, abre sessão e zera
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 628 de 628 (33 arquivos)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso/two-factor-colunas.test.ts` — 4 de 4
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/db/schema/acesso.test.ts` — 33 de 33
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — modificado `src/db/schema/acesso.test.ts`; novo `src/modules/acesso/two-factor-colunas.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 1 arquivo rastreado, 39 linhas a mais e 0 a menos

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
