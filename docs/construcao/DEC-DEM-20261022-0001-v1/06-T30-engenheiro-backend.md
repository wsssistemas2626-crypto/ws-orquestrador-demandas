---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T30-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, 05-tech-lead.md, parada-PF-T30.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6, mapa das fases, fim da T29, T30, T31), 01-analista-requisitos.md (RF-17 a RF-25), 02-arquiteto-solucoes.md (seções 1 a 9), 03-ux-ui-design.md (seção 1, T05 a T07, T11, T12, E01), 04-seguranca-aplicacao.md (2.11 a 2.17, seções 3 a 5), 06-T29-engenheiro-backend.md, 06-T29-tech-lead.md, package.json, src/modules/pacotes-decisao/criar.ts, src/modules/pacotes-decisao/criar.test.ts, src/worker/iniciar.ts, src/worker/iniciar.test.ts, src/worker/index.ts, src/lib/env-worker.ts, src/lib/env.ts, src/lib/fila.ts, src/lib/fila.test.ts, src/lib/fila-sonda.test.ts, src/lib/log.ts, src/lib/sentry.ts, src/lib/sentry.test.ts, src/lib/reduzir-erro.ts, src/lib/erros.ts, src/lib/relogio.ts, src/lib/deps.ts, src/lib/rota.ts (início), src/db/index.ts, src/db/transacao.ts, src/db/privilegios.ts, src/db/schema/operacao.ts, src/db/schema/historico.ts, src/db/imutabilidade.test.ts (início), src/modules/versoes.ts, src/modules/historico/registrar.ts, src/modules/demandas/servico.ts (início), src/modules/demandas/entrada.ts, src/modules/agentes/gatilhos.ts, src/modules/agentes/executar.ts, src/modules/agentes/provedor.ts, src/modules/agentes/provedor.test.ts (início), src/jobs/agente-executar.ts, src/app/api/demandas/[id]/pacotes-decisao/route.ts, src/app/api/pacotes-decisao/pacotes.test.ts (início), test/deps.ts, test/banco.ts, test/auth.ts, test/sessao.ts, test/requisicao.ts, test/provedor-falso.ts, test/sentinelas.ts, test/estatico/variaveis.test.ts, test/estatico/worker-agendador.test.ts, saída do pnpm test gravada pela ferramenta (tool-results/bempq0zcs.txt e bta3zkv8x.txt, só o fim)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T30: aviso por e-mail de pacote pronto para decisão. Cobre RF-25 (CA-25.1 a CA-25.3), C-38, RNF-14 e ADR-08, mais
C-21 e C-22 no caminho do aviso. Esta é a primeira tentativa da etapa. A Parada PF-T30 foi liberada por Fabiano
(commit `7ff1e9a`).

### Arquivos criados

- `src/modules/avisos/enviador.ts`
  - `Email`, `EnviadorEmail`, `EnviadorResend`, `EnviadorSemProvedor` e `criarEnviador(cfg)`, como no plano.
  - Novos: `ErroEnvioEmail` (`tipo` e `code`: `sem_provedor`, `recusado` ou `transitorio`), `TipoErroEnvio`,
    `ENDERECO_RESEND` e `TEMPO_LIMITE_EMAIL_MS`.
  - O `EnviadorResend` faz o `POST https://api.resend.com/emails` por `fetch`. O `fetch` pode ser injetado.
    - Leva os cabeçalhos `Authorization: Bearer`, `Content-Type: application/json` e `Idempotency-Key`
      (`dec-<DEC-id>`).
    - O corpo leva só `from`, `to: [para]`, `subject`, `text` e `html`.
    - Tempo limite de 10 s, com `AbortController`. Usa `redirect: 'error'` e o endereço é fixo (ver o desvio 1).
  - Todo erro sai como `ErroEnvioEmail` de mensagem fixa: sem o corpo da resposta, sem a mensagem do erro de rede e sem
    `cause`.
    - `429`, `5xx`, rede, tempo limite e resposta fora do formato (Zod em `{ id }`) são `transitorio`.
    - Os outros `4xx` são `recusado`.
  - `criarEnviador` recebe a configuração do worker, sem ler o ambiente. Sem a chave, sem remetente ou sem
    destinatário, devolve o `EnviadorSemProvedor`.
