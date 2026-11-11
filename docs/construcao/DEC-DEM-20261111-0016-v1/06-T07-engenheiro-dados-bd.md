---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T07-construcao
agente: engenheiro-dados-bd
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G8, T05, T06 e T07), 01-analista-requisitos.md (glossário, RF-07, RF-08, RF-09, RF-10, RF-11), 04-seguranca-aplicacao.md (seções 1 a 3), 06-T01-engenheiro-dados-bd.md, 06-T05-engenheiro-backend.md, 06-T05-tech-lead.md, 06-T05-qa-automacao.md, 06-T06-engenheiro-backend.md, 06-T06-tech-lead.md, 06-T06-qa-automacao.md, src/modules/demandas/schemas.ts, src/modules/demandas/schemas.test.ts, src/modules/demandas/consultas.ts, src/modules/demandas/consultas.test.ts, src/modules/demandas/resumo-da-fila.ts, src/modules/demandas/resumo-da-fila.test.ts, src/modules/demandas/servico.ts (até alterarDemanda), src/modules/demandas/entrada-qa.test.ts (linhas 135 a 180), src/modules/acesso/ator.ts, src/db/schema/demandas.ts, src/app/api/demandas/route.ts, src/app/api/demandas/demandas.test.ts, src/app/api/vistas-para-agente.test.ts, src/app/(painel)/demandas/leituras-da-fila.ts, src/app/(painel)/demandas/fila.test.ts (linhas 1 a 60), test/banco.ts, test/deps.ts, test/integracoes.ts, test/requisicao.ts, test/sessao.ts, test/estatico/leituras-da-fila.test.ts, test/estatico/relogio.test.ts]
status: devolvido
proximo: tech-lead
devolvido_para: 05-plano
---
## Entrega

T07 (origem da demanda no servidor: leitura, listagem, contagem e filtro; RF-10, CA-10.2 a CA-10.5, C-17) **não fecha
verde dentro da lista Pode do engenheiro-dados-bd**, e um dos testes que quebram é uma guarda de segurança que só o
tech-lead pode decidir como mudar. O código e os testes da tarefa estão escritos e passam. O que fica vermelho é teste que
já existe e espera o item da listagem sem a chave `origem`. Detalhe abaixo e em Pendências.

### Pendências das entregas 06-T01 a 06-T06 que citam a T07

Nenhuma. A única menção à T07 nessas entregas está no `leu` da 06-T06-engenheiro-backend. A conferência foi feita com
`git log -G T07` na pasta do pedido e com a leitura das Pendências das 18 entregas.

### Arquivos alterados (na árvore, sem commit)

| Arquivo | O que mudou |
|---|---|
| `src/modules/demandas/schemas.ts` | `ORIGENS_DA_DEMANDA = ['pessoa', 'agente', 'awave']` e `OrigemDaDemanda` (G7). `origem: z.enum(ORIGENS_DA_DEMANDA).optional()` em `filtroDemandasSchema` (C-17). |
| `src/modules/demandas/consultas.ts` | `DemandaResumo.origem` (G7). `origemDaAutoria(autorTipo, autorId)`: pessoa, agente, ou integração `awave`. Qualquer outra autoria lança `autoria desconhecida`, que vira 500, como em `responsavelDe`. `origemDoResponsavel(r)`: `switch` com `atorDesconhecido` no fim. `condicaoDaOrigem(o)`: `switch` com `never`; pessoa e agente filtram só por `autor_tipo`, o awave por `autor_tipo` e `autor_id`, sempre por `eq`. `paginaDeDemandas` aplica a condição e lê `autorTipo` e `autorId`. `resumoDe` monta `origem` chave a chave, e o `autorId` não sai. |
| `src/modules/demandas/resumo-da-fila.ts` | `contarDemandasPorStatus` aceita `origem` (`Pick<FiltroDemandas, 'tipo' \| 'linhaServicoProvavel' \| 'origem'>`) e usa a mesma `condicaoDaOrigem`. Importa só `condicaoDaOrigem` de `./consultas`. Não importa o `sql` do drizzle-orm, e o teste estático da CV-06 continua verde. |
| `src/modules/demandas/consultas.test.ts` | Teste que já existia, fora do G5. Na linha 118, `'origem'` entra na lista exata de chaves do item. Nenhuma asserção saiu, e a lista continua fechada. |

