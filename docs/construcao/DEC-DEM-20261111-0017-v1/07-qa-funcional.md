---
pedido: DEC-DEM-20261111-0017-v1
etapa: 07-qa-funcional
agente: qa-funcional
leu: [pedido.json, contrato-passagem.md, docs/superpowers/specs/2026-11-12-ws-orquestrador-demandas-andamento-design.md (seções 2 e 7), 01-analista-requisitos.md, 03-ux-ui-design.md, 05-tech-lead.md, tarefas.json, 06-T01-qa-automacao.md, 06-T02-qa-automacao.md, 06-T03-qa-automacao.md, 06-T04-qa-automacao.md, 06-T05-qa-automacao.md, 06-T06-qa-automacao.md, 06-T07-qa-automacao.md, 06-T08-qa-automacao.md, 06-T09-qa-automacao.md, 06-T10-qa-automacao.md, 06-T11-qa-automacao.md, 06-T12-qa-automacao.md, 06-T13-qa-automacao.md, 06-T14-qa-automacao.md, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (G1, G2, tabela do seed da T10, Verificação na homologação), src/components/dados-do-andamento.ts, scripts/seed-ficticio.ts (títulos do seed, por busca), CHANGELOG.md (busca por 0.4.0), test/estatico/docs-sem-token.test.ts (por busca), e2e/andamento-*.spec.ts (só os nomes)]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

### 0. Escopo e como ler

Roteiro funcional da 0.4.0 do WS Orquestrador de Demandas: andamento do Pedido de Construção registrado pelo
`/construir`. Este documento tem cinco partes:

1. o mapa de cada critério de aceite do `01` para o teste automatizado que o cobre (seção 1);
2. o roteiro manual de cada critério, com passos, dado fictício e resultado esperado (seção 2);
3. os casos exploratórios sugeridos, com o que fica de fora (seção 3);
4. o roteiro de aceite para Fabiano (seção 4);
5. os candidatos a automação para o `qa-automacao` (seção 5).

Regras do documento:

- **Ambiente:** homologação da 0.4.0 com o seed fictício da T10 (`construir.mjs homologar` ou `docker-compose.hml.yml`),
  subida pela `09-entrega`. **Nada aqui roda em produção.** Quando o roteiro pede um envio pela API, usar o token
  `construir` emitido dentro da homologação, como manda o AN-15 (arquivo 600 em pasta temporária, apagado no fim). O token
  aparece neste documento só como `<token-construir-hml>` e nunca é escrito em lugar nenhum.
- **Dados:** são todos fictícios. As demandas do seed são citadas pelo título, por exemplo "Andamento: construindo
  (fictício)". O DEC de cada uma é lido no painel, na seção Pedido de Construção. Os ids inventados seguem o padrão
  `DEC-DEM-20991231-9999-v1` e `DEM-20991231-0042`, e o prefixo de token inventado é `a1b2c3d4`.
- **Corpo padrão (C1):** `{ "fase": "construindo", "tarefasProntas": 9, "tarefasTotal": 17, "status": "em_construcao" }`.
  A chamada padrão é `POST <HML>/api/pedidos-construcao/<DEC>/andamento`, com `Authorization: Bearer
  <token-construir-hml>`, `content-type: application/json`, `accept: application/json`, sem `Origin` e sem cookie. É a
  mesma requisição que o `/construir` monta.
- **Textos de tela:** valem os textos da `03`, seção 8. A spec 7.3 resolveu as divergências a favor da 03: "Última
  mudança informada pelo /construir em …" no lugar de "Atualizado em", e "Entregue" com maiúscula na Próxima ação.

Seed da T10 usado no roteiro (status e andamento na hora do seed):

| Título (fictício) | Status | Último andamento |
|---|---|---|
| Andamento: construindo | Em construção (pelo `/construir`) | `construindo 9/17` |
| Andamento: revisando e entregando | Em construção | `revisando_e_entregando 17/17` |
| Andamento: construção concluída | Em construção | `documentando 12/12 construido` |
| Andamento: construção cancelada | Devolvida pela construção (pelo `/construir`) | `construindo 3/8 cancelado` |
| Andamento: sem plano de tarefas | Em construção | `entendendo_o_pedido 0/0` |
| Andamento: para o /construir enviar | Aprovada, com pedido gerado pela "cto" | nenhum |
| Andamento: pacote sem pedido gerado | Pronta para decisão, DEC aprovado e sem pedido gerado | nenhum |
| Em construção sem andamento | Em construção (pela "cto") | nenhum |

A "Andamento: para o /construir enviar" muda de estado no primeiro envio. Depois disso o seed é refeito, ou a pessoa
segue o roteiro na ordem da seção 4.

### 1. Mapa: critério de aceite → teste automatizado

Todos os 70 critérios do `01` (CA-01.1 a CA-13.3) estão no mapa. Nenhum ficou sem cobertura. A coluna "Nível" diz onde o
critério é provado: U (unidade, sem banco), B (Postgres real pelo Testcontainers), R (rota real pelo `rota()`), T (HTML
renderizado no servidor), E (e2e Playwright contra o build) ou D (conferência documental). Os arquivos `-qa` são da
`qa-automacao`; os outros, dos engenheiros.

#### RF-01. Ação `registrar_andamento` só do `construir`

| CA | Teste automatizado (arquivo › teste) | Nível |
|---|---|---|
| CA-01.1 | `src/app/api/pedidos-construcao/andamento.test.ts` › "CA-01.1 e CA-02.1: a requisição exata do /construir…"; `e2e/andamento-construir.spec.ts` › "CP-1 e CA-05.1…" | R, E |
| CA-01.2 | `andamento.test.ts` › "CA-01.2: … awave, os quatro agentes, cto e administradora… → 403 sem_permissao; nada muda"; `andamento-qa.test.ts` › "ordem das recusas… mesmo 403 do corpo válido"; `src/modules/acesso/matriz-andamento.test.ts` › "(d) …" | R, U |
| CA-01.3 | `matriz-andamento.test.ts` › "(a) os pares (ação, integração)… são exatamente os seis"; `matriz-integracoes.test.ts` › "(a) os pares… exatamente os seis" | U |
| CA-01.4 | `test/matriz-rotas.test.ts` › "POST src/app/api/pedidos-construcao/[decId]/andamento/route.ts: tem ação na matriz e nega cada ator proibido com 403"; `test/matriz-rotas-integracoes-qa.test.ts` › a mesma rota | R |
| CA-01.5 | `andamento.test.ts` › "CA-01.5: o token construir em GET /api/demandas/:id, POST /api/demandas e PATCH /api/demandas/:id → 403" | R |
| CA-01.6 | `matriz-andamento.test.ts` › "(e) integração fora da lista (jarvis, Construir, vazio) é negada"; `matriz-andamento-qa.test.ts` › "valor %i negado…" (14 valores) | U |

#### RF-02. Rota e corpo

