# Orquestrador 0.1.6: médios M-05 a M-08 e actions fixadas por SHA · DEC-DEM-20261103-0007-v1

## Resumo

Este é um pedido de correção (cadeia curta, risco médio) sobre a `main` (`e0d5f4c`, versão 0.1.5). Ele fecha os médios
M-05, M-06 e M-07 que a 08-revisao do pedido DEC-DEM-20261022-0001-v1 deixou para a primeira publicação, o M-08 que a
triagem do pedido 0006 achou, a classificação do 408 e do 409 do aviso e as actions sem SHA (CA-P5-19 no backlog do
`/construir`). Fabiano autorizou, em 03/11, seguir as recomendações do maestro, com commit e merge, até as 15h30 de
Brasília.

O que mudou:

- **M-05, erro não tratado sem dado no console (C-21):** `onRequestError` em `src/instrumentation.ts` manda o erro de
  página, layout ou Server Component ao log por lista de permissão (evento `erro_requisicao`, modelo da rota, método e
  `digest`) e ao Sentry pelo mesmo saneamento; `src/lib/console-saneado.ts` troca, no boot, `console.error` e
  `console.warn` por uma linha do log; a falha do `getSession` sobe como `ErroLeituraSessao`, com mensagem fixa e sem
  `cause`.
- **M-06, minimização para o agente (C-10, RF-20):** `GET /api/demandas/[id]` e `POST /api/demandas` devolvem a quem não
  é pessoa uma vista montada chave a chave, sem `solicitanteNome`, anexos e o nome da conta autora.
- **M-07, segunda guarda do seed (C-37):** o seed fictício recusa a configuração com `BETTER_AUTH_URL` fora do
  loopback, mesmo com `SEED_FICTICIO=1` e banco vazio.
- **M-08, decisão e Pedido em demanda final:** `registrarDecisao` e `gerarPedido` travam a demanda e respondem 409 em
  `entregue` ou `encerrada`, antes de ler o DEC ou gravar qualquer coisa.
- **Aviso:** 408 e 409 do Resend voltam a ser transitórios (tentados de novo, até 3 vezes).
- **CI:** as 9 linhas `uses:` de `ci.yml` e `deploy.yml` estão fixadas por SHA completo (`actions/checkout` v5.1.0 e
  `actions/setup-node` v5.0.0), sem "SHA pendente".
- **Versão e documentação:** 0.1.6, `CHANGELOG.md`, `deploy.md`, README e manual técnico.

Sem migration, coluna ou variável de ambiente nova. Nada em `src/db/`, `drizzle/` nem `e2e/`.

## Etapas e tempos

| Etapa | Passagens | Minutos |
|---|---|---|
| 01 reprodução (qa-funcional) | 1 | 5 |
| 02 triagem (tech-lead) | 1 | 8 |
| 03 correção (engenheiro-backend) | 3 | 28 |
| 04 regressão (qa-automacao) | 1 | 28 |
| 04 revisão (maestro) | 1 | 1 |
| 05 entrega (devops-sre) | 3 | 14 |
| 06 documentação (documentacao-tecnica) | 1 | 12 |
| **Total** | **11** | **96** |

Houve 2 bloqueios, os dois registrados no `passagens.jsonl`:
- na 03, nove comandos só de leitura (`git show` de pastas, `git grep`, `pnpm exec eslint` e `tail` em saída
  gravada), liberados pelo maestro pela regra de Fabiano de 25/10;
- na 05, o `docker build` local com o caminho absoluto do repositório, que só cria a imagem local, liberado por
  delegação de Fabiano de 03/11, e um `grep` de `process.env` (só leitura), pela regra de 25/10.

Na 04, um `wc -l` e um `date -u` (só leitura) ficaram declarados em prosa, sem bloqueio registrado (R1.4 do parecer
da `governanca-ia` de 03/11).

## Verificação (`verificar`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| ramo | ok | `construcao/DEC-DEM-20261103-0007-v1` |
| árvore limpa | ok | limpa |
| versão | ok | 0.1.5 → 0.1.6 |
| changelog | ok | seção 0.1.6 |
| ci | ok | `.github/workflows/ci.yml` |
| remoto | ok | github.com/wsssistemas2626-crypto/ws-orquestrador-demandas |
| test | ok | 3.879 de 3.879 |
| lint | ok | limpo |
| typecheck | ok | limpo |

## Homologação (`homologar`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| subir | ok | http://127.0.0.1:3200 |
| saúde | ok | `/api/saude` respondeu 200 |
| e2e | ok | 143 passaram, contra o build de produção e com `CI` definido |
| derrubar | ok | projeto e volumes removidos |

