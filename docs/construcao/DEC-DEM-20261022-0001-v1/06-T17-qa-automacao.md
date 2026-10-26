---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T17-testes
agente: qa-automacao
leu: [contrato-passagem.md, pedido.json, padrao-tecnico.md, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G4 e T17), 01-analista-requisitos.md (RF-01 a RF-07 e RF-20 a RF-26 e RNF), 06-T17-engenheiro-backend.md, git show eab8cf7, src/lib/corpo.ts, src/lib/rota.ts, src/lib/erros.ts, src/lib/sentry.ts, src/modules/demandas/schemas.ts, src/modules/demandas/servico.ts, src/modules/acesso/exigir-pessoa.ts, src/db/schema/demandas.ts, src/app/api/demandas/route.ts, src/app/api/demandas/[id]/historico/route.ts, test/requisicao.ts, test/sentinelas.ts, test/sessao.ts, test/banco.ts, test/deps.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

A T17 cobre RF-05 (CA-05.1 e CA-05.3), RF-06 (a leitura nunca traz o texto bruto) e RNF-04 (100.000 caracteres). Os
33 testes do engenheiro em `src/modules/demandas/entrada.test.ts` e os 3 de `src/modules/acesso/ator-pessoa.test.ts`
foram conferidos: as asserções são fortes (estado do banco antes e depois, sequência, sentinelas na resposta, no
histórico e no log). Acrescentei 12 testes em um arquivo novo, `src/modules/demandas/entrada-qa.test.ts`, para as
bordas e falhas que faltavam.

### Critérios da tarefa e os testes que os cobrem

| Critério | Teste (arquivo › nome) |
|---|---|
| CA-05.1: orquestrador desligado, texto colado e campos preenchidos → demanda com o texto associado e nenhum job de IA | `entrada.test.ts` › `CA-05.1: orquestrador desligado, texto fictício colado e campos preenchidos → demanda com texto associado e nenhum job de IA`; `entrada.test.ts` › `modo manual → 201 { demanda }, sem eco do texto, e o texto fica em entrada_bruta`; `entrada-qa.test.ts` › `5 POST ao mesmo tempo → 5 ids diferentes, e cada demanda fica com o próprio texto, sem troca` |
| CA-05.3: texto acima do limite → 400 e nada gravado | `entrada.test.ts` › `CA-05.3: texto acima de 100.000 caracteres → 400 no campo texto, nada gravado e a sequência não avança`; `entrada-qa.test.ts` › `100.000 caracteres ASCII → 201; 100.001 → 400 só no campo texto, nada gravado e a sequência parada`; `entrada-qa.test.ts` › `modo agente com 100.001 caracteres → 400 no campo texto (o Zod vem antes do 409 do agente desligado)`; `entrada-qa.test.ts` › `texto acima do limite junto com campo obrigatório faltando → 400 com os dois campos, nada gravado` |
| RNF-04: texto bruto até 100.000 caracteres | `entrada.test.ts` › `RNF-04: o texto aceita até 100.000 caracteres; 100.001 é recusado no campo texto` (schema); `entrada-qa.test.ts` › `100.000 caracteres de 3 bytes em UTF-8 (cerca de 300 KB) → 201, e o texto fica igual, com 100.000 caracteres` (pela rota, atravessando o leitor de corpo de 512 KB); `entrada-qa.test.ts` › `corpo acima de 512 KB → 413 com a mensagem do limite, nada gravado e o log sem o texto` |
| RF-06: a leitura da demanda nunca traz o texto bruto | `entrada.test.ts` › `RF-06: a vista devolvida não traz texto, origem nem sentinela`; `entrada.test.ts` › `RF-06: o GET da demanda criada pela entrada não traz o texto bruto (sentinela ausente da resposta)`; `entrada-qa.test.ts` › `GET /api/demandas (fila) e GET /api/demandas/:id/historico da demanda criada pela entrada não têm sentinela`; `entrada-qa.test.ts` › `o GET da demanda pelo token do orquestrador também não traz o texto (a leitura de agente é a mesma vista)` |
| Leitura do texto recebido (`obterTextoRecebido`, só pessoa) | `entrada.test.ts` › os 6 testes do bloco `obterTextoRecebido` (guardado com `apagarEm`, prazo da configuração, sem texto, expurgado, não encontrado, agente → `sem_permissao`) |
| Modo agente → 409 com a mensagem da tela; `entradaPendenteId` → 404 (até a T28) | `entrada.test.ts` › `modo agente com o orquestrador desligado → 409 com a mensagem da tela, nada gravado`; `entrada.test.ts` › `entradaPendenteId → 404 até a T28, nada gravado` |
| Rota só de pessoa com 2FA (`registrar_entrada`) | `entrada.test.ts` › `token do agente orquestrador → 403, nada gravado (registrar_entrada é só de pessoa)`; `entrada.test.ts` › `CA-01.3: sem sessão nem token → 401, nada gravado`; `entrada-qa.test.ts` › `token do orquestrador no modo agente → 403, não o 409 do agente desligado, e nada gravado`; `entrada-qa.test.ts` › `token do orquestrador com corpo inválido (texto acima do limite) → 403, sem lista de campos`; `entrada-qa.test.ts` › `pessoa sem 2FA com o corpo válido → 403 sem_2fa, nada gravado`; `test/matriz-rotas.test.ts` e `test/matriz-rotas-qa.test.ts` (sem mudança) |
| Texto bruto fora do histórico e do log (C-30, C-21, CA-21.3, RNF-10) | `entrada.test.ts` › `C-30: o histórico da demanda criada pela entrada não guarda nada do texto nem da origem`; `entrada.test.ts` › `C-21: uma linha de log por requisição, com a rota e o status, sem texto, origem, e-mail, nome nem token`; `entrada-qa.test.ts` › `corpo acima de 512 KB → ...`; `entrada-qa.test.ts` › `texto com \u0000 → recusado, sem demanda, texto nem evento gravados, e sem o texto na resposta e no log` |

