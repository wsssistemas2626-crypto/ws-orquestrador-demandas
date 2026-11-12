---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T06-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G8, T05, T06, T07 e T08), 01-analista-requisitos.md (RF-01 a RF-12), 02-arquiteto-solucoes.md (seções 0 e 1), 03-ux-ui-design.md (seções 0 a 11), 04-seguranca-aplicacao.md (seções 2 a 6, Pendências), 06-T01-engenheiro-dados-bd.md (Resultado), 06-T01-tech-lead.md, 06-T01-qa-automacao.md, 06-T02-engenheiro-backend.md, 06-T02-tech-lead.md, 06-T02-qa-automacao.md, 06-T03-engenheiro-backend.md, 06-T03-tech-lead.md, 06-T03-qa-automacao.md, 06-T04-engenheiro-backend.md, 06-T04-tech-lead.md, 06-T04-qa-automacao.md, 06-T05-engenheiro-backend.md, 06-T05-tech-lead.md, 06-T05-qa-automacao.md, src/modules/demandas/servico.ts, src/modules/demandas/consultas.ts, src/modules/demandas/schemas.ts, src/modules/demandas/gerar-id.ts, src/modules/acesso/ator.ts, src/modules/acesso/mensagens.ts, src/modules/acesso/resolver-ator.ts, src/modules/acesso/tokens-servico.ts, src/modules/acesso/ramos-por-ator.test.ts, src/modules/acesso/ramos-por-ator-qa.test.ts, src/modules/agentes/gatilhos.ts, src/modules/agentes/gatilhos.test.ts, src/modules/agentes/teto.ts, src/modules/integracoes/tempo-limite.ts, src/modules/integracoes/tempo-limite-qa.test.ts, src/modules/limites.ts, src/db/index.ts, src/db/schema/demandas.ts, src/db/schema/historico.ts, src/lib/rota.ts, src/lib/erros.ts, src/lib/relogio.ts, src/app/api/demandas/route.ts, src/app/api/demandas/[id]/historico/route.ts, src/app/api/demandas/leitura-awave.test.ts, src/app/api/agentes/route.ts, test/banco.ts, test/deps.ts, test/integracoes.ts, test/requisicao.ts, test/sessao.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T06: o Awave cria demanda pelo `POST /api/demandas` com autoria `integracao`/`awave`, lista de permissão de campos,
sem disparo do insumo técnico, limite de 10 por hora, orçamento de tempo e o contrato da tool do Awave intacto (RF-04,
RF-05 na criação, RF-08, RF-09, RF-11 pela API, RNF-08, IN-05, IN-06 na criação, IN-09 pela rota, IN-12, IN-14,
IN-15). As pendências das entregas 06-T01 a 06-T05 que citam a T06 estão fechadas (lista em Decisões tomadas).

### Arquivos alterados

| Arquivo | O que mudou | G8 |
|---|---|---|
| `src/modules/demandas/servico.ts` | Entram `autoriaDaDemanda` (exportada; `switch` com `never`: pessoa e agente por `autoriaDo`, `awave` → `integracao`/`awave`, `construir` e sistema lançam `sem_permissao`), `camposDaEntrada` (lista de permissão: da integração só `titulo`, `tipo`, `solicitantePapel`, `contexto` e `descricaoProblema` do corpo; `solicitanteNome` = `NOME_DA_INTEGRACAO`, `anexos` e `duvidasEntrada` vazios, os outros quatro nulos; pessoa e agente com os campos de hoje; sistema lança), `dispararAoCriar` (só pessoa e agente chamam `dispararSeLigado`; integração não dispara; sistema lança) e `naTransacaoDaCriacao` (integração por `executarComOrcamento(deps.pool, ator, 'padrao', t, …)`; pessoa, agente e sistema pela transação de hoje). `criarDemanda` usa as quatro, grava campo a campo e `rascunhoAgente: autorTipo !== 'pessoa'`. `autoriaDo` passa a usar `semPermissao()` (Minor 4 da 06-T02-revisao) | #6, #7 |
| `src/modules/demandas/consultas.ts` | `vistaDaDemandaPara`: o caso `integracao` devolve `vistaDaIntegracao(d)` só quando a demanda é da própria integração (`responsavel`), e lança `sem_permissao` nos outros casos. Três assinaturas de sobrecarga mantêm o tipo de retorno de hoje para quem passa pessoa, agente ou sistema | #10 |
| `src/modules/acesso/ramos-por-ator.test.ts` | G5: o caso "D-01: a vista da demanda para integração lança até a T06" passou a "T06: a vista da demanda para integração tem as seis chaves, só para a integração que a criou" (2 linhas com `expect(` viraram 4) | — |
| `test/integracoes.ts` | `CORPO_DO_AWAVE` (G7), o corpo da tool do Awave com texto fictício | — |

