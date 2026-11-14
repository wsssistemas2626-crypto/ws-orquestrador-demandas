---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T02-construcao
agente: engenheiro-backend
leu: [pedido.json, contrato-passagem.md, tarefas.json, 2026-11-13-ws-orquestrador-demandas-sobras-plano.md (G0 a G10, T01 e T02), 06-T01-engenheiro-backend.md, 06-T01-tech-lead.md, 06-T01-qa-automacao.md, src/modules/pedido-construcao/pendentes.ts, src/modules/pacotes-decisao/substituido.ts, src/lib/rota.ts, src/modules/integracoes/tempo-limite.ts, src/db/transacao.ts, src/modules/andamento/registrar.ts, src/app/api/pedidos-construcao/[decId]/andamento/route.ts, src/app/api/pedidos-construcao/andamento.test.ts, src/app/api/pedidos-construcao/andamento-422.test.ts, src/modules/andamento/registrar.test.ts (trecho), src/modules/andamento/registrar-prazo.test.ts, src/modules/pacotes-decisao/substituicao.test.ts (trecho), src/modules/pedido-construcao/gerar-substituido.test.ts (trecho), src/modules/acesso/resolver-ator.ts, src/modules/acesso/tokens-servico.ts (validarTokenServico), src/lib/sentry.ts (capturarErro), test/pedidos-construcao.ts, test/andamento.ts, test/integracoes.ts, test/deps.ts, test/banco.ts, test/requisicao.ts, test/transversal/sentinelas-andamento.test.ts, test/estatico/situacao.test.ts, test/estatico/situacao-qa.test.ts, test/estatico/piso-de-assercoes.test.ts, saída do pnpm test em /tmp]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T02: serviço `situacaoDoPedido` e rota `GET /api/pedidos-construcao/[decId]/situacao` (RF-01; CA-01.1 a CA-01.6;
SB-01 c, SB-02 a SB-06; ADR-36).

**Arquivos criados**
- `src/modules/pedido-construcao/situacao.ts`: `SITUACOES_DO_PEDIDO`, `SituacaoDoPedido`, `DepsSituacao` e
  `situacaoDoPedido`, como no plano. Primeiro vem `autorizar(ator, 'ler_situacao_pedido')`, antes de abrir conexão.
  Depois, `executarComOrcamento(deps.pool, ator, 'padrao', undefined, …)` sem parâmetro `t`, nesta ordem:
  `pedidoGeradoPorPessoa` (senão, 404), a demanda do DEC igual à do evento (senão, o mesmo 404) e `aprovadoVigente`,
  que dá `vigente` ou `substituido`. Não tem trava, SET, evento nem log próprio.
- `src/app/api/pedidos-construcao/[decId]/situacao/route.ts`: `export const GET = rota({ acao: 'ler_situacao_pedido',
  rota: '/api/pedidos-construcao/[decId]/situacao', params: paramId.versao('decId', 'DEC') }, …)`. O corpo é montado
  chave a chave, `{ json: { situacao } }`.

**Arquivos alterados**
- `test/pedidos-construcao.ts`: a chamada `situacao(decId, op?)` entrou em `chamadasDoConstruir`. É um GET com Bearer e
  `accept: application/json`, sem `Origin`, sem cookie e sem corpo. Também entrou o import da rota.
- `test/estatico/situacao.test.ts`: os blocos SB-03/SB-04 e SB-06 do plano, copiados ao pé da letra. O que já existia
  não mudou.
- `test/estatico/piso-de-assercoes.test.ts`: `test/estatico/situacao.test.ts` sobe de 8 para 17. Entram quatro arquivos
  novos, com o comentário de origem da T02: `src/modules/pedido-construcao/situacao.test.ts: 29`,
  `src/app/api/pedidos-construcao/situacao.test.ts: 48`, `src/app/api/pedidos-construcao/situacao-403.test.ts: 11` e
  `test/transversal/sentinelas-situacao.test.ts: 14`. Nenhum valor desceu.

