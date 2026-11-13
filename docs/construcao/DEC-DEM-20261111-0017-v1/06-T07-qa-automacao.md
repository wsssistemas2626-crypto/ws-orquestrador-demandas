---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T07-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (T07, linhas 1721 a 2043), 01-analista-requisitos.md (RF-03 a RF-06, linhas 90 a 290), 04-seguranca-aplicacao.md (AN-03, AN-05, AN-06, AN-08), 06-T06-qa-automacao.md (forma da entrega), 06-T07-engenheiro-backend.md, 06-T07-tech-lead.md, commit 59a231c (src/modules/andamento/registrar.ts, registrar.test.ts, registrar-concorrencia.test.ts, registrar-prazo.test.ts, test/andamento.ts), src/modules/pedido-construcao/pendentes.ts, entregar.ts, receber.ts, conferir.ts, src/modules/integracoes/tempo-limite.ts, src/db/transacao.ts, src/lib/rota.ts, src/lib/erros.ts, src/lib/deps.ts, src/modules/andamento/schemas.ts, src/modules/historico/registrar.ts (registrarEvento), src/modules/demandas/transicoes.ts (mudarStatusPeloConstruir), src/modules/versoes.ts (travarDemanda), test/pedidos-construcao.ts, test/requisicao.ts, test/integracoes.ts, test/estatico/andamento.test.ts (1 a 60), test/estatico/andamento-qa.test.ts, test/estatico/piso-de-assercoes.test.ts (1 a 40), src/app/api/pedidos-construcao/recebimento-qa.test.ts (1 a 120, molde)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verificação da T07 (serviço `registrarAndamento`, commit `59a231c`). O código cumpre os critérios da tarefa e resistiu
aos ataques que o maestro pediu: nenhum teste novo falhou contra o código. Acrescentei um arquivo,
`src/modules/andamento/registrar-qa.test.ts`, com 14 testes (69 linhas com `expect(`). Não mudei nenhum teste existente.

### Critérios da tarefa e o teste que cobre cada um

`registrar.test.ts`, `registrar-concorrencia.test.ts` e `registrar-prazo.test.ts` ficam em `src/modules/andamento/`;
`registrar-qa.test.ts` é o arquivo novo.