A rota `POST /api/demandas` não mudou: ela já devolve `vistaDaDemandaPara(ator, await criarDemanda(...))`.

### Testes criados (21, em 2 arquivos)

`src/app/api/demandas/contrato-awave.test.ts` (6 testes): rota real, token `awave` real, requisição montada como a
tool manda (Bearer, JSON, `accept`, sem `Origin`, sem cookie).

1. CA-04.1, CA-09.1 e CA-07.4: 201, `content-type` JSON, id `DEM-AAAAMMDD-NNNN`, `status: nova` e exatamente as seis chaves.
2. CA-07.4: o corpo do 201 é igual ao do `GET /api/demandas/:id` do Awave.
3. CA-09.2: o mesmo 201 pelo endereço interno `http://orquestrador_app`.
4. CA-09.4: com cookie qualquer e sem `Origin`, 403 `sem_permissao` (C-15 sem mudança).
5. CA-01.3: token que não existe, 401 com a mensagem de hoje.
6. Erro no formato `{ erro, mensagem }`, sem `location` (nunca 3xx).

`src/app/api/demandas/criacao-awave.test.ts` (15 testes): cada `describe` tem banco, relógio fixo e token próprios.

1. G8 #6: `autoriaDaDemanda` para awave, construir, sistema, tipo desconhecido, pessoa e agente.
2. CA-04.2 a CA-04.4 e IN-05: corpo com `solicitanteNome: 'Maria Ficticia'`, `autorTipo`, `autorId`, `rascunhoAgente: false`, anexo de URL, `urgencia`, `linhaServicoProvavel`, `justificativaUrgencia`, `impactoPercebido` e `duvidasEntrada` → 201; a linha do banco tem a autoria do awave, rascunho, "Awave", anexos e dúvidas vazios, os quatro campos nulos e nenhuma sentinela.
3. IN-05: o `solicitantePapel` vem do corpo (está na lista).
4. CA-04.5 e IN-12: um `demanda_criada` com `integracao`/`awave`, o prefixo do token e `depois` exatamente `{ status: 'nova', tipo: 'melhoria' }`; nada do título, da descrição, do contexto nem do token depois do prefixo. A pessoa lê o mesmo evento em `GET /api/demandas/:id/historico`, com o Awave e o prefixo, sem o texto livre nem o token.
5. CA-04.6: tipo fora da lista e corpo sem título → 400; `demanda_seq`, demandas e eventos iguais.
6. IN-14: com a trava `limite:demanda:integracao:awave` segura por outra conexão, 503 com `MENSAGEM_INDISPONIVEL` e nada gravado; sem a trava, 201 (controle).
7. IN-14: a linha de log do POST é só `{ level, evento, metodo, rota, status, atorTipo: 'integracao' }`, sem prefixo, token, "awave", id nem título.
8. CA-01.3 e CA-01.4: um segundo token do Awave dá 201, é revogado e passa a 401 sem gravar nada; o primeiro token do Awave e um de agente continuam criando (201); o do `/construir` continua resolvendo como integração e recebe 403 (não 401); a sessão de uma pessoa continua criando (201).
9. CA-10.6: um agente lê a demanda do Awave com a vista mínima, `responsavel = { tipo: 'integracao', integracao: 'awave' }`, sem `solicitanteNome` nem `anexos`.
10. CA-05.1: com o `insumo_tecnico` ligado, preço vigente e teto livre, o POST do Awave não cria execução (nem pela chave `demanda:<id>` nem pela demanda) nem job.
11. CA-05.2: a mesma criação por pessoa, pela rota, cria a execução e o job (regressão).
12. CA-08.1 e CA-08.2: dez criações, uma por minuto, dão 201; a 11ª dá 429 com `MENSAGEM_LIMITE_AWAVE` e não gasta id nem grava; uma hora depois da primeira, passa uma e a seguinte volta a 429.
13. CA-08.3: com 10 do Awave na janela, uma pessoa cria 30 pela rota, e a 31ª recebe 429 com `MENSAGEM_LIMITE.demanda`.
14. CA-08.4: 11 POSTs simultâneos com a janela vazia dão exatamente dez 201 e um 429, e há 10 demandas do Awave.
15. CA-11.1 (API) e CA-11.3: depois de dez demandas do Awave, `GET /api/agentes` por pessoa lista só os quatro agentes, sem "awave"; `configuracao_agente` continua com 4 linhas, `uso_ia` e `execucao_agente` sem linha nova e a situação do teto igual.

