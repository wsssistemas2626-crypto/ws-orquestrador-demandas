---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T12-construcao
agente: engenheiro-frontend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7, T11 e T12), 01-analista-requisitos.md (RF-11, RF-12), 03-ux-ui-design.md (seções 2.1, 2.2, 6, 9, 10, 11), 04-seguranca-aplicacao.md (C13, CV-10 a CV-15, CV-20), 06-T11-engenheiro-frontend.md, 06-T11-tech-lead.md, src/components/dados-da-decisao.ts, dados-da-decisao.test.ts, GrupoOpcoes.tsx, Botao.tsx, CampoTexto.tsx, CaixaSelecao.tsx, AreaTexto.tsx, DialogoConfirmacao.tsx, ResumoErros.tsx, componentes.test.ts (GrupoOpcoes), src/app/(painel)/pacotes-decisao/[decId]/page.tsx, FormularioDecisao.tsx, pagina.test.ts, src/app/api/pacotes-decisao/[decId]/route.ts, e2e/apoio.ts, e2e/preparacao.ts, e2e/decisao.spec.ts, e2e/pedido-construcao.spec.ts, e2e/axe-todas.spec.ts, test/estatico/decisao-e2e.test.ts, test/estatico/piso-de-assercoes.test.ts, scripts/seed-ficticio.ts (TITULOS_DO_E2E, RECOMENDACAO_DO_E2E), playwright.config.ts, package.json]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T12: a T11 Decisão decide por **um formulário e três botões de envio** (RF-11, ADR-18; 03, 6.4). Saem o grupo de
rádio "Decisão" e o botão "Registrar decisão". No lugar deles entram "Aprovar a opção X" ("Aprovar" sem opção),
"Devolver" e "Arquivar", no grupo "Ações da decisão".

Nada mudou fora da camada de tela:

- nenhuma rota, Server Action, esquema, migration, papel ou regra;
- `acoes.ts` e `acoes-pedido.ts` sem diff;
- `valoresDaDecisao`, `validarDecisao`, `entradaDaDecisao`, `errosDaApiDecisao`, `textoDoDialogo` e
  `formularioDaConta` sem mudança de código.

Todas as exigências de hoje continuam visíveis e obrigatórias:

- a revisão antes de decidir (C-14) e o diálogo com a ação, o repositório e o nível;
- a dupla aprovação, com a opção fixada na segunda;
- o documento assinado, obrigatório para aprovar na conta da administradora;
- a caixa "Revisei os rascunhos…", obrigatória nas três ações;
- o pacote desatualizado com "Aprovar" indisponível;
- 2FA e papéis, que não foram tocados.

P-01 aplicada: nenhuma opção vem marcada, não há selo "Recomendada", e a seção "Recomendação" continua antes das
opções no DOM. O e2e confere isso nas duas larguras.

### Arquivos alterados

- `src/components/dados-da-decisao.ts`:
  - entram `ACOES_DA_DECISAO`, o tipo `EnvioDaDecisao`, `envioDaDecisao(valores, ctx, valorDoBotao)` e
    `rotuloDoPrincipal(v, ctx)`, como no G7 e no passo 3 da T12;
  - textos novos da 03, seção 9: `aprovarOpcao`, `devolverCurto` e `grupoAcoes`;
  - textos alterados da 03, seção 9: `dicaDevolver` ("Devolver: a demanda volta para Em análise."), `referencia` e
    `dataAssinatura` (com "(obrigatório para aprovar)");
  - `legendaDecisao`, `aprovar`, `devolver`, `registrar` e `opcoesDaDecisao` ficaram, com um comentário. Não são mais
    usados na tela, mas têm teste e a 03 manda não apagar.
