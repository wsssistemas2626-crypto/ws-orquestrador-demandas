---
pedido: DEC-DEM-20261111-0017-v1
etapa: 04-ameacas
agente: seguranca-aplicacao
leu: [pedido.json, 01-analista-requisitos.md, 02-arquiteto-solucoes.md, 03-ux-ui-design.md, padrao-tecnico.md, contrato-passagem.md, docs/construcao/DEC-DEM-20261111-0016-v1/04-seguranca-aplicacao.md, docs/construcao/DEC-DEM-20261112-0019-v1/04-maestro.md, src/modules/limites.ts, src/db/transacao.ts, src/modules/integracoes/tempo-limite.ts, src/modules/pedido-construcao/pendentes.ts, src/modules/pedido-construcao/receber.ts, src/modules/pedido-construcao/entregar.ts, src/modules/pedido-construcao/gerar.ts, src/modules/pacotes-decisao/decidir.ts, src/modules/pacotes-decisao/substituido.ts, src/modules/versoes.ts, src/modules/demandas/transicoes.ts, src/modules/demandas/servico.ts, src/modules/demandas/consultas.ts, src/modules/demandas/confirmacao.ts, src/modules/acesso/matriz.ts, src/modules/historico/registrar.ts, src/modules/historico/consultas.ts, src/modules/retencao/expurgar.ts, src/db/privilegios.ts, src/lib/rota.ts, src/app/api/demandas/route.ts, src/app/api/demandas/[id]/route.ts, src/app/api/demandas/[id]/historico/route.ts, estruturaAutonoma/ferramentas/construir/lib/andamento.mjs]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Modelo de ameaças da 0.4.0 do WS Orquestrador de Demandas (andamento do Pedido de Construção registrado pelo
`/construir`), sobre os componentes da seção 2 de `02-arquiteto-solucoes.md` e as telas de `03-ux-ui-design.md`. Base:
`main` em `0ac099a` (0.3.1). Referências: OWASP Top 10 2021 (A01, A04, A05, A08, A09), OWASP API Security Top 10 2023
(API1 BOLA, API3 BOPLA, API4 consumo de recurso, API5 BFLA), OWASP ASVS 4.0.3 nível 2 (V1.11, V4, V5, V7, V11) e LGPD.
Nível = nível da ameaça **antes** do controle; na dúvida, o mais alto.

Os controles deste pedido usam o prefixo **AN-**, para não colidir com C-01 a C-40, CV-, IN-01 a IN-18, M-, B-, A- e
S-, que continuam valendo e **não podem ser afrouxados**.

Achados da leitura do código que viraram controle (o desenho de 02 não os cobria por inteiro):

1. **Vínculo DEC ↔ demanda.** `pedidoGeradoPorPessoa` (`pendentes.ts:55`) devolve o `demandaId` do evento, e o 02 usa
   esse valor para travar a demanda e gravar o andamento. Nada confere que é a demanda do próprio DEC
   (`pacote_decisao.demanda_id`). Hoje o evento é gravado certo e só por inclusão, mas a 0.4.0 é a primeira escrita que
   **muda o status** de uma demanda a partir dele. Fica a conferência, falhando fechado (AN-03).
2. **Prazo total contra o piso.** O A-2 da 0019 foi corrigido no `comTransacao` (`transacao.ts:130-133`): o piso entra
   na abertura, e o restante vem por cima. Mas um `set local` ou `set_config` escrito **dentro** do corpo do serviço
   ainda passa pelo Proxy (`transacao.ts:91-102`) e devolve o piso por cima do restante. A mesma coisa acontece se
   `registrarAndamento` receber a transação de quem chama (`executarComOrcamento`, `tempo-limite.ts:82`) ou se o
   serviço abrir um `comTransacao` próprio. Vale para o serviço novo, para `mudarStatusPeloConstruir` e para
   `conferirLimiteDeAndamento` (AN-06).
3. **Leitura de agente.** `obterDemanda` é chamada também no caminho do agente (`consultas.ts:389-392`) e no 201 do
   agente `orquestrador` (`app/api/demandas/route.ts:13`). O campo novo só fica fora da resposta do agente porque
   `vistaMinimaDaDemanda` é lista de permissão. No caminho da integração, `vistaDaDemandaPara` chama
   `vistaDaIntegracao(d)` com a `DemandaVista` inteira (`consultas.ts:333`). Se a vista do Awave copiar o `andamento`
   da vista de pessoa sem montar chave a chave, sai `statusConstrucao` e `decId`. A lição da listagem de DEC (A-1 da
   0019) vale aqui: o teste percorre as ações de leitura **a partir da matriz**, e não de uma lista escrita à mão (AN-09).
4. **Limite que não conta.** `limiteDe` (`limites.ts:42`) lança para integração sem limite definido, e só o `sistema`
   sai com `null`. A função nova do 02 (`conferirLimiteDeAndamento`) fica fora dessa tabela, e o erro de esquecer um
   ramo apareceria como ausência de limite, sem nenhum teste vermelho (AN-07).

### 1. Fronteiras de confiança tocadas

| # | Fronteira | O que muda neste pedido |
|---|---|---|
| F2 | Cliente de servidor → API | Novo: a primeira **escrita** do token `construir` (até aqui, só ler pendentes, buscar e confirmar recebimento). Entra pelo domínio público em HTTPS, com Bearer, sem cookie e sem `Origin` |
| F2' | Awave → API (rede interna) | Muda: a leitura da demanda própria ganha a chave `andamento` (quatro campos) |
| F6 | API → painel (pessoa) | Muda: a fila e o detalhe mostram dado gravado por integração (fase, números, DEC, data) |
| F7 | App → Postgres | Migration aditiva: tabela nova `andamento_construcao` e `GRANT SELECT, INSERT` ao papel do app |
| F8 | Máquina do `/construir` → token | Muda o impacto: o arquivo do token, legível pelo usuário `deploy` que também roda os agentes com Bash, passa a dar escrita em status de demanda |

### 2. STRIDE por componente (seção 2 de 02)

