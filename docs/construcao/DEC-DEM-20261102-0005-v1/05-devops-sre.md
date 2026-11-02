---
pedido: DEC-DEM-20261102-0005-v1
etapa: 05-entrega
agente: devops-sre
leu: [pedido.json, contrato-passagem.md, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-frontend.md, 04-qa-automacao.md, 04-maestro.md, passagens.jsonl, DEC-DEM-20261102-0004-v1/05-devops-sre.md, Dockerfile, .dockerignore, .github/workflows/ci.yml, .github/workflows/deploy.yml, docs/operacao/deploy.md, test/estatico/decisao-e2e.test.ts (linhas 1 a 40), git diff main...HEAD]
status: bloqueado
proximo: devops-sre
devolvido_para: null
---
## Entrega

Conferi a entrega da 0.1.4 contra a da 0.1.3. **Nenhum arquivo de entrega foi alterado.** Falta um item só, o
`docker build` local: para rodá-lo, preciso de um comando fora da minha lista Pode (ver Pendências). O resto está
conferido abaixo.

### O que mudou entre a `main` (0.1.3, `00a924e`) e o ramo

Pelo `git diff --stat main...HEAD`, mudaram 11 arquivos:

- 4 de código, todos de teste ou de versão:
  - `e2e/decisao.spec.ts`: o axe no "Arquivar" e o reflow do cabeçalho;
  - `test/estatico/decisao-e2e.test.ts`: arquivo novo da 04-regressao;
  - `test/estatico/projeto.test.ts`: o `it` da versão;
  - `package.json`: só o campo `version`, de `0.1.3` para `0.1.4`;
- 7 da pasta do pedido.

Rodei o `git diff --stat main...HEAD` só nos caminhos `src`, `scripts`, `drizzle`, `.github`, `Dockerfile`,
`.dockerignore`, `docker-compose.hml.yml`, `docker-entrypoint.sh`, `.env.example` e `docs/operacao`. Saiu vazio: nada
disso mudou. O axe não achou violação na tela arquivada, então `src/` ficou como estava (03 e 04-maestro).

### Imagem

- O estágio final do `Dockerfile` copia `src`, `scripts`, `drizzle`, `.next` e os arquivos de configuração da raiz.
  Não leva `e2e/` nem `test/`.
- Por isso a imagem 0.1.4 só difere da 0.1.3 no `package.json` (versão). Ela também carrega o `.next` refeito pelo
  build, sem mudança de código.
- O estágio `build` copia o repositório inteiro, e o arquivo novo de `test/` entra nele, mas só o `pnpm build` roda ali.
  Rodei o `pnpm build` no repositório, que é o comando desse estágio:
  - passou;
  - o TypeScript terminou limpo;
  - as rotas são as mesmas da 0.1.3;
  - o `git status` depois saiu limpo.
- **`docker build` local: não rodou** (Pendências, primeira linha).
- `docker image ls ws-orquestrador-demandas` mostra só a imagem da 0.1.3, que ficou de antes:
  `ws-orquestrador-demandas:local` (`c5267d163176`), com 1,73 GB em disco e 425 MB de conteúdo.
- Nada foi publicado.

### `.env.example` contra o código

- O `src/` não mudou desde a 0.1.3, porque o diff restrito a `src` saiu vazio.
- O arquivo de teste novo lê só arquivos do repositório, sem `process.env`.
- As variáveis lidas pelo código são, então, as mesmas da 05 do pedido 0003, conferidas lá com o grep de
  `process.env`:
  - em `env.ts`: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CABECALHO_IP_CLIENTE` e
    `RETENCAO_TEXTO_BRUTO_DIAS`;
  - em `env-worker.ts`: `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `EMAIL_REMETENTE` e `EMAIL_AVISO_DECISAO`;
  - `LOG_LEVEL`, `SENTRY_DSN`, `NODE_ENV` e `NEXT_RUNTIME`.
- O `.env.example` tem todas, só pelo nome. Nenhuma variável nova.
- O grep não rodou (ver Decisões tomadas).

### Pipeline continua valendo sem mudança

