---
pedido: DEC-DEM-20261104-0012-v1
etapa: 02-triagem
agente: tech-lead
leu: [contrato-passagem.md, pedido.json, 01-qa-funcional.md, DEC-DEM-20261104-0011-v1/02-tech-lead.md (formato), engenheiro-backend.md (Pode), src/modules/dados-pessoais/detectores.ts, src/modules/dados-pessoais/detectores.test.ts, src/modules/dados-pessoais/minimizar.ts, src/modules/dados-pessoais/minimizar.test.ts, src/modules/pedido-construcao/gerar.ts (1-80), src/lib/reduzir-erro.ts, src/lib/reduzir-erro.test.ts (140-169), src/lib/sentry.ts, src/lib/sentry.test.ts (1-40, 240-290), src/lib/log.ts (45-84), src/lib/rota.ts (120-178), src/lib/rota.test.ts (1-40), src/lib/erros.ts (70-94), src/lib/console-saneado.ts, src/instrumentation.ts, src/components/dados-da-demanda.ts, src/components/dados-da-demanda.test.ts (45-79), "src/app/(painel)/demandas/nova/formularios.test.ts (55-128)"]
status: pronto
proximo: engenheiro-backend
devolvido_para: null
---
## Entrega

Base conferida: ramo `construcao/DEC-DEM-20261104-0012-v1`, limpo, sobre `2e621de` (0.1.10), com os commits `00-inicio`
e `01-reproducao` do maestro. As causas apontadas pela 01 batem com o código lido. Um engenheiro só para a 03:
`engenheiro-backend`. Tudo o que muda está em `src/` e `package.json`, na **Pode** dele; o aviso e a dica são constantes
de `src/components/dados-da-demanda.ts`, sem componente de tela novo.

Ordem de trabalho na 03: **M-a + B-2** (mesma regex), **B-1**, **B-4** (o texto descreve a regra do B-1), **B-3**. Em
cada defeito o teste vem primeiro e tem de ser visto falhando na base (comando e trecho da saída na entrega). Todos os
nomes e e-mails dos testes são fictícios; e-mail só no domínio `exemplo.test`.

---

### M-a e B-2: detector de e-mail quadrático e sem acento no usuário

**Causa provável.** `DETECTORES['e-mail']` (`src/modules/dados-pessoais/detectores.ts:9`),
`/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g`, tenta casar a partir de **cada** posição de uma sequência de
caracteres de usuário, e cada tentativa percorre a sequência até o fim: O(n²) sem `@`, e O(n·m) com `@` seguido de um
domínio longo sem TLD (`'a'.repeat(50_000) + '@' + 'b'.repeat(50_000)`). A classe do usuário é só ASCII (B-2).

**Arquivos.** `src/modules/dados-pessoais/detectores.ts`, `src/modules/dados-pessoais/detectores.test.ts`,
`src/modules/dados-pessoais/minimizar.test.ts`. Quem usa o detector (`minimizar.ts:177`, `detectores.ts:22`,
`pedido-construcao/gerar.ts:67`, `agentes/entrada-agente.ts`, `demandas/consultas.ts`) **não muda**: a correção chega
pela constante.

**Regex nova (exata):**

```ts
'e-mail': /(?<![\p{L}\p{M}\p{N}._%+-])[\p{L}\p{M}\p{N}._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/gu,
```

- Início ancorado: o lookbehind só deixa começar no primeiro caractere de uma sequência de usuário. Como o usuário não
  contém `@`, toda posição de uma mesma sequência leva ao mesmo `@`; logo a sequência é tentada uma vez só, e cada `@` é
  tentado uma vez só. Custo linear **sem limite de tamanho**: não use `{1,64}` nem `{1,255}` (ver Decisões).
- A classe nova contém a antiga; o usuário continua terminando no mesmo `@`; o casamento novo contém o antigo. Nenhum
  e-mail detectado hoje deixa de ser detectado, e `joão.ficticia@...` vira um marcador só.
- `\p{M}` na classe e no lookbehind: cobre o texto em NFD (`joão.ficticia@...`).
- Flags `g` e `u`: sem `u`, `\p{L}` vira a classe dos caracteres `p { L }`; o `g` é exigido por
  `detectores.test.ts:89-92` e pela troca de todas as ocorrências.
- Domínio e TLD ficam como hoje (ASCII). Atualize o comentário do topo de `detectores.ts` com a razão da âncora.

