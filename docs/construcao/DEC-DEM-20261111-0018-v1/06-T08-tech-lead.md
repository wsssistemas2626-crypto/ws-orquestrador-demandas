---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T08-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md (T08 e Interfaces G7), 06-T08-engenheiro-backend.md, commit 9da1cf8, 01-analista-requisitos.md (CA-04.1 a CA-04.4, Pendência 5), 02-arquiteto-solucoes.md (3.6), 04-seguranca-aplicacao.md (SB-14), passagens.jsonl (P1, decisão do C-27), src/lib/deps-qa.test.ts, test/sessoes-do-banco.ts, test/sessoes-do-banco.test.ts, test/banco.ts, test/setup-global.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

**Parecer: aprovado, com o desvio do plano aceito.** Nenhum problema Critical ou Important. Três Minor, abaixo, que não
bloqueiam a passagem.

### 1. O desvio do plano (leitura pelo superusuário de teste)

**Aceito. O desvio corrige um erro do plano, que é meu.** O passo 3 da T08 mandava ler o `pg_stat_activity` pelo `pool`
do app com `backend_type = 'client backend'`. O papel do app não tem `pg_read_all_stats`, e por isso a sessão de outro
papel vem com `backend_type` nulo. O filtro tiraria da lista justamente a sessão do migrator. Isso escondia as duas
metades do C-27: o `pool` e a fila (pg-boss) conectando como migrator, porque a sessão da fila é outra sessão e também
seria escondida. O CA-04.3 pegou o erro na construção, com o trecho de falha registrado na entrega.

**A troca não esconde o app conectando como migrator (SB-14):**
- `test/sessoes-do-banco.ts:31-33`: o `pool` recebido só dá o nome do banco (`current_database()`). Se o app montasse o
  `pool` sobre a URL do migrator, o banco seria o mesmo e a sessão do migrator entraria na lista.
- `test/sessoes-do-banco.ts:39`: o observador vê `usename` e `backend_type` de todas as sessões. A lista das sessões de
  cliente é a mesma da consulta antiga (`usename` sempre foi visível ao papel do app). Sai só o processo de fundo.
- O `distinct` ficou, não há filtro por `usename` e o `toEqual(['orquestrador_app'])` ficou
  (`src/lib/deps-qa.test.ts:40`).
- O observador entra no banco `postgres` e não se conta: a consulta filtra `datname = $1`. No contêiner, o superusuário
  se chama `migrator`, e a sessão dele **no banco do teste** continua contada. O CA-04.3 prova isso
  (`test/sessoes-do-banco.test.ts:18-29`, verde).
- A espera (`:44-47`) só repete enquanto houver `null`. Esgotadas as 50 tentativas, o `null` fica e o `toEqual` falha
  (falha fechada). A espera não mexe no papel que aparece.

**Nenhuma asserção perdida (CA-04.2):**
- `git grep -c "expect("`: `src/lib/deps-qa.test.ts` tem 8 em `41108ee` e 8 agora; `test/sessoes-do-banco.test.ts` tem 5.
- As três asserções do caso estão em `src/lib/deps-qa.test.ts:40-42`, sem troca de matcher.
- Não há `retry`, `skip`, `fails`, `todo` nem condição no caso, e `vitest.config.ts` não mudou.
- O `PISO` só ganhou duas entradas, e `src/lib/deps.ts` não mudou.

**O superusuário só existe no banco de teste:**
- `inject('pgAdmin')` é fornecido só por `test/setup-global.ts:31`. É o contêiner Testcontainers `postgres:16-alpine`,
  descartável, com credenciais fictícias, o mesmo que `test/banco.ts:9` e `src/app/api/saude/route.test.ts:24` já usam.
- O auxiliar fica em `test/`. `git grep "sessoes-do-banco" -- src scripts` só acha `src/lib/deps-qa.test.ts:8`, e
  nenhum código de produção nem script o importa.
- Ele não lê variável de ambiente nem `DATABASE_URL_MIGRATOR`.

### 2. Registro de correção nos documentos de desenho

O 02 e o 04 precisam do registro. A falta dele não bloqueia a T08, porque o código está certo e o desvio fica
registrado aqui e no plano.

- **Plano: corrigido nesta etapa.** Pus uma nota "Registro de correção" na T08, logo depois do código do passo 3. Ela
  diz que a forma da `9da1cf8` é a que vale e que o filtro de `client backend` só serve quando quem lê vê o
  `backend_type` de todas as sessões.
- **02, 3.6 (`arquiteto-solucoes`): precisa de registro.** O parêntese "não esconde sessão de cliente de outro papel" é
  falso quando a leitura é feita pelo papel do app.
