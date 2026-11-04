---
pedido: DEC-DEM-20261104-0013-v1
etapa: 03-correcao
agente: engenheiro-backend
leu: [contrato-passagem.md, padrao-tecnico.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, src/modules/pedido-construcao/gerar.ts, src/modules/pedido-construcao/montar.ts, src/modules/pedido-construcao/conteudo.ts, src/modules/pedido-construcao/gerar.test.ts, src/modules/pedido-construcao/gerar-bordas.test.ts, src/modules/dados-pessoais/minimizar.ts, src/modules/dados-pessoais/minimizar.test.ts, src/modules/dados-pessoais/detectores.ts, src/modules/pacotes-decisao/criar.ts, src/modules/pacotes-decisao/criar.test.ts (1-115), src/modules/pacotes-decisao/consultas.ts, src/modules/demandas/consultas.ts (170-220), src/modules/versoes.ts, src/modules/historico/registrar.ts, src/db/schema/decisao.ts, src/lib/rota.ts, src/lib/acao-painel.ts, src/lib/corpo.ts, src/lib/erros.ts, "src/app/api/pacotes-decisao/[decId]/pedido-construcao/route.ts", src/app/api/pacotes-decisao/pedido.test.ts, src/app/api/pacotes-decisao/pedido-bordas.test.ts, "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts", "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.test.ts", "src/app/(painel)/pacotes-decisao/[decId]/SecaoPedido.tsx", "src/app/(painel)/pacotes-decisao/[decId]/FormularioDecisao.tsx (1-200)", "src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts (355-380)", "src/app/(painel)/demandas/[id]/Historico.tsx", "src/app/(painel)/demandas/[id]/detalhe.ts", src/components/dados-do-pedido.ts, src/components/dados-do-pedido.test.ts, src/components/rotulos.ts, src/components/rotulos.test.ts, src/components/CaixaSelecao.tsx, test/sentinelas.ts, test/requisicao.ts, test/estatico/projeto.test.ts (20-35), test/transversal/sentinelas.test.ts (1-300), scripts/seed-ficticio.ts (1-230), tsconfig.json, package.json]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Base: ramo `construcao/DEC-DEM-20261104-0013-v1`, limpo no início (`git status`). Os três defeitos da 02 foram
corrigidos na ordem pedida (D2, D1, D3, textos da T11, versão), com o teste escrito antes e visto falhando. Nada em
`e2e/` mudou (fica com a 04) e o `CHANGELOG.md` não foi tocado (fica com a 06; texto proposto em Pendências).

### Arquivos alterados

Código:

- `src/modules/pedido-construcao/montar.ts`: **D2** `aprovadoPor` = papéis gravados na aprovação (`Aprovador.papel`),
  ordenados por `registradaEm` e, no mesmo instante, pela ordem de `PAPEIS_APROVACAO`, unidos por `' e '`; comentários do
  topo e da função atualizados. **D1** `textosDoPedido` e o tipo `TextoDoPedido`; a opção escolhida sai de uma função
  interna comum (`opcaoEscolhida`) usada por `montarPedido` e `textosDoPedido`.
- `src/modules/pedido-construcao/conteudo.ts`: **D1** `valoresDaEspecificacao` e `valoresDoParecer`, sobre as mesmas
  listas do texto. `textoDoParecer` passou a ler os blocos fora dos riscos de uma lista (`CAMPOS_DO_PARECER`), com o mesmo
  texto de saída. Exportados para a guarda do teste: `CAMPOS_DA_ESP`, `RISCOS`, `ROTULO_DO_NIVEL`, `CAMPOS_DO_PARECER` e
  `ROTULO_DO_COMENTARIO`.
- `src/modules/dados-pessoais/minimizar.ts`: **D1** os passos 3 e 4 de `minimizar` foram extraídos para `trocarNomes`,
  que `minimizar` chama sem mudar o resultado. Nova `temNome(texto, nomes) = trocarNomes(texto, nomes) !== texto`.
  Comentário do topo citando o D1 do 0013.
- `src/modules/pacotes-decisao/criar.ts`: **D1** `descricaoSemRotulos(descricao)`, com a mesma `PARTES_DA_DESCRICAO`, que
  agora é exportada.
