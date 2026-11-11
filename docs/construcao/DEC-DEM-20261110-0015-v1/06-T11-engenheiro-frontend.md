---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T11-construcao
agente: engenheiro-frontend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7, T10 fim, T11), 01-analista-requisitos.md (RF-08 a RF-10), 03-ux-ui-design.md (seções 0, 2.1 a 2.6, 5, 9, 10, 11), 06-T06-engenheiro-backend.md, 06-T09-engenheiro-frontend.md, 06-T10-engenheiro-backend.md, 06-T10-tech-lead.md, 06-T10-qa-automacao.md, src/app/(painel)/demandas/[id]/page.tsx, Historico.tsx, detalhe.ts, LinkNestaPagina.tsx, detalhe.test.ts, detalhe-qa.test.ts, src/app/(painel)/demandas/page.tsx, CartoesDaFila.tsx, formularios-paginas-qa.test.ts (T05), src/app/(painel)/layout.tsx, src/app/(painel)/pacotes-decisao/[decId]/page.tsx (início), src/app/globals.css, src/components/dados-das-etapas.ts, Cartao.tsx, Botao.tsx, Selo.tsx, MarcasDeEtapa.tsx, tokens-em-uso.test.ts, src/modules/pacotes-decisao/consultas.ts, src/modules/historico/consultas.ts, src/app/api/demandas/[id]/historico/route.ts, scripts/seed-ficticio.ts (CONTAS_FICTICIAS, TITULOS_DO_E2E, DEMANDAS_DO_E2E), test/estatico/importacoes.ts, leituras-da-fila.test.ts, piso-de-assercoes.test.ts, cores-so-por-token.test.ts, painel-qa.test.ts, e2e/apoio.ts, detalhe-demanda.spec.ts, seguranca.spec.ts, casca.spec.ts, casca-qa.spec.ts, axe-todas.spec.ts (início e T05), playwright.config.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T11, a T05 Detalhe da demanda no arranjo A2 (03, seção 5): trilha, cabeçalho novo, barra das cinco etapas (RF-08),
cartão "Próxima ação" (RF-09) e as seções de hoje em cartões, com o histórico em lista (RF-10). A partir de 1200 px a
Próxima ação e o Histórico vão para a coluna lateral só pela grade; a ordem do DOM é a da 03. Nenhuma rota, Server
Action, esquema, migration nem arquivo de `src/modules/` mudou.

### Arquivos criados

- `src/components/LinhaDoTempo.tsx`: o histórico em `ol` (03, 5.6).
  - Antes da lista vem "Do mais novo para o mais antigo.".
  - Cada item tem um marcador `aria-hidden`, o texto do evento e "Antes: … Depois: …" só quando há valor (parte vazia
    omitida). Embaixo vêm quem, o separador " · " `aria-hidden` e o `<time dateTime>`.
  - Todos os eventos aparecem, sem corte. Os textos estão em `TEXTOS_LINHA_DO_TEMPO`.
- `src/app/(painel)/demandas/[id]/BarraDeEtapas.tsx` (03, 5.4):
  - um `ol aria-label="Etapas da demanda"` num `Cartao`, com cinco colunas a partir de 1200 px e uma lista vertical com
    fio abaixo disso;
  - marca por forma, `aria-hidden`, com `data-marca` estável para teste: feita é marinho com visto, atual é ação com o
    número e anel, por fazer é tracejada com o número;
  - nome em `strong`, id da versão em Mono ou "Nenhuma", estado em texto com a cor da 03;
  - `aria-current="step"` só na etapa atual.
- `src/app/(painel)/demandas/[id]/CartaoProximaAcao.tsx` (03, 5.5):
  - `section aria-labelledby="proxima-acao"` com `superficie-escura` e fundo marinho;
  - `h2` como etiqueta `azul-claro`, o que falta em 18 px, o detalhe quando há, e "Quem age:" com o texto;
  - link `claro-sobre-escuro` quando há destino. O destino `secao` vira `LinkNestaPagina` para `ID_SECAO.duvidas` ou
    `ID_SECAO.status` (D-10).
