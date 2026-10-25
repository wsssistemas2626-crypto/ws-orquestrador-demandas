---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T06-revisao
agente: tech-lead
leu: [2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T04 a T07 e T23 a T33), 06-T06-engenheiro-dados-bd.md, 06-T05-tech-lead.md, commit bc88cf2, padrao-tecnico.md (seção 12), contrato-passagem.md, 04-seguranca-aplicacao.md (seções 1 e 2), src/db/schema/agentes.ts, src/db/schema/agentes.test.ts, src/db/schema/operacao.test.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T06 (tabelas de agentes, uso de IA, avisos e operação, com sementes e privilégios), commit `bc88cf2`. Não
achei nenhum problema Critical ou Important, e a passagem segue para `06-T06-testes`. Há um parecer Minor, sobre a
interface da T27 e da T29, com destino em Pendências.

### Conferência contra o plano

- **Arquivos.** Estão os cinco da lista da T06 (`agentes.ts`, `operacao.ts`, `sementes.test.ts`, `0004_busy_jigsaw.sql`,
  `0005_rls_privilegios_agentes.sql`) e os dois modificados (`schema/index.ts`, `privilegios.ts`), mais os snapshots e o
  `_journal.json` gerados. Fora da lista:
  - `src/db/index.ts`, `src/db/imutabilidade.test.ts`, `src/db/schema/comum.ts` e os cinco esquemas que passam a usar
    `momento`: são os pareceres 1, 2 e 3 que a `06-T05-tech-lead.md` mandou para esta tarefa;
  - `agentes.test.ts`, `operacao.test.ts` e `index.test.ts`: só têm teste.

  Aceito os dois desvios. Nenhuma migration já commitada mudou: o commit só cria a 0004 e a 0005 e acrescenta as
  entradas delas no `_journal.json`.
- **Tabelas.** Estão as oito da T06, com as colunas do plano. `uso_ia` não tem coluna de prompt, resposta nem texto
  (CA-17.3). Os dois índices de `execucao_agente` e o de `uso_ia` estão criados. Há um índice a mais em
  `worker_batimento(visto_em)`, para `situacaoDoWorker` (T29).
- **Sementes.** Os quatro agentes nascem desligados e sem modelo (CA-19.1), e `configuracao_ia` nasce com `id = 1`,
  teto `0` e moeda `USD` (RF-18, P1-f). Teto zero suspende todos os agentes (CA-18.3).
- **Privilégios.** A 0005 é o espelho exato de `PRIVILEGIOS`. O plano pedia `UPDATE` na tabela inteira; a tarefa deu
  `UPDATE` por coluna em `configuracao_agente`, `configuracao_ia`, `execucao_agente`, `aviso_email` e
  `rotina_execucao`. Aceito, com o mesmo critério da T05: chave, agente, entrada, demanda, criação e moeda ficam
  imutáveis também para o app. Conferi as colunas liberadas contra o que cada tarefa seguinte grava, e todas cabem:
  - T23: `alterarAgente` muda `ligado`, `modelo` e o autor; `definirTeto` muda `teto_mensal` e o autor.
  - T27: `reivindicar` muda `status`, `bloqueada_ate`, `tentativas` e `atualizada_em`. O reagendamento muda
    `proxima_tentativa_em`, e o fim muda `artefato_id`.
  - T28: a execução do orquestrador não troca `demanda_id`, e o id da demanda criada vai em `artefato_id`.
  - T29: o batimento faz upsert e apaga em `worker_batimento`, onde o app tem os quatro privilégios.
  - T30: `agendarAviso` usa `insert ... on conflict do nothing`; o envio muda `status`, `tentativas`, `id_provedor`,
    `enviado_em` e `atualizado_em`.
  - T31: o upsert de `rotina_execucao` muda só `ultima_execucao_em` e `quantidade`.
  - T33: `definirPrecoModelo` só inclui.

  A guarda da T04 (`privilegios.test.ts`) passa com as oito regras novas.
- **Restrições a mais.** São estas: ligado exige modelo, valores não negativos, moeda só USD, uma linha em
  `configuracao_ia`, chave de entrada coerente com o agente e só com id (C-22), `concluida` com artefato,
  `em_andamento` com trava, `enviado` com data e rotina na lista. Conferi cada uma contra o plano:
  - as chaves são as de T28 (`entrada:<uuid>`, `demanda:<DEM>`, `esp:<ESP>`, `rsk:<RSK>`);
  - a `reivindicar` da T27 grava `bloqueada_ate` junto com `em_andamento`;
  - a `concluida` da T27 grava `artefato_id`;
  - o 409 da T23 chega antes do `CHECK` de ligado com modelo;
  - o `numeric(12,2)` do teto comporta o `\d{1,10}` com duas casas de `definirTetoSchema`.

  Nenhuma restrição recusa o que o plano manda gravar, e aceito todas. Também aceito `tentativas` só com `>= 0`, sem
  teto em 3: a razão escrita pelo engenheiro (a reivindicação da varredura não pode falhar com 23514 dentro do worker)
  está certa.
