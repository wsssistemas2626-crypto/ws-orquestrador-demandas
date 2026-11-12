---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T03-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 01-analista-requisitos.md (glossário, RF-01, RF-03, CA-01, CA-03), 04-seguranca-aplicacao.md (C01, C03, IN-01 a IN-03, IN-16), docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G8, T03), 06-T02-qa-automacao.md (formato), 06-T03-engenheiro-backend.md, 06-T03-tech-lead.md, commit 997af8c e o código da tarefa em 6fcd12e (diff db63632..6fcd12e), src/modules/acesso/tokens-servico.ts (no diff), src/modules/acesso/matriz.ts (no diff), src/modules/acesso/resolver-ator.ts, src/modules/acesso/mensagens.ts, src/modules/acesso/matriz-integracoes.test.ts, src/modules/acesso/matriz-qa.test.ts, src/modules/acesso/matriz.test.ts (diff), src/modules/acesso/ramos-por-ator.test.ts (diff), src/modules/acesso/tokens-integracao.test.ts, src/modules/acesso/tokens-integracao-corrompido.test.ts, src/modules/acesso/resolver-ator-qa.test.ts (cabeçalho), src/lib/rota.ts, src/lib/log.ts, test/banco.ts, test/deps.ts, test/integracoes.ts, test/requisicao.ts, test/matriz-rotas.test.ts, test/matriz-rotas-qa.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T03 (token de integração, matriz fechada por integração e matriz × rotas; IN-01, IN-03). O commit informado,
997af8c, só regrava a entrega do engenheiro. O código e os testes da tarefa estão em 6fcd12e, e li o diff inteiro
(`db63632..6fcd12e`). O código passa em todos os testes: os do engenheiro e os 82 acrescentados aqui. Não há motivo
para devolver. Os pareceres 4 e 5 da revisão, que cabem a esta etapa, estão cobertos sem mexer nos arquivos de origem.

### Critérios da tarefa e os testes que os cobrem

A T03 cobre: RF-01, RF-03, IN-01 (a, b, c, d), IN-03, IN-16 (piso), CA-01.1, CA-01.2, CA-03.1 a CA-03.6, D-02 e D-17.

