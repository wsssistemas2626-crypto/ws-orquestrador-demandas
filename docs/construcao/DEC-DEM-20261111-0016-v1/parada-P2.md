# Parada 2 · DEC-DEM-20261111-0016-v1 · Orquestrador 0.3.0: atores de integração awave (criar e ler a própria demanda) e construir (buscar o Pedido de Construção)

**Decidir:** aprovar o plano e escolher onde parar entre as fases.
**Ler:** `docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md`
**Risco do pedido:** medio

## Até aqui
- 8 passagens, 56 min de agentes, 140 min de espera, 0 voltas, 1 bloqueio.

## O plano
- 20 tarefas em 6 fases: Fundação (4), Awave (3), Confirmação (1), Construir (5), Scripts e seed (2), Painel (5).
- Risco alto: T01 Esquema e migration 0007 (aditiva); T02 Tipo de ator integracao e ramos exaustivos (IN-02); T03 Token de integração, matriz fechada e matriz × rotas (IN-01, IN-03); T04 Limite por integração e tempo limite das transações de integração (IN-09, IN-14); T05 Leitura pelo Awave só da própria demanda, em seis chaves (IN-08); T06 O Awave cria demanda: autoria, campos, sem disparo, limite e contrato (IN-05); T08 Confirmação da demanda do Awave e nenhum agente de IA antes dela (IN-06, IN-07); T09 Conferência e montagem do pedido extraídas da geração; T10 Leituras do pedido no histórico: pendentes, gerado, entregues, recebido (IN-10); T11 Entrega ao /construir e rota de pendentes (IN-10, IN-12); T12 Confirmação de recebimento pelo /construir (IN-11); T14 Emissão, troca e revogação dos tokens de integração pelos scripts (IN-04).
- Paradas entre fases: só risco alto 4 (antes de Awave, Confirmação, Construir, Scripts e seed) · até o fim 0 · a cada fase 5.

## Para você decidir
- (05-tech-lead) Nenhuma bloqueia o plano.
- (05-tech-lead) Herdadas, sem mudança: aceite formal de riscos residuais (P-04, já aceito por Fabiano em 11/11, a registrar com `gestao-riscos`); rede própria do Easypanel (`seguranca-informacao`); retenção do texto do Awave (`juridico-contratos`); `pnpm audit` sem `--prod` e as 5 moderadas (0015); atualizar o `padrao-tecnico.md` para as versões do ADR-29.
- Mais 2 pendências que não bloqueiam, nos arquivos da pasta do pedido.

## Opções
- Aprovo, parando só nas fases de risco alto (recomendado)
- Aprovo, até o fim
- Aprovo, parando a cada fase
- Ajuste ou Cancelo (com o texto)
