# Orquestrador 0.1.8: texto livre de DEC, ESP e RSK minimizado para o agente (M-a da revisão do 0008) e B-b · DEC-DEM-20261103-0009-v1

## Resumo

Este é um pedido de correção (cadeia curta, risco médio) sobre a `main` (`3c8a942`, versão 0.1.7). Ele corrige o
médio M-a e o baixo B-b que a 04-revisao do pedido DEC-DEM-20261103-0008-v1 deixou (CA-P5-21 no backlog do
`/construir`). O M-a bloqueava a primeira publicação. Fabiano autorizou, em 03/11, o pedido 0009 com commit e merge
até as 21h de Brasília.

O que mudou:

- **M-a (RF-20):** para todo ator que não é pessoa, o texto livre de DEC, ESP e RSK sai minimizado pelo mesmo
  `minimizarValor` da demanda, com o nome do solicitante entre os trocados:
  - no DEC: `demandaTitulo`, `demandaDescricao`, `resumoExecutivo`, `recomendacao`, `opcaoA` e `opcaoB` subcampo a
    subcampo, `decisao.comentarios` e as listas da ESP citada;
  - na ESP, os 15 campos de texto e de lista; no RSK, os 7.
  Vale para as 7 leituras e para o 201 dos 3 POST de criação, que agora passam pela vista do ator. A pessoa vê o
  original, e o Pedido de Construção continua com o original. A regra é por lista de permissão.
- **B-b:** `normalizarErro` (`src/lib/log.ts`) reduz objeto que não é `Error` a `{ classe: 'desconhecido', code? }`;
  o erro que já chega reduzido na forma exata `{ classe, code? }` mantém a classe.
- **Versão e documentação:** 0.1.8, `CHANGELOG.md`, `deploy.md` (a primeira publicação passa a exigir a 0.1.8), README e
  manual técnico.

Sem migration, coluna, dependência ou variável de ambiente nova. Nada em `src/db/`, `drizzle/`, `scripts/`, `e2e/` nem
`.github/`.

## Etapas e tempos

| Etapa | Passagens | Minutos |
|---|---|---|
| 01 reprodução (qa-funcional) | 1 | 1 |
| 02 triagem (tech-lead) | 3 | 3 |
| 03 correção (engenheiro-backend) | 1 | 28 |
| 04 regressão (qa-automacao) | 3 | 26 |
| 04 revisão (maestro) | 1 | 0 |
| 05 entrega (devops-sre) | 1 | 2 |
| 06 documentação (documentacao-tecnica) | 1 | 2 |
| **Total** | **11** | **62** |

Houve 2 bloqueios, os dois só de leitura, liberados pela regra de 25/10 e registrados no `passagens.jsonl`:
- na 02, um `ls` da pasta do pedido e um `cat` de `pedido.json`;
- na 04-regressao, consultas `git log -G` ao histórico de `src/` (o registro diz três; o agente declarou cinco ao
  regravar a entrega).

## Verificação (`verificar`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| ramo | ok | `construcao/DEC-DEM-20261103-0009-v1` |
| árvore limpa | ok | limpa |
| versão | ok | 0.1.7 → 0.1.8 |
| changelog | ok | seção 0.1.8 |
| ci | ok | `.github/workflows/ci.yml` |
| remoto | ok | github.com/wsssistemas2626-crypto/ws-orquestrador-demandas |
| test | ok | 3.918 de 3.918 |
| lint | ok | limpo |
| typecheck | ok | limpo |

## Homologação (`homologar`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| subir | ok | http://127.0.0.1:3200 |
| saúde | ok | `/api/saude` respondeu 200 |
| e2e | ok | 143 passaram, contra o build de produção |
| derrubar | ok | projeto e volumes removidos |