- `src/app/(painel)/pacotes-decisao/[decId]/FormularioDecisao.tsx` — envio:
  - `onSubmit` lê o `submitter`, aceito só se for botão deste formulário, e chama `envioDaDecisao` uma vez;
  - o `v` devolvido vai para o estado `aConfirmar`;
  - o diálogo mostra `textoDoDialogo(aConfirmar…)`, e "Confirmar e registrar" envia `entradaDaDecisao(aConfirmar…)`.
    É o mesmo `v`, sem reler o estado (CV-10);
  - antes do diálogo, o foco vai para o botão ativado. O diálogo devolve o foco a ele;
  - enquanto envia, os três botões ficam desabilitados, e o ativado mostra "Registrando…".
- `FormularioDecisao.tsx` — campos:
  - as opções aparecem desde o início, em `GrupoOpcoes` variante `cartao`, sem nenhuma marcada (CV-13). Na segunda
    aprovação aparece a frase da opção fixada;
  - o documento aparece desde o início, sem `aria-required`;
  - com o pacote desatualizado, as opções e o documento não aparecem. Revisão e comentários continuam.
- `FormularioDecisao.tsx` — botões e textos:
  - as consequências de Devolver e Arquivar ficam em texto visível acima do grupo, ligadas por `aria-describedby`;
  - os ids são `decisao-aprovar`, `decisao-devolver` e `decisao-arquivar`. O principal é o primeiro `submit`, e o Enter
    num `<input>` envia por ele;
  - "Aprovar" indisponível tem `aria-disabled` (sem `disabled`) e `aria-describedby` para o texto "Indisponível: pacote
    desatualizado." do rodapé;
  - `#rodape-da-decisao` tem `role="group"` e `aria-label="Ações da decisão"`, sem classes de posição. O arranjo C2 é da
    T13;
  - o `form` não tem `action` nem `method`. `name` só existe nos rádios de opção e nos três botões (`acao`), nunca nos
    campos digitados (CV-15).
- `src/app/(painel)/pacotes-decisao/[decId]/page.tsx`: sai só a prop `opcoesDecisao` e o import de `opcoesDaDecisao`.
- `src/components/GrupoOpcoes.tsx` (desvio 2): na variante `cartao`, o rádio ganha `relative z-10` pela constante
  `CLASSE_DO_RADIO`. A variante `lista` não muda.

### Testes criados

- `src/components/dados-da-decisao.test.ts`, com 10 casos novos:
  - `envioDaDecisao`: as ações aceitas; CV-10 com valor fora da lista ou nulo; CV-10 com o mesmo `v` no diálogo e na
    entrada (aprovar B e devolver com B marcada); CV-11; CA-11.2; CA-11.4/CV-14 nas três ações; CA-11.5/CA-11.6 ao
    devolver e ao arquivar; o que o envio confirma passa no `registrarDecisaoSchema`;
  - `rotuloDoPrincipal`: os rótulos, com a fixada valendo sobre a marcada; o rótulo e o diálogo citam a mesma opção.
- `src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts`, com 2 casos novos:
  - CV-15 no HTML: `form` sem `action` nem `method`; identificador, data, comentários e revisão sem `name`; `name` só
    `campo-opcaoEscolhida` e `acao`;
  - a administradora vê o documento desde o início, sem `aria-required`, e a revisão com `aria-required`.
- `src/components/componentes.test.ts`, com 1 caso novo: na variante cartão, o rádio fica acima da camada de clique do
  rótulo, e a lista não muda.
