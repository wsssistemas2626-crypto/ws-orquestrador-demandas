---
pedido: DEC-DEM-20261111-0016-v1
etapa: 05-plano
agente: tech-lead
leu: [pedido.json, docs/superpowers/specs/2026-11-11-ws-orquestrador-demandas-integracoes-design.md, 01-analista-requisitos.md, 02-arquiteto-solucoes.md, 03-ux-ui-design.md, 04-seguranca-aplicacao.md, padrao-tecnico.md, contrato-passagem.md, passagens.jsonl, tarefas.json, 06-T07-engenheiro-dados-bd.md, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md, .claude/agents/engenheiro-backend.md, .claude/agents/engenheiro-frontend.md, .claude/agents/engenheiro-dados-bd.md (listas Pode), src/modules/demandas/entrada-qa.test.ts, src/app/api/demandas/demandas.test.ts (linhas 200 a 410), src/app/api/vistas-para-agente.test.ts (linhas 1 a 80), src/app/(painel)/demandas/fila.test.ts (linhas 30 a 54), src/app/(painel)/demandas/fila-qa.test.ts (linhas 55 a 74), src/app/(painel)/demandas/fila-a1.test.ts (linhas 25 a 44), src/app/(painel)/demandas/fila-a1-qa.test.ts (linhas 18 a 37), o diff da T07 em src/modules/demandas/consultas.ts, consultas.test.ts, schemas.ts e resumo-da-fila.ts, e as leituras da volta 0 listadas no plano]
status: pronto
proximo: engenheiro-backend
devolvido_para: null
---
## Entrega

- Plano: `/home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md`
- Tarefas: `/home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0016-v1/tarefas.json`
  (20 tarefas, na ordem do plano; `construir.mjs tarefas` respondeu `ok: true`)

### Volta 3: o que mudou por causa da devolução da 06-T07

A 06-T07-construcao devolveu porque a T07 não fechava verde dentro da lista Pode do `engenheiro-dados-bd`. Conferi no
ramo: o `pnpm typecheck` tem os 4 erros nos ajudantes `demanda` do painel, e as listas de `demandas.test.ts:223` e `:394`
e a guarda de `entrada-qa.test.ts:163` esperam o item sem `origem`. `vistas-para-agente.test.ts` cobre ESP, RSK e DEC,
não a fila: a linha da G5 estava errada.

**Decisão do nome (D-22): opção (a), a chave continua `origem`.** A guarda de `entrada-qa.test.ts:163` é trocada, e a
nova é mais forte que a atual:

| | Guarda de hoje (linha 163) | Guarda nova (D-22) |
|---|---|---|
| O que confere | só que não existe a chave `origem` | (1) as chaves do item são exatamente as nove da fila, em lista fechada; (2) `item.origem` vale exatamente `'pessoa'` |
| A origem da entrada bruta (`{ canal, referencia }`) sob `origem` | barra | barra: o valor tem de ser a string `'pessoa'` |
| A mesma origem sob outro nome (`canal`, `referencia`, `entradaBruta`, um `...objeto`) | **não barra** | barra: a lista é fechada |
| A referência (sentinela de e-mail) em qualquer lugar do corpo | `contemSentinela` da linha 164 | o mesmo `contemSentinela`, que não muda |

As linhas 162 (`texto`) e 164 (`contemSentinela`) ficam. A linha 163 vira duas asserções, e o arquivo fica com uma linha
`expect(` a mais. O código das três linhas está no passo 3b da T07.

