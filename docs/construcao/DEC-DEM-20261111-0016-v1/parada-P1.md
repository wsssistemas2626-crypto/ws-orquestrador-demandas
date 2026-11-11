# Parada 1 · DEC-DEM-20261111-0016-v1 · Orquestrador 0.3.0: atores de integração awave (criar e ler a própria demanda) e construir (buscar o Pedido de Construção)

**Decidir:** aprovar a spec consolidada das etapas 01 a 04.
**Ler:** `docs/superpowers/specs/2026-11-11-ws-orquestrador-demandas-integracoes-design.md`
**Risco do pedido:** medio

## Até aqui
- 4 passagens, 29 min de agentes, 0 min de espera, 0 voltas, 0 bloqueios.

## Para você decidir
- (01-analista-requisitos) Nenhuma bloqueia a etapa. Itens para as etapas seguintes e para Fabiano ver na Parada:
- (01-analista-requisitos) (Fabiano, na Parada 1) A forma da confirmação do RF-06 foi definida aqui, porque o insumo não a descreve. Se a intenção era outra (ex.: confirmar ao mover para `em_analise`), o RF-06 muda antes da etapa 05.
- (01-analista-requisitos) (Fabiano / arquiteto) Na primeira busca, os DEC com pedido gerado antes da 0.3.0 e demanda fora de status final (`aprovada`, `em_construcao`, `devolvida`) aparecem em `pendentes`. O `buscar-pedidos.mjs` grava como `ja_existia` quando os bytes batem com o arquivo em `pedidos/`, ou acusa `conflito` por e-mail quando o arquivo antigo difere (ex.: gerado antes da 0.1.12, com `aprovadoPor` em nomes). Não há corte por dat…
- (02-arquiteto-solucoes) Nenhuma bloqueia a etapa. Itens para as etapas seguintes e para Fabiano ver na Parada:
- (02-arquiteto-solucoes) (Fabiano, na Parada 1) `pedido_entregue` uma vez por hash e DEC com entrega recusada por 422 mantido em `pendentes` (Decisões). Se preferir outra regra, muda antes da etapa 05.
- (02-arquiteto-solucoes) (Fabiano / analista) Pedidos gerados antes da 0.3.0 entram em `pendentes` na primeira busca (pendência do `01`). Como a entrega devolve os bytes de hoje, o arquivo antigo em `pedidos/` que tiver sido gerado antes da 0.1.12 vira `conflito` no `/construir`; nenhum dado se perde, e Fabiano resolve um a um.
- (03-ux-ui-design) Nenhuma bloqueia a etapa. Itens para as etapas seguintes:
- (04-seguranca-aplicacao) Nenhuma bloqueia a etapa. Itens para a Parada 1 e para as etapas seguintes:
- Mais 23 pendências que não bloqueiam, nos arquivos da pasta do pedido.

## Opções
- Aprovo
- Ajuste (com o texto)
- Cancelo (com o motivo)
