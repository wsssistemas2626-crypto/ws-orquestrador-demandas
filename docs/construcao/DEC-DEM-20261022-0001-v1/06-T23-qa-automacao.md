---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T23-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 06-T23-engenheiro-backend.md, 06-T23-tech-lead.md, 06-T22-qa-automacao.md, 01-analista-requisitos.md (RF-17 a RF-19 e RNF), 04-seguranca-aplicacao.md (C-26 a C-40), 2026-10-25-ws-orquestrador-demandas-plano.md (cabeçalho, G1 a G5 e T23), git show --stat 7b68d76..63faf6c, src/modules/agentes/preco.ts, src/modules/agentes/teto.ts, src/modules/agentes/configuracao.ts, src/modules/agentes/uso.ts, src/app/api/agentes/route.ts, src/app/api/agentes/[agente]/route.ts, src/app/api/configuracao/teto/route.ts, src/modules/agentes/preco.test.ts, src/modules/agentes/teto.test.ts, src/modules/agentes/configuracao.test.ts, src/app/api/agentes/agentes.test.ts, src/db/schema/agentes.test.ts, src/db/transacao.ts, src/lib/rota.ts, src/lib/relogio.ts, src/lib/fuso.ts, src/lib/rota-qa.test.ts, src/app/api/pacotes-decisao/pedido-bordas.test.ts, test/banco.ts, test/deps.ts, test/requisicao.ts, test/sessao.ts, test/estatico/sql-raw.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verificação da T23 (interruptores, teto, preço por modelo e registro de uso). O código e os testes estão no `9818216`.
O `9d9ca9a` e o `63faf6c` só mexem no registro e na entrega. Depois do `63faf6c` entraram só `06-T23-tech-lead.md` e
`passagens.jsonl`, conferido com `git diff --stat 63faf6c HEAD`.

O código cumpre todos os critérios da tarefa. Os 95 testes do engenheiro estão certos e não são instáveis: o relógio é
fixo, cada cenário do teto usa um mês próprio, o `beforeEach` volta o estado inicial e cada arquivo tem o seu banco.
Acrescentei 44 testes em 4 arquivos novos. Nenhum arquivo existente foi alterado. Os 44 passaram na primeira execução,
e não encontrei defeito no código da T23.

### Critérios da tarefa → testes

Arquivos: `preco.test.ts`, `teto.test.ts`, `configuracao.test.ts`, `teto-bordas.test.ts` e
`configuracao-bordas.test.ts` ficam em `src/modules/agentes/`. `agentes.test.ts` e `agentes-bordas.test.ts` ficam em
`src/app/api/agentes/`.

