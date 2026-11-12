---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T04-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G8, T03 e T04), 06-T01-engenheiro-dados-bd.md, 06-T01-tech-lead.md, 06-T01-qa-automacao.md, 06-T02-engenheiro-backend.md, 06-T02-tech-lead.md, 06-T02-qa-automacao.md, 06-T03-engenheiro-backend.md, 06-T03-tech-lead.md, 06-T03-qa-automacao.md, src/modules/limites.ts, src/modules/limites.test.ts, src/modules/acesso/ator.ts, src/modules/historico/registrar.ts, src/modules/demandas/gerar-id.ts, src/db/index.ts, src/db/transacao.ts, src/db/schema/demandas.ts, src/db/schema/historico.ts, src/lib/erros.ts, src/lib/reduzir-erro.ts, src/lib/relogio.ts, test/banco.ts, test/integracoes.ts, test/estatico/relogio.test.ts, test/estatico/sql-raw.test.ts, test/estatico/classes-de-erro.test.ts, test/estatico/varreduras-qa.test.ts (C-17), vitest.config.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T04: limite por integração e tempo limite das transações de integração (IN-09, IN-14, ADR-24, ADR-28, D-03). As
pendências das entregas 06-T01 a 06-T03 não pedem nada à T04 (só registram que `limites.ts` é dela, G8 #17 e #18).

### Arquivos alterados

| Arquivo | O que mudou | G8 |
|---|---|---|
| `src/modules/limites.ts` | `MENSAGEM_LIMITE_AWAVE`; tabela `LIMITE_DA_INTEGRACAO` congelada em todos os níveis (`awave: { demanda: 10 }`, `construir: {}`); `limiteDe(ator, tipo)` em `switch` com `never`: pessoa e agente com 30 e 60 de hoje, integração com o limite da tabela ou **lança** ("sem limite definido"), sistema `null`; `autoriaDo` virou `autoriaDoLimite` em `switch` com `never` (integração conta como `integracao`/<nome>); `conferirLimite` usa `limiteDe` e grava a trava `limite:<tipo>:<autorTipo>:<autorId>` de hoje | #17, #18 |
| `test/integracoes.ts` | `inserirDemandaDeIntegracao(b, d)` (G7): demanda com autoria `integracao`/`awave`, `rascunho_agente` true, solicitante "Awave", papel "outro", pelo migrator | — |

### Arquivos criados

- `src/modules/integracoes/tempo-limite.ts`: `Orcamento`, `MENSAGEM_INDISPONIVEL` (D-03), `limitarTempo` (`switch` com
  `never`; só integração recebe `set local lock_timeout = '2s'` e `statement_timeout` de `5s` ou `10s` na entrega),
  `traduzirTempoEsgotado` (57014 e 55P03 viram `ErroDominio('indisponivel')`; ErroDominio e outro erro passam iguais) e
  `executarComOrcamento` (com a transação de quem chama, usa a mesma e não aplica SET; sem ela, abre, aplica o orçamento
  e traduz). G8 #19.
- `src/modules/limites-integracao.test.ts` (12 testes, Postgres real): os do plano, mais o sistema `null`, a recusa
  "sem limite" que não é ErroDominio (500, nunca 429 nem passagem), integração fora da lista e chaves herdadas
  (`toString`, `__proto__`, `constructor`, `hasOwnProperty`, caixa trocada, vazio), tipo de ator desconhecido, limite
  congelado, a 10ª passa e a 11ª dá 429, a janela esvazia uma hora depois, o prefixo do token não muda a conta, pessoa
  com id "awave" e agente com 10 demandas passam e não entram na conta do awave, e a trava do awave tem a chave
  `limite:demanda:integracao:awave`.
- `src/modules/integracoes/tempo-limite.test.ts` (19 testes, Postgres real): os cinco itens do plano, mais o SET LOCAL
  que termina com a transação (pool de uma conexão), o corpo que termina bem é gravado, tipo desconhecido lança, o 57014
  real do Postgres (embrulhado pelo Drizzle) vira `indisponivel` sem gravar, ErroDominio do corpo passa igual e erro de
  outro código vira 500 na `mapearErro`.

### Teste antes do código (visto falhando)

`pnpm test src/modules/limites-integracao.test.ts src/modules/integracoes`, antes de mexer em `limites.ts` e de criar
`tempo-limite.ts`:

```
 ❯ src/modules/integracoes/tempo-limite.test.ts (0 test)
 ❯ src/modules/limites-integracao.test.ts (12 tests | 10 failed) 549ms
     × awave: 10 demandas na janela; a mensagem cita o 10 e o Awave 6ms
     × a 11ª do awave na janela é 429 com a mensagem do Awave; fora da janela não conta 140ms
     × o prefixo do token não muda a conta: o awave é contado pela integração 66ms
     × a trava do awave é a de hoje, por tipo e autoria: limite:demanda:integracao:awave 10ms
TypeError: limiteDe is not a function
AssertionError: expected undefined to be an instance of ErroDominio
AssertionError: promise resolved "undefined" instead of rejecting
Error: Cannot find module './tempo-limite' imported from .../src/modules/integracoes/tempo-limite.test.ts
 Test Files  2 failed (2)
      Tests  10 failed | 2 passed (12)
```

A falha "promise resolved undefined" é o defeito real que a T04 fecha: antes, `autoriaDo` devolvia `null` para
integração e `conferirLimite` saía sem contar (o awave não tinha limite nenhum). Os 2 que passaram antes do código:

- "o limite dos outros não muda, e o que eles criam não entra na conta do awave": guarda do que não pode mudar (pessoa
  e agente passam; o awave com 9 passa, o que antes valia por não contar nada).
- "a recusa por falta de limite não é ErroDominio": passou à toa, porque o `TypeError` de `limiteDe` ausente também é
  `Error` e não é ErroDominio. Corrigi depois da rodada: o teste agora exige também a mensagem `/sem limite/`, e assim
  falharia sem o código.

### Resultado final

- `pnpm test`: **252 arquivos, 5531 de 5531** passaram, 0 falharam (antes: 250 arquivos e 5500; mais 2 arquivos e 31
  testes, 12 em `limites-integracao.test.ts` e 19 em `tempo-limite.test.ts`).
- `pnpm build`: compilou sem erro (nenhuma rota nova nesta tarefa).

- `pnpm typecheck` e `pnpm lint`: limpos.
- G4 (`git diff a9fd9b8 --stat` das superfícies congeladas e de `src/lib/rota.ts`): vazio.
- IN-16 (D-17): `git diff a9fd9b8 --stat` dos 16 testes mostra só os três da T03 (`matriz.test.ts`,
  `matriz-qa.test.ts`, `matriz-rotas.test.ts`); a T04 não tocou nenhum. `src/modules/limites.test.ts` (C-36) passa sem
  mudança.

### Desvios do plano

1. **`tempo-limite.test.ts`, item 1 (pessoa e agente):** o plano espera `'0'` e `'0'`. O `statement_timeout` de pessoa
   e agente é `'10s'`, porque `criarPool` (`src/db/index.ts:12`) abre toda conexão com `statement_timeout: 10_000`. O
   teste confere `lock_timeout = '0'` e `statement_timeout = '10s'`, isto é, nada muda. Como o orçamento `entrega` também
   é `'10s'`, o teste confere ainda a origem do valor em `pg_settings.source`: `'session'` com o SET LOCAL da integração
   e `'client'` sem ele. Assim o SET da entrega é provado, e não só o valor.
2. **`traduzirTempoEsgotado` lê também `lerCode(e)`:** o item 3 do plano usa objeto simples (`{ code: '57014' }`), e
   `reduzirErro` devolve `desconhecido` para o que não é Error. O código vem de `reduzirErro(e).code ?? lerCode(e)`,
   as duas funções já existentes de `reduzir-erro.ts`, sem ler mensagem. Traduzir a mais só dá a mensagem fixa.
3. **`limiteDe` confere chave própria** (`Object.hasOwn`) nos dois níveis da tabela, e a tabela é congelada nos três
   níveis. O texto do plano (`LIMITE_DA_INTEGRACAO[ator.integracao]?.[tipo]`) já lançava para `toString` e `__proto__`,
   mas por acaso; agora é regra, com teste.
4. **Item 5 (estático) sem a asserção de `sql.raw`:** a regex dentro do teste casa com a varredura C-17 de
   `test/estatico/varreduras-qa.test.ts`, que lê todo `src/` (inclusive `.test.ts`) e quebrou na primeira rodada da
   suíte. O próprio plano diz que o teste de sql-raw de hoje já cobre; o arquivo ficou com as três asserções dos SET
   LOCAL literais, a de nenhum SET com valor interpolado e a de nenhuma linha de log.
5. **Testes além do plano** nos dois arquivos novos (listados acima). Só reforçam o comportamento da T04.
6. **Cada teste que conta usa um dia próprio** em `limites-integracao.test.ts` (o awave é um ator só): o arquivo não
   depende de ordem (padrão técnico, seção 7). O caso da 11ª segue os ids do plano (`DEM-20261111-0001` a `0011`).

## Decisões tomadas

- Integração sem limite definido lança `Error` simples, não ErroDominio: vira 500 genérico, que é a falha fechada do
  ADR-24 (nunca "sem limite"). Hoje nenhum caminho chega lá: a matriz nega `criar_demanda` ao `construir` e
  `autoriaDo` (T02) recusa integração nas versões antes de `conferirLimite`.
- `conferirLimite` mantém a ordem de hoje: limite, trava, contagem. A chave da trava segue o formato
  `limite:<tipo>:<autorTipo>:<autorId>`; para o awave, `limite:demanda:integracao:awave`, que é a do item 2 do
  `tempo-limite.test.ts`.
- `executarComOrcamento` com `t` de quem chama não traduz o erro: quem abriu a transação (e o próprio
  `executarComOrcamento` dela) traduz uma vez só.
- Nenhuma linha de log nova (G3.10), nenhum pacote, variável de ambiente, migration ou GRANT novo. O SQL dos SET LOCAL
  é literal constante (G3.6).

## Pendências

- Nenhuma bloqueia a T04.
- Para a T05, T06, T11 e T12: as rotas das integrações chamam `executarComOrcamento(deps.pool, ator, 'padrao' |
  'entrega', t, corpo)` e o `conferirLimite` dentro do corpo, como no plano; o 429 e o 503 saem pela `mapearErro` de
  hoje.
- Para a 09 (RNF-01, D-21): a medição com 10 criações e 10 recusas do awave passa por `conferirLimite` com a trava
  acima.
- O plano tem caixas `- [ ]` dos passos da T04, mas não as marquei: `docs/` fica fora do que a 06 pode editar (G1).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261111-0016-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -12` — HEAD em 040a111 (06-T03-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --oneline -16 -- docs/construcao/DEC-DEM-20261111-0016-v1` — as entregas 06-T01 a 06-T03, para ler as Pendências
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- test/estatico src/modules/integracoes vitest.config.ts src/lib/relogio.ts` — os testes estáticos de hoje (relógio, sql-raw, classes de erro)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/limites-integracao.test.ts src/modules/integracoes` — antes do código: 2 arquivos falharam, 10 testes falharam e 2 passaram (trecho acima)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/limites-integracao.test.ts src/modules/integracoes src/modules/limites.test.ts` — 3 arquivos, 42 de 42 (C-36 de hoje sem mudança)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — saiu com código 1; a saída foi cortada antes do resumo (o log da suíte é grande)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=dot` — saiu com código 1; um `x` no começo, resumo cortado
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico` — 1 falhou: `varreduras-qa.test.ts` (C-17) achou o texto `sql.raw` no meu `tempo-limite.test.ts` (desvio 4); 439 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico src/modules/integracoes src/modules/limites-integracao.test.ts` — 36 arquivos, 471 de 471, depois da correção
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test scripts src/lib src/db src/components --reporter=dot` — o filtro `test` casa com todo arquivo `.test.ts`, então rodou a suíte inteira: 252 arquivos, 5531 de 5531
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 --stat -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts 'drizzle/000[0-6]_*.sql' 'drizzle/meta/000[0-6]_snapshot.json' src/lib/rota.ts` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 --stat -- src/modules/acesso/matriz.test.ts src/modules/acesso/matriz-qa.test.ts src/modules/acesso/resolver-ator.test.ts src/modules/acesso/resolver-ator-qa.test.ts src/modules/acesso/tokens-servico.test.ts src/modules/acesso/tokens-servico-qa.test.ts src/modules/demandas/servico.test.ts src/modules/historico/registrar.test.ts src/modules/limites.test.ts src/db/privilegios.test.ts src/app/api/vistas-para-agente.test.ts test/matriz-rotas.test.ts test/transversal/sentinelas.test.ts test/estatico/sem-controle-bidi.test.ts test/estatico/sem-recurso-externo.test.ts test/estatico/leituras-da-fila.test.ts` — só os três arquivos da T03; nenhum da T04 (IN-16)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só os arquivos da tarefa
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 252 arquivos, 5531 de 5531 (saída lida com Read no arquivo da tarefa em segundo plano)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/limites-integracao.test.ts src/modules/integracoes` — 2 arquivos, 31 de 31, depois de reforçar a asserção "sem limite"
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 252 arquivos, 5531 de 5531, 0 falharam (rodada final)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 2 alterados (`limites.ts`, `test/integracoes.ts`), 3 novos (os dois testes, `tempo-limite.ts`) e esta entrega
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 2 arquivos, 89 linhas a mais e 14 a menos
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas build` — compilou, sem rota nova
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — o build não deixou arquivo rastreado alterado

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (a T04 não cria rota, Server Action nem job; o 429 e o 503 têm mensagem fixa, sem texto do Postgres)
