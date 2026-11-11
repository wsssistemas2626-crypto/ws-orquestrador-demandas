---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T16-construcao
agente: engenheiro-frontend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, 05-tech-lead.md, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7, T13 a T17), 03-ux-ui-design.md (seções 0 a 3.2), 06-T03-tech-lead.md, 06-T05-tech-lead.md (e a revisão anterior, bd54155, pelo git diff), 06-T09-tech-lead.md, 06-T09-qa-automacao.md, 06-T13-tech-lead.md, 06-T13-qa-automacao.md, 06-T13-engenheiro-frontend.md (Pendências), 06-T14-engenheiro-frontend.md, 06-T14-tech-lead.md, 06-T15-engenheiro-frontend.md, 06-T15-tech-lead.md, e2e/apoio.ts, e2e/axe-todas.spec.ts, e2e/casca.spec.ts, e2e/casca-qa.spec.ts (abrirGaveta), e2e/fontes-qa.spec.ts, e2e/fila-contadores.spec.ts (início), e2e/decisao-celular-qa.spec.ts (início), e2e/reflow.spec.ts, e2e/seguranca.spec.ts (linha 186), playwright.config.ts, src/app/globals.css, src/app/(painel)/layout.tsx, src/app/(painel)/demandas/page.tsx, fila.tsx, CartoesDaFila.tsx, ContadoresDaFila.tsx, EntradasAguardando.tsx, src/app/(painel)/demandas/[id]/page.tsx, CartaoProximaAcao.tsx, TextoRecebido.tsx, MudarStatus.tsx (trecho), src/app/(painel)/pacotes-decisao/[decId]/SecaoPedido.tsx (trecho), src/components/Alerta.tsx, AreaTexto.tsx (trecho), AvisosDaMoldura.tsx, Botao.tsx, CabecalhoPainel.tsx, CaixaSelecao.tsx, CampoTexto.tsx, DialogoConfirmacao.tsx, GrupoOpcoes.tsx, ListaTextos.tsx (trecho), Recolhivel.tsx, RegiaoAviso.tsx, ResumoErros.tsx, casca/GavetaMenu.tsx, casca/ItensDoMenu.tsx, dados-da-decisao.ts (TEXTOS_DECISAO), tokens-em-uso.test.ts, componentes-qa.test.ts (trecho), lista-textos.test.ts (trecho), detalhe.test.ts (trecho), pagina.test.ts da T11 (trecho), test/estatico/cores-so-por-token.test.ts, test/estatico/painel-qa.test.ts (trecho)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

A T16 fecha a transição de tokens (D-01), põe o axe de T01 a T12 nas duas larguras (D-06, RNF-13) e confere o alvo de
toque de 44 × 44 px em 390 px (RNF-03). Junto vieram os seis itens que o maestro passou das revisões anteriores; o que
não coube está em Pendências, com o motivo. Nenhuma rota, Server Action, esquema, papel, texto de interface ou regra
mudou; o CV-01 (G4) continua vazio.

### O que a T16 do plano pede

- **Fim dos nomes antigos (D-01, RF-01).** `globals.css` perdeu o bloco dos nove apelidos (`--color-texto`,
  `--color-primaria`, `--color-borda`…). As 23 classes antigas que sobravam em `src/` trocaram pelo mapa da 03, 2.1:
  - `text-texto-suave` → `text-tinta-media` (`EntradasAguardando`, `MudarStatus`, `SecaoPedido`, `AreaTexto`,
    `CampoTexto` (`Dica`), `GrupoOpcoes` (rótulo indisponível da variante `lista` e dica), `ListaTextos`);
  - `text-perigo`/`border-perigo` → `text-erro`/`border-erro` (`AreaTexto`, `CampoTexto` (`MensagemDeErro`),
    `ResumoErros`); `bg-red-50` → `bg-erro-fundo` (`ResumoErros`, paleta do Tailwind);
  - `text-texto` → `text-tinta` (`RegiaoAviso`, `ResumoErros`);
  - `text-primaria` → `text-acao-escura` (o `summary` do `TextoRecebido`, que é texto de link);
  - `text-atencao-texto`/`border-atencao-texto` → `text-atencao`/`border-atencao` (`TextoRecebido`, `AvisosDaMoldura`);
  - `border-borda` → `border-tinta-suave` no `details` do `TextoRecebido` (fronteira do controle, 2.2); `border-linha`
    no divisor interno dele e no `section` de `EntradasAguardando`, que é cartão (2.1: `linha` = borda de cartão e
    divisor).
  A cor na tela é a mesma: cada apelido já apontava para o token novo.
- **Axe nas duas larguras (D-06).** `e2e/apoio.ts` ganhou `semViolacoesNasDuasLarguras(page, rotulo)`, como no plano,
  com uma coisa a mais: depois de cada `setViewportSize`, a página volta ao topo antes do axe. É o caminho que a
  06-T14-tech-lead escreveu para o `target-size` sob a barra fixa (pendência 4 do maestro): sem isso, a ancoragem de
  rolagem do Chromium deixa um campo sob a barra de 56 px e o axe acusa pela posição, não pela tela. A regra continua
  ligada e nada do `header` sai do axe.
- **`e2e/axe-todas.spec.ts` (G5).** O `axe()` da spec (que já voltava ao topo) chama o `semViolacoesNasDuasLarguras`, e
  os dois `semViolacoes(` de diálogo aberto (T11 e T12) viraram `semViolacoesNasDuasLarguras(`. Todo estado da spec é
  conferido em 1280 × 720 e em 390 × 844. Estados novos, só abaixo de 768 px: "Mais filtros" aberto e a gaveta aberta na
  T03, e o recolhível aberto na T11. A gaveta roda só em 390 px, porque ela fecha quando a janela passa de 768 px.
  Nenhum teste novo cria demanda nem versão; o uso por conta no cabeçalho da spec não muda.
- **`e2e/alvo-de-toque.spec.ts` (novo, RNF-03).** Em 390 × 844: T03 com "Mais filtros" aberto, T05, T11 (fechado e com
  o recolhível aberto) e a gaveta aberta. Todo botão, campo, seleção, área de texto, rádio, caixa e link solto tem de
  ter 44 × 44 px. Ficam de fora o link dentro de frase (03, 2.4) e o que não está na tela nessa largura. O alvo do
  rádio e da caixa é a linha `min-h-11` que junta o controle e o rótulo; no cartão de opção, o cartão inteiro. Só lê:
  conta "administradora" na T03, T05 e T11 (o DEC de agente da `decisaoRecomendaB`, o mesmo que a
  `decisao-celular-qa` só lê) e "cto" na gaveta.
- **O que o alvo de toque achou:** "Ver" nas tabelas de versões da T05, com 26 × 24 px. A 03, 2.4 cita "Ver" entre os
  links soltos com 44 px abaixo de 768 px. `acaoDaVersao` ganhou `min-h-11 min-w-11` com `md:min-h-6 md:min-w-6`, o
  mesmo molde de "Nesta página" e da trilha.

### Os itens que o maestro passou

1. **Id da fila em Mono 600 (pendência 1 da 06-T09-tech-lead).** `fila.tsx` (tabela) e `CartoesDaFila.tsx` (cartão)
   ganharam `font-semibold` no link do id, e o comentário de `fila.tsx:90-91` saiu. Em `e2e/fontes-qa.spec.ts`, o
   `carregadaNoPeso400` virou `carregadaNoPeso(page, familia, peso, rotulo)`: o corpo continua conferido no 400, e o
   id no peso computado dele, lido em `lerFontes` (`pesoDoId`). Entrou uma asserção nova, `pesoDoId` = `'600'` (03,
   2.3). As outras conferências ficaram como estavam (família do id diferente da do corpo, os dois arquivos Mono na
   família do id, seis arquivos, `swap`). O G5 ganha a linha que a revisão da T09 pediu.
2. **Espaço do título em `e2e/seguranca.spec.ts:186` (M1 da 06-T13-tech-lead).** Voltou a ser `'C-19: /demandas/[id] …'`.
3. **`abrirGaveta` de `e2e/casca.spec.ts` (06-T13-qa-automacao e M4 da 06-T13-tech-lead).** Ganhou a mesma linha do
   `casca-qa.spec.ts`: só clica em "Menu" se a gaveta ainda estiver fechada. Também espera o fim da entrada de 200 ms,
   pelo auxiliar novo `gavetaParada(page)`, que o teste do clique por coordenada passou a usar no lugar da linha que
   tinha no corpo (Minor 1 da volta 1 da 06-T05-tech-lead). Nenhuma asserção mudou.
4. **Axe `target-size` sob a barra fixa (06-T14-engenheiro-frontend e 06-T14-tech-lead).** Resolvido no
   `semViolacoesNasDuasLarguras`, como descrito acima, sem desligar regra nem mexer em tela para tirar o campo de baixo
   da barra. O `nova-demanda.spec.ts:171` não voltou a falhar e não mudou.
5. **Minor marcados "T16":**
   - 06-T03-tech-lead, parecer 2: feito (classes antigas de `CampoTexto`, `AreaTexto`, `ListaTextos` e `GrupoOpcoes`,
     com os seletores dos testes).
   - 06-T05-tech-lead (bd54155), Minor 1: o "Menu" usa `classeDoBotao('sobre-escuro')` com `shrink-0 px-3`, como o
     "Fechar menu" da gaveta. Minor 2: `Icone` de `ItensDoMenu.tsx` exportado e usado pelo "Menu" e pelo "Fechar
     menu", com `aria-hidden` e `focusable="false"` num lugar só. `AvisosDaMoldura`: `max-w-6xl` virou a largura e as
     margens do `main` (`w-full max-w-300 px-4 md:px-6 xl:px-8`), `text-atencao-texto` virou `text-atencao`, e o "Ver
     agentes e teto" (link solto da 03, 2.4) ganhou 44 px abaixo de 768 px.
   - 06-T05-tech-lead (volta 1), Minor 1: o `gavetaParada` do item 3.
   - 06-T15-tech-lead, Minor 1: os `h2` da T10 (ESP e RSK) e da T12 deixaram `text-xl font-semibold` e seguem a
     escala do `globals.css` (18 px, 700, 1,3). Os "outros h2 do painel" que sobrescreviam a escala também:
     `CamposDaDemanda` (T04 e T06), `EntradasAguardando` (T03), `ResumoErros` (todas as telas de formulário) e o título
     do `DialogoConfirmacao`. Um teste estático novo (`test/estatico/tipografia-h2.test.ts`) trava isso; a única
     exceção é o `h2` desenhado como etiqueta (Mono 12, caixa alta), o "Próxima ação" da T05 (03, 5.5).
   - 06-T15-tech-lead, Minor 2: `secoesEmCartoes` do `e2e/reflow.spec.ts` usa `closest('section.rounded-cartao')`.
   - 06-T09-tech-lead, Minor 1 e 2 (pendência 3, "numa tarefa que toque os arquivos"): `NAO_INFORMADA` exportada de
     `CartoesDaFila.tsx` e reusada em `TEXTOS_FILA.naoInformada`; a classe da etiqueta virou `CLASSE_DA_ETIQUETA`,
     exportada de `CartoesDaFila.tsx` e usada pelo cartão, pela etiqueta "Fila" da T03 e pelos termos dos dados da T05
     (era a terceira cópia).
   - 06-T13-engenheiro-frontend: `text-texto-suave` do rótulo indisponível da variante `lista` do `GrupoOpcoes`, feito.
     A limpeza de `opcoesDaDecisao`, `legendaDecisao`, `aprovar` e `devolver` não entrou (Pendências).
6. **Contadores sem script (06-T09-qa-automacao):** não entrou (Pendências). Pede uma escolha de desenho da 03, 4.6.

### Arquivos alterados

- Código: `src/app/globals.css`; `src/app/(painel)/demandas/fila.tsx`, `CartoesDaFila.tsx`, `page.tsx`,
  `EntradasAguardando.tsx`; `src/app/(painel)/demandas/[id]/page.tsx`, `MudarStatus.tsx`, `TextoRecebido.tsx`;
  `src/app/(painel)/especificacoes/[espId]/page.tsx`; `src/app/(painel)/pareceres-risco/[rskId]/page.tsx`;
  `src/app/(painel)/configuracao/agentes/page.tsx`; `src/app/(painel)/pacotes-decisao/[decId]/SecaoPedido.tsx`;
  `src/components/AreaTexto.tsx`, `AvisosDaMoldura.tsx`, `CabecalhoPainel.tsx`, `CampoTexto.tsx`, `CamposDaDemanda.tsx`,
  `DialogoConfirmacao.tsx`, `GrupoOpcoes.tsx`, `ListaTextos.tsx`, `RegiaoAviso.tsx`, `ResumoErros.tsx`,
  `casca/GavetaMenu.tsx`, `casca/ItensDoMenu.tsx`. Só classe, constante de classe, import e comentário: nenhum texto,
  condição, ordem, `aria-*` ou chamada mudou.
- e2e: `e2e/apoio.ts`, `e2e/axe-todas.spec.ts`, `e2e/casca.spec.ts`, `e2e/fontes-qa.spec.ts`, `e2e/reflow.spec.ts`,
  `e2e/seguranca.spec.ts`.
- Testes de unidade que já existiam (só seletor ou a regra invertida pelo D-01; ver abaixo): `test/estatico/painel-qa.test.ts`,
  `src/components/tokens-em-uso.test.ts`, `src/components/lista-textos.test.ts`, `src/components/componentes-qa.test.ts`,
  `src/app/(painel)/demandas/[id]/detalhe.test.ts`, `src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts`.

Não houve `style=`, hexadecimal fora do `@theme`, `url(`, dependência, `'use server'` nem arquivo em `src/modules`.

### Testes criados

- `test/estatico/classes-antigas.test.ts` (6 testes): `classesAntigas` e `apelidosNoCss`, com os casos plantados do
  plano (`text-primaria`, `bg-blue-50`, `text-white` reprovam; `text-acao-escura`, `bg-superficie`, `text-branco`
  passam) e mais os que começam igual a um nome antigo (`text-texto-claro`, `bg-atencao-fundo`), que a regex do plano
  sozinha acusaria: por isso o fim `(?![\w-])`. Varre `src/**/*.{ts,tsx}` sem testes e o `globals.css`.
- `test/estatico/tipografia-h2.test.ts` (3 testes): nenhum `h2` de `src/` com classe de tamanho ou peso, com casos
  plantados (inclusive a etiqueta, que passa, e o Mono sem caixa alta, que reprova).
- `e2e/alvo-de-toque.spec.ts` (4 testes).
- Estados novos em `e2e/axe-todas.spec.ts` (dentro dos testes da T03 e da T11) e a segunda largura em todos os estados.

### Testes que já existiam e mudaram (G3.2, trecho a trecho)

- `test/estatico/painel-qa.test.ts`: as nove linhas do `it.each` que conferiam os apelidos `var()` saíram desse
  `it.each` e foram para um `it.each` novo com as mesmas nove linhas, que confere que cada apelido **não existe mais**
  (`not.toMatch`). É a regra que o D-01 inverte na T16; os 32 tokens e raios da 03 continuam conferidos como antes.
- `src/components/tokens-em-uso.test.ts`:
  - `TOKENS.size >= 39` virou `>= 30`: os 39 eram os 30 tokens da 03 mais os nove apelidos;
  - "os nove apelidos da 0.1.13 existem" (`toMatch(/^var\(…\)$/)`) virou "não existem mais" (`toBeUndefined()`), com
    as mesmas nove chaves;
  - `usados.length > 9` (os `var(--color-…)` do CSS) virou `>= 7`: eram os nove dos apelidos mais os sete da base, e
    a conferência de que todo `var()` aponta para token declarado ficou igual.
- `src/components/lista-textos.test.ts` (4 asserções), `src/components/componentes-qa.test.ts` (1),
  `src/app/(painel)/demandas/[id]/detalhe.test.ts` (1), `src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts` (1):
  só o nome da classe no seletor (`text-texto-suave` → `text-tinta-media`, `text-perigo` → `text-erro`, `text-texto`
  → `text-tinta`). Elemento, id, texto e ordem são os mesmos.
- `e2e/axe-todas.spec.ts`: a troca do G5 e os estados novos; nenhuma asserção saiu.
- `e2e/fontes-qa.spec.ts`: o peso do id (item 1), com uma asserção a mais.
- `e2e/casca.spec.ts`: o `abrirGaveta` e o `gavetaParada` (item 3); as asserções do teste do clique por coordenada
  ficaram.
- `e2e/reflow.spec.ts`: o seletor do `closest` (Minor 2 da T15).
- `e2e/seguranca.spec.ts`: só o espaço do título.

Nenhum `.skip`, `.only`, `retries`, aumento de tempo-limite, regra do axe desligada nem `bypassCSP`. O
`piso-de-assercoes.test.ts` e o `decisao-e2e.test.ts` passam.

### Visto falhando antes do código

1. `pnpm test test/estatico/classes-antigas.test.ts`, com o teste escrito e o código de antes: **2 falharam, 4
   passaram**. Trecho:

```
 FAIL  … > nenhum .ts ou .tsx de src/ (fora os testes) usa classe com nome antigo ou da paleta do Tailwind
AssertionError: expected [ …(23) ] to deeply equal []
+   "src/app/(painel)/demandas/EntradasAguardando.tsx:21: border-borda",
+   "src/components/ResumoErros.tsx:28: bg-red-50",
 FAIL  … > nenhum --color-<nome antigo> no globals.css
+   "--color-texto",
+   "--color-primaria",
```

2. `pnpm test test/estatico/tipografia-h2.test.ts`: **1 falhou, 2 passaram** (16 achados). Trecho:

```
+   "src/app/(painel)/configuracao/agentes/page.tsx:39: text-xl",
+   "src/app/(painel)/especificacoes/[espId]/page.tsx:82: font-semibold",
+   "src/components/DialogoConfirmacao.tsx:77: text-xl",
```

   A primeira rodada também acusava o `h2` etiqueta do "Próxima ação"; a exceção da 03, 5.5 entrou no teste, com caso
   plantado, antes de mexer em código.
3. `pnpm test:e2e e2e/alvo-de-toque.spec.ts e2e/axe-todas.spec.ts e2e/fontes-qa.spec.ts`, com as specs escritas e o
   código de antes: **2 falharam, 18 passaram**. Trecho:

```
  1) e2e/alvo-de-toque.spec.ts:87:1 › RNF-03: T05 Detalhe em 390 px: todo controle com 44 × 44 px
    +   "a# \"Ver\" 26×24",
    +   "a# \"Ver\" 26×24",
  2) e2e/fontes-qa.spec.ts:86:1 › CA-02.2 e RNF-06 na T03 …
    Error: T03: peso computado do id
    Expected: "600"
    Received: "400"
```

   A `axe-todas` passou nas duas larguras já nessa rodada: com a volta ao topo, nenhuma tela tinha violação em 390 px.

### Resultado

- `pnpm test` (suíte inteira): **5211 testes, 0 falhas** (relatório JUnit no scratchpad). Eram 5202; os 9 a mais são
  os dois estáticos novos.
- `pnpm lint` e `pnpm typecheck`: limpos.
- `pnpm test:e2e` das specs tocadas (`alvo-de-toque`, `axe-todas`, `fontes-qa`, `fontes`, `casca`, `reflow`): **42 de
  42**.
- `pnpm test:e2e` (suíte inteira): **240 de 240** em 10,4 min, com os 4 testes novos do `alvo-de-toque` (o negativo da
  vigia conta como passou, `test.fail()`, como antes). Uma rodada nesta etapa; as três seguidas são da T17 (RNF-12).
- CV-01: o `git diff --stat 198e97d -- <lista do G4>` saiu vazio; `src/modules`, `package.json` e `pnpm-lock.yaml` só
  com a T02 e a T07.
- `git status`: só os arquivos listados acima e esta entrega; nenhum temporário no repositório.

### Desvios do plano

1. **`semViolacoesNasDuasLarguras` volta ao topo depois de cada troca de largura.** O esboço do plano não tinha a
   volta; a 06-T14-tech-lead mandou pôr, com o motivo no comentário. Não muda regra do axe.
2. **`test/estatico/tipografia-h2.test.ts` e os `h2` fora da T10 e da T12.** O plano da T16 não cita tipografia; o
   maestro passou o Minor 1 da T15 ("junto com os outros h2 do painel"), e o teste novo é o jeito de o achar e de ele
   não voltar.
3. **Arquivos fora da lista da T16:** os componentes da casca (`CabecalhoPainel`, `GavetaMenu`, `ItensDoMenu`),
   `AvisosDaMoldura`, `CartoesDaFila`, `fila.tsx`, `page.tsx` da T03 e da T05, `e2e/casca.spec.ts`,
   `e2e/fontes-qa.spec.ts`, `e2e/reflow.spec.ts` e `e2e/seguranca.spec.ts` vêm dos itens que o maestro passou; cada um
   está no item dele, acima.
4. **Testes que já existiam fora do G5** (`painel-qa`, `tokens-em-uso`, `lista-textos`, `componentes-qa`, `detalhe`,
   `pagina` da T11): consequência direta do D-01, explicados trecho a trecho acima.

## Decisões tomadas

- **Alvo do rádio e da caixa = a linha `min-h-11` que junta controle e rótulo** (no cartão de opção, o cartão): é o
  padrão do `GrupoOpcoes` e da `CaixaSelecao`; medir só o `input` de 20 px reprovaria o desenho da 03 sem defeito.
- **"Link dentro de frase" = o bloco pai tem mais texto que o link.** A 03, 2.4 lista os soltos ("Nesta página", "Ver",
  "Limpar filtros", "Ver agentes e teto", trilha); a regra pega esses e deixa de fora os links no meio de um alerta.
- **Gaveta aberta e "Mais filtros" aberto também na `axe-todas`**, embora o `casca.spec` (CA-04.5) e o
  `fila-contadores.spec` já rodem o axe neles: o critério da T16 é "zero violação nos estados da `axe-todas`, mais a
  gaveta aberta e a T11 com o recolhível aberto", e assim os três ficam no mesmo lugar.
- **`border-linha` no `section` de `EntradasAguardando` e no divisor do `TextoRecebido`; `border-tinta-suave` no
  `details`.** O mapa da 03 troca `borda` por `tinta-suave`, mas a própria 2.1 reserva `tinta-suave` para borda de
  campo e de controle e `linha` para cartão e divisor (o mesmo critério aceito na T14 para o "Anexo N").
- **`painel-qa` e `tokens-em-uso`: a conferência dos apelidos foi invertida, não apagada.** O D-01 manda os apelidos
  saírem na T16; as mesmas chaves agora provam que eles não existem.
- **Contas dos e2e novos (C-36):** nenhum cria demanda nem versão. "administradora" na T03, T05 e T11 do
  `alvo-de-toque`, para não somar logins à "cto".

## Pendências

- **Para a 08 (maestro) e o tech-lead, Minor, não bloqueia: limpeza de `opcoesDaDecisao`, `legendaDecisao`, `aprovar` e
  `devolver` sem uso** (06-T13-engenheiro-frontend). Não entrou: tirar `opcoesDaDecisao` e as chaves de
  `TEXTOS_DECISAO` obriga a apagar as asserções que as cobrem em `src/components/dados-da-decisao.test.ts`, e o G3.2 e
  o CV-20 só deixam isso com decisão de quem revisa. Se o tech-lead aprovar, é uma correção pequena da 08.
- **Para a `ux-ui-design` e o tech-lead, Minor, não bloqueia: contadores da T03 sem script** (06-T09-qa-automacao). Não
  entrou: a saída é uma escolha de desenho (botões ativos no fallback contra a 03, 4.6, `disabled` só no cliente, ou
  registrar que o painel exige script) e muda asserção de `fila-a1.test.ts` sobre o estado carregando. O comentário de
  `ContadoresDaFila.tsx` (linhas 4 a 6, "sem script, o GET comum filtra") continua dizendo o contrário do que acontece
  e deve mudar junto com a decisão. Fica para a 08.
- **Para a 07 (`qa-funcional`), à mão:** os `h2` que passaram a 18 px / 700 (seções de T04, T06, T10 e T12, resumo de
  erros, "Entradas aguardando" e título do diálogo de confirmação) e o "Menu" da barra do celular com a classe do
  `Botao` `sobre-escuro`. Observação sem pedido: os `h3` das listas de versões da T05 (`text-lg font-semibold`, 18 /
  600) também fogem da escala da 03 (16 / 600); não estava em nenhuma pendência, e eu não mexi.
- **Seguem de antes (sem mudança nesta tarefa):** M2 da 06-T13-tech-lead (demanda própria no seed para o C-18 da T11,
  para a 08) e o "cookie antigo" sob muitos logins da 06-T13-qa-automacao.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -25` — topo 0ffb4fb (06-T15-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --diff-filter=A --name-only --format= -- src e2e test` — arquivos de código e de teste
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 -G "TITULOS_DO_E2E = " -p --format=%h -- scripts/seed-ficticio.ts` — 03814e6 (versão antiga das chaves; as atuais li nos specs)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 -G "legendaDecisao" --format=%h -- docs/construcao/DEC-DEM-20261110-0015-v1/06-T13-engenheiro-frontend.md` — 472439e
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "opcoesDaDecisao" --name-only --format=%h -- src e2e test` — `dados-da-decisao.ts`, o teste dele e a página da T11
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff ce47ec5~1 HEAD --stat -- src/components/dados-da-decisao.ts src/components/dados-da-decisao.test.ts` — o teste cobre as funções e textos da T11
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff bd54155 HEAD -- docs/construcao/DEC-DEM-20261110-0015-v1/06-T05-tech-lead.md` — os Minor 1 a 4 da revisão anterior da T05
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 -G "secoesEmCartoes" --format=%h -- e2e/reflow.spec.ts` — d53dc1f
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/classes-antigas.test.ts --reporter=dot` — vermelho: 2 falharam, 4 passaram
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/alvo-de-toque.spec.ts e2e/axe-todas.spec.ts e2e/fontes-qa.spec.ts --reporter=line` — vermelho: 2 falharam, 18 passaram
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/tipografia-h2.test.ts --reporter=dot` — vermelho: 1 falhou, 2 passaram
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=dot` — saída cortada pelos logs dos testes de banco; repetido por partes
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components test/estatico --silent --reporter=dot` — 16 falharam (seletores de classe antiga e apelidos nos testes)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components test/estatico --silent --reporter=dot --chaiConfig.truncateThreshold=80` — não rodou (opção desconhecida no Vitest 5)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components test/estatico --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/scratchpad/t16-comp.xml` — 16 falhas (relatório no scratchpad)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico --silent --reporter=dot` — 9 falharam (os apelidos do `painel-qa`)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components --silent --reporter=dot` — 7 falharam
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/lista-textos.test.ts --silent --reporter=dot` — 3 falharam (seletor de classe)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/componentes-qa.test.ts src/components/componentes.test.ts --silent --reporter=dot` — 70 de 70
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components --silent --reporter=dot` — 3 falharam (`tokens-em-uso`, apelidos)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components test/estatico --silent --reporter=dot` — 1082 de 1082
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)" src/app/entrar src/app/configurar-2fa src/app/paginas-erro-qa.test.ts src/app/layout.test.ts src/app/page.test.ts --silent --reporter=dot` — 2 falharam (seletor de classe)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/scratchpad/t16-suite.xml` — 5211 testes, 0 falhas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/alvo-de-toque.spec.ts e2e/axe-todas.spec.ts e2e/fontes-qa.spec.ts e2e/fontes.spec.ts e2e/casca.spec.ts e2e/reflow.spec.ts --reporter=line` — 42 de 42
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 36 modificados e 3 novos da tarefa; nenhum temporário
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio (CV-01)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d -- src/modules package.json pnpm-lock.yaml` — só `resumo-da-fila.*` (T07) e as linhas da T02
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=dot` — 240 de 240 (10,4 min)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — depois do e2e: os mesmos 36 modificados e 3 novos, mais esta entrega; nenhum temporário

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa (os de fora da lista da T16 vêm dos itens que o maestro passou, desvio 3)
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas (T01 a T12 em 1280 × 720 e 390 × 844 na `axe-todas`, mais gaveta, "Mais filtros" e recolhível abertos)
