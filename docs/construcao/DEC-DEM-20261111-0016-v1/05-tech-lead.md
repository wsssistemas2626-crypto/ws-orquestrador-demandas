---
pedido: DEC-DEM-20261111-0016-v1
etapa: 05-plano
agente: tech-lead
leu: [pedido.json, docs/superpowers/specs/2026-11-11-ws-orquestrador-demandas-integracoes-design.md, 01-analista-requisitos.md, 02-arquiteto-solucoes.md, 03-ux-ui-design.md, 04-seguranca-aplicacao.md, padrao-tecnico.md, contrato-passagem.md, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (formato), .claude/agents/engenheiro-backend.md, .claude/agents/engenheiro-frontend.md, .claude/agents/engenheiro-dados-bd.md (listas Pode), ferramentas/construir/lib/buscar-pedidos.mjs, src/db/schema/acesso.ts, src/db/schema/historico.ts, src/db/schema/demandas.ts, src/db/schema/agentes.ts, src/db/transacao.ts, src/modules/acesso/ator.ts, src/modules/acesso/ator-pessoa.ts, src/modules/acesso/tokens-servico.ts, src/modules/acesso/matriz.ts, src/modules/acesso/matriz.test.ts, src/modules/acesso/resolver-ator.ts, src/modules/limites.ts, src/modules/historico/registrar.ts, src/modules/historico/consultas.ts, src/modules/demandas/servico.ts, src/modules/demandas/consultas.ts, src/modules/demandas/schemas.ts, src/modules/demandas/resumo-da-fila.ts, src/modules/demandas/gerar-id.ts, src/modules/agentes/gatilhos.ts, src/modules/agentes/entrada-agente.ts, src/modules/agentes/executar.ts, src/modules/especificacoes/consultas.ts, src/modules/pacotes-decisao/consultas.ts, src/modules/pacotes-decisao/substituido.ts, src/modules/pacotes-decisao/desatualizado.ts, src/modules/pedido-construcao/gerar.ts, src/lib/rota.ts, src/lib/erros.ts, src/lib/acao-painel.ts, src/lib/relogio.ts, src/proxy.ts, src/app/api/demandas/route.ts, src/app/api/demandas/[id]/route.ts, src/app/api/pacotes-decisao/[decId]/pedido-construcao/route.ts, src/app/(painel)/demandas/page.tsx, src/app/(painel)/demandas/fila.tsx, src/app/(painel)/demandas/leituras-da-fila.ts, src/app/(painel)/demandas/[id]/page.tsx, src/app/(painel)/demandas/[id]/detalhe.ts, src/app/(painel)/demandas/[id]/acoes.ts, src/app/(painel)/demandas/[id]/Historico.tsx, src/app/(painel)/pacotes-decisao/[decId]/page.tsx, src/components/rotulos.ts, src/components/dados-das-etapas.ts, src/components/dados-da-fila.ts, test/banco.ts, test/deps.ts, test/requisicao.ts, test/matriz-rotas.test.ts, test/transversal/sentinelas.test.ts, test/estatico/piso-de-assercoes.test.ts, scripts/criar-token-servico.ts, scripts/seed-ficticio.ts, e2e/apoio.ts, e2e/preparacao.ts, e2e/servidor.ts, playwright.config.ts, docker-compose.hml.yml]
status: pronto
proximo: engenheiro-dados-bd
devolvido_para: null
---
## Entrega

- Plano: `/home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md`
- Tarefas: `/home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0016-v1/tarefas.json`
  (20 tarefas, na ordem do plano; `construir.mjs tarefas` respondeu `ok: true`)

O plano tem as restrições globais (G1 quem edita o quê, pela lista Pode de cada engenheiro; G2 o que fica com 07, 08,
09, 10 e Fabiano; G3 regras de código e a lição do 0015 para o e2e; G4 superfícies congeladas do IN-15, com o comando
`git diff a9fd9b8` que tem de sair vazio em toda revisão; G5 os testes existentes que mudam, e só eles; G6 as decisões
D-01 a D-21; G7 as interfaces; G8 o inventário do IN-02 por caminho e função), as 20 tarefas com arquivos, interfaces e
passos TDD com o código, a montagem da V-01 e da V-02 para a 09 e as tabelas de cobertura (RF, IN e critérios
preliminares).

### Fases e tarefas

| Fase | Tarefas | Engenheiro | Risco |
|---|---|---|---|
| 1. Fundação (antes de qualquer rota aceitar integração) | T01 esquema e migration `0007` aditiva; T02 tipo `integracao` e ramos exaustivos (IN-02); T03 token de integração, matriz fechada e matriz × rotas (IN-01, IN-03, piso do IN-16); T04 limite por integração e tempo limite (IN-09, IN-14, ADR-28) | T01 dados-bd; T02 a T04 backend | alto |
| 2. Awave | T05 leitura só da própria demanda em seis chaves (IN-08); T06 criação com autoria, lista de campos, sem disparo, limite de 10 e contrato do Awave (IN-05); T07 origem na leitura, listagem e filtro | T05, T06 backend; T07 dados-bd | alto (T07 baixo) |
| 3. Confirmação | T08 confirmação por pessoa (Server Action no `acoes.ts` de hoje), gatilho e worker sem agente antes da confirmação (IN-06, IN-07) | backend | alto |
| 4. Construir | T09 `conferirEMontarPedido` extraído da geração (bytes iguais por construção); T10 leituras do pedido no histórico com plano de execução (pendentes, gerado, entregues, recebido); T11 entrega e rota de pendentes; T12 recebimento; T13 sentinelas e log das integrações | T10 dados-bd; resto backend | alto (T13 baixo) |
| 5. Scripts e seed | T14 `--integracao` nos scripts de token e teste de documentação sem token; T15 seed com três demandas do Awave e dois pedidos (um a buscar, um já recebido), sem token | backend | alto (T15 baixo) |
| 6. Painel | T16 fila com origem e filtro; T17 regras de exibição (confirmação, selo, Próxima ação linha 14); T18 detalhe da demanda com a seção "Confirmação do Awave"; T19 "Recebido pelo /construir em …" e o texto novo da seção do pedido; T20 e2e das integrações contra o build de produção, tokens do e2e local, versão 0.3.0 e e2e três vezes | frontend | baixo |

