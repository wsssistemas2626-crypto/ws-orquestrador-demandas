# Parada 2 · DEC-DEM-20261111-0017-v1 · Orquestrador 0.4.0: andamento do Pedido de Construção registrado pelo /construir

**Decidir:** aprovar o plano e escolher onde parar entre as fases.
**Ler:** `docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md`
**Risco do pedido:** medio

## Até aqui
- 8 passagens, 69 min de agentes, 6 min de espera, 0 voltas, 1 bloqueio.

## O plano
- 14 tarefas em 5 fases: Fundação (3), Registro (5), Leituras (1), Seed (1), Painel (4).
- Risco alto: T01 Tabela andamento_construcao, migrations 0008 e 0009 e privilégio só de inclusão (AN-10); T02 Ação registrar_andamento só do construir na matriz (AN-01); T03 Limite de gravações de andamento: 60 por DEC e 600 no total por hora (AN-07); T04 Corpo fechado do andamento e 422 pelo rota() com corpoInvalido (AN-02); T05 Regras do andamento, transições do construir e evento andamento_registrado (AN-04, AN-11, AN-12); T07 Serviço registrarAndamento: 404 sem oráculo, travas, transições, idempotência e prazo total (AN-03 a AN-06, AN-08); T08 Rota POST /api/pedidos-construcao/[decId]/andamento, contrato do /construir, limite e sentinelas; T09 Andamento nas vistas de pessoa e do Awave e varredura das leituras a partir da matriz (AN-09).
- Paradas entre fases: só risco alto 2 (antes de Registro, Leituras) · até o fim 0 · a cada fase 4.

## Para você decidir
- (05-tech-lead) Nenhuma bloqueia o plano.
- (05-tech-lead) Herdadas da spec, com Fabiano e fora do `/construir`: P-04 (aceite de risco residual com `gestao-riscos`, incluindo o envio do andamento por um usuário do sistema que os agentes não usem, pendência da publicação), P-05 (conferir a tool do Awave com a sétima chave) e o roteiro depois do merge (backup, migrations, `worker` e depois `app`, saúde, só então `"andamento_ligado": true`).
- Mais 5 pendências que não bloqueiam, nos arquivos da pasta do pedido.

## Opções
- Aprovo, parando só nas fases de risco alto (recomendado)
- Aprovo, até o fim
- Aprovo, parando a cada fase
- Ajuste ou Cancelo (com o texto)