### Teste antes do código (visto falhando)

`pnpm test src/app/api/demandas/contrato-awave.test.ts src/app/api/demandas/criacao-awave.test.ts src/modules/acesso/ramos-por-ator.test.ts`,
antes de mexer em `servico.ts` e em `consultas.ts`:

```
 ❯ src/modules/acesso/ramos-por-ator.test.ts (14 tests | 1 failed) 18ms
     × T06: a vista da demanda para integração tem as seis chaves, só para a integração que a criou 5ms
 ❯ src/app/api/demandas/contrato-awave.test.ts (6 tests | 3 failed) 361ms
     × CA-04.1, CA-09.1 e CA-07.4: 201 sem Origin, id DEM, status nova, as seis chaves 33ms
     × CA-07.4: as chaves e os valores do 201 são os mesmos do GET por id do Awave 6ms
     × CA-09.2: o mesmo pelo endereço interno http://orquestrador_app 6ms
{"level":30,...,"metodo":"POST","rota":"/api/demandas","status":403,...,"atorTipo":"integracao","codigoErro":"sem_permissao"}
 ❯ src/app/api/demandas/criacao-awave.test.ts (15 tests | 13 failed) 2411ms
     × o awave grava como integração; construir, sistema e tipo desconhecido são recusados; pessoa e agente como antes 7ms
     × CA-04.2 a CA-04.4: autoria, solicitante e rascunho fixos; o que está fora da lista é descartado, sem 400 30ms
     × CA-05.1: com o insumo_tecnico ligado, o POST do Awave não cria execução nem job 16ms
     × CA-08.4: 11 POSTs simultâneos com a janela vazia dão exatamente dez 201 e um 429
AssertionError: expected [ 403, 403, 403, 403, 403, 403, …(5) ] to deeply equal [ 201, 201, 201, 201, 201, 201, …(5) ]
 Test Files  3 failed (3)
      Tests  17 failed | 18 passed (35)
```

As falhas mostram o D-01 de antes: o POST do Awave dava 403, porque `autoriaDo` lançava para integração. Os 18 que
passaram antes do código são os 13 casos de `ramos-por-ator.test.ts` que a T06 não muda e cinco guardas declaradas, que
valem com ou sem a T06: CA-09.4 (403 com cookie sem `Origin`), CA-01.3 (401 com token inexistente), o 400 no formato
`{ erro, mensagem }`, CA-04.6 (400 sem gastar id) e CA-05.2 (a pessoa dispara o insumo técnico, que é regressão).

### Resultado final

- `pnpm test src/app/api/demandas/contrato-awave.test.ts src/app/api/demandas/criacao-awave.test.ts src/modules/acesso/ramos-por-ator.test.ts`: 3 arquivos, 35 de 35.
- `pnpm test` (rodada final, com o código e os testes desta entrega, sem mudança depois): **258 arquivos, 5582 de
  5582** passaram, 0 falharam. Antes eram 256 arquivos e 5561 testes; entraram 2 arquivos e 21 testes. Numa rodada
  anterior, um teste de cronômetro de `minimizar.test.ts`, fora da T06, falhou por 4,8 ms (ver Pendências). `servico.test.ts` (C-11), `limites.test.ts` (C-36), `vistas-para-agente.test.ts`,
  `demandas.test.ts`, `gatilhos.test.ts`, `leitura-awave.test.ts` e `leitura-awave-qa.test.ts` passaram sem mudança.
