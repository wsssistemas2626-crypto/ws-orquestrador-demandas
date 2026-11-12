---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T13-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G8 e T13), 06-T13-engenheiro-backend.md, o diff do commit 5e8c657 (git diff 5e8c657~1 5e8c657), test/requisicao.ts, test/integracoes.ts, src/app/api/pedidos-construcao/entrega-qa.test.ts (linhas 1 a 110), src/app/api/pedidos-construcao/entrega.test.ts (linhas 1 a 12), test/transversal/sentinelas.test.ts (linhas 505 a 544), a saída do pnpm test]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T13 (testes transversais das integrações: sentinelas e log; IN-12, IN-14, RNF-04, RNF-05, IN-04), commit
`5e8c65790fde28f87e740105eb9635481d155cd5`. **Nenhum Critical e nenhum Important.** A passagem segue para a
`06-T13-testes`. Os dois pontos Minor estão em Pendências.

### O que a tarefa mudou

| Arquivo | Mudança | Dentro do plano? |
|---|---|---|
| `src/app/api/pedidos-construcao/log-das-integracoes.test.ts` | novo, 3 testes | sim (lista da T13) |
| `test/transversal/sentinelas.test.ts` | +171 −0: dois imports e dois `it` novos depois do teste de hoje | sim (lista da T13, "só acrescenta") |
| `test/pedidos-construcao.ts` | novo ajudante | desvio 1: Minor 1 da 06-T12-revisao, endereçado à T13 |
| `entrega.test.ts`, `entrega-qa.test.ts`, `recebimento.test.ts`, `recebimento-qa.test.ts` | o preparo passa a vir do ajudante | desvio 1, explicado trecho a trecho na entrega (G3.2) |
| `src/db/schema/integracao.test.ts` | +24 −0: um import e um `describe` novo | desvio 2: Minor 2 da 06-T01-revisao, endereçado à T13 |

Os dois desvios atendem pendências que a própria revisão mandou para a T13, e o G3.2 foi seguido: a mudança fora da G5
veio explicada trecho a trecho. **Decisão da revisão: aceitos.** Nenhum módulo de produção mudou.

### Conferência pedida: nenhuma asserção saiu nem ficou mais fraca nos quatro testes do `/construir`

Li o diff inteiro dos quatro arquivos. Todos os trechos mudados estão no preparo, no topo do arquivo. Nenhum `it`,
`describe`, título ou `expect` de caso mudou.

1. **Linhas `expect(` que saíram.** `git diff -G "expect\(" --stat` no commit lista só `recebimento.test.ts` e
   `recebimento-qa.test.ts`. Em cada um saiu uma linha só, o `expect(r.status).toBe(200)` da entrega dentro de
   `prepararDec`. Ela está agora em `test/pedidos-construcao.ts:126`, no mesmo ponto do preparo e sob a mesma condição:
   - em `recebimento.test.ts`, antes valia com `gerar !== false && entregar !== false`. Agora o arquivo passa
     `entregar: op.gerar !== false && op.entregar !== false`, e o ajudante entrega só com `json !== null` (ou seja,
     `gerar !== false`) e `entregar === true`. A condição é a mesma.
   - em `recebimento-qa.test.ts`, antes valia sempre. Agora `prepararDec({ entregar: true })` também entrega sempre.
   `entrega.test.ts` e `entrega-qa.test.ts` não perderam nenhuma linha com `expect(`.
2. **Dados do preparo.** Comparei os valores um a um: `ESP_DO_PEDIDO`, `RSK_DO_PEDIDO`, `DEC_DO_PEDIDO`,
   `DEMANDA_DO_PEDIDO` e `CONFIRMADO` são os mesmos literais que cada arquivo tinha. O `usuarioId` da geradora e das
   autoras continua igual, porque o `rotulo` reproduz o texto de antes (`entrega`, `recebimento`, `entrega-qa`,
   `recebimento-qa`). O contador de autoras continua um por arquivo.
