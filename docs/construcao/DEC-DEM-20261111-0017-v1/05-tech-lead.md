---
pedido: DEC-DEM-20261111-0017-v1
etapa: 05-plano
agente: tech-lead
leu: [pedido.json, docs/superpowers/specs/2026-11-12-ws-orquestrador-demandas-andamento-design.md, 01-analista-requisitos.md, 02-arquiteto-solucoes.md, 03-ux-ui-design.md, 04-seguranca-aplicacao.md, padrao-tecnico.md, contrato-passagem.md, .claude/agents/engenheiro-backend.md, .claude/agents/engenheiro-frontend.md, .claude/agents/engenheiro-dados-bd.md (listas Pode), docs/construcao/DEC-DEM-20261111-0016-v1/05-tech-lead.md, docs/construcao/DEC-DEM-20261111-0016-v1/tarefas.json, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (linhas 1 a 400), src/modules/acesso/matriz.ts, src/modules/acesso/matriz.test.ts, src/modules/acesso/matriz-integracoes.test.ts, src/modules/acesso/matriz-integracoes-qa.test.ts, src/modules/acesso/matriz-qa.test.ts, src/lib/rota.ts, src/lib/erros.ts, src/lib/corpo.ts, src/modules/integracoes/tempo-limite.ts, src/modules/integracoes/prazo-total-0019.test.ts, src/db/transacao.ts, src/modules/pedido-construcao/pendentes.ts, src/modules/pedido-construcao/receber.ts, src/modules/pedido-construcao/entregar.ts, src/modules/pedido-construcao/gerar.ts (1 a 80), src/app/api/pedidos-construcao/[decId]/recebimento/route.ts, src/app/api/pedidos-construcao/recebimento.test.ts (1 a 120), src/modules/limites.ts, src/modules/demandas/transicoes.ts, src/modules/demandas/servico.ts, src/modules/demandas/consultas.ts, src/modules/versoes.ts, src/modules/pacotes-decisao/substituido.ts, src/modules/historico/registrar.ts, src/modules/historico/consultas.ts, src/db/schema/historico.ts, src/db/schema/index.ts, src/db/schema/comum.ts, src/db/schema/decisao.ts, src/db/privilegios.ts, src/db/privilegios.test.ts, src/db/imutabilidade.test.ts, drizzle/0005_rls_privilegios_agentes.sql, drizzle/meta/_journal.json, test/banco.ts, test/deps.ts, test/integracoes.ts, test/pedidos-construcao.ts, test/requisicao.ts, test/matriz-rotas.test.ts, test/matriz-rotas-integracoes-qa.test.ts, test/transversal/sentinelas.test.ts (1 a 110), test/estatico/piso-de-assercoes.test.ts, test/estatico/migration-0007.test.ts, test/estatico/leituras-da-fila.test.ts, test/migracao/migration-0007-dados.test.ts (1 a 60), src/app/api/demandas/contrato-awave.test.ts, src/app/api/demandas/visibilidade-agente-0019.test.ts, src/components/dados-das-etapas.ts, src/components/rotulos.ts, src/app/(painel)/demandas/leituras-da-fila.ts, src/app/(painel)/demandas/page.tsx, src/app/(painel)/demandas/fila.tsx, src/app/(painel)/demandas/CartoesDaFila.tsx, src/app/(painel)/demandas/[id]/page.tsx, src/app/(painel)/demandas/[id]/detalhe.ts, src/app/(painel)/demandas/[id]/demanda-da-pagina.ts, src/app/(painel)/demandas/[id]/Historico.tsx, scripts/seed-ficticio.ts, e2e/integracoes.ts, e2e/integracoes.spec.ts (1 a 70), e2e/recebido-construir.spec.ts, e2e/fila-contadores.spec.ts (1 a 60), estruturaAutonoma/ferramentas/construir/enviar-andamento.mjs, estruturaAutonoma/ferramentas/construir/lib/andamento.mjs, estruturaAutonoma/ferramentas/construir/lib/buscar-pedidos.mjs (1 a 80)]
status: pronto
proximo: engenheiro-dados-bd
devolvido_para: null
---
## Entrega

- Plano: `/home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md`
- Tarefas: `/home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1/tarefas.json`
  (14 tarefas, na ordem do plano; `construir.mjs tarefas` respondeu `{ "ok": true, "erros": [] }`)

### Fases e tarefas