#### C01 Esquema, migrations e privilégio (`src/db/schema/andamento.ts` e `index.ts`, `drizzle/0008_*`, `drizzle/0009_rls_privilegios_andamento.sql`, `src/db/privilegios.ts`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| T | Andamento alterado ou apagado depois de gravado (reescrever o que o `/construir` disse) | alta | AN-10 (só `SELECT, INSERT`; `imutabilidade.test.ts` com a tabela) |
| T | Linha fora do formato (fase, número, `dec_id`, prefixo) gravada por outro caminho e lida pela tela | média | AN-10 (CHECKs no banco), AN-12 (Zod na leitura) |
| E | GRANT a mais (`UPDATE`, `DELETE`, sequência) ou coluna nova entrando em `colunasUpdate` de `demanda` | alta | AN-10 |
| T | Migration que altera dado existente ou edita migration da `main` | média | AN-10 (ensaio com `alteram_dado = false`) |
| R | Linha gravada sem saber por qual token | média | AN-10 (`ator_token_prefixo not null` com CHECK), AN-11 |
| D | Tabela sem expurgo cresce sem teto | baixa | AN-07 (teto de 600 gravações por hora limita o crescimento); risco residual (Pendências) |
| S, I | Nenhuma (sem dado pessoal; prefixo não é segredo, IN-13) | baixa | — |

#### C02 Matriz de acesso (`src/modules/acesso/matriz.ts`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| E | `registrar_andamento` nascendo aberta a agente, pessoa ou `awave` (BFLA), ou reaproveitando uma linha existente | crítica | AN-01 |
| E | O `construir` ganhando outra ação além das quatro (ex.: `ler_demanda` "para conferir o status") | crítica | AN-01 |
| T | Server Action ou job chamando a ação (a escrita sairia do controle do token) | alta | AN-01 |
| S, R, I, D | Nenhuma própria | baixa | — |

#### C03 Rota e adaptador (`src/app/api/pedidos-construcao/[decId]/andamento/route.ts`, `src/lib/rota.ts` com ADR-33)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Cookie com Bearer deixando de dar 400; CSRF dispensado também com cookie | alta | AN-13 (C-09 e C-15 sem mudança) |
| T | Corpo com chave a mais, texto, número como texto, `__proto__` ou número fora da faixa aceito e gravado | alta | AN-02 |
| T | A opção `corpoInvalido` mudando o comportamento das outras rotas (400 com `campos` virando 422, ou o contrário) | alta | AN-02, AN-13 |
| I | 422 ecoando o nome da chave a mais ou o valor (o issue do Zod traz a chave); 422 diferente para DEC existente e inexistente (oráculo) | alta | AN-02 |
| I | Linha de log com `decId`, fase, prefixo ou corpo; 5xx com texto do Postgres no Sentry | média | AN-11, IN-14 |
| D | Requisição presa em trava segura conexão do pool além do prazo do cliente | média | AN-06 (prazo total 8 s), AN-08 |
| R, E | Nenhuma nova | baixa | — |

#### C04 Esquemas e regras puras (`src/modules/andamento/schemas.ts`, `src/modules/andamento/regras.ts`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| T | `z.coerce`, `z.number()` sem `.int()`, `z.object` sem `strict` ou `refine` esquecido (prontas > total) | alta | AN-02 |
| T | `decidirPorStatus` com tabela incompleta: `entregue` ou `encerrada` como destino, ou status não previsto caindo em "grava e muda" | crítica | AN-04 |
| I | `lerAndamento` lançando (500) diante de linha fora do esquema, ou devolvendo a linha crua | baixa | AN-12 |
| T | `mesmoEstado` comparando menos campos que os cinco (o `decId` esquecido faria o andamento de um DEC novo passar por "mesmo estado") | média | AN-04 (CA-05.9 e o caso do `decId`) |
| S, R, D, E | Nenhuma | baixa | — |

#### C05 Serviço de registro (`src/modules/andamento/registrar.ts`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Andamento aceito para DEC sem `pedido_gerado` de pessoa (pedido escrito direto, A3, ou evento de agente) | alta | AN-03 |
| T | Andamento e status gravados na demanda errada (o `demandaId` do evento diverge do DEC) | alta | AN-03 |
| T | DEC substituído pondo em `devolvida` a demanda que está em construção pelo DEC novo | alta | AN-04, AN-05 |
| T | Corrida com a mudança manual de status, com a aprovação de um DEC novo ou com a troca de tipo para `estudo`: a decisão lida antes da trava | alta | AN-05 |
| E | Serviço chamado direto (sem a rota) por outro ator, ou sem `autorizar` | alta | AN-01 (`autorizar` também no serviço) |
| D | Prazo total sobrescrito pelo piso (`set local` no corpo, transação de quem chama, `comTransacao` próprio): o 503 sai depois dos 8 s, e o cliente corta antes | alta | AN-06 |
| I | 404 diferente entre DEC inexistente, sem pedido e com pedido de não pessoa | alta | AN-03 |
| R | Gravação sem evento (só `tarefasProntas`) sem atribuição | média | AN-10 (prefixo por linha) |

#### C06 Transições do `construir` (`src/modules/demandas/transicoes.ts`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| E | O `construir` pondo `entregue` ou `encerrada` (contra A1) ou fazendo transição fora das duas | crítica | AN-04 |
| T | `MANUAIS` ou `AUTOMATICAS` do sistema mudando junto; `mudarStatusPeloConstruir` reaproveitando `mudarStatusPeloSistema` (o histórico diria "Sistema") | alta | AN-04, AN-13 |
| T | Tipo `estudo` indo para `em_construcao` pela transição automática | média | AN-04 |
| R | `status_alterado` sem o ator `construir` e o prefixo | média | AN-11 |
| S, I, D | Nenhuma | baixa | — |

