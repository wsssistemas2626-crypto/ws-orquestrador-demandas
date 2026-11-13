---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T01-testes
agente: qa-automacao
leu: [pedido.json, contrato-passagem.md, tarefas.json, 01-analista-requisitos.md (RF-04, RNF-05, matriz), 04-seguranca-aplicacao.md (AN-10, por busca), 05-tech-lead.md (fases), 06-T01-engenheiro-dados-bd.md, 06-T01-tech-lead.md, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (G10 e T01), commit 608429556de6c416e2b6c7f7095596beb2f2baff (git show, sem os snapshots), src/db/privilegios.test.ts, test/banco.ts, test/estatico/piso-de-assercoes.test.ts, package.json]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T01 (tabela `andamento_construcao`, migrations `0008` e `0009`, privilégio só de inclusão, AN-10), sobre o
commit `608429556de6c416e2b6c7f7095596beb2f2baff`. O código cumpre os critérios da tarefa. Não há devolução. Acrescentei
um arquivo com 57 testes que exercem o que antes só tinha o texto conferido, mais as bordas que a suíte do engenheiro não
cobria.

### Critérios da tarefa e o teste que cobre cada um

A T01 cobre RF-04 (a forma no banco), RNF-05, AN-10, ADR-30 e a parte do CHECK do CA-04.6 (plano, T01; G10).

| Critério | Teste (arquivo › nome) |
|---|---|
| AN-10: CHECK da fase nas seis | `src/db/schema/andamento.test.ts` › "CHECK recusa %o" (fase `Construindo` e vazia) e "fonte única: os CHECKs de fase e de status listam exatamente FASES_ANDAMENTO e STATUS_CONSTRUCAO"; **novo** `src/db/schema/andamento-qa.test.ts` › "a fase %s é aceita" (as seis) e "CHECK recusa %j" (`construindo ` com espaço, `CONSTRUINDO`, `entregue`) |
| AN-10: CHECK do `status_construcao` nos três | `andamento.test.ts` › "CHECK recusa %o" (`entregue`) e "fonte única..."; **novo** `andamento-qa.test.ts` › "o status %s é aceito" (os três) e "CHECK recusa %j" (`EM_CONSTRUCAO`, `em_construcao` com quebra de linha, `encerrada`) |
| AN-10: `0 <= tarefas_prontas <= tarefas_total <= 999` | `andamento.test.ts` › "o papel do app inclui a linha válida, e as bordas 0/0 e 999/999" e "CHECK recusa %o" (10/9, -1, 0/1000); **novo** `andamento-qa.test.ts` › "CHECK recusa %j" (0/-1, -1/-1, 1000/999, 1000/1000) e "número não inteiro de tarefas é recusado pelo tipo (22P02), sem gravar" |
| AN-10: `dec_id` em `^DEC-DEM-[0-9]{8}-[0-9]{4}-v[0-9]{1,4}$` (INSERT com o CHECK violado é recusado) | `andamento.test.ts` › "o CHECK do dec_id recusa id fora do formato..." (só o texto); **novo** `andamento-qa.test.ts` › "dec_id %s é recusado com 23514 (%j)" (14 casos: curto, vazio, caixa baixa, `V` maiúsculo, versão com 5 dígitos e sem dígito, data com 7, sequência com 5, espaço antes e depois, quebra de linha no fim e no meio, dígito de largura total, `ESP` no lugar de `DEC`) e "dec_id no formato e sem pacote de decisão passa pelo CHECK e para na FK (23503)" |
| AN-10: `ator_token_prefixo` em `^[A-Za-z0-9_-]{8}$`, `not null` | `andamento.test.ts` › "CHECK recusa %o" (`curto`, `abc!defg`); **novo** `andamento-qa.test.ts` › "CHECK recusa %j" (9 e 7 caracteres, vazio, quebra de linha no fim, espaço, acento, ponto), "o prefixo aceita os oito caracteres da lista, com _ e -" e "%s nulo é recusado com 23502 na coluna %s" |
| AN-10: NOT NULL das colunas (o CHECK sozinho deixa o nulo passar) | **novo** `andamento-qa.test.ts` › "%s nulo é recusado com 23502 na coluna %s" (as oito colunas) e "gravado_em não tem padrão no banco: o INSERT sem ele é recusado (o momento vem do Relogio, G3.4)" |
| AN-10: FK para `demanda(id)` e `pacote_decisao(id)` sem `ON DELETE CASCADE` | `andamento.test.ts` › "FKs para demanda e pacote_decisao, sem ON DELETE CASCADE (23503 com id que não existe)"; **novo** `andamento-qa.test.ts` › "apagar a demanda que tem andamento é recusado (23503) e a linha fica" e "apagar o pacote de decisão que tem andamento é recusado (23503) e a linha fica" |
| AN-10 e C-34: só `SELECT, INSERT` para o app; UPDATE, DELETE e TRUNCATE recusados | `andamento.test.ts` › ""%s" recusado (42501) com linhas gravadas, e nada muda" (cinco comandos); `src/db/imutabilidade.test.ts` › "%s é recusado com o papel do app" (três casos novos); `src/db/privilegios.test.ts` › "privilégios de tabela são exatamente os da regra...", "nenhum privilégio por coluna além da regra..." e "TRUNCATE é recusado ao app em toda tabela da regra..."; **novo** `andamento-qa.test.ts` › "o app lê o que incluiu (SELECT dado de fato, não só listado)" |
| AN-10: nenhum GRANT de sequência | `andamento.test.ts` › "o app não usa a sequência da identidade (nextval recusado)..."; `privilegios.test.ts` › "toda sequência de public fora de SEQUENCIAS fica sem privilégio do app..." |
| AN-10 e ADR-30: o último andamento é a linha de maior `id` | **novo** `andamento-qa.test.ts` › "o app não escolhe o id (GENERATED ALWAYS, 428C9)..." e "com o mesmo gravado_em, a linha incluída depois tem id maior" |
| AN-10 e RNF-05: nenhuma coluna nova em `demanda` nem em `evento` | `andamento.test.ts` › "nada novo em demanda nem em evento: as colunas são as de 0ac099a" (19 e 11) |
| RNF-05: duas migrations só aditivas, nenhuma da `main` editada, a custom só com o GRANT | `test/estatico/migration-0008.test.ts` › os três testes; `test/estatico/migration-0007.test.ts` › "a 0007 está no índice 7 do diário" e "a 0007 não apaga, renomeia, reescreve nem troca tipo de nada" |
| ADR-30: índices `(demanda_id, id)`, `(dec_id, gravado_em)` e `(gravado_em)` | `andamento.test.ts` › "índices (demanda_id, id), (dec_id, gravado_em) e (gravado_em)" |
| CA-04.6 (parte do CHECK): linha fora do formato não entra pelo app | as recusas acima (23514, 23502, 22P02). A leitura tolerante do CA-04.6 é da T05, T09, T12 e T13 |

