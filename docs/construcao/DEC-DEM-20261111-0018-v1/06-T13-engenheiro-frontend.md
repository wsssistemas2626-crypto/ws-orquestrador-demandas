---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T13-construcao
agente: engenheiro-frontend
leu: [pedido.json (pelo prompt do maestro), padrao-tecnico.md (pela G0 a G3 do plano), contrato-passagem.md, tarefas.json, docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md (linhas 1 a 320 e 2020 a 2099, T13 e G0 a G10), docs/superpowers/specs/2026-11-13-ws-orquestrador-demandas-sobras-design.md (linhas 240 a 349, 4.4, 5 e 7), 03-ux-ui-design.md (linhas 295 a 334, seção 6), 06-T12-engenheiro-frontend.md, src/components/dados-das-etapas.ts, src/components/dados-das-etapas.test.ts, src/components/dados-das-etapas-andamento.test.ts, src/app/(painel)/demandas/[id]/page.tsx, src/app/(painel)/demandas/[id]/detalhe.test.ts, src/modules/demandas/arquivamento.ts, test/estatico/dados-das-etapas.test.ts, test/estatico/detalhe-dec.test.ts, test/estatico/piso-de-assercoes.test.ts (linhas 80 a 273), test/estatico/piso-de-assercoes-0018.test.ts]
status: devolvido
proximo: tech-lead
devolvido_para: 05-plano
---
## Entrega

A T13 não pode ser feita como está escrita. O código pedido pelo plano quebra dois testes que já existem e que não
estão na lista da G5. Um deles é teste de segurança (CV-09). Pela G3.2, mudar teste de segurança fora da G5 faz a
revisão devolver a tarefa ao `05-plano`. Por isso devolvo agora, antes de escrever a tarefa.

O repositório ficou como estava: as duas edições de prova foram desfeitas, e `git status --short` saiu vazio.

### Prova

Para confirmar, apliquei por um momento só as duas mudanças do Passo 3 do plano:
- em `page.tsx`, o trecho do plano depois do `Promise.all`:
  `const vigenteResumo = vigenteDe(d); const decVigente = … await obterPacoteDecisao(deps.db, vigenteResumo.id) …`;
- em `dados-das-etapas.ts`, a condição da linha 6 com
  `|| (dec.statusDecisao === 'arquivada' && (d.status === 'nova' || d.status === 'em_analise'))`.

Depois rodei os dois testes de hoje que tocam esses arquivos. Resultado: **3 falharam e 162 passaram, de 165.**

```
 FAIL  test/estatico/detalhe-dec.test.ts > CV-09 (T11): a leitura do DEC mais novo na página da T05 > a página autoriza antes de ler, lê o DEC de d.pacotesDecisao[0] e chama as duas regras de exibição
+   "id do DEC fora de d.pacotesDecisao[0]: vigenteResumo.id",
 FAIL  src/components/dados-das-etapas.test.ts > proximaAcao: bordas (06-T10-testes) > nova, DEC arquivado → linha 13
 FAIL  src/components/dados-das-etapas.test.ts > proximaAcao: bordas (06-T10-testes) > em_analise, DEC arquivado → linha 13
AssertionError: expected 6 to be 13 // Object.is equality
```

Desfeitas as duas mudanças, os mesmos testes passaram com 165 de 165.

### Conflito 1: CV-09 na página da T05 (teste de segurança)

- O teste é `test/estatico/detalhe-dec.test.ts`, regra 2: dentro de `PaginaDemanda`, todo `obterPacoteDecisao(` tem de
  receber o `.id` de uma constante criada exatamente como `d.pacotesDecisao[0]`.
- A leitura nova da T13 (G7, G9, D-14) usa o id de `vigenteDe(d)`. O id também vem da vista da demanda, então a
  intenção do controle continua cumprida: a página não lê DEC pedido pela URL. Mas o teste reprova.
- Nem a G5 nem a lista de arquivos da T13 citam `detalhe-dec.test.ts`. Pela G3.2, mudar esse teste devolve a tarefa ao
  `05-plano`.
- Contornar o teste também não serve. Mover a leitura para fora de `PaginaDemanda`, renomear `obterPacoteDecisao` na
  importação ou ler o DEC por outra função seria fugir do controle, e não cumpri-lo.

### Conflito 2: a varredura do RF-09 em `dados-das-etapas.test.ts`

- Em `proximaAcao: bordas (06-T10-testes)`, o oráculo `linhaEsperada` (linhas 650 a 661) espera a **linha 13** no
  cenário "DEC arquivado", só com o v1 arquivado e sem vigente, nos status `nova` e `em_analise`.
- A condição da linha 6 do plano não depende do vigente. Por isso, ela dá a **linha 6** nos dois casos.
- O Passo 1, item 5, da T13 diz que "os testes de `dados-das-etapas*.test.ts` passam", e isso não acontece com o código
  do Passo 3.
- A linha da G5 sobre a T13 só cobre a etapa 4 com DEC arquivado **e** aprovado vigente. Ela não cobre esta mudança da
  Próxima ação sem vigente.