### Teste criado

`src/modules/demandas/origem.test.ts`: 21 testes, Postgres real e papel do app, com banco próprio por bloco. Os dados
entram no `beforeAll`, sem relógio real e sem token: o ator do Awave usa o prefixo fictício `ficticio`.

- Lista fechada: `origemDaAutoria` e `origemDoResponsavel` com as três origens. Lançam para `construir`, `jarvis`, `sistema` e tipo desconhecido.
- C-17: o schema aceita as três origens e recusa `outra`, vazio, `Awave`, `integracao`, `construir` e chave repetida. Sem origem, o filtro de hoje fica igual.
- Controle: as três demandas existem, com a autoria gravada e o solicitante editado.
- Listagem sem filtro: a origem de cada item está certa, a lista de chaves é exata e o id do autor não aparece.
- CA-10.2 e CA-10.4: cada filtro devolve só a demanda dele, com total 1. A demanda do Awave tem o solicitante trocado para "Teste Ficticio", e a de pessoa tem o solicitante trocado para "Awave". As duas mantêm a origem.
- CA-10.4 no detalhe: `origemDoResponsavel(obterDemanda(...).responsavel)`.
- `contarDemandasPorStatus` com origem, sozinha e combinada com o tipo.
- C-17: a origem vai como parâmetro na página, no total e na contagem, e o SQL não tem o valor. `condicaoDaOrigem` gera os parâmetros `['pessoa']`, `['agente']` e `['integracao', 'awave']`.
- Listagem para agente: o item traz a origem.
- IN-02: o filtro de origem não abre `listarDemandasPara` para a integração (`sem_permissao`).
- CA-10.5 pela rota `GET /api/demandas` com sessão de pessoa:
  - `?origem=awave` devolve 200 só com a demanda do Awave;
  - a origem combina com o status e com o tipo;
  - `?origem=outra`, vazio, repetido e `%3Cscript%3E` dão 400 com o campo `origem` e sem ecoar o valor.
- CA-10.3, num segundo banco: origem e status combinam como E. O total segue o filtro inteiro, e a contagem por status ignora o status da URL.
- Plano de execução com 5.000 demandas (100 do Awave, 500 de agente, 4.400 de pessoa, `vacuum analyze`):
  - um teste de controle confere a massa;
  - a página, o total e a contagem por status com `origem=awave` não têm `Seq Scan` e usam `demanda_autor_criada_idx`.

Trecho do `EXPLAIN`, pelo planejador de verdade, sem desligar a varredura:

```
T07-0016 EXPLAIN página (origem=awave): Limit > Incremental Sort > Index Scan demanda demanda_autor_criada_idx
T07-0016 EXPLAIN total (origem=awave): Aggregate > Index Only Scan demanda demanda_autor_criada_idx
T07-0016 EXPLAIN contagem por status (origem=awave): Aggregate > Sort > Index Scan demanda demanda_autor_criada_idx
```

Antes da tarefa, o mesmo arquivo mostrava a página por `demanda_criada_idx`, porque o filtro não existia:
`Limit > Incremental Sort > Index Scan demanda demanda_criada_idx`.

### Teste antes do código (visto falhando)

`pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/origem.test.ts`, antes de
mexer em `schemas.ts`, `consultas.ts` e `resumo-da-fila.ts`:

```
 ❯ src/modules/demandas/origem.test.ts (21 tests | 18 failed) 1428ms
     × as três origens, na ordem da 01 8ms
     × pessoa, agente e awave pela autoria; construir e autoria fora da lista lançam 1ms
     × CA-10.2 e CA-10.4: cada filtro traz só a sua, com total 1; o solicitante editado não muda a origem 6ms
     × ?origem=outra, vazia e repetida → 400 com o campo origem, sem ecoar o valor 9ms
AssertionError: expected undefined to deeply equal [ 'pessoa', 'agente', 'awave' ]
TypeError: origemDaAutoria is not a function
AssertionError: ?origem=outra: expected 200 to be 400 // Object.is equality
AssertionError: expected 5000 to be 100 // Object.is equality
      Tests  18 failed | 3 passed (21)
```

