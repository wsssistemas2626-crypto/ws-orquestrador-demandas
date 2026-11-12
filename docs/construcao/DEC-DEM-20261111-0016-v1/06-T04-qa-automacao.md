---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T04-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 01-analista-requisitos.md (glossário, RF-08, CA-08.1 a CA-08.4), 04-seguranca-aplicacao.md (C07, C08, IN-09, IN-14), docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G8, T03 e T04), 05-tech-lead.md, 06-T03-qa-automacao.md (formato), 06-T04-engenheiro-backend.md, 06-T04-tech-lead.md, commit 05fcb85 (git diff 05fcb85~1 05fcb85), src/modules/limites.ts (no diff), src/modules/integracoes/tempo-limite.ts (no diff), src/modules/limites-integracao.test.ts (no diff), src/modules/integracoes/tempo-limite.test.ts (no diff), src/modules/limites.test.ts, src/lib/reduzir-erro.ts, src/lib/erros.ts, src/db/index.ts, src/db/transacao.ts, src/db/schema/demandas.ts, test/banco.ts, test/integracoes.ts (no diff), test/estatico/relogio.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T04: limite por integração e tempo limite das transações de integração (IN-09, IN-14, ADR-24, ADR-28, D-03).
O código está no commit 05fcb85, e li o diff inteiro. O código passa nos testes do engenheiro (31) e nos 14 que
acrescentei aqui. Não há motivo para devolver.

### Critérios da tarefa e os testes que os cobrem

A T04 cobre: RF-08 (a regra), IN-09, IN-14 (o tempo limite), ADR-24, ADR-28 e D-03. Os critérios do RF-08 são
CA-08.1 a CA-08.4. A parte de rota ("nenhum id consumido", o 429 pela `rota()`) só existe quando a T06 ligar o POST do
Awave.

