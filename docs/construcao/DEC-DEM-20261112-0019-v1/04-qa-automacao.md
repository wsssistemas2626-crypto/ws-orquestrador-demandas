---
pedido: DEC-DEM-20261112-0019-v1
etapa: 04-regressao
agente: qa-automacao
leu: [contrato-passagem.md, padrao-tecnico.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-backend.md, diff 2303b86..7e6ed4f (git diff; commit 7e6ed4f da 03-correcao), e2e/integracoes.spec.ts, e2e/integracoes-qa.spec.ts, e2e/integracoes.ts, e2e/vigia.spec.ts, e2e/capturas.spec.ts (início), e2e/confirmacao-awave.spec.ts (início), playwright.config.ts, test/playwright-config-qa.test.ts, test/tokens-do-e2e.test.ts, test/estatico/decisao-e2e.test.ts, test/estatico/relogio.test.ts, test/estatico/piso-de-assercoes.test.ts, src/db/transacao-prazo.test.ts, src/modules/pedido-construcao/recebimento-0019.test.ts, src/modules/agentes/executar-0019.test.ts (início), src/app/api/demandas/visibilidade-agente-0019.test.ts (trechos), src/app/api/demandas/criacao-awave-0019.test.ts, src/modules/integracoes/prazo-total-0019.test.ts, src/modules/demandas/confirmacao-0019.test.ts (trecho), scripts/criar-token-0019.test.ts]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

Regressão da 0.3.1 sobre o commit `7e6ed4f` (03-correcao), no ramo `construcao/DEC-DEM-20261112-0019-v1`. Esta etapa
fez três coisas: a correção do B-1 com o teste estático dela, a conferência do IN-16 nos testes que a correção mudou e
as suítes inteiras (Vitest, lint, typecheck e e2e).

### Arquivos desta etapa

| Arquivo | O que mudou |
|---|---|
| `e2e/integracoes.spec.ts` | B-1: `test.use({ trace: 'off' })` no nível do arquivo, logo depois de `const tokens = tokensDoE2e();`, como no irmão `integracoes-qa.spec.ts:29`. O comentário de cabeçalho diz o motivo (IN-04). Nenhum teste nem asserção mudou. |
| `test/estatico/trace-e2e.test.ts` (novo, 5 testes) | A regra do B-1 que a triagem pediu, um pouco mais larga. Toda `e2e/*.spec.ts` cujo código (sem comentário) tem `authorization`, `Bearer` ou `extraHTTPHeaders`, em qualquer caixa, precisa declarar `test.use({ trace: 'off' })` na coluna 0, fora de `describe`, e não pode ter outro `trace:` que religue o trace. Fora dos `*.spec.ts`, nenhum arquivo de `e2e/` pode montar essa credencial, para um ajudante não tirar a spec da varredura. O teste prova que a regra reprova a forma da 0.3.0, o `test.use` dentro de `describe`, o que está só no comentário, o trace religado e o ajudante com credencial. Também prova que ela aceita o irmão e a spec sem credencial. |

### Cada achado e o teste que o cobre (critério "teste que reproduz o defeito")

