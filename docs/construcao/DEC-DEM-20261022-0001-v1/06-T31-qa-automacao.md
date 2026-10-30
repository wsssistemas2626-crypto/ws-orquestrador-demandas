---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T31-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6, mapa das fases, T31), 01-analista-requisitos.md (RF-17 a RF-25, RNF, matriz), 04-seguranca-aplicacao.md (2.12 a 2.17, C-01 a C-40, seção 4 D1 a D12), tarefas.json, 06-T31-engenheiro-backend.md, 06-T31-tech-lead.md, 06-T30-qa-automacao.md, commits 441ab27..a5cac75 (git show --stat e diff de iniciar.ts), src/modules/retencao/expurgar.ts, src/modules/retencao/expurgar.test.ts, src/jobs/expurgo-texto-bruto.ts, src/jobs/expurgo-texto-bruto.test.ts, src/worker/iniciar.ts, src/worker/iniciar.test.ts (início), src/lib/fila.ts, src/lib/env-worker.test.ts, src/modules/demandas/entrada.ts, src/modules/demandas/servico.ts (início), test/deps.ts, saída do pnpm test gravada pela ferramenta (tool-results/b7qtn5ktg.txt, só o fim)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T31: expurgo do texto bruto, da entrada pendente e das sessões vencidas. Cobre RF-24 (CA-24.1 a CA-24.4), RNF-08, C-31,
C-32, D1, D2 e D7.

- O código passou em todos os testes.
- Nenhum critério ficou sem teste.
- Acrescentei 3 testes, todos de ponta a ponta pelo worker. Os testes do engenheiro provam os CA chamando `expurgar`
  direto, e o worker só era exercitado com a entrada pendente, nunca com texto bruto. Também faltava a nova tentativa
  real pelo pg-boss, que a `06-T31-revisao` apontou.

### Critério → teste que o cobre

| Critério | Arquivo | Teste |
|---|---|---|
| CA-24.1 (91 dias → texto e origem vazios, data gravada, evento no histórico sem o conteúdo) | `src/modules/retencao/expurgar.test.ts` | `texto bruto (RF-24) > CA-24.1: texto de 91 dias → texto e origem vazios, data do expurgo gravada, evento no histórico sem o conteúdo` e `o evento do expurgo não tem antes nem depois, e o ator é o sistema` |
| CA-24.1 pelo job no worker | `src/jobs/expurgo-texto-bruto.test.ts` | **novo** `no worker, de ponta a ponta (CA-24.1 a CA-24.4) > CA-24.1, CA-24.2 e CA-24.3 pelo job: com o prazo 30 da configuração, o texto de 31 dias sai com evento do sistema e o de 29 dias fica` |
| CA-24.2 (89 dias → continua) | `src/modules/retencao/expurgar.test.ts` | `CA-24.2: 89 dias → continua guardado, sem evento` e `o limite é estrito: exatamente 90 dias continua; 90 dias e 1 ms é expurgado`; pelo job, o mesmo teste novo (29 dias com prazo 30) |
| CA-24.3 (prazo 30, texto de 31 dias → expurgado) | `src/modules/retencao/expurgar.test.ts` | `CA-24.3: prazo 30 e texto de 31 dias → expurgado; com prazo 90, o mesmo texto ficaria`; pelo job, com o prazo vindo da configuração do worker: o mesmo teste novo e `tratarExpurgo > payload válido → expurga com o prazo da configuração e registra só a quantidade` |
| CA-24.4 (já expurgado → sem evento novo) | `src/modules/retencao/expurgar.test.ts` | `CA-24.4: já expurgado → rodar de novo não cria evento novo nem muda a data do expurgo` |
| CA-24.4 pelo job no worker | `src/jobs/expurgo-texto-bruto.test.ts` | **novo** `no worker, de ponta a ponta (CA-24.1 a CA-24.4) > CA-24.4 pelo job: o job do dia seguinte termina concluído sem evento novo e sem mudar a data do expurgo` |
| Campos estruturados ficam (RN do RF-24) | `src/modules/retencao/expurgar.test.ts` | `os campos estruturados da demanda continuam iguais` |
| RNF-08 (ao menos 1 vez a cada 24 h; nova tentativa) | `src/worker/iniciar.test.ts` (T29) e `src/jobs/expurgo-texto-bruto.test.ts` | `registra a fila de agentes com concorrência 1 e os dois agendamentos` (cron `0 3 * * *` em São Paulo); `no worker > o worker registra retencao.expurgo…`; **novo** `no worker, de ponta a ponta (CA-24.1 a CA-24.4) > nova tentativa real: a primeira execução falha, o pg-boss tenta de novo e o job termina concluído, com um evento só` |
| C-31 (pendente vencida apagada; último expurgo; prazo 1 a 365) | `src/modules/retencao/expurgar.test.ts` | `entrada pendente (C-31) > …` (3 testes), `registro da rotina e último expurgo (C-31) > …` (2 testes sobre `ultimoExpurgo`) e `prazo fora da regra > prazo %s → ErroDominio, sem apagar nada` (5 casos); no boot, `src/lib/env-worker.test.ts` (T29: `C-31: RETENCAO_TEXTO_BRUTO_DIAS=400 não sobe` e as bordas) |
| C-32 e D7 (sessão vencida há mais de 30 dias; verificação vencida) | `src/modules/retencao/expurgar.test.ts` | `sessões e verificações (C-32, D7) > …` (3 testes, com o limite estrito de 30 dias e o prazo do texto independente) |
| D1 e D2 (texto e origem fora de log, job e histórico) | `expurgar.test.ts` e `expurgo-texto-bruto.test.ts` | `o log do expurgo leva só a quantidade, sem conteúdo nem id de demanda`; `payload fora do schema (Zod, C-22) → descartado sem o conteúdo no log e sem expurgo`; `erro no expurgo → relança um erro de mensagem fixa, sem causa, com log reduzido`; os 3 novos conferem histórico e log sem sentinela |
| Atomicidade (uma transação) | `src/modules/retencao/expurgar.test.ts` | `falha no meio > erro depois do UPDATE desfaz tudo: o texto continua e não há evento nem registro da rotina` |
| Registro no worker e `parar()` | `src/jobs/expurgo-texto-bruto.test.ts` | `no worker > o worker registra retencao.expurgo…` e `no worker > parar() tira também o work de retencao.expurgo…` |

### Testes acrescentados (3, em `src/jobs/expurgo-texto-bruto.test.ts`, bloco novo `no worker, de ponta a ponta (CA-24.1 a CA-24.4)`)

1. `CA-24.1, CA-24.2 e CA-24.3 pelo job: com o prazo 30 da configuração, o texto de 31 dias sai com evento do sistema e
   o de 29 dias fica`.
   - Duas demandas nascem pela entrada manual (RF-05), com texto e origem sentinelas, recebidos há 31 e há 29 dias.
   - O job vai pela fila real e o worker o conclui.
   - Confere a linha de 31 dias com texto e origem nulos e a data do expurgo, e a de 29 dias intacta.
   - Confere um evento `texto_expurgado` do sistema na demanda vencida e nenhum na recente.
   - Confere o histórico e o log sem sentinela, e o log `expurgo_job_tratado` com o id do job e a quantidade 1.
2. `CA-24.4 pelo job: o job do dia seguinte termina concluído sem evento novo e sem mudar a data do expurgo`.
   - Dois jobs, com o relógio avançado um dia entre eles.
   - Confere um evento só, a data do primeiro expurgo e a rotina com a hora do segundo e quantidade 0.
3. `nova tentativa real: a primeira execução falha, o pg-boss tenta de novo e o job termina concluído, com um evento só`.
   - A configuração devolve prazo 0 na primeira leitura e 30 depois. A primeira tentativa falha no handler, e a nova
     tentativa vem da fila, não de um laço local.
   - Confere o job `completed` com `retry_count` 1 e duas leituras do prazo.
   - Confere o texto expurgado, um evento só e o log do job na ordem `expurgo_erro` e depois `expurgo_job_tratado`, sem
     sentinela.
   - Falharia se o handler engolisse o erro: o job terminaria na primeira tentativa, sem expurgo.

Mudança de preparo, sem tocar asserção: o `beforeEach` do arquivo passou a truncar também `demanda`, com `entrada_bruta`
pelo cascade. Os testes novos criam texto bruto, e o expurgo varre a base toda. Sem isso, um texto que sobrasse mudaria
a quantidade conferida pelos testes que já existiam.

### Resultado

- `pnpm test`: 135 arquivos e **2692 de 2692**. Eram 2689 na entrega do engenheiro, e esta etapa somou 3.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- Estabilidade: os dois arquivos da T31 rodaram verdes duas vezes nesta etapa. Na primeira, o arquivo do job deu 9 de 9.
  Na segunda, os dois arquivos deram 32 de 32.
- `git diff --stat`: só `src/jobs/expurgo-texto-bruto.test.ts`, com 109 linhas acrescentadas e 1 trocada (a do
  `truncate`).

### Leitura crítica da cobertura (sem bloqueio)

- **Caso do parecer 1 da `06-T31-revisao` (pendente convertida durante o expurgo) sem teste.**
  - Não escrevi o teste. Com o código de hoje ele falharia, e o tech-lead classificou o caso como Minor e o mandou para
    a `08-revisao`.
  - Teste sugerido para acompanhar a correção, com duas conexões:
    1. A conexão 1 abre a transação, trava a pendente vencida e grava a `entrada_bruta` da conversão.
    2. A conexão 2 roda `expurgar` e fica esperando no `DELETE` da pendente. Isso pode ser confirmado por
       `pg_stat_activity.wait_event_type = 'Lock'`.
    3. A conexão 1 apaga a pendente e faz o commit.
  - Esperado depois da correção: a `entrada_bruta` nova também sai expurgada na mesma execução.
- **`dois expurgos ao mesmo tempo` não prova a trava.** O teste de `expurgar.test.ts` provavelmente passa sem o
  `pg_advisory_xact_lock`. Em READ COMMITTED, o `WHERE expurgada_em is null` já impede o evento duplicado (parecer 2 da
  revisão). Ele prova o resultado, não a trava. Não é instável.