| CA | Teste automatizado | Nível |
|---|---|---|
| CA-02.1 | `andamento.test.ts` › "CA-01.1 e CA-02.1…" (204 sem corpo, `no-store`, `nosniff`); `src/lib/rota-corpo-invalido-qa.test.ts` › "→ 204 sem corpo, cabeçalhos seguros…" | R |
| CA-02.2 | `andamento-422.test.ts` › "AN-02 (b) pela rota… 422 igual…" (22 corpos) e "a lista cobre o CA-02.2 inteiro"; `src/modules/andamento/schemas-qa.test.ts` (170 casos); `e2e/andamento-construir.spec.ts` › "CA-02.2 e CA-03.1 pelo build…" | R, U, E |
| CA-02.3 | `andamento-422.test.ts` › "422 igual para DEC com pedido gerado e inexistente"; `rota-corpo-invalido-qa.test.ts` › "DEC do teste e DEC que não existe dão a mesma resposta"; e2e acima | R, E |
| CA-02.4 | `test/transversal/sentinelas-andamento.test.ts` › "nenhuma sentinela nem texto de token…"; `rota-corpo-invalido-qa.test.ts` › "CA-02.4 e AN-02 (c)…" | R |
| CA-02.5 | `andamento.test.ts` › "CA-02.5 e CA-02.7: JSON malformado 400, text/plain 415, DEC-xyz 404 sem tocar o banco, 600 KB 413; nada gravado" | R |
| CA-02.6 | `andamento.test.ts` › "CA-02.6: entendendo_o_pedido 0/0 → 204; -0 em tarefasProntas → 204" | R |
| CA-02.7 | `andamento.test.ts` › "CA-02.5 e CA-02.7…"; `andamento-qa.test.ts` › "CA-02.7: id fora da regex, em todas as formas…" (dez formas, sem consulta ao pool) | R |

#### RF-03. 404 sem oráculo

| CA | Teste automatizado | Nível |
|---|---|---|
| CA-03.1 | `andamento.test.ts` › "CA-03.1 a CA-03.4 e AN-03 pela rota…"; `e2e/andamento-construir.spec.ts` › "CA-02.2 e CA-03.1 pelo build…" | R, E |
| CA-03.2 | `andamento.test.ts` (mesmo teste, byte a byte); `scripts/seed-andamento-qa.test.ts` › "V-02 sobre o banco semeado…" (a demanda sem pedido do seed) | R, B |
| CA-03.3 | `andamento.test.ts` (pedido gerado por agente e por sistema); `src/modules/andamento/registrar-qa.test.ts` › "nove formas de DEC sem pedido gerado por pessoa…" | R |
| CA-03.4 | os três acima conferem o retrato da demanda e o total de eventos antes e depois; `registrar.test.ts` › "AN-03 e CA-03.1 a CA-03.4…" | R, B |

#### RF-04. Último andamento e idempotência

| CA | Teste automatizado | Nível |
|---|---|---|
| CA-04.1 | `src/modules/andamento/registrar.test.ts` › "CA-04.1, CA-04.5, CA-06.1, CA-06.4: o primeiro envio grava a linha…" | B |
| CA-04.2 | `registrar.test.ts` › "CA-04.2 e CA-05.9…"; `regras-qa.test.ts` › "CA-04.2: … qualquer que seja o instante"; `e2e/andamento-construir.spec.ts` › "CP-5…" | B, U, E |
| CA-04.3 | `registrar.test.ts` › "CA-04.3, CA-04.4 e CA-06.3: só os números mudam…" | B |
| CA-04.4 | o mesmo; `regras-qa.test.ts` › "CA-04.4: construindo 9/17 → construindo 3/19…"; `src/app/api/demandas/leitura-andamento-qa.test.ts` (números menores lidos como o último) | B, U |
| CA-04.5 | `registrar.test.ts` › "CA-04.1, CA-04.5…"; `transicoes-construir-qa.test.ts` › "CA-05.10 no banco…" (`atualizada_em` igual nos 51 casos sem regra) | B |
| CA-04.6 | banco: `src/db/schema/andamento-qa.test.ts` (o CHECK recusa a linha); leitura: `regras-qa.test.ts` › "%s → null, sem lançar"; API: `leitura-andamento-fora-do-esquema-qa.test.ts` (seis campos, um por vez); fila: `fila-andamento-qa.test.ts` › "CA-04.6: andamento montado à mão fora do esquema…"; detalhe: `andamento-detalhe-qa.test.ts` › "CA-04.6 (detalhe)…" | B, U, R, T |

#### RF-05. Transições automáticas e recusas

| CA | Teste automatizado | Nível |
|---|---|---|
| CA-05.1 | `registrar.test.ts` › "CA-05.1: aprovada (pela pessoa) + em_construcao → em_construcao…"; `transicoes-construir.test.ts`; `e2e/andamento-construir.spec.ts` › "CP-1 e CA-05.1…" (lista exata de eventos, apertada na 06-T14) | B, E |
| CA-05.2 | `registrar.test.ts` › "CA-05.2 e CA-05.3…"; `transicoes-construir-qa.test.ts` › "em_construcao + cancelado → devolvida, com status_alterado do construir…" | B |
| CA-05.3 | `registrar.test.ts` › "CA-05.2 e CA-05.3…"; `regras-qa.test.ts` › "construido nunca muda o status…" | B, U |
| CA-05.4 | `registrar.test.ts` › "CA-05.4 a CA-05.7 e AN-04: a tabela inteira com banco" (54 casos); `andamento.test.ts` › "409 pela rota… demanda entregue… → 409 statusFinal" | B, R |
| CA-05.5 | `registrar.test.ts` (tabela inteira) | B |
| CA-05.6 | `registrar.test.ts` (tabela inteira); `transicoes-construir-qa.test.ts` (54 casos no banco) | B |
| CA-05.7 | `registrar.test.ts` (a tabela roda com os dois tipos); `transicoes-construir.test.ts` › "transicaoDoConstruir: estudo não vai para construção…" | B, U |
| CA-05.8 | `registrar.test.ts` › "CA-05.8: com o v2 aprovado, o envio do v1 é 409…"; `registrar-qa.test.ts` › "a fronteira: o DEC substituído…"; `andamento.test.ts` › "409 pela rota…" | B, R |
| CA-05.9 | `registrar.test.ts` › "CA-04.2 e CA-05.9…" | B |
| CA-05.10 | `regras.test.ts` › "decidirPorStatus (AN-04, CA-05.10): 9 status × 3 × tipo"; `transicoes-construir-qa.test.ts` › "CA-05.10 no banco: 9 origens × 3 × 2 tipos" | U, B |
| CA-05.11 | `transicoes-construir.test.ts` › "CA-05.11: MANUAIS não muda…"; `registrar-qa.test.ts` › "CA-05.11…"; `andamento-detalhe-qa.test.ts` › "CA-05.11 (tela)…" | U, B, T |

#### RF-06. Evento `andamento_registrado`

