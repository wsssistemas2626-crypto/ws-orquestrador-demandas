---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T16-construcao
agente: engenheiro-backend
leu: [contrato-passagem.md, pedido.json, padrao-tecnico.md, tarefas.json, 05-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e mapa das fases e T01 e T14 a T17 e T21), 06-T15-engenheiro-backend.md, 06-T15-tech-lead.md, 06-T11-engenheiro-backend.md (cabeçalho), src/lib/rota.ts, src/lib/rota.test.ts (início), src/lib/deps.ts, src/lib/erros.ts, src/lib/corpo.ts, src/modules/acesso/matriz.ts, src/modules/acesso/ator.ts, src/modules/acesso/exigir-pessoa.ts, src/modules/acesso/resolver-ator.ts, src/modules/demandas/servico.ts, src/modules/demandas/schemas.ts, src/modules/demandas/consultas.ts, src/modules/historico/consultas.ts, src/modules/historico/registrar.ts, src/db/schema/demandas.ts, src/app/api/saude/route.ts, test/requisicao.ts, test/deps.ts, test/banco.ts, test/sessao.ts, test/sentinelas.ts, test/matriz-rotas.test.ts, test/matriz-rotas-qa.test.ts, test/estatico/exigir-pessoa.test.ts, tsconfig.json, next-env.d.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T16: rotas de demanda e de histórico sobre o serviço da T15. Cobre RF-03, RF-06 e RF-07 pela API, RF-21 (leitura),
CA-01.3, CA-02.4, CA-03.1, CA-03.3, CA-06.2, CA-06.3, CA-07.4 e C-36 (400 não avança a sequência).

### Arquivos (os 4 do plano, todos novos; nenhum arquivo existente mudou)

- `src/app/api/demandas/route.ts`:
  - `POST` (`criar_demanda`, corpo `criarDemandaSchema`) → 201 `DemandaVista`;
  - `GET` (`listar_demandas`, query `filtroDemandasSchema`) → 200 `{ itens, total, limit, offset }`.
- `src/app/api/demandas/[id]/route.ts`:
  - `GET` (`ler_demanda`, `params: paramId.demanda`) → 200 `DemandaVista`;
  - `PATCH` (`alterar_demanda`, corpo `alterarDemandaSchema`) → 200 `DemandaVista`. O `Ator` é estreitado para
    `AtorPessoa` antes de `alterarDemanda` (pendência da T15).
- `src/app/api/demandas/[id]/historico/route.ts`: `GET` (`ler_historico`, `params: paramId.demanda`) → 200
  `{ itens: EventoVisivel[] }`. Demanda que não existe dá 404.
- `src/app/api/demandas/demandas.test.ts`: 38 testes de integração (Postgres real, Better Auth, tokens de serviço e
  relógio fixo).

As três rotas usam só `rota()`. O `meta.exemplo` sai do padrão da rota (`id: 'DEM-20261022-0001'`), como o plano pede
no passo 3. Assim `test/matriz-rotas.test.ts` e `test/matriz-rotas-qa.test.ts` passam a cobrir os 5 métodos exportados,
sem nenhuma mudança neles: 403 a cada ator que a matriz nega, 403 sem 2FA, 401 sem credencial, 404 com parâmetro
inválido, nenhum `HEAD` ou `OPTIONS`, e ação fixada de `PATCH /api/demandas/[id]` e de `/historico`.

### Testes criados (`demandas.test.ts`)

- **POST:**
  - CA-03.1: 201, id no formato, status `nova`, `responsavel` pessoa e `no-store`. A vista não traz `autorId`, `texto`
    nem `origem`, e a linha está no banco.
  - CA-03.3: 400 com os campos `tipo` e `titulo`. O corpo não tem pilha, SQL, nome de tabela nem o valor recebido.
  - C-36: o 400 deixa `last_value` e `is_called` de `demanda_seq` iguais. A criação válida seguinte usa o próximo número.
  - C-11: `id`, `status`, `autorTipo`, `autorId`, `rascunhoAgente` e `responsavel` vindos do corpo são descartados.
  - Token do orquestrador grava um rascunho de agente, mesmo com `rascunhoAgente: false` no corpo.
  - Token de outro agente recebe 403, sem gravar linha nem gastar número da sequência.
  - CA-01.3: 401 sem gravar.
  - JSON quebrado: 400 sem detalhe do parser.
  - C-15: `Origin` de outro site com cookie dá 403, sem gravar.
- **GET da lista:**
  - CA-06.1: filtro por tipo, com `total` e a ordem da mais nova para a mais antiga.
  - Filtros combinados, `limit` e `offset`, inclusive `offset` além do fim.
  - O item da fila tem só as 8 chaves do resumo, sem nenhum sentinela.
  - CA-06.2: `limit=500` dá 400 com o campo `limit`.
  - Status, tipo ou linha fora da lista, chave repetida e `offset` negativo dão 400.
  - Token de agente e a administradora leem (200). CA-01.3: 401.
- **GET por id:**
  - 200 sem texto bruto nem origem: um sentinela gravado em `entrada_bruta` pelo migrator não aparece.
  - Agente lê (200).
  - CA-06.3: `DEM-20261022-9999` dá 404 com a mensagem da 03.
  - Id fora do formato dá 404, com e sem credencial, no GET, no PATCH e no histórico, com zero chamadas a
    `poolApp.query` e a `poolApp.connect` (espião).
  - CA-01.3: 401.
