---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T08-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md (pela regra G3 do plano), contrato-passagem.md, tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (linhas 1 a 340 e T08, 2044 a 2213), 01-analista-requisitos.md (RF-01 a RF-03 e RF-12, linhas 50 a 120 e 280 a 300), 06-T02-engenheiro-backend.md, 06-T02-qa-automacao.md, 06-T03-engenheiro-backend.md, 06-T03-qa-automacao.md, 06-T04-engenheiro-backend.md, 06-T04-qa-automacao.md, 06-T04-tech-lead.md, 06-T05-qa-automacao.md, 06-T07-engenheiro-backend.md, 06-T07-qa-automacao.md, 06-T07-tech-lead.md (Pendências que citam a T08), src/app/api/pedidos-construcao/[decId]/recebimento/route.ts, src/app/api/pedidos-construcao/recebimento.test.ts, src/modules/andamento/registrar.ts, src/modules/andamento/registrar-qa.test.ts, src/modules/andamento/registrar.test.ts (CA-12), src/modules/andamento/schemas.ts, src/modules/limites.ts (LIMITE_ANDAMENTO e JANELA_MS), src/lib/rota.ts, src/lib/corpo.ts, src/lib/erros.ts, src/lib/log.ts, src/lib/sentry.ts, src/app/api/demandas/visibilidade-agente-0019.test.ts (1 a 130), drizzle/0008_slippery_whirlwind.sql, test/pedidos-construcao.ts, test/requisicao.ts, test/andamento.ts, test/banco.ts, test/deps.ts, test/integracoes.ts, test/sessao.ts (criarPessoa), test/sentinelas.ts, test/matriz-rotas.test.ts, test/transversal/sentinelas.test.ts, test/estatico/piso-de-assercoes.test.ts, test/estatico/andamento.test.ts (1 a 60), test/estatico/andamento-qa.test.ts (1 a 60), vitest.config.ts, estruturaAutonoma/ferramentas/construir/lib/andamento.mjs, estruturaAutonoma/ferramentas/construir/lib/buscar-pedidos.mjs (50 a 75)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

A rota `POST /api/pedidos-construcao/[decId]/andamento` (T08) está pronta, com testes para:
- o contrato do `/construir`;
- o 404 byte a byte pela rota real;
- o 422 sem chamar o serviço;
- os 403;
- o limite pela rota;
- o log e as sentinelas.

Antes de escrever código, conferi a lista Pode. A T08 só mexe em `src/app/api/pedidos-construcao/`,
`test/transversal/`, `test/pedidos-construcao.ts` e `test/estatico/piso-de-assercoes.test.ts`. Tudo fica dentro de
`src/` e `test/`, então não foi preciso devolver ao plano.

### Arquivos criados

- `src/app/api/pedidos-construcao/[decId]/andamento/route.ts`: o código do passo 3 do plano, sem mudança. A rota chama
  `rota()` com:
  - `paramId.versao('decId', 'DEC')`;
  - `corpo: corpoAndamentoSchema`;
  - `corpoInvalido: CORPO_INVALIDO_ANDAMENTO`, escrito literalmente, como a guarda da 06-T04-testes exige.

  Ela devolve 204 sem corpo.
