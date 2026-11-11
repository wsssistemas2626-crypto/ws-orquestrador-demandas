---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T10-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1, T10), 01-analista-requisitos.md (glossário, RF-08, RF-09), 06-T10-engenheiro-backend.md, 06-T10-tech-lead.md, 06-T08-qa-automacao.md (formato), commit 6548339 (por git diff 6548339~1 6548339), src/components/dados-das-etapas.ts, src/components/dados-das-etapas.test.ts, test/estatico/dados-das-etapas.test.ts, test/estatico/leituras-da-fila.test.ts, test/estatico/piso-de-assercoes.test.ts, src/components/rotulos.ts, vitest.config.ts, tsconfig.json]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T10 (regras de exibição da T05: barra de etapas e Próxima ação, `engenheiro-backend`). O código está no commit
`6548339`; os commits seguintes (`62419e5`, `866d3d5`, `52f4229`, `50b3743`) são entrega, revisão e registro. Conferi o
código contra o plano (T10) e as tabelas do RF-08 e do RF-09, acrescentei **106 testes** e paguei a dívida
**D-T10-01** da revisão. Nenhum arquivo de código mudou.

### Critério de aceite da tarefa e o teste que o cobre

"(eng.)" é teste do engenheiro; "(qa)" é teste que acrescentei nesta etapa. U = `src/components/dados-das-etapas.test.ts`;
E = `test/estatico/dados-das-etapas.test.ts`.

| Critério | Teste |
|---|---|
| CA-08.4 (cada linha da tabela do RF-08 dá o estado da tabela) | U (eng.) `etapasDaDemanda (RF-08)` > um caso por estado das cinco etapas (Registrada; Por fazer, Com dúvidas em aberto, Feita; Por fazer, Feito; Por fazer, Pacote desatualizado, 1 de 2 aprovações, Decisão pendente, Aprovada opção X, Devolvida, Arquivada; Gerado, Ainda não gerado, Depois da aprovação), mais CA-08.1 a CA-08.3 na regra; U (qa) `etapasDaDemanda: bordas (06-T10-testes)` > `"desatualizado" só vale para DEC pendente…`, `"1 de 2 aprovações" exige a dupla e exatamente uma aprovação…`, `a opção da decisão vence a da primeira aprovação`, `Pedido: só pedido_gerado conta…`, `Pedido gerado do vigente com um DEC mais novo pendente…`; U (qa) `proximaAcao: bordas` > `%s, %s → linha %i` (a etapa atual conferida nos 90 casos) |
| CA-09.2 (agente pendente vence aguardando_informacao) | U (eng.) `proximaAcao (RF-09) > CA-09.2: aguardando_informacao com o agente de insumo técnico pendente → linha 2, não 3` |
| CA-09.3 (um caso por linha, ordem de prioridade da tabela) | U (eng.) `proximaAcao (RF-09) > linha %i` (13 casos com a saída inteira), `a tabela de casos cobre as 13 linhas`, os testes de ordem (1 antes de 2, 4 antes de 5 e 6, 7 antes de 8); U (qa) `proximaAcao: bordas (06-T10-testes)` > `%s, %s → linha %i` (**90 casos: os nove status × dez cenários de versões**, contra um oráculo que reescreve a tabela do 01 sem usar o código), `a varredura cobre os nove status e os dez cenários`, `linha 3 vence a 4…`, `linha 7 só com DEC pendente…`, `linha 8 vence as linhas de status…` (seis status), `linha 13 em nova e em_analise com DEC aprovado`, `linhas 11 e 12 não dependem de aprovado vigente…` |
| CA-09.4 (a função só é chamada por página) | E (eng.) `CA-09.4: etapasDaDemanda e proximaAcao só em página` > varredura do código que roda e 11 usos plantados; E (qa) `página é só src/app/**/page.tsx (06-T10-testes: casos de borda)` (`page.tsx.bak`, `minha-page.tsx`, `scripts/app/page.tsx` não são página) |
| CV-09 (importações e saída sem dado a mais) | E (eng.) `CV-09: o que dados-das-etapas.ts importa` (lista de permissão, 17 importações plantadas); U (eng.) `CV-09: sentinelas…` e `CV-09: a saída tem só as chaves da interface`; U (qa) `não altera o dado recebido (entrada congelada; as duas funções)` |
| CV-19 (link só de id validado, só para as rotas da demanda e do DEC) | U (eng.) `CV-19: todo href de página casa…` e `CV-19: id de demanda ou de DEC fora do formato não gera link` (linhas 4 a 8 e 10); U (qa) `CV-19: id de DEC fora do formato também não gera link na linha 9`; U (qa) `%s, %s → linha %i` confere todo `href` dos 90 casos contra `^/(demandas|pacotes-decisao)/[A-Za-z0-9-]+(/[a-z-]+)*$` |
| D-11 | U (eng.) `D-11: a regex da tela é a de gerar-id.ts` |
| `rotulos.ts` só com `export` | `git diff 6548339~1 6548339 -- src/components/rotulos.ts`: duas linhas, só `export` em `agenteNaFrase` e `ARTEFATO_DO_AGENTE`, sem mudança de valor |
| CV-01 | nenhum arquivo de código mudou nesta etapa (`git status`: só testes e o ajudante novo em `test/`) |

