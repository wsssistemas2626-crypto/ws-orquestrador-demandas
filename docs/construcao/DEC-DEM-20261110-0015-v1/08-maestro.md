---
pedido: DEC-DEM-20261110-0015-v1
etapa: 08-revisao
agente: maestro
leu: [construir.md seção 3, contrato-passagem.md, pedido.json, spec 2026-11-10-ws-orquestrador-demandas-novo-visual-design.md, 01-analista-requisitos.md (RF-06), 03-ux-ui-design.md (T11, envio e diálogo), 04-seguranca-aplicacao.md, 06-T17-tech-lead.md, 06-T17-qa-automacao.md, 07-qa-funcional.md, git diff main...HEAD, src/modules/demandas/resumo-da-fila.ts, src/app/(painel)/pacotes-decisao/[decId]/FormularioDecisao.tsx, src/components/DialogoConfirmacao.tsx, node_modules/@fontsource/noto-sans{,-mono}/package.json]
status: pronto
proximo: devops-sre
devolvido_para: null
---
## Entrega

Revisei o ramo `construcao/DEC-DEM-20261110-0015-v1` contra a `main` (`198e97d`, 0.1.13): 182 arquivos, 13.572
linhas acrescentadas e 942 removidas, 109 arquivos em `src/`.

**Resultado: nenhum achado crítico nem alto.** A versão segue para a entrega (09). Os achados médios e baixos estão em
Pendências e viram demandas próprias ou dívida registrada; nenhum afrouxa controle nem muda rota, action, esquema,
migration, papel ou regra.

### Revisões usadas

1. **Código:** a skill `code-review` em nível alto, sobre o ramo contra a `main` (`code-review:code-review` pede PR,
   que ainda não existe nesta etapa). Ela leu o código de produção de `src/`, `scripts/seed-ficticio.ts`,
   `globals.css` e a montagem das fontes, e passou os olhos nos testes e no e2e. `tsc --noEmit` limpo. Dez achados,
   nenhum que derrube o app ou vaze dado.
2. **Segurança:** a skill `security-review` revisa o ramo atual da sessão, que roda na raiz da estruturaAutonoma, e não
   este repositório. Por isso usei a alternativa da seção 3: o agente `seguranca-aplicacao` com o diff do ramo e o
   `04-seguranca-aplicacao.md`, achados na resposta, sem gravar arquivo. Nenhum crítico ou alto; um médio já existente
   na `main` e quatro baixos.

### Triagem dos dois achados de maior peso da revisão de código

Conferi os dois contra a spec aprovada antes de classificar:

- **Etapas da fila x barra da demanda** (`resumo-da-fila.ts:37`): a fila marca ESP/RSK/DEC como feitas quando há ao
  menos uma versão, e a barra da T05 só marca DEC feita quando aprovada. Isso é o que o RF-06 do 01 manda ("cada uma
  feita quando a demanda tem ao menos uma versão daquele tipo") e o CA-06.1 testa. Não é defeito do código; é uma
  diferença de significado entre duas telas, aprovada na Parada 1. Fica como **médio**, para uma demanda de ajuste do
  texto ("DEC feita" → "DEC registrada", ou a mesma regra da barra), a decidir por Fabiano.
- **Enter num campo envia por "Aprovar"** (`FormularioDecisao.tsx:218`): é o desenho da 03 (T11: "Enter num campo de
  texto envia pelo principal: passa por validação e pelo diálogo, como qualquer clique"). O diálogo abre com o foco no
  cabeçalho (`DialogoConfirmacao.tsx:47`), não em "Confirmar e registrar", então dois Enter seguidos não registram a
  aprovação; a validação, o documento e a caixa de revisão continuam obrigatórios, e a regra vale no servidor
  (`acoes.ts` e `decidir.ts` sem diff). Fica como **baixo**.

### O que conferi e está limpo

- CSP e recursos externos: `src/proxy.ts`, `next.config.ts`, `playwright.config.ts` e `Dockerfile` sem diff; fontes só
  por `next/font/local` a partir dos `@fontsource`; nenhum domínio novo; a vigia CV-03 em todos os e2e, `retries: 0`.
- Superfícies congeladas: só mudaram `src/app/api/saude/route-qa.test.ts` (+5, só teste, exceção aceita na
  06-T17-tech-lead) e `src/modules/demandas/resumo-da-fila.ts` com o teste (leitura só de SELECT prevista no ADR-16).
  Os nove arquivos `'use server'` sem diff.
- XSS e bidi: texto de terceiro só por JSX, títulos isolados com `<bdi>`, U+202E só por `String.fromCodePoint`, sem
  `dangerouslySetInnerHTML`; nenhum controle bidi cru em `src`, `e2e`, `test`, `scripts` e `docs`.
- Decisão no celular: nenhuma opção pré-marcada (P-01), documento e revisão obrigatórios como antes.
- Dependências: só `@fontsource/noto-sans` e `@fontsource/noto-sans-mono` 5.3.0, com sha512 no lockfile e sem
  dependência transitiva. Conferi o `package.json` dos dois em `node_modules`: `scripts` vazio (fecha o B4 da
  segurança). `pnpm audit --prod`: 5 moderadas transitivas, as mesmas de antes do pedido; nenhuma alta ou crítica.
- Capturas: nove PNG só com dado fictício do seed.

## Decisões tomadas

- Classifiquei como médio, e não alto, a diferença das etapas entre fila e demanda, porque segue o RF-06 aprovado; e
  como baixo o Enter pelo principal, porque segue a 03 e o diálogo não põe o foco em "Confirmar".
- O QF-0015-04 (Sair com o limite por IP estourado) existe igual na `main`: o `sair()` do `BotaoSair` é o do
  `CabecalhoPainel` de antes, linha a linha. Não é regressão deste pedido e a correção mexe em `auth.ts`, congelado
  aqui. Vai como demanda própria.
- As duas falhas intermitentes do e2e (rodada 1 da 06-T17-testes, `axe-todas.spec.ts:229` e `:267`) e o tempo do
  `decisao.spec.ts:148` não bloqueiam a revisão de código: são risco de execução, medido na 09 e no CI do PR.

## Pendências

**Médios (demanda própria ou decisão de Fabiano):**

- **R-01 (código):** etapas da fila ("ESP/DEC feita" com qualquer versão) diferentes da barra da T05 (DEC feita só
  aprovada). Segue o RF-06 aprovado; propor ajuste de texto ou de regra. `src/modules/demandas/resumo-da-fila.ts:37`.
- **R-02 (código):** `conferir()` e `opcaoAprovada()` em `src/components/dados-das-etapas.ts:62` lançam erro com dado
  inconsistente (DEC aprovado sem opção registrada), e a T05 (`demandas/[id]/page.tsx:374`) as chama sem proteção:
  a página inteira da demanda cai, quando só a barra e o cartão "Próxima ação" deveriam recuar.
- **R-03 (código):** a gaveta do menu (`src/components/casca/GavetaMenu.tsx:112`) só fecha pelos próprios controles;
  com o gesto de voltar do celular o `<dialog>` fica aberto e `html.gaveta-aberta` trava a rolagem. Fechar quando o
  `pathname` mudar.
- **R-04 (segurança, QF-0015-04, já na `main`):** `/api/auth/sign-out` cai no limite de 10 por minuto por IP; com 429
  o cliente vai a `/entrar` e o cookie continua válido. Correção em demanda própria: regra própria para `/sign-out` em
  `auth.ts`, tratar o erro no `BotaoSair` (muda a 03, 3.4) e um teste que force 429.

**Baixos (dívida registrada):**

- R-05: Enter num campo envia por "Aprovar" (desenho da 03; diálogo com foco no cabeçalho). Reavaliar se "Aprovar"
  deve ser o botão padrão.
- R-06: sem JavaScript, o formulário dos contadores perde `limit` (`ContadoresDaFila.tsx:93`).
- R-07: a T05 carrega a vista inteira do DEC só para a barra (`demandas/[id]/page.tsx:365`); uma leitura estreita sai
  mais barata.
- R-08: `contarDemandasPorStatus` roda a cada navegação da fila (`demandas/page.tsx:120`) e repete à mão o filtro de
  `paginaDeDemandas` (`resumo-da-fila.ts:18`); um auxiliar de condição em comum evita que "Todas N" e "N demandas
  encontradas" divirjam no futuro.
- R-09: código morto do formulário de três botões (`opcoesDaDecisao`, `legendaDecisao`, `statusDecisao`) em
  `src/components/dados-da-decisao.ts:184`; já anotado nas revisões da construção.
- R-10: constantes de desenho (`CLASSE_DA_ETIQUETA`, `COR_DA_URGENCIA`, `COR_DO_PONTO`) em arquivo de rota e
  duplicadas com o `Selo`; mover para `src/components`.
- R-11 (segurança B1 a B3): a vigia não acusa `data:`/`blob:` (hoje coberto pela CSP); o teste estático de recurso
  externo não pega `//cdn`, `iframe`, `srcSet` nem `remotePatterns`; o teste de bidi não varre `.md`, `.json`,
  `.jsonl`, `.yaml` e `.mjs`.

**Para a 09-entrega (devops-sre):**

- Medir no CI e na homologação os testes longos: `decisao.spec.ts:148` (23,4 s), `reflow-t15-qa:105` e
  `axe-todas:395`; e observar as intermitências `axe-todas.spec.ts:229` (socket hang up) e `:267` (30 s). Regra da
  06-T17-tech-lead: sem subir `timeout` nem `retries` e sem `test.slow()`; acima de 24 s, devolver para dividir.
- Rodar `pnpm audit --audit-level high` sem `--prod`, porque o `Dockerfile` copia as devDependencies (pendência da 04).

**Para Fabiano (depois do PR):** roteiro de aceite da 07 (11 passos, em homologação, com iPhone e Safari), P-01, o
QF-0015-01 (coluna Idade cortada em 1280 px) e a publicação da 0.2.0 no ar.

## Critério de pronto atendido

- [x] Revisão de código e de segurança feitas sobre o ramo inteiro, com a revisão usada registrada.
- [x] Nenhum achado crítico ou alto: `status: pronto`, `proximo: devops-sre`.
- [x] Médios e baixos registrados em Pendências, com arquivo e linha.