**Testes de regressão esperados (primeiro, vistos falhando na base):**

1. Tempo, cada caso **abaixo de 200 ms** (`performance.now()`), com o resultado certo:
   - `detectores.test.ts`, `t.search(DETECTORES['e-mail'])` é `-1` para: `'a'.repeat(100_000)`;
     `'a'.repeat(50_000) + '@' + 'b'.repeat(49_999)`; `'a@'.repeat(50_000)`; `'a.'.repeat(50_000)`;
     `'é'.repeat(100_000)`; `'a@' + '.a'.repeat(49_999)`.
   - `detectores.test.ts`, detector do Pedido de Construção: `encontrarDadosPessoais({ especificacao: { conteudo:
     'a'.repeat(100_000) }, criterios_aceite_preliminares: Array.from({ length: 50 }, () => 'a'.repeat(10_000)) },
     ['e-mail', 'telefone', 'CPF'])` é `[]` (os três tipos de `gerar.ts:42`, citado em comentário), e o caso dos 50 itens
     de 10 mil sozinho, com `['e-mail']`, também abaixo de 200 ms.
   - `minimizar.test.ts`: `minimizar('a'.repeat(100_000))` devolve o texto igual, e
     `minimizar('a'.repeat(50_000) + '@' + 'b'.repeat(49_999))` também, cada um abaixo de 200 ms.
2. Formatos que viram **um** marcador (`minimizar(\`Antes ${v} depois.\`)` é `'Antes [e-mail removido] depois.'`):
   `joão.ficticia@exemplo.test`, `conceição.ficticia@exemplo.test`, `érica@exemplo.test`,
   `JOÃO.FICTICIO@exemplo.test`, `'joão.ficticia@exemplo.test'.normalize('NFD')`,
   `contato.ficticio.departamento.de.atendimento.ao.cliente.exemplo.2026@exemplo.test` (68 no usuário),
   `nome.sobrenome@empresa.exemplo.test`, `pessoa.ficticia+demanda@sub.exemplo.test`, `n_s-1@exemplo.test`,
   `a@b.co`. E mais: `'<x@exemplo.test>'` vira `'<[e-mail removido]>'`; `'mailto:x@exemplo.test'` vira
   `'mailto:[e-mail removido]'`; `'x@exemplo.test.'` vira `'[e-mail removido].'`; `'x@y@exemplo.test'` vira
   `'x@[e-mail removido]'` (como hoje); `'-'.repeat(70) + 'joana.ficticia@exemplo.test'` e o mesmo com `'_'` viram
   `'[e-mail removido]'` (como hoje: o separador colado faz parte da sequência); com espaço antes do e-mail, o separador
   fica.
3. Equivalência com a regex de hoje (`detectores.test.ts`): uma cópia local da regex antiga no teste (`ANTIGA`) e um
   corpus curto (os casos de `detectores.test.ts:7-19`, de `minimizar.test.ts:27-40`, `:171-199`, `:288` e os do item 2,
   todos com menos de 200 caracteres). Para cada texto em que `ANTIGA` casa, a nova casa, começa na mesma posição ou
   antes e termina na mesma posição.
4. Pedido de Construção (`detectores.test.ts`): `encontrarDadosPessoais({ especificacao: { conteudo: <v> } }, ['e-mail',
   'telefone', 'CPF'])` acha `e-mail` para o usuário de 68 caracteres, para `joão.ficticia@exemplo.test` e para a forma
   NFD.

### B-1: nome grudado em número, `_` ou CamelCase sai em claro

**Causa provável.** `ANTES` e `DEPOIS` (`src/modules/dados-pessoais/minimizar.ts:97-98`) recusam letra, marca, número e
`_` dos dois lados, no nome completo (`padraoDoNome`, `:102-106`) e nas partes (`padraoDasPartes`, `:126-140`). E o
`matchAll` de `trocarNoTrecho` (`:152-163`) pula para o fim de um casamento recusado, o que esconderia um casamento bom
que começa dentro dele assim que a borda das partes sair da regex.

**Arquivos.** `src/modules/dados-pessoais/minimizar.ts` e `src/modules/dados-pessoais/minimizar.test.ts`. Assinaturas
exportadas iguais (`minimizar`, `minimizarValor`, `partesDoNome`, `PARTICULAS_DO_NOME`, `MARCADOR_NOME`, `MARCADORES`,
`CABECALHOS_DE_EMAIL`).