CA-08.1 a CA-08.3 e CA-09.1 **na tela** (`aria-current`, cartão) são da T11 (e2e); aqui eles estão cobertos na regra.

### Testes acrescentados (106)

- `src/components/dados-das-etapas.test.ts`, 103 novos (eram 48, agora 151):
  - `etapasDaDemanda: bordas (06-T10-testes)`, 6: desatualizado só no pendente; "1 de 2 aprovações" só na dupla com
    exatamente uma; opção da decisão antes da primeira aprovação; outro evento com o id do vigente não é "Gerado";
    "Gerado" com DEC mais novo pendente (atual 4); entrada congelada e igual depois das duas funções.
  - `proximaAcao: bordas (06-T10-testes)`, 97: os seis testes de ordem acima, a linha 9 com id de DEC ruim, a conferência
    da varredura e os 90 casos da varredura.
- `test/estatico/dados-das-etapas.test.ts`, 3 novos (eram 7, agora 10): bordas de `ehPagina` e os dois testes do
  D-T10-01 (abaixo).

Cada teste novo falharia com a regra errada:

| Erro plantado na regra | Teste que reprova |
|---|---|
| "Pacote desatualizado" ou linha 7 sem exigir `pendente` | `"desatualizado" só vale para DEC pendente…`, `linha 7 só com DEC pendente…` e a varredura |
| "1 de 2 aprovações" só por `aprovadores.length === 1` | `"1 de 2 aprovações" exige a dupla…` |
| `aprovadores[0].opcao` antes de `decisao.opcaoEscolhida` | `a opção da decisão vence a da primeira aprovação` |
| "Gerado" por qualquer evento com o id do vigente | `Pedido: só pedido_gerado conta…` |
| linha 3 depois da 4 | `linha 3 vence a 4…` e a varredura (aguardando_informacao sem ESP) |
| linhas de status antes da 8, ou 8 levando ao vigente | `linha 8 vence as linhas de status…` e a varredura |
| linha 9 sem exigir vigente, ou 13 trocada por outra | a varredura (pronta_para_decisao com DEC arquivado → 13; nova e em_analise → 13) |
| link da linha 9 sem passar por `RE_ID_DEC` | `CV-19: … na linha 9` |
| função que muda a entrada | `não altera o dado recebido…` (entrada congelada lança `TypeError`) |

### D-T10-01 (dívida de teste da revisão): paga

- Criado `test/estatico/importacoes.ts`, ajudante sem `.test` (fora do `include` do Vitest), com `Importacao`, `fonteTs`
  e `importacoesDe`, a mesma lógica das duas cópias.
- `test/estatico/leituras-da-fila.test.ts` e `test/estatico/dados-das-etapas.test.ts` trocaram a definição local pela
  importação. O `git diff -U0` dos dois só mostra a definição removida e a linha do `import`: nenhuma asserção, caso
  plantado ou nome de teste mudou. `leituras-da-fila.test.ts` segue com 13 de 13.
- Guarda contra a volta da cópia, em `test/estatico/dados-das-etapas.test.ts`:
  `D-T10-01: um só leitor de importações nos testes estáticos` > `só test/estatico/importacoes.ts define importacoesDe`
  (varre `src`, `scripts`, `test` e `e2e` pela árvore do TypeScript) e `acha a definição plantada, por função e por
  constante, e não conta a importação`.

### Resultado

- `pnpm test src/components/dados-das-etapas.test.ts test/estatico/dados-das-etapas.test.ts test/estatico/leituras-da-fila.test.ts`:
  3 arquivos, **174 de 174** (151 + 10 + 13).
- `pnpm test`: **227 arquivos, 5115 de 5115** (eram 5009; +106), 0 falhas.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git diff --stat`: `src/components/dados-das-etapas.test.ts` (+176, só acréscimo), `test/estatico/dados-das-etapas.test.ts`
  (+44, −42: a cópia saiu), `test/estatico/leituras-da-fila.test.ts` (+3, −41: a cópia saiu); novo
  `test/estatico/importacoes.ts`. Nenhum `.skip`, `.only` nem `.todo`.

## Decisões tomadas

- Paguei a D-T10-01 agora, e não na T16: editar `test/` está na minha lista **Pode**, a troca é só de definição por
  importação, e cada etapa a mais com duas cópias é uma chance de corrigir uma e esquecer a outra.
- O ajudante usa `setParentNodes: true` (o da T10). Na cópia da T07 era `false`; para `importacoesDe` não muda nada,
  porque `getText` recebe o arquivo, e o resultado dos 13 testes de `leituras-da-fila` é o mesmo.
- A varredura de 90 casos usa um oráculo escrito à parte (a tabela do 01, linha a linha) e não chama o código para
  calcular o esperado: assim ela pega erro de ordem que um caso por linha não pega.
- A regra "opção da decisão antes da primeira aprovação" vem do plano (T10, Regras); o teste fixa essa ordem.
- Não rodei `pnpm test:e2e`: a T10 não tem tela. Os critérios na tela (CA-08.1 a CA-08.3, CA-09.1) são da T11.
- Dados só fictícios: "Pessoa Ficticia …", `DOC-FICTICIO-1`, sentinelas, ids `DEM-20261110-0042`, datas fixas; nenhum
  `Date` sem argumento.

## Pendências

- Nenhuma da T10.
- Para o maestro: rodei por engano um `wc -l` sobre o arquivo de saída da suíte que a ferramenta gravou fora do
  repositório (só leitura, item marcado em Comandos executados). Não está na minha lista **Pode**. Não alterou nada, e o
  resultado foi lido depois com Read.
- `engenheiro-frontend` (T11): para o e2e do CA-08.1 e do CA-09.1, o que a regra dá para a `etapasDupla` está na
  entrega da T10 e confere com os testes de unidade; a varredura desta etapa não muda isso.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -5` — topo `50b3743` (06-T10-revisao), código em `6548339`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h -3 -- test/ vitest.config.ts tsconfig.json eslint.config.mjs` — últimos commits em `test/`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h -- test/estatico e2e/estatico` — arquivos dos testes estáticos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 6548339~1 6548339` — 3 arquivos novos da T10 e `rotulos.ts` (2+, 2−)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 6548339~1 6548339 -- src/components/rotulos.ts` — só `export` em 2 linhas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-das-etapas.test.ts test/estatico/dados-das-etapas.test.ts test/estatico/leituras-da-fila.test.ts` — 3 arquivos, 174 de 174
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 227 arquivos, 5115 de 5115
- `wc -l /home/deploy/.claude/projects/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/tool-results/b9nat5h70.txt` — 452 linhas; **fora da lista Pode, rodado por engano** (ver Pendências)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 3 testes modificados e `test/estatico/importacoes.ts` novo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — só os 3 arquivos de teste
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -U0 -- test/estatico/leituras-da-fila.test.ts` — só a definição removida e o `import`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -U0 -- test/estatico/dados-das-etapas.test.ts` — definição removida, `import` e só acréscimos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -U0 --stat=200 -- src/components/dados-das-etapas.test.ts` — 176 linhas, só acréscimo

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
