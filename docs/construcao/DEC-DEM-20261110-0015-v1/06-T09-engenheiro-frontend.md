---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T09-construcao
agente: engenheiro-frontend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7, T08, T09, T10 e T11), 01-analista-requisitos.md (glossário, RF-05 a RF-07), 03-ux-ui-design.md (seções 0 a 4, 9, 10 e 11), 04-seguranca-aplicacao.md (CV-06, CV-07, CV-08, CV-18), 06-T06-engenheiro-backend.md, 06-T06-tech-lead.md, 06-T06-qa-automacao.md, 06-T07-qa-automacao.md, 06-T08-qa-automacao.md, src/app/(painel)/demandas/page.tsx, fila.tsx, FiltrosFila.tsx, fila.test.ts, fila-qa.test.ts, src/app/(painel)/layout.tsx, src/app/globals.css, src/components/Tabela.tsx, Selo.tsx, Cartao.tsx, Esqueleto.tsx, Botao.tsx, Paginacao.tsx, RegiaoAviso.tsx, rotulos.ts, dados-da-fila.ts, casca/ItensDoMenu.tsx, tokens-em-uso.test.ts, src/modules/demandas/resumo-da-fila.ts, src/lib/deps.ts, src/app/api/demandas/[id]/especificacoes/route.ts, test/estatico/leituras-da-fila.test.ts, piso-de-assercoes.test.ts, cores-so-por-token.test.ts, sem-recurso-externo.test.ts, e2e/apoio.ts, fila.spec.ts, fila-qa.spec.ts, seguranca.spec.ts, axe-todas.spec.ts, fontes-qa.spec.ts, scripts/seed-ficticio.ts (TITULOS_DO_E2E), playwright.config.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T09, a T03 Fila no arranjo A1: contadores que filtram, tabela densa com Etapas e Idade, lista de cartões abaixo de
768 px, "Mais filtros" no celular e as duas leituras novas ligadas à página (D-08). Nenhuma rota, Server Action,
esquema, migration nem arquivo de `src/modules/` mudou.

### Arquivos criados

- `src/app/(painel)/demandas/leituras-da-fila.ts`: D-08. `contagemOuNada(db, filtro)` passa só `tipo` e
  `linhaServicoProvavel` a `contarDemandasPorStatus`. Na falha, devolve `null` e grava
  `log.error({ evento: 'painel_contadores_falhou', rota: '/demandas', erro })` (CV-08). `etapasDaPagina` é
  `etapasDasDemandas`, sem embrulho.
- `src/app/(painel)/demandas/ContadoresDaFila.tsx` (cliente), 03, 4.5:
  - um `form` GET para `/demandas` com `div role="group" aria-label="Filtrar por status"`;
  - dez `<button type="submit" name="status" value aria-pressed>`, na ordem de `ROTULO_STATUS`;
  - em cada botão: ponto da cor do selo (`aria-hidden`), visto no pressionado, número em Mono e
    `TEXTOS_CONTADORES.demandas(n)` oculto;
  - `tipo` e `linhaServicoProvavel` ocultos depois do grupo, só os do filtro validado (CV-07);
  - o `onSubmit` lê o `submitter`, acha o `href` já montado no servidor por `contadoresDaFila`, chama
    `pedirFocoNoResultado` e faz `router.push`. Sem script, o GET comum filtra;
  - estados: carregando (`aria-busy`, barra escondida e botões desabilitados) e erro (sem número, com
    `TEXTOS_CONTADORES.erro` abaixo do grupo).
- `src/app/(painel)/demandas/CartoesDaFila.tsx`, 03, 4.3 e 4.4:
  - `ul aria-labelledby="resultado-da-fila"` com a classe `md:hidden`;
  - um cartão por demanda: o id como link com 44 px de altura, o selo de status, `h3` com o título dentro de `<bdi>`
    (CV-18), o selo de rascunho e um `dl` com Tipo, Urgência, Linha de serviço, Etapas e Idade;
  - também exporta as células que a tabela e o cartão dividem (`IdadeDaDemanda`, `UrgenciaDaDemanda`, `etapasDe`) e o
    `ID_RESULTADO`, que `fila.tsx` reexporta.