- **PATCH:**
  - CA-06.4: devolve a vista e grava o evento com antes, depois e a pessoa (papel `cto`).
  - RF-07: a transição permitida grava `status_alterado`. Fora da tabela dá 409, e nem o título enviado junto muda.
  - CA-07.1 pela API: dá 409 com o motivo da 03, e o status não muda.
  - Corpo vazio, igual ao atual ou só com campos de autoria dá 400 "Nada foi alterado.".
  - Campo inválido dá 400 com os campos, sem o valor.
  - Id inexistente dá 404.
  - CA-07.4: os tokens do orquestrador e do risco dão 403, e nada muda.
  - A administradora altera (200).
  - C-15: sem `Origin`, 403.
- **Histórico:**
  - CA-02.4: a demanda criada pelo token do orquestrador mostra `demanda_criada` com o ator agente `orquestrador`. A
    resposta não traz o token nem o prefixo dele.
  - RF-21: a pessoa aparece por nome e papel, sem o id da conta, do mais novo para o mais antigo.
  - C-30 pela API: `PATCH` de `solicitanteNome`, `contexto` e `impactoPercebido` com sentinelas. O histórico não traz
    nenhum sentinela, só `{ alterado: true }`.
  - Token de agente dá 403, e a administradora lê. Demanda inexistente dá 404. CA-01.3: 401.
- **Log (C-21):** são 6 requisições e 6 linhas `requisicao`, com o padrão da rota e o status. Nenhuma linha tem id de
  demanda, query, token nem sentinela.

### TDD: teste antes, visto falhando

O teste foi escrito antes das rotas. Antes do código:

```
 FAIL  src/app/api/demandas/demandas.test.ts [ src/app/api/demandas/demandas.test.ts ]
Error: Cannot find module './[id]/historico/route' imported from .../src/app/api/demandas/demandas.test.ts
 Test Files  1 failed (1)
      Tests  no tests
```

Depois do código:

- o arquivo novo passou com 38 de 38;
- a suíte inteira passou com 82 de 82 arquivos e 1377 de 1377 testes, 0 falhas;
- `pnpm lint` e `pnpm typecheck` saíram limpos;
- `pnpm build` passou. O Next validou os tipos das três rotas dinâmicas, as primeiras de negócio feitas com `rota()`.
  O `typecheck` rodou de novo, limpo, com os tipos que o build gerou em `.next/types`.

### Desvios do plano

1. **O histórico de demanda inexistente responde 404**, e não `{ itens: [] }`. O plano não fixa esse caso. Com 404, a
   rota segue CA-06.3 e o GET por id, e a tela não mostra um histórico vazio de uma demanda que não existe. A existência
   é conferida com `obterDemanda`, a função de domínio que já existe, sem consulta nova.
2. **Estreitamento local `somentePessoa(ator)`** em `[id]/route.ts`, sem cast. Ele dá 403 com a mensagem da matriz se um
   não-pessoa chegar ali. Hoje isso não acontece, porque `rota()` já autorizou. Ficou no arquivo da rota porque a T16 só
   cria esses 4 arquivos.
3. **Há testes além dos trechos do plano**, listados acima: C-11 e C-15 pela API, o espião de "sem consulta", a vista
   sem sentinela de `entrada_bruta` e o log.

## Decisões tomadas

- **M-03 (`z.coerce.number()` em `limit` e `offset`) fica como está.** Trocar exigiria editar `schemas.ts`, arquivo da
  T15 fora desta tarefa. O valor final fica sempre dentro dos limites, então não há risco.
- **A vista vem de `responsavel`, nunca de autoria** (pendência da T15). As rotas devolvem a `DemandaVista` como o
  serviço monta. Um teste confere que `autorId` não sai.
- **O teste de "sem consulta" usa um espião em `poolApp.query` e `poolApp.connect`.** Ele prova C-17 de forma mais
  forte que o status 404 sozinho, porque a rota também não toca o Better Auth.
- **Relógio fixo, sem avançar.** São 24 criações por cookie do CTO, abaixo do limite de 30 por hora (C-36). Avançar o
  relógio mudaria a idade da sessão sem 2FA, que nenhum teste aqui usa.

## Pendências

- **T17, T21 e outras rotas que chamam serviço com `AtorPessoa`:** podem levar `somentePessoa` para
  `src/modules/acesso/` quando a segunda rota precisar dele, para não duplicar.
- **O aviso `[UNDICI-FETCH-patch]` na saída da suíte vem de um teste que já existia, com o método `patch` em
  minúsculas.** Não é desta tarefa: as rotas e o teste novo usam `PATCH`. Não quebra nada.
- **Itens da T15 que seguem com as tarefas donas:** M-01 (T18), M-02 e M-05 (T20) e M-04 (UX ou revisão).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-status --format=%h%x20%s -40` — arquivos dos últimos 40 commits, para achar o código das T11 a T15
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/demandas` — antes do código: 1 arquivo falhou (`Cannot find module './[id]/historico/route'`), sem testes rodados
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/demandas` — depois do código: 38 de 38
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 82 de 82 arquivos, 1377 de 1377 testes, 0 falhas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas build` — passou; as rotas `/api/demandas`, `/api/demandas/[id]` e `/api/demandas/[id]/historico` aparecem como dinâmicas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo, com os tipos gerados pelo build
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — só `src/app/api/demandas/` novo (os 4 arquivos)

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
