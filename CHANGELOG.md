# Notas de versão

Registro do que entra em cada versão do WS Orquestrador de Demandas e do que fica pendente. Dono:
`documentacao-tecnica` (sistema: Fabiano).

## 0.1.11 — 2026-11-04

Correção do pedido `DEC-DEM-20261104-0012-v1` (cadeia curta, tipo bug), sobre a `main` da 0.1.10 (`2e621de`): o
médio M-a e os baixos B-1 a B-4 da revisão do 0011. Ainda não foi publicada: o merge, a publicação e a configuração no
Easypanel são de Fabiano. A regra da primeira publicação não muda: exige a 0.1.8 ou posterior na `main`, e a 0.1.11 a
cumpre (`docs/operacao/deploy.md`, seção 4).

Não há migration nova, coluna nova, dependência nova nem variável de ambiente nova. Não mudaram `src/db/`, `drizzle/`,
`e2e/`, `scripts/`, `.github/`, `Dockerfile`, `.env.example` nem o lockfile.

### O que mudou

- **M-a do 0011: o detector de e-mail ficou linear** (`DETECTORES['e-mail']` em
  `src/modules/dados-pessoais/detectores.ts`). Antes, uma sequência longa de caracteres de usuário sem `@` custava
  tempo quadrático: 100 mil caracteres, o limite do texto bruto, levavam cerca de 20 s e travavam o event loop do
  `worker` ou do `app` em cada `minimizar` e na busca de dado pessoal do Pedido de Construção.
  - O início do e-mail agora é ancorado: um lookbehind só deixa o casamento começar no primeiro caractere de uma
    sequência de usuário. Cada sequência e cada `@` são tentados uma vez só. Não há limite de tamanho no usuário nem no
    domínio, então o usuário com mais de 64 caracteres continua detectado.
  - A âncora sozinha deixava de trocar o e-mail colado no fim de outro (`ana@exemplo.test+bia@exemplo.test`), que a
    0.1.10 troca. Para isso, o detector é uma subclasse de `RegExp` (`DetectorDeEmail`). Quando continua uma busca
    global do ponto onde o casamento anterior terminou, o `exec` tenta antes, só naquela posição, a mesma regex sem o
    lookbehind (flag `y`). Se não casar ali, segue a regex ancorada. Assim, o e-mail colado no fim de outro continua
    virando dois marcadores, e o custo continua linear.
  - Medido nos testes: 100 mil caracteres sem `@` abaixo de 200 ms nos detectores, em `minimizar` e na busca do Pedido
    de Construção; uma cadeia de 20 mil e-mails colados (340 mil caracteres) abaixo de 200 ms; 1 milhão de caracteres
    com os casos ruins juntos em 66 ms.
  - Nenhum chamador mudou: `minimizar` usa `replace`, e o Pedido de Construção usa `search`, que começa do zero e não
    usa a tentativa extra.
- **B-2 do 0011: o usuário do e-mail aceita letra com acento** (mesmo detector). O usuário aceita letra, marca
  combinante e número de qualquer alfabeto, além de `._%+-`. `joão.ficticia@exemplo.test` vira um marcador só, também
  com o texto em NFD. Antes, saía `joã[e-mail removido]`. O domínio e o TLD continuam só ASCII.
- **B-1 do 0011: o nome grudado em número, `_` ou CamelCase vira marcador** (`src/modules/dados-pessoais/minimizar.ts`).
  - **Nome completo:** a borda passou a ser só letra e marca, e entre os pedaços vale espaço ou `_`. `Joana_Ficticia` e
    `joana_ficticia` viram um marcador só. Pedaços sem separador não casam como nome completo: `Ana Lise` não troca
    `análise`.
  - **Parte do nome:** a borda saiu da regex e foi para `haFronteira`, conferida no texto original nas duas pontas da
    parte. Há fronteira no começo e no fim do trecho, ao lado de qualquer coisa que não seja letra (número, `_`,
    pontuação, espaço, `@`), na passagem de minúscula para maiúscula (`Joana|Ficticia`) e no fim de uma sigla
    (`JOANA|Ficticia`). A parte continua tendo de começar por maiúscula.
  - Com o nome `Joana Ficticia`: `Joana2` sai `[nome removido]2`, `@JoanaFicticia` sai
    `@[nome removido][nome removido]`, `ContatoJoana` sai `Contato[nome removido]` e `JOANA_X` sai `[nome removido]_X`.
    Com o nome `Ana Ficticia`, `Mariana`, `ANATEL` e `ANABELA` ficam como estão.
  - Uma parte recusada não esconde outra que começa dentro dela: a busca recomeça um caractere depois (`AnAna` sai
    `An[nome removido]`). Teste de tempo: 100 mil caracteres abaixo de 1 s.
  - **Falsos positivos aceitos na triagem:** `RosaTech` (nome `Carla Rosa Campos`) sai `[nome removido]Tech`, e
    `MariAna` (nome `Ana Ficticia`) sai `Mari[nome removido]`.
- **B-3 do 0011: `reduzirErro` nunca lança** (`src/lib/reduzir-erro.ts`). Um getter que lança em `name`, `code` ou
  `cause`, ou um Proxy com armadilha que lança, fazia o erro escapar da `rota()` sem chegar ao log nem ao Sentry.
  - Exceção ao ler `name`, `code` ou `cause` devolve `{ classe: 'Error' }`, mesmo com o `name` já lido e aceito.
    O que não é Error, e o Proxy cujo protótipo não se lê, devolve `{ classe: 'desconhecido' }`.
  - `lerCode` devolve `undefined` e `erroJaReduzido` devolve `null` quando a leitura lança. Entraram `ehErro` (o
    `instanceof Error` que não lança) e `lerDigest` (o `digest` do Next, sem lançar).
  - `mapearErro` (`src/lib/erros.ts`) também não lança: a exceção vira o mesmo 500 `erro_interno`. `normalizarErro`
    (`src/lib/log.ts`), o console saneado (`src/lib/console-saneado.ts`) e `onRequestError` (`src/instrumentation.ts`)
    passaram a usar `ehErro` e `lerDigest`.
  - Resultado: com getter que lança ou Proxy, a rota responde 500 `erro_interno` com os cabeçalhos dela, escreve a
    linha `requisicao` e manda ao Sentry um evento com título `Error`. No console saneado, o Proxy cujo protótipo não
    se lê sai na linha `console_erro` sem o campo `erro`.
  - Em `capturarErro` (`src/lib/sentry.ts`), só o envio pode lançar agora. O objeto continua sem marca quando o envio
    falha, como desde a 0.1.10.
- **B-2 da revisão de segurança deste pedido: `quadrosDaPilha` lê `e.stack` uma vez só** (`src/lib/sentry.ts`). Um
  getter que devolvesse outro valor a cada leitura passaria na conferência do cabeçalho com um valor e entregaria outro,
  com a mensagem, aos quadros enviados ao Sentry.
- **B-4 do 0011: o aviso e a dica dizem os limites da troca do nome** (`avisoMinimizacao` e `dicaNome` em
  `src/components/dados-da-demanda.ts`).
  - O aviso diz: "O nome do solicitante também vira marcador, e cada parte com 3 letras ou mais, fora partículas como
    dos, das e Júnior, quando escrita com inicial maiúscula; nomes de outras pessoas, não."
  - A dica diz: "o sistema troca o nome do solicitante, mas não o de outras pessoas nem a parte do nome escrita toda em
    minúscula."
  - O exemplo de partícula é "dos, das e Júnior", e não "da, dos e Júnior" como no critério 5 do pedido. A troca veio do
    B-1 da revisão de segurança: "da" tem 2 letras e já fica de fora pelo mínimo de 3.
- **Testes:**
  - blocos novos em `detectores.test.ts` e `minimizar.test.ts`, com tempo, equivalência com a regex da 0.1.10 (corpora
    gerados com semente fixa), e-mails colados e os sete caminhos do `RegExp` (`replace`, `replaceAll`, `matchAll`,
    `match`, `search`, `exec` e `test`) com o `lastIndex` coerente;
  - bloco "B-1 do 0011: nome grudado" em `minimizar.test.ts`, com idempotência;
  - casos de getter e Proxy em `reduzir-erro.test.ts`, `log.test.ts`, `sentry.test.ts`, `rota.test.ts`,
    `erros.test.ts`, `instrumentation.test.ts` e `console-saneado.test.ts`, e dois casos do `stack` lido uma vez em
    `sentry.test.ts`.
  - Por efeito da regra nova, mudaram os esperados listados na `02-tech-lead.md`: o nome grudado em `minimizar.test.ts`
    (`Joana2 e Joana_x e x_Joana e 2Joana` e `PessoaXFicticia`), o texto do aviso e da dica em
    `dados-da-demanda.test.ts` e `formularios.test.ts`, e a versão em `test/estatico/projeto.test.ts`.
  - O teste do B-4 do 0010 em `sentry.test.ts` agora injeta a falha no `captureException`, porque o getter que lança
    não faz mais `capturarErro` lançar.
- **Versão:** o `package.json` passou de 0.1.10 para 0.1.11.
- **Documentação:** estas notas e a versão no `README.md`, no manual técnico e no `docs/operacao/deploy.md`.
  - No manual, mudaram os capítulos 02 (o que sobra do nome, `reduzirErro` e `mapearErro` sem lançar, `stack` lido uma
    vez), 03 (o que sobra do nome), 05 (detector de e-mail no bloqueio do Pedido), 06 (detector de e-mail, bordas do
    nome, aviso e dica, o que sobra), 08 (aviso e dica nas pendências), 09 (o que sobra do nome) e o glossário (parte do
    nome).
  - No `deploy.md`, as seções 4, 6 e 8 vieram da `05-devops-sre.md`.

Não houve `.skip`, `.only` ou `.todo` novo, nem asserção afrouxada. O C-10, o C-21, o C-23, o C-36, a A-02 e o axe
continuam sem exceção.

### Verificações desta versão

- `pnpm test`: 4.288 de 4.288 (`04-qa-automacao.md`).
- `pnpm lint` e `pnpm typecheck` limpos.
- `pnpm test:e2e`, contra o build de produção: 143 de 143 em três execuções seguidas (a 3ª, a 4ª e a 5ª da
  04-regressao). Na 2ª, o T11 do `e2e/axe-todas.spec.ts` estourou os 30 s uma vez (Pendências).
- A primeira correção (`930b277`) foi devolvida pela 04-regressao com 13 testes, porque o e-mail colado no fim de outro
  saía em claro (M-1 da revisão). A segunda (`e6faf79`) passou nos 13 sem mudar nenhum deles.
- Revisão de código e de segurança (`04-maestro.md`), com reteste da `seguranca-aplicacao` sobre 300 mil textos
  sorteados contra a `main`: nenhum achado crítico, alto ou médio aberto; quatro baixos e um informativo (abaixo).
  Nenhum texto que a 0.1.10 bloqueia no Pedido de Construção deixa de ser bloqueado.
- `pnpm build` passou (34 rotas). O `docker build` não rodou na `05-entrega`: as entradas da imagem são as da 0.1.10,
  salvo `src/` e `package.json`. A imagem é construída na homologação e no CI do PR (`05-devops-sre.md`).
- A homologação, o ensaio de rollback (`construir.mjs ensaiar-rollback`) e o CI do PR ficam para a Parada 3. O rollback
  é o caminho A, só com a troca de imagem para a `v0.1.10` (`deploy.md`, seção 6). Na volta, os cinco defeitos voltam,
  inclusive o M-a.

### Pendências abertas

Da revisão deste pedido (`04-maestro.md`), para um pedido futuro:

- **B-a** (`detectores.ts`, comentário do `DetectorDeEmail`): o comentário diz que todo caractere que a regex da 0.1.10
  cobria continua coberto. Isso não vale quando dois `@` dividem o domínio e há acento antes do primeiro
  (`é@b.cc@b.cc`). Nesses casos sobra no texto só `@domínio`, sem usuário: a 0.1.11 expõe menos que a 0.1.10.
  Sugestão: corrigir o comentário e testar esse caso.
- **I-1, informativo** (`DetectorDeEmail`): segundo o reteste, `split`, `new RegExp(detector)` e `test` encadeado não
  passam pela tentativa extra, então perderiam o e-mail colado no fim de outro. Pelo código, `split` cria a cópia com
  `y`, que pula a tentativa, e `new RegExp(detector)` é uma `RegExp` comum. O `test` chamado no próprio detector passa
  pelo `exec` da subclasse, e a 04-regressao o conferiu a partir de cada `lastIndex`. Nenhum chamador usa esses caminhos
  hoje: só `replace` e `search`. Sugestão: dizer no comentário da classe o que é coberto.
- **B-3** (`minimizar.ts`, `trocarNoTrecho`): depois de uma parte recusada, a busca não volta à alternativa mais curta
  na mesma posição. `AnaBelax`, com as partes `Ana` e `Anabela`, fica sem troca. Risco herdado da triagem.
- **B-4** (`console-saneado.ts`): um Error com `digest: undefined` explícito passa a ir ao Sentry pelo console
  saneado. O Next não produz esse caso.

Registradas nas outras etapas deste pedido:

- **Teste e2e sensível a carga** (`04-qa-automacao.md`): `e2e/axe-todas.spec.ts:273` (T11 Decisão) estourou os 30 s
  uma vez em cinco execuções, com a página já no estado final. Leva de 6 a 7 s quando passa. Para a `qa-automacao`
  (e a `devops-sre`, se for carga da máquina): medir cada passo do T11 numa execução com carga antes de decidir entre
  dividir o teste e corrigir uma espera.
- **Os textos do aviso e da dica** foram escritos na triagem e ajustados na revisão de segurança. Ainda esperam a
  revisão da `ux-ui-design` (manual, cap. 08).

Seguem abertas, sem mudança neste pedido:

- do M-1 da revisão do 0009, o que a 0.1.11 não fecha. Para o agente, continuam saindo em claro a parte escrita toda
  em minúscula, o nome todo em maiúscula sem separador entre as partes (`JOANAFICTICIA`), a parte curta grudada a outra
  parte que começa por ela (`AnaBelax`, B-3 acima), o nome antigo de antes de uma edição da demanda e o nome de outras
  pessoas (J-03 da spec). É risco residual e não bloqueia a publicação (`deploy.md`, seção 4). O domínio de e-mail com
  acento também não é detectado, como na 0.1.10;
- da 0.1.10: os dois testes que olham o relógio real (`minimizar.test.ts` e `nomes-antes-de-gravar.test.ts`; a 0.1.11
  acrescentou testes de tempo com limite de 200 ms e 1 s, todos com folga nas medições) e o que ficou com Fabiano e
  `juridico-contratos` sobre ESP, RSK e o nome original no Pedido de Construção;
- da 0.1.9: B-1 (`code` com 9 dígitos, dígitos separados por `_` e `JoanaSilvaError`) e B-5 (o que os testes estáticos
  não veem), a convenção de `CLASSES_DO_PROJETO` no padrão técnico e a barreira de `extras` só em
  `criarPacoteDecisao`;
- da 0.1.7: o risco do M-3 para a Parada 3;
- da 0.1.6: B-2 a B-5, `erroId` fora do Sentry, o risco do M-05 e o teste estático das actions por SHA;
- da 0.1.5: B-2, B-3, B-4 (foco da fila antes da hidratação, de interface) e B-6.

## 0.1.10 — 2026-11-04

Correção do pedido `DEC-DEM-20261104-0011-v1` (cadeia curta, tipo bug), sobre a `main` da 0.1.9 (`fb675ee`): o M-1
da revisão do 0009 pela opção (b) refinada, decidida por Fabiano em 04/11, a dica da tela e os baixos B-2, B-3 e B-4 da
revisão do 0010. Ainda não foi publicada: o merge, a publicação e a configuração no Easypanel são de Fabiano. A regra
da primeira publicação não muda: exige a 0.1.8 ou posterior na `main`, e a 0.1.10 a cumpre (`docs/operacao/deploy.md`,
seção 4).

Não há migration nova, coluna nova, dependência nova nem variável de ambiente nova. Não mudaram `src/db/`, `drizzle/`,
`e2e/`, `scripts/`, `.github/`, `Dockerfile`, `.env.example` nem o lockfile.

### O que mudou