#### C07 Limite do andamento (`src/modules/limites.ts`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| D | Função nova sem ramo para algum ator e que sai sem contar (o achado 4) | alta | AN-07 |
| D | Corrida: 61ª gravação do DEC ou 601ª no total passando por concorrência | média | AN-07, AN-08 |
| D | Token vazado esgota as 600 gravações da hora e para o andamento de todos os pedidos | média | AN-08; risco residual (Pendências) |
| D | Trava global segurada com a linha da demanda travada, atrasando a pessoa | média | AN-08 |
| T | Limites de pessoa, agente e Awave mudando junto | média | AN-07 (CA-12.6) |
| S, R, I, E | Nenhuma | baixa | — |

#### C08 Histórico (`src/modules/historico/registrar.ts`; `textoDoEvento` em `src/components/rotulos.ts`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| I | Texto livre ou valor do corpo cru em `antes`/`depois` (C-30) | alta | AN-11 |
| T | Evento editado ou apagado | alta | C-34 sem mudança |
| T | Evento gravado à mão com fase ou número fora do formato virando HTML ou texto na tela | média | AN-12 |
| D | Histórico inflado por um evento a cada envio | média | AN-11 (CA-06.6) |
| R | Evento sem prefixo ou com ator "Sistema" | média | AN-11 |
| S, E | Nenhuma | baixa | — |

#### C09 Leituras (`src/modules/andamento/consultas.ts`, `src/modules/demandas/consultas.ts`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| I | Agente recebendo o andamento numa rota de leitura (vista mínima, listagem, ESP, RSK, DEC, entrada do provedor), a lição da listagem de DEC da 0019 | alta | AN-09 |
| I | Awave recebendo `statusConstrucao`, `decId` ou prefixo (BOPLA), ou o andamento de demanda de outro autor (BOLA) | crítica | AN-09 |
| I | Oráculo: 404 do Awave diferente para a demanda de outro autor por causa da subconsulta nova | alta | AN-09 (IN-08 refeito com a chave nova) |
| D | Leitura do Awave fora do orçamento `padrao` ou depois do `COMMIT` | média | AN-06 |
| T | `andamentosDasDemandas` com ids interpolados em SQL | baixa | Drizzle `inArray` (C-17) |
| S, R, E | Nenhuma | baixa | — |

#### C10 Painel: fila (`src/app/(painel)/demandas/leituras-da-fila.ts`, `page.tsx`, `fila.tsx`, `CartoesDaFila.tsx`; `src/components/dados-da-fila.ts`, `src/components/rotulos.ts`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Leitura nova acessível sem `exigirPessoa` | crítica | C-04 (o teste estático cobre o arquivo novo) |
| T | Rótulo por chave sem conferir (`ROTULO_FASE['__proto__']`, `constructor`); valor do banco mostrado cru | média | AN-12 |
| I | Selo mostrando número errado (andamento de DEC não vigente) | baixa | AN-04 (só o vigente grava), 03, 4.1 |
| R, D, E | Nenhuma nova | baixa | — |

#### C11 Painel: detalhe (`src/app/(painel)/demandas/[id]/SecaoAndamento.tsx`, `[id]/page.tsx`, `src/components/dados-das-etapas.ts`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| T | Link do DEC montado com valor fora de `RE_ID_DEC`; `style=` na barra (CSP); `dangerouslySetInnerHTML` | média | AN-12, CV-19 |
| I | Prefixo ou token na seção do andamento | média | AN-12 (o prefixo só no histórico, IN-13) |
| E | A Próxima ação nova virando atalho que muda status sem a pessoa (ex.: botão que marca `entregue`) | média | AN-04 (A1), 03, 5.6 (só link para Mudar status) |
| S, R, D | Nenhuma nova | baixa | — |

#### C12 Versão e documentação (`docs/manual-tecnico/` caps. 01, 02, 05, 08 e 09, `docs/operacao/deploy.md`, `docs/operacao/tokens-de-integracao.md`, `CHANGELOG.md`, `package.json`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| I | Token, hash ou valor de `.env` no roteiro ou no exemplo de chamada | alta | AN-14, IN-18, C-39 |
| T | Roteiro ligando `andamento_ligado` antes do deploy e da saúde, ou volta sem desligar | média | AN-14 |
| T | Documentação dizendo que o token `construir` "só lê" (a revogação deixa de ser tratada como urgente) | média | AN-14 |
| S, R, D, E | Nenhuma | baixa | — |

#### Integrações (seção 6 de 02)

| Integração | Ameaça | Nível | Controle |
|---|---|---|---|
| `/construir` → `POST .../andamento` | Token lido do arquivo por um agente do `/construir` com Bash (injeção num pedido): altera fase e números, põe demanda em `em_construcao` ou `devolvida` | média | AN-01, AN-04 (nunca `entregue`), AN-07, revogação pelo prefixo; risco residual (Pendências) |
| `/construir` → `POST .../andamento` | Envios idempotentes sem limite (não contam) segurando a trava do pedido e a linha da demanda | média | AN-06 (8 s), AN-08; risco residual (Pendências) |
| Awave → `GET /api/demandas/:id` e 201 | Chave nova quebrando a vista fechada | alta | AN-09 |
| Homologação V-02 | Token da V-02 em arquivo do repositório ou no log do e2e | alta | AN-15 |

### 3. Controles exigidos

Todos são critério de aceite de alguma tarefa do plano. "Teste" é Vitest com Testcontainers quando toca o banco, ou
Playwright contra a homologação, sempre com dado e token fictícios. "Duas conexões" quer dizer duas transações reais
no Postgres do teste, não `Promise.all` na mesma conexão.

