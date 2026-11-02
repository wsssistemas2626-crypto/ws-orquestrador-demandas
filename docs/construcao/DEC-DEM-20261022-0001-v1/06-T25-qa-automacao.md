---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T25-testes
agente: qa-automacao
leu: [contrato-passagem.md, pedido.json, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6, T24 e T25), 01-analista-requisitos.md (RF-16 a RF-20 e RNF), 02-arquiteto-solucoes.md (ADR-07 e ADR-08), 04-seguranca-aplicacao.md (2.9, 2.17, C-21 a C-27), 06-T25-engenheiro-backend.md, 06-T25-tech-lead.md, 06-T24-qa-automacao.md, git show c5f1b92, src/modules/agentes/provedor.ts, src/modules/agentes/provedor.test.ts, test/provedor-falso.ts, test/sentinelas.ts, test/estatico/variaveis.test.ts, src/modules/agentes/entrada-agente.ts (linhas 1 a 110), src/modules/agentes/uso.ts, src/modules/demandas/servico.bordas.test.ts, vitest.config.ts, tsconfig.json, package.json]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T25, sobre o commit `c5f1b92`. **O código cumpre todos os critérios da tarefa.** Os 33 testes do engenheiro
passam e não mudaram. Acrescentei 14 testes de borda em `provedor.test.ts`. A suíte inteira está verde, com lint e
typecheck limpos.

Na primeira rodada da suíte inteira apareceu um teste instável de uma tarefa anterior (T15). Ele foi corrigido nesta
etapa, sem afrouxar asserção, e a segunda rodada saiu limpa. Achei também um limite do provedor diante de resposta 200
malformada. Não é critério da T25 e fica em Pendências, para a T27 e a 08.

### Critério da tarefa → teste que o cobre

Todos os testes estão em `src/modules/agentes/provedor.test.ts`, salvo o de C-27.

| Critério | Teste |
|---|---|
| ADR-08 (interface injetável; real só com a chave; falso nos testes) | `CA-16.5: sem ANTHROPIC_API_KEY a fábrica devolve null`; `chave vazia ou só com espaços também devolve null`; `com a chave, devolve um ProvedorAnthropic`; `o provedor da fábrica usa a chave recebida e vai ao endereço fixo, numa chamada só` (novo); `ProvedorFalso`: `devolve as respostas na ordem…` e `sem resposta na fila, falha alto…` |
| ADR-08 (falha vira `ErroProvedor` com dois tipos) | `%i do provedor vira ErroProvedor autenticacao, numa chamada só` (401, 403); `%i do provedor vira ErroProvedor transitorio, sem nova tentativa do SDK` (429, 500, 503, 529, 400, 404); `falha de rede vira ErroProvedor transitorio`; `o sinal de quem chama encerra a chamada como transitorio`; `sinal já abortado antes de chamar vira transitorio, sem requisição` (novo) |
| ADR-08 (o erro não vaza nada para log ou Sentry) | `o erro não leva o corpo da resposta, a mensagem do provedor nem a chave, e não guarda a causa` (500); `%i com o texto e a chave no corpo do erro: o ErroProvedor autenticacao não leva nenhum dos dois` (401 e 403, novo); `falha de rede: uma chamada só (o SDK não repete), e o erro não leva a mensagem nem a causa` (novo); `resposta 200 %s não vira sucesso, e o erro não leva o corpo` (3 casos, novo) |
| C-24 (sem `tools`, `tool_choice` nem MCP; `max_tokens` ≤ 8.000) | `C-24: o corpo enviado não tem tools, tool_choice nem mcp_servers, e max_tokens ≤ 8.000`; `C-24: o corpo tem só model, max_tokens, system e messages…`; `chave extra no pedido (ex.: tools vindo por engano) não chega ao corpo enviado`; `C-24 (tipo): PedidoAoProvedor não aceita tools; se a interface ganhar o campo, o typecheck quebra aqui` (novo, com `@ts-expect-error`) |
| C-24 (`maxTokens` por agente de no máximo 8.000) | `maxTokens %s é recusado antes de chamar` (5 casos); `maxTokens de exatamente 8.000 é aceito`; `MAX_TOKENS_TETO é 8.000` |
| C-24 (texto do cliente depois das instruções, num bloco delimitado) | `C-24: o bloco do montador vai inteiro e sozinho na mensagem do usuário, e as instruções vão em system, sem o texto do cliente` (novo, com o `delimitarComoDado` da T24 e um `</dados>` injetado) |
| CA-16.5 (suíte sem chave, nenhuma chamada de rede ao provedor real) | `CA-16.5: a suíte não tem a chave definida`; `CA-16.5: criar o provedor, pela fábrica ou direto, não faz chamada de rede` (novo, com `fetch` global espionado); todos os testes usam `fetch` falso |
| RNF-06 (120 s por chamada; a nova tentativa é da T27) | `RNF-06: sem resposta, a chamada é encerrada aos 120 s como transitorio, e não antes` (relógio falso do Vitest); `%i (que o SDK repetiria por padrão) sai numa chamada só, como transitorio` (408 e 409, novo); `x-should-retry: true na resposta não faz o SDK repetir a chamada` (novo) |
| RNF-14 (zero chamada real) | os mesmos de CA-16.5; `vai sempre para https://api.anthropic.com/v1/messages…, mesmo com ANTHROPIC_BASE_URL e ANTHROPIC_AUTH_TOKEN no ambiente` |
| C-21 (log do SDK) | `C-21: com ANTHROPIC_LOG=debug no ambiente, o SDK não escreve nada no console` |
| C-27 (nome da chave só nos arquivos permitidos) | `test/estatico/variaveis.test.ts`: `variáveis de segredo só nos arquivos permitidos` e `a regra recusa os lugares errados`. Passam com `provedor.ts` na lista e o nome fora de qualquer outro arquivo de `src/` |