Os 3 testes que já passavam são guardas declaradas, que valem com ou sem a tarefa: o controle da massa do bloco de
uma demanda por origem, "sem origem, o filtro de hoje fica igual" e "o filtro de origem não abre a listagem para a
integração".

Depois do código: `origem.test.ts` com 21 de 21.

### Resultado da suíte inteira, com o código desta entrega

- `pnpm test`: **260 arquivos; 5607 testes passaram e 3 falharam**. Os 3 testes que falham já existiam e esperam o item
  da listagem sem a chave `origem`:
  1. `src/modules/demandas/entrada-qa.test.ts:163` ("RF-06 e CA-21.3: nenhuma outra leitura traz o texto bruto nem a origem"): `expect(Object.keys(item!)).not.toContain('origem')`. **É a guarda de que a origem da entrada bruta (`entrada_bruta.origem`, com o canal e a referência, dado de terceiro) não sai na fila.** O nome da chave nova do RF-10 colide com essa guarda.
  2. `src/app/api/demandas/demandas.test.ts:223` ("o item da fila não traz solicitante, texto livre, anexos nem autor"): lista exata de chaves.
  3. `src/app/api/demandas/demandas.test.ts:394` ("a listagem, nos dois atores, só tem as chaves da fila"): lista exata de chaves. É a lista para agente que o G5 atribui, por engano, a `vistas-para-agente.test.ts`.
- `pnpm typecheck`: falha só em 4 arquivos de teste do painel. O ajudante `demanda(n, extra)` monta um `DemandaResumo`
  sem `origem`:
  - `src/app/(painel)/demandas/fila.test.ts:43`
  - `fila-qa.test.ts:64`
  - `fila-a1.test.ts:35`
  - `fila-a1-qa.test.ts:27`

  O código de `src/` que não é teste compila.
- `pnpm lint`: limpo.
- G4: `git diff a9fd9b8 --stat` das superfícies congeladas, de `src/lib/rota.ts` e de `drizzle/` mostra só a `0007` da
  T01, que já estava commitada. A T07 não tocou migration, GRANT, `rota.ts` nem `proxy.ts`.
- IN-16 (D-17): nenhum arquivo da lista do piso foi tocado. `vistas-para-agente.test.ts` e `leituras-da-fila.test.ts`
  continuam sem diff.

### Desvios do plano

1. **G5 aponta o arquivo errado.** O plano diz que a chave `origem` entra na lista de chaves de
   `src/app/api/vistas-para-agente.test.ts`, mas esse arquivo não tem lista de chaves do item de `GET /api/demandas`. As
   listas reais estão em `src/modules/demandas/consultas.test.ts:118`, que eu mudei porque fica dentro da Pode, e em
   `src/app/api/demandas/demandas.test.ts:223` e `:394`, que ficam fora da Pode.
2. **G1 e T07 não cabem juntos.** A T07 é do `engenheiro-dados-bd`, cuja Pode é `src/db/`, `src/modules/`, `drizzle/`,
   `test/` e `scripts/`. Tornar `origem` obrigatório em `DemandaResumo` (G7) exige mexer em quatro testes de
   `src/app/(painel)/demandas/` e em `src/app/api/demandas/demandas.test.ts`. Não editei nenhum deles.
3. **O nome da chave `origem` colide com uma guarda de segurança que já existe** (`entrada-qa.test.ts:163`, RF-06 e
   CA-21.3 do pedido 0001). O plano não previu essa colisão, e mudar a guarda é decisão de revisão (IN-16).
4. `condicaoDaOrigem` ficou com `default` exaustivo (`origemDesconhecida`, `never`), que o trecho do plano não tinha,
   pelo mesmo padrão do IN-02.
5. O teste de plano de execução exige o índice `demanda_autor_criada_idx` e nenhum `Seq Scan` nas três consultas. O
   plano aceitava "usa o índice ou não lê a tabela inteira". Exigi as duas coisas porque os três planos de hoje já as
   cumprem.

## Decisões tomadas

- A origem vem só de `autor_tipo` e `autor_id`, nunca do `solicitanteNome`. O teste prova isso nos dois sentidos: o
  Awave com outro solicitante continua `awave`, e a pessoa com solicitante "Awave" continua `pessoa`.
- O filtro usa `eq` com valores fixos do `switch`, depois do `z.enum`. Nenhum valor da URL chega ao SQL como texto
  (C-17), e o teste confere os parâmetros e o texto do SQL.
