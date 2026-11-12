---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T10-revisao
agente: tech-lead
leu: [contrato-passagem.md, tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G7 e T10, linhas 1893 a 1966, e o uso na T11, linhas 1968 a 1999), 06-T10-engenheiro-dados-bd.md, padrao-tecnico.md (seção 12), o commit b158185 (diff contra o pai 0ca1791), src/modules/pedido-construcao/pendentes.ts, src/modules/pedido-construcao/pendentes.test.ts, src/db/schema/historico.ts, src/db/schema/decisao.ts, src/modules/pacotes-decisao/substituido.ts, src/modules/pacotes-decisao/desatualizado.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T10 (commit `b158185`): as leituras do Pedido de Construção no histórico, em `pendentes.ts`. **Aprovada.**
Nenhum problema Critical ou Important. Há quatro pontos Minor, nas Pendências.

### O que foi conferido

| Ponto do plano | Resultado |
|---|---|
| Arquivos: criar `pendentes.ts` e `pendentes.test.ts` | O diff contra `0ca1791` tem só esses dois arquivos em `src/`. Fora de `src/`, só a entrega da 06 e o `passagens.jsonl` do maestro. Nenhum teste que já existia mudou, então o IN-16 não é afetado |
| Interfaces do G7 | As cinco funções de `pendentes.ts:24`, `:54`, `:74`, `:85` e `:103` têm as assinaturas do G7, com o mesmo nome, os mesmos parâmetros e o mesmo retorno |
| `listarPendentes`: consulta única da 02, seção 5.3 | `pendentes.ts:24-51` segue o esboço do passo 3. A subconsulta `g` pega o primeiro `pedido_gerado` de pessoa sobre `pacote_decisao`. Depois vêm a junção com `decisao` aprovada e com `demanda`, a demanda fora de status final, não substituído, não desatualizado e o `NOT EXISTS` do recebido. A ordem é `g.primeiro` e depois o id. A junção com `decisao` não duplica linha, porque `decisao.pacote_decisao_id` é a chave primária (`decisao.ts:106`) |
| IN-10: só `pedido_gerado` de pessoa conta | O filtro `ator_tipo = 'pessoa'` está na `g` (`:28`) e em `pedidoGeradoPorPessoa` (`:63`). O teste `pendentes.test.ts:163` cobre agente, integração, sistema e pessoa sobre outra entidade, e o de `:181` cobre pessoa e agente no mesmo DEC |
| CA-12.1 a CA-12.6, P-02, P-03 | Há um teste para cada um (`:140`, `:150`, `:187`, `:202`, `:213`, `:222`, `:233`, `:245`). O P-02 prova a recusa com `conferirEMontarPedido` real (`nao_processavel`) e mostra que o DEC continua na lista. O P-03 cobre o primeiro gerado (e não o último), outubro e o desempate pelo id |
| `shasEntregues`, `recebidoComSha`, `recebimentoDoPedido` | Consultas por `acao`, `entidade = 'pacote_decisao'` e `entidade_id`, com `limit 1` onde cabe. O hash vai por parâmetro (`:95`), sem `sql.raw`. Os testes `:283`, `:306` e `:321` cobrem o formato (maiúscula, 63 e 65 caracteres, número, chave ausente), a outra entidade, o outro DEC e a ordem de gravação fora da ordem de data |
| RNF-02 e ADR-27 | Rodei de novo: 94 itens, chamada de 16,4 ms, execução de 13,2 ms. `evento_acao_entidade_idx` aparece na `g` (Bitmap Index Scan) e no `NOT EXISTS` (Index Scan), e não há nenhum `Seq Scan` em `evento`. O teste confere uma consulta só, o índice, a ausência de varredura em `evento`, o tempo abaixo de 1 s e a lista exata contra uma regra escrita à parte em TypeScript (`:355`), e não contra outro SQL |
| Desvios 1 a 5 da entrega | Aceitos. (1) `STATUS_FINAIS` importado de `transicoes.ts` deixa uma fonte só para os status finais (M-02). (2) `entidade` no `NOT EXISTS` deixa as cinco leituras com o mesmo filtro. (3) `order by ... limit 1` dá o mesmo resultado que `min()`. (4) Remover repetidos e recusar hash fora do formato antes de consultar não muda o contrato do G7. (5) Os testes a mais só reforçam o IN-10 e o RNF-02 |
| G3.6 e G3.10 | Sem `sql.raw`; os literais são constantes; nenhuma linha de log nova. O `process.stdout.write` do teste (`:345`) só imprime o plano e os tempos, sem `decId`, hash nem título |
| G4 | O `git diff a9fd9b8 --stat` das superfícies congeladas, com `src/lib/rota.ts`, saiu vazio |

