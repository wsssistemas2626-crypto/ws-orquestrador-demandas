---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T15-construcao
agente: engenheiro-backend
leu: [contrato-passagem.md, pedido.json, padrao-tecnico.md, tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G8, fim da T14, T15, T19 e T20), 06-T13-engenheiro-backend.md, 06-T13-tech-lead.md, 06-T14-engenheiro-backend.md, 06-T14-tech-lead.md, 06-T12-tech-lead.md, 06-T01-qa-automacao.md, scripts/seed-ficticio.ts, scripts/scripts.test.ts, test/pedidos-construcao.ts, test/integracoes.ts, test/deps.ts, e2e/apoio.ts, e2e/fila-contadores.spec.ts, src/modules/demandas/servico.ts, src/modules/demandas/schemas.ts, src/modules/demandas/transicoes.ts, src/modules/demandas/confirmacao.ts, src/modules/integracoes/tempo-limite.ts, src/modules/pedido-construcao/gerar.ts, src/modules/pedido-construcao/conferir.ts, src/modules/pedido-construcao/entregar.ts, src/modules/pedido-construcao/receber.ts, src/modules/pedido-construcao/pendentes.ts, src/modules/pedido-construcao/schemas.ts, src/modules/agentes/gatilhos.ts, src/modules/agentes/gatilhos-awave.test.ts (linhas 1 a 90), src/db/schema/agentes.ts, a saída do pnpm test]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T15: seed fictício com as demandas do Awave e os pedidos para o /construir (IN-17, V-01, D-09). O seed é só de dado
fictício: títulos com "(fictício)", nomes "Pessoa Ficticia …", e-mails `@ficticio.test` (as contas que já existiam),
nenhum token e nenhum e-mail novo. Nenhum módulo de produção mudou.

### Conferência antes de começar

A T15 toca `scripts/seed-ficticio.ts`, os testes do seed que contam demandas (`scripts/scripts.test.ts`, achado com
`git log -S TOTAL_DEMANDAS_DO_SEED` e `-S MENSAGENS_SEED`) e cria `scripts/seed-integracoes.test.ts`. Os três ficam em
`scripts/`, dentro da minha lista Pode. Não houve motivo para devolver ao plano.

### Pendências das entregas 06-T01 a 06-T14 que citam a T15

A busca foi `git log -G T15` e `git log -G seed` na pasta do pedido. Citam a T15: 05-tech-lead (plano), 06-T13 (construção
e revisão) e 06-T14 (construção e revisão, só ao listar o que leram).

| De onde | O que diz | Como ficou |
|---|---|---|
| 06-T13-construcao, Pendências | `test/pedidos-construcao.ts` tem `DEMANDA_DO_PEDIDO`, `ESP_DO_PEDIDO`, `RSK_DO_PEDIDO` e `DEC_DO_PEDIDO`, se o teste do seed quiser os mesmos dados; o seed continua com os dele | **Não usei**, de propósito: o plano manda o seed usar `ESP_DO_E2E`, `RSK_DO_E2E` e `{ ...DEC_DO_E2E, nivelAprovacaoRequerido: 'cto' }`, e o `scripts/` não importa de `test/` em código que roda na homologação. O teste do seed confere o resultado pelo banco, sem precisar dos dados do ajudante |
| 06-T13-revisao, parecer 1 | `chamadasDoAwave(token)` em `test/integracoes.ts`, "para quem tocar os testes do Awave depois (T15, T20 ou a 08)" | **Não se aplica à T15:** o seed chama o serviço (`criarDemanda` com o ator de integração), não a rota, e eu não toquei nenhum teste de rota do Awave. Continua para a T20 ou a 08 |
| 06-T01-qa-automacao, Pendências | o seed com dado de integração (IN-17) fica para a 09 | **Feito o dado:** o banco semeado tem agora eventos `integracao` (Awave e /construir) e autoria `integracao` na demanda, para o ensaio de rollback da 09 ter esse dado. O ensaio em si segue com a 09 |
| 06-T14-tech-lead, 06-T14-engenheiro-backend | só citam a T15 na lista do que leram | nada a fazer |

### Arquivos