3. **Requisições.** Elas continuam as do `buscar-pedidos.mjs`: Bearer, `accept: application/json`, sem `Origin` e, na
   entrega, POST sem corpo e sem `content-type`.
   - O ajudante passa `corpo: op.corpo`, que fica `undefined` quando o caso não manda corpo. `test/requisicao.ts:33` só
     põe `content-type` com `corpo !== undefined`, então nada muda.
   - Na credencial, `bearer ?? token()` e `null → sem credencial` repetem o que `entrega-qa` e `recebimento-qa` já
     faziam. Nos outros dois arquivos, o parâmetro padrão `bearer = tokenConstruir` continua.
4. **Evento inserido pelo migrator.**
   - Em `entrega.test.ts` e `recebimento.test.ts`, o prefixo era sempre `'ficticio'`, e o padrão do ajudante é o mesmo.
   - Em `entrega-qa.test.ts:69`, a regra de antes continua: `ficticio` para integração e `null` para pessoa.
   - O relógio também continua o mesmo. Antes o arquivo usava `relogio.agora()`, e agora o ajudante usa
     `deps.relogio.agora()`. É o mesmo objeto, porque `entrega-qa.test.ts:74-75` cria `deps` com `{ relogio }`.
5. **Contagem.** `pnpm test` dos 7 arquivos tocados deu 79 de 79, que são os 78 da entrega mais o teste 3 do log. A
   suíte inteira deu 276 de 276 arquivos e 5800 de 5800 testes, os mesmos números da entrega.

### IN-16 e G4

- **G4.** O `git diff a9fd9b8 --stat` das superfícies congeladas, com `src/lib/rota.ts`, saiu vazio.
- **IN-16.**
  - O `git diff a9fd9b8 --stat` dos 16 arquivos do D-17 mostra só `matriz.test.ts`, `matriz-qa.test.ts` e
    `matriz-rotas.test.ts`, que são da T03 e foram revisados lá, e `sentinelas.test.ts` com +171 −0, que é da T13 e só
    acrescenta.
  - Nenhum arquivo do piso perdeu linha nesta tarefa.
  - O teste de hoje de `sentinelas.test.ts` não mudou: só entraram dois imports e linhas depois dele.

### Os testes novos

- `log-das-integracoes.test.ts` cobre o que o passo 1 da T13 pede para o log e vai além:
  - a lista fechada de chaves da linha;
  - `atorTipo: 'integracao'` em toda linha;
  - a ausência de `wsod_`, do token, do prefixo, do texto do token depois do prefixo, de qualquer SHA-256, do decId, do
    id da demanda e do título;
  - a sequência exata das linhas, nos caminhos de sucesso e nos de erro (400, 429, 409, 404 e 503);
  - o 503 de pendentes com a tabela `evento` travada, que era a pendência da 06-T05. O caso libera a trava no
    `finally` e confere que a linha de erro não leva texto do Postgres.
- `sentinelas.test.ts` traz os fluxos (a) Awave e (b) `/construir`, como no passo 1:
  - as cinco asserções de hoje (pino, console, Sentry falso, `pgboss` e `execucao_agente`) se repetem nos dois fluxos;
  - entram as asserções novas do IN-12 (`antes` e `depois` dos eventos de integração) e do IN-04 (o token e o texto
    depois do prefixo em todas as saídas, e `wsod_` no log, nos eventos e no `pgboss`, como o plano pede);
  - dois `expect` evitam a asserção vazia: o sentinela chega mesmo ao pedido gerado (`expect(gerado).toContain(...)`) e
    o GET da própria demanda devolve o título com o sentinela.
- `integracao.test.ts` amarra os literais dos dois CHECK a `INTEGRACOES` e prova que o evento aceita o `construir` com
  prefixo e o recusa sem prefixo.
- São testes de guarda, e o G3.1 permite que passem sem mudança de código. A entrega os nomeia, diz por quê e mostra
  duas mutações que os fazem falhar: o log em `receber.ts` e o título no evento em `servico.ts`. Não refiz as mutações,
  porque editar código está fora da minha lista Pode. Li as asserções que elas derrubam
  (`log-das-integracoes.test.ts`, "um decId no log", e `sentinelas.test.ts:508`), e as duas pegam exatamente o que a
  entrega diz.