### Verificação que rodei

- `pendentes.test.ts`: 18 de 18.
- `pnpm typecheck`: limpo.
- `pnpm lint`: limpo.
- A suíte inteira não foi rodada de novo aqui. A entrega declara 270 de 270 arquivos e 5708 de 5708 testes. O commit só
  cria dois arquivos e nenhum outro arquivo importa `pendentes.ts`, então nada mais pode ter mudado. A suíte inteira
  fica com a `06-T10-testes`.

### Checklist da seção 12 do padrão técnico

- [x] A tarefa faz o que o plano pede, nem mais nem menos; arquivos fora da tarefa não mudaram. Só os dois arquivos da
      T10 mudaram. Sem migration, sem GRANT, sem rota e sem log.
- [x] Há teste para cada comportamento novo, e ele falharia sem o código. O teste foi visto falhando com
      `Cannot find module './pendentes'`. Cada filtro da consulta tem um caso que o quebraria se fosse retirado: ator,
      entidade, decisão, status final, substituído, desatualizado, recebido e ordem.
- [x] Nenhum segredo, valor de `.env` ou dado pessoal real em código, teste, log ou fixture. Os nomes são fictícios, os
      e-mails são `@exemplo.test` e o prefixo é `ficticio`. Nenhum token é gerado: os eventos do `/construir` entram pelo
      migrator (IN-04).
- [x] Entrada externa validada com Zod; erro sem vazar detalhe. Não se aplica: não há rota nem Server Action. O hash
      fora do formato devolve `false` sem consultar, e a validação Zod do hash fica com a T12.
- [x] Banco: migration gerada, papel migrator, RLS e guarda quando houver `tenant_id`. Não se aplica: nenhuma migration.
      O índice usado veio da `0007` (T01). As leituras rodam pelo papel do app (`b.db` e `v.poolApp`).
- [x] Nada duplica função que já existe no repositório. A consulta reaproveita `expressaoSubstituidoPor`,
      `expressaoDesatualizado` e `STATUS_FINAIS`. Até a T10, nenhum código de `src/` tinha regex de SHA-256 (busca por
      `git log -S`). O risco de duplicar na T11 está nas Pendências.
- [x] Textos de interface em pt-BR; axe sem violação nas telas tocadas. Não se aplica: nenhuma tela.
- [x] O que é Minor vai para Pendências; só Critical e Important bloqueiam a passagem. Os quatro pontos Minor estão
      abaixo.
- [x] No PR: `/code-review` e `/security-review`. Não se aplica a esta passagem: ficam com a `08-revisao`.

## Decisões tomadas

- A T10 passa sem devolução: nenhum ponto Critical ou Important, e os desvios declarados tornam as cinco leituras mais
  coerentes entre si, sem mudar o contrato do G7.
- A medição de tempo por relógio real (`performance.now()`) no teste RNF-02 fica aceita. O plano pede "abaixo de 1 s",
  e `resumo-da-fila.test.ts` já usa o mesmo padrão. A folga é de cerca de 60 vezes (16 ms contra 1000 ms).
- A suíte inteira não foi rodada de novo nesta revisão. O diff só cria arquivos novos que nenhum outro importa, e a
  `06-T10-testes` roda a suíte.

