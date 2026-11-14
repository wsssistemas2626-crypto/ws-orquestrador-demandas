---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T02-testes
agente: qa-automacao
leu: [pedido.json, contrato-passagem.md, tarefas.json, 2026-11-13-ws-orquestrador-demandas-sobras-plano.md (G0 a G10 e T02), 01-analista-requisitos.md (RF-01, CA-01.1 a CA-01.6, RNF-01 a RNF-04), 04-seguranca-aplicacao.md (SB-02 a SB-06), 06-T01-qa-automacao.md, 06-T02-engenheiro-backend.md, 06-T02-tech-lead.md, git show --stat c274715, src/modules/pedido-construcao/situacao.ts, src/modules/pedido-construcao/pendentes.ts, src/lib/rota.ts (regex do id e fluxo de rota()), src/db/schema/historico.ts, src/modules/pacotes-decisao/schemas.ts (registrarDecisaoSchema), src/modules/pedido-construcao/situacao.test.ts, src/app/api/pedidos-construcao/situacao.test.ts, src/app/api/pedidos-construcao/situacao-403.test.ts, test/transversal/sentinelas-situacao.test.ts, test/estatico/situacao.test.ts, test/estatico/situacao-qa.test.ts, test/estatico/andamento-qa.test.ts, test/estatico/importacoes.ts, test/estatico/piso-de-assercoes.test.ts, test/pedidos-construcao.ts, test/requisicao.ts, test/andamento.ts (trecho), test/deps.ts, saída do pnpm test em /tmp]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verificação da T02 (serviço `situacaoDoPedido` e rota `GET /api/pedidos-construcao/[decId]/situacao`; RF-01, CA-01.1 a
CA-01.6, SB-01 c, SB-02 a SB-06), commit `c274715`. O código passa nos testes do engenheiro e nos desta etapa. Não achei
defeito e não há devolução. O M1 da revisão (a guarda do SB-06 não via `./situacao` da mesma pasta) está fechado num
arquivo novo, sem mexer em `test/estatico/situacao.test.ts`.

**Critério da tarefa → teste que o cobre**

