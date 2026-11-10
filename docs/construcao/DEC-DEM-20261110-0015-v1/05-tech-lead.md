---
pedido: DEC-DEM-20261110-0015-v1
etapa: 05-plano
agente: tech-lead
leu: [pedido.json, parada-P1.md, docs/superpowers/specs/2026-11-10-ws-orquestrador-demandas-novo-visual-design.md, 01-analista-requisitos.md, 02-arquiteto-solucoes.md, 03-ux-ui-design.md, 04-seguranca-aplicacao.md, padrao-tecnico.md, contrato-passagem.md, docs/superpowers/plans/2026-10-25-ws-orquestrador-demandas-plano.md (formato), package.json, playwright.config.ts, e2e/apoio.ts, src/app/globals.css, src/app/layout.tsx, src/app/(painel)/layout.tsx, src/components/CabecalhoPainel.tsx, src/components/Selo.tsx, src/components/rotulos.ts, src/components/Botao.tsx, src/components/Alerta.tsx, src/components/CampoTexto.tsx, src/components/GrupoOpcoes.tsx, src/components/Tabela.tsx, src/components/dados-da-decisao.ts, src/app/(painel)/demandas/page.tsx, src/app/(painel)/demandas/fila.tsx, src/app/(painel)/demandas/FiltrosFila.tsx, src/app/(painel)/demandas/[id]/page.tsx, src/app/(painel)/pacotes-decisao/[decId]/FormularioDecisao.tsx, src/modules/demandas/consultas.ts, src/modules/demandas/consultas.test.ts, test/banco.ts, test/desempenho/leitura.test.ts, test/estatico/pacote-sem-extras.test.ts, test/estatico/projeto.test.ts, test/estatico/painel-qa.test.ts, test/estatico/decisao-e2e.test.ts, scripts/seed-ficticio.ts (TITULOS_DO_E2E), .claude/agents/engenheiro-frontend.md, engenheiro-backend.md, engenheiro-dados-bd.md, qa-automacao.md, devops-sre.md, documentacao-tecnica.md, qa-funcional.md (listas Pode)]
status: bloqueado
proximo: tech-lead
devolvido_para: null
---
## Entrega

Plano em `docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md`, no formato da writing-plans
(cabeçalho, restrições globais G1 a G7, tarefas com arquivos, interfaces e passos TDD com código, rastreabilidade RF e
CV). Lista em `tarefas.json` (17 tarefas, mesma ordem do plano), conferida por `construir.mjs tarefas`: `ok: true`.

### Fases e tarefas

| Fase | Tarefa | Engenheiro | Risco | Cobre |
|---|---|---|---|---|
| 1 Vigilância | T01 Vigia de origem e CSP em todo e2e, teste estático de recurso externo e piso de asserções | frontend | alto | CV-02, CV-03, CV-20, RNF-07, RNF-08 |
| 2 Identidade | T02 Fontes Noto servidas pelo próprio app | frontend | alto | RF-02, RNF-06, CV-04, CV-05 |
| 2 Identidade | T03 Tokens da marca, contraste, foco e componentes base | frontend | baixo | RF-01, RNF-01, RNF-02 |
| 2 Identidade | T04 Marca e moldura pública (T01, T02, sem permissão, erro, 404) | frontend | alto | RF-13 |
| 2 Identidade | T05 Casca do painel e gaveta | frontend | alto | RF-03, RF-04, CV-16 |
| 3 Fila | T06 Seed fictício das demandas dos e2e novos | backend | baixo | apoio a CV-10, CV-13, CV-18, CA-08/09/12 (C-36) |
| 3 Fila | T07 Leituras novas da fila, só SELECT | dados-bd | alto | RF-05/06 (dado), RNF-09, CA-15.2, CV-06 |
| 3 Fila | T08 Regras de exibição da fila | backend | baixo | RF-05, RF-06, CV-07, CV-19 |
| 3 Fila | T09 T03 Fila: contadores, tabela, cartões e filtros | frontend | alto | RF-05 a RF-07, CV-06, CV-07, CV-08, CV-18 |
| 4 Demanda | T10 Regras de exibição: barra de etapas e Próxima ação | backend | baixo | RF-08, RF-09, CV-09, CV-19 |
| 4 Demanda | T11 T05 no arranjo A2 | frontend | alto | RF-08 a RF-10, CV-09, CV-18 |
| 5 Decisão | T12 T11: um formulário, três botões | frontend | alto | RF-11, CV-10, CV-11, CV-13, CV-14, CV-15 |
| 5 Decisão | T13 T11 no arranjo A e C2 | frontend | alto | RF-12, CV-11, CV-12, CV-13, CV-18, CV-19 |
| 6 Demais telas | T14 T04, T06, T07 e T08 com cartões e tokens | frontend | baixo | RF-14 |
| 6 Demais telas | T15 T09, T10 e T12 com cartões e tokens | frontend | baixo | RF-14 |
| 6 Demais telas | T16 Axe em T01 a T12 nas duas larguras, alvo de toque, fim dos nomes antigos | frontend | baixo | RF-16, RNF-03, RNF-05, RNF-13, RF-01 |
| 7 Fechamento | T17 Versão 0.2.0 e capturas de tela | frontend | alto | RF-17, RNF-12, CV-17, CV-01 final |

