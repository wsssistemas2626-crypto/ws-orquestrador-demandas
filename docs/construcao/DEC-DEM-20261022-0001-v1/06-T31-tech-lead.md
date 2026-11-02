---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T31-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12 e o resto), 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6, mapa das fases, T31, T32 a T35), 06-T31-engenheiro-backend.md, commits f09162a e a5cac75 (intervalo 441ab27..a5cac75, git show e git diff), 04-seguranca-aplicacao.md (início, C-06 a C-40, seção 4 D1 a D12, seções 5 e 6), 06-T30-tech-lead.md, src/modules/retencao/expurgar.ts, src/modules/retencao/expurgar.test.ts, src/jobs/expurgo-texto-bruto.ts, src/jobs/expurgo-texto-bruto.test.ts, src/worker/iniciar.ts (diff), src/lib/fila.ts, src/modules/historico/registrar.ts, src/modules/demandas/entradas-pendentes.ts, src/modules/limites.ts, src/db/schema/index.ts, src/db/schema/demandas.ts, src/db/schema/operacao.ts, src/db/schema/agentes.ts, saída do pnpm test gravada pela ferramenta nesta etapa (fim)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T31 (expurgo do texto bruto, da entrada pendente e das sessões vencidas), `engenheiro-backend`, 1ª
tentativa. O código e os testes entraram no commit `f09162a`. O `a5cac75` só regravou a entrega depois do bloqueio de
leitura, e revisei o intervalo `441ab27..a5cac75` inteiro. Não há problema Critical nem Important, e a tarefa entra. Os
três pontos abaixo são Minor e ficam em Pendências.

### O que foi conferido

- **Escopo.**
  - Os quatro arquivos do plano foram criados ou alterados: `expurgar.ts`, `expurgar.test.ts`,
    `expurgo-texto-bruto.ts` e `iniciar.ts`.
  - O extra é `src/jobs/expurgo-texto-bruto.test.ts`, o teste do handler e do registro no worker. Aceito pelo mesmo
    critério da T30: o G3.1 pede teste para todo comportamento.
  - Nenhum outro arquivo de código mudou. No intervalo, além disso, só mudaram a entrega e o `passagens.jsonl`.
- **Desvios da entrega.**
  - Aceitos os seis desvios, porque nenhum muda contrato de outra tarefa.
  - `DepsExpurgar = Pick<Deps, 'pool' | 'relogio'>` aceita `Deps`, que é a interface do plano, e também as dependências
    do worker, que não têm `auth`.
  - A segunda conferência do prazo (1 a 365, inteiro) protege qualquer chamador de apagar tudo com prazo 0.
- **RF-24, CA-24.1 a CA-24.4.**
  - Os quatro CA têm teste com banco real, papel do app e relógio fixo.
  - O limite é estrito, tanto no texto (90 dias fica, 90 dias e 1 ms sai) quanto na sessão (30 dias fica).
  - `expurgada_em is null` e o `DELETE` fazem a nova execução não repetir evento nem mudar a data.
  - Os campos estruturados ficam iguais. O teste compara `obterDemanda` antes e depois.
  - O `CHECK` `entrada_bruta_expurgo_check` (texto e origem nulos com data) é satisfeito pelo `UPDATE`.
- **C-31.**
  - A entrada pendente vencida é apagada, com o evento `entrada_pendente_expurgada`, `demandaId` nulo e
    `entidadeId` igual ao id da pendente, como o plano pede.
  - Não há FK para `entrada_pendente` em `execucao_agente` nem em outra tabela. Por isso o `DELETE` não falha por
    referência e não trava o expurgo inteiro.
  - `ultimoExpurgo(db)` lê `rotina_execucao` e devolve `null` antes da primeira execução. Está pronto para a T45.
  - A validação de 1 a 365 no boot é de tarefa anterior, e o job usa `deps.config.retencaoDias`.
- **C-32 e D7.**
  - Apaga a sessão vencida há mais de 30 dias e a verificação vencida.
  - O prazo do texto não muda o da sessão. Há teste com prazo 365.
- **C-21, C-22 e C-30.**
  - O log do módulo leva só `evento` e `quantidade`, e o teste confere as chaves exatas.
  - O handler registra `fila`, `jobId`, `quantidade` e o erro reduzido.
  - O payload passa por `PAYLOADS` (`z.strictObject({})`). Fora dele, o job é descartado sem o conteúdo no log.
  - O evento tem `antes` e `depois` nulos, e os testes procuram as sentinelas no histórico e no log.
  - O erro relançado ao pg-boss tem mensagem fixa e não tem `cause`.
