---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T05-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G8, T01 a T05), 06-T01-tech-lead.md, 06-T01-qa-automacao.md, 06-T02-engenheiro-backend.md, 06-T02-tech-lead.md, 06-T02-qa-automacao.md, 06-T03-engenheiro-backend.md, 06-T03-tech-lead.md, 06-T03-qa-automacao.md, 06-T04-engenheiro-backend.md, 06-T04-tech-lead.md, 06-T04-qa-automacao.md, src/modules/demandas/consultas.ts, src/modules/demandas/servico.ts, src/modules/demandas/schemas.ts, src/modules/demandas/transicoes.ts, src/modules/especificacoes/servico.ts, src/modules/especificacoes/schemas.ts, src/modules/integracoes/tempo-limite.ts, src/app/api/demandas/[id]/route.ts, src/app/api/vistas-para-agente.test.ts (cabeçalho), src/lib/rota.ts, src/lib/erros.ts, src/lib/log.ts, src/lib/deps.ts, test/deps.ts, test/integracoes.ts, test/requisicao.ts, test/sentinelas.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T05: o Awave lê só a demanda que criou, em seis chaves (RF-07, IN-08, ADR-23, D-16). Esta entrega também fecha o
item obrigatório da 06-T03-revisao (parecer 3), que a 06-T03-testes repetiu: **com token `awave`, o GET por id de
demanda de outro autor responde igual ao de demanda inexistente.** Antes, a primeira dava 403 e a segunda 404. Agora
as duas dão o mesmo 404. O status, todos os cabeçalhos, o corpo byte a byte e a linha de log são iguais, porque as
duas respostas saem da mesma consulta.

### Arquivos alterados

| Arquivo | O que mudou | G8 |
|---|---|---|
| `src/modules/demandas/consultas.ts` | Entram `DemandaVistaDaIntegracao`, `vistaDaIntegracao` (seis chaves montadas uma a uma, com o título pelo M-1), `obterDemandaDaIntegracao` (autoria `integracao`/<nome> no mesmo `WHERE` do id; sem linha, `nao_encontrado` com `MENSAGEM_NAO_ENCONTRADO`) e `lerDemandaPara`. Esta última é um `switch` com `never`: a integração lê por `executarComOrcamento(deps.pool, ator, 'padrao', undefined, …)` e nunca passa por `obterDemanda`; pessoa, agente e sistema seguem com `vistaDaDemandaPara(obterDemanda(...))`, como hoje. `vistaDaDemandaPara` não mudou e continua lançando para integração até a T06 (D-01) | #12 |
| `src/app/api/demandas/[id]/route.ts` | O GET passa a chamar `lerDemandaPara(deps, ator, params.id)`. O comentário do cabeçalho cita o IN-08. O PATCH não mudou | — |

### Teste criado

`src/app/api/demandas/leitura-awave.test.ts`: 9 testes, com Postgres real, rota real e tokens `awave` e `construir`
gerados em tempo de teste.

1. CA-07.1: resposta 200 com exatamente as seis chaves e os valores da demanda (datas em ISO). O texto não traz sentinela, "Awave", autoria nem rascunho.
2. CA-07.3: depois de uma pessoa trocar o título, o status e o solicitante, o Awave vê o título e o status atuais, sem nenhuma sentinela.
3. M-1: o título sai minimizado pelo solicitante atual.
4. ESP de pessoa na demanda do Awave: o Awave continua vendo só as seis chaves, sem a sentinela da `descricaoObjetiva` e sem o id da ESP (o caso que o plano manda acrescentar).
5. Controle: as demandas de pessoa e de agente existem e o id inexistente não existe. Assim o 404 do teste seguinte não vem de id errado.
6. CA-07.2: demanda de pessoa e de agente dão o mesmo 404 do id inexistente, no status, em todos os cabeçalhos e no corpo byte a byte, com o corpo `{ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO }`.
7. Linha de log: para os três casos, a linha por requisição é igual, sem `time` e `ms`: `status 404`, `atorTipo integracao`, `codigoErro nao_encontrado`. O log não deixa distinguir os casos.
8. Status final: a demanda encerrada do Awave continua legível por ele, e a demanda encerrada de pessoa continua com o 404 igual ao do inexistente.
9. O token `construir` continua com 403 na leitura de demanda, inclusive na do Awave e na do id inexistente.

