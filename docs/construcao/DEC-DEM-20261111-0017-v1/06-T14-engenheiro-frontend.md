---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T14-construcao
agente: engenheiro-frontend
leu: [contrato-passagem.md, tarefas.json, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (G1 a G7, T06 a T07 em parte, T10 a T14 e a verificação na homologação), 06-T10-engenheiro-backend.md, 06-T12-engenheiro-frontend.md (cabeçalho), 06-T12-tech-lead.md (início), 06-T13-engenheiro-frontend.md, 06-T13-tech-lead.md, 06-T13-qa-automacao.md, e2e/integracoes.spec.ts, e2e/integracoes-qa.spec.ts, e2e/integracoes.ts, e2e/apoio.ts, e2e/andamento-detalhe.spec.ts, e2e/andamento-fila.spec.ts, playwright.config.ts, package.json (cabeçalho), test/estatico/projeto.test.ts, test/estatico/trace-e2e.test.ts, src/modules/andamento/schemas.ts, src/app/api/pedidos-construcao/[decId]/andamento/route.ts, src/lib/erros.ts, as saídas do pnpm test e do pnpm test:e2e]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T14 do plano: o e2e do envio do andamento pelo `/construir` ponta a ponta no build de produção, a troca de seis para sete
chaves do Awave nos dois e2e das integrações (G5) e a versão 0.4.0 (RF-13, D-10). Cobre CP-1, CP-5, CA-02.2, CA-03.1,
CA-05.1 e CA-10.1 pelo build, RF-10 (e2e) e RNF-09 (e2e três vezes seguidas).

**Arquivos alterados**

| Arquivo | O que mudou |
|---|---|
| `package.json` | `"version": "0.3.1"` → `"0.4.0"` (D-10). Nada mais |
| `test/estatico/projeto.test.ts` | G5: o teste espera `0.4.0` (título e asserção) e ganhou a linha de comentário da 0.4.0, como as das versões anteriores |
| `e2e/integracoes.spec.ts:59` | G5: `['andamento', 'atualizadaEm', 'criadaEm', 'id', 'status', 'tipo', 'titulo']`. Nenhuma outra asserção mudou |
| `e2e/integracoes-qa.spec.ts:205` (era a 204) | G5: a mesma lista de sete chaves; o comentário logo acima diz "as sete chaves (0.4.0: `andamento`)" em vez de "as seis chaves" (por isso a asserção desceu uma linha). Nenhuma outra asserção mudou |

**Arquivo criado**

`e2e/andamento-construir.spec.ts` (4 testes). Usa `test.use({ trace: 'off' })` no nível do arquivo e o `exigirTokens()`
de `e2e/integracoes.spec.ts`: pula na homologação com `MOTIVO_SEM_TOKENS` e falha no e2e local quando falta o arquivo de
tokens. O contexto de API manda Bearer e `accept: application/json`, sem `Origin` nem cookie. A spec não cria demanda
nem versão (G3.11) e só muda a `andamentoParaEnviar` do seed (T10), que nenhum outro e2e olha. O corpo enviado é
sempre o mesmo, `entendendo_o_pedido 0/0 em_construcao`, e por isso nenhum teste depende do estado de antes nem da
ordem.

1. **CP-1 e CA-05.1:**
   - a "cto" acha a `andamentoParaEnviar` e o DEC dela; o token `construir` manda o corpo e recebe 204, sem corpo;
   - na vista da pessoa, a demanda está em `em_construcao`, com `andamento` do DEC (fase, 0/0, `em_construcao`,
     `atualizadoEm` em UTC);
   - no histórico há `andamento_registrado` do DEC e `status_alterado`;
   - em `/demandas?status=em_construcao&limit=100`, a célula Status da linha diz "Em construção", com o selo visível
     "Entendendo o pedido" e o texto oculto "Andamento: Entendendo o pedido.";
   - no detalhe, a seção "Andamento da construção" tem o link do DEC para `/pacotes-decisao/<DEC>`, Fase "Entendendo o
     pedido", Situação "Em andamento", o texto de total 0 da 03 e `time[datetime$="Z"]`.
2. **CP-5:**
   - primeiro garante o estado mandando o corpo (204);
   - depois lê o número de eventos (`GET /api/demandas/:id/historico` como "cto"), a vista da pessoa e o `datetime` da
     linha "Última mudança informada pelo /construir em …";
   - manda o mesmo corpo de novo: 204, sem corpo;
   - o número de eventos, a vista inteira e o `datetime` da seção continuam iguais.
