# Orquestrador 0.1.1: estabilizar três testes e2e instáveis no CI · DEC-DEM-20261102-0002-v1

## Resumo

Pedido de correção (cadeia curta) sobre a `main` (`dd8ddee`, versão 0.1.0). No CI do PR #1 (execução 41249512830,
commit `e0f3933`), o e2e contra o build de produção falhou em 3 de 126 testes e passou numa nova execução do mesmo
código. A causa era instabilidade, não regressão:

- `e2e/agentes-teto.spec.ts:106` e `e2e/decisao.spec.ts:151`: o axe acusou `document-title` porque rodou antes de o
  `<title>` chegar. Depois de uma Server Action, o Next 16 manda o metadado por streaming.
- `e2e/parecer-risco-qa.spec.ts:183`: `POST /api/demandas` deu 429. A suíte criava demandas pela conta `cto` até o
  limite de 30 por hora do C-36.

Correção, sem afrouxar nada:

- O `semViolacoes` (`e2e/apoio.ts`) espera o `<title>` por até 5 s, mas a espera não decide o resultado. O axe roda com
  as mesmas regras e exige zero violação. A spec nova `e2e/sem-violacoes.spec.ts` prova os dois lados: com o título
  atrasado o teste passa, e sem `<title>` ele reprova pela regra `document-title`.
- Os testes que criavam demanda pela API passaram a usar 3 demandas fictícias do seed (`scripts/seed-ficticio.ts`), e
  um teste confere que o total de demandas não muda. O `conferirLimite` e os testes do 429 não mudaram, e a conta
  `cto` passou de 30 de 30 para 27 de 30.
- Versão 0.1.1 e `CHANGELOG.md`. Nenhum comportamento do sistema mudou: nada em `src/`, `drizzle/`, `.github/` nem no
  `Dockerfile`.

## Etapas e tempos

| Etapa | Passagens | Minutos |
|---|---|---|
| 01 reprodução (qa-funcional) | 1 | 5 |
| 02 triagem (tech-lead) | 4 | 2 |
| 03 correção (engenheiro-frontend) | 3 | 42 |
| 04 regressão (qa-automacao) | 1 | 29 |
| 04 revisão (maestro) | 1 | 2 |
| 05 entrega (devops-sre) | 4 | 6 |
| 06 documentação (documentacao-tecnica) | 1 | 5 |
| **Total** | **15** | **91** |

Houve 3 bloqueios, todos liberados: comandos só de leitura, ou que só rodam teste, fora da lista Pode, e as
liberações de edição do seed e da versão para o engenheiro-frontend. Todos foram liberados pelo maestro, por
delegação de Fabiano de 02/11.

## Verificação (`verificar`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| ramo | ok | `construcao/DEC-DEM-20261102-0002-v1` |
| árvore limpa | ok | limpa |
| versão | ok | 0.1.0 → 0.1.1 |
| changelog | ok | seção 0.1.1 |
| ci | ok | `.github/workflows/ci.yml` |
| remoto | ok | github.com/wsssistemas2626-crypto/ws-orquestrador-demandas |
| test | ok | 3.697 de 3.697 |
| lint | ok | limpo |
| typecheck | ok | limpo |

## Homologação (`homologar`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| subir | ok | http://127.0.0.1:3200 |
| saúde | ok | `/api/saude` respondeu 200 |
| e2e | ok | 128 passaram, contra o build de produção |
| derrubar | ok | projeto e volumes removidos |

## Ensaio de rollback (`ensaiar-rollback`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| migrations da `main` | ok | nenhuma alterada |
| migrations novas | ok | nenhuma |
| versão anterior | ok | a versão da `main` respondeu 200 em 158 s |
| backup | ok | 104 KB, impressão `85cb781f60f33a0f` |
| versão nova | ok | a versão do ramo, sobre o banco da `main`, respondeu 200 em 39 s |
| restauração | ok | banco igual ao backup (impressão `85cb781f60f33a0f`) |
| volta | ok | a versão da `main` voltou sobre o banco migrado e de novo sobre o backup, e respondeu 200 em 10 s |
| ida de novo | ok | a versão do ramo, depois da volta, respondeu 200 em 36 s |

A volta desta versão **não** exige restaurar o backup (`volta_sem_restaurar: true`), e nenhuma migration altera dado
existente.

## Testes

- Unidade e integração: 3.697 de 3.697.
- Ponta a ponta: 128 de 128 na homologação, contra `next build` e `next start`. Na 03 a suíte inteira terminou com
  código 0 em três rodadas seguidas, e a 04 confirmou.

## Achados da revisão (04)

Revisões: leitura integral do diff pelo maestro, skill `code-review` em nível baixo e agente `seguranca-aplicacao`. A
skill `security-review` exige `origin/HEAD`.

- Crítico e Alto: nenhum. Segurança: sem achado. A correção não afrouxa o axe nem o C-36 e não traz dado pessoal real
  nem segredo.
- **M-01** (Médio): a guarda de `e2e/decisao.spec.ts:39` olha só a ESP antes de criar a ESP e o RSK juntos. Se o RSK
  falhar uma vez, a demanda fica sem parecer até o banco ser semeado de novo. Vai para o `qa-automacao`, num pedido
  seguinte.
- **B-01** (Baixo): o duplo clique, a T07 e a `decisao.spec.ts` dependem de banco recém-semeado, o que vale no CI e no
  `homologar`.
- **B-02** (Baixo): o comentário de `playwright.config.ts:4` está desatualizado.

## Publicação

Esta versão não tem migration nova. No push da `main`, o `deploy.yml` publica a imagem no GHCR (tags sha, v0.1.1 e
latest) e chama os webhooks do Easypanel. Os segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER` ainda não
existem no repositório, então o passo dos webhooks fica vermelho e nada é publicado em produção. A primeira publicação
continua com Fabiano, pela seção 4 do `docs/operacao/deploy.md`.

## Pendências para Fabiano

As do PR #1 seguem valendo:
- os médios M-01 a M-07 e o médio do reteste do pedido DEC-DEM-20261022-0001-v1;
- a leitura do QR com autenticador real;
- os SHAs de `actions/checkout` e `actions/setup-node`;
- os segredos do GitHub e a credencial do GHCR no Easypanel;
- os serviços no Easypanel;
- o ADR do Next 16.4.

Merge: pela política (`construir.mjs merge`, CA-P7-05) quando ela está ligada e permite; senão, de Fabiano. Serviço no
Easypanel é ação de Fabiano.
