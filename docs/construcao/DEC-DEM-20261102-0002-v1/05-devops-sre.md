---
pedido: DEC-DEM-20261102-0002-v1
etapa: 05-entrega
agente: devops-sre
leu: [pedido.json, contrato-passagem.md, 02-tech-lead.md, 03-engenheiro-frontend.md, 04-maestro.md, passagens.jsonl, .github/workflows/ci.yml, .github/workflows/deploy.yml, Dockerfile, .dockerignore, docker-compose.hml.yml, .env.example, docs/operacao/deploy.md, git diff main...HEAD]
status: bloqueado
proximo: devops-sre
devolvido_para: null
---
## Entrega

Conferência da entrega da 0.1.1 sobre a da 0.1.0. **Nenhum arquivo foi alterado nesta etapa.** A única verificação que
falta é o `docker build` local, porque o Bash desta etapa não consegue rodar o comando dentro da pasta do repositório
(ver Pendências).

### O que mudou entre a `main` (0.1.0) e o ramo

Conferido com `git diff --stat main...HEAD`. Em código, mudaram 8 arquivos: `e2e/apoio.ts`, `e2e/decisao.spec.ts`,
`e2e/parecer-risco-qa.spec.ts`, `e2e/sem-violacoes.spec.ts` (novo), `scripts/seed-ficticio.ts`, `scripts/scripts.test.ts`,
`test/estatico/projeto.test.ts` e `package.json`. Os outros 7 arquivos são da pasta do pedido.

- `package.json`: só o campo `version`, de `0.1.0` para `0.1.1`. Scripts, dependências e `packageManager` estão iguais.
- Não mudaram `src/`, `drizzle/`, `.github/`, `Dockerfile`, `.dockerignore`, `docker-compose.hml.yml`, `.env.example`
  nem `docs/operacao/`.

### Pipeline, imagem e homologação: continuam valendo sem mudança

- **`ci.yml`:** roda `lint`, `typecheck`, `test` (Testcontainers), `test:e2e` contra o build de produção, `pnpm audit`,
  gitleaks no histórico e `docker build` sem publicar. Dispara em `pull_request` e por `workflow_call`. Não usa segredo,
  não publica imagem e não chama webhook. A spec nova, `e2e/sem-violacoes.spec.ts`, entra sozinha no `pnpm test:e2e`.
- **`deploy.yml`:** dispara só em `push` na `main`, e o job `publicar` repete a guarda
  `github.ref == 'refs/heads/main'`. Ele lê a versão do `package.json`, e por isso a imagem sai com a tag `v0.1.1` sem
  nenhuma mudança no workflow.
- **`Dockerfile`:** copia `src`, `scripts` e `drizzle`. A imagem 0.1.1 só difere da 0.1.0 em `scripts/seed-ficticio.ts`,
  com as três demandas fictícias novas, e no `package.json`. `e2e/` e `test/` não entram no estágio final. O seed segue
  protegido pela guarda `SEED_FICTICIO`, que nunca vai para produção (deploy.md, seção 7).
- **`.dockerignore`:** `.env`, `.env.*`, `.git`, `.github` e `docs` continuam fora do contexto.
- **`.env.example`:** nenhum arquivo de `src/` mudou, então o código não lê variável nova desde a conferência do pedido
  anterior. A ESP também proíbe criar variável de ambiente. O `grep -rn "process.env" src` não foi rodado de novo nesta
  etapa, pelo mesmo motivo do `docker build` (Pendências).
- **`docker-compose.hml.yml`:** sem mudança. As três demandas novas nascem do mesmo `SEED_FICTICIO=1` do app da
  homologação.

### `deploy.md`: os procedimentos valem para a 0.1.1 como estão

- **Sem migration nova:** `drizzle/` não mudou. No merge, o `deploy.yml` vê `git diff --quiet <before> <sha> -- drizzle`
  sem diferença e chama sozinho os webhooks, primeiro o do `worker` e depois o do `app` (seção 1, passo 3). As seções 4 e 5
  não se aplicam à 0.1.1.
- **Rollback da 0.1.1: caminho A da seção 6.** Basta trocar a imagem, sem restaurar backup. O journal de migrations da
  0.1.1 é igual ao da 0.1.0, e por isso o `/api/saude` da 0.1.0 responde 200 sobre o mesmo banco. A volta esperada é sem
  restaurar (`volta_sem_restaurar: true`), sem migration que altere dado. Nesta etapa da cadeia curta isso não foi
  ensaiado: o ensaio é o `ensaiar-rollback` da Parada 3.
- **Alvo do rollback:** `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:dd8ddee6d8a30cda8dff0f1a45f0abe30db8f364`,
  o commit de merge da 0.1.0 na `main`, também marcado como `v0.1.0`. A limpeza do GHCR guarda 2 versões, então a 0.1.0
  continua lá depois da publicação da 0.1.1.
- **Uma linha desatualizada:** o campo "Versão" da tabela do topo diz `0.1.0`. É metadado e não muda nenhum passo. Não o
  alterei: ver Decisões.

### Para a publicação da 0.1.1 (Fabiano, depois do merge)

1. Snapshot da VPS no hPanel.
2. Merge do PR. O `deploy.yml` publica `:<sha do merge>`, `:v0.1.1` e `:latest` e chama os webhooks do `worker` e do
   `app`.
