---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T03-testes
agente: qa-automacao
leu: [pedido.json (via tarefas e plano), contrato-passagem.md, padrao-tecnico.md (seções 5 a 7), tarefas.json, 2026-11-13-ws-orquestrador-demandas-sobras-plano.md (G0 a G7 e T03), 01-analista-requisitos.md (RF-02, RNF-08, RNF-09), 04-seguranca-aplicacao.md (SB-07, SB-09, SB-10), 06-T02-qa-automacao.md (cabeçalho), 06-T03-engenheiro-dados-bd.md, 06-T03-tech-lead.md, git show 79f6511, drizzle/meta/_journal.json, drizzle/meta/0010_snapshot.json (trecho), src/db/schema/caminhos-da-criacao.test.ts, test/estatico/migration-0010.test.ts, test/estatico/migration-0008.test.ts, test/estatico/piso-de-assercoes.test.ts, src/modules/pacotes-decisao/consultas.ts, test/transversal/visibilidade-andamento.test.ts, test/banco.ts, test/pedidos-construcao.ts, test/requisicao.ts, test/sessao.ts (trecho), saída do pnpm test em /tmp]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verificação da T03 (coluna `pacote_decisao.caminhos_com_nome_na_criacao` e migration `0010`; RNF-08, SB-10, SB-07 d,
ADR-37 na forma), commit `79f6511`. O código passa nos testes do engenheiro e nos desta etapa. Não achei defeito e não
devolvo nada. Esta etapa acrescenta duas provas que o maestro pediu: a coluna não vaza para nenhuma vista nem saída
(SB-09), e nenhuma migration da `main` mudou (SB-10, G4). As duas entram no `PISO`.

**Critério da tarefa → teste que o cobre**

| Critério | Arquivo | Teste |
|---|---|---|
| SB-10 / RNF-08: uma migration nova, gerada, sem custom | `test/estatico/migration-0010.test.ts` (engenheiro) | "a 0010 é a última e a única nova, e não é custom (nome gerado, sem rls_)" |
| SB-10: só o `ADD COLUMN` anulável e sem padrão, sem GRANT | `test/estatico/migration-0010.test.ts` (engenheiro) | "a 0010 é só o ADD COLUMN anulável e sem padrão" |
| SB-10: só aditiva no esquema (nenhuma tabela, índice, FK, CHECK, política, papel ou sequência a mais ou a menos) | `test/estatico/migrations-congeladas-qa.test.ts` (novo) | "o snapshot da 0010 é o da 0009 mais a coluna nova, anulável e sem padrão, e nada mais (só aditiva)" |
| SB-10 / G4: nenhuma migration da `main` editada | `test/estatico/migrations-congeladas-qa.test.ts` (novo) | "as dez migrations e os dez snapshots da main têm o SHA-256 de 41108ee"; "as entradas 0 a 9 do diário são as de 41108ee, campo a campo, e o cabeçalho do diário não muda" |
| SB-10: nenhuma migration fora do diário (SQL solta, snapshot a mais) | `test/estatico/migrations-congeladas-qa.test.ts` (novo) | "drizzle/ só tem as migrations do diário, e drizzle/meta/ só o diário e um snapshot por migration" |
| ADR-37 (forma): `text[]`, anulável, sem padrão; 21 colunas | `src/db/schema/caminhos-da-criacao.test.ts` (engenheiro) | "a coluna é text[], anulável e sem padrão"; "pacote_decisao tem 21 colunas: as 20 de 41108ee e a nova" |
| ADR-37: o DEC anterior à 0.4.1 fica `null` (sem reescrever dado, `alteram_dado: false`) | `src/db/schema/caminhos-da-criacao.test.ts` (engenheiro) | "o DEC inserido sem a coluna fica com null (o DEC anterior à 0.4.1)" |
| SB-07 (d): o app inclui | `src/db/schema/caminhos-da-criacao.test.ts` (engenheiro) | "o papel do app inclui um DEC com a coluna preenchida e outro com a lista vazia" |
| SB-07 (d): o app não altera (42501, tabela igual) | `src/db/schema/caminhos-da-criacao.test.ts` (engenheiro); `src/db/imutabilidade.test.ts` (G5) | o `it.each` dos três `UPDATE`; "update pacote_decisao set caminhos_com_nome_na_criacao = $1 é recusado com o papel do app" |
| SB-09 (pedido do maestro): a coluna não sai em vista de pessoa | `test/transversal/visibilidade-caminhos-da-criacao-qa.test.ts` (novo) | "controle: a pessoa lê o DEC do cenário (200, a vista inteira)…"; "toda leitura GET que a matriz dá à pessoa responde 200 sem a chave nem a sentinela" |
| SB-09: a coluna não sai em vista de agente, a partir da `MATRIZ` | `test/transversal/visibilidade-caminhos-da-criacao-qa.test.ts` (novo) | "varre MATRIZ × rotas × quatro agentes: nenhuma resposta tem a chave nem a sentinela" |
| SB-09: a entrada do provedor não tem a coluna | `test/transversal/visibilidade-caminhos-da-criacao-qa.test.ts` (novo) | "a entrada montada para o provedor falso, nos quatro agentes, não tem a chave nem a sentinela" |
| SB-09 / RNF-09: evento e log sem a coluna | `test/transversal/visibilidade-caminhos-da-criacao-qa.test.ts` (novo) | "nenhum evento (antes ou depois) e nenhuma linha de log têm a chave ou a sentinela" |

