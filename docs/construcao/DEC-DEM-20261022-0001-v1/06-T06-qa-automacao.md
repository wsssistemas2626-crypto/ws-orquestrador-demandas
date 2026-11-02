---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T06-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (cabeçalho G1 a G6 e T01 e T05 e T06 e início da T07), 01-analista-requisitos.md (RF-01 a RF-20), 06-T06-engenheiro-dados-bd.md, commit bc88cf2, src/db/schema/agentes.ts, src/db/schema/operacao.ts, src/db/schema/comum.ts, src/db/index.ts, src/db/privilegios.ts, src/db/privilegios.test.ts, src/db/sementes.test.ts, src/db/schema/agentes.test.ts, src/db/schema/operacao.test.ts, src/db/index.test.ts, src/db/imutabilidade.test.ts (diff do commit), src/db/transacao.test.ts (início), src/lib/log.ts, test/banco.ts, drizzle/0004_busy_jigsaw.sql, drizzle/0005_rls_privilegios_agentes.sql]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verificação da T06 (tabelas de agentes, uso de IA, avisos e operação, com sementes e privilégios). O código cumpre os
critérios da tarefa e a suíte do engenheiro passa. Acrescentei 25 testes. Eles cobrem o que a suíte não pegava: uma
coluna de conteúdo com outro nome, o padrão da tabela por trás da semente, as bordas da chave de entrada e a
concorrência real entre dois workers.

### Critério da tarefa → teste que o cobre