- `test/estatico/detalhe-dec.test.ts`: o CV-09 na página, lido pela árvore do TypeScript no corpo de `PaginaDemanda`.
  - `autorizar(pessoa, 'ler_pacote_decisao')` vem antes de todo `obterPacoteDecisao(`.
  - O id passado é o `.id` de uma constante tirada de `d.pacotesDecisao[0]`.
  - A página chama `etapasDaDemanda(` e `proximaAcao(`.
  - Casos plantados reprovam: leitura antes da autorização, autorização ausente ou de outra ação, e id vindo de
    `params`, de `searchParams`, de um literal, de `d.pacotesDecisao[1]` ou ausente. Também reprovam a falta da leitura
    e a falta de cada regra.
- `e2e/detalhe-a2.spec.ts`, 6 testes, só leitura (C-36):
  - CA-08.1 e CA-09.1 na `etapasDupla`: estados, ids, etapa 4 atual, cartão para a "Administradora" com o detalhe da
    linha 8 e "Abrir a decisão" para `/pacotes-decisao/DEC-<id>-v1`. Também confere que nenhum nome aparece no cartão
    nem na barra (CV-09), roda o axe em 1280 e em 390 px e clica no link;
  - CA-08.2 na `etapasSemVersoes`: Especificação "Por fazer", "Nenhuma" e atual, e a linha 4 com o link para a T07.
    Roda o axe nas duas larguras;
  - CA-10.1: em 1280 e em 390 px, as cinco seções existem, cada link de "Nesta página" foca o `h2` e não há rolagem
    lateral;
  - arranjo A2: em 1280 px, Próxima ação à direita de Dados e Histórico abaixo dela, na mesma coluna; em 390 px, uma
    coluna na ordem do DOM;
  - CA-10.2: o número de itens e a ordem dos `<time>` são iguais aos de `GET /api/demandas/:id/historico`. A lista não
    tem tabela nem "Ver histórico completo";
  - "Mudar status" do cabeçalho foca o `h2` Status; a trilha tem "Demandas" e o id com `aria-current="page"`.

### Arquivos modificados

- `src/app/(painel)/demandas/[id]/page.tsx`:
  - leitura nova: `const decResumo = d.pacotesDecisao[0]`, `if (decResumo) autorizar(pessoa, 'ler_pacote_decisao')`
    antes do `Promise.all`, e `obterPacoteDecisao(deps.db, decResumo.id)` no mesmo `Promise.all`. O id nunca vem da URL;
  - `etapasDaDemanda` e `proximaAcao` recebem a mesma `esp` que a página já lê, o DEC mais novo, o histórico inteiro e
    `temSecaoDeDuvidas = duvidas !== null` (pendências da T10);
  - `Trilha`, e o cabeçalho com id, selos, "Urgência: <rótulo>" com o ponto (só quando informada), `h1` com `<bdi>`,
    "Editar dados" e "Mudar status" (`LinkNestaPagina` para o `h2` Status). Os links de "Nesta página" têm 44 px abaixo
    de 768 px;
  - `BarraDeEtapas` depois dos alertas. A grade `grid-cols-1 … xl:grid-cols-3` tem a Próxima ação primeiro no DOM
    (`xl:col-start-3 xl:row-start-1`), as seções em `Cartao` na coluna principal e o Histórico por último
    (`xl:col-start-3 xl:row-[2/-1]`, com a última linha `1fr`);
  - Dados num `dl` em grade de 2 colunas a partir de 768 px, com o termo como etiqueta. Os campos longos ocupam a linha
    toda; os 12 itens e os textos não mudaram. Dúvidas têm borda esquerda `atencao`;
  - classes antigas trocadas pelos tokens da 03 nas linhas tocadas (`text-primaria` virou `text-acao-escura`;
    `text-texto-suave` virou `text-tinta-media`).