| Id | Nível | Controle (critério verificável) | Cobre |
|---|---|---|---|
| AN-01 | crítica | **Ação só do `construir`, e ele não ganha outra.** `ACOES` ganha `registrar_andamento`; a linha é `SO_CONSTRUIR` (`pessoa: null`, sem agente, `integracoes: ['construir']`); nenhuma outra linha muda (diff de `matriz.ts` contra `0ac099a`: uma linha em `ACOES` e uma em `MATRIZ`). `registrarAndamento` chama `autorizar(ator, 'registrar_andamento')` na primeira linha, antes de abrir a transação. Testes: (a) o conjunto de pares (ação, integração) permitidos, montado a partir de `MATRIZ`, é exatamente `{criar_demanda:awave, ler_demanda:awave, listar_pedidos_pendentes:construir, entregar_pedido:construir, confirmar_recebimento_pedido:construir, registrar_andamento:construir}`; (b) as ações permitidas ao `construir` são exatamente quatro e as do `awave` exatamente duas; (c) o T13 chama a rota nova com `awave`, os quatro agentes, `cto` e `administradora` (sessão, 2FA, `Origin` certo) e espera 403 sem gravar (andamento, status, `atualizadaEm` e contagem de eventos iguais); (d) o `construir` continua 403 em toda rota de outra ação (CA-01.5); (e) ator montado com integração `jarvis` negado (CA-01.6); (f) teste estático: `registrar_andamento` só aparece em `matriz.ts`, na `route.ts` nova, em `registrar.ts` do andamento e em testes; nenhum arquivo `'use server'` nem job o cita | C02 E e T, C05 E |
| AN-02 | alta | **Corpo fechado e 422 sem eco nem oráculo.** `corpoAndamentoSchema` = `z.strictObject` com `fase: z.enum(FASES_ANDAMENTO)`, `status: z.enum(STATUS_CONSTRUCAO)`, `tarefasProntas` e `tarefasTotal` = `z.number().int().min(0).max(999)` e `refine` de `prontas <= total`; sem `z.coerce`, sem `.passthrough`, sem `.catch`/`.default`. As listas de `FASES_ANDAMENTO` e `STATUS_CONSTRUCAO` são as mesmas do CHECK (fonte única, 02). ADR-33: com `corpoInvalido`, a falha do Zod **do corpo** vira `ErroDominio('nao_processavel', <mensagem fixa da 03, seção 7>)` sem `campos`, sem `issues` e sem `cause` com o erro do Zod; JSON malformado (400), `content-type` (415), corpo grande (413) e cookie com Bearer (400) continuam como hoje; sem a opção, nada muda em nenhuma rota. Testes: (a) cada corpo do CA-02.2, mais `{"__proto__": {...}}`, `{"constructor": 1}`, objeto aninhado em `fase`, `1e2` em `tarefasTotal` com `tarefasProntas` 1e3, `-0` aceito como 0, `1e400` → 422 com corpo igual byte a byte ao esperado e nada gravado; (b) o mesmo corpo inválido para DEC inexistente e para DEC com pedido gerado dá resposta idêntica (status, corpo, cabeçalhos) e nenhuma consulta ao banco (pool falso que falha se usado, ou contagem de consultas = 0); (c) chave a mais com valor sentinela: a sentinela e o **nome** da chave não aparecem na resposta, na linha do pino nem no Sentry falso (CA-02.4); (d) os testes de `rota()` existentes passam sem mudança; teste novo de `rota()` com e sem a opção | C03 T e I, C04 T |
| AN-03 | alta | **Só DEC com pedido gerado por pessoa, na demanda do próprio DEC, sem oráculo.** Dentro da transação, depois de `travarPedido`: `pedidoGeradoPorPessoa(tx, decId)`; nulo → 404 `nao_encontrado` com `MENSAGEM_NAO_ENCONTRADO`. Em seguida, o `demanda_id` de `pacote_decisao` do DEC é lido e comparado com o do evento; diferente ou ausente → o **mesmo** 404 (falha fechada; nada é travado nem gravado). O `demanda_id` gravado em `andamento_construcao` e nos eventos é esse valor conferido, nunca vindo do corpo nem da URL. Testes: CA-03.1 a CA-03.4 com os três 404 comparados byte a byte (status, corpo e cabeçalhos); `pedido_gerado` de pessoa inserido à mão (migrator) com `demanda_id` de outra demanda → 404 e nenhuma das duas demandas muda | C05 S, T e I |
| AN-04 | crítica | **Duas transições, com origem fixa; `entregue` e `encerrada` nunca.** `AUTOMATICAS_DO_CONSTRUIR` tem exatamente `em_construcao: aprovada → em_construcao` (salvo tipo `estudo`) e `cancelado: em_construcao → devolvida`; `CONTRADIZ_STATUS_FINAL` é a tabela da seção 5 do 01. `decidirPorStatus` é `switch` exaustivo sobre os nove status com verificação `never`, sem ramo padrão que grave ou mude. `mudarStatusPeloConstruir` aceita só ator integração `construir` (outro ator lança antes de tocar o banco) e grava `status_alterado` por `mudancaDeCampo('status', …)` com esse ator, nunca com `{ tipo: 'sistema' }`. A decisão usa o `status` e o `tipo` **da linha devolvida por `travarDemanda`** na mesma transação, nunca de leitura anterior. `mesmoEstado` compara os cinco campos (`decId`, `fase`, `tarefasProntas`, `tarefasTotal`, `statusConstrucao`). `MANUAIS`, `AUTOMATICAS` e `mudarStatusPeloSistema` sem diff contra `0ac099a`. Testes: CA-05.1 a CA-05.11; a tabela 9 status × 3 `statusConstrucao` × tipo (`estudo` e não estudo) confere o resultado de cada célula e que nenhuma termina em `entregue` ou `encerrada`; andamento gravado do DEC v1 e envio de mesmo estado pelo v2 vigente (só o `decId` muda) grava e cria `andamento_registrado` | C04 T, C06 E, T e R, C11 E |
| AN-05 | alta | **A mesma trava nas rotas que concorrem.** Ordem fixa no registro: `travarPedido` (primeira instrução) → `travarDemanda` → trava do limite. Toda leitura que decide (último andamento, DEC vigente, status, tipo) vem depois de `travarDemanda`. Inventário no plano, por caminho e função, de quem escreve o que o registro lê, e a trava de cada um: `alterarDemanda` (status e tipo), `mudarStatusPeloSistema`, `registrarDecisao` (substituição), `confirmarDemanda` e `mudarStatusPeloConstruir` usam `travarDemanda`; `entregarPedido` e `receberPedido` usam `travarPedido` e, a entrega, depois `travarDemanda`. Nenhum caminho toma a trava da demanda antes da do pedido nem a do limite antes das outras duas. Testes com duas conexões: (a) dois envios iguais do mesmo DEC → uma linha e um evento (RNF-06); (b) `cancelado` × pessoa marcando `entregue` na mesma demanda em `em_construcao` → o fim é `devolvida` com a mudança da pessoa recusada (409), ou `entregue` com o envio recusado (409); nunca as duas gravadas; (c) envio × aprovação completa de um DEC novo da mesma demanda → ou o envio grava antes e o DEC fica substituído depois, ou o envio responde 409; nenhuma linha de andamento do DEC antigo com `gravado_em` depois da substituição; (d) envio `em_construcao` × pessoa trocando o tipo para `estudo` com a demanda em `aprovada` → se a troca vem antes, o status continua `aprovada`; (e) envios de dois DEC diferentes da mesma demanda → nenhum *deadlock* (`40P01`) em 50 repetições | C05 T, C07 D |
| AN-06 | alta | **Prazo total não sobrescrito pelo piso.** A rota chama `registrarAndamento` sem transação; o serviço usa `executarComOrcamento(deps.pool, ator, 'padrao', undefined, …)` e não tem parâmetro `t` usado pela rota. Em `src/modules/andamento/**`, em `mudarStatusPeloConstruir` e em `conferirLimiteDeAndamento`: nenhum `set local`, `set_config`, `comTransacao`, `executarComOrcamento` aninhado nem `Promise.all` (teste estático por texto nesses arquivos). A leitura do Awave com a subconsulta do andamento e o 201 continuam dentro de `executarComOrcamento` da integração, sem leitura depois do `COMMIT` (M-2 da 0019). Testes com relógio monotônico falso (molde de `prazo-total-0019.test.ts`): (a) 7 s gastos na espera pela conexão → `current_setting('statement_timeout')` e `current_setting('lock_timeout')` lidos no ponto do `INSERT` em `andamento_construcao` são ≤ o restante (cerca de 1.000 ms), nunca 5.000 nem 2.000; (b) prazo vencido entre duas instruções → 503 `indisponivel` com `MENSAGEM_INDISPONIVEL`, e andamento, eventos, status e `atualizadaEm` iguais aos de antes; (c) o mesmo (a) na leitura do Awave | C05 D, C09 D, C03 D |
| AN-07 | alta | **Limite próprio, sempre contado.** `conferirLimiteDeAndamento` é `switch` exaustivo pelo tipo do ator: integração `construir` conta; integração `awave`, integração fora da lista, pessoa, agente e **sistema** lançam (nunca `return` sem contar). Chave da trava literal constante `limite:andamento:integracao:construir`, passada por parâmetro (G3.6), nunca montada com dado da requisição. Conta em `andamento_construcao`, com `gravado_em > agora − 60 min` pelo `Relogio`, por `dec_id` (≥ 60 → 429) e no total (≥ 600 → 429), com as mensagens da 03, seção 7. Chamada depois do "mesmo estado" e dos dois 409, antes do `INSERT`. `TipoLimite`, `LIMITE_POR_HORA`, `MENSAGEM_LIMITE`, `LIMITE_DA_INTEGRACAO` e `conferirLimite` sem diff. Testes: CA-12.1 a CA-12.6; unidade com cada ator diferente do `construir` → lança; 599 gravações em DEC variados e duas simultâneas de DEC diferentes (duas conexões) → uma 204 e uma 429 | C07 D e T, C01 D |
| AN-08 | média | **Trava global do limite (ADR-31): aceita com condições.** (a) Tomada só no caminho que vai gravar, como última trava, e segurada só por: duas contagens, um `INSERT`, no máximo um `UPDATE` de `demanda` e dois eventos; nada de chamada externa, job, aviso ou `dispararSeLigado` enquanto ela está segurada. (b) A espera por ela está sob o `lock_timeout` de 2 s da transação (vale também para trava consultiva) e o prazo total de 8 s. (c) Pessoa, agente e Awave nunca a tomam. Testes com duas conexões: (1) com a trava global segurada por outra conexão, o envio responde 503 em até 3 s, nada é gravado e, logo depois, `alterarDemanda` de pessoa na mesma demanda conclui sem esperar (a linha foi solta no `ROLLBACK`); (2) com a trava global segurada, pessoa muda o status de outra demanda e o Awave cria demanda, os dois sem esperar; (3) envio no mesmo estado com a trava global segurada responde 204 (não a toma) | C07 D, C03 D |
| AN-09 | crítica | **Visibilidade em toda rota de leitura.** O andamento sai só: (i) na vista de pessoa (`GET /api/demandas/:id`, fila e detalhe do painel), com os seis campos do 01, sem prefixo; (ii) na vista do Awave, montada **chave a chave** com exatamente `fase`, `tarefasProntas`, `tarefasTotal`, `atualizadoEm`, só da demanda que ele criou, lida na mesma consulta que tem a autoria no `WHERE`. `vistaDaIntegracao` monta o andamento de quatro chaves também quando recebe a `DemandaVista` inteira (`vistaDaDemandaPara`). `vistaMinimaDaDemanda`, `paginaDeDemandas`, `resumoDe`, as vistas de ESP, RSK e DEC e `entrada-agente.ts` sem diff. Testes: (a) teste transversal que **percorre `MATRIZ`** e, para toda ação com agente na linha, chama cada rota dessa ação com os quatro agentes sobre uma demanda com andamento `testando 987/988`; nenhuma resposta tem as chaves `andamento`, `fase`, `tarefasProntas`, `tarefasTotal` ou `statusConstrucao`, nem os números 987 e 988; (b) a entrada montada para o provedor falso, nos quatro agentes, não tem essas chaves; (c) Awave: CA-10.1 a CA-10.5; o 404 da demanda de pessoa com andamento é igual byte a byte ao do id inexistente; unidade de `vistaDaDemandaPara(awave, d)` com `d.andamento` de seis campos devolve quatro; (d) as chaves de cada item de `GET /api/demandas` para pessoa e agente são as da 0.3.1 (CA-11.3) | C09 I e D, Awave |
| AN-10 | alta | **Tabela só de inclusão, com o formato no banco.** `andamento_construcao` com CHECK da fase nas seis, do `status_construcao` nos três, de `0 <= tarefas_prontas <= tarefas_total <= 999`, de `dec_id` em `^DEC-DEM-[0-9]{8}-[0-9]{4}-v[0-9]{1,4}$` e de `ator_token_prefixo` em `^[A-Za-z0-9_-]{8}$` (`not null`); FK para `demanda(id)` e `pacote_decisao(id)` sem `ON DELETE CASCADE`. Migration custom só com `GRANT SELECT, INSERT ON "andamento_construcao" TO orquestrador_app`; nenhum GRANT de sequência (a identidade não pede, como `evento`); `privilegios.ts` com uma linha nova e sem `colunasUpdate`; nenhuma coluna nova em `demanda` nem em `evento`. Duas migrations aditivas, nenhuma da `main` editada; ensaio de rollback com `alteram_dado = false` (e `volta_sem_restaurar = false` esperado, 02, seção 8). Testes: `privilegios.test.ts` e `imutabilidade.test.ts` com a tabela (UPDATE e DELETE pelo papel do app recusados); INSERT pelo papel do app com cada CHECK violado é recusado | C01 T, E e R |
| AN-11 | alta | **Eventos e log sem texto livre (C-30, IN-12).** `andamento_registrado` com `entidade = 'pacote_decisao'`, `entidadeId = decId`, `depois` montado chave a chave do corpo **já validado** com exatamente `fase`, `tarefasProntas`, `tarefasTotal`, `statusConstrucao`; `antes` com as mesmas quatro chaves do andamento anterior, ou `null`; ator integração `construir` com `ator_token_prefixo` do ator resolvido. Só na mudança de marco. Nenhuma linha de log própria no serviço; a de `rota()` continua só com rota padrão, status, ms, `atorTipo` e `codigoErro` (sem `decId`, fase, números nem prefixo). Testes: CA-06.1 a CA-06.6; o teste transversal de sentinelas da 0.3.0 ganha a rota nova (sentinela em chave a mais e no valor) e a leitura do Awave: nenhum evento, linha do pino, envio ao Sentry falso, tabela do esquema `pgboss` nem linha de `andamento_construcao` contém a sentinela ou o texto do token depois do prefixo; a linha de log capturada do envio não contém `wsod_`, o prefixo nem o `decId` | C08 I, D e R, C03 I, C06 R |
| AN-12 | média | **Tela só com valor conferido.** Fila, detalhe, Próxima ação e histórico usam o andamento só depois do `andamentoLidoSchema` (fora do esquema = sem andamento, sem 500); rótulos por `Object.hasOwn` sobre `ROTULO_FASE` e `ROTULO_SITUACAO_CONSTRUCAO`; `textoDoEvento('andamento_registrado')` confere cada valor de `depois` (enumeração da lista, inteiro de 0 a 999) e, fora disso, mostra só "Registrou o andamento de <DEC>" (03, 5.7). Link do DEC só quando casa `RE_ID_DEC` (CV-19); prefixo só no histórico e só da coluna (IN-13), nunca na seção nem na fila. Sem `dangerouslySetInnerHTML` e sem `style=` (a barra é `<progress>` com atributos). Testes: `andamento_registrado` inserido pelo migrator com `fase` `<img src=x onerror=alert(1)>` e número em texto → o histórico mostra a frase genérica e o HTML não tem o texto; o teste estático do CV-02 (sem `style=`) cobre `SecaoAndamento.tsx`; axe sem violação na fila e no detalhe em 1280 × 720 e 390 × 844 | C08 T, C10 T, C11 T e I |
| AN-13 | alta | **Nenhum controle afrouxado (IN-15 e IN-16 sobre a 0.3.1).** `git diff 0ac099a -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/db/transacao.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts` vazio; em `src/lib/rota.ts`, diff só na opção `corpoInvalido` e no ramo dela. Os testes de `matriz`, `resolver-ator`, `tokens-servico`, C-11, C-30, C-36, `privilegios`, `imutabilidade`, `vistas-para-agente`, `visibilidade-*-0019`, `prazo-total-0019`, `e2e/seguranca*.spec.ts` e `test/estatico/*` sem asserção a menos, contada por arquivo. Mudanças aprovadas de antemão, só para acrescentar: o par novo no teste de pares exatos; a sétima chave `andamento` (com `null`) nos testes de contrato do Awave (seis → sete chaves); a rota nova no T13; o texto novo de `dicaAprovada`. Qualquer outra mudança em teste de segurança existente bloqueia a revisão da tarefa | C03 S e T, C06 T |
| AN-14 | média | **Operação documentada, sem valor.** `docs/operacao/tokens-de-integracao.md` diz que o token `construir` passou a **escrever** (andamento e duas mudanças de status), que suspeita de vazamento pede revogação imediata pelo prefixo, e como achar o que um prefixo gravou (`andamento_construcao.ator_token_prefixo` e `evento.ator_token_prefixo`) sem exibir o token. `docs/operacao/deploy.md`: backup antes, migration pelo migrator, `worker` e depois `app`, sem snapshot (D5); `"andamento_ligado": true` só depois do deploy e da saúde em 200; antes da volta, `"andamento_ligado": false`; volta só pelo caminho B. Nenhum token, hash, valor de `.env` ou dado pessoal no texto; a varredura de segredo do CI (C-39) passa no ramo. Conferência na revisão da tarefa de documentação e na 08 | C12 I e T |
| AN-15 | média | **V-02 sem vazar o token.** O token da V-02 é emitido dentro da homologação pelo script, gravado em arquivo com permissão 600 numa pasta temporária fora do repositório e apagado no fim (também na falha); nunca em fixture, log do e2e, `passagens.jsonl` fictício ou arquivo rastreado. Seed só com dado fictício. Conferência: `git status` limpo depois da V-02 e a varredura de segredo do CI verde | Integração V-02 |

