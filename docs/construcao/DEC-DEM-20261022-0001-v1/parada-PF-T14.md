# Parada da fase Demandas · DEC-DEM-20261022-0001-v1 · WS Orquestrador de Demandas

**Decidir:** liberar o início da fase Demandas.
**Ler:** `docs/superpowers/plans/2026-10-25-ws-orquestrador-demandas-plano.md`
**Risco do pedido:** alto

## Até aqui
- 72 passagens, 394 min de agentes, 42 min de espera, 2 voltas, 9 bloqueios.

## A fase
- T14 Gerador de id, número de versão e trava da demanda (engenheiro-backend, risco baixo)
- T15 Serviço de demanda: criar, alterar, consultar e transições de status (engenheiro-backend, risco alto)
- T16 Rotas de demanda e de histórico (engenheiro-backend, risco medio)
- T17 Entrada colando o texto (modo manual) e leitura do texto recebido (engenheiro-backend, risco alto)

## Para você decidir
- (06-T12-qa-automacao) Nenhuma bloqueia a T12.
- Mais 200 pendências que não bloqueiam, nos arquivos da pasta do pedido.

## Opções
- Sigo
- Ajuste (com o texto)
- Cancelo (com o motivo)
