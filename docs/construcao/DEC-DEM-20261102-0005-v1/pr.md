# Orquestrador 0.1.4: axe no estado arquivado e cabeçalho da decisao.spec.ts · DEC-DEM-20261102-0005-v1

## Resumo

Este é um pedido de correção (cadeia curta) sobre a `main` (`00a924e`, versão 0.1.3). Ele fecha os dois pontos que a
04-revisao do pedido DEC-DEM-20261102-0004-v1 deixou (CA-P5-17 no backlog do `/construir`).

O que mudou:

- **Axe no estado arquivado:** o teste "Arquivar" de `e2e/decisao.spec.ts` chama `semViolacoes(page, 'T11 arquivado')`
  depois do alerta e das conferências `arquivada` e `encerrada`, sem regra desligada nem elemento excluído. O axe não
  achou violação na tela, então `src/` não mudou. Um controle negativo (um `<img>` sem `alt` injetado por um instante)
  provou que a chamada nova reprova quando há violação.
- **Cabeçalho da `decisao.spec.ts`:** sem a linha órfã, com no máximo 120 caracteres por linha e com o arquivado entre
  os estados que passam pelo axe. Só linhas de comentário mudaram.
- **Trava estática nova** (`test/estatico/decisao-e2e.test.ts`, da 04-regressao): confere em teste de unidade o axe do
  arquivado, a pré-condição e as conferências do "Arquivar" iguais às da 0.1.3, o cabeçalho e que nenhum arquivo de
  `e2e/` desliga, filtra ou restringe o axe.
- **Versão e documentação:** versão 0.1.4, `CHANGELOG.md`, `deploy.md` e manual técnico.

Nenhum comportamento do sistema mudou: nada em `src/`, `scripts/`, `drizzle/` nem `.github/`. A regra A-02, o C-36 e
o axe continuam sem exceção.

## Etapas e tempos

| Etapa | Passagens | Minutos |
|---|---|---|
| 01 reprodução (qa-funcional) | 1 | 2 |
| 02 triagem (tech-lead) | 1 | 4 |
| 03 correção (engenheiro-frontend) | 3 | 19 |
| 04 regressão (qa-automacao) | 1 | 31 |
| 04 revisão (maestro) | 1 | 2 |
| 05 entrega (devops-sre) | 3 | 8 |
| 06 documentação (documentacao-tecnica) | 1 | 3 |
| **Total** | **11** | **69** |

Houve 2 bloqueios, os dois liberados pelo maestro por delegação de Fabiano de 02/11 (até as 20h de Brasília):
- na 03, um `pnpm test` com `| tail -40`, só de leitura;
- na 05, o `docker build` local com o caminho absoluto do repositório, que só cria a imagem local e não publica nada.

## Verificação (`verificar`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| ramo | ok | `construcao/DEC-DEM-20261102-0005-v1` |
| árvore limpa | ok | limpa |
| versão | ok | 0.1.3 → 0.1.4 |
| changelog | ok | seção 0.1.4 |
| ci | ok | `.github/workflows/ci.yml` |
| remoto | ok | github.com/wsssistemas2626-crypto/ws-orquestrador-demandas |
| test | ok | 3.711 de 3.711 |
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
| versão anterior | ok | a versão da `main` respondeu 200 em 150 s |
| backup | ok | 106 KB, impressão `7767fe3687222287` |
| versão nova | ok | a versão do ramo, sobre o banco da `main`, respondeu 200 em 38 s |
| restauração | ok | o banco ficou igual ao backup (impressão `7767fe3687222287`) |
| volta | ok | a versão da `main` voltou sobre o banco migrado e de novo sobre o backup, e respondeu 200 em 11 s |
| ida de novo | ok | a versão do ramo, depois da volta, respondeu 200 em 37 s |

Voltar desta versão para a anterior **não** exige restaurar o backup (`volta_sem_restaurar: true`). Nenhuma migration
altera dado existente.

## Testes

- Unidade e integração: 3.711 de 3.711 (14 novos, da trava estática).
- Ponta a ponta: 143 de 143 na homologação. Na 04 foram 143 de 143 em três rodadas seguidas em banco novo, sem teste
  pulado. Com `--repeat-each=3` no mesmo banco, foram 19 aprovados, 8 pulados com mensagem e nenhuma falha.
- Controles negativos da 04: o axe reprovou com `image-alt` na tela arquivada com um `<img>` sem `alt` injetado; a
  trava estática reprovou sem a linha nova e reprova o cabeçalho da 0.1.3.
- `docker build` local: passou, 1,74 GB em disco e 425 MB de conteúdo, praticamente o mesmo da 0.1.3.

## Achados da revisão (04)

Revisões feitas: leitura integral do diff pelo maestro, skill `code-review` em nível baixo (sem achado) e agente
`seguranca-aplicacao`. A skill `security-review` não rodou porque exige `origin/HEAD`.

- Crítico, Alto e Médio: nenhum. Segurança: sem achado que bloqueie.
- **B-1** (Baixo): a trava "nenhum e2e desliga o axe" não pega um `r.violations.filter(...)` em `e2e/apoio.ts` nem
  arquivos `.tsx`, `.js` ou `.mjs` em `e2e/`. É um limite do teste novo, não um afrouxamento.
- **B-2** (Baixo): o teste estático confere trechos exatos de `e2e/decisao.spec.ts` e `e2e/apoio.ts`; uma refatoração
  desses arquivos vai exigir atualizá-lo junto.
- Observação, fora do pedido: o `prettier --check` acusa 548 arquivos da `main`; o Prettier não está no CI.

## Publicação

Esta versão não tem migration nova. No push da `main`, o `deploy.yml` publica a imagem no GHCR (tags sha, v0.1.4 e
latest) e chama os webhooks do Easypanel. Os segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER` ainda não
existem, então o passo dos webhooks fica vermelho e nada vai para produção. Se for preciso voltar, o caminho A da
seção 6 do `deploy.md` leva à `v0.1.3`.

## Pendências para Fabiano

Continuam valendo as do PR #1:
- os médios M-01 a M-07 e o médio do reteste do pedido DEC-DEM-20261022-0001-v1;
- a leitura do QR com um autenticador real;
- fixar `actions/checkout` e `actions/setup-node` por SHA;
- os segredos do GitHub e a credencial do GHCR no Easypanel;
- os serviços no Easypanel;
- o ADR do Next 16.4;
- a primeira publicação pela seção 4 do `deploy.md`, com snapshot no hPanel antes.

Novas e menores: a imagem local `ws-orquestrador-demandas:local` (1,74 GB) ficou no Docker da VPS, no lugar da 0.1.3;
e, para quem mexer nesses arquivos, os Baixos B-1 e B-2.

Merge: pela política (`construir.mjs merge`, CA-P7-05) quando ela está ligada e permite; senão, de Fabiano. Serviço no
Easypanel é ação de Fabiano.