- `e2e/decisao-botoes.spec.ts`, com 8 testes. Não cria demanda: usa as demandas do seed da T06 e cria até 8 versões
  pela conta "cto".
  - CA-11.1 e CV-10 em `decisaoOpcaoB`: marca B e aciona "Aprovar a opção B". O diálogo diz "Aprovar a opção B." com o
    repositório e o nível, e a API grava `opcaoEscolhida: 'B'` com o aprovador CTO na B.
  - CV-10 em `decisaoDevolverComOpcao`: marca A e aciona "Devolver". O diálogo é o de devolução, e a API grava
    `devolvida`, com `opcaoEscolhida: null` e sem aprovadores.
  - CV-10, D-05 e CA-11.5, como administradora, no DEC de agente da `decisaoRecomendaB`:
    - aprovar sem documento dá os dois erros;
    - o Enter em Comentários é quebra de linha e não envia;
    - o Enter no identificador abre o diálogo de "Aprovar a opção A";
    - "Voltar" devolve o foco ao principal;
    - zero POST de Server Action, e o DEC continua pendente.
  - CV-11 no DEC desatualizado: clique forçado, Enter e Espaço no principal, e Enter em Comentários. O resultado é zero
    POST, a explicação visível e Devolver e Arquivar disponíveis (abrem o diálogo e fecham com "Voltar").
  - CV-13 em 1280 e em 390 px: nenhum rádio marcado, sem "Recomendada" e principal "Aprovar". A recomendação do seed
    vem antes do grupo de opções no DOM (P-01).
  - CV-15: `form` sem `action` nem `method`, e campos digitados e caixa sem `name`. Os `[name]` do form são exatamente
    os 2 rádios e os 3 botões.
  - CA-11.3: as três descrições acessíveis, sem rádio e sem documento no desatualizado, e axe.
  - Foco volta ao botão ativado com "Voltar" e com Esc. Inclui CA-11.4 ("Devolver" sem a revisão dá o erro e não abre
    o diálogo).

### Testes que já existiam e mudaram (G3.2 e CA-11.7, trecho a trecho)

**`src/components/dados-da-decisao.test.ts`** (previsto no G5). Só texto literal mudou. Nenhuma asserção de regra foi
trocada ou tirada:

- "formulário, diálogo, lembrete e sucessos": `dicaDevolver` passou de "Devolver para nova análise: a demanda…" para
  "Devolver: a demanda volta para Em análise.";
- no mesmo teste, `referencia` e `dataAssinatura` ganharam "(obrigatório para aprovar)", e entrou uma linha com os
  textos novos dos botões;
- "grupos do formulário": a `dica` de "devolvida" em `opcoesDaDecisao(false)` passou ao texto novo;
- validação, entrada, schema, erros da API, diálogo, revisão, aprovações e chegada continuam iguais.

**`src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts`** (fora do G5; é o teste de HTML da mesma tela):

- "desatualizado… (CA-12.4)":
  - o alvo passou do rádio `campo-statusDecisao-aprovada` ao botão `decisao-aprovar`. As duas asserções continuam:
    `aria-disabled="true"` e `aria-describedby` para o texto "Indisponível: pacote desatualizado.";
  - o seletor da dica passou ao `p#decisao-aprovar-indisponivel` (a classe antiga `ml-7 … text-texto-suave` era do
    rádio);
  - acrescentei quatro asserções: o botão continua sem `disabled`, diz "Aprovar", não há opções, e Devolver e Arquivar
    não ficam indisponíveis.
- "nível cto, conta cto…":
  - a legenda "Decisão (obrigatório)" e os três `<label>` de rádio viraram a lista dos três `submit`, com id, `name`,
    `value` e texto, na ordem, mais o grupo "Ações da decisão";
  - o texto da consequência de Devolver mudou (03, 9), e a de Arquivar ficou;
  - as duas passaram a ser conferidas também pelo `aria-describedby` dos botões;
  - "botão Registrar decisão existe" passou a "não existe";
  - `not.toContain(opcaoEscolhida-A)` passou a `toContain`, com "nenhum rádio marcado" e "sem Recomendada". É a regra
    nova da 03, 6.4 (as opções aparecem desde o início). Antes elas só apareciam depois de marcar o rádio "Aprovar",
    que deixou de existir;
  - documento, revisão e Aprovações continuam iguais.
- "dupla aprovação, depois do CTO": só acréscimos. A frase da opção fixada, o principal "Aprovar a opção A" e o rótulo
  do documento aparecem sem marcar nada.

**`src/components/componentes.test.ts`**: só o caso novo; nada existente mudou.

**`e2e/decisao.spec.ts`** (previsto no G5):

- o cabeçalho ganhou um parágrafo sobre a T12. O `test/estatico/decisao-e2e.test.ts` (linhas, órfãs e frase do axe)
  passa;
- os helpers `decisao()` (rádio) e `registrar()` viraram `principal()` e `botao('Devolver' | 'Arquivar')`;
- `confirmar(page)` agora só espera o diálogo e confirma. O clique no botão vem antes, em cada teste. O corpo do
  "Arquivar" continua com `await confirmar(page);`, que o estático D-1 exige;
- C-14:
  - "nada marcado → Registrar decisão" virou "Aprovar sem opção". O primeiro link do resumo passou de "Decisão: Escolha
    a decisão." a "Opção escolhida: Escolha a opção A ou a opção B.". Com os botões, a decisão vazia não tem como
    acontecer;
  - o erro da revisão, o foco no resumo e o axe ficaram;
  - "grupo Opção escolhida com contagem 0 antes de Aprovar" virou "visível desde o início" (03, 6.4);
  - "rádio Aprovar focado" virou "rádio Opção A focado e principal 'Aprovar a opção A'";
  - o resto ficou igual, com `principal` no lugar de `registrar`.
- P1-b: `registrar` virou `principal`, ainda com contagem 0.
- Dupla aprovação:
  - o rótulo do documento ganhou "(obrigatório para aprovar)";
  - os `check()` do rádio "Aprovar" saíram;
  - acrescentei "principal 'Aprovar a opção B'" na conta da administradora.
- CA-12.4: o alvo é o botão principal, com as mesmas asserções de `aria-disabled` e descrição. "Rádio não marcado"
  virou "diálogo fechado e sem resumo de erros". O `check()` de Devolver virou o clique no botão "Devolver".
- Arquivar: o `check()` virou o clique no botão "Arquivar", e `confirmar(page)` ficou.

**`e2e/pedido-construcao.spec.ts`** (previsto no G5): na aba nova do caminho completo, "rádio Aprovar, Opção A,
Registrar decisão" virou "Opção A e botão 'Aprovar a opção A'".

**`e2e/axe-todas.spec.ts`** (fora do G5, mesma causa):

- `registrar` passou a apontar para o principal (`/^Aprovar( a opção [AB])?$/`);
- o `check()` do rádio "Aprovar" saiu;
- os quatro estados do axe da T11 continuam.

Não houve `.skip`, `.only`, `retries`, aumento de tempo-limite, regra do axe desligada nem `bypassCSP`. O piso de
asserções (`piso-de-assercoes.test.ts`) passa.

### Visto falhando antes do código

`pnpm -C <repo> test src/components/dados-da-decisao.test.ts "src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts" --silent`,
com os testes escritos e o código sem mudança, teve 17 falhas (12 + 5). Trecho:

```
 ❯ src/components/dados-da-decisao.test.ts (50 tests | 12 failed)
     × CV-10: botão com valor fora da lista (ou nulo) não faz nada
     × CV-11: com o pacote desatualizado, "aprovada" não faz nada; devolver e arquivar seguem
 ❯ src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts (25 tests | 5 failed)
     × CV-15: o formulário não tem action nem method; identificador, data, comentários e revisão não têm name
AssertionError: expected undefined to deeply equal [ Array(3) ]   (ACOES_DA_DECISAO)
```

`pnpm -C <repo> test:e2e e2e/decisao-botoes.spec.ts e2e/decisao.spec.ts` antes do código parou no `next build`
(`[WebServer] Failed to type check.`), porque o teste de unidade importa o que ainda não existia.

A rodada e2e completa depois do código deu 9 falhas, todas da mesma causa: o `::after` do rótulo do cartão interceptava
o clique no rádio. Esse é o vermelho do caso novo do `componentes.test.ts`:

```
× variante cartão: o rádio fica acima da camada de clique do rótulo; a lista não muda
AssertionError: expected [ 'h-5', 'w-5', 'shrink-0', …(1) ] to deeply equal ArrayContaining ["relative", "z-10"]
```