## Pendências

- Nenhuma bloqueia a T10.
- Minor 1, para a T11, sobre a duplicação de `RE_SHA256` (`pendentes.ts:16`).
  - Problema: o G7 manda `entregar.ts` (T11) exportar `RE_SHA256`, e `pendentes.ts` já declara a mesma regex como
    constante privada. Se a T11 seguir o G7 à letra, o formato do hash fica escrito em dois lugares.
  - Razão: se um dos dois mudar, `shasEntregues` e a entrega passam a discordar sobre o que é um hash válido.
  - Instrução ao `engenheiro-backend` na T11: exportar `RE_SHA256` de `pendentes.ts` e reexportar em `entregar.ts`
    (`export { RE_SHA256 } from './pendentes'`). O caminho inverso faria um import circular, porque `entregar.ts`
    importa `pendentes.ts`.
- Minor 2, sobre a diferença entre `listarPendentes` e `pedidoGeradoPorPessoa` com `demanda_id` nulo
  (`pendentes.ts:25-30` e `:64`).
  - Problema: a `g` não exige `demanda_id` não nulo, e `pedidoGeradoPorPessoa` exige. Um `pedido_gerado` de pessoa sem
    `demanda_id` põe o DEC em `pendentes`, e a entrega da T11 daria 404 para ele.
  - Razão: só o migrator grava esse evento, porque `gerarPedido` sempre leva a demanda. Por isso não há efeito real hoje.
    Fica como nota para a `08-revisao`, caso o maestro queira alinhar as duas regras pondo `isNotNull(evento.demandaId)`
    na `g`.
- Minor 3, sobre o nome do solicitante no teste (`pendentes.test.ts:90`).
  - Problema: "Carlos Exemplar" foge do padrão "Pessoa Ficticia …" do G3.3.
  - Razão: o comentário de `:82` justifica o desvio, porque "Ficticia" casaria com o título na conferência do nome (C-28).
    O nome é inventado e genérico, e o desvio fica aceito.
- Minor 4, sobre as subconsultas de desatualizado e substituído.
  - Problema: os `Seq Scan` em `parecer_risco`, `especificacao_tecnica` e `decisao` vêm das expressões que já existiam.
  - Razão: o engenheiro já registrou que, com 200 linhas, o planejador prefere ler a tabela a usar o índice único. A
    medição na homologação (`09-entrega`, RNF-02) confirma o comportamento com o volume real.
- As caixas `- [ ]` da T10 no plano (linhas 1904 a 1966) ficam para o maestro marcar, porque a 06 não edita `docs/` (G1).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -12` — `b158185` é a 06-T10-construcao, sobre `0ca1791` (06-T09-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 0ca1791 b1581851fb5733079628271a7bf52380c87b0a02` — só `pendentes.ts`, `pendentes.test.ts`, a entrega da 06 e o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — árvore limpa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline --name-only -S "[0-9a-f]{64}" a9fd9b8~200..b1581851fb5733079628271a7bf52380c87b0a02 -- src scripts test` — falhou (`bad revision`), refeito sem o intervalo no item seguinte
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline --name-only -S "[0-9a-f]{64}" b1581851fb5733079628271a7bf52380c87b0a02 -- src scripts test` — só `pendentes.ts`, `pendentes.test.ts` e um teste de `src/vendor/construir/`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline --name-only -S "STATUS_FINAIS" b1581851fb5733079628271a7bf52380c87b0a02 -- src` — `STATUS_FINAIS` vem de `transicoes.ts` (df44547)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 --stat -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts 'drizzle/000[0-6]_*.sql' 'drizzle/meta/000[0-6]_snapshot.json' src/lib/rota.ts` — vazio (G4)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pedido-construcao/pendentes.test.ts` — 18 de 18; EXPLAIN com 94 itens, chamada de 16,4 ms, execução de 13,2 ms
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
