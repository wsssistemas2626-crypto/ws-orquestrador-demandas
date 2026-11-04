# Orquestrador 0.1.9: baixos B-1 e B-3 do 0009, B-a do 0008 e B-1 e B-5 do 0006 · DEC-DEM-20261104-0010-v1

## Resumo

Este é um pedido de correção sobre a `main` (`1d6d897`, versão 0.1.8), pela cadeia curta, com risco baixo. Ele corrige
os baixos que as revisões dos pedidos 0006, 0008 e 0009 deixaram do lado servidor (CA-P5-22 no backlog do
`/construir`). Fabiano autorizou o pedido em 03/11, na retomada autônoma de 04/11, das 7h às 15h30 de Brasília, com
commit e merge.

O que mudou:

- **B-1 do 0009 (C-21):**
  - `lerCode` recusa `code` com 10 ou mais dígitos seguidos.
  - A classe que sai no log e no título do Sentry é só uma destas: `desconhecido`; um identificador terminado em `Error` ou `Exception`; um nome da lista fechada `CLASSES_DO_PROJETO`, de 8 nomes.
  - Fora disso, `reduzirErro` devolve `Error` e `erroJaReduzido` devolve nulo.
  - O teste estático `test/estatico/classes-de-erro.test.ts` avisa quando uma classe nova do projeto não está na regra.
- **B-3 do 0009:** nos 3 POST de `demandas/[id]/{especificacoes,pareceres-risco,pacotes-decisao}`, os nomes do
  solicitante são lidos antes de gravar. Uma falha nessa leitura não grava nada, e o 404, o 409, o 429 e o 400
  continuam vindo do serviço.
- **B-a do 0008:** conferi no fonte do Next 16.4.1. Quando um erro escapa de um route handler, o mesmo objeto chega sem
  `digest` ao `console.error` e ao `onRequestError`. Agora `capturarErro` manda cada objeto ao Sentry uma vez só, com a
  marca num `WeakSet`.
- **B-1 do 0006:** um teste estático lê a AST do TypeScript e barra, em `src/app/`, qualquer chamada de
  `criarPacoteDecisao` com 5 ou mais argumentos, com espalhamento ou por import renomeado.
- **B-5 do 0006:** o motivo `demanda_final` ganhou o rótulo "demanda já entregue ou encerrada" no histórico.
- **Versão e documentação:** 0.1.9 em `CHANGELOG.md`, `deploy.md` (volta para a `v0.1.8` pelo caminho A), README e
  manual técnico, com a convenção de `CLASSES_DO_PROJETO`.

Este pedido não traz migration, coluna, dependência nem variável de ambiente nova. Não mexe em `src/db/`, `drizzle/`,
`scripts/`, `e2e/` nem `.github/`. O B-4 do 0006 (foco da fila antes da hidratação) é de interface e fica para um pedido
próprio.

## Etapas e tempos

| Etapa | Passagens | Minutos |
|---|---|---|
| 01 reprodução (qa-funcional) | 1 | 4 |
| 02 triagem (tech-lead) | 1 | 3 |
| 03 correção (engenheiro-backend) | 3 | 16 |
| 04 regressão (qa-automacao) | 3 | 23 |
| 04 revisão (maestro) | 1 | 0 |
| 05 entrega (devops-sre) | 1 | 2 |
| 06 documentação (documentacao-tecnica) | 1 | 7 |
| **Total** | **11** | **55** |

Houve 2 bloqueios, os dois só de leitura. Foram liberados pela regra de 25/10 e registrados no `passagens.jsonl`:

- na 03, quatro `git ls-files`, por falta de Glob e Grep;
- na 04-regressao, duas leituras de saída com `tail`.

