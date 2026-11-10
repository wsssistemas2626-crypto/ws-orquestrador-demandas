---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T04-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (cabeçalho, G1 a G7, T01 a T05), 01-analista-requisitos.md (RF-13 e RF-16), 06-T04-engenheiro-frontend.md, 06-T04-tech-lead.md, 06-T03-qa-automacao.md (cabeçalho), diff do commit 6255e25 (src e e2e), src/modules/acesso/destino-seguro.ts, src/app/entrar/FormularioEntrar.tsx, src/app/layout.tsx, src/components/Cartao.tsx, e2e/apoio.ts, test/estatico/painel-qa.test.ts, test/estatico/decisao-e2e.test.ts (cabeçalho), vitest.config.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T04 (marca e moldura pública: Entrar, 2FA, Sem permissão, erro e 404), código em 6255e25. Cada critério da tarefa tem
teste. A suíte inteira, o lint e o typecheck passam, e o e2e deu 161 de 161. Não achei defeito no código da tarefa.
Acrescentei 14 testes de unidade e 3 e2e nas lacunas abaixo.

### Critério da tarefa → teste que cobre

| Critério (plano, T04) | Teste |
|---|---|
| CA-13.1: `entrar.spec.ts`, `configurar-2fa.spec.ts` e `autenticacao-qa.spec.ts` passam só com seletor ou texto mudado | Os três specs **não mudaram** no commit 6255e25 (fora do `--stat`) e passaram no `pnpm test:e2e` (161 de 161) |
| CA-13.2: QR da T02 `#ffffff` com módulos `#000000` | `e2e/moldura-publica.spec.ts`, "CA-13.2: o QR da T02 continua #ffffff com módulos #000000…" (no passo 2, onde o QR existe: desvio 1 aceito na revisão); novo: `e2e/moldura-publica-qa.spec.ts`, "C-04 (c) na T02 em 390 px…" (o QR cabe na tela em 390 px) |
| CA-13.3: axe na T01 vazia, com erro e no passo 2, em 1280 × 720 e 390 × 844 | `e2e/moldura-publica.spec.ts`, "CA-13.3: axe na T01 vazia, com erro e no passo 2…" (e o axe dos passos 1 e 2 da T02, Sem permissão e 404 nas duas larguras) |
| CV-01: auth, acesso e QR congelados | Comando do G4 contra 198e97d: vazio (Comandos executados) |
| Marca sem link em T01 e T02 (C-40 intacto) | `src/components/casca/moldura-publica.test.ts`, "T01 e T02: a marca sem link (C-40)…"; `e2e/moldura-publica.spec.ts`, "RF-13: T01 com a marca sem link…"; novos: `moldura-publica-qa.test.ts`, "C-40: callbackURL hostil na T01…" (5 casos) e `moldura-publica-qa.spec.ts`, "C-40 na T01 em 390 px…" e "C-04 (c) na T02 em 390 px…" (sem link nos passos 1 **e 2**) |
| CV-19: link da marca só para `/demandas` | `moldura-publica.test.ts`, "sem link por padrão; com link, só para /demandas…"; novos: `moldura-publica-qa.test.ts`, os 3 testes de "CV-19: o link da marca só leva à fila" |
| `painel-qa.test.ts` verde | `test/estatico/painel-qa.test.ts` passou no `pnpm test`, sem mudança; novo: `moldura-publica-qa.test.ts`, "a moldura e a marca não leem sessão nem banco" (fecha a lacuna abaixo) |

### Lacunas que achei e os testes que acrescentei

`src/components/casca/moldura-publica-qa.test.ts` (novo, 14 testes):

- **CV-19 no código.** O destino da marca é a constante `'/demandas'`, igual ao `DESTINO_PADRAO` do C-40. `MarcaWs.tsx`
  tem um só `href=`, e ele é `href={DESTINO_DA_MARCA}`. As `Props` não aceitam `href`, `destino`, `para` nem `url`. A
  `MolduraPublica` não tem `href` e só repassa `comLinkNaMarca`. Sem esse teste, uma prop de destino passaria nos testes
  de hoje enquanto as páginas continuassem sem usá-la.
- **Exceção de C-04 do `painel-qa.test.ts`.** Esse teste só lê o arquivo da página. Agora Sem permissão, erro e 404
  importam a moldura, então uma leitura de sessão posta em `MolduraPublica` ou `MarcaWs` passaria por ele. O teste novo
  fecha as importações (`react`, `../Cartao`, `../marca/MarcaWs`; `next/link`) e proíbe `headers(`, `cookies(`,
  `obterDeps(`, `exigir…(`, `useState(`, `useEffect(`, `fetch(` e `'use client'`. Um caso plantado prova que a regra
  reprova.
- **C-40 com entrada hostil.** A T01 recebe `callbackURL` igual a `https://exemplo.test/roubo`, `//exemplo.test/roubo`,
  `/\exemplo.test/roubo`, `javascript:alert(1)` ou `/demandas?x=<script>`, com `motivo=sessao`. Em todos os casos o HTML
  não tem link nem o valor recebido, e o aviso de sessão e o `h1` são os de hoje.