- **04, SB-14 (`seguranca-aplicacao`): precisa de registro.** A correção aceita "restringir a `client backend`" precisa
  da condição "lido por quem vê o `backend_type` de todas as sessões: superusuário do banco de teste ou papel com
  `pg_read_all_stats`". Sem essa condição, o próprio controle autoriza a correção que ele proíbe.
- Os dois arquivos são das etapas donas e eu não os editei. Sugiro ao maestro levar os dois registros na `08-reteste`
  do `seguranca-aplicacao` e na revisão do `arquiteto-solucoes`, ou num pedido de correção de documento (Pendências).

### 3. As 20 execuções e a causa "provável"

**Bastam para o CA-04.1 como ele está escrito e para a decisão da P1 ("20 execuções no paralelismo do CI").** O caso
passou 20 vezes seguidas, todas registradas. Também passou a suíte inteira depois da correção (378 arquivos,
8.155 testes).

O paralelismo padrão da máquina (8 vCPU) dá igual ou mais workers que o runner `ubuntu-latest`. Igualar com
`--maxWorkers` só baixaria a carga, e por isso não peço a liberação.

**As 20 execuções não provam a causa, e o registro tem de dizer isso:**
- Pela hipótese do próprio engenheiro, a corrida pede a suíte inteira, com centenas de bancos para o lançador do
  autovacuum. As 20 rodadas de `src/lib src/db` criam 42 bancos.
- As 11 rodadas de antes da correção também não falharam. As 20 de depois provam que não houve regressão, mas não
  distinguem o antes do depois.
- A confiança vem do mecanismo. O processo de fundo sai da lista de forma determinística, e o CA-04.3 prova que nenhuma
  sessão de cliente de outro papel é escondida.
- Como a causa não foi reproduzida, "provável" é a palavra certa e fica obrigatória no CHANGELOG (`10-documentacao`). O
  texto proposto pelo engenheiro já diz isso e pode ser copiado.
- A confirmação é o CI do PR desta versão, com a suíte inteira. Se o C-27 falhar lá, o diagnóstico novo diz a hipótese, e
  o caso volta como bug, não como `retry` (Pendências).

### 4. Pareceres (Minor, não bloqueiam)

1. **`src/lib/deps-qa.test.ts:39` com `test/sessoes-do-banco.ts:9-11`.**
   - Problema: o diagnóstico é lido pelo `pool` do app, numa segunda consulta, e não pelo observador que montou a lista.
     Na falha, a sessão de outro papel aparece com `-` em `backend_type` e `state`, e pode aparecer o processo de fundo
     que a lista já tirou.
   - Razão: o diagnóstico existe para dizer qual hipótese vale. Lido por outra visão e em outro instante, ele pode não
     bater com a lista julgada.
   - Por que não bloqueia: o `usename` aparece e identifica o papel, e o diagnóstico mostra só os três campos que o
     SB-14 permite. Melhorar em pedido futuro: `papeisDasSessoesDeCliente` devolver também as linhas do observador.
2. **`test/sessoes-do-banco.test.ts:18-29`.**
   - Problema: o CA-04.3 prova uma conexão extra do migrator no mesmo banco. Não exercita a forma literal do SB-14 (a),
     o `pool` montado sobre `b.urlMigrator` passado como argumento.
   - Razão: o mecanismo cobre esse caso, porque o `pool` só dá o nome do banco. Mesmo assim, a prova literal do controle
     não existe.
   - Sugestão para a `06-T08-testes` (`qa-automacao`): um caso com
     `papeisDasSessoesDeCliente(b.poolMigrator)` depois de `b.poolMigrator.query('select 1')`, esperando
     `toContain(new URL(b.urlMigrator).username)`.
3. **`test/sessoes-do-banco.ts:39`.**
   - Problema: `backend_type = 'client backend'` também tira a sessão `walsender`. Uma conexão de replicação
     (`replication=database`) aberta como migrator não seria contada.
   - Razão: é o único tipo de sessão vinda de fora que o filtro aceito no 02 e no 04 exclui.
   - Por que não bloqueia: nem o `pg` nem o pg-boss do app abrem conexão de replicação. Fica registrado para o
     `seguranca-aplicacao` no registro do SB-14.

### 5. Checklist da seção 12

| Item | Situação |
|---|---|
| Faz o que o plano pede, nem mais nem menos; só arquivos da tarefa | Cumprido. Os 4 arquivos estão na lista da T08 (`test/banco.ts`, `deps.ts` e `vitest.config.ts` não mudaram). O desvio no passo 3 é necessário e foi aceito (seção 1) |
| Teste para cada comportamento novo, que falharia sem o código | Cumprido. Falha vista antes (`not a function`) e falha do CA-04.3 com a versão do plano. Rodei: 3 arquivos, 102 de 102 |
| Sem segredo, `.env` ou dado pessoal real | Cumprido. As credenciais são as fictícias do contêiner descartável, e o diagnóstico mostra só `backend_type`, `usename` e `state`, com teste que proíbe URL e senha |
| Entrada externa com Zod; erro sem detalhe | Não se aplica: não há rota, Server Action nem job |
| Banco: migration, papel migrator, RLS | Não se aplica: não há migration. O app continua só com `DATABASE_URL` |
| Nada duplica função existente | Cumprido. O observador repete o padrão de `test/banco.ts` (`inject('pgAdmin')` com `pg.Pool`), sem duplicar função |
| Textos de interface em pt-BR; axe | Não se aplica: sem tela |
| Minor em Pendências; só Critical/Important bloqueiam | Cumprido. São 3 Minor |
| PR: `/code-review` e `/security-review` | Fica com o maestro, na `08-revisao` |

Lint e typecheck limpos, rodados nesta etapa.

## Decisões tomadas

- Aceitei o desvio. A versão do plano escondia o migrator, e a construída tem a mesma força da consulta antiga para
  sessões de cliente, sem os processos de fundo.
- Corrigi o plano com uma nota na T08, sem reescrever o código do passo 3. O plano é meu entregável, e a nota preserva o
  histórico do erro.
- Não editei o 02 nem o 04. São das etapas donas, e o registro vai para elas pelas Pendências.
- As 20 execuções bastam para o CA-04.1. Não pedi `--maxWorkers`, porque igualar os workers do runner baixaria a carga
  em vez de subir.
- Mantive "causa provável". A falha nunca se reproduziu localmente, e o CI do PR é a confirmação.
- Marquei os três pareceres como Minor. Nenhum deixa o C-27 passar com o app conectado como migrator.

## Pendências

- `arquiteto-solucoes`: registro de correção no 02, seção 3.6. O filtro `client backend` só não esconde sessão de outro
  papel quando quem lê vê o `backend_type` de todas as sessões.
- `seguranca-aplicacao`: registro de correção no SB-14 do 04, com a mesma condição na correção aceita e a nota do
  `walsender` (Minor 3). Sugestão: tratar na `08-reteste`.
- `qa-automacao` (`06-T08-testes`): o caso do Minor 2, com o `pool` do migrator passado como argumento.
- `10-documentacao`: CHANGELOG 0.4.1 com "causa provável", copiando o texto da entrega do engenheiro.
- `devops-sre` e o maestro: o CI do PR desta versão é a confirmação do C-27. Se o caso falhar lá, ler o diagnóstico e
  reabrir como bug, sem `retry`.
- Minor 1, diagnóstico lido pelo observador: pedido futuro.
- O ambiente gravou a saída do `git show 9da1cf8` fora do repositório, por ser grande, e eu a li com Read. Nenhum outro
  arquivo fora do repositório e da estruturaAutonoma foi lido.
- O `git grep` na estruturaAutonoma (seção 12 do padrão técnico) não está na forma da regra de comando desta etapa. Ele
  só lê um arquivo rastreado.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 9da1cf878152439092a95e1a190645f8cd9022d8` — commit da construção
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T08" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md` — localizar a T08
- `git -C /home/deploy/servidor/projetos/estruturaAutonoma grep -n "## 12" -- docs/construcao/padrao-tecnico.md` — localizar a seção 12
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "pgAdmin" -- .` — só `test/setup-global.ts` fornece; usam `test/banco.ts`, `route.test.ts`, `migration-0007-dados.test.ts`, `test/sessoes-do-banco.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "3.6" -- docs/construcao/DEC-DEM-20261111-0018-v1/02-arquiteto-solucoes.md` — localizar a 3.6
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "SB-14" -- docs/construcao/DEC-DEM-20261111-0018-v1/04-seguranca-aplicacao.md` — localizar o SB-14
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "CA-04" -- docs/construcao/DEC-DEM-20261111-0018-v1/01-analista-requisitos.md` — critérios do RF-04
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "aralelismo" -- docs/construcao/DEC-DEM-20261111-0018-v1` — decisão da P1 sobre as 20 execuções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "runs-on" -- .github/workflows/ci.yml` — runner `ubuntu-latest`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — árvore limpa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -5` — ponta em 5703a62
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 9da1cf8 5703a62 --stat` — só `passagens.jsonl`; código igual ao revisado
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/sessoes-do-banco.test.ts src/lib/deps-qa.test.ts test/estatico/piso-de-assercoes.test.ts --reporter=dot` — 3 arquivos, 102 de 102
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" -- src/lib/deps-qa.test.ts test/sessoes-do-banco.test.ts` — 8 e 5
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" 41108ee -- src/lib/deps-qa.test.ts` — 8
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "sessoes-do-banco" -- src scripts` — só `src/lib/deps-qa.test.ts:8`

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
