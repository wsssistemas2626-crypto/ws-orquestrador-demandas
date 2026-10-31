# WS Orquestrador de Demandas · DEC-DEM-20261022-0001-v1 · versão 0.1.0

## Resumo

Este PR entrega o 1º sistema real construído pelo `/construir`: o **WS Orquestrador de Demandas**. Ele recebe uma
demanda, versiona a especificação (ESP), o parecer de risco (RSK) e o pacote de decisão (DEC), registra a decisão com
dupla aprovação e verificação em duas etapas e gera o Pedido de Construção para o `/construir`. Os quatro agentes de
IA vêm desligados até haver chave da API no CNPJ (CA-E-03).

- Spec: `docs/superpowers/specs/2026-10-25-ws-orquestrador-demandas-design.md`, aprovada na P1 em 25/10.
- Plano: `docs/superpowers/plans/2026-10-25-ws-orquestrador-demandas-plano.md`, com 47 tarefas em 7 fases, aprovado
  na P2 em 25/10 e de novo em 26/10, com a T47.
- Stack: Next.js 16.4.1, Postgres com Drizzle, pg-boss, Better Auth 1.7.7 com 2FA, Zod 4.6.6, Vitest e Playwright.
- Risco do pedido: alto. Modo das paradas: `por_risco`.

## Etapas e tempos

| Etapa | Passagens | Minutos |
|---|---|---|
| 01 a 04 (requisitos, arquitetura, interface, ameaças) | 10 | 38 |
| P1 (spec) | 1 | 1 |
| 05 (plano) e P2 | 6 | 78 |
| 06 (construção das 47 tarefas: construção, revisão e testes de cada uma) | 203 | 1.702 |
| Paradas por fase (PF-T14, T18, T23, T30, T32, T36) | 6 | 289 |
| 07 (QA funcional) | 1 | 12 |
| 08 (revisão, correção e dois retestes) | 15 | 190 |
| 09 (entrega) | 3 | 30 |
| 10 (documentação) | 1 | 14 |
| **Total** (de 22/10 a 31/10) | **246** | **2.354** |

No total foram 6 devoluções (06-T02-revisao, 06-T08-construcao, 06-T24-testes, 06-T36-revisao, 08-revisao e
08-reteste) e 37 bloqueios, todos liberados. Quase todos eram comando só de leitura fora da lista Pode (CA-P6-03).

## Verificação (`verificar`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| ramo | ok | `construcao/DEC-DEM-20261022-0001-v1` |
| árvore limpa | ok | limpa |
| versão | ok | sem versão na `main` → 0.1.0 |
| changelog | ok | seção 0.1.0 |
| ci | ok | `.github/workflows/ci.yml` |
| remoto | ok | github.com/wsssistemas2626-crypto/ws-orquestrador-demandas |
| test | ok | 3.697 de 3.697 |
| lint | ok | limpo |
| typecheck | ok | limpo |

## Homologação (`homologar`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| subir | ok | `docker-compose.hml.yml` em http://127.0.0.1:3200 |
| saúde | ok | `/api/saude` respondeu 200 |
| e2e | ok | 126 passaram, contra o build de produção |
| derrubar | ok | projeto e volumes removidos |

## Ensaio de rollback (`ensaiar-rollback`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| migrations da `main` | ok | nenhuma alterada |
| migrations novas | ok | 7, e nenhuma altera dado existente |
| versão anterior | ok | primeira publicação: a `main` não tem versão para onde voltar |

Esta é a **primeira publicação**. Não há volta para uma versão anterior, e nenhuma migration altera dado existente.
Antes da primeira publicação, siga o `docs/operacao/deploy.md`: backup, migrate e deploy, nessa ordem, por Fabiano.

## Testes

- Unidade e integração: 3.697 de 3.697 (Vitest, com banco real por arquivo).
- Ponta a ponta: 126 de 126 na homologação, contra `next build` e `next start`, com axe em todas as telas.
- Os 99 critérios de aceite do `01-analista-requisitos.md` têm teste automatizado (07). Só o CA-21.1, o histórico do
  fluxo inteiro, ficou coberto por partes, como candidato a automação A-01.