| CA | Teste automatizado | Nível |
|---|---|---|
| CA-06.1 | `registrar.test.ts` › "CA-04.1, CA-04.5, CA-06.1, CA-06.4…"; `e2e/andamento-construir.spec.ts` › "CP-1…" (exatamente um) | B, E |
| CA-06.2 | `registrar.test.ts` › "CA-06.2: mudança de fase cria andamento_registrado com o antes do anterior" | B |
| CA-06.3 | `registrar.test.ts` › "CA-04.3, CA-04.4 e CA-06.3…" | B |
| CA-06.4 | `registrar.test.ts` › "AN-11 > depois (e antes…) só com as quatro chaves"; `regras-qa.test.ts` › "para cada fase e status, só enumeração da lista e inteiro"; e2e CP-1 | B, U, E |
| CA-06.5 | `src/components/rotulos-andamento-qa.test.ts` › "CA-06.5 no histórico da demanda (componente Historico)…" (três testes); `e2e/andamento-detalhe.spec.ts` › "CA-09.1 e CA-06.5…" | T, E |
| CA-06.6 | `registrar.test.ts` › "CA-06.6 > seis fases, prontas de 0 a 20…: 27 linhas e 7 andamento_registrado"; `regras-qa.test.ts` › "CA-06.6…" | B, U |

#### RF-07. Próxima ação depois de `construido`

| CA | Teste automatizado | Nível |
|---|---|---|
| CA-07.1 | `src/components/dados-das-etapas-andamento.test.ts` › "CA-07.1…" (dois testes); `andamento-detalhe-qa.test.ts` › "CA-07.1 (HTML)…"; `e2e/andamento-detalhe.spec.ts` › "CA-07.1: andamentoConcluido…" | U, T, E |
| CA-07.2 | `dados-das-etapas-andamento.test.ts` › "CA-07.2…" (seis casos); `andamento-detalhe-qa.test.ts` › "CA-09.4 e CA-07.2 (HTML)…"; e2e › "CA-09.4 e CA-07.2…" | U, T, E |
| CA-07.3 | `dados-das-etapas-andamento.test.ts` › "CA-07.3…"; `andamento-detalhe-qa.test.ts` › "CA-07.3 (HTML)…" | U, T |

#### RF-08. Selo de fase na fila

| CA | Teste automatizado | Nível |
|---|---|---|
| CA-08.1 | `src/app/(painel)/demandas/fila-andamento.test.ts` (tabela e cartão); `fila-andamento-qa.test.ts`; `e2e/andamento-fila.spec.ts` › "CA-08.1 a CA-08.4: na tabela…" e "celular › … no cartão…" | T, E |
| CA-08.2 | `fila-andamento.test.ts` › "…total 0, só a fase"; e2e acima | T, E |
| CA-08.3 | `fila-andamento.test.ts` › "construção concluída, em positivo…"; e2e acima | T, E |
| CA-08.4 | `fila-andamento-qa.test.ts` › "CA-08.4: em cada um dos outros oito status…"; `dados-do-andamento-qa.test.ts` › "CA-08.4 pela lista do esquema…"; e2e acima | T, U, E |
| CA-08.5 | `e2e/andamento-fila.spec.ts` › "CA-08.5: axe sem violação com os selos de fase, em 1280 × 720 e 390 × 844" | E |

#### RF-09. Seção no detalhe

| CA | Teste automatizado | Nível |
|---|---|---|
| CA-09.1 | `dados-do-andamento.test.ts` › "construindo 9/17 (CA-09.1)"; `andamento-detalhe-qa.test.ts` › "CA-09.1…" (dois testes); `e2e/andamento-detalhe.spec.ts` › "CA-09.1 e CA-06.5…" | U, T, E |
| CA-09.2 | `dados-do-andamento.test.ts` › "total 0…"; `andamento-detalhe-qa.test.ts` › "CA-09.2…"; e2e › "CA-09.2: andamentoSemPlano…" | U, T, E |
| CA-09.3 | `dados-do-andamento.test.ts` › "cancelada…"; `andamento-detalhe-qa.test.ts` › "CA-09.3 e 5.2 item 3…"; e2e › "CA-09.3: andamentoCancelado…" | U, T, E |
| CA-09.4 | `dados-do-andamento.test.ts` › "sem andamento: null (CA-09.4)"; `andamento-detalhe-qa.test.ts` › "CA-09.4 e CA-07.2 (HTML)…"; e2e › "CA-09.4 e CA-07.2…" | U, T, E |
| CA-09.5 | `e2e/andamento-detalhe.spec.ts` › "CA-09.5: axe sem violação com a seção, em 1280 × 720 e 390 × 844; na coluna lateral, nada sobreposto" | E |

#### RF-10. Vista do Awave

| CA | Teste automatizado | Nível |
|---|---|---|
| CA-10.1 | `src/app/api/demandas/leitura-awave-andamento.test.ts` › "CA-10.1: construindo 9/17 → 200 com exatamente as sete chaves…"; `e2e/andamento-construir.spec.ts` › "CA-10.1 pelo build…" | R, E |
| CA-10.2 | `leitura-awave-andamento.test.ts` › "CA-10.2…"; `leitura-andamento-qa.test.ts` › "duas demandas do Awave com andamento e uma sem…" | R |
| CA-10.3 | `leitura-awave-andamento.test.ts` › "CA-10.3: … igual ao id inexistente"; `leitura-andamento-qa.test.ts` › "integração fora da autoria não recebe vista…"; `seed-andamento-qa.test.ts` › "o Awave … não lê nenhuma das oito" | R, B |
| CA-10.4 | `leitura-awave-andamento.test.ts` › "CA-10.4: o 201 do POST do Awave tem as sete chaves…"; `e2e/integracoes.spec.ts` › "CA-09.1: o Awave cria e lê a própria demanda" (sete chaves) | R, E |
| CA-10.5 | `leitura-awave-andamento.test.ts` › "CA-10.5: levada a devolvida pelo cancelado do /construir…" | R |

#### RF-11. Vistas de pessoa e de agente

| CA | Teste automatizado | Nível |
|---|---|---|
| CA-11.1 | `leitura-awave-andamento.test.ts` › "CA-11.1…"; `leitura-andamento-qa.test.ts` › "a pessoa recebe a vista inteira…" (23 chaves exatas) | R |
| CA-11.2 | `leitura-awave-andamento.test.ts` › "CA-11.2 e CA-11.3…"; `test/transversal/visibilidade-andamento.test.ts` › "varre MATRIZ × rotas × quatro agentes"; `leitura-andamento-qa.test.ts` › "os quatro agentes e o sistema recebem a vista mínima exata…" | R, B |
| CA-11.3 | `leitura-awave-andamento.test.ts` › "CA-11.2 e CA-11.3…" | R |

#### RF-12. Limite de gravações