| Critério | Arquivo | Teste |
|---|---|---|
| CA-01.1 (vigente, exatamente `{"situacao":"vigente"}`) | `src/modules/pedido-construcao/situacao.test.ts` | "CA-01.1: DEC aprovado com pedido gerado por pessoa …" |
| | `src/app/api/pedidos-construcao/situacao.test.ts` | "vigente → 200 {"situacao":"vigente"}, JSON, no-store e nosniff, sem CORS; …" |
| CA-01.2 (substituído com a aprovação completa; parcial segue vigente) | `situacao.test.ts` (serviço e rota) | "CA-01.2: v2 de dupla aprovação …", "CA-01.2: v2 só do cto aprovado …" |
| | `src/app/api/pedidos-construcao/situacao-qa.test.ts` (novo) | "v2 pendente e v2 devolvido: o v1 segue vigente, e o andamento não recusa por substituído"; "v1 substituído por um v2 aprovado sem pedido gerado e um v3 pendente: …; o v2, vigente sem pedido, dá o 404 do inexistente" |
| CA-01.3 e SB-02 a, c (404 idêntico; 404 das outras rotas do /construir) | `situacao.test.ts` (rota) | "sem pedido gerado, pedido_gerado de agente, de sistema e de pessoa noutra demanda: iguais ao inexistente desta rota, da entrega e do andamento" |
| | `situacao-qa.test.ts` (novo) | "cada caso sem pedido gerado por pessoa na própria demanda: a mesma resposta e a mesma sequência de consultas, …" (mais 5 estados forjados: integração, evento sem demanda, entidade `demanda`, `PEDIDO_GERADO` em maiúsculas, entregue e recebido sem geração; e a versão `v01` do DEC vigente) |
| SB-02 b (mesmo número de consultas) | `src/modules/pedido-construcao/situacao.test.ts` | "SB-02 (b), D-07: … fazem o mesmo número de consultas" (pelo serviço) |
| | `situacao-qa.test.ts` (novo) | o mesmo caso acima: pela rota inteira, a **sequência de textos SQL** é igual à do inexistente, e nenhuma consulta lê `"pacote_decisao"`; o controle (vigente) lê e faz mais consultas |
| SB-02 d (substituído e vigente em status final não viram 404) | `src/modules/pedido-construcao/situacao.test.ts` | "SB-02 (d) e Pendência 4 de 01: …" |
| CA-01.4 e SB-01 c (403 sem consulta ao DEC) | `situacao-403.test.ts` | "%s: 403 igual para DEC existente e inexistente, sem chamar o serviço e sem gravar" (serviço trocado) |
| | `situacao.test.ts` (rota) | "awave, os quatro agentes, cto e administradora (sessão com 2FA) → 403 sem_permissao; sem credencial → 401; nada muda" |
| | `situacao-qa.test.ts` (novo) | "%s: a mesma resposta e as mesmas consultas para todo estado do DEC; nenhuma consulta leva o id nem lê pacote_decisao" — **com o serviço de verdade**, 12 atores (awave, 4 agentes, 2 papéis com 2FA, 2 papéis sem 2FA, token do construir adulterado) × 8 estados do DEC |
| SB-01 no serviço (sem conectar) | `src/modules/pedido-construcao/situacao.test.ts` | "%s: sem_permissao, sem conectar ao banco, …" |
| id fora do formato → 404 sem consulta (C-17) | `situacao.test.ts` (rota) | "id fora do formato (DEC-xyz) → o mesmo 404, sem conectar nem consultar o pool do app" |
| | `situacao-qa.test.ts` (novo) | "caixa, espaço, quebra de linha, tab, dígito de largura total, hífen Unicode, versão de cinco dígitos, barra e vazio" (11 ids quase iguais ao de um DEC com pedido) |
| CA-01.5 e SB-03 c (nada gravado em 200, 403, 404, 503) | `situacao.test.ts` (rota) | "200, 403, 404 e 503: o retrato é igual antes e depois de cada um" |
| | `situacao-qa.test.ts` (novo) | total de `evento` igual no 403 e nos 404 |
| CA-01.6, SB-04 (503 `indisponivel` com o prazo vencido) | `src/modules/pedido-construcao/situacao.test.ts`, `situacao.test.ts` (rota) | "SB-04 (CA-01.6): prazo total"; o caso 503 do CA-01.5 |
| | `test/estatico/situacao.test.ts` | "nenhum SET, transação própria, Promise.all nem trava; executarComOrcamento uma vez, com undefined" |
| SB-03 a, b (corpo e cabeçalhos) | `situacao.test.ts` (rota) | "vigente → 200 …" |
| SB-03 d (sem trava) | `src/modules/pedido-construcao/situacao.test.ts` | "com a trava do pedido e a da demanda seguradas por outra transação, …" |
| SB-05, RNF-04 (log e Sentry sem id) | `situacao.test.ts` (rota), `test/transversal/sentinelas-situacao.test.ts` | "cada chamada deixa uma linha …"; a sentinela do 5xx |
| SB-06 ("se e só se" com o 409 `decSubstituido`) | `situacao.test.ts` (rota) | "a rota responde substituido se e só se o andamento do mesmo DEC responde 409 decSubstituido; …" |
| | `situacao-qa.test.ts` (novo) | as duas bordas do CA-01.2 acima conferem a rota e o andamento juntos |
| SB-06 (só a rota usa o serviço) — **M1 da revisão** | `test/estatico/situacao-t02-qa.test.ts` (novo) | "1. só a rota nova importa situacao.ts, por qualquer caminho, de valor ou de tipo"; "2. fora da rota e do serviço, ninguém cita situacaoDoPedido, …"; "3. nenhum import() nem require() com caminho montado no código que roda"; os casos plantados, com o do M1 (`import { situacaoDoPedido } from './situacao';` em `conferir.ts`) |
| G3.9, SB-15 (piso) | `test/estatico/piso-de-assercoes.test.ts` | "%s tem ao menos %i linhas com expect(" |

**Testes acrescentados**