**Regra a implementar:**

1. **Nome completo** (`padraoDoNome`): bordas passam a ser só letra e marca: `(?<![\p{L}\p{M}])` e `(?![\p{L}\p{M}])`
   (número e `_` colados viram borda). Entre os pedaços, `[\s_]+` em vez de `\s+` (`Joana_Ficticia` e
   `joana_ficticia` viram um marcador só). Continua sem diferença de caixa e sem `aceitar`.
2. **Partes** (`padraoDasPartes`): a regex fica só a alternância, da parte mais longa para a mais curta, flags `giu`,
   **sem lookbehind nem lookahead**. A borda vai para o `aceitar`, que confere no texto **original**:
   `RE_COMECA_MAIUSCULA.test(trecho.slice(inicio, fim)) && haFronteira(trecho, inicio) && haFronteira(trecho, fim)`.
3. **`haFronteira(s, pos)`** (função interna; pode exportar para teste), a fronteira entre o que vem antes de `pos` e o
   que começa em `pos`, sem flag `i` nas regex de caixa:
   - `x` = o último caractere antes de `pos` que não é marca (pula `\p{M}` para trás); `y` = o caractere (code point) em
     `pos`; `z` = o caractere seguinte a `y`, pulando as marcas de `y`;
   - sem `x` ou sem `y` (começo ou fim do trecho): **é** fronteira;
   - `x` ou `y` não é letra (`\p{L}`): **é** fronteira (número, `_`, pontuação, espaço, `@`, `[` e `]` do marcador);
   - `x` minúscula (`\p{Ll}`) e `y` maiúscula (`\p{Lu}`): **é** fronteira (CamelCase, `Joana|Ficticia`);
   - `x` e `y` maiúsculas e `z` minúscula: **é** fronteira (fim de sigla, `X|Ficticia`, `JOANA|Ficticia`);
   - qualquer outro caso: **não é** (`Ana|bela`, `ANA|TEL`, `Ana|é`).
   A mesma função vale para a borda esquerda de uma parte e a direita da anterior, no mesmo `pos`: é o que garante a
   idempotência (o que a 1ª chamada deixa, a 2ª também deixa).
4. **`trocarNoTrecho(trecho, re, aceitar: (trecho: string, inicio: number, fim: number) => boolean)`**: troque o
   `matchAll` por um laço com `re.exec` sobre `dobrarTexto(trecho)`, com `re.lastIndex = 0` no começo. Casamento aceito:
   troca e segue do fim. Casamento recusado: `re.lastIndex = inicio + <tamanho do code point em inicio>` (1, ou 2 para
   par substituto) e segue, para não pular um casamento que começa dentro do recusado (`AnAna`). O nome completo passa
   `() => true`. Continua linear: cada posição é tentada no máximo uma vez a mais do que o motor já tenta.
5. Atualize o comentário do topo de `minimizar.ts` (item 4 da lista e as bordas) e o de `:96`.

**Testes de regressão esperados** (`minimizar.test.ts`, bloco novo "B-1 do 0011: nome grudado"; cada caso confere
também `minimizar(s, op) === s`). `M` = `[nome removido]`. Nome `Joana Ficticia`, salvo indicação:

| # | Texto | Esperado |
|---|---|---|
| 1 | `A Joana2 pediu` | `A M2 pediu` |
| 2 | `Usuário Joana_Ficticia aprovou` | `Usuário M aprovou` (nome completo) |
| 3 | `Usuário joana_ficticia aprovou` | `Usuário M aprovou` (nome completo, sem caixa) |
| 4 | `Siga @JoanaFicticia` | `Siga @MM` |
| 5 | `Falei com JoanaFicticia` | `Falei com MM` |
| 6 | `ContatoJoana e 2Joana e x_Joana` | `ContatoM e 2M e x_M` |
| 7 | `JOANA2 e JOANA_X` | `M2 e M_X` |
| 8 | `JoanaSilva ligou` | `MSilva ligou` |
| 9 | `JOANAFicticia` | `MM` (fim de sigla) |
| 10 | `JOANAFICTICIA e joana2 e jOANA` | igual (toda em maiúscula sem separador; minúscula) |
| 11 | `A Mariana pediu`, nome `Ana Ficticia` | igual |
| 12 | `ANATEL e ANABELA`, nome `Ana Ficticia` | igual |
| 13 | `AnAna`, nome `Ana Ficticia` | `AnM` (o recusado em 0 não esconde o de 2) |
| 14 | `MariAna`, nome `Ana Ficticia` | `MariM` (falso positivo aceito) |
| 15 | `RosaTech`, nome `Carla Rosa Campos` | `MTech` (falso positivo aceito) |
| 16 | `a Joana_Ficticia_2`, nome `Joana Ficticia` | `a M_2` |

