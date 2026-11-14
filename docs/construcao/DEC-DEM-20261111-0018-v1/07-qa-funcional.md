---
pedido: DEC-DEM-20261111-0018-v1
etapa: 07-qa-funcional
agente: qa-funcional
leu: [pedido.json, contrato-passagem.md, docs/superpowers/specs/2026-11-13-ws-orquestrador-demandas-sobras-design.md, 01-analista-requisitos.md, 03-ux-ui-design.md, tarefas.json, 06-T01-qa-automacao.md, 06-T02-qa-automacao.md, 06-T03-qa-automacao.md, 06-T04-qa-automacao.md, 06-T05-qa-automacao.md, 06-T06-qa-automacao.md, 06-T07-qa-automacao.md, 06-T08-qa-automacao.md, 06-T09-qa-automacao.md, 06-T10-qa-automacao.md, 06-T11-qa-automacao.md, 06-T12-qa-automacao.md, 06-T13-qa-automacao.md, 06-T14-qa-automacao.md, docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md (G5 e T14; busca por CA-05), DEC-DEM-20261111-0017-v1/07-qa-funcional.md (formato), src/app/(painel)/pacotes-decisao/[decId]/page.tsx (linhas 140 a 270), src/app/(painel)/pacotes-decisao/[decId]/FormularioDecisao.tsx (por busca e linhas 195 a 297), src/components/Alerta.tsx, src/components/dados-da-decisao.ts (linhas 80 a 180 e 390 a 450), src/app/globals.css (busca por focus-visible), e2e/vigencia.spec.ts, e2e/decisao.spec.ts (linhas 300 a 370), e2e/decisao-celular.spec.ts (linhas 395 a 440), e2e/apoio.ts (busca), e2e/axe-todas.spec.ts (busca), e2e (busca por semViolacoes com T05 e substituído), playwright.config.ts (busca), test/matriz-rotas*.test.ts (busca), src/**/*vigencia*.test.ts (busca), scripts/seed-ficticio.ts (busca pelos títulos)]
status: devolvido
proximo: engenheiro-frontend
devolvido_para: 06-T11-construcao
---
## Entrega

### 0. Escopo e como ler

Este é o roteiro funcional da 0.4.1 do WS Orquestrador de Demandas, com as sobras da 0.1.13 e da revisão final da 0.4.0.
O documento tem seis partes:

1. o mapa de cada critério de aceite do `01` para o teste automatizado que o cobre (seção 1);
2. a conferência de foco, teclado e leitor de tela dos avisos novos, que a revisão da T12 deixou para esta etapa (seção 2);
3. o roteiro manual por critério, com passos, dado fictício e resultado esperado (seção 3);
4. os casos exploratórios sugeridos e o que fica de fora (seção 4);
5. o roteiro de aceite para Fabiano (seção 5);
6. os candidatos a automação (seção 6).

**Resultado:** 36 dos 37 critérios estão cobertos. O CA-05.2 está coberto só em parte: o axe da T05 com DEC substituído
roda em 1280 × 720 e não roda em 390 × 844. Por isso a entrega volta à `06-T11-construcao` (Pendências, primeira
linha). O restante do documento já vale para depois da correção.

Regras do documento:

- **Ambiente:** homologação da 0.4.1 com o seed fictício da T10, subida pela `09-entrega`. **Nada aqui roda em
  produção.** O seed deve ser refeito antes do roteiro manual e do UAT. O e2e grava em duas demandas do seed:
  `vigenciaArquivar` e `arquivarSemVigente`.
- **Token:** a rota de situação é chamada com o token `construir` emitido dentro da homologação, pela regra do plano
  ("Verificação na homologação": arquivo 600 em pasta de `mktemp -d`, revogado e apagado no fim). Neste documento ele
  aparece só como `<token-construir-hml>`.
- **Chamada padrão (S1):** `GET <HML>/api/pedidos-construcao/<DEC>/situacao`, com `Authorization: Bearer
  <token-construir-hml>`, `accept: application/json`, sem `Origin` e sem cookie.
- **Dados:** todos são fictícios. As demandas do seed são citadas pelo título. Os ids inventados seguem o padrão
  `DEC-DEM-20991231-9999-v1`. O nome de solicitante inventado é "Joana Ficticia Lima", e o nome da troca é "Outra
  Pessoa Teste". O documento de aprovação inventado é `DOC-FICTICIO-0018`, e o e-mail inventado é
  `contato@ficticio.test`.
- **Textos de tela:** valem os da `03`, seção 8, que a spec 4.3 repete. `<v1>` e `<v2>` são os ids lidos na tela.

Seed da T10 e da 0.4.0 usado no roteiro (estado logo depois do seed):

| Título (fictício) | Status | DECs |
|---|---|---|
| Vigência: pacote novo pendente de dupla aprovação | Pronta para decisão | v1 `cto` aprovado (A), em vigor; v2 `cto_e_administradora` pendente |
| Vigência: pacote só do CTO depois da dupla aprovação | Pronta para decisão | v1 `cto_e_administradora` aprovado (A) pela "cto" e pela "administradora", em vigor; v2 `cto` pendente |
| Vigência: arquivar o pacote novo com um aprovado em vigor | Pronta para decisão | v1 `cto` aprovado (A), em vigor; v2 `cto` pendente |
| Arquivar sem pacote aprovado em vigor | Nova | nenhum (só ESP e RSK) |
| Pedido para o /construir buscar | Aprovada | DEC aprovado, com pedido gerado pela "cto" |
| Andamento: pacote sem pedido gerado | Pronta para decisão | DEC aprovado, sem pedido gerado |
| Andamento: construindo, sem plano de tarefas e construção concluída | Em construção | da 0.4.0, para a regressão da fila |

Demandas que o roteiro cria à mão, sempre como "cto", com ESP e RSK mínimas:

| Título (fictício) | Para |
|---|---|
| D1: nome trocado | R-02.1, R-02.2, R-02.5 |
| D1: sem nome | R-02.4 |
| Devolver com aprovado em vigor | R-03.4 |
| Arquivar com vigente desatualizado | R-03.6c |
| Linha 6 da dupla aprovação | R-05.1e |

### 1. Mapa: critério de aceite → teste automatizado

São 37 critérios do `01` (CA-01.1 a CA-10.2), e todos estão no mapa.
- 33 estão cobertos por teste automatizado.
- 3 são documentação, cobertos pela etapa dona, a `10-documentacao`, como no 0017: CA-04.4, CA-09.1 e CA-10.2. O
  critério 8 do pedido, que não é CA do `01`, também fica com a etapa dona: a `09-entrega` e a `10-documentacao`.
- 1 está coberto só em parte (CA-05.2) e é o motivo da devolução.

A coluna "Nível" diz onde o critério é provado: U (unidade), B (Postgres real), R (rota real pelo `rota()`), T (HTML do
servidor), E (e2e Playwright contra o build), S (estático) e D (conferência documental). Os arquivos `-qa` são da
`qa-automacao`; os outros, dos engenheiros.

#### RF-01. Situação do Pedido de Construção (T01, T02)

| CA | Teste automatizado (arquivo › teste) | Nível |
|---|---|---|
| CA-01.1 | `src/modules/pedido-construcao/situacao.test.ts` › "CA-01.1: DEC aprovado com pedido gerado por pessoa…"; `src/app/api/pedidos-construcao/situacao.test.ts` › "vigente → 200 {"situacao":"vigente"}, JSON, no-store e nosniff, sem CORS…" | B, R |
| CA-01.2 | os dois `situacao.test.ts` › "CA-01.2: v2 de dupla aprovação…" e "CA-01.2: v2 só do cto aprovado…"; `situacao-qa.test.ts` › "v2 pendente e v2 devolvido: o v1 segue vigente…" e "v1 substituído por um v2 aprovado sem pedido gerado e um v3 pendente…" | B, R |
| CA-01.3 | rota › "sem pedido gerado, pedido_gerado de agente, de sistema e de pessoa noutra demanda: iguais ao inexistente desta rota, da entrega e do andamento"; `situacao-qa.test.ts` › "cada caso sem pedido gerado por pessoa na própria demanda: a mesma resposta e a mesma sequência de consultas…" | R |
| CA-01.4 | `situacao-403.test.ts` › "%s: 403 igual para DEC existente e inexistente, sem chamar o serviço…"; rota › "awave, os quatro agentes, cto e administradora (sessão com 2FA) → 403…"; `situacao-qa.test.ts` › 12 atores × 8 estados com o serviço real; `test/matriz-rotas.test.ts` e `matriz-rotas-integracoes-qa.test.ts` (a rota nova entra pelo `globSync`); `matriz-situacao.test.ts` e `-qa` | R, U |
| CA-01.5 | rota › "200, 403, 404 e 503: o retrato é igual antes e depois de cada um" e "cada chamada deixa uma linha…"; `test/transversal/sentinelas-situacao.test.ts` | R |
| CA-01.6 | `src/modules/pedido-construcao/situacao.test.ts` › "SB-04 (CA-01.6): prazo total"; rota › o caso 503 do CA-01.5; `test/estatico/situacao.test.ts` › "nenhum SET, transação própria, Promise.all nem trava…" | B, R, S |

#### RF-02. D1 com o nome da criação (T03, T04, T05)

| CA | Teste automatizado | Nível |
|---|---|---|
| CA-02.1 | `src/modules/pedido-construcao/conferir-nome-da-criacao.test.ts` › "CA-02.1…"; `conferir-nome-da-criacao-qa.test.ts` › "sem troca de nome: com a coluna nula ou vazia…" | B |
| CA-02.2 | `conferir-nome-da-criacao.test.ts` › "CA-02.2: o solicitante trocado…"; `-qa` › "cinco trocas seguidas…", "a opção escolhida com o nome antigo…", a troca concorrente com a geração e a entrega, e "o nome em vigor é o da criação do DEC…" | B |
| CA-02.3 | `conferir-nome-da-criacao.test.ts` › "CA-02.3: com um pedido_gerado de pessoa anterior…"; `-qa`: todo caso passa por `entregarPedido` e pela rota de entrega (`recusaEmTodosOsCaminhos`) | B, R |
| CA-02.4 | `conferir-nome-da-criacao.test.ts` › "DEC sem nome em texto algum: o JSON é o de montarPedido + serializarPedido…"; `test/transversal/visibilidade-caminhos-da-criacao.test.ts` e `-qa` (a coluna fora de toda saída) | B, R |
| CA-02.5 | `test/transversal/sentinelas-nome-da-criacao.test.ts`; `conferir-nome-da-criacao-qa.test.ts` › "as recusas do D1 nos cinco caminhos e um 500 controlado…: nenhum dos dois nomes nas saídas, e o Sentry recebeu envelope" | B, R |

#### RF-03. Arquivamento com aprovado vigente (T06, T12, T13, T14)

| CA | Teste automatizado | Nível |
|---|---|---|
| CA-03.1 | `src/modules/pacotes-decisao/arquivar-com-vigente.test.ts` › "CA-03.1…"; `arquivar-com-vigente-qa.test.ts` › "PATCH arquivar o v2 → 200 e aprovada pelo Sistema…"; `e2e/vigencia.spec.ts` › "CA-03.1: arquivar o v2 com v1 em vigor → Aprovada…" | B, R, E |
| CA-03.2 | `arquivar-com-vigente.test.ts` › "CA-03.2…"; `-qa` (POST do pedido do v1, `validarPedido` do /construir e situação `vigente` pelo token `construir`); e2e CA-03.1 (Próxima ação e link do v1) | B, R, E |
| CA-03.3 | `arquivar-com-vigente.test.ts` › "CA-03.3 (outro sentido)…"; `arquivamento-status.test.ts` (coluna `nenhum`); `-qa` › "DEC anterior devolvido não é vigente…"; `e2e/decisao.spec.ts:455` ("Arquivar → …" na `arquivarSemVigente`) | B, E |
| CA-03.4 | `arquivar-com-vigente.test.ts` › "CA-03.4: … devolver o v2 → em_analise…" | B |
| CA-03.5 | `arquivar-com-vigente.test.ts` › "CA-03.5…"; `scripts/seed-vigencia-qa.test.ts` › "vigenciaNivelMenor: aprovar o v2 só do CTO é recusado (409 do S-01)…; arquivá-lo leva a Aprovada…" | B |
| CA-03.6 | `dados-da-decisao-vigencia.test.ts` › "dica do Arquivar pelo destino…"; `dados-da-decisao-vigencia-qa.test.ts` › "dica do Arquivar em todo status e estado do vigente…" (9 × 3); `pagina-vigencia-qa.test.ts`; `e2e/vigencia.spec.ts` › "CA-06.1 e CA-03.6…" (descrição acessível do Arquivar) | U, T, E |

#### RF-04. C-27 (T08)

| CA | Teste automatizado | Nível |
|---|---|---|
| CA-04.1 | `src/lib/deps-qa.test.ts` › "C-27: com DATABASE_URL_MIGRATOR no ambiente…": 20 execuções seguidas na construção e 20 na `06-T08-testes`, registradas uma a uma | B |
| CA-04.2 | `test/estatico/sessoes-do-banco-qa.test.ts` › "as três asserções, com os matchers de antes", "nenhum filtro por usename…" e "o JS não filtra a lista…"; PISO `src/lib/deps-qa.test.ts: 8` (8 em `41108ee`) | S |
| CA-04.3 | `test/sessoes-do-banco.test.ts` › "CA-04.3…"; `test/sessoes-do-banco-qa.test.ts` › app inteiro, só a fila e o pool do migrator, e a espera por tentativas | B |
| CA-04.4 | **Documentação, etapa dona `10-documentacao`.** Conferência R-04.4 (seção 3) | D |

#### RF-05. Textos revistos (T11, T12)

| CA | Teste automatizado | Nível |
|---|---|---|
| CA-05.1 | `src/components/textos-0018.test.ts`; `dados-da-decisao-vigencia-qa.test.ts` › "os textos novos são os da própria entrega da ux-ui-design" (lê a seção 8 da 03 e compara 12 constantes); `rotulos.test.ts`; `nivel-do-pedido.test.ts` e `test/estatico/nivel-do-pedido.test.ts` (linha 6 pelo nível); e2e `decisao.spec.ts:305`, `decisao-celular.spec.ts:402` e `pedido-construcao.spec.ts:264` e `:344` | U, T, S, E |
| CA-05.2 | **Coberto em parte.** T11 do substituído: 1280 × 720 em `decisao.spec.ts:354` e `pedido-construcao.spec.ts:409`; 390 × 844 em `decisao-celular.spec.ts:437`. T05 com DEC substituído: só `decisao.spec.ts:365` (`semViolacoes`, viewport `Desktop Chrome` de 1280 × 720). **T05 em 390 × 844: sem cobertura** → devolvido à `06-T11-construcao` | E |

#### RF-06. Avisos (a), (b) e (c) (T10, T12, T14)

| CA | Teste automatizado | Nível |
|---|---|---|
| CA-06.1 | `dados-da-decisao-vigencia.test.ts` › "aviso (a)…" e "com uma das duas aprovações registrada…, o mesmo aviso"; `pagina-vigencia.test.ts` › "(a) também com a primeira das duas aprovações registrada"; `pagina-vigencia-qa.test.ts` (528 páginas por status); `e2e/vigencia.spec.ts` › "CA-06.1 e CA-03.6…" | U, T, E |
| CA-06.2 | os mesmos arquivos › "(b)…"; `pagina-vigencia-qa.test.ts` › "o v1 substituído pelo v2, com o v3 pendente…"; `e2e/vigencia.spec.ts` › "CA-06.2…" | U, T, E |
| CA-06.3 | os mesmos arquivos › "(c)…" (texto inteiro na página no `-qa`); `e2e/vigencia.spec.ts` › "CA-06.3…" (também o v1 sem (b)) | U, T, E |
| CA-06.4 | `dados-da-decisao-vigencia.test.ts` › "CA-06.4…"; `dados-da-decisao-vigencia-qa.test.ts` (115.344 casos e 8 mutantes plantados); `pagina-vigencia-qa.test.ts` › "casos nomeados em que o aviso seria falso…" e "corridas e estados de três DECs…" | U, T |
| CA-06.5 | `e2e/vigencia.spec.ts`: os três testes dos avisos, com o texto exato (`exact: true`) e `semViolacoesNasDuasLarguras` com cada aviso na página | E |

#### RF-07. Uma linha de andamento por demanda (T07)

| CA | Teste automatizado | Nível |
|---|---|---|
| CA-07.1 | `src/modules/andamento/consultas.test.ts` (testes de resultado sem mudança contra `41108ee`); `consultas-qa.test.ts` › "o resultado é a linha de maior id de cada uma…" | B |
| CA-07.2 | `consultas.test.ts` › "a página usa andamento_construcao_demanda_id_idx, sem varrer a tabela e sem Sort sobre ela"; `consultas-qa.test.ts` › páginas de 1, 4, 50 e 204 demandas, com o controle da consulta da 0.4.0 | B |
| CA-07.3 | `consultas.test.ts` › "explain analyze: no máximo 2 linhas lidas…"; `consultas-qa.test.ts` › "3.000, 500, 2 e 1 linhas → exatamente 4 lidas…" e "200 demandas…: exatamente 200 lidas" | B |

#### RF-08. Piso de asserções (T09)

| CA | Teste automatizado | Nível |
|---|---|---|
| CA-08.1 | `test/estatico/piso-de-assercoes.test.ts` › "src/modules/andamento/registrar-qa.test.ts tem ao menos 69 linhas com expect("; `piso-de-assercoes-0018.test.ts` | S |
| CA-08.2 | `piso-de-assercoes-0018.test.ts` › casos 3 e 4; as razões dos candidatos fora estão nas tabelas da `06-T09-qa-automacao.md` | S, D |
| CA-08.3 | `piso-de-assercoes-0018.test.ts` › "a cópia de 41108ee tem as 63 entradas…" e "nenhuma entrada de 41108ee saiu nem diminuiu" | S |

#### RF-09 e RF-10. Spec, documentação e versão

| CA | Teste automatizado | Nível |
|---|---|---|
| CA-09.1 | **Documentação, etapa dona `10-documentacao`.** Conferência R-09.1 | D |
| CA-10.1 | `test/estatico/projeto.test.ts` › "versão 0.4.1, privado, ESM, Node 24 e pnpm 12.6.0 fixo (C-39)" | S |
| CA-10.2 | **Documentação, etapa dona `10-documentacao`.** Conferência R-10.2 | D |

Os CA documentais não voltam para uma 06. Pela G2 do plano, nenhuma tarefa da 06 escreve em `docs/` nem no `CHANGELOG.md`,
e nenhuma tarefa do `tarefas.json` é dona deles (o mesmo tratamento do 0017).

#### Critérios preliminares (pedido.json) e RNF

| Item | Coberto por |
|---|---|
| Critério 1 (situação) | CA-01.1 a CA-01.4 |
| Critério 2 (D1 depois da troca) | CA-02.1 a CA-02.3 |
| Critério 3 (arquivar o v2) | CA-03.1, CA-03.2 (outro sentido: CA-03.3) |
| Critério 4 (C-27) | CA-04.1, CA-04.2 |
| Critério 5 (três avisos) | CA-06.1 a CA-06.5; textos: CA-05.1 |
| Critério 6 (fila sem Sort) | CA-07.2, CA-07.3 (resultado: CA-07.1) |
| Critério 7 (registrar-qa no PISO) | CA-08.1 |
| Critério 8 (serviço `migrar` no `deploy.md`) | **Documentação e publicação, etapas donas `09-entrega` e `10-documentacao`.** Em 14/11, o `deploy.md` ainda não cita `migrar` (06-T14). Conferência R-P8 |
| RNF-01 | `09-entrega` (50 chamadas na homologação, p95 ≤ 500 ms) |
| RNF-02 | CA-01.6 |
| RNF-03 | `situacao.test.ts` (rota) e `situacao-qa.test.ts` (bytes e cabeçalhos) |
| RNF-04 | CA-01.5 |
| RNF-05 | `09-entrega` (5.000 demandas e 6.000 linhas, `main` × ramo) |
| RNF-06 | CA-04.1, CA-04.2 |
| RNF-07 | `matriz-situacao.test.ts` › "(b) o construir tem exatamente cinco ações e o awave exatamente duas; a matriz tem 25 ações"; `matriz.test.ts` |
| RNF-08 | `test/estatico/migration-0010.test.ts`, `migrations-congeladas-qa.test.ts`; ensaio de rollback na 09 |
| RNF-09 | CA-02.5; `marcacao-da-criacao-qa.test.ts` (evento, log e Sentry da criação) |
| RNF-10 | CA-06.5; e2e CA-03.1 (T11 arquivado e T05, nas duas larguras) |
| RNF-11 | 06-T14: Vitest 9.276 de 9.276; e2e 294 aprovados, 9 pulados e 0 falha em três execuções seguidas |
| RNF-12 | CA-05.1 (lido da própria 03) |

### 2. Foco, teclado e leitor de tela nos avisos novos

A revisão da T12 deixou esta conferência para a 07. Este agente não roda o navegador. A conferência foi feita assim:

- li o código da T11 (`page.tsx`, `FormularioDecisao.tsx`, `Alerta.tsx`, `globals.css`);
- li o `e2e/vigencia.spec.ts` da T14, que já prova parte dela;
- o que só uma pessoa com leitor de tela consegue julgar ficou no roteiro (R-A11Y) e nos exploratórios.

| Item da 03, seção 9 | Como está no código | Prova automatizada | Falta conferir à mão |
|---|---|---|---|
| Aviso não focável; só o link entra no Tab | `<Alerta tipo="atencao">` sem `tabIndex`; um `<p>` e um `<Link>` (`page.tsx:240-246`) | `avisoNaPagina`: `tabIndex` -1 no `<p>`, um só focável no aviso, Shift+Tab e Tab saem do aviso | — |
| Ordem no DOM: resultado, lembrete, substituído, (b), (a) ou (c), desatualizado, rascunho | `page.tsx:222-260`, nessa ordem | `pagina-vigencia-qa.test.ts` (posição do aviso) | ouvir a ordem com leitor de tela (R-A11Y.1) |
| Estático, sem `role="alert"` e sem `aria-live` | `Alerta` só põe `role="alert"` com `envio` e tipo erro ou sucesso (`Alerta.tsx:18-20`) | e2e › "o aviso é estático, sem role" | o aviso não é anunciado sozinho ao abrir a página (R-A11Y.1) |
| Nome do link com o id inteiro (2.4.4) | o rótulo é `abrirSubstituto(id)` | e2e › `toHaveAccessibleName` | — |
| (c) com "Criar pacote novo", o mesmo nome e destino do desatualizado (3.2.4) | `href` `/demandas/<id>/pacotes-decisao/novo` | e2e › `toHaveAttribute('href', …)` | — |
| Alvo de 44 px abaixo de 768 px e de 24 px acima | `CLASSE_LINK_SOLTO` = `inline-flex min-h-11 … md:min-h-6` | axe nas duas larguras (só acusa falta de alvo, não mede 44 px) | medir em 390 px (R-A11Y.3) |
| Foco visível no link sobre `atencao-fundo` | `:focus-visible` global, 2 px com afastamento de 2 px (`globals.css:118-121`); o mesmo par do aviso do substituído de hoje | nenhuma | ver o contorno em 1280 e 390 px (R-A11Y.2) |
| Id em texto corrido quebra sem rolagem lateral | `[overflow-wrap:anywhere]` no `<p>` do aviso. O `<p>` do aviso do substituído não tem a classe, como na 0.1.13, e o link não tem a classe | nenhuma em 320 px | reflow em 320 px e zoom de 400 % (R-A11Y.3; EXP-02) |
| Dica do Arquivar lida ao focar o botão (3.3.4) | `<p id="decisao-consequencia-arquivar">` antes do grupo de botões; `aria-describedby` no Arquivar (`FormularioDecisao.tsx:208-250`) | e2e › `toHaveAccessibleDescription(dicaArquivarAprovada(v1))` | ouvir a descrição com leitor de tela (R-A11Y.4) |
| Chegada depois de arquivar | `AlertaDeResultado`: foco no invólucro com `tabIndex=-1` e `role="alert"` dentro, como desde a 0.2.0 | e2e › `getByRole('alert')` com o texto exato | conferir se o leitor anuncia duas vezes (foco e alerta). É o padrão de hoje e não é novo (EXP-01) |

**Resultado da conferência:** não achei defeito no código. Os pontos da última coluna não se provam lendo código e estão
no roteiro (seção 3, R-A11Y) e nos exploratórios.

### 3. Roteiro de teste por critério

Os passos são para uma pessoa repetir na homologação. "Retrato" é o status, o `atualizadaEm` e o total de eventos da
demanda, lidos como "cto" em `GET /api/demandas/:id` e `GET /api/demandas/:id/historico`, antes e depois do passo.
Critério marcado "só automatizado" depende de estado que o painel não cria. Nesses casos, o teste da seção 1 é a prova.

**Ordem recomendada:** primeiro o UAT (seção 5), que usa o seed recém-feito. Depois a seção 3 na ordem abaixo. Os
passos R-01.2, R-03.1, R-03.5 e R-05.1 mudam o estado das demandas da vigência.

#### RF-01 (precisa do `<token-construir-hml>`; a 09 executa ou acompanha)

| Id | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| R-01.1 | Abrir "Pedido para o /construir buscar" e copiar o DEC. Chamar S1 | DEC do seed | 200, corpo exatamente `{"situacao":"vigente"}`, `cache-control: no-store`, `x-content-type-options: nosniff` |
| R-01.2 | Em "Vigência: pacote novo pendente de dupla aprovação", como "cto": abrir a T11 do v1 e gerar o pedido. Chamar S1 para o v1. Aprovar o v2 como "cto" e chamar S1 de novo. Entrar como "administradora", aprovar o v2 com `DOC-FICTICIO-0018` e chamar S1 de novo | DECs do seed | `vigente`, depois `vigente` (só a primeira aprovação), depois exatamente `{"situacao":"substituido"}` |
| R-01.3 | Chamar S1 para `DEC-DEM-20991231-9999-v1` e para o DEC de "Andamento: pacote sem pedido gerado" (aprovado, sem pedido). Comparar as respostas | os dois ids | 404 `nao_encontrado` nos dois, iguais byte a byte, exceto `date`. O caso de `pedido_gerado` que não é de pessoa é só automatizado |
| R-01.4 | Chamar o mesmo GET do R-01.1 com o token `awave` da homologação, com o token de um agente e, logado como "cto" com 2FA, por `fetch` no navegador | o DEC do R-01.1 | 403 `sem_permissao` nos três; o retrato da demanda não muda |
| R-01.5 | Nos R-01.1, R-01.3 e R-01.4, retrato antes e depois; pedir à 09 as linhas de log dessas chamadas | — | Retrato igual. Uma linha de log por requisição, sem o `decId` no campo de rota e sem o prefixo do token |
| R-01.6 | Só automatizado (relógio falso). Conferir `situacao.test.ts` › "SB-04 (CA-01.6)" | — | 503 `indisponivel`, nada gravado |

#### RF-02

| Id | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| R-02.1 | Criar a demanda "D1: nome trocado" com o solicitante "Joana Ficticia Lima". Escrever a ESP com o contexto "Pedido da área de Lima para o relatório", e um RSK. Criar um DEC `cto`, aprovar a opção A e clicar em "Gerar Pedido de Construção" | nomes fictícios | 422. A lista de erros cita o caminho do contexto com `nome`, sem o valor. A orientação traz a linha 1 (`ORIENTACAO.nome`) e a linha 6 do nível `cto`. Nenhum "Gerou o Pedido de Construção" no histórico |
| R-02.2 | Em "Editar dados", trocar o solicitante para "Outra Pessoa Teste" e gerar de novo | — | O mesmo 422, com o mesmo caminho. Na 0.4.0, este passo geraria o pedido |
| R-02.3 | Só automatizado. Um pedido gerado antes não existe pela tela, porque os textos marcados não mudam. Conferir `conferir-nome-da-criacao.test.ts` › "CA-02.3" e o `-qa` (entrega pelo `/construir`) | — | a entrega também é recusada pelo D1 |
| R-02.4 | Criar "D1: sem nome" com o solicitante "Joana Ficticia Lima" e textos sem o nome. Aprovar e gerar. Abrir o JSON do pedido | — | 200. O JSON tem as chaves da 0.4.0, sem `caminhosComNomeNaCriacao` nem `caminhos_com_nome_na_criacao` |
| R-02.5 | Depois do R-02.1 e do R-02.2: procurar "Joana", "Lima" e "Outra Pessoa" na resposta 422 (DevTools), no histórico da demanda e no `GET /api/pacotes-decisao/<DEC>`. Pedir à 09 a mesma busca no log do contêiner | — | Zero ocorrência em todos. O histórico tem `campo_alterado` do solicitante sem o valor |

#### RF-03

| Id | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| R-03.1 | "Vigência: arquivar o pacote novo com um aprovado em vigor": abrir a T11 do v2, ler a dica sob Arquivar, clicar em Arquivar e confirmar | seed | Dica "Arquivar: a demanda vai para Aprovada, e `<v1>` continua em vigor." Chegada "Pacote arquivado. A demanda está em Aprovada, e `<v1>` continua em vigor." Na T05: status Aprovada; no histórico, "Mudou o status" de Pronta para decisão para Aprovada pelo Sistema |
| R-03.2 | Na mesma demanda, abrir a T05 e depois a T11 do v1, e gerar o pedido. Chamar S1 para o v1 | — | T05: etapa 4 com o v1 e "Aprovada, opção A", feita; etapa 5 atual; Próxima ação "Gerar o Pedido de Construção e, quando a construção começar, mudar o status para Em construção.", com o link "Abrir a decisão aprovada" para o v1. Pedido gerado (200). S1: `vigente` |
| R-03.3 | "Arquivar sem pacote aprovado em vigor": criar um DEC `cto` (a demanda vai a Pronta para decisão). Na T11, ler a dica e arquivar | seed | Dica "Arquivar: a demanda vai para Encerrada." Chegada "Pacote arquivado. A demanda foi para Encerrada." Status Encerrada |
| R-03.4 | Criar "Devolver com aprovado em vigor": v1 `cto` aprovado e v2 `cto` pendente. Na T11 do v2, devolver | — | Dica do Devolver como hoje. A demanda vai a Em análise. O v1 continua aprovado e sem selo de substituído |
| R-03.5 | "Vigência: pacote só do CTO depois da dupla aprovação": na T11 do v2, clicar em "Aprovar a opção A" e confirmar. Depois arquivar | seed | Aprovar: alerta "Não foi possível concluir: o pacote aprovado em vigor nesta demanda exigiu a aprovação do CTO e da administradora, e um pacote só do CTO não pode substituí-lo. Devolva ou arquive este pacote, ou crie um pacote novo com aprovação do CTO e da administradora.", com o foco nele; retrato igual. Arquivar: a demanda vai a Aprovada, e o v1 continua em vigor e gera o pedido |
| R-03.6a | Dica sem vigente: é o R-03.3 | — | "Arquivar: a demanda vai para Encerrada." |
| R-03.6b | Dica fora das origens: na demanda do R-03.1, já em Aprovada, criar um v3 `cto` e abrir a T11 dele | — | "Arquivar: a demanda continua em Aprovada." Aviso (a) citando o v1 |
| R-03.6c | Criar "Arquivar com vigente desatualizado": v1 `cto` aprovado; gravar um RSK novo; criar o v2 (cita o RSK novo); abrir a T11 do v2 e arquivar | — | Dica "Arquivar: a demanda vai para Em análise, porque `<v1>`, o pacote em vigor, está desatualizado." Chegada "Pacote arquivado. A demanda está em Em análise." T05: linha 6 "Montar o pacote de decisão." |

#### RF-04 (só automatizado; conferência)

| Id | O que conferir | Resultado esperado |
|---|---|---|
| R-04.1 | A tabela das 20 execuções da `06-T08-qa-automacao.md` e o CI do PR desta versão | 20 de 20 verdes, mais as da construção; o CI do PR verde no `deps-qa.test.ts`, que é a confirmação final da causa provável (pendência da 06-T08) |
| R-04.2 | `git diff 41108ee -- src/lib/deps-qa.test.ts` (pela 08) | as três asserções com os mesmos matchers; 8 linhas com `expect(` |
| R-04.3 | `test/sessoes-do-banco-qa.test.ts` verde na suíte | vermelho quando o app conecta como migrator |
| R-04.4 | Depois da `10-documentacao`: o `CHANGELOG.md`, na seção 0.4.1 | Seção do C-27 com a causa (processo de fundo do Postgres contado na consulta, ou a que a T08 registrou) e a correção (`backend_type = 'client backend'` lido pelo observador do teste) |

#### RF-05

| Id | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| R-05.1a | Depois do R-01.2: abrir a T11 do v1 de "Vigência: pacote novo pendente de dupla aprovação" | — | Selo "Substituído" cinza; aviso "Este pacote foi substituído por `<v2>`, aprovado depois dele, e não gera mais o Pedido de Construção. Se um pedido deste pacote já foi gerado, não o use. O pedido que vale é o de `<v2>`."; link "Abrir o pacote `<v2>`" |
| R-05.1b | Abrir a T05 da mesma demanda, no Histórico | — | "`<v1>` foi substituído por `<v2>`, aprovado depois dele", sem ponto final |
| R-05.1c | Repetir o R-01.2 numa demanda nova, com a T11 do v1 aberta numa segunda aba antes da aprovação completa do v2. Depois da aprovação, clicar em "Gerar Pedido de Construção" na aba velha | — | "Não foi possível concluir: o pacote foi substituído por `<v2>`, aprovado depois dele. Só o pacote aprovado mais novo gera o Pedido de Construção." |
| R-05.1d | O 409 do S-01: é o R-03.5 | — | o texto da seção 5 da 03, sem id e sem nome |
| R-05.1e | Criar "Linha 6 da dupla aprovação": ESP com `contato@ficticio.test` no contexto; DEC `cto_e_administradora` aprovado pela "cto" e pela "administradora" (`DOC-FICTICIO-0018`); gerar o pedido. Repetir com um DEC `cto` | — | 422. Linha 6 do dupla: "Depois de corrigir, crie um pacote novo com aprovação do CTO e da administradora e registre as duas aprovações. Com as duas, ele substitui este e passa a ser o único que gera o Pedido de Construção." No `cto`: "Depois de corrigir, crie um pacote novo e aprove-o. Aprovado, ele substitui este e passa a ser o único que gera o Pedido de Construção." |
| R-05.2 | Axe (extensão do navegador) em 1280 × 720 e 390 × 844 na T11 do R-05.1a e na T05 do R-05.1b | — | Sem violação nas quatro combinações. A T05 em 390 × 844 é a que falta no automatizado |

#### RF-06

| Id | Passos | Dado fictício | Resultado esperado |
|---|---|---|---|
| R-06.1 | Seed recém-feito. "Vigência: pacote novo pendente de dupla aprovação": abrir a T11 do v2. Depois aprovar o v2 como "cto" (primeira aprovação) | seed | Aviso (a) com o texto exato da 03 e o id do v1; link "Abrir o pacote `<v1>`"; sem (c). Depois da aprovação parcial: chegada "Aprovação do CTO registrada. Falta a aprovação da administradora." e o aviso (a) continua |
| R-06.2 | Mesma demanda, antes da aprovação completa: abrir a T11 do v1 | seed | Aviso (b) com o id do v2 e o link "Abrir o pacote `<v2>`"; o lembrete do P1-d também aparece, antes do (b) |
| R-06.3 | "Vigência: pacote só do CTO depois da dupla aprovação": abrir a T11 do v2 e depois a do v1 | seed | No v2: aviso (c) e o link "Criar pacote novo"; sem (a); o botão Aprovar igual ao de hoje. No v1: nenhum dos três |
| R-06.4 | Abrir: a T11 do v2 arquivado (R-03.1); a T11 do DEC da demanda Encerrada (R-03.3); a T11 do v1 substituído (R-05.1a) | — | Nenhum dos três avisos. O substituído mostra só o aviso dele |
| R-06.5 | Nos R-06.1 a R-06.3: axe nas duas larguras | — | Sem violação |
| R-A11Y.1 | Com NVDA no Firefox e com VoiceOver no Safari: abrir a T11 do R-06.1 e ler a página do começo, por setas | — | O aviso é lido como parágrafo, na ordem do DOM, depois do cabeçalho do pacote e antes de "Aprovações". Não é anunciado sozinho ao abrir. O link é lido como "Abrir o pacote DEC-…, link" |
| R-A11Y.2 | Só teclado, em 1280 e em 390 px: Tab até o link do aviso | — | Contorno de foco de 2 px visível sobre o fundo amarelo; o foco não para no texto do aviso |
| R-A11Y.3 | Em 390 px, medir a altura do link do aviso (DevTools). Em 320 px e com zoom de 200 % e 400 %, olhar os três avisos e o aviso do substituído | — | Altura ≥ 44 px. Sem rolagem lateral; o id quebra sem reticência, também no link |
| R-A11Y.4 | Com leitor de tela, focar o botão Arquivar na T11 do R-06.1, depois do R-03.6b e do R-03.6c | — | A descrição lida é a dica certa de cada estado. Depois de confirmar, a chegada é anunciada uma vez e diz o status em que a demanda ficou |

#### RF-07, RF-08 (regressão e conferência)

| Id | Passos | Resultado esperado |
|---|---|---|
| R-07.1 | Em `/demandas?status=em_construcao`, em 1280 e 390 px | "Andamento: construindo" com "Construindo · 9/17"; "Andamento: sem plano de tarefas" com só "Entendendo o pedido"; "Andamento: construção concluída" com "Construção concluída". É igual à 0.4.0 |
| R-07.2 e R-07.3 | Só automatizado (plano da consulta). A medição p95 é da 09 (RNF-05) | como o 01 |
| R-08.1 a R-08.3 | Só automatizado. Conferir `piso-de-assercoes.test.ts` e `piso-de-assercoes-0018.test.ts` verdes na suíte do PR | `registrar-qa.test.ts: 69`; nenhuma entrada de `41108ee` desceu |

#### RF-09, RF-10 e critério 8 (conferência documental, depois da `10-documentacao` e da `09-entrega`)

| Id | O que abrir | Resultado esperado |
|---|---|---|
| R-09.1 | A spec do sistema (`2026-10-25-...-design.md`): RF-07, RF-13 e RF-22. A spec das integrações: a rota | RF-13 com a A-02 revista e a regra de nível do S-01. RF-22 com o CA-22.4 revisto e o D1 com o nome da criação. RF-07 com o destino do arquivamento (Aprovada, Em análise, Encerrada). A rota de situação junto das rotas do `/construir`. Nada contradiz o código |
| R-10.1 | `package.json` e a saúde da homologação | `0.4.1` |
| R-10.2 | Manual caps. 02, 03, 04, 05, 08 e 09, glossário e `tokens-de-integracao.md` | Rota de situação descrita, com `vigente` em status final como limite. DEC anterior à 0.4.1 confere só o nome atual. Arquivamento por destino. T11 com os avisos e a dica. "Em vigor" na tela e "situação do pedido" só para a API. Nenhum texto diz que arquivar o v2 sempre encerra a demanda |
| R-P8 | `docs/operacao/deploy.md` e a entrega da 09 | Roteiro do serviço App `migrar`: mesma origem do worker; comando `/bin/sh -c "pnpm db:migrate && sleep infinity"`; só `DATABASE_URL_MIGRATOR`; 1 réplica (ou 0 entre versões); sem domínio nem porta. A ordem: backup antes, Deploy do `migrar` até "Migrations aplicadas." no log, depois worker e app. O comando `!` fica como alternativa. A publicação da 0.4.1 (migration `0010`) usa esse roteiro. Nenhum valor de variável aparece |

### 4. Casos exploratórios sugeridos

São sessões de 30 a 45 min na homologação, com registro do que foi coberto. Nenhuma foi executada nesta etapa, porque
este agente não roda o sistema.

| Id | Missão | Risco que investiga | O que observar |
|---|---|---|---|
| EXP-01 | Leitor de tela na chegada | `AlertaDeResultado` foca o invólucro e tem `role="alert"` dentro: alguns leitores anunciam duas vezes | Quantas vezes a chegada é lida no NVDA e no VoiceOver. É padrão desde a 0.2.0. Se incomodar, vai para o `ux-ui-design` como observação |
| EXP-02 | Reflow com ids longos | O link "Abrir o pacote DEC-…" e o `<p>` do aviso do substituído não têm `overflow-wrap:anywhere` | 320 px, zoom de 400 % e espaçamento de texto aumentado (1.4.12): sem rolagem lateral nem texto cortado |
| EXP-03 | Dica velha (corrida) | A dica é calculada na carga da página. Se outra pessoa gravar uma ESP ou um RSK novo antes do Arquivar, o servidor manda para Em análise | A chegada diz o status gravado ("está em Em análise"), e não o da dica. Conferir que nada sugere Aprovada |
| EXP-04 | Duas abas, aprovação e arquivamento | A "administradora" completa a aprovação do v2 enquanto a "cto" arquiva o mesmo v2 | Um dos dois recebe 409 com texto claro; o histórico explica a ordem; nenhuma tela mostra erro técnico |
| EXP-05 | Aviso (c) para a "administradora" | O link "Criar pacote novo" também aparece para quem talvez não possa criar pacote (padrão do alerta de desatualizado) | Para onde o link leva com a conta "administradora"; se der 403 ou 404, registrar para o `ux-ui-design` (não é regressão) |
| EXP-06 | Texto "em Em análise" | "A demanda está em Em análise." e "continua em Em análise." | Uma pessoa entende de primeira? É observação de UX, não defeito: o texto é o da 03 |
| EXP-07 | Barra com vigente desatualizado | Em Em análise, a etapa 4 fica feita e a etapa 5 ("Ainda não gerado") fica atual, mas o v1 não gera (409 desatualizado), e a Próxima ação é a linha 6 (pendência da 06-T13) | Se a barra confunde ao lado da Próxima ação, registrar para o `ux-ui-design` |
| EXP-08 | Três DECs | v1 aprovado, v2 aprovado (substitui o v1), v3 pendente | v1: só o aviso do substituído; v2: (b) citando o v3; v3: (a) citando o v2. Dica do v3 pelo status da demanda |
| EXP-09 | Variações do nome no D1 | Trocar o solicitante para variações: maiúsculas, com acento ("Joana Fictícia Lima") e só o sobrenome | O D1 continua recusando pelo nome da criação. Anotar o comportamento com acento, que os testes não citam |
| EXP-10 | Recarregar depois de arquivar | A chegada vem do parâmetro da URL; recarregar ou voltar no navegador pode mostrar o alerta de novo | Se o alerta reaparece, o texto ainda é verdadeiro (status gravado)? É observação, não defeito |
| EXP-11 | Dica do Devolver fora das origens | Com a demanda em Aprovada e um DEC novo pendente, a dica diz "a demanda volta para Em análise", e a demanda não muda | É limite conhecido e fora do pedido (spec 7.2, item 6). Só confirmar e citar no UAT |
| EXP-12 | Situação depois do status final | DEC vigente numa demanda Entregue ou Encerrada responde `vigente` (limite aceito, 7.2, item 9) | A entrega e o andamento recusam pelo status final; o manual registra o limite |

**Fica de fora destas sessões:**

- carga e p95 (RNF-01, RNF-05): são da 09;
- o lado do `/construir` (a `00-inicio` parar com DEC substituído e o e-mail a Fabiano): é da outra frente;
- produção, a criação do serviço `migrar` no Easypanel e o deploy: são de Fabiano;
- o `pedido_gerado` de agente ou de sistema, a coluna com valor fora do formato e as corridas da trava: só
  automatizados.

### 5. Roteiro de aceite para Fabiano (UAT)

**Onde:** a homologação da 0.4.1 que a `09-entrega` sobe, com o **seed recém-feito** e sem o e2e rodado por cima.
**Não usar produção.** Duração: cerca de 30 min. Entrar como "cto", salvo onde diz "administradora". Marque cada item
como Aceito ou Pendente e anote o motivo.

| # | O que fazer | O que deve acontecer | Aceito? |
|---|---|---|---|
| A-01 | Abrir a demanda "Vigência: pacote novo pendente de dupla aprovação" e, nela, o pacote v2 | Um aviso amarelo: "Esta demanda já tem um pacote aprovado em vigor: DEC-…-v1…", com o link "Abrir o pacote DEC-…-v1". Sob o botão Arquivar: "Arquivar: a demanda vai para Aprovada, e DEC-…-v1 continua em vigor." | |
| A-02 | Clicar no link do aviso (abre o v1) | O aviso "Há um pacote mais novo pendente nesta demanda: DEC-…-v2…", com o link para o v2 | |
| A-03 | Abrir a demanda "Vigência: pacote só do CTO depois da dupla aprovação" e o pacote v2. Clicar em "Aprovar a opção A" e confirmar | Antes: o aviso "A aprovação deste pacote será recusada…". Depois: "Não foi possível concluir: o pacote aprovado em vigor nesta demanda exigiu a aprovação do CTO e da administradora…"; nada muda no pacote | |
| A-04 | No mesmo v2, clicar em Arquivar e confirmar. Abrir a demanda | "Pacote arquivado. A demanda está em Aprovada, e DEC-…-v1 continua em vigor." Na demanda: status Aprovada, a etapa Decisão com o v1 "Aprovada, opção A" e a Próxima ação "Gerar o Pedido de Construção…" | |
| A-05 | Abrir o v1 dessa demanda e clicar em "Gerar Pedido de Construção" | O pedido é gerado, como antes da 0.4.1 | |
| A-06 | Abrir "Arquivar sem pacote aprovado em vigor", criar um pacote de decisão (só o CTO) e arquivá-lo | A dica diz "vai para Encerrada"; depois, "Pacote arquivado. A demanda foi para Encerrada." Sem aprovado em vigor, nada mudou em relação a antes | |
| A-07 | Voltar a "Vigência: pacote novo pendente de dupla aprovação". No v1, gerar o pedido. No v2, aprovar como "cto". Sair, entrar como "administradora" e aprovar o v2 com `DOC-FICTICIO-0018` | Depois da primeira aprovação, o aviso continua. Depois da segunda, o v1 mostra o selo "Substituído", o aviso novo e o link "Abrir o pacote DEC-…-v2". No Histórico da demanda: "DEC-…-v1 foi substituído por DEC-…-v2, aprovado depois dele" | |
| A-08 | Pedir à 09 o registro da rota de situação para o v1 do A-07: antes da segunda aprovação e depois | `vigente`, e depois `substituido`. Outro token recebe 403 e um DEC sem pedido recebe 404 | |
| A-09 | Abrir a demanda "D1: nome trocado", preparada pela 09 ou pelo QA (R-02.1 e R-02.2), e clicar em "Gerar Pedido de Construção" | Recusa por nome, mesmo depois da troca do solicitante. A tela não mostra o nome antigo nem o novo | |
| A-10 | Abrir a Fila filtrada por Em construção | Os selos de andamento iguais aos da 0.4.0 | |
| A-11 | Ler a seção 0.4.1 do CHANGELOG, o manual caps. 04 e 08 e o roteiro do serviço `migrar` no `docs/operacao/deploy.md` (depois da `10-documentacao`) | O que mudou e a causa do C-27. Nada diz que arquivar o v2 sempre encerra a demanda. O roteiro: backup, Deploy do `migrar` até "Migrations aplicadas.", worker e app | |
| A-12 | Pedir à 09 o resumo da verificação | e2e verde três vezes; ensaio de rollback com `alteram_dado: false`; p95 da rota de situação ≤ 500 ms; p95 da fila < 500 ms na `main` e no ramo | |

**Decisões e ações que dependem de Fabiano** (nenhuma bloqueia o aceite funcional):

- Criar o serviço App `migrar` no Easypanel antes da publicação da 0.4.1, pelo roteiro do `deploy.md`. A 09 avisa do
  backup antes.
- Aceite formal do risco residual com a `gestao-riscos` (spec 7.2, item 11): DEC anterior à 0.4.1 confere só o nome
  atual; rota sem limite de taxa; substituição entre a resposta `vigente` e o início da construção.
- Pedidos futuros já registrados, sem efeito nesta versão: "Aprovar" indisponível no caso (c) e a dica do Devolver fora
  das origens (EXP-11).
- A ida para produção é decisão de Fabiano, depois do merge.

### 6. Candidatos a automação (para o `qa-automacao`)

| Candidato | Por quê |
|---|---|
| Axe da T05 com DEC substituído em 390 × 844 | É a lacuna do CA-05.2 e o motivo da devolução |
| e2e da linha 6 do nível `cto_e_administradora` na tela (R-05.1e) | Hoje só em U e S (06-T11). Pede demanda própria no seed |
| e2e do aviso (a) depois da primeira das duas aprovações (R-06.1) | Hoje em U e T. A 06-T14 deixou de fora para não gastar a aprovação da "administradora" numa demanda do seed |
| Teste estático: o `CHANGELOG.md` tem a seção da versão do `package.json` | Fecha o CA-04.4 e o CA-10.1 sem conferência manual. Já foi sugerido no 0017 |
| Teste estático: o `deploy.md` cita o serviço `migrar` e a ordem backup → `migrar` → worker → app | Pega a volta do roteiro antigo (critério 8). Só depois da `10-documentacao` |
| Reflow em 320 px com os três avisos (R-A11Y.3) | Hoje só manual |

## Decisões tomadas

- Devolvo pelo CA-05.2, e não marco "coberto". O critério pede o axe na T11 e na T05, nas duas larguras. A T05 com DEC
  substituído só roda em 1280 × 720 (`decisao.spec.ts:365` usa `semViolacoes`, e o `playwright.config.ts` tem só o
  projeto `Desktop Chrome`). Nenhum outro spec abre a T05 nesse estado em 390 × 844.
- A dona é a T11, pelo `tarefas.json`. Ela cobre o RF-05, que tem o CA-05.2, e já mexeu em `e2e/decisao.spec.ts:364` pela
  G5. A correção é de uma linha, no molde do Minor 1 da 06-T14.
- O risco para quem usa é baixo: na T05, a 0.4.1 só muda uma palavra da frase do histórico. A devolução vem da regra do
  contrato, e não da criticidade.
- CA-04.4, CA-09.1, CA-10.2 e o critério 8 do pedido ficam cobertos pela etapa dona (09 e 10), como pediu o maestro e como
  no 0017. Pela G2, nenhuma 06 escreve em `docs/`.
- A conferência de foco, teclado e leitor de tela foi feita pela leitura do código e do e2e da T14. O que só se julga com
  leitor de tela real ficou no roteiro (R-A11Y), sem marcar defeito. Defeito sem reprodução não é defeito reportado.
- O roteiro manual pede o seed refeito e uma ordem fixa, porque o e2e e vários passos gravam nas demandas da vigência.
- Nas demandas criadas à mão, o nome e o documento são inventados ("Joana Ficticia Lima", "Outra Pessoa Teste",
  `DOC-FICTICIO-0018`, `contato@ficticio.test`).

## Pendências

- Devolvido à `06-T11-construcao` (`engenheiro-frontend`): o CA-05.2 não tem axe da T05 com DEC substituído em 390 × 844.
  - O que pede: em `e2e/decisao.spec.ts:365`, trocar `semViolacoes(page, 'T05 com DEC substituído')` por
    `semViolacoesNasDuasLarguras(page, 'T05 com DEC substituído')`, com o import.
  - É só acréscimo de medição. Nenhuma asserção sai, e o `test/estatico/decisao-e2e.test.ts` (piso 37) não muda.
  - Depois, o e2e roda de novo (RNF-11). Esta 07 volta só para trocar a linha do CA-05.2 no mapa.
- **Execução:** este agente só lê e escreve (Read, Grep, Glob, Write). Nenhum roteiro nem sessão exploratória foi
  executado. A execução manual pede a homologação, que é da 09.
- **Para a 09:**
  - RNF-01 e RNF-05 na homologação;
  - o ensaio de rollback;
  - o R-01 com o `<token-construir-hml>`;
  - o seed refeito antes do UAT;
  - o Minor 2 da 06-T14: o ramo "v2 já arquivado" do CA-03.1 contra banco reaproveitado;
  - o `e2e/reflow-qa.spec.ts:152`, que levou 18,1 s numa das três execuções (o teto é 24 s).
- **Para a 10:**
  - CA-04.4, CA-09.1 e CA-10.2, conferidos pelos R-04.4, R-09.1 e R-10.2;
  - o critério 8 (R-P8);
  - "em vigor" × "situação do pedido" no glossário;
  - os limites registrados (DEC anterior à 0.4.1; `vigente` em status final).
- **Para a 08 (Minors herdados, sem efeito no funcional):**
  - o M2, o M3 e o M4 da 06-T02;
  - o Minor 3 da T04 (zero à esquerda no índice);
  - os pareceres 2 e 3 da 06-T05;
  - as Minors da 06-T06 e da 06-T07;
  - o diagnóstico mais fraco do teste da construção do C-27 (06-T08);
  - o comentário de `dados-do-pedido.ts:46` (06-T11);
  - `dicaDoArquivar` calculada sem formulário (06-T12);
  - as três brechas da guarda `detalhe-dec.test.ts` (06-T13), já fechadas pela guarda nova.
- **Para o `ux-ui-design`, se as sessões confirmarem:** EXP-01, EXP-05, EXP-06 e EXP-07, como observações de uso, não
  como defeito.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (07) todo critério de aceite de 01 aparece no mapa
- [ ] (07) nenhum critério ficou "sem cobertura" (CA-05.2 em parte: T05 em 390 × 844; devolvido à 06-T11-construcao)
- [x] (07) os dados de teste são fictícios