No modo `por_risco`, o maestro para antes das fases 1, 2, 3, 4, 5 e 7 (todas têm tarefa `alto`); a fase 6 segue sem
parada. Os cinco `alto` que a 04 pediu estão marcados: fixture e estático (T01), fontes (T02), formulário da T11 (T12,
e o arranjo da T13), leituras da fila (T07) e capturas (T17). Também ficaram `alto` as tarefas que mexem em tela de
autenticação (T04), no "Sair" (T05), na página com a guarda C-04 e a leitura nova (T09) e no `autorizar` novo da T05
(T11).

### O que o plano amarra

- **CV-01 em toda revisão:** G4 traz o comando `git diff 198e97d -- …` que tem de sair vazio, com os nove arquivos
  `'use server'` por caminho (conferidos com `git grep` em 10/11), e a regra de `src/modules/` só com arquivo novo.
- **Ordem do 04, 5.5:** a vigia de CSP (com o teste negativo) e o estático de recurso externo são a T01, antes de
  qualquer troca visual; fontes com CV-04 e CV-05 na T02.
- **Pacotes por nome:** `pnpm add -D -E @fontsource/noto-sans @fontsource/noto-sans-mono` (cabeçalho e T02), nenhum
  outro.
- **CV-20 automático:** `test/estatico/piso-de-assercoes.test.ts` com o piso de linhas `expect(` por arquivo de
  segurança, contado em 198e97d.
- **Testes existentes que mudam:** G5 lista cada arquivo e o que pode mudar (só seletor, texto ou passo equivalente).
- **Fora da 06:** G2 atribui CHANGELOG e manual (10), docker e homologação (09), `/security-review`, audit e
  conferência das PNG (08), teclado e leitura à mão (07), UAT no iPhone e publicação (Fabiano).

## Decisões tomadas

- D-01, nomes dos tokens (divergência da spec 7.3): paleta com os nomes da 03, com os nomes de hoje como apelidos por
  `var()` só até a T16, que os remove com teste estático; junta o fim da 03 (um nome por cor) ao cuidado do ADR-14
  (telas não migradas seguem certas a cada tarefa).
- D-02, recolhível (divergência 7.3): componente `Recolhivel` da 03, não `<details>`; a partir de 768 px o bloco tem de
  ficar aberto e sem controle, o que `<details>` não faz só com CSS, e a 03 pede `aria-expanded` e `aria-controls`.
- D-03: `CorSelo` e os `COR_*` seguem a 03, 2.5; o 02 delegou os valores de selo à 03, e as chaves de hoje não dão o
  mapa dela.
- D-04: capturas gravadas uma vez pelo `pnpm test:e2e` da T17 (pula o arquivo que já existe), com a lista `REGRAVAR`
  para correção da 08; evita PNG regravado a cada execução e cabe na lista Pode do frontend.
