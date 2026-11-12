---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T10-construcao
agente: engenheiro-dados-bd
leu: [contrato-passagem.md, pedido.json, tarefas.json, padrao-tecnico.md (pela seção "Na construção" do agente), 05-tech-lead.md, parada-P2.md, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G7, T09 fim, T10, T11 e T12), 02-arquiteto-solucoes.md (seções 0 a 8), 04-seguranca-aplicacao.md (achados, C11 a C15, IN-01 a IN-13), 06-T01-engenheiro-dados-bd.md, 06-T09-engenheiro-backend.md, 06-T09-tech-lead.md, 06-T09-qa-automacao.md, src/modules/pedido-construcao/conferir.ts, src/modules/pedido-construcao/gerar.ts, src/modules/pedido-construcao/conferir.test.ts, src/modules/pedido-construcao/conferir-bordas.test.ts (linhas 1 a 209), src/modules/pacotes-decisao/consultas.ts, src/modules/pacotes-decisao/substituido.ts, src/modules/pacotes-decisao/desatualizado.ts, src/modules/demandas/transicoes.ts, src/modules/demandas/resumo-da-fila.test.ts, src/modules/historico/registrar.ts (linhas 1 a 80), src/db/schema/historico.ts, src/db/schema/decisao.ts, src/db/schema/demandas.ts (linhas 40 a 110), src/db/schema/acesso.ts (linhas 1 a 40), src/db/schema/agentes.ts (linhas 1 a 25), src/db/schema/comum.ts, src/db/index.ts, test/banco.ts, test/integracoes.ts, test/estatico/relogio.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T10: as leituras do Pedido de Construção no histórico (IN-10, RF-12, RF-15, RNF-02, ADR-27, D-12, P-02, P-03), como
pede o plano.

### Conferência antes de começar (lição da T07)

A T10 cria só `src/modules/pedido-construcao/pendentes.ts` e `src/modules/pedido-construcao/pendentes.test.ts`. Os dois
estão em `src/modules/`, que está na minha lista Pode. A G5 não manda mudar nenhum teste que já existe nesta tarefa, e
nenhum mudou. Não houve motivo para devolver ao plano.

### Pendências das entregas 06-T01 a 06-T09 que citam a T10

A busca foi `git log -G T10` na pasta do pedido. Citam a T10 o 05, a parada P2, a 06-T01 e as três entregas da 06-T09.
- 06-T01 (minha): "o `EXPLAIN` das leituras do pedido no histórico confere que `evento_acao_entidade_idx` é usado".
  **Feito.** O teste RNF-02 exige o índice no plano, e ele aparece duas vezes (trecho abaixo).
- 06-T09 (engenheiro, revisão e testes): `conferirEMontarPedido` não confere quem gerou. Isso fica com
  `pedidoGeradoPorPessoa` (T10), chamado antes, na T11. **Feito:** a função existe, exige `ator_tipo = 'pessoa'`,
  `entidade = 'pacote_decisao'` e `demanda_id` não nulo, e devolve só `{ demandaId }`.
- Decisão de Fabiano (P-02): um `pedido_entregue` por hash, e o DEC com entrega recusada continua em `pendentes`.
  **Coberto:** `listarPendentes` não monta o pedido, e um `pedido_entregue` não tira o DEC da lista. Só o
  `pedido_recebido` tira. `shasEntregues` dá à T11 a lista de hashes já gravados, para ela gravar um por hash.

### Arquivos

| Arquivo | O que é |
|---|---|
| `src/modules/pedido-construcao/pendentes.ts` (novo) | `listarPendentes`, `pedidoGeradoPorPessoa`, `shasEntregues`, `recebidoComSha`, `recebimentoDoPedido`, com as assinaturas do G7 |
| `src/modules/pedido-construcao/pendentes.test.ts` (novo) | 18 testes, Postgres real pelo papel do app |

Nenhum outro arquivo mudou e nenhum teste que já existia foi tocado (`git status --short`: só os dois arquivos novos).
Sem migration, sem GRANT, sem rota, sem linha de log.

### As cinco funções

- `listarPendentes(db)` faz uma consulta só, a da seção 5.3 do 02. Ela parte de `pacote_decisao`, faz junção com a
  subconsulta `g`, que é o primeiro `pedido_gerado` de pessoa sobre `pacote_decisao`, agrupado por `entidade_id`. Depois
  faz junção com `decisao` aprovada e com `demanda`, e filtra:
  - status da demanda fora de `STATUS_FINAIS`;
  - `expressaoSubstituidoPor() is null`;
  - `not expressaoDesatualizado()`;
  - `NOT EXISTS` de `pedido_recebido` do DEC.

  Ordena por `g.primeiro` e depois pelo id. Só `decId` sai.
- `pedidoGeradoPorPessoa(db, decId)` devolve `{ demandaId }` do primeiro `pedido_gerado` de pessoa sobre o DEC, com
  `demanda_id` não nulo, ou `null`.
- `shasEntregues(db, decId)` devolve os `depois->>'sha256'` de `pedido_entregue` do DEC que casam com
  `^[0-9a-f]{64}$`, na ordem de gravação e sem repetir.
- `recebidoComSha(db, decId, sha256)` diz se há `pedido_recebido` do mesmo DEC com o mesmo hash. O hash vai por
  parâmetro, e um hash fora do formato devolve `false` sem consultar.
- `recebimentoDoPedido(db, decId)` devolve a data do `pedido_recebido` mais antigo do DEC, ou `null`.

Todas filtram por `acao`, `entidade = 'pacote_decisao'` e `entidade_id`. Todo valor vai por parâmetro e nada usa
`sql.raw`. Os literais (`'sha256'`, `1`) são constantes.

### Testes criados (`pendentes.test.ts`, 18)

Bloco funcional (banco compartilhado, relógio fixo, um dia por teste; cada teste olha só os próprios DEC):
1. CA-12.1 e CA-12.2: DEC aprovado sem `pedido_gerado` fica fora. Depois de `gerarPedido` por pessoa, entra. Gerar de
   novo não duplica o item.
2. CA-12.6: cada item tem só a chave `decId`, no formato do id, sem repetir, e a leitura não grava evento.
3. IN-10: um `pedido_gerado` de agente, de integração `construir`, de sistema, ou de pessoa sobre a entidade `demanda`,
   não põe o DEC na lista. `pedidoGeradoPorPessoa` devolve `null` em cada caso.
4. IN-10: com um `pedido_gerado` de pessoa, outro de agente no mesmo DEC não tira o DEC da lista.
5. CA-12.3: com a demanda em `aprovada` ou `em_construcao`, o DEC continua. Com a demanda `entregue` (pelo caminho
   real) ou `encerrada`, sai.
6. CA-12.4: um v2 pendente de decisão não substitui o v1. Aprovado, o v2 tira o v1, e só entra depois do próprio
   `pedido_gerado`.
7. CA-12.4: uma ESP ou um RSK mais novos que os citados (desatualizado) tiram o DEC.
8. CA-12.5 e P-02: `pedido_entregue` não tira o DEC. `pedido_recebido` tira. O recebido de outro DEC não conta.
9. P-02: o solicitante é renomeado para o nome que está no título. `conferirEMontarPedido` recusa com
   `nao_processavel`, e o DEC continua na lista.
10. P-03: `pedido_gerado` de outubro conta. Vale o primeiro `pedido_gerado` do DEC, não o último. A ordem é do mais
    antigo para o mais novo, e o empate se resolve pelo id.
11. e 12. `pedidoGeradoPorPessoa`:
    - depois da geração devolve só `{ demandaId }`, a demanda do DEC;
    - antes da geração, e para um DEC inexistente, devolve `null`;
    - um `pedido_gerado` de pessoa sem `demanda_id` dá `null`.
