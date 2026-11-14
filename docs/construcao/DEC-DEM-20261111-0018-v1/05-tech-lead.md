---
pedido: DEC-DEM-20261111-0018-v1
etapa: 05-plano
agente: tech-lead
leu: [pedido.json, docs/superpowers/specs/2026-11-13-ws-orquestrador-demandas-sobras-design.md, parada-P1.md, passagens.jsonl, 01-analista-requisitos.md, 02-arquiteto-solucoes.md, 03-ux-ui-design.md, 04-seguranca-aplicacao.md, padrao-tecnico.md, contrato-passagem.md, .claude/agents/engenheiro-backend.md, .claude/agents/engenheiro-frontend.md, .claude/agents/engenheiro-dados-bd.md (listas Pode), docs/construcao/DEC-DEM-20261111-0017-v1/05-tech-lead.md, docs/construcao/DEC-DEM-20261111-0017-v1/tarefas.json, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (linhas 1 a 660, 2040 a 2210 e 2700 a 2772), src/modules/acesso/matriz.ts, src/modules/acesso/matriz.test.ts (25 a 104), src/modules/pacotes-decisao/substituido.ts, src/modules/pacotes-decisao/desatualizado.ts, src/modules/pacotes-decisao/decidir.ts, src/modules/pacotes-decisao/decidir.test.ts (436 a 451), src/modules/pacotes-decisao/criar.ts, src/modules/pacotes-decisao/substituicao.test.ts, src/modules/pedido-construcao/conferir.ts, src/modules/pedido-construcao/montar.ts, src/modules/pedido-construcao/gerar.test.ts (300 a 339), src/modules/demandas/transicoes.ts, src/modules/demandas/servico.test.ts (400 a 479), src/modules/andamento/registrar.ts, src/modules/andamento/consultas.ts, src/modules/andamento/consultas.test.ts (1 a 60 e 140 a 229), src/modules/integracoes/tempo-limite.ts, src/modules/integracoes/prazo-total-0019.test.ts (1 a 70), src/lib/rota.ts, src/lib/deps-qa.test.ts, src/db/schema/decisao.ts, src/components/dados-da-decisao.ts, src/components/dados-das-etapas.ts, src/components/dados-do-pedido.ts (1 a 118), src/app/(painel)/pacotes-decisao/[decId]/page.tsx, src/app/(painel)/pacotes-decisao/[decId]/FormularioDecisao.tsx (40 a 79 e 190 a 219), src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts (1 a 120), src/app/(painel)/demandas/[id]/page.tsx (385 a 444), src/app/api/pedidos-construcao/andamento.test.ts (1 a 200), test/pedidos-construcao.ts (56 a 185), test/banco.ts, test/matriz-rotas.test.ts (1 a 115), test/estatico/andamento.test.ts, test/estatico/piso-de-assercoes.test.ts, test/estatico/decisao-e2e.test.ts (120 a 159), e2e/decisao.spec.ts (440 a 489), e2e/decisao-botoes.spec.ts (265 a 294), scripts/seed-ficticio.ts (80 a 111, 165 a 370 e 380 a 669), vitest.config.ts, 06-T07-engenheiro-dados-bd.md, tarefas.json, src/app/(painel)/demandas/fila-andamento.test.ts (168 a 234), src/modules/andamento/consultas.ts (árvore em 27b117d)]
status: bloqueado
proximo: maestro
devolvido_para: null
---
## Entrega

- Plano: `/home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md`
- Tarefas: `/home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0018-v1/tarefas.json`
  (14 tarefas, na ordem do plano; `construir.mjs tarefas` respondeu `{ "ok": true, "erros": [] }`, de novo nesta volta)

### Volta de 14/11: T07 devolvida pela `06-T07-construcao` (ajuste mínimo)