- `src/app/(painel)/demandas/[id]/Historico.tsx`: monta os itens com `textoDoEvento`, `valoresDoEvento` e `rotuloAtor`
  de hoje e usa a `LinhaDoTempo`.
- `src/app/(painel)/demandas/[id]/detalhe.ts`: `TEXTOS_DETALHE` ganhou `trilha`, `trilhaDemandas` e
  `urgenciaNoCabecalho`, da 03, seção 9. Saiu o bloco `historico` (legenda, região e colunas da tabela). Antes de tirar,
  conferi que só `Historico.tsx` e o parser do `detalhe-qa.test.ts` o usavam.
- `src/app/(painel)/demandas/CartoesDaFila.tsx`: só `export` em `COR_DA_URGENCIA`, para o ponto do cabeçalho usar as
  mesmas cores da fila sem cópia.
- `e2e/seguranca.spec.ts`: teste novo do CV-18 na T05 da `textoDeTerceiro`, em 1280 e em 390 px.
  - Confere: `main h1` e `main h1 > bdi` com o título literal, a trilha só com o id, a barra com 5 itens e a Próxima
    ação em texto, nenhum `img` nem `script` no `main`, `window.__xss` indefinido e nenhum diálogo.
  - O título vem de `TITULOS_DO_E2E.textoDeTerceiro`, importado, e o U+202E é conferido por `String.fromCodePoint`
    (pendência da T06).
  - Nada foi tirado do arquivo; o piso de asserções sobe.

### Testes que já existiam e mudaram (G3.2, trecho a trecho)

- `e2e/detalhe-demanda.spec.ts` (previsto no G5):
  - `historico()` passou de `getByRole('table', …)` a `getByRole('region', { name: 'Histórico' }).getByRole('list')`;
  - `getByRole('row')` passou a `getByRole('listitem')`;
  - as cinco células da linha (`getByRole('cell')`: data, quem, o que, antes, depois) passaram aos três parágrafos do
    item: `['Mudou o status', 'Antes: Em construção. Depois: Entregue.', /^Pessoa Ficticia CTO \(CTO\) · <data>$/]`,
    os mesmos cinco valores;
  - fora do G5, mesma causa: o `getByText(<id da versão>, { exact: true })` do CA-26.2 passou a ser procurado dentro
    da região "Versões", porque os ids também aparecem na barra (violação de modo estrito).
- `e2e/axe-todas.spec.ts` (fora do G5): `getByText('ESP-<id>-v1', { exact: true })` da T05 passou para dentro da região
  "Versões", pelo mesmo motivo. O axe e o resto do teste não mudaram.
- `src/app/(painel)/demandas/[id]/detalhe.test.ts` (fora do G5, consequência da T11):
  - mock novo de `obterPacoteDecisao`, porque a página agora lê o DEC, e o CA-26.2 (HTML) devolve a vista do DEC v1;
  - foram acrescentadas `expect(mDec).toHaveBeenCalledExactlyOnceWith(DB, 'DEC-…-v1')` e, no primeiro teste, "sem DEC,
    nem autorização nem leitura do pacote";
  - `<h1>…</h1>` (duas vezes) passou a `/<h1[^>]*><bdi>…<\/bdi><\/h1>/`;
  - os links de "Nesta página" são lidos dentro do `nav`, porque o cabeçalho tem outro "Mudar status". A lista
    esperada é a mesma;
  - o teste do `Historico.tsx` era sobre a tabela (`<caption>`, cinco `<th>`, `<td>Nova</td><td>Em análise</td>`,
    `aria-label="Tabela do histórico"`). Agora confere a mesma informação na lista: o texto da ordem antes do `ol`,
    um `<li>` por evento, o `<time>`, quem, o que e "Antes: Nova. Depois: Em análise.". Não há `<table>`. Os textos da
    tabela deixaram de existir; nenhuma outra asserção foi apagada.
