---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T23-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md, 2026-10-25-ws-orquestrador-demandas-plano.md (cabeçalho, G1, T22 a T25, T43 a T45 e Rastreabilidade), 05-tech-lead.md, parada-PF-T23.md, 06-T23-engenheiro-backend.md, 06-T22-tech-lead.md, git show 9818216, git show 63faf6c, git diff 7b68d76..63faf6c, 03-ux-ui-design.md (seção 1, T10 a T12), src/db/schema/agentes.ts, src/db/schema/historico.ts, src/modules/historico/registrar.ts, src/modules/historico/consultas.ts, src/modules/acesso/matriz.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T23 (interruptores, teto, preço por modelo e registro de uso), intervalo `7b68d76..63faf6c`. O código e os
testes estão no `9818216`; o `9d9ca9a` e o `63faf6c` só mexem no registro e na entrega. **Nenhum problema Critical ou
Important.** A passagem segue para a `06-T23-testes`. Os cinco pontos Minor estão nos Pareceres e em Pendências.

### Conferência contra o plano

| Item do plano | Situação |
|---|---|
| Arquivos | Os 11 da lista, todos novos. Nenhum arquivo existente mudou (`git show --stat` dos três commits) |
| Interfaces | Batem com o plano. `alterarAgenteSchema` é o do plano, sem mudança. Os três desvios declarados na entrega estão aceitos (ver Decisões) |
| `definirTetoSchema` | Mesma expressão do plano (`^\d{1,10}([.,]\d{1,2})?$`, que cabe no `numeric(12, 2)`), com `trim` e `superRefine`. A troca de `regex` por issue `custom` é necessária: o mapeador da T03 só devolve o texto de issue `custom`, e o teste da rota prova as duas mensagens da 03 no 400 |
| Textos da 03 (T12) | "Informe o teto com até duas casas decimais, por exemplo 10,00.", "O teto não pode ser negativo." e "Não foi possível ligar o agente de risco. Ele continua desligado." estão iguais aos da 03. Os nomes de agente seguem a tabela da T12 |
| Passo 3 | Eventos com `demandaId: null`; `atualizado_por` e `ator_id` vêm de `ator.usuarioId`, nunca do corpo (C-11, testado na rota e no schema) |
| Matriz | `ler_configuracao_agentes` e `ler_teto` para qualquer pessoa sem agente; `alterar_agente` e `alterar_teto` só `cto` (C-10, C-12). `autorizar` é a primeira linha dos dois serviços, então a chamada direta também nega |
| G3.8 | `t?` nos dois serviços que gravam, com teste de rollback em cada um |
| RNF-15 | Relógio fixo em todos os testes. O mês é o civil de São Paulo, por `inicioDoMesSaoPaulo` e `inicioDoProximoMesSaoPaulo`, que já existiam desde a T01 |
| Rotas | Adaptadores finos sobre `rota()`. O parâmetro `z.enum(AGENTES)` dá 404 sem consulta nem conexão, inclusive para `__proto__` e aspas (C-17) |

### Cobertura dos critérios e controles

- **CA-17.1:** `calcularCusto` com o caso do plano (0,006) e o arredondamento em 6 casas. A conta em `BigInt` evita o
  erro de ponto flutuante, e há teste com 0,1 e 0,2 e com o limite do `numeric(12, 6)`.
- **CA-17.2 (parte da T23):** `fora_do_schema` e `erro` com zero token entram na transação de quem chama.
- **CA-17.3:** `expectTypeOf` prova que o tipo tem só as 8 chaves. A gravação é campo a campo, e chave a mais com
  sentinela não chega ao banco.
- **CA-18.2:** o caso do plano, mais a virada à meia-noite de São Paulo e não à UTC, e dezembro para janeiro.
- **CA-18.4:** os quatro tokens de agente recebem 403 no `PUT` do teto, e nada muda.
- **CA-19.1:** os quatro desligados, na ordem de `AGENTES`, pela função e pela rota.
- **CA-19.3:** ligar e desligar o risco, com os dois eventos completos (ator, data, `antes`, `depois`, `demanda_id`
  nulo). A lista mostra quem alterou pelo nome, sem o id.
- **RNF-07:** o percentual passa de 100 (120 no teste) quando a última chamada ultrapassa o teto. O arredondamento é
  para baixo, então 9,999999 de 10 dá 99, e não 100 com os agentes rodando.
- **C-12 e C-26:** a administradora recebe 403 na função e na rota, e nada muda. O preço não tem rota, só script (T33).
- **C-15:** `Origin` de fora e ausência de `Origin` dão 403; corpo que não é JSON dá 415.
- **C-21:** uma linha por requisição, só com o padrão da rota, sem agente, corpo, modelo, sentinela nem token.
- **Concorrência:** com o `FOR UPDATE`, duas mudanças simultâneas entram uma depois da outra, e o `antes` de cada
  evento é o `depois` do anterior. O teste prova também que o `GRANT UPDATE` por coluna da T06 basta para o
  `FOR UPDATE` com o papel do app.

