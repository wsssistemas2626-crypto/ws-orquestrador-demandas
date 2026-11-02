# Notas de versão

Registro do que entra em cada versão do WS Orquestrador de Demandas e do que fica pendente. Dono:
`documentacao-tecnica` (sistema: Fabiano).

## 0.1.1 — 2026-11-02

Correção do pedido `DEC-DEM-20261102-0002-v1` (cadeia curta, tipo bug), sobre a `main` da 0.1.0 (`dd8ddee`). Ainda
não foi publicada: o merge, a publicação e a configuração no Easypanel são de Fabiano.

**Nenhum comportamento do sistema muda.** Mudaram só testes e2e, o seed fictício e a versão. Não mudaram `src/`,
`drizzle/`, `.github/`, `Dockerfile`, `playwright.config.ts` nem `e2e/servidor.ts`. Não há migration nova nem variável de
ambiente nova. A imagem só difere da 0.1.0 no `scripts/seed-ficticio.ts` e no `package.json`.

### O que mudou

- **Três testes e2e instáveis no CI do PR #1** (execução 41249512830, commit `e0f3933`) foram estabilizados, e nenhum
  deles verifica menos do que antes:
  - **`document-title` falso** em "T12 com agente ligado" (`e2e/agentes-teto.spec.ts`) e em "T11 decidido"
    (`e2e/decisao.spec.ts`). Depois de uma Server Action, o Next 16 re-renderiza a página, e o `<title>` chega por
    streaming depois do corpo. O axe rodava nesse intervalo. Agora `semViolacoes` (`e2e/apoio.ts`) espera a página ter
    `<title>` não vazio por até 5 s antes de rodar o axe. Se o título não chegar, o axe roda assim mesmo e reprova pela
    regra `document-title`. As `TAGS_AXE` são as mesmas, e nenhuma regra foi desligada ou filtrada.
  - **429 em "T07 da ESP com a correção da Lista de textos"** (`e2e/parecer-risco-qa.spec.ts`). A conta "cto" fechava a
    suíte com 30 de 30 demandas na hora. Quando um teste da `decisao.spec.ts` falhava, o worker novo do Playwright criava
    a 31ª demanda. Agora a T07, o duplo clique do parecer de risco e a `decisao.spec.ts` usam demandas fictícias do seed,
    pela função nova `demandaDoSeed` (`e2e/apoio.ts`), e não criam demanda pela API. A `decisao.spec.ts` deixou de
    guardar a demanda numa variável do módulo, e um worker novo não cria mais demanda. Com isso, a "cto" fecha a suíte
    com 27 de 30. O limite do C-36 (`conferirLimite`, 30 demandas por hora por ator) não mudou e continua testado em
    `src/modules/limites.test.ts` e `src/app/api/demandas/demandas.bordas.test.ts`.
- **Teste novo `e2e/sem-violacoes.spec.ts`**, em `/configuracao/agentes`, com dois casos:
  - corrida: o `<title>` volta 500 ms depois do corpo. Tem de passar, e antes da correção falhava com `document-title`;
  - controle negativo: uma tela sem `<title>` continua reprovada pela regra `document-title`.
- **Seed fictício** (`scripts/seed-ficticio.ts`): entraram três demandas próprias do e2e, de tipo `melhoria`, em Nova,
  sem versão e criadas pela conta fictícia `sem2fa`:
  - "Demanda da decisão (fictício)";
  - "Duplo clique no parecer de risco (fictício)";
  - "Lista de textos da especificação (fictício)".

  O seed passa de 11 para 14 demandas: 5 da conta `cto` e 9 próprias do e2e (`TITULOS_DO_E2E`). As regras do seed
  continuam as mesmas, inclusive a guarda `SEED_FICTICIO=1` com banco vazio. Os testes estão em `scripts/scripts.test.ts`.
- **Versão:** o `package.json` passou de 0.1.0 para 0.1.1, e o teste estático `test/estatico/projeto.test.ts` confere a
  versão nova.
- **Documentação:**
  - estas notas;
  - a versão no `README.md` e no manual técnico;
  - a verificação do axe no cap. 08 do manual e o seed no cap. 10;
  - em `docs/operacao/deploy.md`: a versão, a primeira publicação com a 0.1.1 (seção 4) e o rollback da 0.1.1 (seção 6).

### Verificações desta versão

- `pnpm test`: 192 arquivos, 3.697 de 3.697 (`03-engenheiro-frontend.md` e `04-qa-automacao.md`).
- `pnpm lint` e `pnpm typecheck` limpos.
- `pnpm test:e2e`, contra o build de produção: 128 testes em 22 arquivos, verde três vezes seguidas, sem mudança de
  código entre as corridas. Houve também uma corrida com uma falha forçada e temporária em `decisao.spec.ts`: só o teste
  forçado falhou, e não houve 429 no fim (`04-qa-automacao.md`).