Motivo: a troca para `crossJoinLateral` quebra o dublê `dbCom` de `src/app/(painel)/demandas/fila-andamento.test.ts`
(linhas 193 a 198, preso à cadeia `selectDistinctOn … orderBy`); o arquivo estava fora da lista Pode do
`engenheiro-dados-bd` e fora da G5, e o `pnpm test` ficou com 1 falha (8128 de 8129). A consulta nova está no ramo
(commit `27b117d`) e passa em `consultas.test.ts` (17 de 17).

O que mudou (só isto; T01 a T06 e T08 a T14 intocadas):
- **`tarefas.json`:** a T07 passa de `engenheiro-dados-bd` a `engenheiro-backend` (lista Pode com `src/` inteiro e
  `test/`). Mesmo id, título, fase, risco (`baixo`) e posição. `construir.mjs tarefas`: `{ "ok": true, "erros": [] }`.
- **Plano, G1:** a T07 sai das tarefas do dados-bd (fica só a T03) e entra a linha que diz por que ela é do backend.
- **Plano, G5:** duas linhas novas, ambas da T07. `fila-andamento.test.ts`: **só de forma**, troca o dublê `dbCom` e o
  comentário dele, sem mudar nem tirar asserção (linhas 200 a 232), sem mexer em `dbQueFalha`, com a contagem de
  `expect(` igual à de `41108ee`. `consultas.test.ts`: título e uma asserção a mais no teste da página, como o passo 1
  da T07 já mandava (a revisão da T07 apontou que ele não estava na G5).
- **Plano, T07:** engenheiro, arquivos (com `fila-andamento.test.ts` e o `-qa` em "Não muda"), um parágrafo com o que
  a primeira passagem provou, passos 1 a 3 marcados como feitos em `27b117d`, e o **passo 3b** novo: ver falhar
  `fila-andamento.test.ts:222` no ramo como está, trocar o dublê (código no plano, o proposto pela entrega da
  `06-T07-construcao`), ver passar, e provar a contagem de `expect(` igual. O passo 4 pede o `git diff --stat` da
  passagem só com esse arquivo.
- **Desvio aceito:** `sortsSobreAndamento` filtra `['Sort', 'Incremental Sort']` (o código do passo 1 no plano foi
  atualizado). Com `=== 'Sort'`, a asserção do CA-07.2 passava com o código antigo; o desvio endurece o teste.

### Fases e tarefas

| Fase | Tarefas | Engenheiro | Risco |
|---|---|---|---|
| 1. Situação do pedido (S-02) | T01: ação `ler_situacao_pedido` só do `construir`, com pares exatos (sete), cinco ações do `construir` e duas do `awave`, e o teste estático da citação (SB-01). T02: serviço `situacaoDoPedido` e rota `GET .../situacao`, com 404 idêntico byte a byte e o mesmo número de consultas nos três casos, 403 sem chamar o serviço (serviço trocado), nada gravado, sem trava, prazo total com relógio falso, sentinelas e o teste "rota `substituido` se e só se o andamento dá 409 `decSubstituido`" (SB-02 a SB-06) | backend | alto |
| 2. D1 com o nome da criação (S-03) | T03: coluna `caminhos_com_nome_na_criacao text[]` e migration `0010` gerada, sem custom e sem GRANT (SB-10, SB-07 d). T04: `textosDaCriacao` pela mesma função de `textosDoPedido`, teste de **igualdade**, marcação na criação pelos três caminhos (pessoa, agente, worker) com a coluna não nula, concorrência criação × troca do nome e varredura das vistas a partir da `MATRIZ` (SB-07, SB-08 c e f, SB-09 a e b). T05: o D1 com o OU, falha fechada (500 sem o valor) e sentinelas do nome (SB-08, SB-09 c e d) | T03 dados-bd; T04 e T05 backend | alto |
| 3. Arquivamento (S-04) | T06: `destinoDoArquivamento` (9 × 3, `switch` com `never`), `vigenteDaDemanda`, `mudarStatusPorArquivamento` e `decidir.ts` sob a trava; CA-03.1 a CA-03.5, 7.1 (Em análise), concorrência × ESP nova nas duas ordens e × mudança manual 50 vezes (SB-11) | backend | alto |
| 4. Fila (B-08-1) | T07: `andamentosDasDemandas` por `crossJoinLateral`, sem `Sort` nem `Incremental Sort` sobre `andamento_construcao`, no máximo uma linha lida por demanda, as sete chaves e id malicioso (SB-13); o dublê `dbCom` de `fila-andamento.test.ts` acompanha a cadeia nova, só de forma | backend (era dados-bd; volta de 14/11) | baixo |
| 5. Teste instável e piso | T08: C-27 com o diagnóstico antes da correção, as correções aceitas pela causa (só `client backend`; espera por tentativas contadas), a prova negativa permanente com o migrator e 20 execuções (SB-14). T09: `registrar-qa.test.ts` e os testes de segurança da 0.3.x e da 0.4.0 no piso, mais o teste de que o piso só sobe (SB-15) | backend | T08 alto; T09 baixo |
| 6. Seed | T10: quatro demandas fictícias da vigência pela conta `configurar2fa` (limite C-36) | backend | baixo |
| 7. Painel | T11: textos revistos da 03 (substituído, 409s, histórico, linha 6 por nível) e o "Arquivar" do e2e numa demanda sem vigente. T12: avisos (a), (b), (c), dica e chegada do Arquivar, com o teste de oráculo da leitura nova (SB-12). T13: barra de etapas e Próxima ação da T05 com o DEC mais novo arquivado. T14: e2e da vigência (três avisos, arquivar com vigente, axe nas duas larguras) e versão 0.4.1 | frontend | baixo |

