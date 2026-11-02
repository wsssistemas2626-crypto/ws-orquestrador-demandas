---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T31-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (início, G1 a G6, mapa das fases, fim da T29, T30, T31, início da T32, rastreabilidade), 01-analista-requisitos.md (RF-23 a RF-26, RNF), 04-seguranca-aplicacao.md (seções 3 e 4, C-31, C-32, D1, D2, D7, D12), 06-T30-engenheiro-backend.md, 06-T30-tech-lead.md, src/worker/iniciar.ts, src/worker/iniciar.test.ts, src/worker/index.ts, src/jobs/batimento.ts, src/jobs/aviso-dec-pronto.ts, src/jobs/aviso-dec-pronto.test.ts, src/jobs/agente-executar.ts (início), src/lib/fila.ts, src/lib/env.ts, src/lib/env-worker.ts, src/lib/deps.ts, src/lib/log.ts, src/lib/erros.ts, src/lib/sentry.ts, src/lib/relogio.ts, src/db/transacao.ts, src/db/privilegios.ts, src/db/schema/index.ts, src/db/schema/operacao.ts, src/db/schema/historico.ts, src/db/schema/demandas.ts, src/db/schema/acesso.ts, src/modules/historico/registrar.ts, src/modules/historico/consultas.ts, src/modules/demandas/entrada.ts, src/modules/demandas/entradas-pendentes.ts, src/modules/demandas/servico.ts (início), src/modules/demandas/consultas.ts (início), test/deps.ts, test/banco.ts, test/auth.ts, test/sentinelas.ts, test/estatico/worker-agendador.test.ts, saída do pnpm test gravada pela ferramenta (tool-results/bxfrkgda2.txt, só o fim)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T31: expurgo do texto bruto, da entrada pendente e das sessões vencidas. Cobre RF-24 (CA-24.1 a CA-24.4), RNF-08,
C-31, C-32, D1, D2 e D7. Esta é a primeira tentativa da etapa.

### Arquivos criados

- `src/modules/retencao/expurgar.ts`
  - `expurgar(deps, prazoDias)` devolve `{ textos, pendentes, sessoes, verificacoes }`, como no plano. Tudo roda numa
    transação só:
    - `entrada_bruta` com `expurgada_em` nulo e `recebida_em < agora - prazo`: `texto` e `origem` ficam nulos e
      `expurgada_em = agora`. Grava um evento `texto_expurgado` por demanda, com ator `sistema`, `entidade`
      `entrada_bruta`, `entidadeId` = id da demanda, e `antes` e `depois` nulos (sem o conteúdo).
    - `entrada_pendente` com `recebida_em < agora - prazo`: apagada. Grava o evento `entrada_pendente_expurgada`, com
      `demandaId` nulo, `entidade` `entrada_pendente` e `entidadeId` = id da pendente.
    - `session` com `expires_at < agora - 30 dias`: apagada. `verification` com `expires_at < agora`: apagada.
    - `rotina_execucao('retencao.expurgo')` recebe a hora e a soma (upsert).
  - O limite é estrito (`<`). Exatamente 90 dias fica, e 90 dias e 1 ms sai. A sessão segue a mesma regra com 30 dias.
  - Os eventos saem em ordem fixa (por id), porque o `RETURNING` não garante a ordem.
  - Prazo fora de 1 a 365, ou que não seja inteiro, lança `ErroDominio('entrada_invalida')` antes de abrir a
    transação. Um prazo 0 ou negativo apagaria todo texto.
  - Trava de transação (`pg_advisory_xact_lock`): duas execuções ao mesmo tempo ficam em fila.
  - O log leva só `{ evento: 'retencao_expurgo', quantidade }` (C-21).
  - `ultimoExpurgo(db)` devolve `{ em, quantidade }` ou `null`. É para a tela de configuração (C-31).
  - Exporta também `ROTINA_EXPURGO`, `PRAZO_MINIMO_DIAS`, `PRAZO_MAXIMO_DIAS`, `GUARDA_SESSAO_DIAS`, `DepsExpurgar` e
    `ResultadoExpurgo`.
- `src/jobs/expurgo-texto-bruto.ts`: `tratarExpurgo(deps, jobs)` e `DepsExpurgo`.
  - Lê o payload com `PAYLOADS` (Zod, objeto vazio estrito). Fora do formato, registra `expurgo_payload_invalido` sem
    o conteúdo e segue.
  - O prazo vem de `deps.config.retencaoDias`, que no worker é o `lerConfigWorker()` conferido no boot.
  - Se der certo, registra `expurgo_job_tratado` com `fila`, `jobId` e `quantidade`.
  - Se der erro, registra `expurgo_erro` com o erro reduzido, chama `capturarErro` e relança `Error('expurgo_erro')`,
    sem `cause`, para a nova tentativa da fila. Repetir é seguro, porque o expurgo é idempotente.
- `src/modules/retencao/expurgar.test.ts` e `src/jobs/expurgo-texto-bruto.test.ts`.

### Arquivo alterado

- `src/worker/iniciar.ts`
  - Registra `retencao.expurgo` com `localConcurrency: 1` e `batchSize: 1`, usando o handler `tratarExpurgo(deps, jobs)`.
  - A fila entra na lista do `parar()`.
  - O comentário de cabeçalho foi atualizado. O agendamento (03:00 de São Paulo) já existia desde a T29 e não mudou.

### Testes criados (29 novos)

| Arquivo | Testes | O que prova |
|---|---|---|
| `expurgar.test.ts` | 23 | **Os 7 do plano:** CA-24.1 (texto, origem e data, evento `texto_expurgado` do sistema no histórico, sem a sentinela); CA-24.2 (89 dias fica, sem evento); CA-24.3 (prazo 30 com 31 dias sai, e o mesmo texto fica com prazo 90); CA-24.4 (sem evento novo e sem mudar a data); C-31 (pendente de 91 dias apagada, com evento sem demanda e sem conteúdo); C-32 (sessão vencida há 31 dias sai, há 29 fica, a válida fica; verificação vencida sai e a válida fica); campos estruturados iguais (`obterDemanda` antes e depois). **Mais:** limite estrito do texto (90 dias fica, 90 dias e 1 ms sai) e da sessão (30 dias fica, 30 dias e 1 ms sai); duas execuções ao mesmo tempo dão um evento por texto; o evento tem `antes` e `depois` nulos; pendente de 89 dias fica, e com prazo 30 a de 31 dias sai; pendente já apagada não gera evento novo; o prazo do texto não muda o da sessão; `ultimoExpurgo` é `null` antes da primeira execução, e depois tem a hora e a soma, substituídas na execução seguinte; o log tem só `evento` e `quantidade`, sem sentinela; prazos 0, −1, 366, 1,5 e NaN dão `ErroDominio` sem apagar nada; um erro no meio desfaz tudo (texto, evento e rotina) |
| `expurgo-texto-bruto.test.ts` | 6 | O handler usa o prazo da configuração (30, diferente do padrão) e registra só ids e a quantidade. Payload fora do schema é descartado sem a sentinela no log. Erro de banco relança `expurgo_erro` sem causa e sem sentinela, com log reduzido. Prazo 0 na configuração não apaga nada. **No worker:** o job `retencao.expurgo` enviado à fila expurga e termina `completed`. O `parar()` tira o work da fila, e o job enviado depois fica `created` |

Os testes de integração rodam com banco real (Testcontainers), papel do app e relógio fixo. Cada teste começa com as
tabelas que o expurgo varre limpas (`truncate` pelo migrator), então nenhum depende da ordem (RNF-15). Os dados são
fictícios: sentinelas de `test/sentinelas.ts`, domínio `.test` e IP de documentação `192.0.2.10`.

### TDD: os testes foram escritos antes e vistos falhando

Comando: `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/retencao src/jobs/expurgo-texto-bruto.test.ts`.
Rodou antes de qualquer código da tarefa. Trecho da saída:

```
 FAIL  src/jobs/expurgo-texto-bruto.test.ts [ src/jobs/expurgo-texto-bruto.test.ts ]
Error: Cannot find module './expurgo-texto-bruto' imported from .../src/jobs/expurgo-texto-bruto.test.ts
 FAIL  src/modules/retencao/expurgar.test.ts [ src/modules/retencao/expurgar.test.ts ]
Error: Cannot find module './expurgar' imported from .../src/modules/retencao/expurgar.test.ts
 Test Files  2 failed (2)
      Tests  no tests
```

### Resultado

- Os dois arquivos novos: 29 de 29.
- `pnpm test`: 135 arquivos e **2689 de 2689**, nenhum falhou. Eram 2660 antes da tarefa, e ela somou 29. Nenhum teste
  existente mudou. O aviso do undici "Using `patch`" continua igual.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git status`: 4 arquivos novos e 1 alterado (`src/worker/iniciar.ts`). Nenhum outro arquivo mudou.

### Desvios do plano

1. **`expurgar` recebe `DepsExpurgar = Pick<Deps, 'pool' | 'relogio'>`, e não `Deps`.** O worker não tem `auth` nas
   dependências, e a função só usa o pool e o relógio. `Deps` continua aceito.
2. **Um arquivo de teste a mais, `src/jobs/expurgo-texto-bruto.test.ts`.** É o teste do handler e do registro no
   worker. O plano lista o handler, mas não o teste dele. É o mesmo caso da T30.
3. **Trava de transação (`pg_advisory_xact_lock`) no começo do expurgo.** O plano não pede. Sem ela, duas execuções
   travariam as mesmas linhas em ordens diferentes e poderiam se bloquear. Com ela, a segunda espera a primeira e já não
   acha o que foi expurgado. A chave é fixa e só o expurgo usa. A função não pede privilégio.
4. **Prazo conferido dentro de `expurgar` (1 a 365, inteiro).** O boot já confere `RETENCAO_TEXTO_BRUTO_DIAS`. A
   segunda conferência protege qualquer outro chamador de apagar tudo com prazo 0.
5. **O plano não define `entidade` e `entidadeId` do evento do texto.** Usei `entrada_bruta`, com o id da demanda. A
   pendente segue o plano: `entidadeId` = id e `demandaId` nulo.
6. **O handler relança com mensagem fixa.** O batimento não relança. Aqui a nova tentativa ajuda a cumprir "nenhum texto
   com mais de prazo + 24 h" (RNF-08), e repetir não duplica evento. A nova tentativa segue a política da fila
   `retencao.expurgo`, criada na T07 com as opções padrão do pg-boss. Não mudei a fila.

## Decisões tomadas

- **Uma transação para o expurgo inteiro.** Razão: o evento, a data e o registro da rotina ficam ou saem juntos. O teste
  de falha no meio prova isso. O volume (RNF-05: até 200 demandas por mês) cabe numa transação.
- **O evento não leva `antes` nem `depois`.** Razão: a ação já diz o que houve, e qualquer valor do texto ou da origem
  seria dado de terceiro (C-30). A data é a do próprio evento.
- **`ultimoExpurgo` lê só `rotina_execucao`.** Razão: a tabela da T06 existe para isso, e a tela não precisa varrer o
  histórico.
- **A verificação (`verification`) sai logo que vence, sem guarda.** Razão: é o que C-32 pede. Ela não serve para nada
  depois de vencida.

## Pendências

- **Para a T45 (`engenheiro-frontend`):** `ultimoExpurgo(db)` (`src/modules/retencao/expurgar.ts`) está pronto para
  `/configuracao` (C-31). Devolve `null` antes do primeiro expurgo.
- **Para a T34 (sentinelas transversais):** os eventos `retencao_expurgo`, `expurgo_job_tratado`,
  `expurgo_payload_invalido` e `expurgo_erro` levam só campos de `CAMPOS_PERMITIDOS`.
- **Para a `10-documentacao` (`deploy.md` e manual técnico):**
  - o expurgo roda todo dia às 03:00 de São Paulo, no `worker`;
  - o prazo vem de `RETENCAO_TEXTO_BRUTO_DIAS` (padrão 90, de 1 a 365);
  - a sessão sai 30 dias depois de vencer, e a verificação sai quando vence;
  - pelo D12, o prazo efetivo do texto é de 90 + 30 dias por causa do backup.
- **Para a `08-revisao`, só registro:** uma entrada pendente `aguardando` com mais tempo que o prazo é apagada mesmo com
  uma execução do orquestrador ainda viva. Se essa execução terminar depois, a conversão da pendente acha
  `nao_encontrado`. Não conferi como `executar.ts` trata esse caso, porque está fora da tarefa. Com 90 dias e 3
  tentativas em minutos (P1-e), não deve acontecer.
- Seguem abertos, sem mudança: os Minor da `06-T30-revisao` (pareceres 1 a 6), os Minor 1 e 3 da `06-T29-revisao`, os
  das revisões anteriores e o aviso do undici "Using `patch`".

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — topo 441ab27 (06-T30-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only 2aba8e1 HEAD -- src test scripts docs/construcao` — lista dos arquivos rastreados de código, teste e entregas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/retencao src/jobs/expurgo-texto-bruto.test.ts` — antes do código: 2 arquivos sem módulo, nenhum teste rodou
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/retencao src/jobs/expurgo-texto-bruto.test.ts` — depois do código: 29 de 29
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent=true --reporter=dot` — 135 arquivos, **2689 de 2689**
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 4 arquivos novos e 1 alterado

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real (sentinelas, domínio `.test`, IP de documentação; os testes conferem que log e histórico não levam sentinela)
- [x] só mudaram os arquivos da tarefa (os 4 do plano e mais o teste do job, desvio 2)
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (o job `retencao.expurgo` confere o payload com `PAYLOADS`; o erro relançado ao pg-boss tem mensagem fixa, sem causa; o log leva o erro reduzido)
