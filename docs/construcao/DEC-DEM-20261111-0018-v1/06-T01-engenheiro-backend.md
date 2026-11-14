---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T01-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 2026-11-13-ws-orquestrador-demandas-sobras-plano.md (G0 a G10 e T01), 04-seguranca-aplicacao.md (linhas do SB-01), src/modules/acesso/matriz.ts, src/modules/acesso/matriz.test.ts, src/modules/acesso/matriz-integracoes.test.ts, src/modules/acesso/matriz-integracoes-qa.test.ts, src/modules/acesso/matriz-andamento.test.ts, src/modules/acesso/matriz-andamento-qa.test.ts, test/matriz-rotas.test.ts (trechos), test/estatico/piso-de-assercoes.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T01: ação `ler_situacao_pedido` só do `construir` na matriz (SB-01 a, b, e, f; RF-01; RNF-07).

**Arquivos alterados**
- `src/modules/acesso/matriz.ts`: uma linha em `ACOES` (`'ler_situacao_pedido'`, com o comentário da 0.4.1), uma linha
  em `MATRIZ` (`ler_situacao_pedido: SO_CONSTRUIR`) e o comentário da lista de integrações ("Só sete pares abrem (RF-03
  da 0.3.0, RF-01 da 0.4.0 e RF-01 da 0.4.1): awave em criar_demanda e ler_demanda; construir nas cinco ações dele.").
  Nada mais mudou no arquivo (diff conferido contra `41108ee`).
- `src/modules/acesso/matriz.test.ts` (G5): `SO_CONSTRUIR` ganha `'ler_situacao_pedido'` (o comentário de cima ganha a
  linha da 0.4.1); "24" → "25" no título e no `toBe`.
- `src/modules/acesso/matriz-integracoes.test.ts` (G5): `DO_CONSTRUIR` ganha a ação; a lista de pares ganha
  `'ler_situacao_pedido:construir'` (na ordem do `sort`); "os seis" → "os sete" e "quatro dele" → "cinco dele" nos
  títulos.
- `src/modules/acesso/matriz-integracoes-qa.test.ts` (G5): `DO_CONSTRUIR` ganha a ação; títulos "24 ações" → "25" e
  "quatro" → "cinco" (linhas 66, 85, 108 e 119); `- 6` → `- 7` na linha 203 e o comentário da 202. Nenhuma asserção saiu.
- `src/modules/acesso/matriz-andamento.test.ts` (G5): (a) "os seis" → "os sete", com `'ler_situacao_pedido:construir'`
  no conjunto; (b) "quatro ações" → "cinco", com `'ler_situacao_pedido'` na lista ordenada.
- `test/estatico/piso-de-assercoes.test.ts`: só acréscimo, com o comentário "T01 do DEC-DEM-20261111-0018-v1 (SB-01):
  contado no fim da tarefa.": `src/modules/acesso/matriz-situacao.test.ts: 15` e `test/estatico/situacao.test.ts: 8`.

**Testes criados**
- `src/modules/acesso/matriz-situacao.test.ts` (6 casos, 15 linhas com `expect(`), o texto do plano: pares exatos (a),
  cinco ações do `construir` e duas do `awave`, 25 ações (b), linha `SO_CONSTRUIR` congelada e igual à de
  `registrar_andamento`, negação de `awave`, agentes com e sem token, papéis e sistema, integração parecida negada (e),
  e o `construir` sem outra leitura.
- `test/estatico/situacao.test.ts` (4 casos, 8 linhas com `expect(`), o texto do plano: SB-01 (f), só matriz, rota nova
  e serviço citam a ação fora de teste; nenhum `'use server'`, job ou worker; casos plantados.

**Teste visto falhando antes do código** (`pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso test/estatico/situacao.test.ts --reporter=dot`):

```
 FAIL  src/modules/acesso/matriz-situacao.test.ts > SB-01: ler_situacao_pedido > (b) o construir tem exatamente cinco ações e o awave exatamente duas; a matriz tem 25 ações
AssertionError: expected [ Array(4) ] to deeply equal [ Array(5) ]
 FAIL  src/modules/acesso/matriz-situacao.test.ts > SB-01: ler_situacao_pedido > a linha é SO_CONSTRUIR (a mesma das outras quatro do /construir): sem pessoa, sem agente, congelada
AssertionError: expected undefined to deeply equal { pessoa: null, agentes: [], …(1) }
 FAIL  src/modules/acesso/matriz.test.ts > matriz como dado (C-10, C-12) > as ações são as 25 do plano, sem repetição, e a matriz não tem linha a mais
AssertionError: expected 24 to be 25 // Object.is equality
 FAIL  test/estatico/situacao.test.ts > SB-01 (f): onde a ação ler_situacao_pedido aparece > fora de teste, só a matriz, a rota nova e o serviço citam a ação
 Test Files  6 failed | 24 passed (30)
      Tests  15 failed | 422 passed (437)
```

As 15 falhas, todas pela ação que ainda não existia: 5 em `matriz-situacao.test.ts`, 1 em `situacao.test.ts`, 1 em
`matriz.test.ts`, 2 em `matriz-integracoes.test.ts`, 4 em `matriz-integracoes-qa.test.ts` e 2 em
`matriz-andamento.test.ts`.

**Resultado depois do código**
- Mesmo comando: 30 de 30 arquivos, 437 de 437 testes.
- `pnpm test` inteiro: 350 de 350 arquivos, 7767 de 7767 testes, 0 falhas (208,6 s, em segundo plano).
- `pnpm lint` e `pnpm typecheck` limpos.
- G4: o `git diff 41108ee --stat` das superfícies congeladas saiu vazio.

**Desvios do plano:** nenhum na regra. Uma mudança só de título fora da letra da G5 (detalhe em Decisões).

