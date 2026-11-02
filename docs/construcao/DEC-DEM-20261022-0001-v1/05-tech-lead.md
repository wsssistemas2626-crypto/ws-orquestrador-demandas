---
pedido: DEC-DEM-20261022-0001-v1
etapa: 05-plano
agente: tech-lead
leu: [contrato-passagem.md, 05-tech-lead.md (volta anterior), tarefas.json, passagens.jsonl, 06-T08-engenheiro-backend.md, 06-T04-engenheiro-dados-bd.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G4 e T06 a T09 e Rastreabilidade), src/db/schema/acesso.ts, src/db/schema/acesso.test.ts, drizzle/meta/_journal.json, construir.mjs, cadeias.mjs, estado.mjs]
status: pronto
proximo: engenheiro-dados-bd
devolvido_para: null
---
## Entrega

Volta do plano pedida pela `06-T08-construcao`. O motivo: a tabela `two_factor` da T04 não tem as colunas `verified`,
`failed_verification_count` e `locked_until`, que o plugin `twoFactor` do Better Auth 1.7.6 exige. Por isso 9 de 615
testes falham em `auth.test.ts`.

Nesta volta mudou só o que é preciso para pôr a migration antes de a T08 voltar. As tarefas T01 a T07, já prontas,
ficam como estão. O resto do plano aprovado na Parada 2 também não mudou.

- Plano: `docs/superpowers/plans/2026-10-25-ws-orquestrador-demandas-plano.md`
  - **T47 nova** (`engenheiro-dados-bd`, risco `alto`, fase Fundação), escrita entre a T07 e a T08. Ela traz:
    - a tabela das três colunas, com os tipos que a sonda da T08 provou;
    - três testes que falham, em `src/db/schema/acesso.test.ts`: as colunas e os padrões, a linha gravada sem as
      colunas novas e a gravação de falha e bloqueio pelo app com o `CHECK >= 0`;
    - o esquema Drizzle de `twoFactor` com o `check`;
    - `pnpm db:generate` (migration `0006_<gerado>`, sem migration custom);
    - a suíte inteira verde, incluindo os 9 de `auth.test.ts` da T08 e a guarda de privilégios sem edição;
    - a volta da migration.
  - **T08**: o cabeçalho ganhou "Depende de: T47". O conteúdo da tarefa não mudou: a volta da T08 só roda a suíte e
    regrava a entrega.
  - **G1**: a lista de tarefas com migration passa a incluir a T47.
  - **Mapa das fases**: a Fundação passa a ser "T01 a T07, T47, T08 a T13".
  - **Rastreabilidade**: a T47 entra em RF-01, C-33 e C-34.
- Lista de tarefas: `docs/construcao/DEC-DEM-20261022-0001-v1/tarefas.json`
  - 47 linhas, com a T47 logo depois da T07 e antes da T08, na mesma ordem do plano.
  - Passa em `construir.mjs tarefas`.

### Fases e tarefas

| Fase | Tarefas | Engenheiros | Riscos | Por que nesta ordem |
|---|---|---|---|---|
| Fundação | T01 a T07, T47, T08 a T13 | backend (10), dados-bd (4) | 10 alto, 1 medio, 3 baixo | Log por lista de permissão e mapeador de erro antes de qualquer rota (C-20, C-21). Guarda de privilégios com a primeira migration (C-34). As colunas do plugin `twoFactor` vêm antes da configuração do Better Auth (T47 antes da T08). Autenticação, matriz e o teste que percorre as rotas vêm antes das rotas de demanda (C-01, C-02, C-04, C-09 a C-12, C-15, C-17) |
| Demandas | T14 a T17 | backend | 2 alto, 1 medio, 1 baixo | Id, serviço, rotas e entrada manual: base de todo artefato |
| Versões e decisão | T18 a T22 | backend | 2 alto, 3 medio | O caminho manual completo, sem IA, até o Pedido de Construção |
| Agentes de IA | T23 a T29 | backend | 6 alto, 1 medio | Interruptor e teto antes do provedor; provedor e minimização antes da execução; execução antes dos gatilhos |
| Avisos e retenção | T30, T31 | backend | 2 alto | Jobs do worker que dependem do DEC e da entrada |
| Operação | T32 a T35 | backend (3), dados-bd (1) | 3 alto, 1 baixo | Scripts, teste de sentinelas e desempenho com o sistema de pé |
| Painel | T36 a T46 | frontend | 6 alto, 5 baixo | Telas sobre módulos já testados; e2e e axe por tela |

