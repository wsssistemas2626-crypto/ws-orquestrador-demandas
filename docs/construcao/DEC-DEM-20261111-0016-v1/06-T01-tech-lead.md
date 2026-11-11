---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T01-revisao
agente: tech-lead
leu: [tarefas.json, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G8 e T01), 06-T01-engenheiro-dados-bd.md, commit 3de5e63 (git diff 3de5e63~1 3de5e63), padrao-tecnico.md (seção 12), contrato-passagem.md, src/modules/acesso/tokens-servico.ts, src/db/privilegios.ts, drizzle/meta/0006_snapshot.json (cabeçalho), drizzle/meta/0007_snapshot.json (cabeçalho)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T01 (esquema e migration `0007`, aditiva), commit `3de5e6318ca8ab57ab7aef549de49fef0e53bca0`. Parecer:
**aprovada**. Nenhum problema Critical ou Important; três Minor, em Pendências.

### Conferência contra o plano (T01)

| Item do plano | Situação |
|---|---|
| `INTEGRACOES` e `Integracao` em `src/db/schema/acesso.ts` (G7) | Conforme |
| `token_servico.agente` anulável, `integracao` nova, `token_servico_integracao_check`, `token_servico_dono_check` com `num_nonnulls(...) = 1` | Conforme; `token_servico_agente_check` mantido (com `agente` nulo o `in` dá NULL e o CHECK passa, correto) |
| `AtorTipo` com `integracao`, `evento_ator_tipo_check` ampliado, `evento_ator_integracao_check`, índice `evento_acao_entidade_idx` em `(acao, entidade_id)` | Conforme (`src/db/schema/historico.ts:7`, `:25-30`) |
| `AUTORES_DEMANDA`, `AutorDemanda`, `demanda.autor_tipo` tipado, `demanda_autor_tipo_check` ampliado, `demanda_autor_integracao_check` | Conforme (`src/db/schema/demandas.ts:25`, `:34`, `:59`, `:78-80`); `AUTORES_ARTEFATO` intocado |
| `validarTokenServico`: linha sem agente devolve `null` | Conforme e só isso (`src/modules/acesso/tokens-servico.ts:37-38`) |
| Migration por `pnpm db:generate`, sem edição | Conforme: `drizzle/0007_greedy_wendigo.sql` tem 11 comandos, sem `UPDATE`, `DELETE`, `DROP COLUMN`, `DROP TABLE`, `RENAME`, troca de tipo, `TRUNCATE` ou `GRANT`; `0007_snapshot.json` encadeia no `id` do `0006` (`prevId` 7a3a5342…); diário com a entrada 7 |
| Testes do Passo 1 (`integracao.test.ts`, `migration-0007.test.ts`) | Conforme ao texto do plano, mais uma asserção (`toMatch(/pessoa/)`) que impede o teste da ESP de passar à toa; nome real do CHECK conferido |
| SQL de volta em `## Decisões tomadas` da entrega | Presente, com a ressalva correta de que só vale sem dado de integração e que a volta real é a restauração (ADR-12) |

### Checklist da seção 12 do padrão técnico

- [x] A tarefa faz o que o plano pede, nem mais nem menos. Os arquivos alterados são os da lista da T01, mais
  `src/db/schema/dominio.test.ts` (ver Decisões).
- [x] Há teste para cada comportamento novo do banco, e ele falharia sem o código: a entrega mostra 11 de 13
  falhando antes (coluna inexistente, CHECK antigo recusando `integracao`, diário com 7 entradas); os 2 que já passavam
  são guardas do que não pode mudar. O `null` de `validarTokenServico` não tem teste próprio (Minor 1).
- [x] Nenhum segredo, valor de `.env` ou dado pessoal real: hashes são `n` em hexadecimal, prefixos `abcd1234` e
  `ficticio`, título "(fictício)", solicitante "Awave".
- [x] Entrada externa com Zod: não se aplica (a T01 não cria rota nem Server Action).
- [x] Banco: migration gerada; roda com o papel migrator (setup global e `scripts/migrate.test.ts`); nenhuma tabela
  com `tenant_id`, então sem RLS nova. Nenhum `GRANT` novo; `token_servico.integracao` fora de `colunasUpdate`
  (`src/db/privilegios.ts:18`), e o teste IN-17 prova o 42501 no `UPDATE`.
- [x] Nada duplica função existente: a lista de integrações tem uma fonte (`INTEGRACOES`); os literais nos CHECK são o
  espelho que o plano define, amarrado por `dominio.test.ts` no `token_servico` (ver Minor 2 para os outros dois).
- [x] Textos de interface e axe: não se aplica (sem tela).
- [x] Minor foi para Pendências; nenhum Critical ou Important.
- [x] PR (`/code-review`, `/security-review`): fica com a `08-revisao`, como o G2 do plano.

### Restrições globais conferidas

- **G4:** `git diff a9fd9b8` das superfícies congeladas (com `drizzle/000[0-6]_*.sql`, `drizzle/meta/000[0-6]_snapshot.json`
  e `src/lib/rota.ts`) saiu vazio.