- `pnpm typecheck` e `pnpm lint`: limpos.
- `pnpm build`: compilou, sem rota nova, e não deixou arquivo rastreado alterado.
- G4: `git diff a9fd9b8 --stat` das superfícies congeladas e de `src/lib/rota.ts` saiu vazio.
- IN-16 (D-17): `git diff a9fd9b8 --stat` dos 16 testes mostra só os três da T03. A T06 não tocou nenhum.

### Desvios do plano

1. **`vistaDaDemandaPara` confere a autoria.** O plano manda o caso `integracao` devolver `vistaDaIntegracao(d)`. A
   entrega devolve só quando `d.responsavel` é a própria integração e, nos outros casos, mantém a recusa
   `sem_permissao` de antes. Hoje nenhum caminho chega lá com demanda de outro autor (o POST só devolve a demanda que o
   Awave acabou de criar, e o GET usa `lerDemandaPara`). A conferência é defesa em profundidade do IN-08 contra um uso
   futuro da função. Por isso o caso G5 de `ramos-por-ator.test.ts` monta a demanda com `responsavel` do Awave e ganhou
   três asserções: o `construir` e a demanda de pessoa e de agente continuam recusados.
2. **Sobrecarga de `vistaDaDemandaPara`.** O plano não fala do tipo de retorno. Com a vista de seis chaves no retorno, a
   união quebraria o `typecheck` de `ramos-por-ator-qa.test.ts`, que lê `.responsavel` e `.especificacoes` da vista do
   agente, e esse arquivo está fora do G5. As três assinaturas mantêm o tipo de hoje para pessoa, agente e sistema, e o
   tipo `DemandaVistaDaIntegracao` para integração. Não há mudança de comportamento.
3. **`executarComOrcamento` só para integração.** O plano diz que `criarDemanda` abre a transação por
   `executarComOrcamento` para todo ator. Para pessoa e agente, `limitarTempo` não faz nada, mas `traduzirTempoEsgotado`
   transformaria o 57014 do `statement_timeout` do pool de 500 em 503. Seria mudança de comportamento de ator que já
   existe (RNF-09). `naTransacaoDaCriacao` usa o orçamento só para integração e a transação de hoje para os outros.
4. **`camposDaEntrada` e `dispararAoCriar` lançam para `sistema`.** O plano põe o sistema com os campos de hoje. Ele
   nunca chega lá, porque `autorizar` e `autoriaDaDemanda` recusam antes. Lançar é a falha fechada.
5. **INSERT campo a campo a partir de `campos`**, e não `...campos` (G3.5).
6. **Testes além do texto do plano:** a conferência do histórico lido por pessoa no CA-04.5, o papel do corpo, o log
   (IN-14), o 201 comparado ao GET (CA-07.4), o caso CA-08.1 que avança um minuto por criação para provar que só a
   primeira sai da janela, e o controle sem trava no 503. Tudo reforça a T06.
7. **Um banco por `describe` em `criacao-awave.test.ts`.** O plano pede banco novo só no CA-08.4. A contagem do limite
   não tem teto superior de data (registro da 06-T04-testes). Assim, dois blocos que contam o awave no mesmo banco
   dependeriam de ordem. Com um banco por bloco, o arquivo não depende de ordem (padrão técnico, seção 7).

## Decisões tomadas