3. **CA-02.2 e CA-03.1:**
   - o corpo com uma chave a mais, tanto no DEC real quanto em `DEC-DEM-20991231-9999-v1`, dá 422 e
     `{ erro: 'nao_processavel', mensagem: MENSAGENS_ANDAMENTO.corpoInvalido }`. O DEC inexistente prova que o corpo é
     conferido antes de qualquer consulta;
   - o corpo válido em `DEC-DEM-20991231-9999-v1` dá 404 com o corpo `NAO_ENCONTRADO` de hoje;
   - nenhuma das respostas contém a chave enviada, o valor dela, o id do DEC nem a fase;
   - o histórico e a vista da demanda ficam iguais depois das recusas.
4. **CA-10.1:** o Awave lê a `awaveAguardando` e recebe 200, as sete chaves ordenadas e `andamento: null`.

**Teste antes do código (visto falhando)**

`pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/projeto.test.ts --reporter=dot`
antes de mudar o `package.json`:

```
 FAIL  test/estatico/projeto.test.ts > package.json > versão 0.4.0, privado, ESM, Node 24 e pnpm 12.6.0 fixo (C-39)
AssertionError: expected '0.3.1' to be '0.4.0' // Object.is equality
 Test Files  1 failed (1)
      Tests  1 failed | 10 passed (11)
```

`pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/andamento-construir.spec.ts e2e/integracoes.spec.ts e2e/integracoes-qa.spec.ts`
antes da troca da G5: 7 passaram e 2 falharam. As duas falhas eram as listas de seis chaves:

```
  ✘  7 … e2e/integracoes-qa.spec.ts:189:1 › CA-09.2 pelo build: …
  ✘  8 … e2e/integracoes.spec.ts:36:1 › CA-09.1: o Awave cria e lê a própria demanda, sem Origin
    +   "andamento",
    > 204 |     expect(Object.keys(vista).sort()).toEqual(['atualizadaEm', 'criadaEm', 'id', 'status', 'tipo', 'titulo']);
    >  59 |     expect(Object.keys(vista).sort()).toEqual(['atualizadaEm', 'criadaEm', 'id', 'status', 'tipo', 'titulo']);
  2 failed … 7 passed (47.2s)
```

Exceção declarada (G3.1): os 4 testes de `e2e/andamento-construir.spec.ts` passaram já na primeira rodada. Eles
conferem, pelo build, um comportamento que a T08, a T09, a T12 e a T13 já entregaram. Nesta tarefa, o único código
novo é a versão no `package.json`, e o teste que exige esse código é o de `projeto.test.ts`, visto falhando acima.

**Depois do código**

- `test/estatico/projeto.test.ts` e `test/estatico/trace-e2e.test.ts`: 16 de 16. A guarda do trace aceitou a spec nova
  com credencial no cabeçalho.
- `pnpm typecheck` e `pnpm lint`: limpos.
- `pnpm test` (suíte inteira): **348 de 348 arquivos, 7.734 de 7.734 testes**, saída 0, em 245,6 s. Nenhuma das
  instáveis conhecidas falhou.
- `pnpm test:e2e` (suíte inteira, 299 testes), **três vezes seguidas, todas verdes**:

| Rodada | Passaram | Pulados | Falharam | Tempo | Mais lento de `andamento-construir.spec.ts` |
|---|---|---|---|---|---|
| 1 | 290 | 9 | 0 | 12,3 min | 1,5 s (CP-1) |
| 2 | 290 | 9 | 0 | 12,3 min | 1,7 s (CP-1) |
| 3 | 290 | 9 | 0 | 12,9 min | 1,4 s (CP-1) |

  Os 9 pulados são os de `capturas.spec.ts`, como sempre. O `✘` de `e2e/vigia.spec.ts` (CV-03 negativo) é a falha
  esperada (`test.fail`), que o Playwright conta como aprovado. Todas as rodadas saíram com código 0. Nenhum teste do
  arquivo novo passou de 2 s, longe do limite de 24 s.

**Desvios do plano**

1. **Comentário de `e2e/integracoes-qa.spec.ts`.** A linha acima da asserção dizia "as seis chaves" e passou a dizer "as
   sete chaves (0.4.0: `andamento`)". Só o comentário mudou, nenhuma asserção. Com isso, a asserção da G5 desceu da linha
   204 para a 205.
2. **Mais do que o plano pede no e2e novo.** O teste 3 também manda a chave a mais num DEC inexistente (422, e não 404) e
   confere que nada foi gravado depois das recusas. O teste 1 confere a vista da pessoa e o histórico do CA-05.1. São
   só asserções a mais, sem mudar nenhum comportamento.

## Decisões tomadas

