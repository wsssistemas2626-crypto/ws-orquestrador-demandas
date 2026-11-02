---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T05-revisao
agente: tech-lead
leu: [2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T04 a T22), tarefas.json, 06-T05-engenheiro-dados-bd.md, 06-T04-tech-lead.md, commit 7069464, padrao-tecnico.md (seção 12), contrato-passagem.md, 01-analista-requisitos.md (glossário e RF-01 a RF-06), 04-seguranca-aplicacao.md (seções 1 a 5), src/db/schema/acesso.ts, src/db/index.ts, src/db/privilegios.test.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T05 (tabelas de demanda, versões e decisão, com privilégios e índices), commit `7069464`. Nenhum problema
Critical ou Important: a passagem segue para `06-T05-testes`. Quatro pareceres Minor, cada um com destino em
Pendências.

### Conferência contra o plano

- Arquivos: os sete da lista da T05 (`demandas.ts`, `versoes.ts`, `decisao.ts`, `imutabilidade.test.ts`,
  `0002_brown_jackal.sql`, `0003_rls_privilegios_dominio.sql`, `schema/index.ts`, `privilegios.ts`), mais os snapshots
  e o `_journal.json` gerados. Fora da lista: `src/db/transacao.ts` e o seu teste, que a revisão da T04 mandou para cá
  (parecer 2), e `src/db/schema/dominio.test.ts`, que só tem teste. Os dois desvios são aceitos.
- Tabelas: as nove da T05, com as colunas do plano. As enumerações são `text` + `CHECK`, as listas são `jsonb`, os
  quatro índices de `demanda` estão lá e há um a mais em `(criada_em)` para a fila sem filtro. Tem o índice parcial de
  `entrada_bruta`, o de `entrada_pendente`, o único `(demanda_id, versao)` nas três versões e o
  `CHECK (status_decisao <> 'aprovada' or opcao_escolhida is not null)`. `execucao_agente_id` fica sem FK, como o plano
  manda.
- Sequência: `START 1 MINVALUE 1 MAXVALUE 9999 NO CYCLE CACHE 1`, em `SEQUENCIAS` com `USAGE`. O teste vê o 2200H ao
  passar de 9999 (RNF-09).
- Privilégios: a 0003 é o espelho exato de `PRIVILEGIOS`. As cinco tabelas imutáveis têm só `SELECT, INSERT`; a
  `entrada_bruta` tem `UPDATE` só em `texto`, `origem` e `expurgada_em` (C-34); a `entrada_pendente` tem os quatro
  privilégios (T-01). A guarda da T04 (tabela, coluna e sequência nos dois sentidos) passa com as regras novas.
- Restrições a mais (id pela regex, id de ESP, RSK e DEC derivado da demanda e da versão, DEC que só cita versão da
  própria demanda, `rascunho_agente` igual a `autor_tipo = 'agente'` nos artefatos, listas e objetos jsonb, estados do
  expurgo, documento da administradora, opção só na decisão aprovada). Conferi cada uma contra o que as T14 a T22
  gravam:
  - id: `proximoIdDemanda` (T14) e `idVersao` geram exatamente o formato conferido.
  - DEC: `criarPacoteDecisao` (T20) cita ESP e RSK de maior versão da mesma demanda.
  - autoria: `criarEspecificacao` (T18) grava `rascunho_agente = ator.tipo === 'agente'`.
  - documento: `registrarDecisao` (T21) exige referência e data para o papel `administradora` nos dois modos de P1-a
    (CA-14.3).
  - decisão: `devolvida` e `arquivada` não levam opção no schema da T21.
  - descrição: `descricaoDaDemanda` (T20) devolve texto, nunca nulo.

  Nenhuma restrição recusa o que o plano manda gravar. Todas são aceitas: põem no banco a integridade que o serviço
  confere antes.
- `UPDATE` por coluna em `demanda` no lugar do `UPDATE` da tabela inteira do plano: aceito. Deixa `id`, autoria e
  criação imutáveis também para o app (C-11, C-34). Há um reparo no parecer 1.
- Volta das duas migrations em Decisões tomadas da entrega, com o SQL. A volta da 0002 apaga dado e só vale com o
  backup; a da 0003 só mexe em privilégio.
- Parecer 2 da T04 fechado. `comTransacao` põe um ouvinte de `error` na conexão emprestada e devolve com
  `release(erro)` quando o `rollback` falha ou a conexão cai. O teste derruba a conexão pela própria transação e confere
  três coisas: o processo segue, o pid morto não volta e as 10 transações seguintes gravam. A falha antes do código
  está na entrega (`Uncaught Exception: Connection terminated unexpectedly`). O parecer 1 da T04 já estava fechado pelo
  teste de sequências da `06-T04-testes` (`privilegios.test.ts:152`), que agora cobre a `demanda_seq`.