- `pnpm audit --prod --audit-level high`: código 0, com 5 moderadas e nenhuma alta nem crítica.

## Achados da revisão (08)

Revisões: skill `code-review` em nível alto e agente `seguranca-aplicacao`, porque a skill `security-review` exige
`origin/HEAD`, que o repositório não tem.

| Id | Severidade | Situação |
|---|---|---|
| S-01 Dependências com vulnerabilidade conhecida | Crítico | **Fechado**: next 16.4.1, better-auth 1.7.7, zod 4.6.6, com `overrides` no `pnpm-workspace.yaml` para o zod transitivo |
| A-01 Decidir DEC antigo encerrava a demanda | Alto | **Fechado**: só o DEC mais novo é decidido |
| A-02 Dois DEC aprovados na mesma demanda | Alto | **Fechado**: nunca dois aprovados |
| A-03 Pedido de DEC desatualizado | Alto | **Fechado**: `gerarPedido` e a tela recusam |
| A-04 Nível de aprovação escolhido pelo agente | Alto | **Fechado**: o nível saiu do schema do agente |
| A-05 Sem CI (C-39) | Alto | **Parcial**: `ci.yml` criado, mas as actions estão fixadas por versão (`@v5`), não por SHA |
| M-01 a M-07 | Médio | Abertos, para Fabiano decidir (abaixo); a M-04 ficou resolvida no e2e |
| Médio novo do reteste (A-02 com A-03) | Médio | Aberto, para Fabiano decidir (abaixo) |
| B-01 a B-07 e a baixa do `gerarPedido` | Baixo | Backlog |

Desvios aceitos no reteste:
- o cookie `Secure` segue o protocolo do `BETTER_AUTH_URL`, e a produção recusa `http` fora do loopback;
- as demandas do e2e no seed ficam na conta fictícia `sem2fa`;
- o e2e roda contra o build de produção, com o C-19 exigindo `no-store`.

## Pendências para Fabiano

1. **Médios M-01 a M-07** (detalhe no `08-maestro.md`): corrigir antes do merge ou levar a `gestao-riscos` como risco
   residual. O `seguranca-aplicacao` não aceita risco residual sozinho.
2. **Médio novo do reteste**: a A-02 com a A-03 pode deixar sem saída uma demanda que tem DEC aprovado e recebe ESP ou
   RSK nova. As duas saídas possíveis estão no `08-seguranca-aplicacao.md`.
3. **Ler o QR da 2FA** com Google e Microsoft Authenticator (cenário U-01 do `07-qa-funcional.md`). O gerador é
   próprio (`src/lib/qr.ts`). Se um dos dois não ler, a T37 volta.
4. **SHAs das actions** (fecha a A-05): `actions/checkout@v5`, `actions/setup-node@v5` e o digest de
   `ghcr.io/gitleaks/gitleaks:v8.28.0`.
5. **Configuração** (seção 2 do `deploy.md`):
   - os segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER` no GitHub;
   - a credencial `read:packages` do GHCR no Easypanel;
   - acesso Admin das Actions ao pacote;
   - criar os serviços no Easypanel.
6. **ADR do Next**: a troca de 16.3 para 16.4 entrou como correção de segurança, sem ADR. Decidir se o ADR é feito ou
   se a regra do `padrao-tecnico.md` muda.
7. **Docs com a versão antiga**, para atualizar: RNF-01 na spec (linha 61), no `01-analista-requisitos.md` (linha
   439), no plano (linhas 18 e 19) e no `padrao-tecnico.md` da estruturaAutonoma.
8. **gitleaks**: a primeira execução pode acusar as senhas fictícias do seed, da homologação e do e2e. A triagem é do
   `seguranca-aplicacao`.
9. **Backlog**:
   - imagem de 1,74 GB, porque leva as `devDependencies`;
   - comentários que ainda citam "Better Auth 1.7.6";
   - saída barulhenta do log nos testes;
   - B-01 a B-07.

Merge: pela política (`construir.mjs merge`, CA-P7-05) quando ela está ligada e permite; senão, de Fabiano. Serviço no
Easypanel é ação de Fabiano.
