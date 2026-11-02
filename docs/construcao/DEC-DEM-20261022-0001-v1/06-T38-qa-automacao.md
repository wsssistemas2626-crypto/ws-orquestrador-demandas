---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T38-testes
agente: qa-automacao
leu: [contrato-passagem.md, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (Fase 7, T36 a T38, linhas 3400 a 3622), 01-analista-requisitos.md (linhas 1 a 140 e 330 a 480, RF-01 a RF-07, RF-19 a RF-26 e a tabela de RNF), 05-tech-lead.md (cabeçalho e fases), 06-T38-engenheiro-frontend.md, 06-T38-tech-lead.md, 06-T36-qa-automacao.md (formato e cobertura do RNF-09), git show --stat 5d91af1, src/app/(painel)/demandas/page.tsx, src/app/(painel)/demandas/fila.tsx, src/app/(painel)/demandas/FiltrosFila.tsx, src/app/(painel)/demandas/EntradasAguardando.tsx, src/app/(painel)/demandas/fila.test.ts, e2e/fila.spec.ts, e2e/apoio.ts, playwright.config.ts, vitest.config.ts, src/app/(painel)/layout.tsx, src/modules/demandas/schemas.ts, src/modules/demandas/consultas.ts (linhas 1 a 70), src/modules/demandas/entradas-pendentes.ts, src/modules/acesso/matriz.ts (linhas 1 a 80), src/modules/acesso/ator.ts (git show), src/lib/log.ts, src/lib/erros.ts (linhas 1 a 40), src/lib/auth-cliente.ts, src/components/Selo.tsx, src/components/rotulos.ts (linhas 1 a 130), saída do pnpm test gravada pela ferramenta nesta etapa (tool-results/b6f0g75hy.txt, só o fim)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T38: tela T03 Fila de demandas, no commit `5d91af1`. Depois dele, só mudaram `06-T38-tech-lead.md` e `passagens.jsonl`.
Não há falha no código da tarefa. Os dois arquivos de teste novos não mexem em nenhum arquivo existente.

### Critério da tarefa e teste que o cobre

A T38 cobre RF-06 e RF-26 (CA-26.1), RNF-09 (aviso), T-03 (total) e RNF-11. Os 5 testes do plano (passo 1) estão em
`e2e/fila.spec.ts`, com o mesmo nome. Legenda: (E) do engenheiro, (Q) desta etapa. `fila-qa.test.ts` e `fila-qa.spec.ts`
são `src/app/(painel)/demandas/fila-qa.test.ts` e `e2e/fila-qa.spec.ts`.

| Critério | Teste |
|---|---|
| CA-26.1: 5 demandas com status diferentes; o filtro `aguardando_informacao` mostra só as desse status | `e2e/fila.spec.ts` › `CA-26.1: 5 demandas com status diferentes, filtro aguardando_informacao mostra só as desse status` (E) |
| RF-06: filtros de status, tipo e linha de serviço | o CA-26.1 acima (status) (E); `fila-qa.spec.ts` › `tipo e linha de serviço juntos: só as linhas com os dois valores, legenda com os dois e contagem da API` (Q), que confere as colunas Tipo e Linha linha a linha; `fila-qa.test.ts` › `filtro válido vai inteiro a listarDemandas, com o banco das dependências` (Q) |
| Plano: `filtroDemandasSchema.safeParse`; inválido mostra o alerta e a lista sem filtro | `fila.test.ts` › `lerFiltroDaFila: o filtro da URL (RF-06)`, 8 casos (E); `e2e/fila.spec.ts` › `filtro inválido na URL mostra o alerta e a lista sem filtro` (E); `fila-qa.test.ts` › `filtro inválido: o alerta da 03 e a leitura sem nenhum filtro, nem a parte válida do endereço`, `o texto da URL nunca vai para a tela…` e `lerFiltroDaFila e hrefDaFila: bordas`, 14 testes (Q) |
| Plano: o filtro só se aplica pelo botão "Filtrar" (WCAG 3.2.2), num formulário `GET` | `fila.test.ts` › `nenhuma seleção aplica o filtro sozinha (sem onchange no HTML)` (E); CA-26.1 do e2e, com `not.toHaveURL` antes do clique (E); `fila-qa.spec.ts` › `tipo e linha…` (as duas seleções não mudam a URL) e `sem script › o formulário faz um GET comum; "Todos" vai vazio e não vira filtro inválido` (Q); `fila-qa.test.ts` › `o formulário não tem campo de limit nem de offset: filtrar volta à página 1` (Q) |
| RF-06: 20 por página, ordem da mais nova para a mais antiga | `fila.test.ts` › paginação nas páginas 1, 2 e 3 e na página cheia que é a última (E); `e2e/fila.spec.ts` › `paginação: Anterior desabilitado na página 1; Próxima leva à página 2` (E); `fila-qa.test.ts` › `deslocamento fora do múltiplo da página: "Anterior" nunca vai a offset negativo`, `limite fora do padrão vai junto nos links de paginação`, `vazio com filtro numa página além do fim…` e `as linhas saem na ordem em que a leitura as devolve` (Q). A ordem no banco é da T15 (`consultas.test.ts`) |
| Plano: `caption` com os filtros, `th scope="col"`, região rolável com `tabindex="0"` | `fila.test.ts` › `região rolável com rótulo, caption focável…` e as legendas com 0 a 3 filtros (E); `e2e/fila.spec.ts` › `axe: …tabela rolável em 320 px` (E); `fila-qa.test.ts` › `legenda com dois filtros quaisquer…` e `carregando com filtro: a legenda do filtro…` (Q) |
| T-03: "N demandas encontradas." com o `total` da API | `fila.test.ts` › `"N demandas encontradas." com o total…` (E); CA-26.1 e filtro inválido do e2e, pela Região de aviso (E); `fila-qa.test.ts` › `página da fila: o total da leitura decide a paginação (T-03)`, 3 testes, que passam o total da leitura à "Próxima" e aos dois vazios (Q); `fila-qa.spec.ts` › `tipo e linha…`, com a Região de aviso no singular ou no plural (Q) |
| Plano: "Entradas aguardando o agente orquestrador" só quando há alguma, com "Preencher à mão" levando a `/demandas/nova?entrada=<id>` | `fila.test.ts` › `EntradasAguardando (T-01, RF-05)`, 4 testes, com sentinelas (E); `fila-qa.test.ts` › `EntradasAguardando: bordas`, 5 testes (uma entrada, todas aguardando, todas falharam, cada papel, id codificado), mais `com entradas pendentes, a lista aparece na página junto com a fila` e `a leitura das entradas falha: a fila continua…` (Q) |
| RNF-09: aviso de capacidade na moldura | fica na moldura da T36, que a T38 não mudou: `src/components/componentes.test.ts` › `AvisosDaMoldura (03, 2.7: RF-18 e RNF-09)` (T36, E) e `src/components/componentes-qa.test.ts` › `AvisosDaMoldura: fronteiras` (T36, Q). Os dois seguem verdes nesta suíte |
| RNF-11: axe sem violação | `e2e/fila.spec.ts`: vazio com filtro, filtrado, filtro inválido, página 2, filtrado por tipo, com dados e 320 px (E); `fila-qa.spec.ts` › `tipo e linha…` (Q) |
| Foco no resultado depois de filtrar, limpar ou paginar (03, T03) | `e2e/fila.spec.ts`: CA-26.1, vazio com filtro e paginação (E); `fila-qa.spec.ts` › `"Filtrar" sem mudar nada fica no mesmo endereço e leva o foco ao resultado` e `"Limpar filtros" do formulário, com resultado na tela…` (Q) |
| Filtros na URL: o "Voltar" do navegador funciona (decisão do engenheiro) | `fila-qa.spec.ts` › `"Voltar" e "Avançar" do navegador: a tabela e as seleções acompanham o endereço` (Q) |
| C-04: a página exige pessoa e autoriza `listar_demandas` | `fila-qa.test.ts` › `página da fila: acesso (C-04)`, 4 testes, com a matriz real: a ordem das duas chamadas, a administradora, o papel fora da matriz (nada é lido) e a falta de sessão (Q) |
| C-18: o título é texto | `fila.test.ts` › `o título da demanda é texto, nunca HTML (C-18)` (E); `fila-qa.test.ts` › `título com aspas, & e < sai escapado…` (Q) |
| RNF-10 e C-21: falha de leitura sem detalhe na tela e no log | `fila.test.ts` › `erro: o texto da 03, focável…` (E); `fila-qa.test.ts` › `página da fila: falhas de leitura`, 5 testes, com o log real capturado e `SENTINELA-ERRO` (Q) |
| T37: o alerta "Verificação em duas etapas ativada." só com o valor fixo | `fila-qa.test.ts` › `página da fila: alerta da T37 só com o valor fixo`, 6 casos (Q); `e2e/autenticacao-qa.spec.ts` › `C-05 pelo cookie…` (T37, Q) |
| Chaves que remontam os filtros e a lista (a chave repetida que o engenheiro corrigiu) | `fila-qa.test.ts` › `página da fila: chaves que remontam os filtros e a lista`, 3 testes (Q) |

### Leitura crítica dos testes do engenheiro

- **`page.tsx` não tinha teste unitário.** O `fila.test.ts` cobre as peças (`fila.tsx`, `FiltrosFila.tsx`,
  `EntradasAguardando.tsx`), mas não a página. Por isso nada no `pnpm test` provava estes pontos:
  - a ordem de `exigirPessoaNaPagina` e `autorizar`;
  - que o filtro inválido chega à leitura como "sem filtro";
  - que o `total` da leitura chega à paginação;
  - as duas falhas de leitura;
  - o alerta da T37;
  - as chaves dos filtros e da lista.

  O e2e alcança parte disso, mas não a falha de leitura nem o papel fora da matriz. O `fila-qa.test.ts` chama a página com
  a sessão, o banco e as duas leituras trocados por dublês. A matriz de acesso e o log são os reais. Os dois componentes
  assíncronos são resolvidos antes de gerar o HTML.
- **Falha de leitura e log.** A falha usa a mensagem `SENTINELA-ERRO select * from demanda where titulo = Pessoa
  Ficticia`. O teste confere que ela não aparece na tela nem em nenhuma linha do log, e que o evento sai com a rota.
- **Chave repetida.** O engenheiro viu o "Limpar filtros" falhar quando os filtros e a lista tinham a mesma chave. O
  teste novo trava três coisas: as chaves são distintas, mudam com o filtro e com a página, e o filtro inválido usa a
  chave da lista sem filtro.
- **O e2e do engenheiro só conferia a legenda no filtro por tipo**, e não as linhas. O teste novo combina tipo e linha,
  cria uma demanda que casa com os dois e duas que casam com só um, e confere as colunas Tipo e Linha de cada linha.
- **Estabilidade.** O `playwright.config.ts` roda em série (`workers: 1`). Cada teste cria os próprios dados, e as
  contagens vêm da API, então nenhum teste depende de outro ter rodado antes. O e2e inteiro passou duas vezes, 32 de 32
  nas duas. Os unitários da pasta rodaram com `--sequence.shuffle`: 85 de 85.

### Testes acrescentados (60, em 2 arquivos novos, sem editar nenhum existente)

| Arquivo | Testes |
|---|---|
| `src/app/(painel)/demandas/fila-qa.test.ts` | 55: acesso (4), filtro da URL até a leitura (4), total e paginação (3), alerta da T37 (6), falhas de leitura e entradas (5), chaves (3), bordas de `lerFiltroDaFila` e `hrefDaFila` (14, com a ida e volta de 23 filtros), bordas da lista e do carregando (8), bordas dos filtros (3), bordas das entradas (5) |
| `e2e/fila-qa.spec.ts` | 5: tipo e linha juntos (com axe), Voltar e Avançar, "Filtrar" no mesmo endereço, "Limpar filtros" do formulário e o formulário sem script |

Nenhum teste novo usa relógio. As datas são fixas, dentro do dado de teste. O e2e entra pelo `entrarComo` do
`e2e/apoio.ts`, que já existia.

### Resultado

- `pnpm test` (suíte inteira): 159 arquivos e **3153 de 3153**. São os 3098 que já existiam mais os 55 novos.
- `pnpm test:e2e`: **32 de 32**, duas vezes (2,0 min e 1,9 min). São os 27 que já existiam mais os 5 novos.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo, depois de corrigir os tipos do meu próprio arquivo (ver Classificação de falhas).
- `git status --short --untracked-files=all`: só os 2 arquivos novos de teste. `git diff --stat` vazio: nenhum arquivo
  rastreado mudou.

### Classificação de falhas

Nenhuma falha no código contra critério da T38. As falhas que apareceram eram minhas:
- uma asserção que exigia as opções de status na ordem do schema, quando a ordem certa é a dos rótulos de 2.2;
- os tipos do retorno de `listarDemandas` no dublê, que acusaram no `typecheck`.

As duas foram corrigidas antes da corrida final.

Achado por sondagem no navegador (Minor, sem critério da T38 ferido):

| # | Criticidade | Onde | Achado |
|---|---|---|---|
| 1 | Minor | `src/app/(painel)/demandas/page.tsx:80-82` | Sem script, a tabela não aparece: fica o esqueleto "Carregando demandas…" com `aria-busy="true"`. O formulário `GET` funciona, e o filtro é lido certo. Mas a lista dentro do `Suspense` chega por streaming, e só o script do React troca o esqueleto pelo resultado |

## Decisões tomadas

- **Arquivos `-qa` novos, sem editar os do engenheiro.** Assim o `git diff` só tem acréscimo, e fica fácil conferir que
  nenhuma asserção foi afrouxada. É o padrão da T13 e da T36.
- **A página foi testada com dublês só nas bordas de entrada e saída** (sessão, banco, as duas leituras). A matriz de
  acesso e o log são os reais. Assim o teste de acesso prova a regra de verdade, e o de log prova a lista de permissão.
- **O teste sem script confere só o formulário e o filtro.** A tabela sem script não é critério da T38 (nenhum RF ou RNF
  pede a tela sem script). Um teste vermelho aqui devolveria a tarefa por algo que não é dela. A asserção da tabela
  falhou na sondagem e virou o achado 1.
- **A ordem das opções segue `rotulos.ts`, e não o schema.** A 03, 2.2, define essa ordem. O teste também confere que o
  conjunto é o do schema: nenhum valor sem opção e nenhuma opção a mais.
- **O foco depois do "Voltar" não foi travado.** O engenheiro declarou que, nesse caso, o foco não muda, e mandou o ponto
  à 07. O teste novo confere só a tabela e as seleções.

## Pendências

- **Para o `tech-lead` e a `ux-ui-design` (Minor, achado 1).** A entrega do engenheiro diz: "Sem script, o mesmo
  formulário funciona como `GET` comum". O formulário funciona, mas a lista fica no esqueleto para sempre. Há dois
  caminhos:
  - aceitar e corrigir a frase (o painel exige script);
  - ler a fila fora do `Suspense` na primeira carga.

  Para conferir: `test.use({ javaScriptEnabled: false })` e a tabela `aria-busy="true"` visível depois do "Filtrar". O
  `e2e/fila-qa.spec.ts` já tem o teste sem script, com uma nota no lugar onde caberia essa asserção.
- **Para a `07-qa-funcional`.** Seguem as pendências do engenheiro e do tech-lead:
  - o anúncio da Região de aviso, e a região vazia nos vazios e no erro;
  - o foco depois do "Voltar";
  - o esqueleto durante a carga.
- **Para a `09-entrega`.** Vale o Minor 6 do tech-lead (`e2e/fila.spec.ts:55-56`, limite de 20 na homologação). O teste
  novo `tipo e linha…` tem o mesmo limite, e o caminho é o mesmo se o `homologar` quebrar ali.
- **Ferramentas Grep e Glob indisponíveis nesta sessão.** Achei a T38 no plano e os RF nos requisitos só com o Read, por
  trechos. A lista de arquivos veio do `git log --name-only`.
- **Saída do `pnpm test`.** Com o log do pino, a saída passou de 39 KB. Li só o fim do arquivo que a ferramenta gravou
  (`tool-results/b6f0g75hy.txt`, fora de `/tmp`) para ver o total, como na 06-T36-testes.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 5d91af195f900086275277c2f31ff936bbac073d` — 8 arquivos, 6 de código e teste
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h%x20%s -- src/components test/estatico src/app/(painel) src/modules/demandas/consultas.ts src/modules/demandas/entradas-pendentes.ts` — não rodou: erro de sintaxe do shell nos parênteses sem aspas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h%x20%s -- src/components test/estatico "src/app/(painel)" src/modules/demandas` — os testes da T36 que cobrem `AvisosDaMoldura` (RNF-09)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/acesso/ator.ts` — tipo `AtorPessoa`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/fila-qa.test.ts"` — 54 de 55 (a minha asserção da ordem das opções)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas"` — 85 de 85, 2 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fila-qa.spec.ts` — 5 de 5
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fila-qa.spec.ts -g "sem script"` — 1 de 1 (sondagem com `caption` visível, que é também o do esqueleto)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fila-qa.spec.ts -g "sem script"` — 0 de 1: a tabela `aria-busy="true"` segue visível sem script (achado 1); a asserção saiu do teste
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — 6 erros de tipo no meu `fila-qa.test.ts`, corrigidos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas" --sequence.shuffle` — 85 de 85, semente 1793412281925
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent=true --reporter=dot` — 159 arquivos, **3153 de 3153**
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 32 de 32
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 32 de 32 (segunda corrida, estabilidade)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — só os 2 arquivos novos de teste
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — vazio, nenhum arquivo rastreado mudou

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste: CA-26.1, RF-06, T-03, RNF-09 (na moldura, T36), RNF-11 e os itens do plano, na tabela da Entrega
- [x] a suíte inteira passa (3153 de 3153; e2e 32 de 32, duas vezes)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real: datas fixas; dados criados por teste e contagens pela API; 85 de 85 com `--sequence.shuffle`
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada: `git diff --stat` vazio e só arquivos novos no `git status`
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real: só "Pessoa Ficticia", "(fictício)", ids `DEM-20261022-…`, UUIDs `00000000-…` e sentinelas `SENTINELA-…`