**Testes criados** (tempo de cada arquivo rodando sozinho)
- `src/modules/pedido-construcao/situacao.test.ts`: 18 testes, 12,1 s. Cobre os dois valores do enum e o CA-01.1. O
  CA-01.2 é coberto duas vezes: com o v2 de dupla aprovação (parcial e depois completa) e com o v2 só do cto. Cobre
  também o SB-02 (d): o substituído não vira 404, e o vigente de demanda encerrada ou entregue continua vigente. O
  CA-01.3 e o SB-02 (a, c) dão o mesmo erro, com a mesma forma serializada, para o DEC inexistente, sem pedido, com
  `pedido_gerado` de agente, de sistema e de pessoa noutra demanda. Pelo SB-02 (b) e pela D-07, os quatro primeiros
  casos fazem o mesmo número de consultas, contado com `vi.spyOn(pg.Client.prototype, 'query')`. O SB-03 (d) prova que
  a leitura responde `vigente` com a trava do pedido e a da demanda seguradas por outra transação. O SB-04 (CA-01.6)
  prova que o prazo vencido dá `indisponivel`. O SB-01 no serviço nega awave, os quatro agentes, os dois papéis e o
  sistema sem chamar `connect`. O retrato de `evento`, `andamento_construcao`, `pacote_decisao`, `decisao` e da demanda
  sai igual em cada caso (CA-01.5).
- `src/app/api/pedidos-construcao/situacao.test.ts`: 10 testes, 13,1 s. A rota exporta só `GET`, com o `meta` certo.
  O 200 sai byte a byte (`{"situacao":"vigente"}` e `{"situacao":"substituido"}`), com JSON, `no-store`, `nosniff` e
  sem `access-control-*`. O CA-01.2 também passa pela rota. Os 404 de quatro casos são iguais byte a byte ao 404 do
  inexistente desta rota, da entrega e do andamento. `DEC-xyz` dá 404 sem `connect` nem `query`. O CA-01.4 dá 403 para
  awave, agentes, cto e administradora, e 401 sem credencial. O CA-01.5 confere 200, 403, 404 e 503 sem gravar nada. O
  SB-06 ("se e só se" com o 409 `decSubstituido` do andamento) passa nos três estados: vigente, v2 parcial e v2
  completo. O log (RNF-04, SB-05) sai com uma linha por chamada e as chaves da lista, sem id, prefixo, `wsod_` nem
  situação.
- `src/app/api/pedidos-construcao/situacao-403.test.ts`: 9 testes, 9,4 s. Usa o serviço trocado por um que falha se
  chamado (D-07). O 403 sai igual para DEC existente e inexistente, para cada um dos 7 atores, sem chamar o serviço e
  sem gravar evento. O caso de controle mostra que o token `construir` chega ao serviço trocado (500).
- `test/transversal/sentinelas-situacao.test.ts`: 1 teste, 14,5 s. Chama com DEC vigente, substituído, inexistente e
  de outra demanda, e provoca um 5xx com o id do DEC e `relation "evento" does not exist` na mensagem. Nenhum id de DEC,
  `wsod_`, prefixo, token nem texto depois do prefixo aparece no pino, no console ou no Sentry. O texto do erro não
  chega ao Sentry.

**Teste visto falhando antes do código** (`pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pedido-construcao/situacao.test.ts src/app/api/pedidos-construcao/situacao.test.ts src/app/api/pedidos-construcao/situacao-403.test.ts test/estatico/situacao.test.ts test/transversal/sentinelas-situacao.test.ts --reporter=dot`):

```
 FAIL  src/modules/pedido-construcao/situacao.test.ts [ src/modules/pedido-construcao/situacao.test.ts ]
Error: Cannot find module '../src/app/api/pedidos-construcao/[decId]/situacao/route' imported from .../test/pedidos-construcao.ts
 FAIL  test/estatico/situacao.test.ts > situacao.ts: só leitura, sem trava e com o prazo total (SB-03, SB-04) > nenhum SET, transação própria, Promise.all nem trava; executarComOrcamento uma vez, com undefined
Error: ENOENT: no such file or directory, open '.../src/modules/pedido-construcao/situacao.ts'
 FAIL  test/estatico/situacao.test.ts > SB-06: só a rota nova importa o serviço da situação > no código que roda, quem importa pedido-construcao/situacao é só a route.ts nova
AssertionError: expected [] to deeply equal [ Array(1) ]
 Test Files  5 failed (5)
      Tests  2 failed | 5 passed (7)
```