A T47 fica na fase Fundação. No modo `por_risco` da Parada 2, ela não cria parada nova entre fases.

| Tarefa | Engenheiro | Risco | Tarefa | Engenheiro | Risco |
|---|---|---|---|---|---|
| T01 Esqueleto, relógio e fuso | backend | baixo | T24 Minimização e montador | backend | alto |
| T02 Log e Sentry | backend | alto | T25 Provedor de IA e fábrica | backend | alto |
| T03 Mapeador de erro e corpo | backend | baixo | T26 Prompts dos quatro agentes | backend | alto |
| T04 Banco base, acesso, histórico, guarda | dados-bd | alto | T27 Execução de agente | backend | alto |
| T05 Demanda, versões e decisão | dados-bd | alto | T28 Gatilhos e orquestrador | backend | alto |
| T06 Agentes, uso, avisos, operação | dados-bd | alto | T29 Worker, batimento, varredura | backend | medio |
| T07 Fila pg-boss | backend | medio | T30 Aviso por e-mail | backend | alto |
| **T47 Colunas do plugin twoFactor** | dados-bd | alto | T31 Expurgo | backend | alto |
| T08 Better Auth fechado | backend | alto | T32 Scripts de conta | backend | alto |
| T09 exigirPessoa e verificação | backend | alto | T33 Scripts de token, seed, hml | backend | alto |
| T10 Tokens, resolverAtor, matriz | backend | alto | T34 Sentinelas transversais | backend | alto |
| T11 Adaptador de rota, cabeçalhos, saúde | backend | alto | T35 Desempenho | dados-bd | baixo |
| T12 Histórico | backend | baixo | T36 Design system, moldura, e2e | frontend | baixo |
| T13 Estáticos e matriz × rotas | backend | alto | T37 Entrar e 2FA | frontend | alto |
| T14 Id, versão e trava | backend | baixo | T38 Fila | frontend | baixo |
| T15 Serviço de demanda | backend | alto | T39 Nova demanda e edição | frontend | alto |
| T16 Rotas de demanda | backend | medio | T40 Detalhe | frontend | alto |
| T17 Entrada manual | backend | alto | T41 ESP no painel | frontend | baixo |
| T18 ESP | backend | medio | T42 RSK no painel | frontend | baixo |
| T19 RSK | backend | medio | T43 DEC e decisão | frontend | alto |
| T20 DEC | backend | medio | T44 Pedido na tela de decisão | frontend | alto |
| T21 Decisão e dupla aprovação | backend | alto | T45 Agentes e teto | frontend | alto |
| T22 Pedido de Construção | backend | alto | T46 Transversais do painel | frontend | baixo |
| T23 Interruptores, teto, preço, uso | backend | alto | | | |

### Cobertura

- Os 26 RF de 01 e as 18 RNF continuam na tabela "RF de 01 → tarefas" do plano. A T47 entra em RF-01.
- Os 40 controles de 04 continuam na tabela "Controles de 04 → tarefas". A T47 entra em C-33 e C-34. C-35 e C-39
  ficam divididos como na volta anterior: a parte do código na T01, e o compose da homologação e os portões do CI na
  `09-entrega`.
- Toda tarefa começa pelo teste que falha. A T47 começa pelos três testes novos de `acesso.test.ts`, e os 9 de
  `auth.test.ts` da T08 também estão vermelhos antes do esquema.

## Decisões tomadas

- **Tarefa nova com id T47**, e não renumeração. A `06-T08-construcao` já tem passagem e entrega no registro, e
  renumerar quebraria esse vínculo. O formato `Tnn` não exige ordem numérica: a ordem de execução é a da lista.
- **T47 com o `engenheiro-dados-bd`.** Migration é só dele (G1). A T08 não tem como ficar verde sem ela.
- **Risco `alto`.** A T47 altera uma tabela já existente e toca a autenticação (2FA).
- **`verified` nulo com padrão `true`**, como na sonda que passou. Um `NOT NULL` não foi provado contra a
  biblioteca: se o plugin gravar nulo em algum caminho, quebraria o login.
