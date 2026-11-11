---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T09-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7, T07 a T09), 01-analista-requisitos.md (glossário, RF-05 a RF-07), 05-tech-lead.md, 06-T09-engenheiro-frontend.md, 06-T09-tech-lead.md (Pendência 2, Minor 3), git show 5e3b0da (stat e diff de e2e/fila.spec.ts, e2e/fila-qa.spec.ts, e2e/seguranca.spec.ts, src/app/(painel)/demandas/fila-qa.test.ts), e2e/fila-contadores.spec.ts, e2e/fila-qa.spec.ts (sem script), src/app/(painel)/demandas/leituras-da-fila.ts, leituras-da-fila.test.ts, fila-a1.test.ts, page.tsx, ContadoresDaFila.tsx, CartoesDaFila.tsx, FiltrosFila.tsx, src/components/Recolhivel.tsx, test/estatico/leituras-da-fila.test.ts, package.json, playwright.config.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verificação da T09 (T03 Fila: contadores, tabela densa, cartões e filtros), código em `5e3b0da`. Todo critério de aceite
da tarefa tem teste e a suíte inteira passa. Ficam três testes novos (dois e2e e um arquivo de unidade com seis casos), o
reforço do Minor 3 pedido pela revisão e um achado sobre o caminho sem script, que vai para Pendências. O achado não
bloqueia: não é critério da tarefa, e a lista já não sai do esqueleto sem script desde a 0.1.13.

### Critério de aceite → teste que o cobre

| Critério | Arquivo | Teste |
|---|---|---|
| CA-05.2 | `e2e/fila-contadores.spec.ts` | `CA-05.2: ativar "Pronta para decisão" filtra, pressiona, foca o resultado e anuncia o total da API` |
| CA-05.3 (regra do RF-05) | `e2e/fila-contadores.spec.ts` | `CA-05.3: com status=nova&tipo=bug&offset=20, "Em análise" mantém tipo e tira offset` |
| CA-05.5 (regra do RF-05) | `e2e/fila-contadores.spec.ts` | `CA-05.5: ativar o pressionado tira o status e "Todas" fica pressionado` |
| CA-05.6 | `e2e/fila-contadores.spec.ts` | `CA-05.6: Enter e Espaço num contador filtram como o clique` |
| CA-05.7 | `e2e/fila-contadores.spec.ts`; `e2e/fila.spec.ts` | `CA-05.7 e CV-07: ?status=%3Cscript%3E&tipo=bug mostra o alerta, …`; `filtro inválido na URL mostra o alerta e a lista sem filtro` |
| CA-05.1 e CA-05.4 (ligação página → contagem) | `e2e/fila-contadores.spec.ts` | **novo:** `CA-05.1 e CA-05.4: com tipo=bug, cada contador mostra o total da API para aquele status e tipo, na ordem` |
| CA-06.1 | `e2e/fila-contadores.spec.ts`; `src/app/(painel)/demandas/fila-a1.test.ts` | `CA-06.1: o nome acessível da célula de etapas segue a API`; `CA-06.1 na tabela: a célula de etapas tem o texto fixo; …` |
| CA-06.2 (Idade, na virada do dia) | `src/app/(painel)/demandas/fila-a1-qa.test.ts` | **novo:** `a tabela e a lista mostram "Hoje" e "1 dia", com o <time> da criação e a data de São Paulo` |
| CA-06.3 | `e2e/fila-contadores.spec.ts`; `e2e/fila.spec.ts` | `CA-06.3: com mais de 20 demandas, "Próxima" leva à página 2 com o foco no resultado`; `paginação: …` |
| CA-06.4 | CV-01 (abaixo) e os testes de API de hoje, sem mudança | `git diff --stat 198e97d -- src/app/api …` vazio; `src/modules` só com `resumo-da-fila.ts` e o teste dele, sem tocar `consultas.ts` (`DemandaResumo`) |
| CA-07.1 | `e2e/fila-contadores.spec.ts`; `fila-a1.test.ts` | `celular › CA-07.1: …` (**reforçado:** a tabela está no DOM e fora da árvore de acessibilidade, e o id de foco existe uma vez); `CA-07.1: um item por demanda, …` |
| CA-07.2 | `e2e/fila-contadores.spec.ts` | `celular › CA-07.2: contador no celular foca o resultado da lista e anuncia o total` |
| CA-07.3 | `e2e/fila-contadores.spec.ts`; `e2e/fila.spec.ts` | `CA-07.3: em 320 px, scrollWidth não passa da largura da janela`; `axe: vazio, filtrado e com dados; …` |
| CA-07.4 | `e2e/fila-contadores.spec.ts` | `CA-07.4: em 1280 px, …` (**reforçado**, Minor 3 da revisão: `toHaveCount(1)` na lista escondida e no id de foco) |
| RNF-03 (44 px) | `e2e/fila-contadores.spec.ts`; `fila-a1.test.ts` | `celular › RNF-03: …`; `alvo de 44 px em toda largura (min-h-11) e pílula abaixo de 768 px` |
| CV-06 (cadeia) | `test/estatico/leituras-da-fila.test.ts`; `fila-qa.test.ts` | `CV-06 (T09): a cadeia até a página` (5 testes, com casos plantados); `sem permissão …` e `sem sessão …` (as leituras novas não são chamadas) |
| CV-07 | `fila-a1.test.ts`; `fila-a1-qa.test.ts`; e2e CA-05.7 | `CV-07: só tipo e linha de serviço vão ocultos, …`; **novo:** `CV-07: com tipo e linha de serviço, os dois vão ocultos, nessa ordem, depois do grupo, e nada mais` |
| CV-08 | `src/app/(painel)/demandas/leituras-da-fila.test.ts`; `fila-qa.test.ts` | `contagemOuNada (CV-08)` (4 testes, sentinela fora do log); `a contagem que falhou (null): os contadores sem número e o texto da 03; a lista continua` |
| CV-18 (cartão) | `e2e/seguranca.spec.ts`; `fila-a1-qa.test.ts` | `C-18 e CV-18: título com <script>, <img onerror> e U+202E aparece como texto no cartão da T03 em 390 px, isolado por <bdi>`; **novo:** `o título com U+202E fica dentro de <bdi> na tabela e no cartão, e não vaza para fora dele` |
| Um só id de foco nas duas larguras | `fila-a1.test.ts`; `fila-a1-qa.test.ts`; e2e CA-07.1 e CA-07.4 | `um só id de foco: o h2 do resultado, …`; **novo:** `um só id de foco, mesmo com tabela e lista no HTML`; `toHaveCount(1)` em `#resultado-da-fila` em 390 e 1280 px |
| D-02 (Recolhível) | `fila-a1.test.ts`; `fila-a1-qa.test.ts`; e2e | `Recolhivel (D-02; 03, 2.6)`; **novo:** `aria-controls do botão é o id do bloco, que existe uma vez e guarda os campos`; `celular › "Mais filtros (1 ativo)" …` |
| CV-01 | comando G4 | `git diff --stat 198e97d -- <lista do G4>` vazio |