| Critério | Teste que cobre (arquivo › nome) |
|---|---|
| CA-17.1 custo pela tabela de preço | `preco.test.ts` › "CA-17.1: 1.000 tokens de entrada a 3/M e 200 de saída a 15/M custam 0,006"; "arredonda em 6 casas"; "preço com 6 casas não acumula erro de ponto flutuante"; "o preço lido do numeric vira número, e alimenta o cálculo do custo"; `agentes-bordas.test.ts` › "CA-17.1 de ponta a ponta: 1.000 e 200 tokens custam 0,006, e o GET do teto soma; …" (preço vigente → `calcularCusto` → `registrarUso` → linha com tokens e custo `0.006000`) |
| CA-17.2 (parte da T23) uso com `fora_do_schema` e `erro` | `agentes.test.ts` › "CA-17.2: as chamadas fora do schema e com erro (sem token) também entram, na transação de quem chama"; `agentes-bordas.test.ts` › "o rollback da transação de quem chama desfaz o uso gravado nela" |
| CA-17.3 sem conteúdo no uso | `agentes.test.ts` › "CA-17.3: registrarUso não aceita nem grava conteúdo (o tipo não tem campo de texto)" (tipo com as 8 chaves por `expectTypeOf`, linha do banco comparada inteira); `src/db/schema/agentes.test.ts` › "uso_ia tem exatamente as colunas e os tipos esperados …" (T06) |
| RF-17 preço vigente por data | `preco.test.ts` › "precoVigente pega a vigência mais nova até a data"; "a vigência vale a partir do instante exato em que começa"; "antes da primeira vigência, ou para modelo sem preço, não há preço (null)"; "o modelo é comparado por inteiro, sem curinga nem diferença de caixa"; `agentes-bordas.test.ts` › "a mudança de preço vale para a chamada feita depois da vigência nova, e o mês novo começa do zero" |
| CA-18.2 gasto zero no 1º dia do mês seguinte | `teto.test.ts` › "CA-18.2: no primeiro dia do mês seguinte, o gasto do mês é zero"; "o mês começa à meia-noite de São Paulo, e não à meia-noite UTC"; `teto-bordas.test.ts` › "a chamada à meia-noite em ponto do dia 1º conta no mês novo e não no anterior"; "chamada gravada com data no mês seguinte não entra no gasto do mês corrente" |
| RF-18 suspensão e fim da suspensão (gasto ≥ teto; teto sobe ou mês vira) | `teto.test.ts` › "suspenso quando gasto ≥ teto; teto 0 é sempre suspenso"; "teto 0 volta a suspender os agentes"; `teto-bordas.test.ts` › "teto atingido suspende; subir o teto acima do gasto tira a suspensão na hora"; "com o mesmo teto, a suspensão acaba quando o mês vira"; "a situação devolvida pela alteração já soma o gasto do mês" |
| CA-18.4 token de agente não altera o teto | `agentes.test.ts` › "CA-18.4: token de agente em PUT /api/configuracao/teto → 403"; "C-10: nenhum agente lê a configuração nem liga a si mesmo (o risco inclusive)"; `test/matriz-rotas.test.ts` (as três rotas novas entram sozinhas) |
| RF-18 formato do teto (03, T12) | `teto.test.ts` › "teto negativo → 400 …; aceita vírgula ou ponto"; "aceita %j (vírgula ou ponto)" (8); "recusa %j com a mensagem de formato da 03" (13); `agentes.test.ts` › "PUT: teto negativo ou fora do formato → 400 com a mensagem da 03, …"; `teto-bordas.test.ts` › "o maior teto do formato grava sem perder centavo"; "zeros à esquerda e uma casa só gravam o mesmo número" |
| RNF-07 percentual e tolerância de uma chamada | `teto.test.ts` › "percentual inteiro, sem arredondar para cima, e acima de 100 …"; `teto-bordas.test.ts` › "teto %s" (10 tetos sem representação binária exata: gasto = teto dá 100 e suspenso; um milionésimo abaixo dá 99 e não suspenso); `agentes-bordas.test.ts` › "CA-17.1 de ponta a ponta: …" (a chamada que passa do teto passa no máximo o custo dela) |
| P1-f USD | `teto.test.ts` › "sistema novo: teto 0 em USD, suspenso, …"; `agentes.test.ts` › "GET: sistema novo com teto 0, suspenso, em USD, …"; `agentes-bordas.test.ts` › "C-11: autoria, moeda e situação enviadas no corpo são ignoradas; …" (`moeda: 'BRL'` no corpo não muda nada) |
| CA-19.1 os quatro nascem desligados | `configuracao.test.ts` › "CA-19.1: no sistema novo, os quatro agentes, na ordem da lista, desligados, …"; `agentes.test.ts` › "CA-19.1: GET /api/agentes no sistema novo → os quatro desligados" |
| CA-19.3 ligar e desligar com quem e quando | `configuracao.test.ts` › "CA-19.3: o CTO liga o risco com modelo de preço vigente e depois desliga; …"; `agentes.test.ts` › "CA-19.3: CTO liga e desliga o risco (com modelo de preço vigente); …"; `configuracao-bordas.test.ts` › "agente ligado troca para outro modelo com preço vigente: …" |
| RF-19 ligar exige preço vigente (409 da 03) | `configuracao.test.ts` › "ligar %s → 409 com o texto da 03, …" (3); "o modelo com preço futuro passa a ligar quando a vigência começa"; "o 409 nomeia cada agente como a 03 (seção 2.6)"; `agentes.test.ts` › "ligar sem modelo com preço vigente → 409 e continua desligado"; `configuracao-bordas.test.ts` › "nenhum agente muda, nem a data, nem o autor, e nenhum evento é gravado" |
| RF-19 desligar funciona sempre | `configuracao-bordas.test.ts` › "agente ligado com modelo que não tem preço vigente desliga, e o modelo fica"; "desligar trocando para um modelo sem preço também é aceito" |
| C-12 só `cto` liga e muda o teto | `configuracao.test.ts` › "C-12: a administradora recebe 403 ao ligar ou desligar, e nada muda"; `teto.test.ts` › "C-12: a administradora recebe 403 e nada muda"; `agentes.test.ts` › "C-12 e C-26: administradora em PATCH /api/agentes/risco e PUT /api/configuracao/teto → 403"; "pessoa sem 2FA → 403; sem sessão nem token → 401; nada muda" |
| C-26 preço só por script | `test/estatico/preco-so-por-script.test.ts` › "nenhum arquivo de src/ grava em preco_modelo (o preço entra só por scripts/)", com os dois testes que provam o glob e o detector |
| C-11 autoria só da sessão | `agentes.test.ts` › "C-11: autoria e agente do corpo são ignorados; …"; `teto.test.ts` › "descarta chave desconhecida (C-11): …"; `configuracao.test.ts` › "descarta chave desconhecida: …"; `agentes-bordas.test.ts` › "C-11: autoria, moeda e situação enviadas no corpo são ignoradas; …" |
| C-15, C-17, C-21 nas rotas novas | `agentes.test.ts` › "C-15: com cookie e Origin de outro site → 403; …"; "agente fora da lista → 404 sem nenhuma consulta ao banco, …"; "uma linha por requisição, com o padrão da rota; …" |
| Idempotência e histórico só de mudança real | `configuracao.test.ts` › "o mesmo estado de novo não grava nem gera evento (idempotente)"; `teto.test.ts` › "o mesmo valor de novo não grava nem gera evento (idempotente)"; `agentes-bordas.test.ts` › "o mesmo valor de novo, em outra escrita, responde 200 …"; "o mesmo \"ligar\" duas vezes responde 200 nas duas, com um evento só, …" |
| Concorrência (`FOR UPDATE`) | `configuracao.test.ts` › "duas mudanças ao mesmo tempo no mesmo agente: …"; `configuracao-bordas.test.ts` › os 4 de "alterarAgente sob concorrência (FOR UPDATE)"; `teto-bordas.test.ts` › os 2 de "definirTeto sob concorrência (FOR UPDATE)" |
| G3.8 transação de quem chama | `configuracao.test.ts` e `teto.test.ts` › "G3.8: na transação de quem chama, o rollback desfaz …"; `agentes-bordas.test.ts` › "o rollback da transação de quem chama desfaz o uso gravado nela" |
| RNF-15 relógio fixo, sem ordem | os 8 arquivos usam `relogioFixo` e montam o próprio estado em `beforeAll`/`beforeEach`/`afterEach` |

### Testes acrescentados (44, quatro arquivos novos)

**`src/modules/agentes/teto-bordas.test.ts` (20).** Postgres real, papel do app.

- **Fronteira do mês:** a chamada às 00:00:00.000 do dia 1º conta no mês novo, e não no anterior; uma chamada com
  data no mês seguinte não entra no gasto do mês corrente.
- **Fim da suspensão (RN da RF-18):** subir o teto de 10,00 para 10,01 com gasto 10 tira a suspensão na hora;
  baixar para 9,99 suspende de novo. Com o mesmo teto, a suspensão acaba quando o mês vira. A resposta de `definirTeto`
  já soma o gasto do mês.
- **Percentual coerente com a suspensão:** 10 tetos sem representação binária exata (0,01, 0,07, 0,10, 0,29, 0,30,
  1,15, 10,01, 33,33, 99,99 e 1.234,56). Com o gasto igual ao teto, o resultado é 100 e suspenso; um milionésimo
  abaixo, 99 e não suspenso. O painel nunca mostra "100 %" com os agentes rodando nem "99 %" com eles suspensos.
- **Concorrência real, sem depender de tempo:** a primeira alteração grava numa transação que fica aberta. A segunda só
  segue quando o `pg_stat_activity` mostra que ela parou na trava. Com valores diferentes, o `antes` da segunda é o
  valor da primeira. Com o mesmo valor, só a primeira grava e gera evento. Sem o `FOR UPDATE`, a segunda leria o valor
  velho e o `antes` dela sairia errado.
- **Limites do `numeric(12, 2)`:** 9.999.999.999,99 grava sem perder centavo. "0010,5" grava 10.50, e "10.50" depois
  não gera evento.

