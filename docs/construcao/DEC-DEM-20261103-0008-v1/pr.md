# Orquestrador 0.1.7: minimização para o agente e diagnóstico (M-1, M-2 e M-3 da revisão do 0007) · DEC-DEM-20261103-0008-v1

## Resumo

Este é um pedido de correção (cadeia curta, risco médio) sobre a `main` (`75a2b0f`, versão 0.1.6). Ele corrige os três
médios e o B-1 que a 04-revisao do pedido DEC-DEM-20261103-0007-v1 deixou (CA-P5-20 no backlog do `/construir`).
Fabiano autorizou, em 03/11, seguir as recomendações do maestro, com commit e merge, até as 15h30 de Brasília.

O que mudou:

- **M-1 na demanda (RF-20):** para todo ator que não é pessoa, o título e o texto livre da demanda (`contexto`,
  `descricaoProblema`, `justificativaUrgencia`, `impactoPercebido`, `duvidasEntrada`) saem minimizados na leitura por
  id, na criação e na listagem `GET /api/demandas`, pelo mesmo `minimizar` da entrada do agente e com o nome do
  solicitante entre os trocados. A pessoa vê o original. A regra é por lista de permissão: só a pessoa vê o texto
  original.
- **M-2:** as sete rotas de leitura de ESP, RSK e DEC devolvem a quem não é pessoa a autoria de pessoa só como
  `{tipo:'pessoa'}`, os aprovadores sem `nome` e `referenciaDocumento`, e a decisão sem `decididaPor`.
- **M-3:** o console saneado manda ao Sentry o `Error` sem `digest` escrito por `console.error` (o com `digest` já vai
  pelo `onRequestError`), sem laço e com o mesmo saneamento.
- **B-1:** o `onRequestError` grava o erro reduzido.
- **Versão e documentação:** 0.1.7, `CHANGELOG.md`, `deploy.md`, README e manual técnico.

Sem migration, coluna, dependência ou variável de ambiente nova. Nada em `src/db/`, `drizzle/`, `scripts/`, `e2e/` nem
`.github/`.

## Etapas e tempos

| Etapa | Passagens | Minutos |
|---|---|---|
| 01 reprodução (qa-funcional) | 1 | 3 |
| 02 triagem (tech-lead) | 1 | 2 |
| 03 correção (engenheiro-backend) | 3 | 12 |
| 04 regressão (qa-automacao) | 1 | 22 |
| 04 revisão (maestro) | 1 | 1 |
| 05 entrega (devops-sre) | 3 | 3 |
| 06 documentação (documentacao-tecnica) | 1 | 3 |
| **Total** | **11** | **46** |

Houve 2 bloqueios, os dois registrados no `passagens.jsonl`:
- na 03, um `python3 -c` que editou `src/app/api/demandas/demandas.test.ts` (só acrescentou linhas), liberado por
  delegação de Fabiano de 03/11, e um `git ls-files` e um `tail` (só leitura), pela regra de 25/10;
- na 05, o `docker build` local com o caminho absoluto do repositório, que só cria a imagem local, liberado por
  delegação de Fabiano, e um `grep` de `process.env` (só leitura), pela regra de 25/10.

## Verificação (`verificar`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| ramo | ok | `construcao/DEC-DEM-20261103-0008-v1` |
| árvore limpa | ok | limpa |
| versão | ok | 0.1.6 → 0.1.7 |
| changelog | ok | seção 0.1.7 |
| ci | ok | `.github/workflows/ci.yml` |
| remoto | ok | github.com/wsssistemas2626-crypto/ws-orquestrador-demandas |
| test | ok | 3.907 de 3.907 |
| lint | ok | limpo |
| typecheck | ok | limpo |

## Homologação (`homologar`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| subir | ok | http://127.0.0.1:3200 |
| saúde | ok | `/api/saude` respondeu 200 |
| e2e | ok | 143 passaram, contra o build de produção e com `CI` definido |
| derrubar | ok | projeto e volumes removidos |

