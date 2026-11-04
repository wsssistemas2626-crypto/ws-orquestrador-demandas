---
pedido: DEC-DEM-20261104-0012-v1
etapa: 04-regressao
agente: qa-automacao
leu: [contrato-passagem.md, pedido.json, padrao-tecnico.md, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-backend.md, "git show 930b277 (código e testes)", src/modules/dados-pessoais/detectores.ts, src/modules/dados-pessoais/detectores.test.ts, src/modules/dados-pessoais/minimizar.ts, src/modules/dados-pessoais/minimizar.test.ts, src/modules/pedido-construcao/gerar.test.ts, test/sentinelas.ts, package.json, playwright.config.ts]
status: devolvido
proximo: engenheiro-backend
devolvido_para: 03-correcao
---
## Entrega

**Resultado: devolvido à `03-correcao`.** A regex nova de e-mail deixa de detectar um e-mail que a 0.1.10 detecta: o
e-mail **colado logo depois do fim de outro e-mail**, por um caractere que o domínio e o TLD não absorvem (`+`, `_`,
`%`, letra com acento, e `-`, número ou `.` quando o usuário seguinte não tem ponto). Em `minimizar`, o usuário do
segundo e-mail chega em claro ao agente. Isso descumpre o critério 2 do pedido ("os e-mails detectados hoje continuam
detectados") e o primeiro risco do RSK; o comentário novo de `detectores.ts:14-15` ("nenhum e-mail detectado antes deixa
de ser") e a afirmação da 02 não valem para esse caso. O resto (tempo, B-1, B-2, B-3, B-4) passou na conferência.

### O defeito encontrado (M-a, perda de detecção)

Causa: o lookbehind `(?<![\p{L}\p{M}\p{N}._%+-])` olha o texto original, e não o fim do casamento anterior. Com a regex
de antes, depois de casar `ana@exemplo.test`, o casamento seguinte começava logo no `+` ou no `-` (a busca recomeça no fim
do anterior); com a nova, a posição seguinte é recusada porque o caractere antes dela (`t` do TLD) é da classe do
usuário, e o resto da sequência também, até o próximo `@`.

Obtido nesta etapa, rodando (`minimizar(\`Contatos: ${t}.\`)`, todos os valores fictícios):

| Texto | 0.1.10 (regex de antes) | Ramo (930b277) |
|---|---|---|
| `joana.ficticia@exemplo.test+pedro.ficticio@exemplo.test` | `[e-mail removido][e-mail removido]` | `[e-mail removido]+pedro.ficticio@exemplo.test` |
| `joana.ficticia@exemplo.test_pedro.ficticio@exemplo.test` | `[e-mail removido][e-mail removido]` | `[e-mail removido]_pedro.ficticio@exemplo.test` |
| `joana.ficticia@exemplo.test-pedro@exemplo.test` | `[e-mail removido][e-mail removido]` | `[e-mail removido]-pedro@exemplo.test` |
| `joana.ficticia@exemplo.test2pedro@exemplo.test` | `[e-mail removido][e-mail removido]` | `[e-mail removido]2pedro@exemplo.test` |
| `ana@exemplo.test-bia@exemplo.test-caio@exemplo.test` | três marcadores | `[e-mail removido]-bia@[e-mail removido]` (o usuário `bia` sobra) |

O corpus gerado (5.000 textos, semente fixa) achou mais formas, entre elas `a@b.cc+a@b.cc`, `a@b.cc-a@b.cc`,
`. a@b.cc.a@b.cc`, `ab@c.de_ab@c.de`, `ab@c.de%ab@c.de` e `xa@b.ccéa@b.cc` (letra com acento colada ao TLD).

Não muda o bloqueio do Pedido de Construção (C-28): ele só pergunta "tem?" (`search`), e o primeiro e-mail do campo
continua achado. A perda é só na troca de todas as ocorrências (`minimizar`, entrada do agente e vista da API de quem
não é pessoa). Severidade: baixa no uso (formato pouco comum), mas é dado pessoal de terceiro em claro para o provedor
de IA e contraria um critério explícito do pedido.

Sugestão para a correção (a decisão é do engenheiro com o tech-lead; não mexi em `src/`): manter a regex ancorada para a
busca e, na troca de todas as ocorrências, depois de cada casamento que termina em `e`, tentar em `e` uma versão
ancorada no ponto (flag `y`) da mesma regex sem o lookbehind. Assim o casamento seguinte começa onde a regex de antes
começaria, e o custo continua linear: a tentativa em `e` percorre a sequência uma vez, e as posições seguintes da mesma
sequência seguem barradas pelo lookbehind (levam ao mesmo `@` e ao mesmo domínio). Afrouxar o lookbehind para aceitar a
posição logo depois de um `.xx` reabre o custo quadrático (`'a.aa'` repetido) e não serve.

### Critérios do pedido e os testes que os cobrem

| Critério (pedido.json) | Teste (arquivo › nome) | Situação |
|---|---|---|
| 1. E-mail linear: 100 mil sem `@` abaixo de 200 ms nos detectores, em `minimizar` e no Pedido de Construção | `detectores.test.ts` › "M-a e B-2 do 0011: detector de e-mail linear e com acento no usuário" › "tempo: …" (6 casos), "tempo: detector do Pedido de Construção com 100 mil caracteres e 50 itens de 10 mil…", "tempo: os 50 itens de 10 mil sozinhos…"; `minimizar.test.ts` › "M-a e B-2 do 0011: e-mail linear…" › "tempo: …" (2 casos); novos: `detectores.test.ts` › "M-a do 0011 (04-regressao do 0012): nada que a regex de antes cobria fica descoberto" › "tempo: …" (8 casos) | passa, com folga (abaixo) |
| 2. E-mails de hoje continuam detectados; acento no usuário vira um marcador | `detectores.test.ts` › "equivalência com a regex de antes: …" (29 textos) e "Pedido de Construção: … é e-mail" (3); `minimizar.test.ts` › "… vira um marcador só" (10) e "… vira …" (8); novos: `detectores.test.ts` › "M-a do 0011 (04-regressao do 0012) …" › "e-mails colados: … fica coberto como antes" (7) e "corpus gerado de 5.000 textos curtos: todo caractere coberto pela regex de antes continua coberto"; `minimizar.test.ts` › "M-a e B-1 do 0011 (04-regressao do 0012): sem perda em relação à 0.1.10" › "e-mails colados …: nenhum usuário nem "@" sobra" (5) | **falha**: 8 + 5 testes novos |
| 3. Nome grudado em número, `_` ou CamelCase vira marcador; meio de palavra não | `minimizar.test.ts` › "B-1 do 0011: nome grudado" (16 casos da tabela da 02, 16 de `haFronteira`, 4 de tempo) e os três esperados mudados (`:147-149`, `:168`, `:414` da base); novos: `minimizar.test.ts` › "M-a e B-1 do 0011 (04-regressao do 0012): sem perda em relação à 0.1.10" › "nome …: texto comum … fica igual" (6) e "tempo: "Ana" repetido 33.333 vezes vira 33.333 marcadores, em menos de 1 s" | passa |
| 4. `reduzirErro` nunca lança; o erro com getter que lança chega ao Sentry e ao log | `reduzir-erro.test.ts` › bloco "B-3 do 0011" (8); `log.test.ts` (3); `sentry.test.ts` › "B-3 do 0011: o erro com getter que lança chega ao Sentry" (2) e "B-4 do 0010: a marca de enviado vem depois do envio"; `rota.test.ts` (`it.each`, 2); `erros.test.ts` (1); `instrumentation.test.ts` (1); `console-saneado.test.ts` (2) | passa |
| 5. Aviso e dica com 3 letras, partículas e minúscula | `dados-da-demanda.test.ts` › "alertas de modo, aviso de minimização e dicas" e "B-4 do 0011: o aviso diz o mínimo de 3 letras e as partículas; a dica diz que a parte em minúscula sobra"; `formularios.test.ts` (`:66` e `:122` da base) | passa |
| 6. e2e três vezes seguidas | suíte `e2e/` atual | 143 de 143 numa execução; as três seguidas ficam para a volta, sobre o código corrigido |

### Conferências pedidas pelo maestro

1. **E-mails que a `main` detecta.** Os casos da `main` seguem detectados: `detectores.test.ts:7-19`, os de
   `minimizar.test.ts` (`:36-54`, os de RF-20 e os da `04-regressao` do 0011), os de C-28 em
   `pedido-construcao/gerar.test.ts:305-325` (`contato@exemplo.test` e `SENTINELAS.email`, `sentinela.7f3a@exemplo.test`),
   todos verdes na suíte inteira. A falha é só a do e-mail colado em outro, descrita acima, que nenhum desses casos
   cobre e que a equivalência da 03 não pegou porque o corpus dela não tem dois e-mails colados.
2. **Testes de tempo.** Medem o caso ruim de verdade: na base, o engenheiro registrou 15,3 s (100 mil letras), 17,3 s
   (`'a@' + '.a'` repetido) e 20,6 s (Pedido com 100 mil + 50 × 10 mil) nos mesmos testes. No ramo, pelo JUnit desta
   etapa: os 6 de `search` entre 0,7 ms e 4,9 ms; o do Pedido 8,5 ms; os 50 × 10 mil 4,4 ms; os 2 de `minimizar` 1,7 ms
   e 1,8 ms; os 8 casos ruins novos (hífens, pontos, `a@` + hífens, `a@` + `b.`, `@a`, `é` em NFD, `a1`, e-mail depois
   de 100 mil letras) entre 1,2 ms e 8,6 ms. Folga de mais de 20 vezes sobre os 200 ms. Os 4 de tempo do nome, de 23 ms
   a 40 ms contra 1 s. Os 4 de tempo do nome da 03 não conferem o resultado; o novo de `"Ana"` repetido confere.
3. **Texto comum e a borda nova do nome.** Ficam iguais, com teste: `Mariana`, `MARIANA` e o mesmo em NFD; siglas
   `ANAC`, `ANATEL`, `ANALISTA`, `ANAlise`; `Anabela`, `Banana`, `Ananias`; palavras com `_` (`campo_analise`,
   `tabela_ANALISE`, `var_Analise`); `ROSACEA`, `Rosado`, `Camposanto`, `CAMPOSINHO`; `Joanasilva`, `JOANASILVA`,
   `FICTICIAS`. A troca de identificador em que a parte é um segmento inteiro (`ROSA_CHOQUE` vira `[nome removido]_CHOQUE`,
   `joanaFicticia` vira `joana[nome removido]`) é a regra decidida na 02 (B-1 notas 2, 6 e 7), não regressão.

### Testes acrescentados (só inclusão; nenhum existente mudou)

- `src/modules/dados-pessoais/detectores.test.ts`, bloco "M-a do 0011 (04-regressao do 0012): nada que a regex de antes
  cobria fica descoberto" (16): 7 e-mails colados com cobertura caractere a caractere igual ou maior que a da regex de
  antes; 1 corpus gerado de 5.000 textos com semente fixa (sem `Math.random`); 8 de tempo.
- `src/modules/dados-pessoais/minimizar.test.ts`, bloco "M-a e B-1 do 0011 (04-regressao do 0012): sem perda em relação
  à 0.1.10" (12): 5 e-mails colados sem sobra de usuário nem `@`, com idempotência; 6 textos comuns que ficam iguais;
  1 de tempo com o resultado conferido.

### Resultado

- `pnpm test`: 4224 testes, **13 falhas**, 0 erros (relatório JUnit). As 13 são os testes novos do e-mail colado
  (8 em `detectores.test.ts`, 5 em `minimizar.test.ts`); os 4196 da 03 e os outros 15 novos passam.
- `pnpm lint`: limpo. `pnpm typecheck`: limpo.
- `pnpm test:e2e`: 143 de 143, em 6,0 min, uma execução (as três seguidas ficam para a volta).

## Decisões tomadas

- Devolvi em vez de registrar como risco: o critério 2 e o RSK pedem que nenhum e-mail detectado hoje deixe de ser, e o
  que sobra é dado pessoal em claro para o provedor de IA.
- A propriedade testada é "todo caractere que a regex de antes cobria continua coberto", e não igualdade dos casamentos,
  para não amarrar a forma da correção e aceitar o casamento maior do B-2.
- Corpus gerado por pedaços de e-mail e separadores, com semente fixa: o gerador por caractere solto não chegava a
  formar dois e-mails colados.
- Corrigi os meus próprios dados de teste em que a regex de antes também absorvia o segundo e-mail no domínio
  (`…test-pedro.ficticio@…`), para cada caso falhar só pela perda real.
- Rodei o e2e uma vez, para a volta saber se há outro problema; as três seguidas da definição de pronto ficam para a
  próxima `04-regressao`, sobre o código corrigido.

## Pendências

- `src/modules/dados-pessoais/minimizar.test.ts` › "M-a e B-1 do 0011 (04-regressao do 0012): sem perda em relação à 0.1.10 › e-mails colados …: nenhum usuário nem "@" sobra" (e os 8 de `detectores.test.ts` › "M-a do 0011 (04-regressao do 0012): nada que a regex de antes cobria fica descoberto"): a regex nova de e-mail não detecta o e-mail colado no fim de outro, e o usuário dele sai em claro em `minimizar`.
- Para a `03-correcao`: corrigir também o comentário de `detectores.ts:14-15` e, se a correção mexer em `minimizar.ts`,
  o comentário do topo (item 2).
- Para a próxima `04-regressao`: `pnpm test:e2e` três vezes seguidas sobre o código corrigido.
- Para a `04-revisao`, registros que continuam da 03: Error com `digest: undefined` explícito passa a ir ao Sentry pelo
  console saneado; `AnaBelax` com as partes `Ana` e `Anabela` fica igual.

## Comandos executados

- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/dados-pessoais --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/dp-1.xml` — 12 falhas de 266 (testes novos, antes do ajuste dos meus dados)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/dados-pessoais --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/dp-2.xml` — 13 falhas de 266, todas do e-mail colado
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/suite-0012-04.xml` — 4224 testes, 13 falhas, 0 erros
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 143 de 143, em 6,0 min (uma execução)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 930b2771636a4664fd1d16129a282f390567fde2` — 24 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 930b2771636a4664fd1d16129a282f390567fde2 -- src/modules/dados-pessoais/detectores.ts src/modules/dados-pessoais/minimizar.ts src/lib/reduzir-erro.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts src/lib/console-saneado.ts src/lib/sentry.ts src/components/dados-da-demanda.ts` — diff do código
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 930b2771636a4664fd1d16129a282f390567fde2 -- src/modules/dados-pessoais/detectores.test.ts src/modules/dados-pessoais/minimizar.test.ts` — diff dos testes de dados pessoais
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 930b2771636a4664fd1d16129a282f390567fde2 -- src/lib/sentry.test.ts src/components/dados-da-demanda.test.ts "src/app/(painel)/demandas/nova/formularios.test.ts" test/estatico/projeto.test.ts` — só os esperados listados na 02 mudaram
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --numstat 930b2771636a4664fd1d16129a282f390567fde2` — nenhuma remoção de teste além das linhas dos esperados listados
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 2 arquivos de teste modificados
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 124 inclusões, 0 remoções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — os 2 arquivos de teste e esta entrega

## Critério de pronto atendido

- [ ] cada critério de aceite da tarefa tem teste (tem; o do critério 2 falha)
- [ ] a suíte inteira passa (13 falhas, todas do defeito acima)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real (gerador com semente fixa; o tempo é só a medição pedida pela ESP)
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff` e `git show`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] (04 regressão) há um teste que reproduz o defeito descrito em `01-qa-funcional.md`
