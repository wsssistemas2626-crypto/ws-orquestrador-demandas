---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T11-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7, T11), 01-analista-requisitos.md (glossário, RF-07 a RF-11), 06-T11-engenheiro-frontend.md, 06-T11-tech-lead.md, 06-T10-qa-automacao.md (formato), commit f6558c3 (por git diff f6558c3~1 f6558c3), src/app/(painel)/demandas/[id]/page.tsx, BarraDeEtapas.tsx, CartaoProximaAcao.tsx, Historico.tsx, detalhe.ts, detalhe.test.ts, src/components/LinhaDoTempo.tsx, src/components/dados-das-etapas.ts, src/components/dados-das-etapas.test.ts (início), src/components/Botao.tsx, src/modules/acesso/matriz.ts, src/modules/demandas/consultas.ts (tipos), test/estatico/detalhe-dec.test.ts, scripts/seed-ficticio.ts (CONTAS_FICTICIAS, TITULOS_DO_E2E), e2e/apoio.ts, e2e/detalhe-a2.spec.ts, e2e/casca-qa.spec.ts, playwright.config.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T11 (T05 no arranjo A2, `engenheiro-frontend`). O código está no commit `f6558c3`; o `3c364f5` só ajusta a
entrega e o registro. Conferi o código e os testes da construção contra o plano (T11) e o RF-08 a RF-10. Acrescentei
**26 testes de unidade e 2 e2e**, e corrigi **1 teste e2e instável** da casca (T05, escrito por esta função na
06-T05-testes). Nenhum arquivo de código mudou.

### Critério de aceite da tarefa e o teste que o cobre

"(eng.)" é teste do engenheiro; "(qa)" é teste acrescentado nesta etapa. D = `src/app/(painel)/demandas/[id]/detalhe.test.ts`;
A2 = `e2e/detalhe-a2.spec.ts`; L = `src/components/LinhaDoTempo.test.ts`.

| Critério | Teste |
|---|---|
| CA-08.1 (dupla com só o CTO: estados e etapa 4 atual) | A2 (eng.) `CA-08.1 e CA-09.1: etapasDupla → …` (1280 e 390 px, com axe); D (eng.) `BarraDeEtapas.tsx > CA-08.1 …` e `CA-08.1 e CA-09.1 (HTML) …`; A2 (qa) `barra (03, 5.4): cinco etapas lado a lado em 1280 px; uma por linha, na ordem, em 390 px`; D (qa) `CV-09: com três DECs, só o mais novo …`, `a barra usa a vista lida do DEC: aprovado na opção B …`, `a barra usa o histórico lido: pedido_gerado …` |
| CA-08.2 (sem ESP: "Por fazer", "Nenhuma", atual) | A2 (eng.) `CA-08.2: etapasSemVersoes → …`; D (eng.) `CA-08.2 (HTML) …`; D (qa) `aguardando informação com a seção de dúvidas: barra "Com dúvidas em aberto" atual …` |
| CA-08.3 (encerrada: nenhum `aria-current`) | D (eng.) `BarraDeEtapas.tsx > CA-08.3 …` e `CA-08.3 (HTML): encerrada …`; D (qa) `a barra usa o histórico lido: … com tudo feito, nenhuma etapa atual`. Só em unidade: o seed não tem demanda encerrada e encerrar uma gastaria o C-36 (desvio 2 da construção, aceito na revisão) |
| CA-09.1 (Próxima ação para a administradora, link da T11) | A2 (eng.) `CA-08.1 e CA-09.1 …` (texto, detalhe, quem age, href, clique); D (eng.) `CartaoProximaAcao.tsx > …` (4 testes) e `CA-08.1 e CA-09.1 (HTML) …`; D (qa) `agente trabalhando (linha 2) …`, `aguardando informação sem a seção de dúvidas (temSecaoDeDuvidas = false) …`, `linhas 11 e 12 na página …`; A2 (qa) `alvo de toque em 390 px …` (o link do cartão) |
| CA-10.1 (seções nas duas larguras; "Nesta página" foca o `h2`) | A2 (eng.) `CA-10.1: …` e `arranjo A2: …`; D (eng.) `cabeçalho, navegação "Nesta página" …` e `arranjo A2 (03, 5.2) …`; D (qa) `%s: toda âncora da página (cabeçalho, "Nesta página", alertas e Próxima ação) tem alvo` (6 estados); A2 (qa) `alvo de toque em 390 px: trilha, cabeçalho, "Nesta página" e Próxima ação com 44 px de altura ou mais` |
| CA-10.2 (histórico completo, em lista) | A2 (eng.) `CA-10.2: …` (contagem e ordem contra a API); D (eng.) `Historico.tsx > CA-10.2: com 30 eventos …`; L (qa) `LinhaDoTempo > a ordem é a recebida …`, `lista vazia …`, `cada item: …`, `sem antes nem depois …`, `antesEDepois > …` (4 combinações) |
| CA-10.3 (e2e de hoje da T05 passam só com seletor ou texto mudado) | `e2e/detalhe-demanda.spec.ts`, `e2e/decisao.spec.ts`, `e2e/pedido-construcao.spec.ts` na suíte e2e inteira (207 de 207). Conferi o `git diff f6558c3~1 f6558c3` desses arquivos: só `detalhe-demanda.spec.ts` mudou, e só de seletor (tabela → lista, cinco células → três parágrafos com os mesmos cinco valores, ids procurados na região "Versões") |
| CV-09 (autoriza antes de ler; id de `d.pacotesDecisao[0]`; nada do aprovador na tela) | `test/estatico/detalhe-dec.test.ts` (eng., 5 testes com 11 casos plantados); D (eng.) `CV-09: ler_pacote_decisao autorizado antes de ler o DEC …`; D (qa) `CV-09: ler_pacote_decisao negado → a página falha com o erro da autorização, sem ler DEC, histórico, texto nem ESP`, `CV-09: com três DECs, só o mais novo (d.pacotesDecisao[0]) é lido, uma vez …`, `falha na leitura do DEC sobe para a tela de erro de hoje …`, `DEC lido incoerente com a vista da demanda (outro id) vira erro …`, e as sentinelas de comentário e de quem decidiu em `a barra usa a vista lida do DEC …` |
| CV-18 (T05: título literal no `h1` com `<bdi>`) | `e2e/seguranca.spec.ts` (eng.) `C-18 e CV-18: na T05 da textoDeTerceiro …` (1280 e 390 px); D (eng.) `anexos como texto …` (h1 com `<bdi>` escapado); L (qa) `C-18: texto, valores e ator de terceiro saem como texto, nunca como marcação` |
| Nada da T05 de hoje some | D (eng.) `cabeçalho, navegação "Nesta página" …`, `Dados: …`, `versões vazias …`, `CA-26.2 (HTML) …`, `CA-15.3 (HTML) …`, `alerta de chegada …`; `detalhe-qa.test.ts` e `formularios-paginas-qa.test.ts` com banco real (eng., só seletor mudado); D (qa) `agente trabalhando (linha 2): … o aviso de agente trabalhando continua no topo` |
| CV-01 | nenhum arquivo de código mudou nesta etapa (`git status`: só testes) |

### Testes acrescentados

- `src/app/(painel)/demandas/[id]/detalhe.test.ts`, describe novo `page.tsx no arranjo A2: bordas (06-T11-testes)`,
  **16 testes** (eram 49, agora 65). Eles conferem o que a página passa às regras da T10 e a leitura nova do DEC:
  - CV-09 com a autorização negada: a página falha antes de qualquer leitura;
  - com três DECs, só o `[0]` é lido, e é ele que aparece na barra;
  - a falha da leitura do DEC sobe para a tela de erro;
  - um DEC incoerente vira erro (a guarda `conferir` da T10 ligada na página);
  - "Aprovada, opção B" sai da vista lida, e não do resumo, e "Gerado" sai do histórico lido;
  - a linha 2 na página, e o aviso de agente trabalhando continua no topo;
  - `temSecaoDeDuvidas` nos dois sentidos;
  - **nenhuma âncora sem alvo**: todo `href="#x"` da página tem `id="x"`, em 6 estados;
  - linhas 11 e 12 levam ao `h2` focável.
- `src/components/LinhaDoTempo.test.ts`, arquivo novo, **10 testes**:
  - `antesEDepois` nas 4 combinações;
  - os textos da 03;
  - a lista vazia;
  - a ordem recebida, sem reordenar por data;
  - a estrutura do item, com o marcador e o separador `aria-hidden`;
  - o item sem a linha do meio;
  - o C-18 em texto, valores e ator.

  Com isso a `antesEDepois` passa a ter teste próprio. A metade de teste da D-T11-02 fica paga; a mudança do lugar da
  função continua com o engenheiro.
- `e2e/detalhe-a2.spec.ts`, **2 testes** (eram 6, agora 8), só leitura, na `etapasDupla`:
  - a forma da barra: cinco colunas na mesma linha em 1280 px e uma por linha em 390 px;
  - o alvo de toque de 44 px em 390 px: trilha, "Editar dados", "Mudar status" do cabeçalho, os cinco links de "Nesta
    página" e o link da Próxima ação.

Cada teste novo falharia com o erro que ele procura:

| Erro na página ou no componente | Teste que reprova |
|---|---|
| DEC lido antes de autorizar, ou erro da autorização engolido | `CV-09: ler_pacote_decisao negado …` |
| `d.pacotesDecisao.at(-1)` ou outra versão no lugar da `[0]` | `CV-09: com três DECs …` |
| leitura do DEC com `catch` que esconde a falha | `falha na leitura do DEC sobe …` |
| a página passa o resumo, ou monta o DEC sem conferir o id | `DEC lido incoerente …`, `a barra usa a vista lida do DEC …` |
| `historico` vazio ou outro no lugar do lido | `a barra usa o histórico lido …` |
| `temSecaoDeDuvidas` fixo em `true` (link para âncora que não existe) | `aguardando informação sem a seção de dúvidas …` e `%s: toda âncora … tem alvo` |
| barra sempre vertical, ou sem as 5 colunas em `xl` | `barra (03, 5.4) …` |
| `min-h-11` perdido em link do celular | `alvo de toque em 390 px …` |
| `antesEDepois` sem omitir a parte vazia | `antesEDepois …` (4 casos) |
| `LinhaDoTempo` que ordena por data ou corta itens | `a ordem é a recebida …` |

### Teste instável corrigido (fora da T11, desta função)

`e2e/casca-qa.spec.ts` > `celular (390 × 844) > 320 px: barra de 56 px que cabe na largura; gaveta dentro da tela com
"Sair" à vista` falhou na primeira rodada: `Expected: 272`, `Received: 272.00000762939453`.

- **Causa:** a largura da gaveta era medida durante a animação de entrada de 200 ms, e a caixa ainda tinha a fração de
  pixel do `transform`.
- **Correção:** antes de medir, o teste espera `getAnimations().finished`, como o teste do clique no mesmo arquivo já
  fazia.
- **O que não mudou:** a asserção continua `toBe(272)`, sem tolerância.
- **Diff:** 3 linhas acrescentadas e nenhuma removida.
- **Teste escrito por:** esta função, na 06-T05-testes. Por isso a correção foi feita aqui, e não devolvida.

### Resultado

- `pnpm test src/components/LinhaDoTempo.test.ts "src/app/(painel)/demandas/[id]/detalhe.test.ts"`: 2 arquivos,
  **75 de 75**.
- `pnpm test` (relatório JUnit): **5160 testes, 0 falhas** (eram 5134; +26).
- `pnpm test:e2e`:
  - 1ª rodada: 206 de 207, com a falha instável da casca acima;
  - 2ª rodada, depois da correção: **207 de 207** (eram 205; +2).
  - Não apareceu 429 em nenhuma das duas. Com uma falha só, o Playwright não trocou de worker de um jeito que repetisse
    IPs dentro da janela.
- `pnpm lint`: limpo. `pnpm typecheck`: limpo (a primeira rodada acusou TS7024 no `it.each` novo, por causa da inferência
  de `as const` com funções; troquei por `satisfies` e o erro saiu).
- `git diff --stat`: `e2e/casca-qa.spec.ts` (+3), `e2e/detalhe-a2.spec.ts` (+49) e `detalhe.test.ts` (+187), todos só
  com acréscimo. Há também o arquivo novo `src/components/LinhaDoTempo.test.ts`. Não há `.skip`, `.only` nem `.todo`, e
  nenhuma linha de teste existente foi removida.

### Conferência dos testes que a construção mudou (G3.2)

Li o `git diff f6558c3~1 f6558c3` de `axe-todas.spec.ts`, `detalhe-demanda.spec.ts`, `seguranca.spec.ts`,
`detalhe-qa.test.ts`, `formularios-paginas-qa.test.ts` e `detalhe.test.ts`.

- Só mudaram seletor, escopo e texto literal:
  - `<h1>` virou `<h1 …><bdi>`;
  - a tabela virou lista, com as mesmas cinco informações por evento;
  - os ids passaram a ser procurados na região "Versões";
  - as contagens de link ficaram fora do cartão, mais 1 dentro dele.
- O que saiu foram as asserções sobre a tabela (`<caption>`, `<th>` e `aria-label="Tabela do histórico"`), que deixou
  de existir. O conteúdo delas continua coberto na lista.
- Não houve regra do axe desligada, `retries` nem tempo-limite. Concordo com a revisão.

## Decisões tomadas

- Os testes de borda da página ficaram em `detalhe.test.ts`, num describe próprio, porque os dublês da página já estão
  lá. Um arquivo novo copiaria os 8 `vi.mock`.
- A autorização negada usa um erro sentinela no dublê de `autorizar` e devolve a implementação real no `finally`. Assim o
  `mockClear` dos outros describes continua valendo.
- O teste das âncoras confere todo `href="#…"` da página, e não só o do cartão. Um link quebrado no alerta, no cabeçalho
  ou na navegação também reprova.
- O alvo de toque é conferido só pela altura. A 03 e o `Botao` dão `min-h-11` aos links. A largura dos links de texto
  curto ("Dados") depende da fonte, e a T16 é quem fecha o alvo de toque em todas as telas.
- O teste instável da casca foi corrigido agora, e não deixado para depois. Ele é desta função, e teste intermitente na
  suíte é pior que teste ausente. A correção espera um estado determinado e não muda o valor esperado.
- Não mexi no `ipFicticio()` de `e2e/apoio.ts`. A revisão deixou essa correção com o `engenheiro-frontend`, na T16 ou
  na 08.
- Dados só fictícios: "Pessoa Ficticia …", ids `DEM-20261022-0042`, sentinelas e datas fixas. Não há `Date` sem
  argumento.

## Pendências

- Nenhuma da T11.
- Para o `engenheiro-frontend` (T16 ou 08), sem bloquear: continua valendo o `ipFicticio()` de `e2e/apoio.ts`, que zera
  ao trocar de worker. O dono e o lugar são os da revisão (06-T11-tech-lead.md). Nas duas rodadas desta etapa não houve
  429.
- Para o `engenheiro-frontend` (D-T11-02): o teste próprio de `antesEDepois` já existe (`src/components/LinhaDoTempo.test.ts`).
  Quando a função for para um `dados-*.ts`, basta trocar o `import` desse arquivo.
- Para a 07 (`qa-funcional`): o que o axe e estes testes não pegam continua com ela, como na revisão. São a ordem de
  Tab, o anúncio do `aria-current="step"`, o separador " · " e os dois "Mudar status".

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -25 --stat` — código da T11 em `f6558c3`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff f6558c3~1 f6558c3 -- e2e/axe-todas.spec.ts e2e/detalhe-demanda.spec.ts e2e/seguranca.spec.ts "src/app/(painel)/demandas/formularios-paginas-qa.test.ts" "src/app/(painel)/demandas/[id]/detalhe-qa.test.ts"` — só seletor, escopo e texto
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff f6558c3~1 f6558c3 -- "src/app/(painel)/demandas/[id]/detalhe.test.ts"` — só seletor e texto; asserções da tabela trocadas pelas da lista
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%h -S "TITULOS_DO_E2E = " -- scripts/seed-ficticio.ts` — `03814e6`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%h -S "agentesEmAndamento:" -- src/modules/demandas/consultas.ts` — `dad3e9b`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%h -S "export const ID_SECAO" -- "src/app/(painel)/demandas/[id]/detalhe.ts"` — `3c9c648`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --format=%h -S "pedido_gerado" -- src/components/rotulos.ts src/components/dados-das-etapas.test.ts` — `c505d05`, `6548339`, `ddf673c`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/LinhaDoTempo.test.ts "src/app/(painel)/demandas/[id]/detalhe.test.ts"` — 2 arquivos, 75 de 75
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — TS7024 no `it.each` novo (corrigido)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/scratchpad/t11-qa-suite.xml --silent` — 5160 testes, 0 falhas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=dot` — 206 de 207 (falha instável em `casca-qa.spec.ts`, 320 px)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 2 testes modificados e 1 novo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — só acréscimos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%h -S "SELO_SUBSTITUIDO" -- "src/app/(painel)/demandas/[id]"` — `d6df360` (selo substituído já coberto na T05)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --format=%h_%s -- e2e/casca-qa.spec.ts` — escrito na 06-T05-testes (qa-automacao)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=dot` — 207 de 207
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 3 testes modificados e 1 novo; nenhum temporário no repositório
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 3 arquivos, 239 inserções, 0 remoções

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
