---
pedido: DEC-DEM-20261104-0012-v1
etapa: 04-regressao
agente: qa-automacao
leu: [contrato-passagem.md, pedido.json, padrao-tecnico.md, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-backend.md, 04-qa-automacao.md (volta anterior), "git diff e35c3ea HEAD (testes da 2ª volta)", "git diff --numstat main...HEAD", src/modules/dados-pessoais/detectores.ts, src/modules/dados-pessoais/detectores.test.ts, src/modules/dados-pessoais/minimizar.ts, e2e/axe-todas.spec.ts, e2e/apoio.ts, playwright.config.ts, "test-results/axe-todas-T11-…/error-context.md (gerado pelo e2e desta etapa)"]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

**Resultado: pronto.** A correção da 2ª volta (`e6faf79`) fecha a perda de detecção do e-mail colado no fim de outro.
Os 13 testes que eu tinha devolvido passam sem nenhuma alteração. O detector novo (subclasse de `RegExp` com tentativa
sticky no `exec`) dá os mesmos casamentos em `replace`, `replaceAll`, `matchAll`, `match`, `search`, `exec` e `test`, com
o `lastIndex` coerente em todos. Em texto ASCII, `exec` e `test` a partir de **qualquer** `lastIndex` dão exatamente o
mesmo resultado que a regex de antes. O tempo continua linear. A suíte inteira, o lint e o typecheck passam, e o e2e
passou três vezes seguidas (depois de uma falha intermitente fora do escopo, descrita em Pendências).

### Conferências pedidas pelo maestro

1. **Os 13 testes da volta anterior passam sem alteração.** `git diff e35c3ea HEAD` em `detectores.test.ts` e
   `minimizar.test.ts` só tem inclusões (58/0 e 19/0): os dois blocos "(04-regressao do 0012)" estão iguais. No JUnit
   desta etapa, os 8 de `detectores.test.ts` (7 e-mails colados e o corpus de 5.000 textos) e os 5 de `minimizar.test.ts`
   ("e-mails colados …: nenhum usuário nem "@" sobra") passam.
2. **O mesmo comportamento em todos os caminhos, com `lastIndex` coerente.** É o bloco novo desta etapa (abaixo). Ele
   confere:
   - 19 textos (colados por `+`, `_`, `%`, `-`, número, `.1`, cadeia de três, `é` composto e em NFD, texto comum, `a@b.cc.a@b.cc`,
     `x@y@…`, separador colado, sem e-mail e vazio) e um corpus gerado de 3.000 textos com acento e NFD;
   - em cada um, as faixas de `exec` (no detector compartilhado e numa instância solta), os fins de `test`, as faixas do
     `replace` e do `replaceAll` com callback, o texto do `replace` com marcador, o `match` e o `search` batem com as do
     `matchAll`;
   - `exec`: `m.input` é o texto, `lastIndex` = `m.index + m[0].length` depois de cada casamento, pelos dois caminhos (o
     sticky no fim do anterior e a regex ancorada), e 0 depois do `null`;
   - `search` começa do zero mesmo com `lastIndex` 7 e devolve o 7; `replace`, `match` e `search` deixam o detector
     compartilhado em 0;
   - `lastIndex` posto à mão (0, 1, 2, 16, 16,7, 17, 33, 34, 1.000, −1, NaN): `exec` e `test` dão o mesmo índice,
     casamento e `lastIndex` que a regex de antes;
   - instância sem `g` ignora o `lastIndex` e não o muda, como a regex de antes sem `g`;
   - um `matchAll` em andamento, uma troca no detector compartilhado e outra instância no meio não mudam o resultado do
     iterador; duas instâncias intercaladas não dividem a cópia sticky (`#colado`);
   - corpus ASCII de 3.000 textos, testando cada `lastIndex` de 0 até o comprimento + 1: `exec` e `test` dão o mesmo
     índice, casamento, resultado e `lastIndex` que a regex de antes. Nenhuma divergência.