- **M-1 do 0009 (RF-20): cada parte do nome do solicitante também vira `[nome removido]`**
  (`src/modules/dados-pessoais/minimizar.ts`). Vale no texto que vai ao agente (entrada do worker) e na API de quem
  não é pessoa (vista da demanda, título da listagem, leituras de ESP, RSK e DEC e o 201 dos `POST`), porque todos
  esses caminhos já passavam por `minimizar` e `minimizarValor`. A ordem agora é esta: cabeçalhos de e-mail, depois
  e-mail, CNPJ, CPF e telefone, depois o nome completo de cada solicitante e, por último, as partes de todos os nomes.
  - **Nome completo:** como antes, sem diferença de caixa, com qualquer espaço entre os pedaços e sem ser pedaço de
    outra palavra. Agora também sem diferença de acento, nos dois sentidos (`Conceicao` casa com `Conceição` e o
    inverso), e com texto em NFD. O nome completo é trocado antes das partes e vira um marcador só.
  - **Parte do nome** (`partesDoNome`): o nome é cortado em espaço, hífen e apóstrofo. Entra a parte com 3 letras ou
    mais que não esteja em `PARTICULAS_DO_NOME`. Essa lista é fechada e exportada: `da`, `das`, `de`, `do`, `dos`,
    `du`, `del`, `della`, `di`, `van`, `von`, `der`, `den`, `le`, `la`, `e`, `y`, mais os sufixos de parentesco
    `filho`, `filha`, `neto`, `neta`, `junior` e `sobrinho`, comparados sem caixa e sem acento.
  - A parte só é trocada quando, no texto, **começa por letra maiúscula**. O resto da parte não diferencia caixa nem
    acento. Com o nome `Bruno Dias Lima`, o texto `Prazo de 30 dias; suco de lima; Lima aprovou.` sai
    `Prazo de 30 dias; suco de lima; [nome removido] aprovou.`. Com o nome `Ana dos Santos`, `dos` fica no texto.
  - Nada é trocado dentro de um marcador, e o texto original não é normalizado: só a faixa casada muda.
  - **A pessoa e o Pedido de Construção continuam com o texto original.**
  - **O que sobra, risco aceito no RSK:** a parte escrita toda em minúscula (`a joana pediu`). O nome completo em
    minúscula continua trocado.
  - **Falsos positivos aceitos:** palavra com maiúscula igual a uma parte do nome (`Dias depois`, `Paulo` em
    `São Paulo`, `Santos` cidade). Também a parte que o nome de outra pessoa tem em comum com o do solicitante: com
    `Ana Exemplo Lima` como solicitante, `Bruno Exemplo Rocha` sai `Bruno [nome removido] Rocha`. O hífen conta como
    borda: `Ana-Clara` sai `[nome removido]-[nome removido]`.
- **Dica do campo "Nome do solicitante" e aviso de minimização do modo agente** (`dicaNome` e `avisoMinimizacao` em
  `src/components/dados-da-demanda.ts`). Antes, os dois davam a entender que o nome nunca chegava ao agente. A dica
  agora diz "O campo não vai ao agente de IA. Evite repetir o nome no texto: o sistema troca o nome do solicitante, mas
  não o de outras pessoas.". O aviso diz que o nome do solicitante e cada parte dele escrita com inicial maiúscula
  viram marcador, e que nomes de outras pessoas não viram. A tela de edição usa a mesma dica.
- **B-3 do 0010: o 201 dos três `POST` de criação minimiza com o nome da demanda travada.** Em
  `src/app/api/demandas/[id]/{especificacoes,pareceres-risco,pacotes-decisao}/route.ts`, a rota não chama mais
  `nomesDaDemanda`. Ela chama `criarEspecificacaoComNomes`, `criarParecerRiscoComNomes` ou
  `criarPacoteDecisaoComNomes`, com 4 argumentos e sem `t` nem `extras`. Cada função devolve a vista e os nomes. Os
  nomes saem de `nomesDoSolicitante` sobre a linha travada por `travarDemanda`, no fim da mesma transação da gravação.
  Assim, uma renomeação do solicitante no meio do `POST` não deixa o nome novo sair em claro no 201. Se essa conta
  falhar, a resposta é 500 `erro_interno` e nada é gravado, como na 0.1.9. O 404, o 409, o 429 e o 400 com `faltando`
  não mudam. `criarEspecificacao`, `criarParecerRisco` e `criarPacoteDecisao` ficaram com a mesma assinatura e o
  mesmo retorno, então o worker e as Server Actions não mudaram. A guarda estática
  `test/estatico/pacote-sem-extras.test.ts` passa a cobrir também `criarPacoteDecisaoComNomes`.
- **B-2 do 0010: `reduzirErro` lê `e.name` uma vez só e só a usa se for texto aceito por `classeAceita`**
  (`src/lib/reduzir-erro.ts`). Um `name` que não é texto (objeto com `toString`, array, símbolo, número) sai como
  `Error`, no log e no título do Sentry. Um getter que muda entre leituras não troca mais o valor depois da
  conferência: sai o valor da leitura única, se ele passar na regra.
- **B-4 do 0010: `capturarErro` marca o erro como enviado só depois de `Sentry.captureException`**
  (`src/lib/sentry.ts`). Se `reduzirErro` ou o envio lançarem, o objeto fica sem marca, e a próxima chamada com ele
  tenta de novo. O envio continua único por objeto quando dá certo (B-a do 0008).
- **Testes:** em `minimizar.test.ts`, um bloco com os casos da reprodução e da triagem e outro com as bordas da
  regressão, todos com nomes fictícios e com idempotência. Há também um teste de tempo: nome de 200 caracteres sobre
  texto de 100.000, abaixo de 1 s. Entraram casos de integração em `demandas.test.ts`, `entrada-agente.test.ts` (os
  quatro agentes), `vistas-para-agente.test.ts` (o 201 dos três `POST`, as sete leituras do agente e as da pessoa) e
  `pedido.test.ts` (o Pedido com o original). `nomes-antes-de-gravar.test.ts` ganhou a corrida real com trava de linha
  nos três `POST`, e "falha não grava nada" foi refeito sobre `nomesDoSolicitante`. Há blocos novos em
  `reduzir-erro.test.ts` e `sentry.test.ts`. Por efeito da regra nova, mudaram seis esperados existentes, listados
  com o antes e o depois em `03-engenheiro-backend.md`: a parte em comum com o nome de outra pessoa
  (`minimizar.test.ts:252`, `demandas.test.ts:489-490`), a parte com maiúscula igual a uma palavra
  (`minimizar.test.ts:204`, `test/transversal/sentinelas.test.ts:430`) e a versão (`test/estatico/projeto.test.ts`).
  Nenhuma fixture foi trocada para fugir do efeito.
- **Versão:** o `package.json` passou de 0.1.9 para 0.1.10.
- **Documentação:** estas notas e a versão no `README.md`, no manual técnico e no `docs/operacao/deploy.md`. No
  manual, mudaram os capítulos 02 (limite da vista mínima, `name` lido uma vez, marca depois do envio), 03 (limite da
  vista mínima), 04 e 09 (nomes do 201 tirados da linha travada), 06 (regra das partes, dica e aviso, o que sobra), 08
  (texto da dica e do aviso nas pendências de interface) e o glossário (parte do nome). No `deploy.md`, as seções 4, 6
  e 8 vieram da `05-devops-sre.md`.

Não houve `.skip`, `.only` ou `.todo` novo, nem asserção afrouxada. O C-10, o C-21, o C-23, o C-36, a A-02 e o axe
continuam sem exceção.

### Verificações desta versão

- `pnpm test`: 4.081 de 4.081 (`04-qa-automacao.md`).
- `pnpm lint` e `pnpm typecheck` limpos.
- `pnpm test:e2e`, contra o build de produção: 143 de 143, três vezes seguidas. Nenhum e2e conferia as frases antigas.
- Os testes que reproduzem os cinco defeitos da `01-qa-funcional.md` usam dados fictícios e foram vistos falhando
  antes do código (`03-engenheiro-backend.md`): 9 falhas no B-2 e no B-4, 34 no M-1, 4 na dica e 11 no B-3.
- Revisão de código e de segurança (`04-maestro.md`): nenhum achado crítico nem alto; um médio que já existia na
  `main` e quatro baixos (abaixo).
- `pnpm build` passou (34 rotas). O `docker build` não rodou na `05-entrega`: as entradas da imagem são as da 0.1.9,
  salvo `src/` e `package.json`. A imagem é construída na homologação e no CI do PR (`05-devops-sre.md`).
- A homologação, o ensaio de rollback (`construir.mjs ensaiar-rollback`) e o CI do PR ficam para a Parada 3. O rollback
  é o caminho A, só com a troca de imagem para a `v0.1.9` (`deploy.md`, seção 6). Na volta, os cinco defeitos voltam.

### Pendências abertas

Da revisão deste pedido (`04-maestro.md`), para um pedido curto a decidir por Fabiano:

- **M-a, médio, já existia na `main`** (`src/modules/dados-pessoais/detectores.ts:9`): a regex de e-mail tem custo
  quadrático numa sequência longa de caracteres de usuário sem `@`. Medido: 30 mil caracteres levam 1,7 s, e 100 mil
  levam 20,6 s, no limite do texto bruto. Cada `minimizar` e a busca do Pedido de Construção travam o event loop. Só
  pessoa autenticada dispara. Sugestão: ancorar e limitar a regex, com teste de tempo.
- **B-1** (`minimizar.ts`): o nome grudado em número, `_` ou CamelCase (`Joana2`, `Joana_Ficticia`,
  `@JoanaFicticia`) sai em claro. O RSK do 0011 não cobre esses formatos.
- **B-2, já existia** (detector de e-mail): usuário de e-mail com acento sai cortado (`joã[e-mail removido]`).
- **B-3** (`reduzir-erro.ts`, `sentry.ts`): um getter que lança em `name`, `code` ou `cause`, ou um Proxy, faz
  `reduzirErro` lançar, e o erro escapa da `rota()` sem registro. Depois do B-4 do 0010, ele já não fica marcado sem
  envio. Sugestão: `try/catch` dentro de `reduzirErro`.
- **B-4** (`dados-da-demanda.ts`): o aviso diz "cada parte" sem dizer "com 3 letras ou mais" nem citar as partículas,
  e a dica não diz que a parte escrita em minúscula sobra. Os textos foram escritos na triagem e esperam a revisão da
  `ux-ui-design` (manual, cap. 08).

Registradas nas outras etapas deste pedido:

- **Dois testes olham o relógio real** (`04-qa-automacao.md`): o teste de tempo de `minimizar.test.ts`
  (`performance.now()`, 47 ms contra o limite de 1 s) e a espera da trava em `nomes-antes-de-gravar.test.ts` (prazo de
  segurança de 10 s, sem efeito no resultado). Se o primeiro ficar instável no CI, aumente o limite ou mova o teste
  para `test/desempenho/`.
- **Fora do escopo** (`01-qa-funcional.md`, `02-tech-lead.md`): orientar quem preenche ESP e RSK a escrever "o
  solicitante" e o nome original no Pedido de Construção ficam com Fabiano e `juridico-contratos`, no pedido 0012
  (Pedido de Construção sem nome de pessoa, pareceres de 04/11).

Seguem abertas, sem mudança neste pedido:

- do M-1 da revisão do 0009, o que a 0.1.10 não fecha. Para o agente, continuam saindo em claro a parte em minúscula,
  o nome grudado (B-1 acima), o nome antigo de antes de uma edição da demanda (a troca usa só o `solicitanteNome`
  atual) e o nome de outras pessoas (J-03 da spec). É risco residual e não bloqueia a publicação (`deploy.md`, seção
  4). Também segue o limite do teste "nenhum dos fragmentos" para campo de texto novo nas três vistas;
- da 0.1.9: B-1 (`code` com 9 dígitos, dígitos separados por `_` e `JoanaSilvaError`) e B-5 (o que os testes estáticos
  não veem), a convenção de `CLASSES_DO_PROJETO` no padrão técnico e a barreira de `extras` só em
  `criarPacoteDecisao`;
- da 0.1.7: o risco do M-3 para a Parada 3;
- da 0.1.6: B-2 a B-5, `erroId` fora do Sentry, o risco do M-05 e o teste estático das actions por SHA;
- da 0.1.5: B-2, B-3, B-4 (foco da fila antes da hidratação, de interface) e B-6.

## 0.1.9 — 2026-11-04

Correção do pedido `DEC-DEM-20261104-0010-v1` (cadeia curta, tipo bug), sobre a `main` da 0.1.8 (`1d6d897`). Ainda
não foi publicada: o merge, a publicação e a configuração no Easypanel são de Fabiano. A regra da primeira publicação
não muda: exige a 0.1.8 ou posterior na `main`, e a 0.1.9 a cumpre (`docs/operacao/deploy.md`, seção 4).

Fecha cinco baixos que sobraram das revisões anteriores, todos do lado servidor: o B-1 e o B-3 da revisão da 0.1.8
(pedido 0009), o B-a da revisão da 0.1.7 (pedido 0008) e o B-1 e o B-5 da revisão da 0.1.5 (pedido 0006). O B-4 da
0.1.5 (foco da fila antes da hidratação) é de interface e fica para um pedido próprio. Não há migration nova, coluna
nova, dependência nova nem variável de ambiente nova. Não mudaram `src/db/`, `drizzle/`, `e2e/`, `scripts/`,
`.github/`, `Dockerfile`, `.env.example` nem o lockfile.

### O que mudou

- **B-1 do 0009: a classe e o `code` do erro reduzido têm regra mais estreita, no log e no título do Sentry**
  (`src/lib/reduzir-erro.ts`).
  - `lerCode` recusa o `code` que tenha 10 ou mais dígitos seguidos, em qualquer posição (`DIGITOS_DEMAIS`), no erro e
    na `cause`. Um CPF, CNPJ ou telefone sem máscara passado como `code` não sai mais. Continuam aceitos o `code` do
    Postgres (`23505`, `57P01`, `2200H`), os do Node (`ECONNREFUSED`) e os internos (`recusado`, `transitorio`).
  - A nova `classeAceita(nome)` decide a classe que pode sair. Aceita `desconhecido`, um identificador de até 64
    caracteres terminado em `Error` ou `Exception` (`Error`, `TypeError`, `DrizzleQueryError`) ou um nome da lista
    fechada `CLASSES_DO_PROJETO`: `ErroEnvioEmail`, `ErroDominio`, `ErroProvedor`, `ErroConfiguracao`,
    `ErroLeituraSessao`, `AvisoNaoEnviado`, `ExecucaoPerdida` e `TempoEsgotado`. Fora disso, o `Error` com esse
    `name` sai com a classe `Error` (`reduzirErro`), no log e no Sentry. O objeto já reduzido com essa classe não é
    reconhecido por `erroJaReduzido` e sai no log como `{ "classe": "desconhecido" }`, com o `code` só se passar em
    `lerCode`. Um nome como `Joana` ou `ErroJoana` não chega ao log nem ao Sentry.
  - **Convenção nova:** classe de erro nova do projeto, com `name` próprio e sem o sufixo `Error` ou `Exception`, tem de
    entrar em `CLASSES_DO_PROJETO`. Sem isso, ela aparece como `Error` no log e no Sentry. O teste
    estático `test/estatico/classes-de-erro.test.ts` lê pela AST toda string posta em `name` nos arquivos de `src/`
    que não são teste e reprova o nome que `classeAceita` recusar.
- **B-3 do 0009: nos três `POST` de criação, os nomes da demanda são lidos antes de gravar.** Em
  `src/app/api/demandas/[id]/{especificacoes,pareceres-risco,pacotes-decisao}/route.ts`, `nomesDaDemanda` roda antes do
  serviço de criação, e o 201 usa os nomes lidos. Se essa leitura falhar, a resposta é 500 `erro_interno` e nada é
  gravado: nem a versão, nem o evento, nem a mudança de status, nem o aviso do DEC. A nova tentativa cria a versão
  seguinte, sem duplicar. A demanda inexistente continua 404, porque `nomesDaDemanda` devolve `[]` e o 404 vem do
  serviço. O 409 de status final, o 429 do limite e o 400 com `faltando` do DEC também não mudam. Os `GET` e os
  serviços ficaram como estavam.
- **B-a do 0008: o mesmo objeto de erro vai ao Sentry uma vez só** (`src/lib/sentry.ts`). A duplicação foi conferida no
  fonte do Next 16.4.1 e existe no route handler. O erro que escapa do handler chega sem `digest` ao `console.error` e
  ao `onRequestError`, e é o mesmo objeto nos dois (`dist/server/route-modules/route-module.js:320-328`,
  `dist/build/templates/app-route.js:335-346`). Na página, no layout e no Server Component, o erro ganha `digest`
  antes (`dist/server/app-render/create-error-handler.js:100-103` e `:165-167`). A guarda de `digest` do console
  saneado já cobria esses casos. `capturarErro` marca agora o objeto num `WeakSet`: o que já foi enviado não vai de
  novo, nas duas ordens. Dois erros distintos com a mesma mensagem continuam indo os dois, e valor que não é objeto vai
  toda vez. O log não é deduplicado: cada `console.error` continua deixando a sua linha. A evidência está no
  comentário de `src/lib/console-saneado.ts`. As rotas que passam por `rota()` e o `/api/saude` tratam o próprio erro.
  O caso real hoje é a rota do Better Auth.
- **B-1 do 0006: um teste estático barra `extras` em `criarPacoteDecisao` vindos de `src/app/`**
  (`test/estatico/pacote-sem-extras.test.ts`). Pela AST do TypeScript, ele reprova o arquivo de `src/app/` que não é
  teste e que faça uma destas coisas com `criarPacoteDecisao`: chamar com mais de 4 argumentos, usar argumento
  espalhado ou usar a função fora da chamada direta (variável, `.call`, `.apply`, `bind`). O teste segue import
  renomeado e por namespace. Hoje os dois chamadores de `src/app/` passam 4 argumentos. O `especificacaoId` e o
  `parecerRiscoId` só vêm do worker. Não mudou código de produção.
- **B-5 do 0006: `demanda_final` tem rótulo no histórico** (`MOTIVO_IGNORADO` em `src/components/rotulos.ts`). O
  evento `agente_ignorado` com esse motivo aparece como "Agente de consolidação não rodou: demanda já entregue ou
  encerrada" (e o mesmo para os outros agentes). Motivo desconhecido continua só "não rodou".
