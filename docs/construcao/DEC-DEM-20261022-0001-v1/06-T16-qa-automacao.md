---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T16-testes
agente: qa-automacao
leu: [contrato-passagem.md, pedido.json, padrao-tecnico.md, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e mapa das fases e T15 e T16 e T17), 01-analista-requisitos.md (RF-01 a RF-24), 06-T15-qa-automacao.md, 06-T16-engenheiro-backend.md, 06-T16-tech-lead.md, git show 90ad586, src/app/api/demandas/route.ts, src/app/api/demandas/[id]/route.ts, src/app/api/demandas/[id]/historico/route.ts, src/app/api/demandas/demandas.test.ts, src/lib/rota.ts, src/lib/erros.ts, src/lib/corpo.ts, src/lib/relogio.ts, src/modules/demandas/schemas.ts, src/modules/demandas/consultas.ts, src/modules/demandas/transicoes.ts, src/modules/limites.ts, src/modules/historico/consultas.ts, src/modules/acesso/resolver-ator.ts, src/modules/acesso/exigir-pessoa.ts, src/modules/acesso/mensagens.ts, src/modules/acesso/tokens-servico.ts, src/db/schema/index.ts, src/db/schema/acesso.ts, test/requisicao.ts, test/sessao.ts, test/deps.ts, test/banco.ts, test/sentinelas.ts, vitest.config.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verificação da T16 (rotas de demanda e de histórico), sobre o commit `90ad58631e2552776262d094d64f1b34318f9417`. O
código cumpre todos os critérios da tarefa. Nenhum teste do engenheiro falhou nem se mostrou instável. Acrescentei 36
testes num arquivo novo, `src/app/api/demandas/demandas.bordas.test.ts`, para as bordas que a suíte do engenheiro não
fechava. Todos passaram na primeira rodada, e o código não mudou.

### Critério de aceite → teste que cobre

Arquivo E: `src/app/api/demandas/demandas.test.ts` (engenheiro). Arquivo Q: `src/app/api/demandas/demandas.bordas.test.ts` (esta etapa). Arquivo M: `test/matriz-rotas.test.ts` e `test/matriz-rotas-qa.test.ts` (T13, que agora percorre as 5 rotas novas).

