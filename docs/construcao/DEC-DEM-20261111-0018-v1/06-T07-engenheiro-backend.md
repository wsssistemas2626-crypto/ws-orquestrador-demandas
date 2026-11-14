---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T07-construcao
agente: engenheiro-backend
leu: [contrato-passagem.md, docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md (G0 a G5 e T07), 06-T07-engenheiro-dados-bd.md, src/app/(painel)/demandas/fila-andamento.test.ts (linhas 170 a 234), src/modules/andamento/consultas.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T07, passos 3b e 4 (plano revisto em 14/11). Os passos 1 a 3 (consulta com `crossJoinLateral`, teste de plano e piso)
são do commit `27b117d`, que está na história do ramo (`git log --oneline -12`); não os refiz. Conferi que
`src/modules/andamento/consultas.ts` tem o corpo de `andamentosDasDemandas` do plano e que o `PISO` traz
`'src/modules/andamento/consultas.test.ts': 38`, igual à contagem atual de `expect(` do arquivo (38).

**Arquivo alterado (só este)**
- `src/app/(painel)/demandas/fila-andamento.test.ts`: o comentário e o corpo do dublê `dbCom` (linhas 193 a 200 agora),
  copiados do passo 3b do plano, sem nenhuma diferença. A 1ª chamada de `select` devolve a cadeia da subconsulta
  (`from … where … orderBy … limit … as`); a 2ª devolve a página (`from … crossJoinLateral … where`), que resolve com as
  linhas. `dbQueFalha`, as asserções (linhas 202 a 234 agora, eram 200 a 232), os outros `describe` e
  `fila-andamento-qa.test.ts` ficaram iguais. Nenhuma linha de `consultas.ts` mudou.

**Testes criados:** nenhum. O passo 3b só muda a forma do dublê (G5).

**Contagem de `expect(` (G5):** `fila-andamento.test.ts` tem 40 em `41108ee` e 40 agora.

**Visto falhando antes da troca**:
`pnpm --dir <repo> test "src/app/(painel)/demandas/fila-andamento.test.ts" --reporter=dot`

```
 FAIL  src/app/(painel)/demandas/fila-andamento.test.ts > andamentosDaPagina (RF-08; ADR-35; AN-12; D-16) > com linhas: só as que passam em lerAndamento entram no mapa, já como AndamentoVista; sem log
AssertionError: expected null not to be null
 ❯ src/app/(painel)/demandas/fila-andamento.test.ts:222:22
      Tests  1 failed | 13 passed (14)
```

**Depois da troca**: o mesmo comando deu `Tests 14 passed (14)`.

**Suíte, lint e tipos**
- `pnpm test` (em segundo plano, saída lida com Read): `Test Files 376 passed (376)`, `Tests 8129 passed (8129)`,
  0 falhas, saída 0.
- `pnpm lint`: limpo. `pnpm typecheck`: limpo.

**Plano em texto da página** (o `process.stdout.write` de `planoDe`, em
`pnpm test src/modules/andamento/consultas.test.ts`, que deu 17 de 17):

```
T06 plano
Nested Loop  (cost=0.56..16.80 rows=2 width=82)
  ->  Index Only Scan using demanda_pkey on demanda  (cost=0.28..12.59 rows=2 width=18)
        Index Cond: (id = ANY ('{DEM-20261112-0001,DEM-20261112-0003}'::text[]))
  ->  Limit  (cost=0.28..2.08 rows=1 width=90)
        ->  Index Scan Backward using andamento_construcao_demanda_id_idx on andamento_construcao  (cost=0.28..54.31 rows=30 width=90)
              Index Cond: (demanda_id = demanda.id)
```

O plano tem um `Limit` sobre `Index Scan Backward` para cada demanda e não tem `Sort`, `Incremental Sort` nem
`Seq Scan`.

**G4:** o comando de 41108ee saiu **vazio**. `git diff --stat` desta passagem mostra só
`src/app/(painel)/demandas/fila-andamento.test.ts | 10 ++++++----` (1 arquivo, +6 −4).

**Desvios do plano:** nenhum. O dublê do plano bastou e foi copiado sem ajuste.

## Decisões tomadas

- Copiei o dublê do plano sem mudar nada. A forma dele bastou: o `as` devolve `{}`, e as chaves `u.demandaId` etc.
  viram `undefined` na projeção, que o dublê ignora. Como as linhas chegam do `where` da página, o teste continua
  provando o filtro de `lerAndamento` em `andamentosDaPagina`.
- Não mexi em `dbQueFalha`. O `select` dele lança já na 1ª chamada, que agora monta a subconsulta. O teste "banco que
  falha" continua provando o `null` e um log sem SQL nem ids, e passou.

## Pendências

- Desvio da regra de comando desta volta: rodei uma vez `wc -l` na saída da suíte em `/tmp` (o caminho está em
  Comandos executados) para achar o fim do arquivo antes de lê-lo. O comando só leu o arquivo e não alterou nada, mas
  fica fora da regra (caminho fora do repositório, comando fora da lista Pode). A leitura seguinte foi feita com Read. A
  decisão de aceitar ou refazer a etapa é do maestro.
- RNF-05 (p95 da fila com 5.000 demandas) fica para a `09-entrega` (D-17), como diz o plano.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T07" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "\*\*G[0-9]" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "G[0-5]\b" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — árvore limpa no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -5`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/fila-andamento.test.ts" --reporter=dot` — antes da troca: 1 falhou (linha 222), 13 passaram
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" 41108ee -- "src/app/(painel)/demandas/fila-andamento.test.ts"` — 40
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/fila-andamento.test.ts" --reporter=dot` — depois da troca: 14 de 14
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — em segundo plano: 8129 de 8129 (376 arquivos)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" -- "src/app/(painel)/demandas/fila-andamento.test.ts"` — 40
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- "src/app/(painel)/demandas/fila-andamento.test.ts"` — só o dublê e o comentário
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 41108ee -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/lib/rota.ts src/db/transacao.ts src/db/privilegios.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/pedido-construcao/pendentes.ts src/modules/pedido-construcao/entregar.ts src/modules/pedido-construcao/receber.ts src/modules/andamento/registrar.ts src/modules/limites.ts src/modules/pacotes-decisao/consultas.ts src/modules/demandas/consultas.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/agentes/entrada-agente.ts next.config.ts 'drizzle/000[0-9]_*.sql' 'drizzle/meta/000[0-9]_snapshot.json'` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — só `fila-andamento.test.ts` (+6 −4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "andamento/consultas.test.ts" -- test/estatico/piso-de-assercoes.test.ts` — 38
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" -- src/modules/andamento/consultas.test.ts` — 38
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -3 27b117d`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -12` — `27b117d` na história do ramo
- `wc -l /tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/d7de67e8-15e3-4f45-b927-45e1f3d1b43d/tasks/bn53sqt0h.output` — 732 (fora da regra; ver Pendências)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento/consultas.test.ts --reporter=dot` — 17 de 17, com o plano da página

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega): o teste da linha 222 já existia e foi visto falhando antes da troca do dublê. O teste novo da T07 foi visto falhando em `27b117d`
- [x] `pnpm test` passa (8129 de 8129)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa (só `src/app/(painel)/demandas/fila-andamento.test.ts`, o dublê da G5)
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (não se aplica: nenhuma entrada nova; o teste de banco que falha segue provando o log sem SQL nem ids)
