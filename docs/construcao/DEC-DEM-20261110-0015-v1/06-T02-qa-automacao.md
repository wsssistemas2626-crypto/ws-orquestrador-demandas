---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T02-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, 06-T02-qa-automacao.md (volta anterior), 06-T01-qa-automacao.md (cabeçalho), 06-T02-engenheiro-frontend.md (volta 1), 06-T02-tech-lead.md (segunda revisão), diff do commit 1c8dd70 (e2e, test, src, playwright.config.ts), diff bae998e..HEAD (stat), e2e/fontes.spec.ts, test/estatico/fontes-qa.test.ts (piso da CV-20)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Segunda volta da `06-T02-testes`, para conferir a correção do teste instável que devolvi: `e2e/fontes.spec.ts` ›
"CV-04 na T03: Noto Sans e Noto Sans Mono (ids) carregadas". **A correção está estável e a T02 fecha.** Nenhum teste
novo nesta volta: a cobertura da volta anterior (21 testes em `test/estatico/fontes-qa.test.ts` e 4 em
`e2e/fontes-qa.spec.ts`, já commitados) continua valendo e passou de novo.

### A correção (commit 1c8dd70)

- `git diff --stat bae998e HEAD`: no código, só `e2e/fontes.spec.ts` (o resto é entrega e registro).
  `playwright.config.ts`, `retries` e tempo-limite sem diff.
- Ataca a causa que apontei: com `temMono`, espera `main .font-mono:visible` antes do `document.fonts.ready`
  (`e2e/fontes.spec.ts:27`), então a Noto Sans Mono já foi pedida quando o `ready` resolve. A carga é relida até passar,
  por até 5 s (`toPass`, `:45-49`), sem `waitForTimeout`.
- Nenhuma asserção saiu nem afrouxou: as duas linhas `toContain(r.corpo)` e `toContain(r.mono)` têm o mesmo valor
  esperado; as conferências de `@font-face` e de `content-type: font/woff2` não mudaram. Fonte que não carrega continua
  reprovando, só que depois de 5 s em vez de na hora. `r.mono` nulo reprova (`toContain(null)`), e a espera do `:27` já
  falha antes se não houver id visível.
- Aceito o `toPass` no lugar do `expect.poll` que sugeri: mesma retentativa da leitura, e as linhas de asserção ficam
  iguais (o piso da CV-20 não cai).

### Estabilidade conferida

Execuções do teste da T03 nesta volta, sem mudança de código entre elas: **7 de 7 verdes**, 4 delas com a suíte de
unidade (209 arquivos) rodando ao mesmo tempo para carregar a máquina, que foi a condição em que a forma antiga falhava.

| Rodada | Carga | T03 |
|---|---|---|
| `fontes.spec.ts` + `fontes-qa.spec.ts` | sem carga | 1 de 1 (7 de 7 no total) |
| `fontes.spec.ts` | `pnpm test` em paralelo | 1 de 1 (3 de 3) |
| só a T03, `--repeat-each=3` | `pnpm test` em paralelo | 3 de 3 |
| `fontes.spec.ts` | fim do `pnpm test` em paralelo | 1 de 1 (3 de 3) |
| e2e inteira | `lint` e `typecheck` em paralelo no início | 1 de 1 (154 de 154) |

Somando a volta do engenheiro (6 de 6 nas rodadas e 90 de 90 na sonda) com estas 7, a forma nova não falhou nenhuma
vez; a antiga falhava 2 de 6 nas minhas rodadas e 2 de 90 na sonda. Usei rodadas curtas e `--repeat-each=3`, não mais,
pelo limite de taxa do login (`429`) que o engenheiro registrou.

### Critérios da tarefa e os testes que os cobrem

Sem mudança desde a volta anterior (tabela completa na entrega da volta 0, commit `bae998e`). O único item que estava
em aberto agora fecha:

| Critério | Teste (arquivo › nome) |
|---|---|
| CV-04: família de fato carregada (corpo e mono) em T01, T03 e T11 | `e2e/fontes.spec.ts` › "CV-04 na T01: Noto Sans carregada da mesma origem", **"CV-04 na T03: Noto Sans e Noto Sans Mono (ids) carregadas" (estável)**, "CV-04 na T11: o DEC do seed (o mesmo da axe-todas) com as duas famílias" |
| CV-04: `@font-face` só `local(...)` ou `.woff2` da mesma origem; respostas `font/woff2` | `e2e/fontes.spec.ts` › os três testes |
| CV-05, RNF-06, RNF-10, ADR-13 | `test/estatico/fontes.test.ts` e `test/estatico/fontes-qa.test.ts` (21 testes) |
| CA-02.1, CA-02.2, CA-02.3 | vigia da T01 em todo e2e; `e2e/fontes-qa.spec.ts` (4 testes); `test/estatico/sem-recurso-externo.test.ts` |
| CV-20: piso de asserções da T02 | `fontes-qa.test.ts` › "%s tem ao menos %i linhas com expect(" (`e2e/fontes.spec.ts` agora tem 8 linhas, piso 7) |

### Testes acrescentados

Nenhum nesta volta.

### Resultados

- `pnpm test`: 209 arquivos, **4599 de 4599**
- `pnpm test:e2e` (suíte inteira): **154 de 154** (5,6 min), com `vigia.spec.ts` como falha esperada (marcada `✘` e
  contada como aprovada) e a vigia sem achado nos outros 153
- `pnpm lint`: limpo
- `pnpm typecheck`: limpo

## Decisões tomadas

- Fechar a T02: a correção ataca a causa (espera o id desenhado antes do `ready`), não afrouxa asserção e passou 7 de 7
  nesta volta, inclusive com carga.
- Manter o piso de `e2e/fontes.spec.ts` em 7, como o tech-lead sugeriu: a linha a mais é o invólucro do `toPass`, não
  uma asserção nova, e subir o piso não protege nada a mais.
- Não acrescentar teste: a cobertura dos critérios já estava completa na volta anterior; faltava só a estabilidade.

## Pendências

- Minor do tech-lead, para a `08-revisao` (não bloqueia): `e2e/fontes.spec.ts:32` acha o mono por `getClientRects()`,
  e a espera do `:27` usa o `:visible` do Playwright, que também exclui `visibility: hidden`. Hoje não muda nada (todo
  `.font-mono` tem a mesma família); se a T09 trouxer variante escondida por `visibility`, ler a família por
  `page.locator(MONO_VISIVEL).first().evaluate(...)` alinha os dois.
- Para quem provar estabilidade de teste com login: `--repeat-each` acima de 3 esbarra no `429` do login; usar várias
  rodadas curtas.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — c37320a, f106749, 1b0136d, 1c8dd70, bae998e, …
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 1c8dd70~1 1c8dd70 -- e2e test src playwright.config.ts` — só `conferirFontes` e duas constantes em `e2e/fontes.spec.ts`; nenhuma asserção removida
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat bae998e HEAD` — no código, só `e2e/fontes.spec.ts`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fontes.spec.ts e2e/fontes-qa.spec.ts` — 7 de 7
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — em segundo plano, para carregar a máquina: 209 arquivos, 4599 de 4599
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fontes.spec.ts` — com carga: 3 de 3
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fontes.spec.ts -g "CV-04 na T03" --repeat-each=3` — com carga: 3 de 3
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fontes.spec.ts` — 3 de 3
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — em segundo plano: 154 de 154 (5,6 min; `vigia.spec.ts` como falha esperada)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só esta entrega

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
