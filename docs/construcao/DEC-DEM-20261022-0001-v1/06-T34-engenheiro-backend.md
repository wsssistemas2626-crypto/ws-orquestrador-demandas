---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T34-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, 05-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (início, G1 a G6, mapa das fases, T01 início, T26 trecho, T33 a T36 início), 06-T33-engenheiro-backend.md, 06-T32-tech-lead.md (início e parecer 1), test/sentinelas.ts, test/deps.ts, test/banco.ts, test/auth.ts, test/sessao.ts, test/requisicao.ts, test/provedor-falso.ts, test/enviador-falso.ts, src/lib/log.ts, src/lib/log.test.ts, src/lib/sentry.ts, src/lib/sentry.test.ts, src/lib/reduzir-erro.ts, src/lib/erros.ts, src/lib/rota.ts, src/lib/deps.ts, src/lib/fila.ts, src/worker/iniciar.ts, src/worker/iniciar.test.ts, src/jobs/agente-executar.ts, src/jobs/aviso-dec-pronto.ts, src/modules/agentes/executar.ts, src/modules/agentes/execucoes.ts, src/modules/agentes/espera.ts, src/modules/agentes/gatilhos.ts, src/modules/agentes/gatilhos.test.ts, src/modules/agentes/saida-orquestrador.ts, src/modules/agentes/provedor.ts (início), src/agents/orquestrador.ts, src/modules/avisos/aviso-dec.ts, src/modules/avisos/enviador.ts, src/modules/acesso/auth.ts, src/modules/acesso/matriz.ts, src/modules/acesso/resolver-ator.ts, src/modules/demandas/entrada.ts, src/modules/demandas/schemas.ts, src/modules/demandas/transicoes.ts, src/modules/especificacoes/schemas.ts, src/modules/pacotes-decisao/criar.ts, src/modules/pacotes-decisao/schemas.ts, src/modules/limites.ts, src/app/api/demandas/route.ts, src/app/api/demandas/[id]/route.ts, src/app/api/demandas/entrada/route.ts, src/app/api/demandas/[id]/especificacoes/route.ts, src/app/api/demandas/[id]/pareceres-risco/route.ts, src/app/api/demandas/[id]/pacotes-decisao/route.ts, src/app/api/pacotes-decisao/[decId]/decisao/route.ts, src/app/api/pacotes-decisao/pedido.test.ts, src/app/api/auth/[...all]/route.ts, vitest.config.ts, package.json, saída do pnpm test gravada pela ferramenta nesta etapa (tool-results/bq546050d.txt, só o fim)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T34: teste transversal de sentinelas. Cobre RNF-10, C-21 (ampliado), C-22 e o critério preliminar 13 ("Nenhum log
contém texto bruto de demanda, e-mail, token ou senha"). É a primeira tentativa da etapa.

### Arquivo criado (o único do plano)

`test/transversal/sentinelas.test.ts`, com um teste de integração, o do plano. Ele roda contra:

- o Postgres real (Testcontainers), pelo papel do app;
- o Better Auth de verdade, com duas contas `cto` fictícias com 2FA;
- o token de serviço real do `insumo_tecnico`;
- a fila do pg-boss no mesmo banco;
- o `ProvedorFalso` e o `EnviadorResend` com `fetch` falso. Nada sai da máquina (RNF-14).

O relógio é fixo (RNF-15) e os handlers das rotas são chamados como o Next chama (`test/requisicao.ts`).

**Captura:**

- **pino:** o `log` vai para um destino trocado por `substituirDestinoDoLog`;
- **console:** `log`, `info`, `warn`, `error` e `debug` são espionados, como segunda rede;
- **Sentry:** `iniciarSentry` recebe um DSN fictício e o transporte falso, que guarda cada envelope;
- **pgboss:** um `select *` de cada tabela do esquema `pgboss` (`pg_class` com `relkind` `r` e `p`), pelo migrator;
- **`execucao_agente`:** um `select *` da tabela inteira, pelo migrator.

**O fluxo, com os sentinelas de `test/sentinelas.ts` em toda entrada:**

1. Entrada pelo orquestrador ligado: `POST /api/demandas/entrada`, modo agente, responde 202.
   - O texto bruto leva nome, e-mail, telefone, token, senha e texto sentinelas.
   - `solicitanteNome` é o nome sentinela, e `origem.referencia` é o e-mail sentinela.
   - O provedor falso devolve a saída com `SENTINELAS.texto` em `descricaoProblema`.
   - A execução é tratada por `tratarAgenteExecutar`, com o job que o pg-boss guardou. A demanda nasce.
2. ESP, RSK e DEC por agente e por pessoa.
   - **Insumo técnico pelo agente.** A 1ª saída está fora do schema e traz e-mail, texto e token sentinelas, e a
     execução é reagendada. O relógio avança 31 s, e a 2ª saída vale e grava a ESP.
   - **Risco pelo agente.** O provedor lança `Error` com e-mail, token e uma linha `    at <sentinela>` na mensagem.
     A execução falha (`erro_inesperado`) e o erro vai ao Sentry.
   - **RSK pela pessoa e DEC pelo agente.** A pessoa grava o RSK pela API, e o agente de consolidação grava o DEC como
     rascunho.
   - **Caminho da pessoa, com os agentes desligados.** A demanda é criada pela API e a ESP v1 é gravada pelo token do
     agente (`Bearer`). Depois a pessoa grava a ESP v2, o RSK e o DEC de nível `cto`.
   - **Aprovação e pedido.** Outra conta `cto` aprova pelo `PATCH` de decisão, com comentário sentinela. A geração do
     Pedido de Construção responde 200.
   - **E-mail na ESP.** Uma terceira demanda tem e-mail na ESP e e-mail e telefone no contexto. É aprovada, e o pedido
     responde 422 (C-28).
3. Caminhos de erro.
   - **400 de validação.** Título vazio, tipo sentinela, link `javascript:<token>` e uma chave desconhecida com o
     e-mail sentinela.
   - **400 de corpo que não é JSON,** com sentinela.
   - **409 de transição:** `entregue` a partir de `pronta_para_decisao`, com título e contexto sentinelas.
   - **Violação de CHECK provocada pelo migrator.** O teste cria `t34_sem_sentinela ... not valid` em `demanda`. O
     título sentinela é recusado pelo Postgres com 23514, a rota responde 500, e a constraint é apagada no `finally`.
   - **Token que não existe:** `Bearer` com o token sentinela, responde 401.
   - **Login errado:** e-mail e senha sentinelas em `/sign-in/email`, responde 401.
   - **Resend falhando.** As chamadas ímpares lançam erro de rede com e-mail e token na mensagem, e as pares respondem
     500 com e-mail e nome no corpo. A chave do Resend é o token sentinela, e o destinatário é o e-mail sentinela.
     - A 1ª tentativa dos três avisos passa pelo pg-boss de verdade, com `boss.work` só nessa fila. Os três jobs ficam
       em `retry`, com o erro relançado guardado pelo pg-boss.
     - A 2ª e a 3ª tentativa de um aviso passam pelo handler. Na 3ª, o aviso fica `falhou`, com log de erro e Sentry.
4. Leitura e asserções.
   - Nenhum sentinela no pino, no console, nos envelopes do Sentry, nas linhas do pgboss nem em `execucao_agente`.
   - Para o teste não passar sem exercitar nada, ele também confere:
     - os eventos `requisicao`, `login_falhou`, `agente_reagendado`, `agente_concluido`, `falha_agente`,
       `aviso_email_falha` e `aviso_email_falhou` no log;
     - 5 chamadas ao provedor;
     - pelo menos 3 envelopes do Sentry, com `23514` (o 500 da rota) e `ErroEnvioEmail` (o aviso);
     - linhas em `pgboss.job`, com o `aviso_nao_enviado` guardado;
     - as quatro execuções: `consolidacao:concluida`, `insumo_tecnico:concluida`, `orquestrador:concluida` e
       `risco:falhou`.

### Vazamentos achados (passo 3)

Nenhum vazamento no código das tarefas anteriores. O teste passou de primeira, com o fluxo e os erros acima, e nenhum
arquivo de `src/` mudou.

### TDD: o teste foi escrito antes e visto falhando

O teste foi escrito antes de qualquer outra mudança. As três primeiras corridas falharam por erro do próprio teste:

- o id da demanda do orquestrador estava em `artefato_id`, não em `demanda_id`;
- o pedido aprovado deu 422 porque a descrição da demanda tinha e-mail, que é o C-28 funcionando;
- uma variável estava fora de escopo.

Corrigido o teste, ele passou de primeira. Seguindo o passo 2 do plano, o vazamento foi provado de propósito, com uma
linha temporária logo depois do login errado.

1. `log.info({ evento: 'x', erro: new Error(SENTINELAS.email) } as never)`: o teste **passou**. O `erro` vira
   `{ classe, code }` (`reduzirErro`), e o e-mail não sai.
2. A linha foi trocada por um campo fora da lista e um objeto simples em `erro`:
   `log.info({ evento: 'x', mensagem: SENTINELAS.email, erro: { mensagem: SENTINELAS.email } } as never)`. O teste
   **falhou** na asserção do pino:

```
 FAIL  test/transversal/sentinelas.test.ts > fluxo completo e caminhos de erro sem nenhum sentinela no pino, no Sentry falso, no pgboss nem em execucao_agente
AssertionError: expected true to be false // Object.is equality
 ❯ test/transversal/sentinelas.test.ts:387:51
    387|     expect(contemSentinela(linhasDoLog.join(''))).toBe(false);
 Test Files  1 failed (1)
      Tests  1 failed (1)
```

O campo `mensagem` no topo foi descartado pela lista. Quem vazou foi `erro.mensagem`, porque um objeto simples em
`erro` passa só sob o `redact` (ver Pendências). A linha temporária e o import de `log` foram removidos em seguida.

### Resultado

- `test/transversal/sentinelas.test.ts`: 1 de 1, em cerca de 15 s.
- `pnpm test`: 140 arquivos e **2756 de 2756**, nenhum falhou. Nenhum teste que já existia mudou. O aviso do undici
  "Using `patch`" continua igual.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git status`: só `test/transversal/sentinelas.test.ts`, novo.

### Desvios do plano

1. **Os jobs de agente são tratados pelo handler da fila, e não pelo worker inteiro.** O teste chama
   `tratarAgenteExecutar` com o job (`id` e `data`) que o pg-boss gravou.
   - Motivo: com o relógio fixo, a 2ª tentativa só é reivindicada depois de o relógio avançar 30 s. Com o worker
     rodando sozinho, ela viraria `ja_tratada` antes do avanço.
   - O caminho é o mesmo do worker: o mesmo payload validado pelo `PAYLOADS`, o mesmo `executarAgente` e o mesmo log.
2. **O aviso combina as duas formas.**
   - A 1ª tentativa passa pelo `boss.work` real, para o pg-boss guardar no job o erro relançado e a leitura do esquema
     `pgboss` ter o que conferir.
   - A 2ª e a 3ª passam pelo handler direto, porque a fila espera 60 s com backoff (`retryDelay`).
3. **O console também é capturado,** além do pino. É uma segunda rede para biblioteca que escreva fora do `log`.
4. **O token sentinela é também a chave do Resend, e o e-mail sentinela é o destinatário do aviso.** Assim, chave e
   destinatário também ficam sob a mesma asserção.
5. **"ESP, RSK e DEC por agente" cobre os dois caminhos do agente:**
   - o job do worker: insumo técnico, risco e consolidação;
   - a API com token de serviço: a ESP pelo `Bearer` do `insumo_tecnico`.
6. **O login errado vai a `deps.auth.handler`, pelo `postAuth` de `test/sessao.ts`.** A rota
   `src/app/api/auth/[...all]/route.ts` só repassa a requisição para esse handler.
7. **Erros a mais que o plano não lista:** corpo que não é JSON (400), token de serviço inexistente (401) e erro
   inesperado do provedor (vai ao Sentry). Todos têm sentinela.

## Decisões tomadas

- **Um teste só, como no plano.** Razão: as quatro saídas acumulam o fluxo inteiro, e a asserção final vale para
  tudo o que rodou. Os passos ficam numerados no corpo do teste.
- **A constraint de CHECK é criada com `not valid` e apagada no `finally`.** Razão: com `not valid`, ela não confere
  as linhas que já têm sentinela no título. E apagá-la no `finally` deixa o banco do arquivo como estava, mesmo se o
  teste falhar.
- **As tabelas do pgboss vêm do catálogo, e não de uma lista fixa.** Razão: o esquema do pg-boss 12.34.0 pode ter
  tabelas e partições que não conheço. Pelo catálogo, toda tabela entra na leitura.
- **Asserções de exercício (eventos, chamadas, envelopes, execuções) antes das de sentinela.** Razão: sem elas, uma
  captura vazia passaria no teste sem provar nada.
- **Nenhuma mudança em `src/`.** Razão: o teste não achou vazamento. A observação sobre objeto simples em `erro` é
  desenho aceito na T02, com teste próprio, e fica para quem decide (Pendências).

## Pendências

- **Observação para o tech-lead e o `seguranca-aplicacao` (Minor, sem vazamento hoje).** Em `src/lib/log.ts`, o
  `normalizarErro` deixa passar um objeto simples em `erro`. Só as chaves do `REDACT` são removidas, então uma chave
  como `mensagem` ou `detalhe` sai. Foi assim que o passo 2 provou o vazamento.
  - Hoje nenhum ponto de `src/` faz isso: o teste transversal passa.
  - O comportamento é o desenhado na T02 e está fixado em `src/lib/log.test.ts` ("redact continua como segunda
    barreira…" e os 16 casos de chave). Mudá-lo quebraria esses testes e o contrato da T02.
  - Se for para endurecer, por exemplo reduzindo todo `erro` que não é `Error` a `{ classe: 'desconhecido' }`, a mudança
    é de outra tarefa ou da `08-revisao`.
- **Carregado da T33, segue aberto:** o parecer 1 da `06-T32-revisao`, sobre o comentário de `test/auth.ts`. Ele
  passou à T34 na entrega da T33, mas o plano da T34 só cria `test/transversal/sentinelas.test.ts`, e mudar
  `test/auth.ts` sairia dos arquivos da tarefa. Fica para a revisão decidir onde entra.
- **Para a T35 (`engenheiro-dados-bd`):** este arquivo leva cerca de 15 s e não muda dado de outro arquivo, porque
  cada arquivo de teste tem banco próprio.
- **Leitura do arquivo de saída da ferramenta:** li o fim de `tool-results/bq546050d.txt`, a saída do `pnpm test`
  gravada pela ferramenta nesta etapa, para ver o total. É o mesmo procedimento das entregas anteriores.
- Seguem abertos, sem mudança: os Minor das revisões anteriores e o aviso do undici "Using `patch`".

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -25` — topo 503bf7c (06-T33-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=COMMIT-%s --diff-filter=A -- src test scripts` — lista dos arquivos de código e teste já criados
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/transversal/sentinelas.test.ts` — 1ª corrida: falhou (id da demanda do orquestrador lido de `demanda_id`, erro do teste)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/transversal/sentinelas.test.ts` — 2ª corrida: falhou (pedido aprovado com 422, porque a descrição da demanda tinha e-mail; erro do teste)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/transversal/sentinelas.test.ts` — 3ª corrida: falhou (variável fora de escopo, erro do teste)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/transversal/sentinelas.test.ts` — 4ª corrida: 1 de 1
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/transversal/sentinelas.test.ts` — com a linha temporária `erro: new Error(SENTINELAS.email)`: 1 de 1 (o erro é reduzido)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/transversal/sentinelas.test.ts` — com a linha temporária trocada por campo fora da lista e objeto em `erro`: 0 de 1, falha na asserção do pino
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/transversal/sentinelas.test.ts` — sem a linha temporária e com as asserções de exercício: 1 de 1
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent=true --reporter=dot` — 140 arquivos, **2756 de 2756**
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — só `test/transversal/sentinelas.test.ts`, novo

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega). Ele passou de primeira contra o código existente, e a falha foi provada pelo passo 2 do plano, com a linha temporária, já removida
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real. Só os sentinelas fictícios de `test/sentinelas.ts`, `@ficticio.test`, `@exemplo.test` e o DSN `sentry.exemplo.test`
- [x] só mudaram os arquivos da tarefa (`test/transversal/sentinelas.test.ts`, o único do plano)
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno. A tarefa não cria entrada nova. O teste exercita o Zod das rotas e dos payloads das filas e confere que nem o 400, nem o 409, nem o 500 do CHECK, nem o erro do Resend levam sentinela ao log, ao Sentry ou ao pgboss
