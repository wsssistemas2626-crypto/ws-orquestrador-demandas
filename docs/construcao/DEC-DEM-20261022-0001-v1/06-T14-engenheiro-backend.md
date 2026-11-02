---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T14-construcao
agente: engenheiro-backend
leu: [contrato-passagem.md, pedido.json, padrao-tecnico.md, tarefas.json, 05-tech-lead.md, 06-T12-engenheiro-backend.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e mapa das fases e fim da T13 e T14 e início da T15 e regras da T21), src/db/index.ts, src/db/transacao.ts, src/db/privilegios.ts, src/db/schema/index.ts, src/db/schema/comum.ts, src/db/schema/demandas.ts, src/db/schema/versoes.ts, src/db/schema/decisao.ts, src/lib/erros.ts, src/lib/reduzir-erro.ts, src/lib/log.ts, src/lib/relogio.ts, src/lib/fuso.ts, src/lib/rota.ts, src/lib/deps.ts, src/modules/historico/registrar.test.ts, src/modules/historico/consultas.ts, src/modules/historico/consultas.test.ts, test/banco.ts, vitest.config.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T14: gerador de id, número de versão e trava da demanda. Cobre RF-04 (CA-04.1 a CA-04.4), RNF-09 e C-36. Pela C-36,
o `nextval` só roda depois da validação, dentro da transação. Aqui isso fica no contrato da função; quem garante a
ordem é o chamador, a T15.

### Arquivos

Os quatro arquivos são novos e são os que o plano lista. Nenhum arquivo já existente mudou.

- `src/modules/demandas/gerar-id.ts`. Tem:
  - `RE_ID_DEMANDA` e `LIMITE_AVISO_CAPACIDADE = 9000`;
  - `proximoIdDemanda(tx, relogio)`. Faz `nextval('demanda_seq')` pelo template `sql`, sem `sql.raw`, e monta o id com
    a data de `aaaammddSaoPaulo(relogio.agora())`, com 4 dígitos. O erro `2200H`, lido por `reduzirErro`, vira
    `ErroDominio('capacidade_de_ids_esgotada', ...)` (409) com a mensagem do plano. Qualquer outro erro sobe como veio
    e vira 500 no `mapearErro`;
  - `totalDeDemandas(db)`, que devolve número.
- `src/modules/versoes.ts`. Tem:
  - `RE_ID_VERSAO`;
  - `idVersao(prefixo, demandaId, versao)`;
  - o tipo `TabelaVersionada`;
  - `travarDemanda(tx, demandaId)`: `select ... for update` na linha da demanda. Devolve a linha. Se a demanda não
    existe, lança `ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO)`;
  - `proximaVersao(tx, tabela, demandaId)`: `max(versao) + 1` só da demanda pedida, ou 1 quando ainda não há versão.
- `src/modules/demandas/gerar-id.test.ts`: 22 testes, de integração (Postgres real, papel do app) e unitários. Cobrem:
  - CA-04.1, inclusive a virada do dia em São Paulo;
  - CA-04.2;
  - os zeros à esquerda até 9999;
  - CA-04.4: erro claro e nada gravado na transação que ia inserir a demanda;
  - o 409 sem detalhe do Postgres no corpo;
  - o erro de banco que não é o de capacidade, que continua 500;
  - a regex: o que aceita, o que recusa, e a igualdade com a regex de `rota()`;
  - `LIMITE_AVISO_CAPACIDADE` e `totalDeDemandas`.
- `src/modules/versoes.test.ts`: 33 testes. Cobrem:
  - `travarDemanda`: devolve a linha; dá 404 para id inexistente; segura a demanda até o fim da transação; não segura
    demanda diferente;
  - `proximaVersao`: 1 nas três tabelas; 3 com v1 e v2; só as versões da própria demanda; vem depois da maior versão,
    e não da contagem; devolve número;
  - CA-04.3, de quatro formas. Primeiro, a ordem forçada: a segunda transação fica esperando a trava, conferido em
    `pg_stat_activity`, e fica com v2. Depois, duas criações em paralelo, e cinco em paralelo. Por último, sem a trava,
    a restrição única recusa a versão repetida com `23505`, que é a segunda barreira;
  - a transação desfeita não deixa versão gravada;
  - `idVersao` e o `CHECK` do id derivado no banco;
  - `RE_ID_VERSAO`, que aceita as mesmas formas que as três regex de `rota()`.

Os testes de concorrência não dependem do relógio. A ordem vem de promessas, e a espera pela trava é vista em
`pg_stat_activity`. A suíte rodou duas vezes depois da implementação, verde nas duas.

### TDD: teste antes, visto falhando

Os dois arquivos de teste foram escritos antes do código. O `pnpm test` falhou porque os módulos não existiam:

```
 FAIL  src/modules/versoes.test.ts [ src/modules/versoes.test.ts ]
Error: Cannot find module './versoes' imported from .../src/modules/versoes.test.ts
 FAIL  src/modules/demandas/gerar-id.test.ts [ src/modules/demandas/gerar-id.test.ts ]
Error: Cannot find module './gerar-id' imported from .../src/modules/demandas/gerar-id.test.ts
 Test Files  2 failed | 72 passed (74)
      Tests  1128 passed (1128)
```

Depois da implementação: `Test Files 74 passed (74)` e `Tests 1183 passed (1183)`. São 55 testes novos, 0 falhas.

### Desvios do plano

1. **`RE_ID_DEMANDA` repete a regex que já existe em `src/lib/rota.ts`.** O plano manda a T14 exportar essa regex, e
   `rota.ts` (T11) já tem a dela. Importar `rota.ts` no módulo de domínio faria o domínio, e o worker que usar
   `proximoIdDemanda`, depender do adaptador HTTP e, por ele, do Better Auth. Mudar `rota.ts` sai dos arquivos da
   tarefa. Por isso a regex ficou repetida. Um teste confere que as duas têm a mesma `source` e as mesmas `flags`, e
   que `RE_ID_VERSAO` aceita as mesmas formas que as três regex por prefixo de `rota()`. Se as duas se afastarem, o
   teste quebra.
2. **`PrefixoVersao` vem de `src/lib/rota.ts` só como tipo** (`import type`), para não repetir o tipo. Em execução,
   não carrega nada de `rota.ts`. A assinatura é a do plano: `'ESP' | 'RSK' | 'DEC'`.
3. **`proximaVersao` usa `max()` do Drizzle e faz o `?? 0` no código**, no lugar do `coalesce(max(versao), 0) + 1`
   escrito em SQL. O resultado é o mesmo. Assim, a união das três tabelas tipa sem cast, e o `max` de coluna `integer`
   já volta como número.
4. **`proximoIdDemanda` sem o `!`.** O código do plano usa `r.rows[0]!.n`. Aqui, linha ausente lança `Error`, que
   vira 500 genérico. Isso não deve acontecer: `select nextval` sempre devolve uma linha.
5. **Testes além dos do plano:** a virada do dia em São Paulo; o 409 sem detalhe interno; o erro que não é de
   capacidade; a trava que segura e a que não segura; a segunda barreira (`23505`); a transação desfeita; e a
   igualdade com as regex de `rota()`.

## Decisões tomadas

- **Só o código `2200H` vira `capacidade_de_ids_esgotada`.** Outro erro, inclusive o `25P02` de transação já
  abortada, sobe como veio, para não esconder falha real atrás de "limite atingido".
- **A trava fica na linha da demanda (`FOR UPDATE`), e não numa trava consultiva.** É a mesma linha que a T21 trava
  para fechar a corrida com ESP ou RSK nova (C-13). O papel do app tem `UPDATE` em colunas de `demanda`, que basta
  para o `FOR UPDATE`, e o teste com o papel do app prova isso.
- **`travarDemanda` não confere o formato do id.** Isso é papel de `rota()` (G3.10). A consulta é parametrizada.
- **`totalDeDemandas` recebe `Db`**, como no plano. Serve tanto ao pool quanto à transação.

## Pendências

- **T15:** chamar `proximoIdDemanda` só depois do Zod e de `conferirLimite`, dentro da transação que insere a demanda
  (C-36). O buraco na sequência quando a transação é desfeita é esperado: o `nextval` não volta.
- **T18 a T20:** passada a versão 9999 de uma demanda, `proximaVersao` devolve 10000. O `CHECK` `versao between 1 and
  9999` recusa a gravação com `23514`, que vira 500 genérico. O plano não traz código nem mensagem para esse caso. Se
  o tech-lead quiser um erro de domínio, ele entra na T18 ou na revisão.
- **Revisão (`06-T14-revisao`):** julgar o desvio 1. Uma saída sem repetir a regex é fazer `rota.ts` importar
  `RE_ID_DEMANDA` do domínio, numa tarefa que possa editar esse arquivo (T16, por exemplo).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -20` — último commit dd783ad (PF-T14 fabiano)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --stat -3` — arquivos dos três últimos commits
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --stat -1 e98dfcf` — arquivos da T12, para achar o histórico
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --stat -1 9caf56c` — arquivos da T11, para achar `rota.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --stat -1 53c6491` — arquivos da T13, testes estáticos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — antes do código: 2 arquivos falharam (`Cannot find module './versoes'` e `'./gerar-id'`); 1128 de 1128 testes dos outros arquivos passaram
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — depois do código: 74 de 74 arquivos, 1183 de 1183 testes, 0 falhas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — segunda rodada, para ver se a concorrência é estável: 74 de 74 arquivos, 1183 de 1183 testes, 0 falhas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — só arquivos novos: `src/modules/demandas/`, `src/modules/versoes.ts` e `src/modules/versoes.test.ts`

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (a T14 não cria rota, Server Action nem job; o erro de capacidade sai como 409 sem detalhe do Postgres, e há teste disso)