- `src/app/api/pedidos-construcao/situacao-qa.test.ts` (novo, 15 casos, 33 linhas com `expect(`): o teste adversarial dos
  oráculos. As consultas são lidas por `vi.spyOn(pg.Client.prototype, 'query')` durante cada chamada à rota (D-07), com
  texto e parâmetros.
  - **403 × estado do DEC, com o serviço de verdade:** o teste do engenheiro troca o serviço por um mock, e este não.
    Para cada ator proibido, a resposta (status, cabeçalhos e bytes) e a sequência de textos SQL são iguais em 8 estados
    do DEC: vigente, substituído, sem pedido, de agente, de outra demanda, entregue e recebido sem geração, inexistente e
    `v01`. Nenhuma consulta leva o id do DEC no texto nem nos parâmetros, e nenhuma lê `"pacote_decisao"`. A primeira
    chamada aquece a credencial e não entra na comparação. Entram também a pessoa sem 2FA (status 401 ou 403, igual em
    todo estado) e o token do `construir` com o último caractere trocado (401).
  - **404 pela rota:** cada caso sem pedido de pessoa na própria demanda faz a mesma sequência de consultas do
    inexistente e não lê o DEC. O DEC de outra demanda dá o mesmo 404 e não entra na contagem (plano, D-07). O controle
    prova que a regra enxerga a leitura do DEC: no vigente, `"pacote_decisao"` aparece e há mais consultas.
  - **Ids quase iguais:** 11 ids parecidos com o de um DEC que tem pedido dão o 404 do inexistente sem `connect` nem
    `query` no pool do app. O `v01` passa na regex e não é normalizado para o `v1` que existe.
  - **Bordas do CA-01.2 com o SB-06:** com o v2 pendente ou devolvido, o v1 continua `vigente`, e o andamento não recusa
    por substituído. Com o v1 substituído por um v2 aprovado sem pedido gerado (e um v3 pendente), o v1 dá `substituido`
    e o andamento dá 409 `decSubstituido`. O v2, vigente mas sem pedido, dá o 404 do inexistente.
- `test/estatico/situacao-t02-qa.test.ts` (novo, 8 casos, 27 linhas com `expect(`): fecha o M1. A varredura é a de
  `situacao-qa.test.ts` (`.ts/.tsx/.js/.jsx/.mjs/.cjs/.mts/.cts` de `src/` e `scripts/`, mais a configuração da raiz).
  As importações são lidas pela árvore do TypeScript (`./importacoes`), e o caminho é resolvido em todas as formas:
  relativo, `@/`, extensão, `index`, reexportação, `import()` e `require()`. Também entram os nomes exportados pelo
  serviço e o `import()`/`require()` com caminho montado. Cada regra tem um caso plantado que ela reprova e um parecido
  que ela deixa passar: `./situacao-worker`, `./situacao` de outra pasta e `situacaoDoPedidoAntiga`.
- `test/estatico/piso-de-assercoes.test.ts`: só acréscimo, com o comentário de origem. Entram
  `src/app/api/pedidos-construcao/situacao-qa.test.ts: 33` e `test/estatico/situacao-t02-qa.test.ts: 27`, lidos na
  mensagem do próprio teste do piso, pelo critério do `linhasComExpect`. Nenhum valor desceu.

**Resultado**

- Os dois arquivos novos sozinhos: 2 de 2 arquivos e 23 de 23 testes (15,4 s). O dinâmico rodou de novo sozinho depois
  do último ajuste: 15 de 15 (14,4 s).
- `pnpm test` (suíte inteira, em segundo plano): **358 de 358 arquivos, 7893 de 7893 testes**, 0 falhas, 188,8 s. Na
  revisão eram 356 arquivos e 7868 testes. A diferença é de 2 arquivos e 25 testes: os 23 casos novos e as 2 entradas
  novas do piso.
- `pnpm lint`: limpo (`eslint .` sem saída), rodado de novo depois da última edição.
- `pnpm typecheck`: limpo (`tsc --noEmit` sem saída), rodado de novo depois da última edição.
- `git status` e `git diff`: no rastreado, só mudou `test/estatico/piso-de-assercoes.test.ts`, com 4 linhas
  acrescentadas e nenhuma tirada. Os dois arquivos novos aparecem como não rastreados.

**Relatório de falhas por criticidade:** nenhuma falha. Nenhuma instabilidade conhecida apareceu na rodada inteira.

## Decisões tomadas

- Os testes novos ficam em arquivos `-qa` separados. Assim não toco asserção do engenheiro, a G5 continua sendo a única
  lista de mudança em teste existente, e o M1 fica num arquivo novo, como a revisão pediu.
- O 403 é testado também com o serviço de verdade. O mock do engenheiro prova que o serviço não é chamado, mas não
  prova que nenhuma consulta da requisição dependa do DEC. A sequência de SQL e a falta do id nos parâmetros provam.
- Comparo a sequência de textos SQL, e não só a contagem: duas consultas diferentes com o mesmo número passariam numa
  contagem.
- Há uma chamada de aquecimento antes de medir. Assim, uma escrita que a credencial ou a sessão faz uma vez só não vira
  diferença falsa entre os estados. Com o relógio fixo, o resto é determinístico.
