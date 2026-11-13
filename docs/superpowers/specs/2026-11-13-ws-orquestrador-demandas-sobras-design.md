# ws-orquestrador-demandas — spec consolidada da 0.4.1: sobras da 0.1.13 e da revisão final da 0.4.0

Pedido `DEC-DEM-20261111-0018-v1` (DEM-20261111-0018, `melhoria`, risco **baixo**). Consolidado em 13/11/2026 a partir
das entregas da pasta `docs/construcao/DEC-DEM-20261111-0018-v1/` (`01-analista-requisitos.md`,
`02-arquiteto-solucoes.md`, `03-ux-ui-design.md` e `04-seguranca-aplicacao.md`) e do `pedido.json`, com o acréscimo de
Fabiano de 13/11 (itens 8 a 10).

Esta spec resume e amarra as quatro entregas. O detalhe fica nelas: critérios Dado/Quando/Então, wireframes e STRIDE
por componente. Cada bloco cita a origem entre parênteses, por exemplo (01, RF-03), (02, ADR-37), (03, 4.6) e
(04, SB-08). Onde duas entregas divergem, a seção 7.3 diz o que vale.

## 1. Objetivo

A revisão do pedido 0014 (0.1.13) deixou quatro sobras, e a revisão final do 0017 (0.4.0) deixou dois baixos. A 0.4.1
fecha esses itens sem processo, fila, job, pacote, variável de ambiente nem integração de saída novos (02, seção 1).

- **S-02.** O `/construir` passa a ter uma leitura que diz se o DEC do pedido que ele tem em mãos continua **vigente**
  ou foi **substituído** (01, RF-01).
- **S-03.** O D1 também recusa pelo nome do solicitante que valia quando o DEC foi criado. Hoje ele confere só o nome
  atual (01, RF-02).
- **S-04.** Arquivar o DEC mais novo, quando a demanda tem um aprovado vigente, deixa de encerrar a demanda. A decisão
  S1 de Fabiano está em 01, RF-03.
- **C-27.** O teste instável de `src/lib/deps-qa.test.ts` fica estável, sem asserção a menos (01, RF-04).
- **Textos da T11.** São revistos pela `ux-ui-design`, e entram os três avisos que faltam (01, RF-05 e RF-06).
- **B-08-1.** A fila passa a ler uma linha de andamento por demanda da página (01, RF-07).
- **B-08-2.** O `registrar-qa.test.ts` e os testes de segurança da 0.3.x e da 0.4.0 entram no piso de asserções (01,
  RF-08).
- **Spec, manual, CHANGELOG e versão** (01, RF-09 e RF-10).

**Base e versão.** A base é a `main` em `41108ee` (0.4.0, no ar desde 13/11), e o pedido sai como **0.4.1**. Pela
convenção, uma rota nova poderia pedir 0.5.0, mas vale a ESP (01, Pendência 9; ver 7.2). Há uma migration aditiva, a
`0010` (02, seção 8).

**Definição de pronto** (pedido.json):
- `pnpm test`, `pnpm lint` e `pnpm typecheck` verdes;
- `pnpm test:e2e` verde três vezes seguidas;
- migration aditiva com o ensaio de rollback aprovado;
- spec, manual (cap. 04 e 08), CHANGELOG e `package.json` na 0.4.1.

## 2. Requisitos e critérios de aceite

São 10 requisitos funcionais e 12 não funcionais. Os critérios Dado/Quando/Então estão em `01-analista-requisitos.md`,
seções 2 e 3. Os ids RF-NN, RNF-NN e CA-NN.n são **deste pedido**.

### 2.1 Situação de cada item contra a `main` 0.4.0 (01, seção 1)

| Item da ESP | Situação na 0.4.0 | RF |
|---|---|---|
| (1) S-02, rota de situação | Ainda vale, mas mudou de forma. A 0.3.0 tira o substituído dos pendentes e dá 409 na entrega, e a 0.4.0 dá 409 `decSubstituido` no andamento. Ainda falta uma leitura sem efeito colateral antes do primeiro envio, que também funcione com o envio desligado | RF-01 |
| (2) S-03, D1 com o nome da criação | Ainda vale, sem mudança. O DEC não guarda o nome, e o histórico não guarda o valor do `solicitanteNome`. O nome da criação não é recuperável para os DEC já criados | RF-02 |
| (3) S-04, arquivar o v2 | Ainda vale, sem mudança. `decisao_arquivada` leva sempre a `encerrada`, e a dica "vai para Encerrada" fica falsa com a regra nova | RF-03 |
| (4) C-27 | Ainda vale. O caso não mudou desde a 0.1.13 | RF-04 |
| (5) Textos da T11 | Ainda vale. Os três avisos não existem na T11 | RF-05, RF-06 |
| (6) Spec do sistema | Mudou de forma. As linhas-resumo já citam a substituição, mas os critérios continuam só no código e no manual | RF-09 |
| (7) CHANGELOG, `package.json` e manual | Ainda vale | RF-10 |
| (8) B-08-1 | Novo (13/11), vale | RF-07 |
| (9) B-08-2 | Novo (13/11), vale. Vários testes de segurança da 0.3.x também estão fora do piso | RF-08 |
| (10) Envio do andamento sem git | Fora deste repositório, com a outra frente | — |

