---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T05-testes
agente: qa-automacao
leu: [pedido.json, contrato-passagem.md, padrao-tecnico.md, tarefas.json, 01-analista-requisitos.md (RF-04 a RF-06, CA-04.x a CA-06.x, seção 5), 06-T04-qa-automacao.md, 06-T05-engenheiro-backend.md, 06-T05-tech-lead.md, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (T05, linhas 1147 a 1166), commit dd173de8d332d26e3ade57a970830aa319a1bbfd (git show), src/db/transacao.ts (linhas 60 a 110), src/components/rotulos-qa.test.ts, src/modules/acesso/ator.ts, test/estatico/piso-de-assercoes.test.ts, test/estatico/andamento.test.ts, test/estatico/relogio.test.ts, test/estatico/sql-raw.test.ts, test/estatico/piso-de-assercoes-qa.test.ts, src/app/api/saude/route.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T05 (regras do andamento, transições do `/construir` e evento `andamento_registrado`; AN-04, AN-11, AN-12,
ADR-34, D-08), sobre o commit `dd173de8d332d26e3ade57a970830aa319a1bbfd`. O código cumpre os critérios da tarefa e não
há devolução. Acrescentei dois arquivos (168 testes), dois testes em `rotulos-qa.test.ts` e duas entradas no `PISO`.

### Critérios da tarefa e o teste que cobre cada um

A T05 cobre, pelo plano: RF-04 (idempotência e leitura), RF-05 (tabela), RF-06 (marco e forma do evento), CA-04.6
(unidade), CA-05.10, AN-04, AN-11 (forma), AN-12 (`lerAndamento`), ADR-34 e D-08. O 204/409 pela rota, a trava do
pedido, o DEC não vigente (CA-05.8), o "mesmo estado antes do 409" (CA-05.9) e a gravação do `andamento_registrado` no
banco são do serviço e da rota (T07 e T08); aqui ficam no nível das regras e da transição.

| Critério | Teste (arquivo › nome) |
|---|---|
| RF-04, CA-04.2: reenvio igual é "mesmo estado" | `regras.test.ts` › "mesmo estado só com os cinco campos iguais; cada campo diferente quebra"; **novo** `src/modules/andamento/regras-qa.test.ts` › "CA-04.2: o andamento gravado (com atualizadoEm) e o reenvio igual são o mesmo estado, qualquer que seja o instante" (o instante gravado não entra na comparação) |
| RF-04, CA-04.3 e CA-04.4: só números mudam, inclusive para menos, grava sem marco | `regras.test.ts` › "marco: o primeiro, ou fase, statusConstrucao ou decId diferente; só os números não (A2)"; **novo** `regras-qa.test.ts` › "CA-04.4: construindo 9/17 → construindo 3/19 grava (não é o mesmo estado) e não é marco" |
| RF-04, CA-04.5: sem regra, a demanda (status e `atualizada_em`) não muda | `transicoes-construir.test.ts` › "sem regra (construido, estudo, outra origem)…"; **novo** `src/modules/demandas/transicoes-construir-qa.test.ts` › "CA-05.10 no banco…" (os 51 casos sem regra conferem `atualizada_em` igual ao da criação e zero eventos) |
| CA-04.6 e AN-12 (unidade): linha fora do esquema vira "sem andamento", sem lançar | `regras.test.ts` › "fora do esquema (%s) → null, sem lançar" (9); **novo** `regras-qa.test.ts` › "%s → null, sem lançar" (23: entrada que não é objeto, chave faltando, negativo, fração, NaN, Infinity, bigint, data inválida e em número, fase e status parecidos com os da lista, status da demanda no lugar do da construção, DEC com espaço e id de demanda), "a vista tem exatamente seis chaves e não leva a demandaId nem chave a mais da linha" e "as bordas que valem: 0 de 0 e 999 de 999" |
| RF-05, CA-05.1 | `transicoes-construir.test.ts` › "aprovada + em_construcao → em_construcao, atualizada_em do relógio e status_alterado do construir com prefixo"; **novo** › "melhoria aprovada + em_construcao: …" |
| RF-05, CA-05.2 (com o evento) | `transicoes-construir.test.ts` › "em_construcao + cancelado → devolvida" (só o status); **novo** `transicoes-construir-qa.test.ts` › "em_construcao + cancelado → devolvida, com status_alterado do construir, o prefixo do token e o relógio injetado" |
| RF-05, CA-05.3, CA-05.6 e CA-05.7 | `transicoes-construir.test.ts` › "sem regra…" e "transicaoDoConstruir: estudo não vai para construção; construido nunca muda"; **novo** › os 54 casos de "CA-05.10 no banco" (aprovada + construido e + cancelado, devolvida + em_construcao, estudo) e `regras-qa.test.ts` › "construido nunca muda o status, em nenhuma origem e em nenhum tipo (RF-05)" |
| RF-05, CA-05.4 e CA-05.5 (a tabela da seção 5) | `regras.test.ts` › "decidirPorStatus (AN-04, CA-05.10): 9 status × 3 × tipo" (54); **novo** `regras-qa.test.ts` › "%tipo %status + %sc: o destino é o de transicaoDoConstruir, diferente do atual, nunca entregue nem encerrada" (54; a recusa só em status final e só com o statusConstrucao de `CONTRADIZ_STATUS_FINAL`) |
| CA-05.10: nunca entregue nem encerrada por este envio | `regras.test.ts` (tabela pura); **novo** `transicoes-construir-qa.test.ts` › "CA-05.10 no banco: 9 origens × 3 statusConstrucao × 2 tipos" (54, no Postgres: status final, `atualizada_em` e a lista exata de eventos) e "as duas únicas mudanças acontecem só nas origens fixas (contagem sobre a tabela inteira)" |
| CA-05.11: `MANUAIS` intacta | `transicoes-construir.test.ts` › "CA-05.11: MANUAIS não muda…" |
| ADR-34 e D-08: uma só fonte das transições | **novo** `regras-qa.test.ts` › os 54 casos acima (`decidirPorStatus` igual a `transicaoDoConstruir` fora dos status finais) e **novo** `transicoes-construir-qa.test.ts` › "CA-05.10 no banco" (o resultado de `mudarStatusPeloConstruir` igual ao de `decidirPorStatus`); `regras-qa.test.ts` › "as tabelas são congeladas por dentro e não aceitam mudança em execução" e "chave herdada do protótipo não vira regra (Object.hasOwn)" |
| AN-04: só o ator integração `construir` muda status por aqui | `transicoes-construir.test.ts` › "%s lança antes de tocar o banco" (4, só em aprovada e só o status); **novo** `transicoes-construir-qa.test.ts` › "%s, em aprovada + em_construcao…" e "%s, em em_construcao + cancelado…" (16: awave, "Construir" e "construir " com nome parecido, sistema, pessoa cto e administradora, agente e tipo de ator desconhecido; status, `atualizada_em` e histórico intactos) e "ator recusado lança mesmo quando não haveria regra" |
| AN-04: a transição usa a linha da trava, sem reler | **novo** › "a transição usa o status recebido da trava, sem reler a demanda…" |
| AN-06: sem transação própria | **novo** `transicoes-construir-qa.test.ts` › "se a transação de quem chama é desfeita depois da mudança, não fica status nem evento" e "a mudança e o evento ficam juntos na mesma transação de quem chama" |
| RF-06, CA-06.1 a CA-06.3 (regra do marco) | `regras.test.ts` › "marco: …"; **novo** `regras-qa.test.ts` › "em todas as combinações de fase × status × números, "mesmo estado" e "marco" nunca valem juntos" (108 × 108 pares; marco ⇔ fase, status ou DEC diferente), "sem andamento gravado, todo envio grava e é marco (CA-06.1)" e "o primeiro envio de um DEC novo…" |
| CA-06.4 e AN-11 (forma): quatro chaves, só enumeração e inteiro; prefixo do token usado | `regras.test.ts` › "marcoDoEvento monta exatamente as quatro chaves"; **novo** `regras-qa.test.ts` › "copia fase, números e statusConstrucao; nunca decId, atualizadoEm nem chave a mais" e "para cada fase e status, só enumeração da lista e inteiro (C-30)"; **novo** `transicoes-construir-qa.test.ts` › o evento com `ator_token_prefixo` `qa000005` e `qa000099` (o do token usado, não um fixo) |
| CA-06.5 (o que cabe à T05): o texto cita o DEC e não ecoa o que não é DEC | `rotulos-qa.test.ts` › os dois `it.each` de `andamento_registrado`; **novo** › "textoDoEvento: andamento_registrado (0.4.0, RF-06)": "cita o DEC do evento" e "entidadeId fora do formato do DEC não aparece no texto". A frase completa (fase, "x de y", ator) é da T11 |
| CA-06.6: no máximo 7 marcos | `regras.test.ts` › "CA-06.6: …no máximo 7 marcos"; **novo** `regras-qa.test.ts` › "CA-06.6: o ciclo de 20 tarefas dá exatamente 7 marcos e 27 gravações; com cada envio repetido, os mesmos números" |
| IN-08 e AN-09: vista do Awave | `regras.test.ts` › "a vista do Awave tem exatamente quatro chaves…"; **novo** `regras-qa.test.ts` › "sem decId, statusConstrucao nem chave a mais, e com os valores da vista" (nos três statusConstrucao, sem DEC, status nem prefixo no JSON) |

### Testes acrescentados

- `src/modules/andamento/regras-qa.test.ts` (novo, 92 testes): unitário, sem banco; datas fixas.
- `src/modules/demandas/transicoes-construir-qa.test.ts` (novo, 76 testes): Postgres real (Testcontainers), relógio
  fixo, demanda gravada pelo migrator; cada teste cria a própria demanda.
- `src/components/rotulos-qa.test.ts`: um `describe` novo no fim, com 2 testes. Nada do que existia mudou.
- `test/estatico/piso-de-assercoes.test.ts`: o `PISO` ganhou `'src/modules/andamento/regras-qa.test.ts': 52` e
  `'src/modules/demandas/transicoes-construir-qa.test.ts': 25`, contados com `git grep -c --untracked "expect("`. O
  segundo traz a prova de autorização do AN-04 para dentro do piso (Minor 2 da `06-T05-revisao`), sem mexer no arquivo
  do engenheiro.

### O que os testes novos pegariam

Sem rodar mutação (o `src/` está fora da minha lista Pode), cada teste novo prende uma troca concreta: destino `entregue`
ou `encerrada` em qualquer regra (54 casos no banco e 54 puros); uma terceira transição ou uma origem trocada (a lista
exata das três mudanças); `transicaoDoConstruir` lendo a chave sem `Object.hasOwn`; tabela descongelada;
`mudarStatusPeloConstruir` com `comTransacao` próprio ou reler a demanda (os testes de AN-06 e da linha da trava); ramo
de ator afrouxado para `integracao` sem conferir o nome; prefixo fixo no evento; `atualizadoEm` entrando no "mesmo
estado"; `lerAndamento` com coerção ou deixando passar a `demandaId`.

### Resultado

- Os três arquivos: **236 de 236** (92 + 76 + 68).
- Os dois arquivos novos em ordem embaralhada (`--sequence.shuffle`): **168 de 168**; não dependem de ordem.
- `pnpm test` completo, 2ª rodada, sem nada em paralelo: **323 arquivos, 7236 testes passaram, 0 falharam** (294 s).
  Eram 321 arquivos e 7063 testes na revisão da T05. A diferença vem dos 168 testes dos dois arquivos novos, dos 2 de
  `rotulos-qa.test.ts`, das 2 entradas do `PISO` e de 1 teste gerado por varredura de arquivos, que agora enxerga os
  arquivos novos. A 1ª rodada teve 1 falha fora da T05 (ver Pendências).
- `pnpm lint` e `pnpm typecheck`: limpos, antes e depois da edição do `PISO`.

### Conferência com `git diff`

- O meu diff em arquivo rastreado tem só acréscimos: o `describe` novo de `rotulos-qa.test.ts` e as três linhas do `PISO`.
  Os outros dois são arquivos novos, ainda não rastreados.
- No commit da T05, nenhum teste foi apagado nem levou `.skip`, `.only` ou `.todo`. A única mudança em teste existente
  é a de `rotulos-qa.test.ts` (27 → 28 no título e no `toHaveLength`, e `andamento_registrado` no `ACOES`), prevista
  na G5, que deixa o teste mais rigoroso.
- Os arquivos novos não têm `.skip`, `.only`, `.todo`, `Date.now`, `performance`, `setTimeout` nem o nome da ação da
  matriz (guarda AN-01 f). Os dados são fictícios (`Demanda ficticia`, `Pessoa Ficticia`, `u-ficticio`, prefixos
  `qa000005` e `qa000099`, sentinelas inventadas); nenhum token real, segredo ou valor de `.env`.

## Decisões tomadas

- **CA-05.10 também no banco:** a tabela pura prova `decidirPorStatus`; a escrita real é de `mudarStatusPeloConstruir`,
  e só o Postgres mostra que nenhuma combinação grava `entregue` ou `encerrada` nem toca `atualizada_em` sem regra.
- **Resultado do banco comparado com `decidirPorStatus`:** prende o D-08 (uma só fonte) nas duas pontas que a T07 vai
  juntar.
- **Teste de transação desfeita:** é o único jeito de provar, de fora, que a função não abre transação própria (AN-06).
- **Arquivos `-qa` separados e entradas no `PISO`:** é o padrão do repositório; o piso passa a cobrir a autorização do
  AN-04 que a revisão apontou fora dele.
- **Asserção de `andamento_registrado` por `toContain` do DEC, não pela frase inteira:** a frase muda na T11; o que não
  muda é citar o DEC e não ecoar valor que não é DEC.
- **Comandos `pnpm` com `--dir <repo>`:** o shell começa na estruturaAutonoma e `cd` não está na lista Pode; é a forma
  das entregas anteriores deste pedido.

## Pendências

- Nenhuma bloqueia a passagem.
- Comportamento registrado, sem defeito: `mudarStatusPeloConstruir` com a demanda em `entregue` ou `encerrada` não
  recusa, só não muda nada (devolve `null`); a recusa 409 é do serviço, antes da transição. A T07 precisa chamar
  `decidirPorStatus` antes; o teste "CA-05.10 no banco" deixa isso escrito.
- Para a T07 e a T08: o CA-05.8 (DEC não vigente), o CA-05.9 ("mesmo estado" antes do 409), o CA-04.1 a CA-04.5 pela
  rota e a gravação do `andamento_registrado` no banco (CA-06.1 a CA-06.4 com o evento real) ficam com elas.
- Para a T11: o teste novo de `rotulos-qa.test.ts` continua valendo com a frase completa (só exige o DEC e nenhum eco).
- **Teste sensível a carga, fora da T05:** `src/app/api/saude/route.test.ts` › "200 { status: ok } com banco migrado, em
  menos de 200 ms…" falhou uma vez (503 em vez de 200) na 1ª rodada da suíte, enquanto eu rodava a rodada embaralhada
  em paralelo. A rota tem tempo limite de 150 ms para o banco e o teste mede tempo real (`performance.now`); com a
  máquina disputada, o banco passa do limite. Sozinho passou (6 de 6) e a 2ª rodada, sem nada em paralelo, passou. A T05
  não toca nessa rota. Fica para a `08-revisao` decidir se o teste ganha folga ou um relógio injetado, porque pode
  travar o CI num runner lento. Não mexi no arquivo, que não é desta tarefa.
- Li a saída do `pnpm test`, que rodou em segundo plano, só pela ferramenta Read.
- Aviso ao `conferir`: um comando foi `grep -n` (sem o `-r`) sobre `01-analista-requisitos.md`, dentro da pasta do
  pedido, só para listar as seções. É leitura dentro do que a lista Pode permite ler, mas a forma literal da lista é
  `grep -rn`. Fica declarado em Comandos executados; se o `conferir` recusar a forma, é bloqueio só de leitura.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — arquivos da pasta do pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat dd173de8d332d26e3ade57a970830aa319a1bbfd` — 8 arquivos de código e teste
- `grep -n "^#" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1/01-analista-requisitos.md` — seções dos requisitos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show dd173de8d332d26e3ade57a970830aa319a1bbfd -- src/modules/andamento/regras.ts src/modules/andamento/schemas.ts src/modules/demandas/transicoes.ts src/modules/historico/registrar.ts src/components/rotulos.ts src/components/rotulos-qa.test.ts` — o código da T05 e a mudança em `rotulos-qa.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show dd173de8d332d26e3ade57a970830aa319a1bbfd -- src/modules/andamento/regras.test.ts src/modules/demandas/transicoes-construir.test.ts` — os testes do engenheiro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A6 -e "export function atorDesconhecido" -e "export async function comTransacao" -e "export function atorDeIntegracao" -e "function doPacote" -- src/modules/acesso/ator.ts src/db/transacao.ts test/integracoes.ts src/components/rotulos.ts` — ajudantes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "atorDeIntegracao" -e "doPacote = " -e "const doPacote" -- test/integracoes.ts src/components/rotulos.ts` — `atorDeIntegracao` e `doPacote`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/estatico/piso-de-assercoes.test.ts` — o `PISO` de hoje
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/estatico/andamento.test.ts` — guarda AN-01 (f)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/estatico/relogio.test.ts` — guarda do relógio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/estatico/sql-raw.test.ts` — guarda do `sql.raw`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/acesso/ator.ts` — tipos de ator
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "prefixo" -e "check" -- src/db/schema/evento.ts src/modules/historico/registrar.ts` — gravação do prefixo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "export" -- test/banco.ts src/lib/relogio.ts` — `novoBanco` e `relogioFixo`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "timestamp(" -- src/db/schema/evento.ts src/db/schema/demandas.ts` — nada
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "ocorrido_em" -- src/db/schema` — coluna `ocorrido_em` do evento
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento/regras-qa.test.ts src/modules/demandas/transicoes-construir-qa.test.ts src/components/rotulos-qa.test.ts --reporter=dot` — 3 arquivos, 236 de 236
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c --untracked "expect(" -- src/modules/andamento/regras-qa.test.ts src/modules/demandas/transicoes-construir-qa.test.ts` — 52 e 25
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot --silent` — 1ª rodada, em segundo plano: 323 arquivos, 7235 de 7236; falhou só `src/app/api/saude/route.test.ts` (503 em vez de 200), com a rodada embaralhada abaixo disputando a máquina (ver Pendências)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento/regras-qa.test.ts src/modules/demandas/transicoes-construir-qa.test.ts --reporter=dot --sequence.shuffle` — 168 de 168 em ordem embaralhada (semente 1794537630562)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 2 arquivos, 30 inserções, 0 remoções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -3` — `0380686` (06-T05-revisao) no topo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -1` — o mesmo topo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat HEAD` — só `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -1 -- src/modules/andamento` — `dd173de`, o commit da T05
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat HEAD` — os mesmos 2 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c --untracked "it(" -- src/modules/andamento/regras-qa.test.ts src/modules/demandas/transicoes-construir-qa.test.ts` — 16 e 7 declarações (com os laços, 92 e 76 testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files src/modules/andamento` — arquivos do módulo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files src/modules/demandas` — arquivos do módulo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files src/modules/historico` — arquivos do módulo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files src/components` — arquivos de componentes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files src/lib` — arquivos de `src/lib`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files src/db/schema` — arquivos do esquema
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files test/estatico` — os estáticos (achei `piso-de-assercoes-qa.test.ts`)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files e2e` — arquivos do e2e
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/estatico/piso-de-assercoes-qa.test.ts` — não lista arquivos novos; sem relação com a falha
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/app/api/saude/route.test.ts` — o teste que falhou mede tempo real (150 e 200 ms)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/saude/route.test.ts --reporter=dot` — sozinho: 6 de 6
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot --silent` — 2ª rodada, sem nada em paralelo: 323 arquivos, 7236 de 7236 (saída lida com a ferramenta Read)
- `grep -rn "RESULTADO_DA_SUITE" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1/06-T05-qa-automacao.md` — nada: a entrega não ficou com marcador do rascunho
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — só o `describe` novo de `rotulos-qa.test.ts` e as linhas novas do `PISO`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n --untracked -e "\.skip" -e "\.only" -e "\.todo" -e "Date.now" -e "performance" -e "setTimeout" -e "registrar_andamento" -- src/modules/andamento/regras-qa.test.ts src/modules/demandas/transicoes-construir-qa.test.ts src/components/rotulos-qa.test.ts` — nada
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — os dois testes modificados e os dois novos
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo, depois do `PISO`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo, depois do `PISO`

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