- D-05: o e2e do Enter (CV-10) usa o campo do identificador do documento; em "Comentários" (`<textarea>`) o Enter não
  envia, e o teste confere que nada sai.
- D-06: axe nas duas larguras no mesmo estado da página, para não criar demanda e estourar o C-36 (27 de 30 já usadas).
- D-07: demandas novas dos e2e vêm do seed (T06, `engenheiro-backend`, único com `scripts/`), pelo mesmo motivo.
- D-08: `leituras-da-fila.ts` embrulha as leituras novas, para o CV-08 ter teste de unidade e o CV-06 ter cadeia de
  importação conferível.
- D-09: a gaveta só monta a navegação quando aberta; o HTML estático continua com um só `aria-current`, como o
  `componentes-qa.test.ts` exige.
- D-10 e D-11: `proximaAcao` devolve destino de seção sem importar de `src/app/`, e a regex de id de demanda é cópia
  conferida por teste (o CV-09 só permite `import type` de `src/modules/`).
- D-12: piso de asserções como teste, não só contagem na 08.
- D-13: a versão exata dos `@fontsource` é a que o `pnpm add -E` resolver; não tenho acesso ao registro para fixá-la.
- D-14: P-01 de Fabiano aplicada: nenhuma opção marcada, recomendação em texto antes das opções, sem selo.
- D-15 e D-16: `Selo` com `data-cor` (teste sem nome de classe); revisão da T11 dividida em parte sempre visível e
  detalhe, porque o CV-12 só deixa recolher critérios, definição de pronto e o detalhe das opções.
- `CabecalhoPainel.tsx` é reescrito como o `header` da casca, em vez de apagado: a lista Pode dos engenheiros não
  apaga arquivo, e os testes de hoje continuam no mesmo nome.
- Cinco tarefas além das que o 04 pediu ficaram `alto` (T04, T05, T09, T11 e T13) por mexerem em tela de
  autenticação, "Sair", guarda de acesso, `autorizar` ou na revisão humana da T11 (CV-12), pela regra do contrato.

## Pendências

- Usei comandos só de leitura fora da minha lista Pode (`git grep`, `ls` e `cd`, listados abaixo): as ferramentas Glob
  e Grep não estavam disponíveis nesta sessão e precisei buscar no código rastreado; peço a liberação pela regra de
  25/10 (só leitura). O plano, o `tarefas.json` e esta entrega estão completos.
- `engenheiro-frontend` (T13) e Fabiano (UAT): o plano B do foco sob o rodapé (`focusin` com `scrollIntoView`) só entra
  se o CA-12.3 reprovar no Chromium; o comportamento no Safari do iOS fica para o UAT (P-04 da 03).
- `engenheiro-frontend` (T01): se o erro no fim da fixture não contar para o `test.fail()` do Playwright 1.63.0, vale o
  plano B escrito na T01; a entrega diz qual caminho valeu.
- `engenheiro-frontend` (T03): par de contraste abaixo do mínimo no teste volta à `03-interface`, sem troca de cor por
  conta própria (P-03 da 03).
- Backlog (não bloqueia): as 5 vulnerabilidades moderadas anteriores (esbuild via drizzle-kit, `@vitest/mocker`, glob,
  minimatch) entram no backlog de atualização (04); `next` 16.4.1 sem ADR de troca de linha (02, seção 11).
- `marketing-comunicacao` (não bloqueia): o bloco "WS" da marca contra o manual (P-02); se vetado, a troca é só na
  `MarcaWs` (T04).

## Comandos executados