- `src/app/(painel)/demandas/[id]/detalhe-qa.test.ts` (fora do G5):
  - `linhasDoHistorico` lê os itens da lista e devolve as mesmas cinco colunas (data, quem, o que, antes, depois). As
    asserções que o usam não mudaram;
  - `<h1>Título novo (fictício)</h1>` passou à forma com `<bdi>`;
  - as duas contagens de link ("2 links para o RSK" e "2 para `#duvidas-em-aberto`") continuam 2, contadas na página
    sem o cartão da Próxima ação. Cada uma ganhou a asserção de que o cartão tem 1 link (linhas 5 e 3 do RF-09).
- `src/app/(painel)/demandas/formularios-paginas-qa.test.ts` (fora do G5): `<h1>…</h1>` passou à forma com `<bdi>`.

Nenhuma asserção foi afrouxada, nenhuma regra do axe foi desligada, e não houve `.skip`, `.only`, `retries`, tempo-limite
nem `bypassCSP`.

### Testes novos de unidade (em `detalhe.test.ts`)

- `Historico.tsx`:
  - antes vazio mostra só "Depois:"; texto livre fica sem a linha (C-30);
  - CA-10.2: 30 eventos dão 30 itens, na ordem.
- `BarraDeEtapas.tsx`:
  - CA-08.1 nos cinco itens;
  - as marcas por forma;
  - CA-08.3: sem etapa atual, nenhum `aria-current`.
- `CartaoProximaAcao.tsx`:
  - a estrutura;
  - o detalhe;
  - destino em outra página, na seção de dúvidas e na de status;
  - sem link.
- Página:
  - CV-09: a ordem da autorização antes da leitura, o id de `d.pacotesDecisao[0]` mesmo com `?dec=`/`?decId=` na URL, e
    nenhuma sentinela de nome ou de documento do aprovador no HTML;
  - CA-08.1 e CA-09.1, CA-08.2 e CA-08.3 em HTML;
  - a ordem do DOM da A2, a trilha, o cabeçalho, as seções em cartão e a coluna lateral;
  - sem urgência, sem "Urgência:".

### Visto falhando antes do código

`pnpm -C <repo> test "src/app/(painel)/demandas/[id]/detalhe" test/estatico/detalhe-dec.test.ts`, com os testes
escritos e o código sem mudança: 3 arquivos falharam, com 5 testes falhando e 14 passando. Trecho:

```
FAIL  src/app/(painel)/demandas/[id]/detalhe.test.ts
Error: Cannot find module '/src/app/(painel)/demandas/[id]/BarraDeEtapas' imported from …/detalhe.test.ts
FAIL  test/estatico/detalhe-dec.test.ts > CV-09 (T11) … > a página autoriza antes de ler, lê o DEC de d.pacotesDecisao[0] …
+   "sem autorizar(pessoa, 'ler_pacote_decisao')",
+   "sem obterPacoteDecisao(",
+   "sem etapasDaDemanda(",
+   "sem proximaAcao(",
FAIL  src/app/(painel)/demandas/[id]/detalhe-qa.test.ts > … RF-24 …
AssertionError: expected undefined to deeply equal [ '30/09/2026 às 12:00', …(4) ]
```

### Resultado

- Os três arquivos da T05 mais o estático novo: 68 de 68.
- `pnpm test`: **5134 testes, 0 falhas** (relatório JUnit no scratchpad da sessão; a saída do console é só log dos
  workers).
- `pnpm test:e2e` (suíte inteira): **205 de 205**.
  - A rodada anterior teve 4 falhas. Duas foram corrigidas: o seletor de `axe-todas.spec.ts` e a rolagem lateral em
    390 px.
  - As outras duas eram 429 no login, em `axe-todas` T12 e `casca-qa` 404, e decorreram da primeira falha (ver
    Pendências). Na rodada seguinte, sem falha, não voltaram.
  - O axe passou sem violação na T05 em 1280 e 390 px (detalhe-a2 e detalhe-demanda) e nas demais telas (axe-todas).