- **Pareceres da T05.**
  - 1: o `REVOKE UPDATE ("rascunho_agente")` está na 0005, a coluna saiu de `colunasUpdate`, e
    `imutabilidade.test.ts` espera 42501 para essa coluna.
  - 2: `criarPool` ganhou o ouvinte de `error`. O teste derruba uma conexão ociosa e confere três coisas: o processo
    segue, a conexão é trocada, e o log tem só `level`, `time`, `evento` e o `erro` com o código `57P01`.
  - 3: `momento` agora tem uma definição só, em `comum.ts`. O `db:generate` não gerou diferença nas tabelas antigas.
- **Volta das migrations.** Está em Decisões tomadas da entrega, com o SQL:
  - a da 0004 apaga dado e só vale com o backup;
  - a da 0005 devolve o `UPDATE` de `rascunho_agente`, tira os privilégios e apaga as sementes. Teto e interruptores
    alterados precisam ser anotados antes de voltar.
- **TDD.** A falha antes do código está na entrega: `relation "configuracao_agente" does not exist` e o `57P01` sem
  tratamento no pool.
- **Rodei de novo:** `pnpm test` com 26 arquivos e 522 de 522; `pnpm lint` e `pnpm typecheck` limpos.

### Checklist da seção 12 do padrão técnico

- [x] A tarefa faz o que o plano pede. Os acréscimos são os desvios aceitos acima. Os arquivos fora da lista são os
  que a revisão da T05 mandou para cá, mais arquivos que só têm teste.
- [x] Há teste para cada comportamento novo, e ele falharia sem o código:
  - sementes;
  - privilégio por coluna e 42501 em cada caso proibido;
  - cada `CHECK` com o nome da restrição;
  - FKs;
  - a reivindicação condicional da ADR-07;
  - enumerações comparadas às listas exportadas, inclusive `token_servico_agente_check` contra `AGENTES`;
  - `EXPLAIN` das 8 consultas.

  A falha foi vista antes do esquema e do ouvinte do pool.
- [x] Nenhum segredo, valor de `.env` ou dado pessoal real. Os dados são fictícios: `Pessoa Ficticia`, `u-ficticio`,
  `modelo-ficticio`, `instancia-ficticia-1` e `SENTINELA-texto do cliente`.
- [x] Entrada externa com Zod: não se aplica, porque a tarefa não tem rota, Server Action nem entrada de fora.
- [x] Banco: a 0004 saiu do `pnpm db:generate` sem edição. O SQL escrito à mão fica só na custom
  `rls_privilegios_agentes`, aplicada pelo migrator. Não há `tenant_id` nem RLS, porque o sistema tem um cliente só.
- [x] Nada duplica função existente. `momento` e `AGENTES` têm agora uma fonte só, e `token_servico.agente` usa o
  tipo `Agente`. A lista literal repetida dentro dos `CHECK` é o padrão aceito na T05, com o teste que a compara à
  constante.
- [x] Textos de interface e axe: não se aplica, porque a tarefa não tem tela.
- [x] O parecer abaixo é Minor e foi para Pendências. Não há Critical nem Important.
- [x] `/code-review` e `/security-review` ficam com o PR, na `08-revisao`.

### Pareceres

1. `src/db/schema/agentes.ts:87`, Minor. É a pendência do engenheiro, confirmada. A falha está na interface das T27 e
   T29, não no esquema.
   - Problema: `proxima_tentativa_em` nasce nula. A varredura de `batimento` (T29) só reenfileira a execução
     `pendente` com `proxima_tentativa_em` vencida. Se `criarExecucao` (T27) não preencher essa coluna, a varredura
     nunca vê uma primeira tentativa cujo job se perdeu (worker caído entre o commit e o `work`, ou job expirado), e a
     execução fica `pendente` para sempre. Como a chave `(agente, chave_entrada)` é única, nenhum disparo novo a
     substitui.
   - Razão: a varredura existe para recuperar exatamente esse caso (ADR-06). Com a coluna nula, ela só cobre a segunda
     e a terceira tentativa.
   - Não bloqueia: o esquema já aceita o valor, e o índice `(status, proxima_tentativa_em)` serve à consulta. A
     correção não precisa de migration.
   - Correção: na T27, `criarExecucao` grava `proxima_tentativa_em = relogio.agora()`, o mesmo valor de `criada_em`.
     Na T29, `batimento.test.ts` ganha um caso: uma execução recém-criada cujo job sumiu é reenfileirada depois de
     1 minuto.