O plano traz: a regra de comando para o prompt de cada tarefa (G0); as listas Pode por engenheiro e o que delas decorre
(G1); o que fica para 07, 08, 09, 10, Fabiano e a outra frente (G2); as regras de código, com a visibilidade e o teste
de oráculo de toda leitura nova e o piso na própria tarefa (G3); as superfícies congeladas com o comando do
`git diff 41108ee` (G4, SB-16); os testes existentes que mudam, arquivo a arquivo (G5); as decisões D-01 a D-18 (G6); os
nomes compartilhados (G7); o inventário do SB-11 (G8); as leituras novas com a regra de visibilidade de cada uma (G9); a
cobertura de cada RF e de cada SB (G10); e a verificação na homologação para a 09 (ensaio, RNF-01, RNF-05).

### Respostas às pendências da spec (7.4) para esta etapa

- **Inventário do SB-11:** G8 do plano, com 11 caminhos e a trava de cada um.
- **Testes estáticos do SB-01, do SB-03 e do SB-04:** `test/estatico/situacao.test.ts`, criado na T01 e ampliado na T02
  (D-06).
- **Contagem de consultas:** no 403, o serviço trocado por um que falha se chamado; nos três 404, `vi.spyOn(pg.Client
  .prototype, 'query')` com os três números iguais (D-07). O logger do Drizzle da `deps` não alcança o `Db` da transação
  de `executarComOrcamento`.
- **Junção lateral tipada do Drizzle 0.45.3:** não conferida. O pacote instalado não é rastreado pelo git, e a lista
  Pode desta etapa não lê o `node_modules`. A T07 usa `crossJoinLateral`, e o `pnpm typecheck` dela confirma. Se o
  método não existir, a tarefa volta ao `05-plano`, sem trocar a guarda que proíbe o `sql` em `consultas.ts` (D-08).
  **Conferida na `06-T07-construcao`:** o método existe (`pnpm typecheck` limpo em `27b117d`).
- **`chegadaNaDecisao` e `orientacaoDoPedido`:** a chegada recebe `{ statusDaDemanda, vigente }`. A orientação recebe o
  nível, com padrão `cto` (D-09).
- **Testes que mudam de sentido (SB-16):** G5. Só os quatro tipos aprovados pela 04, mais duas mudanças sem perda de
  asserção: a linha `decisao_arquivada` de `servico.test.ts` e a demanda do "Arquivar" do e2e (Pendências).