### 2.2 Requisitos funcionais

| RF | Resumo | Critérios |
|---|---|---|
| RF-01 | `GET /api/pedidos-construcao/<DEC-id>/situacao`, só para a integração `construir`, por uma ação nova (`construir` de 4 para 5 ações). Resposta 200 `{ "situacao": "vigente" }` ou `{ "situacao": "substituido" }`. `vigente` usa a mesma definição do envio de andamento (`aprovadoVigente`). Só responde 200 com `pedido_gerado` por pessoa na demanda do próprio DEC. Os outros casos recebem o mesmo 404 de DEC inexistente, com corpo idêntico. Outro ator recebe 403. Não devolve status da demanda, id do substituto nem texto. DEC vigente de demanda em status final responde `vigente` | CA-01.1 a CA-01.6 |
| RF-02 | `conferirEMontarPedido` (na geração e na entrega) recusa com o 422 de hoje, com o caminho e o tipo `nome`, sem o valor, quando um texto escrito por pessoa contém o nome atual **ou** o nome em vigor na criação do DEC. Isso vale para o DEC criado a partir da 0.4.1. O DEC anterior confere só o nome atual | CA-02.1 a CA-02.5 |
| RF-03 | Ao arquivar o DEC mais novo, com a demanda numa das origens de `decisao_arquivada`: vai para `aprovada` se houver vigente atualizado, para `em_analise` se o vigente estiver desatualizado (decidido, 7.1) e para `encerrada` sem vigente, como hoje. Fora das origens, nada muda. Ator `sistema`. Devolver não muda. O v1 continua gerando. A dica e a chegada do Arquivar dizem o destino certo | CA-03.1 a CA-03.6 |
| RF-04 | Estabilizar o C-27 com a causa achada e registrada, sem retirar nem enfraquecer asserção. São 20 execuções seguidas, e a causa vai para o CHANGELOG | CA-04.1 a CA-04.4 |
| RF-05 | Textos revistos pela `ux-ui-design` (seção 5): selo, aviso e link do substituído; 409 do substituído; frase do histórico; linha 6 da orientação; 409 do S-01; dica e chegada do Arquivar. O código só troca as constantes | CA-05.1, CA-05.2 |
| RF-06 | Três avisos na T11, só informativos, que não habilitam nem escondem botão. (a) DEC pendente com aprovado vigente. (b) Aprovado vigente com DEC mais novo pendente. (c) DEC `cto` pendente com vigente `cto_e_administradora`. Em (c), o (a) não aparece | CA-06.1 a CA-06.5 |
| RF-07 | `andamentosDasDemandas` devolve a linha de maior `id` por demanda, lendo no máximo uma linha de `andamento_construcao` por demanda pelo índice atual. O teste de plano passa a exigir que não haja `Sort` sobre `andamento_construcao` e mantém as duas asserções de hoje | CA-07.1 a CA-07.3 |
| RF-08 | `registrar-qa.test.ts` entra no `PISO` com a contagem atual. A `qa-automacao` confere os candidatos de segurança (01, Pendência 7) e acrescenta os que forem. O piso só sobe | CA-08.1 a CA-08.3 |
| RF-09 | A spec do sistema recebe, como critérios escritos: A-02 revista e S-01 no RF-13; CA-22.x e D1 com o nome da criação no RF-22; o arquivamento no RF-07. A rota de situação vai para a spec das integrações (02, Decisões) | CA-09.1 |
| RF-10 | `package.json` 0.4.1; CHANGELOG com a causa do C-27; manual caps. 01, 02, 03, 04, 05, 08 e 09 e glossário ("situação do pedido"); `docs/operacao/tokens-de-integracao.md` | CA-10.1, CA-10.2 |

### 2.3 Requisitos não funcionais (01, seção 3)

| ID | Requisito | Verificação |
|---|---|---|
| RNF-01 | Rota de situação: p95 ≤ 500 ms em 50 chamadas seguidas na homologação | 09 ou maestro |
| RNF-02 | Rota de situação: prazo total de 8 s (`padrao`), 503 `indisponivel` sem gravar | CA-01.6 |
| RNF-03 | 200 com 1 chave e 2 valores possíveis; 404 com corpo idêntico nos 3 casos | bytes |
| RNF-04 | Rota de situação: 0 gravações e 1 linha de log por requisição | CA-01.5 |
| RNF-05 | Fila: p95 < 500 ms com 5.000 demandas e 6.000 linhas de andamento, antes e depois do RF-07 | desempenho |
| RNF-06 | C-27: 20 execuções seguidas sem falha; 0 asserção retirada | CA-04.1, CA-04.2 |
| RNF-07 | Matriz: `construir` com exatamente 5 ações, `awave` com 2; pessoa e agentes sem mudança | pares exatos |
| RNF-08 | Uma migration gerada e só aditiva, com o ensaio de rollback aprovado | ensaio |
| RNF-09 | Nome do solicitante (atual ou da criação) 0 vezes em log, Sentry, evento e erro | sentinela |
| RNF-10 | Axe sem violação na T11 nos estados novos, em 1280 × 720 e 390 × 844 | e2e |
| RNF-11 | Testes, lint e typecheck verdes; e2e verde em 3 execuções seguidas | pronto |
| RNF-12 | Textos em pt-BR | 03 |