- TDD: a falha antes do código está na entrega: `relation "demanda" does not exist` nos dois arquivos novos e o erro
  não tratado em `transacao.test.ts`.
- Rodei de novo: `pnpm test` com 21 arquivos e 375 de 375; `pnpm lint` e `pnpm typecheck` limpos.

### Checklist da seção 12 do padrão técnico

- [x] Faz o que o plano pede. Os acréscimos são os desvios aceitos acima, e nenhum arquivo fora da tarefa mudou além
  do que a revisão da T04 mandou para cá.
- [x] Há teste para cada comportamento novo, e ele falharia sem o código. A falha foi vista antes do esquema e da
  correção de `comTransacao`. Cada `CHECK` de enumeração é comparado com a lista exportada, e o `EXPLAIN` confere os 11
  índices.
- [x] Nenhum segredo, valor de `.env` ou dado pessoal real. Os dados são fictícios (`Pessoa Ficticia`,
  `DOC-FICTICIO-1`, `u-ficticio`).
- [x] Entrada externa com Zod: não se aplica, porque a tarefa não tem rota, Server Action nem entrada de fora.
- [x] Banco: a 0002 saiu do `pnpm db:generate` sem edição. O SQL à mão fica só na custom `rls_privilegios_dominio`,
  aplicada pelo migrator. Nenhuma migration commitada foi editada. Não há `tenant_id` nem RLS, porque o sistema tem um
  cliente só.
- [x] Nada duplica função existente. As listas de enumeração passam a ter uma fonte só, e a decisão abaixo amarra as
  tarefas seguintes a ela. A repetição do `momento` fica no parecer 3 (Minor).
- [x] Textos de interface e axe: não se aplica, porque a tarefa não tem tela.
- [x] Os quatro pareceres abaixo são Minor e foram para Pendências. Não há Critical nem Important.
- [x] `/code-review` e `/security-review` ficam com o PR, na `08-revisao`.

### Pareceres

1. `src/db/privilegios.ts:38` e `drizzle/0003_rls_privilegios_dominio.sql:5`, Minor.
   - Problema: o app tem `UPDATE` em `demanda.rascunho_agente`, mas nenhum fluxo do plano muda essa coluna. O
     `alterarDemandaSchema` (T15) não pode ter `rascunhoAgente` (G3.9, C-11), e `mudarStatusPeloSistema` só muda
     `status` e `atualizada_em`. A entrega diz que as 15 colunas "são as que o `alterarDemanda` e as transições mudam",
     o que não vale para esta.
   - Razão: `rascunho_agente` é campo de autoria (C-11). Com o `UPDATE` nele, um defeito no serviço apagaria o selo
     "Rascunho de agente" de uma demanda criada pelo orquestrador, e o banco não seguraria. É a barreira que a própria
     tarefa quis pôr em `autor_tipo` e `autor_id`.
   - Não bloqueia: C-34 não lista `demanda`, e a T15 ainda não existe.
   - Correção: numa migration custom nova, `REVOKE UPDATE ("rascunho_agente") ON "demanda" FROM orquestrador_app`;
     tirar a coluna de `colunasUpdate`; em `src/db/imutabilidade.test.ts:54`, trocar a alteração de `rascunho_agente`
     por um caso que espera 42501. Se a T15 achar um fluxo que precise dessa coluna, ela volta a ser concedida com a
     razão escrita.
2. `src/db/index.ts:8`, Minor (achado do engenheiro, confirmado).
   - Problema: `criarPool` não tem ouvinte de `error`. Uma conexão ociosa que o banco derrube (reinício do Postgres,
     `pg_terminate_backend`) emite `error` no pool sem ninguém para receber, e o processo do app ou do worker cai.
   - Razão: é o mesmo defeito que esta tarefa corrigiu para a conexão emprestada. O `pg-pool` repõe o ouvinte ocioso
     na devolução e repassa o erro ao `Pool`.
   - Não bloqueia: o arquivo é da T04 e nenhum processo de longa duração existe ainda.
   - Correção: `pool.on('error', (erro) => log.warn({ evento: 'conexao_perdida', erro }))` em `criarPool`, usando
     `log` de `src/lib/log.ts`, que já reduz o erro a classe e código (C-21). O teste derruba pelo `poolMigrator` uma
     conexão ociosa do `poolApp` e confere que o processo segue e que a próxima consulta responde.
3. `src/db/schema/demandas.ts:7`, `src/db/schema/versoes.ts:9` e `src/db/schema/decisao.ts:9`, Minor.
   - Problema: o ajudante `momento` (`timestamp({ withTimezone: true })`) foi redeclarado em mais três arquivos. Com o
     de `src/db/schema/acesso.ts:8`, são quatro cópias.
   - Razão: um ajuste de tipo de data (precisão, `mode`) teria de ser feito em quatro lugares, e esquecer um daria
     colunas de data diferentes entre tabelas.
   - Não bloqueia: hoje as quatro cópias são iguais.
   - Correção: um `src/db/schema/comum.ts` com `momento`, importado pelos esquemas existentes e pelos da T06.