### Teste antes do código (visto falhando)

`pnpm test src/app/api/demandas/leitura-awave.test.ts`, antes de mexer em `consultas.ts` e no `route.ts`:

```
 ❯ src/app/api/demandas/leitura-awave.test.ts (9 tests | 7 failed) 820ms
     × CA-07.1: 200 com exatamente as seis chaves e os valores da demanda 85ms
     × CA-07.3: vê título e status atuais, e nenhum texto livre, nome ou versão 71ms
     × M-1: o título sai minimizado pelo solicitante atual 50ms
     × a ESP gravada por pessoa na demanda do Awave não aparece para ele 55ms
     × CA-07.2: demanda de pessoa e de agente dão 404 igual, byte a byte, ao de um id que não existe 34ms
     × a linha de log da recusa é a mesma para demanda de outro autor e para id inexistente 18ms
     × demanda do Awave em status final continua legível só por ele, e a de outro autor em status final continua 404 35ms
AssertionError: expected 403 to be 200 // Object.is equality
AssertionError: DEM-20261022-0001: expected { status: 403, …(2) } to deeply equal { status: 404, …(2) }
-   "corpo": "{\"erro\":\"nao_encontrado\", …
+   "corpo": "{\"erro\":\"sem_permissao\", …
      Tests  7 failed | 2 passed (9)
```

A segunda falha mostra o oráculo do parecer 3: 403 para a demanda de outro autor e 404 para a inexistente. Dois
testes passaram antes do código, e os dois são guardas declaradas. O controle de existência (5) prova que os outros
testes não são vazios. O 403 do `construir` (9) prova algo que a T05 não pode mudar.

### Resultado final

- `pnpm test src/app/api/demandas/leitura-awave.test.ts`: 9 de 9.
- `pnpm test`: **255 arquivos, 5554 de 5554** passaram, 0 falharam. Antes eram 254 arquivos e 5545 testes. Entraram
  1 arquivo e 9 testes. `demandas.test.ts` e `vistas-para-agente.test.ts` passaram sem mudança.
- `pnpm typecheck` e `pnpm lint`: limpos.
- `pnpm build`: compilou sem erro e não deixou arquivo rastreado alterado.
- G4: `git diff a9fd9b8 --stat` das superfícies congeladas e de `src/lib/rota.ts` saiu vazio.
- IN-16 (D-17): `git diff a9fd9b8 --stat` dos 16 testes mostra só os três da T03. A T05 não tocou nenhum.

### Desvios do plano

1. **Uma demanda do Awave por teste** (ids `DEM-20261022-0901` a `0906`), e não uma só (`ID_AWAVE`) compartilhada. No
   plano, o CA-07.1 espera título e status originais e o CA-07.3 os altera, então o arquivo dependia da ordem dos
   testes. O padrão técnico (seção 7) pede teste que não dependa de ordem. As asserções do plano estão todas lá.
2. **Mais asserções e testes além do texto do plano.** O CA-07.1 compara os seis valores e não só três. O CA-07.2
   compara todos os cabeçalhos, e não só o `content-type`. Entraram o controle de existência, a linha de log, o status
   final e o 403 do `construir`. Tudo isso só reforça a T05 e a conferência obrigatória da revisão.
3. **O CA-07.1 não tem a demanda com contexto e descrição sentinela compartilhada com o CA-07.3.** Cada um insere a
   própria. Não há perda: os dois conferem a ausência de `SENTINELA`.

## Decisões tomadas

- `lerDemandaPara` decide pelo tipo do ator antes de qualquer leitura. Pela integração, a autoria fica no `WHERE`. A
  demanda de outro autor e o id inexistente são o mesmo "nenhuma linha", e não sobra ramo nem leitura a mais que crie
  diferença de status, corpo, log ou número de consultas.
