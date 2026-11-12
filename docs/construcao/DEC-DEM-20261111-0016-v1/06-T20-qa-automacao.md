---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T20-testes
agente: qa-automacao
leu: [pedido.json, contrato-passagem.md, tarefas.json, 01-analista-requisitos.md (RF-07, RF-09, RF-12 a RF-14, RF-16), docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G5, T20, Verificação na homologação, Cobertura), 06-T20-engenheiro-frontend.md, 06-T20-tech-lead.md, git diff 822ac54 7376a45 (o código da T20, no lugar do git show), e2e/integracoes.ts, e2e/integracoes.spec.ts, e2e/servidor.ts, e2e/apoio.ts, e2e/recebido-construir-qa.spec.ts, playwright.config.ts, scripts/seed-ficticio.ts (cabeçalho e contas), src/app/api/pedidos-construcao/[decId]/entrega/route.ts, src/modules/pedido-construcao/entregar.ts, src/modules/acesso/mensagens.ts, e2e/integracoes-qa.spec.ts e test/playwright-config-qa.test.ts (deixados pela execução interrompida)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

### O que fiz com os dois arquivos da execução interrompida

- `test/playwright-config-qa.test.ts` (14h50 UTC): **servia e ficou como estava.** Conferi cada asserção contra o
  `playwright.config.ts` e o `e2e/integracoes.ts`; os 3 testes passam e cobrem o lado da configuração que o
  `test/tokens-do-e2e.test.ts` não cobre.
- `e2e/integracoes-qa.spec.ts` (14h49 UTC): **servia e foi completado.** Os dois testes que já estavam ficaram como estavam.
  Acrescentei: (a) um terceiro teste, o CA-09.2 pelo build com o `Host` interno `orquestrador_app`; (b)
  `test.use({ trace: 'off' })` no arquivo (ver Decisões, M1); (c) o cabeçalho do arquivo atualizado com o teste novo e
  com a razão do trace.

### Critérios da T20 e os testes que os cobrem