- `src/components/MarcasDeEtapa.tsx`: o texto fixo do RF-06 só para leitor de tela, mais ESP, RSK e DEC com
  `aria-hidden`. Feita: fundo `marinho`. Por fazer: borda tracejada `tinta-suave`.
- `src/components/Recolhivel.tsx` (cliente), D-02: botão `md:hidden` com `aria-expanded` e `aria-controls`. O bloco
  usa `max-md:hidden` enquanto fechado e fica no DOM uma vez só.
- Testes: `src/app/(painel)/demandas/leituras-da-fila.test.ts`, `src/app/(painel)/demandas/fila-a1.test.ts` e
  `e2e/fila-contadores.spec.ts`.

### Arquivos modificados

- `src/app/(painel)/demandas/page.tsx`:
  - etiqueta "Fila" e ícone "+" no "Nova demanda";
  - `ContadoresDaPagina` (lê `contagemOuNada`) num `Suspense` próprio, com chave `contadores <tipo> <linha>` e os
    contadores carregando como fallback;
  - o resultado num `Cartao`: filtros, região de aviso, lista;
  - `ListaDaFila` lê `listarDemandas` e depois `etapasDaPagina(ids)` no mesmo `try`. A falha de qualquer das duas
    mostra `ErroDaFila` com o log `painel_fila_falhou` de hoje;
  - o "agora" da Idade é `deps.relogio.agora()`;
  - a guarda `exigirPessoaNaPagina` → `autorizar(pessoa, 'listar_demandas')` continua antes do `return`.
- `src/app/(painel)/demandas/fila.tsx`:
  - colunas Id, Título, Tipo, Status, Etapas, Urgência, Linha de serviço, Idade;
  - título do resultado em `h2#resultado-da-fila` com `tabindex="-1"`, e a tabela com `legendaOculta`;
  - a tabela fica em `div.max-md:hidden`, e a lista de cartões vem logo abaixo;
  - o carregando ganhou a lista de 3 cartões de esqueleto, com o texto oculto uma vez só;
  - o título fica dentro de `<bdi>`;
  - "Limpar filtros" ganhou 44 px.
- `src/app/(painel)/demandas/FiltrosFila.tsx`:
  - sai o seletor "Status" e entra `<input type="hidden" name="status">` como primeiro campo, com o status validado;
  - Tipo, Linha, "Filtrar" e "Limpar filtros" dentro do `Recolhivel` "Mais filtros", com o rótulo de
    `rotuloMaisFiltros(n)`;
  - `pedirFocoNoResultado` passou a ser exportado.
- `src/components/Tabela.tsx`: prop opcional `legendaOculta`, que deixa o `caption` com `sr-only`, sem id nem foco. Sem
  a prop, nada muda.
- `test/estatico/leituras-da-fila.test.ts`: novo `describe` "CV-06 (T09): a cadeia até a página":
  - `resumo-da-fila` só é importado por `leituras-da-fila.ts`, e este só pela página;
  - a página chama `contagemOuNada(` e `etapasDaPagina(`;
  - no corpo de `PaginaDemandas`, lido pela árvore do TypeScript, `exigirPessoaNaPagina(` vem antes de
    `autorizar(pessoa, 'listar_demandas')`, e os dois antes do primeiro `return`;
  - casos plantados provam cada regra;
  - `importadoresDe` ganhou um 2º parâmetro opcional; as chamadas antigas continuam iguais.