- **`CHECK (failed_verification_count >= 0)`**, pela mesma regra de `bloqueio_verificacao`. O plugin só incrementa
  e zera esse campo, então o `CHECK` não bloqueia nenhum caminho dele.
- **`locked_until` sem padrão no banco** (G3.4). A data vem de quem grava.
- **Sem migration custom.** O `GRANT` de `two_factor` é de tabela inteira e cobre coluna nova, então a guarda não
  muda. Se o drizzle-kit gerar algo além das três colunas e do `CHECK`, a tarefa volta ao plano: isso seria sinal de
  divergência entre o esquema e as migrations.
- **A T08 não muda de conteúdo.** O código dela já está no ramo (commit `06-T08-construcao`) e passou com as três
  colunas na sonda. A volta só roda a suíte e regrava a entrega.
- **Os desvios 1 a 7 da T08 não entram no plano.** São da revisão `06-T08-revisao`, que julga cada um quando a T08
  passar.

## Pendências

- **Para o maestro: a devolução reabre P2 e T01 a T07.** Pelo `estado.mjs`, a devolução para `05-plano` reabre tudo o
  que vem depois dela: a P2 e as etapas de T01 a T07, que já estavam prontas. Com o registro como está, depois desta
  entrega o próximo passo é a P2. Aprovada a P2, o próximo seria a `06-T01-construcao`, e não a `06-T47-construcao`.
  Fabiano pediu para não refazer T01 a T07. Cabe ao maestro, com Fabiano, decidir como o registro passa direto para a
  T47 sem que essas tarefas rodem de novo.
- **Para a T09: sobreposição com o bloqueio do plugin.** Com as colunas novas, o plugin `twoFactor` 1.7.6 passa a ter
  bloqueio próprio de verificação (`failed_verification_count` e `locked_until`). Esse bloqueio se sobrepõe a C-06 e
  à tabela `bloqueio_verificacao` da T09. O plano aprovado mantém a tabela própria (5 falhas em 15 min, por conta).
  - A T09 deve conferir, pelo teste de C-06, que o limite e a janela padrão do plugin não contradizem essa regra.
  - Se contradisserem, e a única saída for configurar ou trocar o mecanismo, a T09 volta ao plano. A decisão fica
    para essa volta ou para a `06-T09-revisao`.
- **Para a T09: limite próprio no `/sign-in`.** Fica em aberto se o Better Auth aplica ao `/sign-in` uma regra de
  limite própria, mais estrita que 10 por minuto. O teste de C-06 da T09 mostra.
- **Para a T11 e a T13:** os testes de C-15 dependem de `disableOriginCheck: false` explícito (desvio 3 da T08).
- **Itens da volta anterior que seguem abertos:**
  - X-01 (comandos git da lista Pode no `conferir`);
  - itens da `09-entrega` e da `10-documentacao`;
  - textos da T45;
  - tamanho da T36 e da T09;
  - J-01, J-02, J-03, O-02 e F-01 da spec.

## Comandos executados

- `node /home/deploy/servidor/projetos/estruturaAutonoma/ferramentas/construir/construir.mjs tarefas /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261022-0001-v1/tarefas.json` — antes da mudança: `{ "ok": true, "erros": [] }`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -30` — último commit a643bc1 (06-T08-construcao)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat --format=%h 6e06587` — arquivos de teste da 06-T04-testes, entre eles `src/db/schema/acesso.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat --format=%h a643bc1` — 12 arquivos da T08, nenhum em `src/db/` nem em `drizzle/`
- `node /home/deploy/servidor/projetos/estruturaAutonoma/ferramentas/construir/construir.mjs tarefas /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261022-0001-v1/tarefas.json` — `{ "ok": true, "erros": [] }`
- `node /home/deploy/servidor/projetos/estruturaAutonoma/ferramentas/construir/construir.mjs tarefas /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261022-0001-v1/tarefas.json` — depois da T47 no arquivo: `{ "ok": true, "erros": [] }`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — só `tarefas.json` (+1) e o plano (+117 −6)

## Critério de pronto atendido

- [x] (05) cada RF de 01 e cada controle de 04 é coberto por ao menos uma tarefa
- [x] (05) cada tarefa do plano começa pelo teste que falha
- [x] (05) `tarefas.json` passa em `construir.mjs tarefas` e tem as tarefas do plano, na mesma ordem
- [x] (05) toda tarefa tem `risco`, pela regra da Entrega
