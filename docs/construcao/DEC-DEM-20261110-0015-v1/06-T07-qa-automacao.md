---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T07-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 01-analista-requisitos.md (RF-05, RF-06, RF-15, RNF-09, glossário), docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (T07), 06-T07-engenheiro-dados-bd.md, 06-T07-tech-lead.md, commit 179946e (por git diff 63c754a HEAD), src/modules/demandas/resumo-da-fila.ts, src/modules/demandas/resumo-da-fila.test.ts, test/estatico/leituras-da-fila.test.ts, src/modules/demandas/schemas.ts, src/db/schema/versoes.ts, test/banco.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T07 (leituras novas da fila, só SELECT). O código está no commit 179946e. Os commits 21f5c60, 8e6b04e,
97c5847, 1821c5c e 52124dd só mexem na pasta do pedido: `git diff 63c754a HEAD --stat` lista, fora dela, só os três
arquivos novos da tarefa. O código não falha em nenhum teste, e cada critério da tarefa tem teste. Acrescentei 5 testes
de borda. Nenhum teste existente mudou.

### Critério de aceite da tarefa e teste que o cobre

| Critério (plano T07 e 01) | Arquivo | Teste |
|---|---|---|
| CA-05.1 (dado): 3 `nova`, 2 `pronta_para_decisao`, os outros em 0, `todas` é a soma | `src/modules/demandas/resumo-da-fila.test.ts` | `contarDemandasPorStatus > CA-05.1: 3 nova e 2 pronta_para_decisao; status sem demanda vale 0; todas é a soma` |
| CA-05.4: com `tipo=bug`, só bug, e o status da URL é ignorado | idem | `contarDemandasPorStatus > CA-05.4: com tipo=bug, conta só bug; o filtro de status é ignorado` |
| RF-05: os contadores levam o filtro de linha, e tipo com linha vale como E | idem | `contarDemandasPorStatus > com linhaServicoProvavel, conta só a linha`; `… > tipo e linha juntos valem como E; combinação sem demanda dá tudo 0` |
| RF-05 e CA-05.3 (dado): os nove status mapeados, e status, `offset` e `limit` não mudam a contagem | idem | **novo** `contarDemandasPorStatus: bordas > cada um dos nove status tem o próprio contador: com tipo=bug, 1 em cada e todas = 9`; **novo** `… > CA-05.3: status, offset e limit da URL não mudam a contagem (só tipo e linha filtram)` |
| CA-06.1 (dado): ESP e RSK sem DEC dá `{ esp: true, rsk: true, dec: false }`, e várias versões contam como feita | idem | `etapasDasDemandas > CA-06.1: ESP e RSK sem DEC dá …` (mais os casos sem nada, com tudo e só com ESP) |
| RF-06: cada marca é da própria tabela, e "ao menos uma versão" inclui o rascunho de agente | idem | **novo** `etapasDasDemandas: bordas > cada marca olha a própria tabela: RSK sem ESP dá { esp: false, rsk: true, dec: false }`; **novo** `… > versão em rascunho de agente conta como feita` |
| CV-06: só `db.select`, sem `sql` do drizzle | `test/estatico/leituras-da-fila.test.ts` | `CV-06: resumo-da-fila.ts só lê > o módulo existe e não tem achado`, com os casos plantados (`reprova cada escrita plantada`, `reprova o sql do drizzle-orm …`, `reprova módulo sem select …`) |
| CV-06: filtros já validados e entregues como parâmetros | `resumo-da-fila.test.ts` | `contarDemandasPorStatus > CV-06: uma consulta só, com os filtros como parâmetros (nada do filtro no texto do SQL)` |
| CV-06: ids por `inArray`, como parâmetros | idem | `etapasDasDemandas > CV-06: os ids entram como parâmetros; texto de injeção não muda a consulta nem quebra`; **novo** `etapasDasDemandas: bordas > id repetido na lista dá uma entrada só, numa consulta só`; `… > só as demandas pedidas entram no mapa; id que não existe fica fora` |
| CV-06: lista vazia não consulta | idem | `etapasDasDemandas > lista vazia não consulta o banco e devolve mapa vazio` |
| CV-06: retorno só com contagens e booleanos, sem a sentinela | idem | `contarDemandasPorStatus > CV-06: o retorno só tem porStatus (as nove chaves) e todas, em números; nenhum título`; `etapasDasDemandas > CV-06: cada valor tem só as chaves esp, rsk e dec, booleanas; nenhum título` |
| CV-06 e CA-15.2: quem importa o módulo | `test/estatico/leituras-da-fila.test.ts` | `CV-06 e CA-15.2: quem importa resumo-da-fila > só os importadores permitidos importam o módulo por valor`, com `… > a varredura enxerga o código que roda …` e `… > acha cada forma de importação plantada …` |
| RNF-09: 4 consultas com 20 e com 100 | `resumo-da-fila.test.ts` | `RNF-09: custo fixo da fila > com 20 demandas, a carga da página faz 4 consultas (2 de hoje + 2 novas)` e `… com 100 demandas …` |
| RNF-09: custo sem varredura que cresça por demanda (plano de execução) | idem | `plano de execução das leituras novas com 5.000 demandas (EXPLAIN)` (6 casos e o teste da regra do plano) |
| CA-15.2: em `src/modules/`, só arquivo novo de leitura, sem linha alterada em função existente | `git diff` | `git diff 198e97d --stat -- src/modules` lista só `resumo-da-fila.ts` e o teste dele, os dois novos (418 linhas acrescentadas, nenhuma removida). A parte "sem escrita" é o estático acima |
| CV-01: rotas, `src/db`, `drizzle`, proxy e os nove `'use server'` sem diff | `git diff` | `git diff 198e97d --stat -- …` com a lista do G4 sai vazio |