### Resultado

- `pnpm test`: **5173 testes, 0 falhas** (relatório JUnit no scratchpad da sessão).
- `pnpm test:e2e` (suíte inteira): **215 de 215**.
  - O axe passou sem violação nos estados novos da T11: erro do documento e desatualizado com os três botões.
  - Passaram também os estados de hoje em `decisao.spec.ts` e `axe-todas.spec.ts`.
  - A vigia de CSP da T01 rodou em todos os testes.
- `pnpm lint` e `pnpm typecheck`: limpos.
- CV-01: o `git diff --stat 198e97d -- <lista do G4>` saiu vazio.
- `git status` mostra só os 11 arquivos da tarefa. Nenhum temporário ficou no repositório.

### Desvios do plano

1. **`GrupoOpcoes.tsx` alterado** (arquivo da T03, fora da lista da T12):
   - na variante `cartao`, o `::after` do rótulo cobria o próprio rádio. O clique de pessoa no rádio caía no rótulo e
     marcava a opção do mesmo jeito, mas o Playwright recusava o `check()` ("label intercepts pointer events");
   - 8 e2e falharam por isso, e o 9º teve tempo esgotado no mesmo ponto;
   - a correção é `relative z-10` no rádio, só no cartão, com teste de unidade visto falhando;
   - não muda id, `name`, aria-* nem a área de clique do cartão.
2. **`pagina.test.ts` e `axe-todas.spec.ts` mudaram** sem estar no G5. São da mesma tela e da mesma causa, e estão
   explicados trecho a trecho acima.
3. **O e2e do Enter do CV-10 (D-05) usa o DEC de agente da `decisaoRecomendaB`**, como administradora, e fecha o diálogo
   com "Voltar". O mesmo DEC serve ao CV-13, ao CV-15 e ao teste de foco. Nenhum deles grava, então ninguém gasta
   versão nem mexe no DEC que outro teste usa.
4. **CV-11, Enter num campo:** com o pacote desatualizado não há `<input>` de texto na tela (opções e documento somem,
   03 6.4). O teste aperta Enter em Comentários, o único campo de texto, e Enter e Espaço no próprio principal.
5. **Ordem dos campos:** ficou a de hoje (Comentários antes da revisão), que é a ordem do resumo de erros de
   `validarDecisao`. Os wireframes da 03 (6.2 e 6.3) desenham a revisão antes de Comentários; o arranjo é da T13.
6. **Rodapé sem posição:** o `#rodape-da-decisao` existe com o grupo e os ids, mas sem classes de `fixed`. O arranjo C2,
   o `:has()` do `globals.css` e o `decisao-celular.spec.ts` são da T13.

## Decisões tomadas

- `submitter` aceito só se for `HTMLButtonElement` do próprio formulário (`submitter.form === ev.currentTarget`). Um
  botão de fora não decide nada, e o valor ainda passa pela lista fechada de `envioDaDecisao` (CV-10).
- Estado `ativada` separado de `aConfirmar`. Na saída depois do sucesso, `aConfirmar` volta a `null`, e sem esse estado
  o botão ativado perderia o "Registrando…" que a 03, 6.4 pede.
- O diálogo só monta o texto quando há `aConfirmar`. Fechado, ele não mostra o texto de um `v` vazio.
- A opção fixada vale sobre a marcada em `rotuloDoPrincipal`. É a que `entradaDaDecisao` envia: o botão nunca diz uma
  opção diferente da gravada.
- No e2e, "Aprovar" indisponível é clicado com `force`. O Playwright trata `aria-disabled` como indisponível, e a
  pessoa que usa a tela consegue clicar. O teste confere que o botão não tem `disabled`.
- O DEC desatualizado do CV-11 e do CA-11.3 é achado pela API ou criado uma vez (DEC e ESP nova). Isso economiza versão
  do C-36 entre execuções.