| Critério | Arquivo | Teste |
|---|---|---|
| CA-01.3 (sem sessão nem token → 401) | E | `POST > CA-01.3: sem sessão nem token → 401 e nada gravado`; `GET /api/demandas > CA-01.3`; `GET /api/demandas/:id > CA-01.3`; `historico > CA-01.3` |
| CA-01.3 no PATCH, e nada muda | Q | `PATCH: bordas > CA-01.3: sem sessão nem token → 401, e nem o status nem o título mudam, nem sai evento` |
| CA-01.3 em todo método (403 sem 2FA, 401, 404) | M | percorre os 5 métodos por `globSync` |
| CA-01.2 (sessão sem 2FA → 403) pela rota | Q | `POST: bordas > CA-01.2: sessão sem 2FA → 403 sem_2fa no POST e na fila, sem gravar` |
| CA-02.3 (token revogado ou inexistente → 401) | Q | `C-36: CA-02.3: token revogado → 401...`; `C-36: CA-02.3: token bem formado que não existe → 401...`; `PATCH: bordas > CA-02.3: token revogado → 401...` |
| CA-02.4 (ator agente no histórico) | E | `historico > CA-02.4: demanda criada com o token do orquestrador aparece no histórico com ator agente orquestrador` |
| CA-03.1 (201, id `DEM-AAAAMMDD-NNNN`, `status: nova`) | E | `POST > CA-03.1: título, solicitante e tipo → 201, id no formato, status nova, autoria da pessoa e linha no banco` |
| CA-04.1 pela rota (data de São Paulo no id) | Q | `POST: bordas > CA-04.1 pela rota: 23h30 de 22/10 em São Paulo (02h30 UTC de 23/10) gera id com 20261022` |
| CA-03.3 (400 com a lista dos campos, sem pilha, SQL nem tabela) | E | `POST > CA-03.3: tipo "outro" e sem título → 400 com a lista de campos, sem pilha, SQL nem nome de tabela` |
| CA-03.3, cada causa sozinha | Q | `POST: bordas > CA-03.3: só o tipo "outro" → 400 só com tipo; só sem título → 400 só com titulo` |
| CA-06.1 e RF-06 (filtros, total, ordem, limit, offset) | E | `GET /api/demandas > CA-06.1: filtro por tipo...`; `> filtros combinados, limit e offset`; `> o item da fila não traz solicitante, texto livre, anexos nem autor` |
| RF-06 (ordem pela data de criação, não pelo id) | Q | `GET: bordas > RF-06: a fila ordena pela data de criação, não pelo id...` |
| CA-06.2 (`limit=500` → 400) | E | `GET /api/demandas > CA-06.2: limit=500 → 400 com o campo limit`; `> status, tipo e linha fora da lista, e chave repetida → 400` |
| CA-06.2 na borda | Q | `GET: bordas > CA-06.2 na borda: limit 1 e 100 passam; 0, 101, texto, fração e negativo dão 400 com o campo limit` |
| CA-06.3 (inexistente → 404) | E | `GET /api/demandas/:id > CA-06.3: GET /api/demandas/DEM-20261022-9999 → 404...`; `PATCH > id que não existe → 404`; `historico > demanda que não existe → 404, e não lista vazia` |
| C-17 (id fora do formato → 404 sem consulta) | E, Q | E: `id fora do formato → 404 sem nenhuma consulta ao banco, com ou sem credencial`. Q: `C-17: ids quase no formato → 404 sem nenhuma consulta ao banco, nas três rotas` (minúsculas, `\n` no fim, espaço na frente, 5 dígitos, dígitos de largura total, vazio) |
| CA-06.4 (antes, depois, pessoa e data e hora) | E, Q | E: `PATCH > CA-06.4: muda a linha de serviço, devolve a vista e grava o evento com antes, depois e a pessoa`. Q: `PATCH: bordas > CA-06.4: o evento traz a data e a hora do relógio da alteração` |
| RF-07 (tabela de transições pela API) | E | `PATCH > RF-07: transição permitida...`; `> RF-07: transição fora da tabela → 409...`; `> CA-07.1 pela API...` |
| CA-07.2 pela API | Q | `PATCH: bordas > CA-07.2 pela API: estudo em aprovada → em_construcao → 409...`; `> CA-07.2 (contraprova): demanda que não é estudo vai de aprovada para em_construcao` |
| CA-07.3 pela API | Q | `PATCH: bordas > CA-07.3 pela API: em_construcao → entregue muda o status, e o histórico registra a pessoa, antes, depois e a hora` |
| CA-07.4 (token de agente no PATCH → 403) | E, M | E: `PATCH > CA-07.4: token de agente em PATCH → 403 e nada muda`. M: 403 a cada agente |
| CA-07.5 pela API | Q | `PATCH: bordas > CA-07.5 pela API: de entregue, ...`; `> de encerrada, ...` (quatro destinos cada, campos enviados junto não mudam) |
| RF-21 (leitura do histórico) | E, Q | E: `historico > RF-21: a pessoa aparece pelo nome e pelo papel...`. Q: `historico: bordas > RF-21: o histórico de uma demanda não traz evento de outra nem o texto bruto dela`; `> RF-21: do mais novo para o mais antigo pela hora do evento`; `PATCH: bordas > RF-21: alteração pela administradora aparece no histórico com o papel administradora` |
| C-30 (sem dado de terceiro no histórico) | E | `historico > C-30 pela API: PATCH de solicitanteNome e contexto com sentinela...` |
| C-36 (400 não avança a sequência) | E | `POST > C-36: 400 de validação não avança a sequência...` |
| C-36, toda recusa antes do serviço | Q | `POST: bordas > C-36: <caso> → <status>, sem gravar demanda nem evento e sem gastar número da sequência` (11 casos: 401 sem credencial, 401 token revogado, 401 token inexistente, 400 cookie e Bearer juntos, 403 sem `Origin`, 415 sem `Content-Type`, 415 `text/plain`, 415 Bearer sem `Content-Type`, 413 acima de 512 KB, 400 corpo `null`, 400 corpo lista) |
| C-36 (30 por hora → 429) pela rota | Q | `POST: bordas > C-36 pela rota: a 31ª demanda da mesma pessoa na hora → 429, sem gravar nem gastar número; outra pessoa passa; uma hora depois, passa` |
| C-11 (autoria só do ator) | E | `POST > C-11: autoria, status, id e rascunho vindos do corpo são descartados`; `> token do orquestrador cria rascunho de agente...`; `PATCH > corpo sem mudança, ou só com campos de autoria (C-11)...` |
| C-15 (CSRF) | E, Q | E: `POST > C-15: com cookie e Origin de outro site...`; `PATCH > C-15: com cookie e sem Origin...`. Q: os casos 403 e 415 acima, no POST e no PATCH, e `C-15: Content-Type JSON com parâmetro de charset é aceito` |
| C-21 (log sem dado sensível) | E, Q | E: `log das rotas de demanda (C-21)`. Q: cada caso de recusa confere que a linha de log tem o código do erro e não tem o token nem o valor do cookie de sessão |

