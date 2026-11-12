---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T19-testes
agente: qa-automacao
leu: [contrato-passagem.md, pedido.json, padrao-tecnico.md, tarefas.json, 01-analista-requisitos.md (linhas 1 a 80 e 250 a 408: RF-10 a RF-16 e RNF), docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (T19), 06-T19-engenheiro-frontend.md, 06-T19-tech-lead.md, 06-T18-qa-automacao.md (formato), 06-T10-qa-automacao.md (linhas 1 a 50), commit d45c909 (diff de src/ e e2e/), src/lib/fuso.ts, src/modules/pedido-construcao/pendentes.ts, src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts (linhas 1 a 140), src/app/api/demandas/[id]/historico/route.ts, src/modules/historico/consultas.ts (EventoVisivel e listarHistorico), scripts/seed-ficticio.ts (pedidoRecebido), e2e/apoio.ts, playwright.config.ts, saída de pnpm test e de pnpm test:e2e]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T19 (commit `d45c909`, engenheiro-frontend): a linha "Recebido pelo /construir em …" no cabeçalho da T11 e o
texto novo da seção "Pedido de Construção". O código passa em todos os testes e nada volta ao engenheiro. A revisão não
tinha rodado o e2e: rodei o `pnpm test:e2e` inteiro, com o axe nas telas novas (T11 com a linha, em 1280 × 720 e
390 × 844).

### Critérios da tarefa e o teste que cobre cada um

| Critério | Teste (arquivo › nome) |
|---|---|
| CA-15.1: a pessoa vê "Recebido pelo /construir em" seguido da data e hora **do evento** | `src/components/recebimento.test.ts` › "CA-15.1: "Recebido pelo /construir em <data e hora>." com o ISO" e "CA-15.1: a data é a do fuso do sistema, também na virada do dia em UTC"; `pagina.test.ts` › "CA-15.1: a linha depois de "Repositório destino" e antes das citações, …" e "CA-15.1: aparece em toda situação do DEC: …"; `e2e/recebido-construir.spec.ts` › "T11 com o pedido recebido: a linha no cabeçalho e axe nas duas larguras" e "… em 390 px: …"; **novo:** `e2e/recebido-construir-qa.spec.ts` › "CA-15.1: a data da linha é a do primeiro pedido_recebido do DEC, no fuso do sistema" (o `datetime` é o instante do evento lido no histórico da demanda, e o texto é ele no fuso) |
| CA-15.1, bordas da data (meia-noite, virada do ano, hora 00, segundos, zeros à esquerda) | **novo:** `src/components/recebimento-qa.test.ts` › os 5 casos de "linhaDoRecebimento: bordas da data (QA da T19)"; **novo:** `src/app/(painel)/pacotes-decisao/[decId]/recebimento-qa.test.ts` › "CA-15.1: à meia-noite em São Paulo a linha diz 00:00 do dia novo, …" e "CA-15.1: o datetime leva o instante do evento com os segundos; …" |
| CA-15.1, a linha não depende do papel | **novo:** `recebimento-qa.test.ts` (página) › "CA-15.1: a administradora vê a mesma linha que o CTO …"; **novo:** `e2e/recebido-construir-qa.spec.ts` › "CA-15.1: a administradora vê a mesma linha, com o mesmo instante" |
| CA-15.2: pedido gerado e não recebido, a frase não aparece | `recebimento.test.ts` › "CA-15.2: sem pedido_recebido, a linha não existe"; `pagina.test.ts` › "CA-15.2: sem pedido_recebido, a linha não existe e o cabeçalho é o de hoje"; **novo:** `recebimento-qa.test.ts` (página) › "CA-15.2 e CA-16.3: sem recebimento, a seção do pedido continua com o texto novo e nenhuma linha de recebimento". No e2e, não, pela D-11 (o estado dos DEC do seed muda numa homologação reaproveitada) |
| CA-15.4: axe sem violação no detalhe do DEC com a frase | `e2e/recebido-construir.spec.ts` › "T11 com o pedido recebido: …" (`semViolacoesNasDuasLarguras`, 1280 × 720 e 390 × 844); rodou e passou nesta etapa. Também passaram `axe-todas` (T11 nos três testes) e `decisao-celular` |
| CA-16.3 (na tela, como o plano o mapeia): a seção não diz mais que o envio é só manual | `recebimento.test.ts` › "CA-16.3: o texto da seção não diz mais que o envio é só manual"; `dados-do-pedido.test.ts` › "os da 03, por inteiro, …"; `pagina.test.ts:599`; `e2e/pedido-construcao.spec.ts` › "CA-26.3: …"; `e2e/recebido-construir.spec.ts` › "T11 com o pedido recebido: …"; **novo:** `recebimento-qa.test.ts` (página) › "CA-15.1 e CA-16.3: no DEC aprovado vigente, a linha no cabeçalho e a seção do pedido com o texto novo, sem o texto do envio só manual"; **novo:** `e2e/recebido-construir-qa.spec.ts` › "CA-16.3: a T11 do pedido recebido não diz em lugar nenhum que o envio ao /construir é só manual" |
| 03, 6.1 (lugar da linha, visto decorativo, sem foco) | `pagina.test.ts` › "CA-15.1: a linha depois de …"; `e2e/recebido-construir.spec.ts` › "T11 com o pedido recebido: …" |
| 03, 6.3 (falha na leitura vai à tela de erro) | `pagina.test.ts` › "03, 6.3: falha ao ler o recebimento vai para a tela de erro de hoje, …" |
| Ordem: a leitura só depois de autorizar e achar o pacote; nenhuma ação nova | `pagina.test.ts` › "lê o recebimento do DEC depois de autorizar e de achar o pacote; …" |