3. Conferência da seção 8 do `deploy.md`: saúde 200, logs sem `worker_configuracao_invalida` e um batimento de worker só.
4. Se a saúde não voltar a 200 em 5 minutos, caminho A da seção 6 com a imagem `:dd8ddee6…` nos dois serviços, worker
   primeiro.

**Atenção a uma condição que não consegui conferir daqui.** Os passos acima supõem que a 0.1.0 já está no Easypanel,
pela seção 4, com os segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER` cadastrados no GitHub. Se a seção 4
ainda não foi feita, o push da 0.1.1 publica a imagem, mas o passo "Disparar o Easypanel" fica vermelho com
"Faltam os segredos". Esse push não traz migration, então o workflow não para no aviso de migration, como parou na
0.1.0. Com o passo vermelho, a limpeza do GHCR também não roda nessa execução. Nesse caso, a 0.1.1 é a primeira
publicação: segue a seção 4 com a imagem `:latest` (0.1.1) e as mesmas 7 migrations.

## Decisões tomadas

- Nenhum arquivo de entrega foi alterado: o diff não toca em `src/`, `drizzle/`, `.github/`, `Dockerfile` nem na operação, e o contrato da 05 manda alterar só o que a correção exigir.
- O campo "Versão" do `deploy.md` fica `0.1.0` nesta etapa: não muda nenhum passo, e a `06-documentacao` já atualiza a versão (CHANGELOG da 0.1.1 e B-02). Ela pode trocar o campo e o "Atualizado em" na mesma passada.
- O `docker build` não rodou com caminho absoluto: o maestro mandou registrar a pendência se o Bash não pudesse trocar de pasta, e a forma da lista Pode é `docker build -t ws-orquestrador-demandas:local .`.
- O `homologar` e o `ensaiar-rollback` não foram usados para provar o build: são critérios da 09, não da 05. A Parada 3 os roda. Além disso, a imagem que eles constroem tem outro nome, e o `docker image ls ws-orquestrador-demandas` não leria o tamanho dela.

## Pendências

- Bloqueado: o `docker build -t ws-orquestrador-demandas:local .` precisa rodar dentro de `/home/deploy/servidor/projetos/ws-orquestrador-demandas`, e o Bash desta etapa volta para a estruturaAutonoma a cada chamada. Rodei `cd` para a pasta do repositório, e o `git status` seguinte mostrou `On branch main` da estruturaAutonoma. Para concluir, há duas saídas. A primeira é liberar a forma com o contexto em caminho absoluto, `docker build -t ws-orquestrador-demandas:local /home/deploy/servidor/projetos/ws-orquestrador-demandas`, e a do grep, `grep -rn "process.env" /home/deploy/servidor/projetos/ws-orquestrador-demandas/src`. A segunda é o maestro rodar os dois e me chamar de novo com a saída. O build é local, não publica nada e só cria a imagem `ws-orquestrador-demandas:local`.
- O `docker image ls ws-orquestrador-demandas` não listou nenhuma imagem: não há imagem local para ler o tamanho. A referência da 0.1.0 no `deploy.md` é de cerca de 1,74 GB.
- Para Fabiano, antes do merge: confirmar se a 0.1.0 já está no Easypanel pela seção 4, com os dois segredos de webhook no GitHub. Se não estiver, o `deploy.yml` da 0.1.1 fica vermelho no passo dos webhooks, com a imagem já publicada (Entrega, "Atenção").
- Para a `06-documentacao`: o campo "Versão" (e o "Atualizado em") da tabela do topo do `docs/operacao/deploy.md` passa a 0.1.1.
- Continuam de antes, sem mudança neste pedido: actions por SHA e tamanho da imagem (`deploy.md`, seção 10).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --branch` — ramo construcao/DEC-DEM-20261102-0002-v1, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — 28e5c66 (04-revisao) no topo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat main...HEAD` — 15 arquivos: 8 de código e 7 da pasta do pedido. Fora do diff: `src/`, `drizzle/`, `.github/`, Dockerfile e `docs/operacao/`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff main...HEAD -- package.json` — só `version` 0.1.0 → 0.1.1
- `cd /home/deploy/servidor/projetos/ws-orquestrador-demandas` — a pasta não persiste para a chamada seguinte
- `git status` — `On branch main` da estruturaAutonoma: o Bash não trocou de pasta
- `docker image ls ws-orquestrador-demandas` — nenhuma imagem local
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --format=%H%x20%s -3 main` — main em dd8ddee6d8a30cda8dff0f1a45f0abe30db8f364 (merge do PR #1, 0.1.0)

## Critério de pronto atendido

- [x] o CI roda lint, typecheck, test e, se houver tela, e2e (`ci.yml` sem mudança; a spec nova entra no `pnpm test:e2e`)
- [ ] `docker build` local passa (comando e tamanho da imagem na entrega): pendente, ver Pendências
- [ ] `.env.example` tem toda variável lida pelo código (conferido com `grep -rn "process.env" src`): nenhum arquivo de `src/` mudou, mas o grep não rodou de novo nesta etapa
- [x] o rollback está descrito passo a passo (`deploy.md`, seção 6; a 0.1.1 usa o caminho A)
- [x] nenhum arquivo tem segredo (nenhum arquivo de entrega mudou; esta entrega cita os segredos só pelo nome)
- [x] nenhuma imagem foi publicada e nenhum webhook foi chamado
- [x] `deploy.yml` só dispara em `push` na `main`; nenhum workflow publica imagem nem chama webhook em outro ramo ou em `pull_request`