- `src/modules/pedido-construcao/gerar.ts`: **D3** a confirmação vem logo depois do `autorizar` e antes do banco
  (`entrada.confirmaSemDadoPessoal !== true` → 422 `semConfirmacao`); `MENSAGENS_PEDIDO.semConfirmacao`; assinatura
  `gerarPedido(deps, ator, decId, entrada, t?)`; evento com `depois: { confirmaSemDadoPessoal: true }`. **D1** conferência
  única: a lista do C-28 primeiro, na ordem de antes, depois os caminhos com `: nome` (`textosDoPedido` + `temNome` +
  `nomesDoSolicitante(demandaTravada.solicitanteNome)`), num 422 só; depois o `validarPedido`, como antes. Comentário do
  topo com a ordem nova.
- `src/modules/pedido-construcao/schemas.ts` (novo): `confirmacaoDoPedidoSchema` e `ConfirmacaoDoPedido`.
- `src/app/api/pacotes-decisao/[decId]/pedido-construcao/route.ts`: `corpo: confirmacaoDoPedidoSchema`, que é repassado a
  `gerarPedido`.
- `src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts`: entrada
  `paramId.versao('decId', 'DEC').extend(confirmacaoDoPedidoSchema.shape)`, que repassa a confirmação.
- `src/app/(painel)/pacotes-decisao/[decId]/SecaoPedido.tsx`: a `CaixaSelecao` `confirma-sem-dado-pessoal` (obrigatória,
  com erro) fica entre o alerta de C-28 e o botão, e o botão continua habilitado. Com a caixa desmarcada, a tela não chama
  a ação, mostra `semConfirmacao` na caixa e põe o foco nela; marcar a caixa limpa o erro, e ela não é desmarcada depois
  de gerar. A orientação sai como um parágrafo por linha.
- `src/components/dados-do-pedido.ts`: textos da T11 da 02 (`avisoDadoPessoal`, `confirmacao`, `semConfirmacao`),
  `MENSAGENS_PEDIDO_DO_SERVIDOR.semConfirmacao`, `orientacaoDoPedido(erros)` com as linhas 1 a 7 da 02 e
  `entradaDoPedido(decId, confirmado)`, que é a regra "caixa desmarcada não chama a ação". `ErroDoPedido.orientacao`
  passou a `string[]`.
- `src/components/rotulos.ts`: `pedido_gerado` com `depois.confirmaSemDadoPessoal === true` mostra
  `Gerou o Pedido de Construção de <DEC-id>, com a confirmação de que o texto não tem dado pessoal`.
- `package.json`: versão `0.1.12`.

Testes:

- `src/modules/pedido-construcao/gerar.test.ts`: `CONFIRMADO` em todas as chamadas; D2 (esperados 1, 2, 3 e 6 da 02,
  com mais um teste puro de ordem pelo instante); D3 (`{}` e `false` dão 422 sem evento, confirmação antes do 404, 403
  antes da confirmação, evento com a confirmação); D1 com os casos 1 a 16 da tabela da 02; guarda `textosDoPedido`
  (sentinelas em todos os campos de `CAMPOS_DA_ESP`, `RISCOS` e `CAMPOS_DO_PARECER`, caminhos e rótulos) e unitários de
  `valoresDaEspecificacao` e `valoresDoParecer`.
- `src/modules/pedido-construcao/gerar-bordas.test.ts`: cinco gerações concorrentes, cada evento com a confirmação; troca
  de nome **e** papel da conta (esperado 5 da 02), com o arquivo igual byte a byte e `aprovadoPor` `'cto'`; dupla
  aprovação B com `'administradora e cto'`.
- `src/modules/dados-pessoais/minimizar.test.ts`: bloco "temNome (D1 do 0013)" com 79 casos de nome do arquivo (sem
  e-mail, telefone, CPF, CNPJ nem cabeçalho) e a equivalência com `minimizar`, mais os quatro casos fixos da 02.
- `src/modules/pacotes-decisao/criar.test.ts`: `descricaoSemRotulos` (três valores sem rótulo, rótulo só no começo de
  bloco, vazio continua vazio).