- Pendências das entregas anteriores que citam a T06, todas fechadas:
  - T02, T03 e T05: trocar o `throw` de `vistaDaDemandaPara` pela vista de seis chaves e ajustar o caso D-01 de `ramos-por-ator.test.ts` (G5). Feito, com o desvio 1.
  - 06-T03-revisao (parecer 2): teste pela rota real de que o Awave cria demanda e de que o token revogado dá 401 sem gravar. Feito no teste 1 do contrato (o 201 pela rota) e no teste 8 da criação (o token revogado dá 401 e nada muda no banco).
  - 06-T04-revisao: rota de integração com `executarComOrcamento` sem `t` de fora e `conferirLimite` no corpo. A rota chama `criarDemanda` sem `t`, então o orçamento é aplicado. O 503 está provado pela rota (teste 6).
  - 06-T04-testes: CA-08.1 sem id consumido pela rota e CA-08.4 pelo `POST /api/demandas`. Feito nos testes 12 e 14.
  - 06-T05-revisao e 06-T05-testes: CA-07.4 pela rota, com as chaves do 201 iguais às do GET. Feito nos testes 1 e 2 do contrato.
  - 06-T02-revisao (Minor 4): `autoriaDo` usa `semPermissao()`.
- A leitura do 201 (`obterDemanda` depois do COMMIT) continua como hoje para todo ator, fora da transação com orçamento.
  A rota não muda (plano). Ver Pendências.
- Nenhuma linha de log nova, nenhum pacote, variável de ambiente, migration nem GRANT. Os dados de teste são
  fictícios: "(fictício)", "Pessoa Ficticia", "Maria Ficticia", sentinelas `SENTINELA-…-a6f2` e domínio
  `sentinela-a6f2.test`. Os tokens nascem só no teste. As asserções sobre token e prefixo são `includes(...)` ou `===`
  com `toBe`, que na falha não imprimem o valor.
- A primeira rodada vermelha usou pipe. O maestro a liberou, porque só rodou teste e leu a saída, e ela foi refeita sem
  pipe; o trecho desta entrega vem da rodada refeita.
- Glob e Grep não estavam disponíveis nesta sessão. Li os arquivos com Read e, para achar arquivos, usei `git log -G`
  e `git log --diff-filter=A` no repositório do pedido.

## Pendências

- Nenhuma bloqueia a T06.
- **Para a T13 e a 08 (IN-14):** no POST do Awave, a leitura do 201 (`obterDemanda(deps.db, id)`) roda depois do
  COMMIT e fora do orçamento de tempo, com o `statement_timeout` de 10 s do pool. Um erro só nessa leitura daria 500
  com a demanda já gravada. É o mesmo risco residual de duplicata que a 04 (seção 6) já registra para o 201 perdido.
  Trazer a leitura para dentro da transação só para integração é uma mudança pequena em `criarDemanda`, se a revisão
  quiser.
- **Para a T08:** a guarda do IN-06 em `dispararSeLigado` e no passo 3c do worker continua com a T08. A T06 só tira o
  disparo da criação.
- **Para a 06-T06-testes:** o caso CA-08.4 depende do `lock_timeout` de 2 s, como a 06-T04-testes avisou. Na suíte
  inteira, as 11 transações seguradas pela trava levaram bem menos que isso. Se ficar instável numa máquina carregada,
  o 11º sai 503 em vez de 429.
- **Teste de tempo instável, fora da T06:** numa das rodadas da suíte inteira, o teste "20 mil e-mails colados por "_"
  viram 20 mil marcadores, em menos de 200 ms" de `src/modules/dados-pessoais/minimizar.test.ts` mediu 204,8 ms e
  falhou. O módulo não mudou neste ramo (`git diff a9fd9b8` vazio), o arquivo sozinho passou (273 de 273) e a rodada
  seguinte da suíte também passou. Fica o registro para a 08 ou para quem cuidar da suíte: é asserção por cronômetro,
  sensível à carga da máquina. Não mexi no teste (G3.2).