Tempo (abaixo de 1 s cada, como o teste de `:384`), nome `Ana Ficticia`, texto de 100.000 caracteres:
`'ANA'.repeat(33_334).slice(0, 100_000)`, `'AnA'.repeat(33_334).slice(0, 100_000)`,
`'Ana'.repeat(33_334).slice(0, 100_000)` e `'anaAna '.repeat(14_286).slice(0, 100_000)`.

**Testes existentes cujo esperado muda, e só estes podem mudar sem explicação adicional:**
- `minimizar.test.ts:414`: `'Joana2 e Joana_x e x_Joana e 2Joana'` passa a `` `${M}2 e ${M}_x e x_${M} e 2${M}` `` (e o
  comentário de `:412` passa a dizer que número e `_` colados são borda).
- `minimizar.test.ts:147-149`: `` `Fale com ${MARCADOR_NOME} e ${MARCADOR_NOME}X${MARCADOR_NOME}` `` (`Pessoa|X` é
  CamelCase; `X|Ficticia` é fim de sigla).
- `minimizar.test.ts:168`: `` `${MARCADOR_NOME}, é${MARCADOR_NOME} e Anaé` `` (`é|Ana` é CamelCase; `Ana|é` continua
  não sendo borda). Ajuste o título do teste.

Se `pnpm test` acusar outro esperado de nome que mude (fixtures de `vistas-para-agente.test.ts`,
`entrada-agente.test.ts`, `demandas.test.ts` ou outro), só ajuste quando a mudança vier da regra nova de borda (número,
`_`, CamelCase, fim de sigla, `_` entre os pedaços do nome completo). Liste cada ajuste na entrega com arquivo:linha, o
antes, o depois e a regra. Não troque fixture para fugir do efeito; esperado que mude por outro motivo é regressão.

### B-4: o aviso e a dica não dizem os limites da troca do nome

**Causa provável.** As constantes `avisoMinimizacao` (`src/components/dados-da-demanda.ts:31-32`) e `dicaNome` (`:36`)
não citam o mínimo de 3 letras, as partículas nem a parte em minúscula.

**Arquivos.** `src/components/dados-da-demanda.ts` (constantes e o comentário de `:29-30`),
`src/components/dados-da-demanda.test.ts:55-60`, `src/app/(painel)/demandas/nova/formularios.test.ts:66` e `:122`.

**Textos novos (exatos):**
- `avisoMinimizacao`: `O agente recebe só o texto, sem a origem e com e-mails, telefones, CPF e CNPJ trocados por marcadores. O nome do solicitante também vira marcador, e cada parte com 3 letras ou mais, fora partículas como da, dos e Júnior, quando escrita com inicial maiúscula; nomes de outras pessoas, não. Você revisa a proposta antes de qualquer decisão.`
- `dicaNome`: `O campo não vai ao agente de IA. Evite repetir o nome no texto: o sistema troca o nome do solicitante, mas não o de outras pessoas nem a parte do nome escrita toda em minúscula.`

**Teste de regressão esperado.** Os três testes que fixam as frases passam a conferir as novas (mude o esperado, veja
falhar, depois mude a constante). O teste de `dados-da-demanda.test.ts:69-74` continua (nenhum dos dois contém `não é
enviado ao agente` nem `sem o nome do solicitante`), e um caso novo confere que o aviso contém `3 letras ou mais` e
`da, dos e Júnior`, e que a dica contém `toda em minúscula`.

### B-3: getter que lança ou Proxy faz `reduzirErro` lançar, e o erro some

**Causa provável.** `reduzirErro` (`src/lib/reduzir-erro.ts:54-62`) faz `instanceof`, lê `name`, `code` (`lerCode`,
`'code' in x`) e `cause` sem proteção; `lerCode` e `erroJaReduzido` (`:37-52`) também. Quem chama não protege:
`capturarErro` (`sentry.ts:51`), o `catch` da `rota()` (`rota.ts:156-158`, e antes dele `mapearErro`, `erros.ts:85`, com
`instanceof ErroDominio`), `onRequestError` (`instrumentation.ts:33` e `:53`) e `normalizarErro` do log (`log.ts:60-64`).
`console-saneado.ts:23`, `:32` e `:45` fazem `instanceof` e `'digest' in` sem proteção; o `try` dali engole a linha do
log.

