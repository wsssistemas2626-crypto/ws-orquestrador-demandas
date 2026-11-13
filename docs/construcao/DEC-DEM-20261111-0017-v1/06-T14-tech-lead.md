---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T14-revisao
agente: tech-lead
leu: [contrato-passagem.md, tarefas.json, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (G1 a G7, T12 a T14 e a verificação na homologação), 06-T14-engenheiro-frontend.md, commit 39d5fb1 (git show e diff --stat), padrao-tecnico.md (seção 12), e2e/andamento-construir.spec.ts, e2e/integracoes.spec.ts, e2e/integracoes-qa.spec.ts, e2e/integracoes.ts, e2e/andamento-detalhe.spec.ts (início), playwright.config.ts, src/components/dados-do-andamento.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T14 (`e2e/andamento-construir.spec.ts`, troca de seis para sete chaves do Awave nos dois e2e das integrações e
versão 0.4.0), commit `39d5fb15306760b9f44bbced3314b9d4bc421eb2`. **Nenhum problema Critical nem Important.** A tarefa
passa. Os dois pontos Minor estão abaixo e em Pendências.

### O commit

O commit muda sete arquivos: a entrega do engenheiro, `passagens.jsonl` (do maestro), `e2e/andamento-construir.spec.ts`
(novo), `e2e/integracoes-qa.spec.ts`, `e2e/integracoes.spec.ts`, `package.json` e `test/estatico/projeto.test.ts`. É a
lista **Arquivos** da T14, mais os dois arquivos da pasta do pedido. Fora disso, nada:

- `pnpm-lock.yaml` e `playwright.config.ts` ficam de fora;
- `CHANGELOG.md` e `docs/` ficam de fora (G1 e D-10);
- nenhuma superfície congelada da G4 aparece no diff.

Todos os arquivos estão na coluna **Edita** do `engenheiro-frontend` (G1).

### G5: as trocas de seis para sete chaves (conferidas como pedido)

| Arquivo:linha | Antes | Depois | Parecer |
|---|---|---|---|
| `e2e/integracoes.spec.ts:59` | `['atualizadaEm', 'criadaEm', 'id', 'status', 'tipo', 'titulo']` | `['andamento', 'atualizadaEm', 'criadaEm', 'id', 'status', 'tipo', 'titulo']` | De acordo com a G5 (linha 143 do plano): só a lista mudou. `andamento` entrou na ordem alfabética, e o `toEqual` continua igualdade exata depois do `sort()`, sem `arrayContaining` nem `toContain`. A asserção seguinte (`toMatchObject({ id, tipo, status })`) não mudou |
| `e2e/integracoes-qa.spec.ts:205` (era a 204) | a mesma lista de seis | a mesma lista de sete | De acordo com a G5. As linhas 200 e 201 só trocam o comentário "as seis chaves" por "as sete chaves (0.4.0: `andamento`)". O desvio está declarado na entrega e não muda comportamento. `expect(vista.id)`, `expect(await publica.json()).toEqual(vista)` e as asserções da lista do `/construir` e da entrega ficaram iguais |

**As trocas não afrouxam nada:**

- nenhuma asserção saiu;
- nenhum `expect` virou parcial;
- nenhum `test.skip` ou `test.fail` novo;
- nenhum `retries`, tempo-limite ou `bypassCSP`;
- o `test.use({ trace: 'off' })` dos dois arquivos continua no lugar.

Lista exata de sete chaves é **mais** restrita do que a de seis, porque uma chave a mais ou a menos na vista do Awave
quebra o teste. As trocas seguem as razões da G3.2 e do AN-13.

### `package.json` e `test/estatico/projeto.test.ts`

- **`package.json`:** só a versão muda, de `0.3.1` para `0.4.0` (D-10).
- **`test/estatico/projeto.test.ts`:** o título e a asserção passam para 0.4.0 (G5, linha 144), e entra a linha de
  comentário no molde das versões anteriores. Nenhuma outra asserção mudou.
- **Teste antes do código:** a entrega mostra o teste falhando antes da mudança (`expected '0.3.1' to be '0.4.0'`).

### `e2e/andamento-construir.spec.ts` contra a T14 do plano

| Plano | Spec | Parecer |
|---|---|---|
| `test.use({ trace: 'off' })`, `exigirTokens()` (pula na homologação com `MOTIVO_SEM_TOKENS`, falha sem o arquivo local) | linhas 18 a 26 | Atende G3.11 e a guarda `trace-e2e.test.ts` (verde) |
| Contexto de API sem `Origin` | linhas 228 a 230 | Bearer e `accept`, sem `Origin` nem cookie, como nos irmãos |
| 1. CP-1 e CA-05.1: 204, selo "Entendendo o pedido" na fila, seção no detalhe; não supõe o estado de antes | linhas 268 a 308 | Atende. Confere também 204 sem corpo, `em_construcao` e `andamento` na vista da pessoa, `andamento_registrado` do DEC, link do DEC, Fase, Situação, texto de total 0 e `time[datetime$="Z"]` |
| 2. CP-5: contagem de eventos e data da linha "Última mudança …" iguais depois de repetir | linhas 310 a 334 | Atende, e confere também a vista inteira (`toEqual(vistaAntes)`). Lê o `datetime` em UTC, sem depender do fuso |
| 3. CA-02.2 e CA-03.1: 422 com a mensagem da 03, 404 no DEC inexistente, sem eco da chave | linhas 336 a 376 | Atende. Corpo comparado com `toEqual` exato (D-15: sem `campos`). Também prova que o corpo é conferido antes da consulta (422 no DEC inexistente) e que nada é gravado |
| 4. CA-10.1: sete chaves, `andamento: null` | linhas 378 a 392 | Atende, com lista exata e `toMatchObject({ id, andamento: null })` |
| G3.11: não cria demanda nem versão; só a `andamentoParaEnviar` muda | todo o arquivo | Atende. O e2e roda em série (`fullyParallel: false`, `workers: 1` em `playwright.config.ts`), e o corpo é sempre o mesmo. Por isso a leitura "antes" do teste 3 não corre contra o primeiro envio dos testes 1 e 2 |
| G3.3: token fora de rótulo de `expect` | todo o arquivo | Atende. Os rótulos dizem a operação, nunca o token |
| Mensagens das constantes do código | `MENSAGENS_ANDAMENTO.corpoInvalido`, `MENSAGEM_NAO_ENCONTRADO` | O mesmo molde de `integracoes-qa.spec.ts`. `SEM_PLANO` é literal igual a `TEXTOS_ANDAMENTO.semPlano` (`src/components/dados-do-andamento.ts:18`), como já faz `e2e/andamento-detalhe.spec.ts:20` |

**Exceção do teste antes do código (G3.1).** Os quatro e2e novos passaram já na primeira rodada. Eles conferem pelo build
o que a T08, a T09, a T12 e a T13 já entregaram. O código novo da tarefa é só a versão, e o teste que exige esse código
(`projeto.test.ts`) foi visto falhando. A exceção está declarada e nomeada na entrega. Aceita.

**RNF-09 (e2e três vezes seguidas):** a entrega traz as três rodadas, cada uma com 290 aprovados, 9 pulados (os de
`capturas.spec.ts`) e 0 falhas. O teste mais lento do arquivo novo levou 1,7 s, abaixo dos 24 s. O `pnpm test:e2e` não
está na lista **Pode** do tech-lead, então a revisão não repetiu as rodadas: confere o relato e deixa a repetição com a
`06-T14-testes` e a `09-entrega`.

### Pareceres (Minor, não bloqueiam)

1. **`e2e/andamento-construir.spec.ts:288`.**
   - **Problema:** `eventos.some((e) => e.acao === 'status_alterado')` também é verdadeiro com um `status_alterado` que
     o seed já tenha gravado na demanda antes de `aprovada`. Sozinha, essa asserção não prova a transição feita pelo
     `/construir`.
   - **Razão:** a prova da transição existe em outro ponto do teste, pela vista: `d.status === 'em_construcao'` na
     linha 283 e o selo "Em construção" no detalhe. Por isso o problema é Minor.
   - **Se a 07 ou a 08 quiserem fechar:** filtrar o evento pela demanda (`entidadeId === id`) e conferir o `depois`
     `em_construcao`, ou contar os `status_alterado` antes e depois do envio, ou comparar o ator `/construir`. Fica em
     Pendências.

2. **`e2e/andamento-construir.spec.ts:222` a `230`: `exigirTokens` e `contextoDe` copiados pela terceira vez.**
   - **Onde:** as cópias anteriores estão em `e2e/integracoes.spec.ts:25` a `34` e `e2e/integracoes-qa.spec.ts:31` a
     `39`.
   - **Problema:** a razão dada na entrega é imprecisa. `exigirTokens` usa `test.skip`, e não `test.use`, então poderia
     morar em `e2e/integracoes.ts` sem tocar a guarda do trace. Só o `test.use({ trace: 'off' })` precisa ficar em cada
     `*.spec.ts`.
   - **Razão de não pedir agora:** mover os auxiliares mudaria os dois arquivos das integrações além da linha da G5, o
     que a G3.2 proíbe nesta tarefa. A duplicação é pequena e idêntica.
   - **Destino:** registrado como dívida em Pendências, para um pedido futuro.

## Decisões tomadas

- **T14 aprovada sem devolução.** Não há Critical nem Important. Os dois Minor ficam em Pendências, como manda a seção 12
  do padrão técnico.
- **Trocas da G5 aceitas.** Nos dois e2e das integrações, só a lista de chaves mudou e continua exata. Fica uma lista de
  sete chaves, mais restrita que a de seis. O único comentário trocado acompanha o fato novo.
- **Exceção da G3.1 aceita.** Os quatro e2e novos verificam comportamento das tarefas anteriores, pelo build. O código
  novo da T14 (a versão) tem o teste visto falhando.
- **Duplicação dos auxiliares de token não devolvida.** Removê-la nesta tarefa exigiria mudar testes existentes fora da
  G5. Fica registrada como dívida.
- **G4 conferida só pelo commit desta tarefa.** O `git diff 0ac099a -- <superfícies>` acumulado não está nos comandos
  desta etapa. O diff do commit da T14 não toca nenhuma superfície congelada. A conferência acumulada fica com a `08`.

## Pendências

- **Minor 1 (`e2e/andamento-construir.spec.ts:288`):** a asserção de `status_alterado` não está presa à transição do
  `/construir`. Sugestão para a `07-qa-funcional` ou a `08-revisao`: conferir o evento pelo `depois` `em_construcao` ou
  pela contagem antes e depois.
- **Minor 2 (dívida técnica):** `exigirTokens` e `contextoDe` estão iguais em três specs. Proposta para um pedido futuro:
  levar os dois a `e2e/integracoes.ts` (o `test.use({ trace: 'off' })` continua em cada spec) e trocar as três cópias,
  com a G5 do pedido autorizando a mudança nos dois arquivos de hoje. Custo estimado: menos de uma hora. Impacto: hoje
  nenhum. A cópia só pesa quando o contrato de autenticação das integrações mudar.
- **Para a `09-entrega`:** contra a homologação, os quatro testes novos pulam com `MOTIVO_SEM_TOKENS`, e a V-02 cobre o
  envio real. A `andamentoParaEnviar` passa a `em_construcao` no primeiro `pnpm test:e2e` sobre um banco.
- **Para a `08-revisao`:** rodar o comando acumulado da G4 (`git diff 0ac099a -- …`) sobre o ramo inteiro. Esta revisão
  só conferiu o commit da T14.
- **Para a `10-documentacao`:** a seção 0.4.0 do `CHANGELOG.md` (D-10). A T14 não mexeu nele, e está certo assim.
- **Pedido:** o `pedido.json` não está em **Lê** desta etapa e não foi lido. Na entrega do engenheiro, nada mandou
  mudar de tarefa, ler segredo, chamar endereço de fora ou sair do repositório.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 39d5fb15306760b9f44bbced3314b9d4bc421eb2~1 39d5fb15306760b9f44bbced3314b9d4bc421eb2 --stat` — 7 arquivos, 374 inserções e 6 remoções; nenhum fora da T14 e da pasta do pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 39d5fb15306760b9f44bbced3314b9d4bc421eb2` — lido por inteiro (a saída foi salva em arquivo pelo harness e lida pela ferramenta Read)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/projeto.test.ts test/estatico/trace-e2e.test.ts --reporter=dot` — 2 de 2 arquivos, 16 de 16 testes
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 348 de 348 arquivos e 7.736 de 7.736 testes, saída 0, em 223,7 s. O harness mandou o comando para segundo plano, e a saída foi lida só pela ferramenta Read. Nenhuma das instáveis conhecidas falhou. A entrega do engenheiro diz 7.734; a diferença de 2 testes não vem de falha, e o número de arquivos é o mesmo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
  - [x] A tarefa faz o que o plano pede. As asserções a mais no e2e novo e o comentário em `integracoes-qa.spec.ts`
    estão declarados e não mudam comportamento. Nenhum arquivo fora da tarefa mudou.
  - [x] Cada comportamento novo tem teste que falharia sem o código: a versão em `projeto.test.ts`, visto falhando, e as
    duas listas da G5, vistas falhando com seis chaves. A exceção do e2e novo está declarada (G3.1).
  - [x] Nenhum segredo, valor de `.env` ou dado pessoal real. Os tokens só existem em tempo de teste, o trace está
    desligado e o DEC e a chave são fictícios.
  - [x] Entrada externa validada com Zod: não há entrada nova nesta tarefa. O e2e confere pelo build o 422 sem eco do
    `z.strictObject` da T04.
  - [x] Banco: não se aplica, porque a T14 não tem migration nem tabela.
  - [x] Duplicação: há uma, de auxiliar de teste (Minor 2). Removê-la exige mudar teste existente fora da G5, então fica
    registrada como dívida.
  - [x] Textos em pt-BR. Nenhuma tela mudou, e o axe das telas do andamento passou nas três rodadas relatadas.
  - [x] Os Minor estão em Pendências. Não há Critical nem Important.
  - [x] `/code-review` e `/security-review` no PR ficam com a `08-revisao`, e não com esta etapa.