Os testes falhariam sem o código: os quatro arquivos falharam por módulo ausente, com o trecho na entrega. Os testes de
comportamento conferem valores exatos: textos, JSON inteiro, linhas do banco e contagem de eventos.

### Verificação própria

- `pnpm test`: 110 arquivos, 2105 de 2105.
- `pnpm lint` e `pnpm typecheck` limpos.
- `git log -S` confirma que `inicioDoProximoMesSaoPaulo` já existia desde a T01 e foi reaproveitada. `isSafeInteger`
  só aparece neste commit, nas duas cópias apontadas no Minor 3.
- A saída do `pnpm test` traz o aviso do undici "Using `patch`". Não conferi de onde ele vem: `test/requisicao.ts` não
  foi lido nesta revisão. O código da T23 exporta `PATCH` em maiúsculas, e o teste de métodos prova isso. O aviso não
  derruba nenhum teste. Fica para a `06-T23-testes` olhar se o ajudante manda o método em minúsculas.

### Checklist da seção 12

- [x] Faz o que o plano pede, nem mais nem menos. Os arquivos fora da tarefa não mudaram.
- [x] Há teste para cada comportamento novo, e ele falharia sem o código.
- [x] Não há segredo, valor de `.env` nem dado pessoal real. Os dados são fictícios: domínio `.test`, "Pessoa
      Ficticia", `modelo-ficticio` e `SENTINELAS`.
- [x] Entrada externa validada pelo Zod (`alterarAgenteSchema`, `definirTetoSchema`, `z.enum(AGENTES)`), e o erro não
      vaza detalhe: o 400 não cita o valor recebido (testado com sentinela).
- [x] Banco: não se aplica (sem migration nem tabela nova). O `FOR UPDATE` usa o privilégio que a T06 já dá.
- [x] Nenhuma função nova repete uma que já existe no repositório. Dentro da própria tarefa há uma validação de tokens
      repetida em dois arquivos (Minor 3).
- [x] Textos em pt-BR. A tarefa não tem tela, então o axe não se aplica.
- [x] Os Minor estão em Pendências. Não há Critical nem Important.
- [x] PR (`/code-review`, `/security-review`): não se aplica a esta etapa, fica com a `08-revisao`.

### Pareceres (todos Minor; não bloqueiam)

| # | Arquivo:linha | Problema | Razão |
|---|---|---|---|
| 1 | `src/modules/agentes/configuracao.ts:109` | O 409 de um agente **já ligado** que troca para um modelo sem preço diz "Ele continua desligado.", mas o agente continua ligado, com o modelo anterior. O teste `ligado, trocar o modelo por um sem preço → 409` confere o código, mas não o texto | A mensagem afirma um estado falso. A 03 só tem texto para a falha ao ligar, e a tela da T12 não troca modelo de agente ligado. Por isso o caso só acontece por chamada direta à API, e não bloqueia. Correção sugerida para a 08: quando `atual.ligado` for verdadeiro, usar um texto próprio no molde da 2.8 (por exemplo, "Não foi possível trocar o modelo do agente de risco. Ele continua ligado com o modelo anterior.") e registrar o texto novo |
| 2 | `src/modules/agentes/configuracao.ts:124` | Uma troca só de modelo grava `agente_ligado` (se o agente está ligado) ou `agente_desligado` (se está desligado), mesmo sem mudança no interruptor | A ação do evento passa a dizer o estado final, e não o que mudou. O `antes` e o `depois` estão corretos, e `AcaoEvento` não tem `modelo_alterado`, então o código segue o plano ("evento agente_ligado\|agente_desligado"). Quem mostrar esses eventos (hoje nenhuma tela, porque `listarHistorico` filtra por demanda) deve comparar `antes.ligado` com `depois.ligado` antes de escrever "ligou" ou "desligou" |
| 3 | `src/modules/agentes/uso.ts:24` e `src/modules/agentes/preco.ts:16` | A regra "tokens inteiros não negativos" (`Number.isSafeInteger(n) && n >= 0`, com `RangeError`) está escrita duas vezes, em `conferir` e em `tokensValidos` | Se uma cópia mudar, por exemplo para o limite do `integer` do Postgres (2³¹ − 1), `calcularCusto` e `registrarUso` passam a discordar sobre o mesmo número. Vai para a 08, num ajudante único exportado por `preco.ts`, junto com o ajudante de texto vazio já aberto |
| 4 | `src/modules/agentes/configuracao.ts:21` (`modelo`) | O nome do modelo é texto livre de 1 a 100 caracteres. Desligado, ele é gravado sem conferência contra `preco_modelo` e vai inteiro para o `depois` do evento | O histórico segue a lista de permissão (C-30, `registrar.ts`): só guarda valor de enumeração. O modelo é quase uma enumeração, mas aceita qualquer texto. Não é dado de terceiro, porque só o CTO escreve. Uma lista de permissão de formato (por exemplo `^[A-Za-z0-9._:-]{1,100}$`) fecharia o campo sem mudar nenhum caso legítimo. A decisão fica com a `seguranca-aplicacao` na `08-revisao` |
| 5 | `src/modules/agentes/teto.ts:78` | `situacaoDoTeto` lê o teto e o gasto em duas consultas separadas, fora de transação quando chamada pela rota `GET` | Entre as duas, uma chamada pode entrar no `uso_ia`, e a resposta mistura dois instantes. O efeito é só na exibição (o percentual de uma leitura) e se corrige na próxima. A conferência que vale antes de cada chamada é da T27 (C-26), e ela deve ler teto e gasto na mesma transação da reserva |