- `src/app/api/pedidos-construcao/andamento.test.ts`: 15 testes, com 95 linhas que têm `expect(`. Cobrem os casos 1 a
  11 do plano:
  - **1.** A rota exporta só `POST`, e o `meta` está certo.
  - **2. CA-01.1 e CA-02.1.** O corpo é o texto exato do `/construir`
    (`{"fase":"construindo","tarefasProntas":9,"tarefasTotal":17,"status":"em_construcao"}`, igual a
    `JSON.stringify(CORPO_CONSTRUINDO)`). Ele recebe 204 com corpo `''`, `no-store` e `nosniff`, sem `location` e sem
    CORS, e a linha é gravada com o prefixo. Um segundo envio igual recebe 204 e não grava nova linha.
  - **3. CA-02.6.** `entendendo_o_pedido 0/0` recebe 204. `-0` recebe 204, e a linha fica com 0 (`Object.is`).
  - **4. CA-02.5 e CA-02.7.**
    - JSON malformado recebe 400, `text/plain` recebe 415 e o corpo de 600 KB recebe 413.
    - `DEC-xyz` recebe 404. Os espiões em `poolApp.connect` e `poolApp.query` mostram que não houve nenhuma chamada ao
      banco.
    - O retrato e o total de eventos não mudam.
  - **5. CA-03.1 a CA-03.4 e AN-03, byte a byte.** São os oito casos do teste 1 de `registrar-qa.test.ts`, agora pela
    rota real:
    - DEC fora do formato;
    - sem pedido gerado;
    - substituído sem pedido;
    - de outra demanda;
    - pedido gerado por agente;
    - pedido gerado por sistema;
    - pedido gerado por pessoa na entidade `demanda`;
    - pedido gerado por pessoa sem `demanda_id`.

    Cada caso vai com dois corpos e é comparado pela `foto` (status, cabeçalhos sem `date` e corpo) com
    `DEC-DEM-20991231-9999-v1`, que não existe. As oito demandas e o total de eventos não mudam. No controle, a vítima
    recebe 204 e grava.
  - **6.** 409 `decSubstituido`, sem citar o v2, e 409 `statusFinal`, sem citar o status. Nada muda.
  - **7. CA-01.2.** `awave`, os quatro agentes, `cto` e `administradora` (sessão com 2FA e `Origin` certo) recebem 403
    `SEM_PERMISSAO`. Nada muda.
  - **8. CA-01.5.** O `construir` recebe 403 em `GET /api/demandas/:id`, `POST /api/demandas` e
    `PATCH /api/demandas/:id`. O retrato e o total de demandas não mudam.
  - **9. CA-12.1 a CA-12.5:**
    - com 60 linhas, um estado novo recebe 429 por DEC, e o mesmo estado da última linha recebe 204 sem gravar;
    - uma gravação seguida de 200 envios iguais: todos recebem 204, fica 1 linha e 1 marco;
    - o DEC A no limite não bloqueia o DEC B;
    - D-14: com 599 linhas na janela (o que faltava foi posto num terceiro DEC), o 600º envio recebe 204 e o 601º
      recebe 429 total. As linhas do terceiro DEC são apagadas no `finally`;
    - 30 envios, um a cada 2 minutos: todos recebem 204;
    - com 59 linhas, dois envios ao mesmo tempo recebem `[204, 429]`.
  - **10.** Uma tabela liga cada status ao que o `enviarAndamento` faz com ele, sem importar o `.mjs`.
  - **11.** Cada chamada gera uma linha de log, conferida em 10 chamadas (de 204 a 429, mais o 403):
    - as chaves são exatamente as esperadas;
    - sem `ms` e `time`, o objeto é comparado inteiro;
    - a linha não traz `decId`, prefixo, `construindo`, `em_construcao`, `17`, token, texto do token depois do
      prefixo nem `wsod_`.

    Uma varredura confere também todas as linhas de log do arquivo.
- `src/app/api/pedidos-construcao/andamento-422.test.ts`: 24 testes, com 11 linhas que têm `expect(`.
  - O serviço é trocado por `vi.mock`, e a troca falha se o serviço for chamado.
  - São 22 corpos: todos os do CA-02.2, mais `__proto__` e `1e400`. Cada um recebe 422 `nao_processavel`.
  - A `foto` é idêntica para o DEC com pedido gerado e para o inexistente. O serviço não é chamado, e o total de
    eventos não muda.
  - No controle, o corpo válido chega ao serviço trocado (1 chamada, com o `decId` e o corpo). Isso prova que o "não
    chamado" não vem de um mock desligado.