- `e2e/seguranca.spec.ts`: teste novo do CV-18, sem tirar nada do C-18. A demanda `textoDeTerceiro` do seed aparece em
  390 px no cartão da T03 com o texto literal, `h3 > bdi`, sem `img` nem `script` no `main`, `window.__xss` indefinido
  e nenhum diálogo. O título vem de `TITULOS_DO_E2E.textoDeTerceiro`, importado, e o U+202E é conferido por
  `String.fromCodePoint(0x202e)`, nunca cru.

### Testes que já existiam e mudaram (G3.2, trecho a trecho)

- `e2e/fila.spec.ts` (previsto no G5):
  - foco: `page.getByText(LEGENDA)` passou a `getByRole('heading', { level: 2, name })`. Com o `caption` oculto do
    mesmo texto, o `getByText` acharia dois elementos;
  - `getByLabel('Status')`: o valor esperado agora é conferido no contador pressionado;
  - CA-26.1: o seletor de status virou o contador. A asserção da WCAG 3.2.2 (`not.toHaveURL(/status=/)` ao mudar a
    seleção) continua, agora com o seletor "Tipo", que ainda existe, e ganhou `not.toHaveURL(/tipo=/)`;
  - região rolável: conferida em 768 px, a menor largura com tabela (RF-07 tira a tabela abaixo de 768 px). Os 320 px
    continuam com `scrollWidth ≤ 320` e axe.
- `e2e/fila-qa.spec.ts` (previsto no G5): foco no h2; coluna "Linha de serviço" da 6ª para a 7ª; "Status" vazio
  conferido no campo oculto. Fora do G5: `getByLabel('Tipo'/'Linha de serviço')` passou a `{ exact: true }`. A lista
  de cartões tem o nome "Demandas com tipo Bug, …", que contém "tipo", e o seletor achava dois elementos.
- `src/app/(painel)/demandas/fila.test.ts` (fora do G5, consequência da T09):
  - as chamadas de `ResultadoDaFila` ganharam `etapas` e `agora`;
  - o id de foco passou do `caption` ao `h2`, e entraram as colunas novas;
  - o `<time>` mostra "19 dias", e a data ficou em "criada em 22/10/2026";
  - a urgência ganhou o ponto;
  - "Rascunho de agente" uma vez **em cada forma** (tabela e lista), e não uma vez na página;
  - as asserções do seletor "Status" passaram ao campo oculto e aos botões dos contadores (mesmos valores e rótulos).
- `src/app/(painel)/demandas/fila-qa.test.ts` (fora do G5):
  - dublês novos: `relogio` em `obterDeps` e `./leituras-da-fila`;
  - `ContadoresDaPagina` entrou em `ASSINCRONOS`, e as chamadas de `ResultadoDaFila` ganharam `etapas` e `agora`;
  - urgência com o ponto; ordem dos ids conferida na tabela, e a da lista é igual;
  - opções de status passaram a ser os valores dos contadores; "três seleções marcadas" virou duas, mais o oculto vazio
    e só "Todas" pressionado;
  - asserções acrescentadas: leituras novas não chamadas sem permissão nem sem sessão, e um `describe` novo das leituras.
- Nenhuma asserção apagada, nenhum `.skip`, `.only`, `retries`, tempo-limite nem regra do axe mexida.

### Visto falhando antes do código

`pnpm -C <repo> test "src/app/(painel)/demandas/fila" "src/app/(painel)/demandas/leituras-da-fila" test/estatico/leituras-da-fila.test.ts`,
com os testes escritos e o código ainda sem mudança: 5 arquivos falharam, 3 testes falharam e 10 passaram. Trecho:

```
FAIL  src/app/(painel)/demandas/fila-a1.test.ts
Error: Cannot find module '/src/components/Recolhivel' imported from …/fila-a1.test.ts
FAIL  src/app/(painel)/demandas/leituras-da-fila.test.ts
Error: Cannot find module '/src/app/(painel)/demandas/leituras-da-fila' …
 FAIL  test/estatico/leituras-da-fila.test.ts > CV-06 (T09): a cadeia até a página > a página chama as duas leituras
AssertionError: expected "// T03 Fila de demandas …" to match /\bcontagemOuNada\(/
```