- **Testes:** blocos novos em `src/lib/reduzir-erro.test.ts`, `src/lib/log.test.ts`, `src/lib/sentry.test.ts`,
  `src/lib/console-saneado.test.ts` e `src/components/rotulos.test.ts`. Três arquivos novos:
  `test/estatico/classes-de-erro.test.ts`, `test/estatico/pacote-sem-extras.test.ts` e
  `src/app/api/demandas/nomes-antes-de-gravar.test.ts`, com Testcontainers, os 3 `POST` e a pessoa e o agente. Na
  regressão entrou também `src/instrumentation-sentry.test.ts`, com o `onRequestError` real, o console saneado real e
  o Sentry real em transporte falso, na sequência do route handler do Next. Em `src/lib/sentry.test.ts`, a classe de
  exemplo de um teste existente passou de `ErroDeConsulta` a `ConsultaError`, com as mesmas três asserções. O nome
  antigo ganhou teste próprio, que confere a queda para `Error`.
- **Versão:** o `package.json` passou de 0.1.8 para 0.1.9, e `test/estatico/projeto.test.ts` confere a versão nova.
- **Documentação:** estas notas e a versão no `README.md`, no manual técnico e no `docs/operacao/deploy.md`. O
  `README.md` ganhou a convenção de `CLASSES_DO_PROJETO`. No manual, mudaram os capítulos 02 (log e Sentry, com a
  regra de classe e de `code`, o envio único e os limites que sobram), 04 (ordem do `POST` e teste dos `extras`), 06
  (rótulo de `demanda_final`) e 09 (ordem do `POST`). No `deploy.md`, as seções 4, 6 e 8 vieram da `05-devops-sre.md`.

Não houve `.skip`, `.only` ou `.todo` novo, nem asserção afrouxada. O C-10, o C-21, o C-23, o C-36, a A-02 e o axe
continuam sem exceção. As seis asserções de `ErroEnvioEmail` (`log.test.ts`, `aviso-dec.test.ts`, `enviador.test.ts`)
e o `src/instrumentation.test.ts` não mudaram.

### Verificações desta versão

- `pnpm test`: 3.999 de 3.999 (`04-qa-automacao.md`).
- `pnpm lint` e `pnpm typecheck` limpos.
- `pnpm test:e2e`, contra o build de produção: 143 de 143, três vezes seguidas, sem teste pulado e sem nova tentativa.
- Os testes que reproduzem os cinco defeitos da `01-qa-funcional.md` usam dados fictícios. Os casos: `code`
  `00000000191` e `11900000000`, classe `Joana`, falha simulada na leitura dos nomes, o mesmo erro no gancho e no
  console, e o evento `agente_ignorado` com `demanda_final`. Foram vistos falhando antes do código, com 40 falhas
  (`03-engenheiro-backend.md`).
- Revisão de código e de segurança (`04-maestro.md`): nenhum achado crítico, alto ou médio; cinco baixos (abaixo).
- `pnpm build` passou (34 rotas). O `docker build` não rodou na `05-entrega`, porque as entradas da imagem são as da
  0.1.8, salvo `src/` e `package.json`. A imagem é construída na homologação e no CI do PR (`05-devops-sre.md`).
- A homologação, o ensaio de rollback (`construir.mjs ensaiar-rollback`) e o CI do PR ficam para a Parada 3. O rollback
  é o caminho A, só com a troca de imagem para a `v0.1.8` (`deploy.md`, seção 6).

### Pendências abertas

Da revisão deste pedido (`04-maestro.md`), baixos:

- **B-1** (`src/lib/reduzir-erro.ts`), para um pedido futuro: o `code` ainda passa com 9 dígitos, com dígitos
  separados por `_` (`000_000_001_91`) ou com uma palavra. Só vira problema se um chamador futuro puser dado pessoal em
  `code`, e nenhum caminho de hoje faz isso. Sugestão: limitar os dígitos no total. Na mesma linha, o sufixo deixa
  passar um nome montado como `JoanaSilvaError`, limite aceito na triagem.
- **B-2** (`src/lib/reduzir-erro.ts`), no pedido `DEC-DEM-20261104-0011-v1`: `reduzirErro` não confere se `e.name` é
  string. Um `name` montado de propósito, com `toString` variável, passaria. Já existia antes.
- **B-3** (as 3 rotas `POST`), no pedido 0011: os nomes são lidos fora da transação, antes de `travarDemanda`. Se o
  solicitante for renomeado nesse intervalo, o 201 minimiza com o nome antigo, e o nome novo, se estiver no texto, sai
  para o agente. É uma variante do M-1 do 0009.
- **B-4** (`src/lib/sentry.ts`), no pedido 0011: a marca é gravada antes de `reduzirErro` e do envio. Se `reduzirErro`
  lançar, o erro fica marcado sem ter ido. O mesmo objeto reaproveitado por várias requisições também vai uma vez só,
  e nenhum caso assim foi achado no código.
- **B-5** (testes estáticos), para um pedido futuro: `classes-de-erro.test.ts` não vê `get name()` nem
  `X.name = '...'` fora de `this`. `pacote-sem-extras.test.ts` não segue reexport, barrel nem `import()` dinâmico.
  Hoje não há nenhum desses casos.

Registradas nas outras etapas deste pedido:

- **Convenção de `CLASSES_DO_PROJETO` no padrão técnico** (`02-tech-lead.md`, `03-engenheiro-backend.md`): está no
  `README.md` e no manual (cap. 02). O registro no `padrao-tecnico.md` da estruturaAutonoma fica para um pedido
  próprio.
- **Conferência parcial do fonte do Next** (`03-engenheiro-backend.md`): os caminhos do middleware/proxy e da Server
  Action não foram lidos em arquivo próprio. A marca por objeto vale para qualquer caminho, então a leitura não muda a
  correção.
- **Barreira de `extras` só em `criarPacoteDecisao`** (`02-tech-lead.md`): `criarEspecificacao` e `criarParecerRisco`
  também recebem `extras` (`execucaoAgenteId`). Estender o teste estático a elas fica para um pedido próprio.

Seguem abertas, sem mudança neste pedido:

- da 0.1.8: o **M-1 da revisão do 0009** (nome antigo ou parcial do solicitante em claro para o token de agente;
  risco residual, sem bloquear). A opção (b) refinada foi decidida por Fabiano em 04/11 e está no pedido 0011.
  Também segue o limite do teste "nenhum dos fragmentos" para campo de texto novo nas três vistas;
- da 0.1.7: o risco do M-3 para a Parada 3 (erro fora de requisição chega ao Sentry só se o Next o escrever por
  `console.error`);
- da 0.1.6: B-2 a B-5, `erroId` fora do Sentry, o risco do M-05 e o teste estático das actions por SHA;
- da 0.1.5: B-2, B-3, B-4 (foco da fila antes da hidratação, WCAG 2.4.3, de interface, para um pedido próprio) e
  B-6.

## 0.1.8 — 2026-11-03

Correção do pedido `DEC-DEM-20261103-0009-v1` (cadeia curta, tipo bug), sobre a `main` da 0.1.7 (`3c8a942`). Ainda
não foi publicada: o merge, a publicação e a configuração no Easypanel são de Fabiano. **Fecha o M-a da revisão da
0.1.7, que bloqueava a primeira publicação (CA-P5-16, CA-P5-21): a primeira publicação passa a exigir a 0.1.8 ou
posterior na `main`** (a 0.1.6 e a 0.1.7 não podem ser a primeira; `docs/operacao/deploy.md`, seção 4). O M-1 desta
revisão fica como risco residual, sem bloquear (em "Pendências abertas").

Fecha o médio M-a e o baixo B-b da revisão da 0.1.7. Não há migration nova, coluna nova, dependência nova nem variável
de ambiente nova. Não mudaram `src/db/`, `drizzle/`, `e2e/`, `scripts/`, `.github/`, `Dockerfile`, `.env.example` nem
o lockfile.

### O que mudou

- **M-a (RF-20): o texto livre de DEC, ESP e RSK sai minimizado para quem não é pessoa, na leitura, na listagem e no
  201 da criação.** `vistaDoPacotePara`, `vistaDaEspecificacaoPara` e `vistaDoParecerPara` recebem, como terceiro
  parâmetro obrigatório, os nomes do solicitante da demanda, e passam por `minimizarValor`:
  - no DEC, `demandaTitulo`, `demandaDescricao`, `resumoExecutivo`, `recomendacao`, `opcaoA` e `opcaoB` subcampo a
    subcampo (subcampo ausente continua ausente), `decisao.comentarios` e as listas `criteriosAceitePreliminares` e
    `definicaoDePronto` da ESP citada;
  - na ESP, os 15 campos de texto e de lista;
  - no RSK, `resumo`, os três `risco*Comentario`, `recomendacoesMitigacao`, `preCondicoes` e
    `envolverJuridicoOuAdministradoraQuando`.

  Campo nulo continua `null` e lista nula continua nula; ids, `sistemaAlvo`, `repositorioDestino`, níveis,
  `statusDecisao`, datas e `rascunhosCitados` não mudam. Valem as sete leituras (`GET /api/especificacoes/:espId`,
  `GET /api/pareceres-risco/:rskId`, `GET /api/pacotes-decisao/:decId`, `GET /api/pacotes-decisao` e as três listas de
  `GET /api/demandas/:id/...`) e o 201 dos três `POST` de criação (`especificacoes`, `pareceres-risco` e
  `pacotes-decisao`), que antes devolviam o retorno do serviço sem a vista do ator. Na lista `GET /api/pacotes-decisao`,
  cada DEC é minimizado com o nome do solicitante da própria demanda (`nomesDosSolicitantes`, uma consulta só para a
  página). A pessoa recebe o original, e o Pedido de Construção continua gerado do banco, com o texto original. Os
  utilitários de `src/modules/demandas/consultas.ts` passaram a ser exportados e reaproveitados nas três vistas, sem
  cópia.
- **B-b: `normalizarErro` reduz o erro em objeto que não é `Error`.** `src/lib/log.ts` grava `{ "classe":
  "desconhecido" }`, com `code` só quando passa no formato de `lerCode` (agora exportada de `src/lib/reduzir-erro.ts`).
  A exceção é o erro que já chega reduzido, na forma exata `{ classe, code? }` com a classe no formato de identificador
  (`erroJaReduzido`): o `onRequestError` já entrega `reduzirErro(err)` e mantém a classe. O retorno de `reduzirErro`
  não mudou.
- **Testes:** describe "M-a" em `src/app/api/vistas-para-agente.test.ts` (sete leituras e 201 dos três `POST`, dois
  atores, cenário com lista nula e subcampo ausente, fila cruzando duas demandas, CNPJ fictício e `opcaoA` com
  `quandoEscolher`), um teste em `src/app/api/pacotes-decisao/pedido.test.ts` (o Pedido mantém o texto original) e
  quatro em `src/lib/log.test.ts` (objeto simples, `code` no formato e fora dele, erro já reduzido, bordas como objeto
  com cara de `Error`, lista, `{}` e objeto sem protótipo). As duas verificações da segunda barreira do `redact` em
  `log.test.ts` passaram do campo `erro` para o campo `instancia`, sem afrouxar.
- **Versão:** o `package.json` passou de 0.1.7 para 0.1.8, e `test/estatico/projeto.test.ts` confere a versão nova.
- **Documentação:** estas notas; a versão no `README.md`, no manual técnico e no `docs/operacao/deploy.md`; no manual,
  cap. 02 (vista do agente e `normalizarErro`), 03 (M-a fechado e utilitários), 06 (alcance da minimização na API) e
  09 (201 dos `POST` e campos minimizados de DEC, ESP e RSK); no `deploy.md`, as seções 4 e 6 vieram da
  `05-devops-sre.md`.

Não houve `.skip`, `.only` ou `.todo` novo, nem asserção afrouxada. O C-10, o C-21, o C-23, o C-36, a A-02 e o axe
continuam sem exceção.

### Verificações desta versão

- `pnpm test`: 3.918 de 3.918 (`04-qa-automacao.md`).
- `pnpm lint` e `pnpm typecheck` limpos.
- `pnpm test:e2e`, contra o build de produção: 143 de 143, três vezes seguidas.
- Testes que reproduzem os defeitos da `01-qa-funcional.md`, com dados fictícios (nome, e-mail, CPF, telefone e CNPJ
  em todo texto de DEC, ESP e RSK e no comentário da decisão; objeto com `motivo` e `cpf` no log), vistos falhando na
  0.1.7.
- Revisão de código e de segurança (`04-maestro.md`): nenhum achado crítico ou alto; um médio (risco residual) e dois
  baixos abertos (abaixo); o B-2 fechou na própria regressão.
- `pnpm build` passou (34 rotas). `docker build` não rodou na `05-entrega`: as entradas da imagem são as da 0.1.7, salvo
  `src/` e `package.json`, e a imagem é construída na homologação e no CI do PR (`05-devops-sre.md`).
- A homologação, o ensaio de rollback (`construir.mjs ensaiar-rollback`) e o CI do PR ficam para a Parada 3. O rollback
  é o caminho A, só troca de imagem para a `v0.1.7` (`deploy.md`, seção 6).

### Pendências abertas

Da revisão deste pedido (`04-maestro.md`):

- **M-1 (risco residual de RF-20, dado pessoal), para Fabiano e a `gestao-riscos` aceitarem ou não antes da primeira
  publicação.** Só o nome atual e completo do solicitante é trocado. O `solicitanteNome` pode ser editado, e DEC, ESP e
  RSK guardam texto do momento da criação: nome antigo, ou escrito pela metade ("a Joana pediu…"), sai em claro para o
  token de agente. Não é regressão. Opções para pedido futuro: (a) guardar o nome anterior numa coluna só para
  minimizar, com o mesmo expurgo; (b) trocar cada parte do nome com 3 letras ou mais, com custo de falso positivo.
- **B-1** (`src/lib/reduzir-erro.ts`): `FORMATO_CODE` aceita CPF ou telefone só de dígitos, e `erroJaReduzido` aceita
  como classe um nome de uma palavra; depende de quem chama o log passar esse valor. Sugestão: recusar `code` só de
  dígitos com 10 ou mais e aceitar só classe terminada em `Error` ou de lista conhecida.
- **B-3** (`src/app/api/demandas/[id]/{especificacoes,pareceres-risco,pacotes-decisao}/route.ts`): nos três `POST`, os
  nomes são lidos depois de gravar; se essa leitura falhar, o artefato fica gravado, o agente recebe 500 genérico e
  pode repetir, criando versão duplicada. Sem vazamento. Sugestão: ler os nomes antes de chamar o serviço.

Registradas nas outras etapas deste pedido:

- Campo de texto novo numa das três vistas só fica coberto pelo teste "nenhum dos fragmentos" se o cenário o preencher
  com o dado fictício; o tipo obriga a montar o campo na vista mínima, não a minimizá-lo (`04-qa-automacao.md`).
- Seguem abertas as pendências da 0.1.7 que este pedido não tratou: B-a, o risco do M-3 para a Parada 3 e, da 0.1.6,
  B-2 a B-5, `erroId` fora do Sentry, o risco do M-05 e o teste estático das actions por SHA.

## 0.1.7 — 2026-11-03

Correção do pedido `DEC-DEM-20261103-0008-v1` (cadeia curta, tipo bug), sobre a `main` da 0.1.6 (`75a2b0f`). Ainda
não foi publicada: o merge, a publicação e a configuração no Easypanel são de Fabiano. **A primeira publicação continua
bloqueada**, agora pelo médio M-a desta revisão (em "Pendências abertas").

Fecha os médios M-1 (na demanda), M-2 e M-3 e o baixo B-1 da revisão da 0.1.6. Não há migration nova, coluna nova,
dependência nova nem variável de ambiente nova. Não mudaram `src/db/`, `drizzle/`, `e2e/`, `.github/`, `Dockerfile`,
`.env.example` nem o lockfile.

### O que mudou

- **M-1 (RF-20): na demanda, quem não é pessoa recebe o texto livre minimizado, na leitura, na criação e na
  listagem.** `vistaDaDemandaPara` (`GET /api/demandas/:id` e o 201 do `POST /api/demandas`) passa `titulo`,
  `contexto`, `descricaoProblema`, `justificativaUrgencia`, `impactoPercebido` e cada item de `duvidasEntrada` por
  `minimizarValor`, com o nome do solicitante da própria demanda entre os nomes trocados: nome, e-mail, CPF, CNPJ e
  telefone viram `[nome removido]`, `[e-mail removido]` e os outros marcadores. Campo nulo continua `null`, sem sumir a
  chave. A listagem `GET /api/demandas` usa a nova `listarDemandasPara`, que troca o `titulo` de cada item com o nome do
  solicitante daquele item; nenhum ator recebe a chave `solicitanteNome`. Só a pessoa recebe o texto original (lista de
  permissão: o ator `sistema` também recebe o minimizado). `minimizarValor` saiu de `entrada-agente.ts` para
  `src/modules/dados-pessoais/minimizar.ts`: a regra da entrada do agente e a da API são uma só. `listarDemandas`, usada
  pelo painel, não mudou. **O M-1 fechou só na demanda:** o DEC ainda devolve a cópia do texto da demanda sem minimizar
  (M-a, abaixo).