| Critério | Teste (arquivo › nome) |
|---|---|
| CA-01.1 (token `awave` resolve como `integracao`/`awave` com o prefixo, não agente) | `src/modules/acesso/tokens-integracao.test.ts` › "token da integração %s resolve como integração, com o prefixo" (engenheiro); **novo** `src/modules/acesso/tokens-integracao-qa.test.ts` › "token %s ativo resolve como integração com o prefixo, nunca agente" (por `resolverAtor`, Bearer sem Origin) e "CA-01.1/CA-01.2: $integracao em $acao ($metodo) chega à função como integração, com o prefixo" (por `rota()`, nas cinco ações permitidas) |
| CA-01.2 (o mesmo para `construir`) | os mesmos três testes acima, no caso `construir` |
| RF-01 (401 com a mesma mensagem para revogado, inexistente e fora do formato; cookie e Bearer juntos dão 400) | **novo** `tokens-integracao-qa.test.ts` › "RF-01: o 401 do token de integração revogado é igual ao do inexistente e ao do fora do formato", "RF-01: cookie de sessão junto com o Bearer da integração continua 400", "CA-01.3 no nível da ação: token do awave revogado responde 401…" |
| IN-03 (resolve só por lista; qualquer outra linha dá `null`) | `src/modules/acesso/tokens-integracao-corrompido.test.ts` (7 casos e o controle, engenheiro); `src/db/schema/integracao.test.ts` › "recusa os dois donos nulos e os dois preenchidos" (T01, CHECK pelo papel do app); **novo** `tokens-integracao-qa.test.ts` › "espaço, caixa, caractere a menos ou trocado, só o prefixo e o hash: null; o token certo resolve" |
| IN-03, parecer 5 da revisão (integração fora da lista recusada pelo CHECK certo) | **novo** `tokens-integracao-qa.test.ts` › "integração %j: 23514 em token_servico_integracao_check, nada gravado" (`jarvis`, `Awave`, vazio, `risco`) |
| IN-03 e CA-01.4 no nível do token (revogar um não afeta os outros) | `tokens-integracao.test.ts` › "CA-01.2: token de integração revogado vira null, e os outros tokens continuam valendo" (engenheiro: revoga o awave); **novo** `tokens-integracao-qa.test.ts` › "revogar o construir deixa o awave e os quatro agentes valendo; revogar de novo não acha nada", "revogar o token de um agente deixa os das duas integrações valendo", "a revogação grava a hora do relógio injetado só na linha do prefixo" |
| D-02 (`criarTokenServico` com a assinatura de hoje; `criarTokenDeIntegracao` irmã) | `tokens-integracao.test.ts` › bloco "criarTokenDeIntegracao (D-02)" e "token de agente continua AtorAgente, para cada agente"; os testes de hoje que chamam `criarTokenServico` (`tokens-servico*.test.ts`, `test/requisicao.ts`) seguem sem mudança e verdes |
| RF-03 e IN-01 (a) (exatamente os cinco pares) | `src/modules/acesso/matriz-integracoes.test.ts` › "(a) os pares (ação, integração) permitidos são exatamente os cinco do RF-03"; `src/modules/acesso/matriz.test.ts` › "cada linha é a da tabela do plano"; **novo** `src/modules/acesso/matriz-integracoes-qa.test.ts` › "criar_demanda continua de toda pessoa e só do orquestrador; ler_demanda, de toda pessoa e dos quatro agentes", "as linhas de leitura dos agentes (listar_demandas e as de ESP, RSK e DEC) não têm integração" |
| CA-03.5 e IN-01 (b) (`atoresProibidos` com as integrações) | `matriz-integracoes.test.ts` › "(b) atoresProibidos…"; `matriz.test.ts` › bloco "atoresProibidos"; `matriz-qa.test.ts` › bloco "atoresProibidos falha fechada"; **novo** `matriz-integracoes-qa.test.ts` › "em cada ação, as integrações proibidas são as últimas da lista e seguem a ordem da lista fechada", "nenhum ator proibido é permitido por autorizar, e nenhum permitido aparece como proibido" |
| CA-03.1 (awave: 403 com a mensagem de sem permissão em toda rota fora das duas ações, sem gravar nada) | `test/matriz-rotas.test.ts` › laço "… tem ação na matriz e nega cada ator proibido com 403" (com as integrações) e "nenhum evento de integração e nenhuma demanda depois de todas as rotas"; **novo** `test/matriz-rotas-integracoes-qa.test.ts` › "<arquivo>: 403 com a mensagem de sem permissão para cada integração proibida, com e sem Origin, sem gravar" (16 rotas, contagem antes e depois no mesmo teste) e "CA-03.1: GET src/app/api/demandas/route.ts com o token awave…"; **novo** `matriz-integracoes-qa.test.ts` › "é o mesmo corpo de toda negação, para cada par (ação, integração) negado", "é ErroDominio sem extras, e a message e a pilha não levam a integração, o prefixo nem a ação" |
| CA-03.2 (construir: 403 fora das três, inclusive `POST /api/demandas` e `GET /api/demandas/:id`) | os mesmos laços acima; **novo** `matriz-rotas-integracoes-qa.test.ts` › "CA-03.2: POST src/app/api/demandas/route.ts com o token construir…", "CA-03.2: GET src/app/api/demandas/[id]/route.ts com o token construir…", "CA-03.2 com corpo válido do contrato do Awave: o construir continua 403 no POST /api/demandas, sem gravar"; **novo** `tokens-integracao-qa.test.ts` › "CA-03.1 e CA-03.2: a integração na ação da outra responde 403…" |
| CA-03.3 e IN-01 (c) (os quatro agentes e o awave: 403 nas três ações do /construir) | As rotas de `pedidos-construcao` nascem na T11 e na T12. No nível da ação: `test/matriz-rotas-qa.test.ts` › "listar_pedidos_pendentes: …", "entregar_pedido: …", "confirmar_recebimento_pedido: proibido, sem 2FA, sem credencial e parâmetro inválido barrados antes da função" (engenheiro, cinco métodos); **novo** `tokens-integracao-qa.test.ts` › "CA-03.3: o token de cada agente nas três ações do /construir responde 403, sem rodar a função" (Bearer sem Origin, com o corpo da resposta); **novo** `matriz-integracoes-qa.test.ts` › "%s nega cada agente (com token e do worker), cada papel, o awave e o sistema", "atoresProibidos das três é exatamente: os quatro agentes, todos os papéis e o awave". Pelas rotas reais, `matriz-rotas.test.ts` e `matriz-rotas-integracoes-qa.test.ts` pegam as três sozinhos quando os `route.ts` entrarem |
| CA-03.4 e IN-01 (c) (pessoa com 2FA, Origin certo e JSON: 403 nas três) | `test/matriz-rotas-qa.test.ts` › os mesmos três testes acima (todo papel com cookie, Origin e JSON); **novo** `matriz-integracoes-qa.test.ts` › "%s nega cada agente (com token e do worker), cada papel, o awave e o sistema". Pela rota real: o laço de `matriz-rotas.test.ts` (T11, T12) |
| CA-03.6 e IN-01 (d) (integração fora da lista negada em toda ação) | `matriz-integracoes.test.ts` › "(d) integração fora da lista é negada em toda ação" (`jarvis`); `ramos-por-ator-qa.test.ts` (T02); **novo** `matriz-integracoes-qa.test.ts` › "valor %i negado nas 23 ações" (20 valores: caixa, espaço, vazio, nomes do protótipo, os quatro agentes, `null`, `undefined`, número, lista e objeto com `toString`), "tipo \"integracao\" em outra caixa ou com espaço é negado…", e o bloco "ator de integração com forma misturada" (4 testes) |
| IN-01 (lista congelada) | `matriz-integracoes.test.ts` › "a lista de cada linha é congelada"; **novo** `matriz-integracoes-qa.test.ts` › "acrescentar, apagar ou trocar a lista de uma linha lança, e a regra continua a mesma", "linha posta no protótipo de Object, aberta às integrações, não abre ação desconhecida", "a lista integracoes posta no protótipo de Object não abre ação a integração" |
| RF-06 na matriz (`confirmar_demanda` só de pessoa) | `matriz-integracoes.test.ts` › "as três do /construir não têm pessoa nem agente; confirmar_demanda é só de pessoa"; **novo** `matriz-integracoes-qa.test.ts` › "cada papel passa; cada agente, cada integração e o sistema são negados" |
| IN-16 e D-17 (piso de asserções) | `test/estatico/piso-de-assercoes.test.ts` (16 arquivos do D-17); nenhum arquivo existente mudou nesta etapa (`git diff --stat` vazio) |
| IN-14 (na T03, só o que a `rota()` já faz) | **novo** `tokens-integracao-qa.test.ts` › "a linha de log por requisição leva atorTipo integracao, sem o token, sem o prefixo e sem o nome da integração" |