## Decisões tomadas

- D-01 a D-18 estão na G6 do plano, cada uma com a razão. As que mais pesam:
- D-03: risco `alto` onde a 04 manda (T01 a T06 e T08), mesmo na T03, que pela regra geral seria `medio`. Assim o modo
  `por_risco` para antes das fases 1 a 3 e 5.
- D-04: `descricaoSemRotulos` passa para `conteudo.ts`, porque `criar.ts` e `montar.ts` passariam a se importar em
  ciclo. `criar.ts` reexporta, e os testes de hoje não mudam.
- D-08: a fila por `crossJoinLateral` mantém intacta a guarda estática de só leitura de `consultas.ts`.
- D-14: a linha 6 da Próxima ação com o DEC arquivado vale só em `nova` e `em_analise`. Do jeito que a 03 escreveu
  ("fora de status final"), ela tiraria a linha 10, que já é a certa com o destino Aprovada.
- D-15: a autora das quatro demandas novas do seed é a conta `configurar2fa`. A `sem2fa` já cria 28 das 30 demandas por
  hora (C-36), e a "cto" e a "administradora" gastam o limite delas nas specs.
- D-16: as 20 execuções do C-27 são de `pnpm test src/lib src/db` (o arquivo junto com uns 40 que criam banco), sempre
  com comandos da lista Pode. Isso segue a decisão 10 da P1.
- D-17: o RNF-05 é medido na 09, na `main` e no ramo, e não vira p95 novo na suíte. `leitura.test.ts` já é instável
  sob carga. Na T07, a prova é o plano da consulta.
- T07 ao `engenheiro-backend` (volta de 14/11): é o único caminho dentro das listas Pode. "Registrar o arquivo na
  tarefa do dados-bd" não basta, porque a lista Pode dele não tem `src/app/`, e o plano não pode ampliar lista Pode.
  Dividir em duas tarefas mudaria a numeração e a ordem do `tarefas.json` já em execução; trocar o engenheiro da T07
  não mexe em nenhuma outra linha.
- O dublê muda, a consulta não: moldar `andamentosDasDemandas` à cadeia antiga do dublê trocaria a prova pelo teste
  (mesma razão da entrega da `06-T07-construcao`). A mudança é de forma: as asserções do arquivo e `dbQueFalha` ficam.
- Desvio 1 da `06-T07-construcao` aceito no plano: `Incremental Sort` conta como Sort no CA-07.2, porque é o nó que o
  `distinct on` gera sobre o índice (demanda_id, id); sem isso o teste novo não falhava antes do código.
- e2e do "Arquivar" (G5): na ordem de `e2e/decisao.spec.ts`, a demanda `decisao` já tem um aprovado vigente
  desatualizado quando o teste roda. Pela 7.1, ela iria a Em análise. Por isso o teste passa a usar uma demanda do seed
  sem DEC aprovado. O título, o alerta, as três conferências e o axe ficam iguais, e `test/estatico/decisao-e2e.test.ts`
  (piso 37) não muda.

## Pendências

- Comando só de leitura fora da lista Pode nesta volta: `git -C /home/deploy/servidor/projetos/estruturaAutonoma grep -n -A12 "^\*\*Pode:\*\*" -- .claude/agents/engenheiro-dados-bd.md .claude/agents/engenheiro-backend.md` (`-C` em repositório que não é o do sistema), para ler as listas Pode dos dois engenheiros; a leitura em si está na lista ("ler os arquivos que o git rastreia … na estruturaAutonoma"), a forma do comando não. Nada foi alterado por ele; o plano, o `tarefas.json` e esta entrega estão completos e só esperam a liberação.
- Leituras fora da lista Pode da primeira passagem liberadas pelo maestro pela regra de 25/10 em 14/11 00h04 UTC (registro da 05-plano)
- Para a `06-T07-construcao` (`engenheiro-backend`): o código da consulta e dos testes de `consultas.test.ts` já está
  no ramo (`27b117d`); a passagem faz só o passo 3b e o passo 4 da T07. Repita a regra de comando G0 no prompt.
