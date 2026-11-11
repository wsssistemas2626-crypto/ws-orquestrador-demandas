---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T08-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 01-analista-requisitos.md (glossário, RF-05, RF-06, RF-07), 04-seguranca-aplicacao.md (C08, CV-07, CV-19), 05-tech-lead.md, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7, T08), 06-T08-engenheiro-backend.md, 06-T08-tech-lead.md, 06-T07-qa-automacao.md (cabeçalho), commit 29eaa9f (por git diff 6793489 1625f56), src/components/dados-da-fila.ts, src/components/dados-da-fila.test.ts, src/components/rotulos.ts, src/app/(painel)/demandas/fila.tsx, src/modules/demandas/schemas.ts, src/lib/fuso.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T08 (regras de exibição da fila, `engenheiro-backend`). O código está no commit 29eaa9f; os commits
seguintes (d909f23, 84b18f2, 1625f56) são só a revisão e o registro. Conferi o código contra o plano e os critérios e
acrescentei 27 testes de borda, todos em `src/components/dados-da-fila.test.ts`. Nenhum arquivo de código mudou, e
nenhum outro teste foi tocado.

### Critério de aceite da tarefa e o teste que o cobre

Arquivo de todos: `src/components/dados-da-fila.test.ts`. "(eng.)" é teste do engenheiro; "(qa)" é teste que acrescentei.

| Critério | Teste |
|---|---|
| CA-05.1 (ordem, totais, só "Todas" pressionado sem status) | (eng.) `contadoresDaFila (RF-05) > CA-05.1: "Todas" e os nove status na ordem de ROTULO_STATUS…`; (qa) `contadoresDaFila: bordas > cobre exatamente os nove status do enum…`; (qa) `… > total 0 é número, não null…` |
| CA-05.3 (troca o status, mantém `tipo` e `linhaServicoProvavel`, sem `offset`) | (eng.) `contadoresDaFila (RF-05) > CA-05.3: ativar "Em análise"…`; (qa) `contadoresDaFila: bordas > CA-05.3: todo contador mantém tipo e linhaServicoProvavel e nenhum leva offset`; (qa) `… > volta à página 1: a função de endereço recebe offset 0 em todos os dez contadores` |
| CA-05.5 (o pressionado e "Todas" tiram o status) | (eng.) `contadoresDaFila (RF-05) > CA-05.5…`; (qa) `contadoresDaFila: bordas > com cada status na URL, só o contador dele fica pressionado, com valor vazio e href sem status` (os nove status) |
| CA-05.7 na regra (`?status=xyz`: "Todas" pressionado) | (qa) `CA-05.7 e CV-07 na regra: filtro inválido da URL > CA-05.7: ?status=xyz é inválido, cai no filtro padrão e só "Todas" fica pressionado` (passa por `lerFiltroDaFila`, o mesmo caminho da página) |
| 03, 4.6 (contagem que falhou: sem número, filtros funcionando) | (eng.) `contadoresDaFila (RF-05) > contagem que falhou…`; (qa) `contadoresDaFila: bordas > contagem que falhou não muda pressionado, href, valor nem cor (03, 4.6)` |
| CA-06.1 (texto acessível das etapas) | (eng.) `textoDasEtapas (RF-06) > CA-06.1…`; (qa) `textoDasEtapas: as oito combinações` (8 casos) |
| CA-06.2 (Hoje, 1 dia, N dias em dias de calendário de São Paulo; data e ISO do `<time>`) | (eng.) `idadeDaDemanda (CA-06.2)…` (4 casos e a data); (qa) `idadeDaDemanda: bordas > agora %s, criada %s → %s` (5 casos: virada do dia local do agora, 2 dias, virada de mês, virada de ano), `… > a data "criada em" é a do calendário de São Paulo, não a do UTC`, `… > criada depois do agora…` |
| CV-07 (href e valor só do enum; filtro inválido não gera status) | (eng.) `contadoresDaFila (RF-05) > CV-07 e CV-19…`; (qa) `CA-05.7 e CV-07 na regra > CV-07: status injetado com tipo=bug não aparece em nenhum href nem valor`, `… > CV-07: status repetido na URL (chega como lista)…`, `… > status vazio (opção "Todos" do formulário sem script) não é inválido…` |
| CV-19 (href dos contadores só para `/demandas`) | (eng.) `contadoresDaFila (RF-05) > CV-07 e CV-19…`; (qa) o teste do status injetado confere `^/demandas(\?|$)` em todo contador |
| Função pura, só `import type` de `src/modules/` | leitura do código (linhas 5 a 8 de `dados-da-fila.ts`: valores só de `lib/fuso` e `./rotulos`); (qa) `contadoresDaFila: bordas > não altera o filtro recebido` (filtro congelado) e `idadeDaDemanda: bordas > não altera as datas recebidas`. O teste estático de importação dos `dados-*.ts` é o do CV-09 (T10) |
| CV-01 | sem arquivo de código alterado nesta etapa; `git diff --stat` só lista o arquivo de teste |