A homologação semeou o banco normalmente: a guarda nova do seed aceita o `http://127.0.0.1:3200` dela.

## Ensaio de rollback (`ensaiar-rollback`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| migrations da `main` | ok | nenhuma alterada |
| migrations novas | ok | nenhuma |
| versão anterior | ok | a versão da `main` respondeu 200 em 182 s |
| backup | ok | 106 KB, impressão `7435f7996fdea56d` |
| versão nova | ok | a versão do ramo, sobre o banco da `main`, respondeu 200 em 38 s |
| restauração | ok | o banco ficou igual ao backup (impressão `7435f7996fdea56d`) |
| volta | ok | a versão da `main` voltou sobre o banco migrado e de novo sobre o backup, e respondeu 200 em 12 s |
| ida de novo | ok | a versão do ramo, depois da volta, respondeu 200 em 39 s |

Voltar desta versão para a anterior **não** exige restaurar o backup (`volta_sem_restaurar: true`). Nenhuma migration
altera dado existente.

## Testes

- Unidade e integração: 3.879 de 3.879 (66 novos nas etapas 03 e 04).
- Ponta a ponta: 143 de 143 na homologação; na 04, 143 de 143 em três rodadas seguidas, cada uma com banco novo.
- `docker build` local: passou na 05.
- Os SHAs das actions são provados pelo CI deste PR.

## Achados da revisão (04)

Revisões feitas: leitura integral do diff pelo maestro, skill `code-review` em nível baixo (sem achado) e agente
`seguranca-aplicacao` (sobre o commit da correção, `e54d4bd`). A skill `security-review` não roda aqui: ela lê a pasta
da sessão, e não o repositório do pedido.

- Crítico e Alto: nenhum.
- **M-1 (médio, dado pessoal):** a vista do agente tira as chaves, mas devolve `titulo`, `contexto`,
  `descricaoProblema`, `justificativaUrgencia`, `impactoPercebido` e `duvidasEntrada` sem `minimizar`, e o `titulo`
  da listagem também. Nome ou contato escrito no texto livre sai inteiro para um token de agente.
  **Bloqueia a primeira publicação** até o pedido seguinte ou o aceite de Fabiano e da `gestao-riscos`.
- **M-2 (médio):** as leituras de ESP, RSK e DEC seguem dando ao agente `autor.nome`, `aprovadores[].nome`,
  `referenciaDocumento` e `decididaPor`.
- **M-3 (médio, operacional):** erro fora de requisição (`uncaughtException`, `unhandledRejection`, `after()`) perde a
  pilha e não vai ao Sentry; aviso só de texto do Next vira `console_erro` sem pista. Não vaza dado.
- **B-1 a B-5 (baixos):** `erro: err` cru no `onRequestError`; `console.warn` e `onError` guardados pelo Next antes do
  `register`; a guarda do seed lê a URL e não o banco; as mensagens novas do M-08 pedem a `ux-ui-design`; gerar de novo
  o Pedido de um DEC numa demanda `entregue` passa a dar 409 (pela ESP aprovada).

## Pendências

- **Pedido 0008, antes da primeira publicação:** M-1, M-2 e M-3, com o B-1.
- Para Fabiano e a `gestao-riscos`: aceitar ou não o M-1 como risco até o 0008.
- Para a `ux-ui-design`: as mensagens do M-08. Do pedido 0006 seguem os Baixos B-1, B-4 e B-5 (teste estático dos
  `extras`, foco da fila antes da hidratação e rótulo de `demanda_final`).
- Para o `/construir` (estruturaAutonoma): a `security-review` no repositório do pedido e Glob e Grep para os
  subagentes (R1.1 do parecer da `governanca-ia`).
- Para Fabiano, da primeira publicação (CA-P5-16):
  - a leitura do QR com um autenticador real;
  - os segredos do GitHub e a credencial do GHCR no Easypanel;
  - os serviços no Easypanel;
  - a primeira publicação pela seção 4 do `deploy.md`, com snapshot no hPanel antes.

## Publicação

Esta versão não tem migration nova. No push da `main`, o `deploy.yml` publica a imagem no GHCR (tags sha, v0.1.6 e
latest) e chama os webhooks do Easypanel. Os segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER` ainda não
existem, então o passo dos webhooks fica vermelho e nada vai para produção. Se for preciso voltar, o caminho A da
seção 6 do `deploy.md` leva à `v0.1.5`.

Merge: pela política (`construir.mjs merge`, CA-P7-05) quando ela está ligada e permite; senão, de Fabiano. Serviço no
Easypanel é ação de Fabiano.
