---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T09-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), tarefas.json, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7, T09), 06-T09-engenheiro-frontend.md, git show 5e3b0da (código da T09), git show ec88f88 e 8fb9257 (só entrega e registro), e2e/fila-contadores.spec.ts, e2e/fontes-qa.spec.ts, src/app/(painel)/demandas/leituras-da-fila.test.ts, src/app/(painel)/demandas/fila-a1.test.ts (linhas 1 a 120)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T09 (T03 Fila: contadores, tabela densa, cartões e filtros), código no commit `5e3b0da`; `ec88f88` e
`8fb9257` só mexem na entrega e no `passagens.jsonl`. Resultado: **aprovada**, sem Critical nem Important. Cinco
achados Minor, que vão para Pendências, e as três decisões que o engenheiro pediu, abaixo.

### Checklist da seção 12 do padrão técnico

- [x] **Faz o que o plano pede, nem mais nem menos.** Os arquivos criados e modificados são os da T09. Os únicos fora
  da lista "Arquivos" são `fila.test.ts`, `fila-qa.test.ts` e `fila-a1.test.ts`, testes de unidade dos próprios
  arquivos da tarefa; a decisão 3 cobre os dois primeiros. CV-01: o `git diff --stat 198e97d` do G4 saiu vazio. Em
  `src/modules` só aparecem `resumo-da-fila.ts` e o teste dele, os dois da T07. Em `package.json`, só as duas linhas
  `@fontsource` da T02. A árvore está limpa.
- [x] **Teste para cada comportamento novo, e ele falharia sem o código.**
  - CV-08: `leituras-da-fila.test.ts`, com o sentinela do SQL e o filtro fora do log, e a contagem chamada só com
    `tipo` e linha.
  - CV-06: `test/estatico/leituras-da-fila.test.ts`, com a cadeia `resumo-da-fila` → `leituras-da-fila` → página e a
    guarda lida pela árvore do TypeScript. Cada regra tem caso plantado.
  - RF-05 a RF-07, D-02 e um id de foco só: `fila-a1.test.ts`.
  - No navegador: `e2e/fila-contadores.spec.ts`, com 13 testes que cobrem CA-05.2, 05.3, 05.5, 05.6, 05.7, CA-06.1,
    06.3, CA-07.1 a 07.4 e RNF-03.
  - CV-18 no cartão em 390 px: o teste novo em `e2e/seguranca.spec.ts`, sem tirar nada do C-18.
  - A suíte de unidade foi vista falhando antes do código (trecho na entrega). O e2e não foi rodado no vermelho: ver
    Minor 4.
- [x] **Nenhum segredo, `.env` nem dado pessoal real.** Títulos com "(fictício)". O U+202E vem de
  `String.fromCodePoint`, e o título de `TITULOS_DO_E2E`, importado.
- [x] **Entrada externa validada.** Nenhuma rota nem Server Action nova. O filtro chega pelo `lerFiltroDaFila` de hoje
  (Zod). Os valores ocultos e os `href` dos contadores saem do filtro já validado e do enum (CV-07), e a contagem
  recebe só `tipo` e `linhaServicoProvavel`. O log da falha leva só evento, rota e o `erro` pelo redact do `log`, e o
  teste prova que o sentinela não aparece.
- [x] **Banco.** Não se aplica: nenhuma migration, esquema nem papel mudou.
- [x] **Nada duplica função existente.** Reaproveita `pedirFocoNoResultado` (agora exportado), `hrefDaFila`,
  `contadoresDaFila`, `idadeDaDemanda`, `textoDasEtapas`, `Selo`, `Cartao` e `Tabela`. Sobra uma constante de texto
  repetida: Minor 1.
- [x] **Textos em pt-BR; axe sem violação nas telas tocadas.** Os textos vêm de `TEXTOS_CONTADORES`, `TEXTOS_FILA` e
  `rotuloMaisFiltros`, todos da 03. O axe roda em 1280 px (com status injetado e com 100 por página) e em 390 px
  (cartões e "Mais filtros" aberto); `fila.spec.ts` e `fila-qa.spec.ts` seguem com o axe deles.