- `src/modules/avisos/aviso-dec.ts`
  - `agendarAviso(t, deps, decId)`, chamado na transação que cria o DEC.
    - Grava `aviso_email` pendente (`onConflictDoNothing`, um por DEC).
    - Envia o job `aviso.dec-pronto` com `{ decId }` e `singletonKey = decId`, pelo executor da transação (ADR-06).
    - O id passa pela regex antes de tocar banco ou fila.
  - `montarEmailDoAviso(decId, demandaId, urlBase, para, de)` monta o texto da E01, por inteiro.
    - Assunto "Pacote <DEC-id> pronto para decisão".
    - HTML com `lang="pt-BR"`, sem imagem e com o link "Abrir a tela de decisão".
    - O link é `<origem de urlBase>/pacotes-decisao/<DEC-id>`. Da URL base vale só a origem (`new URL(...).origin`,
      só `http:` e `https:`).
    - O DEC passa pela regex, e a demanda tem de ser a do DEC (C-38). O HTML é escapado.
  - `enviarAviso(deps, decId)`, chamado pelo worker. Numa transação, trava a linha do aviso
    (`SELECT … FOR UPDATE`) durante o envio:
    - `enviado` → `ja_enviado`;
    - `sem_provedor` e `falhou` não tentam de novo;
    - sem enviador configurado, sem remetente ou sem destinatário → `sem_provedor`, sem chamar ninguém;
    - envio certo → `enviado`, com `tentativas`, `id_provedor` e `enviado_em`;
    - falha antes da 3ª tentativa → conta a tentativa, `aviso_email_falha` no log e `AvisoNaoEnviado` (mensagem fixa),
      para a fila tentar de novo;
    - falha na 3ª tentativa → `falhou`, `aviso_email_falhou` (nível erro) e `capturarErro`, sem relançar.
    - O log leva só `evento`, `demandaId`, `tentativa`, `status` e o erro reduzido (C-21).
  - Novos: `TENTATIVAS_AVISO = 3`, `ResultadoAviso`, `DepsAviso` e `AvisoNaoEnviado`.
- `src/jobs/aviso-dec-pronto.ts`: `tratarAvisoDecPronto(deps, jobs)`.
  - Lê o payload com `PAYLOADS` (Zod). Fora do formato, registra `aviso_payload_invalido` sem o conteúdo e segue.
  - `AvisoNaoEnviado` → relança `Error('aviso_nao_enviado')`, e o pg-boss tenta de novo (`retryLimit: 2`,
    `retryDelay: 60`, com espera crescente, da T07).
  - Erro inesperado → log reduzido, Sentry e `Error('aviso_erro_inesperado')`, sem `cause`. O pg-boss guarda a mensagem
    no job, por isso ela é fixa.
- `test/enviador-falso.ts`: `EnviadorFalso` (`enviados`, `falhasAntes` e mais `chamadas`).
- `src/modules/avisos/enviador.test.ts`, `src/modules/avisos/aviso-dec.test.ts` e `src/jobs/aviso-dec-pronto.test.ts`.

### Arquivos alterados

- `src/modules/pacotes-decisao/criar.ts`: chama `agendarAviso(tr, deps, id)` na mesma transação, depois da mudança de
  status. As `deps` passam de `DepsDemanda` para `DepsComFila`, o tipo que já existe em `demandas/servico.ts` (ver o
  desvio 3).
- `src/worker/iniciar.ts`
  - Registra `aviso.dec-pronto` com `localConcurrency: 1` e `batchSize: 1`. O erro relançado vale só para o job que
    falhou.
  - A fila entra na lista do `parar()` (pendência da `06-T29-revisao`).
  - `DepsWorker` ganha `enviador?: EnviadorEmail`. Sem ele, o worker usa o `EnviadorSemProvedor`.
  - Minor 4 da `06-T29-revisao`: a falha do temporizador de batimento ganhou um evento próprio,
    `worker_batimento_temporizador_erro`.
- `src/worker/index.ts`
  - Monta `criarEnviador(config)` e o passa ao `iniciarWorker`.
  - Sem provedor de e-mail, registra `aviso_email_sem_provedor` no boot (02, seção 5).
  - Minor 2 da `06-T29-revisao`: o sinal saiu do campo `codigoErro` do log de encerramento.

### Testes criados (55 novos)