### Testes acrescentados (27)

- `contadoresDaFila: bordas (06-T08-testes)`, 7: enum inteiro coberto e cada `href`/`valor` do próprio status; cada um
  dos nove status pressionado sozinho; `tipo` e `linhaServicoProvavel` em todos os `href`, nenhum com `offset`; a
  função de endereço sempre com offset 0 (espião, independente de `hrefDaFila`); filtro recebido não é alterado; total
  0 é número e não `null`; contagem que falhou com os mesmos pressionado, `href`, `valor` e cor.
- `CA-05.7 e CV-07 na regra: filtro inválido da URL (06-T08-testes)`, 4: `status=xyz`; `status` com `<script>` e
  `tipo=bug`; `status` repetido (lista); `status` vazio, que não é inválido.
- `idadeDaDemanda: bordas (06-T08-testes)`, 8: data de criação no futuro dá "Hoje" (Minor 2 da revisão); agora às
  23h30 e às 00h00 locais; 2 dias; 40 dias na virada de mês; 1 dia na virada de ano; "criada em" no calendário de São
  Paulo (02h30 UTC de 10/11 é 09/11); datas recebidas não alteradas.
- `textoDasEtapas: as oito combinações (06-T08-testes)`, 8.

Cada teste novo falharia com a regra errada: `dias === 0` no lugar de `dias <= 0` daria "-2 dias" na data futura; contar
em UTC daria "Hoje" para 02h30 UTC de 10/11 e "10/11/2026" na data; refletir o status cru deixaria `<script>` no `href`;
um offset diferente de 0 reprova o espião; inverter "feita"/"por fazer" ou a ordem ESP, RSK, DEC reprova as oito
combinações.

### Resultado

- `pnpm test src/components/dados-da-fila.test.ts`: 1 arquivo, 40 de 40 (13 do engenheiro e 27 novos).
- `pnpm test`: 222 arquivos, 4.904 de 4.904 (eram 4.877; +27).
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git diff`: só `src/components/dados-da-fila.test.ts`, 149 linhas novas; as 2 linhas trocadas são as importações
  (acrescentam `lerFiltroDaFila`, `STATUS`, `FiltroDemandas` e `Status`). Nenhuma asserção existente mudou, e não há
  `.skip`, `.only` nem `.todo`.

## Decisões tomadas

- Minor 1 da revisão (lista de status à mão no teste CV-07/CV-19): deixei o teste do engenheiro como está e acrescentei
  um teste que compara os contadores com `STATUS` de forma exata. Assim o enum mudar quebra um dos dois testes nos dois
  sentidos, e não troco asserção existente.
- Minor 2 da revisão (criação no futuro): coberto com "Hoje", o comportamento que o código tem e que a revisão aceitou.
- CA-05.7 testado pela cadeia `lerFiltroDaFila` mais `contadoresDaFila`, a mesma que a página vai usar. O alerta na
  tela e o e2e de `?status=%3Cscript%3E` ficam com a T09 (`e2e/fila-contadores.spec.ts`), que é do frontend.
- O filtro inválido derruba o filtro inteiro (inclusive `tipo`), regra da 0.1.13 em `lerFiltroDaFila`. Os testes
  conferem essa regra e não exigem que `tipo` sobreviva.
- Dados todos fictícios: datas fixas, nenhum nome, e-mail nem `Date` sem argumento.

## Pendências

- Nenhuma da T08. Para a T09 (`engenheiro-frontend`): o e2e do CV-07 (`/demandas?status=%3Cscript%3E&tipo=bug` com
  alerta, "Todas" pressionado e nenhum `input[name=status]` fora do enum) e o CA-05.7 na tela continuam com ela.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — topo 1625f56 (06-T08-revisao), construção em 29eaa9f
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 6793489 1625f56` — 2 arquivos de código da T08 e 3 da pasta do pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d 1625f56 --stat -- src/db/schema/demandas.ts src/components/rotulos.ts` — só `rotulos.ts` (T03)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-da-fila.test.ts` — 40 de 40
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 4904 de 4904 (222 arquivos)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — só `src/components/dados-da-fila.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -U0 -- src/components/dados-da-fila.test.ts` — 2 linhas de importação trocadas, o resto só acréscimo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — só o arquivo de teste modificado

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