- [x] **Minor vai para Pendências.** Os cinco estão lá.
- [x] **PR (`/code-review`, `/security-review`).** Não se aplica nesta etapa: é da `08-revisao`, pelo G2.

### O que conferi além do checklist

- **A guarda C-04 vem antes das leituras novas** (`page.tsx`). `ContadoresDaPagina` e `ListaDaFila` só rodam dentro do
  JSX que `PaginaDemandas` devolve, depois de `exigirPessoaNaPagina` e de `autorizar(pessoa, 'listar_demandas')`.
  `fila-qa.test.ts` acrescenta que nenhuma das duas leituras é chamada sem permissão nem sem sessão.
- **Uma falha na lista é tratada como hoje.** `listarDemandas` e `etapasDaPagina` estão no mesmo `try`, com o
  `painel_fila_falhou` de hoje. O teste prova que a falha das etapas mostra o erro da lista, sem o sentinela na tela
  nem no log.
- **A falha da contagem não derruba a tela.** `contagemOuNada` devolve `null`, os dez botões continuam e aparece o
  texto da 03.
- **Um id de foco só.** O `h2#resultado-da-fila` existe uma vez nas duas larguras. O `caption` ficou `sr-only`, sem id
  (`legendaOculta`), e quem não passa a prop continua igual. No carregando, o h2 vem sem id, como o `caption` de hoje.
- **Responsivo só por CSS**, como a própria T09 do plano pede (tabela e lista no DOM, uma escondida por largura).
  `Recolhivel` segue o D-02: botão `md:hidden` com `aria-expanded`/`aria-controls`; o bloco fica no DOM e usa
  `max-md:hidden` enquanto fechado.
- **G3.4, G3.5 e G3.8.** Sem `style=` e sem `dangerouslySetInnerHTML`. Os SVG têm `aria-hidden`, e as cores usam nomes
  da 03 (`text-primaria` saiu de `fila.tsx` e `FiltrosFila.tsx`). A Idade usa `deps.relogio.agora()`.

### Decisões sobre os pedidos do engenheiro

1. **Peso do id na fila: vale a 03, e o id passa a Mono 600. A troca fica para a T16 e não bloqueia esta passagem.**
   - **A troca:** em `fila.tsx:94` e `CartoesDaFila.tsx:62`, o link do id ganha `font-semibold`.
   - **O teste:** `e2e/fontes-qa.spec.ts:89` passa a conferir a família do id carregada **no peso computado do id**
     (`getComputedStyle(id).fontWeight`, lido em `lerFontes`), e não mais no 400 fixo. Para isso, `carregadaNoPeso400`
     ganha o parâmetro de peso. As demais conferências continuam como estão:
     - família do id ≠ família do corpo;
     - os dois arquivos `noto_sans_mono_latin_400/600_normal` na família do id;
     - seis arquivos ao todo;
     - todos com `swap`;
     - o corpo carregado em 400.
   - **O G5 ganha a linha:** "`e2e/fontes-qa.spec.ts` | o peso conferido do id deixa de ser 400 fixo e passa a ser o
     peso computado do id | T16".
   - **Também na T16:** o comentário de `fila.tsx:90-91` sai.
2. **CA-05.7: a conferência nova está aceita.** O `page.content()` do esboço do plano reprovaria pelo dado de navegação
   que o Next guarda num `<script>` do próprio framework. Isso não é tela, atributo nem valor que o nosso código
   monta. A versão entregue confere o que o CV-07 protege:
   - o `main` sem `%3Cscript%3E`;
   - nenhum `value`/`href` com `<`, `%3C` ou `script`;
   - os dez valores dos botões e os campos `status` ocultos dentro do enum;
   - nenhum `tipo` oculto depois do filtro recusado;
   - um só pressionado.
   O esboço do plano fica substituído por ela. A `08-revisao` refaz essa leitura no `/security-review`.