- As consultas do esquema `pgboss` são filtradas. Elas não são da requisição, e a regra não depende de o
  `supervise`/`schedule` estar desligado no teste.
- A regra 1 do M1 proíbe também a importação só de tipo. O M1 diz "por nenhum caminho", e hoje nenhum arquivo precisa
  dela. Se um dia precisar, a mudança é em teste de segurança (G3.2) e passa pela revisão.
- A regra 3 (sem `import()`/`require()` montado no código que roda) fecha o desvio da regra 1. Hoje o código que roda
  só tem caminho literal (`src/instrumentation.ts`), e um caso plantado prova que o literal passa.
- Não testo o tempo de resposta como oráculo. A 04 e o plano não o pedem nesta tarefa, e a RNF-01 é medida na 09. Um
  p95 na suíte aumentaria a instabilidade (lição do D-17).
- O DEC de outra demanda faz uma consulta a mais que o inexistente. Ficou fora da igualdade de consultas, como no plano
  (D-07), porque o estado só existe com evento forjado. Comparo só a resposta dele.

## Pendências

- M2, M3 e M4 da `06-T02-revisao` (título do SB-04, ajudantes copiados e o retrato no SB-03 d) seguem para a
  `08-correcao` ou viram dívida de teste, como a revisão sugeriu. Não mexi neles porque estão nos arquivos do
  engenheiro.
- Comportamento registrado, sem defeito: `pedidoGeradoPorPessoa` pega o **primeiro** `pedido_gerado` de pessoa do DEC
  (`order by id`, `limit 1`). Se um evento forjado de outra demanda viesse antes do legítimo, o DEC daria 404. O estado
  só existe pelo migrator e falha fechado, então não testei como requisito.
- O `pedido.json` não traz instrução para o agente. Nada a registrar.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files docs/construcao/DEC-DEM-20261111-0018-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^### \|^## " -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "CA-01\|RF-01\|RNF-0" -- docs/construcao/DEC-DEM-20261111-0018-v1/01-analista-requisitos.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "SB-0[2-6]" -- docs/construcao/DEC-DEM-20261111-0018-v1/04-seguranca-aplicacao.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat c2747153c0699153c77e1cc856a5ace91a1b66ce`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "demandaId\|atorTipo\|check(" -- src/db/schema/evento.ts` — sem saída (o arquivo não existe)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export const evento = " -- src/db/schema`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "versao\|RE_ID\|paramId" -- src/lib/rota.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export" -- test/andamento.ts test/integracoes.ts test/deps.ts test/banco.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "situacaoDoPedido" -- src scripts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "/situacao['\"]" -- src scripts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "SituacaoDoPedido\|SITUACOES_DO_PEDIDO\|DepsSituacao" -- src scripts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files -- *situacao*`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "\"@/\*\"\|paths" -- tsconfig.json`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files src/modules/pedido-construcao`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "import(\|require(" -- src scripts *.ts *.mjs *.js`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "supervise\|schedule\|start\|new PgBoss\|export async function criarFila" -- src/lib/fila.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "const ESQUEMA" -- src/lib/fila.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "statusDecisao\|referenciaDocumento\|justificativa" -- src/modules/pacotes-decisao/schemas.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export async function criarPessoa\|export function novoIp\|com2fa" -- test/sessao.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "decSubstituido" -- src/modules/andamento/schemas.ts src/modules/andamento/registrar.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "devolvida" -- src/modules/pacotes-decisao/decidir.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "limite\|Limite" -- src/lib/rota.ts src/modules/acesso/resolver-ator.ts` — sem saída
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/situacao-t02-qa.test.ts src/app/api/pedidos-construcao/situacao-qa.test.ts --reporter=dot` — 2 de 2 arquivos, 23 de 23 testes
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pedidos-construcao/situacao-qa.test.ts --reporter=dot` — 15 de 15
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/piso-de-assercoes.test.ts --reporter=dot` — com o valor provisório 999: 2 falhas que mostraram as contagens (33 e 27)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — em segundo plano: 358 de 358 arquivos, 7893 de 7893 testes; saída lida com Read em /tmp
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- test/estatico/piso-de-assercoes.test.ts` — só as 4 linhas acrescentadas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — 1 modificado (o piso) e 2 novos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — o mesmo, depois da suíte
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo, depois da última edição
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo, depois da última edição

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
