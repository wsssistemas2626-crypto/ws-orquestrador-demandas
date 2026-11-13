---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T14-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 01-analista-requisitos.md (RF-01 a RF-13, RNF, rastreabilidade), docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (início, T12 a T14 e verificação na homologação), 06-T14-engenheiro-frontend.md, 06-T14-tech-lead.md, e2e/andamento-construir.spec.ts, e2e/integracoes.ts, e2e/apoio.ts, playwright.config.ts, test/estatico/trace-e2e.test.ts (início), src/app/api/demandas/[id]/historico/route.ts, src/modules/historico/consultas.ts, src/modules/historico/registrar.ts, src/modules/andamento/registrar.ts, src/modules/demandas/transicoes.ts, src/modules/acesso/tokens-servico.ts (início), as saídas do pnpm test e do pnpm test:e2e]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

Verificação da T14 (commit `39d5fb15306760b9f44bbced3314b9d4bc421eb2`), última tarefa do plano. O código passa em
todos os critérios. Esta etapa tratou o **Minor 1** da `06-T14-tech-lead`, que é de teste e está no meu escopo
(`e2e/`). Rodei a suíte Vitest inteira e o e2e completo, com o arquivo já alterado.

### Critérios da T14 e os testes que os cobrem

| Critério | Teste (arquivo › nome) |
|---|---|
| CP-1 (204; a fila e o detalhe mostram a fase) e CA-01.1 pelo build | `e2e/andamento-construir.spec.ts` › "CP-1 e CA-05.1: o /construir manda "Entendendo o pedido", a demanda vai a Em construção e a fila e o detalhe mostram o andamento" |
| CA-05.1 (`aprovada` → `em_construcao`, com `status_alterado` `{antes: aprovada, depois: em_construcao}` pelo ator `construir` e o prefixo) e CA-06.1 (um `andamento_registrado` no primeiro envio) | o mesmo teste, com as asserções apertadas nesta etapa (abaixo) |
| CP-5, CA-04.2 (o mesmo corpo de novo: 204, nenhum evento, `atualizadoEm` igual) | `e2e/andamento-construir.spec.ts` › "CP-5: o mesmo corpo de novo responde 204 e não grava nada: nem evento, nem nova data na seção" |
| CA-02.2 (chave a mais: 422 com a mensagem da 03, sem eco, sem gravar), CA-02.3 (422 também no DEC inexistente) e CA-03.1 (404 `NAO_ENCONTRADO`) pelo build | `e2e/andamento-construir.spec.ts` › "CA-02.2 e CA-03.1 pelo build: chave a mais é 422 com a mensagem da 03, DEC inexistente é 404, sem eco e sem gravar" |
| CA-10.1 e CA-10.2 pelo build (sete chaves, `andamento: null`), RF-10 no e2e | `e2e/andamento-construir.spec.ts` › "CA-10.1 pelo build: o Awave lê a própria demanda com as sete chaves e andamento null" |
| G5 (as sete chaves nos e2e das integrações) | `e2e/integracoes.spec.ts` › "CA-09.1: o Awave cria e lê a própria demanda, sem Origin" (linha 59) e `e2e/integracoes-qa.spec.ts` › "CA-09.2 pelo build: …" (linha 205) |
| RF-13 e D-10 (`package.json` na 0.4.0; a parte do `CHANGELOG.md` fica com a `10-documentacao`) | `test/estatico/projeto.test.ts` › "package.json › versão 0.4.0, privado, ESM, Node 24 e pnpm 12.6.0 fixo (C-39)" |
| RNF-09 (`pnpm test`, `lint`, `typecheck` e e2e verdes) | as rodadas abaixo |

### Teste alterado (Minor 1 da 06-T14-tech-lead)

`e2e/andamento-construir.spec.ts`, teste "CP-1 e CA-05.1". Antes, a linha 94 do commit dizia
`eventos.some((e) => e.acao === 'status_alterado')`. Ela também passava com um `status_alterado` que o seed tivesse
gravado antes de `aprovada`, e não provava a transição feita pelo `/construir`. A linha 93 aceitava `>= 1`
`andamento_registrado`. As duas foram trocadas por igualdade exata (`toEqual`) com a lista filtrada:

- `status_alterado` com ator de integração: exatamente um, `{ entidade: 'demanda', entidadeId: <id da demanda>, ator: {
  tipo: 'integracao', integracao: 'construir', prefixo }, antes: { status: 'aprovada' }, depois: { status: 'em_construcao'
  } }`. Isso é o CA-05.1 inteiro: a origem, o destino, o ator e o prefixo.
- `andamento_registrado` do DEC: exatamente um, com `entidade: 'pacote_decisao'`, o mesmo ator, `antes: null` e `depois`
  com exatamente as quatro chaves (`entendendo_o_pedido`, 0, 0, `em_construcao`). Cobre o CA-06.1 e o CA-06.4 pela API.
- O prefixo esperado são os 8 caracteres que vêm depois do prefixo fixo do token (`tokens-servico.ts`). O prefixo não é
  segredo, porque o painel o mostra. O token inteiro não entra em valor esperado nem em rótulo (G3.3).
- Entraram dois auxiliares no topo do arquivo, `atorDoConstruir` e `semId`, e o tipo `Evento` ganhou os campos que a API
  já devolve (`entidade`, `ator`, `antes`, `depois`).

**Ordem e repetição.** O teste continua sem depender de ordem nem do estado de antes. O corpo enviado é sempre o mesmo, e
a demanda nunca volta para `aprovada`. Por isso, em qualquer banco, mesmo já usado, existe um único evento de cada tipo:
o do primeiro envio. O relógio real não entra em nenhuma asserção.