### 2.4 Rastreabilidade: critério preliminar → RF → CA (01, seção 5)

| # | Critério preliminar | RF | CA |
|---|---|---|---|
| 1 | Token `construir` lê `vigente` e `substituido`; sem pedido gerado, 404; outro ator, 403 | RF-01 | CA-01.1 a CA-01.4 |
| 2 | DEC recusado pelo D1 continua recusado depois de trocar o `solicitanteNome` | RF-02 | CA-02.1 a CA-02.3 |
| 3 | Com o v1 aprovado e o v2 pendente, arquivar o v2 deixa a demanda em `aprovada`, e o v1 gera | RF-03 | CA-03.1, CA-03.2 (outro sentido: CA-03.3) |
| 4 | C-27 passa 20 vezes seguidas sem asserção retirada | RF-04 | CA-04.1, CA-04.2 |
| 5 | Os três avisos aparecem na T11 com os textos da `ux-ui-design` | RF-06 (texto: RF-05) | CA-06.1 a CA-06.5 |
| 6 | Fila lê uma linha de andamento por demanda, sem Sort sobre `andamento_construcao` | RF-07 | CA-07.2, CA-07.3 (resultado: CA-07.1) |
| 7 | `registrar-qa.test.ts` no PISO com a contagem atual | RF-08 | CA-08.1 (CA-08.2, CA-08.3) |

### 2.5 Glossário (01, seção 6; 03, seção 0)

- **Aprovado vigente:** o DEC de maior `versao` da demanda com decisão `aprovada`. É o único que gera o pedido. Na tela,
  o termo é "em vigor".
- **Substituído:** DEC `aprovada` que não é o vigente.
- **Situação do pedido:** `vigente` ou `substituido`, a resposta da rota nova. Não confundir com a "situação da
  construção" da 0.4.0, nem com o status da demanda. A palavra "situação" não aparece em texto de tela sobre vigência.
- **D1:** a conferência do nome do solicitante nos textos escritos por pessoa, na geração e na entrega do pedido.

## 3. Arquitetura e ADRs (02)

### 3.1 Componentes (02, seção 2)

| Componente | Mudança |
|---|---|
| `acesso/matriz.ts` | Ação `ler_situacao_pedido`, linha `SO_CONSTRUIR`. A matriz passa a ter 25 ações |
| `pedido-construcao/situacao.ts` (novo) e `app/api/pedidos-construcao/[decId]/situacao/route.ts` (novo) | Serviço só de leitura, com `executarComOrcamento(..., 'padrao')`, sem trava nem evento. Rota fina pelo `rota()` |
| `db/schema/decisao.ts` e `drizzle/0010_*` | Coluna `caminhos_com_nome_na_criacao text[]`, anulável, sem padrão, gerada por `pnpm db:generate`, sem migration custom |
| `pedido-construcao/montar.ts` | `textosDoPedido` e `textosDaCriacao` montados por uma função interna só, mais `caminhosDaCriacaoNoPedido` |
| `pacotes-decisao/criar.ts` | Na criação, sob a trava da demanda, grava os caminhos de `textosDaCriacao` que contêm o nome atual |
| `pedido-construcao/conferir.ts` | Lê a coluna no `select` que já existe, valida por Zod com lista de permissão e marca o texto com o nome atual **ou** com o caminho marcado. Coluna nula confere só o nome atual. Valor fora do formato dá erro interno (falha fechada) |
| `demandas/arquivamento.ts` (novo, puro) | `destinoDoArquivamento(status, estado)`, a única tabela do S-04, usada pelo servidor e pela T11 |
| `demandas/transicoes.ts` | `decisao_arquivada` sai de `AUTOMATICAS`; entra `mudarStatusPorArquivamento`. `MANUAIS` e as outras transições não mudam |
| `pacotes-decisao/substituido.ts` | `vigenteDaDemanda(db, demandaId)`, que devolve `{ id, nivel, desatualizado }` ou `null` |
| `pacotes-decisao/decidir.ts` | Na decisão `arquivada`: `gravarDecisao`, depois `vigenteDaDemanda`, depois `mudarStatusPorArquivamento`, sob a trava |
| `components/dados-da-decisao.ts`, `page.tsx` e `FormularioDecisao.tsx` da T11 | `avisosDeVigencia`, `dicaDoArquivar` e a chegada pelo status lido. A página lê `vigenteDaDemanda` depois de autorizar |
| `components/rotulos.ts`, `dados-do-pedido.ts`, `MENSAGENS_PEDIDO`, `MENSAGENS_DECISAO` | Só as constantes de texto da 03 |
| `andamento/consultas.ts` e `consultas.test.ts` | LATERAL; teste de plano sem `Sort` |
| `src/lib/deps-qa.test.ts` (e `test/banco.ts`, se a causa estiver lá) | C-27 |
| `test/estatico/piso-de-assercoes.test.ts` | B-08-2 e SB-14/SB-15 |
| Specs, manual, `tokens-de-integracao.md`, CHANGELOG e `package.json` | RF-09, RF-10. O cap. 01 recebe as ADR-36 a ADR-40 e a migration `0010` |