4. `src/db/schema/dominio.test.ts:270`, Minor.
   - Problema: o `CHECK` `rascunho_agente = (autor_tipo = 'agente')` só é testado em `especificacao_tecnica`. As
     restrições iguais de `parecer_risco` e `pacote_decisao` (`versoes.ts:93`, `decisao.ts:70`) não têm caso.
   - Razão: as duas são restrições novas desta tarefa e sairiam de uma migration futura sem nenhum teste quebrar.
   - Correção: estender o `it.each` aos três artefatos.

## Decisões tomadas

- Status `pronto`: os quatro pareceres são Minor, e a seção 12 manda que só Critical e Important bloqueiem a passagem.
- Desvios do engenheiro aceitos. Todos têm razão escrita e nenhum recusa o que as T14 a T22 gravam, conferido tarefa
  a tarefa acima.
- Fonte única das enumerações (pendência do engenheiro). As T15, T19, T20 e T21 importam de `src/db/schema` as listas
  `TIPOS_DEMANDA`, `STATUS_DEMANDA`, `PAPEIS_SOLICITANTE`, `LINHAS_SERVICO`, `URGENCIAS`, `NIVEIS_RISCO`,
  `NIVEIS_APROVACAO` e `OPCOES_DECISAO`. Quando o plano pede outro nome (`TIPOS`, `STATUS`, `LINHAS`, `NIVEIS`), o
  módulo reexporta com `export { TIPOS_DEMANDA as TIPOS } from '../../db/schema'` e não redeclara a lista. Uma lista
  declarada duas vezes é duplicação que a revisão devolve. O `filtroPacotesSchema` (T20) monta o enum com `'pendente'`
  mais `STATUS_DECISAO`.
- Pareceres 1, 2 e 3 vão para a T06, a próxima tarefa do `engenheiro-dados-bd` em `src/db/`. A T06 já cria uma
  migration custom (`rls_privilegios_agentes`), onde cabe o `REVOKE` do parecer 1 sem migration a mais. É o mesmo
  critério da revisão da T04 com o parecer 2.
- Parecer 4 fica com a `06-T05-testes`, que é a etapa seguinte e é dona do teste.
- `UPDATE` por coluna em `demanda` (pendência do engenheiro mantida): se `alterarDemanda` (T15) precisar de coluna fora
  da lista, a T15 para e a mudança vira migration nova do `engenheiro-dados-bd`. O backend não tem migration na lista
  Pode (G1).

## Pendências

- `06-T05-testes` (`qa-automacao`), parecer 4: estender o teste da restrição `rascunho_agente = (autor_tipo =
  'agente')` a `parecer_risco` e `pacote_decisao`.
- T06 (`engenheiro-dados-bd`), parecer 1: migration custom com
  `REVOKE UPDATE ("rascunho_agente") ON "demanda" FROM orquestrador_app`. A coluna sai de `colunasUpdate` em
  `src/db/privilegios.ts`, e `src/db/imutabilidade.test.ts:54` passa a esperar 42501 para essa coluna.
- T06 (`engenheiro-dados-bd`), parecer 2: `pool.on('error', ...)` em `criarPool`, com o teste da conexão ociosa
  derrubada.
- T06 (`engenheiro-dados-bd`), parecer 3: `momento` em `src/db/schema/comum.ts`, usado pelos esquemas de acesso,
  demandas, versões e decisão e pelos novos da T06.
- T15, T19, T20 e T21 (`engenheiro-backend`): listas de enumeração importadas ou reexportadas de `src/db/schema`, sem
  redeclarar (decisão acima).
- T21 (`engenheiro-backend`): o banco recusa com 23514 a aprovação de papel `administradora` sem referência e data do
  documento. O serviço devolve 400 com os campos antes de gravar (pendência do engenheiro mantida).
- Seguem valendo da T04: papel do app no banco de dev e migrator dono do banco (T33); `realpath` no
  `ehExecucaoDireta` (`09-entrega`); colunas do Better Auth (T08); guarda do esquema `pgboss` (T07).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 7069464978e0e2de19449d4fb02400e6ce59364c` — 16 arquivos: os da T05, `transacao.ts` e o seu teste, a entrega e o registro do maestro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 7069464978e0e2de19449d4fb02400e6ce59364c -- src/db/transacao.ts src/db/transacao.test.ts src/db/privilegios.ts src/db/schema/index.ts drizzle/0003_rls_privilegios_dominio.sql drizzle/meta/_journal.json` — diff da transação, dos privilégios e da migration custom
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 7069464978e0e2de19449d4fb02400e6ce59364c -- drizzle/0002_brown_jackal.sql` — migration de esquema gerada: 1 sequência, 8 tabelas, 8 FKs e 7 índices
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 21 arquivos, 375 de 375
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