**`src/modules/agentes/configuracao-bordas.test.ts` (9).** Postgres real, papel do app.

- **Desligar funciona sempre:** o agente ligado com modelo sem preço vigente desliga. Esse estado o banco aceita, por
  exemplo com um preço apagado à mão. Desligar trocando para um modelo sem preço também passa.
- **Troca de modelo de agente ligado,** para outro com preço: continua ligado, com quem e quando, e o evento guarda os
  dois modelos. O modelo do corpo chega aparado ao banco e casa com o preço.
- **409 ao ligar:** nenhuma linha de agente muda, nem a data nem o autor, e o total de eventos fica igual.
- **Concorrência real**, com a mesma espera conferida no banco:
  - desligar enquanto o ligar não terminou: o `antes` do desligar é o estado ligado;
  - dois "ligar" iguais: um evento só;
  - ligar sem modelo, esperando quem gravou o modelo: usa o modelo recém-gravado e liga. Sem o `FOR UPDATE`, daria 409;
  - a trava é por agente: mudar outro agente não espera.

**`src/app/api/agentes/agentes-bordas.test.ts` (12).** Banco, Better Auth e relógio fixo reais.

- **C-11 no `PUT` do teto pela rota:** `atualizadoPor`, `moeda: 'BRL'`, `gastoDoMes`, `suspenso` e `percentual` no corpo
  são ignorados. A linha fica com `USD` e com a pessoa da sessão.
- **Repetição sem evento:** `PUT` com "12,5" e depois "12.50", e "ligar" duas vezes, respondem 200 com um evento só e
  a data da primeira. O `GET` do teto devolve o mesmo JSON do `PUT`.
- **Troca de modelo pela rota:** responde 200 com o modelo novo.
- **A cadeia inteira da T23:** preço vigente → `calcularCusto` → `registrarUso` → `GET /api/configuracao/teto`.
  - Com teto 0,01, a primeira chamada (0,006) dá 60 % e não suspende.
  - A segunda acontece e leva o gasto a 0,012: 120 % e suspenso. O excesso não passa do custo de uma chamada (RNF-07).
  - Com o preço novo a partir de dezembro, a mesma chamada custa 0,06, e o mês começa do zero.
- **`registrarUso`:**
  - o rollback da transação de quem chama desfaz o uso;
  - custo acima do `numeric(12, 6)` e tokens acima do `integer` são recusados, e nada é gravado;
  - no limite das colunas (999.999,999999 e 2³¹ − 1), grava sem perder precisão.

**`test/estatico/preco-so-por-script.test.ts` (3).** C-26: o papel do app tem `INSERT` em `preco_modelo`, porque o
script da T33 usa o mesmo papel. A barreira é não haver código do app que grave nessa tabela. O teste varre `src/`,
fora os testes, procurando `insert`, `update` ou `delete` em `precoModelo`, pelo Drizzle ou em SQL. Dois testes de
controle provam que a varredura enxerga `src/` e que o detector pega as formas de gravar e deixa passar a leitura.

### Ponto aberto da revisão: o aviso "Using `patch`" do undici

O aviso não vem da T23. Ele sai de `src/lib/rota-qa.test.ts` › "método em minúsculas (\"patch\", que o fetch não
normaliza) também passa pela conferência" (`06-T11-testes`). Esse teste monta de propósito um `Request` com
`method: 'patch'`, para provar que o CSRF de `rota()` vale com o método em minúsculas. Rodando só os arquivos da T23, o
aviso não aparece. `test/requisicao.ts` repassa o método como recebe, e todos os testes da T23 mandam `PATCH` e `PUT`
em maiúsculas.

### Resultado

- Arquivos novos isolados: 4 arquivos, 44 de 44.
- Arquivos da T23 com os novos (`src/modules/agentes`, `src/app/api/agentes` e o estático): 8 arquivos, 139 de 139.
- `pnpm test`: 114 arquivos, 2149 de 2149. Antes eram 2105 de 2105, em 110 arquivos. Os 44 a mais são os desta etapa.
- `pnpm lint`: limpo. Na primeira rodada houve 1 aviso (import sem uso no meu arquivo), corrigido.
- `pnpm typecheck`: limpo.

## Decisões tomadas

- **Testes em arquivos novos (`*-bordas.test.ts` e um estático), sem editar os do engenheiro.** Assim o `git diff` mostra
  que nenhum teste existente foi tocado.
- **A concorrência é provada com a espera conferida no `pg_stat_activity`, e não com `Promise.all`.** O `Promise.all` do
  engenheiro passa mesmo se as duas mudanças nunca se sobrepõem. Com a transação segurada, a sobreposição é certa, e o
  teste quebraria sem o `FOR UPDATE`. A espera é por estado do banco, sem `sleep`.
- **O percentual é testado contra a suspensão, e não só contra um número.** O risco real é a tela mostrar 100 % com os
  agentes rodando, ou 99 % com eles parados.
- **O teste dos limites das colunas do uso só exige "recusado, nada gravado", sem fixar o tipo do erro.** Hoje o
  Postgres recusa com 22003. A troca para `RangeError`, no ajudante único do Minor 3 da revisão, não quebra o teste.
- **C-26 vira teste estático.** O banco não separa o script do app, porque os dois usam o mesmo papel. Sem o teste,
  uma rota de preço poderia entrar sem nada falhar.
- **Cada cenário que grava uso fica num mês próprio.** O papel do app não apaga `uso_ia`, e assim a soma de um teste
  não entra na de outro, em qualquer ordem.

## Pendências

- **Para a 08 (Minor, não bloqueia):** `percentualDo` soma `1e-9` antes do `Math.floor`. Com teto acima de cerca de
  US$ 100.000, um gasto um milionésimo abaixo do teto pode aparecer como 100 % sem suspensão, porque a diferença
  relativa fica menor que o `1e-9`. O teste cobre tetos até 1.234,56, a faixa de uso previsto. Uma conta em
  milionésimos inteiros, como a de `calcularCusto`, fecharia o caso. Não há teste que afirme o comportamento acima
  disso, para não travá-lo.
- **Para a T27:** `registrarUso` com custo acima de 999.999,999999 ou tokens acima de 2³¹ − 1 falha no banco (22003), e
  não com `RangeError`. A execução deve tratar essa falha como erro da chamada, sem perder a linha de uso das outras
  tentativas. Vale junto com o Minor 3 da `06-T23-revisao`.
- **Para a T33:** o script de preço fica em `scripts/`. Código em `src/` que grave em `preco_modelo` quebra
  `test/estatico/preco-so-por-script.test.ts` de propósito (C-26).
- Os Minor 1 a 5 da `06-T23-revisao` seguem como estão. Nenhum teste desta etapa trava o texto do 409 na troca de
  modelo de agente ligado (Minor 1) nem a ação do evento numa troca só de modelo (Minor 2).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 7b68d76..63faf6c` — código e testes da T23 só no 9818216 (11 arquivos novos)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -12` — HEAD a3d3ff6 (06-T23-revisao tech-lead)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 4f92752 --stat` — só `parada-PF-T23.md`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/agentes src/app/api/agentes` — 95 de 95, 4 arquivos (antes dos testes novos)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/agentes/teto-bordas.test.ts src/modules/agentes/configuracao-bordas.test.ts src/app/api/agentes/agentes-bordas.test.ts test/estatico/preco-so-por-script.test.ts` — 44 de 44
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/agentes src/app/api/agentes test/estatico/preco-so-por-script.test.ts` — 139 de 139, 8 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 2149 de 2149, 114 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -S "metodo: 'patch'" -- src test` — nenhum commit
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline --pickaxe-regex -S "['\"]patch['\"]" -- src test` — só o 0d89a1d (06-T11-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 0d89a1d` — `src/lib/rota-qa.test.ts` entre os arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 0d89a1d --pickaxe-regex -S "['\"]patch['\"]" --format=%h -- src/lib/rota-qa.test.ts` — o teste do método em minúsculas, origem do aviso do undici
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — 1 aviso (import sem uso em `agentes-bordas.test.ts`), corrigido
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/agentes/agentes-bordas.test.ts` — 12 de 12
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 2149 de 2149, 114 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — só os 4 arquivos de teste novos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — vazio: nenhum arquivo rastreado foi alterado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 63faf6c HEAD` — só `06-T23-tech-lead.md` e `passagens.jsonl`

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