### Testes acrescentados (36, em `src/app/api/demandas/demandas.bordas.test.ts`)

São testes de integração sobre Postgres real, Better Auth e tokens de serviço gerados no próprio teste, chamando os
handlers como o Next chama.

- **POST (17):**
  - as duas causas da CA-03.3, cada uma sozinha;
  - 11 recusas que não gravam demanda nem evento, não gastam número da sequência e não deixam credencial no log. Depois
    de cada uma, a criação válida usa o número que estava livre;
  - `Content-Type` com charset aceito;
  - sessão sem 2FA dá 403 no POST e na fila;
  - id com a data de São Paulo às 23h30;
  - cinco POST simultâneos dão cinco ids distintos e consecutivos, com um evento de criação cada;
  - a 31ª criação na hora dá 429 pela rota, sem gravar. Outra pessoa passa na mesma hora, e a primeira passa uma hora
    depois.
- **GET da fila (2):** bordas de `limit` (1, 100, 0, 101, `abc`, `1.5` e `-1`) e a ordem pela data de criação, com id
  maior na mais antiga.
- **GET por id (2):** ids quase no formato dão 404 sem consulta nas três rotas (espião em `poolApp.query` e
  `poolApp.connect`), e a demanda de agente sai com o responsável agente, sem o prefixo do token.
- **PATCH (13):**
  - 5 recusas (401, 415, 403 de `Origin`, 400 ambíguo e 401 de token revogado) sem mudar a linha nem gerar evento;
  - CA-07.2 e a contraprova;
  - CA-07.3 com a hora no evento e em `atualizadaEm`;
  - CA-07.5 de `entregue` e de `encerrada`;
  - data e hora do evento da CA-06.4;
  - `null` limpa um campo opcional, e `null` em `titulo`, `tipo`, `solicitanteNome` e `anexos` dá 400;
  - papel `administradora` no histórico.
- **Histórico (2):** isolamento entre demandas, sem o texto bruto, e ordem pela hora do evento.

Os testes novos não dependem de ordem nem do relógio real:

- O arquivo tem o próprio banco (`novoBanco`) e o próprio `relogioFixo`. Cada teste que depende da hora define o
  instante com `noInstante` e devolve o relógio ao padrão no `finally`.
- A sessão sem 2FA tem a idade medida pelo `created_at` da própria sessão, lido no banco, e não pela hora da máquina.
- As contagens (demandas, eventos, sequência) são lidas antes e depois de cada recusa, e não fixadas.
- O limite de 30 por hora usa uma pessoa só dele, num dia que nenhum outro teste usa. Para atender o M-03 da revisão,
  o arquivo tem seis pessoas; a que mais cria fica em 16 criações na mesma hora.