### 4. Avaliação pedida pela 02: trava global do limite e prefixo por linha

**Trava global (`limite:andamento:integracao:construir`): aceita, nível médio, com as condições do AN-08.**

- Por que fica: o total de 600 só é exato com uma fila única das gravações. Sem ela, 20 pedidos gravando juntos passam
  do teto por corrida. A contagem por DEC já estaria em fila pela trava do pedido, mas a do total não.
- Por que não pesa: só o caminho que grava a toma, e o `/construir` grava no máximo uma vez a cada 2 min por pedido. O
  envio no mesmo estado, os 404, 409 e 422 não passam por ela. Ela é a última da ordem pedido → demanda → limite, e
  nenhum outro caminho do sistema toma a mesma chave ou inverte a ordem (conferido em `entregar.ts`, `receber.ts`,
  `decidir.ts`, `servico.ts`, `transicoes.ts` e `limites.ts`). Pessoa, agente e Awave nunca a tomam.
- O que custa: (1) enquanto espera por ela, o envio segura a linha da demanda, e uma pessoa que muda o status dessa
  demanda espera até ~2 s (o `lock_timeout`); o prazo total de 8 s é o teto. (2) Um token vazado ocupa as 600
  gravações da hora e o andamento de todos os pedidos para por até 1 h. O dano fica só no andamento, sem efeito para
  pessoa nem Awave, e a revogação pelo prefixo encerra. Os dois vão para Pendências como risco residual.