- **Atomicidade.**
  - Uma transação só. O teste de falha no meio mostra que o texto, o evento e a rotina ficam ou saem juntos.
  - A trava de transação deixa duas execuções em fila.
- **Worker.**
  - `retencao.expurgo` usa `localConcurrency: 1` e `batchSize: 1`, e entra na lista do `parar()`.
  - O teste com pg-boss real chega a `completed`. Depois do `parar()`, o job fica `created`.
  - A fila usa as opções padrão do pg-boss (T07), com nova tentativa. Repetir é seguro, porque o expurgo é idempotente.
- **G3.**
  - Toda data vem do `Relogio`.
  - O SQL usa o query builder e o template `sql` com parâmetro, sem `sql.raw`.
  - O erro é `ErroDominio`.
  - Os dados são fictícios: sentinelas, domínio `.test` e IP `192.0.2.10`.
- **Verificação nesta etapa.**
  - `pnpm test`: 135 arquivos, 2689 de 2689.
  - `pnpm lint` e `pnpm typecheck`: limpos.
  - Árvore limpa no ramo `construcao/DEC-DEM-20261022-0001-v1`.

### Pareceres (todos Minor)

1. **`src/modules/retencao/expurgar.ts:47-57`. A ordem `UPDATE` do texto e depois `DELETE` da pendente deixa escapar
   a pendente convertida durante o expurgo.**
   - Problema: `travarEntradaPendente` trava a pendente com `FOR UPDATE`. A conversão grava a `entrada_bruta` com o
     `recebida_em` da pendente (`entradas-pendentes.ts:78`) e apaga a pendente. Se essa conversão acontecer durante o
     expurgo, o `UPDATE` de `entrada_bruta` já rodou com o snapshot da instrução e não vê a linha nova. Depois, o `DELETE`
     da pendente espera a trava e não acha mais a linha. Resultado: um texto já vencido fica até a execução do dia
     seguinte, e o RNF-08 ("prazo + 24 h") pode virar prazo + 48 h.
   - Razão: o caso é raro, porque exige converter uma pendente de 90 dias exatamente às 03:00, e o texto sai no dia
     seguinte. Por isso é Minor.
   - Caminho: inverter a ordem, com o `DELETE` de `entrada_pendente` antes do `UPDATE` de `entrada_bruta`. Em READ
     COMMITTED, o `UPDATE` seguinte tem snapshot novo e vê a `entrada_bruta` que a conversão gravou. O teste pode usar
     duas conexões: uma trava a pendente e converte, a outra roda o `expurgar`. No fim, as duas linhas estão expurgadas.
2. **`src/modules/retencao/expurgar.ts:28` e `:42`. Chave da trava como número mágico, fora do padrão do repositório,
   e sem teste que falhe sem ela.**
   - Problema: `TRAVA_EXPURGO = 731_031` é um inteiro escolhido à mão. `src/modules/limites.ts:49` deriva a chave de um
     nome, com `hashtextextended('limite:...', 0)`. O teste "dois expurgos ao mesmo tempo" (`expurgar.test.ts:129-136`)
     provavelmente passa sem a trava, porque, em READ COMMITTED, o segundo `UPDATE` reavalia `expurgada_em is null`
     depois de esperar a linha.
   - Razão: duas formas de chave podem colidir sem aviso, e o leitor não sabe a que ela pertence. A trava é defensiva e
     barata, por isso fica. Mas o comentário a apresenta como garantia de "um evento por texto", e quem garante isso é o
     `WHERE`.
   - Caminho: usar `pg_advisory_xact_lock(hashtextextended(${'retencao.expurgo'}, 0))`, com a constante
     `ROTINA_EXPURGO`, e ajustar o comentário: a trava evita trabalho dobrado e espera entre execuções, e a unicidade do
     evento vem do `WHERE`.
3. **`src/modules/retencao/expurgar.ts:57`. A pendente `aguardando` vencida é apagada com a execução do orquestrador
   ainda viva.**
   - Problema: o engenheiro já registrou o caso. O plano manda apagar toda pendente vencida, sem filtro de status, e o
     código segue o plano. Se a execução terminar depois do expurgo, `travarEntradaPendente` devolve `nao_encontrado`.
   - Razão: com o prazo mínimo de 1 dia e as tentativas em minutos (P1-e), isso só acontece com o worker parado por mais
     de um dia. A pendente vencida também tem de sair pela LGPD (C-31). Por isso não é defeito desta tarefa.
   - Caminho, para a 08: conferir que `executar.ts` trata `nao_encontrado` na conversão como execução encerrada, sem
     nova chamada ao provedor, e cobrir isso com um teste se ainda não houver.

### Checklist da seção 12 do padrão técnico

- [x] A tarefa faz o que o plano pede, nem mais nem menos. Os arquivos fora da tarefa não mudaram, e o único extra é o
      teste do handler, que é justificado.
- [x] Há teste para cada comportamento novo, e ele falharia sem o código. Os dois arquivos nasceram vermelhos, sem
      módulo, e cada regra tem caso próprio. A trava defensiva fica no parecer 2.
- [x] Nenhum segredo, valor de `.env` ou dado pessoal real em código, teste, log ou fixture. Os dados são sentinelas,
      domínio `.test`, IP de documentação e tokens `token-ficticio-*`.
- [x] Entrada externa validada com Zod, e o erro não vaza detalhe. O payload do job passa por `PAYLOADS`, e o erro
      relançado tem mensagem fixa, sem `cause`.
- [x] Banco: não há migration nesta tarefa. As tabelas são da T05 e da T06, o acesso é pelo papel do app com o query
      builder, e não há `tenant_id`.
- [x] Nada duplica função que já existe no repositório. O registro de evento usa `registrarEvento`, e a transação usa
      `comTransacao`.
- [x] Textos de interface em pt-BR. A mensagem de `ErroDominio` está em pt-BR, e não há tela tocada nem axe a rodar.
- [x] O que é Minor foi para Pendências. Não há Critical nem Important.
- [x] Revisão do PR: não se aplica a esta etapa. Fica com a `08-revisao`.

## Decisões tomadas

- **A tarefa passa sem devolução.** Razão: não há Critical nem Important. Os três pontos são de robustez em
  concorrência e de consistência, e não mudam o comportamento pedido pelo plano.
- **Aceito o teste extra do handler e do worker.** Razão: é o mesmo critério da T30, e ele prova o registro da fila e o
  `parar()`.
- **Aceito a nova tentativa do pg-boss no expurgo.** Razão: o expurgo é idempotente, e repetir ajuda a cumprir o RNF-08
  sem duplicar evento.
- **Aceito apagar a pendente sem olhar o status.** Razão: é o que o plano e C-31 pedem. O efeito sobre a execução viva
  fica para a 08 (parecer 3).

## Pendências

- Para a `08-revisao`: pareceres 1 (ordem `DELETE` antes do `UPDATE`), 2 (chave da trava pelo nome) e 3 (como
  `executar.ts` trata a pendente já expurgada). Os três cabem numa passagem do `engenheiro-backend`.
- Para a T45 (`engenheiro-frontend`): `ultimoExpurgo(db)`, em `src/modules/retencao/expurgar.ts`, é a fonte de "último
  expurgo" em `/configuracao` (C-31) e devolve `null` antes da primeira execução.
- Para a `06-T31-testes` (`qa-automacao`):
  - a nova tentativa real pelo pg-boss (job em `retry` até `completed`) não está coberta;
  - o caso do parecer 1, com duas conexões, também não está coberto.
- Para a `10-documentacao`, já listado pelo engenheiro:
  - o expurgo roda às 03:00 de São Paulo, no `worker`;
  - o prazo vem de `RETENCAO_TEXTO_BRUTO_DIAS` (padrão 90, de 1 a 365);
  - a sessão sai 30 dias depois de vencer, e a verificação sai quando vence;
  - pelo D12, o prazo efetivo do texto é de 90 + 30 dias, por causa do backup.
- Seguem abertos, sem mudança:
  - os Minor 1 a 6 da `06-T30-revisao`;
  - os Minor 1 e 3 da `06-T29-revisao`;
  - os Minor das revisões anteriores;
  - o aviso do undici "Using `patch`".

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — topo a5cac75, depois e9f1688, f09162a e 441ab27
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 441ab27..a5cac75` — 7 arquivos, +714 −2
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 441ab27..a5cac75 -- src` — diff do código (saída gravada pela ferramenta)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 441ab27..a5cac75 -- src/worker/iniciar.ts` — registro da fila e `parar()`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat --format=%H a5cac75` — só a entrega e o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S pg_advisory --oneline` — 4 commits com trava consultiva
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S pg_advisory --name-only --format=%h` — `limites.ts`, `test/banco.ts` e `expurgar.ts`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent=true --reporter=dot` — 135 arquivos, 2689 de 2689
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, ramo `construcao/DEC-DEM-20261022-0001-v1`

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