### Testes acrescentados (82, em 3 arquivos novos)

1. `src/modules/acesso/matriz-integracoes-qa.test.ts` (40 testes, sem banco nem relógio). CA-03.6 com valores de
   borda, ator de integração com forma misturada, CA-03.3 e CA-03.4 no nível da ação, `confirmar_demanda`, o dono das
   duas ações do awave, a lista congelada contra mudança em tempo de execução e protótipo, o 403 único e sem dado do
   ator, e a ordem de `atoresProibidos` (G8 #2).
2. `src/modules/acesso/tokens-integracao-qa.test.ts` (21 testes, Postgres real). O parecer 5 (código `23514` e o nome
   do CHECK, sem levar o `detail` do Postgres à mensagem de falha), as variações do token, a independência das
   revogações, CA-01.1 e CA-01.2 por `resolverAtor` e por `rota()` com Bearer sem Origin, o 401 único, o 400 com
   cookie, o 403 com corpo e sem rodar a função, e a linha de log.
3. `test/matriz-rotas-integracoes-qa.test.ts` (21 testes, Postgres real, tokens reais das duas integrações, sem sessão
   de pessoa). Cada rota real nega a integração proibida com 403 e a mensagem, com e sem Origin. Cada teste conta
   `evento`, `demanda`, `especificacao_tecnica`, `execucao_agente` e `token_servico` antes e depois das próprias
   chamadas, o que resolve o parecer 4 da revisão sem mexer em `matriz-rotas.test.ts`. Também traz os casos nomeados do
   CA-03.1 e do CA-03.2, um deles com o corpo válido do contrato do Awave.

Os testes novos não dependem de ordem. Cada teste cria os próprios tokens, conta o banco dentro de si e restaura o
protótipo e o destino do log no `finally` ou no `beforeEach`. Também não dependem do relógio real: as datas vêm do
`relogioFixo` das deps de teste, sem `Date.now()` nem `new Date()` sem argumento. Não há segredo nem dado pessoal. Os
tokens são gerados em tempo de teste e não aparecem em nenhuma mensagem de `expect`: o formato e a ausência são
conferidos com `includes` e `toBe(false)`, e as variantes têm só nome legível. O token inexistente é montado por
`'C'.repeat(43)`, os prefixos escritos à mão são `ficticio` e `Zq9-_xY1`, a pessoa é "Pessoa Ficticia" e os textos do
corpo levam "(fictício)".

### Resultado

- `pnpm test`: **250 arquivos, 5500 de 5500** testes passaram. Antes eram 247 arquivos e 5418 testes: mais 3 arquivos
  e 82 testes.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git diff --stat`: vazio, porque nenhum arquivo rastreado mudou nesta etapa. `git status --short` mostra só os três
  arquivos novos. Nenhum `.skip`, `.only` ou `.todo`.
- Diff do engenheiro nos testes existentes (`db63632..6fcd12e`). As mudanças em `matriz.test.ts`, `matriz-qa.test.ts`,
  `matriz-rotas.test.ts`, `matriz-rotas-qa.test.ts` e `ramos-por-ator.test.ts` só acrescentam integrações às listas
  esperadas ou trocam o estado intermediário da T02 pelo da T03. Nenhuma asserção saiu nem ficou mais fraca, como a
  revisão já conferiu.

## Decisões tomadas

- Arquivos novos com o sufixo `-qa.test.ts`. Os testes do engenheiro ficam como o plano os escreveu, e a convenção do
  repositório marca o que é desta etapa.
- O parecer 5 foi coberto num teste novo, e `tokens-integracao.test.ts:62` ficou como está. Mudar o arquivo do
  engenheiro seria mudança fora do G5. O teste novo prova o código e o nome do CHECK, e o antigo continua provando que
  nada foi gravado.
- O parecer 4 foi resolvido em arquivo próprio, com a contagem dentro de cada teste. Não mexi em
  `test/matriz-rotas.test.ts`: ele está no D-17 e a revisão endereçou a correção a quem tocar o arquivo na T11 ou na
  T13. Com isso, a prova de "nada gravado" já não depende de ordem.
- Nenhum teste novo chama `POST /api/demandas` ou `GET /api/demandas/:id` com o token `awave`. Hoje as duas rotas dão
  403 pelo D-01, e a T05 e a T06 trocam esse comportamento. Um teste meu que o fixasse quebraria lá por mudança fora do
  G5. Os casos de integração nas rotas reais usam só pares negados, e esses continuam negados no fim do pedido.
- CA-03.3 e CA-03.4 ficam provados no nível da ação (`autorizar` e `rota()` sintética), porque as três rotas de
  `pedidos-construcao` só existem a partir da T11. O laço de `matriz-rotas.test.ts` e o de
  `matriz-rotas-integracoes-qa.test.ts` cobrem as rotas reais quando os `route.ts` entrarem, sem mudança de teste.
- O 403 e o 401 são conferidos pelo corpo inteiro (`erro` e `mensagem`), e não só pelo status, porque o CA-03.1 e o
  RF-01 pedem a mensagem.
- Glob e Grep não estavam disponíveis nesta sessão. Li os arquivos com Read pelos nomes citados na entrega e na revisão,
  e não rodei nenhuma busca pelo Bash.

## Pendências

- Nenhuma bloqueia a passagem.
- Registro (Minor, sem efeito no código): em `tokens-integracao.test.ts`, o teste de revogação se chama "CA-01.2". Pelo
  `01-analista-requisitos.md`, o CA-01.2 é "token `construir` resolve como integração" e a revogação sem efeito nos
  outros tokens é o CA-01.4. A tabela acima usa a numeração do 01.
- Para a T11 e a T12: os `route.ts` de `pedidos-construcao` entram sozinhos nos laços de `matriz-rotas.test.ts`,
  `matriz-rotas-qa.test.ts` e `matriz-rotas-integracoes-qa.test.ts`. O CA-03.3 e o CA-03.4 pela rota real passam a ser
  provados ali.
- Para a T05 (revisão obrigatória, parecer 3 do tech-lead): o 404 do `awave` para demanda de outro autor deve ser igual
  ao do id inexistente. Esta etapa não testou esse ponto, pelo D-01.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261111-0016-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --stat -8` — código da T03 em 6fcd12e; 997af8c só regrava a entrega
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff db63632 6fcd12e -- src/modules/acesso/tokens-servico.ts src/modules/acesso/matriz.ts test/requisicao.ts test/matriz-rotas.test.ts test/matriz-rotas-qa.test.ts src/modules/acesso/matriz-qa.test.ts src/modules/acesso/ramos-por-ator.test.ts` — diff da tarefa
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso/matriz-integracoes-qa.test.ts src/modules/acesso/tokens-integracao-qa.test.ts test/matriz-rotas-integracoes-qa.test.ts` — 3 arquivos, 82 de 82
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 250 arquivos, 5500 de 5500
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só os 3 arquivos novos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 --stat -- src/modules/acesso/matriz.test.ts src/modules/acesso/matriz-qa.test.ts src/modules/acesso/tokens-servico.test.ts src/modules/acesso/tokens-servico-qa.test.ts test/matriz-rotas.test.ts` — só as mudanças do engenheiro, já revisadas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff db63632 6fcd12e -- src/modules/acesso/matriz.test.ts` — só acréscimos de integração e troca de 19 para 23 ações

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