- **`ci.yml`:**
  - dispara em `pull_request` e por `workflow_call`;
  - roda `lint`, `typecheck`, `test`, `test:e2e`, `pnpm audit`, gitleaks e `docker build` sem publicar;
  - não usa segredo nem chama webhook.

  O `test/estatico/decisao-e2e.test.ts` entra sozinho no `pnpm test`. Ele usa `globSync` de `node:fs` e só lê
  arquivos do checkout, sem git nem rede, então roda no Node 24 do CI. A fixture da 0.1.3 está no próprio arquivo e
  não exige histórico. O "Arquivar" com o axe novo entra no `pnpm test:e2e`.
- **`deploy.yml`:**
  - dispara só em `push` na `main`;
  - o job `publicar` repete a guarda `github.ref == 'refs/heads/main'`;
  - a versão vem do `package.json`, então a imagem sai com a tag `v0.1.4` sem mudança no workflow.
- **`.dockerignore`:** `.env`, `.env.*`, `.git`, `.github` e `docs` continuam fora do contexto.

### Na publicação da 0.1.4 (Fabiano, depois do merge)

- **Sem migration nova:** `drizzle/` não mudou.
  - O `deploy.yml` segue para o passo dos webhooks.
  - A seção 5 do `deploy.md` (backup, migrate e deploy) não se aplica.
- **O merge publica a imagem no GHCR** com três tags: `:<sha do merge>`, `:v0.1.4` e `:latest`.
- **Os segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER` continuam sem cadastro.** Até lá, como nos merges
  da 0.1.1 à 0.1.3:
  - o passo "Disparar o Easypanel" falha e a execução fica vermelha, sem deploy;
  - a limpeza do GHCR não roda.
- **Rollback da 0.1.4: caminho A da seção 6.**
  - A volta é só trocar a imagem de `worker` e `app`, sem restaurar backup.
  - O journal de migrations da 0.1.4 é igual ao da 0.1.3, então o `/api/saude` da 0.1.3 responde 200 sobre o mesmo
    banco.
  - O alvo é `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:00a924ec746d731c9c0c9fb9a95bcf4c6d7f3c17`, a
    `v0.1.3`. É o merge do PR #5 e a ponta atual da `main`.
  - Antes de voltar, confirme a tag em Packages. Não conferi o GHCR, porque ele está fora da minha lista Pode.
  - Nesta etapa da cadeia curta, a volta não foi ensaiada: o ensaio é o `ensaiar-rollback` da Parada 3.

## Decisões tomadas

- Nenhum arquivo de entrega mudou: o diff não toca em src, scripts, drizzle, .github, Dockerfile, docker-compose.hml.yml nem docs/operacao. O contrato da 05 manda alterar só o que a correção exigir, e a 02-tech-lead pediu o mesmo.
- O docker build não rodou e a etapa ficou bloqueada. Só existem dois jeitos de rodá-lo, e nenhum deles está liberado:
  - o `docker build -t ws-orquestrador-demandas:local .` da lista Pode usa o diretório atual como contexto, e o meu Bash começa na estruturaAutonoma e não troca de pasta;
  - a forma com o caminho absoluto foi vedada pelo maestro neste prompt. Na 05 do pedido 0004, ela era liberada por delegação de Fabiano válida até 18h de Brasília de 02/11, e esse horário já passou.
- Rodei o pnpm build (lista Pode) para reduzir o risco do item que ficou aberto. Ele é o comando do estágio build do Dockerfile, mas não substitui o docker build: não prova o estágio final nem o tamanho da imagem.
- O grep de process.env em src não rodou, pelo mesmo motivo de diretório: no meu Bash, ele procuraria no src da estruturaAutonoma. A ferramenta Grep não está disponível nesta sessão. A conferência do .env.example se apoia em duas coisas: o diff restrito a src saiu vazio, e a 05 do pedido 0003 conferiu o mesmo src com o grep.
- O alvo do rollback é 00a924e: é o merge do PR #5, a única imagem 0.1.3 que o deploy.yml construiu, e a ponta da main.
- O deploy.md fica como está, como nas 05 dos pedidos 0002 a 0004. Só mudam o campo "Versão", a frase da :latest na seção 4 e o alvo do rollback na seção 6, e a 06-documentacao faz isso junto com o CHANGELOG.

## Pendências

- Bloqueado: o `docker build` local exige o comando `docker build -t ws-orquestrador-demandas:local /home/deploy/servidor/projetos/ws-orquestrador-demandas` (o contexto com o caminho absoluto), que está fora da lista Pode e foi vedado neste prompt. Ele cria a imagem local e não publica nada. Para seguir, preciso de uma liberação de Fabiano para esse comando, ou de uma sessão cujo Bash comece no repositório do pedido.
- Quando for liberado, falta só isto: rodar o `docker build` e o `docker image ls ws-orquestrador-demandas`, registrar o resultado e o tamanho, e regravar esta entrega como `pronto`. O resto já está conferido acima.
- Para a `06-documentacao`, em `docs/operacao/deploy.md`:
  - na tabela do topo, "Versão" para `0.1.4` e "Atualizado em";
  - na seção 4, a `:latest` da primeira publicação passa a ser a 0.1.4, ainda com as mesmas 7 migrations;
  - na seção 6, registrar que a 0.1.4 não traz migration e que a volta dela é o caminho A, para
    `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:00a924ec746d731c9c0c9fb9a95bcf4c6d7f3c17` (a `v0.1.3`). O
    parágrafo da 0.1.3 fica como histórico.
- Para Fabiano, antes da primeira publicação: continua a pendência dos PR #1 a #5.
  - Cadastrar os segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER` no GitHub.
  - Seguir a seção 4 do `deploy.md`.
  - Tirar snapshot no hPanel antes de qualquer passo.
