---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T14-testes
agente: qa-automacao
leu: [pedido.json, contrato-passagem.md, tarefas.json, docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md (T14 e G10), 06-T14-engenheiro-frontend.md, 06-T14-tech-lead.md, 06-T02-qa-automacao.md, 06-T05-qa-automacao.md (critério → teste), 06-T06-qa-automacao.md (critério → teste), 06-T08-qa-automacao.md (critérios), 06-T07-qa-automacao.md e 06-T09-qa-automacao.md (por git grep), 03-ux-ui-design.md (textos dos avisos, por git grep), e2e/vigencia.spec.ts, e2e/apoio.ts (linhas 100 a 154), playwright.config.ts, src/app/api/pedidos-construcao/situacao.test.ts (linhas 110 a 199), saídas do pnpm test e das três execuções do pnpm test:e2e em /tmp]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verificação da T14 (e2e da vigência na T11 e na T05, e versão 0.4.1), commit
`dcee200fa3b96f8bd3ce7b2dbdb01bfe666f95ef`. É a última tarefa: rodei a suíte inteira e o e2e completo três vezes seguidas.
O código passa e não há devolução.

### Critérios da T14 → teste

| Critério (plano, T14) | Arquivo › teste |
|---|---|
| CA-06.1 e CA-03.6: aviso (a) com o id do v1, link "Abrir o pacote <v1>", sem (c), descrição do Arquivar, axe nas duas larguras | `e2e/vigencia.spec.ts` › "CA-06.1 e CA-03.6: v2 pendente com v1 em vigor → aviso (a) e link para o v1; sem (c); dica do Arquivar; axe" |
| CA-06.2: aviso (b) com o id e o link do v2, axe nas duas larguras | `e2e/vigencia.spec.ts` › "CA-06.2: v1 em vigor com o v2 mais novo pendente → aviso (b) e link para o v2; axe" |
| CA-06.3: aviso (c) e "Criar pacote novo", sem (a); o v1 sem (b); axe nas duas larguras | `e2e/vigencia.spec.ts` › "CA-06.3: v2 só do CTO com v1 de dupla aprovação → aviso (c) e "Criar pacote novo"; sem (a); o v1 sem (b); axe" (o axe do v1 agora nas duas larguras, ver abaixo) |
| CA-03.1 pelo navegador: alerta do arquivamento, status `aprovada` pela API, T05 com o v1 na etapa 4 e a Próxima ação, axe | `e2e/vigencia.spec.ts` › "CA-03.1: arquivar o v2 com v1 em vigor → Aprovada e v1 continua; T05 com o v1 na etapa 4 e a Próxima ação; axe" |
| Item 5: só o link entra no Tab, `<p>` não focável, nome do link com o id inteiro | `e2e/vigencia.spec.ts` › função `avisoNaPagina`, chamada nos três testes dos avisos (Shift+Tab e Tab pelo teclado, `tabIndex` -1, um só focável, nome acessível) |
| CA-06.5 (axe com cada aviso na página) | os três testes acima, `semViolacoesNasDuasLarguras` com (a), (b) e (c) na página |
| RF-10 (versão 0.4.1) | `test/estatico/projeto.test.ts` › "versão 0.4.1, privado, ESM, Node 24 e pnpm 12.6.0 fixo (C-39)" |
| RNF-10 e RNF-11 (e2e verde três vezes seguidas, nenhum teste acima de 24 s) | as três execuções do `pnpm test:e2e` abaixo |

### Critérios de aceite preliminares do pedido → teste

