---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T07-construcao
agente: engenheiro-backend
leu: [contrato-passagem.md, 05-tech-lead.md, 06-T07-engenheiro-dados-bd.md, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G8, T07), src/modules/demandas/entrada-qa.test.ts, src/app/api/demandas/demandas.test.ts, src/modules/demandas/consultas.test.ts, src/app/(painel)/demandas/fila.test.ts (linhas 30 a 54), src/app/(painel)/demandas/fila-qa.test.ts (linhas 55 a 76), src/app/(painel)/demandas/fila-a1.test.ts (linhas 25 a 46), src/app/(painel)/demandas/fila-a1-qa.test.ts (linhas 18 a 39)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Volta da T07 com o `engenheiro-backend` (D-23). Fiz só os passos 3a, 3b e 4 do plano. O código de banco dos passos 1 a 3
(commits 7c8c206 e 4306728) não mudou, e nenhum arquivo de produção mudou.

### Passo 3a: o vermelho antes de editar (o "visto falhando" desta volta)

`pnpm test` (suíte inteira, com a árvore limpa, antes de qualquer edição): **2 arquivos falharam e 258 passaram (260).
Foram 3 testes com falha e 5607 que passaram (5610)**. As 3 falhas são as esperadas:

```
 FAIL  src/modules/demandas/entrada-qa.test.ts > RF-06 e CA-21.3: nenhuma outra leitura traz o texto bruto nem a origem > GET /api/demandas (fila) e GET /api/demandas/:id/historico da demanda criada pela entrada não têm sentinela
AssertionError: expected [ 'id', 'titulo', 'tipo', …(6) ] to not include 'origem'
 ❯ src/modules/demandas/entrada-qa.test.ts:163:36

 FAIL  src/app/api/demandas/demandas.test.ts > GET /api/demandas > o item da fila não traz solicitante, texto livre, anexos nem autor
AssertionError: expected [ 'criadaEm', 'id', …(7) ] to deeply equal [ 'criadaEm', 'id', …(6) ]
+   "origem",
 ❯ src/app/api/demandas/demandas.test.ts:223:37

 FAIL  src/app/api/demandas/demandas.test.ts > M-06: minimização da leitura de demanda para quem não é pessoa > a listagem, nos dois atores, só tem as chaves da fila
AssertionError: expected [ 'criadaEm', 'id', …(7) ] to deeply equal [ 'criadaEm', 'id', …(6) ]
+   "origem",
 ❯ src/app/api/demandas/demandas.test.ts:394:60

 Test Files  2 failed | 258 passed (260)
      Tests  3 failed | 5607 passed (5610)
```

`pnpm typecheck`: **4 erros**, todos no ajudante `demanda` dos testes do painel:

```
src/app/(painel)/demandas/fila-a1-qa.test.ts(27,84): error TS2322: Type '{ ... origem?: "pessoa" | ... 2 more ... | undefined; criadaEm: Date; }' is not assignable to type 'DemandaResumo'.
src/app/(painel)/demandas/fila-a1.test.ts(35,84): error TS2322: (o mesmo)
src/app/(painel)/demandas/fila-qa.test.ts(64,84): error TS2322: (o mesmo)
src/app/(painel)/demandas/fila.test.ts(43,84): error TS2322: (o mesmo)
    Type 'undefined' is not assignable to type '"pessoa" | "agente" | "awave"'.
```

`pnpm lint`: limpo.

### Passo 3b: as edições, e só elas (G5, D-22)

| Arquivo | Mudança |
|---|---|
| `src/modules/demandas/entrada-qa.test.ts` | A linha 163 (`expect(Object.keys(item!)).not.toContain('origem')`) virou duas asserções, com duas linhas de comentário do D-22. A primeira é a **lista fechada** das nove chaves do item: `expect(Object.keys(item!).sort()).toEqual(['criadaEm', 'id', 'linhaServicoProvavel', 'origem', 'rascunhoAgente', 'status', 'tipo', 'titulo', 'urgencia'])`. A segunda é o **valor exato**: `expect(item!.origem).toBe('pessoa')`. A linha 162 (`texto`) e o `contemSentinela(corpoLista)` (antes na 164, agora na 167) ficaram iguais. |
| `src/app/api/demandas/demandas.test.ts` | Na linha 223 e na 394, `'origem'` entrou na lista exata, entre `'linhaServicoProvavel'` e `'rascunhoAgente'`. Nenhuma chave saiu. Os `contemSentinela` das linhas 219 e 391 ficaram. |
| `src/app/(painel)/demandas/fila.test.ts` | O ajudante `demanda` ganhou `origem: 'pessoa',` depois de `rascunhoAgente: false,`, antes de `criadaEm` e do `...extra`. |
| `src/app/(painel)/demandas/fila-qa.test.ts` | A mesma linha, no mesmo lugar. |
| `src/app/(painel)/demandas/fila-a1.test.ts` | A mesma linha, no mesmo lugar. |
| `src/app/(painel)/demandas/fila-a1-qa.test.ts` | A mesma linha, no mesmo lugar. |

`git diff --stat` desta volta: 6 arquivos, 10 inserções e 3 remoções. Os títulos de `it` e `describe` não mudaram, e
nenhuma asserção saiu além da linha 163 de `entrada-qa.test.ts`, que virou as duas acima.

