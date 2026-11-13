# Parada 1 · DEC-DEM-20261111-0017-v1 · Orquestrador 0.4.0: andamento do Pedido de Construção registrado pelo /construir

**Decidir:** aprovar a spec consolidada das etapas 01 a 04.
**Ler:** `docs/superpowers/specs/2026-11-12-ws-orquestrador-demandas-andamento-design.md`
**Risco do pedido:** medio

## Até aqui
- 4 passagens, 31 min de agentes, 0 min de espera, 0 voltas, 0 bloqueios.

## Para você decidir
- (01-analista-requisitos) **P-08** (Fabiano, fora do `/construir`): a tool do Awave (`awave-agents`, 0ab8ced) não foi lida nesta etapa; o 201 ganha a chave `andamento: null`. Do lado de cá, o teste de contrato da 0.3.0 cobre; conferir do lado do Awave antes de ligar a parte 3 da E01.
- (02-arquiteto-solucoes) P-01, P-02 e P-03 de 01 seguem com Fabiano, sem bloquear; o desenho segue o que vale se ele não decidir (409 para DEC substituído, tabela de contradição da seção 5 de 01, 60/600 por hora). Mudar os números é trocar duas constantes de `LIMITE_ANDAMENTO`.
- (03-ux-ui-design) Nenhuma bloqueia a etapa. Itens para as etapas seguintes:
- (03-ux-ui-design) (Fabiano, fora deste pedido, E01 parte 3) Quando o Awave for mostrar o andamento ao cliente, usar os mesmos rótulos de fase da seção 8, sem número de tarefas fora da fase Construindo e sem prazo (RSK do pedido).
- (04-seguranca-aplicacao) Nenhuma bloqueia a etapa. Itens para a Parada 1 e para as etapas seguintes:
- Mais 24 pendências que não bloqueiam, nos arquivos da pasta do pedido.

## Opções
- Aprovo
- Ajuste (com o texto)
- Cancelo (com o motivo)