| Critério | Teste (arquivo › nome) |
|---|---|
| CA-08.1 (11ª do awave → 429 com a mensagem do 10) | `src/modules/limites-integracao.test.ts` › "a 11ª do awave na janela é 429 com a mensagem do Awave; fora da janela não conta" (engenheiro); **novo** `src/modules/limites-integracao-qa.test.ts` › "com 10 na janela, a recusa é ErroDominio limite_excedido; a resposta é 429 com a mensagem do 10, sem extras" (status e corpo pela `mapearErro`, a mensagem cita o 10 e difere da do 30, `message` só com o código) e "a demanda do awave conta pela criação, qualquer que seja o status de hoje" |
| CA-08.2 (a primeira sai da janela → passa) | engenheiro: o mesmo teste acima (janela vazia às 12:30) e "o prefixo do token não muda a conta…"; **novo** `limites-integracao-qa.test.ts` › "a primeira das 10 sai da janela exatamente uma hora depois: um instante antes ainda é 429, na hora certa passa" (fronteira em 12:04:59.999 e 12:05:00, e volta ao 429 com uma décima nova) |
| CA-08.3 (pessoa e agente seguem com 30) | engenheiro: "pessoa e agente seguem com 30 e 60", "o limite dos outros não muda, e o que eles criam não entra na conta do awave"; `src/modules/limites.test.ts` (C-36), sem mudança e verde; **novo** `limites-integracao-qa.test.ts` › "com o awave no limite, pessoa passa até a 30ª e a 31ª é 429 com a mensagem do 30, não a do Awave", "com o agente orquestrador no limite de 30, ele recebe a mensagem do 30, e o awave com 9 ainda passa", "a trava do awave não segura pessoa com id de conta \"awave\" nem o agente orquestrador" |
| CA-08.4 (11 simultâneas → exatamente 10 passam e 1 recebe 429) | **novo** `limites-integracao-qa.test.ts` › "exatamente 10 passam e gravam; 1 recebe limite_excedido com a mensagem do Awave" (11 transações em paralelo; cada uma confere e grava a demanda antes do COMMIT, como a T06 fará; no banco ficam 10 demandas do awave no dia). Faltava nos testes do engenheiro, e o 04 (seção 5, item 5) o exige |
| IN-09 (`switch` exaustivo; integração sem limite lança; só o sistema sai sem contar; chave `limite:demanda:integracao:awave`) | engenheiro: "integração sem limite definido lança…", "a recusa por falta de limite não é ErroDominio…", "integração fora da lista ou chave herdada de objeto também lança…", "tipo de ator desconhecido, montado à mão, lança…", "o limite devolvido para a integração é congelado", "a trava do awave é a de hoje, por tipo e autoria…", "o sistema não tem limite…"; **novo** `limites-integracao-qa.test.ts` › "construir em conferirLimite de demanda e awave em artefato viram 500 genérico na resposta, nunca 429 nem passagem" (corpo do 500 pela `mapearErro`) |
| IN-14 / ADR-28 (SET LOCAL só para integração, literal; 57014 e 55P03 → 503 fixo; nada gravado) | engenheiro: todo `src/modules/integracoes/tempo-limite.test.ts` (19 testes: orçamentos, pessoa, agente e sistema sem mudança, SET LOCAL que termina com a transação, trava real, `pg_sleep` real, tradução, estático); **novo** `src/modules/integracoes/tempo-limite-qa.test.ts` › "trava do limite segura por outra conexão: conferirLimite desiste pelo lock_timeout, 503 fixo, e o evento gravado antes some", "depois do 503 da integração, a mesma conexão volta com lock_timeout 0 e statement_timeout 10s para a pessoa", "com `t` de quem chama, o 55P03 do corpo passa cru; quem abriu a transação é quem traduz" |
| IN-14 (o limite dentro do orçamento continua 429) | **novo** `tempo-limite-qa.test.ts` › "a 11ª do awave dentro do orçamento continua 429 (não vira 503) e desfaz o que o corpo gravou antes", "dentro do orçamento e com a janela livre, o awave confere, grava e devolve o valor" |
| D-03 (texto do 503) | engenheiro: "D-03: a mensagem do 503 é fixa" (texto inteiro); **novo** `tempo-limite-qa.test.ts` › "a mensagem do 503 não leva texto do Postgres, do Drizzle nem dado do pedido" |
| ADR-24 (10 por hora; mudar é decisão de Fabiano) | engenheiro: "awave: 10 demandas na janela; a mensagem cita o 10 e o Awave" e "o limite devolvido para a integração é congelado" |

### Testes acrescentados (14, em 2 arquivos novos)

1. `src/modules/limites-integracao-qa.test.ts` (8 testes, Postgres real, relógio fixo). Cobre o 429 completo, a
   contagem que não depende do status, a fronteira exata da janela, o C-36 de pessoa e de agente ao lado do awave no
   limite, as chaves de trava separadas (com `lock_timeout` de 200 ms, para não esperar se a chave fosse a mesma), a
   concorrência do CA-08.4 e a falha fechada que vira 500.
2. `src/modules/integracoes/tempo-limite-qa.test.ts` (6 testes, Postgres real, relógio fixo). Junta o orçamento e o
   limite do jeito que a T06 vai chamar: o 503 com a trava real do limite, o 429 que não vira 503, o caminho feliz, o
   SET LOCAL que não vaza para a próxima transação depois de uma falha (pool de uma conexão), a tradução feita uma vez
   só por quem abriu a transação e a mensagem do 503.

Os testes novos não dependem de ordem. Cada teste que conta o awave usa um dia próprio e ids próprios. As travas
seguradas são soltas no `finally`. O pool de uma conexão é fechado no `finally`. Também não dependem do relógio real:
as datas vêm de `relogioFixo` e de `new Date(<iso>)`, sem `Date.now()` nem `new Date()` sem argumento. Nenhuma
asserção mede tempo. O "em ~2 s" do item 2 do plano fica provado pelo `lock_timeout` lido no banco e pelo 55P03, e não
por cronômetro. Os dados são fictícios ("(fictício)", "Pessoa Ficticia", conta `u-qa-t04`, prefixo `ficticio`). Nenhum
token é gerado nem escrito, e não há segredo nem valor de `.env`.

### Resultado

- `pnpm test`: **254 arquivos, 5545 de 5545** testes passaram, código 0. Antes eram 252 arquivos e 5531 testes: mais 2
  arquivos e 14 testes.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git diff --stat`: vazio, porque nenhum arquivo rastreado mudou nesta etapa. `git status --short` mostra só os dois
  arquivos novos. Nenhum `.skip`, `.only` ou `.todo`.
- Testes existentes no commit 05fcb85: os dois arquivos de teste são novos. `test/integracoes.ts` só ganhou
  `inserirDemandaDeIntegracao`. `src/modules/limites.test.ts` (C-36) não mudou. Nenhuma asserção saiu nem ficou mais
  fraca.

## Decisões tomadas

- O CA-08.4 foi testado com `comTransacao` e não com `executarComOrcamento`. Com o `lock_timeout` de 2 s, uma suíte
  carregada poderia fazer a 11ª esperar mais que isso e dar 503 em vez de 429. Seria teste instável. A combinação do
  orçamento com o limite tem testes próprios, um por resultado (503, 429 e sucesso).
- Os arquivos novos têm o sufixo `-qa.test.ts`, como na 06-T03. Os testes do engenheiro ficaram como estavam, porque
  mudá-los seria mudança fora do G5.
- Tirei dois rascunhos que não provavam nada. O primeiro era a trava do `construir` conferida depois da transação: a
  trava de transação some no ROLLBACK de qualquer jeito. O segundo era uma demanda "no futuro" com 9 na conta: o
  teste passaria com ou sem a regra. Asserção que não falha sem o código só dá falsa segurança.
- A parte de rota do CA-08.1 ("nenhum id consumido", recusa antes do `nextval`) não foi testada aqui. A T04 não tem
  rota nem gera id, e o D-01 deixa o POST do Awave em 403 até a T06.
- Glob e Grep não estavam disponíveis nesta sessão. Li com Read os arquivos citados na entrega, na revisão e no plano, e
  não rodei busca pelo Bash.

## Pendências

- Nenhuma bloqueia a passagem.
- Para a T06 (e para a 06-T06-testes): falta testar pela rota o CA-08.1 sem id consumido (comparar o `demanda_seq`
  antes e depois do 429) e o CA-08.4 pelo `POST /api/demandas` com o token `awave`. O teste de concorrência deste
  arquivo é o modelo.
- Registro (Minor, sem efeito): a contagem do limite não tem limite superior (`gt` de `desde` sem `lte` de agora). Uma
  demanda com `criada_em` depois do instante do relógio também conta. Na prática, nenhuma demanda nasce no futuro do
  relógio do próprio servidor. É o mesmo comportamento do C-36 de hoje.
- Os dois Minor da revisão (`limites.ts:53` inalcançável e `limites.ts:46` sem congelar) continuam como o tech-lead
  registrou. Nenhum teste depende deles.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 05fcb85e7fe5b3eeeb376ac825fd8e0a12d9eb4b~1 05fcb85e7fe5b3eeeb376ac825fd8e0a12d9eb4b` — 7 arquivos: os 5 da T04, a entrega e `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 05fcb85e7fe5b3eeeb376ac825fd8e0a12d9eb4b~1 05fcb85e7fe5b3eeeb376ac825fd8e0a12d9eb4b -- src test` — diff do código e dos testes, lido por inteiro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — HEAD em 78a0f4a (06-T04-revisao), sobre 05fcb85
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo antes da etapa
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/limites-integracao-qa.test.ts src/modules/integracoes/tempo-limite-qa.test.ts` — 2 arquivos, 14 de 14
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 254 arquivos, 5545 de 5545, código 0 (saída lida com Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só os 2 arquivos novos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — vazio

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