As quatro suítes de banco falharam na carga, porque o módulo e a rota ainda não existiam. Os dois blocos novos do
estático falharam também.

**Resultado depois do código**
- Mesmo comando: 5 de 5 arquivos, 45 de 45 testes.
- `pnpm test` inteiro (em segundo plano): **356 de 356 arquivos, 7866 de 7866 testes**, 0 falhas, 199,9 s. Nenhuma das
  instabilidades conhecidas apareceu.
- `pnpm lint` e `pnpm typecheck` limpos, rodados de novo depois da última edição.
- `git diff --stat`: só três arquivos rastreados mudaram, `test/estatico/piso-de-assercoes.test.ts`,
  `test/estatico/situacao.test.ts` e `test/pedidos-construcao.ts`. Os seis arquivos novos não aparecem no stat. Nenhuma
  superfície congelada da G4 foi tocada, e `pendentes.ts`, `registrar.ts`, `rota.ts` e `tempo-limite.ts` ficaram sem
  mudança.

**Desvios do plano:** três, todos dentro dos testes novos e sem mudar a regra. Detalhe em Decisões.

## Decisões tomadas

- **SB-04, relógio monotônico de 3 s em vez de 1 s.** O molde de `registrar-prazo.test.ts` soma 1.000 ms a cada leitura
  do relógio. A situação faz só três consultas, e com esse passo o prazo de 8 s não vence: a leitura terminaria com
  `vigente`. Com 3.000 ms por leitura, o prazo vence antes da primeira consulta, e a resposta é `indisponivel`. É o
  mesmo mecanismo, só com um passo maior.
- **5xx da sentinela pela falha do `connect` só na transação.** O plano sugere
  `vi.spyOn(deps.pool, 'connect').mockRejectedValueOnce(...)`. Só que o `pool.query` do `pg`, usado pela consulta do
  token em `resolverAtor`, chama `this.connect(callback)`. Com o mock, a primeira chamada ao `connect` seria a do token,
  e a requisição ficaria presa. A troca faz o seguinte: chamada com callback segue para o `connect` de verdade, e
  chamada sem argumento (a de `comTransacao`) rejeita com a mensagem plantada. O espião sai no `finally`.
- **Texto do Postgres no Sentry, procurado sem aspas.** No envelope serializado, as aspas de `relation "evento"` saem
  escapadas, e a busca pelo texto inteiro passaria em falso. Por isso o teste procura `does not exist` e
  `falha fictícia`.
- **SB-06 em três estados.** Entrou o v2 de dupla aprovação parcial, além do vigente e do v2 completo do plano. Cada
  estado usa um DEC próprio, porque o andamento devolve 204 para o mesmo estado (`mesmoEstado`) antes de conferir se o
  DEC é vigente. Um segundo envio no mesmo DEC esconderia o 409.
- **403 com o serviço trocado.** O DEC com pedido vem do `preparadorDePedidos` (gerarPedido), e não do migrator, porque
  esse caminho não passa pelo módulo trocado. A lista de atores é montada na coleta, e as credenciais nascem no
  `beforeAll`, para o `it.each` ter nome por ator.
- **`retrato` e `foto` repetidos nos arquivos.** Cada arquivo tem a própria cópia, como nos testes do andamento. O
  `test/pedidos-construcao.ts` só ganhou a chamada que o plano lista.
- **Testes de guarda que já nasceram verdes (G3.1):** os quatro casos da T01 em `test/estatico/situacao.test.ts` e o
  caso "as regras pegam o caso plantado" do bloco novo. Eles não dependem do código novo. Os outros dois blocos novos
  falharam antes do código.
- **Contagem do piso pelo próprio teste.** A regra desta passagem não libera `grep | wc`. Pus um valor alto
  provisório, rodei o teste do piso e li o número real na mensagem de falha (`expected N to be greater than or equal`).
  Depois gravei esses números.

## Pendências

- O total da suíte (7866) passa em 53 testes os 7813 da `06-T01-testes`. Esta tarefa acrescenta 45: 41 casos novos e 4
  entradas novas no piso. Não investiguei a diferença de 8. Nenhum arquivo falhou e nenhum foi pulado.