**Arquivos.** `src/lib/reduzir-erro.ts`, `src/lib/log.ts`, `src/lib/erros.ts`, `src/instrumentation.ts`,
`src/lib/console-saneado.ts`, `src/lib/sentry.ts` (só o comentário de `:44-45`) e os testes de cada um
(`src/lib/reduzir-erro.test.ts`, `src/lib/sentry.test.ts`, `src/lib/rota.test.ts`, e os arquivos de teste que já cobrem
`log`, `mapearErro`, `onRequestError` e o console saneado).

**Interface (`src/lib/reduzir-erro.ts`; as quatro funções nunca lançam):**

```ts
export function ehErro(x: unknown): x is Error;          // `x instanceof Error`; exceção (Proxy com getPrototypeOf) => false
export function lerDigest(x: unknown): unknown;          // `x.digest` de objeto ou função que o tenha; ausente ou exceção => undefined
export function lerCode(x: unknown): string | undefined; // como hoje; exceção => undefined
export function erroJaReduzido(x: object): ErroReduzido | null; // como hoje; exceção => null
export function reduzirErro(e: unknown): ErroReduzido;   // como hoje; não é Error (ou instanceof lança) => { classe: 'desconhecido' };
                                                         // exceção ao ler name, code ou cause => { classe: 'Error' }
```

- `reduzirErro`: `if (!ehErro(e)) return { classe: 'desconhecido' }`; o resto do corpo de hoje num `try`, com
  `catch { return { classe: 'Error' } }`. Dentro do `try`, o `code` é lido por uma versão interna de `lerCode` **que
  lança** (o corpo de hoje), para a exceção do getter de `code` ou de `cause` cair no `catch` e sair `{ classe: 'Error' }`
  mesmo com `name` válido (ESP). O `lerCode` exportado é essa versão interna dentro de `try`, devolvendo `undefined`.
- `log.ts` `normalizarErro`: `valor instanceof Error` vira `ehErro(valor)`; o resto igual.
- `erros.ts` `mapearErro`: corpo de hoje num `try`; exceção devolve o mesmo `{ status: 500, corpo: { erro:
  'erro_interno', mensagem: MENSAGEM_ERRO_INTERNO } }` do fim da função.
- `instrumentation.ts`: `digestDe` sai e entra `lerDigest(err)`.
- `console-saneado.ts`: `a instanceof Error` vira `ehErro(a)`; `digestDe(erro)` vira `lerDigest(erro)`; `!('digest' in
  erro)` vira `lerDigest(erro) === undefined`.
- `sentry.ts`: sem mudança de código (com `reduzirErro` total, só o envio pode lançar); o comentário de `:44-45` passa a
  dizer "Se o envio lança".

**Testes de regressão esperados (primeiro, vistos falhando na base):**

1. `reduzir-erro.test.ts`: `reduzirErro` devolve `{ classe: 'Error' }` com getter que lança em `name`, em `code` (com
   `name` `'TypeError'` válido) e em `cause`; com `new Proxy(new Error('falha fictícia'), { get() { throw ... } })`; e
   com Proxy de armadilha `has` que lança. Devolve `{ classe: 'desconhecido' }` com Proxy de armadilha `getPrototypeOf`
   que lança. `lerCode` devolve `undefined` e `erroJaReduzido` devolve `null` para objeto (não Error) com getter de `code`
   que lança e para Proxy com `ownKeys` que lança. `ehErro` e `lerDigest` não lançam com os mesmos Proxys.
2. Log (arquivo que já cobre `log`, com `substituirDestinoDoLog`): `log.error({ evento: 'x', erro })` escreve a linha,
   sem lançar, com `erro: { classe: 'Error' }` para o Error de getter de `name` que lança, e `{ classe: 'desconhecido' }`
   para o objeto com getter de `code` que lança e para o Proxy de `getPrototypeOf`.
3. `sentry.test.ts`: `capturarErro` com o Error de getter de `name` que lança não lança e envia um evento com
   `"value":"Error"`; o mesmo com o Proxy de `get`.