| Arquivo | Testes | O que prova |
|---|---|---|
| `enviador.test.ts` | 23 | **Os 2 do plano.** O `Idempotency-Key` `dec-<DEC-id>` vai com o `fetch` injetado, junto com a URL, o método, o `redirect`, a autorização e o corpo exato. Na falha do Resend, o log não leva o corpo, o destinatário nem a chave. **Mais:** o endereço fica fixo mesmo com `RESEND_BASE_URL` no ambiente. Sem `fetch` injetado, usa o global (espiado, sem rede). Chave vazia não constrói o enviador. O tempo limite de 10 s aborta o sinal (relógio falso). Os status 400, 401, 403, 409, 422, 429, 500 e 503 saem classificados, com mensagem fixa e sem a sentinela da resposta. Erro de rede sai sem a causa. Resposta 2xx fora do formato conta como transitória. O `EnviadorSemProvedor` não toca a rede. O `criarEnviador` cobre os quatro casos (sem chave, sem cada endereço, completo) e não lê o `process.env` |
| `aviso-dec.test.ts` | 25 | **Os 5 do plano.** CA-25.1. CA-25.2, com o job enfileirado duas vezes. CA-25.3, com sentinelas no título, no solicitante, no contexto, no texto bruto, na origem, na ESP e no resumo. C-38 pela rota, com `Host`, `X-Forwarded-Host` e `Forwarded` de outro domínio. Sem `RESEND_API_KEY` → `sem_provedor`. **Mais:** o DEC criado grava o aviso pendente e o job só com `{ decId }` (C-22). O rollback do DEC leva o aviso e o job (ADR-06). Cada versão de DEC tem o seu aviso. Agendar de novo não duplica. Id fora do formato não chega ao banco. Sem fila nas `deps`, o aviso fica pendente e sem job. CA-25.2 com dois envios simultâneos e um enviador lento: um e-mail só, provado pela trava (ver Comandos). Sem remetente ou sem destinatário → `sem_provedor`. Falha passageira: tenta até a 3ª e envia. Tentativas esgotadas: `falhou`, Sentry pelo transporte falso sem o destinatário, a sequência exata de eventos de log e nenhum envio depois. DEC sem aviso → `sem_aviso`. Erro que não é de envio conta como tentativa, sem a mensagem no log. O texto da E01 sai inteiro, linha a linha, com o HTML. A URL base vale só pela origem. Cinco ids e demandas recusados (quebra de linha, HTML, ESP, demanda de outro DEC, formato), e a URL base `javascript:` também |
| `aviso-dec-pronto.test.ts` | 7 | O handler envia e registra só ids e status. Payload fora do schema é descartado sem a sentinela no log. Falha passageira relança a mensagem fixa e deixa o aviso pendente. Erro inesperado relança sem a mensagem original. **No worker:** o DEC criado vira um e-mail, o job fica `completed` e o aviso `enviado`. Sem enviador, o aviso fica `sem_provedor`. O `parar()` tira o work de `aviso.dec-pronto` |

Conferi que o teste de envios simultâneos pega a falta da trava. Sem o `.for('update')`, a primeira versão dele passava
(o enviador falso respondia rápido demais). Pus no teste um enviador que demora 300 ms. Depois disso, sem a trava, ele
falha (`[ 'enviado', 'enviado' ]`). Com a trava de volta, passa.

### TDD: os testes foram escritos antes e vistos falhando

Comando: `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/avisos src/jobs/aviso-dec-pronto.test.ts`.
Rodou antes de qualquer código da tarefa. Trecho da saída:

```
 FAIL  src/jobs/aviso-dec-pronto.test.ts [ src/jobs/aviso-dec-pronto.test.ts ]
Error: Cannot find module '../src/modules/avisos/enviador' imported from .../test/enviador-falso.ts
 FAIL  src/modules/avisos/aviso-dec.test.ts [ src/modules/avisos/aviso-dec.test.ts ]
Error: Cannot find module '../src/modules/avisos/enviador' imported from .../test/enviador-falso.ts
 FAIL  src/modules/avisos/enviador.test.ts [ src/modules/avisos/enviador.test.ts ]
Error: Cannot find module './enviador' imported from .../src/modules/avisos/enviador.test.ts
 Test Files  3 failed (3)
      Tests  no tests
```

### Resultado

