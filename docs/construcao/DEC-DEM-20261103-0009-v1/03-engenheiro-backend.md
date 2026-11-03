---
pedido: DEC-DEM-20261103-0009-v1
etapa: 03-correcao
agente: engenheiro-backend
leu: [02-tech-lead.md, 01-qa-funcional.md, contrato-passagem.md, src/modules/demandas/consultas.ts, src/modules/pacotes-decisao/consultas.ts, src/modules/especificacoes/consultas.ts, src/modules/pareceres-risco/consultas.ts, src/modules/especificacoes/servico.ts, src/modules/pareceres-risco/servico.ts, src/modules/pacotes-decisao/criar.ts, src/modules/pacotes-decisao/schemas.ts, src/modules/especificacoes/schemas.ts, src/modules/demandas/schemas.ts, src/modules/demandas/transicoes.ts, src/modules/limites.ts, src/modules/acesso/matriz.ts, src/modules/dados-pessoais/minimizar.ts, src/modules/dados-pessoais/detectores.ts, src/modules/pedido-construcao/gerar.ts, src/modules/pedido-construcao/montar.ts, src/modules/pedido-construcao/conteudo.ts, src/db/schema/decisao.ts, src/lib/log.ts, src/lib/reduzir-erro.ts, src/instrumentation.ts, src/app/api/demandas/[id]/pacotes-decisao/route.ts, src/app/api/demandas/[id]/especificacoes/route.ts, src/app/api/demandas/[id]/pareceres-risco/route.ts, src/app/api/pacotes-decisao/route.ts, src/app/api/pacotes-decisao/[decId]/route.ts, src/app/api/especificacoes/[espId]/route.ts, src/app/api/pareceres-risco/[rskId]/route.ts, src/app/api/vistas-para-agente.test.ts, src/app/api/pacotes-decisao/pedido.test.ts, src/lib/log.test.ts, src/instrumentation.test.ts, test/requisicao.ts, test/estatico/projeto.test.ts, package.json]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

### Arquivos alterados

- `src/modules/demandas/consultas.ts`: exporta `nomesDoSolicitante`, `textoMinimo` e `textoMinimoOuNulo`. Acrescenta
  `listaMinima`, `listaMinimaOuNula` (a lista nula continua nula), `nomesDosSolicitantes(db, demandaIds)` (uma consulta
  com `inArray` em `demanda`, devolve um `Map`) e `nomesDaDemanda(db, id)`. `vistaDaDemandaPara` passa a usar `listaMinima`.
- `src/modules/pacotes-decisao/consultas.ts`: `vistaDoPacotePara(ator, v, nomes)`. Para quem não é pessoa, minimiza
  `demandaTitulo`, `demandaDescricao`, `resumoExecutivo`, `recomendacao`, `opcaoA` e `opcaoB` subcampo a subcampo
  (`opcaoMinima`, que não cria chave ausente), `decisao.comentarios`, `especificacaoCitada.criteriosAceitePreliminares` e
  `.definicaoDePronto`. Ids, sistema alvo, repositório, níveis, status e `rascunhosCitados` não mudam.
- `src/modules/especificacoes/consultas.ts`: `vistaDaEspecificacaoPara(ator, v, nomes)`, com os 15 campos de texto e de
  lista do passo 4 minimizados.
- `src/modules/pareceres-risco/consultas.ts`: `vistaDoParecerPara(ator, v, nomes)`, com `resumo`, os três comentários,
  `recomendacoesMitigacao`, `preCondicoes` e `envolverJuridicoOuAdministradoraQuando` minimizados.
- As 7 rotas do passo 6 passam os nomes. `GET /api/pacotes-decisao` monta um mapa por `demandaId` da página. Os três POST
  (`demandas/[id]/especificacoes`, `pareceres-risco` e `pacotes-decisao`) passam o 201 pela vista do ator, com os nomes da
  demanda do caminho. O `PATCH .../decisao` e o `pedido-construcao` não mudaram.
- `src/lib/reduzir-erro.ts`: exporta `lerCode` e acrescenta `erroJaReduzido`. O retorno de `reduzirErro` não muda.
- `src/lib/log.ts`: `normalizarErro` reduz também o objeto que não é `Error`: sai `{ classe: 'desconhecido' }`, com `code`
  só se passar no `FORMATO_CODE`. A exceção é o objeto que já chega na forma exata `{ classe, code? }` (desvio 1).
  O comentário foi atualizado.
- `package.json`: versão `0.1.8`.

### Testes criados e alterados