- O que não aceito: trava global tomada antes da trava do pedido ou da demanda; espera sem `lock_timeout`; trava
  segurada durante chamada externa ou enfileiramento.

**Prefixo por linha (`ator_token_prefixo` em `andamento_construcao`): aprovado.** Não é segredo nem dado pessoal (IN-13:
8 dos 43 caracteres, sobram cerca de 210 bits). Ele é o que permite atribuir a um token a gravação que não gera evento
(A2) e decidir qual token revogar. Condições: vem só do ator resolvido; tem CHECK de formato; não sai em nenhuma vista,
API, seção do painel nem log (AN-10, AN-11, AN-12).

### 5. Dados pessoais (LGPD)

Este pedido **não cria dado pessoal novo**. O andamento só tem enumerações, inteiros, ids de sistema e datas, e o corpo
fechado (AN-02) impede texto livre de entrar. Bases legais, retenção e expurgo dos dados que já existem seguem a seção
4 de `DEC-DEM-20261022-0001-v1/04-seguranca-aplicacao.md` (D1 a D12) e a de `DEC-DEM-20261111-0016-v1/04-seguranca-aplicacao.md`
(D5 ampliado, D8 ampliado, D15, D16), sem mudança.

| Id | Dado | Titular | Onde fica | Base legal | Retenção | Expurgo | Cuidado deste pedido |
|---|---|---|---|---|---|---|---|
| — | Andamento (`dec_id`, `demanda_id`, fase, números, `status_construcao`, `gravado_em`) | não é dado pessoal | `andamento_construcao` | não se aplica | a da demanda (status final + 5 anos, D3 do 0001); linhas só de inclusão, sem expurgo nesta versão (RNF-10) | não se aplica; um expurgo futuro da demanda terá de tratar estas linhas (FK sem `CASCADE`, AN-10) | AN-02 (corpo fechado), AN-10 (CHECKs) |
| — | Prefixo do token por linha | não é dado pessoal (identifica um token de sistema) | `andamento_construcao`, `evento` | não se aplica | a da linha | não se aplica | AN-10, AN-12 (fora de toda vista) |
| — | `andamento_registrado` e `status_alterado` do `construir` | não é dado pessoal | `evento` | não se aplica | permanente, como os demais eventos (C-34) | não se aplica | AN-11 |
| D15 (ampliado) | Vista do Awave com `andamento` de quatro campos | não é dado pessoal | Awave (fora deste sistema) | não se aplica ao campo novo; o título minimizado segue a base do D5 | a do Awave | fora do controle deste sistema | AN-09 |
| D8 | Nome da pessoa que mudou o status depois do andamento | pessoa da empresa | `evento`, pela junção com `user` | art. 7º, VI e IX (prestação de contas), sem mudança | igual ao D5 | junto com o D5 | sem mudança |
| D9 | Linha de log da rota nova | não deve ter dado pessoal | saída do contêiner | — | rotação do Docker | não se aplica | AN-11 (só `atorTipo` e `codigoErro`) |