**Testes acrescentados**

1. `test/transversal/visibilidade-caminhos-da-criacao-qa.test.ts` (7 testes, 19 linhas `expect(`; Postgres real, rotas e
   tokens reais, relógio fixo). O cenário é um DEC aprovado de pessoa, feito pelo caminho real (`preparadorDePedidos`,
   sem gerar pedido). Depois, a coluna recebe pelo migrator a sentinela `sentinela.qa-caminho-da-criacao-5517`, que não
   é caminho da lista fechada e só existe neste banco. A varredura parte de `MATRIZ` e das rotas do disco, como no AN-09.
   Ela cobre toda leitura GET que a matriz dá à pessoa (exige 200 e inclui as três leituras de DEC) e toda rota de toda
   ação com agente na linha, chamada pelos quatro agentes (exige 200 na leitura permitida e ao menos um 2xx por ação, e
   inclui `ler_pacote_decisao`). Também cobre a entrada do provedor falso, os eventos (`antes` e `depois`) e o log.
   Nenhuma saída tem a chave (`/caminhos_?com_?nome/i`, nos nomes camelCase e snake_case) nem a sentinela. Dois testes
   de controle garantem que o detector pega cada forma e que a sentinela está no banco. Este arquivo trava o Minor da
   revisão (`selecao` lê `p` inteiro em `consultas.ts:90`): um `...p` futuro em `vistaDe` ou na vista mínima falha
   aqui. Ele não substitui o arquivo do SB-09 (a, b) da T04 (D-05), que tem nome próprio.
2. `test/estatico/migrations-congeladas-qa.test.ts` (4 testes, 12 linhas `expect(`). As 10 SQL e os 10 snapshots de
   `0000` a `0009` ficam presos pelo SHA-256 dos bytes, e as entradas 0 a 9 do diário ficam presas campo a campo
   (`idx`, `version`, `when`, `tag`, `breakpoints`). Os valores vêm da árvore com `git diff 41108ee --stat -- drizzle`
   mostrando só a `0010`, o snapshot dela e o diário, ou seja, são os de `41108ee`. A pasta `drizzle/` tem exatamente as
   migrations do diário. O snapshot `0010` encadeia no `0009` e é igual a ele, exceto pela coluna nova
   (`{ type: 'text[]', primaryKey: false, notNull: false }`): todas as outras tabelas, as outras colunas de
   `pacote_decisao`, os índices, FKs, CHECKs, políticas, papéis, enums, sequências e vistas são iguais.
   - Visto falhando: com a tabela de hashes vazia, o teste "as dez migrations e os dez snapshots…" falhou (`expected
     { …(20) } to deeply equal {}`). A saída trouxe os 20 hashes atuais, que entraram como valor esperado.