### Testes acrescentados (5, em `src/modules/demandas/resumo-da-fila.test.ts`, no fim do arquivo)

São dois blocos novos, cada um com banco próprio (`bancoDoBloco`). Os dados entram no `beforeAll` com datas fixas, e os
testes só leem.

- `contarDemandasPorStatus: bordas`: uma demanda bug em cada um dos nove status, mais uma melhoria `nova`.
  - Com `tipo=bug`, os nove contadores dão 1 e `todas` dá 9. Isso prova que nenhum status do enum fica sem contador.
  - O resultado com `status=em_analise&offset=20&limit=1` é igual ao sem filtro (`nova` 2, os outros 1, `todas` 10).
    Contador com paginação ou com o status da URL daria números que não batem com a lista (CA-05.3).
- `etapasDasDemandas: bordas`:
  - Demanda só com RSK: `{ esp: false, rsk: true, dec: false }`. Os testes da construção cobriam "só ESP", mas não uma
    marca sem a anterior.
  - ESP v1 de agente, ainda rascunho (`autorTipo: 'agente'`, `rascunhoAgente: true`): `esp: true`. O glossário da 01
    diz "ao menos uma versão". O teste trava um filtro de rascunho que entre escondido.
  - Lista com id repetido: uma consulta, duas entradas, valores certos.

Rodada isolada: `resumo-da-fila.test.ts` e `leituras-da-fila.test.ts`, 2 arquivos, 32 de 32 (27 da construção e 5
novos).

### Resultado

- `pnpm test`: 221 arquivos, **4864 de 4864** (antes, 4859; mais os 5 novos).
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git diff --stat`: só `src/modules/demandas/resumo-da-fila.test.ts`, com 64 inserções e 0 remoções. Nenhum
  `.skip`, `.only` ou `.todo`, e nenhuma asserção afrouxada. Na T07, nenhum teste que já existia mudou: o
  `git diff 63c754a HEAD --stat` só cria arquivos.

## Decisões tomadas

- `proximo: tech-lead`: a etapa seguinte da tarefa é a `06-T07-decisao` (contrato, seção 4).
- Os testes novos ficam em blocos novos, com banco próprio, e não dentro dos blocos da construção. A contagem é da
  tabela inteira, e demanda a mais nos blocos existentes mudaria os números das asserções deles.
- O CA-15.2 ("sem linha alterada em função existente") é conferido por `git diff` nesta etapa, e não por teste
  automático. Um teste que roda `git diff 198e97d` quebraria no CI com clone raso. A parte de "sem escrita" já é teste
  (o estático).
- Não marquei como instável o bloco de EXPLAIN com o limite de 1 s (`performance.now()`). A folga é de mais de 100
  vezes (de 2 a 9 ms medidos nas duas rodadas de hoje), e a tabela tem no máximo 9.999 linhas. Ele é da construção, e
  não teste novo meu. O tech-lead já registrou que ele depende do relógio real (parecer 2), e a observação no CI fica
  com o `devops-sre`. Se falhar, a correção é afrouxar o tempo ou levar o bloco para `test/desempenho`, sem apagar a
  asserção do plano.
- Os testes da construção não são instáveis nem errados, e não devolvo nada. O `it.each([20, 100])` do RNF-09 popula
  de forma cumulativa, mas `popularAte(total)` completa a massa sozinho. Por isso cada caso também passa isolado.

## Pendências

- `engenheiro-dados-bd` (Minor, já registrado pelo tech-lead, parecer 3): o comentário de
  `test/estatico/leituras-da-fila.test.ts:53` promete que `import()` ou `require()` com caminho que não é literal "entra
  como importação de tudo". Mas a origem crua não casa com `apontaParaOModulo`, e esse importador não é contado. Hoje
  não existe import dinâmico do módulo. O caso plantado que provaria a regra não está no teste.
- `engenheiro-dados-bd` (Minor, parecer 1 do tech-lead): o comentário de `resumo-da-fila.ts:28-31` promete busca no
  índice por demanda. O EXPLAIN de hoje mostra de novo `hashed SubPlan` com Seq Scan nas três tabelas com 100 ids.
- `engenheiro-frontend` (T09): a regra da cadeia até a página vai no mesmo `test/estatico/leituras-da-fila.test.ts`.
  Os contadores na tela (CA-05.1 a CA-05.7) e as marcas de etapa (CA-06.1, nome acessível) ganham e2e na T09. Aqui
  só o dado está coberto.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -15` — topo 52124dd (06-T07-revisao)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 63c754a HEAD --stat` — fora da pasta do pedido, só os três arquivos novos da T07
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo, antes de escrever
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d --stat -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio (CV-01)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d --stat -- src/modules` — só `resumo-da-fila.ts` e `resumo-da-fila.test.ts`, 418 inserções (CA-15.2)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/resumo-da-fila.test.ts test/estatico/leituras-da-fila.test.ts` — 2 arquivos, 32 de 32
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 221 arquivos, 4864 de 4864
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — só `resumo-da-fila.test.ts`, 64 inserções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só `M src/modules/demandas/resumo-da-fila.test.ts`

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