### 3.2 Fluxos-chave

- **Situação (02, 3.1).** Na `rota()`: regex (404 sem consulta), `resolverAtor` (401) e `autorizar` (403). No serviço,
  `autorizar` de novo, e depois, dentro do orçamento `padrao`, sem trava:
  1. `pedidoGeradoPorPessoa`: nulo dá 404.
  2. `demandaId` do DEC igual ao do evento: senão, o mesmo 404.
  3. `aprovadoVigente(...)?.id === decId` responde `vigente`; senão, `substituido`.
- **D1 com a criação (02, 3.2).** Os textos conferidos pelo D1 são imutáveis desde a criação. A cópia da demanda e as
  opções estão no DEC, e a ESP e o RSK são versões só de inclusão. Por isso o caminho marcado na criação continua
  apontando o mesmo texto, e só a opção escolhida depende da decisão. A coluna não entra em `montarPedido` (CA-02.4).
- **Arquivamento (02, 3.3).** Tabela `destinoDoArquivamento`:

| Estado do vigente | Origens que mudam | Destino |
|---|---|---|
| `nenhum` | `nova`, `em_analise`, `aguardando_informacao`, `pronta_para_decisao` | `encerrada` (como hoje) |
| `atualizado` | as mesmas quatro | `aprovada` (S1) |
| `desatualizado` | `nova`, `aguardando_informacao`, `pronta_para_decisao` | `em_analise` (7.1); com a demanda já em `em_analise`, nada muda e não sai evento |

- **Fila (02, 3.5).** Parte de `demanda`, com `cross join lateral (… where a.demanda_id = d.id order by a.id desc
  limit 1)`. A projeção é a lista `COLUNAS`. Lista vazia não consulta. Cada volta é um `Limit` sobre `Index Scan
  Backward`.
- **C-27 (02, 3.6).** Diagnóstico primeiro: a mensagem mostra `backend_type`, `usename` e `state`. A hipótese mais
  provável é um processo de fundo do Postgres (`autovacuum worker`) no banco recém-copiado. Correções aceitáveis:
  restringir a consulta a `backend_type = 'client backend'`, ou esperar por tentativas contadas. Proibido: filtrar por
  `usename`, trocar `toEqual` por `toContain` ou tirar o `distinct`.

### 3.3 ADRs (02, seção 9)

| ADR | Decisão | Descartadas |
|---|---|---|
| ADR-36 | Situação por leitura própria (`ler_situacao_pedido`), sem trava nem evento, com `aprovadoVigente`. A rota e o 409 do andamento nunca divergem | deduzir pelo 409 (não funciona com o envio desligado); situação na lista de pendentes (não alcança o pedido já recebido) |
| ADR-37 | O nome da criação fica guardado como **caminhos marcados** no DEC, sem copiar o nome. O DEC anterior à 0.4.1 fica com `null` e confere só o nome atual | coluna com o nome (cópia de dado pessoal); hash do nome (pouca entropia, continua dado pessoal pseudonimizado); marcação no `depois` do evento; preencher os antigos com o nome de hoje |
| ADR-38 | Destino do arquivamento por tabela pura, pelo estado do aprovado vigente, lida pelo servidor e pela T11 | duas entradas em `AUTOMATICAS` escolhidas por `if` |
| ADR-39 | Último andamento da página por LATERAL a partir de `demanda` | a partir de `unnest` (muda o parâmetro); `max(id)` e junção (duas passadas) |
| ADR-40 | Avisos da T11 por função pura, mais a leitura `vigenteDaDemanda` na página | nível no `PacoteResumo` (muda a API de pessoa e a vista mínima do agente) |

Stack sem desvio, e nenhum pacote novo. Porta de desenvolvimento: 3101.

### 3.4 Migration, ensaio e volta (02, seção 8)

- **Migration:** uma só, a `0010_*`, com `ADD COLUMN ... text[]` anulável e sem padrão. Nenhuma linha existente muda
  (`alteram_dado: false` esperado). O `GRANT` de tabela da `0003` já cobre a coluna nova.
- **Volta 0.4.1 → 0.4.0:** só pelo caminho B, restaurando o backup (`volta_sem_restaurar: false` esperado), como na
  0.4.0.

### 3.5 Integração tocada (02, seção 6)

`/construir` → `GET .../situacao`: o cliente espera 15 s, e o servidor tem prazo total de 8 s. Recomendação para a outra
frente, porque o lado do `/construir` fica fora deste pedido: **falhar fechado**. Com 503, erro de rede ou tempo
esgotado, não iniciar e tentar de novo. Com 404, tratar como fora do Orquestrador. Com 401 ou 403, parar a volta.