- `src/app/api/pacotes-decisao/pedido.test.ts`: corpo com a confirmação; bloco D3 da rota (`{}` e `false` → 422; `"true"`
  e `1` → 400; POST sem corpo → 400; chave a mais → 200 com o evento confirmado; agente → 403); `aprovadoPor` `'cto'`; os
  testes de M-a refeitos para o D1 (ver Desvios).
- `src/app/api/pacotes-decisao/pedido-bordas.test.ts`: corpo com a confirmação; o teste do corpo ignorado passa a mandar
  a confirmação junto.
- `src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.test.ts`: confirmação nas chamadas; novo teste D3 (`{ decId }` e
  `false` → 422 `semConfirmacao`, sem evento, `erroDoPedido` com o texto; `"true"` → `entrada_invalida`); eventos com a
  confirmação; `orientacao` como lista.
- `src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts`: o aviso novo, e a caixa desmarcada, obrigatória e com rótulo
  associado entre o aviso e o botão, que segue habilitado.
- `src/components/dados-do-pedido.test.ts`: textos novos, a cópia de `semConfirmacao`, `orientacaoDoPedido` (nome no
  título; e-mail na ESP; `sistema_alvo fora do formato...`; todos os campos; lista vazia; nenhuma linha com valor) e
  `entradaDoPedido`.
- `src/components/rotulos.test.ts`: os textos de `pedido_gerado` com e sem a confirmação.
- `test/estatico/projeto.test.ts`: versão `0.1.12`.
- `test/transversal/sentinelas.test.ts`: o POST do pedido manda a confirmação, e há uma troca de solicitante (ver
  Desvios).

### Teste antes do código, visto falhando na base

Todos os testes acima foram escritos com o código ainda na base. A rodada nos arquivos alterados deu
`⎯ Failed Tests 177 ⎯`. Trechos:

- D1/D3 (textos e `temNome`):
  `FAIL src/components/dados-do-pedido.test.ts > textos (03, T11 ...) > os da 03, por inteiro, e o aviso de C-28 do plano`
  (`- "confirmacao": ...`, `+ "avisoDadoPessoal": "... Não deixe nome, e-mail ou telefone de cliente na ESP nem no parecer de risco."`)
  e `FAIL src/modules/dados-pessoais/minimizar.test.ts > temNome (D1 do 0013) > nomes ["Joana Ficticia"], texto "Falei com JoanaFicticia": ...`
  (`temNome` não existia).
- D2 e a assinatura nova (rodada com `-t "D2|aprovadoPor|dupla aprovação|muda de nome e de papel"`: `Tests 8 failed | 73 skipped`):
  `FAIL ... montarPedido e serializarPedido > D2 do 0013: aprovadoPor na ordem da aprovação ... Expected: "administradora e cto" Received: "Pessoa Ficticia CTO e Pessoa Ficticia Adm"`;
  `- "aprovadoPor": "cto e administradora", + "aprovadoPor": "Pessoa Ficticia CTO e Pessoa Ficticia Adm"`; e, nos testes
  com banco, `TypeError: Cannot read properties of undefined (reading 'select') ❯ corpo src/modules/pedido-construcao/gerar.ts:52:29`
  (a confirmação caía no lugar de `t`: a função ainda não tinha o parâmetro).

### Resultado

- `pnpm test`: **200 arquivos e 4414 testes passaram, 0 falharam** (JUnit: `tests="4414" failures="0" errors="0"`).
- `pnpm lint`: limpo. `pnpm typecheck`: limpo.

### Desvios do plano, com a razão

1. **Caso 12 da tabela de D1 (demanda sem solicitante).** A coluna `demanda.solicitante_nome` é `NOT NULL`: o update
   para nulo deu `null value in column "solicitante_nome" of relation "demanda" violates not-null constraint`. O caso
   ficou como teste puro da mesma regra que `gerarPedido` usa: com `nomesDoSolicitante(null)` nenhum caminho é marcado,
   mesmo com o nome no título, e com `Joana Ficticia` o caminho `demanda.titulo` é marcado.