- O teste não está no `PISO`, mas a mudança dele está fora da G5.

### Desvios do plano

Nenhum código foi entregue.

## Decisões tomadas

- Devolvi antes de construir, em vez de entregar com o teste de segurança mudado e esperar a revisão devolver. A G3.2
  manda essa mudança de volta ao `05-plano` de qualquer jeito, e uma volta a menos poupa uma tentativa.
- Não contornei o `detalhe-dec.test.ts` por outra função, por um nome trocado na importação nem por uma leitura fora de
  `PaginaDemanda`. Contornar um controle de segurança seria afrouxá-lo, e o SB-16 proíbe isso.
- Não restringi sozinho a linha 6 a "arquivado **e** com vigente", embora isso deixasse a varredura de hoje verde. A
  decisão 7.2, item 4, a D-14 e o código do plano não põem condição de vigente. Escolher entre as duas leituras é do
  plano.
- As edições de prova foram desfeitas na hora. Assim a próxima volta parte da mesma base, sem diff solto no ramo.

## Pendências

- Tarefa impossível como está escrita: o código do Passo 3 da T13 reprova `test/estatico/detalhe-dec.test.ts`, teste de
  segurança (CV-09) que não está na G5, e a varredura de `src/components/dados-das-etapas.test.ts` (nova e em_analise
  com DEC arquivado esperam a linha 13), também fora da G5.
- Para o `tech-lead` (05-plano), proposta para a próxima volta:
  1. Pôr na G5 o `test/estatico/detalhe-dec.test.ts`, só com acréscimo:
     - a regra 2 passa a aceitar também o `.id` de uma constante criada como `vigenteDe(d)`, e só quando a leitura vem
       depois de `autorizar(pessoa, 'ler_pacote_decisao')`;
     - as regras de hoje ficam como estão: `params`, `searchParams`, literal, `d.pacotesDecisao[1]` e falta de id
       continuam reprovando;
     - entram casos plantados novos: `vigenteDe(outra)`, `vigenteDe(d)` lido antes de autorizar, e constante com outro
       inicializador;
     - nenhuma asserção sai.
     - Recomendo também pôr o arquivo no `PISO` na T13, com a contagem do fim da tarefa, por ser o oráculo da leitura nova
       (G3.8).
  2. Decidir a linha 6 sem vigente:
     - (a) seguir a 7.2, item 4, e a D-14 como estão escritas, sem condição de vigente. Nesse caso, pôr na G5 a mudança do
       oráculo `linhaEsperada` de `dados-das-etapas.test.ts`: "DEC arquivado" em `nova` e `em_analise` passa a dar a
       linha 6, e o número de linhas com `expect(` não muda. Esta é a minha recomendação: sem vigente, o que falta
       também é montar um pacote novo, e a linha 13 ("Sem responsável definido") é a incoerência que a 03, 6.2, item 2,
       aponta;
     - (b) restringir a condição a "arquivado e com vigente". O teste de hoje não muda, mas a regra fica mais estreita que
       a 7.2, item 4.
  3. Corrigir o Passo 1, item 5, da T13 de acordo com a escolha do item 2.
- Sem relação com o bloqueio: a 03, 6.2, item 2, diz "fora de status final", e o plano (D-14) restringe a `nova` e
  `em_analise`. A restrição está certa, porque em `aprovada` a linha 10 já é a certa (03, 6.2, primeiro parágrafo). Não
  há o que mudar, só registrar.
- O pedido, recebido pelo prompt do maestro, não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de
  fora ou sair do repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0018-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T13" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T05" -- docs/superpowers/specs/2026-11-13-ws-orquestrador-demandas-sobras-design.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "6.2" -- docs/construcao/DEC-DEM-20261111-0018-v1/03-ux-ui-design.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files "src/app/(painel)/demandas/[id]" src/components test/estatico`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "arquivada" -- src/components/dados-das-etapas.test.ts src/components/dados-das-etapas-andamento.test.ts "src/app/(painel)/demandas/[id]"`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "dados-das-etapas\|demandas/\[id\]\|0018" -- test/estatico/piso-de-assercoes.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -ln "proximaAcao\|etapasDaDemanda\|dados-das-etapas" -- src test scripts e2e`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "proximaAcao\|etapasDaDemanda\|dados-das-etapas\|arquivada" -- scripts/seed-vigencia-qa.test.ts e2e/detalhe-a2.spec.ts test/estatico/detalhe-dec.test.ts src/components/dados-da-confirmacao-qa.test.ts "src/app/(painel)/demandas/[id]/andamento-detalhe-qa.test.ts"`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/detalhe-dec.test.ts src/components/dados-das-etapas.test.ts --reporter=dot` — com as duas mudanças do Passo 3 aplicadas por um momento: 3 falharam e 162 passaram, de 165
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — vazio, depois de desfazer as duas edições
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/detalhe-dec.test.ts src/components/dados-das-etapas.test.ts --reporter=dot` — depois de desfazer: 165 de 165

## Critério de pronto atendido

- [ ] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [ ] `pnpm test` passa
- [ ] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [ ] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas
