---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T16-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G8 e T16), 06-T16-engenheiro-frontend.md, commit 3986684 (diff inteiro do código e dos testes)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T16 (fila: origem na linha e no cartão, filtro "Origem"; RF-10 na tela, CA-04.7, CA-10.1 a CA-10.3,
CA-10.7, IN-16 com o CV-07 em `origem`), commit `3986684` (398668466b618cbc8f774a5b44a348946307e5f9), sobre `1010243`.

**Resultado: aprovada. Nenhum problema Critical ou Important.** Os quatro testes existentes fora do G5 e os dois
ajudantes novos de `fila.tsx` foram conferidos trecho a trecho e **aceitos** (razões abaixo). Os pontos Minor vão em
Pendências.

### Conferência dos testes existentes fora do G5 (G3.2: "a revisão decide")

Conferi o diff de cada arquivo contra o que a entrega declara. A contagem de linhas com `expect` bate: nenhuma saiu, e
entraram duas (`fila-contadores.spec.ts:173` e `fila-qa.spec.ts:124`). Nenhum arquivo do piso do D-17 foi tocado
(`--stat` do commit), nenhuma regra do axe foi desligada, e `retries`, tempo-limite e `bypassCSP` não mudaram.

| Trecho (linha nova) | Antes → depois | Parecer |
|---|---|---|
| `src/app/(painel)/demandas/fila-qa.test.ts:518` | `selected=""` 2 → 3 | **Aceito.** O formulário passa a ter três `select` (Tipo, Origem, Linha), cada um em "Todos"/"Todas" sem filtro; o número segue a mesma regra de antes, sem afrouxar. O título do `it` ("as três seleções") fica até mais exato. |
| `src/app/(painel)/demandas/fila-qa.test.ts:529` | `name="` 3 → 4 | **Aceito.** O campo novo `name="origem"` é o quarto (status oculto, tipo, origem, linha). A guarda principal do teste, `not.toMatch(/name="(limit\|offset)"/)` na 527, não mudou: filtrar continua voltando à página 1. |
| `src/app/(painel)/demandas/fila-a1.test.ts:248` | lista exata de `dt` do cartão ganha "Origem" entre Urgência e Linha de serviço | **Aceito.** Continua `toEqual` de lista fechada (o mais forte possível); só cresce pelo item que a T16 manda pôr (plano, T16 Passo 3: "item `col-span-2` 'Origem' depois de Urgência"). |
| `e2e/fila-contadores.spec.ts:4` a `:6` | comentário "23 no banco novo" → "28 no banco novo, desde a T15" | **Aceito.** Só comentário; fecha o Minor 1 da 06-T15-tech-lead. |
| `e2e/fila-contadores.spec.ts:19` e `:23` | importa `ROTULO_ORIGEM`; o tipo `Lista` ganha `origem` | **Aceito.** O item da fila tem `origem` desde a T07 (G5, `demandas.test.ts`); o tipo só descreve o que a API já devolve. |
| `e2e/fila-contadores.spec.ts:171` a `:174` (CA-07.1) | `dt` com Origem; `dd` 5 → 6; etapas do `dd` 3 → `dd` 4; **novo** `dd` 2 = `ROTULO_ORIGEM[d.origem]` da API | **Aceito.** A conferência das etapas é a mesma regex, só no novo índice; a contagem de `dd` acompanha a de `dt` (6 e 6). A asserção nova liga o texto do cartão ao valor da API, o que é mais forte que antes. Era a pendência da 06-T15-tech-lead. |
| `e2e/fila-qa.spec.ts:122` e `:124` (sem script) | URL `?status=&tipo=bug&linhaServicoProvavel=` → `?status=&tipo=bug&origem=&linhaServicoProvavel=`; **novo**: Origem em "Todas" | **Aceito.** Sem script, o GET do formulário serializa os campos na ordem do DOM, e o plano manda o seletor "entre Tipo e Linha de serviço" (T16 Passo 3). A regex continua ancorada em `$`, e o teste continua provando o que diz: "Todos" vai vazio e não vira filtro inválido (`FILTRO_INVALIDO` com contagem 0, linha seguinte), agora também para a origem. Com script, o endereço sai na ordem de `hrefDaFila` (status, tipo, linha, origem), coberta em `fila-origem.test.ts`. As duas ordens dão o mesmo filtro, e a chave do Suspense da lista vem de `hrefDaFila`, que normaliza. |

### Conferência do desvio: `filtroDosContadores` e `chaveDosContadores` (`fila.tsx:97` e `:102`)

**Aceito.** Razões:

1. O plano pede o comportamento ("contadores com `origem` oculto, só do valor do enum depois do parse" e "a chave do
   `Suspense` dos contadores leva a origem"), não a forma. Antes, `page.tsx` montava o filtro dos contadores duas vezes
   (contadores e esqueleto) e a chave inline; com a origem seriam três pontos para esquecer um campo. O ajudante tira a
   duplicação e põe as duas regras sob teste unitário, já que `page.tsx` é Server Component sem teste de render.
2. Fica num arquivo que a tarefa já modifica (`fila.tsx`), ao lado de `hrefDaFila`, `temFiltro` e `legendaDaFila`, que
   fazem o mesmo tipo de trabalho. Não duplica função existente: `contadoresDaFila` (`dados-da-fila.ts`) monta os
   `href`, não o filtro oculto nem a chave.
3. `filtroDosContadores` monta campo a campo (G3.5) e recebe só `FiltroDemandas` já validado pelo schema; com origem
   inválida o filtro inteiro cai para o padrão e nada vai oculto (teste em `fila-origem.test.ts` e no e2e IN-16).
4. `chaveDosContadores` muda com tipo, linha e origem e não com o status (o comportamento da 0.2.0, RF-05); testado nos
   quatro sentidos. Os valores são do enum, sem espaço, então as posições não se confundem.

### Checklist da seção 12 do padrão técnico

- [x] **Faz o que o plano pede, nem mais nem menos.** Os sete arquivos do plano mudaram e os dois novos foram criados.
  Os quatro testes existentes estão aceitos acima, e os dois ajudantes também. A guarda (`exigirPessoaNaPagina` e
  `autorizar`) de `page.tsx` não mudou de lugar. G4: o `git diff a9fd9b8` das superfícies congeladas, com
  `src/lib/rota.ts`, saiu vazio.
- [x] **Teste para cada comportamento novo, e ele falharia sem o código.** `fila-origem.test.ts` (19) cobre rótulos,
  legenda, endereço, paginação com origem (função e link "Próxima"), `temFiltro`, CV-07 (`<script>`, `AWAVE`,
  `construir`, lista com vírgula; vazio não invalida), vazio com filtro, o seletor (id, name, rótulo, posição, opções,
  valor da URL, dentro de "Mais filtros"), a soma de "Mais filtros", o `href` dos contadores, o campo oculto em ordem e
  ausente com origem inválida, os dois ajudantes, `contagemOuNada` com a origem, a linha "Origem: …" depois do título e
  do selo, o cartão e o CA-04.7. A entrega mostra 18 de 19 falhando antes do código; o que passou é guarda declarada
  ("a fila não mostra Aguardando confirmação"). `e2e/fila-origem.spec.ts` (5) foi visto falhando com o seletor e a
  linha desligados. Rodei `pnpm test` na pasta da fila: 20 de 20 arquivos, 424 de 424.
- [x] **Sem segredo, `.env` ou dado pessoal real.** Títulos "(fictício)", contas do seed, nenhum token.
- [x] **Entrada externa validada com Zod; erro sem vazar detalhe.** `origem` só entra por `filtroDemandasSchema`
  (`z.enum(ORIGENS_DA_DEMANDA)`, T07); o oculto, o `href` e a legenda saem do valor já validado (CV-07). O e2e confere
  que `<script>` e `construir` não voltam em `href`, `value` nem no HTML do `main`.
- [x] **Banco:** não se aplica (sem migration; `contagemOuNada` só passa a origem à contagem da T07, com o mesmo
  `condicaoDaOrigem`).
- [x] **Nada duplica função existente.** Os ajudantes tiram duplicação de `page.tsx`; o seletor é a `Selecao` de hoje;
  as opções usam o `opcoes()` de hoje; o item do cartão usa `CLASSE_DA_ETIQUETA`/`ETIQUETA`.
- [x] **Textos em pt-BR; axe sem violação nas telas tocadas.** "Origem", "Todas", "Pessoa", "Agente de IA", "Awave",
  "Origem: <rótulo>" e "origem <rótulo>" na legenda. O axe roda na T03 com origem Awave em 1280 × 720 e 390 × 844 e com
  "Mais filtros" aberto em 390 px; a entrega registra a suíte e2e inteira verde na segunda rodada (254 passaram, 9
  pulados, saída 0).
- [x] **Minor vai para Pendências; só Critical e Important bloqueiam.** Nenhum Critical ou Important.
- [x] **PR:** não se aplica nesta etapa (`/code-review` e `/security-review` ficam com a 08).

`pnpm lint` e `pnpm typecheck` rodaram limpos nesta revisão.

### Pareceres (todos Minor)

1. `src/app/(painel)/demandas/leituras-da-fila.test.ts:63`: o título do `it` diz "a leitura recebe só tipo e linha de
   serviço", e agora a origem também entra. **Razão:** o título engana quem lê a falha. A asserção continua certa
   (filtro sem origem dá `origem: undefined`, e o `toHaveBeenCalledExactlyOnceWith` não separa chave ausente de
   `undefined`), e o caso com origem está em `fila-origem.test.ts:403`. Mudar só o título fica para uma volta futura;
   não bloqueia.
2. `src/app/(painel)/demandas/fila-qa.test.ts:518`: contar `selected=""` no HTML inteiro não prova "uma opção marcada
   em **cada** seleção" (duas marcadas num select e nenhuma em outro também dariam 3). **Razão:** a fraqueza já existia
   antes da T16, e o select de Origem tem a conferência própria em `fila-origem.test.ts:324` a `:328`. Fica como
   sugestão à `06-T16-testes`, sem ação do engenheiro.
3. `e2e/fila-qa.spec.ts:122`: sem script, a URL sai na ordem do DOM (status, tipo, origem, linha), e com script na
   ordem de `hrefDaFila` (status, tipo, linha, origem). **Razão:** é consequência do plano (seletor entre Tipo e Linha,
   origem depois da linha no endereço), e as duas URLs dão o mesmo filtro. Aceito e registrado aqui para a 07 e a 10 não
   estranharem.

## Decisões tomadas

- Aceito os quatro testes existentes fora do G5: nenhuma asserção saiu, as listas e contagens só crescem pelo que a T16
  manda pôr, e entraram duas asserções que reforçam (origem do cartão igual à da API; Origem em "Todas" sem script).
- Aceito `filtroDosContadores` e `chaveDosContadores` em `fila.tsx`: realizam o que o plano pede, tiram a montagem
  repetida de `page.tsx` e põem a regra sob teste unitário, sem duplicar função existente.
- Aceito a ordem do DOM Tipo, Origem, Linha, com a URL sem script diferente da de `hrefDaFila`: o plano fixa as duas
  ordens, e usar `order` de CSS quebraria a igualdade entre ordem visual e ordem de foco (WCAG 1.3.2 e 2.4.3).
- Status `pronto`: o checklist da seção 12 está cumprido e só há Minor.

## Pendências

- Nenhuma bloqueia a T16.
- Minor 1 (volta futura, `engenheiro-frontend`): ajustar o título do `it` em `leituras-da-fila.test.ts:63` para
  incluir a origem, sem mudar asserção.
- Minor 2 (`06-T16-testes`, opcional): se quiser, uma conferência por `select` de "uma opção marcada em cada" no lugar
  da contagem global de `fila-qa.test.ts:518`.
- Para a `06-T16-testes` e a T20: o e2e completo rodou verde uma vez nesta passagem (a primeira rodada falhou em
  `fila-qa.spec.ts`, corrigida). A definição de pronto pede três rodadas verdes; não rodei e2e (fora da minha lista Pode).
- Para a `07-qa-funcional`: a leitura da célula Título com "Origem: …" no leitor de tela, o foco e o anúncio depois de
  Filtrar e o zoom de 200 % e 400 % da T03 com o seletor novo (G2; 03, seção 10).
- Herdada, sem ação aqui: a vista do Awave devolve o título com "[nome removido]" (06-T15-qa-automacao), dono
  `engenheiro-backend` ou 08.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 398668466b618cbc8f774a5b44a348946307e5f9~1 398668466b618cbc8f774a5b44a348946307e5f9` — 15 arquivos, 676 inserções e 47 remoções; nenhum do piso do D-17
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 398668466b618cbc8f774a5b44a348946307e5f9~1 398668466b618cbc8f774a5b44a348946307e5f9 -- src e2e/fila-contadores.spec.ts e2e/fila-qa.spec.ts` — diff lido trecho a trecho
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -3` — HEAD em 3986684 (06-T16-construcao)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts src/lib/rota.ts "drizzle/000[0-6]_*.sql" "drizzle/meta/000[0-6]_snapshot.json"` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 398668466b618cbc8f774a5b44a348946307e5f9~1 398668466b618cbc8f774a5b44a348946307e5f9 -- e2e/fila-origem.spec.ts` — e2e novo lido; sem `retries`, tempo-limite, `bypassCSP` nem regra do axe desligada
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas"` — 20 de 20 arquivos, 424 de 424 testes
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