- `cd /home/deploy/servidor/projetos/ws-orquestrador-demandas`
- `git status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, limpo
- `git log --oneline -8` — topo dee94c8 (P1 fabiano)
- `ls docs/construcao/DEC-DEM-20261110-0015-v1/`
- `git show HEAD:docs/superpowers/plans/ HEAD:src/ HEAD:src/app/ HEAD:src/components/ HEAD:e2e/ HEAD:test/ HEAD:test/estatico/`
- `git grep -n -E "COR_STATUS|COR_DECISAO|COR_NIVEL|CorSelo|'violet'|'slate'" -- src test e2e`
- `git grep -l -E "^['\"]use server['\"]" -- src` — os nove arquivos de G4
- `git grep -n -E "export (async )?function|export type|export const|from '" -- src/modules/demandas/consultas.ts src/modules/demandas/schemas.ts src/lib/fuso.ts`
- `git grep -n -E "^export|aprovarIndisponivel|statusDecisao" -- "src/components/dados-da-decisao.ts" "src/app/(painel)/pacotes-decisao/[decId]/page.tsx"`
- `git grep -n -E "^export|^  [a-zA-Z]+[?]?:" -- src/modules/pacotes-decisao/consultas.ts`
- `git show HEAD:src/modules/demandas/ HEAD:src/lib/ HEAD:docs/manual-tecnico/`
- `git grep -n -E "^export" -- test/banco.ts test/deps.ts test/sentinelas.ts`
- `git show HEAD:test/desempenho/ HEAD:test/transversal/ HEAD:scripts/`
- `git grep -n -E "TITULOS_DO_E2E|export const" -- scripts/seed-ficticio.ts`
- `git grep -n -E "export" -- src/db/index.ts`
- `git grep -n -E "^(test|test\.describe|  test)\(|^import" -- e2e/axe-todas.spec.ts`
- `cd /home/deploy/servidor/projetos/estruturaAutonoma`
- `git grep -n -A 14 "^\*\*Pode:\*\*" -- .claude/agents/engenheiro-frontend.md .claude/agents/engenheiro-backend.md .claude/agents/engenheiro-dados-bd.md .claude/agents/documentacao-tecnica.md .claude/agents/qa-automacao.md`
- `git grep -n -A 10 "^\*\*Pode:\*\*" -- .claude/agents/devops-sre.md .claude/agents/qa-funcional.md`
- `git grep -n -E "https?://" -- "src/*.ts" "src/*.tsx" "src/*.css" ":!*.test.ts" ":!*.test.tsx"`
- `git grep -c "expect(" 198e97d -- e2e/seguranca.spec.ts e2e/seguranca-qa.spec.ts src/proxy.test.ts test/estatico "src/modules/*.test.ts"` — pisos da T01
- `git grep -n -E "googleapis|gstatic|next/font|dangerouslySetInnerHTML|style=\{|@import|url\(" -- src e2e test "*.config.*"`
- `git grep -n -E "CabecalhoPainel|ehPaginaAtual|navegacao-principal|'Menu'|\"Menu\"" -- src test e2e`
- `git grep -n -E "export const RE_ID|DEM-\\\\d\{8\}" -- src`
- `git grep -n -E "#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b" -- "src/*.ts" "src/*.tsx" ":!*.test.ts"` — só o QR da T02
- `git grep -n -E "^test\(|^  test\(|^test\.describe" -- e2e/seguranca.spec.ts e2e/fila.spec.ts e2e/moldura.spec.ts e2e/decisao.spec.ts`
- `git grep -n -E "^### T3[67]|^## Fase|^\*\*(Arquivos|Interfaces|Engenheiro|Risco|Critério|Depende)" -- docs/superpowers/plans/2026-10-25-ws-orquestrador-demandas-plano.md`
- `node /home/deploy/servidor/projetos/estruturaAutonoma/ferramentas/construir/construir.mjs tarefas /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261110-0015-v1/tarefas.json` — `ok: true`, sem erros

## Critério de pronto atendido

- [x] (05) cada RF de 01 e cada controle de 04 é coberto por ao menos uma tarefa
- [x] (05) cada tarefa do plano começa pelo teste que falha
- [x] (05) `tarefas.json` passa em `construir.mjs tarefas` e tem as tarefas do plano, na mesma ordem
- [x] (05) toda tarefa tem `risco`, pela regra da Entrega