- **Landmarks únicos nas cinco telas** (T01, T02, Sem permissão, 404 e erro): um `header`, um `main#conteudo`
  (`tabindex="-1"`), um `h1` e nenhum `nav`. O `h1` fica dentro do `main`, a marca fica fora dele, e o `header` vem
  antes. O axe com as tags `wcag*` não acusa banner repetido.
- **Erro (RNF-10).** Com sentinelas na causa e na pilha (além da mensagem e do digest), nada aparece na tela, e o único
  link é o da marca.

`e2e/moldura-publica-qa.spec.ts` (novo, 3 testes, em 390 × 844):

- "C-40 na T01 em 390 px: callbackURL de outra origem não vira link; a marca fica acima do cartão". Não há link, `nav`,
  "Sair" nem "Menu". A vigia de origem do `apoio.ts` confirma que nada sai para `exemplo.test`. Não há rolagem lateral.
- "C-04 (c) na T02 em 390 px: nos passos 1 e 2, nenhum link, menu nem "Sair"; o QR cabe na tela". O passo 2 só existia
  no e2e da construção sem essa conferência. Usa a conta `sem2fa`, que nunca verifica código, como os specs de hoje.
- "Sem permissão e 404 em 390 px: a marca é o primeiro Tab, com foco visível, alvo de 44 px e acima do cartão". Mede o
  contorno `solid` de pelo menos 2 px, o alvo de pelo menos 44 × 44 px e a posição acima do `main`. Isso automatiza parte
  da pendência de foco que a construção e a revisão deixaram para a 07.

### Resultado

- `pnpm test`: 214 arquivos, **4782 de 4782**. Antes eram 213 arquivos e 4768 testes; a diferença são os 14 novos.
- `pnpm test:e2e`: **161 de 161** em 5,5 min. Antes eram 158; a diferença são os 3 novos. A vigia de origem e CSP ficou
  ligada em todos.
- `pnpm lint` e `pnpm typecheck`: limpos.
- Spec novo isolado: 3 de 3 (48,6 s). Teste de unidade novo isolado: 14 de 14.

### Conferências do `git diff`

- Árvore de trabalho: só os 2 arquivos novos (`??`). `git diff` saiu vazio, então nenhum teste existente foi tocado
  nesta etapa.
- Commit 6255e25: nenhum `.skip`, `.only` ou `.todo`. Os dois testes existentes que mudaram (`entrar.test.ts:46` e
  `configurar-2fa/pagina-qa.test.ts:29`) trocaram só a regex do nome no `header`, uma linha por outra, com o mesmo número
  de `expect(`. A asserção ("nome do sistema no cabeçalho") não ficou mais fraca. Os três e2e de autenticação não mudaram.
- G4 (CV-01) contra 198e97d: vazio.

## Decisões tomadas

- Testes novos em arquivos `-qa` próprios, e não dentro dos do engenheiro: assim os testes da construção ficam como
  foram revisados, e a autoria de cada asserção fica clara (o mesmo padrão de `painel-qa.test.ts` e `fila-qa.test.ts`).
- O e2e novo roda só em 390 × 844 (`test.use`): o computador já está coberto pelo `moldura-publica.spec.ts`, e repetir
  as telas gastaria tempo da suíte sem cobrir regra nova.
- Os testes novos não leem o relógio nem dependem de ordem. Cada e2e faz o próprio login com um IP fictício no
  `beforeEach` e não grava nada no banco: a conta `sem2fa` não conclui a ativação.
- A tela de erro continua sem e2e. Provocá-la no build de produção exige uma falha plantada no servidor, fora da minha
  lista. A unidade cobre a marca, os landmarks e as sentinelas; a conferência com a tela aberta continua com a 07
  (P-T04-02).

## Pendências

- Para a 07 (não bloqueia, já registrada como P-T04-02): abrir a tela de erro de verdade e conferir a T02 em 320 px com
  a chave longa. O foco no link da marca em Sem permissão e no 404 agora tem e2e em 390 px; falta só a conferência visual
  do contraste do contorno.
- Para a T16 (não bloqueia): quando `semViolacoesNasDuasLarguras` existir em `e2e/apoio.ts`, a função
  `semRolagemLateral` do `moldura-publica-qa.spec.ts` pode ir para lá, junto com a troca da P-T04-01.
- Desvio de procedimento meu: li o fim da saída do `pnpm test` com `tail` sobre o arquivo de saída que a ferramenta
  gravou fora do repositório (só leitura, sem efeito). O comando não está na lista Pode; devia ter usado a ferramenta
  Read. Está declarado abaixo. O resultado (214 arquivos, 4782 de 4782) é o mesmo da saída completa.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — topo 99104e6 (06-T04-revisao), 6255e25 logo abaixo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 6255e25^ 6255e25 --stat` — 15 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 6255e25^ 6255e25 -- src e2e` — diff lido por inteiro
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/casca/moldura-publica-qa.test.ts` — 14 de 14
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/moldura-publica-qa.spec.ts --reporter=line` — 3 de 3
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 214 arquivos, 4782 de 4782
- `tail -n 12 /home/deploy/.claude/projects/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/tool-results/b73u20213.txt` — fim da saída do `pnpm test`; fora da lista Pode, ver Pendências
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=dot` — 161 de 161 (5,5 min)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d --stat -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 2 arquivos novos de teste
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — vazio

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
