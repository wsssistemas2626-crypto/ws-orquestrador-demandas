---
pedido: DEC-DEM-20261103-0008-v1
etapa: 04-revisao
agente: maestro
leu: [construir.md seção 3, contrato-passagem.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-backend.md, 04-qa-automacao.md, git diff main...HEAD]
status: pronto
proximo: devops-sre
devolvido_para: null
---
## Entrega

Revisei o ramo `construcao/DEC-DEM-20261103-0008-v1` contra a `main` (`75a2b0f`, versão 0.1.6). O código de produção
mudou em `src/`; o resto são testes, `package.json` (0.1.7) e as entregas. Nada em `src/db/`, `drizzle/`, `scripts/`,
`e2e/` nem `.github/`; sem migration.

- **M-1 (RF-20):** `vistaDaDemandaPara` e a nova `listarDemandasPara` (`src/modules/demandas/consultas.ts`) passam o
  título e o texto livre da demanda por `minimizarValor`, com o nome do solicitante entre os trocados, para todo ator
  que não é pessoa; a listagem `GET /api/demandas` usa a nova função. `minimizarValor` saiu de `entrada-agente.ts` para
  `src/modules/dados-pessoais/minimizar.ts`, sem mudar `minimizar`.
- **M-2:** as sete rotas de leitura de ESP, RSK e DEC aplicam a vista mínima: autor pessoa vira só `{tipo:'pessoa'}`,
  aprovadores sem `nome` e `referenciaDocumento`, decisão sem `decididaPor`.
- **M-3:** `src/lib/console-saneado.ts` manda ao Sentry, por `capturarErro`, o `Error` sem `digest` escrito por
  `console.error`, dentro da guarda contra reentrada; o `warn` fica só no log.
- **B-1:** `src/instrumentation.ts` passa `reduzirErro(err)` ao log.

Revisões usadas:

- **Código:** li o diff de `src/` e rodei a skill `code-review` em nível baixo, que apontou um defeito (o M-a abaixo,
  o mesmo da segurança).
- **Segurança:** agente `seguranca-aplicacao`, sobre o diff do commit da correção (`f730450`), com a 01, a 02 e a 03.
  Ele não gravou arquivo. A 04-regressao só acrescentou testes depois desse commit.

Critérios de aceite:

1. M-1 **na demanda**: leitura por id, criação e listagem minimizam o texto livre para quem não é pessoa; a pessoa vê
   o original (testes nos dois atores, inclusive `sistema`). **Fora da demanda, o M-1 não fechou: ver M-a.**
2. M-2: o agente não recebe nome de pessoa nem `referenciaDocumento` nas leituras de ESP, RSK e DEC; a pessoa recebe
   (`src/app/api/vistas-para-agente.test.ts`).
3. M-3: `Error` sem `digest` vai ao Sentry sem laço e sem dado (mesmo saneamento do `capturarErro`).
4. Testes: `pnpm test` 3.907 de 3.907; `pnpm test:e2e` 143 de 143 em três rodadas, nenhum pulado.
5. O `python3 -c` da 03 só acrescentou linhas a `src/app/api/demandas/demandas.test.ts`: nenhuma asserção afrouxada
   (conferido no diff pelo maestro e pela segurança).

### Achados por severidade

**Crítico e Alto:** nenhum.

**Médio**

- **M-a (M-1 incompleto, RF-20, dado pessoal)** (`src/modules/pacotes-decisao/consultas.ts:189-190`, skill
  `code-review` e `seguranca-aplicacao`): o DEC guarda cópia do título e da descrição da demanda (`criar.ts:122-123`;
  a descrição junta contexto, problema, impacto e os outros campos), e `demandaTitulo` e `demandaDescricao` saem sem
  minimizar para quem não é pessoa em `GET /api/pacotes-decisao`, `GET /api/pacotes-decisao/:decId`,
  `GET /api/demandas/:id/pacotes-decisao` e no 201 do `POST /api/demandas/:id/pacotes-decisao` (que nem passa pela
  `vistaDoPacotePara`). No mesmo grupo saem sem minimizar `decisao.comentarios` (texto livre de pessoa) e o texto da
  ESP e do RSK (`especificacoes/consultas.ts:81` em diante), que a entrada do agente minimiza e a API não. Efeito: o
  token de agente lê no DEC o mesmo texto que agora sai minimizado na demanda. **O M-1 continua bloqueando a primeira
  publicação** até um pedido seguinte ou o aceite de Fabiano e da `gestao-riscos`.

**Baixo**

- **B-a** (`src/lib/console-saneado.ts:38`): a não duplicação no Sentry depende de o Next não mandar o mesmo erro sem
  `digest` ao `onRequestError` e ao `console.error`; não conferido no fonte do Next. Efeito, no máximo, um evento a
  mais, sem dado.
- **B-b** (`src/lib/log.ts:59`): `normalizarErro` não reduz objeto que não é `Error`; o B-1 corrigiu só quem chama no
  `onRequestError`. Melhor reduzir na própria `normalizarErro`.

Segurança: sem achado crítico ou alto. Nenhum segredo, nenhum dado pessoal real e nenhuma dependência nova.

## Decisões tomadas

- M-a, B-a e B-b vão para Pendências: o roteiro só devolve Crítico e Alto. Mantive o M-a como médio, a mesma
  severidade do M-1 de onde ele vem.
- Não abri volta de correção nesta janela: uma 04-correcao com nova regressão (três rodadas do e2e, cerca de 1h) não
  cabe até as 18h30 UTC. A 0.1.7 é uma melhora estrita sobre a 0.1.6: fecha o M-1 na demanda, o M-2, o M-3 e o B-1.
- Liberações nesta cadeia: na 03, um `python3 -c` que editou `src/app/api/demandas/demandas.test.ts`, por delegação de
  Fabiano de 03/11, e um `git ls-files` e um `tail` (só leitura), pela regra de 25/10, registrados no
  `passagens.jsonl`. O Glob apareceu indisponível ao subagente de novo (R1.1 do parecer da `governanca-ia`).

## Pendências

- **Para um pedido 0009, antes da primeira publicação:** M-a (minimizar `demandaTitulo`, `demandaDescricao`,
  `decisao.comentarios` e o texto de ESP e RSK para quem não é pessoa, inclusive no 201 do POST do DEC), com B-b.
- Para Fabiano e a `gestao-riscos`: aceitar ou não o M-a como risco até o 0009.
- Para quem mexer no console saneado: B-a.
- Para o `devops-sre` (05) e a `documentacao-tecnica` (06): a 0.1.7 no CHANGELOG e no `deploy.md`, com o M-a aberto e
  bloqueando a primeira publicação.

## Critério de pronto atendido

- [x] escopo conferido com `git diff main...HEAD --stat`
- [x] revisão de código feita (leitura do diff de `src/` e skill `code-review`, nível baixo)
- [x] revisão de segurança feita (agente `seguranca-aplicacao`, porque a skill `security-review` lê a pasta da sessão)
- [x] achados registrados por severidade, com a revisão usada
- [x] sem achado crítico ou alto aberto
