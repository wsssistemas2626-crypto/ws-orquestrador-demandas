---
pedido: DEC-DEM-20261103-0008-v1
etapa: 05-entrega
agente: devops-sre
leu: [contrato-passagem.md, pedido.json, 02-tech-lead.md, 03-engenheiro-backend.md, 04-maestro.md, .github/workflows/ci.yml, .github/workflows/deploy.yml, .env.example, docs/operacao/deploy.md, package.json]
status: pronto
proximo: documentacao-tecnica
devolvido_para: null
---
## Entrega

A correção da 0.1.7 não mexe no pipeline nem na imagem. `git diff --stat main...HEAD` restrito a `drizzle`, `.github`,
`Dockerfile`, `.dockerignore`, `docker-entrypoint.sh`, `docker-compose.hml.yml`, `.env.example`, `src/lib/env.ts`,
`src/lib/env-worker.ts` e `pnpm-lock.yaml` saiu vazio: sem migration, sem dependência nova, sem variável nova, workflows
iguais aos da `main` (`75a2b0f`, 0.1.6). Conferi e mantive como estão `ci.yml`, `deploy.yml`, `Dockerfile`,
`.dockerignore` e `.env.example`.

### Verificações

| Verificação | Resultado |
|---|---|
| CI (`ci.yml`) | `pull_request` e `workflow_call`: lint, typecheck, test (Testcontainers), e2e (Playwright contra o build de produção), `pnpm audit --prod --audit-level high`, gitleaks e `docker build` sem publicar. Não publica, não usa segredo, não chama webhook |
| Deploy (`deploy.yml`) | só `on: push: branches: [main]`, e o job `publicar` tem `if: github.event_name == 'push' && github.ref == 'refs/heads/main'`. Nenhum outro ramo nem `pull_request` publica imagem ou chama webhook |
| `docker build -t ws-orquestrador-demandas:local .` | passou (código de saída 0; `next build` compilou as 34 rotas). `docker image ls ws-orquestrador-demandas`: `ws-orquestrador-demandas:local`, id `872f0b1b35c0`, 1,74 GB em disco, 426 MB de conteúdo, igual à 0.1.6 |
| Versão da imagem | `package.json` em `0.1.7`, copiado para a imagem no estágio final; o `deploy.yml` lê dele a tag `v0.1.7` |
| `grep -rn "process.env" src` | lidas pelo código: `NEXT_RUNTIME`, `SENTRY_DSN`, `LOG_LEVEL`, `NODE_ENV` e o objeto inteiro em `lerConfigApp` e `lerConfigWorker` (`env.ts`, `env-worker.ts`, sem mudança neste ramo). Todas estão no `.env.example` (as de imagem e do Next como comentário); nenhuma nova |
| `pnpm typecheck` | limpo |
| `pnpm lint` | limpo |
| Segredo | nenhum arquivo do ramo traz segredo; o `deploy.md` cita variáveis e segredos só pelo nome |
| Publicação | nenhuma imagem publicada, nenhum webhook chamado, nada no Easypanel |

### `docs/operacao/deploy.md`

- **Seção 6 (rollback):** parágrafo novo da 0.1.7. Sem migration (journal igual ao da 0.1.6) e sem valor novo gravado
  no banco: a volta é o **caminho A**, só trocando a imagem de `worker` e depois `app` para
  `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:75a2b0ff2e4c59b462ab0b3700e6a543886d8c48` (a `v0.1.6`,
  merge do PR #8), sem restaurar backup. Registrado o efeito da volta (M-1, M-2 e M-3 reabrem; volta só para
  indisponibilidade) e que, se a 0.1.7 for a primeira publicação, a volta é parar `app` e `worker`.
- **Seção 4 (primeira publicação):** a 0.1.7 fecha o M-1 na demanda, mas a publicação segue bloqueada pelo **M-a** da
  revisão do 0008 (cópia do título e da descrição da demanda no DEC, `comentarios` da decisão e texto de ESP e RSK sem
  minimizar para o agente), até um pedido 0009 ou o aceite por escrito de Fabiano e da `gestao-riscos`.
- Cabeçalho "Atualizado em" com as duas mudanças. O campo "Versão" fica para a `06-documentacao`, junto com o
  `CHANGELOG.md`.

## Decisões tomadas

- Nada muda em `.github/`, `Dockerfile` nem `.env.example`: a correção é só de `src/`, testes e versão, como a 02 previu.
- Rollback da 0.1.7 pelo caminho A, sem `ensaiar-rollback` nesta etapa: o contrato da `05-entrega` não o lista, e o ensaio fica com a Parada 3 do maestro, como nas versões anteriores.
- O bloqueio da primeira publicação passou a citar o M-a, não o M-1: a 04-maestro pediu o `deploy.md` com o M-a aberto, e deixar o texto antigo levaria a publicar depois deste merge.
- Dois comandos rodaram com o caminho absoluto do repositório do pedido, porque o Bash do agente roda fora do repositório; o maestro liberou os dois e registrou a liberação no `passagens.jsonl`. O primeiro foi o `docker build -t ws-orquestrador-demandas:local` com o caminho do repositório no lugar do `.`, liberado por delegação de Fabiano de 03/11, sem publicar. Ele passou com código 0 e gerou a imagem `872f0b1b35c0`. O segundo foi o `grep -rn "process.env"` sobre o `src` do repositório, liberado pela regra de 25/10 porque só lê. As variáveis que ele encontrou estão na tabela da Entrega.

## Pendências

- Para a Parada 3: `ensaiar-rollback` e o CI do PR. A volta da 0.1.7 foi conferida no código (`drizzle/` igual à `main`).
- Para a `06-documentacao`: campo "Versão" do `deploy.md` e entrada 0.1.7 do `CHANGELOG.md`, com o M-a aberto e bloqueando a primeira publicação.
- Herdada da 04-maestro: M-a (pedido 0009 ou aceite de Fabiano e da `gestao-riscos`), B-a e B-b.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261103-0008-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --stat -6 --format=%h%x20%s` — commits do pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat main...HEAD` — 31 arquivos, nada em `.github/`, `drizzle/` nem Docker
- `grep -rn "process.env" src` — falhou: o Bash do agente roda fora do repositório (`src: No such file or directory`)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log main -3 --format=%H%x20%s` — sha da `v0.1.6` (`75a2b0ff…`)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat main...HEAD -- drizzle .github Dockerfile .dockerignore docker-entrypoint.sh docker-compose.hml.yml .env.example src/lib/env.ts src/lib/env-worker.ts pnpm-lock.yaml` — vazio
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — só `docs/operacao/deploy.md`
- `docker image ls ws-orquestrador-demandas` — `ws-orquestrador-demandas:local`, 1,74 GB em disco, 426 MB de conteúdo

## Critério de pronto atendido

- [x] o CI roda lint, typecheck, test e, se houver tela, e2e
- [x] `docker build` local passa (comando e tamanho da imagem na entrega)
- [x] `.env.example` tem toda variável lida pelo código (conferido com `grep -rn "process.env" src`)
- [x] o rollback está descrito passo a passo
- [x] nenhum arquivo tem segredo
- [x] nenhuma imagem foi publicada e nenhum webhook foi chamado
- [x] `deploy.yml` só dispara em `push` na `main`; nenhum workflow publica imagem nem chama webhook em outro ramo ou em `pull_request`