### Testes acrescentados

- `src/db/schema/andamento-qa.test.ts` (novo, 57 testes, Postgres real pelo Testcontainers). Cada teste grava a própria
  linha e confere só o que gravou. Não depende de ordem, `gravado_em` é fixo e nada usa o relógio real. Os dados são
  fictícios: `DEM-20261113-0801` e `-0802`, "Pessoa Ficticia" e o prefixo `ficticio`.
- `test/estatico/piso-de-assercoes.test.ts`: a linha `'src/db/schema/andamento-qa.test.ts': 16` entrou no `PISO`. São 16
  linhas com `expect(`. O piso só sobe.

Os testes do `dec_id` falhariam sem o CHECK. O valor fora do formato passaria pelo CHECK e pararia na FK com 23503, e o
teste espera 23514 com o nome do CHECK. Isso fecha o parecer Minor 1 da `06-T01-tech-lead.md`.

### Resultado

- `pnpm test src/db/schema/andamento-qa.test.ts`: 57 de 57.
- `pnpm test` completo: **309 arquivos, 6586 testes passaram, 0 falharam** (228,85 s).
- `pnpm lint`: limpo. `pnpm typecheck`: limpo. Rodei os dois de novo depois da edição do `PISO`.

### Conferência com `git diff`

- Meu diff tem só a linha nova do `PISO` e o comentário dela. O resto é o arquivo novo.
- No commit da T01, nenhum teste foi apagado nem levou `.skip`, `.only` ou `.todo`. O `imutabilidade.test.ts` só ganhou
  casos. O `migration-0007.test.ts` trocou "a 0007 é a última" por "a 0007 está no índice 7", como a G5 do plano manda.
  A exigência de que o diário só traga migrations conhecidas continua em `migration-0008.test.ts`, agora com a lista de 0
  a 9. As listas de proibidos e de esperados da 0007 não mudaram.

## Decisões tomadas

- **Arquivo `-qa` separado:** segue o padrão do repositório (`matriz-qa.test.ts`, `tokens-servico-qa.test.ts`) e deixa
  intacto o arquivo do engenheiro e o piso dele.
- **Exercer a recusa do `dec_id` em vez de só ler a definição:** o AN-10 pede "INSERT com cada CHECK violado é
  recusado". Ler o texto não prova que o CHECK é aplicado.
- **Testar o NOT NULL de cada coluna:** um CHECK com valor nulo dá "desconhecido" e não recusa. Quem segura o nulo é o
  NOT NULL, e nenhum teste conferia isso.
- **FK sem cascata pela recusa do DELETE (migrator):** confirma pelo comportamento o que o `confdeltype = 'a'` confere
  no catálogo. A demanda `-0802` não tem outro filho, então a recusa só pode vir da FK do andamento.
- **Identidade `GENERATED ALWAYS`:** o "último andamento" é a linha de maior `id`. Por isso o teste confere que o app
  não escolhe o id e que o id cresce com o mesmo `gravado_em`.
- **Comandos `pnpm` com `--dir <repo>`:** o shell do agente começa na estruturaAutonoma e `cd` não está na lista Pode.
  Repeti a forma das entregas 06-T01 do engenheiro e do tech-lead.

## Pendências

- Nenhuma bloqueia a passagem.
- Para o maestro: não rodei nenhum comando fora da lista Pode. O `grep -rn` só leu a pasta do pedido e o meu arquivo de
  teste.
- O `pnpm test` agora traz 6586 testes, e a entrega do engenheiro tinha 6526. Os meus 57 e a linha nova do `PISO` somam
  58. A diferença de 2 vem de testes gerados por varredura de arquivos, que passam a enxergar o arquivo novo. Todos
  passaram.
- Fica para a `06-T05`/`06-T09`/`06-T12`/`06-T13`: a parte de leitura do CA-04.6 (linha fora do esquema tratada como
  "sem andamento", sem 500) não é desta tarefa.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — arquivos da pasta do pedido
- `grep -rn "AN-10" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — onde o AN-10 é definido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "^## " -e "^### " -- docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md` — seções do plano
- `grep -rn -e "^## " -e "^### " -e "^| CA" -e "^| RF" -e "^| RNF" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1/01-analista-requisitos.md` — seções e requisitos
- `grep -rn -e "RF-04" -e "CA-04" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1/01-analista-requisitos.md` — RF-04 e CA-04.x
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 608429556de6c416e2b6c7f7095596beb2f2baff` — 15 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 608429556de6c416e2b6c7f7095596beb2f2baff -- src test drizzle/0008_slippery_whirlwind.sql drizzle/0009_rls_andamento_construcao.sql drizzle/meta/_journal.json` — código e testes da T01
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:package.json` — scripts
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/db/privilegios.test.ts` — o que a guarda de privilégios já cobre
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/estatico/piso-de-assercoes.test.ts` — regra do piso
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/banco.ts` — banco novo por arquivo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -i -e "create trigger" -e "create or replace function" -- drizzle` — nenhum gatilho (o DELETE pelo migrator só esbarra na FK)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "it(" -e "it.each" -e "glob" -e "ls-files" -- test/estatico/varreduras-qa.test.ts test/estatico/relogio.test.ts` — varreduras que alcançam o arquivo novo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/db/schema/andamento-qa.test.ts --reporter=dot` — 57 de 57
- `grep -rn "expect(" /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/db/schema/andamento-qa.test.ts` — 16 linhas
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 309 arquivos, 6586 de 6586
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — só a linha nova do `PISO`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — o `PISO` modificado e o arquivo de teste novo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo, depois do `PISO`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo, depois do `PISO`

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
