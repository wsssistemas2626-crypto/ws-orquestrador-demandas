# syntax=docker/dockerfile:1
# Imagem única do ws-orquestrador-demandas (ADR-01; padrão técnico, seção 9). O mesmo artefato roda os dois processos:
#   app:    `pnpm start`  (comando padrão; painel + API, porta 3101)
#   worker: `pnpm worker` (comando trocado no serviço do Easypanel)
# Na homologação local, o app sobe por `pnpm start:hml` (docker-compose.hml.yml). Sem HEALTHCHECK aqui: a imagem também
# roda o worker, que não serve /api/saude; o healthcheck fica no serviço do app.
#
# Nenhum segredo entra na imagem: o build não recebe variável de ambiente do app, e tudo o que o app e o worker leem vem
# do serviço (docs/operacao/deploy.md).

FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm \
    COREPACK_HOME=/usr/local/share/corepack \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    NEXT_TELEMETRY_DISABLED=1
# pnpm na versão do packageManager, baixado no build: o contêiner não baixa nada ao subir. O `pnpm --version` busca já
# aqui o binário nativo do pnpm 12, que ele baixa no primeiro uso para dentro do COREPACK_HOME (só de leitura depois).
RUN corepack enable && corepack prepare pnpm@12.6.0 --activate && pnpm --version
WORKDIR /app

# Dependências pelo lockfile, sem resolver nada de novo (o override do zod fica no pnpm-workspace.yaml).
# Instalação completa: o worker, as migrations e os scripts de operação rodam por `tsx`, que é dependência de
# desenvolvimento no package.json.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm build

# Estágio final: só o que app, worker, migrations e scripts usam. Código e dependências ficam do root, só de leitura
# para o usuário node; o Next escreve só em .next (cache).
FROM base AS final
# O pnpm 12 confere as dependências antes de cada `pnpm <script>`: refaz os atalhos de node_modules/.bin (o usuário node
# não pode, e o processo sai com 1) e consulta o registro na rede. A imagem já vem instalada pelo lockfile, então os
# dois ficam desligados no contêiner.
ENV NODE_ENV=production \
    PORT=3101 \
    pnpm_config_verify_deps_before_run=false \
    pnpm_config_update_notifier=false
COPY --from=deps /app/node_modules ./node_modules
# --chmod: o pnpm grava o lockfile e o pnpm-workspace.yaml com modo 600, e o usuário node precisa lê-los.
COPY --chmod=644 package.json pnpm-lock.yaml pnpm-workspace.yaml next.config.ts tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
COPY drizzle ./drizzle
COPY --from=build --chown=node:node /app/.next ./.next
USER node
# Conferência no build: o pnpm roda como node sem baixar nada (o COREPACK_HOME é só de leitura para ele).
RUN pnpm --version
EXPOSE 3101
CMD ["pnpm", "start"]