- O comando completo da G4 (`git diff 41108ee -- …`) não está na regra desta passagem. Rodei só `git diff --stat` e o
  `git diff` do piso. Nenhum dos arquivos rastreados que mudaram é superfície congelada. A revisão e a 08 rodam a G4.
- O `ls` da pasta do pedido e do repositório (três chamadas, só leitura) está na lista **Pode** do agente, mas não na
  regra de comando desta passagem. Sem Grep e Glob nesta sessão, usei `ls` para achar os arquivos de molde. As chamadas
  estão declaradas abaixo para o maestro decidir.
- `git -C <repo> grep` (quatro chamadas, só leitura) também está na lista **Pode** do agente e fora da regra desta
  passagem. Usei para ler o `criarPool`, a validação do token, o `capturarErro` e as referências do esquema de decisão.
- O `pedido.json` não traz instrução para o agente. Nada a registrar.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0018-v1` — fora da regra da passagem (Pendências)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "references\|usuarioId" -- src/db/schema/decisao.ts` — fora da regra da passagem (Pendências)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "cto_e_administradora" -- src/modules/pedido-construcao src/modules/andamento test` — fora da regra da passagem (Pendências)
- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/app/api/pedidos-construcao` — fora da regra da passagem (Pendências)
- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/modules/andamento /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/modules/pedido-construcao /home/deploy/servidor/projetos/ws-orquestrador-demandas/test /home/deploy/servidor/projetos/ws-orquestrador-demandas/test/transversal` — fora da regra da passagem (Pendências)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export async function validarTokenServico" -A 30 -- src/modules/acesso/tokens-servico.ts` — falhou (opção depois do padrão), sem efeito
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A 30 "export async function validarTokenServico" -- src/modules/acesso/tokens-servico.ts` — fora da regra da passagem (Pendências)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "start\|new PgBoss\|export async function criarFila\|supervise\|schedule" -- src/lib/fila.ts` — fora da regra da passagem (Pendências)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export" -- test/sessao.ts test/banco.ts src/modules/versoes.ts src/lib/erros.ts` — fora da regra da passagem (Pendências)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A 14 "export function criarPool" -- src/db/index.ts` — sem saída; fora da regra da passagem (Pendências)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "criarPool\|statement_timeout\|on('connect'" -- src/db/index.ts` — fora da regra da passagem (Pendências)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A 25 "export function capturarErro" -- src/lib/sentry.ts` — fora da regra da passagem (Pendências)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pedido-construcao/situacao.test.ts src/app/api/pedidos-construcao/situacao.test.ts src/app/api/pedidos-construcao/situacao-403.test.ts test/estatico/situacao.test.ts test/transversal/sentinelas-situacao.test.ts --reporter=dot` — antes do código: 5 arquivos falharam (2 testes falharam, 5 passaram)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pedido-construcao/situacao.test.ts src/app/api/pedidos-construcao/situacao.test.ts src/app/api/pedidos-construcao/situacao-403.test.ts test/estatico/situacao.test.ts test/transversal/sentinelas-situacao.test.ts --reporter=dot` — depois do código: 45 de 45
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/piso-de-assercoes.test.ts --reporter=dot` — com o valor provisório: 5 falhas que mostraram as contagens (17, 29, 48, 11, 14)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — em segundo plano: 356 de 356 arquivos, 7866 de 7866 testes; saída lida com Read em /tmp
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 3 arquivos rastreados, todos de teste
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- test/estatico/piso-de-assercoes.test.ts` — só a subida de 8 para 17 e acréscimos
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pedido-construcao/situacao.test.ts --reporter=dot` — 18 de 18, 12,1 s
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pedidos-construcao/situacao.test.ts --reporter=dot` — 10 de 10, 13,1 s
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pedidos-construcao/situacao-403.test.ts --reporter=dot` — 9 de 9, 9,4 s
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/transversal/sentinelas-situacao.test.ts --reporter=dot` — 1 de 1, 14,5 s

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (o `decId` passa por `paramId.versao('decId', 'DEC')` em `rota()`; a rota não tem query nem corpo; 403, 404 e 503 têm mensagem fixa, e o 5xx é o genérico)