### Testes acrescentados

- `e2e/fila-contadores.spec.ts`, só acréscimos (`git diff --stat`: 50 inserções, 0 remoções):
  - **novo** `CA-05.1 e CA-05.4: com tipo=bug, cada contador mostra o total da API para aquele status e tipo, na ordem`:
    - confere o nome acessível exato dos dez botões, na ordem, contra `GET /api/demandas?status=…&tipo=bug`;
    - tem uma pré-condição que torna o teste discriminante: o total sem filtro é maior que o total com `tipo=bug`;
    - prova que o filtro da URL chega à contagem pela página, e não só pela função.
  - **novo** `"Filtrar" com status na URL mantém o status (campo oculto) e aplica o tipo, com o foco no resultado`:
    - cobre a interação entre os contadores e "Mais filtros", que nenhum teste cobria;
    - com `status=pronta_para_decisao`, mudar o Tipo não muda a URL (WCAG 3.2.2);
    - "Filtrar" leva a `?status=pronta_para_decisao&tipo=melhoria`, o contador continua pressionado, o foco vai ao resultado e a região anuncia o total da API;
    - os contadores remontam com o tipo novo.
  - **reforço** em `celular › CA-07.1`: `main table` tem `toHaveCount(1)`, `getByRole('table')` tem `toHaveCount(0)` e `#resultado-da-fila` tem `toHaveCount(1)`.
  - **reforço** em `CA-07.4`, o Minor 3 da revisão: `main ul[aria-labelledby="resultado-da-fila"]` tem `toHaveCount(1)`, e `#resultado-da-fila` tem `toHaveCount(1)`.
- `src/app/(painel)/demandas/fila-a1-qa.test.ts` (novo, 6 testes de unidade, "agora" fixo):
  - número com milhar ("1.234") e zero com número e texto oculto;
  - tipo e linha ocultos juntos, na ordem, sem `offset`/`limit`;
  - `aria-controls` de "Mais filtros" aponta para o bloco único;
  - "Hoje" e "1 dia" na virada do dia em São Paulo (02:30Z = 23:30 do dia anterior) nas duas formas;
  - um só id de foco;
  - U+202E (montado por `String.fromCodePoint`, nunca cru) dentro de `<bdi>` nas duas formas.

### Resultado

- `pnpm test`: **225 arquivos, 4.954 de 4.954** (antes desta etapa: 224 e 4.948).
- `pnpm test:e2e` (suíte inteira): **198 de 198** (antes: 196). O ✘ do `vigia.spec.ts` é o negativo esperado
  (`test.fail()`).