3. **Tempo linear.** 8 casos ruins para a tentativa sticky. Em cada caminho (`replace`, `matchAll`, `match`, `search`,
   `exec` e `test`), cada um fica abaixo de 200 ms. Os 6 caminhos juntos de cada caso somam entre 6,9 ms e 29,7 ms. Os
   casos: 100 mil `x` colados no fim de um e-mail; 50 × (e-mail, 1.000 de usuário, `@`, 1.000 de domínio sem ponto);
   102 mil caracteres de e-mails colados; `.a` × 50 mil; `-a@b` × 25 mil; `a@b.cc@` × 15 mil; `é` em NFD × 50 mil; 100 mil
   dígitos. Há também um caso de **1 milhão** de caracteres com os casos ruins juntos: a troca de todas as ocorrências leva
   66 ms, contra o limite de 2 s (10 × o da ESP para 10 × o tamanho). Com custo quadrático, isso levaria horas. Os testes de
   tempo da 03 e os meus da volta anterior também passam: a cadeia de 20 mil e-mails colados de 45 ms a 141 ms (o teste
   inteiro, com a comparação com a regex de antes), e os de `search` de 0,7 ms a 9,8 ms.

### Critérios do pedido e os testes que os cobrem

| Critério (pedido.json) | Teste (arquivo › bloco › nome) | Situação |
|---|---|---|
| 1. E-mail linear: 100 mil sem `@` abaixo de 200 ms nos detectores, em `minimizar` e no Pedido de Construção | `detectores.test.ts` › "M-a e B-2 do 0011: …" › "tempo: …" (6), "tempo: detector do Pedido de Construção …", "tempo: os 50 itens de 10 mil sozinhos …"; › "M-a do 0011 (04-regressao do 0012): …" › "tempo: …" (8); › "M-a do 0011 (03-correcao do 0012, 2ª volta): …" › "tempo: …" (4) e "cadeia de 20 mil e-mails colados …" (4); novos: › "M-a do 0011 (04-regressao do 0012, 2ª volta): o mesmo resultado em todos os caminhos do RegExp" › "tempo: … em cada caminho, em menos de 200 ms" (8) e "tempo linear: 1 milhão de caracteres …"; `minimizar.test.ts` › "M-a e B-2 do 0011: …" › "tempo: …" (2), › "M-a do 0011 (03-correcao do 0012, 2ª volta): cadeia de e-mails colados em minimizar" › "20 mil e-mails colados por …" (4) | passa |
| 2. E-mails de hoje continuam detectados; acento no usuário vira um marcador | `detectores.test.ts` › "equivalência com a regex de antes: …" (29), "Pedido de Construção: … é e-mail" (3), "e-mails colados: … fica coberto como antes" (7), "corpus gerado de 5.000 textos curtos …"; `minimizar.test.ts` › "M-a e B-1 do 0011 (04-regressao do 0012): sem perda …" › "e-mails colados …" (5), "e-mail colado com letra acentuada …"; novos: `detectores.test.ts` › bloco da 2ª volta › os 19 textos "…: replace, replaceAll, matchAll, match, search, exec e test dão os mesmos casamentos", "os dois e-mails colados por "+" dão duas faixas …", "corpus ASCII gerado (3.000 textos): exec e test a partir de cada lastIndex dão o mesmo que a regex de antes", "corpus gerado com acento e NFD (3.000 textos): os sete caminhos dão os mesmos casamentos" | passa |
| 3. Nome grudado vira marcador; meio de palavra não | `minimizar.test.ts` › "B-1 do 0011: nome grudado" (36) e "M-a e B-1 do 0011 (04-regressao do 0012) …" › "nome …" (6) e "tempo: "Ana" repetido …" | passa |
| 4. `reduzirErro` nunca lança; o erro com getter que lança chega ao Sentry e ao log | `reduzir-erro.test.ts` › "B-3 do 0011" (8); `log.test.ts` (3); `sentry.test.ts` › "B-3 do 0011 …" (2), "getter de stack que muda a cada leitura …" e "getter de stack que devolve o cabeçalho certo nas duas primeiras leituras …" (B-2 da revisão de segurança); `rota.test.ts` (2); `erros.test.ts` (1); `instrumentation.test.ts` (1); `console-saneado.test.ts` (2) | passa |
| 5. Aviso e dica com 3 letras, partículas e minúscula | `dados-da-demanda.test.ts` › "textos da 03, T04 e T06" e "B-4 do 0011: o aviso diz o mínimo de 3 letras e as partículas; …" (agora `dos, das e Júnior` e `not.toContain('como da,')`); `formularios.test.ts` › "aviso de minimização e o botão "Enviar ao agente"" | passa |
| 6. e2e três vezes seguidas | suíte `e2e/` atual | 143 de 143 nas execuções 3, 4 e 5, seguidas (abaixo) |

