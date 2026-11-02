# Parada 1 · DEC-DEM-20261022-0001-v1 · WS Orquestrador de Demandas

**Decidir:** aprovar a spec consolidada das etapas 01 a 04.
**Ler:** `docs/superpowers/specs/2026-10-25-ws-orquestrador-demandas-design.md`
**Risco do pedido:** alto

## Até aqui
- 10 passagens, 38 min de agentes, 0 min de espera, 0 voltas, 3 bloqueios.

## Para você decidir
- (01-analista-requisitos) Nenhuma bloqueia a etapa. Itens para a Parada 1 (Fabiano) ou para as etapas 02 e 04:
- (01-analista-requisitos) Fabiano: quem registra no sistema a aprovação da administradora (ela própria, com conta e 2FA, ou o CTO, informando a referência ao documento assinado)? Os requisitos aceitam os dois, sempre com a referência obrigatória.
- (01-analista-requisitos) Fabiano: a aprovação do DEC deve mudar a demanda para `aprovada` automaticamente? A ESP diz "mudados à mão"; os requisitos seguem a ESP.
- (01-analista-requisitos) Fabiano: valor do teto de gasto mensal e da tabela de preço por modelo (configurados no banco, sem valor no código).
- (02-arquiteto-solucoes) Nenhuma bloqueia a etapa. Itens para a Parada 1 (Fabiano) ou para as etapas seguintes:
- (02-arquiteto-solucoes) Fabiano / demanda à parte (antes da 06): a lista Pode do arquiteto cita `git status`, `git log` e `git diff`, mas o Bash começa na estruturaAutonoma e a forma `git -C <repo>` é recusada pelo conferir. Nesta volta nenhum comando git foi rodado; o estado do repositório foi conferido com `ls`.
- (02-arquiteto-solucoes) Fabiano (Parada 1): quem registra a aprovação da administradora (pendência da etapa 01). O modelo aceita os dois jeitos; o código nasce no mais restrito (só a própria administradora) até a resposta.
- (03-ux-ui-design) Nenhuma bloqueia a etapa. Itens para a etapa 02, para o 01 ou para a Parada 1:
- (03-ux-ui-design) `analista-requisitos` / Fabiano: em DEC de nível `cto`, a administradora pode aprovar? O RF-13 não restringe o papel; a interface restringe ao CTO. Se a resposta for "pode", basta mostrar o formulário às duas contas.
- (03-ux-ui-design) Fabiano (Parada 1): quem registra a aprovação da administradora. A T11 foi desenhada para ela entrar com a própria conta (o aprovador vem da sessão, RF-13). Se for o CTO informando a referência, a T11 precisa de um bloco "Registrar aprovação da administradora em nome dela", e o RF-14 precisa dizer como o aprovador é gravado.
- (03-ux-ui-design) Fabiano: confirmar a moeda do teto (US$).
- (04-seguranca-aplicacao) Nenhuma bloqueia a etapa. Itens para a Parada 1 e para as etapas seguintes:
- (04-seguranca-aplicacao) Fabiano: regra mínima de nível de aprovação (por exemplo, risco jurídico `alto` exige `cto_e_administradora`). Sem ela, um DEC de agente com nível rebaixado depende só da revisão humana (C-14).
- (04-seguranca-aplicacao) Fabiano: quem registra a aprovação da administradora, e se ela aprova DEC de nível `cto` (afeta C-12; o código nasce no modo mais restrito).
- (04-seguranca-aplicacao) `gestao-riscos`: risco residual para aceite formal de Fabiano: (a) nome de pessoa dentro de texto livre ainda chega ao provedor depois da minimização; (b) instrução injetada que passe pela revisão humana chega ao /construir, cujos agentes têm Bash.
- Mais 24 pendências que não bloqueiam, nos arquivos da pasta do pedido.

## Opções
- Aprovo
- Ajuste (com o texto)
- Cancelo (com o motivo)