A regra da guarda passou já no vermelho: a página de hoje cumpre a ordem, e os casos plantados provam que a regra
reprova.

### Resultado

- `pnpm test`: **224 arquivos, 4.948 de 4.948**.
- `pnpm test:e2e` (suíte inteira): **196 de 196**. O negativo `vigia.spec.ts` é `test.fail()`.
  - Os 13 testes novos de `e2e/fila-contadores.spec.ts` passaram. Rodam axe em 1280 px (status injetado, 100 por
    página) e em 390 px (cartões e "Mais filtros" aberto).
  - Na rodada anterior, 2 testes falharam e foram corrigidos (ver Decisões).
- `pnpm lint` e `pnpm typecheck`: limpos.
- CV-01: o `git diff --stat 198e97d -- <lista do G4>` saiu vazio, e `src/modules` só tem os dois arquivos da T07.

### Desvios do plano

- O e2e foi escrito antes do código, mas eu não o rodei no vermelho. Só a suíte de unidade foi vista falhando (trecho
  acima).
- `page.content()` sem `%3Cscript%3E`, do esboço do CA-05.7, não tem como passar. O Next guarda o endereço pedido no
  dado de navegação, dentro de um `<script>` do próprio framework. Por isso a conferência passou a ser:
  - o `main` sem o texto injetado;
  - nenhum `value`/`href` com `<`, `%3C` ou `script`;
  - os valores dos campos ocultos e dos botões dentro do enum;
  - nenhum `tipo` oculto.
- CA-06.1: o e2e compara o nome da célula com o que a API diz (ESP, RSK e DEC de cada demanda) em `espListaDeTextos`,
  `etapasDupla` e `etapasSemVersoes`. O texto exato "ESP feita, RSK feita, DEC por fazer" está no teste de unidade. A
  demanda do seed com ESP e RSK sem DEC não existe sem gravar versão, e não gravei nenhuma (C-36).
- O id do cartão e da tabela ficou em **Mono 400**, e não em Mono 600 como pede a 03 (4.4). Com 600, o
  `e2e/fontes-qa.spec.ts` (T02) reprova: ele confere a Mono 400 carregada pelo id da T03. Mudar esse teste estaria
  fora do G5. Vai para Pendências.
- As marcas ESP/RSK/DEC ficaram em 12 px, e não 11. A 03, 2.3, diz "nenhum texto abaixo de 12 px".
- "N demandas encontradas." (a região de aviso de hoje, `AvisoDaFila`) ficou entre os filtros e o título, e não ao lado
  do h2. A região tem de ficar fora do Suspense que remonta, para o leitor de tela anunciar.

## Decisões tomadas

- `ID_RESULTADO` passou a ser declarado em `CartoesDaFila.tsx` e reexportado por `fila.tsx`: a lista leva o nome do h2
  sem importar `fila.tsx`, o que faria ciclo.
- Demanda sem entrada no mapa de etapas mostra "por fazer": a tela nunca diz "feita" sem a leitura dizer.
- Os campos ocultos dos contadores vêm depois do grupo. Assim, com ou sem script, o endereço sai como
  `status=…&tipo=…`, na ordem de `hrefDaFila`.
- Carregando: os contadores ficam desabilitados ("sem botão ativo", 03, 4.6).
- CA-05.2 e CA-07.2 contam no máximo 20 linhas/cartões (`Math.min(total, 20)`): na suíte inteira há 40 demandas em
  "Nova", e na homologação pode haver mais. Foi a falha da 1ª rodada inteira.
- Contadores com chave só de `tipo` e `linha`: trocar de status não remonta o grupo (plano, T09).

## Pendências