### 6. O que o plano (05) precisa conter

1. **Cada controle AN-01 a AN-15 como critério de aceite de uma tarefa**, com o teste citado no controle. Os IN-01 a
   IN-18 continuam valendo e entram na revisão de toda tarefa que toca matriz, rota, vistas ou histórico.
2. **Ordem:** AN-01 (matriz e T13), AN-10 (tabela e privilégio) e AN-07 (limite) na fundação, **antes** da rota e do
   serviço. AN-02 junto com a mudança de `rota()`. AN-03, AN-04, AN-05, AN-06 e AN-08 na mesma tarefa do serviço de
   registro, e não depois. AN-09 junto com a primeira mudança em `consultas.ts`.
3. **Risco `alto` no `tarefas.json`** para: matriz e rota (AN-01, AN-02); serviço de registro e transições (AN-03 a
   AN-06, AN-08); limite (AN-07); leituras de pessoa e do Awave (AN-09); migration (AN-10).
4. **Inventários escritos no plano**, por caminho e função: (a) o do AN-05, de quem escreve o que o registro lê e qual
   trava cada um toma; (b) o do AN-09, de toda rota cuja ação tem agente ou integração na matriz, com a vista que ela
   devolve.
5. **Testes transversais obrigatórios:** matriz × todas as rotas × os dois tokens e os quatro agentes (AN-01);
   sentinelas ampliado à rota e à leitura do Awave (AN-11); varredura de leituras de agente a partir da matriz
   (AN-09); 404 idênticos do envio e do Awave (AN-03, AN-09); concorrência com duas conexões (AN-05, AN-07, AN-08);
   prazo total com relógio falso (AN-06).
6. **AN-13 em toda revisão de tarefa**: o `tech-lead` anexa o `git diff 0ac099a -- <lista do AN-13>` e a contagem de
   asserções por arquivo; de novo na 08.
7. **Na 08:** revisão de segurança com foco em matriz, `rota()` com `corpoInvalido`, ordem das travas, prazo total,
   vistas por tipo de ator e transições; `pnpm audit --prod --audit-level high` sem alta nem crítica (em 12/11: 0 alta,
   0 crítica, as mesmas 5 moderadas de ferramenta de build e teste); achado crítico ou alto volta ao engenheiro e
   passa por reteste deste agente.
8. **Fora do `/construir`** (Fabiano, depois do merge): backup, migration, deploy e só então `"andamento_ligado": true`
   (AN-14). O token `construir` de produção é o mesmo; nada de token novo passa por chat, arquivo do repositório ou
   e-mail.

### 7. Respostas às pendências dirigidas à 04

- **01, P-09 (primeira escrita do token `construir`; sentinelas e T13).** Avaliada: nível médio no conjunto, com os
  controles AN-01 (escopo de uma ação, sem leitura), AN-03 (só DEC com pedido gerado), AN-04 (duas transições, nunca
  `entregue`), AN-07 e AN-08 (limite) e a revogação pelo prefixo. O T13 entra no AN-01 e as sentinelas no AN-11. O que
  sobra é risco residual (Pendências).
- **02, trava global e prefixo por linha.** Seção 4: as duas aceitas, a trava com as condições do AN-08.
- **03, mensagens 409 e 422 e link do DEC.** De acordo. O 422 não tem `campos` nem eco, o que fecha o CA-02.4. Os dois
  409 não dizem o status nem o id do substituto. O 429 diz o número do limite, que não é segredo e só chega ao
  `construir`. O link do DEC só com `RE_ID_DEC` (CV-19), no AN-12. O alerta de pacote substituído usa o `decId` da
  linha, que tem CHECK de formato e FK, mostrado como texto.

## Decisões tomadas

- Nenhuma devolução: as quatro lacunas do código (vínculo DEC ↔ demanda, `set local` no corpo, vista do Awave a partir da vista inteira, limite sem ramo) viraram controles verificáveis que cabem no plano.
- Trava global do limite aceita: é o único jeito de o teto de 600 ser exato, só a gravação a toma, e o dano de um token vazado fica no andamento; a condição é ela ser a última trava e ter espera limitada (AN-08).
- AN-03 confere o `demanda_id` do evento contra o do DEC: a 0.4.0 é a primeira escrita que muda status a partir do evento `pedido_gerado`, e falhar fechado custa uma leitura por chave primária.
- AN-06 proíbe `set local` e transação de quem chama no serviço novo: a correção do A-2 da 0019 protege só a abertura da transação, e o mesmo erro voltaria por dentro do corpo.
- AN-09 manda o teste de visibilidade partir da matriz: a listagem de DEC escapou na 0019 porque a lista de rotas foi escrita à mão.
- AN-05 pede inventário e teste de concorrência com duas conexões para cada escritor do que o registro lê: a lição da 0019 é que a trava precisa ser a mesma nas rotas que concorrem, e só o teste com duas transações reais mostra isso.
- Prefixo por linha aprovado com as condições do IN-13: não é segredo nem dado pessoal, e atribui a gravação sem evento.
- Sem limite de requisição novo para o envio no mesmo estado: o 01 decidiu contar só gravação (idempotência da ESP); o abuso exige o token e fica contido pelo prazo de 8 s e pela revogação. Vai como risco residual.
- `pnpm audit --prod` em 12/11: 0 alta, 0 crítica, as mesmas 5 moderadas transitivas registradas no 0015 e no 0016 (esbuild, `@vitest/mocker` duas vezes, glob, minimatch); não bloqueiam pelo padrão técnico.

## Pendências

- Nenhuma bloqueia a etapa. Itens para a Parada 1 e para as etapas seguintes:
- `gestao-riscos` e Fabiano (aceite formal de risco residual, não bloqueia): (a) o token `construir` passa a escrever, e o arquivo dele é legível pelo usuário `deploy`, que também roda os agentes do `/construir` com Bash. Um agente levado por injeção num pedido pode alterar fase e números e pôr demandas com pedido gerado em `em_construcao` ou `devolvida`, nunca em `entregue` (médio; liga-se à D-F3, aceita e ainda não executada, e à pendência (c) do 0016; recomendação: o envio do andamento rodar com um usuário do sistema que os agentes não usem, dono do arquivo do token). (b) Um token vazado esgota as 600 gravações da hora e para o andamento de todos os pedidos por até 1 h; envios no mesmo estado não contam e seguram a trava do pedido e a linha da demanda até 8 s cada, disputando o pool com pessoa e Awave (médio; a mesma classe das rotas do `construir` da 0.3.0). (c) `andamento_construcao` sem expurgo, com crescimento limitado pelo teto (baixo).
- `tech-lead` (05): os dois inventários da seção 6, item 4; decidir onde ficam os testes estáticos do AN-01 (citação da ação) e do AN-06 (sem `set local` no corpo).
- `seguranca-informacao` (fora deste pedido): as pendências do 0016 sobre a rede interna do Easypanel (`x-real-ip` forjável) e sobre `pnpm audit` sem `--prod` continuam abertas.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do repositório.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261111-0017-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -15` — base `0ac099a` (0.3.1) e as passagens 00 a 03
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- src/modules src/lib src/app/api src/db` — lista dos arquivos rastreados lidos
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas audit --prod` — 5 moderadas, 0 alta, 0 crítica (código de saída 1 pelas moderadas)

## Critério de pronto atendido

- [x] (04) cada componente de 02 tem as ameaças STRIDE avaliadas
- [x] (04) cada ameaça alta ou crítica tem controle, escrito como critério verificável
- [x] (04) cada dado pessoal tem base legal, retenção e expurgo