A parte do CA-16.3 que fala do manual técnico (cap. 05, rotas novas) é da `10-documentacao`, não da T19.

### Testes acrescentados

- `src/components/recebimento-qa.test.ts` (novo, 7 testes), sem banco e com datas fixas:
  1. a 5. um `it.each` com `toStrictEqual` sobre `{ texto, iso }`: 02:59:59Z → "10/11/2026 às 23:59"; 03:00Z →
     "11/11/2026 às 00:00" (hora 00, e não 24); 2027-01-01T02:30Z → "31/12/2026 às 23:30"; 05/03 às 09:07 com zeros
     à esquerda; 17:32:59.999Z → "14:32" (segundos cortados) com o `iso` guardando os milissegundos. Em cada caso, a
     data aparece uma vez só na frase (a página parte a frase pela data, com `lastIndexOf`; é o Minor 1 da revisão);
  6. com o relógio do processo trocado (`vi.setSystemTime` em 2031), a linha é a mesma: a função não lê o relógio;
  7. o `Date` recebido não muda.
- `src/app/(painel)/pacotes-decisao/[decId]/recebimento-qa.test.ts` (novo, 5 testes), HTML do servidor da T11 com os
  mesmos dublês do `pagina.test.ts` e a matriz real, num DEC aprovado vigente:
  1. meia-noite: o `<p>` sem tags é "Recebido pelo /construir em 11/11/2026 às 00:00.", o `<time datetime=…03:00:00.000Z>`
     tem o texto certo, um `<time>` só no `<p>` e a data uma vez só na página;
  2. segundos: `datetime` com `.999Z` e texto "14:32";
  3. CTO e administradora recebem o mesmo `<p>`, e a leitura é sempre do DEC;
  4. com recebimento, a linha vem antes do `h2` "Pedido de Construção", a seção tem o texto novo uma vez, e a página não
     tem "manual nesta versão" nem "O envio ao /construir é manual";
  5. sem recebimento, nenhuma linha e a seção com o texto novo.
- `e2e/recebido-construir-qa.spec.ts` (novo, 3 testes, só leitura sobre o DEC da `pedidoRecebido` do seed):
  1. o `datetime` do `<time>` é igual ao `ocorridoEm` do primeiro `pedido_recebido` do DEC no
     `GET /api/demandas/:id/historico` (mesma regra de `recebimentoDoPedido`: o mais antigo, e depois pelo id), e o texto
     do `<time>` e da linha é esse instante por `formatarDataHora`. O teste do engenheiro só conferia o formato;
  2. a administradora vê a mesma linha, com o mesmo instante;
  3. a região "Pedido de Construção" tem as duas frases novas e o `main` não tem o texto antigo.

Nenhum teste existente mudou (`git diff --stat` vazio; só os 3 arquivos novos no `git status`).

### Resultados

- Rodada focada, antes da suíte: os 2 arquivos Vitest novos, 12 de 12; os specs `recebido-construir-qa`,
  `recebido-construir` e `pedido-construcao`, 10 de 10.
- `pnpm test` (suíte inteira): **291 de 291 arquivos e 6367 de 6367 testes, código 0**, em 156 s.
- `pnpm test:e2e` (build de produção, porta 3101, banco recém-semeado): **280 testes, 271 passaram e 9 foram pulados
  (as capturas), código 0**, em 10,8 min. O `✘` de `e2e/vigia.spec.ts:5` é o controle negativo esperado e conta entre os
  que passaram. Os 2 testes da T19 e os 3 novos passaram, com o axe sem violação na T11 com a linha em 1280 × 720 e
  390 × 844 (CA-15.4). Passaram também `axe-todas` (T11), `alvo-de-toque` (T11 em 390 px), `decisao`, `decisao-celular`,
  `fontes` (T11) e `pedido-construcao`, que leem a T11.
- Tempo dos testes novos no e2e: de 0,5 s a 0,6 s na suíte (até 4,2 s na rodada focada, com o servidor recém-subido),
  abaixo dos 24 s. `retries: 0` sem mudança.
- `pnpm typecheck` e `pnpm lint`: limpos.

## Decisões tomadas

- Testes de QA em arquivos `-qa` novos, no padrão do repositório: nenhum teste do engenheiro foi tocado.
- O e2e compara a linha com o evento do histórico, e não com uma data fixa: o seed grava o `pedido_recebido` na hora
  em que roda, e assim o teste não depende do relógio nem do banco usado (local ou homologação).
- CA-15.2 continua só em Vitest (D-11): o e2e não acha um DEC com pedido gerado e sem recebimento que fique estável
  numa homologação reaproveitada, porque a T20 vai entregar e receber os pendentes.
- Os e2e novos usam as contas "cto" e "administradora" só para ler: não criam demanda, versão nem evento.
- Datas fixas nos testes de unidade e de página; o único `vi.setSystemTime` serve para provar que a função não lê o
  relógio, e o `afterEach` volta o relógio real.

## Pendências

- Nenhuma bloqueia a T19.
- Para a T20: a regra "e2e verde três vezes seguidas" vale para a suíte toda; esta etapa rodou uma vez a completa e uma
  a focada.
- Minor 1 e 2 da `06-T19-revisao` (data formatada duas vezes e `lastIndexOf`; `if (!linha)` inalcançável) seguem com
  quem mexer de novo na T11. O teste de bordas novo confere que a data aparece uma vez só na frase, o que protege o
  `lastIndexOf` enquanto o texto for o de hoje.
- Segue aberto para a 07 ou a 08 (`engenheiro-backend`, `scripts/seed-ficticio.ts`) o Minor 2 da `06-T15-revisao`
  (resumo executivo do DEC do `pedidoRecebido` diz "exige as duas aprovações" num DEC só do CTO). Nenhum teste novo lê
  o resumo.
- Para a `07-qa-funcional`: à mão, o leitor de tela na linha (o visto não deve ser lido) e o zoom de 200 % e 400 % da T11
  com a linha.
- Para a `10-documentacao`: a parte do CA-16.3 sobre o manual técnico (cap. 05 com as três rotas e sem dizer que o
  pedido é só baixado e copiado à mão).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — HEAD em f25c63d (06-T19-revisao), construção em d45c909
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — árvore limpa no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff d45c9091c7c848852e987b5b6c42133fc8f07a7e~1 d45c9091c7c848852e987b5b6c42133fc8f07a7e -- src e2e` — o diff de código e testes da T19
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 -L "/^### T19/,/^### T20/:docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md" --format=%h` — a T19 do plano
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%h -L "/pedidoRecebido/,+6:scripts/seed-ficticio.ts"` — o título da demanda do seed
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%h -L "/TITULOS_DO_E2E.pedidoRecebido/,+40:scripts/seed-ficticio.ts"` — as demandas dos pedidos no seed
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%h -L "/export type EventoVisivel/,+20:src/modules/historico/consultas.ts"` — a forma do evento no histórico
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%h -L "/export async function listarHistorico/,+25:src/modules/historico/consultas.ts"` — o histórico filtra pela demanda
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/recebimento-qa.test.ts "src/app/(painel)/pacotes-decisao/[decId]/recebimento-qa.test.ts"` — 2 de 2 arquivos, 12 de 12
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/recebido-construir-qa.spec.ts e2e/recebido-construir.spec.ts e2e/pedido-construcao.spec.ts` — 10 de 10
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — em segundo plano, saída lida com Read: 291 de 291 arquivos, 6367 de 6367 testes, código 0
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só os 3 arquivos novos desta etapa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — vazio: nenhum arquivo rastreado mudou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — em segundo plano, saída lida com Read: 280 testes, 271 passaram, 9 pulados, código 0, em 10,8 min
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — depois do e2e, só os 3 arquivos novos

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste (CA-15.1, CA-15.2, CA-15.4, CA-16.3 na tela e D-11, tabela acima)
- [x] a suíte inteira passa (291 de 291 arquivos e 6367 de 6367 testes; e2e com 271 que passaram e 9 pulados, código 0)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real (datas fixas; o e2e lê o instante do próprio evento e não grava nada)
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff --stat`: vazio; só arquivos novos)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real (contas e DEC fictícios do seed, "Pessoa Ficticia CTO QA", datas fixas, nenhum token)