- `test/transversal/sentinelas-andamento.test.ts` (D-05): 1 teste, com 20 linhas que têm `expect(`. A captura é a de
  `sentinelas.test.ts` (pino, console, Sentry falso e todas as tabelas de `pgboss`), mais `andamento_construcao` por
  `row_to_json` e `antes`/`depois` de `evento`. O fluxo:
  - a sentinela `SENTINELA-ANDAMENTO-7c1e` vai como valor de chave a mais, como nome de chave, como `fase` e como
    `status`, e cada um recebe 422;
  - um envio válido recebe 204;
  - um 503 provocado (com a trava do pedido presa) põe um envelope no Sentry;
  - o Awave lê uma demanda dele que tem andamento gravado.

  Para o teste não passar no vazio, ele exige:
  - as linhas de log da rota `[422, 422, 422, 422, 204, 503]`;
  - ao menos 1 envelope no Sentry;
  - 2 linhas de andamento, 1 marco e 8 respostas.

  O que ele confere:
  - nenhuma saída traz a sentinela, as sentinelas da 0.3.0, os tokens nem o texto deles depois do prefixo;
  - log, eventos, `pgboss` e andamento também não trazem `wsod_`.

### Arquivos modificados

- `test/pedidos-construcao.ts`: `chamadasDoConstruir` ganhou `andamento(decId, corpo, op)`, como no plano. Um
  comentário mudou de "As três rotas" para "As rotas".
- `test/estatico/piso-de-assercoes.test.ts`: o `PISO` ganhou os três arquivos novos (95, 11 e 20). Nenhuma entrada
  desceu.

`test/matriz-rotas.test.ts` e `test/matriz-rotas-integracoes-qa.test.ts` não mudaram. Eles encontram a rota nova
sozinhos (CA-01.4) e passaram na suíte completa.

### Teste escrito antes, visto falhando

Comando: `pnpm --dir <repo> test src/app/api/pedidos-construcao test/transversal/sentinelas-andamento.test.ts --reporter=dot`.
Rodei antes de criar `route.ts`:

```
 FAIL  src/app/api/pedidos-construcao/andamento.test.ts [ ... ]
Error: Cannot find module '../src/app/api/pedidos-construcao/[decId]/andamento/route' imported from .../test/pedidos-construcao.ts
 FAIL  src/app/api/pedidos-construcao/andamento-422.test.ts [ ... ]
 FAIL  test/transversal/sentinelas-andamento.test.ts [ ... ]
 Test Files  9 failed (9)
      Tests  no tests
```

Os outros seis arquivos da pasta também falharam, porque importam `test/pedidos-construcao.ts`.

Na primeira rodada com a rota, 2 testes falharam. Os dois eram erros do próprio teste, e corrigi:
- o total de eventos era medido antes de criar os tokens e as sessões, que gravam eventos;
- o 415 sai antes de o ator ser resolvido (C-15), então a linha de log tem `atorTipo: 'anonimo'`.

Depois disso: 107 de 107.

### Os testes pegam o erro (mutação plantada e desfeita)

Plantei uma mutação na rota: tirei `params` e `corpoInvalido`, e o `decId` passou a ser lido da URL. Com ela,
**25 testes falharam**:
- os 22 corpos do 422, que passaram a receber 400;
- o "sem tocar o banco" do `DEC-xyz`, com `connect` chamado 2 vezes;
- o 422 da tabela do `/construir`;
- o 422 do teste de log.

Desfiz a mutação. O `route.ts` final é o do plano.

### Resultado

- Testes da tarefa (os 9 arquivos de `src/app/api/pedidos-construcao` e o de sentinelas): **107 de 107**.
- `pnpm test` completo: **331 arquivos, 7422 testes, 0 falharam** (198,88 s).
- `pnpm lint` e `pnpm typecheck`: limpos.
- G4 (`git diff 0ac099a --stat` das superfícies congeladas): vazio.
- `git status --short`: só os 6 itens da tarefa (4 arquivos novos e 2 modificados).

### Desvios do plano

- **Caso 11, `atorTipo`.** O plano pede `atorTipo: 'integracao'` em toda linha. Mas o 404 de `DEC-xyz` (C-17) e o 415
  (C-15) saem do `rota()` antes de o ator ser resolvido, e por isso a linha deles traz `anonimo`, como em toda rota. O
  teste fixa o `atorTipo` esperado de cada chamada. O `time` do pino, que vem do relógio real, fica fora da comparação
  de texto, como o `ms`.
- **Caso 5, a mais que o plano.** Entram os oito casos do teste de QA da T07 (pedido da 06-T07-qa-automacao), em vez
  dos quatro do plano. Cada caso vai com dois corpos, e há o controle da vítima. A lista dos cabeçalhos do 404 também é
  fixada.
