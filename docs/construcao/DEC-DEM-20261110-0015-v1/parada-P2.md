# Parada 2 · DEC-DEM-20261110-0015-v1 · Orquestrador 0.2.0: novo visual do painel (proposta A, Mesa de controle, com a decisão no celular da proposta C)

**Decidir:** aprovar o plano e escolher onde parar entre as fases.
**Ler:** `docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md`
**Risco do pedido:** medio

## Até aqui
- 12 passagens, 67 min de agentes, 0 min de espera, 0 voltas, 3 bloqueios.

## O plano
- 17 tarefas em 7 fases: Vigilância (1), Identidade (4), Fila (4), Demanda (2), Decisão (2), Demais telas (3), Fechamento (1).
- Risco alto: T01 Vigia de origem e CSP em todo e2e, teste estático de recurso externo e piso de asserções; T02 Fontes Noto servidas pelo próprio app; T04 Marca e moldura pública: Entrar, 2FA, sem permissão, erro e 404; T05 Casca do painel e gaveta; T07 Leituras novas da fila, só SELECT; T09 T03 Fila: contadores, tabela densa, cartões e filtros; T11 T05 no arranjo A2; T12 T11: um formulário, três botões; T13 T11 no arranjo A (computador) e C2 (celular); T17 Versão 0.2.0 e capturas de tela.
- Paradas entre fases: só risco alto 5 (antes de Identidade, Fila, Demanda, Decisão, Fechamento) · até o fim 0 · a cada fase 6.

## Para você decidir
- (05-tech-lead) `engenheiro-frontend` (T13) e Fabiano (UAT): o plano B do foco sob o rodapé (`focusin` com `scrollIntoView`) só entra se o CA-12.3 reprovar no Chromium; o comportamento no Safari do iOS fica para o UAT (P-04 da 03).
- Mais 4 pendências que não bloqueiam, nos arquivos da pasta do pedido.

## Opções
- Aprovo, parando só nas fases de risco alto (recomendado)
- Aprovo, até o fim
- Aprovo, parando a cada fase
- Ajuste ou Cancelo (com o texto)