## 4. Interface (03)

Nenhum token, cor, componente ou variação nova. Os três avisos usam `Alerta` tipo `atencao`, estático, com link solto
(`CLASSE_LINK_SOLTO`). Ids só no formato de DEC, sem nome de pessoa (C-30). Termo de tela para a vigência: "em vigor".

### 4.1 Condições dos avisos (03, 4.2)

Os três avisos só aparecem com a demanda fora de status final.

| Aviso | Aparece quando, todas juntas | Link |
|---|---|---|
| (a) | o DEC aberto está pendente, é o mais novo e não está desatualizado; existe vigente; não é o caso (c) | "Abrir o pacote `<v>`" |
| (b) | o DEC aberto é o vigente; o mais novo é outro, pendente e não desatualizado; não é o caso de o pendente ser `cto` e o aberto `cto_e_administradora` | "Abrir o pacote `<p>`" |
| (c) | o DEC aberto está pendente, é o mais novo, não está desatualizado e é `cto`; o vigente é `cto_e_administradora` | "Criar pacote novo" |

Ordem na faixa de alertas: resultado de envio, lembrete, substituído, **(b)**, **(a) ou (c)**, desatualizado, rascunho
de agente.

### 4.2 Dica do Arquivar (03, 4.6) e chegada (03, 4.7)

| # | Condição | Texto da dica |
|---|---|---|
| 1 | status fora das origens | "Arquivar: a demanda continua em `<Status>`." |
| 2 | nas origens, com vigente atualizado | "Arquivar: a demanda vai para Aprovada, e `<v>` continua em vigor." |
| 3 | nas origens, com vigente desatualizado (decidido, 7.1) | "Arquivar: a demanda vai para Em análise, porque `<v>`, o pacote em vigor, está desatualizado." Com a demanda já em Em análise, vale a linha 1 |
| 4 | nas origens, sem vigente | "Arquivar: a demanda vai para Encerrada." (sem mudança) |

A chegada sai do status lido depois da ação, nunca da URL. São três textos:
- `encerrada`: "Pacote arquivado. A demanda foi para Encerrada.";
- `aprovada` com vigente atualizado: "Pacote arquivado. A demanda está em Aprovada, e `<v>` continua em vigor.";
- outro status: "Pacote arquivado. A demanda está em `<Status>`.".

### 4.3 Textos novos e alterados (03, seção 8; fonte do CA-05.1 e do CA-06.5)

| Onde | Constante | Texto |
|---|---|---|
| Aviso (a) | `TEXTOS_DECISAO.avisoVigente(v)` | "Esta demanda já tem um pacote aprovado em vigor: `<v>`. Quando a aprovação deste pacote ficar completa, ele passa a valer no lugar de `<v>`, e um pedido já gerado de `<v>` deixa de valer." |
| Aviso (b) | `TEXTOS_DECISAO.avisoMaisNovoPendente(p)` | "Há um pacote mais novo pendente nesta demanda: `<p>`. Quando a aprovação dele ficar completa, ele passa a valer no lugar deste, e um pedido já gerado deste pacote deixa de valer." |
| Aviso (c) | `TEXTOS_DECISAO.avisoNivelMenor(v)` | "A aprovação deste pacote será recusada: o pacote em vigor nesta demanda, `<v>`, exigiu a aprovação do CTO e da administradora, e um pacote só do CTO não pode substituí-lo. Você pode devolver ou arquivar este pacote. Para substituir `<v>`, crie um pacote novo com aprovação do CTO e da administradora." |
| Link de (a), (b) e do substituído (alterado) | `TEXTOS_DECISAO.abrirSubstituto(id)` | "Abrir o pacote `<id>`" |
| Link de (c) | `TEXTOS_DECISAO.criarPacoteNovo` | "Criar pacote novo" |
| Aviso do substituído (alterado) | `TEXTOS_DECISAO.substituido(id)` | "Este pacote foi substituído por `<id>`, aprovado depois dele, e não gera mais o Pedido de Construção. Se um pedido deste pacote já foi gerado, não o use. O pedido que vale é o de `<id>`." |
| Selo | `SELO_SUBSTITUIDO` | "Substituído" (sem mudança) |
| Dica do Arquivar | `dicaArquivarSemMudanca(status)`, `dicaArquivarAprovada(v)`, `dicaArquivarEmAnalise(v)`, `dicaArquivar` | seção 4.2 |
| Sucesso do arquivamento | `sucesso.arquivadaAprovada(v)`, `sucesso.arquivadaEm(status)`, `sucesso.arquivada` | seção 4.2 |
| 409 do S-01 (alterado) | `MENSAGENS_DECISAO.nivelMenorQueOVigente` | "o pacote aprovado em vigor nesta demanda exigiu a aprovação do CTO e da administradora, e um pacote só do CTO não pode substituí-lo. Devolva ou arquive este pacote, ou crie um pacote novo com aprovação do CTO e da administradora." |
| 409 do substituído (alterado) | `MENSAGENS_PEDIDO.substituido(id)` | "o pacote foi substituído por `<id>`, aprovado depois dele. Só o pacote aprovado mais novo gera o Pedido de Construção." |
| Linha 6, `cto` (alterado) | `ORIENTACAO.aviso` | "Depois de corrigir, crie um pacote novo e aprove-o. Aprovado, ele substitui este e passa a ser o único que gera o Pedido de Construção." |
| Linha 6, `cto_e_administradora` (novo) | `ORIENTACAO.avisoDupla` | "Depois de corrigir, crie um pacote novo com aprovação do CTO e da administradora e registre as duas aprovações. Com as duas, ele substitui este e passa a ser o único que gera o Pedido de Construção." |
| Histórico, com id (alterado) | `textoDoEvento` | "`<entidadeId>` foi substituído por `<substituidoPor>`, aprovado depois dele" |
| Histórico, sem id (alterado) | `textoDoEvento` | "`<entidadeId>` foi substituído por um pacote aprovado depois dele" |