4. `rota.test.ts` (já tem o espião de `capturarErro` e o destino do log): um handler de teste com `rota()` que lança o
   Error de getter de `name` responde 500 com `erro: 'erro_interno'` e os cabeçalhos da rota, escreve a linha
   `evento: 'requisicao'` com `status: 500`, e `capturados.erros` recebe o erro. O mesmo com o Proxy de `getPrototypeOf`
   (passa por `mapearErro`).
5. `mapearErro` (arquivo que já o cobre): Proxy de `getPrototypeOf` devolve 500 `erro_interno`.
6. `onRequestError` (arquivo que já o cobre): com Proxy de `has` que lança, escreve a linha `erro_requisicao` e chama
   `capturarErro`, sem rejeitar.
7. Console saneado (arquivo que já o cobre): `console.error(<Error de getter de name que lança>)` escreve a linha
   `console_erro` com `erro: { classe: 'Error' }`; com o Proxy de `getPrototypeOf`, escreve a linha sem `erro`.

**Teste existente cujo esperado muda:** `sentry.test.ts:263-284` (B-4 do 0010). O getter de `code` deixa de fazer
`capturarErro` lançar. Para seguir provando que a marca vem depois do envio, a falha injetada passa a ser o
`captureException`, por `vi.mock` parcial de `@sentry/node` com um sinal `vi.hoisted`:

```ts
const falhaNoEnvio = vi.hoisted(() => ({ armada: false }));
vi.mock('@sentry/node', async (importOriginal) => {
  const original = await importOriginal<typeof import('@sentry/node')>();
  return {
    ...original,
    captureException: (...a: Parameters<typeof original.captureException>) => {
      if (falhaNoEnvio.armada) {
        falhaNoEnvio.armada = false;
        throw new Error('falha fictícia no envio');
      }
      return original.captureException(...a);
    },
  };
});
```

Com `armada = true`, a 1ª `capturarErro(e)` lança e não envia; a 2ª e a 3ª enviam **um** evento. Se o mock parcial
mexer no resto do arquivo, leve só este caso para `src/lib/sentry-marca.test.ts`, com o mesmo transporte de teste. Outro
teste que hoje afirme que algo **lança** com getter ou Proxy também muda; liste cada um na entrega (arquivo:linha, antes,
depois). Nenhum outro esperado de erro muda.

### Versão

`package.json` com `0.1.11` (na **Pode** do `engenheiro-backend`).

### Definição de pronto do pedido, por etapa da cadeia curta

| Item | Etapa dona |
|---|---|
| `pnpm test`, `pnpm lint` e `pnpm typecheck` verdes | `03-correcao` (`engenheiro-backend`), e de novo na `04-regressao` |
| `pnpm test:e2e` verde três vezes seguidas (e qualquer ajuste em `e2e/`) | `04-regressao` (`qa-automacao`) |
| `CHANGELOG.md` com a versão 0.1.11 (`CHANGELOG.md:42-45` descreve o texto da 0.1.10), e README e manual técnico se mudarem | `06-documentacao` (`documentacao-tecnica`) |
| PR com CI verde (e `docker build`, se a entrega pedir) | `05-entrega` (`devops-sre`) |

## Decisões tomadas

- Um engenheiro só, `engenheiro-backend`, como o maestro pediu: tudo está em `src/` e `package.json`, na Pode dele.
- M-a nota 1: lookbehind mantido e **sem** `{1,64}` e `{1,255}`. Com o início ancorado, a regex já é linear sem limite;
  o `{1,64}` deixaria de detectar o usuário de mais de 64 caracteres (princípio 2), e o `{1,255}` deixaria de detectar
  um rótulo de domínio de mais de 255 sem ponto, que hoje casa. Sem o lookbehind e com `{1,64}`, o começo do usuário
  longo sairia em claro (princípio 1).
- M-a notas 2 e 3: flags `gu`, e `\p{M}` na classe e no lookbehind, para o texto em NFD virar um marcador só.
- M-a nota 4: limite de 200 ms da ESP mantido em cada caso de tempo; com custo linear, sobra folga em CI.
- M-a: o separador colado ao e-mail (`------joana...@`) continua dentro do marcador, como hoje; com espaço antes, fica.
- M-a: domínio internacionalizado (letra com acento no domínio) fica fora, como hoje: a ESP não pede, e mexer no
  domínio muda o bloqueio do Pedido de Construção sem caso de uso.