| CA | Teste automatizado | Nível |
|---|---|---|
| CA-12.1 | `andamento.test.ts` › "CA-12.1 e CA-12.2: com 60 linhas do DEC…, estado novo → 429…"; `limites-andamento-qa.test.ts` › "CA-12.1…" | R, B |
| CA-12.2 | `andamento.test.ts` › "CA-12.2: uma gravação e depois 200 envios no mesmo estado → todos 204…" | R |
| CA-12.3 | `andamento.test.ts` › "CA-12.3: o DEC A no limite não segura o DEC B" e "CA-12.3 (D-14): 599 linhas…"; `limites-andamento-qa.test.ts` (ordem das conferências) | R, B |
| CA-12.4 | `andamento.test.ts` › "CA-12.4: o ritmo do /construir, 30 estados diferentes…"; `limites-andamento-qa.test.ts` › "90 gravações…, uma a cada 2 min por 3 h" | R, B |
| CA-12.5 | `andamento.test.ts` › "CA-12.5: com 59 linhas do DEC, dois envios… ao mesmo tempo → um 204 e um 429"; `limites-andamento-qa.test.ts` (2 e 10 simultâneas) | R, B |
| CA-12.6 | `src/modules/limites-andamento.test.ts` › "CA-12.6…"; `limites-andamento-qa.test.ts` › "CA-12.6: Awave 10, pessoa e agente 30 e 60…"; `limites.test.ts` e `limites-integracao*.test.ts` sem mudança | U |

#### RF-13. Versão e documentação

| CA | Teste automatizado | Nível |
|---|---|---|
| CA-13.1 | versão: `test/estatico/projeto.test.ts` › "package.json › versão 0.4.0…"; "nenhum token nos documentos": `test/estatico/docs-sem-token.test.ts` (varre `docs/**/*.md`, `CHANGELOG.md` e `README.md`). Seção 0.4.0 do `CHANGELOG.md`: conferência documental R-13.1 (seção 2), depois da `10-documentacao` | U, D |
| CA-13.2 | `docs-sem-token.test.ts` (nenhum valor de token no cap. 05); conteúdo do cap. 05: conferência documental R-13.2 depois da `10-documentacao` | U, D |
| CA-13.3 | `docs-sem-token.test.ts` (nenhum valor de token em `docs/operacao/`); conteúdo: conferência documental R-13.3 depois da `10-documentacao` | U, D |

Os três CA-13 dependem de texto que, por desenho, ainda não existe. Pela G2 e pela D-10 do plano, nenhuma tarefa da 06 escreve
em `docs/` nem no `CHANGELOG.md`. O dono é a `10-documentacao`. Em 13/11, o `CHANGELOG.md` não tem a seção 0.4.0, e o
manual técnico e `docs/operacao/` não citam a rota nova. Isso é o esperado nesta etapa e não é defeito. Por isso esses
três critérios não voltam para uma 06 (nenhuma tarefa do `tarefas.json` é dona deles). A guarda automatizada cobre a
parte "nenhum valor de token". O conteúdo fica com a conferência documental da seção 2, e há um candidato a automação na
seção 5.

#### Critérios preliminares (pedido.json) e RNF

| Item | Coberto por |
|---|---|
| CP-1 | CA-01.1, CA-02.1, CA-04.1, CA-08.1, CA-09.1; de ponta a ponta: `e2e/andamento-construir.spec.ts` › "CP-1 e CA-05.1…" |
| CP-2 | CA-05.1, CA-06.1; e2e CP-1 (lista exata de `status_alterado` e `andamento_registrado`) |
| CP-3 | CA-05.3, CA-05.10, CA-07.1, CA-07.3 |
| CP-4 | CA-05.2, CA-05.11 |
| CP-5 | CA-04.2, CA-05.9, CA-06.3; `e2e/andamento-construir.spec.ts` › "CP-5…" |
| CP-6 | CA-02.2, CA-02.3, CA-03.1 a CA-03.4 |
| CP-7 | CA-01.2 a CA-01.6 |
| CP-8 | CA-10.1 a CA-10.5 |
| CP-9 | `scripts/seed-andamento-qa.test.ts` › "V-02 sobre o banco semeado…": a rota real e um token real sobre o seed, sem o `.mjs`. O `enviar-andamento.mjs` contra a homologação é a V-02 da `09-entrega` (plano, "Verificação na homologação"), e o roteiro R-CP9 está na seção 2 |
| RNF-01 | `consultas.test.ts` › "planos (RNF-01)" (índices, sem `Seq Scan`); `registrar-prazo.test.ts` e `registrar-qa.test.ts` (503 no prazo, nada gravado). A medição p95 com a tabela povoada fica com a 09 (ver Pendências) |
| RNF-02 | CA-12.4 |
| RNF-03 | `test/transversal/sentinelas-andamento.test.ts` |
| RNF-04 | `andamento.test.ts` › "log (RNF-04, AN-11, G3.12)"; `andamento-qa.test.ts` › "sem Bearer… o log não leva o token" |
| RNF-05 | `andamento-qa.test.ts` (schema), `migration-0008.test.ts`, `privilegios.test.ts`, `imutabilidade.test.ts`; ensaio de rollback na 09 |
| RNF-06 | `registrar-concorrencia.test.ts` › "AN-05 (a) a (e)"; `registrar-qa.test.ts` › "AN-05 e M-4 da 0019…" |
| RNF-07 | `andamento.test.ts` › "CA-01.1 e CA-02.1: a requisição exata do /construir…" e "o que o /construir faz com cada resposta…"; contrato do Awave em `e2e/integracoes*.spec.ts` |
| RNF-08 | suíte inteira, `PISO` de asserções (só subiu em todas as 06) |
| RNF-09 | 06-T14: Vitest 7.736 de 7.736, e2e 290 aprovados, 9 pulados e 0 falhas; as três rodadas seguidas do e2e ficam com a 09 contra a homologação |
| RNF-10 | sem teste: não há regra nova de expurgo, e o andamento não tem dado pessoal (conferência documental na 10) |

### 2. Roteiro de teste por critério

Passos para uma pessoa repetir na homologação. "Retrato" é o status, o `atualizadaEm`, o `andamento` e o total de
eventos da demanda, lidos como "cto" em `GET /api/demandas/:id` e `GET /api/demandas/:id/historico`, antes e depois do
passo. Critério marcado "só automatizado" depende de estado que o painel não cria (evento inserido à mão, 60 gravações na
janela, relógio injetado). O teste da seção 1 é a prova, e o roteiro diz o que conferir no resultado dele.

#### RF-01

| Id | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| R-01.1 | Abrir "Andamento: para o /construir enviar" e copiar o DEC. Enviar C1 com o `construir` | C1 | 204 sem corpo |
| R-01.2 | Repetir R-01.1 com o token `awave` da homologação; depois com o token de um agente; depois logado no painel como "cto" (sessão com 2FA, mesma URL pelo navegador com `fetch`) | C1 e o mesmo DEC | 403 `sem_permissao` com a mensagem de hoje nos três; retrato igual |
| R-01.3 | Só automatizado. Conferir no resultado de `matriz-andamento.test.ts` que o teste "(a)" passou | — | seis pares, com `registrar_andamento:construir` |
| R-01.4 | Só automatizado. `test/matriz-rotas.test.ts` com `-t andamento` | — | a rota nova aparece e nega cada ator proibido |
| R-01.5 | Com o `construir`, chamar `GET /api/demandas/<id>`, `POST /api/demandas` (corpo mínimo válido) e `PATCH /api/demandas/<id>` | id da "Andamento: construindo" | 403 nas três; nada muda |
| R-01.6 | Só automatizado (ator montado com nome `jarvis`) | — | negado |

#### RF-02

