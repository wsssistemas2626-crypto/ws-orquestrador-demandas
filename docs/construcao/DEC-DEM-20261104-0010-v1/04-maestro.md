---
pedido: DEC-DEM-20261104-0010-v1
etapa: 04-revisao
agente: maestro
leu: [construir.md seção 3, contrato-passagem.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-backend.md, 04-qa-automacao.md, git diff main...HEAD]
status: pronto
proximo: devops-sre
devolvido_para: null
---
## Entrega

Revisei o ramo `construcao/DEC-DEM-20261104-0010-v1` contra a `main` (`1d6d897`, versão 0.1.8). O código de produção
mudou em 7 arquivos de `src/` (`reduzir-erro.ts`, `sentry.ts`, `console-saneado.ts`, `rotulos.ts` e as 3 rotas POST de
`demandas/[id]`); o resto são testes, `package.json` (0.1.9) e as entregas. Nada em `src/db/`, `drizzle/`, `scripts/`,
`e2e/` nem `.github/`; sem migration.

- **B-1 do 0009:** `lerCode` recusa `code` com 10 ou mais dígitos seguidos; `classeAceita` aceita só `desconhecido`,
  identificador terminado em `Error` ou `Exception`, ou um nome de `CLASSES_DO_PROJETO` (lista fechada de 8, mantida
  pelo teste estático `test/estatico/classes-de-erro.test.ts`). Vale para `reduzirErro` (cai para `Error`) e para
  `erroJaReduzido` (nulo). Nenhuma asserção existente do log e dos avisos mudou.
- **B-3 do 0009:** nos 3 POST, `nomesDaDemanda` é lido antes do serviço; falha na leitura não grava nada, e 404, 409,
  429 e 400 continuam vindo do serviço.
- **B-a do 0008:** conferido no fonte do Next 16.4.1: no route handler o mesmo objeto de erro, sem `digest`, vai ao
  `console.error` e ao `onRequestError`. `capturarErro` marca o objeto num `WeakSet` e manda uma vez só.
- **B-1 do 0006:** teste estático pela AST do TypeScript barra chamada de `criarPacoteDecisao` em `src/app/` com 5 ou
  mais argumentos, espalhamento ou import renomeado.
- **B-5 do 0006:** `demanda_final` tem rótulo ("demanda já entregue ou encerrada").

Revisões usadas:

- **Código:** li o diff de `src/` e chamei o agente `feature-dev:code-reviewer` sobre o commit da correção (`ae1638e`),
  porque a skill `code-review` não leu o repositório do pedido (a sessão roda na estruturaAutonoma). Sem achado de
  confiança alta.
- **Segurança:** agente `seguranca-aplicacao`, sobre o commit da correção, com a 01, a 02 e a 03. Ele não gravou
  arquivo. A 04-regressao só acrescentou testes depois desse commit.
- A troca da classe de exemplo no `src/lib/sentry.test.ts` (`ErroDeConsulta` → `ConsultaError`, desvio 1 da 03) não
  afrouxa o controle: as três asserções continuam, e o caso antigo virou o teste de queda para `Error`.

Critérios de aceite:

1. `code` com 10 ou mais dígitos e classe fora da regra não saem no log nem no título do Sentry
   (`src/lib/reduzir-erro.test.ts`, `src/lib/log.test.ts`, `src/lib/sentry.test.ts`).
2. Nos 3 POST, falha ao ler os nomes não grava nada e os códigos do serviço não mudam
   (`src/app/api/demandas/nomes-antes-de-gravar.test.ts`).
3. Um envio ao Sentry por objeto de erro, nas duas ordens e com o `onRequestError` real
   (`src/instrumentation-sentry.test.ts`, `src/lib/sentry.test.ts`, `src/lib/console-saneado.test.ts`).
4. Teste estático de `criarPacoteDecisao` (`test/estatico/pacote-sem-extras.test.ts`) e rótulo de `demanda_final`
   (`src/components/rotulos.test.ts`).
5. `pnpm test` 3.999 de 3.999, lint e typecheck limpos, e2e 143 de 143 três vezes seguidas (04).

### Achados por severidade

**Crítico, Alto e Médio:** nenhum.

**Baixo** (todos do `seguranca-aplicacao`, salvo indicação)

- **B-1** (`src/lib/reduzir-erro.ts:9,40`): o `code` ainda passa com 9 dígitos, com dígitos separados por `_` ou com
  uma palavra; só se um chamador futuro puser dado pessoal em `code`, e nenhum caminho de hoje faz isso.
- **B-2** (`src/lib/reduzir-erro.ts:56`): `reduzirErro` não confere `typeof e.name === 'string'`; um `name` montado de
  propósito, com `toString` variável, passaria. Já existia antes.
- **B-3** (as 3 rotas POST): os nomes são lidos fora da transação, antes de `travarDemanda`; uma renomeação do
  solicitante no meio deixa o nome novo sair no 201 para o agente. Variante do M-1 do 0009.
- **B-4** (`src/lib/sentry.ts:47-50`): a marca é gravada antes de `reduzirErro` e do envio; se `reduzirErro` lançar, o
  erro fica marcado sem ter ido. Também: o mesmo objeto reaproveitado por várias requisições vai uma vez só (não achei
  nenhum no código).
- **B-5** (testes estáticos): `classes-de-erro.test.ts` não vê `get name()` nem `X.name = '...'` fora de `this`;
  `pacote-sem-extras.test.ts` não segue reexport, barrel nem `import()` dinâmico (hoje não há nenhum). Os dois também
  apontados pelo `feature-dev:code-reviewer`, que lembrou ainda que `JoanaSilvaError` passa pelo sufixo (limite aceito
  na 02).

Segurança: sem achado crítico ou alto. Nenhum segredo, nenhum dado pessoal real e nenhuma dependência nova.

## Decisões tomadas

- B-1 a B-5 vão para Pendências: o roteiro só devolve Crítico e Alto. B-2, B-3 e B-4 entraram no pedido
  `DEC-DEM-20261104-0011-v1` (M-1 do 0009, opção (b) refinada, decidida por Fabiano em 04/11), que mexe nos mesmos
  arquivos.
- Rodei a revisão de código e a de segurança em paralelo com a 04-regressao, sobre o commit da correção, para caber na
  janela de Fabiano (até as 15h30 de 04/11).
- Liberações nesta cadeia, todas só de leitura e pela regra de 25/10, registradas no `passagens.jsonl`: na 03, quatro
  listagens de arquivos rastreados (por falta de Glob e Grep); na 04, duas leituras de saída com `tail`.

## Pendências

- Para o pedido 0011: B-2, B-3 e B-4 desta revisão.
- Para um pedido futuro: B-1 (limite de dígitos no total) e B-5 (pontos cegos dos testes estáticos); a convenção de
  `CLASSES_DO_PROJETO` no padrão técnico (03).
- Para a `05-entrega` e a `06-documentacao`: a 0.1.9 no `CHANGELOG.md` (texto na Pendência da 03) e no `deploy.md`.

## Critério de pronto atendido

- [x] escopo conferido com `git diff main...HEAD --stat`
- [x] revisão de código feita (leitura do diff de `src/` e agente `feature-dev:code-reviewer`)
- [x] revisão de segurança feita (agente `seguranca-aplicacao`, porque a skill `security-review` lê a pasta da sessão)
- [x] achados registrados por severidade, com a revisão usada
- [x] sem achado crítico ou alto aberto