### Testes acrescentados (`src/modules/demandas/entrada-qa.test.ts`, 12)

- **Limites pela rota:**
  - 100.000 caracteres de `€` (3 bytes cada), com quebras de linha: 201, texto gravado igual;
  - 100.000 ASCII: 201; 100.001: 400 só em `texto`, com o corpo de erro inteiro conferido;
  - modo agente com 100.001: 400, não 409;
  - limite estourado mais título faltando: 400 com os dois campos;
  - corpo acima de 512 KB: 413 `corpo_grande`, com a mensagem; nada gravado; log com uma linha `413` sem sentinela.
- **Leituras sem texto bruto:** a fila, o histórico e o GET da demanda pelo token do orquestrador.
- **Acesso antes do modo e do corpo:**
  - token de agente no modo agente: 403, não 409;
  - token de agente com corpo inválido: 403, sem lista de campos;
  - pessoa sem 2FA: 403 `sem_2fa`, nada gravado.
- **Concorrência:** 5 POST simultâneos dão 5 ids diferentes, cada um com o próprio texto.
- **Caractere nulo:** a recusa não grava demanda, texto nem evento, e não vaza o texto na resposta nem no log (achado A-01).

### Resultado

- `pnpm test`: 86 de 86 arquivos e 1467 de 1467 testes, 0 falhas. Antes desta etapa eram 85 arquivos e 1455 testes,
  mais os 12 novos.
- `pnpm lint`: limpo. `pnpm typecheck`: limpo.
- `git diff --stat`: vazio. Nenhum arquivo rastreado mudou; o único arquivo novo é o de teste.

### Achado classificado