| Id | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| R-02.1 | Enviar C1 para o DEC da "Andamento: construindo" (estado diferente do gravado: usar `tarefasProntas: 10`) e ler os cabeçalhos | C1 com 10 | 204 sem corpo, `cache-control: no-store`, `x-content-type-options: nosniff`, sem `location` |
| R-02.2 | Enviar, um por vez: C1 + `"nota": "x"`; C1 sem cada uma das quatro chaves; `fase` `"Construindo"`, `"construido"` e `""`; `status` `"entregue"` e `"encerrada"`; 10 de 9; -1; 1.5; `"9"`; `null`; `true`; total 1000; corpo `[]`, `null` e `"texto"`. Conferir o retrato depois de cada um | os 19 corpos | 422 `nao_processavel` com a mensagem da 03, seção 7, em todos; retrato igual |
| R-02.3 | Repetir três corpos de R-02.2 contra `DEC-DEM-20991231-9999-v1` e comparar com a resposta do DEC real | três corpos inválidos | resposta idêntica (status, corpo e cabeçalhos, exceto `date`) |
| R-02.4 | Enviar C1 + `"SENTINELA-QA-0017": "SENTINELA-QA-0017"` | sentinela inventada | 422 sem a sentinela no corpo; pedir à 09 que confira que o log do contêiner também não a tem |
| R-02.5 | Enviar `{fase:` (JSON quebrado) e C1 com `content-type: text/plain` | — | 400 e 415; retrato igual |
| R-02.6 | Enviar `{ "fase": "entendendo_o_pedido", "tarefasProntas": 0, "tarefasTotal": 0, "status": "em_construcao" }` para o DEC da "Andamento: construindo" | 0/0 | 204; na fila o selo vira só "Entendendo o pedido" |
| R-02.7 | Enviar C1 para `/api/pedidos-construcao/DEC-xyz/andamento` | `DEC-xyz` | 404 `nao_encontrado`, igual ao do DEC inexistente no formato |

#### RF-03

| Id | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| R-03.1 | Enviar C1 para `DEC-DEM-20991231-9999-v1` | C1 | 404 `{ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO }` |
| R-03.2 | Enviar C1 para o DEC da "Andamento: pacote sem pedido gerado" e comparar com R-03.1 | C1 | igual byte a byte, exceto `date` |
| R-03.3 | Só automatizado (`pedido_gerado` de agente ou de sistema inserido à mão) | — | igual ao R-03.1 |
| R-03.4 | Nos R-03.1 e R-03.2, retrato da "Andamento: pacote sem pedido gerado" antes e depois | — | nada muda (status, `atualizadaEm`, `andamento: null`, eventos) |

#### RF-04

| Id | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| R-04.1 | Na "Andamento: para o /construir enviar" (ainda sem andamento), anotar a hora e enviar C1 | C1 | `andamento` da pessoa = `{ decId, fase: construindo, tarefasProntas: 9, tarefasTotal: 17, statusConstrucao: em_construcao, atualizadoEm: hora do envio }` |
| R-04.2 | Esperar 2 min e enviar C1 de novo | C1 | 204; `atualizadoEm` e "Última mudança informada…" no detalhe continuam os do R-04.1; nenhum evento novo |
| R-04.3 | Esperar 2 min e enviar C1 com `tarefasProntas: 10` | 10/17 | `tarefasProntas` 10; `atualizadoEm` novo; nenhuma linha nova no histórico |
| R-04.4 | Enviar `construindo 3/19` | 3/19 | aceito; selo "Construindo · 3/19"; barra volta para 3 de 19; nenhum evento |
| R-04.5 | Anotar `atualizadaEm` da demanda (em construção) e repetir R-04.3 com 11 | 11/19 | `atualizadaEm` da demanda igual ao anotado; só o do andamento muda |
| R-04.6 | Só automatizado (linha fora do esquema inserida sem os CHECK). Conferir `leitura-andamento-fora-do-esquema-qa.test.ts`, `fila-andamento-qa.test.ts` e `andamento-detalhe-qa.test.ts` | — | fila, detalhe e API sem erro, sem selo e sem seção, `andamento: null` |

#### RF-05

| Id | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| R-05.1 | É o R-04.1: a demanda estava em Aprovada | C1 | status Em construção; no histórico, "Mudou o status", "Antes: Aprovada. Depois: Em construção." e ator "/construir (prefixo …)" |
| R-05.2 | Na demanda do R-05.1, enviar `construindo 9/17 cancelado` | — | status Devolvida pela construção; `status_alterado` pelo `/construir` |
| R-05.3 | Na "Andamento: construindo", enviar `documentando 17/17 construido` | — | status continua Em construção; sem `status_alterado` novo |
| R-05.4 | Pessoa marca a "Andamento: revisando e entregando" como Entregue. Enviar `revisando_e_entregando 17/17 em_construcao` e, depois, `… cancelado`. Numa demanda posta em Encerrada pela pessoa, enviar `em_construcao` e `construido` | — | 409 `conflito` com o texto de status final da 03, seção 7, nos quatro; retrato igual |
| R-05.5 | Na Entregue do R-05.4, enviar `documentando 17/17 construido`; na Encerrada, enviar `… cancelado` | — | 204 e andamento gravado; status não muda |
| R-05.6 | Na "Andamento: construção cancelada" (Devolvida), enviar `construindo 3/8 em_construcao`. Numa demanda Aprovada com pedido gerado (refazer o seed, ou gerar o pedido de outra), enviar `construido` e depois `cancelado` | — | Devolvida continua Devolvida; Aprovada continua Aprovada; andamento gravado |
| R-05.7 | Numa demanda Aprovada com pedido gerado, a pessoa muda o tipo para Estudo em Editar dados. Depois enviar C1 | — | andamento gravado; status continua Aprovada |
| R-05.8 | Só automatizado, se o painel não permitir aprovar v2 depois do pedido do v1 sem tirar a demanda de Aprovada. Se permitir: aprovar o v2 e enviar C1 para o v1 | — | 409 com o texto de DEC substituído da 03, seção 7, sem o id do v2; nada gravado |
| R-05.9 | Na Entregue do R-05.5, reenviar o mesmo corpo do R-05.5 | o mesmo corpo | 204 sem gravar (não 409) |
| R-05.10 | Só automatizado (9 status × 3). Conferir `transicoes-construir-qa.test.ts` › "CA-05.10 no banco" | — | nenhuma combinação termina em Entregue ou Encerrada |
| R-05.11 | Na demanda Devolvida do R-05.2, abrir Mudar status | — | opções Em construção e Em análise, as de hoje |

#### RF-06