| Critério | Arquivo | Teste |
|---|---|---|
| AN-01: só o `construir`, antes de abrir transação | `registrar.test.ts` | `AN-01: só o /construir, antes de abrir transação > %s: sem_permissao, e o pool nem é tocado` (um por ator) |
| CA-03.1 a CA-03.4 e AN-03 no serviço (o mesmo erro, nada muda) | `registrar.test.ts` | `AN-03 e CA-03.1 a CA-03.4 > inexistente, sem pedido_gerado, gerado por agente, por sistema e por pessoa noutra demanda…` |
| CA-03.1 a CA-03.3 e AN-03 byte a byte (status, corpo e cabeçalhos), pelo `rota()` real | `registrar-qa.test.ts` | **novo** `AN-03 adversarial… > nove formas de DEC sem pedido gerado por pessoa na própria demanda: mesmo status, mesmos bytes e mesmos cabeçalhos do inexistente; nada muda` |
| AN-03: o 404 não toma a trava da demanda (sem oráculo de tempo) | `registrar-qa.test.ts` | **novo** `… > sem oráculo de tempo: com as demandas travadas por uma pessoa, o 404 sai sem esperar; o DEC com pedido gerado espera a mesma trava` |
| AN-03 e AN-05: o DEC inexistente entra na mesma fila `pedido:<decId>` | `registrar-qa.test.ts` | **novo** `… > o DEC inexistente entra na mesma fila pedido:<decId> que o existente: espera quem a segura e só depois dá 404` |
| CA-04.1, CA-04.5, CA-06.1, CA-06.4 | `registrar.test.ts` | `CA-04 e CA-06 > CA-04.1, CA-04.5, CA-06.1, CA-06.4: o primeiro envio grava a linha…` |
| CA-04.2 e CA-05.9 | `registrar.test.ts` | `… > CA-04.2 e CA-05.9: o mesmo corpo de novo não grava nada…` |
| CA-04.3, CA-04.4 e CA-06.3 | `registrar.test.ts` | `… > CA-04.3, CA-04.4 e CA-06.3: só os números mudam…` |
| CA-06.2 | `registrar.test.ts` | `… > CA-06.2: mudança de fase cria andamento_registrado com o antes do anterior` |
| CA-05.1 | `registrar.test.ts` | `CA-05 > CA-05.1: aprovada (pela pessoa) + em_construcao → em_construcao…` |
| CA-05.2 e CA-05.3 | `registrar.test.ts` | `CA-05 > CA-05.2 e CA-05.3: em em_construcao, construido não muda o status; cancelado leva a devolvida…` |
| CA-05.4 a CA-05.7, CA-05.10 e AN-04 (9 status × 3 × 2 tipos, com banco) | `registrar.test.ts` | `CA-05.4 a CA-05.7 e AN-04: a tabela inteira com banco > %s em %s + %s` (54 casos) |
| CA-05.8 | `registrar.test.ts` | `CA-05 > CA-05.8: com o v2 aprovado, o envio do v1 é 409 decSubstituido e nada muda` |
| CA-05.8 pelo `rota()`: o 409 não cita o substituto e tem os cabeçalhos do 404 | `registrar-qa.test.ts` | **novo** `AN-03 adversarial… > a fronteira: o DEC substituído que teve pedido gerado é 409 decSubstituido (CA-05.8), sem dizer o substituto, e nada grava` |
| CA-05.11 | `registrar-qa.test.ts` | **novo** `CA-05.11… > em devolvida pelo envio, a pessoa só leva a em_construcao ou em_analise; as outras são recusadas sem mudar nada` |
| AN-04: o mesmo corpo pelo v2 grava e cria evento | `registrar.test.ts` | `CA-05 > AN-04: o mesmo corpo pelo v2 vigente…` |
| CA-12.1 no fluxo e a ordem "mesmo estado antes do limite" | `registrar.test.ts` | `CA-12 no fluxo > com 60 linhas do DEC no último minuto…` |
| CA-06.6 | `registrar.test.ts` | `CA-06.6 > seis fases, prontas de 0 a 20…: 27 linhas e 7 andamento_registrado` |
| AN-11 | `registrar.test.ts` | `AN-11 > depois (e antes, quando há) só com as quatro chaves…` |
| AN-05 (a) e RNF-06 | `registrar-concorrencia.test.ts` | `AN-05 > (a) dois envios iguais do mesmo DEC ao mesmo tempo…` |
| AN-05 (b), (c), (d) e (e) | `registrar-concorrencia.test.ts` | `AN-05 > (b)…`, `(b) o inverso…`, `(c)…`, `(c) o inverso…`, `(d)…`, `(e)… 50 vezes` |
| AN-05 e M-4 da 0019: andamento × entrega × recebimento do mesmo DEC | `registrar-qa.test.ts` | **novos** `AN-05 e M-4 da 0019… >` os quatro testes (ver abaixo) |
| AN-06 (a) e (b) | `registrar-prazo.test.ts` | `AN-06 > (a) 7 s gastos na espera pela conexão…`, `(b) o relógio monotônico passa de 8 s no meio…` |
| AN-06: prazo vencido depois de cada escrita, e antes da conexão | `registrar-qa.test.ts` | **novos** `AN-06 adversarial… >` os cinco testes (ver abaixo) |
| AN-06 estático | `test/estatico/andamento.test.ts` | `AN-06: prazo total do registro, sem piso por cima (T07) >` os cinco testes |
| AN-08 (1), (2) e (3) | `registrar-concorrencia.test.ts` | `AN-08 > (1)…`, `(2)…`, `(3)…` |

### Testes acrescentados (`src/modules/andamento/registrar-qa.test.ts`)

1. **404 sem oráculo, pelo `rota()` real.** O arquivo monta, só para o teste, um handler com o `rota()` do projeto, como
   o plano descreve a rota da T08: regex do DEC, Bearer do token `construir` real, `corpoAndamentoSchema` com o 422
   próprio e `registrarAndamento`. Assim a resposta passa pelo mesmo `mapearErro` e pelos mesmos cabeçalhos da rota de
   verdade. Cada caso é comparado com o DEC inexistente em status, bytes do corpo e cabeçalhos (lista ordenada), com dois
   corpos (o de construção e um `cancelado`, que mudaria o status). São oito casos:
   - fora do formato;
   - sem pedido gerado;
   - substituído sem pedido;
   - **de outra demanda**: um `pedido_gerado` de pessoa forjado aponta para uma demanda em `em_construcao` com pedido
     gerado (a vítima). Ela não muda;
   - `pedido_gerado` de agente;
   - de sistema;
   - de pessoa na entidade `demanda`;
   - de pessoa sem `demanda_id`.

   O teste também confere que o retrato das oito demandas e o total de eventos do banco não mudam. Por último vem o
   controle: o mesmo handler, com o DEC da vítima, devolve 204 e grava. Assim fica provado que os 404 vêm da regra, e
   não de um defeito do handler.
2. **Fronteira do substituído com pedido:** dá 409 `decSubstituido`, sem o id do v2 no corpo, com os mesmos cabeçalhos
   e sem gravar (é o CA-05.8, não oráculo: só um DEC que já teve pedido gerado chega lá).
3. **Sem oráculo de tempo:** uma pessoa segura a trava das quatro demandas envolvidas. Os três 404 (sem pedido,
   substituído sem pedido, de outra demanda) saem com a trava ainda presa. Se algum deles tomasse a trava da demanda,
   esperaria o `lock_timeout` de 2 s e sairia 503. Controle: o DEC com pedido gerado aparece na fila atrás da pessoa
   (`pg_blocking_pids`) e grava depois de soltar.
4. **Mesma fila para o DEC inexistente:** com a trava consultiva `pedido:<id inexistente>` presa numa conexão do
   migrator, o envio entra na fila. Depois de soltar, sai o 404. A espera é a mesma do DEC existente.
5. **Entrega segura a trava do pedido** (`entregarPedido` dentro de uma transação aberta): o envio do mesmo DEC espera
   atrás dela, e os dois gravam (uma linha, um `pedido_entregue`).
6. **Recebimento segura a trava do pedido:** o envio espera atrás dele, e os dois gravam (`jaRecebido: false`, um
   `pedido_recebido`).
7. **Andamento na frente, três transações:** uma pessoa prende a demanda e o envio (`aprovada` → `em_construcao`) fica
   preso nela segurando a trava do pedido. A entrega e o recebimento do mesmo DEC entram na fila atrás do envio
   (conferido pelo pid do envio). Ao soltar, os três concluem sem deadlock nem 503. A ordem dos eventos é
   `status_alterado`, `andamento_registrado`, `pedido_entregue`, `pedido_recebido`. O recebimento só passa se vier
   depois da entrega, porque o hash é o da geração.
8. **20 rodadas dos três ao mesmo tempo** (`Promise.allSettled`): nenhum `40P01` nem `indisponivel`. O envio sempre
   grava. A entrega sempre devolve o mesmo `{ json, sha256 }`. O recebimento só pode ser recusado na rodada 0, e só por
   `naoEntregue`. No fim há 20 linhas, 1 `andamento_registrado`, 1 `pedido_entregue` e 1 `pedido_recebido`.
9. **CA-05.11:** com a demanda em `devolvida` pelo `cancelado`, `transicoesManuaisDe('devolvida')` é
   `em_analise, em_construcao`. A pessoa é recusada em `nova`, `aprovada`, `entregue` e `encerrada` sem mudar nada, e
   leva a demanda a `em_analise`.
10. a 12. **Prazo vencendo no meio** (`it.each`): a demanda está em `aprovada` e o envio mudaria o status. Um pool do
    app de uma conexão avisa o fim da instrução vigiada, e nesse ponto o relógio monotônico falso pula para 9 s. Os três
    pontos vigiados são o INSERT do andamento, o UPDATE do status e o INSERT do `andamento_registrado` (aí o corte é na
    conferência antes do COMMIT). Nos três: 503 `indisponivel` com `MENSAGEM_INDISPONIVEL`, o gatilho disparou uma vez,
    e andamento, status, `tipo`, `atualizada_em` e eventos ficam iguais aos de antes. A transição também é desfeita.
13. **Controle do pool vigiado:** sem o relógio pular, o mesmo pool grava e leva a demanda a `em_construcao`, e as três
    instruções vigiadas acontecem (3). Isso impede que os casos 10 a 12 passem por um gatilho que nunca casa.
14. **Prazo vencido antes da conexão:** o envio dá 503 `indisponivel` sem chamar `pool.connect`.

