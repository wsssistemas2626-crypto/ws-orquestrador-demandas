# Deploy, operação e rollback do ws-orquestrador-demandas

| Campo | Valor |
|---|---|
| Versão | 0.1.2 |
| Imagem | `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas` (privada) |
| Tags | `<sha do commit>`, `v<versão do package.json>` e `latest`; o GHCR guarda só as 2 versões mais recentes |
| Workflows | `.github/workflows/ci.yml` (pull request e antes de publicar) e `.github/workflows/deploy.yml` (push na `main`) |
| Quem executa | Tudo o que mexe em produção (serviço, variável, banco, migration, rollback) é de Fabiano, pelo Easypanel |
| Atualizado em | 02/11/2026 (`documentacao-tecnica`: versão 0.1.2, primeira publicação com a 0.1.2 na seção 4 e rollback da 0.1.2 na seção 6) |
| Dono | `devops-sre` (sistema: Fabiano) |

Antes de qualquer passo das seções 4, 5 e 6: **tirar snapshot da VPS no hPanel**.

## 1. Como a entrega anda

1. Pull request → `ci.yml`: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`
   (Testcontainers), `pnpm test:e2e` (contra o build de produção), `pnpm audit --prod --audit-level high`, gitleaks no
   histórico e `docker build` sem publicar. Vermelho trava o merge: corrige-se, não se contorna.
2. Merge na `main` → `deploy.yml`: roda o `ci.yml` inteiro de novo sobre o commit da `main`, constrói a imagem e
   publica as três tags no GHCR.
3. O `deploy.yml` confere se o push trouxe arquivo novo ou alterado em `drizzle/`:
   - **sem migration nova:** chama os webhooks do Easypanel, primeiro o do `worker`, depois o do `app`;
   - **com migration nova** (ou sem commit anterior para comparar): **não chama** os webhooks e deixa um aviso no
     resumo da execução. O deploy segue à mão pela seção 5 (backup → migrate → deploy).
4. Por último, apaga do GHCR as versões além das 2 mais recentes. A anterior fica sempre disponível para o rollback.

Nenhum workflow publica imagem ou chama webhook fora do push na `main`.

## 2. Serviços no Easypanel

Projeto sugerido: `orquestrador`. Configuração só pelo painel (regra 1 do servidor); `docker service update` é
sobrescrito no próximo deploy.

| Serviço | Tipo | Imagem e comando | Réplicas | Rede |
|---|---|---|---|---|
| `db` | Postgres 16 (modelo do Easypanel) | oficial | 1 | interna, sem porta publicada |
| `app` | App, origem "Docker image" | `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:latest`, comando padrão da imagem (`pnpm start`), porta interna 3101 | **1** | domínio no Easypanel (Traefik, https) |
| `worker` | App, origem "Docker image" | a mesma imagem, comando `pnpm worker` | **1** | sem domínio e sem porta |

- **Uma réplica de cada.** O limite de login é em memória (ADR-11), e a fila dos agentes conta com um worker só para
  respeitar o teto de gasto (02, seção 8). O painel `/configuracao/agentes` avisa quando duas instâncias de worker
  batem.
- **A porta do app só pelo Traefik (B-03).** Não publicar a 3101 no host (campo "Ports" vazio). O limite por IP lê o
  cabeçalho `x-real-ip`, que o Traefik sobrescreve; com a porta exposta direto, qualquer cliente forja o cabeçalho e
  escapa do limite.
- **Credencial do GHCR:** a imagem é privada. No Easypanel, cadastrar o registro `ghcr.io` com um token de leitura de
  pacotes (`read:packages`) da conta dona. O token fica só no Easypanel.
- **Webhooks:** em cada serviço (`app` e `worker`), copiar a URL de deploy do Easypanel para os segredos do GitHub
  `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER` (Settings → Secrets and variables → Actions). Os dois são
  segredos: não vão para issue, log nem documento.
- **Limpeza do GHCR:** em Package settings do pacote, dar ao repositório acesso **Admin** em "Manage Actions access",
  para o `GITHUB_TOKEN` poder apagar versões antigas. Sem isso, o último passo do `deploy.yml` fica vermelho (a imagem
  já terá sido publicada).

## 3. Variáveis de ambiente (só os nomes)

A lista completa está em `.env.example`. Valor nunca vai para o repositório, para o log nem para a tela.

| Variável | app | worker | migration | Regra |
|---|---|---|---|---|
| `DATABASE_URL` | sim | sim | — | papel `orquestrador_app` (sem DDL) |
| `BETTER_AUTH_SECRET` | sim | sim | — | 32 bytes ou mais; o mesmo valor nos dois serviços |
| `BETTER_AUTH_URL` | sim | sim | — | URL pública do painel, **https** (o `env.ts` recusa http fora do loopback em produção) |
| `CABECALHO_IP_CLIENTE` | opcional | opcional | — | padrão `x-real-ip` (o do Traefik); só mudar com outro proxy |
| `RETENCAO_TEXTO_BRUTO_DIAS` | opcional | opcional | — | inteiro de 1 a 365, padrão 90 (fora disso o processo não sobe) |
| `LOG_LEVEL` | opcional | opcional | — | padrão `info` |
| `SENTRY_DSN` | opcional | opcional | — | ausente = Sentry desligado |
| `PORT` | opcional | — | — | padrão 3101 (já definido na imagem) |
| `ANTHROPIC_API_KEY` | **nunca** | opcional | — | ausente na 0.1.0: os agentes ficam sem provedor |
| `RESEND_API_KEY`, `EMAIL_REMETENTE`, `EMAIL_AVISO_DECISAO` | **nunca** | opcional | — | sem os três, o aviso fica `sem_provedor` |
| `DATABASE_URL_MIGRATOR` | **nunca** | **nunca** | sim | dono do banco (DDL); só no comando da migration (seção 5) |
| `SEED_FICTICIO` | **nunca** | **nunca** | — | só na homologação (seção 7) |

`NODE_ENV` (`production`) e `PORT` vêm da imagem. `NEXT_RUNTIME` é do Next.

Rotação:

- `BETTER_AUTH_SECRET`: trocar derruba todas as sessões **e torna ilegíveis os segredos de 2FA já gravados** (o Better
  Auth os cifra com ele). Depois da troca, cada pessoa configura o 2FA de novo. Trocar só com motivo (vazamento) e com
  as pessoas avisadas.
- Senhas do banco: `ALTER ROLE ... PASSWORD` no `db` e, em seguida, a variável no Easypanel e o deploy do serviço.
- Webhooks: regenerar no Easypanel e atualizar o segredo no GitHub.
- Chaves do Resend e da Anthropic: no painel do provedor, depois a variável do worker.

Requisitos de operação que o código supõe:

- **HTTPS com HSTS.** O Traefik do Easypanel termina o HTTPS do domínio do `app`. Em produção, o próprio app manda
  `Strict-Transport-Security: max-age=63072000; includeSubDomains` (`next.config.ts`).
- **SPF e DKIM do remetente.** O domínio de `EMAIL_REMETENTE` precisa estar verificado no Resend, com SPF e DKIM, antes
  de definir `RESEND_API_KEY` no worker. Sem isso, o aviso de DEC pronto pode cair em spam ou ser recusado.
- **Backup com retenção de no máximo 30 dias.** O backup guarda o texto bruto das demandas, que é dado pessoal de
  terceiro. Com o expurgo de 90 dias (`RETENCAO_TEXTO_BRUTO_DIAS`) e o backup de até 30, o texto bruto some de vez em
  até 120 dias. A rotação (apagar backup e snapshot com mais de 30 dias) é de Fabiano.
- **Agentes desligados.** Na 0.1.0, `ANTHROPIC_API_KEY` fica ausente e os quatro agentes, desligados. As
  pré-condições para ligar estão no [manual técnico, cap. 06](../manual-tecnico/06-agentes-de-ia.md#pré-condições-para-ligar-qualquer-agente-em-produção).

## 4. Primeira publicação

A produção ainda não tem versão no ar, então não há para onde voltar. A 0.1.0 foi mergeada e a imagem dela está no
GHCR, mas os serviços do Easypanel não foram criados. Depois do merge da 0.1.2, a primeira publicação de verdade usa
a `:latest`, que passa a ser a 0.1.2, com as mesmas 7 migrations da 0.1.0.

1. Snapshot no hPanel.
2. Criar o projeto e o serviço `db` (Postgres 16). O usuário criado pelo Easypanel é o **migrator** (dono do banco).
3. No `db`, criar o papel do app com senha forte gerada na hora (a de `scripts/hml/criar-papeis.sql` é fictícia e
   nunca é usada aqui):
   `CREATE ROLE orquestrador_app LOGIN PASSWORD '<senha nova>' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;`
4. Criar os serviços `app` e `worker` (seção 2) com as variáveis da seção 3, **sem** iniciar ainda.
5. Mergear o PR e esperar o `deploy.yml` publicar a imagem (passo "Publicar"). O que vem depois depende do push:
   - **com migration nova** (como no merge da 0.1.0): a execução fica verde, com o aviso de migration pendente;
   - **sem migration nova** (como nos merges da 0.1.1 e da 0.1.2, que não mudam `drizzle/`): roda o passo "Disparar o
     Easypanel".
     - Sem os segredos de webhook da seção 2, o passo falha com "Faltam os segredos EASYPANEL_WEBHOOK_APP e
       EASYPANEL_WEBHOOK_WORKER" e a execução fica vermelha. A imagem já estará publicada, e a limpeza do GHCR não roda.
     - Com os segredos cadastrados, o passo chama os webhooks antes da migration do passo 6, e o `app` responde 503 na
       saúde até a migration rodar (seção 8). Para o `app` não subir antes da migration, cadastre os segredos de webhook
       só depois do passo 7.
6. Migration pela seção 5, passo 3. O backup do passo 2 da seção 5 pode ser pulado só nesta primeira vez, porque o
   banco está vazio.
7. Deploy do `worker` e depois do `app` pelo botão do Easypanel. Conferir a seção 8.
8. Criar as contas reais pelo script, no console do serviço `app`:
   `pnpm tsx scripts/criar-usuario.ts --email <e-mail> --nome <nome> --papel cto` (e `administradora`). A senha inicial
   aparece uma vez; no primeiro acesso a pessoa configura o 2FA.

## 5. Deploy de versão com migration nova

Ordem fixa: **backup → migrate → deploy** (ADR-12, CA-P7-06). O app não recebe a URL do migrator.

1. Snapshot no hPanel.
2. **Backup** do banco, no host, para fora de qualquer repositório (a pasta e o nome são sugestão):
   `docker exec <contêiner do db> pg_dump --create -U <usuário migrator> <banco> > /home/deploy/backups/orquestrador/<AAAAMMDD-HHMM>-antes-v<versão>.sql`
   e `chmod 600` no arquivo. Conferir que o arquivo não está vazio. É este backup que o rollback restaura.
3. **Migrate** com a imagem nova e o migrator, numa execução avulsa na rede do projeto (o nome da rede sai de
   `docker network ls`). A variável é lida do terminal, sem aparecer na tela nem no histórico:
   `read -rs DATABASE_URL_MIGRATOR` e `export DATABASE_URL_MIGRATOR`, depois
   `docker run --rm --network <rede do projeto> -e DATABASE_URL_MIGRATOR ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:<sha> pnpm db:migrate`
   e `unset DATABASE_URL_MIGRATOR`. Saída esperada: `Migrations aplicadas.` Em erro, a saída traz só a classe e o
   código; nada mudou no app, que segue na versão anterior.
4. **Deploy:** botão de deploy do `worker` e depois do `app` no Easypanel (a tag `latest` já é a nova).
5. Conferir a seção 8. Se a saúde não voltar a 200 em 5 minutos, ir para a seção 6.

Sem migration nova, os passos 2 e 3 não existem: o `deploy.yml` já chama os webhooks sozinho.

## 6. Rollback passo a passo

A versão anterior está no GHCR pela tag do seu commit (`ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:<sha
anterior>`; a lista está em Packages, no repositório). O GHCR guarda a atual e a anterior.

**Regra que decide o caminho:** a saúde (`GET /api/saude`) só responde 200 quando a última migration aplicada no banco
é a última do journal **da própria imagem**. Por isso:

- **a versão publicada não trouxe migration:** a anterior volta só trocando a imagem (caminho A);
- **a versão publicada trouxe migration:** a anterior **só volta com o backup restaurado** (caminho B), tirado no passo
  2 da seção 5. O dado gravado entre a publicação e a volta se perde. Restaurar é decisão de Fabiano.

### Caminho A: sem migration

1. No Easypanel, serviço `worker`: trocar a imagem de `:latest` para `:<sha anterior>` e fazer o deploy.
2. O mesmo no serviço `app`.
3. Conferir a seção 8.
4. Quando a correção for publicada, voltar as duas imagens para `:latest`. Enquanto estiverem fixadas no sha, o webhook
   redeploya a versão fixada, não a nova.

### Caminho B: com migration

1. Snapshot no hPanel.
2. Parar `app` e `worker` no Easypanel (nada grava no banco durante a restauração).
3. Restaurar o backup no `db` (apaga o banco atual e recria pelo dump):
   `docker exec -i <contêiner do db> psql -v ON_ERROR_STOP=1 -U <usuário migrator> -d postgres -c 'DROP DATABASE IF EXISTS "<banco>" WITH (FORCE)'`
   e depois
   `docker exec -i <contêiner do db> psql -v ON_ERROR_STOP=1 -U <usuário migrator> -d postgres < <arquivo do backup>`.
   O papel `orquestrador_app` não está no dump e continua existindo no servidor, com os mesmos privilégios.
4. Trocar a imagem de `worker` e `app` para `:<sha anterior>` e fazer o deploy (worker primeiro).
5. Conferir a seção 8.
6. Voltar para `:latest` só quando a correção for publicada, pela seção 5 de novo (com backup novo).

O mesmo ciclo (versão da `main` → backup → versão nova migrando por cima → volta → restauração conferida) é ensaiado
na homologação por `construir.mjs ensaiar-rollback <DEC-id>` antes de cada PR do /construir. Na 0.1.0 não há versão
anterior: o ensaio registrou `primeira_publicacao: true`, sem `volta_sem_restaurar`, e as 7 migrations novas não alteram
dado existente (`alteram_dado: false`). A partir da 0.1.1, toda versão que trouxer migration nova cai no caminho B: a
volta dela **exige restaurar o backup tirado antes da publicação**.

A 0.1.2 não traz migration: o journal dela é o mesmo da 0.1.1 e da 0.1.0. A volta da 0.1.2 é o caminho A, para
`ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:30b71b5185cb58d403847b95532e54b5a299e77a` (a `v0.1.1`, commit
de merge do PR #2 na `main`). Antes de voltar, confirme a tag em Packages: sem os segredos de webhook, a limpeza do
GHCR não roda e a `v0.1.1` continua lá. Essa volta só foi conferida no código. O ensaio é o `ensaiar-rollback` da
Parada 3.

A 0.1.1 também não trouxe migration; a volta dela era o caminho A, para
`ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:dd8ddee6d8a30cda8dff0f1a45f0abe30db8f364` (a `v0.1.0`).

## 7. Homologação

- **Local (a do /construir):** `docker-compose.hml.yml` sobe `db`, `app` e `worker` só com valores fictícios escritos
  no próprio arquivo, sem `.env`, e publica só o app em `127.0.0.1:${HML_PORTA}`. O `construir.mjs homologar` sobe,
  espera `/api/saude`, roda `pnpm test:e2e` com `BASE_URL` e derruba tudo, volumes inclusive.
- **Se um dia houver homologação no Easypanel:** acesso restrito (autenticação básica do Easypanel ou lista de IPs),
  `BETTER_AUTH_URL` em https, banco próprio e separado do de produção, e nenhum dado real.
- **`SEED_FICTICIO` nunca no serviço de produção (M-07).** O seed cria contas com senha e segredo TOTP públicos, que
  estão no git (`scripts/seed-ficticio.ts`). Ele recusa banco que já tem demanda ou conta, mas a regra é não pôr a
  variável em produção, nem por um deploy.

## 8. Conferência depois de cada deploy ou rollback

1. `GET https://<domínio>/api/saude` responde 200 `{"status":"ok"}`. 503 = banco fora ou migration diferente da imagem.
2. Logs do `app` e do `worker` no Easypanel sem `worker_configuracao_invalida` nem `worker_falha_ao_subir` (as
   mensagens citam só o nome da variável).
