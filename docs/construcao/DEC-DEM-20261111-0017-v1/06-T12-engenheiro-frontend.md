---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T12-construcao
agente: engenheiro-frontend
leu: [pedido.json, tarefas.json, padrao-tecnico.md, contrato-passagem.md, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (G1 a G10, T11 a T14, V-02), 03-ux-ui-design.md (seções 0 a 4 e início da 5), 06-T10-engenheiro-backend.md, 06-T11-engenheiro-frontend.md, src/app/(painel)/demandas/leituras-da-fila.ts, src/app/(painel)/demandas/leituras-da-fila.test.ts, src/app/(painel)/demandas/page.tsx, src/app/(painel)/demandas/fila.tsx, src/app/(painel)/demandas/fila.test.ts, src/app/(painel)/demandas/fila-qa.test.ts (mocks e dublês), src/app/(painel)/demandas/CartoesDaFila.tsx, src/components/dados-do-andamento.ts, src/components/dados-do-andamento.test.ts (fixtures), src/components/Selo.tsx, src/components/Alerta.tsx, src/components/MarcasDeEtapa.tsx, src/modules/andamento/consultas.ts, src/modules/andamento/regras.ts, src/modules/andamento/schemas.ts, test/estatico/andamento.test.ts, test/estatico/leituras-da-fila.test.ts, e2e/apoio.ts, e2e/fila-contadores.spec.ts, playwright.config.ts, package.json, scripts/seed-ficticio.ts (cabeçalho)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T12 do plano: selo de fase na célula Status da tabela e no topo do cartão da fila, leitura do andamento por página
(`andamentosDaPagina`) e o estado de erro só do andamento (03, 4.4). Cobre RF-08, CA-08.1 a CA-08.5, AN-12 (fila), C-04
(cadeia da leitura nova) e D-12, D-16.

**Arquivos alterados**

| Arquivo | O que mudou |
|---|---|
| `src/app/(painel)/demandas/leituras-da-fila.ts` | `andamentosDaPagina(db, ids)`: `andamentosDasDemandas` (uma consulta por página) e cada linha por `lerAndamento` (fora do esquema fica fora do mapa); a falha vira `null` e um log `painel_andamento_falhou` com a rota, sem ids, SQL nem parâmetro |
| `src/app/(painel)/demandas/page.tsx` | `ListaDaFila` chama `andamentosDaPagina` depois das etapas, **fora** do `try` da lista, e passa `andamentos` a `ResultadoDaFila` |
| `src/app/(painel)/demandas/fila.tsx` | `ResultadoDaFila` recebe `andamentos?: ReadonlyMap<string, AndamentoVista> \| null`; a célula Status vira `<span class="flex flex-col items-start gap-1">` com o `Selo` e o `SeloDaFase`; com `andamentos === null`, `Alerta tipo="atencao"` estático com `TEXTOS_ANDAMENTO.erroNaFila` entre a região de aviso e o título do resultado |
| `src/app/(painel)/demandas/CartoesDaFila.tsx` | `SeloDaFase({ status, andamento })` (um pedaço só para tabela e cartão): chama `seloDeFase` e devolve `null` ou o texto visível `aria-hidden` (13 px, 600, cor por mapa fixo `text-marinho`/`text-positivo`/`text-tinta-media`, sem `style=`) seguido do `sr-only`; `andamentoDe(mapa, id)`; no cartão, o selo de status e o de fase empilhados à direita (`flex flex-col items-end gap-1 text-right`), no `div` do topo que já quebra linha (`flex-wrap`), sem item novo na `dl`; `CartoesDaFila` recebe `andamentos` opcional |
| `test/estatico/andamento.test.ts` | acréscimo (D-04): `achadosDoAndamentoNaPagina` e o bloco "T12": `page.tsx` chama `andamentosDaPagina(` dentro de `ListaDaFila`, nunca fora dela e nunca dentro de um `try`; com o caso plantado de cada regra. Nada do que existia mudou |
| `src/app/(painel)/demandas/fila-qa.test.ts` | **fora da G5, explicado abaixo**: uma linha a mais no `vi.mock('./leituras-da-fila')`, `andamentosDaPagina: vi.fn(async () => new Map())`, com comentário. Nenhuma asserção mudou |

**Arquivos criados**

- `src/app/(painel)/demandas/fila-andamento.test.ts` (14 testes, render no servidor no molde de `fila.test.ts`): selo
  "Construindo · 9/17" + "Andamento: Construindo, 9 de 17 tarefas prontas." na célula Status, abaixo do selo de status,
  e o mesmo no topo do cartão (antes do `h3`, `dl` com 6 `dt`); uma vez por forma; "Construção concluída" em positivo;
  total 0 só com a fase; cancelada em `tinta-media`; sem selo em `em_construcao` sem andamento e em `devolvida` com
  andamento; sem `style=`; sem `andamentos` (props de antes), nem selo nem aviso; `andamentos: null` → o `Alerta`
  atencao estático (sem `role="alert"`) com o texto da 03, uma vez, antes do `h2` do resultado, linhas e cartões sem selo;
  lista vazia sem o aviso; `andamentosDaPagina` com banco que lança → `null` e um log `painel_andamento_falhou` sem
  sentinela de SQL nem ids; com linhas, só a válida entra no mapa (fase com HTML, prontas > total e DEC fora do formato
  ficam fora), já como `AndamentoVista`, sem log; página vazia → mapa vazio sem consultar.
- `e2e/andamento-fila.spec.ts` (4 testes, conta "cto", só leitura, demandas do seed da T10, sem criar nada):
  1. 1280 × 720, `/demandas?status=em_construcao&limit=100`: `andamentoConstruindo` "Construindo · 9/17" e o texto
     oculto, abaixo do selo de status; `andamentoConcluido` "Construção concluída"; `andamentoSemPlano` só "Entendendo o
     pedido"; `emConstrucaoSemAndamento` sem selo; `?status=devolvida`: `andamentoCancelado` sem selo (CA-08.1 a 08.4);
  2. 390 × 844, o mesmo no topo do cartão, e a `dl` com os seis `dt` de hoje;
  3. 320 px: `andamentoRevisando` "Revisando e entregando · 17/17", `scrollWidth` ≤ 320;
  4. axe sem violação com os selos, em 1280 × 720 e 390 × 844 (`semViolacoesNasDuasLarguras`) (CA-08.5).
  Tempo: o mais lento, 8,7 s sozinho e 4,6 s na suíte inteira (todos abaixo de 24 s).

**Teste antes do código (visto falhando)**

`pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/fila-andamento.test.ts" test/estatico/andamento.test.ts --reporter=dot`
antes do código:

```
 FAIL  test/estatico/andamento.test.ts > T12: a fila lê o andamento por página, em ListaDaFila > page.tsx chama andamentosDaPagina( dentro de ListaDaFila, fora do try da lista
+   "sem andamentosDaPagina( em ListaDaFila",
 FAIL  src/app/(painel)/demandas/fila-andamento.test.ts > selo de fase na fila (03, 4.1; CA-08.1 a CA-08.4) > tabela: a célula Status tem o selo de status e, abaixo, ...
 FAIL  ... > andamentosDaPagina (RF-08; ADR-35; AN-12; D-16) > banco que falha: ...
TypeError: andamentosDaPagina is not a function
 Test Files  2 failed (2)
      Tests  10 failed | 20 passed (30)
```

(Os 20 que passaram são os testes antigos do arquivo estático, a regra plantada nova e os casos "sem selo" do arquivo
novo, que já valiam sem o código.)

**Depois do código**

- Os dois arquivos da tarefa: 30 de 30.
- `pnpm typecheck` e `pnpm lint`: limpos (rodados depois da última mudança).
- `pnpm test` (suíte inteira), primeira volta: 343 de 344 arquivos; 19 falhas, todas em `fila-qa.test.ts` (o mock de
  `./leituras-da-fila` sem `andamentosDaPagina`). Corrigido o mock (ver desvios); `src/app/(painel)/demandas` e
  `test/estatico`: 64 de 64 arquivos, 1.452 de 1.452 testes.
- `pnpm test` (suíte inteira), segunda volta: 343 de 344 arquivos, 7.675 de 7.677 testes; as 2 falhas são de
  `src/app/api/saude/route.test.ts` (503 sob carga, instabilidade conhecida). Sozinho: 6 de 6.
- `pnpm test:e2e e2e/andamento-fila.spec.ts`: 4 de 4.
- `pnpm test:e2e` (suíte inteira, 289 testes): 276 passaram, 9 pulados (`capturas.spec.ts`, como sempre), 4 falharam:
  - `e2e/integracoes.spec.ts:59` e `e2e/integracoes-qa.spec.ts:204`: esperam as seis chaves da vista do Awave e recebem
    sete (`andamento`), mudança da T09. A troca de seis para sete é da **T14** pela G5 ("`e2e/integracoes.spec.ts:59` e a
    lista equivalente de `e2e/integracoes-qa.spec.ts` | seis → sete chaves | T14"): não mexi. Falham desde a T09; nenhuma
    tarefa anterior rodou e2e.
  - `e2e/axe-todas.spec.ts:247` (T08 Novo parecer de risco, tempo do axe estourou 30 s) e `e2e/especificacao.spec.ts:58`
    (a URL não mudou em 5 s depois de "Gravar"): telas que esta tarefa não toca. Rodados de novo sozinhos, os dois
    arquivos passam: 25 de 25.
- e2e que leem a célula Status ou o topo do cartão de demanda em construção (G5): nenhum falhou com o selo novo; **não
  precisei mudar nenhum**.

**Desvios do plano**

- `src/app/(painel)/demandas/fila-qa.test.ts` não está na G5. A página passou a chamar `andamentosDaPagina`, e o dublê de
  `./leituras-da-fila` (que substitui o módulo inteiro) não tinha esse nome: os 19 testes da página quebravam com "No
  andamentosDaPagina export is defined on the mock". A mudança é só o acréscimo do dublê (`vi.fn(async () => new
  Map())`, nenhum andamento, logo nenhum selo), com comentário; nenhuma asserção, título, tempo ou regra mudou. Fica para
  a revisão decidir (G3.2).
- `andamentos` é **opcional** em `ResultadoDaFila` e `CartoesDaFila` (ausente = mapa vazio: sem selo e sem aviso;
  `null` = falha). Assim `fila.test.ts` e o render de `fila-qa.test.ts`, que montam o resultado sem andamento, seguem
  como estão, sem passar pela G5.
- O e2e da fila usa `?status=em_construcao&limit=100` (o plano escreve `?status=em_construcao`): com o seed (36 demandas)
  e numa homologação reaproveitada, a demanda procurada pode ficar fora da página de 20.
- O e2e novo não foi rodado antes do código (só depois, verde). O teste que falhou antes do código foi o Vitest acima,
  que cobre as mesmas regras (selo, cartão, erro, leitura).

## Decisões tomadas

- O aviso de erro do andamento só aparece no estado "com dados": com lista vazia não há selo a faltar, e
  `andamentosDaPagina` com lista vazia nunca consulta nem falha (03, 4.4).
- `SeloDaFase` e `andamentoDe` ficam em `CartoesDaFila.tsx`, ao lado de `UrgenciaDaDemanda` e `IdadeDaDemanda`, e
  `fila.tsx` os importa sem ciclo (03, 4.1 item 6; plano, passo 3).
- A guarda estática confere também "nunca dentro de um `try`" e "nunca fora de `ListaDaFila`": a regra da 03, 4.4 (a
  falha do andamento não é o erro da lista) e a C-04 (a leitura roda só depois da guarda da página) ficam presas por teste.
- No cartão, o bloco do selo usa `items-end text-right`: empilhado e alinhado à direita na linha do id; quando não cabe,
  o `flex-wrap` de hoje o leva para a linha de baixo (conferido em 320 px sem rolagem lateral).

## Pendências

- Para a **T14**: `e2e/integracoes.spec.ts:59` e `e2e/integracoes-qa.spec.ts:204` falham hoje (seis chaves esperadas,
  sete recebidas); a troca está na G5 da T14.
- Instabilidade sob carga, fora da tarefa: `src/app/api/saude/route.test.ts` (503 na suíte inteira; 6 de 6 sozinho),
  `e2e/axe-todas.spec.ts:247` e `e2e/especificacao.spec.ts:58` (25 de 25 sozinhos). Sugiro ao `qa-automacao` olhar se
  voltam.
- Para ler o resultado das rodadas que o harness mandou para segundo plano (suíte inteira do Vitest e do e2e), li os
  arquivos de saída do meu próprio comando em `/tmp/claude-1000/...` pela ferramenta **Read**, no caminho que o harness
  informou (sem `ls`, `grep`, `find` nem Bash). Nada foi procurado nem listado em `/tmp`. Registro para o `conferir`.
- O `pnpm test:e2e` inteiro leva cerca de 25 minutos e passa do limite de 10 minutos de um comando em primeiro plano: o
  harness o moveu para segundo plano sozinho, e o mesmo com a suíte inteira do Vitest (cerca de 7 a 8 minutos). Nenhum
  comando foi pedido em segundo plano.
- `test/estatico/andamento.test.ts` ganhou asserções; o `PISO` não foi tocado (a G4 só pede o acréscimo nas T01, T02,
  T03, T07, T08 e T09, e o arquivo já está ou não no piso pelas tarefas donas).

## Comandos executados

- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/fila-andamento.test.ts" test/estatico/andamento.test.ts --reporter=dot` — antes do código: 10 falharam, 20 passaram (esperado)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/fila-andamento.test.ts" test/estatico/andamento.test.ts --reporter=dot` — depois do código: 30 de 30
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 7.658 passaram, 19 falharam (todas em `fila-qa.test.ts`, o mock; corrigido)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas" test/estatico --reporter=dot` — 64 arquivos, 1.452 de 1.452
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/andamento-fila.spec.ts` — 4 de 4
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 276 passaram, 9 pulados, 4 falharam (2 da T14 pela G5, 2 de tempo; ver Entrega)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/axe-todas.spec.ts e2e/especificacao.spec.ts` — 25 de 25
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 7.675 de 7.677; 2 falhas de tempo em `src/app/api/saude/route.test.ts`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/saude/route.test.ts --reporter=dot` — 6 de 6
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega; o e2e novo só depois, ver desvios)
- [x] `pnpm test` passa (suíte inteira: 7.675 de 7.677, as 2 falhas de tempo em `saude/route.test.ts` passam sozinhas, 6 de 6)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real (ids `DEM-20991231-…`, `DEC-DEM-20991231-0001-v1`, títulos "(fictício)"; o e2e não usa token)
- [x] só mudaram os arquivos da tarefa (os do plano, mais o acréscimo do dublê em `fila-qa.test.ts`, explicado nos desvios)
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas (T03 com os selos, em 1280 × 720 e 390 × 844; `axe-todas` T03 verde)