| Achado (01) | Teste que falha sem a correção | Visto falhando |
|---|---|---|
| B-1 | `test/estatico/trace-e2e.test.ts`: "toda spec que monta credencial no cabeçalho declara test.use({ trace: 'off' }) e não religa o trace" e "e2e/integracoes.spec.ts tem o test.use({ trace: 'off' }) uma vez, no nível do arquivo" | Nesta etapa: 2 de 5 falharam antes da correção (`"e2e/integracoes.spec.ts: sem test.use({ trace: 'off' }) no nível do arquivo"`) e 5 de 5 passaram depois. |
| B-3 | `src/modules/demandas/confirmacao-0019.test.ts`: "B-3: jaConfirmada só aceita a confirmação de pessoa" (sistema, agente e integração) | Na 03, rodada 1 (9 de 10 falharam) |
| M-1 | `src/app/api/demandas/visibilidade-agente-0019.test.ts` (GET por id com os quatro agentes; as seis leituras de ESP, RSK e DEC; listagem com itens, total, `limit` e `offset`; POST de ESP, RSK e DEC com nada gravado; status final dá 404 e não 409; recusa antes do limite; controle positivo). Também `confirmacao-0019.test.ts` (`exigirVisivelPara` e a equivalência entre SQL e TS) | Na 03, rodada 1 (7 de 11 falharam) |
| M-2 | `src/app/api/demandas/criacao-awave-0019.test.ts`: "a leitura da vista estoura o tempo (57014): 503 fixo, e nenhuma demanda nem demanda_criada gravada" e "sucesso: exatamente as 6 chaves…" | Na 03, rodada 1 (3 de 4 falharam) |
| M-3 | `src/db/transacao-prazo.test.ts` (prazo de 400 ms; pool de uma conexão; relógio falso; piso) e `src/modules/integracoes/prazo-total-0019.test.ts` (`prazoTotalDe`, constantes, 503, pessoa, agente e sistema sem prazo). Pela rota: `criacao-awave-0019.test.ts`, "o prazo de 8 s esgota no meio da criação" | Na 03, rodada 1 (8 de 10 e 7 de 9 falharam) |
| M-4 | `src/modules/pedido-construcao/recebimento-0019.test.ts`: "B espera A na trava do pedido, recebe 409 shaDiferente, não grava, e o DEC continua pendente", mais o caso sem corrida e o X → Y → X | Na 03, rodada 1 (5 de 7 falharam) |
| M-5 | `src/modules/agentes/executar-0019.test.ts`: caso A (demanda da chave diferente e nula: `entrada_nao_encontrada`, sem provedor), caso B (bloqueio, `pendente`, confirmação, um job, uma chamada, uma ESP), duas confirmações, insumo desligado, batimento | Na 03, rodada 1 (8 de 10 falharam) |
| B-2 | `scripts/criar-token-0019.test.ts`: "com a validação regredida (nenhum dos dois passa), lança, não escreve na saída e não grava token nem evento" | Na 03, rodada 1 (3 de 3 falharam) |

### Critérios de aceite do pedido

| Critério (`pedido.json`) | Coberto por |
|---|---|
| Agente: 404 ao ler e recusa ao criar ESP, RSK ou DEC na demanda que aguarda confirmação; depois, como na 0.3.0 | `visibilidade-agente-0019.test.ts`; `criacao-awave.test.ts` (CA-10.6, mudança aprovada); `origem.test.ts` e `origem-qa.test.ts`. Pela decisão P3 da triagem, a recusa ao criar é **404**, e não 409 (ver Decisões). |
| O 201 do Awave sai de dentro da transação orçada, e o estouro vira 503 sem gravar | `criacao-awave-0019.test.ts`; no e2e, `e2e/integracoes.spec.ts` "CA-09.1" (201 e as 6 chaves pelo build de produção) |
| Prazo total das integrações, contando a espera pela conexão, menor que o do cliente | `transacao-prazo.test.ts`, `prazo-total-0019.test.ts` |
| Entrega e recebimento na mesma fila, e o hash antigo nunca é gravado depois de entrega nova | `recebimento-0019.test.ts`, `recebimento-qa.test.ts` (mudança aprovada P1); no e2e, `integracoes.spec.ts` "CP-7" e `integracoes-qa.spec.ts` "RF-12 a RF-14" |
| A guarda do worker usa a demanda da entrada, falha fechada e não gasta a chave; a confirmação dispara uma vez | `executar-0019.test.ts`, `executar-awave.test.ts`, `gatilhos-awave-qa.test.ts`, `executar.bordas.test.ts` |
| Trace desligado em `e2e/integracoes.spec.ts`; script de token sem sucesso sem emissão; `jaConfirmada` só com pessoa | `trace-e2e.test.ts`; `criar-token-0019.test.ts`; `confirmacao-0019.test.ts` |
| Nenhum teste de segurança da 0.3.0 apagado ou afrouxado | Conferência abaixo, e `test/estatico/piso-de-assercoes.test.ts` verde na suíte inteira |

### IN-16: os testes mudados pela correção (conferidos com `git diff 2303b86 7e6ed4f`)

Nenhum teste foi apagado. Nenhum `.skip`, `.only`, `.todo` ou `.fixme` entrou no diff. Os nove arquivos da tabela da
03 trazem a regra nova no lugar e não afrouxam nada:

| Teste | Conferido |
|---|---|
| `criacao-awave.test.ts`, CA-10.6 | Mudança aprovada (P5). Ganhou o 404 antes da confirmação, com corpo igual ao do inexistente (`toBe(await r404.text())`). Depois da confirmação, as asserções de hoje continuam iguais. Tem o comentário "mudança aprovada (M-1 da 0019, substitui o CA-10.6)". **Ok.** |
| `executar-awave.test.ts` (dois testes) | Mudança aprovada (P5). Troca `'ignorada'` por `'aguardando_confirmacao'` e `'pendente'`. Ficam: provedor não chamado, uso 0, ESP 0 e o evento `agente_ignorado`/`sem_confirmacao` com o texto fixo. "M-02 vem antes" não mudou. **Ok.** |
| `gatilhos-awave-qa.test.ts:149` | Troca `ignorada` por `pendente`. Ficam provedor, uso, o evento e `capturarErro` não chamado. É o mesmo motivo da P5 (pendência da triagem). **Ok.** |
| `executar.bordas.test.ts`, `demandaId` nulo | Mais restritivo: o provedor passa de 1 chamada para 0, o uso de 1 linha `erro` para nenhuma, e o motivo vira `entrada_nao_encontrada`. Ficam `falhou`, `tentativas: 1`, sem artefato, sem nova tentativa, um job, sem sentinela no evento e sem Sentry. **Ok.** |
| `origem.test.ts`, `origem-qa.test.ts` | Ganharam a asserção de "fora antes da confirmação" (itens vazios e `total` 0). Depois da confirmação, as asserções de hoje. **Ok.** |
| `recebimento-qa.test.ts` | Mudança aprovada (P1). O hash substituído passa a dar 409 `SHA_DIFERENTE`. Os dois `toBe(204)` do hash antigo viraram `toBe(409)`, que é mais restrito. As contagens descem de 2 para 1, coerentes com a regra nova. O hash desconhecido continua 409. **Ok.** |
| `reduzir-erro.test.ts` | A lista fechada ganha `PrazoDaTransacaoEsgotado`, e o laço `classeAceita` fica. É inventário. **Ok.** |
| `test/estatico/projeto.test.ts` | A versão passa de `0.3.0` para `0.3.1`, e as outras asserções ficam. **Ok.** |

Peço ao maestro que registre como mudança aprovada, junto da P5 e da P1, os quatro que a 03 listou em Pendências:
`gatilhos-awave-qa`, `executar.bordas`, `origem`/`origem-qa` e `reduzir-erro`. Pela leitura acima, nenhum afrouxa.

### Resultados

- `pnpm test` (suíte inteira, depois do B-1): **302 de 302 arquivos e 6460 de 6460 testes**, 0 falhas, em 302 s.
  A 03 terminou com 301 arquivos e 6454 testes. Esta etapa somou 1 arquivo e 6 testes: os 5 de `trace-e2e.test.ts` e,
  ao que tudo indica, 1 caso de uma varredura parametrizada por arquivo.
- `pnpm lint`: limpo. `pnpm typecheck`: limpo.
- `pnpm test:e2e` (completo, build de produção local): **276 passaram, 9 pulados, 0 falhas**, de 285, em 17,9 min,
  código 0.
  - Os 9 pulados são os de `e2e/capturas.spec.ts`, pulados de propósito (D-04: a captura já existe).
  - O `✘` de `e2e/vigia.spec.ts` "CV-03 (negativo)" é o `test.fail()` esperado, e conta como passou.
  - Os dois testes de `e2e/integracoes.spec.ts` passaram com o trace desligado: CA-09.1 em 424 ms e CP-7 em 942 ms.
  - Nenhum teste passou de 24 s. Os mais longos foram `reflow.spec.ts:57` em 390 px (22,5 s) e
    `reflow-t15-qa.spec.ts:105` (21,9 s).
- `git status` ao fim: só `e2e/integracoes.spec.ts` (modificado) e `test/estatico/trace-e2e.test.ts` (novo). O e2e não
  deixou arquivo rastreado sujo.

## Decisões tomadas

- A regra estática olha `authorization`, `Bearer` e `extraHTTPHeaders`, e não só `Bearer` em `extraHTTPHeaders`. Um
  cabeçalho passado por requisição (`headers: { authorization }`) também iria para o trace.
- O ajudante fora de `*.spec.ts` não pode montar credencial. O `test.use` vale por arquivo de spec, e uma spec que
  chamasse esse ajudante escaparia da varredura. Hoje nenhum ajudante monta credencial.
- O `test.use` precisa estar na coluna 0. Dentro de `describe`, ele não cobre o arquivo inteiro, e o Prettier sempre
  recua o que fica dentro de `describe`.
- O teste do B-1 só lê arquivos. Não depende de ordem nem do relógio, e não usa token: o trecho da 0.3.0 traz só
  `${token}` literal.
- Não confirmei rodando que o trace do `request.newContext` guarda o cabeçalho, como a 01 sugeriu. Para isso eu teria
  de forçar uma falha e abrir o `trace.zip`, e abrir o zip, ou ler a fonte do Playwright em `node_modules`, fica fora da
  minha lista **Pode**. A correção vale do mesmo jeito, como defesa, e iguala o arquivo ao irmão, que a 06-T20 já
  desligou pelo mesmo motivo.