| # | Critério | Teste que prova (arquivo › nome) |
|---|---|---|
| 1 | Token construir lê `vigente`; `substituido` depois do DEC mais novo aprovado; sem pedido 404; outro ator 403 | `src/app/api/pedidos-construcao/situacao.test.ts` › "vigente → 200 {"situacao":"vigente"}, JSON, no-store e nosniff, sem CORS; substituído → {"situacao":"substituido"}", "CA-01.2: v2 de dupla aprovação: com só a primeira aprovação, vigente; com a segunda, substituido", "sem pedido gerado, pedido_gerado de agente, de sistema e de pessoa noutra demanda: iguais ao inexistente desta rota, da entrega e do andamento" e "awave, os quatro agentes, cto e administradora (sessão com 2FA) → 403 sem_permissao; sem credencial → 401; nada muda"; `src/modules/pedido-construcao/situacao.test.ts` › "CA-01.1: …" e "CA-01.2: …"; `src/app/api/pedidos-construcao/situacao-qa.test.ts` (403 com o serviço real, 12 atores × 8 estados) |
| 2 | DEC recusado pelo D1 continua recusado depois de trocar o `solicitanteNome` | `src/modules/pedido-construcao/conferir-nome-da-criacao.test.ts` › "CA-02.2: o solicitante trocado…"; `src/modules/pedido-construcao/conferir-nome-da-criacao-qa.test.ts` › "cinco trocas seguidas…", "a opção escolhida com o nome antigo continua recusando depois de trocar o nome duas vezes", e a troca concorrente com a geração e a entrega |
| 3 | Com o v1 aprovado e o v2 pendente, arquivar o v2 deixa a demanda em `aprovada` e o v1 gera o pedido | servidor: `src/modules/pacotes-decisao/arquivar-com-vigente.test.ts` › "CA-03.1: …" e "CA-03.2: …"; `src/modules/pacotes-decisao/arquivar-com-vigente-qa.test.ts` › "PATCH arquivar o v2 → 200 e aprovada pelo Sistema; POST do pedido do v1 → 200, válido; situação do v1 vigente; o v2 não gera nem tem situação". Tela: `e2e/vigencia.spec.ts` › "CA-03.1: …" (Próxima ação "Gerar o Pedido de Construção…" e "Abrir a decisão aprovada" para o v1) |
| 4 | O C-27 passa 20 vezes seguidas sem asserção retirada | `src/lib/deps-qa.test.ts` › "C-27: com DATABASE_URL_MIGRATOR no ambiente, o pool e a fila conectam só como orquestrador_app" (20 execuções na 06-T08-testes); `test/estatico/sessoes-do-banco-qa.test.ts` › "as três asserções, com os matchers de antes"; PISO `src/lib/deps-qa.test.ts: 8`. Verde de novo nesta suíte inteira |
| 5 | Os três avisos novos aparecem nas telas da T11 com os textos da ux-ui-design | `e2e/vigencia.spec.ts` › os testes CA-06.1, CA-06.2 e CA-06.3. Conferi os três textos do spec (linhas 26 a 31) contra a tabela da seção 8 da 03 (linhas 342 a 344): idênticos palavra a palavra, achados com `exact: true` |
| 6 | A fila lê uma linha de andamento por demanda, plano sem Sort sobre `andamento_construcao` | `src/modules/andamento/consultas.test.ts` › "a página usa andamento_construcao_demanda_id_idx, sem varrer a tabela e sem Sort sobre ela"; `src/modules/andamento/consultas-qa.test.ts` › "B-08-1 (qa): plano sem Sort sobre andamento_construcao, com estatísticas tortas › %s: …" (1, 4, 50 e 204 demandas) e "explain analyze: 3.000, 500, 2 e 1 linhas → exatamente 4 lidas…" |
| 7 | `registrar-qa.test.ts` no PISO com a contagem atual | `test/estatico/piso-de-assercoes.test.ts` › "src/modules/andamento/registrar-qa.test.ts tem ao menos 69 linhas com expect("; `test/estatico/piso-de-assercoes-0018.test.ts`. Reconferido agora: `git grep -c "expect("` dá 69, e o PISO (linha 166) tem 69 |
| 8 | O deploy.md traz o roteiro do serviço `migrar` no Easypanel, e a publicação 0.4.1 usa esse roteiro | **Não é critério de teste automatizado nem desta etapa.** É documentação da `09-entrega` e da `10-documentacao` (G2: nenhuma etapa 06 escreve em `docs/`). Hoje `docs/operacao/deploy.md` ainda não cita `migrar` (git grep sem resultado). Fica em Pendências |

### Teste alterado nesta etapa

`e2e/vigencia.spec.ts`, Minor 1 da `06-T14-tech-lead`: o v1 de dupla aprovação, sem aviso, passava pelo axe só em
1280 × 720 (`semViolacoes`). O item 3 do passo 1 pede o axe nas duas larguras. Troquei por
`semViolacoesNasDuasLarguras`, com uma linha de comentário de origem, e tirei `semViolacoes` do import, que ficou sem
uso. Isso só acrescenta uma medição (390 × 844); nenhuma asserção saiu (`git diff` abaixo). O spec continua com 38
linhas com `expect(`.

### Resultados

| Verificação | Resultado |
|---|---|
| `pnpm test` (suíte inteira, em segundo plano) | **396 de 396 arquivos, 9276 de 9276 testes**, 0 falha (200,7 s) |
| `pnpm test test/estatico`, depois da edição do spec | 54 de 54 arquivos, 1278 de 1278 (inclui o `projeto.test.ts` e as guardas que leem `e2e/`) |
| `pnpm lint` | limpo (`eslint .` sem saída), depois da edição |
| `pnpm typecheck` | limpo (`tsc --noEmit` sem saída), depois da edição |
| `pnpm test:e2e` execução 1 (retries 0, 1 worker) | **294 passaram, 9 pulados, 0 falha** (9,7 min), saída 0 |
| `pnpm test:e2e` execução 2 | **294 passaram, 9 pulados, 0 falha** (9,5 min), saída 0 |
| `pnpm test:e2e` execução 3 | **294 passaram, 9 pulados, 0 falha** (10,1 min), saída 0 |

Os 9 pulados são os do `capturas.spec.ts`, como antes. O `✘` do `vigia.spec.ts:5` ("CV-03 (negativo)") é a falha
esperada do próprio teste e conta entre os que passaram. As três execuções rodaram com o spec já alterado.

Tempo de cada teste de `e2e/vigencia.spec.ts`:

| Teste | 1ª | 2ª | 3ª |
|---|---|---|---|
| CA-06.1 e CA-03.6 | 2,4 s | 4,2 s | 2,8 s |
| CA-06.2 | 2,2 s | 2,4 s | 2,5 s |
| CA-06.3 (agora com o axe nas duas larguras no v1) | 4,1 s | 4,1 s | 5,0 s |
| CA-03.1 | 4,8 s | 4,7 s | 5,9 s |

