---
pedido: DEC-DEM-20261104-0012-v1
etapa: 03-correcao
agente: engenheiro-backend
leu: [contrato-passagem.md, 02-tech-lead.md, 03-engenheiro-backend.md (volta anterior), 04-qa-automacao.md, src/modules/dados-pessoais/detectores.ts, src/modules/dados-pessoais/detectores.test.ts, src/modules/dados-pessoais/minimizar.ts, src/modules/dados-pessoais/minimizar.test.ts (1-30, 560-629), src/lib/sentry.ts, src/lib/sentry.test.ts, src/components/dados-da-demanda.ts, src/components/dados-da-demanda.test.ts (50-84), "src/app/(painel)/demandas/nova/formularios.test.ts (115-129)", eslint.config.mjs]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

2ª volta da `03-correcao`, pela devolução da `04-qa-automacao.md` (M-a: e-mail colado no fim de outro sai em claro) e
pelos dois baixos da revisão de segurança (B-1 da frase do aviso e B-2 do `stack` lido mais de uma vez). Os 13 testes
da 04 passam sem nenhuma mudança neles (`git diff --numstat`: `detectores.test.ts` e `minimizar.test.ts` só com
inclusões). Sem pacote novo, sem migration, sem mudança de versão (segue `0.1.11`).

### Arquivos alterados (código)

- `src/modules/dados-pessoais/detectores.ts` (M-a): `DETECTORES['e-mail']` passou a ser uma instância de
  `DetectorDeEmail`, subclasse de `RegExp` com o **mesmo padrão ancorado** da 02 (flags `gu`) e com `exec` sobrescrito:
  quando a busca é global, não sticky, e continua de um `lastIndex` > 0 (o fim do casamento anterior em `replace` e
  `matchAll`), tenta primeiro, só naquela posição, uma cópia sem lookbehind com a flag `y`
  (`/[\p{L}\p{M}\p{N}._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/uy`, privada por instância); se não casar ali, segue a regex
  ancorada (`super.exec`). É a correção sugerida pela revisão de segurança, posta no próprio detector. Comentário de
  `detectores.ts:9-15` refeito: tirada a afirmação "nenhum e-mail detectado antes deixa de ser" da âncora sozinha, com a
  causa da perda, a tentativa extra, o argumento de custo linear e a garantia que vale agora (todo caractere coberto pela
  regex de antes continua coberto). Nenhum chamador mudou; `minimizar.ts` não mudou (o `replace` dele já passa pelo
  `exec` sobrescrito), por isso o comentário do topo dele continua certo.
- `src/lib/sentry.ts` (B-2): `quadrosDaPilha` lê `e.stack` uma vez, numa variável `pilha`, e confere tipo, cabeçalho e
  quadros sobre ela. Comentário acrescentado com a razão.
- `src/components/dados-da-demanda.ts` (B-1): no `avisoMinimizacao`, "fora partículas como da, dos e Júnior" passou a
  "fora partículas como dos, das e Júnior".

### Testes criados ou mudados

- `src/modules/dados-pessoais/detectores.test.ts`, bloco novo "M-a do 0011 (03-correcao do 0012, 2ª volta): e-mail
  colado no fim de outro" (11 casos): cadeia de 20 mil e-mails colados por `+`, `_`, `-` e `%` (340 mil caracteres) com
  os mesmos casamentos da regex de antes e abaixo de 200 ms (4); tempo abaixo de 200 ms para e-mail seguido de 1.000
  caracteres de usuário sem `@` (100 vezes), e-mail seguido de `+a@b` 25 mil vezes, e-mail seguido de 100 mil letras e
  `a@b.cc` colado 15 mil vezes (4); `search` começa do zero e não muda o `lastIndex`; `replace` troca os dois colados e
  deixa o `lastIndex` em zero; o detector continua `RegExp`, flags `gu` e padrão ancorado.
- `src/modules/dados-pessoais/minimizar.test.ts`, bloco novo "M-a do 0011 (03-correcao do 0012, 2ª volta): cadeia de
  e-mails colados em minimizar" (5 casos): 20 mil e-mails colados por `+`, `_`, `-` e `%` viram 20 mil marcadores (sobra
  só o separador final), abaixo de 200 ms; `ana@exemplo.testébia@exemplo.test` vira dois marcadores.
- `src/lib/sentry.test.ts` (2 casos novos, B-2): getter de `stack` que devolve o `stack` bom na 1ª leitura e outro texto
  com sentinela nas seguintes (lido uma vez só, sem sentinela no envelope, com o quadro fictício); getter que devolve o
  bom nas duas primeiras leituras e o texto com sentinela na 3ª (sem sentinela no envelope).
- Esperados mudados (B-1, pedido pelo maestro): `src/components/dados-da-demanda.test.ts:56-58` (frase inteira) e `:81`
  (`da, dos e Júnior` → `dos, das e Júnior`, mais `not.toContain('como da,')`), com comentário da razão; e
  `src/app/(painel)/demandas/nova/formularios.test.ts:124` (frase inteira).

### Testes vistos falhando (antes do código)

`pnpm --dir <repo> test src/modules/dados-pessoais src/components/dados-da-demanda.test.ts "src/app/(painel)/demandas/nova/formularios.test.ts" src/lib/sentry.test.ts --silent --reporter=dot`
— **28 falhas** (os 13 da 04 e os novos). Trechos:
- `FAIL src/modules/dados-pessoais/detectores.test.ts > M-a do 0011 (04-regressao do 0012): ... > e-mails colados: "joana.ficticia@exemplo.test+pedro.ficticio@exemplo.test" fica coberto como antes` — `AssertionError: expected [ 27, 28, 29, 30, 31, 32, 33, …(21) ] to deeply equal []`;
- `FAIL src/lib/sentry.test.ts > getter de stack que muda a cada leitura ...` — `AssertionError: expected 2 to be 1`;
- `FAIL src/lib/sentry.test.ts > getter de stack que devolve o cabeçalho certo nas duas primeiras leituras ...` —
  `AssertionError: expected true to be false` (a sentinela chegava ao envelope);
- `FAIL src/components/dados-da-demanda.test.ts > ... > B-4 do 0011 ...` — `expected 'O agente recebe só o texto, sem a ori…' to contain 'dos, das e Júnior'`.

Depois do código, o mesmo comando: **351 de 351**, em 7,8 s (os testes de tempo, inclusive as cadeias de 340 mil
caracteres, dentro de 200 ms).

### Resultado final

- `pnpm test` (com `--silent --reporter=junit --outputFile=<scratchpad>`, porque a saída de tela é cortada pelo volume de
  log do pino): **4242 testes, 0 falhas, 0 erros** (linha 2 do relatório: `tests="4242" failures="0" errors="0"`). São os
  4224 da 04 mais os 18 novos desta volta.
- `pnpm lint`: limpo. `pnpm typecheck`: limpo.

### Desvios do plano, com a razão

1. **A tentativa sticky ficou no `exec` do detector, e não em `minimizar`.** 8 dos 13 testes da 04 chamam
   `t.matchAll(DETECTORES['e-mail'])` direto (`detectores.test.ts`, bloco da 04); uma correção só na troca de
   `minimizar` deixaria esses 8 vermelhos. Sobrescrever `exec` numa subclasse de `RegExp` vale para `replace`,
   `matchAll` (que cria a instância nova por `Symbol.species`, com a própria cópia sticky) e `search`, sem mudar nenhum
   chamador. O `search` do Pedido de Construção começa em `lastIndex` 0 e não usa a tentativa extra, como o maestro pediu.
   O `split` (que cria a cópia com `y`) fica de fora da tentativa extra (`!this.sticky`); ninguém usa o detector em
   `split`.
2. **Sem laço de `replace` até estabilizar**, como mandado. Custo: a tentativa extra em cada fim de casamento percorre a
   sequência de usuário que começa ali e, se houver `@`, o domínio depois dele; se falhar, a regex ancorada pula a mesma
   sequência (posições barradas pelo lookbehind), e o casamento seguinte, quando começa no domínio já percorrido, termina
   depois dele. As faixas percorridas pela tentativa extra não se sobrepõem: linear, medido nas cadeias de 20 mil
   e-mails colados e nos casos de falha logo depois de cada e-mail.
3. **Construtor com `_origem` ignorado**: `matchAll` e `split` chamam `new DetectorDeEmail(origem, flags)`; o padrão é
   sempre o do e-mail, e só as flags vêm de quem chama.

## Decisões tomadas

- Subclasse de `RegExp` em vez de outro tipo de objeto: o tipo `Record<TipoDadoPessoal, RegExp>`, o `flags`, o
  `lastIndex` e todos os chamadores ficam iguais, e o teste da 02 que exige `g` e `u` continua valendo.
- Cópia sticky privada (`#colado`) por instância, e não uma constante do módulo, para duas buscas (a do `matchAll` e a
  do `replace`) não dividirem `lastIndex`.
- A tentativa extra só com `lastIndex` > 0 em busca global: é exatamente o ponto em que a regex de antes recomeçava; em 0
  o lookbehind não perde nada (começo do texto).
- B-2 com `const pilha: unknown = e.stack` e as três conferências sobre a mesma variável: o teste conta as leituras do
  getter (uma só).
- B-1: a frase troca o exemplo "da" (2 letras, já fora pelo mínimo) por "das"; o teste ganhou `not.toContain('como da,')`
  para a frase antiga não voltar.
- Procurei pelo git, só em leitura, o texto da frase do aviso e os usos de `stack` em `src/`, `test/` e `e2e/` (achou
  `dados-da-demanda.test.ts:57,79`, `formularios.test.ts:124` e `sentry.ts:26-31`), e li pelo git a configuração do
  ESLint (`eslint.config.mjs`) para ver as regras do lint antes de escrever a subclasse; as duas leituras foram liberadas
  pelo maestro.

## Pendências

1. Para a `04-regressao` (`qa-automacao`): `pnpm test:e2e` três vezes seguidas sobre o código corrigido. A busca de
   texto pelo git não achou a frase do aviso em `e2e/`.
2. Para a `06-documentacao`: no texto sugerido do `CHANGELOG.md` da volta anterior, o item M-a pode dizer também que o
   e-mail colado no fim de outro (`a@exemplo.test+b@exemplo.test`) continua virando dois marcadores, e o B-4 que o aviso
   cita "dos, das e Júnior".
3. Para a `04-revisao`, registros que continuam da volta anterior: Error com `digest: undefined` explícito passa a ir ao
   Sentry pelo console saneado; `AnaBelax` com as partes `Ana` e `Anabela` fica igual.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261104-0012-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — `e35c3ea` (04-regressao) no topo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — só `detectores.test.ts` (58 inclusões) antes dos outros testes
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/dados-pessoais src/components/dados-da-demanda.test.ts "src/app/(painel)/demandas/nova/formularios.test.ts" src/lib/sentry.test.ts --silent --reporter=dot` — 28 falhas (antes do código)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/dados-pessoais src/components/dados-da-demanda.test.ts "src/app/(painel)/demandas/nova/formularios.test.ts" src/lib/sentry.test.ts --silent --reporter=dot` — 351 de 351 (depois do código)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/suite-0012-03b.xml` — 4242 testes, 0 falhas, 0 erros
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 8 arquivos modificados, todos em `src/`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --numstat` — `detectores.test.ts` 58/0, `minimizar.test.ts` 19/0, `sentry.test.ts` 25/0: os testes da 04 não mudaram

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
