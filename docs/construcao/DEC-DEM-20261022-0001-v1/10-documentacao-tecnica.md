---
pedido: DEC-DEM-20261022-0001-v1
etapa: 10-documentacao
agente: documentacao-tecnica
leu: [pedido.json, contrato-passagem.md, padrao-tecnico.md, 2026-10-25-ws-orquestrador-demandas-design.md, 2026-10-25-ws-orquestrador-demandas-plano.md (cabeçalho, G1 a G6 e mapa das fases), parada-P1.md, 02-arquiteto-solucoes.md (seções 1 e 2), 04-seguranca-aplicacao.md (seção 5), 07-qa-funcional.md (trechos de U-01 e QF), 08-maestro.md, 08-correcao-engenheiro-backend.md, 08-seguranca-aplicacao.md, 09-devops-sre.md, package.json, pnpm-workspace.yaml, .env.example, Dockerfile, docker-compose.dev.yml, docker-compose.hml.yml, playwright.config.ts, .github/workflows/ci.yml, .github/workflows/deploy.yml, docs/operacao/deploy.md, src/lib (env.ts, env-worker.ts, rota.ts, erros.ts, corpo.ts), src/modules (acesso, demandas, especificacoes, pareceres-risco, pacotes-decisao, pedido-construcao, agentes, dados-pessoais, historico, retencao, avisos, limites.ts), src/worker, src/jobs/batimento.ts, src/app/api (rotas), src/app/(painel) (lista de telas), src/db/schema, drizzle/*.sql, scripts (migrate, start-hml, seed-ficticio, criar-usuario, desativar-conta, criar-token-servico, revogar-token-servico, definir-preco-modelo, hml/criar-papeis.sql), construir.mjs e lib/verificacao.mjs (regra do CHANGELOG)]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

Arquivos criados no repositório do sistema:

- `README.md`: o que o sistema é, onde está cada documento, requisitos da máquina, instalar e verificar (comandos do
  padrão técnico, seção 3), ver o sistema de pé pela homologação local, desenvolver com o banco local (papel
  `orquestrador_app`, `.env.local`, migrate, seed, `pnpm dev`, worker), tabela dos comandos do `package.json` e as
  regras de quem mexe no código.
- `CHANGELOG.md`: seção `## 0.1.0 — 2026-10-31` (passa na regex de `temEntradaNoChangelog`), com o que entrou, as
  correções da 08 (S-01 com as versões novas e o override do `zod`, A-01 a A-05), as verificações, as pendências
  abertas para Fabiano (M-01 a M-07, o médio novo do reteste, as 5 moderadas, SHAs das actions e digest do gitleaks,
  segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER`, credencial do GHCR, acesso Admin, variáveis do
  Easypanel, leitura do QR no U-01, J-01 a J-03), a documentação fora desta etapa e o que fica fora da versão.
- `docs/manual-tecnico/README.md`: ficha (data, dono, fonte de verdade), índice, mapa de cada RF (RF-01 a RF-26) para o
  capítulo e a seção, e glossário.
- `docs/manual-tecnico/01-arquitetura.md` a `10-configuracao-e-scripts.md`:

| Capítulo | RF e RNF |
|---|---|
| 01 Arquitetura | RNF-01 (versões do `package.json`: next 16.4.1, better-auth 1.7.7, zod 4.6.6, override do zod), RNF-02, RNF-05, RNF-17, ADR-01 a ADR-12 |
| 02 Acesso e segurança | RF-01, RF-02, matriz de acesso, proteção das rotas, RNF-10, RNF-12, RNF-13 |
| 03 Demandas | RF-03 a RF-07, RF-15, RF-21 |
| 04 Versões e decisão | RF-08 a RF-14 |
| 05 Pedido de Construção | RF-22, RF-23 |
| 06 Agentes de IA | RF-16 a RF-20 e as pré-condições para ligar agente (04, seção 5, item 7) |
| 07 Worker, avisos e retenção | RF-24, RF-25, batimento |
| 08 Painel | RF-26 (12 telas e o e-mail), RNF-11 |
| 09 Referência da API | todas as rotas, quem pode, corpo, exemplos e tabela de erros |
| 10 Configuração e scripts | variáveis só pelo nome, com quem lê e a regra; os 8 scripts |

Trechos alterados em `docs/operacao/deploy.md`:

| Linha | Antes | Depois |
|---|---|---|
| 10-11 (ficha) | sem data nem dono | "Atualizado em 31/10/2026" e "Dono: `devops-sre`" |
| 42-43 (seção 2) | "O painel `/configuracao` avisa…" | `/configuracao/agentes`, a rota que existe em `src/app/(painel)/configuracao/agentes/page.tsx` |
| 86-96 (seção 3) | sem os requisitos de operação do O-01 | HTTPS com HSTS (o app manda o cabeçalho em produção, `next.config.ts:21`), SPF e DKIM do remetente, backup de no máximo 30 dias (texto bruto some em até 90 + 30 dias), agentes desligados com link para as pré-condições |
| 191 (seção 8, item 3) | `/configuracao` | `/configuracao/agentes` |
| 199 (seção 9, tabela) | `/configuracao` | `/configuracao/agentes` |

Versões que mudaram na 08 (next 16.4.1, better-auth 1.7.7, zod 4.6.6): escritas no capítulo 01 (tabela do RNF-01) e no
`CHANGELOG.md`. O RNF-01 da spec e do `01`, a linha de stack do plano e o `padrao-tecnico.md` ficam como estão: estão
fora da lista **Pode** desta etapa (Pendências).

## Decisões tomadas

- O manual segue o código, não a spec (padrão técnico, seção 11): cada capítulo cita os arquivos de onde saiu, e cada
  limite conhecido (M-01 a M-07, médio do reteste, B-01, B-04) aparece no capítulo onde a pessoa vai procurar.
- Um capítulo por grupo de RF, com mapa RF → seção no índice: quem procura um requisito acha a seção em um clique.
- As versões novas foram para o capítulo 01 e o `CHANGELOG.md` porque são os documentos do repositório que esta etapa
  edita; os de fora vão a Pendências, sem editar.
- `/configuracao` → `/configuracao/agentes` no `deploy.md`: a rota sem `/agentes` não existe no código, e a correção é
  só de texto, sem mudar `Dockerfile` nem workflow, então não cabe devolver à 09.
- HSTS, SPF/DKIM e retenção de backup entraram no `deploy.md`, seção 3: o plano (G2) dá o O-01 a esta etapa, e só os
  três itens faltavam no texto da 09.
- A referência da API ficou marcada como uso interno: publicar fora exige aprovação de Fabiano.
- O README não repete senha nem segredo fictício: aponta para `CONTAS_FICTICIAS` no `scripts/seed-ficticio.ts` e para
  o `docker-compose.dev.yml`.
- `## 0.1.0 — 2026-10-31` no CHANGELOG: confere com `^##\s+\[?v?0\.1\.0\]?(\s|$)` de `lib/verificacao.mjs`.

## Pendências

- Para o maestro (fora da lista **Pode** desta etapa, que só edita `README.md`, `CHANGELOG.md`, `docs/manual-tecnico/`
  e `docs/operacao/`): atualizar para next 16.4.1, better-auth 1.7.7 e zod 4.6.6, e registrar o override do zod:
  - RNF-01 em `docs/superpowers/specs/2026-10-25-ws-orquestrador-demandas-design.md:61` e em
    `docs/construcao/DEC-DEM-20261022-0001-v1/01-analista-requisitos.md:439`;
  - linha de stack do plano, `docs/superpowers/plans/2026-10-25-ws-orquestrador-demandas-plano.md:18-19`;
  - `padrao-tecnico.md` da estruturaAutonoma, seção 1 (tabela e a frase "hoje 16.3.8").
- Para Fabiano ou o `arquiteto-solucoes`: o `padrao-tecnico.md` diz que mudar de linha do Next (16.3 → 16.4) pede ADR.
  A troca entrou como correção de segurança (S-01), sem ADR. Decidir se o ADR é feito ou se a regra do padrão muda.
- Para o backlog do `tech-lead`: comentários e nomes de teste ainda dizem "Better Auth 1.7.6"
  (`src/modules/acesso/bloqueio-verificacao.ts:5`, `src/db/schema/acesso.ts:1` e `:88`,
  `src/modules/acesso/verificacao.test.ts:209`, `two-factor-colunas.test.ts:1`, `sonda-mutacao-qa.test.ts:3`,
  `src/db/schema/acesso.test.ts:163`).
- Para quem não escreveu o README: a seção "Desenvolver com banco local" não foi executada nesta etapa, porque o papel
  não tem Bash. Pede um teste de ponta a ponta por outra pessoa ou agente.
- Para Fabiano na P3, já no `CHANGELOG.md`: M-01 a M-07, o médio novo do reteste, as 5 moderadas, SHAs e digest, os
  segredos e a credencial do GHCR, o acesso Admin, a leitura do QR (U-01) e J-01 a J-03.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (10) o README diz como rodar, com os comandos do padrão técnico
- [x] (10) o manual técnico descreve cada RF e cita variável de ambiente só pelo nome
- [x] (10) as notas de versão listam o que entrou e as pendências abertas
- [x] os links internos apontam para arquivos que existem