| Arquivo | O que mudou |
|---|---|
| `scripts/seed-ficticio.ts` | cinco títulos novos em `TITULOS_DO_E2E` (os do plano, sem mudança); `DO_AWAVE` (o corpo do contrato do Awave, texto inventado), `DEMANDAS_DO_AWAVE`, `DEMANDAS_DOS_PEDIDOS`; `AWAVE_DO_SEED` e `CONSTRUIR_DO_SEED` com o prefixo `ficticio` (D-09); `criarDadosDasIntegracoes`, chamada no fim de `criarDemandas`; `TOTAL_DEMANDAS_DO_SEED` com as cinco novas (28); cabeçalho com o que entrou e o limite (o Awave fica com 3 das 10 por hora) |
| `scripts/seed-integracoes.test.ts` (novo) | 12 testes, banco real, relógio fixo |
| `scripts/scripts.test.ts` | os números do seed (G5), detalhados em "Testes existentes que mudaram" |

`criarDadosDasIntegracoes` faz, na transação do seed e pelos serviços da API (com `t`, sem o tempo limite das
integrações, como a T04 define):
- **Awave:** `criarDemanda(deps, AWAVE_DO_SEED, criarDemandaSchema.parse(...), t)` para as três; a `awaveEncerrada` vai de
  Nova a Encerrada por `alterarDemanda` da "cto" (a tabela do RF-07 permite `nova → encerrada` direto). Nenhuma recebe
  `demanda_confirmada`.
- **/construir:** para as duas, demanda, ESP, RSK e DEC da `sem2fa`; aprovação da "cto" na opção A; `gerarPedido` da "cto"
  com `confirmacaoDoPedidoSchema.parse({ confirmaSemDadoPessoal: true })`. Na `pedidoRecebido`, depois,
  `entregarPedido(deps, CONSTRUIR_DO_SEED, decId, t)` e `receberPedido(..., sha256, t)` com o hash que a entrega devolveu.

Os cinco títulos são de tipo `melhoria`, porque o `demandaDoSeed` do e2e procura entre essas.

### Testes criados

`scripts/seed-integracoes.test.ts`, três `describe`, cada um com o banco dele:

1. **Agentes desligados, como na homologação** (10 testes):
   - os cinco títulos exatos do plano, com "(fictício)", e todos os títulos de `TITULOS_DO_E2E` diferentes entre si;
   - `TOTAL_DEMANDAS_DO_SEED` = 28 = demandas no banco, e `MENSAGENS_SEED.semeado` com o mesmo número;
   - as três do Awave: autoria `integracao`/`awave`, rascunho, solicitante "Awave" (`NOME_DA_INTEGRACAO`), papel `outro`,
     tipo `melhoria`, linha, urgência e anexos vazios (lista do IN-05), contexto e descrição preenchidos; duas em `nova` e
     a `awaveEncerrada` em `encerrada`; são exatamente três (3 das 10 por hora);
   - nenhuma confirmada: `jaConfirmada` falso, `aguardaConfirmacao` verdadeiro, e nenhum `demanda_confirmada` no banco;
   - os três `demanda_criada` por igualdade exata (ator `integracao`/`awave`, prefixo `ficticio`, `depois = { status,
     tipo }`), e o encerramento como `status_alterado` da pessoa "cto";
   - os dois pedidos: demanda, ESP e RSK da `sem2fa`; DEC de pessoa, nível `cto`, decisão `aprovada` na opção A; um
     `pedido_gerado` da "cto" com `{ confirmaSemDadoPessoal: true }`;
   - V-01: `listarPendentes` é exatamente `[{ decId: <pedidoParaBuscar> }]`; `recebimentoDoPedido` da `pedidoRecebido` é
     a data do relógio, e o da outra é `null`; a outra não tem entrega;
   - o pedido recebido: um `pedido_entregue` e um `pedido_recebido` do `construir`, com prefixo `ficticio`, a demanda
     certa, `antes` nulo e o mesmo `{ sha256 }`, que é o hash que `shasEntregues` lê e casa com `RE_SHA256`;
   - D-09 e IN-04: `token_servico` vazio; nenhum `wsod_` no log do seed nem nos eventos; o único prefixo nos eventos é
     `ficticio`;
   - nenhuma execução de agente para as demandas do Awave.