- B-1 nota 1: novos esperados de `minimizar.test.ts:414`, `:147-149` e `:168` escritos acima, pela regra nova.
- B-1 nota 2: grudado à esquerda também vira marcador (`2Joana`, `x_Joana`, `ContatoJoana`): número e `_` são borda dos
  dois lados, e a borda CamelCase vale nos dois lados, senão a 2ª chamada trocaria o que a 1ª deixou.
- B-1 nota 3: `Joana_Ficticia` vira um marcador (o nome completo aceita `_` entre os pedaços, e assim também
  `joana_ficticia` em minúscula sai); `JoanaFicticia` vira dois marcadores pelas partes. O nome completo **não** aceita
  pedaços sem separador, porque `Ana Lise` casaria `análise`.
- B-1 nota 4: idempotência pela mesma `haFronteira` avaliada na mesma posição para as duas partes vizinhas; o laço com
  `exec` recomeça uma posição depois do casamento recusado, para nenhum casamento bom ficar escondido.
- B-1 nota 5: a conferência de caixa fica fora da regex com `i` (no `aceitar`), porque com `iu` `\p{Lu}` casa minúscula.
- B-1 nota 6: CamelCase é minúscula seguida de maiúscula, ou maiúscula seguida de maiúscula e minúscula (fim de sigla).
  `ANATEL`, `ANABELA` e `JOANAFICTICIA` ficam; `JOANA2` vira `[nome removido]2`, porque número é borda.
- B-1 nota 7: `RosaTech` → `[nome removido]Tech` aceito, do mesmo tipo do "Santos" cidade aceito no 0011.
- B-1 nota 8: `MariAna` → `Mari[nome removido]` aceito (princípio 1); `Mariana` fica, como a ESP manda.
- B-3 nota 1: o teste do B-4 do 0010 passa a injetar a falha no `captureException`; `capturarErro` não ganha `try`,
  para a falha do envio continuar visível a quem chama e o objeto continuar sem marca.
- B-3 nota 2: `lerCode` e `erroJaReduzido` também nunca lançam, e o log usa `ehErro`, para o erro chegar ao log também
  pelo caminho do objeto que não é Error.
- B-3 nota 3: Proxy com `getPrototypeOf` que lança sai `{ classe: 'desconhecido' }` (não dá para saber se é Error), e
  `mapearErro`, `onRequestError` e o console saneado entram, porque sem eles o erro ainda escaparia da `rota()` e do
  gancho do Next antes de chegar ao log e ao Sentry.
- B-3 nota 4: qualquer exceção ao ler `name`, `code` ou `cause` sai `{ classe: 'Error' }`, mesmo com `name` já lido e
  válido, como a ESP escreve.
- B-4 nota 1: frases inteiras escritas acima. A dica fala da **parte** do nome em minúscula, e não do "nome": o nome
  completo em minúscula é trocado (`minimizar.test.ts:300`), e a tela não pode dizer o contrário do que o sistema faz.
- Princípio 3: todo caminho novo é linear (âncora no e-mail, `exec` com recomeço de uma posição nas partes, `[\s_]+`
  seguido de letra literal no nome completo), e cada um tem teste de tempo: 200 ms para o e-mail (ESP) e 1 s para o
  nome (o mesmo limite do teste de `:384`).

## Pendências

1. Para a `04-regressao` (`qa-automacao`): confirmar rodando o "obtido" de B-1 a B-4 e medir a regex nova. A 01 não
   achou em `e2e/` teste que fixe o aviso ou a dica; se houver, o ajuste é dela (o `engenheiro-backend` não edita
   `e2e/`). Não conferi: esta sessão não tem Grep.
2. Risco que sobra, só para registro da `04-revisao`: se uma parte do nome for começo de outra parte (`Ana` e
   `Anabela`), um texto como `AnaBelax` fica igual, porque a alternância tenta a parte mais longa, que é recusada, e não
   volta à mais curta na mesma posição. Caso artificial; não vale a complexidade de tentar cada parte por posição.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --branch` — ramo `construcao/DEC-DEM-20261104-0012-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -3` — `38d28a1`, `31567c4`, `2e621de`

## Critério de pronto atendido

- [x] (02 triagem) `proximo` é um dos três engenheiros
- [x] (02 triagem) cada item da definição de pronto do pedido está atribuído a uma etapa da cadeia curta, pela lista da Entrega