- `src/app/api/vistas-para-agente.test.ts`: novo describe "M-a" com 5 testes. Usa o dado fictício da 01 ("Joana Fictícia
  Teste", `joana.ficticia@exemplo.invalid`, `000.000.001-91`, `(11) 90000-0001`) em todos os campos de texto e de lista
  de ESP, RSK e DEC e no `comentarios` da decisão. Os 5 testes cobrem:
  - para o agente, nas 7 leituras, nenhum dos quatro fragmentos e os marcadores em cada campo;
  - para a pessoa, o texto original;
  - ids, sistema alvo, repositório, níveis, status e nível de aprovação iguais para os dois atores;
  - num cenário estudo, lista nula, recomendação e decisão nulas e subcampo opcional de `Opcao` ausente continuam assim;
  - no 201 dos três POST, o corpo minimizado para o agente (`insumo_tecnico`, `risco`, `consolidacao`) e original para a
    pessoa.

  As chamadas diretas às três vistas nos testes do M-2 passaram a receber o terceiro parâmetro.
- `src/app/api/pacotes-decisao/pedido.test.ts`: um teste em que o Pedido de Construção de um DEC com o nome do
  solicitante no texto mantém título, descrição, ESP, RSK, opção escolhida e critérios originais. Só o nome entra no
  texto: com e-mail, telefone ou CPF o pedido é recusado pelo C-28.
- `src/lib/log.test.ts`: três testes.
  - Objeto com `motivo` e `cpf` grava `{ classe: 'desconhecido' }`.
  - Com `code: '23505'`, grava `{ classe: 'desconhecido', code: '23505' }`. Com `code` fora do formato ou numérico, o
    `code` não sai.
  - Um erro que já chega reduzido mantém a classe. Com chave a mais ou classe fora do formato, vira `desconhecido`.

  As duas verificações da segunda barreira (`redact`) passaram do campo `erro` para o campo `instancia`, porque o `erro`
  em objeto não chega mais ao pino.
- `test/estatico/projeto.test.ts`: versão esperada `0.1.8`.

### Teste antes do código (visto falhando)

1. `pnpm -C <repo> test src/lib/log.test.ts src/app/api/vistas-para-agente.test.ts src/app/api/pacotes-decisao/pedido.test.ts --reporter=dot`
   na 0.1.7 deu 5 falhas:
   - `log.test.ts > erro em objeto simples vira { classe: desconhecido }`: `+ "cpf": "000.000.001-91", + "motivo": "falha para joana.ficticia@exemplo.invalid"`;
   - `log.test.ts > erro em objeto simples com code no formato leva só o code`;
   - `vistas-para-agente.test.ts > M-a > agente: nenhum dos quatro fragmentos...`: `expected '{"id":"ESP-DEM-20261022-0003-v1",...' not to contain 'Joana Fictícia Teste'`;
   - mais 2 testes M-a: o cenário estudo e o 201 dos POST.

   O teste do pedido passou já na 0.1.7. Ele protege o que não pode mudar e não reproduz o defeito.
2. Depois da correção, os 3 arquivos passaram: 64 de 64.
3. A 1ª suíte inteira deu 2 falhas, 3913 de 3915:
   - `test/estatico/projeto.test.ts`: a versão fixada em 0.1.7;
   - `src/instrumentation.test.ts`: `"classe": "Error"` virou `"desconhecido"`, porque o `instrumentation.ts` passa
     `reduzirErro(err)`, um objeto simples.
4. Escrevi o teste do erro já reduzido e o vi falhar. `log.test.ts` e `instrumentation.test.ts` falharam com `classe`
   `desconhecido` no lugar de `ErroEnvioEmail` e `Error`: 2 falhas, 55 de 57. Depois do `erroJaReduzido`, os 4
   arquivos passaram: 62 de 62.

### Resultado final

- `pnpm test` (suíte inteira): 3916 de 3916, 0 falhas.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.

### Desvios do plano, com a razão

1. **`erroJaReduzido` no B-b.** Pela regra literal da 02, o objeto simples sempre vira `desconhecido`. Mas
   `src/instrumentation.ts:53` (B-1 do 0008) já passa ao log `reduzirErro(err)`, um objeto simples, e com a regra literal
   a classe real se perderia: o `instrumentation.test.ts` quebrou. Só a forma exata `{ classe, code? }`, com a classe no
   formato de identificador e o `code` por `lerCode`, mantém a classe. Qualquer outra chave vira `desconhecido`, então
   `motivo` e `cpf` continuam fora. A regex não foi copiada: a função fica em `reduzir-erro.ts`, ao lado de
   `FORMATO_CLASSE`. Não mexi no `instrumentation.ts` porque outro ponto que passe o erro já reduzido também perderia a
   classe, e não pude procurar esses pontos (abaixo).
2. **`listaMinima` e `nomesDaDemanda`**, além do que a 02 pediu. `listaMinima` atende as listas que não podem ser nulas
   (escopo, dúvidas, recomendações, pré-condições), sem `.map` repetido em cada vista. `nomesDaDemanda` evita repetir
   `mapa.get(id) ?? []` em seis rotas.
3. **`test/estatico/projeto.test.ts` alterado.** É a consequência direta do item 8 da 02 (versão 0.1.8).

### Conferências da 02

- O POST de `pareceres-risco/route.ts` (linha 12) devolvia o retorno de `criarParecerRisco` direto. Agora passa pela
  vista.
- `criarEspecificacao` e `criarParecerRisco` devolvem `obterEspecificacao` e `obterParecerRisco`, já com
  `versaoMaisNova` e `especificacaoMaisNova`. A vista mínima mantém essas chaves.
- O `typecheck` limpo com o terceiro parâmetro obrigatório confirma que não há outro chamador das três vistas. O gerar
  do Pedido continua em `vistaDe` e `obterPacoteDecisao`, sem a vista do ator.

## Decisões tomadas

- `nomes` é obrigatório nas três vistas, para que o compilador acuse qualquer rota que esqueça de passar.
- Os nomes ficam fora de `PacoteDecisaoVista`, `EspecificacaoVista` e `ParecerRiscoVista`, como manda a 02. A vista da
  pessoa e o Pedido de Construção não mudam.
- Os nomes são lidos também para a pessoa: é uma consulta curta por requisição, e a rota não precisa de um ramo por ator.
- Na fila, os nomes saem de uma consulta só para a página inteira (`inArray`), sem uma consulta por item.
- Nos POST, os nomes são lidos depois da gravação, fora da transação do serviço. A demanda já existe e o nome não muda
  com a criação de ESP, RSK ou DEC.
- Em `opcaoMinima`, o subcampo opcional só entra quando veio, para a chave ausente continuar ausente.
- O resumo da suíte inteira não aparece na saída do terminal, que é cortada: o log do pino vai direto ao fd 1. Para ler
  o total e as falhas, rodei `pnpm test` com o reporter `junit` gravando no scratchpad da sessão. Usei também um reporter
  de apoio que escrevi no scratchpad (`falhas.mjs`), que grava só os testes que falharam. Nenhum dos dois fica no
  repositório.

## Pendências

- Não consegui procurar no código, porque Grep e Glob não estavam disponíveis nesta sessão e `git grep` está fora da lista
  Pode. Por isso não sei se, além do `instrumentation.ts`, há outro ponto que passa `erro` em objeto simples ao log. O
  `erroJaReduzido` (desvio 1) cobre o caso do erro já reduzido. Um objeto com outras chaves passa a sair como
  `desconhecido`, que é o que o B-b pede. A suíte inteira passou.
- O `CHANGELOG.md` da 0.1.8 fica com a `06-documentacao`, e o e2e com a `04-regressao`, como na tabela da 02.

## Comandos executados

- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test -- src/lib/log.test.ts src/app/api/vistas-para-agente.test.ts src/app/api/pacotes-decisao/pedido.test.ts`: o `--` fez rodar a suíte inteira, na 0.1.7 com os testes novos; terminou com falha e a saída foi cortada
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/log.test.ts src/app/api/vistas-para-agente.test.ts src/app/api/pacotes-decisao/pedido.test.ts --reporter=dot`: antes da correção, 5 falhas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck`: 1 erro de tipo no teste novo (`dec` possivelmente indefinido), corrigido
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck`: limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/log.test.ts src/app/api/vistas-para-agente.test.ts src/app/api/pacotes-decisao/pedido.test.ts --reporter=dot`: 64 de 64
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint`: limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot --silent`: suíte inteira; terminou com falha e o resumo foi cortado na saída
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=json --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/suite.json`: suíte inteira; o arquivo saiu numa linha só, grande demais para ler
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/suite.xml`: 3913 de 3915, 2 falhas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test scripts --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/t.xml`: o filtro casou com a suíte inteira; 3913 de 3915, 2 falhas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/falhas.mjs --reporter=junit --outputFile.junit=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/suite2.xml`: 2 falhas, em `projeto.test.ts` (versão) e `instrumentation.test.ts` (classe)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/log.test.ts src/instrumentation.test.ts test/estatico/projeto.test.ts --reporter=dot`: antes do `erroJaReduzido`, 2 falhas, 55 de 57
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/log.test.ts src/instrumentation.test.ts test/estatico/projeto.test.ts src/lib/reduzir-erro.test.ts --reporter=dot`: 62 de 62
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint`: limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck`: limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/falhas.mjs --reporter=junit --outputFile.junit=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/suite3.xml`: suíte inteira, 3916 de 3916, 0 falhas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short`: só os arquivos da correção

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