- **422.**
  - O plano lista 13 corpos. O teste usa os 22 do CA-02.2 e manda todos como texto JSON.
  - No plano, o item `'texto'` iria cru e receberia 400 (JSON malformado). O CA-02.2 pede a string JSON `"texto"`, que
    aqui vai como `JSON.stringify('texto')`.
  - O DEC "existente" é um DEC com pedido gerado de verdade (`prepararDec`), e não um id fixo.
  - Há um controle com corpo válido, e um `beforeEach` com `mockClear`, para nenhum teste depender da ordem.
- **CA-12.3 (D-14).** O teste conta as linhas que já estão na janela e completa até 599 exatas, para provar a borda
  600/601. As linhas do terceiro DEC são apagadas pelo migrator no `finally`, para o arquivo não depender da ordem.
- **Sentinelas.** Acrescentei um 503 provocado, para o Sentry falso receber um envelope. Sem ele, "nenhuma sentinela no
  Sentry" seria uma asserção que passa no vazio.
- **Minor 2 da 06-T04-revisao** (comentário de `src/lib/rota-corpo-invalido.test.ts`). Não mexi: o arquivo não é da
  T08, e a 06-T04-qa-automacao deixou esse ajuste para a `08-revisao`.

## Decisões tomadas

- **A rota é o código do plano, sem lógica própria.** O 404, o 409, o 429 e o 503 vêm do serviço (T07) e do `rota()`.
  A rota só liga a regex, o corpo fechado e o 422.
- **"Sem consulta" no `DEC-xyz` provado por espião no pool do app.** É mais forte que comparar o retrato do banco, e a
  mutação mostrou que pega o erro.
- **O 422 em arquivo próprio, com `vi.mock`.** O mock não chega aos testes que precisam do serviço real.
- **O limite total é controlado dentro do próprio caso.** O teste conta as linhas da janela e apaga as do terceiro DEC
  no fim. O `relogio.avancar` do CA-12.4 só leva o relógio para frente, e isso não quebra nenhum outro caso.
- **Comandos `pnpm` com `--dir <repo>`.** É a forma das entregas anteriores deste pedido, porque `cd` não está na lista
  Pode.

## Pendências

- Nenhuma bloqueia a passagem.
- **Para o maestro (forma de comando).** Rodei quatro comandos só de leitura fora da forma da lista Pode. Eles estão em
  Comandos executados, do jeito que rodaram. Nenhum alterou nada. Peço a liberação como leitura (regra de 25/10):
  - um `grep -n` sem `-r` sobre o plano, que é arquivo rastreado do repositório;
  - um `grep -n` sem `-r` e com `\|` sobre `01-analista-requisitos.md`, na pasta do pedido;
  - um `grep -n` sobre `estruturaAutonoma/ferramentas/construir/lib/buscar-pedidos.mjs`, arquivo rastreado da
    estruturaAutonoma que eu deveria ter lido com a ferramenta Read. Logo depois li o trecho pelo Read;
  - um `git grep` com `\(GET\|POST\|PATCH\)` no padrão, que é uma alternativa.
- **Para a `06-T08-revisao`:**
  - a G4 saiu vazia;
  - entre os testes que já existiam, mudaram só os dois arquivos que a T08 lista. Os dois só ganharam linhas, fora uma
    palavra a menos num comentário;
  - a contagem de `expect(` está acima.
- **Para a `06-T09`:** nas sentinelas, a leitura do Awave já passa por uma demanda com andamento gravado. Quando a vista
  ganhar a chave `andamento`, o mesmo teste confere que ela não leva sentinela nem token.
- **Para a `08-revisao`:** o Minor 2 da 06-T04-revisao continua aberto (comentário de topo de
  `src/lib/rota-corpo-invalido.test.ts`).