- **M-2: as leituras de ESP, RSK e DEC não dão nome de pessoa a quem não é pessoa.** As sete rotas
  (`GET /api/especificacoes/:espId`, `GET /api/pareceres-risco/:rskId`, `GET /api/pacotes-decisao/:decId`,
  `GET /api/pacotes-decisao` e as três listas `GET /api/demandas/:id/especificacoes`, `.../pareceres-risco` e
  `.../pacotes-decisao`) aplicam `vistaDaEspecificacaoPara`, `vistaDoParecerPara` e `vistaDoPacotePara`, montadas chave a
  chave: autor pessoa vira `{ "tipo": "pessoa" }` (autor agente fica igual); cada item de `aprovadores[]` fica só com
  `papel`, `opcao`, `registradaEm` e `dataDocumento` (somem `nome` e `referenciaDocumento`); `decisao` fica sem
  `decididaPor`, e `decisao: null` segue `null`. A pessoa recebe a vista inteira, como antes.
- **M-3: `console.error` de `Error` sem `digest` vai ao Sentry.** `src/lib/console-saneado.ts`, depois da linha
  `console_erro` do log, chama `capturarErro(erro, { evento: 'console_erro' })`, dentro da mesma guarda contra
  reentrada: falha do Sentry não entra em laço nem cai no console original. O `Error` com `digest` (inclusive os de
  controle do Next) não vai, porque já sai pelo `onRequestError`. `console.warn` continua só no log. Nenhuma integração
  do Sentry foi ligada (`defaultIntegrations` segue `false`).
- **B-1: `onRequestError` grava o erro reduzido.** `src/instrumentation.ts` passa `reduzirErro(err)` ao log; valor que
  não é `Error` vira `{ "classe": "desconhecido" }`, sem `query` nem `params`.
- **Testes:** 6 do M-1 em `src/app/api/demandas/demandas.test.ts`, 1 do B-1 em `src/instrumentation.test.ts`, o arquivo
  novo `src/app/api/vistas-para-agente.test.ts` (M-2, nas sete rotas, para os dois atores) e 4 do M-3 em
  `src/lib/console-saneado.test.ts`; na regressão, mais 13 (vista do agente igual à da pessoa só com os cortes,
  listagem e `minimizarValor`). Uma asserção existente mudou em `pareceres.test.ts`, para o contrato novo, e ficou mais
  estrita.
- **Versão:** o `package.json` passou de 0.1.6 para 0.1.7, e `test/estatico/projeto.test.ts` confere a versão nova.
- **Documentação:** estas notas; a versão no `README.md`, no manual técnico e no `docs/operacao/deploy.md`; no manual,
  cap. 02 (vista do agente nas leituras e console para o Sentry), 03 (vista mínima com texto minimizado), 06 (alcance
  da minimização na API) e 09 (rotas e exemplo); no `deploy.md`, as seções 4 e 6 vieram da `05-devops-sre.md`.

Não houve `.skip`, `.only` ou `.todo` novo, nem asserção afrouxada. O C-10, o C-21, o C-23, o C-36, a A-02 e o axe
continuam sem exceção.

### Verificações desta versão

- `pnpm test`: 196 arquivos, 3.907 de 3.907 (`04-qa-automacao.md`).
- `pnpm lint` e `pnpm typecheck` limpos.
- `pnpm test:e2e`, contra o build de produção: 143 de 143, sem teste pulado, três vezes seguidas, cada uma com banco
  novo. Nenhum spec precisou de ajuste: nenhum lê a API com token de agente.
- Testes que reproduzem os defeitos da `01-qa-funcional.md`, com dados fictícios: e-mail, CPF, telefone e nome do
  solicitante no texto livre, para agente, pessoa e `sistema`; nome da conta autora, da aprovadora e a referência do
  documento nas sete rotas; `Error` sem e com `digest` no console; objeto simples no `onRequestError`.
- Revisão de código e de segurança (`04-maestro.md`): nenhum achado crítico ou alto; um médio e dois baixos (abaixo).
- `docker build` local: 1,74 GB em disco e 426 MB de conteúdo, o mesmo da 0.1.6, nada publicado (`05-devops-sre.md`).
- A homologação, o ensaio de rollback (`construir.mjs ensaiar-rollback`) e o CI do PR ficam para a Parada 3.

### Pendências abertas

Da revisão deste pedido (`04-maestro.md`):

- **M-a (M-1 incompleto, RF-20, dado pessoal). Continua bloqueando a primeira publicação (CA-P5-16) até o pedido
  seguinte (0009) corrigi-lo ou até Fabiano e a `gestao-riscos` aceitarem o risco.** O DEC guarda cópia do título e da
  descrição da demanda, e `demandaTitulo` e `demandaDescricao` saem sem minimizar para quem não é pessoa em
  `GET /api/pacotes-decisao`, `GET /api/pacotes-decisao/:decId`, `GET /api/demandas/:id/pacotes-decisao` e no 201 do
  `POST /api/demandas/:id/pacotes-decisao` (que não passa pela `vistaDoPacotePara`). No mesmo grupo saem sem minimizar
  `decisao.comentarios` (texto livre de pessoa) e o texto de ESP e RSK, que a entrada do agente minimiza e a API não
  (`src/modules/pacotes-decisao/consultas.ts`, `src/modules/especificacoes/consultas.ts`). Efeito: o token de agente lê
  no DEC o mesmo texto que agora sai minimizado na demanda.
- **B-a** (`src/lib/console-saneado.ts`): a não duplicação no Sentry depende de o Next não mandar o mesmo erro sem
  `digest` ao `onRequestError` e ao `console.error`; não conferido no fonte do Next. No máximo, um evento a mais, sem
  dado.
- **B-b** (`src/lib/log.ts`): `normalizarErro` não reduz objeto que não é `Error`; o B-1 corrigiu só o
  `onRequestError`. Sugestão: reduzir na própria `normalizarErro`, junto do M-a no 0009.

Registradas nas outras etapas deste pedido:

- **Risco que sobra no M-3, para a Parada 3:** a prova é de unidade. Não está confirmado que `uncaughtException`,
  `unhandledRejection` e o `onError` do `after()` passam por `console.error` no runtime do Next 16; se algum for direto
  ao `process.stderr`, não chega ao Sentry.
- Seguem abertas as pendências da 0.1.6 que este pedido não tratou: B-2 a B-5, `erroId` fora do Sentry, o risco do M-05
  e o teste estático das actions por SHA.

## 0.1.6 — 2026-11-03

Correção do pedido `DEC-DEM-20261103-0007-v1` (cadeia curta, tipo bug), sobre a `main` da 0.1.5 (`e0d5f4c`). Ainda
não foi publicada: o merge, a publicação e a configuração no Easypanel são de Fabiano. **A primeira publicação continua
bloqueada**, agora pelo médio M-1 desta revisão (dado pessoal no texto livre lido pelo agente, em "Pendências abertas").

Fecha os médios M-05, M-06 e M-07 da 0.1.0 e o M-08 (novo na triagem do pedido 0006), corrige a classificação do 408 e
do 409 do Resend e fixa as actions dos workflows por SHA. **Cinco comportamentos do sistema mudam**, descritos abaixo.
Não há migration nova, coluna nova nem variável de ambiente nova. Não mudaram `src/db/`, `drizzle/`, `e2e/`,
`Dockerfile`, `.env.example` nem o lockfile.

### O que mudou

- **M-05 (C-21): erro não tratado de página, layout, metadados ou Server Component não sai mais pelo console com
  mensagem, pilha, `cause` ou parâmetros.** São três peças:
  - **na origem** (`src/modules/acesso/exigir-pessoa.ts`): toda falha do `getSession` do Better Auth vira
    `ErroLeituraSessao`, com mensagem fixa (`erro_leitura_sessao`), sem `cause` e só com o `code` validado. Vale para
    rota, Server Action, página, layout, metadados e `/configurar-2fa`. Na falha de banco, o token de sessão que ia nos
    parâmetros da consulta não chega a nenhuma saída;
  - **no registro** (`onRequestError` em `src/instrumentation.ts`, só no runtime Node): uma linha de log
    `erro_requisicao` com `metodo`, `rota` (o modelo, por exemplo `/demandas/[id]`, nunca o caminho com id ou query),
    `codigoErro: 'erro_interno'`, `erroId` e o erro reduzido a classe e código; o mesmo erro vai ao Sentry pelo
    `capturarErro` das rotas. O `erroId` é o `digest` do Next e só entra no formato `^[A-Za-z0-9_-]{1,64}$`.
    `redirect()` e `notFound()` não são registrados;
  - **no console** (`src/lib/console-saneado.ts`, instalado no `register()` depois da configuração e do Sentry):
    `console.error` e `console.warn` passam a gravar só `{ evento: 'console_erro' | 'console_aviso', erro, erroId }`
    pelo log. Texto solto e objeto não saem. `console.log` e `console.info` não mudam, e o erro de configuração do boot,
    que cita só o nome da variável (C-31), continua legível.
  - `erroId` entrou na lista de permissão do log (`CAMPOS_PERMITIDOS`, `src/lib/log.ts`), e o próprio log descarta valor
    fora do formato.
  - O que a operação vê: o log do `app` no Easypanel não traz mais mensagem nem pilha de erro de tela. O que sobra para
    o diagnóstico é, no log, o `erroId`, a rota, a classe e o código e, no Sentry, a tag `evento: erro_requisicao`, o
    título `<classe> <code>` e os quadros da pilha sem mensagem. O Sentry não recebe o `erroId`.
- **M-06 (C-10, RF-20): o ator que não é pessoa recebe a vista mínima da demanda.** `vistaDaDemandaPara`
  (`src/modules/demandas/consultas.ts`) é usada no `GET /api/demandas/:id` e na resposta do `POST /api/demandas`:
  - a pessoa recebe a vista inteira, como antes;
  - qualquer outro ator (o token de agente) recebe a vista montada chave a chave, por lista de permissão: sem as chaves
    `solicitanteNome` e `anexos` (a chave some, não vem `null`), com `responsavel` de pessoa igual a `{ "tipo": "pessoa" }`
    e o mesmo no `autor` das listas `especificacoes`, `pareceresRisco` e `pacotesDecisao`. Autor agente fica
    `{ "tipo": "agente", "agente": "<nome>" }`. Campo novo da vista não chega ao agente sem entrar na lista;
  - a listagem `GET /api/demandas` já não tinha esses campos e agora tem teste de contrato nos dois atores.
  - Os campos de texto livre da demanda continuam saindo para o agente sem minimização: é o M-1 (Pendências).
- **M-07 (C-37): o seed fictício recusa a configuração fora do loopback.** `scripts/seed-ficticio.ts` ganhou uma
  segunda guarda, independente de `SEED_FICTICIO` e do banco vazio: o host da origem validada do `BETTER_AUTH_URL`
  tem de ser `127.0.0.1`, `localhost` ou `[::1]`, por igualdade exata (`ehLoopback`, `src/lib/env.ts`, a mesma lista do
  cookie `Secure`). Fora disso, antes de abrir conexão ou transação:
  - o resultado é `recusado_producao`, com código de saída 1 e nada gravado;
  - a saída é a mensagem fixa "Seed fictício não rodou: BETTER_AUTH_URL não aponta para o loopback (127.0.0.1,
    localhost ou [::1]), e o seed só roda fora da produção. Nada foi alterado.", sem o valor da URL;
  - o log grava `seed_ficticio` com `codigoErro: 'url_fora_do_loopback'`;
  - no `pnpm start:hml`, a recusa imprime "Seed fictício não rodou (BETTER_AUTH_URL fora do loopback)." e não derruba a
    subida.

  A homologação (`127.0.0.1:3200`), o e2e (`127.0.0.1:3101`) e o banco de desenvolvimento seguem semeando.
- **M-08: decidir DEC e gerar Pedido numa demanda em status final dá 409.**
  - `registrarDecisao` (`src/modules/pacotes-decisao/decidir.ts`) trava a demanda e, se ela está `entregue` ou
    `encerrada` (`ehStatusFinal`), responde 409 `conflito` com "a demanda está em status final; o pacote não pode mais
    ser decidido.". A recusa vem antes de ler o DEC e de toda outra conferência: aprovar, devolver e arquivar recebem
    essa mensagem, também num DEC já decidido e na segunda aprovação de um DEC `cto_e_administradora`.
  - `gerarPedido` (`src/modules/pedido-construcao/gerar.ts`) passou a travar a demanda, como a decisão, e responde 409
    com "a demanda está em status final; o pacote não gera mais Pedido de Construção." antes de ler o DEC. O
    `desatualizado` agora é lido sob a trava.
  - Nada é gravado na recusa: nem `aprovacao`, nem `decisao`, nem evento, nem `pedido_gerado`. A matriz vem antes: token
    de agente segue 403 e sem credencial segue 401.
  - Consequência: depois de "Arquivar" (que leva a demanda a `encerrada`), decidir de novo o mesmo DEC dá o 409 da
    demanda final, não o "este pacote já tem decisão registrada."; e gerar de novo o Pedido de um DEC aprovado depois que
    a demanda foi a `entregue` passou a dar 409 (B-5, abaixo).
- **Aviso por e-mail: 408 e 409 do Resend são tentados de novo** (`src/modules/avisos/enviador.ts`). Passam a
  `transitorio`, com 429 e 5xx: o aviso fica `pendente` e a fila tenta até a 3.ª, quando termina `falhou`. Os outros 4xx
  (400, 401, 403, 410, 413, 422) seguem `recusado` e `falhou` na 1.ª. O 409 da mesma `Idempotency-Key` com corpo
  diferente, que não é passageiro, também gasta as 3 tentativas: é limitado, e aceito na triagem.
- **CI: actions fixadas por SHA** (`.github/workflows/ci.yml` e `deploy.yml`). As 9 linhas `uses:` são
  `actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 # v5.1.0` (5 no `ci.yml`, 1 no `deploy.yml`) e
  `actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444 # v5.0.0` (3 no `ci.yml`), sem troca de versão maior. O
  "SHA pendente" saiu dos `uses:` e dos cabeçalhos. Os gatilhos não mudaram.
- **Testes:** os da correção e 13 novos na regressão (contrato HTTP do 409 nas rotas de decisão e de Pedido, e os casos
  exploratórios do console). Quatro asserções existentes mudaram porque fixavam o comportamento corrigido, sem ficar
  mais fracas: o 409 do DEC arquivado em `gerar.test.ts` e `acoes-pedido.test.ts` (agora com a mensagem da demanda
  final), o erro do `getSession` em `exigir-pessoa.test.ts` e `resolver-ator-qa.test.ts` (agora `ErroLeituraSessao`, sem
  a mensagem crua) e a linha do 409 em `enviador.test.ts` (de `recusado` para `transitorio`).
- **Versão:** o `package.json` passou de 0.1.5 para 0.1.6, e `test/estatico/projeto.test.ts` confere a versão nova.
- **Documentação:**
  - estas notas;
  - a versão no `README.md`, no manual técnico e no `docs/operacao/deploy.md`;
  - no manual: cap. 02 (log, console e `ErroLeituraSessao`), 03 (vista do agente e status final), 04 e 05 (409 da
    demanda final na decisão e no Pedido), 06 (alcance da minimização na API), 07 (408 e 409), 08 (textos para a
    `ux-ui-design`), 09 (rotas, erros e exemplos) e 10 (guarda do seed);
  - no `deploy.md`: a primeira publicação (seção 4, com o bloqueio do M-1), o seed (seção 7), o `erro_requisicao` e o
    aviso (seções 8 e 9); as seções 6 e 10 vieram da `05-devops-sre.md`.

Não houve `.skip`, `.only` ou `.todo` novo, nem asserção afrouxada. O C-10, o C-21, o C-36, o C-37, a A-02 e o axe
continuam sem exceção. O único `eslint-disable-next-line no-console` novo fica na linha de `console-saneado.ts` que troca
os dois métodos, com a razão (G3.7).

### Verificações desta versão

- `pnpm test`: 195 arquivos, 3.879 de 3.879 (`04-qa-automacao.md`; a `05-devops-sre.md` repetiu sem o build em
  paralelo, com o mesmo resultado).
- `pnpm lint` e `pnpm typecheck` limpos.
- `pnpm test:e2e`, contra o build de produção: 143 de 143, sem teste pulado, três vezes seguidas, cada uma com banco
  novo. Nenhum spec precisou de ajuste.
- Testes que reproduzem os defeitos da `01-qa-funcional.md`: o sentinela fictício em `message`, `cause`, `stack` e
  `params` do erro do `getSession`, no `onRequestError` e no console (com espião no `stdout` e no `stderr` do processo);
  o `GET` e o `POST` com token de agente; o seed com quatro URLs fora do loopback; decidir e gerar em `encerrada` e
  `entregue`, pela função e pela rota; 408 e 409 pelas três tentativas.
- Revisão de código e de segurança (`04-maestro.md`): nenhum achado crítico ou alto; três médios e cinco baixos
  (abaixo).
- `docker build` local: 1,74 GB em disco e 426 MB de conteúdo, o mesmo da 0.1.5, nada publicado (`05-devops-sre.md`).
- A homologação (`construir.mjs homologar`), o ensaio de rollback (`construir.mjs ensaiar-rollback`) e o CI do PR, que
  prova os 9 SHAs, ficam para a Parada 3.

### Pendências abertas