3. **As mudanças em `fila.test.ts` e `fila-qa.test.ts` fora do G5 estão aceitas e entram no G5 com esta revisão.**
   Conferi o diff trecho a trecho, e cada asserção que saiu tem substituta equivalente ou mais forte:
   - **O seletor "Status" saiu**, como a T09 do plano manda, e cada conferência dele passou para o campo oculto e para
     os contadores, com os mesmos valores, a mesma ordem e os mesmos rótulos.
   - **`selected` passou de 3 para 2**, porque o terceiro campo deixou de ser seleção. O estado dele continua
     conferido por duas asserções novas: o campo oculto vazio e só "Todas" pressionado.
   - **"Rascunho de agente" contado 1 vez na página virou 1 vez em cada forma.** É a regra certa com tabela e lista no
     DOM.
   - **O `<time>` com a data virou o `<time>` com a idade**, mais "criada em dd/mm/aaaa", e o `dateTime` é conferido.
     As colunas são as da 03.
   - **A ordem dos ids passou a ser conferida na tabela, e a da lista contra ela.** Ficou mais forte.
   - **Só foram acrescentados:** os dublês de `relogio` e de `./leituras-da-fila`, e `ContadoresDaPagina` em
     `ASSINCRONOS`.

   O `{ exact: true }` em `fila-qa.spec.ts` também está aceito: só troca o seletor (G3.2). A suíte inteira passou,
   com o piso de asserções do D-12.

### Outros desvios declarados pelo engenheiro

- **Marcas ESP/RSK/DEC em 12 px, e não em 11.** Aceito: vale a regra geral da 03 (2.3, nenhum texto abaixo de 12 px).
  A `ux-ui-design` fica avisada pela Pendência 6.
- **"N demandas encontradas." fora do lado do h2.** Aceito: a região de aviso tem de ficar fora do Suspense que
  remonta, senão o leitor de tela não anuncia.
- **CA-06.1 com o texto exato "ESP feita, RSK feita, DEC por fazer" só no teste de unidade.** Aceito: no e2e, o nome da
  célula é conferido contra a API em três demandas do seed, sem gravar versão (C-36).

### Pareceres (todos Minor; nenhum bloqueia)

| # | Arquivo:linha | Problema | Razão |
|---|---|---|---|
| 1 | `src/app/(painel)/demandas/CartoesDaFila.tsx:20` | `NAO_INFORMADA = 'Não informada'` repete `TEXTOS_FILA.naoInformada` (`fila.tsx:34`) | São dois lugares para o mesmo texto da 03, e eles podem divergir numa troca de texto. Mover a constante para `CartoesDaFila.tsx`, com `fila.tsx` reusando dali (o mesmo caminho do `ID_RESULTADO`, que evita o ciclo), ou para `dados-da-fila.ts` |
| 2 | `src/app/(painel)/demandas/CartoesDaFila.tsx:56` e `page.tsx:97` | A classe da etiqueta Mono em caixa alta está escrita duas vezes | O estilo da etiqueta da 03 fica em dois lugares. Exportar uma constante só |
| 3 | `e2e/fila-contadores.spec.ts:246` | `toBeHidden()` também passa quando a lista nem existe no DOM | Assim, o CA-07.4 não prova que a lista está no DOM e só fica escondida em 1280 px. Acrescentar `toHaveCount(1)` no mesmo localizador. Fica para a `qa-automacao` na 06-T09-testes |
| 4 | `06-T09-engenheiro-frontend.md` (Desvios) | O e2e novo não foi visto falhando antes do código | Pede o G3.1. O risco é baixo, porque os testes dependem do grupo "Filtrar por status", do h2 e da lista, que não existiam. Mas o CA-07.3 e o CA-07.4 passariam no código antigo (ver o 3). Nas próximas tarefas do `engenheiro-frontend`, rodar o spec novo no vermelho e citar o trecho |
| 5 | `src/app/(painel)/demandas/CartoesDaFila.tsx:68-74` | O selo de rascunho fica em linha própria, abaixo do `h3`, e não ao lado do título como na 03, 4.4 | No celular, o selo quebra de linha de qualquer jeito, e a leitura não muda. Fica para a `07-qa-funcional` olhar junto com o arranjo |

## Decisões tomadas