- `pnpm lint` e `pnpm typecheck`: limpos.
- CV-01: o diff do G4 saiu vazio, e `src/modules` só mostra `resumo-da-fila.ts` e o teste dele (T07).

### Achado (Minor, não bloqueia): sem script, os contadores não filtram

O `ContadoresDaFila.tsx` (comentário do arquivo) e o plano (T09, "Comportamento") dizem: "sem script, o GET comum
filtra". Isso não acontece. Os contadores ficam num `Suspense`, e o fallback é o estado carregando, com os dez botões
`disabled` (03, 4.6). Sem script, o streaming não troca o fallback, e os botões ficam desabilitados para sempre.

Escrevi um e2e com `javaScriptEnabled: false` e `/demandas?tipo=bug`, e ele reprovou:

```
Error: expect(locator).toBeEnabled() failed
Locator:  getByRole('group', { name: 'Filtrar por status' }).getByRole('button', { name: /^Em análise/ })
Expected: enabled
Received: disabled
  14 × locator resolved to <button disabled type="submit" name="status" value="em_analise" aria-pressed="false" …>
```

Por que não devolvo:
- não é critério de aceite da T09;
- na 0.1.13 a lista já não sai do esqueleto sem script (Minor 1 da 06-T38-testes, aceito), então sem script não há
  fila útil de qualquer jeito;
- o "nenhum botão ativo no carregando" é desenho da 03, 4.6;
- a correção pede uma escolha de desenho, por exemplo botões ativos no fallback ou o desabilitado só depois de o React
  assumir.

Como o contrato não deixa teste vermelho nem com `.skip`, tirei o teste-sonda do spec. Ele não está no diff. A decisão
vai para Pendências.

## Decisões tomadas

- O status `pronto`, e não `devolvido`: todo critério de aceite da T09 tem teste verde. O achado sem script está fora
  dos critérios e esbarra no caminho sem script que já não funciona na 0.1.13.
- Os e2e novos só leem o seed e a API, e não criam demanda nem versão (C-36, G3.10). Eles calculam o esperado pela API
  na hora, para rodar também contra a homologação reaproveitada.
- O CA-06.4 é coberto pelo congelamento, e não por um e2e novo de comparação: `src/app/api` e
  `src/modules/demandas/consultas.ts` não mudaram desde 198e97d, e os testes de API de hoje passam sem mudança.
- Os reforços do CA-07.1 e do CA-07.4 só acrescentam asserções a testes da própria T09: nenhuma foi tirada nem afrouxada.

## Pendências

- **Para o `tech-lead` e a `ux-ui-design` (Minor, não bloqueia):** sem script, os dez contadores ficam `disabled`, e não
  há como filtrar por status. Era possível na 0.1.13, pelo seletor "Status" e "Filtrar". O comentário de
  `src/app/(painel)/demandas/ContadoresDaFila.tsx` (linhas 4 a 6) e o plano dizem o contrário. Há três caminhos:
  - o fallback dos contadores sem `disabled`, revendo a 03, 4.6;
  - o `disabled` aplicado só no cliente;
  - registrar que o painel exige script e corrigir o comentário.
  Na decisão, vale reativar o teste-sonda descrito na Entrega.
- **Para a `07-qa-funcional`:** junto com o Minor 5 da revisão, o caminho sem script, se a decisão acima mantiver o
  suporte.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — topo e09e16c (06-T09-revisao)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 5e3b0da` — 20 arquivos da T09
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d HEAD -- docs/construcao/DEC-DEM-20261110-0015-v1/01-analista-requisitos.md` — arquivo presente no ramo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 224 arquivos, 4948 de 4948 (antes dos testes novos)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 5e3b0da -- e2e/seguranca.spec.ts e2e/fila.spec.ts e2e/fila-qa.spec.ts` — só seletor, texto e passo equivalente; C-18 estendido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 5e3b0da -- "src/app/(painel)/demandas/fila-qa.test.ts"` — cada asserção que saiu tem substituta equivalente
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/fila-a1-qa.test.ts"` — 6 de 6
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fila-contadores.spec.ts` — 15 de 16; o teste-sonda sem script reprovou (achado), e foi retirado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio (CV-01, CA-06.4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d -- src/modules` — só `resumo-da-fila.ts` e o teste dele
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — só o spec e o teste novo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 1 arquivo, 64 inserções, 0 remoções (com o teste-sonda)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 198 de 198 (o negativo `vigia.spec.ts` é `test.fail()`)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — só os dois arquivos desta etapa, nenhum temporário
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 225 arquivos, 4954 de 4954
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 1 arquivo, 50 inserções, 0 remoções

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