| Critério (plano T06, 01-analista-requisitos.md) | Teste (arquivo › nome) |
|---|---|
| CA-19.1: os quatro agentes nascem desligados | `src/db/sementes.test.ts` › `os quatro agentes nascem desligados (CA-19.1)` e `os agentes nascem sem modelo e sem autor de alteração`; **novo**: `pelo padrão da tabela, agente incluído sem dizer se está ligado nasce desligado e sem modelo` |
| RF-18: teto inicial zero, em USD (P1-f), base de CA-18.3 | `src/db/sementes.test.ts` › `teto nasce zero, em USD (RF-18, P1-f)` e `configuracao_ia tem uma linha só, a de id 1, sem autor de alteração`; `src/db/schema/agentes.test.ts` › `configuracao_ia: uma linha só, teto não negativo, em USD` (8 casos); **novos**: `pelo padrão da tabela, a linha do teto incluída só com o id nasce com teto zero em USD`, `a transação desfeita deixou as sementes como estavam` e `configuracao_ia tem exatamente as colunas e os tipos esperados` (teto em `numeric(12,2)`) |
| CA-17.3: a tabela de uso não tem coluna com o texto enviado ou recebido | `src/db/sementes.test.ts` › `uso_ia não tem coluna de conteúdo (CA-17.3)` (filtro por nome) e `uso_ia é só de inclusão`; **novo**, por lista de permissão: `src/db/schema/agentes.test.ts` › `uso_ia tem exatamente as colunas e os tipos esperados (...)` |
| RF-17 (base no banco): uso por chamada com custo pela tabela de preço | `src/db/schema/agentes.test.ts` › `preco_modelo: ...` (7) e `uso_ia: uma linha por chamada, ...` (11); **novos**: `o uso do orquestrador, antes de a demanda existir, é registrado sem demanda`, `uso com demanda que não existe é recusado (23503)`, `preco_modelo tem exatamente as colunas e os tipos esperados (...)` |
| C-26 (interruptor e teto: o app liga, desliga e troca o teto, mas não cria nem apaga agente nem a linha do teto, e não troca a moeda; é a leitura de `privilegios.ts` e da 0005) | `src/db/schema/agentes.test.ts` › `configuracao_agente: ...` (7) e `configuracao_ia: ...` (8); **novos**: `configuracao_agente tem exatamente as colunas e os tipos esperados (...)` |
| C-34: o papel do app tem só os privilégios da regra, nas 8 tabelas novas | `src/db/privilegios.test.ts` › `toda tabela do esquema public tem regra, e toda regra tem tabela`, `privilégios de tabela são exatamente os da regra (...)`, `UPDATE por coluna só nas colunas listadas`, `nenhum privilégio por coluna além da regra (...)` e `TRUNCATE é recusado ao app em toda tabela da regra, mutável ou não (42501)`; os casos 42501 de `agentes.test.ts` e `operacao.test.ts`; `src/db/imutabilidade.test.ts` › `mudar rascunho_agente é recusado com o papel do app (42501)` |
| ADR-07 e CA-16.4 (base no banco): uma execução por agente e entrada, reivindicada por um worker só | `src/db/schema/agentes.test.ts` › `a mesma entrada do mesmo agente não entra duas vezes: ...` e `a reivindicação da ADR-07 é um UPDATE condicional: ...`; **novos**, com duas conexões ao mesmo tempo: `duas criações simultâneas da mesma execução: a segunda espera a primeira e não insere nada`, `duas reivindicações simultâneas: só a primeira leva, e a tentativa conta uma vez`, `se o primeiro desiste (rollback), o segundo, que esperava, leva a execução: nenhuma fica perdida` |
| C-22 (base no banco): a chave de entrada só tem id | `src/db/schema/agentes.test.ts` › `%s é recusada (23514)` (6 chaves do engenheiro); **novos**: 7 bordas em `execucao_agente: bordas da chave de entrada (C-22)` (quebra de linha antes e depois do id, chave vazia, só o prefixo, versão com cinco dígitos, prefixo em maiúsculas, espaço à frente), `a versão de quatro dígitos, o limite de G3.10, entra` e `execucao_agente tem exatamente as colunas e os tipos esperados (...)` |
| CA-25.2 (base no banco): um aviso por DEC | `src/db/schema/operacao.test.ts` › `o app agenda o aviso, que nasce pendente e sem tentativa; agendar de novo não duplica`; **novos**: `o segundo agendamento espera o primeiro e não insere nada` (concorrente) e `aviso_email tem exatamente as colunas e os tipos esperados` (sem destinatário nem corpo) |
| Parecer 1 da T05 (`rascunho_agente` fora do UPDATE do app) | `src/db/imutabilidade.test.ts` › `mudar rascunho_agente é recusado com o papel do app (42501)`; a guarda de `privilegios.test.ts` confere a coluna fora de `colunasUpdate` |
| Parecer 2 da T05 (ouvinte de `error` no pool) | `src/db/index.test.ts` › `conexão ociosa derrubada pelo banco: ...` e `a linha do log tem só o evento e o erro reduzido a classe e código, ...` |
| Parecer 3 da T05 (`momento` único) | Sem comportamento novo. As listas de colunas novas conferem `timestamp with time zone` em todas as datas das 8 tabelas |

### Testes acrescentados (25)

- `src/db/schema/agentes.test.ts` (+18):
  - lista de colunas e tipos por permissão de `uso_ia`, `execucao_agente`, `configuracao_agente`, `configuracao_ia` e
    `preco_modelo` (5);
  - bordas da chave de entrada (8);
  - `uso_ia` sem demanda e com demanda inexistente (2);
  - concorrência da criação e da reivindicação da execução (3).
- `src/db/schema/operacao.test.ts` (+4): lista de colunas de `aviso_email`, `worker_batimento` e `rotina_execucao` (3) e
  agendamento concorrente do aviso (1).
- `src/db/sementes.test.ts` (+3): padrão da tabela para agente e teto, numa transação desfeita (2), e a conferência de
  que as sementes ficaram intactas (1).

### Resultado

- `pnpm test`: 26 arquivos, 547 de 547 (522 de antes + 25 novos), 0 falhas, em duas rodadas seguidas.
- `pnpm lint`: limpo. `pnpm typecheck`: limpo.
- `git diff`: só os 3 arquivos de teste. 268 linhas entraram e 1 saiu: a linha de `import` do vitest em
  `agentes.test.ts`, trocada por outra com `afterEach` e `beforeEach`. Nenhum teste apagado, nenhum `.skip`, `.only` ou
  `.todo`, nenhuma asserção afrouxada.

## Decisões tomadas