Da revisão deste pedido (`04-maestro.md`), médios, **abertos** (M-1 a M-3 são desta revisão; não confundir com os M-01
a M-03 da 0.1.0):

- **M-1 (RF-20, LGPD): dado pessoal no texto livre lido pelo agente. Bloqueia a primeira publicação (CA-P5-16) até o
  pedido seguinte (0008) corrigi-lo ou até Fabiano e a `gestao-riscos` aceitarem o risco.** A vista mínima tira as
  chaves e o nome do autor, mas devolve ao token de agente `titulo`, `contexto`, `descricaoProblema`,
  `justificativaUrgencia`, `impactoPercebido` e `duvidasEntrada` sem passar pelo `minimizar`
  (`src/modules/demandas/consultas.ts:199-222`); o `titulo` da listagem `GET /api/demandas` também. A entrada do agente
  troca nome, e-mail, CPF, CNPJ e telefone por marcadores; pela API, um nome ou contato escrito no texto livre sai
  inteiro. O comentário do código diz "o mesmo critério da entrada do agente", e isso não é verdade hoje. Por ser dado
  pessoal, não fica como dívida sem esse aceite.
- **M-2: autoria nas leituras próprias de ESP, RSK e DEC.** `GET /api/especificacoes/:espId`,
  `GET /api/pareceres-risco/:rskId` e `GET /api/pacotes-decisao/:decId` seguem dando ao token de agente o `autor.nome`
  da conta, e o DEC também `aprovadores[].nome`, `referenciaDocumento` e `decididaPor`
  (`src/modules/especificacoes/consultas.ts:63`, `src/modules/pacotes-decisao/consultas.ts:148-155`). Ficou fora do
  M-06 por não estar no texto aprovado da ESP; precisa de dono e prazo. Recomendação do maestro: no pedido 0008, junto
  com o M-1.
- **M-3: diagnóstico do erro fora de requisição** (`src/lib/console-saneado.ts:31-32`). O que não passa pelo
  `onRequestError` (`uncaughtException`, `unhandledRejection`, `onError` do `after()`) e chega ao console perde a pilha e
  não vai ao Sentry, que roda com `defaultIntegrations: false`; aviso só de texto do Next vira `console_erro` sem pista.
  Não vaza dado; dificulta o diagnóstico em produção. Sugestão da revisão: chamar `capturarErro` quando o argumento for
  `Error` sem `digest`. Recomendação do maestro: no pedido 0008.

Da revisão deste pedido, baixos:

- **B-1:** `onRequestError` passa `erro: err` cru ao log (`src/instrumentation.ts:51`); com valor que não é `Error`, o
  `redact` só cobre um nível. Não é explorável hoje, porque o Next converte antes; `reduzirErro(err)` fecha. Junto do
  0008.
- **B-2:** o Next pode guardar `console.warn` ao carregar um módulo, e o `onError: console.error` do `next-server`,
  antes do `register()`. São avisos de API dinâmica e erros do `after()`, sem token.
- **B-3:** a guarda do seed lê o `BETTER_AUTH_URL`, não o `DATABASE_URL`. Quem trocar só a URL ainda cai na guarda do
  banco com conta e demanda. Defesa em profundidade, aceitável.
- **B-4:** os dois textos novos de 409 (`demandaFinal` em `decidir.ts` e `gerar.ts`) foram escritos na triagem e pedem a
  revisão da `ux-ui-design`, que também decide se a tela do DEC esconde as ações quando a demanda está em status final.
- **B-5:** gerar de novo o Pedido de um DEC numa demanda `entregue` passou a dar 409. Antes, o mesmo DEC gerava sempre o
  mesmo Pedido (CA-22.2) em qualquer status. É o que a ESP aprovada pede; fica registrado para quem mexer no fluxo do
  Pedido.

Registradas nas outras etapas deste pedido:

- **`erroId` fora do Sentry** (achado da `06-documentacao`): a triagem (`02-tech-lead.md`) diz que o `erroId` casa a
  linha do log com o evento no Sentry, mas o `capturarErro` (`src/lib/sentry.ts:40-46`) manda só o título
  `<classe> <code>`, os quadros da pilha e a tag `evento`. O manual descreve o código; levar o `erroId` como tag é
  decisão para o pedido 0008.
- **Risco que sobra no M-05, para a Parada 3:** a prova é de unidade. Se o Next escrever o erro de renderização direto
  no `process.stderr`, ou guardar a referência do `console.error` antes do `register()`, a peça do console não pega, e
  só a origem (token) e o registro (`erro_requisicao`) seguem garantidos. A conferência é o passo 2 da D-01 da
  `01-qa-funcional.md` na homologação: parar o `db`, abrir `/demandas` e ler o log do `app`.
- **Teste estático das actions por SHA** (`04-qa-automacao.md`): um teste em `test/estatico/` que exija
  `owner/repo@<40 hex> # vX.Y.Z` em todo `uses:` de terceiros. Fora da lista **Pode** da `05-entrega`; vai a um próximo
  pedido. Sugestão da `05-devops-sre.md`: Dependabot ou Renovate para `github-actions`, para o SHA e o comentário mudarem
  juntos.
- **Segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER`:** sem mudança desde a 0.1.5. Até existirem, o merge
  publica a imagem no GHCR e fica vermelho no passo "Disparar o Easypanel", sem deploy. Antes de qualquer passo, tire um
  snapshot da VPS no hPanel.
- **Rollback da 0.1.6** pelo caminho A (só trocar a imagem de `worker` e `app`), para
  `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:e0d5f4c39740275c31e4f4de55874128adb52e78` (a `v0.1.5`, merge
  do PR #7). Ao voltar, o M-05 e o M-06 deixam de valer até a correção ser publicada. Na cadeia curta a volta não foi
  ensaiada: o ensaio é o `ensaiar-rollback` da Parada 3.
- A imagem local `ws-orquestrador-demandas:local` (agora a da 0.1.6) ficou no Docker da VPS. Apagá-la depende de
  confirmação de Fabiano.

Continuam abertas, sem mudança: os baixos B-1 a B-6 da 0.1.5, as versões do Next e do Better Auth acima do padrão
técnico, o médio do reteste da 0.1.0 (demanda sem saída com DEC aprovado e versão nova), as pendências da 0.1.4 e da
0.1.2 e as da 0.1.0 (seções abaixo).

## 0.1.5 — 2026-11-03

Correção do pedido `DEC-DEM-20261103-0006-v1` (cadeia curta, tipo bug), sobre a `main` da 0.1.4 (`cf36ec5`). Ainda
não foi publicada: o merge, a publicação e a configuração no Easypanel são de Fabiano.

Fecha três médios de regra de domínio da 0.1.0 (seção abaixo): M-01, M-02 e M-03. **Três comportamentos do sistema
mudam**, descritos abaixo. Não há migration nova, coluna nova nem variável de ambiente nova: o motivo novo
`demanda_final` vai no `jsonb` do evento. Não mudaram `src/db/`, `drizzle/`, `scripts/`, `.github/`, `Dockerfile` nem
o lockfile.

### O que mudou

- **M-01: o DEC da consolidação cita a ESP e o RSK que o agente leu.**
  - Antes, o agente de consolidação lia o RSK da chave da execução e a ESP mais nova, e o DEC citava a ESP e o RSK mais
    novos no momento da gravação. Um RSK ou uma ESP gravados entre o agendamento e a gravação (inclusive durante a
    chamada ao provedor, que pode levar até 120 s) faziam o DEC citar uma versão que o modelo não leu.
  - Agora `montarEntrada` (`src/modules/agentes/entrada-agente.ts`) devolve também `citados`, com o id da ESP e do RSK
    que entraram no bloco enviado ao provedor. Os ids não vão para o conteúdo enviado. O worker passa esses ids ao
    `criarPacoteDecisao` (`src/modules/pacotes-decisao/criar.ts`), que lê **essas** versões sob a trava da demanda,
    filtrando pela demanda. Id inexistente ou de outra demanda dá 404 e nada é gravado.
  - Se entrou versão mais nova depois da leitura, o DEC da consolidação **nasce desatualizado**, e a aprovação dele é
    barrada pela regra que já existia (409 "o pacote está desatualizado e não pode ser aprovado."). A execução do RSK
    novo gera o DEC coerente. O DEC desatualizado leva a demanda a `pronta_para_decisao` e agenda o aviso, como qualquer
    DEC.
  - DEC criado por pessoa (painel, rota ou Server Action) continua citando a ESP e o RSK mais novos, sob a trava. Os ids
    citados nunca vêm do corpo da requisição nem da saída do modelo.
- **M-02: ESP, RSK e DEC são recusados em demanda `entregue` ou `encerrada`.**
  - Os três serviços (`src/modules/especificacoes/servico.ts`, `src/modules/pareceres-risco/servico.ts` e
    `src/modules/pacotes-decisao/criar.ts`), pela pessoa e pelo agente, respondem 409 `conflito` com a mensagem fixa
    "Esta demanda está em status final. Não aceita nova especificação, parecer de risco nem pacote de decisão.". A
    recusa vem logo depois da trava da demanda, antes do limite por ator e de qualquer insert, evento, agente, aviso ou
    job.
  - Os status finais saem da máquina de estados (`STATUS_FINAIS`, `ehStatusFinal` e `recusarSeDemandaFinal` em
    `src/modules/demandas/transicoes.ts`): hoje são `encerrada` e `entregue`. Nos outros sete status a criação continua
    permitida.
  - A execução de agente que já estava na fila quando a demanda chegou a status final termina `ignorada`, com evento
    `agente_ignorado` e motivo `demanda_final`, **sem chamar o provedor** (`src/modules/agentes/executar.ts`). Se a
    demanda for fechada durante a chamada, o serviço recusa com 409 e a execução termina `falhou`
    (`recusada_pelo_servico`), sem nova tentativa.
- **M-03: o aviso por e-mail falha na hora na recusa definitiva e conta o erro inesperado**
  (`src/modules/avisos/aviso-dec.ts`).
  - Resposta 4xx do Resend que não é 429 (por exemplo 400, 401, 403, 422) marca o aviso `falhou` na 1.ª tentativa, com
    `aviso_email_falhou` no log e no Sentry, e o job termina sem erro. Antes, era tentada de novo até a 3.ª.
  - 429, 5xx, erro de rede, tempo limite e resposta fora do formato continuam como antes: contam a tentativa, o aviso
    fica `pendente` e a fila tenta de novo até a 3.ª.
  - Erro inesperado fora do enviador (por exemplo, falha ao montar o e-mail ou do banco no meio do envio) passa a contar
    a tentativa, numa transação própria e com a trava da linha. Na 3.ª, o aviso fica `falhou` e vai ao Sentry como a
    falha comum. Antes, o aviso ficava `pendente` para sempre, sem alerta.
  - Só quando nem a contagem é possível (banco fora), o erro sobe sem contar, e o handler
    (`src/jobs/aviso-dec-pronto.ts`) registra `aviso_erro_inesperado`, como antes.
- **Testes:** 17 testes novos de regressão na 04 e os da correção, entre eles o arquivo novo
  `src/modules/pareceres-risco/servico.test.ts`. O contrato HTTP do 409 é conferido nas três rotas. Os dois `it.each`
  que afirmavam o comportamento antigo para `encerrada` (`criar.test.ts` e `especificacoes/servico.test.ts`) mudaram de
  lista, e o caso `encerrada` virou caso de recusa.
- **e2e:** quatro testes da fila (`e2e/fila-qa.spec.ts` e `e2e/fila.spec.ts`) passaram a esperar "N demandas
  encontradas." antes do clique que pede o foco. Corrige um teste instável que já existia, sem tirar asserção.
- **Versão:** o `package.json` passou de 0.1.4 para 0.1.5, e `test/estatico/projeto.test.ts` confere a versão nova.
- **Documentação:**
  - estas notas;
  - a versão no `README.md` e no manual técnico;
  - no manual: as regras novas nos cap. 03 (status final), 04 (citação do DEC e recusa), 06 (passo 3b da execução e
    citação da consolidação), 07 (nova tentativa do aviso) e 09 (o 409 de status final, com exemplo);
  - em `docs/operacao/deploy.md`: a versão, a primeira publicação com a 0.1.5 (seção 4), o rollback da 0.1.5 (seção 6)
    e o alerta do Sentry (seção 9).

Não houve `.skip`, `.only` ou `.todo` novo, nem asserção afrouxada. A A-02, o C-11, o C-21, o C-22, o C-25, o C-36 e o
axe continuam sem exceção. O `retryLimit` e o `singletonKey` da fila do aviso não mudaram.

### Verificações desta versão

- `pnpm test`: 194 arquivos, 3.811 de 3.811 (`04-qa-automacao.md`).
- `pnpm lint` e `pnpm typecheck` limpos.
- `pnpm test:e2e`, contra o build de produção: 143 de 143, sem teste pulado, três vezes seguidas, cada uma com banco
  novo. A contagem foi reiniciada depois da correção do teste instável da fila (`04-qa-automacao.md`).
- Testes que reproduzem os defeitos da `01-qa-funcional.md`: o RSK v2 criado depois de agendar a consolidação do v1
  (resumo enviado e citação do v1, DEC desatualizado, aprovação barrada), as variantes durante a chamada ao provedor
  (RSK v2 e ESP v2), a recusa em `entregue` e `encerrada` pela pessoa e pelo agente, o 4xx definitivo pelo handler e
  pelo pg-boss real, e quatro execuções simultâneas do erro inesperado terminando em exatamente 3 tentativas.
- Revisão de código e de segurança (`04-maestro.md`): nenhum achado crítico, alto ou médio; seis baixos (abaixo).
- `docker build` local: imagem de 1,73 GB em disco e 425 MB de conteúdo, praticamente igual à 0.1.4, nada publicado
  (`05-devops-sre.md`).
- A homologação (`construir.mjs homologar`), o ensaio de rollback (`construir.mjs ensaiar-rollback`) e o CI do PR ficam
  para a Parada 3.

### Pendências abertas

Da revisão deste pedido (`04-maestro.md`), baixos, para um pedido seguinte:

- **B-1:** a regra de que `especificacaoId` e `parecerRiscoId` só vêm do worker está garantida pelo código de hoje e
  por comentário (`src/modules/pacotes-decisao/criar.ts:79-81`). Falta um teste estático de que nada em `src/app/`
  passa esses extras. A leitura filtra pela demanda de qualquer forma.
- **B-2:** erro depois de o e-mail ter saído (falha ao gravar `enviado` ou no commit) conta tentativa e tenta de novo.
  A chave de idempotência `dec-<id>` segura o reenvio, mas, depois de três erros assim, o aviso termina `falhou` com o
  e-mail entregue. Já acontecia antes.
- **B-3:** `STATUS_FINAIS` é exportado e usado só nos testes.
- **B-4:** quem filtra ou pagina a fila antes de o React assumir a lista inicial pode ficar sem o foco no resultado
  (`src/app/(painel)/demandas/FiltrosFila.tsx`, WCAG 2.4.3). O e2e agora espera a página ficar pronta; o defeito é do
  produto.
- **B-5:** o motivo `demanda_final` não tem rótulo em `MOTIVO_IGNORADO` (`src/components/rotulos.ts:163`). O histórico
  mostra só "Agente X não rodou", sem o motivo. O texto é decisão da `ux-ui-design`.
- **B-6:** três comentários de cabeçalho passam de 120 colunas (`especificacoes/servico.ts:3`,
  `pareceres-risco/servico.ts:3`, `pacotes-decisao/criar.ts:4`).

Registradas nas outras etapas deste pedido, fora do escopo dele:

- **Decidir e gerar o Pedido em demanda `encerrada`** (`02-tech-lead.md`, novo médio à parte): `registrarDecisao`
  (`src/modules/pacotes-decisao/decidir.ts`) e `gerarPedido` (`src/modules/pedido-construcao/gerar.ts`) não conferem o
  status da demanda. Um DEC pendente de uma demanda levada a `encerrada` à mão ainda pode ser aprovado e gerar Pedido.
  Isso é o que sobra da N-04 da 0.1.3: criar DEC numa demanda Encerrada passou a dar 409, mas arquivar ainda é aceito,
  e o alerta continua dizendo "A demanda foi para Encerrada." quando ela já estava. Fechada na 0.1.6 (M-08).
- **Ações de nova ESP, RSK ou DEC em demanda final** (`02-tech-lead.md`, para a `ux-ui-design`): a tela de detalhe pode
  continuar mostrando essas ações; a pessoa recebe a mensagem fixa do 409. Esconder a ação é decisão de interface.
- **409 e 408 do Resend** (`04-qa-automacao.md`, a confirmar pelo `tech-lead`): pela regra nova, todo 4xx que não é 429
  falha na hora. Se o Resend responder 409 a uma requisição concorrente com a mesma `Idempotency-Key`, ou 408, esse caso
  passageiro deixa de ser tentado de novo. Fechada na 0.1.6.
- **Versões do Next e do Better Auth** (`05-devops-sre.md`): o build usa next 16.4.1 e better-auth 1.7.7, acima da
  referência do padrão técnico (16.3.8 e 1.7.6). Vem da 0.1.0 (correção S-01); falta ADR ou a atualização do padrão.
- **Médio do reteste da 0.1.0** (demanda sem saída com DEC aprovado e versão nova): continua aberto. A recusa da 0.1.5
  vale só para status final, não para demanda com DEC aprovado.

Da entrega (`05-devops-sre.md`), para Fabiano:

- **Segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER`.** Ainda não existem no GitHub. Até existirem:
  - todo push na `main` publica a imagem no GHCR (`:<sha>`, `:v0.1.5`, `:latest`) e fica vermelho no passo "Disparar o
    Easypanel", sem deploy;
  - a limpeza das versões antigas do GHCR não roda, e o pacote acumula mais de 2 versões.

  O merge da 0.1.5 cai nesse caso. Antes de qualquer passo, tire um snapshot da VPS no hPanel.