- **`parar()` provado por espera fixa.** O teste `parar() tira também o work de retencao.expurgo` usa a mesma espera de
  2,5 s de relógio real que o Minor da T30. É fraco, mas não falha à toa.
- **Os testes de worker dependem do agendador real do pg-boss.** Como os da T29 e da T30, eles esperam o estado do job
  por `expect.poll`. O relógio de negócio é o `relogioFixo`. O cron `0 3 * * *` só dispararia se a suíte rodasse
  exatamente às 03:00 de São Paulo. Nesse caso, o teste 3 poderia ver a falha consumida por outro job. O risco é baixo e
  vale também para os testes que já existiam.

## Decisões tomadas

- **Os 3 testes novos ficaram no arquivo do job, que já existia.** Razão: ele já tem o banco, a fila com agendador e o
  worker montados. Um arquivo novo pediria outro Testcontainers só para isso.
- **A falha da primeira tentativa vem de um prazo inválido na configuração, e não de um relógio ou pool quebrados.**
  Razão: o relógio e o pool são lidos também pelo batimento do worker, o que deixaria a contagem de falhas incerta. No
  worker, só o handler do expurgo lê `retencaoDias`. Conferi com `git log -S retencaoDias`: fora dele, só
  `texto-recebido.ts`, que é do app.
- **O teste 3 não espera o estado `retry`.** Razão: com `batchSize` 1 e a espera padrão do pg-boss, o job volta a ser
  buscado quase na hora, e o estado `retry` pode durar milissegundos. O `retry_count` 1 no job concluído prova a nova
  tentativa sem depender de pegar esse instante.
- **Não escrevi o teste do parecer 1.** Razão: ele falharia com o código de hoje, e o tech-lead já o mandou como Minor
  para a 08. O desenho do teste fica nas Pendências, para entrar junto da correção.

## Pendências

- **Para a `08-revisao`, junto do parecer 1 da `06-T31-revisao`:** o teste de duas conexões descrito na Leitura crítica.
  Ele deve falhar antes da troca de ordem (`DELETE` da pendente antes do `UPDATE` de `entrada_bruta`) e passar depois.
- **Minor para a `08-revisao`, junto do parecer 2:** se a trava ficar, um teste que a prove. Um caminho é segurar a
  trava `pg_advisory_xact_lock` numa conexão e conferir que `expurgar` espera. Se ela sair, o teste
  `dois expurgos ao mesmo tempo` continua valendo pelo `WHERE`.
- **Minor, igual ao da T30:** o teste `parar() tira também o work de retencao.expurgo` prova a ausência só por uma
  espera de 2,5 s.
- **Para a T34 (sentinelas transversais):** os testes novos já conferem o log e o histórico do expurgo com sentinelas. A
  T34 pode incluir `retencao.expurgo` na varredura do esquema `pgboss`. O payload é vazio e o `output` do erro é a
  mensagem fixa `expurgo_erro`.
- Seguem abertas, sem mudança, as pendências da `06-T31-construcao` e da `06-T31-revisao`: o parecer 3 (`executar.ts`
  com a pendente já expurgada), a fonte do último expurgo para a T45 e as notas para o `deploy.md`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 441ab27..a5cac75` — 3 commits; código e testes da T31 só no f09162a, os dois arquivos de teste novos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -12` — topo ee58137 (06-T31-revisao), depois a5cac75
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 441ab27..a5cac75 -- src/worker/iniciar.ts` — registro de `retencao.expurgo` e entrada no `parar()`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S retencaoDias --name-only --format=%h` — quem lê o prazo: só o handler do expurgo no worker e `texto-recebido.ts` no app
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/jobs/expurgo-texto-bruto.test.ts` — 9 de 9
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent=true --reporter=dot` — 135 arquivos, **2692 de 2692**
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent=true src/jobs/expurgo-texto-bruto.test.ts src/modules/retencao` — 2 arquivos, 32 de 32 (segunda execução, estabilidade)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — só `src/jobs/expurgo-texto-bruto.test.ts`, 109 linhas acrescentadas e 1 removida (o `truncate` trocado)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — só `src/jobs/expurgo-texto-bruto.test.ts` alterado

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste (CA-24.1 a CA-24.4 no módulo e pelo job no worker, mais RNF-08, C-31, C-32, D1, D2 e D7; tabela na Entrega)
- [x] a suíte inteira passa (2692 de 2692)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real. Cada um começa com `demanda`, `entrada_pendente`, `evento`, `rotina_execucao` e os jobs da fila limpos e cria os próprios dados. O relógio de negócio é o `relogioFixo`, e a espera é por `expect.poll` sobre o estado do job, não por tempo fixo
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada. Conferido com `git diff --stat`: a única linha trocada é o `truncate` do `beforeEach`, que passou a limpar mais uma tabela
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real (sentinelas de `test/sentinelas.ts`, "Pessoa Ficticia" e domínio `.test`)
