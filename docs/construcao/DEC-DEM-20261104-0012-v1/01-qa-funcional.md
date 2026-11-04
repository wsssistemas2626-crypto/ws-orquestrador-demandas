---
pedido: DEC-DEM-20261104-0012-v1
etapa: 01-reproducao
agente: qa-funcional
leu: [contrato-passagem.md, pedido.json, DEC-DEM-20261104-0011-v1/04-maestro.md, DEC-DEM-20261104-0011-v1/01-qa-funcional.md (cabeçalho e formato), src/modules/dados-pessoais/detectores.ts, src/modules/dados-pessoais/detectores.test.ts, src/modules/dados-pessoais/minimizar.ts, src/modules/dados-pessoais/minimizar.test.ts, src/modules/pedido-construcao/gerar.ts, src/lib/reduzir-erro.ts, src/lib/reduzir-erro.test.ts (150-169), src/lib/sentry.ts, src/lib/sentry.test.ts (245-284), src/lib/rota.ts (120-178), src/lib/erros.ts (mapearErro), src/lib/log.ts (50-82), src/instrumentation.ts, src/components/dados-da-demanda.ts, src/components/dados-da-demanda.test.ts (50-74), "src/app/(painel)/demandas/nova/formularios.test.ts (66, 122, por busca)", src/modules/agentes/entrada-agente.ts (132, 195, por busca), src/modules/demandas/consultas.ts (194, por busca)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Cinco defeitos (M-a, B-1, B-2, B-3 e B-4 da 04-revisao do 0011), todos reproduzidos pela leitura do código da base
deste ramo (`main`, 0.1.10 segundo o pedido). Não executei nada: o qa-funcional não tem Bash. O "obtido" do M-a é a
medição da `seguranca-aplicacao` registrada no `04-maestro.md` do 0011; o dos outros quatro sai da semântica das regex
e do fluxo do código, linha a linha, e em três deles há um teste verde da base que **afirma o comportamento de hoje**
(citado em "Evidência"). Os passos servem para a triagem e a 04-regressao confirmarem rodando. Todos os nomes, e-mails e
textos são fictícios; os e-mails usam o domínio reservado `exemplo.test`.

**Severidade geral do pedido: média**, pelo M-a: uma pessoa autenticada trava o event loop do worker ou da API por
dezenas de segundos com um texto dentro do limite aceito. B-1 a B-4 são baixos: vazamento parcial de dado pessoal
fictício em formatos pouco comuns, erro que some do log e do Sentry em caso raro, e texto de tela impreciso.

---

### M-a: regex de e-mail com custo quadrático. Severidade: média

**Impacto no usuário.** Enquanto a regex roda, o processo não atende mais nada: no worker, todas as execuções de agente
param; na API, todas as requisições da instância esperam. O texto que dispara cabe no limite do formulário
(`LIMITE_TEXTO_PEDIDO = 100_000`, `dados-da-demanda.ts:12`). Não é alta porque só pessoa autenticada envia texto e o
efeito é indisponibilidade temporária, sem perda nem exposição de dado.

**Causa aparente.** `DETECTORES['e-mail']` (`src/modules/dados-pessoais/detectores.ts:9`) é
`/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g`, sem âncora à esquerda e com `+` sem limite. Numa sequência de `n`
caracteres de usuário sem `@`, cada posição de início consome até o fim e volta tudo procurando o `@`: O(n²).

**Arquivos suspeitos.** `src/modules/dados-pessoais/detectores.ts:9` (a regex); quem a usa:
`src/modules/dados-pessoais/minimizar.ts:177` (`replace`), `src/modules/dados-pessoais/detectores.ts:22` (`search`, em
`encontrarDadosPessoais`), `src/modules/pedido-construcao/gerar.ts:67` (bloqueio do Pedido de Construção),
`src/modules/agentes/entrada-agente.ts:132` e `:195` (entrada do agente no worker), `src/modules/demandas/consultas.ts:194`
(`textoMinimo`, vista da API para quem não é pessoa).

**Passos (unidade, sem banco):**

1. `const t = 'a'.repeat(100_000);`
2. Medir `t.search(DETECTORES['e-mail'])` com `performance.now()` antes e depois.
3. Medir também `minimizar(t)` e `encontrarDadosPessoais({ especificacao: { conteudo: t } }, ['e-mail', 'telefone', 'CPF'])`.
4. Repetir com uma lista de 50 itens de `'a'.repeat(10_000)` em `encontrarDadosPessoais({ criterios_aceite_preliminares: lista }, ['e-mail'])`.

- **Obtido (medição da `seguranca-aplicacao`, 04-maestro do 0011):** 30 mil caracteres em 1,7 s; 100 mil em 20,6 s.
  Para os 50 itens de 10 mil, estimo cerca de 0,19 s por item e uns 9 s no total (extrapolação quadrática da medição de
  30 mil, **não medido**).
- **Esperado (ESP):** cada caso abaixo de 200 ms, e o resultado `-1` / `[]` / texto igual (não há e-mail).

**Passos (pelo sistema):**

1. Entrar como pessoa no painel, em Nova demanda, modo "Pedir ao agente orquestrador que proponha os campos".
2. Colar no texto do pedido 100.000 vezes a letra `a` (ou `'x.'` repetido até 100.000 caracteres); solicitante
   `Pessoa Ficticia`. Enviar.
3. Observar o worker na execução da entrada (`entrada-agente.ts:195`) e, em paralelo, uma requisição qualquer à API
   (por exemplo `GET /api/saude`) no mesmo processo que ler a vista minimizada.

- **Obtido (dedução):** a execução fica uns 20 s presa no `minimizar`; a requisição paralela no mesmo processo espera o
  mesmo tempo.
- **Esperado:** a minimização volta em menos de 200 ms e a outra requisição não espera.

**Notas para a triagem (bordas que a correção proposta cria ou não resolve):**

1. **Furo novo de detecção com o lookbehind.** A regex sugerida
   `(?<![\p{L}\p{N}._%+-])[\p{L}\p{N}._%+-]{1,64}@...` **deixa de detectar** um e-mail que hoje é detectado quando o
   usuário tem mais de 64 caracteres, ou quando o e-mail vem grudado depois de mais de 64 caracteres da classe do
   usuário. No início da sequência o `{1,64}` não alcança o `@`; nas posições seguintes o lookbehind recusa. Resultado:
   o e-mail sai inteiro em claro em `minimizar` e o Pedido de Construção passa no bloqueio C-28. Isso contraria o
   critério 2 ("os e-mails detectados hoje continuam detectados"). Dados de teste:
   - `contato.ficticio.departamento.de.atendimento.ao.cliente.exemplo.2026@exemplo.test` (68 caracteres no usuário);
   - `'-'.repeat(70) + 'joana.ficticia@exemplo.test'` e `'_'.repeat(70) + 'joana.ficticia@exemplo.test'` (linha de
     separador colada, comum em assinatura copiada sem quebra).
   Opção para o tech-lead e a `seguranca-aplicacao` decidirem: sem o lookbehind, só com `{1,64}`, o custo continua
   linear (no máximo 64 passos por posição; estimativa, **a medir**) e o e-mail longo é detectado, sobrando no texto só
   o começo do usuário além dos 64 caracteres. O domínio com mais de 255 caracteres não abre furo: sem âncora à direita,
   o `{1,255}` casa um prefixo que termina antes de um ponto.
2. **A flag `u` é obrigatória.** Sem ela, `[\p{L}\p{N}...]` vira a classe dos caracteres `p { L } N`, e nenhum e-mail
   comum casa. A flag `g` tem de ficar (`detectores.test.ts:89-92`).
3. **Texto em NFD (B-2 continua).** `\p{L}` não inclui a marca combinante: com o texto decomposto (comum em texto colado
   do macOS), `'joão.ficticia@exemplo.test'` ainda vira `'joã[e-mail removido]'`. Incluir `\p{M}` na classe e no
   lookbehind resolve; sugiro um caso de teste em NFD.
4. **Teste de 200 ms em CI.** O limite é apertado para uma máquina de CI lenta só se a regex ainda for superlinear; com
   a regex linear deve sobrar folga. Mesmo assim, sugiro medir uma vez e manter o limite da ESP.

---

### B-2: usuário de e-mail com acento sai cortado. Severidade: baixa

**Impacto no usuário.** O começo do usuário (parte do nome da pessoa) chega ao agente em claro. O Pedido de Construção
ainda bloqueia, porque o resto casa.

**Causa aparente.** A classe do usuário em `detectores.ts:9` é só ASCII (`[A-Za-z0-9._%+-]`).

**Arquivo suspeito.** `src/modules/dados-pessoais/detectores.ts:9`.

**Passos:**

1. `minimizar('Escreva para joão.ficticia@exemplo.test hoje')`.

- **Obtido (dedução):** `'Escreva para joã[e-mail removido] hoje'`. O casamento mais à esquerda começa no `o` depois do
  `ã`.
- **Esperado (ESP):** `'Escreva para [e-mail removido] hoje'`, um marcador só.

Casos a mais para a regressão: `'conceição.ficticia@exemplo.test'`, `'érica@exemplo.test'` (acento na primeira letra) e
`'JOÃO.FICTICIO@exemplo.test'`. Cada um vira um marcador só.

---

### B-1: nome grudado em número, `_` ou CamelCase sai em claro. Severidade: baixa

**Impacto no usuário.** O prenome ou o sobrenome do solicitante chega ao agente quando aparece como apelido, usuário ou
arroba de rede social (`Joana2`, `Joana_Ficticia`, `@JoanaFicticia`).

**Causa aparente.** As bordas `ANTES` e `DEPOIS` (`src/modules/dados-pessoais/minimizar.ts:97-98`) recusam letra, marca,
número e `_` colados dos dois lados. Valem para o nome completo (`padraoDoNome`, `:102-106`) e para as partes
(`padraoDasPartes`, `:126-140`).

**Arquivos suspeitos.** `src/modules/dados-pessoais/minimizar.ts:96-98`, `:126-140`, `:146-148` e `:184`.

**Passos (nome `Joana Ficticia` em todos):**

| # | Chamada | Obtido (dedução) | Esperado (ESP) |
|---|---|---|---|
| 1 | `minimizar('A Joana2 pediu', { nomes: ['Joana Ficticia'] })` | `'A Joana2 pediu'` | `Joana2` vira marcador |
| 2 | `minimizar('Usuário Joana_Ficticia aprovou', { nomes: ['Joana Ficticia'] })` | `'Usuário Joana_Ficticia aprovou'` | vira marcador |
| 3 | `minimizar('Siga @JoanaFicticia', { nomes: ['Joana Ficticia'] })` | `'Siga @JoanaFicticia'` | vira marcador |
| 4 | `minimizar('Falei com JoanaFicticia', { nomes: ['Joana Ficticia'] })` | `'Falei com JoanaFicticia'` | vira marcador |
| 5 | `minimizar('A Mariana pediu', { nomes: ['Ana Ficticia'] })` | `'A Mariana pediu'` | igual (não troca) |

**Evidência.** O teste verde `src/modules/dados-pessoais/minimizar.test.ts:414` afirma hoje que
`'Joana2 e Joana_x e x_Joana e 2Joana'` fica igual. O teste `:146-151` afirma que `'PessoaXFicticia'` fica igual com o
nome `'Pessoa (Ficticia)'`.

**Notas para a triagem (a ESP não decide):**

1. **Dois testes da base mudam.** `minimizar.test.ts:414` contradiz a ESP em `Joana2` e `Joana_x`. `:147-149`
   (`PessoaXFicticia`) contradiz a regra de CamelCase: `Pessoa` seguida de maiúscula é "começo de CamelCase". A triagem
   precisa dizer o novo esperado dos dois.
2. **Grudado à esquerda.** A ESP fala do nome seguido de número ou `_`. E `2Joana`, `x_Joana` e `ContatoJoana`? Sugiro
   que a triagem decida e registre.
3. **Um marcador ou dois.** `JoanaFicticia` e `Joana_Ficticia` viram `[nome removido]` ou `[nome removido][nome removido]` /
   `[nome removido]_[nome removido]`?
4. **Idempotência.** Os casos de `minimizar.test.ts` conferem `minimizar(s, op) === s`. Se só a primeira parte de
   `JoanaFicticia` for trocada (`[nome removido]Ficticia`), a segunda chamada troca `Ficticia`, porque o `]` do marcador
   não é letra, e o teste quebra. O mesmo vale para `Joana_Ficticia` se o `_` contar como borda só de um lado. A regra
   precisa ser simétrica: o pedaço depois do nome trocado também sai.
5. **Maiúscula com a flag `i`.** O comentário de `minimizar.ts:146-147` já avisa que, com `iu`, `\p{Lu}` casa letra
   minúscula. Um lookahead `(?=\p{Lu})` dentro da regex das partes casaria `Anabela` com o nome `Ana`
   (`[nome removido]bela`), e o teste `minimizar.test.ts:143` quebra. A conferência do CamelCase tem de ficar fora da
   regex, no `aceitar`, como a da inicial maiúscula.
6. **Palavra toda em maiúscula.** Se "começo de CamelCase" for só "seguido de maiúscula", `ANATEL` com o nome
   `Ana Ficticia` vira `[nome removido]TEL`, e `ANABELA` vira `[nome removido]BELA`. Hoje ficam iguais. Sugiro definir
   CamelCase como a última letra da parte em minúscula e a próxima em maiúscula (`Joana|F`), o que deixa `ANATEL` e
   `JOANAFICTICIA` de fora, e registrar o `JOANA2` (número depois de maiúscula) à parte.
7. **Falso positivo aceito.** Com a regra nova, `RosaTech` (nome `Carla Rosa Campos`) vira `[nome removido]Tech`. É do
   mesmo tipo do "Santos" cidade aceito na 03 do 0011; sugiro registrar como aceito.
8. **Meio de CamelCase.** `MariAna` com o nome `Ana`: a ESP diz que pedaço do meio de outra palavra não é trocado, mas
   `Ana` aqui começa por maiúscula depois de minúscula. A triagem decide.

---

### B-3: getter que lança ou Proxy faz `reduzirErro` lançar, e o erro some. Severidade: baixa

**Impacto no usuário.** Para quem usa o sistema: em vez do 500 com o corpo JSON e os cabeçalhos de
`cabecalhosDaResposta`, sai o 500 padrão do Next. Para a operação: a linha `requisicao` da rota não vai ao log, e o
Sentry recebe a exceção do getter no lugar do erro original, ou não recebe nada. É baixa porque exige um erro com getter
que lança ou um Proxy, o que é raro em biblioteca.

**Causa aparente.** `reduzirErro` (`src/lib/reduzir-erro.ts:54-62`) lê `e.name` (`:58`), `code` (`lerCode`, `:38-39`,
com `'code' in x`) e `cause` (`:60`) sem `try/catch`. Quem chama também não protege:

- `src/lib/sentry.ts:51`: `capturarErro` chama `reduzirErro` antes do `captureException`;
- `src/lib/rota.ts:158`: o `catch` da `rota()` chama `capturarErro`. Se ele lança, `resposta` não é montada,
  `log.error(linha)` (`:173`) não roda e a exceção sai do handler;
- `src/instrumentation.ts:53`: `reduzirErro(err)` está dentro do objeto passado a `log.error`. Se lança, nem o log nem o
  `capturarErro(err)` da linha 55 rodam;
- `src/lib/log.ts:60` e `:64`: `normalizarErro` chama `reduzirErro` (Error) e `lerCode` (objeto que não é Error).

**Arquivos suspeitos.** `src/lib/reduzir-erro.ts:37-41` e `:54-62`, `src/lib/sentry.ts:48-57`, `src/lib/rota.ts:155-162`,
`src/instrumentation.ts:46-55`, `src/lib/log.ts:59-68`; fora do texto da ESP, `src/lib/erros.ts:85` (ver nota 3).

**Passos (unidade):**

1. `const e = new Error('falha fictícia'); Object.defineProperty(e, 'name', { get() { throw new Error('getter fictício'); } });`
   e chamar `reduzirErro(e)`.
2. Repetir com o getter em `code` e com o getter em `cause`.
3. `const p = new Proxy(new Error('falha fictícia'), { get() { throw new TypeError('armadilha fictícia'); } });` e chamar
   `reduzirErro(p)`. (`instanceof Error` dá `true`, porque não há armadilha `getPrototypeOf`; a leitura de `name` lança.)
4. `const q = new Proxy(new Error('falha fictícia'), { has() { throw new TypeError('armadilha fictícia'); } });` e chamar
   `reduzirErro(q)` (o `'code' in x` de `lerCode` lança).
5. Chamar `capturarErro(e)` com o erro do passo 1 e o Sentry com transporte de teste.

- **Obtido (dedução):** os passos 1 a 4 lançam a exceção do getter ou da armadilha; o passo 5 lança e não envia nada.
- **Esperado (ESP):** `reduzirErro` devolve `{ classe: 'Error' }` em todos; `capturarErro` envia um evento com título
  `Error`.

**Passos (pela rota):** um handler de teste com `rota()` que lança o erro do passo 1.

- **Obtido (dedução):** a promessa do handler rejeita com `getter fictício`; não há linha `evento: 'requisicao'` no log
  nem evento do erro original no Sentry.
- **Esperado:** resposta 500 com `{ erro: 'erro_interno', ... }` e os cabeçalhos da rota, a linha `requisicao` no log com
  `status: 500` e um evento no Sentry com título `Error`.

**Evidência.** O teste verde `src/lib/sentry.test.ts:264-283` (B-4 do 0010) usa justamente o getter de `code` que lança
e afirma `expect(() => capturarErro(e)).toThrow()` (`:274`).

**Notas para a triagem:**

1. **O teste do B-4 do 0010 muda.** Com o B-3 corrigido, `capturarErro(e)` deixa de lançar com o getter, e
   `sentry.test.ts:274` quebra. Para seguir provando que a marca vem depois do envio, o teste precisa de outra falha
   injetada (por exemplo, `captureException` que lança no primeiro envio).
2. **`lerCode` também é exportada** e chamada direto por `log.ts:64` e por `erroJaReduzido` (`reduzir-erro.ts:50`, que
   também faz `Object.keys` e lê `classe`). A ESP diz "o erro chega ao log". Um objeto que não é Error com getter de
   `code` que lança, passado em `log.error({ erro })`, ainda faz o log lançar se só `reduzirErro` for protegida.
3. **Proxy com armadilha `getPrototypeOf` que lança.** O próprio `e instanceof Error` (`reduzir-erro.ts:55`, `log.ts:60`)
   lança, e antes dele o `e instanceof ErroDominio` de `mapearErro` (`src/lib/erros.ts:85`), que a `rota()` chama na
   linha 156, antes do `capturarErro`. A ESP não diz qual classe sai nesse caso (`'Error'` ou `'desconhecido'`) nem
   cobre `mapearErro`. A triagem decide se entra.
4. **Getter de `code` que lança com `name` válido.** A ESP manda devolver `{ classe: 'Error' }`, e não
   `{ classe: 'TypeError' }`, mesmo que o `name` tenha sido lido antes. Registro para o teste não esperar outra coisa.

---

### B-4: o aviso e a dica não dizem os limites da troca do nome. Severidade: baixa

**Impacto no usuário.** Quem preenche acha que qualquer pedaço do nome é trocado. Escreve "a jo" ou "o Neto" ou o nome
todo em minúscula e conta com a troca que não acontece.

**Causa aparente.** Os textos de `src/components/dados-da-demanda.ts:31-32` e `:36` não citam o mínimo de 3 letras
(`MINIMO_NOME`, `minimizar.ts:37`), as partículas (`PARTICULAS_DO_NOME`, `:45-69`) nem a regra da minúscula
(`minimizar.ts:14`).

**Arquivos suspeitos.** `src/components/dados-da-demanda.ts:31-32` e `:36`; os testes que fixam o texto:
`src/components/dados-da-demanda.test.ts:55-60` e `src/app/(painel)/demandas/nova/formularios.test.ts:66` e `:122`;
o `CHANGELOG.md:42-45` descreve o texto da 0.1.10.

**Passos:**

1. Entrar como pessoa, abrir Nova demanda e escolher "Pedir ao agente orquestrador que proponha os campos".
2. Ler o alerta de informação (`avisoMinimizacao`) e a dica do campo "Nome do solicitante (obrigatório)" (`dicaNome`).

- **Obtido:** aviso: "… O nome do solicitante e cada parte dele escrita com inicial maiúscula também viram marcador;
  nomes de outras pessoas, não. …". Dica: "O campo não vai ao agente de IA. Evite repetir o nome no texto: o sistema troca
  o nome do solicitante, mas não o de outras pessoas."
- **Esperado (ESP):** o aviso diz "cada parte com 3 letras ou mais, fora partículas como da, dos e Júnior"; a dica diz que
  o nome escrito todo em minúscula não é trocado.

**Evidência.** `dados-da-demanda.test.ts:55-60` fixa os dois textos de hoje, letra a letra.

**Notas para a triagem:**

1. A ESP dá os trechos, não as frases inteiras. A redação final fica com o engenheiro; sugiro que a triagem a escreva por
   inteiro, para os três testes que fixam o texto mudarem juntos.
2. A tela não tem Playwright que fixe esses textos (busquei em `e2e/` e não achei nenhuma ocorrência). O axe da página
   continua valendo (C-36); texto mais longo no `Alerta` não deve mudar o resultado.
3. Se o B-1 entrar, o aviso continua correto: o nome grudado também é "parte com inicial maiúscula".

---

### Mapa para a regressão (critérios preliminares do pedido)

| Critério | Defeito | Caso que a 04-regressao deve ter |
|---|---|---|
| 1. E-mail linear, 100 mil em < 200 ms | M-a | passos 1 a 4 do M-a, nos três pontos de uso |
| 2. E-mails de hoje continuam; acento vira um marcador | M-a, B-2 | os casos de `detectores.test.ts:7-19` e `minimizar.test.ts:27-40`, `:171-199`, `:288`; os do B-2; os da nota 1 do M-a (usuário com 68 caracteres, separador colado) e o da nota 3 (NFD) |
| 3. Nome grudado vira marcador; meio de palavra não | B-1 | tabela do B-1; `Anabela`, `ANATEL`, `Mariana`; idempotência |
| 4. `reduzirErro` nunca lança; o erro chega ao Sentry e ao log | B-3 | passos 1 a 5 do B-3 e o passo pela rota; `log.error({ erro })` com objeto de getter que lança |
| 5. Aviso e dica com 3 letras, partículas e minúscula | B-4 | os três testes que fixam o texto |
| 6. e2e três vezes seguidas | todos | sem caso novo; a suíte atual |

## Decisões tomadas

- Usei Read, Grep e Glob (disponíveis nesta sessão); nenhum comando, porque o qa-funcional não tem Bash.
- O "obtido" do M-a é a medição da `seguranca-aplicacao` no 04-maestro do 0011; a estimativa dos 50 itens de 10 mil está
  marcada como não medida, para ninguém tratá-la como medição.
- Nos outros quatro, o "obtido" é dedução do código; citei o teste verde que fixa o comportamento de hoje (B-1, B-3 e
  B-4) como evidência, já que não pude rodar nada.
- Classifiquei o pedido como médio pelo M-a: é indisponibilidade do processo, disparada só por pessoa autenticada e sem
  exposição de dado. B-1 a B-4 são baixos porque o vazamento é parcial e em formato pouco comum, ou a falha é rara.
- Registrei o furo do lookbehind (nota 1 do M-a) como borda para a triagem, e não como bloqueio: a ESP sugere a regex
  "por exemplo", e decidir a forma é do tech-lead com a `seguranca-aplicacao`.
- Troquei o domínio `x.com` dos exemplos do pedido por `exemplo.test` (domínio reservado), para nenhum dado de teste
  apontar para domínio real.

## Pendências

- Para a 02-triagem: decidir os pontos abertos de cada defeito (M-a nota 1: lookbehind ou não, diante do furo do usuário
  com mais de 64 caracteres; B-1 notas 2, 3, 6 e 8: grudado à esquerda, um marcador ou dois, definição de CamelCase,
  `MariAna`; B-3 notas 2 e 3: `lerCode`/`erroJaReduzido` e o Proxy com `getPrototypeOf` em `mapearErro`; B-4 nota 1:
  frase final).
- Para a 03-correcao: os testes da base que vão mudar de esperado (`minimizar.test.ts:414` e `:147-149`,
  `sentry.test.ts:264-283`, `dados-da-demanda.test.ts:55-60`, `formularios.test.ts:66` e `:122`).
- Para a 04-regressao: confirmar rodando o "obtido" de B-1 a B-4, que aqui é dedução, e medir a regex escolhida.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (01) os passos de reprodução estão completos e o resultado obtido está descrito