- Para a `06-T07-revisao`: revisar a T07 inteira (`27b117d` mais o commit da passagem nova): G4 vazio, o diff parcial
  de `consultas.ts`, `fila-andamento.test.ts` só com o dublê (contagem de `expect(` igual à de `41108ee`) e
  `consultas.test.ts` no `PISO` com 38.
- Para a `08-revisao` ratificar (G5): a linha `decisao_arquivada` sai do `it.each` de `mudarStatusPeloSistema` em
  `src/modules/demandas/servico.test.ts` (piso 77). É mudança de forma: a expectativa passa, igual, para a coluna
  `nenhum` de `arquivamento-status.test.ts`, e a contagem de `expect(` não cai. Ela vem da ADR-38 (`decisao_arquivada`
  sai de `AUTOMATICAS`) e não está entre as quatro mudanças aprovadas de antemão pelo SB-16.
- Para a `06-T07-construcao`: confirmar `crossJoinLateral` no Drizzle 0.45.3 instalado (D-08).
- Para a `06-T08-construcao`: a seção **Causa** vem antes da correção. Se o diagnóstico mostrar uma sessão de cliente
  com outro papel, a tarefa para e volta ao `05-plano`.
- Para a `06-T09-testes` (qa-automacao): conferir a tabela de candidatos da T09 (CA-08.2), inclusive os que o plano
  propõe deixar fora do piso.
- Para a `06-Tnn-revisao` de toda tarefa: G4 vazio, os diffs parciais da G4 e a contagem de `expect(` por arquivo do
  `PISO` contra `41108ee`.
- Para a `09-entrega`: o ensaio de rollback (`volta_sem_restaurar: false` esperado), o RNF-01 com o token emitido
  dentro da homologação e o RNF-05 na `main` e no ramo, como no fim do plano.
- Para a `10-documentacao`: o CHANGELOG 0.4.1 (com a causa do C-27 da entrega da T08), a spec (RF-07, RF-13, RF-22 e a
  rota na spec das integrações), os caps. 01, 02, 03, 04, 05, 08 e 09, o glossário e `tokens-de-integracao.md` (SB-17),
  como na G2.