- Volta 2: o maestro liberou o comando só de leitura que ficou fora da lista Pode na volta 1 (`git show --stat`). Por
  instrução dele, o comando saiu de Comandos executados e de Pendências. O código e os testes não mudaram.

## Pendências

- Para a T13 (`engenheiro-frontend`):
  - o rodapé fixo e o `:has()` em 390 px;
  - a decisão sobre a ordem revisão/comentários (desvio 5);
  - o `separarRevisao` e o `Recolhivel`;
  - `#rodape-da-decisao`, `#decisao-aprovar-indisponivel` e os ids dos botões já estão no DOM.
- Para a T16: `CLASSE_DO_RADIO` e as notas da T11 usam só tokens da 03. O `Dica` e o `MensagemDeErro` de `CampoTexto`
  continuam com `text-texto-suave` e `text-perigo`, nomes antigos, como hoje.
- Para a 07 (`qa-funcional`), à mão:
  - Enter num campo com leitor de tela;
  - o anúncio da troca de texto do principal ao marcar a opção (sem região viva, como pede a 03);
  - o foco de volta ao botão no Safari.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -15` — topo 8328e28 (06-T11-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -1 -- docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md` — plano presente
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S"Registrar decisão" --name-only --format=%h` — usos do botão antigo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S"Decisão (obrigatório)" --name-only --format=%h` — usos do grupo de rádio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S"Devolver para nova análise" --name-only --format=%h -- src e2e test` — usos do texto antigo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S"Identificador do documento assinado (obrigatório)" --name-only --format=%h -- src e2e test` — usos do rótulo antigo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S"statusDecisao-" --name-only --format=%h -- src e2e test` — ids dos rádios
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S"Confirmar e registrar" --name-only --format=%h -- src e2e test` — usos do diálogo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S"pacotes-decisao/" --name-only --format=%h -- e2e` — specs que abrem a T11
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S"Aprovar" --name-only --format=%h -- e2e src/components src/app test` — usos de "Aprovar"
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-da-decisao.test.ts "src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts" --silent` — vermelho: 17 falharam
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/decisao-botoes.spec.ts e2e/decisao.spec.ts --reporter=line` — vermelho: o `next build` parou no type check
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-da-decisao.test.ts "src/app/(painel)/pacotes-decisao/[decId]" --silent` — 2 falharam (regex do meu teste: classe `aria-disabled:` e ordem do `name`)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-da-decisao.test.ts "src/app/(painel)/pacotes-decisao/[decId]" test/estatico --silent --reporter=dot` — 33 arquivos, 479 de 479
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/scratchpad/t12-suite.xml` — 5172 testes, 0 falhas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — só os arquivos da tarefa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 8 arquivos modificados
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -U0 -- src/components/dados-da-decisao.test.ts "src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts"` — conferência das linhas trocadas nos testes existentes
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=dot` — 206 de 215 (9 falhas, todas pelo `::after` do cartão sobre o rádio)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S"accent-acao-escura" --name-only --format=%h -- src test e2e` — testes que fixam a classe do rádio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S"after:inset-0" --name-only --format=%h -- src test e2e` — testes da camada do rótulo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S"cartao" --name-only --format=%h -- src/components test` — testes da variante cartão
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S"variante=\"cartao\"" --name-only --format=%h -- src/components/componentes.test.ts` — nenhum
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff d452a76~1 d452a76 -U2 -- src/components/componentes.test.ts src/components/GrupoOpcoes.tsx` — o teste da variante cartão da T03
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/componentes.test.ts --silent -t "camada de clique"` — 36 pulados (a edição do teste ainda não tinha entrado)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/componentes.test.ts --silent -t "camada de clique"` — vermelho: 1 falhou
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components test/estatico "src/app/(painel)/pacotes-decisao" --silent --reporter=dot` — 56 arquivos, 1109 de 1109
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=dot` — 215 de 215
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/scratchpad/t12-suite-final.xml` — 5173 testes, 0 falhas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio (CV-01)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 10 modificados e 1 novo, todos da tarefa

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas
