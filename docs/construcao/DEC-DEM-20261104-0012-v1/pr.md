# Orquestrador 0.1.11: detector de e-mail linear (M-a do 0011) e baixos B-1 a B-4 da revisão do 0011 · DEC-DEM-20261104-0012-v1

## Resumo

Este é um pedido de correção (cadeia curta, risco médio) sobre a `main` (`2e621de`, versão 0.1.10). Ele corrige o médio
M-a e os baixos B-1 a B-4 da revisão do pedido 0011 (CA-P5-24 no backlog do `/construir`). Faz parte da retomada
autônoma que Fabiano autorizou para 04/11, das 7h às 15h30 de Brasília, com commit e merge.

O que mudou:

- **M-a do 0011 (detector de e-mail):** a regex antiga tinha custo quadrático. Com 100 mil caracteres sem `@`, levava
  20 s e travava o event loop. Agora o início do e-mail é ancorado por lookbehind, sem limite de tamanho, e o custo é
  linear: com 100 mil caracteres, de 1 a 8 ms. O detector virou uma subclasse de `RegExp`. No `exec`, quando a busca
  continua do fim de um casamento, ele tenta primeiro uma cópia sem lookbehind, com a flag `y`. Assim o e-mail colado
  logo depois de outro (`a@b.com_joana@x.com`) continua trocado, como na `main`. Esse caso foi a devolução da 04.
- **B-2 do 0011:** o usuário de e-mail com acento (`joão.ficticia@x.com`) vira um marcador só.
- **B-1 do 0011:** o nome grudado em número, `_` ou CamelCase vira marcador (`Joana2`, `Joana_Ficticia`,
  `JoanaFicticia`, `ContatoJoana`). Ficam como estão `Mariana`, siglas (`ANATEL`), `análise` e `camisa rosa`.
- **B-3 do 0011:** estas funções nunca lançam, nem com Proxy ou getter que lança:
  - `reduzirErro`, `lerCode` e `erroJaReduzido`;
  - `mapearErro` e `onRequestError`;
  - o console saneado.

  O erro chega ao log e ao Sentry só com a classe. `quadrosDaPilha` lê o `stack` uma vez só.
- **B-4 do 0011:** o aviso e a dica da tela dizem o limite de 3 letras, as partículas ("dos, das e Júnior") e a parte do
  nome em minúscula.
- **Versão e documentação:**
  - versão 0.1.11 no `CHANGELOG.md`;
  - `deploy.md`, com a volta para a `v0.1.10` pelo caminho A, que traz de volta a regex lenta;
  - README e manual técnico.

Sem migration, coluna, dependência ou variável de ambiente nova. Nada em `src/db/`, `drizzle/`, `scripts/`, `e2e/` nem
`.github/`.

## Etapas e tempos

| Etapa | Passagens | Minutos |
|---|---|---|
| 01 reprodução (qa-funcional) | 1 | 5 |
| 02 triagem (tech-lead) | 1 | 12 |
| 03 correção (engenheiro-backend) | 4 | 30 |
| 04 regressão (qa-automacao) | 2 | 59 |
| 04 revisão (maestro) | 1 | 0 |
| 05 entrega (devops-sre) | 3 | 3 |
| 06 documentação (documentacao-tecnica) | 1 | 6 |
| **Total** | **13** | **115** |

Teve 1 volta: a 04-regressao devolveu à 03 com 13 testes. O motivo foi o e-mail colado no fim de outro, que a primeira
correção deixava em claro. A revisão de segurança achou o mesmo defeito em paralelo.

Teve 2 bloqueios, os dois só de leitura e liberados pela regra de 25/10:
- na segunda volta da 03, um `git grep` e um `git show`;
- na 05, um `ls` da pasta do pedido.

## Verificação (`verificar`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| ramo | ok | `construcao/DEC-DEM-20261104-0012-v1` |
| árvore limpa | ok | limpa |
| versão | ok | 0.1.10 → 0.1.11 |
| changelog | ok | seção 0.1.11 |
| ci | ok | `.github/workflows/ci.yml` |
| remoto | ok | github.com/wsssistemas2626-crypto/ws-orquestrador-demandas |
| test | ok | 4.288 de 4.288 |
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
| versão anterior | ok | a versão da `main` respondeu 200 em 165 s |
| backup | ok | 106 KB, impressão `d53f8e3405907793` |
| versão nova | ok | a versão do ramo, sobre o banco da `main`, respondeu 200 em 42 s |
| restauração | ok | o banco ficou igual ao backup (impressão `d53f8e3405907793`) |
| volta | ok | a versão da `main` voltou sobre o banco migrado e de novo sobre o backup, e respondeu 200 em 10 s |
| ida de novo | ok | a versão do ramo, depois da volta, respondeu 200 em 37 s |
| derrubar | ok | projeto e volumes removidos |

