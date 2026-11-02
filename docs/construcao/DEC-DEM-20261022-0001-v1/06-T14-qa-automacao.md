---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T14-testes
agente: qa-automacao
leu: [contrato-passagem.md, pedido.json, padrao-tecnico.md, tarefas.json, 01-analista-requisitos.md (RF-01 a RF-07 e RNF e matriz de rastreabilidade), 05-tech-lead.md (início), 06-T14-engenheiro-backend.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G3 e T14 e início da T15), commit 5704fe2 (stat), commit bc07aed (stat), src/modules/demandas/gerar-id.ts, src/modules/demandas/gerar-id.test.ts, src/modules/versoes.ts, src/modules/versoes.test.ts, test/banco.ts, src/db/schema/demandas.ts, src/db/schema/versoes.ts, src/lib/erros.ts, src/lib/reduzir-erro.ts, src/lib/relogio.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verificação da T14 (gerador de id, número de versão e trava da demanda; RF-04, RNF-09, C-36), sobre o commit
`5704fe2`. O commit seguinte, `bc07aed`, é a revisão: só mudou documento, nenhum código. O código passa nos testes do
engenheiro e nos 19 que acrescentei. Não há devolução.

### Critério de aceite → teste que o cobre

| Critério | Arquivo | Testes |
|---|---|---|
| CA-04.1 (data de São Paulo às 23h30 e sequência 41 → `DEM-20261022-0042`) | `src/modules/demandas/gerar-id.test.ts` | `id da demanda > CA-04.1: data de São Paulo e sequência 41 → DEM-20261022-0042`; `id da demanda > CA-04.1: logo depois da meia-noite em São Paulo, a data já é a do dia novo`; **novo** `id da demanda: bordas > virada do ano: 02:59 UTC de 01/01 ainda é 31/12 em São Paulo; 03:00 UTC já é 01/01`; **novo** `id da demanda: bordas > a data vem do relógio injetado, não da data do servidor` |
| CA-04.2 (sequência global, sem reinício por dia) | `src/modules/demandas/gerar-id.test.ts` | `id da demanda > CA-04.2: a sequência é global, não reinicia no dia seguinte`; **novo** `id da demanda: bordas > CA-04.2, como escrito: com a sequência em 7, a demanda de 22/10 e a seguinte, de 23/10, são -0007 e -0008` |
| CA-04.3 (duas ESP simultâneas → v1 e v2, sem duplicidade nem erro) | `src/modules/versoes.test.ts` | `CA-04.3: versões simultâneas da mesma demanda > a segunda espera a primeira e fica com v2`; `> duas criações em paralelo terminam em v1 e v2, sem repetir`; `> cinco criações em paralelo terminam em v1 a v5`; `> sem a trava, a restrição única (demanda_id, versao) é a segunda barreira`; `> a transação desfeita não deixa a versão gravada`; **novo** `versões e trava: bordas > CA-04.3: ESP e RSK criadas em paralelo na mesma demanda ficam cada uma com v1, sem erro` |
| CA-04.4 (sequência em 9999 → erro claro, nenhum id fora do formato) | `src/modules/demandas/gerar-id.test.ts` | `id da demanda > CA-04.4: com a sequência em 9999, erro claro e nada gravado`; `> CA-04.4: o erro de capacidade vira 409 sem detalhe do Postgres`; **novo** `id da demanda: bordas > CA-04.4: esgotada, a sequência continua esgotada (não volta para 0001)`; **novo** `> CA-04.4: o banco não aceita id fora do formato, como o de 5 dígitos (CHECK do id, 23514)` |
| RF-04, N = maior versão + 1, por demanda e por tabela | `src/modules/versoes.test.ts` | `proximaVersao > %s sem versão gravada → 1` (3 casos); `> com v1 e v2 gravadas → 3, em cada uma das três tabelas`; `> conta só as versões da própria demanda`; `> a versão nova vem depois da maior gravada, não da contagem`; **novo** `versões e trava: bordas > cada tabela tem a sua numeração: ESP até v3 não muda a próxima RSK nem a próxima DEC`; **novo** `> passada a v9999, a gravação da versão seguinte é recusada pelo banco (23514) e nada fora do formato fica gravado` |
| RF-04, formato `<prefixo>-<demandaId>-v<N>` | `src/modules/versoes.test.ts` | `idVersao e RE_ID_VERSAO > %s de %s na versão %d → %s` (3 casos); `> o id montado é o que o banco confere (check de id derivado)`; `> %j: aceita só se alguma regex de rota() aceita (G3.10)` (12 casos); **novo** `versões e trava: bordas > id que não bate com a demanda e a versão é recusado pelo banco (23514)` |
| RF-04, 4 dígitos com zeros à esquerda | `src/modules/demandas/gerar-id.test.ts` | `id da demanda > a sequência tem sempre 4 dígitos, com zeros à esquerda`; **novo** `id da demanda: bordas > o número %i sai com 4 dígitos: %s` (1, 9, 99, 999, 1000); `regex do id da demanda > aceita %s` e `> recusa %j` |
| RNF-09 (capacidade de 9.999, aviso a partir de 9.000) | `src/modules/demandas/gerar-id.test.ts` | `capacidade de ids > RNF-09: o aviso de capacidade é a partir de 9.000 demandas`; `> totalDeDemandas conta as demandas gravadas, como número` |
| C-36 (`nextval` na transação; buraco aceito, repetição não) | `src/modules/demandas/gerar-id.test.ts` | **novo** `id da demanda: bordas > C-36: o número gasto numa transação desfeita não volta, e a demanda seguinte não o repete` |
| Trava da demanda (`FOR UPDATE`, 404) | `src/modules/versoes.test.ts` | `travarDemanda > devolve a linha da demanda`; `> id inexistente → nao_encontrado, com a mensagem padrão`; `> segura a demanda até o fim da transação: outra trava da mesma demanda espera`; `> demandas diferentes não se esperam`; **novo** `versões e trava: bordas > a trava não impede a leitura simples da demanda (a fila e o detalhe não esperam)`; **novo** `> travarDemanda com %j: nao_encontrado, sem erro de SQL e sem efeito` (2 casos de injeção) |
| Erro sem detalhe interno | `src/modules/demandas/gerar-id.test.ts` | `id da demanda > erro do banco que não é o de capacidade não vira capacidade_de_ids_esgotada`; **novo** `id da demanda: bordas > transação já abortada: sobe o 25P02 do Postgres, que vira 500 genérico, sem detalhe` |