## Decisões tomadas

- **Desvio 1 aceito: `deps: DepsDemanda` e `t?: Transacao` em `alterarAgente` e `definirTeto`.** Razão: é o molde já
  aceito de T18 a T22. `ator` continua `AtorPessoa`, como no plano, e `autorizar` na primeira linha nega a
  administradora também na chamada direta.
- **Desvio 2 aceito: exportações a mais** (`MENSAGENS_TETO`, `mensagemNaoLigou`, `LIMITE_MODELO`,
  `obterConfiguracaoAgente`, `estaSuspenso` e os tipos com nome). Razão: os testes usam todas, e a T45 e a T27 precisam
  delas sem redigir texto nem repetir a regra do teto.
- **Desvio 3 aceito: `GET /api/agentes` responde `{ agentes: [...] }`.** Razão: o plano não fixa a forma, e o objeto
  pode ganhar campo depois sem quebrar quem consome. A T45 lê `agentes`.
- **Mudança que não muda nada não grava nem gera evento.** Razão: deixa o `PATCH` e o `PUT` idempotentes, e o RF-19
  pede histórico de mudança, não de pedido.
- **Ligar exige preço vigente no instante da mudança, também para o agente já ligado que troca de modelo.** Razão: o
  custo de cada chamada sai do preço do modelo (RF-17). Sem preço, a T27 não teria como registrar o uso.
- **`proximo: qa-automacao`.** Razão: a revisão não tem bloqueio, e a próxima etapa da cadeia é a `06-T23-testes`.

## Pendências

- **Para a T45 e a T33 (lacuna do plano, do `tech-lead`):** a tela T12 da 03 não tem campo de modelo, e os quatro
  agentes nascem com `modelo` nulo. Hoje, um "ligar" pela tela sem `modelo` sempre volta 409. Antes da T45, o plano
  precisa dizer de onde vem o modelo:
  - a primeira opção é o script de preço da T33 gravar também o modelo do agente;
  - a segunda é um campo "Modelo" no diálogo de ligar, com texto da `ux-ui-design`.
  Fica para a volta do plano antes da T33, ou para a `06-T45-revisao`. O e2e "ligar o risco" da T45 depende disso.
- **Para a 08 (ajudante único):** o Minor 3, junto com os Minor 1 e 2 da `06-T21-revisao` e o Minor 1 da
  `06-T22-revisao`.
- **Para a 08:**
  - o Minor 1: texto do 409 quando o agente ligado troca de modelo;
  - o Minor 4: lista de permissão de formato para `modelo`, com a `seguranca-aplicacao`.
- **Para a T27 (`engenheiro-backend`):**
  - Minor 5: ler o teto e o gasto na mesma transação da reserva da chamada.
  - O custo da chamada sai de `calcularCusto` com `precoVigente(db, modelo, relogio.agora())` no instante da chamada.
  - A suspensão sai de `estaSuspenso`, sem uma segunda regra.
- **Para quem mostrar eventos de configuração:** o Minor 2. Comparar `antes.ligado` com `depois.ligado` antes de
  escrever "ligou" ou "desligou".
- **Para a T45 (`engenheiro-frontend`):** as notas da entrega do engenheiro valem como estão:
  - `{ agentes }`;
  - `percentual` inteiro;
  - teto 0 mostra o alerta de teto não definido, e não o percentual;
  - os textos vêm de `mensagemNaoLigou` e `MENSAGENS_TETO`;
  - o `PUT` manda o texto como foi digitado.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — último commit 63faf6c (06-T23-construcao engenheiro-backend)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 7b68d76..63faf6c` — 13 arquivos, 11 de código e teste, todos novos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 7b68d76..63faf6c -- src` — o diff inteiro do código e dos testes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat --format=%h%x20%s 9818216 9d9ca9a 63faf6c` — código e testes só no 9818216; os outros dois só no registro e na entrega
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, ramo `construcao/DEC-DEM-20261022-0001-v1`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 110 arquivos, 2105 de 2105
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -S "isSafeInteger" -- src` — só o 9818216 (Minor 3)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -S "inicioDoProximoMesSaoPaulo" -- src` — já existia desde a T01 (aba6bcc)

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