- **Primeira publicação de verdade** pela seção 4 do `docs/operacao/deploy.md`, com a `:latest`, que depois do merge é
  a 0.1.5, e as mesmas 7 migrations da 0.1.0. A 0.1.5 não traz migration: a seção 5 (backup → migrate → deploy) não se
  aplica a ela.
- **Rollback da 0.1.5** pelo caminho A (só trocar a imagem de `worker` e `app`, sem restaurar backup), para
  `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:cf36ec5fe634ec27004817e30f656d92a80eb23d` (a `v0.1.4`, merge
  do PR #6). Antes de voltar, confirme a tag em Packages: o `devops-sre` não conferiu o GHCR. Na cadeia curta a volta
  não foi ensaiada: o ensaio é o `ensaiar-rollback` da Parada 3.
- **Mudança que a operação vê no Sentry:** o alerta "erro novo no Sentry" (seção 9 do `deploy.md`) passa a receber
  `aviso_email_falhou` também no 4xx definitivo e no erro inesperado; `aviso_erro_inesperado` fica só para o banco fora.
  Nenhuma das três mudanças pede ação no painel.
- **Conferência do `.env.example` sem grep nesta versão.** O diff não acrescenta nem remove leitura de `process.env`;
  a conferência se apoia nesse diff vazio e no grep do pedido 0003. Nenhuma variável nova.
- Continuam de antes, sem mudança neste pedido: as actions por SHA e a imagem de cerca de 1,7 GB por causa do `tsx`
  (seção 10 do `deploy.md`).
- A imagem local `ws-orquestrador-demandas:local` (1,73 GB, agora a da 0.1.5) ficou no Docker da VPS. Apagá-la depende
  de confirmação de Fabiano.

Continuam abertas, sem mudança: os médios M-04 a M-07 da 0.1.0, as pendências da 0.1.4 (B-1, B-2 e o Prettier fora do
CI), as da 0.1.2 registradas nas outras etapas (limite do C-36 em execuções repetidas, teste C-13 sensível a CPU, login
TOTP em falhas em sequência, buscadores do seed nas outras specs) e as da 0.1.0 (seções abaixo).

## 0.1.4 — 2026-11-02

Correção do pedido `DEC-DEM-20261102-0005-v1` (cadeia curta, tipo bug), sobre a `main` da 0.1.3 (`00a924e`). Ainda
não foi publicada: o merge, a publicação e a configuração no Easypanel são de Fabiano.

**Nenhum comportamento do sistema muda.** Mudaram só `e2e/decisao.spec.ts`, a conferência da versão em
`test/estatico/projeto.test.ts`, o campo `version` do `package.json`, e entrou o teste novo
`test/estatico/decisao-e2e.test.ts`. Não mudaram `src/`, `scripts/`, `drizzle/`, `.github/`, `Dockerfile`,
`playwright.config.ts` nem `e2e/apoio.ts`. Não há migration nova nem variável de ambiente nova. O axe não achou
violação na tela arquivada, então a tela não precisou de correção. A imagem só difere da 0.1.3 no `package.json`:
`e2e/` e `test/` não entram nela.

Fecha as duas pendências da revisão da 0.1.3 (seção abaixo): a B-1 estética do cabeçalho da `decisao.spec.ts` e o
estado arquivado sem axe.

### O que mudou

- **O teste "Arquivar" passa pelo axe na tela arquivada** (`e2e/decisao.spec.ts:348`). Depois do alerta "Pacote
  arquivado. A demanda foi para Encerrada." e das conferências `statusDecisao` `arquivada` e status `encerrada`, ele
  chama `semViolacoes(page, 'T11 arquivado')` (`:366`). A chamada é a mesma dos outros estados, sem regra desligada nem
  elemento excluído. A pré-condição (`exigeBancoRecemSemeado(ORIGENS_DO_FLUXO.includes(status), ...)`) e as
  conferências de status antes e depois de arquivar continuam iguais às da 0.1.3. Com isso, uma violação de
  acessibilidade na tela arquivada passa a reprovar o CI.
- **Comentário do cabeçalho da `decisao.spec.ts`** (`:1-28`): a quebra das linhas foi refeita, sem linha órfã e com no
  máximo 120 caracteres por linha (antes, as linhas 1, 3, 6 e 20 passavam disso, e a linha 7 tinha só "(08-correcao,
  A-04: o nível"). A frase do axe passou a listar todos os estados que têm axe: pendente (com e sem rascunho de agente),
  com erro, com o diálogo aberto, sem formulário, com o conflito da A-02, desatualizado e decidido (aprovado, aprovado
  nas duas contas, devolvido e arquivado). No diff, só mudaram linhas que começam com `//`.
- **Teste novo `test/estatico/decisao-e2e.test.ts`** (14 testes, só leitura de arquivo, sem banco nem relógio). Roda no
  `pnpm test` e confere:
  - que o cabeçalho da `decisao.spec.ts` não tem linha acima de 120 caracteres nem linha órfã, e que a frase do axe cita
    o arquivado;
  - que o "Arquivar" chama `semViolacoes(page, 'T11 arquivado')` uma vez, depois do alerta e das três conferências de
    status, sem navegação no meio, com a pré-condição e as conferências da 0.1.3;
  - que a spec só pula pela pré-condição, com mensagem;
  - que nenhum arquivo `e2e/**/*.ts` usa `disableRules`, `disableOtherRules`, `exclude`, `include`, `withRules` ou
    `options` do axe, e que só `e2e/apoio.ts` monta o `AxeBuilder`, com `TAGS_AXE`.
- **Versão:** o `package.json` passou de 0.1.3 para 0.1.4, e `test/estatico/projeto.test.ts` confere a versão nova.
- **Documentação:**
  - estas notas;
  - a versão no `README.md` e no manual técnico, e o teste estático do axe no cap. 08 do manual;
  - em `docs/operacao/deploy.md`: a versão, a primeira publicação com a 0.1.4 (seção 4) e o rollback da 0.1.4
    (seção 6).

Não houve `.skip`, `.only`, `.fixme` ou `.todo` novo, nem asserção afrouxada. O axe (`semViolacoes` e `TAGS_AXE`), o
C-36 e a A-02 ficaram iguais, e `retries`, `workers` e `fullyParallel` não mudaram.

### Verificações desta versão

- `pnpm test`: 193 arquivos, 3.711 de 3.711, com os 14 testes novos (`04-qa-automacao.md`).
- `pnpm lint` e `pnpm typecheck` limpos.
- `pnpm test:e2e`, contra o build de produção: 143 de 143, sem teste pulado, três vezes seguidas, cada uma com banco
  novo. Nas três, o "Arquivar" aparece aprovado, e não pulado (`04-qa-automacao.md`).
- `e2e/decisao.spec.ts --repeat-each=3` num banco só, sem `CI`: 19 passaram, 8 pulados e nenhuma falha. A 1.ª
  repetição passa os 9 testes, o "Arquivar" com o axe do arquivado incluído; a 2.ª e a 3.ª passam 5 (C-14, M-01, P1-b,
  A-02 e o de 404 e sessão) e pulam 4 ("nível cto: aprovar A", "dupla aprovação", "CA-12.4" e "Arquivar"). O reporter
  JSON mostrou a mensagem `exige banco recém-semeado: ...` em cada pulo.
- Controle negativo do axe, temporário e desfeito: com um `<img>` sem `alt` injetado na tela arquivada, o "Arquivar"
  reprovou com `axe em T11 arquivado`, regra `image-alt`. Sem a linha `semViolacoes` nova, o teste estático reprovou.
- Largura do cabeçalho: a linha mais longa tem 120 caracteres, medida pelo teste estático e conferida com `awk` na
  revisão (`04-maestro.md`).
- Revisão de código e de segurança (`04-maestro.md`): nenhum achado crítico, alto ou médio; dois baixos (abaixo).
- `docker build` local: imagem de 1,74 GB em disco e 425 MB de conteúdo, praticamente igual à 0.1.3, nada publicado
  (`05-devops-sre.md`).
- A homologação (`construir.mjs homologar`), o ensaio de rollback (`construir.mjs ensaiar-rollback`) e o CI do PR ficam
  para a Parada 3.

### Pendências abertas

Da revisão deste pedido (`04-maestro.md`), em testes e sem efeito no sistema:

- **B-1 (baixo), para quem mexer em `test/estatico/decisao-e2e.test.ts` ou em `e2e/apoio.ts`.** A trava "nenhum e2e
  desliga o axe" (`test/estatico/decisao-e2e.test.ts:186` e `:193-199`) não pega um `r.violations.filter(...)` posto em
  `e2e/apoio.ts` antes do `map`, e a varredura `e2e/**/*.ts` não olha `.tsx`, `.js` nem `.mjs`. Nada foi afrouxado
  neste pedido: é um limite do teste novo.
- **B-2 (baixo), para quem refatorar `e2e/decisao.spec.ts` ou `e2e/apoio.ts`.** O teste estático
  (`test/estatico/decisao-e2e.test.ts:144-150` e `:196-198`) confere trechos exatos do código desses arquivos (a linha
  de `ORIGENS_DO_FLUXO`, o `if (process.env.CI)`, o `new AxeBuilder`). Uma refatoração legítima reprova o teste e exige
  atualizá-lo junto. É de propósito: mudar esses controles exige decisão explícita.
- **Prettier fora do CI.** O `prettier --check` acusa 548 arquivos da `main`, inclusive os desta versão. O Prettier não
  está no CI nem no `pnpm lint`. Se o time quiser, cabe num pedido próprio.
- Para Fabiano: continuam as pendências da primeira publicação registradas nos PR #1 a #5 (abaixo).

Da entrega (`05-devops-sre.md`), para Fabiano:

- **Segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER`.** Ainda não existem no GitHub. Até existirem:
  - todo push na `main` publica a imagem no GHCR (`:<sha>`, `:v0.1.4`, `:latest`) e fica vermelho no passo "Disparar o
    Easypanel", sem deploy;
  - a limpeza das versões antigas do GHCR não roda, e o pacote acumula mais de 2 versões.

  O merge da 0.1.4 cai nesse caso. Antes de qualquer passo, tire um snapshot da VPS no hPanel.
- **Primeira publicação de verdade** pela seção 4 do `docs/operacao/deploy.md`, com a `:latest`, que depois do merge é
  a 0.1.4, e as mesmas 7 migrations da 0.1.0. A 0.1.4 não traz migration: a seção 5 (backup → migrate → deploy) não se
  aplica a ela.
- **Rollback da 0.1.4** pelo caminho A (só trocar a imagem de `worker` e `app`, sem restaurar backup), para
  `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:00a924ec746d731c9c0c9fb9a95bcf4c6d7f3c17` (a `v0.1.3`, merge
  do PR #5). Antes de voltar, confirme a tag em Packages: o `devops-sre` não conferiu o GHCR. Na cadeia curta a volta
  não foi ensaiada: o ensaio é o `ensaiar-rollback` da Parada 3.
- **Conferência do `.env.example` sem grep nesta versão.** Como `src/` não mudou, ela se apoia no diff vazio e na
  conferência com grep da 0.1.2. Nenhuma variável nova.
- Continuam de antes, sem mudança neste pedido: as actions por SHA e a imagem de cerca de 1,7 GB por causa do `tsx`
  (seção 10 do `deploy.md`).
- A imagem local `ws-orquestrador-demandas:local` (1,74 GB, agora a da 0.1.4) ficou no Docker da VPS. Apagá-la depende
  de confirmação de Fabiano.

Continuam abertas, sem mudança: a N-04 da 0.1.3 (a API aceita criar e arquivar DEC numa demanda Encerrada, e o alerta
diz "A demanda foi para Encerrada." mesmo quando ela já estava), as pendências da 0.1.2 registradas nas outras etapas
(limite do C-36 em execuções repetidas, teste C-13 sensível a CPU, login TOTP em falhas em sequência, buscadores do
seed nas outras specs) e as da 0.1.0 (seções abaixo).

## 0.1.3 — 2026-11-02

Correção do pedido `DEC-DEM-20261102-0004-v1` (cadeia curta, tipo bug), sobre a `main` da 0.1.2 (`b8a8c44`). Ainda
não foi publicada: o merge, a publicação e a configuração no Easypanel são de Fabiano.

**Nenhum comportamento do sistema muda.** Mudaram só `e2e/decisao.spec.ts`, a conferência da versão em
`test/estatico/projeto.test.ts` e o campo `version` do `package.json`. Não mudaram `src/`, `scripts/`, `drizzle/`,
`.github/`, `Dockerfile`, `playwright.config.ts`, `e2e/apoio.ts`, `e2e/preparacao.ts` nem a função
`exigeBancoRecemSemeado`. Não há migration nova nem variável de ambiente nova. A imagem só difere da 0.1.2 no
`package.json`: `e2e/` e `test/` não entram nela.

Fecha a B-01 da revisão da 0.1.2 (seção abaixo): o "Arquivar" aceitava a demanda já `encerrada` e passava sem provar a
mudança de status.

### O que mudou

- **O teste "Arquivar" prova a mudança para Encerrada também fora do CI** (`e2e/decisao.spec.ts:346`, título
  `Arquivar → "Pacote arquivado. A demanda foi para Encerrada."`, sem o "; 404 e sem sessão" de antes).
  - A pré-condição (`:353`) aceita só a partida de um status de `ORIGENS_DO_FLUXO` (`nova`, `em_analise`,
    `aguardando_informacao`, `pronta_para_decisao`), a origem da transição `decisao_arquivada`. `encerrada` deixou de ser
    aceita: dela, arquivar grava a decisão mas não muda o status.
  - Com a demanda já `encerrada` e sem a variável `CI`, o teste é pulado com a mensagem
    `exige banco recém-semeado: a demanda <DEM-id> está encerrada, e o arquivamento não prova a mudança para Encerrada`.
    Com `CI` (GitHub Actions e `construir.mjs homologar`), a mesma pré-condição falsa **reprova** o teste.
  - O teste confere o status antes e depois de arquivar: `pronta_para_decisao` depois do DEC novo e antes de arquivar
    (`:357`), `statusDecisao` `arquivada` no DEC (`:362`) e `encerrada` na demanda (`:363`). O alerta "Pacote arquivado.
    A demanda foi para Encerrada." é texto fixo e não serve de prova sozinho.
- **Teste novo de 404 e sessão, separado do "Arquivar"** (`e2e/decisao.spec.ts:367`,
  `404 para DEC inexistente, id de outro tipo e caminho inválido; sem sessão, a decisão vai para /entrar`). As
  conferências que estavam no fim do "Arquivar" (três caminhos com 404 e o redirecionamento para `/entrar` sem sessão)
  foram para ele, sem perder nenhuma. Não tem pré-condição nem POST e roda em qualquer banco, inclusive quando o
  "Arquivar" é pulado numa execução repetida. A sessão usa o DEC de rascunho de agente do seed, e o 404 usa a versão
  seguinte à mais nova, lida no próprio teste.
- **Comentário do cabeçalho da `decisao.spec.ts`:** o "Arquivar" passou para a lista dos testes que exigem banco
  recém-semeado, e o de 404 e sessão foi para a dos que rodam em qualquer banco.
- **Versão:** o `package.json` passou de 0.1.2 para 0.1.3, e `test/estatico/projeto.test.ts` confere a versão nova.
- **Documentação:**
  - estas notas;
  - a versão no `README.md` e no manual técnico;
  - em `docs/operacao/deploy.md`: a versão, a primeira publicação com a 0.1.3 (seção 4) e o rollback da 0.1.3
    (seção 6).

Não houve `.skip`, `.only`, `.fixme` ou `.todo` novo, nem asserção afrouxada. O axe (`semViolacoes`), o C-36 e a A-02
ficaram iguais, e `retries`, `workers` e `fullyParallel` não mudaram.

### Verificações desta versão

- `pnpm test`: 192 arquivos, 3.697 de 3.697 (`03-engenheiro-frontend.md` e `04-qa-automacao.md`).
- `pnpm lint` e `pnpm typecheck` limpos.
- `pnpm test:e2e`, contra o build de produção: 143 de 143, sem teste pulado, três vezes seguidas, cada uma com banco
  novo (`04-qa-automacao.md`).
- `e2e/decisao.spec.ts --repeat-each=3` num banco só, sem `CI`: 19 passaram, 8 pulados com a mensagem
  `exige banco recém-semeado: ...` e nenhuma falha. A 1.ª repetição passa os 9 testes; a 2.ª e a 3.ª passam 5 (C-14,
  M-01, P1-b, A-02 e o de 404 e sessão) e pulam 4 ("nível cto: aprovar A", "dupla aprovação", "CA-12.4" e
  "Arquivar").
- Reprodução do defeito, `--grep "Arquivar" --repeat-each=2`: com as conferências novas e a pré-condição antiga, a 2.ª
  repetição falhou em "antes de arquivar" (esperado `pronta_para_decisao`, recebido `encerrada`); com a correção, ela é
  pulada com a mensagem (`03-engenheiro-frontend.md`).
- Revisão de código e de segurança (`04-maestro.md`): nenhum achado crítico, alto ou médio.
- `docker build` local: imagem de 1,73 GB em disco e 425 MB de conteúdo, igual à 0.1.2, nada publicado
  (`05-devops-sre.md`).
- O ramo com `CI` do "Arquivar" foi provado pela leitura: a prova executada fica com o `construir.mjs homologar` (que
  passa `CI`) e com o CI do PR, na Parada 3. A homologação e o ensaio de rollback (`construir.mjs ensaiar-rollback`)
  também ficam para a Parada 3.

### Pendências abertas

Da revisão deste pedido (`04-maestro.md`), em testes e sem efeito no sistema:

- **B-1 (baixo, estético), para quem mexer na `decisao.spec.ts` da próxima vez.** No comentário de cabeçalho
  (`e2e/decisao.spec.ts:6-8`), a quebra de linha deixou "(08-correcao, A-04: o nível" sozinho numa linha.
- **Axe no estado "arquivado" (observação, não é achado deste pedido).** O cabeçalho da `decisao.spec.ts` diz que o axe
  roda nos estados pendente, desatualizado, com erro e decidido, mas o estado arquivado não tem `semViolacoes`. Já era
  assim na 0.1.2. Se o time quiser cobrir, cabe num pedido próprio.
- Para Fabiano: continuam as pendências da primeira publicação registradas nos PR #1 a #3 (abaixo).

Da entrega (`05-devops-sre.md`), para Fabiano:

- **Segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER`.** Ainda não existem no GitHub. Até existirem:
  - todo push na `main` publica a imagem no GHCR (`:<sha>`, `:v0.1.3`, `:latest`) e fica vermelho no passo "Disparar o
    Easypanel", sem deploy;
  - a limpeza das versões antigas do GHCR não roda, e o pacote acumula mais de 2 versões.

  O merge da 0.1.3 cai nesse caso. Antes de qualquer passo, tire um snapshot da VPS no hPanel.
- **Primeira publicação de verdade** pela seção 4 do `docs/operacao/deploy.md`, com a `:latest`, que depois do merge é
  a 0.1.3, e as mesmas 7 migrations da 0.1.0. A 0.1.3 não traz migration: a seção 5 (backup → migrate → deploy) não se
  aplica a ela.
- **Rollback da 0.1.3** pelo caminho A (só trocar a imagem de `worker` e `app`, sem restaurar backup), para
  `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:b8a8c4457dc0603ffb2fc30418cfe906d6684131` (a `v0.1.2`, merge
  do PR #4). Se essa tag não estiver em Packages, a alternativa com o mesmo código é a do merge do PR #3
  (`01a26a8321a1bd630c6bb1f70a8b68bfa5bd775f`). Antes de voltar, confirme a tag em Packages: o `devops-sre` não
  conferiu o GHCR. Na cadeia curta a volta não foi ensaiada: o ensaio é o `ensaiar-rollback` da Parada 3.
- **Conferência do `.env.example` sem grep nesta versão.** Como `src/` não mudou, ela se apoia no diff vazio e na
  conferência com grep da 0.1.2. Nenhuma variável nova.
- Continuam de antes, sem mudança neste pedido: as actions por SHA e a imagem de cerca de 1,7 GB por causa do `tsx`
  (seção 10 do `deploy.md`).
- A imagem local `ws-orquestrador-demandas:local` (1,73 GB, agora a da 0.1.3) ficou no Docker da VPS. Apagá-la depende
  de confirmação de Fabiano.

Registrada nas outras etapas deste pedido, fora do escopo dele:

- **N-04, observação de produto** (`01-qa-funcional.md`, `02-tech-lead.md`, `04-qa-automacao.md`): a API aceita criar e
  arquivar DEC numa demanda Encerrada, e o alerta diz "A demanda foi para Encerrada." mesmo quando ela já estava. Fica
  para uma demanda própria, se Fabiano quiser, com o `analista-requisitos`.

Continuam abertas, sem mudança, as pendências da 0.1.2 registradas nas outras etapas (limite do C-36 em execuções
repetidas, teste C-13 sensível a CPU, login TOTP em falhas em sequência, buscadores do seed nas outras specs) e as da
0.1.0 (seção abaixo).

## 0.1.2 — 2026-11-02

Correção do pedido `DEC-DEM-20261102-0003-v1` (cadeia curta, tipo bug), sobre a `main` da 0.1.1 (`30b71b5`). Ainda
não foi publicada: o merge, a publicação e a configuração no Easypanel são de Fabiano.

**Nenhum comportamento do sistema muda.** Mudaram só os testes e2e, o comentário do topo do `playwright.config.ts`, a
conferência da versão em `test/estatico/projeto.test.ts` e o campo `version` do `package.json`. Não mudaram `src/`,
`scripts/`, `drizzle/`, `.github/`, `Dockerfile`, `e2e/servidor.ts` nem nenhuma linha de configuração do Playwright
(`workers: 1`, `retries: 0`, `fullyParallel: false`, `forbidOnly`, `webServer`). Não há migration nova nem variável de
ambiente nova. A imagem só difere da 0.1.1 no `package.json`: `e2e/`, `test/` e `playwright.config.ts` não entram nela.

Fecha as pendências M-01, B-01 e B-02 de teste registradas na 0.1.1 (seção abaixo).

### O que mudou

- **M-01: a preparação da demanda da `decisao.spec.ts` completa uma falha parcial.** Antes, ela olhava só se a demanda
  tinha ESP e, se não tinha, criava a ESP e o RSK juntos. Se o RSK falhasse depois de a ESP gravar, as execuções
  seguintes pulavam o RSK, e os testes de decisão recebiam 400 `Faltam itens para o pacote.` até um seed novo. Agora a
  função `prepararEspERsk` (`e2e/preparacao.ts`, arquivo novo) confere a lista de ESP e a de RSK separadamente e cria só
  o que falta, primeiro a ESP. A falha de uma criação não é engolida: o teste reprova, e a chamada seguinte completa o
  que ficou faltando, sem versão a mais. A dupla aprovação usa a mesma preparação.
- **B-01: o duplo clique e a T07 não supõem mais `v1`** (`e2e/parecer-risco-qa.spec.ts`). Os dois leem a lista de RSK
  ou de ESP antes de agir e calculam o id esperado com `proximoId` (`e2e/preparacao.ts`): a versão mais nova mais 1, pelo
  número. O id vai no botão `Gravar`, com nome exato (sem isso, `-v1` casaria com `-v10`), na URL, no alerta e no corpo
  da Server Action. Depois de agir, a lista tem de ser exatamente a versão nova na frente e as antigas na mesma ordem. A
  T07 lê o `escopoInclui` da versão de id esperado, e não da primeira da lista. O sentinela do duplo clique passou a ser
  gerado em cada execução.
- **B-01: a `decisao.spec.ts` confere o estado de partida antes de agir.** "nível cto: aprovar A", "dupla aprovação" e
  "CA-12.4" precisam de uma demanda sem DEC aprovado ou num status de onde o fluxo ainda anda (`nova`, `em_analise`,
  `aguardando_informacao`, `pronta_para_decisao`). A conferência roda depois das leituras e antes de qualquer criação:
  - sem a variável `CI`, o teste é pulado com a mensagem `exige banco recém-semeado: <motivo>`;
  - com `CI` (GitHub Actions e `construir.mjs homologar`), a pré-condição falsa **reprova** o teste. Nesses ambientes o
    banco é sempre novo, e a pré-condição falsa ali é defeito.

  O teste pulado não gasta o limite do C-36 nem deixa estado no banco. Não há `return` silencioso, `test.skip` sem
  condição nem exceção à A-02 ou ao C-36.
- **Teste novo da A-02** em `e2e/decisao.spec.ts`, que roda em qualquer banco: com um DEC aprovado na demanda, aprovar
  outro mostra `Não foi possível concluir: outro pacote desta demanda já está aprovado.`, o pacote novo continua
  `pendente` e a demanda tem exatamente um DEC `aprovada`. O axe roda também nesse estado da T11.
- **Teste novo da M-01** em `e2e/decisao.spec.ts`: chama a preparação duas vezes contra o banco e confere que a lista
  vazia ganha só a v1 e a que já tinha versão fica igual.
- **`e2e/preparacao.spec.ts`, arquivo novo:** 12 testes sem navegador e sem API, com falsos, para `prepararEspERsk`
  (inclusive a falha parcial e a falha que se propaga), `procurarEmPaginas` e `proximoId`.
- **Busca no seed com paginação.** `demandaDoSeed` (`e2e/apoio.ts`) e a busca do DEC de rascunho de agente da
  `decisao.spec.ts` percorrem as páginas de 100 com `offset` até achar o item ou chegar ao total. Antes, liam só a
  primeira página.
- **Versão do 404 calculada.** O teste "Arquivar" usava `DEC-<demanda>-v9` como versão inexistente, que passa a existir
  na 3.ª execução contra o mesmo banco. Agora usa a versão seguinte à mais nova, lida logo antes.
- **Comentário do `playwright.config.ts`** (linhas 4-9): descreve as duas fontes de dado do e2e, o seed fictício e a API
  pela sessão da página. Diz também que as demandas do seed acumulam versões e decisões entre execuções contra o mesmo
  banco, e que o teste que precisa de banco recém-semeado diz isso ao ser pulado.
- **Versão:** o `package.json` passou de 0.1.1 para 0.1.2, e `test/estatico/projeto.test.ts` confere a versão nova.
- **Documentação:**
  - estas notas;
  - a versão no `README.md` e no manual técnico, e no `README.md` o que acontece ao rodar o e2e de novo contra o mesmo
    banco;
  - em `docs/operacao/deploy.md`: a versão, a primeira publicação com a 0.1.2 (seção 4) e o rollback da 0.1.2
    (seção 6).

### Verificações desta versão

- `pnpm test`: 192 arquivos, 3.697 de 3.697 (`03-engenheiro-frontend.md` e `04-qa-automacao.md`).
- `pnpm lint` e `pnpm typecheck` limpos.
- `pnpm test:e2e`, contra o build de produção: 142 de 142, sem teste pulado, três vezes seguidas, cada uma com banco
  novo (`04-qa-automacao.md`).
- As três specs do achado com `--repeat-each=3` num banco só: 75 passaram, 6 pulados com a mensagem
  `exige banco recém-semeado: ...` (só "aprovar A", "dupla aprovação" e "CA-12.4", na 2.ª e na 3.ª repetição) e nenhuma
  falha.
- Rodada com a M-01 forçada pelo estado (só a ESP gravada, sem o RSK): passou com a correção e falhou com a guarda
  antiga (`04-qa-automacao.md`).
- `docker build` local: imagem de 1,73 GB em disco e 425 MB de conteúdo, igual à 0.1.1, nada publicado
  (`05-devops-sre.md`).
- A homologação (`construir.mjs homologar`) e o ensaio de rollback (`construir.mjs ensaiar-rollback`) ficam para a
  Parada 3.

### Pendências abertas

Da revisão deste pedido (`04-maestro.md`), em testes e sem efeito no sistema:

- **B-01 desta revisão (baixo), para o `qa-automacao` num pedido seguinte.** Numa execução repetida, o teste "Arquivar"
  (`e2e/decisao.spec.ts:348`) aceita a demanda que já está `encerrada`. Nesse caso, a conferência de que o status passou
  a `encerrada` passa sem provar a mudança. No CI e no `homologar`, com banco novo, a mudança continua provada.
  Sugestão: no CI, exigir só os status de onde o fluxo anda; fora dele, anotar no teste que a mudança de status não foi
  conferida.
- Para Fabiano: continuam as pendências da primeira publicação registradas nos PR #1 e #2 (abaixo).

Da entrega (`05-devops-sre.md`), para Fabiano:

- **Segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER`.** Ainda não existem no GitHub. Até existirem:
  - todo push na `main` publica a imagem no GHCR (`:<sha>`, `:v0.1.2`, `:latest`) e fica vermelho no passo "Disparar o
    Easypanel", sem deploy;
  - a limpeza das versões antigas do GHCR não roda, e o pacote acumula mais de 2 versões.

  O merge da 0.1.2 cai nesse caso. Antes de qualquer passo, tire um snapshot da VPS no hPanel.
- **Primeira publicação de verdade** pela seção 4 do `docs/operacao/deploy.md`, com a `:latest`, que depois do merge é
  a 0.1.2, e as mesmas 7 migrations da 0.1.0.
- **Rollback da 0.1.2** pelo caminho A (só trocar a imagem, sem restaurar backup), para
  `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:30b71b5185cb58d403847b95532e54b5a299e77a` (a `v0.1.1`). Antes
  de voltar, confirme a tag em Packages. Na cadeia curta ele não foi ensaiado: o ensaio é o `ensaiar-rollback` da
  Parada 3.
- Continuam de antes, sem mudança neste pedido: as actions por SHA e a imagem de cerca de 1,7 GB por causa do `tsx`
  (seção 10 do `deploy.md`).
- A imagem local `ws-orquestrador-demandas:local` (1,73 GB, agora a da 0.1.2) ficou no Docker da VPS. Apagá-la depende
  de confirmação de Fabiano.

Registradas nas outras etapas deste pedido, fora do escopo dele:

- **Limite do C-36 em execuções repetidas** (`02-tech-lead.md`, N-02): a suíte e2e **inteira** rodada duas vezes na
  mesma hora contra a mesma homologação recebe 429, porque a conta "cto" cria 27 demandas por execução e o limite é 30
  por hora. É o controle funcionando. Contra a mesma homologação, a 2.ª execução completa só vale com uma hora de
  intervalo.
- **N-04, observação de produto** (`01-qa-funcional.md`, `02-tech-lead.md`): a API cria DEC numa demanda Encerrada, e a
  devolução depois disso mostra "A demanda voltou para Em análise." sem que o status mude. Fica para uma demanda
  própria, se Fabiano quiser, com o `analista-requisitos` (relaciona-se com a M-02 da 0.1.0).
- **Teste C-13 sensível a CPU disputada** (`04-qa-automacao.md`): `src/modules/pacotes-decisao/concorrencia.test.ts:73`
  estourou os 30 s com o `pnpm test` rodando junto do lint e do typecheck, e passou sozinho. Para o `tech-lead` e a
  `qualidade`.
- **Login TOTP em falhas em sequência** (`04-qa-automacao.md`): quando vários testes falham em menos de 1 s, o login da
  conta "cto" na mesma janela do TOTP é recusado (`e2e/apoio.ts:39`), e isso esconde a causa real da falha. Para o
  `tech-lead`, numa demanda própria.
- **Buscadores do seed nas outras specs** (`02-tech-lead.md`, minor): `e2e/axe-todas.spec.ts` e
  `e2e/pedido-construcao.spec.ts` ainda têm busca própria, só na primeira página de 100 (`limit=100`, sem `offset`), e
  podem passar a usar a `demandaDoSeed` de `e2e/apoio.ts`, que pagina.
- **Arquivos de apoio da regressão** (`04-qa-automacao.md`): em `e2e/test-results/`, ignorado pelo git, ficaram o
  reporter auxiliar de contagem e os JSONs das execuções. Não entram em commit; podem ser apagados.

Continuam abertas, sem mudança, as pendências da 0.1.0 (seção abaixo): os médios M-01 a M-07 e o médio novo do
reteste, a leitura do QR com aparelho real, a configuração do pipeline e do Easypanel e as pendências das outras áreas
antes de ligar agente.

## 0.1.1 — 2026-11-02

Correção do pedido `DEC-DEM-20261102-0002-v1` (cadeia curta, tipo bug), sobre a `main` da 0.1.0 (`dd8ddee`). Ainda
não foi publicada: o merge, a publicação e a configuração no Easypanel são de Fabiano.

**Nenhum comportamento do sistema muda.** Mudaram só testes e2e, o seed fictício e a versão. Não mudaram `src/`,
`drizzle/`, `.github/`, `Dockerfile`, `playwright.config.ts` nem `e2e/servidor.ts`. Não há migration nova nem variável de
ambiente nova. A imagem só difere da 0.1.0 no `scripts/seed-ficticio.ts` e no `package.json`.

### O que mudou

- **Três testes e2e instáveis no CI do PR #1** (execução 41249512830, commit `e0f3933`) foram estabilizados, e nenhum
  deles verifica menos do que antes:
  - **`document-title` falso** em "T12 com agente ligado" (`e2e/agentes-teto.spec.ts`) e em "T11 decidido"
    (`e2e/decisao.spec.ts`). Depois de uma Server Action, o Next 16 re-renderiza a página, e o `<title>` chega por
    streaming depois do corpo. O axe rodava nesse intervalo. Agora `semViolacoes` (`e2e/apoio.ts`) espera a página ter
    `<title>` não vazio por até 5 s antes de rodar o axe. Se o título não chegar, o axe roda assim mesmo e reprova pela
    regra `document-title`. As `TAGS_AXE` são as mesmas, e nenhuma regra foi desligada ou filtrada.
  - **429 em "T07 da ESP com a correção da Lista de textos"** (`e2e/parecer-risco-qa.spec.ts`). A conta "cto" fechava a
    suíte com 30 de 30 demandas na hora. Quando um teste da `decisao.spec.ts` falhava, o worker novo do Playwright criava
    a 31ª demanda. Agora a T07, o duplo clique do parecer de risco e a `decisao.spec.ts` usam demandas fictícias do seed,
    pela função nova `demandaDoSeed` (`e2e/apoio.ts`), e não criam demanda pela API. A `decisao.spec.ts` deixou de
    guardar a demanda numa variável do módulo, e um worker novo não cria mais demanda. Com isso, a "cto" fecha a suíte
    com 27 de 30. O limite do C-36 (`conferirLimite`, 30 demandas por hora por ator) não mudou e continua testado em
    `src/modules/limites.test.ts` e `src/app/api/demandas/demandas.bordas.test.ts`.
- **Teste novo `e2e/sem-violacoes.spec.ts`**, em `/configuracao/agentes`, com dois casos:
  - corrida: o `<title>` volta 500 ms depois do corpo. Tem de passar, e antes da correção falhava com `document-title`;
  - controle negativo: uma tela sem `<title>` continua reprovada pela regra `document-title`.
- **Seed fictício** (`scripts/seed-ficticio.ts`): entraram três demandas próprias do e2e, de tipo `melhoria`, em Nova,
  sem versão e criadas pela conta fictícia `sem2fa`:
  - "Demanda da decisão (fictício)";
  - "Duplo clique no parecer de risco (fictício)";
  - "Lista de textos da especificação (fictício)".

  O seed passa de 11 para 14 demandas: 5 da conta `cto` e 9 próprias do e2e (`TITULOS_DO_E2E`). As regras do seed
  continuam as mesmas, inclusive a guarda `SEED_FICTICIO=1` com banco vazio. Os testes estão em `scripts/scripts.test.ts`.
- **Versão:** o `package.json` passou de 0.1.0 para 0.1.1, e o teste estático `test/estatico/projeto.test.ts` confere a
  versão nova.
- **Documentação:**
  - estas notas;
  - a versão no `README.md` e no manual técnico;
  - a verificação do axe no cap. 08 do manual e o seed no cap. 10;
  - em `docs/operacao/deploy.md`: a versão, a primeira publicação com a 0.1.1 (seção 4) e o rollback da 0.1.1 (seção 6).

### Verificações desta versão

- `pnpm test`: 192 arquivos, 3.697 de 3.697 (`03-engenheiro-frontend.md` e `04-qa-automacao.md`).
- `pnpm lint` e `pnpm typecheck` limpos.
- `pnpm test:e2e`, contra o build de produção: 128 testes em 22 arquivos, verde três vezes seguidas, sem mudança de
  código entre as corridas. Houve também uma corrida com uma falha forçada e temporária em `decisao.spec.ts`: só o teste
  forçado falhou, e não houve 429 no fim (`04-qa-automacao.md`).
- `docker build` local: imagem de 1,73 GB em disco e 425 MB de conteúdo, nada publicado (`05-devops-sre.md`).
- A homologação (`construir.mjs homologar`) e o ensaio de rollback (`construir.mjs ensaiar-rollback`) ficam para a
  Parada 3.

### Pendências abertas

Da revisão deste pedido (`04-maestro.md`), em testes e sem efeito no sistema:

- **M-01 deste pedido (médio), para o `qa-automacao` num pedido seguinte.** Em `e2e/decisao.spec.ts:39`, a guarda só
  confere se a demanda já tem ESP. Quando não tem, cria a ESP e o RSK juntos. Se o RSK falhar depois de a ESP ser
  gravada, o próximo worker acha a ESP e pula o RSK, e os testes de aprovar e decidir falham até um seed novo.
  Correção: conferir o RSK à parte.
- **B-01:** o duplo clique, a T07 e a `decisao.spec.ts` só passam com banco recém-semeado. Isso vale no CI e no
  `homologar`, que apaga os volumes. Duas corridas contra a mesma homologação fazem esses testes falharem.
- **B-02:** o comentário de `playwright.config.ts:4` ainda diz "Os dados de cada teste são criados pela API", o que já
  não vale para as demandas do seed. O arquivo está fora do que a etapa de documentação edita, então a correção fica
  para quem pode editar o arquivo.
- **Minor da triagem:**
  - `demandaDaDupla` (`e2e/decisao.spec.ts`) e os buscadores de demanda do seed nas outras specs podem passar a usar
    `demandaDoSeed`;
  - `demandaDoSeed` e `demandaDaDupla` procuram só entre as 100 primeiras demandas `melhoria`. Hoje a suíte usa perto de
    70. Se a suíte crescer, a busca deve filtrar pela API.

Da entrega (`05-devops-sre.md`), para Fabiano:

- **Segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER`.** Ainda não existem no GitHub. Até existirem:
  - todo push na `main` publica a imagem no GHCR (`:<sha>`, `:v0.1.1`, `:latest`) e fica vermelho no passo "Disparar o
    Easypanel", sem deploy;
  - a limpeza das versões antigas do GHCR não roda, e o pacote acumula mais de 2 versões.

  O merge da 0.1.1 cai nesse caso. Antes de qualquer passo, tire um snapshot da VPS no hPanel.
- **Primeira publicação de verdade** pela seção 4 do `docs/operacao/deploy.md`, com a `:latest`, que depois do merge é
  a 0.1.1, e as mesmas 7 migrations da 0.1.0.
- **Rollback da 0.1.1** pelo caminho A (só trocar a imagem, sem restaurar backup), para
  `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:dd8ddee6d8a30cda8dff0f1a45f0abe30db8f364` (a `v0.1.0`). Na
  cadeia curta ele não foi ensaiado: o ensaio é o `ensaiar-rollback` da Parada 3.
- Continuam de antes, sem mudança neste pedido: as actions por SHA e a imagem de cerca de 1,7 GB por causa do `tsx`
  (seção 10 do `deploy.md`).
- A imagem local `ws-orquestrador-demandas:local` (1,73 GB) ficou no Docker da VPS. Apagá-la depende de confirmação de
  Fabiano.

Continuam abertas, sem mudança, as pendências da 0.1.0 (seção abaixo):

- os médios M-01 a M-07 e o médio novo do reteste;
- a leitura do QR com aparelho real;
- a configuração do pipeline e do Easypanel;
- as pendências das outras áreas antes de ligar agente.

## 0.1.0 — 2026-10-31

Primeira versão, construída pelo `/construir` a partir do pedido `DEC-DEM-20261022-0001-v1` (spec aprovada na
Parada 1 em `docs/superpowers/specs/2026-10-25-ws-orquestrador-demandas-design.md`). Ainda não foi publicada: o merge
na `main`, o deploy e a configuração no Easypanel são de Fabiano.

### O que entrou

- **Entrada de demanda** pelo painel (colando o texto recebido) e pela API, com id `DEM-AAAAMMDD-NNNN` de sequência
  global. O texto bruto fica em tabela própria, só uma pessoa o lê, e um job diário o expurga depois de 90 dias
  (configurável de 1 a 365).
- **ESP, RSK e DEC em versões imutáveis.** O papel da aplicação só tem `SELECT` e `INSERT` nessas tabelas. DEC sem
  ESP ou sem RSK é recusado com a lista do que falta. DEC com ESP ou RSK mais nova fica marcado como desatualizado e
  não pode ser aprovado.
- **Decisão só por pessoa com 2FA**: aprovar com a opção A ou B, devolver ou arquivar. No nível
  `cto_e_administradora`, a aprovação só vale com as duas aprovações na mesma opção, e a da administradora exige a
  referência ao documento assinado. Só o DEC mais novo da demanda pode ser decidido, e nunca dois aprovados.
- **Pedido de Construção** gerado de DEC aprovado e atualizado, validado pela cópia do `validarPedido` do
  `/construir`, idêntico byte a byte para o mesmo DEC, para baixar e copiar à mão. Tipo `estudo` não gera pedido.
  Pedido com e-mail, telefone ou CPF é recusado.
- **Status da demanda** em nove valores, com tabela fechada de transições; quatro automáticas e o resto manual. Dúvida
  em aberto leva a `aguardando_informacao`, sem mensagem ao solicitante.
- **Histórico** só de inclusão, com pessoa, agente ou sistema, sem texto livre de terceiro.
- **Quatro agentes de IA** (orquestrador, insumo técnico, risco, consolidação) como jobs do pg-boss, com saída
  validada pelo mesmo schema da API, execução única, 3 tentativas, uso e custo por chamada, teto mensal em US$ que
  suspende os agentes e minimização do que vai ao provedor. **Nascem desligados, com teto 0 e sem chave de API.** O
  DEC de agente nasce sempre com dupla aprovação.
- **Aviso por e-mail** (Resend) de DEC pronto, uma vez por DEC, só com ids e link. Sem chave, não envia.
- **Acesso**: login com senha e TOTP obrigatório, sem cadastro público, sessão de 8 h, limite de login por IP e
  bloqueio da verificação por conta; tokens de serviço por agente, só por Bearer, guardados como hash; matriz de
  acesso com teste de acesso negado em toda rota.
- **Painel em pt-BR** com 12 telas, axe sem violação em cada uma.
- **Operação**: `Dockerfile` multiestágio, CI (`lint`, `typecheck`, `test`, `test:e2e`, `pnpm audit --prod
  --audit-level high`, gitleaks, `docker build`), `deploy.yml` para o GHCR e os webhooks do Easypanel (só sem
  migration nova), homologação local por `docker-compose.hml.yml`, `GET /api/saude` que confere a última migration,
  rollback descrito em `docs/operacao/deploy.md`.
- **Documentação**: `README.md`, `docs/manual-tecnico/` (um capítulo por grupo de RF), `docs/operacao/deploy.md` e
  estas notas.

### Correções feitas na revisão (08) antes de fechar a versão

- S-01 (crítico): dependências com vulnerabilidade conhecida. `next` e `eslint-config-next` 16.3.8 → **16.4.1**,
  `better-auth` 1.7.6 → **1.7.7**, `zod` 4.6.5 → **4.6.6**, com `overrides: zod: 4.6.6` no `pnpm-workspace.yaml` para
  o `zod` que vem pelo better-auth. `pnpm audit --prod --audit-level high` termina com código 0.
- A-01 (alto): decidir um DEC que não é o mais novo da demanda dá 409.
- A-02 (alto): aprovar um DEC com outro já aprovado na demanda dá 409.
- A-03 (alto): o pedido de DEC desatualizado dá 409, e a tela esconde a seção.
- A-04 (alto): o nível de aprovação saiu da saída do agente de consolidação; DEC de agente nasce `cto_e_administradora`.
- A-05 (alto): CI criado na etapa 09 (falta só fixar as actions por SHA, abaixo).

### Verificações desta versão

- `pnpm test`: 192 arquivos, 3.697 de 3.697 (08-correcao).
- `pnpm lint` e `pnpm typecheck` limpos.
- Homologação (`construir.mjs homologar`): saúde 200 e e2e com 126 testes passando contra a imagem.
- Ensaio de rollback: primeira publicação, as 7 migrations não alteram dado existente.
- `docker build` local: imagem de 1,74 GB em disco (426 MB comprimidos).

### Pendências abertas para Fabiano

Segurança, nível médio (decidir na Parada 3 se entram numa correção antes do merge ou vão a `gestao-riscos` como
risco residual; o `seguranca-aplicacao` não aceita risco residual sozinho):

- **M-01**: a consolidação lê o RSK da chave da execução, mas o DEC cita o RSK mais novo; o resumo pode vir de outro
  parecer (`src/modules/agentes/entrada-agente.ts`). Fechada na 0.1.5.
- **M-02**: criar ESP, RSK ou DEC não confere o status da demanda; numa demanda `encerrada` ou `entregue`, dispara
  agente, aviso e possível pedido (`src/modules/pacotes-decisao/criar.ts`). Fechada na 0.1.5 para a criação; decidir e
  gerar o Pedido em demanda `encerrada` ficaram abertos na 0.1.5 e fecharam na 0.1.6 (M-08).
- **M-03**: erro inesperado no envio do aviso gasta as novas tentativas sem somar `aviso_email.tentativas`, e o aviso
  pode ficar `pendente` para sempre; a recusa definitiva do Resend (4xx) é tentada de novo
  (`src/jobs/aviso-dec-pronto.ts`). Fechada na 0.1.5.
- **M-04**: o `no-store` das páginas era conferido só no `next dev`. Resolvido no e2e local, que agora roda contra o
  build de produção, e conferido na homologação com `BASE_URL`; segue na lista para o registro da decisão.
- **M-05**: erro não tratado em página ou layout sai pelo `console` do Next, fora do log por lista de permissão
  (`src/modules/acesso/exigir-pessoa.ts`, `src/app/(painel)/layout.tsx`). Fechada na 0.1.6, com o risco da prova só
  de unidade registrado nas pendências dela.
- **M-06**: o token de agente lê `solicitanteNome`, anexos e o nome da conta autora pela API, contornando a
  minimização (`src/modules/demandas/consultas.ts`). Fechada na 0.1.6 para a leitura de demanda; o texto livre sem
  minimização (M-1) e a autoria nas leituras de ESP, RSK e DEC (M-2) seguem abertos (pendências da 0.1.6).
- **M-07**: o seed cria contas com senha e segredo TOTP que estão no git; a guarda é `SEED_FICTICIO=1` com banco vazio.
  Controle operacional: `SEED_FICTICIO` nunca no serviço de produção (`docs/operacao/deploy.md`, seção 7). Fechada na
  0.1.6: o seed também recusa `BETTER_AUTH_URL` fora do loopback.
- **Médio novo do reteste (08)**: a regra "nunca dois DEC aprovados" junto com a do desatualizado pode deixar a
  demanda sem saída. O v1 é aprovado, entra uma ESP ou um RSK novos, o pedido do v1 dá 409 e o v2 não pode ser
  aprovado. Saídas possíveis: recusar ESP, RSK e DEC novos numa demanda com DEC aprovado (trata também a M-02), ou
  deixar aprovar o mais novo quando o aprovado anterior estiver desatualizado. Decisão de Fabiano ou do `tech-lead`.
- **5 vulnerabilidades moderadas** no `pnpm audit --prod`; o portão é `--audit-level high`, e elas não bloqueiam.

Configuração e pipeline (fora do `/construir`; passo a passo em `docs/operacao/deploy.md`, seções 2 e 10):

- Fixar por SHA completo `actions/checkout@v5` e `actions/setup-node@v5` nos dois workflows, e por digest a imagem
  `ghcr.io/gitleaks/gitleaks:v8.28.0`. Sem isso, o C-39 (A-05) não fecha por inteiro. O gitleaks fechou em 31/10/2026
  e as actions na 0.1.6.
- Segredos do GitHub `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER`.
- Credencial de leitura de pacotes (`read:packages`) do GHCR no Easypanel.
- Acesso **Admin** das Actions do repositório ao pacote no GHCR, para a limpeza das versões antigas.
- Variáveis dos serviços `app` e `worker` no Easypanel, só pelo nome, como na seção 3 do `deploy.md`; papel
  `orquestrador_app` criado no banco de produção com senha nova.
- Primeira execução do gitleaks: as senhas fictícias da homologação, do seed e do e2e podem ser acusadas; a triagem é
  do `seguranca-aplicacao`.

Aceite (UAT):

- Ler o QR da tela de 2FA com o Google Authenticator e com o Microsoft Authenticator (cenário U-01 do
  `07-qa-funcional.md`), com aparelho real.

Para outras áreas, antes de ligar qualquer agente em produção (`docs/manual-tecnico/06-agentes-de-ia.md`):

- `juridico-contratos`: confirmar os 90 dias do texto bruto, os 5 anos depois do status final, as bases legais e a
  transferência internacional (J-01).
- `compliance-governanca`: registro da operação de tratamento (J-02).
- `gestao-riscos`, com aceite de Fabiano: risco residual de nome em texto livre que chega ao provedor e de instrução
  injetada que passe pela revisão humana (J-03).
- Fabiano: chave da API no CNPJ (CA-E-03), teto mensal e preço do modelo.

Documentação fora do repositório do sistema ou do código, que esta etapa não edita:

- RNF-01 da spec e do `01-analista-requisitos.md`, a linha de stack do plano e o `padrao-tecnico.md` da
  estruturaAutonoma ainda citam Next 16.3.8, Zod 4.6.5 e Better Auth 1.7.6. O `padrao-tecnico.md` pede ADR para mudar
  de linha do Next (16.3 → 16.4), e a troca foi feita como correção de segurança, sem ADR.
- Comentários e nomes de teste ainda citam "Better Auth 1.7.6" (por exemplo, `src/modules/acesso/bloqueio-verificacao.ts:5`).

Backlog (baixo): B-01 a B-07 do `08-maestro.md`; `gerarPedido` sem a trava da demanda antes de ler `desatualizado`;
imagem de 1,74 GB por levar as dependências de desenvolvimento; textos QF-01 a QF-04 e D-01 a D-06 para a
`ux-ui-design`.

### Fora desta versão

Entrada automática por e-mail ou chat, envio automático do pedido ao `/construir` e retorno de andamento, upload de
anexo, mensagem ao solicitante, cadastro público e recuperação de senha por e-mail, mais de uma empresa na mesma base,
opções C e D na decisão, job de anonimização de 5 anos.