- `docker build` local: imagem de 1,73 GB em disco e 425 MB de conteúdo, nada publicado (`05-devops-sre.md`).
- A homologação (`construir.mjs homologar`) e o ensaio de rollback (`construir.mjs ensaiar-rollback`) ficam para a
  Parada 3.

### Pendências abertas

Da revisão deste pedido (`04-maestro.md`), em testes e sem efeito no sistema:

- **M-01 deste pedido (médio), para o `qa-automacao` num pedido seguinte.** Em `e2e/decisao.spec.ts:39`, a guarda só
  confere se a demanda já tem ESP. Quando não tem, cria a ESP e o RSK juntos. Se o RSK falhar depois de a ESP ser
  gravada, o próximo worker acha a ESP e pula o RSK, e os testes de aprovar e decidir falham até um seed novo.
  Correção: conferir o RSK à parte.
- **B-01:** o duplo clique, a T07 e a `decisao.spec.ts` só passam com banco recém-semeado. Isso vale no CI e no
  `homologar`, que apaga os volumes. Duas corridas contra a mesma homologação fazem esses testes falharem.
- **B-02:** o comentário de `playwright.config.ts:4` ainda diz "Os dados de cada teste são criados pela API", o que já
  não vale para as demandas do seed. O arquivo está fora do que a etapa de documentação edita, então a correção fica
  para quem pode editar o arquivo.
- **Minor da triagem:**
  - `demandaDaDupla` (`e2e/decisao.spec.ts`) e os buscadores de demanda do seed nas outras specs podem passar a usar
    `demandaDoSeed`;
  - `demandaDoSeed` e `demandaDaDupla` procuram só entre as 100 primeiras demandas `melhoria`. Hoje a suíte usa perto de
    70. Se a suíte crescer, a busca deve filtrar pela API.

Da entrega (`05-devops-sre.md`), para Fabiano:

- **Segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER`.** Ainda não existem no GitHub. Até existirem:
  - todo push na `main` publica a imagem no GHCR (`:<sha>`, `:v0.1.1`, `:latest`) e fica vermelho no passo "Disparar o
    Easypanel", sem deploy;
  - a limpeza das versões antigas do GHCR não roda, e o pacote acumula mais de 2 versões.

  O merge da 0.1.1 cai nesse caso. Antes de qualquer passo, tire um snapshot da VPS no hPanel.
- **Primeira publicação de verdade** pela seção 4 do `docs/operacao/deploy.md`, com a `:latest`, que depois do merge é
  a 0.1.1, e as mesmas 7 migrations da 0.1.0.
- **Rollback da 0.1.1** pelo caminho A (só trocar a imagem, sem restaurar backup), para
  `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:dd8ddee6d8a30cda8dff0f1a45f0abe30db8f364` (a `v0.1.0`). Na
  cadeia curta ele não foi ensaiado: o ensaio é o `ensaiar-rollback` da Parada 3.
- Continuam de antes, sem mudança neste pedido: as actions por SHA e a imagem de cerca de 1,7 GB por causa do `tsx`
  (seção 10 do `deploy.md`).
- A imagem local `ws-orquestrador-demandas:local` (1,73 GB) ficou no Docker da VPS. Apagá-la depende de confirmação de
  Fabiano.

Continuam abertas, sem mudança, as pendências da 0.1.0 (seção abaixo):

- os médios M-01 a M-07 e o médio novo do reteste;
- a leitura do QR com aparelho real;
- a configuração do pipeline e do Easypanel;
- as pendências das outras áreas antes de ligar agente.

## 0.1.0 — 2026-10-31

Primeira versão, construída pelo `/construir` a partir do pedido `DEC-DEM-20261022-0001-v1` (spec aprovada na
Parada 1 em `docs/superpowers/specs/2026-10-25-ws-orquestrador-demandas-design.md`). Ainda não foi publicada: o merge
na `main`, o deploy e a configuração no Easypanel são de Fabiano.

### O que entrou

- **Entrada de demanda** pelo painel (colando o texto recebido) e pela API, com id `DEM-AAAAMMDD-NNNN` de sequência
  global. O texto bruto fica em tabela própria, só uma pessoa o lê, e um job diário o expurga depois de 90 dias
  (configurável de 1 a 365).
- **ESP, RSK e DEC em versões imutáveis.** O papel da aplicação só tem `SELECT` e `INSERT` nessas tabelas. DEC sem
  ESP ou sem RSK é recusado com a lista do que falta. DEC com ESP ou RSK mais nova fica marcado como desatualizado e
  não pode ser aprovado.
- **Decisão só por pessoa com 2FA**: aprovar com a opção A ou B, devolver ou arquivar. No nível
  `cto_e_administradora`, a aprovação só vale com as duas aprovações na mesma opção, e a da administradora exige a
  referência ao documento assinado. Só o DEC mais novo da demanda pode ser decidido, e nunca dois aprovados.
- **Pedido de Construção** gerado de DEC aprovado e atualizado, validado pela cópia do `validarPedido` do
  `/construir`, idêntico byte a byte para o mesmo DEC, para baixar e copiar à mão. Tipo `estudo` não gera pedido.
  Pedido com e-mail, telefone ou CPF é recusado.
- **Status da demanda** em nove valores, com tabela fechada de transições; quatro automáticas e o resto manual. Dúvida
  em aberto leva a `aguardando_informacao`, sem mensagem ao solicitante.
- **Histórico** só de inclusão, com pessoa, agente ou sistema, sem texto livre de terceiro.
- **Quatro agentes de IA** (orquestrador, insumo técnico, risco, consolidação) como jobs do pg-boss, com saída
  validada pelo mesmo schema da API, execução única, 3 tentativas, uso e custo por chamada, teto mensal em US$ que
  suspende os agentes e minimização do que vai ao provedor. **Nascem desligados, com teto 0 e sem chave de API.** O
  DEC de agente nasce sempre com dupla aprovação.
- **Aviso por e-mail** (Resend) de DEC pronto, uma vez por DEC, só com ids e link. Sem chave, não envia.
- **Acesso**: login com senha e TOTP obrigatório, sem cadastro público, sessão de 8 h, limite de login por IP e
  bloqueio da verificação por conta; tokens de serviço por agente, só por Bearer, guardados como hash; matriz de
  acesso com teste de acesso negado em toda rota.
- **Painel em pt-BR** com 12 telas, axe sem violação em cada uma.
- **Operação**: `Dockerfile` multiestágio, CI (`lint`, `typecheck`, `test`, `test:e2e`, `pnpm audit --prod
  --audit-level high`, gitleaks, `docker build`), `deploy.yml` para o GHCR e os webhooks do Easypanel (só sem
  migration nova), homologação local por `docker-compose.hml.yml`, `GET /api/saude` que confere a última migration,
  rollback descrito em `docs/operacao/deploy.md`.
- **Documentação**: `README.md`, `docs/manual-tecnico/` (um capítulo por grupo de RF), `docs/operacao/deploy.md` e
  estas notas.

### Correções feitas na revisão (08) antes de fechar a versão

- S-01 (crítico): dependências com vulnerabilidade conhecida. `next` e `eslint-config-next` 16.3.8 → **16.4.1**,
  `better-auth` 1.7.6 → **1.7.7**, `zod` 4.6.5 → **4.6.6**, com `overrides: zod: 4.6.6` no `pnpm-workspace.yaml` para
  o `zod` que vem pelo better-auth. `pnpm audit --prod --audit-level high` termina com código 0.
- A-01 (alto): decidir um DEC que não é o mais novo da demanda dá 409.
- A-02 (alto): aprovar um DEC com outro já aprovado na demanda dá 409.
- A-03 (alto): o pedido de DEC desatualizado dá 409, e a tela esconde a seção.
- A-04 (alto): o nível de aprovação saiu da saída do agente de consolidação; DEC de agente nasce `cto_e_administradora`.
- A-05 (alto): CI criado na etapa 09 (falta só fixar as actions por SHA, abaixo).

### Verificações desta versão

- `pnpm test`: 192 arquivos, 3.697 de 3.697 (08-correcao).
- `pnpm lint` e `pnpm typecheck` limpos.
- Homologação (`construir.mjs homologar`): saúde 200 e e2e com 126 testes passando contra a imagem.
- Ensaio de rollback: primeira publicação, as 7 migrations não alteram dado existente.
- `docker build` local: imagem de 1,74 GB em disco (426 MB comprimidos).

### Pendências abertas para Fabiano

Segurança, nível médio (decidir na Parada 3 se entram numa correção antes do merge ou vão a `gestao-riscos` como
risco residual; o `seguranca-aplicacao` não aceita risco residual sozinho):

- **M-01**: a consolidação lê o RSK da chave da execução, mas o DEC cita o RSK mais novo; o resumo pode vir de outro
  parecer (`src/modules/agentes/entrada-agente.ts`).
- **M-02**: criar ESP, RSK ou DEC não confere o status da demanda; numa demanda `encerrada` ou `entregue`, dispara
  agente, aviso e possível pedido (`src/modules/pacotes-decisao/criar.ts`).
- **M-03**: erro inesperado no envio do aviso gasta as novas tentativas sem somar `aviso_email.tentativas`, e o aviso
  pode ficar `pendente` para sempre; a recusa definitiva do Resend (4xx) é tentada de novo
  (`src/jobs/aviso-dec-pronto.ts`).
- **M-04**: o `no-store` das páginas era conferido só no `next dev`. Resolvido no e2e local, que agora roda contra o
  build de produção, e conferido na homologação com `BASE_URL`; segue na lista para o registro da decisão.
- **M-05**: erro não tratado em página ou layout sai pelo `console` do Next, fora do log por lista de permissão
  (`src/modules/acesso/exigir-pessoa.ts`, `src/app/(painel)/layout.tsx`).
- **M-06**: o token de agente lê `solicitanteNome`, anexos e o nome da conta autora pela API, contornando a
  minimização (`src/modules/demandas/consultas.ts`).
- **M-07**: o seed cria contas com senha e segredo TOTP que estão no git; a guarda é `SEED_FICTICIO=1` com banco vazio.
  Controle operacional: `SEED_FICTICIO` nunca no serviço de produção (`docs/operacao/deploy.md`, seção 7).
- **Médio novo do reteste (08)**: a regra "nunca dois DEC aprovados" junto com a do desatualizado pode deixar a
  demanda sem saída. O v1 é aprovado, entra uma ESP ou um RSK novos, o pedido do v1 dá 409 e o v2 não pode ser
  aprovado. Saídas possíveis: recusar ESP, RSK e DEC novos numa demanda com DEC aprovado (trata também a M-02), ou
  deixar aprovar o mais novo quando o aprovado anterior estiver desatualizado. Decisão de Fabiano ou do `tech-lead`.
- **5 vulnerabilidades moderadas** no `pnpm audit --prod`; o portão é `--audit-level high`, e elas não bloqueiam.

Configuração e pipeline (fora do `/construir`; passo a passo em `docs/operacao/deploy.md`, seções 2 e 10):

- Fixar por SHA completo `actions/checkout@v5` e `actions/setup-node@v5` nos dois workflows, e por digest a imagem
  `ghcr.io/gitleaks/gitleaks:v8.28.0`. Sem isso, o C-39 (A-05) não fecha por inteiro.
- Segredos do GitHub `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER`.
- Credencial de leitura de pacotes (`read:packages`) do GHCR no Easypanel.
- Acesso **Admin** das Actions do repositório ao pacote no GHCR, para a limpeza das versões antigas.
- Variáveis dos serviços `app` e `worker` no Easypanel, só pelo nome, como na seção 3 do `deploy.md`; papel
  `orquestrador_app` criado no banco de produção com senha nova.
- Primeira execução do gitleaks: as senhas fictícias da homologação, do seed e do e2e podem ser acusadas; a triagem é
  do `seguranca-aplicacao`.

Aceite (UAT):

- Ler o QR da tela de 2FA com o Google Authenticator e com o Microsoft Authenticator (cenário U-01 do
  `07-qa-funcional.md`), com aparelho real.

Para outras áreas, antes de ligar qualquer agente em produção (`docs/manual-tecnico/06-agentes-de-ia.md`):

- `juridico-contratos`: confirmar os 90 dias do texto bruto, os 5 anos depois do status final, as bases legais e a
  transferência internacional (J-01).
- `compliance-governanca`: registro da operação de tratamento (J-02).
- `gestao-riscos`, com aceite de Fabiano: risco residual de nome em texto livre que chega ao provedor e de instrução
  injetada que passe pela revisão humana (J-03).
- Fabiano: chave da API no CNPJ (CA-E-03), teto mensal e preço do modelo.

Documentação fora do repositório do sistema ou do código, que esta etapa não edita:

- RNF-01 da spec e do `01-analista-requisitos.md`, a linha de stack do plano e o `padrao-tecnico.md` da
  estruturaAutonoma ainda citam Next 16.3.8, Zod 4.6.5 e Better Auth 1.7.6. O `padrao-tecnico.md` pede ADR para mudar
  de linha do Next (16.3 → 16.4), e a troca foi feita como correção de segurança, sem ADR.
- Comentários e nomes de teste ainda citam "Better Auth 1.7.6" (por exemplo, `src/modules/acesso/bloqueio-verificacao.ts:5`).

Backlog (baixo): B-01 a B-07 do `08-maestro.md`; `gerarPedido` sem a trava da demanda antes de ler `desatualizado`;
imagem de 1,74 GB por levar as dependências de desenvolvimento; textos QF-01 a QF-04 e D-01 a D-06 para a
`ux-ui-design`.

### Fora desta versão

Entrada automática por e-mail ou chat, envio automático do pedido ao `/construir` e retorno de andamento, upload de
anexo, mensagem ao solicitante, cadastro público e recuperação de senha por e-mail, mais de uma empresa na mesma base,
opções C e D na decisão, job de anonimização de 5 anos.