2. **Falha no meio das integrações** (1 teste): uma fila que falha no quinto `aviso.dec-pronto` (o DEC da
   `pedidoRecebido`), depois de provar, pela conexão da transação, que as três do Awave e o primeiro `pedido_gerado` já
   estavam gravados. Nada fica no banco (demanda, evento, DEC, decisão, aviso, conta), e a subida seguinte semeia tudo.
3. **Insumo técnico ligado e teto livre** (1 teste, IN-06 e D1 pelo seed): a demanda de pessoa tem a execução do insumo
   técnico e o job dela (controle positivo); as três do Awave, nenhuma execução e nenhum job.

### Teste antes do código

`pnpm --dir … test scripts/seed-integracoes.test.ts`, antes de mudar o seed:
```
 ❯ scripts/seed-integracoes.test.ts (11 tests | 11 failed) 2751ms
     × os cinco títulos novos: fictícios, diferentes entre si e dos de antes
     × o total do seed conta as cinco novas: 28 demandas, e a mensagem diz o mesmo número
     × três demandas do Awave: autoria integracao/awave, rascunho, solicitante "Awave", melhoria; …
     …
AssertionError: expected 23 to be 28 // Object.is equality
AssertionError: expected [] to have a length of 1 but got +0
 Test Files  1 failed (1)
      Tests  11 failed (11)
```
Depois do seed: 11 de 11. O teste da falha no meio (o 12º) entrou depois e passou de primeira: é **teste de guarda**
(G3.1). O seed já roda numa transação só, e o teste prova que a parte nova também está dentro dela. O próprio teste
mostra que a falha vem depois do dado novo (`{ do_awave: 3, gerados: 1 }` lido na transação), então ele não passa à toa.

Os testes existentes, rodados contra o seed novo e antes de mudar os números: `scripts/scripts.test.ts`, 5 de 48
falharam, todos por contagem (`expected 28 to be 23`, `[ 28, 5, 5, 5, 3 ]` contra `[ 28, 3, 3, 3, 1 ]`, `decIds` com 5 e
não 3, e as demandas sem versão encontrando os pedidos com ESP, RSK e DEC).

### Testes existentes que mudaram (G5, trecho a trecho)

Só `scripts/scripts.test.ts`, que não está no D-17. Nenhuma linha `expect(` saiu, e entrou uma.

| Linha (depois) | Antes | Depois | Por quê |
|---|---|---|---|
| 370 | `TOTAL_DEMANDAS_DO_SEED` = 23 | 28, e o comentário cita a T15 | as cinco novas (G5) |
| 412 a 419 | o teste das demandas do e2e varria todos os títulos e exigia de cada uma autoria `pessoa` da `sem2fa` e versões fixas | separa as cinco da T15 (`DA_T15`) e confere as dezoito de antes com as mesmas asserções; a de títulos únicos passa a valer para **todos** os 23 | as da T15 têm autoria (Awave) e versões (pedido gerado) próprias, conferidas em `seed-integracoes.test.ts`. Nenhuma asserção das dezoito mudou |
| 463 e 464 | `titulos` com 18 | continua 18, e entra `todos` com 23 | uma asserção a mais |
| 567 | `[TOTAL, 3, 3, 3, 1]` (demanda, ESP, RSK, DEC, aprovação) | `[TOTAL, 5, 5, 5, 3]` | a ESP, o RSK, o DEC e a aprovação de cada pedido |
| 854 | 3 DECs, um aviso e um job por DEC | 5 DECs; as asserções de aviso e job por DEC ficam iguais | os DECs dos dois pedidos também deixam aviso e job |
| 1054 | no terceiro aviso, `demandas: TOTAL_DEMANDAS_DO_SEED` | `TOTAL_DEMANDAS_DO_SEED - 5` | o terceiro aviso continua o último passo das versões do e2e; as cinco das integrações vêm depois e ainda não existem nesse ponto. O resto do teste (tudo desfeito, nenhum job) não mudou |
| 1077 e 1078 | depois da nova subida, 3 DECs e 1 aprovação | 5 e 3 | os dois pedidos |

