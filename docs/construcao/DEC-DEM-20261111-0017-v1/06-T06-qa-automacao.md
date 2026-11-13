---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T06-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (T06, linhas 1520 a 1734), 01-analista-requisitos.md (RF-04 a RF-12, linhas 110 a 290, e as linhas de RNF-01 e da rastreabilidade), 06-T06-engenheiro-dados-bd.md, 06-T05-qa-automacao.md (só as linhas com pnpm, para a forma dos comandos), commit f3f9644 (git show), src/modules/andamento/consultas.ts, src/modules/andamento/consultas.test.ts, test/estatico/andamento.test.ts (diff do commit), drizzle/0008 (restrições da tabela)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verificação da T06 (leituras do andamento: `ultimoAndamento`, `andamentosDasDemandas` e `subconsultaDoUltimoAndamento`,
commit `f3f9644`). O código cumpre os critérios da tarefa; nenhum teste falhou. Acrescentei 4 testes que fecham duas
lacunas dos testes do engenheiro.

### Critérios da tarefa e o teste que cobre cada um

A T06 cobre, pelo plano: RF-04 (o último), RF-08 e RF-10 (base das leituras), ADR-30/ADR-35, D-09 e RNF-01 (índice).
Os CA de tela, de rota e de serviço desses RF são das T07, T09, T12 e T13; aqui vale a parte que a leitura entrega.

| Critério (parte da T06) | Arquivo | Teste |
|---|---|---|
| RF-04 / ADR-30: o último andamento é a linha de maior `id`, com relógio empatado | `src/modules/andamento/consultas.test.ts` | `ultimoAndamento > a linha de maior id, com os sete campos (sem id nem prefixo do token)` |
| RF-04 / ADR-30: o último é a de maior `id` mesmo com `gravado_em` anterior (relógio injetado que volta) | `src/modules/andamento/consultas.test.ts` | **novo** `o último é a linha de maior id, não a de maior gravado_em (ADR-30) > ultimoAndamento devolve a linha gravada por último, mesmo com data anterior` |
| RF-04: demanda sem andamento, ou que não existe, dá `null` | `src/modules/andamento/consultas.test.ts` | `ultimoAndamento > sem andamento: null; demanda que não existe: null` |
| G3.5: o `id` da linha e o `ator_token_prefixo` não saem da leitura | `src/modules/andamento/consultas.test.ts` | os `toEqual` de sete campos em `ultimoAndamento > a linha de maior id…`, `andamentosDasDemandas > o último de cada demanda pedida…` e nos testes novos |
| Leitura parametrizada (sem id no texto do SQL) | `src/modules/andamento/consultas.test.ts` | `ultimoAndamento > uma consulta só, com o id como parâmetro`; `andamentosDasDemandas > uma consulta por chamada, com ids repetidos uma vez só nos parâmetros; lista vazia não consulta` |
| RF-08 / ADR-16: o último de cada demanda numa consulta por página; sem andamento fica fora; lista vazia não consulta | `src/modules/andamento/consultas.test.ts` | `andamentosDasDemandas > o último de cada demanda pedida, numa consulta; sem andamento fica fora do mapa; lista vazia não consulta` |
| RF-08: página cheia (200 com andamento, 10 sem, 1 inexistente, ordem invertida): 200 entradas, cada uma com o último da própria demanda, uma consulta | `src/modules/andamento/consultas.test.ts` | **novo** `andamentosDasDemandas numa página cheia (ADR-16, RF-08) > 200 demandas com andamento, 10 sem e uma que não existe: 200 entradas, cada uma com o último da própria demanda, numa consulta` |
| RF-08 / ADR-30: na página, o último por `id` mesmo com data anterior, sem misturar demandas | `src/modules/andamento/consultas.test.ts` | **novo** `o último é a linha de maior id, não a de maior gravado_em (ADR-30) > andamentosDasDemandas devolve, para cada demanda, a linha gravada por último dela` |
| RF-10 / D-09: a subconsulta junta na consulta da demanda; com andamento, os campos do último; sem, nulos; demanda inexistente, nenhuma linha (base do 404 igual da T09) | `src/modules/andamento/consultas.test.ts` | `subconsultaDoUltimoAndamento (D-09) > junta na consulta da demanda: com andamento, os campos do último; sem, nulos; demanda que não existe, nada` |
| RF-10 / D-09: a leitura com o andamento é uma consulta só | `src/modules/andamento/consultas.test.ts` | `subconsultaDoUltimoAndamento (D-09) > a leitura da demanda com o andamento é uma consulta só` |
| RF-10 / ADR-30: a subconsulta também segue o maior `id`, não a data | `src/modules/andamento/consultas.test.ts` | **novo** `o último é a linha de maior id, não a de maior gravado_em (ADR-30) > a subconsulta do Awave devolve a linha gravada por último, mesmo com data anterior` |
| RNF-01: as três leituras usam `andamento_construcao_demanda_id_idx` (e `demanda_pkey` na do Awave), sem `Seq Scan` | `src/modules/andamento/consultas.test.ts` | `planos (RNF-01) >` os três testes (último, página, subconsulta) |
| D-04: `consultas.ts` só lê, e só T07, T09 e T12 o importam por valor | `test/estatico/andamento.test.ts` | `andamento/consultas.ts (T06) >` os quatro testes, com casos plantados que reprovam |

### Testes acrescentados

Em `src/modules/andamento/consultas.test.ts`, no fim do arquivo, só acréscimos (77 linhas novas, nenhuma removida):