- O 409 do S-01 continua sem id e sem nome.
- `orientacaoDoPedido` passa a receber o nível do DEC.
- Os comentários "para revisão da ux-ui-design" saem do código.

### 4.4 T05 (03, seção 6)

- A frase do histórico muda (4.3).
- O efeito do S-04 na barra de etapas e na Próxima ação foi decidido na seção 7.2.

### 4.5 Acessibilidade (03, seção 9)

- O aviso não é focável; só o link entra no Tab.
- Alvo de 44 px abaixo de 768 px.
- O nome do link leva o id inteiro, para que dois links "Abrir" na mesma página se distingam.
- `[overflow-wrap:anywhere]` no texto do aviso.
- O alerta é estático, sem `role="alert"`.
- Axe sem violação em 1280 × 720 e 390 × 844.

## 5. Ameaças e controles (04)

Os controles deste pedido usam o prefixo **SB-**. Os C-, CV-, IN-01 a IN-18 e AN-01 a AN-15 continuam valendo e **não
podem ser afrouxados**. Todos os SB são critério de aceite de alguma tarefa do plano (04, seção 6).

| Id | Nível | Controle (resumo; o texto verificável está em 04, seção 3) |
|---|---|---|
| SB-01 | crítica | A ação é só do `construir`, e ele não ganha outra. Pares exatos montados a partir da `MATRIZ`; `construir` com 5 ações e `awave` com 2. O 403 sai **sem consulta ao banco** (contagem pelo logger). Teste estático: a ação só aparece em `matriz.ts`, na `route.ts` nova, em `situacao.ts` e em testes |
| SB-02 | alta | Visibilidade e escopo iguais aos da entrega e do andamento (IN-10, AN-03). Os três 404 iguais byte a byte e com o mesmo número de consultas. Evento de outra demanda dá o mesmo 404 |
| SB-03 | alta | Resposta fechada, com valor literal calculado no código. Sem trava em `situacao.ts`. `no-store` e `nosniff`. Nada gravado em 200, 403, 404 ou 503. Com `travarPedido` segurado em outra conexão, responde em menos de 1 s |
| SB-04 | média | Prazo total não sobrescrito: sem `set local`, `set_config`, `comTransacao`, `executarComOrcamento` aninhado ou `Promise.all`. Relógio falso dá 503 |
| SB-05 | média | Log e Sentry sem o `decId`, sem `wsod_` e sem o prefixo do token. Sentinelas ampliadas à rota nova |
| SB-06 | alta | A situação informa, não autoriza. Só a `route.ts` importa o serviço. Os 409 da entrega e do andamento continuam. A rota responde `substituido` se e só se o andamento dá 409 `decSubstituido` |
| SB-07 | alta | A marcação da criação é feita só pelo servidor, sempre gravada e nunca alterada. A chave não existe em nenhum schema de entrada. Os três caminhos de criação gravam coluna **não nula**. Sem `UPDATE` para o papel do app. Duas conexões: criação × troca do nome |
| SB-08 | alta | O D1 nunca fica mais fraco. A coluna é lida com Zod e regex ancorada, sem `g`/`y`, e falha fechada (500). O teste de **igualdade**, e não só de subconjunto, entre `textosDaCriacao` traduzido e `textosDoPedido`. A opção não escolhida não recusa. Valores maliciosos inseridos pelo migrator dão 500 |
| SB-09 | alta | A coluna fica fora de toda vista e saída (vistas de pessoa e de agente a partir da `MATRIZ`, entrada do provedor, JSON do pedido, `depois` do evento) |
| SB-10 | média | Migration só aditiva, sem `GRANT`, sem custom e com `privilegios.ts` sem diff. Ensaio com `alteram_dado: false` e `volta_sem_restaurar: false` |
| SB-11 | alta | Arquivamento por `switch` exaustivo (9 status × 3 estados), com os destinos `encerrada`, `aprovada`, `em_analise` e `null`. `aprovada` só com o mesmo predicado da transição manual. Tudo sob a trava. Testes com duas conexões: × ESP nova e × mudança manual, 50 vezes, sem *deadlock* |
| SB-12 | média | A T11 só mostra valor conferido: `RE_ID_DEC`, `href` por constante, `Object.hasOwn` no rótulo, chegada pelo status do banco, sem `dangerouslySetInnerHTML`. `vigenteDaDemanda` só depois de autorizar. Os botões são iguais com e sem aviso |
| SB-13 | alta | LATERAL parametrizada, sem `sql.raw`, com a projeção `COLUNAS`, sem `id` e sem `ator_token_prefixo`. Id malicioso devolve mapa vazio |
| SB-14 | alta | O C-27 fica mais estável sem ficar mais fraco. Correções proibidas listadas. CA-04.3 como teste **permanente**. Mensagem de diagnóstico sem URL nem senha. `deps-qa.test.ts` entra no `PISO` |
| SB-15 | média | O piso só sobe e cobre os testes de segurança: `registrar-qa`, `deps-qa`, os candidatos e os testes novos deste pedido |
| SB-16 | alta | Nenhum controle afrouxado: diff vazio contra `41108ee` da lista de arquivos do SB-16. As únicas mudanças de teste aprovadas de antemão: o par novo da matriz, a rota nova no T13, `encerrada` → `aprovada` com vigente atualizado (S1) e os textos da 03 |
| SB-17 | média | Documentação sem valor secreto e com o escopo certo: o token `construir` lê a situação de todo DEC com pedido gerado; a rota é consultiva; os limites ficam registrados |