13. `shasEntregues`:
    - ignora maiúsculas, 63 e 65 caracteres, número e chave ausente;
    - ignora `pedido_entregue` sobre a entidade `demanda`, `pedido_recebido` e os hashes de outro DEC;
    - devolve na ordem de gravação, sem repetir: `[sha(2), sha(1)]`.
14. `recebidoComSha` só é verdadeiro com `pedido_recebido` do mesmo DEC e o mesmo hash. Um `pedido_entregue` com o
    hash, outro DEC, maiúsculas ou texto vazio dão `false`.
15. `recebimentoDoPedido`: sem recebimento (ou só com entrega) dá `null`. Com dois recebimentos gravados fora de ordem,
    vale o mais antigo (`2026-11-18T08:30:00.000Z`). O recebido sobre a entidade `demanda` não conta.

Bloco RNF-02 (banco próprio, carga por `generate_series` pelo migrator e `analyze`):
16. A carga tem 200 demandas, 200 DEC v1 (mais 15 v2) e exatamente 20.000 eventos.
17. `listarPendentes` devolve exatamente a lista que a regra da carga dá: 94 DEC, na ordem certa. A lista esperada é
    calculada à parte, em TypeScript. A carga mistura:
    - DEC sem decisão;
    - demanda entregue e encerrada;
    - ESP v2, que deixa o DEC desatualizado;
    - v2 aprovado, que substitui o v1;
    - `pedido_gerado` de agente;
    - recebidos;
    - ordem embaralhada, `(i * 37) % 200` minutos.
18. Plano de execução: uma consulta só, `evento_acao_entidade_idx` no plano, nenhum `Seq Scan` em `evento`, e tempo
    abaixo de 1 s, tanto o de execução do `EXPLAIN ANALYZE` quanto o da chamada.

### Plano de execução (RNF-02, ADR-27)

`EXPLAIN (ANALYZE, FORMAT JSON)` de `listarPendentes`, com 200 DEC e 20.000 eventos:

```
T10 EXPLAIN listarPendentes (94 itens, chamada 19.6 ms, execução 14.4 ms): Sort > Nested Loop > Nested Loop >
Nested Loop > Nested Loop > Aggregate > Sort > Bitmap Heap Scan evento > Bitmap Index Scan evento_acao_entidade_idx >
Memoize > Index Scan pacote_decisao pacote_decisao_pkey > Aggregate > Seq Scan parecer_risco > Aggregate >
Seq Scan especificacao_tecnica > Limit > Sort > Hash Join > Seq Scan decisao > Hash >
Index Scan pacote_decisao pacote_decisao_demanda_versao_unique > Index Scan decisao decisao_pkey >
Index Scan demanda demanda_pkey > Index Scan evento evento_acao_entidade_idx
```

- O `pedido_gerado` (subconsulta `g`) entra por `Bitmap Index Scan evento_acao_entidade_idx`. O `NOT EXISTS` do
  `pedido_recebido` entra por `Index Scan evento evento_acao_entidade_idx`. `evento` nunca é varrida inteira.
- `pacote_decisao`, `decisao` e `demanda` entram pela chave.
- Os `Seq Scan` de `parecer_risco`, `especificacao_tecnica` e `decisao` estão dentro das subconsultas correlacionadas
  de `expressaoDesatualizado` e `expressaoSubstituidoPor`, que já existem e não mudaram. Com 200 linhas por tabela, o
  planejador prefere ler a tabela pequena a usar o índice único `(demanda_id, versao)`. Ver Pendências.

### Teste antes do código

`pnpm --dir … test src/modules/pedido-construcao/pendentes.test.ts`, antes de existir `pendentes.ts`:
```
 FAIL  src/modules/pedido-construcao/pendentes.test.ts [ src/modules/pedido-construcao/pendentes.test.ts ]
Error: Cannot find module './pendentes' imported from .../src/modules/pedido-construcao/pendentes.test.ts
 Test Files  1 failed (1)
      Tests  no tests
```

Primeira execução depois do código: 17 passaram e 1 falhou. A falha estava no meu teste: `recebidoComSha` com
`sha(8).toUpperCase()`, e `sha(8)` só tem dígitos, então a maiúscula era o mesmo texto. Troquei por um hash com letras
(`sha(0xabcdef8)`). O código não mudou.

### Resultado final

- `pnpm test src/modules/pedido-construcao/pendentes.test.ts`: **18 de 18**.
- `pnpm test` (suíte inteira): **270 de 270 arquivos e 5708 de 5708 testes**, 0 falharam, em 165 s. Na 06-T09-testes
  eram 269 arquivos e 5690 testes; entraram 1 arquivo e 18 testes.
- `pnpm typecheck`: limpo. `pnpm lint`: limpo.
- G4: `git diff a9fd9b8 --stat` das superfícies congeladas, com `src/lib/rota.ts`, saiu vazio.

### Desvios do plano

1. **`STATUS_FINAIS` importado de `src/modules/demandas/transicoes.ts`**, e não redeclarado como no esboço do plano
   (`['entregue', 'encerrada'] as const`). A razão é o M-02, que deixa uma fonte única dos status finais, sem segunda
   lista nos serviços. O valor é o mesmo.
2. **`entidade = 'pacote_decisao'` também no `NOT EXISTS` do `pedido_recebido`.** O esboço só tinha `acao` e
   `entidade_id`. Assim as cinco leituras usam o mesmo filtro, e `listarPendentes` concorda com `recebidoComSha` e
   `recebimentoDoPedido`. O teste 15 cobre o recebido sobre outra entidade.
3. **`recebimentoDoPedido` usa `order by ocorrido_em, id limit 1`**, e não `min()`. O resultado é o mesmo, já como
   `Date` pelo mapeamento da coluna, sem conversão à mão.
4. **`shasEntregues` tira repetidos e ordena pela gravação**, e **`recebidoComSha` recusa hash fora do formato sem
   consultar**. São defesas que não mudam o contrato do G7. A T11 usa `includes` e a T12 recebe o hash já validado pelo
   Zod.
5. **Testes além do texto do plano:**
   - pessoa e agente no mesmo DEC;
   - gerar duas vezes;
   - `pedido_gerado` de integração, de sistema e sobre outra entidade;
   - v2 pendente que não substitui;
   - RSK mais novo;
   - nenhum `Seq Scan` em `evento`;
   - a lista exata com volume.

   Só reforçam o IN-10 e o RNF-02.

## Decisões tomadas

- As cinco leituras ficam numa consulta cada, sem laço por DEC. `listarPendentes` reaproveita
  `expressaoSubstituidoPor` e `expressaoDesatualizado`, as mesmas da geração e da vista do DEC. Assim, "pendente" e
  "gera pedido" não divergem nas regras de substituído e desatualizado.
- O estado continua só derivado do histórico (princípio 3 do 02): nenhuma coluna, nenhum `UPDATE`, nenhum privilégio
  novo. O índice que a T10 usa já veio na `0007` (T01).
- Os eventos que nenhum caminho do app grava com aquele ator entram pelo migrator, com o prefixo fictício `ficticio`.
  São o `pedido_gerado` de agente e os eventos do `/construir` antes das rotas da T11 e da T12. Assim o teste não
  depende de token, e nenhum token é gerado (IN-04).
- O teste de volume confere a lista exata contra uma regra escrita à parte em TypeScript, e não contra outra consulta
  SQL. Assim o teste não repete a lógica que testa.
- **Migration:** nenhuma nesta tarefa, então não há volta a escrever. A volta da T10 é apagar os dois arquivos novos.

## Pendências

- Nenhuma bloqueia a T10.
- Para a T11 (`entregar.ts`):
  - chamar `pedidoGeradoPorPessoa(tx, decId)` antes de `conferirEMontarPedido`, na mesma transação;
  - gravar o `pedido_entregue` só se `shasEntregues(tx, decId)` não tiver o hash (P-02).

  As funções recebem `Db`, então servem para `tx`.
- Para a T12 (`receber.ts`): `shasEntregues` (409 sem entrega ou com hash diferente) e `recebidoComSha` (repetição sem
  gravar de novo), sob a trava consultiva por DEC do IN-11.
- Para a T19: `recebimentoDoPedido(db, decId)` dá a data de "Recebido pelo /construir em …", ou `null`.
- Minor, para a `08-revisao` ou um pedido futuro, sem ação agora. Com 200 linhas, as subconsultas de
  `expressaoDesatualizado` e `expressaoSubstituidoPor` leem `parecer_risco`, `especificacao_tecnica` e `decisao` com
  `Seq Scan` por DEC. São expressões que já existiam, fora desta tarefa, e o tempo medido foi de 14 ms. Com muito mais
  DEC, o planejador tende a passar ao índice único `(demanda_id, versao)`. Vale medir de novo o RNF-02 na homologação
  (09-entrega).
- As caixas `- [ ]` da T10 no plano (linhas 1904 a 1966) não foram marcadas, porque a 06 não edita `docs/` (G1). A
  marcação fica com o maestro.
- Glob e Grep não estavam disponíveis nesta sessão. Li tudo com Read e achei os arquivos com `git log` (`-G`,
  `--diff-filter=A`, `--name-only`).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h%x20%s -- docs/construcao/DEC-DEM-20261111-0016-v1` — as passagens e as entregas 06-T01 a 06-T09
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G T10 --format=%h%x20%s --name-only -- docs/construcao/DEC-DEM-20261111-0016-v1` — o 05, a parada P2, a 06-T01 e as três da 06-T09
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261111-0016-v1`, árvore limpa no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%h -G pedido_recebido -- docs/construcao/DEC-DEM-20261111-0016-v1/02-arquiteto-solucoes.md docs/construcao/DEC-DEM-20261111-0016-v1/04-seguranca-aplicacao.md` — `9f07dff`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%h -S IN-10 -- docs/construcao/DEC-DEM-20261111-0016-v1/04-seguranca-aplicacao.md` — `9f07dff`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --diff-filter=A --format= --name-only -- test/estatico src/modules/pedido-construcao src/modules/historico` — os testes estáticos e os arquivos do módulo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pedido-construcao/pendentes.test.ts` — antes do código: falhou, `Cannot find module './pendentes'`, nenhum teste rodou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pedido-construcao/pendentes.test.ts` — depois do código: 17 passaram, 1 falhou (erro no meu teste, o `sha(8)` só com dígitos)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pedido-construcao/pendentes.test.ts` — 18 de 18, com o trecho do `EXPLAIN`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 270 de 270 arquivos, 5708 de 5708 testes, 0 falharam (saída longa lida com Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 --stat -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts 'drizzle/000[0-6]_*.sql' 'drizzle/meta/000[0-6]_snapshot.json' src/lib/rota.ts` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só `pendentes.ts` e `pendentes.test.ts`, novos

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] a migration roda com o papel migrator e tem RLS e guarda quando a tabela tem `tenant_id` (não se aplica: a T10 não tem migration)
- [x] cada migration nova tem, em `## Decisões tomadas`, como desfazê-la (o SQL de volta ou a razão de ser irreversível) (não se aplica: nenhuma migration nova)
- [x] a migration de esquema fica como saiu do `pnpm db:generate`; o SQL que o Drizzle não gera (RLS forçada, política, função de guarda) fica numa migration criada vazia por `pnpm drizzle-kit generate --custom --name rls_<tabela>` e escrita por você; nenhuma migration já commitada foi editada (nenhuma migration criada nem editada)