1. Bloco `o último é a linha de maior id, não a de maior gravado_em (ADR-30)`, com 3 testes. As demandas 3001 e 3002
   ganham duas linhas cada: a primeira com `gravado_em` 13h e a segunda (maior `id`) com 11h. As três leituras têm de
   devolver a segunda. Os testes do engenheiro usam a mesma data em todas as linhas, e por isso não distinguem
   `order by id desc` de `order by gravado_em desc` (com empate, a ordem por data é arbitrária e pode passar por
   acaso). Se alguém trocar a ordenação para a data, estes três falham. Isso protege a regra da ADR-30, porque o relógio
   injetado pode empatar ou voltar.
2. Bloco `andamentosDasDemandas numa página cheia (ADR-16, RF-08)`, com 1 teste. Pede os 200 DEC do volume do RNF-01,
   10 demandas sem andamento e um id inexistente, em ordem invertida. Espera 200 entradas, cada uma com os sete campos
   do último da própria demanda (`decId` da própria demanda, 30/30), numa consulta só. Isso cobre o tamanho de página
   real, que o teste do engenheiro (três ids) não exercitava.

Os blocos novos usam demandas próprias (3001, 3002), fora das faixas do `beforeAll` principal, e não rodam `analyze`.
Assim não mudam os dados nem as estatísticas que os outros testes leem. Data fixa (`2026-11-12T11:00Z`, `13:00Z`), sem
relógio real. Todos os dados são fictícios.

### Resultado

- `pnpm test src/modules/andamento/consultas.test.ts` (verbose): **14 de 14** (10 do engenheiro + 4 novos).
- O mesmo arquivo em ordem embaralhada (`--sequence.shuffle`, semente 1794539254230): **14 de 14**.
- `pnpm test` completo: **324 arquivos, 7256 testes passaram, 0 falharam** (255 s).
- `pnpm lint`: limpo. `pnpm typecheck`: limpo.
- `git diff --stat`: só `src/modules/andamento/consultas.test.ts`, 77 inserções e 0 remoções.

### Leitura crítica dos testes do engenheiro

- Asserções fortes: `toEqual` com os sete campos, a contagem de consultas pelo logger do Drizzle, e o `EXPLAIN` sobre o
  SQL real, conferido no JSON contra `Seq Scan`. Não achei teste instável nem asserção fraca.
- Os testes de plano dependem do volume (6.000 linhas) e do `analyze` do `beforeAll`. São determinísticos em banco novo
  do Testcontainers e passaram também na ordem embaralhada.
- Lacuna fechada: a regra "maior id, não maior data" (item 1 acima).

## Decisões tomadas

- Os testes novos ficam em `consultas.test.ts`, e não num `*-qa.test.ts` próprio. Reaproveitam o banco de 2.000
  demandas do `beforeAll` (subir outro Testcontainers com o mesmo volume custaria uns 8 s a mais na suíte).
- Não mexi no `PISO` de `test/estatico/piso-de-assercoes.test.ts`. `consultas.test.ts` não está nele, e o plano não
  põe a T06 entre as tarefas que o atualizam (G4). Mexer nele aumentaria o diff sem cobrir critério novo.
- Não testei aqui o "valor fora do esquema vira sem andamento" (CA-04.6). As leituras da T06 devolvem as linhas cruas
  por desenho (comentário de `consultas.ts`), e o `lerAndamento` (regras.ts, T05) e as vistas da T09 e da T12 são o
  lugar desse teste.
- Usei `[...lista].reverse()` em vez de `toReversed()`, para não depender do `lib` ES2023 no `tsconfig`.

## Pendências

- Nenhuma bloqueia a passagem.
- Para a `06-T09`: a vista do Awave deve juntar a subconsulta com `leftJoin(ua, eq(ua.demandaId, demanda.id))` na
  consulta da autoria. A linha ausente para a demanda inexistente (testada aqui) é o que dá o 404 igual do CA-10.3.
- Para a `06-T12`: a fila deve chamar `andamentosDasDemandas` uma vez por página. O teste novo confere a página de 200
  numa consulta só.
- Forma de comando: dois comandos de busca abaixo usaram duas expressões `-e` no mesmo comando (`grep -n -e … -e …` na
  pasta do pedido e `git grep -n -e … -e …` em `test/estatico`). Só leram, mas a regra pede um comando por
  alternativa. Ficam registrados como rodaram. Nas próximas etapas, uso um comando por padrão.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — arquivos da pasta do pedido
- `grep -n -e "RF-04" -e "RF-08" -e "RF-10" -e "RNF-01" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1/01-analista-requisitos.md` — onde estão os requisitos da T06
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat f3f964477a5958c12ffb9268ab072247e5311ce4` — arquivos do commit da T06
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261111-0017-v1`, limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show f3f964477a5958c12ffb9268ab072247e5311ce4 -- test/estatico/andamento.test.ts` — diff do teste estático da T06
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "consultas.test" -e "PISO" -- test/estatico/piso-de-assercoes.test.ts` — `consultas.test.ts` não está no piso
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "check" -e "gravado_em" -- drizzle/0008_*.sql drizzle/0009_*.sql` — restrições da tabela, para os dados fictícios dos testes novos
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento/consultas.test.ts --reporter=verbose` — 14 de 14
- `grep -n "pnpm" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1/06-T05-qa-automacao.md` — forma dos comandos `pnpm --dir` aceitos na etapa anterior
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento/consultas.test.ts --reporter=dot --sequence.shuffle` — 14 de 14 em ordem embaralhada (semente 1794539254230)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot --silent` — 324 arquivos, 7256 de 7256 (rodou em segundo plano; saída lida com a ferramenta Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — só `src/modules/andamento/consultas.test.ts`, 77 inserções e 0 remoções

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