**Dados pessoais (04, seção 5):** o pedido não cria dado pessoal novo nem cópia nova do nome. A coluna
`caminhos_com_nome_na_criacao` não é dado pessoal em si. Por cautela, é tratada como acessória do D5, com a mesma base
legal (art. 7º, IX e VI), a mesma retenção (status final + 5 anos) e o mesmo expurgo do DEC. Isso não pede tela,
consentimento nem job novos.

**Plano (05) precisa conter (04, seção 6):**
- SB-01 antes da rota e do serviço; SB-02 a SB-06 na mesma tarefa da rota.
- SB-10 antes de SB-07 e SB-08, e SB-07 a SB-09 juntos ou seguidos.
- SB-14 numa tarefa própria, com a causa escrita antes da correção.
- Risco `alto` no `tarefas.json` para a matriz e a rota, o D1, o arquivamento e o C-27.
- O inventário do SB-11, os testes transversais e o diff do SB-16 em toda revisão de tarefa.

## 6. Fora do escopo

- O lado do `/construir` do S-02: a `00-inicio` parar com DEC substituído e o aviso por e-mail ficam com a outra frente.
  Eles dependem desta rota no ar.
- O `/construir` cancelar sozinho uma construção em curso.
- O item (10), envio do andamento sem git, é da estruturaAutonoma e está com a outra frente.
- A rota de situação dizer o status da demanda, o id do substituto ou um terceiro valor.
- Evento por consulta de situação e limite de taxa na rota nova.
- O EXP-01 da 0.4.0, que é decisão de produto aberta.
- As dívidas da 0.4.0 que não estão na ESP:
  - o comentário de `leitura.test.ts:244`;
  - os casos sem os CHECK;
  - "seis chaves" e o `a === null`;
  - a lista de status escrita à mão e a guarda de importações;
  - o ramo morto de `SecaoAndamento.tsx`;
  - `andamento-construir.spec.ts:288`.
- Os B-4 a B-7 da 0.3.0, os O-1 a O-3 e os códigos 6 a 10 da 0.3.1, os R-01 a R-11 da 0.2.0 e as capturas do cap. 08.
- A instabilidade de tempo de outros arquivos (só o C-27 está no pedido).
- Deploy, migration em produção, token e a P-04.
- Dica do Devolver fora das origens e "Aprovar" indisponível no caso (c): são pedido futuro (7.2).

## 7. Pendências e decisões

### 7.1 Decididas antes da Parada 1

| Ponto | Decisão | Origem |
|---|---|---|
| S-04 com o vigente desatualizado (01, Pendência 1) | **Em análise.** Recomendação do maestro, com a autorização de Fabiano de 13/11 para seguir as recomendações | 01, 02 (ADR-38), 03 (4.6), 04 (sem objeção) |
| Itens 8 e 9 (B-08-1 e B-08-2) | Entram no pedido | acréscimo de Fabiano, 13/11 |
| Item 10 (envio sem git) | Fora deste repositório, com a outra frente | acréscimo de Fabiano, 13/11 |

### 7.2 Decisões da Parada 1, com a recomendação do maestro

