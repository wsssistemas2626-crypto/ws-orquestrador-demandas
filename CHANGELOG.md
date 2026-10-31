# Notas de versão

Registro do que entra em cada versão do WS Orquestrador de Demandas e do que fica pendente. Dono:
`documentacao-tecnica` (sistema: Fabiano).

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
