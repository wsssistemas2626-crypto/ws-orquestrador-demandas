# Parada da fase Operação · DEC-DEM-20261022-0001-v1 · WS Orquestrador de Demandas

**Decidir:** liberar o início da fase Operação.
**Ler:** `docs/superpowers/plans/2026-10-25-ws-orquestrador-demandas-plano.md`
**Risco do pedido:** alto

## Até aqui
- 155 passagens, 967 min de agentes, 221 min de espera, 3 voltas, 20 bloqueios.

## A fase
- T32 Scripts de conta: criar usuário e desativar conta (engenheiro-backend, risco alto)
- T33 Scripts de token, preço, seed fictício e subida da homologação (engenheiro-backend, risco alto)
- T34 Teste transversal de sentinelas: log, Sentry, esquema do pg-boss e execuções (engenheiro-backend, risco alto)
- T35 Desempenho de leitura com 5.000 demandas (engenheiro-dados-bd, risco baixo)

## Para você decidir
- (06-T30-engenheiro-backend) Seguem abertos, sem mudança: os Minor 1 e 3 da `06-T29-revisao`, os Minor da `06-T28-revisao` e das anteriores, o Minor de `fabianojp06` da `06-T26-testes` e o aviso do undici "Using `patch`".
- Mais 29 pendências que não bloqueiam, nos arquivos da pasta do pedido.

## Opções
- Sigo
- Ajuste (com o texto)
- Cancelo (com o motivo)