### Resultado

- `scripts/seed-integracoes.test.ts` e `scripts/scripts.test.ts`: 2 de 2 arquivos, 60 de 60 testes.
- `pnpm test` (suíte inteira): **281 de 281 arquivos e 6230 de 6230 testes**, 0 falharam (saída lida com Read).
- `pnpm typecheck` e `pnpm lint`: limpos.
- G4: o `git diff a9fd9b8 --stat` das superfícies congeladas, com `src/lib/rota.ts`, saiu vazio.
- `git status --short`: 2 alterados (`scripts/scripts.test.ts`, `scripts/seed-ficticio.ts`) e 1 novo
  (`scripts/seed-integracoes.test.ts`).
- `pnpm test:e2e` não está na minha lista Pode (G1). Os e2e que leem o seed (`fila-contadores.spec.ts` e os que usam
  `demandaDoSeed`) contam pela API, não por número fixo; os e2e novos da T16 a T20 rodam com o `engenheiro-frontend`.

### Desvios do plano

1. **Um teste a mais**, o da falha no meio das integrações. O plano não pede. Entrou porque a mudança do teste da linha
   1054 tira a cobertura de atomicidade da parte nova: o terceiro aviso falha antes de ela existir.
2. **Um teste a mais com o insumo técnico ligado.** O plano pede "nenhuma execução para as demandas do Awave", que com
   os agentes desligados do seed passa sem provar nada. Ligado, o teste prova o D1 pelo seed e tem o controle positivo.
3. **`confirmacaoDoPedidoSchema.parse(...)`** em vez do objeto literal `{ confirmaSemDadoPessoal: true }` do plano:
   mesmo valor, passando pelo Zod como na rota, como o seed já faz com os outros serviços.

## Decisões tomadas

- Os dados das integrações entram **depois** das versões do e2e da 0.2.0, numa função própria
  (`criarDadosDasIntegracoes`). Assim, a ordem dos 18 títulos e dos 3 primeiros DECs de antes não muda, e os testes de
  hoje mudam só nos números.
- As duas demandas dos pedidos são da `sem2fa`, como as do e2e, e não da "cto". O limite C-36 da "cto" fica para as specs.
  A `sem2fa` passa de 18 para 20 demandas (limite 30) e de 3 para 9 versões (limite 60).
- O seed usa os serviços com `t`, e não SQL direto. Assim os mesmos caminhos da API gravam a autoria, os eventos e o hash,
  e o `pedido_entregue` traz o hash que o servidor calculou (IN-12).
- O teste de V-01 compara `listarPendentes` por igualdade exata. Os outros DECs do seed não entram: um é de dupla
  aprovação ainda pendente, dois são de agente e nenhum tem `pedido_gerado`. Se um seed futuro aprovar e gerar outro
  pedido, o teste avisa.
- **Migration:** nenhuma. Para voltar a T15: restaurar `scripts/seed-ficticio.ts` e `scripts/scripts.test.ts` pelo `git`
  e apagar `scripts/seed-integracoes.test.ts`.

## Pendências

- Nenhuma bloqueia a T15.
- Para a T20 (e2e das integrações, `engenheiro-frontend`): o seed grava com a hora do sistema, então o Awave já tem **3
  das 10** demandas da hora quando o e2e local começa. Um teste que conte até a 11ª a partir de zero recebe o 429 três
  antes. O e2e local que criar demanda pelo token `awave` tem de contar com isso.
- Para a T20 e a 09 (V-01): `listarPendentes` no banco recém-semeado tem só o `pedidoParaBuscar`. Os e2e de hoje que geram
  pedido (`pedido-construcao.spec.ts`) põem outros DECs na lista. Por isso, um teste de pendentes contra o e2e ou a
  homologação deve procurar o DEC do `pedidoParaBuscar` na lista, e não exigir que ela tenha um item só.
- Para a T19: o DEC dos dois pedidos usa `DEC_DO_E2E` com o nível trocado para `cto`, como o plano manda. O
  `resumoExecutivo` herdado diz "que exige as duas aprovações", e o nível é só o CTO. É texto fictício e nenhum teste o
  lê, mas aparece na tela do DEC. Se a T19 ou a 07 acharem que confunde, basta um `resumoExecutivo` próprio para os
  pedidos no seed.
