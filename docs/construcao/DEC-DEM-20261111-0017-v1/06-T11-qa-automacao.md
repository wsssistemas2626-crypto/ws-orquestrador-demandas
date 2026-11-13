---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T11-testes
agente: qa-automacao
leu: [contrato-passagem.md, 06-T11-qa-automacao.md (entrega anterior), 06-T11-tech-lead.md (revisão, linhas 1 a 60), src/components/dados-do-andamento.ts, src/components/rotulos.ts (importações, linhas 1 a 30), src/components/dados-do-pacote.ts (importações e RE_ID_DEC, linhas 1 a 40), src/components/formulario.ts (importações, linhas 1 a 25), src/components/dados-do-andamento-qa.test.ts, src/components/rotulos-andamento-qa.test.ts, test/estatico/dados-do-andamento.test.ts, a saída do pnpm test. Desta etapa, lidos nas voltas anteriores e reaproveitados: pedido.json, padrao-tecnico.md, tarefas.json, o plano (T11, linhas 2405 a 2557), 01-analista-requisitos.md (RF-06 a RF-09), 06-T11-engenheiro-frontend.md, commit c42e78bb0173d9ca95a7cd8428a0b8fd4de70341, commit f11de01, src/components/dados-do-andamento.test.ts, src/components/rotulos-andamento.test.ts, src/components/rotulos-qa.test.ts, src/app/(painel)/demandas/[id]/Historico.tsx, src/app/(painel)/demandas/[id]/detalhe.ts, test/estatico/importacoes.ts, test/estatico/piso-de-assercoes.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verificação da T11 (rótulos, textos e regras puras do andamento na tela, commit `c42e78b`). O código cumpre os critérios
da tarefa e nenhum teste novo falhou contra ele. Os testes desta etapa já estão no ramo (commit `f11de01`): três arquivos
novos e cinco pisos novos no `piso-de-assercoes`. Esta volta refaz a etapa sem o `ls` em `/tmp` da volta anterior, que
ficou fora da lista Pode. Nenhum arquivo de teste mudou. Pelo Bash rodei só `pnpm --dir <repo> test`, `lint` e
`typecheck`. A leitura foi toda pela ferramenta Read.

### Critérios da tarefa e o teste que cobre cada um

`E` = teste do engenheiro (`rotulos-andamento.test.ts`, `dados-do-andamento.test.ts`); `Q` = teste novo desta etapa.

| Critério (T11 do plano; 01) | Arquivo | Teste |
|---|---|---|
| Rótulos das seis fases e das três situações (03, seção 8), congelados, iguais às listas do esquema | E `src/components/rotulos-andamento.test.ts` | `rótulos da 03, seção 8`; `as cópias da tela não se afastam das listas e do máximo do esquema` |
| `tarefasEmTexto`: plural e singular do total 1 | E `rotulos-andamento.test.ts`; Q `rotulos-andamento-qa.test.ts` | `tarefasEmTexto: plural e singular de total 1 (03, seção 8)`; `limites dos números na frase > 1 de 1: singular` |
| RF-06 e 03 5.7: frase do `andamento_registrado` (andamento, fim, cancelamento; total 0; total 1) | E `rotulos-andamento.test.ts`; Q `src/components/rotulos-andamento-qa.test.ts` | `textoDoEvento(andamento_registrado), 03 5.7 > %o` (17 casos); `as 18 combinações de fase × situação (03, 5.7) > %s, %s` (18 casos, com total 2/5 e 0/0) |
| CA-06.5: o histórico mostra em pt-BR o DEC, a fase, "x de y tarefas" e "/construir (prefixo …)", sem token nem hash | Q `rotulos-andamento-qa.test.ts` | `CA-06.5 no histórico da demanda (componente Historico) > a linha mostra a frase em pt-BR com o DEC, a fase e "x de y tarefas", e o ator "/construir (prefixo …)"`; `… > as três situações na mesma lista, cada uma com a sua frase`; `… > sem token nem hash: nem em depois, nem em antes, nem no lugar do prefixo`; `a frase vem só de depois > chave extra em depois não aparece (token, hash, texto livre)` |
| C-30: sem "Antes/Depois" no `andamento_registrado`; o `antes` não muda a frase | Q `rotulos-andamento-qa.test.ts` | `a frase vem só de depois > nenhum Antes/Depois para o andamento_registrado (C-30)`; `… > o antes (andamento anterior, válido ou com sentinela) não muda o texto` |
| AN-12 na frase: valor fora da lista, chave herdada, número fora do formato e chave ausente caem na frase genérica; DEC fora do formato vira "um pacote de decisão"; HTML não vira marcação | E `rotulos-andamento.test.ts`; Q `rotulos-andamento-qa.test.ts` | os casos genéricos do `it.each` do engenheiro e `DEC fora do formato: "um pacote de decisão"`; `limites dos números na frase > %s: frase genérica` (7 casos: NaN, Infinity, nulo, booleano, objeto Number, 1000, texto); `chave ausente ou fora da lista: frase genérica (AN-12) > %s` (14 casos); `CA-06.5 … > HTML gravado na fase não vira marcação` |
| RF-08 e 03 4.1: selo visível, do leitor de tela e cor, para cada linha da 03 (com o singular do total 1) | E `src/components/dados-do-andamento.test.ts`; Q `src/components/dados-do-andamento-qa.test.ts` | `seloDeFase (03, 4.1) > em_construcao: %o` (7 casos); `as seis fases da lista, cada uma com o rótulo da 03 > %s → %s no selo e na seção` (6 casos) |
| CA-08.1: "Construindo · 9/17" | E `dados-do-andamento.test.ts` | `seloDeFase (03, 4.1) > em_construcao: %o` (primeiro caso) |
| CA-08.2: `entendendo_o_pedido 0/0` → só "Entendendo o pedido" | E `dados-do-andamento.test.ts`; Q `dados-do-andamento-qa.test.ts` | o caso de total 0 do `it.each`; o segundo `expect` de `%s → %s no selo e na seção` |
| CA-08.3: `construido` → "Construção concluída" | E `dados-do-andamento.test.ts` | os dois casos de `construido` do `it.each` |
| CA-08.4: sem selo em `em_construcao` sem andamento e em todo outro status com andamento | E `dados-do-andamento.test.ts`; Q `dados-do-andamento-qa.test.ts` | `sem selo em todo status diferente de em_construcao …`; `CA-08.4 pela lista do esquema (M2 da revisão) > %s: sem selo, com andamento em qualquer situação` (8 status, de `STATUS_DEMANDA`); `… > só em_construcao tem selo, com o mesmo andamento`; `… > em_construcao sem andamento: sem selo` |
| CA-09.1 (regra): DEC com link, fase, situação, barra 9 de 17 com `valorTexto` e recurso, data por `formatar` e ISO, nota | E `dados-do-andamento.test.ts`; Q `dados-do-andamento-qa.test.ts` | `secaoDoAndamento (03, 5.2 e 5.3) > construindo 9/17 (CA-09.1)`; `… > a linha da data: formatar injetado e o ISO de atualizadoEm`; `pureza > não chama formatar quando devolve null; chama uma vez, com a data do andamento, …` |
| CA-09.2: total 0 sem barra, com o texto da 03 | E `dados-do-andamento.test.ts`; Q `dados-do-andamento-qa.test.ts` | `total 0: o texto da 03 e sem barra (CA-09.2)`; `limites dos números > 0 de 17: barra com valor 0, não "sem plano"` |
| CA-09.3: cancelada → alerta | E `dados-do-andamento.test.ts` | `cancelada: situação "Cancelada" e o alerta (CA-09.3)`; `cancelada e substituído: os dois alertas, nessa ordem` |
| CA-09.4: sem andamento → sem seção | E `dados-do-andamento.test.ts` | `sem andamento: null (CA-09.4)` |
| 03 5.2 item 3: pacote substituído → alerta com o id | E `dados-do-andamento.test.ts`; Q `dados-do-andamento-qa.test.ts` | `pacote do decId substituído: o alerta com o id`; `o DEC na seção … > o mesmo id duas vezes na lista de pacotes: um alerta só`; `… > o alerta de substituído compara o id inteiro, não o começo` |
| AN-12 e CV-19 no selo e na seção: valor fora do esquema vale como sem andamento; link e alerta só com `RE_ID_DEC` | E `dados-do-andamento.test.ts`; Q `dados-do-andamento-qa.test.ts` | os testes `… montado à mão (AN-12)` do engenheiro; `valor fora da lista (AN-12): sem selo e sem seção > %s` (17 casos); `… > concluída e cancelada não mostram a fase, mas a fase fora da lista ainda tira o selo e a seção`; `… > data inválida também tira o selo`; `limites dos números > %s: sem selo e sem seção` (9 casos); `o DEC na seção … > %s: dec null, sem link e sem alerta com o id` (7 casos: sufixo de caminho, `\n` no fim, prefixo, minúsculas, aspas, vazio, versão de 5 dígitos) |
| Limites do número (0 a 999, prontas ≤ total) | Q `dados-do-andamento-qa.test.ts`, `rotulos-andamento-qa.test.ts` | `999 de 999 (o máximo do esquema) ainda é válido`; `prontas igual a total é válido; uma acima, não`; `-0 vale como 0: o texto nunca mostra "-0"`; `999 de 999 e 0 de 999 são válidos` |
| CV-09 (vai ao navegador): `dados-do-andamento.ts` só importa por valor `./rotulos` e `./dados-do-pacote`; de `src/modules` e `src/db/schema`, só tipo (M3 da revisão) | Q `test/estatico/dados-do-andamento.test.ts` | `CV-09: o que dados-do-andamento.ts importa > o módulo existe, tem importações e não tem achado`; `… > reprova cada importação plantada` (19 casos); `… > aceita tipo de src/modules (fora de acesso) e de src/db/schema, e valor da lista de permissão` |
| Funções puras: não mudam a entrada e devolvem objeto novo | Q `dados-do-andamento-qa.test.ts` | `pureza > não muda a entrada (andamento e pacotes congelados)`; `… > cada chamada devolve uma lista de alertas nova`; `… > a mesma entrada dá a mesma saída` |

### Testes acrescentados (no ramo desde `f11de01`)

- `src/components/dados-do-andamento-qa.test.ts`: o selo e a seção. CA-08.4 percorre `STATUS_DEMANDA`, a lista do esquema
  (M2 da revisão). Cobre as seis fases de `FASES_ANDAMENTO`, os limites (999, 0 de 17, NaN, Infinity, -0, bigint), as
  chaves herdadas além de `__proto__` e `toString`, o rótulo no lugar da chave, o espaço em volta, a fase inválida em
  "concluída" e "cancelada" (que não mostram a fase), a data inválida no selo, o DEC quase no formato e a pureza.
- `src/components/rotulos-andamento-qa.test.ts`: a frase do histórico. Cobre as 18 combinações de fase e situação, os
  limites e o CA-06.5 renderizado pelo componente `Historico` (`renderToStaticMarkup`): a frase, o ator
  `/construir (prefixo a1b2c3d4)`, nada do token fictício nem do hash (em `depois`, em `antes` ou no lugar do prefixo)
  e nenhum "Antes/Depois".
- `test/estatico/dados-do-andamento.test.ts`: guarda das importações de `dados-do-andamento.ts` (M3 da revisão). Usa o
  leitor único `test/estatico/importacoes.ts` (D-T10-01), com um caso plantado para cada regra.
- `test/estatico/piso-de-assercoes.test.ts` (só acréscimo, 7 linhas): pisos para os dois testes da T11, que a construção
  não contou (14 e 51), e para os três novos (27, 50 e 22).

Nos três arquivos novos: 118 testes. Todas as datas são fixas (`new Date('2026-11-13T10:00:00Z')`), sem `Date.now`, sem
banco e sem estado compartilhado entre os `it`, então a ordem não importa.

### Conferido pela ferramenta Read

- Importações de `src/components/dados-do-andamento.ts` (linhas 7 a 12): por valor só `./dados-do-pacote` (`RE_ID_DEC`)
  e `./rotulos`; `import type` de `../db/schema/andamento`, `../db/schema/demandas`, `../modules/andamento/schemas` e
  `../modules/demandas/consultas`. Bate com a guarda CV-09.
- `RE_ID_DEC = /^DEC-DEM-\d{8}-\d{4}-v\d{1,4}$/` (`src/components/dados-do-pacote.ts:13`): os 7 DECs quase no formato do
  teste ficam fora dela.
- A cadeia citada em Decisões: `rotulos.ts:12` importa `RE_ID_DEC` de `./dados-do-pacote`; `dados-do-pacote.ts:8`
  importa por valor de `./formulario`; `formulario.ts:6` importa `MENSAGENS_ACESSO` de `../modules/acesso/mensagens`.
- Diferença desde `c42e78b`, vista com `git diff --stat` e `git show f11de01` na volta anterior: só inserções. Nos
  arquivos de teste, os três novos e o acréscimo de 7 linhas no `piso-de-assercoes`. Nesta volta nenhum arquivo do
  repositório mudou, só esta entrega.

### Resultado (rodado nesta volta)

- Arquivos da T11 e desta etapa, mais `piso-de-assercoes` e `dados-das-etapas`: 7 arquivos, **234 de 234**.
- `pnpm test` (suíte inteira): **343 arquivos, 7.661 testes: 7.660 passaram e 1 falhou**, por tempo sob carga, num
  arquivo que não importa nada da T11:
  - `scripts/scripts.test.ts`, "qa-automacao T33 > duas subidas ao mesmo tempo semeiam uma vez só": `canceling
    statement due to statement timeout` no `pg_advisory_xact_lock`. É a mesma falha das voltas anteriores, da
    construção e da revisão da T11.
  - Rodado de novo sozinho: **1 de 1 arquivo, 48 de 48**.
  - O comando da suíte foi chamado em primeiro plano, com timeout de 600000 ms. A ferramenta Bash o passou para segundo
    plano sozinha depois de 180 s e informou na própria resposta o caminho da saída. Li esse arquivo com a ferramenta
    Read, sem listar pasta.
- `pnpm lint`: limpo. `pnpm typecheck`: limpo.

## Decisões tomadas

- Os testes das voltas anteriores ficam como estão: conferidos de novo, eles cobrem os critérios, passam e não têm segredo
  nem relógio real. Reescrever não traria nada.
- Arquivos `-qa` ao lado dos do engenheiro, sem editar os dele. O M2 entrou como teste novo sobre `STATUS_DEMANDA`, e a
  lista escrita à mão continua, então nenhum teste existente mudou.
- CA-06.5 testado no componente `Historico`, não só em `textoDoEvento`: assim a frase, o ator e a ausência do token
  ficam provados na mesma linha que a tela monta. O e2e com axe é da T12 e da T13.
- Guarda CV-09 própria para `dados-do-andamento.ts`, mais aberta que a de `dados-das-etapas.ts`: aceita tipo de
  `src/db/schema/` (o arquivo importa `StatusConstrucao` e `StatusDemanda`) e veta `db` fora do esquema. Só olha as
  importações diretas: a cadeia `rotulos` → `dados-do-pacote` → `formulario` chega por valor a
  `modules/acesso/mensagens` (constantes de texto). Isso já existia antes da T11 e fica fora desta guarda.
- Pisos no `PISO`: os testes da T11 cobrem AN-12 (texto gravado de fora não chega à tela), uma regra de segurança. O
  piso só sobe e não custa nada a quem não remove asserção.
- M1 (o `decId` não é conferido como `string`) fica sem teste nesta etapa. A revisão o classificou como Minor e o
  apontou para a T13. Registrado em Pendências.

## Pendências

- M1 da revisão segue aberto para a T13 ou a 08: `conferido` (`src/components/dados-do-andamento.ts:42`) não confere
  `typeof a.decId === 'string'`. Um objeto montado à mão cujo `String()` caia no formato de `RE_ID_DEC` passaria para
  `dec.id`. Hoje não acontece: `lerAndamento` só devolve texto e o tipo é `string`.
- Instabilidade de tempo da suíte inteira, para a `08-revisao` e a `09-entrega`. Nas voltas desta etapa caíram três
  arquivos diferentes, todos de relógio de parede ou de `statement_timeout`, todos verdes sozinhos:
  `scripts/scripts.test.ts` T33 (em todas as voltas), `test/desempenho/leitura.test.ts` (p95 de 522 ms contra 500 ms) e
  `src/app/api/saude/route.test.ts` (503 em vez de 200). Com `resumo-da-fila.test.ts` e `minimizar.test.ts`, já
  apontados na revisão da T11, são cinco testes sensíveis à carga. Sugestão: isolar os testes de tempo e de desempenho
  num projeto do Vitest com poucos workers. Isso mexe em configuração, o que não cabe na 06.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do repositório.

## Comandos executados

- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-do-andamento-qa.test.ts src/components/rotulos-andamento-qa.test.ts test/estatico/dados-do-andamento.test.ts test/estatico/piso-de-assercoes.test.ts src/components/rotulos-andamento.test.ts src/components/dados-do-andamento.test.ts test/estatico/dados-das-etapas.test.ts --reporter=dot` — 7 arquivos, 234 de 234
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 343 arquivos, 7.660 de 7.661 (1 falha de tempo sob carga, fora da T11; saída lida pela ferramenta Read)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/scripts.test.ts --reporter=dot` — 1 arquivo, 48 de 48

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste (tabela acima)
- [x] a suíte inteira passa (7.660 de 7.661; a falha é de tempo sob carga, num arquivo fora da T11, e passa sozinho: 48 de 48)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real (datas fixas, funções puras, sem estado entre os `it`)
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (diferença desde `c42e78b` só com inserções; nesta volta nenhum arquivo de teste mudou)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real (DEC `DEC-DEM-20991231-000x-vN`, prefixo `a1b2c3d4` e "token" com `SENTINELA`, todos fictícios)