No modo `por_risco` da Parada 2, o maestro para antes das fases 1 a 5 (todas têm tarefa `alto`) e não para antes da 6.

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

- D-01: ramos exaustivos (T02) antes de qualquer token resolver integração (T03), vista da demanda para integração
  lançando até a T06 e GET da integração por consulta própria desde a T05: nenhum commit do ramo deixa o Awave ler
  demanda de outro autor.
- D-02: `criarTokenDeIntegracao` separado e `criarTokenServico` com a assinatura de hoje: evita mexer em testes de
  segurança existentes (IN-16).
- D-03: texto do 503 `indisponivel` (a pendência ficou com o tech-lead): "O Orquestrador não concluiu o pedido a tempo e
  nada foi gravado. Tente de novo em alguns minutos." Fixo, sem texto do Postgres, verdadeiro pelo `ROLLBACK`.
- D-04: 400 do recebimento com a forma da 02 e o texto da 03 em `campos`, por `z.custom`: reconcilia a divergência da
  7.3 sem um segundo formato de 400.
- D-05: `sistema` continua com a vista mínima: mudar ator existente está fora do pedido (RNF-09).
- D-06 e D-11: o painel lê confirmação e recebimento do que já carrega, por função pura; CA-15.2 em Vitest, porque o
  estado do seed muda entre execuções.
- D-07: o worker relê a confirmação em `executar.ts` (passo 3c) pela tabela `demanda` e por `evento`, nunca pelo
  esquema `pgboss` (pendência da 04).
- D-08: ordem da confirmação: outra origem, já confirmada (sucesso), status final: repetição idempotente mesmo depois de
  a demanda fechar.
- D-09: seed sem token, com prefixo fictício `ficticio`: nenhum token nasce num banco semeado (IN-04).
- D-10: tokens do e2e local em arquivo 600 numa pasta temporária fora do repositório, apagada no fim; na homologação os
  testes de API das integrações pulam e a V-01 e a V-02 cobrem: o e2e local é onde o `proxy.ts` real é provado.
- D-12: leituras do pedido no histórico com o `engenheiro-dados-bd`: é a consulta do RNF-02 e usa o índice do ADR-27.
- D-13: P-01 a P-04 de Fabiano aplicadas como estão na spec.
- D-17: piso de asserções ampliado aos testes de segurança do IN-16: a contagem vira teste em toda tarefa.
- D-21: RNF-01 (20 chamadas) e o limite de 10 por hora não cabem numa janela: a 09 mede 10 criações e 10 recusas, ou
  duas janelas.
- As demais (D-14 a D-16, D-18 a D-20) estão no G6 do plano, com a razão.
- Seis leituras com `git log` rodaram fora da regra de comando deste pedido; o conferir as barrou e o maestro as
  liberou, porque só leram o histórico (regra de 25/10).

## Pendências

- Nenhuma bloqueia o plano.
- Para a `09-entrega`: montar a V-01 e a V-02 como no fim do plano; medir o RNF-01 pela D-21.
- Para a `10-documentacao`: o texto do IN-18 e a periodicidade de 12 meses (P-04); o registro de que o título de
  demanda do Awave não deve levar nome de pessoa (spec 7.2).
- Herdadas, sem mudança: aceite formal de riscos residuais (P-04, já aceito por Fabiano em 11/11, a registrar com
  `gestao-riscos`); rede própria do Easypanel (`seguranca-informacao`); retenção do texto do Awave
  (`juridico-contratos`); `pnpm audit` sem `--prod` e as 5 moderadas (0015); atualizar o `padrao-tecnico.md` para as
  versões do ADR-29.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261111-0016-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- src scripts drizzle e2e test docs/superpowers/plans docs/operacao docs/manual-tecnico package.json playwright.config.ts docker-compose.hml.yml vitest.config.ts CHANGELOG.md` — lista dos arquivos rastreados
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -12` — base a9fd9b8 e as passagens 00 a P1
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G indisponivel --name-only --oneline -- src test scripts` — o código `indisponivel` (503) já existe em `erros.ts`
- `node /home/deploy/servidor/projetos/estruturaAutonoma/ferramentas/construir/construir.mjs tarefas /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0016-v1/tarefas.json` — `{ "ok": true, "erros": [] }`

## Critério de pronto atendido

- [x] (05) cada RF de 01 e cada controle de 04 é coberto por ao menos uma tarefa
- [x] (05) cada tarefa do plano começa pelo teste que falha
- [x] (05) `tarefas.json` passa em `construir.mjs tarefas` e tem as tarefas do plano, na mesma ordem
- [x] (05) toda tarefa tem `risco`, pela regra da Entrega
