# Deploy, operação e rollback do ws-orquestrador-demandas

| Campo | Valor |
|---|---|
| Versão | 0.2.0 |
| Imagem | `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas` (privada) |
| Tags | `<sha do commit>`, `v<versão do package.json>` e `latest`; o GHCR guarda só as 2 versões mais recentes |
| Workflows | `.github/workflows/ci.yml` (pull request e antes de publicar) e `.github/workflows/deploy.yml` (push na `main`) |
| Quem executa | Tudo o que mexe em produção (serviço, variável, banco, migration, rollback) é de Fabiano, pelo Easypanel |
| Atualizado em | 12/11/2026 (`devops-sre`, pedido 0016: publicação da 0.2.0 de 11/11 e aviso da origem GitHub na seção 4; publicação da 0.3.0, com a migration `0007` em passo separado, na seção 5; rollback da 0.3.0 na seção 6, para a 0.2.0, só com o backup restaurado; tamanho da imagem na seção 10); 11/11/2026 (`documentacao-tecnica`, pedido 0015: versão 0.2.0 e a situação da produção em 10/11 na seção 4); 11/11/2026 (`devops-sre`, pedido 0015: rollback da 0.2.0 na seção 6, para a `v0.1.13`, com o ensaio e a volta quando a origem do serviço for GitHub; merge da 0.2.0 sem migration na seção 4; tamanho da imagem e auditoria das `devDependencies` na seção 10); 10/11/2026 (`documentacao-tecnica`, pedido 0014: versão 0.1.13; `devops-sre`, pedido 0014: rollback da 0.1.13 na seção 6, para a `v0.1.12`, sha completo da `v0.1.11` no parágrafo da 0.1.12 e merges sem migration até a 0.1.13 na seção 4); 04/11/2026 (`documentacao-tecnica`, pedido 0013: versão 0.1.12; `devops-sre`, pedido 0013: rollback da 0.1.12 na seção 6, para a `v0.1.11`, e merges sem migration até a 0.1.12 na seção 4); 04/11/2026 (`documentacao-tecnica`, pedido 0012: versão 0.1.11; `devops-sre`, pedido 0012: rollback da 0.1.11 na seção 6, para a `v0.1.10`, risco residual do M-1 do 0009 reduzido de novo na seção 4 e erro que lança ao ser lido na seção 8); 04/11/2026 (`documentacao-tecnica`, pedido 0011: versão 0.1.10; `devops-sre`, pedido 0011: rollback da 0.1.10 na seção 6, para a `v0.1.9`, risco residual do M-1 do 0009 reduzido na seção 4 e reenvio ao Sentry do erro que falhou na redução na seção 8); 04/11/2026 (`documentacao-tecnica`, pedido 0010: versão 0.1.9; `devops-sre`, pedido 0010: rollback da 0.1.9 na seção 6, para a `v0.1.8`, e o que muda no log e no Sentry na seção 8); 03/11/2026 (`documentacao-tecnica`, pedido 0009: versão 0.1.8; `devops-sre`, pedido 0009: rollback da 0.1.8 na seção 6 e fim do bloqueio de dado pessoal da primeira publicação na seção 4, com o M-1 do 0009 como risco residual; antes, `devops-sre`: actions por SHA na seção 10, rollback da 0.1.6 e da 0.1.7 na seção 6, bloqueio da primeira publicação pelo M-a do 0008 na seção 4; `documentacao-tecnica`: versão 0.1.7; antes, na 0.1.6, primeira publicação bloqueada pelo M-1 na seção 4, guarda do seed na seção 7, `erro_requisicao` na seção 8 e 408 e 409 do aviso na seção 9) |
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

A tabela é o desenho. Na produção, desde 10/11/2026, o `app` e o `worker` têm origem GitHub (ramo `main`), e não a
imagem do GHCR: ver a seção 4.

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

**Situação em 11/11/2026: a 0.2.0 está no ar.** Publicação feita por Fabiano por volta das 17h20 (horário de
Brasília):

- **Antes do Deploy:**
  - backup manual do banco, `20261111-2012-diario.sql.gz`;
  - as imagens locais em uso foram rotuladas `easypanel/orquestrador/app:v0.1.13` e
    `easypanel/orquestrador/worker:v0.1.13`, para a volta rápida (seção 6, parágrafo da 0.2.0).
