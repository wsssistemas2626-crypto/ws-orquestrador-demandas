---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T01-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 01-analista-requisitos.md, 04-seguranca-aplicacao.md (IN-03, IN-05, IN-12, IN-17), 05-tech-lead.md, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G8 e T01), 06-T01-engenheiro-dados-bd.md, 06-T01-tech-lead.md, commit 3de5e63 (git diff 3de5e63~1 3de5e63), src/db/schema/acesso.ts, src/db/schema/agentes.ts, src/db/schema/demandas.ts, src/db/schema/historico.ts, src/db/schema/index.ts, src/db/schema/dominio.test.ts, src/modules/acesso/tokens-servico.ts, drizzle/0001_rls_privilegios_acesso.sql, drizzle/0005_rls_privilegios_agentes.sql, scripts/migrate.ts, scripts/migrate.test.ts, test/banco.ts, test/setup-global.ts, vitest.config.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T01 (esquema e migration `0007`, aditiva), commit `3de5e6318ca8ab57ab7aef549de49fef0e53bca0`. O código
passa em todos os testes, os do engenheiro e os acrescentados aqui. Não há motivo para devolver. Os dois Minor de teste
da revisão (1 e 2) ficaram cobertos.

### Critérios da tarefa e os testes que os cobrem

| Critério (T01: "Cobre") | Teste (arquivo › nome) |
|---|---|
| RNF-06: migration só aditiva, sem coluna removida nem dado alterado | `test/estatico/migration-0007.test.ts` › "a 0007 é a última e a única nova" e "a 0007 não apaga, renomeia, reescreve nem troca tipo de nada" (engenheiro); **novo** `test/migracao/migration-0007-dados.test.ts` › "nenhuma linha que existia muda: tokens, eventos, demandas e configuração dos agentes (CA-11.2)", "os tokens de hoje ficam com integracao nula e o agente preenchido", "os CHECK novos e os recriados valem para as linhas de hoje (validados, sem NOT VALID)", "agente fica anulável e integracao entra anulável, sem padrão (a migration não preenche dado)" |
| IN-03 (CHECK): dono único do token, integração só da lista | `src/db/schema/integracao.test.ts` › "aceita token de integração com agente nulo, para awave e construir", "recusa os dois donos nulos e os dois preenchidos", "recusa integração fora da lista"; **novo** `src/db/schema/integracao-qa.test.ts` › bloco "token_servico: as linhas de hoje e o dono único (ADR-21, IN-03)" (7 testes) e bloco "validarTokenServico diante da linha de integração (Minor 1 da revisão)" (3 testes) |
| IN-05 (CHECK): só o awave é autor de demanda por integração, sempre como rascunho | `integracao.test.ts` › "aceita autoria do awave como rascunho", "recusa construir como autor e awave sem rascunho"; `src/db/schema/dominio.test.ts` › "demanda_autor_tipo_check" (com `AUTORES_DEMANDA`); **novo** `integracao-qa.test.ts` › bloco "demanda: autoria de integração (IN-05, ADR-24)" (7 testes) |
| IN-12 (CHECK): evento de integração com nome da lista e prefixo | `integracao.test.ts` › "aceita ator integracao da lista com prefixo", "recusa integração sem prefixo ou fora da lista"; **novo** `integracao-qa.test.ts` › bloco "evento: CHECK de integração amarrado a INTEGRACOES (IN-12)" (10 testes) |
| IN-17: sem privilégio novo, nenhuma migration da main editada | `integracao.test.ts` › "IN-17: o papel do app não muda a integração de um token"; `migration-0007.test.ts` (sem `GRANT`); `src/db/privilegios.test.ts` sem diff e verde; **novo** `integracao-qa.test.ts` › "o app não muda o dono de um token: nem agente nem integração (IN-17)" e "o app não troca a autoria nem o rascunho de uma demanda (C-11, privilégios sem diff)"; **novo** `migration-0007-dados.test.ts` › "nenhum privilégio novo: o UPDATE do app em token_servico continua só em revogado_em". Migrations `0000` a `0006` sem diff desde a9fd9b8 (G4, conferido na revisão; o meu `git diff --stat` do ramo saiu vazio) |
| ADR-21: `agente` anulável e `integracao` nova em `token_servico` | `integracao.test.ts` (bloco token_servico); **novo** `migration-0007-dados.test.ts` › "agente fica anulável e integracao entra anulável…" |
| ADR-24: lista própria de autores da demanda; ESP, RSK e DEC sem integração | `integracao.test.ts` › "as versões continuam só com pessoa e agente"; `dominio.test.ts` › "demanda_autor_tipo_check", "especificacao_tecnica_autor_tipo_check", "parecer_risco_autor_tipo_check", "pacote_decisao_autor_tipo_check"; **novo** `integracao-qa.test.ts` › "AUTORES_DEMANDA tem integracao e o CHECK da demanda é essa lista" |
| ADR-27: índice `evento_acao_entidade_idx` em `(acao, entidade_id)` | `integracao.test.ts` › "ADR-27: o índice evento_acao_entidade_idx existe em (acao, entidade_id)"; **novo** `migration-0007-dados.test.ts` › "restrições, índices e colunas de token_servico, evento e demanda iguais aos do banco de teste padrão" |
| CA-11.2: `configuracao_agente` com as mesmas quatro linhas depois da migration | `integracao.test.ts` › "CA-11.2: configuracao_agente continua com as quatro linhas"; **novo** `migration-0007-dados.test.ts` › "nenhuma linha que existia muda…" (a foto de `configuracao_agente` antes e depois da `0007` é igual) |

### Testes acrescentados (34, em 2 arquivos novos)

1. `src/db/schema/integracao-qa.test.ts` (27 testes, Postgres real, papel do app):
   - **evento (Minor 2 da revisão):** os literais de `evento_ator_integracao_check` são exatamente `INTEGRACOES`;
     `evento_ator_tipo_check` tem os quatro tipos; evento aceito para **cada** integração com prefixo (inclusive
     `construir`, que faltava) e lido de volta; recusado sem prefixo para cada uma; nome de agente como integração
     recusado; pessoa, agente e sistema continuam sem prefixo obrigatório (regressão); tipo fora da lista recusado; o
     app não altera evento de integração (C-34).
   - **demanda (Minor 2):** os literais de `demanda_autor_integracao_check` são só `awave`, que está em
     `INTEGRACOES`; o CHECK de `autor_tipo` é `AUTORES_DEMANDA`; toda integração que não é `awave` e `jarvis` recusadas
     como autoras; pessoa e agente aceitos com e sem rascunho (regressão); `sistema` continua fora; o app não troca
     `autor_tipo`, `autor_id` nem `rascunho_agente` (42501).
   - **token_servico:** token de cada agente sem integração continua aceito; agente fora da lista e nome de integração
     no lugar de agente recusados por `token_servico_agente_check`, que continua igual a `AGENTES`; nome de agente no
     lugar de integração recusado; hash único entre token de agente e de integração (23505); o app não muda `agente` nem
     `integracao` (42501).
   - **validarTokenServico (Minor 1 da revisão):** token de cada integração, gerado em tempo de teste e gravado só pelo
     SHA-256, nunca resolve como agente; token de agente gravado do mesmo jeito continua resolvendo como o agente, com o
     prefixo. A asserção é "não é agente", e não "é null": vale hoje (null, 401) e continua valendo depois da T03 (ator
     de integração), sem que a T03 precise mexer neste teste.
2. `test/migracao/migration-0007-dados.test.ts` (7 testes): cria um banco vazio, aplica as migrations `0000` a `0006`
   numa transação, grava linhas fictícias no formato da 0.2.0 (dois tokens de agente, um revogado; eventos de pessoa,
   agente e sistema; demandas de pessoa e de agente em rascunho), fotografa `token_servico`, `evento`, `demanda` e
   `configuracao_agente`, aplica a `0007` e confere: as fotos são iguais (nenhuma linha mudou), os tokens ficam com
   `integracao` nula, os seis CHECK novos ou recriados estão validados (passaram pelas linhas existentes, sem
   `NOT VALID`), as colunas novas não têm padrão, o UPDATE do app em `token_servico` continua só em `revogado_em`, e
   restrições, índices e colunas das três tabelas saem iguais aos do banco migrado pelo migrator do Drizzle (o que
   prova que a reaplicação manual é fiel). Um teste confere que a foto de antes não é vazia, para a comparação não
   passar à toa.

Os testes novos não dependem de ordem (cada caso usa id, hash e prefixo próprios) nem do relógio real (datas literais;
nenhum `Date.now()` nem `new Date()`). Nenhum token, segredo ou valor de `.env`: hashes são números em hexadecimal ou
`'a'.repeat(64)`, prefixos `abcd1234`, `efgh5678` e `ficticio`, nomes "Pessoa Ficticia", títulos "(fictício)"; o token
do bloco `validarTokenServico` nasce de `randomBytes` em tempo de teste e não vai a mensagem de `expect`.

### Resultado

- `pnpm test`: 238 arquivos, **5297 de 5297** passaram (antes: 236 arquivos e 5263; +2 arquivos e +34 testes).
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git diff --stat` do ramo: vazio (nenhum arquivo rastreado alterado; só os 2 arquivos novos). `git diff a9fd9b8
  --stat` dos 16 testes de segurança da D-17: vazio. Em 3de5e63, o único teste existente tocado foi
  `src/db/schema/dominio.test.ts`: troca da lista de referência de `demanda_autor_tipo_check` e uma linha a mais,
  sem asserção a menos, sem `.skip`, `.only` nem `.todo`.

## Decisões tomadas

- Arquivos novos (`integracao-qa.test.ts`, `test/migracao/`) em vez de editar `integracao.test.ts`: o teste do
  engenheiro fica como o plano o escreveu, e a convenção `-qa.test.ts` do repositório marca o que é desta etapa.
- Teste de migration sobre dado existente no Vitest: o `alteram_dado = false` só seria visto na 09; aqui a mesma prova
  roda a cada `pnpm test`, contra a `0007` real, sem arquivo temporário (os SQL são lidos do `drizzle/` e aplicados
  por comando).
- Reaplicação das migrations por comando, conferida contra o banco do migrator: o `migrate()` do Drizzle só aplica a
  pasta inteira; parar na `0006` exigiria uma pasta temporária. O teste de igualdade de esquema cobre a diferença.
- Banco do teste de migration com `pg.Client` e `drop database` sem `force`: a primeira versão, com `Pool` e
  `with (force)`, derrubou uma conexão ainda fechando e gerou erro não tratado no Vitest; com o cliente fechado antes
  do `drop`, não há conexão viva para derrubar.
- Minor 1 testado por "não resolve como agente": a T03 muda o retorno para o ator de integração; um teste que exigisse
  `null` teria de ser afrouxado lá, fora do G5.

## Pendências

- Nenhuma bloqueia a passagem.
- Para a T03: o teste positivo de `validarTokenServico` com linha de integração (devolve `AtorIntegracao` com o
  prefixo) e o de linha com agente fora da lista (inserida pelo migrator, com o CHECK desligado só no teste) continuam
  com o engenheiro, como o Minor 1 da revisão pede.
- Para a 09: o ensaio de rollback (`alteram_dado = false`) e o seed com dado de integração (IN-17) continuam lá; o
  teste novo cobre só o caminho de ida da `0007` com dado da 0.2.0.
- A primeira execução dos 2 arquivos novos falhou por erro meu no teste (prefixo fixo no ajudante e o fechamento do
  `Pool`), corrigido antes da suíte inteira; não houve falha do código da T01.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261111-0016-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -5` — HEAD em 2de518d (revisão da T01), construção em 3de5e63
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 3de5e6318ca8ab57ab7aef549de49fef0e53bca0~1 3de5e6318ca8ab57ab7aef549de49fef0e53bca0` — 12 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 3de5e6318ca8ab57ab7aef549de49fef0e53bca0~1 3de5e6318ca8ab57ab7aef549de49fef0e53bca0 -- src test drizzle/0007_greedy_wendigo.sql drizzle/meta/_journal.json` — diff do código e dos testes da T01
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/db/schema/integracao-qa.test.ts test/migracao/migration-0007-dados.test.ts` — 33 de 34, 1 falhou (prefixo fixo no ajudante do teste) e 1 erro não tratado (fechamento do `Pool`); erros do teste, corrigidos
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/db/schema/integracao-qa.test.ts test/migracao/migration-0007-dados.test.ts` — 34 de 34
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 238 arquivos, 5297 de 5297
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só os 2 arquivos novos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 --stat -- src/modules/acesso/matriz.test.ts src/modules/acesso/matriz-qa.test.ts src/modules/acesso/resolver-ator.test.ts src/modules/acesso/resolver-ator-qa.test.ts src/modules/acesso/tokens-servico.test.ts src/modules/acesso/tokens-servico-qa.test.ts src/modules/demandas/servico.test.ts src/modules/historico/registrar.test.ts src/modules/limites.test.ts src/db/privilegios.test.ts src/app/api/vistas-para-agente.test.ts test/matriz-rotas.test.ts test/transversal/sentinelas.test.ts test/estatico/sem-controle-bidi.test.ts test/estatico/sem-recurso-externo.test.ts test/estatico/leituras-da-fila.test.ts` — vazio (IN-16)

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
