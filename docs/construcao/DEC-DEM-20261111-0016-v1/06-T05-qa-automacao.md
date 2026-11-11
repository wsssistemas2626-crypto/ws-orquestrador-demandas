---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T05-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 01-analista-requisitos.md (glossário, RF-01, CA-01.1, RF-07, CA-07.1 a CA-07.4), 04-seguranca-aplicacao.md (C06, C08, IN-02, IN-08, IN-14), docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G7 e T05), 06-T04-qa-automacao.md (formato), 06-T05-engenheiro-backend.md, 06-T05-tech-lead.md, commit 0a599b5 (git diff 0a599b5~1 0a599b5), src/modules/demandas/consultas.ts (tipos e diff), src/modules/demandas/servico.ts, src/modules/demandas/schemas.ts, src/db/schema/demandas.ts, src/lib/rota.ts, src/lib/log.ts, src/lib/sentry.ts, src/modules/integracoes/tempo-limite-qa.test.ts, test/integracoes.ts, test/banco.ts, test/deps.ts, test/requisicao.ts, vitest.config.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T05: o Awave lê só a demanda que criou, em seis chaves (RF-07, IN-08, ADR-23, D-16). O código está no commit
0a599b5, e li o diff inteiro. Ele passa nos 9 testes do engenheiro e nos 7 que acrescentei aqui, entre eles o Minor da
06-T05-revisao (503 no GET da integração com a trava real). Não há motivo para devolver.

### Critérios da tarefa e os testes que os cobrem

A T05 cobre RF-07, IN-08, ADR-23, CA-01.1, CA-07.1 a CA-07.3 e D-16. O CA-07.4 (as chaves do 201) fica na T06. O IN-14
entra pelo orçamento de tempo da leitura (ADR-28, pendência da 06-T04-revisao).