- `contarDemandasPorStatus` reaproveita `condicaoDaOrigem` de `consultas.ts`, para a regra ficar num lugar só. O teste
  estático da CV-06 só proíbe escrita e o `sql` do drizzle-orm no próprio módulo.
- O índice `demanda_autor_criada_idx`, que já existia, atende o filtro do Awave: na página por `Index Scan` com
  `Incremental Sort` para o desempate pelo id, no total por `Index Only Scan` e na contagem por `Index Scan`. Não
  precisa de índice novo nem de migration nesta tarefa.
- Não há migration nova, então não há SQL de volta a registrar.
- Deixei o código e os testes da T07 na árvore, sem commit, para a volta reaproveitar. Ver Pendências: não são entrega
  pronta.
- Uma busca só de leitura rodou fora da regra de comando deste pedido; o maestro registrou o bloqueio e a liberou.
- Glob e Grep não estavam disponíveis nesta sessão. Li os arquivos com Read e achei os arquivos por `git log -G` e
  `git diff --name-only`.

## Pendências

- Devolvido ao `05-plano`: a T07, como está escrita, não fecha verde dentro da lista Pode do `engenheiro-dados-bd`. A
  chave `origem` em `DemandaResumo` (G7) quebra quatro testes do painel no `typecheck` e duas listas de chaves em
  `src/app/api/demandas/demandas.test.ts`, todos em `src/app/`, fora da Pode. Além disso, ela colide com a guarda
  `src/modules/demandas/entrada-qa.test.ts:163` ("a fila não traz a origem" da entrada bruta), e mudar essa guarda é
  decisão do tech-lead (IN-16).
- **O que o tech-lead precisa decidir:**
  1. **O nome da chave no item da listagem.**
     - **Opção (a):** manter `origem`, como dizem o G7, o 03 e o T16. Nesse caso, a guarda de `entrada-qa.test.ts:163`
       deixa de procurar a chave pelo nome e passa a conferir que `item.origem` está em `ORIGENS_DA_DEMANDA`. O
       `contemSentinela(corpoLista)` da linha 164 continua cobrindo o vazamento do canal e da referência. É uma troca de
       asserção num teste de segurança, que precisa de aprovação.
     - **Opção (b):** outro nome para a chave do item, por exemplo `origemDaDemanda`, e a guarda fica como está. O
       parâmetro de URL `origem=` do RF-10 não muda. O T16 e o G7 mudam o nome.
  2. **Quem edita os testes de `src/app/` que a mudança quebra.** É a mesma mudança mecânica nas duas opções. Ou
     esses arquivos entram na Pode desta tarefa, ou a parte deles passa para o `engenheiro-backend` ou o
     `engenheiro-frontend`:
     - `fila.test.ts:43`, `fila-qa.test.ts:64`, `fila-a1.test.ts:35` e `fila-a1-qa.test.ts:27`, em
       `src/app/(painel)/demandas/`: acrescentar `origem: 'pessoa'` ao objeto do ajudante `demanda`, antes do `...extra`;
     - `src/app/api/demandas/demandas.test.ts:223` e `:394`: acrescentar a chave à lista exata, sem tirar nenhuma.
  3. **Corrigir o G5:** trocar `src/app/api/vistas-para-agente.test.ts` por `src/modules/demandas/consultas.test.ts` e
     `src/app/api/demandas/demandas.test.ts`, e acrescentar `src/modules/demandas/entrada-qa.test.ts`, conforme a
     decisão 1.
- **Estado da árvore:**
  - Ficaram sem commit os quatro arquivos alterados e `origem.test.ts`, todos da T07.
  - A suíte está com 3 falhas e o `typecheck` com 4 erros, todos nos testes acima.
  - Isso não é entrega pronta. Se o maestro não quiser o ramo vermelho entre esta volta e a próxima, os cinco arquivos
    podem ficar fora do commit da passagem.
  - Na volta, com a decisão, o resto é a edição mecânica acima e uma nova rodada de `pnpm test`, `pnpm lint` e
    `pnpm typecheck`.