- A leitura da integração roda em `executarComOrcamento` sem `t` de fora, com orçamento `'padrao'`, como pede a
  pendência da 06-T04-revisao. O 57014 e o 55P03 viram o 503 fixo do D-03.
- `vistaDaDemandaPara` continua lançando `sem_permissao` para integração. Quem troca isso pela vista de seis chaves é a
  T06 (D-01, G5). O GET da integração não chega mais a essa função (D-16).
- `vistaDaIntegracao` fica exportada com a assinatura do G7, para a T06 usar no 201 do POST.
- Nenhuma linha de log nova, nenhum pacote, variável de ambiente, migration nem GRANT. Os dados de teste são
  fictícios: "(fictício)", "Pessoa Ficticia", "Maria Ficticia", sentinelas `SENTINELA-…-9d1e` e conta
  `wsssistemas2626-crypto/meu-sistema`, a mesma de `vistas-para-agente.test.ts`. Os tokens só nascem no teste e nunca
  vão para mensagem de `expect`.

## Pendências

- Nenhuma bloqueia a T05.
- Para a revisão da T05 (o item obrigatório da 06-T03-revisao): coberto pelos testes 6 e 7 de
  `leitura-awave.test.ts`. A resposta e a linha de log são iguais para a demanda de pessoa, para a de agente e para o
  id inexistente.
- Para a T06: trocar o `throw semPermissao()` do caso `integracao` em `vistaDaDemandaPara` por
  `vistaDaIntegracao(d)` e ajustar o teste "D-01" de `ramos-por-ator.test.ts` (G5). O CA-07.4 (o 201 com as seis
  chaves) fica lá.
- Não testei a tradução do tempo esgotado na leitura (503), porque o caminho é o `executarComOrcamento` da T04, que já
  tem os testes dele. Se a 06-T05-testes quiser cobrir pela rota, um `pg_sleep` não cabe na leitura. O caminho seria uma
  trava sobre a linha da demanda, mas o `SELECT` simples não pede trava, então não há 55P03 a provocar sem mudar o
  código.
- O plano tem caixas `- [ ]` dos passos da T05, que não marquei: o G1 não deixa a 06 editar `docs/`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261111-0016-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -20 --name-only -- docs/construcao/DEC-DEM-20261111-0016-v1` — as entregas 06-T01 a 06-T04, para ler as Pendências
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "export async function criarEspecificacao" --name-only --format=%h -n 3 -- src` — `src/modules/especificacoes/servico.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- test src/app/api/demandas` — os ajudantes de teste e as rotas de demanda
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/demandas/leitura-awave.test.ts` — antes do código: 7 falharam, 2 passaram (trecho acima)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/demandas/leitura-awave.test.ts` — depois do código: 9 de 9
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 255 arquivos, 5554 de 5554, código 0 (saída lida com Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 --stat -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts 'drizzle/000[0-6]_*.sql' 'drizzle/meta/000[0-6]_snapshot.json' src/lib/rota.ts` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 2 alterados e 1 novo, todos da T05
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 --stat -- src/modules/acesso/matriz.test.ts src/modules/acesso/matriz-qa.test.ts src/modules/acesso/resolver-ator.test.ts src/modules/acesso/resolver-ator-qa.test.ts src/modules/acesso/tokens-servico.test.ts src/modules/acesso/tokens-servico-qa.test.ts src/modules/demandas/servico.test.ts src/modules/historico/registrar.test.ts src/modules/limites.test.ts src/db/privilegios.test.ts src/app/api/vistas-para-agente.test.ts test/matriz-rotas.test.ts test/transversal/sentinelas.test.ts test/estatico/sem-controle-bidi.test.ts test/estatico/sem-recurso-externo.test.ts test/estatico/leituras-da-fila.test.ts` — só os três da T03 (IN-16)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 2 arquivos, 62 linhas a mais e 4 a menos
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas build` — compilou, código 0
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — o build não deixou arquivo rastreado alterado

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (o id do GET passa pela regex de `paramId.demanda` em `rota()`; o 404 tem a mensagem fixa `MENSAGEM_NAO_ENCONTRADO`; nenhuma rota, Server Action ou job novo)