### Testes acrescentados (só inclusão; nenhum existente mudou)

`src/modules/dados-pessoais/detectores.test.ts`, bloco novo "M-a do 0011 (04-regressao do 0012, 2ª volta): o mesmo
resultado em todos os caminhos do RegExp" (46 testes, 293 linhas incluídas, 0 removidas):

- 19 textos com os sete caminhos conferidos entre si e o `lastIndex` conferido em cada um, e as faixas exatas do caso de
  dois e-mails colados (`[0,16]` e `[16,33]`);
- `exec` passo a passo pelos dois caminhos do `exec`, `test` passo a passo, 11 valores de `lastIndex` posto à mão contra a
  regex de antes, a instância sem `g`, buscas intercaladas;
- 2 corpora gerados com semente fixa (mulberry32, sem `Math.random`): o ASCII com `exec` e `test` a partir de cada
  `lastIndex` contra a regex de antes, e o com acento e NFD com os sete caminhos;
- 8 casos ruins de tempo em seis caminhos cada e 1 caso de 1 milhão de caracteres.

Esses testes falhariam no detector da 1ª volta (`930b277`, só a regex ancorada): por exemplo, com `lastIndex` 16 em
`ana@exemplo.test+bia@exemplo.test`, a regex de antes casa `+bia@exemplo.test` e a ancorada devolve `null`.

### Resultado

- `pnpm test`: **4288 testes, 0 falhas, 0 erros** (relatório JUnit, linha 2). São os 4242 da 03 e os 46 novos.
- `pnpm test src/modules/dados-pessoais/detectores.test.ts`: 136 de 136.
- `pnpm lint`: limpo. `pnpm typecheck`: limpo.
- `pnpm test:e2e`, cinco execuções nesta etapa:
  1. 143 de 143, em 5,7 min;
  2. 142 de 143, em 6,4 min. Falhou `e2e/axe-todas.spec.ts:273` › "T11 Decisão: …" por tempo esgotado (30 s). A página
     já estava no último estado esperado (Pendências 1);
  3. 143 de 143, em 5,6 min;
  4. 143 de 143, em 5,5 min;
  5. 143 de 143, em 5,5 min.

  As execuções **3, 4 e 5 são as três seguidas** que a definição de pronto pede. Nelas o T11 levou 6,3 s, 6,5 s e 6,8 s.

## Decisões tomadas

- A equivalência exata com a regex de antes, a partir de qualquer `lastIndex`, foi conferida só em texto ASCII. Nele a
  classe do usuário das duas regex é a mesma. Com acento, o casamento novo pode começar antes (B-2), e o que vale é a
  cobertura (bloco da volta anterior) mais a concordância entre os sete caminhos.
- Usei uma instância solta do detector, criada pelo mesmo construtor que o `matchAll` usa, para pôr `lastIndex` à mão sem
  mexer no detector compartilhado. No compartilhado, só os caminhos que o deixam em 0, e o teste confere que ele fica em 0.
- O `split` ficou fora do bloco: ele cria a cópia com `y`, que pula a tentativa extra (decisão registrada na 03), e
  amarrar esse comportamento num teste travaria uma correção futura. Vai como registro para a revisão.
- Depois da falha do T11 na 2ª execução, recomecei a contagem das três seguidas em vez de editar o teste. A falha é de
  tempo, numa tela que esta correção não toca. Aumentar o tempo limite esconderia a causa sem conhecê-la.

