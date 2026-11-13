---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T02-testes
agente: qa-automacao
leu: [pedido.json, contrato-passagem.md, tarefas.json, 01-analista-requisitos.md (RF-01, CA-01.1 a CA-01.6), 04-seguranca-aplicacao.md (AN-01, por busca), 06-T01-qa-automacao.md, 06-T02-engenheiro-backend.md, 06-T02-tech-lead.md, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (T02, e T06 e T08 por busca), commit 0d25f905baefbd1279ff46133e453624757771cb (git show), src/modules/acesso/matriz.ts, src/modules/acesso/ator.ts, src/modules/acesso/matriz-qa.test.ts, src/modules/acesso/matriz-integracoes-qa.test.ts, test/matriz-rotas.test.ts, test/estatico/importacoes.ts, test/estatico/leituras-da-fila.test.ts, test/estatico/varreduras-qa.test.ts, test/estatico/piso-de-assercoes.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T02 (ação `registrar_andamento` só do `construir`, AN-01), sobre o commit
`0d25f905baefbd1279ff46133e453624757771cb`. O código cumpre os critérios da tarefa e não há devolução. Acrescentei dois
arquivos com 29 testes. Eles cobrem as bordas da ação nova que a suíte ainda não tinha e fecham duas brechas da guarda
estática do AN-01 (f).

### Critérios da tarefa e o teste que cobre cada um

A T02 cobre RF-01, CA-01.3, CA-01.6, AN-01 (a, b, d na matriz, e, f) e AN-13 (diff de `matriz.ts`). CA-01.1, CA-01.2,
CA-01.4 e CA-01.5 dependem da rota, que é da T08 e da T13.

| Critério | Teste (arquivo › nome) |
|---|---|
| RF-01: `ACOES` ganha a ação; a linha não tem pessoa nem agente, e só `construir` nas integrações | `src/modules/acesso/matriz-andamento.test.ts` › "a linha é SO_CONSTRUIR: sem pessoa, sem agente, congelada"; `src/modules/acesso/matriz.test.ts` › "as ações são as 24 do plano..." e "cada linha é a da tabela do plano"; **novo** `src/modules/acesso/matriz-andamento-qa.test.ts` › "é o mesmo objeto das outras três do /construir (uma fonte só, SO_CONSTRUIR)" e "a linha, os agentes e as integrações estão congelados" |
| RF-01 e AN-13: nenhuma outra linha muda | `matriz.test.ts` › "cada linha é a da tabela do plano" (a `ESPERADA` linha a linha); `matriz-integracoes-qa.test.ts` › "criar_demanda continua de toda pessoa e só do orquestrador..." |
| CA-01.3 e AN-01 (a): os pares exatos são os seis | `matriz-andamento.test.ts` › "(a) os pares (ação, integração) montados de MATRIZ são exatamente os seis"; `matriz-integracoes.test.ts` › "(a) os pares ... são exatamente os seis do RF-03 e do RF-01 da 0.4.0" e "autorizar segue os pares, para cada integração em cada ação" |
| AN-01 (b): o `construir` tem quatro ações e o `awave` tem duas | `matriz-andamento.test.ts` › "(b) o construir tem exatamente quatro ações e o awave exatamente duas"; `matriz-integracoes-qa.test.ts` › "CA-03.1 ... é o mesmo corpo de toda negação..." (negados = 24 × 2 − 6) |
| AN-01 (d), na matriz: `awave`, os quatro agentes (com token e do worker), `cto`, `administradora` e `sistema` negados | `matriz-andamento.test.ts` › "(d) awave, os quatro agentes (com e sem token), cto, administradora e sistema são negados"; `matriz-integracoes-qa.test.ts` › "registrar_andamento nega cada agente (com token e do worker), cada papel, o awave e o sistema" (it.each) e "atoresProibidos das quatro é exatamente..."; **novo** `matriz-andamento-qa.test.ts` › "agente chamado construir, pessoa com papel construir e tipo construir são negados" |
| CA-01.6 e AN-01 (e): integração fora da lista é negada | `matriz-andamento.test.ts` › "(e) integração fora da lista (jarvis, Construir, vazio) é negada; o construir passa"; `matriz-integracoes-qa.test.ts` › "valor %i negado nas 24 ações" (19 valores); **novo** `matriz-andamento-qa.test.ts` › "valor %i negado, e a integração exata passa" (14 valores: quebra de linha, tab, espaço de largura zero, BOM, largura total, acento, NUL, vírgula, `String` embrulhada, objeto com `valueOf`, lista) |
| AN-01: a ação falha fechada com nome quase igual | **novo** `matriz-andamento-qa.test.ts` › "caixa, espaço, hífen e sufixo não viram registrar_andamento" |
| AN-01: a linha não muda em tempo de execução | **novo** `matriz-andamento-qa.test.ts` › "acrescentar awave, agente ou pessoa, ou trocar a linha, lança TypeError, e a regra segue a mesma" (inclui a mutação pela `entregar_pedido`, que divide a linha) e "uma linha registrar_andamento aberta, posta no protótipo de Object, não muda a regra" |
| AN-01: o 403 não vaza nada | `matriz-integracoes-qa.test.ts` › "é o mesmo corpo de toda negação..."; **novo** `matriz-andamento-qa.test.ts` › "é o corpo de toda negação, para cada ator negado", "é ErroDominio sem extras, e a message e a pilha não levam a ação, a integração nem o prefixo" e "a ação permitida ao construir não devolve nada nem muda o ator" |
| AN-01 (f): fora de teste, só a matriz, a rota e o serviço citam a ação; nenhum `'use server'`, job ou worker a cita | `test/estatico/andamento.test.ts` › os quatro testes; **novo** `test/estatico/andamento-qa.test.ts` › "nenhum deles cita registrar_andamento" (`.mjs`, `.js`, `.cjs`, `.mts` de `src/` e `scripts/` e as configurações da raiz) e "fora de teste, nenhum arquivo além da rota nova importa registrar.ts por valor", com os casos plantados |
| AN-01 (d) por rota (CA-01.4) | `test/matriz-rotas.test.ts` › "verificador ... registrar_andamento: handler de rota() passa na conferência..." (sintético, já gerado). A rota real entra sozinha na T08 |

### Testes acrescentados

- `src/modules/acesso/matriz-andamento-qa.test.ts` (novo, 25 testes, unitário, sem banco). É ao lado do teste do
  engenheiro, sem mudar nada nele.
- `test/estatico/andamento-qa.test.ts` (novo, 4 testes, estático). Fecha duas brechas da guarda do AN-01 (f):
  1. A varredura de `andamento.test.ts` lê só `.ts` e `.tsx`. Um `.mjs` em `src/` (já existe o
     `src/vendor/construir/pedido.mjs`) ou uma configuração da raiz citaria a ação sem ninguém ver.
  2. Uma Server Action ou um job chama o serviço importando `registrarAndamento`, sem escrever o nome da ação. A regra
     nova é: fora de teste, só `src/app/api/pedidos-construcao/[decId]/andamento/route.ts` importa
     `src/modules/andamento/registrar.ts` por valor (`IMPORTAM_REGISTRAR`). O caminho é resolvido (relativo, apelido
     `@/`, extensão e `index`), e por isso um vizinho que importa `./registrar` também é pego. O leitor de importações é
     o de `test/estatico/importacoes.ts`. Os 11 casos plantados incluem os que reprovam (Server Action, job, worker,
     `export *`, `import()`, `require`, namespace em `.mjs`) e os que passam (`import type`, módulo de nome parecido).
     Hoje a regra passa porque o serviço ainda não existe. O plano confirma que só a rota o importa (T08), e a D-07
     confirma que o seed não o chama.
- `test/estatico/piso-de-assercoes.test.ts`: o `PISO` ganhou `matriz-andamento-qa.test.ts: 31` e
  `andamento-qa.test.ts: 13`, que são as linhas com `expect(`. O piso só sobe.

### Resultado

- Os dois arquivos novos: 29 de 29.
- `pnpm test` completo: **313 arquivos, 6635 testes passaram, 0 falharam** (217,85 s).
- `pnpm lint` e `pnpm typecheck`: limpos, antes e depois da edição do `PISO`.

### Conferência com `git diff`

- Meu diff tem só as duas linhas novas do `PISO` e o comentário delas. O resto são os dois arquivos novos.
- No commit da T02, nenhum teste foi apagado nem levou `.skip`, `.only` ou `.todo`. Nos três testes da G5, mudaram só
  `DO_CONSTRUIR`/`SO_CONSTRUIR` (ganharam a ação), a lista de pares (ganhou o par novo), os títulos, os comentários e as
  contagens 23→24 e `- 5`→`- 6`. As contagens acompanham a ação nova e não afrouxam nada: o teste ainda falha se a
  matriz ganhar ou perder um par. Nenhuma linha com `expect(` caiu (47, 8 e 45 antes e depois, conforme a entrega do
  engenheiro e a revisão).

## Decisões tomadas

- **Arquivos `-qa` separados:** é o padrão do repositório (`matriz-qa.test.ts`, `andamento-qa.test.ts` da T01) e deixa
  intactos o teste do plano e o piso dele.
- **Guarda por importação, além da guarda por citação:** a ameaça do AN-01 é "Server Action ou job chamando a ação", e
  quem chama o serviço não escreve o nome da ação. Uma lista de importadores permitidos segue o mesmo molde do
  `IMPORTAM_CONSULTAS` que o plano põe na T06.
- **Resolver o caminho em vez de comparar texto:** com o texto, `./registrar` dentro de `src/modules/andamento/`
  escaparia. O caso plantado `src/jobs/vizinho.ts` prova que `./registrar` em outra pasta não conta.
- **Bordas Unicode e de tipo na integração:** a lista CA-03.6 da 0.3.0 não tinha largura zero, BOM, largura total,
  quebra de linha nem `String` embrulhada. Um resolvedor de token que normalizasse errado chegaria aqui.
- **A mutação pela linha irmã:** como `registrar_andamento` divide o objeto `SO_CONSTRUIR` com as outras três ações,
  o teste confere que mexer por `entregar_pedido` também lança erro e não abre o andamento.
- **Comandos `pnpm` com `--dir <repo>`:** o shell do agente começa na estruturaAutonoma, e `cd` não está na lista Pode.
  É a mesma forma das entregas anteriores deste pedido.

## Pendências

- Nenhuma bloqueia a passagem.
- Para a `06-T07` e a `06-T08`: `test/estatico/andamento-qa.test.ts` tem `IMPORTAM_REGISTRAR` só com a rota. Se o nome
  do serviço ou da rota mudar, ou se outro arquivo de código que roda precisar de `registrar.ts` por valor, a lista
  muda junto, com a razão (`import type` não conta).
- O `pnpm test` agora traz 6635 testes. A entrega do engenheiro tinha 6601. Meus 29 e as duas linhas novas do `PISO`
  somam 31. A diferença de 3 vem de testes gerados por varredura de arquivos, que passam a enxergar os arquivos novos.
  Todos passaram.
- Li a saída do `pnpm test`, que foi para segundo plano, só pela ferramenta Read. Não rodei comando fora da lista Pode.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — arquivos da pasta do pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 0d25f905baefbd1279ff46133e453624757771cb -- src test` — código e testes da T02
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo no início
- `grep -rn -e "RF-01" -e "CA-01" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1/01-analista-requisitos.md` — RF-01 e CA-01.x
- `grep -rn "AN-01" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1/04-seguranca-aplicacao.md` — AN-01
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "^### Tarefa 2" -e "^### Tarefa 3" -e "^## G" -e "^### T02" -e "^### T03" -- docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md` — seção da T02 no plano
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/acesso/matriz.ts` — a matriz
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/acesso/ator.ts` — tipos de ator
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files -- src/modules/acesso test` — testes existentes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files -- "src/*job*" "src/*worker*" "src/*agendador*" "scripts" "src/*.js" "src/*.mjs" "src/*.cjs"` — jobs, worker, scripts e o `.mjs` de `src/vendor`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -l -e "use server" -- src` — as Server Actions
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "ESPERADA" -e "it(" -- src/modules/acesso/matriz.test.ts` — o que a `ESPERADA` cobre
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/estatico/varreduras-qa.test.ts` — molde das varreduras
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "paths" -e "@/" -- tsconfig.json` — apelido `@/`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "resolver" -e "function " -e "importacoesDe" -- test/estatico/leituras-da-fila.test.ts test/estatico/dados-das-etapas.test.ts` — quem usa o leitor de importações
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "andamento/registrar" -- docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md` — quem importa o serviço no plano
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "vendor" -- docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md` — nenhuma mudança em `src/vendor`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "registrarAndamento" -- docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md` — só a rota chama o serviço; o seed não (D-07)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/estatico/piso-de-assercoes.test.ts` — regra do piso
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "it(" -e "it.each" -- test/estatico/piso-de-assercoes-qa.test.ts` — regras do piso-qa
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso/matriz-andamento-qa.test.ts test/estatico/andamento-qa.test.ts --reporter=dot` — 29 de 29
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c --untracked "expect(" -- src/modules/acesso/matriz-andamento-qa.test.ts test/estatico/andamento-qa.test.ts` — 31 e 13
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot --silent` — 313 arquivos, 6635 de 6635
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — só as linhas novas do `PISO`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — o `PISO` modificado e os dois arquivos de teste novos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 0d25f905baefbd1279ff46133e453624757771cb` — 9 arquivos, 7 da tarefa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -3` — `c71c957` (06-T02-revisao) no topo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo, depois do `PISO`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo, depois do `PISO`

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
