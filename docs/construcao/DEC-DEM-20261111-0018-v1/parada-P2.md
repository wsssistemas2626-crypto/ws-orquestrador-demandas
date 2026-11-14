# Parada 2 · DEC-DEM-20261111-0018-v1 · Sobras da 0.1.13: DEC substituído no /construir, conferências do D1, arquivamento do v2, teste instável e textos

**Decidir:** aprovar o plano e escolher onde parar entre as fases.
**Ler:** `docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md`
**Risco do pedido:** baixo

## Até aqui
- 138 passagens, 477 min de agentes, 0 min de espera, 10 voltas, 45 bloqueios.

## O plano
- 14 tarefas em 7 fases: Situação do pedido (2), D1 com o nome da criação (3), Arquivamento (1), Fila (1), Teste instável e piso (2), Seed (1), Painel (4).
- Risco alto: T01 Ação ler_situacao_pedido só do construir na matriz (SB-01); T02 Serviço situacaoDoPedido e rota GET /api/pedidos-construcao/[decId]/situacao (SB-02 a SB-06); T03 Coluna caminhos_com_nome_na_criacao e migration 0010 (SB-10); T04 Textos da criação e marcação na criação do DEC (SB-07, SB-08 c e f, SB-09 a e b); T05 D1 com o nome da criação na geração e na entrega (SB-08, SB-09 c e d); T06 Destino do arquivamento pelo aprovado vigente (SB-11); T08 C-27: estabilizar deps-qa.test.ts sem asserção a menos (SB-14).
- Paradas entre fases: só risco alto 3 (antes de D1 com o nome da criação, Arquivamento, Teste instável e piso) · até o fim 0 · a cada fase 6.

## Para você decidir
- (05-tech-lead) Para a `08-revisao` ratificar: a ampliação da regra 2 do CV-09 (teste de segurança) para `vigenteDe(d)` depois de autorizar, decidida pelo maestro em 14/11 pela autonomia dada por Fabiano. A guarda é textual, como a de hoje: ela confere o nome `vigenteDe` e o argumento `d`, não de onde a função é importada. Um endurecimento possível, fora desta volta, é exigir que `vigenteDe` venha de `components/dados-das-etapas`.
- (05-tech-lead) Herdadas da spec, com Fabiano e fora do `/construir`: o aceite do risco residual com a `gestao-riscos` (7.2, item 11); backup, migration `0010` e deploy depois do merge; o lado do `/construir` (outra frente), com o cliente falhando fechado.
- Mais 14 pendências que não bloqueiam, nos arquivos da pasta do pedido.

## Opções
- Aprovo, parando só nas fases de risco alto (recomendado)
- Aprovo, até o fim
- Aprovo, parando a cada fase
- Ajuste ou Cancelo (com o texto)