| Critério | Teste (arquivo › nome) |
|---|---|
| CA-07.1 (200 com exatamente as seis chaves) | `src/app/api/demandas/leitura-awave.test.ts` › "CA-07.1: 200 com exatamente as seis chaves e os valores da demanda" (engenheiro); **novo** `src/app/api/demandas/leitura-awave-qa.test.ts` › "o 200 do Awave sai com no-store, nosniff, no-referrer e JSON, sem cabeçalho de CORS" |
| CA-07.2 (pessoa e agente: 404 igual ao inexistente) | engenheiro: "CA-07.2: demanda de pessoa e de agente dão 404 igual, byte a byte, ao de um id que não existe", "a linha de log da recusa é a mesma para demanda de outro autor e para id inexistente", "demanda do Awave em status final continua legível só por ele, e a de outro autor em status final continua 404" e o controle de existência; **novo** `leitura-awave-qa.test.ts` › "demanda de pessoa com conta de id \"awave\" e de agente, as duas com solicitante \"Awave\", dão o mesmo 404 do id inexistente" (a origem vem de `autor_tipo` e `autor_id` juntos, e não do nome nem do id da conta; o controle lê o banco e confirma `pessoa`/`awave` e `agente`/`orquestrador`) |
| CA-07.3 (título e status atuais, nenhum outro campo) | engenheiro: "CA-07.3: vê título e status atuais, e nenhum texto livre, nome ou versão", "M-1: o título sai minimizado pelo solicitante atual", "a ESP gravada por pessoa na demanda do Awave não aparece para ele"; **novo** `leitura-awave-qa.test.ts` › "editada por pessoa com todo campo preenchido, o Awave vê só as seis chaves, com status e atualizadaEm atuais" (a pessoa preenche papel, linha de serviço, urgência, justificativa, contexto, descrição, impacto e anexo com sentinela, e a demanda ganha dúvidas da entrada. A edição é uma hora depois da criação. O corpo é igual, com `toEqual`, às seis chaves com `status: em_analise` e `atualizadaEm` da edição, sem nenhuma sentinela, sem o domínio do anexo e sem os valores das enumerações) |
| IN-08 (lista de permissão chave a chave) | engenheiro: CA-07.1 e o caso da ESP; **novo** `leitura-awave-qa.test.ts` › "vistaDaIntegracao recebe a DemandaVista inteira e devolve só as seis chaves (a vista que o 201 da T06 vai usar)". O teste quebra se alguém trocar a montagem por `...d` ou se o 201 da T06 passar a vista inteira |
| D-16 e ADR-23 (a integração nunca passa por `obterDemanda`; a autoria está no `WHERE`) | engenheiro: os testes do CA-07.2 e do log; **novo** `leitura-awave-qa.test.ts` › "chamada direto, sem a matriz, só o awave lê a demanda do Awave; construir e integração fora da lista recebem nao_encontrado". É defesa em profundidade: mesmo que a matriz abrisse `ler_demanda` para o `construir`, ele não leria a demanda do Awave |
| IN-02 (switch com `never` em `lerDemandaPara`) | **novo** `leitura-awave-qa.test.ts` › "tipo de ator desconhecido lança erro genérico (500), nunca devolve vista nem 404" |
| IN-14 e ADR-28 (a leitura roda sob o orçamento de tempo; 503 fixo; log sem prefixo) | **novo** `leitura-awave-qa.test.ts` › "com a tabela demanda travada por outra conexão, desiste pelo lock_timeout: 503 fixo, log sem prefixo, e lê de novo quando a trava sai". O teste segura `LOCK TABLE demanda IN ACCESS EXCLUSIVE MODE` numa transação do migrator. Espera 503 com `{ erro: 'indisponivel', mensagem: MENSAGEM_INDISPONIVEL }` e os cabeçalhos seguros, e uma linha de log só, de nível 50, com `atorTipo: 'integracao'` e `codigoErro: 'indisponivel'`, sem o prefixo, sem `wsod_`, sem "awave" e sem o id. O controle é a mesma leitura dando 200 depois que a trava sai. É o Minor 1 da 06-T05-revisao. Se `consultas.ts:322` passar a ler por `deps.db`, sem o orçamento, o GET espera a trava até o `statement_timeout` de 10 s do papel do app. O 57014 sai sem tradução, como 500, e o teste falha |
| CA-01.1 (o token `awave` resolve para `integracao`/`awave`, não agente) | Na T05, o GET com o token `awave` real passa pelo `resolverAtor` de verdade e responde 200 nos dois arquivos, e a linha de log registra `atorTipo: 'integracao'`. A resolução com o prefixo é da T03, nos testes de `resolver-ator` |
| O `construir` fora de `ler_demanda` | engenheiro: "o token do /construir continua 403 na leitura de demanda, inclusive na do Awave" |

### Testes acrescentados (7, num arquivo novo)

`src/app/api/demandas/leitura-awave-qa.test.ts`: Postgres real, rota real e token `awave` gerado em tempo de teste.

1. 503 do GET com a tabela travada, com o log conferido e o controle de 200 depois da trava (IN-14, Minor da revisão).
2. A demanda cheia e editada por pessoa: as seis chaves exatas, o status atual e o `atualizadaEm` da edição (CA-07.3).
3. Cabeçalhos do 200: `no-store`, `nosniff`, `no-referrer`, JSON e nenhum `access-control-*`.
4. `vistaDaIntegracao` sobre a `DemandaVista` inteira, com controle de que a entrada tem as sentinelas.
5. A origem pela autoria: pessoa com conta `awave` e agente, os dois com solicitante "Awave", dão o 404 igual, byte a
   byte, ao do id inexistente.
6. `lerDemandaPara` chamada direto com `construir` e com uma integração fora da lista (`jarvis`, montada à mão): dá
   `nao_encontrado`. O controle é o `awave` lendo pela mesma função.
7. `lerDemandaPara` com tipo de ator desconhecido lança `Error('ator desconhecido')`, que não é `ErroDominio`.

Os testes não dependem de ordem. Cada um usa a própria demanda (`DEM-20261022-0911` a `0916`, fora da faixa do arquivo
do engenheiro) ou as que ele mesmo cria. A trava é solta com `rollback` no `finally`, e o destino do log volta no
`finally`. Os testes também não dependem do relógio real. As datas vêm de `relogioFixo` e de `AGORA_TESTE`, sem
`Date.now()` nem `new Date()` sem argumento. Nenhuma asserção mede tempo. O 503 é provado pelo código do erro, não por
cronômetro. Os dados são fictícios: "(fictício)", "Pessoa Ficticia", conta `p-qa-t05`, sentinelas `SENTINELA-…-7c4a`,
domínio `sentinela-7c4a.test` e prefixo `ficticio`. O token não vai a arquivo nem a mensagem de `expect`. As
asserções sobre ele são `includes(...)` com `toBe(false)`, que na falha não imprimem o valor.