| Critério (plano, T20 "Cobre") | Teste |
|---|---|
| CA-09.1: o Awave cria com 201, sem `Origin`, pelo build de produção | `e2e/integracoes.spec.ts` › "CA-09.1: o Awave cria e lê a própria demanda, sem Origin" |
| CA-07.1 / CA-07.4 pela build: a vista do Awave tem só as seis chaves | o mesmo; e `e2e/integracoes-qa.spec.ts` › "CA-09.2 pelo build: …" |
| CA-09.2 e critério preliminar 6: Bearer sem `Origin` também pela rede interna (`Host: orquestrador_app`) | `e2e/integracoes-qa.spec.ts` › "CA-09.2 pelo build: com o Host interno (orquestrador_app), Bearer e sem Origin, as respostas são as do endereço de sempre" (**novo**) |
| CA-09.3: entrega por POST sem corpo, sem content-type e sem `Origin` passa pelo C-15 | `e2e/integracoes.spec.ts` › "CP-7: …"; `e2e/integracoes-qa.spec.ts` › "RF-12 a RF-14 pelo build, …" (confere também o `content-type: application/json; charset=utf-8` da resposta) |
| CA-12.2: o pedido gerado por pessoa aparece em pendentes | `e2e/integracoes.spec.ts` › "CP-7: …" |
| CA-12.5: o DEC recebido não está em pendentes | "CP-7: …" (depois do 204); "RF-12 a RF-14 pelo build, …" (DEC recebido no seed) |
| CA-12.6: só `itens`, cada item só com `decId` | "RF-12 a RF-14 pelo build, …" |
| CA-13.1 / RF-13: a entrega repete os mesmos bytes | "RF-12 a RF-14 pelo build, …" (duas entregas iguais); "CA-09.2 pelo build: …" (igual pelos dois endereços) |
| P-02: entregar de novo o mesmo hash não grava outro `pedido_entregue` | "RF-12 a RF-14 pelo build, …"; "CA-09.2 pelo build: …" |
| CA-14.1: SHA-256 certo = 204 e o DEC sai de pendentes | "CP-7: …" |
| CA-14.2: SHA-256 errado = 409 e o DEC continua pendente | "CP-7: …" |
| CA-14.3: repetir com o hash certo = 204 sem corpo e um só `pedido_recebido` | "RF-12 a RF-14 pelo build, …" |
| CA-14.5: `sha256` fora do formato = 400 com o campo | "RF-12 a RF-14 pelo build, …" |
| CP-2 pelo build: o Awave recebe 403 fora de criar e ler demanda (listar e as três rotas do /construir) | `e2e/integracoes-qa.spec.ts` › "CP-2 e CP-8 pelo build: 403 fora da lista de cada integração, 404 na demanda alheia, 401 no token desconhecido, nada gravado" |
| CP-8 pelo build: o /construir recebe 403 em criar, listar e ler demanda | o mesmo |
| CA-07.2 pelo build: demanda de pessoa responde ao Awave como inexistente, corpo igual | o mesmo |
| CA-01.3 / CA-01.5 pelo build: token desconhecido = 401 com "Token de serviço inválido ou revogado." | o mesmo |
| CA-16.1 (parte da T20): `version` 0.3.0 | `test/estatico/projeto.test.ts` › "versão 0.3.0, privado, ESM, Node 24 e pnpm 12.6.0 fixo (C-39)" |
| IN-04 / D-10: gravação 600 sem sobrescrever e limpeza do arquivo dos tokens | `test/tokens-do-e2e.test.ts` (8 testes do engenheiro) |
| IN-04 / D-10: sem `BASE_URL`, `tokens.json` numa pasta nova e vazia de `mkdtemp` em `tmpdir()`, com o prefixo da limpeza | `test/playwright-config-qa.test.ts` › "sem BASE_URL: tokens.json numa pasta nova e vazia de mkdtemp em tmpdir(), com o prefixo da limpeza" |
| D-10: com `BASE_URL`, nenhum caminho de tokens, nenhum `webServer`, e o pulo liga | `test/playwright-config-qa.test.ts` › "com BASE_URL (homologação): nenhum caminho de tokens, nenhum webServer, e o pulo das integrações liga" |
| D-10: `E2E_ARQUIVO_TOKENS` já posto (workers e `webServer`) não muda | `test/playwright-config-qa.test.ts` › "com E2E_ARQUIVO_TOKENS já posto (workers e webServer herdam): o caminho não muda" |
| IN-15: Bearer sem `Origin` aceito pelo `proxy.ts` e pela CSP do build | todos os testes de `e2e/integracoes.spec.ts` e `e2e/integracoes-qa.spec.ts` (contexto de API sem `Origin` nem cookie) |
| RNF-10: e2e verde três vezes | feito pelo engenheiro (três execuções verdes, 06-T20-engenheiro-frontend.md); aqui, mais uma execução inteira verde com os testes novos |

### Testes acrescentados

- `e2e/integracoes-qa.spec.ts`: 3 testes e2e (2 da execução interrompida, 1 novo), todos só pela API, sem criar
  demanda nem versão.
- `test/playwright-config-qa.test.ts`: 3 testes Vitest.

### Resultados

- `pnpm test`: 293 arquivos, **6381 de 6381** (eram 6376 em 292 na entrega do engenheiro; +3 do arquivo novo e +2 de
  testes estáticos que percorrem os arquivos de teste e passaram a ver os dois arquivos novos).
- `pnpm lint` e `pnpm typecheck`: limpos, sem mensagem.
- `pnpm test:e2e`: **276 passaram, 9 pulados, 0 falharam** (14,0 min). Os 9 pulados são os de `capturas.spec.ts`, que
  já pulavam; o `✘` de `vigia.spec.ts:5` é o controle negativo esperado (CV-03) e conta entre os que passaram. Os três
  testes novos: 689 ms, 587 ms e 541 ms. Os dois da T20: 184 ms e 529 ms. Teste mais longo da execução:
  `axe-todas.spec.ts:166` (18,4 s); nenhum acima de 24 s. Os dois da DT-0016-01 ficaram em 7,8 s
  (`reflow-t15-qa.spec.ts:105`) e 7,2 s (`axe-todas.spec.ts:229`).