| # | Ponto | Recomendação do maestro |
|---|---|---|
| 1 | S-03 nos DEC já criados (01, Pendência 2; 02, ADR-37; 04, seção 4) | Opção (a): o DEC anterior à 0.4.1 confere só o nome atual, com o limite no manual (SB-17). A coluna guarda só caminhos, sem nome nem hash |
| 2 | Base legal e retenção da coluna nova | A do D5, que é o conteúdo do DEC: art. 7º, IX e VI; status final + 5 anos; expurgo junto com o DEC (04, seção 5). Nenhuma tela, consentimento ou job novo |
| 3 | Barra de etapas da T05 com o DEC mais novo arquivado e um vigente (03, 6.2, item 1) | **Entra neste pedido.** A etapa 4 mostra o vigente como "Aprovada, opção X", feita; sem isso, a tela contradiz a regra nova do S-04 |
| 4 | Próxima ação com destino Em análise (03, 6.2, item 2) | **Entra neste pedido.** A linha 6 ("Montar o pacote de decisão.") vale também com o DEC mais novo arquivado e a demanda fora de status final; consequência direta da decisão 7.1 |
| 5 | "Aprovar" indisponível no caso (c) (03, Pendências) | **Não entra.** O RF-06 manda o aviso só informar, e o 409 do S-01 continua sendo a barreira. Fica como pedido futuro para a `desenvolvimento-produto` |
| 6 | Dica do Devolver fora das origens (03, Pendências) | **Não entra:** não está na ESP. Pedido futuro, com a mesma solução da linha 1 da 4.2 |
| 7 | Versão 0.4.1 × 0.5.0 (01, Pendência 9) | **0.4.1**, como diz a ESP. A rota nova é interna, só do `construir`, e não muda nada para pessoa nem para o Awave |
| 8 | Onde fica a rota de situação na spec (01, RF-09) | Na spec das integrações (0.3.0), junto das outras rotas do `/construir` (02, Decisões) |
| 9 | DEC vigente em demanda em status final responde `vigente` (01, Pendência 4) | Aceito como limite, registrado no manual. A entrega e o andamento continuam recusando pelo status final (04, seção 4) |
| 10 | Prova do C-27, onde e com que carga (01, Pendência 5) | Vinte execuções do arquivo com o paralelismo de workers do CI, mais as rodadas completas da definição de pronto. Comando fora da lista Pode vai pela regra do maestro (§2, passo 3) |
| 11 | Risco residual (04, Pendências) | Aceite formal com a `gestao-riscos`, sem bloquear: (a) DEC anterior à 0.4.1 confere só o nome atual; (b) rota de situação sem limite de taxa; (c) substituição entre a resposta `vigente` e o início da construção. Todos baixos |

### 7.3 Divergências entre as entregas

| Ponto | 01 / 02 | 04 | O que vale |
|---|---|---|---|
| Teste de `textosDaCriacao` × `textosDoPedido` | 02, Pendência 4: subconjunto | SB-08: **igualdade** | **Igualdade.** Só ela pega o texto novo do pedido que ficou sem marcação |
| Coluna nula | 02: `null` para o DEC anterior | SB-07: todo DEC criado a partir da 0.4.1, pelos três caminhos, com a coluna **não nula** | As duas valem juntas. `null` só para o DEC anterior; teste que o prova nos três caminhos de criação |
| `deps-qa.test.ts` no piso | 01: só o `registrar-qa` e os candidatos | SB-14 e SB-15: o `deps-qa` também, e os testes novos deste pedido | **O da 04.** O C-27 é teste de segurança (C-27 do 0001, nível alto) |
| Dados para a T11 | 03: a forma (campo no resumo ou leitura) é da 02 | — | ADR-40: a leitura `vigenteDaDemanda` na página, sem mudar o `PacoteResumo` |

### 7.4 Para as etapas seguintes

- **`tech-lead` (05):**
  - o inventário do SB-11;
  - onde ficam os testes estáticos do SB-01, do SB-03 e do SB-04;
  - a contagem de consultas pelo logger do Drizzle;
  - conferir se o Drizzle 0.45.3 tem junção lateral tipada antes de quebrar a tarefa do RF-07;
  - `chegadaNaDecisao` passa a receber o status e o vigente, e `orientacaoDoPedido` passa a receber o nível;
  - os testes que mudam de sentido, aprovados de antemão (SB-16).
- **`qa-automacao`:** os candidatos ao piso da Pendência 7 de 01.
- **`documentacao-tecnica` (10):**
  - o limite dos DEC anteriores à 0.4.1;
  - `vigente` em status final;
  - as ADR-36 a ADR-40 e a `0010` no cap. 01;
  - a rota no cap. 09;
  - "em vigor" × "situação" no glossário.
- **Outra frente (`/construir`):** a `00-inicio` e o aviso por e-mail, com o cliente falhando fechado (02, seção 6;
  SB-06).
- **Pedido futuro do job de anonimização:** decidir se a coluna é mantida ou recalculada quando os textos do DEC forem
  anonimizados, e conferir que "Solicitante removido" não é tratado como nome pelo D1 (04, Pendências).
- **`seguranca-informacao` (fora deste pedido):** `x-real-ip` na rede interna do Easypanel e `pnpm audit` sem `--prod`,
  pendentes desde o 0016.
- **Texto do pedido:** nenhuma das quatro entregas achou instrução fora do escopo no `pedido.json`.
