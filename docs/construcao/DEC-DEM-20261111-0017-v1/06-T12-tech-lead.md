---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T12-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seções 6, 7 e 12), tarefas.json, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (G1 a G10, linhas 1 a 320, e T12 a T14, linhas 2559 a 2739), 03-ux-ui-design.md (seções 0 a 4.4), 06-T12-engenheiro-frontend.md, commit 35117d55bbf405720391c452d32f2b974949735a (--stat e show), src/app/(painel)/demandas/leituras-da-fila.ts, src/app/(painel)/demandas/page.tsx, src/app/(painel)/demandas/fila.tsx, src/app/(painel)/demandas/CartoesDaFila.tsx, src/app/(painel)/demandas/fila-andamento.test.ts, src/app/(painel)/demandas/fila-qa.test.ts (linhas 1 a 80), test/estatico/andamento.test.ts, e2e/andamento-fila.spec.ts, src/modules/andamento/consultas.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T12 (fila: selo de fase na linha e no cartão, leitura por página e estado de erro), commit `35117d5`.
Nenhum Critical nem Important: a tarefa passa. Os pareceres abaixo são Minor e vão para Pendências.

**O que foi conferido**

- **Escopo (plano, T12, linhas 2564 a 2569):** o commit muda `leituras-da-fila.ts`, `page.tsx`, `fila.tsx`,
  `CartoesDaFila.tsx` e `test/estatico/andamento.test.ts`, e cria `fila-andamento.test.ts` e `e2e/andamento-fila.spec.ts`,
  exatamente os arquivos da tarefa. Fora da lista, só `fila-qa.test.ts` (+2 linhas) e os arquivos do maestro (entrega e
  `passagens.jsonl`).
- **`fila-qa.test.ts` fora da G5 (G3.2):** aceito. A mudança é só o dublê `andamentosDaPagina: vi.fn(async () => new Map())`
  no `vi.mock('./leituras-da-fila')` (linhas 37 e 38), com comentário; nenhuma asserção, título ou tempo mudou, e o
  arquivo não é teste de segurança. Sem o dublê, a página importada quebra no mock que substitui o módulo inteiro.
- **G4:** nenhuma superfície congelada nem arquivo de diff parcial da G4 está no `--stat` do commit (ver Pendências sobre
  o diff acumulado contra `0ac099a`).
- **Código contra o plano:** `andamentosDaPagina` (`leituras-da-fila.ts:32-45`) é o do passo 3, linha a linha:
  `andamentosDasDemandas` numa consulta, cada linha por `lerAndamento` (D-16, AN-12), falha vira `null` e log
  `painel_andamento_falhou` só com evento, rota e erro, no formato do `painel_contadores_falhou`. Lista vazia não consulta
  (`consultas.ts:40`). `ListaDaFila` chama depois das etapas e fora do `try` (`page.tsx:66-69`), atrás da guarda C-04 de
  `PaginaDemandas`. `SeloDaFase` (`CartoesDaFila.tsx:73-84`) é um pedaço só para tabela e cartão (03, 4.1 item 6), cor
  por mapa fixo de classes inteiras, sem `style=`; célula Status com `flex flex-col items-start gap-1` (`fila.tsx:131-134`);
  `Alerta` `atencao` estático antes do `h2` do resultado (`fila.tsx:204`), só no estado com dados (03, 4.4).
- **Teste antes do código:** a entrega mostra o Vitest falhando (10 de 30, `andamentosDaPagina is not a function` e a
  guarda estática). Cada comportamento novo tem teste que falharia sem o código: selo na tabela e no cartão, uma vez por
  forma, concluída em positivo, total 0, cancelada em `tinta-media`, sem selo em `devolvida` e sem andamento, aviso de
  erro uma vez e antes do `h2`, sem `role="alert"`, sem aviso na lista vazia, falha da leitura com log sem SQL nem ids,
  filtro do `lerAndamento` e página vazia. A guarda estática nova (`andamento.test.ts:203-245`) prende "dentro de
  `ListaDaFila`, nunca fora, nunca num `try`", cada regra com caso plantado.
- **e2e:** as quatro do plano (1280 × 720, 390 × 844, 320 px sem rolagem lateral, axe nas duas larguras), só leitura,
  conta "cto", demandas do seed da T10, sem token, nenhum `retries` nem tempo mudado; o mais lento 8,7 s (abaixo de 24 s).
  `?limit=100` no endereço é desvio aceitável (a página de 20 pode deixar a demanda do seed de fora).
- **Falhas de e2e apontadas para a T14:** conferido no plano que são mesmo da T14. G1 (linhas 50 e 51): "inclusive a troca
  de seis para sete chaves do Awave em `e2e/integracoes.spec.ts` (T14)"; G5 (linha 143): "`e2e/integracoes.spec.ts:59` e a
  lista equivalente de `e2e/integracoes-qa.spec.ts` | seis → sete chaves | T14"; T14, Arquivos (linhas 2711 e 2731). A
  causa é a sétima chave da T09 (backend, que não roda e2e); a T12 não podia mexer nelas.
- **Segurança e dados:** só ids `DEM-20991231-…`, `DEC-DEM-20991231-0001-v1` e títulos "(fictício)"; nenhum token,
  segredo ou dado pessoal. A sentinela de SQL do teste de falha prova que o log não leva a mensagem do driver.
