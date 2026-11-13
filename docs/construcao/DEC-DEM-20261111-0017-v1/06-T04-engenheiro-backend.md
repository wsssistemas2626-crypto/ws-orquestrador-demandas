---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T04-construcao
agente: engenheiro-backend
leu: [pedido.json, contrato-passagem.md, tarefas.json, 05-tech-lead.md, 06-T01-tech-lead.md, 06-T03-engenheiro-backend.md, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (linhas 1 a 340, G1 a G10, e 925 a 1155, T04), src/lib/rota.ts, src/lib/rota.test.ts (1 a 130 e 205 a 230), src/lib/erros.ts, src/lib/corpo.ts, src/lib/log.ts, src/db/schema/andamento.ts, src/modules/acesso/resolver-ator.ts, test/requisicao.ts, test/estatico/andamento.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T04 do plano: corpo fechado do andamento e 422 pelo `rota()` com a opção `corpoInvalido` (RF-02 no formato, CA-02.2,
CA-02.4 no adaptador, CA-02.6, AN-02, ADR-33). Antes de escrever código, conferi que os quatro arquivos da T04 ficam em
`src/`, dentro da minha lista Pode. Das entregas 06-T01 a 06-T03, só a revisão da T01 cita a T04: o formato do DEC também
é validado no corpo (T04). Isso está coberto por `RE_ID_DEC_ANDAMENTO`, preso à regex de `rota()` por teste.

### Arquivos criados

- `src/modules/andamento/schemas.ts`: `RE_ID_DEC_ANDAMENTO`, `MENSAGENS_ANDAMENTO` (as três mensagens da 03, seção 7),
  `CORPO_INVALIDO_ANDAMENTO`, `corpoAndamentoSchema` (`z.strictObject` com as duas enumerações das listas da tabela,
  inteiros de 0 a 999 e `refine` com prontas ≤ total) e o tipo `CorpoAndamento`. É o código do plano, sem mudança.
- `src/modules/andamento/schemas.test.ts`: o teste do plano, sem mudança. Cobre os aceitos (CA-02.1, 0/0, 999/999, cada
  fase e status, `-0`), 21 recusas por objeto e 4 recusas do JSON cru (`__proto__`, `constructor`, `1e3` > `1e2`,
  `1e400`), as três mensagens por inteiro e a regex do DEC igual à de `rota()`.
- `src/lib/rota-corpo-invalido.test.ts`: o teste do plano, com um desvio no caso do cookie (abaixo). Com a opção, corpo
  fora do schema dá 422 só com `erro` e `mensagem`, sem `campos`, e a sentinela não aparece na resposta nem no log. Sem a
  opção, continua o 400 com `campos`. JSON malformado (400), `text/plain` (415), corpo acima de 512 KB (413) e cookie de
  sessão com Bearer (400) dão o mesmo status com e sem a opção.

### Arquivo modificado

- `src/lib/rota.ts`: só a opção `corpoInvalido` em `OpRota` (com o comentário do ADR-33), a função `validarCorpo` e a
  troca de `validar` por `validarCorpo` na linha do corpo. Sem a opção, `validarCorpo` chama o mesmo `validar` de hoje,
  então nenhuma rota existente muda de comportamento. `git -C <repo> grep -n corpoInvalido -- src test` só acha o
  `rota.ts`. Nenhum `route.ts` passa a opção ainda: a rota do andamento é da T08. O comentário não cita o nome da ação,
  para não disparar a guarda AN-01 (f) de `test/estatico/andamento.test.ts`.

### Teste escrito antes, visto falhando

`pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento/schemas.test.ts src/lib/rota-corpo-invalido.test.ts --reporter=dot`,
antes de criar `schemas.ts` e de mexer em `rota.ts`:

```
 FAIL  src/modules/andamento/schemas.test.ts [ src/modules/andamento/schemas.test.ts ]
Error: Cannot find module './schemas' imported from .../src/modules/andamento/schemas.test.ts
 FAIL  src/lib/rota-corpo-invalido.test.ts > corpoInvalido (ADR-33) > com a opção: corpo fora do schema → 422 só com erro e mensagem, sem campos e sem eco
AssertionError: expected 400 to be 422 // Object.is equality
 FAIL  src/lib/rota-corpo-invalido.test.ts > corpoInvalido (ADR-33) > com e sem a opção, igual: cookie com Bearer → 400
AssertionError: expected 204 to be 400 // Object.is equality
 Test Files  2 failed (2)
      Tests  2 failed | 4 passed (6)
```

A terceira falha era do caso escrito no plano, não do código (ver Desvios). Depois da correção do caso, ainda antes do
código, só ficou a falha que exige a opção: `expected 400 to be 422` (1 falhou, 5 passaram).

### Resultado

- Os testes da tarefa, com `rota.test.ts`, `rota-qa.test.ts` (sem mudança) e `test/estatico/andamento.test.ts`:
  5 arquivos, **109 passaram, 0 falharam**.
- `pnpm test` completo: **317 arquivos, 6733 testes passaram, 0 falharam** (239 s).
- `pnpm lint` e `pnpm typecheck`: limpos.

### `git diff 0ac099a -- src/lib/rota.ts`

Três trechos, todos com linhas `+` e uma linha trocada: (1) 3 linhas em `OpRota` (comentário e `corpoInvalido?`); (2) 7
linhas da `validarCorpo`, logo depois de `validar`; (3) a linha `const corpo = …` passa de `validar(op.corpo, …)` para
`validarCorpo(op.corpo, …, op.corpoInvalido)`. Nada mais muda no arquivo.

### G4

O `git diff 0ac099a --stat` das superfícies congeladas saiu **vazio**.

### Desvios do plano

- **Caso "cookie com Bearer" em `rota-corpo-invalido.test.ts`.** O plano escreve o cookie `qualquer=1` e espera 400.
  Com ele, a resposta foi 204, com e sem a opção. O motivo é que `resolverAtor` só acha o ator ambíguo com o cookie de
  sessão (`wsod.session_token` ou `__Secure-wsod.session_token`). O próprio plano manda conferir o 400 em
  `src/lib/rota.test.ts` e usar o mesmo caso, e lá o cookie é de sessão. Troquei para `wsod.session_token=inventado`
  (valor fictício, a mesma forma de `rota.test.ts:137`) e renomeei o caso para "cookie de sessão com Bearer → 400", com
  um comentário de uma linha. O status esperado (400) e a regra "igual com e sem a opção" não mudaram. O arquivo é novo
  desta tarefa, então nenhum teste existente mudou.
- **Piso de asserções:** a T04 não está na lista de tarefas que acrescentam arquivo ao `PISO` (G4: T01, T02, T03, T07,
  T08 e T09), então o `test/estatico/piso-de-assercoes.test.ts` não mudou.
- Fora isso, nenhum desvio. O esquema, a opção e os testes são os do plano.

## Decisões tomadas

- **Esquema e opção copiados do plano sem mudança:** são o contrato do AN-02 e do ADR-33, e a revisão confere contra o
  plano.
- **`validarCorpo` delega a `validar` sem a opção:** assim, as rotas de hoje passam pelo mesmo código de antes, e o
  `rota.test.ts` e o `rota-qa.test.ts` continuam verdes sem nenhuma linha mudada.
- **Cookie de sessão com valor inventado no caso do 400:** prova o mesmo 400 de `rota.test.ts` sem criar sessão real e
  sem depender de credencial de pessoa.
- **Comandos `pnpm` com `--dir <repo>`:** o shell do agente começa na estruturaAutonoma, e o `cd` não está na lista Pode.
  É a mesma forma das entregas 06-T01 a 06-T03.

## Pendências

- Nenhuma bloqueia a passagem.
- Para a `06-T04-revisao`: a G4 saiu vazia. O diff parcial de `rota.ts` tem só a opção, a `validarCorpo` e a linha do
  corpo. `rota.test.ts`, `rota-qa.test.ts`, `erros.ts` e `corpo.ts` não mudaram. O desvio do caso do cookie está acima.
- Para a `06-T08` (rota): passar `corpo: corpoAndamentoSchema` e `corpoInvalido: CORPO_INVALIDO_ANDAMENTO` no `rota()`.
  Com isso, `CORPO_INVALIDO_ANDAMENTO` (com `Object.freeze` e `codigo` literal) encaixa no tipo da opção. O 422
  idêntico e sem consulta, pela rota, fica com a T08.
- O resumo da suíte completa, que rodou em segundo plano, foi lido do arquivo de saída pela ferramenta Read. Não usei
  `grep` nem `wc` nele.
- Nenhuma migration rodou, e nada tocou banco fora do Testcontainers.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — arquivos da pasta do pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T04" -- docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md` — seção da T04 no plano
- `grep -rn "T04" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — só a revisão da T01 cita a T04
- `cat /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/lib/rota.ts` — o arquivo antes da tarefa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -5` — último commit `2fb9735` (06-T03-testes)
- `cat /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/lib/erros.ts` — `nao_processavel` → 422
- `cat /home/deploy/servidor/projetos/ws-orquestrador-demandas/test/requisicao.ts` — `chamarRota`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "export" -- src/lib/log.ts test/auth.ts test/integracoes.ts src/lib/deps.ts` — assinaturas dos ajudantes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -i -e "cookie" -- src/lib/rota.test.ts src/lib/rota-qa.test.ts` — o caso de cookie com Bearer de hoje
- `cat /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/lib/log.ts` — `substituirDestinoDoLog`
- `cat /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/lib/corpo.ts` — 400 de JSON malformado e 413
- `cat /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/db/schema/andamento.ts` — listas e `MAXIMO_DE_TAREFAS`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files src/modules/andamento test/estatico/andamento.test.ts vitest.config.ts` — módulo `andamento` ainda inexistente
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "andamento" -- test/estatico/andamento.test.ts` — guarda AN-01 (f)
- `cat /home/deploy/servidor/projetos/ws-orquestrador-demandas/test/estatico/andamento.test.ts` — quem pode citar a ação
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento/schemas.test.ts src/lib/rota-corpo-invalido.test.ts --reporter=dot` — antes do código: 2 arquivos falharam, 2 testes falharam e 4 passaram
- `cat /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/modules/acesso/resolver-ator.ts` — só o cookie de sessão torna o ator ambíguo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/rota-corpo-invalido.test.ts --reporter=dot` — antes do código, com o caso corrigido: 1 falhou (400 em vez de 422), 5 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento/schemas.test.ts src/lib/rota-corpo-invalido.test.ts src/lib/rota.test.ts src/lib/rota-qa.test.ts test/estatico/andamento.test.ts --reporter=dot` — 5 arquivos, 109 de 109
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot --silent` — 317 arquivos, 6733 de 6733
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0ac099a -- src/lib/rota.ts` — só a opção, a `validarCorpo` e a linha do corpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0ac099a --stat -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/db/transacao.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/agentes/entrada-agente.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/pacotes-decisao/consultas.ts next.config.ts drizzle/000[0-7]_*.sql drizzle/meta/000[0-7]_snapshot.json` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só `src/lib/rota.ts`, `src/lib/rota-corpo-invalido.test.ts` e `src/modules/andamento/`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "corpoInvalido" -- src test` — só `src/lib/rota.ts`

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (o corpo do andamento é `z.strictObject` fechado, e o 422 com a opção leva só `erro` e `mensagem` fixa, sem `campos` nem eco)
