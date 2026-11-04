# Deploy, operação e rollback do ws-orquestrador-demandas

| Campo | Valor |
|---|---|
| Versão | 0.1.11 |
| Imagem | `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas` (privada) |
| Tags | `<sha do commit>`, `v<versão do package.json>` e `latest`; o GHCR guarda só as 2 versões mais recentes |
| Workflows | `.github/workflows/ci.yml` (pull request e antes de publicar) e `.github/workflows/deploy.yml` (push na `main`) |
| Quem executa | Tudo o que mexe em produção (serviço, variável, banco, migration, rollback) é de Fabiano, pelo Easypanel |
| Atualizado em | 04/11/2026 (`devops-sre`, pedido 0013: rollback da 0.1.12 na seção 6, para a `v0.1.11`, e merges sem migration até a 0.1.12 na seção 4); 04/11/2026 (`documentacao-tecnica`, pedido 0012: versão 0.1.11; `devops-sre`, pedido 0012: rollback da 0.1.11 na seção 6, para a `v0.1.10`, risco residual do M-1 do 0009 reduzido de novo na seção 4 e erro que lança ao ser lido na seção 8); 04/11/2026 (`documentacao-tecnica`, pedido 0011: versão 0.1.10; `devops-sre`, pedido 0011: rollback da 0.1.10 na seção 6, para a `v0.1.9`, risco residual do M-1 do 0009 reduzido na seção 4 e reenvio ao Sentry do erro que falhou na redução na seção 8); 04/11/2026 (`documentacao-tecnica`, pedido 0010: versão 0.1.9; `devops-sre`, pedido 0010: rollback da 0.1.9 na seção 6, para a `v0.1.8`, e o que muda no log e no Sentry na seção 8); 03/11/2026 (`documentacao-tecnica`, pedido 0009: versão 0.1.8; `devops-sre`, pedido 0009: rollback da 0.1.8 na seção 6 e fim do bloqueio de dado pessoal da primeira publicação na seção 4, com o M-1 do 0009 como risco residual; antes, `devops-sre`: actions por SHA na seção 10, rollback da 0.1.6 e da 0.1.7 na seção 6, bloqueio da primeira publicação pelo M-a do 0008 na seção 4; `documentacao-tecnica`: versão 0.1.7; antes, na 0.1.6, primeira publicação bloqueada pelo M-1 na seção 4, guarda do seed na seção 7, `erro_requisicao` na seção 8 e 408 e 409 do aviso na seção 9) |
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
GHCR, mas os serviços do Easypanel não foram criados. Depois do merge da 0.1.6, a `:latest` passa a ser a 0.1.6, com
as mesmas 7 migrations da 0.1.0.

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
   - **com migration nova** (como no merge da 0.1.0): a execução fica verde, com o aviso de migration pendente;
   - **sem migration nova** (como nos merges da 0.1.1 à 0.1.12, que não mudam `drizzle/`): roda o passo "Disparar o
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

A 0.1.12 não traz migration: `drizzle/` não muda em relação à 0.1.11, e o journal é o mesmo da 0.1.11 à 0.1.0. O único
valor novo gravado no banco é o `depois` `{ "confirmaSemDadoPessoal": true }` do evento `pedido_gerado`, um booleano
fixo no `jsonb` do histórico, que a 0.1.11 lê sem diferença: o histórico dela mostra "Gerou o Pedido de Construção de
<DEC-id>", sem citar a confirmação, e as colunas Antes e Depois ficam vazias para esse evento nas duas versões. A recusa
por nome e a recusa sem a confirmação não gravam nada, e o `aprovadoPor` com o papel só existe no arquivo baixado, que o
sistema não guarda. A volta da 0.1.12 é o caminho A, para a imagem do commit de merge do PR #13 na `main` (`b9e52d6`, a
`v0.1.11`), sem restaurar backup. A tag dessa imagem é o sha completo desse commit, que o clone local não tem: confira-o
em Packages, na versão que também tem a tag `v0.1.11`, antes de voltar. Ao voltar, reabrem: o Pedido de Construção
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
- **Tamanho da imagem:** cerca de 1,74 GB em disco (426 MB comprimidos), porque o worker, a migration e os scripts rodam
  por `tsx`, que é dependência de desenvolvimento. Compilar o worker e os scripts no build permitiria instalar só as
  dependências de produção.