- **Textos:** `TEXTOS_ANDAMENTO.erroNaFila` e os selos são os da T11, que batem com a 03, 4.1 e 4.4. axe verde nas duas
  larguras (CA-08.5).
- **Rodado aqui:** os testes da fila e as guardas (5 arquivos, 131 de 131), `lint` e `typecheck` limpos, e a suíte
  inteira do Vitest com saída 0 (nenhuma falha).

**Pareceres (Minor, não bloqueiam)**

1. `src/app/(painel)/demandas/CartoesDaFila.tsx:100` — o bloco do selo usa `items-end text-right`. A 03, 4.1 item 5, pede
   que em 320 px o bloco quebre para a linha de baixo **alinhado à esquerda**; com a quebra, o bloco vai para a esquerda,
   mas os dois selos dentro dele continuam alinhados à direita do próprio bloco (o selo de status fica deslocado quando a
   fase é mais larga). Razão: diferença visual pequena contra a 03, sem efeito em leitura ou rolagem; o comentário das
   linhas 98 e 99 diz "à esquerda" e o código não faz isso por inteiro. Fica para a `07-qa-funcional` olhar em 320 px.
2. `src/app/(painel)/demandas/fila-andamento.test.ts:194-198` — o `dbCom` imita a cadeia `selectDistinctOn().from().where()
   .orderBy()` de `andamentosDasDemandas`. Razão: o teste fica preso ao formato da consulta e quebra se ela mudar de
   construtor, sem falha real; é aceitável porque o CHECK da T01 impede linha fora do esquema no Postgres real e a
   consulta tem teste com banco na T06, mas um `vi.mock` parcial de `andamento/consultas` seria menos frágil.
3. `e2e/andamento-fila.spec.ts` — não foi visto falhando antes do código (G3.1, passo 2 do plano). Razão: desvio de
   processo, declarado; por leitura, os quatro testes falhariam sem o código (todos exigem o texto do selo), e o Vitest
   que cobre as mesmas regras foi visto falhando.
4. `src/app/(painel)/demandas/fila.tsx:163` e `CartoesDaFila.tsx:154` — o padrão de `andamentos` ausente é `new Map()`
   num e `null` no outro. Razão: o efeito na tela é o mesmo (sem selo; o aviso só depende do `ResultadoDaFila`), mas dois
   padrões para a mesma prop confundem quem ler; um só valor padrão seria mais claro.

## Decisões tomadas

- `fila-qa.test.ts` fora da G5 aceito: só acréscimo de dublê, sem asserção mudada e fora dos testes de segurança (G3.2).
- O log novo `painel_andamento_falhou` não fere a G3.12: a própria T12 do plano o escreve (linha 2610), e ele segue o
  formato dos logs do painel, sem ids, SQL nem parâmetro.
- As falhas de `e2e/integracoes.spec.ts:59` e `e2e/integracoes-qa.spec.ts:204` não pesam contra a T12: o plano dá a troca
  de seis para sete chaves à T14 (G1, G5 e T14).
- `andamentos` opcional em `ResultadoDaFila` e `CartoesDaFila` aceito: evita mexer em `fila.test.ts` fora da G5.
- Status `pronto` com `proximo: qa-automacao`: nenhum Critical nem Important; os quatro achados são Minor (seção 12 do
  padrão).

## Pendências

- Para a **T14**: `e2e/integracoes.spec.ts:59` e `e2e/integracoes-qa.spec.ts:204` falham desde a T09 (seis chaves
  esperadas, sete recebidas); a troca é da T14 pela G5. Até lá, `pnpm test:e2e` inteiro não fica verde.
- G4 acumulado: a regra de comando desta etapa não permite o `git diff 0ac099a -- <superfícies>` da G4; conferi só o
  `--stat` deste commit, que não toca nenhuma superfície. A `08-revisao` deve rodar o comando da G4 inteiro.
- A suíte inteira do Vitest foi movida pelo harness para segundo plano depois de 180 s (pedida em primeiro plano, com
  timeout de 600000 ms) e terminou com saída 0. Não li o arquivo de saída em `/tmp` (regra do maestro), então o número de
  testes não está aqui; a saída 0 do `vitest run` quer dizer nenhuma falha.
- `qa-automacao` e `07-qa-funcional`: olhar o Minor 1 em 320 px e as instabilidades de tempo que a construção apontou
  (`saude/route.test.ts`, `e2e/axe-todas.spec.ts:247`, `e2e/especificacao.spec.ts:58`).
- A entrega da construção registra leitura de arquivo de saída do harness em `/tmp/claude-1000/...` pela Read; fica para
  o `conferir` do maestro avaliar contra a regra de comando.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 35117d55bbf405720391c452d32f2b974949735a~1 35117d55bbf405720391c452d32f2b974949735a --stat` — 10 arquivos, 633 inserções, 16 remoções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 35117d55bbf405720391c452d32f2b974949735a` — diff do commit
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/fila-andamento.test.ts" test/estatico/andamento.test.ts "src/app/(painel)/demandas/fila-qa.test.ts" "src/app/(painel)/demandas/fila.test.ts" test/estatico/leituras-da-fila.test.ts --reporter=dot` — 5 arquivos, 131 de 131
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — saída 0, nenhuma falha (movido pelo harness para segundo plano após 180 s)

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