## Pendências

1. Teste instável, fora do escopo deste pedido, para o `tech-lead` (e o `devops-sre`, se for carga da máquina):
   `e2e/axe-todas.spec.ts:273` › "T11 Decisão: pendente com rascunhos, com erro, com o diálogo aberto e na conta
   administradora" esgotou os 30 s na 2ª execução (31,6 s). Na mesma execução, o T10 levou 9,9 s; nas outras quatro, o T11
   levou de 6,3 s a 6,8 s e o T10 de 3,1 s a 5,2 s. O retrato da página no `error-context.md` mostra a tela já no último
   estado do teste ("Este pacote exige só a aprovação do CTO.", sem formulário), então o tempo acabou no último `axe`
   ou pouco antes. O código desta correção não passa por essa tela. O trace foi gerado, mas o Playwright limpa
   `test-results/` a cada execução, e as três seguintes já o apagaram. Abrir trace também não está na minha lista Pode.
   Sugestão: medir o tempo de cada passo do T11 numa execução com carga (o teste faz dois logins, três POSTs e quatro
   `axe`) e só então decidir entre dividir o teste e corrigir uma espera.
2. Para a `04-revisao`: o `split` com o detector de e-mail não usa a tentativa extra (cópia `y`), então perderia o
   e-mail colado. Nenhum chamador usa `split` hoje, segundo a 03; não conferi por busca, porque esta etapa não tem
   Grep.
3. Para a `04-revisao`, registros que continuam da 03: Error com `digest: undefined` explícito passa a ir ao Sentry pelo
   console saneado; `AnaBelax` com as partes `Ana` e `Anabela` fica igual.
4. Para a `06-documentacao`: o texto do aviso agora cita "dos, das e Júnior", e não "da, dos e Júnior" como o critério 5
   do `pedido.json`. A troca veio do B-1 da revisão de segurança e foi pedida pelo maestro na 03.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261104-0012-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — `e6faf79` no topo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --numstat e35c3ea HEAD` — testes de dados pessoais só com inclusões
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff e35c3ea HEAD -- src/modules/dados-pessoais/detectores.test.ts src/modules/dados-pessoais/minimizar.test.ts src/lib/sentry.test.ts src/components/dados-da-demanda.test.ts src/app/(painel)/demandas/nova/formularios.test.ts` — não rodou (erro de sintaxe do shell no caminho com parênteses sem aspas)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff e35c3ea HEAD -- src/modules/dados-pessoais/detectores.test.ts src/modules/dados-pessoais/minimizar.test.ts src/lib/sentry.test.ts src/components/dados-da-demanda.test.ts "src/app/(painel)/demandas/nova/formularios.test.ts"` — diff dos testes da 2ª volta
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/dados-pessoais/detectores.test.ts --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/det-0012-04b-1.xml` — 136 de 136
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/suite-0012-04b.xml` — 4288 testes, 0 falhas, 0 erros
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --numstat` — `detectores.test.ts` 293/0
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --numstat main...HEAD` — remoções em teste só nos esperados listados na 02 e no B-1 da 2ª volta
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 143 de 143, 5,7 min
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 142 de 143, 6,4 min (T11 do `axe-todas.spec.ts`, tempo esgotado)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 143 de 143, 5,6 min
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 143 de 143, 5,5 min
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 143 de 143, 5,5 min
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — `detectores.test.ts` e esta entrega

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa (4288 de 4288; e2e 143 de 143 três vezes seguidas)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real (gerador com semente fixa; instância solta para mexer no `lastIndex`; o relógio só mede o tempo da ESP)
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`: 293/0 nesta etapa; na 2ª volta, só inclusões e os esperados do B-1 trocados pela frase nova, com `not.toContain` a mais)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real (e-mails só em `exemplo.test` e `b.cc`/`c.de` sintéticos)
- [x] (04 regressão) há um teste que reproduz o defeito descrito em `01-qa-funcional.md`