- As caixas `- [ ]` da T07 no plano não foram marcadas, porque o G1 não deixa a 06 editar `docs/`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline --name-only -40 -- docs/construcao/DEC-DEM-20261111-0016-v1` — as entregas 06-T01 a 06-T06
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261111-0016-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G T07 --name-only --format=%h -- docs/construcao/DEC-DEM-20261111-0016-v1` — só o 05 e o `leu` da 06-T06-construcao citam a T07
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G origem --name-only --format=%h -- docs/construcao/DEC-DEM-20261111-0016-v1/06-T01-engenheiro-dados-bd.md docs/construcao/DEC-DEM-20261111-0016-v1/06-T01-tech-lead.md docs/construcao/DEC-DEM-20261111-0016-v1/06-T01-qa-automacao.md docs/construcao/DEC-DEM-20261111-0016-v1/06-T02-engenheiro-backend.md docs/construcao/DEC-DEM-20261111-0016-v1/06-T02-tech-lead.md docs/construcao/DEC-DEM-20261111-0016-v1/06-T02-qa-automacao.md docs/construcao/DEC-DEM-20261111-0016-v1/06-T03-engenheiro-backend.md docs/construcao/DEC-DEM-20261111-0016-v1/06-T03-tech-lead.md docs/construcao/DEC-DEM-20261111-0016-v1/06-T03-qa-automacao.md docs/construcao/DEC-DEM-20261111-0016-v1/06-T04-engenheiro-backend.md docs/construcao/DEC-DEM-20261111-0016-v1/06-T04-tech-lead.md docs/construcao/DEC-DEM-20261111-0016-v1/06-T04-qa-automacao.md` — só citações do cabeçalho `Origin`, nenhuma da T07
- ``git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "'criadaEm', 'id', 'linhaServicoProvavel'" --name-only --format=%h -- src test e2e`` — as listas de chaves do item em `demandas.test.ts` e `consultas.test.ts`
- ``git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "linhaServicoProvavel', 'rascunhoAgente'" --name-only --format=%h -- src test e2e`` — os mesmos dois arquivos
- ``git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "a chave \`origem\`" --name-only --format=%h -- docs`` — só o plano
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "origem" --name-only --format=%h -- src/modules/demandas/consultas.test.ts src/app/api/vistas-para-agente.test.ts test/estatico/leituras-da-fila.test.ts src/app/api/demandas/demandas.test.ts` — `vistas-para-agente.test.ts` não cita `origem`
- ``git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "rascunhoAgente', 'status', 'tipo', 'titulo'" --name-only --format=%h -- src test e2e scripts`` — de novo `demandas.test.ts` e `consultas.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G DemandaResumo --name-only --format=%h -- src test e2e scripts` — os quatro testes do painel que montam `DemandaResumo`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- test/estatico src/modules/demandas` — os testes estáticos e os do módulo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/origem.test.ts` — antes do código: 18 falharam e 3 passaram (trecho acima)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/origem.test.ts` — depois do código: 21 de 21, com o trecho do `EXPLAIN`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — 4 erros, todos nos ajudantes `demanda` dos testes do painel em `src/app/(painel)/demandas/`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — em segundo plano, saída lida com Read: 260 arquivos, 5607 passaram e 3 falharam (`entrada-qa.test.ts:163`, `demandas.test.ts:223` e `:394`)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 4 arquivos alterados e 1 novo, todos da T07
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 --stat -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts drizzle src/lib/rota.ts src/app/api/vistas-para-agente.test.ts test/estatico/leituras-da-fila.test.ts` — só a `0007` da T01 (já commitada); nenhuma superfície congelada mudou

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [ ] `pnpm test` passa (3 falhas em testes existentes; ver Pendências)
- [ ] `pnpm lint` e `pnpm typecheck` passam limpos (lint limpo; typecheck com 4 erros em testes de `src/app/`)
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] a migration roda com o papel migrator e tem RLS e guarda quando a tabela tem `tenant_id` (não há migration nesta tarefa)
- [x] cada migration nova tem, em `## Decisões tomadas`, como desfazê-la (não há migration nova)
- [x] a migration de esquema fica como saiu do `pnpm db:generate`; o SQL que o Drizzle não gera (RLS forçada, política, função de guarda) fica numa migration criada vazia por `pnpm drizzle-kit generate --custom --name rls_<tabela>` e escrita por você; nenhuma migration já commitada foi editada (não há migration nesta tarefa)