## Decisões tomadas

- Status `pronto`: o único parecer é Minor, e a seção 12 manda que só Critical e Important bloqueiem a passagem.
- Aceito todos os desvios do engenheiro: `UPDATE` por coluna, as restrições, as FKs e o índice a mais, as listas
  exportadas e os arquivos dos pareceres da T05. Cada um tem razão escrita, e nenhum recusa o que as T23 a T33
  gravam, como a conferência por tarefa acima mostra.
- Parecer 1: a correção fica na T27, porque `criarExecucao` é da T27. O caso de teste fica na T29, porque o arquivo
  `batimento.test.ts` é da T29. Assim nenhuma das duas tarefas espera a outra.
- Fonte única de `AGENTES`: na T10, `src/modules/acesso/ator.ts` reexporta `AGENTES` e `Agente` de `src/db/schema`, sem
  redeclarar. É a mesma regra da decisão de enumerações da `06-T05-tech-lead.md`, e o G5 do plano passa a ser lido
  assim.
- Planos com volume: os de `uso_ia_ocorrido_idx` e de `execucao_agente_demanda_status_idx` ficam com a T35, como o
  engenheiro registrou.

## Pendências

- T27 (`engenheiro-backend`), parecer 1: `criarExecucao` grava `proxima_tentativa_em = relogio.agora()`. Também na T27:
  - a chave sai no formato da T28, porque fora dele o banco devolve 23514;
  - `concluida` vai com `artefato_id`, e `em_andamento` vai com `bloqueada_ate`;
  - o app só muda as seis colunas de estado de `execucao_agente`.
- T29 (`engenheiro-backend`), parecer 1: caso em `batimento.test.ts` para a primeira tentativa com o job perdido,
  reenfileirada depois de 1 minuto.
- T10 (`engenheiro-backend`): `ator.ts` reexporta `AGENTES` e `Agente` de `src/db/schema` com
  `export { AGENTES, type Agente } from '../../db/schema'`.
- T23 (`engenheiro-backend`):
  - o 409 de "ligar sem modelo com preço vigente" sai antes de gravar, porque o banco recusaria com 23514;
  - o app não muda `moeda` nem `id` de `configuracao_ia`.
- T28 (`engenheiro-backend`): `execucao_agente.demanda_id` não muda depois de criada. A execução do orquestrador fica
  com `demanda_id` nulo e leva o id da demanda em `artefato_id`.
- T30 (`engenheiro-backend`): `agendarAviso` usa `insert ... on conflict (pacote_decisao_id) do nothing`, e `enviado`
  exige `enviado_em`.
- T31 (`engenheiro-backend`): o upsert de `rotina_execucao` muda só `ultima_execucao_em` e `quantidade`. Uma rotina
  nova pede migration de `CHECK` do `engenheiro-dados-bd`.
- T35 (`engenheiro-dados-bd`): repetir com volume os planos de `uso_ia_ocorrido_idx` e de
  `execucao_agente_demanda_status_idx`.
- Seguem valendo das revisões anteriores:
  - da T04: papel do app no banco de dev e migrator dono do banco (T33); `realpath` no `ehExecucaoDireta`
    (`09-entrega`); colunas do Better Auth (T08); guarda do esquema `pgboss` (T07);
  - da T05: listas de enumeração importadas de `src/db/schema` (T15, T19, T20, T21); 400 antes do 23514 do documento
    da administradora (T21).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat bc88cf2f1508e90b9bb7ed6a96f8c13293d5ff5d` — 23 arquivos: os da T06, os dos pareceres da T05, a entrega e o registro do maestro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -n 8` — último commit `bc88cf2` (06-T06-construcao), sobre `518ac2d` (06-T05-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show bc88cf2f1508e90b9bb7ed6a96f8c13293d5ff5d -- src/db/schema/agentes.ts src/db/schema/operacao.ts src/db/schema/comum.ts src/db/schema/index.ts src/db/privilegios.ts src/db/index.ts drizzle/0004_busy_jigsaw.sql drizzle/0005_rls_privilegios_agentes.sql drizzle/meta/_journal.json` — diff dos esquemas, dos privilégios, do pool e das duas migrations
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show bc88cf2f1508e90b9bb7ed6a96f8c13293d5ff5d -- src/db/index.test.ts src/db/sementes.test.ts src/db/imutabilidade.test.ts src/db/schema/acesso.ts src/db/schema/decisao.ts src/db/schema/demandas.ts src/db/schema/historico.ts src/db/schema/versoes.ts` — diff dos testes e dos esquemas que passam a usar `momento`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 26 arquivos, 522 de 522
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