2. **`pedido.test.ts`, bloco M-a.** Três testes esperavam 200 com o nome do solicitante no texto, e o D1 muda exatamente
   esse comportamento. O texto que eles provam não foi trocado; o que mudou foi o esperado:
   - "o pedido de um DEC com o nome do solicitante no texto (`Joana Fictícia Teste`)" passou a esperar 422 com os seis
     caminhos `: nome`, sem o valor, sem download e sem evento;
   - "`A Joana pediu`" passou a esperar 422 com os mesmos seis caminhos;
   - "04-regressao do 0011 (agentes pelas rotas)": o 201 continua minimizado, como antes, e o pedido passou a 422 com os
     seis caminhos, sem `Carla`, `Rosa`, `Campos`, `Santos` nem `Dias` na resposta.
   Para o M-a continuar provado (o pedido sai sem minimizar), entraram dois testes com 200: o nome de **outra** pessoa no
   texto (solicitante `Carlos Ficticio Solicitante`) sai como gravado, sem marcador; e a palavra comum em minúscula igual
   a parte do nome (`camisa rosa`, `campos`, `30 dias`) também sai como gravada.
3. **Troca de solicitante em fixture** (regra da 02, "Testes existentes"): `test/transversal/sentinelas.test.ts:291`
   (passo 2d, `caminhoDaPessoa`). Antes, `solicitanteNome: SENTINELAS.nome` (`Pessoa Ficticia Sentinela`, o padrão de
   `criarDemandaPelaApi`). Depois, `demanda: { solicitanteNome: 'Pessoa Ficticia Outra' }`. Motivo: o texto do fixture
   leva `SENTINELAS.texto` (`SENTINELA-TEXTO-7f3a`), em que `SENTINELA` é a parte "Sentinela" do nome com inicial maiúscula
   e borda `-`. O texto que o teste prova (os sentinelas) não mudou, e o nome sentinela continua passando pela entrada do
   orquestrador e pelo pedido com e-mail (422).
4. **`ErroDoPedido.orientacao` de `string | null` para `string[]`** (interface da 02): onde se esperava `orientacao: null`,
   o esperado agora é `[]` (`dados-do-pedido.test.ts`, `acoes-pedido.test.ts`), e o 422 de e-mail na ESP mostra as linhas
   3 e 6.
5. **Exportações a mais para a guarda de D1:** `CAMPOS_DA_ESP`, `RISCOS`, `ROTULO_DO_NIVEL`, `CAMPOS_DO_PARECER` e
   `ROTULO_DO_COMENTARIO` (`conteudo.ts`) e `PARTES_DA_DESCRICAO` (`criar.ts`). Sem elas, o teste teria de copiar as
   listas, e a guarda não pegaria um campo novo.
6. **Item 7 dos testes de D3 (componente).** Não há teste de `SecaoPedido`. Por isso a regra ficou em
   `entradaDoPedido` (`dados-do-pedido.ts`), testada lá: com a caixa desmarcada devolve `null` e a tela não chama a ação.
   O teste de página confere a caixa renderizada, e o clique fica com o e2e da 04.
7. **Arquivos fora da lista da 02:** `pagina.test.ts`, `test/estatico/projeto.test.ts` e
   `test/transversal/sentinelas.test.ts`. Os três quebraram por consequência direta da correção (o aviso novo, a versão e
   o corpo do POST). Estão todos na Pode.

## Decisões tomadas

- `temNome` é a definição da 02 ("a etapa mudaria o texto"), sobre `trocarNomes`, extraída de `minimizar`. Assim a regra
  existe uma vez só, e a equivalência com `minimizar` é testada em 79 casos.
- O nome é conferido nos valores **antes** do rótulo, e o caminho continua o do pedido. Com isso, "Campos críticos",
  "Alto" e "Contexto" não contam como nome (casos 9 e 10). `descricaoSemRotulos` só tira o rótulo do começo de um bloco,
  para não apagar o mesmo texto escrito no meio do valor.
- A opção escolhida sai de `opcaoEscolhida`, usada por `montarPedido` e por `textosDoPedido`, para as duas não divergirem
  (pedido da 02).
- `aprovadoPor` é ordenado em `montar.ts` por `registradaEm` e pelo índice em `PAPEIS_APROVACAO`, sem depender da ordem
  da consulta. O papel vem de `Aprovador.papel`, gravado na aprovação, e não de `user.papel`.