**Nada foi afrouxado.** Nenhuma asserção saiu e nenhum teste foi apagado ou marcado com `.skip`, `.only` ou `.todo`. As
duas asserções trocadas ficaram mais restritas: `some` e `>= 1` viraram listas exatas.

### Resultados

| Comando | Resultado |
|---|---|
| `pnpm typecheck` | limpo |
| `pnpm lint` | limpo |
| `pnpm test` (suíte inteira) | **348 de 348 arquivos, 7.736 de 7.736 testes**, saída 0, 235,2 s |
| `pnpm test:e2e` (suíte inteira, 299 testes) | **290 passaram, 9 pulados, 0 falharam**, saída 0, 13,2 min |

- **Pulados e falha esperada.** Os 9 pulados são os de `capturas.spec.ts`, como sempre. O `✘` de `e2e/vigia.spec.ts`
  (CV-03 negativo) é o `test.fail` esperado, e o Playwright o conta como aprovado.
- **Configuração.** `retries: 0` e `workers: 1`, ambos do `playwright.config.ts`.
- **Tempos de `e2e/andamento-construir.spec.ts`:** CP-1 2,2 s, CP-5 1,2 s, CA-02.2/CA-03.1 577 ms e CA-10.1 324 ms. Os
  quatro passaram.
- **Teste mais lento da suíte:** `axe-todas.spec.ts` › "T03 Fila: com dados e filtrada", com 23,0 s, abaixo do limite de
  24 s. Ver Pendências.
- **Instáveis conhecidas.** Nenhuma falhou na suíte inteira (`scripts/scripts.test.ts` T33,
  `test/desempenho/leitura.test.ts`, `src/app/api/saude/route.test.ts`, `resumo-da-fila`, `minimizar`). Por isso não
  precisei rodar nenhuma sozinha.

## Decisões tomadas

- **Tratei o Minor 1 nesta etapa, e não na 07 nem na 08.** O defeito é só do teste, está em `e2e/` (dentro do meu
  **Pode**) e deixava o CA-05.1 sem prova pelo build.
- **Lista exata com `toEqual`, em vez de contar antes e depois.** Contar antes e depois falharia na segunda rodada sobre o
  mesmo banco, porque o envio não grava de novo. A lista exata é estável em qualquer banco e prende o evento à transição.
- **Literal `5, 13` no recorte do prefixo, com o motivo no comentário, em vez do texto do prefixo fixo do token.** Evita
  pôr no e2e um padrão parecido com token, que uma varredura de segredo poderia acusar.
- **Minor 2 (auxiliares copiados em três specs) não foi tratado.** Removê-lo exige mexer em `e2e/integracoes.ts` e em
  duas specs fora da G5. Continua como dívida para um pedido futuro, como a revisão registrou.
- **Uma rodada do e2e completo, e não três.** A mudança desta etapa só aperta asserções de um teste e não mexe em código
  do sistema. As três rodadas do RNF-09 já estão na entrega do engenheiro, sobre o mesmo código. O maestro pediu "a
  suíte inteira e o e2e completo".

## Pendências

- **Prova de que a asserção nova falharia antes da correção.** Não forcei o defeito, porque isso exigiria mudar código do
  sistema, fora do meu **Pode**. Pela forma da asserção, ela falha com qualquer `status_alterado` que não seja do ator
  `construir` de `aprovada` para `em_construcao`, e falha também se não houver nenhum. Fica para a `08-revisao` conferir.
- **`git diff` não rodou.** A regra de comando desta etapa só libera os comandos `pnpm`. A conferência de que nenhum teste
  foi apagado ou afrouxado foi feita sobre as minhas próprias edições. A única mudança é em
  `e2e/andamento-construir.spec.ts`, e é a descrita acima. A `08-revisao` deve conferir no diff que só esse arquivo e esta
  entrega mudaram nesta passagem.
- **Folga de tempo.** `axe-todas.spec.ts` › "T03 Fila: com dados e filtrada" levou 23,0 s, perto do limite de 24 s. O
  teste não é da T14 nem foi mexido aqui. Sugestão para a 08 ou a 09: acompanhar esse tempo na homologação e, se passar do
  limite, quebrar o teste em dois.
- **Minor 2 da 06-T14-tech-lead.** `exigirTokens` e `contextoDe` estão iguais em três specs. Segue como dívida.
- **Para a 09-entrega.** Contra a homologação, os quatro testes de `andamento-construir.spec.ts` pulam com
  `MOTIVO_SEM_TOKENS`, e a V-02 cobre o envio real.
- **Pedido.** O texto do `pedido.json` não traz instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou
  sair do repositório.

## Comandos executados

- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 290 passaram, 9 pulados, 0 falharam, 13,2 min (em segundo plano; saída lida só pela Read)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 348 de 348 arquivos, 7.736 de 7.736 testes, 235,2 s (em segundo plano; saída lida só pela Read)

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste (tabela acima: CP-1, CA-05.1, CA-06.1, CP-5, CA-02.2, CA-02.3, CA-03.1, CA-10.1, CA-10.2, G5, RF-13 na versão)
- [x] a suíte inteira passa (Vitest 7.736 de 7.736; e2e 290 aprovados, 9 pulados, 0 falhas)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real (o corpo é sempre o mesmo e as listas exatas valem em qualquer banco; nenhuma asserção usa o relógio)
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (as duas asserções trocadas ficaram mais restritas; conferido nas minhas edições, porque o `git diff` está fora da regra de comando desta etapa; ver Pendências)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real (só o prefixo do token, que o painel mostra, entra no valor esperado; o trace continua desligado no arquivo)