## Ensaio de rollback (`ensaiar-rollback`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| migrations da `main` | ok | nenhuma alterada |
| migrations novas | ok | nenhuma |
| versão anterior | ok | a versão da `main` respondeu 200 em 181 s |
| backup | ok | 106 KB, impressão `13ebaeeece8c72a7` |
| versão nova | ok | a versão do ramo, sobre o banco da `main`, respondeu 200 em 47 s |
| restauração | ok | o banco ficou igual ao backup (impressão `13ebaeeece8c72a7`) |
| volta | ok | a versão da `main` voltou sobre o banco migrado e de novo sobre o backup, e respondeu 200 em 12 s |
| ida de novo | ok | a versão do ramo, depois da volta, respondeu 200 em 36 s |

Voltar desta versão para a anterior **não** exige restaurar o backup (`volta_sem_restaurar: true`). Nenhuma migration
altera dado existente.

## Testes

- Unidade e integração: 3.907 de 3.907 (28 novos nas etapas 03 e 04, inclusive `src/app/api/vistas-para-agente.test.ts`
  com os dois atores).
- Ponta a ponta: 143 de 143 na homologação; na 04, 143 de 143 em três rodadas seguidas, nenhum pulado.
- `docker build` local: passou na 05.

## Achados da revisão (04)

Revisões feitas: leitura do diff de `src/` pelo maestro, skill `code-review` em nível baixo e agente
`seguranca-aplicacao` (sobre o commit da correção, `f730450`).

- Crítico e Alto: nenhum.
- **M-a (médio, o M-1 incompleto, dado pessoal):** o DEC guarda cópia do título e da descrição da demanda, e
  `demandaTitulo` e `demandaDescricao` saem sem minimizar para quem não é pessoa em `GET /api/pacotes-decisao`,
  `GET /api/pacotes-decisao/:decId`, `GET /api/demandas/:id/pacotes-decisao` e no 201 do
  `POST /api/demandas/:id/pacotes-decisao`. Também saem sem minimizar `decisao.comentarios` e o texto de ESP e RSK.
  Apontado pela skill e pela segurança. **A primeira publicação continua bloqueada** por ele, até o pedido seguinte ou
  o aceite de Fabiano e da `gestao-riscos`.
- **B-a:** a não duplicação no Sentry depende de o Next não mandar o mesmo erro sem `digest` aos dois caminhos; não
  conferido no fonte do Next (no máximo um evento a mais, sem dado).
- **B-b:** `normalizarErro` (`src/lib/log.ts:59`) não reduz objeto que não é `Error`; melhor reduzir nela.

## Pendências

- **Pedido 0009, antes da primeira publicação:** M-a (minimizar a cópia da demanda no DEC, `decisao.comentarios` e o
  texto de ESP e RSK para quem não é pessoa, inclusive no 201 do POST do DEC), com o B-b.
- Para Fabiano e a `gestao-riscos`: aceitar ou não o M-a como risco até o 0009.
- Do pedido 0007 seguem as mensagens do M-08 para a `ux-ui-design`; do 0006, os Baixos B-1, B-4 e B-5.
- Para o `/construir` (estruturaAutonoma): Glob e Grep para os subagentes (R1.1 do parecer da `governanca-ia`).
- Para Fabiano, da primeira publicação (CA-P5-16):
  - a leitura do QR com um autenticador real;
  - os segredos do GitHub e a credencial do GHCR no Easypanel;
  - os serviços no Easypanel;
  - a primeira publicação pela seção 4 do `deploy.md`, com snapshot no hPanel antes.

## Publicação

Esta versão não tem migration nova. No push da `main`, o `deploy.yml` publica a imagem no GHCR (tags sha, v0.1.7 e
latest) e chama os webhooks do Easypanel. Os segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER` ainda não
existem, então o passo dos webhooks fica vermelho e nada vai para produção. Se for preciso voltar, o caminho A da
seção 6 do `deploy.md` leva à `v0.1.6`.

Merge: pela política (`construir.mjs merge`, CA-P7-05) quando ela está ligada e permite; senão, de Fabiano. Serviço no
Easypanel é ação de Fabiano.