- Uma busca só de leitura rodou fora da regra de comandos do maestro. O maestro registrou o bloqueio e a liberou. A
  mesma conferência foi refeita dentro da regra, com um `-G` por palavra (ver Comandos executados).
- Sobre o "409 ao criar" do texto do pedido: a triagem trocou por 404 (P3, decisões do maestro autorizadas por Fabiano,
  só endurecem). Conferi o 404 e não pedi o 409.

## Pendências

- **Risco de instabilidade (Minor, não bloqueia).** Dois testes da 03 em `src/db/transacao-prazo.test.ts` medem tempo
  real:
  - "prazo de 400 ms…" exige `decorrido < 650`;
  - "pool de uma conexão…" exige `250 ≤ decorrido < 1000`.

  Passaram nas duas suítes inteiras (a da 03 e esta). Com a máquina carregada no CI, ainda podem oscilar. Não mexi
  neles: subir o limite seria afrouxar uma asserção. Recomendo observar no CI do PR. Se falharem uma vez, a correção é
  trocar a medida por relógio injetado, como os testes de "relógio falso" do mesmo arquivo, e não alargar o limite.
- **Ordem dentro de `describe` (Minor).** Em `visibilidade-agente-0019.test.ts`, o último teste da listagem confirma a
  demanda escondida, e os dois anteriores dependem de ela ainda estar escondida. Isso só quebra com a ordem embaralhada
  (`sequence.shuffle`), que o projeto não usa.
- **E2e perto do teto de 24 s:** `reflow.spec.ts:57` (390 px, 22,5 s) e `reflow-t15-qa.spec.ts:105` (21,9 s). Nenhum
  dos dois foi tocado neste pedido.
- Para a `04-revisao`, já levantados pela 03: o desvio 1 (`batimento.ts`), o desvio 2 (`seed-ficticio.ts`), o `Proxy`
  e o `set_config` de `transacao.ts`.
- O texto do `pedido.json` não traz instrução fora do escopo. Nada a registrar.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261112-0019-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — topo `7e6ed4f` (03-correcao)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 2303b86 7e6ed4f` — 47 arquivos na correção
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 2303b86 7e6ed4f -- src/app/api/demandas/criacao-awave.test.ts src/app/api/pedidos-construcao/recebimento-qa.test.ts src/lib/reduzir-erro.test.ts src/modules/agentes/executar-awave.test.ts src/modules/agentes/executar.bordas.test.ts src/modules/agentes/gatilhos-awave-qa.test.ts src/modules/demandas/origem-qa.test.ts src/modules/demandas/origem.test.ts test/estatico/projeto.test.ts` — os nove testes alterados (IN-16)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- e2e test playwright.config.ts` — lista de `e2e/` e `test/`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only -G extraHTTPHeaders 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- e2e` — as duas specs das integrações
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only -G Bearer 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- e2e` — as mesmas duas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only -G "trace" 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- e2e playwright.config.ts` — só `integracoes-qa.spec.ts` e a configuração
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only -i -G authorization 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- e2e` — as mesmas duas specs
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only -G "\.skip\b" 2303b86 7e6ed4f` — nada
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only -G "\.only\b" 2303b86 7e6ed4f` — nada
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only -G "\.todo\b" 2303b86 7e6ed4f` — nada
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only -G setTimeout 2303b86 7e6ed4f` — os testes da correção que esperam tempo real
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only -G "performance\.now" 2303b86 7e6ed4f` — idem
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/trace-e2e.test.ts` — antes do B-1: 2 falharam e 3 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/trace-e2e.test.ts` — depois do B-1: 5 de 5
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 302 de 302 arquivos, 6460 de 6460 testes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only -G ignorada 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- e2e scripts` — nenhum e2e exige `ignorada`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só os dois arquivos desta etapa
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 276 passaram, 9 pulados (capturas, D-04), 0 falhas, 17,9 min
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — depois do e2e, os mesmos dois arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — só o `test.use` e o comentário em `e2e/integracoes.spec.ts`

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste (tabelas da Entrega)
- [x] a suíte inteira passa (Vitest 6460 de 6460; e2e 276 passaram, 9 pulados de propósito, 0 falhas)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real (`trace-e2e.test.ts` só lê arquivos)
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff 2303b86 7e6ed4f`; as mudanças de sentido são as aprovadas e as mais restritivas da tabela IN-16)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] (04 regressão) há um teste que reproduz o defeito descrito em `01-qa-funcional.md` (um por achado, M-1 a M-5 e B-1 a B-3; o do B-1 foi visto falhando nesta etapa)