**Por que a guarda nova não é mais fraca que a antiga:**

- A antiga barrava só uma chave com o nome `origem`.
- A nova barra qualquer chave fora das nove, como `canal`, `referencia`, `texto` ou um `...entradaBruta`.
- Ela exige o valor exato `'pessoa'` em `origem`. Com isso, o objeto `{ canal, referencia }` não passa, e o texto do canal também não.
- A sentinela da referência continua coberta pelo `contemSentinela(corpoLista)`, que não mudou.
- A demanda do teste é criada pela "cto" pela entrada colando o texto, e o valor lido é `'pessoa'`, como o plano previa.

### Passo 4: verificação

- `pnpm test`: **260 de 260 arquivos e 5610 de 5610 testes, sem falha**.
- `pnpm typecheck`: limpo (`tsc --noEmit` sem erro).
- `pnpm lint`: limpo.
- IN-16: contei com Read as linhas que contêm `expect(`, antes e depois desta volta. Não contei as linhas que só têm `expect.objectContaining`, `expect.any` ou `expect.arrayContaining`.

| Arquivo | Antes | Depois | Variação |
|---|---|---|---|
| `src/modules/demandas/entrada-qa.test.ts` | 51 | 52 | +1 (a 163 virou duas) |
| `src/app/api/demandas/demandas.test.ts` | 200 | 200 | 0 (duas listas trocadas no lugar) |
| `src/modules/demandas/consultas.test.ts` | 28 | 28 | 0 (não mudou nesta volta; desde 59ddf37 só ganhou a linha de comentário 118 e `'origem'` na lista da 119) |

- `git diff 59ddf37 --stat -- src test scripts drizzle e2e`: 11 arquivos. São os 5 que já estavam no ramo (`schemas.ts`,
  `consultas.ts`, `resumo-da-fila.ts`, `consultas.test.ts` e `origem.test.ts`) e os 6 desta volta. Nada fora da lista
  da T07, e `vistas-para-agente.test.ts` não aparece.
- G4: o `git diff a9fd9b8` de `resolver-ator.ts`, `exigir-pessoa.ts`, `auth.ts`, `proxy.ts`, `privilegios.ts`,
  `next.config.ts`, `src/lib/rota.ts` e das migrations e snapshots de 0000 a 0006 saiu vazio.

### Testes criados

Nenhum. Esta volta só ajusta testes existentes, pela G5. O teste da tarefa (`origem.test.ts`, 21 testes) já estava no
ramo e passa dentro da suíte.

### Desvios do plano

Nenhum.

## Decisões tomadas

- Usei o código do passo 3b como o plano escreveu, inclusive as duas linhas de comentário. Assim a revisão confere a
  troca linha a linha contra o plano.
- `origem: 'pessoa'` entrou logo depois de `rascunhoAgente: false` nos quatro ajudantes, antes do comentário e de
  `criadaEm`, como no plano. Fica antes do `...extra`, e um teste que passe outra origem continua podendo trocar o valor.
- Rodei a suíte inteira antes de editar, e não só os três arquivos, para mostrar que o vermelho era só o esperado: 3
  falhas e nenhuma outra.

## Pendências

- Nenhuma que bloqueie.
- Para a `06-T07-revisao`, conforme a 05:
  - conferir que a linha 163 virou as duas asserções e que a 162 e o `contemSentinela` ficaram;
  - conferir que nenhuma outra asserção de `src/app/` saiu;
  - conferir que a G4 está vazia.
- As caixas `- [ ]` da T07 no plano não foram marcadas, porque a G1 não deixa a etapa 06 editar `docs/`.
- Glob e Grep não estavam disponíveis nesta sessão. Por isso contei as linhas com `expect(` lendo os arquivos com Read, como o plano pede.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "Passo 3b" --format=%h -- docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md` — b925dfe
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — árvore limpa antes de começar
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — antes das edições, em segundo plano, saída lida com Read: 3 falharam e 5607 passaram (`entrada-qa.test.ts:163`, `demandas.test.ts:223` e `:394`)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — antes das edições: 4 erros, nos ajudantes `demanda` dos quatro testes do painel
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — antes das edições: limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — depois das edições: limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — depois das edições, em segundo plano, saída lida com Read: 5610 de 5610 em 260 arquivos
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — depois das edições: limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 6 arquivos, 10 inserções e 3 remoções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 59ddf37 --stat -- src test scripts drizzle e2e` — 11 arquivos, todos da T07
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts src/lib/rota.ts drizzle/0000_*.sql drizzle/0001_*.sql drizzle/0002_*.sql drizzle/0003_*.sql drizzle/0004_*.sql drizzle/0005_*.sql drizzle/0006_*.sql drizzle/meta/0000_snapshot.json drizzle/meta/0001_snapshot.json drizzle/meta/0002_snapshot.json drizzle/meta/0003_snapshot.json drizzle/meta/0004_snapshot.json drizzle/meta/0005_snapshot.json drizzle/meta/0006_snapshot.json` — vazio (G4)

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega): o `origem.test.ts` foi visto falhando na volta do `engenheiro-dados-bd` (18 de 21). O vermelho desta volta está no passo 3a
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (nenhuma entrada nova nesta volta; o filtro `origem` já está em `z.enum`, C-17)