| Fase | Tarefas | Engenheiro | Risco |
|---|---|---|---|
| 1. Fundação (antes da rota e do serviço; 04, seção 6, item 2) | T01 tabela `andamento_construcao`, migrations `0008` (gerada) e `0009_rls_andamento_construcao` (só o `GRANT SELECT, INSERT`), privilégio e imutabilidade (AN-10); T02 ação `registrar_andamento` só do `construir`, pares exatos, quatro ações do `construir` e duas do `awave`, teste estático da citação (AN-01); T03 limite 60 por DEC e 600 no total, só o `construir` conta, trava própria (AN-07) | T01 dados-bd; T02 e T03 backend | alto |
| 2. Registro | T04 corpo fechado (`z.strictObject`, enumerações, 0 a 999) e 422 pelo `rota()` com `corpoInvalido` (AN-02); T05 regras puras, tabela 9 × 3 × tipo, transições do `construir` e o evento novo (AN-04, AN-11, AN-12); T06 leituras do andamento com `EXPLAIN`; T07 serviço `registrarAndamento` com 404 sem oráculo e vínculo DEC ↔ demanda, travas pedido → demanda → limite, idempotência, concorrência com duas transações e prazo total com gatilho de teste (AN-03 a AN-06, AN-08); T08 rota, contrato exato do `/construir`, 404 byte a byte, 403 dos outros atores, CA-12 pela rota, 422 sem consulta (serviço trocado) e sentinelas em arquivo novo | T06 dados-bd; resto backend | alto (T06 medio) |
| 3. Leituras | T09 andamento na vista de pessoa (seis campos) e na do Awave (quatro, chave a chave, na mesma consulta da autoria), sete chaves nos contratos, varredura de leituras de agente que parte de `MATRIZ` (AN-09) e o prazo total na leitura do Awave | backend | alto |
| 4. Seed | T10 oito demandas fictícias (em construção com cada fase e situação, devolvida pelo cancelamento, sem plano, em construção sem andamento, a do envio da V-02 e a de DEC sem pedido), sem token e sem mudar os pendentes | backend | baixo |
| 5. Painel | T11 rótulos, textos e regras puras (selo, seção, histórico); T12 fila com selo na linha e no cartão, leitura por página e alerta de erro; T13 detalhe com a seção, a Próxima ação linha 15 e o texto novo de Mudar status; T14 e2e do envio pelo `/construir`, sete chaves do Awave no e2e e versão 0.4.0 | frontend | T12 medio; resto baixo |

O plano traz: as listas Pode por engenheiro e o que delas decorre (G1); o que fica para 07, 08, 09, 10 e Fabiano (G2);
as regras de código, com o prazo total sem `t` (AN-06) e a visibilidade a partir da matriz (G3); as superfícies
congeladas com o comando do `git diff 0ac099a` (G4, AN-13); os testes existentes que mudam, arquivo a arquivo (G5); as
decisões D-01 a D-16 (G6); os nomes compartilhados (G7); o inventário de quem escreve o que o registro lê e a trava de
cada um (G8, AN-05); o inventário das rotas cuja ação tem agente ou integração, com a vista de cada uma (G9, AN-09); a
cobertura de cada RF e de cada AN (G10); e a montagem da V-02, do ensaio de rollback e do RNF-01 para a 09.

### Lições aplicadas

- **Lista Pode:** a T01 e a T06 (dados-bd) só tocam `src/db/`, `src/modules/`, `drizzle/` e `test/`; o seed (`scripts/`)
  é do backend; e2e só do frontend, inclusive a troca de seis para sete chaves em `e2e/integracoes.spec.ts`; a custom se
  chama `rls_andamento_construcao` porque é o comando que a lista do dados-bd tem.
- **Visibilidade:** a varredura da T09 lê as ações com agente de `MATRIZ` e exige que cada uma tenha rota chamada.
- **Prazo total:** `executarComOrcamento(..., 'padrao', undefined, ...)`, sem parâmetro `t`, conferido por teste estático.
- **e2e:** nenhum e2e cria demanda nem versão (leem o seed); `retries: 0`, 30 s por teste, divisão acima de 24 s; spec
  com token com `trace: 'off'`; o único e2e que muda o seed (T14) usa a demanda que nenhum outro e2e lê.
- **Versão:** `package.json` 0.4.0 na T14; seção 0.4.0 do `CHANGELOG.md` com o `documentacao-tecnica` na
  `10-documentacao` (D-10).

## Decisões tomadas