- Continuam de antes: as actions por SHA e o tamanho da imagem, na seção 10 do `deploy.md`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo construcao/DEC-DEM-20261102-0005-v1, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -10` — 760a616 (04-revisao) no topo, sobre 00a924e (main 0.1.3)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat main...HEAD` — 11 arquivos: 4 de código (`e2e/decisao.spec.ts`, `package.json`, `test/estatico/decisao-e2e.test.ts` e `test/estatico/projeto.test.ts`) e 7 da pasta do pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat main...HEAD -- src scripts drizzle .github Dockerfile .dockerignore docker-compose.hml.yml docker-entrypoint.sh .env.example docs/operacao` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff main...HEAD -- package.json` — só `version` 0.1.3 → 0.1.4
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --first-parent --format=%H%x20%s -6 main` — merge do PR #5 em 00a924ec746d731c9c0c9fb9a95bcf4c6d7f3c17 (0.1.3)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas build` — passou; TypeScript limpo, as mesmas rotas
- `docker image ls ws-orquestrador-demandas` — só a imagem anterior, `ws-orquestrador-demandas:local` (c5267d163176), 1,73 GB em disco, 425 MB de conteúdo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — vazio depois do build

## Critério de pronto atendido

- [x] o CI roda lint, typecheck, test e, se houver tela, e2e (`ci.yml` sem mudança; o teste estático novo entra no `pnpm test` e o axe do arquivado no `pnpm test:e2e`)
- [ ] `docker build` local passa (comando e tamanho da imagem na entrega): não rodou, ver Pendências
- [x] `.env.example` tem toda variável lida pelo código (`src/` igual ao da 0.1.3, conferido com grep na 05 do pedido 0003; desta vez sem grep, ver Decisões tomadas)
- [x] o rollback está descrito passo a passo (`deploy.md`, seção 6; a 0.1.4 usa o caminho A, com alvo `00a924e`, a `v0.1.3`)
- [x] nenhum arquivo tem segredo (nenhum arquivo de entrega mudou; esta entrega cita os segredos só pelo nome)
- [x] nenhuma imagem foi publicada e nenhum webhook foi chamado
- [x] `deploy.yml` só dispara em `push` na `main`; nenhum workflow publica imagem nem chama webhook em outro ramo ou em `pull_request`