## Verificação (`verificar`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| ramo | ok | `construcao/DEC-DEM-20261104-0010-v1` |
| árvore limpa | ok | limpa |
| versão | ok | 0.1.8 → 0.1.9 |
| changelog | ok | seção 0.1.9 |
| ci | ok | `.github/workflows/ci.yml` |
| remoto | ok | github.com/wsssistemas2626-crypto/ws-orquestrador-demandas |
| test | ok | 3.999 de 3.999 |
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
| versão anterior | ok | a versão da `main` respondeu 200 em 140 s |
| backup | ok | 106 KB, impressão `ecff9aee1d6789bc` |
| versão nova | ok | a versão do ramo, sobre o banco da `main`, respondeu 200 em 36 s |
| restauração | ok | o banco ficou igual ao backup (impressão `ecff9aee1d6789bc`) |
| volta | ok | a versão da `main` voltou sobre o banco migrado e de novo sobre o backup, e respondeu 200 em 11 s |
| ida de novo | ok | a versão do ramo, depois da volta, respondeu 200 em 39 s |
| derrubar | ok | projeto e volumes removidos |

Voltar desta versão para a anterior **não** exige restaurar o backup (`volta_sem_restaurar: true`). Nenhuma migration
altera dado existente.

## Testes

- **Unidade e integração:** 3.999 de 3.999. A 03 acrescentou 73 testes (3.918 → 3.991), e a fase vermelha teve 40 falhas
  esperadas. A 04 acrescentou mais 8:
  - `src/instrumentation-sentry.test.ts`, com o `onRequestError` real, o console saneado real e o Sentry real sobre
    transporte falso;
  - o título do Sentry, em `src/lib/sentry.test.ts`.
- **Ponta a ponta:** 143 de 143 na homologação. Na 04, 143 de 143 em três rodadas seguidas, sem nova tentativa.
- **Build:** o `pnpm build` passou na 05. O `docker build` roda na homologação e no CI.

## Achados da revisão (04)

A revisão teve três partes:
- o maestro leu o diff de `src/`;
- o agente `feature-dev:code-reviewer` revisou o código e não achou nada de confiança alta;
- o agente `seguranca-aplicacao` revisou o commit da correção, `ae1638e`.

- **Crítico, alto e médio:** nenhum.
- **B-1:** o `code` ainda passa com 9 dígitos, com dígitos separados por `_` ou com uma palavra. Isso só acontece se
  quem chama o log passar esse valor.
- **B-2:** `reduzirErro` não confere `typeof e.name === 'string'`. Esse ponto já existia antes.
- **B-3:** nos 3 POST, os nomes são lidos fora da transação. Se o solicitante for renomeado no meio, o nome novo sai no
  201 para o agente. É uma variante do M-1 do 0009.
- **B-4:** `capturarErro` marca o erro antes de mandá-lo. Se `reduzirErro` lançar, o erro fica marcado sem ter sido
  enviado.
- **B-5:** os testes estáticos não veem `get name()`, `X.name = '...'` fora de `this`, reexport nem `import()` dinâmico.

## Pendências

- **No pedido `DEC-DEM-20261104-0011-v1`, já aberto:** B-2, B-3 e B-4 desta revisão, junto com o M-1 do 0009. Fabiano
  decidiu em 04/11 pela opção (b) refinada: trocar cada parte do nome com inicial maiúscula e deixar as partículas de
  fora. A dica da tela também muda.
- **Para um pedido futuro:**
  - B-1 (limite de dígitos no total) e B-5;
  - o B-4 do 0006 (foco da fila);
  - a convenção de `CLASSES_DO_PROJETO` no `padrao-tecnico.md` da estruturaAutonoma.
- **Para Fabiano:** a decisão sobre o Pedido de Construção com nomes, com os pareceres de `gestao-riscos`,
  `juridico-contratos` e `seguranca-aplicacao` de 04/11. Também a primeira publicação (CA-P5-16):
  - o QR da 2FA;
  - os segredos e a credencial do GHCR;
  - os serviços no Easypanel;
  - a seção 4 do `deploy.md`, com snapshot no hPanel antes.

## Publicação

Esta versão não tem migration nova. No push da `main`, o `deploy.yml` publica a imagem no GHCR com as tags sha, v0.1.9 e
latest, e depois chama os webhooks do Easypanel. Os segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER` ainda
não existem. Por isso o passo dos webhooks fica vermelho e nada vai para produção. Se for preciso voltar, o caminho A
da seção 6 do `deploy.md` leva à `v0.1.8`.

Merge: pela política (`construir.mjs merge`, CA-P7-05) quando ela está ligada e permite; senão, de Fabiano. Serviço no
Easypanel é ação de Fabiano.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
