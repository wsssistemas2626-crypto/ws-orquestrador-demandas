---
pedido: DEC-DEM-20261104-0012-v1
etapa: 03-correcao
agente: engenheiro-backend
leu: [contrato-passagem.md, pedido.json, padrao-tecnico.md, 01-qa-funcional.md, 02-tech-lead.md, DEC-DEM-20261104-0011-v1/03-engenheiro-backend.md (formato), src/modules/dados-pessoais/detectores.ts, src/modules/dados-pessoais/detectores.test.ts, src/modules/dados-pessoais/minimizar.ts, src/modules/dados-pessoais/minimizar.test.ts, src/modules/pedido-construcao/gerar.ts (1-75), src/lib/reduzir-erro.ts, src/lib/reduzir-erro.test.ts, src/lib/sentry.ts, src/lib/sentry.test.ts, src/lib/log.ts, src/lib/log.test.ts, src/lib/erros.ts, src/lib/erros.test.ts, src/lib/rota.ts, src/lib/rota.test.ts, src/instrumentation.ts, src/instrumentation.test.ts, src/lib/console-saneado.ts, src/lib/console-saneado.test.ts, src/components/dados-da-demanda.ts, src/components/dados-da-demanda.test.ts, "src/app/(painel)/demandas/nova/formularios.test.ts (50-134)", test/estatico/projeto.test.ts (1-40), package.json (1-6), .prettierrc]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Os cinco defeitos corrigidos na ordem da 02 (M-a + B-2, B-1, B-4, B-3), cada um com o teste escrito antes e visto
falhando na base. Versão `0.1.11` no `package.json`. Sem migration, sem pacote novo (`pnpm-lock.yaml` não mudou).
Todos os nomes, e-mails e erros dos testes são fictícios; e-mail só no domínio `exemplo.test`.

### Arquivos alterados (código)

- `src/modules/dados-pessoais/detectores.ts` (M-a, B-2): `DETECTORES['e-mail']` é a regex exata da 02,
  `/(?<![\p{L}\p{M}\p{N}._%+-])[\p{L}\p{M}\p{N}._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/gu`, sem `{1,64}` nem `{1,255}`.
  Comentário novo com a razão da âncora e da flag `u`. Nenhum chamador mudou.
- `src/modules/dados-pessoais/minimizar.ts` (B-1): `ANTES`/`DEPOIS` do nome completo só com letra e marca; `[\s_]+` entre
  os pedaços; a regex das partes ficou só a alternância (`giu`, sem lookaround); `haFronteira(s, pos)` nova e exportada
  (para teste), com a regra da 02 (x pula marcas para trás, z pula as marcas de y; código por code point, com par
  substituto); `trocarNoTrecho(trecho, re, aceitar(trecho, inicio, fim))` com laço `re.exec`, `lastIndex = 0` no começo e,
  no recusado, recomeço um code point depois do início; `aceitarParte` = inicial maiúscula + `haFronteira` nas duas
  pontas; o nome completo passa `() => true`. Comentário do topo (itens 3 e 4) e o das bordas atualizados. Assinaturas
  exportadas de antes iguais.
- `src/components/dados-da-demanda.ts` (B-4): `avisoMinimizacao` e `dicaNome` com os textos exatos da 02; comentário
  atualizado.
- `src/lib/reduzir-erro.ts` (B-3): `ehErro` e `lerDigest` novas; `lerCode` virou a versão interna `lerCodeOuLancar`
  (corpo de antes) dentro de `try`; `erroJaReduzido` com `try` (exceção → `null`); `reduzirErro` faz
  `if (!ehErro(e)) return { classe: 'desconhecido' }` e o corpo de antes num `try`, lendo `code` pela versão que lança,
  com `catch` → `{ classe: 'Error' }`. As cinco funções nunca lançam.
- `src/lib/log.ts`: `normalizarErro` usa `ehErro(valor)`.
- `src/lib/erros.ts`: `mapearErro` com o corpo num `try`; exceção cai no mesmo 500 `erro_interno` do fim.
- `src/instrumentation.ts`: `digestDe` saiu; `lerDigest(err)` (o import de `reduzir-erro` subiu para antes da leitura do
  digest).
- `src/lib/console-saneado.ts`: `digestDe` saiu; `args.find(ehErro)`, `lerDigest(erro)` e `digest === undefined` no lugar
  de `!('digest' in erro)`.
- `src/lib/sentry.ts`: só o comentário do B-4 do 0010 ("Se o envio lança").
- `package.json`: `0.1.11`.

### Testes criados ou mudados

- `src/modules/dados-pessoais/detectores.test.ts`, bloco "M-a e B-2 do 0011" (42 casos): 6 de tempo com `search` = -1
  abaixo de 200 ms (os seis textos da 02); Pedido de Construção com 100 mil + 50 × 10 mil e os três tipos de `gerar.ts:42`,
  e os 50 × 10 mil sozinhos com `['e-mail']`, abaixo de 200 ms; flags `g` e `u`; equivalência com a regex antiga (`ANTIGA`)
  num corpus de 29 textos curtos (casos de `detectores.test.ts:7-19`, `minimizar.test.ts:27-40`, `:171-199`, `:288`, os
  formatos do item 2 e as bordas), conferindo mesma quantidade de casamentos, início igual ou antes e fim igual; o corpus
  tem menos de 200 caracteres por texto (caso próprio); Pedido de Construção acha `e-mail` para o usuário de 68
  caracteres, para `joão.ficticia@exemplo.test` e para a forma NFD.
- `src/modules/dados-pessoais/minimizar.test.ts`:
  - bloco "M-a e B-2 do 0011" (20 casos): os dois de tempo de `minimizar` abaixo de 200 ms; os 10 formatos que viram um
    marcador; `<x@...>`, `mailto:`, ponto final, `x@y@...`, separador `-` e `_` colado e com espaço, todos idempotentes;
  - bloco "B-1 do 0011: nome grudado": os 16 casos da tabela da 02, com idempotência; 16 casos unitários de
    `haFronteira` (inclusive NFD e fim de sigla com marca); os 4 de tempo com 100.000 caracteres e o nome `Ana Ficticia`,
    abaixo de 1 s.
- `src/components/dados-da-demanda.test.ts` e `src/app/(painel)/demandas/nova/formularios.test.ts`: as frases novas, e
  caso novo de que o aviso contém `3 letras ou mais` e `da, dos e Júnior` e a dica contém `toda em minúscula`. O teste
  de `não é enviado ao agente`/`sem o nome do solicitante` continua igual e verde.
- `src/lib/reduzir-erro.test.ts`, bloco "B-3 do 0011" (8 casos): getter que lança em `name`, em `code` (com `name`
  `TypeError` válido) e em `cause` → `Error`; Proxy de `get` e de `has` → `Error`; Proxy de `getPrototypeOf` →
  `desconhecido`; `lerCode` indefinido e `erroJaReduzido` nulo com getter de `code` que lança e com Proxy de `ownKeys`;
  `ehErro` e `lerDigest` não lançam com os Proxys; caso comum de `ehErro` e `lerDigest` (objeto e função com `digest`).
- `src/lib/log.test.ts`: `log.error({ evento: 'x', erro })` não lança e escreve `{ classe: 'Error' }` (getter de `name`),
  `{ classe: 'desconhecido' }` (objeto com getter de `code`) e `{ classe: 'desconhecido' }` (Proxy de `getPrototypeOf`).
- `src/lib/sentry.test.ts`: bloco "B-3 do 0011" (getter de `name` e Proxy de `get`: não lança, um evento com
  `"value":"Error"`); `vi.mock` parcial de `@sentry/node` com `falhaNoEnvio` (`vi.hoisted`), exatamente o da 02, no topo
  do arquivo. Os outros 24 casos do arquivo seguiram verdes com o mock, sem precisar de `sentry-marca.test.ts`.
- `src/lib/rota.test.ts`: `it.each` com o Error de getter de `name` e o Proxy de `getPrototypeOf`: 500 com
  `{ erro: 'erro_interno', mensagem: MENSAGEM_ERRO_INTERNO }`, os três cabeçalhos da rota, a linha `requisicao` com
  `status: 500` e `capturados.erros` com o mesmo objeto (comparação por identidade, para não disparar a armadilha).
- `src/lib/erros.test.ts`: `mapearErro` do Proxy de `getPrototypeOf` → 500 `erro_interno`.
- `src/instrumentation.test.ts`: Proxy de `has` → `onRequestError` resolve, uma linha `erro_requisicao` com
  `erro: { classe: 'Error' }` e sem `erroId`, e `capturarErro` chamado com o mesmo objeto e `{ evento: 'erro_requisicao' }`.
- `src/lib/console-saneado.test.ts`: `console.error` do Error de getter de `name` escreve `console_erro` com
  `erro: { classe: 'Error' }`; o do Proxy de `getPrototypeOf` escreve `console_erro` sem `erro`.
- `test/estatico/projeto.test.ts`: versão `0.1.11`.

### Testes vistos falhando na base (antes do código)

- M-a + B-2: `pnpm --dir <repo> test src/modules/dados-pessoais/detectores.test.ts src/modules/dados-pessoais/minimizar.test.ts`
  — 14 falhas de 202, em 101 s. Trechos: `AssertionError: expected 15302.659273000001 to be less than 200` (100 mil
  letras), `expected 17313.264755000004 to be less than 200` (`'a@' + '.a'.repeat(49_999)`), `expected 20637.454067 to be
  less than 200` (Pedido com 100 mil + 50 × 10 mil), `expected 6226.268791999988 to be less than 200` (50 × 10 mil
  sozinhos), `expected 'g' to contain 'u'`, `Expected: "Antes [e-mail removido] depois." Received: "Antes
  joã[e-mail removido] depois."`. Depois do código: 202 de 202, em 6,6 s.
- B-1: `pnpm --dir <repo> test src/modules/dados-pessoais/minimizar.test.ts` — 16 falhas de 159. Trechos:
  `Expected: "A [nome removido]2 pediu" Received: "A Joana2 pediu"`; `Expected: "An[nome removido]" Received: "AnAna"`;
  `Received: "Fale com [nome removido] e PessoaXFicticia"`; `Received: "[nome removido], éAna e Anaé"`. Os 4 de tempo e os
  casos que ficam iguais (`JOANAFICTICIA`, `Mariana`, `ANATEL`) passaram já na base, como esperado.
- B-4: `pnpm --dir <repo> test src/components/dados-da-demanda.test.ts "src/app/(painel)/demandas/nova/formularios.test.ts"`
  — 4 falhas de 41. Trecho: `AssertionError: expected 'O agente recebe só o texto, sem a ori…' to contain '3 letras ou mais'`.
- B-3: `pnpm --dir <repo> test src/lib/reduzir-erro.test.ts src/lib/log.test.ts src/lib/sentry.test.ts src/lib/rota.test.ts src/lib/erros.test.ts src/instrumentation.test.ts src/lib/console-saneado.test.ts`
  — 15 falhas de 224. Trechos: `promise rejected "Error: armadilha fictícia" instead of resolving ❯ digestDe
  src/instrumentation.ts:33:53`; `expected [] to have a length of 2 but got +0` (console saneado, a linha sumia);
  `Error: getter fictício ❯ mapearErro src/lib/erros.ts:85:7 ❯ handler src/lib/rota.ts:156:33`; `expected [Function] to
  not throw an error but 'Error: getter fictício' was thrown` (log e `capturarErro`); `ehErro is not a function`.
- Versão: `pnpm --dir <repo> test test/estatico/projeto.test.ts` — 1 falha de 11 (`expected '0.1.10' to be '0.1.11'`).

### Esperados existentes que mudaram (arquivo:linha da base, antes → depois, regra)

1. `src/modules/dados-pessoais/minimizar.test.ts:147-149`: `` `Fale com ${MARCADOR_NOME} e PessoaXFicticia` `` →
   `` `Fale com ${MARCADOR_NOME} e ${MARCADOR_NOME}X${MARCADOR_NOME}` `` — CamelCase (`Pessoa|X`) e fim de sigla
   (`X|Ficticia`). Listado na 02; comentário novo acima do teste.
2. `src/modules/dados-pessoais/minimizar.test.ts:168`: `` `${MARCADOR_NOME}, éAna e Anaé` `` →
   `` `${MARCADOR_NOME}, é${MARCADOR_NOME} e Anaé` `` — CamelCase (`é|Ana`); `Ana|é` continua sem borda. Listado na 02;
   título do teste ajustado.
3. `src/modules/dados-pessoais/minimizar.test.ts:414`: `'Joana2 e Joana_x e x_Joana e 2Joana'` (igual) →
   `` `${M}2 e ${M}_x e x_${M} e 2${M}` `` — número e `_` colados são borda. Listado na 02; comentários de `:412` e do
   `describe` (`:397-399`) ajustados.
4. `src/lib/sentry.test.ts:263-284` (B-4 do 0010): a falha injetada passou do getter de `code` ao `captureException`
   (mock da 02); `expect(() => capturarErro(e)).toThrow()` → `.toThrow('falha fictícia no envio')`, com `e` de `code`
   `'23505'` comum. O resto do teste (0 envio, depois 1 só, `Error 23505`) igual. Listado na 02.
5. `test/estatico/projeto.test.ts:27-30`: versão `0.1.10` → `0.1.11` (efeito da versão pedida na 02).

Nenhum outro esperado mudou: `vistas-para-agente.test.ts`, `entrada-agente.test.ts`, `demandas.test.ts`,
`test/transversal/sentinelas.test.ts` e os demais passaram sem ajuste. Nenhum outro teste afirmava que algo lança com
getter ou Proxy.

### Comandos e resultado final

- `pnpm test` (com `--silent --reporter=junit --outputFile=<scratchpad>`, porque a saída de tela é cortada pelo volume
  de log do pino): **4196 testes, 0 falhas, 0 erros** (linha 2 do relatório: `tests="4196" failures="0" errors="0"`).
- `pnpm lint`: limpo. `pnpm typecheck`: limpo.

### Desvios do plano, com a razão

1. **`haFronteira` exportada e com teste unitário próprio** (16 casos), como a 02 permite ("pode exportar para teste").
   Esses casos foram escritos depois do código: a falha na base do B-1 foi mostrada pela tabela da 02, que passa por
   `minimizar`; os unitários só fixam a regra função a função.
2. **`lerDigest` aceita função**, além de objeto, como a interface da 02 escreve; o `digestDe` de antes só olhava objeto.
   Nenhum chamador passa função hoje.
3. **Console saneado**: a troca de `!('digest' in erro)` por `lerDigest(erro) === undefined`, exatamente como a 02 manda,
   muda um caso que nenhum teste cobre: um Error com a chave `digest` presente e valor `undefined` passa a ir ao Sentry
   (antes, não ia). Registro para a `04-revisao`.
4. **Corpus da equivalência** com três textos a mais além dos listados (`linha` + separador com espaço, e os dois
   separadores colados), todos com menos de 200 caracteres, para cobrir os casos do item 2 da 02 que mexem no início do
   casamento.

## Decisões tomadas

- Regex do e-mail exatamente a da 02, sem limite de tamanho: com a âncora, o custo já é linear (a medição caiu de 15 s a 20 s por caso para o arquivo inteiro em 6,6 s).
- `codePointEm`/`codePointAntes` em `minimizar.ts` para o recomeço do `exec` e para `x`, `y` e `z` de `haFronteira`, porque a regra é por code point e o texto pode ter par substituto.
- As regex de caixa de `haFronteira` (`\p{L}`, `\p{Ll}`, `\p{Lu}`, `\p{M}`) sem flag `i`, porque com `iu` `\p{Lu}` casa minúscula (nota 5 da 02).
- `lerCodeOuLancar` interna, usada por `reduzirErro` e por `erroJaReduzido` dentro do `try` de cada um, para a exceção do getter de `code` virar `{ classe: 'Error' }` e `null`, e não `code` ausente com a classe lida antes.
- Em `onRequestError`, o import de `reduzir-erro` subiu para antes da leitura do `digest`: `lerDigest` mora lá, e a ordem das outras leituras não mudou.
- O mock parcial de `@sentry/node` ficou no próprio `sentry.test.ts` (sem `sentry-marca.test.ts`), porque os outros 24 casos do arquivo seguiram verdes com ele.
- Nos testes com Proxy, a comparação do objeto capturado é por identidade (`=== erro`), para o `toEqual` não disparar a armadilha dentro do teste.

## Pendências

1. Para a `06-documentacao` (`documentacao-tecnica`), texto sugerido para o `CHANGELOG.md` (não toquei no arquivo, como o
   maestro pediu):

   ```markdown
   ## 0.1.11 — 2026-11-04

   Pedido DEC-DEM-20261104-0012-v1 (correção): médio M-a e baixos B-1 a B-4 da revisão do 0011.

   ### Corrigido
   - M-a: o detector de e-mail (minimização do que vai ao agente, vista da API de quem não é pessoa e bloqueio do Pedido
     de Construção) tem custo linear. Um texto de 100 mil caracteres sem "@" travava o processo por cerca de 20 s; agora
     passa em milissegundos. O início do e-mail é ancorado, sem limite de tamanho no usuário, e todo e-mail detectado
     antes continua detectado.
   - B-2: o usuário do e-mail aceita letra com acento, também em texto decomposto (NFD): `joão.ficticia@exemplo.test`
     vira um marcador só, sem sobrar o começo do nome.
   - B-1: a parte do nome do solicitante também vira `[nome removido]` grudada em número, em "_" ou em CamelCase
     (`Joana2`, `Joana_x`, `@JoanaFicticia`, `JOANAFicticia`), e o nome completo aceita "_" entre os pedaços
     (`Joana_Ficticia`). Continua a regra da inicial maiúscula; palavra toda em maiúscula sem separador (`ANATEL`) e o
     nome no meio de outra palavra em minúscula (`Mariana`) ficam. Falso positivo aceito: CamelCase com uma parte do nome
     (`RosaTech`, `MariAna`).
   - B-4: o aviso de minimização diz o mínimo de 3 letras e as partículas, e a dica do campo "Nome do solicitante" diz
     que a parte do nome escrita toda em minúscula não é trocada.
   - B-3: um erro com getter que lança (em `name`, `code` ou `cause`) ou um Proxy não faz mais a redução do erro lançar:
     a rota responde o 500 padrão com os cabeçalhos dela, a linha do log sai e o erro chega ao Sentry com o título
     `Error` (ou `desconhecido`, quando não dá para saber se é um Error).
   ```

2. Para a `04-regressao` (`qa-automacao`): rodar `pnpm test:e2e` três vezes, como na definição de pronto. Não conferi
   `e2e/` (a 01 diz que nenhum teste de lá fixa o aviso ou a dica).
3. Para a `04-revisao` (maestro), registros: (a) o desvio 3 acima (Error com `digest: undefined` explícito passa a ir ao
   Sentry pelo console saneado); (b) o risco herdado da 02, Pendência 2 (`AnaBelax` com as partes `Ana` e `Anabela` fica
   igual, porque a alternância não volta à parte mais curta na mesma posição).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --branch` — ramo `construcao/DEC-DEM-20261104-0012-v1`, limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/dados-pessoais/detectores.test.ts src/modules/dados-pessoais/minimizar.test.ts` — 14 falhas de 202 (base, M-a e B-2)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/dados-pessoais/detectores.test.ts src/modules/dados-pessoais/minimizar.test.ts` — 202 de 202
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/dados-pessoais/minimizar.test.ts` — 16 falhas de 159 (base, B-1)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/dados-pessoais` — 238 de 238
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-da-demanda.test.ts "src/app/(painel)/demandas/nova/formularios.test.ts"` — 4 falhas de 41 (base, B-4)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-da-demanda.test.ts "src/app/(painel)/demandas/nova/formularios.test.ts"` — 41 de 41
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/reduzir-erro.test.ts src/lib/log.test.ts src/lib/sentry.test.ts src/lib/rota.test.ts src/lib/erros.test.ts src/instrumentation.test.ts src/lib/console-saneado.test.ts` — 15 falhas de 224 (base, B-3)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/reduzir-erro.test.ts src/lib/log.test.ts src/lib/sentry.test.ts src/lib/rota.test.ts src/lib/erros.test.ts src/instrumentation.test.ts src/lib/console-saneado.test.ts` — 224 de 224
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/projeto.test.ts` — 1 falha de 11 (base, versão)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/vitest-0012-03.xml` — 4196 testes, 0 falhas, 0 erros
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 22 arquivos modificados, todos em `src/`, `test/` e `package.json`

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