Por que não a opção (b): o nome `origem` está no 02, no 03, no 04 (C06, "`origem` na listagem do agente: aceito,
enumeração sem dado pessoal") e no T16, e é o nome do parâmetro `?origem=` do RF-10. Dar outro nome só ao item criaria duas
palavras para a mesma coisa na API dos agentes. Também obrigaria a refazer o código e os testes já conferidos no ramo, e
a guarda de hoje continuaria sem barrar a mesma fuga sob outro nome.

**Quem edita (D-23): a T07 passa ao `engenheiro-backend`, com `risco: alto`.**
- A lista Pode do backend cobre `src/` inteiro e `test/`.
- O que falta é editar seis testes: os quatro ajudantes `demanda` do painel (com `origem: 'pessoa'` antes do `...extra`),
  as duas listas de `demandas.test.ts` e a guarda de `entrada-qa.test.ts`.
- A parte de banco já está pronta no ramo (commits 7c8c206 e 4306728) e não muda: a consulta, a condição e o `EXPLAIN` em
  `demanda_autor_criada_idx`.
- Dividir a tarefa deixaria uma delas vermelha no fim, contra o G3.1.
- O risco sobe porque a tarefa troca uma asserção numa guarda de vazamento de dado de terceiro. A fase 2 já tinha tarefa
  `alto`, então o modo `por_risco` não ganha parada nova.

**Plano alterado:**
- G5: tirei `vistas-para-agente.test.ts` (marcado "não muda", com a razão). Entraram com a linha e a mudança exatas:
  `consultas.test.ts:118` (já feito), `demandas.test.ts:223` e `:394`, `entrada-qa.test.ts:163` e os quatro testes do
  painel.
- G6: D-22 e D-23.
- G7: `condicaoDaOrigem` e a nota de `DemandaResumo.origem`.
- Cobertura: IN-16 ganha a T07.
- T07:
  - engenheiro, risco e "Cobre" novos;
  - um bloco "Estado no ramo", com o que já está feito, as 3 falhas e os 4 erros de hoje;
  - a lista de arquivos separada entre "já no ramo", "modificar" e "não muda";
  - os passos 1 a 3 marcados como feitos, com o commit (sem caixa marcada);
  - passo 3a, que mostra o vermelho antes de editar;
  - passo 3b, com o código exato das edições e as regras: nenhuma outra asserção sai, os títulos ficam, e outro teste
    vermelho devolve ao `05-plano`;
  - passo 4, que acrescenta a contagem de `expect(` antes e depois dos três testes e o `git diff 59ddf37 --stat` restrito
    ao código.

`tarefas.json`: a T07 fica com `engenheiro-backend` e `risco: alto`. A ordem e as outras 19 linhas não mudam.

### Fases e tarefas

| Fase | Tarefas | Engenheiro | Risco |
|---|---|---|---|
| 1. Fundação (antes de qualquer rota aceitar integração) | T01 esquema e migration `0007` aditiva; T02 tipo `integracao` e ramos exaustivos (IN-02); T03 token de integração, matriz fechada e matriz × rotas (IN-01, IN-03, piso do IN-16); T04 limite por integração e tempo limite (IN-09, IN-14, ADR-28) | T01 dados-bd; T02 a T04 backend | alto |
| 2. Awave | T05 leitura só da própria demanda em seis chaves (IN-08); T06 criação com autoria, lista de campos, sem disparo, limite de 10 e contrato do Awave (IN-05); T07 origem na leitura, listagem e filtro, com a guarda da entrada bruta em lista fechada (D-22) | backend (T07 passou do dados-bd ao backend, D-23) | alto |
| 3. Confirmação | T08 confirmação por pessoa (Server Action no `acoes.ts` de hoje), gatilho e worker sem agente antes da confirmação (IN-06, IN-07) | backend | alto |
| 4. Construir | T09 `conferirEMontarPedido` extraído da geração (bytes iguais por construção); T10 leituras do pedido no histórico com plano de execução (pendentes, gerado, entregues, recebido); T11 entrega e rota de pendentes; T12 recebimento; T13 sentinelas e log das integrações | T10 dados-bd; resto backend | alto (T13 baixo) |
| 5. Scripts e seed | T14 `--integracao` nos scripts de token e teste de documentação sem token; T15 seed com três demandas do Awave e dois pedidos (um a buscar, um já recebido), sem token | backend | alto (T15 baixo) |
| 6. Painel | T16 fila com origem e filtro; T17 regras de exibição (confirmação, selo, Próxima ação linha 14); T18 detalhe da demanda com a seção "Confirmação do Awave"; T19 "Recebido pelo /construir em …" e o texto novo da seção do pedido; T20 e2e das integrações contra o build de produção, tokens do e2e local, versão 0.3.0 e e2e três vezes | frontend | baixo |

### Fora das tarefas da 06 (G2 do plano)

- `07-qa-funcional`: foco, teclado, leitura e estados da 5.4 da 03 à mão.
- `08-revisao`: `/security-review` com foco em matriz, vistas por ator, gatilhos e entrega; `pnpm audit --prod
  --audit-level high`; G4 e piso do IN-16 de novo.
- `09-entrega`: `docker build`, CI, homologação, ensaio de rollback (`alteram_dado = false`), V-01 (o
  `buscar-pedidos.mjs` contra a homologação) e V-02 (POST do Awave sem `Origin`), RNF-01 e RNF-02 medidos.
- `10-documentacao`: CHANGELOG 0.3.0, manual técnico (cap. 01, 02, 03, 05, 08, 09, 10), `docs/operacao/` com emissão,
  troca (12 meses, P-04) e revogação dos dois tokens e onde cada um mora (IN-18), linha nova do procedimento de volta.
- Fabiano, depois do merge: deploy com a `0007` no passo separado e backup (snapshot com o risco atual de congelar a
  VPS), tokens de produção, `orquestrador.json` ligado, teste pela rede interna.

## Decisões tomadas

- D-22: a chave do item continua `origem`, e a guarda de `entrada-qa.test.ts:163` vira lista fechada mais valor exato. O
  nome é o do 02, 03, 04 e T16 e o do parâmetro da URL, e a guarda nova barra tudo o que a de hoje barra e também a
  fuga sob outro nome.
- D-23: a T07 passa ao `engenheiro-backend` com `risco: alto`. É o único engenheiro cuja lista Pode cobre os testes de
  `src/app/` que precisam mudar, e a troca de asserção em guarda de dado de terceiro pede a revisão mais atenta.
- G5 corrigida: `vistas-para-agente.test.ts` não muda, porque não tem lista de chaves da fila. A lista certa está em
  `demandas.test.ts`, e a G5 agora dá linha e mudança de cada arquivo.
- O código dos passos 1 a 3 da T07 fica como está no ramo. Já foi visto falhando e depois verde (21 de 21), com o
  `EXPLAIN`, e refazê-lo só repetiria trabalho conferido.
- As decisões D-01 a D-21 da volta 0 seguem valendo, sem mudança (G6 do plano).

## Pendências

- Nenhuma bloqueia o plano.
- Para a próxima `06-T07-construcao` (engenheiro-backend): só os passos 3a, 3b e 4 da T07. O ramo está vermelho até lá
  (3 testes e 4 erros de tipo), como a devolução registrou.
- Para a `06-T07-revisao`:
  - conferir que a linha 163 de `entrada-qa.test.ts` virou as duas asserções do passo 3b e que as linhas 162 e 164
    ficaram;
  - conferir que nenhuma outra asserção de `src/app/` saiu;
  - G4 vazio.
- Para a `09-entrega`: montar a V-01 e a V-02 como no fim do plano; medir o RNF-01 pela D-21.
- Para a `10-documentacao`: o texto do IN-18 e a periodicidade de 12 meses (P-04); o registro de que o título de
  demanda do Awave não deve levar nome de pessoa (spec 7.2); a chave `origem` no item de `GET /api/demandas` (cap. 05).
- Herdadas, sem mudança:
  - aceite formal de riscos residuais (P-04, já aceito por Fabiano em 11/11, a registrar com `gestao-riscos`);
  - rede própria do Easypanel (`seguranca-informacao`);
  - retenção do texto do Awave (`juridico-contratos`);
  - `pnpm audit` sem `--prod` e as 5 moderadas (0015);
  - atualizar o `padrao-tecnico.md` para as versões do ADR-29.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -15` — os commits da T07 (7c8c206, b5b347c, 4306728) sobre a 06-T06-testes (59ddf37)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — árvore limpa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 59ddf37 HEAD` — a T07 mudou `schemas.ts`, `consultas.ts`, `resumo-da-fila.ts`, `consultas.test.ts` e criou `origem.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 59ddf37 HEAD -- src/modules/demandas/consultas.ts src/modules/demandas/consultas.test.ts src/modules/demandas/schemas.ts src/modules/demandas/resumo-da-fila.ts` — o código da T07 no ramo
- `node /home/deploy/servidor/projetos/estruturaAutonoma/ferramentas/construir/construir.mjs tarefas /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0016-v1/tarefas.json` — `{ "ok": true, "erros": [] }`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — 4 erros, só nos ajudantes `demanda` de `fila.test.ts:43`, `fila-qa.test.ts:64`, `fila-a1.test.ts:35` e `fila-a1-qa.test.ts:27`, como a devolução disse

## Critério de pronto atendido

- [x] (05) cada RF de 01 e cada controle de 04 é coberto por ao menos uma tarefa
- [x] (05) cada tarefa do plano começa pelo teste que falha
- [x] (05) `tarefas.json` passa em `construir.mjs tarefas` e tem as tarefas do plano, na mesma ordem
- [x] (05) toda tarefa tem `risco`, pela regra da Entrega