3. `test/estatico/piso-de-assercoes.test.ts`: só acréscimo, com os dois arquivos acima (19 e 12). A contagem foi
   conferida pondo 20 e 13 de propósito: o piso falhou com `expected 19…` e `expected 12…`, e os valores voltaram a 19 e 12.

**Resultado**

- `pnpm test` (suíte inteira): **362 de 362 arquivos, 7921 de 7921 testes, 0 falhas** (177 s).
- `pnpm lint`: limpo. `pnpm typecheck`: limpo.
- Arquivos da etapa com o piso: 4 de 4 arquivos, 161 de 161 testes.

**Testes existentes alterados pela T03 (conferidos com `git show 79f6511`)**: `src/db/imutabilidade.test.ts` só ganha
um caso no `it.each` (23 linhas `expect(`, igual). `test/estatico/migration-0008.test.ts` troca a lista inteira fixa e
o `entries[9]` pelo `find` dos índices 8 e 9, como a G5 manda (6 linhas, igual). A asserção da lista inteira de índices
passou para `migration-0010.test.ts` com o 10, e as entradas 0 a 9 ficam presas campo a campo no teste novo desta
etapa. Nenhum `.skip`, `.only` ou `.todo`, e nenhuma asserção afrouxada.

## Decisões tomadas

- A prova do SB-09 é dinâmica, pelas rotas reais a partir da `MATRIZ`, e não estática: o risco real é o `p: pacoteDecisao` inteiro em `selecao`, que só um teste de saída pega.
- A sentinela fora da lista fechada é de propósito: um caminho válido (`demanda.titulo`) poderia aparecer em texto legítimo e enfraquecer o "não contém". O cenário não gera pedido, então a T05 (que vai conferir o formato na geração) não quebra este teste.
- O arquivo novo do SB-09 tem o sufixo `-qa` para não colidir com `test/transversal/visibilidade-caminhos-da-criacao.test.ts`, que a D-05 reserva para a T04.
- O SHA-256 dos bytes foi escolhido em vez de comparar com o git: o teste roda sem histórico (CI com clone raso) e quebra em qualquer edição de migration da `main`, inclusive de espaço.
- O teste "só aditiva" compara o snapshot `0010` com o `0009`, que são arquivos fixos: ele não quebra quando vier uma `0011`. O teste da pasta lê o diário e acompanha a próxima migration sozinho.
- Os testes novos não dependem de ordem: o controle de eventos usa o `pacote_decisao_criado` do `beforeAll`, e as asserções de ausência valem com ou sem as gravações da varredura de agentes.

## Pendências