Voltar desta versão para a anterior **não** exige restaurar o backup (`volta_sem_restaurar: true`). Nenhuma migration
altera dado existente.

## Testes

- **Unidade e integração:** 4.288 de 4.288.
  - A 03 deixou 4.242, com cada teste visto falhando na base antes do código.
  - A 04 acrescentou 46: o corpus de equivalência com a regex da `main` (os sete caminhos de uso do detector), os
    e-mails colados e os testes de tempo do caso ruim. Esses levavam de 15 a 20 s na base e agora levam de 0,7 a 9 ms,
    com limite de 200 ms.
- **Ponta a ponta:** 143 de 143 na homologação. Na 04, foram cinco execuções e as três últimas seguidas passaram com
  143 de 143. Na 2ª, o axe do T11 (`e2e/axe-todas.spec.ts:273`) estourou o tempo de 30 s uma vez, com a página já no
  estado final.
- **Build:** `pnpm build` passou na 05. O `docker build` roda na homologação e no CI.

## Achados da revisão (04)

Revisões feitas:
- leitura do diff de `src/` pelo maestro;
- `feature-dev:code-reviewer`, sem achado de confiança alta;
- `seguranca-aplicacao`, que revisou `930b277` e retestou `e6faf79`. Mediu em memória, com sorteio de 300 mil textos
  contra a `main`.

- **Crítico e Alto:** nenhum.
- **M-1 (médio, fechado na segunda volta):** era o e-mail colado no fim de outro. No reteste:
  - nenhum texto que a `main` bloqueia no Pedido de Construção deixa de ser bloqueado;
  - em nenhuma saída de `minimizar` sobra algo com forma de e-mail;
  - cadeias de 100 mil e-mails colados levam até 89 ms.
- **B-1 e B-2 da revisão:** fechados na segunda volta. B-1 era o texto do aviso; B-2, o `stack` lido uma vez.
- **B-a:** o comentário de `detectores.ts:22-23` promete demais. Quando dois `@` dividem o domínio e há acento antes do
  primeiro, sobra só `@domínio`, sem usuário. Mesmo assim, o código novo expõe menos que a `main`.
- **I-1 (informativo):** `split`, `new RegExp(detector)` e `test` encadeado não passam pela tentativa extra. Nenhum dos
  três é usado hoje.
- **B-3:** depois de uma parte recusada, a busca não volta à alternativa mais curta (`AnaBelax`).
- **B-4:** um Error com `digest: undefined` explícito vai ao Sentry.

## Pendências

- **Para um pedido futuro:**
  - B-a, I-1, B-3 e B-4;
  - o axe do T11, sensível a carga;
  - o B-4 do 0006 (foco da fila);
  - a convenção de `CLASSES_DO_PROJETO` no `padrao-tecnico.md`.
- **Para Fabiano:** o pedido do Pedido de Construção sem nome de pessoa, com os pareceres de 04/11 de `gestao-riscos`,
  `juridico-contratos` e `seguranca-aplicacao`. Até ele sair, nenhum Pedido gerado de demanda real.
- **Para Fabiano, a primeira publicação (CA-P5-16):**
  - o QR da 2FA;
  - os segredos e a credencial do GHCR;
  - os serviços no Easypanel;
  - a seção 4 do `deploy.md`, com snapshot no hPanel antes.

## Publicação

Esta versão não tem migration nova. No push da `main`, o `deploy.yml` publica a imagem no GHCR com as tags sha, v0.1.11
e latest, e chama os webhooks do Easypanel. Os segredos dos webhooks ainda não existem, então esse passo fica vermelho e
nada vai para produção. Se for preciso voltar, o caminho A da seção 6 do `deploy.md` leva à `v0.1.10`.

Merge: pela política (`construir.mjs merge`, CA-P7-05) quando ela está ligada e permite; senão, de Fabiano. Serviço no
Easypanel é ação de Fabiano.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