- **IN-16 (D-17):** `git diff a9fd9b8 --stat` dos 16 testes da lista saiu vazio; nenhuma asserção de teste de segurança
  mudou.
- **G3.3:** sem token real; `criarTokenServico` nem foi necessário.
- **G3.6:** só SQL por parâmetro nos testes; nada de `sql.raw`.
- **Uso de `tokenServico` no código:** só `src/modules/acesso/tokens-servico.ts`; `criarTokenServico` grava `agente`
  (preenchido) e `revogarTokenServico` não lê `agente`, então o `null` novo não chega a outro ponto.

### Verificação própria

- `pnpm typecheck` e `pnpm lint`: limpos.
- `pnpm test`: 236 arquivos, 5263 de 5263 testes passaram (o mesmo número da entrega do engenheiro).

## Decisões tomadas

- Aceito o desvio 1 (`src/db/schema/dominio.test.ts`, fora do G5): a asserção continua a mesma ("o CHECK do banco é a
  lista exportada"), só troca a lista de referência para a que o ADR-24 criou, e ganha uma linha que amarra
  `token_servico_integracao_check` a `INTEGRACOES`; não há asserção a menos. Foi omissão do plano no G5.
- Aceito o desvio 2 (`toMatch(/pessoa/)` a mais): fortalece o teste sem mudar o que ele prova.
- Aceito o índice sem `CONCURRENTLY`: o migrator aplica a migration numa transação, onde `CONCURRENTLY` não roda, e o
  volume do RNF-02 deixa a trava em milissegundos; o plano não pediu outra coisa.
- Aceito apagar e recriar `evento_ator_tipo_check` e `demanda_autor_tipo_check` na mesma migration: é o que o
  drizzle-kit gera para ampliar CHECK, e a transação única do migrator não deixa janela sem regra.

## Pendências

- Minor 1 — `src/modules/acesso/tokens-servico.ts:38`: o `linha?.agente ? ... : null` não tem teste que prove o 401 de
  uma linha de integração. Razão por que não bloqueia: na T01 e na T02 não existe caminho que crie token de integração
  (`criarTokenDeIntegracao` nasce na T03), e a T03 reescreve a função com os casos do G8 #3. Para a T03: o teste de
  `validarTokenServico` deve cobrir linha com `agente` nulo e `integracao` preenchida, e linha com `agente` fora da lista.
- Minor 2 — `src/db/schema/historico.ts:27` e `src/db/schema/demandas.ts:80`: os literais `'awave', 'construir'` e
  `'awave'` dos CHECK de evento e demanda não estão amarrados a `INTEGRACOES` por teste, como o de `token_servico` ficou
  em `dominio.test.ts`; e `integracao.test.ts` não prova que o evento aceita `construir` (só `awave` aceito e `jarvis`
  recusado). Razão: se a lista mudar num lugar só, o banco aceita uma integração que o código não conhece, ou recusa a
  que ele conhece, sem teste quebrar. Para a T13 (testes transversais) ou a primeira tarefa que tocar esses arquivos:
  um caso `ev('integracao', 'construir', 'ficticio')` aceito.
- Minor 3 — para a `09-entrega` e a `10-documentacao` (já registrado pelo engenheiro): com token de integração
  emitido, a volta para a 0.2.0 pede revogar esses tokens antes, e o SQL de volta da `0007` deixa de funcionar; a volta é
  por restauração.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 3de5e6318ca8ab57ab7aef549de49fef0e53bca0~1 3de5e6318ca8ab57ab7aef549de49fef0e53bca0` — 12 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 3de5e6318ca8ab57ab7aef549de49fef0e53bca0~1 3de5e6318ca8ab57ab7aef549de49fef0e53bca0 -- src test drizzle/0007_greedy_wendigo.sql drizzle/meta/_journal.json` — diff revisado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --branch` — ramo `construcao/DEC-DEM-20261111-0016-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -n 4 --oneline` — HEAD em 3de5e63
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts 'drizzle/000[0-6]_*.sql' 'drizzle/meta/000[0-6]_snapshot.json' src/lib/rota.ts` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 --stat -- src/modules/acesso/matriz.test.ts src/modules/acesso/matriz-qa.test.ts src/modules/acesso/resolver-ator.test.ts src/modules/acesso/resolver-ator-qa.test.ts src/modules/acesso/tokens-servico.test.ts src/modules/acesso/tokens-servico-qa.test.ts src/modules/demandas/servico.test.ts src/modules/historico/registrar.test.ts src/modules/limites.test.ts src/db/privilegios.test.ts src/app/api/vistas-para-agente.test.ts test/matriz-rotas.test.ts test/transversal/sentinelas.test.ts test/estatico/sem-controle-bidi.test.ts test/estatico/sem-recurso-externo.test.ts test/estatico/leituras-da-fila.test.ts` — vazio (IN-16)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only -G tokenServico 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- src scripts test` — `src/db/schema/acesso.ts` e `src/modules/acesso/tokens-servico.ts`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 236 arquivos, 5263 de 5263 passaram
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só esta entrega nova; a suíte não deixou arquivo alterado

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