## Decisões tomadas

- Em `matriz-integracoes.test.ts`, mudei também o título "as quatro do /construir não têm pessoa nem agente" para "as
  cinco", além do "quatro dele" que a G5 cita. O motivo: o `DO_CONSTRUIR` desse caso passou a ter cinco ações, e o
  título antigo ficaria errado. Só o texto do `it` mudou, nenhuma asserção. Fica para a revisão ratificar (G3.2).
- O comentário acima de `SO_CONSTRUIR` em `matriz.test.ts` ganhou a linha "0.4.1 (RF-01, SB-01): e a situação do
  pedido", seguindo o que as versões 0.3.0 e 0.4.0 já faziam. É só comentário.
- Teste de guarda que já passava antes do código (G3.1): em `test/estatico/situacao.test.ts`, os casos "a varredura
  enxerga o código que roda", "nenhum arquivo 'use server', job ou worker cita a ação" e "as regras pegam o caso
  plantado" passaram antes da mudança. Eles guardam contra regressão, e a rota e o serviço ainda não existem. Já o
  "fora de teste, só a matriz…" falhou antes, porque a matriz ainda não citava a ação. No `matriz-situacao.test.ts`, o
  caso "o construir continua negado nas leituras de pessoa e de agente" também já passava, pela mesma razão.
- Contagem do piso por `grep -rn "expect(" <arquivo> | wc -l`, que é o mesmo critério por linha do `linhasComExpect`.
  Os arquivos da G5 que já estão no `PISO` (`matriz.test.ts` com 44 e `matriz-andamento.test.ts` com 13) não perderam
  nenhuma linha com `expect(`.

## Pendências

- Regra de comando: rodei comandos fora da regra da passagem, todos só de leitura e sem efeito no repositório. Eles
  estão declarados abaixo para o maestro decidir:
  - `wc -l` sobre o `padrao-tecnico.md` da estruturaAutonoma (`wc` sozinho, e caminho fora do repositório);
  - `grep -n` sem `-r` sobre o plano;
  - `2>&1` (redirecionamento) no comando que listou as falhas;
  - `tail` e `grep` sobre o arquivo de saída do harness em `/tmp`, quando devia ter usado a ferramenta Read.
- Nenhuma das instabilidades conhecidas sob carga apareceu: a suíte inteira passou de primeira.
- Para a T02: a rota `src/app/api/pedidos-construcao/[decId]/situacao/route.ts` e o serviço
  `src/modules/pedido-construcao/situacao.ts` já estão na lista `CITAM_A_ACAO` do estático. A T02 amplia esse arquivo
  com o SB-03, o SB-04 e o SB-06, e o piso dele sobe junto.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0018-v1`
- `wc -l /home/deploy/servidor/projetos/estruturaAutonoma/docs/construcao/padrao-tecnico.md` — fora da regra (Pendências)
- `grep -n "^#" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md` — sem `-r` (Pendências)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -ln "registrar_andamento\|SO_CONSTRUIR\|ACOES"`
- `grep -rn "24\|quatro\|seis\|toHaveLength" /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/modules/acesso/matriz-andamento-qa.test.ts /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/modules/acesso/matriz-qa.test.ts /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/modules/acesso/ramos-por-ator-qa.test.ts`
- `grep -n "SB-01" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0018-v1/04-seguranca-aplicacao.md`
- `grep -n "ACOES\|construir\|route" /home/deploy/servidor/projetos/ws-orquestrador-demandas/test/matriz-rotas.test.ts`
- `grep -n "T0\|T1\|^const\|^  //\|^};\|^]" /home/deploy/servidor/projetos/ws-orquestrador-demandas/test/estatico/piso-de-assercoes.test.ts`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso test/estatico/situacao.test.ts --reporter=dot` — antes do código: 15 falharam, 422 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso test/estatico/situacao.test.ts --reporter=dot 2>&1 | grep "FAIL"` — antes do código, para listar as 15 falhas; tem redirecionamento (Pendências)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "Record<Acao" -- src test scripts`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso test/estatico/situacao.test.ts --reporter=dot 2>&1 | tail -8` — depois do código: 437 de 437; tem redirecionamento (Pendências)
- `grep -rn "expect(" /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/modules/acesso/matriz-situacao.test.ts | wc -l` — 15
- `grep -rn "expect(" /home/deploy/servidor/projetos/ws-orquestrador-demandas/test/estatico/situacao.test.ts | wc -l` — 8
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — em segundo plano: 350 de 350 arquivos, 7767 de 7767 testes
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 41108ee -- src/modules/acesso/matriz.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 41108ee --stat -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/lib/rota.ts src/db/transacao.ts src/db/privilegios.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/pedido-construcao/pendentes.ts src/modules/pedido-construcao/entregar.ts src/modules/pedido-construcao/receber.ts src/modules/andamento/registrar.ts src/modules/limites.ts src/modules/pacotes-decisao/consultas.ts src/modules/demandas/consultas.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/agentes/entrada-agente.ts next.config.ts 'drizzle/000[0-9]_*.sql' 'drizzle/meta/000[0-9]_snapshot.json'` — vazio
- `tail -8 /tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/d7de67e8-15e3-4f45-b927-45e1f3d1b43d/tasks/b25fgzwgd.output` — fora da regra (Pendências)
- `tail -6 /tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/d7de67e8-15e3-4f45-b927-45e1f3d1b43d/tasks/b25fgzwgd.output` — fora da regra (Pendências)
- `grep -n "Test Files" /tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/d7de67e8-15e3-4f45-b927-45e1f3d1b43d/tasks/b25fgzwgd.output` — fora da regra (Pendências)

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (a T01 não cria rota, Server Action nem job)