- Os tokens só nascem em tempo de teste. As mensagens de `expect` levam só o nome da integração ou o rótulo do caso
  (`sentinelas.test.ts:512-516` e o `conferirLinhas` do log), nunca o valor. Os dados são fictícios.

### Pareceres

| # | Severidade | Arquivo:linha | Problema | Razão |
|---|---|---|---|---|
| 1 | Minor | `src/app/api/pedidos-construcao/log-das-integracoes.test.ts:34-37` e `test/transversal/sentinelas.test.ts:543` | As chamadas do Awave (`postAwave`, `getAwave`) são montadas à mão em cada arquivo, com Bearer, sem `Origin` e com `accept`. O mesmo acontece nos testes da T05 e da T06. | É o mesmo tipo de cópia que a T13 acabou de tirar do `/construir`. Um `chamadasDoAwave(token)` em `test/integracoes.ts`, no molde de `chamadasDoConstruir`, mantém num lugar só a forma da requisição do Awave (CA-09.1). Não bloqueia: são duas funções de uma linha, e cada uma está certa. |
| 2 | Minor | `src/app/api/pedidos-construcao/recebimento-qa.test.ts` (`prepararDec`, `c.recebido!`) | A asserção não nula depende do `expect(r.status).toBe(200)` do ajudante para ser verdadeira. | Hoje está certo: sem 200 o caso falha antes. Se alguém tirar o `expect` do ajudante, o `!` esconde um `null`. Um `if (c.recebido === null) throw ...` local deixaria isso explícito. Não bloqueia. |

## Decisões tomadas

- Aceitei os desvios 1 e 2, porque atendem pendências que a revisão mandou para a T13 (Minor 1 da 06-T12-revisao e
  Minor 2 da 06-T01-revisao), e a troca veio explicada trecho a trecho, como o G3.2 pede.
- Considerei a mudança dos quatro testes do `/construir` sem perda de asserção. A única linha `expect(` que saiu está no
  ajudante, sob a mesma condição, e os dados, os ids, as requisições e o relógio são os mesmos (itens 1 a 4 acima).
- O `naoEncontrado()` repetido (Minor 2 da 06-T12-revisao) e a leitura do 201 do Awave fora do orçamento (parecer 1 da
  06-T06) ficam com a 08, como a entrega propõe: os dois mudam código de produção, e a T13 só tem testes.
- Os dois Minor desta revisão não bloqueiam (seção 12: só Critical e Important bloqueiam) e vão para Pendências.

## Pendências

- Nenhuma bloqueia a T13.
- Para a `06-T13-testes` (qa-automacao), três pontos:
  - rodar `test/transversal/sentinelas.test.ts` com `-t "T13 \(a\)"` e `-t "T13 \(b\)"` sozinhos, para confirmar que os
    fluxos não dependem de ordem;
  - conferir que o 429 do fluxo (a) não depende de outro teste ter gastado o limite do Awave no mesmo banco;
  - repetir a mutação do título no `depois` de `demanda_criada`, se a lista Pode da etapa permitir.
- Para quem tocar os testes do Awave depois (T15, T20 ou a 08): parecer 1, `chamadasDoAwave` em `test/integracoes.ts`.
- Para quem tocar `recebimento-qa.test.ts`: parecer 2.
- Para a `08-revisao`, herdadas da entrega:
  - o Minor 2 da 06-T12-revisao, uma fábrica do 404 em `src/lib/erros.ts` sem tocar `rota.ts`;
  - o parecer 1 da 06-T06, a leitura do 201 do Awave fora do orçamento.
- Herdadas, sem mudança:
  - o parecer 4 da 06-T03-revisao (`test/matriz-rotas.test.ts`);
  - o `=(` da linha 23 de `test/integracoes.ts` (parecer 3 da 06-T06-revisao).