- A confirmação é conferida dentro de `gerarPedido`, depois do `autorizar` e antes do banco: o 422 vale para quem chama a
  função direto e não revela se o DEC existe. Tipo errado continua 400 pelo Zod.
- No histórico, só `confirmaSemDadoPessoal === true` gera o texto com a confirmação. O valor `'true'` (texto) não gera,
  e o teste cobre os dois.
- A caixa da T11 valida no envio, sem `disabled` no botão. É o padrão do painel (caixa de revisão da decisão), e o foco
  vai para a caixa quando ela está desmarcada.
- Para ver D2 falhando isolado na base, rodei o `pnpm test` só de `src/modules/pedido-construcao`, com um filtro de
  testes por nome (os testes de D2, de `aprovadoPor` e da dupla aprovação). Deu 8 falhas e 73 pulados. O filtro é uma
  alternância de nomes entre aspas, e o `conferir` o leu como pipe. É só leitura, e o maestro liberou pela regra de
  25/10 (registrado no `passagens.jsonl`), por isso o comando não está em "Comandos executados".
- O teste 15 (renomear o solicitante) espera `['demanda.titulo: nome', 'demanda.descricao: nome']`, como a 02 previu
  para o fixture de `gerar.test.ts`, e um evento só, o da geração aceita antes.

## Pendências

1. Para a `06-documentacao` (texto proposto para o `CHANGELOG.md`, seção 0.1.12, DEC-DEM-20261104-0013-v1):
   - "Pedido de Construção: a geração é recusada (422, `<caminho>: nome`, sem o valor) quando o título, a descrição, a
     ESP, o parecer de risco, a opção escolhida, o sistema, o repositório, um critério de aceite ou um item da definição
     de pronto tem o nome do solicitante, inteiro ou em parte (a mesma regra da minimização). Os rótulos do sistema não
     contam. Junto com e-mail, telefone e CPF, sai um 422 só, com o C-28 primeiro."
   - "Pedido de Construção: o POST `/api/pacotes-decisao/:decId/pedido-construcao` e a T11 exigem a confirmação
     `{ "confirmaSemDadoPessoal": true }`. Sem ela, ou com `false`, a resposta é 422 com a mensagem; tipo errado ou corpo
     vazio dão 400. A T11 tem a caixa de confirmação antes do botão. O evento `pedido_gerado` grava a confirmação, e o
     histórico a mostra."
   - "Pedido de Construção: `decisao.aprovadoPor` leva o papel de quem aprovou (`cto`, `administradora`), na ordem da
     aprovação, e não o nome."
   - "T11: a orientação do 422 diz que campo corrigir e onde, e avisa que outro pacote da demanda não se aprova depois
     deste."
   README e manual técnico: o corpo novo do POST, a caixa da T11 e o `aprovadoPor` com o papel.
2. Para a `04-regressao` (`qa-automacao`): ajustar `e2e/pedido-construcao.spec.ts` (marcar a caixa; POST com a
   confirmação, inclusive em `:173` e `:190`; axe na T11 nos quatro estados). Conferi `scripts/seed-ficticio.ts`: as
   demandas do e2e do pedido (`DO_PORTAL`, solicitante `Pessoa Ficticia Financeiro`) não têm parte do nome com inicial
   maiúscula no título nem no contexto, e "(fictício)" está em minúscula. Se o texto que o próprio e2e grava na ESP, no
   RSK ou no DEC tiver "Pessoa", "Ficticia" ou "Financeiro" com maiúscula, o pedido passa a dar 422 `: nome`.
3. Não rodei o Prettier (`pnpm format` não está na minha lista Pode). `pnpm lint` passou. Se o CI conferir a
   formatação, a 04 ou a 05 rodam o Prettier.
4. Para a `ux-ui-design`, quando houver rodada de interface: revisar os textos da T11 e `semConfirmacao` (todos da 02).
5. E5, para Fabiano: segue como a 02 registrou (recusa por nome sem saída dentro da demanda por causa do A-02). Não mudou
   neste pedido.
