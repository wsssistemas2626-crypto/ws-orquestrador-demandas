---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T08-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, 05-tech-lead.md, tarefas.json, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7, T07, T08, início da T09), src/modules/demandas/resumo-da-fila.ts, src/modules/demandas/schemas.ts, src/components/rotulos.ts, src/lib/fuso.ts, src/app/(painel)/demandas/fila.tsx, tsconfig.json]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T08, regras de exibição da fila (RF-05, RF-06, C08, CV-07, CV-19), como funções puras.

### Arquivos criados (nenhum arquivo existente alterado)

- `src/components/dados-da-fila.ts`: `TEXTOS_CONTADORES`, o tipo `ContadorDaFila`, `contadoresDaFila`,
  `idadeDaDemanda` e `textoDasEtapas`, com as assinaturas do G7. De `src/modules/` só entra `import type`
  (`ContagemPorStatus`, `EtapasNaFila`, `FiltroDemandas`, `Status`). Os valores vêm de `src/lib/fuso.ts`
  (`dataIsoSaoPaulo`, `formatarData`) e de `./rotulos` (`ROTULO_STATUS`, `COR_STATUS`, `CorSelo`). Sem banco, sem
  relógio: o agora chega por argumento (G3.8).
- `src/components/dados-da-fila.test.ts`: os testes do plano, mais um caso de cor.

### Testes criados (13)

- `contadoresDaFila`: CA-05.1 (ordem, totais, só "Todas" pressionado), CA-05.3 (troca o status, mantém `tipo`, tira
  `offset`), CA-05.5 (o pressionado e "Todas" tiram o status, `valor` vazio), contagem que falhou (`total` null em
  todos, os `href` continuam), CV-07 e CV-19 (todo `href` começa por `/demandas`, todo `valor` é vazio ou do enum),
  cor ("Todas" sem cor, status com `COR_STATUS`) e o texto oculto no singular e no plural.
- `idadeDaDemanda`: 4 casos de CA-06.2 em dias de calendário de São Paulo, incluindo 23h30 de 09/11 local dando
  "1 dia", e a data `dd/mm/aaaa` com o ISO.
- `textoDasEtapas`: CA-06.1.

### Teste visto falhando antes do código

`pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-da-fila.test.ts`:

```
 FAIL  src/components/dados-da-fila.test.ts [ src/components/dados-da-fila.test.ts ]
Error: Cannot find module './dados-da-fila' imported from .../src/components/dados-da-fila.test.ts
 Test Files  1 failed (1)
      Tests  no tests
```

Depois do código, o mesmo comando deu `Test Files 1 passed (1)`, `Tests 13 passed (13)`.

### Resultado final

- `pnpm test`: 222 arquivos e 4.877 testes passaram, nenhum falhou.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git status`: só os dois arquivos novos; nenhuma superfície do G4 tocada e nada em `src/modules/` (CV-01).

### Desvios do plano

- Um caso de teste a mais (cor dos contadores: "Todas" com `cor: null`, "Pronta para decisão" com `petroleo`). O campo
  `cor` faz parte do `ContadorDaFila` do G7 e não tinha asserção. O teste não muda nenhuma regra.
- Código igual ao do plano, só reformatado e com comentários. `dataIsoSaoPaulo` devolve `AAAA-MM-DD`, então não foi
  preciso usar outra função de `fuso.ts`.

## Decisões tomadas

- `hrefDaFila` de `fila.tsx` é a função usada pelo teste, como o plano pede. Assim o `href` dos contadores sai pelo
  mesmo caminho do endereço da fila e não aparece uma segunda função que monta URL.
- O teste de cor serve para que a T09 não receba o campo `cor` sem nenhuma conferência.

## Pendências

- Nenhuma da T08. A T09 (`engenheiro-frontend`) consome `contadoresDaFila`, `idadeDaDemanda`, `textoDasEtapas` e
  `TEXTOS_CONTADORES`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, ramo `construcao/DEC-DEM-20261110-0015-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -12` — topo 6793489 (06-T07-testes)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-da-fila.test.ts` — FAIL (módulo não existe), antes do código
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-da-fila.test.ts` — 13 de 13
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 4877 de 4877 (222 arquivos)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — só os dois arquivos novos

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (a T08 não cria nem altera rota, Server Action ou job; o filtro chega já validado por `filtroDemandasSchema`)