- D-01 a D-16 estão na G6 do plano, cada uma com a razão. As que respondem às pendências da spec 7.2:
- Onde ficam os testes estáticos do AN-01 (f) e do AN-06: `test/estatico/andamento.test.ts`, criado na T02 e ampliado
  na T06, T07 e T12 (D-04).
- CA-04.6: unidade de `lerAndamento` (T05) mais o CHECK que recusa a linha (T01) e a leitura sem 500 nas vistas (T09),
  como a spec 7.3 manda.
- Nomes das constantes: `ROTULO_FASE` e `ROTULO_SITUACAO_CONSTRUCAO` em `rotulos.ts`; `TEXTOS_ANDAMENTO`, `seloDeFase` e
  `secaoDoAndamento` em `src/components/dados-do-andamento.ts` (D-03).
- Grade da T05: o `GRADE` não muda; a seção vai em `xl:col-start-3 xl:row-start-2` e o Histórico passa a
  `xl:row-[3/-1]` só quando ela existe, com o e2e conferindo que nada se sobrepõe em 1280 px (T13).
- Sentinelas da rota nova em arquivo novo, para não mexer nas 59 asserções do de hoje (D-05).
- AN-06 (c) na leitura do Awave provado pelo prazo do GET (200 com 7 s de espera, 503 passando de 8 s), porque a leitura
  não tem `INSERT` onde ler o `current_setting` (D-06).
- O seed grava o andamento direto, com as mesmas regras puras, porque o serviço não aceita transação de quem chama (D-07);
  as demandas de andamento ficam com o pedido recebido, para os pendentes não mudarem (D-11).
- T12 com risco `medio` (leitura nova de pessoa atrás da guarda que já existe); as leituras com AN-09 ficam `alto` na T09
  (D-12). Pela regra da Entrega, as fases 1 a 3 têm tarefa `alto`; Seed e Painel, não.
- O texto de `dicaAprovada` é conferido em Vitest e não em e2e, porque a única demanda do seed em `aprovada` muda de
  status no e2e da T14 (T13).
- Uma leitura do histórico da estruturaAutonoma rodou fora da regra desta etapa e foi liberada pelo maestro, por só ler.

## Pendências

- Nenhuma bloqueia o plano.
- Para a `06-T01-construcao`: contar as colunas de `demanda` em `0ac099a` e trocar o `expect.any(Number)` do teste (está
  no plano).
- Para a `06-Tnn-revisao` de toda tarefa: G4 vazio, os diffs parciais da G4 e a contagem de `expect(` por arquivo dos
  testes de segurança tocados (AN-13).
- Para a `09-entrega`: a V-02, o ensaio de rollback (com `volta_sem_restaurar: false` esperado) e o RNF-01, como no fim
  do plano.
- Para a `10-documentacao`: `CHANGELOG.md` 0.4.0, manual caps. 01, 02, 05, 08 e 09, `docs/operacao/deploy.md` e
  `tokens-de-integracao.md` (AN-14), como na G2.
- Herdadas da spec, com Fabiano e fora do `/construir`: P-04 (aceite de risco residual com `gestao-riscos`, incluindo o
  envio do andamento por um usuário do sistema que os agentes não usem, pendência da publicação), P-05 (conferir a tool
  do Awave com a sétima chave) e o roteiro depois do merge (backup, migrations, `worker` e depois `app`, saúde, só então
  `"andamento_ligado": true`).
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261111-0017-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -15` — base `0ac099a` (0.3.1) e as passagens 00 a P1
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- docs/superpowers docs/construcao/DEC-DEM-20261112-0019-v1 docs/construcao/DEC-DEM-20261111-0016-v1` — planos, specs e pastas dos pedidos anteriores
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- src test e2e scripts drizzle package.json playwright.config.ts vitest.config.ts docker-compose.hml.yml CHANGELOG.md` — arquivos rastreados de código, testes e migrations
- `node /home/deploy/servidor/projetos/estruturaAutonoma/ferramentas/construir/construir.mjs tarefas /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1/tarefas.json` — `{ "ok": true, "erros": [] }`

## Critério de pronto atendido

- [x] (05) cada RF de 01 e cada controle de 04 é coberto por ao menos uma tarefa
- [x] (05) cada tarefa do plano começa pelo teste que falha
- [x] (05) `tarefas.json` passa em `construir.mjs tarefas` e tem as tarefas do plano, na mesma ordem
- [x] (05) toda tarefa tem `risco`, pela regra da Entrega