6. Sobre os comandos: até a primeira verificação final, rodei `pnpm test`, `pnpm lint` e `pnpm typecheck` precedidos de
   `cd /home/deploy/servidor/projetos/ws-orquestrador-demandas &&` na mesma chamada. Não é o formato da lista Pode. As
   verificações finais foram repetidas sem `cd`, com `pnpm --dir` no repositório do pedido, e é delas o resultado acima.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format= -- "*pedido-construcao*" "*rotulos*" "*criar.test*" "*minimizar*" "*SecaoPedido*" "*descricao*"` — lista dos arquivos de teste ligados ao pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format= --diff-filter=A -- "test/*" "src/app/api/*.test.ts" "src/app/api/**/*.test.ts"` — onde estão os testes da rota
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --branch` — ramo do pedido, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 3 arquivos de teste alterados (antes do código)
- `pnpm test --reporter=dot src/modules/pedido-construcao src/modules/dados-pessoais/minimizar.test.ts src/modules/pacotes-decisao/criar.test.ts src/app/api/pacotes-decisao/pedido "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.test.ts" src/components/dados-do-pedido.test.ts src/components/rotulos.test.ts` — na base: 177 falharam (vermelho esperado)
- `pnpm typecheck` — 1 erro em `gerar.test.ts:318` (chamada sem a confirmação), corrigido
- `pnpm typecheck` — limpo
- `pnpm test --reporter=dot src/modules/pedido-construcao src/modules/dados-pessoais/minimizar.test.ts src/modules/pacotes-decisao/criar.test.ts src/app/api/pacotes-decisao/pedido "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.test.ts" src/components/dados-do-pedido.test.ts src/components/rotulos.test.ts --silent` — 485 passaram, 1 falhou (caso 12, schema exige solicitante)
- `pnpm test --reporter=dot --silent src/modules/pedido-construcao/gerar.test.ts -t "D1 do 0013"` — recusado pelo vitest (`--silent` pede valor), não rodou
- `pnpm test --reporter=dot src/modules/pedido-construcao/gerar.test.ts -t "D1 do 0013"` — 19 passaram, 1 falhou (caso 12: `solicitante_nome` NOT NULL); caso refeito como teste puro
- `pnpm test --reporter=dot` — saída truncada pelo tamanho; refeito abaixo
- `pnpm test --silent=true --reporter=json --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/suite1.json` — falhou; arquivo grande demais para ler, refeito por grupos
- `pnpm test --reporter=dot --silent=true test` — o filtro pegou a suíte inteira; saída truncada
- `pnpm test --reporter=dot test/estatico test/transversal test/next-config test/deps test/banco` — 106 passaram, 2 falharam (versão e corpo do POST no teste de sentinelas)
- `pnpm test --reporter=dot test/transversal test/estatico/projeto` — 11 passaram, 1 falhou (nome "Sentinela" no texto do fixture)
- `pnpm test --reporter=dot test/transversal test/estatico/projeto` — 12 de 12
- `pnpm test --reporter=dot test/matriz-rotas test/desempenho` — 174 de 174
- `pnpm test --reporter=dot src/components src/lib src/app/(painel) src/vendor src/db scripts` — não rodou (erro de sintaxe do shell nos parênteses)
- `pnpm test --reporter=dot src/components src/lib "src/app/(painel)" src/vendor src/db scripts` — 1717 passaram, 1 falhou (aviso antigo em `pagina.test.ts`)
- `pnpm test --reporter=dot "src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts"` — 21 de 21
- `pnpm test --reporter=dot src/app/api` — 347 de 347
- `pnpm test --reporter=dot src/modules/pedido-construcao src/modules/dados-pessoais src/modules/pacotes-decisao src/modules/demandas src/modules/historico src/modules/especificacoes src/modules/pareceres-risco src/modules/acesso` — 1329 de 1329
- `pnpm test --reporter=dot --reporter=junit --outputFile.junit=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/suite-final.xml` — 200 arquivos, 4414 de 4414
- `pnpm lint` — limpo
- `pnpm typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só os arquivos da Entrega
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot --reporter=junit --outputFile.junit=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/suite-final2.xml` — 4414 de 4414, 0 falhas

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
