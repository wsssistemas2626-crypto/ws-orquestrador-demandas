---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T04-testes
agente: qa-automacao
leu: [pedido.json, contrato-passagem.md, tarefas.json, 01-analista-requisitos.md (RF-02, CA-02.1 a CA-02.7), 04-seguranca-aplicacao.md (AN-02 e ADR-33, por busca), 06-T03-qa-automacao.md, 06-T04-engenheiro-backend.md, 06-T04-tech-lead.md, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (T04, linhas 928 a 957 e 1100 a 1160), commit 3b39e526cec537b917287bdf109c6600f25d880f (git show), src/lib/rota.ts, src/lib/erros.ts, src/lib/corpo.ts, src/lib/log.ts, src/lib/rota-qa.test.ts (linhas 1 a 80), src/modules/acesso/resolver-ator.ts, src/db/schema/andamento.ts, test/requisicao.ts, test/sentinelas.ts, test/sessao.ts (criarPessoa), test/estatico/andamento.test.ts, test/estatico/piso-de-assercoes.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T04 (corpo fechado do andamento e 422 pelo `rota()` com `corpoInvalido`, AN-02 e ADR-33), sobre o commit
`3b39e526cec537b917287bdf109c6600f25d880f`. O código cumpre os critérios da tarefa e não há devolução. Acrescentei dois
arquivos, com 241 testes, e duas entradas no `PISO`. O teste do engenheiro usa um schema sintético no `rota()`; os novos
passam o `corpoAndamentoSchema` e o `CORPO_INVALIDO_ANDAMENTO` de verdade pelo adaptador, e resolvem o Minor 1 da
`06-T04-revisao` sem mexer no arquivo do engenheiro.

### Critérios da tarefa e o teste que cobre cada um

A T04 cobre RF-02 (formato), CA-02.2, CA-02.4 (no adaptador), CA-02.6, AN-02, ADR-33 e AN-13. O 422 pela rota real, sem
consulta ao banco, e o CA-02.3 contra um DEC com pedido gerado são da T08; aqui ficam no nível do adaptador.

| Critério | Teste (arquivo › nome) |
|---|---|
| RF-02: as listas são as da especificação | **novo** `src/modules/andamento/schemas-qa.test.ts` › "a fonte das listas é exatamente o literal da especificação, e o máximo é 999", "aceita a fase %s da especificação" (6) e "aceita o status %s da especificação" (3). O teste do plano itera sobre a própria fonte; este compara com o literal do `pedido.json` |
| CA-02.2 e AN-02 (a) no schema | `schemas.test.ts` › "recusa: %s" e "recusa do JSON cru: %s"; **novo** `schemas-qa.test.ts` › "recusa de valores parecidos com os da lista" (99 casos: caixa, espaços, `\n`, NUL, largura zero, BOM, hífen, letra cirílica, prefixo, em cada fase e status, mais status da demanda e tipos trocados), "números nas bordas" (prontas um acima do total em 0 e em 998, 1000, negativos, além do seguro, frações, NaN, ±Infinity), "recusa sem coerção" (BigInt, `Number` embrulhado, Date, texto, lista, `valueOf`) e "forma do objeto" (vazio, chave a mais nula ou `undefined`, caixa trocada na chave, `toString`, `statusConstrucao`, `atualizadoEm`, `decId` no corpo) |
| CA-02.2 e AN-02 (a) pelo adaptador | **novo** `src/lib/rota-corpo-invalido-qa.test.ts` › "%s → 422 igual byte a byte, sem chamar a função, sem Sentry e com uma linha de log da lista" (27 corpos: o CA-02.2 por inteiro, os do AN-02 (a), objeto vazio e número no corpo). Confere status, os quatro cabeçalhos e o corpo exato, que a função não foi chamada, Sentry vazio e uma linha de log só com os campos da lista, sem o DEC |
| CA-02.4 e AN-02 (c): sem eco na resposta, no log e no Sentry falso | **novo** `rota-corpo-invalido-qa.test.ts` › "CA-02.4 e AN-02 (c)…" (8 casos: sentinela como valor e como **nome** de chave a mais, na fase, no status, aninhada, no número e numa lista; o nome da chave extra também não sai) e "sem a opção, o mesmo corpo continua no 400 de hoje"; `rota-corpo-invalido.test.ts` › "com a opção: corpo fora do schema → 422…" |
| CA-02.3 no adaptador: o 422 não depende do DEC | **novo** › "%s: DEC do teste e DEC que não existe dão a mesma resposta" (6 corpos, status, cabeçalhos e corpo iguais) |
| CA-02.6 e CA-02.1 no adaptador: o válido passa como o schema devolve | **novo** › "%s → 204 sem corpo, cabeçalhos seguros e a função recebe as quatro chaves" (CA-02.1, 0 de 0, 999 de 999, chaves em outra ordem) e "-0 do JSON chega como 0 (sem sinal) e content-type com charset é aceito"; `schemas.test.ts` › "aceita o corpo do CA-02.1, 0/0 (CA-02.6), 999/999…"; **novo** `schemas-qa.test.ts` › "aceita prontas %i e total %i" e "do JSON, 1e1 e 9.0 são os números 10 e 9" |
| ADR-33: a opção só alcança a falha do Zod do corpo | **novo** › "ordem do rota()" (CA-02.7 no adaptador: id fora da regex → 404; sem credencial e token inexistente → 401; awave, agente e pessoa cto → 403 `sem_permissao`, nunca 422; query fora do schema → 400 com `campos` mesmo com a opção) e "a opção não alcança o que vem da função" (ErroDominio com `campos` → 400 com os campos; ZodError da função → 500 e Sentry; conflito → 409) |
| AN-02 (d) e AN-13: sem a opção nada muda; com e sem, as recusas de antes do Zod são iguais (Minor 1) | **novo** › "%s → %i %s, a mesma resposta com e sem a opção, sem campos e sem chamar a função" (JSON malformado 400, `text/plain` 415, sem `content-type` 415, corpo acima de 512 KB 413, `content-length` declarado acima 413, cookie de sessão e cookie `__Secure-` com Bearer 400, cookie com origem estranha 403; status, cabeçalhos e corpo iguais byte a byte, o código de erro conferido) e "o 400 do cookie de sessão é o do ator ambíguo, não o do JSON inválido"; "POST sem corpo… → 400 de JSON inválido, com e sem a opção"; `rota.test.ts` e `rota-qa.test.ts` sem mudança |
| AN-13: o tipo e o uso da opção | **novo** › "o tipo só aceita nao_processavel" (`@ts-expect-error`, conferido pelo `pnpm typecheck`), "fora de teste, só o rota(), o schema do andamento e a rota do andamento citam a opção" (e a rota passa `CORPO_INVALIDO_ANDAMENTO`, nunca uma mensagem escrita ali) e "as regras pegam o caso plantado" |
| Mensagens e constantes (03, seção 7) | `schemas.test.ts` › "as três mensagens por inteiro"; **novo** `schemas-qa.test.ts` › "MENSAGENS_ANDAMENTO e CORPO_INVALIDO_ANDAMENTO são congeladas", "CORPO_INVALIDO_ANDAMENTO tem só codigo e mensagem" e "a mensagem do 422 é fixa" |
| Formato do DEC | `schemas.test.ts` › "o formato do DEC é o mesmo da regex de rota()"; **novo** › "a regex do DEC não tem flag" (o `.source` igual não confere flag), "aceita o id %s" (3) e "recusa o id %j" (11, com quebra de linha no fim, `/../`, dígito de largura total) |

### Testes acrescentados

- `src/modules/andamento/schemas-qa.test.ts` (novo, 170 testes): unitário, sem banco nem relógio.
- `src/lib/rota-corpo-invalido-qa.test.ts` (novo, 71 testes): Postgres, Better Auth e tokens reais (Testcontainers), só o
  Sentry trocado por espião; handlers sintéticos com o schema e a opção de verdade do andamento.
- `test/estatico/piso-de-assercoes.test.ts`: o `PISO` ganhou `'src/lib/rota-corpo-invalido-qa.test.ts': 67` e
  `'src/modules/andamento/schemas-qa.test.ts': 29`, contados com `git grep -c --untracked "expect("`. O piso só sobe.

### Resultado

- Os arquivos novos: 170 de 170 e 71 de 71.
- `pnpm test` completo: **319 arquivos, 6979 testes passaram, 0 falharam** (266 s). Eram 6733 na entrega do engenheiro.
  Somam 241 testes novos, 2 entradas do `PISO` e 3 testes gerados por varreduras de arquivos, que agora enxergam os
  arquivos novos.
- `pnpm lint` e `pnpm typecheck`: limpos, antes e depois da edição do `PISO`.

### Conferência com `git diff`

- Meu diff tem só as três linhas novas do `PISO` (comentário e duas entradas). O resto são os dois arquivos novos, ainda
  não rastreados.
- No commit da T04, nenhum teste foi apagado nem levou `.skip`, `.only` ou `.todo`: ele cria `schemas.test.ts` e
  `rota-corpo-invalido.test.ts`, e `rota.test.ts` e `rota-qa.test.ts` não mudaram.
- Os arquivos novos não têm `.skip`, `.only`, `.todo`, `performance`, `Date.now` nem `setTimeout`. As sentinelas são as
  fictícias de `test/sentinelas.ts`; o cookie e o token inexistente são valores inventados (`wsod.session_token=inventado`,
  `token-ficticio-inexistente`). Os tokens reais nascem no banco do teste.

## Decisões tomadas

- **Schema e opção de verdade pelo adaptador:** o teste do engenheiro prova a mecânica com um schema sintético; o
  `rota()` com o `corpoAndamentoSchema` e o `CORPO_INVALIDO_ANDAMENTO` prova o contrato que a T08 vai ligar.
- **Comparação byte a byte (status, cabeçalhos ordenados e corpo):** fecha o Minor 1 da revisão; um 400 vindo de outro
  ponto do `rota()` não passa mais só pelo status.
- **Listas conferidas contra o literal da especificação:** iterar sobre `FASES_ANDAMENTO` não pegaria uma fase a mais
  acrescentada à fonte.
- **Guarda estática da opção no próprio arquivo, com caso plantado:** o `test/estatico/andamento.test.ts` é da ação; a
  opção é outra superfície (AN-13), e a T08 já cabe na lista de quem pode citá-la.
- **Arquivos `-qa` separados:** é o padrão do repositório e deixa os testes do plano e o piso deles intactos.
- **Comandos `pnpm` com `--dir <repo>`:** o shell do agente começa na estruturaAutonoma, e `cd` não está na lista Pode.
  É a mesma forma das entregas anteriores deste pedido.

## Pendências

- Nenhuma bloqueia a passagem.
- Para a `06-T08` (rota): ao criar `src/app/api/pedidos-construcao/[decId]/andamento/route.ts`, passar
  `corpoInvalido: CORPO_INVALIDO_ANDAMENTO` literalmente (a guarda nova recusa outra forma). O 422 sem consulta ao banco
  e o CA-02.3 contra um DEC com pedido gerado ficam com a T08.
- Para a `08-revisao`: o Minor 2 da `06-T04-revisao` (comentário de topo de `src/lib/rota-corpo-invalido.test.ts` ainda
  diz "cookie com Bearer") continua; não mexi no arquivo do engenheiro.
- Comportamento registrado, sem defeito: `9.0` e `1e1` no JSON são aceitos como 9 e 10, porque o `JSON.parse` não
  distingue a escrita; o teste deixa isso explícito.
- Li a saída do `pnpm test`, que rodou em segundo plano, só pela ferramenta Read.
- Aviso ao `conferir`: um dos comandos foi `grep -n` (sem o `-r`) sobre um arquivo de teste que eu mesmo criei nesta
  etapa, numa subpasta do repositório (`src/modules/andamento/schemas-qa.test.ts`), só para achar uma linha. É leitura,
  dentro do que a lista Pode permite ler (arquivos criados nesta etapa, subpasta do repositório), mas a forma literal da
  lista é `grep -rn`. Fica declarado em Comandos executados, como manda o contrato; se o `conferir` recusar a forma, é
  bloqueio só de leitura.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — arquivos da pasta do pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 3b39e526cec537b917287bdf109c6600f25d880f -- src test` — código e teste da T04
- `grep -rn -e "RF-02" -e "CA-02" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1/01-analista-requisitos.md` — RF-02 e CA-02.x
- `grep -rn -e "AN-02" -e "ADR-33" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1/04-seguranca-aplicacao.md` — AN-02 e ADR-33
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/requisicao.ts` — `chamarRota`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/lib/rota.ts` — o adaptador com a opção
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -i -e "sentry" -- src/lib test` — o espião do Sentry nos testes de `rota()`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/lib/erros.ts` — `mapearErro` e `STATUS_DO_CODIGO`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/estatico/andamento.test.ts` — molde da guarda estática
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/db/schema/andamento.ts` — listas e `MAXIMO_DE_TAREFAS`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/estatico/piso-de-assercoes.test.ts` — o `PISO` de hoje
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/sentinelas.ts` — sentinelas fictícias
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/lib/corpo.ts` — 400 de JSON inválido e 413
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/acesso/resolver-ator.ts` — 400 do ator ambíguo e 401
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "export" -- test/integracoes.ts test/sessao.ts test/auth.ts src/lib/log.ts` — ajudantes de teste
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/lib/log.ts` — campos da linha de log
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A 12 -e "export async function criarPessoa" -- test/sessao.ts` — `criarPessoa`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -m 3 -e "ts-expect-error" -- src test` — molde do `@ts-expect-error` com descrição
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -4` — `cdef7e5` (06-T04-revisao) no topo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 3b39e526cec537b917287bdf109c6600f25d880f HEAD --stat` — só a revisão e `passagens.jsonl`
- `grep -n "0261111-0017-v1'," /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/modules/andamento/schemas-qa.test.ts` — a linha do id com dígito de largura total, trocada por `String.fromCodePoint`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento/schemas-qa.test.ts --reporter=dot` — 170 de 170
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/rota-corpo-invalido-qa.test.ts --reporter=dot` — 71 de 71
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c --untracked "expect(" -- src/lib/rota-corpo-invalido-qa.test.ts src/modules/andamento/schemas-qa.test.ts` — 67 e 29
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot --silent` — 319 arquivos, 6979 de 6979
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n --untracked -e "\.skip" -e "\.only" -e "\.todo" -e "performance" -e "Date.now" -e "setTimeout" -- src/lib/rota-corpo-invalido-qa.test.ts src/modules/andamento/schemas-qa.test.ts` — nada
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — só as linhas novas do `PISO`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — o `PISO` modificado e os dois arquivos de teste novos
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo, depois do `PISO`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo, depois do `PISO`

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
