---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T12-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 01-analista-requisitos.md (seções 0 a 3), docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (T12 e início da T13, linhas 2555 a 2654), 06-T12-engenheiro-frontend.md, 06-T12-tech-lead.md, src/app/(painel)/demandas/leituras-da-fila.ts, src/app/(painel)/demandas/page.tsx, src/app/(painel)/demandas/fila.tsx (linhas 100 a 239), src/app/(painel)/demandas/CartoesDaFila.tsx, src/app/(painel)/demandas/fila-andamento.test.ts, src/app/(painel)/demandas/fila-qa.test.ts (linhas 1 a 259), src/modules/andamento/consultas.ts, src/components/dados-do-andamento.ts, src/components/rotulos.ts, test/estatico/andamento.test.ts (linhas 150 a 247), e2e/andamento-fila.spec.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verificação da T12 (fila: selo de fase na linha e no cartão, leitura por página e estado de erro), commit
`35117d55bbf405720391c452d32f2b974949735a`. O código cumpre todos os critérios da tarefa; nenhum teste falhou por causa
da T12. Acrescentei um arquivo de teste com o que os testes do engenheiro não cobriam: a ligação real da página com a
leitura do andamento e as bordas do selo.

### Critérios da tarefa e os testes que os cobrem

| Critério | Teste (arquivo › nome) |
|---|---|
| CA-08.1 "Construindo · 9/17" na linha e no cartão | `src/app/(painel)/demandas/fila-andamento.test.ts` › "tabela: a célula Status tem o selo de status e, abaixo, …", "cartão: o mesmo pedaço, logo abaixo do selo de status, …", "um selo por forma: …"; **novo** `fila-andamento-qa.test.ts` › "lê o andamento uma vez, com o banco das dependências e os ids da página, depois das etapas; o selo chega à tabela e ao cartão"; e2e `e2e/andamento-fila.spec.ts` › "CA-08.1 a CA-08.4: na tabela, …" e "celular › CA-08.1 a CA-08.4: no cartão, …" |
| CA-08.2 total 0: só a fase | `fila-andamento.test.ts` › "construção concluída, em positivo; total 0, só a fase"; e2e, os mesmos dois testes (`andamentoSemPlano`) |
| CA-08.3 `construido`: "Construção concluída" | `fila-andamento.test.ts` › "construção concluída, em positivo; total 0, só a fase"; e2e, os mesmos dois testes (`andamentoConcluido`) |
| CA-08.4 sem selo em `em_construcao` sem andamento e em outro status com andamento | `fila-andamento.test.ts` › "em construção sem andamento e devolvida com andamento: sem selo de fase …"; **novo** `fila-andamento-qa.test.ts` › "CA-08.4: em cada um dos outros oito status, com andamento válido, nem a linha nem o cartão têm selo"; e2e, os dois testes (`emConstrucaoSemAndamento`, `andamentoCancelado` em `devolvida`) |
| CA-08.5 axe sem violação em 1280 × 720 e 390 × 844 | e2e `e2e/andamento-fila.spec.ts` › "CA-08.5: axe sem violação com os selos de fase, em 1280 × 720 e 390 × 844" (não rodado nesta etapa; ver Pendências) |
| RF-08 rótulo pt-BR da fase; selo é texto, não só cor | **novo** `fila-andamento-qa.test.ts` › "fase %s: o rótulo pt-BR "%s" na tabela e no cartão, nunca o valor gravado" (as seis fases) e "uma tarefa no total: o leitor diz "tarefa pronta", no singular"; `fila-andamento.test.ts` (texto visível com `aria-hidden` + `sr-only`) |
| CA-04.6 (fila) / AN-12 / D-16: andamento fora do esquema = sem andamento, sem erro | `fila-andamento.test.ts` › "com linhas: só as que passam em lerAndamento entram no mapa, …"; **novo** `fila-andamento-qa.test.ts` › "CA-04.6: andamento montado à mão fora do esquema, sem selo, sem o valor no HTML e sem o aviso de erro" (11 formas: HTML na fase, `toString`, `__proto__`, prontas > total, total 1000, 1.5, texto, negativo, situação fora da lista, data inválida, data em texto) |
| 03, 4.4: falha só do andamento = lista de pé, aviso `atencao` estático, sem selo; não é o erro da lista | `fila-andamento.test.ts` › "Alerta atencao estático com o texto da 03, acima do título do resultado", "a fila aparece com as linhas e os cartões, sem nenhum selo de fase", "lista vazia: …"; `test/estatico/andamento.test.ts` › "T12: … page.tsx chama andamentosDaPagina( dentro de ListaDaFila, fora do try da lista"; **novo** `fila-andamento-qa.test.ts` › "banco do andamento que falha (leitura real): a lista aparece, o aviso atencao uma vez, nenhum selo, só o log painel_andamento_falhou, sem ids" e "lista vazia: a leitura real não consulta o banco, sem aviso e sem log" |
| Log `painel_andamento_falhou` sem SQL, ids nem parâmetro | `fila-andamento.test.ts` › "banco que falha: devolve null e um log painel_andamento_falhou com a rota, sem SQL nem ids"; **novo** `fila-andamento-qa.test.ts` › "banco do andamento que falha (leitura real): …" (pela página, sem os ids da página no log) |
| ADR-16/35: uma leitura por página, lista vazia não consulta | `fila-andamento.test.ts` › "página sem demandas: mapa vazio, sem consultar o banco"; **novo** `fila-andamento-qa.test.ts` › "lê o andamento uma vez, …" (uma chamada, com os ids da página) |
| C-04: a leitura nova só depois da guarda e da lista | `test/estatico/andamento.test.ts` › bloco "T12"; **novo** `fila-andamento-qa.test.ts` › "%s falha: o erro de hoje (03, 4.6), sem ler o andamento e sem o aviso do andamento" (lista e etapas), "sem sessão (a guarda lança): nenhuma leitura do andamento", "pessoa com papel fora da matriz: a página recusa antes de ler o andamento" |
| 03, 4.1 item 5: cartão sem item novo na `dl`; 320 px sem rolagem lateral | `fila-andamento.test.ts` › "cartão: …" (6 `dt`); e2e › "320 px: "Revisando e entregando · 17/17" no cartão, sem rolagem lateral" |
| CV-02: sem `style=` | `fila-andamento.test.ts` › "sem o aviso de erro quando a leitura do andamento deu certo; nenhum style= no HTML (CV-02)" |

