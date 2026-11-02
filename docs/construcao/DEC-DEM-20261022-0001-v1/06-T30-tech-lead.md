---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T30-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12 e o resto), 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6, mapa das fases, T29, T30, T31), 06-T30-engenheiro-backend.md, commit 2655e8e (git show), 03-ux-ui-design.md (seção 1 e E01), 04-seguranca-aplicacao.md (início), src/modules/avisos/enviador.ts, src/modules/avisos/enviador.test.ts (início), src/modules/avisos/aviso-dec.ts, src/modules/avisos/aviso-dec.test.ts, src/jobs/aviso-dec-pronto.ts, src/jobs/aviso-dec-pronto.test.ts, test/enviador-falso.ts, src/modules/pacotes-decisao/criar.ts (diff), src/worker/iniciar.ts (diff), src/worker/index.ts (diff), src/modules/demandas/servico.ts, src/modules/agentes/executar.ts (início), src/lib/log.ts, src/lib/fila.ts, src/lib/sentry.ts, src/lib/rota.ts (início), saída do pnpm test gravada pela ferramenta nesta etapa (fim)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T30 (aviso por e-mail de pacote pronto para decisão), commit `2655e8e`, `engenheiro-backend`, 1ª tentativa.
Não há problema Critical nem Important. A tarefa entra. Os seis pontos abaixo são Minor e ficam em Pendências.

### O que foi conferido

- **Escopo.** Os 7 arquivos do plano foram criados ou alterados como pedido. Há mais três coisas:
  - `src/jobs/aviso-dec-pronto.test.ts`, o teste do handler. O plano lista o handler sem o teste dele, e o G3.1 pede
    teste para todo comportamento.
  - Os Minor 2 e 4 da `06-T29-revisao`, em `index.ts` e `iniciar.ts`. São arquivos que a tarefa já tocava, e a
    revisão da T29 disse que eles cabiam nesta passagem.
  - Os desvios 1 a 8 da entrega têm razão escrita, e nenhum deles muda contrato de outra tarefa.
  - `criarEnviador` aceita um `Pick` de `ConfigWorker`, o que amplia a interface do plano sem quebrá-la.
  - `ResultadoAviso` tem dois valores a mais, `falhou` e `sem_aviso`. Eles são necessários para a 3ª falha e para o DEC
    sem aviso.
- **RF-25 e C-38.**
  - CA-25.1, CA-25.2 (em sequência e ao mesmo tempo) e CA-25.3 têm teste com banco real.
  - O texto do e-mail é o da E01 (03, linhas 911 a 928), igual linha a linha. Conferi o texto puro, o assunto, o HTML
    `lang="pt-BR"`, o link "Abrir a tela de decisão" e a falta de imagem.
  - C-38:
    - O link é montado só da origem de `urlBase`, e o teste pela rota manda `Host`, `X-Forwarded-Host` e `Forwarded`
      de outro domínio.
    - O destinatário vem só da configuração.
    - O id do DEC passa pela regex e a demanda tem de ser a do DEC.
    - Quebra de linha e HTML no id são recusados. O `$` do JS sem a flag `m` não aceita `\n` no fim.
- **RNF-14 e o enviador.**
  - Nenhum teste chama a rede, porque o `fetch` é injetado ou espiado.
  - O endereço do Resend é fixo e o enviador usa `redirect: 'error'`, então a chave não segue um redirecionamento.
  - O tempo limite é de 10 s, por `AbortController`.
  - Todo erro sai como `ErroEnvioEmail`, com mensagem fixa e sem `cause`. O corpo da resposta de erro é cancelado sem
    ser lido.
- **ADR-06 e ADR-07 (a).**
  - O aviso e o job entram na transação que cria o DEC, e o rollback desfaz os dois (há teste).
  - A fila `aviso.dec-pronto` já tinha `retryLimit: 2` desde a T07.
  - O handler relança com mensagem fixa. A 3ª falha marca `falhou`, vai ao Sentry e não relança.
  - `batchSize: 1` faz o erro valer só para o job que falhou.
- **C-21 e C-22.**
  - O log leva só `evento`, `demandaId`, `tentativa`, `status`, `fila`, `jobId` e `erro`. Todos estão em
    `CAMPOS_PERMITIDOS`, e `erro` passa por `reduzirErro`.
  - O Sentry recebe só a classe e o `code` (`capturarErro`).
  - O payload do job é `{ decId }` e é conferido por `PAYLOADS` (Zod strict) no envio e no handler.
  - Os testes conferem que o destinatário, o remetente e as sentinelas não aparecem no log nem no Sentry.
- **Trava contra envio duplo.** O engenheiro mostrou que o teste de envios simultâneos falha sem o `.for('update')`.
  Esse é o teste que falharia sem o código, como o checklist pede.