- O mesmo corpo em todos os envios (`entendendo_o_pedido 0/0`). Mandar o mesmo estado de novo dá 204 sem gravar
  (CA-04.2). Assim, cada teste roda sozinho, em qualquer ordem e sobre um banco já usado, como o plano pede ("o teste não
  supõe o estado de antes").
- O CP-5 lê o `datetime` do `<time>` da seção, e não o texto formatado. O ISO em UTC compara o instante sem depender do
  fuso do navegador.
- A mensagem do 422 e a do 404 vêm das constantes do código (`MENSAGENS_ANDAMENTO.corpoInvalido`,
  `MENSAGEM_NAO_ENCONTRADO`), como `integracoes-qa.spec.ts` já faz com `MENSAGENS_ACESSO`. A igualdade dessas
  constantes com o texto da 03 já é conferida no Vitest das T04 e T08.
- Os auxiliares de tokens e de contexto (`exigirTokens`, `contextoDe`) ficaram copiados na spec nova, como já estão nos
  dois arquivos das integrações. Tirá-los para um ajudante comum exigiria um `test.use` próprio, o que a guarda de
  `trace-e2e.test.ts` proíbe fora de `*.spec.ts`.

## Pendências

- **Comandos em segundo plano.** A suíte inteira do Vitest e a primeira rodada do e2e foram para segundo plano pelo
  harness, depois de 180 s. A segunda e a terceira rodadas do e2e eu mesmo pedi em segundo plano (`run_in_background`),
  porque passam de 12 min, acima do tempo máximo do Bash em primeiro plano. Os comandos são exatamente os da lista. Li
  as saídas, em `/tmp/claude-1000/...`, só pela ferramenta Read.
- **Instalação automática do pnpm.** Ao rodar `pnpm test` logo depois de mudar o `package.json`, o pnpm conferiu as
  dependências sozinho ("Lockfile is up to date, resolution step is skipped", "Already up to date"). Nenhum pacote foi
  instalado, e o lockfile não guarda a versão do projeto. A regra desta etapa não permite `git status`, então a revisão
  deve conferir que `pnpm-lock.yaml` não aparece no diff.
- **Para a `09-entrega` e Fabiano:**
  - contra a homologação, os 4 testes novos pulam com `MOTIVO_SEM_TOKENS`, e a V-02 cobre o envio real;
  - a `andamentoParaEnviar` sai de `aprovada` para `em_construcao` no primeiro `pnpm test:e2e` sobre um banco.
- **Seção 0.4.0 do `CHANGELOG.md`.** Fica com a `10-documentacao`, pela D-10. Esta etapa não mexeu nele.
- **Instabilidade sob carga, que não é da T14.** `scripts/scripts.test.ts` T33, `test/desempenho/leitura.test.ts`
  (p95), `src/app/api/saude/route.test.ts`, `resumo-da-fila` e `minimizar` passaram todos na suíte inteira desta
  rodada, por isso nenhum precisou ser conferido sozinho. O registro da 06-T11 para a 08 e a 09 continua valendo.
- **Pedido.** O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair
  do repositório.

## Comandos executados

- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/projeto.test.ts --reporter=dot` — antes do código: 1 falhou, 10 passaram (esperado)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/andamento-construir.spec.ts e2e/integracoes.spec.ts e2e/integracoes-qa.spec.ts` — antes da G5: 7 passaram, 2 falharam (as duas listas de seis chaves, esperado)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/projeto.test.ts test/estatico/trace-e2e.test.ts --reporter=dot` — 16 de 16
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 348 de 348 arquivos, 7.734 de 7.734 testes, 245,6 s (o harness mandou para segundo plano depois de 180 s; saída lida só pela Read)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — rodada 1: 290 passaram, 9 pulados, 0 falharam (12,3 min; o harness mandou para segundo plano depois de 180 s)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — rodada 2: 290 passaram, 9 pulados, 0 falharam (12,3 min; em segundo plano)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — rodada 3: 290 passaram, 9 pulados, 0 falharam (12,9 min; em segundo plano)

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (`projeto.test.ts` e as duas listas da G5; comandos e trechos acima; a exceção do e2e novo está declarada)
- [x] `pnpm test` passa (348 de 348 arquivos, 7.734 de 7.734 testes)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real (os tokens só existem em tempo de teste, por `tokensDoE2e()`, e nunca vão a rótulo de `expect`; trace desligado; DEC `DEC-DEM-20991231-9999-v1`, chave e valor "…Ficticia/Ficticio" e demandas do seed fictício)
- [x] só mudaram os arquivos da tarefa (`package.json`, `test/estatico/projeto.test.ts`, os dois e2e das integrações pela G5 e o `e2e/andamento-construir.spec.ts` novo)
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas (nenhuma tela mudou nesta tarefa; `axe-todas`, `andamento-fila` e `andamento-detalhe` verdes nas três rodadas do e2e)