### Testes acrescentados

`src/app/(painel)/demandas/fila-andamento-qa.test.ts` (novo, 17 testes, render no servidor, no molde de
`fila-qa.test.ts`; a `andamentosDaPagina` é a real, observada por `vi.fn`):

- Página inteira (7 testes): leitura com o banco das dependências e os ids da página, uma vez, depois das etapas, e o
  selo chegando à tabela e ao cartão; banco que falha na leitura real (não por dublê de retorno) → lista de pé, aviso
  uma vez antes do `h2`, sem `TEXTOS_FILA.erro`, um só log `painel_andamento_falhou` sem ids; lista vazia sem consulta,
  aviso nem log; lista ou etapas que falham → erro de hoje e nenhuma leitura do andamento; sem sessão e papel fora da
  matriz → nenhuma leitura do andamento.
- Bordas do selo (10 testes): os oito outros status sem selo (com controle positivo no mesmo HTML); as seis fases em
  pt-BR, sem o valor gravado; singular "1 de 1 tarefa pronta"; 11 andamentos forjados sem selo, sem o valor no HTML e
  sem o aviso de erro; andamento de demanda fora da página ignorado e mapa vazio sem aviso.

Visto falhando antes do código: não se aplica (o código já existia). Cada teste novo falharia se o código mudasse no
ponto que ele prende (ex.: `andamentos` não passado a `ResultadoDaFila`, leitura antes da lista ou da guarda, selo fora
de `em_construcao`, valor fora do esquema virando texto).

### Resultados

- Arquivo novo sozinho: 17 de 17.
- Arquivos da fila e guardas (`fila-andamento-qa`, `fila-andamento`, `fila-qa`, `fila`, `test/estatico/andamento`,
  `test/estatico/leituras-da-fila`): 6 arquivos, 148 de 148.
- `pnpm test` (suíte inteira): 344 de 345 arquivos, **7.695 de 7.697** testes. As 2 falhas são de
  `src/app/api/saude/route.test.ts` ("em menos de 200 ms": 278 ms; e um 503), instabilidade de tempo sob carga já
  conhecida, fora da T12. O arquivo sozinho: 6 de 6.
- `pnpm lint`: limpo. `pnpm typecheck`: limpo.

## Decisões tomadas

- Testes novos num arquivo próprio (`fila-andamento-qa.test.ts`), e não em `fila-qa.test.ts`: nenhum teste existente foi
  tocado, e o `vi.mock` de `./leituras-da-fila` aqui usa a `andamentosDaPagina` real, o que mudaria o arquivo de outra
  tarefa.