- O plano tem caixas `- [ ]` dos passos da T06, que não marquei: o G1 não deixa a 06 editar `docs/`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only 4b825dc642cb6eb9a060e54bf8d69288fbe7b904 HEAD` — falhou: hash da árvore vazia digitado errado ("bad object"); nada rodou
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261111-0016-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -15 --stat` — as passagens 06-T02 a 06-T05 e os arquivos de cada uma
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "IN-05" --name-only --format=%h -n 3 -- docs/construcao/DEC-DEM-20261111-0016-v1` — onde o IN-05 é citado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G vistaDaDemandaPara --name-only --format=%h -- src test scripts` — quem usa a vista da demanda
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "criarDemanda\(" --name-only --format=%h -- src scripts` — quem chama `criarDemanda`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --diff-filter=A --name-only --format=%h -- src/app/api/agentes src/modules/agentes/teto.ts src/lib/log.ts src/lib/erros.ts` — a rota de agentes, o teto, o log e os erros
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --diff-filter=A --name-only --format=%h -- test/sessao.ts test/auth.ts src/db/index.ts test/provedor-falso.ts` — os ajudantes de sessão e o pool
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/demandas/contrato-awave.test.ts src/app/api/demandas/criacao-awave.test.ts src/modules/acesso/ramos-por-ator.test.ts` — antes do código, em segundo plano, saída lida com Read: 3 arquivos falharam, 17 testes falharam e 18 passaram (trecho acima)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/demandas/contrato-awave.test.ts src/app/api/demandas/criacao-awave.test.ts src/modules/acesso/ramos-por-ator.test.ts` — depois do código: 3 arquivos, 35 de 35
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 258 arquivos, 5582 de 5582, código 0 (saída lida com Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 --stat -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts 'drizzle/000[0-6]_*.sql' 'drizzle/meta/000[0-6]_snapshot.json' src/lib/rota.ts` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 --stat -- src/modules/acesso/matriz.test.ts src/modules/acesso/matriz-qa.test.ts src/modules/acesso/resolver-ator.test.ts src/modules/acesso/resolver-ator-qa.test.ts src/modules/acesso/tokens-servico.test.ts src/modules/acesso/tokens-servico-qa.test.ts src/modules/demandas/servico.test.ts src/modules/historico/registrar.test.ts src/modules/limites.test.ts src/db/privilegios.test.ts src/app/api/vistas-para-agente.test.ts test/matriz-rotas.test.ts test/transversal/sentinelas.test.ts test/estatico/sem-controle-bidi.test.ts test/estatico/sem-recurso-externo.test.ts test/estatico/leituras-da-fila.test.ts` — só os três da T03 (IN-16)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 4 alterados e 2 novos, todos da T06
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo, depois do INSERT campo a campo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo, depois do INSERT campo a campo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 4 arquivos, 170 linhas a mais e 34 a menos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -3` — HEAD em f19c224 (06-T05-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — os arquivos da T06 e esta entrega
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- src/modules/acesso/ramos-por-ator.test.ts` — o diff do G5, nenhuma asserção a menos
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas build` — compilou, sem rota nova
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — o build não deixou arquivo rastreado alterado
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/demandas/criacao-awave.test.ts` — depois do caso do histórico no CA-04.5: 15 de 15
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 258 arquivos; 5581 passaram e 1 falhou: o teste de tempo de `minimizar.test.ts` ("20 mil e-mails … em menos de 200 ms") mediu 204,8 ms. O módulo não mudou no ramo e não é tocado pela T06 (ver Pendências)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 4 arquivos, 170 linhas a mais e 34 a menos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — os arquivos da T06 e esta entrega
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 --stat -- src/modules/dados-pessoais` — vazio: a minimização não mudou no ramo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -1` — HEAD em f19c224
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "em menos de 200 ms" --format=%h -n 2 -- src/modules/dados-pessoais/minimizar.test.ts` — o teste de tempo é anterior a este pedido (5bfa11a, 930b277)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 --stat -- src/modules/demandas` — `consultas.ts` (T02, T05, T06) e `servico.ts` (T02, T06)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/dados-pessoais/minimizar.test.ts` — sozinho: 273 de 273
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — rodada final, sem mudança de código: 258 arquivos, 5582 de 5582, 0 falharam (saída lida com Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — os arquivos da T06 e esta entrega, durante a rodada final
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 4 arquivos, 170 linhas a mais e 34 a menos, durante a rodada final

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (o corpo do POST passa por `criarDemandaSchema` em `rota()`, que não mudou; o 400, o 401, o 403, o 429 e o 503 têm mensagem fixa; nenhuma rota, Server Action ou job novo)