- Para a `10-documentacao`: o seed da homologação passa a ter 28 demandas, três do Awave e dois pedidos (um a buscar, um
  recebido), e nenhum token. A V-01 da 09 pode usar o `pedidoParaBuscar`.
- Herdada, sem mudança: `chamadasDoAwave` em `test/integracoes.ts` (parecer 1 da 06-T13-revisao), para a T20 ou a 08.
- As caixas `- [ ]` da T15 no plano não foram marcadas: a 06 não edita `docs/` (G1). A marcação fica com o maestro.
- Glob e Grep não estavam disponíveis nesta sessão. Li tudo com Read e achei as entregas e os testes do seed com
  `git log -S` e `git log -G`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — árvore limpa no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -20` — HEAD em 71a054f (06-T14-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G T15 --name-only --oneline -- docs/construcao/DEC-DEM-20261111-0016-v1` — 05-tech-lead, 06-T13 (construção e revisão), 06-T14 (construção e revisão)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S TOTAL_DEMANDAS_DO_SEED --name-only --oneline` — o teste do seed é `scripts/scripts.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S MENSAGENS_SEED --name-only --oneline` — o mesmo arquivo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G seed --format=%h%x20%s --name-only -- docs/construcao/DEC-DEM-20261111-0016-v1` — mais 06-T12-revisao e 06-T01-testes (lidos)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S seed-ficticio --format=%h --name-only -- e2e test src scripts playwright.config.ts` — quem importa o seed (e2e e testes estáticos)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S ligarAgente --format=%h --name-only -- test src` — nenhum ajudante de teste para ligar agente
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S teto_mensal --format=%h --name-only -- test src/modules/demandas src/modules/agentes` — o modelo de `gatilhos-awave.test.ts` para ligar o agente
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "export function mudancaDeCampo" --format=%h --name-only` — onde fica `mudancaDeCampo`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/seed-integracoes.test.ts` — antes do código: 11 de 11 falharam
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/seed-integracoes.test.ts` — depois do seed: 11 de 11
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/scripts.test.ts` — contra o seed novo, antes de mudar os números: 5 de 48 falharam, todos por contagem
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/scripts.test.ts scripts/seed-integracoes.test.ts` — com os números novos: 59 de 59
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 281 de 281 arquivos, 6229 de 6229 testes (saída lida com Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 2 alterados e 1 novo, todos da tarefa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 --stat -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts 'drizzle/000[0-6]_*.sql' 'drizzle/meta/000[0-6]_snapshot.json' src/lib/rota.ts` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — `scripts/scripts.test.ts` (+24 −11) e `scripts/seed-ficticio.ts` (+87 −6)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- scripts/scripts.test.ts` — só as mudanças da tabela G5 acima; nenhuma linha `expect(` saiu
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/seed-integracoes.test.ts` — com o teste da falha no meio: 12 de 12 (teste de guarda, passou de primeira)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/seed-integracoes.test.ts scripts/scripts.test.ts` — 60 de 60
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — rodada final: 281 de 281 arquivos, 6230 de 6230 testes, 0 falharam (saída lida com Read)

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega; o teste da falha no meio está nomeado como teste de guarda, com a razão)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real (só dado fictício; nenhum token emitido; o prefixo `ficticio` fica fora do formato de token; o teste confere `token_servico` vazio e nenhum `wsod_` no log e nos eventos)
- [x] só mudaram os arquivos da tarefa (`scripts/seed-ficticio.ts`, `scripts/scripts.test.ts` pela G5, `scripts/seed-integracoes.test.ts` novo)
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (a T15 não cria rota, Server Action nem job; o seed passa cada entrada pelo schema do serviço: `criarDemandaSchema`, `alterarDemandaSchema`, `criarEspecificacaoSchema`, `criarParecerRiscoSchema`, `criarPacoteDecisaoSchema`, `registrarDecisaoSchema`, `confirmacaoDoPedidoSchema`)