- Para o `tech-lead`, sem bloquear: comandos fora da lista Pode. Rodei `git grep -n -e "CV-06" …` (só leitura, no
  `04-seguranca-aplicacao.md`) e `wc -l` num arquivo de saída do scratchpad, fora do repositório, antes de lembrar da
  restrição. Os dois só leem e não mudaram nada. Ficam declarados em Comandos executados, para o maestro decidir pela
  regra de 25/10.
- Para o `tech-lead` e a `ux-ui-design`, sem bloquear: o peso do id da fila. A 03 pede Mono 600, e o
  `e2e/fontes-qa.spec.ts:89` exige a Mono 400 carregada pelo id da T03. Há dois caminhos:
  - o G5 ganha a troca do peso nesse teste para 600 (a família continua conferida), e o id passa a 600;
  - o id fica em 400.
- Para a T11 a T13 (`engenheiro-frontend`): `getByLabel('Tipo')` sem `exact` acha também a lista de cartões quando há
  filtro por tipo ou linha. Os seletores novos usam `{ exact: true }`.
- Minor: o selo de rascunho no cartão está num `<span>` próprio, abaixo do título. A 03 põe o selo ao lado; no
  celular ele quebra para a linha seguinte de qualquer jeito.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- "src/app/(painel)/demandas" e2e src/components test src/lib` — lista dos arquivos rastreados
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -15` — topo 3370f04 (06-T08-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only -G "caption|getByLabel\('Status'\)|Criada em|resultado-da-fila|ID_RESULTADO|filtro-status" 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- e2e src test` — quem usa os seletores que mudam
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "CV-06" -e "CV-07" -e "CV-08" -e "CV-18" -- docs/construcao/DEC-DEM-20261110-0015-v1/04-seguranca-aplicacao.md` — fora da lista Pode (ver Pendências)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -U3 -G "TITULOS_DO_E2E|espListaDeTextos|textoDeTerceiro" 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD --stat -- scripts e2e` — quem usa os títulos do seed
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- src/app/api/demandas src/modules/demandas` — lista das rotas e módulos de demandas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/fila" "src/app/(painel)/demandas/leituras-da-fila" test/estatico/leituras-da-fila.test.ts` — vermelho: 5 arquivos falharam, 3 de 13 testes falharam
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/fila" "src/app/(painel)/demandas/leituras-da-fila" test/estatico/leituras-da-fila.test.ts` — 7 falharam (ordem do atributo `name` no HTML do React e ordem de `ROTULO_STATUS` nos testes novos)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/fila" "src/app/(painel)/demandas/leituras-da-fila" test/estatico/leituras-da-fila.test.ts` — 5 arquivos, 136 de 136
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 224 arquivos, 4948 de 4948
- `wc -l /home/deploy/.claude/projects/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/tool-results/bp8thenb5.txt` — fora da lista Pode (ver Pendências); 449 linhas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fila-contadores.spec.ts e2e/fila.spec.ts e2e/fila-qa.spec.ts e2e/seguranca.spec.ts` — 6 de 28 falharam
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fila-qa.spec.ts e2e/fila-contadores.spec.ts --grep "Voltar|Limpar filtros|sem script|Mais filtros|CA-05.7"` — 5 de 6 falharam (`page.content()` com o endereço no dado do Next)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fila-qa.spec.ts e2e/fila-contadores.spec.ts --grep "Voltar|Limpar filtros|sem script|Mais filtros \(1|CA-05.7"` — 4 de 6 falharam (`getByLabel('Tipo')` achava também a lista; 429 do TOTP por logins seguidos)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só os arquivos da tarefa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio (CV-01)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d -- src/modules` — só `resumo-da-fila.ts` e o teste dele (T07)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 10 arquivos rastreados alterados
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 2 de 196 falharam (CA-07.2 com 40 em "Nova"; `fontes-qa` sem a Mono 400 depois do id em 600)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 196 de 196
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 224 arquivos, 4948 de 4948
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — só os 18 arquivos da tarefa, nenhum temporário

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas
