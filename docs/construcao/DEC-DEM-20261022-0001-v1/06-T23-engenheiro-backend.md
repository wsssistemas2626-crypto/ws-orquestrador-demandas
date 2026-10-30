---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T23-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, parada-PF-T23.md, 06-T22-engenheiro-backend.md, 06-T22-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6, mapa das fases, T23 a T25 e T27), 01-analista-requisitos.md (glossário e RF-11 a RF-20), 02-arquiteto-solucoes.md (seções 4 a 9), 03-ux-ui-design.md (seções 2.1 a 2.8 e T08 a T12), 04-seguranca-aplicacao.md (seções 2.9 a 2.17, 3, 5 e 6), src/db/schema/agentes.ts, src/db/schema/agentes.test.ts, src/db/schema/acesso.ts, src/db/schema/historico.ts, src/db/schema/index.ts, src/db/index.ts, src/db/transacao.ts, drizzle/0005_rls_privilegios_agentes.sql, src/lib/rota.ts, src/lib/erros.ts, src/lib/deps.ts, src/lib/fuso.ts, src/lib/relogio.ts, src/modules/acesso/matriz.ts, src/modules/acesso/ator.ts, src/modules/acesso/ator-pessoa.ts, src/modules/acesso/mensagens.ts, src/modules/historico/registrar.ts, src/modules/historico/consultas.ts, src/modules/demandas/servico.ts (linhas 1 a 80), src/modules/pacotes-decisao/decidir.ts, src/modules/pacotes-decisao/schemas.ts, src/app/api/demandas/route.ts, src/app/api/demandas/[id]/route.ts, src/app/api/pacotes-decisao/[decId]/decisao/route.ts, src/app/api/pacotes-decisao/decisao.test.ts, test/banco.ts, test/deps.ts, test/sessao.ts, test/requisicao.ts, test/sentinelas.ts, test/matriz-rotas.test.ts, test/estatico/relogio.test.ts, eslint.config.mjs, package.json, .prettierrc]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T23: interruptores, teto, preço por modelo e registro de uso. A tarefa cobre:

- RF-17: CA-17.1 e CA-17.3, mais a parte de CA-17.2 que cabe em `registrarUso`;
- RF-18: CA-18.2 e CA-18.4;
- RF-19: CA-19.1 e CA-19.3;
- C-12 (só `cto` liga agente e muda o teto), C-26 e RNF-07 (percentual acima de 100 quando a última chamada passa do
  teto);
- P1-f (USD);
- nas rotas novas, também C-10, C-11, C-15, C-17 e C-21.

### Arquivos (os 11 da lista do plano, nenhum outro)

Todos os arquivos são novos. Nenhum arquivo existente mudou.

- `src/modules/agentes/preco.ts`
  - `PrecoPorMilhao`.
  - `calcularCusto(p, tokensEntrada, tokensSaida)`. A conta é feita em inteiros (`BigInt`):
    - o preço vira milionésimos de dólar por milhão de tokens;
    - tokens × preço dá o custo em 10⁻¹² dólar;
    - o resultado é arredondado, meio para cima, em 6 casas.
    - Recusa com `RangeError`: token negativo, fracionário ou não finito, e preço negativo ou não finito.
  - `precoVigente(db, modelo, em)`: a vigência mais nova até `em`, com o modelo comparado por igualdade. Devolve
    números, ou `null`.
- `src/modules/agentes/teto.ts`
  - `MENSAGENS_TETO`, com os dois textos da 03 (T12).
  - `definirTetoSchema`: `tetoMensal` em texto, aparado, com até 10 dígitos e 2 casas, e vírgula ou ponto. As duas
    mensagens saem como issue `custom`:
    - "O teto não pode ser negativo." para `-` seguido de um valor no formato;
    - "Informe o teto com até duas casas decimais, por exemplo 10,00." para o resto.
  - `SituacaoTeto`.
  - `gastoDoMes(db, relogio)`: soma de `uso_ia.custo` em [início do mês, início do mês seguinte), no fuso de São Paulo.
    É a forma de consulta que o EXPLAIN da T06 já prova sair pelo índice `uso_ia_ocorrido_idx`.
  - `estaSuspenso(gasto, teto)`.
  - `situacaoDoTeto(db, relogio)`.
  - `definirTeto(deps, ator, e, t?)`.
- `src/modules/agentes/configuracao.ts`
  - `ConfiguracaoAgente`, `LIMITE_MODELO = 100`, `alterarAgenteSchema` (o do plano) e `AlterarAgente`.
  - `mensagemNaoLigou(agente)`.
  - `listarConfiguracaoAgentes(db)`, na ordem de `AGENTES`.
  - `obterConfiguracaoAgente(db, agente)`.
  - `alterarAgente(deps, ator, agente, e, t?)`.
- `src/modules/agentes/uso.ts`: `UsoIa` e `registrarUso(tx, u, relogio)`. A gravação é campo a campo, e o custo vai com
  `toFixed(6)`. Token ou custo inválido é recusado com `RangeError`, antes do banco.
- `src/app/api/agentes/route.ts`: `GET`, `rota({ acao: 'ler_configuracao_agentes' })`, que responde 200 com
  `{ agentes }`.
- `src/app/api/agentes/[agente]/route.ts`: `PATCH`, com a ação `alterar_agente`.
  - O parâmetro `z.enum(AGENTES)` dá 404 sem consulta para agente fora da lista.
  - O corpo é `alterarAgenteSchema`, e a resposta é 200 com a `ConfiguracaoAgente`.
- `src/app/api/configuracao/teto/route.ts`
  - `GET` (`ler_teto`), que responde 200 com a `SituacaoTeto`;
  - `PUT` (`alterar_teto`), com o corpo `definirTetoSchema`, que responde 200 com a `SituacaoTeto` nova.
- Testes: `preco.test.ts`, `teto.test.ts`, `configuracao.test.ts` e `src/app/api/agentes/agentes.test.ts`.

As quatro ações já estavam na matriz desde a T10. O `test/matriz-rotas.test.ts` passou a cobrir as três rotas novas
sem mudança no arquivo:

- 403 para cada agente e para a administradora no `PATCH` e no `PUT`;
- 403 sem 2FA e 401 sem credencial;
- 404 com o parâmetro `x`. O exemplo `agente: 'risco'` já existia em `rota.ts`.

### Testes criados

| Arquivo | Testes | O que prova |
|---|---|---|
| `preco.test.ts` | 17 | **Os 3 do plano:** CA-17.1 (0,006), 6 casas (0,00001) e a vigência mais nova até a data. **Arredondamento:** meio milionésimo sobe, menos que isso desce; preço com 6 casas sem erro de ponto flutuante (0,1 e 0,2; 0,123456 e 0,654321 com 1 milhão de tokens); valor no limite do `numeric(12, 6)` sem perder precisão; zero token custa zero. **Recusas:** 4 de token e 2 de preço. **Vigência:** começa no instante exato; antes da primeira e modelo sem preço dão `null`; modelo sem curinga e sem diferença de caixa; o numeric lido vira número e alimenta o custo |
| `teto.test.ts` | 37 | **Os 3 do plano:** CA-18.2 com o corpo do plano; suspenso com gasto ≥ teto e teto 0 sempre suspenso; teto negativo com vírgula ou ponto. **Gasto:** o mês começa à meia-noite de São Paulo, e não à UTC; soma em 6 casas; mês sem chamada. **Situação:** sistema novo; percentual inteiro sem arredondar para cima (99 com 9,999999 de 10) e acima de 100 (RNF-07); dezembro vira em janeiro. **Schema:** 8 formatos aceitos, 13 recusados, campo ausente ou numérico, chave desconhecida descartada (C-11). **Serviço:** quem e quando no banco e no evento (`demanda_id` nulo, `antes` e `depois`); o mesmo valor não grava nem gera evento; a administradora recebe 403 e nada muda (C-12); rollback na transação de quem chama (G3.8) |
| `configuracao.test.ts` | 19 | **CA-19.1:** os quatro desligados na ordem da lista. **Leitura:** quem alterou aparece pelo nome, nunca pelo id; conta inexistente deixa a data e tira o nome. **CA-19.3:** liga e desliga, com dois eventos completos (ator, `demanda_id` nulo, `antes` e `depois`, data do relógio). **Ligar:** usa o modelo gravado quando o corpo não traz modelo. **409 com o texto da 03 e sem evento:** sem modelo, modelo sem preço e preço que só vale no mês seguinte; o modelo futuro liga quando a vigência começa; trocar o modelo de um agente ligado por um sem preço também dá 409. **Textos:** o 409 nomeia cada agente como a 03. **Outros casos:** desligado aceita modelo sem preço; o mesmo estado não grava nem gera evento; cada agente tem o seu interruptor. **Acesso e transação:** a administradora recebe 403 (C-12); rollback (G3.8); duas mudanças simultâneas entram uma depois da outra, e o `antes` de cada evento é o `depois` do anterior. **Schema:** limites e chave desconhecida descartada |
| `agentes.test.ts` | 22 | **Os 6 do plano:** CA-19.1, CA-19.3, o 409, C-12 e C-26, CA-18.4 e CA-17.3. **Rotas:** corpo inválido dá 400 com o campo e sem o valor; C-11 pela rota; agente fora da lista (inclusive `__proto__` e aspas) dá 404 sem consulta nem conexão. **Teto:** `GET` com o JSON exato; `PUT` com "10,00" grava e gera evento; 400 com as mensagens da 03. **Acesso:** C-10 (nenhum agente lê nem liga, o risco inclusive); sem 2FA dá 403 e sem credencial dá 401 nas quatro rotas; C-15 (`Origin` de fora, sem `Origin` e corpo que não é JSON); métodos exportados e `meta` de cada rota. **C-21:** uma linha por requisição, só com o padrão da rota, sem agente, corpo, sentinela nem token. **Uso:** CA-17.3 (o tipo só tem as 8 chaves, por `expectTypeOf`, e chave a mais não chega ao banco); CA-17.2 (`fora_do_schema` e `erro` com zero token na transação de quem chama); 4 recusas antes do banco |

Os testes do plano estão todos presentes, com corpo:

- 3 em `preco.test.ts`;
- 3 em `teto.test.ts`;
- 6 em `agentes.test.ts`.

### TDD: os testes foram escritos antes e vistos falhando

Comando: `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/agentes src/app/api/agentes`.
Rodou antes de qualquer código da tarefa. Trecho da saída:

```
 FAIL  src/modules/agentes/configuracao.test.ts [ src/modules/agentes/configuracao.test.ts ]
Error: Cannot find module './configuracao' imported from .../src/modules/agentes/configuracao.test.ts
 FAIL  src/modules/agentes/preco.test.ts [ src/modules/agentes/preco.test.ts ]
Error: Cannot find module './preco' imported from .../src/modules/agentes/preco.test.ts
 FAIL  src/modules/agentes/teto.test.ts [ src/modules/agentes/teto.test.ts ]
Error: Cannot find module './teto' imported from .../src/modules/agentes/teto.test.ts
 FAIL  src/app/api/agentes/agentes.test.ts [ src/app/api/agentes/agentes.test.ts ]
Error: Cannot find module '../../../modules/agentes/uso' imported from .../src/app/api/agentes/agentes.test.ts
 Test Files  4 failed (4)
      Tests  no tests
```

Na primeira rodada depois do código, 8 de 95 falharam, todos em `configuracao.test.ts`. A causa estava no teste: os
eventos de configuração de um cenário entravam na conta do seguinte. O `beforeEach` passou a apagar esses eventos com
o migrator, e o código não mudou.

### Resultado

- T23 isolada: 4 arquivos, 95 de 95.
- `pnpm test`: 110 arquivos, 2105 de 2105, nenhum falhou.
  - 95 desses testes são dos quatro arquivos novos.
  - O resto do aumento sobre a T22 (1978) vem de dois lugares:
    - os testes da `06-T22-testes`;
    - a matriz, que gera um caso por método de cada `route.ts` novo.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.

### Desvios do plano

1. **`deps: DepsDemanda` e `t?: Transacao` em `alterarAgente` e `definirTeto`.** O plano tem `Deps` e não tem `t`.
   - `DepsDemanda` é o mesmo desvio aceito de T18 a T22: os serviços só usam `db`, `pool` e `relogio`, e quem tem `Deps`
     passa sem mudança.
   - `t?` segue a G3.8: as duas funções gravam.
   - `ator` continua `AtorPessoa`, como no plano. A rota estreita o tipo com `exigirAtorPessoa`, e a primeira linha de
     cada serviço é `autorizar`, que dá 403 à administradora também na chamada direta.
2. **Exportações a mais.**
   - Usadas nos testes, e para a T45 não redigir texto: `MENSAGENS_TETO`, `mensagemNaoLigou`, `LIMITE_MODELO`.
   - Tipos com nome: `PrecoPorMilhao`, `UsoIa`, `AlterarAgente` e `DefinirTeto`. As formas são as do plano.
   - Para a T27: `obterConfiguracaoAgente`, que a resposta do `PATCH` também usa, e `estaSuspenso`, a regra do teto
     num lugar só.
3. **O `GET /api/agentes` responde `{ agentes: [...] }`, e não a lista solta.** O plano não fixa a forma. Com um objeto,
   a resposta pode ganhar campos depois sem quebrar o contrato.

## Decisões tomadas

- **O custo é calculado em inteiros (`BigInt`).** Em ponto flutuante, o arredondamento em 6 casas erra em preço que não
  tem representação binária exata, como 0,1, e perde precisão perto do limite do `numeric(12, 6)`.
- **O mês do gasto é um intervalo fechado no início e aberto no fim: [início, início do mês seguinte).** O plano diz
  "desde o início do mês". Com o fim no próximo mês, a consulta tem a forma que o EXPLAIN da T06 prova usar o índice.
- **Teto 0 é sempre suspenso, pela regra gasto ≥ teto.** É a CA-18.3, sem caso especial.
- **Percentual inteiro, arredondado para baixo e sem limite em 100.**
  - 99,99 % aparece como 99, e não como 100 com os agentes ainda rodando.
  - Passa de 100 quando a última chamada ultrapassa o teto (RNF-07).
  - Com teto 0, o percentual é 0, e a T45 mostra o alerta de teto não definido.
- **`mesReferencia` no formato `AAAA-MM`, e `viraEm` é a meia-noite do dia 1º do mês seguinte em São Paulo.** A T12 usa
  as duas para "Outubro de 2026" e para "o mês virar em 01/11/2026".
- **As mensagens do teto saem como issue `custom` do Zod.** O mapeador de erro (T03) só devolve o texto de issue
  `custom`. Uma mensagem de `regex` viraria "Valor inválido.".
- **O 409 de ligar é a frase inteira da 03, T12:** "Não foi possível ligar o agente de risco. Ele continua desligado.".
  - Os nomes são os da coluna "Ator no histórico" da 03, seção 2.6, em minúscula.
  - O orquestrador fica "o agente orquestrador", e não "o agente de orquestrador".
- **Ligar exige um modelo com preço vigente no instante da mudança.** O modelo é o do corpo ou, sem ele, o já gravado.
  - Vale também para o agente já ligado que troca de modelo: com o novo modelo sem preço, 409, e fica o anterior.
  - Desligado, o modelo pode ser gravado sem preço, porque o preço só é exigido para ligar.
- **A mudança que não muda nada (mesmo estado, mesmo modelo, mesmo teto) não grava nem gera evento.** Assim o PATCH e o
  PUT ficam idempotentes, e o histórico só mostra mudança real ("cada mudança vai ao histórico", RF-19).
- **O evento do agente tem `antes` e `depois` com `ligado` e `modelo`; o do teto, com `tetoMensal` em número.** Os
  dois têm `demandaId: null`, e a entidade é `configuracao_agente` ou `configuracao_ia`. Nenhum desses campos é dado
  de terceiro (C-30).
- **A linha é travada (`FOR UPDATE`) antes de ler o estado atual.** Assim, duas mudanças ao mesmo tempo entram uma
  depois da outra, e o `antes` do evento é sempre o estado que a mudança substituiu. O `GRANT UPDATE` por coluna da
  T06 basta para o `FOR UPDATE` com o papel do app, e o teste de concorrência prova isso.
- **Quem alterou aparece só pelo nome, por junção com `user`.** Quando a conta não existe mais, `atualizadoPor` fica
  nulo e a data fica. O id da conta nunca sai na resposta.
- **O preço não tem rota.** C-26 diz "preço por modelo só por script", e o script é da T33. Nos testes, o preço entra
  pelo migrator.
- **`registrarUso` também recusa token e custo inválidos antes do banco.** O `CHECK` da T06 recusaria do mesmo jeito,
  mas o `RangeError` diz o motivo sem passar pelo Postgres.

## Pendências

- **Comandos de leitura fora da lista Pode, rodados nesta etapa antes de eu usar só o Read.** Não alteraram nada, e
  estão declarados em Comandos executados:
  - um `ls -la` da pasta do pedido;
  - um `grep -n` dos títulos do plano;
  - um `git grep` em `src`, para achar `DepsDemanda` e as junções com `user`.

  O resultado de cada um foi lido de novo por Read, nos arquivos citados em `leu`. Cabe ao maestro liberar como bloqueio
  só de leitura.
- **Para a T45 (`engenheiro-frontend`):**
  - O 409 de ligar já é a frase inteira da 03. A tela mostra o texto como está, sem o prefixo "Não foi possível
    concluir: " da seção 2.8, e volta o interruptor ao estado anterior.
  - Os textos estão em `mensagemNaoLigou` e `MENSAGENS_TETO`. A tela não redige outro.
  - O `PUT` do teto manda `{ tetoMensal: "<texto como digitado>" }`, com vírgula ou ponto.
  - A situação traz `percentual` (inteiro), `suspenso`, `mesReferencia` (`AAAA-MM`) e `viraEm` (ISO). Com
    `tetoMensal: 0`, vale o alerta de teto não definido, e não o percentual.
  - `GET /api/agentes` responde `{ agentes }`. "Nunca alterado" vale quando `atualizadoEm` é nulo.
- **Para a T27:**
  - "Agente desligado ou sem modelo com preço vigente" sai de `obterConfiguracaoAgente` e de `precoVigente(db, modelo,
    relogio.agora())`.
  - "Gasto ≥ teto" sai de `situacaoDoTeto(...).suspenso`, ou de `estaSuspenso` com `gastoDoMes` e o teto.
  - O custo de cada chamada sai de `calcularCusto` com o preço vigente no instante da chamada, e vai para
    `registrarUso`.
- **Para a T33 (script de preço):** o preço entra com até 6 casas, como no `numeric(12, 6)`. O `calcularCusto` assume
  isso ao converter o preço em milionésimos.
- **Itens das revisões anteriores que seguem abertos:** os Minor 1 e 2 da `06-T21-revisao` e o Minor 1 da
  `06-T22-revisao` (o ajudante único de texto vazio, para a 08). Esta tarefa não acrescentou cópia nova.

## Comandos executados

- `ls -la /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261022-0001-v1` — arquivos da pasta do pedido (fora da lista Pode, só leitura; ver Pendências)
- `grep -n "^### \|^## \|^#### " /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/superpowers/plans/2026-10-25-ws-orquestrador-demandas-plano.md` — linhas dos títulos do plano (fora da lista Pode, só leitura; ver Pendências)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -15` — último commit 7b68d76 (PF-T23 fabiano)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h%x20%s --diff-filter=A` — arquivos criados em cada commit do ramo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "DepsDemanda =\|user.name\|leftJoin(user" -- src` — onde ficam `DepsDemanda` e as junções com `user` (fora da lista Pode, só leitura; ver Pendências)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/agentes src/app/api/agentes` — antes do código: os 4 arquivos falharam (módulos ausentes)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/agentes src/app/api/agentes` — 87 de 95; 8 falharam em `configuracao.test.ts` (eventos de um cenário na conta do seguinte, corrigido no teste)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/agentes src/app/api/agentes` — 95 de 95
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 2105 de 2105, 110 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 11 arquivos novos, os da lista do plano, nenhum modificado

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