- Lista de colunas por permissão, e não só o filtro por nome de CA-17.3: com o filtro, uma coluna `saida`, `payload` ou
  `corpo` passaria. Cada tabela tem agora a lista exata de nome e tipo. O tipo também prende `numeric` no teto, no
  preço e no custo: trocar por ponto flutuante quebra o teste.
- Padrão da tabela conferido à parte da semente: a semente explícita da 0005 esconderia um `DEFAULT` errado. A linha é
  refeita só com a chave, numa transação do migrator desfeita no fim, e outro teste confere que as sementes ficaram
  como estavam.
- Concorrência com duas conexões reais, sem `sleep`: a segunda só segue quando o `pg_locks` mostra a trava em espera.
  Assim o teste prova a espera de verdade, e não uma execução em série que passaria por acaso. A espera é por
  `expect.poll`, sem relógio nem data real nas asserções. Todas as datas gravadas são fixas (`QUANDO`).
- O caso de rollback na reivindicação entrou porque é o que garante a ADR-07 quando um worker cai no meio: a execução
  não fica presa nem perdida.
- Cada teste novo usa chave, demanda ou DEC próprios (`DEM-20261022-0710` a `0712`, `v9999`, `v21`, `DEC-...-v5`).
  Nenhum depende do que o outro gravou, e nenhum muda dado que os testes do engenheiro conferem.
- C-26 foi mapeado pelo texto do plano e pelo comentário de `privilegios.ts` e da 0005 (interruptor e teto), sem ler o
  `04-seguranca-aplicacao.md`, que não está na minha lista Lê.
- Não subi o banco de desenvolvimento: a suíte usa o Testcontainers, como na T04 e na T05.

## Pendências

- Minor, para o tech-lead decidir (o teste é da T06; o ambiente do CI é da `09-entrega`): `src/db/index.test.ts` espera a linha `warn` (level 40) do
  `log`. O nível vem de `LOG_LEVEL` (`src/lib/log.ts`), e com `LOG_LEVEL=error` no ambiente do CI os dois testes
  falham sem erro no código. Proposta: o teste fixar o nível (`vi.stubEnv('LOG_LEVEL', 'info')` antes de
  `substituirDestinoDoLog`), ou o CI não definir `LOG_LEVEL`. Não mexi: o teste é do engenheiro e hoje passa.
- Minor, para a T23 (`engenheiro-backend`): o banco aceita `ligado = true` com `modelo = ''` e `preco_modelo.modelo =
  ''`, porque o `CHECK` só exige o valor não nulo. O schema Zod de `alterarAgente` e do script de preço (T33) precisa
  recusar modelo vazio.
- Segue a pendência Minor do engenheiro (T27/T29): `proxima_tentativa_em` nula na primeira tentativa deixa fora da
  varredura o primeiro job perdido.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat bc88cf2f1508e90b9bb7ed6a96f8c13293d5ff5d` — 23 arquivos da T06
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h%x20%s -n 30` — local do plano e últimos commits, HEAD `af9d888` (06-T06-revisao)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat --format=%h HEAD~0 -- docs/construcao/DEC-DEM-20261022-0001-v1/01-analista-requisitos.md` — sem saída (o arquivo não mudou no último commit)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show bc88cf2f1508e90b9bb7ed6a96f8c13293d5ff5d -- src/db/index.ts src/db/privilegios.ts src/db/imutabilidade.test.ts src/db/schema/acesso.ts src/db/schema/comum.ts src/db/schema/historico.ts src/db/schema/demandas.ts src/db/schema/index.ts` — diff dos arquivos modificados
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — antes dos testes novos: 26 arquivos, 522 de 522
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/db/schema/agentes.test.ts src/db/schema/operacao.test.ts src/db/sementes.test.ts` — 3 arquivos, 121 de 121
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 26 arquivos, 547 de 547
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 26 arquivos, 547 de 547 (segunda rodada)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 3 arquivos de teste, 268 inserções e 1 remoção
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --unified=0 src/db/schema/agentes.test.ts src/db/schema/operacao.test.ts src/db/sementes.test.ts` — só acréscimos e a troca da linha de `import`

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