- A falha do banco pela página usa a leitura real com o banco dublê das dependências (que não responde a nenhuma
  consulta), e não um `mockResolvedValue(null)`: prova a cadeia página → leitura → log de uma vez.
- Sem e2e novo: o que o Vitest não alcança (axe, posição na tela, 320 px) já está em `e2e/andamento-fila.spec.ts`, que
  cobre o plano por inteiro e não muda dado.
- Os Minors 2 e 4 da revisão (dublê preso ao formato da consulta; padrão `new Map()` × `null`) ficam mitigados pelos
  testes novos: a ligação página → leitura é conferida sem o dublê da cadeia `selectDistinctOn`, e o caso "mapa vazio /
  sem `andamentos`" tem teste. O código não muda nesta etapa.

## Pendências

- Instabilidade de tempo sob carga, fora da T12: `src/app/api/saude/route.test.ts` falhou na suíte inteira (2 testes:
  278 ms contra o teto de 200 ms, e um 503) e passou sozinho (6 de 6). Os outros arquivos da lista conhecida
  (`scripts/scripts.test.ts` T33, `test/desempenho/leitura.test.ts`, `resumo-da-fila`, `minimizar`) passaram nesta
  rodada. Recomendo à `qualidade` e ao `devops-sre` tratar o teto de 200 ms desse teste como instável (ou isolá-lo da
  suíte paralela): ele derruba a saída da suíte inteira sem defeito real.
- e2e não rodado nesta etapa: a regra de comando desta etapa pede a conta "administradora" no e2e, e
  `e2e/andamento-fila.spec.ts` (do engenheiro, pelo plano) entra com a conta "cto"; não alterei a spec do engenheiro nem
  a rodei. CA-08.5 (axe) fica coberto por esse e2e, que o engenheiro registrou 4 de 4; a confirmação fica com o
  `homologar` do maestro e com a `07-qa-funcional`. Se o maestro quiser a spec na conta "administradora", é troca de uma
  linha por teste (`entrarComo(page, 'administradora')`), na T14 ou na 08.
- `e2e/integracoes.spec.ts:59` e `e2e/integracoes-qa.spec.ts:204` (seis → sete chaves) seguem para a **T14**, como o
  plano manda; não mexi.
- Minor 1 da revisão (alinhamento à direita dos selos dentro do bloco do cartão em 320 px) é visual e não tem asserção
  automática aqui; fica para a `07-qa-funcional`.
- Conferência de "nenhum teste existente apagado, `.skip`, `.only`, `.todo` ou afrouxado": a regra de comando desta
  etapa não permite `git diff` pelo Bash. Conferi por leitura: meu único arquivo é novo (nenhum existente foi editado),
  e a única mudança da T12 num teste existente é o dublê de duas linhas em `fila-qa.test.ts` (linhas 37 e 38, lidas), sem
  asserção mudada, como a revisão confirmou pelo `git show`. A `08-revisao` pode confirmar pelo `git diff`.
- Para ler o resultado da suíte inteira, que o harness mandou para segundo plano depois de 180 s, li o arquivo de saída
  do meu próprio comando, no caminho que o harness informou, só pela ferramenta Read (sem `ls`, `cat`, `grep` nem
  `tail`), como a regra desta etapa permite.
- O texto do pedido não trouxe instrução fora do escopo.

## Comandos executados

- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/fila-andamento-qa.test.ts" --reporter=dot` — 17 de 17
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 7.695 de 7.697; 2 falhas de tempo em `src/app/api/saude/route.test.ts` (movido pelo harness para segundo plano após 180 s)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/saude/route.test.ts --reporter=dot` — 6 de 6
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/fila-andamento-qa.test.ts" "src/app/(painel)/demandas/fila-andamento.test.ts" "src/app/(painel)/demandas/fila-qa.test.ts" "src/app/(painel)/demandas/fila.test.ts" test/estatico/andamento.test.ts test/estatico/leituras-da-fila.test.ts --reporter=dot` — 6 arquivos, 148 de 148

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste (tabela da Entrega; CA-08.5 pelo e2e do engenheiro, não rodado aqui, ver Pendências)
- [x] a suíte inteira passa (7.695 de 7.697; as 2 falhas são a instabilidade de tempo conhecida de `saude/route.test.ts`, 6 de 6 sozinho)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real (datas fixas; dublês reiniciados em `beforeEach`)
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido por leitura; o `git diff` não é permitido nesta etapa, ver Pendências)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real (ids `DEM-20991231-…`, `DEC-DEM-20991231-0001-v1`, títulos "(fictício)", pessoas "Pessoa Ficticia Dois")