- `pnpm lint` e `pnpm typecheck`: limpos.
- CV-01:
  - `git diff --stat 198e97d -- <lista do G4>` saiu vazio;
  - `git diff --stat 198e97d -- src/modules package.json` lista só `resumo-da-fila.ts` e o teste dele (T07), mais as 2
    linhas do `package.json` (T02);
  - nenhum `'use server'` novo ou alterado.

### Desvios do plano

1. **O e2e foi escrito antes do código, mas não foi rodado no vermelho**, como na T09. Só a suíte de unidade foi vista
   falhando (trecho acima).
2. **CA-08.3 coberto em unidade, e não em e2e.** O seed não tem demanda `encerrada`, e criar ou encerrar uma gastaria o
   C-36 ou mexeria em demanda de outro teste. O HTML da página com `encerrada` (sem `aria-current="step"`) e o da barra
   sem etapa atual estão em `detalhe.test.ts`.
3. **CA-10.2 com 30 eventos em unidade.** Gravar 30 eventos numa demanda do seed alteraria dado de outros testes. O e2e
   confere "todos" contra a API na `etapasDupla`: a mesma contagem e a mesma ordem.
4. **Testes existentes fora do G5** (`detalhe.test.ts`, `detalhe-qa.test.ts`, `formularios-paginas-qa.test.ts`,
   `axe-todas.spec.ts` e o trecho das versões em `detalhe-demanda.spec.ts`). Todos mudam só seletor, texto literal (h1
   com `<bdi>`, lista em vez de tabela) ou o escopo da contagem, explicados acima, trecho a trecho.
5. **`data-marca` na marca da barra.** É atributo estável para o teste de forma, sem depender de classe. Segue o mesmo
   princípio do `data-cor` do D-15.
6. **`export` de `COR_DA_URGENCIA` em `CartoesDaFila.tsx`** (arquivo da T09), para não duplicar o mapa de cores da
   urgência.
7. **Teste de unidade dos componentes novos em `detalhe.test.ts`**, e não num arquivo novo. Ele já tem os dublês da
   página.

## Decisões tomadas

- `grid-cols-1` explícito na grade. Sem ele a coluna implícita é `auto` e cresce com as tabelas das versões: em 390 px a
  página rolava de lado (`scrollWidth` 538). O e2e novo pegou isso.
- Histórico em `xl:row-[2/-1]` sobre `grid-rows-[repeat(5,auto)_1fr]`. A altura do histórico vai para a última linha,
  flexível, e não abre espaço entre os cartões da coluna principal.
- Próxima ação e Histórico vão para a lateral só por CSS. Ordem de leitura e de Tab: Próxima ação antes do conteúdo e
  Histórico por último (03, 5.2).
- `h2` da Próxima ação com id e sem `tabindex`. Ele não é alvo de "Nesta página", e a lista de `h2` focáveis continua a
  de hoje.
- Seção da barra num `Cartao` sem nome (não vira região). A barra já tem o nome no `ol`.
- O cartão e a barra recebem só o resultado das funções da T10 e não chamam regra (CA-09.4). Os textos fixos vêm de
  `TEXTOS_ETAPAS`.
- Textos novos da 03, seção 9, em constantes: `TEXTOS_LINHA_DO_TEMPO`, `TEXTOS_DETALHE.trilha`, `trilhaDemandas` e
  `urgenciaNoCabecalho`.

## Pendências

- Para o `tech-lead` e o `qa-automacao`, sem bloquear: `ipFicticio()` em `e2e/apoio.ts` zera o contador quando o
  Playwright troca de worker depois de uma falha.
  - Os logins seguintes repetem os IPs do começo, ainda dentro da janela de 1 minuto do limite do Better Auth, e
    recebem 429.
  - Foi assim que uma falha virou três na primeira rodada.
  - Saída possível: semente do contador por `testInfo.workerIndex` ou pelo relógio. Mexe em `e2e/apoio.ts`, fora desta
    tarefa.