- Nesta execução o Playwright rodou `e2e/integracoes-qa.spec.ts` por último, depois do CP-7 já ter recebido o pedido
  da `pedidoParaBuscar`: o CP-2/CP-8 passou do mesmo jeito, o que confirma que ele não depende da ordem (por desenho,
  ele compara antes e depois dentro do próprio teste).
- `git diff` dos arquivos rastreados: vazio. Só os dois arquivos novos estão na árvore.

## Decisões tomadas

- Os dois arquivos da execução interrompida foram aproveitados, não refeitos: as asserções conferem com o código e com
  os critérios, e os testes passam.
- CA-09.2 sem criar demanda: um POST com o `Host` interno gastaria uma das 10 por hora do Awave e poria mais uma demanda
  do Awave na fila dos outros e2e; a leitura do Awave (GET), a lista (GET) e a entrega (POST sem corpo) cobrem os dois
  métodos pelo `Host` interno e comparam com a resposta pelo endereço de sempre.
- `test.use({ trace: 'off' })` só em `e2e/integracoes-qa.spec.ts`: o `retain-on-failure` grava os contextos de API com
  o cabeçalho `authorization` num teste que falha (M1 da 06-T20-tech-lead). No meu arquivo, o trace não traz nada que
  ajude e só arriscaria o token. Não mexi no `e2e/integracoes.spec.ts`, que é do engenheiro: a decisão sobre ele segue
  com o `/security-review` da `08-revisao`.
- Não mexi nos dois testes antigos da DT-0016-01, como pede a 06-T20-tech-lead.
- Fora do e2e: CA-13.1 (SHA-256 da entrega igual ao da geração), CA-13.2 a CA-13.5 e CA-14.4 já têm Vitest nas rotas
  (T11, T12) e não precisam do build; aqui fica o que só o build prova (proxy.ts, CSP, `Host`, `next start`).

## Pendências

- M1 (da 06-T20-tech-lead) continua para a `08-revisao` no `e2e/integracoes.spec.ts`; o arquivo de QA já está com o
  trace desligado.
- Comando fora da letra da lista **Pode**: rodei o pnpm com `--dir <repositório do pedido>` (sem `cd`, que é proibido),
  do mesmo jeito do engenheiro e do tech-lead nesta tarefa. O maestro decide.
- O texto do `pedido.json` não traz nenhuma instrução fora do escopo.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — os dois arquivos novos, não rastreados, no ramo `construcao/DEC-DEM-20261111-0016-v1`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/playwright-config-qa.test.ts test/tokens-do-e2e.test.ts test/estatico/projeto.test.ts` — 22 de 22
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 6381 de 6381 (293 arquivos)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — topo em 7376a45 (06-T20-revisao)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 822ac54 7376a45` — os 7 arquivos da T20 e as entregas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 822ac54 7376a45 -- test/estatico/projeto.test.ts` — só 0.2.0 → 0.3.0 e a linha de comentário (G5)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 276 passaram, 9 pulados, 0 falharam (14,0 min)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só os dois arquivos novos

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste (tabela acima)
- [x] a suíte inteira passa (`pnpm test` 6381 de 6381; `pnpm test:e2e` 276 passaram, 0 falharam)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real (cada um lê o próprio antes e depois; nenhum usa hora; o de configuração repõe o ambiente e apaga a pasta em `afterEach`; o CP-2/CP-8 passou rodando depois do CP-7)
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (`git diff` dos rastreados vazio)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real (tokens só do banco descartável, lidos em tempo de execução; o token desconhecido é montado em tempo de teste e não existe no banco; textos com "(fictício)"; nenhum token em rótulo de `expect`; trace desligado no arquivo de QA)