- Para a revisão da T04: o arquivo do SB-09 (a, b) da T04 continua obrigatório (D-05). O desta etapa cobre só a ausência da chave e do valor, e não confere que as chaves das vistas são as da 0.4.0.
- Para a T09: `src/db/imutabilidade.test.ts` (23) e `test/estatico/migration-0008.test.ts` (6) seguem fora do `PISO`. O plano (linha 1703) põe a `migration-0008` na T09. A `imutabilidade` cobre o SB-07 (d) e é candidata.
- Comandos fora da regra do maestro, declarados abaixo para registro: o `git -C` na estruturaAutonoma (lista de seções do `padrao-tecnico.md`; o arquivo foi lido depois com Read), o `git status --short` (opção) e o `grep -n` na saída da suíte em `/tmp` (deveria ter sido Read). Os três só leem e não mudaram nada.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files docs/construcao/DEC-DEM-20261111-0018-v1` — 18 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T03" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md` — T03 na linha 701
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "RNF-08\|CA-02\|RF-02" -- docs/construcao/DEC-DEM-20261111-0018-v1/01-analista-requisitos.md` — RNF-08 na linha 263
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "SB-07\|SB-09\|SB-10" -- docs/construcao/DEC-DEM-20261111-0018-v1/04-seguranca-aplicacao.md` — linhas 205 a 208
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 79f65116cd2a7cc8e7c434cacf9f8243a6e2fff6 --stat` — 11 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 79f65116cd2a7cc8e7c434cacf9f8243a6e2fff6 -- src/db/imutabilidade.test.ts src/db/schema/decisao.ts test/estatico/migration-0008.test.ts test/estatico/piso-de-assercoes.test.ts drizzle/0010_magical_cammi.sql drizzle/meta/_journal.json` — diff lido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files test/estatico test/transversal drizzle` — lista
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -i "pacote_decisao" -- drizzle/0003_rls_privilegios_dominio.sql drizzle/0005_rls_privilegios_agentes.sql drizzle/0009_rls_andamento_construcao.sql` — só o GRANT SELECT, INSERT da 0003
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files test` — lista
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "imutabilidade\|migration-0008\|privilegios" -- test/estatico/piso-de-assercoes.test.ts` — só privilegios (39)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files src/app/api` — lista
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export" -- test/sessao.ts test/deps.ts src/modules/acesso/ator.ts` — assinaturas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export const MATRIZ\|export type Regra\|papeis\|agentes:" -- src/modules/acesso/matriz.ts` — formato da linha
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "conferir\|export const" -- src/app/api/pacotes-decisao/[decId]/pedido-construcao/route.ts src/modules/pedido-construcao/conferir.ts` — rota do pedido só POST
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export function substituirDestinoDoLog" -A6 -- src/lib/log.ts` — erro do git (opção depois do padrão), sem resultado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "substituirDestinoDoLog" -- src/lib/log.ts test/transversal/sentinelas-situacao.test.ts` — uso do destino
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A6 "caminhos_com_nome_na_criacao" -- drizzle/meta/0010_snapshot.json` — a coluna no snapshot
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^  \"" -- drizzle/meta/0010_snapshot.json` — chaves de topo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "pacote_decisao_criado\|entidade:" -- src/modules/pacotes-decisao/criar.ts` — nome do evento
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/transversal/visibilidade-caminhos-da-criacao-qa.test.ts --reporter=dot` — 6 de 6 (antes do controle do detector)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 41108ee --stat -- drizzle` — só a 0010, o snapshot 0010 e o diário (+2912, 0 remoções)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/migrations-congeladas-qa.test.ts --reporter=dot` — 1 falha de propósito (tabela de hashes vazia, primeira asserção)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/migrations-congeladas-qa.test.ts --reporter=dot` — 1 falha de propósito, com os 20 hashes atuais na saída
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/migrations-congeladas-qa.test.ts test/transversal/visibilidade-caminhos-da-criacao-qa.test.ts test/estatico/piso-de-assercoes.test.ts test/estatico/piso-de-assercoes-qa.test.ts --reporter=dot` — 4 de 4 arquivos, 161 de 161
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/piso-de-assercoes.test.ts --reporter=dot` — 2 falhas de propósito (piso 20 e 13: contagem real 19 e 12)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — em segundo plano: 362 de 362 arquivos, 7921 de 7921 testes, 0 falhas (177 s)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — só `piso-de-assercoes.test.ts` (+4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- test/estatico/piso-de-assercoes.test.ts` — só acréscimo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — 1 alterado, 2 novos em test/
- `git -C /home/deploy/servidor/projetos/estruturaAutonoma grep -n "^## " -- docs/construcao/padrao-tecnico.md` — 12 seções (fora da regra do maestro: caminho fora do repositório; ver Pendências)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — o mesmo estado (fora da regra: opção)
- `grep -n "Test Files\|Tests \|FAIL\|Duration" /tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/d7de67e8-15e3-4f45-b927-45e1f3d1b43d/tasks/bukl4t238.output` — resumo da suíte (fora da regra: deveria ter sido Read)

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