- A T09 está aprovada com status `pronto`: o checklist da seção 12 foi cumprido, CV-01 está vazio e `pnpm test`, `pnpm
  lint` e `pnpm typecheck` passaram nesta revisão. Os cinco achados são Minor e não bloqueiam.
- O id passa a Mono 600 na T16, com `fontes-qa.spec.ts:89` conferindo o peso computado do id. O peso é decisão da
  `ux-ui-design`, e o tech-lead não muda o desenho para caber num teste: o teste confere a família carregada, e o 400
  era só o peso de quando ele foi escrito. É Minor (visual, sem efeito em função, acessibilidade ou segurança) e
  entra antes das capturas da T17.
- CA-05.7: fica a conferência por `main`, atributos e enum. O esboço do plano testava o dado interno do Next, não o
  HTML que montamos.
- `fila.test.ts`, `fila-qa.test.ts` e o `{ exact: true }` de `fila-qa.spec.ts` entram no G5 da T09: são consequência
  direta do que a T09 manda, e nenhuma asserção saiu sem substituta equivalente.
- `proximo` é `qa-automacao`: a etapa seguinte da cadeia é a `06-T09-testes`.

## Pendências

- **1. Para o maestro, na chamada da T16 (`engenheiro-frontend`):** pôr Mono 600 no id da fila (`fila.tsx:94` e
  `CartoesDaFila.tsx:62`) e trocar a conferência de `e2e/fontes-qa.spec.ts:89` para o peso computado do id, como
  descrito na decisão 1 da Entrega. Tirar também o comentário de `fila.tsx:90-91`. Essa linha entra no G5.
- **2. Para a `qa-automacao` (06-T09-testes):** o Minor 3, com `toHaveCount(1)` na lista em 1280 px, no
  `e2e/fila-contadores.spec.ts:246`.
- **3. Para o `engenheiro-frontend`, numa tarefa seguinte que toque os arquivos:** os Minor 1 e 2 (a constante "Não
  informada" e a classe da etiqueta, cada uma num lugar só).
- **4. Para o `engenheiro-frontend`, nas próximas tarefas:** o Minor 4, rodar o spec e2e novo no vermelho e citar o
  trecho. Também vale o aviso do engenheiro: na T11 a T13, usar `getByLabel(..., { exact: true })` quando a lista de
  cartões estiver na tela.
- **5. Para a `07-qa-funcional`:** o Minor 5 (selo de rascunho abaixo do título no cartão).
- **6. Para a `ux-ui-design`, só ciência:** as marcas de etapa ficaram em 12 px, pela regra da 03, 2.3, e não em 11.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 5e3b0da` — 20 arquivos, todos da T09 ou testes deles
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat ec88f88` — só a entrega e o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -25` — topo ec88f88; 8fb9257 entre os dois commits da T09
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 8fb9257` — só o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 5e3b0da -- "src/app/(painel)/demandas/fila.test.ts"` — diff conferido trecho a trecho
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 5e3b0da -- "src/app/(painel)/demandas/fila-qa.test.ts"` — diff conferido trecho a trecho
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 5e3b0da -- "src/app/(painel)/demandas/page.tsx" "src/app/(painel)/demandas/leituras-da-fila.ts" "src/app/(painel)/demandas/fila.tsx" "src/components/Tabela.tsx" "src/components/Recolhivel.tsx" "src/components/MarcasDeEtapa.tsx"` — código revisado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 5e3b0da -- "src/app/(painel)/demandas/ContadoresDaFila.tsx" "src/app/(painel)/demandas/CartoesDaFila.tsx" "src/app/(painel)/demandas/FiltrosFila.tsx"` — código revisado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 5e3b0da -- e2e/fila.spec.ts e2e/fila-qa.spec.ts e2e/seguranca.spec.ts` — só seletor, texto e passo equivalente; C-18 estendido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 5e3b0da -- test/estatico/leituras-da-fila.test.ts` — cadeia CV-06 e guarda com casos plantados
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio (CV-01)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d -- src/modules package.json` — só `resumo-da-fila.ts` e o teste dele (T07) e `package.json` com as 2 linhas da T02
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 224 arquivos, 4948 de 4948

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