3. Em `/configuracao/agentes`, batimento do worker com menos de 5 minutos e uma instância só.
4. Entrar com uma conta real (senha e 2FA) e abrir a fila de demandas.

## 9. Alertas mínimos

| Sinal | Limiar | Ação |
|---|---|---|
| `/api/saude` diferente de 200 | 3 falhas seguidas em 5 min | Logs do `app` e do `db`; se veio de deploy, seção 6 |
| Batimento do worker (`/configuracao/agentes`) | mais de 5 min sem bater | Logs do `worker`; deploy do serviço; conferir variáveis |
| Duas instâncias de worker | qualquer ocorrência | Conferir réplicas = 1 no Easypanel |
| Erro novo no Sentry (com DSN) | primeira ocorrência de cada tipo | Triagem pelo `tech-lead`; incidente se afetar decisão ou dado |

O monitor externo da saúde ainda não existe: até lá, a conferência é a da seção 8.

## 10. Pendências do pipeline

- **Actions por SHA:** `actions/checkout@v5` e `actions/setup-node@v5` estão por versão. Trocar cada uma pelo SHA
  completo do commit da versão, com a versão em comentário (`uses: actions/checkout@<sha> # v5.x.y`).
- [x] **Imagem do gitleaks por digest (feita em 31/10/2026):** o CI usa
  `ghcr.io/gitleaks/gitleaks:v8.28.0@sha256:cdbb7c955abce02001a9f6c9f602fb195b7fadc1e812065883f695d1eeaba854`, o digest
  que o próprio CI baixou para a tag. As actions por SHA (item acima) continuam pendentes.
- **Primeira execução do gitleaks:** o repositório tem senhas fictícias de propósito (homologação, seed, e2e). Se o
  gitleaks acusar alguma, a triagem é do `seguranca-aplicacao`; nada entra em lista de exceção sem essa revisão.
- **Tamanho da imagem:** cerca de 1,74 GB em disco (426 MB comprimidos), porque o worker, a migration e os scripts rodam
  por `tsx`, que é dependência de desenvolvimento. Compilar o worker e os scripts no build permitiria instalar só as
  dependências de produção.