- Os três arquivos novos: 55 de 55.
- `pnpm test`: 133 arquivos e **2657 de 2657**, nenhum falhou. Eram 2602 antes da tarefa, e ela somou 55. Nenhum teste
  existente precisou mudar. O aviso do undici "Using `patch`" continua igual.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git status`: 7 arquivos novos e 3 alterados (`criar.ts`, `iniciar.ts` e `index.ts`). Nenhum outro arquivo mudou.

### Desvios do plano

1. **O Resend é chamado pela API REST, com `fetch`, e não pelo SDK `resend`.**
   - A interface do plano pede `fetch` injetável e 10 s de tempo limite (02, seção 5).
   - Também era preciso garantir que a chave só vá para `api.resend.com`. É a mesma regra do `ProvedorAnthropic`, que
     fixa o endereço para o SDK não ler uma URL base do ambiente.
   - Com `fetch` direto, os três ficam no nosso código e testados sem rede, e o redirecionamento não leva a chave.
   - O pacote `resend` continua no `package.json`, mas nenhum arquivo o importa. A remoção fica em Pendências.
2. **`ResultadoAviso` tem dois valores a mais: `falhou` e `sem_aviso`.**
   - `falhou` é o retorno da 3ª falha (sem relançar) e do job atrasado que chega depois dela.
   - `sem_aviso` é o DEC sem linha em `aviso_email`, ou id fora do formato.
3. **`agendarAviso` recebe `Pick<Deps, 'relogio'> & Partial<Pick<Deps, 'fila'>>`, e não `Deps`.** O `criarPacoteDecisao`
   passa a receber `DepsComFila`.
   - Os testes de serviço que já existem (criar, decidir, pedido, concorrência…) chamam o serviço sem fila.
   - Exigir a fila quebraria esses testes, que estão fora da lista da tarefa.
   - Sem fila, o aviso fica pendente e sem job. Rota, Server Action e worker sempre têm a fila, e há teste dos dois
     caminhos.
4. **Sem evento no histórico quando o aviso falha.** A 02 (seção 5) fala em "evento e Sentry". O plano aprovado (T30,
   passo 3) pede só `aviso_email.status = falhou` e `capturarErro`. Um evento novo mudaria a lista `AcaoEvento` de
   `historico/registrar.ts`, fora da tarefa.
5. **`criarEnviador` devolve o `EnviadorSemProvedor` também sem `EMAIL_REMETENTE` ou sem `EMAIL_AVISO_DECISAO`.** Sem
   destinatário não há a quem enviar (C-38). O boot avisa no log nos dois casos.
6. **`DepsWorker.enviador` é opcional, e o padrão é o `EnviadorSemProvedor`.** Assim o `iniciar.test.ts` da T29 não muda,
   e a falta do enviador nunca envia por engano.
7. **Um arquivo de teste a mais, `src/jobs/aviso-dec-pronto.test.ts`.** É o teste do handler e do registro no worker. O
   plano lista o handler, mas não o teste dele.
8. **Os Minor 2 e 4 da `06-T29-revisao` foram fechados** em `index.ts` e `iniciar.ts`, que esta tarefa já tocava. A
   revisão da T29 disse que cabiam nesta passagem.

## Decisões tomadas

- **A linha do aviso fica travada durante o envio (até 10 s).** Razão: é o que garante um e-mail só com dois jobs do
  mesmo DEC ao mesmo tempo, provado pelo teste. O `Idempotency-Key` fica como segunda barreira. A trava segura uma
  conexão da fila de concorrência 1, e só a linha desse aviso.
- **A contagem de tentativas é a da coluna `aviso_email.tentativas`, não a do pg-boss.** Razão: ela vale também para um
  job enfileirado de novo (CA-25.2) e fica no banco para o painel. A 3ª falha encerra o aviso, como os 3 envios da
  fila.
- **O `4xx` também tenta de novo.** Razão: a 02 e o plano pedem 3 tentativas para toda falha. A classificação
  `recusado` existe só para o log e o Sentry mostrarem que é configuração.
- **A regex do DEC está repetida em `aviso-dec.ts`, com a demanda capturada.** Razão: importar `src/lib/rota.ts` traria
  o adaptador HTTP e o Better Auth para o worker por causa de uma regex. O comentário cita `reIdVersao('DEC')` (G3.10).
- **O e-mail não guarda destinatário nem corpo no banco.** Razão: é montado na hora, do id e da configuração, como a
  T06 desenhou a tabela (C-38). O log leva `demandaId`, porque `CAMPOS_PERMITIDOS` não tem campo para o id do DEC, e a
  lista é da T02.

## Pendências

- **Para a `08-revisao` e a `09-entrega`:** o pacote `resend` 6.30.0 continua no `package.json` sem uso (desvio 1).
  Removê-lo diminui a superfície do `pnpm audit:prod`. A mudança é no `package.json` e no `pnpm-lock.yaml`, e também
  pede atualizar a linha "E-mail" do padrão técnico, se for essa a decisão.
- **Para a `10-documentacao`:** no `deploy.md`:
  - `RESEND_API_KEY`, `EMAIL_REMETENTE` e `EMAIL_AVISO_DECISAO` vão só no serviço `worker`.
  - Sem um deles, os avisos ficam `sem_provedor` e o boot registra `aviso_email_sem_provedor`.
  - SPF e DKIM do remetente (04, seção 5, item 6).
  - O aviso tenta 3 vezes (a nova tentativa espera a partir de 1 min, com a espera crescente do pg-boss da T07) e
    depois fica `falhou`, com Sentry. A 02 previa esperas de 1 e 5 min; a configuração da fila é da T07 e não mudou.
- **Para a `08-revisao`, só registro:**
  - Se um erro que não é de envio (banco fora) esgotar as 3 execuções do job, o aviso fica `pendente` sem job novo, com
    log e Sentry a cada vez. Não há varredura de avisos pendentes no batimento, porque o plano não pede.
  - O DEC continua na fila do painel. A decisão não depende do e-mail (04, 2.11 D).
- **Para a T34 (sentinelas transversais):** o `EnviadorFalso` e o caminho "Resend falhando" de C-21 já estão prontos
  para o teste ampliado. O `enviador.test.ts` e o `aviso-dec.test.ts` cobrem o log e o Sentry desse caminho.
- **Para a T43 e a T45 (`engenheiro-frontend`):** `aviso_email.status` pode aparecer no detalhe do DEC ou em
  `/configuracao`, se a 03 pedir. Hoje a 03 não pede tela para isso.
- Seguem abertos, sem mudança: os Minor 1 e 3 da `06-T29-revisao`, os Minor da `06-T28-revisao` e das anteriores, o
  Minor de `fabianojp06` da `06-T26-testes` e o aviso do undici "Using `patch`".

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -15` — topo 7ff1e9a (PF-T30 fabiano)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --stat -3` — PF-T30 (parada e registro) e 06-T29-testes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only 4b825dc642cb6eb9a060e54bf8d69288fbe0bbe4 HEAD -- src test scripts drizzle` — não rodou: objeto inexistente neste repositório
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --max-parents=0 --format=%h` — 2aba8e1
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only 2aba8e1 HEAD -- src test scripts drizzle` — lista dos arquivos rastreados de código e teste
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/avisos src/jobs/aviso-dec-pronto.test.ts` — antes do código: 3 arquivos sem módulo, nenhum teste rodou
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — 1 erro (`enviador.test.ts`: `EnviadorSemProvedor.enviar` sem parâmetro)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/avisos src/jobs/aviso-dec-pronto.test.ts` — depois do código: 55 de 55
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent=true src/modules/avisos/aviso-dec.test.ts` — sem a trava de propósito: 25 de 25 (o teste de simultâneos ainda não pegava)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent=true src/modules/avisos/aviso-dec.test.ts` — sem a trava de propósito, com o enviador lento no teste: 1 falhou (`[ 'enviado', 'enviado' ]`) e 24 passaram; trava de volta
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent=true --reporter=dot` — 133 arquivos, 2657 de 2657
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — 2 avisos de variável sem uso (um no teste do job e um no `EnviadorSemProvedor`)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent=true --reporter=dot` — 133 arquivos, **2657 de 2657**
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 7 arquivos novos e 3 alterados

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real (chave e endereços fictícios, domínio `.test`, sentinelas; os testes de log e de Sentry conferem a ausência do destinatário, do corpo e das sentinelas)
- [x] só mudaram os arquivos da tarefa (os 7 do plano e mais o teste do job, desvio 7; os Minor 2 e 4 da T29 em arquivos que a tarefa já tocava, desvio 8)
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (o job `aviso.dec-pronto` confere o payload com `PAYLOADS`; a resposta do Resend passa por Zod; o erro relançado ao pg-boss e o `ErroEnvioEmail` têm mensagem fixa, sem causa)