- Para a 07 (`qa-funcional`): foco e leitura que o axe não pega na T05. São a ordem de Tab (Próxima ação antes de
  Dados), o anúncio do `aria-current="step"` e o separador " · " do histórico (03, seção 10).
- Para a T16: a página da T05 já usa só tokens da 03. `MudarStatus.tsx`, `TextoRecebido.tsx` e as classes da tabela das
  versões (`text-lg` no `h3`) continuam como hoje.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h_%s -- docs/construcao/DEC-DEM-20261110-0015-v1` — entregas do pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h -12 -- src/components "src/app/(painel)/demandas" e2e test/estatico` — arquivos recentes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h -30 --diff-filter=A -- src/components "src/app/(painel)/demandas/[id]" e2e` — arquivos criados
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --format=%h --name-only -S "Histórico da demanda, do mais novo"` — usos da legenda da tabela
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --format=%h --name-only -S "Tabela do histórico"` — usos da região da tabela
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --format=%h --name-only -S "TEXTOS_DETALHE.historico"` — usos dos textos do histórico
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --format=%h --name-only -S "aria-current" -- e2e src test` — testes que contam `aria-current`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- e2e/decisao.spec.ts e2e/pedido-construcao.spec.ts e2e/axe-todas.spec.ts e2e/fontes.spec.ts e2e/fontes-qa.spec.ts e2e/moldura.spec.ts e2e/especificacao.spec.ts e2e/parecer-risco.spec.ts e2e/pacote-decisao.spec.ts e2e/editar-demanda.spec.ts e2e/nova-demanda.spec.ts e2e/agentes-teto.spec.ts e2e/seguranca-qa.spec.ts e2e/demanda-formularios-qa.spec.ts e2e/especificacao-qa.spec.ts e2e/parecer-risco-qa.spec.ts` — tamanho dos specs
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --format=%h -S "export async function obterPacoteDecisao" --name-only` — onde está a leitura do DEC
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- e2e test/estatico src/components "src/app/(painel)/demandas/[id]"` — lista dos arquivos rastreados
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- src/app/api src/modules/historico` — rotas e histórico
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%h -S "export function rotuloAtor" -- src/components/rotulos.ts` — `rotuloAtor` exportado
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/[id]/detalhe" test/estatico/detalhe-dec.test.ts` — vermelho: 3 arquivos falharam, 5 testes falharam e 14 passaram
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/[id]/detalhe" test/estatico/detalhe-dec.test.ts` — 3 arquivos, 68 de 68
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — exit 1 (saída truncada pelos logs dos workers)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=json --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/scratchpad/t11-suite.json` — exit 1 (relatório numa linha só, grande demais para ler)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/scratchpad/t11-suite.xml` — 5134 testes, 1 falha
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico src/components "src/app/(painel)/demandas/fila" "src/app/(painel)/demandas/leituras" --reporter=dot` — 57 arquivos, 1169 de 1169
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app --reporter=dot --silent` — 1 falha (h1 em `formularios-paginas-qa.test.ts`)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/formularios-paginas-qa.test.ts" --silent` — 1 de 42 falhou (`<h1>` sem `<bdi>`)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/formularios-paginas-qa.test.ts" --silent` — 42 de 42
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — só os arquivos da tarefa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio (CV-01)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d -- src/modules package.json` — só `resumo-da-fila.ts` e o teste dele (T07) e 2 linhas do `package.json` (T02)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=dot` — 201 de 205 (4 falhas: seletor em `axe-todas` T05, rolagem lateral em 390 px no `detalhe-a2`, e dois 429 de login depois da troca de worker)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --no-index --stat /dev/null /tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/tasks/bs3vo1ypu.output` — tamanho da saída do e2e (140 linhas)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=dot` — 205 de 205
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/scratchpad/t11-suite-final.xml --silent` — 5134 testes, 0 falhas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 10 modificados e 5 novos, todos da tarefa; nenhum temporário no repositório

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas
