---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T16-construcao
agente: engenheiro-frontend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, 06-T16-qa-automacao.md (a entrega que mandou de volta), 06-T16-tech-lead.md, 06-T16-engenheiro-frontend.md (a entrega anterior desta etapa), src/app/(painel)/pacotes-decisao/[decId]/RevisaoDoPacote.tsx, src/app/(painel)/pacotes-decisao/[decId]/page.tsx, src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Volta 2 da T16, pela devolução da `06-T16-testes`. O defeito era real: na T11 em 390 px, os links da ESP e do RSK
citados na "Revisão antes de decidir" tinham 240 × 24 px. Como cada um é o valor inteiro de um termo, sem texto solto
ao lado, conta como link solto (03, 2.4), e o RNF-03 pede 44 px abaixo de 768 px. Corrigi o código e não mexi no e2e.
Na mesma passagem, como a qa recomendou, corrigi os três links soltos dos alertas da T11, que tinham o mesmo defeito,
e pus um teste de HTML para eles. Nenhum texto, rota, condição, `aria-*` ou chamada mudou. O CV-01 não foi tocado.

### A correção

- `src/app/(painel)/pacotes-decisao/[decId]/RevisaoDoPacote.tsx:17`: o `CLASSE_LINK` (usado só pelo link da ESP e do
  RSK) ganhou `inline-flex min-h-11 items-center` e `md:min-h-6`, como sugerido. É o mesmo molde do "Ver" das versões e
  de "Ver agentes e teto". Sem `inline-flex`, o `min-height` não vale num `<a>`.
- `src/app/(painel)/pacotes-decisao/[decId]/page.tsx`: entrou a constante nova `CLASSE_LINK_SOLTO`
  (`inline-flex min-h-11 items-center md:min-h-6` + `CLASSE_LINK`). Ela vale nos três links que ficam fora do `<p>` do
  `Alerta`, sem texto solto ao lado:
  - "Ir para a demanda" do lembrete de P1-d (`:164`);
  - o link do DEC substituído (`:172`);
  - o link do desatualizado (`:180`).
  O `CLASSE_LINK` continua igual e segue nos links dentro de frase do cabeçalho: o id da demanda e os "Ver" entre
  parênteses da linha "Cita …" (03, 2.4). "Voltar para a demanda" já tinha `min-h-11` e não mudou.

### Teste escrito antes e visto falhando

1. **Teste novo de HTML**, em `src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts`. É o describe "T16: links
   soltos da T11 com alvo de toque de 44 px abaixo de 768 px (RNF-03; 03, 2.4)", com 3 testes:
   - os links da ESP e do RSK na revisão têm `inline-flex`, `items-center`, `min-h-11` e `md:min-h-6`, e mantêm
     `font-mono`, `text-acao-escura` e `underline`;
   - os três links dos alertas (lembrete, substituído e desatualizado) têm as mesmas quatro classes;
   - controle: os links dentro de frase do cabeçalho (o id da demanda e os dois "Ver") **não** ganham `min-h-11`.

   Rodei com o código de antes e deram **2 falhas e 42 passes**. O controle passou. Trecho:

```
 FAIL  … > T16: links soltos da T11 … > revisão antes de decidir: os links da ESP e do RSK citados
AssertionError: ESP-DEM-20261022-0042-v2: expected [ 'font-mono', …(3) ] to deeply equal ArrayContaining{…}
-   "inline-flex",
-   "items-center",
-   "min-h-11",
-   "md:min-h-6",
 FAIL  … > alertas: "Ir para a demanda" do lembrete, o link do substituído e o do desatualizado
AssertionError: expected [ 'text-acao-escura', …(2) ] to deeply equal ArrayContaining{…}
      Tests  2 failed | 42 passed (44)
```

2. **O e2e da qa, sem nenhuma mudança**, rodado antes do código: `e2e/alvo-de-toque.spec.ts` deu **1 falha e 3
   passes**. Trecho:

```
  1) [chromium] › e2e/alvo-de-toque.spec.ts:114:1 › RNF-03: T11 Decisão em 390 px, com o recolhível aberto: todo controle com 44 × 44 px
    +   "a# \"ESP-DEM-20261111-0023-v1\" 240×24",
    +   "a# \"RSK-DEM-20261111-0023-v1\" 240×24",
  1 failed
  3 passed (45.6s)
```

### Resultado depois da correção

- `pagina.test.ts` e os outros testes da pasta da T11: **67 de 67**.
- e2e `alvo-de-toque`, `axe-todas`, `decisao-celular`, `decisao-celular-qa` e `reflow`: **32 de 32**. A T11 do alvo de
  toque passa, o axe continua sem violação nas duas larguras, e a T11 em 390 px não ganhou rolagem lateral.
- `pnpm test` (suíte inteira, rodada sozinha): **5217 testes, 0 falhas, 0 erros**. Antes eram 5214, e os 3 a mais são
  os testes novos. O relatório JUnit está no scratchpad.
- `pnpm lint` e `pnpm typecheck`: limpos.
- `pnpm test:e2e` (suíte inteira): **238 de 240**, em 16,3 min. A T11 do `alvo-de-toque` passa. As duas falhas foram
  timeouts de 30 s dentro de `AxeBuilder.analyze` (`e2e/apoio.ts:115`), em telas que esta volta não toca:
  - `e2e/parecer-risco.spec.ts:203`, a T10 do RSK;
  - `e2e/reflow-qa.spec.ts:99`, T06 a T08 em 320 px.
  Essa rodada levou 16,3 min, contra 10,4 min na volta 1, porque começou logo depois da suíte de unidade. Rodei as
  duas specs de novo, sozinhas, e passaram **8 de 8** (1,9 min). Nenhuma asserção falhou, nenhuma violação do axe
  apareceu, e nada ali usa os arquivos alterados. Ver Pendências.
- `git status`: só os 3 arquivos da tarefa e esta entrega. Nenhum temporário no repositório. As pastas
  `test-results/` do Playwright não aparecem no status.

### Arquivos alterados

- Código: `src/app/(painel)/pacotes-decisao/[decId]/RevisaoDoPacote.tsx` e `src/app/(painel)/pacotes-decisao/[decId]/page.tsx`.
  Só mudaram constante de classe e comentário.
- Teste: `src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts`, com +3 testes. Nenhuma asserção existente mudou.

### Desvios do plano

- **Os três links dos alertas de `page.tsx`.** A devolução pedia só a ESP e o RSK. A qa recomendou corrigir os alertas
  na mesma passagem, com teste de HTML, porque é a mesma classe de defeito num estado que o e2e não cria. O arquivo já
  é da T11/T16, e a mudança é só de classe.

## Decisões tomadas

- **Mudar o código, não o e2e.** Foi o que o maestro pediu, e a qa mostrou que o link é solto e não está dentro de
  frase.
- **No `page.tsx`, uma constante nova (`CLASSE_LINK_SOLTO`) em vez de mudar o `CLASSE_LINK`.** O `CLASSE_LINK` também
  vale para os links dentro de frase do cabeçalho, que a 03, 2.4 deixa sem os 44 px. O teste de controle trava essa
  diferença.
- **No `RevisaoDoPacote.tsx`, mudar o próprio `CLASSE_LINK`.** Ali ele só é usado pelo link da ESP e do RSK.
- **Teste de HTML para os alertas, não e2e.** O e2e só lê, e criar um DEC substituído ou desatualizado mudaria o estado
  do banco para as specs seguintes. É o mesmo critério da qa para "Ver agentes e teto".
- **Nenhum e2e novo criou demanda nem versão (C-36).** Só rodei as specs que já existem, sem mudança.

## Pendências

- **Para a `06-T16-testes` (`qa-automacao`):** rodar a suíte e2e inteira de novo, sozinha, sem a de unidade logo
  antes. Na minha rodada inteira, deram timeout de 30 s no `AxeBuilder.analyze` a `parecer-risco.spec.ts:203` e o
  `reflow-qa.spec.ts:99`, telas fora desta correção. As duas passaram quando rodei de novo sozinhas. Se o timeout
  voltar com a máquina sem outra carga, vale olhar a instabilidade nessas duas specs. A T17 precisa de três rodadas
  verdes seguidas (RNF-12), e isso pode pesar lá.
- Seguem como estavam, sem mudança nesta volta:
  - o Minor 3 da 06-T16-tech-lead (`h3` da T05), que vai para a T17;
  - os itens da 08 e da `10-documentacao` listados na revisão;
  - o M2 da 06-T13-tech-lead;
  - a limpeza de `opcoesDaDecisao`, `legendaDecisao`, `aprovar` e `devolver`, que ficou para depois do pedido (decisão
    1 da revisão).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -4` — topo 4503631 (06-T16-testes)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts" --reporter=dot` — vermelho: 2 falharam, 42 passaram (o teste novo, antes do código)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/alvo-de-toque.spec.ts --reporter=line` — vermelho: 1 falhou (T11, 240×24), 3 passaram (antes do código)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/pacotes-decisao/[decId]" --reporter=dot` — 67 de 67
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/alvo-de-toque.spec.ts e2e/axe-todas.spec.ts e2e/decisao-celular.spec.ts e2e/decisao-celular-qa.spec.ts e2e/reflow.spec.ts --reporter=line` — 32 de 32
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — os 3 arquivos da tarefa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- "src/app/(painel)/pacotes-decisao/[decId]/RevisaoDoPacote.tsx" "src/app/(painel)/pacotes-decisao/[decId]/page.tsx"` — só classe e comentário
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 3 arquivos, +73 −4
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/scratchpad/t16-fe-v2-suite.xml` — 5217 testes, 0 falhas, 0 erros
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=line` — 238 de 240 (16,3 min); 2 timeouts do axe na T10 do RSK e no `reflow-qa` de 320 px, fora da T11
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — os 3 arquivos da tarefa e esta entrega; nenhum temporário
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/parecer-risco.spec.ts e2e/reflow-qa.spec.ts --reporter=line` — 8 de 8 (as duas specs dos timeouts, sozinhas)

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa (`RevisaoDoPacote.tsx`, `page.tsx` e `pagina.test.ts` da T11; desvio acima)
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas (a `axe-todas` passa nas duas larguras, inclusive na T11 com o recolhível aberto)