- **A-01 (média, não bloqueia a T17):** `\u0000` em `texto` dá 500 `erro_interno`, e não 400. O mesmo vale para
  `titulo` (sondado pelo modo manual).
  - Causa: o Postgres recusa o caractere nulo em `text` e em `jsonb`, e nenhum schema de texto o recusa antes.
  - O que já está certo: a transação desfaz demanda, texto e evento. A resposta é a genérica, sem detalhe interno. O
    log e o Sentry não levam o texto (o Sentry recebe só classe e código, por `capturarErro`).
  - O que está errado:
    - a mensagem "Tente de novo em instantes" engana, porque tentar de novo não resolve;
    - um número da sequência é gasto;
    - cada envio gera um evento no Sentry.
  - Vem de `criarDemandaSchema` (T15) e alcança todo campo de texto livre. A correção cabe numa regra única em
    `src/modules/demandas/schemas.ts` (recusar ou retirar `\u0000` em `textoLivre`, no nome e no texto bruto), fora dos
    arquivos desta tarefa. O teste novo fixa o que não pode mudar, sem fixar o 500.

## Decisões tomadas

- **Testes da QA num arquivo à parte (`entrada-qa.test.ts`)**, como em `test/matriz-rotas-qa.test.ts`. O arquivo do engenheiro fica intacto.
- **Limite testado com caractere de 3 bytes pela rota.** O Zod conta caracteres e o leitor de corpo conta bytes, então
  só a rota mostra que os dois limites convivem.
- **A sessão sem 2FA é criada dentro do teste, com `Date` falso na hora do relógio fixo** (`vi.useFakeTimers({ toFake: ['Date'] })`).
  - A janela de 15 min (C-08) é medida pelo relógio dos `Deps`, e o Better Auth data a sessão pelo `Date` do processo.
  - Sem isso, o teste dependeria da distância entre o relógio fixo e a hora real, e daria 401.
- **A-01 vai para a decisão do tech-lead, sem devolver a T17.** Não é critério desta tarefa, já existia antes dela (T15)
  e a correção é transversal. O que é da T17 (nada gravado e nada vazado) está coberto e verde.
- **Cada teste num dia próprio do relógio fixo e asserção por diferença de estado.** Assim nenhum teste depende da
  ordem, do limite de 30 por hora (C-36) nem do relógio real.

## Pendências

- **A-01 (média), para a `06-T17-decisao`:** recusar `\u0000` com 400 no Zod, em regra única de `schemas.ts`. Depois
  disso, o teste `texto com \u0000 → recusado, ...` de `entrada-qa.test.ts` pode passar a exigir 400 com
  `campos: [{ campo: 'texto', ... }]`.
- **Minor:** o `.max(100_000)` do Zod conta unidades UTF-16, e um emoji conta 2. Um texto só de emojis aceita 50.000.
  Basta registrar no manual técnico (10-documentacao) que o limite conta unidades de texto do JavaScript.
- **Minor:** cliente que mande JSON com todo caractere não ASCII escapado em `\uXXXX` (6 bytes cada) chega aos 512 KB
  com cerca de 87.000 caracteres acentuados.
  - O painel usa `JSON.stringify`, que não escapa, e não é afetado.
  - Registro para quando houver cliente externo da API.
- **Aviso `[UNDICI-FETCH-patch]` na suíte:** é anterior e não quebra nada, como na T16.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat eab8cf78e43233ef896cdc30107685d7ea8fa247` — 9 arquivos do commit da construção
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show eab8cf78e43233ef896cdc30107685d7ea8fa247 -- src` — diff do código e dos testes da T17
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h%x20%s -n 60 -- docs` — para achar o plano e as entregas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 90ad586` — arquivos da T16, para achar as rotas de lista e histórico
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo antes de começar
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/entrada-qa.test.ts` — 1ª rodada: 10 de 12; falharam o de sem 2FA (401, por causa da janela de 15 min da sessão sem 2FA, já corrigido) e o do `\u0000` (500, achado A-01)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/entrada-qa.test.ts` — 2ª rodada, com uma sonda temporária de `titulo` com `\u0000`: 11 de 13; a sonda deu 500, o que confirma que o A-01 vem da T15. A sonda foi retirada
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/entrada-qa.test.ts` — 12 de 12
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 86 de 86 arquivos, 1467 de 1467 testes, 0 falhas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — só `src/modules/demandas/entrada-qa.test.ts` novo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — vazio, nenhum arquivo rastreado mudou

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
