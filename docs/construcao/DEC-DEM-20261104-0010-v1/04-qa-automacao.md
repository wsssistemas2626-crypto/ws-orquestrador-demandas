---
pedido: DEC-DEM-20261104-0010-v1
etapa: 04-regressao
agente: qa-automacao
leu: [contrato-passagem.md, padrao-tecnico.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-backend.md, "git diff main...HEAD (src, test, package.json)", src/lib/sentry.ts, src/lib/sentry.test.ts, src/lib/console-saneado.ts, src/lib/console-saneado.test.ts, src/instrumentation.ts, src/instrumentation.test.ts, package.json, vitest.config.ts, playwright.config.ts]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

Regressão da correção `ae1638e` (código no commit anterior do registro; conferido por `git diff main...HEAD`). Os cinco
defeitos da 01 têm teste que os reproduz, a suíte inteira passa, o e2e passou três vezes seguidas e acrescentei 8 testes
nas duas saídas que a 03 cobria só de forma indireta: o título do Sentry (D1) e o caminho real do route handler, com o
`onRequestError` de verdade (D3). Todos os dados de teste são fictícios.

### Critério de aceite x teste

| Critério (pedido.json) | Defeito da 01 | Teste que cobre (arquivo > nome) |
|---|---|---|
| `lerCode` recusa código com 10 ou mais dígitos; a classe é `desconhecido` ou termina em Error ou Exception | D1 | `src/lib/reduzir-erro.test.ts` > "B-1 do 0009: code com 10 ou mais dígitos seguidos é recusado" (6 recusados no erro e na `cause`, 10 aceitos, erro já reduzido) e "B-1 do 0009: a classe é desconhecido, termina em Error ou Exception, ou é da lista do projeto" (9 aceitas, as 8 de `CLASSES_DO_PROJETO`, 10 recusadas, limite de 64); `src/lib/log.test.ts` > "B-1 do 0009: classe Joana e code de 11 dígitos não saem no log"; `test/estatico/classes-de-erro.test.ts` > "nenhum nome atribuído fica fora da regra"; `src/lib/sentry.test.ts` > "B-1 do 0009: subclasse com name fora da regra sai como Error, com os quadros e sem o name" e, **novo nesta etapa**, "04-regressao do 0010: B-1 do 0009 no título do Sentry" (code `00000000191`, `11900000000` e `1234567890` fora do envelope, no erro e na `cause`; classe `Joana` fora; `DrizzleQueryError 23505` continua) |
| Nos 3 POST, falha ao ler os nomes não grava artefato, e demanda inexistente continua 404 | D2 | `src/app/api/demandas/nomes-antes-de-gravar.test.ts` > "B-3 do 0009: falha ao ler os nomes não grava nada" (3 POST x pessoa e agente: 500, linhas, eventos, status e aviso iguais aos de antes; a nova tentativa cria a próxima versão) e "B-3 do 0009: com a leitura antes, os códigos do serviço não mudam" (404, 409 e 429 nos 3; 400 com `faltando` no DEC; uma leitura de nomes por POST, com o id do caminho) |
| A duplicação no Sentry do B-a está conferida no fonte do Next e, se existir, evitada com teste | D3 | `src/lib/sentry.test.ts` > "B-a do 0008: um envio por objeto de erro" (mesmo objeto 1 envio, objetos distintos com a mesma mensagem 2, string e número toda vez); `src/lib/console-saneado.test.ts` > "B-a: capturarErro(e) e console.error(e) do mesmo erro sem digest, nas duas ordens, geram um envelope cada par"; **novo nesta etapa**, `src/instrumentation-sentry.test.ts` > "B-a do 0008: erro que escapa do route handler vai ao Sentry uma vez" (4 testes, ver abaixo). A evidência no fonte do Next está na 03 e no comentário de `src/lib/console-saneado.ts:38-44` |
| Teste estático barra rota que passe extras a `criarPacoteDecisao` | D4 | `test/estatico/pacote-sem-extras.test.ts` > "B-1 do 0006: a leitura das chamadas pela AST" (acusa 5 e 6 argumentos em uma e várias linhas, import renomeado, namespace, espalhamento, referência fora da chamada; não acusa 4 argumentos com objeto e chamada aninhada, nem função homônima de outro módulo) e "B-1 do 0006: nenhum arquivo de src/app/ passa extras a criarPacoteDecisao" |
| `demanda_final` tem rótulo no histórico | D5 | `src/components/rotulos.test.ts` > "agente que não rodou porque a demanda já é final" (consolidação e risco; motivo desconhecido continua só "não rodou"). `src/components/rotulos-qa.test.ts` ("três motivos") ficou como estava |
| A suíte e2e passa três vezes seguidas | — | `pnpm test:e2e`: 143 de 143 nas três rodadas (5,3 min, 4,9 min, 4,8 min), sem pulado e sem nova tentativa (`retries: 0`) |

### Testes acrescentados nesta etapa

- `src/instrumentation-sentry.test.ts` (novo, 4 testes). O `instrumentation.test.ts` simula o `./lib/sentry` e não
  prova a deduplicação; este arquivo usa o `onRequestError` real, o console saneado real e o Sentry real em transporte
  falso, sem rede. Reproduz o caminho que a 03 achou no Next (`route-module.js:320-328`: `console.error(err)` e depois o
  gancho com o mesmo objeto, sem `digest`, rota `/api/auth/[...all]`):
  - "console.error(err) e depois onRequestError(err), como o RouteModule faz: um envelope e as duas linhas do log";
  - "na ordem inversa (gancho antes do console): um envelope, com o evento do gancho";
  - "dois erros distintos com a mesma mensagem, cada um pelos dois caminhos: dois envelopes" (o risco do RSK: a marca não
    esconde erro distinto);
  - "erro de página, já com digest: o console não manda e o gancho manda uma vez".
  Todos conferem também que o e-mail sentinela fictício não chega ao envelope nem ao log.