- Nenhuma migration rodou, e nada tocou banco fora do Testcontainers.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — entregas da pasta do pedido
- `grep -n "T08" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md` — onde está a T08 no plano (fora da forma: sem `-r`; só leitura)
- `grep -rn "T08" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — Pendências que citam a T08
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — último commit `d6f1ac9` (06-T07-testes)
- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/app/api/pedidos-construcao` — testes vizinhos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/app/api/pedidos-construcao/[decId]/recebimento/route.ts` — molde da rota
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/lib/corpo.ts` — 400 e 413
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/lib/erros.ts` — status de cada código
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/andamento/registrar.ts` — o serviço
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "foto" -- src/app/api/demandas/visibilidade-agente-0019.test.ts` — a função `foto`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/sentinelas.ts` — sentinelas da 0.3.0
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A45 "export const LIMITE_ANDAMENTO" -- src/modules/limites.ts` — mensagens e contagem do limite
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/banco.ts` — banco por arquivo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/integracoes.ts` — token de integração
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/deps.ts` — deps de teste
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "andamento/route" -- test src` — guardas que já citam a rota
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "corpoInvalido" -- src/lib/rota-corpo-invalido-qa.test.ts` — guarda da opção literal
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/matriz-rotas.test.ts` — a rota nova entra sozinha
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "it(" -- test/matriz-rotas-integracoes-qa.test.ts` — títulos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export" -- test/sessao.ts src/modules/acesso/ator.ts src/modules/acesso/mensagens.ts` — `criarPessoa`, `AGENTES`, `PAPEIS`
- `grep -n "CA-12\|CA-02\|CA-03\|CA-01\|RNF-04\|RNF-07\|RNF-03" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1/01-analista-requisitos.md` — critérios da T08 (fora da forma: alternativa e sem `-r`; só leitura)
- `grep -n "export" /home/deploy/servidor/projetos/estruturaAutonoma/ferramentas/construir/lib/buscar-pedidos.mjs` — exportações do `chamar` (fora da forma: arquivo da estruturaAutonoma por grep; só leitura)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/lib/log.ts` — chaves da linha do pino
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/lib/sentry.ts` — `capturarErro`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -i "expira" -- src/modules/acesso/resolver-ator.ts src/modules/acesso/tokens-servico.ts` — sem resultado (o token não expira, então o `relogio.avancar` não o invalida)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "JANELA_MS =" -- src/modules/limites.ts` — 3.600.000 ms
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export const \(GET\|POST\|PATCH\)" -- src/app/api/demandas/route.ts src/app/api/demandas/[id]/route.ts` — métodos das rotas de demandas (fora da forma: alternativa; só leitura)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:drizzle/0008_slippery_whirlwind.sql` — FK de `dec_id` para `pacote_decisao`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:vitest.config.ts` — 30 s por teste
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pedidos-construcao test/transversal/sentinelas-andamento.test.ts --reporter=dot` — antes da rota: 9 arquivos falharam, sem testes (trecho acima)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pedidos-construcao test/transversal/sentinelas-andamento.test.ts --reporter=dot` — com a rota: 2 falharam e 105 passaram (erros do teste, corrigidos)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pedidos-construcao test/transversal/sentinelas-andamento.test.ts --reporter=dot` — 107 de 107
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pedidos-construcao/andamento.test.ts src/app/api/pedidos-construcao/andamento-422.test.ts --reporter=dot` — com a mutação plantada: 25 falharam e 16 passaram (mutação desfeita em seguida)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c --untracked "expect(" -- src/app/api/pedidos-construcao/andamento.test.ts src/app/api/pedidos-construcao/andamento-422.test.ts test/transversal/sentinelas-andamento.test.ts` — 95, 11 e 20
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — 1 aviso (constante sem uso no teste; removida)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot --silent` — 331 arquivos, 7422 de 7422 (rodou em segundo plano; saída lida com a ferramenta Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0ac099a --stat -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/db/transacao.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/agentes/entrada-agente.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/pacotes-decisao/consultas.ts next.config.ts 'drizzle/000[0-7]_*.sql' 'drizzle/meta/000[0-7]_snapshot.json'` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 4 novos e 2 modificados, todos da tarefa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — `piso-de-assercoes.test.ts` +4; `pedidos-construcao.ts` +16 −1
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n --untracked "registrar_andamento" -- src/app/api/pedidos-construcao/[decId]/andamento/route.ts` — a rota cita a ação uma vez (está em `CITAM_A_ACAO`)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- test/pedidos-construcao.ts` — só o import, a chamada `andamento` e uma palavra do comentário
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo, depois do último ajuste

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