### Resultado

- `pnpm test src/app/api/demandas/leitura-awave-qa.test.ts`: 7 de 7.
- `pnpm test`: **256 arquivos, 5561 de 5561** testes passaram. Antes eram 255 arquivos e 5554 testes, então entraram 1
  arquivo e 7 testes.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git diff --stat`: vazio, porque nenhum arquivo rastreado mudou nesta etapa. `git status --short` mostra só o arquivo
  novo. Nenhum `.skip`, `.only` ou `.todo`.
- Testes existentes no commit 0a599b5: o único teste do commit é novo (`leitura-awave.test.ts`). Nenhum teste existente
  mudou, e nenhuma asserção saiu ou ficou mais fraca.

## Decisões tomadas

- O teste do 503 trava a tabela inteira (`ACCESS EXCLUSIVE`), como a revisão sugeriu. É o único jeito de fazer o
  `SELECT` simples esperar sem mudar o código. A trava fica numa conexão do migrator e sai no `finally`. O teste custa
  cerca de 2 s, o `lock_timeout` da integração, bem abaixo dos 30 s do Vitest.
- A linha de log do 503 é conferida com `toEqual` inteiro, sem `time` e `ms`. Assim, qualquer campo novo, como o nome
  da integração, falha o teste, e não só o prefixo.
- A demanda cheia foi preenchida por `alterarDemanda`, o caminho real de pessoa. Só as `duvidas_entrada`, que a pessoa
  não edita, vão pelo migrator. A edição usa um relógio uma hora à frente, porque com o relógio da criação o
  `atualizadaEm` não provaria a leitura atual.
- Os novos ficam num arquivo com sufixo `-qa.test.ts`, como na 06-T03 e na 06-T04. O arquivo do engenheiro ficou como
  estava (G5).
- Não testei a regex do id (400 ou 404 antes do banco) nem o 401 de token revogado no GET. A regex é do `rota()`, que
  ficou congelado (G4), e o token revogado é do RF-01 (T03 e T14).
- Glob e Grep não estavam disponíveis nesta sessão. Li com Read os arquivos citados e, para achar arquivos, usei só
  `git log -G` no repositório do pedido.

## Pendências

- Nenhuma bloqueia a passagem.
- Para a T06 (e a 06-T06-testes): o teste "vistaDaIntegracao recebe a DemandaVista inteira…" já prova que a função dá
  seis chaves com a vista inteira. Falta o CA-07.4 pela rota, com as chaves do 201 iguais às do GET, e a troca do
  `throw` de `vistaDaDemandaPara` (`consultas.ts:270-271`) com o ajuste do teste D-01 de `ramos-por-ator.test.ts` (G5).
- Para a T13 (IN-14 transversal): o modelo da trava de tabela deste arquivo serve para as três rotas do `/construir` e
  para o POST do Awave.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261111-0016-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0a599b57002621f8ad6197af8cfbf70ded7c2c04~1 0a599b57002621f8ad6197af8cfbf70ded7c2c04 -- src` — diff do código e do teste, lido por inteiro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "autor_integracao_check" --name-only --format=%h -n 5 -- src/db` — `src/db/schema/demandas.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — HEAD em f775d39 (06-T05-revisao), sobre 0a599b5
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "export async function alterarDemanda" --format=%h -n 2 -- src/modules/demandas/servico.ts` — def1fa7
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/demandas/leitura-awave-qa.test.ts` — 1 arquivo, 7 de 7
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 256 arquivos, 5561 de 5561 (saída lida com Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só o arquivo novo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 0a599b57002621f8ad6197af8cfbf70ded7c2c04~1 0a599b57002621f8ad6197af8cfbf70ded7c2c04` — 5 arquivos: os 3 da T05, a entrega e `passagens.jsonl`

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