- **Deploy:** no Easypanel, primeiro o `worker` e depois o `app`, com origem GitHub no ramo `main`, commit `a9fd9b8`
  (`a9fd9b82351006eaf9efac61ed4038a392afccdb`, merge do PR #16).
- **Saúde:** `GET /api/saude` respondeu 200. As duas primeiras chamadas deram 503, por pool de conexões frio, e não se
  repetiram.
- **Aceite:** Fabiano conferiu no computador e no iPhone, por volta das 17h40.

> **Aviso para a 0.3.0.** Os serviços têm origem GitHub no ramo `main`, então o Easypanel monta a imagem a partir do
> que estiver na `main` na hora do Deploy. Depois do merge da 0.3.0, **qualquer Deploy do `app`** (ou do `worker`), até
> um Deploy feito só para trocar uma variável, leva a 0.3.0 e a migration `0007` junto. A imagem não aplica migration
> ao subir (`pnpm start`). Sem a `0007` aplicada antes, o `app` sobe com a saúde em 503 (seção 8). Por isso a 0.3.0 se
> publica pela seção 5: backup antes, migration num passo separado, Deploy depois. Até essa publicação, não faça Deploy
> dos serviços. Se o "Auto Deploy" estiver ligado no `app` ou no `worker`, o próprio merge dispara esse Deploy sem a
> migration: confira que está desligado **antes** do merge.

**Situação em 10/11/2026: a 0.1.13 estava no ar** (plano da primeira publicação, CA-P5-16). O resto desta seção fica como
registro de como a primeira publicação foi preparada. O estado da produção foi conferido pelo maestro, só lendo, na
etapa 09 do pedido 0015 (`docs/construcao/DEC-DEM-20261110-0015-v1/09-devops-sre.md`):

- os serviços são `orquestrador_app` e `orquestrador_worker`, com as imagens `easypanel/orquestrador/app` e
  `easypanel/orquestrador/worker`. O Easypanel monta essas imagens **a partir do GitHub**, e não usa a imagem do GHCR
  da seção 2. O `app` foi atualizado pela última vez em 10/11 às 14h45 UTC;
- o repositório não tem webhook nem segredo de Actions. `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER` não
  existem (P16 da publicação, pendente). Assim, o merge na `main` publica a imagem no GHCR e não dispara deploy;
- falta conferir no painel: se o "Auto Deploy" está desligado no `app` e no `worker`, e, pelo registro da publicação,
  se o `db` foi recriado em Postgres 16 e se a porta do app vem da `PORT` do Easypanel.

Com a origem GitHub, a volta de versão é a descrita no parágrafo da 0.2.0, na seção 6, e pede a credencial de leitura
do GHCR cadastrada antes.

Antes de 10/11, a produção não tinha versão no ar, então não havia para onde voltar. A 0.1.0 foi mergeada e a imagem
dela ficou no GHCR, mas os serviços do Easypanel não tinham sido criados. Depois do merge da 0.1.6, a `:latest`
passou a ser a 0.1.6, com as mesmas 7 migrations da 0.1.0.

**Bloqueio de dado pessoal (CA-P5-16, CA-P5-21): sai com a 0.1.8.** A 0.1.6 tinha o M-1 (texto livre da demanda sem
minimizar para o token de agente), que a 0.1.7 (pedido 0008) fechou na demanda; o M-a da revisão do 0008 mantinha o
bloqueio, porque o DEC, a ESP e o RSK ainda entregavam texto livre sem minimizar. A 0.1.8 (pedido 0009) fecha o M-a:
para o ator que não é pessoa, todo texto livre de DEC (inclusive `demandaTitulo`, `demandaDescricao` e
`decisao.comentarios`), ESP e RSK passa pela mesma minimização da demanda, na leitura, na listagem e no 201 da criação.
Por isso, **só comece o passo 1 com a 0.1.8 ou posterior mergeada na `main`**: a 0.1.6 e a 0.1.7 não podem ser a
primeira publicação.

Fica um **risco residual (M-1 da revisão do 0009)**, para aceite de Fabiano e da `gestao-riscos`. Até a 0.1.9, só o
nome **atual e completo** do solicitante era trocado. A 0.1.10 (pedido 0011, opção (b) refinada decidida por Fabiano
em 04/11) troca também cada parte do nome atual com 3 letras ou mais, quando no texto ela começa por maiúscula, sem
diferença de acento, com as partículas e os sufixos de parentesco de fora. A 0.1.11 (pedido 0012) troca também a parte
grudada em número, em `_` ou em CamelCase (`Joana2`, `Joana_Ficticia`, `@JoanaFicticia`, B-1 da revisão do 0011), e o
nome completo com `_` entre as partes, mesmo em minúscula (`joana_ficticia`). Continuam saindo em claro para o agente:
a parte escrita toda em minúscula (`joana pediu`, aceito no RSK do 0011), o nome todo em maiúscula sem separador entre
as partes (`JOANAFICTICIA`), a parte curta quando outra parte do nome começa por ela e as duas vêm grudadas
(`AnaBelax` com `Ana` e `Anabela`, B-3 da revisão do 0012), o nome antigo de antes de uma edição da demanda (a troca usa
o nome atual) e nomes de outras pessoas. Não é regressão e não bloqueia a publicação.

1. Snapshot no hPanel.
2. Criar o projeto e o serviço `db` (Postgres 16). O usuário criado pelo Easypanel é o **migrator** (dono do banco).
3. No `db`, criar o papel do app com senha forte gerada na hora (a de `scripts/hml/criar-papeis.sql` é fictícia e
   nunca é usada aqui):
   `CREATE ROLE orquestrador_app LOGIN PASSWORD '<senha nova>' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;`
4. Criar os serviços `app` e `worker` (seção 2) com as variáveis da seção 3, **sem** iniciar ainda.
5. Mergear o PR e esperar o `deploy.yml` publicar a imagem (passo "Publicar"). O que vem depois depende do push:
   - **com migration nova** (como no merge da 0.1.0 e no da 0.3.0, que traz a `0007`): a execução fica verde, com o
     aviso de migration pendente;
   - **sem migration nova** (como nos merges da 0.1.1 à 0.1.13 e da 0.2.0, que não mudam `drizzle/`): roda o passo
     "Disparar o Easypanel".
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

### Publicação da 0.3.0 (migration `0007`, serviços com origem GitHub)

A 0.3.0 é a primeira versão com migration desde a publicação, e os serviços montam a imagem a partir do GitHub (seção
4). A ordem continua **backup → migrate → deploy**. Tudo aqui é de Fabiano, depois do PR aprovado; nada disto roda no
/construir.

A `0007` é aditiva: afrouxa o `NOT NULL` de `token_servico.agente`, cria a coluna anulável `token_servico.integracao`,
amplia dois CHECK, cria quatro CHECK novos e o índice `evento_acao_entidade_idx`. Nenhuma linha muda
(`alteram_dado: false` no ensaio). Os `ADD CONSTRAINT` leem as tabelas inteiras, e o `CREATE INDEX` segura a escrita em
`evento` enquanto roda; com o volume de hoje, isso leva milissegundos.

1. **Antes do merge:**
   - conferir no Easypanel que o "Auto Deploy" está desligado no `app` e no `worker` (aviso da seção 4);
   - rotular as imagens em uso (a 0.2.0) para a volta rápida, como foi feito com a `v0.1.13` em 11/11:
     `easypanel/orquestrador/app:v0.2.0` e `easypanel/orquestrador/worker:v0.2.0`. Conferir com
     `docker image ls easypanel/orquestrador/app` e `docker image ls easypanel/orquestrador/worker`.
2. **Snapshot no hPanel.** Atenção: desde 06/11/2026, até a Hostinger resolver, o snapshot congela o servidor e exige
   reboot manual. Com a produção no ar, decida antes se tira o snapshot ou se fica só com o backup do passo 4.
3. **Merge do PR** (Fabiano). O `deploy.yml` publica no GHCR as tags `<sha do merge>`, `v0.3.0` e `latest` e, por
   haver migration nova, **não** chama webhook: a execução fica verde, com o aviso "Deploy parado antes da produção".
   Nada muda na produção, que segue na 0.2.0.
4. **Backup** pelo passo 2 acima (`pg_dump --create`, arquivo `<AAAAMMDD-HHMM>-antes-v0.3.0.sql`, `chmod 600`, conferir
   que não está vazio). É este arquivo que a volta da 0.3.0 restaura (seção 6). Se usar a rotina do backup manual de
   11/11 (`.sql.gz`), confira que o dump sai com `--create`, porque a restauração da seção 6 recria o banco a partir
   dele.
5. **Migration, num passo separado**, pelo passo 3 acima, com a imagem do GHCR do commit do merge
   (`ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:<sha do merge>`). O host precisa ler o GHCR: se
   `docker pull` dessa imagem pedir login, entrar com o token de leitura (`read:packages`) por
   `docker login ghcr.io --password-stdin`, sem o token na linha de comando. Saída esperada: `Migrations aplicadas.`
   - Daqui até o passo 6 terminar, a 0.2.0 continua servindo o painel, mas `GET /api/saude` responde 503, porque a
     última migration do banco deixa de ser a do journal da imagem dela. Faça o passo 6 logo em seguida.
   - Erro na migration: a saída traz só a classe e o código, e a 0.2.0 segue no ar. Não faça o Deploy; a volta é a
     restauração da seção 6 (caminho B), sem trocar imagem.
6. **Deploy** do `worker` e depois do `app` no Easypanel, origem GitHub no ramo `main` (o commit do merge). O Easypanel
   monta a imagem antes de subir, o que leva alguns minutos por serviço.
7. **Conferência** pela seção 8: a saúde em 200 (as primeiras chamadas podem dar 503 com o pool frio, como na 0.2.0),
   o batimento do worker e a entrada com conta real. Na fila, as demandas de antes aparecem com origem "Pessoa". Se a
   saúde não voltar a 200 em 5 minutos, seção 6.
8. **Só depois, e com Fabiano:** emitir os tokens de produção `awave` e `construir`, ligar o `orquestrador.json` do
   /construir e rodar o teste ponta a ponta pela rede interna. A revisão (08 do pedido 0016) recomenda corrigir os
   médios M-1 a M-5 numa 0.3.1 **antes** de emitir os tokens. Sem token emitido, nenhuma integração alcança as rotas
   novas (401).

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

### Volta da 0.3.0 para a 0.2.0 (caminho B, com restauração)

A 0.3.0 traz a migration `0007`. A 0.2.0 sobe sobre o banco migrado, mas a saúde dela responde 503, porque a última
migration do banco não é a do journal dela. Por isso **a volta para a 0.2.0 exige restaurar o backup tirado antes da
publicação** (passo 4 da publicação da 0.3.0, seção 5). Tudo o que foi gravado entre o backup e a volta se perde:
demandas, decisões, eventos, as demandas criadas pelo Awave e os tokens emitidos depois do backup. Restaurar é decisão
de Fabiano.

1. Snapshot no hPanel, com o mesmo aviso do passo 2 da publicação: hoje o snapshot congela o servidor e exige reboot
   manual.
2. Se as integrações já estiverem ligadas, desligar a busca do /construir no `orquestrador.json`. Não é preciso revogar
   os tokens: o backup é anterior à emissão, e eles deixam de existir com a restauração (401 dali em diante). O Awave
   passa a receber 401 até a 0.3.0 voltar e os tokens serem emitidos de novo.
3. Parar o `app` e o `worker` no Easypanel.
4. Restaurar o backup pelo passo 3 do caminho B acima. Com o arquivo `.sql.gz`, descompactar na entrada do `psql`
   (`gunzip -c <arquivo> | docker exec -i <contêiner do db> psql -v ON_ERROR_STOP=1 -U <usuário migrator> -d postgres`),
   depois do `DROP DATABASE`.
5. No `worker` e depois no `app`: trocar a origem de GitHub para "Docker image" com
   `easypanel/orquestrador/worker:v0.2.0` e `easypanel/orquestrador/app:v0.2.0` (rotuladas no passo 1 da publicação), e
   fazer o Deploy. Se as imagens locais não existirem mais, usar a do GHCR
   `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:a9fd9b82351006eaf9efac61ed4038a392afccdb` (a `v0.2.0`, merge
   do PR #16), com a credencial de leitura do GHCR da seção 2; confirme a tag em Packages antes.
   - **Não** volte só fazendo Deploy com a origem GitHub: a `main` já tem a 0.3.0, e o Deploy montaria a 0.3.0 de novo.
6. Conferir a seção 8.
7. Para publicar a correção, voltar a origem para GitHub e repetir a publicação da seção 5, com backup novo.

Ensaio na homologação em 12/11/2026 (`construir.mjs ensaiar-rollback`, etapa 09): `ok: true`,
`alteram_dado: false`, **`volta_sem_restaurar: false`**. As migrations da `main` não foram alteradas, e a única nova
(`0007`) não altera dado existente. A 0.2.0 subiu, o banco ganhou backup (117 KB) e a 0.3.0 migrou por cima e respondeu
200 na saúde. A 0.2.0 só voltou com o backup restaurado: banco igual ao backup, mesma impressão. Depois, a 0.3.0 subiu
de novo.

### Volta das versões anteriores (registro)

A 0.2.0 não traz migration: `drizzle/` não muda em relação à 0.1.13, e o journal é o mesmo da 0.1.13 à 0.1.0. Ela muda
só a camada visual e não grava valor novo no banco:

- as duas leituras novas da fila (total por status e etapas ESP, RSK e DEC de cada linha) são só `SELECT`;
- a T05 lê o DEC mais novo por uma leitura que já existia;
- a decisão, no computador e no celular, envia os mesmos campos pela mesma Server Action e grava as mesmas linhas;
- variáveis, `Dockerfile`, workflows e `docker-compose.hml.yml` não mudam;
- a única dependência nova são as fontes `@fontsource/noto-sans` e `@fontsource/noto-sans-mono` 5.3.0
  (`devDependencies`). Elas entram no `next build` pelo `next/font/local` e saem servidas pelo próprio app, em
  `/_next/static/media`, sem domínio novo na CSP.

A volta da 0.2.0 é o caminho A, para
`ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:198e97db928256fc301071f1bca9966a4de6bed4` (a `v0.1.13`, commit
de merge do PR #15 na `main`), sem restaurar backup. Antes de voltar, confirme a tag em Packages. A 0.1.13 é a versão
publicada em 10/11/2026 (plano da primeira publicação, CA-P5-16), então a 0.2.0 é a primeira versão que entra **por
cima de uma produção em uso**, e a volta é para uma versão que já rodou nesse banco.

Se o serviço estiver com origem GitHub (imagem montada pelo próprio Easypanel a partir do repositório), o caminho A não
tem tag para trocar. A volta é trocar a origem do `worker` e do `app` para "Docker image" com a tag acima, com a
credencial de leitura do GHCR da seção 2, e fazer o deploy (worker primeiro). Sem essa credencial cadastrada no
Easypanel, não há volta rápida. Por isso, cadastre a credencial **antes** de publicar a 0.2.0.

Na publicação de 11/11/2026 (seção 4), a volta rápida ficou pronta de outro jeito: as imagens locais em uso foram
rotuladas `easypanel/orquestrador/app:v0.1.13` e `easypanel/orquestrador/worker:v0.1.13`. A volta da 0.2.0 é trocar a
origem do `worker` e depois do `app` para "Docker image" com essas tags e fazer o Deploy, sem credencial do GHCR. Isso
vale enquanto a 0.2.0 for a versão no ar; depois da 0.3.0, a volta é a de "Volta da 0.3.0 para a 0.2.0", acima.

Ao voltar, não se perde dado:

- o painel volta ao visual da 0.1.13: cabeçalho de antes, fila sem contadores nem etapas, T05 sem a barra de etapas
  nem o cartão "Próxima ação", e T11 com o rádio "Decisão" e o botão "Registrar decisão", sem o arranjo do celular;
- as sessões continuam valendo, porque o `BETTER_AUTH_SECRET` é o mesmo;
- a decisão registrada pela 0.2.0 é a mesma linha que a 0.1.13 grava e lê.

Uma aba aberta antes da troca pode recusar o próximo envio ou a próxima navegação, porque os arquivos e as Server
Actions de um build não existem no outro. Recarregar a página resolve. Vale nas duas direções, na publicação e na volta.

A volta é só para indisponibilidade que a própria 0.2.0 cause, e a correção vem logo depois. Ensaio na homologação em
11/11/2026 (`construir.mjs ensaiar-rollback`, etapa 09): nenhuma migration nova (`alteram_dado: false`),
`volta_sem_restaurar: true`. A 0.1.13 subiu, o banco ganhou backup, a 0.2.0 subiu por cima e respondeu 200 na saúde, a
0.1.13 voltou sobre o mesmo banco, o backup foi restaurado e conferido, e a 0.2.0 subiu de novo.

A 0.1.13 não traz migration: `drizzle/` não muda em relação à 0.1.12, e o journal é o mesmo da 0.1.12 à 0.1.0. O
"substituído" é calculado na leitura, sem coluna nem status novo. Dois dados novos podem existir no banco depois dela, e a
0.1.12 os lê sem erro:

- **O evento `pacote_decisao_substituido`** no histórico. A coluna `acao` é texto sem restrição, e o `depois` leva só
  os dois ids de DEC. Na 0.1.12, a linha aparece no histórico da demanda com a data e quem aprovou, mas com a coluna
  do que aconteceu vazia (o `textoDoEvento` dela não conhece a ação), e Antes e Depois vazios, como em todo evento que não
  é de status nem de campo. O `GET /api/demandas/:id/historico` devolve o evento como está gravado.
- **Demanda com dois ou mais DEC aprovados.** A 0.1.12 não marca o substituído: sem selo, sem aviso e com a seção do
  pedido na T11. O gerar dela não confere a substituição, então o DEC substituído volta a gerar Pedido de Construção
  quando não está desatualizado. São dois Pedidos válidos da mesma demanda, o risco que a 0.1.13 fecha. O A-02 também
  volta: nenhum DEC novo se aprova numa demanda que já tem DEC aprovado (409 "outro pacote desta demanda já está
  aprovado."), e a recusa por nome da 0.1.12 volta a não ter saída dentro da demanda (E5 do 0013).

A volta da 0.1.13 é o caminho A, para
`ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:89eca465e96ae7a3b729205dff69c70417c372b3` (a `v0.1.12`,
commit de merge do PR #14 na `main`), sem restaurar backup. Antes de voltar, confirme a tag em Packages. Enquanto a
0.1.12 estiver no ar depois da volta:

1. Antes de gerar um Pedido de Construção, abra a demanda (T05) e confira os pacotes.
2. Só gere do DEC aprovado de maior versão.
3. Com mais de um DEC aprovado, os de versão menor são os substituídos: não gere deles, nem use um pedido já gerado deles.

A volta é só para indisponibilidade que a própria 0.1.13 cause, e a correção vem logo depois. Se a 0.1.13 for a
primeira publicação (seção 4), não há versão no ar para onde voltar: a volta é parar `app` e `worker` no Easypanel, e
não publicar a 0.1.12 no lugar dela. O ensaio é o `ensaiar-rollback` da Parada 3.

A 0.1.12 não traz migration: `drizzle/` não muda em relação à 0.1.11, e o journal é o mesmo da 0.1.11 à 0.1.0. O único
valor novo gravado no banco é o `depois` `{ "confirmaSemDadoPessoal": true }` do evento `pedido_gerado`, um booleano
fixo no `jsonb` do histórico, que a 0.1.11 lê sem diferença: o histórico dela mostra "Gerou o Pedido de Construção de
<DEC-id>", sem citar a confirmação, e as colunas Antes e Depois ficam vazias para esse evento nas duas versões. A recusa
por nome e a recusa sem a confirmação não gravam nada, e o `aprovadoPor` com o papel só existe no arquivo baixado, que o
sistema não guarda. A volta da 0.1.12 é o caminho A, para
`ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:b9e52d6828ec2496a2fcdce066dfaa908f6160f8` (a `v0.1.11`,
commit de merge do PR #13 na `main`), sem restaurar backup. Antes de voltar, confirme a tag em Packages. Ao voltar, reabrem: o Pedido de Construção
volta a sair com o nome do solicitante no texto, sem recusa (D1 do 0013), e com o nome de quem aprovou em
`decisao.aprovadoPor` (D2 do 0013), e a T11 volta a gerar sem a caixa de confirmação e sem registrá-la no histórico (D3
do 0013). Quem chama o POST com `{ "confirmaSemDadoPessoal": true }` continua recebendo 200, porque a rota da 0.1.11 não
lê corpo. O mesmo DEC gerado nas duas versões dá arquivos diferentes (o `aprovadoPor`); dentro de cada versão, o CA-22.2
continua valendo. Por isso, enquanto a 0.1.11 estiver no ar depois da volta, nenhum Pedido de Construção é gerado de
demanda real (JUR-2026-002, item 7.4), a volta é só para indisponibilidade que a própria 0.1.12 cause, e a correção vem
logo depois. Se a 0.1.12 for a primeira publicação (seção 4), não há versão no ar para onde voltar: a volta é parar
`app` e `worker` no Easypanel, e não publicar a 0.1.11 no lugar dela. O ensaio é o `ensaiar-rollback` da Parada 3.

A 0.1.11 não traz migration: `drizzle/` não muda em relação à 0.1.10, e o journal é o mesmo da 0.1.10 à 0.1.0. Ela não
grava valor novo no banco: o detector de e-mail novo e a troca do nome grudado valem só no texto que vai ao agente, na
resposta da API ao ator que não é pessoa e na busca de dado pessoal que bloqueia o Pedido de Construção (que não grava
nada), o aviso e a dica são só texto da tela, e as mudanças em `reduzirErro`, `mapearErro`, no log, no console saneado e
no gancho `onRequestError` são só no log, no envio ao Sentry e na resposta 500 de erro interno. O que o agente escreveu
com a 0.1.11 pode trazer mais `[nome removido]` e `[e-mail removido]` no texto, marcadores que a 0.1.10 já produz e lê
sem diferença. A volta da 0.1.11 é o caminho A, para
`ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:2e621de1c91f31d9ed636a3e7ad38c939bebac11` (a `v0.1.10`,
commit de merge do PR #12 na `main`), sem restaurar backup. Antes de voltar, confirme a tag em Packages. Ao voltar,
reabrem: a regex de e-mail de custo quadrático (M-a do 0011), em que um texto longo sem `@` (100 mil caracteres, o
limite do texto bruto) trava o event loop do `worker` ou do `app` por até cerca de 20 s a cada minimização ou busca do
Pedido de Construção; o usuário de e-mail com acento sai em parte em claro (`joã[e-mail removido]`, B-2 do 0011); a
parte do nome grudada em número, `_` ou CamelCase sai em claro para o agente (B-1 do 0011); um erro com getter que lança
em `name`, `code` ou `cause`, ou um Proxy, volta a escapar da `rota()` sem chegar ao log nem ao Sentry (B-3 do 0011); e
o aviso e a dica voltam a não dizer o limite de 3 letras, as partículas e a parte em minúscula (B-4 do 0011). Como a
própria 0.1.10 tem o M-a, que pode ser a causa de lentidão, a volta é só para indisponibilidade que a 0.1.11 cause, e a
correção vem logo depois. Se a 0.1.11 for a primeira publicação (seção 4), não há versão no ar para onde voltar: a volta
é parar `app` e `worker` no Easypanel, e não publicar a 0.1.10 no lugar dela. O ensaio é o `ensaiar-rollback` da
Parada 3.

A 0.1.10 não traz migration: `drizzle/` não muda em relação à 0.1.9, e o journal é o mesmo da 0.1.9 à 0.1.0. Ela não
grava valor novo no banco: a troca de cada parte do nome do solicitante é só no texto que vai ao agente (entrada do
worker) e na resposta da API ao ator que não é pessoa (o Pedido de Construção e a pessoa continuam com o original), a
dica e o aviso são só texto da tela, os 3 POST de ESP, RSK e DEC gravam as mesmas linhas e só passam a ler os nomes da
linha travada, dentro da transação, e as mudanças em `reduzirErro` e `capturarErro` são só no log e no envio ao Sentry.
O que o agente escreveu com a 0.1.10 pode trazer `[nome removido]` no texto, como já trazia na 0.1.9 para o nome
completo, e a 0.1.9 lê esse texto sem diferença. A volta da 0.1.10 é o caminho A, para
`ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:fb675ee1df144b52a01d0baa4b20df5d8edc367f` (a `v0.1.9`,
commit de merge do PR #11 na `main`), sem restaurar backup. Antes de voltar, confirme a tag em Packages. Ao voltar, o
primeiro nome, o sobrenome ou outra parte do nome do solicitante voltam a sair em claro para o agente e na API de quem
não é pessoa (M-1 do 0009), a dica do campo de nome e o aviso de minimização voltam a prometer que o nome não chega ao
agente, uma renomeação do solicitante no meio de um POST de ESP, RSK ou DEC volta a poder sair no 201 com o nome novo
(B-3 do 0010), o `name` que não é texto ou que muda entre leituras volta a poder ir ao log e ao título do Sentry (B-2 do
0010), e uma falha na redução volta a deixar o erro marcado sem ter ido ao Sentry (B-4 do 0010): a volta é só para
indisponibilidade, e a correção vem logo depois. Se a 0.1.10 for a primeira publicação (seção 4), não há versão no ar
para onde voltar: a volta é parar `app` e `worker` no Easypanel, e não publicar a 0.1.9 no lugar dela. O ensaio é o
`ensaiar-rollback` da Parada 3.

A 0.1.9 não traz migration: `drizzle/` não muda em relação à 0.1.8, e o journal é o mesmo da 0.1.8 à 0.1.0. Ela não
grava valor novo no banco: o filtro de classe e de `code` do erro é só no log e no título do Sentry, o envio único ao
Sentry por objeto de erro não escreve no banco, o rótulo de `demanda_final` é só texto da tela (o motivo já é gravado
desde a 0.1.5), e os 3 POST de ESP, RSK e DEC só passam a ler os nomes da demanda antes de gravar, com as mesmas linhas
gravadas. A volta da 0.1.9 é o caminho A, para
`ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:1d6d8976f6ca317fe33caf6a8358f37d8b5c0c1d` (a `v0.1.8`,
commit de merge do PR #10 na `main`), sem restaurar backup. Antes de voltar, confirme a tag em Packages. Ao voltar, o
log e o título do Sentry voltam a aceitar `code` com 10 ou mais dígitos e qualquer identificador como classe (B-1 do
0009), a falha ao ler os nomes depois de gravar volta a responder 500 com o artefato gravado, e a nova tentativa do
agente cria versão duplicada (B-3 do 0009), o mesmo erro de route handler pode ir duas vezes ao Sentry (B-a do 0008), e
o histórico volta a mostrar só "Agente … não rodou" para `demanda_final`: a volta é só para indisponibilidade, e a
correção vem logo depois. Se a 0.1.9 for a primeira publicação (seção 4), não há versão no ar para onde voltar: a volta
é parar `app` e `worker` no Easypanel, e não publicar a 0.1.8 no lugar dela. O ensaio é o `ensaiar-rollback` da
Parada 3.

A 0.1.8 não traz migration: `drizzle/` não muda em relação à 0.1.7, e o journal é o mesmo da 0.1.7 à 0.1.0. Ela não
grava valor novo no banco: a minimização do texto livre de DEC, ESP e RSK é só na resposta da API ao ator que não é
pessoa (o Pedido de Construção continua lendo o banco, com o texto original), e a redução do erro em objeto simples é
só no log. A volta da 0.1.8 é o caminho A, para
`ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:3c8a942f48011aadc093afc92b88dd774f0242d8` (a `v0.1.7`,
commit de merge do PR #9 na `main`). Antes de voltar, confirme a tag em Packages. Ao voltar, o token de agente volta a
receber sem minimizar o texto livre de DEC, ESP e RSK (M-a do pedido 0008), e o log volta a gravar o erro em objeto
simples como veio (B-b): a volta é só para indisponibilidade, e a correção vem logo depois. Se a 0.1.8 for a primeira
publicação (seção 4), não há versão no ar para onde voltar: a volta é parar `app` e `worker` no Easypanel, e não
publicar a 0.1.7 no lugar dela. O ensaio é o `ensaiar-rollback` da Parada 3.

A 0.1.7 não traz migration: `drizzle/` não muda em relação à 0.1.6, e o journal é o mesmo da 0.1.6 à 0.1.0. Ela não
grava valor novo no banco: a minimização do texto livre da demanda e o corte de nome em ESP, RSK e DEC são só na
resposta da API ao ator que não é pessoa, e o envio do `console.error` ao Sentry não escreve no banco. A volta da 0.1.7
é o caminho A, para `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:75a2b0ff2e4c59b462ab0b3700e6a543886d8c48`
(a `v0.1.6`, commit de merge do PR #8 na `main`). Antes de voltar, confirme a tag em Packages. Ao voltar, o token de
agente volta a receber o texto livre da demanda sem minimizar e o nome de pessoa nas leituras de ESP, RSK e DEC (M-1 e
M-2 do pedido 0008), e o erro fora de requisição deixa de ir ao Sentry (M-3): a volta é só para indisponibilidade, e a
correção vem logo depois. Se a 0.1.7 for a primeira publicação (seção 4), não há versão no ar para onde voltar: a
volta é parar `app` e `worker` no Easypanel. O ensaio é o `ensaiar-rollback` da Parada 3.

A 0.1.6 não traz migration: `drizzle/` não muda em relação à 0.1.5, e o journal é o mesmo da 0.1.5 à 0.1.0. Ela não
grava valor novo no banco: as recusas novas (409 de demanda em status final e o seed fora do loopback) não escrevem
nada, e o 408 e o 409 do Resend só reaproveitam o estado `pendente` do aviso, que a 0.1.5 já conhece. A volta da 0.1.6 é
o caminho A, para `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:e0d5f4c39740275c31e4f4de55874128adb52e78`
(a `v0.1.5`, commit de merge do PR #7 na `main`). Antes de voltar, confirme a tag em Packages. Ao voltar, o agente volta
a ler `solicitanteNome`, anexos e o nome da conta pela API (M-06), e o console do app volta a levar a mensagem de erro
(M-05): a volta é só para indisponibilidade, e a correção vem logo depois. O ensaio é o `ensaiar-rollback` da Parada 3.

A 0.1.5 não traz migration: o journal dela é o mesmo da 0.1.4 à 0.1.0, e o `/api/saude` da 0.1.4 responde 200 sobre o
mesmo banco. O único dado novo é o motivo `demanda_final` no `jsonb` do evento `agente_ignorado`, que a 0.1.4 lê sem
restrição de valor (o histórico mostra "Agente … não rodou" nas duas versões). A volta da 0.1.5 é o caminho A, para
`ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:cf36ec5fe634ec27004817e30f656d92a80eb23d` (a `v0.1.4`, commit
de merge do PR #6 na `main`). Antes de voltar, confirme a tag em Packages: sem os segredos de webhook, a limpeza do GHCR
não roda e a `v0.1.4` continua lá. Essa volta só foi conferida no código. O ensaio é o `ensaiar-rollback` da Parada 3.

A 0.1.4 também não trouxe migration; a volta dela era o caminho A, para
`ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:00a924ec746d731c9c0c9fb9a95bcf4c6d7f3c17` (a `v0.1.3`, commit
de merge do PR #5 na `main`).

A 0.1.3 também não trouxe migration; a volta dela era o caminho A, para
`ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:b8a8c4457dc0603ffb2fc30418cfe906d6684131` (a `v0.1.2`, commit
de merge do PR #4 na `main`), com a alternativa
`ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:01a26a8321a1bd630c6bb1f70a8b68bfa5bd775f` (merge do PR #3,
mesmo código).

A 0.1.2 também não trouxe migration; a volta dela era o caminho A, para
`ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:30b71b5185cb58d403847b95532e54b5a299e77a` (a `v0.1.1`, commit
de merge do PR #2 na `main`).

A 0.1.1 também não trouxe migration; a volta dela era o caminho A, para
`ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:dd8ddee6d8a30cda8dff0f1a45f0abe30db8f364` (a `v0.1.0`).

## 7. Homologação

- **Local (a do /construir):** `docker-compose.hml.yml` sobe `db`, `app` e `worker` só com valores fictícios escritos
  no próprio arquivo, sem `.env`, e publica só o app em `127.0.0.1:${HML_PORTA}`. O `construir.mjs homologar` sobe,
  espera `/api/saude`, roda `pnpm test:e2e` com `BASE_URL` e derruba tudo, volumes inclusive.
- **Se um dia houver homologação no Easypanel:** acesso restrito (autenticação básica do Easypanel ou lista de IPs),
  `BETTER_AUTH_URL` em https, banco próprio e separado do de produção, e nenhum dado real.
- **`SEED_FICTICIO` nunca no serviço de produção (M-07).** O seed cria contas com senha e segredo TOTP públicos, que
  estão no git (`scripts/seed-ficticio.ts`). Ele recusa banco que já tem demanda ou conta e, desde a 0.1.6, recusa
  `BETTER_AUTH_URL` fora do loopback, antes de abrir conexão: com o https de produção, sai com código 1 e "Seed fictício
  não rodou: BETTER_AUTH_URL não aponta para o loopback (...)", sem gravar nada
  ([manual, cap. 10](../manual-tecnico/10-configuracao-e-scripts.md#scripts-de-operação)). A guarda é uma segunda
  barreira; a regra continua sendo não pôr a variável em produção, nem por um deploy.

## 8. Conferência depois de cada deploy ou rollback

1. `GET https://<domínio>/api/saude` responde 200 `{"status":"ok"}`. 503 = banco fora ou migration diferente da imagem.
2. Logs do `app` e do `worker` no Easypanel sem `worker_configuracao_invalida` nem `worker_falha_ao_subir` (as
   mensagens citam só o nome da variável). Desde a 0.1.6, o log do `app` não traz mensagem nem pilha de erro de tela:
   erro de página ou layout aparece como `erro_requisicao`, com `rota`, `erro` (classe e código) e `erroId`, e erro que
   chega ao console como `console_erro` ou `console_aviso`. No Sentry, o mesmo erro tem a tag `evento` igual a
   `erro_requisicao` e o título `<classe> <code>`, sem o `erroId`: case pela hora, pela classe e pelo código
   ([manual, cap. 02](../manual-tecnico/02-acesso-e-seguranca.md#log-e-sentry-rnf-10-c-20-c-21)). Desde a 0.1.9, a
   classe só aparece quando termina em `Error` ou `Exception` ou é uma classe do projeto (fora disso, sai `Error` no log
   e no Sentry, ou `desconhecido` no log quando o erro já chega reduzido), o `code` com 10 ou mais dígitos seguidos não
   aparece, e o mesmo objeto de erro vai uma vez só ao Sentry, mesmo que chegue ao gancho e ao console; cada
   `console.error` continua deixando a sua linha no log. Desde a 0.1.10, o `name` do erro só vira classe quando é texto
   (fora disso, sai `Error`), e o objeto só conta como enviado depois que o Sentry o recebe: se a redução do erro falhar
   na primeira vez, a próxima chegada do mesmo objeto ainda gera um evento. Desde a 0.1.11, um erro que lança ao ter
   `name`, `code` ou `cause` lido (getter ou Proxy) aparece no log e no Sentry com a classe `Error`, e a rota responde
   500 `erro_interno`; quando nem dá para saber se é um Error (Proxy cujo protótipo não se lê), o log diz
   `desconhecido`, e a linha `console_erro` sai sem o campo `erro`.
3. Em `/configuracao/agentes`, batimento do worker com menos de 5 minutos e uma instância só.
4. Entrar com uma conta real (senha e 2FA) e abrir a fila de demandas.

## 9. Alertas mínimos

| Sinal | Limiar | Ação |
|---|---|---|
| `/api/saude` diferente de 200 | 3 falhas seguidas em 5 min | Logs do `app` e do `db`; se veio de deploy, seção 6 |
| Batimento do worker (`/configuracao/agentes`) | mais de 5 min sem bater | Logs do `worker`; deploy do serviço; conferir variáveis |
| Duas instâncias de worker | qualquer ocorrência | Conferir réplicas = 1 no Easypanel |
| Erro novo no Sentry (com DSN) | primeira ocorrência de cada tipo | Triagem pelo `tech-lead`; incidente se afetar decisão ou dado |

Aviso por e-mail no Sentry, desde a 0.1.5 ([manual, cap. 07](../manual-tecnico/07-worker-avisos-retencao.md#rf-25-aviso-por-e-mail)):

- `aviso_email_falhou`: o aviso de um DEC terminou `falhou`. Chega na 1ª tentativa quando o Resend recusa de vez (4xx
  que não é 408, 409 nem 429; com 401 ou 403, confira primeiro `RESEND_API_KEY` no worker) e na 3ª quando a falha é
  passageira (408, 409, 429, 5xx, rede ou tempo limite; o 408 e o 409 desde a 0.1.6) ou é um erro inesperado. O DEC
  continua na fila do painel; o e-mail não é reenviado sozinho.
- `aviso_erro_inesperado`: só quando nem a contagem da tentativa gravou, ou seja, banco fora. Conferir o `db` e a
  saúde (seção 8).

O monitor externo da saúde ainda não existe: até lá, a conferência é a da seção 8.

## 10. Pendências do pipeline

- [x] **Actions por SHA (feita em 03/11/2026, na 0.1.6):** as 9 linhas `uses:` dos dois workflows estão fixadas pelo
  SHA completo do commit da versão, com a versão em comentário, sem troca de versão maior:
  `actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 # v5.1.0` (5 no `ci.yml` e 1 no `deploy.yml`) e
  `actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444 # v5.0.0` (3 no `ci.yml`). Os SHAs foram conferidos na
  API do GitHub em 03/11/2026, e o CI do PR da 0.1.6 é a prova de que resolvem. Para atualizar uma action, troque o SHA e
  o comentário juntos, pelo commit da tag nova; mudar de versão maior (v6) pede revisão do `devops-sre`.
- [x] **Imagem do gitleaks por digest (feita em 31/10/2026):** o CI usa
  `ghcr.io/gitleaks/gitleaks:v8.28.0@sha256:cdbb7c955abce02001a9f6c9f602fb195b7fadc1e812065883f695d1eeaba854`, o digest
  que o próprio CI baixou para a tag.
- **Primeira execução do gitleaks:** o repositório tem senhas fictícias de propósito (homologação, seed, e2e). Se o
  gitleaks acusar alguma, a triagem é do `seguranca-aplicacao`; nada entra em lista de exceção sem essa revisão.
- **Tamanho da imagem:** cerca de 1,77 GB em disco (440 MB de conteúdo), medido na 0.3.0 pela imagem da homologação;
  era 1,76 GB e 438 MB na 0.2.0, e 1,74 GB e 426 MB na 0.1.7. O tamanho vem de o worker, a migration e os scripts rodarem por `tsx`, que é
  dependência de desenvolvimento. Compilar o worker e os scripts no build permitiria instalar só as dependências de
  produção na imagem final. O estágio `build` continuaria com a instalação completa, porque as fontes da 0.2.0
  (`@fontsource/*`) são `devDependencies` lidas pelo `next build`.
- **Auditoria de dependências:** o CI roda `pnpm audit --prod --audit-level high`, mas a imagem final leva também as
  `devDependencies` (estágio `deps` com a instalação completa). Elas ficam fora do portão. Proposta da 0.2.0: conferir
  `pnpm audit --audit-level high` sem `--prod` e, se não houver achado alto nem crítico, tirar o `--prod` do `ci.yml`,
  para o portão cobrir o que vai na imagem.