### Testes acrescentados (14, num `describe` novo no fim de `provedor.test.ts`)

`ProvedorAnthropic e criarProvedor: bordas (06-T25-testes)`, com `afterEach(vi.unstubAllGlobals)` próprio:

1. `C-24 (tipo): PedidoAoProvedor não aceita tools…`. O `@ts-expect-error` faz o `pnpm typecheck` quebrar se a
   interface ganhar `tools`. O typecheck limpo mostra que a diretiva está em uso.
2. `C-24: o bloco do montador vai inteiro e sozinho na mensagem do usuário…`. Fecha a ponta da T24 com a T25. O corpo
   leva o bloco exato, que começa por `INSTRUCAO_DO_BLOCO` e tem um `</dados>` só. O `system` não leva o texto do cliente.
3. `CA-16.5: criar o provedor, pela fábrica ou direto, não faz chamada de rede`.
4. `o provedor da fábrica usa a chave recebida e vai ao endereço fixo, numa chamada só`. É o único teste que passa
   pelo `fetch` padrão do SDK, posto no lugar com `vi.stubGlobal`. Os testes do engenheiro sempre injetam o `fetch`.
5. `falha de rede: uma chamada só…`. O SDK repete erro de conexão por padrão. O teste prende o `maxRetries: 0` também
   nesse caminho, que o teste do engenheiro não contava.
6. e 7. `401` e `403` com o sentinela e a chave no corpo do erro. O teste do engenheiro só cobria o caminho do 500.
8. e 9. `408` e `409`, que o SDK repete por padrão, numa chamada só.
10. `x-should-retry: true` não faz o SDK repetir.
11. `sinal já abortado antes de chamar vira transitorio, sem requisição`. É o caso da T27 desligando o worker antes da
    chamada. Nenhuma requisição sai.
12. a 14. `resposta 200 %s não vira sucesso, e o erro não leva o corpo` (HTML, sem `usage`, sem `content`). Prendem só
    o que o código garante hoje (ver Pendências).

### Teste instável corrigido (T15)

- **Arquivo e teste:** `src/modules/demandas/servico.bordas.test.ts`, `CA-06.3: demanda inexistente → 404 com a
  mensagem padrão, sem o id pedido`. O teste é da `06-T15-testes`, commit `6241360`.
- **Sintoma:** na 1ª rodada da suíte inteira, os 2309 testes passaram, mas o Vitest acusou `Unhandled Rejection`
  (`ErroDominio: nao_encontrado` em `travarDemanda`) e o `pnpm test` saiu com código 1. A saída também mostrou
  `PromiseRejectionHandledWarning`.
- **Causa:** as duas promessas (`obterDemanda` e `alterarDemanda`) eram criadas juntas no literal do array. O laço
  esperava a primeira. Se a segunda rejeitasse antes, não havia quem a tratasse. Depende da carga da máquina, e por
  isso o engenheiro e o tech-lead viram a suíte verde.
- **Correção:** o array passou a ter funções, e cada chamada só começa quando o laço chega nela. As três asserções
  ficaram iguais. A 2ª rodada da suíte saiu sem erro e com código 0.

### Resultado

- `provedor.test.ts` isolado: **47 de 47** (33 do engenheiro e 14 novos), em duas rodadas seguidas.
- `servico.bordas.test.ts` isolado: 13 de 13.
- `pnpm test`, 2ª rodada: 117 arquivos, **2309 de 2309** (2295 da revisão e 14 novos), 0 falhas e 0 erros.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git diff --stat`: 2 arquivos de teste, com 126 linhas acrescentadas e 2 removidas. As 2 removidas são o laço do
  CA-06.3, trocado como descrito acima. Nenhum `.skip`, `.only` ou `.todo`, e nenhuma asserção afrouxada.
  `provedor.test.ts` só ganhou linhas: um `import` novo e o `describe` novo.

### Estabilidade e relógio

- Os testes novos não usam relógio, nem real nem falso, e não dependem de outro teste.
- Cada teste monta o próprio `fetch` falso.
- O `vi.stubGlobal` é desfeito no `afterEach` do `describe`. O `vi.unstubAllEnvs` e o `vi.useRealTimers` do arquivo
  continuam valendo.
- Nenhum teste define `ANTHROPIC_API_KEY` no ambiente (G3.3). A chave aparece só como argumento da fábrica, com o
  valor fictício do arquivo.

## Decisões tomadas

- **Pronto, sem devolução.** Razão: cada critério da T25 tem teste e passa. O limite da resposta 200 malformada não
  fere nenhum critério da tarefa. O host é fixo, e `registrarUso` (T23) já recusa token que não é inteiro, o que impede
  custo `NaN` no teto.
- **Corrigi o teste instável da T15 aqui, em vez de só registrar.** Razão: ele fazia o `pnpm test` sair com código 1
  conforme a carga. Teste intermitente se resolve na hora. A correção só muda quando a chamada começa e mantém as
  asserções.
- **Os testes da resposta 200 malformada conferem só "não vira sucesso, sem vazar o corpo".** Razão: exigir
  `ErroProvedor` faria o teste falhar hoje. Exigir `TypeError` prenderia um comportamento que a T27 ou a 08 devem poder
  mudar.
- **Não testei o `trim` da chave pela fábrica com espaços em volta de uma chave válida.** Razão: o `Headers` do fetch
  já tira os espaços das pontas, e o teste passaria sem o `trim`. O `trim` que importa, o de `'   '` dar `null`, já tem
  teste.
- **Não pus `ANTHROPIC_API_KEY` no ambiente para provar que a fábrica não lê `process.env`.** Razão: G3.3 proíbe
  definir a chave no teste. A fábrica recebe o ambiente por parâmetro, e o teste `a suíte não tem a chave definida`
  basta.
- **Dados só fictícios.** A chave é `chave-ficticia-de-teste`, os sentinelas vêm de `test/sentinelas.ts` e o host
  desviado é `.test`.

## Pendências

- **Para a T27 (`engenheiro-backend`) e a `08-revisao` (`seguranca-aplicacao`), Minor:** uma resposta 200 fora do
  envelope não vira `ErroProvedor`. Reproduzido com sondas nesta etapa, que não ficaram na suíte.
  - Corpo em HTML, sem `content` ou sem `usage`: o provedor lança `TypeError` cru (`Cannot read properties of
    undefined`), fora do conjunto `autenticacao | transitorio`. A entrega e a revisão dizem que todo erro sai como
    `ErroProvedor`, e isso não vale nesse caso.
  - `usage: {}`, tokens como texto (`'10'`) ou sem `model`: `gerar` **resolve** com `tokensEntrada` e `tokensSaida`
    `undefined` (ou texto) e `modelo` `undefined`, contra o tipo `RespostaDoProvedor`. Hoje o `registrarUso` lança
    `RangeError` e segura o teto. Só que a chamada paga fica sem linha de uso.
  - Sugestão: a T27 trata qualquer erro que não seja `ErroProvedor` como falha, sem contar com o tipo. Ou a 08 pede
    que o `ProvedorAnthropic` confira o envelope (`content` em lista, tokens inteiros, `model` texto) e devolva
    `ErroProvedor('transitorio')` com os tokens que houver. O host é fixo em `api.anthropic.com`, e por isso o nível é
    Minor.
- **Para o `tech-lead`, só registro:** corrigi `servico.bordas.test.ts` (T15), fora dos arquivos da T25, como descrito
  na Entrega. Não sei se há o mesmo padrão (promessas criadas juntas e esperadas uma a uma) em outros arquivos de
  teste. As duas rodadas da suíte só mostraram este. Sem busca no repositório pelo Bash, a varredura completa fica para
  a 08.
- Seguem abertos, sem mudança: os Minor 1 e 2 da `06-T25-revisao`, para a T27; o aviso do undici "Using `patch`",
  aberto desde a `06-T23-revisao`, que não vem da T25; e as pendências da `06-T24-testes` para a 08.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat c5f1b922105b312fc683cd133d396b8fe059414a` — 5 arquivos: provedor.ts, provedor.test.ts, provedor-falso.ts, entrega e registro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show c5f1b922105b312fc683cd133d396b8fe059414a` — diff completo da T25
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:docs/construcao/DEC-DEM-20261022-0001-v1/` — arquivos da pasta do pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:docs/` — construcao/ e superpowers/
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:docs/superpowers/plans/` — o plano
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/agentes/provedor.test.ts --stat` — o arquivo de teste no HEAD, antes dos acréscimos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/agentes/provedor.test.ts` — com 2 sondas de resposta 200 malformada: 44 passaram e as 2 sondas falharam (TypeError)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/agentes/` — arquivos do módulo, para achar `uso.ts`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/agentes/provedor.test.ts` — com 6 sondas: 44 passaram; 3 sondas com TypeError e 3 que resolveram (a promessa não falhou)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/agentes/provedor.test.ts` — sondas trocadas pelos 3 testes finais: 47 de 47
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/agentes/provedor.test.ts` — 2ª rodada: 47 de 47
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 117 arquivos, 2309 de 2309, mas 1 Unhandled Rejection vindo de `servico.bordas.test.ts` (CA-06.3) e código de saída 1
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --format=%h%x20%s -3 -- src/modules/demandas/servico.bordas.test.ts` — só o 6241360 (06-T15-testes)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/servico.bordas.test.ts` — depois da correção: 13 de 13
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 117 arquivos, 2309 de 2309, 0 erros, código de saída 0
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 2 arquivos de teste, 126 linhas acrescentadas e 2 removidas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff src/modules/demandas/servico.bordas.test.ts` — só o laço do CA-06.3, com as asserções iguais

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