Mais lento de toda a suíte e2e em cada execução: 6,9 s (1ª, `axe-todas.spec.ts:185` e `decisao.spec.ts:305`), 11,1 s
(2ª, `reflow-qa.spec.ts:143`) e **18,1 s** (3ª, `reflow-qa.spec.ts:152`, "T06: axe em 1280 px com anexos no limite e
resumo de erros"). Nenhum teste passou de 24 s. Nenhum teste do spec novo passou de 6 s.

**Relatório de falhas por criticidade:** nenhuma falha. Uma observação de estabilidade, baixa, fora desta tarefa: o
`reflow-qa.spec.ts:152` levou 5,5 s, 6,1 s e 18,1 s nas três execuções. Ficou abaixo dos 24 s, mas a variação é grande
(Pendências).

### Conferências

- `git status --short`: só `e2e/vigencia.spec.ts` modificado.
- `git diff -- e2e/vigencia.spec.ts`: só o import sem `semViolacoes` e a troca da linha 119 por
  `semViolacoesNasDuasLarguras`, com o comentário. Nenhum teste apagado, nenhum `.skip`, `.only` ou `.todo`, nenhuma
  asserção afrouxada.
- `git grep` por `token`, `senha`, `http`, `.only`, `.skip` e `.todo` no spec: sem resultado. Os dados vêm do seed
  fictício (títulos "(fictício)") e o login é o de `entrarComo`.
- Ordem e relógio: cada teste do spec confere a pré-condição pela API e roda sozinho; os três dos avisos só leem, e o
  do arquivamento usa demanda própria e aceita o v2 já arquivado. Nenhum depende do relógio real.

## Decisões tomadas

- Apliquei o Minor 1 da revisão no spec: o plano pede o axe nas duas larguras no item 3, e a troca só acrescenta
  medição, sem tirar nada.
- Não mexi nos Minors 2 e 3 da revisão: o ramo "v2 já arquivado" só roda contra banco reaproveitado (o local é sempre
  novo), e o (a) com uma das duas aprovações gastaria uma aprovação da administradora numa demanda do seed; os dois
  ficam com a `09-entrega` e a `07-qa-funcional`, como a revisão registrou.
- Rodei o e2e completo três vezes depois da edição, e não só uma: a definição de pronto pede três verdes seguidas, e o
  spec mudou depois das execuções do engenheiro.
- O critério 8 do pedido ficou sem teste automatizado: é texto de `docs/operacao/deploy.md` e uso na publicação, que
  são da `09-entrega` e da `10-documentacao`, não código.

## Pendências

- Para a `09-entrega` e a `10-documentacao`: o critério 8 do pedido (roteiro do serviço `migrar` no
  `docs/operacao/deploy.md`, com backup, Deploy do migrar até "Migrations aplicadas.", worker e app; e a publicação 0.4.1
  por esse roteiro) ainda não está no repositório. Também ficam com a 10 o CHANGELOG da 0.4.1 (com a causa do C-27),
  a spec (A-02, CA-22.x) e o manual cap. 04 e 08.
- Para a `09-entrega` (Minor 2 da revisão): olhar o teste CA-03.1 de `vigencia.spec.ts` nas execuções 2 e 3 contra a
  homologação, onde o ramo "v2 já arquivado" roda.
- Para a `07-qa-funcional` (Minor 3 da revisão e G2): o aviso (a) com a primeira das duas aprovações registrada;
  leitor de tela e zoom nos três avisos, na dica e na chegada.
- Observação de estabilidade, baixa, fora da T14 (para o `tech-lead` decidir se vira tarefa): `e2e/reflow-qa.spec.ts:152`
  ("T06: axe em 1280 px com anexos no limite e resumo de erros; nada gravado") levou 5,5 s, 6,1 s e 18,1 s. Não falhou
  e ficou abaixo de 24 s, mas está a 6 s do teto da RNF-11.
- O `ls` da pasta do pedido (primeiro comando abaixo) está na minha lista Pode, mas não entre as formas da regra de
  comando do maestro desta etapa. É só leitura e está declarado; depois dele, só usei Read e `git grep`.
- O `pedido.json` não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0018-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T14" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — em segundo plano: 396 de 396 arquivos, 9276 de 9276 testes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export async function semViolacoes" -- e2e/apoio.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "CA-01.1\|CA-01.2: \|CA-01.3\|CA-01.4" -- src/modules/pedido-construcao/situacao.test.ts src/app/api/pedidos-construcao/situacao.test.ts src/app/api/pedidos-construcao/situacao-403.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "Critério\|critério 4\|20 vezes\|20 execuções" -- docs/construcao/DEC-DEM-20261111-0018-v1/06-T08-qa-automacao.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "Sort" -- docs/construcao/DEC-DEM-20261111-0018-v1/06-T07-qa-automacao.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "registrar-qa" -- test/estatico/piso-de-assercoes.test.ts docs/construcao/DEC-DEM-20261111-0018-v1/06-T09-qa-automacao.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" -- src/modules/andamento/registrar-qa.test.ts` — 69
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "migrar" -- docs/operacao/deploy.md` — sem resultado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "vigencia" -- test e2e/apoio.ts playwright.config.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "'e2e/" -- test/estatico/piso-de-assercoes.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- e2e/vigencia.spec.ts` — só o import e a linha do axe do v1
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "Esta demanda já tem um pacote aprovado em vigor\|Há um pacote mais novo pendente nesta demanda\|A aprovação deste pacote será recusada" -- docs/construcao/DEC-DEM-20261111-0018-v1/03-ux-ui-design.md`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico --reporter=dot` — 54 de 54 arquivos, 1278 de 1278
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — execução 1, em segundo plano: 294 passaram, 9 pulados, 0 falha (9,7 min)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — execução 2, em segundo plano: 294 passaram, 9 pulados, 0 falha (9,5 min)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — execução 3, em segundo plano: 294 passaram, 9 pulados, 0 falha (10,1 min)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só `e2e/vigencia.spec.ts` modificado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "token\|senha\|http\|\.only\|\.skip\|\.todo" -- e2e/vigencia.spec.ts` — sem resultado

As saídas do `pnpm test` e das três execuções do `pnpm test:e2e` em /tmp foram lidas pela ferramenta Read. A edição do
spec foi feita pela ferramenta Edit.

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
