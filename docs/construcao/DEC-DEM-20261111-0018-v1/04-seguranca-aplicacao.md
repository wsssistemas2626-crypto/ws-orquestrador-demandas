---
pedido: DEC-DEM-20261111-0018-v1
etapa: 04-ameacas
agente: seguranca-aplicacao
leu: [pedido.json, 01-analista-requisitos.md, 02-arquiteto-solucoes.md, 03-ux-ui-design.md, padrao-tecnico.md, contrato-passagem.md, DEC-DEM-20261111-0017-v1/04-seguranca-aplicacao.md, DEC-DEM-20261022-0001-v1/04-seguranca-aplicacao.md (seções 1, 2.12 a 2.17, 3 e 4), src/modules/acesso/matriz.ts, src/modules/acesso/resolver-ator.ts, src/lib/rota.ts, src/modules/pedido-construcao/pendentes.ts, src/modules/pedido-construcao/entregar.ts, src/modules/pedido-construcao/conferir.ts, src/modules/pedido-construcao/montar.ts, src/modules/andamento/registrar.ts, src/modules/andamento/consultas.ts, src/modules/pacotes-decisao/substituido.ts, src/modules/pacotes-decisao/criar.ts, src/modules/pacotes-decisao/decidir.ts, src/modules/demandas/transicoes.ts, src/modules/demandas/confirmacao.ts, src/modules/retencao/expurgar.ts, src/app/(painel)/pacotes-decisao/[decId]/page.tsx (linhas 1-120), src/lib/deps-qa.test.ts, test/estatico/piso-de-assercoes.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Modelo de ameaças da 0.4.1 do WS Orquestrador de Demandas (sobras da 0.1.13 e da revisão final da 0.4.0), sobre os
componentes da seção 2 de `02-arquiteto-solucoes.md` e as telas de `03-ux-ui-design.md`. Base: `main` em `41108ee`
(0.4.0). Referências: OWASP Top 10 2021 (A01, A03, A04, A05, A08, A09), OWASP API Security Top 10 2023 (API1 BOLA, API3
BOPLA, API4, API5 BFLA), OWASP ASVS 4.0.3 nível 2 (V1.11, V4, V5, V7, V8) e LGPD. Nível = nível da ameaça **antes** do
controle; na dúvida, o mais alto.

Os controles deste pedido usam o prefixo **SB-**, para não colidir com C-01 a C-40, CV-, IN-01 a IN-18, M-, B-, A-, S- e
AN-01 a AN-15, que continuam valendo e **não podem ser afrouxados**.

Achados da leitura do código que viraram controle (o desenho de 02 não os cobria por inteiro):

1. **O C-27 é um teste de segurança fora do piso.** `src/lib/deps-qa.test.ts:29-46` é a prova do controle C-27 do 0001
   (o app nunca conecta com a credencial do migrator; ameaça S de nível alto em 2.14 do 0001). O arquivo não está no
   `PISO` (`piso-de-assercoes.test.ts:8-93`). "Estabilizar" esse caso é exatamente o tipo de mudança que pode esconder o
   problema real. Ficam as correções proibidas, a prova negativa permanente e a entrada no piso (SB-14).
2. **Subconjunto não basta.** A Pendência 4 de 02 pede que os caminhos de `textosDaCriacao`, traduzidos, sejam
   **subconjunto** dos de `textosDoPedido`. Isso impede marcar caminho que não existe, mas não impede que um texto novo
   entre no pedido sem entrar na marcação da criação, e aí o S-03 enfraquece em silêncio. O teste tem de ser de
   **igualdade** (SB-08).
3. **Coluna nula por esquecimento.** `null` significa "DEC anterior à 0.4.1, confere só o nome atual". Um caminho de
   criação novo, ou o do worker, que grave `null` rebaixa o D1 sem nenhum teste vermelho. Todo DEC criado a partir da
   0.4.1, pelos três caminhos, tem a coluna não nula (SB-07).
4. **Coluna e vista.** `ler_pacote_decisao` é `LEITURA`, aberta aos quatro agentes (`matriz.ts:63`). Se a vista do DEC
   passar a copiar a linha inteira, a coluna sai para agente. Ela não tem dado pessoal, mas diz quais textos do DEC
   citam o solicitante. Fica fora de toda vista e saída, provado a partir da matriz (SB-09).

### 1. Fronteiras de confiança tocadas

| # | Fronteira | O que muda neste pedido |
|---|---|---|
| F2 | `/construir` → API (Bearer `wsod_`, sem cookie) | Nova **leitura** do token `construir`: um enum por DEC com pedido gerado. O `construir` passa de 4 para 5 ações |
| F1/F6 | Painel (pessoa com 2FA) → T11 | Três avisos, dica e chegada do Arquivar com ids de outros DEC da mesma demanda; uma leitura nova na página |
| F7 | App → Postgres | Migration aditiva: coluna `caminhos_com_nome_na_criacao text[]` em `pacote_decisao`, sem GRANT novo |
| F5 | App → Pedido de Construção | O D1 passa a recusar também pelo nome da criação; o JSON do pedido não muda |
| — | Testes → banco do teste | A correção do C-27 mexe na prova de que o app não usa o papel do migrator |

### 2. STRIDE por componente (seção 2 de 02)

#### K01 Matriz de acesso (`src/modules/acesso/matriz.ts`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| E | `ler_situacao_pedido` nascendo aberta a agente, pessoa ou `awave` (BFLA), ou reaproveitando uma linha existente (`LEITURA`) | crítica | SB-01 |
| E | O `construir` ganhando, junto, outra ação (por exemplo `ler_pacote_decisao` "para conferir") | crítica | SB-01 |
| T | Server Action ou job chamando a ação nova | alta | SB-01 |
| S, R, I, D | Nenhuma própria | baixa | — |

#### K02 Rota de situação (`src/app/api/pedidos-construcao/[decId]/situacao/route.ts`, `rota()` sem mudança)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Cookie com Bearer, Bearer na query, token revogado: comportamento diferente das outras rotas do `/construir` | alta | SB-16 (C-09 e `rota()` sem diff) |
| I | Corpo do 200 com mais que o enum (status da demanda, id do substituto, texto), ou valor cru do banco | alta | SB-03 |
| I | Oráculo: 403 de outro ator depois de consultar o DEC; 404 diferente entre inexistente, sem pedido e pedido de não pessoa (corpo, cabeçalho ou número de consultas) | alta | SB-01, SB-02 |
| I | Linha de log com o `decId` no campo de rota; 5xx com texto do Postgres no Sentry | média | SB-05 |
| D | Leitura sem prazo total, ou presa atrás de trava de entrega ou de andamento | média | SB-04 |
| T, R, E | Nenhuma: só leitura (SB-03 prova que nada é gravado) | baixa | — |

#### K03 Serviço de situação (`src/modules/pedido-construcao/situacao.ts`, com `pedidoGeradoPorPessoa` e `aprovadoVigente`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Situação respondida para DEC sem `pedido_gerado` de pessoa (pedido escrito direto, evento de agente) | alta | SB-02 |
| I | Situação respondida para DEC cujo evento aponta outra demanda (vínculo DEC ↔ demanda não conferido, a lição do AN-03) | alta | SB-02 |
| T | A rota respondendo `vigente` onde o andamento responde 409 `decSubstituido` (duas definições de vigente) | média | SB-06 |
| T | O `/construir` (ou código do próprio Orquestrador) passando a tratar a resposta como autorização, e as barreiras do servidor (409 da entrega e do andamento) sendo removidas por redundância | alta | SB-06 |
| D | `set local`, `comTransacao` próprio ou transação de quem chama devolvendo o piso por cima do restante do prazo (a lição do AN-06) | média | SB-04 |
| E | Serviço chamado direto, sem a rota, por outro ator | alta | SB-01 (`autorizar` também no serviço) |
| R | Nenhuma: leitura sem evento é decisão do 01 (o histórico não cresce a cada volta) | baixa | — |

#### K04 Esquema e migration (`src/db/schema/decisao.ts`, `drizzle/0010_*`, `drizzle/meta/`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| T | Coluna alterada depois do insert (apagar a marcação para liberar o pedido) | alta | SB-07 (sem `UPDATE` para o papel do app; `imutabilidade` com a coluna) |
| E | GRANT a mais, coluna em `colunasUpdate`, migration custom desnecessária | média | SB-10 |
| T | Migration que altera dado existente (preencher os antigos com o nome de hoje) ou edita migration da `main` | média | SB-10 |
| I | Coluna guardando o nome, ou hash do nome, em vez dos caminhos | alta | SB-07, seção 5 |
| S, R, D | Nenhuma | baixa | — |

#### K05 Montagem dos textos (`src/modules/pedido-construcao/montar.ts`: `textosDaCriacao`, `caminhosDaCriacaoNoPedido`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| T | `textosDaCriacao` divergindo de `textosDoPedido`: texto novo no pedido sem marcação na criação (o achado 2) | alta | SB-08 |
| T | Tradução de `opcao<X>.descricao` marcando a opção não escolhida como `decisao.opcaoEscolhida` (recusa indevida) ou deixando de marcar a escolhida | média | SB-08 |
| I | Nome ou valor do texto voltando junto com o caminho | média | SB-07, SB-08 |
| S, R, D, E | Nenhuma | baixa | — |

#### K06 Criação do DEC (`src/modules/pacotes-decisao/criar.ts`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| T | Marcação vinda do corpo da requisição, da saída do modelo ou de `extras` (C-11, C-25) | alta | SB-07 |
| T | Caminho de criação (rota de pessoa, rota de agente, worker) gravando `null` e rebaixando o D1 (o achado 3) | alta | SB-07 |
| T | Nome lido fora da linha travada (corrida com a troca do `solicitanteNome`) | média | SB-07 |
| I | Nome no log, no Sentry, no evento `pacote_decisao_criado` ou no erro da criação | alta | SB-07, SB-09 |
| D | Duas leituras a mais (ESP e RSK) sob a trava da demanda | baixa | leituras pela PK; prazo das transações de hoje |
| S, R, E | Nenhuma nova | baixa | — |

#### K07 Conferência do pedido (`src/modules/pedido-construcao/conferir.ts`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| T | Coluna fora do formato tratada como `null` ou `[]`, liberando o pedido (falha aberta) | alta | SB-08 |
| T | O D1 ficando mais fraco que na 0.4.0 em algum caso (o OU virando E, a ordem dos erros mudando o 422) | alta | SB-08 |
| I | Nome antigo ou atual no 422, no log, no Sentry ou no histórico; valor da coluna no Sentry do 500 | alta | SB-08, SB-09 |
| I | Coluna entrando no JSON do pedido (quebra do CA-22.2 e do CA-02.4) | média | SB-09 |
| T | Regex da lista de permissão com flag `g` ou `y` (o `lastIndex` faz `test` alternar entre verdadeiro e falso) ou sem âncoras | média | SB-08 |
| S, R, D, E | Nenhuma nova | baixa | — |

#### K08 Regra do arquivamento (`src/modules/demandas/arquivamento.ts`, `transicoes.ts`, `substituido.ts`: `vigenteDaDemanda`, `decidir.ts`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| T | Tabela incompleta: status não previsto caindo em `aprovada`, ou destino `em_construcao`, `entregue` ou `devolvida` | alta | SB-11 |
| T | `aprovada` com o vigente desatualizado, ou com DEC só com a primeira das duas aprovações contado como vigente | alta | SB-11 |
| T | Estado do vigente lido antes da trava ou antes de `gravarDecisao` (corrida com ESP ou RSK nova) | alta | SB-11 |
| T | `MANUAIS`, as outras `AUTOMATICAS` ou as do `construir` mudando junto | média | SB-11, SB-16 |
| E | Arquivar virando atalho para `aprovada` fora da regra da transição manual | média | SB-11 (`aprovada` só com o mesmo predicado da transição manual: aprovado completo e atualizado) |
| R | `status_alterado` sem o ator `sistema` | baixa | SB-11 |
| S, I, D | Nenhuma | baixa | — |

#### K09 Tela T11 (`src/components/dados-da-decisao.ts`, `page.tsx`, `FormularioDecisao.tsx`, `rotulos.ts`, `dados-do-pedido.ts`, `MENSAGENS_PEDIDO`, `MENSAGENS_DECISAO`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| T | Link dos avisos montado com valor fora de `RE_ID_DEC` ou `RE_ID_DEMANDA`; `dangerouslySetInnerHTML`; rótulo por chave sem conferir (`ROTULO_STATUS['__proto__']`) | média | SB-12, CV-19 |
| T | Texto da chegada escolhido por parâmetro da URL (texto refletido) | média | SB-12 |
| I | Id do vigente ou nome de pessoa no 409 do S-01; nome de pessoa em qualquer texto novo | média | SB-12 |
| I | Leitura nova (`vigenteDaDemanda`) antes de `exigirPessoaNaPagina` e `autorizar` | alta | SB-12, C-04 |
| E | Aviso escondendo ou habilitando botão (a regra da tela substituindo a do servidor) | média | SB-12 |
| S, R, D | Nenhuma nova | baixa | — |

#### K10 Leitura da fila (`src/modules/andamento/consultas.ts`, `consultas.test.ts`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| T | LATERAL pelo template `sql` com ids interpolados ou `sql.raw` (injeção) | alta | SB-13 |
| I | Coluna `id` ou `ator_token_prefixo` saindo pela consulta nova (`select u.*`) | média | SB-13 |
| T | Resultado diferente da 0.4.0 (empate de `gravado_em`, demanda sem andamento) | baixa | SB-13 |
| I | A função passando a servir leitura de agente ou do Awave | média | SB-13, AN-09 |
| S, R, D, E | Nenhuma (D melhora: uma linha por demanda) | baixa | — |

#### K11 Teste do C-27 (`src/lib/deps-qa.test.ts`, `test/banco.ts` se a causa estiver lá)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | "Correção" que esconde o app conectando como migrator: filtro por `usename`, `toContain`, sem `distinct`, `retry`, `skip` ou `fails` | alta | SB-14 |
| I | Mensagem de diagnóstico da falha com `query`, `client_addr`, `application_name` ou a URL com senha | média | SB-14 |
| T | Causa "corrigida" em `src/lib/deps.ts` abrindo caminho para ler `DATABASE_URL_MIGRATOR` | alta | SB-14 |
| R, D, E | Nenhuma | baixa | — |

#### K12 Piso de asserções (`test/estatico/piso-de-assercoes.test.ts`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| T | Entrada removida ou valor diminuído na mesma mudança que acrescenta outras | média | SB-15 |
| R | Teste de segurança da 0.3.x, da 0.4.0 ou deste pedido fora do piso, perdendo asserção sem ninguém ver | média | SB-15 |
| S, I, D, E | Nenhuma | baixa | — |

#### K13 Spec, manual, operação, CHANGELOG e versão

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| I | Token, hash, valor de `.env` ou nome de pessoa em exemplo de chamada da rota nova | alta | SB-17, C-39 |
| T | Documentação dizendo que a rota de situação autoriza a construção, ou que o token `construir` "só lê o que está pendente" | média | SB-06, SB-17 |
| T | Limite dos DEC anteriores à 0.4.1 (só o nome atual) não registrado | baixa | SB-17 |
| S, R, D, E | Nenhuma | baixa | — |

#### Integrações (seção 6 de 02)

| Integração | Ameaça | Nível | Controle |
|---|---|---|---|
| `/construir` → `GET .../situacao` | Token lido por agente do `/construir` com Bash: passa a ler também um bit por DEC com pedido gerado | baixa | SB-01 a SB-03; o que o token já entrega (o pedido inteiro) é maior que esse bit; risco do arquivo do token já registrado (P-04) |
| `/construir` → `GET .../situacao` | Lado do cliente falhando aberto (503, rede ou tempo esgotado tratados como `vigente`) | média | SB-06 (recomendação para a outra frente, fora deste repositório) |
| `/construir` → `GET .../situacao` | Leituras em série sem limite de taxa disputando o pool | baixa | SB-04 (8 s, sem trava); risco residual (Pendências) |
| `/construir` → entrega, recebimento, pendentes e andamento | Mudança indireta pelo D1 mais forte | baixa | SB-08 (só recusa mais) |

### 3. Controles exigidos

Todos são critério de aceite de alguma tarefa do plano. "Teste" é Vitest com Testcontainers quando toca o banco, ou
Playwright contra a homologação, sempre com dado e token fictícios. "Duas conexões" quer dizer duas transações reais no
Postgres do teste. "Diff" é contra `41108ee`.

| Id | Nível | Controle (critério verificável) | Cobre |
|---|---|---|---|
| SB-01 | crítica | **Ação só do `construir`, e ele não ganha outra.** `ACOES` ganha `ler_situacao_pedido`; a linha é `SO_CONSTRUIR`; o diff de `matriz.ts` tem uma linha em `ACOES`, uma em `MATRIZ` e o comentário. `situacaoDoPedido` chama `autorizar(ator, 'ler_situacao_pedido')` na primeira linha, antes de abrir transação. Testes: (a) os pares (ação, integração) permitidos, montados a partir de `MATRIZ`, são exatamente os seis da 0.4.0 mais `ler_situacao_pedido:construir`; (b) o `construir` tem exatamente cinco ações e o `awave` exatamente duas; (c) o T13 chama a rota nova com `awave`, os quatro agentes, `cto` e `administradora` (sessão, 2FA) e espera 403 **sem consulta ao banco** (contagem de consultas pelo logger do Drizzle igual a zero depois de `resolverAtor`); (d) o `construir` continua 403 em toda rota de outra ação, inclusive `ler_demanda` e `ler_pacote_decisao`; (e) ator com integração fora da lista negado; (f) teste estático: `ler_situacao_pedido` só aparece em `matriz.ts`, na `route.ts` nova, em `situacao.ts` e em testes; nenhum arquivo `'use server'` nem job o cita | K01, K03 E |
| SB-02 | alta | **Visibilidade e escopo da leitura nova, sem oráculo.** O conjunto de DEC que o `construir` consegue consultar é exatamente o da entrega e do andamento (IN-10 e AN-03): dentro da transação, `pedidoGeradoPorPessoa(tx, decId)`; nulo → 404 `nao_encontrado` com `MENSAGEM_NAO_ENCONTRADO`; depois, o `demanda_id` de `pacote_decisao` comparado com o do evento; ausente ou diferente → o **mesmo** 404. Não filtra status final nem substituído (por desenho: Pendência 4 de 01 e motivo do S-02). Id fora do formato → 404 de `rota()` sem tocar o banco. Testes: (a) os três casos do CA-01.3 comparados **byte a byte** entre si (status, corpo e cabeçalhos) e com o 404 de DEC inexistente da entrega e do andamento; (b) os três casos fazem o **mesmo número de consultas** (uma), pela contagem do logger do Drizzle; (c) `pedido_gerado` de pessoa inserido pelo migrator com `demanda_id` de outra demanda → o mesmo 404; (d) DEC substituído e DEC vigente de demanda `encerrada` → 200 com o enum (o escopo documentado em SB-17) | K02 I, K03 S e I |
| SB-03 | alta | **Resposta fechada e só leitura.** O 200 é montado chave a chave: `{ situacao }`, com valor de um tipo literal `'vigente' \| 'substituido'` calculado no código (`aprovadoVigente(...)?.id === decId`), nunca um valor lido do banco. Sem `travarPedido`, `travarDemanda`, `for update` nem `pg_advisory_xact_lock` em `situacao.ts` (teste estático por texto). Testes: (a) o corpo do 200 é igual byte a byte a `{"situacao":"vigente"}` ou a `{"situacao":"substituido"}`; (b) cabeçalhos `cache-control: no-store`, `x-content-type-options: nosniff`, sem `access-control-*`; (c) para 200, 403, 404 e 503: contagem de linhas de `evento`, `andamento_construcao`, `pacote_decisao` e `decisao` igual antes e depois, e `demanda.atualizada_em` igual (CA-01.5); (d) com uma entrega do mesmo DEC segurando `travarPedido` em outra conexão, a rota responde em menos de 1 s | K02 I e D, K03 |
| SB-04 | média | **Prazo total não sobrescrito.** A rota chama o serviço sem transação; o serviço usa `executarComOrcamento(deps.pool, ator, 'padrao', undefined, …)` e não tem parâmetro `t`. Em `situacao.ts`: nenhum `set local`, `set_config`, `comTransacao`, `executarComOrcamento` aninhado nem `Promise.all` (o teste estático do AN-06 passa a cobrir o arquivo). Teste com relógio monotônico falso (molde de `prazo-total-0019.test.ts`): prazo vencido → 503 `indisponivel` com `MENSAGEM_INDISPONIVEL` e nada gravado (CA-01.6) | K02 D, K03 D |
| SB-05 | média | **Log e Sentry sem id.** A linha de `rota()` leva `rota: '/api/pedidos-construcao/[decId]/situacao'`, status, ms, `atorTipo` e `codigoErro`; `situacao.ts` não tem linha de log própria. O teste transversal de sentinelas ganha a rota nova: a linha capturada não contém o `decId`, `wsod_` nem o prefixo do token; no 5xx forçado, o envio ao Sentry falso não contém o `decId` nem texto do Postgres | K02 I |
| SB-06 | alta | **A situação informa, não autoriza.** Nenhum código do Orquestrador usa `situacaoDoPedido` para decidir entrega, recebimento ou andamento (teste estático: só a `route.ts` nova e testes o importam). O 409 do substituído em `conferir.ts` (`dec.substituidoPor`) e o 409 `decSubstituido` em `registrar.ts:67` continuam, com os testes de hoje passando sem asserção a menos (só o texto do 409 da entrega muda, pela 03). A mesma função `aprovadoVigente` decide os dois: teste que, para os estados do CA-01.1 e do CA-01.2, a rota responde `substituido` se e só se o envio de andamento do mesmo DEC responde 409 `decSubstituido`. Os documentos (SB-17) dizem que a rota é consultiva e que o lado do `/construir` deve falhar fechado (503, rede, tempo esgotado → não inicia) | K03 T, integração |
| SB-07 | alta | **Marcação da criação só pelo servidor, sempre gravada, nunca alterada.** `caminhosComNomeNaCriacao` não existe em nenhum schema de entrada (`CriarPacoteDecisao`, rota, Server Action, job, `ExtrasDoPacote`); o valor gravado é o calculado em `criar.ts` sobre `textosDaCriacao` com `nomesDoSolicitante(d.solicitanteNome)`, em que `d` é a linha devolvida por `travarDemanda` na mesma transação (nenhuma outra leitura do nome). O insert em `pacote_decisao` fica só em `criar.ts`, com o campo obrigatório no tipo do insert. Testes: (a) rota de pessoa e rota de agente com `caminhosComNomeNaCriacao: []` e `null` no corpo → a chave é recusada ou descartada como hoje (C-11), e a coluna gravada é a calculada; (b) todo DEC criado pelos três caminhos (rota de pessoa, rota do agente `consolidacao`, worker com `extras`) tem a coluna **não nula** (lista, vazia quando não há nome); (c) cada item gravado casa a lista de permissão e nenhum contém a sentinela do nome; (d) `privilegios.test.ts` e `imutabilidade.test.ts`: `UPDATE` de `pacote_decisao` pelo papel do app recusado também para a coluna nova; (e) duas conexões: criação do DEC × troca do `solicitanteNome` → a marcação corresponde ao nome que estava na linha quando a criação a travou | K04 T e I, K06 |
| SB-08 | alta | **D1 nunca mais fraco, coluna lida com falha fechada, uma fonte só para os textos.** Em `conferir.ts`, a coluna vem no `select` que já existe e passa por Zod: `z.array(z.string().regex(RE_CAMINHO_DA_CRIACAO)).max(<total de textos possível>)` ou `null`; `RE_CAMINHO_DA_CRIACAO` é a da seção 4 de 02, com `^` e `$` e **sem** flag `g` ou `y`. `null` → só o nome atual (DEC anterior à 0.4.1). Fora do formato → erro interno (500 por `mapearErro`), sem gerar e sem entregar, Sentry reduzido sem o valor; nunca tratado como `null` ou `[]`. Um texto entra em `comNome` se `temNome(valor, nomesAtuais)` **ou** se o caminho está em `caminhosDaCriacaoNoPedido(gravados, escolhida)`. `textosDoPedido` e `textosDaCriacao` saem da mesma função interna. Testes: (a) CA-02.1 a CA-02.5; (b) todos os testes do D1 da 0.4.0 passam sem mudança; (c) **igualdade**, não só subconjunto: para cada opção X e para DEC com e sem `sistema_alvo`, com listas vazias e cheias, o conjunto de caminhos de `textosDaCriacao` traduzidos por `caminhosDaCriacaoNoPedido(…, X)` é igual ao conjunto de caminhos de `textosDoPedido` do mesmo DEC aprovado com X; (d) a opção não escolhida com o nome antigo não recusa o pedido; (e) coluna com `'__proto__'`, `'demanda.titulo '`, `'x'` e um item com 5 dígitos de índice, inserida pelo migrator → 500 sem `pedido_gerado` nem `pedido_entregue`, e o Sentry falso sem o valor; (f) a mesma regex chamada duas vezes seguidas sobre o mesmo valor dá o mesmo resultado | K05, K07 |
| SB-09 | alta | **Coluna fora de toda vista e saída.** `PacoteDecisaoVista`, as vistas mínimas, a listagem de DEC, a entrada do provedor, o JSON do pedido, o `depois` de `pacote_decisao_criado` (C-30) e as respostas da API não têm a chave da coluna. Testes: (a) as chaves de `GET /api/pacotes-decisao/:decId` e da listagem, para pessoa e para os quatro agentes, são as da 0.4.0, percorrendo a partir de `MATRIZ` as ações de leitura com agente na linha (molde do AN-09); (b) a entrada montada para o provedor falso não tem a chave; (c) CA-02.4: o pedido sai igual byte a byte ao da 0.4.0 para o mesmo DEC; (d) a varredura de sentinelas cobre a criação do DEC e as recusas do D1 (nome antigo e atual ausentes da resposta, do log, do Sentry e do histórico) | K06 I, K07 I |
| SB-10 | média | **Migration só aditiva, sem privilégio novo.** Uma migration `0010_*` gerada por `pnpm db:generate`, com só `ALTER TABLE "pacote_decisao" ADD COLUMN "caminhos_com_nome_na_criacao" text[]` (anulável, sem padrão); nenhuma migration custom, nenhum `GRANT`, `privilegios.ts` sem diff, nenhuma migration da `main` editada. Ensaio de rollback com `alteram_dado: false` e `volta_sem_restaurar: false` (esperado, 02, seção 8) | K04 E e T |
| SB-11 | alta | **Arquivamento por tabela fechada, decidida sob a trava.** `destinoDoArquivamento(status, estado)` é `switch` exaustivo com verificação `never` sobre os nove status e os três estados; os únicos destinos possíveis são `encerrada`, `aprovada`, `em_analise` e `null`; `aprovada` só com estado `atualizado`, isto é, vigente com decisão `aprovada` gravada (o DEC de dupla aprovação com só a primeira aprovação não tem linha em `decisao` e não conta) e não desatualizado, o mesmo predicado da transição manual para `aprovada`. Em `decidir.ts`, na decisão `arquivada`: `gravarDecisao` → `vigenteDaDemanda` → `mudarStatusPorArquivamento`, todos depois de `travarDemanda` e na mesma transação; o status decidido é o da linha travada; ator `{ tipo: 'sistema' }`; destino nulo ou igual ao atual não grava nada. `MANUAIS`, `duvida_em_aberto`, `dec_criado`, `decisao_devolvida`, `AUTOMATICAS_DO_CONSTRUIR` e `mudarStatusPeloConstruir` sem diff. A T11 usa a mesma função (nenhuma segunda regra). Testes: (a) tabela 9 status × 3 estados com o resultado de cada célula; nenhuma termina em `em_construcao`, `entregue` ou `devolvida`; (b) CA-03.1 a CA-03.5; (c) v1 de dupla aprovação com só a primeira aprovação e v2 pendente: arquivar o v2 → `encerrada`; (d) duas conexões: arquivar o v2 × gravar ESP nova da mesma demanda → nunca termina em `aprovada` com o v1 desatualizado no instante do commit do arquivamento; (e) duas conexões: arquivar × mudança manual de status → uma espera a outra, sem *deadlock* (`40P01`) em 50 repetições | K08 |
| SB-12 | média | **T11 só com valor conferido; os avisos informam.** Os avisos (a), (b) e (c), a dica e a chegada só citam id que casa `RE_ID_DEC` (fora disso, o aviso não aparece); `href` só por constante de rota mais id conferido (`/pacotes-decisao/<id>` e `/demandas/<id>/pacotes-decisao/novo` com `RE_ID_DEMANDA`), CV-19; `<Status>` só por `ROTULO_STATUS` com `Object.hasOwn`; a chegada sai do `d.status` lido do banco, e nenhum valor de `searchParams` é mostrado; sem `dangerouslySetInnerHTML`. `vigenteDaDemanda` é chamada só depois de `exigirPessoaNaPagina`, `autorizar(…, 'ler_pacote_decisao')` e de achar o pacote (404 antes). O 409 do S-01 (`MENSAGENS_DECISAO.nivelMenorQueOVigente`) continua sem id e sem nome. Testes: (a) a mensagem do S-01 não casa `RE_ID_DEC` nem contém a sentinela do nome; (b) os textos novos da seção 8 da 03 não têm nome de pessoa (C-30); (c) o conjunto de botões e o estado `disabled` da T11 são iguais com e sem cada aviso; (d) `substituidoPor` ou id do vigente fora do formato, inserido pelo migrator → nenhum link nem texto com o valor; (e) o teste estático do C-04 continua cobrindo a página; axe sem violação nos estados novos (RNF-10) | K09 |
| SB-13 | alta | **LATERAL parametrizada, com as mesmas colunas.** A consulta de `andamentosDasDemandas` usa o construtor do Drizzle ou o template `sql` só com valores por parâmetro (`inArray`, `${}` do template); nada de `sql.raw` nem concatenação de string (o `sql-raw.test.ts` continua passando). A projeção é a lista `COLUNAS`, sem `id` e sem `ator_token_prefixo`; proibido `select u.*` sobre a subconsulta se ela trouxer coluna fora da lista. Quem chama a função não muda (só a fila de pessoa). Testes: (a) CA-07.1 a CA-07.3; (b) id com aspas simples e `'); drop table x; --` na lista → mapa vazio e nenhum erro de sintaxe; (c) as chaves de cada linha devolvida são exatamente as sete de `LinhaDeAndamento`; (d) os testes do AN-09 passam sem mudança | K10 |
| SB-14 | alta | **O teste do C-27 fica mais estável sem ficar mais fraco.** Correções aceitas, conforme a causa achada: restringir a consulta a `backend_type = 'client backend'`, ou esperar por tentativas contadas que nenhuma sessão de cliente esteja em autenticação. Proibido: filtrar por `usename`, trocar `toEqual` por `toContain`, tirar o `distinct`, `retry` (no caso, no arquivo ou no `vitest.config`), `it.skip`, `it.fails`, `it.todo` ou condição que pule o caso. As três asserções do caso ficam (CA-04.2). A mensagem de diagnóstico da falha mostra só `backend_type`, `usename` e `state`, sem `query`, `client_addr`, `application_name` nem URL. Se a causa estiver em `src/lib/deps.ts` ou `test/banco.ts`, o diff de `deps.ts` não lê `DATABASE_URL_MIGRATOR` nem o passa a nenhum cliente (o `variaveis.test.ts` continua passando). Testes: (a) CA-04.3 como teste **permanente**: com o pool montado sobre `b.urlMigrator`, a mesma verificação falha; (b) a mensagem de falha forçada não contém `b.urlMigrator`, `b.urlApp` nem a senha delas; (c) 20 execuções seguidas registradas na entrega (CA-04.1); (d) `src/lib/deps-qa.test.ts` entra no `PISO` com a contagem atual (8 linhas com `expect(` em `41108ee`; vale a recontagem) | K11 |
| SB-15 | média | **Piso só sobe e cobre os testes de segurança.** O `PISO` ganha `registrar-qa.test.ts` (CA-08.1), `deps-qa.test.ts` (SB-14), os candidatos da Pendência 7 de 01 que forem de segurança (CA-08.2) e os arquivos de teste deste pedido que provam SB-01 a SB-14, cada um com a contagem no fim da tarefa. Teste: comparado com o `PISO` de `41108ee`, nenhuma entrada saiu e nenhum valor diminuiu (CA-08.3) | K12 |
| SB-16 | alta | **Nenhum controle afrouxado.** `git diff 41108ee -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/lib/rota.ts src/db/transacao.ts src/db/privilegios.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/pedido-construcao/pendentes.ts src/modules/pedido-construcao/entregar.ts src/modules/pedido-construcao/receber.ts src/modules/andamento/registrar.ts src/modules/limites.ts` vazio. Os testes de segurança do `PISO` sem asserção a menos, contada por arquivo. Mudanças aprovadas de antemão, e só elas: o par novo e a contagem 4 → 5 do `construir` nos testes de pares exatos; a rota nova no T13; os testes que esperavam `encerrada` ao arquivar o mais novo **com** vigente atualizado (passam a esperar `aprovada`, aprovado pela S1); os textos alterados da seção 8 da 03. Qualquer outra mudança em teste de segurança existente bloqueia a revisão da tarefa | K02 S, K08 T |
| SB-17 | média | **Documentação sem valor e com o escopo certo.** `docs/operacao/tokens-de-integracao.md` diz que o token `construir` passou a ler também a situação (`vigente` ou `substituido`) de todo DEC com pedido gerado por pessoa, inclusive substituído e de demanda em status final; que a rota é consultiva (SB-06); e que a revogação pelo prefixo continua a resposta a vazamento. O manual cap. 04 registra o limite dos DEC criados antes da 0.4.1 (D1 só com o nome atual) e o `vigente` em status final. Nenhum token, hash, valor de `.env` ou nome de pessoa nos exemplos; a varredura de segredo do CI (C-39) passa no ramo | K13 |

### 4. Avaliações pedidas a esta etapa

**Pendência 2 de 01 e ADR-37 de 02: o nome em vigor na criação.** De acordo com a opção (c) de 02: guardar, na criação,
os **caminhos** que o nome marcou, e não o nome. Descarto a cópia do nome (mais uma cópia de D3 para a anonimização
futura alcançar) e o hash do nome (pouca entropia, sai por dicionário e continua dado pseudonimizado, art. 13, § 4º). Para
os DEC anteriores à 0.4.1, a opção (a): coluna nula, D1 só com o nome atual, limite registrado no manual (SB-17). Não
aceito preencher os antigos na migration com o nome de hoje: chamaria de "nome da criação" o nome atual e marcaria
`alteram_dado`. As condições estão em SB-07 a SB-10.

**Pendência 2 de 02: a coluna é dado pessoal?** Não em si: cada item é um nome de campo de uma lista fechada, gerado pelo
sistema. A coluna diz só que o texto daquele caminho, que já está no próprio DEC e é imutável, contém o nome do
solicitante: não acrescenta informação sobre a pessoa além do que o texto já tem. Por cautela, ela é tratada como
**acessória do D5** (o conteúdo do DEC), com a mesma base legal, retenção e expurgo (seção 5). Isso não pede tela,
consentimento nem job novos.

**Pendência 2 de 02: a rota de situação como sinal novo para o token `construir`.** Aceita, nível baixo depois dos
controles. O token já recebe o pedido inteiro de todo DEC pendente e o 409 com o id do substituto na entrega; a rota
acrescenta um bit por DEC com pedido gerado, também para o substituído e o de status final, sem texto. Condições: SB-01
(só o `construir`, 403 antes de consultar), SB-02 (mesmo escopo da entrega e do andamento, 404 idêntico nos três casos e
com o mesmo número de consultas, sem oráculo por tempo) e SB-03 (enum calculado, nada gravado).

**Lição da 0.3.1, conferida para a leitura nova:**

| Pergunta | Resposta para `GET /api/pedidos-construcao/<DEC-id>/situacao` |
|---|---|
| Quem pode chamar (escopo do token) | Só o ator `integracao` `construir`, pela linha `SO_CONSTRUIR`. O token não tem escopo próprio além do tipo de integração (`resolver-ator.ts`); a matriz é o escopo. Pessoa (inclusive `cto`), os quatro agentes e o `awave` recebem 403 (SB-01) |
| O que ele enxerga (visibilidade) | Só DEC com `pedido_gerado` de pessoa na demanda do próprio DEC (IN-10, AN-03), o mesmo conjunto da entrega e do andamento. A regra de confirmação do Awave (`exigirVisivelPara`) não se aplica a integração, como em toda rota do `construir` (SB-02) |
| Oráculo de existência 403 × 404 | O 403 sai em `rota()`, depois de `resolverAtor` e antes de qualquer consulta ao DEC: quem não é o `construir` recebe 403 para DEC existente e inexistente. Para o `construir`, os três casos sem pedido gerado dão o mesmo 404, byte a byte e com uma consulta só. Id fora do formato dá 404 antes da autenticação, como em toda rota (revela o formato, não a existência) |
| O que sai | Uma chave, dois valores, sem status da demanda, sem id do substituto, sem texto (SB-03) |
| Rastro | Linha de `rota()` sem o id (SB-05); sem evento, por decisão do 01 |

**Pendências 1 e 4 de 01, do ponto de vista de segurança.** A 1 (vigente desatualizado → `em_analise`) falha fechado: a
demanda não vai a status final nem a `aprovada`, e o v1 desatualizado continua sem gerar pelo 409 de `conferir.ts`. Sem
objeção a nenhuma das duas escolhas da Parada 1. A 4 (`vigente` em status final) não abre nada: a entrega e o andamento
continuam recusando pelo status final; fica o registro no manual (SB-17).

**Pendência da 03 dirigida a esta etapa.** Conferida: os avisos usam só ids no formato de DEC e links por constante de
rota (SB-12, CV-19); o 409 do S-01 da seção 5 da 03 continua sem id e sem nome; o 409 do substituído mantém só o id do
substituto, já revisto na 0.1.13, e vale também para a entrega ao `/construir`.

### 5. Dados pessoais (LGPD)

Este pedido **não cria dado pessoal novo** nem cópia nova do nome. Bases legais, retenção e expurgo dos dados que já
existem seguem a seção 4 de `DEC-DEM-20261022-0001-v1/04-seguranca-aplicacao.md` (D1 a D12), com as ampliações do 0016 e
do 0017, sem mudança.

| Id | Dado | Titular | Onde fica | Base legal | Retenção | Expurgo | Cuidado deste pedido |
|---|---|---|---|---|---|---|---|
| D3 | Nome do solicitante (atual) | solicitante | `demanda.solicitante_nome` | art. 7º, V e IX, sem mudança | status final + 5 anos, sem mudança | anonimização futura por job, sem mudança | Continua lido só da linha travada, na criação (SB-07) e na conferência; nunca copiado para o DEC, o pedido, o log, o Sentry ou o histórico (SB-09, RNF-09 de 01) |
| D5 (acessório) | `caminhos_com_nome_na_criacao`: nomes de campo do DEC cujo texto continha o nome em vigor na criação | não é dado pessoal em si; refere-se ao conteúdo de D5 | `pacote_decisao` | a do D5: art. 7º, IX e VI (registro técnico e da decisão; exercício regular de direitos) | a do DEC (D5 = D3: status final + 5 anos) | junto com o D5, pela migration de dado com o migrator, registrada no histórico. Na anonimização dos textos do DEC, a coluna pode ficar como está (falha fechada: o D1 continua recusando o pedido daquele DEC) ou ser recalculada pela mesma migration; a escolha é do pedido do job | SB-07 a SB-10: só caminhos de lista fechada, sem nome nem hash, fora de toda vista |
| — | Situação do pedido (`vigente`, `substituido`) | não é dado pessoal | calculada na leitura, não gravada | não se aplica | não se aplica | não se aplica | SB-03 |
| — | Ids de DEC nos avisos da T11 | não é dado pessoal | tela | não se aplica | não se aplica | não se aplica | SB-12 |
| D9 | Linha de log da rota nova e diagnóstico do C-27 | não devem ter dado pessoal (o `usename` é nome de papel do banco) | saída do contêiner; saída do teste | — | rotação do Docker | não se aplica | SB-05, SB-14 |

### 6. O que o plano (05) precisa conter

1. **Cada controle SB-01 a SB-17 como critério de aceite de uma tarefa**, com o teste citado no controle. Os IN-01 a
   IN-18 e AN-01 a AN-15 continuam valendo e entram na revisão de toda tarefa que toca matriz, rota, vistas, histórico
   ou as leituras do `construir`.
2. **Ordem:** SB-01 (matriz, pares exatos e T13) antes da rota e do serviço de situação; SB-02 a SB-06 na mesma tarefa
   do serviço e da rota, e não depois. SB-10 (migration) antes de SB-07 e SB-08; SB-07, SB-08 e SB-09 na mesma tarefa ou
   em tarefas seguidas, sem release intermediário com a coluna gravada e não conferida. SB-14 numa tarefa própria, com
   a causa escrita antes da correção.
3. **Risco `alto` no `tarefas.json`** para: matriz e rota de situação (SB-01 a SB-06); coluna, criação e conferência do D1
   (SB-07 a SB-10); arquivamento (SB-11); C-27 (SB-14).
4. **Inventário escrito no plano** (SB-11), por caminho e função, de quem escreve o que o arquivamento lê (decisão e
   aprovação em `decidir.ts`, ESP e RSK novas, `criarPacoteDecisao`, `alterarDemanda`, `mudarStatusPeloSistema`,
   `mudarStatusPeloConstruir`) e a trava que cada um toma.
5. **Testes transversais obrigatórios:** matriz × todas as rotas × os dois tokens e os quatro agentes, com contagem de
   consultas no 403 (SB-01); 404 idênticos da situação, da entrega e do andamento (SB-02); sentinelas ampliado à rota
   nova, à criação do DEC e às recusas do D1 (SB-05, SB-09); chaves das vistas de DEC a partir da matriz (SB-09);
   igualdade `textosDaCriacao` × `textosDoPedido` (SB-08); concorrência com duas conexões (SB-07 item e; SB-11 itens d e e); prazo
   total com relógio falso (SB-04).
6. **SB-16 em toda revisão de tarefa:** o `tech-lead` anexa o `git diff 41108ee -- <lista do SB-16>` e a contagem de
   asserções por arquivo do `PISO`; de novo na 08.
7. **Na 08:** revisão de segurança com foco em matriz, rota de situação (oráculo e escopo), coluna da criação (formato,
   falha fechada, vistas), arquivamento sob a trava e a correção do C-27; `pnpm audit --prod --audit-level high` sem alta
   nem crítica (não rodado nesta etapa: nenhum pacote muda, e a base 0.4.0 já está na 16.4.1 do padrão técnico); achado
   crítico ou alto volta ao engenheiro e passa por reteste deste agente.
8. **Fora do `/construir`** (Fabiano, depois do merge): backup, migration `0010` pelo migrator e deploy, volta só pelo
   caminho B. O token `construir` não muda; nada de token novo passa por chat, arquivo do repositório ou e-mail.

## Decisões tomadas

- Nenhuma devolução: as quatro lacunas (C-27 fora do piso, teste de subconjunto em vez de igualdade, coluna nula por esquecimento, coluna e vista de agente) viraram controles verificáveis que cabem no plano.
- ADR-37 aprovado com condições: os caminhos não são dado pessoal em si e não acrescentam informação além do texto imutável do DEC; por cautela, seguem a base legal, a retenção e o expurgo do D5.
- Opção (a) para os DEC anteriores à 0.4.1: não há nome da criação a recuperar, e o preenchimento com o nome de hoje seria falso e alteraria dado existente.
- Coluna com formato inválido falha fechado (500, sem gerar nem entregar): tratar como nula liberaria o pedido que o S-03 quer recusar.
- O teste de `textosDaCriacao` passa de subconjunto para igualdade: só a igualdade pega o texto novo do pedido que ficou sem marcação.
- Rota de situação aceita sem limite de taxa e sem evento: segue a decisão do 01 e as leituras do `construir` da 0.3.0; o prazo de 8 s e a ausência de trava contêm o abuso, e o resto vai como risco residual.
- O teste do C-27 é teste de segurança (C-27 do 0001, nível alto): por isso a lista do que não é correção, a prova negativa permanente e a entrada no piso.
- O arquivamento para `aprovada` usa o mesmo predicado da transição manual (aprovado completo e atualizado): não cria atalho de privilégio, e a decisão S1 cobre o salto de origem.
- `pnpm audit --prod` não rodado nesta etapa: nenhum pacote muda neste pedido; fica no portão da 08.

## Pendências

- Nenhuma bloqueia a etapa. Itens para a Parada 1 e para as etapas seguintes:
- `gestao-riscos` e Fabiano (aceite formal de risco residual, não bloqueia): (a) os DEC criados antes da 0.4.1 continuam conferindo só o nome atual (baixo; limite no manual); (b) a rota de situação não tem limite de taxa, como as outras leituras do `construir` (baixo; 8 s, sem trava, revogação pelo prefixo); (c) entre a resposta `vigente` e o início da construção, o DEC pode ser substituído (baixo; o 409 da entrega e o do andamento continuam como barreira, SB-06).
- `tech-lead` (05): o inventário do SB-11 (seção 6, item 4); onde ficam os testes estáticos do SB-01 (citação da ação), do SB-03 (sem trava em `situacao.ts`) e do SB-04; a contagem de consultas no 403 e no 404 (SB-01 c, SB-02 b) pelo logger do Drizzle.
- Outra frente do `/construir` (fora deste repositório): o lado cliente da rota deve falhar fechado (503, rede ou tempo esgotado → não inicia), como recomenda a seção 6 de 02 (SB-06).
- Para o pedido futuro do job de anonimização do D3 e do D5 (fora deste pedido): decidir se a coluna é mantida ou recalculada quando os textos do DEC forem anonimizados (seção 5), e conferir que o nome substituto ("Solicitante removido") não passa a ser tratado como nome pelo D1.
- `seguranca-informacao` (fora deste pedido): as pendências do 0016 sobre `x-real-ip` na rede interna do Easypanel e sobre `pnpm audit` sem `--prod` continuam abertas.
- O texto do `pedido.json` não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do repositório.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -i "retenção" -- docs/superpowers/specs docs/manual-tecnico` — negado pela permissão da sessão, não executou; as regras de retenção foram lidas pelo Read na seção 4 do `04-seguranca-aplicacao.md` do 0001 e em `src/modules/retencao/expurgar.ts`

## Critério de pronto atendido

- [x] (04) cada componente de 02 tem as ameaças STRIDE avaliadas
- [x] (04) cada ameaça alta ou crítica tem controle, escrito como critério verificável
- [x] (04) cada dado pessoal tem base legal, retenção e expurgo
