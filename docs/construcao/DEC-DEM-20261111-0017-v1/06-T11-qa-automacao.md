---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T11-testes
agente: qa-automacao
leu: [pedido.json (pela pasta), padrao-tecnico.md, contrato-passagem.md, tarefas.json, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (T11, linhas 2405 a 2557), 01-analista-requisitos.md (RF-06 a RF-09, linhas 180 a 254), 06-T11-engenheiro-frontend.md, 06-T11-tech-lead.md, 06-T10-qa-automacao.md (molde), commit c42e78bb0173d9ca95a7cd8428a0b8fd4de70341 (rotulos.ts), src/components/dados-do-andamento.ts, src/components/dados-do-andamento.test.ts, src/components/rotulos-andamento.test.ts, src/components/rotulos.ts (176 a 235), src/components/rotulos-qa.test.ts, src/app/(painel)/demandas/[id]/Historico.tsx, src/app/(painel)/demandas/[id]/detalhe.ts (valoresDoEvento), src/app/(painel)/demandas/[id]/detalhe.test.ts (importações), test/estatico/dados-das-etapas.test.ts, test/estatico/importacoes.ts, test/estatico/piso-de-assercoes.test.ts, test/estatico/relogio.test.ts, a saída do pnpm test]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verificação da T11 (rótulos, textos e regras puras do andamento na tela, commit `c42e78b`). O código cumpre os critérios
da tarefa e nenhum teste novo falhou contra ele. Acrescentei três arquivos de teste e subi o piso de asserções. Nenhum
teste existente mudou.

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

### Testes acrescentados

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
- `test/estatico/piso-de-assercoes.test.ts` (só acréscimo): pisos para os dois testes da T11, que a construção não contou
  (14 e 51), e para os três novos (27, 50 e 22), cada número igual à contagem de linhas com `expect(` no fim da etapa.

Nos três arquivos novos: 118 testes. Todas as datas são fixas (`new Date('2026-11-13T10:00:00Z')`), sem `Date.now`, sem
banco e sem estado compartilhado entre os `it`, então a ordem não importa.

### Resultado

- Arquivos da T11 e desta etapa, mais `piso-de-assercoes` e `dados-das-etapas`: 7 arquivos, **234 de 234**.
- `pnpm test` (suíte inteira): **343 arquivos, 7.661 testes: 7.659 passaram e 2 falharam**, por tempo sob carga, em
  arquivos que não importam nada da T11:
  - `scripts/scripts.test.ts`, bloco "qa-automacao T33": `statement timeout` no `pg_advisory_xact_lock`. É a mesma
    falha já registrada na construção e na revisão da T11.
  - `test/desempenho/leitura.test.ts` (RNF-03, p95 com 5.000 demandas): o p95 do detalhe deu 522 ms contra o limite de
    500 ms, com a suíte rodando junto.
  - Rodados de novo sozinhos: **2 de 2 arquivos, 72 de 72** (p95 da lista 91,4 ms e do detalhe 121,3 ms).
- `pnpm lint`: limpo. `pnpm typecheck`: limpo.
- `git diff` dos arquivos rastreados: só o acréscimo de 7 linhas em `test/estatico/piso-de-assercoes.test.ts`. Nenhum
  teste apagado, nenhum `.skip`, `.only` ou `.todo`, nenhuma asserção afrouxada.

## Decisões tomadas

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
  apontou para a T13, e um teste agora só serviria para forçar a devolução de algo já aceito. Registrado em Pendências.
- Erro meu no primeiro rascunho do teste do `-0`: a asserção olhava o JSON inteiro, e o id fictício do DEC tem "-0002".
  Corrigi o teste para olhar só os textos de tarefas. O código não foi tocado.

## Pendências

- M1 da revisão segue aberto para a T13 ou a 08: `conferido` (`src/components/dados-do-andamento.ts:42`) não confere
  `typeof a.decId === 'string'`. Um objeto montado à mão cujo `String()` caia no formato de `RE_ID_DEC` passaria para
  `dec.id`. Hoje não acontece: `lerAndamento` só devolve texto e o tipo é `string`.
- Instabilidade de tempo da suíte inteira, para a `08-revisao` e a `09-entrega`. Já apontada pela revisão da T11, e agora
  com um quarto arquivo: `test/desempenho/leitura.test.ts` (p95 de 522 ms contra 500 ms com a suíte inteira; 121 ms
  sozinho). Com `scripts/scripts.test.ts` T33, `resumo-da-fila.test.ts` e `minimizar.test.ts`, são quatro testes de
  relógio de parede sensíveis à carga. Sugestão: isolar os testes de desempenho num projeto do Vitest com poucos workers.
  Isso mexe em configuração, o que não cabe na 06.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T11" -- docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo antes de começar
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "CA-06.5" -- docs/construcao/DEC-DEM-20261111-0017-v1/01-analista-requisitos.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "CA-08" -- docs/construcao/DEC-DEM-20261111-0017-v1/01-analista-requisitos.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "CA-09" -- docs/construcao/DEC-DEM-20261111-0017-v1/01-analista-requisitos.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show c42e78bb0173d9ca95a7cd8428a0b8fd4de70341 -- src/components/rotulos.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "andamento_registrado" -- src test e2e`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files test/estatico`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "from '" -- src/components/rotulos.ts src/components/dados-do-pacote.ts src/modules/andamento/schemas.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "STATUS_DEMANDA" -- src/db/schema/demandas.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "from '" -- src/components/formulario.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export" -- src/components/rotulos.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "RE_ID_DEC =" -- src/components/dados-do-pacote.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "valoresDoEvento" -- src`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "from '" -- "src/app/(painel)/demandas/[[]id]/detalhe.ts"`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "import" -- src/components/LinhaDoTempo.tsx`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-do-andamento-qa.test.ts src/components/rotulos-andamento-qa.test.ts test/estatico/dados-do-andamento.test.ts --reporter=dot` — 117 de 118; a falha era do meu teste do `-0` (ver Decisões), corrigido
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-do-andamento-qa.test.ts src/components/rotulos-andamento-qa.test.ts test/estatico/dados-do-andamento.test.ts test/estatico/piso-de-assercoes.test.ts src/components/rotulos-andamento.test.ts src/components/dados-do-andamento.test.ts test/estatico/dados-das-etapas.test.ts --reporter=dot` — 7 arquivos, 234 de 234
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 343 arquivos, 7.659 de 7.661 (2 falhas de tempo sob carga, fora da T11; saída lida pela ferramenta Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — três arquivos novos e o `piso-de-assercoes` modificado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — só o acréscimo dos 5 pisos e de 2 linhas de comentário
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/scripts.test.ts test/desempenho/leitura.test.ts --reporter=dot` — 2 arquivos, 72 de 72

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste (tabela acima)
- [x] a suíte inteira passa (7.659 de 7.661; as 2 falhas são de tempo sob carga, em arquivos fora da T11, e passam sozinhas: 72 de 72)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real (datas fixas, funções puras, sem estado entre os `it`)
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`: só acréscimo de pisos)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real (DEC `DEC-DEM-20991231-000x-vN`, prefixo `a1b2c3d4` e "token" com `SENTINELA`, todos fictícios)