| Id | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| R-06.1 | No R-04.1, contar os eventos novos | — | um "Registrou o andamento…" e um "Mudou o status" |
| R-06.2 | Na demanda do R-04.x, enviar `testando 17/17 em_construcao` | — | um "Registrou o andamento de <DEC>: Testando, 17 de 17 tarefas" novo |
| R-06.3 | Enviar `testando 17/18` (só o número muda) | — | nenhuma linha nova no histórico; selo e seção mudam |
| R-06.4 | Ler `GET /api/demandas/:id/historico` como "cto" | — | `depois` com exatamente `fase`, `tarefasProntas`, `tarefasTotal`, `statusConstrucao`; ator integração `construir` com o prefixo do token usado |
| R-06.5 | Abrir o Histórico do detalhe | — | frase em pt-BR com o DEC, a fase e "x de y tarefas", ator "/construir (prefixo …)"; nenhum token, hash nem "Antes/Depois" nesse evento |
| R-06.6 | Só automatizado (ciclo de 20 tarefas). Conferir `registrar.test.ts` › "CA-06.6" | — | 7 eventos em 27 gravações |

#### RF-07

| Id | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| R-07.1 | Abrir "Andamento: construção concluída" | seed | Próxima ação "Construção concluída: confira e marque como Entregue.", o detalhe "O /construir não marca Entregue…", "Quem age: Uma pessoa (CTO ou administradora)" e o link "Mudar o status", que leva o foco ao `h2` Mudar status |
| R-07.2 | Abrir "Andamento: construindo" e "Em construção sem andamento" | seed | Próxima ação linha 11 de hoje nas duas |
| R-07.3 | Na "Andamento: construção concluída", marcar Entregue | — | aviso "Status alterado para Entregue."; Próxima ação "Nada. A demanda está em Entregue."; a seção Andamento continua |

#### RF-08

| Id | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| R-08.1 | Em 1280 × 720, `/demandas?status=em_construcao`; depois, em 390 × 844 | seed | linha e cartão da "Andamento: construindo" com "Construindo · 9/17" |
| R-08.2 | Mesma tela | seed | "Andamento: sem plano de tarefas" com só "Entendendo o pedido" |
| R-08.3 | Mesma tela | seed | "Andamento: construção concluída" com "Construção concluída" |
| R-08.4 | Mesma tela e `/demandas?status=devolvida` | seed | "Em construção sem andamento" sem selo; "Andamento: construção cancelada" (Devolvida) sem selo |
| R-08.5 | Rodar o axe (extensão do navegador ou o e2e) nas duas larguras; à mão, ler a célula Status com leitor de tela | seed | sem violação; a célula é lida como "Em construção, Andamento: Construindo, 9 de 17 tarefas prontas." |

#### RF-09

| Id | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| R-09.1 | Abrir "Andamento: construindo" em 1280 × 720 | seed | seção "Andamento da construção" depois da Próxima ação e primeiro item de "Nesta página"; link do DEC para `/pacotes-decisao/<DEC>`; "Construindo", "Em andamento", "9 de 17 tarefas"; `<progress value="9" max="17">` com nome "Tarefas prontas" e `aria-valuetext="9 de 17 tarefas"`; "Última mudança informada pelo /construir em <data>." em `<time datetime>`, no fuso do sistema; a nota de recarregar |
| R-09.2 | Abrir "Andamento: sem plano de tarefas" | seed | "Nenhuma tarefa contada. O plano de tarefas ainda não foi feito, ou este pedido não tem plano." e nenhum `<progress>` |
| R-09.3 | Abrir "Andamento: construção cancelada" | seed | Situação "Cancelada" e o alerta "A construção deste pedido foi cancelada no /construir."; Próxima ação linha 12 |
| R-09.4 | Abrir "Em construção sem andamento" | seed | nenhuma seção e nenhum item em "Nesta página" |
| R-09.5 | Axe nas duas larguras; em 1280, conferir que a coluna lateral não sobrepõe Próxima ação, Andamento e Histórico | seed | sem violação, nada sobreposto |

#### RF-10 e RF-11

| Id | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| R-10.1 | Com o `awave`, criar uma demanda (`POST /api/demandas`) e gerar o pedido dela pelo painel; enviar C1 com o `construir`; ler com o `awave` | título "Relatório do Awave (fictício)" | 200 com exatamente sete chaves; `andamento` com exatamente `fase`, `tarefasProntas`, `tarefasTotal`, `atualizadoEm` |
| R-10.2 | Ler com o `awave` uma demanda dele sem andamento | — | `andamento: null` |
| R-10.3 | Ler com o `awave` a "Andamento: construindo" (autoria de pessoa) e `DEM-20991231-0042` | — | 404 iguais |
| R-10.4 | No `POST` do R-10.1, guardar o 201 e comparar com o GET logo depois | — | sete chaves, `andamento: null`, igual ao GET |
| R-10.5 | Na demanda do R-10.1 em Em construção, enviar `cancelado`; ler com o `awave` | — | `status: devolvida`; `andamento` sem `statusConstrucao` |
| R-11.1 | Ler a "Andamento: construindo" como "cto" | — | `andamento` com os seis campos |
| R-11.2 | Ler a mesma com um token de agente | — | chaves da 0.3.1, sem `andamento` |
| R-11.3 | `GET /api/demandas` como "cto" e como agente | — | itens com as chaves da 0.3.1, sem `andamento` |

#### RF-12

| Id | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| R-12.1 | Só automatizado (60 gravações na janela). Conferir `andamento.test.ts` › "CA-12.1…" | — | 429 com "Limite de 60 registros de andamento por hora deste pedido atingido…", nada gravado |
| R-12.2 | Depois do R-04.3, enviar o mesmo corpo 20 vezes seguidas | o corpo do R-04.3 | todas 204, nenhum 429, nenhuma linha nova |
| R-12.3 a R-12.5 | Só automatizado (DEC A no limite, 600 no total, concorrência). Conferir `andamento.test.ts` e `limites-andamento-qa.test.ts` | — | como o 01 |
| R-12.6 | Só automatizado. Conferir `limites-andamento-qa.test.ts` › "CA-12.6…" | — | 10, 30 e 60 sem mudança |

#### RF-13 (conferência documental, depois da `10-documentacao`)

| Id | O que abrir | Resultado esperado |
|---|---|---|
| R-13.1 | `package.json` e `CHANGELOG.md` | `"version": "0.4.0"`; seção 0.4.0 com a rota, o selo, o detalhe, a vista do Awave e a migration |
| R-13.2 | `docs/manual-tecnico/` cap. 05 | rota; respostas 204, 404, 409, 422, 429 e 503; a tabela status × `statusConstrucao`; `andamento_registrado`; o limite 60/600; a A3 |
| R-13.3 | `docs/operacao/deploy.md` e `docs/operacao/tokens-de-integracao.md` | backup antes; migrator; `worker` e depois `app`; sem snapshot (D5); volta pelo caminho B; `"andamento_ligado": true` só depois do deploy e da saúde; conferir a fase na fila em até 2 min; o `construir` ganhou a ação sem mudar a emissão. Em todos: nenhum valor de token, `.env` ou dado pessoal |

#### CP-9 (V-02, para a `09-entrega`)

R-CP9: os passos 1 a 7 de "Verificação na homologação" do plano. Resultado esperado:

- o `enviar-andamento.mjs` sai 0;
- a linha do DEC da "Andamento: para o /construir enviar" termina em `enviado (HTTP 204)`, e a do DEC da "Andamento:
  pacote sem pedido gerado", em `fora_do_orquestrador (HTTP 404)`;
- a demanda fica em Em construção, com andamento e um `andamento_registrado`;
- a segunda execução imprime `nada mudou` e não cria evento;
- as pastas temporárias são apagadas, o token é revogado pelo prefixo e o `git status` fica limpo nos dois repositórios.

### 3. Casos exploratórios sugeridos

Sessões de 30 a 45 min, na homologação, com registro do que foi coberto. Nenhuma foi executada nesta etapa: este agente
não roda o sistema (ver Pendências).

| Id | Missão | Risco que investiga | O que observar |
|---|---|---|---|
| EXP-01 | Fila × detalhe com DEC substituído | O selo da fila não lê `substituido`. Uma demanda em Em construção cujo último andamento é `construido` de um DEC já substituído mostraria "Construção concluída" na fila, enquanto o detalhe mostra a linha 11 e o alerta de substituído. Caminho: v1 recebe `construido`, a demanda sai de Em construção, o v2 é aprovado e gerado, e a pessoa volta a Em construção à mão antes do primeiro envio do v2 | Se o painel permitir esse caminho, a fila e o detalhe dizem coisas diferentes. Hoje é suspeita, não defeito confirmado. Se reproduzir: registrar com passos, e o `ux-ui-design` decide (texto, ou selo sem `construido` de DEC não vigente) |
| EXP-02 | Linha 15 × seção com andamento inconsistente | A 06-T13 apontou que a linha 15 olha só `decId` e `statusConstrucao`, e a seção confere tudo. Pelo caminho real, o `lerAndamento` barra antes | Tentar chegar a "linha 15 sem seção" por qualquer caminho de tela. Esperado: não chega |
| EXP-03 | Pessoa e `/construir` ao mesmo tempo | A pessoa marca Entregue enquanto chega `cancelado`; a pessoa muda para Em análise enquanto chega `em_construcao` | O resultado final segue a tabela da seção 5 do 01, lida depois da trava; nenhuma tela mostra erro técnico; o histórico explica a ordem |
| EXP-04 | Dois eventos no mesmo instante | No primeiro envio, "Mudou o status" e "Registrou o andamento" têm a mesma hora | A ordem no Histórico deixa claro o que aconteceu? Anotar se confunde (achado de UX, para o `ux-ui-design`) |
| EXP-05 | A data que não anda | Com o envio no mesmo estado por mais de 40 min, a "Última mudança informada…" fica parada (RF-04, decisão da 03) | Uma pessoa entende que o `/construir` não parou? Registrar a percepção; o painel não tem sinal de envio parado (spec 7.3) |
| EXP-06 | Replanejamento | O total sobe e as prontas descem (`construindo 9/17` → `construindo 3/19`) | A barra volta sem animação e sem mensagem estranha; o selo acompanha; o histórico não ganha linha |
| EXP-07 | Volta depois do cancelamento | Devolvida pelo `cancelado`; a pessoa leva a Em construção à mão | Fila com "Construção cancelada" (03, 4.1); seção com o alerta; depois um envio `em_construcao` do mesmo DEC volta o selo para a fase |
| EXP-08 | Reflow e zoom | 320 px, zoom 200 % e 400 %, espaçamento de texto aumentado, na fila e no detalhe | Sem rolagem lateral; o DEC quebra sem reticência; alinhamento do selo no cartão em 320 px (Minor 1 da 06-T12, sem asserção automática) |
| EXP-09 | Teclado e leitor de tela | "Nesta página" → "Andamento da construção"; link "Mudar o status" da linha 15; ordem do Tab na seção | O foco vai ao `h2` certo; a seção tem um único focável (o link do DEC); a barra é lida como "Tarefas prontas, 9 de 17 tarefas"; o selo não lê "ponto" nem "barra" |
| EXP-10 | Token revogado no meio do ciclo | Revogar o `construir` pelo prefixo e reenviar | 401 igual ao do token inexistente; o painel continua mostrando o último andamento, sem indicação de que o envio parou (registrar como observação) |
| EXP-11 | Status finais | Entregue + `construido` grava; Encerrada + `cancelado` grava | A seção mostra o andamento novo numa demanda já final; a Próxima ação continua a linha 1 ou a de Encerrada; nada sugere reabrir |
| EXP-12 | Tipo Estudo | Estudo com pedido gerado recebendo `em_construcao` | Fica em Aprovada com seção de andamento; a Próxima ação faz sentido para quem vê "em andamento" numa demanda Aprovada? (observação de UX) |
| EXP-13 | Mensagens da API lidas por Fabiano | 409 (substituído e status final), 422 e 429 lidos no registro do `/construir` | O texto diz o que fazer, sem eco do valor enviado, sem status, sem id do substituto |
| EXP-14 | `dicaAprovada` | Abrir Mudar status de uma demanda Aprovada | O texto novo da 03 está lá, e o antigo ("é manual nesta versão") sumiu |

**Fica de fora destas sessões:**

- carga e p95 (RNF-01): são da 09;
- a tool do Awave lendo a sétima chave (P-05): é fora do `/construir`;
- produção e a troca de `"andamento_ligado"`: são de Fabiano, depois do merge;
- o estado de erro só da leitura do andamento na fila (03, 4.4): exige derrubar uma leitura sem derrubar a lista, o que
  a tela não provoca. Está coberto por `fila-andamento-qa.test.ts` › "banco do andamento que falha (leitura real)…";
- `pedido_gerado` de agente ou de sistema, e a borda de 60/600 gravações: só automatizados.

### 4. Roteiro de aceite para Fabiano (UAT)

**Onde:** a homologação da 0.4.0 que a `09-entrega` sobe, com o seed fictício. **Não usar produção.** Duração: cerca de
30 min.

**Antes de começar:** a 09 entrega a URL da homologação e roda o envio pelo `/construir` (V-02). Fabiano não precisa
manusear token. Os passos 3 a 6 usam o estado que a V-02 deixa, ou o seed recém-feito. Marque cada item como Aceito ou
Pendente e anote o motivo.

| # | O que fazer | O que deve acontecer | Aceito? |
|---|---|---|---|
| A-01 | Entrar como "cto" e abrir a Fila, filtro Em construção | "Andamento: construindo" mostra "Construindo · 9/17" abaixo do status; "Andamento: sem plano de tarefas" mostra só "Entendendo o pedido"; "Andamento: construção concluída" mostra "Construção concluída"; "Em construção sem andamento" não tem selo | |
| A-02 | Repetir A-01 no celular (ou com a janela estreita) | O mesmo texto no topo de cada cartão, sem rolagem para o lado | |
| A-03 | Abrir "Andamento: construindo" | Seção "Andamento da construção" logo abaixo da Próxima ação: o Pedido de Construção (link), Fase Construindo, Situação Em andamento, "9 de 17 tarefas" com barra, "Última mudança informada pelo /construir em …" e a nota de recarregar | |
| A-04 | No mesmo detalhe, abrir o Histórico | "Registrou o andamento de DEC-…: Construindo, 9 de 17 tarefas", com o ator "/construir (prefixo …)" e sem nenhum token | |
| A-05 | Abrir "Andamento: construção concluída" | Próxima ação "Construção concluída: confira e marque como Entregue.", com "Quem age: Uma pessoa (CTO ou administradora)" | |
| A-06 | Clicar em "Mudar o status" e marcar Entregue | O aviso "Status alterado para Entregue."; Próxima ação "Nada. A demanda está em Entregue."; na Fila, a demanda some do filtro Em construção e não tem selo | |
| A-07 | Abrir "Andamento: construção cancelada" | Status Devolvida pela construção; a seção com Situação Cancelada e o alerta de cancelamento; em Mudar status, só Em construção e Em análise | |
| A-08 | Abrir "Andamento: para o /construir enviar" depois da V-02 | Passou sozinha de Aprovada para Em construção; no Histórico, "Mudou o status" e "Registrou o andamento", os dois pelo /construir | |
| A-09 | Abrir "Andamento: pacote sem pedido gerado" | Nada mudou: sem seção de andamento e sem evento do /construir (o pedido sem demanda gerada no painel fica sem andamento, decisão A3) | |
| A-10 | Abrir uma demanda em Aprovada (refazer o seed ou usar outra) e ler o texto de Mudar status | "Quando o /construir começar o Pedido de Construção gerado no painel, a demanda passa sozinha para Em construção. Entregue é sempre marcado por uma pessoa." | |
| A-11 | Pedir à 09 o registro do V-02 | 204 para a demanda com pedido, 404 para a sem pedido, e "nada mudou" na segunda volta | |
| A-12 | Ler a seção 0.4.0 do CHANGELOG e o roteiro de `docs/operacao/deploy.md` (depois da `10-documentacao`) | Diz o que mudou e a ordem: backup, migrations, `worker`, `app`, saúde e só então `"andamento_ligado": true`; volta pelo caminho B | |

**Pendências de aceite que dependem de Fabiano** (spec 7.1; nenhuma bloqueia o aceite funcional):

- P-01: DEC substituído responde 409. Vale se não decidir.
- P-02: tabela de status final. Vale se não decidir.
- P-03: limites de 60 e 600. Valem se não decidir.
- P-04: aceite formal do risco residual com a `gestao-riscos`.
- P-05: conferir a tool do Awave com a sétima chave antes da E01, parte 3.
- A ida para produção é decisão de Fabiano, depois do merge, pelo roteiro de `docs/operacao`.

### 5. Candidatos a automação (para o `qa-automacao`)

| Candidato | Por quê |
|---|---|
| Teste estático: o `CHANGELOG.md` tem uma seção com a versão do `package.json` | Fecha o CA-13.1 por teste em vez de conferência, e vale para toda versão |
| Teste estático: o cap. 05 do manual cita `POST /api/pedidos-construcao/[decId]/andamento` e os códigos 204, 404, 409, 422, 429 e 503 | Pega a doc que esquece a rota (CA-13.2). Só depois da `10-documentacao` |
| e2e da fila e do detalhe também com a conta "administradora" | A 06-T12 registrou que a regra de comando pedia "administradora" e a spec entra como "cto" |
| e2e de R-07.3 (marcar Entregue a partir da linha 15) | Hoje só em HTML (T); o seed usa a "concluída" em leitura, então exige banco próprio ou ordem própria |
| EXP-01, se reproduzir | Vira teste da fila com um andamento de DEC não vigente |

## Decisões tomadas

- CA-13.1 a CA-13.3 entram no mapa como teste automatizado parcial mais conferência documental, sem devolução: pela G2 e
  pela D-10 do plano, o dono é a `10-documentacao`, e nenhuma tarefa do `tarefas.json` pode escrever `docs/`. Devolver a
  uma 06 pediria trabalho que a lista Pode dela proíbe.
- Os critérios que dependem de estado que a tela não cria (evento inserido à mão, 60 gravações, concorrência, relógio)
  estão "só automatizados" no roteiro, com o teste a conferir. Inventar um passo manual que ninguém consegue repetir
  seria reclamação, não teste.
- Os textos de tela seguem a 03, inclusive onde o 01 dizia outra coisa ("Atualizado em", "entregue" minúsculo), porque
  a spec 7.3 decidiu assim.
- EXP-01 fica como caso exploratório, e não como defeito: sem executar o sistema, não sei se o painel permite aprovar o
  v2 com a demanda nesse caminho. Defeito sem reprodução não é defeito reportado.
- O UAT usa só o seed fictício da T10 e o estado que a V-02 deixa, para Fabiano não manusear token nem banco.

## Pendências

- Nenhuma bloqueia a passagem.
- **Execução:** este agente só lê e escreve (Read, Grep, Glob, Write). Nenhum roteiro nem sessão exploratória foi
  executado nesta etapa. A execução manual pede a homologação, que é da 09. O e2e completo foi rodado pela 06-T14 (290
  aprovados, 9 pulados, 0 falhas, uma rodada); as três rodadas seguidas do RNF-09 ficam com a 09.
- **Para a 08 e a 09, instabilidade de tempo sob carga, conhecida e não repetida aqui:** `scripts/scripts.test.ts` T33,
  `test/desempenho/leitura.test.ts` (p95), `src/app/api/saude/route.test.ts`, `resumo-da-fila` e `minimizar`. Todos
  passam sozinhos. Sugestão herdada: isolar os testes de tempo num projeto do Vitest com poucos workers.
- **Para a 09:** medir o RNF-01 com `andamento_construcao` povoada (50 envios, p95 ≤ 1 s, nenhum acima de 5 s, 200 DEC
  e 20 mil eventos), e também o detalhe e a leitura do Awave com a tabela cheia; rodar a V-02 (R-CP9). O `axe-todas.spec.ts`
  › "T03 Fila: com dados e filtrada" levou 23,0 s, perto do limite de 24 s (06-T14).
- **Para a 10:** CA-13.1 a CA-13.3 (seção 0.4.0 do `CHANGELOG.md`, manual cap. 05, 08 e 09, `docs/operacao/deploy.md` e
  `tokens-de-integracao.md`), conferidos pelos R-13.1 a R-13.3. O manual
  `docs/manual-tecnico/10-configuracao-e-scripts.md` ainda diz 28 demandas no seed (06-T10).
- **Para a 08 (Minors herdados, de teste e de código):**
  - o ramo morto `dec.href === null` em `SecaoAndamento.tsx` (06-T13, M1);
  - as regras diferentes da linha 15 e da seção (06-T13; base do EXP-02);
  - o relógio próprio no `describe` do limite de `andamento.test.ts` (06-T08, Minor 3);
  - o `performance.now()` em `limites-andamento.test.ts` (06-T03, Minor 2);
  - o comentário de topo de `rota-corpo-invalido.test.ts` (06-T04, Minor 2);
  - os auxiliares copiados em três specs e2e (06-T14, Minor 2).
- **Para o `ux-ui-design`, se o EXP-01 reproduzir:** decidir o que a fila mostra para o `construido` de um DEC não
  vigente.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (07) todo critério de aceite de 01 aparece no mapa
- [x] (07) nenhum critério ficou "sem cobertura"
- [x] (07) os dados de teste são fictícios