### Testes acrescentados (19, em dois arquivos)

- `src/modules/demandas/gerar-id.test.ts`, bloco `id da demanda: bordas`, com 12 testes:
  - 4 dígitos para os números 1, 9, 99, 999 e 1000, ajustados com `setval(..., false)`. O caso 1 prova que a
    primeira demanda é `-0001`.
  - CA-04.2 do jeito que está escrito: duas demandas seguidas, em 22/10 e em 23/10.
  - A data vem do relógio injetado, em 2031, e não do servidor.
  - A virada do ano no fuso de São Paulo.
  - C-36: o número gasto na transação desfeita não é reaproveitado.
  - A sequência esgotada continua esgotada: `no cycle`, sem voltar a `0001`.
  - O `CHECK` do banco recusa id de 5 dígitos.
  - A transação abortada sobe com `25P02` e vira 500 com o corpo genérico exato. O teste do engenheiro só conferia
    "não é `ErroDominio`".
- `src/modules/versoes.test.ts`, bloco `versões e trava: bordas`, com 7 testes:
  - Numeração independente por tabela.
  - ESP e RSK em paralelo na mesma demanda.
  - A trava não bloqueia a leitura simples.
  - Dois ids com injeção de SQL em `travarDemanda`: viram 404 e a tabela continua lá.
  - Passada a v9999, o banco recusa a versão seguinte com `23514`.
  - O banco recusa id derivado que não bate com a demanda e a versão.

Nenhum teste existente foi apagado, pulado ou afrouxado. O `git diff` dos dois arquivos só tem linhas acrescentadas,
mais a troca de uma linha de import em `gerar-id.test.ts` (`MENSAGEM_ERRO_INTERNO` entrou ao lado de `ErroDominio` e
`mapearErro`).

### Resultado

- `pnpm test`: 74 de 74 arquivos e 1202 de 1202 testes, 0 falhas. Antes desta etapa eram 1183; os 19 a mais são os
  novos.
- Os dois arquivos da T14 rodaram três vezes: 55 de 55 antes dos testes novos, depois 74 de 74 duas vezes. Os testes
  de concorrência ficaram estáveis.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.

## Decisões tomadas

- **Os testes novos entraram nos dois arquivos que já existem, e não num arquivo novo.** Assim reaproveitam o banco por
  arquivo (`novoBanco`) e as fixtures `linhaDemanda`, `linhaEsp`, `linhaRsk` e `adiado`, sem criar mais uma cópia do
  banco.
- **Nenhum teste novo depende da ordem.** Cada teste de id ajusta a própria sequência antes de rodar. Cada teste de
  versão cria a própria demanda. O teste do id de 5 dígitos confere a ausência daquele id, e não o total da tabela.
  Por isso não é afetado pelo teste de `totalDeDemandas`.
- **Nenhum teste novo depende do relógio real.** Toda data vem de `relogioFixo`. A concorrência é coordenada por
  promessas e pela trava do Postgres.
- **O teste da v9999 confere só a barreira do banco (`23514` e nada gravado), não o valor 10000 de `proximaVersao`.**
  Assim ele continua valendo se a T18 puser um erro de domínio no serviço antes do insert.
- **O teste do engenheiro sobre a transação abortada ficou como estava.** Acrescentei outro, com a asserção mais
  forte (`25P02` e o corpo 500 exato), para não mexer em teste existente.

## Pendências

- **RNF-09 na tela:** o aviso do painel a partir de 9.000 demandas não é da T14, que só expõe
  `LIMITE_AVISO_CAPACIDADE` e `totalDeDemandas`. Tem de ganhar teste na tarefa de tela que mostrar o aviso.
- **CA-04.4 na API:** o 409 de `POST /api/demandas` com a sequência esgotada, e o 400 que não avança a sequência
  (C-36), ficam para a T15 e a T16. A T14 cobre o erro de domínio e o `mapearErro`.
- **T18 a T20, nível Minor:** passada a v9999, a gravação recusada com `23514` vira 500 genérico, como o engenheiro já
  registrou. O teste novo fixa a barreira do banco. Se a T18 criar um erro de domínio para isso, ele entra junto com o
  teste próprio.
- **Nível Minor, sem instabilidade vista:** `esperarBloqueio` em `versoes.test.ts` consulta `pg_stat_activity` a cada
  5 ms, até 1000 vezes. O tempo não decide o resultado, só serve de limite: com o banco muito lento, o teste falharia
  com "nenhuma transação ficou esperando a trava". Nas três rodadas não falhou.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 5704fe2ea44792d1c19436cd3d3a9508efd96af1` — 6 arquivos: os 4 da T14, a entrega do engenheiro e `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -5` — último commit bc07aed (06-T14-revisao)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat bc07aed` — só `06-T14-tech-lead.md` e `passagens.jsonl`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/gerar-id.test.ts src/modules/versoes.test.ts` — antes dos testes novos: 2 de 2 arquivos, 55 de 55 testes
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/gerar-id.test.ts src/modules/versoes.test.ts` — com os testes novos: 2 de 2 arquivos, 74 de 74 testes
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 74 de 74 arquivos, 1202 de 1202 testes, 0 falhas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/gerar-id.test.ts src/modules/versoes.test.ts` — segunda rodada, para ver a estabilidade: 74 de 74 testes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 2 arquivos, 166 linhas acrescentadas e 1 trocada (o import)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff src/modules/demandas/gerar-id.test.ts` — confere que só há acréscimo e a linha de import trocada

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
