# Orquestrador 0.1.2: e2e que não depende de banco recém-semeado · DEC-DEM-20261102-0003-v1

## Resumo

Pedido de correção (cadeia curta) sobre a `main` (`30b71b5`, versão 0.1.1). Ele fecha três achados de teste que a
04-revisao do pedido DEC-DEM-20261102-0002-v1 deixou:

- **M-01:** a preparação da demanda da `decisao.spec.ts` olhava só a ESP antes de criar a ESP e o RSK juntos. Agora
  `prepararEspERsk` (`e2e/preparacao.ts`) confere cada um separadamente e cria só o que falta. Ela é idempotente e não
  esconde falha: `e2e/preparacao.spec.ts` prova, com falsos, que uma falha parcial é completada sem criar versão a
  mais.
- **B-01:** o duplo clique, a T07 e o teste M-01 deixaram de supor `v1`. Agora conferem exatamente uma versão nova com
  `proximoId`, que recusa id fora do formato. A busca de demanda do seed percorre as páginas (`procurarEmPaginas`).
  Os testes que precisam de banco recém-semeado chamam `exigeBancoRecemSemeado`, que pula com a mensagem "exige banco
  recém-semeado: …". Com `CI` definido, no GitHub Actions e no `homologar`, a pré-condição falsa reprova em vez de
  pular.
- **B-02:** o comentário de `playwright.config.ts` descreve as duas fontes de dado do e2e, o seed fictício e a API.
- Versão 0.1.2 e `CHANGELOG.md`.

Nenhum comportamento do sistema mudou: nada em `src/`, `scripts/` nem `.github/`. A regra A-02, o C-36 e o axe
continuam sem exceção, e entrou um teste da A-02 que roda em qualquer banco.

## Etapas e tempos

| Etapa | Passagens | Minutos |
|---|---|---|
| 01 reprodução (qa-funcional) | 1 | 5 |
| 02 triagem (tech-lead) | 1 | 8 |
| 03 correção (engenheiro-frontend) | 3 | 35 |
| 04 regressão (qa-automacao) | 1 | 41 |
| 04 revisão (maestro) | 1 | 3 |
| 05 entrega (devops-sre) | 3 | 5 |
| 06 documentação (documentacao-tecnica) | 1 | 3 |
| **Total** | **11** | **100** |

Houve 2 bloqueios, os dois por comando só de leitura fora da lista Pode, liberados pelo maestro por delegação de
Fabiano de 02/11.

## Verificação (`verificar`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| ramo | ok | `construcao/DEC-DEM-20261102-0003-v1` |
| árvore limpa | ok | limpa |
| versão | ok | 0.1.1 → 0.1.2 |
| changelog | ok | seção 0.1.2 |
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
| e2e | ok | 142 passaram, contra o build de produção |
| derrubar | ok | projeto e volumes removidos |

## Ensaio de rollback (`ensaiar-rollback`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| migrations da `main` | ok | nenhuma alterada |
| migrations novas | ok | nenhuma |
| versão anterior | ok | a versão da `main` respondeu 200 em 158 s |
| backup | ok | 106 KB, impressão `8abc20a2fbaa4eb8` |
| versão nova | ok | a versão do ramo, sobre o banco da `main`, respondeu 200 em 46 s |
| restauração | ok | banco igual ao backup (impressão `8abc20a2fbaa4eb8`) |
| volta | ok | a versão da `main` voltou sobre o banco migrado e de novo sobre o backup e respondeu 200 em 17 s |
| ida de novo | ok | a versão do ramo, depois da volta, respondeu 200 em 38 s |

A volta desta versão **não** exige restaurar o backup (`volta_sem_restaurar: true`). Nenhuma migration altera dado
existente.

## Testes

- Unidade e integração: 3.697 de 3.697.
- Ponta a ponta: 142 de 142 na homologação, contra `next build` e `next start`. Na 04, foram 142 de 142 em três
  rodadas seguidas, sem teste pulado. Com `--repeat-each=3` num banco só, foram 75 aprovados, 6 pulados com mensagem e
  nenhuma falha.

## Achados da revisão (04)

Revisões: leitura do diff pelo maestro, skill `code-review` em nível baixo, sem bug encontrado, e agente
`seguranca-aplicacao`, porque a skill `security-review` exige `origin/HEAD`.

- Crítico, Alto e Médio: nenhum. Segurança: sem achado.
- **B-01** (Baixo): numa execução repetida, o teste "Arquivar" (`e2e/decisao.spec.ts:348` e `:354`) aceita a demanda
  que já está `encerrada`, e aí não prova a mudança de status. No CI ela parte de `em_analise`, então fica provada. A
  correção vai para o `qa-automacao` num pedido seguinte.

## Publicação

Esta versão não tem migration nova. No push da `main`, o `deploy.yml` publica a imagem no GHCR (tags sha, v0.1.2 e
latest) e chama os webhooks do Easypanel. Os segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER` ainda não
existem no repositório: o passo dos webhooks fica vermelho e nada vai para produção. Se for preciso voltar, o caminho
A da seção 6 do `deploy.md` leva a `v0.1.1`.

## Pendências para Fabiano

As do PR #1 seguem valendo:
- os médios M-01 a M-07 e o médio do reteste do pedido DEC-DEM-20261022-0001-v1;
- a leitura do QR com autenticador real;
- os SHAs de `actions/checkout` e `actions/setup-node`;
- os segredos do GitHub e a credencial do GHCR no Easypanel;
- os serviços no Easypanel;
- o ADR do Next 16.4;
- a primeira publicação pela seção 4 do `deploy.md`, com snapshot no hPanel antes.

Merge: pela política (`construir.mjs merge`, CA-P7-05) quando ela está ligada e permite; senão, de Fabiano. Serviço no
Easypanel é ação de Fabiano.