- Glob e Grep não estavam disponíveis nesta sessão. Li tudo com Read e pelo `git diff`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 5e8c65790fde28f87e740105eb9635481d155cd5~1 5e8c65790fde28f87e740105eb9635481d155cd5` — 10 arquivos: os 7 de teste, o ajudante, a entrega e o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 5e8c65790fde28f87e740105eb9635481d155cd5~1 5e8c65790fde28f87e740105eb9635481d155cd5 -- test/pedidos-construcao.ts src/app/api/pedidos-construcao/entrega.test.ts src/app/api/pedidos-construcao/recebimento.test.ts` — só preparo; nenhum `it` mudou
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 5e8c65790fde28f87e740105eb9635481d155cd5~1 5e8c65790fde28f87e740105eb9635481d155cd5 -- src/app/api/pedidos-construcao/entrega-qa.test.ts src/app/api/pedidos-construcao/recebimento-qa.test.ts src/db/schema/integracao.test.ts` — só preparo nos dois QA; `integracao.test.ts` só acrescenta
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 5e8c65790fde28f87e740105eb9635481d155cd5~1 5e8c65790fde28f87e740105eb9635481d155cd5 -- test/transversal/sentinelas.test.ts src/app/api/pedidos-construcao/log-das-integracoes.test.ts` — `sentinelas.test.ts` +171 −0; log novo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pedidos-construcao src/db/schema/integracao.test.ts test/transversal/sentinelas.test.ts` — 7 arquivos, 79 de 79
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 --stat -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts 'drizzle/000[0-6]_*.sql' 'drizzle/meta/000[0-6]_snapshot.json' src/lib/rota.ts` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — árvore limpa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 --stat -- src/modules/acesso/matriz.test.ts src/modules/acesso/matriz-qa.test.ts src/modules/acesso/resolver-ator.test.ts src/modules/acesso/resolver-ator-qa.test.ts src/modules/acesso/tokens-servico.test.ts src/modules/acesso/tokens-servico-qa.test.ts src/modules/demandas/servico.test.ts src/modules/historico/registrar.test.ts src/modules/limites.test.ts src/db/privilegios.test.ts src/app/api/vistas-para-agente.test.ts test/matriz-rotas.test.ts test/transversal/sentinelas.test.ts test/estatico/sem-controle-bidi.test.ts test/estatico/sem-recurso-externo.test.ts test/estatico/leituras-da-fila.test.ts` — só os três da T03 e `sentinelas.test.ts` (+171 −0)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -G "expect\(" --stat 5e8c65790fde28f87e740105eb9635481d155cd5~1 5e8c65790fde28f87e740105eb9635481d155cd5 -- src/app/api/pedidos-construcao/entrega.test.ts src/app/api/pedidos-construcao/entrega-qa.test.ts src/app/api/pedidos-construcao/recebimento.test.ts src/app/api/pedidos-construcao/recebimento-qa.test.ts` — só os dois do recebimento (o `expect` do 200 levado ao ajudante)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 276 de 276 arquivos, 5800 de 5800 testes (saída longa lida com Read)

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
  - [x] a tarefa faz o que o plano pede; os arquivos fora da lista são os desvios 1 e 2, aceitos por esta revisão
  - [x] há teste para cada comportamento novo. São testes de guarda, nomeados na entrega com a razão e com a prova por
    mutação (G3.1)
  - [x] nenhum segredo, valor de `.env` nem dado pessoal real: tokens só em tempo de teste e fora das mensagens de `expect`
  - [x] entrada externa validada com Zod e erro sem vazar detalhe: a T13 não cria rota, e os testes conferem o 400, o
    409, o 429 e o 503
  - [x] banco: a T13 não tem migration
  - [x] nada duplica função existente. O ajudante tira quatro cópias; o parecer 1 é Minor
  - [x] textos de interface e axe: a T13 não tem tela
  - [x] o que é Minor foi para Pendências; nenhum Critical nem Important
  - [x] PR (`/code-review`, `/security-review`): fica com a 08