## Ensaio de rollback (`ensaiar-rollback`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| migrations da `main` | ok | nenhuma alterada |
| migrations novas | ok | nenhuma |
| versão anterior | ok | a versão da `main` respondeu 200 em 142 s |
| backup | ok | 106 KB, impressão `aeea66e71eb8dd16` |
| versão nova | ok | a versão do ramo, sobre o banco da `main`, respondeu 200 em 36 s |
| restauração | ok | o banco ficou igual ao backup (impressão `aeea66e71eb8dd16`) |
| volta | ok | a versão da `main` voltou sobre o banco migrado e de novo sobre o backup, e respondeu 200 em 10 s |
| ida de novo | ok | a versão do ramo, depois da volta, respondeu 200 em 43 s |

Voltar desta versão para a anterior **não** exige restaurar o backup (`volta_sem_restaurar: true`). Nenhuma migration
altera dado existente.

## Testes

- Unidade e integração: 3.918 de 3.918 (testes novos na 03 e na 04 em `src/app/api/vistas-para-agente.test.ts`, com
  os dois atores em cada rota, inclusive CNPJ e `opcaoA.quandoEscolher`; em `src/app/api/pacotes-decisao/pedido.test.ts`,
  o Pedido de Construção com o texto original; e em `src/lib/log.test.ts`, o B-b).
- Ponta a ponta: 143 de 143 na homologação; na 04, 143 de 143 em três rodadas seguidas.
- `pnpm build` passou na 05 (34 rotas); o `docker build` roda na homologação e no CI.

## Achados da revisão (04)

Revisões feitas: leitura do diff de `src/` pelo maestro, skill `code-review` em nível baixo (sem achado) e agente
`seguranca-aplicacao` (sobre o commit da correção, `a4af941`).

- Crítico e Alto: nenhum. O M-a e o B-b estão fechados.
- **M-1 (médio, risco residual de RF-20):** só o nome atual e completo do solicitante é trocado. Um nome antigo (depois
  de editar `solicitanteNome`) ou escrito pela metade, no texto antigo de DEC, ESP e RSK, sai em claro para o agente.
  Não é regressão: é o limite da regra que já valia para a demanda. Vai para Fabiano e a `gestao-riscos`.
- **B-1:** `FORMATO_CODE` aceita um CPF só de dígitos e `erroJaReduzido` aceita um nome de uma palavra como classe, se
  quem chama o log passar esse valor.
- **B-2:** fechado na 04-regressao (CNPJ e `quandoEscolher` no teste).
- **B-3:** nos 3 POST, os nomes são lidos depois de gravar; uma falha nessa leitura dá 500 ao agente com o artefato
  gravado, e a nova tentativa cria versão duplicada. Sem vazamento.

## Pendências

- Para Fabiano e a `gestao-riscos`: aceitar o M-1 como risco residual, ou abrir pedido para guardar o nome anterior (a)
  ou trocar cada parte do nome (b).
- Para um pedido futuro: B-1 e B-3; do 0008, B-a; do 0007, as mensagens do M-08 para a `ux-ui-design`; do 0006, B-1,
  B-4 e B-5.
- Para o `/construir` (estruturaAutonoma): Glob e Grep para os subagentes (R1.1 do parecer da `governanca-ia`).
- Para Fabiano, da primeira publicação (CA-P5-16), agora sem o bloqueio de dado pessoal:
  - a leitura do QR com um autenticador real;
  - os segredos do GitHub e a credencial do GHCR no Easypanel;
  - os serviços no Easypanel;
  - a primeira publicação pela seção 4 do `deploy.md`, com a 0.1.8 e snapshot no hPanel antes.

## Publicação

Esta versão não tem migration nova. No push da `main`, o `deploy.yml` publica a imagem no GHCR (tags sha, v0.1.8 e
latest) e chama os webhooks do Easypanel. Os segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER` ainda não
existem, então o passo dos webhooks fica vermelho e nada vai para produção. Se for preciso voltar, o caminho A da
seção 6 do `deploy.md` leva à `v0.1.7`.

Merge: pela política (`construir.mjs merge`, CA-P7-05) quando ela está ligada e permite; senão, de Fabiano. Serviço no
Easypanel é ação de Fabiano.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