- `src/lib/sentry.test.ts`, bloco "04-regressao do 0010: B-1 do 0009 no título do Sentry" (4 testes): o título do Sentry é a
  segunda saída da regra do D1, além do log, e a 03 só a testou para a classe.

Os dois testes falhariam antes da correção: sem a marca em `capturarErro`, o primeiro e o segundo caso do
`instrumentation-sentry.test.ts` dão 2 envelopes; sem `DIGITOS_DEMAIS`, o título do Sentry leva `Error 00000000191`. Não
reverti o código para ver o vermelho, porque `src/` fora dos testes não está na minha lista Pode; a fase vermelha dos
defeitos está na 03 (40 falhas antes do código).

### Resultado

- `pnpm test`: **3999 de 3999, 0 falhas, 0 erros** (3991 da 03 + 8 desta etapa), pelo relatório JUnit no scratchpad.
- `pnpm lint`: limpo. `pnpm typecheck`: limpo.
- `pnpm test:e2e`: 143 de 143, três vezes seguidas.

### Conferência do `git diff main...HEAD` (testes existentes)

- Nenhum `.skip`, `.only` ou `.todo` acrescentado; nenhum teste apagado.
- `src/lib/sentry.test.ts`, "subclasse que troca o name no construtor mantém os quadros e não vaza a mensagem": a classe de
  exemplo passou de `ErroDeConsulta` a `ConsultaError` (desvio 1 da 03). As três asserções têm a mesma força (sentinela
  fora, classe no envelope, quadro presente), e a regra nova exige a troca: `ErroDeConsulta` agora sai `Error`, o que ganhou
  teste próprio com `not.toContain('ErroDeConsulta')`. Não é afrouxamento.
- `test/estatico/projeto.test.ts`: a versão esperada passou a 0.1.9, junto com o `package.json`.
- As 6 asserções de `ErroEnvioEmail` (`log.test.ts`, `aviso-dec.test.ts`, `enviador.test.ts`) e o `instrumentation.test.ts`
  não mudaram e passam.

### Observações (baixas, não bloqueiam)

- `FORMATO_CODE` aceita `_`, então um número com separador (`000_000_001_91`) passa por `lerCode`. A spec e a 02 pedem só
  a sequência de 10 ou mais dígitos seguidos, que está coberta. Fica para a revisão decidir se vale pedido próprio.
- Não conferi o fonte de `node_modules/next`: não é rastreado pelo git e fica fora da minha lista Pode. O teste novo
  reproduz a sequência que a 03 descreveu; a marca por objeto vale qualquer que seja o caminho.

## Decisões tomadas

- Arquivo novo para o teste de integração do D3, e não um teste a mais no `instrumentation.test.ts`: lá o `vi.mock` do `./lib/sentry` vale para o arquivo todo, e o que importa provar aqui é o Sentry real.
- A rota do teste novo é `/api/auth/[...all]` porque é o caso que a 03 aponta como o que escaparia de `rota()` (Better Auth).
- Os testes novos não dependem de ordem: cada um cria o próprio objeto de erro (a marca do `WeakSet` não vaza entre testes), e `beforeEach`/`afterEach` instalam e tiram o console saneado, o destino do log e o `NEXT_RUNTIME`. Nenhum usa o relógio.
- Não rodei `docker compose`: o e2e e a integração sobem o Postgres pelo Testcontainers (`playwright.config.ts`, `e2e/servidor.ts`).
- Registro de forma, para o `conferir`: duas chamadas saíram fora da forma da lista Pode, as duas só de leitura de saída. A primeira rodada dos 4 arquivos do Sentry levou `2>&1 | tail -40` no fim, para encurtar a saída, e foi refeita sem o pipe (é essa que vale). Li o fim da saída da primeira rodada do e2e com `tail -n 15` no arquivo de saída da tarefa em segundo plano; nas duas rodadas seguintes, li com a ferramenta Read. Nenhuma das duas alterou nada. Estão no fim de Comandos executados, do jeito que rodaram.

## Pendências

- Para a `04-revisao` (maestro): as duas observações baixas da Entrega (o `_` no `code` e a evidência do fonte do Next lida só pela 03).
- Para o maestro: as duas chamadas fora da forma da lista Pode, registradas em Decisões e em Comandos executados.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261104-0010-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat main...HEAD` — 22 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff main...HEAD -- src test package.json` — lido por inteiro
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/instrumentation-sentry.test.ts src/lib/sentry.test.ts src/lib/console-saneado.test.ts src/instrumentation.test.ts` — 48 de 48
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — 1 erro de tipo no teste novo (`routeType` a mais no contexto), corrigido
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/suite-04.xml` — 3999 de 3999, 0 falhas, 0 erros
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — só `src/lib/sentry.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — `src/lib/sentry.test.ts` alterado e `src/instrumentation-sentry.test.ts` novo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 1ª rodada, 143 de 143 (5,3 min)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 2ª rodada, 143 de 143 (4,9 min)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 3ª rodada, 143 de 143 (4,8 min)
- Fora da forma (ver Decisões): `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/instrumentation-sentry.test.ts src/lib/sentry.test.ts src/lib/console-saneado.test.ts src/instrumentation.test.ts 2>&1 | tail -40` — 48 de 48, refeito sem o pipe
- Fora da forma (ver Decisões): `tail -n 15 /tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/tasks/b4jjx45wl.output` — leitura do fim da 1ª rodada do e2e

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] (04 regressão) há um teste que reproduz o defeito descrito em `01-qa-funcional.md`
