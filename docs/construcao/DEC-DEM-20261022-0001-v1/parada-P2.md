# Parada 2 · DEC-DEM-20261022-0001-v1 · WS Orquestrador de Demandas

**Decidir:** aprovar o plano e escolher onde parar entre as fases.
**Ler:** `docs/superpowers/plans/2026-10-25-ws-orquestrador-demandas-plano.md`
**Risco do pedido:** alto

## Até aqui
- 14 passagens, 70 min de agentes, 1 min de espera, 0 voltas, 4 bloqueios.

## O plano
- 46 tarefas em 7 fases: Fundação (13), Demandas (4), Versões e decisão (5), Agentes de IA (7), Avisos e retenção (2), Operação (4), Painel (11).
- Risco alto: T02 Log por lista de permissão e Sentry sem dado pessoal; T04 Banco: conexão, transação, ajudante de teste, migrate e tabelas de acesso e histórico com guarda de privilégios; T05 Tabelas de demanda, versões e decisão, com privilégios e índices; T06 Tabelas de agentes, uso de IA, avisos e operação, com sementes e privilégios; T08 Better Auth: configuração fechada, papel protegido e segredo conferido; T09 exigirPessoa, bloqueio da verificação, limite por IP e sessão sem 2FA; T10 Tokens de serviço, resolverAtor, matriz de acesso e autorizar; T11 Adaptador de rota e de Server Action, dependências, cabeçalhos de segurança e saúde; T13 Testes estáticos e teste transversal da matriz de acesso; T15 Serviço de demanda: criar, alterar, consultar e transições de status; T17 Entrada colando o texto (modo manual) e leitura do texto recebido; T21 Decisão e dupla aprovação; T22 Pedido de Construção; T23 Interruptores, teto, preço por modelo e registro de uso; T24 Minimização e montador da entrada de cada agente; T25 Provedor de IA sem ferramentas e fábrica que só existe com a chave; T26 Prompts dos quatro agentes e schema de saída do orquestrador; T27 Execução de agente idempotente, com teto, interruptor e novas tentativas; T28 Gatilhos dos agentes e entrada pelo agente orquestrador; T30 Aviso por e-mail de pacote pronto para decisão; T31 Expurgo do texto bruto, da entrada pendente e das sessões vencidas; T32 Scripts de conta: criar usuário e desativar conta; T33 Scripts de token, preço, seed fictício e subida da homologação; T34 Teste transversal de sentinelas: log, Sentry, esquema do pg-boss e execuções; T37 T01 Entrar e T02 Configurar verificação em duas etapas; T39 T04 Nova demanda e T06 Editar dados; T40 T05 Detalhe da demanda; T43 T09 Novo pacote de decisão e T11 Decisão do pacote; T44 Pedido de Construção na tela de decisão; T45 T12 Agentes e teto de gasto.
- Paradas entre fases: só risco alto 6 (antes de Demandas, Versões e decisão, Agentes de IA, Avisos e retenção, Operação, Painel) · até o fim 0 · a cada fase 6.

## Para você decidir
- (05-tech-lead) X-01 (Fabiano, antes da 06): confirmar se os comandos git da lista Pode dos três engenheiros (`git status`, `git diff`, `git log`) passam no `conferir` como estão escritos. O plano não depende de git, mas a entrega dos engenheiros costuma listar esses comandos.
- (05-tech-lead) J-01, J-02, J-03, O-02 e F-01 da spec seguem com as áreas donas; nenhuma bloqueia a construção.
- Mais 5 pendências que não bloqueiam, nos arquivos da pasta do pedido.

## Opções
- Aprovo, parando só nas fases de risco alto (recomendado)
- Aprovo, até o fim
- Aprovo, parando a cada fase
- Ajuste ou Cancelo (com o texto)