- Herdadas da spec, com Fabiano e fora do `/construir`: o aceite do risco residual com a `gestao-riscos` (7.2, item 11);
  backup, migration `0010` e deploy depois do merge; o lado do `/construir` (outra frente), com o cliente falhando
  fechado.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0018-v1` — as entregas 01 a 04, a P1, `passagens.jsonl` e `pedido.json`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "" -- docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md docs/construcao/DEC-DEM-20261111-0017-v1/tarefas.json docs/construcao/DEC-DEM-20261111-0017-v1/05-tech-lead.md` — tamanho do plano do 0017
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^## \|^### " -- docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md` — seções do plano do 0017
- `git -C /home/deploy/servidor/projetos/estruturaAutonoma grep -n -A12 "^\*\*Pode:\*\*" -- .claude/agents/engenheiro-backend.md .claude/agents/engenheiro-frontend.md .claude/agents/engenheiro-dados-bd.md` — **fora da lista Pode** (`-C` em repositório que não é o do sistema); só leu as listas Pode dos engenheiros (primeira linha de Pendências)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261111-0018-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -12` — base `41108ee` (0.4.0) e as passagens 00 a P1
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "decisao_arquivada" -- src test e2e scripts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "encerrada" -- src/modules/pacotes-decisao`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "dicaArquivar\|consequencia-arquivar\|ContextoDoFormulario\|destino" -- "src/app/(painel)/pacotes-decisao/[decId]/FormularioDecisao.tsx"`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export" -- src/modules/pedido-construcao/pendentes.ts src/modules/integracoes/tempo-limite.ts src/lib/rota.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "logQuery\|consultasGeradas\|contarConsultas\|spyOn(.*pool" -- test src`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export \|^    [a-zA-Z]*: (\|^  [a-zA-Z]*: (\|rotaAndamento\|import " -- test/pedidos-construcao.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" -- src/modules/andamento/registrar-qa.test.ts src/lib/deps-qa.test.ts src/modules/acesso/matriz-integracoes.test.ts src/modules/acesso/matriz-integracoes-qa.test.ts src/modules/acesso/ramos-por-ator.test.ts src/modules/acesso/ramos-por-ator-qa.test.ts src/modules/acesso/tokens-integracao.test.ts src/modules/acesso/tokens-integracao-qa.test.ts src/modules/acesso/tokens-integracao-corrompido.test.ts test/matriz-rotas-integracoes-qa.test.ts src/app/api/pedidos-construcao/entrega.test.ts src/app/api/pedidos-construcao/entrega-qa.test.ts src/app/api/pedidos-construcao/recebimento.test.ts src/app/api/pedidos-construcao/recebimento-qa.test.ts src/app/api/pedidos-construcao/log-das-integracoes.test.ts src/app/api/pedidos-construcao/saidas-das-integracoes-qa.test.ts src/modules/pedido-construcao/recebimento-0019.test.ts src/app/api/demandas/visibilidade-agente-0019.test.ts src/app/api/demandas/criacao-awave-0019.test.ts src/app/api/pacotes-decisao/visibilidade-0019.test.ts src/modules/demandas/confirmacao-0019.test.ts src/modules/demandas/autor-desconhecido-0019.test.ts src/modules/integracoes/prazo-total-0019.test.ts src/modules/limites-integracao.test.ts src/modules/limites-integracao-qa.test.ts src/db/schema/integracao.test.ts src/db/schema/integracao-qa.test.ts src/modules/historico/consultas-integracao.test.ts src/modules/historico/consultas-integracao-qa.test.ts test/estatico/trace-e2e.test.ts e2e/integracoes.spec.ts e2e/integracoes-qa.spec.ts` — contagens da T09
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "registrar_andamento\|toHaveLength(2[0-9])\|24 ações\|quatro\|os seis\|- 6" -- src/modules/acesso/matriz.test.ts src/modules/acesso/matriz-integracoes.test.ts src/modules/acesso/matriz-integracoes-qa.test.ts src/modules/acesso/matriz-andamento.test.ts src/modules/acesso/matriz-andamento-qa.test.ts src/modules/acesso/matriz-qa.test.ts test/estatico/andamento.test.ts test/estatico/andamento-qa.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "ACOES\b.*length\|toHaveLength\|ações" -- src/modules/acesso/matriz.test.ts src/modules/acesso/matriz-qa.test.ts src/modules/acesso/matriz-integracoes.test.ts src/modules/acesso/ramos-por-ator.test.ts src/modules/acesso/ramos-por-ator-qa.test.ts test/matriz-rotas.test.ts test/matriz-rotas-integracoes-qa.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "toHaveLength(\|\.length)\.toBe(\|listar_pedidos_pendentes" -- src/modules/acesso/matriz-qa.test.ts src/modules/acesso/ramos-por-ator.test.ts src/modules/acesso/ramos-por-ator-qa.test.ts src/modules/acesso/matriz-andamento-qa.test.ts test/matriz-rotas-integracoes-qa.test.ts test/estatico/andamento-qa.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "andamento/route.ts\|recebimento/route.ts" -- test src e2e`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "pedidos-construcao/\[decId\]" -- test/transversal test/estatico src/app/api/pedidos-construcao/log-das-integracoes.test.ts docs/operacao/tokens-de-integracao.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "from './" -- test/estatico/andamento-qa.test.ts test/estatico/dados-do-andamento.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -ln "src/components" -- test/estatico`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "dados-da-decisao\|modules/\|import type\|soTipo" -- test/estatico/painel-qa.test.ts test/estatico/dados-das-etapas.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "insert(pacoteDecisao)\|into pacote_decisao" -- src scripts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "entries\|at(-1)" -- test/estatico test/migracao src/db`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files -- drizzle` — migrations `0000` a `0009`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "execucao_agente_id\|execucaoAgenteId" -- src/db/schema/dominio.test.ts src/db/privilegios.test.ts src/db/imutabilidade.test.ts src/app/api/vistas-para-agente.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "pacote_decisao" -- src/db/schema/dominio.test.ts src/db/imutabilidade.test.ts src/db/privilegios.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "criteriosAceitePreliminares\|definicaoDePronto\|LIMITE_ITENS\|\.max(" -- src/modules/especificacoes/schemas.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "strictObject\|criarPacoteDecisaoSchema =" -- src/modules/pacotes-decisao/schemas.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "listaDeTextos =\|LIMITE_DA_LISTA\|const listaDeTextos" -- src/modules`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "LIMITE_ITENS =" -- src/modules`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "no-cycle\|import/" -- eslint.config.mjs` — sem saída
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "import " -- src/modules/pedido-construcao/conteudo.ts src/modules/dados-pessoais/minimizar.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "andamento" -- test/desempenho`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "maxWorkers\|minWorkers\|pool:\|fileParallelism\|retry\|testTimeout\|hookTimeout\|maxConcurrency" -- vitest.config.ts .github/workflows/ci.yml`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "pnpm\|run:" -- .github/workflows/ci.yml`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files -- src/lib src/db`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export \|linha 6\|linha 13\|linha 10\|arquivada\|vigenteDe\|maisNovo\|Montar o pacote" -- src/components/dados-das-etapas.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A12 "^export type PacoteResumo" -- src/modules/demandas/consultas.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "decMaisNovo\|etapasDaDemanda\|proximaAcao\|lerPacoteDaPagina\|obterPacoteDecisao" -- "src/app/(painel)/demandas/[id]"`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "ORIENTACAO\|orientacaoDoPedido\|aviso:" -- src/components/dados-do-pedido.ts "src/app/(painel)/pacotes-decisao/[decId]/SecaoPedido.tsx"`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -B2 -A6 "pacote_decisao_substituido\|SELO_SUBSTITUIDO =" -- src/components/rotulos.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "SELO_SUBSTITUIDO" -- src/components/rotulos.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "erroDoPedido\|orientacaoDoPedido\|MENSAGENS_PEDIDO_DO_SERVIDOR =" -- src`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "nivelMenorQueOVigente\|substituido(\|abrirSubstituto\|foi substituído por\|aprovado depois\|o pacote aprovado mais novo substitui" -- src e2e test` — os testes de texto da G5
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^export \|^async function \|^function \|andamentoParaEnviar\|TOTAL_DEMANDAS_DO_SEED" -- scripts/seed-ficticio.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "titulo: TITULOS_DO_E2E\.\|^const DEMANDAS\|^const ANDAMENTOS\|DEMANDAS_DOS_PEDIDOS\b.*=\|DEMANDAS_DO_AWAVE\b.*=" -- scripts/seed-ficticio.ts` — 28 demandas da `sem2fa` (D-15)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A8 "LIMITE_POR_HORA" -- src/modules/limites.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "vai para Encerrada\|foi para Encerrada" -- e2e src test`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^test(\|^  test(\|demandaDoSeed(page, \|const TITULO\|ORIGENS_DO_FLUXO =" -- e2e/decisao.spec.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "fullyParallel\|workers\|retries\|timeout" -- playwright.config.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "'arquivada'\|Pacote arquivado\|botao(page, 'Arquivar').click" -- e2e`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export async function entrarComo\|export async function semViolacoes\|export async function demandaDoSeed\|export async function api\b\|export async function api<\|export const api\|export async function pacotes" -- e2e`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "travarDemanda(" -- src/modules scripts` — inventário da G8
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export function\|export const" -- src/modules/pacotes-decisao/desatualizado.ts src/modules/pacotes-decisao/consultas.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "async function obterPacoteDecisao\|expressaoDesatualizado\|^export type PacoteDecisaoVista\b" -- src/modules/pacotes-decisao/consultas.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "connect\|drizzle(\|criarDb\|export" -- src/db/transacao.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "it(\|spyOn\|performance" -- src/modules/andamento/registrar-prazo.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -l "D1 do 0013" -- "*.test.ts" "*.spec.ts"`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --diff-filter=A --name-only --format= 0ac099a..41108ee -- "*.test.ts" "*.spec.ts"` — testes criados na 0.4.0
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" -- src/lib/rota-corpo-invalido.test.ts src/modules/andamento/schemas.test.ts src/modules/andamento/regras.test.ts src/modules/demandas/transicoes-construir.test.ts e2e/andamento-construir.spec.ts test/estatico/migration-0008.test.ts src/modules/andamento/consultas.test.ts src/app/api/pedidos-construcao/andamento-qa.test.ts src/db/imutabilidade.test.ts src/modules/pacotes-decisao/substituicao.test.ts src/modules/pedido-construcao/conferir.test.ts src/modules/pacotes-decisao/criar.test.ts src/modules/pacotes-decisao/decidir.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export async function lerPacoteDaPagina\|export async function lerDemandaDaPagina" -- "src/app/(painel)"` — sem saída
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export const ROTULO_STATUS\|export const STATUS\b\|export const STATUS =" -- src/components/rotulos.ts src/modules/demandas/schemas.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "lerPacoteDaPagina\|lerDemandaDaPagina" -- "src/app/(painel)/pacotes-decisao/[decId]/pacote-da-pagina.ts" "src/app/(painel)/demandas/[id]/demanda-da-pagina.ts"`
- `node /home/deploy/servidor/projetos/estruturaAutonoma/ferramentas/construir/construir.mjs tarefas /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0018-v1/tarefas.json` — `{ "ok": true, "erros": [] }`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files -- test/estatico/docs-sem-token.test.ts`
- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0018-v1` — volta de 14/11: entregas até a `06-T07-engenheiro-dados-bd.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^## \|^### " -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md` — seções do plano
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "dbCom\|selectDistinctOn\|orderBy\|expect(\|describe(\|it(" -- "src/app/(painel)/demandas/fila-andamento.test.ts"` — o dublê e as asserções
- `git -C /home/deploy/servidor/projetos/estruturaAutonoma grep -n -A12 "^\*\*Pode:\*\*" -- .claude/agents/engenheiro-dados-bd.md .claude/agents/engenheiro-backend.md` — **fora da lista Pode** (`-C` em repositório que não é o do sistema); só leu as listas Pode (primeira linha de Pendências)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "fila-andamento" -- test/estatico/piso-de-assercoes.test.ts docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md` — fora do `PISO`; só a tabela de candidatos da T09
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — T07 em `27b117d`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 30b5197` — só `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 27b117d` — `consultas.ts`, `consultas.test.ts`, `piso-de-assercoes.test.ts` e a entrega
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "dados-bd\|T07" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md` — pontos do plano a ajustar
- `node /home/deploy/servidor/projetos/estruturaAutonoma/ferramentas/construir/construir.mjs tarefas /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0018-v1/tarefas.json` — `{ "ok": true, "erros": [] }`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — só `tarefas.json` e o plano

## Critério de pronto atendido

- [x] (05) cada RF de 01 e cada controle de 04 é coberto por ao menos uma tarefa (G10; RF-09 e SB-17 na `10-documentacao`, porque nenhum engenheiro da 06 edita `docs/`)
- [x] (05) cada tarefa do plano começa pelo teste que falha
- [x] (05) `tarefas.json` passa em `construir.mjs tarefas` e tem as tarefas do plano, na mesma ordem (T07 com `engenheiro-backend`, como o plano)
- [x] (05) toda tarefa tem `risco`, pela regra da Entrega (com a 04 subindo para `alto` onde manda, D-03)