- A concorrência usa `Promise.all`, e as asserções valem qualquer que seja a ordem de chegada.

### Resultado

| Comando | Resultado |
|---|---|
| `pnpm test` antes dos testes novos | 82 de 82 arquivos, 1377 de 1377 testes |
| `pnpm test src/app/api/demandas/demandas.bordas.test.ts` | 36 de 36, nas três rodadas |
| `pnpm test` com os testes novos | 83 de 83 arquivos, 1413 de 1413 testes, 0 falhas |
| `pnpm lint` | limpo (0 erros, 0 avisos) |
| `pnpm typecheck` | limpo |

O `git diff` está vazio: nenhum arquivo rastreado mudou, e o único arquivo novo é o de teste. O commit da construção só
acrescenta arquivos (6 arquivos, 683 inserções, 0 remoções). `demandas.test.ts` não tem `.skip`, `.only` nem `.todo`.

## Decisões tomadas

- Os testes novos ficam num arquivo `*.bordas.test.ts` à parte, como na T15. Assim o `git diff` prova que nenhuma
  asserção do engenheiro foi afrouxada, e o arquivo dele fica com folga no limite de 30 por hora (M-03).
- As recusas são conferidas pelo efeito, e não só pelo status. Cada uma confere que não gravou demanda nem evento, que
  a sequência ficou igual e que a criação seguinte pega o número livre. É o que prova C-36 para toda recusa que vem
  antes do serviço.
- CA-01.2 e CA-02.3 foram repetidos na rota de demanda, mesmo sendo da T09 e da T10. CA-01.2 cita `GET /demandas` por
  nome, e o caminho entre `resolverAtor` e a rota nova não tinha teste com efeito no banco.
- A sessão sem 2FA tem o relógio posto em `created_at + 1 min`. O Better Auth data a sessão pela hora do processo, e a
  idade é medida pelo relógio injetado. Com o relógio fixo em 22/10 e a máquina em outra data, o teste dependeria da
  hora real.
- A lista de ESP, RSK e DEC dentro do GET por id (RF-06) não ganhou teste com versões: as rotas e os schemas de versão
  são da T18 a T20. Hoje só as listas vazias estão conferidas (`CA-03.1`).

## Pendências

- **Menor, sem bloqueio (M-05 da revisão):** `GET /api/demandas/:id` ainda não traz `agentesEmAndamento` (G4, T-03).
  Não há teste disso, porque nenhum critério da T16 o pede. Fica com a pendência T27 e T40 da revisão.
- **Menor, sem bloqueio (M-01 da revisão):** o histórico confere a existência da demanda com `obterDemanda`. O teste
  `historico: bordas > RF-21: o histórico de uma demanda não traz evento de outra...` prova o efeito, mas não mede o
  custo. Fica com a T35.
- **T18 a T20:** conferir pela rota que `GET /api/demandas/:id` lista ESP, RSK e DEC da mais nova para a mais antiga,
  com o `desatualizado` do DEC, quando as rotas de versão existirem.
- **Aviso `[UNDICI-FETCH-patch]`:** continua na saída da suíte. Os testes novos usam `PATCH` em maiúsculas. Fica para a
  `08-revisao`, como a revisão registrou.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 90ad58631e2552776262d094d64f1b34318f9417` — 6 arquivos, só inserções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --format=%h%x20%s -8` — HEAD em `94b4711` (revisão da T16), sobre `90ad586`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — antes dos testes novos: 82 de 82 arquivos, 1377 de 1377
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/demandas/demandas.bordas.test.ts` — 36 de 36
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/demandas/demandas.bordas.test.ts` — segunda rodada, depois de acrescentar a conferência do log: 36 de 36
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 83 de 83 arquivos, 1413 de 1413, 0 falhas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — só `src/app/api/demandas/demandas.bordas.test.ts`, não rastreado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — vazio
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/demandas/demandas.bordas.test.ts` — terceira rodada, depois de corrigir só o nome de um teste ("negativo" no lugar de "vazio"): 36 de 36

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
