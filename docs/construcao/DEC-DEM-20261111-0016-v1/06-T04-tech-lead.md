---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T04-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), tarefas.json, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G8 e T04), 06-T04-engenheiro-backend.md, commit 05fcb85 (git diff 05fcb85~1 05fcb85), src/modules/limites.ts, src/lib/reduzir-erro.ts, src/db/transacao.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T04 (limite por integração e tempo limite das transações de integração; IN-09, IN-14, ADR-24, ADR-28,
D-03), commit `05fcb85`. Nenhum problema Critical ou Important. A tarefa passa para a `06-T04-testes`.

### Escopo (o plano pede, nem mais nem menos)

O commit muda só os cinco arquivos da T04 no plano: `src/modules/limites.ts` e `test/integracoes.ts` (modificados),
`src/modules/integracoes/tempo-limite.ts`, `src/modules/integracoes/tempo-limite.test.ts` e
`src/modules/limites-integracao.test.ts` (criados), além da entrega do engenheiro e da linha do maestro em
`passagens.jsonl`. Todas as interfaces da T04 em G7 existem com a assinatura do plano.

### Inventário do IN-02 (G8)

| # | Função | Conferido |
|---|---|---|
| 17 | `autoriaDoLimite` (`limites.ts:67`) | `switch` com `never`; integração conta como (`integracao`, nome), nunca pelo token ou prefixo; só o sistema fica fora, pelo tipo `Exclude<Ator, AtorSistema>` e pela saída antecipada em `conferirLimite` (`limites.ts:93`) |
| 18 | `limiteDe` (`limites.ts:42`) | `switch` com `never`; integração sem limite para o tipo **lança** `Error` simples (500 genérico, falha fechada do ADR-24), nunca devolve "sem limite"; chave própria por `Object.hasOwn` nos dois níveis, tabela congelada nos três |
| 19 | `limitarTempo` (`tempo-limite.ts:24`) | `switch` com `never`; só integração recebe `SET LOCAL lock_timeout = '2s'` e `statement_timeout` de `5s` ou `10s`; os SET são literais constantes (G3.6) |

### Pontos conferidos

- **IN-09:** awave com 10 demandas por hora e a mensagem do 03/D2; a 11ª dá `limite_excedido` (429) com a mensagem do
  Awave; a janela usa `gt` e o relógio injetado; a trava consultiva é `limite:demanda:integracao:awave`, provada pelo
  teste que segura a trava em outra conexão e vê o 55P03. Pessoa com id de conta "awave" e agente não entram na conta
  da integração (o teste usa 9 do awave, então só passa se as 20 dos outros não forem somadas).
- **IN-14 / ADR-28:** `executarComOrcamento` abre a transação, aplica o orçamento só para integração e traduz 57014 e
  55P03 em `ErroDominio('indisponivel', MENSAGEM_INDISPONIVEL)`, que a `mapearErro` leva a 503 sem texto do Postgres
  (o teste confere o corpo e o `message`). O `ROLLBACK` de `comTransacao` desfaz o INSERT anterior (teste com trava real
  e com `pg_sleep` real). Com a transação de quem chama, não aplica SET nem traduz, como o item 4 do plano.
- **D-03:** texto do 503 igual ao do plano, por inteiro.
- **Reuso:** `traduzirTempoEsgotado` usa `reduzirErro` e `lerCode` de `src/lib/reduzir-erro.ts`, sem ler mensagem;
  `atorDesconhecido` da T02; `inserirDemandaDeIntegracao` usa `NOME_DA_INTEGRACAO` (D-14). Nada duplicado.
- **G3.3 e G3.10:** só dados fictícios ("(fictício)", "Pessoa Ficticia", prefixo `ficticio`); nenhum token, segredo ou
  linha de log nova (teste estático no próprio arquivo).
- **G3.7:** nenhum `new Date()` sem argumento nem `Date.now()` no código; os testes usam `relogioFixo`.
- **G4:** `git diff a9fd9b8` das superfícies congeladas e de `src/lib/rota.ts` saiu vazio.
- **IN-16 / D-17:** `git diff --stat a9fd9b8` dos 16 testes de D-17 mostra só `matriz.test.ts`, `matriz-qa.test.ts` e
  `test/matriz-rotas.test.ts`, que são da T03 (já revisados); o commit da T04 não toca nenhum.
  `src/modules/limites.test.ts` (C-36) continua igual e verde.
- **TDD:** a entrega mostra o comando e a falha (10 de 12 em `limites-integracao.test.ts`, módulo ausente em
  `tempo-limite.test.ts`). Dos dois que passaram antes, um é guarda declarada do que não pode mudar e o outro foi
  reforçado com `/sem limite/`, que agora falha sem o código.

### Desvios do plano (aceitos)

1. `tempo-limite.test.ts:60-69`: o plano esperava `statement_timeout = '0'` para pessoa e agente, mas `criarPool`
   abre a conexão com `statement_timeout: 10_000`. O teste confere `'10s'` e a origem em `pg_settings.source`
   (`session` com SET LOCAL, `client` sem ele), o que prova o SET da entrega mesmo com o valor igual. Razão: o plano
   estava errado sobre o valor de hoje; o teste ficou mais forte, não mais fraco.
2. `tempo-limite.ts:43` (`reduzirErro(e).code ?? lerCode(e)`): necessário para o item 3 do plano, que usa objeto
   simples; `reduzirErro` devolve `desconhecido` para o que não é Error. Usa só funções existentes, sem ler mensagem.
3. `limites.ts:49-53`: `Object.hasOwn` e tabela congelada em vez do `?.` do plano. Razão: fecha chave herdada
   (`__proto__`, `toString`) por regra, com teste.
4. `tempo-limite.test.ts:183-198`: sem a asserção de `sql.raw`, porque o texto casava com a varredura C-17 de
   `test/estatico/varreduras-qa.test.ts`. O próprio plano diz que `sql-raw.test.ts` já cobre; nenhuma asserção de teste
   existente foi tirada (o arquivo é novo).
5. Testes além do plano e um dia próprio por teste que conta: deixam o arquivo independente de ordem (padrão técnico,
   seção 7).

### Achados Minor (não bloqueiam)

- `limites.ts:53` — `if (!l) throw semLimiteDefinido()` é inalcançável depois do `Object.hasOwn` da linha 51, porque a
  tabela é congelada e os valores são objetos. Razão: código morto confunde quem lê; pode ficar como cinto de
  segurança, mas o comentário deveria dizer isso. Não muda comportamento.
- `limites.ts:46` — pessoa e agente recebem um objeto novo e não congelado, a integração recebe o congelado. Razão:
  inconsistência sem efeito hoje (ninguém altera o retorno); se alguém passar a cachear o retorno, a diferença aparece.

## Decisões tomadas

- Status `pronto`: nenhum Critical ou Important; os dois Minor vão para Pendências (seção 12 do padrão técnico).
- Os cinco desvios ficam aceitos: todos reforçam ou corrigem o plano, nenhum afrouxa controle.
- Lançar `Error` simples (500) para integração sem limite está certo: é a falha fechada do ADR-24, e nenhum caminho
  chega lá hoje (a matriz nega `criar_demanda` ao `construir`, e `autoriaDo` recusa integração nas versões).

## Pendências

- Minor `limites.ts:53` e `limites.ts:46` (acima): podem ser ajustados em qualquer tarefa futura que toque o arquivo;
  não pedem volta.
- Para a revisão da T05, T06, T11 e T12: toda rota de integração tem de chamar `executarComOrcamento` **sem** `t` vindo
  de fora (a rota abre a transação por ela), com `'entrega'` só na T11; com `t` de quem chama, o orçamento não é aplicado
  e o 57014/55P03 não vira 503. O `conferirLimite` vai dentro do corpo.
- As caixas `- [ ]` dos passos da T04 no plano não foram marcadas pelo engenheiro (G1 o proíbe de editar `docs/`); a
  marcação fica com o maestro, para o status report.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 05fcb85e7fe5b3eeeb376ac825fd8e0a12d9eb4b~1 05fcb85e7fe5b3eeeb376ac825fd8e0a12d9eb4b` — 7 arquivos: os 5 da T04, a entrega e `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 05fcb85e7fe5b3eeeb376ac825fd8e0a12d9eb4b~1 05fcb85e7fe5b3eeeb376ac825fd8e0a12d9eb4b -- src test` — diff do código lido por inteiro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts 'drizzle/000[0-6]_*.sql' 'drizzle/meta/000[0-6]_snapshot.json' src/lib/rota.ts` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat a9fd9b8 -- src/modules/acesso/matriz.test.ts src/modules/acesso/matriz-qa.test.ts src/modules/acesso/resolver-ator.test.ts src/modules/acesso/resolver-ator-qa.test.ts src/modules/acesso/tokens-servico.test.ts src/modules/acesso/tokens-servico-qa.test.ts src/modules/demandas/servico.test.ts src/modules/historico/registrar.test.ts src/modules/limites.test.ts src/db/privilegios.test.ts src/app/api/vistas-para-agente.test.ts test/matriz-rotas.test.ts test/transversal/sentinelas.test.ts test/estatico/sem-controle-bidi.test.ts test/estatico/sem-recurso-externo.test.ts test/estatico/leituras-da-fila.test.ts` — só os três da T03 (IN-16)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 252 arquivos, 5531 de 5531, código 0 (saída lida com Read)

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
