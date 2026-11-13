---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T03-testes
agente: qa-automacao
leu: [pedido.json, contrato-passagem.md, tarefas.json, 01-analista-requisitos.md (RF-12, CA-12.1 a CA-12.6, RNF-02), 04-seguranca-aplicacao.md (AN-07 e AN-08, por busca), 06-T02-qa-automacao.md, 06-T03-engenheiro-backend.md, 06-T03-tech-lead.md, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (G3 9 a 12, G4 a G7 e T03), commit b1e37f549a53c58abae399548fed3ca02ed03508 (git show), src/modules/limites.ts, src/db/transacao.ts, src/db/schema/andamento.ts, src/modules/acesso/ator.ts, src/lib/relogio.ts, src/lib/erros.ts, src/lib/reduzir-erro.ts, src/modules/limites-integracao-qa.test.ts, test/banco.ts, test/deps.ts (por busca), test/pedidos-construcao.ts, test/estatico/relogio.test.ts, test/estatico/piso-de-assercoes.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T03 (limite de gravações de andamento, 60 por DEC e 600 no total por hora, AN-07), sobre o commit
`b1e37f549a53c58abae399548fed3ca02ed03508`. O código cumpre os critérios da tarefa e não há devolução. Acrescentei um
arquivo com 47 testes. Ele cobre as bordas que o teste do plano não pega e resolve os dois Minor da `06-T03-revisao`
sem mexer no teste do engenheiro.

### Critérios da tarefa e o teste que cobre cada um

A T03 cobre RF-12 (na função), RNF-02, AN-07, AN-08 (c), ADR-31 e CA-12.6. O 429 pela rota (CA-12.1 a CA-12.5 de ponta
a ponta) é da T08. Aqui eles ficam cobertos no nível da função, com Postgres real.

| Critério | Teste (arquivo › nome) |
|---|---|
| AN-07: só o `construir` conta; todo outro ator lança (Minor 1) | **novo** `src/modules/limites-andamento-qa.test.ts` › "%s: Error com a mensagem própria, 500 genérico na resposta, sem trava, consulta nem relógio" (31 casos: awave, 14 variantes da integração (caixa, espaços, quebra de linha, largura zero, BOM, largura total, jarvis, vazio, `__proto__`, `toString`, `String` embrulhada, lista), pessoa cto, administradora e com id "construir", os 4 agentes com token e do worker, sistema). Confere a mensagem exata `limite: só o /construir registra andamento`, que não é `ErroDominio`, que vira 500 genérico e que a transação e o relógio **não foram tocados** (Proxy que registra qualquer acesso) |
| AN-07: `switch` exaustivo, falha fechada | **novo** › "%s: falha fechada em \"ator desconhecido\", sem tocar a transação" (tipo desconhecido, tipo com caixa trocada, sem tipo) |
| AN-08 (c): pessoa, agente e Awave nunca tomam a trava (Minor 2) | **novo** › "AN-08 (c): com a trava segurada, %s recebe a própria recusa, não o 55P03 de quem esperou" (awave, pessoa, agente, sistema), com `lock_timeout` de 200 ms em vez de tempo medido; `limites-andamento.test.ts` › "%s lança antes de tomar a trava (AN-08 c)" |
| ADR-31 e AN-08: a trava é a literal, do construir, e dura só a transação | **novo** › "com a trava segurada por outra conexão, o construir espera por ela (55P03 com lock_timeout curto), em qualquer DEC", "a chave não depende do DEC: uma trava com o id do DEC na chave não segura o construir" e "a trava fica com a transação do construir até o COMMIT ou o ROLLBACK, e é solta nos dois" |
| RF-12: janela móvel de 60 min pelo `Relogio` | `limites-andamento.test.ts` › "janela móvel: as de 61 min atrás não contam"; **novo** › "60 linhas exatamente 60 min antes não contam; 1 ms depois contam (429 por DEC); o relógio avança 1 ms e passa" (borda estrita do `gt`) e "as linhas fora da janela não entram no total" |
| CA-12.1: 61ª do DEC é 429 e nada é gravado | `limites-andamento.test.ts` › "59 do DEC passa; 60 dá 429..."; **novo** › "CA-12.1: com 60 na janela, a 61ª gravação é 429 sem extras, a message não leva o DEC, e nada é gravado" (`mapearErro` → 429 com o corpo exato; `message` = `limite_excedido`; contagem fica 60) |
| CA-12.3: DEC B passa com A no limite; 601ª no total é 429 | `limites-andamento.test.ts` › "59 do DEC passa; 60 dá 429...; outro DEC passa" e "total: 599 em outro DEC passa; 600 dá 429"; **novo** › "60 no DEC x e 540 no z: x recebe a mensagem por DEC; y recebe a do total; com 59 em x e 541 em z, x recebe a do total" (ordem das duas conferências) |
| CA-12.4 e RNF-02: o ritmo do /construir nunca chega ao limite | **novo** › "90 gravações de um DEC, uma a cada 2 min por 3 h: todas gravam, e a janela da última tem 30" |
| CA-12.5: 59 no DEC e duas simultâneas, uma passa | **novo** › "59 no DEC e duas gravações simultâneas: uma grava, a outra é 429 por DEC; o DEC fica com 60" e "55 no DEC e dez gravações simultâneas: exatamente 5 gravam e 5 recebem 429; o DEC fica com 60, nunca 61"; `limites-andamento.test.ts` › "599 no total e duas gravações simultâneas de DEC diferentes" |
| AN-07: conferir não grava | **novo** › "conferir não grava: a tabela fica igual depois de passar e de recusar" |
| AN-07: números e mensagens fixos | `limites-andamento.test.ts` › "constantes: 60, 600, a chave literal e as mensagens"; **novo** › "LIMITE_ANDAMENTO e as duas entradas são congeladas: escrever lança TypeError e os números ficam" |
| CA-12.6: limites de Awave (10), pessoa e agente (30, 60) sem mudança | `limites-andamento.test.ts` › "CA-12.6: os limites de pessoa, agente e Awave não mudam" (só `LIMITE_POR_HORA`); **novo** › "CA-12.6: Awave 10, pessoa e agente 30 e 60, com as mesmas mensagens; o construir continua sem limite de demanda e artefato" (por `limiteDe`, com mensagens, e as duas mensagens novas diferentes das antigas); `limites.test.ts` e `limites-integracao*.test.ts` sem mudança |

### Testes acrescentados

- `src/modules/limites-andamento-qa.test.ts` (novo, 47 testes): 36 unitários, sem banco (atores recusados, constantes,
  CA-12.6), e 11 com Postgres real pelo papel do app, relógio fixo por teste e DEC pelo caminho real
  (`preparadorDePedidos`).
- `test/estatico/piso-de-assercoes.test.ts`: o `PISO` ganhou `'src/modules/limites-andamento-qa.test.ts': 58`, as linhas
  com `expect(` contadas com `git grep -c --untracked`. O piso só sobe.

### Os dois Minor da 06-T03-revisao

- **Minor 1 (`rejects.toThrow()` sem mensagem):** os testes novos conferem a mensagem exata e que nada da transação nem
  do relógio foi lido. Um `TypeError`, um erro de banco ou uma trava tomada antes da recusa reprovam.
- **Minor 2 (`performance.now()` direto):** os testes novos não medem tempo. Quem espera pela trava cai em `55P03` com
  `lock_timeout` de 200 ms, e a recusa do ator é distinta desse código. O teste do engenheiro ficou como está (é o do
  plano). Se a `08-revisao` quiser, o caso dele pode ser trocado por este molde.

### Resultado

- O arquivo novo: 47 de 47 (duas rodadas). Com o teste do engenheiro e o do piso: 3 arquivos, 100 de 100.
- `pnpm test` completo: **315 arquivos, 6697 testes passaram, 0 falharam** (230 s). Eram 6647 na entrega do engenheiro.
  Somam 47 testes novos, 1 entrada do `PISO` e 2 testes gerados por varreduras de arquivos, que agora enxergam o
  arquivo novo.
- `pnpm lint` e `pnpm typecheck`: limpos, antes e depois da edição do `PISO`.

### Conferência com `git diff`

- Meu diff tem só as duas linhas novas do `PISO` (entrada e comentário). O resto é o arquivo novo, ainda não rastreado.
- No commit da T03, nenhum teste foi apagado nem levou `.skip`, `.only` ou `.todo`. Ele cria `limites-andamento.test.ts`
  e acrescenta uma linha ao `PISO`. `limites.test.ts` não mudou (G5).
- O arquivo novo não tem `.skip`, `.only`, `.todo`, `performance` nem `Date.now`. Os dados são fictícios (prefixo
  `ficticio`, "Pessoa Ficticia"). Nenhum token é escrito.

## Decisões tomadas

- **Arquivo `-qa` separado:** é o padrão do repositório e deixa o teste do plano e o piso dele intactos.
- **Transação e relógio "intocáveis" por Proxy:** provam que a recusa vem antes de qualquer trava, consulta ou leitura
  de hora, sem banco e sem medir tempo.
- **`lock_timeout` curto em vez de cronômetro:** separa quem esperou pela trava (55P03) de quem foi recusado antes. É o
  mesmo molde de `limites-integracao-qa.test.ts`, e não depende do relógio real.
- **`pg_try_advisory_xact_lock` numa instrução só:** confere se a trava está livre sem deixar trava de sessão presa na
  conexão do pool.
- **Cada teste de banco limpa a tabela e cria o próprio relógio:** a ordem dos testes não importa.
- **Comandos `pnpm` com `--dir <repo>`:** o shell do agente começa na estruturaAutonoma, e `cd` não está na lista Pode.
  É a mesma forma das entregas anteriores deste pedido.

## Pendências

- Nenhuma bloqueia a passagem.
- Para a `06-T07` (serviço): os testes de concorrência daqui gravam com `tx.insert` logo depois da conferência, na mesma
  transação. O serviço deve seguir essa ordem (a conferência antes do `INSERT`, na mesma transação). Os 409 e o "mesmo
  estado" vêm antes da conferência (AN-07).
- Para a `06-T08` (rota): o CA-12.1 a CA-12.5 pela rota (429 no corpo HTTP, 204 no mesmo estado do CA-12.2) continuam
  com a T08. Aqui eles estão cobertos só no nível da função.
- Para a `08-revisao`: o Minor 2 continua no teste do engenheiro (`performance.now()` em
  `src/modules/limites-andamento.test.ts`). O molde sem tempo está neste arquivo, no `it.each` de AN-08 (c).
- Li a saída do `pnpm test`, que rodou em segundo plano, só pela ferramenta Read. Não rodei comando fora da lista Pode.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — arquivos da pasta do pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show b1e37f549a53c58abae399548fed3ca02ed03508 -- src test` — código e teste da T03
- `grep -rn -e "RF-12" -e "CA-12" -e "RNF-02" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1/01-analista-requisitos.md` — RF-12, CA-12.x e RNF-02
- `grep -rn -e "AN-07" -e "AN-08" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1/04-seguranca-aplicacao.md` — AN-07 e AN-08
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "^### Tarefa 3" -e "^### Tarefa 4" -e "^## G" -- docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md` — sem resultado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "T03" -- docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md` — seção da T03 no plano
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/limites.ts` — a função e as constantes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/db/transacao.ts` — `comTransacao` e o 55P03
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files -- "src/modules/limites*" "test/*limite*" "src/lib/relogio*"` — testes de limite existentes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/lib/relogio.ts` — `relogioFixo` e `avancar`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/acesso/ator.ts` — tipos de ator e `atorDesconhecido`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/lib/reduzir-erro.ts` — `reduzirErro` e `lerCode`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/limites-integracao-qa.test.ts` — molde do teste de limite com trava
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/db/schema/andamento.ts` — colunas, CHECKs e índices
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/pedidos-construcao.ts` — `preparadorDePedidos`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/banco.ts` — `poolMigrator` com `max: 2`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/lib/erros.ts` — `mapearErro` e `ErroDominio`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "export" -e "max" -e "timeout" -- src/db/index.ts test/integracoes.ts src/db/schema/agentes.ts src/db/schema/acesso.ts` — pool, integrações e agentes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/estatico/piso-de-assercoes.test.ts` — o `PISO` de hoje
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -4` — `3077bdc` (06-T03-revisao) no topo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/estatico/relogio.test.ts` — o que a guarda do relógio proíbe
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "export" -e "pool" -- test/deps.ts` — `criarDepsDeTeste`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/limites-andamento-qa.test.ts --reporter=dot` — 47 de 47
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c --untracked "expect(" -- src/modules/limites-andamento-qa.test.ts` — 58
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot --silent` — 315 arquivos, 6697 de 6697
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — só as linhas novas do `PISO`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat b1e37f549a53c58abae399548fed3ca02ed03508` — 3 arquivos de código e teste, mais a passagem
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "\.skip" -e "\.only" -e "\.todo" -- src/modules/limites-andamento-qa.test.ts src/modules/limites-andamento.test.ts` — nada
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n --untracked -e "\.skip" -e "\.only" -e "\.todo" -e "performance" -e "Date.now" -- src/modules/limites-andamento-qa.test.ts` — nada
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo, depois do `PISO`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo, depois do `PISO`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — o `PISO` modificado e o arquivo de teste novo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/limites-andamento-qa.test.ts src/modules/limites-andamento.test.ts test/estatico/piso-de-assercoes.test.ts --reporter=dot` — 3 arquivos, 100 de 100

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