Sem relógio real: o relógio de domínio é `relogioFixo`, e o monotônico só muda por `vi.spyOn`. A ordem entre transações
é forçada pela fila do banco (`pg_blocking_pids`), com espera limitada a 2 s e sem sono fixo. Cada teste cria DEC e
autora próprios, e as contagens são por DEC ou relativas. O arquivo passou também em ordem embaralhada. Dados
fictícios; o token é gerado em tempo de teste e não aparece em mensagem.

### Resultado

- `pnpm test src/modules/andamento/registrar-qa.test.ts` (verbose): **14 de 14**. Embaralhado
  (`--sequence.shuffle`): **13 de 13** com a semente 1794541439080, antes do CA-05.11, e **14 de 14** com a semente
  1794541822305, depois dele.
- `pnpm test src/modules/andamento src/modules/pedido-construcao` (com 13 dos 14 testes novos; o CA-05.11 entrou
  depois): **18 arquivos, 616 de 616**.
- `pnpm test` completo, com os 13 testes novos: **328 arquivos, 7367 de 7367**, 199,75 s. Com os 14, depois do
  CA-05.11: **328 arquivos, 7369 de 7369, 0 falharam**, 193,32 s. Isso é um teste a mais que 7354 + 14. É a mesma
  variação de contagem que a revisão já notou entre 7353 e 7354, num teste gerado fora deste arquivo, e não muda o
  resultado.
- `pnpm lint` e `pnpm typecheck`: limpos (rodados de novo depois do CA-05.11).
- `git status --short`: só `?? src/modules/andamento/registrar-qa.test.ts`. `git diff --stat`: vazio (nenhum arquivo
  rastreado mudou).

### Leitura crítica dos testes do engenheiro

- Asserções fortes: retrato completo antes e depois, forma idêntica do erro nos cinco 404 e eventos conferidos chave a
  chave. Não achei teste instável nem asserção fraca. A fila por `pg_blocking_pids` em vez de sono fixo é a forma
  certa.
- Lacunas que fechei:
  - o 404 era comparado só como objeto de erro, e não como resposta (bytes e cabeçalhos);
  - nenhum teste mostrava que o 404 sai sem tocar a trava da demanda;
  - a corrida com a entrega e o recebimento do mesmo DEC (a lição M-4 da 0019) só estava presa pela guarda estática
    (import de `travarPedido`), não por comportamento;
  - o prazo vencido só era testado com o relógio subindo 1 s por leitura, sem um ponto escolhido depois das escritas,
    e sem a transição de status no caminho;
  - o CA-05.11 não tinha teste no serviço.
- O Minor 3 da revisão (o "nunca `entregue` nem `encerrada`" lido do valor da tabela) não precisa de teste novo: a linha
  273 de `registrar.test.ts` já exige que `depois.demanda.status` (lido do banco) seja `esperado ?? status`, e nenhum
  `esperado` da tabela é `entregue` ou `encerrada`. O 54×banco não foi repetido, para não dobrar o tempo do arquivo.

## Decisões tomadas

- Um arquivo novo `registrar-qa.test.ts`, sem tocar os do engenheiro: mantém a autoria e o piso deles intactos.
- O 404 byte a byte por um handler `rota()` local, e não pela rota da T08: a rota ainda não existe, e o `rota()` é o
  mesmo adaptador que ela vai usar. As guardas estáticas de quem cita a ação e de quem importa `registrar.ts` olham só
  código que roda (excluem `*.test.ts`), e passaram.
- O relógio pula no fim da instrução vigiada, observada pelo cliente do pg, e não por contagem de chamadas a
  `performance.now`: assim o teste não quebra se o serviço ganhar uma leitura a mais. O controle prova que o gatilho
  casa.
- Não acrescentei o arquivo novo ao `PISO`: o plano põe a atualização do piso no engenheiro (G4), e o piso é lista de
  permissão, não exigência.

## Pendências

- Nenhuma bloqueia a passagem.
- Para a `06-T08` (rota): repetir o 404 byte a byte pela rota real
  (`src/app/api/pedidos-construcao/[decId]/andamento/route.ts`) com os mesmos casos do teste 1. O handler local deste
  arquivo pode servir de molde; a T08 pode trocá-lo pela rota real, sem afrouxar asserção.
- Para a `08-revisao`: o AN-06 (c), a leitura do Awave com o andamento, é da T09.
- Forma de comando: rodei sete comandos só de leitura com alternativa no padrão, fora da forma da lista Pode. Estão em
  Comandos executados do jeito que rodaram. Nenhum alterou nada; peço a liberação como leitura (regra de 25/10):
  - cinco `git grep -n` com `\|` no padrão (sobre `conferir.ts`, `test/estatico`, `relogio.test.ts`, o esquema de
    `evento` e `historico/registrar.ts`);
  - um `grep -rn` com `\|` sobre o próprio arquivo de teste novo (busca sem efeito);
  - um `git grep -E` com `(skip|only|todo)`, para conferir que o arquivo novo não tem `.skip`, `.only` nem `.todo`
    (sem resultado).
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — entregas da pasta do pedido
- `grep -rn "AN-0" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1/01-analista-requisitos.md` — sem resultado (os AN estão na 04)
- `grep -rn "AN-0[3568]" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1/04-seguranca-aplicacao.md` — AN-03, AN-05, AN-06 e AN-08
- `grep -rn "CA-03" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1/01-analista-requisitos.md` — onde está o RF-03
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261111-0017-v1`, limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — `59a231c` e as passagens depois dele
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "throw\|export async function\|status" -- src/modules/pedido-construcao/conferir.ts` — recusas da entrega (git grep com `\|` em BRE, só leitura)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^export" -- src/lib/rota.ts src/lib/erros.ts` — o adaptador e o mapeador
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^export" -- src/lib/deps.ts test/requisicao.ts test/deps.ts test/integracoes.ts` — ajudantes de rota e token
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -l "definirDepsParaTeste" -- src/app/api/pedidos-construcao` — testes de rota do /construir, para o molde
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "IMPORTAM_REGISTRAR\|codigoQueRoda =" -- test/estatico` — as guardas excluem teste (git grep com `\|` em BRE, só leitura)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "registrar_andamento" -- test/estatico` — onde a ação é vigiada
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "RegExp\|/.*\\\\b\|glob\|filter" -- test/estatico/relogio.test.ts` — a guarda do relógio vale só fora de teste (git grep com `\|` em BRE, só leitura)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "demandaId\|demanda_id" -- src/db/schema/eventos.ts src/db/schema/evento.ts` — sem resultado (outro nome de arquivo; git grep com `\|` em BRE, só leitura)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A30 "export async function mudarStatusPeloConstruir" -- src/modules/demandas/transicoes.ts` — o UPDATE e o `status_alterado`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "demanda_id" -- drizzle/0000_*.sql` — `evento.demanda_id` aceita nulo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A12 "export async function travarDemanda" -- src/modules/versoes.ts` — `for update`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export" -- test/banco.ts src/lib/log.ts` — `novoBanco` e `substituirDestinoDoLog`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "insert\|execute\|values" -- src/modules/historico/registrar.ts` — como o evento é gravado (git grep com `\|` em BRE, só leitura)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento/registrar-qa.test.ts --reporter=verbose` — 11 de 13 (o gatilho do evento não casava; corrigido no teste, a leitura dos valores do pg)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento/registrar-qa.test.ts --reporter=verbose` — 13 de 13
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento/registrar-qa.test.ts --reporter=dot --sequence.shuffle` — 13 de 13 (semente 1794541439080)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento src/modules/pedido-construcao --reporter=dot --silent` — 18 arquivos, 616 de 616
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot --silent` — 328 arquivos, 7367 de 7367 (em segundo plano; saída lida com a ferramenta Read)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `grep -rn "Test Files\|Tests \|Duration\|FAIL" /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/modules/andamento/registrar-qa.test.ts` — sem resultado (busca sem efeito; fora da forma, ver Pendências)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só o arquivo novo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c --untracked "expect(" -- src/modules/andamento/registrar-qa.test.ts` — 63
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n --untracked -E "\.(skip|only|todo)\(" -- src/modules/andamento/registrar-qa.test.ts` — sem resultado (fora da forma, ver Pendências)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^export" -- src/modules/demandas/transicoes.ts` — `transicoesManuaisDe`, para o CA-05.11
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento/registrar-qa.test.ts --reporter=verbose` — 14 de 14, com o CA-05.11
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot --silent` — 328 arquivos, 7369 de 7369 (em segundo plano; saída lida com a ferramenta Read)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento/registrar-qa.test.ts --reporter=dot --sequence.shuffle` — 14 de 14 (semente 1794541822305)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c --untracked "expect(" -- src/modules/andamento/registrar-qa.test.ts` — 69
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só o arquivo novo

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