- **Verificação nesta etapa.**
  - `pnpm test`: 133 arquivos, 2657 de 2657.
  - `pnpm lint` e `pnpm typecheck`: limpos.
  - Árvore limpa no ramo `construcao/DEC-DEM-20261022-0001-v1`.

### Pareceres (todos Minor)

1. **`src/modules/avisos/aviso-dec.ts:64`. Sem fila, `agendarAviso` não cria o job e não avisa.**
   - Problema: com `deps.fila` ausente, o aviso fica `pendente` para sempre, sem job, sem log e sem erro.
   - Razão: o comentário de `DepsComFila` (`src/modules/demandas/servico.ts`) diz que o padrão do repositório, sem a
     fila, é falhar alto, como `dispararSeLigado` faz. Hoje não há defeito vivo, porque rota, Server Action (`Deps`) e
     worker (`DepsAgente`) têm a fila obrigatória no tipo. Mas um chamador novo sem a fila perderia o aviso em
     silêncio.
   - Caminho: registrar `log.warn({ evento: 'aviso_sem_fila', demandaId })` nesse ramo, ou tornar a fila obrigatória
     quando os testes de serviço passarem a recebê-la.
2. **`src/modules/avisos/aviso-dec.ts:49`. Terceira cópia da regex do id de DEC.**
   - Problema: a mesma forma também está em `src/lib/rota.ts:27` (`RE_ID_VERSAO.DEC`) e em `src/lib/fila.ts:47`
     (`PAYLOADS`).
   - Razão: se uma das três mudar (por exemplo, o número de dígitos da versão, G3.10), elas divergem sem nenhum teste
     pegar. A justificativa do engenheiro vale: importar `rota.ts` levaria o Better Auth para o worker. Mas a saída é
     um módulo sem dependência, e não a cópia.
   - Caminho: criar `src/lib/ids.ts` com as regex de G3.10, sem import nenhum, e fazer `rota.ts`, `fila.ts` e
     `aviso-dec.ts` lerem dele. A captura da demanda pode ser uma função `demandaDoDec` exportada de lá.
3. **`src/modules/avisos/aviso-dec.ts:116-154`. Transação aberta durante a chamada HTTP.**
   - Problema: o `SELECT … FOR UPDATE` segura uma conexão do pool e a linha do aviso durante o `fetch`, por até 10 s.
   - Razão: com a concorrência 1 e uma réplica de worker (RNF-05), o custo é uma conexão. A decisão está registrada na
     entrega e não bloqueia. Mas ela foge do padrão de `executar.ts`, que chama o provedor fora da transação depois de
     reivindicar a execução por `UPDATE` condicional.
   - Caminho: se a concorrência da fila subir, trocar pela reivindicação com prazo (status `enviando` e `bloqueado_ate`),
     no mesmo molde da execução de agente.
4. **`src/modules/avisos/aviso-dec.ts:139` e `src/jobs/aviso-dec-pronto.ts:27-29`. Erro fora do envio não conta
   tentativa.**
   - Problema: uma falha de banco, ou uma URL base que `montarEmailDoAviso` recusa, desfaz a transação sem contar a
     tentativa. O pg-boss gasta as 3 execuções e o aviso fica `pendente`, sem job e sem `falhou`. O engenheiro já
     registrou o caso do banco. O da URL base se repete igual nas 3 execuções.
   - Razão: o painel não distingue esse aviso de um que ainda vai sair. A decisão não depende do e-mail (04, 2.11 D),
     por isso o problema é Minor.
   - Caminho, para a 08: varrer no batimento os avisos `pendente` sem job, ou marcar `falhou` no handler quando o job
     chega à última execução (`retryCount` do pg-boss).
5. **`package.json`. Pacote `resend` 6.30.0 sem uso.**
   - Problema: o envio é feito pela API REST (desvio 1), e nenhum arquivo importa o SDK.
   - Razão: dependência sem uso aumenta a superfície do `pnpm audit:prod` (C-39). Continua valendo "E-mail: Resend" no
     padrão técnico, porque o provedor é o mesmo.
   - Caminho: a `08-revisao` decide se remove o pacote, mudando `package.json` e `pnpm-lock.yaml` pelo
     `engenheiro-backend`. A tabela do padrão só muda se Fabiano quiser registrar o envio por REST.
6. **`src/modules/avisos/aviso-dec.ts:160-163`. A falha final do aviso não grava evento no histórico.**
   - Problema: a 02 (seção 5) fala em "evento e Sentry". O plano aprovado (T30, passo 3) pede só o status `falhou` e
     `capturarErro`, e o engenheiro seguiu o plano (desvio 4).
   - Razão: está certo seguir o plano nesta tarefa. A divergência entre a 02 e o plano fica registrada para a 08.
   - Caminho: se a 08 quiser o evento, ele entra com uma ação nova em `AcaoEvento`
     (`src/modules/historico/registrar.ts`), sem texto livre (C-30).

### Checklist da seção 12 do padrão técnico

- [x] A tarefa faz o que o plano pede, nem mais nem menos. Os arquivos fora da tarefa não mudaram: os extras são o
      teste do handler e os Minor da T29 em arquivos que a tarefa já tocava, os dois justificados.
- [x] Há teste para cada comportamento novo, e ele falharia sem o código. A trava foi provada pela remoção, e os outros
      testes nasceram vermelhos, sem módulo.
- [x] Nenhum segredo, valor de `.env` ou dado pessoal real em código, teste, log ou fixture. A chave é
      `chave-resend-ficticia`, os domínios são `.test` e os textos são sentinelas.
- [x] Entrada externa validada com Zod, e o erro não vaza detalhe. Valem o payload do job, a resposta do Resend e as
      mensagens fixas.
- [x] Banco: não há migration nesta tarefa. A tabela `aviso_email` é da T06, e o acesso é pelo papel do app com o query
      builder.
- [x] Nada duplica função que já existe no repositório. A regex repetida é Minor (parecer 2) e não é função de
      negócio.
- [x] Textos de interface em pt-BR. O texto da E01 está inteiro e não há tela tocada nem axe a rodar.
- [x] O que é Minor foi para Pendências. Não há Critical nem Important.
- [x] Revisão do PR: não se aplica a esta etapa. Fica com a `08-revisao`.

## Decisões tomadas

- **A tarefa passa sem devolução.** Razão: não há Critical nem Important. Os seis pontos são de robustez e consistência
  e não mudam o comportamento pedido.
- **Aceito o envio pela API REST em vez do SDK `resend`.** Razão: o provedor é o mesmo do padrão, e assim o código
  controla o endereço fixo, o `redirect: 'error'` e o tempo limite, com teste sem rede. É o mesmo critério do
  `ProvedorAnthropic`.
- **Aceito a trava da linha durante o envio.** Razão: é o que prova o CA-25.2 com dois jobs ao mesmo tempo, e o custo é
  uma conexão, com concorrência 1 e uma réplica.
- **Aceito a contagem de tentativas por `aviso_email.tentativas`.** Razão: ela vale também para um job enfileirado de
  novo e fica no banco para o painel. O furo do erro fora do envio fica no parecer 4.
- **Aceito o fechamento dos Minor 2 e 4 da T29 aqui.** Razão: estão em arquivos da tarefa, e a revisão da T29 indicou
  esta passagem.

## Pendências

- Para a `08-revisao`:
  - pareceres 1, 2, 4 e 6;
  - parecer 5, sobre o pacote `resend` sem uso, junto com a `09-entrega` por causa do `pnpm audit:prod`.
- Parecer 3 (transação durante o envio): fica só registrado. Volta se a concorrência da fila `aviso.dec-pronto` subir.
- Para a `10-documentacao` (já listado pelo engenheiro):
  - `RESEND_API_KEY`, `EMAIL_REMETENTE` e `EMAIL_AVISO_DECISAO` vão só no `worker`;
  - sem um deles, os avisos ficam `sem_provedor` e o boot registra `aviso_email_sem_provedor`;
  - SPF e DKIM do remetente;
  - 3 tentativas, com espera crescente a partir de 1 min.
- Para a `06-T30-testes` (`qa-automacao`): a ida e volta pelo pg-boss com nova tentativa real (job `retry` até `failed`
  ou `completed`) não está coberta no worker, porque a espera de 60 s da T07 deixa o teste lento. Se o `qa-automacao`
  quiser cobrir, cabe criar uma fila de teste com `retryDelay` curto.
- Seguem abertos, sem mudança: os Minor 1 e 3 da `06-T29-revisao`, os Minor das revisões anteriores e o aviso do undici
  "Using `patch`".

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 2655e8e61f66f88e54d79b4abfb5d43b01bfda7f` — 12 arquivos, +1369 −15
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 2655e8e61f66f88e54d79b4abfb5d43b01bfda7f -- src` — diff do código (saída gravada pela ferramenta)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 2655e8e61f66f88e54d79b4abfb5d43b01bfda7f -- src/modules/pacotes-decisao/criar.ts src/worker/index.ts src/worker/iniciar.ts test/enviador-falso.ts` — diff dos arquivos alterados
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 2655e8e61f66f88e54d79b4abfb5d43b01bfda7f -- src/modules/avisos/aviso-dec.test.ts` — testes do aviso
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/demandas/servico.ts --format= -s` — `DepsComFila` e o padrão de falhar alto sem fila
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -3` — topo 2655e8e (06-T30-construcao)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent=true --reporter=dot` — 133 arquivos, 2657 de 2657
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
